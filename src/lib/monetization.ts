// src/lib/monetization.ts
// 쌤툴 전체 분필 차감 로직의 전역 on/off 스위치.
// settings/monetization 문서 하나로 관리 — 관리자가 앱에서 즉시 켜고 끌 수 있음
// (배포 없이 반영됨. 지금은 꺼둔 채로 선생님들에게 무료 체험시키고, 나중에 결제 붙이면 켜는 용도)
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface MonetizationSettings {
  chalkEnabled: boolean;   // false면 모든 분필 차감 로직을 건너뛰고 무료로 동작
  updatedAt?:   unknown;
  updatedBy?:   string;
}

const DOC_PATH = ["settings", "monetization"] as const;

// 클라이언트에서 현재 설정 조회 (관리자 토글 UI에서 사용)
export async function getMonetizationSettings(): Promise<MonetizationSettings> {
  const snap = await getDoc(doc(db, ...DOC_PATH));
  if (!snap.exists()) return { chalkEnabled: false };   // 문서 없으면 기본값: 꺼짐(무료)
  return snap.data() as MonetizationSettings;
}

// 관리자 전용 토글 (Firestore 규칙에서 isAdmin()만 쓰기 허용)
export async function setChalkEnabled(enabled: boolean, adminUid: string): Promise<void> {
  await setDoc(doc(db, ...DOC_PATH), {
    chalkEnabled: enabled,
    updatedAt:    new Date(),
    updatedBy:    adminUid,
  }, { merge: true });
}