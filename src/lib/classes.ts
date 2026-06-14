import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

export interface Institution { id: string; name: string; createdAt?: unknown; }
export interface Semester    { id: string; name: string; createdAt?: unknown; }
export interface Group       { id: string; name: string; students: string[]; createdAt?: unknown; updatedAt?: unknown; }

const instCol  = (uid: string) => collection(db, "classes", uid, "institutions");
const semCol   = (uid: string, iid: string) => collection(db, "classes", uid, "institutions", iid, "semesters");
const grpCol   = (uid: string, iid: string, sid: string) => collection(db, "classes", uid, "institutions", iid, "semesters", sid, "groups");

export async function getInstitutions(uid: string): Promise<Institution[]> {
  const snap = await getDocs(query(instCol(uid), orderBy("createdAt","asc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Institution));
}
export async function addInstitution(uid: string, name: string): Promise<string> {
  const r = await addDoc(instCol(uid), { name, createdAt: serverTimestamp() }); return r.id;
}
export async function updateInstitution(uid: string, iid: string, name: string) {
  await updateDoc(doc(db,"classes",uid,"institutions",iid), { name });
}
export async function deleteInstitution(uid: string, iid: string) {
  await deleteDoc(doc(db,"classes",uid,"institutions",iid));
}

export async function getSemesters(uid: string, iid: string): Promise<Semester[]> {
  const snap = await getDocs(query(semCol(uid,iid), orderBy("createdAt","asc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Semester));
}
export async function addSemester(uid: string, iid: string, name: string): Promise<string> {
  const r = await addDoc(semCol(uid,iid), { name, createdAt: serverTimestamp() }); return r.id;
}
export async function updateSemester(uid: string, iid: string, sid: string, name: string) {
  await updateDoc(doc(db,"classes",uid,"institutions",iid,"semesters",sid), { name });
}
export async function deleteSemester(uid: string, iid: string, sid: string) {
  await deleteDoc(doc(db,"classes",uid,"institutions",iid,"semesters",sid));
}

export async function getGroups(uid: string, iid: string, sid: string): Promise<Group[]> {
  const snap = await getDocs(query(grpCol(uid,iid,sid), orderBy("createdAt","asc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
}
export async function addGroup(uid: string, iid: string, sid: string, name: string, students: string[]): Promise<string> {
  const r = await addDoc(grpCol(uid,iid,sid), { name, students, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); return r.id;
}
export async function updateGroup(uid: string, iid: string, sid: string, gid: string, data: Partial<{name:string;students:string[]}>) {
  await updateDoc(doc(db,"classes",uid,"institutions",iid,"semesters",sid,"groups",gid), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteGroup(uid: string, iid: string, sid: string, gid: string) {
  await deleteDoc(doc(db,"classes",uid,"institutions",iid,"semesters",sid,"groups",gid));
}