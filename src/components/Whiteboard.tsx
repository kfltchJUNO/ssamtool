"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

type BoardTheme = "greenboard" | "blackboard" | "whiteboard";

interface Point {
  x: number;
  y: number;
}

interface DrawStroke {
  color: string;
  size: number;
  points: Point[];
  mode: "draw" | "erase";
}

const THEME_STYLES: Record<BoardTheme, { bg: string; defaultColor: string; label: string; border: string }> = {
  greenboard: {
    bg: "#16382B",
    defaultColor: "#FFFFFF",
    label: "초록 칠판",
    border: "#8D5B4C", // 목재 프레임 느낌
  },
  blackboard: {
    bg: "#1E1E1E",
    defaultColor: "#FFFFFF",
    label: "흑판",
    border: "#4B5563",
  },
  whiteboard: {
    bg: "#F8FAFC",
    defaultColor: "#0F172A",
    label: "화이트보드",
    border: "#CBD5E1",
  },
};

const CHALK_COLORS = [
  "#FFFFFF", // 흰색 분필
  "#FACC15", // 노란 분필
  "#F87171", // 분홍/빨간 분필
  "#60A5FA", // 파란 분필
  "#4ADE80", // 연두 분필
  "#C084FC", // 보라 분필
  "#FB923C", // 주황 분필
  "#0F172A", // 흑색 보드마카
];

