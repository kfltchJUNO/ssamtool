// src/app/api/quiz/[quizId]/deploy-wooriban/route.ts
// 쌤툴 퀴즈를 우리반 quizzes 컬렉션에 복사 + 특정 반에 배정
// 같은 Firebase 프로젝트(wooriban1)를 공유하므로 컬렉션 직접 접근
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

async function getUidFromRequest(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new Error("UNAUTHENTICATED");
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

interface SsamtoolQuestion {
  type:        string;
  question:    string;
  choices:     string[] | null;
  answer:      string;
  explanation: string;
}

// 쌤툴 문항(choices: string[] | null, answer: string)을
// 우리반 사지선다 스키마(choices: string[], correctIndex: number)로 변환
function toWoorbanQuestion(q: SsamtoolQuestion, idx: number) {
  const hasChoices = Array.isArray(q.choices) && q.choices.length > 0;
  const choices = hasChoices ? q.choices! : null;
  let correctIndex = 0;

  if (hasChoices) {
    // "① ..." 형태 접두 제거 후 정답과 매칭
    const norm = (s: string) => s.replace(/^[①②③④\d.\s]+/, "").trim();
    correctIndex = choices!.findIndex(c => norm(c) === norm(q.answer));
    if (correctIndex === -1) correctIndex = 0;
  }

  return {
    id:           `q${idx + 1}`,
    type:         hasChoices ? "multiple_choice" : "short_answer",
    category:     "ssamtool_import",
    question:     q.question,
    choices:      choices,
    correctIndex: hasChoices ? correctIndex : null,
    answer:       q.answer,
    explanation:  q.explanation,
    difficulty:   "medium",
  };
}

export async function POST(
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
    const { schoolId, semester, classId } = await req.json();
    if (!schoolId || !semester || !classId) {
      return NextResponse.json({ error: "학교/학기/반을 선택해주세요." }, { status: 400 });
    }

    // 1) 원본 퀴즈 확인
    const quizSnap = await adminDb.collection("ssamtoolQuizzes").doc(params.quizId).get();
    if (!quizSnap.exists) {
      return NextResponse.json({ error: "퀴즈를 찾을 수 없습니다." }, { status: 404 });
    }
    const quiz = quizSnap.data()!;
    if (quiz.createdBy !== uid) {
      return NextResponse.json({ error: "본인이 만든 퀴즈만 배포할 수 있습니다." }, { status: 403 });
    }

    // 2) 배포 대상 uid가 우리반에도 같은 계정으로 존재하는지 확인
    //    (쌤툴·우리반은 같은 Firebase Auth를 공유하므로 uid는 동일)
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const role = userSnap.data()?.role;
    if (role !== "teacher" && role !== "admin") {
      return NextResponse.json(
        { error: "우리반에 선생님으로 가입된 계정이 아니에요. 먼저 우리반에 선생님으로 가입해주세요." },
        { status: 403 }
      );
    }

    // 3) 문항 변환
    const questions = (quiz.questions as SsamtoolQuestion[] || []).map(toWoorbanQuestion);

    // 4) 우리반 quizzes 컬렉션에 생성
    const woorbanQuizRef = adminDb.collection("quizzes").doc();
    await woorbanQuizRef.set({
      title:           quiz.title || "쌤툴에서 가져온 퀴즈",
      schoolId, semester, classId,
      assignedClasses: [classId],
      questions,
      createdBy:       uid,
      source:          "ssamtool",
      sourceQuizId:    params.quizId,
      isActive:        true,
      createdAt:       FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success:       true,
      wooribanQuizId: woorbanQuizRef.id,
      questionCount:  questions.length,
    });
  } catch (err) {
    console.error("[deploy-wooriban] error:", err);
    return NextResponse.json({ error: "배포 중 오류가 발생했습니다." }, { status: 500 });
  }
}