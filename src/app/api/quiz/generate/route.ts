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
  // 5문항 이하: 1개, 10문항 이하: 2개, 20문항: 4개
  if (count <= 5)  return 1;
  if (count <= 10) return 2;
  if (count <= 15) return 3;
  return 4;
}

// 🆕 자유 주제 입력 방식 프롬프트
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
    : "문항 유형은 빈칸 채우기(fill-in-blank), 객관식(multiple-choice)을 주로 출제하세요.";

  return `당신은 한국어 교육 전문가입니다. 아래 주제로 한국어 학습 퀴즈 문항을 생성하세요.

[주제] ${topic}
[난이도] ${diffLabel}
[문항 수] ${count}

조건:
1. ${typeGuide}
2. 객관식(multiple-choice)은 반드시 choices 배열에 4개 보기를 포함하세요. 빈칸 채우기는 choices를 null로 하세요.
3. 각 문항에 오답 시 참고할 수 있는 한국어 문법/어휘 해설(explanation)을 포함하세요.
4. 반드시 아래 JSON 형식으로만 응답하고, 다른 텍스트나 마크다운 코드블록(\`\`\`)을 포함하지 마세요.

{"questions":[{"type":"fill-in-blank","question":"저는 학교___ 공부를 합니다.","choices":null,"answer":"에서","explanation":"'에서'는 동작이 일어나는 장소를 나타냅니다."},{"type":"multiple-choice","question":"다음 중 '좋아하다'의 반대말은?","choices":["1) 싫어하다","2) 먹다","3) 가다","4) 자다"],"answer":"1) 싫어하다","explanation":"'좋아하다'의 반대말은 '싫어하다'입니다."}]}`;
}

// 기존 문법 항목 라이브러리 기반 프롬프트
function buildGrammarPrompt({
  grammarPoints,
  difficulty,
  count,
}: {
  grammarPoints: string[];
  difficulty: string;
  count: number;
}) {
  return `당신은 한국어 교육 전문가입니다. 다음 조건에 맞는 퀴즈 문항을 생성하세요.

[학습 문법] ${grammarPoints.join(", ")}
[난이도] ${difficulty}
[문항 수] ${count}

조건:
1. 문항 유형은 빈칸 채우기(fill-in-blank), 객관식(multiple-choice), 오류 교정(error-correction)을 섞어서 출제
2. 난이도에 맞게 문장 길이와 어휘 수준을 조절 (초급: 짧고 쉬운 어휘 / 중급: 일상 표현 / 고급: 추상적 주제 가능)
3. 각 문항마다 오답 시 참고할 수 있는 간단한 문법 해설 포함
4. 반드시 아래 JSON 형식으로만 응답하고, 다른 텍스트나 마크다운 코드블록 표시는 포함하지 마세요

{"questions":[{"type":"fill-in-blank","question":"저는 학교___ 공부를 합니다.","choices":null,"answer":"에서","explanation":"'에서'는 동작이 일어나는 장소를 나타낼 때 사용합니다."}]}`;
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

interface ParsedQuiz {
  questions: QuizQuestion[];
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
      topic,          // 🆕 자유 주제 입력 (있으면 topic 방식)
      grammarPoints,  // 기존 라이브러리 방식
      curriculum,
      unit,
      difficulty = "beginner",
      count = 5,
      questionTypes,  // 🆕 optional: ["fill-in-blank","multiple-choice"]
    } = body as {
      topic?: string;
      grammarPoints?: string[];
      curriculum?: string;
      unit?: string;
      difficulty: string;
      count: number;
      questionTypes?: string[];
    };

    // 유효성 검사
    const hasTopic = topic && topic.trim().length > 0;
    const hasGrammar = grammarPoints && grammarPoints.length > 0;
    if (!hasTopic && !hasGrammar) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "주제 또는 문법 항목이 필요합니다." }, { status: 400 });
    }
    const safeCount = Math.min(Math.max(Math.floor(Number(count) || 5), 1), 20);

    chalkCost = calcChalkCost(safeCount);

    // 분필 선차감
    const chalkEnabled = await isChalkEnabled();
    if (chalkEnabled) {
      try {
        await deductCredits(uid, chalkCost, hasTopic ? `빠른 퀴즈 생성 (${safeCount}문항)` : "문법 퀴즈 생성");
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
    const prompt = hasTopic
      ? buildTopicPrompt({ topic: topic!.trim(), difficulty, count: safeCount, questionTypes })
      : buildGrammarPrompt({ grammarPoints: grammarPoints!, difficulty, count: safeCount });

    const raw = await generateWithRetry(prompt);

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      if (charged) await refundCredits(uid, chalkCost, "퀴즈 생성 실패(파싱 오류)");
      charged = false;
      return NextResponse.json({ error: "GENERATION_FAILED", message: "퀴즈 응답을 해석하지 못했습니다." }, { status: 502 });
    }

    const questions: QuizQuestion[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.questions)
      ? parsed.questions
      : [];

    if (questions.length === 0) {
      if (charged) await refundCredits(uid, chalkCost, "퀴즈 생성 실패(빈 결과)");
      charged = false;
      return NextResponse.json({ error: "GENERATION_FAILED", message: "문항이 생성되지 않았습니다." }, { status: 502 });
    }

    // Firestore 저장
    const title = hasTopic
      ? `${topic!.trim().slice(0, 30)} 퀴즈`
      : `${curriculum || "커스텀"} ${unit || ""} 퀴즈`.trim();

    const quizRef = adminDb.collection("ssamtoolQuizzes").doc();
    await quizRef.set({
      title,
      topic: hasTopic ? topic!.trim() : null,
      curriculum: !hasTopic ? (curriculum || null) : null,
      unit: !hasTopic ? (unit || null) : null,
      grammarPoints: !hasTopic ? grammarPoints : null,
      difficulty,
      questionTypes: questionTypes || null,
      questions,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      isPublished: false,
      shareCode: null,
      mode: hasTopic ? "topic" : "grammar",
    });

    return NextResponse.json({
      quizId: quizRef.id,
      questions,
      chalkSpent: chalkCost,
      title,
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