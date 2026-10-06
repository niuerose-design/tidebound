'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Compass, ListOrdered, RefreshCw, Repeat, X } from 'lucide-react';
import type { Action, State } from '@/game/types';
import { RESEARCH, RESEARCH_TABS } from '@/game/data/economy';
import { ASCENSION, ASCENSION_PERKS, ascended, ascensionPerk } from '@/game/data/ascension';
import { AUTO_REBIRTH_LEVELS, RESEARCH_PLAN_MAX } from '@/game/systems/research-plan';
import { rebirthLevel } from '@/game/systems/meta';
import { FOLLOW_STAGE, FOLLOW_TIDE, followTarget, nextRotationJob, rotationChoices, type FollowRule } from '@/game/systems/automation';
import { STAGES } from '@/game/data/world';
import { MIMIC } from '@/game/data/mimic';
import { jobById } from '@/game/data/classes';

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

const STAGE_RULE: Record<FollowRule['stage'], string> = { top: '레벨에 맞는 가장 높은 사냥터', habitat: '레벨에 맞는 가장 높은 무리 서식지', keep: '사냥터는 그대로' };
const TIDE_RULE: Record<FollowRule['tide'], string> = { max: '고를 수 있는 최대 난이도', mimic: `까미 상한 난이도(${MIMIC.tierCap})까지`, keep: '난이도는 그대로' };
/** v3.41 사냥터·난이도 자동 따라가기(승천 2회): 레벨·환생이 오르면 규칙대로 사냥터와 난이도를 옮깁니다(전투 사이에만). */
export function AutoFollowPanel({ s, send, busy }: Props) {
    const open = ascensionPerk(s, 'autoFollow'), rule: FollowRule = s.autoFollow || { on: false, stage: 'top', tide: 'max' };
    const set = (patch: Partial<FollowRule>) => { const next = { ...rule, ...patch }; send({ type: 'autoFollow', id: next.on ? 'on' : 'off', value: `${next.stage}:${next.tide}` }); };
    const target = open ? followTarget(s, rule) : null;
    return <section className={`panel automation-panel ${open ? '' : 'locked'}`}>
        <div className="section-title"><h2><Compass size={16}/> 사냥터 · 난이도 자동 따라가기</h2><span>{open ? (rule.on ? '켜짐' : '꺼짐') : `승천 ${ASCENSION_PERKS.autoFollow}회부터`}</span></div>
        <p>레벨과 환생 횟수가 오르면 규칙대로 사냥터와 난이도를 옮깁니다. 전투 사이(던전 밖, 회복 대기가 아닐 때)에만 바꿉니다.</p>
        {open && <><div className="automation-row">
            <select value={rule.stage} disabled={busy} aria-label="사냥터 규칙" onChange={e => set({ stage: e.target.value as FollowRule['stage'] })}>{FOLLOW_STAGE.map(id => <option key={id} value={id}>{STAGE_RULE[id]}</option>)}</select>
            <select value={rule.tide} disabled={busy} aria-label="난이도 규칙" onChange={e => set({ tide: e.target.value as FollowRule['tide'] })}>{FOLLOW_TIDE.map(id => <option key={id} value={id}>{TIDE_RULE[id]}</option>)}</select>
            <button type="button" className={rule.on ? 'primary' : 'secondary'} disabled={busy} aria-pressed={rule.on} onClick={() => set({ on: !rule.on })}>{rule.on ? '켜짐' : '꺼짐'}</button>
        </div>{target && <p className="automation-note">지금 규칙이면: {STAGES.find(x => x.id === target.stage)?.name} · 난이도 {target.tide}</p>}</>}
    </section>;
}

/** v3.41 숙련 순회 전직(승천 2회): 지금 직업이 정한 시점에 닿으면 숙달하지 않은 다음 직업으로 바꾸고 추천 편성을 장착합니다. */
export function RotationPanel({ s, send, busy }: Props) {
    const choices = rotationChoices(s), open = choices.length > 0, rule = s.rotation || { on: false, at: choices[0] ?? 1 };
    const at = choices.includes(rule.at) ? rule.at : choices[0], label = (x: 'mastered' | number) => x === 'mastered' ? '숙달 즉시' : `단련 ${x}단계`;
    const next = open ? nextRotationJob(s) : null;
    return <section className={`panel automation-panel ${open ? '' : 'locked'}`}>
        <div className="section-title"><h2><Repeat size={16}/> 숙련 순회 전직</h2><span>{open ? (rule.on ? '켜짐' : '꺼짐') : `승천 ${ASCENSION_PERKS.rotation}회부터`}</span></div>
        <p>지금 직업이 정한 시점에 닿으면, 바꿀 수 있는 숙달 전 직업 중 낮은 차수부터 자동으로 전직하고 추천 편성을 장착합니다. 전직 시점은 승천 2회에 단련 1단계 고정, 3회부터 숙달 즉시·단련 1~3단계, 4회 1~5단계, 5회 1~7단계까지 고를 수 있습니다.</p>
        {open && <><div className="automation-row">
            <label>전직 시점<select value={String(at)} disabled={busy || choices.length < 2} onChange={e => send({ type: 'rotation', id: rule.on ? 'on' : 'off', value: e.target.value })}>{choices.map(x => <option key={String(x)} value={String(x)}>{label(x)}</option>)}</select></label>
            <button type="button" className={rule.on ? 'primary' : 'secondary'} disabled={busy} aria-pressed={rule.on} onClick={() => send({ type: 'rotation', id: rule.on ? 'off' : 'on', value: String(at) })}>{rule.on ? '켜짐' : '꺼짐'}</button>
        </div><p className="automation-note">{next ? `다음 직업: ${next.name}` : '지금 바꿀 수 있는 숙달 전 직업이 없습니다.'} · 지금 직업 {jobById(s.job)?.name}</p></>}
    </section>;
}
