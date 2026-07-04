// src/app/api/quiz/[quizId]/results/route.ts
// 퀴즈 응시 결과 + 문항별 정답률 (만든 강사만 조회 가능)
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

async function getUidFromRequest(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new Error("UNAUTHENTICATED");
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

interface RawQuestion {
  type:     string;
  question: string;
  answer:   string;
}

type SubmittedAnswer = { index: number; value: string };

export async function GET(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  let uid: string;
  try {
    uid = await getUidFromRequest(req);
  } catch {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const quizRef  = adminDb.collection("ssamtoolQuizzes").doc(params.quizId);
    const quizSnap = await quizRef.get();

    if (!quizSnap.exists) {
      return NextResponse.json({ error: "퀴즈를 찾을 수 없습니다." }, { status: 404 });
    }
    const quiz = quizSnap.data()!;
    if (quiz.createdBy !== uid) {
      return NextResponse.json({ error: "본인이 만든 퀴즈만 조회할 수 있습니다." }, { status: 403 });
    }

    const questions: RawQuestion[] = quiz.questions ?? [];

    const attemptsSnap = await quizRef
      .collection("attempts")
      .orderBy("submittedAt", "desc")
      .limit(200)
      .get();

    // 응시 목록
    const attempts = attemptsSnap.docs.map(d => {
      const a = d.data();
      return {
        id:           d.id,
        studentName:  a.studentName ?? "",
        score:        a.score ?? 0,
        correctCount: a.correctCount ?? 0,
        total:        a.total ?? questions.length,
        submittedAt:  a.submittedAt?.toDate?.()?.toISOString() ?? null,
        answers:      (a.answers ?? []) as SubmittedAnswer[],
      };
    });

    // 문항별 정답률 재계산 (attempts엔 문항별 정오가 저장되지 않으므로 서버에서 재채점)
    const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();
    const questionStats = questions.map((q, idx) => {
      let correct = 0;
      attempts.forEach(a => {
        const ans = a.answers.find(x => x.index === idx);
        if (ans && norm(ans.value) === norm(q.answer)) correct++;
      });
      const total = attempts.length;
      return {
        index:       idx,
        type:        q.type,
        question:    q.question,
        answer:      q.answer,
        correctCount: correct,
        totalCount:   total,
        correctRate:  total > 0 ? Math.round((correct / total) * 100) : null,
      };
    });

    // 응답에서 answers 원본은 제거 (용량 절약)
    const attemptsSlim = attempts.map(({ answers: _answers, ...rest }) => rest);

    return NextResponse.json({
      title:         quiz.title ?? "",
      difficulty:    quiz.difficulty ?? "",
      isPublished:   !!quiz.isPublished,
      attemptCount:  attempts.length,
      averageScore:  attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length)
        : null,
      questionStats,
      attempts: attemptsSlim,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[quiz/results] error:", msg);
    return NextResponse.json({ error: "결과를 불러오지 못했습니다." }, { status: 500 });
  }
}