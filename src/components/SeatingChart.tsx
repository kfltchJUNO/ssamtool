"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getLayouts, saveLayout, updateLayout, deleteLayout,
  type SeatingLayout, type Desk,
} from "@/lib/seating";

// ── 타입 ──────────────────────────────────────────────────────────
type ElementType = "desk" | "teacher" | "door" | "tv" | "window" | "board";

interface ClassElement {
  id:   string;
  type: ElementType;
  x:    number;
  y:    number;
  studentName?: string | null;
}

interface Props {
  preloadedStudents?: string[];
  preloadedLabel?: string;
  onOpenClassPanel?: () => void;
  isLoggedIn?: boolean;
}

type Mode = "edit" | "assign";

// ── 상수 ──────────────────────────────────────────────────────────
const ELEMENT_META: Record<ElementType, { label: string; icon: string; color: string; border: string }> = {
  desk:    { label: "책상",    icon: "🪑", color: "#FFFFFF", border: "#333333" },
  teacher: { label: "선생님",  icon: "👨‍🏫", color: "#FFF8E1", border: "#F9A825" },
  door:    { label: "문",     icon: "🚪", color: "#F3E5F5", border: "#8E24AA" },
  tv:      { label: "TV",    icon: "📺", color: "#E3F2FD", border: "#1565C0" },
  window:  { label: "창문",   icon: "🪟", color: "#E0F7FA", border: "#00838F" },
  board:   { label: "칠판",   icon: "📋", color: "#E8F5E9", border: "#2E7D32" },
};

const ROOM_ELEMENTS: ElementType[] = ["teacher", "door", "tv", "window", "board"];

