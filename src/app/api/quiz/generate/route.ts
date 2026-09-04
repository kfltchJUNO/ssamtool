// src/app/api/quiz/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { deductCredits, refundCredits, InsufficientCreditsError } from "@/lib/credits";
import { isChalkEnabled } from "@/lib/monetizationServer";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 사용 가능 최적 3개 모델 순차 폴백
// 1순위: gemini-3.1-flash-lite (일일 500회 / 분당 15회 - 초고속 3초 응답, 가장 쾌적함)
// 2순위: gemini-3.6-flash      (일일 20회 / 분당 5회 - 고성능 Flash)
// 3순위: gemini-flash-latest   (Google 최신 안정 Flash 별칭)
const MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
  "gemini-flash-latest",
];

function calcChalkCost(count: number) {
  // 5문항 이하: 1개, 10문항 이하: 2개, 15문항 이하: 3개, 20문항: 4개
  if (count <= 5)  return 1;
  if (count <= 10) return 2;
  if (count <= 15) return 3;
  return 4;
}

// ── 빠른 생성(자유 주제) 프롬프트 ──────────────────────────────────
function buildTopicPrompt({
  topic,
  difficulty,
  count,
  questionTypes,
}: {
  topic: string;
  difficulty: string;
  count: number;
  questionTypes?: string[];
}) {
  const diffLabel =
    difficulty === "beginner" ? "초급 (TOPIK I, 1~2급 수준, 짧고 쉬운 어휘)"
    : difficulty === "intermediate" ? "중급 (TOPIK II, 3~4급 수준, 일상 표현)"
    : "고급 (TOPIK II, 5~6급 수준, 추상적 주제 가능)";

  const typeGuide = questionTypes?.length
    ? `문항 유형은 ${questionTypes.join(", ")}을 포함해 출제하세요.`
    : "문항 유형은 빈칸 채우기(fill-in-blank), 4지선다 객관식(multiple-choice)을 골고루 출제하세요.";

  return `당신은 한국어 교육 전문가입니다. 아래 주제로 한국어 학습 퀴즈 문항을 생성하세요.

[주제] ${topic}
[난이도] ${diffLabel}
[문항 수] ${count}

조건:
1. ${typeGuide}
2. 객관식(multiple-choice)은 반드시 choices 배열에 4개 보기를 포함하세요. 빈칸 채우기는 choices를 null로 하세요.
3. 각 문항에 오답 시 참고할 수 있는 한국어 문법/어휘 해설(explanation)을 포함하세요.
4. 반드시 아래 JSON 형식으로만 응답하고, 다른 텍스트나 마크다운 코드블록(\`\`\`)을 포함하지 마세요.

{"questions":[{"type":"fill-in-blank","question":"저는 학교___ 공부를 합니다.","choices":null,"answer":"에서","explanation":"'에서'는 동작이 일어나는 장소를 나타냅니다."},{"type":"multiple-choice","question":"다음 중 '좋아하다'의 반대말은?","choices":["① 싫어하다","② 먹다","③ 가다","④ 자다"],"answer":"① 싫어하다","explanation":"'좋아하다'의 반대말은 '싫어하다'입니다."}]}`;
}

