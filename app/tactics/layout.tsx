/** 전기 모드는 본편 셸(사이드바 · 상단바) 없이 독립 화면으로 뜹니다. */
export default function TacticsLayout({ children }: { children: React.ReactNode }) { return <div className="tx-root">{children}</div>; }
