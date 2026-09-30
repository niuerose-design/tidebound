'use client';
import { ChevronDown } from 'lucide-react';
import type { CombatStats } from '@/game/types';
import { STAT_LABELS, RATING_STATS, statDisplay, statDeltaDisplay } from '@/game/data/progression';
import { STAT_SOURCES, statSourceLabel, type StatTrace } from '@/game/systems/stats';

/** 원인별 증감을 합쳐 보여줍니다. 배율로 적용된 원인은 배율과 실제 증감을 같이 표시합니다. */
export function StatBreakdown({ k, value, trace, wide }: { k: keyof CombatStats; value: number; trace: StatTrace; wide?: boolean }) {
    const rows = STAT_SOURCES.map(source => {
        const parts = (trace[k] || []).filter(x => x.source === source);
        const factors = parts.filter(x => x.factor !== undefined);
        return { source, delta: parts.reduce((a, x) => a + x.delta, 0), factor: factors.length ? factors.reduce((a, x) => a * x.factor!, 1) : undefined, any: parts.length > 0 };
    }).filter(r => r.any && Math.abs(r.delta) > 1e-9);
    return <details className={`stat-breakdown${wide ? ' wide' : ''}`}>
        <summary><span>{STAT_LABELS[k]}{RATING_STATS.has(k) ? ' 수치' : ''}<ChevronDown size={12} className="stat-breakdown-chevron"/></span><strong>{statDisplay(k, value)}</strong></summary>
        <ul>{rows.map((r, i) => <li key={r.source}><span>{statSourceLabel(k, r.source)}</span><b>{i === 0 && r.source === 'base' ? statDisplay(k, r.delta).replace(/^\+/, '') : r.factor !== undefined && r.factor !== 1 ? `×${r.factor.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} (${statDeltaDisplay(k, r.delta)})` : statDeltaDisplay(k, r.delta)}</b></li>)}
            <li className="stat-breakdown-total"><span>최종</span><b>{exact(k, value)}</b></li></ul>
    </details>;
}
/** 상세보기의 정확한 값: 소수점까지 보여줍니다. */
function exact(k: keyof CombatStats, n: number) {
    if (RATING_STATS.has(k)) return `${(n * 100).toFixed(2)}`;
    if (k === 'critDamage') return `×${n.toFixed(3)}`;
    return Number.isInteger(n) ? n.toLocaleString() : statDisplay(k, n);
}
