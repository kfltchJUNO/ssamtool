"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { executePrint } from "@/lib/print";

interface WordItem {
  word: string;
  reading: string;
  meaning: string;
  example: string;
}

interface CrosswordClue {
  word: string;
  clue: string;
}

interface WorksheetData {
  title: string;
  wordlist: WordItem[];
  crosswordClues: CrosswordClue[];
}

export default function WorksheetGenerator() {
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [wordsInput, setWordsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [worksheet, setWorksheet] = useState<WorksheetData | null>(null);

  const handleGenerate = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const wordsArr = wordsInput.split(/[\n,]/).map(s => s.trim()).filter(Boolean);

      const res = await fetch("/api/worksheet/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ topic, words: wordsArr }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "생성 실패");
      }
      setWorksheet(data.worksheet);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "워크시트 생성 오류";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!worksheet) return;
    const bodyHTML = `
      <div style="font-size:18px; font-weight:bold; color:#1B4332; margin-bottom:12px; border-b:2px solid #1B4332; pb:6px;">
        📝 ${worksheet.title}
      </div>
      <div style="margin-bottom:20px;">
        <h3 style="font-size:14px; font-weight:bold; color:#334155; margin-bottom:8px;">📚 단어 학습장</h3>
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead>
            <tr style="background:#F1F5F9; text-align:left;">
              <th style="border:1px solid #CBD5E1; padding:6px;">단어</th>
              <th style="border:1px solid #CBD5E1; padding:6px;">뜻풀이</th>
              <th style="border:1px solid #CBD5E1; padding:6px;">예문</th>
            </tr>
          </thead>
          <tbody>
            ${worksheet.wordlist.map(w => `
              <tr>
                <td style="border:1px solid #CBD5E1; padding:6px; font-weight:bold;">${w.word}</td>
                <td style="border:1px solid #CBD5E1; padding:6px;">${w.meaning}</td>
                <td style="border:1px solid #CBD5E1; padding:6px;">${w.example}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div>
        <h3 style="font-size:14px; font-weight:bold; color:#334155; margin-bottom:8px;">🧩 십자말풀이 힌트</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:11px;">
          ${worksheet.crosswordClues.map((c, i) => `
            <div style="border:1px solid #E2E8F0; padding:8px; border-radius:6px; background:#fafafa;">
              <span style="font-weight:bold; color:#1B4332;">${i + 1}번 힌트:</span> ${c.clue}
            </div>
          `).join("")}
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
            <span>🧩</span> TOPIK 단어장 & 십자말풀이 생성기
          </h2>
          <span className="text-xs font-bold text-[#1B4332] bg-[#F0FFF4] border border-[#9AE6B4] px-2.5 py-1 rounded-lg">
            🖍️ 3분필 소모
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">단어장 주제:</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="예: 음식 및 요리 어휘, 학교 생활 어휘"
              className="w-full border p-2 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">포함할 핵심 단어 (선택 사항, 줄바꿈 또는 쉼표):</label>
            <textarea
              value={wordsInput}
              onChange={e => setWordsInput(e.target.value)}
              placeholder="김치&#10;비빔밥&#10;숟가락&#10;젓가락"
              className="w-full h-20 border p-2 rounded-lg text-xs"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-[#1B4332] text-white font-bold rounded-xl hover:bg-[#2D6A4F] disabled:opacity-40"
          >
            {loading ? "AI 단어장 & 십자말풀이 생성 중..." : "🧩 AI 단어장 워크시트 생성하기 (🖍️ 3개)"}
          </button>
        </div>
      </div>

      {worksheet && (
        <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-[#1B4332] text-base">{worksheet.title}</h3>
            <button onClick={handlePrint} className="px-3 py-1.5 bg-[#F2C94C] text-[#1B4332] font-bold text-xs rounded-lg">
              🖨️ A4 워크시트 인쇄
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-gray-800">📚 단어 목록</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {worksheet.wordlist.map((w, i) => (
                <div key={i} className="p-3 border rounded-lg bg-[#F8FAFC]">
                  <div className="font-bold text-sm text-[#1B4332]">{w.word}</div>
                  <div className="text-gray-600 mt-1">• 뜻: {w.meaning}</div>
                  <div className="text-gray-500 italic mt-0.5">• 예문: {w.example}</div>
                </div>
              ))}
            </div>

            <h4 className="font-bold text-gray-800 pt-2">🧩 십자말풀이 힌트</h4>
            <div className="space-y-1.5">
              {worksheet.crosswordClues.map((c, i) => (
                <div key={i} className="p-2 border rounded bg-white">
                  <span className="font-bold text-[#1B4332]">{i + 1}번:</span> {c.clue}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
