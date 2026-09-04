"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { playTick, playFanfare } from "@/lib/sound";

interface LadderGameProps {
  candidates: string[];
  pickCount: number;
  onFinish: (winnerNames: string[]) => void;
  soundEnabled: boolean;
}

interface Rung {
  leftCol: number; // 0 to N-2
  y: number;       // 0 to 1
}

const LINE_COLORS = [
  "#EF4444", "#3B82F6", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
  "#6366F1", "#14B8A6", "#F97316", "#A855F7",
];

export default function LadderGame({
  candidates,
  pickCount,
  onFinish,
  soundEnabled,
}: LadderGameProps) {
  // 최대 10명까지 지원
  const activeCandidates = useMemo(() => candidates.slice(0, 10), [candidates]);
  const numCols = activeCandidates.length;

  // 하단 당첨 결과 기본값 생성
  const [destinations, setDestinations] = useState<string[]>([]);
  const [rungs, setRungs] = useState<Rung[]>([]);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  // 각 학생의 사다리 완주 결과 매핑 (studentIndex -> destinationIndex)
  const [finalMap, setFinalMap] = useState<Record<number, number>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  // 사다리 가로줄 및 도착지점 초기화
  const initLadder = useCallback(() => {
    if (numCols < 2) return;

    // 1. 하단 당첨 슬롯 설정 (pickCount만큼 당첨)
    const dests: string[] = [];
    for (let i = 0; i < numCols; i++) {
      if (i < pickCount) {
        dests.push(pickCount === 1 ? "당첨 🎉" : `당첨 ${i + 1} 🎉`);
      } else {
        dests.push("통과 ✨");
      }
    }
    // 슬롯 셔플
    const shuffledDests = [...dests].sort(() => Math.random() - 0.5);
    setDestinations(shuffledDests);

    // 2. 가로줄 (Rung) 무작위 생성
    const newRungs: Rung[] = [];
    const numRungs = Math.max(numCols * 3, 10);

    for (let i = 0; i < numRungs; i++) {
      const leftCol = Math.floor(Math.random() * (numCols - 1));
      const y = 0.15 + Math.random() * 0.7; // 15% ~ 85% 영역

      // 같은 높이에 너무 가까운 줄 방지
      const tooClose = newRungs.some(
        r => (r.leftCol === leftCol || r.leftCol === leftCol - 1 || r.leftCol === leftCol + 1) &&
             Math.abs(r.y - y) < 0.05
      );

      if (!tooClose) {
        newRungs.push({ leftCol, y });
      }
    }

    newRungs.sort((a, b) => a.y - b.y);
    setRungs(newRungs);

    // 3. 각 열의 최종 결과 사전 계산 (Deterministic)
    const mapping: Record<number, number> = {};
    for (let startCol = 0; startCol < numCols; startCol++) {
      let currentCol = startCol;
      for (const rung of newRungs) {
        if (rung.leftCol === currentCol) {
          currentCol = currentCol + 1;
        } else if (rung.leftCol === currentCol - 1) {
          currentCol = currentCol - 1;
        }
      }
      mapping[startCol] = currentCol;
    }
    setFinalMap(mapping);
    setCompleted(false);
    setRunning(false);
  }, [numCols, pickCount]);

  useEffect(() => {
    initLadder();
  }, [initLadder]);

  // 기본 사다리 프레임 캔버스에 그리기
  const drawBaseLadder = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || numCols < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const colWidth = w / numCols;

    // 세로 기둥 선
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    for (let i = 0; i < numCols; i++) {
      const x = colWidth * i + colWidth / 2;
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, h - 20);
      ctx.stroke();
    }

    // 가로 연결선 (Rungs)
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 3;

    for (const rung of rungs) {
      const x1 = colWidth * rung.leftCol + colWidth / 2;
      const x2 = colWidth * (rung.leftCol + 1) + colWidth / 2;
      const y = 20 + rung.y * (h - 40);

      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    }
  }, [numCols, rungs]);

  useEffect(() => {
    drawBaseLadder();
  }, [drawBaseLadder]);

  // 사다리 전체 출발 애니메이션
  const startAll = () => {
    if (running || numCols < 2) return;
    setRunning(true);
    setCompleted(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const colWidth = w / numCols;

    // 각 학생의 경로 포인트 (세그먼트 리스트) 사전 생성
    const studentPaths: { x: number; y: number }[][] = [];

    for (let startCol = 0; startCol < numCols; startCol++) {
      const path: { x: number; y: number }[] = [];
      let curCol = startCol;
      const curY = 20;
      const startX = colWidth * curCol + colWidth / 2;
      path.push({ x: startX, y: curY });

      for (const rung of rungs) {
        const rungY = 20 + rung.y * (h - 40);
        if (rung.leftCol === curCol) {
          // 오른쪽으로 꺾임
          path.push({ x: colWidth * curCol + colWidth / 2, y: rungY });
          curCol = curCol + 1;
          path.push({ x: colWidth * curCol + colWidth / 2, y: rungY });
        } else if (rung.leftCol === curCol - 1) {
          // 왼쪽으로 꺾임
          path.push({ x: colWidth * curCol + colWidth / 2, y: rungY });
          curCol = curCol - 1;
          path.push({ x: colWidth * curCol + colWidth / 2, y: rungY });
        }
      }
      path.push({ x: colWidth * curCol + colWidth / 2, y: h - 20 });
      studentPaths.push(path);
    }

    const duration = 5000; // 5초 동안 하강
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 틱 효과음 (일정 주기마다)
      if (Math.floor(elapsed / 250) % 2 === 0 && Math.random() < 0.3) {
        playTick(soundEnabled, 0.3);
      }

      drawBaseLadder();

      // 각 학생별 색상 선 그리기
      for (let s = 0; s < numCols; s++) {
        const pts = studentPaths[s];
        const totalPoints = pts.length;
        const targetPtIdx = Math.floor(progress * (totalPoints - 1));

        ctx.strokeStyle = LINE_COLORS[s % LINE_COLORS.length];
        ctx.lineWidth = 5;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);

        for (let i = 1; i <= targetPtIdx; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }

        // 현재 보간 지점
        if (targetPtIdx < totalPoints - 1) {
          const subProgress = (progress * (totalPoints - 1)) - targetPtIdx;
          const p1 = pts[targetPtIdx];
          const p2 = pts[targetPtIdx + 1];
          const curX = p1.x + (p2.x - p1.x) * subProgress;
          const curY = p1.y + (p2.y - p1.y) * subProgress;
          ctx.lineTo(curX, curY);

          // 이동 헤드 도트
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(curX, curY, 7, 0, Math.PI * 2);
          ctx.fillStyle = LINE_COLORS[s % LINE_COLORS.length];
          ctx.fill();
        } else {
          ctx.stroke();
        }
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setRunning(false);
        setCompleted(true);
        playFanfare(soundEnabled, 0.6);

        // 당첨자 추출
        const winners: string[] = [];
        for (let s = 0; s < numCols; s++) {
          const destIdx = finalMap[s];
          if (destinations[destIdx]?.includes("당첨")) {
            winners.push(activeCandidates[s]);
          }
        }
        onFinish(winners);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  const skip = () => {
    if (!running) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    setRunning(false);
    setCompleted(true);
    playFanfare(soundEnabled, 0.6);

    const winners: string[] = [];
    for (let s = 0; s < numCols; s++) {
      const destIdx = finalMap[s];
      if (destinations[destIdx]?.includes("당첨")) {
        winners.push(activeCandidates[s]);
      }
    }
    onFinish(winners);
  };

  return (
    <div className="space-y-4">
      {/* 상단 학생 명단 헤더 바 */}
      <div className="grid gap-1 text-center" style={{ gridTemplateColumns: `repeat(${numCols}, 1fr)` }}>
        {activeCandidates.map((name, idx) => (
          <div
            key={idx}
            className="px-1.5 py-2 rounded-xl text-xs font-black truncate shadow-sm border border-slate-200"
            style={{
              backgroundColor: `${LINE_COLORS[idx % LINE_COLORS.length]}15`,
              color: LINE_COLORS[idx % LINE_COLORS.length],
            }}
          >
            {name}
          </div>
        ))}
      </div>

      {/* 캔버스 사다리 보드 */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-2 shadow-inner">
        <canvas
          ref={canvasRef}
          width={numCols * 90}
          height={360}
          className="w-full h-[340px] select-none block"
        />
      </div>

      {/* 하단 당첨 슬롯 */}
      <div className="grid gap-1 text-center" style={{ gridTemplateColumns: `repeat(${numCols}, 1fr)` }}>
        {destinations.map((dest, idx) => {
          const isWin = dest.includes("당첨");
          return (
            <div
              key={idx}
              className={`px-1 py-2 rounded-xl text-xs font-bold truncate transition-all duration-300 ${
                completed && isWin
                  ? "bg-amber-400 text-amber-950 font-black scale-105 shadow-md ring-2 ring-amber-500 animate-bounce"
                  : completed
                  ? "bg-gray-100 text-gray-400"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {completed ? dest : `❓ ${idx + 1}`}
            </div>
          );
        })}
      </div>

      {/* 액션 컨트롤 버튼 */}
      <div className="flex gap-3 justify-center items-center pt-2">
        <button
          onClick={startAll}
          disabled={running || numCols < 2}
          className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-lg rounded-2xl hover:from-emerald-700 hover:to-teal-800 disabled:opacity-40 shadow-xl transition-transform active:scale-95"
        >
          {running ? "🪜 사다리 내려가는 중...!" : "🪜 사다리 출발!"}
        </button>

        <button
          onClick={initLadder}
          disabled={running}
          className="px-4 py-3.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-2xl hover:border-slate-500 shadow-sm"
        >
          ↺ 사다리 다시 그리기
        </button>

        {running && (
          <button
            onClick={skip}
            className="px-4 py-3.5 bg-gray-200 text-gray-700 text-sm font-bold rounded-2xl hover:bg-gray-300"
          >
            ⏩ 스킵
          </button>
        )}
      </div>

      {/* 당첨자 요약 표 */}
      {completed && (
        <div className="bg-white rounded-2xl border-2 border-emerald-500 p-4 text-center shadow-lg space-y-2">
          <p className="text-xs font-bold text-emerald-700">🎉 사다리타기 결과</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {activeCandidates.map((name, sIdx) => {
              const destIdx = finalMap[sIdx];
              const dest = destinations[destIdx];
              if (!dest?.includes("당첨")) return null;
              return (
                <span
                  key={sIdx}
                  className="px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 font-black rounded-xl text-sm shadow-sm"
                >
                  👑 {name} ({dest})
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
