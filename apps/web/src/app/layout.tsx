import type { Metadata } from "next";
import { Bodoni_Moda, Noto_Sans_KR } from "next/font/google";

import "./globals.css";
import { SessionProvider } from "@/components/session-provider";

const bodoni = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
});

const noto = Noto_Sans_KR({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "직무발명 통합 관리 시스템",
  description: "MVP workspace for invention, patent, reward, and policy management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${bodoni.variable} ${noto.variable}`}>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

