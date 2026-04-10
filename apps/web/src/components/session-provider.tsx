"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { apiFetch, clearSession, readSession, saveSession } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function hydrateSession() {
      const session = readSession();

      if (!active) {
        return;
      }

      setUser(session);
      setLoading(false);
    }

    void hydrateSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user && pathname !== "/" && pathname !== "/login") {
      router.replace("/login");
    }
  }, [loading, pathname, router, user]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      loading,
      async signIn(email: string) {
        const result = await apiFetch<{ user: SessionUser }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        saveSession(result.user);
        setUser(result.user);
      },
      signOut() {
        clearSession();
        setUser(null);
        router.push("/login");
      },
    }),
    [loading, router, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("SessionProvider가 필요합니다.");
  }

  return context;
}
