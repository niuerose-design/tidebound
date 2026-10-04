'use client';
import { ChevronDown } from 'lucide-react';
import type { CombatStats } from '@/game/types';
import { STAT_LABELS, RATING_STATS, ATTRIBUTE_EFFECTS, statDisplay, statDeltaDisplay } from '@/game/data/progression';
import { BALANCE, STATUS_TUNING, SKILL_FORMULA } from '@/game/data/balance';
import { STAT_SOURCES, statSourceLabel, type StatTrace } from '@/game/systems/stats';

/** 상한이나 적용 방식이 헷갈리는 능력치의 설명. 상세보기를 펼치면 아래에 보입니다. */
const STAT_NOTES: Partial<Record<keyof CombatStats, string>> = {
    speed: `속도 자체에는 상한이 없습니다(최소 1). 효과는 상대 속도와의 비율로 정해져 비율이 커질수록 한계에 닿습니다. 연속 행동 확률 = ${BALANCE.chainCoefficient} × log₂(내 속도 ÷ 상대 속도)라 상대의 ${Math.round(2 ** (1 / BALANCE.chainCoefficient))}배에서 100%가 되고, 명중 보정은 약 1.7배에서 +6%p로 멈춥니다. 한 턴에 최대 ${BALANCE.chainMaxActions}번 행동. 가속 ×${1 + STATUS_TUNING.hasteMultiplier} · 감속 ×${1 - STATUS_TUNING.slowMultiplier}.`,
    hpRegen: `행동할 때마다(연속·추가 행동 포함) 이만큼 체력을 되찾습니다. 최대 체력을 넘지 않습니다. 체질 1마다 +${ATTRIBUTE_EFFECTS.vit.hpRegen}, 소수점은 버립니다.`,
    manaRegen: '행동할 때마다(연속·추가 행동 포함) 이만큼 마나를 되찾습니다. 최대 마나를 넘지 않습니다.',
    evasion: '회피 수치는 50%를 넘으면 효율이 줄어 90%에 수렴합니다. 실제 적중률 = 상대 명중 − 내 회피 + 속도 보정(1~99.5%).',
    accuracy: '실제 적중률 = 내 명중 − 상대 회피 + 속도 보정(최대 ±6%p), 1~99.5% 범위.',
    crit: `치명타 확률 상한 ${SKILL_FORMULA.critCap * 100}%. 넘는 몫 100%p마다 극 치명타 확률 +${SKILL_FORMULA.superCritPerHundred * 100}%.`,
    superCrit: `치명타가 뜬 뒤 이 확률로 극 치명타가 됩니다. 극 치명타는 치명 피해에 ×${SKILL_FORMULA.superCritBonus}를 더 곱합니다. 치명타 확률이 ${SKILL_FORMULA.critCap * 100}%를 넘은 몫 100%p마다 +${SKILL_FORMULA.superCritPerHundred * 100}%입니다.`,
    penetration: '방어 관통 상한 60%. 스킬의 관통 보너스를 더해도 85%까지입니다.',
    lifesteal: `흡혈 상한 30%. 한 번의 행동으로 최대 체력 × 흡혈률 × ${SKILL_FORMULA.lifestealHpCap * 100}%까지만 회복합니다.`,
};

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
        {STAT_NOTES[k] && <p className="stat-note">{STAT_NOTES[k]}</p>}
    </details>;
}
/** 상세보기의 정확한 값: 소수점까지 보여줍니다. */
function exact(k: keyof CombatStats, n: number) {
    if (RATING_STATS.has(k)) return `${(n * 100).toFixed(2)}`;
    if (k === 'critDamage') return `×${n.toFixed(3)}`;
    return Number.isInteger(n) ? n.toLocaleString() : statDisplay(k, n);
}
