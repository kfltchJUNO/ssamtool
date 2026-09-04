"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { playTick, playBooster, playFanfare } from "@/lib/sound";

interface RacingGameProps {
  candidates: string[];
  pickCount: number;
  onFinish: (ranked: string[]) => void;
  soundEnabled: boolean;
}

const RACER_AVATARS = ["🏃‍♂️", "🏃‍♀️", "🐎", "🏎️", "🐯", "🚀", "🚴", "⚡"];
const LANE_COLORS = [
  "border-red-400 bg-red-50 text-red-700",
  "border-blue-400 bg-blue-50 text-blue-700",
  "border-emerald-400 bg-emerald-50 text-emerald-700",
  "border-amber-400 bg-amber-50 text-amber-700",
  "border-purple-400 bg-purple-50 text-purple-700",
  "border-pink-400 bg-pink-50 text-pink-700",
  "border-cyan-400 bg-cyan-50 text-cyan-700",
  "border-orange-400 bg-orange-50 text-orange-700",
];

interface RacerState {
  name: string;
  avatar: string;
  colorClass: string;
  progress: number; // 0 to 100
  boost: boolean;
  targetRank: number; // 1-indexed (1 is winner)
}

export default function RacingGame({
  candidates,
  pickCount,
  onFinish,
  soundEnabled,
}: RacingGameProps) {
  const [racing, setRacing] = useState(false);
  const [racers, setRacers] = useState<RacerState[]>([]);
  const [finishedRanks, setFinishedRanks] = useState<string[] | null>(null);

  const animRef = useRef<number | null>(null);
  const boosterTriggeredRef = useRef(false);

  // 최대 8명까지 참가 (초과 시 첫 8명 또는 무작위 8명)
  const setupRacers = useCallback(() => {
    const activeCandidates = candidates.slice(0, 8);
    const shuffled = [...activeCandidates].sort(() => Math.random() - 0.5);

    const initial: RacerState[] = activeCandidates.map((name, i) => {
      const targetRank = shuffled.indexOf(name) + 1;
      return {
        name,
        avatar: RACER_AVATARS[i % RACER_AVATARS.length],
        colorClass: LANE_COLORS[i % LANE_COLORS.length],
        progress: 0,
        boost: false,
        targetRank,
      };
    });
    setRacers(initial);
    setFinishedRanks(null);
  }, [candidates]);

  useEffect(() => {
    setupRacers();
  }, [setupRacers]);

  const startRace = () => {
    if (racing || racers.length === 0) return;

    setRacing(true);
    setFinishedRanks(null);
    boosterTriggeredRef.current = false;

    const duration = 6500; // 6.5초 레이싱
    const startTime = performance.now();

    const initialRacers = racers.map(r => ({ ...r, progress: 0, boost: false }));

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // 틱 사운드 (0.4초마다)
      if (Math.floor(elapsed / 300) % 2 === 0 && Math.random() < 0.25) {
        playTick(soundEnabled, 0.25);
      }

      // 막판 부스터 (70% 이후 1위 주자 부스터 연출)
      if (t > 0.7 && !boosterTriggeredRef.current) {
        boosterTriggeredRef.current = true;
        playBooster(soundEnabled, 0.5);
      }

      setRacers(initialRacers.map(r => {
        let p = 0;
        if (t < 0.7) {
          // 초중반: 난수 요동으로 순위가 마구 바뀜
          const jitter = (Math.sin((now / 180) + r.targetRank * 2) * 8);
          p = Math.max(0, (t / 0.7) * 65 + jitter);
        } else {
          // 후반부: 미리 결정된 targetRank에 맞춰 골인지점으로 수렴
          const subT = (t - 0.7) / 0.3; // 0 to 1
          const rankOffset = (r.targetRank - 1) * 3.5; // 1등은 100%, 2등은 96.5%...
          const startFrom = 65;
          const targetFinal = 100 - rankOffset;
          p = startFrom + (targetFinal - startFrom) * Math.pow(subT, 1.2);
        }

        const isBoost = t > 0.7 && r.targetRank === 1;
        return {
          ...r,
          progress: Math.min(p, 100),
          boost: isBoost,
        };
      }));

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // 완주 처리
        const rankedNames = [...initialRacers]
          .sort((a, b) => a.targetRank - b.targetRank)
          .map(r => r.name);

        setFinishedRanks(rankedNames);
        setRacing(false);
        playFanfare(soundEnabled, 0.6);
        onFinish(rankedNames.slice(0, pickCount));
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  const skipRace = () => {
    if (!racing) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const rankedNames = [...racers]
      .sort((a, b) => a.targetRank - b.targetRank)
      .map(r => r.name);

    setRacers(prev => prev.map(r => ({
      ...r,
      progress: 100 - (r.targetRank - 1) * 3.5,
      boost: r.targetRank === 1,
    })));

    setFinishedRanks(rankedNames);
    setRacing(false);
    playFanfare(soundEnabled, 0.6);
    onFinish(rankedNames.slice(0, pickCount));
  };

  return (
    <div className="space-y-5">
      {/* 레이싱 경기 트랙 보드 */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-6 border-4 border-slate-700 shadow-2xl relative overflow-hidden">
        
        {/* 결승선 체커 플래그 배경 바 */}
        <div className="absolute right-12 top-0 bottom-0 w-8 flex flex-col justify-between opacity-30 pointer-events-none">
          <div className="h-full w-full bg-[linear-gradient(45deg,#000_25%,transparent_25%),linear-gradient(-45deg,#000_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#000_75%),linear-gradient(-45deg,transparent_75%,#000_75%)] bg-[size:12px_12px] bg-white" />
        </div>

        {/* 상단 레이스 헤더 */}
        <div className="flex justify-between items-center text-white mb-4 border-b border-slate-700 pb-2 text-xs">
          <span className="font-black text-amber-400 flex items-center gap-1.5">
            🏁 대항전 트랙 ({racers.length}명 주자 출전)
          </span>
          <span className="text-slate-400">결승선 ➔ 🏁</span>
        </div>

        {/* 각 레인 주자 */}
        <div className="space-y-3 relative">
          {racers.map((racer, idx) => (
            <div key={idx} className="relative h-12 flex items-center bg-slate-800/80 rounded-xl border border-slate-700 px-3">
              {/* 레인 번호 */}
              <span className="text-xs font-bold text-slate-500 w-5">{idx + 1}</span>

              {/* 달리는 주자 박스 (progress 에 따라 translateX) */}
              <div
                className="absolute top-1 bottom-1 flex items-center transition-all duration-75"
                style={{
                  left: `calc(30px + (100% - 140px) * ${racer.progress / 100})`,
                }}
              >
                {/* 주자 이름 태그 & 아바타 */}
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border shadow-lg font-black text-xs whitespace-nowrap select-none ${racer.colorClass} ${racer.boost ? "ring-4 ring-amber-400 scale-110" : ""}`}>
                  <span className="text-lg animate-bounce">{racer.avatar}</span>
                  <span>{racer.name}</span>
                  {racer.boost && <span className="text-sm">🔥</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 레이스 컨트롤 버튼 */}
      <div className="flex gap-3 justify-center items-center">
        <button
          onClick={startRace}
          disabled={racing || racers.length === 0}
          className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-lg rounded-2xl hover:from-amber-600 hover:to-orange-700 disabled:opacity-40 shadow-xl transition-transform active:scale-95"
        >
          {racing ? "🏎️ 질주하는 중...!" : "🏎️ 레이싱 출발!"}
        </button>

        {racing && (
          <button
            onClick={skipRace}
            className="px-4 py-3.5 bg-gray-200 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-300"
          >
            ⏩ 스킵
          </button>
        )}
      </div>

      {/* 최종 순위 발표 표 */}
      {finishedRanks && (
        <div className="bg-white rounded-2xl border-2 border-amber-500 p-5 shadow-xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-black text-[#1B4332] text-base flex items-center gap-1.5">
              🏆 최종 레이싱 완주 순위 (발표/당첨 순서)
            </h3>
            <span className="text-xs font-bold text-amber-600">상위 {pickCount}명 당첨</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {finishedRanks.map((name, i) => {
              const isPick = i < pickCount;
              return (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isPick
                      ? "bg-amber-50 border-amber-400 text-amber-900 font-black shadow-sm"
                      : "bg-gray-50 border-gray-200 text-gray-600 text-xs"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">
                      {i === 0 ? "🥇 1위" : i === 1 ? "🥈 2위" : i === 2 ? "🥉 3위" : `${i + 1}위`}
                    </span>
                    <span className="text-sm">{name}</span>
                  </span>
                  {isPick && <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">당첨</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
