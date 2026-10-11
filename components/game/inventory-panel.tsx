'use client';
import { ConfirmButton } from './confirm-button';
import { useEffect, useRef, useState } from 'react';
import { StarCatch } from './star-catch';
import { useStarSetting, starSound } from './star-catch-setting';
import { ArrowUpRight, ChevronDown, Gem, Lock, Search, Sparkles, Swords } from 'lucide-react';
import { OnyxArt } from './onyx-art';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CombatStats, Item, State, Stats } from '@/game/types';
import { ECONOMY, AFFIXES, RELIC_GROWTH, GEAR_LEVEL_UP, HEIR_GROWTH, AWAKENING, PRIMAL_INHERIT, heirFactor, awakenEssence, researchRank } from '@/game/data/economy';
import { SLOTS, RARITIES } from '@/game/data/balance';
import { STAT_LABELS, byStatOrder, statDeltaDisplay, HIDDEN_STATS, RELIC_LINEAGE } from '@/game/data/progression';
import { jobById, lineageOf } from '@/game/data/classes';
import { itemStats, itemDescription, enhanceCost, permanentStarScale, imprintAffix, bulkItems, saleValue, dismantleEssence, primalGaugeOf, keepsAcrossLives, heirKind, rerollCost, refineCost, canResetGear, refineTopOf, enhanceMaxFor, imprintCost, levelUpTarget, levelUpCost } from '@/game/systems/equipment';
import { ORIGIN_THEMES, affixDef, affixQuality, ESSENCE_BY_RARITY, REROLL_STEP_PCT, REFINE_GROWTH, GEAR_RESET_PEARLS, HEIR_ROLL_TAIL, HEIR_ROLL_TOP, heirRollChanceAbove } from '@/game/data/gear';
import { STARFORCE, starSuccess, starDrops, starDestroy, canSafeguard, chanceTime, starMultiplier, starLabel } from '@/game/data/starforce';
import { stats, power } from '@/game/systems/stats';
import { Heading, SlotIcon, format, WalletBar } from './shared';
const PAGE = 12;
import type { PanelProps } from './panel-props';
import { CoreSlot } from './core-slot';
/** v3.283 렐릭의 힘(경험치 보너스에서 계산)은 패스파인더 계보일 때만 비교에 보입니다. */
const relicShown = (s: State) => { const j = jobById(s.job); return !!j && lineageOf(j) === RELIC_LINEAGE; };
/** v3.93 교체 미리보기 캐시: 장비 · 가방 · 성장(레벨 · 직업 · 스킬 · 능력치 · 연구)이 같으면 지난 계산을 씁니다. 화면 하나만 쓰므로 한 칸이면 충분합니다. */
let previewCache: { key: string; value: { current: CombatStats; currentPower: number; preview: Map<string, { after: Stats; gain: number }> } } | null = null;
function gearPreview(s: State) {
    const gear = (i: Item | null | undefined) => i ? `${i.id}:${i.enhance || 0}:${i.affixes?.length || 0}` : '-';
    const key = [s.name, s.level, s.job, s.rebirths, s.skills.join(','), JSON.stringify(s.learned), JSON.stringify(s.attributes), JSON.stringify(s.permanent), SLOT_IDS.map(id => gear(s.equipment[id])).join(','), s.inventory.map(gear).join(',')].join('|');
    if (previewCache?.key === key) return previewCache.value;
    const current = stats(s), currentPower = power(current), preview = new Map<string, { after: Stats; gain: number }>();
    for (const item of s.inventory) { const after = stats({ ...s, equipment: { ...s.equipment, [item.slot]: item } }); preview.set(item.id, { after, gain: power(after) - currentPower }); }
    previewCache = { key, value: { current, currentPower, preview } };
    return previewCache.value;
}
export function BonusList({ item }: {
    item: Item;
}) {
    return <div className="equipment-numbers">{byStatOrder(Object.entries(itemStats(item))).map(([key, value]) => <span key={key}>{STAT_LABELS[key as keyof Stats]}<b>{statDeltaDisplay(key, value as number)}</b>
        </span>)}</div>;
}

