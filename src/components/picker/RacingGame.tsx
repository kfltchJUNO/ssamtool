"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { playBooster, playFanfare, playTick } from "@/lib/sound";

interface RacingGameProps {
  candidates: string[];
  pickCount: number;
  onFinish: (ranked: string[]) => void;
  soundEnabled: boolean;
}

// 24가지 선명한 레인 색상
const RACER_COLORS = [
  "#EF4444", "#3B82F6", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
  "#F97316", "#14B8A6", "#A855F7", "#D946EF",
  "#6366F1", "#0284C7", "#059669", "#D97706",
  "#DC2626", "#2563EB", "#7C3AED", "#DB2777",
  "#0891B2", "#65A30D", "#EA580C", "#4F46E5",
];

// 다양한 달리기 주자 이모지
const RACER_AVATARS = [
  "🏃", "🐎", "🏎️", "🚀", "⚡", "🐯", "🦅", "🚴",
  "🦊", "🐙", "🦄", "🐸", "🐆", "🦁", "🐬", "🦋",
  "🐺", "🦘", "🦖", "🛸", "🏍️", "🏂", "⛷️", "🏄",
];

interface Racer {
  name: string;
  avatar: string;
  color: string;
  targetRank: number; // 1 = 1위
  progress: number;   // 0 ~ 1
  boost: boolean;
}

const DURATION = 6200; // 6.2초 질주
const NAME_COL_WIDTH = 110; // 좌측 고정 이름 영역 너비
const FINISH_RIGHT_MARGIN = 75; // 우측 순위 뱃지 영역

