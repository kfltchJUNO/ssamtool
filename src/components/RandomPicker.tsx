"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type PickerMode = "slot" | "ladder" | "cards";

interface RandomPickerProps {
  preloadedStudents?: string[];
  preloadedLabel?: string;
  onOpenClassPanel?: () => void;
  isLoggedIn?: boolean;
}

export default function RandomPicker({
  preloadedStudents = [],
  onOpenClassPanel,
  isLoggedIn
}: RandomPickerProps) {
  const [namesInput, setNamesInput] = useState("");
  const [nameList, setNameList] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [rolling, setRolling] = useState(false);
  const [excludePicked, setExcludePicked] = useState(true);
  const [pickCount, setPickCount] = useState(1);
  const [mode, setMode] = useState<PickerMode>("slot");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 카드 뒤집기 상태
  const [cardFlipped, setCardFlipped] = useState<Record<number, boolean>>({});

  const rollRef = useRef<NodeJS.Timeout | null>(null);

  const pool = excludePicked
    ? nameList.filter((n) => !picked.includes(n))
    : nameList;

  useEffect(() => {
    if (preloadedStudents.length > 0) {
      setNamesInput(preloadedStudents.join("\n"));
      setNameList(preloadedStudents);
      setPicked([]);
      setCurrent("");
    }
  }, [preloadedStudents]);

  // ── 난수 결과 사전 결정 (Pre-determination) ────────────────────
  const predeterminePick = useCallback((count: number) => {
    const available = [...pool];
    const finalPicked: string[] = [];
    const actualCount = Math.min(count, available.length);

    for (let i = 0; i < actualCount; i++) {
      const idx = Math.floor(Math.random() * available.length);
      finalPicked.push(available[idx]);
      available.splice(idx, 1);
    }
    return finalPicked;
  }, [pool]);

  // ── 빠른 뽑기 (슬롯머신) ──────────────────────────────────────────
  const pickRandomSlot = useCallback(() => {
    if (pool.length === 0 || rolling) return;

    // 1. 결과 먼저 결정
    const finalPicked = predeterminePick(pickCount);
    if (finalPicked.length === 0) return;

    setRolling(true);
    setCurrent("");

    let ticks = 0;
    const maxTicks = 20 + Math.floor(Math.random() * 15);

    const tick = () => {
      ticks++;
      const rand = pool[Math.floor(Math.random() * pool.length)];
      setCurrent(rand);

      const delay = ticks < maxTicks * 0.6 ? 60 : ticks < maxTicks * 0.85 ? 100 : 180;

      if (ticks < maxTicks) {
        rollRef.current = setTimeout(tick, delay);
      } else {
        setCurrent(finalPicked.join(", "));
        setPicked(prev => [...prev, ...finalPicked]);
        setRolling(false);
      }
    };

    tick();
  }, [pool, rolling, pickCount, predeterminePick]);

  // 애니메이션 스킵 (즉시 결과 표시)
  const skipAnimation = () => {
    if (rollRef.current) clearTimeout(rollRef.current);
    const finalPicked = predeterminePick(pickCount);
    if (finalPicked.length > 0) {
      setCurrent(finalPicked.join(", "));
      setPicked(prev => [...prev, ...finalPicked]);
    }
    setRolling(false);
  };

  const reset = () => {
    setPicked([]);
    setCurrent("");
    setRolling(false);
    setCardFlipped({});
    if (rollRef.current) clearTimeout(rollRef.current);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const EXAMPLE = "김유진\n이서준\n박민서\n최지우\n정하은\n강민준\n윤서연\n임채원\n한지호\n오수아";

  return (
    <div className={`space-y-5 ${isFullscreen ? "bg-[#1B4332] text-white p-8 fixed inset-0 z-50 overflow-y-auto" : ""}`}>
      
      {/* 명단 입력 카드 */}
      {!isFullscreen && (
        <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-[#1B4332] text-lg">🎲 랜덤 학생 뽑기</h2>
            <div className="flex items-center gap-3">
              {isLoggedIn && onOpenClassPanel && (
                <button onClick={onOpenClassPanel} className="text-xs text-[#1B4332] font-semibold bg-[#F0FFF4] border border-[#9AE6B4] px-2.5 py-1 rounded-lg">
                  👥 반 불러오기
                </button>
              )}
              <button onClick={() => { setNamesInput(EXAMPLE); setNameList(EXAMPLE.split("\n")); }} className="text-xs text-[#2D6A4F] underline">
                예시 입력
              </button>
            </div>
          </div>

          <textarea
            value={namesInput}
            onChange={e => {
              setNamesInput(e.target.value);
              setNameList(e.target.value.split(/[\n,]/).map(s => s.trim()).filter(Boolean));
            }}
            placeholder="학생 이름을 줄바꿈 또는 쉼표로 입력하세요..."
            className="w-full h-24 border border-[#E8E0D0] rounded-lg p-3 text-sm focus:outline-none focus:border-[#1B4332]"
          />

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={excludePicked} onChange={e => setExcludePicked(e.target.checked)} />
                <span>뽑힌 학생 자동 제외</span>
              </label>
              <div className="flex items-center gap-1">
                <span>추첨 인원:</span>
                <select value={pickCount} onChange={e => setPickCount(Number(e.target.value))} className="border rounded p-1">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}명</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={reset} className="px-3 py-1.5 border border-[#E8E0D0] text-[#4A4A4A] rounded-lg hover:border-[#1B4332]">
                초기화
              </button>
              <button onClick={toggleFullscreen} className="px-3 py-1.5 bg-[#475569] text-white font-bold rounded-lg">
                📺 TV/프로젝터 전체화면
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 연출 모드 선택 탭 (Task 7) */}
      <div className="flex gap-2 justify-center">
        {(["slot", "cards"] as PickerMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === m ? "bg-[#1B4332] text-white shadow-md" : "bg-white text-[#475569] border border-[#CBD5E1]"
            }`}
          >
            {m === "slot" && "🎰 빠른 슬롯머신"}
            {m === "cards" && "🎴 흥미진진 카드 뒤집기"}
          </button>
        ))}
      </div>

      {/* 1. 슬롯머신 모드 연출 */}
      {mode === "slot" && (
        <div className="bg-white rounded-2xl border-2 border-[#1B4332] p-8 text-center space-y-6 shadow-md">
          <div className="h-28 flex items-center justify-center bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <span className="text-4xl font-black text-[#1B4332] tracking-wider animate-pulse">
              {current || (pool.length === 0 ? "명단을 먼저 입력해주세요" : "준비 완료!")}
            </span>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={pickRandomSlot}
              disabled={pool.length === 0 || rolling}
              className="px-8 py-4 bg-[#1B4332] text-white text-lg font-black rounded-2xl hover:bg-[#2D6A4F] disabled:opacity-40 shadow-lg transition-transform active:scale-95"
            >
              {rolling ? "추첨 진행 중..." : "🎲 뽑기 시작!"}
            </button>
            {rolling && (
              <button onClick={skipAnimation} className="px-4 py-4 bg-gray-200 text-gray-700 text-sm font-bold rounded-2xl">
                ⏩ 스킵
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. 카드 뒤집기 연출 모드 */}
      {mode === "cards" && (
        <div className="bg-white rounded-2xl border-2 border-[#1B4332] p-6 space-y-4 text-center shadow-md">
          <p className="text-xs font-bold text-gray-500">카드를 직접 선택하여 클릭하면 당첨 학생이 공개됩니다!</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {pool.map((name, i) => (
              <div
                key={i}
                onClick={() => setCardFlipped(prev => ({ ...prev, [i]: !prev[i] }))}
                className={`h-24 rounded-xl cursor-pointer select-none flex items-center justify-center font-black text-sm transition-all duration-300 transform border-2 ${
                  cardFlipped[i]
                    ? "bg-[#F0FFF4] border-[#1B4332] text-[#1B4332] rotate-y-180 shadow-inner"
                    : "bg-[#1B4332] border-[#2D6A4F] text-[#F2C94C] shadow-md hover:-translate-y-1"
                }`}
              >
                {cardFlipped[i] ? name : `❓ 카드 ${i + 1}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 히스토리 현황 */}
      {picked.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E0D0] p-4 text-xs space-y-2">
          <span className="font-bold text-[#1B4332]">🏆 최근 뽑힌 학생 목록 ({picked.length}명):</span>
          <div className="flex flex-wrap gap-1.5">
            {picked.map((name, i) => (
              <span key={i} className="px-2.5 py-1 bg-[#F0FFF4] border border-[#9AE6B4] rounded-lg font-bold text-[#1B4332]">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}