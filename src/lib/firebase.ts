import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 빌드 타임(서버사이드)에서는 초기화하지 않음
// NEXT_PUBLIC_ 변수가 없으면 undefined → 초기화 스킵
function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.apiKey) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  const app = getFirebaseApp();
  if (!app) return null;
  if (!_auth) _auth = getAuth(app);
  return _auth;
}

export function getFirebaseDb(): Firestore | null {
  if (typeof window === "undefined") return null;
  const app = getFirebaseApp();
  if (!app) return null;
  if (!_db) _db = getFirestore(app);
  return _db;
}

// 기존 코드와의 호환성을 위한 proxy export
// 클라이언트에서만 사용 가능
export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    const a = getFirebaseAuth();
    if (!a) return undefined;
    const val = (a as unknown as Record<string, unknown>)[prop as string];
    return typeof val === "function" ? val.bind(a) : val;
  },
});

export const db = new Proxy({} as Firestore, {
  get(_, prop) {
    const d = getFirebaseDb();
    if (!d) return undefined;
    const val = (d as unknown as Record<string, unknown>)[prop as string];
    return typeof val === "function" ? val.bind(d) : val;
  },
});

export default { auth, db };