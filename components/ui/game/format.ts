/** v3.374 숫자 표기(게임 범용): 큰 수는 만 · 억 · 조로 줄이고, 정확한 값은 툴팁에 둡니다. */
const exact = new Intl.NumberFormat('ko-KR');
export const formatExact = (v: number) => exact.format(Math.round(v));
export function formatShort(v: number, digits = 1): string {
    const a = Math.abs(v), sign = v < 0 ? '-' : '';
    const unit = (n: number, u: string) => { const x = a / n; return sign + (x >= 100 ? Math.round(x).toString() : x.toFixed(digits).replace(/\.0+$/, '')) + u; };
    if (a >= 1e12) return unit(1e12, '조');
    if (a >= 1e8) return unit(1e8, '억');
    if (a >= 1e4) return unit(1e4, '만');
    return sign + exact.format(Math.round(a));
}
export const formatPercent = (v: number, digits = 1) => `${(v * 100).toFixed(digits).replace(/\.0+$/, '')}%`;
