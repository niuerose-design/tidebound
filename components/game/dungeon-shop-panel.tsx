'use client';
/** v3.204 던전 주화 상점: 상점 메뉴의 한 탭(상점 · 던전 주화 상점 · 장비 보관함). 상점과 같은 틀(재화 줄 · 탭 · 상품 카드)입니다. */
import { useState, type ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, Gem, Hexagon, Sparkles, Swords } from 'lucide-react';
import { dungeonGoldMultiplier } from '@/game/systems/stats';
import { dailyBonusLeft, boughtToday, growthOffer, onyxOffer, hunterBlock, allItems, qualityLines, lineQuality, QUALITY_PRICE } from '@/game/systems/dungeon-coins';
import { coreForgeCost } from '@/game/systems/boss-loot';
import { DUNGEON_SHOP, DUNGEON_SHOP_DAILY, DAILY_BONUS, GROWTH_GOODS, GROWTH_MAX_REBIRTHS, type GrowthGood } from '@/game/data/dungeon-shop';
import { ONYX, ONYX_DROP_ITEMS, onyxById } from '@/game/data/onyx';
import { BOSS_CORES, BOSS_CORE_RULES, CORE_ATTRS, CORE_FORGE, ownedCores, coreEntry, coreAwaken } from '@/game/data/boss-core';
import { ATTRIBUTES } from '@/game/data/progression';
import { Heading, format, useNow } from './shared';
import type { PanelProps } from './panel-props';

type Buy = (id: string, value?: string) => void;
const attrName = (k: string) => ATTRIBUTES.find(t => t.id === k)?.name || k;

/** 상품 카드: 상점 뽑기 카드와 같은 줄(머리 · 설명 · 고르는 칸 · 가격 줄 · 버튼 줄). */
function Good({ eyebrow, title, desc, controls, cost, children }: { eyebrow: string; title: string; desc: ReactNode; controls?: ReactNode; cost: ReactNode; children: ReactNode }) {
    return <article className="panel market-card draw-card dshop-card">
        <header className="draw-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div></header>
        <p className="draw-desc">{desc}</p>
        {controls && <div className="imprint-row draw-controls">{controls}</div>}
        <p className="muted draw-cost">{cost}</p>
        <div className="gamble-count-row draw-actions">{children}</div>
    </article>;
}

export function DungeonShop({ s, send, busy }: PanelProps) {
    const [tab, setTab] = useState('core'), now = useNow(60_000);
    const coins = s.dungeonCoins || 0, bonus = dungeonGoldMultiplier(s) - 1, left = dailyBonusLeft(s, now);
    const buy: Buy = (id, value) => send({ type: 'dungeonShop', id, ...(value ? { value } : {}) });
    return <>
        <Heading eyebrow="DUNGEON COIN SHOP" title="던전 주화 상점" description="던전을 정복해 모은 던전 주화로 보스 코어 · 칠흑 장신구 · 성장권 · 장비 상품을 삽니다. 주화는 환생해도 남습니다."/>
        <section className="panel port-resource-bar" aria-label="던전 주화와 재화">
            <div><Coins size={22}/><span>보유 던전 주화<strong>{format(coins)}{bonus > 0 && <small> 보너스 +{Math.round(bonus * 100)}%</small>}</strong></span></div>
            <div><Swords size={22}/><span>오늘 보너스 정복<strong>{left} <small>/ {DAILY_BONUS.clears}회</small></strong></span></div>
            <div><Gem size={22}/><span>보유 정수<strong>{format(s.essence || 0)}</strong></span></div>
            <div><Sparkles size={22}/><span>보유 세계석<strong>{format(s.pearls)}</strong></span></div>
        </section>
        <Tabs value={tab} onValueChange={setTab}><TabsList className="game-tabs port-tabs"><TabsTrigger value="core">보스 코어</TabsTrigger><TabsTrigger value="onyx">칠흑 장신구</TabsTrigger><TabsTrigger value="growth">성장권</TabsTrigger><TabsTrigger value="gear">장비</TabsTrigger></TabsList></Tabs>
        <div className="shop-body">
        {tab === 'core' && <CoreTab s={s} send={send} busy={busy} buy={buy} now={now}/>}
        {tab === 'onyx' && <div className="dshop-grid"><OnyxGood s={s} busy={busy} buy={buy} now={now}/></div>}
        {tab === 'growth' && <div className="dshop-grid">{(Object.keys(GROWTH_GOODS) as GrowthGood[]).map(g => { const o = growthOffer(s, g, now); return <Good key={g} eyebrow="성장권" title={`${o.hours}시간 성장권`}
            desc={`최근 24시간 중 가장 많이 번 1시간의 골드 · 경험치 × ${o.hours}시간을 바로 받습니다. 환생 ${GROWTH_MAX_REBIRTHS}회 미만, 하루 ${GROWTH_GOODS[g].perDay}번.`}
            cost={o.reason || `받는 양 골드 +${format(o.gold)} · 경험치 +${format(o.exp)} · 오늘 ${o.left}회 남음`}>
            <button className="secondary" disabled={busy || !!o.reason || coins < o.price} onClick={() => buy(g)}>구매 · {format(o.price)}</button>
        </Good>; })}</div>}
        {tab === 'gear' && <div className="dshop-grid">
            <Good eyebrow="장비 상자" title="전설 이상 확정 장비 상자" desc="내 레벨의 전설 이상 장비 하나. 고대 · 태초는 일반 드롭 하나와 비슷한 확률입니다." cost={`${format(DUNGEON_SHOP.gearBox)} 주화 · 결과는 가방으로`}>
                <button className="secondary" disabled={busy || coins < DUNGEON_SHOP.gearBox} onClick={() => buy('gearBox')}>구매 · {format(DUNGEON_SHOP.gearBox)}</button>
            </Good>
            <HunterGood s={s} busy={busy} buy={buy}/>
            <QualityGood s={s} busy={busy} buy={buy}/>
        </div>}
        </div>
    </>;
}

