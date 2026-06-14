"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── 구글 애드센스 ─────────────────────────────────────────────────
interface AdSenseProps {
  slot:    string;
  format?: "auto" | "rectangle" | "horizontal";
  className?: string;
}

export function AdSense({ slot, format = "auto", className = "" }: AdSenseProps) {
  const ref    = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    const ins = ref.current?.querySelector(".adsbygoogle");
    if (!ins || ins.getAttribute("data-adsbygoogle-status")) return;
    try {
      pushed.current = true;
      // @ts-expect-error adsbygoogle global
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, []);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-4585319125929329"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// ── 카카오 애드핏 ─────────────────────────────────────────────────
interface KakaoAdFitProps {
  unit:   string;
  width:  number;
  height: number;
  className?: string;
}

export function KakaoAdFit({ unit, width, height, className = "" }: KakaoAdFitProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.querySelector("ins")) return;

    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.setAttribute("style", "display:none;");
    ins.setAttribute("data-ad-unit", unit);
    ins.setAttribute("data-ad-width", String(width));
    ins.setAttribute("data-ad-height", String(height));
    ref.current.appendChild(ins);

    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/kas/static/ba.min.js";
    script.async = true;
    ref.current.appendChild(script);
  }, [unit, width, height]);

  return <div ref={ref} className={className} style={{ minHeight: height }} />;
}

// ── 쿠팡 파트너스 — 4개 상품 랜덤 로테이션 ──────────────────────
const COUPANG_ITEMS = [
  {
    label: "A4 코팅지",
    desc:  "이름표 코팅에 딱! 양면 코팅지",
    icon:  "🗂️",
    href:  "https://link.coupang.com/a/eAxg0Spq9Y",
    tag:   "코팅지",
  },
  {
    label: "이름표 목걸이",
    desc:  "학생 명찰용 목걸이 홀더",
    icon:  "🪪",
    href:  "https://link.coupang.com/a/eAxjQt79H2",
    tag:   "이름표",
  },
  {
    label: "칭찬 스탬프",
    desc:  "수업 활용 칭찬 도장 세트",
    icon:  "⭐",
    href:  "https://link.coupang.com/a/eAxlEMrpZs",
    tag:   "스탬프",
  },
  {
    label: "토픽 공부 교재",
    desc:  "한국어능력시험 TOPIK 대비",
    icon:  "📚",
    href:  "https://link.coupang.com/a/eAxnLVYjbE",
    tag:   "TOPIK",
  },
];

interface CoupangBannerProps {
  className?: string;
}

export function CoupangBanner({ className = "" }: CoupangBannerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fade, setFade] = useState(true);

  // 마운트 시 랜덤 시작 인덱스
  useEffect(() => {
    setCurrentIdx(Math.floor(Math.random() * COUPANG_ITEMS.length));
  }, []);

  // 5초마다 자동 로테이션
  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % COUPANG_ITEMS.length);
        setFade(true);
      }, 200);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goTo = useCallback((idx: number) => {
    setFade(false);
    setTimeout(() => { setCurrentIdx(idx); setFade(true); }, 150);
  }, []);

  const item = COUPANG_ITEMS[currentIdx];

  return (
    <div className={`rounded-xl border border-[#E8E0D0] bg-white overflow-hidden ${className}`}>
      <div className="px-3 py-1.5 bg-[#F9F9F9] border-b border-[#E8E0D0] flex items-center justify-between">
        <p className="text-[10px] text-[#9A9A9A] font-medium">쿠팡 파트너스 추천 상품</p>
        {/* 인디케이터 */}
        <div className="flex gap-1">
          {COUPANG_ITEMS.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIdx ? "bg-[#E14F4F] w-3" : "bg-[#E8E0D0]"}`}
            />
          ))}
        </div>
      </div>

      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="flex items-center gap-3 px-4 py-3 hover:bg-[#FFF5F5] transition-colors group"
        style={{ opacity: fade ? 1 : 0, transition: "opacity 0.2s ease" }}
      >
        <div className="w-10 h-10 rounded-xl bg-[#FFF5F5] flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm text-[#2D2D2D]">{item.label}</p>
            <span className="text-[10px] bg-[#FFF0F0] text-[#E14F4F] px-1.5 py-0.5 rounded font-semibold">{item.tag}</span>
          </div>
          <p className="text-xs text-[#9A9A9A] mt-0.5">{item.desc}</p>
        </div>
        <span className="text-[#E14F4F] font-bold text-xs whitespace-nowrap group-hover:translate-x-1 transition-transform">
          보러가기 →
        </span>
      </a>

      <p className="text-[9px] text-[#CCCCCC] text-center pb-1.5">
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
}

// ── 앱 교차 홍보 배너 ─────────────────────────────────────────────
interface AppPromoBannerProps {
  app: "sori" | "wooriban" | "iam";
  className?: string;
}

const APP_PROMOS = {
  sori: {
    icon:   "🎤",
    name:   "소리튜터",
    desc:   "AI 한국어 발음 교정 앱",
    cta:    "발음 교정 시작",
    color:  "from-[#E3F2FD] to-[#BBDEFB]",
    border: "border-[#90CAF9]",
    href:   "https://sori-tutor.vercel.app",
  },
  wooriban: {
    icon:   "📚",
    name:   "우리반",
    desc:   "숙제·작문 AI 피드백 + 반 관리",
    cta:    "우리반 앱 보기",
    color:  "from-[#E8F5E9] to-[#C8E6C9]",
    border: "border-[#A5D6A7]",
    href:   "https://wooriban.vercel.app",
  },
  iam: {
    icon:   "🪪",
    name:   "아이엠",
    desc:   "AI 디지털 명함 서비스",
    cta:    "명함 만들기",
    color:  "from-[#F3E5F5] to-[#E1BEE7]",
    border: "border-[#CE93D8]",
    href:   "https://aim-card.vercel.app",
  },
};

export function AppPromoBanner({ app, className = "" }: AppPromoBannerProps) {
  const promo = APP_PROMOS[app];
  return (
    <a href={promo.href} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 bg-gradient-to-r ${promo.color} ${promo.border} hover:shadow-md transition-all group ${className}`}>
      <span className="text-3xl flex-shrink-0">{promo.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-[#1B4332]">{promo.name}</p>
        <p className="text-xs text-[#4A4A4A]">{promo.desc}</p>
      </div>
      <span className="text-xs font-semibold text-[#1B4332] bg-white/60 px-2.5 py-1 rounded-lg group-hover:bg-white transition-colors whitespace-nowrap">
        {promo.cta} →
      </span>
    </a>
  );
}