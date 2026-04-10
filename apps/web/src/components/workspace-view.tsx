"use client";

import { useSession } from "./session-provider";
import { AppShell } from "./app-shell";

export function WorkspaceView({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();

  if (loading) {
    return <div className="min-h-screen bg-[#f4ecdf] p-10 text-[#1d1a17]">세션을 불러오는 중입니다.</div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-[#f4ecdf] p-10 text-[#1d1a17]">로그인 페이지로 이동합니다.</div>;
  }

  return <AppShell>{children}</AppShell>;
}

