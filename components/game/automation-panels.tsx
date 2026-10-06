'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, ListOrdered, RefreshCw, X } from 'lucide-react';
import type { Action, State } from '@/game/types';
import { RESEARCH, RESEARCH_TABS } from '@/game/data/economy';
import { ASCENSION, ASCENSION_PERKS, ascended, ascensionPerk } from '@/game/data/ascension';
import { AUTO_REBIRTH_LEVELS, RESEARCH_PLAN_MAX } from '@/game/systems/research-plan';
import { rebirthLevel } from '@/game/systems/meta';

type Props = { s: State; send: (a: Action) => void; busy: boolean };
/** 승천 편의 패널을 보여 줄지: 승천했거나 승천 패널이 보이는 환생 50회부터(잠긴 채 미리 보기). */
export const showAutomation = (s: State) => ascended(s) || s.rebirths >= 50;
const researchName = (id: string) => RESEARCH.find(r => r.id === id)?.name || id;

/** v3.40 자동 환생(승천 1회): 목표 레벨에 닿으면 정해 둔 서약으로 환생하고 사냥을 이어 갑니다. */
export function AutoRebirthPanel({ s, send, busy }: Props) {
    const open = ascensionPerk(s, 'autoRebirth'), a = s.autoRebirth || { on: false, level: 0 };
    return <section className={`panel automation-panel ${open ? '' : 'locked'}`}>
        <div className="section-title"><h2><RefreshCw size={16}/> 자동 환생</h2><span>{open ? (a.on ? '켜짐' : '꺼짐') : `승천 ${ASCENSION_PERKS.autoRebirth}회부터`}</span></div>
        <p>목표 레벨에 닿으면 위에서 정해 둔 서약으로 환생하고 자동 사냥을 이어 갑니다(부재중 정산 중에도). 던전 안에서는 기다리고, 환생 {ASCENSION.rebirthCap}회 상한에서 멈춥니다.</p>
        {open && <div className="automation-row">
            <label>목표 레벨<select value={a.level} disabled={busy} onChange={e => send({ type: 'autoRebirth', id: a.on ? 'on' : 'off', value: e.target.value })}>{AUTO_REBIRTH_LEVELS.map(n => <option key={n} value={n}>{n ? `Lv.${n}${n < rebirthLevel(s) ? ` (지금은 요구 Lv.${rebirthLevel(s)})` : ''}` : `요구 레벨 (지금 Lv.${rebirthLevel(s)})`}</option>)}</select></label>
            <button type="button" className={a.on ? 'primary' : 'secondary'} disabled={busy} aria-pressed={a.on} onClick={() => send({ type: 'autoRebirth', id: a.on ? 'off' : 'on', value: String(a.level) })}>{a.on ? '켜짐' : '꺼짐'}</button>
        </div>}
    </section>;
}

/** v3.40 연구 구매 예약(승천 1회): 순서와 목표 단계를 정해 두면 세계석이 모일 때마다 그 순서대로 삽니다. 승천해도 남습니다. */
export function ResearchPlanPanel({ s, send, busy }: Props) {
    const open = ascensionPerk(s, 'researchPlan'), plan = s.researchPlan || { on: false, items: [] };
    const [pick, setPick] = useState(RESEARCH[0].id), r = RESEARCH.find(x => x.id === pick)!, [to, setTo] = useState(0);
    const target = to && to <= r.max ? to : r.max;
    return <section className={`panel automation-panel research-plan ${open ? '' : 'locked'}`}>
        <div className="section-title"><h2><ListOrdered size={16}/> 연구 구매 예약</h2><span>{open ? `${plan.items.length} / ${RESEARCH_PLAN_MAX}칸 · ${plan.on ? '켜짐' : '꺼짐'}` : `승천 ${ASCENSION_PERKS.researchPlan}회부터`}</span>{open && <button type="button" className={plan.on ? 'primary small' : 'secondary small'} disabled={busy} aria-pressed={plan.on} onClick={() => send({ type: 'researchPlan', id: plan.on ? 'off' : 'on' })}>{plan.on ? '켜짐' : '꺼짐'}</button>}</div>
        <p>위 칸부터 목표 단계까지 차례로 삽니다. 세계석이 모자라면 그 칸에서 기다리고, 아직 열리지 않은 연구는 건너뜁니다. 승천 전에 짜 두면 다음 바퀴에 그대로 씁니다.</p>
        {open && <>
            {plan.items.length ? <ol className="research-plan-list">{plan.items.map((item, i) => { const have = s.permanent[item.id] || 0; return <li key={item.id} className={have >= item.to ? 'done' : ''}>
                <span><b>{researchName(item.id)}</b><small>{have} → {item.to}단계</small></span>
                <span className="research-plan-actions"><button type="button" className="icon-button" aria-label="위로" disabled={busy || i === 0} onClick={() => send({ type: 'researchPlan', id: 'up', value: String(i) })}><ArrowUp size={14}/></button><button type="button" className="icon-button" aria-label="아래로" disabled={busy || i === plan.items.length - 1} onClick={() => send({ type: 'researchPlan', id: 'down', value: String(i) })}><ArrowDown size={14}/></button><button type="button" className="icon-button" aria-label="빼기" disabled={busy} onClick={() => send({ type: 'researchPlan', id: 'remove', value: String(i) })}><X size={14}/></button></span>
            </li>; })}</ol> : <p className="research-plan-empty">아직 예약한 연구가 없습니다.</p>}
            <div className="automation-row">
                <select value={pick} disabled={busy} onChange={e => { setPick(e.target.value); setTo(0); }} aria-label="예약할 연구">{RESEARCH_TABS.map(t => <optgroup key={t.id} label={t.name}>{RESEARCH.filter(x => x.tab === t.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>)}</select>
                <select value={target} disabled={busy} onChange={e => setTo(Number(e.target.value))} aria-label="목표 단계">{Array.from({ length: r.max }, (_, i) => i + 1).reverse().map(n => <option key={n} value={n}>{n}단계{n === r.max ? ' (최대)' : ''}</option>)}</select>
                <button type="button" className="secondary" disabled={busy} onClick={() => send({ type: 'researchPlan', id: 'add', value: `${pick}:${target}` })}>예약에 넣기</button>
                {plan.items.length > 0 && <button type="button" className="text-button" disabled={busy} onClick={() => send({ type: 'researchPlan', id: 'clear' })}>비우기</button>}
            </div>
        </>}
    </section>;
}
