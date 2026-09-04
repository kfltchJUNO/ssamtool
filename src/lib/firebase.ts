import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase 클라이언트 설정
// NEXT_PUBLIC_* 환경변수가 Vercel에 등록된 경우 그 값을 우선 사용합니다.
// Firebase 클라이언트 API 키는 브라우저에 공개되도록 설계된 공개 키입니다 (GitHub 비밀 키와 다름).
// 참고: https://firebase.google.com/docs/projects/api-keys
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || "AIzaSyAfbx5hTUN4ftle0gBjg0r9Mv-U-su2sGc",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || "wooriban1.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || "wooriban1",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || "wooriban1.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "591681919332",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || "1:591681919332:web:9685e6390d4b7554e2c271",
};

// Next.js 핫리로드 중복 초기화 방지
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
export { app };
export default app;