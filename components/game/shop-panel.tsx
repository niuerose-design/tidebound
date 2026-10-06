'use client';
import { ConfirmButton } from './confirm-button';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GAMBLE_CATEGORIES, APPRAISAL, APPRAISAL_PITY, IMPRINT_APPRAISAL, AUTO_APPRAISAL_MAX, inventoryCap } from '@/game/data/economy';
import { SLOTS, RARITIES } from '@/game/data/balance';
import { gambleCost, imprintGambleCost, imprintChoices, pityLeft, GAMBLE_COUNTS, APPRAISAL_ALL } from '@/game/systems/commerce';
import { Heading, SlotIcon, format, WalletBar } from './shared';
import type { PanelProps } from './panel-props';
import { starLabel } from '@/game/data/starforce';
import { catalogNow } from '@/game/data/catalog';
import { BonusList } from './inventory-panel';
import { EquipmentForge } from './inventory-panel';
import type { State } from '@/game/types';

/** v3.58 감정 천장 현황: 신화·고대·태초 이상까지 남은 감정 수와 지금까지 감정 기록. */
function PityBar({ s }: { s: State }) {
    const rec = s.appraisal;
    return <div className="appraisal-pity">
        {pityLeft(s).map(p => <span key={p.key}><b style={{ color: RARITIES[p.rarity].color }}>{RARITIES[p.rarity].name} 이상</b> 확정까지 {format(p.left)}회</span>)}
        <span className="muted">{[`감정 ${format(rec?.count || 0)}회`, ...(rec?.byRarity || []).map((n, r) => [r, n] as const).filter(([r, n]) => r >= 4 && n).map(([r, n]) => `${RARITIES[r].name} ${n}`), '천장은 환생해도 남고 승천하면 초기화'].join(' · ')}</span>
    </div>;
}

