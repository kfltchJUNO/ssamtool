// src/app/api/quiz/[quizId]/questions/route.ts
// PATCH: 문항 삭제 (분필 불필요)
// POST body {action:"regenerate", index}: 문항 1개 재생성 (분필 1개)
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { deductCredits, refundCredits, InsufficientCreditsError } from "@/lib/credits";
import { isChalkEnabled } from "@/lib/monetizationServer";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const REGENERATE_COST = 1;

const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
];

async function generateSingleQuestionWithRetry(prompt: string): Promise<QuizQuestion> {
  const errors: string[] = [];
  for (const m of MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await model.generateContent(prompt);
      const raw = result.response.text().replace(/```json|```/g, "").trim();
      return JSON.parse(raw) as QuizQuestion;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[${m}] ${msg}`);
    }
  }
  throw new Error(`모든 모델 호출 실패: ${errors.join(" / ")}`);
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

async function checkOwnership(quizId: string, uid: string) {
  const ref  = adminDb.collection("ssamtoolQuizzes").doc(quizId);
  const snap = await ref.get();
  if (!snap.exists) return { ref: null, error: "퀴즈를 찾을 수 없습니다.", status: 404 };
  const data = snap.data()!;
  if (data.createdBy !== uid) return { ref: null, error: "권한이 없습니다.", status: 403 };
  return { ref, data, error: null, status: 200 };
}

// ── 문항 삭제 ─────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  let uid: string;
  try { uid = await getUidFromRequest(req); }
  catch { return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }); }

  const { index } = await req.json();
  const { ref, data, error, status } = await checkOwnership(params.quizId, uid);
  if (!ref) return NextResponse.json({ error }, { status });

  const questions: QuizQuestion[] = data!.questions || [];
  if (index < 0 || index >= questions.length) {
    return NextResponse.json({ error: "잘못된 문항 번호입니다." }, { status: 400 });
  }
  if (questions.length <= 1) {
    return NextResponse.json({ error: "마지막 문항은 삭제할 수 없습니다." }, { status: 400 });
  }

  const updated = questions.filter((_, i) => i !== index);
  await ref.update({ questions: updated });

  return NextResponse.json({ questions: updated });
}

// ── 문항 1개 AI 재생성 (분필 1개) ─────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { quizId: string } }
) {
  let uid: string;
  try { uid = await getUidFromRequest(req); }
  catch { return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }); }

  const { index } = await req.json();
  const { ref, data, error, status } = await checkOwnership(params.quizId, uid);
  if (!ref) return NextResponse.json({ error }, { status });

  const questions: QuizQuestion[] = data!.questions || [];
  if (index < 0 || index >= questions.length) {
    return NextResponse.json({ error: "잘못된 문항 번호입니다." }, { status: 400 });
  }

  let charged = false;
  const chalkEnabled = await isChalkEnabled();
  try {
    if (chalkEnabled) {
      await deductCredits(uid, REGENERATE_COST, "퀴즈 문항 재생성");
      charged = true;
    }

    const oldQ = questions[index];
    const prompt = `당신은 한국어 교육 전문가입니다. 아래 문항과 같은 유형·난이도로, 내용만 다른 새 문항 1개를 생성하세요.

[기존 문항 유형] ${oldQ.type}
[학습 문법/주제] ${(data!.grammarPoints || []).join(", ")}
[난이도] ${data!.difficulty}

반드시 JSON 하나만 응답 (다른 텍스트 금지):
{"type":"${oldQ.type}","question":"...","choices":null,"answer":"...","explanation":"..."}`;

    const newQ = await generateSingleQuestionWithRetry(prompt);

    const updated = [...questions];
    updated[index] = newQ;
    await ref.update({ questions: updated });

    return NextResponse.json({ questions: updated, chalkSpent: charged ? REGENERATE_COST : 0 });
  } catch (e) {
    console.error("[quiz/questions regenerate] error:", e);
    if (charged) await refundCredits(uid, REGENERATE_COST, "문항 재생성 실패").catch(() => {});
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "분필이 부족합니다.", code: "INSUFFICIENT_CHALK" }, { status: 402 });
    }
    return NextResponse.json({ error: "재생성에 실패했습니다. 분필은 환불됐어요." }, { status: 500 });
  }
}