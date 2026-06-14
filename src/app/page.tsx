import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "쌤툴 | 한국어 강사 수업 도구 모음",
  description: "이름표 생성, 자리배치, 랜덤뽑기, 모둠나누기, 말하기시험 순서표 등 한국어 어학원 강사를 위한 무료 수업 도구 모음.",
  keywords: "한국어 강사, 이름표 생성기, 자리표, 랜덤뽑기, 어학원, 수업도구",
  openGraph: {
    title: "쌤툴 | 한국어 강사 수업 도구",
    description: "이름표·자리표·뽑기·모둠·시험순서 — 한 곳에서 해결",
    type: "website",
    locale: "ko_KR",
  },
};

const FEATURES = [
  { icon: "🪪", title: "이름표 생성기",    desc: "A4 한 장으로 접어 세우는 삼각 명패. 다양한 글씨체와 이모지 지원." },
  { icon: "🪑", title: "자리표",           desc: "교실 레이아웃 직접 설정. 드래그로 배치, 랜덤 배정, 선생님/학생 시점 인쇄." },
  { icon: "🎲", title: "랜덤 뽑기",        desc: "슬롯머신 애니메이션으로 학생 무작위 지명. 이미 뽑힌 학생 자동 제외." },
  { icon: "👥", title: "모둠 나누기",      desc: "N명씩 또는 N모둠으로 랜덤 분할. 결과 카드에서 학생 이동도 가능." },
  { icon: "🎤", title: "말하기 시험 순서", desc: "랜덤/가나다/출석부순 정렬. 쉬는 시간·대기 그룹 자동 계산." },
  { icon: "📝", title: "학생 메모",        desc: "발음·문법·태도 항목별 메모. 자리표 기반 또는 목록 기반으로 인쇄." },
  { icon: "⏱️", title: "수업 타이머",      desc: "카운트다운·스톱워치 모드. SVG 링 시각화, 완료 알림음." },
  { icon: "💾", title: "반 데이터 저장",   desc: "기관·학기·반 계층 구조로 학생 목록 저장. 모든 도구에서 바로 불러오기." },
];

