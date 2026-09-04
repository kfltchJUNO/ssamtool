"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { playTick, playBooster, playFanfare } from "@/lib/sound";

interface BombGameProps {
  candidates: string[];
  pickCount: number;
  onFinish: (winnerNames: string[]) => void;
  soundEnabled: boolean;
}

export default function BombGame({
  candidates,
  pickCount,
  onFinish,
  soundEnabled,
}: BombGameProps) {
  const activeCandidates = useMemo(() => candidates.slice(0, 20), [candidates]);
  const numStudents = activeCandidates.length;

  const [running, setRunning] = useState(false);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [exploded, setExploded] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [fuseProgress, setFuseProgress] = useState(0); // 0 to 1

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const startBomb = () => {
    if (running || numStudents < 2) return;
    setRunning(true);
    setExploded(false);
    setWinner(null);
    setFuseProgress(0);

    // 1. 사전 결정: 누가 당첨(폭탄)될지 확정
    const targetIdx = Math.floor(Math.random() * numStudents);
    const chosenWinner = activeCandidates[targetIdx];

    const duration = 5000 + Math.random() * 1800; // 5~6.8초
    const startTime = performance.now();

    let cur = Math.floor(Math.random() * numStudents);
    setCurrentIdx(cur);

    const step = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setFuseProgress(progress);

      // 틱 간격: 280ms -> 60ms (갈수록 빨라짐)
      const interval = 280 - progress * 220;

      // 다음 학생으로 폭탄 패스
      cur = (cur + 1 + Math.floor(Math.random() * 2)) % numStudents;
      setCurrentIdx(cur);
      playTick(soundEnabled, 0.2 + progress * 0.4);

      if (progress < 1) {
        timerRef.current = setTimeout(step, interval);
      } else {
        // 💥 펑! 최종 당첨자에게 폭탄 안착
        setCurrentIdx(targetIdx);
        setExploded(true);
        setRunning(false);
        setWinner(chosenWinner);
        playBooster(soundEnabled, 0.7); // 폭발 효과음
        playFanfare(soundEnabled, 0.6);
      }
    };

    step();
  };

  const skip = () => {
    if (!running) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const targetIdx = Math.floor(Math.random() * numStudents);
    setCurrentIdx(targetIdx);
    setExploded(true);
    setRunning(false);
    setWinner(activeCandidates[targetIdx]);
    playBooster(soundEnabled, 0.7);
    playFanfare(soundEnabled, 0.6);
  };

  // ── 확인 누를 때 비로소 다음 게임으로 진행 ──
  const handleConfirmNext = () => {
    if (winner) {
      onFinish([winner].slice(0, pickCount));
    }
    setExploded(false);
    setWinner(null);
  };

  return (
    <div className="space-y-5">
      {/* 상단 안내 */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <span className="font-bold flex items-center gap-1.5">
          💣 총 <b className="text-red-600">{numStudents}명</b> 참가
        </span>
        <span className="text-[11px] text-slate-400">
          도화선이 다 타들어가면 폭탄이 터집니다!
        </span>
      </div>

      {/* 중앙 원형 폭탄 게임 보드 */}
      <div
        className={`relative w-full rounded-3xl p-6 min-h-[360px] flex flex-col items-center justify-center transition-all duration-300 ${
          exploded
            ? "bg-gradient-to-b from-red-950 via-orange-950 to-slate-900 border-4 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)]"
            : "bg-slate-900 border-4 border-slate-700 shadow-2xl"
        }`}
      >
        {/* 폭탄 비주얼 */}
        <div className="relative z-10 flex flex-col items-center select-none py-4">
          <div
            className={`text-6xl sm:text-7xl transition-transform ${
              running ? "animate-bounce scale-110" : exploded ? "scale-125 animate-ping" : ""
            }`}
          >
            {exploded ? "💥" : "💣"}
          </div>

          {/* 도화선 게이지 */}
          <div className="w-48 h-3 bg-slate-800 rounded-full mt-3 overflow-hidden border border-slate-600">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 transition-all duration-100 rounded-full"
              style={{ width: `${fuseProgress * 100}%` }}
            />
          </div>

          <span className="text-xs font-bold text-slate-400 mt-2">
            {running
              ? `🔥 째깍째깍... (${Math.round((1 - fuseProgress) * 100)}% 남음)`
              : exploded
              ? "💥 쾅! 폭탄이 터졌습니다!"
              : "폭탄 점화 버튼을 눌러주세요!"}
          </span>
        </div>

        {/* 학생 카드 그리드 (원형 배치 느낌) */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 mt-4 z-10">
          {activeCandidates.map((name, idx) => {
            const hasBomb = running && currentIdx === idx;
            const isWinner = exploded && currentIdx === idx;

            return (
              <div
                key={idx}
                className={`p-3 rounded-2xl border-2 text-center transition-all duration-150 flex flex-col items-center justify-center gap-1 ${
                  isWinner
                    ? "bg-red-500 border-yellow-300 text-white font-black scale-105 shadow-2xl ring-4 ring-red-400 animate-bounce"
                    : hasBomb
                    ? "bg-amber-400 border-amber-300 text-slate-950 font-black scale-105 shadow-lg ring-2 ring-amber-300"
                    : "bg-slate-800/90 border-slate-700 text-slate-300"
                }`}
              >
                <span className="text-base">
                  {isWinner ? "💥" : hasBomb ? "💣" : "👤"}
                </span>
                <span className="text-xs font-bold truncate max-w-full">
                  {name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 💥 폭발 당첨 결과 카드 (확인 누를 때까지 유지) ── */}
      {exploded && winner && (
        <div className="bg-gradient-to-br from-red-600 via-orange-600 to-red-700 text-white rounded-3xl p-6 shadow-2xl space-y-4 animate-[fadeInUp_0.25s_ease]">
          <div className="text-center space-y-1.5">
            <div className="text-4xl animate-bounce">💥</div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md">
              폭탄 당첨: {winner}!
            </h2>
            <p className="text-xs text-red-100">
              확인을 누르면 당첨된 학생이 제외되고 다음 게임을 준비합니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleConfirmNext}
              className="flex-1 py-4 bg-white text-red-900 font-black text-lg rounded-2xl shadow-xl hover:bg-red-50 transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>✅ 확인 (다음 뽑기 진행)</span>
            </button>
            <button
              onClick={startBomb}
              className="px-6 py-4 bg-black/20 hover:bg-black/30 text-white font-bold text-sm rounded-2xl border border-white/30 transition-colors"
            >
              ↺ 폭탄 다시 돌리기
            </button>
          </div>
        </div>
      )}

      {/* 컨트롤 버튼 */}
      {!exploded && (
        <div className="flex gap-3 justify-center items-center pt-1">
          <button
            onClick={startBomb}
            disabled={running || numStudents < 2}
            className="px-8 py-3.5 bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white font-black text-lg rounded-2xl hover:brightness-110 disabled:opacity-40 shadow-xl transition-transform active:scale-95 flex items-center gap-2"
          >
            {running ? (
              <>
                <span className="animate-spin">💣</span> 폭탄 돌아가는 중...!
              </>
            ) : (
              <>💣 폭탄 점화 출발!</>
            )}
          </button>

          {running && (
            <button
              onClick={skip}
              className="px-4 py-3.5 bg-slate-200 text-slate-700 text-sm font-bold rounded-2xl hover:bg-slate-300"
            >
              ⏩ 즉시 폭발
            </button>
          )}
        </div>
      )}
    </div>
  );
}
