"use client";

interface GateBannerProps {
  reason:   "login" | "chalk";
  message:  string;
  onLogin?: () => void;
  onShop?:  () => void;
}

export default function GateBanner({ reason, message, onLogin, onShop }: GateBannerProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${
      reason === "login"
        ? "bg-[#FFF8E1] border-[#F9A825]"
        : "bg-[#F0FFF4] border-[#9AE6B4]"
    }`}>
      <span className="text-xl flex-shrink-0">{reason === "login" ? "🔒" : "🖍️"}</span>
      <p className="text-sm text-[#2D2D2D] flex-1">{message}</p>
      {reason === "login" && onLogin && (
        <button onClick={onLogin}
          className="px-3 py-1.5 bg-[#1B4332] text-white text-xs font-bold rounded-lg hover:bg-[#2D6A4F] transition-colors whitespace-nowrap">
          로그인
        </button>
      )}
      {reason === "chalk" && onShop && (
        <a href="/shop"
          className="px-3 py-1.5 bg-[#F2C94C] text-[#1B4332] text-xs font-bold rounded-lg hover:bg-[#EAB800] transition-colors whitespace-nowrap">
          🖍️ 충전
        </a>
      )}
    </div>
  );
}