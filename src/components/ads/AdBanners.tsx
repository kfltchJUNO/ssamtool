"use client";

import { useEffect, useRef, useState } from "react";

// ── 구글 애드센스 ─────────────────────────────────────────────────
interface AdSenseProps {
  format?: "auto" | "rectangle" | "horizontal";
  className?: string;
}

export function AdSense({ format = "auto", className = "" }: AdSenseProps) {
  const ref     = useRef<HTMLDivElement>(null);
  const pushed  = useRef(false);
  const [hasAd, setHasAd] = useState(false);

  useEffect(() => {
    if (pushed.current) return;
    const ins = ref.current?.querySelector(".adsbygoogle");
    if (!ins || ins.getAttribute("data-adsbygoogle-status")) return;
    try {
      pushed.current = true;
      // @ts-expect-error adsbygoogle global
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}

    // 광고가 실제로 채워졌는지 300ms 후 확인
    setTimeout(() => {
      const status = ins.getAttribute("data-adsbygoogle-status");
      const height = ins.getBoundingClientRect().height;
      if (status === "done" && height > 0) setHasAd(true);
    }, 1500);
  }, []);

  // 광고 미승인/미게재 시 아예 렌더링 안 함
  return (
    <div
      ref={ref}
      className={`overflow-hidden transition-all ${hasAd ? className : "h-0 overflow-hidden"}`}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-4585319125929329"
        data-ad-slot="2312169267"
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

// ── 쿠팡 파트너스 ─────────────────────────────────────────────────
const FALLBACK_REGULAR = [
  "https://link.coupang.com/a/eAxg0Spq9Y",
  "https://link.coupang.com/a/eAxjQt79H2",
  "https://link.coupang.com/a/eAxlEMrpZs",
  "https://link.coupang.com/a/eAxnLVYjbE",
  "https://link.coupang.com/a/eAzUILMBSm",
  "https://link.coupang.com/a/eAzWRBk8VU",
  "https://link.coupang.com/a/eAzXMvMgCa",
  "https://link.coupang.com/a/eAzYAM1Rp6",
];

const FALLBACK_EVENTS = [
  { url: "https://link.coupang.com/a/eAAcTgsKOq", expires: new Date("2026-07-30T23:59:59") },
  { url: "https://link.coupang.com/a/eAAkqkp2ku", expires: new Date("2026-07-30T23:59:59") },
  { url: "https://link.coupang.com/a/eAAmsxe0aG", expires: new Date("2026-07-30T23:59:59") },
  { url: "https://link.coupang.com/a/eAAfDnrAFU", expires: new Date("2026-07-05T23:59:59") },
];

const NOTICE = "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";

interface CoupangBannerProps { className?: string; }

export function CoupangBanner({ className = "" }: CoupangBannerProps) {
  const [items, setItems] = useState<{ url: string; type: "event" | "regular" }[]>([]);

  useEffect(() => {
    const now = new Date();
    const fallback = () => {
      const validEvents = FALLBACK_EVENTS.filter(e => e.expires > now);
      const result: typeof items = [];
      // 이벤트 하나만 랜덤
      if (validEvents.length > 0) {
        const ev = validEvents[Math.floor(Math.random() * validEvents.length)];
        result.push({ url: ev.url, type: "event" });
      }
      // 상시 하나만 랜덤
      result.push({ url: FALLBACK_REGULAR[Math.floor(Math.random() * FALLBACK_REGULAR.length)], type: "regular" });
      setItems(result);
    };

    import("@/lib/adLinks").then(({ getActiveCoupangLinks }) => {
      getActiveCoupangLinks().then(({ regular, events }) => {
        const result: typeof items = [];
        // 이벤트 하나만
        const ev = events.length > 0 ? events : FALLBACK_EVENTS.filter(e => e.expires > now);
        if (ev.length > 0) {
          const picked = ev[Math.floor(Math.random() * ev.length)];
          result.push({ url: picked.url, type: "event" });
        }
        // 상시 하나만
        const reg = regular.length > 0 ? regular : FALLBACK_REGULAR;
        result.push({ url: reg[Math.floor(Math.random() * reg.length)], type: "regular" });
        setItems(result);
      }).catch(fallback);
    }).catch(fallback);
  }, []);

  if (!items.length) return null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {items.map((item, i) => (
        <a key={i} href={item.url} target="_blank" rel="noopener noreferrer sponsored"
          className={`block w-full py-2 px-4 text-sm font-semibold text-center rounded-xl transition-colors ${
            item.type === "event"
              ? "bg-[#FFF0F0] border border-[#FEB2B2] text-[#C53030] hover:bg-[#FED7D7]"
              : "bg-white border border-[#E8E0D0] text-[#4A4A4A] hover:border-[#E14F4F] hover:bg-[#FFF5F5]"
          }`}>
          {item.type === "event" ? "🎉 쿠팡 기간 한정 이벤트" : "🛒 쿠팡 수업 준비물"}
        </a>
      ))}
      <p className="text-[9px] text-[#CCCCCC] text-center">{NOTICE}</p>
    </div>
  );
}

// ── 쿠팡 검색 위젯 ────────────────────────────────────────────────
export function CoupangSearchWidget({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <iframe src="https://coupa.ng/cnqmG3" width="100%" height="44"
        frameBorder={0} scrolling="no" referrerPolicy="unsafe-url" />
      <p className="text-[9px] text-[#CCCCCC] text-center mt-1">{NOTICE}</p>
    </div>
  );
}

// ── 카카오 애드핏 반응형 (모바일 320×100 / PC 728×90) ────────────
export function KakaoAdFitResponsive({ className = "" }: { className?: string }) {
  const mobileRef = useRef<HTMLDivElement>(null);
  const pcRef     = useRef<HTMLDivElement>(null);

  const insertAd = (el: HTMLDivElement, unit: string, w: number, h: number) => {
    if (el.querySelector("ins")) return;
    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.setAttribute("data-ad-unit",   unit);
    ins.setAttribute("data-ad-width",  String(w));
    ins.setAttribute("data-ad-height", String(h));
    el.appendChild(ins);
    const s = document.createElement("script");
    s.src   = "//t1.kakaocdn.net/kas/static/ba.min.js";
    s.async = true;
    el.appendChild(s);
  };

  useEffect(() => {
    if (mobileRef.current) insertAd(mobileRef.current, "DAN-oQu1Fvtbk8EA1v6y", 320, 100);
    if (pcRef.current)     insertAd(pcRef.current,     "DAN-IVs8Is9gZmI58qrZ", 728,  90);
  }, []);

  return (
    <div className={className}>
      <div ref={mobileRef} className="lg:hidden" />
      <div ref={pcRef}     className="hidden lg:block" />
    </div>
  );
}

// ── 앱 교차 홍보 — 탭 위 가로 바 ────────────────────────────────
const APP_PROMOS_LIST = [
  {
    icon:  "🎤",
    name:  "소리튜터",
    desc:  "AI 발음 교정",
    cta:   "바로가기",
    bg:    "bg-[#EBF8FF]",
    text:  "text-[#1565C0]",
    href:  "https://sori-tutor.vercel.app",
  },
  {
    icon:  "📚",
    name:  "우리반",
    desc:  "숙제·작문 피드백",
    cta:   "바로가기",
    bg:    "bg-[#F0FFF4]",
    text:  "text-[#1B4332]",
    href:  "https://wooriban.vercel.app",
  },
  {
    icon:  "🪪",
    name:  "아이엠",
    desc:  "AI 디지털 명함",
    cta:   "명함 보기",
    bg:    "bg-[#FAF5FF]",
    text:  "text-[#6B46C1]",
    href:  "https://aim-nc.vercel.app/kang",
  },
];

export function AppPromoBar({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-2 overflow-x-auto scrollbar-hide ${className}`}
      style={{ scrollbarWidth: "none" }}>
      {APP_PROMOS_LIST.map(app => (
        <a key={app.name} href={app.href} target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-2 px-3 py-2 rounded-xl ${app.bg} hover:opacity-80 transition-opacity flex-shrink-0 group`}>
          <span className="text-lg">{app.icon}</span>
          <div className="min-w-0">
            <p className={`text-xs font-bold ${app.text} leading-tight`}>{app.name}</p>
            <p className="text-[10px] text-[#4A4A4A] leading-tight">{app.desc}</p>
          </div>
          <span className={`text-[10px] font-semibold ${app.text} bg-white/70 px-2 py-0.5 rounded-lg whitespace-nowrap`}>
            {app.cta} →
          </span>
        </a>
      ))}
    </div>
  );
}

/** @deprecated Use AppPromoBar instead */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AppPromoBanner(_props: { app: string; className?: string }) {
  return null;
}