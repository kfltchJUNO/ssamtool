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
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-[#1B4332]">미리보기</h3>
                <p className="text-xs text-[#9A9A9A] mt-0.5">{entries.length}개 · A4 가로 1장에 2개 · 개별 인쇄 가능</p>
              </div>
              {isGuest ? (
                <GateBanner
                  reason="login"
                  message="인쇄는 로그인 후 사용할 수 있어요."
                  onLogin={() => document.dispatchEvent(new CustomEvent("ssamtool:openLogin"))}
                />
              ) : (
                <button onClick={() => printEntries(entries, currentFont.css)}
                  className="px-4 py-2 bg-[#F2C94C] text-[#1B4332] text-sm font-bold rounded-lg hover:bg-[#EAB800] transition-colors">
                  🖨️ 전체 인쇄
                </button>
              )}
            </div>

            {/* 화면용 미리보기 카드 목록 */}
            <div className="space-y-4">
              {entries.map(entry => (
                <ScreenCard key={entry.id} entry={entry} fontCss={currentFont.css}
                  onReshuffle={(emojiMode === "set" || emojiMode === "random") ? () => reshuffleEmoji(entry.id) : undefined}
                  onPrint={isGuest ? undefined : () => printEntries([entry], currentFont.css)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── 화면 미리보기 카드 ────────────────────────────────────────────
function ScreenCard({ entry, fontCss, onReshuffle, onPrint }: {
  entry: NameEntry; fontCss: string; onReshuffle?: () => void; onPrint?: () => void;
}) {
  return (
    <div className="border border-[#E8E0D0] rounded-xl overflow-hidden bg-white">
      {/* 헤더 */}
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

      {/* 가로 방향 미리보기 */}
      <div className="flex flex-row items-stretch py-3 gap-0 overflow-x-auto" style={{ fontFamily: fontCss }}>

        {/* 앞면 (180도 회전) */}
        <div className="flex items-center justify-center bg-white flex-shrink-0"
          style={{ width: 160, height: 80, transform: "rotate(180deg)" }}>
          <div className="flex flex-col items-center gap-0.5">
            {entry.emoji && <span style={{ fontSize: 18 }}>{entry.emoji}</span>}
            <span style={{ fontSize: 22, fontWeight: 900, color: "#111", letterSpacing: "0.04em" }}>
              {entry.name}
            </span>
          </div>
        </div>

        {/* 접는선 1 */}
        <div className="flex flex-col items-center justify-center flex-shrink-0" style={{ width: 24 }}>
          <div className="h-full border-l border-dashed border-gray-300" />
          <span className="text-[8px] text-gray-300" style={{ writingMode: "vertical-rl" }}>안쪽</span>
        </div>

        {/* 뒷면 */}
        <div className="flex items-center justify-center bg-[#FAFAFA] flex-shrink-0"
          style={{ width: 160, height: 80 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#555", letterSpacing: "0.04em" }}>
            {entry.name}
          </span>
        </div>

        {/* 접는선 2 */}
        <div className="flex flex-col items-center justify-center flex-shrink-0" style={{ width: 24 }}>
          <div className="h-full border-l border-dashed border-gray-300" />
          <span className="text-[8px] text-gray-300" style={{ writingMode: "vertical-rl" }}>바깥</span>
        </div>

        {/* 지지대 */}
        <div className="flex items-center justify-center bg-[#F5F5F5] flex-shrink-0"
          style={{ width: 28, height: 80 }}>
          <span className="text-[7px] text-gray-300" style={{ writingMode: "vertical-rl" }}>SSAMTOOL</span>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-1 text-center">A4 가로 1장에 2개 · 세로 접는선을 접으면 가로 명패 완성</p>
    </div>
  );
}

// ── iframe 인쇄 함수 ─────────────────────────────────────────────
// A4 가로: 한 장에 이름표 2개 (위/아래)
// 각 이름표: 앞면(120mm) | 뒷면(120mm) | 지지대(25mm) 가로 배치
// 이름표 높이: (210mm - 여백20mm) / 2 = 95mm
function buildCardHTML(entry: NameEntry, fontCss: string): string {
  const emojiBlock = entry.emoji
    ? `<div style="font-size:36px;line-height:1;margin-bottom:6px;">${entry.emoji}</div>`
    : "";

  return `
    <div style="
      display:flex; flex-direction:row;
      width:265mm; height:85mm;
      font-family:${fontCss};
      break-inside:avoid;
    ">
      <!-- 앞면 120mm (180도 회전) -->
      <div style="
        width:120mm; height:85mm; box-sizing:border-box;
        display:flex; flex-direction:column;
        align-items:center; justify-content:center; gap:6px;
        transform:rotate(180deg);
        flex-shrink:0;
      ">
        ${emojiBlock}
        <div style="
          font-size:52px; font-weight:900; color:#111;
          letter-spacing:0.06em; line-height:1.1;
          text-align:center; word-break:keep-all;
        ">${entry.name}</div>
      </div>

      <!-- 접는선 1: 안쪽 접기 (세로선) -->
      <div style="width:0; height:85mm; border-left:1.5px dashed #AAAAAA; position:relative; flex-shrink:0;">
        <span style="position:absolute;bottom:2px;left:3px;font-size:7px;color:#BBBBBB;writing-mode:vertical-rl;">안쪽 접기</span>
      </div>

      <!-- 뒷면 120mm -->
      <div style="
        width:120mm; height:85mm; box-sizing:border-box;
        display:flex; align-items:center; justify-content:center;
        flex-shrink:0;
      ">
        <div style="
          font-size:40px; font-weight:700; color:#333;
          letter-spacing:0.06em; text-align:center;
        ">${entry.name}</div>
      </div>

      <!-- 접는선 2: 바깥 접기 (세로선) -->
      <div style="width:0; height:85mm; border-left:1.5px dashed #AAAAAA; position:relative; flex-shrink:0;">
        <span style="position:absolute;bottom:2px;left:3px;font-size:7px;color:#BBBBBB;writing-mode:vertical-rl;">바깥 접기</span>
      </div>

      <!-- 지지대 25mm -->
      <div style="
        width:25mm; height:85mm; box-sizing:border-box;
        display:flex; align-items:center; justify-content:center;
        flex-shrink:0;
      ">
        <span style="font-size:7px;color:#CCCCCC;writing-mode:vertical-rl;letter-spacing:2px;">SSAMTOOL</span>
      </div>
    </div>
  `;
}

function printEntries(entries: NameEntry[], fontCss: string) {
  if (!entries.length) return;

  // 2개씩 묶어서 페이지 구성
  const pages: NameEntry[][] = [];
  for (let i = 0; i < entries.length; i += 2) {
    pages.push(entries.slice(i, i + 2));
  }

  const pagesHTML = pages.map((page, pi) => `
    <div style="
      page-break-after: ${pi < pages.length - 1 ? "always" : "auto"};
      break-after: ${pi < pages.length - 1 ? "page" : "auto"};
      display:flex; flex-direction:column; gap:0;
      padding: 5mm 15mm;
    ">
      ${page.map((entry, i) => `
        <div>
          ${buildCardHTML(entry, fontCss)}
          ${i === 0 && page.length === 2
            ? `<div style="width:265mm;height:0;border-top:1px solid #E0E0E0;margin:5mm 0;position:relative;">
                <span style="position:absolute;right:0;top:2px;font-size:7px;color:#CCCCCC;">✂ 자르기</span>
               </div>`
            : ""}
        </div>
      `).join("")}
    </div>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Noto Sans KR', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&family=Nanum+Gothic&family=Nanum+Myeongjo&family=Nanum+Pen+Script&family=Nanum+Brush+Script&family=Nanum+Square&family=Black+Han+Sans&family=Jua&family=Gaegu&display=swap">
</head>
<body>
  ${pagesHTML}
  <script>
    document.fonts.ready.then(() => {
      setTimeout(() => { window.print(); window.close(); }, 300);
    });
  </script>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  // iframe 사용 후 정리
  iframe.contentWindow?.addEventListener("afterprint", () => {
    document.body.removeChild(iframe);
  });
}