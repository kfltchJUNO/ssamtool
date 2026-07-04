// src/app/api/wooriban/schools/route.ts
// 쌤툴에서 우리반 배포 대상 학교/학기/반을 선택하기 위한 목록 조회
// 같은 Firebase 프로젝트(wooriban1)를 공유하므로 schools 컬렉션 직접 접근
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
  try {
    await getUidFromRequest(req);
  } catch {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const snap = await adminDb.collection("schools").get();
    const schools = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ schools });
  } catch (err) {
    console.error("[wooriban/schools] error:", err);
    return NextResponse.json({ error: "학교 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}