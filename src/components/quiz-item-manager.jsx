import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles, Loader2, CheckCircle2, AlertCircle, LogIn,
  History, BarChart3, Copy, Link2, Link2Off, RefreshCw,
  Printer, QrCode, RotateCcw, Trash, Send, Gift, BookOpen, Zap
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

// ── 시험지 인쇄 (문제지 + 별도 정답지) ────────────────────────────
function printQuizExam(title, questions) {
  const qHtml = questions.map((q, i) => `
    <div style="margin-bottom:18px;page-break-inside:avoid;">
      <p style="font-weight:700;font-size:14px;margin:0 0 6px;white-space:pre-wrap;">${i + 1}. ${q.question}</p>
      ${Array.isArray(q.choices) && q.choices.length > 0
        ? `<div style="display:flex;flex-direction:column;gap:6px;padding-left:14px;">
             ${q.choices.map(c => `<span style="font-size:13px;">${c}</span>`).join("")}
           </div>`
        : `<div style="border-bottom:1px solid #999;width:60%;height:22px;margin-left:14px;"></div>`}
    </div>`).join("");

  const answerHtml = questions.map((q, i) => `
    <tr>
      <td style="padding:6px 10px;border:1px solid #ddd;font-weight:700;width:50px;text-align:center;">${i + 1}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;font-weight:600;width:120px;">${q.answer}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;font-size:12px;color:#555;">${q.explanation || ""}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
    <title>${title} - 쌤툴</title>
    <style>
      @page { size: A4; margin: 16mm; }
      body { font-family: 'Noto Sans KR', sans-serif; margin: 0; color: #111; line-height: 1.5; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      .meta { font-size: 12px; color: #888; margin-bottom: 16px; }
      .name-line { display:flex; gap:24px; font-size:13px; margin-bottom:20px; padding-bottom:10px; border-bottom:1px solid #ddd; }
      .page-break { page-break-before: always; }
      table { width:100%; border-collapse:collapse; font-size:13px; margin-top:12px; }
      th { padding:8px 10px; background:#F5F5F5; border:1px solid #DDD; text-align:left; }
    </style>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap">
  </head><body>
    <h1>${title}</h1>
    <div class="meta">쌤툴(SsamTool)에서 생성된 학습지</div>
    <div class="name-line"><span>이름: ______________</span><span>학번: ______________</span><span>점수: ______ / ${questions.length}</span></div>
    ${qHtml}

    <div class="page-break"></div>
    <h1>정답 및 해설</h1>
    <div class="meta">${title}</div>
    <table><thead><tr><th>번호</th><th>정답</th><th>해설</th></tr></thead>
      <tbody>${answerHtml}</tbody></table>

    <script>document.fonts.ready.then(()=>setTimeout(()=>{window.print();window.close();},300))</script>
  </body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open(); doc.write(html); doc.close();
  iframe.contentWindow?.addEventListener("afterprint", () => document.body.removeChild(iframe));
}

export default function QuizItemManager() {
  const { user } = useAuth();
  // 탭: "quick" (빠른 생성) | "topik" (미니 토픽) | "myQuizzes" (내 퀴즈)
  const [activeTab,    setActiveTab]    = useState("quick");

  // 빠른 생성 상태
  const [quickTopic,   setQuickTopic]   = useState("");
  const [quickCount,   setQuickCount]   = useState(5);
  const [quickDiff,    setQuickDiff]    = useState("beginner");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError,   setQuickError]   = useState("");

  // 미니 TOPIK 생성 상태
  const [topikLevel,   setTopikLevel]   = useState("topik1");      // "topik1" | "topik2_mid" | "topik2_adv"
  const [topikSection, setTopikSection] = useState("all");         // "all" | "reading" | "grammar_vocab"
  const [topikCount,   setTopikCount]   = useState(5);
  const [topikLoading, setTopikLoading] = useState(false);
  const [topikError,   setTopikError]   = useState("");

  // 생성 완료 결과 상태
  const [quizResult,   setQuizResult]   = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [shareInfo,    setShareInfo]    = useState(null);
  const [needChalk,    setNeedChalk]    = useState(false);

  const getIdToken = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("로그인이 필요해요.");
    return currentUser.getIdToken();
  };

  // 1. 빠른 퀴즈 생성
  const handleQuickGenerate = async () => {
    const topic = quickTopic.trim();
    if (!topic) { setQuickError("오늘 수업할 주제나 어휘를 입력해주세요."); return; }
    setQuickLoading(true);
    setQuickError("");
    setQuizResult(null);
    setShareInfo(null);
    try {
      const idToken = await getIdToken();
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          mode: "topic",
          topic,
          count: quickCount,
          difficulty: quickDiff,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 || data.error === "INSUFFICIENT_CHALK") {
          setNeedChalk(true);
          document.dispatchEvent(new CustomEvent("ssamtool:insufficientChalk", {
            detail: { required: data.required || 1, feature: "AI 퀴즈 빠른 생성" },
          }));
        }
        setQuickError(data.message || "퀴즈 생성에 실패했어요.");
        return;
      }
      setNeedChalk(false);
      setQuizResult(data);
    } catch (e) {
      setQuickError(e instanceof Error ? e.message : "네트워크 오류가 발생했어요.");
    } finally {
      setQuickLoading(false);
    }
  };

  // 2. 미니 TOPIK 생성
  const handleTopikGenerate = async () => {
    setTopikLoading(true);
    setTopikError("");
    setQuizResult(null);
    setShareInfo(null);
    try {
      const idToken = await getIdToken();
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          mode: "mini-topik",
          topikLevel,
          topikSection,
          count: topikCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 || data.error === "INSUFFICIENT_CHALK") {
          setNeedChalk(true);
          document.dispatchEvent(new CustomEvent("ssamtool:insufficientChalk", {
            detail: { required: data.required || 1, feature: "미니 TOPIK 생성" },
          }));
        }
        setTopikError(data.message || "TOPIK 문항 생성에 실패했어요.");
        return;
      }
      setNeedChalk(false);
      setQuizResult(data);
    } catch (e) {
      setTopikError(e instanceof Error ? e.message : "네트워크 오류가 발생했어요.");
    } finally {
      setTopikLoading(false);
    }
  };

  // 3. 학생 공유 게시
  const publishQuiz = async () => {
    if (!quizResult?.quizId) return;
    setIsPublishing(true);
    try {
      const idToken = await getIdToken();
      const res = await fetch(`/api/quiz/${quizResult.quizId}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "게시에 실패했어요.");
        return;
      }
      setShareInfo(data);
    } catch {
      alert("게시 중 오류가 발생했어요.");
    } finally {
      setIsPublishing(false);
    }
  };

  // 비로그인 게이트
  if (!user) {
    return (
      <div className="min-h-[420px] bg-slate-50 flex items-center justify-center rounded-2xl border border-slate-200">
        <div className="text-center p-8">
          <LogIn size={36} className="mx-auto mb-3 text-slate-400" />
          <p className="text-base font-bold text-slate-800 mb-1">로그인이 필요한 기능이에요</p>
          <p className="text-xs text-slate-500 mb-5">AI 퀴즈 생성 및 학생 공유는 로그인 후 이용할 수 있어요.</p>
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("ssamtool:openLogin"))}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition">
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  const quickChalkCost = quickCount <= 5 ? 1 : quickCount <= 10 ? 2 : quickCount <= 15 ? 3 : 4;
  const topikChalkCost = topikCount <= 5 ? 1 : topikCount <= 10 ? 2 : topikCount <= 15 ? 3 : 4;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <div className="mx-auto max-w-3xl px-4 py-6">

        {/* 상단 출석체크 배너 */}
        <DailyChalkBanner getIdToken={getIdToken} />

        {/* 탭 헤더 */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-indigo-600">SSAMTOOL QUIZ</p>
            <h1 className="text-2xl font-black text-slate-900">AI 퀴즈 & 실전 모의고사</h1>
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-sm">
            <button
              onClick={() => { setActiveTab("quick"); setQuizResult(null); }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-bold transition ${
                activeTab === "quick" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}>
              <Zap size={15} /> 빠른 퀴즈 생성
            </button>
            <button
              onClick={() => { setActiveTab("topik"); setQuizResult(null); }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-bold transition ${
                activeTab === "topik" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}>
              <BookOpen size={15} /> 미니 TOPIK
            </button>
            <button
              onClick={() => { setActiveTab("myQuizzes"); setQuizResult(null); }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-bold transition ${
                activeTab === "myQuizzes" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}>
              <History size={15} /> 내 퀴즈 목록
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* 탭 1: 빠른 퀴즈 생성 */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === "quick" && !quizResult && (
          <div className="rounded-2xl border-2 border-indigo-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-600" /> 수업 주제로 빠른 퀴즈 만들기
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  오늘 다룬 문법, 어휘, 대화 주제를 입력하면 AI가 맞춤형 퀴즈를 즉시 생성합니다.
                </p>
              </div>
              <div className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                🖍️ 분필 {quickChalkCost}개 소모
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">퀴즈 주제 / 학습 내용</label>
              <textarea
                value={quickTopic}
                onChange={e => { setQuickTopic(e.target.value); setQuickError(""); }}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleQuickGenerate(); }}
                placeholder="예: 조사 '에'와 '에서'의 차이점, 과거 시제 '-았/었-', 식당에서 주문할 때 쓰는 표현 5개..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 ring-indigo-400 resize-none placeholder-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* 난이도 선택 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">학습 난이도</label>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {[
                    { v: "beginner", l: "초급", desc: "TOPIK I (1~2급)" },
                    { v: "intermediate", l: "중급", desc: "TOPIK II (3~4급)" },
                    { v: "advanced", l: "고급", desc: "TOPIK II (5~6급)" },
                  ].map(d => (
                    <button key={d.v} onClick={() => setQuickDiff(d.v)}
                      className={`rounded-lg py-2 text-xs font-bold transition flex flex-col items-center ${
                        quickDiff === d.v ? "bg-white text-indigo-700 shadow-sm border border-indigo-200" : "text-slate-500 hover:text-slate-800"
                      }`}>
                      <span>{d.l}</span>
                      <span className="text-[10px] font-normal text-slate-400">{d.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 문항 수 선택 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">문항 수</label>
                <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {[5, 10, 15, 20].map(n => (
                    <button key={n} onClick={() => setQuickCount(n)}
                      className={`rounded-lg py-2.5 text-xs font-bold transition ${
                        quickCount === n ? "bg-white text-indigo-700 shadow-sm border border-indigo-200" : "text-slate-500 hover:text-slate-800"
                      }`}>
                      {n}문항
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {quickError && (
              <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
                <span className="flex items-center gap-1.5"><AlertCircle size={15} /> {quickError}</span>
                {needChalk && (
                  <Link href="/shop" className="font-bold underline text-indigo-700 hover:text-indigo-900">
                    분필 충전하기 &rarr;
                  </Link>
                )}
              </div>
            )}

            <button
              onClick={handleQuickGenerate}
              disabled={quickLoading || !quickTopic.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 shadow transition">
              {quickLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {quickLoading ? "AI가 맞춤 퀴즈를 생성하고 있어요..." : `AI 퀴즈 생성하기 (🖍️ ${quickChalkCost}개)`}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* 탭 2: 📘 미니 TOPIK 실전 모의고사 생성기 */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === "topik" && !quizResult && (
          <div className="rounded-2xl border-2 border-blue-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-600" /> 미니 TOPIK 실전 모의고사 생성
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  실제 한국어능력시험(TOPIK) 기출 스타일의 4지선다형 객관식 문항을 자동 출제합니다.
                </p>
              </div>
              <div className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                🖍️ 분필 {topikChalkCost}개 소모
              </div>
            </div>

            {/* 급수 선택 */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-2">목표 급수 선택</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: "topik1",
                    title: "TOPIK I (초급)",
                    sub: "1~2급 수준",
                    desc: "기초 어휘·조사, 기본 문형, 짧은 안내문/표지판 읽기",
                    color: "border-emerald-200 bg-emerald-50/40 text-emerald-900",
                    active: "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50",
                  },
                  {
                    id: "topik2_mid",
                    title: "TOPIK II (중급)",
                    sub: "3~4급 수준",
                    desc: "설명문 빈칸 추론, 중심 생각, 연결 어미, 일상적 사회 소재",
                    color: "border-blue-200 bg-blue-50/40 text-blue-900",
                    active: "ring-2 ring-blue-500 border-blue-500 bg-blue-50",
                  },
                  {
                    id: "topik2_adv",
                    title: "TOPIK II (고급)",
                    sub: "5~6급 수준",
                    desc: "시사·논설문 독해, 논리적 연결어, 고급 관용구/사자성어",
                    color: "border-purple-200 bg-purple-50/40 text-purple-900",
                    active: "ring-2 ring-purple-500 border-purple-500 bg-purple-50",
                  },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTopikLevel(item.id)}
                    className={`rounded-xl border p-3.5 text-left transition ${item.color} ${
                      topikLevel === item.id ? item.active : "hover:border-slate-300"
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{item.title}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white border border-slate-200">
                        {item.sub}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 영역 및 문항 수 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* 출제 영역 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">출제 영역</label>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {[
                    { v: "all", l: "실전 종합" },
                    { v: "grammar_vocab", l: "어휘·문법" },
                    { v: "reading", l: "읽기·지문" },
                  ].map(sec => (
                    <button
                      key={sec.v}
                      type="button"
                      onClick={() => setTopikSection(sec.v)}
                      className={`rounded-lg py-2 text-xs font-bold transition ${
                        topikSection === sec.v ? "bg-white text-blue-700 shadow-sm border border-blue-200" : "text-slate-500 hover:text-slate-800"
                      }`}>
                      {sec.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* 문항 수 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">모의 문항 수</label>
                <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {[5, 10, 15, 20].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTopikCount(n)}
                      className={`rounded-lg py-2 text-xs font-bold transition ${
                        topikCount === n ? "bg-white text-blue-700 shadow-sm border border-blue-200" : "text-slate-500 hover:text-slate-800"
                      }`}>
                      {n}문항
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {topikError && (
              <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
                <span className="flex items-center gap-1.5"><AlertCircle size={15} /> {topikError}</span>
                {needChalk && (
                  <Link href="/shop" className="font-bold underline text-blue-700 hover:text-blue-900">
                    분필 충전하기 &rarr;
                  </Link>
                )}
              </div>
            )}

            <button
              onClick={handleTopikGenerate}
              disabled={topikLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40 shadow transition">
              {topikLoading ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
              {topikLoading ? "TOPIK 기출 양식 모의문항을 생성하고 있어요..." : `미니 TOPIK 모의고사 출제하기 (🖍️ ${topikChalkCost}개)`}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* 생성 완료된 퀴즈 결과 카드 (빠른 생성 & TOPIK 공통) */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {quizResult && quizResult.questions?.length > 0 && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                  <CheckCircle2 size={18} />
                  생성 완료 · {quizResult.questions.length}문항
                </div>
                <h3 className="text-base font-black text-slate-800 mt-1">{quizResult.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printQuizExam(quizResult.title || "쌤툴 퀴즈", quizResult.questions)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition">
                  <Printer size={14} /> 시험지 인쇄
                </button>
                <button
                  onClick={() => { setActiveTab("myQuizzes"); setQuizResult(null); }}
                  className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition">
                  <History size={14} /> 내 퀴즈 목록
                </button>
                <button
                  onClick={() => setQuizResult(null)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition">
                  새로 만들기
                </button>
              </div>
            </div>

            {/* 학생 공유 링크 / QR */}
            {!shareInfo ? (
              <button
                onClick={publishQuiz}
                disabled={isPublishing}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition">
                {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                {isPublishing ? "게시 링크 생성 중..." : "학생에게 공유하기 (링크 및 QR 코드 생성)"}
              </button>
            ) : (
              <div className="rounded-xl bg-indigo-50/70 border border-indigo-200 p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(shareInfo.shareUrl)}`}
                    alt="QR 코드"
                    width={100}
                    height={100}
                    className="rounded-lg border border-indigo-200 bg-white p-1.5 flex-shrink-0 shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-indigo-600">학생 접속 링크</p>
                    <p className="font-mono font-bold text-indigo-900 break-all text-sm mt-0.5">{shareInfo.shareUrl}</p>
                    <p className="mt-1 text-xs text-slate-500">참여 코드: <b>{shareInfo.shareCode}</b></p>
                    <p className="mt-2 text-[11px] text-indigo-500 flex items-center gap-1">
                      <QrCode size={13} /> 교실 빔프로젝터나 화면에 띄워 학생들이 폰으로 접속하게 해주세요
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 우리반 배포 */}
            <DeployToWooriban quizId={quizResult.quizId} getIdToken={getIdToken} />

            {/* 문항 목록 미리보기 */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-500">문항 검토 및 수정</h4>
              {quizResult.questions.map((q, idx) => (
                <QuestionCard
                  key={idx}
                  q={q}
                  idx={idx}
                  quizId={quizResult.quizId}
                  getIdToken={getIdToken}
                  canDelete={quizResult.questions.length > 1}
                  onDeleted={(updated) => setQuizResult(r => ({ ...r, questions: updated }))}
                  onRegenerated={(updated, spent) => setQuizResult(r => ({
                    ...r, questions: updated, chalkSpent: (r.chalkSpent || 0) + spent,
                  }))}
                  onChalkError={() => setNeedChalk(true)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* 탭 3: 내 퀴즈 목록 */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === "myQuizzes" && <MyQuizzes getIdToken={getIdToken} />}

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 내 퀴즈 목록 + 결과 대시보드
// ══════════════════════════════════════════════════════════════════
function MyQuizzes({ getIdToken }) {
  const [quizzes,  setQuizzes]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [busyId,   setBusyId]   = useState(null);
  const [openId,   setOpenId]   = useState(null);
  const [results,  setResults]  = useState({});
  const [copied,   setCopied]   = useState("");

  const authFetch = async (url, options = {}) => {
    const idToken = await getIdToken();
    return fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${idToken}` },
    });
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await authFetch("/api/quiz/list");
      const data = await res.json();
      if (!res.ok) { setError(data.error || "목록을 불러오지 못했어요."); return; }
      setQuizzes(data.quizzes || []);
    } catch {
      setError("네트워크 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePublish = async (quiz) => {
    setBusyId(quiz.quizId);
    try {
      const res = await authFetch(`/api/quiz/${quiz.quizId}/publish`, {
        method: quiz.isPublished ? "DELETE" : "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "처리에 실패했어요.");
        return;
      }
      await load();
    } catch {
      setError("네트워크 오류가 발생했어요.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleResults = async (quizId) => {
    if (openId === quizId) { setOpenId(null); return; }
    setOpenId(quizId);
    if (results[quizId]) return;
    try {
      const res  = await authFetch(`/api/quiz/${quizId}/results`);
      const data = await res.json();
      if (res.ok) setResults(prev => ({ ...prev, [quizId]: data }));
      else setError(data.error || "결과를 불러오지 못했어요.");
    } catch {
      setError("네트워크 오류가 발생했어요.");
    }
  };

  const copyLink = (url, quizId) => {
    navigator.clipboard.writeText(url);
    setCopied(quizId);
    setTimeout(() => setCopied(""), 1500);
  };

  const DIFF_LABEL = { beginner: "초급", intermediate: "중급", advanced: "고급" };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
        <Loader2 size={16} className="animate-spin" /> 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          생성한 퀴즈 <span className="font-semibold text-slate-800">{quizzes.length}개</span>
          <span className="ml-2 text-xs text-slate-400">(재게시는 분필이 들지 않아요)</span>
        </p>
        <button onClick={load}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
          <RefreshCw size={13} /> 새로고침
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {quizzes.length === 0 && !error && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          아직 만든 퀴즈가 없어요.
          <br />[빠른 퀴즈 생성]이나 [미니 TOPIK] 탭에서 첫 퀴즈를 만들어보세요!
        </div>
      )}

      {quizzes.map(q => {
        const isOpen = openId === q.quizId;
        const r      = results[q.quizId];
        return (
          <div key={q.quizId} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-bold text-slate-800">{q.title || "제목 없음"}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {DIFF_LABEL[q.difficulty] || q.difficulty} · {q.questionCount}문항
                  {q.createdAt && ` · ${new Date(q.createdAt).toLocaleDateString("ko-KR")}`}
                  {" · 응시 "}<span className="font-semibold text-slate-600">{q.attemptCount}명</span>
                </p>
              </div>

              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                q.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
              }`}>
                {q.isPublished ? "게시 중" : "미게시"}
              </span>

              <div className="flex items-center gap-1">
                <button onClick={() => toggleResults(q.quizId)}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                    isOpen
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}>
                  <BarChart3 size={13} /> 결과
                </button>
                <button onClick={() => togglePublish(q)} disabled={busyId === q.quizId}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                  {busyId === q.quizId
                    ? <Loader2 size={13} className="animate-spin" />
                    : q.isPublished ? <Link2Off size={13} /> : <Link2 size={13} />}
                  {q.isPublished ? "게시 중단" : "게시"}
                </button>
                <button onClick={() => printQuizExam(q.title, r?.questions || [])}
                  disabled={!results[q.quizId]}
                  title={results[q.quizId] ? "시험지 인쇄" : "결과 먼저 열어주세요"}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30">
                  <Printer size={13} />
                </button>
              </div>
            </div>

            {/* 공유 링크 + QR */}
            {q.isPublished && q.shareUrl && (
              <div className="flex items-center gap-2 border-t border-slate-100 bg-indigo-50/50 px-4 py-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(q.shareUrl)}`}
                  alt="QR" width={36} height={36} className="rounded border border-indigo-200 bg-white p-0.5 flex-shrink-0" />
                <span className="font-mono text-xs text-indigo-700 truncate flex-1">{q.shareUrl}</span>
                <span className="text-[11px] text-slate-400">코드: <b>{q.shareCode}</b></span>
                <button onClick={() => copyLink(q.shareUrl, q.quizId)}
                  className="flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50">
                  <Copy size={11} /> {copied === q.quizId ? "복사됨!" : "복사"}
                </button>
              </div>
            )}

            {/* 결과 패널 */}
            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 space-y-4">
                {!r ? (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-3">
                    <Loader2 size={13} className="animate-spin" /> 결과 불러오는 중...
                  </div>
                ) : r.attemptCount === 0 ? (
                  <p className="text-xs text-slate-400 py-3">아직 응시한 학생이 없어요.</p>
                ) : (
                  <>
                    <div className="flex gap-4 text-xs">
                      <span className="text-slate-500">응시 <b className="text-slate-800">{r.attemptCount}명</b></span>
                      <span className="text-slate-500">평균 <b className="text-slate-800">{r.averageScore}점</b></span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">문항별 정답률</p>
                      <div className="space-y-1.5">
                        {r.questionStats.map(qs => (
                          <div key={qs.index} className="flex items-center gap-2">
                            <span className="w-6 text-center text-[11px] font-bold text-slate-400 flex-shrink-0">
                              {qs.index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-600 truncate" title={qs.question}>{qs.question}</p>
                              <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    (qs.correctRate ?? 0) >= 70 ? "bg-emerald-400"
                                    : (qs.correctRate ?? 0) >= 40 ? "bg-amber-400"
                                    : "bg-rose-400"
                                  }`}
                                  style={{ width: `${qs.correctRate ?? 0}%` }} />
                              </div>
                            </div>
                            <span className={`w-12 text-right text-[11px] font-bold flex-shrink-0 ${
                              (qs.correctRate ?? 0) >= 70 ? "text-emerald-600"
                              : (qs.correctRate ?? 0) >= 40 ? "text-amber-600"
                              : "text-rose-500"
                            }`}>
                              {qs.correctRate}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">학생별 점수</p>
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-slate-50">
                            <tr className="text-slate-400">
                              <th className="px-3 py-1.5 text-left font-semibold">이름</th>
                              <th className="px-3 py-1.5 text-center font-semibold">점수</th>
                              <th className="px-3 py-1.5 text-center font-semibold">정답</th>
                              <th className="px-3 py-1.5 text-right font-semibold">제출 시각</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {r.attempts.map(a => (
                              <tr key={a.id}>
                                <td className="px-3 py-1.5 font-medium text-slate-700">{a.studentName}</td>
                                <td className={`px-3 py-1.5 text-center font-bold ${
                                  a.score >= 70 ? "text-emerald-600" : a.score >= 40 ? "text-amber-600" : "text-rose-500"
                                }`}>{a.score}점</td>
                                <td className="px-3 py-1.5 text-center text-slate-500">{a.correctCount}/{a.total}</td>
                                <td className="px-3 py-1.5 text-right text-slate-400">
                                  {a.submittedAt ? new Date(a.submittedAt).toLocaleString("ko-KR", {
                                    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
                                  }) : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 문항 카드 (삭제 / 재생성 지원)
// ══════════════════════════════════════════════════════════════════
function QuestionCard({ q, idx, quizId, getIdToken, canDelete, onDeleted, onRegenerated, onChalkError }) {
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

  const authFetch = async (url, options = {}) => {
    const idToken = await getIdToken();
    return fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}), Authorization: `Bearer ${idToken}` },
    });
  };

  const handleDelete = async () => {
    if (!confirm(`${idx + 1}번 문항을 삭제할까요?`)) return;
    setBusy(true); setErr("");
    try {
      const res  = await authFetch(`/api/quiz/${quizId}/questions`, {
        method: "PATCH", body: JSON.stringify({ index: idx }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "삭제 실패"); return; }
      onDeleted(data.questions);
    } catch {
      setErr("네트워크 오류");
    } finally { setBusy(false); }
  };

  const handleRegenerate = async () => {
    setBusy(true); setErr("");
    try {
      const res  = await authFetch(`/api/quiz/${quizId}/questions`, {
        method: "POST", body: JSON.stringify({ index: idx }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) onChalkError();
        setErr(data.error || "재생성 실패");
        return;
      }
      onRegenerated(data.questions, data.chalkSpent || 1);
    } catch {
      setErr("네트워크 오류");
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
            {idx + 1}번
          </span>
          <span className="text-[11px] text-slate-400 uppercase font-semibold">{q.type}</span>
        </div>
        {quizId && (
          <div className="flex items-center gap-1">
            <button onClick={handleRegenerate} disabled={busy} title="이 문항만 재생성 (분필 1개)"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 transition">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} 재생성
            </button>
            {canDelete && (
              <button onClick={handleDelete} disabled={busy} title="문항 삭제"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50 disabled:opacity-40 transition">
                <Trash size={12} /> 삭제
              </button>
            )}
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">{q.question}</p>
      {Array.isArray(q.choices) && q.choices.length > 0 && (
        <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {q.choices.map((c, ci) => (
            <li key={ci} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 font-medium">
              {c}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-col gap-1">
        <p className="text-xs text-slate-600">
          정답: <span className="font-bold text-emerald-700">{q.answer}</span>
        </p>
        {q.explanation && (
          <p className="text-xs text-slate-500 leading-relaxed bg-white/60 p-2 rounded border border-slate-100">
            💡 {q.explanation}
          </p>
        )}
      </div>
      {err && <p className="mt-1 text-xs text-rose-500">{err}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 우리반 배포
// ══════════════════════════════════════════════════════════════════
function DeployToWooriban({ quizId, getIdToken }) {
  const [open,     setOpen]     = useState(false);
  const [schools,  setSchools]  = useState([]);
  const [schoolId, setSchoolId] = useState("");
  const [semester, setSemester] = useState("");
  const [classId,  setClassId]  = useState("");
  const [busy,     setBusy]     = useState(false);
  const [result,   setResult]   = useState(null);
  const [err,      setErr]      = useState("");

  const authFetch = async (url, options = {}) => {
    const idToken = await getIdToken();
    return fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}), Authorization: `Bearer ${idToken}` },
    });
  };

  const loadSchools = async () => {
    try {
      const res  = await authFetch("/api/wooriban/schools");
      const data = await res.json();
      if (res.ok) {
        setSchools(data.schools || []);
        if (data.schools?.[0]) {
          setSchoolId(data.schools[0].id);
          const sems = data.schools[0].semesters || [];
          setSemester(sems[0] || "");
          setClassId((data.schools[0].classes?.[sems[0]] || [])[0] || "");
        }
      }
    } catch { /* 무시 */ }
  };

  const handleOpen = () => {
    setOpen(true);
    setResult(null); setErr("");
    if (schools.length === 0) loadSchools();
  };

  const currentSchool = schools.find(s => s.id === schoolId);
  const semList  = currentSchool?.semesters || [];
  const classList = currentSchool?.classes?.[semester] || [];

  const handleDeploy = async () => {
    if (!schoolId || !semester || !classId) { setErr("학교/학기/반을 모두 선택해주세요."); return; }
    setBusy(true); setErr("");
    try {
      const res  = await authFetch(`/api/quiz/${quizId}/deploy-wooriban`, {
        method: "POST", body: JSON.stringify({ schoolId, semester, classId }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "배포에 실패했어요."); return; }
      setResult(data);
    } catch {
      setErr("네트워크 오류가 발생했어요.");
    } finally { setBusy(false); }
  };

  if (!open) {
    return (
      <button onClick={handleOpen}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition">
        <Send size={14} /> 우리반(학생 명단)에 퀴즈 배포하기
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-emerald-800">우리반 선택 후 바로 배포</p>
        <button onClick={() => setOpen(false)} className="text-emerald-500 hover:text-emerald-700 text-xs font-semibold">닫기</button>
      </div>

      {schools.length === 0 && !err ? (
        <p className="text-xs text-emerald-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> 우리반 정보 불러오는 중...</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <select value={schoolId} onChange={e => {
            setSchoolId(e.target.value);
            const s = schools.find(x => x.id === e.target.value);
            const sems = s?.semesters || [];
            setSemester(sems[0] || "");
            setClassId((s?.classes?.[sems[0]] || [])[0] || "");
          }} className="rounded-lg border border-emerald-200 px-2 py-1.5 text-xs bg-white">
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={semester} onChange={e => {
            setSemester(e.target.value);
            setClassId((currentSchool?.classes?.[e.target.value] || [])[0] || "");
          }} className="rounded-lg border border-emerald-200 px-2 py-1.5 text-xs bg-white">
            {semList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={classId} onChange={e => setClassId(e.target.value)}
            className="rounded-lg border border-emerald-200 px-2 py-1.5 text-xs bg-white">
            {classList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {err && <p className="text-xs text-rose-600">{err}</p>}

      {result ? (
        <div className="flex items-center gap-2 text-xs text-emerald-800 bg-white rounded-lg p-2.5 border border-emerald-200 font-bold">
          <CheckCircle2 size={15} className="text-emerald-600" /> 우리반에 배포 완료! ({result.questionCount}문항)
        </div>
      ) : (
        <button onClick={handleDeploy} disabled={busy || schools.length === 0}
          className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-1.5 shadow transition">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {busy ? "배포 중..." : "이 반에 배포"}
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 출석 체크 (무료 분필 획득)
// ══════════════════════════════════════════════════════════════════
export function DailyChalkBanner({ getIdToken }) {
  const [status, setStatus] = useState("idle");
  const [msg,    setMsg]    = useState("");
  const [busy,   setBusy]   = useState(false);

  const authFetch = async (url, options = {}) => {
    const idToken = await getIdToken();
    return fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}), Authorization: `Bearer ${idToken}` },
    });
  };

  useEffect(() => {
    authFetch("/api/chalk/daily", { method: "GET" })
      .then(res => res.json())
      .then(data => { if (data.claimed) setStatus("already"); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClaim = async () => {
    setBusy(true);
    try {
      const res  = await authFetch("/api/chalk/daily", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("claimed");
        setMsg(data.message || "출석 분필 2개가 지급되었습니다!");
        setTimeout(() => { window.location.reload(); }, 1500);
      } else {
        setStatus("already");
        setMsg(data.message || "오늘 출석 체크를 이미 완료했어요.");
      }
    } catch {
      setStatus("error"); setMsg("오류가 발생했어요.");
    } finally { setBusy(false); }
  };

  if (status === "already" || status === "claimed") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        <Gift size={14} className="text-slate-400" />
        {status === "claimed" ? msg : "오늘 출석 체크를 완료했어요. 내일 또 만나요!"}
      </div>
    );
  }

  return (
    <button onClick={handleClaim} disabled={busy}
      className="mb-4 flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 hover:bg-amber-100 transition disabled:opacity-50">
      <span className="flex items-center gap-2 font-medium"><Gift size={16} className="text-amber-600" /> 오늘의 출석 체크하고 분필 받기</span>
      {busy ? <Loader2 size={14} className="animate-spin" /> : <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md">+1 🖍️</span>}
    </button>
  );
}