/** v22 장비 옵션 목록. 옵션마다 이득·손해 수치와 한 줄 재설정 버튼을 보여줍니다. */
function GearOptions({ s, send, busy, item }: PanelProps & { item: Item }) {
    const cost = rerollCost(item, s), canPay = s.gold >= cost.gold;
    // v27.94 수치 재련: 옵션 종류는 그대로 두고 수치만 다시 굴립니다. v3.118 정수만, 이 장비를 재련할수록 ×REFINE_GROWTH 복리.
    const refine = refineCost(item, s), canRefine = (s.essence || 0) >= refine.essence;
    // v3.125 원시 고대 · 계승 태초 · 칠흑은 재련 상한이 150%라 수치 표시도 그 위까지 보입니다(refineTopOf).
    // v3.201 표시는 계승 최고(150%)까지: 주화 상점 수치 상품으로 일반 장비도 100%를 넘을 수 있습니다. 재련 상한(top)은 그대로.
    const top = refineTopOf(item), quality = (x: NonNullable<Item['affixes']>[number]) => { const q = affixQuality(x, item.power, item.rarity, item.level, HEIR_ROLL_TOP); return q === null ? null : Math.round(q * 100); };
    return <div className="affix-explanation">
        <b>{item.relic ? `이식 옵션 ${item.affixes!.length}/${RELIC_GROWTH.imprintSlots}줄` : `추가 옵션 ${item.affixes!.length}개`}{item.origin && ORIGIN_THEMES[item.origin] ? ` · ${ORIGIN_THEMES[item.origin].name}에서 획득` : ''}</b>
        {item.affixes!.map((x, i) => <div key={x.id + i} className="gear-option-row">
            <span>{x.rule ? '◆ ' : ''}<b>{x.name}</b>{!HIDDEN_STATS.has(x.stat) && <> · {STAT_LABELS[x.stat]} {statDeltaDisplay(x.stat, x.value)}</>}{x.stat2 && x.value2 ? ` · ${STAT_LABELS[x.stat2]} ${statDeltaDisplay(x.stat2, x.value2)}` : ''}{quality(x) !== null && <em className="affix-quality"> · 수치 {quality(x)}%</em>}</span>
            <small>{affixDef(x.id)?.description}</small>
            {!item.relic && !(item.onyx && x.rule) && <span className="gear-option-actions"><ConfirmButton label="재설정" title={`${x.name} 옵션을 다시 굴릴까요?`} description={`이 옵션 하나만 바뀌고 나머지 옵션은 그대로입니다. 골드 ${format(cost.gold)} G를 사용합니다(정수 없음). 같은 옵션은 중복되지 않고, 규칙 옵션(◆)은 장비당 1개까지입니다.`} disabled={busy || !canPay} onConfirm={() => send({ type: 'reforge', id: item.id, value: String(i) })}/>
                {!x.rule && !affixDef(x.id)?.fixed && <ConfirmButton label="재련" title={`${x.name} 옵션의 수치를 다시 굴릴까요?`} description={`옵션 종류는 그대로이고 수치만 최저~최고 사이에서 다시 굴립니다${top > 1 ? `. 이 장비는 수치 ${Math.round(top * 100)}%까지 가능하지만 100% 위는 ${Math.round(HEIR_ROLL_TAIL * 100)}%만 나오고 위로 갈수록 급히 드뭅니다(110% 위 ${(heirRollChanceAbove(1.1) * 100).toFixed(1)}% · 120% 위 ${(heirRollChanceAbove(1.2) * 100).toFixed(1)}% · 130% 위 ${(heirRollChanceAbove(1.3) * 100).toFixed(2)}%)` : ''}. 지금보다 낮아질 수도 있습니다. 정수 ${format(refine.essence)}를 사용합니다(골드 없음). 이 장비를 재련할 때마다 다음 정수가 ×${REFINE_GROWTH}로 오릅니다.`} disabled={busy || !canRefine} onConfirm={() => send({ type: 'refine', id: item.id, value: String(i) })}/>}
            </span>}
        </div>)}
        <p className="footnote">{item.relic ? '이식 옵션은 환생해도 남고, 같은 칸에 다시 이식하면 덮어씁니다. 고정 수치 · 비율 옵션 모두 유물 등급 기준으로 맞춰 새겨집니다(태초에서 온 비율 줄 ×0.73). 위 수치는 장비 기여 수치에 포함됩니다.' : <>옵션 재설정 · {format(cost.gold)} G{item.rerolls ? ` (이 장비 ${item.rerolls}회 재설정 · 1회마다 +${REROLL_STEP_PCT}%)` : ` (재설정할 때마다 +${REROLL_STEP_PCT}%)`} · 수치 재련 · 정수 {format(refine.essence)}{item.refines ? ` (이 장비 ${item.refines}회 재련 · 1회마다 ×${REFINE_GROWTH})` : ` (재련할 때마다 ×${REFINE_GROWTH})`} · 보유 정수 {format(s.essence || 0)}</>}</p>
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
    // 장비마다 교체 후 최종 능력치와 전투력 변화를 한 번만 계산합니다. v3.93 장비 · 성장 상태가 바뀔 때만 다시 계산합니다.
    const { current, currentPower, preview } = gearPreview(s);
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
        const delta = byStatOrder(Object.entries(after).filter(([k, n]) => Math.abs(n - current[k as keyof Stats]) > .001 && (k !== 'relicPower' || relicShown(s))));
        // v3.76 상세는 작업대 하나: 왼쪽 능력치 · 옵션(가방 장비는 교체 비교 · 판매/분해), 오른쪽 강화.
        return <div className="gear-detail"><ForgeBench s={s} send={send} busy={busy} item={item} extra={!equipped && <>
            <div className="equipment-comparison">
                <small>교체 후 최종 능력치 변화</small>{delta.length ? delta.map(([k, n]) => { const d = n - current[k as keyof Stats]; return <span key={k} className={d > 0 ? 'positive' : 'negative'}>{STAT_LABELS[k as keyof Stats]} {statDeltaDisplay(k, d)}</span>; }) : <span>변화 없음</span>}</div>
            <div className="button-row">
                <button className="secondary small" disabled={busy} onClick={() => send({ type: 'lockItem', id: item.id })}>{item.locked ? '보호 해제' : '보호'}</button>
                <ConfirmButton label={`${format(saleValue(item))} G 판매${primalGaugeOf(item) ? ' · 계승 게이지 +1' : ''}`} title={`${item.name}을(를) 판매할까요?`} description={`${format(saleValue(item))} G를 받고 장비가 사라집니다.${primalGaugeOf(item) ? ` 태초 계승 게이지가 1 찹니다(${(s.primalGauge || 0) + 1}/${PRIMAL_INHERIT.gauge}).` : ''}`} disabled={busy || !!item.locked || keepsAcrossLives(item)} onConfirm={() => send({ type: 'sell', id: item.id })}/>
                <ConfirmButton label={`분해 · 정수 +${dismantleEssence(item, s)}${primalGaugeOf(item) ? ' · 계승 게이지 +1' : ''}`} title={`${item.name}을(를) 분해할까요?`} description={`정수 ${dismantleEssence(item, s)}를 얻고 장비가 사라집니다.${primalGaugeOf(item) ? ` 태초 계승 게이지가 1 찹니다(${(s.primalGauge || 0) + 1}/${PRIMAL_INHERIT.gauge}).` : ''}`} disabled={busy || !!item.locked || keepsAcrossLives(item)} onConfirm={() => send({ type: 'dismantle', id: item.id })}/>
            </div>
        </>}/></div>;
    };
    const row = (item: Item, equipped = false) => {
        const gain = equipped ? 0 : preview.get(item.id)?.gain || 0, expanded = open === item.id;
        return <article key={item.id} className={`panel gear-row ${expanded ? 'expanded' : ''} ${equipped ? 'equipped' : ''}${item.onyx ? ' onyx-frame' : ''}`} style={{ '--rarity': RARITIES[item.rarity].color } as React.CSSProperties}>
            <button type="button" className="gear-row-main" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : item.id)}>
                <span className={`gear-row-icon${item.onyx ? ' onyx-icon' : ''}`}>{item.onyx ? <OnyxArt id={item.onyx} size={30}/> : <SlotIcon slot={item.slot} size={20}/>}</span>
                <span className="gear-row-name"><strong><span className={item.onyx ? 'onyx-name' : ''}>{item.name}{item.onyxRank ? ` +${item.onyxRank}` : ''}</span> <span className="gold-text">{starLabel(item.enhance || 0)}</span>{item.locked && <Lock size={12} aria-label="보호"/>}{item.relic && <Sparkles size={12} aria-label="환생 보존 유물"/>}{item.heir && <Sparkles size={12} aria-label={HEIR_LABEL[item.heir]}/>}{item.onyx && <Gem size={12} aria-label="칠흑 장신구"/>}</strong><small>{item.onyx ? `칠흑${item.onyxRank ? ` · 각성 ${item.onyxRank}` : ''}` : RARITIES[item.rarity].name} · {SLOTS[item.slot]} · 위력 {item.power} · {item.relic ? '유물' : item.heir ? `${HEIR_LABEL[item.heir]} · Lv.${item.level}` : `Lv.${item.level}`}{item.affixes?.length ? ` · 옵션 ${item.affixes.length}` : ''}</small></span>
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
    <section className="gear-slots" aria-label="착용 장비">{SLOT_IDS.map(id => { const worn = s.equipment[id], up = best(id); return <article key={id} className={`panel gear-slot${worn?.onyx ? ' onyx-frame' : ''}`} style={{ '--rarity': worn ? RARITIES[worn.rarity].color : '#5a6f71' } as React.CSSProperties}>
        <div className="gear-slot-head"><SlotIcon slot={id} size={18}/><span>{SLOTS[id]}</span>{worn && <button type="button" className="text-button" disabled={busy} onClick={() => send({ type: 'unequip', id })}>해제</button>}</div>
        {worn ? <button type="button" className={`gear-slot-item${open === worn.id ? ' open' : ''}`} onClick={() => { const next = open === worn.id ? null : worn.id; setOpen(next); if (next && window.innerWidth <= 900) requestAnimationFrame(() => document.getElementById('gear-slot-open')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }} aria-expanded={open === worn.id}><strong><span className={worn.onyx ? 'onyx-name' : ''}>{worn.name}</span> <span className="gold-text">{starLabel(worn.enhance || 0, true)}</span></strong><small>{worn.onyx ? '칠흑' : RARITIES[worn.rarity].name} · 위력 {worn.power}</small><span className="gear-row-stats">{topStats(worn)}</span></button> : <p className="gear-slot-empty">비어 있음</p>}
        {up ? <div className="gear-slot-upgrade"><span><ArrowUpRight size={13}/>추천 <b>{up.name}</b> {gainBadge(preview.get(up.id)!.gain)}</span><button className="primary small" disabled={busy} onClick={() => send({ type: 'equip', id: up.id })}>바로 장착</button></div> : <p className="gear-slot-upgrade muted">가방에 더 좋은 {SLOTS[id]} 없음</p>}
    </article>; })}</section>
    <CoreSlot s={s} send={send} busy={busy}/>
    {(() => { const worn = SLOT_IDS.map(id => s.equipment[id]).find(w => w && w.id === open); return worn && <article id="gear-slot-open" className={`panel gear-slot-open${worn.onyx ? ' onyx-frame' : ''}`} style={{ '--rarity': RARITIES[worn.rarity].color } as React.CSSProperties} aria-label={`${worn.name} 상세 · 강화`}>
        <ForgeHead item={worn} onClose={() => setOpen(null)}/>{detail(worn, true)}</article>; })()}
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
    <p>가방 전체에서 선택한 등급만 판매하거나 분해합니다. 분해하면 수치 재련에 쓰는 정수를 얻습니다. 태초는 팔아도 분해해도 계승 게이지가 1씩 찹니다.</p>
    <div className="button-row">{RARITIES.map((r, i) => { const items = bulkItems(s, i), gold = items.reduce((sum, item) => sum + saleValue(item), 0); return <ConfirmButton key={r.name} label={`${r.name} ${items.length}개`} title={`${r.name} 장비 ${items.length}개를 판매할까요?`} description={`보호하지 않은 일반 장비만 판매하여 ${format(gold)} G를 받습니다. 장착 장비와 환생 유물은 제외됩니다.`} disabled={busy || !items.length} onConfirm={() => send({ type: 'sellRarity', id: String(i) })}/>; })}</div>
    <div className="button-row">{RARITIES.map((r, i) => { const items = bulkItems(s, i); return <ConfirmButton key={'d' + r.name} label={`${r.name} 분해 ${items.length}`} title={`${r.name} 장비 ${items.length}개를 분해할까요?`} description={`보호하지 않은 장비만 분해해 정수 ${items.length * (ESSENCE_BY_RARITY[i] || 1)}를 얻습니다. 장착 장비와 환생 유물은 제외됩니다.`} disabled={busy || !items.length} onConfirm={() => send({ type: 'dismantleRarity', id: String(i) })}/>; })}</div>
    </details></>;
}

