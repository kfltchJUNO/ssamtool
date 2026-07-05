"use client";
// src/components/admin/MonetizationToggle.tsx
// 관리자 대시보드에 넣는 분필 차감 전역 스위치.
// 끄면 퀴즈 생성 등 모든 유료 기능이 분필 차감 없이 무료로 동작함.

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getMonetizationSettings, setChalkEnabled } from "@/lib/monetization";

export default function MonetizationToggle() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy,    setBusy]    = useState(false);

  useEffect(() => {
    getMonetizationSettings().then(s => setEnabled(s.chalkEnabled));
  }, []);

  const handleToggle = async () => {
    if (enabled === null || !user) return;
    setBusy(true);
    try {
      await setChalkEnabled(!enabled, user.uid);
      setEnabled(!enabled);
    } finally {
      setBusy(false);
    }
  };

  if (enabled === null) {
    return <div className="text-sm text-slate-400 animate-pulse">설정 불러오는 중...</div>;
  }

  return (
    <div className={`rounded-2xl border-2 p-5 transition-colors ${
      enabled ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-slate-800">
            {enabled ? "🟢 분필 차감 활성화됨" : "🟡 분필 차감 비활성화됨 (전체 무료)"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {enabled
              ? "퀴즈 생성 등 유료 기능에서 분필이 차감돼요."
              : "지금은 모든 기능이 분필 소모 없이 무료로 동작해요. 선생님 체험 기간에 켜두면 좋아요."}
          </p>
        </div>
        <button onClick={handleToggle} disabled={busy}
          className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
            enabled ? "bg-emerald-500" : "bg-slate-300"
          }`}>
          <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
            enabled ? "translate-x-7" : "translate-x-1"
          }`} />
        </button>
      </div>
      <p className="text-[11px] text-slate-400 mt-3">
        이 스위치는 배포 없이 즉시 반영돼요. 결제 시스템을 붙일 준비가 되면 켜세요.
      </p>
    </div>
  );
}