/** 칠흑 장신구: 보스를 골라 카드 한 장에서 제작 · 각성(v3.276 지금 보스가 주는 장신구만, 여러 종을 카드로 늘어놓으면 모바일에서 너무 깁니다). */
function OnyxGood({ s, busy, buy, now }: Pick<PanelProps, 's' | 'busy'> & { buy: Buy; now: number }) {
    const list = ONYX_DROP_ITEMS, [pick, setPick] = useState(''), b = list.find(x => x.id === pick) || list.find(x => !onyxOffer(s, x.id, now).reason) || list[0];
    const o = onyxOffer(s, b.id, now);
    return <Good eyebrow="칠흑 장신구" title={b.name}
        desc={`${b.desc} ${o.kind === 'awaken' ? `가진 장신구를 한 단계 각성합니다(지금 ${o.rank}/${ONYX.awakenMax}).` : '장신구를 바로 만듭니다.'} 제작 · 각성을 합쳐 하루 ${DUNGEON_SHOP_DAILY.onyxPerDay}번.`}
        controls={<label>칠흑 보스<select value={b.id} disabled={busy} onChange={e => setPick(e.target.value)}>{list.map(x => { const r = onyxOffer(s, x.id, now); return <option key={x.id} value={x.id}>{onyxById(x.boss!)?.name} · {x.name}{r.kind === 'awaken' ? ` (각성 ${r.rank}/${ONYX.awakenMax})` : s.onyxBook?.[x.boss!] ? '' : ' (잠김)'}</option>; })}</select></label>}
        cost={o.reason || `${format(o.price)} 주화`}>
        <button className="secondary" disabled={busy || !!o.reason || (s.dungeonCoins || 0) < o.price} onClick={() => buy(`onyx:${b.id}`)}>{o.kind === 'awaken' ? '각성' : '제작'} · {format(o.price)}</button>
    </Good>;
}

/**
 * v3.206 보스 코어 탭: 위에 코어 타일(고르기, v3.208 무릉 코어 3종 포함), 아래에 고른 코어 한 칸(효과 · 기본 능력치 줄 · 장착 · 재설정 · 재련), 맨 아래 상자 한 줄.
 * 전에는 코어 칸 · 상자 · 손보기 카드 · 코어 카드 7장이 따로 있어 같은 정보가 여러 번 보였습니다.
 */
