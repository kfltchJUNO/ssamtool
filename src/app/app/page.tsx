"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import NameTagGenerator from "@/components/NameTagGenerator";
import ClassTimer from "@/components/ClassTimer";
import RandomPicker from "@/components/RandomPicker";
import LoginModal from "@/components/LoginModal";
import ClassPanel from "@/components/ClassPanel";
import SeatingChart from "@/components/SeatingChart";
import GroupDivider from "@/components/GroupDivider";
import SpeakingOrder from "@/components/SpeakingOrder";
import StudentMemo from "@/components/MemoSheet";
import FeedbackButton from "@/components/FeedbackButton";
import InAppBrowserBanner from "@/components/InAppBrowserBanner";
import { AdSense, CoupangBanner, AppPromoBanner } from "@/components/ads/AdBanners";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "@/lib/auth";

type Tab = "nametag"|"timer"|"random"|"seating"|"group"|"speaking"|"memo";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "nametag",  label: "이름표",   icon: "🪪" },
  { id: "timer",    label: "타이머",   icon: "⏱️" },
  { id: "random",   label: "뽑기",     icon: "🎲" },
  { id: "seating",  label: "자리표",   icon: "🪑" },
  { id: "group",    label: "모둠",     icon: "👥" },
  { id: "speaking", label: "시험순서", icon: "🎤" },
  { id: "memo",     label: "메모",     icon: "📝" },
];

// 탭별 교차 홍보 앱
const TAB_PROMO: Partial<Record<Tab, "sori"|"wooriban"|"iam">> = {
  speaking: "sori",
  memo:     "wooriban",
  nametag:  "iam",
};

