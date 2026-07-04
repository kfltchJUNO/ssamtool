// src/app/api/quiz/list/route.ts
// 내가 만든 퀴즈 목록 (응시 수 포함)
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

async function getUidFromRequest(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new Error("UNAUTHENTICATED");
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

export async function GET(req: NextRequest) {
  let uid: string;
  try {
    uid = await getUidFromRequest(req);
  } catch {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const snap = await adminDb
      .collection("ssamtoolQuizzes")
      .where("createdBy", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ssamtool.vercel.app";

    const quizzes = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        // 응시 수 집계 (count aggregate — 문서 전체를 읽지 않아 저렴)
        const countSnap = await d.ref.collection("attempts").count().get();
        return {
          quizId:        d.id,
          title:         data.title ?? "",
          difficulty:    data.difficulty ?? "",
          grammarPoints: data.grammarPoints ?? [],
          questionCount: Array.isArray(data.questions) ? data.questions.length : 0,
          isPublished:   !!data.isPublished,
          shareCode:     data.shareCode ?? null,
          shareUrl:      data.shareCode ? `${baseUrl}/q/${data.shareCode}` : null,
          attemptCount:  countSnap.data().count,
          createdAt:     data.createdAt?.toDate?.()?.toISOString() ?? null,
        };
      })
    );

    return NextResponse.json({ quizzes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[quiz/list] error:", msg);
    return NextResponse.json({ error: "목록을 불러오지 못했습니다." }, { status: 500 });
  }
}