export default function RacingGame({
  candidates,
  pickCount,
  onFinish,
  soundEnabled,
}: RacingGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const [racing, setRacing] = useState(false);
  const [finishedRanks, setFinishedRanks] = useState<string[] | null>(null);

  // 후보 전체 참가 (최대 24명)
  const activeCandidates = useMemo(() => {
    const list = candidates.filter(c => c.trim().length > 0);
    return list.slice(0, 24);
  }, [candidates]);

  const numRacers = activeCandidates.length;

  // 레인 높이: 학생 수에 따라 동적 조절 (전체 학생이 한눈에 보이도록)
  const laneH = useMemo(() => {
    if (numRacers <= 6) return 60;
    if (numRacers <= 10) return 52;
    if (numRacers <= 16) return 44;
    return 38;
  }, [numRacers]);

  const logicalHeight = Math.max(numRacers * laneH, 200);

  // 주자 ref (애니메이션 루프 내 60fps 안전 참조)
  const racersRef = useRef<Racer[]>([]);

  // ─── 주자 초기화 (Fisher-Yates 셔플) ─────────────────────────────────
  const initRacers = useCallback(() => {
    if (numRacers === 0) return;
    const indices = Array.from({ length: numRacers }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const racers: Racer[] = activeCandidates.map((name, i) => ({
      name,
      avatar: RACER_AVATARS[i % RACER_AVATARS.length],
      color: RACER_COLORS[i % RACER_COLORS.length],
      targetRank: indices.indexOf(i) + 1, // 1위부터 시작
      progress: 0,
      boost: false,
    }));

    racersRef.current = racers;
    setFinishedRanks(null);
  }, [activeCandidates, numRacers]);

  // ─── 단일 프레임 렌더링 ─────────────────────────────────────────────
  const drawFrame = useCallback((racers: Racer[], globalT: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // 캔버스 CSS 논리 픽셀 기준
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    if (W <= 0 || H <= 0) return;

    const trackStartX = NAME_COL_WIDTH + 20;
    const trackEndX = W - FINISH_RIGHT_MARGIN;
    const trackW = Math.max(trackEndX - trackStartX, 80);

    ctx.clearRect(0, 0, W, H);

    // 1. 전체 배경
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, W, H);

    // 2. 좌측 이름 칼럼 배경 구분
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(0, 0, NAME_COL_WIDTH, H);

    // 이름 칼럼 우측 경계선
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(NAME_COL_WIDTH, 0);
    ctx.lineTo(NAME_COL_WIDTH, H);
    ctx.stroke();

    // 3. 결승선 (우측)
    ctx.strokeStyle = "#F8FAFC";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(trackEndX, 0);
    ctx.lineTo(trackEndX, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // 결승선 체커보드 패턴
    const sq = 6;
    for (let r = 0; r < Math.ceil(H / sq); r++) {
      for (let c = 0; c < 2; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = "#FFFFFF55";
          ctx.fillRect(trackEndX + c * sq, r * sq, sq, sq);
        }
      }
    }

    // 4. 레인별 그리기
    racers.forEach((racer, idx) => {
      const laneY = idx * laneH;
      const centerY = laneY + laneH / 2;

      // 4-1. 레인 가로 분리선
      ctx.strokeStyle = idx % 2 === 0 ? "#1E293B55" : "#33415533";
      ctx.fillStyle = idx % 2 === 0 ? "#0F172A" : "#131D33";
      ctx.fillRect(NAME_COL_WIDTH, laneY, W - NAME_COL_WIDTH, laneH);

      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, laneY + laneH);
      ctx.lineTo(W, laneY + laneH);
      ctx.stroke();

      // 4-2. [좌측 고정] 레인 번호 뱃지
      ctx.beginPath();
      ctx.arc(14, centerY, 10, 0, Math.PI * 2);
      ctx.fillStyle = racer.color;
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${idx + 1}`, 14, centerY);

      // 4-3. [좌측 고정] 학생 이름 (선명하게 100% 항상 보임)
      ctx.save();
      ctx.beginPath();
      ctx.rect(28, laneY, NAME_COL_WIDTH - 30, laneH);
      ctx.clip(); // 긴 이름 칼럼 밖으로 튀어나가지 않게 클리핑

      ctx.fillStyle = "#F8FAFC";
      ctx.font = laneH <= 40 ? "bold 12px sans-serif" : "bold 13px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(racer.name, 30, centerY);
      ctx.restore();

      // 4-4. [트랙 주자] 좌표 계산
      const racerX = trackStartX + racer.progress * trackW;

      // 주자 부스터 후광
      if (racer.boost) {
        ctx.beginPath();
        ctx.arc(racerX, centerY, laneH * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = "#F59E0B55";
        ctx.fill();
      }

      // 주자 원형 배경
      const radius = Math.min(laneH * 0.36, 18);
      ctx.beginPath();
      ctx.arc(racerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = racer.color;
      ctx.shadowColor = racer.color;
      ctx.shadowBlur = racer.boost ? 14 : 4;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 주자 이모지
      const emojiSize = Math.max(Math.floor(radius * 1.2), 14);
      ctx.font = `${emojiSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(racer.avatar, racerX, centerY);

      // 주자 머리 위 미니 이름 태그 (달릴 때 같이 이동!)
      if (laneH >= 46) {
        ctx.fillStyle = "#CBD5E1";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(racer.name, racerX, centerY - radius - 2);
      }

      // 4-5. [도착 결과] 1~3위 왕관 및 순위 뱃지
      if (globalT >= 0.98) {
        const isWinner = racer.targetRank === 1;
        const isPodium = racer.targetRank <= 3;
        const rankText =
          racer.targetRank === 1 ? "🥇 1위" :
          racer.targetRank === 2 ? "🥈 2위" :
          racer.targetRank === 3 ? "🥉 3위" :
          `${racer.targetRank}위`;

        ctx.fillStyle = isWinner ? "#FCD34D" : isPodium ? "#E2E8F0" : "#94A3B8";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(rankText, trackEndX + 16, centerY);

        if (isWinner) {
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("👑", racerX, centerY - radius - 6);
        }
      }
    });

    // 5. 상단 진행도 타이머 바
    ctx.fillStyle = "#334155";
    ctx.fillRect(0, 0, W, 4);
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(0, 0, W * Math.min(globalT, 1), 4);
  }, [laneH]);

  // ─── 캔버스 크기 및 해상도(DPR) 초기화 ─────────────────────────────
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = logicalHeight;

    if (cssW === 0) return;

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    drawFrame(racersRef.current, 0);
  }, [logicalHeight, drawFrame]);

  // 마운트 및 참가자 변경 시 주자/캔버스 세팅
  useEffect(() => {
    initRacers();
  }, [initRacers]);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setupCanvas]);

  // ─── 레이싱 시작 ───────────────────────────────────────────────────
  const startRace = () => {
    if (racing || numRacers === 0) return;

    initRacers();
    setRacing(true);
    setFinishedRanks(null);
    playBooster(soundEnabled, 0.4);

    startTimeRef.current = performance.now();
    let tickCount = 0;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1);

      // 질주 틱 사운드
      if (Math.floor(elapsed / 320) > tickCount) {
        tickCount = Math.floor(elapsed / 320);
        if (t < 0.85) playTick(soundEnabled, 0.2);
      }

      // 막판 부스터 (70% 이후 1위 연출)
      if (t > 0.7 && t < 0.72) {
        playBooster(soundEnabled, 0.6);
      }

      // 주자별 progress 계산 (초반 요동 + 후반 순위 수렴)
      const updated = racersRef.current.map(r => {
        let p: number;
        if (t < 0.62) {
          // 초중반 역전 구간 (노이즈 기반 앞서거니 뒤서거니)
          const wave1 = Math.sin(now / 180 + r.targetRank * 2.1) * 0.07;
          const wave2 = Math.sin(now / 75 + r.targetRank * 3.7) * 0.04;
          p = Math.max(0, (t / 0.62) * 0.58 + wave1 + wave2);
        } else {
          // 후반부: targetRank 순서로 수렴
          const subT = (t - 0.62) / 0.38;
          const rankGap = (r.targetRank - 1) * (0.35 / Math.max(numRacers, 2));
          const from = 0.58;
          const to = Math.max(0.2, 1.0 - rankGap);
          p = from + (to - from) * Math.pow(subT, 1.35);
        }

        return {
          ...r,
          progress: Math.min(Math.max(p, 0), 1),
          boost: t > 0.68 && r.targetRank === 1,
        };
      });

      racersRef.current = updated;
      drawFrame(updated, t);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // 완주!
        setRacing(false);
        playFanfare(soundEnabled, 0.7);

        const ranked = [...updated]
          .sort((a, b) => a.targetRank - b.targetRank)
          .map(r => r.name);

        setFinishedRanks(ranked);
        onFinish(ranked.slice(0, pickCount));
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  // ─── 즉시 스킵 ─────────────────────────────────────────────────────
  const skipRace = () => {
    if (!racing) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const ranked = [...racersRef.current]
      .sort((a, b) => a.targetRank - b.targetRank)
      .map(r => r.name);

    const finalRacers = racersRef.current.map(r => {
      const rankGap = (r.targetRank - 1) * (0.35 / Math.max(numRacers, 2));
      return {
        ...r,
        progress: Math.max(0.2, 1 - rankGap),
        boost: r.targetRank === 1,
      };
    });

    racersRef.current = finalRacers;
    drawFrame(finalRacers, 1);

    setRacing(false);
    playFanfare(soundEnabled, 0.7);
    setFinishedRanks(ranked);
    onFinish(ranked.slice(0, pickCount));
  };

  return (
    <div className="space-y-4">
      {/* 레이싱 트랙 정보 안내 헤더 */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <span className="font-bold flex items-center gap-1.5">
          🏁 총 <b className="text-amber-600">{numRacers}명</b> 참가
          {candidates.length > 24 && (
            <span className="text-[11px] text-slate-400">(상위 24명 출전)</span>
          )}
        </span>
        <span className="text-[11px] text-slate-400">
          왼쪽 이름표에서 각 레인 주자를 확인하세요
        </span>
      </div>

      {/* 캔버스 트랙 래퍼 */}
      <div
        ref={containerRef}
        className="rounded-2xl overflow-hidden border-4 border-slate-700 shadow-2xl bg-[#0F172A]"
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: `${logicalHeight}px`,
            display: "block",
          }}
        />
      </div>

      {/* 조작 버튼 */}
      <div className="flex gap-3 justify-center items-center pt-1">
        <button
          onClick={startRace}
          disabled={racing || numRacers === 0}
          className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white font-black text-lg rounded-2xl hover:brightness-110 disabled:opacity-40 shadow-xl transition-transform active:scale-95 flex items-center gap-2"
        >
          {racing ? (
            <>
              <span className="animate-spin">🏎️</span> 질주하는 중...!
            </>
          ) : (
            <>🏎️ 레이싱 출발!</>
          )}
        </button>

        {racing && (
          <button
            onClick={skipRace}
            className="px-4 py-3.5 bg-slate-200 text-slate-700 text-sm font-bold rounded-2xl hover:bg-slate-300 transition-colors"
          >
            ⏩ 스킵
          </button>
        )}

        {!racing && finishedRanks && (
          <button
            onClick={() => {
              initRacers();
              setupCanvas();
            }}
            className="px-4 py-3.5 bg-white border-2 border-slate-300 text-slate-700 text-sm font-bold rounded-2xl hover:border-slate-500 shadow-sm transition-colors"
          >
            ↺ 재추첨
          </button>
        )}
      </div>

      {/* 완주 순위 결과 카드 */}
      {finishedRanks && (
        <div className="bg-white rounded-2xl border-2 border-amber-500 p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b pb-2.5">
            <h3 className="font-black text-[#1B4332] text-base flex items-center gap-1.5">
              🏆 레이싱 완주 순위
            </h3>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg">
              상위 {pickCount}명 당첨
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {finishedRanks.map((name, i) => {
              const isPick = i < pickCount;
              return (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl border-2 flex flex-col gap-1 transition-all ${
                    i === 0
                      ? "bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-300"
                      : i === 1
                      ? "bg-slate-50 border-slate-400 shadow-sm"
                      : i === 2
                      ? "bg-orange-50 border-orange-400 shadow-sm"
                      : isPick
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">
                      {i === 0
                        ? "🥇 1위"
                        : i === 1
                        ? "🥈 2위"
                        : i === 2
                        ? "🥉 3위"
                        : `${i + 1}위`}
                    </span>
                    {isPick && (
                      <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black">
                        당첨
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-bold truncate ${
                      isPick ? "text-amber-900" : "text-gray-600"
                    }`}
                  >
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
