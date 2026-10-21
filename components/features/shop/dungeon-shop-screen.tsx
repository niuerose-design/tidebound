'use client';
/** v3.393 던전 주화 상점(새 토대): 보스 코어 · 칠흑 장신구 · 성장권 · 장비. 서버 행동(dungeonShop · equipCore · coreForge · coreForgeReset)은 전과 같습니다. */
import { useState } from 'react';
import { Coins, Gem, Hexagon, Sparkles, Swords } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SectionHeader, ConfirmAction, NumberTicker, formatExact } from '@/components/ui/game';
import { dungeonGoldMultiplier } from '@/game/systems/stats';
import { dailyBonusLeft, boughtToday, growthOffer, onyxOffer, hunterBlock, allItems, qualityLines, lineQuality, QUALITY_PRICE } from '@/game/systems/dungeon-coins';
import { coreForgeCost } from '@/game/systems/boss-loot';
import { DUNGEON_SHOP, DUNGEON_SHOP_DAILY, DAILY_BONUS, GROWTH_GOODS, GROWTH_MAX_REBIRTHS, type GrowthGood } from '@/game/data/dungeon-shop';
import { ONYX, ONYX_DROP_ITEMS, ONYX_CORE_ID, onyxById } from '@/game/data/onyx';
import { BOSS_CORES, BOSS_CORE_RULES, CORE_ATTRS, CORE_FORGE, ownedCores, coreEntry, coreAwaken } from '@/game/data/boss-core';
import { attrName } from '@/game/data/progression';
import { OnyxArt } from '@/components/game/onyx-art';
import { useNow } from '@/components/game/shared';
import { cn } from '@/lib/utils';
import { GoodCard, Tile, Field, field } from './parts';

type Send = (a: Action) => void;
type Buy = (id: string, value?: string) => void;
type P = { s: State; busy: boolean; buy: Buy };
const fmt = formatExact;
const TABS = [['core', '보스 코어'], ['onyx', '칠흑 장신구'], ['growth', '성장권'], ['gear', '장비']] as const;
const BuyButton = ({ children, ...rest }: React.ComponentProps<typeof Button>) => <Button type="button" variant="outline" size="sm" {...rest}>{children}</Button>;

