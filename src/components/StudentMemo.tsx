"use client";

import { useEffect, useState } from "react";

function detectInAppBrowser(): { isInApp: boolean; name: string } {
  if (typeof window === "undefined") return { isInApp: false, name: "" };
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return { isInApp: true, name: "카카오톡" };
  if (/Instagram/i.test(ua))  return { isInApp: true, name: "인스타그램" };
  if (/NAVER/i.test(ua))      return { isInApp: true, name: "네이버" };
  if (/Line\//i.test(ua))     return { isInApp: true, name: "라인" };
  if (/FB_IAB|FBAV/i.test(ua))return { isInApp: true, name: "페이스북" };
  return { isInApp: false, name: "" };
}

export default function InAppBrowserBanner() {
  const [info, setInfo] = useState<{ isInApp: boolean; name: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setInfo(detectInAppBrowser());
  }, []);

  if (!info?.isInApp || dismissed) return null;

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const openInChrome = () => {
    // Android Chrome 외부 열기 의도
    window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(currentUrl).catch(() => {});
    alert("주소를 복사했어요.\n크롬 또는 삼성 인터넷에서 붙여넣기 후 접속해 주세요.");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#1B4332] text-white px-4 py-3 shadow-lg">
      <div className="max-w-lg mx-auto">
        <p className="text-sm font-semibold">
          {info.name} 내부 브라우저에서는 구글 로그인이 제한될 수 있어요.
        </p>
        <p className="text-xs text-[#A8D5B7] mt-0.5">
          크롬 또는 삼성 인터넷으로 열어주세요.
        </p>
        <div className="flex gap-2 mt-2">
          <button onClick={openInChrome}
            className="px-3 py-1.5 bg-[#F2C94C] text-[#1B4332] text-xs font-bold rounded-lg hover:bg-[#EAB800] transition-colors">
            크롬으로 열기
          </button>
          <button onClick={copyUrl}
            className="px-3 py-1.5 bg-[#2D6A4F] text-white text-xs font-semibold rounded-lg hover:bg-[#3D7A5F] transition-colors">
            주소 복사
          </button>
          <button onClick={() => setDismissed(true)}
            className="ml-auto text-[#A8D5B7] hover:text-white text-lg leading-none px-1">
            ×
          </button>
        </div>
      </div>
    </div>
  );
}