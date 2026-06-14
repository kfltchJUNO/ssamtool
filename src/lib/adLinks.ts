import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

export interface CoupangLink {
  id:        string;
  url:       string;
  label:     string;
  type:      "regular" | "event";
  expiresAt: string | null; // ISO string, null이면 상시
  active:    boolean;
  createdAt?: unknown;
}

const COL = collection(db, "adLinks", "coupang", "links");

export async function getCoupangLinks(): Promise<CoupangLink[]> {
  const snap = await getDocs(query(COL, orderBy("createdAt", "asc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CoupangLink));
}

export async function addCoupangLink(data: Omit<CoupangLink, "id" | "createdAt">) {
  return addDoc(COL, { ...data, createdAt: serverTimestamp() });
}

export async function updateCoupangLink(id: string, data: Partial<CoupangLink>) {
  return updateDoc(doc(db, "adLinks", "coupang", "links", id), data);
}

export async function deleteCoupangLink(id: string) {
  return deleteDoc(doc(db, "adLinks", "coupang", "links", id));
}

// 활성 링크만 가져와서 앱에서 사용
export async function getActiveCoupangLinks(): Promise<{ regular: string[]; events: { url: string; expires: Date }[] }> {
  const all = await getCoupangLinks();
  const now = new Date();
  const regular: string[] = [];
  const events: { url: string; expires: Date }[] = [];

  all.filter(l => l.active).forEach(l => {
    if (l.type === "event" && l.expiresAt) {
      const exp = new Date(l.expiresAt);
      if (exp > now) events.push({ url: l.url, expires: exp });
    } else if (l.type === "regular") {
      regular.push(l.url);
    }
  });

  return { regular, events };
}

// 초기 데이터 시드 (최초 1회)
export async function seedCoupangLinks() {
  const snap = await getDocs(COL);
  if (snap.size > 0) return; // 이미 있으면 스킵

  const defaults: Omit<CoupangLink, "id" | "createdAt">[] = [
    { url: "https://link.coupang.com/a/eAxg0Spq9Y", label: "A4 코팅지",      type: "regular", expiresAt: null, active: true },
    { url: "https://link.coupang.com/a/eAxjQt79H2", label: "이름표 목걸이",   type: "regular", expiresAt: null, active: true },
    { url: "https://link.coupang.com/a/eAxlEMrpZs", label: "칭찬 스탬프",    type: "regular", expiresAt: null, active: true },
    { url: "https://link.coupang.com/a/eAxnLVYjbE", label: "토픽 교재",      type: "regular", expiresAt: null, active: true },
    { url: "https://link.coupang.com/a/eAzUILMBSm", label: "한국어 교재",    type: "regular", expiresAt: null, active: true },
    { url: "https://link.coupang.com/a/eAzWRBk8VU", label: "칭찬 스티커",    type: "regular", expiresAt: null, active: true },
    { url: "https://link.coupang.com/a/eAzXMvMgCa", label: "칭찬 도장",      type: "regular", expiresAt: null, active: true },
    { url: "https://link.coupang.com/a/eAzYAM1Rp6", label: "TOPIK 교재",    type: "regular", expiresAt: null, active: true },
    { url: "https://link.coupang.com/a/eAAcTgsKOq", label: "이벤트 (~7/30)", type: "event",   expiresAt: "2026-07-30T23:59:59", active: true },
    { url: "https://link.coupang.com/a/eAAfDnrAFU", label: "이벤트 (~7/05)", type: "event",   expiresAt: "2026-07-05T23:59:59", active: true },
    { url: "https://link.coupang.com/a/eAAkqkp2ku", label: "이벤트 (~7/30)", type: "event",   expiresAt: "2026-07-30T23:59:59", active: true },
    { url: "https://link.coupang.com/a/eAAmsxe0aG", label: "이벤트 (~7/30)", type: "event",   expiresAt: "2026-07-30T23:59:59", active: true },
  ];

  for (const d of defaults) {
    await addDoc(COL, { ...d, createdAt: serverTimestamp() });
  }
}