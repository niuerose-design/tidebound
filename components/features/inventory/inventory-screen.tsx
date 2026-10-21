'use client';
/**
 * v3.384 장비 보관함(재설계 4단계 세 번째 화면). 옛 components/game/inventory-panel.tsx 를 대신합니다(상점 강화 탭 · 환생 화면은 아직 옛 조각을 씀). 주소 #inventory.
 * 착용 칸 요약 + 교체 추천 → 보스 코어 칸 → 선택한 장비 작업대 → 검색 · 부위 · 정렬 · 등급 · 상향 필터 → 가방 목록(12개씩) → 등급별 일괄 판매 · 분해.
 */
import { useState } from 'react';
import { ArrowUpRight, ChevronDown, Coins, Gem, Hexagon, Search, ShoppingBag, Swords, X } from 'lucide-react';
import type { Item, State, Stats } from '@/game/types';
import { Button } from '@/components/ui/button';
import { SectionHeader, ChoiceChips, ItemSlot, FoldSection, ConfirmAction, NumberTicker, formatExact } from '@/components/ui/game';
import { OnyxArt } from '@/components/game/onyx-art';
import { cn } from '@/lib/utils';
import { SLOTS, RARITIES } from '@/game/data/balance';
import { STAT_LABELS, byStatOrder, statDeltaDisplay, RELIC_LINEAGE, attrName } from '@/game/data/progression';
import { jobById, lineageOf } from '@/game/data/classes';
import { inventoryCap, PRIMAL_INHERIT } from '@/game/data/economy';
import { itemStats, saleValue, dismantleEssence, bulkItems, primalGaugeOf, keepsAcrossLives } from '@/game/systems/equipment';
import { ESSENCE_BY_RARITY } from '@/game/data/gear';
import { starMultiplier } from '@/game/data/starforce';
import { BOSS_CORES, BOSS_CORE_RULES, ownedCores, coreEntry, coreAwaken } from '@/game/data/boss-core';
import { ONYX_TOTAL, onyxCollected } from '@/game/data/onyx';
import { gearPreview, SLOT_IDS } from './preview';
import { ForgeBench } from './forge-bench';
import { ItemArt, ItemName, ItemMeta, ItemTag, GainBadge, DeltaList, rarityOf } from './parts';

type Send = (a: import('@/game/types').Action) => void;
type SortKey = 'power' | 'rarity' | 'level' | 'recent' | 'name';
const SORTS: Record<SortKey, string> = { power: '위력 높은 순', rarity: '등급 높은 순', level: '획득 레벨 순', recent: '최근 획득 순', name: '이름 순' };
const PAGE = 12, STAT_PREVIEW = 3;
const relicShown = (s: State) => { const j = jobById(s.job); return !!j && lineageOf(j) === RELIC_LINEAGE; };
const field = 'h-10 rounded-m border border-line bg-surface-0 px-2 text-s text-ink-1 outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/40';