// ── 📘 미니 TOPIK 실전 모의고사 프롬프트 ──────────────────────────
function buildMiniTopikPrompt({
  topikLevel,
  section,
  count,
}: {
  topikLevel: "topik1" | "topik2_mid" | "topik2_adv";
  section: "all" | "reading" | "grammar_vocab";
  count: number;
}) {
  let levelDesc = "";
  let sampleStyle = "";

  if (topikLevel === "topik1") {
    levelDesc = "TOPIK I (1~2급, 초급) 수준. 일상생활에 필요한 기초 어휘, 조사, 기본 문형(-아서/어서, -(으)ㄹ 수 있다, -고 싶다 등), 짧은 안내문/메모/표지판 읽기";
    sampleStyle = `
- 유형 A (문법/조사): 다음 (   )에 들어갈 가장 알맞은 것을 고르십시오.
  보기: 친구(   ) 만납니다. -> ① 를 ② 가 ③ 에 ④ 와
- 유형 B (어휘 반대말/유의말/관계어): 다음 밑줄 친 부분과 반대되는 뜻을 가진 것을 고르십시오.
- 유형 C (실용문 읽기): 무엇에 대한 글인지 고르십시오. (시간, 장소, 가격 등)`;
  } else if (topikLevel === "topik2_mid") {
    levelDesc = "TOPIK II (3~4급, 중급) 수준. 일상적·사회적 소재의 설명문, 문맥 빈칸 추론, 중심 생각 고르기, 연결 어미(-느라고, -는 바람에, -기 마련이다 등), 관용 표현";
    sampleStyle = `
- 유형 A (문법/표현): 다음 (   )에 들어갈 가장 알맞은 것을 고르십시오.
- 유형 B (문맥 빈칸): 다음 글을 읽고 (   )에 들어갈 내용으로 가장 알맞은 것을 고르십시오.
- 유형 C (중심 생각): 다음 글을 읽고 중심 생각을 고르십시오.`;
  } else {
    levelDesc = "TOPIK II (5~6급, 고급) 수준. 시사, 경제, 과학, 인문, 문화 등 전문적·추상적 제재, 논리적 연결어, 문맥상 의미, 고급 한자어/속담/사자성어";
    sampleStyle = `
- 유형 A (고급 어휘/사자성어/속담): 문맥에 맞는 적절한 표현 고르기
- 유형 B (논설문/설명문 빈칸 추론): 논리적 흐름에 맞는 문장 또는 어구 완성
- 유형 C (주제 및 논지 파악): 필자의 태도나 주장으로 가장 알맞은 것 고르기`;
  }

  const sectionGuide =
    section === "reading" ? "영역: [읽기/지문 독해 중심] 지문을 제시하고 내용 파악, 빈칸 채우기 위주"
    : section === "grammar_vocab" ? "영역: [어휘·문법 중심] 괄호 넣기, 알맞은 표현 고르기, 유의어/반의어 위주"
    : "영역: [실전 종합] 어휘, 문법, 짧은 지문 독해를 실제 TOPIK 시험처럼 균형 있게 배분";

  return `당신은 한국어능력시험(TOPIK) 출제 위원입니다. 실제 TOPIK 기출문제 형식과 정확히 일치하는 4지선다형 객관식 모의 문항을 출제하세요.

[시험 급수] ${levelDesc}
[출제 영역] ${sectionGuide}
[문항 수] ${count}문항

출제 가이드:
${sampleStyle}

규칙:
1. 모든 문항은 반드시 4개의 선택지를 가진 4지선다형 객관식("multiple-choice")으로 출제하세요.
2. 선택지(choices)는 반드시 ["① ...", "② ...", "③ ...", "④ ..."] 형식으로 작성하세요.
3. answer(정답)는 선택지 문자열과 완전히 일치해야 합니다 (예: "① 학교").
4. explanation(해설)에는 왜 이것이 정답인지, 오답 선택지는 왜 틀렸는지 학습자가 납득할 수 있는 친절한 한국어 해설을 반드시 포함하세요.
5. 질문(question)에 지문이 필요한 경우, 지문을 포함하여 명확히 작성하세요. (예: [지문] ... \\n\\n다음 글의 중심 생각으로 알맞은 것을 고르십시오.)
6. 반드시 아래 JSON 규격으로만 응답하고 마크다운 코드블록(\`\`\`)을 넣지 마세요.

{"questions":[{"type":"multiple-choice","question":"[다음 ( )에 들어갈 가장 알맞은 것을 고르십시오.]\\n어제 도서관(   ) 책을 빌렸습니다.","choices":["① 에","② 에서","③ 에게","④ 으로"],"answer":"② 에서","explanation":"도서관에서 책을 빌리는 동작이 일어나는 장소를 나타내므로 '에서'가 정답입니다."}]}`;
}

