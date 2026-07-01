// src/lib/credits.ts
// 쌤툴 실제 스키마 기준: users/{uid}.chalk (number, 일반 분필)
//                        users/{uid}.chalkEvents (array, 이벤트 분필 - 만료일 있음)
// 사용 순서: 이벤트 분필 먼저 → 일반 분필 나중
// 사용 로그는 기존 관례에 맞춰 최상위 chalkLogs 컬렉션에 기록 (Admin SDK 쓰기이므로 rules의 isAdmin() 제약과 무관)
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp, Transaction } from "firebase-admin/firestore";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("INSUFFICIENT_CREDITS");
  }
}

type ChalkEvent = {
  amount: number;
  expiresAt: Timestamp;
  reason?: string;
};

/**
 * 분필 차감 (트랜잭션). 이벤트 분필을 먼저 소진하고, 부족분은 일반 분필(chalk)에서 차감.
 * chalkEvents는 배열 필드이며 각 원소는 {amount, expiresAt, reason} - 별도 used 필드 없이
 * amount 자체를 직접 깎는 방식. 트랜잭션 내에서 배열 전체를 읽어 재계산 후 다시 씀.
 */
export async function deductCredits(uid: string, amount: number, reason: string) {
  const userRef = adminDb.collection("users").doc(uid);

  return adminDb.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error("USER_NOT_FOUND");
    const data = snap.data()!;
    const now = Timestamp.now();

    const chalkEvents: ChalkEvent[] = data.chalkEvents || [];
    const validEventBalance = chalkEvents.reduce((sum, e) => {
      const isValid = e.expiresAt && e.expiresAt.toMillis() > now.toMillis();
      return isValid ? sum + Math.max(0, e.amount || 0) : sum;
    }, 0);
    const permanentBalance = data.chalk || 0;
    const totalAvailable = validEventBalance + permanentBalance;

    if (totalAvailable < amount) {
      throw new InsufficientCreditsError();
    }

    let remaining = amount;
    // amount가 0이 된 이벤트 항목은 제거, 나머지는 amount만 깎아서 유지
    const updatedEvents = chalkEvents
      .map((e) => {
        if (remaining <= 0) return e;
        const isValid = e.expiresAt && e.expiresAt.toMillis() > now.toMillis();
        if (!isValid) return e; // 만료분은 건드리지 않음 (별도 정리 배치가 처리)
        const available = Math.max(0, e.amount || 0);
        if (available <= 0) return e;
        const take = Math.min(available, remaining);
        remaining -= take;
        return { ...e, amount: available - take };
      })
      .filter((e) => e.amount > 0 || (e.expiresAt && e.expiresAt.toMillis() <= now.toMillis()));

    // 2) 남은 만큼 일반 분필(chalk) 차감
    const updates: Record<string, any> = { chalkEvents: updatedEvents };
    if (remaining > 0) {
      updates.chalk = FieldValue.increment(-remaining);
    }
    tx.update(userRef, updates);

    // 3) 사용 로그 (기존 chalkLogs 컬렉션 관례에 맞춤)
    const logRef = adminDb.collection("chalkLogs").doc();
    tx.set(logRef, {
      uid,
      amount: -amount,
      reason,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { spent: amount };
  });
}

/** 실패 시 환불. 이벤트 분필 환불은 만료 로직이 복잡해지므로 일반 분필(chalk)로 통일해서 되돌림. */
export async function refundCredits(uid: string, amount: number, reason: string) {
  const userRef = adminDb.collection("users").doc(uid);
  await userRef.update({ chalk: FieldValue.increment(amount) });
  await adminDb.collection("chalkLogs").add({
    uid,
    amount,
    reason: `환불: ${reason}`,
    createdAt: FieldValue.serverTimestamp(),
  });
}