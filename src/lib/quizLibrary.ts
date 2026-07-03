// src/lib/quizLibrary.ts
// 퀴즈 항목 라이브러리 Firestore 저장/조회
// 구조: quizLibrary/{catId} = { name, color, order, items: [{id,label,note,levels[]}] }
import {
  collection, doc, getDocs, setDoc, deleteDoc, query, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface QuizLibItem {
  id:     string;
  label:  string;
  note:   string;
  levels: string[];   // ["beginner","intermediate","advanced"] 복수 가능
}

export interface QuizLibCategory {
  id:    string;
  name:  string;
  color: string;
  order: number;
  items: QuizLibItem[];
}

const COL = "quizLibrary";

// ── 전체 라이브러리 로드 ──────────────────────────────────────────
export async function loadLibrary(): Promise<QuizLibCategory[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy("order", "asc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as QuizLibCategory));
}

// ── 카테고리 저장 (생성/수정 공용) ───────────────────────────────
export async function saveCategory(cat: QuizLibCategory): Promise<void> {
  const { id, ...data } = cat;
  await setDoc(doc(db, COL, id), data);
}

// ── 카테고리 삭제 ─────────────────────────────────────────────────
export async function deleteCategoryDoc(catId: string): Promise<void> {
  await deleteDoc(doc(db, COL, catId));
}

// ── 시드 데이터 (최초 1회 초기화용) ──────────────────────────────
export const SEED_LIBRARY: QuizLibCategory[] = [
  {
    id: "cat-particle",
    name: "조사",
    color: "indigo",
    order: 0,
    items: [
      { id: "p1",  label: "이/가",   note: "주격",                    levels: ["beginner"] },
      { id: "p2",  label: "은/는",   note: "주제/대조",               levels: ["beginner", "intermediate"] },
      { id: "p3",  label: "을/를",   note: "목적격",                  levels: ["beginner"] },
      { id: "p4",  label: "에",      note: "장소(존재)/시간",         levels: ["beginner"] },
      { id: "p5",  label: "에서",    note: "장소(동작이 일어나는 곳)", levels: ["beginner"] },
      { id: "p6",  label: "에게",    note: "대상",                    levels: ["beginner"] },
      { id: "p7",  label: "부터",    note: "시작점",                  levels: ["beginner"] },
      { id: "p8",  label: "까지",    note: "도착점/한계",             levels: ["beginner", "intermediate"] },
      { id: "p9",  label: "(으)로",  note: "방향/수단",               levels: ["beginner"] },
      { id: "p10", label: "보다",    note: "비교",                    levels: ["intermediate"] },
      { id: "p11", label: "만큼",    note: "정도",                    levels: ["intermediate"] },
      { id: "p12", label: "조차",    note: "극단 포함",               levels: ["advanced"] },
      { id: "p13", label: "마저",    note: "마지막 하나까지",         levels: ["advanced"] },
    ],
  },
  {
    id: "cat-grammar",
    name: "문법",
    color: "amber",
    order: 1,
    items: [
      { id: "g1",  label: "-고 있다",        note: "진행",           levels: ["beginner"] },
      { id: "g2",  label: "-아/어 보다",     note: "시도",           levels: ["beginner"] },
      { id: "g3",  label: "-(으)ㄹ 것 같다", note: "미래 추측/계획", levels: ["beginner", "intermediate"] },
      { id: "g4",  label: "-고 싶다",        note: "희망",           levels: ["beginner"] },
      { id: "g5",  label: "-(으)세요",       note: "명령/요청",      levels: ["beginner"] },
      { id: "g6",  label: "-지 마세요",      note: "금지",           levels: ["beginner"] },
      { id: "g7",  label: "-(으)면",         note: "조건",           levels: ["beginner", "intermediate"] },
      { id: "g8",  label: "-는 바람에",      note: "부정적 원인",    levels: ["intermediate"] },
      { id: "g9",  label: "-더니",           note: "회상+결과",      levels: ["intermediate", "advanced"] },
      { id: "g10", label: "-느니",           note: "선택(차라리)",   levels: ["advanced"] },
      { id: "g11", label: "-(으)ㄹ지언정",   note: "양보",           levels: ["advanced"] },
      { id: "g12", label: "-기 마련이다",    note: "당연함",         levels: ["advanced"] },
    ],
  },
  {
    id: "cat-error",
    name: "오류 유형",
    color: "rose",
    order: 2,
    items: [
      { id: "e1", label: "조사 오류",        note: "조사 선택/누락",          levels: ["beginner", "intermediate"] },
      { id: "e2", label: "시제 사용 오류",   note: "시제 혼동",               levels: ["beginner", "intermediate"] },
      { id: "e3", label: "어순 오류",        note: "문장 성분 배치",          levels: ["beginner"] },
      { id: "e4", label: "불규칙 활용 오류", note: "ㅂ/ㄷ/르 불규칙",         levels: ["intermediate"] },
      { id: "e5", label: "연결어미 오류",    note: "-아서/-니까 혼동",        levels: ["intermediate", "advanced"] },
      { id: "e6", label: "높임법 오류",      note: "주체높임 -(으)시- 누락",  levels: ["advanced"] },
    ],
  },
];

// ── 시드 초기화 (라이브러리가 비어있을 때만) ─────────────────────
export async function seedLibraryIfEmpty(): Promise<boolean> {
  const existing = await loadLibrary();
  if (existing.length > 0) return false;
  await Promise.all(SEED_LIBRARY.map(cat => saveCategory(cat)));
  return true;
}