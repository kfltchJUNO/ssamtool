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

// ── GET: 자리 배정 결과 목록 조회 ──────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { searchParams } = new URL(req.url);
    const layoutId = searchParams.get("layoutId");

    const colRef = adminDb.collection("seatingCharts").doc(uid).collection("charts");
    const snap = await colRef.get();

    let charts = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        layoutId: data.layoutId,
        classId: data.classId || "",
        title: data.title || "",
        assignments: data.assignments || [],
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    });

    if (layoutId) {
      charts = charts.filter(c => c.layoutId === layoutId);
    }

    return NextResponse.json({ charts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    console.error("[GET /api/seating/chart Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}

// ── POST: 자리 배정 결과 신규 저장 ────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const body = await req.json();
    const { layoutId, classId, title, assignments } = body;

    if (!layoutId || !title || !Array.isArray(assignments)) {
      return NextResponse.json({ error: "INVALID_PARAMETERS" }, { status: 400 });
    }

    const cleanData = JSON.parse(
      JSON.stringify({
        layoutId,
        classId: classId || null,
        title,
        assignments,
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    const colRef = adminDb.collection("seatingCharts").doc(uid).collection("charts");
    const docRef = await colRef.add(cleanData);

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    console.error("[POST /api/seating/chart Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}

// ── DELETE: 자리 배정 결과 삭제 ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "MISSING_CHART_ID" }, { status: 400 });
    }

    const docRef = adminDb.collection("seatingCharts").doc(uid).collection("charts").doc(id);
    await docRef.delete();

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    console.error("[DELETE /api/seating/chart Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}
