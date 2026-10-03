'use client';
import { ConfirmButton } from './confirm-button';
import { RefreshCw } from 'lucide-react';
import { ATTRIBUTES, PROGRESSION, CORE_STATS, DETAIL_STATS, OPTIONAL_STATS, percent } from '@/game/data/progression';
import { attributes, apCapacity, apUsed, canUse } from '@/game/systems/progression';
import { victoryHeal, victoryHealRate } from '@/game/systems/encounter';
import { FIRST_AID_HEAL, MONSTER_TUNING } from '@/game/data/balance';
import { StatBreakdown } from './stat-breakdown';
import { type StatTrace, stats, dropRate, goldMultiplier, expMultiplier } from '@/game/systems/stats';
import { Heading } from './shared';
import type { PanelProps } from './panel-props';
export function Character({ s, send, busy }: PanelProps) {
    const trace: StatTrace = {}, a = stats(s, trace), v = attributes(s);
    return <>
    <Heading eyebrow="CHARACTER BUILD" title="어떤 낚시꾼이 될 것인가" description={`기본 능력치는 전직 조건과 전투 특성을 함께 결정합니다. 레벨마다 ${PROGRESSION.statPerLevel}포인트를 직접 배분하세요.`}>
    <ConfirmButton icon={<RefreshCw size={15}/>} confirmLabel="초기화" title="능력치를 재분배할까요?" description="투자한 포인트를 전부 돌려받습니다. 전직 해금 기록은 유지되며 체력·마나는 새 최대값을 초과할 수 없습니다." disabled={busy || s.running} onConfirm={() => send({ type: 'resetAttributes' })} label="무료 재분배"/>
    </Heading>
    <div className="build-banner panel">
    <div>
    <div className="eyebrow">UNSPENT POINTS</div>
    <strong>{s.statPoints}<small>남은 능력치 포인트</small>
    </strong>
    </div>
    <p>근력은 물리, 지능은 마법.<br />기민·체질·정신·행운으로 전투의 빈틈을 채우세요.</p>
    </div>
    <div className="build-columns">
    <section className="panel attribute-panel">
    <div className="section-title">
    <h2>기본 능력치</h2>
    <span>기본 + 성장 + 직접 투자</span>
    </div>{ATTRIBUTES.map(attr => <div className="attribute-row" key={attr.id}>
        <div className="attribute-code">{attr.code}</div>
        <div className="attribute-copy">
        <h3>{attr.name}<strong>{v[attr.id]}</strong>
        </h3>
        <p>{attr.description}</p>
        <small>직접 투자 {s.attributes[attr.id]}포인트</small>
        </div>
        <div className="attribute-buttons">
        <button className="secondary small" aria-label={`${attr.name} 1 증가`} disabled={busy || s.statPoints < 1} onClick={() => send({ type: 'attribute', id: attr.id, value: '1' })}>+1</button>
        <button className="secondary small" aria-label={`${attr.name} 5 증가`} disabled={busy || s.statPoints < 5} onClick={() => send({ type: 'attribute', id: attr.id, value: '5' })}>+5</button>
        {s.skipStatConfirm ? <button className="secondary" disabled={busy || s.statPoints < 1} title={`${attr.name}에 남은 ${s.statPoints}포인트를 모두 투자합니다(설정에서 확인 창을 다시 켤 수 있습니다).`} onClick={() => send({ type: 'attribute', id: attr.id, value: 'max' })}>최대</button> : <ConfirmButton label="최대" title={`${attr.name}에 남은 ${s.statPoints}포인트를 모두 투자할까요?`} description={`${attr.description}. 재분배는 무료지만 자동 낚시 중에는 할 수 없습니다.`} confirmLabel="모두 투자" disabled={busy || s.statPoints < 1} onConfirm={() => send({ type: 'attribute', id: attr.id, value: 'max' })}/>}
        </div>
        </div>)}</section>
    <section className="panel derived-panel">
    <div className="section-title">
    <h2>최종 전투 능력치</h2>
    <span>직업·장비·스킬 포함</span>
    </div>
    <div className="derived-grid">{CORE_STATS.map(key => <StatBreakdown key={key} k={key} value={a[key]} trace={trace} wide={['hp', 'speed', 'crit'].includes(key)}/>)}</div>
    <p className="footnote stat-breakdown-hint">능력치를 누르면 기본·배분·직업·스킬·환생·연구·도감·장비별 기여를 볼 수 있습니다.</p>
    <details className="derived-details"><summary>상세 능력치</summary><div className="derived-grid">{DETAIL_STATS.filter(key => key === 'harmony' ? s.job === 'allRounder' || s.skills.includes('harmonicWeight') : OPTIONAL_STATS.has(key) ? (a[key] || 0) > 0 : true).map(key => <StatBreakdown key={key} k={key} value={a[key]} trace={trace}/>)}</div></details>
    <div className="derived-summary">
    <span>장비 드롭 확률 (처치당)<strong>{percent(dropRate(s), 2)}</strong>
    </span>
    <span>골드 획득 배율<strong>×{goldMultiplier(s).toFixed(2)}</strong>
    </span>
    <span>경험치 획득 배율<strong>×{expMultiplier(s).toFixed(2)}</strong></span>
    <span>스킬 장착 AP<strong>{apUsed(s)} / {apCapacity(s)}</strong>
    </span>
    <span title={`처치할 때마다 최대 체력의 ${percent(victoryHealRate(s))}${s.skills.includes('firstAid') && canUse(s, 'firstAid') ? ` + 응급처치 ${percent(FIRST_AID_HEAL)}` : ''}만큼 회복합니다(연구 ‘회복’ 1단계마다 +1%p). 던전에서는 ${percent(MONSTER_TUNING.dungeonHealAfterKill)} 기준입니다.`}>처치 후 회복 (승리당)<strong>{percent(victoryHealRate(s) + (s.skills.includes('firstAid') && canUse(s, 'firstAid') ? FIRST_AID_HEAL : 0))} · {victoryHeal(s).toLocaleString()} HP</strong>
    </span>
    </div>
    </section>
    </div>
    </>;
}
export { Classes } from './classes-panel';
export { Skills } from './skills-panel';
