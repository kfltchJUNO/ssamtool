import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// ── GET: 전자칠판 방 상태 조회 ──────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode")?.trim().toUpperCase();

    if (!roomCode) {
      return NextResponse.json({ error: "MISSING_ROOM_CODE" }, { status: 400 });
    }

    const docRef = adminDb.collection("ssamtoolBoards").doc(roomCode);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ exists: false });
    }

    const data = snap.data();
    return NextResponse.json({
      exists: true,
      board: {
        strokes: data?.strokes || [],
        theme: data?.theme || "greenboard",
        updatedAt: data?.updatedAt || 0,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/whiteboard Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}

// ── POST: 전자칠판 방 상태 업데이트 ──────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomCode, strokes, theme } = body;

    const normalizedCode = String(roomCode || "").trim().toUpperCase();
    if (!normalizedCode) {
      return NextResponse.json({ error: "MISSING_ROOM_CODE" }, { status: 400 });
    }

    // 용량 최적화: stroke 포인트 중복 간소화 (최근 150획 한정)
    const sanitizedStrokes = Array.isArray(strokes)
      ? strokes.slice(-150).map((s: { color: string; size: number; mode: string; points: { x: number; y: number }[] }) => ({
          color: s.color,
          size: s.size,
          mode: s.mode,
          points: Array.isArray(s.points)
            ? s.points.map((p: { x: number; y: number }) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
            : [],
        }))
      : [];

    const docRef = adminDb.collection("ssamtoolBoards").doc(normalizedCode);
    const now = Date.now();

    await docRef.set(
      {
        strokes: sanitizedStrokes,
        theme: theme || "greenboard",
        updatedAt: now,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, updatedAt: now });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/whiteboard Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}