function CoreTab({ s, send, busy, buy, now }: Pick<PanelProps, 's' | 'send' | 'busy'> & { buy: Buy; now: number }) {
    const ids = Object.keys(BOSS_CORES), owned = ownedCores(s), [pick, setPick] = useState(''), [line, setLine] = useState(0);
    const id = ids.includes(pick) ? pick : s.coreSlot && owned.includes(s.coreSlot) ? s.coreSlot : owned[0] || ids[0];
    const c = BOSS_CORES[id], e = coreEntry(s.bossCores?.[id]), worn = s.coreSlot === id, index = Math.min(line, CORE_ATTRS.count - 1);
    const essence = s.essence || 0, coins = s.dungeonCoins || 0, cost = coreForgeCost(s, id), boxLeft = Math.max(0, DUNGEON_SHOP_DAILY.coreBoxPerDay - boughtToday(s, 'coreBox', now));
    const m = e ? coreAwaken(e.rank) * (worn ? 1 : BOSS_CORE_RULES.resonance) : 0;
    const forge = (mode: 'reroll' | 'refine') => send({ type: 'coreForge', id, value: `${mode}|${index}` });
    const pips = (rank: number) => <span className="core-pips" aria-label={`각성 ${rank}/${BOSS_CORE_RULES.awakenMax}`}>{Array.from({ length: BOSS_CORE_RULES.awakenMax }, (_, i) => <i key={i} className={i < rank ? 'on' : ''}/>)}</span>;
    return <section aria-label="보스 코어" className="core-tab">
        <div className="core-tiles" role="tablist" aria-label="보스 코어 고르기">{ids.map(x => { const xe = coreEntry(s.bossCores?.[x]); return <button key={x} type="button" role="tab" aria-selected={x === id} className={`core-tile${x === id ? ' on' : ''}${xe ? '' : ' locked'}${s.coreSlot === x ? ' worn' : ''}`} onClick={() => { setPick(x); setLine(0); }}>
            <Hexagon size={22}/><small>{BOSS_CORES[x].floors ? `무릉 ${BOSS_CORES[x].floors![0]}층` : BOSS_CORES[x].boss}</small>{xe ? pips(xe.rank) : <em>미획득</em>}{s.coreSlot === x && <b className="core-tile-badge">장착</b>}
        </button>; })}</div>
        <article className={`panel core-detail${worn ? ' worn' : ''}${e ? '' : ' locked'}`}>
            <header><div><span className="eyebrow">{c.boss} · {e ? (worn ? '장착 중' : `보유 · 공명 ${Math.round(BOSS_CORE_RULES.resonance * 100)}%`) : '미획득'}</span><h2>{c.name}</h2></div>
                {e && <button type="button" className={worn ? 'secondary' : 'primary'} disabled={busy} onClick={() => send({ type: 'equipCore', id: worn ? '' : id })}>{worn ? '해제' : '장착'}</button>}</header>
            <p className="core-effect">{c.desc}</p>
            {e ? <>
                <div className="core-awaken"><span>각성</span>{pips(e.rank)}<small>{e.rank}/{BOSS_CORE_RULES.awakenMax} · 효과 · 능력치 +{Math.round(e.rank * BOSS_CORE_RULES.awakenStep * 100)}%</small></div>
                <div className="core-lines" role="radiogroup" aria-label="손볼 능력치 줄">{Array.from({ length: CORE_ATTRS.count }, (_, i) => { const a = e.attrs[i]; return <button key={i} type="button" role="radio" aria-checked={i === index} className={`core-line${i === index ? ' on' : ''}`} onClick={() => setLine(i)}>
                    <span>{a ? attrName(a.k) : '빈 줄'}</span><b>{a ? `+${format(Math.floor(Math.max(1, s.level) * a.f * m))}` : '—'}</b><small>{a ? `레벨 ×${a.f}` : '재설정으로 채움'}</small>
                </button>; })}</div>
                <div className="core-forge">
                    <button className="secondary" disabled={busy || essence < cost} onClick={() => forge('reroll')}>재설정 · 정수 {format(cost)}</button>
                    <button className="secondary" disabled={busy || !e.attrs[index] || essence < cost} onClick={() => forge('refine')}>재련 · 정수 {format(cost)}</button>
                    <button className="secondary" disabled={busy || coins < DUNGEON_SHOP.coreReroll} onClick={() => send({ type: 'dungeonShop', id: 'coreReroll', value: `${id}|${index}` })}>재설정 · 주화 {format(DUNGEON_SHOP.coreReroll)}</button>
                    {e.forges ? <button className="secondary" disabled={busy || s.pearls < CORE_FORGE.resetPearls} onClick={() => send({ type: 'coreForgeReset', id })}>비용 초기화 · 세계석 {CORE_FORGE.resetPearls}</button> : null}
                </div>
                <small className="muted">고른 줄을 재설정(종류 · 배율 레벨 ×{CORE_ATTRS.min}~{CORE_ATTRS.max}) 또는 재련(배율만)합니다. 낮아질 수도 있습니다. 정수는 기본 {CORE_FORGE.base}, 손볼 때마다 ×{CORE_FORGE.growth}{e.forges ? `(지금 ${e.forges}회)` : ''} · 주화 재설정은 비용을 올리지 않습니다.</small>
            </> : <p className="muted">{c.floors ? `무릉도장 ${c.floors[0]}층을 처음 돌파하면 얻습니다(지금 최고 ${s.abyssBest}층). 랜덤 상자에서는 나오지 않습니다.` : '지역 던전 하루 보너스 정복에서 드물게 나오거나, 아래 랜덤 보스 코어 상자로 얻습니다.'} 얻으면 기본 능력치 2종이 무작위로 붙습니다.</p>}
            {c.floors && <p className="muted core-floors">무릉도장 층: 획득 {c.floors[0]}층 · 각성 {c.floors.slice(1).join(' · ')}층(최고 기록 기준){e && e.rank < BOSS_CORE_RULES.awakenMax ? ` · 다음 각성 ${c.floors[e.rank + 1]}층` : ''}</p>}
        </article>
        <div className="panel core-box">
            <div><span className="eyebrow">랜덤 보스 코어 상자</span><p>지역 던전 코어 7종 중 하나(무릉도장 코어는 층으로만). 없던 코어면 얻고, 있던 코어면 각성합니다(각성을 마쳤으면 세계석 +{BOSS_CORE_RULES.duplicatePearls}). 하루 {DUNGEON_SHOP_DAILY.coreBoxPerDay}번 · 오늘 {boxLeft}회 남음</p></div>
            <button className="secondary" disabled={busy || !boxLeft || coins < DUNGEON_SHOP.coreBox} onClick={() => buy('coreBox')}>구매 · {format(DUNGEON_SHOP.coreBox)} 주화</button>
        </div>
    </section>;
}