/** v3.3 유물 옵션 이식: 같은 부위의 가방 장비(보호 제외) 하나를 소비해 옵션 한 줄을 유물의 칸(최대 RELIC_GROWTH.imprintSlots)에 새깁니다. 환생해도 남습니다. */
function RelicImprint({ s, send, busy, item }: PanelProps & { item: Item }) {
    const sources = s.inventory.filter(x => x.slot === item.slot && !x.relic && !x.locked && x.affixes?.length);
    const choices = sources.flatMap(x => x.affixes!.map((a, i) => ({ key: `${x.id}:${i}`, item: x, affix: a, index: i })));
    const [choice, setChoice] = useState(''), [slot, setSlot] = useState(0);
    const picked = choices.find(c => c.key === choice) || choices[0];
    const key = picked?.key || '';
    const lines = item.affixes || [], cost = picked ? imprintCost(picked.item, s) : 0;
    const blocked = !picked ? '' : lines.some((x, i) => i !== slot && x.id === picked.affix.id) ? '이미 같은 옵션이 새겨져 있습니다.' : picked.affix.rule && lines.some((x, i) => i !== slot && x.rule) ? '규칙 옵션은 유물당 하나만 새길 수 있습니다.' : s.gold < cost ? '골드가 부족합니다.' : '';
    // v3.82 양날 옵션(유리 대포 등)은 손해 쪽까지 함께 보여 줍니다.
    const label = (a: NonNullable<Item['affixes']>[number]) => `${a.name} · ${STAT_LABELS[a.stat]} ${statDeltaDisplay(a.stat, a.value)}${a.stat2 && a.value2 ? ` · ${STAT_LABELS[a.stat2]} ${statDeltaDisplay(a.stat2, a.value2)}` : ''}`;
    // v3.82 미리보기: 이식한 유물을 그 부위에 장착했을 때 최종 능력치 · 전투력 변화(직업 · 연구 배율까지 반영).
    const preview = (() => {
        if (!picked) return null;
        const next = [...lines]; next[slot] = imprintAffix(picked.affix, picked.item.rarity, item.rarity, picked.item.level, item.level);
        const withRelic = (affixes: Item['affixes']) => ({ ...s, equipment: { ...s.equipment, [item.slot]: { ...item, affixes } } });
        const before = stats(withRelic(lines)), after = stats(withRelic(next.filter(Boolean)));
        const delta = byStatOrder(Object.entries(after).filter(([k, n]) => Math.abs(n - before[k as keyof Stats]) > .001 && (k !== 'relicPower' || relicShown(s)))).map(([k, n]) => [k, n - before[k as keyof Stats]] as const);
        return { delta, gain: power(after) - power(before) };
    })();
    return <div className="relic-imprint">
        <b>옵션 이식 · 환생 {s.rebirths}회 위력 배율 ×{heirFactor('relic', s.rebirths).toFixed(2)}{item.relicLegacy ? ' · 다음 승천까지 예전 공식과 새 공식 중 높은 쪽' : ''}</b>
        <div className="relic-imprint-slots">{Array.from({ length: RELIC_GROWTH.imprintSlots }, (_, i) => <div key={i} className="relic-imprint-slot"><label className={`altar-anon${slot === i ? ' on' : ''}`}><input type="radio" name={`imprint-${item.id}`} checked={slot === i} onChange={() => setSlot(i)}/> {i + 1}번 칸 · {lines[i] ? label(lines[i]) : '비어 있음'}</label>{lines[i] && <ConfirmButton label="지우기" title={`${lines[i].name} 이식 옵션을 지울까요?`} description="이 칸이 비고 옵션은 사라집니다(되돌릴 수 없음). 비용은 없고, 다시 이식할 수 있습니다." disabled={busy} onConfirm={() => send({ type: 'removeImprint', id: item.id, value: String(i) })}/>}</div>)}</div>
        {choices.length ? <>
            <label className="gear-select">소비할 장비·옵션<select value={key} onChange={e => setChoice(e.target.value)}>{choices.map(c => <option key={c.key} value={c.key}>{c.item.name}{starLabel(c.item.enhance || 0) ? ` ${starLabel(c.item.enhance || 0)}` : ''} › {label(imprintAffix(c.affix, c.item.rarity, item.rarity, c.item.level, item.level))}</option>)}</select></label>
            <ConfirmButton label={`이식 · ${format(cost)} G`} title={`${picked!.affix.name} 옵션을 ${slot + 1}번 칸에 이식할까요?`} description={`${picked!.item.name}이(가) 사라지고 ${picked!.affix.name} 옵션이 유물에 남습니다.${lines[slot] ? ` ${lines[slot].name} 옵션을 덮어씁니다.` : ''} 골드 ${format(cost)} G를 사용합니다.`} disabled={busy || !!blocked} onConfirm={() => send({ type: 'imprintRelic', id: item.id, value: `${picked!.key}:${slot}` })}/>
            {picked && <div className="relic-imprint-preview">
                <small>{affixDef(picked.affix.id)?.description}</small>
                {preview && <div className="equipment-comparison"><small>이 유물을 {SLOTS[item.slot]} 칸에 장착했을 때 최종 능력치 변화 · 전투력 {preview.gain >= 0 ? '+' : '−'}{format(Math.abs(preview.gain))}</small>{preview.delta.length ? preview.delta.map(([k, d]) => <span key={k} className={d > 0 ? 'positive' : 'negative'}>{STAT_LABELS[k as keyof Stats]} {statDeltaDisplay(k, d)}</span>) : <span>변화 없음</span>}</div>}
            </div>}
            {blocked && <p className="footnote negative">{blocked}</p>}
        </> : <p className="footnote">같은 부위의 옵션 달린 장비(보호 제외)가 가방에 있어야 이식할 수 있습니다.</p>}
        <p className="footnote">고정 수치 옵션은 원래 장비에서와 같은 효과가 되도록 유물 등급에 맞춰 환산하고, 유물보다 레벨이 높은 장비의 줄은 유물 레벨에 맞춰 낮춰 새깁니다(목록의 수치가 새겨질 값, 유물 레벨을 올리면 함께 오름). 이식 비용은 소비하는 장비의 옵션 재설정 골드 ×{RELIC_GROWTH.imprintCost}. 이식 옵션과 성은 환생해도 남고, 파괴되면 {STARFORCE.relicResetStar}성으로 돌아갑니다.</p>
    </div>;
}

