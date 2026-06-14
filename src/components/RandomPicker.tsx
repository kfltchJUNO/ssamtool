"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const COLORS = [
  "#1B4332", "#2D6A4F", "#276749", "#22543D",
  "#C53030", "#9B2C2C", "#B7791F", "#744210",
  "#2B6CB0", "#1A365D", "#6B46C1", "#44337A",
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + (hash << 5) - hash;
  return COLORS[Math.abs(hash) % COLORS.length];
}

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const color = getColor(name);
  const initial = name[0] || "?";
  return (
    <div
      style={{
        width: size, height: size,
        background: color,
        color: "white",
        fontSize: size * 0.4,
        fontWeight: 700,
        borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {initial}
    </div>
  );
}

export default function RandomPicker() {
  const [namesInput, setNamesInput] = useState("");
  const [nameList, setNameList] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [rolling, setRolling] = useState(false);
  const [excludePicked, setExcludePicked] = useState(true);
  const [pickCount, setPickCount] = useState(1);
  const rollRef = useRef<NodeJS.Timeout | null>(null);

  const pool = excludePicked
    ? nameList.filter((n) => !picked.includes(n))
    : nameList;

  const applyNames = useCallback(() => {
    const lines = namesInput
      .split(/[\n,，、]/)
      .map((s) => s.trim())
      .filter(Boolean);
    setNameList(lines);
    setPicked([]);
    setCurrent("");
  }, [namesInput]);

  useEffect(() => {
    // Load nothing on mount; user clicks "목록 적용" explicitly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickRandom = useCallback(() => {
    if (pool.length === 0) return;
    if (rolling) return;

    setRolling(true);
    setCurrent("");

    let ticks = 0;
    const maxTicks = 20 + Math.floor(Math.random() * 15);

    const tick = () => {
      ticks++;
      const rand = pool[Math.floor(Math.random() * pool.length)];
      setCurrent(rand);

      const delay = ticks < maxTicks * 0.6
        ? 60
        : ticks < maxTicks * 0.85
        ? 100
        : ticks < maxTicks
        ? 180
        : 0;

      if (ticks < maxTicks) {
        rollRef.current = setTimeout(tick, delay);
      } else {
        // Final pick
        const finalPicked: string[] = [];
        const available = [...pool];

        const count = Math.min(pickCount, available.length);
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * available.length);
          finalPicked.push(available[idx]);
          available.splice(idx, 1);
        }

        setCurrent(finalPicked.join(", "));
        setPicked((prev) => [...prev, ...finalPicked]);
        setRolling(false);
      }
    };

    tick();
  }, [pool, rolling, pickCount]);

  const reset = () => {
    setPicked([]);
    setCurrent("");
    setRolling(false);
    if (rollRef.current) clearTimeout(rollRef.current);
  };

  const EXAMPLE = "김유진\n이서준\n박민서\n최지우\n정하은\n강민준\n윤서연\n임채원\n한지호\n오수아";

  return (
    <div className="space-y-5">
      {/* Input */}
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-[#1B4332] text-lg">랜덤 뽑기</h2>
          <button
            onClick={() => { setNamesInput(EXAMPLE); }}
            className="text-xs text-[#2D6A4F] underline underline-offset-2 hover:text-[#1B4332]"
          >
            예시 불러오기
          </button>
        </div>

        <div className="flex gap-3">
          <textarea
            value={namesInput}
            onChange={(e) => setNamesInput(e.target.value)}
            placeholder={"이름 목록 (줄바꿈 또는 쉼표로 구분)\n\n예) 김유진\n이서준\n박민서"}
            className="flex-1 h-32 border border-[#E8E0D0] rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
          />
          <div className="flex flex-col gap-2 justify-end">
            <button
              onClick={applyNames}
              className="px-4 py-2 bg-[#1B4332] text-white text-sm font-semibold rounded-lg hover:bg-[#2D6A4F] transition-colors"
            >
              목록 적용
            </button>
            <p className="text-xs text-[#9A9A9A] text-center">
              {nameList.length}명
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={excludePicked}
              onChange={(e) => setExcludePicked(e.target.checked)}
              className="accent-[#1B4332]"
            />
            <span className="text-sm text-[#4A4A4A]">이미 뽑힌 학생 제외</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#4A4A4A]">뽑을 수:</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, pool.length)}
              value={pickCount}
              onChange={(e) => setPickCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 border border-[#E8E0D0] rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-[#1B4332]"
            />
            <span className="text-sm text-[#4A4A4A]">명</span>
          </div>
        </div>
      </div>

      {/* Picker display */}
      <div className="bg-white rounded-xl border border-[#E8E0D0] shadow-sm overflow-hidden">
        {/* Big result */}
        <div
          className="chalk-header flex flex-col items-center justify-center py-10 px-4 cursor-pointer select-none"
          onClick={!rolling && pool.length > 0 ? pickRandom : undefined}
          style={{ minHeight: 200 }}
        >
          {nameList.length === 0 ? (
            <p className="text-[#A8D5B7] text-sm">위에서 이름 목록을 입력하세요</p>
          ) : pool.length === 0 && !current ? (
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="chalk-text font-bold text-lg">모두 뽑혔습니다!</p>
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="mt-3 px-5 py-2 bg-[#F2C94C] text-[#1B4332] text-sm font-bold rounded-lg hover:bg-[#EAB800]"
              >
                다시 시작
              </button>
            </div>
          ) : current ? (
            <div className={`text-center ${rolling ? "rolling" : "pop-in"}`}>
              <div
                style={{ fontSize: current.includes(",") ? "2rem" : "3.5rem" }}
                className="chalk-text font-black"
              >
                {current}
              </div>
              {!rolling && (
                <p className="text-[#A8D5B7] text-sm mt-2">클릭해서 다시 뽑기</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-5xl mb-3 animate-bounce">🎲</div>
              <p className="chalk-text font-bold text-lg">클릭해서 뽑기!</p>
              <p className="text-[#A8D5B7] text-sm mt-1">{pool.length}명 중에서</p>
            </div>
          )}
        </div>

        {/* Picked list */}
        {picked.length > 0 && (
          <div className="p-4 border-t border-[#E8E0D0]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-[#4A4A4A]">뽑힌 학생 ({picked.length}명)</p>
              <button
                onClick={reset}
                className="text-xs text-[#9A9A9A] underline underline-offset-2 hover:text-[#C53030]"
              >
                초기화
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {picked.map((name, i) => (
                <div
                  key={`${name}-${i}`}
                  className="flex items-center gap-1.5 bg-[#F5F0E8] rounded-full px-3 py-1"
                >
                  <Avatar name={name} size={22} />
                  <span className="text-sm font-medium text-[#1B4332]">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Remaining list */}
      {nameList.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E0D0] p-4 shadow-sm">
          <p className="text-xs font-semibold text-[#4A4A4A] mb-3">
            남은 학생 ({pool.length}/{nameList.length}명)
          </p>
          <div className="flex flex-wrap gap-2">
            {nameList.map((name, i) => {
              const isPicked = picked.includes(name);
              return (
                <div
                  key={`list-${name}-${i}`}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-all ${
                    isPicked
                      ? "bg-[#E8E0D0] opacity-40 line-through"
                      : "bg-[#F0FFF4] border border-[#9AE6B4]"
                  }`}
                >
                  {!isPicked && <Avatar name={name} size={22} />}
                  <span className={`text-sm ${isPicked ? "text-[#9A9A9A]" : "text-[#22543D] font-medium"}`}>
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
