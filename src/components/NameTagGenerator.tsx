"use client";

import { useState, useCallback } from "react";

// ── 등급 정의 ─────────────────────────────────────────────────────
type UserGrade = "guest" | "free" | "chalk";

// ── 글씨체 ────────────────────────────────────────────────────────
const FONTS_GUEST: { id: string; label: string; css: string }[] = [
  { id: "noto", label: "기본체", css: "'Noto Sans KR', sans-serif" },
];

const FONTS_FREE: { id: string; label: string; css: string }[] = [
  { id: "noto",    label: "기본체",   css: "'Noto Sans KR', sans-serif" },
  { id: "gothic",  label: "고딕체",   css: "'Nanum Gothic', sans-serif" },
];

const FONTS_CHALK: { id: string; label: string; css: string }[] = [
  { id: "noto",       label: "기본체",     css: "'Noto Sans KR', sans-serif" },
  { id: "gothic",     label: "고딕체",     css: "'Nanum Gothic', sans-serif" },
  { id: "myeongjo",   label: "명조체",     css: "'Nanum Myeongjo', serif" },
  { id: "pen",        label: "펜글씨체",   css: "'Nanum Pen Script', cursive" },
  { id: "brush",      label: "붓글씨체",   css: "'Nanum Brush Script', cursive" },
  { id: "square",     label: "네모고딕",   css: "'Nanum Square', sans-serif" },
  { id: "gmarket",    label: "지마켓Sans", css: "'GmarketSans', sans-serif" },
  { id: "black",      label: "검정고딕",   css: "'Black Han Sans', sans-serif" },
  { id: "jua",        label: "주아체",     css: "'Jua', sans-serif" },
  { id: "gaegu",      label: "개구체",     css: "'Gaegu', cursive" },
];

// ── 이모지 세트 ───────────────────────────────────────────────────
const EMOJI_SMILE = "😊";

const EMOJI_SETS: { id: string; label: string; icon: string; emojis: string[] }[] = [
  { id: "spring", label: "봄",  icon: "🌸", emojis: ["🌸","🌷","🌺","🌼","🦋","🌱","🍀","🌿"] },
  { id: "summer", label: "여름", icon: "🌊", emojis: ["🌊","🐚","⛱️","🐠","🦀","🍉","🌴","☀️"] },
  { id: "autumn", label: "가을", icon: "🍁", emojis: ["🍁","🍂","🎃","🌰","🍄","🦊","🌾","🍎"] },
  { id: "winter", label: "겨울", icon: "⛄", emojis: ["⛄","❄️","🧣","🎿","🏔️","🦌","🕯️","⭐"] },
];

// ── 타입 ──────────────────────────────────────────────────────────
interface NameEntry {
  id: string;
  name: string;
  emoji: string; // "" = 없음
}

type EmojiMode = "none" | "smile" | "set" | "random";

