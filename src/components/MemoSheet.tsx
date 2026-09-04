"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getMemo, saveMemo, getLayouts, getSeatingCharts, type SeatingLayout, type SeatingChart as SeatingChartDoc } from "@/lib/seating";
import { executePrint } from "@/lib/print";

interface Props {
  preloadedStudents?: string[];
  preloadedLabel?: string;
  preloadedGroupId?: string;
  onOpenClassPanel?: () => void;
  isLoggedIn?: boolean;
}

type ViewMode = "list" | "grid";
type PrintFormat = "list" | "seating" | "both";

interface FlexMemo {
  studentName: string;
  values: Record<string, string>;
}

const DEFAULT_FIELDS = ["발음", "문법", "수업 태도", "메모"];

const LEGACY_KEY_MAP: Record<string, string> = {
  pronunciation: "발음",
  grammar:       "문법",
  attitude:      "수업 태도",
  memo:          "메모",
};

const MAX_FIELDS = 8;

function emptyMemo(name: string): FlexMemo {
  return { studentName: name, values: {} };
}

export default function StudentMemo({
  preloadedStudents = [],
  preloadedLabel = "",
  preloadedGroupId = "",
  onOpenClassPanel,
  isLoggedIn,
}: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [students, setStudents] = useState<string[]>([]);
  const [memos, setMemos] = useState<FlexMemo[]>([]);
  const [fields, setFields] = useState<string[]>(DEFAULT_FIELDS);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeStudent, setActiveStudent] = useState<string | null>(null);
  const [newField, setNewField] = useState("");
  const [showFieldSettings, setShowFieldSettings] = useState(false);

  // Task 4 인쇄 서식 관련 상태
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printFormat, setPrintFormat] = useState<PrintFormat>("list");
  const [savedLayouts, setSavedLayouts] = useState<SeatingLayout[]>([]);
  const [savedCharts, setSavedCharts] = useState<SeatingChartDoc[]>([]);
  const [selectedChartId, setSelectedChartId] = useState<string>("");

  const loadMemos = useCallback(async (groupId: string, names: string[]) => {
    const sheet = await getMemo(uid, groupId);
    if (!sheet) return;

    const raw = sheet as unknown as {
      fields?: string[];
      memos: Record<string, string>[];
    };

    const loadedFields = Array.isArray(raw.fields) && raw.fields.length >= 0
      ? raw.fields
      : DEFAULT_FIELDS;
    setFields(loadedFields.length > 0 || Array.isArray(raw.fields) ? loadedFields : DEFAULT_FIELDS);

    setMemos(names.map(name => {
      const savedMemo = raw.memos?.find(m => m.studentName === name);
      if (!savedMemo) return emptyMemo(name);

      const savedValues = (savedMemo as unknown as FlexMemo).values;
      if (savedValues && typeof savedValues === "object") {
        return { studentName: name, values: { ...savedValues } };
      }
      const values: Record<string, string> = {};
      Object.entries(LEGACY_KEY_MAP).forEach(([oldKey, label]) => {
        const v = savedMemo[oldKey];
        if (typeof v === "string" && v) values[label] = v;
      });
      return { studentName: name, values };
    }));
  }, [uid]);

  useEffect(() => {
    if (preloadedStudents.length > 0) {
      setStudents(preloadedStudents);
      setMemos(preloadedStudents.map(emptyMemo));
      setActiveStudent(preloadedStudents[0] ?? null);
      if (uid && preloadedGroupId) loadMemos(preloadedGroupId, preloadedStudents);
    }
  }, [preloadedStudents, preloadedGroupId, uid, loadMemos]);

  // 저장된 자리표 및 레이아웃 불러오기 (Task 4)
  const openPrintModal = async () => {
    setShowPrintModal(true);
    if (uid) {
      const lList = await getLayouts(uid);
      const cList = await getSeatingCharts(uid);
      setSavedLayouts(lList);
      setSavedCharts(cList);
      if (cList.length > 0) setSelectedChartId(cList[0].id);
    }
  };

  const updateMemo = (name: string, field: string, value: string) => {
    setMemos(prev => prev.map(m =>
      m.studentName === name
        ? { ...m, values: { ...m.values, [field]: value } }
        : m
    ));
    setSaved(false);
  };

  const addField = () => {
    const label = newField.trim();
    if (!label) return;
    if (fields.includes(label)) { setNewField(""); return; }
    if (fields.length >= MAX_FIELDS) return;
    setFields(prev => [...prev, label]);
    setNewField("");
    setSaved(false);
  };

  const removeField = (label: string) => {
    const hasData = memos.some(m => (m.values[label] ?? "").trim());
    if (hasData && !confirm(`"${label}" 항목에 작성된 메모가 있어요. 삭제할까요?`)) return;
    setFields(prev => prev.filter(f => f !== label));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!uid || !preloadedGroupId) return;
    setSaving(true);
    try {
      const cleanMemos = memos.map(m => ({
        studentName: m.studentName,
        values: Object.fromEntries(
          Object.entries(m.values).filter(([k, v]) => fields.includes(k) && v.trim())
        ),
      }));
      await saveMemo(uid, preloadedGroupId, {
        groupId: preloadedGroupId,
        groupName: preloadedLabel,
        fields,
        memos: cleanMemos as unknown as FlexMemo[],
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  // ── Task 4 인쇄 실행 ──────────────────────────────────────────────
  const handleExecutePrint = () => {
    let bodyHTML = "";

    // 1. 목록형 인쇄 HTML
    const buildListHTML = () => {
      return `
        <div style="font-size:16px; font-weight:bold; color:#1B4332; margin-bottom:12px;">
          📝 학생 메모지 목록형 ${preloadedLabel ? " — " + preloadedLabel : ""}
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          ${memos.map(m => `
            <div class="avoid-break" style="border:1.5px solid #CBD5E1; border-radius:8px; padding:10px; background:#fff;">
              <div style="font-[#0F172A]; font-weight:bold; font-size:14px; margin-bottom:6px; border-b:1px solid #E2E8F0; pb:4px;">
                👤 ${m.studentName}
              </div>
              ${fields.map(f => `
                <div style="font-size:11px; margin-bottom:4px;">
                  <span style="color:#64748B; font-weight:600;">• ${f}:</span>
                  <span style="color:#1E293B;">${m.values[f] || "__________________"}</span>
                </div>
              `).join("")}
            </div>
          `).join("")}
        </div>
      `;
    };

    // 2. 자리표형 인쇄 HTML
    const buildSeatingHTML = () => {
      const targetChart = savedCharts.find(c => c.id === selectedChartId);
      const targetLayout = savedLayouts.find(l => l.id === targetChart?.layoutId);

      if (!targetChart || !targetLayout) {
        return `<div style="color:red;">저장된 자리표를 선택해주세요.</div>`;
      }

      const cols = targetLayout.cols;
      const rows = targetLayout.rows;
      const cW = 120;
      const cH = 85;
      const gap = 8;
      const totalW = cols * (cW + gap);
      const totalH = (rows + 1) * (cH + gap);

      let cellsHTML = "";
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c < cols; c++) {
          const el = targetLayout.elements.find(e => e.x === c && e.y === r);
          if (!el) continue;

          const px = c * (cW + gap);
          const py = r * (cH + gap);

          const assignment = targetChart.assignments.find(a => a.deskId === el.id);
          const studentName = assignment ? assignment.studentId : null; // or match student name
          const memoObj = memos.find(m => m.studentName === studentName || m.studentName === assignment?.studentId);

          cellsHTML += `
            <div style="
              position:absolute; left:${px}px; top:${py}px;
              width:${cW}px; height:${cH}px;
              background:#ffffff; border:1.5px solid #334155; border-radius:6px;
              box-sizing:border-box; padding:6px; font-size:10px;
            ">
              <div style="font-weight:bold; font-size:12px; color:#0F172A; margin-bottom:4px; border-b:1px solid #E2E8F0;">
                ${studentName || (el.type === "desk" ? "빈 자리" : el.type)}
              </div>
              ${el.type === "desk" && studentName ? `
                ${fields.slice(0, 3).map(f => `
                  <div style="font-size:9px; color:#475569;">
                    [ ] ${f}: ${memoObj?.values[f] || "______"}
                  </div>
                `).join("")}
              ` : ""}
            </div>
          `;
        }
      }

      return `
        <div style="font-size:16px; font-weight:bold; color:#1B4332; margin-bottom:12px;">
          📋 자리표형 메모지 (${targetLayout.name})
        </div>
        <div style="position:relative; width:${totalW}px; height:${totalH}px;">
          ${cellsHTML}
        </div>
      `;
    };

    if (printFormat === "list") {
      bodyHTML = buildListHTML();
    } else if (printFormat === "seating") {
      bodyHTML = buildSeatingHTML();
    } else {
      bodyHTML = buildSeatingHTML() + '<div class="page-break"></div>' + buildListHTML();
    }

    executePrint(bodyHTML, { paperSize: "A4", orientation: printFormat === "list" ? "portrait" : "landscape" });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-4">
        
        {/* 헤더 */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-[#1B4332] text-lg">학생 관찰 메모장</h2>
            {saved && <span className="text-xs text-emerald-600 font-semibold">✓ 저장됨</span>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isLoggedIn && onOpenClassPanel && (
              <button onClick={onOpenClassPanel} className="text-xs text-[#1B4332] font-semibold bg-[#F0FFF4] border border-[#9AE6B4] px-2.5 py-1.5 rounded-lg hover:bg-[#D4EDDA]">
                👥 반 불러오기
              </button>
            )}
            <button onClick={() => setShowFieldSettings(v => !v)} className="text-xs px-2.5 py-1.5 border border-[#E8E0D0] rounded-lg text-[#4A4A4A] hover:border-[#1B4332]">
              ⚙️ 메모 항목 설정
            </button>
            <button onClick={openPrintModal} className="text-xs px-3 py-1.5 bg-[#F2C94C] text-[#1B4332] font-bold rounded-lg hover:bg-[#EAB800]">
              🖨️ 메모지 인쇄
            </button>
            {isLoggedIn && preloadedGroupId && (
              <button onClick={handleSave} disabled={saving} className="text-xs px-3 py-1.5 bg-[#1B4332] text-white font-bold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40">
                {saving ? "저장 중..." : "💾 저장"}
              </button>
            )}
          </div>
        </div>

        {/* 메모 항목 설정 패널 */}
        {showFieldSettings && (
          <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
            <h4 className="font-bold text-[#0F172A]">⚙️ 메모 항목 관리를 위한 추가/삭제 (최대 8개)</h4>
            <div className="flex flex-wrap gap-1.5">
              {fields.map(f => (
                <span key={f} className="px-2.5 py-1 bg-white border border-[#CBD5E1] rounded-lg text-[#334155] font-semibold flex items-center gap-1">
                  {f}
                  <button onClick={() => removeField(f)} className="text-red-500 font-bold ml-1">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <input value={newField} onChange={e => setNewField(e.target.value)} placeholder="새 메모 항목 이름 (예: 과제)" className="border px-2 py-1 rounded text-xs" />
              <button onClick={addField} className="px-3 py-1 bg-[#1B4332] text-white font-bold rounded">추가</button>
            </div>
          </div>
        )}

        {/* 보기 모드 전환 */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex rounded-lg border border-[#E8E0D0] overflow-hidden">
            <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 text-xs font-semibold ${viewMode === "list" ? "bg-[#1B4332] text-white" : "text-[#4A4A4A]"}`}>
              📋 목록형 보기
            </button>
            <button onClick={() => setViewMode("grid")} className={`px-3 py-1.5 text-xs font-semibold ${viewMode === "grid" ? "bg-[#1B4332] text-white" : "text-[#4A4A4A]"}`}>
              🗂️ 카드형 보기
            </button>
          </div>
          <span className="text-xs text-[#64748B]">총 {students.length}명 학생 메모</span>
        </div>

        {/* 메모 작성 그리드/목록 */}
        <div className="space-y-4">
          {memos.map(m => (
            <div key={m.studentName} className="p-4 border border-[#E2E8F0] rounded-xl bg-white space-y-2 shadow-sm">
              <h3 className="font-bold text-[#1B4332] text-sm flex items-center gap-2">
                <span>👤</span> {m.studentName}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {fields.map(f => (
                  <div key={f} className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#64748B]">{f}</label>
                    <input
                      value={m.values[f] || ""}
                      onChange={e => updateMemo(m.studentName, f, e.target.value)}
                      placeholder={`${f} 기록...`}
                      className="w-full border border-[#E2E8F0] rounded-lg p-2 text-xs focus:outline-none focus:border-[#1B4332]"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* 🖨️ Task 4 통합 인쇄 설정 모달 */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-[#1B4332]">🖨️ 학생 메모지 인쇄 형식 선택</h3>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-400 font-bold text-xl">×</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">인쇄 형식:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-gray-50">
                    <input type="radio" name="pFormat" checked={printFormat === "list"} onChange={() => setPrintFormat("list")} />
                    <div>
                      <div className="font-bold text-gray-800">📋 목록형 메모지</div>
                      <div className="text-[11px] text-gray-500">학생 명단 순서대로 메모 칸을 인쇄합니다.</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-gray-50">
                    <input type="radio" name="pFormat" checked={printFormat === "seating"} onChange={() => setPrintFormat("seating")} />
                    <div>
                      <div className="font-bold text-gray-800">🪑 자리표형 메모지</div>
                      <div className="text-[11px] text-gray-500">교실 책상 위치 그대로 각 칸에 관찰 체크 및 메모 공간 표시</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-gray-50">
                    <input type="radio" name="pFormat" checked={printFormat === "both"} onChange={() => setPrintFormat("both")} />
                    <div>
                      <div className="font-bold text-gray-800">📄 자리표 + 목록형 통합</div>
                      <div className="text-[11px] text-gray-500">1페이지 자리표 / 2페이지 이후 목록형 메모지 인쇄</div>
                    </div>
                  </label>
                </div>
              </div>

              {(printFormat === "seating" || printFormat === "both") && (
                <div className="p-3 bg-[#F8FAFC] border rounded-lg space-y-2">
                  <label className="font-bold text-gray-700 block">불러올 저장 자리표 선택:</label>
                  {savedCharts.length > 0 ? (
                    <select value={selectedChartId} onChange={e => setSelectedChartId(e.target.value)} className="w-full border p-1.5 rounded text-xs">
                      {savedCharts.map(c => (
                        <option key={c.id} value={c.id}>{c.title} ({c.id})</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-red-500 text-[11px]">
                      저장된 자리표가 없습니다. 먼저 자리표 탭에서 배정 후 저장해주세요.
                    </div>
                  )}
                </div>
              )}
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