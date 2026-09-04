"use client";

import { useState, useEffect } from "react";

interface StickerEntry {
  name: string;
  stickers: number;
}

export default function ClassroomTools({ preloadedStudents = [] }: { preloadedStudents?: string[] }) {
  const [students, setStudents] = useState<StickerEntry[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (preloadedStudents.length > 0) {
      setStudents(preloadedStudents.map(name => ({ name, stickers: 0 })));
    }
  }, [preloadedStudents]);

  // Web Audio API Synth Sound Generator (사운드 파일 다운로드 필요 없음)
  const playSound = (type: "correct" | "wrong" | "bell" | "applause") => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();

      if (type === "correct") {
        // 딩동댕 멜로디 (C5 - E5 - G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
          gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.3);
        });
      } else if (type === "wrong") {
        // 땡 (낮은 톱니파 사운드)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === "bell") {
        // 수업 시작/종료 종소리
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
      } else if (type === "applause") {
        // 박수 갈채 노이즈 시뮬레이션
        const bufferSize = ctx.sampleRate * 1.0;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1000;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        whiteNoise.start();
        whiteNoise.stop(ctx.currentTime + 1.0);
      }
    } catch {
      console.warn("Web Audio API not supported");
    }
  };

  const addSticker = (index: number) => {
    setStudents(prev => prev.map((s, i) => i === index ? { ...s, stickers: s.stickers + 1 } : s));
  };

  const removeSticker = (index: number) => {
    setStudents(prev => prev.map((s, i) => i === index ? { ...s, stickers: Math.max(0, s.stickers - 1) } : s));
  };

  const addStudent = () => {
    if (!newName.trim()) return;
    setStudents(prev => [...prev, { name: newName.trim(), stickers: 0 }]);
    setNewName("");
  };

  return (
    <div className="space-y-6">
      {/* 1. 수업용 효과음 사운드 보드 */}
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-[#1B4332] text-lg flex items-center gap-2">
          <span>🔔</span> 수업용 효과음 보드 (무료)
        </h2>
        <p className="text-xs text-[#64748B]">수업 집중, 퀴즈 정답/오답 및 활동 시작 시 버튼을 눌러 효과음을 재생하세요.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => playSound("correct")}
            className="p-4 bg-[#F0FFF4] border border-[#9AE6B4] rounded-xl font-bold text-[#1B4332] hover:bg-[#D4EDDA] transition-all flex flex-col items-center gap-2 shadow-sm active:scale-95"
          >
            <span className="text-3xl">⭕</span>
            <span className="text-xs">딩동댕 (정답)</span>
          </button>
          <button
            onClick={() => playSound("wrong")}
            className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl font-bold text-[#991B1B] hover:bg-[#FEE2E2] transition-all flex flex-col items-center gap-2 shadow-sm active:scale-95"
          >
            <span className="text-3xl">❌</span>
            <span className="text-xs">땡! (오답)</span>
          </button>
          <button
            onClick={() => playSound("bell")}
            className="p-4 bg-[#FFFBEB] border border-[#FCD34D] rounded-xl font-bold text-[#92400E] hover:bg-[#FEF3C7] transition-all flex flex-col items-center gap-2 shadow-sm active:scale-95"
          >
            <span className="text-3xl">🔔</span>
            <span className="text-xs">골든벨/시작 종</span>
          </button>
          <button
            onClick={() => playSound("applause")}
            className="p-4 bg-[#F0F9FF] border border-[#7DD3FC] rounded-xl font-bold text-[#0369A1] hover:bg-[#E0F2FE] transition-all flex flex-col items-center gap-2 shadow-sm active:scale-95"
          >
            <span className="text-3xl">👏</span>
            <span className="text-xs">박수 갈채</span>
          </button>
        </div>
      </div>

      {/* 2. 칭찬 스티커 도장판 */}
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-[#1B4332] text-lg flex items-center gap-2">
            <span>💮</span> 참 잘했어요! 칭찬 스티커판 (무료)
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="학생 이름 추가"
              className="border p-1.5 rounded"
            />
            <button onClick={addStudent} className="px-3 py-1.5 bg-[#1B4332] text-white font-bold rounded">
              추가
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {students.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#94A3B8]">
              반을 불러오거나 위에서 학생 이름을 추가해주세요.
            </div>
          ) : (
            students.map((s, idx) => (
              <div key={idx} className="p-3 border rounded-xl flex items-center justify-between flex-wrap gap-2 bg-[#F8FAFC]">
                <span className="font-bold text-sm text-[#0F172A] w-24 truncate">{s.name}</span>
                <div className="flex-1 flex flex-wrap gap-1 items-center">
                  {Array.from({ length: s.stickers }).map((_, i) => (
                    <span key={i} className="text-lg animate-bounce">💮</span>
                  ))}
                  {s.stickers === 0 && <span className="text-xs text-[#94A3B8]">스티커 0개</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => removeSticker(idx)} className="px-2 py-1 border bg-white rounded font-bold text-xs">
                    -
                  </button>
                  <button onClick={() => addSticker(idx)} className="px-2.5 py-1 bg-[#1B4332] text-white rounded font-bold text-xs">
                    + 칭찬 도장
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
