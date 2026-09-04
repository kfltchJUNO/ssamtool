import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus, X, Settings2, Sparkles, ChevronDown, ChevronRight,
  Trash2, Loader2, CheckCircle2, AlertCircle, Database, LogIn,
  History, BarChart3, Copy, Link2, Link2Off, RefreshCw,
  Printer, QrCode, RotateCcw, Trash, Send, Gift,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  loadLibrary, saveCategory, deleteCategoryDoc, seedLibraryIfEmpty,
} from "@/lib/quizLibrary";

// ── 급수 정의 ─────────────────────────────────────────────────────
const LEVELS = [
  { value: "beginner",     label: "초급", short: "초" },
  { value: "intermediate", label: "중급", short: "중" },
  { value: "advanced",     label: "고급", short: "고" },
];

const LEVEL_BADGE_ON = {
  beginner:     "bg-green-100 text-green-700 border-green-300",
  intermediate: "bg-blue-100 text-blue-700 border-blue-300",
  advanced:     "bg-purple-100 text-purple-700 border-purple-300",
};
const LEVEL_BADGE_OFF = "bg-white text-slate-300 border-slate-200";

const COLOR_MAP = {
  indigo: { chip: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500", ring: "ring-indigo-500" },
  amber:  { chip: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500",  ring: "ring-amber-500"  },
  rose:   { chip: "bg-rose-50 text-rose-700 border-rose-200",      dot: "bg-rose-500",   ring: "ring-rose-500"   },
  slate:  { chip: "bg-slate-50 text-slate-700 border-slate-200",   dot: "bg-slate-400",  ring: "ring-slate-400"  },
};
const COLOR_KEYS = Object.keys(COLOR_MAP);


// ── 시험지 인쇄 (문제지 + 별도 정답지) ────────────────────────────
function printQuizExam(title, questions) {
  const qHtml = questions.map((q, i) => `
    <div style="margin-bottom:18px;page-break-inside:avoid;">
      <p style="font-weight:700;font-size:14px;margin:0 0 6px;">${i + 1}. ${q.question}</p>
      ${Array.isArray(q.choices) && q.choices.length > 0
        ? `<div style="display:flex;flex-wrap:wrap;gap:14px;padding-left:14px;">
             ${q.choices.map(c => `<span style="font-size:13px;">${c}</span>`).join("")}
           </div>`
        : `<div style="border-bottom:1px solid #999;width:60%;height:22px;margin-left:14px;"></div>`}
    </div>`).join("");

  const answerHtml = questions.map((q, i) => `
    <tr>
      <td style="padding:6px 10px;border:1px solid #ddd;font-weight:700;">${i + 1}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;">${q.answer}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;font-size:12px;color:#555;">${q.explanation || ""}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
    <style>
      @page { size: A4; margin: 16mm; }
      body { font-family: 'Noto Sans KR', sans-serif; margin: 0; color: #111; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      .meta { font-size: 12px; color: #888; margin-bottom: 20px; }
      .name-line { display:flex; gap:24px; font-size:13px; margin-bottom:20px; }
      .page-break { page-break-before: always; }
      table { width:100%; border-collapse:collapse; font-size:13px; }
      th { padding:6px 10px; background:#F5F5F5; border:1px solid #DDD; text-align:left; }
    </style>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap">
  </head><body>
    <h1>${title}</h1>
    <div class="meta">쌤툴에서 생성됨</div>
    <div class="name-line"><span>이름: ______________</span><span>학번: ______________</span><span>점수: ______ / ${questions.length}</span></div>
    ${qHtml}

    <div class="page-break"></div>
    <h1>정답 및 해설</h1>
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

const normalizeLevels = (item) => {
  if (Array.isArray(item.levels) && item.levels.length > 0) return item.levels;
  if (item.level) return [item.level];
  return ["beginner"];
};

export default function QuizItemManager() {
  const { user, admin } = useAuth();
  const [mode,         setMode]         = useState("select");
  const [library,      setLibrary]      = useState([]);
  const [libLoading,   setLibLoading]   = useState(true);
  const [libError,     setLibError]     = useState("");
  const [saving,       setSaving]       = useState(false);
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [expanded,     setExpanded]     = useState(new Set());
  const [difficulty,   setDifficulty]   = useState("beginner");
  const [count,        setCount]        = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError,     setGenError]     = useState("");
  const [quizResult,   setQuizResult]   = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [shareInfo,    setShareInfo]    = useState(null);
  const [newCatName,   setNewCatName]   = useState("");
  const [draftItem,    setDraftItem]    = useState({});
  const [needChalk,    setNeedChalk]    = useState(false);  // 분필 부족 → 충전 유도

  // 문항 수 입력 방어: 빈 값/NaN → 5, 범위 1~20 클램프
  const handleCountChange = (raw) => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) { setCount(5); return; }
    setCount(Math.min(20, Math.max(1, n)));
  };

  // ── 라이브러리 로드 ───────────────────────────────────────────
  const reload = async () => {
    setLibLoading(true);
    setLibError("");
    try {
      const cats = await loadLibrary();
      setLibrary(cats);
      setExpanded(new Set(cats.map(c => c.id)));
    } catch (e) {
      console.error(e);
      setLibError("라이브러리를 불러오지 못했어요.");
    } finally {
      setLibLoading(false);
    }
  };
  useEffect(() => { if (user) reload(); }, [user]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── 시드 초기화 (관리자, 라이브러리 비어있을 때) ──────────────
  const handleSeed = async () => {
    setSaving(true);
    try {
      const seeded = await seedLibraryIfEmpty();
      if (seeded) await reload();
    } catch (e) {
      console.error(e);
      setLibError("초기화에 실패했어요. 권한을 확인해주세요.");
    } finally {
      setSaving(false);
    }
  };

  // ── 공통: 카테고리 변경 + Firestore 저장 ─────────────────────
  const mutateCategory = async (catId, updater) => {
    const target = library.find(c => c.id === catId);
    if (!target) return;
    const next = updater(target);
    setLibrary(prev => prev.map(c => (c.id === catId ? next : c)));
    setSaving(true);
    try {
      await saveCategory(next);
    } catch (e) {
      console.error(e);
      setLibError("저장에 실패했어요. 권한을 확인해주세요.");
      await reload(); // 실패 시 서버 상태로 롤백
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = catId => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(catId)) { next.delete(catId); } else { next.add(catId); }
      return next;
    });
  };

  const toggleSelect = itemId => {
    setSelectedIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleDifficultyChange = (newLevel) => {
    setDifficulty(newLevel);
    setSelectedIds(prev => {
      const validIds = [];
      library.forEach(cat =>
        cat.items.forEach(item => {
          if (normalizeLevels(item).includes(newLevel) && prev.includes(item.id)) {
            validIds.push(item.id);
          }
        })
      );
      return validIds;
    });
  };

  // ── 카테고리 추가 ─────────────────────────────────────────────
  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    const usedColors = library.map(c => c.color);
    const color = COLOR_KEYS.find(c => !usedColors.includes(c)) || "slate";
    const id = `cat-${Date.now()}`;
    const newCat = { id, name, color, order: library.length, items: [] };
    setLibrary(prev => [...prev, newCat]);
    setExpanded(prev => new Set(prev).add(id));
    setNewCatName("");
    setSaving(true);
    try {
      await saveCategory(newCat);
    } catch (e) {
      console.error(e);
      setLibError("저장에 실패했어요.");
      await reload();
    } finally {
      setSaving(false);
    }
  };

  // ── 카테고리 삭제 ─────────────────────────────────────────────
  const removeCategory = async (catId) => {
    if (!confirm("카테고리와 안의 모든 항목이 삭제돼요. 계속할까요?")) return;
    const cat = library.find(c => c.id === catId);
    const ids = cat ? cat.items.map(i => i.id) : [];
    setLibrary(prev => prev.filter(c => c.id !== catId));
    setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    setSaving(true);
    try {
      await deleteCategoryDoc(catId);
    } catch (e) {
      console.error(e);
      setLibError("삭제에 실패했어요.");
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const toggleDraftLevel = (catId, level) => {
    setDraftItem(prev => {
      const current = prev[catId]?.levels || ["beginner"];
      const next = current.includes(level)
        ? current.filter(l => l !== level)
        : [...current, level];
      return { ...prev, [catId]: { ...prev[catId], levels: next.length ? next : current } };
    });
  };

  // ── 항목 추가 ─────────────────────────────────────────────────
  const addItem = (catId) => {
    const draft = draftItem[catId];
    const label = draft?.label?.trim();
    if (!label) return;
    const id = `item-${Date.now()}`;
    mutateCategory(catId, cat => ({
      ...cat,
      items: [...cat.items, {
        id, label,
        note:   draft?.note?.trim() || "",
        levels: draft?.levels?.length ? draft.levels : ["beginner"],
      }],
    }));
    setDraftItem(prev => ({
      ...prev,
      [catId]: { label: "", note: "", levels: draft?.levels || ["beginner"] },
    }));
  };

  // ── 항목 삭제 ─────────────────────────────────────────────────
  const removeItem = (catId, itemId) => {
    mutateCategory(catId, cat => ({
      ...cat,
      items: cat.items.filter(i => i.id !== itemId),
    }));
    setSelectedIds(prev => prev.filter(id => id !== itemId));
  };

  // ── 항목 급수 토글 ────────────────────────────────────────────
  const toggleItemLevel = (catId, itemId, level) => {
    mutateCategory(catId, cat => ({
      ...cat,
      items: cat.items.map(item => {
        if (item.id !== itemId) return item;
        const current = normalizeLevels(item);
        const next = current.includes(level)
          ? current.filter(l => l !== level)
          : [...current, level];
        if (next.length === 0) return item;  // 최소 1개 유지
        return { ...item, levels: next };
      }),
    }));
  };

  const getSelectedLabels = () => {
    const labels = [];
    library.forEach(cat =>
      cat.items.forEach(item => {
        if (selectedIds.includes(item.id)) labels.push(item.label);
      })
    );
    return labels;
  };

  const getIdToken = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("로그인이 필요해요.");
    return currentUser.getIdToken();
  };

  // ── 빠른 생성: 자유 주제 입력 ────────────────────────────────────
  const [quickTopic,    setQuickTopic]    = useState("");
  const [quickCount,    setQuickCount]    = useState(5);
  const [quickDiff,     setQuickDiff]     = useState("beginner");
  const [quickLoading,  setQuickLoading]  = useState(false);
  const [quickError,    setQuickError]    = useState("");

  const quickGenerateQuiz = async () => {
    const topic = quickTopic.trim();
    if (!topic) { setQuickError("주제를 입력해주세요."); return; }
    setQuickLoading(true);
    setQuickError("");
    setGenError("");
    setQuizResult(null);
    setShareInfo(null);
    try {
      const idToken = await getIdToken();
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ topic, count: quickCount, difficulty: quickDiff }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 || data.error === "INSUFFICIENT_CHALK") {
          setNeedChalk(true);
          // 전역 모달 트리거
          document.dispatchEvent(new CustomEvent("ssamtool:insufficientChalk", {
            detail: { required: data.required || 1, feature: "AI 퀴즈 빠른 생성" },
          }));
        }
        setQuickError(data.message || "퀴즈 생성에 실패했어요.");
        return;
      }
      setNeedChalk(false);
      setQuizResult(data);
      setMode("select"); // 결과 표시를 위해 select 모드로
    } catch (e) {
      setQuickError(e instanceof Error ? e.message : "네트워크 오류가 발생했어요.");
    } finally {
      setQuickLoading(false);
    }
  };

  const generateQuiz = async () => {
    if (selectedIds.length === 0) return;
    setIsGenerating(true);
    setGenError("");
    setQuizResult(null);
    setShareInfo(null);
    try {
      const idToken = await getIdToken();
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          curriculum:    "dongguk-2a",
          unit:          "unit-3",
          grammarPoints: getSelectedLabels(),
          difficulty,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 || data.code === "INSUFFICIENT_CHALK") {
          setNeedChalk(true);
        }
        setGenError(data.error || "퀴즈 생성에 실패했어요.");
        return;
      }
      setNeedChalk(false);
      setQuizResult(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "네트워크 오류가 발생했어요.";
      setGenError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const publishQuiz = async () => {
    if (!quizResult?.quizId) return;
    setIsPublishing(true);
    setGenError("");
    try {
      const idToken = await getIdToken();
      const res = await fetch(`/api/quiz/${quizResult.quizId}/publish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || "게시에 실패했어요.");
        return;
      }
      setShareInfo(data);
    } catch {
      setGenError("게시 중 오류가 발생했어요.");
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedCount = selectedIds.length;
  const chalkCost = Math.max(3, Math.ceil(count / 2));
  const getVisibleItems = (cat) =>
    cat.items.filter(item => normalizeLevels(item).includes(difficulty));

  // ── 비로그인 게이트 ───────────────────────────────────────────
  // 라이브러리 읽기(quizLibrary)와 퀴즈 생성 모두 로그인이 필요
  if (!user) {
    return (
      <div className="min-h-[400px] bg-slate-50 flex items-center justify-center rounded-xl">
        <div className="text-center">
          <LogIn size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600 mb-1">로그인이 필요한 기능이에요</p>
          <p className="text-xs text-slate-400 mb-4">퀴즈 생성은 로그인 후 이용할 수 있어요.</p>
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("ssamtool:openLogin"))}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  // ── 로딩 화면 ─────────────────────────────────────────────────
  if (libLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 size={18} className="animate-spin" /> 라이브러리 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-5 py-8">

        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400">
              쌤툴 · 퀴즈 생성
              {saving && <span className="ml-2 text-indigo-400">저장 중...</span>}
            </p>
            <h1 className="text-xl font-bold text-slate-900">문법 항목 라이브러리</h1>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
            <button onClick={() => setMode("select")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                mode === "select" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
              }`}>
              <Sparkles size={14} /> 퀴즈 생성
            </button>
            <button onClick={() => setMode("myQuizzes")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                mode === "myQuizzes" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
              }`}>
              <History size={14} /> 내 퀴즈
            </button>
            {admin && (
              <button onClick={() => setMode("admin")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                  mode === "admin" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
                }`}>
                <Settings2 size={14} /> 관리자 설정
              </button>
            )}
          </div>
        </div>

        {/* ── 🆕 빠른 생성 카드 (자유 주제 입력) ─────────────────────── */}
        <div className="mb-5 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-black text-indigo-900 text-base flex items-center gap-1.5">
                <Sparkles size={16} className="text-indigo-500" /> AI 퀴즈 빠른 생성
              </h2>
              <p className="text-xs text-indigo-500 mt-0.5">오늘 수업 주제를 한 줄로 입력하면 바로 퀴즈를 만들어드려요</p>
            </div>
            <div className="text-xs font-bold text-indigo-400 bg-white border border-indigo-200 px-2 py-1 rounded-lg">
              🖍️ {quickCount <= 5 ? 1 : quickCount <= 10 ? 2 : quickCount <= 15 ? 3 : 4}개
            </div>
          </div>

          <textarea
            value={quickTopic}
            onChange={e => { setQuickTopic(e.target.value); setQuickError(""); }}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) quickGenerateQuiz(); }}
            placeholder="예: 조사 에/에서 구별, 과거 시제 -았/었-, 음식 어휘 10개, 존댓말 만들기..."
            rows={2}
            className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 ring-indigo-300 resize-none placeholder-slate-300"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* 난이도 */}
            <div className="flex gap-1 rounded-lg border border-indigo-100 bg-white p-1">
              {[{ v: "beginner", l: "초급" }, { v: "intermediate", l: "중급" }, { v: "advanced", l: "고급" }].map(d => (
                <button key={d.v} onClick={() => setQuickDiff(d.v)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    quickDiff === d.v ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}>{d.l}</button>
              ))}
            </div>

            {/* 문항 수 */}
            <div className="flex gap-1 rounded-lg border border-indigo-100 bg-white p-1">
              {[5, 10, 15, 20].map(n => (
                <button key={n} onClick={() => setQuickCount(n)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                    quickCount === n ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}>{n}문항</button>
              ))}
            </div>

            {/* 생성 버튼 */}
            <button onClick={quickGenerateQuiz}
              disabled={quickLoading || !quickTopic.trim()}
              className="ml-auto flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 shadow transition">
              {quickLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {quickLoading ? "생성 중..." : "퀴즈 생성"}
            </button>
          </div>

          {quickError && (
            <p className="mt-2 text-xs text-rose-500 flex items-center gap-1">
              <AlertCircle size={12} /> {quickError}
            </p>
          )}
        </div>

        {libError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            <AlertCircle size={16} /> {libError}
          </div>
        )}

        {/* 라이브러리 비어있음 — 시드 초기화 (관리자) */}
        {library.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <Database size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500 mb-4">아직 등록된 항목이 없어요.</p>
            {admin ? (
              <button onClick={handleSeed} disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                {saving ? "초기화 중..." : "기본 항목(동국 2A) 불러오기"}
              </button>
            ) : (
              <p className="text-xs text-slate-400">관리자가 항목을 등록하면 사용할 수 있어요.</p>
            )}
          </div>
        )}

        {/* ── 내 퀴즈 모드 ── */}
        {mode === "myQuizzes" && <MyQuizzes getIdToken={getIdToken} />}

        {/* ── 관리자 모드 ── */}
        {mode === "admin" && admin && library.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs text-blue-600">
              💡 항목 옆의 <b>초/중/고</b> 뱃지를 클릭하면 급수를 켜고 끌 수 있어요. 변경은 자동 저장돼요.
            </div>

            <div className="flex gap-2">
              <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCategory()}
                placeholder="새 카테고리 이름 (예: 어휘)"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2" />
              <button onClick={addCategory}
                className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
                <Plus size={15} /> 카테고리
              </button>
            </div>

            {library.map(cat => {
              const colors = COLOR_MAP[cat.color] || COLOR_MAP.slate;
              const isOpen = expanded.has(cat.id);
              const draftLevels = draftItem[cat.id]?.levels || ["beginner"];
              return (
                <div key={cat.id} className="rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between px-4 py-3">
                    <button onClick={() => toggleExpand(cat.id)}
                      className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                      {cat.name}
                      <span className="text-xs font-normal text-slate-400">({cat.items.length})</span>
                    </button>
                    <button onClick={() => removeCategory(cat.id)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500">
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-4 py-3">
                      <div className="mb-3 space-y-2">
                        {cat.items.map(item => {
                          const itemLevels = normalizeLevels(item);
                          return (
                            <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex gap-0.5">
                                  {LEVELS.map(l => {
                                    const active = itemLevels.includes(l.value);
                                    return (
                                      <button key={l.value}
                                        onClick={() => toggleItemLevel(cat.id, item.id, l.value)}
                                        title={`${l.label} ${active ? "해제" : "추가"}`}
                                        className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${
                                          active ? LEVEL_BADGE_ON[l.value] : LEVEL_BADGE_OFF
                                        }`}>
                                        {l.short}
                                      </button>
                                    );
                                  })}
                                </div>
                                <span className="text-sm font-medium text-slate-800">{item.label}</span>
                                {item.note && <span className="text-xs text-slate-400">{item.note}</span>}
                              </div>
                              <button onClick={() => removeItem(cat.id, item.id)}
                                className="rounded p-1 text-slate-300 hover:text-rose-500">
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                        {cat.items.length === 0 && (
                          <p className="py-2 text-xs text-slate-400">아직 등록된 항목이 없어요.</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-slate-400">급수 선택 (복수 가능):</span>
                          {LEVELS.map(l => {
                            const active = draftLevels.includes(l.value);
                            return (
                              <button key={l.value}
                                onClick={() => toggleDraftLevel(cat.id, l.value)}
                                className={`rounded border px-2 py-0.5 text-[11px] font-bold transition ${
                                  active ? LEVEL_BADGE_ON[l.value] : LEVEL_BADGE_OFF
                                }`}>
                                {l.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <input value={draftItem[cat.id]?.label || ""}
                            onChange={e => setDraftItem(prev => ({ ...prev, [cat.id]: { ...prev[cat.id], label: e.target.value } }))}
                            placeholder="항목 (예: 에/에서)"
                            className="w-32 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none ring-slate-300 focus:ring-2" />
                          <input value={draftItem[cat.id]?.note || ""}
                            onChange={e => setDraftItem(prev => ({ ...prev, [cat.id]: { ...prev[cat.id], note: e.target.value } }))}
                            onKeyDown={e => e.key === "Enter" && addItem(cat.id)}
                            placeholder="설명 (선택)"
                            className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none ring-slate-300 focus:ring-2" />
                          <button onClick={() => addItem(cat.id)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                            추가
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── 선택 모드 (강사용) ── */}
        {mode === "select" && library.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex-1 min-w-[140px]">
                <label className="mb-1 block text-xs font-medium text-slate-500">난이도 (급수별 항목 표시)</label>
                <div className="flex gap-1.5">
                  {LEVELS.map(l => (
                    <button key={l.value} onClick={() => handleDifficultyChange(l.value)}
                      className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                        difficulty === l.value
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      }`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs font-medium text-slate-500">문항 수</label>
                <input type="number" min={1} max={20} value={count}
                  onChange={e => handleCountChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none ring-slate-300 focus:ring-2" />
              </div>
            </div>

            {library.map(cat => {
              const colors = COLOR_MAP[cat.color] || COLOR_MAP.slate;
              const visibleItems = getVisibleItems(cat);
              if (visibleItems.length === 0) return null;
              return (
                <div key={cat.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                    <h3 className="text-sm font-semibold text-slate-800">{cat.name}</h3>
                    <span className="text-xs text-slate-400">
                      {LEVELS.find(l => l.value === difficulty)?.label} {visibleItems.length}개
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {visibleItems.map(item => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <button key={item.id} onClick={() => toggleSelect(item.id)}
                          title={item.note}
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                            isSelected
                              ? `${colors.chip} ring-2 ${colors.ring}`
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          }`}>
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {library.every(cat => getVisibleItems(cat).length === 0) && (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                {LEVELS.find(l => l.value === difficulty)?.label} 항목이 아직 없어요.
              </div>
            )}

            {/* 하단 생성 바 */}
            <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
              <span className="text-sm text-slate-500">
                선택된 항목 <span className="font-semibold text-slate-800">{selectedCount}개</span>
                {selectedCount > 0 && (
                  <button onClick={() => setSelectedIds([])}
                    className="ml-2 text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600">
                    선택 해제
                  </button>
                )}
              </span>
              <button onClick={generateQuiz} disabled={selectedCount === 0 || isGenerating || !user}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">
                {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {isGenerating ? "생성 중..." : `퀴즈 생성 (분필 ${chalkCost}개)`}
              </button>
            </div>

            {genError && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <span className="flex items-center gap-2"><AlertCircle size={16} /> {genError}</span>
                {needChalk && (
                  <Link href="/shop"
                    className="flex-shrink-0 rounded-lg bg-[#F2C94C] px-3 py-1.5 text-xs font-bold text-[#1B4332] hover:bg-[#EAB800] transition-colors">
                    🖍️ 분필 충전하기
                  </Link>
                )}
              </div>
            )}

            {quizResult && quizResult.questions?.length > 0 && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 size={16} />
                    생성 완료 · {quizResult.questions.length}문항
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">분필 {quizResult.chalkSpent}개 사용됨</span>
                    <button onClick={() => printQuizExam(quizResult.title || "쌤툴 퀴즈", quizResult.questions)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      <Printer size={13} /> 시험지 인쇄
                    </button>
                    <button onClick={() => setMode("myQuizzes")}
                      className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                      <History size={13} /> 내 퀴즈 목록
                    </button>
                  </div>
                </div>

                {!shareInfo ? (
                  <button onClick={publishQuiz} disabled={isPublishing}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                    {isPublishing && <Loader2 size={14} className="animate-spin" />}
                    {isPublishing ? "게시 중..." : "학생에게 공유하기 (링크 생성)"}
                  </button>
                ) : (
                  <div className="rounded-lg bg-indigo-50 px-3 py-2.5">
                    <div className="flex items-start gap-3">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareInfo.shareUrl)}`}
                        alt="QR 코드" width={90} height={90}
                        className="rounded-lg border border-indigo-200 bg-white p-1 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-indigo-500">학생 접속 링크</p>
                        <p className="font-mono font-medium text-indigo-800 break-all text-sm">{shareInfo.shareUrl}</p>
                        <p className="mt-1 text-xs text-slate-400">코드: {shareInfo.shareCode}</p>
                        <p className="mt-1 text-[11px] text-indigo-400 flex items-center gap-1">
                          <QrCode size={12} /> 교실 화면에 QR을 띄우면 학생들이 바로 접속할 수 있어요
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 우리반 배포 */}
                <DeployToWooriban quizId={quizResult.quizId} getIdToken={getIdToken} />

                {quizResult.questions.map((q, idx) => (
                  <QuestionCard key={idx} q={q} idx={idx}
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
            )}
          </div>
        )}
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
  const [openId,   setOpenId]   = useState(null);   // 결과 펼친 퀴즈
  const [results,  setResults]  = useState({});      // quizId → 결과 데이터
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
  useEffect(() => { load(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // 게시 / 게시중단
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

  // 결과 보기 (토글)
  const toggleResults = async (quizId) => {
    if (openId === quizId) { setOpenId(null); return; }
    setOpenId(quizId);
    if (results[quizId]) return;  // 캐시
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
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {quizzes.length === 0 && !error && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          아직 만든 퀴즈가 없어요.
          <br />퀴즈 생성 탭에서 첫 퀴즈를 만들어보세요!
        </div>
      )}

      {quizzes.map(q => {
        const isOpen = openId === q.quizId;
        const r      = results[q.quizId];
        return (
          <div key={q.quizId} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* 헤더 행 */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-semibold text-slate-800">{q.title || "제목 없음"}</p>
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
                    {/* 요약 */}
                    <div className="flex gap-4 text-xs">
                      <span className="text-slate-500">응시 <b className="text-slate-800">{r.attemptCount}명</b></span>
                      <span className="text-slate-500">평균 <b className="text-slate-800">{r.averageScore}점</b></span>
                    </div>

                    {/* 문항별 정답률 */}
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
                      <p className="mt-1.5 text-[10px] text-slate-400">
                        정답률이 낮은 문항(빨간색)의 문법 항목을 수업에서 다시 다뤄보세요.
                      </p>
                    </div>

                    {/* 학생별 점수 */}
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
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
            {idx + 1}
          </span>
          <span className="text-xs text-slate-400">{q.type}</span>
        </div>
        {quizId && (
          <div className="flex items-center gap-1">
            <button onClick={handleRegenerate} disabled={busy} title="이 문항만 재생성 (분필 1개)"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-indigo-500 hover:bg-indigo-50 disabled:opacity-40">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} 재생성
            </button>
            {canDelete && (
              <button onClick={handleDelete} disabled={busy} title="문항 삭제"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-rose-400 hover:bg-rose-50 disabled:opacity-40">
                <Trash size={12} />
              </button>
            )}
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-slate-800">{q.question}</p>
      {Array.isArray(q.choices) && q.choices.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {q.choices.map((c, ci) => (
            <li key={ci} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
              {c}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-xs text-slate-500">
        정답: <span className="font-medium text-slate-700">{q.answer}</span>
      </p>
      {q.explanation && <p className="mt-0.5 text-xs text-slate-400">{q.explanation}</p>}
      {err && <p className="mt-1 text-[11px] text-rose-500">{err}</p>}
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
    } catch { /* 무시 — 배포 버튼에서 오류 처리 */ }
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
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
        <Send size={14} /> 우리반에 배포하기
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-emerald-700">우리반 반 선택</p>
        <button onClick={() => setOpen(false)} className="text-emerald-400 hover:text-emerald-600 text-xs">닫기</button>
      </div>

      {schools.length === 0 && !err ? (
        <p className="text-xs text-emerald-500 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> 우리반 정보 불러오는 중...</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <select value={schoolId} onChange={e => {
            setSchoolId(e.target.value);
            const s = schools.find(x => x.id === e.target.value);
            const sems = s?.semesters || [];
            setSemester(sems[0] || "");
            setClassId((s?.classes?.[sems[0]] || [])[0] || "");
          }} className="rounded-lg border border-emerald-200 px-2 py-1.5 text-xs">
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={semester} onChange={e => {
            setSemester(e.target.value);
            setClassId((currentSchool?.classes?.[e.target.value] || [])[0] || "");
          }} className="rounded-lg border border-emerald-200 px-2 py-1.5 text-xs">
            {semList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={classId} onChange={e => setClassId(e.target.value)}
            className="rounded-lg border border-emerald-200 px-2 py-1.5 text-xs">
            {classList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {err && <p className="text-[11px] text-rose-500">{err}</p>}

      {result ? (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-white rounded-lg px-3 py-2">
          <CheckCircle2 size={14} /> 우리반에 배포됐어요! ({result.questionCount}문항)
        </div>
      ) : (
        <button onClick={handleDeploy} disabled={busy || schools.length === 0}
          className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-1.5">
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
  const [status, setStatus] = useState("idle"); // idle | claimed | already | error
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
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
        <Gift size={14} className="text-slate-400" />
        {status === "claimed" ? msg : "오늘 출석 체크를 완료했어요. 내일 또 만나요!"}
      </div>
    );
  }

  return (
    <button onClick={handleClaim} disabled={busy}
      className="mb-4 flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-100 transition disabled:opacity-50">
      <span className="flex items-center gap-2"><Gift size={16} /> 오늘의 출석 체크하고 분필 받기</span>
      {busy ? <Loader2 size={14} className="animate-spin" /> : <span className="text-xs font-bold">+1 🖍️</span>}
    </button>
  );
}