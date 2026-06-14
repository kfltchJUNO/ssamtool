import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "쌤툴 | 한국어 강사 수업 도구",
  description: "이름표·자리표·랜덤뽑기·모둠나누기·말하기시험 — 한국어 강사 수업 도구 모음",
  verification: {
    google: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", // Google Search Console 인증 코드
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 구글 애드센스 */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4585319125929329"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {/* 카카오 애드핏은 컴포넌트 단에서 동적 삽입 */}
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}