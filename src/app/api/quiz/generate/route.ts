// src/app/api/quiz/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { deductCredits, refundCredits, InsufficientCreditsError } from "@/lib/credits";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
2. 학습자가 초급자임을 감안해 문장 길이는 짧고 어휘는 쉽게
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
  type:        string;
  question:    string;
  choices:     string[] | null;
  answer:      string;
  explanation: string;
}

interface ParsedQuiz {
  questions: QuizQuestion[];
}

export async function POST(req: NextRequest) {
  let uid: string;
  try {
    uid = await getUidFromRequest(req);
  } catch {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { curriculum, unit, grammarPoints, difficulty, count } = body as {
      curriculum:    string;
      unit:          string;
      grammarPoints: string[];
      difficulty:    string;
      count:         number;
    };

    if (!grammarPoints?.length || !count) {
      return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
    }
    if (count < 1 || count > 20) {
      return NextResponse.json({ error: "문항 수는 1~20개 사이여야 합니다." }, { status: 400 });
    }

    const chalkCost = calcChalkCost(count);

    // 1) 분필 선차감
    try {
      await deductCredits(uid, chalkCost, "퀴즈 생성");
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        return NextResponse.json({ error: "분필이 부족합니다. 충전 후 다시 시도해 주세요." }, { status: 402 });
      }
      throw e;
    }

    // 2) Gemini 호출
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: { responseMimeType: "application/json" },
    });
    const prompt = buildQuizPrompt({ grammarPoints, difficulty, count });
    const result = await model.generateContent(prompt);
    const raw    = result.response.text();

    let parsed: ParsedQuiz;
    try {
      parsed = JSON.parse(raw) as ParsedQuiz;
    } catch {
      await refundCredits(uid, chalkCost, "퀴즈 생성 실패(파싱 오류)");
      return NextResponse.json({ error: "퀴즈 생성 응답을 해석하지 못했습니다. 다시 시도해 주세요." }, { status: 502 });
    }

    // 3) Firestore 저장
    const quizRef = adminDb.collection("quizzes").doc();
    await quizRef.set({
      title:        `${curriculum || "커스텀"} ${unit || ""} 퀴즈`.trim(),
      curriculum:   curriculum || null,
      unit:         unit || null,
      grammarPoints,
      difficulty,
      questions:    parsed.questions,
      createdBy:    uid,
      createdAt:    FieldValue.serverTimestamp(),
      isPublished:  false,
      shareCode:    null,
    });

    return NextResponse.json({
      quizId:     quizRef.id,
      questions:  parsed.questions,
      chalkSpent: chalkCost,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[quiz/generate] error:", msg);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}