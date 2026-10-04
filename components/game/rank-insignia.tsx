'use client';
/**
 * v27.80 계급장 그림. 대한민국 육군 계급장 도안을 따라 그린 SVG입니다(외부 이미지 없이 그립니다).
 * 병: 작대기(이등병 1 ~ 병장 4) · 부사관: 갈매기(하사 1 ~ 상사 3, 원사는 3 + 별) · 위관: 다이아몬드(소위 1 ~ 대위 3) · 영관: 무궁화(소령 1 ~ 대령 3) · 장성: 별(준장 1 ~ 중장 3).
 */
const GOLD = '#e9c86a', GOLD_DARK = '#b8933a', BG = '#1d2a22';
function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
    const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`; }).join(' ');
    return <polygon points={pts} fill={GOLD} stroke={GOLD_DARK} strokeWidth=".8"/>;
}
function Mugunghwa({ cx, cy, r }: { cx: number; cy: number; r: number }) {
    return <g>{Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return <ellipse key={i} cx={(cx + r * .55 * Math.cos(a)).toFixed(1)} cy={(cy + r * .55 * Math.sin(a)).toFixed(1)} rx={r * .5} ry={r * .34} transform={`rotate(${(a * 180 / Math.PI).toFixed(0)} ${(cx + r * .55 * Math.cos(a)).toFixed(1)} ${(cy + r * .55 * Math.sin(a)).toFixed(1)})`} fill={GOLD} stroke={GOLD_DARK} strokeWidth=".7"/>; })}<circle cx={cx} cy={cy} r={r * .28} fill={GOLD_DARK}/></g>;
}
/** index: RANKS 배열 번호(0 이등병 ~ 16 중장). size: 픽셀. */
export function RankInsignia({ index, size = 28, title }: { index: number; size?: number; title?: string }) {
    const W = 48, H = 48, els: React.ReactNode[] = [];
    if (index <= 3) { // 병: 작대기 1~4
        const n = index + 1, gap = 9, top = 24 - (n - 1) * gap / 2;
        for (let i = 0; i < n; i++) els.push(<rect key={i} x="9" y={top + i * gap - 2.5} width="30" height="5" rx="1" fill={GOLD} stroke={GOLD_DARK} strokeWidth=".8"/>);
    } else if (index <= 7) { // 부사관: 갈매기 1~3, 원사는 3 + 별
        const n = Math.min(3, index - 3), gap = 8, base = 24 + (n - 1) * gap / 2 + (index === 7 ? 3 : 0);
        for (let i = 0; i < n; i++) { const y = base - i * gap; els.push(<polyline key={i} points={`8,${y + 6} 24,${y - 6} 40,${y + 6}`} fill="none" stroke={GOLD} strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round"/>); }
        if (index === 7) els.push(<Star key="s" cx={24} cy={base - n * gap - 2} r={5.5}/>);
    } else if (index <= 10) { // 위관: 다이아몬드 1~3
        const n = index - 7, gap = 13, cx0 = 24 - (n - 1) * gap / 2;
        for (let i = 0; i < n; i++) els.push(<polygon key={i} points={`${cx0 + i * gap},15 ${cx0 + i * gap + 6},24 ${cx0 + i * gap},33 ${cx0 + i * gap - 6},24`} fill={GOLD} stroke={GOLD_DARK} strokeWidth=".8"/>);
    } else if (index <= 13) { // 영관: 무궁화 1~3
        const n = index - 10, gap = 15, cx0 = 24 - (n - 1) * gap / 2;
        for (let i = 0; i < n; i++) els.push(<Mugunghwa key={i} cx={cx0 + i * gap} cy={24} r={8}/>);
    } else { // 장성: 별 1~3
        const n = index - 13, gap = 14, cx0 = 24 - (n - 1) * gap / 2;
        for (let i = 0; i < n; i++) els.push(<Star key={i} cx={cx0 + i * gap} cy={24} r={7}/>);
    }
    return <svg className="rank-insignia" width={size} height={size} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>{title && <title>{title}</title>}<rect x="1" y="1" width={W - 2} height={H - 2} rx="6" fill={BG} stroke="#3b4d42" strokeWidth="1.5"/>{els}</svg>;
}
