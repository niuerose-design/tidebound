'use client';
import { ConfirmButton } from './confirm-button';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Item, Stats } from '@/game/types';
import { ECONOMY, AFFIXES } from '@/game/data/economy';
import { SLOTS, RARITIES, BALANCE } from '@/game/data/balance';
import { STAT_LABELS, byStatOrder, statDeltaDisplay } from '@/game/data/progression';
import { itemStats, itemDescription, enhanceCost, reforgeCost, bulkItems, saleValue } from '@/game/systems/equipment';
import { stats } from '@/game/systems/stats';
import { Heading, SlotIcon, format } from './shared';
import type { PanelProps } from './panel-props';
export function BonusList({ item }: {
    item: Item;
}) {
    return <div className="equipment-numbers">{byStatOrder(Object.entries(itemStats(item))).map(([key, value]) => <span key={key}>{STAT_LABELS[key as keyof Stats]}<b>{statDeltaDisplay(key, value as number)}</b>
        </span>)}</div>;
}

export function Inventory({ s, send, busy }: PanelProps) {
    const [filter, setFilter] = useState('all');
    const current = stats(s);
    const card = (item: Item, equipped = false) => {
        const after = stats({ ...s, equipment: { ...s.equipment, [item.slot]: item } });
        const delta = Object.entries(after).filter(([k, n]) => Math.abs(n - current[k as keyof Stats]) > .001);
        return <article key={item.id} className="panel item-card" style={{ '--rarity': RARITIES[item.rarity].color } as React.CSSProperties}>
 <div className="item-top">
        <span>{RARITIES[item.rarity].name} · {SLOTS[item.slot]}</span>
        <small>{item.relic ? '환생 보존 유물' : `획득 Lv.${item.level}`}{item.locked ? ' · 보호' : ''}</small>
        </div>
        <h3>
        <SlotIcon slot={item.slot}/>{item.name} <span className="gold-text">+{item.enhance || 0}</span>
        </h3>
        <p>{itemDescription(item)}</p>
        <BonusList item={item}/>
        <p className="footnote">직업 배율 적용 전 장비 기여 수치 · 강화 +{(item.enhance || 0) * 15}%</p>
 {item.affix && <div className="affix-explanation">
            <b>추가 옵션 · {item.affix.name}</b>
            <span>{STAT_LABELS[item.affix.stat]} {statDeltaDisplay(item.affix.stat, item.affix.value)}</span>
            <p>{AFFIXES.find(a => a.stat === item.affix?.stat)?.description || '장착 시 해당 능력치에 더해집니다.'} 위 수치에 포함됩니다.</p>
            </div>}
 {!equipped && <div className="equipment-comparison">
            <small>교체 후 최종 능력치 변화</small>{delta.length ? byStatOrder(delta).map(([k, n]) => { const d = n - current[k as keyof Stats]; return <span key={k} className={d > 0 ? 'positive' : 'negative'}>{STAT_LABELS[k as keyof Stats]} {statDeltaDisplay(k, d)}</span>; }) : <span>변화 없음</span>}</div>}
 <div className="button-row">
        <button className="primary small" disabled={busy} onClick={() => send({ type: equipped ? 'unequip' : 'equip', id: equipped ? item.slot : item.id })}>{equipped ? '장착 해제' : '장착'}</button>{!equipped && <>
            <button className="secondary small" disabled={busy} onClick={() => send({ type: 'lockItem', id: item.id })}>{item.locked ? '보호 해제' : '보호'}</button>
            <button className="text-button" disabled={busy || !!item.locked || !!item.relic} onClick={() => send({ type: 'sell', id: item.id })}>{format(saleValue(item))} G 판매</button>
            </>}</div>
 <details className="forge-details"><summary>강화 · 옵션 재설정</summary><EquipmentForge s={s} send={send} busy={busy} item={item}/></details>
 </article>;
    };
    return <>
    <Heading eyebrow="EQUIPMENT & FORGE" title="장비 보관함" description="실제 능력치와 교체 결과를 비교하세요. 보호한 장비와 유물은 일괄판매에서 제외됩니다.">
    <span className="badge">{s.inventory.length} / {BALANCE.inventoryCap}</span>
    </Heading>
    <h2 className="economy-section-title">착용 장비</h2>
    <div className="item-grid">{Object.values(s.equipment).filter((i): i is Item => !!i).map(i => card(i, true))}</div>
    <section className="panel bulk-sale">
    <div>
    <h2>등급별 일괄판매</h2>
    <p>현재 부위 필터와 관계없이 가방 전체에서 선택한 등급만 판매합니다.</p>
    </div>
    <div className="button-row">{RARITIES.map((r, i) => { const items = bulkItems(s, i), gold = items.reduce((sum, item) => sum + saleValue(item), 0); return <ConfirmButton key={r.name} label={`${r.name} ${items.length}개`} title={`${r.name} 장비 ${items.length}개를 판매할까요?`} description={`보호하지 않은 일반 장비만 판매하여 ${format(gold)} G를 받습니다. 장착 장비와 환생 유물은 제외됩니다.`} disabled={busy || !items.length} onConfirm={() => send({ type: 'sellRarity', id: String(i) })}/>; })}</div>
    </section>
    <Tabs value={filter} onValueChange={setFilter}>
    <TabsList className="game-tabs">
    <TabsTrigger value="all">전체 가방</TabsTrigger>{Object.entries(SLOTS).map(([id, n]) => <TabsTrigger key={id} value={id}>{n}</TabsTrigger>)}</TabsList>
    </Tabs>
    <div className="item-grid">{s.inventory.filter(i => filter === 'all' || i.slot === filter).map(i => card(i))}</div>{!s.inventory.length && <div className="notice">가방이 비어 있습니다. 낚시 또는 항구 상점에서 장비를 획득하세요.</div>}</>;
}

export function EquipmentForge({ s, send, busy, item }: PanelProps & { item: Item }) {
    const rank = item.enhance || 0, cost = enhanceCost(item);
    return <div className="forge-actions">
        <p className="footnote">강화 1회당 기본 수치 +{ECONOMY.enhanceGain * 100}%. 실패·파괴 없이 최대 +{ECONOMY.enhanceMax}. 추가 옵션은 그대로입니다.</p>
        <button className="primary" disabled={busy || rank >= ECONOMY.enhanceMax || s.gold < cost} onClick={() => send({ type: 'enhance', id: item.id })}>{rank >= ECONOMY.enhanceMax ? '최대 강화' : `+${rank + 1} 강화 · ${format(cost)} G`}</button>
        <ConfirmButton label={`옵션 재설정 · ${format(reforgeCost(item))} G`} title="추가 옵션을 무작위로 바꿀까요?" description="기존 추가 옵션이 사라지고 8종 중 하나가 같은 확률로 선택됩니다. 같은 옵션이 다시 나올 수 있으며, 유물의 전용 옵션도 교체됩니다." disabled={busy || item.rarity === 0 || s.gold < reforgeCost(item)} onConfirm={() => send({ type: 'reforge', id: item.id })}/>
    </div>;
}
