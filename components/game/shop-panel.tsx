'use client';
import { ConfirmButton } from './confirm-button';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SHOP, GAMBLE_CATEGORIES, APPRAISAL, inventoryCap } from '@/game/data/economy';
import { SLOTS, RARITIES } from '@/game/data/balance';
import { shopCost, gambleCost, shopPreview, plainCost, GAMBLE_COUNTS } from '@/game/systems/commerce';
import { Heading, SlotIcon, format, WalletBar } from './shared';
import type { PanelProps } from './panel-props';
import { starLabel } from '@/game/data/starforce';
import { catalogNow } from '@/game/data/catalog';
import { BonusList } from './inventory-panel';
import { EquipmentForge } from './inventory-panel';
export function Shop({ s, send, busy }: PanelProps) {
    const [tab, setTab] = useState('gamble');
    // v3.49 정보 비공개가 켜져 있으면 감정 등급 확률을 숨깁니다.
    const secret = catalogNow().secret;
    const cost = shopCost(s), plain = plainCost(s), gamble = gambleCost(s), cap = inventoryCap(s), full = s.inventory.length >= cap;
    return <>
        <Heading eyebrow="ITEM SHOP" title="상점" description="장비를 고르고, 감정하고, 단련하는 곳."/>
        <WalletBar s={s} label="상점 재화와 보관함" extra={<div><span>현재 구매 장비<strong>Lv.{s.level}</strong></span></div>}/>
        <Tabs value={tab} onValueChange={setTab}><TabsList className="game-tabs port-tabs"><TabsTrigger value="gamble">장비 감정</TabsTrigger><TabsTrigger value="buy">확정 구매</TabsTrigger><TabsTrigger value="forge">장비 강화</TabsTrigger></TabsList></Tabs>
        {tab === 'gamble' && <section aria-label="부위별 장비 감정">
            {!secret && <div className="appraisal-odds"><span>감정 등급 확률</span>{APPRAISAL.map(r => <b key={r.rarity} style={{ color: RARITIES[r.rarity].color }}>{RARITIES[r.rarity].name} {Math.round(r.chance * 1000) / 10}%</b>)}</div>}
            <div className="port-gamble-grid">{GAMBLE_CATEGORIES.map(o => <article className="panel market-card gamble-card" key={o.id}>
                <div className="gamble-icon"><SlotIcon slot={o.slot} size={34}/></div>
                <div><span className="eyebrow">미확인 장비</span><h2>{o.name}</h2></div><p>{o.description}</p>
                <span className="gamble-guarantee">Lv.{s.level} · 희귀 이상 · 등급 수만큼 옵션 1~6개</span>
                <div className="gamble-count-row">{GAMBLE_COUNTS.map(n => { const total = gamble * n, noRoom = s.inventory.length + n > cap; return <ConfirmButton key={n} label={`${n}개 · ${format(total)} G`} title={`${o.name} ${n}개를 감정할까요?`} description={`골드 ${format(total)} G를 사용합니다. ${secret ? '' : `${APPRAISAL.map(r => `${RARITIES[r.rarity].name} ${Math.round(r.chance * 1000) / 10}%`).join(' · ')}. `}${o.description} 등급 수만큼 옵션이 붙고(영웅 이상은 규칙 옵션 가능), 결과는 가방에 보관됩니다.${n > 1 ? ` 가방 ${n}칸이 필요합니다.` : ''}`} disabled={busy || s.gold < total || noRoom} onConfirm={() => send({ type: 'gamble', id: o.id, value: String(n) })}/>; })}</div>
            </article>)}</div>
        </section>}
        {tab === 'buy' && <section aria-label="확정 장비 구매"><div className="port-purchase-grid">{SHOP.map(o => <article className="panel market-card" key={o.id}>
            <SlotIcon slot={o.slot} size={26}/><h2>{o.name}</h2><p>{o.description} · 희귀 · Lv.{s.level}</p>
            <BonusList item={shopPreview(s, o.id)}/><button className="primary" disabled={busy || s.gold < cost || full} onClick={() => send({ type: 'buy', id: o.id })}>구매 · {format(cost)} G</button><button className="secondary" title="옵션 없는 일반 등급(흰색). 물건 도감 등록용." disabled={busy || s.gold < plain || full} onClick={() => send({ type: 'buy', id: o.id, value: 'plain' })}>일반 등급 · {format(plain)} G · 도감용</button>
        </article>)}</div></section>}
        {tab === 'forge' && <section aria-label="장비 강화">
            <div className="section-title"><h2>착용 장비 강화</h2><span>보관 중인 장비는 장비 보관함에서 강화</span></div>
            <div className="port-gamble-grid">{Object.entries(SLOTS).map(([slot, name]) => {
                const item = s.equipment[slot as keyof typeof s.equipment];
                return <article className="panel market-card forge-card" key={slot}><SlotIcon slot={slot}/><small>{name}</small>{item ? <><h2>{item.name} <span className="gold-text">{starLabel(item.enhance || 0)}</span></h2><BonusList item={item}/><EquipmentForge s={s} send={send} busy={busy} item={item}/></> : <><h2>착용 장비 없음</h2><p>장비 보관함에서 {name}을 장착하세요.</p></>}</article>;
            })}</div>
        </section>}
        {full && <div className="notice">가방이 가득 찼습니다. 장비를 정리하면 다시 구매·감정할 수 있습니다.</div>}
    </>;
}
