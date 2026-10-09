'use client';
/** v3.204 던전 주화 상점: 상점 메뉴의 한 탭(상점 · 던전 주화 상점 · 장비 보관함). 상점과 같은 틀(재화 줄 · 탭 · 상품 카드)입니다. */
import { useState, type ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, Gem, Sparkles, Swords } from 'lucide-react';
import { dungeonGoldMultiplier } from '@/game/systems/stats';
import { dailyBonusLeft, boughtToday, growthOffer, onyxOffer, hunterBlock, allItems, qualityLines, lineQuality, QUALITY_PRICE } from '@/game/systems/dungeon-coins';
import { coreForgeCost } from '@/game/systems/boss-loot';
import { DUNGEON_SHOP, DUNGEON_SHOP_DAILY, DAILY_BONUS, GROWTH_GOODS, GROWTH_MAX_REBIRTHS, type GrowthGood } from '@/game/data/dungeon-shop';
import { ONYX, ONYX_BOSSES } from '@/game/data/onyx';
import { BOSS_CORES, BOSS_CORE_RULES, CORE_ATTRS, CORE_FORGE, ownedCores, coreEntry } from '@/game/data/boss-core';
import { ATTRIBUTES } from '@/game/data/progression';
import { Heading, format, useNow } from './shared';
import { CoreSlot, coreAttrText } from './core-slot';
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
        {tab === 'core' && <section aria-label="보스 코어">
            <CoreSlot s={s} send={send} busy={busy}/>
            <div className="dshop-grid">
                <CoreBoxGood s={s} busy={busy} buy={buy} now={now}/>
                <CoreForgeGood s={s} send={send} busy={busy}/>
            </div>
            <div className="gear-slots dshop-cores">{Object.entries(BOSS_CORES).map(([id, c]) => {
                const e = coreEntry(s.bossCores?.[id]), worn = s.coreSlot === id;
                return <article key={id} className={`panel gear-slot${e ? '' : ' locked'}`} style={{ '--rarity': worn ? '#d6b879' : e ? '#8fb7a9' : '#5a6f71' } as React.CSSProperties}>
                    <div className="gear-slot-head"><span>{c.boss}</span>{e && <button type="button" className="text-button" disabled={busy} onClick={() => send({ type: 'equipCore', id: worn ? '' : id })}>{worn ? '해제' : '장착'}</button>}</div>
                    <div className="core-slot-body"><strong>{c.name}</strong><small>{e ? `${worn ? '장착 중 · ' : ''}각성 ${e.rank}/${BOSS_CORE_RULES.awakenMax}` : '미획득'}</small><small>{c.desc}</small>{e && <small>{coreAttrText(s, id)}</small>}</div>
                </article>;
            })}</div>
        </section>}
        {tab === 'onyx' && <div className="dshop-grid">{ONYX_BOSSES.map(b => { const o = onyxOffer(s, b.id, now); return <Good key={b.id} eyebrow={`칠흑 · ${b.name}`} title={b.accessory.name}
            desc={`${o.kind === 'awaken' ? `가진 칠흑 장신구를 한 단계 각성합니다(지금 ${o.rank}/${ONYX.awakenMax}).` : '칠흑 장신구를 바로 만듭니다. 그 칠흑 보스를 한 번 이상 처치해야 열립니다.'} 제작 · 각성을 합쳐 하루 ${DUNGEON_SHOP_DAILY.onyxPerDay}번.`}
            cost={o.reason || `${format(o.price)} 주화`}>
            <button className="secondary" disabled={busy || !!o.reason || coins < o.price} onClick={() => buy(`onyx:${b.id}`)}>{o.kind === 'awaken' ? '각성' : '제작'} · {format(o.price)}</button>
        </Good>; })}</div>}
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