async function getUidFromRequest(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new Error("UNAUTHENTICATED");
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

interface QuizQuestion {
  type: string;
  question: string;
  choices: string[] | null;
  answer: string;
  explanation: string;
}

async function generateWithRetry(prompt: string): Promise<string> {
  const errors: string[] = [];

  for (let i = 0; i < MODELS.length; i++) {
    const currentModel = MODELS[i];
    try {
      console.log(`[Quiz Gemini] (${i + 1}/${MODELS.length}) 모델 호출 시도: ${currentModel}`);
      const model = genAI.getGenerativeModel({
        model: currentModel,
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const trimmed = text.replace(/```json|```/g, "").trim();

      if (!trimmed.endsWith("}") && !trimmed.endsWith("]")) {
        console.warn(`[Quiz Gemini] ${currentModel} 응답 잘림`);
        throw new Error("응답 JSON 형식 잘림");
      }

      console.log(`[Quiz Gemini] 성공! 사용 모델: ${currentModel}`);
      return trimmed;
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error(`[Quiz Gemini] ${currentModel} 실패:`, errMsg);
      errors.push(`[${currentModel}] ${errMsg}`);
      // 실패 시 다음 순위 모델로 자동 진행
    }
  }

  throw new Error(`모든 AI 모델(3개) 호출 실패: ${errors.join(" / ")}`);
}

export async function POST(req: NextRequest) {
  let uid: string;
  try {
    uid = await getUidFromRequest(req);
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED", message: "로그인이 필요합니다." }, { status: 401 });
  }

  let chalkCost = 0;
  let charged = false;

  try {
    const body = await req.json();
    const {
      mode = "topic", // "topic" | "mini-topik"
      topic,
      difficulty = "beginner",
      count = 5,
      questionTypes,
      // TOPIK 전용 파라미터
      topikLevel = "topik1", // "topik1" | "topik2_mid" | "topik2_adv"
      topikSection = "all",  // "all" | "reading" | "grammar_vocab"
    } = body as {
      mode?: "topic" | "mini-topik";
      topic?: string;
      difficulty?: string;
      count?: number;
      questionTypes?: string[];
      topikLevel?: "topik1" | "topik2_mid" | "topik2_adv";
      topikSection?: "all" | "reading" | "grammar_vocab";
    };

    const isTopik = mode === "mini-topik";
    const safeCount = Math.min(Math.max(Math.floor(Number(count) || 5), 1), 20);

    if (!isTopik && (!topic || topic.trim().length === 0)) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "퀴즈 주제를 입력해주세요." }, { status: 400 });
    }

    chalkCost = calcChalkCost(safeCount);

    // 분필 선차감
    const chalkEnabled = await isChalkEnabled();
    if (chalkEnabled) {
      try {
        const featureName = isTopik
          ? `미니 TOPIK 모의고사 (${safeCount}문항)`
          : `빠른 퀴즈 생성 (${safeCount}문항)`;
        await deductCredits(uid, chalkCost, featureName);
        charged = true;
      } catch (e) {
        if (e instanceof InsufficientCreditsError) {
          return NextResponse.json(
            { error: "INSUFFICIENT_CHALK", required: chalkCost, message: "분필이 부족합니다." },
            { status: 402 }
          );
        }
        throw e;
      }
    } else {
      chalkCost = 0;
    }

    // Gemini 호출
    const prompt = isTopik
      ? buildMiniTopikPrompt({ topikLevel, section: topikSection, count: safeCount })
      : buildTopicPrompt({ topic: topic!.trim(), difficulty, count: safeCount, questionTypes });

    const raw = await generateWithRetry(prompt);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      if (charged) await refundCredits(uid, chalkCost, "퀴즈 생성 실패(파싱 오류)");
      charged = false;
      return NextResponse.json({ error: "GENERATION_FAILED", message: "퀴즈 응답을 해석하지 못했습니다." }, { status: 502 });
    }

    const questions: QuizQuestion[] = Array.isArray(parsed)
      ? (parsed as QuizQuestion[])
      : parsed && typeof parsed === "object" && "questions" in parsed && Array.isArray((parsed as { questions: unknown[] }).questions)
      ? ((parsed as { questions: QuizQuestion[] }).questions)
      : [];

    if (questions.length === 0) {
      if (charged) await refundCredits(uid, chalkCost, "퀴즈 생성 실패(빈 결과)");
      charged = false;
      return NextResponse.json({ error: "GENERATION_FAILED", message: "문항이 생성되지 않았습니다." }, { status: 502 });
    }

    // 제목 결정
    let title = "";
    if (isTopik) {
      const levelLabel =
        topikLevel === "topik1" ? "TOPIK I (초급)"
        : topikLevel === "topik2_mid" ? "TOPIK II (중급)"
        : "TOPIK II (고급)";
      const secLabel =
        topikSection === "reading" ? "읽기 모의고사"
        : topikSection === "grammar_vocab" ? "어휘·문법 모의고사"
        : "실전 모의고사";
      title = `[${levelLabel}] ${secLabel}`;
    } else {
      title = `${topic!.trim().slice(0, 30)} 퀴즈`;
    }

    const quizRef = adminDb.collection("ssamtoolQuizzes").doc();
    await quizRef.set({
      title,
      topic: isTopik ? title : topic!.trim(),
      curriculum: null,
      unit: null,
      grammarPoints: null,
      difficulty: isTopik
        ? (topikLevel === "topik1" ? "beginner" : topikLevel === "topik2_mid" ? "intermediate" : "advanced")
        : difficulty,
      questionTypes: isTopik ? ["multiple-choice"] : (questionTypes || null),
      questions,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      isPublished: false,
      shareCode: null,
      mode: isTopik ? "mini-topik" : "topic",
      topikLevel: isTopik ? topikLevel : null,
      topikSection: isTopik ? topikSection : null,
    });

    return NextResponse.json({
      quizId: quizRef.id,
      questions,
      chalkSpent: chalkCost,
      title,
      mode: isTopik ? "mini-topik" : "topic",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[quiz/generate] error:", msg, err);
    if (charged) {
      await refundCredits(uid, chalkCost, "퀴즈 생성 실패(서버 오류)").catch(() => {});
    }
    return NextResponse.json(
      { error: "SERVER_ERROR", message: `서버 오류가 발생했습니다. 분필은 환불되었습니다. (${msg})` },
      { status: 500 }
    );
  }
}