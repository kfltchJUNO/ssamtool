"use client";

import { useState, useEffect } from "react";

interface StickerEntry {
  name: string;
  stickers: number;
}

interface ClassroomToolsProps {
  preloadedStudents?: string[];
  onOpenClassPanel?: () => void;
  isLoggedIn?: boolean;
}

export default function ClassroomTools({
  preloadedStudents = [],
  onOpenClassPanel,
  isLoggedIn,
}: ClassroomToolsProps) {
  const [students, setStudents] = useState<StickerEntry[]>([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (preloadedStudents.length > 0) {
      setStudents(preloadedStudents.map(name => ({ name, stickers: 0 })));
    }
  }, [preloadedStudents]);

  // Web Audio API 기반 풍부한 효과음 합성기 (Volume Boosting & Compressor 적용)
  const playSound = (type: "correct" | "wrong" | "bell" | "applause" | "drum" | "countdown" | "fanfare" | "siren") => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();

      // 마스터 볼륨 및 컴프레서 (소리가 묻히지 않고 또렷하고 크게 들리도록 처리)
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, ctx.currentTime);
      compressor.knee.setValueAtTime(30, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1.5, ctx.currentTime); // 1.5배 부스팅

      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);

      if (type === "correct") {
        // 딩동댕 (C5 - E5 - G5 - C6) 경쾌한 실로폰/차임벨 음색
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);

          gain.gain.setValueAtTime(0.8, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);

          osc.connect(gain);
          gain.connect(compressor);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.35);
        });
      } else if (type === "wrong") {
        // 땡! 묵직하고 명확한 부저음 (F3 -> D3 피치 다운)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(174.61, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.9, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

        osc.connect(gain);
        gain.connect(compressor);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === "bell") {
        // 골든벨 / 맑고 낭랑한 종소리 (배음 포함)
        [880, 1760, 2640].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          const vol = i === 0 ? 0.9 : 0.3;
          gain.gain.setValueAtTime(vol, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);

          osc.connect(gain);
          gain.connect(compressor);
          osc.start();
          osc.stop(ctx.currentTime + 2.0);
        });
      } else if (type === "applause") {
        // 박수 갈채 & 환호 시뮬레이션
        const bufferSize = ctx.sampleRate * 1.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 1.2));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1200, ctx.currentTime);
        filter.Q.setValueAtTime(1.5, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.9, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(compressor);
        noise.start();
        noise.stop(ctx.currentTime + 1.5);
      } else if (type === "drum") {
        // 드럼롤 (긴장감 고조)
        const totalHits = 24;
        for (let i = 0; i < totalHits; i++) {
          const time = ctx.currentTime + i * 0.06;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(90 + Math.random() * 30, time);
          gain.gain.setValueAtTime(0.4 + (i / totalHits) * 0.5, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

          osc.connect(gain);
          gain.connect(compressor);
          osc.start(time);
          osc.stop(time + 0.05);
        }
        // 마지막 심벌즈 타격
        setTimeout(() => {
          try {
            const cymCtx = new AudioCtx();
            const osc = cymCtx.createOscillator();
            const g = cymCtx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(350, cymCtx.currentTime);
            g.gain.setValueAtTime(0.8, cymCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, cymCtx.currentTime + 0.6);
            osc.connect(g);
            g.connect(cymCtx.destination);
            osc.start();
            osc.stop(cymCtx.currentTime + 0.6);
          } catch {}
        }, 1450);
      } else if (type === "countdown") {
        // 삑-삑-삑-삐익! (카운트다운 비프음)
        [0, 0.4, 0.8, 1.2].forEach((t, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          const isFinal = i === 3;
          osc.frequency.setValueAtTime(isFinal ? 1200 : 700, ctx.currentTime + t);
          gain.gain.setValueAtTime(0.8, ctx.currentTime + t);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + t + (isFinal ? 0.5 : 0.15));

          osc.connect(gain);
          gain.connect(compressor);
          osc.start(ctx.currentTime + t);
          osc.stop(ctx.currentTime + t + (isFinal ? 0.5 : 0.15));
        });
      } else if (type === "fanfare") {
        // 팡파레 (도-미-솔-도)
        const notes = [261.63, 329.63, 392.00, 523.25, 523.25];
        const times = [0, 0.12, 0.24, 0.36, 0.52];
        const lens = [0.1, 0.1, 0.1, 0.15, 0.6];
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, ctx.currentTime + times[idx]);
          gain.gain.setValueAtTime(0.8, ctx.currentTime + times[idx]);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + times[idx] + lens[idx]);

          osc.connect(gain);
          gain.connect(compressor);
          osc.start(ctx.currentTime + times[idx]);
          osc.stop(ctx.currentTime + times[idx] + lens[idx]);
        });
      } else if (type === "siren") {
        // 집중! 사이렌 경보음
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.3);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.6);
        osc.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.9);

        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(compressor);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
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

  const resetAllStickers = () => {
    if (!confirm("모든 학생의 칭찬 스티커를 0개로 초기화할까요?")) return;
    setStudents(prev => prev.map(s => ({ ...s, stickers: 0 })));
  };

  return (
    <div className="space-y-6">
      {/* 1. 수업용 효과음 사운드 보드 */}
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-[#1B4332] text-lg flex items-center gap-2">
          <span>🔔</span> 수업용 효과음 보드
        </h2>
        <p className="text-xs text-[#64748B]">수업 집중, 퀴즈 정답/오답 및 활동 시작 시 버튼을 눌러 효과음을 재생하세요. (크고 또렷하게 출력됩니다)</p>

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
            <span className="text-xs">박수와 환호</span>
          </button>
          <button
            onClick={() => playSound("drum")}
            className="p-4 bg-[#FAF5FF] border border-[#D8B4FE] rounded-xl font-bold text-[#6B21A8] hover:bg-[#F3E8FF] transition-all flex flex-col items-center gap-2 shadow-sm active:scale-95"
          >
            <span className="text-3xl">🥁</span>
            <span className="text-xs">두구두구 (드럼롤)</span>
          </button>
          <button
            onClick={() => playSound("fanfare")}
            className="p-4 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl font-bold text-[#BE123C] hover:bg-[#FFE4E6] transition-all flex flex-col items-center gap-2 shadow-sm active:scale-95"
          >
            <span className="text-3xl">🎺</span>
            <span className="text-xs">축하 팡파레</span>
          </button>
          <button
            onClick={() => playSound("countdown")}
            className="p-4 bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl font-bold text-[#C2410C] hover:bg-[#FFEDD5] transition-all flex flex-col items-center gap-2 shadow-sm active:scale-95"
          >
            <span className="text-3xl">⏱️</span>
            <span className="text-xs">카운트다운 비프</span>
          </button>
          <button
            onClick={() => playSound("siren")}
            className="p-4 bg-[#FEF2F2] border border-[#F87171] rounded-xl font-bold text-[#B91C1C] hover:bg-[#FEE2E2] transition-all flex flex-col items-center gap-2 shadow-sm active:scale-95"
          >
            <span className="text-3xl">🚨</span>
            <span className="text-xs">집중! 사이렌</span>
          </button>
        </div>
      </div>

      {/* 2. 칭찬 스티커 도장판 */}
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-bold text-[#1B4332] text-lg flex items-center gap-2">
              <span>💮</span> 참 잘했어요! 칭찬 스티커판
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">학생들의 적극적인 발표와 활동 참여에 칭찬 도장을 찍어주세요.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {isLoggedIn && onOpenClassPanel && (
              <button
                onClick={onOpenClassPanel}
                className="flex items-center gap-1 text-xs text-[#1B4332] font-semibold bg-[#F0FFF4] border border-[#9AE6B4] px-2.5 py-1.5 rounded-lg hover:bg-[#D4EDDA] transition-colors"
              >
                <span>👥</span> 반 불러오기
              </button>
            )}
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addStudent()}
              placeholder="학생 이름 직접 추가"
              className="border border-[#CBD5E1] p-1.5 rounded-lg text-xs"
            />
            <button onClick={addStudent} className="px-3 py-1.5 bg-[#1B4332] text-white font-bold rounded-lg hover:bg-[#2D6A4F]">
              추가
            </button>
            {students.length > 0 && (
              <button onClick={resetAllStickers} className="px-2.5 py-1.5 border border-[#E2E8F0] text-[#64748B] hover:text-[#DC2626] font-semibold rounded-lg">
                도장 초기화
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {students.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#94A3B8] bg-slate-50 rounded-xl border border-dashed border-slate-200">
              상단의 [👥 반 불러오기]를 누르거나 학생 이름을 직접 추가해주세요.
            </div>
          ) : (
            students.map((s, idx) => (
              <div key={idx} className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2 bg-[#F8FAFC] hover:bg-white transition-colors">
                <span className="font-bold text-sm text-[#0F172A] w-28 truncate">{s.name}</span>
                <div className="flex-1 flex flex-wrap gap-1.5 items-center min-h-[32px]">
                  {Array.from({ length: s.stickers }).map((_, i) => (
                    <span key={i} className="text-xl animate-bounce" title="칭찬 스티커">💮</span>
                  ))}
                  {s.stickers === 0 && <span className="text-xs text-[#94A3B8]">스티커 없음</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#1B4332] mr-1">{s.stickers}개</span>
                  <button onClick={() => removeSticker(idx)} className="w-7 h-7 border bg-white rounded-lg font-bold text-xs hover:bg-slate-100 flex items-center justify-center">
                    -
                  </button>
                  <button onClick={() => addSticker(idx)} className="px-3 h-7 bg-[#1B4332] text-white rounded-lg font-bold text-xs hover:bg-[#2D6A4F] flex items-center gap-1 shadow-sm">
                    + 도장
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