export default function AppPage() {
  const [activeTab,      setActiveTab]      = useState<Tab>("nametag");
  const [showLogin,      setShowLogin]      = useState(false);
  const [userMenuOpen,   setUserMenuOpen]   = useState(false);
  const [classPanelOpen, setClassPanelOpen] = useState(false);

  const [loadedStudents, setLoadedStudents] = useState<string[]>([]);
  const [loadedLabel,    setLoadedLabel]    = useState("");
  const [loadedGroupId,  setLoadedGroupId]  = useState("");

  const { user, chalk, admin, loading } = useAuth();

  // 전역 로그인 이벤트 수신 (GateBanner에서 발생)
  useEffect(() => {
    const handler = () => setShowLogin(true);
    document.addEventListener("ssamtool:openLogin", handler);
    return () => document.removeEventListener("ssamtool:openLogin", handler);
  }, []);

  const handleSignOut = async () => { await signOut(); setUserMenuOpen(false); };

  const handleSelectGroup = (students: string[], label: string, groupId?: string) => {
    setLoadedStudents(students);
    setLoadedLabel(label);
    setLoadedGroupId(groupId ?? "");
    if (activeTab === "timer") setActiveTab("nametag");
  };

  const sharedProps = {
    preloadedStudents: loadedStudents,
    preloadedLabel:    loadedLabel,
    onOpenClassPanel:  () => setClassPanelOpen(true),
    isLoggedIn:        !!user,
  };

  const promoApp = TAB_PROMO[activeTab];

  return (
    <div className="min-h-screen flex flex-col">
      {/* 인앱 브라우저 배너 */}
      <InAppBrowserBanner />

      <header className="chalk-header">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded bg-[#F2C94C] flex items-center justify-center text-[#1B4332] font-black text-base select-none">쌤</div>
            <div className="hidden sm:block">
              <h1 className="chalk-text text-lg font-bold leading-tight">쌤툴</h1>
              <p className="text-[#A8D5B7] text-[10px]">한국어 강사 수업 도구</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {user && !loading && (
              <button onClick={() => setClassPanelOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2D6A4F] hover:bg-[#3D7A5F] text-[#F5F0E8] text-xs font-medium transition-colors">
                <span>👥</span><span className="hidden sm:inline">내 반</span>
              </button>
            )}

            {loading ? (
              <div className="w-16 h-8 bg-[#2D6A4F] rounded-lg animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2D6A4F] hover:border-[#A8D5B7] transition-colors">
                  {user.photoURL
                    ? <Image src={user.photoURL} alt="프로필" width={22} height={22} className="rounded-full" />
                    : <div className="w-5.5 h-5.5 rounded-full bg-[#F2C94C] flex items-center justify-center text-[#1B4332] text-[10px] font-bold w-6 h-6">
                        {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
                      </div>
                  }
                  <span className="chalk-badge text-[10px] px-1.5 py-0.5">🖍️ {chalk}</span>
                  {admin && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold hidden sm:inline">관리자</span>}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-[#E8E0D0] py-1 z-40">
                    <div className="px-4 py-2 border-b border-[#E8E0D0]">
                      <p className="text-xs font-semibold text-[#1B4332] truncate">{user.displayName ?? "사용자"}</p>
                      <p className="text-[11px] text-[#9A9A9A] truncate">{user.email}</p>
                    </div>
                    <div className="px-4 py-2 border-b border-[#E8E0D0] flex items-center justify-between">
                      <p className="text-[11px] text-[#4A4A4A]">분필 <span className="font-bold text-[#1B4332]">{chalk}개</span></p>
                      <Link href="/shop" onClick={() => setUserMenuOpen(false)} className="text-[11px] text-[#F9A825] font-bold hover:underline">🖍️ 충전</Link>
                    </div>
                    <button onClick={() => { setClassPanelOpen(true); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-[#4A4A4A] hover:bg-[#F5F0E8]">👥 내 반 관리</button>
                    <Link href="/shop" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-[#4A4A4A] hover:bg-[#F5F0E8]">🖍️ 분필 충전</Link>
                    {admin && <Link href="/admin" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-semibold">🛠️ 관리자 페이지</Link>}
                    <div className="border-t border-[#E8E0D0] mt-1 pt-1">
                      <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-[#4A4A4A] hover:bg-[#F5F0E8]">로그아웃</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowLogin(true)}
                className="text-[#A8D5B7] hover:text-white text-xs transition-colors px-3 py-1.5 rounded border border-[#2D6A4F] hover:border-[#A8D5B7]">
                로그인
              </button>
            )}
          </div>
        </div>

        {/* 탭 */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto" style={{scrollbarWidth:"none"}}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-2.5 text-xs font-medium rounded-t-md transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id ? "bg-[#F5F0E8] text-[#1B4332] font-bold" : "text-[#A8D5B7] hover:text-white hover:bg-[#2D6A4F]"
              }`}>
              <span>{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* 반 배너 */}
      {loadedStudents.length > 0 && (
        <div className="max-w-5xl mx-auto w-full px-4 pt-3">
          <div className="flex items-center gap-3 px-4 py-2 bg-[#F0FFF4] border border-[#9AE6B4] rounded-xl">
            <span className="text-sm">✅</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1B4332] truncate">{loadedLabel}</p>
              <p className="text-xs text-[#2D6A4F]">{loadedStudents.length}명</p>
            </div>
            <button onClick={() => setClassPanelOpen(true)} className="text-xs text-[#2D6A4F] underline underline-offset-2 whitespace-nowrap">반 변경</button>
            <button onClick={() => { setLoadedStudents([]); setLoadedLabel(""); setLoadedGroupId(""); }} className="text-[#9A9A9A] hover:text-[#C53030] text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5">
        {/* 상단 애드센스 — 모든 사용자에게 노출 */}
        <AdSense slot="1234567890" className="mb-4 rounded-xl overflow-hidden" />

        {activeTab === "nametag"  && <NameTagGenerator  {...sharedProps} />}
        {activeTab === "timer"    && <ClassTimer />}
        {activeTab === "random"   && <RandomPicker      {...sharedProps} />}
        {activeTab === "seating"  && <SeatingChart      {...sharedProps} />}
        {activeTab === "group"    && <GroupDivider      {...sharedProps} />}
        {activeTab === "speaking" && <SpeakingOrder     {...sharedProps} />}
        {activeTab === "memo"     && <StudentMemo       {...sharedProps} preloadedGroupId={loadedGroupId} />}

        {/* 탭 하단 광고 영역 — 모든 사용자에게 노출 */}
        <div className="mt-6 space-y-3">
          {/* 카카오 애드핏 */}
          {/* <KakaoAdFit unit="DAN-XXXXXXXXXXXXXXXX" width={320} height={50} /> */}

          {/* 쿠팡 파트너스 */}
          <CoupangBanner />

          {/* 교차 홍보 */}
          {promoApp && <AppPromoBanner app={promoApp} />}
        </div>
      </main>

      <footer className="text-center py-3 text-xs text-[#9A9A9A] border-t border-[#E8E0D0]">
        <Link href="/" className="hover:text-[#1B4332]">쌤툴</Link>
        {" · "}
        <Link href="/privacy" className="hover:text-[#1B4332]">개인정보처리방침</Link>
        {" · "}
        <Link href="/terms" className="hover:text-[#1B4332]">이용약관</Link>
        {" · "}
        <Link href="/shop" className="text-[#1B4332] font-semibold">🖍️ 분필 충전</Link>
      </footer>

      {showLogin    && <LoginModal onClose={() => setShowLogin(false)} />}
      <ClassPanel open={classPanelOpen} onClose={() => setClassPanelOpen(false)} onSelectGroup={handleSelectGroup} />
      {userMenuOpen && <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />}
      <FeedbackButton />
    </div>
  );
}