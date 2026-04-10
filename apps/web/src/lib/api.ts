"use client";

import type { SessionUser } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
const SESSION_KEY = "patent-manager-session";

export function documentDownloadUrl(
  id: string,
  disposition: "inline" | "attachment" = "inline",
) {
  return `${API_URL}/documents/${id}/download?disposition=${disposition}`;
}

export function readSession(): SessionUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

export function saveSession(user: SessionUser) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  userId?: string,
): Promise<T> {
  const session = readSession();
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(session?.id || userId
        ? { "x-user-id": userId ?? session?.id ?? "" }
        : {}),
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "API 요청에 실패했습니다.");
  }

  return (await response.json()) as T;
}
