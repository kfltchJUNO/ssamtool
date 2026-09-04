"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { executePrint } from "@/lib/print";

interface KeyVocab {
  word: string;
  meaning: string;
}

interface AdaptResult {
  targetLevel: string;
  adaptedText: string;
  keyVocabulary: KeyVocab[];
  grammarNotes: string;
}

export default function TextAdapter() {
  const { user } = useAuth();
  const [originalText, setOriginalText] = useState("");
  const [targetLevel, setTargetLevel] = useState("초급 (TOPIK 1-2급)");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdaptResult | null>(null);

  const handleAdapt = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!originalText.trim()) {
      alert("원문 지문을 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/text-adapt/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ originalText, targetLevel }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "지문 변환 실패");
      }
      setResult(data.result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "지문 변환 오류";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!result) return;
    const bodyHTML = `
      <div style="font-size:18px; font-weight:bold; color:#1B4332; margin-bottom:12px; border-b:2px solid #1B4332; pb:6px;">
        📖 AI 한국어 읽기 지문 (${result.targetLevel})
      </div>
      <div style="font-size:12px; line-height:1.8; color:#1E293B; margin-bottom:20px; padding:12px; border:1px solid #CBD5E1; border-radius:8px; background:#fafafa;">
        ${result.adaptedText.replace(/\n/g, "<br/>")}
      </div>

      <div style="margin-bottom:16px;">
        <h4 style="font-size:13px; font-weight:bold; color:#334155; margin-bottom:6px;">📚 핵심 단어표</h4>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:11px;">
          ${result.keyVocabulary.map(v => `
            <div style="border:1px solid #E2E8F0; padding:6px; border-radius:4px;">
              <span style="font-weight:bold; color:#1B4332;">${v.word}:</span> ${v.meaning}
            </div>
          `).join("")}
        </div>
      </div>

      <div>
        <h4 style="font-size:13px; font-weight:bold; color:#334155; margin-bottom:6px;">💡 학습 포인트</h4>
        <div style="font-size:11px; color:#475569; padding:8px; border:1px solid #E2E8F0; border-radius:6px;">
          ${result.grammarNotes}
        </div>
      </div>
    `;
    executePrint(bodyHTML, { paperSize: "A4", orientation: "portrait" });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[#1B4332] text-lg flex items-center gap-2">
            <span>📖</span> AI 지문 난이도 자동 변환기
          </h2>
          <span className="text-xs font-bold text-[#1B4332] bg-[#F0FFF4] border border-[#9AE6B4] px-2.5 py-1 rounded-lg">
            🖍️ 3분필 소모
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">목표 난이도 수준:</label>
            <select
              value={targetLevel}
              onChange={e => setTargetLevel(e.target.value)}
              className="w-full border p-2 rounded-lg text-xs"
            >
              <option value="초급 (TOPIK 1-2급)">초급 (TOPIK 1-2급 - 쉬운 어휘/짧은 문장)</option>
              <option value="중급 (TOPIK 3-4급)">중급 (TOPIK 3-4급 - 일상 주제/연결어미)</option>
              <option value="고급 (TOPIK 5-6급)">고급 (TOPIK 5-6급 - 시사/추상적 주제)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">원문 지문 (뉴스, 수필, 설명문 등):</label>
            <textarea
              value={originalText}
              onChange={e => setOriginalText(e.target.value)}
              placeholder="변환하고 싶은 원문 한국어 지문을 붙여넣으세요..."
              className="w-full h-32 border p-3 rounded-lg text-xs"
            />
          </div>

          <button
            onClick={handleAdapt}
            disabled={loading}
            className="w-full py-3 bg-[#1B4332] text-white font-bold rounded-xl hover:bg-[#2D6A4F] disabled:opacity-40"
          >
            {loading ? "AI가 지문을 변환하고 있습니다..." : `📖 ${targetLevel} 수준으로 지문 재작성하기 (🖍️ 3개)`}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-[#1B4332] text-base">
              ✨ {result.targetLevel} 수준 변환 지문
            </h3>
            <button onClick={handlePrint} className="px-3 py-1.5 bg-[#F2C94C] text-[#1B4332] font-bold text-xs rounded-lg">
              🖨️ A4 읽기 지문 인쇄
            </button>
          </div>

          <div className="p-4 bg-[#F8FAFC] border rounded-xl font-medium text-xs leading-relaxed text-[#1E293B] whitespace-pre-wrap">
            {result.adaptedText}
          </div>

          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-gray-800">📚 주요 어휘 목록</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.keyVocabulary.map((v, i) => (
                <div key={i} className="p-2.5 border rounded bg-white">
                  <span className="font-bold text-[#1B4332]">{v.word}:</span> {v.meaning}
                </div>
              ))}
            </div>

            <h4 className="font-bold text-gray-800 pt-2">💡 문법 포인트</h4>
            <div className="p-3 border rounded bg-[#FFFBEB] text-[#92400E]">
              {result.grammarNotes}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
