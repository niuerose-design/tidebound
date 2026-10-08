'use client';
import { ConfirmButton } from './confirm-button';
import { ChevronDown, RefreshCw, Target } from 'lucide-react';
import { ATTRIBUTES, PROGRESSION, CORE_STATS, DETAIL_STATS, OPTIONAL_STATS, percent } from '@/game/data/progression';
import { attributes, apCapacity, apUsed, apSources } from '@/game/systems/progression';
import { victoryHeal, victoryHealRate } from '@/game/systems/encounter';
import { masteryMultipliers } from '@/game/systems/mastery';
import { RANK_PERKS, rankTitle, rankPerkLevel, rankPerkValue } from '@/game/data/rank';
import { VARIANTS, VARIANT_BOOK_MIN, variantChances } from '@/game/data/variants';
import {MONSTER_TUNING, BALANCE } from '@/game/data/balance';
import { StatBreakdown } from './stat-breakdown';
import { type StatTrace, stats, dropRate, goldMultiplier, expMultiplier, focusGold, focusExp } from '@/game/systems/stats';
import { roughReward, restraintExp } from '@/game/systems/vows';
import { sproutExp, sproutCount } from '@/game/data/sprout';
import { ascensionEarlyExp } from '@/game/data/ascension';
import { accountExpGold } from '@/game/data/account';
import { tailwindActive, tailwindExp, encounterTier } from '@/game/systems/meta';
import { Heading } from './shared';
import type { PanelProps } from './panel-props';
import type { State } from '@/game/types';
import { catalogNow } from '@/game/data/catalog';
/** 상세 능력치의 숙련도 획득 보너스. 펼치면 배율별 기여와 처치당 기대 숙련을 보여줍니다. */
function MasteryBreakdown({ s }: { s: State }) {
    const m = masteryMultipliers(s), x = (n: number) => `×${n.toFixed(2)}`, drill = rankPerkLevel(s, 'drill');
    /** v27.85 기본 획득을 구성 요소로 나눠 보여 줍니다. v3.107 계급 특전 숙련 훈련은 배율 밖의 고정값이라 배율을 곱한 뒤에 더합니다. */
    const rows: [string, string][] = [['기본 획득', `+${m.base - drill}`], ['끝없는 수련 · 계정 몬스터', x(m.research)], ...(m.focus !== 1 ? [['계열 집중', x(m.focus)] as [string, string]] : []), ...(m.event !== 1 ? [['이벤트', x(m.event)] as [string, string]] : []), ...(drill ? [[`계급 특전 · 숙련 훈련 ${drill}단계 (배율 밖)`, `+${drill}`] as [string, string]] : [])];
    return <details className="stat-breakdown">
        <summary><span>숙련도 획득<ChevronDown size={12} className="stat-breakdown-chevron"/></span><strong>처치당 ≈ {m.perKill.toFixed(1)}</strong></summary>
        <ul>{rows.map(([label, value]) => <li key={label}><span>{label}</span><b>{value}</b></li>)}
            <li className="stat-breakdown-total"><span>계산식</span><b>{m.base - drill} × {m.total.toFixed(2)}{drill ? ` + ${drill}` : ''} ≈ {m.perKill.toFixed(1)}</b></li></ul>
        <p className="stat-note">처치할 때마다 현재 직업과 장착 스킬의 숙련이 오릅니다. 조건부 숙련 스킬 보너스(지정 적 처치 시)와 무리 마릿수는 따로 더해집니다.</p>
    </details>;
}
/** v27.85 계급 특전 요약: 무엇을 몇 단계 켰고 실제로 얼마가 적용되는지. 특전이 없으면 안내만 보입니다. */
function RankPerkBreakdown({ s }: { s: State }) {
    const active = RANK_PERKS.map(p => ({ p, level: rankPerkLevel(s, p.id) })).filter(x => x.level > 0);
    const value = (id: typeof RANK_PERKS[number]['id'], level: number) => id === 'tally' ? `처치 1마리 = 계급 경험치 ${1 + level}마리` : id === 'drill' ? `처치 숙련 +${level} (고정)` : `${(rankPerkValue(s, id) * 100).toFixed(1)}% (${id === 'medal' ? 'SP' : '세계석'} +1 · 사냥터만)`;
    return <details className="stat-breakdown">
        <summary><span>계급 특전 · {rankTitle(s)}<ChevronDown size={12} className="stat-breakdown-chevron"/></span><strong>{active.length ? `${active.reduce((a, x) => a + x.level, 0)}P 적용` : '없음'}</strong></summary>
        <ul>{active.map(({ p, level }) => <li key={p.id}><span>{p.name} {level}단계</span><b>{value(p.id, level)}</b></li>)}</ul>
        <p className="stat-note">{active.length ? '숙련 훈련은 위 숙련도 획득에 배율과 따로 더해집니다(계열 집중 · 이벤트 · 연구 · 승천 배율을 받지 않음). 전공 훈장·보급품은 던전에서는 발동하지 않습니다.' : '치장 → 계급에서 진급 포인트로 특전을 켜면 여기에 적용값이 보입니다.'}</p>
    </details>;
}
export function Character({ s, send, busy }: PanelProps) {
    // v3.49 정보 비공개(10.2-7): 켜져 있으면 드롭·변종 확률 대신 보너스만 보여 줍니다.
    const trace: StatTrace = {}, a = stats(s, trace), v = attributes(s), secret = catalogNow().secret;
    return <>
    <Heading eyebrow="CHARACTER BUILD" title="어떤 모험가가 될 것인가" description={`기본 능력치는 전직 조건과 전투 특성을 함께 결정합니다. 레벨마다 ${PROGRESSION.statPerLevel}포인트를 직접 배분하세요.`}>
    <ConfirmButton icon={<RefreshCw size={15}/>} confirmLabel="초기화" title="능력치를 재분배할까요?" description="투자한 포인트를 전부 돌려받습니다. 전직 해금 기록은 유지되며 체력·마나는 새 최대값을 초과할 수 없습니다." disabled={busy || s.running} onConfirm={() => send({ type: 'resetAttributes' })} label="무료 재분배"/>
    </Heading>
    <section className="panel port-resource-bar build-resource-bar">
    <div><Target size={22}/><span>남은 능력치 포인트<strong>{s.statPoints} <small>P</small></strong></span></div>
    <div><span>직접 투자한 포인트<strong>{Object.values(s.attributes).reduce((a, n) => a + n, 0)}</strong></span></div>
    <div><span>레벨마다<strong>+{PROGRESSION.statPerLevel} <small>P</small></strong></span></div>
    </section>
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
        {s.skipStatConfirm ? <button className="secondary" disabled={busy || s.statPoints < 1} title={`${attr.name}에 남은 ${s.statPoints}포인트를 모두 투자합니다(설정에서 확인 창을 다시 켤 수 있습니다).`} onClick={() => send({ type: 'attribute', id: attr.id, value: 'max' })}>최대</button> : <ConfirmButton label="최대" title={`${attr.name}에 남은 ${s.statPoints}포인트를 모두 투자할까요?`} description={`${attr.description}. 재분배는 무료지만 자동 사냥 중에는 할 수 없습니다.`} confirmLabel="모두 투자" disabled={busy || s.statPoints < 1} onConfirm={() => send({ type: 'attribute', id: attr.id, value: 'max' })}/>}
        </div>
        </div>)}</section>
    <section className="panel derived-panel">
    <div className="section-title">
    <h2>최종 전투 능력치</h2>
    <span>직업·장비·스킬 포함</span>
    </div>
    <div className="derived-grid">{CORE_STATS.map(key => <StatBreakdown key={key} k={key} value={a[key]} trace={trace}/>)}</div>
    <p className="footnote stat-breakdown-hint">능력치를 누르면 기본·배분·직업·스킬·환생·연구·도감·장비별 기여를 볼 수 있습니다.</p>
    <details className="derived-details"><summary>상세 능력치</summary><div className="derived-grid">{DETAIL_STATS.filter(key => key === 'harmony' ? false /* v3.163 올라운더 삭제: 조화 기준값을 쓰는 직업이 없음 */ : OPTIONAL_STATS.has(key) ? (a[key] || 0) > 0 : true).flatMap(key => [<StatBreakdown key={key} k={key} value={a[key]} trace={trace} event={key === 'expBonus' ? s.event?.exp ?? 1 : key === 'goldBonus' ? s.event?.gold ?? 1 : key === 'dropBonus' ? s.event?.drop ?? 1 : 1} eventNote={key === 'dropBonus' ? '드롭 확률 전체에 곱함' : undefined} final={key === 'goldBonus' ? `골드 획득 배율 ×${goldMultiplier(s).toFixed(2)} = (1 + ${percent(a.goldBonus || 0, 0)}) × 계정 ${accountExpGold(s).toFixed(2)} × 힘의 길 ${roughReward(s, encounterTier(s)).toFixed(2)} × 집중 ${focusGold(s).toFixed(2)} × 이벤트 ${(s.event?.gold || 1).toFixed(2)}` : key === 'expBonus' ? `경험치 획득 배율 ×${expMultiplier(s).toFixed(2)} = (1 + ${percent(a.expBonus || 0, 0)}${tailwindActive(s) ? ` + 순풍 ${percent(tailwindExp(s), 0)}` : ''}) × 계정 ${accountExpGold(s).toFixed(2)} × 집중 ${focusExp(s).toFixed(2)} × 절제 ${(1 + restraintExp(s)).toFixed(2)} × 새싹 ${sproutExp(sproutCount(s)).toFixed(2)}${ascensionEarlyExp(s) > 1 ? ` × 승천 초반 ${ascensionEarlyExp(s)}` : ''} × 이벤트 ${(s.event?.exp || 1).toFixed(2)}` : key === 'dropBonus' && !secret ? `처치당 드롭 확률 ${percent(dropRate(s), 2)} = 기본 ${percent(BALANCE.dropChance, 2)} × (1 + ${percent((a.dropBonus || 0) / BALANCE.dropBonusScale, 0)}) × 힘의 길 ${roughReward(s, encounterTier(s)).toFixed(2)} × 이벤트 ${(s.event?.drop || 1).toFixed(2)}${dropRate(s) >= BALANCE.dropChanceCap ? ` (상한 ${percent(BALANCE.dropChanceCap, 1)})` : ''}` : undefined}/>, ...(key === 'critDamage' ? [<MasteryBreakdown key="mastery" s={s}/>, <RankPerkBreakdown key="rankPerks" s={s}/>] : [])])}</div></details>
    <div className="derived-summary">
    {secret ? <span title="기본 드롭 확률은 공개하지 않습니다. 보너스가 클수록 장비가 자주 떨어지고, 구성(행운·물건도감·연구·스킬·장비)은 상세 능력치의 ‘장비 드롭 보너스’에서 봅니다.">장비 드롭 보너스<strong>+{percent(a.dropBonus || 0, 0)}</strong></span>
    : <span title={`기본 ${percent(BALANCE.dropChance, 2)} × (1 + 장비 드롭 보너스 ÷ ${BALANCE.dropBonusScale}) × 서약·이벤트. 상한 ${percent(BALANCE.dropChanceCap, 1)}. 보너스의 구성(행운·물건도감·연구·스킬·장비)은 상세 능력치의 ‘장비 드롭 보너스’에서 봅니다.`}>장비 드롭 확률 (처치당)<strong>{percent(dropRate(s), 2)}{dropRate(s) >= BALANCE.dropChanceCap ? ' (상한)' : ''}</strong>
    </span>}
    <span title="상세 능력치의 ‘골드 획득 보너스’에서 계산식을 봅니다.">골드 획득 배율<strong>×{goldMultiplier(s).toFixed(2)}</strong>
    </span>
    {secret ? <span title={`사냥터에서 몬스터를 ${VARIANT_BOOK_MIN}회 이상 처치한 뒤부터 출현마다 변종을 만날 수 있습니다. 확률은 공개하지 않습니다. 버섯숲 연못 테마와 섀도어 계보 패시브가 변종 조우를 늘립니다.`}>변종 조우 보너스<strong>+{percent(a.variantFind || 0, 0)}</strong></span> : (() => { const c = variantChances(s), total = VARIANTS.reduce((a, v) => a + c[v.id], 0), golden = a.goldenFind || 0; return <span title={`사냥터에서 몬스터를 ${VARIANT_BOOK_MIN}회 이상 처치한 뒤부터 출현마다 변종을 판정합니다. ${VARIANTS.map(v => `${v.mark} ${v.name} ${percent(c[v.id], 1)}`).join(' · ')}. 황금 개체는 처치 순간 따로 판정(${percent(golden, 1)}). 버섯숲 연못 테마 +10%, 섀도어 계보 패시브가 변종 조우 확률을 올립니다(현재 +${percent(a.variantFind || 0, 0)}).`}>변종 조우 확률 (처치당)<strong>{percent(total, 1)}{golden ? ` · 황금 ${percent(golden, 1)}` : ''}</strong></span>; })()}
    <span title="상세 능력치의 ‘경험치 획득 보너스’에서 계산식을 봅니다.">경험치 획득 배율<strong>×{expMultiplier(s).toFixed(2)}</strong></span>
    <details className="ap-breakdown"><summary><span>스킬 장착 AP<strong>{apUsed(s)} / {apCapacity(s)}</strong></span></summary>
    <dl>{apSources(s).filter(x => x.value).map(x => <div key={x.id}><dt>{x.label}</dt><dd className={x.value < 0 ? 'negative' : ''}>{x.value > 0 ? '+' : ''}{x.value}</dd></div>)}</dl>
    </details>
    <span title={`처치할 때마다 최대 체력의 ${percent(victoryHealRate(s))}만큼 회복합니다. 기본 ${percent(BALANCE.healAfterKill)}이 사냥터 난이도가 오를수록 줄어듭니다(난이도 10에서 절반, 최저 ${percent(BALANCE.healAfterKillMin)}), 연구 ‘처치 회복 강화 I’ 1단계마다 +1%p. 던전에서는 ${percent(MONSTER_TUNING.dungeonHealAfterKill)} 고정입니다.`}>처치 후 회복 (처치당)<strong>{percent(victoryHealRate(s))} · {victoryHeal(s).toLocaleString()} HP</strong>
    </span>
    </div>
    </section>
    </div>
    </>;
}
