'use client';
/** v3.392 재설계 4단계 여섯째 화면: 능력치(새 토대). 기본 능력치 배분 · 최종 전투 능력치 · 상세 · 요약. 서버 행동은 전과 같습니다. */
import { useState } from 'react';
import { RefreshCw, Target } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { ATTRIBUTES, PROGRESSION, CORE_STATS, DETAIL_STATS, OPTIONAL_STATS, percent } from '@/game/data/progression';
import { apCapacity, apUsed, apSources } from '@/game/systems/progression';
import { victoryHeal, victoryHealRate } from '@/game/systems/encounter';
import { VARIANTS, VARIANT_BOOK_MIN, variantChances } from '@/game/data/variants';
import { MONSTER_TUNING, BALANCE } from '@/game/data/balance';
import { type StatTrace, stats, attributeBreakdown, dropRate, goldMultiplier, expMultiplier, focusGold, focusExp } from '@/game/systems/stats';
import { roughReward, restraintExp } from '@/game/systems/vows';
import { sproutExp, sproutCount } from '@/game/data/sprout';
import { ascensionEarlyExp } from '@/game/data/ascension';
import { accountExpGold } from '@/game/data/account';
import { tailwindActive, tailwindExp, encounterTier } from '@/game/systems/meta';
import { catalogNow } from '@/game/data/catalog';
import { SectionHeader, ChoiceChips, ConfirmAction, FoldSection, NumberTicker, formatExact } from '@/components/ui/game';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { StatRow, MasteryRow, RankPerkRow, FoldRow } from './breakdown';

type Send = (a: Action) => void;
/** v3.292 능력치 찍기 단위(이 기기에 기억). */
const STAT_STEPS = [1, 5, 10, 50, 100] as const, STEP_KEY = 'tb-stat-step';
const readStep = () => { try { const n = Number(localStorage.getItem(STEP_KEY)); return (STAT_STEPS as readonly number[]).includes(n) ? n : 1; } catch { return 1; } };

