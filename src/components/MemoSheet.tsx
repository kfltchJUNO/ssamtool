"use client";

import { useState } from "react";

interface Props {
  preloadedStudents?: string[];
  preloadedLabel?: string;
  onOpenClassPanel?: () => void;
  isLoggedIn?: boolean;
}

type SheetMode = "list" | "seating";

// 자리표 기반용 미니 그리드 (자리표 컴포넌트와 별개로 간단하게)
interface SeatCell { x: number; y: number; name: string | null; }

export default function MemoSheet({ preloadedStudents = [], preloadedLabel = "", onOpenClassPanel, isLoggedIn }: Props) {
  const students = preloadedStudents;
  const [inputText,  setInputText]  = useState("");
  const [sheetMode,  setSheetMode]  = useState<SheetMode>("list");
  const [sheetTitle, setSheetTitle] = useState("");
  const [cols,       setCols]       = useState(5);
  const [rows,       setRows]       = useState(4);
  const [seats,      setSeats]      = useState<SeatCell[]>([]);
  const [memoLabel,  setMemoLabel]  = useState("특이사항 / 메모");

  const pool = students.length > 0 ? students
    : inputText.split(/[\n,，、]/).map(s => s.trim()).filter(Boolean);

  // 자리 배치 초기화 (명단순으로 자동 채움)
  const initSeats = () => {
    const next: SeatCell[] = [];
    let idx = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        next.push({ x, y, name: pool[idx] ?? null });
        idx++;
      }
    }
    setSeats(next);
  };

  // 자리 이름 변경
  const updateSeat = (x: number, y: number, name: string) => {
    setSeats(prev => prev.map(s => s.x === x && s.y === y ? { ...s, name: name || null } : s));
  };

  // ── 명단 기반 인쇄 ──
  const printList = () => {
    const rows_html = pool.map((name, i) => `
      <tr style="border-bottom:1px solid #EEE;">
        <td style="width:36px;text-align:center;font-size:12px;color:#AAA;padding:10px 6px;">${i + 1}</td>
        <td style="padding:10px 14px;font-size:15px;font-weight:600;color:#111;width:100px;">${name}</td>
        <td style="padding:10px 8px;">
          <div style="border-bottom:1px solid #DDD;min-height:28px;"></div>
        </td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
    <style>
      @page { size: A4; margin: 15mm; }
      body { font-family:'Noto Sans KR',sans-serif; }
      h2 { text-align:center; font-size:18px; font-weight:800; margin-bottom:4px; }
      p  { text-align:center; font-size:11px; color:#888; margin-bottom:14px; }
      table { width:100%; border-collapse:collapse; }
      th { background:#1B4332; color:#F2C94C; font-size:11px; padding:9px 12px; text-align:left; }
      tr:nth-child(even) td { background:#FAFAFA; }
    </style>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@600;800&display=swap">
    </head><body>
    <h2>${sheetTitle || "학생 메모 시트"}</h2>
    <p>${preloadedLabel || ""}  · 총 ${pool.length}명</p>
    <table>
      <thead><tr>
        <th style="width:36px;">#</th>
        <th style="width:100px;">이름</th>
        <th>${memoLabel}</th>
      </tr></thead>
      <tbody>${rows_html}</tbody>
    </table>
    <script>document.fonts.ready.then(()=>setTimeout(()=>{window.print();window.close();},300));<\/script>
    </body></html>`;

    printHTML(html);
  };

  // ── 자리표 기반 인쇄 ──
  const printSeating = () => {
    const CELL_W = 130, CELL_H = 110, GAP = 10, PAD = 20;
    const cells = seats.map(s => `
      <div style="
        position:absolute;
        left:${PAD + s.x*(CELL_W+GAP)}px;
        top:${PAD + s.y*(CELL_H+GAP)}px;
        width:${CELL_W}px; height:${CELL_H}px;
        border:1.5px solid #CCCCCC; border-radius:6px;
        box-sizing:border-box; overflow:hidden;
        background:#fff;
      ">
        <div style="
          background:#F5F5F5; border-bottom:1px solid #EEE;
          padding:6px 8px; font-size:13px; font-weight:700; color:#111;
        ">${s.name ?? ""}</div>
        <div style="padding:4px 8px; font-size:10px; color:#AAA; border-bottom:1px dotted #EEE; min-height:26px;"></div>
        <div style="padding:4px 8px; font-size:10px; color:#AAA; min-height:26px;"></div>
      </div>`).join("");

    const totalW = PAD * 2 + cols * (CELL_W + GAP);
    const totalH = PAD * 2 + rows * (CELL_H + GAP);

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family:'Noto Sans KR',sans-serif; }
      h2 { text-align:center; font-size:13px; color:#555; margin-bottom:8px; font-weight:500; }
    </style>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&display=swap">
    </head><body>
    <h2>${sheetTitle || "자리표 메모 시트"} ${preloadedLabel ? "· " + preloadedLabel : ""}</h2>
    <div style="position:relative;width:${totalW}px;height:${totalH}px;margin:0 auto;">${cells}</div>
    <script>document.fonts.ready.then(()=>setTimeout(()=>{window.print();window.close();},300));<\/script>
    </body></html>`;

    printHTML(html);
  };

  const printHTML = (html: string) => {
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
          <h2 className="font-bold text-[#1B4332] text-lg">학생 메모 시트</h2>
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

        {/* 시트 정보 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[#4A4A4A] block mb-1">시트 제목</label>
            <input value={sheetTitle} onChange={e => setSheetTitle(e.target.value)}
              placeholder="예: 5A 발음 교정 메모"
              className="w-full border border-[#E8E0D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#4A4A4A] block mb-1">메모 칸 라벨</label>
            <input value={memoLabel} onChange={e => setMemoLabel(e.target.value)}
              className="w-full border border-[#E8E0D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332]" />
          </div>
        </div>

        {/* 모드 선택 */}
        <div>
          <p className="text-xs font-semibold text-[#4A4A4A] mb-2">양식 유형</p>
          <div className="flex gap-2">
            {([["list","📋 명단순"],["seating","🪑 자리표 기반"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setSheetMode(v)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${sheetMode === v ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332]" : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 자리표 기반일 때 그리드 설정 */}
        {sheetMode === "seating" && (
          <div className="space-y-3 p-4 bg-[#F9F9F9] rounded-xl border border-[#E8E0D0]">
            <p className="text-xs font-semibold text-[#4A4A4A]">자리 배열 설정</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#4A4A4A]">가로</label>
                <input type="number" min={2} max={8} value={cols} onChange={e => setCols(+e.target.value)}
                  className="w-14 border border-[#E8E0D0] rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-[#1B4332]" />
                <label className="text-xs text-[#4A4A4A]">세로</label>
                <input type="number" min={2} max={8} value={rows} onChange={e => setRows(+e.target.value)}
                  className="w-14 border border-[#E8E0D0] rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-[#1B4332]" />
              </div>
              <button onClick={initSeats}
                className="px-3 py-1.5 bg-[#1B4332] text-white text-xs font-semibold rounded-lg hover:bg-[#2D6A4F] transition-colors">
                자리 배치 초기화
              </button>
            </div>

            {/* 미니 그리드 편집 */}
            {seats.length > 0 && (
              <div className="overflow-x-auto">
                <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols}, 80px)`, gap:4, width:"fit-content" }}>
                  {seats.map(s => (
                    <input key={`${s.x}-${s.y}`}
                      value={s.name ?? ""}
                      onChange={e => updateSeat(s.x, s.y, e.target.value)}
                      placeholder="이름"
                      className="border border-[#E8E0D0] rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-[#1B4332]"
                      style={{ width:80 }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={sheetMode === "list" ? printList : printSeating}
          disabled={pool.length === 0 || (sheetMode === "seating" && seats.length === 0)}
          className="w-full py-3 bg-[#F2C94C] text-[#1B4332] font-bold rounded-lg hover:bg-[#EAB800] disabled:opacity-40 transition-colors">
          🖨️ 인쇄
        </button>
      </div>

      {/* 명단 미리보기 */}
      {sheetMode === "list" && pool.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E0D0] shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E8E0D0] bg-[#1B4332]">
            <p className="text-xs font-bold text-[#F2C94C]"># 이름 · {memoLabel}</p>
          </div>
          <div className="divide-y divide-[#F5F0E8]">
            {pool.map((name, i) => (
              <div key={`${name}-${i}`} className="flex items-center gap-3 px-5 py-2.5">
                <span className="w-6 text-xs text-[#CCCCCC] text-center flex-shrink-0">{i + 1}</span>
                <span className="w-24 font-semibold text-sm text-[#2D2D2D]">{name}</span>
                <div className="flex-1 border-b border-dashed border-[#E8E0D0] h-5" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}