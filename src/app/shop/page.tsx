"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { CHALK_PACKAGES } from "@/lib/payments";

const SUBSCRIPTION_PLAN = {
  id: "pro_monthly",
  name: "월간 PRO 교사 구독",
  priceKrw: "₩7,900",
  period: "월",
  benefits: [
    "매월 50분필 자동 리필 (누적)",
    "TOPIK 십자말풀이/단어장 무제한 생성",
    "AI 지문 난이도 변환기 우선 처리",
    "공식 TOPIK 시험지 양식 HWP/PDF EXPORT",
  ],
  variantId: process.env.LEMONSQUEEZY_VARIANT_SUBSCRIPTION_MONTHLY || "sub_monthly_variant",
};

const CHALK_USAGE = [
  { icon: "🎯", label: "AI 한국어 퀴즈 생성 (10문항)", cost: 3 },
  { icon: "🔄", label: "퀴즈 개별 문항 AI 재생성", cost: 1 },
  { icon: "🧩", label: "TOPIK 단어장 & 십자말풀이 생성", cost: 3 },
  { icon: "📖", label: "AI 지문 난이도 자동 변환기", cost: 3 },
  { icon: "🪪", label: "이름표 PDF / 고화질 인쇄", cost: 0 },
  { icon: "🪑", label: "자리 배치 저장 & 인쇄", cost: 0 },
  { icon: "🔔", label: "수업용 효과음 & 칭찬 스티커판", cost: 0 },
];

export default function ShopPage() {
  const { user, chalk } = useAuth();
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [loadingPkgId, setLoadingPkgId] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    setLoadingPkgId(packageId);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "체크아웃 생성에 실패했습니다.");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert("결제 페이지 주소를 불러오지 못했습니다.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "결제 요청 중 오류가 발생했습니다.";
      alert(msg);
    } finally {
      setLoadingPkgId(null);
    }
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
              <p className="text-[#A8D5B7] text-xs">멤버십 & 분필 충전소</p>
            </div>
          </Link>
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2D6A4F]">
              <span className="chalk-badge text-xs px-2 py-0.5">🖍️ {chalk}</span>
              <span className="text-[#A8D5B7] text-sm font-bold">보유 중</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* 로그인 안내 */}
        {!user && (
          <div className="bg-[#FFF8E1] border border-[#F9A825] rounded-xl px-5 py-4 text-center">
            <p className="text-sm font-semibold text-[#7B5800]">
              결제 및 구독 서비스는 로그인 후 이용하실 수 있습니다.
            </p>
            <Link href="/" className="mt-2 inline-block text-xs text-[#1B4332] underline underline-offset-2 font-bold">
              홈으로 돌아가 로그인하기
            </Link>
          </div>
        )}

        {/* 1. 월간 PRO 정기 구독 메인 플랜 (Task 6 추가) */}
        <div className="bg-white rounded-2xl border-2 border-[#1B4332] p-6 shadow-md relative overflow-hidden space-y-4">
          <div className="bg-[#1B4332] text-[#F2C94C] text-xs font-bold px-3 py-1 rounded-br-xl absolute top-0 left-0">
            👑 추천 정기 구독
          </div>
          <div className="flex justify-between items-start pt-2 flex-wrap gap-2">
            <div>
              <h3 className="text-2xl font-black text-[#1B4332]">{SUBSCRIPTION_PLAN.name}</h3>
              <p className="text-xs text-[#64748B] mt-1">한국어 강사를 위한 프리미엄 AI 수업 생성기 무제한 라이선스</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-[#1B4332]">{SUBSCRIPTION_PLAN.priceKrw}</span>
              <span className="text-xs text-gray-500"> / {SUBSCRIPTION_PLAN.period}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#334155] pt-2 border-t">
            {SUBSCRIPTION_PLAN.benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-1.5 font-semibold">
                <span className="text-emerald-600 font-bold">✓</span> {b}
              </div>
            ))}
          </div>

          <button
            onClick={() => handlePurchase(SUBSCRIPTION_PLAN.id)}
            disabled={!user || loadingPkgId === SUBSCRIPTION_PLAN.id}
            className="w-full py-3 bg-[#1B4332] text-white font-bold text-sm rounded-xl hover:bg-[#2D6A4F] transition-all disabled:opacity-40"
          >
            {loadingPkgId === SUBSCRIPTION_PLAN.id ? "결제 중..." : "👑 월간 PRO 교사 구독 시작하기 (₩7,900/월)"}
          </button>
        </div>

        {/* 2. 소모성 분필 충전 팩 카드 목록 */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#1B4332]">🖍️ 필요할 때만 쓰는 소모성 분필 팩</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CHALK_PACKAGES.map(pkg => (
              <div
                key={pkg.id}
                onMouseEnter={() => setHoveredPlan(pkg.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                className={`relative bg-white rounded-2xl border-2 p-5 flex flex-col justify-between transition-all border-[#E8E0D0] ${
                  hoveredPlan === pkg.id ? "shadow-lg -translate-y-1" : "shadow-sm"
                }`}
              >
                <div className="text-center pt-2">
                  <p className="text-base font-black text-[#1B4332]">{pkg.name}</p>
                  <div className="mt-2 flex items-end justify-center gap-1">
                    <span className="text-3xl font-black text-[#1B4332]">{pkg.chalkAmount}</span>
                    <span className="text-sm text-[#4A4A4A] mb-1">개</span>
                  </div>
                  <p className="text-lg font-bold text-[#4A4A4A] mt-1">
                    ${pkg.priceUsd} USD
                  </p>
                </div>

                <button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={!user || loadingPkgId === pkg.id}
                  className="w-full mt-4 py-2.5 rounded-xl bg-[#475569] text-white font-bold text-xs hover:bg-[#334155] transition-all disabled:opacity-40"
                >
                  {loadingPkgId === pkg.id ? "이동 중..." : "충전하기"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 분필 소모 및 혜택 안내 */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-sm">
          <h3 className="font-bold text-[#1B4332] mb-4">기능별 분필 소모 안내</h3>
          <div className="space-y-2">
            {CHALK_USAGE.map(({ icon, label, cost }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-[#F0F0F0] last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm text-[#2D2D2D]">{label}</span>
                </div>
                <span className="text-sm font-bold text-[#1B4332]">
                  {cost > 0 ? `🖍️ ${cost}개` : "FREE (무료)"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 결제 FAQ */}
        <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-[#1B4332] text-sm">자주 묻는 질문 (결제/구독)</h3>
          <div className="border-b pb-3">
            <p className="font-bold text-[#2D2D2D]">Q. 사업자가 아닌 개인 교사도 결제가 가능한가요?</p>
            <p className="text-[#4A4A4A] mt-1">네! Lemon Squeezy 글로벌 대행 시스템을 통해 개인이 신용카드/카카오페이/Apple Pay로 즉시 안전하게 결제하실 수 있습니다.</p>
          </div>
          <div className="border-b pb-3">
            <p className="font-bold text-[#2D2D2D]">Q. 정기 구독 해지는 자유로운가요?</p>
            <p className="text-[#4A4A4A] mt-1">마이페이지 또는 결제 영수증 이메일의 Customer Portal 링크를 통해 언제든지 클릭 한 번으로 구독을 해지하실 수 있습니다.</p>
          </div>
        </div>

      </div>
    </div>
  );
}