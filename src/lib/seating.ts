import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, serverTimestamp, query, orderBy, getDoc, setDoc,
} from "firebase/firestore";
import { db, auth } from "./firebase";

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
  emptyDesks: Desk[];
  violationsCount?: number;
  violationDetails?: string[];
}

export interface MemoItem {
  pronunciation?: boolean; // 발음
  grammar?: boolean;       // 문법
  attitude?: boolean;      // 태도
  note?: string;           // 자유 메모
}

export interface MemoSheet {
  id: string;             // classId / groupId
  seatingChartId?: string;
  groupId?: string;
  groupName?: string;
  fields?: string[];
  memos: Record<string, MemoItem> | unknown;
  updatedAt?: unknown;
}

// ── 헬퍼: Fisher-Yates 순수 함수 셔플 ──────────────────────────────
export function shuffleArray<T>(arr: T[]): T[] {
  const res = [...arr];
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

// ── 핵심 자리 배치 순수 함수 (Task 1 & Task 2 제약사항 반영) ─────
export function assignSeats(
  students: Student[],
  desks: Desk[],
  options: AssignOptions = {}
): AssignResult {
  const totalStudents = students.length;
  const deskCount = desks.length;

  if (deskCount === 0) {
    return {
      assignments: new Map(),
      unassigned: [...students],
      emptyDesks: [],
    };
  }

  // 반복 시도 (제약조건 위반 최소화 스코어링)
  const MAX_TRIALS = 50;
  let bestAssignments = new Map<string, string>();
  let bestScore = Infinity;
  let bestUnassigned: Student[] = [];
  let bestEmptyDesks: Desk[] = [];

  const avoidMap = new Map<string, string>(); // studentId -> previousDeskId
  if (options.avoidPrevious) {
    options.avoidPrevious.forEach(a => avoidMap.set(a.studentId, a.deskId));
  }

  const separatedPairs = options.separatedPairs || [];

  for (let trial = 0; trial < MAX_TRIALS; trial++) {
    const shuffledStudents = shuffleArray(students);
    const shuffledDesks = shuffleArray(desks);

    const assignableCount = Math.min(shuffledStudents.length, shuffledDesks.length);
    const currentAssignments = new Map<string, string>();

    for (let i = 0; i < assignableCount; i++) {
      currentAssignments.set(shuffledDesks[i].id, shuffledStudents[i].id);
    }

    const unassigned = shuffledStudents.slice(assignableCount);
    const emptyDesks = shuffledDesks.slice(assignableCount);

    let penalty = 0;

    // 제약 1: 직전 자리 동일 배정 회피
    if (options.avoidPrevious) {
      currentAssignments.forEach((stId, dId) => {
        if (avoidMap.get(stId) === dId) {
          penalty += 10;
        }
      });
    }

    // 제약 2: 특정 학생 쌍 분리 (상하좌우 인접 판단)
    if (separatedPairs.length > 0) {
      const studentDeskMap = new Map<string, Desk>();
      desks.forEach(d => {
        const stId = currentAssignments.get(d.id);
        if (stId) studentDeskMap.set(stId, d);
      });

      for (const [st1, st2] of separatedPairs) {
        const d1 = studentDeskMap.get(st1);
        const d2 = studentDeskMap.get(st2);
        if (d1 && d2) {
          const dist = Math.abs(d1.x - d2.x) + Math.abs(d1.y - d2.y);
          if (dist <= 1) penalty += 20; // 상하좌우 붙어있으면 감점
        }
      }
    }

    // 제약 3: 동일 태그 인접 분산
    if (options.separateSameTags) {
      const studentMap = new Map(students.map(s => [s.id, s]));
      const deskMap = new Map(desks.map(d => [d.id, d]));

      currentAssignments.forEach((stId1, dId1) => {
        const st1 = studentMap.get(stId1);
        const d1 = deskMap.get(dId1);
        if (!st1?.tag || !d1) return;

        currentAssignments.forEach((stId2, dId2) => {
          if (dId1 >= dId2) return;
          const st2 = studentMap.get(stId2);
          const d2 = deskMap.get(dId2);
          if (!st2?.tag || !d2) return;

          if (st1.tag === st2.tag) {
            const dist = Math.abs(d1.x - d2.x) + Math.abs(d1.y - d2.y);
            if (dist <= 1) penalty += 5;
          }
        });
      });
    }

    if (penalty < bestScore) {
      bestScore = penalty;
      bestAssignments = currentAssignments;
      bestUnassigned = unassigned;
      bestEmptyDesks = emptyDesks;
      if (penalty === 0) break;
    }
  }

  // 자체 검증 (배정된 학생 수 + 미배정 학생 수 = 전체 학생 수)
  const totalCheck = bestAssignments.size + bestUnassigned.length;
  if (totalCheck !== totalStudents) {
    console.error(
      `[seating validation error] 전체 학생(${totalStudents}) != 배정(${bestAssignments.size}) + 미배정(${bestUnassigned.length})`
    );
  }

  return {
    assignments: bestAssignments,
    unassigned: bestUnassigned,
    emptyDesks: bestEmptyDesks,
    violationsCount: bestScore === Infinity ? 0 : bestScore,
    violationDetails: [],
  };
}

// ── 인증 헤더 헬퍼 ────────────────────────────────────────────────
async function getAuthHeader(): Promise<HeadersInit> {
  const currentUser = auth.currentUser;
  if (!currentUser) return { "Content-Type": "application/json" };
  const token = await currentUser.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ── 경로 정의 (Client SDK Fallback 용) ────────────────────────────
const layoutCol = (uid: string) => collection(db, "seatingLayouts", uid, "layouts");
const layoutDoc = (uid: string, lid: string) => doc(db, "seatingLayouts", uid, "layouts", lid);
const chartCol = (uid: string) => collection(db, "seatingCharts", uid, "charts");
const chartDoc = (uid: string, cid: string) => doc(db, "seatingCharts", uid, "charts", cid);
const memoDoc = (uid: string, groupId: string) => doc(db, "studentMemos", uid, "groups", groupId);

// ── 레이아웃 (교실 구조) CRUD ─────────────────────────────────────
export async function getLayouts(uid: string): Promise<SeatingLayout[]> {
  try {
    const headers = await getAuthHeader();
    const res = await fetch("/api/seating/layout", { method: "GET", headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.layouts)) return data.layouts;
    }
  } catch (err) {
    console.warn("[getLayouts API Fallback]", err);
  }

  let docs;
  try {
    const snap = await getDocs(query(layoutCol(uid), orderBy("createdAt", "asc")));
    docs = snap.docs;
  } catch {
    const snap = await getDocs(layoutCol(uid));
    docs = snap.docs;
  }
  return docs.map(d => {
    const data = d.data();
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

  // Server API 우선 호출 (Admin SDK 기반이라 Firestore Security Rules 제약 제로)
  try {
    const headers = await getAuthHeader();
    const res = await fetch("/api/seating/layout", {
      method: "POST",
      headers,
      body: JSON.stringify(cleanData),
    });
    const data = await res.json();
    if (res.ok && data.id) {
      return data.id;
    }
    if (!res.ok) {
      throw new Error(data.error || "서버 API 저장 실패");
    }
  } catch (err) {
    console.warn("[saveLayout API Fallback]", err);
  }

  // Client SDK Fallback
  const ref = await addDoc(layoutCol(uid), {
    ...cleanData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateLayout(uid: string, lid: string, layout: Partial<SeatingLayout>) {
  const cleanData = JSON.parse(JSON.stringify(layout));

  try {
    const headers = await getAuthHeader();
    const res = await fetch("/api/seating/layout", {
      method: "PUT",
      headers,
      body: JSON.stringify({ id: lid, ...cleanData }),
    });
    if (res.ok) return;
  } catch (err) {
    console.warn("[updateLayout API Fallback]", err);
  }

  await updateDoc(layoutDoc(uid, lid), { ...cleanData, updatedAt: serverTimestamp() });
}

export async function deleteLayout(uid: string, lid: string) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/seating/layout?id=${lid}`, {
      method: "DELETE",
      headers,
    });
    if (res.ok) return;
  } catch (err) {
    console.warn("[deleteLayout API Fallback]", err);
  }

  await deleteDoc(layoutDoc(uid, lid));
}

// ── 시점별 배치 결과 (SeatingChart) CRUD ─────────────────────────
export async function getSeatingCharts(uid: string, layoutId?: string): Promise<SeatingChart[]> {
  try {
    const headers = await getAuthHeader();
    const url = layoutId ? `/api/seating/chart?layoutId=${layoutId}` : "/api/seating/chart";
    const res = await fetch(url, { method: "GET", headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.charts)) return data.charts;
    }
  } catch (err) {
    console.warn("[getSeatingCharts API Fallback]", err);
  }

  let docs;
  try {
    const snap = await getDocs(query(chartCol(uid), orderBy("createdAt", "desc")));
    docs = snap.docs;
  } catch {
    const snap = await getDocs(chartCol(uid));
    docs = snap.docs;
  }
  const charts = docs.map(d => ({ id: d.id, ...d.data() } as SeatingChart));
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

  try {
    const headers = await getAuthHeader();
    const res = await fetch("/api/seating/chart", {
      method: "POST",
      headers,
      body: JSON.stringify(cleanData),
    });
    const data = await res.json();
    if (res.ok && data.id) {
      return data.id;
    }
  } catch (err) {
    console.warn("[saveSeatingChart API Fallback]", err);
  }

  const ref = await addDoc(chartCol(uid), {
    ...cleanData,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteSeatingChart(uid: string, cid: string) {
  try {
    const headers = await getAuthHeader();
    const res = await fetch(`/api/seating/chart?id=${cid}`, {
      method: "DELETE",
      headers,
    });
    if (res.ok) return;
  } catch (err) {
    console.warn("[deleteSeatingChart API Fallback]", err);
  }

  await deleteDoc(chartDoc(uid, cid));
}

// ── 학생 메모 CRUD ─────────────────────────────────────────────────
export async function getMemo(uid: string, groupId: string): Promise<MemoSheet | null> {
  const snap = await getDoc(memoDoc(uid, groupId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as MemoSheet) : null;
}

export async function saveMemo(uid: string, groupId: string, data: Omit<MemoSheet, "id">) {
  const cleanData = JSON.parse(JSON.stringify(data));
  await setDoc(memoDoc(uid, groupId), { ...cleanData, updatedAt: serverTimestamp() }, { merge: true });
}