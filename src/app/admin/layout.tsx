"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { href: "/admin",            icon: "📊", label: "대시보드" },
  { href: "/admin/users",      icon: "👤", label: "유저 관리" },
  { href: "/admin/chalk-logs", icon: "🖍️", label: "분필 로그" },
  { href: "/admin/feedbacks",  icon: "💬", label: "피드백" },
  { href: "/admin/coupang",    icon: "🛒", label: "쿠팡 광고" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, admin, loading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !admin)) router.replace("/");
  }, [user, admin, loading, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8]">
      <div className="text-[#1B4332] font-semibold animate-pulse">관리자 인증 확인 중...</div>
    </div>
  );

  if (!user || !admin) return null;

  return (
    <div className="min-h-screen flex bg-[#F5F0E8]">
      {/* 사이드바 오버레이 (모바일) */}
      {sideOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSideOpen(false)} />
      )}

      {/* 사이드바 */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-40 w-56 bg-[#1B4332] flex flex-col
        transition-transform duration-200
        ${sideOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:flex
      `}>
        {/* 로고 */}
        <div className="px-5 py-5 border-b border-[#2D6A4F]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded bg-[#F2C94C] flex items-center justify-center text-[#1B4332] font-black text-sm">쌤</div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">쌤툴</p>
              <p className="text-[#A8D5B7] text-[10px]">관리자 콘솔</p>
            </div>
          </Link>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} onClick={() => setSideOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-[#F2C94C] text-[#1B4332] font-bold"
                    : "text-[#A8D5B7] hover:text-white hover:bg-[#2D6A4F]"
                }`}>
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* 하단 유저 정보 */}
        <div className="px-5 py-4 border-t border-[#2D6A4F]">
          <p className="text-[#A8D5B7] text-[11px] truncate">{user.email}</p>
          <Link href="/" className="mt-1 text-[#F2C94C] text-xs hover:underline">← 메인으로</Link>
        </div>
      </aside>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 바 */}
        <header className="bg-white border-b border-[#E8E0D0] px-5 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSideOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#E8E0D0] text-[#4A4A4A] hover:bg-[#F5F0E8]">
            ☰
          </button>
          <p className="font-bold text-[#1B4332]">관리자 콘솔</p>
        </header>

        <main className="flex-1 p-5 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}