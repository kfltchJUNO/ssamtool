"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import GateBanner from "@/components/GateBanner";

// ── 등급 ──────────────────────────────────────────────────────────
type UserGrade = "guest" | "free" | "chalk";

// ── 글씨체 ────────────────────────────────────────────────────────
const FONTS_GUEST  = [{ id: "noto",    label: "기본체",     css: "'Noto Sans KR', sans-serif" }];
const FONTS_FREE   = [
  { id: "noto",   label: "기본체",   css: "'Noto Sans KR', sans-serif" },
  { id: "gothic", label: "고딕체",   css: "'Nanum Gothic', sans-serif" },
];
const FONTS_CHALK  = [
  { id: "noto",     label: "기본체",     css: "'Noto Sans KR', sans-serif" },
  { id: "gothic",   label: "고딕체",     css: "'Nanum Gothic', sans-serif" },
  { id: "myeongjo", label: "명조체",     css: "'Nanum Myeongjo', serif" },
  { id: "pen",      label: "펜글씨체",   css: "'Nanum Pen Script', cursive" },
  { id: "brush",    label: "붓글씨체",   css: "'Nanum Brush Script', cursive" },
  { id: "square",   label: "네모고딕",   css: "'Nanum Square', sans-serif" },
  { id: "gmarket",  label: "지마켓Sans", css: "'GmarketSans', sans-serif" },
  { id: "black",    label: "검정고딕",   css: "'Black Han Sans', sans-serif" },
  { id: "jua",      label: "주아체",     css: "'Jua', sans-serif" },
  { id: "gaegu",    label: "개구체",     css: "'Gaegu', cursive" },
];

// ── 이모지 ────────────────────────────────────────────────────────
const EMOJI_SETS = [
  { id: "spring", label: "봄",  icon: "🌸", emojis: ["🌸","🌷","🌺","🌼","🦋","🌱","🍀","🌿"] },
  { id: "summer", label: "여름", icon: "🌊", emojis: ["🌊","🐚","🐠","🦀","🍉","🌴","☀️","🏖️"] },
  { id: "autumn", label: "가을", icon: "🍁", emojis: ["🍁","🍂","🎃","🌰","🍄","🦊","🌾","🍎"] },
  { id: "winter", label: "겨울", icon: "⛄", emojis: ["⛄","❄️","🧣","🎿","🏔️","🦌","🕯️","⭐"] },
];

type EmojiMode = "none" | "smile" | "set" | "random";

interface NameEntry { id: string; name: string; emoji: string; }

const PRESET = ["김유진","이서준","박민서","최지우","정하은","강민준","윤서연","임채원","한지호","오수아"];

function randomFrom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const GFONT = "https://fonts.googleapis.com/css2?family=Nanum+Gothic&family=Nanum+Myeongjo&family=Nanum+Pen+Script&family=Nanum+Brush+Script&family=Nanum+Square&family=Black+Han+Sans&family=Jua&family=Gaegu&display=swap";

interface NameTagProps {
  preloadedStudents?: string[];
  preloadedLabel?: string;
  onOpenClassPanel?: () => void;
  isLoggedIn?: boolean;
}

