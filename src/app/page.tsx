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
import { AdSense, CoupangBanner, CoupangSearchWidget, KakaoAdFitResponsive, AppPromoBar } from "@/components/ads/AdBanners";
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

export default function AppPage() {
  const [activeTab,      setActiveTab]      = useState<Tab>("nametag");
  const [showLogin,      setShowLogin]      = useState(false);
  const [classPanelOpen, setClassPanelOpen] = useState(false);

  const [loadedStudents, setLoadedStudents] = useState<string[]>([]);
  const [loadedLabel,    setLoadedLabel]    = useState("");
  const [loadedGroupId,  setLoadedGroupId]  = useState("");

  const [showChalkModal, setShowChalkModal] = useState(false);

  const { user, userDoc, chalk, chalkPaid, chalkEvent, admin, loading } = useAuth();

  // 전역 로그인 이벤트 수신 (GateBanner에서 발생)
  useEffect(() => {
    const handler = () => setShowLogin(true);
    document.addEventListener("ssamtool:openLogin", handler);
    return () => document.removeEventListener("ssamtool:openLogin", handler);
  }, []);


  const handleSignOut = async () => { await signOut(); };

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


  return (
    <div className="min-h-screen flex flex-col">
      {/* 인앱 브라우저 배너 */}
      <InAppBrowserBanner />

      <header className="chalk-header relative z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3 relative z-20">
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

            {/* 관리자 버튼 — 관리자 계정 로그인 시만 표시 */}
            {admin && !loading && (
              <a href="/admin"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors">
                🛠️<span className="hidden sm:inline">관리자</span>
              </a>
            )}

            {loading ? (
              <div className="w-24 h-8 bg-[#2D6A4F] rounded-lg animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-2">

                {/* 분필 잔액 — 클릭하면 모달 */}
                <button
                  onClick={() => setShowChalkModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2D6A4F] bg-[#1B4332] hover:border-[#A8D5B7] transition-colors"
                >
                  {chalkPaid > 0 && <span className="text-[11px] font-bold text-[#A8D5B7]">🖍️ {chalkPaid}</span>}
                  {chalkPaid > 0 && chalkEvent > 0 && <span className="text-[#2D6A4F] text-xs">+</span>}
                  {chalkEvent > 0 && <span className="text-[11px] font-bold text-[#F9A825]">🖍️ {chalkEvent}</span>}
                  {chalk === 0 && <span className="text-[11px] text-[#A8D5B7]">🖍️ 0</span>}
                  <Link href="/shop" onClick={e => e.stopPropagation()}
                    className="ml-1 text-[10px] font-bold bg-[#F2C94C] text-[#1B4332] px-1.5 py-0.5 rounded hover:bg-[#EAB800] transition-colors whitespace-nowrap">
                    + 충전
                  </Link>
                </button>

                {/* 프로필 */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2D6A4F]">
                  {user.photoURL
                    ? <Image src={user.photoURL} alt="프로필" width={22} height={22} className="rounded-full" />
                    : <div className="w-6 h-6 rounded-full bg-[#F2C94C] flex items-center justify-center text-[#1B4332] text-[10px] font-bold">
                        {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
                      </div>
                  }
                  <span className="text-[#F5F0E8] text-xs hidden sm:inline max-w-[60px] truncate">
                    {user.displayName ?? user.email?.split("@")[0]}
                  </span>
                </div>

                {/* 로그아웃 — 항상 보임 */}
                <button onClick={handleSignOut}
                  className="px-2.5 py-1.5 rounded-lg bg-[#C53030] hover:bg-[#9B2C2C] text-white text-xs font-bold transition-colors whitespace-nowrap">
                  로그아웃
                </button>
              </div>
            ) : (
              <button onClick={() => setShowLogin(true)}
                className="text-[#A8D5B7] hover:text-white text-xs transition-colors px-3 py-1.5 rounded border border-[#2D6A4F] hover:border-[#A8D5B7]">
                로그인
              </button>
            )}
          </div>
        </div>

        {/* 앱 홍보 바 — 탭 위, 헤더 하단 */}
        <div className="max-w-5xl mx-auto px-4 py-1.5 border-t border-[#2D6A4F]">
          <AppPromoBar />
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
        {/* 본문 + 우측 위젯 */}
        <div className="flex gap-4 items-start">
          {/* 탭 콘텐츠 */}
          <div className="flex-1 min-w-0">
            {activeTab === "nametag"  && <NameTagGenerator  {...sharedProps} />}
            {activeTab === "timer"    && <ClassTimer />}
            {activeTab === "random"   && <RandomPicker      {...sharedProps} />}
            {activeTab === "seating"  && <SeatingChart      {...sharedProps} />}
            {activeTab === "group"    && <GroupDivider      {...sharedProps} />}
            {activeTab === "speaking" && <SpeakingOrder     {...sharedProps} />}
            {activeTab === "memo"     && <StudentMemo       {...sharedProps} preloadedGroupId={loadedGroupId} />}
          </div>

          {/* 우측 사이드 (PC만) */}
          <div className="hidden lg:flex flex-col gap-2 w-52 flex-shrink-0 sticky top-4">
            <CoupangSearchWidget />
            <CoupangBanner />
          </div>
        </div>

        {/* 하단 광고 — 애드센스 + 카카오 + 쿠팡 순서로 한 줄씩 */}
        <div className="mt-5 space-y-2">
          <AdSense className="rounded-xl overflow-hidden" />
          <KakaoAdFitResponsive />
          <div className="lg:hidden">
            <CoupangSearchWidget />
            <div className="mt-2">
              <CoupangBanner />
            </div>
          </div>
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
      <FeedbackButton />

      {/* 분필 현황 모달 */}
      {showChalkModal && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowChalkModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="chalk-header px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="chalk-text font-bold text-lg">🖍️ 분필 현황</h2>
                <p className="text-[#A8D5B7] text-xs mt-0.5">{user.displayName ?? user.email}</p>
              </div>
              <button onClick={() => setShowChalkModal(false)} className="text-[#A8D5B7] hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="p-6 space-y-4">
              {/* 결제 분필 */}
              <div className="flex items-center justify-between p-4 bg-[#F0FFF4] rounded-xl border border-[#9AE6B4]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1B4332] rounded-xl flex items-center justify-center text-white text-lg">🖍️</div>
                  <div>
                    <p className="font-bold text-sm text-[#1B4332]">결제 분필</p>
                    <p className="text-[11px] text-[#2D6A4F]">영구 사용 가능</p>
                  </div>
                </div>
                <span className="text-2xl font-black text-[#1B4332]">{chalkPaid}</span>
              </div>

              {/* 이벤트 분필 */}
              <div className="flex items-center justify-between p-4 bg-[#FFF8E1] rounded-xl border border-[#F9A825]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#F9A825] rounded-xl flex items-center justify-center text-white text-lg">🖍️</div>
                  <div>
                    <p className="font-bold text-sm text-[#92630A]">이벤트 분필</p>
                    <p className="text-[11px] text-[#92630A]">만료일 있음</p>
                  </div>
                </div>
                <span className="text-2xl font-black text-[#F9A825]">{chalkEvent}</span>
              </div>

              {/* 이벤트 분필 상세 (만료일별) */}
              {userDoc?.chalkEvents && userDoc.chalkEvents.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[#4A4A4A]">이벤트 분필 상세</p>
                  {userDoc.chalkEvents
                    .filter(e => e.expiresAt?.toDate() > new Date())
                    .map((e, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-[#F9F9F9] rounded-lg text-xs">
                        <span className="text-[#F9A825] font-semibold">🖍️ {e.amount}개</span>
                        <span className="text-[#9A9A9A]">
                          ~{e.expiresAt.toDate().toLocaleDateString("ko-KR")} 만료
                        </span>
                      </div>
                    ))
                  }
                </div>
              )}

              {/* 합계 */}
              <div className="flex items-center justify-between pt-3 border-t border-[#E8E0D0]">
                <span className="font-bold text-[#1B4332]">합계</span>
                <span className="text-2xl font-black text-[#1B4332]">{chalk}개</span>
              </div>

              <Link href="/shop" onClick={() => setShowChalkModal(false)}
                className="block w-full py-3 bg-[#1B4332] text-white font-bold text-sm text-center rounded-xl hover:bg-[#2D6A4F] transition-colors">
                🖍️ 분필 충전하기
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}