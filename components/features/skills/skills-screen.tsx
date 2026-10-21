'use client';
/**
 * v3.385 스킬 화면(재설계 4단계 네 번째 화면). 옛 components/game/skills-panel.tsx 를 대신합니다. 주소 #skills.
 * 자원 타일 → 현재 편성 → 찾기(검색 · 종류 · 효과 · 정렬) → 범위 · 보기 · 상태 → 카드 목록(액티브 · 패시브 접기 또는 계보별 묶기).
 */
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { Skill, State, Action } from '@/game/types';
import { Button } from '@/components/ui/button';
import { SectionHeader, ChoiceChips, FoldSection, ConfirmAction, StatBar } from '@/components/ui/game';
import { cn } from '@/lib/utils';
import { JOBS, jobById, BASE_JOB } from '@/game/data/classes';
import { SKILLS } from '@/game/data/skills';
import { lineage, apCapacity, apUsed, canUse, effectiveSkill, inherited, skillLevel, skillMastery, skillVeiled } from '@/game/systems/progression';
import { recommendLoadout } from '@/game/systems/loadout';
import { skillEffectLines } from '@/game/systems/skill-description';
import { SkillCard } from './skill-card';
import { Loadout } from './loadout';

type Send = (a: Action) => void;
type SkillKind = 'all' | 'active' | 'passive';
type SkillDamage = 'all' | 'physical' | 'magic' | 'status' | 'heal';
type SkillSort = 'default' | 'ap' | 'chance' | 'level' | 'mastery' | 'name';
const KIND_LABEL: Record<SkillKind, string> = { all: '전체', active: '액티브', passive: '패시브' };
const DAMAGE_LABEL: Record<SkillDamage, string> = { all: '모든 효과', physical: '물리', magic: '마법', status: '상태이상 · 제어', heal: '회복 · 흡혈' };
const SORT_LABEL: Record<SkillSort, string> = { default: '기본 순서', ap: 'AP 낮은 순', chance: '발동률 높은 순', level: '성장 Lv. 높은 순', mastery: '숙련 많은 순', name: '이름 순' };
const STATUS_EFFECTS = new Set(['stun', 'bleed', 'silence', 'slow', 'weaken', 'poison', 'burn', 'freeze', 'curse']);
const PIN_KEY = 'tidebound.skillPins', PAGE = 24;
const field = 'h-10 rounded-m border border-line bg-surface-0 px-2 text-s text-ink-1 outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/40';
function skillDamageKind(sk: Skill): SkillDamage[] {
    const out: SkillDamage[] = [];
    if (sk.type === 'active') out.push(sk.damageType === 'magic' || sk.damageType === 'fixed' && sk.baseStat === 'magic' ? 'magic' : 'physical');
    if (sk.damageType === 'split') out.push('magic');
    if (sk.effect && STATUS_EFFECTS.has(sk.effect) || sk.statusOnly) out.push('status');
    if (sk.effect === 'heal' || sk.effect === 'drain' || sk.bonus?.lifesteal || sk.bonus?.hpRegen) out.push('heal');
    if (sk.type === 'passive' && (sk.bonus?.attack || sk.bonus?.crit || sk.bonus?.critDamage || sk.bonus?.penetration)) out.push('physical');
    if (sk.type === 'passive' && (sk.bonus?.magic || sk.bonus?.arcaneRatioBonus || sk.bonus?.mana || sk.bonus?.manaRegen)) out.push('magic');
    if (sk.type === 'passive' && (sk.bonus?.dotBonus || sk.bonus?.bleedBonus || sk.bonus?.poisonBonus || sk.bonus?.burnBonus || sk.bonus?.stunBonus || sk.bonus?.controlBonus || sk.bonus?.dotTurnsBonus)) out.push('status');
    return out;
}

