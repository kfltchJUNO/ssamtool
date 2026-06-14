import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "이용약관 | 쌤툴" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <nav className="bg-[#1B4332] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-[#A8D5B7] hover:text-white text-sm">← 홈</Link>
          <span className="text-white font-bold">이용약관</span>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-[#1B4332]">이용약관</h1>
          <p className="text-sm text-[#9A9A9A] mt-1">시행일: 2026년 6월 15일</p>
        </div>
        {[
          { title: "제1조 (목적)", content: "이 약관은 쌤툴(이하 '서비스')이 제공하는 모든 서비스의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다." },
          { title: "제2조 (서비스 이용)", content: "서비스는 한국어 어학원 강사를 위한 수업 도구 모음으로, 이름표 생성·자리표·랜덤뽑기·모둠나누기·말하기시험 순서표 등을 제공합니다.\n\n일부 기능은 회원가입(무료) 또는 분필(유료 재화) 충전이 필요합니다." },
          { title: "제3조 (회원 의무)", content: "• 타인의 정보를 무단으로 사용하지 않습니다.\n• 서비스를 불법적인 목적으로 사용하지 않습니다.\n• 서비스의 안정적인 운영을 방해하는 행위를 하지 않습니다." },
          { title: "제4조 (분필 재화)", content: "• 분필은 서비스 내 유료 재화입니다.\n• 구매한 분필은 환불정책에 따라 환불 가능합니다.\n• 이벤트로 지급된 분필은 만료일이 있으며 환불되지 않습니다.\n• 계정 탈퇴 시 잔여 분필은 소멸됩니다." },
          { title: "제5조 (서비스 변경 및 중단)", content: "서비스는 운영상 필요에 의해 서비스 내용을 변경하거나 중단할 수 있습니다. 유료 서비스 중단 시 잔여 분필에 대해 합리적인 보상 방법을 사전 공지합니다." },
          { title: "제6조 (면책조항)", content: "서비스는 이용자가 서비스를 이용하여 기대하는 수익을 얻지 못하거나 손실을 입은 것에 대해 책임을 지지 않습니다. 천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해서도 책임을 지지 않습니다." },
          { title: "제7조 (분쟁 해결)", content: "이 약관과 관련된 분쟁은 대한민국 법률에 따르며, 소송이 제기될 경우 서비스 운영자의 주소지를 관할하는 법원을 관할법원으로 합니다." },
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