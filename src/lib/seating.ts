import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, serverTimestamp, query, orderBy, getDoc, setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// ── 데이터 모델 타입 ──────────────────────────────────────────────
export interface Student {
  id: string;
  name: string;
  tag?: string; // 예: 국적, 모국어 등
}

export interface Desk {
  id: string;
  x: number;
  y: number;
}

export interface ClassElement {
  id: string;
  type: "desk" | "teacher" | "door" | "tv" | "window" | "board";
  x: number;
  y: number;
}

export interface SeatingLayout {
  id: string;
  name: string;
  cols: number;
  rows: number;
  elements: ClassElement[]; // 교실 모든 기물 및 책상
  teacherPos?: { x: number; y: number };
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DeskAssignment {
  deskId: string;
  studentId: string;
}

export interface SeatingChart {
  id: string;
  layoutId: string;
  classId?: string;
  title: string;
  assignments: DeskAssignment[];
  createdAt?: unknown;
}

export interface AssignOptions {
  avoidPrevious?: DeskAssignment[]; // 직전 배치 동일 자석 회피
  separateSameTags?: boolean;       // 동일 태그 인접 분산
  separatedPairs?: [string, string][]; // 분리 지정 학생 ID 쌍
}

export interface AssignResult {
  assignments: Map<string, string>; // deskId -> studentId
  unassigned: Student[];
  emptyDesks: ClassElement[];
  violationsCount: number;
  violationDetails: string[];
}

export interface StudentMemo {
  studentName: string;
  pronunciation?: string;
  grammar?: string;
  attitude?: string;
  memo?: string;
  values?: Record<string, string>;
}

export interface MemoSheet {
  id: string;
  groupId: string;
  groupName: string;
  fields?: string[];
  memos: StudentMemo[];
  updatedAt?: unknown;
}

// ── Helper: Fisher–Yates Shuffle ──────────────────────────────────
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Pure Function: 자리 배정 핵심 알고리즘 (Task 1 & Task 2) ──────────
export function assignSeats(
  students: Student[],
  elements: ClassElement[],
  options?: AssignOptions
): AssignResult {
  const desks = elements.filter(e => e.type === "desk");
  const sortedDesks = [...desks].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);

  if (students.length === 0 || sortedDesks.length === 0) {
    return {
      assignments: new Map(),
      unassigned: [...students],
      emptyDesks: [...sortedDesks],
      violationsCount: 0,
      violationDetails: [],
    };
  }

  const { avoidPrevious, separateSameTags, separatedPairs } = options || {};
  const hasConstraints = !!(avoidPrevious?.length || separateSameTags || separatedPairs?.length);

  // 제약 조건 점수 평가 함수 (소비 점수가 낮을수록 우수)
  const evaluateAssignments = (candidateAssignments: Map<string, string>): { score: number; details: string[] } => {
    let score = 0;
    const details: string[] = [];

    // deskId -> ClassElement Map
    const deskMap = new Map<string, ClassElement>();
    sortedDesks.forEach(d => deskMap.set(d.id, d));

    // studentId -> deskId Map
    const studentDeskMap = new Map<string, ClassElement>();
    candidateAssignments.forEach((sId, dId) => {
      const d = deskMap.get(dId);
      if (d) studentDeskMap.set(sId, d);
    });

    // 1. 직전 배치 동일 자리 회피 검사
    if (avoidPrevious && avoidPrevious.length > 0) {
      avoidPrevious.forEach(prev => {
        const currentDeskId = candidateAssignments.get(prev.deskId);
        if (currentDeskId === prev.studentId) {
          score += 10;
          const st = students.find(s => s.id === prev.studentId);
          if (st) details.push(`'${st.name}' 학생이 지난번과 동일한 자리에 배정됨`);
        }
      });
    }

    // 2. 분리 지정 쌍(상하좌우 인접 금지) 검사
    if (separatedPairs && separatedPairs.length > 0) {
      separatedPairs.forEach(([sId1, sId2]) => {
        const d1 = studentDeskMap.get(sId1);
        const d2 = studentDeskMap.get(sId2);
        if (d1 && d2) {
          const isAdjacent = Math.abs(d1.x - d2.x) + Math.abs(d1.y - d2.y) === 1;
          if (isAdjacent) {
            score += 20;
            const st1 = students.find(s => s.id === sId1);
            const st2 = students.find(s => s.id === sId2);
            if (st1 && st2) details.push(`'${st1.name}'와(과) '${st2.name}' 학생이 서로 이웃함`);
          }
        }
      });
    }

    // 3. 동일 태그 분산(상하좌우 인접 금지) 검사
    if (separateSameTags) {
      candidateAssignments.forEach((sId1, dId1) => {
        const st1 = students.find(s => s.id === sId1);
        const d1 = deskMap.get(dId1);
        if (!st1 || !st1.tag || !d1) return;

        candidateAssignments.forEach((sId2, dId2) => {
          if (sId1 >= sId2) return; // 중복 비교 방지
          const st2 = students.find(s => s.id === sId2);
          const d2 = deskMap.get(dId2);
          if (!st2 || st2.tag !== st1.tag || !d2) return;

          const isAdjacent = Math.abs(d1.x - d2.x) + Math.abs(d1.y - d2.y) === 1;
          if (isAdjacent) {
            score += 5;
            details.push(`동일 태그(${st1.tag}) 학생 '${st1.name}'와(과) '${st2.name}'이(가) 인접함`);
          }
        });
      });
    }

    return { score, details };
  };

