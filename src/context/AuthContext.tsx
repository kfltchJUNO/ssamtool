"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserDoc, calcTotalChalk, isAdmin, type UserDoc } from "@/lib/auth";

// ── Context 타입 ──────────────────────────────────────────────────
interface AuthContextValue {
  user:      User | null;       // Firebase Auth 유저
  userDoc:   UserDoc | null;    // Firestore 유저 문서
  chalk:     number;            // 총 유효 분필 잔액
  admin:     boolean;           // 관리자 여부
  loading:   boolean;           // 초기 로딩
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user:      null,
  userDoc:   null,
  chalk:     0,
  admin:     false,
  loading:   true,
  refreshUserDoc: async () => {},
});

// ── Provider ──────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserDoc = async (u: User) => {
    const doc = await getUserDoc(u.uid);
    setUserDoc(doc);
  };

  const refreshUserDoc = async () => {
    if (user) await loadUserDoc(user);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadUserDoc(u);
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const chalk = userDoc ? calcTotalChalk(userDoc) : 0;
  const admin = isAdmin(user);

  return (
    <AuthContext.Provider value={{ user, userDoc, chalk, admin, loading, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────
export function useAuth() {
  return useContext(AuthContext);
}