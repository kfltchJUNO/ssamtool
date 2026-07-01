// src/app/api/quiz/by-code/[shareCode]/public/route.ts
// 학생용: 공유 코드만으로 퀴즈 조회 (URL에 quizId가 없으므로 shareCode로 직접 검색)
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: { shareCode: string } }
) {
  const { shareCode } = params;

  const snap = await adminDb
    .collection("quizzes")
    .where("shareCode", "==", shareCode)
    .where("isPublished", "==", true)
    .limit(1)
    .get();

  if (snap.empty) {
    return NextResponse.json(
      { error: "유효하지 않거나 종료된 퀴즈 링크입니다." },
      { status: 403 }
    );
  }

  const quiz = snap.docs[0].data();

  // 정답(answer)과 해설(explanation)을 제거한 안전한 버전만 반환
  const sanitizedQuestions = (quiz.questions || []).map((q: any, idx: number) => ({
    index: idx,
    type: q.type as string,
    question: q.question as string,
    choices: (q.choices as string[] | undefined) || null,
  }));

  return NextResponse.json({
    title: quiz.title as string,
    difficulty: quiz.difficulty as string,
    questions: sanitizedQuestions,
  });
}