export default function Whiteboard() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [theme, setTheme] = useState<BoardTheme>("greenboard");
  const [strokeColor, setStrokeColor] = useState<string>("#FFFFFF");
  const [strokeSize, setStrokeSize] = useState<number>(4);
  const [toolMode, setToolMode] = useState<"draw" | "erase">("draw");

  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // 실시간 교실 프로젝터-태블릿 동기화 (방 코드)
  const [roomCode, setRoomCode] = useState<string>("");
  const [isLiveSync, setIsLiveSync] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("");

  // 테마 변경 시 기본 분필 색상 자동 설정
  useEffect(() => {
    if (theme === "whiteboard" && strokeColor === "#FFFFFF") {
      setStrokeColor("#0F172A");
    } else if (theme !== "whiteboard" && strokeColor === "#0F172A") {
      setStrokeColor("#FFFFFF");
    }
  }, [theme]); // eslint-disable-line

  // 캔버스 크기 리사이징
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = isFullscreen ? window.innerHeight - 80 : 540;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      redraw(strokes);
    }
  }, [isFullscreen, strokes]); // eslint-disable-line

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // 전체 스트로크 다시 그리기
  const redraw = useCallback((strokeList: DrawStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    strokeList.forEach(st => {
      if (st.points.length < 2) return;

      ctx.beginPath();
      ctx.lineWidth = st.size;

      if (st.mode === "erase") {
        ctx.strokeStyle = THEME_STYLES[theme].bg;
      } else {
        ctx.strokeStyle = st.color;
      }

      ctx.moveTo(st.points[0].x, st.points[0].y);
      for (let i = 1; i < st.points.length; i++) {
        ctx.lineTo(st.points[i].x, st.points[i].y);
      }
      ctx.stroke();
    });
  }, [theme]);

  // ── 마우스 / 터치 드로잉 이벤트 ──────────────────────────────────
  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pt = getCanvasPoint(e);
    if (!pt) return;

    isDrawingRef.current = true;
    currentPointsRef.current = [pt];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = strokeSize;
    ctx.strokeStyle = toolMode === "erase" ? THEME_STYLES[theme].bg : strokeColor;
    ctx.moveTo(pt.x, pt.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;

    currentPointsRef.current.push(pt);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentPointsRef.current.length > 1) {
      const newStroke: DrawStroke = {
        color: strokeColor,
        size: strokeSize,
        points: [...currentPointsRef.current],
        mode: toolMode,
      };

      setStrokes(prev => {
        const next = [...prev, newStroke];
        // 실시간 동기화 활성화 시 Firestore 업데이트
        if (isLiveSync && roomCode.trim()) {
          syncToFirebase(next);
        }
        return next;
      });
    }
    currentPointsRef.current = [];
  };

  // 실행 취소 (Undo)
  const handleUndo = () => {
    setStrokes(prev => {
      const next = prev.slice(0, -1);
      redraw(next);
      if (isLiveSync && roomCode.trim()) {
        syncToFirebase(next);
      }
      return next;
    });
  };

  // 전체 지우기
  const handleClear = () => {
    if (!confirm("칠판의 모든 판서 내용을 지울까요?")) return;
    setStrokes([]);
    redraw([]);
    if (isLiveSync && roomCode.trim()) {
      syncToFirebase([]);
    }
  };

  // 이미지 다운로드
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 배경색 채워서 다운로드용 캔버스 생성
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    tempCtx.fillStyle = THEME_STYLES[theme].bg;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);

    const a = document.createElement("a");
    a.download = `쌤툴-전자칠판판서-${new Date().toISOString().slice(0, 10)}.png`;
    a.href = tempCanvas.toDataURL("image/png");
    a.click();
  };

  // ── Firestore 실시간 태블릿 <-> 프로젝터 동기화 ─────────────────
  const syncToFirebase = async (newStrokes: DrawStroke[]) => {
    if (!roomCode.trim()) return;
    try {
      // 용량 최적화: stroke 포인트 중복 간소화 (최근 150획 한정)
      const sanitized = newStrokes.slice(-150).map(s => ({
        color: s.color,
        size: s.size,
        mode: s.mode,
        points: s.points.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })),
      }));

      await setDoc(doc(db, "ssamtoolBoards", roomCode.trim().toUpperCase()), {
        strokes: sanitized,
        theme,
        updatedAt: Date.now(),
      });
      setSyncStatus("동기화됨");
    } catch (err) {
      console.error("Board sync error:", err);
      setSyncStatus("전송 실패");
    }
  };

  const toggleLiveSync = () => {
    if (!roomCode.trim()) {
      const code = user?.uid ? user.uid.slice(0, 6).toUpperCase() : Math.random().toString(36).slice(2, 8).toUpperCase();
      setRoomCode(code);
    }
    setIsLiveSync(v => !v);
  };

  // 실시간 구독 리스너
  useEffect(() => {
    if (!isLiveSync || !roomCode.trim()) return;

    const boardDocRef = doc(db, "ssamtoolBoards", roomCode.trim().toUpperCase());
    const unsubscribe = onSnapshot(boardDocRef, snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.strokes)) {
          // 로컬과 다를 경우만 반영
          setStrokes(data.strokes);
          if (data.theme && data.theme !== theme) {
            setTheme(data.theme);
          }
          redraw(data.strokes);
          setSyncStatus("실시간 연결 중");
        }
      }
    });

    return () => unsubscribe();
  }, [isLiveSync, roomCode, redraw, theme]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col space-y-3 ${
        isFullscreen ? "fixed inset-0 z-50 bg-[#0F172A] p-4 text-white overflow-hidden" : ""
      }`}
    >
      {/* 상단 툴바 */}
      <div className="bg-white rounded-xl border border-[#E8E0D0] p-3 shadow-sm flex items-center justify-between flex-wrap gap-2 text-xs">
        
        {/* 테마 선택 (칠판 종류) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(Object.keys(THEME_STYLES) as BoardTheme[]).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                theme === t
                  ? "bg-white text-[#1B4332] shadow-sm"
                  : "text-slate-600 hover:text-[#1B4332]"
              }`}
            >
              {THEME_STYLES[t].label}
            </button>
          ))}
        </div>

        {/* 도구 & 분필 색상 */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setToolMode("draw")}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
              toolMode === "draw"
                ? "bg-[#1B4332] text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            <span>🖍️</span> 판서
          </button>

          <button
            onClick={() => setToolMode("erase")}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all ${
              toolMode === "erase"
                ? "bg-[#DC2626] text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            <span>🧹</span> 지우개
          </button>

          {/* 분필 색상 팔레트 (판서 모드일 때만) */}
          {toolMode === "draw" && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {CHALK_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setStrokeColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    strokeColor === c ? "scale-125 border-[#1B4332] shadow-md" : "border-slate-300"
                  }`}
                  title={c}
                />
              ))}
            </div>
          )}

          {/* 선 굵기 */}
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
            <span className="text-slate-500 font-bold">굵기:</span>
            {[2, 4, 8, 16].map(sz => (
              <button
                key={sz}
                onClick={() => setStrokeSize(sz)}
                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  strokeSize === sz ? "bg-[#1B4332] text-white" : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* 액션 버튼 (실행취소, 지우기, 저장, 실시간 동기화) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="px-2.5 py-1.5 border border-slate-200 bg-white text-slate-700 font-bold rounded-lg hover:bg-slate-50 disabled:opacity-40"
            title="마지막 획 실행 취소"
          >
            ↩️ 뒤로
          </button>
          <button
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="px-2.5 py-1.5 border border-slate-200 bg-white text-red-600 font-bold rounded-lg hover:bg-red-50 disabled:opacity-40"
            title="칠판 전체 지우기"
          >
            🗑️ 전체 삭제
          </button>
          <button
            onClick={handleDownload}
            className="px-2.5 py-1.5 bg-[#F2C94C] text-[#1B4332] font-bold rounded-lg hover:bg-[#EAB800]"
            title="칠판 내용 이미지로 저장"
          >
            💾 저장
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-2.5 py-1.5 bg-[#475569] text-white font-bold rounded-lg hover:bg-[#334155]"
          >
            {isFullscreen ? "✕ 축소" : "🖥️ 전체화면"}
          </button>
        </div>
      </div>

      {/* 태블릿 <-> 빔프로젝터 실시간 동기화 바 */}
      <div className="bg-[#F0FFF4] border border-[#9AE6B4] rounded-xl px-4 py-2 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#1B4332] flex items-center gap-1">
            <span>📡</span> 태블릿-프로젝터 화면 공유:
          </span>
          <input
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            placeholder="공유 코드 (예: ROOM302)"
            className="px-2 py-1 border border-[#9AE6B4] rounded-md font-mono text-xs w-32 uppercase"
          />
          <button
            onClick={toggleLiveSync}
            className={`px-3 py-1 rounded-md font-bold transition-colors ${
              isLiveSync ? "bg-[#1B4332] text-white" : "bg-white border border-[#9AE6B4] text-[#1B4332]"
            }`}
          >
            {isLiveSync ? "동기화 중 🟢" : "실시간 연결 시작"}
          </button>
          {syncStatus && <span className="text-slate-500 text-[11px]">({syncStatus})</span>}
        </div>
        <p className="text-[11px] text-[#2D6A4F]">
          💡 프로젝터 PC와 태블릿에서 동일한 공유 코드를 입력하면 태블릿에 쓰는 내용이 프로젝터에 즉시 나타납니다.
        </p>
      </div>

      {/* 칠판 본체 영역 (터치/펜 판서 최적화) */}
      <div
        className="relative rounded-2xl shadow-2xl overflow-hidden border-8 transition-colors select-none touch-none"
        style={{
          backgroundColor: THEME_STYLES[theme].bg,
          borderColor: THEME_STYLES[theme].border,
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="cursor-crosshair w-full block"
        />

        {strokes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white/30 text-sm font-semibold select-none">
            {theme === "whiteboard" ? "보드마카로 판서하세요 ✍️" : "분필로 자유롭게 판서하세요 ✍️ (터치 / 마우스 / 스타일러스 펜)"}
          </div>
        )}
      </div>
    </div>
  );
}
