// src/app/api/quiz/list/route.ts
// 내가 만든 퀴즈 목록 (응시 수 포함)
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    // Firestore에서 where("createdBy", "==", uid)와 orderBy("createdAt", "desc")를 함께 쓰면
    // 복합 색인(Composite Index)이 필요해 색인이 없으면 쿼리 전체가 실패(500)합니다.
    // 색인 종속성을 제거하기 위해 단일 필드 쿼리 후 메모리에서 정렬합니다.
    const snap = await adminDb
      .collection("ssamtoolQuizzes")
      .where("createdBy", "==", uid)
      .limit(60)
      .get();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ssamtool.vercel.app";

    const quizzes = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        // 응시 수 집계 (count aggregate — 문서 전체를 읽지 않아 저렴)
        let attemptCount = 0;
        try {
          const countSnap = await d.ref.collection("attempts").count().get();
          attemptCount = countSnap.data().count;
        } catch (cErr) {
          console.warn(`[quiz/list] attempt count error for ${d.id}:`, cErr);
        }

        let createdAtIso: string | null = null;
        let createdMillis = 0;
        if (data.createdAt?.toDate) {
          const dObj = data.createdAt.toDate();
          createdAtIso = dObj.toISOString();
          createdMillis = dObj.getTime();
        } else if (typeof data.createdAt === "string") {
          createdAtIso = data.createdAt;
          createdMillis = new Date(data.createdAt).getTime() || 0;
        }

        return {
          quizId:        d.id,
          title:         data.title || (data.topic ? `${data.topic} 퀴즈` : "제목 없음"),
          topic:         data.topic ?? null,
          difficulty:    data.difficulty ?? "beginner",
          grammarPoints: data.grammarPoints ?? [],
          questionCount: Array.isArray(data.questions) ? data.questions.length : 0,
          isPublished:   !!data.isPublished,
          shareCode:     data.shareCode ?? null,
          shareUrl:      data.shareCode ? `${baseUrl}/q/${data.shareCode}` : null,
          attemptCount,
          createdAt:     createdAtIso,
          _millis:       createdMillis,
        };
      })
    );

    // 최신 생성순(내림차순)으로 정렬
    quizzes.sort((a, b) => b._millis - a._millis);

    // 내부 정렬용 필드 제거 후 반환
    const cleanQuizzes = quizzes.map((q) => {
      const copy = { ...q } as Partial<typeof q>;
      delete copy._millis;
      return copy;
    });

    return NextResponse.json({ quizzes: cleanQuizzes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[quiz/list] error:", msg, err);
    return NextResponse.json({ error: "목록을 불러오지 못했습니다.", details: msg }, { status: 500 });
  }
}