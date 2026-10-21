'use client';
/** v3.392 능력치 상세 줄(새 토대): 이름 · 값 한 줄을 누르면 출처별 기여 · 최종 · 계산식 · 설명이 펼쳐집니다(옛 stat-breakdown 의 계산 그대로). */
import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CombatStats, State } from '@/game/types';
import { STAT_LABELS, RATING_STATS, ATTRIBUTE_EFFECTS, statDisplay, statDeltaDisplay } from '@/game/data/progression';
import { BALANCE, STATUS_TUNING, SKILL_FORMULA } from '@/game/data/balance';
import { STAT_SOURCES, statSourceLabel, type StatTrace } from '@/game/systems/stats';
import { masteryMultipliers } from '@/game/systems/mastery';
import { RANK_PERKS, rankTitle, rankPerkLevel, rankPerkValue } from '@/game/data/rank';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

/** 상한이나 적용 방식이 헷갈리는 능력치의 설명. 펼치면 아래에 보입니다. */
const STAT_NOTES: Partial<Record<keyof CombatStats, string>> = {
    speed: `속도 자체에는 상한이 없습니다(최소 1). 효과는 상대 속도와의 비율로 정해져 비율이 커질수록 한계에 닿습니다. 연속 행동 확률 = ${BALANCE.chainCoefficient} × log₂(내 속도 ÷ 상대 속도)라 상대의 ${Math.round(2 ** (1 / BALANCE.chainCoefficient))}배에서 100%가 되고, 명중 보정은 약 1.7배에서 +6%p로 멈춥니다. 한 턴에 최대 ${BALANCE.chainMaxActions}번 행동. 가속 ×${1 + STATUS_TUNING.hasteMultiplier} · 감속 ×${1 - STATUS_TUNING.slowMultiplier}.`,
    hpRegen: `행동할 때마다(연속·추가 행동 포함) 이만큼 체력을 되찾습니다. 최대 체력을 넘지 않습니다. 체질 1마다 +${ATTRIBUTE_EFFECTS.vit.hpRegen}, 소수점은 버립니다.`,
    manaRegen: '행동할 때마다(연속·추가 행동 포함) 이만큼 마나를 되찾습니다. 최대 마나를 넘지 않습니다.',
    evasion: '회피 수치는 50%를 넘으면 효율이 줄어 90%에 수렴합니다. 실제 적중률 = 상대 명중 − 내 회피 + 속도 보정(1~99.5%).',
    accuracy: '실제 적중률 = 내 명중 − 상대 회피 + 속도 보정(최대 ±6%p), 1~99.5% 범위.',
    crit: `치명타 확률 상한 ${SKILL_FORMULA.critCap * 100}%. 넘는 몫 100%p마다 극 치명타 확률 +${SKILL_FORMULA.superCritPerHundred * 100}%.`,
    superCrit: `치명타가 뜬 뒤 이 확률로 극 치명타가 됩니다. 극 치명타는 치명 피해에 ×${SKILL_FORMULA.superCritBonus}를 더 곱합니다. 치명타 확률이 ${SKILL_FORMULA.critCap * 100}%를 넘은 몫 100%p마다 +${SKILL_FORMULA.superCritPerHundred * 100}%입니다.`,
    bossDamage: '보스 · 사냥감(월드보스 포함)에게 주는 직접 피해. 장비 부위 · 칠흑 세트 · 칠흑 옵션마다 곱연산이라 모을수록 크게 붙습니다. 지속 피해(출혈 · 중독 · 화상)에는 붙지 않습니다.',
    penetration: '방어 관통은 출처끼리 곱연산(남은 방어의 x%를 무시)이라 1에 닿지 않습니다. 장비는 부위마다 따로 곱하고, 스킬의 관통 보너스는 그 위에 더합니다(합계 최대 85%).',
    lifesteal: `흡혈 상한 30%. 한 번의 행동으로 최대 체력 × 흡혈률 × ${SKILL_FORMULA.lifestealHpCap * 100}%까지만 회복합니다.`,
};
type Row = [label: ReactNode, value: ReactNode, total?: boolean];

/** 접히는 한 줄: 머리(이름 · 값) + 출처 목록 + 설명. */
export function FoldRow({ label, value, rows, note, className }: { label: ReactNode; value: ReactNode; rows: Row[]; note?: ReactNode; className?: string }) {
    const [open, setOpen] = useState(false);
    return <Collapsible open={open} onOpenChange={setOpen} className={cn('border-b border-line/60', className)}>
        <CollapsibleTrigger className="flex min-h-9 w-full items-center justify-between gap-3 rounded-s py-1 text-left text-s outline-none hover:text-ink-1 focus-visible:ring-[3px] focus-visible:ring-accent/50">
            <span className="inline-flex min-w-0 items-center gap-1 text-ink-2"><span className="truncate">{label}</span><ChevronDown size={12} className={cn('shrink-0 transition-transform', open && 'rotate-180')} aria-hidden/></span>
            <strong className="shrink-0 font-num text-ink-1">{value}</strong>
        </CollapsibleTrigger>
        <CollapsibleContent>
            <ul className="mb-2 grid gap-0.5 rounded-s bg-surface-1 p-2 text-xs">{rows.map(([k, v, total], i) => <li key={i} className={cn('flex items-baseline justify-between gap-3', total && 'mt-1 border-t border-line pt-1 font-semibold')}><span className="text-ink-3">{k}</span><b className="text-right font-num text-ink-1">{v}</b></li>)}</ul>
            {note && <p className="mb-2 text-xs leading-relaxed text-ink-3">{note}</p>}
        </CollapsibleContent>
    </Collapsible>;
}