const PRESET_NAMES = [
  "김유진", "이서준", "박민서", "최지우", "정하은",
  "강민준", "윤서연", "임채원", "한지호", "오수아",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── 구글 폰트 URL ─────────────────────────────────────────────────
const GFONT_URL =
  "https://fonts.googleapis.com/css2?family=Nanum+Gothic&family=Nanum+Myeongjo&family=Nanum+Pen+Script&family=Nanum+Brush+Script&family=Nanum+Square&family=Black+Han+Sans&family=Jua&family=Gaegu&display=swap";

export default function NameTagGenerator() {
  // 등급 (MVP에서는 UI 스위처로 시뮬레이션)
  const [grade, setGrade] = useState<UserGrade>("guest");

  const fonts =
    grade === "chalk" ? FONTS_CHALK : grade === "free" ? FONTS_FREE : FONTS_GUEST;

  const [namesInput, setNamesInput] = useState("");
  const [entries, setEntries] = useState<NameEntry[]>([]);
  const [fontId, setFontId] = useState("noto");
  const [emojiMode, setEmojiMode] = useState<EmojiMode>("none");
  const [activeSet, setActiveSet] = useState("spring");
  const [showPreview, setShowPreview] = useState(false);

  const currentFont =
    [...FONTS_CHALK].find((f) => f.id === fontId) || FONTS_CHALK[0];
  const currentSet =
    EMOJI_SETS.find((s) => s.id === activeSet) || EMOJI_SETS[0];

  // 등급이 바뀌면 불가능한 설정 초기화
  const handleGradeChange = (g: UserGrade) => {
    setGrade(g);
    if (g === "guest") {
      setFontId("noto");
      setEmojiMode("none");
    } else if (g === "free") {
      setEmojiMode("smile");
      if (!["noto", "gothic"].includes(fontId)) setFontId("noto");
    }
  };

  const resolveEmoji = useCallback(
    (mode: EmojiMode): string => {
      if (mode === "none") return "";
      if (mode === "smile") return EMOJI_SMILE;
      if (mode === "set" || mode === "random")
        return randomFrom(currentSet.emojis);
      return "";
    },
    [currentSet]
  );

  const generate = useCallback(() => {
    const lines = namesInput
      .split(/[\n,，、]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!lines.length) return;

    const newEntries: NameEntry[] = lines.map((name, i) => ({
      id: `e-${i}-${Date.now()}`,
      name,
      emoji: resolveEmoji(emojiMode),
    }));
    setEntries(newEntries);
    setShowPreview(true);
  }, [namesInput, emojiMode, resolveEmoji]);

  // 개별 이모지 재생성
  const reshuffleEmoji = (id: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, emoji: resolveEmoji(emojiMode) } : e
      )
    );
  };

  const canChooseFont = grade !== "guest";

  return (
    <>
      {/* 구글 폰트 로드 */}
      <link rel="stylesheet" href={GFONT_URL} />

      <div className="space-y-5">
        {/* ── 등급 시뮬레이터 (MVP 전용) ── */}
        <div className="bg-[#FFFBEA] border border-[#F2C94C] rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-[#92630A]">🧪 MVP 등급 미리보기</span>
          {(["guest", "free", "chalk"] as UserGrade[]).map((g) => (
            <button
              key={g}
              onClick={() => handleGradeChange(g)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                grade === g
                  ? "bg-[#1B4332] text-white"
                  : "bg-white text-[#4A4A4A] border border-[#E8E0D0] hover:border-[#1B4332]"
              }`}
            >
              {g === "guest" ? "비로그인" : g === "free" ? "무료 로그인" : "분필 사용 (1개)"}
            </button>
          ))}
        </div>

        {/* ── 입력 패널 ── */}
        <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#1B4332] text-lg">이름표 생성기</h2>
            <button
              onClick={() => setNamesInput(PRESET_NAMES.join("\n"))}
              className="text-xs text-[#2D6A4F] underline underline-offset-2 hover:text-[#1B4332]"
            >
              예시 불러오기
            </button>
          </div>

          <textarea
            value={namesInput}
            onChange={(e) => setNamesInput(e.target.value)}
            placeholder={"이름 입력 (줄바꿈 또는 쉼표 구분)\n\n예) 김유진\n이서준\n박민서"}
            className="w-full h-36 border border-[#E8E0D0] rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
          />

          {/* ── 글씨체 선택 ── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-[#4A4A4A]">글씨체</p>
              {!canChooseFont && (
                <span className="text-[10px] bg-[#E8E0D0] text-[#6A6A6A] px-2 py-0.5 rounded-full">
                  로그인 시 선택 가능
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {fonts.map((f) => (
                <button
                  key={f.id}
                  onClick={() => canChooseFont && setFontId(f.id)}
                  disabled={!canChooseFont}
                  style={{ fontFamily: f.css }}
                  className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-all ${
                    fontId === f.id
                      ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332] font-bold"
                      : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332] disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              {grade === "chalk" && fonts.length > 2 && (
                <span className="self-center text-[10px] text-[#9A9A9A]">총 {fonts.length}종</span>
              )}
            </div>
          </div>

          {/* ── 이모지 설정 ── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-[#4A4A4A]">이모지</p>
              {grade === "guest" && (
                <span className="text-[10px] bg-[#E8E0D0] text-[#6A6A6A] px-2 py-0.5 rounded-full">
                  로그인 시 사용 가능
                </span>
              )}
              {grade === "free" && (
                <span className="text-[10px] bg-[#EBF8FF] text-[#2B6CB0] px-2 py-0.5 rounded-full">
                  😊 고정 (분필 사용 시 선택 가능)
                </span>
              )}
            </div>

            {grade === "guest" && (
              <div className="flex gap-2">
                {(["none"] as EmojiMode[]).map((m) => (
                  <button key={m}
                    onClick={() => setEmojiMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-all ${
                      emojiMode === m
                        ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332]"
                        : "border-[#E8E0D0] text-[#9A9A9A]"
                    }`}
                  >
                    없음
                  </button>
                ))}
              </div>
            )}

            {grade === "free" && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emojiMode !== "none"}
                    onChange={(e) => setEmojiMode(e.target.checked ? "smile" : "none")}
                    className="accent-[#1B4332]"
                  />
                  <span className="text-sm text-[#4A4A4A]">😊 스마일 이모지 추가</span>
                </label>
              </div>
            )}

            {grade === "chalk" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {([
                    { v: "none", label: "없음" },
                    { v: "random", label: "🎲 랜덤" },
                  ] as { v: EmojiMode; label: string }[]).map(({ v, label }) => (
                    <button key={v} onClick={() => setEmojiMode(v)}
                      className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-all ${
                        emojiMode === v
                          ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332] font-semibold"
                          : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"
                      }`}
                    >{label}</button>
                  ))}
                  {EMOJI_SETS.map((s) => (
                    <button key={s.id}
                      onClick={() => { setEmojiMode("set"); setActiveSet(s.id); }}
                      className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-all ${
                        emojiMode === "set" && activeSet === s.id
                          ? "border-[#1B4332] bg-[#F0FFF4] text-[#1B4332] font-semibold"
                          : "border-[#E8E0D0] text-[#4A4A4A] hover:border-[#1B4332]"
                      }`}
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
                {(emojiMode === "set" || emojiMode === "random") && (
                  <div className="flex flex-wrap gap-2 p-3 bg-[#F9F9F9] rounded-lg">
                    {currentSet.emojis.map((em) => (
                      <span key={em} className="text-2xl cursor-default select-none">{em}</span>
                    ))}
                    <span className="text-xs text-[#9A9A9A] self-center ml-1">
                      {emojiMode === "random" ? "이름별 랜덤 배정" : "이름별 랜덤 배정"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={generate}
            disabled={!namesInput.trim()}
            className="w-full py-3 bg-[#1B4332] text-[#F5F0E8] font-bold rounded-lg hover:bg-[#2D6A4F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            이름표 만들기
          </button>
        </div>

        {/* ── 미리보기 ── */}
        {showPreview && entries.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8E0D0] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-[#1B4332]">미리보기</h3>
                <p className="text-xs text-[#9A9A9A] mt-0.5">
                  {entries.length}개 · A4 가로 인쇄 · 1장에 2개 (삼각 텐트형)
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#F2C94C] text-[#1B4332] text-sm font-bold rounded-lg hover:bg-[#EAB800] transition-colors"
              >
                🖨️ 인쇄
              </button>
            </div>

            {/* 화면 미리보기 */}
            <div className="space-y-4" id="screen-preview">
              {entries.map((entry) => (
                <ScreenCard
                  key={entry.id}
                  entry={entry}
                  fontCss={currentFont.css}
                  onReshuffleEmoji={
                    (emojiMode === "set" || emojiMode === "random")
                      ? () => reshuffleEmoji(entry.id)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* ── 실제 인쇄 영역 ── */}
        <PrintArea entries={entries} fontCss={currentFont.css} />
      </div>

      {/* ── 인쇄 전역 스타일 ── */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }

          /* 화면 요소 모두 숨김 */
          body > * { display: none !important; }
          #print-root { display: block !important; }
        }
      `}</style>
    </>
  );
}

// ── 화면 카드 (미리보기용) ────────────────────────────────────────
function ScreenCard({
  entry,
  fontCss,
  onReshuffleEmoji,
}: {
  entry: NameEntry;
  fontCss: string;
  onReshuffleEmoji?: () => void;
}) {
  return (
    <div className="border-2 border-dashed border-[#E8E0D0] rounded-xl p-4 bg-[#FAFAFA]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wider">
          텐트 카드 — {entry.name}
        </span>
        {onReshuffleEmoji && (
          <button
            onClick={onReshuffleEmoji}
            className="text-xs text-[#2D6A4F] underline underline-offset-2"
          >
            이모지 다시 배정
          </button>
        )}
      </div>

      {/* 삼각 텐트 가로 배치 시각화 */}
      <div className="flex border border-[#CCCCCC] rounded overflow-hidden bg-white" style={{ height: 100 }}>
        {/* 패널A: 뒷면 (뒤집힘) */}
        <div
          className="flex-1 flex items-center justify-center border-r-2 border-dashed border-[#AAAAAA] bg-[#F5F5F5]"
          style={{ transform: "rotate(180deg)" }}
        >
          <PanelContent name={entry.name} emoji={entry.emoji} fontCss={fontCss} size="sm" backside />
        </div>
        {/* 패널B: 바닥 */}
        <div
          className="flex items-center justify-center border-r-2 border-dashed border-[#AAAAAA] bg-[#EEEEEE]"
          style={{ width: 60 }}
        >
          <span className="text-[10px] text-[#999] rotate-90 whitespace-nowrap">바닥면</span>
        </div>
        {/* 패널C: 앞면 */}
        <div className="flex-1 flex items-center justify-center bg-white">
          <PanelContent name={entry.name} emoji={entry.emoji} fontCss={fontCss} size="sm" />
        </div>
      </div>

      <p className="text-[10px] text-[#AAAAAA] mt-2 text-center">
        ✂️ 가로로 자르고 → 두 점선을 산 접기 → 삼각형 완성
      </p>
    </div>
  );
}

// ── 패널 공통 콘텐츠 ──────────────────────────────────────────────
function PanelContent({
  name,
  emoji,
  fontCss,
  size,
  backside,
}: {
  name: string;
  emoji: string;
  fontCss: string;
  size: "sm" | "lg";
  backside?: boolean;
}) {
  const nameSize = size === "lg" ? 56 : 22;
  const emojiSize = size === "lg" ? 48 : 18;
  const subSize = size === "lg" ? 13 : 9;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: size === "lg" ? 8 : 3,
        padding: size === "lg" ? "16px 24px" : "6px 10px",
        fontFamily: fontCss,
        width: "100%",
        height: "100%",
      }}
    >
      {emoji && (
        <span style={{ fontSize: emojiSize, lineHeight: 1 }}>{emoji}</span>
      )}
      <span
        style={{
          fontSize: nameSize,
          fontWeight: 900,
          color: "#111",
          letterSpacing: "0.04em",
          lineHeight: 1.1,
          textAlign: "center",
          wordBreak: "keep-all",
        }}
      >
        {name}
      </span>
      {backside && (
        <span style={{ fontSize: subSize, color: "#888", letterSpacing: "0.1em" }}>
          NAME TAG
        </span>
      )}
    </div>
  );
}

// ── 실제 인쇄 영역 ────────────────────────────────────────────────
// A4 landscape = 297mm × 210mm
// 여백 8mm 제외 → 281mm × 194mm 사용 가능
// 텐트 1개 높이: 194mm / 2 = 97mm
// 패널 너비: 앞(97mm) + 바닥(49mm) + 뒤(97mm) = 243mm (< 281mm OK)
//   → 양옆 여백 (281-243)/2 = 19mm 자동 여백

const PANEL_FRONT_W = "97mm";
const PANEL_BOTTOM_W = "49mm";
const PANEL_BACK_W = "97mm";
const CARD_H = "97mm";
const FOLD_BORDER = "2px dashed #999";
const CUT_BORDER = "1px solid #CCC";
const OUTER_BORDER = "2px solid #222";

function PrintCard({ entry, fontCss }: { entry: NameEntry; fontCss: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "243mm",
        height: CARD_H,
        margin: "0 auto",
        borderTop: OUTER_BORDER,
        borderBottom: OUTER_BORDER,
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {/* 패널A: 뒷면 (180도 회전) */}
      <div
        style={{
          width: PANEL_BACK_W,
          height: CARD_H,
          borderRight: FOLD_BORDER,
          borderLeft: OUTER_BORDER,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(180deg)",
          boxSizing: "border-box",
          backgroundColor: "#fff",
        }}
      >
        <PanelContent name={entry.name} emoji={entry.emoji} fontCss={fontCss} size="lg" backside />
      </div>

      {/* 패널B: 바닥 */}
      <div
        style={{
          width: PANEL_BOTTOM_W,
          height: CARD_H,
          borderRight: FOLD_BORDER,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F5F5F5",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: "#AAA",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            letterSpacing: 2,
          }}
        >
          바닥면 · SSAMTOOL
        </span>
      </div>

      {/* 패널C: 앞면 */}
      <div
        style={{
          width: PANEL_FRONT_W,
          height: CARD_H,
          borderRight: OUTER_BORDER,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
          boxSizing: "border-box",
        }}
      >
        <PanelContent name={entry.name} emoji={entry.emoji} fontCss={fontCss} size="lg" />
      </div>
    </div>
  );
}

function PrintArea({ entries, fontCss }: { entries: NameEntry[]; fontCss: string }) {
  if (!entries.length) return null;

  // A4 가로에 2개씩, 2개마다 페이지 나눔
  const pages: NameEntry[][] = [];
  for (let i = 0; i < entries.length; i += 2) {
    pages.push(entries.slice(i, i + 2));
  }

  return (
    <div
      id="print-root"
      style={{
        display: "none",
        fontFamily: "sans-serif",
      }}
    >
      <style>{`
        @media print {
          #print-root { display: block !important; }
          .print-page {
            page-break-after: always;
            break-after: page;
            width: 281mm;
            margin: 0 auto;
            padding-top: 4mm;
          }
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .cut-line {
            border-top: ${CUT_BORDER};
            margin: 2mm auto;
            width: 243mm;
            position: relative;
          }
          .cut-label {
            position: absolute;
            right: -18mm;
            top: -7px;
            font-size: 8px;
            color: #BBB;
            white-space: nowrap;
          }
          .fold-guide {
            font-size: 8px;
            color: #999;
            text-align: center;
            margin: 3mm 0 1mm;
            letter-spacing: 1px;
          }
        }
      `}</style>

      {pages.map((pageEntries, pi) => (
        <div key={pi} className="print-page">
          {/* 상단 안내 */}
          <div className="fold-guide">
            ✂ 점선을 따라 자르고 · - - - 접는 선을 산 접기(▲) 하면 삼각 명패 완성
          </div>

          {pageEntries.map((entry, ci) => (
            <div key={entry.id}>
              {ci > 0 && (
                <div className="cut-line">
                  <span className="cut-label">✂ 자르기</span>
                </div>
              )}
              <PrintCard entry={entry} fontCss={fontCss} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
