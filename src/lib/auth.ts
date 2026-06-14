import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

export const ADMIN_EMAIL = "ot.helper7@gmail.com";

// ── 관리자 여부 ────────────────────────────────────────────────────
export function isAdmin(user: User | null): boolean {
  return user?.email === ADMIN_EMAIL;
}

// ── 구글 로그인 ───────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  await ensureUserDoc(result.user);
  return result.user;
}

// ── 이메일 회원가입 ───────────────────────────────────────────────
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  await ensureUserDoc(result.user);
  return result.user;
}

// ── 이메일 로그인 ─────────────────────────────────────────────────
export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDoc(result.user);
  return result.user;
}

// ── 로그아웃 ──────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

// ── 비밀번호 재설정 ───────────────────────────────────────────────
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// ── Firestore 유저 문서 보장 ──────────────────────────────────────
// 최초 로그인 시 /users/{uid} 생성, 이후엔 마지막 로그인 시각만 갱신
export async function ensureUserDoc(user: User): Promise<void> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // 신규 유저
    await setDoc(ref, {
      uid:         user.uid,
      email:       user.email,
      displayName: user.displayName ?? "",
      photoURL:    user.photoURL ?? "",
      grade:       user.email === ADMIN_EMAIL ? "admin" : "free",
      chalk:       0,          // 일반 분필 잔액
      chalkEvents: [],         // 이벤트 분필 배열 [{amount, expiresAt}]
      createdAt:   serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } else {
    // 기존 유저 — 마지막 로그인만 갱신
    await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true });
  }
}

// ── 유저 문서 조회 ────────────────────────────────────────────────
export interface UserDoc {
  uid:         string;
  email:       string;
  displayName: string;
  photoURL:    string;
  grade:       "free" | "admin";
  chalk:       number;
  chalkEvents: { amount: number; expiresAt: { toDate: () => Date } }[];
  createdAt:   unknown;
  lastLoginAt: unknown;
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

// ── 유효 분필 잔액 계산 (이벤트 분필 만료 체크) ─────────────────────
export function calcTotalChalk(userDoc: UserDoc): number {
  const now = new Date();
  const eventChalk = userDoc.chalkEvents
    .filter((e) => e.expiresAt.toDate() > now)
    .reduce((sum, e) => sum + e.amount, 0);
  return userDoc.chalk + eventChalk;
}