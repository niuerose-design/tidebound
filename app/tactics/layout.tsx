import type { Viewport } from 'next';
/** HIG(docs/ui-hig.md): 화면 끝까지 그리되 safe-area 여백을 쓰고, 핀치 확대는 막지 않습니다. */
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0e191f' };
/** 전기 모드는 본편 셸(사이드바 · 상단바) 없이 독립 화면으로 뜹니다. */
export default function TacticsLayout({ children }: { children: React.ReactNode }) { return <div className="tx-root">{children}</div>; }
