// src/app/api/quiz/by-code/[shareCode]/public/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

interface RawQuestion {
  type:        string;
  question:    string;
  choices?:    string[];
  answer:      string;
  explanation: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { shareCode: string } }
) {
  const { shareCode } = params;

  const snap = await adminDb
    .collection("ssamtoolQuizzes")
    .where("shareCode",   "==", shareCode)
    .where("isPublished", "==", true)
    .limit(1)
    .get();

  if (snap.empty) {
    return NextResponse.json({ error: "유효하지 않거나 만료된 퀴즈 링크입니다." }, { status: 403 });
  }

  const quiz = snap.docs[0].data();

  // 정답(answer)과 해설(explanation)은 제외하고 학생용 버전만 반환
  const sanitizedQuestions = (quiz.questions as RawQuestion[] || []).map((q, idx) => ({
    index:   idx,
    type:    q.type,
    question:q.question,
    choices: q.choices ?? null,
  }));

  return NextResponse.json({
    title:      quiz.title      as string,
    difficulty: quiz.difficulty as string,
    questions:  sanitizedQuestions,
  });
}