export function SkillsScreen({ s, send, busy }: { s: State; send: Send; busy: boolean }) {
    const [scope, setScope] = useState('current'), [filter, setFilter] = useState('all'), [view, setView] = useState('simple'), [grouped, setGrouped] = useState(false);
    const [query, setQuery] = useState(''), [kind, setKind] = useState<SkillKind>('all'), [damage, setDamage] = useState<SkillDamage>('all'), [sort, setSort] = useState<SkillSort>('default');
    const resetKey = `${scope}|${filter}|${kind}|${damage}|${query}`;
    const pins = s.skillPins || [], hidden = s.skillHidden || [];
    // 전 버전의 브라우저 즐겨찾기를 세이브로 한 번 옮깁니다.
    const migrated = useRef(false);
    useEffect(() => {
        try {
            if (s.skillPins !== undefined) { localStorage.removeItem(PIN_KEY); return; }
            if (migrated.current) return;
            const raw = localStorage.getItem(PIN_KEY), ids: unknown = raw ? JSON.parse(raw) : null;
            if (Array.isArray(ids) && ids.length) { migrated.current = true; send({ type: 'pinSkill', value: ids.filter(x => typeof x === 'string').join(',') }); }
        } catch { /* 저장소 없음 */ }
    }, [s.skillPins, send]);
    const currentJob = jobById(s.job) || JOBS[0], used = apUsed(s), cap = apCapacity(s), line = lineage(s.job);
    const recommended = useMemo(() => recommendLoadout(s), [s]);
    const groupOf = (sk: Skill) => !sk.job ? { key: 'common', order: line.length + 1, name: '공용' } : sk.job === s.job ? { key: sk.job, order: 0, name: `${currentJob.name} · 현재 직업` } : line.includes(sk.job) ? { key: sk.job, order: line.indexOf(sk.job), name: `${jobById(sk.job)?.name} · 선행 직업` } : { key: sk.job, order: line.length + 2, name: `${jobById(sk.job)?.name} · 계승` };
    const q = useDeferredValue(query).trim().toLowerCase(), searching = q.length > 0;
    const corpus = useMemo(() => searching ? new Map(SKILLS.map(sk => [sk.id, [sk.name, sk.desc, jobById(sk.job)?.name || '공용', skillVeiled(s, sk) ? '' : skillEffectLines(effectiveSkill(sk, s.learned[sk.id] || 1, skillMastery(s, sk.id)), skillLevel(sk, s.learned[sk.id] || 1, skillMastery(s, sk.id))).join(' ')].join('\n').toLowerCase()])) : null, [s, searching]);
    const list = SKILLS.filter(sk => {
        const acquired = (s.learned[sk.id] || 0) > 0;
        if (!q) {
            if (scope === 'current' && sk.job !== s.job && !(s.job === BASE_JOB && !sk.job)) return false;
            if (scope === 'common' && sk.job) return false;
            if (scope === 'owned' && !acquired) return false;
            if (scope === 'equipped' && !s.skills.includes(sk.id)) return false;
            if (scope === 'pinned' && !pins.includes(sk.id)) return false;
            if (scope === 'hidden') return hidden.includes(sk.id);
            if (hidden.includes(sk.id) && !s.skills.includes(sk.id)) return false;
        } else if (!corpus?.get(sk.id)?.includes(q)) return false;
        if (kind !== 'all' && sk.type !== kind) return false;
        if (damage !== 'all' && !skillDamageKind(sk).includes(damage)) return false;
        return filter === 'unlearned' ? !acquired : filter === 'usable' ? canUse(s, sk.id) : true;
    });
    const keyOf = (sk: Skill) => { const fx = () => effectiveSkill(sk, s.learned[sk.id] || 1, skillMastery(s, sk.id)); return sort === 'ap' ? fx().cost ?? 2 : sort === 'chance' ? -(fx().chance || 0) : sort === 'level' ? -skillLevel(sk, s.learned[sk.id] || 1, skillMastery(s, sk.id)) : -(s.skillPractice[sk.id] || 0); };
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    else if (sort !== 'default') { const keys = new Map(list.map(sk => [sk.id, keyOf(sk)])); list.sort((a, b) => keys.get(a.id)! - keys.get(b.id)!); }
    const filtersOn = !!q || kind !== 'all' || damage !== 'all' || sort !== 'default' || filter !== 'all';
    // 한 구역에 PAGE 장씩 그리고 ‘더 보기’로 늘립니다(전체 계보는 600장이 넘음). 범위 · 검색이 바뀌면 처음부터.
    const [limits, setLimits] = useState<Record<string, number>>({});
    const [limitKey, setLimitKey] = useState(resetKey);
    if (limitKey !== resetKey) { setLimitKey(resetKey); setLimits({}); }
    const cards = (key: string, items: Skill[]) => { const limit = limits[key] || PAGE; return <>
        <div className={cn('grid gap-3', view === 'detail' ? 'xl:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3')}>{items.slice(0, limit).map(sk => <SkillCard key={sk.id} sk={sk} s={s} send={send} busy={busy} detailed={view === 'detail'} pinned={pins.includes(sk.id)} hidden={hidden.includes(sk.id)}/>)}</div>
        {items.length > limit && <Button type="button" variant="outline" className="justify-self-start" onClick={() => setLimits(l => ({ ...l, [key]: limit + PAGE }))}>더 보기 · 남은 {items.length - limit}종</Button>}
    </>; };
    const scopes: [string, string][] = [['current', `${currentJob.name} 전용`], ['equipped', `장착 중 ${s.skills.length}`], ['pinned', `즐겨찾기 ${pins.length}`], ['owned', '해금한 스킬'], ['common', '공용'], ['all', '전체 계보'], ['hidden', `숨김 ${hidden.length}`]];
    return <div className="grid gap-5 text-ink-1">
        <SectionHeader as="h1" eyebrow="Skill laboratory" title="스킬" description="전직 스킬은 무료로 사용합니다. 장착 후 처치로 계승 · 강화하거나, 얻어 둔 스킬에 1 SP를 투자하세요."
            actions={<ConfirmAction label="SP 투자 환급" description="사용한 SP만 환급합니다. 해금한 스킬 · 실전 숙련은 남고, SP로만 얻은 계승과 강화는 취소됩니다. 현재 편성이 AP를 넘으면 일부 스킬이 해제됩니다." disabled={busy || s.running || !!s.dungeon} onConfirm={() => send({ type: 'resetSkills' })}/>}/>
        <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1 rounded-l border border-line bg-surface-2 p-3 shadow-1"><div className="flex items-baseline justify-between text-s"><span className="text-ink-3">장착 AP</span><b className="font-num tabular-nums">{used} <span className="text-ink-3">/ {cap}</span></b></div><StatBar value={Math.max(0, used)} max={cap} size="s" showText={false}/></div>
            <div className="grid gap-1 rounded-l border border-line bg-surface-2 p-3 shadow-1"><span className="text-s text-ink-3">보유 SP</span><b className="font-num text-l tabular-nums">{s.sp}</b></div>
            <div className="grid gap-1 rounded-l border border-line bg-surface-2 p-3 shadow-1"><span className="text-s text-ink-3">계승한 직업 스킬</span><b className="font-num text-l tabular-nums">{SKILLS.filter(sk => sk.job && (s.learned[sk.id] || 0) > 0 && inherited(s, sk.id)).length}</b></div>
        </div>
        <Loadout s={s} send={send} busy={busy} recommended={recommended}/>
        <section aria-label="스킬 찾기" className="grid gap-3 rounded-l border border-line bg-surface-2 p-3 shadow-1">
            <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-0 flex-1 basis-64"><Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden/><input type="search" className={cn(field, 'w-full pl-8')} value={query} placeholder="스킬 이름 · 효과 · 직업으로 검색 (예: 기절, 흡혈, 마법사)" aria-label="스킬 검색" onChange={e => setQuery(e.target.value)}/></label>
                <label className="grid gap-0.5 text-xs text-ink-3">정렬<select className={field} value={sort} aria-label="스킬 정렬" onChange={e => setSort(e.target.value as SkillSort)}>{(Object.keys(SORT_LABEL) as SkillSort[]).map(k => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}</select></label>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <ChoiceChips label="종류" value={kind} onChange={v => setKind(v as SkillKind)} options={(Object.keys(KIND_LABEL) as SkillKind[]).map(k => ({ value: k, label: KIND_LABEL[k] }))}/>
                <ChoiceChips label="효과" value={damage} onChange={v => setDamage(v as SkillDamage)} options={(Object.keys(DAMAGE_LABEL) as SkillDamage[]).map(k => ({ value: k, label: DAMAGE_LABEL[k] }))}/>
                {filtersOn && <Button type="button" size="sm" variant="ghost" onClick={() => { setQuery(''); setKind('all'); setDamage('all'); setSort('default'); setFilter('all'); }}>필터 초기화</Button>}
                <span className="ml-auto font-num text-xs text-ink-3">{list.length}종 표시{q ? ' · 검색 중에는 모든 직업의 기술을 봅니다' : ''}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <ChoiceChips label="범위" value={scope} onChange={setScope} options={scopes.map(([v, l]) => ({ value: v, label: l }))}/>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <ChoiceChips label="상태" value={filter} onChange={setFilter} options={[{ value: 'all', label: '모두' }, { value: 'usable', label: '사용 가능' }, { value: 'unlearned', label: '미해금' }]}/>
                <ChoiceChips label="보기" value={view} onChange={setView} options={[{ value: 'simple', label: '간단히' }, { value: 'detail', label: '자세히' }]}/>
                <ChoiceChips label="묶기" value={grouped ? 'on' : 'off'} onChange={v => setGrouped(v === 'on')} options={[{ value: 'on', label: '계보별 묶기' }]}/>
            </div>
            {scope === 'hidden' && !q && <p className="text-xs text-ink-3">숨긴 스킬은 다른 범위에서 보이지 않습니다(장착 중인 스킬과 검색 결과는 예외). 카드의 눈 모양 버튼으로 다시 보이게 할 수 있습니다.</p>}
        </section>
        {!list.length && <p className="rounded-m bg-surface-2 p-4 text-s text-ink-3">조건에 맞는 기술이 없습니다. {q ? '다른 검색어를 써 보세요.' : scope === 'hidden' ? '숨긴 스킬이 없습니다. 카드의 눈 모양 버튼으로 자주 안 보는 스킬을 숨길 수 있습니다.' : '범위를 ‘전체 계보’로 바꾸거나 필터를 초기화해 보세요.'}</p>}
        {grouped ? [...new Map(list.map(sk => [groupOf(sk).key, groupOf(sk)])).values()].sort((a, b) => a.order - b.order).map(g => { const items = list.filter(sk => groupOf(sk).key === g.key); return <FoldSection key={g.key} title={g.name} defaultOpen={g.order <= 1} summary={`액티브 ${items.filter(sk => sk.type === 'active').length} · 패시브 ${items.filter(sk => sk.type === 'passive').length} · 장착 ${items.filter(sk => s.skills.includes(sk.id)).length}`}>{cards(g.key, items)}</FoldSection>; })
            : (['active', 'passive'] as const).map(type => { const items = list.filter(sk => sk.type === type); return <FoldSection key={type} defaultOpen title={type === 'active' ? '액티브 · 확률 발동' : '패시브 · 장착 효과'} summary={`${items.length}종`}>{items.length ? cards(type, items) : <p className="text-s text-ink-3">이 범위에 해당하는 스킬이 없습니다.</p>}</FoldSection>; })}
    </div>;
}