function HunterGood({ s, busy, buy }: Pick<PanelProps, 's' | 'busy'> & { buy: Buy }) {
    const eligible = allItems(s).filter(x => !hunterBlock(x)), [pick, setPick] = useState(''), [line, setLine] = useState(-1);
    const item = eligible.find(x => x.id === pick) || eligible[0], lines = (item?.affixes || []).map((x, i) => ({ x, i })).filter(({ x }) => !x.rule);
    const index = lines.some(l => l.i === line) ? line : lines[0]?.i ?? -1;
    return <Good eyebrow="각인" title="포식자 각인" desc="고대 이상 장비의 옵션 한 줄을 포식자(보스 · 사냥감 피해)로 바꿉니다. 장비당 한 줄."
        controls={item ? <>
            <label>장비<select value={item.id} disabled={busy} onChange={e => { setPick(e.target.value); setLine(-1); }}>{eligible.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label>바꿀 옵션<select value={index} disabled={busy} onChange={e => setLine(Number(e.target.value))}>{lines.map(({ x, i }) => <option key={i} value={i}>{i + 1}. {x.name}</option>)}</select></label>
        </> : undefined}
        cost={item ? `${format(DUNGEON_SHOP.hunterImprint)} 주화` : '고대 이상이고 포식자 옵션이 없는 장비가 있어야 합니다.'}>
        <button className="secondary" disabled={busy || !item || index < 0 || (s.dungeonCoins || 0) < DUNGEON_SHOP.hunterImprint} onClick={() => item && buy('hunter', `${item.id}|${index}`)}>각인 · {format(DUNGEON_SHOP.hunterImprint)}</button>
    </Good>;
}

function QualityGood({ s, busy, buy }: Pick<PanelProps, 's' | 'busy'> & { buy: Buy }) {
    const coins = s.dungeonCoins || 0, items = allItems(s).filter(x => qualityLines(x, 'quality100').length || qualityLines(x, 'quality120').length);
    const [pick, setPick] = useState(''), [line, setLine] = useState(-1), item = items.find(x => x.id === pick) || items[0];
    const rows = item ? (item.affixes || []).map((x, i) => ({ x, i, q: lineQuality(item, i) })).filter(r => r.q !== null && r.q < 1.2 - 1e-6) : [];
    const index = rows.some(r => r.i === line) ? line : rows[0]?.i ?? -1, q = item ? lineQuality(item, index) ?? 0 : 0;
    const ok100 = !!item && qualityLines(item, 'quality100').includes(index), ok120 = !!item && qualityLines(item, 'quality120').includes(index);
    return <Good eyebrow="옵션 수치" title="옵션 수치 올리기" desc="고른 옵션 한 줄의 수치를 100%(보통 최고)로, 또는 120~150%(계승 최고까지)로 올립니다. 규칙 · 고정 · 장식 옵션은 제외."
        controls={item ? <>
            <label>장비<select value={item.id} disabled={busy} onChange={e => { setPick(e.target.value); setLine(-1); }}>{items.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <label>옵션<select value={index} disabled={busy} onChange={e => setLine(Number(e.target.value))}>{rows.map(r => <option key={r.i} value={r.i}>{r.i + 1}. {r.x.name} · {Math.round(r.q! * 100)}%</option>)}</select></label>
        </> : undefined}
        cost={item ? `지금 ${Math.round(q * 100)}% · 재련하면 다시 보통 범위로 굴립니다` : '수치를 올릴 수 있는 옵션이 있는 장비가 없습니다.'}>
        <button className="secondary" disabled={busy || !ok100 || coins < QUALITY_PRICE.quality100} onClick={() => item && buy('quality100', `${item.id}|${index}`)}>100%로 · {format(QUALITY_PRICE.quality100)}</button>
        <button className="secondary" disabled={busy || !ok120 || coins < QUALITY_PRICE.quality120} onClick={() => item && buy('quality120', `${item.id}|${index}`)}>120~150%로 · {format(QUALITY_PRICE.quality120)}</button>
    </Good>;
}
