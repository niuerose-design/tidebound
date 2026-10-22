'use client';
/** v3.382 도감 화면 공용 조각(재설계 4단계). 토큰 · 게임 범용 조각만 조합합니다. */
import { useState, type ReactNode } from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';
import type { State, Action, Stats } from '@/game/types';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { StatBar, KeyValueList, formatExact } from '@/components/ui/game';
import { cn } from '@/lib/utils';
import { BALANCE } from '@/game/data/balance';
import { PROGRESSION, statDisplay, percent } from '@/game/data/progression';
import { SKILLS } from '@/game/data/skills';
import { ENEMY_SKILLS } from '@/game/data/encounters';
import { SWARM_SIZES, SWARM_UNLOCK } from '@/game/data/world';
import { VARIANTS } from '@/game/data/variants';
import { BOOK_ECOLOGY, BOOK_REVEAL } from '@/game/data/book-traits';
import { bookEcology, bookStage } from '@/game/systems/book';
import { bookPending, bookTierReq } from '@/game/systems/progression';
import { hitChance } from '@/game/systems/stats';
import { enemySkillBrief } from '@/game/systems/skill-description';

export type Send = (a: Action) => void;
const pct = (n: number) => Number((n * 100).toFixed(1));

/** 도감 카드 틀. 미발견은 흐리게. */
export function BookCard({ undiscovered, className, children }: { undiscovered?: boolean; className?: string; children: ReactNode }) {
    return <article className={cn('grid content-start gap-3 rounded-l border border-line bg-surface-1 p-4', undiscovered && 'opacity-70', className)}>{children}</article>;
}
/** 카드 머리: 그림 · 이름 줄 · 처치 수. */
export function CardHead({ art, title, tags, count }: { art: ReactNode; title: ReactNode; tags?: ReactNode; count: ReactNode }) {
    return <header className="flex items-start gap-3">
        <div className="grid shrink-0 place-items-center rounded-m bg-surface-3 p-1">{art}</div>
        <div className="min-w-0 flex-1">
            <h4 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-m font-semibold text-ink-1">{title}{tags}</h4>
            <div className="mt-0.5 font-num text-xs tabular-nums text-ink-3">{count}</div>
        </div>
    </header>;
}
/** 제목 · 설명 한 쌍(성향 · 연구 효과 · 보상 설명). */
export function Trait({ title, children, tone }: { title: ReactNode; children: ReactNode; tone?: 'ok' | 'warn' }) {
    return <div className="rounded-m bg-surface-2 px-3 py-2 text-s">
        <div className={cn('font-semibold', tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-ink-1')}>{title}</div>
        <div className="mt-0.5 leading-relaxed text-ink-2">{children}</div>
    </div>;
}
export function Lore({ children }: { children: ReactNode }) { return <p className="text-s leading-relaxed text-ink-3">{children}</p>; }

/** 처치 50회 전에는 성향 · 스킬 · 능력치를 숨깁니다. */
export function LockedInfo({ n }: { n: number }) {
    return <Trait title="미확인 개체">{BOOK_REVEAL}회 처치하면 성향 · 스킬 · 능력치 정보가 공개됩니다 ({Math.min(n, BOOK_REVEAL)} / {BOOK_REVEAL}).</Trait>;
}
/** 연구 효과(이 몬스터 상대 주는 피해 · 받는 피해). */
export function EcologyLine({ s, id }: { s: State; id: string }) {
    const eco = bookEcology(s, id), max = { dealt: BOOK_ECOLOGY.dealt.reduce((a, n) => a + n, 0), taken: BOOK_ECOLOGY.taken.reduce((a, n) => a + n, 0) };
    return <Trait title="연구 효과" tone={eco.stages ? 'ok' : undefined}>{eco.stages
        ? <>이 몬스터 상대 주는 피해 +{pct(eco.dealt)}% · 받는 피해 -{pct(eco.taken)}% <span className="text-ink-3">(최대 +{pct(max.dealt)}% / -{pct(max.taken)}%)</span></>
        : `연구 ${BOOK_ECOLOGY.fromStage}단계(${BALANCE.bookMilestones[BOOK_ECOLOGY.fromStage - 1].toLocaleString()}회)부터 이 몬스터 상대로 강해집니다.`}</Trait>;
}
/** 변종 처치 기록: 황금 · 무리 · 거대 · 심연 · 별빛. 잡은 것은 색이 켜지고 횟수가 붙습니다. */
const MARK_COLOR: Record<string, string> = { golden: 'var(--gold-ink)', swarm: 'var(--ok)', giant: 'var(--dmg-physical)', abyssal: 'var(--dmg-split)', starlit: 'var(--dmg-magic)' };
export function VariantMarks({ s, id }: { s: State; id: string }) {
    const row = s.variantBook?.[id] || {}, golden = s.goldenBook?.[id] || 0;
    const marks = [{ id: 'golden', mark: '✦', name: '황금 개체', n: golden }, ...VARIANTS.map(v => ({ id: v.id, mark: v.mark, name: v.name, n: row[v.id] || 0 }))];
    return <span className="inline-flex flex-wrap items-center gap-1" aria-label="변종 처치 기록">{marks.map(m => <span key={m.id} title={m.n ? `${m.name} ${m.n}회 처치` : `${m.name} · 아직 못 만남`} aria-label={m.n ? `${m.name} ${m.n}회` : `${m.name} 없음`}
        className={cn('relative inline-grid size-5 place-items-center rounded-full border text-xs leading-none', m.n ? 'border-current bg-surface-3' : 'border-line text-ink-3/70')} style={m.n ? { color: MARK_COLOR[m.id] } : undefined}>{m.mark}
        {m.n > 1 && <b className="absolute -top-1.5 -right-1.5 rounded-full bg-surface-3 px-1 font-num text-[11px] leading-4 text-ink-1">{m.n > 99 ? '99+' : m.n}</b>}</span>)}</span>;
}

/* ---------- 연구 진행 ---------- */
const MILESTONES = BALANCE.bookMilestones;
function stepEffect(rank: number) {
    const i = rank + 1 - BOOK_ECOLOGY.fromStage;
    if (i < 0) return '적 정보 공개';
    const dealt = BOOK_ECOLOGY.dealt.slice(0, i + 1).reduce((a, n) => a + n, 0), taken = BOOK_ECOLOGY.taken.slice(0, i + 1).reduce((a, n) => a + n, 0);
    return `연구 효과 +${pct(dealt)}% / -${pct(taken)}%`;
}
const swarmAt = (rank: number, n: number) => SWARM_SIZES.filter(size => size > 1 && SWARM_UNLOCK[size] > (MILESTONES[rank - 1] || 0) && SWARM_UNLOCK[size] <= MILESTONES[rank])
    .map(size => `무리 변종 ×${size} ${SWARM_UNLOCK[size] === MILESTONES[rank] ? '해금' : n >= SWARM_UNLOCK[size] ? `해금(${SWARM_UNLOCK[size].toLocaleString()}회 달성)` : `${SWARM_UNLOCK[size].toLocaleString()}회에 해금`}`);
const stepReward = (rank: number, n: number, swarm: boolean) => [PROGRESSION.bookSP[rank] ? `SP +${PROGRESSION.bookSP[rank]}` : '', ...(swarm ? swarmAt(rank, n) : [])].filter(Boolean).join(' · ');
/** 연구 진행: 처치 수 → 다음 목표 → 보상 → 수령. 사냥터 몬스터(swarm)는 무리 해금도 같이. */
export function ResearchBlock({ s, id, send, busy, swarm = false }: { s: State; id: string; send: Send; busy: boolean; swarm?: boolean }) {
    const n = s.book[id] || 0, claimed = s.bookClaims?.[id] || 0, pending = bookPending(s, id), reached = bookStage(s, id), next = reached < MILESTONES.length ? reached : -1, best = s.bookTier?.[id] || 0;
    const tierText = (r: number) => bookTierReq(r) ? ` + 난이도 ${bookTierReq(r)} 이상 처치${best >= bookTierReq(r) ? ' ✓' : ` (최고 ${best})`}` : '';
    return <section className="grid gap-2 rounded-m border border-line/60 bg-surface-2 p-3" aria-label="연구 진행">
        <div className="flex items-baseline justify-between gap-2 text-s"><span className="font-semibold text-ink-1">연구 진행</span><span className="font-num text-xs text-ink-3">{reached} / {MILESTONES.length}단계</span></div>
        {next >= 0 ? <StatBar label={`${next + 1}단계까지`} value={Math.min(n, MILESTONES[next])} max={MILESTONES[next]} size="s"/> : <div className="text-xs text-ok">모든 단계 달성</div>}
        <KeyValueList items={[
            { key: '처치 수', value: `${formatExact(n)}회` },
            { key: '다음 목표', value: next < 0 ? '—' : `${MILESTONES[next].toLocaleString()}회${n < MILESTONES[next] ? ` (남은 ${(MILESTONES[next] - n).toLocaleString()})` : ' ✓'}${tierText(next)}` },
            ...(next >= 0 ? [{ key: '달성하면', value: stepReward(next, n, swarm) || '능력치만', hint: stepEffect(next) }] : []),
            ...(pending.ranks.length ? [{ key: '수령 여부', value: `미수령 SP +${pending.sp}`, tone: 'ok' as const }] : []),
        ]}/>
        {pending.ranks.length > 0 && <Button type="button" size="sm" disabled={busy} onClick={() => send({ type: 'claimBook', id })}>연구 보상 받기 · SP +{pending.sp}</Button>}
        {reached > 0 && <Fold label={`달성한 연구 ${reached}단계`}>
            <ul className="grid gap-1 text-xs text-ink-2">{MILESTONES.slice(0, reached).map((m, r) => <li key={m} className="flex flex-wrap justify-between gap-2"><span>{m.toLocaleString()}회{bookTierReq(r) ? ` · 난이도 ${bookTierReq(r)}+` : ''}</span><span>{stepReward(r, n, swarm) || '능력치만'}</span><span className={r < claimed ? 'text-ok' : 'text-ink-3'}>{!PROGRESSION.bookSP[r] ? '' : r < claimed ? <><CheckCircle2 size={12} className="mr-0.5 inline"/>수령</> : '미수령'}</span></li>)}</ul>
        </Fold>}
    </section>;
}
/** 카드 안의 작은 접기. */
export function Fold({ label, children, defaultOpen = false }: { label: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return <Collapsible open={open} onOpenChange={setOpen} className="grid gap-2">
        <CollapsibleTrigger className="flex min-h-9 items-center gap-1 self-start rounded-s text-s font-medium text-ink-2 outline-none hover:text-ink-1 focus-visible:ring-[3px] focus-visible:ring-accent/50"><ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} aria-hidden/>{label}</CollapsibleTrigger>
        <CollapsibleContent className="grid gap-2">{children}</CollapsibleContent>
    </Collapsible>;
}

/* ---------- 적 정보 ---------- */
let skillMap: Map<string, (typeof SKILLS)[number] | (typeof ENEMY_SKILLS)[number]> | undefined;
const skillOf = (id: string) => (skillMap ??= new Map([...SKILLS, ...ENEMY_SKILLS].map(sk => [sk.id, sk]))).get(id);
export function EnemyInfo({ player, enemy, note, skills, extra }: { player: Stats; enemy: Stats; note: string; skills: string[]; extra?: { key: string; value: ReactNode; hint?: string }[] }) {
    return <Fold label={<>적 정보 <span className="text-xs text-ink-3">{note}</span></>}>
        <KeyValueList columns={2} items={[
            { key: 'HP', value: formatExact(enemy.hp) }, { key: '속도', value: enemy.speed },
            { key: '물리 공격', value: enemy.attack }, { key: '마법 공격', value: enemy.magic || 0 },
            { key: '물리 방어', value: enemy.defense }, { key: '마법 방어', value: enemy.resist },
            { key: '명중 수치', value: statDisplay('accuracy', enemy.accuracy || 0) }, { key: '회피 수치', value: statDisplay('evasion', enemy.evasion || 0) },
            { key: '치명 확률', value: percent(enemy.crit || 0) }, { key: '치명 피해', value: `×${(enemy.critDamage || BALANCE.critMultiplier).toFixed(2)}` },
            { key: '방어 관통', value: percent(enemy.penetration || 0) },
            { key: '내 적중률', value: `물리 ${percent(hitChance(player, enemy))} · 마법 ${percent(hitChance(player, enemy, true))}`, tone: 'ok' },
            { key: '적 적중률', value: percent(hitChance(enemy, player)) },
            ...(extra || []),
        ]}/>
        {skills.length ? <div className="grid gap-1 text-xs"><div className="font-semibold text-ink-2">사용 스킬 <span className="font-normal text-ink-3">치명 {percent(enemy.crit || 0)} · 치명 피해 ×{BALANCE.critMultiplier}</span></div>
            <ul className="grid gap-1">{skills.map(id => { const sk = skillOf(id); return sk ? <li key={id} className="rounded-s bg-surface-3 px-2 py-1 text-ink-2"><b className="text-ink-1">{sk.name}</b> {enemySkillBrief(sk)} <span className="text-ink-3">· 발동 {percent(sk.chance)} · 재사용 {sk.cooldown}턴</span></li> : null; })}</ul></div>
            : <p className="text-xs text-ink-3">스킬 없이 기본 공격만 합니다.</p>}
    </Fold>;
}
