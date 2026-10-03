'use client';
import { ConfirmButton } from './confirm-button';
import { RefreshCw, Target } from 'lucide-react';
import { ATTRIBUTES, PROGRESSION, CORE_STATS, DETAIL_STATS, OPTIONAL_STATS, percent } from '@/game/data/progression';
import { attributes, apCapacity, apUsed } from '@/game/systems/progression';
import { victoryHeal, victoryHealRate } from '@/game/systems/encounter';
import { masteryMultipliers } from '@/game/systems/mastery';
import { VARIANTS, VARIANT_BOOK_MIN, variantChances } from '@/game/data/variants';
import {MONSTER_TUNING, BALANCE } from '@/game/data/balance';
import { StatBreakdown } from './stat-breakdown';
import { type StatTrace, stats, dropRate, goldMultiplier, expMultiplier } from '@/game/systems/stats';
import { Heading } from './shared';
import { TITLES, unlockedTitles, displayTitle, titleById } from '@/game/data/titles';
import type { PanelProps } from './panel-props';
export function Character({ s, send, busy }: PanelProps) {
    const trace: StatTrace = {}, a = stats(s, trace), v = attributes(s);
    return <>
    <Heading eyebrow="CHARACTER BUILD" title="어떤 낚시꾼이 될 것인가" description={`기본 능력치는 전직 조건과 전투 특성을 함께 결정합니다. 레벨마다 ${PROGRESSION.statPerLevel}포인트를 직접 배분하세요.`}>
    <ConfirmButton icon={<RefreshCw size={15}/>} confirmLabel="초기화" title="능력치를 재분배할까요?" description="투자한 포인트를 전부 돌려받습니다. 전직 해금 기록은 유지되며 체력·마나는 새 최대값을 초과할 수 없습니다." disabled={busy || s.running} onConfirm={() => send({ type: 'resetAttributes' })} label="무료 재분배"/>
    </Heading>
    <section className="panel port-resource-bar build-resource-bar">
    <div><Target size={22}/><span>남은 능력치 포인트<strong>{s.statPoints} <small>P</small></strong></span></div>
    <div><span>직접 투자한 포인트<strong>{Object.values(s.attributes).reduce((a, n) => a + n, 0)}</strong></span></div>
    <div><span>레벨마다<strong>+{PROGRESSION.statPerLevel} <small>P</small></strong></span></div>
    </section>
    {(() => { const owned = new Set(unlockedTitles(s).map(t => t.id)), current = displayTitle(s), chosen = titleById(s.title); return <details className="panel title-panel"><summary><h2>칭호</h2><span>{current ? `표시 중 · ${current}` : '표시 안 함'} · {owned.size} / {TITLES.length} 획득 · 업적을 달성하면 얻습니다</span></summary>
        <div className="title-actions"><button type="button" className={s.title === undefined ? 'primary small' : 'secondary small'} disabled={busy} onClick={() => send({ type: 'title', id: 'auto' })}>자동(최근 획득)</button><button type="button" className={s.title === null ? 'primary small' : 'secondary small'} disabled={busy} onClick={() => send({ type: 'title', id: 'none' })}>표시 안 함</button></div>
        <div className="title-list">{TITLES.map(t => { const got = owned.has(t.id), on = chosen?.id === t.id; return <div key={t.id} className={`title-row ${got ? 'owned' : 'locked'} ${on ? 'on' : ''}`}><span className="title-name"><small className="rebirth-title">{t.name}</small></span><span className="title-desc">{t.group} · {t.desc}</span>{got ? <button type="button" className={on ? 'primary small' : 'secondary small'} disabled={busy || on} onClick={() => send({ type: 'title', id: t.id })}>{on ? '장착 중' : '장착'}</button> : <span className="title-locked">미획득</span>}</div>; })}</div>
    </details>; })()}
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
    <div className="derived-grid">{CORE_STATS.map(key => <StatBreakdown key={key} k={key} value={a[key]} trace={trace} wide={['hp', 'speed'].includes(key)}/>)}</div>
    <p className="footnote stat-breakdown-hint">능력치를 누르면 기본·배분·직업·스킬·환생·연구·도감·장비별 기여를 볼 수 있습니다.</p>
    <details className="derived-details"><summary>상세 능력치</summary><div className="derived-grid">{DETAIL_STATS.filter(key => key === 'harmony' ? s.job === 'allRounder' || s.skills.includes('harmonicWeight') : OPTIONAL_STATS.has(key) ? (a[key] || 0) > 0 : true).map(key => <StatBreakdown key={key} k={key} value={a[key]} trace={trace}/>)}</div></details>
    <div className="derived-summary">
    <span>장비 드롭 확률 (포획당)<strong>{percent(dropRate(s), 2)}</strong>
    </span>
    <span>골드 획득 배율<strong>×{goldMultiplier(s).toFixed(2)}</strong>
    </span>
    {(() => { const c = variantChances(s), total = VARIANTS.reduce((a, v) => a + c[v.id], 0), golden = a.goldenFind || 0; return <span title={`낚시터에서 어종을 ${VARIANT_BOOK_MIN}회 이상 포획한 뒤부터 입질마다 변종을 판정합니다. ${VARIANTS.map(v => `${v.mark} ${v.name} ${percent(c[v.id], 1)}`).join(' · ')}. 황금 개체는 포획 순간 따로 판정(${percent(golden, 1)}). 해초림 테마 +10%, 난파선 수집가 계보 패시브가 변종 조우 확률을 올립니다(현재 +${percent(a.variantFind || 0, 0)}).`}>변종 조우 확률 (포획당)<strong>{percent(total, 1)}{golden ? ` · 황금 ${percent(golden, 1)}` : ''}</strong></span>; })()}
    <span>경험치 획득 배율<strong>×{expMultiplier(s).toFixed(2)}</strong></span>
    {(() => { const m = masteryMultipliers(s), parts = [m.base > 1 ? `깊은 항해 기본 +${m.base}` : `기본 +${m.base}`, m.tide !== 1 && `해역 난이도 ×${m.tide.toFixed(2)}`, m.research !== 1 && `숙련의 기억·계정 어종 ×${m.research.toFixed(2)}`, m.focus !== 1 && `계열 집중 ×${m.focus}`, m.event !== 1 && `이벤트 ×${m.event}`].filter(Boolean); return <span title={`포획할 때마다 현재 직업과 장착 스킬의 숙련이 오릅니다. ${parts.join(' · ')}${s.dungeon ? ' · 던전에서는 해역 난이도 배율이 적용되지 않습니다' : ''}. 조건부 숙련 스킬 보너스(지정 적 포획 시)와 무리 마릿수는 별도로 더해집니다.`}>숙련 획득 (포획당)<strong>+{m.base} · ×{m.total.toFixed(2)} ≈ {(m.base * m.total).toFixed(1)}</strong></span>; })()}
    <span>스킬 장착 AP<strong>{apUsed(s)} / {apCapacity(s)}</strong>
    </span>
    <span title={`포획할 때마다 최대 체력의 ${percent(victoryHealRate(s))}만큼 회복합니다. 기본 ${percent(BALANCE.healAfterKill)}에서 해역 난이도 1마다 ${percent(BALANCE.healAfterKillTierDecay)}p씩 줄고(최저 ${percent(BALANCE.healAfterKillMin)}), 연구 ‘잔잔한 물결’ 1단계마다 +1%p. 던전에서는 ${percent(MONSTER_TUNING.dungeonHealAfterKill)} 고정입니다.`}>포획 후 회복 (포획당)<strong>{percent(victoryHealRate(s))} · {victoryHeal(s).toLocaleString()} HP</strong>
    </span>
    </div>
    </section>
    </div>
    </>;
}
export { Classes } from './classes-panel';
export { Skills } from './skills-panel';
