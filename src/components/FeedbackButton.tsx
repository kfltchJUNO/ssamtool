"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

type Category = "bug" | "feature" | "inquiry";

const CATEGORIES: { id: Category; icon: string; label: string }[] = [
  { id: "bug",     icon: "🐛", label: "오류 신고" },
  { id: "feature", icon: "💡", label: "기능 제안" },
  { id: "inquiry", icon: "❓", label: "문의하기" },
];

export default function FeedbackButton() {
  const { user } = useAuth();
  const [open,     setOpen]     = useState(false);
  const [category, setCategory] = useState<Category>("bug");
  const [content,  setContent]  = useState("");
  const [busy,     setBusy]     = useState(false);
  const [done,     setDone]     = useState(false);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "ssamtoolFeedbacks"), {
        uid:      user.uid,
        email:    user.email,
        category,
        content:  content.trim(),
        status:   "pending",
        createdAt: serverTimestamp(),
      });
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setOpen(false);
        setContent("");
        setCategory("bug");
      }, 2000);
    } catch (e) {
      console.error(e);
    } finally { setBusy(false); }
  };

  return (
    <>
      {/* 헤더 인라인 버튼 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2D6A4F] hover:bg-[#3D7A5F] text-[#F5F0E8] text-xs font-medium transition-colors"
        title="피드백 보내기"
      >
        <span>💬</span>
        <span className="hidden sm:inline">피드백</span>
      </button>

      {/* 피드백 모달 (fixed inset-0 z-50 으로 중앙 팝업) */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E8E0D0] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="chalk-header px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="chalk-text font-bold text-base">💬 피드백 보내기</h3>
                <p className="text-[#A8D5B7] text-xs mt-0.5">선생님의 의견을 남겨주시면 빠르게 반영할게요</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-[#A8D5B7] hover:text-white text-lg font-bold w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {done ? (
              <div className="px-6 py-10 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="font-bold text-lg text-[#1B4332]">소중한 의견 감사합니다!</p>
                <p className="text-sm text-[#4A4A4A] mt-1.5">선생님의 피드백을 신속히 검토하여 반영하겠습니다.</p>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  {CATEGORIES.map(({ id, icon, label }) => (
                    <button
                      key={id}
                      onClick={() => setCategory(id)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                        category === id
                          ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332] shadow-sm"
                          : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"
                      }`}
                    >
                      <span className="text-xl">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={
                    category === "bug"     ? "어떤 오류가 발생했나요? 상세히 알려주시면 빠르게 수정할게요." :
                    category === "feature" ? "어떤 기능이 있으면 수업에 도움이 될까요?" :
                                            "궁금하신 점이나 전하고 싶은 말씀을 남겨주세요."
                  }
                  rows={5}
                  className="w-full border border-[#E8E0D0] rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 border border-[#E8E0D0] text-[#4A4A4A] font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                  >
                    닫기
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={busy || !content.trim()}
                    className="flex-1 py-2.5 bg-[#1B4332] text-white font-bold rounded-xl hover:bg-[#2D6A4F] disabled:opacity-40 transition-colors text-sm shadow-md"
                  >
                    {busy ? "보내는 중..." : "피드백 전송"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}