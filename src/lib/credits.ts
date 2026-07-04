// src/lib/credits.ts
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp, Transaction } from "firebase-admin/firestore";

export class InsufficientCreditsError extends Error {
  constructor() { super("INSUFFICIENT_CREDITS"); }
}

type ChalkEvent = {
  amount:    number;
  expiresAt: Timestamp;
  reason?:   string;
};

export async function deductCredits(uid: string, amount: number, reason: string) {
  const userRef = adminDb.collection("users").doc(uid);

  return adminDb.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error("USER_NOT_FOUND");
    const data = snap.data()!;
    const now  = Timestamp.now();

    const chalkEvents: ChalkEvent[] = data.chalkEvents || [];
    const validEventBalance = chalkEvents.reduce((sum, e) => {
      const isValid = e.expiresAt && e.expiresAt.toMillis() > now.toMillis();
      return isValid ? sum + Math.max(0, e.amount || 0) : sum;
    }, 0);
    const permanentBalance = data.chalk || 0;
    if (validEventBalance + permanentBalance < amount) {
      throw new InsufficientCreditsError();
    }

    let remaining = amount;
    const updatedEvents = chalkEvents
      .map(e => {
        if (remaining <= 0) return e;
        const isValid = e.expiresAt && e.expiresAt.toMillis() > now.toMillis();
        if (!isValid) return e;
        const available = Math.max(0, e.amount || 0);
        if (available <= 0) return e;
        const take = Math.min(available, remaining);
        remaining -= take;
        return { ...e, amount: available - take };
      })
      .filter(e => e.amount > 0 || (e.expiresAt && e.expiresAt.toMillis() <= now.toMillis()));

    const updates: Record<string, unknown> = { chalkEvents: updatedEvents };
    if (remaining > 0) updates.chalk = FieldValue.increment(-remaining);
    tx.update(userRef, updates);

    const logRef = adminDb.collection("chalkLogs").doc();
    tx.set(logRef, {
      uid, amount: -amount, reason,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { spent: amount };
  });
}

export async function refundCredits(uid: string, amount: number, reason: string) {
  const userRef = adminDb.collection("users").doc(uid);
  await userRef.update({ chalk: FieldValue.increment(amount) });
  await adminDb.collection("chalkLogs").add({
    uid, amount, reason: `환불: ${reason}`,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// ── 무료 분필 지급 (이벤트 분필, 만료 있음) ────────────────────
export async function grantEventChalk(
  uid: string,
  amount: number,
  reason: string,
  expiresInDays: number,
): Promise<void> {
  const userRef   = adminDb.collection("users").doc(uid);
  const expiresAt = Timestamp.fromMillis(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await userRef.update({
    chalkEvents: FieldValue.arrayUnion({ amount, expiresAt, reason }),
  });
  await adminDb.collection("chalkLogs").add({
    uid, amount, reason: `지급: ${reason}`,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// ── 중복 지급 방지 지급 (트랜잭션 + 지급 이력 문서로 idempotent 보장) ──
// grantKey가 이미 존재하면 지급하지 않고 false 반환
export async function grantEventChalkOnce(
  uid: string,
  grantKey: string,       // 예: "daily-2026-07-04", "feedback-<feedbackId>"
  amount: number,
  reason: string,
  expiresInDays: number,
): Promise<boolean> {
  const grantRef = adminDb.collection("chalkGrants").doc(`${uid}_${grantKey}`);
  const userRef  = adminDb.collection("users").doc(uid);

  return adminDb.runTransaction(async (tx: Transaction) => {
    const grantSnap = await tx.get(grantRef);
    if (grantSnap.exists) return false;   // 이미 지급됨

    const expiresAt = Timestamp.fromMillis(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    tx.set(grantRef, { uid, grantKey, amount, createdAt: FieldValue.serverTimestamp() });
    tx.update(userRef, {
      chalkEvents: FieldValue.arrayUnion({ amount, expiresAt, reason }),
    });
    return true;
  });
}