export function DungeonShopScreen({ s, send, busy }: { s: State; send: Send; busy: boolean }) {
    const [tab, setTab] = useState<typeof TABS[number][0]>('core'), now = useNow(60_000);
    const coins = s.dungeonCoins || 0, bonus = dungeonGoldMultiplier(s) - 1, left = dailyBonusLeft(s, now);
    const buy: Buy = (id, value) => send({ type: 'dungeonShop', id, ...(value ? { value } : {}) });
    return <div className="grid gap-5 text-ink-1">
        <SectionHeader as="h1" eyebrow="DUNGEON COIN SHOP" title="던전 주화 상점" description="던전을 정복해 모은 던전 주화로 보스 코어 · 칠흑 장신구 · 성장권 · 장비 상품을 삽니다. 주화는 환생해도 남습니다."/>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile icon={<Coins size={18}/>} label={`보유 던전 주화${bonus > 0 ? ` · 보너스 +${Math.round(bonus * 100)}%` : ''}`}><NumberTicker value={coins}/></Tile>
            <Tile icon={<Swords size={18}/>} label="오늘 보너스 정복">{left}<span className="text-xs text-ink-3">/ {DAILY_BONUS.clears}회</span></Tile>
            <Tile icon={<Gem size={18}/>} label="보유 정수"><NumberTicker value={s.essence || 0}/></Tile>
            <Tile icon={<Sparkles size={18}/>} label="보유 세계석"><NumberTicker value={s.pearls}/></Tile>
        </div>
        <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}><TabsList className="h-auto flex-wrap">{TABS.map(([id, name]) => <TabsTrigger key={id} value={id} className="min-h-9 pointer-coarse:min-h-11">{name}</TabsTrigger>)}</TabsList></Tabs>
        {tab === 'core' && <CoreTab s={s} send={send} busy={busy} buy={buy} now={now}/>}
        {tab === 'onyx' && <div className="grid gap-3 lg:grid-cols-2"><OnyxGood s={s} busy={busy} buy={buy} now={now}/></div>}
        {tab === 'growth' && <div className="grid gap-3 lg:grid-cols-2">{(Object.keys(GROWTH_GOODS) as GrowthGood[]).map(g => { const o = growthOffer(s, g, now); return <GoodCard key={g} eyebrow="성장권" title={`${o.hours}시간 성장권`}
            desc={`최근 24시간 중 가장 많이 번 1시간의 골드 · 경험치 × ${o.hours}시간을 바로 받습니다. 환생 ${GROWTH_MAX_REBIRTHS}회 미만, 하루 ${GROWTH_GOODS[g].perDay}번.`}
            cost={o.reason || `받는 양 골드 +${fmt(o.gold)} · 경험치 +${fmt(o.exp)} · 오늘 ${o.left}회 남음`}>
            <BuyButton disabled={busy || !!o.reason || coins < o.price} onClick={() => buy(g)}>구매 · {fmt(o.price)}</BuyButton>
        </GoodCard>; })}</div>}
        {tab === 'gear' && <div className="grid gap-3 lg:grid-cols-2">
            <GoodCard eyebrow="장비 상자" title="전설 이상 확정 장비 상자" desc="내 레벨의 전설 이상 장비 하나. 고대 · 태초는 일반 드롭 하나와 비슷한 확률입니다." cost={`${fmt(DUNGEON_SHOP.gearBox)} 주화 · 결과는 가방으로`}>
                <BuyButton disabled={busy || coins < DUNGEON_SHOP.gearBox} onClick={() => buy('gearBox')}>구매 · {fmt(DUNGEON_SHOP.gearBox)}</BuyButton>
            </GoodCard>
            <HunterGood s={s} busy={busy} buy={buy}/>
            <QualityGood s={s} busy={busy} buy={buy}/>
        </div>}
    </div>;
}

/** 칠흑 장신구: 보스를 골라 카드 한 장에서 제작 · 각성(v3.276 지금 보스가 주는 장신구만). v3.279 칠흑 보스코어(저주받은 마도서)도 같은 카드에서 같은 가격으로 고릅니다. */
function OnyxGood({ s, busy, buy, now }: P & { now: number }) {
    const list = [...ONYX_DROP_ITEMS, { id: ONYX_CORE_ID, name: BOSS_CORES[ONYX_CORE_ID].name, desc: `칠흑 보스코어(보스 코어 칸). ${BOSS_CORES[ONYX_CORE_ID].desc}`, boss: BOSS_CORES[ONYX_CORE_ID].onyx }], [pick, setPick] = useState(''), b = list.find(x => x.id === pick) || list.find(x => !onyxOffer(s, x.id, now).reason) || list[0];
    const o = onyxOffer(s, b.id, now), word = b.id === ONYX_CORE_ID ? '마도서' : '장신구';
    return <GoodCard onyx eyebrow={b.id === ONYX_CORE_ID ? '칠흑 보스코어' : '칠흑 장신구'} title={<span style={{ color: 'var(--rarity-primal)' }}>{b.name}</span>} head={<OnyxArt id={b.id} size={40}/>}
        desc={`${b.desc} ${o.kind === 'awaken' ? `가진 ${word}를 한 단계 각성합니다(지금 ${o.rank}/${ONYX.awakenMax}).` : `${word}를 바로 만듭니다.`} 제작 · 각성을 합쳐 하루 ${DUNGEON_SHOP_DAILY.onyxPerDay}번.`}
        controls={<Field label="칠흑 보스"><select className={field} value={b.id} disabled={busy} onChange={e => setPick(e.target.value)}>{list.map(x => { const r = onyxOffer(s, x.id, now); return <option key={x.id} value={x.id}>{onyxById(x.boss!)?.name} · {x.name}{r.kind === 'awaken' ? ` (각성 ${r.rank}/${ONYX.awakenMax})` : s.onyxBook?.[x.boss!] ? '' : ' (잠김)'}</option>; })}</select></Field>}
        cost={o.reason || `${fmt(o.price)} 주화`}>
        <ConfirmAction label={`${o.kind === 'awaken' ? '각성' : '제작'} · ${fmt(o.price)}`} title={`${b.name}을(를) ${o.kind === 'awaken' ? '각성' : '제작'}할까요?`} description={`던전 주화 ${fmt(o.price)}개를 씁니다. 칠흑 상품은 하루 ${DUNGEON_SHOP_DAILY.onyxPerDay}번입니다.`} disabled={busy || !!o.reason || (s.dungeonCoins || 0) < o.price} onConfirm={() => buy(`onyx:${b.id}`)}/>
    </GoodCard>;
}

