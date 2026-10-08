'use client';
import { ConfirmButton } from './confirm-button';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GAMBLE_CATEGORIES, APPRAISAL, APPRAISAL_PITY, IMPRINT_APPRAISAL, AUTO_APPRAISAL_MAX, inventoryCap } from '@/game/data/economy';
import { SLOTS, RARITIES } from '@/game/data/balance';
import { gambleCost, imprintGambleCost, imprintChoices, pityLeft, GAMBLE_COUNTS, APPRAISAL_ALL } from '@/game/systems/commerce';
import { Heading, SlotIcon, format, WalletBar } from './shared';
import type { PanelProps } from './panel-props';
import { catalogNow } from '@/game/data/catalog';
import { ForgeBench, ForgeHead } from './inventory-panel';
import type { State } from '@/game/types';

/** v3.58 뽑기(감정) 천장 현황: 신화·고대·태초 이상까지 남은 감정 수와 지금까지 감정 기록. */
function PityBar({ s }: { s: State }) {
    const rec = s.appraisal;
    return <div className="appraisal-pity">
        {pityLeft(s).map(p => <span key={p.key}><b style={{ color: RARITIES[p.rarity].color }}>{RARITIES[p.rarity].name} 이상</b> 확정까지 {format(p.left)}회</span>)}
        <span className="muted">{[`뽑기 ${format(rec?.count || 0)}회`, ...(rec?.byRarity || []).map((n, r) => [r, n] as const).filter(([r, n]) => r >= 4 && n).map(([r, n]) => `${RARITIES[r].name} ${n}`), '천장은 환생해도 남고 승천하면 초기화'].join(' · ')}</span>
    </div>;
}

