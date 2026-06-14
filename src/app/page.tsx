"use client";

import { useState } from "react";
import Image from "next/image";
import NameTagGenerator from "@/components/NameTagGenerator";
import ClassTimer from "@/components/ClassTimer";
import RandomPicker from "@/components/RandomPicker";
import LoginModal from "@/components/LoginModal";
import ClassPanel from "@/components/ClassPanel";
import SeatingChart from "@/components/SeatingChart";
import GroupMaker from "@/components/GroupMaker";
import SpeakingOrder from "@/components/SpeakingOrder";
import MemoSheet from "@/components/MemoSheet";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/lib/auth";

type Tab = "nametag" | "timer" | "random" | "seating" | "group" | "speaking" | "memo";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "nametag",  label: "이름표",  icon: "🪪" },
  { id: "timer",    label: "타이머",  icon: "⏱️" },
  { id: "random",   label: "뽑기",    icon: "🎲" },
  { id: "seating",  label: "자리표",  icon: "🪑" },
  { id: "group",    label: "모둠",    icon: "👥" },
  { id: "speaking", label: "시험순서", icon: "🎤" },
  { id: "memo",     label: "메모시트", icon: "📝" },
];

export default function Home() {
  const [activeTab,      setActiveTab]      = useState<Tab>("nametag");
  const [showLogin,      setShowLogin]      = useState(false);
  const [userMenuOpen,   setUserMenuOpen]   = useState(false);
  const [classPanelOpen, setClassPanelOpen] = useState(false);
  const [loadedStudents, setLoadedStudents] = useState<string[]>([]);
  const [loadedLabel,    setLoadedLabel]    = useState("");

  const { user, chalk, admin, loading } = useAuth();

  const handleSignOut = async () => { await signOut(); setUserMenuOpen(false); };

  const handleSelectGroup = (students: string[], label: string) => {
    setLoadedStudents(students);
    setLoadedLabel(label);
    if (activeTab === "timer") setActiveTab("nametag");
  };

  const sharedProps = {
    preloadedStudents: loadedStudents,
    preloadedLabel:    loadedLabel,
    onOpenClassPanel:  () => setClassPanelOpen(true),
    isLoggedIn:        !!user,
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── 헤더 ── */}
      <header className="chalk-header">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded bg-[#F2C94C] flex items-center justify-center text-[#1B4332] font-black text-lg select-none">쌤</div>
            <div>
              <h1 className="chalk-text text-xl font-bold leading-tight">쌤툴</h1>
              <p className="text-[#A8D5B7] text-xs">한국어 강사 수업 도구</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && !loading && (
              <button onClick={() => setClassPanelOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D6A4F] hover:bg-[#3D7A5F] text-[#F5F0E8] text-sm font-medium transition-colors">
                <span>👥</span><span className="hidden sm:inline">내 반 관리</span>
              </button>
            )}

            {loading ? (
              <div className="w-20 h-8 bg-[#2D6A4F] rounded-lg animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2D6A4F] hover:border-[#A8D5B7] transition-colors">
                  {user.photoURL
                    ? <Image src={user.photoURL} alt="프로필" width={24} height={24} className="rounded-full" />
                    : <div className="w-6 h-6 rounded-full bg-[#F2C94C] flex items-center justify-center text-[#1B4332] text-xs font-bold">
                        {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
                      </div>
                  }
                  <span className="text-[#F5F0E8] text-sm font-medium max-w-[80px] truncate hidden sm:inline">
                    {user.displayName ?? user.email?.split("@")[0]}
                  </span>
                  <span className="chalk-badge text-[11px] px-2 py-0.5">✏️ {chalk}</span>
                  {admin && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">관리자</span>}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#E8E0D0] py-1 z-40">
                    <div className="px-4 py-2 border-b border-[#E8E0D0]">
                      <p className="text-xs font-semibold text-[#1B4332] truncate">{user.displayName ?? "사용자"}</p>
                      <p className="text-[11px] text-[#9A9A9A] truncate">{user.email}</p>
                    </div>
                    <div className="px-4 py-2 border-b border-[#E8E0D0]">
                      <p className="text-[11px] text-[#4A4A4A]">분필 잔액: <span className="font-bold text-[#1B4332]">{chalk}개</span></p>
                    </div>
                    <button onClick={() => { setClassPanelOpen(true); setUserMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-[#4A4A4A] hover:bg-[#F5F0E8] transition-colors">
                      👥 내 반 관리
                    </button>
                    {admin && (
                      <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">🛠️ 관리자 페이지</button>
                    )}
                    <button onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-[#4A4A4A] hover:bg-[#F5F0E8] transition-colors">
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowLogin(true)}
                className="text-[#A8D5B7] hover:text-white text-sm transition-colors px-3 py-1.5 rounded border border-[#2D6A4F] hover:border-[#A8D5B7]">
                로그인
              </button>
            )}
          </div>
        </div>

        {/* 탭 바 — 스크롤 가능 */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-md transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-[#F5F0E8] text-[#1B4332] font-bold"
                  : "text-[#A8D5B7] hover:text-white hover:bg-[#2D6A4F]"
              }`}>
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* 불러온 반 배너 */}
      {loadedStudents.length > 0 && activeTab !== "timer" && (
        <div className="max-w-5xl mx-auto w-full px-4 pt-4">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#F0FFF4] border border-[#9AE6B4] rounded-xl">
            <span className="text-sm">✅</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1B4332] truncate">{loadedLabel}</p>
              <p className="text-xs text-[#2D6A4F]">{loadedStudents.length}명 불러옴</p>
            </div>
            <button onClick={() => setClassPanelOpen(true)} className="text-xs text-[#2D6A4F] underline underline-offset-2 whitespace-nowrap">반 변경</button>
            <button onClick={() => { setLoadedStudents([]); setLoadedLabel(""); }} className="text-[#9A9A9A] hover:text-[#C53030] text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* ── 메인 ── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {activeTab === "nametag"  && <NameTagGenerator  {...sharedProps} />}
        {activeTab === "timer"    && <ClassTimer />}
        {activeTab === "random"   && <RandomPicker   {...sharedProps} />}
        {activeTab === "seating"  && <SeatingChart   {...sharedProps} />}
        {activeTab === "group"    && <GroupMaker     {...sharedProps} />}
        {activeTab === "speaking" && <SpeakingOrder  {...sharedProps} />}
        {activeTab === "memo"     && <MemoSheet      {...sharedProps} />}
      </main>

      <footer className="text-center py-4 text-xs text-[#9A9A9A] border-t border-[#E8E0D0]">
        쌤툴 · 한국어 강사 수업 도구
      </footer>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      <ClassPanel open={classPanelOpen} onClose={() => setClassPanelOpen(false)} onSelectGroup={handleSelectGroup} />
      {userMenuOpen && <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />}
    </div>
  );
}