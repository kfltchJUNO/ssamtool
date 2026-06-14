"use client";

import { useEffect, useState } from "react";
import { getChalkLogs, fmtDateTime, type ChalkLog } from "@/lib/admin";

export default function ChalkLogsPage() {
  const [logs,    setLogs]    = useState<ChalkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  const load = async () => {
    setLoading(true);
    try { setLogs(await getChalkLogs(200)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l =>
    !search ||
    l.email?.includes(search) ||
    l.displayName?.includes(search) ||
    l.reason?.includes(search)
  );

  const totalGranted = logs.filter(l => l.type === "grant").reduce((s, l) => s + l.amount, 0);

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black text-[#1B4332]">분필 로그</h1>
        <p className="text-sm text-[#9A9A9A] mt-1">
          총 {logs.length}건 · 누적 지급 {totalGranted}개
        </p>
      </div>

      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="이메일, 이름, 사유로 검색"
          className="flex-1 border border-[#E8E0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B4332] bg-white shadow-sm" />
        <button onClick={load}
          className="px-4 py-2.5 border border-[#E8E0D0] rounded-xl text-sm text-[#4A4A4A] bg-white hover:border-[#1B4332] transition-colors shadow-sm">
          ↺ 새로고침
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#E8E0D0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E0D0] bg-[#F9F9F9]">
                {["일시","유저","구분","수량","만료일","사유","관리자"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4A4A4A] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {loading ? (
                Array.from({length:6}).map((_,i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3">
                    <div className="h-4 bg-[#F0F0F0] rounded animate-pulse" />
                  </td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#9A9A9A]">로그가 없어요</td></tr>
              ) : filtered.map(log => (
                <tr key={log.id} className="hover:bg-[#F9F9F9] transition-colors">
                  <td className="px-4 py-3 text-xs text-[#9A9A9A] whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#1B4332] text-xs">{log.displayName || "—"}</p>
                    <p className="text-[11px] text-[#9A9A9A]">{log.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      log.type === "grant" ? "bg-[#F0FFF4] text-[#1B4332]" : "bg-[#FFF5F5] text-red-600"
                    }`}>
                      {log.type === "grant" ? "지급" : "차감"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-center">
                    <span className={log.type === "grant" ? "text-[#1B4332]" : "text-red-500"}>
                      {log.type === "grant" ? "+" : "-"}{log.amount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9A9A9A] whitespace-nowrap">
                    {log.expiresAt ? log.expiresAt.toDate().toLocaleDateString("ko-KR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#4A4A4A]">{log.reason || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#9A9A9A]">{log.adminEmail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}