"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getMemo, saveMemo } from "@/lib/seating";

interface Props {
  preloadedStudents?: string[];
  preloadedLabel?: string;
  preloadedGroupId?: string;
  onOpenClassPanel?: () => void;
  isLoggedIn?: boolean;
}

type ViewMode = "list" | "grid";

// ── 동적 항목 구조 ──────────────────────────────────────────────
// 기존 고정 4항목(발음/문법/수업태도/메모) → 선생님이 자유롭게 추가/삭제
interface FlexMemo {
  studentName: string;
  values:      Record<string, string>;   // { "발음": "...", "과제": "..." }
}

const DEFAULT_FIELDS = ["발음", "문법", "수업 태도", "메모"];

const DEFAULT_PLACEHOLDERS: Record<string, string> = {
  "발음":     "발음 특이사항",
  "문법":     "자주 틀리는 문법",
  "수업 태도": "참여도, 특이사항",
  "메모":     "기타 메모",
};

// 구버전 저장 데이터 호환: 고정 키 → 라벨
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

export default function StudentMemo({ preloadedStudents = [], preloadedLabel = "", preloadedGroupId = "", onOpenClassPanel, isLoggedIn }: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [students,  setStudents]  = useState<string[]>([]);
  const [memos,     setMemos]     = useState<FlexMemo[]>([]);
  const [fields,    setFields]    = useState<string[]>(DEFAULT_FIELDS);
  const [viewMode,  setViewMode]  = useState<ViewMode>("list");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [activeStudent, setActiveStudent] = useState<string | null>(null);
  const [newField,  setNewField]  = useState("");
  const [showFieldSettings, setShowFieldSettings] = useState(false);

  // ── 저장된 메모 불러오기 (구버전 데이터 자동 변환) ───────────
  const loadMemos = useCallback(async (groupId: string, names: string[]) => {
    const sheet = await getMemo(uid, groupId);
    if (!sheet) return;

    const raw = sheet as unknown as {
      fields?: string[];
      memos:   Record<string, string>[];
    };

    // 항목: 저장돼 있으면 사용, 없으면(구버전) 기본 4개
    const loadedFields = Array.isArray(raw.fields) && raw.fields.length >= 0
      ? raw.fields
      : DEFAULT_FIELDS;
    setFields(loadedFields.length > 0 || Array.isArray(raw.fields) ? loadedFields : DEFAULT_FIELDS);

    setMemos(names.map(name => {
      const saved = raw.memos?.find(m => m.studentName === name);
      if (!saved) return emptyMemo(name);

      // 신버전: values 객체 그대로
      const savedValues = (saved as unknown as FlexMemo).values;
      if (savedValues && typeof savedValues === "object") {
        return { studentName: name, values: { ...savedValues } };
      }
      // 구버전: 고정 키 → 라벨 변환
      const values: Record<string, string> = {};
      Object.entries(LEGACY_KEY_MAP).forEach(([oldKey, label]) => {
        const v = saved[oldKey];
        if (typeof v === "string" && v) values[label] = v;
      });
      return { studentName: name, values };
    }));
  }, [uid]);

  // 반 불러오기
  useEffect(() => {
    if (preloadedStudents.length > 0) {
      setStudents(preloadedStudents);
      setMemos(preloadedStudents.map(emptyMemo));
      setActiveStudent(preloadedStudents[0] ?? null);
      if (uid && preloadedGroupId) loadMemos(preloadedGroupId, preloadedStudents);
    }
  }, [preloadedStudents, preloadedGroupId, uid, loadMemos]);

  const updateMemo = (name: string, field: string, value: string) => {
    setMemos(prev => prev.map(m =>
      m.studentName === name
        ? { ...m, values: { ...m.values, [field]: value } }
        : m
    ));
    setSaved(false);
  };

  // ── 항목 관리 ─────────────────────────────────────────────────
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
    if (hasData && !confirm(`"${label}" 항목에 작성된 메모가 있어요.\n항목을 삭제하면 화면과 인쇄에서 보이지 않아요. (데이터는 저장 시 함께 정리됩니다)\n삭제할까요?`)) return;
    setFields(prev => prev.filter(f => f !== label));
    setSaved(false);
  };

  const restoreDefaults = () => {
    setFields(prev => {
      const merged = [...prev];
      DEFAULT_FIELDS.forEach(f => { if (!merged.includes(f)) merged.push(f); });
      return merged.slice(0, MAX_FIELDS);
    });
    setSaved(false);
  };

  // ── 저장 ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!uid || !preloadedGroupId) return;
    setSaving(true);
    try {
      // 삭제된 항목의 값은 정리하고 저장
      const cleanMemos = memos.map(m => ({
        studentName: m.studentName,
        values: Object.fromEntries(
          Object.entries(m.values).filter(([k]) => fields.includes(k))
        ),
      }));
      await saveMemo(uid, preloadedGroupId, {
        groupId:   preloadedGroupId,
        groupName: preloadedLabel,
        fields,
        memos:     cleanMemos,
      } as unknown as Parameters<typeof saveMemo>[2]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  // ── 인쇄 (동적 열 / 항목 없으면 빈칸 한 열) ──────────────────
  const handlePrint = (mode: ViewMode) => {
    const printFields = fields.length > 0 ? fields : [""];   // 항목 없으면 빈 열 하나
    const landscape   = mode === "grid" || printFields.length > 4;

    const headerCells = printFields
      .map(f => `<th>${f || "&nbsp;"}</th>`)
      .join("");

    const rows = memos.map(m => {
      const cells = printFields.map(f => {
        const v = f ? (m.values[f] ?? "") : "";
        return `<td style="padding:8px 10px;border:1px solid #ddd;font-size:12px;color:#333;min-width:${f ? 80 : 300}px;">${v}</td>`;
      }).join("");
      return `<tr>
        <td style="padding:8px 10px;border:1px solid #ddd;font-weight:700;font-size:14px;white-space:nowrap;">${m.studentName}</td>
        ${cells}
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
      <style>@page{size:A4 ${landscape ? "landscape" : "portrait"};margin:12mm}
      body{font-family:'Noto Sans KR',sans-serif;margin:0}
      h2{font-size:16px;color:#111;margin:0 0 12px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{padding:8px 10px;background:#F5F5F5;border:1px solid #DDD;font-size:12px;color:#555;text-align:left}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap">
    </head><body>
      <h2>📝 학생 메모 — ${preloadedLabel || "반 목록"}</h2>
      <table><thead><tr>
        <th>이름</th>${headerCells}
      </tr></thead><tbody>${rows}</tbody></table>
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

  const activeMemo = memos.find(m => m.studentName === activeStudent);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-bold text-[#1B4332] text-lg">학생 메모</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {isLoggedIn && onOpenClassPanel && (
              <button onClick={onOpenClassPanel} className="flex items-center gap-1 text-xs text-[#1B4332] font-semibold bg-[#F0FFF4] border border-[#9AE6B4] px-2.5 py-1.5 rounded-lg hover:bg-[#D4EDDA] transition-colors">👥 반 불러오기</button>
            )}
            {uid && preloadedGroupId && (
              <button onClick={handleSave} disabled={saving}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${saved ? "bg-[#9AE6B4] text-[#1B4332]" : "bg-[#1B4332] text-white hover:bg-[#2D6A4F]"} disabled:opacity-50`}>
                {saving ? "저장 중..." : saved ? "✓ 저장됨" : "💾 저장"}
              </button>
            )}
            <button onClick={() => handlePrint(viewMode)} className="px-3 py-1.5 bg-[#F2C94C] text-[#1B4332] text-xs font-bold rounded-lg hover:bg-[#EAB800]">🖨️ 인쇄</button>
          </div>
        </div>

        {!preloadedLabel && (
          <div className="py-10 text-center text-[#9A9A9A]">
            <p className="text-3xl mb-2">📝</p>
            <p className="text-sm">반을 불러오면 학생별 메모를 작성할 수 있어요</p>
            {isLoggedIn && onOpenClassPanel && (
              <button onClick={onOpenClassPanel} className="mt-3 px-4 py-2 bg-[#1B4332] text-white text-sm font-semibold rounded-lg hover:bg-[#2D6A4F] transition-colors">👥 반 불러오기</button>
            )}
          </div>
        )}

        {preloadedLabel && students.length > 0 && (
          <>
            <div className="text-xs text-[#2D6A4F] bg-[#F0FFF4] px-3 py-1.5 rounded-lg border border-[#9AE6B4] mb-4">
              ✅ {preloadedLabel} · {students.length}명
              {!preloadedGroupId && <span className="text-[#9A9A9A] ml-2">(저장하려면 반 패널에서 불러오세요)</span>}
            </div>

            {/* 뷰 모드 + 항목 설정 토글 */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {([["list","📋 목록형"],["grid","⊞ 카드형"]] as [ViewMode,string][]).map(([m,l]) => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm border-2 font-semibold transition-all ${viewMode===m ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332]" : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"}`}>
                  {l}
                </button>
              ))}
              <button onClick={() => setShowFieldSettings(v => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm border-2 font-semibold transition-all ${showFieldSettings ? "border-[#F2C94C] bg-[#FFF8E1] text-[#92630A]" : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#F2C94C]"}`}>
                ⚙️ 항목 설정 ({fields.length})
              </button>
            </div>

            {/* 항목 설정 패널 */}
            {showFieldSettings && (
              <div className="mb-4 p-4 bg-[#FFFDF5] border border-[#F2C94C] rounded-xl space-y-3">
                <p className="text-xs text-[#92630A]">
                  메모 항목을 자유롭게 구성하세요. <b>항목을 모두 지우면 인쇄 시 학생 이름 옆이 빈칸으로 나와요</b> (손글씨 메모용).
                </p>
                {/* 현재 항목 칩 */}
                <div className="flex flex-wrap gap-1.5">
                  {fields.map(f => (
                    <span key={f} className="flex items-center gap-1 bg-white border border-[#E8E0D0] rounded-full pl-3 pr-1.5 py-1 text-xs font-semibold text-[#2D2D2D]">
                      {f}
                      <button onClick={() => removeField(f)}
                        className="w-4 h-4 flex items-center justify-center rounded-full text-[#9A9A9A] hover:bg-[#FDE8E8] hover:text-[#C53030] text-[10px] leading-none">
                        ✕
                      </button>
                    </span>
                  ))}
                  {fields.length === 0 && (
                    <span className="text-xs text-[#9A9A9A] py-1">항목 없음 — 인쇄 시 빈칸 한 열이 나와요</span>
                  )}
                </div>
                {/* 항목 추가 */}
                <div className="flex gap-2">
                  <input value={newField} onChange={e => setNewField(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addField()}
                    placeholder="새 항목 (예: 과제, 출석, 발표)"
                    maxLength={10}
                    className="flex-1 border border-[#E8E0D0] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#1B4332]" />
                  <button onClick={addField} disabled={!newField.trim() || fields.length >= MAX_FIELDS}
                    className="px-3 py-1.5 bg-[#1B4332] text-white text-xs font-bold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40">
                    + 추가
                  </button>
                  <button onClick={restoreDefaults}
                    className="px-3 py-1.5 border border-[#E8E0D0] text-[#4A4A4A] text-xs font-semibold rounded-lg hover:bg-[#F5F5F5]">
                    기본 항목 복원
                  </button>
                </div>
                {fields.length >= MAX_FIELDS && (
                  <p className="text-[11px] text-[#C53030]">항목은 최대 {MAX_FIELDS}개까지 만들 수 있어요.</p>
                )}
              </div>
            )}

            {/* 항목이 없을 때 안내 */}
            {fields.length === 0 && (
              <div className="py-8 text-center text-[#9A9A9A] border border-dashed border-[#E8E0D0] rounded-xl">
                <p className="text-sm">항목이 없어요. 인쇄하면 학생 이름 옆이 <b>빈칸</b>으로 나와요.</p>
                <p className="text-xs mt-1">화면에서 메모를 입력하려면 ⚙️ 항목 설정에서 항목을 추가하세요.</p>
              </div>
            )}

            {/* 목록형: 학생 탭 + 상세 편집 */}
            {viewMode === "list" && fields.length > 0 && (
              <div className="flex gap-4">
                <div className="flex flex-col gap-1 flex-shrink-0" style={{minWidth:100}}>
                  {students.map(s => {
                    const m = memos.find(m => m.studentName === s);
                    const hasNote = m && Object.values(m.values).some(v => (v ?? "").trim());
                    return (
                      <button key={s} onClick={() => setActiveStudent(s)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold text-left transition-all flex items-center gap-1.5 ${activeStudent===s ? "bg-[#1B4332] text-white" : "text-[#2D2D2D] hover:bg-[#F0FFF4] border border-[#E8E0D0]"}`}>
                        {hasNote && <span className="w-1.5 h-1.5 rounded-full bg-[#F2C94C] flex-shrink-0" />}
                        {s}
                      </button>
                    );
                  })}
                </div>

                {activeMemo && (
                  <div className="flex-1 space-y-3">
                    <p className="font-bold text-[#1B4332]">{activeMemo.studentName}</p>
                    {fields.map(f => (
                      <div key={f}>
                        <label className="text-xs font-semibold text-[#4A4A4A] block mb-1">{f}</label>
                        <textarea value={activeMemo.values[f] ?? ""} onChange={e => updateMemo(activeMemo.studentName, f, e.target.value)}
                          placeholder={DEFAULT_PLACEHOLDERS[f] ?? `${f} 메모`} rows={2}
                          className="w-full border border-[#E8E0D0] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#1B4332]" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 카드형 */}
            {viewMode === "grid" && fields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {memos.map(m => (
                  <div key={m.studentName} className="border border-[#E8E0D0] rounded-xl p-4 space-y-2.5">
                    <p className="font-bold text-[#1B4332] border-b border-[#E8E0D0] pb-2">{m.studentName}</p>
                    {fields.map(f => (
                      <div key={f} className="flex gap-2 items-start">
                        <span className="text-[11px] font-semibold text-[#9A9A9A] w-14 flex-shrink-0 pt-1">{f}</span>
                        <textarea value={m.values[f] ?? ""} onChange={e => updateMemo(m.studentName, f, e.target.value)}
                          placeholder={DEFAULT_PLACEHOLDERS[f] ?? ""} rows={1}
                          className="flex-1 border border-[#E8E0D0] rounded-lg px-2 py-1 text-xs resize-none focus:outline-none focus:border-[#1B4332]" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}