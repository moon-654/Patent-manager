"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/session-provider";

const demoUsers = [
  { email: "inventor@ashimori.example", label: "발명자", description: "신고서 작성, 보상 확인" },
  { email: "ip@ashimori.example", label: "특허담당", description: "접수, 승계, 특허/OA 운영" },
  { email: "committee@ashimori.example", label: "심의위원", description: "평가표 작성, 회의록 승인" },
  { email: "admin@ashimori.example", label: "관리자", description: "정책 버전, 승인, 권한 관리" },
];

export default function LoginPage() {
  const { signIn } = useSession();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f6efe4_0%,#eadbc5_100%)] px-6 py-10 text-[#1d1a17]">
      <div className="mx-auto max-w-6xl">
        <p className="text-[10px] uppercase tracking-[0.5em] text-[#8c6340]">Demo Access</p>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-[32px] border border-black/10 bg-[#1d1a17] p-8 text-[#f8f0e3] shadow-[0_30px_120px_rgba(0,0,0,0.18)]">
            <h1 className="font-display text-5xl">권한별 워크플로우 로그인</h1>
            <p className="mt-5 text-sm leading-7 text-[#d4c7ba]">
              시드 사용자 기반으로 각 역할의 메뉴 노출과 작업 흐름을 바로 확인할 수 있습니다.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            {demoUsers.map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={async () => {
                  setLoadingEmail(user.email);
                  await signIn(user.email);
                  router.push("/dashboard");
                }}
                className="rounded-[28px] border border-black/10 bg-white/60 p-6 text-left shadow-[0_20px_80px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:bg-white"
              >
                <p className="text-[10px] uppercase tracking-[0.38em] text-[#8c6340]">{user.label}</p>
                <h2 className="mt-4 font-display text-3xl">{user.email.split("@")[0]}</h2>
                <p className="mt-3 text-sm leading-6 text-[#5d4d41]">{user.description}</p>
                <p className="mt-6 text-sm font-medium text-[#1d1a17]">
                  {loadingEmail === user.email ? "로그인 중..." : "이 사용자로 시작"}
                </p>
              </button>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}

