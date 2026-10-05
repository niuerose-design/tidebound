'use client';
import { ConfirmButton } from './confirm-button';
import { useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown, Lock, Search, Sparkles, Swords } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Item, Stats } from '@/game/types';
import { ECONOMY, AFFIXES, RELIC_GROWTH } from '@/game/data/economy';
import { SLOTS, RARITIES } from '@/game/data/balance';
import { STAT_LABELS, byStatOrder, statDeltaDisplay } from '@/game/data/progression';
import { itemStats, itemDescription, enhanceCost, bulkItems, saleValue, dismantleEssence, rerollCost, refineCost, enhanceMaxFor, imprintCost } from '@/game/systems/equipment';
import { ORIGIN_THEMES, affixDef, affixQuality, ESSENCE_BY_RARITY, REROLL_STEP_PCT } from '@/game/data/gear';
import { STARFORCE, starSuccess, starDrops, starDestroy, canSafeguard, chanceTime, starMultiplier, starLabel } from '@/game/data/starforce';
import { stats, power } from '@/game/systems/stats';
import { Heading, SlotIcon, format, WalletBar } from './shared';
const PAGE = 12;
import type { PanelProps } from './panel-props';
export function BonusList({ item }: {
    item: Item;
}) {
    return <div className="equipment-numbers">{byStatOrder(Object.entries(itemStats(item))).map(([key, value]) => <span key={key}>{STAT_LABELS[key as keyof Stats]}<b>{statDeltaDisplay(key, value as number)}</b>
        </span>)}</div>;
}

/** v22 장비 옵션 목록. 옵션마다 이득·손해 수치와 한 줄 재설정 버튼을 보여줍니다. */
function GearOptions({ s, send, busy, item }: PanelProps & { item: Item }) {
    const cost = rerollCost(item, s), canPay = s.gold >= cost.gold && (s.essence || 0) >= cost.essence;
    // v27.94 수치 재련: 옵션 종류는 그대로 두고 수치만 다시 굴립니다(재설정 기본 비용의 절반, 오르지 않음).
    const refine = refineCost(item, s), canRefine = s.gold >= refine.gold && (s.essence || 0) >= refine.essence;
    const quality = (x: NonNullable<Item['affixes']>[number]) => { const q = affixQuality(x, item.power, item.rarity); return q === null ? null : Math.round(q * 100); };
    return <div className="affix-explanation">
        <b>{item.relic ? `이식 옵션 ${item.affixes!.length}/${RELIC_GROWTH.imprintSlots}줄` : `추가 옵션 ${item.affixes!.length}개`}{item.origin && ORIGIN_THEMES[item.origin] ? ` · ${ORIGIN_THEMES[item.origin].name}에서 획득` : ''}</b>
        {item.affixes!.map((x, i) => <div key={x.id + i} className="gear-option-row">
            <span>{x.rule ? '◆ ' : ''}<b>{x.name}</b> · {STAT_LABELS[x.stat]} {statDeltaDisplay(x.stat, x.value)}{x.stat2 && x.value2 ? ` · ${STAT_LABELS[x.stat2]} ${statDeltaDisplay(x.stat2, x.value2)}` : ''}{quality(x) !== null && <em className="affix-quality"> · 수치 {quality(x)}%</em>}</span>
            <small>{affixDef(x.id)?.description}</small>
            {!item.relic && <span className="gear-option-actions"><ConfirmButton label="재설정" title={`${x.name} 옵션을 다시 굴릴까요?`} description={`이 옵션 하나만 바뀌고 나머지 옵션은 그대로입니다. 골드 ${format(cost.gold)} G와 정수 ${cost.essence}를 사용합니다. 같은 옵션은 중복되지 않고, 규칙 옵션(◆)은 장비당 1개까지입니다.`} disabled={busy || !canPay} onConfirm={() => send({ type: 'reforge', id: item.id, value: String(i) })}/>
                {!x.rule && <ConfirmButton label="재련" title={`${x.name} 옵션의 수치를 다시 굴릴까요?`} description={`옵션 종류는 그대로이고 수치만 최저~최고 사이에서 다시 굴립니다. 지금보다 낮아질 수도 있습니다. 골드 ${format(refine.gold)} G와 정수 ${refine.essence}를 사용하며, 재련 비용은 오르지 않습니다.`} disabled={busy || !canRefine} onConfirm={() => send({ type: 'refine', id: item.id, value: String(i) })}/>}
            </span>}
        </div>)}
        <p className="footnote">{item.relic ? '이식 옵션은 환생해도 남고, 같은 칸에 다시 이식하면 덮어씁니다. 위 수치는 장비 기여 수치에 포함됩니다.' : <>옵션 재설정 · {format(cost.gold)} G + 정수 {cost.essence}{item.rerolls ? ` (이 장비 ${item.rerolls}회 재설정 · 1회마다 +${REROLL_STEP_PCT}%)` : ` (재설정할 때마다 +${REROLL_STEP_PCT}%)`} · 수치 재련 · {format(refine.gold)} G + 정수 {refine.essence} · 보유 정수 {s.essence || 0}</>}</p>
    </div>;
}

