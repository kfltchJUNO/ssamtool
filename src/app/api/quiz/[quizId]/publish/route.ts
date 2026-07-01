// src/app/api/quiz/[quizId]/publish/route.ts
// 강사가 퀴즈를 학생에게 공유 가능한 상태로 변경. shareCode를 최초 1회 생성.
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { customAlphabet } from "nanoid";

// 학생이 입력하기 쉬운 코드로 — 대문자+숫자, 헷갈리는 0/O, 1/I 제외
const nanoid = customAlphabet("23456789ABCDEFGHJKMNPQRSTUVWXYZ", 6);

async function getUidFromRequest(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new Error("UNAUTHENTICATED");
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

export async function POST(req: NextRequest, { params }: { params: { quizId: string } }) {
  let uid: string;
  try {
    uid = await getUidFromRequest(req);
  } catch {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const quizRef = adminDb.collection("quizzes").doc(params.quizId);
  const snap    = await quizRef.get();

  if (!snap.exists) {
    return NextResponse.json({ error: "퀴즈를 찾을 수 없습니다." }, { status: 404 });
  }

  const quiz = snap.data()!;
  if (quiz.createdBy !== uid) {
    return NextResponse.json({ error: "본인이 만든 퀴즈만 게시할 수 있습니다." }, { status: 403 });
  }

  const shareCode = quiz.shareCode || nanoid();
  await quizRef.update({ isPublished: true, shareCode });

  // 실제 배포 도메인
  const baseUrl   = process.env.NEXT_PUBLIC_BASE_URL || "https://ssamtool.vercel.app";
  const shareUrl  = `${baseUrl}/q/${shareCode}`;

  return NextResponse.json({ shareCode, shareUrl });
}

export async function DELETE(req: NextRequest, { params }: { params: { quizId: string } }) {
  // 게시 중단 (링크 무효화 — shareCode는 유지, isPublished만 false)
  let uid: string;
  try {
    uid = await getUidFromRequest(req);
  } catch {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const quizRef = adminDb.collection("quizzes").doc(params.quizId);
  const snap    = await quizRef.get();

  if (!snap.exists || snap.data()!.createdBy !== uid) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  await quizRef.update({ isPublished: false });
  return NextResponse.json({ ok: true });
}