const PLANS = [
  { name: "무료",   price: "0원",    chalk: "—",   features: ["이름표 생성", "타이머", "랜덤뽑기", "인쇄 기능"] },
  { name: "로그인", price: "무료",   chalk: "—",   features: ["모든 무료 기능", "반 데이터 저장", "자리표·모둠·시험", "인쇄 기능"] },
  { name: "분필",   price: "2,900원~", chalk: "🖍️", features: ["모든 로그인 기능", "계절 이모지 세트", "10종 글씨체", "메모 저장"] },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* 네비 */}
      <nav className="bg-[#1B4332] sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#F2C94C] flex items-center justify-center text-[#1B4332] font-black">쌤</div>
            <span className="text-white font-bold text-lg">쌤툴</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="text-[#A8D5B7] text-xs hover:text-white transition-colors hidden sm:block">개인정보처리방침</Link>
            <Link href="/app" className="px-4 py-2 bg-[#F2C94C] text-[#1B4332] text-sm font-bold rounded-lg hover:bg-[#EAB800] transition-colors">
              앱 시작하기 →
            </Link>
          </div>
        </div>
      </nav>

      {/* 히어로 */}
      <section className="bg-[#1B4332] text-white pb-16 pt-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-[#2D6A4F] px-3 py-1.5 rounded-full text-[#A8D5B7] text-xs font-semibold mb-6">
            🎉 한국어 강사를 위한 수업 도구 모음
          </div>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
            수업 준비,<br />
            <span className="text-[#F2C94C]">쌤툴</span>로 5분 안에
          </h1>
          <p className="text-[#A8D5B7] text-lg mb-8 leading-relaxed">
            이름표·자리표·랜덤뽑기·모둠나누기·시험순서표<br className="hidden sm:block" />
            한국어 어학원 강사를 위한 수업 도구를 한 곳에서
          </p>
          <Link href="/app"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#F2C94C] text-[#1B4332] font-black text-lg rounded-2xl hover:bg-[#EAB800] transition-all hover:scale-105 shadow-lg">
            무료로 시작하기 →
          </Link>
          <p className="text-[#A8D5B7] text-xs mt-4">로그인 없이 바로 사용 가능</p>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="py-16 max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-black text-[#1B4332] text-center mb-2">8가지 수업 도구</h2>
        <p className="text-center text-[#4A4A4A] text-sm mb-10">매번 새로 만들지 말고, 쌤툴에서 바로 사용하세요</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white rounded-2xl border border-[#E8E0D0] p-4 hover:border-[#1B4332] hover:shadow-md transition-all">
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="font-bold text-[#1B4332] text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-[#4A4A4A] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 요금제 */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-black text-[#1B4332] text-center mb-2">간단한 요금제</h2>
          <p className="text-center text-[#4A4A4A] text-sm mb-10">기본 기능은 모두 무료예요</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANS.map((plan, i) => (
              <div key={plan.name} className={`rounded-2xl border-2 p-5 ${i === 1 ? "border-[#1B4332] bg-[#F0FFF4]" : "border-[#E8E0D0] bg-white"}`}>
                <p className="font-black text-[#1B4332] text-lg">{plan.name}</p>
                <p className="text-2xl font-black text-[#1B4332] mt-1 mb-4">{plan.price}</p>
                <ul className="space-y-1.5">
                  {plan.features.map(f => (
                    <li key={f} className="text-xs text-[#4A4A4A] flex items-center gap-1.5">
                      <span className="text-[#1B4332]">✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 관련 앱 */}
      <section className="py-16 max-w-3xl mx-auto px-4">
        <h2 className="text-xl font-black text-[#1B4332] text-center mb-8">함께 사용하면 좋은 앱</h2>
        <div className="space-y-3">
          {[
            { icon:"🎤", name:"소리튜터", desc:"AI 한국어 발음 교정", href:"https://sori-tutor.vercel.app" },
            { icon:"📚", name:"우리반",   desc:"숙제·작문 AI 피드백 + 반 관리", href:"https://wooriban.vercel.app" },
            { icon:"🪪", name:"아이엠",   desc:"AI 디지털 명함 서비스", href:"https://aim-card.vercel.app" },
          ].map(app => (
            <a key={app.name} href={app.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white border border-[#E8E0D0] rounded-xl px-4 py-3 hover:border-[#1B4332] hover:shadow-md transition-all group">
              <span className="text-2xl">{app.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-sm text-[#1B4332]">{app.name}</p>
                <p className="text-xs text-[#4A4A4A]">{app.desc}</p>
              </div>
              <span className="text-[#1B4332] group-hover:translate-x-1 transition-transform">→</span>
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#1B4332] text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-2xl font-black text-white mb-3">지금 바로 시작해보세요</h2>
          <p className="text-[#A8D5B7] text-sm mb-8">회원가입 없이 이름표·타이머·랜덤뽑기를 무료로 사용할 수 있어요</p>
          <Link href="/app" className="inline-flex items-center gap-2 px-8 py-4 bg-[#F2C94C] text-[#1B4332] font-black text-lg rounded-2xl hover:bg-[#EAB800] transition-all hover:scale-105">
            쌤툴 시작하기 →
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-[#111] text-[#666] text-xs py-8 px-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <p className="text-white font-bold mb-1">쌤툴</p>
            <p>한국어 강사 수업 도구 모음</p>
            <p className="mt-1">ot.helper7@gmail.com</p>
          </div>
          <div className="flex flex-wrap gap-4 items-start">
            <Link href="/privacy" className="hover:text-white transition-colors">개인정보처리방침</Link>
            <Link href="/terms"   className="hover:text-white transition-colors">이용약관</Link>
            <Link href="/refund"  className="hover:text-white transition-colors">환불정책</Link>
            <Link href="/shop"    className="hover:text-white transition-colors">🖍️ 분필 충전</Link>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mt-6 pt-4 border-t border-[#222] text-[11px]">
          <p>© 2026 쌤툴. All rights reserved.</p>
          <p className="mt-1">이 사이트는 구글 애드센스, 카카오 애드핏, 쿠팡 파트너스를 통한 광고 수익과 제휴 마케팅에 참여합니다.</p>
        </div>
      </footer>
    </div>
  );
}