export function InventoryScreen({ s, send, busy }: { s: State; send: Send; busy: boolean }) {
    const [slot, setSlot] = useState('all'), [query, setQuery] = useState(''), [sort, setSort] = useState<SortKey>('power'), [rarity, setRarity] = useState(-1), [upgradesOnly, setUpgradesOnly] = useState(false);
    const [limit, setLimit] = useState(PAGE), [open, setOpen] = useState<string | null>(null);
    const { current, currentPower, preview } = gearPreview(s);
    const best = (id: Item['slot']) => s.inventory.filter(i => i.slot === id && (preview.get(i.id)?.gain || 0) > 0).sort((a, b) => preview.get(b.id)!.gain - preview.get(a.id)!.gain)[0];
    const upgrades = SLOT_IDS.map(best).filter((i): i is Item => !!i);
    const q = query.trim().toLowerCase();
    const shown = s.inventory.map((item, index) => ({ item, index })).filter(({ item }) => (slot === 'all' || item.slot === slot) && (rarity < 0 || item.rarity === rarity) && (!upgradesOnly || (preview.get(item.id)?.gain || 0) > 0) && (!q || item.name.toLowerCase().includes(q) || RARITIES[item.rarity].name.includes(q) || SLOTS[item.slot].includes(q) || (item.relic ? '유물'.includes(q) : false)))
        .sort((a, b) => sort === 'power' ? b.item.power * starMultiplier(b.item.enhance || 0) - a.item.power * starMultiplier(a.item.enhance || 0) || b.item.rarity - a.item.rarity : sort === 'rarity' ? b.item.rarity - a.item.rarity || b.item.power - a.item.power : sort === 'level' ? b.item.level - a.item.level || b.item.power - a.item.power : sort === 'recent' ? b.index - a.index : a.item.name.localeCompare(b.item.name, 'ko'))
        .map(x => x.item);
    const topStats = (item: Item) => byStatOrder(Object.entries(itemStats(item))).slice(0, STAT_PREVIEW).map(([key, value]) => <span key={key} className="whitespace-nowrap">{STAT_LABELS[key as keyof Stats]} <b className="font-num tabular-nums text-ink-1">{statDeltaDisplay(key, value as number)}</b></span>);
    const openedWorn = SLOT_IDS.map(id => s.equipment[id]).find(w => w && w.id === open);
    const filtersOn = slot !== 'all' || rarity >= 0 || upgradesOnly || !!q;
    const detail = (item: Item, equipped: boolean) => {
        const after = equipped ? current : preview.get(item.id)!.after;
        const delta = byStatOrder(Object.entries(after).filter(([k, n]) => Math.abs(n - current[k as keyof Stats]) > .001 && (k !== 'relicPower' || relicShown(s)))).map(([k, n]) => [k, n - current[k as keyof Stats]] as [string, number]);
        return <ForgeBench s={s} send={send} busy={busy} item={item} extra={!equipped && <>
            <DeltaList title="교체 후 최종 능력치 변화" delta={delta}/>
            <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => send({ type: 'lockItem', id: item.id })}>{item.locked ? '보호 해제' : '보호'}</Button>
                <ConfirmAction label={`${formatExact(saleValue(item))} G 판매${primalGaugeOf(item) ? ' · 계승 게이지 +1' : ''}`} title={`${item.name}을(를) 판매할까요?`} description={`${formatExact(saleValue(item))} G를 받고 장비가 사라집니다.${primalGaugeOf(item) ? ` 태초 계승 게이지가 1 찹니다(${(s.primalGauge || 0) + 1}/${PRIMAL_INHERIT.gauge}).` : ''}`} disabled={busy || !!item.locked || keepsAcrossLives(item)} onConfirm={() => send({ type: 'sell', id: item.id })}/>
                <ConfirmAction label={`분해 · 정수 +${dismantleEssence(item, s)}${primalGaugeOf(item) ? ' · 계승 게이지 +1' : ''}`} title={`${item.name}을(를) 분해할까요?`} description={`정수 ${dismantleEssence(item, s)}를 얻고 장비가 사라집니다.${primalGaugeOf(item) ? ` 태초 계승 게이지가 1 찹니다(${(s.primalGauge || 0) + 1}/${PRIMAL_INHERIT.gauge}).` : ''}${keepsAcrossLives(item) ? ' 환생해도 남는 장비입니다. 분해하면 되돌릴 수 없습니다.' : ''}`} disabled={busy || !!item.locked || !!item.onyx} onConfirm={() => send({ type: 'dismantle', id: item.id })}/>
            </div>
        </>}/>;
    };
    return <div className="grid gap-5 text-ink-1">
        <SectionHeader as="h1" eyebrow="Equipment & Forge" title="장비 보관함" description="착용 칸마다 더 좋은 장비가 있으면 바로 추천합니다. 줄을 누르면 상세 · 강화가 열리고, 전투력은 교체 후 종합 전투력 변화입니다."/>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile icon={<Coins size={18}/>} label="보유 골드"><NumberTicker value={s.gold} suffix=" G" className="text-gold-ink"/></Tile>
            <Tile icon={<Gem size={18}/>} label="보유 정수"><NumberTicker value={s.essence || 0}/></Tile>
            <Tile icon={<ShoppingBag size={18}/>} label="장비 가방"><span className="font-num tabular-nums">{s.inventory.length} <span className="text-s text-ink-3">/ {inventoryCap()}</span></span></Tile>
            <Tile icon={<Swords size={18}/>} label="종합 전투력"><NumberTicker value={currentPower}/></Tile>
        </div>
        <section aria-label="착용 장비" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {SLOT_IDS.map(id => { const worn = s.equipment[id], up = best(id), active = !!worn && open === worn.id;
                return <article key={id} className={cn('grid content-start gap-2 rounded-l border bg-surface-2 p-3 shadow-1', active ? 'border-accent' : 'border-line')} style={worn ? { borderTopColor: `var(--rarity-${rarityOf(worn)})`, borderTopWidth: 3 } : undefined}>
                    <div className="flex items-center justify-between gap-2 text-xs text-ink-3"><span className="font-semibold text-ink-2">{SLOTS[id]}</span>{worn && <Button type="button" size="xs" variant="ghost" disabled={busy} onClick={() => send({ type: 'unequip', id })}>해제</Button>}</div>
                    {worn ? <button type="button" aria-expanded={active} className="grid min-h-11 gap-1 rounded-m text-left outline-none hover:bg-surface-3/60 focus-visible:ring-[3px] focus-visible:ring-accent/50" onClick={() => { const next = active ? null : worn.id; setOpen(next); if (next && window.innerWidth <= 1024) requestAnimationFrame(() => document.getElementById('gear-open')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}>
                        <span className="flex items-center gap-2"><ItemSlot rarity={rarityOf(worn)} label={worn.name} size="s"><ItemArt item={worn} size={16}/></ItemSlot><ItemName item={worn} always className="text-s"/></span>
                        <ItemMeta item={worn}/>
                        <span className="flex flex-wrap gap-x-3 text-xs text-ink-3">{topStats(worn)}</span>
                    </button> : <p className="min-h-11 text-s text-ink-3">비어 있음</p>}
                    {up ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-m bg-surface-1 px-2 py-1.5 text-xs"><span className="flex min-w-0 items-center gap-1 text-ink-2"><ArrowUpRight size={13} className="shrink-0 text-ok"/>추천 <b className="truncate text-ink-1">{up.name}</b><GainBadge gain={preview.get(up.id)!.gain}/></span><Button type="button" size="xs" disabled={busy} onClick={() => send({ type: 'equip', id: up.id })}>바로 장착</Button></div>
                        : <p className="text-xs text-ink-3">가방에 더 좋은 {SLOTS[id]} 없음</p>}
                </article>; })}
        </section>
        <CoreSlot s={s} send={send} busy={busy}/>
        {openedWorn && <section id="gear-open" aria-label={`${openedWorn.name} 상세 · 강화`} className="grid gap-3 rounded-l border border-accent bg-surface-2 p-4 shadow-1">
            <header className="flex items-start gap-3"><ItemSlot rarity={rarityOf(openedWorn)} label={openedWorn.name}><ItemArt item={openedWorn}/></ItemSlot><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><ItemName item={openedWorn} always className="text-m"/><ItemTag item={openedWorn}/></div><ItemMeta item={openedWorn}/></div><Button type="button" size="icon-sm" variant="ghost" aria-label="닫기" onClick={() => setOpen(null)}><X/></Button></header>
            {detail(openedWorn, true)}
        </section>}
        {upgrades.length > 1 && <p className="flex items-center gap-1 text-s text-ok"><ArrowUpRight size={14}/>{upgrades.length}개 칸에 더 좋은 장비가 있습니다. 각 칸의 ‘바로 장착’으로 하나씩 바꾸세요.</p>}
        <section aria-label="가방 필터" className="grid gap-3 rounded-l border border-line bg-surface-2 p-3 shadow-1">
            <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-0 flex-1 basis-56"><Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden/><input type="search" className={cn(field, 'w-full pl-8')} value={query} placeholder="장비 이름 · 등급 · 부위 검색" aria-label="장비 검색" onChange={e => setQuery(e.target.value)}/></label>
                <label className="grid gap-0.5 text-xs text-ink-3">정렬<select className={field} value={sort} aria-label="정렬" onChange={e => setSort(e.target.value as SortKey)}>{(Object.keys(SORTS) as SortKey[]).map(k => <option key={k} value={k}>{SORTS[k]}</option>)}</select></label>
                <label className="grid gap-0.5 text-xs text-ink-3">등급<select className={field} value={rarity} aria-label="등급 필터" onChange={e => setRarity(Number(e.target.value))}><option value={-1}>전체 등급</option>{RARITIES.map((r, i) => <option key={r.name} value={i}>{r.name} {s.inventory.filter(x => x.rarity === i).length}</option>)}</select></label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <ChoiceChips label="부위" value={slot} onChange={setSlot} options={[{ value: 'all', label: `전체 ${s.inventory.length}` }, ...SLOT_IDS.map(id => ({ value: id, label: `${SLOTS[id]} ${s.inventory.filter(i => i.slot === id).length}` }))]}/>
                <button type="button" aria-pressed={upgradesOnly} onClick={() => setUpgradesOnly(v => !v)} className={cn('inline-flex min-h-9 items-center gap-1 rounded-m border px-3 text-s font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-accent/50', upgradesOnly ? 'border-accent bg-accent-soft text-ink-1' : 'border-line bg-surface-1 text-ink-2 hover:bg-surface-3')}><ArrowUpRight size={14}/>전투력 상향만</button>
                {filtersOn && <Button type="button" size="sm" variant="ghost" onClick={() => { setSlot('all'); setRarity(-1); setUpgradesOnly(false); setQuery(''); }}>필터 초기화</Button>}
                <span className="ml-auto font-num text-xs text-ink-3">{shown.length} / {s.inventory.length}개 표시</span>
            </div>
        </section>
        <div className="grid gap-2">{shown.slice(0, limit).map(item => { const gain = preview.get(item.id)?.gain || 0, expanded = open === item.id;
            return <article key={item.id} className={cn('grid gap-3 rounded-l border bg-surface-2 p-3 shadow-1', expanded ? 'border-accent' : 'border-line')} style={{ borderLeftColor: `var(--rarity-${rarityOf(item)})`, borderLeftWidth: 3 }}>
                <div className="flex flex-wrap items-center gap-3">
                    <button type="button" aria-expanded={expanded} className="flex min-h-11 min-w-0 flex-1 basis-64 items-center gap-3 rounded-m text-left outline-none hover:bg-surface-3/60 focus-visible:ring-[3px] focus-visible:ring-accent/50" onClick={() => setOpen(expanded ? null : item.id)}>
                        <ItemSlot rarity={rarityOf(item)} label={item.name} locked={!!item.locked}><ItemArt item={item}/></ItemSlot>
                        <span className="grid min-w-0 flex-1 gap-0.5"><span className="flex flex-wrap items-center gap-2"><ItemName item={item} className="text-s"/><ItemTag item={item}/></span><ItemMeta item={item}/><span className="flex flex-wrap gap-x-3 text-xs text-ink-3">{topStats(item)}</span></span>
                        <ChevronDown size={16} className={cn('shrink-0 text-ink-3 transition-transform', expanded && 'rotate-180')} aria-hidden/>
                    </button>
                    <div className="flex shrink-0 items-center gap-2"><GainBadge gain={gain}/><Button type="button" size="sm" variant={gain > 0 ? 'default' : 'outline'} disabled={busy} onClick={() => send({ type: 'equip', id: item.id })}>장착</Button></div>
                </div>
                {expanded && detail(item, false)}
            </article>; })}</div>
        {shown.length > limit && <Button type="button" variant="outline" onClick={() => setLimit(v => v + PAGE)}><ChevronDown/>더 보기 · 남은 {shown.length - limit}개</Button>}
        {limit > PAGE && shown.length <= limit && <Button type="button" variant="ghost" onClick={() => setLimit(PAGE)}>접기</Button>}
        {!s.inventory.length ? <p className="rounded-m bg-surface-2 p-4 text-s text-ink-3">가방이 비어 있습니다. 사냥 또는 상점에서 장비를 획득하세요.</p> : !shown.length && <p className="rounded-m bg-surface-2 p-4 text-s text-ink-3">조건에 맞는 장비가 없습니다.</p>}
        <FoldSection title="등급별 일괄 판매 · 분해" summary={`분해 정수 등급별 ${ESSENCE_BY_RARITY.join(' · ')}`} extra="보호 장비 · 유물 · 착용 장비는 제외. 분해하면 수치 재련에 쓰는 정수를 얻습니다. 태초는 팔아도 분해해도 계승 게이지가 1씩 찹니다.">
            <div className="grid gap-1 text-xs text-ink-3">판매</div>
            <div className="flex flex-wrap gap-2">{RARITIES.map((r, i) => { const items = bulkItems(s, i), gold = items.reduce((sum, item) => sum + saleValue(item), 0); return <ConfirmAction key={r.name} label={`${r.name} ${items.length}개`} title={`${r.name} 장비 ${items.length}개를 판매할까요?`} description={`보호하지 않은 일반 장비만 판매하여 ${formatExact(gold)} G를 받습니다. 장착 장비와 환생 유물은 제외됩니다.`} disabled={busy || !items.length} onConfirm={() => send({ type: 'sellRarity', id: String(i) })}/>; })}</div>
            <div className="grid gap-1 text-xs text-ink-3">분해</div>
            <div className="flex flex-wrap gap-2">{RARITIES.map((r, i) => { const items = bulkItems(s, i); return <ConfirmAction key={'d' + r.name} label={`${r.name} 분해 ${items.length}`} title={`${r.name} 장비 ${items.length}개를 분해할까요?`} description={`보호하지 않은 장비만 분해해 정수 ${items.length * (ESSENCE_BY_RARITY[i] || 1)}를 얻습니다. 장착 장비와 환생 유물은 제외됩니다.`} disabled={busy || !items.length} onConfirm={() => send({ type: 'dismantleRarity', id: String(i) })}/>; })}</div>
        </FoldSection>
    </div>;
}

function Tile({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return <div className="flex items-center gap-3 rounded-l border border-line bg-surface-2 px-3 py-2 shadow-1"><span className="text-ink-3">{icon}</span><span className="grid"><span className="text-xs text-ink-3">{label}</span><span className="text-m font-semibold">{children}</span></span></div>;
}

/** 보스 코어 칸: 낀 코어, 바꾸기, 해제. 칠흑 보스코어는 칠흑 색으로 구분. */
function CoreSlot({ s, send, busy }: { s: State; send: Send; busy: boolean }) {
    const owned = ownedCores(s), id = s.coreSlot && owned.includes(s.coreSlot) ? s.coreSlot : '', core = id ? BOSS_CORES[id] : undefined, e = coreEntry(s.bossCores?.[id]);
    const onyx = !!core?.onyx;
    const attrText = e ? (e.attrs.length ? e.attrs.map(x => `${attrName(x.k)} +${formatExact(Math.floor(Math.max(1, s.level) * x.f * coreAwaken(e.rank)))} (레벨 ×${x.f})`).join(' · ') : '기본 능력치 없음(재설정으로 채움)') : '';
    return <section aria-label="보스 코어 칸" className="grid gap-2 rounded-l border border-line bg-surface-2 p-3 shadow-1" style={core ? { borderTopColor: onyx ? 'var(--rarity-primal)' : 'var(--gold-ink)', borderTopWidth: 3 } : undefined}>
        <div className="flex items-center justify-between gap-2 text-xs text-ink-3"><span className="flex items-center gap-1 font-semibold text-ink-2"><Hexagon size={15}/>보스 코어 · 보유 {owned.length}/{Object.keys(BOSS_CORES).length}종</span>{core && <Button type="button" size="xs" variant="ghost" disabled={busy} onClick={() => send({ type: 'equipCore', id: '' })}>해제</Button>}</div>
        {core && e ? <div className="grid gap-1 text-s"><div className="flex flex-wrap items-center gap-2 font-semibold">{onyx && <OnyxArt id={id} size={22}/>}<span style={onyx ? { color: 'var(--rarity-primal)' } : undefined}>{core.name}</span><span className="font-num text-xs text-gold-ink">각성 {e.rank}/{BOSS_CORE_RULES.awakenMax}</span></div><p className="text-xs text-ink-3">{onyx ? `칠흑 보스코어 · ${core.boss} 격파 보상 · 칠흑 ${onyxCollected(s)}/${ONYX_TOTAL}종 · ` : ''}{core.desc}</p><p className="text-xs text-ink-2">{attrText}</p></div>
            : <p className="text-s text-ink-3">{owned.length ? '비어 있음 · 아래에서 낄 코어를 고르세요' : '보스 코어가 없습니다. 지역 던전 보너스 정복이나 던전 주화 상점 상자로 얻고, 칠흑 보스 윌은 칠흑 보스코어를 줍니다.'}</p>}
        {owned.length > 0 && <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3"><span>칸에 낀 코어 100% · 나머지는 공명 {Math.round(BOSS_CORE_RULES.resonance * 100)}%(턴 연장 제외)</span>
            <select className={field} aria-label="보스 코어 바꾸기" value={id} disabled={busy} onChange={ev => send({ type: 'equipCore', id: ev.target.value })}><option value="">비우기</option>{owned.map(c => <option key={c} value={c}>{BOSS_CORES[c].onyx ? `◆ ${BOSS_CORES[c].name}(칠흑)` : BOSS_CORES[c].name}</option>)}</select></div>}
    </section>;
}