/** v3.66 계승: 고대는 정수로 원시 각성, 태초는 분해 게이지로 계승. 계승하면 환생해도 남고 위력이 환생마다 오르며 옵션이 최고 수치로 고정됩니다. 부위마다 종류별 1개. */
const HEIR_LABEL = { ancient: '원시 고대', primal: '계승 태초' } as const;
function HeirPanel({ s, send, busy, item }: PanelProps & { item: Item }) {
    const kind = item.rarity === 5 ? 'ancient' : 'primal', g = HEIR_GROWTH[kind], label = HEIR_LABEL[kind];
    const factor = (rb: number) => heirFactor(kind, rb).toFixed(2);
    if (item.heir) return <div className="relic-imprint">
        <b>{label} · 환생해도 남습니다</b>
        <p className="footnote">위력 = (레벨 + 2) × 배율 ×{factor(s.rebirths)} (환생 {HEIR_GROWTH.toRebirth}회 ×{g.to}). 강화가 파괴되면 {STARFORCE.relicResetStar}성으로 돌아갑니다. 승천하면 사라집니다.</p>
    </div>;
    const old = [...s.inventory, ...Object.values(s.equipment)].find(x => x && x.id !== item.id && x.heir === kind && x.slot === item.slot);
    const replace = old ? ` 이 부위의 ${label} ‘${old.name}’은(는) 이번 생 장비로 돌아갑니다(다음 환생 때 사라짐).` : '';
    const what = `환생해도 남고, 위력이 (레벨 + 2) × ${factor(s.rebirths)}(환생 ${HEIR_GROWTH.toRebirth}회 ×${g.to})로 바뀌며 옵션 수치가 최고로 고정됩니다. 판매·분해할 수 없게 됩니다.`;
    if (kind === 'ancient') {
        const cost = awakenEssence(s.rebirths), have = s.essence || 0;
        return <div className="relic-imprint">
            <b>원시 각성 · 정수 {format(cost)} (보유 {format(have)})</b>
            <ConfirmButton label={`원시 각성 · 정수 ${format(cost)}`} title={`${item.name}을(를) 원시 각성할까요?`} description={`정수 ${format(cost)}를 씁니다. ${what}${replace}`} disabled={busy || have < cost} onConfirm={() => send({ type: 'awaken', id: item.id })}/>
            <p className="footnote">각성 비용은 환생이 많을수록 늘어납니다(정수 {format(AWAKENING.essenceBase)} × 10^(환생 ÷ {AWAKENING.rebirthScale})). 부위마다 원시 고대 하나만 둘 수 있습니다.</p>
        </div>;
    }
    const gauge = s.primalGauge || 0;
    return <div className="relic-imprint">
        <b>태초 계승 · 게이지 {gauge}/{PRIMAL_INHERIT.gauge}</b>
        <ConfirmButton label={`태초 계승 · 게이지 ${PRIMAL_INHERIT.gauge}`} title={`${item.name}을(를) 계승할까요?`} description={`계승 게이지 ${PRIMAL_INHERIT.gauge}를 씁니다. ${what}${replace}`} disabled={busy || gauge < PRIMAL_INHERIT.gauge} onConfirm={() => send({ type: 'inheritPrimal', id: item.id })}/>
        <p className="footnote">태초 장비가 손을 떠날 때마다(분해 · 판매 · 강화 파괴 · 도감 등록 · 이식 소비) 게이지가 1 찹니다(환생해도 남고 승천하면 초기화). 부위마다 계승 태초 하나만 둘 수 있습니다.</p>
    </div>;
}

