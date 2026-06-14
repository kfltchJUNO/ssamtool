"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const PLANS = [
  {
    id:       "starter",
    name:     "스타터",
    price:    2900,
    chalk:    10,
    badge:    null,
    color:    "border-[#E8E0D0]",
    btnColor: "bg-[#4A4A4A] hover:bg-[#2D2D2D]",
    // Gumroad 상품 URL — 추후 연결
    gumroadUrl: "https://ssamtool.gumroad.com/l/starter",
  },
  {
    id:       "standard",
    name:     "스탠다드",
    price:    5900,
    chalk:    30,
    badge:    "인기",
    color:    "border-[#1B4332] ring-2 ring-[#1B4332]",
    btnColor: "bg-[#1B4332] hover:bg-[#2D6A4F]",
    gumroadUrl: "https://ssamtool.gumroad.com/l/standard",
  },
  {
    id:       "semester",
    name:     "학기팩",
    price:    9900,
    chalk:    70,
    badge:    "최대 할인",
    color:    "border-[#F9A825]",
    btnColor: "bg-[#F9A825] hover:bg-[#F57F17] text-[#1B4332]",
    gumroadUrl: "https://ssamtool.gumroad.com/l/semester",
  },
];

// 기능별 분필 소모 안내
const CHALK_USAGE = [
  { icon: "🪪", label: "이름표 PDF (반 전체)",  cost: 2 },
  { icon: "🪑", label: "자리 배치 PDF",        cost: 1 },
  { icon: "🎤", label: "말하기 시험 순서 PDF",  cost: 1 },
  { icon: "👥", label: "모둠 나누기 PDF",       cost: 1 },
  { icon: "📡", label: "QR 출석 세션 생성",     cost: 1 },
  { icon: "💾", label: "QR 출석 결과 저장",     cost: 1 },
  { icon: "❓", label: "익명 질문함 세션",       cost: 1 },
];

export default function ShopPage() {
  const { user, chalk } = useAuth();
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  const handlePurchase = (plan: typeof PLANS[0]) => {
    // Gumroad 연결 시 아래 주석 해제
    // window.open(plan.gumroadUrl, "_blank");

    // MVP: 준비 중 안내
    alert(`결제 기능 준비 중이에요!\n\n${plan.name} (${plan.chalk}분필 / ${plan.price.toLocaleString()}원)\n\n곧 Gumroad를 통해 결제하실 수 있어요.`);
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* 헤더 */}
      <header className="chalk-header">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#F2C94C] flex items-center justify-center text-[#1B4332] font-black text-lg">쌤</div>
            <div>
              <h1 className="chalk-text text-xl font-bold leading-tight">쌤툴</h1>
              <p className="text-[#A8D5B7] text-xs">분필 충전</p>
            </div>
          </Link>
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2D6A4F]">
              <span className="chalk-badge text-xs px-2 py-0.5">✏️ {chalk}</span>
              <span className="text-[#A8D5B7] text-sm">보유 중</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* 로그인 안내 */}
        {!user && (
          <div className="bg-[#FFF8E1] border border-[#F9A825] rounded-xl px-5 py-4 text-center">
            <p className="text-sm font-semibold text-[#7B5800]">
              분필 충전은 로그인 후 이용할 수 있어요.
            </p>
            <Link href="/" className="mt-2 inline-block text-xs text-[#1B4332] underline underline-offset-2">
              홈으로 돌아가 로그인하기
            </Link>
          </div>
        )}

        {/* 타이틀 */}
        <div className="text-center">
          <h2 className="text-3xl font-black text-[#1B4332]">✏️ 분필 충전</h2>
          <p className="text-[#4A4A4A] mt-2 text-sm">
            분필로 PDF 저장, QR 출석, 익명 질문함 등 프리미엄 기능을 사용해요
          </p>
        </div>

        {/* 요금제 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
              className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col gap-4 transition-all ${plan.color} ${
                hoveredPlan === plan.id ? "shadow-lg -translate-y-1" : "shadow-sm"
              }`}
            >
              {/* 뱃지 */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#1B4332] text-white text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* 플랜 정보 */}
              <div className="text-center pt-2">
                <p className="text-lg font-black text-[#1B4332]">{plan.name}</p>
                <div className="mt-2 flex items-end justify-center gap-1">
                  <span className="text-4xl font-black text-[#1B4332]">{plan.chalk}</span>
                  <span className="text-lg text-[#4A4A4A] mb-1">분필</span>
                </div>
                <p className="text-2xl font-bold text-[#4A4A4A] mt-1">
                  {plan.price.toLocaleString()}원
                </p>
                <p className="text-xs text-[#9A9A9A] mt-1">
                  분필당 {Math.round(plan.price / plan.chalk)}원
                </p>
              </div>

              {/* 구매 버튼 */}
              <button
                onClick={() => handlePurchase(plan)}
                disabled={!user}
                className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${plan.btnColor}`}
              >
                구매하기
              </button>
            </div>
          ))}
        </div>

        {/* 분필 소모 안내 */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-sm">
          <h3 className="font-bold text-[#1B4332] mb-4">분필 소모 안내</h3>
          <div className="space-y-2">
            {CHALK_USAGE.map(({ icon, label, cost }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-[#F0F0F0] last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm text-[#2D2D2D]">{label}</span>
                </div>
                <span className="text-sm font-bold text-[#1B4332]">✏️ {cost}개</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#9A9A9A] mt-4">
            · 랜덤 뽑기, 수업 타이머, 반 데이터 저장(1개)은 무료예요
          </p>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-[#1B4332]">자주 묻는 질문</h3>
          {[
            {
              q: "분필은 언제 만료되나요?",
              a: "직접 구매한 분필은 영구적으로 사용할 수 있어요. 이벤트로 받은 분필만 만료일이 있어요.",
            },
            {
              q: "환불이 가능한가요?",
              a: "결제 후 7일 이내, 분필을 사용하지 않은 경우 전액 환불 가능해요. ot.helper7@gmail.com으로 문의해 주세요.",
            },
            {
              q: "결제 수단은 무엇인가요?",
              a: "현재 Gumroad를 통해 신용카드 결제를 지원해요. 추후 국내 결제(페이플)를 추가할 예정이에요.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-[#F0F0F0] pb-4 last:border-0 last:pb-0">
              <p className="font-semibold text-sm text-[#2D2D2D]">{q}</p>
              <p className="text-sm text-[#4A4A4A] mt-1 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        {/* 문의 */}
        <p className="text-center text-xs text-[#9A9A9A]">
          결제 관련 문의:{" "}
          <a href="mailto:ot.helper7@gmail.com" className="text-[#1B4332] underline underline-offset-2">
            ot.helper7@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}