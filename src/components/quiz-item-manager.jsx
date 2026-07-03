import { useState, useEffect } from "react";
import {
  Plus, X, Settings2, Sparkles, ChevronDown, ChevronRight,
  Trash2, Loader2, CheckCircle2, AlertCircle, Database,
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
  useEffect(() => { reload(); }, []);

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
        setGenError(data.error || "퀴즈 생성에 실패했어요.");
        return;
      }
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
                  onChange={e => setCount(Number(e.target.value))}
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
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <AlertCircle size={16} /> {genError}
              </div>
            )}

            {quizResult && quizResult.questions?.length > 0 && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 size={16} />
                    생성 완료 · {quizResult.questions.length}문항
                  </div>
                  <span className="text-xs text-slate-400">분필 {quizResult.chalkSpent}개 사용됨</span>
                </div>

                {!shareInfo ? (
                  <button onClick={publishQuiz} disabled={isPublishing}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                    {isPublishing && <Loader2 size={14} className="animate-spin" />}
                    {isPublishing ? "게시 중..." : "학생에게 공유하기 (링크 생성)"}
                  </button>
                ) : (
                  <div className="rounded-lg bg-indigo-50 px-3 py-2.5 text-sm">
                    <p className="text-xs text-indigo-500">학생 접속 링크</p>
                    <p className="font-mono font-medium text-indigo-800 break-all">{shareInfo.shareUrl}</p>
                    <p className="mt-1 text-xs text-slate-400">코드: {shareInfo.shareCode}</p>
                  </div>
                )}

                {quizResult.questions.map((q, idx) => (
                  <div key={idx} className="rounded-lg bg-slate-50 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-slate-400">{q.type}</span>
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}