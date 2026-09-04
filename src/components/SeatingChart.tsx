"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getLayouts, saveLayout, updateLayout, deleteLayout,
  getSeatingCharts, saveSeatingChart,
  assignSeats,
  type SeatingLayout, type SeatingChart as SeatingChartDoc,
  type Student, type ClassElement, type AssignOptions, type AssignResult
} from "@/lib/seating";

// ── 타입 정의 ──────────────────────────────────────────────────────
type ElementType = "desk" | "teacher" | "door" | "tv" | "window" | "board";
type PaperSize = "A4" | "A3" | "Letter";
type Orientation = "landscape" | "portrait";

interface Props {
  preloadedStudents?: string[];
  preloadedLabel?: string;
  onOpenClassPanel?: () => void;
  isLoggedIn?: boolean;
}

// ── 기물 메타데이터 ────────────────────────────────────────────────
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

export default function SeatingChart({
  preloadedStudents = [],
  preloadedLabel = "",
  onOpenClassPanel,
  isLoggedIn,
}: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  // 교실 기본 그리드 및 구조 (Layout)
  const [cols, setCols] = useState(6);
  const [rows, setRows] = useState(5);
  const [elements, setElements] = useState<ClassElement[]>([]);
  const [layoutName, setLayoutName] = useState("302호 교실");
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);

  // 구조 잠금 (Task 2)
  const [isLocked, setIsLocked] = useState(true);

  // 학생 명단 (Student 객체 배열 - Task 1 고유 ID 관리)
  const [students, setStudents] = useState<Student[]>([]);
  
  // 자리 배정 결과 (assignments: Map<deskId, studentId>)
  const [assignments, setAssignments] = useState<Map<string, string>>(new Map());
  const [assignResult, setAssignResult] = useState<AssignResult | null>(null);

  // UI 조작 상태
  const [selectedEl, setSelectedEl] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [addType, setAddType] = useState<ElementType>("desk");
  
  // 저장된 레이아웃 & 시점별 배치 차트 목록
  const [layouts, setLayouts] = useState<SeatingLayout[]>([]);
  const [charts, setCharts] = useState<SeatingChartDoc[]>([]);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [busy, setBusy] = useState(false);

  // 추가 배치 옵션 (Task 2)
  const [showAssignOptions, setShowAssignOptions] = useState(false);
  const [avoidPrevious, setAvoidPrevious] = useState(false);
  const [separateSameTags, setSeparateSameTags] = useState(false);
  const [separatedPairs, setSeparatedPairs] = useState<[string, string][]>([]);
  const [pairStudent1, setPairStudent1] = useState("");
  const [pairStudent2, setPairStudent2] = useState("");

  // 인쇄 옵션 모달 (Task 3)
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");
  const [paperOrientation, setPaperOrientation] = useState<Orientation>("landscape");
  const [printPerspective, setPrintPerspective] = useState<"teacher" | "student">("teacher");

  // 학생 명단이 외부(반 선택)에서 들어올 때 고유 ID 마이그레이션 부여
  useEffect(() => {
    if (preloadedStudents.length > 0) {
      const converted: Student[] = preloadedStudents.map((name, i) => ({
        id: `st-${i}-${name.trim()}`,
        name: name.trim(),
        tag: "", // 기본 태그
      }));
      setStudents(converted);
    }
  }, [preloadedStudents]);

  useEffect(() => {
    if (uid) {
      loadLayouts();
    }
  }, [uid]); // eslint-disable-line

  const loadLayouts = async () => {
    if (!uid) return;
    const list = await getLayouts(uid);
    setLayouts(list);
    if (list.length > 0 && !currentLayoutId) {
      loadLayout(list[0]);
    }
  };

  const loadChartsForLayout = async (layoutId: string) => {
    if (!uid) return;
    const chartList = await getSeatingCharts(uid, layoutId);
    setCharts(chartList);
  };

  // ── 1. 학생 무작위 배치 실행 (Task 1 순수 함수 호출) ────────────────
  const handleRandomAssign = () => {
    if (students.length === 0) return;
    
    let previousAssignments: { deskId: string; studentId: string }[] | undefined = undefined;
    if (avoidPrevious && charts.length > 0) {
      previousAssignments = charts[0].assignments;
    }

    const options: AssignOptions = {
      avoidPrevious: previousAssignments,
      separateSameTags,
      separatedPairs,
    };

    const result = assignSeats(students, elements, options);
    setAssignments(result.assignments);
    setAssignResult(result);
  };

  const handleClearAssign = () => {
    setAssignments(new Map());
    setAssignResult(null);
  };

  // ── 2. 레이아웃 & 배정 CRUD ─────────────────────────────────────
  const loadLayout = (l: SeatingLayout) => {
    setCols(l.cols);
    setRows(l.rows);
    setElements(l.elements);
    setLayoutName(l.name);
    setCurrentLayoutId(l.id);
    setIsLocked(true); // 불러오기 시 구조 고정 기본값
    loadChartsForLayout(l.id);
  };

  const handleSaveLayout = async () => {
    if (!uid) {
      alert("로그인이 필요한 기능입니다. 먼저 로그인해 주세요.");
      return;
    }
    const name = layoutName.trim();
    if (!name) {
      alert("레이아웃 이름을 입력해 주세요. (예: 302호 ㄷ자 구조)");
      return;
    }
    setBusy(true);
    try {
      const cleanElements = elements.map(el => ({
        id: el.id,
        type: el.type,
        x: el.x,
        y: el.y,
      }));

      const data = {
        name,
        cols,
        rows,
        elements: cleanElements,
      };
      if (currentLayoutId) {
        await updateLayout(uid, currentLayoutId, data);
      } else {
        const newId = await saveLayout(uid, data);
        setCurrentLayoutId(newId);
      }
      await loadLayouts();
      setShowSavePanel(false);
      alert(`'${name}' 교실 레이아웃 구조가 성공적으로 저장되었습니다!`);
    } catch (err: unknown) {
      console.error("[handleSaveLayout Error]", err);
      alert("레이아웃 저장 중 오류가 발생했습니다: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  // 레이아웃 복제 기능
  const handleCloneLayout = async (l: SeatingLayout) => {
    if (!uid) {
      alert("로그인이 필요합니다.");
      return;
    }
    setBusy(true);
    try {
      const cloneData = {
        name: `${l.name} (복사본)`,
        cols: l.cols,
        rows: l.rows,
        elements: [...l.elements],
      };
      const newId = await saveLayout(uid, cloneData);
      await loadLayouts();
      const updatedList = await getLayouts(uid);
      const cloned = updatedList.find(item => item.id === newId);
      if (cloned) loadLayout(cloned);
      alert("레이아웃이 성공적으로 복제되었습니다!");
    } catch (err: unknown) {
      console.error("[handleCloneLayout Error]", err);
      alert("복제 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLayout = async (id: string) => {
    if (!uid || !confirm("이 교실 구조 레이아웃을 삭제할까요?")) return;
    await deleteLayout(uid, id);
    if (currentLayoutId === id) {
      setCurrentLayoutId(null);
      setLayoutName("");
    }
    await loadLayouts();
  };

  // 배정 결과 히스토리 저장
  const handleSaveChart = async () => {
    if (!uid) {
      alert("로그인이 필요한 기능입니다. 먼저 로그인해 주세요.");
      return;
    }
    if (assignments.size === 0) {
      alert("배정된 학생이 없습니다. 먼저 '학생만 다시 섞기'를 눌러 자리를 배정한 후 저장해 주세요.");
      return;
    }

    setBusy(true);
    try {
      let targetLayoutId = currentLayoutId;

      // 만약 저장된 레이아웃이 없다면, 현재 구조를 자동 저장하여 layoutId 생성
      if (!targetLayoutId) {
        const name = layoutName.trim() || "교실 구조";
        const cleanElements = elements.map(el => ({
          id: el.id,
          type: el.type,
          x: el.x,
          y: el.y,
        }));
        targetLayoutId = await saveLayout(uid, {
          name,
          cols,
          rows,
          elements: cleanElements,
        });
        setCurrentLayoutId(targetLayoutId);
        await loadLayouts();
      }

      const chartAssignments = Array.from(assignments.entries()).map(([deskId, studentId]) => ({
        deskId,
        studentId,
      }));

      await saveSeatingChart(uid, {
        layoutId: targetLayoutId,
        title: `${layoutName || "교실"} - ${new Date().toLocaleDateString("ko-KR")} 배정`,
        assignments: chartAssignments,
      });

      if (targetLayoutId) loadChartsForLayout(targetLayoutId);
      alert("현재 자리 배정 결과가 저장되었습니다!");
    } catch (err: unknown) {
      console.error("[handleSaveChart Error]", err);
      alert("자리 배정 결과 저장 중 오류가 발생했습니다: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  };

  // ── 3. 그리드 및 드래그 앤 드롭 ────────────────────────────────
  const handleCellClick = (x: number, y: number) => {
    if (isLocked) return; // 구조 고정 시 편집 불가
    const existing = elements.find(e => e.x === x && e.y === y);
    if (existing) {
      setSelectedEl(existing.id);
    } else {
      setElements(prev => [...prev, { id: uid8(), type: addType, x, y }]);
    }
  };

  const deleteElement = (id: string) => {
    if (isLocked) return;
    setElements(prev => prev.filter(e => e.id !== id));
    setSelectedEl(null);
  };

  const handleAddDeskToFillUnassigned = () => {
    if (!assignResult || assignResult.unassigned.length === 0) return;
    setIsLocked(false);
    // 빈 셀 찾아서 책상 추가
    const needed = assignResult.unassigned.length;
    let added = 0;
    const newElements = [...elements];

    for (let r = 0; r < rows && added < needed; r++) {
      for (let c = 0; c < cols && added < needed; c++) {
        const occupied = newElements.some(e => e.x === c && e.y === r);
        if (!occupied) {
          newElements.push({ id: uid8(), type: "desk", x: c, y: r });
          added++;
        }
      }
    }
    setElements(newElements);
    alert(`책상 ${added}개가 추가되었습니다. '학생만 다시 섞기'를 눌러 배정을 완료하세요.`);
  };

  // 개별 학생 자리 드래그 앤 드롭 (배정 모드)
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    if (!dragId) return;

    if (!isLocked) {
      // 구조 편집 모드일 때 기물 위치 변경
      const occupant = elements.find(el => el.x === x && el.y === y && el.id !== dragId);
      if (occupant) {
        const dragEl = elements.find(el => el.id === dragId);
        if (!dragEl) return;
        setElements(prev => prev.map(el => {
          if (el.id === dragId) return { ...el, x, y };
          if (el.id === occupant.id) return { ...el, x: dragEl.x, y: dragEl.y };
          return el;
        }));
      } else {
        setElements(prev => prev.map(el => el.id === dragId ? { ...el, x, y } : el));
      }
    } else {
      // 구조 잠금 (학생 배정) 모드일 때 책상 간 학생 수동 자리 교환
      const targetDesk = elements.find(el => el.x === x && el.y === y && el.type === "desk");
      const sourceDesk = elements.find(el => el.id === dragId && el.type === "desk");
      if (targetDesk && sourceDesk) {
        const sourceStudent = assignments.get(sourceDesk.id);
        const targetStudent = assignments.get(targetDesk.id);

        setAssignments(prev => {
          const next = new Map(prev);
          if (targetStudent) next.set(sourceDesk.id, targetStudent);
          else next.delete(sourceDesk.id);

          if (sourceStudent) next.set(targetDesk.id, sourceStudent);
          else next.delete(targetDesk.id);
          return next;
        });
      }
    }
    setDragId(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

  // ── 4. 스케일링 인쇄 미리보기 및 실행 (Task 3) ──────────────────────
  const desks = useMemo(() => elements.filter(e => e.type === "desk"), [elements]);

  // 용지 크기 픽셀 매핑 (mm -> px conversion, 96 DPI)
  const paperDimensions = useMemo(() => {
    const mmToPx = (mm: number) => Math.round(mm * 3.7795275591);
    let width = 297;  // A4 landscape mm
    let height = 210;
    if (paperSize === "A3") { width = 420; height = 297; }
    if (paperSize === "Letter") { width = 279; height = 216; }

    if (paperOrientation === "portrait") {
      const tmp = width; width = height; height = tmp;
    }
    const margin = 10; // 10mm margin
    return {
      pageW: mmToPx(width),
      pageH: mmToPx(height),
      printW: mmToPx(width - margin * 2),
      printH: mmToPx(height - margin * 2),
    };
  }, [paperSize, paperOrientation]);

  // 실제 콘텐츠 픽셀 크기 및 스케일 비율 계산
  const contentWidth = cols * 90;
  const contentHeight = (rows + 1) * 60;
  const printScale = Math.min(
    paperDimensions.printW / contentWidth,
    paperDimensions.printH / contentHeight,
    1.0
  );
  const scalePercent = Math.round(printScale * 100);

  const handleExecutePrint = () => {
    const isMirror = printPerspective === "student";
    const cW = 80;
    const cH = 52;
    const gap = 8;
    const totalW = cols * (cW + gap);
    const totalH = (rows + 1) * (cH + gap);

    let cellsHTML = "";
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c < cols; c++) {
        const displayC = isMirror ? (cols - 1 - c) : c;
        const displayR = isMirror ? (rows - r) : r;
        const el = elements.find(e => e.x === displayC && e.y === displayR);
        if (!el) continue;

        const px = c * (cW + gap);
        const py = r * (cH + gap);
        const studentId = assignments.get(el.id);
        const studentObj = students.find(s => s.id === studentId);
        const meta = ELEMENT_META[el.type];

        cellsHTML += `
          <div style="
            position:absolute; left:${px}px; top:${py}px;
            width:${cW}px; height:${cH}px;
            background:${el.type === "desk" ? "#ffffff" : meta.color};
            border:${el.type === "desk" ? "1.5px solid #111" : "2px solid " + meta.border};
            border-radius:6px;
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            box-sizing:border-box; padding:2px;
          ">
            ${el.type !== "desk" ? `<span style="font-size:16px;">${meta.icon}</span><span style="font-size:10px;font-weight:700;">${meta.label}</span>` : ""}
            ${el.type === "desk" ? `<span style="font-size:15px;font-weight:900;color:#000;">${studentObj ? studentObj.name : ""}</span>` : ""}
          </div>
        `;
      }
    }

    const titleText = `${layoutName} (${printPerspective === "teacher" ? "선생님 시점" : "학생 시점 좌우반전"})`;
    const pageSizeCss = `${paperSize} ${paperOrientation}`;

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
      <style>
        @page { size: ${pageSizeCss}; margin: 10mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Noto Sans KR', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-container {
          transform: scale(${printScale});
          transform-origin: top left;
          width: ${totalW}px;
          height: ${totalH}px;
        }
      </style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&display=swap">
    </head><body>
      <div style="margin-bottom:12px; font-weight:bold; font-size:16px; color:#1B4332;">${titleText} ${preloadedLabel ? " — " + preloadedLabel : ""}</div>
      <div class="print-container" style="position:relative;">${cellsHTML}</div>
      <script>document.fonts.ready.then(()=>setTimeout(()=>{window.print();window.close();},300));</script>
    </body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    iframe.contentWindow?.addEventListener("afterprint", () => document.body.removeChild(iframe));
  };

  const inputCls = "border border-[#E8E0D0] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#1B4332]";

  // ── 렌더링 ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm">
        
        {/* 상단 헤더 & 주 액션 버튼 */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-[#1B4332] text-lg">{layoutName}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isLocked ? "bg-[#E2E8F0] text-[#475569]" : "bg-[#FEF3C7] text-[#92400E]"}`}>
              {isLocked ? "🔒 구조 고정" : "✏️ 구조 편집 중"}
            </span>
            <button
              onClick={() => setIsLocked(v => !v)}
              className="text-xs text-[#2D6A4F] underline underline-offset-2 ml-1"
            >
              {isLocked ? "[편집하기]" : "[고정하기]"}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap no-print">
            {isLoggedIn && onOpenClassPanel && (
              <button onClick={onOpenClassPanel}
                className="flex items-center gap-1 text-xs text-[#1B4332] font-semibold bg-[#F0FFF4] border border-[#9AE6B4] px-2.5 py-1.5 rounded-lg hover:bg-[#D4EDDA] transition-colors">
                👥 반 불러오기
              </button>
            )}
            {isLoggedIn && (
              <button onClick={() => setShowSavePanel(v => !v)}
                className="text-xs px-2.5 py-1.5 border border-[#E8E0D0] rounded-lg text-[#4A4A4A] hover:border-[#1B4332] transition-colors">
                📂 레이아웃 관리
              </button>
            )}
            <button onClick={() => setShowPrintModal(true)}
              className="px-3 py-1.5 bg-[#F2C94C] text-[#1B4332] text-xs font-bold rounded-lg hover:bg-[#EAB800] transition-colors">
              🖨️ 인쇄 설정
            </button>
          </div>
        </div>

        {/* 최상위 메인 액션 바 (Task 2) */}
        <div className="flex items-center justify-between bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRandomAssign}
              disabled={students.length === 0}
              className="px-4 py-2 bg-[#1B4332] text-[#F5F0E8] text-sm font-bold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40 shadow-sm transition-all"
            >
              🎲 학생만 다시 섞기
            </button>
            <button
              onClick={() => setShowAssignOptions(v => !v)}
              className="px-3 py-2 border border-[#CBD5E1] bg-white text-xs font-semibold text-[#334155] rounded-lg hover:bg-[#F1F5F9] transition-colors"
            >
              ⚙️ 추가 옵션 {showAssignOptions ? "▲" : "▼"}
            </button>
            {assignments.size > 0 && (
              <>
                <button
                  onClick={handleSaveChart}
                  className="px-3 py-2 bg-[#0284C7] text-white text-xs font-bold rounded-lg hover:bg-[#0369A1] transition-colors"
                >
                  💾 배정 결과 저장
                </button>
                <button
                  onClick={handleClearAssign}
                  className="px-3 py-2 border border-[#E2E8F0] bg-white text-xs font-semibold text-[#64748B] rounded-lg hover:bg-[#F8FAFC] transition-colors"
                >
                  초기화
                </button>
              </>
            )}
          </div>

          <div className="text-xs text-[#64748B]">
            총 {students.length}명 · 배정 {assignments.size}석 · 남은 책상 {Math.max(0, desks.length - assignments.size)}석
          </div>
        </div>

        {/* 추가 배치 옵션 패널 (Task 2) */}
        {showAssignOptions && (
          <div className="mb-4 p-4 bg-[#F1F5F9] rounded-xl border border-[#CBD5E1] text-xs space-y-3">
            <h4 className="font-bold text-[#1E293B]">🎯 맞춤형 배정 제약 옵션</h4>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={avoidPrevious} onChange={e => setAvoidPrevious(e.target.checked)} />
                <span>지난 배치와 다르게 (직전 자리 회피)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={separateSameTags} onChange={e => setSeparateSameTags(e.target.checked)} />
                <span>태그 분산 (동일 국적/모국어 이웃 비허용)</span>
              </label>
            </div>

            {/* 분리 지정 학생 설정 */}
            <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
              <span className="font-semibold text-[#334155]">🚫 분리 지정 (인접하지 않게 배치할 2명 선택):</span>
              <div className="flex items-center gap-2">
                <select value={pairStudent1} onChange={e => setPairStudent1(e.target.value)} className={inputCls}>
                  <option value="">학생 1 선택</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <span>-</span>
                <select value={pairStudent2} onChange={e => setPairStudent2(e.target.value)} className={inputCls}>
                  <option value="">학생 2 선택</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button
                  onClick={() => {
                    if (pairStudent1 && pairStudent2 && pairStudent1 !== pairStudent2) {
                      setSeparatedPairs(prev => [...prev, [pairStudent1, pairStudent2]]);
                      setPairStudent1(""); setPairStudent2("");
                    }
                  }}
                  className="px-2.5 py-1 bg-[#475569] text-white rounded font-semibold"
                >
                  추가
                </button>
              </div>
              {separatedPairs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {separatedPairs.map(([id1, id2], idx) => {
                    const s1 = students.find(s => s.id === id1)?.name;
                    const s2 = students.find(s => s.id === id2)?.name;
                    return (
                      <span key={idx} className="bg-white border px-2 py-0.5 rounded text-[11px] text-[#475569] flex items-center gap-1">
                        {s1} ↔ {s2}
                        <button onClick={() => setSeparatedPairs(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 font-bold ml-1">×</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ★ Task 1 미배정 경고 UI (책상 수 < 학생 수) */}
        {assignResult && assignResult.unassigned.length > 0 && (
          <div className="mb-4 p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#991B1B] text-sm">
                ⚠️ 책상이 {assignResult.unassigned.length}개 부족하여 일부 학생이 배정되지 않았습니다!
              </span>
              <button
                onClick={handleAddDeskToFillUnassigned}
                className="px-3 py-1.5 bg-[#DC2626] text-white font-bold rounded-lg hover:bg-[#B91C1C] transition-colors"
              >
                + 책상 추가하기
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[#7F1D1D] font-semibold">미배정 학생 목록:</span>
              {assignResult.unassigned.map(s => (
                <span key={s.id} className="px-2 py-0.5 bg-white border border-[#F87171] rounded font-bold text-[#991B1B]">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 제약 위반 안내 (있을 때만) */}
        {assignResult && (assignResult.violationDetails?.length ?? 0) > 0 && (
          <div className="mb-4 p-3 bg-[#FFFBEB] border border-[#FCD34D] rounded-xl text-xs text-[#92400E]">
            <span className="font-bold">ℹ️ 배치 제약 안내: </span>
            {assignResult.violationDetails?.join(" · ")}
          </div>
        )}

        {/* 레이아웃 저장/불러오기 관리 모달 (Task 2) */}
        {showSavePanel && (
          <div className="mb-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
            <h3 className="font-bold text-sm text-[#0F172A]">📂 교실 구조 레이아웃 관리</h3>
            <div className="flex gap-2">
              <input value={layoutName} onChange={e => setLayoutName(e.target.value)}
                placeholder="레이아웃 이름 (예: 302호 ㄷ자 구조)" className={`flex-1 ${inputCls}`} />
              <button onClick={handleSaveLayout} disabled={busy || !layoutName.trim()}
                className="px-4 py-1.5 bg-[#1B4332] text-white text-xs font-semibold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40">
                현재 구조 저장
              </button>
            </div>
            <div className="space-y-1.5">
              {layouts.map(l => (
                <div key={l.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-[#E2E8F0]">
                  <span className="flex-1 text-xs font-semibold text-[#1E293B]">{l.name}</span>
                  <span className="text-[11px] text-[#64748B]">{l.cols}×{l.rows}</span>
                  <button onClick={() => loadLayout(l)} className="text-xs text-[#0284C7] font-bold underline">불러오기</button>
                  <button onClick={() => handleCloneLayout(l)} className="text-xs text-[#475569] font-semibold underline">복제</button>
                  <button onClick={() => handleDeleteLayout(l.id)} className="text-red-500 hover:text-red-700 text-xs ml-1">🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 구조 편집 컨트롤 바 (잠금 해제 시에만 노출) */}
        {!isLocked && (
          <div className="mb-3 p-3 bg-[#FFFBEB] rounded-xl border border-[#FCD34D] space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-[#92400E]">✏️ 그리드 크기:</span>
              <select value={cols} onChange={e => setCols(Number(e.target.value))} className={inputCls}>
                {Array.from({length:10},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} 열</option>)}
              </select>
              <span>×</span>
              <select value={rows} onChange={e => setRows(Number(e.target.value))} className={inputCls}>
                {Array.from({length:8},(_,i)=>i+1).map(n=><option key={n} value={n}>{n} 행</option>)}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#FDE68A]">
              <span className="text-xs font-bold text-[#92400E]">추가 요소:</span>
              {(["desk", ...ROOM_ELEMENTS] as ElementType[]).map(type => {
                const meta = ELEMENT_META[type];
                return (
                  <button key={type} onClick={() => setAddType(type)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border transition-all ${
                      addType === type
                        ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332]"
                        : "border-[#E8E0D0] bg-white text-[#4A4A4A]"
                    }`}
                  >
                    <span>{meta.icon}</span><span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 교실 그리드 ── */}
        <div className="overflow-x-auto pb-2">
          <div
            className="inline-grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${cols}, 68px)` }}
          >
            {Array.from({length: rows+1}).map((_, r) =>
              Array.from({length: cols}).map((_, c) => {
                const el = elements.find(e => e.x === c && e.y === r);
                const meta = el ? ELEMENT_META[el.type] : null;
                const isSel = el && selectedEl === el.id;
                const isDesk = el?.type === "desk";

                const assignedStudentId = el ? assignments.get(el.id) : undefined;
                const studentObj = students.find(s => s.id === assignedStudentId);

                return (
                  <div
                    key={`${c}-${r}`}
                    className={`h-16 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer select-none transition-all text-center px-1 ${
                      !el
                        ? !isLocked
                          ? "bg-[#F9F9F9] border-dashed border-[#D0D0D0] hover:border-[#1B4332] hover:bg-[#F0FFF4]"
                          : "bg-transparent border-transparent pointer-events-none"
                        : isSel
                          ? "ring-2 ring-[#F2C94C] ring-offset-1"
                          : isDesk
                            ? "hover:border-[#1B4332] hover:shadow-sm"
                            : "hover:opacity-80"
                    }`}
                    style={el && meta ? {
                      background: isDesk ? "#ffffff" : meta.color,
                      borderColor: isSel ? "#F2C94C" : meta.border,
                    } : undefined}
                    onClick={() => {
                      if (!isLocked) {
                        if (el) setSelectedEl(prev => prev === el.id ? null : el.id);
                        else handleCellClick(c, r);
                      } else if (el?.type === "desk") {
                        setSelectedEl(prev => prev === el.id ? null : el.id);
                      }
                    }}
                    draggable={!!el}
                    onDragStart={el ? e => handleDragStart(e, el.id) : undefined}
                    onDragOver={handleDragOver}
                    onDrop={e => handleDrop(e, c, r)}
                  >
                    {el && meta && (
                      <>
                        {!isDesk && <span style={{fontSize:18, lineHeight:1}}>{meta.icon}</span>}
                        {!isDesk && <span style={{fontSize:10, color:"#555", fontWeight:600}}>{meta.label}</span>}
                        {isDesk && (
                          <span className="font-black text-[#111] text-xs leading-tight">
                            {studentObj ? studentObj.name : <span className="text-[#94A3B8] font-normal text-[10px]">빈 자리</span>}
                          </span>
                        )}
                      </>
                    )}
                    {!el && !isLocked && (
                      <span className="text-[#CBD5E1] text-xl">+</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 선택된 기물 삭제 액션 (구조 편집 모드 시) */}
        {selectedEl && !isLocked && (
          <div className="mt-3 flex items-center justify-between p-3 bg-[#FEF3C7] border border-[#FCD34D] rounded-xl text-xs">
            <span className="font-bold text-[#92400E]">기물 요소 선택됨</span>
            <button onClick={() => deleteElement(selectedEl)} className="px-3 py-1 bg-red-600 text-white rounded font-bold">
              🗑 삭제
            </button>
          </div>
        )}
      </div>

      {/* 🖨️ 인쇄 설정 모달 (Task 3) */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-[#1B4332]">🖨️ 용지 인쇄 설정 및 미리보기</h3>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-400 text-xl font-bold">×</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">용지 크기:</label>
                <div className="flex gap-2">
                  {(["A4", "A3", "Letter"] as PaperSize[]).map(p => (
                    <button key={p} onClick={() => setPaperSize(p)}
                      className={`flex-1 py-1.5 border rounded-lg font-bold ${paperSize === p ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-gray-700"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">용지 방향:</label>
                <div className="flex gap-2">
                  <button onClick={() => setPaperOrientation("landscape")}
                    className={`flex-1 py-1.5 border rounded-lg font-bold ${paperOrientation === "landscape" ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-gray-700"}`}>
                    가로 방향
                  </button>
                  <button onClick={() => setPaperOrientation("portrait")}
                    className={`flex-1 py-1.5 border rounded-lg font-bold ${paperOrientation === "portrait" ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-gray-700"}`}>
                    세로 방향
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">시점 (좌우 반전):</label>
                <div className="flex gap-2">
                  <button onClick={() => setPrintPerspective("teacher")}
                    className={`flex-1 py-1.5 border rounded-lg font-bold ${printPerspective === "teacher" ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-gray-700"}`}>
                    👨‍🏫 선생님 시점
                  </button>
                  <button onClick={() => setPrintPerspective("student")}
                    className={`flex-1 py-1.5 border rounded-lg font-bold ${printPerspective === "student" ? "bg-[#1B4332] text-white border-[#1B4332]" : "bg-white text-gray-700"}`}>
                    🧑‍🎓 학생 시점 (반전)
                  </button>
                </div>
              </div>

              {/* 스케일 안내 바 */}
              <div className="p-3 bg-[#F8FAFC] border rounded-lg text-center font-bold text-[#0F172A]">
                {paperSize} {paperOrientation === "landscape" ? "가로" : "세로"} 1장에 들어갑니다 ({scalePercent}% 크기 비율)
                {scalePercent < 60 && <div className="text-red-500 text-[11px] font-normal mt-1">⚠️ 비율이 60% 미만입니다. 가로 방향이나 A3 용지를 권장합니다.</div>}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowPrintModal(false)} className="flex-1 py-2 border rounded-xl font-bold text-gray-600">
                취소
              </button>
              <button onClick={() => { setShowPrintModal(false); handleExecutePrint(); }} className="flex-1 py-2 bg-[#F2C94C] text-[#1B4332] rounded-xl font-bold hover:bg-[#EAB800]">
                🖨️ 인쇄하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}