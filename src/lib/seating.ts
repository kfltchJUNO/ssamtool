import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, serverTimestamp, query, orderBy, getDoc, setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

// ── 타입 ──────────────────────────────────────────────────────────
export interface Desk {
  id: string;
  x: number;
  y: number;
  studentName: string | null;
}

export interface SeatingLayout {
  id: string;
  name: string;
  cols: number;
  rows: number;
  desks: Desk[];
  teacherX: number;
  teacherY: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudentMemo {
  studentName: string;
  pronunciation: string;
  grammar: string;
  attitude: string;
  memo: string;
}

export interface MemoSheet {
  id: string;
  groupId: string;
  groupName: string;
  memos: StudentMemo[];
  updatedAt?: unknown;
}

// ── 경로 ─────────────────────────────────────────────────────────
const layoutCol = (uid: string) =>
  collection(db, "seatingLayouts", uid, "layouts");
const layoutDoc = (uid: string, lid: string) =>
  doc(db, "seatingLayouts", uid, "layouts", lid);
const memoDoc = (uid: string, groupId: string) =>
  doc(db, "studentMemos", uid, "groups", groupId);

// ── 레이아웃 CRUD ─────────────────────────────────────────────────
export async function getLayouts(uid: string): Promise<SeatingLayout[]> {
  const snap = await getDocs(query(layoutCol(uid), orderBy("createdAt", "asc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SeatingLayout));
}

export async function saveLayout(uid: string, layout: Omit<SeatingLayout, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = await addDoc(layoutCol(uid), {
    ...layout,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateLayout(uid: string, lid: string, layout: Partial<SeatingLayout>) {
  await updateDoc(layoutDoc(uid, lid), { ...layout, updatedAt: serverTimestamp() });
}

export async function deleteLayout(uid: string, lid: string) {
  await deleteDoc(layoutDoc(uid, lid));
}

// ── 메모 CRUD ─────────────────────────────────────────────────────
export async function getMemo(uid: string, groupId: string): Promise<MemoSheet | null> {
  const snap = await getDoc(memoDoc(uid, groupId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as MemoSheet) : null;
}

export async function saveMemo(uid: string, groupId: string, data: Omit<MemoSheet, "id">) {
  await setDoc(memoDoc(uid, groupId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}