function CoreBoxGood({ s, busy, buy, now }: Pick<PanelProps, 's' | 'busy'> & { buy: Buy; now: number }) {
    const left = Math.max(0, DUNGEON_SHOP_DAILY.coreBoxPerDay - boughtToday(s, 'coreBox', now));
    return <Good eyebrow="보스 코어" title="랜덤 보스 코어 상자" desc={`7종 중 하나. 없던 코어면 얻고, 있던 코어면 각성합니다(각성을 마쳤으면 세계석 +${BOSS_CORE_RULES.duplicatePearls}).`} cost={`${format(DUNGEON_SHOP.coreBox)} 주화 · 하루 ${DUNGEON_SHOP_DAILY.coreBoxPerDay}번 · 오늘 ${left}회 남음`}>
        <button className="secondary" disabled={busy || !left || (s.dungeonCoins || 0) < DUNGEON_SHOP.coreBox} onClick={() => buy('coreBox')}>구매 · {format(DUNGEON_SHOP.coreBox)}</button>
    </Good>;
}

/** 보스 코어 능력치 손보기: 정수로 재설정(종류 · 배율) · 재련(배율만), 주화 재설정, 세계석 비용 초기화. */
function CoreForgeGood({ s, send, busy }: Pick<PanelProps, 's' | 'send' | 'busy'>) {
    const owned = ownedCores(s), [pick, setPick] = useState(''), [line, setLine] = useState(0);
    const id = owned.includes(pick) ? pick : s.coreSlot && owned.includes(s.coreSlot) ? s.coreSlot : owned[0];
    const desc = `재설정은 능력치 종류와 배율(레벨 ×${CORE_ATTRS.min}~${CORE_ATTRS.max})을 새로 굴리고, 재련은 종류는 그대로 배율만 다시 굴립니다. 낮아질 수도 있습니다.`;
    if (!id) return <Good eyebrow="보스 코어" title="능력치 재설정 · 재련" desc={desc} cost="보스 코어를 얻으면 열립니다."><button className="secondary" disabled>재설정</button></Good>;
    const e = coreEntry(s.bossCores?.[id])!, index = Math.min(line, CORE_ATTRS.count - 1), cur = e.attrs[index], essence = s.essence || 0, cost = coreForgeCost(s, id);
    const forge = (mode: 'reroll' | 'refine') => send({ type: 'coreForge', id, value: `${mode}|${index}` });
    return <Good eyebrow="보스 코어" title="능력치 재설정 · 재련" desc={desc}
        controls={<>
            <label>코어<select value={id} disabled={busy} onChange={ev => setPick(ev.target.value)}>{owned.map(c => <option key={c} value={c}>{BOSS_CORES[c].name}</option>)}</select></label>
            <label>능력치 줄<select value={index} disabled={busy} onChange={ev => setLine(Number(ev.target.value))}>{Array.from({ length: CORE_ATTRS.count }, (_, i) => { const a = e.attrs[i]; return <option key={i} value={i}>{i + 1}. {a ? `${attrName(a.k)} 레벨 ×${a.f}` : '빈 줄'}</option>; })}</select></label>
        </>}
        cost={`정수 ${format(cost)} (기본 ${CORE_FORGE.base} · 손볼 때마다 ×${CORE_FORGE.growth}${e.forges ? ` · 지금 ${e.forges}회` : ''}) · 주화 재설정은 비용을 올리지 않음`}>
        <button className="secondary" disabled={busy || essence < cost} onClick={() => forge('reroll')}>재설정 · 정수 {format(cost)}</button>
        <button className="secondary" disabled={busy || !cur || essence < cost} onClick={() => forge('refine')}>재련 · 정수 {format(cost)}</button>
        <button className="secondary" disabled={busy || (s.dungeonCoins || 0) < DUNGEON_SHOP.coreReroll} onClick={() => send({ type: 'dungeonShop', id: 'coreReroll', value: `${id}|${index}` })}>재설정 · 주화 {format(DUNGEON_SHOP.coreReroll)}</button>
        {e.forges ? <button className="secondary" disabled={busy || s.pearls < CORE_FORGE.resetPearls} onClick={() => send({ type: 'coreForgeReset', id })}>비용 초기화 · 세계석 {CORE_FORGE.resetPearls}</button> : null}
    </Good>;
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
