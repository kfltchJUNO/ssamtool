"use client";

import { useState } from "react";
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
} from "@/lib/auth";

type Screen = "login" | "signup" | "reset";

interface Props {
  onClose: () => void;
}

export default function LoginModal({ onClose }: Props) {
  const [screen,   setScreen]   = useState<Screen>("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [error,    setError]    = useState("");
  const [info,     setInfo]     = useState("");
  const [busy,     setBusy]     = useState(false);

  const clear = () => { setError(""); setInfo(""); };

  // ── 구글 로그인 ──
  const handleGoogle = async () => {
    setBusy(true); clear();
    try {
      await signInWithGoogle();
      onClose();
    } catch (e: unknown) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  // ── 이메일 로그인 ──
  const handleEmailLogin = async () => {
    if (!email || !password) { setError("이메일과 비밀번호를 입력해 주세요."); return; }
    setBusy(true); clear();
    try {
      await signInWithEmail(email, password);
      onClose();
    } catch (e: unknown) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  // ── 이메일 회원가입 ──
  const handleSignUp = async () => {
    if (!name || !email || !password) { setError("모든 항목을 입력해 주세요."); return; }
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다."); return; }
    setBusy(true); clear();
    try {
      await signUpWithEmail(email, password, name);
      onClose();
    } catch (e: unknown) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  // ── 비밀번호 재설정 ──
  const handleReset = async () => {
    if (!email) { setError("이메일을 입력해 주세요."); return; }
    setBusy(true); clear();
    try {
      await resetPassword(email);
      setInfo("재설정 메일을 보냈어요. 받은 편지함을 확인해 주세요.");
    } catch (e: unknown) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    /* 오버레이 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="chalk-header px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="chalk-text font-bold text-lg">
              {screen === "login"  ? "로그인"
               : screen === "signup" ? "회원가입"
               : "비밀번호 재설정"}
            </h2>
            <p className="text-[#A8D5B7] text-xs mt-0.5">쌤툴에 오신 것을 환영해요</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#A8D5B7] hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* 구글 로그인 (login/signup 공통) */}
          {screen !== "reset" && (
            <button
              onClick={handleGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 py-3 border-2 border-[#E8E0D0] rounded-xl hover:border-[#1B4332] hover:bg-[#F0FFF4] transition-all font-semibold text-[#2D2D2D] disabled:opacity-50"
            >
              {/* Google SVG 로고 */}
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Google로 {screen === "signup" ? "회원가입" : "로그인"}
            </button>
          )}

          {screen !== "reset" && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E8E0D0]" />
              <span className="text-xs text-[#9A9A9A]">또는 이메일</span>
              <div className="flex-1 h-px bg-[#E8E0D0]" />
            </div>
          )}

          {/* 이름 (회원가입만) */}
          {screen === "signup" && (
            <input
              type="text"
              placeholder="이름 (닉네임)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
            />
          )}

          {/* 이메일 */}
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && screen === "login" && handleEmailLogin()}
            className="w-full border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
          />

          {/* 비밀번호 (재설정 화면 제외) */}
          {screen !== "reset" && (
            <input
              type="password"
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && screen === "login" && handleEmailLogin()}
              className="w-full border border-[#E8E0D0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332]"
            />
          )}

          {/* 에러 / 인포 메시지 */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          {info && (
            <p className="text-sm text-[#276749] bg-[#F0FFF4] rounded-lg px-3 py-2">{info}</p>
          )}

          {/* 메인 버튼 */}
          <button
            onClick={
              screen === "login"  ? handleEmailLogin
              : screen === "signup" ? handleSignUp
              : handleReset
            }
            disabled={busy}
            className="w-full py-3 bg-[#1B4332] text-white font-bold rounded-xl hover:bg-[#2D6A4F] disabled:opacity-50 transition-colors"
          >
            {busy ? "처리 중..." : screen === "login" ? "로그인" : screen === "signup" ? "회원가입" : "재설정 메일 보내기"}
          </button>

          {/* 하단 링크 */}
          <div className="flex items-center justify-between text-xs text-[#9A9A9A] pt-1">
            {screen === "login" && (
              <>
                <button onClick={() => { setScreen("reset"); clear(); }} className="hover:text-[#1B4332] underline underline-offset-2">
                  비밀번호 찾기
                </button>
                <button onClick={() => { setScreen("signup"); clear(); }} className="hover:text-[#1B4332] underline underline-offset-2">
                  회원가입 →
                </button>
              </>
            )}
            {screen === "signup" && (
              <button onClick={() => { setScreen("login"); clear(); }} className="hover:text-[#1B4332] underline underline-offset-2">
                ← 이미 계정이 있어요
              </button>
            )}
            {screen === "reset" && (
              <button onClick={() => { setScreen("login"); clear(); }} className="hover:text-[#1B4332] underline underline-offset-2">
                ← 로그인으로 돌아가기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Firebase 에러 → 한국어 ────────────────────────────────────────
function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/user-not-found":        "등록되지 않은 이메일이에요.",
    "auth/wrong-password":        "비밀번호가 틀렸어요.",
    "auth/invalid-credential":    "이메일 또는 비밀번호가 올바르지 않아요.",
    "auth/email-already-in-use":  "이미 사용 중인 이메일이에요.",
    "auth/weak-password":         "비밀번호가 너무 짧아요. 6자 이상 입력해 주세요.",
    "auth/invalid-email":         "이메일 형식이 올바르지 않아요.",
    "auth/too-many-requests":     "시도 횟수가 너무 많아요. 잠시 후 다시 시도해 주세요.",
    "auth/popup-closed-by-user":  "로그인 창이 닫혔어요. 다시 시도해 주세요.",
    "auth/cancelled-by-user":     "로그인이 취소됐어요.",
    "auth/network-request-failed":"네트워크 오류가 발생했어요. 연결을 확인해 주세요.",
  };
  return map[code] ?? `오류가 발생했어요. (${code || "알 수 없는 오류"})`;
}