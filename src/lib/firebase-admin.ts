// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

// 지연 초기화: 빌드 타임(페이지 데이터 수집)에 환경변수가 없어도 죽지 않도록
// 실제 요청이 들어올 때 처음으로 초기화됨
let app: App | null = null;

function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }
  app = initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // .env에 개행 문자가 이스케이프되어 저장되므로 복원 필요
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
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