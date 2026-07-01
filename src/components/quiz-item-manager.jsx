import { useState } from "react";
import {
  Plus, X, Settings2, Sparkles, ChevronDown, ChevronRight,
  Trash2, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import { auth } from "@/lib/firebase";

// 기본 시드 데이터 — 동국 한국어 2A 커리큘럼 항목/카테고리
const SEED_LIBRARY = [
  {
    id: "cat-particle",
    name: "조사",
    color: "indigo",
    items: [
      { id: "p1", label: "에서", note: "장소(활동이 이루어지는 곳)" },
      { id: "p2", label: "에게", note: "방향" },
      { id: "p3", label: "부터", note: "시작점" },
      { id: "p4", label: "까지", note: "끝점/한정" },
    ],
  },
  {
    id: "cat-grammar",
    name: "문법",
    color: "amber",
    items: [
      { id: "g1", label: "-고 있다", note: "진행" },
      { id: "g2", label: "-아/어 보다", note: "시도" },
      { id: "g3", label: "-(으)ㄹ 것 같다", note: "추측 표현/불확실" },
    ],
  },
  {
    id: "cat-error",
    name: "오류 유형",
    color: "rose",
    items: [
      { id: "e1", label: "조사 오류", note: "조사 선택 오류" },
      { id: "e2", label: "시제 사용 오류", note: "시제 사용의 오류" },
    ],
  },
];

const COLOR_MAP = {
  indigo: { chip: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500", ring: "ring-indigo-500" },
  amber:  { chip: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500",  ring: "ring-amber-500"  },
  rose:   { chip: "bg-rose-50 text-rose-700 border-rose-200",      dot: "bg-rose-500",   ring: "ring-rose-500"   },
  slate:  { chip: "bg-slate-50 text-slate-700 border-slate-200",   dot: "bg-slate-400",  ring: "ring-slate-400"  },
};

const COLOR_KEYS = Object.keys(COLOR_MAP);

export default function QuizItemManager() {
  const [mode,         setMode]         = useState("select");
  const [library,      setLibrary]      = useState(SEED_LIBRARY);
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [expanded,     setExpanded]     = useState(() => new Set(SEED_LIBRARY.map(c => c.id)));
  const [difficulty,   setDifficulty]   = useState("beginner");
  const [count,        setCount]        = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError,     setGenError]     = useState("");
  const [quizResult,   setQuizResult]   = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [shareInfo,    setShareInfo]    = useState(null);
  const [newCatName,   setNewCatName]   = useState("");
  const [draftItem,    setDraftItem]    = useState({});

  const toggleExpand = catId => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  const toggleSelect = itemId => {
    setSelectedIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const addCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    const usedColors = library.map(c => c.color);
    const color = COLOR_KEYS.find(c => !usedColors.includes(c)) || "slate";
    const id = `cat-${Date.now()}`;
    setLibrary(prev => [...prev, { id, name, color, items: [] }]);
    setExpanded(prev => new Set(prev).add(id));
    setNewCatName("");
  };

  const removeCategory = catId => {
    setLibrary(prev => prev.filter(c => c.id !== catId));
    setSelectedIds(prev => {
      const cat = library.find(c => c.id === catId);
      const ids = cat ? cat.items.map(i => i.id) : [];
      return prev.filter(id => !ids.includes(id));
    });
  };

  const addItem = catId => {
    const draft = draftItem[catId];
    const label = draft?.label?.trim();
    if (!label) return;
    const id = `item-${Date.now()}`;
    setLibrary(prev =>
      prev.map(c =>
        c.id === catId
          ? { ...c, items: [...c.items, { id, label, note: draft?.note?.trim() || "" }] }
          : c
      )
    );
    setDraftItem(prev => ({ ...prev, [catId]: { label: "", note: "" } }));
  };

  const removeItem = (catId, itemId) => {
    setLibrary(prev =>
      prev.map(c => c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c)
    );
    setSelectedIds(prev => prev.filter(id => id !== itemId));
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

  // ── Firebase Auth에서 ID 토큰 가져오기 ───────────────────────
  const getIdToken = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("로그인이 필요해요.");
    return currentUser.getIdToken();
  };

  // ── 퀴즈 생성 ─────────────────────────────────────────────────
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
    } catch (err) {
      setGenError(err.message || "네트워크 오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── 퀴즈 게시: 학생용 링크 생성 ──────────────────────────────
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
    } catch (err) {
      setGenError("게시 중 오류가 발생했어요.");
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedCount = selectedIds.length;
  const chalkCost = Math.max(3, Math.ceil(count / 2));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-5 py-8">

        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400">쌤툴 · 퀴즈 생성</p>
            <h1 className="text-xl font-bold text-slate-900">문법 항목 라이브러리</h1>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
            <button onClick={() => setMode("select")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                mode === "select" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
              }`}>
              <Sparkles size={14} /> 퀴즈 생성
            </button>
            <button onClick={() => setMode("admin")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                mode === "admin" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
              }`}>
              <Settings2 size={14} /> 관리자 설정
            </button>
          </div>
        </div>

        {/* ── 관리자 모드 ── */}
        {mode === "admin" && (
          <div className="space-y-4">
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
                        {cat.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                            <div>
                              <span className="text-sm font-medium text-slate-800">{item.label}</span>
                              {item.note && <span className="ml-2 text-xs text-slate-400">{item.note}</span>}
                            </div>
                            <button onClick={() => removeItem(cat.id, item.id)}
                              className="rounded p-1 text-slate-300 hover:text-rose-500">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        {cat.items.length === 0 && (
                          <p className="py-2 text-xs text-slate-400">아직 등록된 항목이 없어요.</p>
                        )}
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
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── 선택 모드 (강사용) ── */}
        {mode === "select" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex-1 min-w-[140px]">
                <label className="mb-1 block text-xs font-medium text-slate-500">난이도</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none ring-slate-300 focus:ring-2">
                  <option value="beginner">초급</option>
                  <option value="intermediate">중급</option>
                  <option value="advanced">고급</option>
                </select>
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
              return (
                <div key={cat.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                    <h3 className="text-sm font-semibold text-slate-800">{cat.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cat.items.map(item => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <button key={item.id} onClick={() => toggleSelect(item.id)}
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                            isSelected
                              ? `${colors.chip} ring-2 ${colors.ring}`
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          }`}>
                          {item.label}
                        </button>
                      );
                    })}
                    {cat.items.length === 0 && (
                      <p className="text-xs text-slate-400">관리자 설정에서 항목을 먼저 추가해주세요.</p>
                    )}
                  </div>
                </div>
              );
            })}

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
              <button onClick={generateQuiz} disabled={selectedCount === 0 || isGenerating}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">
                {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {isGenerating ? "생성 중..." : `퀴즈 생성 (분필 ${chalkCost}개)`}
              </button>
            </div>

            {genError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <AlertCircle size={16} />
                {genError}
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

                {/* 게시 / 공유 링크 */}
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