/** v3.5 레벨 올리기: +10씩 내 레벨까지(v3.13 마지막 단은 내 레벨까지만). 위력·고정 수치 옵션이 레벨 비례로 오르고 별은 0으로 돌아갑니다. 유물은 레벨이 별 상한(12 + 레벨 ÷ 10)을 정합니다. */
function GearLevelUp({ s, send, busy, item }: PanelProps & { item: Item }) {
    const next = levelUpTarget(item, s), cost = levelUpCost(item, s), star = item.enhance || 0;
    // v3.76 더 올릴 레벨이 없으면 상자 대신 한 줄만 보여 줍니다.
    if (!next) return <p className="forge-note">레벨 올리기 · Lv.{item.level || 1} · 내 레벨(Lv.{s.level})까지 올렸습니다{item.relic ? ` · 별 상한 ${enhanceMaxFor(item)}성` : ''}</p>;
    return <div className="relic-imprint">
        <b>레벨 올리기 · Lv.{item.level || 1} → Lv.{next}{item.relic ? ` · 별 상한 ${enhanceMaxFor(item)}성` : ''}</b>
        <ConfirmButton label={`Lv.${next}로 올리기 · ${format(cost)} G`} title={`${item.name}을(를) Lv.${next}로 올릴까요?`} description={`위력과 고정 수치 옵션이 레벨에 맞춰 오릅니다.${star ? ` 지금 ★${star}은 0으로 돌아갑니다(강화 비용은 돌려받지 않음).` : ''}${item.relic ? ` 유물 별 상한이 ${RELIC_GROWTH.starBase + Math.floor(next / 10)}성이 됩니다.` : ''} 골드 ${format(cost)} G를 사용합니다.`} disabled={busy || s.gold < cost} onConfirm={() => send({ type: 'levelUp', id: item.id })}/>
        <p className="footnote">한 번에 +{GEAR_LEVEL_UP.step}. 올리면 별이 0으로 돌아가니 별은 레벨을 다 올린 뒤에 쌓으세요.{heirKind(item) ? ' 유물·계승 장비 위력은 (레벨 + 2) × 환생 배율입니다.' : ''}</p>
    </div>;
}

