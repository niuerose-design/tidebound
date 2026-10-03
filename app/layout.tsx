import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TIDEBOUND · 심연의 낚시꾼 (오픈베타)",
  description: "끝없이 펼쳐지는 낚시 방치형 RPG. 물고기를 사냥하고, 스킬을 조합하고, 심연 너머로 항해하세요.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
