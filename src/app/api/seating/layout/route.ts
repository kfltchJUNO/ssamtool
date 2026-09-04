import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

async function getUidFromRequest(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) throw new Error("UNAUTHENTICATED");
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

// ── GET: 현재 유저의 자리표 레이아웃 목록 조회 ──────────────────────
export async function GET(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const colRef = adminDb.collection("seatingLayouts").doc(uid).collection("layouts");
    const snap = await colRef.get();

    const layouts = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "무제 교실",
        cols: data.cols || 6,
        rows: data.rows || 5,
        elements: data.elements || [],
        teacherPos: data.teacherPos || null,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
      };
    });

    return NextResponse.json({ layouts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    console.error("[GET /api/seating/layout Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}

// ── POST: 교실 레이아웃 신규 저장 ────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const body = await req.json();
    const { name, cols, rows, elements, teacherPos } = body;

    if (!name || typeof cols !== "number" || typeof rows !== "number") {
      return NextResponse.json({ error: "INVALID_PARAMETERS" }, { status: 400 });
    }

    const cleanData = JSON.parse(
      JSON.stringify({
        name,
        cols,
        rows,
        elements: elements || [],
        teacherPos: teacherPos || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const colRef = adminDb.collection("seatingLayouts").doc(uid).collection("layouts");
    const docRef = await colRef.add(cleanData);

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    console.error("[POST /api/seating/layout Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}

// ── PUT: 교실 레이아웃 수정 ──────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const body = await req.json();
    const { id, name, cols, rows, elements, teacherPos } = body;

    if (!id) {
      return NextResponse.json({ error: "MISSING_LAYOUT_ID" }, { status: 400 });
    }

    const docRef = adminDb.collection("seatingLayouts").doc(uid).collection("layouts").doc(id);

    const cleanData = JSON.parse(
      JSON.stringify({
        ...(name !== undefined && { name }),
        ...(cols !== undefined && { cols }),
        ...(rows !== undefined && { rows }),
        ...(elements !== undefined && { elements }),
        ...(teacherPos !== undefined && { teacherPos }),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    await docRef.update(cleanData);

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    console.error("[PUT /api/seating/layout Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}

// ── DELETE: 교실 레이아웃 삭제 ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "MISSING_LAYOUT_ID" }, { status: 400 });
    }

    const docRef = adminDb.collection("seatingLayouts").doc(uid).collection("layouts").doc(id);
    await docRef.delete();

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    console.error("[DELETE /api/seating/layout Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}