export function Shop({ s, send, busy }: PanelProps) {
    const [tab, setTab] = useState('gamble');
    // v3.49 정보 비공개가 켜져 있으면 감정 등급 확률을 숨깁니다.
    const secret = catalogNow().secret;
    const gamble = gambleCost(s), imprint = imprintGambleCost(s), cap = inventoryCap(), full = s.inventory.length >= cap;
    const odds = secret ? '' : `${APPRAISAL.map(r => `${RARITIES[r.rarity].name} ${(Math.round(r.chance * 10000) / 100)}%`).join(' · ')}. `;
    const [slot, setSlot] = useState<string>('rod'), [affix, setAffix] = useState(''), [target, setTarget] = useState(4);
    const choices = imprintChoices(GAMBLE_CATEGORIES.find(c => c.id === slot)!.slot), pick = choices.some(c => c.id === affix) ? affix : choices[0]?.id || '';
    const [autoImprint, setAutoImprint] = useState(false);
    const [forgeSlot, setForgeSlot] = useState<string>('rod'), forgeItem = s.equipment[forgeSlot as keyof typeof s.equipment];
    // v3.72 자동 뽑기는 골드 한도 없이 가진 골드 · 정수를 모두 씁니다(한 번에 최대 AUTO_APPRAISAL_MAX회).
    const autoEach = autoImprint ? imprint : { gold: gamble, essence: 0 };
    const autoMax = Math.min(AUTO_APPRAISAL_MAX, Math.floor(s.gold / Math.max(1, autoEach.gold)), autoEach.essence ? Math.floor((s.essence || 0) / autoEach.essence) : Infinity);
    const slotSelect = <label>부위<select value={slot} onChange={e => setSlot(e.target.value)}>{GAMBLE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>;
    const icons = (only?: string) => <div className="gamble-icon-row">{GAMBLE_CATEGORIES.filter(o => !only || o.id === only).map(o => <span className="gamble-icon" key={o.id} title={o.name}><SlotIcon slot={o.slot} size={30}/></span>)}</div>;
    // v3.72 세 뽑기 탭은 같은 틀(머리 · 설명 · 선택 줄 · 비용 줄 · 버튼 줄)이라 탭을 바꿔도 화면이 흔들리지 않습니다.
    const draw = tab === 'gamble' ? {
        label: '랜덤 뽑기', eyebrow: '모든 부위', head: icons(),
        desc: '무기 · 방어구 · 장신구 · 망토 중 하나가 같은 확률로 나옵니다(무기는 물리·마법 중 하나). 등급 수만큼 옵션이 붙고, 영웅 이상은 규칙 옵션이 붙을 수 있습니다.',
        controls: <span className="gamble-guarantee">Lv.{s.level} · 희귀 이상 · 부위 무작위 · 옵션 1~6개</span>,
        cost: `한 번 ${format(gamble)} G`,
        actions: GAMBLE_COUNTS.map(n => { const total = gamble * n, noRoom = s.inventory.length + n > cap; return <ConfirmButton key={n} label={`${n}개 · ${format(total)} G`} title={`랜덤 뽑기 ${n}개를 할까요?`} description={`골드 ${format(total)} G를 사용합니다. ${odds}부위는 무작위이고, 결과는 가방에 보관됩니다.${n > 1 ? ` 가방 ${n}칸이 필요합니다.` : ''}`} disabled={busy || s.gold < total || noRoom} onConfirm={() => send({ type: 'gamble', id: APPRAISAL_ALL, value: String(n) })}/>; }),
    } : tab === 'imprint' ? {
        label: '저격 뽑기', eyebrow: '부위 · 옵션 지정', head: icons(slot),
        desc: `부위와 옵션 하나를 고르면 그 옵션이 반드시 붙은 장비가 나옵니다. 나머지 옵션과 등급은 랜덤 뽑기와 같고 천장도 함께 쌓입니다. 고대 이상 전용 옵션은 고를 수 없습니다.`,
        controls: <>{slotSelect}<label>새길 옵션<select value={pick} onChange={e => setAffix(e.target.value)}>{choices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><small className="draw-pick-desc">{choices.find(c => c.id === pick)?.description}</small></>,
        cost: `한 번 ${format(imprint.gold)} G(랜덤 뽑기의 ${IMPRINT_APPRAISAL.goldMultiplier}배) · 정수 ${imprint.essence}`,
        actions: GAMBLE_COUNTS.map(n => { const gold = imprint.gold * n, ess = imprint.essence * n, noRoom = s.inventory.length + n > cap; return <ConfirmButton key={n} label={`${n}개 · ${format(gold)} G · 정수 ${ess}`} title={`저격 뽑기 ${n}개를 할까요?`} description={`골드 ${format(gold)} G와 정수 ${ess}개를 사용합니다. ${odds}고른 옵션이 반드시 붙습니다.${n > 1 ? ` 가방 ${n}칸이 필요합니다.` : ''}`} disabled={busy || !pick || s.gold < gold || (s.essence || 0) < ess || noRoom} onConfirm={() => send({ type: 'imprintGamble', id: slot, value: `${pick}|${n}` })}/>; }),
    } : tab === 'auto' ? {
        label: '자동 뽑기', eyebrow: '목표 등급까지', head: icons(slot),
        desc: `고른 부위에서 목표 등급 이상이 나올 때까지 가진 골드${autoImprint ? '와 정수' : ''}를 모두 써서 반복합니다(한 번에 최대 ${format(AUTO_APPRAISAL_MAX)}회). 목표 미만은 물건 도감에 없는 종류면 등록하고, 나머지는 분해해 정수로 받습니다. 목표 장비는 가방에 들어가고 거기서 멈춥니다.`,
        controls: <>{slotSelect}<label>목표 등급<select value={target} onChange={e => setTarget(Number(e.target.value))}>{APPRAISAL.map(r => <option key={r.rarity} value={r.rarity}>{RARITIES[r.rarity].name} 이상</option>)}</select></label>
            <label className="check"><input type="checkbox" checked={autoImprint} onChange={e => setAutoImprint(e.target.checked)}/> 저격 뽑기로{autoImprint && <select value={pick} onChange={e => setAffix(e.target.value)} aria-label="새길 옵션">{choices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}</label></>,
        cost: `한 번 ${format(autoEach.gold)} G${autoEach.essence ? ` · 정수 ${autoEach.essence}` : ''} · 지금 가진 것으로 최대 ${format(autoMax)}회 · ${APPRAISAL_PITY.find(p => p.rarity === target) ? `${RARITIES[target].name} 이상 천장까지 ${format(pityLeft(s).find(p => p.rarity === target)!.left)}회` : '희귀·영웅·전설은 천장 없음'}`,
        actions: [<ConfirmButton key="auto" label={`자동 뽑기 시작 · 최대 ${format(autoMax)}회`} title="자동 뽑기를 시작할까요?" description={`가진 골드 ${format(s.gold)} G${autoEach.essence ? `와 정수 ${format(s.essence || 0)}` : ''}를 모두 쓸 수 있습니다. 목표 미만 장비는 분해되거나 도감에 등록됩니다.`} disabled={busy || full || autoMax < 1} onConfirm={() => send({ type: 'autoGamble', id: slot, value: `${target}|max${autoImprint ? `|${pick}` : ''}` })}/>],
    } : null;
    return <>
        <Heading eyebrow="ITEM SHOP" title="상점" description="모든 부위가 나오는 랜덤 뽑기, 부위와 옵션을 골라 노리는 저격 뽑기, 목표 등급까지 돌리는 자동 뽑기, 그리고 강화."/>
        <WalletBar s={s} label="상점 재화와 보관함" extra={<div><span>뽑기 장비 레벨<strong>Lv.{s.level}</strong></span><span>환생 {s.rebirths} · 뽑기 가격 ×{(gamble / Math.max(1, gambleCost({ ...s, rebirths: 0 }))).toFixed(1)}</span></div>}/>
        <Tabs value={tab} onValueChange={setTab}><TabsList className="game-tabs port-tabs"><TabsTrigger value="gamble">랜덤 뽑기</TabsTrigger><TabsTrigger value="imprint">저격 뽑기</TabsTrigger><TabsTrigger value="auto">자동 뽑기</TabsTrigger><TabsTrigger value="forge">장비 강화</TabsTrigger></TabsList></Tabs>
        <div className="shop-body">
        {draw && <section aria-label={draw.label}>
            <PityBar s={s}/>
            {!secret && <div className="appraisal-odds"><span>등급 확률</span>{APPRAISAL.map(r => <b key={r.rarity} style={{ color: RARITIES[r.rarity].color }}>{RARITIES[r.rarity].name} {Math.round(r.chance * 10000) / 100}%</b>)}</div>}
            <article className="panel market-card draw-card">
                <header className="draw-head">{draw.head}<div><span className="eyebrow">{draw.eyebrow}</span><h2>{draw.label}</h2></div></header>
                <p className="draw-desc">{draw.desc}</p>
                <div className="imprint-row draw-controls">{draw.controls}</div>
                <p className="muted draw-cost">{draw.cost}</p>
                <div className="gamble-count-row draw-actions">{draw.actions}</div>
            </article>
        </section>}
        {tab === 'forge' && <section aria-label="장비 강화">
            {/* v3.76 부위 고르기 + 작업대 하나: 카드 네 장을 늘어놓던 때와 달리 높이가 들쭉날쭉하지 않고 옵션 재설정까지 한 곳에서 합니다. */}
            <div className="forge-picker" aria-label="강화할 부위">{(Object.keys(SLOTS) as (keyof typeof SLOTS)[]).map(id => { const it = s.equipment[id as keyof typeof s.equipment]; return <button type="button" key={id} aria-pressed={forgeSlot === id} className={`forge-pick${forgeSlot === id ? ' on' : ''}${it?.onyx ? ' onyx-frame' : ''}`} style={{ '--rarity': it ? RARITIES[it.rarity].color : '#5a6f71' } as React.CSSProperties} onClick={() => setForgeSlot(id)}>
                <SlotIcon slot={id} size={18}/><span><small>{SLOTS[id]}</small><b className={it?.onyx ? 'onyx-name' : ''}>{it ? it.name : '비어 있음'}</b></span>{it && <em className="gold-text">★{it.enhance || 0}</em>}</button>; })}</div>
            {forgeItem ? <article className={`panel forge-panel${forgeItem.onyx ? ' onyx-frame' : ''}`} style={{ '--rarity': RARITIES[forgeItem.rarity].color } as React.CSSProperties}><ForgeHead item={forgeItem}/><ForgeBench s={s} send={send} busy={busy} item={forgeItem}/></article>
                : <div className="notice">착용한 {SLOTS[forgeSlot as keyof typeof SLOTS]}이 없습니다. 장비 보관함에서 장착하면 여기서 강화할 수 있습니다.</div>}
            <p className="footnote">보관 중인 장비는 장비 보관함에서 줄을 펼쳐 강화합니다.</p>
        </section>}
        </div>
        {full && <div className="notice">가방이 가득 찼습니다. 장비를 정리하면 다시 뽑을 수 있습니다.</div>}
    </>;
}
