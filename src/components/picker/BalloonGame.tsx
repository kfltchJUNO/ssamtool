"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { playTick, playBooster, playFanfare } from "@/lib/sound";

interface BalloonGameProps {
  candidates: string[];
  pickCount: number;
  onFinish: (winnerNames: string[]) => void;
  soundEnabled: boolean;
}

const BALLOON_COLORS = [
  "#EF4444", "#3B82F6", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
  "#F97316", "#14B8A6", "#A855F7", "#D946EF",
  "#6366F1", "#0284C7", "#059669", "#D97706",
];

interface Balloon {
  id: number;
  name: string;
  color: string;
  popped: boolean;
  isWinner: boolean;
}

export default function BalloonGame({
  candidates,
  pickCount,
  onFinish,
  soundEnabled,
}: BalloonGameProps) {
  const activeCandidates = useMemo(() => candidates.slice(0, 16), [candidates]);
  const numBalloons = activeCandidates.length;

  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const initBalloons = useCallback(() => {
    if (numBalloons === 0) return;
    const winnerIdx = Math.floor(Math.random() * numBalloons);

    const list: Balloon[] = activeCandidates.map((name, idx) => ({
      id: idx,
      name,
      color: BALLOON_COLORS[idx % BALLOON_COLORS.length],
      popped: false,
      isWinner: idx === winnerIdx,
    }));

    setBalloons(list);
    setWinner(null);
    setRunning(false);
  }, [activeCandidates, numBalloons]);

  useEffect(() => {
    initBalloons();
  }, [initBalloons]);

  // 풍선 하나 터뜨리기 (직접 클릭 가능)
  const popBalloon = (idx: number) => {
    if (balloons[idx]?.popped) return;

    playBooster(soundEnabled, 0.4);

    setBalloons(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], popped: true };

      // 당첨 풍선을 터뜨렸을 때
      if (updated[idx].isWinner) {
        setWinner(updated[idx].name);
        setRunning(false);
        playFanfare(soundEnabled, 0.6);
      }
      return updated;
    });
  };

  // 자동 연속 다트 발사 (서든어택 모드)
  const startAutoDart = () => {
    if (running || numBalloons < 2) return;
    setRunning(true);
    setWinner(null);

    // 아직 안 터진 풍선들
    const unpopped = balloons.map((b, i) => (!b.popped ? i : -1)).filter(i => i !== -1);
    const winnerIdx = balloons.findIndex(b => b.isWinner);

    // 꽝 풍선들 먼저 무작위 터뜨리고 마지막에 당첨 풍선 터뜨리기
    const nonWinners = unpopped.filter(i => i !== winnerIdx);
    // 셔플
    for (let i = nonWinners.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonWinners[i], nonWinners[j]] = [nonWinners[j], nonWinners[i]];
    }

    const sequence = [...nonWinners, winnerIdx];
    let step = 0;

    const interval = setInterval(() => {
      if (step < sequence.length) {
        const target = sequence[step];
        popBalloon(target);
        step++;
      } else {
        clearInterval(interval);
      }
    }, 450);
  };

  // ── 확인 누를 때 비로소 다음 게임으로 진행 ──
  const handleConfirmNext = () => {
    if (winner) {
      onFinish([winner]);
    }
    initBalloons();
  };

  return (
    <div className="space-y-5">
      {/* 안내 */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <span className="font-bold flex items-center gap-1.5">
          🎈 풍선 <b className="text-pink-600">{numBalloons}개</b> 준비됨
        </span>
        <span className="text-[11px] text-slate-400">
          풍선을 직접 클릭하거나, [자동 다트 발사]를 눌러보세요!
        </span>
      </div>

      {/* 풍선 칠판 보드 */}
      <div className="relative w-full rounded-3xl p-6 min-h-[380px] bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 border-4 border-sky-300 shadow-xl overflow-hidden flex flex-col items-center justify-center select-none">
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-4 z-10">
          {balloons.map((b, idx) => {
            const isTargetWinner = b.popped && b.isWinner;

            return (
              <button
                key={b.id}
                onClick={() => popBalloon(idx)}
                disabled={b.popped}
                className={`relative group p-4 rounded-3xl transition-all duration-300 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  b.popped
                    ? isTargetWinner
                      ? "bg-amber-400 text-amber-950 scale-110 shadow-2xl ring-4 ring-amber-300 animate-bounce"
                      : "bg-slate-200/60 opacity-40 scale-90 border border-dashed border-slate-300"
                    : "hover:scale-105 hover:shadow-lg shadow-md"
                }`}
                style={{
                  backgroundColor: !b.popped ? `${b.color}22` : undefined,
                  borderColor: !b.popped ? b.color : undefined,
                  borderWidth: !b.popped ? 3 : undefined,
                }}
              >
                {/* 풍선 또는 팡 이펙트 */}
                <span className="text-4xl sm:text-5xl transition-transform group-hover:-translate-y-1">
                  {b.popped ? (isTargetWinner ? "👑" : "💥") : "🎈"}
                </span>

                <span
                  className={`text-xs sm:text-sm font-black truncate max-w-full ${
                    isTargetWinner
                      ? "text-amber-950 font-black text-base"
                      : b.popped
                      ? "text-slate-400 line-through"
                      : "text-slate-800"
                  }`}
                >
                  {b.name}
                </span>

                {!b.popped && (
                  <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    🎯 터뜨리기
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 👑 당첨 결과 카드 (확인 누를 때까지 유지) ── */}
      {winner && (
        <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 text-white rounded-3xl p-6 shadow-2xl space-y-4 animate-[fadeInUp_0.25s_ease]">
          <div className="text-center space-y-1.5">
            <div className="text-4xl animate-bounce">🎈👑</div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md">
              황금 풍선 당첨: {winner}!
            </h2>
            <p className="text-xs text-pink-100">
              확인을 누르면 당첨된 학생이 제외되고 다음 게임을 준비합니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleConfirmNext}
              className="flex-1 py-4 bg-white text-rose-900 font-black text-lg rounded-2xl shadow-xl hover:bg-rose-50 transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>✅ 확인 (다음 뽑기 진행)</span>
            </button>
            <button
              onClick={initBalloons}
              className="px-6 py-4 bg-black/20 hover:bg-black/30 text-white font-bold text-sm rounded-2xl border border-white/30 transition-colors"
            >
              ↺ 풍선 다시 채우기
            </button>
          </div>
        </div>
      )}

      {/* 컨트롤 버튼 */}
      {!winner && (
        <div className="flex gap-3 justify-center items-center pt-1">
          <button
            onClick={startAutoDart}
            disabled={running || numBalloons < 2}
            className="px-8 py-3.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-lg rounded-2xl hover:brightness-110 disabled:opacity-40 shadow-xl transition-transform active:scale-95 flex items-center gap-2"
          >
            {running ? "🎯 다트 연속 발사 중...!" : "🎯 다트 연속 발사!"}
          </button>

          <button
            onClick={initBalloons}
            disabled={running}
            className="px-4 py-3.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-2xl hover:border-slate-500 shadow-sm"
          >
            ↺ 초기화
          </button>
        </div>
      )}
    </div>
  );
}
