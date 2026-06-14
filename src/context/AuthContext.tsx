"use client";

import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserDoc, isAdmin, type UserDoc } from "@/lib/auth";

interface AuthContextValue {
  user:         User | null;
  userDoc:      UserDoc | null;
  chalk:        number;   // 총 유효 분필 (결제 + 이벤트)
  chalkPaid:    number;   // 결제 분필 (영구, 초록)
  chalkEvent:   number;   // 이벤트 분필 (만료, 주황)
  admin:        boolean;
  loading:      boolean;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, userDoc: null,
  chalk: 0, chalkPaid: 0, chalkEvent: 0,
  admin: false, loading: true,
  refreshUserDoc: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserDoc = async (u: User) => {
    const doc = await getUserDoc(u.uid);
    setUserDoc(doc);
  };

  const refreshUserDoc = async () => { if (user) await loadUserDoc(user); };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) await loadUserDoc(u);
      else setUserDoc(null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const now = new Date();
  const chalkPaid  = userDoc?.chalk ?? 0;
  const chalkEvent = (userDoc?.chalkEvents ?? [])
    .filter(e => e.expiresAt?.toDate() > now)
    .reduce((s, e) => s + e.amount, 0);
  const chalk  = chalkPaid + chalkEvent;
  const admin  = isAdmin(user);

  return (
    <AuthContext.Provider value={{
      user, userDoc, chalk, chalkPaid, chalkEvent, admin, loading, refreshUserDoc,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }