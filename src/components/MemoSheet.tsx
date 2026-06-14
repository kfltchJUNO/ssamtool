"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getMemo, saveMemo, type StudentMemo } from "@/lib/seating";

interface Props {
  preloadedStudents?: string[];
  preloadedLabel?: string;
  preloadedGroupId?: string;
  onOpenClassPanel?: () => void;
  isLoggedIn?: boolean;
}

type ViewMode = "list" | "grid";

const MEMO_FIELDS: { key: keyof Omit<StudentMemo,"studentName">; label: string; placeholder: string }[] = [
  { key: "pronunciation", label: "발음",     placeholder: "발음 특이사항" },
  { key: "grammar",       label: "문법",     placeholder: "자주 틀리는 문법" },
  { key: "attitude",      label: "수업 태도", placeholder: "참여도, 특이사항" },
  { key: "memo",          label: "메모",     placeholder: "기타 메모" },
];

function emptyMemo(name: string): StudentMemo {
  return { studentName: name, pronunciation: "", grammar: "", attitude: "", memo: "" };
}

export default function StudentMemo({ preloadedStudents = [], preloadedLabel = "", preloadedGroupId = "", onOpenClassPanel, isLoggedIn }: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [students,  setStudents]  = useState<string[]>([]);
  const [memos,     setMemos]     = useState<StudentMemo[]>([]);
  const [viewMode,  setViewMode]  = useState<ViewMode>("list");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [activeStudent, setActiveStudent] = useState<string | null>(null);

  // 반 불러오기
  useEffect(() => {
    if (preloadedStudents.length > 0) {
      setStudents(preloadedStudents);
      setMemos(preloadedStudents.map(emptyMemo));
      setActiveStudent(preloadedStudents[0] ?? null);
      // 저장된 메모 불러오기
      if (uid && preloadedGroupId) loadMemos(preloadedGroupId, preloadedStudents);
    }
  }, [preloadedStudents, preloadedGroupId, uid]);

  const loadMemos = async (groupId: string, names: string[]) => {
    const sheet = await getMemo(uid, groupId);
    if (sheet) {
      setMemos(names.map(name => sheet.memos.find(m => m.studentName === name) ?? emptyMemo(name)));
    }
  };

  const updateMemo = (name: string, field: keyof Omit<StudentMemo,"studentName">, value: string) => {
    setMemos(prev => prev.map(m => m.studentName === name ? { ...m, [field]: value } : m));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!uid || !preloadedGroupId) return;
    setSaving(true);
    try {
      await saveMemo(uid, preloadedGroupId, { groupId: preloadedGroupId, groupName: preloadedLabel, memos });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const handlePrint = (mode: ViewMode) => {
    const rows = memos.map(m => `<tr>
      <td style="padding:8px 10px;border:1px solid #ddd;font-weight:700;font-size:14px;white-space:nowrap;">${m.studentName}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px;color:#333;min-width:80px;">${m.pronunciation}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px;color:#333;min-width:80px;">${m.grammar}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px;color:#333;min-width:80px;">${m.attitude}</td>
      <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px;color:#333;">${m.memo}</td>
    </tr>`).join("");

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
      <style>@page{size:A4 ${mode==="grid"?"landscape":"portrait"};margin:12mm}
      body{font-family:'Noto Sans KR',sans-serif;margin:0}
      h2{font-size:16px;color:#111;margin:0 0 12px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{padding:8px 10px;background:#F5F5F5;border:1px solid #DDD;font-size:12px;color:#555;text-align:left}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap">
    </head><body>
      <h2>📝 학생 메모 — ${preloadedLabel || "반 목록"}</h2>
      <table><thead><tr>
        <th>이름</th><th>발음</th><th>문법</th><th>수업 태도</th><th>메모</th>
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

            {/* 뷰 모드 */}
            <div className="flex gap-2 mb-4">
              {([["list","📋 목록형"],["grid","⊞ 카드형"]] as [ViewMode,string][]).map(([m,l]) => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm border-2 font-semibold transition-all ${viewMode===m ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332]" : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* 목록형: 학생 탭 + 상세 편집 */}
            {viewMode === "list" && (
              <div className="flex gap-4">
                {/* 학생 목록 */}
                <div className="flex flex-col gap-1 flex-shrink-0" style={{minWidth:100}}>
                  {students.map(s => {
                    const m = memos.find(m => m.studentName === s);
                    const hasNote = m && Object.values(m).slice(1).some(v => v.trim());
                    return (
                      <button key={s} onClick={() => setActiveStudent(s)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold text-left transition-all flex items-center gap-1.5 ${activeStudent===s ? "bg-[#1B4332] text-white" : "text-[#2D2D2D] hover:bg-[#F0FFF4] border border-[#E8E0D0]"}`}>
                        {hasNote && <span className="w-1.5 h-1.5 rounded-full bg-[#F2C94C] flex-shrink-0" />}
                        {s}
                      </button>
                    );
                  })}
                </div>

                {/* 메모 편집 */}
                {activeMemo && (
                  <div className="flex-1 space-y-3">
                    <p className="font-bold text-[#1B4332]">{activeMemo.studentName}</p>
                    {MEMO_FIELDS.map(f => (
                      <div key={f.key}>
                        <label className="text-xs font-semibold text-[#4A4A4A] block mb-1">{f.label}</label>
                        <textarea value={activeMemo[f.key]} onChange={e => updateMemo(activeMemo.studentName, f.key, e.target.value)}
                          placeholder={f.placeholder} rows={2}
                          className="w-full border border-[#E8E0D0] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#1B4332]" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 카드형: 모든 학생 카드 한번에 */}
            {viewMode === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {memos.map(m => (
                  <div key={m.studentName} className="border border-[#E8E0D0] rounded-xl p-4 space-y-2.5">
                    <p className="font-bold text-[#1B4332] border-b border-[#E8E0D0] pb-2">{m.studentName}</p>
                    {MEMO_FIELDS.map(f => (
                      <div key={f.key} className="flex gap-2 items-start">
                        <span className="text-[11px] font-semibold text-[#9A9A9A] w-14 flex-shrink-0 pt-1">{f.label}</span>
                        <textarea value={m[f.key]} onChange={e => updateMemo(m.studentName, f.key, e.target.value)}
                          placeholder={f.placeholder} rows={1}
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