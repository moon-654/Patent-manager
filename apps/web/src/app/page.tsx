import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f5eee2_0%,#eadcc8_100%)] text-[#211b16]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(198,138,74,0.25),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(44,36,31,0.12),_transparent_35%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-between p-6 lg:p-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.45em] text-[#8c6340]">
              Patent Atelier MVP
            </p>
            <h1 className="font-display text-4xl lg:text-6xl">직무발명 통합 관리 시스템</h1>
          </div>
          <Link
            href="/login"
            className="rounded-full bg-[#1d1a17] px-5 py-3 text-sm text-[#f8f0e3] transition hover:bg-[#3a3029]"
          >
            데모 로그인
          </Link>
        </header>

        <section className="grid items-end gap-8 py-16 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-4 text-[11px] uppercase tracking-[0.55em] text-[#8c6340]">
              Submission · Review · Patent · Reward · Policy
            </p>
            <h2 className="max-w-4xl font-display text-6xl leading-[0.95] lg:text-8xl">
              신고서의 한 줄이
              <br />
              보상 지급까지
              <br />
              끊기지 않게.
            </h2>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[#4b4037]">
              아시모리코리아의 직무발명 규정을 운영 가능한 화면과 API로 연결한 MVP입니다.
              발명 신고, 심의, OA, 보상, 정책 버전까지 한 흐름으로 확인할 수 있습니다.
            </p>
          </div>

          <div className="rounded-[32px] border border-black/10 bg-[#1d1a17] p-6 text-[#f8f0e3] shadow-[0_24px_100px_rgba(0,0,0,0.18)]">
            <p className="text-[10px] uppercase tracking-[0.38em] text-[#d8af84]">Included in MVP</p>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-[#d9cec1]">
              <li>발명 신고 작성, 제출, 접수, 승계 결정</li>
              <li>심의위원 평가표와 회의록 관리</li>
              <li>특허 마스터, OA, 문서 아카이브</li>
              <li>보상 생성, 배분, 통지, 지급 처리</li>
              <li>정책 버전, 평가기준, 금액 매트릭스, 시뮬레이션</li>
            </ul>
            <Link
              href="/login"
              className="mt-8 inline-flex rounded-full border border-[#d8af84]/40 px-5 py-3 text-sm text-[#f8f0e3] transition hover:border-[#d8af84] hover:text-[#d8af84]"
            >
              시드 사용자로 체험하기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