/**
 * 원인별 증감을 합쳐 보여줍니다. 배율로 적용된 원인은 배율과 실제 증감을 같이 표시합니다.
 * event: 서버 이벤트·제단 축복 배율. (1 + 보너스)에 곱해지는 능력치는 이벤트를 곱한 최종값을 보여 주고, 드롭처럼 확률 전체에 곱해지는 능력치(eventNote)는 값은 그대로 두고 이벤트 줄만 덧붙입니다.
 */
export function StatRow({ k, value: raw, trace, event = 1, eventNote, final }: { k: keyof CombatStats; value: number; trace: StatTrace; event?: number; eventNote?: string; /** 이 보너스가 최종 배율·확률로 이어지는 계산식(골드·경험치·드롭). */ final?: string }) {
    const scaled = event !== 1 && !eventNote, value = scaled ? (1 + raw) * event - 1 : raw;
    const parts = STAT_SOURCES.map(source => {
        const xs = (trace[k] || []).filter(x => x.source === source), factors = xs.filter(x => x.factor !== undefined);
        return { source, delta: xs.reduce((a, x) => a + x.delta, 0), factor: factors.length ? factors.reduce((a, x) => a * x.factor!, 1) : undefined, any: xs.length > 0 };
    }).filter(r => r.any && Math.abs(r.delta) > 1e-9);
    const rows: Row[] = parts.map((r, i) => [statSourceLabel(k, r.source), i === 0 && r.source === 'base' ? statDisplay(k, r.delta).replace(/^\+/, '') : r.factor !== undefined && r.factor !== 1 ? `×${r.factor.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} (${statDeltaDisplay(k, r.delta)})` : statDeltaDisplay(k, r.delta)]);
    if (event !== 1) rows.push([`서버 이벤트${eventNote ? ` · ${eventNote}` : ''}`, `×${Number(event.toFixed(3))}${scaled ? ` (${statDeltaDisplay(k, value - raw)})` : ''}`]);
    rows.push(['최종', exact(k, value), true]);
    if (final) rows.push(['계산식', final, true]);
    return <FoldRow label={`${STAT_LABELS[k]}${RATING_STATS.has(k) ? ' 수치' : ''}`} value={statDisplay(k, value)} rows={rows} note={STAT_NOTES[k]}/>;
}
function exact(k: keyof CombatStats, n: number) {
    if (RATING_STATS.has(k)) return `${(n * 100).toFixed(2)}`;
    if (k === 'critDamage') return `×${n.toFixed(3)}`;
    return Number.isInteger(n) ? n.toLocaleString() : statDisplay(k, n);
}

/** 숙련도 획득 보너스: 배율별 기여와 처치당 기대 숙련. 계급 특전 숙련 훈련은 배율 밖의 고정값이라 배율을 곱한 뒤에 더합니다. */
export function MasteryRow({ s }: { s: State }) {
    const m = masteryMultipliers(s), x = (n: number) => `×${n.toFixed(2)}`, drill = rankPerkLevel(s, 'drill');
    const rows: Row[] = [['기본 획득', `+${m.base - drill}`], ['끝없는 수련 · 계정 몬스터', x(m.research)], ...(m.focus !== 1 ? [['계열 집중', x(m.focus)] as Row] : []), ...(m.event !== 1 ? [['이벤트', x(m.event)] as Row] : []), ...(drill ? [[`계급 특전 · 숙련 훈련 ${drill}단계 (배율 밖)`, `+${drill}`] as Row] : []), ['계산식', `${m.base - drill} × ${m.total.toFixed(2)}${drill ? ` + ${drill}` : ''} ≈ ${m.perKill.toFixed(1)}`, true]];
    return <FoldRow label="숙련도 획득" value={`처치당 ≈ ${m.perKill.toFixed(1)}`} rows={rows} note="처치할 때마다 현재 직업과 장착 스킬의 숙련이 오릅니다. 조건부 숙련 스킬 보너스(지정 적 처치 시)와 무리 마릿수는 따로 더해집니다."/>;
}
/** 계급 특전 요약: 무엇을 몇 단계 켰고 실제로 얼마가 적용되는지. */
export function RankPerkRow({ s }: { s: State }) {
    const active = RANK_PERKS.map(p => ({ p, level: rankPerkLevel(s, p.id) })).filter(x => x.level > 0);
    const value = (id: typeof RANK_PERKS[number]['id'], level: number) => id === 'tally' ? `처치 1마리 = 계급 경험치 ${1 + level}마리` : id === 'drill' ? `처치 숙련 +${level} (고정)` : `${(rankPerkValue(s, id) * 100).toFixed(1)}% (${id === 'medal' ? 'SP' : '세계석'} +1 · 사냥터만)`;
    return <FoldRow label={`계급 특전 · ${rankTitle(s)}`} value={active.length ? `${active.reduce((a, x) => a + x.level, 0)}P 적용` : '없음'} rows={active.map(({ p, level }) => [`${p.name} ${level}단계`, value(p.id, level)] as Row)}
        note={active.length ? '숙련 훈련은 위 숙련도 획득에 배율과 따로 더해집니다(계열 집중 · 이벤트 · 연구 · 승천 배율을 받지 않음). 전공 훈장·보급품은 던전에서는 발동하지 않습니다.' : '치장 → 계급에서 진급 포인트로 특전을 켜면 여기에 적용값이 보입니다.'}/>;
}
