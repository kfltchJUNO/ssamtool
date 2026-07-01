// src/app/api/quiz/by-code/[shareCode]/submit/route.ts
// 학생용: shareCode로 퀴즈를 찾아 서버에서 채점 후 attempts에 기록
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

type SubmittedAnswer = { index: number; value: string };

export async function POST(
  req: NextRequest,
  { params }: { params: { shareCode: string } }
) {
  const { shareCode } = params;
  const body = await req.json();
  const studentName: string = body.studentName;
  const answers: SubmittedAnswer[] = body.answers;

  if (!studentName?.trim() || !Array.isArray(answers)) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

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

  const doc = snap.docs[0];
  const quiz = doc.data();
  const questions: any[] = quiz.questions || [];
  const answerMap = new Map<number, string>(answers.map((a) => [a.index, a.value]));

  let correctCount = 0;
  const results = questions.map((q, idx: number) => {
    const studentAnswer = answerMap.get(idx) ?? "";
    const isCorrect =
      String(studentAnswer).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
    if (isCorrect) correctCount += 1;
    return {
      index: idx,
      question: q.question as string,
      studentAnswer,
      correctAnswer: q.answer as string,
      isCorrect,
      explanation: q.explanation as string,
    };
  });

  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  await doc.ref.collection("attempts").add({
    studentName: studentName.trim(),
    answers,
    correctCount,
    total: questions.length,
    score,
    submittedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ score, correctCount, total: questions.length, results });
}