  let bestAssignments = new Map<string, string>();
  let bestScore = Infinity;
  let bestDetails: string[] = [];

  const maxAttempts = hasConstraints ? 100 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffledStudents = shuffle(students);
    const candidate = new Map<string, string>();

    const assignCount = Math.min(shuffledStudents.length, sortedDesks.length);
    for (let i = 0; i < assignCount; i++) {
      candidate.set(sortedDesks[i].id, shuffledStudents[i].id);
    }

    if (!hasConstraints) {
      bestAssignments = candidate;
      bestScore = 0;
      bestDetails = [];
      break;
    }

    const { score, details } = evaluateAssignments(candidate);
    if (score < bestScore) {
      bestScore = score;
      bestAssignments = candidate;
      bestDetails = details;
      if (score === 0) break; // 완벽한 해 달성 시 즉시 멈춤
    }
  }

  // 결과 수집
  const assignedStudentIds = new Set(bestAssignments.values());
  const assignedDeskIds = new Set(bestAssignments.keys());

  const unassigned = students.filter(s => !assignedStudentIds.has(s.id));
  const emptyDesks = sortedDesks.filter(d => !assignedDeskIds.has(d.id));

  // ★ Task 1 자체 검증 (Self-Validation Assert)
  const totalProcessed = bestAssignments.size + unassigned.length;
  if (totalProcessed !== students.length) {
    console.error(
      `[assignSeats Validation Failure] 배정 수(${bestAssignments.size}) + 미배정 수(${unassigned.length}) != 전체 학생 수(${students.length})`
    );
  }

  return {
    assignments: bestAssignments,
    unassigned,
    emptyDesks,
    violationsCount: bestScore,
    violationDetails: bestDetails,
  };
}

// ── 경로 정의 ─────────────────────────────────────────────────────
const layoutCol = (uid: string) => collection(db, "seatingLayouts", uid, "layouts");
const layoutDoc = (uid: string, lid: string) => doc(db, "seatingLayouts", uid, "layouts", lid);
const chartCol = (uid: string) => collection(db, "seatingCharts", uid, "charts");
const chartDoc = (uid: string, cid: string) => doc(db, "seatingCharts", uid, "charts", cid);
const memoDoc = (uid: string, groupId: string) => doc(db, "studentMemos", uid, "groups", groupId);

// ── 레이아웃 (교실 구조) CRUD ─────────────────────────────────────
export async function getLayouts(uid: string): Promise<SeatingLayout[]> {
  const snap = await getDocs(query(layoutCol(uid), orderBy("createdAt", "asc")));
  return snap.docs.map(d => {
    const data = d.data();
    // 마이그레이션: 기존 desks에 studentName이 들어가 있던 데이터를 교실 기물 요소로 정리
    const elements: ClassElement[] = Array.isArray(data.elements)
      ? data.elements
      : Array.isArray(data.desks)
      ? data.desks.map((desk: { id?: string; x: number; y: number; type?: string }) => ({
          id: desk.id || Math.random().toString(36).slice(2, 10),
          type: (desk.type as ClassElement["type"]) || "desk",
          x: desk.x,
          y: desk.y,
        }))
      : [];

    return {
      id: d.id,
      name: data.name || "무제 교실",
      cols: data.cols || 6,
      rows: data.rows || 5,
      elements,
      teacherPos: data.teacherPos,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

export async function saveLayout(
  uid: string,
  layout: Omit<SeatingLayout, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const cleanData = JSON.parse(JSON.stringify(layout));
  const ref = await addDoc(layoutCol(uid), {
    ...cleanData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateLayout(uid: string, lid: string, layout: Partial<SeatingLayout>) {
  const cleanData = JSON.parse(JSON.stringify(layout));
  await updateDoc(layoutDoc(uid, lid), { ...cleanData, updatedAt: serverTimestamp() });
}

export async function deleteLayout(uid: string, lid: string) {
  await deleteDoc(layoutDoc(uid, lid));
}

// ── 시점별 배치 결과 (SeatingChart) CRUD ─────────────────────────
export async function getSeatingCharts(uid: string, layoutId?: string): Promise<SeatingChart[]> {
  const snap = await getDocs(query(chartCol(uid), orderBy("createdAt", "desc")));
  const charts = snap.docs.map(d => ({ id: d.id, ...d.data() } as SeatingChart));
  if (layoutId) {
    return charts.filter(c => c.layoutId === layoutId);
  }
  return charts;
}

export async function saveSeatingChart(
  uid: string,
  chart: Omit<SeatingChart, "id" | "createdAt">
): Promise<string> {
  const cleanData = JSON.parse(JSON.stringify(chart));
  const ref = await addDoc(chartCol(uid), {
    ...cleanData,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteSeatingChart(uid: string, cid: string) {
  await deleteDoc(chartDoc(uid, cid));
}

// ── 학생 메모 CRUD ─────────────────────────────────────────────────
export async function getMemo(uid: string, groupId: string): Promise<MemoSheet | null> {
  const snap = await getDoc(memoDoc(uid, groupId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as MemoSheet) : null;
}

export async function saveMemo(uid: string, groupId: string, data: Omit<MemoSheet, "id">) {
  await setDoc(memoDoc(uid, groupId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}