"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getInstitutions, addInstitution, deleteInstitution,
  getSemesters,    addSemester,    deleteSemester,
  getGroups,       addGroup,       updateGroup,   deleteGroup,
  type Institution, type Semester, type Group,
} from "@/lib/classes";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectGroup?: (students: string[], label: string) => void;
}

type Step = "inst" | "sem" | "group" | "edit";

export default function ClassPanel({ open, onClose, onSelectGroup }: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";

  const [step,    setStep]    = useState<Step>("inst");
  const [selInst, setSelInst] = useState<Institution | null>(null);
  const [selSem,  setSelSem]  = useState<Semester | null>(null);
  const [selGrp,  setSelGrp]  = useState<Group | null>(null);

  const [insts,  setInsts]  = useState<Institution[]>([]);
  const [sems,   setSems]   = useState<Semester[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [inputName,     setInputName]     = useState("");
  const [inputStudents, setInputStudents] = useState("");
  const [editName,      setEditName]      = useState("");
  const [editStudents,  setEditStudents]  = useState("");
  const [busy,          setBusy]          = useState(false);
  const [error,         setError]         = useState("");

  const loadInsts  = useCallback(async () => { if (uid) setInsts(await getInstitutions(uid)); }, [uid]);
  const loadSems   = useCallback(async () => { if (uid && selInst) setSems(await getSemesters(uid, selInst.id)); }, [uid, selInst]);
  const loadGroups = useCallback(async () => { if (uid && selInst && selSem) setGroups(await getGroups(uid, selInst.id, selSem.id)); }, [uid, selInst, selSem]);

  useEffect(() => { if (open) loadInsts(); }, [open, loadInsts]);
  useEffect(() => { if (selInst) loadSems(); }, [selInst, loadSems]);
  useEffect(() => { if (selSem)  loadGroups(); }, [selSem, loadGroups]);

  const reset = () => { setStep("inst"); setSelInst(null); setSelSem(null); setSelGrp(null); setInputName(""); setInputStudents(""); setError(""); };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await fn(); } catch { setError("저장 중 오류가 발생했어요."); } finally { setBusy(false); }
  };

  const handleAddInst  = () => run(async () => { await addInstitution(uid, inputName.trim()); setInputName(""); await loadInsts(); });
  const handleAddSem   = () => run(async () => { await addSemester(uid, selInst!.id, inputName.trim()); setInputName(""); await loadSems(); });
  const handleAddGroup = () => {
    const students = inputStudents.split(/[\n,，、]/).map(s => s.trim()).filter(Boolean);
    if (!students.length) { setError("학생 이름을 입력해 주세요."); return; }
    run(async () => { await addGroup(uid, selInst!.id, selSem!.id, inputName.trim(), students); setInputName(""); setInputStudents(""); await loadGroups(); });
  };
  const handleUpdateGroup = () => {
    const students = editStudents.split(/[\n,，、]/).map(s => s.trim()).filter(Boolean);
    if (!students.length) { setError("학생 이름을 입력해 주세요."); return; }
    run(async () => { await updateGroup(uid, selInst!.id, selSem!.id, selGrp!.id, { name: editName.trim(), students }); await loadGroups(); setStep("group"); setSelGrp(null); });
  };
  const handleDelInst  = (id: string) => { if (!confirm("기관을 삭제할까요?")) return; run(async () => { await deleteInstitution(uid, id); await loadInsts(); }); };
  const handleDelSem   = (id: string) => { if (!confirm("학기를 삭제할까요?")) return; run(async () => { await deleteSemester(uid, selInst!.id, id); await loadSems(); }); };
  const handleDelGroup = (id: string) => { if (!confirm("반을 삭제할까요?")) return; run(async () => { await deleteGroup(uid, selInst!.id, selSem!.id, id); await loadGroups(); }); };

  const openEdit = (g: Group) => { setSelGrp(g); setEditName(g.name); setEditStudents(g.students.join("\n")); setStep("edit"); setError(""); };

  const handleSelectGroup = (g: Group) => {
    if (!onSelectGroup || !selInst || !selSem) return;
    onSelectGroup(g.students, `${selInst.name} · ${selSem.name} · ${g.name}`);
    onClose();
  };

  const breadcrumb = [selInst?.name, selSem?.name, step === "edit" && selGrp?.name].filter(Boolean).join(" › ");

  if (!open) return null;

  const inputCls = "w-full border border-[#E8E0D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332]";
  const addBtnCls = "px-4 py-2 bg-[#1B4332] text-white text-sm font-semibold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40 transition-colors whitespace-nowrap";
  const rowCls = "flex items-center gap-2 p-3 rounded-xl border border-[#E8E0D0] hover:border-[#1B4332] cursor-pointer group transition-all";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">

        {/* 헤더 */}
        <div className="chalk-header px-5 py-4 flex items-center gap-3">
          {step !== "inst" && (
            <button onClick={() => {
              if (step === "edit")  { setStep("group"); setSelGrp(null); setError(""); }
              else if (step === "group") { setStep("sem"); setSelSem(null); setGroups([]); setInputName(""); setInputStudents(""); setError(""); }
              else if (step === "sem")   { setStep("inst"); setSelInst(null); setSems([]); setInputName(""); setError(""); }
            }} className="text-[#A8D5B7] hover:text-white text-xl">←</button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="chalk-text font-bold text-base">내 반 관리</h2>
            {breadcrumb && <p className="text-[#A8D5B7] text-[11px] truncate mt-0.5">{breadcrumb}</p>}
          </div>
          <button onClick={() => { reset(); onClose(); }} className="text-[#A8D5B7] hover:text-white text-xl">×</button>
        </div>

        {error && <div className="mx-5 mt-3 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

        {/* ── 기관 ── */}
        {step === "inst" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <p className="text-xs font-semibold text-[#4A4A4A]">📍 기관 선택</p>
            {insts.length === 0 && <p className="text-sm text-[#9A9A9A] py-6 text-center">기관을 추가해 주세요</p>}
            {insts.map(inst => (
              <div key={inst.id} className={rowCls} onClick={() => { setSelInst(inst); setStep("sem"); setInputName(""); setError(""); }}>
                <div className="w-8 h-8 rounded-lg bg-[#F0FFF4] flex items-center justify-center text-sm flex-shrink-0">🏫</div>
                <span className="flex-1 font-medium text-sm text-[#2D2D2D]">{inst.name}</span>
                <button onClick={e => { e.stopPropagation(); handleDelInst(inst.id); }} className="opacity-0 group-hover:opacity-100 text-[#CCC] hover:text-red-500 transition-all px-1">🗑</button>
                <span className="text-[#CCC] text-sm">›</span>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <input value={inputName} onChange={e => setInputName(e.target.value)} onKeyDown={e => e.key==="Enter" && inputName.trim() && handleAddInst()} placeholder="기관명 (예: 단국대 한국어교육원)" className={inputCls} />
              <button onClick={handleAddInst} disabled={busy || !inputName.trim()} className={addBtnCls}>+ 추가</button>
            </div>
          </div>
        )}

        {/* ── 학기 ── */}
        {step === "sem" && selInst && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <p className="text-xs font-semibold text-[#4A4A4A]">📅 학기 선택</p>
            <div className="flex flex-wrap gap-1.5">
              {["2025-봄","2025-여름","2025-가을","2025-겨울","2026-봄","2026-여름","2026-1학기","2026-2학기"].map(p => (
                <button key={p} onClick={() => setInputName(p)} className="px-2.5 py-1 rounded-full text-[11px] border border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332] hover:text-[#1B4332] transition-colors">{p}</button>
              ))}
            </div>
            {sems.length === 0 && <p className="text-sm text-[#9A9A9A] py-4 text-center">학기를 추가해 주세요</p>}
            {sems.map(sem => (
              <div key={sem.id} className={rowCls} onClick={() => { setSelSem(sem); setStep("group"); setInputName(""); setInputStudents(""); setError(""); }}>
                <div className="w-8 h-8 rounded-lg bg-[#EBF8FF] flex items-center justify-center text-sm flex-shrink-0">📅</div>
                <span className="flex-1 font-medium text-sm text-[#2D2D2D]">{sem.name}</span>
                <button onClick={e => { e.stopPropagation(); handleDelSem(sem.id); }} className="opacity-0 group-hover:opacity-100 text-[#CCC] hover:text-red-500 transition-all px-1">🗑</button>
                <span className="text-[#CCC] text-sm">›</span>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <input value={inputName} onChange={e => setInputName(e.target.value)} onKeyDown={e => e.key==="Enter" && inputName.trim() && handleAddSem()} placeholder="학기명 (예: 2026-봄)" className={inputCls} />
              <button onClick={handleAddSem} disabled={busy || !inputName.trim()} className={addBtnCls}>+ 추가</button>
            </div>
          </div>
        )}

        {/* ── 반 목록 ── */}
        {step === "group" && selInst && selSem && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <p className="text-xs font-semibold text-[#4A4A4A]">👥 반 선택</p>
            {groups.length === 0 && <p className="text-sm text-[#9A9A9A] py-4 text-center">반을 추가해 주세요</p>}
            {groups.map(g => (
              <div key={g.id} className="rounded-xl border border-[#E8E0D0] overflow-hidden group">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F0FFF4] flex items-center justify-center text-sm flex-shrink-0">👥</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#1B4332]">{g.name}</p>
                    <p className="text-[11px] text-[#9A9A9A]">{g.students.length}명 · {g.students.slice(0,4).join(", ")}{g.students.length > 4 ? " ..." : ""}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {onSelectGroup && (
                      <button onClick={() => handleSelectGroup(g)} className="px-2.5 py-1 bg-[#1B4332] text-white text-[11px] font-bold rounded-lg hover:bg-[#2D6A4F] transition-colors">불러오기</button>
                    )}
                    <button onClick={() => openEdit(g)} className="px-2.5 py-1 border border-[#E8E0D0] text-[#4A4A4A] text-[11px] rounded-lg hover:border-[#1B4332] transition-colors">수정</button>
                    <button onClick={() => handleDelGroup(g.id)} className="opacity-0 group-hover:opacity-100 text-[#CCC] hover:text-red-500 transition-all text-base px-1">🗑</button>
                  </div>
                </div>
              </div>
            ))}

            <div className="border border-dashed border-[#E8E0D0] rounded-xl p-4 space-y-2.5 mt-1">
              <p className="text-xs font-semibold text-[#4A4A4A]">+ 새 반 추가</p>
              <input value={inputName} onChange={e => setInputName(e.target.value)} placeholder="반 이름 (예: 5A급, 고급반)" className={inputCls} />
              <textarea value={inputStudents} onChange={e => setInputStudents(e.target.value)}
                placeholder={"학생 이름 (줄바꿈 또는 쉼표)\n\n예) 김유진\n이서준\n박민서"}
                rows={5} className={`${inputCls} resize-none`} />
              <button onClick={handleAddGroup} disabled={busy || !inputName.trim() || !inputStudents.trim()}
                className="w-full py-2.5 bg-[#1B4332] text-white text-sm font-bold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40 transition-colors">
                반 저장
              </button>
            </div>
          </div>
        )}

        {/* ── 반 수정 ── */}
        {step === "edit" && selGrp && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <p className="text-xs font-semibold text-[#4A4A4A]">✏️ 반 수정</p>
            <div>
              <label className="text-xs text-[#4A4A4A] font-medium block mb-1">반 이름</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-[#4A4A4A] font-medium block mb-1">
                학생 목록 ({editStudents.split(/[\n,]/).map(s=>s.trim()).filter(Boolean).length}명)
              </label>
              <textarea value={editStudents} onChange={e => setEditStudents(e.target.value)}
                rows={12} className={`${inputCls} resize-none`} />
            </div>
            <button onClick={handleUpdateGroup} disabled={busy}
              className="w-full py-3 bg-[#1B4332] text-white font-bold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40 transition-colors">
              {busy ? "저장 중..." : "수정 저장"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}