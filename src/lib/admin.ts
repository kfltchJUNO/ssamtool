import {
  collection, doc, getDocs, updateDoc, addDoc,
  query, orderBy, limit, where, getDoc,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ── 타입 ──────────────────────────────────────────────────────────
export interface UserRow {
  uid:         string;
  email:       string;
  displayName: string;
  grade:       string;
  chalk:       number;
  chalkEvents: ChalkEvent[];
  createdAt:   Timestamp | null;
  lastLoginAt: Timestamp | null;
}

export interface ChalkEvent {
  amount:    number;
  expiresAt: Timestamp;
  reason:    string;
}

export interface ChalkLog {
  id:          string;
  uid:         string;
  email:       string;
  displayName: string;
  type:        "grant" | "deduct";
  amount:      number;
  reason:      string;
  expiresAt:   Timestamp | null;
  createdAt:   Timestamp | null;
  adminEmail:  string;
}

export interface Feedback {
  id:        string;
  uid:       string;
  email:     string;
  category:  "bug" | "feature" | "inquiry";
  content:   string;
  status:    "pending" | "read" | "resolved";
  createdAt: Timestamp | null;
}

// ── 유저 목록 ─────────────────────────────────────────────────────
export async function getAllUsers(): Promise<UserRow[]> {
  const snap = await getDocs(
    query(collection(db, "users"), orderBy("createdAt", "desc"), limit(200))
  );
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserRow));
}

export async function getUser(uid: string): Promise<UserRow | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserRow) : null;
}

// ── 이벤트 분필 지급 ──────────────────────────────────────────────
export async function grantEventChalk(
  adminEmail: string,
  targetUid:  string,
  targetEmail: string,
  targetName: string,
  amount:     number,
  reason:     string,
  expiresAt:  Date,
) {
  const userRef  = doc(db, "users", targetUid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("유저를 찾을 수 없어요.");

  const userData = userSnap.data();
  const events: ChalkEvent[] = userData.chalkEvents ?? [];

  // 새 이벤트 분필 추가
  events.push({
    amount,
    expiresAt: Timestamp.fromDate(expiresAt),
    reason,
  });

  await updateDoc(userRef, { chalkEvents: events });

  // 로그 기록
  await addDoc(collection(db, "chalkLogs"), {
    uid:         targetUid,
    email:       targetEmail,
    displayName: targetName,
    type:        "grant",
    amount,
    reason,
    expiresAt:   Timestamp.fromDate(expiresAt),
    createdAt:   serverTimestamp(),
    adminEmail,
  });
}

// ── 일괄 이벤트 분필 지급 ─────────────────────────────────────────
export async function grantEventChalkBulk(
  adminEmail: string,
  uids:       string[],
  amount:     number,
  reason:     string,
  expiresAt:  Date,
) {
  // 병렬 처리
  await Promise.all(
    uids.map(async (uid) => {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (!userSnap.exists()) return;
      const d = userSnap.data();
      const events: ChalkEvent[] = d.chalkEvents ?? [];
      events.push({ amount, expiresAt: Timestamp.fromDate(expiresAt), reason });
      await updateDoc(doc(db, "users", uid), { chalkEvents: events });
      await addDoc(collection(db, "chalkLogs"), {
        uid,
        email:       d.email ?? "",
        displayName: d.displayName ?? "",
        type:        "grant",
        amount,
        reason,
        expiresAt:   Timestamp.fromDate(expiresAt),
        createdAt:   serverTimestamp(),
        adminEmail,
      });
    })
  );
}

// ── 분필 로그 ─────────────────────────────────────────────────────
export async function getChalkLogs(limitN = 100): Promise<ChalkLog[]> {
  const snap = await getDocs(
    query(collection(db, "chalkLogs"), orderBy("createdAt", "desc"), limit(limitN))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ChalkLog));
}

// ── 피드백 ────────────────────────────────────────────────────────
export async function getFeedbacks(status?: string): Promise<Feedback[]> {
  const q = status
    ? query(collection(db, "feedbacks"), where("status","==",status), orderBy("createdAt","desc"), limit(100))
    : query(collection(db, "feedbacks"), orderBy("createdAt","desc"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Feedback));
}

export async function updateFeedbackStatus(id: string, status: "pending"|"read"|"resolved") {
  await updateDoc(doc(db, "feedbacks", id), { status });
}

// ── 통계 ──────────────────────────────────────────────────────────
export async function getStats() {
  const [usersSnap, logsSnap, feedbacksSnap] = await Promise.all([
    getDocs(query(collection(db, "users"), limit(500))),
    getDocs(query(collection(db, "chalkLogs"), orderBy("createdAt","desc"), limit(50))),
    getDocs(query(collection(db, "feedbacks"), where("status","==","pending"), limit(50))),
  ]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let totalChalkGranted = 0;
  logsSnap.docs.forEach(d => {
    if (d.data().type === "grant") totalChalkGranted += d.data().amount ?? 0;
  });

  const todayLogins = usersSnap.docs.filter(d => {
    const last = d.data().lastLoginAt?.toDate();
    return last && last >= today;
  }).length;

  return {
    totalUsers:       usersSnap.size,
    todayLogins,
    pendingFeedbacks: feedbacksSnap.size,
    totalChalkGranted,
    recentLogs:       logsSnap.docs.slice(0,5).map(d => ({ id: d.id, ...d.data() } as ChalkLog)),
  };
}

// ── 날짜 포맷 ─────────────────────────────────────────────────────
export function fmtDate(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  const d = ts.toDate();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function fmtDateTime(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  const d = ts.toDate();
  return `${fmtDate(ts)} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

export function calcEffectiveChalk(user: UserRow): number {
  const now = new Date();
  const eventTotal = (user.chalkEvents ?? [])
    .filter(e => e.expiresAt?.toDate() > now)
    .reduce((s, e) => s + e.amount, 0);
  return (user.chalk ?? 0) + eventTotal;
}