"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { playBooster, playFanfare } from "@/lib/sound";

interface RacingGameProps {
  candidates: string[];
  pickCount: number;
  onFinish: (ranked: string[]) => void;
  soundEnabled: boolean;
}

// 주자별 고정 색상 팔레트 (Canvas fill 용)
const RACER_COLORS = [
  "#EF4444", "#3B82F6", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
];
const RACER_AVATARS = ["🏃", "🐎", "🏎️", "🚀", "⚡", "🐯", "🦅", "🚴"];

interface Racer {
  name: string;
  avatar: string;
  color: string;
  targetRank: number;
  progress: number;  // 0 ~ 1 (canvas draw 용)
  boost: boolean;
}

const DURATION = 6000; // 6초
const TRACK_MARGIN_LEFT = 10;
const TRACK_MARGIN_RIGHT = 130; // 오른쪽 이름 표시용 여백

export default function RacingGame({
  candidates,
  pickCount,
  onFinish,
  soundEnabled,
}: RacingGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef   = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const [racing, setRacing] = useState(false);
  const [finishedRanks, setFinishedRanks] = useState<string[] | null>(null);

  // 최대 8명
  const activeCandidates = useMemo(() => candidates.slice(0, 8), [candidates]);
  const numRacers = activeCandidates.length;

  // 사전 결정된 주자 목록 (ref 에 보관 — 애니 도중에도 참조 가능)
  const racersRef = useRef<Racer[]>([]);

  const initRacers = useCallback(() => {
    const shuffled = [...activeCandidates].map((_, i) => i).sort(() => Math.random() - 0.5);
    const racers: Racer[] = activeCandidates.map((name, i) => ({
      name,
      avatar: RACER_AVATARS[i % RACER_AVATARS.length],
      color:  RACER_COLORS[i % RACER_COLORS.length],
      targetRank: shuffled.indexOf(i) + 1,  // 1 = winner
      progress: 0,
      boost: false,
    }));
    racersRef.current = racers;
    setFinishedRanks(null);
    // 초기 프레임 그리기
    drawFrame(racers, 0);
  }, [activeCandidates]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { initRacers(); }, [initRacers]);

  // ─── 캔버스 단일 프레임 렌더링 함수 ──────────────────────────────────
  const drawFrame = useCallback((racers: Racer[], globalT: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const laneH = H / numRacers;
    const trackW = W - TRACK_MARGIN_LEFT - TRACK_MARGIN_RIGHT;

    ctx.clearRect(0, 0, W, H);

    // 배경 그라데이션
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "#0F172A");
    grad.addColorStop(1, "#1E293B");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 결승선 (우측)
    const finishX = TRACK_MARGIN_LEFT + trackW;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(finishX, 0);
    ctx.lineTo(finishX, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // 체커 패턴 (결승선 위에)
    const squareSize = 8;
    for (let row = 0; row < H / squareSize; row++) {
      for (let col = 0; col < 3; col++) {
        if ((row + col) % 2 === 0) {
          ctx.fillStyle = "#FFFFFF44";
          ctx.fillRect(finishX + col * squareSize, row * squareSize, squareSize, squareSize);
        }
      }
    }

    // 각 레인 및 주자 그리기
    racers.forEach((racer, idx) => {
      const laneY = idx * laneH;

      // 레인 구분선
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, laneY + laneH);
      ctx.lineTo(W, laneY + laneH);
      ctx.stroke();

      // 레인 번호
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${idx + 1}`, 4, laneY + laneH / 2);

      // 주자 위치 계산
      const racerX = TRACK_MARGIN_LEFT + 20 + racer.progress * trackW;
      const racerY = laneY + laneH / 2;

      // 주자 후광 (boost 중일 때)
      if (racer.boost) {
        ctx.beginPath();
        ctx.arc(racerX, racerY, 22, 0, Math.PI * 2);
        ctx.fillStyle = "#F59E0B44";
        ctx.fill();
      }

      // 주자 원형 배지
      ctx.beginPath();
      ctx.arc(racerX, racerY, racer.boost ? 18 : 15, 0, Math.PI * 2);
      ctx.fillStyle = racer.color;
      ctx.shadowColor = racer.color;
      ctx.shadowBlur = racer.boost ? 18 : 6;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 아바타 이모지
      ctx.font = `${racer.boost ? 20 : 16}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(racer.avatar, racerX, racerY);

      // 이름 레이블 (결승선 오른쪽)
      ctx.fillStyle = "#CBD5E1";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(racer.name, finishX + 28, racerY);

      // 1위 왕관
      if (racer.targetRank === 1 && globalT > 0.97) {
        ctx.fillStyle = "#FCD34D";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("👑", racerX, racerY - 28);
      }
    });

    // 상단 타이머 바
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(0, 0, W, 6);
    ctx.fillStyle = "#10B981";
    ctx.fillRect(0, 0, W * Math.min(globalT, 1), 6);
  }, [numRacers]);

  // ─── 레이싱 애니메이션 루프 ────────────────────────────────────────────
  const startRace = () => {
    if (racing || numRacers === 0) return;

    initRacers();
    setRacing(true);
    setFinishedRanks(null);
    playBooster(soundEnabled, 0.4);

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1);

      // 부스터 효과음 (70% 지점)
      if (t > 0.7 && t < 0.71) {
        playBooster(soundEnabled, 0.5);
      }

      // 주자 progress 업데이트 (ref 직접 수정 — setState 우회)
      const updated = racersRef.current.map(r => {
        let p: number;
        if (t < 0.65) {
          // 초중반: 랜덤 요동 → 순위가 뒤바뀌는 구간
          const noise = Math.sin(now / 200 + r.targetRank * 1.7) * 0.06
                      + Math.sin(now / 80  + r.targetRank * 3.1) * 0.03;
          p = Math.max(0, t / 0.65 * 0.6 + noise);
        } else {
          // 후반부: targetRank에 맞춰 수렴
          const subT = (t - 0.65) / 0.35; // 0 → 1
          const rankGap = (r.targetRank - 1) * 0.035;
          const from = 0.6;
          const to   = 1.0 - rankGap;
          p = from + (to - from) * Math.pow(subT, 1.3);
        }

        return {
          ...r,
          progress: Math.min(Math.max(p, 0), 1),
          boost: t > 0.65 && r.targetRank === 1,
        };
      });

      racersRef.current = updated;
      drawFrame(updated, t);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // 완주 완료
        setRacing(false);
        playFanfare(soundEnabled, 0.6);

        const ranked = [...updated]
          .sort((a, b) => a.targetRank - b.targetRank)
          .map(r => r.name);

        setFinishedRanks(ranked);
        onFinish(ranked.slice(0, pickCount));
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  const skipRace = () => {
    if (!racing) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const ranked = [...racersRef.current]
      .sort((a, b) => a.targetRank - b.targetRank)
      .map(r => r.name);

    // 완주 상태로 최종 프레임 그리기
    const finalRacers = racersRef.current.map(r => {
      const rankGap = (r.targetRank - 1) * 0.035;
      return { ...r, progress: Math.max(0, 1 - rankGap), boost: r.targetRank === 1 };
    });
    drawFrame(finalRacers, 1);

    setRacing(false);
    playFanfare(soundEnabled, 0.6);
    setFinishedRanks(ranked);
    onFinish(ranked.slice(0, pickCount));
  };

  // canvas 해상도 DPR 대응
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    drawFrame(racersRef.current, 0);
  }, [drawFrame, numRacers]);

  return (
    <div className="space-y-4">
      {/* 레이싱 캔버스 트랙 */}
      <div className="rounded-2xl overflow-hidden border-4 border-slate-700 shadow-2xl">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: `${Math.max(numRacers * 52, 200)}px`, display: "block" }}
        />
      </div>

      {/* 컨트롤 */}
      <div className="flex gap-3 justify-center items-center">
        <button
          onClick={startRace}
          disabled={racing || numRacers === 0}
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

        {!racing && finishedRanks && (
          <button
            onClick={initRacers}
            className="px-4 py-3.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-2xl hover:border-slate-500 shadow-sm"
          >
            ↺ 재추첨
          </button>
        )}
      </div>

      {/* 최종 순위 결과표 */}
      {finishedRanks && (
        <div className="bg-white rounded-2xl border-2 border-amber-500 p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-black text-[#1B4332] text-base flex items-center gap-1.5">
              🏆 레이싱 완주 순위
            </h3>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              상위 {pickCount}명 당첨
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {finishedRanks.map((name, i) => {
              const isPick = i < pickCount;
              return (
                <div
                  key={i}
                  className={`p-3 rounded-xl border-2 flex flex-col gap-1 ${
                    i === 0 ? "bg-amber-50 border-amber-400 shadow-md" :
                    i === 1 ? "bg-slate-50 border-slate-400 shadow-sm" :
                    i === 2 ? "bg-orange-50 border-orange-400 shadow-sm" :
                    isPick  ? "bg-emerald-50 border-emerald-300" :
                    "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black">
                      {i === 0 ? "🥇 1위" : i === 1 ? "🥈 2위" : i === 2 ? "🥉 3위" : `${i + 1}위`}
                    </span>
                    {isPick && (
                      <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black">당첨</span>
                    )}
                  </div>
                  <span className={`text-sm font-bold truncate ${isPick ? "text-amber-900" : "text-gray-600"}`}>
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