function uid8() { return Math.random().toString(36).slice(2, 10); }
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function SeatingChart({
  preloadedStudents = [],
  preloadedLabel = "",
  onOpenClassPanel,
  isLoggedIn,
}: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [mode,        setMode]        = useState<Mode>("edit");
  const [cols,        setCols]        = useState(6);
  const [rows,        setRows]        = useState(5);
  const [elements,    setElements]    = useState<ClassElement[]>([]);
  const [students,    setStudents]    = useState<string[]>([]);
  const [selectedEl,  setSelectedEl]  = useState<string | null>(null);
  const [dragId,      setDragId]      = useState<string | null>(null);
  const [addType,     setAddType]     = useState<ElementType>("desk");

  // 저장
  const [layouts,          setLayouts]          = useState<SeatingLayout[]>([]);
  const [layoutName,       setLayoutName]       = useState("");
  const [currentLayoutId,  setCurrentLayoutId]  = useState<string | null>(null);
  const [showSavePanel,    setShowSavePanel]     = useState(false);
  const [busy,             setBusy]             = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (preloadedStudents.length > 0) setStudents(preloadedStudents); }, [preloadedStudents]);
  useEffect(() => { if (uid) loadLayouts(); }, [uid]); // eslint-disable-line

  const loadLayouts = async () => { if (uid) setLayouts(await getLayouts(uid)); };

  // ── 그리드 클릭: 책상 추가/삭제 ──────────────────────────────────
  const handleCellClick = (x: number, y: number) => {
    if (mode !== "edit") return;
    const existing = elements.find(e => e.x === x && e.y === y);
    if (existing) {
      // 이미 있는 요소 선택
      setSelectedEl(existing.id);
    } else {
      // 새 요소 추가
      setElements(prev => [...prev, {
        id: uid8(), type: addType, x, y,
        studentName: addType === "desk" ? null : undefined,
      }]);
    }
  };

  // ── 요소 삭제 ────────────────────────────────────────────────────
  const deleteElement = (id: string) => {
    setElements(prev => prev.filter(e => e.id !== id));
    setSelectedEl(null);
  };

  // ── 드래그앤드롭 ─────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    if (!dragId) return;
    const occupant = elements.find(el => el.x === x && el.y === y && el.id !== dragId);
    if (occupant) {
      // 두 요소 위치 교환
      const dragEl = elements.find(el => el.id === dragId);
      if (!dragEl) return;
      setElements(prev => prev.map(el => {
        if (el.id === dragId)    return { ...el, x, y };
        if (el.id === occupant.id) return { ...el, x: dragEl.x, y: dragEl.y };
        return el;
      }));
    } else {
      setElements(prev => prev.map(el => el.id === dragId ? { ...el, x, y } : el));
    }
    setDragId(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

  // ── 학생 배치 ────────────────────────────────────────────────────
  const desks = elements.filter(e => e.type === "desk");

  const assignStudent = (id: string, name: string | null) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, studentName: name } : e));
    setSelectedEl(null);
  };

  const randomAssign = () => {
    const shuffled = shuffle(students);
    const desksSorted = [...desks].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
    setElements(prev => prev.map(el => {
      if (el.type !== "desk") return el;
      const idx = desksSorted.findIndex(d => d.id === el.id);
      return { ...el, studentName: shuffled[idx] ?? null };
    }));
    setSelectedEl(null);
  };

  const clearAssign = () => {
    setElements(prev => prev.map(e => e.type === "desk" ? { ...e, studentName: null } : e));
  };

  // ── 레이아웃 저장/불러오기 ───────────────────────────────────────
  const handleSave = async () => {
    if (!uid || !layoutName.trim()) return;
    setBusy(true);
    try {
      // SeatingLayout 형식으로 변환

      const data = {
        name: layoutName.trim(), cols, rows,
        desks: elements.map(el => ({ ...el, studentName: el.studentName ?? null })) as unknown as Desk[],
        teacherX: 0, teacherY: 0,
      };
      if (currentLayoutId) { await updateLayout(uid, currentLayoutId, data); }
      else { const id = await saveLayout(uid, data); setCurrentLayoutId(id); }
      await loadLayouts();
      setShowSavePanel(false);
    } finally { setBusy(false); }
  };

  const loadLayout = (l: SeatingLayout) => {
    setCols(l.cols); setRows(l.rows);
    // desks 배열에 type 필드가 있으면 사용, 없으면 desk로 기본값
    const els = (l.desks as unknown as ClassElement[]).map(d => ({
      id:   d.id ?? uid8(),
      type: (d as ClassElement).type ?? "desk",
      x:    d.x,
      y:    d.y,
      studentName: d.studentName ?? null,
    }));
    setElements(els);
    setLayoutName(l.name);
    setCurrentLayoutId(l.id);
    setShowSavePanel(false);
  };

  const handleDelete = async (id: string) => {
    if (!uid || !confirm("삭제할까요?")) return;
    await deleteLayout(uid, id);
    if (currentLayoutId === id) { setCurrentLayoutId(null); setLayoutName(""); }
    await loadLayouts();
  };

  // ── 인쇄 ─────────────────────────────────────────────────────────
  const buildPrintHTML = (mirror: boolean) => {
    const cW = 100, cH = 60, gap = 6;
    const totalW = cols * (cW + gap);
    const totalH = (rows + 1) * (cH + gap);

    let cells = "";
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c < cols; c++) {
        const displayC = mirror ? (cols - 1 - c) : c;
        const el = elements.find(e => e.x === displayC && e.y === r);
        const px = c * (cW + gap);
        const py = r * (cH + gap);

        if (!el) continue;
        const meta = ELEMENT_META[el.type];
        const nameSize = el.studentName && el.studentName.length > 3 ? 14 : 17;

        cells += `<div style="
          position:absolute;left:${px}px;top:${py}px;
          width:${cW}px;height:${cH}px;
          background:${el.type==="desk"?"#fff":meta.color};
          border:${el.type==="desk"?"1.5px solid #333":"2px solid "+meta.border};
          border-radius:6px;
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
          box-sizing:border-box;
        ">
          ${el.type !== "desk" ? `<span style="font-size:16px;line-height:1;">${meta.icon}</span><span style="font-size:10px;color:#555;font-weight:600;">${meta.label}</span>` : ""}
          ${el.type === "desk" ? `<span style="font-size:${nameSize}px;font-weight:900;color:#111;text-align:center;padding:0 4px;">${el.studentName ?? ""}</span>` : ""}
        </div>`;
      }
    }

    const title = mirror ? "📋 자리표 (학생 입장)" : "📋 자리표 (선생님 입장)";
    return `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:700;color:#333;margin-bottom:8px;">${title}${preloadedLabel ? " — " + preloadedLabel : ""}</div>
        <div style="position:relative;width:${totalW}px;height:${totalH}px;">${cells}</div>
      </div>
    `;
  };

  const handlePrint = (type: "teacher" | "student" | "both") => {
    let body = "";
    if (type === "teacher") body = buildPrintHTML(false);
    else if (type === "student") body = buildPrintHTML(true);
    else body = buildPrintHTML(false) + '<div style="page-break-after:always"></div>' + buildPrintHTML(true);

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
      <style>@page{size:A4 landscape;margin:12mm}body{font-family:'Noto Sans KR',sans-serif;margin:0}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&display=swap">
    </head><body>${body}
      <script>document.fonts.ready.then(()=>setTimeout(()=>{window.print();window.close();},300))</script>
    </body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    iframe.contentWindow?.addEventListener("afterprint", () => document.body.removeChild(iframe));
  };

  // ── 파생 값 ──────────────────────────────────────────────────────
  const assigned   = desks.filter(d => d.studentName).length;
  const unassigned = students.filter(s => !desks.some(d => d.studentName === s));
  const selectedElement = elements.find(e => e.id === selectedEl);

  const inputCls = "border border-[#E8E0D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332]";

  // ── 렌더 ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-bold text-[#1B4332] text-lg">자리표</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {isLoggedIn && onOpenClassPanel && (
              <button onClick={onOpenClassPanel}
                className="flex items-center gap-1 text-xs text-[#1B4332] font-semibold bg-[#F0FFF4] border border-[#9AE6B4] px-2.5 py-1.5 rounded-lg hover:bg-[#D4EDDA] transition-colors">
                👥 반 불러오기
              </button>
            )}
            {isLoggedIn && (
              <button onClick={() => setShowSavePanel(v => !v)}
                className="text-xs px-2.5 py-1.5 border border-[#E8E0D0] rounded-lg text-[#4A4A4A] hover:border-[#1B4332] transition-colors">
                💾 레이아웃
              </button>
            )}
            {/* 인쇄 드롭다운 */}
            <div className="relative group">
              <button className="px-3 py-1.5 bg-[#F2C94C] text-[#1B4332] text-xs font-bold rounded-lg hover:bg-[#EAB800] transition-colors">
                🖨️ 인쇄 ▾
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#E8E0D0] rounded-xl shadow-lg py-1 z-20 hidden group-hover:block min-w-[150px]">
                <button onClick={() => handlePrint("teacher")}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#F0FFF4] transition-colors">
                  👨‍🏫 선생님 입장
                </button>
                <button onClick={() => handlePrint("student")}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#F0FFF4] transition-colors">
                  🧑‍🎓 학생 입장
                </button>
                <button onClick={() => handlePrint("both")}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#F0FFF4] font-semibold transition-colors">
                  📄 둘 다 인쇄
                </button>
              </div>
            </div>
          </div>
        </div>

        {preloadedLabel && (
          <div className="text-xs text-[#2D6A4F] bg-[#F0FFF4] px-3 py-1.5 rounded-lg border border-[#9AE6B4] mb-3">
            ✅ {preloadedLabel} · {students.length}명
          </div>
        )}

        {/* 레이아웃 저장/불러오기 */}
        {showSavePanel && (
          <div className="mb-4 p-4 bg-[#F9F9F9] rounded-xl border border-[#E8E0D0] space-y-3">
            <div className="flex gap-2">
              <input value={layoutName} onChange={e => setLayoutName(e.target.value)}
                placeholder="레이아웃 이름 (예: ㄷ자 배열)" className={`flex-1 ${inputCls}`} />
              <button onClick={handleSave} disabled={busy || !layoutName.trim()}
                className="px-4 py-2 bg-[#1B4332] text-white text-sm font-semibold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40">
                저장
              </button>
            </div>
            {layouts.map(l => (
              <div key={l.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-[#E8E0D0]">
                <span className="flex-1 text-sm">{l.name}</span>
                <span className="text-[11px] text-[#9A9A9A]">{l.cols}×{l.rows}</span>
                <button onClick={() => loadLayout(l)} className="text-xs text-[#1B4332] font-semibold underline underline-offset-2">불러오기</button>
                <button onClick={() => handleDelete(l.id)} className="text-[#CCC] hover:text-red-500 text-sm">🗑</button>
              </div>
            ))}
          </div>
        )}

        {/* 모드 전환 */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex rounded-lg border border-[#E8E0D0] overflow-hidden">
            {(["edit","assign"] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${mode===m ? "bg-[#1B4332] text-white" : "text-[#4A4A4A] hover:bg-[#F5F0E8]"}`}>
                {m === "edit" ? "✏️ 교실 편집" : "👤 학생 배치"}
              </button>
            ))}
          </div>

          {mode === "edit" && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* 그리드 크기 */}
              <select value={cols} onChange={e => setCols(Number(e.target.value))} className={inputCls}>
                {Array.from({length:10},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-xs text-[#4A4A4A]">×</span>
              <select value={rows} onChange={e => setRows(Number(e.target.value))} className={inputCls}>
                {Array.from({length:8},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-xs text-[#9A9A9A]">칸</span>
            </div>
          )}

          {mode === "assign" && (
            <div className="flex gap-2">
              <button onClick={randomAssign} disabled={students.length===0}
                className="px-3 py-1.5 bg-[#1B4332] text-white text-xs font-bold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40">
                🎲 랜덤 배치
              </button>
              <button onClick={clearAssign}
                className="px-3 py-1.5 border border-[#E8E0D0] text-[#4A4A4A] text-xs rounded-lg hover:border-[#1B4332]">
                초기화
              </button>
            </div>
          )}
        </div>

        {/* 편집 모드: 요소 추가 팔레트 */}
        {mode === "edit" && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#4A4A4A]">추가할 요소:</span>
            {(["desk", ...ROOM_ELEMENTS] as ElementType[]).map(type => {
              const meta = ELEMENT_META[type];
              return (
                <button key={type} onClick={() => setAddType(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                    addType === type
                      ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332]"
                      : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"
                  }`}
                  style={{ borderColor: addType === type ? meta.border : undefined, background: addType === type ? meta.color : undefined }}
                >
                  <span>{meta.icon}</span><span>{meta.label}</span>
                </button>
              );
            })}
            <span className="text-[11px] text-[#9A9A9A] ml-1">클릭 추가 · 드래그 이동 · 선택 후 삭제</span>
          </div>
        )}

        {/* 안내 */}
        <p className="text-[11px] text-[#9A9A9A] mb-3">
          {mode === "edit"
            ? "📌 빈 칸 클릭 → 요소 추가 · 요소 드래그 → 위치 변경 · 요소 클릭 → 선택/삭제"
            : `📌 책상 클릭 → 학생 선택 · ${assigned}/${desks.length}석 배치 · 미배치 ${unassigned.length}명`}
        </p>

        {/* ── 그리드 ── */}
        <div className="overflow-x-auto pb-2" ref={gridRef}>
          <div
            className="inline-grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${cols}, 64px)` }}
          >
            {Array.from({length: rows+1}).map((_, r) =>
              Array.from({length: cols}).map((_, c) => {
                const el = elements.find(e => e.x === c && e.y === r);
                const meta = el ? ELEMENT_META[el.type] : null;
                const isSel = el && selectedEl === el.id;
                const isDesk = el?.type === "desk";

                return (
                  <div
                    key={`${c}-${r}`}
                    className={`h-14 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer select-none transition-all text-center px-1 ${
                      !el
                        ? mode==="edit"
                          ? "bg-[#F9F9F9] border-dashed border-[#D0D0D0] hover:border-[#1B4332] hover:bg-[#F0FFF4]"
                          : "bg-transparent border-transparent pointer-events-none"
                        : isSel
                          ? "ring-2 ring-[#F2C94C] ring-offset-1"
                          : isDesk
                            ? "hover:border-[#1B4332] hover:shadow-sm"
                            : "hover:opacity-80"
                    }`}
                    style={el && meta ? {
                      background: isDesk ? "#fff" : meta.color,
                      borderColor: isSel ? "#F2C94C" : meta.border,
                      borderStyle: el ? "solid" : undefined,
                    } : undefined}
                    onClick={() => {
                      if (mode === "edit") {
                        if (el) { setSelectedEl(prev => prev === el.id ? null : el.id); }
                        else handleCellClick(c, r);
                      } else if (el?.type === "desk") {
                        setSelectedEl(prev => prev === el.id ? null : el.id);
                      }
                    }}
                    draggable={!!el && mode === "edit"}
                    onDragStart={el ? e => handleDragStart(e, el.id) : undefined}
                    onDragOver={handleDragOver}
                    onDrop={e => handleDrop(e, c, r)}
                  >
                    {el && meta && (
                      <>
                        {!isDesk && <span style={{fontSize:18, lineHeight:1}}>{meta.icon}</span>}
                        {!isDesk && <span style={{fontSize:10, color:"#555", fontWeight:600}}>{meta.label}</span>}
                        {isDesk && (
                          <span style={{
                            fontSize: el.studentName && el.studentName.length > 3 ? 10 : el.studentName ? 13 : 18,
                            fontWeight: 900,
                            color: "#111",
                            lineHeight: 1.2,
                          }}>
                            {el.studentName ?? (mode === "edit" ? meta.icon : <span style={{fontSize:10,color:"#CCC"}}>빈 자리</span>)}
                          </span>
                        )}
                      </>
                    )}
                    {!el && mode === "edit" && (
                      <span style={{color:"#D0D0D0",fontSize:20}}>+</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 선택된 요소 액션 */}
        {selectedElement && mode === "edit" && (
          <div className="mt-3 flex items-center gap-3 px-3 py-2.5 bg-[#FFF8E1] border border-[#F9A825] rounded-xl">
            <span className="text-lg">{ELEMENT_META[selectedElement.type].icon}</span>
            <span className="text-sm font-semibold text-[#5D4037] flex-1">
              {ELEMENT_META[selectedElement.type].label} 선택됨 ({selectedElement.x+1}열, {selectedElement.y+1}행)
            </span>
            <button onClick={() => deleteElement(selectedElement.id)}
              className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors">
              🗑 삭제
            </button>
            <button onClick={() => setSelectedEl(null)}
              className="px-3 py-1.5 border border-[#E8E0D0] text-[#4A4A4A] text-xs rounded-lg hover:border-[#1B4332]">
              취소
            </button>
          </div>
        )}

        {/* 배치 모드: 학생 선택 */}
        {selectedEl && mode === "assign" && selectedElement?.type === "desk" && (
          <div className="mt-4 p-3 bg-[#F9F9F9] rounded-xl border border-[#E8E0D0]">
            <p className="text-xs font-semibold text-[#4A4A4A] mb-2">학생 선택</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => assignStudent(selectedEl, null)}
                className="px-3 py-1.5 rounded-lg text-xs border-2 border-dashed border-[#E8E0D0] text-[#9A9A9A] hover:border-red-300 hover:text-red-500">
                비우기
              </button>
              {students.map(s => {
                const taken = desks.some(d => d.id !== selectedEl && d.studentName === s);
                return (
                  <button key={s} onClick={() => !taken && assignStudent(selectedEl, s)} disabled={taken}
                    className={`px-3 py-1.5 rounded-lg text-xs border-2 font-semibold transition-all ${
                      taken
                        ? "border-[#E8E0D0] text-[#CCC] line-through"
                        : "border-[#9AE6B4] text-[#1B4332] bg-[#F0FFF4] hover:bg-[#D4EDDA]"
                    }`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 미배치 학생 */}
        {mode === "assign" && unassigned.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] text-[#9A9A9A]">미배치:</span>
            {unassigned.map(s => (
              <span key={s} className="px-2 py-0.5 bg-[#FFF5F5] border border-[#FEB2B2] rounded text-xs text-red-600">{s}</span>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}