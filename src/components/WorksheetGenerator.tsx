"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { executePrint } from "@/lib/print";
import { generateCrosswordGrid, CrosswordGridResult } from "@/lib/crossword";
import { Sparkles, Printer, Eye, EyeOff, RotateCcw, AlertCircle, Loader2 } from "lucide-react";

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
  const [showAnswers, setShowAnswers] = useState(false);
  const [gridSeed, setGridSeed] = useState(0); // 격자 다시 배치용 시드

  // AI가 생성한 단어/힌트 목록을 바탕으로 가로세로 낱말퍼즐 격자 계산
  const crosswordData: CrosswordGridResult | null = useMemo(() => {
    if (!worksheet?.crosswordClues?.length) return null;
    return generateCrosswordGrid(worksheet.crosswordClues, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worksheet, gridSeed]);

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
      setGridSeed(prev => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "워크시트 생성 오류";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // 🖨️ A4 인쇄 (1페이지: 가로세로 퍼즐 문제지, 2페이지: 단어장 및 정답지)
  const handlePrint = () => {
    if (!worksheet || !crosswordData) return;

    // 문제지 격자 HTML
    const puzzleGridHTML = `
      <div style="display:inline-block; border:2px solid #000; background:#000;">
        ${crosswordData.grid.map(row => `
          <div style="display:flex;">
            ${row.map(cell => {
              if (!cell) {
                return `<div style="width:34px; height:34px; background:#1e293b;"></div>`;
              }
              return `
                <div style="width:34px; height:34px; background:#fff; border:1px solid #cbd5e1; position:relative; display:flex; align-items:center; justify-content:center;">
                  ${cell.num ? `<span style="position:absolute; top:1px; left:2px; font-size:9px; font-weight:bold; color:#0f172a; line-height:1;">${cell.num}</span>` : ""}
                </div>
              `;
            }).join("")}
          </div>
        `).join("")}
      </div>
    `;

    // 정답지 격자 HTML
    const answerGridHTML = `
      <div style="display:inline-block; border:2px solid #000; background:#000;">
        ${crosswordData.grid.map(row => `
          <div style="display:flex;">
            ${row.map(cell => {
              if (!cell) {
                return `<div style="width:28px; height:28px; background:#1e293b;"></div>`;
              }
              return `
                <div style="width:28px; height:28px; background:#fff; border:1px solid #cbd5e1; position:relative; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:13px; color:#1e293b;">
                  ${cell.num ? `<span style="position:absolute; top:1px; left:2px; font-size:8px; font-weight:bold; color:#64748b; line-height:1;">${cell.num}</span>` : ""}
                  ${cell.char}
                </div>
              `;
            }).join("")}
          </div>
        `).join("")}
      </div>
    `;

    const bodyHTML = `
      <!-- [1페이지] 가로세로 낱말퍼즐 문제지 -->
      <div class="page-break" style="min-height:98vh; display:flex; flex-direction:column;">
        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #1B4332; padding-bottom:8px; margin-bottom:16px;">
          <div>
            <h1 style="font-size:20px; font-weight:bold; color:#1B4332; margin:0 0 4px;">🧩 ${worksheet.title}</h1>
            <p style="font-size:12px; color:#64748b; margin:0;">가로열쇠와 세로열쇠의 힌트를 읽고 빈칸을 채워보세요!</p>
          </div>
          <div style="display:flex; gap:16px; font-size:12px; color:#334155;">
            <span>반: ________</span>
            <span>이름: ________</span>
          </div>
        </div>

        <div style="display:flex; justify-content:center; margin:14px 0 20px;">
          ${puzzleGridHTML}
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:auto;">
          <!-- 가로 열쇠 -->
          <div style="border:1px solid #cbd5e1; border-radius:8px; padding:12px; background:#f8fafc;">
            <h3 style="font-size:13px; font-weight:bold; color:#1B4332; margin:0 0 8px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">
              ➡️ 가로 열쇠
            </h3>
            <div style="font-size:11px; line-height:1.6; color:#334155;">
              ${crosswordData.acrossClues.map(c => `
                <div style="margin-bottom:6px;">
                  <b style="color:#0f172a;">${c.num}번:</b> ${c.clue} <span style="color:#94a3b8;">(${c.word.length}글자)</span>
                </div>
              `).join("")}
            </div>
          </div>

          <!-- 세로 열쇠 -->
          <div style="border:1px solid #cbd5e1; border-radius:8px; padding:12px; background:#f8fafc;">
            <h3 style="font-size:13px; font-weight:bold; color:#1B4332; margin:0 0 8px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">
              ⬇️ 세로 열쇠
            </h3>
            <div style="font-size:11px; line-height:1.6; color:#334155;">
              ${crosswordData.downClues.map(c => `
                <div style="margin-bottom:6px;">
                  <b style="color:#0f172a;">${c.num}번:</b> ${c.clue} <span style="color:#94a3b8;">(${c.word.length}글자)</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </div>

      <!-- [2페이지] 어휘 학습장 & 퍼즐 정답지 -->
      <div style="padding-top:10px;">
        <div style="border-bottom:2px solid #1B4332; padding-bottom:8px; margin-bottom:16px;">
          <h2 style="font-size:18px; font-weight:bold; color:#1B4332; margin:0 0 4px;">📚 ${worksheet.title} - 어휘장 & 정답</h2>
          <p style="font-size:12px; color:#64748b; margin:0;">수업 후 복습용 단어 학습장 및 퍼즐 정답입니다.</p>
        </div>

        <div style="margin-bottom:20px;">
          <h3 style="font-size:13px; font-weight:bold; color:#334155; margin-bottom:8px;">📖 핵심 어휘 정리</h3>
          <table style="width:100%; border-collapse:collapse; font-size:11px;">
            <thead>
              <tr style="background:#F1F5F9; text-align:left;">
                <th style="border:1px solid #CBD5E1; padding:6px; width:22%;">단어</th>
                <th style="border:1px solid #CBD5E1; padding:6px; width:38%;">뜻풀이</th>
                <th style="border:1px solid #CBD5E1; padding:6px;">예문</th>
              </tr>
            </thead>
            <tbody>
              ${worksheet.wordlist.map(w => `
                <tr>
                  <td style="border:1px solid #CBD5E1; padding:6px; font-weight:bold; color:#1B4332;">${w.word}</td>
                  <td style="border:1px solid #CBD5E1; padding:6px;">${w.meaning}</td>
                  <td style="border:1px solid #CBD5E1; padding:6px; color:#475569;">${w.example}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div>
          <h3 style="font-size:13px; font-weight:bold; color:#334155; margin-bottom:8px;">🔍 가로세로 퍼즐 정답판</h3>
          <div style="display:flex; gap:20px; align-items:flex-start;">
            ${answerGridHTML}
            <div style="flex:1; font-size:11px; line-height:1.6; color:#475569; background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0;">
              <b style="color:#0f172a; display:block; margin-bottom:4px;">[정답 목록]</b>
              <div><b>가로:</b> ${crosswordData.acrossClues.map(c => `${c.num}.${c.word}`).join(" / ")}</div>
              <div style="margin-top:4px;"><b>세로:</b> ${crosswordData.downClues.map(c => `${c.num}.${c.word}`).join(" / ")}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    executePrint(bodyHTML, { paperSize: "A4", orientation: "portrait", marginMm: 12 });
  };

  return (
    <div className="space-y-6">
      {/* 생성 폼 */}
      <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-[#1B4332] text-lg flex items-center gap-2">
              <span className="text-xl">🧩</span> 가로세로 낱말퍼즐 & 단어장 생성기
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              주제를 입력하면 AI가 연관 어휘를 추출하여 교차하는 가로세로 퍼즐과 인쇄용 학습지를 제작합니다.
            </p>
          </div>
          <span className="text-xs font-bold text-[#1B4332] bg-[#F0FFF4] border border-[#9AE6B4] px-3 py-1.5 rounded-xl">
            🖍️ 3분필 소모
          </span>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">단어장 & 퍼즐 주제:</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="예: 음식 및 요리 어휘, 한국의 사계절과 날씨, 병원과 약국, 학교 생활..."
              className="w-full border border-slate-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 ring-emerald-400 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              포함할 핵심 단어 <span className="font-normal text-slate-400">(선택 사항, 줄바꿈 또는 쉼표)</span>:
            </label>
            <textarea
              value={wordsInput}
              onChange={e => setWordsInput(e.target.value)}
              placeholder="김치&#10;비빔밥&#10;불고기&#10;된장찌개"
              className="w-full h-20 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:ring-2 ring-emerald-400 bg-slate-50/50 resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 bg-[#1B4332] text-white font-bold text-sm rounded-xl hover:bg-[#2D6A4F] disabled:opacity-40 shadow transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "AI가 가로세로 퍼즐을 제작하고 있어요..." : "🧩 가로세로 퍼즐 & 단어장 생성하기 (🖍️ 3개)"}
          </button>
        </div>
      </div>

      {/* 결과 화면 */}
      {worksheet && crosswordData && (
        <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-[#1B4332] text-lg">{worksheet.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                가로세로 {crosswordData.rows}×{crosswordData.cols} 격자 · 단어 {crosswordData.placedWords.length}개 교차 배치됨
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGridSeed(s => s + 1)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition"
                title="단어들의 가로세로 교차 배치를 다시 섞습니다"
              >
                <RotateCcw size={13} /> 격자 재배치
              </button>
              <button
                onClick={() => setShowAnswers(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition"
              >
                {showAnswers ? <EyeOff size={13} /> : <Eye size={13} />}
                {showAnswers ? "정답 가리기" : "정답 확인"}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#F2C94C] text-[#1B4332] font-black text-xs rounded-xl hover:bg-[#e0b83e] shadow-sm transition"
              >
                <Printer size={14} /> 🖨️ A4 시험지 인쇄
              </button>
            </div>
          </div>

          {/* 가로세로 낱말퍼즐 대화형 미리보기 */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col items-center">
            <div className="mb-3 text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span>🧩 가로세로 퍼즐판 미리보기</span>
              {showAnswers && <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">정답 표시 모드</span>}
            </div>

            <div className="inline-block border-2 border-slate-800 bg-slate-800 rounded-lg overflow-hidden shadow-sm">
              {crosswordData.grid.map((row, rIdx) => (
                <div key={rIdx} className="flex">
                  {row.map((cell, cIdx) => {
                    if (!cell) {
                      return <div key={cIdx} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-800" />;
                    }
                    return (
                      <div
                        key={cIdx}
                        className="w-9 h-9 sm:w-10 sm:h-10 bg-white border border-slate-300 relative flex items-center justify-center font-bold text-base text-slate-800 transition"
                      >
                        {cell.num && (
                          <span className="absolute top-0.5 left-1 text-[10px] font-bold text-slate-400 select-none">
                            {cell.num}
                          </span>
                        )}
                        <span className={showAnswers ? "text-slate-900" : "text-transparent"}>
                          {cell.char}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {crosswordData.unplacedWords.length > 0 && (
              <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
                <AlertCircle size={12} /> 일부 교차되지 않은 단어는 단어 학습장에서 확인할 수 있어요.
              </p>
            )}
          </div>

          {/* 가로 / 세로 힌트 목록 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 가로 열쇠 */}
            <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-xs">
              <h4 className="font-bold text-sm text-[#1B4332] mb-3 flex items-center gap-1.5 border-b pb-2">
                <span>➡️</span> 가로 열쇠 ({crosswordData.acrossClues.length}개)
              </h4>
              <div className="space-y-2.5 text-xs">
                {crosswordData.acrossClues.map(c => (
                  <div key={c.num} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-bold text-[#1B4332] mr-1">{c.num}번:</span>
                    <span className="text-slate-700">{c.clue}</span>
                    <span className="text-slate-400 text-[10px] ml-1">({c.word.length}글자)</span>
                    {showAnswers && (
                      <span className="ml-2 font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                        [{c.word}]
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 세로 열쇠 */}
            <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-xs">
              <h4 className="font-bold text-sm text-[#1B4332] mb-3 flex items-center gap-1.5 border-b pb-2">
                <span>⬇️</span> 세로 열쇠 ({crosswordData.downClues.length}개)
              </h4>
              <div className="space-y-2.5 text-xs">
                {crosswordData.downClues.map(c => (
                  <div key={c.num} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-bold text-[#1B4332] mr-1">{c.num}번:</span>
                    <span className="text-slate-700">{c.clue}</span>
                    <span className="text-slate-400 text-[10px] ml-1">({c.word.length}글자)</span>
                    {showAnswers && (
                      <span className="ml-2 font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                        [{c.word}]
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 단어 학습장 (복습용) */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <span>📚</span> 단어 학습장 ({worksheet.wordlist.length}단어)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {worksheet.wordlist.map((w, i) => (
                <div key={i} className="p-3 border border-slate-200 rounded-xl bg-slate-50/70 text-xs">
                  <div className="font-bold text-sm text-[#1B4332]">{w.word}</div>
                  <div className="text-slate-600 mt-1">• 뜻: {w.meaning}</div>
                  <div className="text-slate-500 italic mt-0.5">• 예문: {w.example}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

