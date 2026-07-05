// src/lib/monetizationServer.ts
// 서버(Admin SDK)에서 분필 차감 스위치 상태를 확인하는 헬퍼.
// 클라이언트용 lib/monetization.ts와 같은 문서(settings/monetization)를 읽음.
import { adminDb } from "@/lib/firebase-admin";

export async function isChalkEnabled(): Promise<boolean> {
  try {
    const snap = await adminDb.collection("settings").doc("monetization").get();
    if (!snap.exists) return false;   // 문서 없으면 기본값: 꺼짐(무료)
    return snap.data()?.chalkEnabled === true;
  } catch (e) {
    console.error("[monetization] 설정 조회 실패, 안전하게 무료로 처리:", e);
    return false;
  }
}