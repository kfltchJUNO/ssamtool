"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStats, fmtDateTime, type ChalkLog } from "@/lib/admin";

interface Stats {
  totalUsers:        number;
  todayLogins:       number;
  pendingFeedbacks:  number;
  totalChalkGranted: number;
  recentLogs:        ChalkLog[];
}

const STAT_CARDS: { key: keyof Omit<Stats,"recentLogs">; label: string; icon: string; color: string }[] = [
  { key: "totalUsers",        label: "총 가입자",     icon: "👤", color: "bg-[#E8F5E9] text-[#1B4332]" },
  { key: "todayLogins",       label: "오늘 로그인",   icon: "🟢", color: "bg-[#E3F2FD] text-[#1565C0]" },
  { key: "pendingFeedbacks",  label: "미처리 피드백", icon: "💬", color: "bg-[#FFF8E1] text-[#F9A825]" },
  { key: "totalChalkGranted", label: "총 분필 지급",  icon: "✏️", color: "bg-[#F3E5F5] text-[#6A1B9A]" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black text-[#1B4332]">대시보드</h1>
        <p className="text-sm text-[#9A9A9A] mt-1">쌤툴 운영 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-xl mb-3 ${card.color}`}>
              {card.icon}
            </div>
            <p className="text-xs text-[#9A9A9A] font-medium">{card.label}</p>
            <p className="text-3xl font-black text-[#1B4332] mt-1">
              {loading ? "—" : String(stats?.[card.key] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      {/* 바로가기 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/admin/users",      icon: "👤", label: "유저 관리",   desc: "분필 지급 · 유저 검색" },
          { href: "/admin/feedbacks",  icon: "💬", label: "피드백 관리", desc: "오류신고 · 문의 처리" },
          { href: "/admin/chalk-logs", icon: "✏️", label: "분필 로그",   desc: "지급 이력 확인" },
        ].map(({ href, icon, label, desc }) => (
          <Link key={href} href={href}
            className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm hover:border-[#1B4332] hover:shadow-md transition-all group">
            <div className="text-3xl mb-3">{icon}</div>
            <p className="font-bold text-[#1B4332] group-hover:underline">{label}</p>
            <p className="text-xs text-[#9A9A9A] mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      {/* 최근 분필 지급 */}
      {!loading && stats && stats.recentLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E0D0] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8E0D0] flex items-center justify-between">
            <h2 className="font-bold text-[#1B4332]">최근 분필 지급</h2>
            <Link href="/admin/chalk-logs" className="text-xs text-[#2D6A4F] underline underline-offset-2">전체 보기</Link>
          </div>
          <div className="divide-y divide-[#E8E0D0]">
            {stats.recentLogs.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-center gap-3">
                <span className="text-lg">{log.type === "grant" ? "✏️" : "➖"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2D2D2D] truncate">
                    {log.displayName || log.email}
                  </p>
                  <p className="text-xs text-[#9A9A9A]">{log.reason}</p>
                </div>
                <span className={`text-sm font-bold ${log.type === "grant" ? "text-[#1B4332]" : "text-red-500"}`}>
                  {log.type === "grant" ? "+" : "-"}{log.amount}
                </span>
                <span className="text-xs text-[#9A9A9A] whitespace-nowrap">{fmtDateTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}