/** v3.7 자동 강화(세계석 연구 ‘자동 강화’): 목표 별과 골드 한도를 정해 한 번에 시도합니다. 확률·비용은 수동과 같고 파괴되면 멈춥니다. */
function AutoStar({ s, send, busy, item, safeguard }: PanelProps & { item: Item; safeguard: boolean }) {
    const star = item.enhance || 0, max = enhanceMaxFor(item);
    const [target, setTarget] = useState(Math.min(max, star + 1)), [cap, setCap] = useState('');
    const goal = Math.min(max, Math.max(star + 1, target)), limit = cap.trim() ? Number(cap.replace(/[^\d]/g, '')) : s.gold;
    const ok = Number.isFinite(limit) && limit > 0;
    return <div className="relic-imprint auto-star">
        <b>자동 강화 · 목표까지 연속 시도</b>
        <div className="auto-star-row">
            <label className="gear-select">목표<select value={goal} onChange={e => setTarget(Number(e.target.value))}>{Array.from({ length: max - star }, (_, i) => star + 1 + i).map(n => <option key={n} value={n}>★{n}</option>)}</select></label>
            <label className="gear-select">골드 한도<input type="text" inputMode="numeric" placeholder={`보유 ${format(s.gold)}`} value={cap} onChange={e => setCap(e.target.value)}/></label>
        </div>
        <ConfirmButton label={`★${goal}까지 자동 강화`} title={`★${goal}까지 자동으로 강화할까요?`} description={`한도 ${format(Math.min(limit || 0, s.gold))} G 안에서 목표에 닿을 때까지 계속 시도합니다. 하락·파괴도 그대로 일어나며 파괴되면 멈춥니다.${safeguard ? ' 파괴 방지가 적용됩니다.' : ''}`} disabled={busy || !ok} onConfirm={() => send({ type: 'autoEnhance', id: item.id, value: `${goal}:${Math.min(limit, s.gold)}:${safeguard ? 1 : 0}` })}/>
        <p className="footnote">결과는 전투 기록에 한 줄(시도·성공·하락·유지·파괴·쓴 골드)로 남습니다. 한 번에 최대 2,000회.</p>
    </div>;
}

