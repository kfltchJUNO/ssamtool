"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { executePrint } from "@/lib/print";
import { Sparkles, Printer, Copy, Check, BookOpen, Loader2, Lightbulb, ShieldAlert } from "lucide-react";

interface ContrastExample {
  context: string;
  sentenceA: string;
  sentenceB: string;
  explanation: string;
}

interface GrammarComparison {
  compareGrammar: string;
  compareLevel: string;
  coreDifference: string;
  contrastExamples: ContrastExample[];
}

interface GrammarDiffData {
  targetGrammar: string;
  level: string;
  meaning: string;
  combinationRules: string[];
  constraints: string[];
  comparisons: GrammarComparison[];
  teachingTip: string;
}

const LEVELS = [
  { id: "초급 (TOPIK 1~2급)", label: "초급 (1~2급)", desc: "기초 문법 및 일상 회화" },
  { id: "중급 (TOPIK 3~4급)", label: "중급 (3~4급)", desc: "복합 표현 및 사회적 맥락" },
  { id: "고급 (TOPIK 5~6급)", label: "고급 (5~6급)", desc: "시사, 논설문 및 문어체" },
];

export default function GrammarDiff() {
  const { user } = useAuth();
  const [grammar, setGrammar] = useState("");
  const [level, setLevel] = useState("초급 (TOPIK 1~2급)");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GrammarDiffData | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!grammar.trim()) {
      alert("정리할 문법을 입력해주세요. (예: -(으)니까, -느라고, -에 비해)");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/grammar-diff/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ grammar: grammar.trim(), level }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || resData.error || "생성 실패");
      }
      setData(resData.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "문법 내용 정리 중 오류가 발생했습니다.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!data) return;
    const text = `[한국어 문법 수업 준비 자료]
■ 대상 문법: ${data.targetGrammar} (${data.level})
■ 기본 의미: ${data.meaning}

■ 결합 정보:
${data.combinationRules.map(r => `• ${r}`).join("\n")}

■ 주요 제약 조건:
${data.constraints.map(c => `• ${c}`).join("\n")}

■ 유사/비교 문법 분석:
${data.comparisons.map((c, i) => `
${i + 1}. vs [${c.compareGrammar}] (${c.compareLevel})
- 핵심 차이: ${c.coreDifference}
${c.contrastExamples.map(e => `
  [상황] ${e.context}
  - A (${data.targetGrammar}): ${e.sentenceA}
  - B (${c.compareGrammar}): ${e.sentenceB}
  - 해설: ${e.explanation}
`).join("")}
`).join("")}

■ 교수 판서/지도 팁:
${data.teachingTip}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (!data) return;
    const bodyHTML = `
      <div style="border-bottom:2px solid #1B4332; padding-bottom:8px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
          <div>
            <h1 style="font-size:22px; font-weight:bold; color:#1B4332; margin:0 0 4px;">📖 [문법 지도안] ${data.targetGrammar}</h1>
            <p style="font-size:12px; color:#64748b; margin:0;">수업 수준: ${data.level} · 쌤툴(SsamTool) 수업 준비 자료</p>
          </div>
          <div style="font-size:12px; color:#475569;">출력일: ${new Date().toLocaleDateString("ko-KR")}</div>
        </div>
      </div>

      <div style="margin-bottom:16px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px;">
        <h3 style="font-size:13px; font-weight:bold; color:#1B4332; margin:0 0 4px;">1. 기본 의미 및 기능</h3>
        <p style="font-size:12px; color:#1e293b; margin:0; line-height:1.5;">${data.meaning}</p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
        <div style="border:1px solid #cbd5e1; border-radius:8px; padding:12px;">
          <h3 style="font-size:13px; font-weight:bold; color:#334155; margin:0 0 6px;">2. 결합 형태 및 규칙</h3>
          <ul style="font-size:11px; color:#475569; margin:0; padding-left:16px; line-height:1.6;">
            ${data.combinationRules.map(r => `<li>${r}</li>`).join("")}
          </ul>
        </div>
        <div style="border:1px solid #cbd5e1; border-radius:8px; padding:12px; background:#fff7ed;">
          <h3 style="font-size:13px; font-weight:bold; color:#c2410c; margin:0 0 6px;">3. 형태 및 화용 제약</h3>
          <ul style="font-size:11px; color:#9a3412; margin:0; padding-left:16px; line-height:1.6;">
            ${data.constraints.map(c => `<li>${c}</li>`).join("")}
          </ul>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <h3 style="font-size:14px; font-weight:bold; color:#1B4332; margin:0 0 10px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">
          4. 유사 문법 비교 및 대조 예문 (동급/하위 수준 한정)
        </h3>
        ${data.comparisons.map((c, i) => `
          <div style="border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-bottom:12px; page-break-inside:avoid;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-size:13px; font-weight:bold; color:#1e293b;">
                ${i + 1}) [${data.targetGrammar}] vs [${c.compareGrammar}]
              </span>
              <span style="font-size:10px; background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px;">${c.compareLevel}</span>
            </div>
            <p style="font-size:11px; color:#0f766e; font-weight:bold; margin:0 0 8px;">💡 핵심 차이: ${c.coreDifference}</p>
            <table style="width:100%; border-collapse:collapse; font-size:11px;">
              <thead>
                <tr style="background:#f1f5f9;">
                  <th style="border:1px solid #cbd5e1; padding:4px 6px; width:20%;">상황 맥락</th>
                  <th style="border:1px solid #cbd5e1; padding:4px 6px; width:40%;">${data.targetGrammar}</th>
                  <th style="border:1px solid #cbd5e1; padding:4px 6px; width:40%;">${c.compareGrammar}</th>
                </tr>
              </thead>
              <tbody>
                ${c.contrastExamples.map(e => `
                  <tr>
                    <td style="border:1px solid #cbd5e1; padding:6px; font-weight:bold; color:#334155;">${e.context}</td>
                    <td style="border:1px solid #cbd5e1; padding:6px; color:#1B4332;">${e.sentenceA}</td>
                    <td style="border:1px solid #cbd5e1; padding:6px; color:#0284c7;">${e.sentenceB}</td>
                  </tr>
                  <tr>
                    <td colspan="3" style="border:1px solid #cbd5e1; padding:4px 6px; background:#fafafa; color:#64748b; font-size:10px;">
                      🔍 차이 설명: ${e.explanation}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `).join("")}
      </div>

      <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:10px 12px; page-break-inside:avoid;">
        <h4 style="font-size:12px; font-weight:bold; color:#15803d; margin:0 0 4px;">💡 수업 지도 & 판서 팁</h4>
        <p style="font-size:11px; color:#166534; margin:0; line-height:1.5;">${data.teachingTip}</p>
      </div>
    `;
    executePrint(bodyHTML, { paperSize: "A4", orientation: "portrait", marginMm: 12 });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 상단 입력 폼 */}
      <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-[#1B4332] text-lg flex items-center gap-2">
              <span className="text-xl">📚</span> 수업용 한국어 문법 내용 정리 도구
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              수업할 문법을 입력하면 설정된 급수 이하의 유사 문법 2~3개와 제약 조건, 확실한 대조 예문을 한눈에 정리해 드립니다.
            </p>
          </div>
          <span className="text-xs font-bold text-[#1B4332] bg-[#F0FFF4] border border-[#9AE6B4] px-3 py-1.5 rounded-xl">
            🖍️ 2분필 소모
          </span>
        </div>

        <div className="space-y-4 text-xs">
          {/* 급수 선택 */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">학습자 수준 / 목표 급수:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {LEVELS.map(l => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLevel(l.id)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col ${
                    level === l.id
                      ? "border-[#1B4332] bg-[#F0FFF4] ring-2 ring-[#1B4332]"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                  }`}
                >
                  <span className={`font-bold text-sm ${level === l.id ? "text-[#1B4332]" : "text-slate-800"}`}>
                    {l.label}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">{l.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-emerald-700 mt-1.5 flex items-center gap-1 font-medium">
              <Lightbulb size={13} /> 비교 문법으로 <b>설정된 급수보다 어려운 문법은 절대 나오지 않도록</b> 자동 제한됩니다.
            </p>
          </div>

          {/* 문법 입력 */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">수업할 문법 항목 입력:</label>
            <div className="flex gap-2">
              <input
                value={grammar}
                onChange={e => setGrammar(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleGenerate(); }}
                placeholder="예: -(으)니까, -느라고, -에 비해서, -(으)ㄹ 텐데, -도록 하다..."
                className="flex-1 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 ring-emerald-400 bg-slate-50/50"
              />
              <button
                onClick={handleGenerate}
                disabled={loading || !grammar.trim()}
                className="px-6 py-3 bg-[#1B4332] text-white font-bold text-sm rounded-xl hover:bg-[#2D6A4F] disabled:opacity-40 shadow transition flex items-center justify-center gap-2 flex-shrink-0"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? "정리 중..." : "문법 내용 정리 (🖍️ 2개)"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 결과 화면 */}
      {data && (
        <div className="bg-white rounded-2xl border border-[#E8E0D0] p-6 shadow-sm space-y-6">
          {/* 상단 액션 바 */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  {data.level}
                </span>
                <h3 className="font-black text-[#1B4332] text-2xl">{data.targetGrammar}</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">{data.meaning}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition"
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                {copied ? "복사 완료!" : "텍스트 복사"}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#F2C94C] text-[#1B4332] font-black text-xs rounded-xl hover:bg-[#e0b83e] shadow-sm transition"
              >
                <Printer size={14} /> 🖨️ 지도안 A4 인쇄
              </button>
            </div>
          </div>

          {/* 결합 형태 & 제약 조건 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 결합 형태 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
              <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-1.5">
                <BookOpen size={16} className="text-[#1B4332]" /> 결합 형태 및 규칙
              </h4>
              <ul className="space-y-1 text-xs text-slate-600">
                {data.combinationRules.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#1B4332] font-bold">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 형태 / 화용 제약 */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
              <h4 className="font-bold text-sm text-amber-900 mb-2 flex items-center gap-1.5">
                <ShieldAlert size={16} className="text-amber-700" /> 주의해야 할 제약 조건
              </h4>
              <ul className="space-y-1 text-xs text-amber-950">
                {data.constraints.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 유사 문법 비교 및 대조 예문 */}
          <div className="space-y-4">
            <h4 className="font-bold text-base text-[#1B4332] flex items-center gap-2 border-b border-slate-100 pb-2">
              <span>⚖️</span> 유사 문법 비교 분석 ({data.comparisons.length}개)
              <span className="text-xs font-normal text-slate-400">
                ※ 학생 수준을 고려하여 {data.level} 이하의 문법만 대조합니다.
              </span>
            </h4>

            <div className="space-y-4">
              {data.comparisons.map((c, idx) => (
                <div key={idx} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-base">
                        [{data.targetGrammar}] <span className="text-slate-400 font-normal">vs</span> [{c.compareGrammar}]
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {c.compareLevel}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                    <span className="font-bold text-emerald-900">💡 핵심 차이: </span>
                    <span className="text-emerald-800">{c.coreDifference}</span>
                  </div>

                  {/* 확실한 대조 예문 */}
                  <div className="space-y-2.5 pt-1">
                    <span className="text-xs font-bold text-slate-600 block">확실하게 비교 가능한 대조 예문:</span>
                    <div className="space-y-2">
                      {c.contrastExamples.map((ex, eIdx) => (
                        <div key={eIdx} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs space-y-1.5">
                          <div className="font-semibold text-slate-500 text-[11px]">
                            [상황/맥락] {ex.context}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg bg-white border border-emerald-200/80">
                              <span className="text-[10px] font-bold text-[#1B4332] block mb-0.5">
                                {data.targetGrammar}
                              </span>
                              <span className="font-medium text-slate-800">{ex.sentenceA}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-white border border-blue-200/80">
                              <span className="text-[10px] font-bold text-blue-700 block mb-0.5">
                                {c.compareGrammar}
                              </span>
                              <span className="font-medium text-slate-800">{ex.sentenceB}</span>
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-500 pt-0.5">
                            🔍 <b>뉘앙스 차이:</b> {ex.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 교수 판서 / 지도 팁 */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
            <h4 className="font-bold text-sm text-emerald-950 mb-1 flex items-center gap-1.5">
              <Lightbulb size={16} className="text-emerald-700" /> 선생님을 위한 수업 지도 & 판서 팁
            </h4>
            <p className="text-xs text-emerald-900 leading-relaxed">{data.teachingTip}</p>
          </div>
        </div>
      )}
    </div>
  );
}
