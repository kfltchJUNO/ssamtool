"use client";

import { useEffect, useState } from "react";
import { getFeedbacks, updateFeedbackStatus, fmtDateTime, type Feedback } from "@/lib/admin";

const CATEGORY_LABEL: Record<string, string> = {
  bug:     "🐛 오류신고",
  feature: "💡 기능제안",
  inquiry: "❓ 문의",
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:  { label: "미처리", color: "bg-[#FFF8E1] text-[#F9A825]" },
  read:     { label: "확인중", color: "bg-[#E3F2FD] text-[#1565C0]" },
  resolved: { label: "처리완료", color: "bg-[#E8F5E9] text-[#1B4332]" },
};

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<string>("all");
  const [expanded,  setExpanded]  = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getFeedbacks(filter === "all" ? undefined : filter);
      setFeedbacks(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]); // eslint-disable-line

  const changeStatus = async (id: string, status: "pending" | "read" | "resolved") => {
    await updateFeedbackStatus(id, status);
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
  };

  const counts = {
    all:      feedbacks.length,
    pending:  feedbacks.filter(f => f.status === "pending").length,
    read:     feedbacks.filter(f => f.status === "read").length,
    resolved: feedbacks.filter(f => f.status === "resolved").length,
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#1B4332]">피드백 관리</h1>
          <p className="text-sm text-[#9A9A9A] mt-1">오류신고 · 기능제안 · 문의</p>
        </div>
        <button onClick={load}
          className="px-4 py-2 border border-[#E8E0D0] rounded-xl text-sm text-[#4A4A4A] bg-white hover:border-[#1B4332] transition-colors shadow-sm">
          ↺ 새로고침
        </button>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all",      label: "전체" },
          { key: "pending",  label: "미처리" },
          { key: "read",     label: "확인중" },
          { key: "resolved", label: "처리완료" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
              filter === key
                ? "border-[#1B4332] bg-[#1B4332] text-white"
                : "border-[#E8E0D0] bg-white text-[#4A4A4A] hover:border-[#1B4332]"
            }`}>
            {label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filter === key ? "bg-white/20 text-white" : "bg-[#F0F0F0] text-[#666]"}`}>
              {counts[key as keyof typeof counts] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="space-y-3">
        {loading ? (
          Array.from({length: 4}).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E8E0D0] p-4 animate-pulse">
              <div className="h-4 bg-[#F0F0F0] rounded w-1/3 mb-2" />
              <div className="h-3 bg-[#F0F0F0] rounded w-full" />
            </div>
          ))
        ) : feedbacks.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E8E0D0] p-10 text-center text-[#9A9A9A]">
            <p className="text-3xl mb-2">💬</p>
            <p>피드백이 없어요</p>
          </div>
        ) : feedbacks.map(fb => {
          const isExpanded = expanded === fb.id;
          const st = STATUS_LABEL[fb.status];
          return (
            <div key={fb.id}
              className="bg-white rounded-xl border border-[#E8E0D0] shadow-sm overflow-hidden hover:border-[#1B4332] transition-colors">
              {/* 헤더 행 */}
              <div
                className="px-5 py-4 flex items-center gap-3 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : fb.id)}
              >
                <span className="text-sm font-semibold text-[#4A4A4A] whitespace-nowrap">
                  {CATEGORY_LABEL[fb.category] ?? fb.category}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#2D2D2D] truncate">{fb.content}</p>
                  <p className="text-xs text-[#9A9A9A] mt-0.5">{fb.email} · {fmtDateTime(fb.createdAt)}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${st.color}`}>
                  {st.label}
                </span>
                <span className="text-[#CCC] text-sm">{isExpanded ? "▲" : "▼"}</span>
              </div>

              {/* 확장 영역 */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-[#F0F0F0] pt-4 space-y-4">
                  {/* 전체 내용 */}
                  <div className="bg-[#F9F9F9] rounded-xl p-4 text-sm text-[#2D2D2D] whitespace-pre-wrap leading-relaxed">
                    {fb.content}
                  </div>

                  {/* 상태 변경 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[#4A4A4A]">상태 변경:</span>
                    {(["pending","read","resolved"] as const).map(s => (
                      <button key={s} onClick={() => changeStatus(fb.id, s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                          fb.status === s
                            ? "border-[#1B4332] bg-[#1B4332] text-white"
                            : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"
                        }`}>
                        {STATUS_LABEL[s].label}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs text-[#9A9A9A] space-y-0.5">
                    <p>UID: {fb.uid}</p>
                    <p>이메일: {fb.email}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}