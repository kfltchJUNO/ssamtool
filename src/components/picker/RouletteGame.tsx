"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { playTick, playFanfare } from "@/lib/sound";

interface RouletteGameProps {
  candidates: string[];
  onFinish: (winner: string) => void;
  soundEnabled: boolean;
  onSkip?: () => void;
}

const COLORS = [
  "#1B4332", "#2D6A4F", "#40916C", "#D97706", "#B45309",
  "#2563EB", "#1D4ED8", "#7C3AED", "#6D28D9", "#DB2777",
  "#059669", "#EA580C", "#0891B2", "#4F46E5", "#CA8A04"
];

export default function RouletteGame({
  candidates,
  onFinish,
  soundEnabled,
}: RouletteGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const angleRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const lastSliceIdxRef = useRef<number>(-1);

  const numItems = candidates.length;
  const sliceAngle = (2 * Math.PI) / (numItems || 1);

  const drawWheel = useCallback((currentAngle: number) => {
    const canvas = canvasRef.current;
    if (!canvas || numItems === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 15;

    ctx.clearRect(0, 0, width, height);

    // 섹터 그리기
    for (let i = 0; i < numItems; i++) {
      const startA = currentAngle + i * sliceAngle;
      const endA = startA + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startA, endA);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#FFFFFF";
      ctx.stroke();

      // 학생 이름 텍스트 (방사형)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startA + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = numItems > 15 ? "bold 13px sans-serif" : "bold 16px sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 4;
      ctx.fillText(candidates[i], radius - 25, 6);
      ctx.restore();
    }

    // 중앙 원형 캡
    ctx.beginPath();
    ctx.arc(centerX, centerY, 28, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#1B4332";
    ctx.stroke();

    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#1B4332";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = 0;
    ctx.fillText("GO!", centerX, centerY);
  }, [candidates, numItems, sliceAngle]);

  useEffect(() => {
    drawWheel(angleRef.current);
  }, [drawWheel]);

  const spin = () => {
    if (spinning || numItems === 0) return;

    // 1. 사전 결정: 당첨 학생 인덱스 공정 추출
    const winnerIdx = Math.floor(Math.random() * numItems);
    const chosenWinner = candidates[winnerIdx];

    setSpinning(true);
    setWinner(null);

    // 바늘은 12시 방향 (위쪽 = -PI/2)
    // 섹터 i의 중심 각도가 12시에 도달하도록 목표 회전 각도 계산
    const targetSliceCenter = (winnerIdx + 0.5) * sliceAngle;
    const pointerAngle = (3 * Math.PI) / 2; // 12시 방향
    const finalAngle = pointerAngle - targetSliceCenter;

    // 최소 5회~7회 바퀴 회전
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const startAngle = angleRef.current % (2 * Math.PI);
    const totalRotation = extraSpins * 2 * Math.PI + ((finalAngle - startAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const destination = startAngle + totalRotation;

    const duration = 4500; // 4.5초
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic: 1 - (1 - t)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      const curAngle = startAngle + totalRotation * ease;
      angleRef.current = curAngle;

      drawWheel(curAngle);

      // 현재 바늘이 지나가는 슬라이스 감지하여 틱 사운드 재생
      const normalizedAngle = (pointerAngle - curAngle) % (2 * Math.PI);
      const positiveAngle = normalizedAngle < 0 ? normalizedAngle + 2 * Math.PI : normalizedAngle;
      const curSliceIdx = Math.floor(positiveAngle / sliceAngle);

      if (curSliceIdx !== lastSliceIdxRef.current) {
        lastSliceIdxRef.current = curSliceIdx;
        playTick(soundEnabled, 0.4);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        angleRef.current = destination;
        drawWheel(destination);
        setSpinning(false);
        setWinner(chosenWinner);
        playFanfare(soundEnabled, 0.6);
        onFinish(chosenWinner);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  const skip = () => {
    if (!spinning) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    // 즉시 당첨 확정
    const winnerIdx = Math.floor(Math.random() * numItems);
    const chosenWinner = candidates[winnerIdx];
    setSpinning(false);
    setWinner(chosenWinner);
    playFanfare(soundEnabled, 0.6);
    onFinish(chosenWinner);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* 룰렛 컨테이너 & 상단 지침 바늘 */}
      <div className="relative w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] flex items-center justify-center select-none">
        {/* 상단 화살표 바늘 (12시 방향) */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-md">
          <div className="w-0 h-0 border-x-[14px] border-x-transparent border-t-[26px] border-t-[#DC2626]" />
        </div>

        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-full h-full rounded-full shadow-2xl border-4 border-[#1B4332]"
        />
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3 items-center">
        <button
          onClick={spin}
          disabled={spinning || numItems === 0}
          className="px-8 py-3.5 bg-[#1B4332] text-white font-black text-lg rounded-2xl hover:bg-[#2D6A4F] disabled:opacity-40 shadow-lg transition-transform active:scale-95"
        >
          {spinning ? "🎡 돌아가는 중..." : "🎡 룰렛 돌리기!"}
        </button>

        {spinning && (
          <button
            onClick={skip}
            className="px-4 py-3.5 bg-gray-200 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-300"
          >
            ⏩ 스킵
          </button>
        )}
      </div>

      {/* 당첨자 팝업 발표 카드 */}
      {winner && (
        <div className="w-full max-w-md bg-gradient-to-r from-[#F0FFF4] via-white to-[#F0FFF4] border-2 border-[#1B4332] p-5 rounded-2xl text-center shadow-xl animate-bounce">
          <p className="text-xs font-bold text-[#2D6A4F] uppercase tracking-wider">🎉 축하합니다! 당첨 학생 🎉</p>
          <p className="text-3xl font-black text-[#1B4332] mt-1 tracking-wide">{winner}</p>
        </div>
      )}
    </div>
  );
}