/** v3.206 보스 코어 탭: 위에 코어 타일(고르기), 아래에 고른 코어 한 칸(효과 · 기본 능력치 줄 · 장착 · 재설정 · 재련), 맨 아래 상자 한 줄. */
function CoreTab({ s, send, busy, buy, now }: P & { send: Send; now: number }) {
    const ids = Object.keys(BOSS_CORES), owned = ownedCores(s), [pick, setPick] = useState(''), [line, setLine] = useState(0);
    const id = ids.includes(pick) ? pick : s.coreSlot && owned.includes(s.coreSlot) ? s.coreSlot : owned[0] || ids[0];
    const c = BOSS_CORES[id], e = coreEntry(s.bossCores?.[id]), worn = s.coreSlot === id, index = Math.min(line, CORE_ATTRS.count - 1);
    const essence = s.essence || 0, coins = s.dungeonCoins || 0, cost = coreForgeCost(s, id), boxLeft = Math.max(0, DUNGEON_SHOP_DAILY.coreBoxPerDay - boughtToday(s, 'coreBox', now));
    const m = e ? coreAwaken(e.rank) * (worn ? 1 : BOSS_CORE_RULES.resonance) : 0;
    const forge = (mode: 'reroll' | 'refine') => send({ type: 'coreForge', id, value: `${mode}|${index}` });
    const pips = (rank: number) => <span className="inline-flex gap-0.5" aria-label={`각성 ${rank}/${BOSS_CORE_RULES.awakenMax}`}>{Array.from({ length: BOSS_CORE_RULES.awakenMax }, (_, i) => <i key={i} className={cn('size-1.5 rounded-full', i < rank ? 'bg-accent' : 'bg-line-strong')}/>)}</span>;
    const onyxOff = c.onyx ? onyxOffer(s, ONYX_CORE_ID, now) : null;
    return <section aria-label="보스 코어" className="grid gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6" role="tablist" aria-label="보스 코어 고르기">{ids.map(x => { const xe = coreEntry(s.bossCores?.[x]), on = x === id, bc = BOSS_CORES[x]; return <button key={x} type="button" role="tab" aria-selected={on} onClick={() => { setPick(x); setLine(0); }}
            className={cn('grid min-h-11 content-start gap-1 rounded-m border p-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-accent/50', on ? 'border-accent/70 bg-accent-soft' : 'border-line bg-surface-2 hover:bg-surface-3/60', !xe && 'opacity-70', bc.onyx && 'border-l-[3px] border-l-[color:var(--rarity-primal)]')}>
            <span className="flex items-center gap-2">{bc.onyx ? <OnyxArt id={x} size={22}/> : <Hexagon size={18} className="text-accent"/>}<small className="truncate text-xs text-ink-3">{bc.floors ? `무릉 ${bc.floors[0]}층` : bc.onyx ? `칠흑 · ${bc.boss}` : bc.boss}</small></span>
            <span className="flex items-center justify-between gap-1"><b className="truncate text-xs">{bc.name}</b>{xe ? pips(xe.rank) : <em className="text-xs not-italic text-ink-3">미획득</em>}</span>
            {s.coreSlot === x && <b className="justify-self-start rounded-s bg-accent px-1.5 text-xs text-accent-ink">장착</b>}
        </button>; })}</div>
        <article className={cn('grid gap-3 rounded-l border bg-surface-2 p-4 shadow-1', c.onyx ? 'border-[color:var(--rarity-primal)]/60' : 'border-line', !e && 'opacity-90')}>
            <header className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><span className="eyebrow">{c.onyx ? `칠흑 보스코어 · ${c.boss} 격파` : c.boss} · {e ? (worn ? '장착 중' : `보유 · 공명 ${Math.round(BOSS_CORE_RULES.resonance * 100)}%`) : '미획득'}</span><h2 className="font-display text-m font-bold" style={c.onyx ? { color: 'var(--rarity-primal)' } : undefined}>{c.name}</h2></div>
                {e && <Button type="button" size="sm" variant={worn ? 'outline' : 'default'} className={cn(!worn && 'bg-accent text-accent-ink hover:bg-accent/90')} disabled={busy} onClick={() => send({ type: 'equipCore', id: worn ? '' : id })}>{worn ? '해제' : '장착'}</Button>}</header>
            <p className="text-s leading-relaxed text-ink-2">{c.desc}</p>
            {e ? <>
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3"><span>각성</span>{pips(e.rank)}<small>{e.rank}/{BOSS_CORE_RULES.awakenMax} · 효과 · 능력치 +{Math.round(e.rank * BOSS_CORE_RULES.awakenStep * 100)}%</small></div>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="손볼 능력치 줄">{Array.from({ length: CORE_ATTRS.count }, (_, i) => { const a = e.attrs[i], on = i === index; return <button key={i} type="button" role="radio" aria-checked={on} onClick={() => setLine(i)} className={cn('flex min-h-11 items-center justify-between gap-2 rounded-m border px-3 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-accent/50', on ? 'border-accent/70 bg-accent-soft' : 'border-line bg-surface-1')}>
                    <span className="text-s">{a ? attrName(a.k) : '빈 줄'}</span><span className="grid text-right"><b className="font-num text-s">{a ? `+${fmt(Math.floor(Math.max(1, s.level) * a.f * m))}` : '—'}</b><small className="text-xs text-ink-3">{a ? `레벨 ×${a.f}` : '재설정으로 채움'}</small></span>
                </button>; })}</div>
                <div className="flex flex-wrap gap-2">
                    <BuyButton disabled={busy || essence < cost} onClick={() => forge('reroll')}>재설정 · 정수 {fmt(cost)}</BuyButton>
                    <BuyButton disabled={busy || !e.attrs[index] || essence < cost} onClick={() => forge('refine')}>재련 · 정수 {fmt(cost)}</BuyButton>
                    <BuyButton disabled={busy || coins < DUNGEON_SHOP.coreReroll} onClick={() => send({ type: 'dungeonShop', id: 'coreReroll', value: `${id}|${index}` })}>재설정 · 주화 {fmt(DUNGEON_SHOP.coreReroll)}</BuyButton>
                    {e.forges ? <ConfirmAction label={`비용 초기화 · 세계석 ${CORE_FORGE.resetPearls}`} title="코어 손보기 비용을 초기화할까요?" description={`세계석 ${CORE_FORGE.resetPearls}개를 쓰고 손보기 횟수(지금 ${e.forges}회)를 0으로 되돌립니다.`} disabled={busy || s.pearls < CORE_FORGE.resetPearls} onConfirm={() => send({ type: 'coreForgeReset', id })}/> : null}
                </div>
                <p className="text-xs leading-relaxed text-ink-3">고른 줄을 재설정(종류 · 배율 레벨 ×{CORE_ATTRS.min}~{CORE_ATTRS.max}) 또는 재련(배율만)합니다. 낮아질 수도 있습니다. 정수는 기본 {CORE_FORGE.base}, 손볼 때마다 ×{CORE_FORGE.growth}{e.forges ? `(지금 ${e.forges}회)` : ''} · 주화 재설정은 비용을 올리지 않습니다.</p>
            </> : <p className="text-xs leading-relaxed text-ink-3">{c.floors ? `무릉도장 ${c.floors[0]}층을 처음 돌파하면 얻습니다(지금 최고 ${s.abyssBest}층). 랜덤 상자에서는 나오지 않습니다.` : c.onyx ? `칠흑 보스 ${c.boss}을(를) 쓰러뜨리면 칠흑 장신구와 같은 확률 · 천장(${ONYX.dropPity}번째 연속 미획득 격파는 확정)으로 얻고, 다시 얻으면 각성합니다. 아래에서 칠흑 장신구와 같은 주화로 제작할 수도 있습니다. 지역 던전 보너스 정복 · 랜덤 상자에서는 나오지 않습니다.` : '지역 던전 하루 보너스 정복에서 드물게 나오거나, 아래 랜덤 보스 코어 상자로 얻습니다.'} 얻으면 기본 능력치 2종이 무작위로 붙습니다.</p>}
            {c.floors && <p className="text-xs text-ink-3">무릉도장 층: 획득 {c.floors[0]}층 · 각성 {c.floors.slice(1).join(' · ')}층(최고 기록 기준){e && e.rank < BOSS_CORE_RULES.awakenMax ? ` · 다음 각성 ${c.floors[e.rank + 1]}층` : ''}</p>}
        </article>
        {onyxOff ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-l border border-[color:var(--rarity-primal)]/60 bg-surface-2 p-4 shadow-1">
            <div className="min-w-0 flex-1"><span className="eyebrow">칠흑 보스코어 · {onyxOff.kind === 'awaken' ? '각성' : '제작'}</span><p className="text-s text-ink-2">칠흑 장신구와 같은 가격 · 같은 하루 횟수(칠흑 상품 합쳐 하루 {DUNGEON_SHOP_DAILY.onyxPerDay}번)입니다. {onyxOff.kind === 'awaken' ? `가진 마도서를 한 단계 각성합니다(지금 ${onyxOff.rank}/${ONYX.awakenMax}).` : '마도서를 바로 만듭니다.'}{onyxOff.reason ? ` · ${onyxOff.reason}` : ''}</p></div>
            <BuyButton disabled={busy || !!onyxOff.reason || coins < onyxOff.price} onClick={() => buy(`onyx:${ONYX_CORE_ID}`)}>{onyxOff.kind === 'awaken' ? '각성' : '제작'} · {fmt(onyxOff.price)} 주화</BuyButton>
        </div> : <div className="flex flex-wrap items-center justify-between gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1">
            <div className="min-w-0 flex-1"><span className="eyebrow">랜덤 보스 코어 상자</span><p className="text-s text-ink-2">지역 던전 코어 7종 중 하나(무릉도장 코어는 층으로만). 없던 코어면 얻고, 있던 코어면 각성합니다(각성을 마쳤으면 세계석 +{BOSS_CORE_RULES.duplicatePearls}). 하루 {DUNGEON_SHOP_DAILY.coreBoxPerDay}번 · 오늘 {boxLeft}회 남음</p></div>
            <BuyButton disabled={busy || !boxLeft || coins < DUNGEON_SHOP.coreBox} onClick={() => buy('coreBox')}>구매 · {fmt(DUNGEON_SHOP.coreBox)} 주화</BuyButton>
        </div>}
    </section>;
}