export function EquipmentForge({ s, send, busy, item }: PanelProps & { item: Item }) {
    // v27.93 스타포스: 성공·실패(유지/하락)·파괴 확률과 찬스 타임, 15·16성 파괴 방지(비용 2배).
    const [safeguard, setSafeguard] = useState(false);
    const star = item.enhance || 0, max = enhanceMaxFor(item), chance = chanceTime(item), guard = safeguard && canSafeguard(star);
    // v3.8 스타캐치: 설정이 켜져 있으면 강화 버튼이 미니게임을 띄우고, 잡으면 value에 'catch'를 붙여 보냅니다. 결과 연출은 별 수·시도 횟수 변화로 판정합니다.
    const catchOn = useStarSetting('catch');
    const [catching, setCatching] = useState(false), [fx, setFx] = useState('');
    const prev = useRef({ star, tries: s.starforce?.tries || 0 });
    useEffect(() => {
        const tries = s.starforce?.tries || 0, before = prev.current;
        if (tries !== before.tries) {
            const kind = star > before.star ? 'success' : star < before.star ? 'drop' : 'keep';
            setFx(`fx-${kind}`); starSound(kind); const t = setTimeout(() => setFx(''), 900);
            prev.current = { star, tries }; return () => clearTimeout(t);
        }
        prev.current = { star, tries };
    }, [star, s.starforce?.tries]);
    const fire = (caught: boolean) => { setCatching(false); const flags = [guard ? 'safeguard' : '', caught ? 'catch' : ''].filter(Boolean).join(','); send({ type: 'enhance', id: item.id, ...(flags ? { value: flags } : {}) }); };
    const cost = enhanceCost(item, s) * (guard ? STARFORCE.safeguardCost : 1);
    const p = chance ? 1 : starSuccess(star), d = chance ? 0 : starDestroy(star, guard), f = Math.max(0, 1 - p - d), pct = (n: number) => `${Math.round(n * 1000) / 10}%`;
    const legacyReroll = !(item.affixes?.length && !item.relic), reroll = rerollCost(item, s);
    return <div className="forge-actions">
        <section className="forge-star" aria-label="스타포스">
            <div className="forge-star-head"><b>스타포스</b><span className="gold-text">★{star} / {max}성</span></div>
            <div className={`star-row ${fx}`} aria-label={`${star} / ${max}성`}>{Array.from({ length: max }, (_, i) => <i key={i} className={i < star ? 'on' : ''} aria-hidden>{i < star ? '★' : '☆'}</i>)}</div>
            {star < max && <dl className="star-odds"><div><dt>성공</dt><dd className="positive">{pct(p)}</dd></div><div><dt>실패</dt><dd>{pct(f)} · {starDrops(star) ? '1성 하락' : '유지'}</dd></div>{(d > 0 || canSafeguard(star)) && <div><dt>파괴</dt><dd className={d > 0 ? 'negative' : ''}>{pct(d)}</dd></div>}</dl>}
            {chance && star < max && <p className="footnote positive">찬스 타임 · 하락이 두 번 이어져 다음 시도는 100% 성공합니다.</p>}
            {canSafeguard(star) && <label className="altar-anon"><input type="checkbox" checked={safeguard} onChange={e => setSafeguard(e.target.checked)}/> 파괴 방지 (비용 ×{STARFORCE.safeguardCost})</label>}
            {catching ? <StarCatch bonus={STARFORCE.catchBonus} onResult={fire}/> : <button className="primary" disabled={busy || star >= max || s.gold < cost} onClick={() => catchOn && !chance ? setCatching(true) : fire(false)}>{star >= max ? '최대 강화' : `${star + 1}성 강화 · ${format(cost)} G${catchOn && !chance ? ' · 스타캐치' : ''}`}</button>}
            {star < max && researchRank(s, 'autoStar') > 0 && <AutoStar s={s} send={send} busy={busy} item={item} safeguard={guard}/>}
            <details className="forge-rules"><summary>강화 규칙</summary><p>1~{STARFORCE.gainHighFrom}성 기본 수치 +{STARFORCE.gainLow * 100}%/성, {STARFORCE.gainHighFrom + 1}~{STARFORCE.gainTopFrom}성 +{STARFORCE.gainHigh * 100}%/성, {STARFORCE.gainTopFrom + 1}성부터 +{STARFORCE.gainTop * 100}%/성. {STARFORCE.dropFrom}성부터 실패하면 1성 하락({STARFORCE.safeStars.join('·')}성은 유지), 15성부터 파괴 확률이 붙습니다. {STARFORCE.gainTopFrom}성부터는 성공 3 · 2 · 1%의 극한 구간입니다(스타캐치는 성공률 ×{STARFORCE.catchTopScale}). 파괴된 장비는 사라지고 유물 · 계승 · 칠흑은 {STARFORCE.relicResetStar}성({STARFORCE.relicResetHighFrom}성 이상이면 {STARFORCE.relicResetHigh}성)으로 돌아갑니다. 판매하면 강화 비용의 {ECONOMY.saleEnhanceRefund * 100}%를 돌려받습니다. 환생해도 남는 장비(유물 · 계승 · 칠흑)는 강화 비용이 환생 1회마다 +{Math.round(STARFORCE.permanentPerRebirth * 100)}%입니다{keepsAcrossLives(item) ? ` (지금 ×${permanentStarScale(item, s).toFixed(1)})` : ''}.{item.slot === 'charm' ? ' 치명타가 100%를 넘으면 그만큼 극 치명타 확률이 됩니다.' : ''}</p></details>
        </section>
        <GearLevelUp s={s} send={send} busy={busy} item={item}/>
        {/* v3.118 비용 초기화: 원시 고대 · 계승 태초 · 칠흑. 세계석으로 재련 · 재설정 횟수를 0으로, 대신 별 0 · 추가 옵션 새로 굴림. */}
        {canResetGear(item) && (item.rerolls || item.refines) ? <section className="forge-reset"><b>비용 초기화</b><small>재설정 {item.rerolls || 0}회 · 재련 {item.refines || 0}회 → 0 (다음 재설정 · 재련이 기본 비용으로)</small>
            <ConfirmButton label={`비용 초기화 · 세계석 ${GEAR_RESET_PEARLS}`} title={`${item.name}의 비용을 초기화할까요?`} description={`세계석 ${GEAR_RESET_PEARLS}를 쓰고 재설정 · 재련 횟수를 0으로 되돌립니다. 대신 별이 0성이 되고 추가 옵션을 모두 새로 굴립니다(수치는 최고${item.onyx ? ', 칠흑 고유 옵션은 그대로' : ''}). 되돌릴 수 없습니다.`} disabled={busy || s.pearls < GEAR_RESET_PEARLS} onConfirm={() => send({ type: 'gearReset', id: item.id })}/></section> : null}
        {item.relic && <RelicImprint s={s} send={send} busy={busy} item={item}/>}
        {(item.rarity === 5 || item.rarity === 6) && !item.relic && !item.onyx && <HeirPanel s={s} send={send} busy={busy} item={item}/>}
        {legacyReroll && <ConfirmButton label={`옵션 재설정 · ${format(reroll.gold)} G`} title="추가 옵션을 무작위로 바꿀까요?" description={`이전 방식의 단일 옵션입니다. 기존 추가 옵션이 사라지고 8종 중 하나가 같은 확률로 선택됩니다. 유물의 전용 옵션도 교체됩니다. 골드 ${format(reroll.gold)} G를 사용합니다.`} disabled={busy || item.rarity === 0 || s.gold < reroll.gold || (s.essence || 0) < reroll.essence} onConfirm={() => send({ type: 'reforge', id: item.id })}/>}
    </div>;
}

