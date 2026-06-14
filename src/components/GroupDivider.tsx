"use client";

import { useState, useCallback } from "react";

interface Group { id: string; name: string; members: string[]; }

interface Props {
  preloadedStudents?: string[];
  preloadedLabel?: string;
  onOpenClassPanel?: () => void;
  isLoggedIn?: boolean;
}

const COLORS = [
  { bg: "#FFF0F0", border: "#FFAAAA", text: "#C53030", badge: "#C53030" },
  { bg: "#FFF8E8", border: "#F6C762", text: "#92630A", badge: "#B7791F" },
  { bg: "#F0FFF4", border: "#9AE6B4", text: "#276749", badge: "#276749" },
  { bg: "#EBF8FF", border: "#90CDF4", text: "#2C5282", badge: "#2B6CB0" },
  { bg: "#FAF5FF", border: "#D6BCFA", text: "#553C9A", badge: "#6B46C1" },
  { bg: "#FFF5F5", border: "#FEB2B2", text: "#742A2A", badge: "#C53030" },
  { bg: "#F0FFF4", border: "#9AE6B4", text: "#22543D", badge: "#276749" },
  { bg: "#FFFBEA", border: "#FAC862", text: "#744210", badge: "#B7791F" },
];

function makeId() { return Math.random().toString(36).slice(2, 8); }

