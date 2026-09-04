import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const ADMIN_EMAILS = ["ot.helper@gmail.com", "ot.helper7@gmail.com"];

async function verifyAdminRequest(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) throw new Error("UNAUTHENTICATED");
  const decoded = await adminAuth.verifyIdToken(token);
  const email = (decoded.email || "").toLowerCase();

  // 유저 문서 Grade 확인
  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  const userData = userSnap.data();
  const isUserAdmin = userData?.grade === "admin" || ADMIN_EMAILS.includes(email);

  if (!isUserAdmin) throw new Error("FORBIDDEN");
  return decoded.uid;
}

// ── GET: 쿠팡 광고 링크 목록 조회 (공개 API) ────────────────────────
export async function GET() {
  try {
    const colRef = adminDb.collection("adLinks").doc("coupang").collection("links");
    const snap = await colRef.get();

    const links = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        url: data.url || "",
        label: data.label || "",
        type: data.type || "regular",
        expiresAt: data.expiresAt || null,
        active: data.active ?? true,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    });

    return NextResponse.json({ links });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/coupang Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}

// ── POST: 쿠팡 링크 신규 추가 (관리자 전용) ─────────────────────────
export async function POST(req: NextRequest) {
  try {
    await verifyAdminRequest(req);
    const body = await req.json();
    const { url, label, type, expiresAt, active } = body;

    if (!url || !label) {
      return NextResponse.json({ error: "INVALID_PARAMETERS" }, { status: 400 });
    }

    const cleanData = JSON.parse(
      JSON.stringify({
        url,
        label,
        type: type || "regular",
        expiresAt: expiresAt || null,
        active: active ?? true,
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    const colRef = adminDb.collection("adLinks").doc("coupang").collection("links");
    const docRef = await colRef.add(cleanData);

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHENTICATED") return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    console.error("[POST /api/admin/coupang Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}

// ── PUT: 쿠팡 링크 수정 (관리자 전용) ─────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    await verifyAdminRequest(req);
    const body = await req.json();
    const { id, active, label, url, type, expiresAt } = body;

    if (!id) {
      return NextResponse.json({ error: "MISSING_LINK_ID" }, { status: 400 });
    }

    const docRef = adminDb.collection("adLinks").doc("coupang").collection("links").doc(id);

    const cleanData = JSON.parse(
      JSON.stringify({
        ...(active !== undefined && { active }),
        ...(label !== undefined && { label }),
        ...(url !== undefined && { url }),
        ...(type !== undefined && { type }),
        ...(expiresAt !== undefined && { expiresAt }),
      })
    );

    await docRef.update(cleanData);
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHENTICATED") return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    console.error("[PUT /api/admin/coupang Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}

// ── DELETE: 쿠팡 링크 삭제 (관리자 전용) ──────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    await verifyAdminRequest(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "MISSING_LINK_ID" }, { status: 400 });
    }

    const docRef = adminDb.collection("adLinks").doc("coupang").collection("links").doc(id);
    await docRef.delete();

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHENTICATED") return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    console.error("[DELETE /api/admin/coupang Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}
