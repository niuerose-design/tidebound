'use client';
import { ConfirmButton } from './confirm-button';
import { useState } from 'react';
import { Coins, ShoppingBag } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SHOP, GAMBLE_CATEGORIES, APPRAISAL, inventoryCap } from '@/game/data/economy';
import { SLOTS, RARITIES } from '@/game/data/balance';
import { shopCost, gambleCost, shopPreview } from '@/game/systems/commerce';
import { Heading, SlotIcon, format, Num } from './shared';
import type { PanelProps } from './panel-props';
import { BonusList } from './inventory-panel';
import { EquipmentForge } from './inventory-panel';
export function Shop({ s, send, busy }: PanelProps) {
    const [tab, setTab] = useState('gamble');
    const cost = shopCost(s), gamble = gambleCost(s), full = s.inventory.length >= inventoryCap(s);
    return <>
        <Heading eyebrow="HARBOR MARKET" title="항구 상점" description="장비를 고르고, 감정하고, 단련하는 곳."/>
        <section className="panel port-resource-bar" aria-label="상점 재화와 보관함">
            <div><Coins size={22}/><span>보유 골드<strong><Num n={s.gold}/> <small>G</small></strong></span></div>
            <div><ShoppingBag size={22}/><span>장비 가방<strong>{s.inventory.length} <small>/ {inventoryCap(s)}</small></strong></span></div>
            <div><span>현재 구매 장비<strong>Lv.{s.level}</strong></span></div>
        </section>
        <Tabs value={tab} onValueChange={setTab}><TabsList className="game-tabs port-tabs"><TabsTrigger value="gamble">장비 감정</TabsTrigger><TabsTrigger value="buy">확정 구매</TabsTrigger><TabsTrigger value="forge">장비 강화</TabsTrigger></TabsList></Tabs>
        {tab === 'gamble' && <section aria-label="부위별 장비 감정">
            <div className="appraisal-odds"><span>감정 등급 확률</span>{APPRAISAL.map(r => <b key={r.rarity} style={{ color: RARITIES[r.rarity].color }}>{RARITIES[r.rarity].name} {Math.round(r.chance * 1000) / 10}%</b>)}</div>
            <div className="port-gamble-grid">{GAMBLE_CATEGORIES.map(o => <article className="panel market-card gamble-card" key={o.id}>
                <div className="gamble-icon"><SlotIcon slot={o.slot} size={34}/></div>
                <div><span className="eyebrow">미확인 장비</span><h2>{o.name}</h2></div><p>{o.description}</p>
                <span className="gamble-guarantee">Lv.{s.level} · 희귀 이상 · 등급 수만큼 옵션 1~6개</span>
                <ConfirmButton label={`${format(gamble)} G · 감정`} title={`${o.name}을 감정할까요?`} description={`골드 ${format(gamble)} G를 사용합니다. ${APPRAISAL.map(r => `${RARITIES[r.rarity].name} ${Math.round(r.chance * 1000) / 10}%`).join(' · ')}. ${o.description} 등급 수만큼 옵션이 붙고(영웅 이상은 규칙 옵션 가능), 결과는 가방에 보관됩니다.`} disabled={busy || s.gold < gamble || full} onConfirm={() => send({ type: 'gamble', id: o.id })}/>
            </article>)}</div>
            <p className="footnote">장비 드롭 보너스는 감정 확률에 영향을 주지 않습니다. 획득한 장비는 보관함에서 직접 장착하세요.</p>
        </section>}
        {tab === 'buy' && <section aria-label="확정 장비 구매"><div className="port-purchase-grid">{SHOP.map(o => <article className="panel market-card" key={o.id}>
            <SlotIcon slot={o.slot} size={26}/><h2>{o.name}</h2><p>{o.description} · 희귀 · Lv.{s.level}</p>
            <BonusList item={shopPreview(s, o.id)}/><button className="primary" disabled={busy || s.gold < cost || full} onClick={() => send({ type: 'buy', id: o.id })}>구매 · {format(cost)} G</button>
        </article>)}</div><p className="footnote">표시된 등급과 추가 옵션을 확정적으로 획득합니다. 일반 장비는 환생 시 초기화됩니다.</p></section>}
        {tab === 'forge' && <section aria-label="장비 강화">
            <div className="section-title"><h2>착용 장비 강화</h2><span>보관 중인 장비는 장비 보관함에서 강화</span></div>
            <div className="port-gamble-grid">{Object.entries(SLOTS).map(([slot, name]) => {
                const item = s.equipment[slot as keyof typeof s.equipment];
                return <article className="panel market-card forge-card" key={slot}><SlotIcon slot={slot}/><small>{name}</small>{item ? <><h2>{item.name} <span className="gold-text">+{item.enhance || 0}</span></h2><BonusList item={item}/><EquipmentForge s={s} send={send} busy={busy} item={item}/></> : <><h2>착용 장비 없음</h2><p>장비 보관함에서 {name}을 장착하세요.</p></>}</article>;
            })}</div>
        </section>}
        {full && <div className="notice">가방이 가득 찼습니다. 장비를 정리하면 다시 구매·감정할 수 있습니다.</div>}
        <p className="footnote">구매·강화·옵션 변경 비용은 판매할 때 환급되지 않습니다.</p>
    </>;
}
