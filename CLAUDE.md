# CLAUDE.md — 쌤툴 (ssamtool)

## 언어
항상 한국어로 답변할 것. 코드 주석/커밋 메시지는 영어 그대로 둬도 됨.

## 응답 스타일 (토큰 절약)
각 단계마다 "이제 ~를 확인합니다", "~가 확인됐습니다" 같은 진행 서술 최소화.
중간 과정은 짧게, 최종 결과 위주로 보고할 것.
작업 끝나면 요약은 5줄 이내로. 상세 로그는 필요할 때만 요청함.
불필요하게 전체 코드베이스를 재탐색하지 말 것 — 아래 "주요 파일 위치" 참고.

## 프로젝트 구조
Next.js 14 + Firebase (Firestore, Auth, Storage), 배포는 Vercel
한국어 강사용 수업 도구 모음 (이름표, 퀴즈 생성, 좌석배치, 자리 뽑기 등). 우리반(wooriban)과 Firebase 프로젝트(wooriban1) 공유.

- Firebase 클라이언트: `src/lib/firebase.ts` (또는 `firebaseConfig.ts` — 실제 경로 확인 후 고정)
- Firebase Admin SDK: `src/lib/firebase-admin.ts`
- 인증 컨텍스트: `src/context/AuthContext.tsx`
- 크레딧(분필) 로직: `src/lib/credits.ts` (deductCredits/refundCredits)
- 전역 유료화 스위치: `src/lib/monetization.ts`(클라이언트), `src/lib/monetizationServer.ts`(서버, Admin SDK)
- 퀴즈 라이브러리: `src/lib/quizLibrary.ts`
- 페이지: `src/app/app/page.tsx` (메인 탭 전환 구조)
- 컴포넌트: `src/components/`
- API 라우트: `src/app/api/{quiz,textbook,chalk,wooriban}/`
- 빌드: `npm run build` / 로컬 실행: `npm run dev` / 린트: `npm run lint`

## 핵심 아키텍처 패턴
- **분필(chalk) 소비 로직은 전부 `isChalkEnabled()` 체크 후 실행** — `settings/monetization` Firestore 문서로 관리자가 전역 on/off. 꺼져있으면 무료로 동작, `chalkSpent: 0`으로 응답
- **이름표(NameTagGenerator) 등급 시스템 없음** — 로그인 여부(`isLoggedIn`)로만 게이트, 분필 무관
- **Gemini 모델은 폴백 리스트로 순차 호출**, 재시도 시 지수 백오프
- **환불 보장 패턴**: `charged` 플래그로 분필 차감 여부 추적 → 실패 시 `charged`가 true일 때만 환불 시도
- **우리반 연동**: 쌤툴 퀴즈를 우리반 반에 배포하는 기능 있음 (`/api/quiz/[quizId]/deploy-wooriban`), 학교/반 매칭 시 `classId` 형식(`level30-6` 등)과 `schoolId` 정규화 주의
- 시험지 인쇄는 iframe 방식(`printQuizExam`), 별도 라이브러리 없이 브라우저 인쇄 API 사용

## 인코딩 주의
PowerShell(`Get-Content`)로 파일을 붙여넣을 때 한글이 깨져 보일 수 있음. 코드 작성 시 항상 정상 UTF-8 한글로 작성.

## Firestore 규칙 변경 시
`firebase deploy --only firestore:rules` 실행 전 전체 규칙 내용을 보여주고 확인받을 것.

## 커밋 규칙
의미 단위로 자주 커밋. 커밋 전 "커밋할까요?" 한 번 물어볼 것 (자동 커밋 금지)
커밋 메시지 형식: "ssamtool: [한 줄 요약]"

## 확인 없이 하지 말 것
- `git push`
- Firestore 보안 규칙 배포
- Vercel 환경변수 변경 (`GEMINI_KEY_1/2` 등)
- 우리반(wooriban)과 공유하는 Firebase 프로젝트(wooriban1)의 컬렉션 구조를 임의로 변경 — 양쪽 앱에 영향 가는 작업은 항상 먼저 알릴 것
- `.env.local`, `serviceAccountKey.json` 등 시크릿 파일은 절대 git add 금지