export default function GroupMaker({ preloadedStudents = [], preloadedLabel = "", onOpenClassPanel, isLoggedIn }: Props) {
  const students = preloadedStudents;
  const [inputText,   setInputText]   = useState("");
  const [groups,      setGroups]      = useState<Group[]>([]);
  const [groupCount,  setGroupCount]  = useState(4);
  const [byCount,     setByCount]     = useState<"groups" | "perGroup">("groups");
  const [perGroup,    setPerGroup]    = useState(4);
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [dragSrc,     setDragSrc]     = useState<{ groupId: string; member: string } | null>(null);

  const effectiveStudents = students.length > 0 ? students
    : inputText.split(/[\n,，、]/).map(s => s.trim()).filter(Boolean);

  const divide = useCallback(() => {
    const pool = [...effectiveStudents].sort(() => Math.random() - 0.5);
    const n = byCount === "groups"
      ? groupCount
      : Math.ceil(pool.length / perGroup);
    const result: Group[] = Array.from({ length: n }, (_, i) => ({
      id: makeId(),
      name: `${i + 1}모둠`,
      members: [],
    }));
    pool.forEach((s, i) => result[i % n].members.push(s));
    setGroups(result);
    setCustomNames({});
  }, [effectiveStudents, byCount, groupCount, perGroup]);

  // 드래그 앤 드롭으로 학생 이동
  const handleDrop = (targetGroupId: string) => {
    if (!dragSrc || dragSrc.groupId === targetGroupId) return;
    setGroups(prev => prev.map(g => {
      if (g.id === dragSrc.groupId) return { ...g, members: g.members.filter(m => m !== dragSrc.member) };
      if (g.id === targetGroupId)   return { ...g, members: [...g.members, dragSrc.member] };
      return g;
    }));
    setDragSrc(null);
  };

  const handlePrint = () => {
    const cards = groups.map((g, i) => {
      const c = COLORS[i % COLORS.length];
      const memberRows = g.members.map(m => `
        <div style="padding:6px 0;border-bottom:1px solid #EEE;font-size:14px;color:#333;">${m}</div>
      `).join("");
      return `
        <div style="
          border:2px solid ${c.border}; border-radius:10px; padding:16px;
          background:${c.bg}; break-inside:avoid; margin-bottom:16px;
        ">
          <div style="font-size:16px;font-weight:800;color:${c.text};margin-bottom:10px;">
            ${customNames[g.id] ?? g.name}
            <span style="font-size:11px;font-weight:400;color:#999;margin-left:6px;">${g.members.length}명</span>
          </div>
          ${memberRows}
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
    <style>
      @page { size: A4; margin: 15mm; }
      body { font-family:'Noto Sans KR',sans-serif; }
      h2 { text-align:center; font-size:14px; color:#555; margin-bottom:16px; font-weight:500; }
      .grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
    </style>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&display=swap">
    </head><body>
    <h2>${preloadedLabel || "모둠 편성표"}</h2>
    <div class="grid">${cards}</div>
    <script>document.fonts.ready.then(()=>setTimeout(()=>{window.print();window.close();},300));<\/script>
    </body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open(); doc.write(html); doc.close();
    iframe.contentWindow?.addEventListener("afterprint", () => document.body.removeChild(iframe));
  };

  return (
    <div className="space-y-5">
      {preloadedLabel && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#F0FFF4] border border-[#9AE6B4] rounded-xl">
          <span className="text-sm">✅</span>
          <p className="text-sm font-semibold text-[#1B4332] flex-1 truncate">{preloadedLabel} · {students.length}명</p>
          {isLoggedIn && onOpenClassPanel && (
            <button onClick={onOpenClassPanel} className="text-xs text-[#2D6A4F] underline underline-offset-2">반 변경</button>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-[#1B4332] text-lg">모둠 나누기</h2>
          {isLoggedIn && onOpenClassPanel && !preloadedLabel && (
            <button onClick={onOpenClassPanel} className="flex items-center gap-1 text-xs text-[#1B4332] font-semibold bg-[#F0FFF4] border border-[#9AE6B4] px-2.5 py-1 rounded-lg">
              👥 반 불러오기
            </button>
          )}
        </div>

        {students.length === 0 && (
          <textarea value={inputText} onChange={e => setInputText(e.target.value)}
            placeholder={"학생 이름 입력 (줄바꿈 또는 쉼표)\n\n예) 김유진\n이서준\n박민서"}
            rows={4} className="w-full border border-[#E8E0D0] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#1B4332]" />
        )}

        {/* 모둠 설정 */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex rounded-lg overflow-hidden border border-[#E8E0D0]">
            {([["groups","모둠 수"],["perGroup","모둠당 인원"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setByCount(v)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${byCount === v ? "bg-[#1B4332] text-white" : "text-[#4A4A4A] hover:bg-[#F5F0E8]"}`}>
                {label}
              </button>
            ))}
          </div>
          {byCount === "groups" ? (
            <div className="flex items-center gap-2">
              <input type="number" min={2} max={12} value={groupCount} onChange={e => setGroupCount(Math.max(2, +e.target.value))}
                className="w-16 border border-[#E8E0D0] rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-[#1B4332]" />
              <span className="text-sm text-[#4A4A4A]">모둠</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input type="number" min={2} max={10} value={perGroup} onChange={e => setPerGroup(Math.max(2, +e.target.value))}
                className="w-16 border border-[#E8E0D0] rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-[#1B4332]" />
              <span className="text-sm text-[#4A4A4A]">명씩</span>
            </div>
          )}
          <span className="text-xs text-[#9A9A9A]">총 {effectiveStudents.length}명</span>
        </div>

        <div className="flex gap-2">
          <button onClick={divide} disabled={effectiveStudents.length === 0}
            className="flex-1 py-3 bg-[#1B4332] text-white font-bold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40 transition-colors">
            🎲 모둠 나누기
          </button>
          {groups.length > 0 && (
            <button onClick={handlePrint}
              className="px-5 py-3 bg-[#F2C94C] text-[#1B4332] font-bold rounded-lg hover:bg-[#EAB800] transition-colors">
              🖨️ 인쇄
            </button>
          )}
        </div>
      </div>

      {/* 모둠 결과 */}
      {groups.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groups.map((g, i) => {
            const c = COLORS[i % COLORS.length];
            return (
              <div key={g.id}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(g.id)}
                style={{ borderColor: c.border, backgroundColor: c.bg }}
                className="rounded-xl border-2 p-4 transition-all"
              >
                {/* 모둠명 */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    value={customNames[g.id] ?? g.name}
                    onChange={e => setCustomNames(prev => ({ ...prev, [g.id]: e.target.value }))}
                    style={{ color: c.text }}
                    className="font-bold text-base bg-transparent border-none outline-none flex-1 min-w-0"
                  />
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: c.border, color: c.text }}>
                    {g.members.length}명
                  </span>
                </div>
                {/* 멤버 */}
                <div className="space-y-1">
                  {g.members.map(m => (
                    <div key={m}
                      draggable
                      onDragStart={() => setDragSrc({ groupId: g.id, member: m })}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-white hover:border-gray-200 cursor-grab active:cursor-grabbing transition-all"
                    >
                      <span className="text-sm font-medium text-[#2D2D2D] flex-1">{m}</span>
                      <span className="text-[10px] text-[#CCCCCC]">⠿</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {groups.length > 0 && (
        <p className="text-xs text-[#9A9A9A] text-center">학생 이름을 드래그해서 다른 모둠으로 이동할 수 있어요</p>
      )}
    </div>
  );
}