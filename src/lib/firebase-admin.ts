// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App | null = null;

function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "wooriban1";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error(
      "FIREBASE_ADMIN_CONFIG_MISSING: Vercel 환경변수에 FIREBASE_CLIENT_EMAIL과 FIREBASE_PRIVATE_KEY 설정이 필요합니다."
    );
  }

  // 따옴표 제거 및 개행 문자 복원
  privateKey = privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");

  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  return app;
}

// Proxy로 감싸서 실제 사용 시점에 초기화
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const db = getFirestore(getAdminApp());
    const value = db[prop as keyof Firestore];
    return typeof value === "function" ? value.bind(db) : value;
  },
});

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const auth = getAuth(getAdminApp());
    const value = auth[prop as keyof Auth];
    return typeof value === "function" ? value.bind(auth) : value;
  },
});