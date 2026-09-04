// src/app/api/quiz/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { deductCredits, refundCredits, InsufficientCreditsError } from "@/lib/credits";
import { isChalkEnabled } from "@/lib/monetizationServer";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-pro-latest",
];
let modelIdx = 0;
const getModel = () => MODELS[modelIdx % MODELS.length];

function calcChalkCost(count: number) {
  return Math.max(3, Math.ceil(count / 2));
}

function buildQuizPrompt({
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

async function generateWithRetry(prompt: string, maxRetries = 5): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const currentModel = getModel();
    try {
      console.log(`[Quiz Gemini] 시도 ${i + 1}/${maxRetries} - 모델: ${currentModel}`);
      const model = genAI.getGenerativeModel({
        model: currentModel,
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const trimmed = text.replace(/```json|```/g, "").trim();
      if (!trimmed.endsWith("}") && !trimmed.endsWith("]")) {
        console.log(`[Quiz Gemini] 응답 잘림 - 모델: ${currentModel}`);
        modelIdx++;
        if (i === maxRetries - 1) throw new Error("응답 잘림");
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      console.log(`[Quiz Gemini] 성공 - 모델: ${currentModel}`);
      return trimmed;
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      const isRetryable = status === 503 || status === 429 || status === 500 || status === 404;
      console.log(`[Quiz Gemini] 실패 - 모델: ${currentModel}, 상태: ${status}`);
      modelIdx++;
      if (!isRetryable || i === maxRetries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error("모든 모델 호출 실패");
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
    const { curriculum, unit, grammarPoints, difficulty, count } = body as {
      curriculum: string;
      unit: string;
      grammarPoints: string[];
      difficulty: string;
      count: number;
    };

    if (!grammarPoints?.length || !count || isNaN(count)) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "필수 항목이 누락되었습니다." }, { status: 400 });
    }
    if (count < 1 || count > 20) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "문항 수는 1~20개 사이여야 합니다." }, { status: 400 });
    }

    chalkCost = calcChalkCost(count);

    // 1) 분필 선차감
    const chalkEnabled = await isChalkEnabled();
    if (chalkEnabled) {
      try {
        await deductCredits(uid, chalkCost, "퀴즈 생성");
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

    // 2) Gemini 호출
    const prompt = buildQuizPrompt({ grammarPoints, difficulty, count });
    const raw = await generateWithRetry(prompt);

    let parsed: ParsedQuiz;
    try {
      parsed = JSON.parse(raw) as ParsedQuiz;
    } catch {
      if (charged) await refundCredits(uid, chalkCost, "퀴즈 생성 실패(파싱 오류)");
      charged = false;
      return NextResponse.json({ error: "GENERATION_FAILED", message: "퀴즈 생성 응답을 해석하지 못했습니다." }, { status: 502 });
    }

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      if (charged) await refundCredits(uid, chalkCost, "퀴즈 생성 실패(빈 결과)");
      charged = false;
      return NextResponse.json({ error: "GENERATION_FAILED", message: "문항이 생성되지 않았습니다." }, { status: 502 });
    }

    // 3) Firestore 저장
    const quizRef = adminDb.collection("ssamtoolQuizzes").doc();
    await quizRef.set({
      title: `${curriculum || "커스텀"} ${unit || ""} 퀴즈`.trim(),
      curriculum: curriculum || null,
      unit: unit || null,
      grammarPoints,
      difficulty,
      questions: parsed.questions,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      isPublished: false,
      shareCode: null,
    });

    return NextResponse.json({
      quizId: quizRef.id,
      questions: parsed.questions,
      chalkSpent: chalkCost,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[quiz/generate] error:", msg);
    if (charged) {
      await refundCredits(uid, chalkCost, "퀴즈 생성 실패(서버 오류)").catch(() => {});
    }
    return NextResponse.json({ error: "SERVER_ERROR", message: "서버 오류가 발생했습니다. 분필은 환불되었습니다." }, { status: 500 });
  }
}