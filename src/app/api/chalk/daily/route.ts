import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { grantEventChalkOnce } from "@/lib/credits";

// 한국 표준시 (KST, UTC+9) 기준 오늘 날짜 구하기 (YYYY-MM-DD)
function getKstDateString(): string {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffset);
  return kstDate.toISOString().split("T")[0];
}

async function getUidFromRequest(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) throw new Error("UNAUTHENTICATED");
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

// ── GET: 오늘 출석 체크 여부 확인 ───────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const dateStr = getKstDateString();
    const grantKey = `daily-${dateStr}`;
    const grantRef = adminDb.collection("chalkGrants").doc(`${uid}_${grantKey}`);
    const snap = await grantRef.get();

    return NextResponse.json({
      claimed: snap.exists,
      date: dateStr,
      amount: 2,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    console.error("[GET /api/chalk/daily Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}

// ── POST: 오늘 출석 체크 실행 및 무료 분필 지급 ─────────────────────
export async function POST(req: NextRequest) {
  try {
    const uid = await getUidFromRequest(req);
    const dateStr = getKstDateString();
    const grantKey = `daily-${dateStr}`;

    // 1일 1회 출석 체크 (분필 2개, 7일간 유효)
    const granted = await grantEventChalkOnce(
      uid,
      grantKey,
      2,
      `매일 출석 체크 (${dateStr})`,
      7
    );

    if (granted) {
      return NextResponse.json({
        success: true,
        claimed: true,
        amount: 2,
        message: "오늘의 출석 체크 완료! 이벤트 분필 2개가 지급되었습니다. (7일간 유효)",
      });
    } else {
      return NextResponse.json({
        success: false,
        claimed: true,
        message: "오늘 출석 체크를 이미 완료하셨습니다. 내일 다시 도전해 주세요!",
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    console.error("[POST /api/chalk/daily Error]", err);
    return NextResponse.json({ error: "SERVER_ERROR", details: msg }, { status: 500 });
  }
}
