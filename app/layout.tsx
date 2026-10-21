import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "판게아 RPG (오픈베타)",
  description: "끝없이 펼쳐지는 사냥 방치형 RPG. 몬스터를 사냥하고, 스킬을 조합하고, 빅토리아 아일랜드 너머로 모험하세요.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

// v3.370 HIG: 화면 끝(노치 · 홈 표시줄)까지 그리되 safe-area 여백을 쓰고, 확대(핀치 줌)는 막지 않습니다.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0e191f" };

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
