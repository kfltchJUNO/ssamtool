"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import LadderGame from "@/components/picker/LadderGame";
import RacingGame from "@/components/picker/RacingGame";
import RouletteGame from "@/components/picker/RouletteGame";
import { playTick, playFanfare } from "@/lib/sound";

export type PickerMode = "slot" | "ladder" | "racing" | "roulette" | "cards";

interface RandomPickerProps {
  preloadedStudents?: string[];
  preloadedLabel?: string;
  onOpenClassPanel?: () => void;
  isLoggedIn?: boolean;
}

export default function RandomPicker({
  preloadedStudents = [],
  onOpenClassPanel,
  isLoggedIn,
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
  const [soundEnabled, setSoundEnabled] = useState(true);

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

    // 1. 결과 먼저 확정
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
      playTick(soundEnabled, 0.3);

      const delay = ticks < maxTicks * 0.6 ? 60 : ticks < maxTicks * 0.85 ? 100 : 180;

      if (ticks < maxTicks) {
        rollRef.current = setTimeout(tick, delay);
      } else {
        setCurrent(finalPicked.join(", "));
        setPicked(prev => [...prev, ...finalPicked]);
        setRolling(false);
        playFanfare(soundEnabled, 0.6);
      }
    };

    tick();
  }, [pool, rolling, pickCount, predeterminePick, soundEnabled]);

  // 애니메이션 스킵 (즉시 결과 표시)
  const skipAnimation = () => {
    if (rollRef.current) clearTimeout(rollRef.current);
    const finalPicked = predeterminePick(pickCount);
    if (finalPicked.length > 0) {
      setCurrent(finalPicked.join(", "));
      setPicked(prev => [...prev, ...finalPicked]);
    }
    setRolling(false);
    playFanfare(soundEnabled, 0.6);
  };

  const handleGameFinish = (winners: string[]) => {
    if (winners.length > 0) {
      setPicked(prev => Array.from(new Set([...prev, ...winners])));
      setCurrent(winners.join(", "));
    }
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
    <div className={`space-y-5 ${isFullscreen ? "bg-[#0F172A] text-white p-6 sm:p-10 fixed inset-0 z-50 overflow-y-auto min-h-screen" : ""}`}>
      
      {/* 명단 입력 카드 (전체화면 모드에서는 접힘) */}
      {!isFullscreen && (
        <div className="bg-white rounded-2xl border border-[#E8E0D0] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-[#1B4332] text-lg flex items-center gap-2">
              🎲 랜덤 학생 뽑기
            </h2>
            <div className="flex items-center gap-3">
              {isLoggedIn && onOpenClassPanel && (
                <button
                  onClick={onOpenClassPanel}
                  className="text-xs text-[#1B4332] font-semibold bg-[#F0FFF4] border border-[#9AE6B4] px-2.5 py-1 rounded-lg hover:bg-[#DCFCE7]"
                >
                  👥 반 불러오기
                </button>
              )}
              <button
                onClick={() => {
                  setNamesInput(EXAMPLE);
                  setNameList(EXAMPLE.split("\n"));
                }}
                className="text-xs text-[#2D6A4F] underline hover:text-[#1B4332]"
              >
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
            className="w-full h-24 border border-[#E8E0D0] rounded-xl p-3 text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
          />

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={excludePicked}
                  onChange={e => setExcludePicked(e.target.checked)}
                  className="rounded text-[#1B4332] focus:ring-[#1B4332]"
                />
                <span>뽑힌 학생 자동 제외 (남은 인원: <strong className="text-[#1B4332]">{pool.length}명</strong>)</span>
              </label>

              <div className="flex items-center gap-1.5">
                <span>추첨 인원:</span>
                <select
                  value={pickCount}
                  onChange={e => setPickCount(Number(e.target.value))}
                  className="border rounded-lg px-2 py-1 bg-white"
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n}명</option>
                  ))}
                </select>
              </div>

              {/* 효과음 토글 */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                  soundEnabled ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-gray-100 border-gray-300 text-gray-500"
                }`}
              >
                <span>{soundEnabled ? "🔊 소리 켜짐" : "🔇 소리 끔"}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={reset}
                className="px-3 py-1.5 border border-[#E8E0D0] text-[#4A4A4A] rounded-xl hover:border-[#1B4332] transition-colors"
              >
                초기화
              </button>
              <button
                onClick={toggleFullscreen}
                className="px-3 py-1.5 bg-[#475569] text-white font-bold rounded-xl hover:bg-[#334155] shadow-sm flex items-center gap-1"
              >
                <span>📺 TV/프로젝터 전체화면</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 전체화면 상단 간이 툴바 */}
      {isFullscreen && (
        <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-amber-400">🎲 쌤툴 랜덤 뽑기 (교실 화면)</span>
            <span className="text-xs text-slate-400">후보: {pool.length}명</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-white"
            >
              {soundEnabled ? "🔊 사운드 ON" : "🔇 사운드 OFF"}
            </button>
            <button
              onClick={toggleFullscreen}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-600 font-bold text-white hover:bg-red-700"
            >
              ✕ 전체화면 닫기
            </button>
          </div>
        </div>
      )}

      {/* 5대 인터랙티브 연출 모드 선택 탭 (Task 7) */}
      <div className="flex gap-2 justify-center flex-wrap">
        {[
          { id: "slot",     label: "🎰 빠른 슬롯" },
          { id: "ladder",   label: "🪜 사다리타기" },
          { id: "racing",   label: "🏎️ 달리기 레이싱" },
          { id: "roulette", label: "🎡 회전 룰렛" },
          { id: "cards",    label: "🎴 3D 카드 뒤집기" },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id as PickerMode)}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all ${
              mode === m.id
                ? "bg-[#1B4332] text-white shadow-lg scale-105"
                : "bg-white text-[#475569] border border-[#CBD5E1] hover:border-[#1B4332]"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── 1. 빠른 슬롯머신 모드 ── */}
      {mode === "slot" && (
        <div className="bg-white rounded-3xl border-2 border-[#1B4332] p-8 text-center space-y-6 shadow-xl">
          <div className="h-32 flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
            <span className="text-4xl sm:text-5xl font-black text-[#1B4332] tracking-wider animate-pulse">
              {current || (pool.length === 0 ? "명단을 먼저 입력해주세요" : "준비 완료!")}
            </span>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={pickRandomSlot}
              disabled={pool.length === 0 || rolling}
              className="px-10 py-4 bg-[#1B4332] text-white text-xl font-black rounded-2xl hover:bg-[#2D6A4F] disabled:opacity-40 shadow-xl transition-transform active:scale-95"
            >
              {rolling ? "🎲 추첨 중..." : "🎲 뽑기 시작!"}
            </button>
            {rolling && (
              <button
                onClick={skipAnimation}
                className="px-5 py-4 bg-gray-200 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-300"
              >
                ⏩ 스킵
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 2. 한국형 사다리타기 모드 ── */}
      {mode === "ladder" && (
        <div className="bg-white rounded-3xl border-2 border-emerald-700 p-6 shadow-xl">
          {pool.length < 2 ? (
            <div className="p-8 text-center text-gray-500 font-bold">
              사다리타기는 최소 2명 이상의 학생이 필요합니다.
            </div>
          ) : (
            <LadderGame
              candidates={pool}
              pickCount={pickCount}
              onFinish={handleGameFinish}
              soundEnabled={soundEnabled}
            />
          )}
        </div>
      )}

      {/* ── 3. 미니 달리기 레이싱 모드 ── */}
      {mode === "racing" && (
        <div className="bg-white rounded-3xl border-2 border-amber-600 p-6 shadow-xl">
          {pool.length < 2 ? (
            <div className="p-8 text-center text-gray-500 font-bold">
              레이싱은 최소 2명 이상의 학생이 필요합니다.
            </div>
          ) : (
            <RacingGame
              candidates={pool}
              pickCount={pickCount}
              onFinish={handleGameFinish}
              soundEnabled={soundEnabled}
            />
          )}
        </div>
      )}

      {/* ── 4. 회전 룰렛 모드 ── */}
      {mode === "roulette" && (
        <div className="bg-white rounded-3xl border-2 border-[#1B4332] p-6 shadow-xl">
          {pool.length < 2 ? (
            <div className="p-8 text-center text-gray-500 font-bold">
              회전 룰렛은 최소 2명 이상의 학생이 필요합니다.
            </div>
          ) : (
            <RouletteGame
              candidates={pool}
              onFinish={winner => handleGameFinish([winner])}
              soundEnabled={soundEnabled}
            />
          )}
        </div>
      )}

      {/* ── 5. 3D 카드 뒤집기 모드 ── */}
      {mode === "cards" && (
        <div className="bg-white rounded-3xl border-2 border-[#1B4332] p-6 space-y-4 text-center shadow-xl">
          <p className="text-sm font-bold text-gray-600">
            카드 번호를 클릭하면 숨겨진 학생 이름이 공개됩니다! 🎴
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
            {pool.map((name, i) => (
              <div
                key={i}
                onClick={() => {
                  setCardFlipped(prev => {
                    const next = { ...prev, [i]: !prev[i] };
                    if (!prev[i]) {
                      playFanfare(soundEnabled, 0.4);
                      handleGameFinish([name]);
                    }
                    return next;
                  });
                }}
                className={`h-24 rounded-2xl cursor-pointer select-none flex items-center justify-center font-black text-sm transition-all duration-300 transform border-2 ${
                  cardFlipped[i]
                    ? "bg-[#F0FFF4] border-[#1B4332] text-[#1B4332] shadow-inner scale-105"
                    : "bg-[#1B4332] border-[#2D6A4F] text-[#F2C94C] shadow-lg hover:-translate-y-1 hover:brightness-110"
                }`}
              >
                {cardFlipped[i] ? name : `❓ 카드 ${i + 1}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 히스토리 현황 카드 */}
      {picked.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8E0D0] p-4 text-xs space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-black text-[#1B4332] flex items-center gap-1.5">
              🏆 최근 당첨 학생 명단 ({picked.length}명)
            </span>
            <button
              onClick={() => setPicked([])}
              className="text-[11px] text-gray-500 hover:text-red-600 underline"
            >
              기록 비우기
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {picked.map((name, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-[#F0FFF4] border border-[#9AE6B4] rounded-xl font-bold text-[#1B4332]"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