/** v3.76 장비 이름 · 등급 · 위력 머리줄(상점 강화 탭과 착용 장비 상세가 같이 씁니다). */
export function ForgeHead({ item, onClose }: { item: Item; onClose?: () => void }) {
    return <header className="forge-head">
        <span className={`gear-row-icon${item.onyx ? ' onyx-icon' : ''}`}>{item.onyx ? <OnyxArt id={item.onyx} size={30}/> : <SlotIcon slot={item.slot} size={20}/>}</span>
        <div><h2><span className={item.onyx ? 'onyx-name' : ''}>{item.name}</span> <span className="gold-text">{starLabel(item.enhance || 0)}</span></h2><small>{item.onyx ? '칠흑' : RARITIES[item.rarity].name} · {SLOTS[item.slot]} · 위력 {item.power} · {item.relic ? '유물 · ' : item.heir ? `${HEIR_LABEL[item.heir]} · ` : ''}Lv.{item.level}{item.affixes?.length ? ` · 옵션 ${item.affixes.length}` : ''}</small></div>
        {onClose && <button type="button" className="text-button" onClick={onClose}>닫기</button>}
    </header>;
}

/** v3.76 장비 작업대: 왼쪽 능력치 · 옵션(재설정 · 재련), 오른쪽 스타포스 · 레벨 · 계승. 좁은 화면에서는 위아래로 쌓입니다. */
export function ForgeBench({ s, send, busy, item, extra }: PanelProps & { item: Item; extra?: React.ReactNode }) {
    return <div className="forge-bench">
        <div className="forge-bench-info">
            <p className="forge-desc">{itemDescription(item)}</p>
            <BonusList item={item}/>
            <p className="footnote">직업 배율 적용 전 장비 기여 수치 · {starLabel(item.enhance || 0, true)} (기본 수치 ×{starMultiplier(item.enhance || 0).toFixed(2)}){item.origin && ORIGIN_THEMES[item.origin] ? ` · ${ORIGIN_THEMES[item.origin].name}에서 획득` : ''}</p>
            {!!item.affixes?.length && <GearOptions s={s} send={send} busy={busy} item={item}/>}
            {item.affix && <div className="affix-explanation">
                <b>추가 옵션 · {item.affix.name}</b>
                <span>{STAT_LABELS[item.affix.stat]} {statDeltaDisplay(item.affix.stat, item.affix.value)}</span>
                <p>{AFFIXES.find(a => a.stat === item.affix?.stat)?.description || '장착 시 해당 능력치에 더해집니다.'} 위 수치에 포함됩니다.</p>
            </div>}
            {extra}
        </div>
        <div className="forge-bench-work"><EquipmentForge s={s} send={send} busy={busy} item={item}/></div>
    </div>;
}
