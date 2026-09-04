"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { playTick, playFanfare, playBooster } from "@/lib/sound";

interface PlinkoGameProps {
  candidates: string[];
  pickCount: number;
  onFinish: (winnerNames: string[]) => void;
  soundEnabled: boolean;
}

const BALL_COLORS = [
  "#EF4444", "#3B82F6", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
  "#F97316", "#14B8A6", "#A855F7", "#D946EF",
];

interface Pin {
  x: number;
  y: number;
}

interface Ball {
  name: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  landedSlot: number | null;
}

export default function PlinkoGame({
  candidates,
  pickCount,
  onFinish,
  soundEnabled,
}: PlinkoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  const activeCandidates = useMemo(() => candidates.slice(0, 12), [candidates]);
  const numBalls = activeCandidates.length;

  const [dropping, setDropping] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [winners, setWinners] = useState<string[]>([]);

  // 바닥 슬롯 개수 (5개)
  const numSlots = 5;
  const slotLabels = useMemo(() => [
    "통과",
    "👑 2위",
    "🎉 1위",
    "👑 3위",
    "통과",
  ], []);

  // 핀 그리드 생성
  const pins = useMemo(() => {
    const list: Pin[] = [];
    const rows = 7;
    const startY = 70;
    const rowGap = 36;

    for (let r = 0; r < rows; r++) {
      const count = r % 2 === 0 ? 8 : 7;
      const spacing = 42;
      const offsetX = r % 2 === 0 ? 32 : 53;

      for (let c = 0; c < count; c++) {
        list.push({
          x: offsetX + c * spacing,
          y: startY + r * rowGap,
        });
      }
    }
    return list;
  }, []);

  const ballsRef = useRef<Ball[]>([]);

  const initBoard = useCallback(() => {
    if (numBalls === 0) return;

    const list: Ball[] = activeCandidates.map((name, i) => {
      // 상단 시작 위치 분산
      const spread = 220 / Math.max(numBalls - 1, 1);
      return {
        name,
        color: BALL_COLORS[i % BALL_COLORS.length],
        x: 75 + i * spread,
        y: 25,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 0,
        landedSlot: null,
      };
    });

    ballsRef.current = list;
    setCompleted(false);
    setDropping(false);
    setWinners([]);
  }, [activeCandidates, numBalls]);

  useEffect(() => {
    if (!dropping && !completed) {
      initBoard();
    }
  }, [initBoard, dropping, completed]);

  // 프레임 렌더링
  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. 보드 배경
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, w, h);

    // 2. 핀(Pins) 그리기
    pins.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#94A3B8";
      ctx.shadowColor = "#FFFFFF";
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 3. 바닥 슬롯 그리기
    const slotW = w / numSlots;
    const slotY = h - 45;

    for (let i = 0; i < numSlots; i++) {
      const sx = i * slotW;
      const isPrize = slotLabels[i].includes("1위") || slotLabels[i].includes("2위") || slotLabels[i].includes("3위");

      ctx.fillStyle = isPrize ? "#B45309" : "#1E293B";
      ctx.fillRect(sx + 2, slotY, slotW - 4, 40);

      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 2, slotY, slotW - 4, 40);

      ctx.fillStyle = isPrize ? "#FDE047" : "#94A3B8";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(slotLabels[i], sx + slotW / 2, slotY + 20);
    }

    // 4. 구슬(Balls) 그리기
    ballsRef.current.forEach(ball => {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.shadowColor = ball.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 구슬 위 학생 이름
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ball.name.slice(0, 3), ball.x, ball.y);
    });
  }, [pins, numSlots, slotLabels]);

  useEffect(() => {
    drawBoard();
  }, [drawBoard]);

  // 구슬 낙하 시작
  const dropBalls = () => {
    if (dropping || numBalls < 2) return;
    setDropping(true);
    setCompleted(false);
    setWinners([]);
    initBoard();
    playBooster(soundEnabled, 0.4);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const slotW = w / numSlots;
    const floorY = h - 45;

    let tickTimer = 0;

    const update = () => {
      let allLanded = true;
      tickTimer++;

      ballsRef.current.forEach(ball => {
        if (ball.landedSlot !== null) return;

        allLanded = false;

        // 중력 & 속도 가속
        ball.vy += 0.22;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // 좌우 벽 바운스
        if (ball.x < 15) {
          ball.x = 15;
          ball.vx = Math.abs(ball.vx) * 0.7;
        } else if (ball.x > w - 15) {
          ball.x = w - 15;
          ball.vx = -Math.abs(ball.vx) * 0.7;
        }

        // 핀 충돌 검사
        pins.forEach(p => {
          const dx = ball.x - p.x;
          const dy = ball.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 15) {
            // 바운스 방향 반사
            const angle = Math.atan2(dy, dx);
            ball.vx = Math.cos(angle) * (1.8 + Math.random() * 1.5);
            ball.vy = Math.max(Math.sin(angle) * 2, 0.8);

            if (tickTimer % 3 === 0) {
              playTick(soundEnabled, 0.15);
            }
          }
        });

        // 바닥 슬롯 안착 검사
        if (ball.y >= floorY - 6) {
          ball.y = floorY + 12;
          ball.vx = 0;
          ball.vy = 0;
          const sIdx = Math.min(Math.floor(ball.x / slotW), numSlots - 1);
          ball.landedSlot = sIdx;
        }
      });

      drawBoard();

      if (!allLanded) {
        animRef.current = requestAnimationFrame(update);
      } else {
        // 모든 구슬 안착 완료
        setDropping(false);
        setCompleted(true);
        playFanfare(soundEnabled, 0.6);

        // 당첨자 선정 (1위, 2위, 3위 슬롯에 들어간 학생)
        const won: string[] = [];
        ballsRef.current.forEach(b => {
          if (b.landedSlot !== null && slotLabels[b.landedSlot].includes("1위")) {
            won.unshift(b.name); // 1등 맨 앞
          } else if (b.landedSlot !== null && slotLabels[b.landedSlot].includes("위")) {
            won.push(b.name);
          }
        });

        // 당첨 슬롯에 아무도 안 들어갔을 때의 폴백 (가장 가운데 슬롯에 가까운 구슬)
        if (won.length === 0 && ballsRef.current.length > 0) {
          won.push(ballsRef.current[0].name);
        }

        setWinners(won);
      }
    };

    animRef.current = requestAnimationFrame(update);
  };

  // ── 확인 누를 때 비로소 다음 게임으로 진행 ──
  const handleConfirmNext = () => {
    if (winners.length > 0) {
      onFinish(winners.slice(0, pickCount));
    }
    initBoard();
  };

  return (
    <div className="space-y-5">
      {/* 안내 */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <span className="font-bold flex items-center gap-1.5">
          🪙 구슬 <b className="text-amber-600">{numBalls}개</b> 준비됨
        </span>
        <span className="text-[11px] text-slate-400">
          핀을 튕기며 바닥의 당첨 슬롯으로 낙하합니다!
        </span>
      </div>

      {/* 플링코 캔버스 */}
      <div className="flex justify-center">
        <div className="rounded-3xl overflow-hidden border-4 border-slate-700 shadow-2xl bg-slate-900">
          <canvas
            ref={canvasRef}
            width={370}
            height={380}
            className="block select-none"
          />
        </div>
      </div>

      {/* ── 👑 당첨 결과 카드 (확인 누를 때까지 유지) ── */}
      {completed && winners.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white rounded-3xl p-6 shadow-2xl space-y-4 animate-[fadeInUp_0.25s_ease]">
          <div className="text-center space-y-1.5">
            <div className="text-4xl animate-bounce">🪙👑</div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md">
              플링코 당첨: {winners.slice(0, pickCount).join(", ")}!
            </h2>
            <p className="text-xs text-amber-100">
              확인을 누르면 당첨된 학생이 제외되고 다음 게임을 준비합니다.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleConfirmNext}
              className="flex-1 py-4 bg-white text-amber-950 font-black text-lg rounded-2xl shadow-xl hover:bg-amber-50 transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>✅ 확인 (다음 뽑기 진행)</span>
            </button>
            <button
              onClick={dropBalls}
              className="px-6 py-4 bg-black/20 hover:bg-black/30 text-white font-bold text-sm rounded-2xl border border-white/30 transition-colors"
            >
              ↺ 구슬 다시 떨어뜨리기
            </button>
          </div>
        </div>
      )}

      {/* 컨트롤 버튼 */}
      {!completed && (
        <div className="flex gap-3 justify-center items-center pt-1">
          <button
            onClick={dropBalls}
            disabled={dropping || numBalls < 2}
            className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black text-lg rounded-2xl hover:brightness-110 disabled:opacity-40 shadow-xl transition-transform active:scale-95 flex items-center gap-2"
          >
            {dropping ? (
              <>
                <span className="animate-bounce">🪙</span> 구슬 떨어지는 중...!
              </>
            ) : (
              <>🪙 구슬 투하!</>
            )}
          </button>

          <button
            onClick={initBoard}
            disabled={dropping}
            className="px-4 py-3.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-2xl hover:border-slate-500 shadow-sm"
          >
            ↺ 위치 섞기
          </button>
        </div>
      )}
    </div>
  );
}