export default function NameTagGenerator({ preloadedStudents = [], preloadedLabel = "", onOpenClassPanel, isLoggedIn }: NameTagProps) {
  const { user } = useAuth();
  const isGuest = !user;
  const [grade,      setGrade]      = useState<UserGrade>("guest");
  const [namesInput, setNamesInput] = useState("");
  const [entries,    setEntries]    = useState<NameEntry[]>([]);
  const [fontId,     setFontId]     = useState("noto");
  const [emojiMode,  setEmojiMode]  = useState<EmojiMode>("none");
  const [activeSet,  setActiveSet]  = useState("spring");
  const [showPreview,setShowPreview]= useState(false);
  const [orientation, setOrientation] = useState<Orientation>("portrait");

  // 외부에서 반 불러오기
  useEffect(() => {
    if (preloadedStudents.length > 0) {
      setNamesInput(preloadedStudents.join("\n"));
    }
  }, [preloadedStudents]);

  const fonts      = grade === "chalk" ? FONTS_CHALK : grade === "free" ? FONTS_FREE : FONTS_GUEST;
  const currentFont= [...FONTS_CHALK].find(f => f.id === fontId) || FONTS_CHALK[0];
  const currentSet = EMOJI_SETS.find(s => s.id === activeSet) || EMOJI_SETS[0];

  const handleGradeChange = (g: UserGrade) => {
    setGrade(g);
    if (g === "guest") { setFontId("noto"); setEmojiMode("none"); }
    else if (g === "free") { setEmojiMode("smile"); if (!["noto","gothic"].includes(fontId)) setFontId("noto"); }
  };

  const resolveEmoji = useCallback((mode: EmojiMode): string => {
    if (mode === "none")   return "";
    if (mode === "smile")  return "😊";
    return randomFrom(currentSet.emojis);
  }, [currentSet]);

  const generate = useCallback(() => {
    const lines = namesInput.split(/[\n,，、]/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
    setEntries(lines.map((name, i) => ({ id: `e-${i}-${Date.now()}`, name, emoji: resolveEmoji(emojiMode) })));
    setShowPreview(true);
  }, [namesInput, emojiMode, resolveEmoji]);

  const reshuffleEmoji = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, emoji: resolveEmoji(emojiMode) } : e));
  };

  return (
    <>
      <link rel="stylesheet" href={GFONT} />

      <div className="space-y-5">
        {/* 등급 시뮬레이터 */}
        <div className="bg-[#FFFBEA] border border-[#F2C94C] rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-[#92630A]">🧪 MVP 등급 미리보기</span>
          {(["guest","free","chalk"] as UserGrade[]).map(g => (
            <button key={g} onClick={() => handleGradeChange(g)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${grade === g ? "bg-[#1B4332] text-white" : "bg-white text-[#4A4A4A] border border-[#E8E0D0] hover:border-[#1B4332]"}`}>
              {g === "guest" ? "비로그인" : g === "free" ? "무료 로그인" : "분필 사용 (1개)"}
            </button>
          ))}
        </div>

        {/* 입력 패널 */}
        <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#1B4332] text-lg">이름표 생성기</h2>
            <div className="flex items-center gap-3">
              {isLoggedIn && onOpenClassPanel && (
                <button onClick={onOpenClassPanel} className="flex items-center gap-1 text-xs text-[#1B4332] font-semibold bg-[#F0FFF4] border border-[#9AE6B4] px-2.5 py-1 rounded-lg hover:bg-[#D4EDDA] transition-colors">
                  👥 반 불러오기
                </button>
              )}
              <button onClick={() => setNamesInput(PRESET.join("\n"))} className="text-xs text-[#2D6A4F] underline underline-offset-2">예시</button>
            </div>
          </div>

          {preloadedLabel && (
            <div className="text-xs text-[#2D6A4F] bg-[#F0FFF4] px-3 py-1.5 rounded-lg border border-[#9AE6B4]">
              ✅ {preloadedLabel} · {preloadedStudents.length}명
            </div>
          )}

          <textarea value={namesInput} onChange={e => setNamesInput(e.target.value)}
            placeholder={"이름 입력 (줄바꿈 또는 쉼표 구분)\n\n예) 김유진\n이서준\n박민서"}
            className="w-full h-36 border border-[#E8E0D0] rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]" />

          {/* 글씨체 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-[#4A4A4A]">글씨체</p>
              {grade === "guest" && <span className="text-[10px] bg-[#E8E0D0] text-[#6A6A6A] px-2 py-0.5 rounded-full">로그인 시 선택 가능</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {fonts.map(f => (
                <button key={f.id} onClick={() => grade !== "guest" && setFontId(f.id)}
                  disabled={grade === "guest"}
                  style={{ fontFamily: f.css }}
                  className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-all ${fontId === f.id ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332] font-bold" : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332] disabled:opacity-50 disabled:cursor-not-allowed"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 이모지 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-[#4A4A4A]">이모지</p>
              {grade === "guest" && <span className="text-[10px] bg-[#E8E0D0] text-[#6A6A6A] px-2 py-0.5 rounded-full">로그인 시 사용 가능</span>}
              {grade === "free"  && <span className="text-[10px] bg-[#EBF8FF] text-[#2B6CB0] px-2 py-0.5 rounded-full">😊 고정</span>}
            </div>
            {grade === "free" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={emojiMode !== "none"} onChange={e => setEmojiMode(e.target.checked ? "smile" : "none")} className="accent-[#1B4332]" />
                <span className="text-sm text-[#4A4A4A]">😊 스마일 이모지 추가</span>
              </label>
            )}
            {grade === "chalk" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {([{ v:"none",label:"없음" },{ v:"random",label:"🎲 랜덤" }] as {v:EmojiMode;label:string}[]).map(({v,label}) => (
                    <button key={v} onClick={() => setEmojiMode(v)}
                      className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-all ${emojiMode === v ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332] font-semibold" : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"}`}>
                      {label}
                    </button>
                  ))}
                  {EMOJI_SETS.map(s => (
                    <button key={s.id} onClick={() => { setEmojiMode("set"); setActiveSet(s.id); }}
                      className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-all ${emojiMode === "set" && activeSet === s.id ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332] font-semibold" : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"}`}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
                {(emojiMode === "set" || emojiMode === "random") && (
                  <div className="flex flex-wrap gap-2 p-3 bg-[#F9F9F9] rounded-lg">
                    {currentSet.emojis.map(em => <span key={em} className="text-2xl">{em}</span>)}
                    <span className="text-xs text-[#9A9A9A] self-center ml-1">이름별 랜덤 배정</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={generate} disabled={!namesInput.trim()}
            className="w-full py-3 bg-[#1B4332] text-[#F5F0E8] font-bold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            이름표 만들기
          </button>
        </div>

        {/* 미리보기 */}
        {showPreview && entries.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-[#1B4332]">미리보기</h3>
                <p className="text-xs text-[#9A9A9A] mt-0.5">
                  {entries.length}개 ·
                  {orientation === "portrait" ? " A4 세로 1장 = 1개" : " A4 가로 1장 = 2개"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* 방향 선택 */}
                <div className="flex rounded-lg border border-[#E8E0D0] overflow-hidden">
                  <button onClick={() => setOrientation("portrait")}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${orientation === "portrait" ? "bg-[#1B4332] text-white" : "text-[#4A4A4A] hover:bg-[#F5F0E8]"}`}>
                    세로형
                  </button>
                  <button onClick={() => setOrientation("landscape")}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${orientation === "landscape" ? "bg-[#1B4332] text-white" : "text-[#4A4A4A] hover:bg-[#F5F0E8]"}`}>
                    가로형
                  </button>
                </div>
                {isGuest ? (
                  <GateBanner
                    reason="login"
                    message="인쇄는 로그인 후 사용할 수 있어요."
                    onLogin={() => document.dispatchEvent(new CustomEvent("ssamtool:openLogin"))}
                  />
                ) : (
                  <button onClick={() => printEntries(entries, currentFont.css, orientation)}
                    className="px-4 py-2 bg-[#F2C94C] text-[#1B4332] text-sm font-bold rounded-lg hover:bg-[#EAB800] transition-colors">
                    🖨️ 전체 인쇄
                  </button>
                )}
              </div>
            </div>

            {/* 화면용 미리보기 카드 목록 */}
            <div className="space-y-4">
              {entries.map(entry => (
                <ScreenCard key={entry.id} entry={entry} fontCss={currentFont.css}
                  orientation={orientation}
                  onReshuffle={(emojiMode === "set" || emojiMode === "random") ? () => reshuffleEmoji(entry.id) : undefined}
                  onPrint={isGuest ? undefined : () => printEntries([entry], currentFont.css, orientation)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── 방향 선택 UI용 타입 ──────────────────────────────────────────
type Orientation = "portrait" | "landscape";

// ── 화면 미리보기 카드 ────────────────────────────────────────────
function ScreenCard({ entry, fontCss, onReshuffle, onPrint, orientation }: {
  entry: NameEntry; fontCss: string; onReshuffle?: () => void; onPrint?: () => void; orientation: Orientation;
}) {
  return (
    <div className="border border-[#E8E0D0] rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#E8E0D0] bg-[#FAFAFA]">
        <span className="text-xs font-semibold text-[#9A9A9A]">이름표 — {entry.name}</span>
        <div className="flex items-center gap-2">
          {onReshuffle && (
            <button onClick={onReshuffle} className="text-xs text-[#2D6A4F] underline underline-offset-2">이모지 재배정</button>
          )}
          {onPrint && (
            <button onClick={onPrint}
              className="px-2.5 py-1 bg-[#F2C94C] text-[#1B4332] text-[11px] font-bold rounded-lg hover:bg-[#EAB800] transition-colors">
              🖨️ 개별 인쇄
            </button>
          )}
        </div>
      </div>

      {orientation === "portrait" ? (
        /* 세로형 미리보기: 위→아래 순서로 패널 */
        <div className="flex flex-col items-center py-3 gap-0" style={{ fontFamily: fontCss }}>
          {/* 앞면 (180도) */}
          <div className="flex items-center justify-center bg-white w-52 h-20" style={{ transform: "rotate(180deg)" }}>
            <div className="flex flex-col items-center gap-0.5">
              {entry.emoji && <span style={{ fontSize: 16 }}>{entry.emoji}</span>}
              <span style={{ fontSize: 20, fontWeight: 900, color: "#111" }}>{entry.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 w-52"><div className="flex-1 border-t border-dashed border-gray-300"/><span className="text-[8px] text-gray-300">안쪽 접기</span></div>
          <div className="flex items-center justify-center bg-[#FAFAFA] w-52 h-20">
            <span style={{ fontSize: 18, fontWeight: 700, color: "#555" }}>{entry.name}</span>
          </div>
          <div className="flex items-center gap-1 w-52"><div className="flex-1 border-t border-dashed border-gray-300"/><span className="text-[8px] text-gray-300">바깥 접기</span></div>
          <div className="flex items-center justify-center bg-[#F5F5F5] w-52 h-6">
            <span className="text-[7px] text-gray-300">SSAMTOOL</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">A4 세로 1장 = 이름표 1개</p>
        </div>
      ) : (
        /* 가로형 미리보기: 좌→우 순서로 패널 */
        <div className="flex flex-row items-center py-3 px-3 gap-0 overflow-x-auto" style={{ fontFamily: fontCss }}>
          {/* 앞면 (180도) */}
          <div className="flex items-center justify-center bg-white flex-shrink-0 h-20 w-36" style={{ transform: "rotate(180deg)" }}>
            <div className="flex flex-col items-center gap-0.5">
              {entry.emoji && <span style={{ fontSize: 14 }}>{entry.emoji}</span>}
              <span style={{ fontSize: 18, fontWeight: 900, color: "#111" }}>{entry.name}</span>
            </div>
          </div>
          <div className="flex flex-col h-20 items-center justify-center flex-shrink-0 w-5">
            <div className="h-full border-l border-dashed border-gray-300"/>
            <span className="text-[7px] text-gray-300" style={{ writingMode: "vertical-rl" }}>안쪽</span>
          </div>
          <div className="flex items-center justify-center bg-[#FAFAFA] flex-shrink-0 h-20 w-36">
            <span style={{ fontSize: 16, fontWeight: 700, color: "#555" }}>{entry.name}</span>
          </div>
          <div className="flex flex-col h-20 items-center justify-center flex-shrink-0 w-5">
            <div className="h-full border-l border-dashed border-gray-300"/>
            <span className="text-[7px] text-gray-300" style={{ writingMode: "vertical-rl" }}>바깥</span>
          </div>
          <div className="flex items-center justify-center bg-[#F5F5F5] flex-shrink-0 h-20 w-7">
            <span className="text-[7px] text-gray-300" style={{ writingMode: "vertical-rl" }}>SSAMTOOL</span>
          </div>
          <p className="text-[10px] text-gray-400 ml-3 whitespace-nowrap">A4 가로 1장에 2개</p>
        </div>
      )}
    </div>
  );
}

// ── 인쇄: 세로형 ─────────────────────────────────────────────────
// A4 세로 (210×297mm), 여백 10mm
// 앞면 120mm / 뒷면 120mm / 지지대 25mm = 265mm (세로 배치)
function buildPortraitHTML(entry: NameEntry, fontCss: string): string {
  const emojiBlock = entry.emoji
    ? `<div style="font-size:52px;line-height:1;margin-bottom:8px;">${entry.emoji}</div>` : "";
  return `
    <div style="width:190mm;page-break-after:always;break-after:page;font-family:${fontCss};">
      <!-- 앞면 120mm (180도 회전) -->
      <div style="width:190mm;height:120mm;box-sizing:border-box;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:10px;transform:rotate(180deg);">
        ${emojiBlock}
        <div style="font-size:68px;font-weight:900;color:#111;letter-spacing:0.06em;
          line-height:1.1;text-align:center;word-break:keep-all;">${entry.name}</div>
      </div>
      <!-- 접는선 1 -->
      <div style="width:190mm;height:0;border-top:1.5px dashed #AAAAAA;position:relative;">
        <span style="position:absolute;right:0;top:3px;font-size:7px;color:#BBBBBB;">안쪽 접기</span>
      </div>
      <!-- 뒷면 120mm -->
      <div style="width:190mm;height:120mm;box-sizing:border-box;display:flex;
        align-items:center;justify-content:center;">
        <div style="font-size:44px;font-weight:700;color:#333;letter-spacing:0.06em;text-align:center;">
          ${entry.name}</div>
      </div>
      <!-- 접는선 2 -->
      <div style="width:190mm;height:0;border-top:1.5px dashed #AAAAAA;position:relative;">
        <span style="position:absolute;right:0;top:3px;font-size:7px;color:#BBBBBB;">바깥 접기</span>
      </div>
      <!-- 지지대 25mm -->
      <div style="width:190mm;height:25mm;box-sizing:border-box;display:flex;
        align-items:center;justify-content:center;">
        <span style="font-size:8px;color:#CCCCCC;letter-spacing:2px;">SSAMTOOL</span>
      </div>
    </div>`;
}

// ── 인쇄: 가로형 ─────────────────────────────────────────────────
// A4 가로 (297×210mm), 여백 10mm
// 1장에 2개, 좌우로 분할 (각 이름표 너비 ~130mm)
// 이름표 구조: 앞면|접선|뒷면|접선|지지대 (세로 배치, 가로로 펼침)
// 앞면 80mm / 뒷면 80mm / 지지대 20mm = 180mm < A4가로 사용폭 277mm
// 이름표 높이 = 190mm (A4가로 세로 사용폭)
function buildLandscapeHTML(entry: NameEntry, fontCss: string): string {
  const emojiBlock = entry.emoji
    ? `<div style="font-size:40px;line-height:1;margin-bottom:6px;">${entry.emoji}</div>` : "";
  return `
    <div style="
      display:inline-flex;flex-direction:column;
      width:130mm;height:190mm;
      font-family:${fontCss};
      vertical-align:top;
    ">
      <!-- 앞면 80mm (180도 회전) -->
      <div style="width:130mm;height:80mm;box-sizing:border-box;
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
        transform:rotate(180deg);">
        ${emojiBlock}
        <div style="font-size:48px;font-weight:900;color:#111;letter-spacing:0.06em;
          line-height:1.1;text-align:center;word-break:keep-all;">${entry.name}</div>
      </div>
      <!-- 접는선 1 -->
      <div style="width:130mm;height:0;border-top:1.5px dashed #AAAAAA;position:relative;">
        <span style="position:absolute;right:0;top:3px;font-size:7px;color:#BBBBBB;">안쪽 접기</span>
      </div>
      <!-- 뒷면 80mm -->
      <div style="width:130mm;height:80mm;box-sizing:border-box;
        display:flex;align-items:center;justify-content:center;">
        <div style="font-size:36px;font-weight:700;color:#333;letter-spacing:0.06em;text-align:center;">
          ${entry.name}</div>
      </div>
      <!-- 접는선 2 -->
      <div style="width:130mm;height:0;border-top:1.5px dashed #AAAAAA;position:relative;">
        <span style="position:absolute;right:0;top:3px;font-size:7px;color:#BBBBBB;">바깥 접기</span>
      </div>
      <!-- 지지대 20mm -->
      <div style="width:130mm;height:20mm;box-sizing:border-box;
        display:flex;align-items:center;justify-content:center;">
        <span style="font-size:7px;color:#CCCCCC;letter-spacing:2px;">SSAMTOOL</span>
      </div>
    </div>`;
}

function printEntries(entries: NameEntry[], fontCss: string, orientation: Orientation) {
  if (!entries.length) return;

  let bodyHTML = "";

  if (orientation === "portrait") {
    // 세로형: 1장 1개
    bodyHTML = entries.map(e => buildPortraitHTML(e, fontCss)).join("");
  } else {
    // 가로형: 1장 2개, 좌우 나란히
    const pages: NameEntry[][] = [];
    for (let i = 0; i < entries.length; i += 2) pages.push(entries.slice(i, i + 2));
    bodyHTML = pages.map((page, pi) => `
      <div style="
        page-break-after:${pi < pages.length - 1 ? "always" : "auto"};
        break-after:${pi < pages.length - 1 ? "page" : "auto"};
        padding:10mm;
        display:flex;gap:17mm;align-items:flex-start;
      ">
        ${page.map(e => buildLandscapeHTML(e, fontCss)).join(`
          <div style="width:0;height:190mm;border-left:1px dashed #E0E0E0;position:relative;">
            <span style="position:absolute;top:2px;left:3px;font-size:7px;color:#CCCCCC;">✂ 자르기</span>
          </div>`)}
      </div>`).join("");
  }

  const pageSize = orientation === "portrait" ? "A4 portrait" : "A4 landscape";
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
  <style>
    @page { size: ${pageSize}; margin: ${orientation === "portrait" ? "10mm" : "0"}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Noto Sans KR', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&family=Nanum+Gothic&family=Nanum+Myeongjo&family=Nanum+Pen+Script&family=Nanum+Brush+Script&family=Nanum+Square&family=Black+Han+Sans&family=Jua&family=Gaegu&display=swap">
  </head><body>${bodyHTML}
  <script>document.fonts.ready.then(()=>setTimeout(()=>{window.print();window.close();},300));</script>
  </body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open(); doc.write(html); doc.close();
  iframe.contentWindow?.addEventListener("afterprint", () => document.body.removeChild(iframe));
}