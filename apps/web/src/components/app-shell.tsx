"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Bell, FileChartColumn, FilePenLine, Gavel, Landmark, LogOut, ShieldCheck } from "lucide-react";

import { useSession } from "./session-provider";

const navigation = [
  { href: "/dashboard", label: "운영 대시보드", icon: Landmark },
  { href: "/submissions", label: "발명 신고", icon: FilePenLine },
  { href: "/evaluations", label: "심의·회의", icon: Gavel },
  { href: "/patents", label: "특허·OA", icon: ShieldCheck },
  { href: "/rewards", label: "보상 관리", icon: FileChartColumn },
  { href: "/policies", label: "정책 설정", icon: Bell },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useSession();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(184,115,51,0.24),_transparent_28%),linear-gradient(180deg,#f4ecdf_0%,#eaddca_100%)] text-[#f9f3ea]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-cols-1 gap-6 p-4 lg:grid-cols-[300px_1fr] lg:p-6">
        <aside className="rounded-[32px] border border-black/10 bg-[#1d1a17] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.22)]">
          <div className="mb-10 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.45em] text-[var(--color-accent-soft)]">
              Ashimori Korea
            </p>
            <div>
              <h1 className="font-display text-4xl text-[var(--color-paper)]">
                Patent
                <br />
                Atelier
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#b9aea0]">
                직무발명 신고부터 정책 버전 관리까지 한 화면에서 이어지는 업무 포털
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center justify-between rounded-2xl px-4 py-3 transition",
                    active
                      ? "bg-[var(--color-accent)] text-[#1d1a17]"
                      : "bg-white/0 text-[#ded4c7] hover:bg-white/6",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.28em]">
                    {item.href.replace("/", "")}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--color-accent-soft)]">
              Active Identity
            </p>
            <p className="mt-3 font-display text-2xl text-[var(--color-paper)]">{user?.name}</p>
            <p className="mt-2 text-sm text-[#cbbfb1]">
              {user?.department} · {user?.positionName}
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-[#948776]">
              {user?.roles.map((role) => `${role.code}/${role.scopeType}`).join(" · ")}
            </p>
            <button
              type="button"
              onClick={signOut}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-[#f6efe5] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <LogOut className="size-4" />
              세션 종료
            </button>
          </div>
        </aside>

        <main className="rounded-[32px] border border-black/10 bg-[#2c241f]/95 p-5 shadow-[0_30px_120px_rgba(44,36,31,0.35)] lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

