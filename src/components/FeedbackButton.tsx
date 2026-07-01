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

      {/* 피드백 패널 — 헤더 아래 드롭다운 */}
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-[#E8E0D0] overflow-hidden">
          <div className="chalk-header px-4 py-3">
            <h3 className="chalk-text font-bold text-sm">피드백 보내기</h3>
            <p className="text-[#A8D5B7] text-[11px] mt-0.5">의견을 남겨주시면 빠르게 반영할게요</p>
          </div>

          {done ? (
            <div className="px-4 py-8 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-bold text-[#1B4332]">감사합니다!</p>
              <p className="text-sm text-[#4A4A4A] mt-1">소중한 의견 잘 받았어요</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                {CATEGORIES.map(({ id, icon, label }) => (
                  <button key={id} onClick={() => setCategory(id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                      category === id
                        ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332]"
                        : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"
                    }`}>
                    <span className="text-lg">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={
                  category === "bug"     ? "어떤 오류가 발생했나요?" :
                  category === "feature" ? "어떤 기능이 있으면 좋을까요?" :
                                          "무엇이 궁금하신가요?"
                }
                rows={4}
                className="w-full border border-[#E8E0D0] rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#1B4332]"
              />

              <button
                onClick={handleSubmit}
                disabled={busy || !content.trim()}
                className="w-full py-2.5 bg-[#1B4332] text-white font-bold rounded-xl hover:bg-[#2D6A4F] disabled:opacity-40 transition-colors text-sm"
              >
                {busy ? "보내는 중..." : "보내기"}
              </button>
            </div>
          )}
        </div>
      )}

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </>
  );
}