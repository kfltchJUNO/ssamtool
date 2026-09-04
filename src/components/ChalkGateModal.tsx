"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";

/**
 * 분필 부족 전역 모달
 * 이벤트: document.dispatchEvent(new CustomEvent("ssamtool:insufficientChalk", {
 *   detail: { required: number, feature?: string }
 * }))
 * 로 어디서든 띄울 수 있음.
 */

interface ChalkDetail {
  required: number;
  feature?: string;
}

type DailyStatus = "loading" | "unclaimed" | "claimed" | "error";

export default function ChalkGateModal() {
  const { chalk, user } = useAuth();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ChalkDetail>({ required: 0 });
  const [dailyStatus, setDailyStatus] = useState<DailyStatus>("loading");
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");

  // 이벤트 수신
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<ChalkDetail>).detail;
      setDetail(d || { required: 0 });
      setOpen(true);
      setDailyStatus("loading");
      setClaimMsg("");
      checkDaily();
    };
    document.addEventListener("ssamtool:insufficientChalk", handler);
    return () => document.removeEventListener("ssamtool:insufficientChalk", handler);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const getToken = async () => {
    const u = auth.currentUser;
    if (!u) throw new Error("UNAUTHENTICATED");
    return u.getIdToken();
  };

  const checkDaily = useCallback(async () => {
    if (!auth.currentUser) { setDailyStatus("error"); return; }
    try {
      const token = await getToken();
      const res = await fetch("/api/chalk/daily", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDailyStatus(data.claimed ? "claimed" : "unclaimed");
    } catch {
      setDailyStatus("error");
    }
  }, []);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/chalk/daily", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setDailyStatus("claimed");
        setClaimMsg("🎉 분필 2개가 지급됐어요! 이제 다시 시도해보세요.");
        // 잠시 후 reload로 chalk 잔액 업데이트
        setTimeout(() => { window.location.reload(); }, 1500);
      } else {
        setDailyStatus("claimed");
        setClaimMsg(data.message || "오늘 이미 받으셨어요.");
      }
    } catch {
      setClaimMsg("오류가 발생했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setClaiming(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5 animate-[fadeInUp_0.2s_ease]">
        {/* 헤더 */}
        <div className="text-center">
          <div className="text-4xl mb-2">🖍️</div>
          <h2 className="text-xl font-black text-slate-900">분필이 부족해요</h2>
          <p className="text-sm text-slate-500 mt-1">
            {detail.feature
              ? `${detail.feature}에는 분필`
              : "이 기능에는 분필"}{" "}
            <span className="font-bold text-slate-800">{detail.required}개</span>가 필요해요.
          </p>
        </div>

        {/* 현재 잔액 */}
        <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
          <span className="text-sm text-slate-600">현재 분필 잔액</span>
          <span className="text-lg font-black text-slate-800">🖍️ {chalk}개</span>
        </div>

        {/* 출석 체크 유도 (오늘 미수령 시) */}
        {dailyStatus === "unclaimed" && !claimMsg && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
            <div>
              <p className="text-sm font-bold text-amber-800">🎁 오늘 무료 분필 아직 안 받으셨어요!</p>
              <p className="text-xs text-amber-600 mt-0.5">출석 체크하면 분필 2개를 무료로 드려요.</p>
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
            >
              {claiming ? "지급 중..." : "🎁 지금 출석하고 분필 2개 받기"}
            </button>
          </div>
        )}

        {/* 출석 완료 메시지 */}
        {(dailyStatus === "claimed" || claimMsg) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
            <p className="text-sm font-semibold text-emerald-700">
              {claimMsg || "✅ 오늘 출석 체크를 완료했어요. 내일 또 받을 수 있어요!"}
            </p>
          </div>
        )}

        {dailyStatus === "loading" && (
          <div className="h-10 bg-slate-100 rounded-2xl animate-pulse" />
        )}

        {/* 충전 버튼 */}
        <button
          onClick={() => { setOpen(false); router.push("/shop"); }}
          className="w-full py-3.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-sm rounded-2xl transition-colors"
        >
          🛒 분필 충전하기
        </button>

        {/* 닫기 */}
        <button
          onClick={() => setOpen(false)}
          className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
