import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "개인정보처리방침 | 쌤툴" };

export default function PrivacyPage() {
  const today = "2026년 6월 15일";
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <nav className="bg-[#1B4332] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-[#A8D5B7] hover:text-white text-sm">← 홈</Link>
          <span className="text-white font-bold">개인정보처리방침</span>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-black text-[#1B4332]">개인정보처리방침</h1>
          <p className="text-sm text-[#9A9A9A] mt-1">시행일: {today}</p>
        </div>
        {[
          { title: "1. 수집하는 개인정보 항목", content: `쌤툴(이하 '서비스')은 다음과 같은 개인정보를 수집합니다.\n\n• 이메일 주소\n• 이름(닉네임)\n• 프로필 사진 URL (구글 로그인 시)\n• 서비스 이용 기록 및 접속 로그\n• 기기 정보 (OS, 브라우저 유형)` },
          { title: "2. 개인정보 수집 및 이용 목적", content: `• 서비스 회원가입 및 관리\n• 수업 데이터(반, 학생 목록) 저장 및 관리\n• 분필(유료 재화) 충전 및 사용 관리\n• 고객 문의 및 오류 신고 처리\n• 서비스 개선을 위한 통계 분석` },
          { title: "3. 개인정보 보유 및 이용 기간", content: `• 회원 탈퇴 시까지 보유\n• 단, 관계 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보존\n• 전자상거래 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)` },
          { title: "4. 제3자 제공", content: `서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 다음의 경우 예외로 합니다.\n\n• 이용자가 사전에 동의한 경우\n• 법령의 규정에 의거하거나 수사기관의 요청이 있는 경우` },
          { title: "5. 개인정보 처리 위탁", content: `• Google Firebase (인증, 데이터베이스, 저장소) — Google LLC\n• Vercel (웹 서버 호스팅) — Vercel Inc.\n• Gumroad (결제 처리) — Gumroad, Inc.` },
          { title: "6. 광고 서비스", content: `본 서비스는 다음의 광고 서비스를 사용합니다.\n\n• 구글 애드센스: Google LLC에서 제공하는 광고 서비스로, 쿠키를 사용하여 광고를 제공합니다.\n• 카카오 애드핏: 카카오에서 제공하는 광고 서비스입니다.\n• 쿠팡 파트너스: 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.` },
          { title: "7. 이용자 권리", content: `이용자는 언제든지 다음의 권리를 행사할 수 있습니다.\n\n• 개인정보 열람 요구\n• 오류 정정 요구\n• 삭제 요구\n• 처리정지 요구\n\n권리 행사는 ot.helper7@gmail.com으로 이메일 문의해 주세요.` },
          { title: "8. 개인정보 보호책임자", content: `이름: 쌤툴 운영팀\n이메일: ot.helper7@gmail.com` },
        ].map(s => (
          <section key={s.title} className="bg-white rounded-xl border border-[#E8E0D0] p-5">
            <h2 className="font-bold text-[#1B4332] mb-3">{s.title}</h2>
            <p className="text-sm text-[#4A4A4A] whitespace-pre-line leading-relaxed">{s.content}</p>
          </section>
        ))}
      </div>
    </div>
  );
}