export function Shop({ s, send, busy }: PanelProps) {
    const [tab, setTab] = useState('gamble');
    // v3.49 정보 비공개가 켜져 있으면 감정 등급 확률을 숨깁니다.
    const secret = catalogNow().secret;
    const gamble = gambleCost(s), imprint = imprintGambleCost(s), cap = inventoryCap(s), full = s.inventory.length >= cap;
    const odds = secret ? '' : `${APPRAISAL.map(r => `${RARITIES[r.rarity].name} ${(Math.round(r.chance * 10000) / 100)}%`).join(' · ')}. `;
    const [slot, setSlot] = useState<string>('rod'), [affix, setAffix] = useState(''), [target, setTarget] = useState(4), [limit, setLimit] = useState('');
    const choices = imprintChoices(GAMBLE_CATEGORIES.find(c => c.id === slot)!.slot), pick = choices.some(c => c.id === affix) ? affix : choices[0]?.id || '';
    const [autoImprint, setAutoImprint] = useState(false);
    const autoEach = autoImprint ? imprint.gold : gamble, limitGold = Number(limit.replace(/[^0-9]/g, '')) || 0;
    return <>
        <Heading eyebrow="ITEM SHOP" title="상점" description="모든 부위가 나오는 장비 감정, 부위와 옵션을 골라 새기는 각인 감정, 고른 부위를 목표 등급까지 돌리는 자동 감정, 그리고 강화."/>
        <WalletBar s={s} label="상점 재화와 보관함" extra={<div><span>감정 장비 레벨<strong>Lv.{s.level}</strong></span><span>환생 {s.rebirths} · 감정 가격 ×{(gamble / Math.max(1, gambleCost({ ...s, rebirths: 0 }))).toFixed(1)}</span></div>}/>
        <Tabs value={tab} onValueChange={setTab}><TabsList className="game-tabs port-tabs"><TabsTrigger value="gamble">장비 감정</TabsTrigger><TabsTrigger value="imprint">각인 감정</TabsTrigger><TabsTrigger value="auto">자동 감정</TabsTrigger><TabsTrigger value="forge">장비 강화</TabsTrigger></TabsList></Tabs>
        {tab !== 'forge' && <PityBar s={s}/>}
        {tab === 'gamble' && <section aria-label="장비 감정">
            {!secret && <div className="appraisal-odds"><span>감정 등급 확률</span>{APPRAISAL.map(r => <b key={r.rarity} style={{ color: RARITIES[r.rarity].color }}>{RARITIES[r.rarity].name} {Math.round(r.chance * 10000) / 100}%</b>)}</div>}
            <article className="panel market-card gamble-card gamble-single">
                <div className="gamble-icon-row">{GAMBLE_CATEGORIES.map(o => <span className="gamble-icon" key={o.id} title={o.name}><SlotIcon slot={o.slot} size={30}/></span>)}</div>
                <div><span className="eyebrow">미확인 장비</span><h2>장비 감정</h2></div>
                <p>무기 · 방어구 · 장신구 · 망토 중 하나가 같은 확률로 나옵니다(무기는 물리·마법 중 하나). 등급 수만큼 옵션이 붙고, 영웅 이상은 규칙 옵션이 붙을 수 있습니다.</p>
                <span className="gamble-guarantee">Lv.{s.level} · 희귀 이상 · 등급 수만큼 옵션 1~6개</span>
                <div className="gamble-count-row">{GAMBLE_COUNTS.map(n => { const total = gamble * n, noRoom = s.inventory.length + n > cap; return <ConfirmButton key={n} label={`${n}개 · ${format(total)} G`} title={`장비 ${n}개를 감정할까요?`} description={`골드 ${format(total)} G를 사용합니다. ${odds}부위는 무작위이고, 결과는 가방에 보관됩니다.${n > 1 ? ` 가방 ${n}칸이 필요합니다.` : ''}`} disabled={busy || s.gold < total || noRoom} onConfirm={() => send({ type: 'gamble', id: APPRAISAL_ALL, value: String(n) })}/>; })}</div>
            </article>
        </section>}
        {tab === 'imprint' && <section aria-label="각인 감정" className="panel market-card imprint-card">
            <p>부위와 옵션 하나를 고르면 그 옵션이 반드시 붙은 장비를 감정합니다. 나머지 옵션과 등급은 장비 감정과 같고, 천장도 함께 쌓입니다. 한 번에 골드 {format(imprint.gold)} G(감정의 {IMPRINT_APPRAISAL.goldMultiplier}배)와 정수 {imprint.essence}개가 듭니다.</p>
            <div className="imprint-row">
                <label>부위<select value={slot} onChange={e => setSlot(e.target.value)}>{GAMBLE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label>새길 옵션<select value={pick} onChange={e => setAffix(e.target.value)}>{choices.map(c => <option key={c.id} value={c.id}>{c.name} · {c.description}</option>)}</select></label>
            </div>
            <div className="gamble-count-row">{GAMBLE_COUNTS.map(n => { const gold = imprint.gold * n, ess = imprint.essence * n, noRoom = s.inventory.length + n > cap; return <ConfirmButton key={n} label={`${n}개 · ${format(gold)} G · 정수 ${ess}`} title={`각인 감정 ${n}개를 할까요?`} description={`골드 ${format(gold)} G와 정수 ${ess}개를 사용합니다. ${odds}고른 옵션이 반드시 붙습니다.${n > 1 ? ` 가방 ${n}칸이 필요합니다.` : ''}`} disabled={busy || !pick || s.gold < gold || (s.essence || 0) < ess || noRoom} onConfirm={() => send({ type: 'imprintGamble', id: slot, value: `${pick}|${n}` })}/>; })}</div>
        </section>}
        {tab === 'auto' && <section aria-label="자동 감정" className="panel market-card imprint-card">
            <p>고른 부위에서 목표 등급 이상이 나올 때까지 골드 한도 안에서 감정을 반복합니다(한 번에 최대 {format(AUTO_APPRAISAL_MAX)}회). 목표 미만은 물건 도감에 없는 종류면 도감에 등록하고, 나머지는 분해해 정수로 받습니다. 목표 장비는 가방에 들어가고 거기서 멈춥니다.</p>
            <div className="imprint-row">
                <label>부위<select value={slot} onChange={e => setSlot(e.target.value)}>{GAMBLE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label>목표 등급<select value={target} onChange={e => setTarget(Number(e.target.value))}>{APPRAISAL.map(r => <option key={r.rarity} value={r.rarity}>{RARITIES[r.rarity].name} 이상</option>)}</select></label>
                <label>골드 한도<input value={limit} onChange={e => setLimit(e.target.value)} inputMode="numeric" placeholder={`예: ${format(autoEach * 100)}`}/></label>
                <label className="check"><input type="checkbox" checked={autoImprint} onChange={e => setAutoImprint(e.target.checked)}/> 각인 감정으로{autoImprint && <select value={pick} onChange={e => setAffix(e.target.value)} aria-label="새길 옵션">{choices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}</label>
            </div>
            <p className="muted">한 번 {format(autoEach)} G{autoImprint ? ` · 정수 ${imprint.essence}` : ''} · 한도 안에서 최대 {format(Math.min(AUTO_APPRAISAL_MAX, Math.floor(limitGold / Math.max(1, autoEach))))}회 · {APPRAISAL_PITY.find(p => p.rarity === target) ? `${RARITIES[target].name} 이상 천장까지 ${format(pityLeft(s).find(p => p.rarity === target)!.left)}회` : '희귀·영웅·전설은 천장 없음'}</p>
            <ConfirmButton label="자동 감정 시작" title="자동 감정을 시작할까요?" description={`골드를 최대 ${format(Math.min(limitGold, s.gold))} G까지 씁니다. 목표 미만 장비는 분해되거나 도감에 등록됩니다.`} disabled={busy || full || limitGold < autoEach || s.gold < autoEach || (autoImprint && (s.essence || 0) < imprint.essence)} onConfirm={() => send({ type: 'autoGamble', id: slot, value: `${target}|${limitGold}${autoImprint ? `|${pick}` : ''}` })}/>
        </section>}
        {tab === 'forge' && <section aria-label="장비 강화">
            <div className="section-title"><h2>착용 장비 강화</h2><span>보관 중인 장비는 장비 보관함에서 강화</span></div>
            <div className="port-gamble-grid">{Object.entries(SLOTS).map(([slotId, name]) => {
                const item = s.equipment[slotId as keyof typeof s.equipment];
                return <article className="panel market-card forge-card" key={slotId}><SlotIcon slot={slotId}/><small>{name}</small>{item ? <><h2>{item.name} <span className="gold-text">{starLabel(item.enhance || 0)}</span></h2><BonusList item={item}/><EquipmentForge s={s} send={send} busy={busy} item={item}/></> : <><h2>착용 장비 없음</h2><p>장비 보관함에서 {name}을 장착하세요.</p></>}</article>;
            })}</div>
        </section>}
        {full && <div className="notice">가방이 가득 찼습니다. 장비를 정리하면 다시 감정할 수 있습니다.</div>}
    </>;
}
