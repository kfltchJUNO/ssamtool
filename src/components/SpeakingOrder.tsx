"use client";

import { useState, useEffect } from "react";

interface Props {
  preloadedStudents?: string[];
  preloadedLabel?: string;
  onOpenClassPanel?: () => void;
  isLoggedIn?: boolean;
}

type SortMode = "random" | "alpha" | "manual" | "original" | "reverse";

interface TimeConfig {
  startHour:   number;
  startMin:    number;
  examMin:     number;
  breakMin:    number;
  breakEvery:  number; // N명마다 휴식
  groupSize:   number; // 대기 그룹 크기
}

interface SlotInfo {
  name:       string;
  startMin:   number; // 시험 시작 (분 단위, 0 = 전체 시작)
  endMin:     number;
  groupIndex: number; // 몇 번째 대기 그룹
  waitStart:  number; // 이 그룹의 대기 시작 시간
  waitEnd:    number; // 이 그룹의 대기 종료 시간 (= 마지막 순서의 endMin)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function toHHMM(baseHour: number, baseMin: number, offsetMin: number): string {
  const total = baseHour * 60 + baseMin + offsetMin;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${pad(h)}:${pad(m)}`;
}

// 순서 배열 → 슬롯 계산
function calcSlots(names: string[], cfg: TimeConfig): SlotInfo[] {
  const slots: SlotInfo[] = [];
  let cursor = 0; // 경과 분

  names.forEach((name, i) => {
    // 쉬는 시간 삽입 (첫 번째 이전 제외)
    if (cfg.breakMin > 0 && cfg.breakEvery > 0 && i > 0 && i % cfg.breakEvery === 0) {
      cursor += cfg.breakMin;
    }

    const groupIndex = Math.floor(i / cfg.groupSize);
    slots.push({
      name,
      startMin: cursor,
      endMin:   cursor + cfg.examMin,
      groupIndex,
      waitStart: 0, // 아래서 채움
      waitEnd:   0,
    });
    cursor += cfg.examMin;
  });

  // 그룹별 대기 시간 계산
  const groups = new Map<number, number[]>();
  slots.forEach((s, i) => {
    if (!groups.has(s.groupIndex)) groups.set(s.groupIndex, []);
    groups.get(s.groupIndex)!.push(i);
  });

  groups.forEach((indices) => {
    const first = slots[indices[0]].startMin;
    const last  = slots[indices[indices.length - 1]].endMin;
    indices.forEach(i => {
      slots[i].waitStart = first;
      slots[i].waitEnd   = last;
    });
  });

  return slots;
}

const DEFAULT_CFG: TimeConfig = {
  startHour:  9,
  startMin:   0,
  examMin:    10,
  breakMin:   5,
  breakEvery: 5,
  groupSize:  5,
};

export default function SpeakingOrder({
  preloadedStudents = [],
  preloadedLabel = "",
  onOpenClassPanel,
  isLoggedIn,
}: Props) {
  const [namesInput,  setNamesInput]  = useState("");
  const [students,    setStudents]    = useState<string[]>([]);
  const [sortMode,    setSortMode]    = useState<SortMode>("random");
  const [ordered,     setOrdered]     = useState<string[]>([]);
  const [generated,   setGenerated]   = useState(false);
  const [examDate,    setExamDate]    = useState("");
  const [examTitle,   setExamTitle]   = useState("말하기 시험");
  const [showTime,    setShowTime]    = useState(true);
  const [cfg,         setCfg]         = useState<TimeConfig>(DEFAULT_CFG);
  const [slots,       setSlots]       = useState<SlotInfo[]>([]);

  useEffect(() => {
    if (preloadedStudents.length > 0) {
      setStudents(preloadedStudents);
      setNamesInput(preloadedStudents.join("\n"));
    }
  }, [preloadedStudents]);

  useEffect(() => {
    const t = new Date();
    setExamDate(`${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`);
  }, []);

  // ordered 변경 시 슬롯 재계산
  useEffect(() => {
    if (ordered.length > 0) setSlots(calcSlots(ordered, cfg));
  }, [ordered, cfg]);

  const applyNames = () => {
    const lines = namesInput.split(/[\n,，、]/).map(s => s.trim()).filter(Boolean);
    setStudents(lines);
    setGenerated(false);
  };

  const buildOrder = (mode: SortMode, base: string[]): string[] => {
    if (mode === "random")   return shuffle(base);
    if (mode === "alpha")    return [...base].sort((a, b) => a.localeCompare(b, "ko"));
    if (mode === "original") return [...base];
    if (mode === "reverse")  return [...base].reverse();
    return [...base]; // manual
  };

  const generate = () => {
    const result = buildOrder(sortMode, students);
    setOrdered(result);
    setGenerated(true);
  };

  const reshuffle = () => {
    if (sortMode === "random") setOrdered(shuffle(ordered));
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    const a = [...ordered]; [a[i-1], a[i]] = [a[i], a[i-1]]; setOrdered(a);
  };
  const moveDown = (i: number) => {
    if (i === ordered.length - 1) return;
    const a = [...ordered]; [a[i], a[i+1]] = [a[i+1], a[i]]; setOrdered(a);
  };

  const updateCfg = (key: keyof TimeConfig, val: number) => {
    setCfg(prev => ({ ...prev, [key]: val }));
  };

  // 슬롯에서 대기 그룹 요약
  const waitGroups = (): { label: string; waitRange: string; members: string[] }[] => {
    const map = new Map<number, SlotInfo[]>();
    slots.forEach(s => {
      if (!map.has(s.groupIndex)) map.set(s.groupIndex, []);
      map.get(s.groupIndex)!.push(s);
    });
    return Array.from(map.entries()).map(([gi, ss]) => ({
      label: `${gi * cfg.groupSize + 1}~${Math.min((gi+1)*cfg.groupSize, ordered.length)}번`,
      waitRange: `${toHHMM(cfg.startHour, cfg.startMin, ss[0].waitStart)} ~ ${toHHMM(cfg.startHour, cfg.startMin, ss[ss.length-1].waitEnd)} 대기`,
      members: ss.map(s => s.name),
    }));
  };

  const handlePrint = () => {
    // ── 이미지 형식 그대로: 번호 / 학생이름 / 시험준비(병합) / 시험시간(병합) ──
    const useTime = showTime && slots.length > 0;

    // 그룹별 행 구성
    const groupMap = new Map<number, SlotInfo[]>();
    (useTime ? slots : ordered.map((name, i) => ({
      name, startMin: i * cfg.examMin, endMin: (i+1) * cfg.examMin,
      groupIndex: Math.floor(i / cfg.groupSize),
      waitStart: Math.floor(i / cfg.groupSize) * cfg.groupSize * cfg.examMin,
      waitEnd:   (Math.floor(i / cfg.groupSize) + 1) * cfg.groupSize * cfg.examMin,
    } as SlotInfo))).forEach(s => {
      if (!groupMap.has(s.groupIndex)) groupMap.set(s.groupIndex, []);
      groupMap.get(s.groupIndex)!.push(s);
    });

    let tableRows = "";

    groupMap.forEach((groupSlots, gi) => {
      const groupSize = groupSlots.length;
      const waitStartStr = toHHMM(cfg.startHour, cfg.startMin, groupSlots[0].waitStart);
      const examStartStr = toHHMM(cfg.startHour, cfg.startMin, groupSlots[0].startMin);
      const examEndStr   = toHHMM(cfg.startHour, cfg.startMin, groupSlots[groupSlots.length-1].endMin);

      // 대기 안내 텍스트
      const waitText = useTime
        ? `<b>${waitStartStr.replace(":","시 ").replace(/(\d+)$/, "$1분")}</b>에<br>교실 앞에서<br>기다리세요.`
        : `${gi+1}그룹 대기`;

      // 시험 시간 범위
      const examRangeText = `${examStartStr}~${examEndStr}`;

      groupSlots.forEach((s, ri) => {
        const isFirst = ri === 0;
        const numInOrder = ordered.indexOf(s.name) + 1;
        const examTimeCell = isFirst
          ? `<td rowspan="${groupSize}" style="${examTimeTd}">${examRangeText}</td>`
          : "";
        const prepCell = isFirst
          ? `<td rowspan="${groupSize}" style="${prepTd}">${waitText}</td>`
          : "";

        tableRows += `<tr>
          <td style="${numTd}">${numInOrder}</td>
          <td style="${nameTd}">${s.name}</td>
          ${prepCell}
          ${examTimeCell}
        </tr>`;
      });

      // 쉬는 시간 행 (마지막 그룹 제외)
      if (gi < groupMap.size - 1 && cfg.breakMin > 0) {
        const breakStart = toHHMM(cfg.startHour, cfg.startMin, groupSlots[groupSlots.length-1].endMin);
        const breakEnd   = toHHMM(cfg.startHour, cfg.startMin, groupSlots[groupSlots.length-1].endMin + cfg.breakMin);
        tableRows += `<tr style="background:#FFFF00;">
          <td colspan="4" style="
            padding:10px 16px;
            border:2px solid #333;
            text-align:center;
            font-size:16px;
            font-weight:900;
            text-decoration:underline;
          ">쉬는 시간&nbsp;&nbsp;&nbsp;&nbsp;<span style="font-weight:400;font-size:15px;">${breakStart}~${breakEnd}</span></td>
        </tr>`;
      }
    });

    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 14mm; }
        body { font-family: 'Noto Sans KR', sans-serif; margin: 0; }
        table { width: 100%; border-collapse: collapse; }
        h1 { font-size: 22px; font-weight: 900; text-align: center; margin: 0 0 20px; letter-spacing: 2px; }
      </style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap">
    </head><body>
      <h1>[ ${preloadedLabel || examTitle} 말하기 시험 시간 ]</h1>
      <table>
        <thead>
          <tr style="border-top:3px solid #009999;border-bottom:2px solid #009999;">
            <th style="${thStyle};width:40px;"></th>
            <th style="${thStyle}">학생 이름</th>
            <th style="${thStyle}">시험 준비</th>
            <th style="${thStyle};color:#0000FF;font-size:16px;">시험 시간</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
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

  // 인쇄 셀 스타일 상수
  const border  = "border:1.5px solid #999;";
  const numTd   = `padding:8px 6px;${border}text-align:center;font-size:15px;font-weight:700;`;
  const nameTd  = `padding:8px 14px;${border}font-size:16px;font-weight:700;text-align:center;`;
  const prepTd  = `padding:12px 14px;${border}font-size:14px;line-height:1.9;text-align:center;vertical-align:middle;`;
  const examTimeTd = `padding:12px 14px;${border}font-size:20px;font-weight:900;color:#0000FF;text-align:center;vertical-align:middle;`;
  const thStyle = `padding:10px 14px;${border}font-size:14px;font-weight:700;text-align:center;background:#fff;`;

  const inputCls = "border border-[#E8E0D0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B4332]";
  const numCls   = "w-16 border border-[#E8E0D0] rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-[#1B4332]";

  const SORT_OPTIONS: { id: SortMode; label: string }[] = [
    { id: "random",   label: "🎲 랜덤" },
    { id: "alpha",    label: "가나다순" },
    { id: "original", label: "출석부순" },
    { id: "reverse",  label: "출석부역순" },
    { id: "manual",   label: "✋ 수동 조정" },
  ];

  return (
    <div className="space-y-4">
      {/* ── 설정 패널 ── */}
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[#1B4332] text-lg">말하기 시험 순서</h2>
          {isLoggedIn && onOpenClassPanel && (
            <button onClick={onOpenClassPanel}
              className="flex items-center gap-1 text-xs text-[#1B4332] font-semibold bg-[#F0FFF4] border border-[#9AE6B4] px-2.5 py-1.5 rounded-lg hover:bg-[#D4EDDA] transition-colors">
              👥 반 불러오기
            </button>
          )}
        </div>

        {preloadedLabel && (
          <div className="text-xs text-[#2D6A4F] bg-[#F0FFF4] px-3 py-1.5 rounded-lg border border-[#9AE6B4]">
            ✅ {preloadedLabel} · {students.length}명
          </div>
        )}

        {!preloadedLabel && (
          <div className="flex gap-2">
            <textarea value={namesInput} onChange={e => setNamesInput(e.target.value)}
              placeholder="학생 이름 (줄바꿈 또는 쉼표)" rows={4}
              className="flex-1 border border-[#E8E0D0] rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[#1B4332]" />
            <button onClick={applyNames}
              className="px-3 py-2 bg-[#1B4332] text-white text-sm font-semibold rounded-lg hover:bg-[#2D6A4F] self-end">
              적용
            </button>
          </div>
        )}

        {/* 시험 기본 정보 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-[#4A4A4A] block mb-1">시험 제목</label>
            <input value={examTitle} onChange={e => setExamTitle(e.target.value)} className={`w-full ${inputCls}`} />
          </div>
          <div>
            <label className="text-xs font-medium text-[#4A4A4A] block mb-1">시험 날짜</label>
            <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className={`w-full ${inputCls}`} />
          </div>
        </div>

        {/* 순서 방식 */}
        <div>
          <p className="text-xs font-semibold text-[#4A4A4A] mb-2">순서 방식</p>
          <div className="flex gap-2 flex-wrap">
            {SORT_OPTIONS.map(({ id, label }) => (
              <button key={id} onClick={() => setSortMode(id)}
                className={`px-3 py-2 rounded-lg text-sm border-2 font-semibold transition-all ${
                  sortMode === id
                    ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332]"
                    : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 시간 설정 */}
        <div>
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={showTime} onChange={e => setShowTime(e.target.checked)} className="accent-[#1B4332]" />
            <span className="text-sm font-semibold text-[#4A4A4A]">시간 자동 계산</span>
          </label>

          {showTime && (
            <div className="bg-[#F9F9F9] rounded-xl border border-[#E8E0D0] p-4 space-y-3">
              {/* 시작 시간 */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-[#4A4A4A] w-20">시작 시간</span>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} max={23} value={cfg.startHour}
                    onChange={e => updateCfg("startHour", Number(e.target.value))}
                    className={numCls} />
                  <span className="text-sm text-[#4A4A4A]">시</span>
                  <input type="number" min={0} max={59} value={cfg.startMin}
                    onChange={e => updateCfg("startMin", Number(e.target.value))}
                    className={numCls} />
                  <span className="text-sm text-[#4A4A4A]">분</span>
                </div>
              </div>

              {/* 시험 시간 */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-[#4A4A4A] w-20">시험 시간</span>
                <div className="flex items-center gap-1">
                  <input type="number" min={1} max={60} value={cfg.examMin}
                    onChange={e => updateCfg("examMin", Number(e.target.value))}
                    className={numCls} />
                  <span className="text-sm text-[#4A4A4A]">분 / 명</span>
                </div>
              </div>

              {/* 쉬는 시간 */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-[#4A4A4A] w-20">쉬는 시간</span>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} max={60} value={cfg.breakMin}
                    onChange={e => updateCfg("breakMin", Number(e.target.value))}
                    className={numCls} />
                  <span className="text-sm text-[#4A4A4A]">분씩,</span>
                  <input type="number" min={1} max={20} value={cfg.breakEvery}
                    onChange={e => updateCfg("breakEvery", Number(e.target.value))}
                    className={numCls} />
                  <span className="text-sm text-[#4A4A4A]">명마다</span>
                </div>
                {cfg.breakMin === 0 && <span className="text-xs text-[#9A9A9A]">0이면 쉬는 시간 없음</span>}
              </div>

              {/* 대기 그룹 */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-[#4A4A4A] w-20">대기 그룹</span>
                <div className="flex items-center gap-1">
                  <input type="number" min={1} max={30} value={cfg.groupSize}
                    onChange={e => updateCfg("groupSize", Number(e.target.value))}
                    className={numCls} />
                  <span className="text-sm text-[#4A4A4A]">명씩 묶어서 대기</span>
                </div>
              </div>

              {/* 미리보기 */}
              {students.length > 0 && cfg.groupSize > 0 && (
                <div className="mt-2 text-xs text-[#2D6A4F] bg-[#F0FFF4] rounded-lg px-3 py-2 border border-[#9AE6B4]">
                  예시: 1번 {toHHMM(cfg.startHour, cfg.startMin, 0)} 시작 →
                  {" "}{cfg.groupSize}번 {toHHMM(cfg.startHour, cfg.startMin, cfg.examMin * (cfg.groupSize - 1))} 시작 /
                  {" "}1~{cfg.groupSize}번 {toHHMM(cfg.startHour, cfg.startMin, 0)}~{toHHMM(cfg.startHour, cfg.startMin, cfg.examMin * cfg.groupSize)} 대기
                  {cfg.breakMin > 0 && ` · ${cfg.breakEvery}명 후 ${cfg.breakMin}분 휴식`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 생성 버튼 */}
        <div className="flex gap-2">
          <button onClick={generate} disabled={students.length === 0}
            className="flex-1 py-3 bg-[#1B4332] text-white font-bold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40 transition-colors">
            순서 생성
          </button>
          {generated && sortMode === "random" && (
            <button onClick={reshuffle}
              className="px-4 py-3 border-2 border-[#1B4332] text-[#1B4332] font-bold rounded-lg hover:bg-[#F0FFF4]">
              ↺ 다시
            </button>
          )}
        </div>
      </div>

      {/* ── 결과 ── */}
      {generated && ordered.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-[#1B4332]">{examTitle}</h3>
              <p className="text-xs text-[#9A9A9A] mt-0.5">
                {examDate} · {ordered.length}명
                {showTime && ` · 시험 ${cfg.examMin}분/명`}
                {showTime && cfg.breakMin > 0 && ` · 휴식 ${cfg.breakMin}분/${cfg.breakEvery}명`}
              </p>
            </div>
            <button onClick={handlePrint}
              className="px-3 py-1.5 bg-[#F2C94C] text-[#1B4332] text-xs font-bold rounded-lg hover:bg-[#EAB800]">
              🖨️ 인쇄
            </button>
          </div>

          {/* 대기 그룹 요약 */}
          {showTime && cfg.groupSize > 1 && slots.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {waitGroups().map(g => (
                <div key={g.label} className="border-2 border-[#9AE6B4] bg-[#F0FFF4] rounded-xl px-3 py-2">
                  <span className="text-xs font-bold text-[#1B4332]">{g.label}</span>
                  <span className="text-xs text-[#2D6A4F] ml-2">{g.waitRange}</span>
                </div>
              ))}
            </div>
          )}

          {/* 순서 목록 */}
          <div className="space-y-1">
            {ordered.map((name, i) => {
              const slot = slots[i];
              const isBreakBefore = showTime && cfg.breakMin > 0 && cfg.breakEvery > 0
                && i > 0 && i % cfg.breakEvery === 0;

              return (
                <div key={`${name}-${i}`}>
                  {/* 쉬는 시간 구분선 */}
                  {isBreakBefore && slot && (
                    <div className="flex items-center gap-2 my-2">
                      <div className="flex-1 border-t border-dashed border-[#E8E0D0]" />
                      <span className="text-[11px] text-[#9A9A9A] whitespace-nowrap">
                        🔔 휴식 {cfg.breakMin}분 ({toHHMM(cfg.startHour, cfg.startMin, slot.startMin - cfg.breakMin)} ~ {toHHMM(cfg.startHour, cfg.startMin, slot.startMin)})
                      </span>
                      <div className="flex-1 border-t border-dashed border-[#E8E0D0]" />
                    </div>
                  )}

                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#E8E0D0] hover:border-[#1B4332] transition-colors group">
                    {/* 번호 */}
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1B4332] text-white text-sm font-bold flex-shrink-0">
                      {i + 1}
                    </span>

                    {/* 이름 */}
                    <span className="font-bold text-[#111] text-base flex-1">{name}</span>

                    {/* 시간 */}
                    {showTime && slot && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-[#1B4332]">
                          {toHHMM(cfg.startHour, cfg.startMin, slot.startMin)}
                          {" ~ "}
                          {toHHMM(cfg.startHour, cfg.startMin, slot.endMin)}
                        </div>
                        {cfg.groupSize > 1 && (
                          <div className="text-[11px] text-[#9A9A9A]">
                            대기 {toHHMM(cfg.startHour, cfg.startMin, slot.waitStart)}~{toHHMM(cfg.startHour, cfg.startMin, slot.waitEnd)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 수동 이동 버튼 */}
                    {(sortMode === "manual" || generated) && (
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveUp(i)} disabled={i === 0}
                          className="w-6 h-5 text-[#4A4A4A] hover:text-[#1B4332] disabled:opacity-20 text-xs leading-none">▲</button>
                        <button onClick={() => moveDown(i)} disabled={i === ordered.length - 1}
                          className="w-6 h-5 text-[#4A4A4A] hover:text-[#1B4332] disabled:opacity-20 text-xs leading-none">▼</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}