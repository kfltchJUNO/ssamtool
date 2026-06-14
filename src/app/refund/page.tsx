import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "환불정책 | 쌤툴" };

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <nav className="bg-[#1B4332] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-[#A8D5B7] hover:text-white text-sm">← 홈</Link>
          <span className="text-white font-bold">환불정책</span>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-[#1B4332]">환불정책</h1>
          <p className="text-sm text-[#9A9A9A] mt-1">시행일: 2026년 6월 15일</p>
        </div>
        {[
          { title: "환불 가능 조건", content: "• 결제일로부터 7일 이내\n• 구매한 분필을 1개도 사용하지 않은 경우\n\n위 두 조건을 모두 충족하는 경우 전액 환불이 가능합니다." },
          { title: "환불 불가 조건", content: "• 결제일로부터 8일 이상 경과한 경우\n• 분필을 1개 이상 사용한 경우\n• 이벤트로 지급받은 분필 (이벤트 분필은 환불 대상이 아닙니다)" },
          { title: "부분 환불", content: "분필을 일부 사용한 경우 부분 환불은 지원하지 않습니다.\n사용하지 않은 분필은 계속 사용 가능합니다." },
          { title: "환불 신청 방법", content: "환불을 원하시는 경우 아래로 문의해 주세요.\n\n이메일: ot.helper7@gmail.com\n제목: [환불 신청] 쌤툴 분필 환불\n내용: 결제일, 결제 금액, 이메일 주소, 환불 사유\n\n접수 후 영업일 기준 3일 이내 처리됩니다." },
          { title: "환불 처리", content: "Gumroad를 통해 결제하신 경우, 결제 수단으로 환불됩니다.\n환불 처리 완료 후 카드사 정책에 따라 3~5 영업일 내 반영됩니다." },
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