export function CharacterScreen({ s, send, busy }: { s: State; send: Send; busy: boolean }) {
    const [step, setStepState] = useState(readStep);
    const setStep = (n: number) => { setStepState(n); try { localStorage.setItem(STEP_KEY, String(n)); } catch { /* 저장 못 해도 이번 화면에서는 씀 */ } };
    const put = Math.min(step, s.statPoints);
    // v3.49 정보 비공개: 켜져 있으면 드롭·변종 확률 대신 보너스만 보여 줍니다.
    // v3.326 기본 능력치는 보스 코어 · 수련 패시브 몫까지 더한 값(능력치 효과에 쓰는 값)을 보여 주고, 구성은 줄마다 적습니다.
    const trace: StatTrace = {}, a = stats(s, trace), parts = attributeBreakdown(s), v = parts.total, secret = catalogNow().secret;
    const hasCores = Object.values(parts.cores).some(n => n > 0), hasTraining = Object.values(parts.training).some(n => n > 0);
    const invested = Object.values(s.attributes).reduce((x, n) => x + n, 0);
    return <div className="grid gap-5 text-ink-1">
        <SectionHeader as="h1" eyebrow="CHARACTER BUILD" title="어떤 모험가가 될 것인가" description={`기본 능력치는 전직 조건과 전투 특성을 함께 결정합니다. 레벨마다 ${PROGRESSION.statPerLevel}포인트를 직접 배분하세요.`}
            actions={<ConfirmAction icon={<RefreshCw size={14}/>} label="무료 재분배" title="능력치를 재분배할까요?" description="투자한 포인트를 전부 돌려받습니다. 전직 해금 기록은 유지되며 체력·마나는 새 최대값을 초과할 수 없습니다." confirmLabel="초기화" disabled={busy || s.running} onConfirm={() => send({ type: 'resetAttributes' })}/>}/>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile icon={<Target size={18}/>} label="남은 능력치 포인트"><NumberTicker value={s.statPoints} className="text-xl font-semibold text-accent"/><span className="ml-1 text-xs text-ink-3">P</span></Tile>
            <Tile label="직접 투자한 포인트"><NumberTicker value={invested} className="text-xl font-semibold"/></Tile>
            <Tile label="레벨마다"><span className="font-num text-xl font-semibold text-accent">+{PROGRESSION.statPerLevel}</span><span className="ml-1 text-xs text-ink-3">P</span></Tile>
            {/* v3.242 능력치 자동 배분: 레벨업 포인트를 지금 직접 투자한 비율대로 나눕니다(자리를 비운 동안 · 환생 직후에도). */}
            <Tile label="자동 배분" sub="지금 투자 비율대로"><label className="flex items-center gap-2 text-s"><Switch id="auto-attr" checked={!!s.autoAttr} disabled={busy} onCheckedChange={on => send({ type: 'autoAttr', id: on ? 'on' : 'off' })} aria-label="능력치 자동 배분"/><span>{s.autoAttr ? '켜짐' : '꺼짐'}</span></label></Tile>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <section className="grid content-start gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1" aria-label="기본 능력치">
                <header className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-display text-m font-bold">기본 능력치</h2><small className="text-xs text-ink-3">기본 + 직접 투자{hasCores ? ' + 보스 코어' : ''}{hasTraining ? ' + 수련' : ''}</small></header>
                {/* v3.292 찍기 단위: 줄마다 +1 · +5 대신 고른 단위 한 버튼(남은 포인트가 적으면 남은 만큼). */}
                <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-ink-3">찍기 단위</span><ChoiceChips label="능력치 찍기 단위" value={String(step)} onChange={v => setStep(Number(v))} options={STAT_STEPS.map(n => ({ value: String(n), label: `×${n}` }))}/></div>
                <ul className="grid gap-2">{ATTRIBUTES.map(attr => <li key={attr.id} className="flex items-start gap-3 rounded-m border border-line bg-surface-1 p-3">
                    <span className="w-11 shrink-0 pt-0.5 font-display text-m text-gold-ink">{attr.code}</span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2"><h3 className="text-s font-semibold">{attr.name}</h3><strong className="font-num text-l text-accent">{formatExact(v[attr.id])}</strong></div>
                        <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{attr.description}</p>
                        <small className="text-xs text-ink-3">직접 투자 {s.attributes[attr.id]}포인트{s.devoured?.[attr.id] ? ` · 포식 +${s.devoured[attr.id]}` : ''}{parts.cores[attr.id] ? ` · 보스 코어 +${parts.cores[attr.id].toLocaleString()}` : ''}{parts.training[attr.id] ? ` · 수련 +${parts.training[attr.id].toLocaleString()}` : ''}</small>
                    </div>
                    <div className="grid shrink-0 gap-1.5">
                        <Button type="button" variant="outline" size="sm" className="min-w-14 font-num" aria-label={`${attr.name} ${put || step} 증가`} disabled={busy || s.statPoints < 1} title={s.statPoints > 0 && s.statPoints < step ? `남은 ${s.statPoints}포인트만 투자합니다` : undefined} onClick={() => send({ type: 'attribute', id: attr.id, value: String(put) })}>+{put || step}</Button>
                        {s.skipStatConfirm ? <Button type="button" variant="outline" size="sm" disabled={busy || s.statPoints < 1} title={`${attr.name}에 남은 ${s.statPoints}포인트를 모두 투자합니다(설정에서 확인 창을 다시 켤 수 있습니다).`} onClick={() => send({ type: 'attribute', id: attr.id, value: 'max' })}>최대</Button>
                            : <ConfirmAction label="최대" title={`${attr.name}에 남은 ${s.statPoints}포인트를 모두 투자할까요?`} description={`${attr.description}. 재분배는 무료지만 자동 사냥 중에는 할 수 없습니다.`} confirmLabel="모두 투자" disabled={busy || s.statPoints < 1} onConfirm={() => send({ type: 'attribute', id: attr.id, value: 'max' })}/>}
                    </div>
                </li>)}</ul>
                {(hasCores || hasTraining) && <p className="text-xs leading-relaxed text-ink-3">전직 조건은 보스 코어 몫까지 더한 값으로 봅니다. 수련 몫은 능력치 효과에만 더해지고, 업적(능력치 돌파)은 직접 투자 값(기본 + 투자{Object.values(s.devoured || {}).some(Boolean) ? ' + 포식' : ''})으로 봅니다.</p>}
            </section>
            <section className="grid content-start gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1" aria-label="최종 전투 능력치">
                <header className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-display text-m font-bold">최종 전투 능력치</h2><small className="text-xs text-ink-3">직업·장비·스킬 포함</small></header>
                <div className="grid gap-x-6 sm:grid-cols-2">{CORE_STATS.map(key => <StatRow key={key} k={key} value={a[key]} trace={trace}/>)}</div>
                <p className="text-xs text-ink-3">능력치를 누르면 기본·배분·직업·스킬·환생·연구·도감·장비별 기여를 볼 수 있습니다.</p>
                <FoldSection title="상세 능력치" level={3}>
                    <div className="grid gap-x-6 sm:grid-cols-2">{DETAIL_STATS.filter(key => OPTIONAL_STATS.has(key) ? (a[key] || 0) > 0 : true).flatMap(key => [
                        <StatRow key={key} k={key} value={a[key]} trace={trace} event={key === 'expBonus' ? s.event?.exp ?? 1 : key === 'goldBonus' ? s.event?.gold ?? 1 : key === 'dropBonus' ? s.event?.drop ?? 1 : 1} eventNote={key === 'dropBonus' ? '드롭 확률 전체에 곱함' : undefined}
                            final={key === 'goldBonus' ? `골드 획득 배율 ×${goldMultiplier(s).toFixed(2)} = (1 + ${percent(a.goldBonus || 0, 0)}) × 계정 ${accountExpGold(s).toFixed(2)} × 힘의 길 ${roughReward(s, encounterTier(s)).toFixed(2)} × 집중 ${focusGold(s).toFixed(2)} × 이벤트 ${(s.event?.gold || 1).toFixed(2)}`
                                : key === 'expBonus' ? `경험치 획득 배율 ×${expMultiplier(s).toFixed(2)} = (1 + ${percent(a.expBonus || 0, 0)}${tailwindActive(s) ? ` + 순풍 ${percent(tailwindExp(s), 0)}` : ''}) × 계정 ${accountExpGold(s).toFixed(2)} × 집중 ${focusExp(s).toFixed(2)} × 절제 ${(1 + restraintExp(s)).toFixed(2)} × 새싹 ${sproutExp(sproutCount(s)).toFixed(2)}${ascensionEarlyExp(s) > 1 ? ` × 승천 초반 ${ascensionEarlyExp(s)}` : ''} × 이벤트 ${(s.event?.exp || 1).toFixed(2)}`
                                : key === 'dropBonus' && !secret ? `처치당 드롭 확률 ${percent(dropRate(s), 2)} = 기본 ${percent(BALANCE.dropChance, 2)} × (1 + ${percent((a.dropBonus || 0) / BALANCE.dropBonusScale, 0)}) × 힘의 길 ${roughReward(s, encounterTier(s)).toFixed(2)} × 이벤트 ${(s.event?.drop || 1).toFixed(2)}${dropRate(s) >= BALANCE.dropChanceCap ? ` (상한 ${percent(BALANCE.dropChanceCap, 1)})` : ''}` : undefined}/>,
                        ...(key === 'critDamage' ? [<MasteryRow key="mastery" s={s}/>, <RankPerkRow key="rankPerks" s={s}/>] : [])])}</div>
                </FoldSection>
                <div className="grid gap-1 rounded-m bg-surface-1 p-3 text-s">
                    {secret ? <Line label="장비 드롭 보너스" value={`+${percent(a.dropBonus || 0, 0)}`} hint="기본 드롭 확률은 공개하지 않습니다. 보너스가 클수록 장비가 자주 떨어지고, 구성(행운·물건도감·연구·스킬·장비)은 상세 능력치의 ‘장비 드롭 보너스’에서 봅니다."/>
                        : <Line label="장비 드롭 확률 (처치당)" value={`${percent(dropRate(s), 2)}${dropRate(s) >= BALANCE.dropChanceCap ? ' (상한)' : ''}`} hint={`기본 ${percent(BALANCE.dropChance, 2)} × (1 + 장비 드롭 보너스 ÷ ${BALANCE.dropBonusScale}) × 서약·이벤트. 상한 ${percent(BALANCE.dropChanceCap, 1)}. 보너스의 구성(행운·물건도감·연구·스킬·장비)은 상세 능력치의 ‘장비 드롭 보너스’에서 봅니다.`}/>}
                    <Line label="골드 획득 배율" value={`×${goldMultiplier(s).toFixed(2)}`} hint="상세 능력치의 ‘골드 획득 보너스’에서 계산식을 봅니다."/>
                    {secret ? <Line label="변종 조우 보너스" value={`+${percent(a.variantFind || 0, 0)}`} hint={`사냥터에서 몬스터를 ${VARIANT_BOOK_MIN}회 이상 처치한 뒤부터 출현마다 변종을 만날 수 있습니다. 확률은 공개하지 않습니다. 버섯숲 연못 테마와 섀도어 계보 패시브가 변종 조우를 늘립니다.`}/>
                        : (() => { const c = variantChances(s), total = VARIANTS.reduce((x, vv) => x + c[vv.id], 0); return <Line label="변종 조우 확률 (출현당)" value={percent(total, 1)} hint={`사냥터에서 몬스터를 ${VARIANT_BOOK_MIN}회 이상 처치한 뒤부터 출현마다 변종을 판정합니다. ${VARIANTS.map(vv => `${vv.mark} ${vv.name} ${percent(c[vv.id], 1)}`).join(' · ')}${a.goldenFind ? ` · 황금 조우 보너스 +${percent(a.goldenFind, 0)}` : ''}`}/>; })()}
                    <Line label="경험치 획득 배율" value={`×${expMultiplier(s).toFixed(2)}`} hint="상세 능력치의 ‘경험치 획득 보너스’에서 계산식을 봅니다."/>
                    <FoldRow label="스킬 장착 AP" value={`${apUsed(s)} / ${apCapacity(s)}`} rows={apSources(s).filter(x => x.value).map(x => [x.label, <span key={x.id} className={cn(x.value < 0 && 'text-danger')}>{x.value > 0 ? '+' : ''}{x.value}</span>])} className="border-b-0"/>
                    <Line label="처치 후 회복 (처치당)" value={`${percent(victoryHealRate(s))} · ${victoryHeal(s).toLocaleString()} HP`} hint={`처치할 때마다 최대 체력의 ${percent(victoryHealRate(s))}만큼 회복합니다. 기본 ${percent(BALANCE.healAfterKill)}이 사냥터 난이도가 오를수록 줄어듭니다(난이도 10에서 절반, 최저 ${percent(BALANCE.healAfterKillMin)}), 연구 ‘처치 회복 강화 I’ 1단계마다 +1%p. 던전에서는 ${percent(MONSTER_TUNING.dungeonHealAfterKill)} 고정입니다.`}/>
                </div>
            </section>
        </div>
    </div>;
}
function Tile({ icon, label, sub, children }: { icon?: React.ReactNode; label: string; sub?: string; children: React.ReactNode }) {
    return <div className="flex items-center gap-3 rounded-l border border-line bg-surface-2 p-3 shadow-1">{icon && <span className="text-accent" aria-hidden="true">{icon}</span>}<div className="grid min-w-0 flex-1 gap-0.5"><span className="text-xs text-ink-3">{label}{sub && <small className="ml-1">· {sub}</small>}</span><span className="flex items-baseline">{children}</span></div></div>;
}
function Line({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return <div className="flex items-baseline justify-between gap-3 border-b border-line/60 py-1.5 last:border-b-0" title={hint}><span className="text-ink-2">{label}</span><strong className="text-right font-num text-ink-1">{value}</strong></div>;
}