type SortKey = 'power' | 'rarity' | 'level' | 'recent' | 'name';
const SORTS: Record<SortKey, string> = { power: '위력 높은 순', rarity: '등급 높은 순', level: '획득 레벨 순', recent: '최근 획득 순', name: '이름 순' };
const SLOT_IDS = Object.keys(SLOTS) as Item['slot'][];
const STAT_PREVIEW = 3;

/** v25.3 장비 보관함: 착용 칸 요약 + 교체 추천, 검색·정렬·등급·상향 필터, 한 줄 목록 → 펼쳐서 상세·강화. 전투력은 능력치 화면의 종합 전투력과 같은 식입니다. */
export function Inventory({ s, send, busy }: PanelProps) {
    const [slot, setSlot] = useState('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortKey>('power');
    const [rarity, setRarity] = useState(-1);
    const [upgradesOnly, setUpgradesOnly] = useState(false);
    // v25.19 보관함은 PAGE(12)개씩 보여 주고 ‘더 보기’로 늘립니다. 아래 일괄 판매·분해까지 길게 내리지 않아도 됩니다.
    const [limit, setLimit] = useState(PAGE);
    const [open, setOpen] = useState<string | null>(null);
    const current = useMemo(() => stats(s), [s]);
    const currentPower = power(current);
    // 장비마다 교체 후 최종 능력치와 전투력 변화를 한 번만 계산합니다.
    const preview = useMemo(() => {
        const out = new Map<string, { after: Stats; gain: number }>();
        for (const item of s.inventory) { const after = stats({ ...s, equipment: { ...s.equipment, [item.slot]: item } }); out.set(item.id, { after, gain: power(after) - currentPower }); }
        return out;
    }, [s, currentPower]);
    const best = (id: Item['slot']) => s.inventory.filter(i => i.slot === id && (preview.get(i.id)?.gain || 0) > 0).sort((a, b) => preview.get(b.id)!.gain - preview.get(a.id)!.gain)[0];
    const upgrades = SLOT_IDS.map(best).filter((i): i is Item => !!i);
    const q = query.trim().toLowerCase();
    const shown = s.inventory.map((item, index) => ({ item, index })).filter(({ item }) => (slot === 'all' || item.slot === slot) && (rarity < 0 || item.rarity === rarity) && (!upgradesOnly || (preview.get(item.id)?.gain || 0) > 0) && (!q || item.name.toLowerCase().includes(q) || RARITIES[item.rarity].name.includes(q) || SLOTS[item.slot].includes(q) || (item.relic ? '유물'.includes(q) : false)))
        .sort((a, b) => sort === 'power' ? b.item.power * starMultiplier(b.item.enhance || 0) - a.item.power * starMultiplier(a.item.enhance || 0) || b.item.rarity - a.item.rarity : sort === 'rarity' ? b.item.rarity - a.item.rarity || b.item.power - a.item.power : sort === 'level' ? b.item.level - a.item.level || b.item.power - a.item.power : sort === 'recent' ? b.index - a.index : a.item.name.localeCompare(b.item.name, 'ko'))
        .map(x => x.item);
    const gainBadge = (gain: number) => <span className={`gear-gain ${gain > 0 ? 'positive' : gain < 0 ? 'negative' : 'neutral'}`} title="교체 후 종합 전투력 변화">{gain > 0 ? `전투력 +${format(gain)}` : gain < 0 ? `전투력 −${format(-gain)}` : '전투력 변화 없음'}</span>;
    const topStats = (item: Item) => byStatOrder(Object.entries(itemStats(item))).slice(0, STAT_PREVIEW).map(([key, value]) => <span key={key}>{STAT_LABELS[key as keyof Stats]} <b>{statDeltaDisplay(key, value as number)}</b></span>);
    const detail = (item: Item, equipped: boolean) => {
        const after = equipped ? current : preview.get(item.id)!.after;
        const delta = Object.entries(after).filter(([k, n]) => Math.abs(n - current[k as keyof Stats]) > .001);
        return <div className="gear-detail">
            <p>{itemDescription(item)}</p>
            <BonusList item={item}/>
            <p className="footnote">직업 배율 적용 전 장비 기여 수치 · {starLabel(item.enhance || 0, true)} (기본 수치 ×{starMultiplier(item.enhance || 0).toFixed(2)}){item.origin && ORIGIN_THEMES[item.origin] ? ` · ${ORIGIN_THEMES[item.origin].name}에서 획득` : ''}</p>
            {!!item.affixes?.length && <GearOptions s={s} send={send} busy={busy} item={item}/>}
            {item.affix && <div className="affix-explanation">
                <b>추가 옵션 · {item.affix.name}</b>
                <span>{STAT_LABELS[item.affix.stat]} {statDeltaDisplay(item.affix.stat, item.affix.value)}</span>
                <p>{AFFIXES.find(a => a.stat === item.affix?.stat)?.description || '장착 시 해당 능력치에 더해집니다.'} 위 수치에 포함됩니다.</p>
            </div>}
            {!equipped && <div className="equipment-comparison">
                <small>교체 후 최종 능력치 변화</small>{delta.length ? byStatOrder(delta).map(([k, n]) => { const d = n - current[k as keyof Stats]; return <span key={k} className={d > 0 ? 'positive' : 'negative'}>{STAT_LABELS[k as keyof Stats]} {statDeltaDisplay(k, d)}</span>; }) : <span>변화 없음</span>}</div>}
            <div className="button-row">
                {!equipped && <>
                    <button className="secondary small" disabled={busy} onClick={() => send({ type: 'lockItem', id: item.id })}>{item.locked ? '보호 해제' : '보호'}</button>
                    <ConfirmButton label={`${format(saleValue(item))} G 판매`} title={`${item.name}을(를) 판매할까요?`} description={`${format(saleValue(item))} G를 받고 장비가 사라집니다.`} disabled={busy || !!item.locked || !!item.relic} onConfirm={() => send({ type: 'sell', id: item.id })}/>
                    <ConfirmButton label={`분해 · 정수 +${dismantleEssence(item)}`} title={`${item.name}을(를) 분해할까요?`} description={`정수 ${dismantleEssence(item)}를 얻고 장비가 사라집니다.`} disabled={busy || !!item.locked || !!item.relic} onConfirm={() => send({ type: 'dismantle', id: item.id })}/>
                </>}
            </div>
            <details className="forge-details"><summary>{item.relic ? '강화 · 옵션 이식' : '강화 · 옵션 재설정'}</summary><EquipmentForge s={s} send={send} busy={busy} item={item}/></details>
        </div>;
    };
    const row = (item: Item, equipped = false) => {
        const gain = equipped ? 0 : preview.get(item.id)?.gain || 0, expanded = open === item.id;
        return <article key={item.id} className={`panel gear-row ${expanded ? 'expanded' : ''} ${equipped ? 'equipped' : ''}`} style={{ '--rarity': RARITIES[item.rarity].color } as React.CSSProperties}>
            <button type="button" className="gear-row-main" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : item.id)}>
                <span className="gear-row-icon"><SlotIcon slot={item.slot} size={20}/></span>
                <span className="gear-row-name"><strong>{item.name} <span className="gold-text">{starLabel(item.enhance || 0)}</span>{item.locked && <Lock size={12} aria-label="보호"/>}{item.relic && <Sparkles size={12} aria-label="환생 보존 유물"/>}</strong><small>{RARITIES[item.rarity].name} · {SLOTS[item.slot]} · 위력 {item.power} · {item.relic ? '유물' : `Lv.${item.level}`}{item.affixes?.length ? ` · 옵션 ${item.affixes.length}` : ''}</small></span>
                <span className="gear-row-stats">{topStats(item)}</span>
                <span className="gear-row-gain">{equipped ? <span className="gear-gain neutral">착용 중</span> : gainBadge(gain)}</span>
                <ChevronDown size={16} className="gear-row-chevron"/>
            </button>
            <div className="gear-row-actions">
                <button className={`${!equipped && gain > 0 ? 'primary' : 'secondary'} small`} disabled={busy} onClick={() => send({ type: equipped ? 'unequip' : 'equip', id: equipped ? item.slot : item.id })}>{equipped ? '해제' : '장착'}</button>
            </div>
            {expanded && detail(item, equipped)}
        </article>;
    };
    const filtersOn = slot !== 'all' || rarity >= 0 || upgradesOnly || !!q;
    return <>
    <Heading eyebrow="EQUIPMENT & FORGE" title="장비 보관함" description="착용 칸마다 더 좋은 장비가 있으면 바로 추천합니다. 줄을 누르면 상세·강화가 열리고, 전투력은 교체 후 종합 전투력 변화입니다."/>
    <WalletBar s={s} label="보관함 재화와 가방" extra={<div><Swords size={22}/><span>종합 전투력<strong>{format(currentPower)}</strong></span></div>}/>
    <section className="gear-slots" aria-label="착용 장비">{SLOT_IDS.map(id => { const worn = s.equipment[id], up = best(id); return <article key={id} className="panel gear-slot" style={{ '--rarity': worn ? RARITIES[worn.rarity].color : '#5a6f71' } as React.CSSProperties}>
        <div className="gear-slot-head"><SlotIcon slot={id} size={18}/><span>{SLOTS[id]}</span>{worn && <button type="button" className="text-button" disabled={busy} onClick={() => send({ type: 'unequip', id })}>해제</button>}</div>
        {worn ? <button type="button" className="gear-slot-item" onClick={() => setOpen(open === worn.id ? null : worn.id)} aria-expanded={open === worn.id}><strong>{worn.name} <span className="gold-text">{starLabel(worn.enhance || 0, true)}</span></strong><small>{RARITIES[worn.rarity].name} · 위력 {worn.power}</small><span className="gear-row-stats">{topStats(worn)}</span></button> : <p className="gear-slot-empty">비어 있음</p>}
        {up ? <div className="gear-slot-upgrade"><span><ArrowUpRight size={13}/>추천 <b>{up.name}</b> {gainBadge(preview.get(up.id)!.gain)}</span><button className="primary small" disabled={busy} onClick={() => send({ type: 'equip', id: up.id })}>바로 장착</button></div> : <p className="gear-slot-upgrade muted">가방에 더 좋은 {SLOTS[id]} 없음</p>}
        {worn && open === worn.id && detail(worn, true)}
    </article>; })}</section>
    {upgrades.length > 1 && <p className="gear-upgrade-all"><ArrowUpRight size={14}/>{upgrades.length}개 칸에 더 좋은 장비가 있습니다. 각 칸의 ‘바로 장착’으로 하나씩 바꾸세요.</p>}
    <section className="gear-toolbar" aria-label="가방 필터">
        <label className="job-search-box gear-search"><Search size={15}/><input type="search" value={query} placeholder="장비 이름·등급·부위 검색" aria-label="장비 검색" onChange={e => setQuery(e.target.value)}/></label>
        <Tabs value={slot} onValueChange={setSlot}><TabsList className="game-tabs gear-slot-tabs"><TabsTrigger value="all">전체 {s.inventory.length}</TabsTrigger>{SLOT_IDS.map(id => <TabsTrigger key={id} value={id}>{SLOTS[id]} {s.inventory.filter(i => i.slot === id).length}</TabsTrigger>)}</TabsList></Tabs>
        <div className="gear-toolbar-row">
            <label className="gear-select">정렬<select value={sort} onChange={e => setSort(e.target.value as SortKey)} aria-label="정렬">{(Object.keys(SORTS) as SortKey[]).map(k => <option key={k} value={k}>{SORTS[k]}</option>)}</select></label>
            <label className="gear-select">등급<select value={rarity} onChange={e => setRarity(Number(e.target.value))} aria-label="등급 필터"><option value={-1}>전체 등급</option>{RARITIES.map((r, i) => <option key={r.name} value={i}>{r.name} {s.inventory.filter(x => x.rarity === i).length}</option>)}</select></label>
            <button type="button" className={`gear-toggle ${upgradesOnly ? 'active' : ''}`} aria-pressed={upgradesOnly} onClick={() => setUpgradesOnly(v => !v)}><ArrowUpRight size={14}/>전투력 상향만</button>
            {filtersOn && <button type="button" className="text-button" onClick={() => { setSlot('all'); setRarity(-1); setUpgradesOnly(false); setQuery(''); }}>필터 초기화</button>}
            <span className="gear-count">{shown.length} / {s.inventory.length}개 표시</span>
        </div>
    </section>
    <div className="gear-list">{shown.slice(0, limit).map(i => row(i))}</div>
    {shown.length > limit && <button type="button" className="gear-more" onClick={() => setLimit(v => v + PAGE)}><ChevronDown size={15}/> 더 보기 · 남은 {shown.length - limit}개</button>}
    {limit > PAGE && shown.length <= limit && <button type="button" className="gear-more muted" onClick={() => setLimit(PAGE)}>접기</button>}
    {!s.inventory.length ? <div className="notice">가방이 비어 있습니다. 사냥 또는 상점에서 장비를 획득하세요.</div> : !shown.length && <div className="notice">조건에 맞는 장비가 없습니다.</div>}
    <details className="panel bulk-sale gear-bulk">
    <summary><h2>등급별 일괄판매 · 분해</h2><span>보호 장비·유물·착용 장비는 제외 · 분해 정수 등급별 {ESSENCE_BY_RARITY.join('·')}</span></summary>
    <p>가방 전체에서 선택한 등급만 판매하거나 분해합니다. 분해하면 옵션 재설정에 쓰는 정수를 얻습니다.</p>
    <div className="button-row">{RARITIES.map((r, i) => { const items = bulkItems(s, i), gold = items.reduce((sum, item) => sum + saleValue(item), 0); return <ConfirmButton key={r.name} label={`${r.name} ${items.length}개`} title={`${r.name} 장비 ${items.length}개를 판매할까요?`} description={`보호하지 않은 일반 장비만 판매하여 ${format(gold)} G를 받습니다. 장착 장비와 환생 유물은 제외됩니다.`} disabled={busy || !items.length} onConfirm={() => send({ type: 'sellRarity', id: String(i) })}/>; })}</div>
    <div className="button-row">{RARITIES.map((r, i) => { const items = bulkItems(s, i); return <ConfirmButton key={'d' + r.name} label={`${r.name} 분해 ${items.length}`} title={`${r.name} 장비 ${items.length}개를 분해할까요?`} description={`보호하지 않은 장비만 분해해 정수 ${items.length * (ESSENCE_BY_RARITY[i] || 1)}를 얻습니다. 장착 장비와 환생 유물은 제외됩니다.`} disabled={busy || !items.length} onConfirm={() => send({ type: 'dismantleRarity', id: String(i) })}/>; })}</div>
    </details></>;
}

