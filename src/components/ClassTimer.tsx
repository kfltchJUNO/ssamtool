"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const PRESETS = [
  { label: "1분", seconds: 60 },
  { label: "3분", seconds: 180 },
  { label: "5분", seconds: 300 },
  { label: "10분", seconds: 600 },
  { label: "15분", seconds: 900 },
  { label: "30분", seconds: 1800 },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

const CIRCUMFERENCE = 2 * Math.PI * 110; // r=110

type TimerMode = "countdown" | "stopwatch";

export default function ClassTimer() {
  const [mode, setMode] = useState<TimerMode>("countdown");
  const [initialSeconds, setInitialSeconds] = useState(300);
  const [remaining, setRemaining] = useState(300);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [customMin, setCustomMin] = useState("5");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      audioRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const start = useCallback(() => {
    setRunning(true);
    setFinished(false);
  }, []);

  const pause = useCallback(() => setRunning(false), []);

  const reset = useCallback(() => {
    clearTimer();
    setRunning(false);
    setFinished(false);
    if (mode === "countdown") setRemaining(initialSeconds);
    else setElapsed(0);
  }, [clearTimer, mode, initialSeconds]);

  const applyPreset = (s: number) => {
    setInitialSeconds(s);
    setRemaining(s);
    setRunning(false);
    setFinished(false);
    setCustomMin(String(Math.floor(s / 60)));
  };

  const applyCustom = () => {
    const m = parseInt(customMin, 10);
    if (!isNaN(m) && m > 0) applyPreset(m * 60);
  };

  useEffect(() => {
    clearTimer();
    if (!running) return;
    intervalRef.current = setInterval(() => {
      if (mode === "countdown") {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearTimer();
            setRunning(false);
            setFinished(true);
            playBeep();
            return 0;
          }
          return prev - 1;
        });
      } else {
        setElapsed((prev) => prev + 1);
      }
    }, 1000);
    return clearTimer;
  }, [running, mode, clearTimer, playBeep]);

  const progress =
    mode === "countdown"
      ? remaining / initialSeconds
      : Math.min(elapsed / 3600, 1);

  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const danger = mode === "countdown" && remaining <= initialSeconds * 0.2 && remaining > 0;
  // ringColor removed
  const displayTime = mode === "countdown" ? formatTime(remaining) : formatTime(elapsed);

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          {(["countdown", "stopwatch"] as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); reset(); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === m
                  ? "bg-[#1B4332] text-[#F5F0E8]"
                  : "text-[#4A4A4A] hover:bg-[#E8E0D0]"
              }`}
            >
              {m === "countdown" ? "⏳ 카운트다운" : "⏱️ 스톱워치"}
            </button>
          ))}
        </div>

        {/* Ring timer */}
        <div className="flex flex-col items-center">
          <div className="relative" style={{ width: 260, height: 260 }}>
            <svg width="260" height="260" className="-rotate-90" style={{ position: "absolute" }}>
              {/* Background track */}
              <circle cx="130" cy="130" r="110" fill="none" stroke="#E8E0D0" strokeWidth="12" />
              {/* Progress */}
              <circle
                cx="130" cy="130" r="110"
                fill="none"
                stroke={finished ? "#C53030" : danger ? "#E53E3E" : "#1B4332"}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                className="timer-ring"
                style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.3s ease" }}
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {finished ? (
                <div className="text-center">
                  <div className="text-4xl mb-1">🔔</div>
                  <div className="text-[#C53030] font-bold text-lg">시간 완료!</div>
                </div>
              ) : (
                <>
                  <div
                    className="font-mono font-black tabular-nums"
                    style={{
                      fontSize: displayTime.length > 5 ? "3rem" : "3.5rem",
                      color: danger ? "#C53030" : "#1B4332",
                      lineHeight: 1,
                    }}
                  >
                    {displayTime}
                  </div>
                  {mode === "countdown" && (
                    <div className="text-xs text-[#9A9A9A] mt-2">
                      {Math.round(progress * 100)}% 남음
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3 mt-5">
            {!running ? (
              <button
                onClick={start}
                disabled={finished && mode === "countdown"}
                className="px-8 py-3 bg-[#1B4332] text-white font-bold rounded-xl hover:bg-[#2D6A4F] disabled:opacity-40 transition-all text-lg"
              >
                ▶ 시작
              </button>
            ) : (
              <button
                onClick={pause}
                className="px-8 py-3 bg-[#F2C94C] text-[#1B4332] font-bold rounded-xl hover:bg-[#EAB800] transition-all text-lg"
              >
                ⏸ 일시정지
              </button>
            )}
            <button
              onClick={reset}
              className="px-5 py-3 border-2 border-[#E8E0D0] text-[#4A4A4A] font-semibold rounded-xl hover:border-[#1B4332] hover:text-[#1B4332] transition-all"
            >
              ↺ 초기화
            </button>
          </div>
        </div>
      </div>

      {/* Presets (countdown only) */}
      {mode === "countdown" && (
        <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm">
          <p className="text-xs font-semibold text-[#4A4A4A] mb-3">시간 프리셋</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.seconds)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  initialSeconds === p.seconds
                    ? "bg-[#1B4332] text-white border-[#1B4332]"
                    : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332] hover:text-[#1B4332]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input
              type="number"
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              min={1}
              max={180}
              className="w-20 border border-[#E8E0D0] rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-[#1B4332]"
              placeholder="분"
            />
            <span className="text-sm text-[#4A4A4A]">분</span>
            <button
              onClick={applyCustom}
              className="px-4 py-2 bg-[#E8E0D0] text-[#1B4332] text-sm font-semibold rounded-lg hover:bg-[#d4c9b5] transition-colors"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
