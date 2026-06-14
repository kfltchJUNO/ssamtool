"use client";

import { useAuth } from "@/context/AuthContext";

export type Grade = "guest" | "free" | "chalk";

export interface GradeAccess {
  grade:            Grade;
  canPrint:         boolean;  // 인쇄/PDF
  canUseSeating:    boolean;  // 자리표 편집
  canUseDivider:    boolean;  // 모둠 나누기
  canUseSpeaking:   boolean;  // 말하기 시험
  canUseMemo:       boolean;  // 학생 메모
  canSaveMemo:      boolean;  // 메모 저장 (분필 차감)
  canUseEmoji:      boolean;  // 이모지 (😊 free, 계절 chalk)
  canUseSeasonEmoji:boolean;  // 계절 이모지 세트 (chalk only)
  canChooseFont:    boolean;  // 글씨체 선택
  fontLimit:        number;   // 선택 가능 글씨체 수 (1/2/10)
  isLoggedIn:       boolean;
}

export function useGrade(): GradeAccess {
  const { user, chalk } = useAuth();

  if (!user) {
    return {
      grade:             "guest",
      canPrint:          false,
      canUseSeating:     false,
      canUseDivider:     false,
      canUseSpeaking:    false,
      canUseMemo:        false,
      canSaveMemo:       false,
      canUseEmoji:       false,
      canUseSeasonEmoji: false,
      canChooseFont:     false,
      fontLimit:         1,
      isLoggedIn:        false,
    };
  }

  const hasChalk = chalk > 0;

  return {
    grade:             hasChalk ? "chalk" : "free",
    canPrint:          true,
    canUseSeating:     true,
    canUseDivider:     true,
    canUseSpeaking:    true,
    canUseMemo:        true,
    canSaveMemo:       hasChalk,
    canUseEmoji:       true,
    canUseSeasonEmoji: hasChalk,
    canChooseFont:     true,
    fontLimit:         hasChalk ? 10 : 2,
    isLoggedIn:        true,
  };
}

// 분필 차감 기능 목록
export const CHALK_COSTS = {
  nametagPDF:    2,  // 이름표 PDF (반 전체)
  seatingPrint:  1,  // 자리 배치 PDF
  speakingPrint: 1,  // 말하기 시험 순서 PDF
  groupPrint:    1,  // 모둠 나누기 PDF
  qrSession:     1,  // QR 출석 세션
  qrResult:      1,  // QR 출석 결과 저장
  anonBox:       1,  // 익명 질문함
  memoSave:      1,  // 학생 메모 저장
  seasonEmoji:   1,  // 계절 이모지 (이름표)
} as const;