/** v27.96 유물 옵션 이식: 같은 부위의 가방 장비(보호 제외) 하나를 소비해 옵션 한 줄을 유물의 칸(최대 RELIC_GROWTH.imprintSlots)에 새깁니다. 환생해도 남습니다. */
function RelicImprint({ s, send, busy, item }: PanelProps & { item: Item }) {
    const sources = s.inventory.filter(x => x.slot === item.slot && !x.relic && !x.locked && x.affixes?.length);
    const choices = sources.flatMap(x => x.affixes!.map((a, i) => ({ key: `${x.id}:${i}`, item: x, affix: a, index: i })));
    const [choice, setChoice] = useState(''), [slot, setSlot] = useState(0);
    const picked = choices.find(c => c.key === choice) || choices[0];
    const key = picked?.key || '';
    const lines = item.affixes || [], cost = picked ? imprintCost(picked.item, s) : 0;
    const blocked = !picked ? '' : lines.some((x, i) => i !== slot && x.id === picked.affix.id) ? '이미 같은 옵션이 새겨져 있습니다.' : picked.affix.rule && lines.some((x, i) => i !== slot && x.rule) ? '규칙 옵션은 유물당 하나만 새길 수 있습니다.' : s.gold < cost ? '골드가 부족합니다.' : '';
    const label = (a: NonNullable<Item['affixes']>[number]) => `${a.name} · ${STAT_LABELS[a.stat]} ${statDeltaDisplay(a.stat, a.value)}`;
    return <div className="relic-imprint">
        <b>옵션 이식 · 환생 {s.rebirths}회 위력 ×{(1 + s.rebirths * RELIC_GROWTH.perRebirth).toFixed(2)}</b>
        <div className="relic-imprint-slots">{Array.from({ length: RELIC_GROWTH.imprintSlots }, (_, i) => <label key={i} className={`altar-anon${slot === i ? ' on' : ''}`}><input type="radio" name={`imprint-${item.id}`} checked={slot === i} onChange={() => setSlot(i)}/> {i + 1}번 칸 · {lines[i] ? label(lines[i]) : '비어 있음'}</label>)}</div>
        {choices.length ? <>
            <label className="gear-select">소비할 장비·옵션<select value={key} onChange={e => setChoice(e.target.value)}>{choices.map(c => <option key={c.key} value={c.key}>{c.item.name}{starLabel(c.item.enhance || 0) ? ` ${starLabel(c.item.enhance || 0)}` : ''} › {label(c.affix)}</option>)}</select></label>
            <ConfirmButton label={`이식 · ${format(cost)} G`} title={`${picked!.affix.name} 옵션을 ${slot + 1}번 칸에 이식할까요?`} description={`${picked!.item.name}이(가) 사라지고 ${picked!.affix.name} 옵션이 유물에 남습니다.${lines[slot] ? ` ${lines[slot].name} 옵션을 덮어씁니다.` : ''} 골드 ${format(cost)} G를 사용합니다.`} disabled={busy || !!blocked} onConfirm={() => send({ type: 'imprintRelic', id: item.id, value: `${picked!.key}:${slot}` })}/>
            {blocked && <p className="footnote negative">{blocked}</p>}
        </> : <p className="footnote">같은 부위의 옵션 달린 장비(보호 제외)가 가방에 있어야 이식할 수 있습니다.</p>}
        <p className="footnote">이식 비용은 소비하는 장비의 옵션 재설정 골드 ×{RELIC_GROWTH.imprintCost}. 이식 옵션과 성은 환생해도 남고, 파괴되면 {STARFORCE.relicResetStar}성으로 돌아갑니다.</p>
    </div>;
}