function HunterGood({ s, busy, buy }: P) {
    const eligible = allItems(s).filter(x => !hunterBlock(x)), [pick, setPick] = useState(''), [line, setLine] = useState(-1);
    const item = eligible.find(x => x.id === pick) || eligible[0], lines = (item?.affixes || []).map((x, i) => ({ x, i })).filter(({ x }) => !x.rule);
    const index = lines.some(l => l.i === line) ? line : lines[0]?.i ?? -1;
    return <GoodCard eyebrow="각인" title="포식자 각인" desc="고대 이상 장비의 옵션 한 줄을 포식자(보스 · 사냥감 피해)로 바꿉니다. 장비당 한 줄."
        controls={item ? <>
            <Field label="장비"><select className={field} value={item.id} disabled={busy} onChange={e => { setPick(e.target.value); setLine(-1); }}>{eligible.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
            <Field label="바꿀 옵션"><select className={field} value={index} disabled={busy} onChange={e => setLine(Number(e.target.value))}>{lines.map(({ x, i }) => <option key={i} value={i}>{i + 1}. {x.name}</option>)}</select></Field>
        </> : undefined}
        cost={item ? `${fmt(DUNGEON_SHOP.hunterImprint)} 주화` : '고대 이상이고 포식자 옵션이 없는 장비가 있어야 합니다.'}>
        <ConfirmAction label={`각인 · ${fmt(DUNGEON_SHOP.hunterImprint)}`} title="포식자 각인을 할까요?" description={item ? `${item.name}의 ${index + 1}번째 옵션을 포식자로 바꿉니다. 던전 주화 ${fmt(DUNGEON_SHOP.hunterImprint)}개를 쓰고 되돌릴 수 없습니다.` : ''} disabled={busy || !item || index < 0 || (s.dungeonCoins || 0) < DUNGEON_SHOP.hunterImprint} onConfirm={() => item && buy('hunter', `${item.id}|${index}`)}/>
    </GoodCard>;
}

function QualityGood({ s, busy, buy }: P) {
    const coins = s.dungeonCoins || 0, items = allItems(s).filter(x => qualityLines(x, 'quality100').length || qualityLines(x, 'quality120').length);
    const [pick, setPick] = useState(''), [line, setLine] = useState(-1), item = items.find(x => x.id === pick) || items[0];
    const rows = item ? (item.affixes || []).map((x, i) => ({ x, i, q: lineQuality(item, i) })).filter(r => r.q !== null && r.q < 1.2 - 1e-6) : [];
    const index = rows.some(r => r.i === line) ? line : rows[0]?.i ?? -1, q = item ? lineQuality(item, index) ?? 0 : 0;
    const ok100 = !!item && qualityLines(item, 'quality100').includes(index), ok120 = !!item && qualityLines(item, 'quality120').includes(index);
    return <GoodCard eyebrow="옵션 수치" title="옵션 수치 올리기" desc="고른 옵션 한 줄의 수치를 100%(보통 최고)로, 또는 120~150%(계승 최고까지)로 올립니다. 규칙 · 고정 · 장식 옵션은 제외."
        controls={item ? <>
            <Field label="장비"><select className={field} value={item.id} disabled={busy} onChange={e => { setPick(e.target.value); setLine(-1); }}>{items.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
            <Field label="옵션"><select className={field} value={index} disabled={busy} onChange={e => setLine(Number(e.target.value))}>{rows.map(r => <option key={r.i} value={r.i}>{r.i + 1}. {r.x.name} · {Math.round(r.q! * 100)}%</option>)}</select></Field>
        </> : undefined}
        cost={item ? `지금 ${Math.round(q * 100)}% · 재련하면 다시 보통 범위로 굴립니다` : '수치를 올릴 수 있는 옵션이 있는 장비가 없습니다.'}>
        <BuyButton disabled={busy || !ok100 || coins < QUALITY_PRICE.quality100} onClick={() => item && buy('quality100', `${item.id}|${index}`)}>100%로 · {fmt(QUALITY_PRICE.quality100)}</BuyButton>
        <BuyButton disabled={busy || !ok120 || coins < QUALITY_PRICE.quality120} onClick={() => item && buy('quality120', `${item.id}|${index}`)}>120~150%로 · {fmt(QUALITY_PRICE.quality120)}</BuyButton>
    </GoodCard>;
}