export function EquipmentForge({ s, send, busy, item }: PanelProps & { item: Item }) {
    // v27.93 스타포스: 성공·실패(유지/하락)·파괴 확률과 찬스 타임, 15·16성 파괴 방지(비용 2배).
    const [safeguard, setSafeguard] = useState(false);
    const star = item.enhance || 0, max = enhanceMaxFor(item), chance = chanceTime(item), guard = safeguard && canSafeguard(star);
    const cost = enhanceCost(item, s) * (guard ? STARFORCE.safeguardCost : 1);
    const p = chance ? 1 : starSuccess(star), d = chance ? 0 : starDestroy(star, guard), f = Math.max(0, 1 - p - d), pct = (n: number) => `${Math.round(n * 1000) / 10}%`;
    return <div className="forge-actions">
        <div className="star-row" aria-label={`${star} / ${max}성`}>{Array.from({ length: max }, (_, i) => <i key={i} className={i < star ? 'on' : ''} aria-hidden>{i < star ? '★' : '☆'}</i>)}<b>{star} / {max}성</b></div>
        {star < max && <dl className="star-odds"><div><dt>성공</dt><dd className="positive">{pct(p)}</dd></div><div><dt>실패</dt><dd>{pct(f)} · {starDrops(star) ? '1성 하락' : '유지'}</dd></div>{(d > 0 || canSafeguard(star)) && <div><dt>파괴</dt><dd className={d > 0 ? 'negative' : ''}>{pct(d)}</dd></div>}</dl>}
        {chance && star < max && <p className="footnote positive">찬스 타임 · 하락이 두 번 이어져 다음 시도는 100% 성공합니다.</p>}
        {canSafeguard(star) && <label className="altar-anon"><input type="checkbox" checked={safeguard} onChange={e => setSafeguard(e.target.checked)}/> 파괴 방지 (비용 ×{STARFORCE.safeguardCost})</label>}
        <button className="primary" disabled={busy || star >= max || s.gold < cost} onClick={() => send({ type: 'enhance', id: item.id, ...(guard ? { value: 'safeguard' } : {}) })}>{star >= max ? '최대 강화' : `${star + 1}성 강화 · ${format(cost)} G`}</button>
        <p className="footnote">1~{STARFORCE.gainHighFrom}성 기본 수치 +{STARFORCE.gainLow * 100}%/성, {STARFORCE.gainHighFrom + 1}성부터 +{STARFORCE.gainHigh * 100}%/성. {STARFORCE.dropFrom}성부터 실패하면 1성 하락({STARFORCE.safeStars.join('·')}성은 유지), 15성부터 파괴 확률이 붙습니다. 파괴된 장비는 사라지고 유물은 {STARFORCE.relicResetStar}성으로 돌아갑니다. 판매하면 강화 비용의 {ECONOMY.saleEnhanceRefund * 100}%를 돌려받습니다.{item.slot === 'charm' ? ' 치명타가 100%를 넘으면 그만큼 극 치명타 확률이 됩니다.' : ''}</p>
        {item.relic && <RelicImprint s={s} send={send} busy={busy} item={item}/>}
        {item.affixes?.length && !item.relic ? <p className="footnote">옵션은 위 옵션 목록에서 하나씩 재설정합니다.</p> : <ConfirmButton label={`옵션 재설정 · ${format(rerollCost(item, s).gold)} G + 정수 ${rerollCost(item, s).essence}`} title="추가 옵션을 무작위로 바꿀까요?" description={`이전 방식의 단일 옵션입니다. 기존 추가 옵션이 사라지고 8종 중 하나가 같은 확률로 선택됩니다. 유물의 전용 옵션도 교체됩니다. 골드 ${format(rerollCost(item, s).gold)} G와 정수 ${rerollCost(item, s).essence}(보유 ${s.essence || 0})를 사용합니다.`} disabled={busy || item.rarity === 0 || s.gold < rerollCost(item, s).gold || (s.essence || 0) < rerollCost(item, s).essence} onConfirm={() => send({ type: 'reforge', id: item.id })}/>}
    </div>;
}
