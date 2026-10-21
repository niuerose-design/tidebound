'use client';
/**
 * v3.385 스킬 카드(새 토대). 옛 skills-panel SkillCard 의 규칙(습득 · 계승 · 장착 · 한계돌파 · 초월 · 극한돌파 · 성장표)은 그대로이고 모양만 토큰 · 조각으로.
 * 검색 · 필터로 목록이 다시 그려져도 같은 상태의 카드는 다시 계산하지 않습니다(memo).
 */
import { memo } from 'react';
import { Eye, EyeOff, Info, Pin } from 'lucide-react';
import type { Skill, State, Action } from '@/game/types';
import { Button } from '@/components/ui/button';
import { StatBar, RichTooltip, ConfirmAction, formatExact } from '@/components/ui/game';
import { SkillIcon } from '@/components/game/shared';
import { cn } from '@/lib/utils';
import { PROGRESSION } from '@/game/data/progression';
import { EXTREME_STAGES, EXTREME_FINAL_DAMAGE } from '@/game/data/long-term';
import { jobById } from '@/game/data/classes';
import { skillById } from '@/game/data/skills';
import { loadoutSkillAP, lineage, refinePractice, extremeBreakTarget, extremeStage, extremeFinalMultiplier, apCapacity, apUsed, canUse, canInheritSkill, canSpendSkill, effectiveSkill, inherited, masteryMilestonesFor, maxSkillLevel, skillLevel, skillMastery, skillRankHint, validLoadout, skillUnlockReady, masteryGainBonus, skillVeiled, skillBlockReason, skillExclusiveLabel, exclusiveAccess, limitBreakOf, limitBreakOwned, limitBreakNext, passiveGrowthBonus, coreTranscendTargets, coreTranscendOf, CORE_TRANSCEND } from '@/game/systems/progression';
import { hanjaReading, skillGrowthStages, skillEffectLines, skillBonusText, skillPercent, skillBrief, skillExtraNotes } from '@/game/systems/skill-description';
import { masteryConditionText } from '@/game/systems/mastery';
import { enemySkillById } from '@/game/data/encounters';
import { Fold } from '@/components/features/codex/parts';

type Send = (a: Action) => void;
const fmt = formatExact;
const chip = (tone?: 'ok' | 'warn' | 'gold' | 'danger') => cn('inline-flex items-center rounded-s border px-1.5 py-0.5 text-xs leading-tight', tone === 'ok' ? 'border-ok/40 bg-ok/10 text-ok' : tone === 'warn' ? 'border-warn/40 bg-warn/10 text-warn' : tone === 'gold' ? 'border-gold-ink/50 bg-gold-ink/10 text-gold-ink' : tone === 'danger' ? 'border-danger/40 bg-danger/10 text-danger' : 'border-line bg-surface-3 text-ink-2');

function MarkButtons({ pinned, hidden, onPin, onHide, name, disabled }: { pinned: boolean; hidden: boolean; onPin: () => void; onHide: () => void; name: string; disabled: boolean }) {
    return <span className="flex shrink-0 items-center gap-0.5">
        <Button type="button" size="icon-sm" variant="ghost" className={cn('icon-button', pinned && 'text-gold-ink')} disabled={disabled} aria-pressed={pinned} aria-label={`${name} ${pinned ? '즐겨찾기 해제' : '즐겨찾기'}`} title={pinned ? '즐겨찾기 해제' : '즐겨찾기에 고정'} onClick={onPin}><Pin size={14}/></Button>
        <Button type="button" size="icon-sm" variant="ghost" className={cn('icon-button', hidden && 'text-warn')} disabled={disabled} aria-pressed={hidden} aria-label={`${name} ${hidden ? '숨김 해제' : '숨기기'}`} title={hidden ? '숨김 해제' : '목록에서 숨기기 (장착 중 · 검색 · 숨김 탭에는 보임)'} onClick={onHide}>{hidden ? <Eye size={14}/> : <EyeOff size={14}/>}</Button>
    </span>;
}

export const SkillCard = memo(function SkillCard({ sk, s, send, busy, detailed, pinned = false, hidden = false }: { sk: Skill; s: State; send: Send; busy: boolean; detailed: boolean; pinned?: boolean; hidden?: boolean }) {
    const marks = <MarkButtons pinned={pinned} hidden={hidden} disabled={busy} name={sk.name} onPin={() => send({ type: 'pinSkill', id: sk.id })} onHide={() => send({ type: 'hideSkill', id: sk.id })}/>;
    const rank = s.learned[sk.id] || 0, acquired = rank > 0;
    const practice = s.skillPractice[sk.id] || 0, mastery = skillMastery(s, sk.id);
    const level = skillLevel(sk, rank || 1, mastery), max = maxSkillLevel(sk), milestones = masteryMilestonesFor(sk);
    const nextMastery = milestones[mastery], nextGrowth = milestones[level];
    const effective = effectiveSkill(sk, rank || 1, mastery), cost = loadoutSkillAP(s, sk.id, s.skills.includes(sk.id) ? s.skills : [...s.skills, sk.id]);
    const equipped = s.skills.includes(sk.id), usable = canUse(s, sk.id), isInherited = inherited(s, sk.id), paidInheritance = !!s.skillInheritances[sk.id];
    const unlockText = sk.unlockAfter && skillMastery(s, sk.unlockAfter.skill) < sk.unlockAfter.level ? `${skillById(sk.unlockAfter.skill)?.name || ''} 숙련 Lv.${sk.unlockAfter.level} 필요` : !skillUnlockReady(s, sk) ? `직업 숙련 ${sk.unlockJobMastery!.toLocaleString()} 필요` : sk.job !== s.job ? '전직 필요' : s.rebirths < (sk.rebirth || 0) ? `환생 ${sk.rebirth}회 필요` : `Lv.${sk.level}에 자동 해금`;
    const inheritanceText = !acquired ? unlockText : !sk.job ? '공용' : isInherited ? (mastery > 0 ? '숙련 계승' : 'SP 계승') : sk.job === s.job ? '현재 직업 전용' : '계승 필요';
    const hint = skillRankHint(sk, rank || 1, mastery), effects = skillEffectLines(effective, level);
    const growthNow = sk.type === 'passive' ? passiveGrowthBonus(s, sk) : {}, growing = new Set(Object.keys(growthNow));
    const passiveChips: Record<string, number> = sk.disguise ? {} : { ...(effective.bonus || {}) as Record<string, number> };
    if (!sk.disguise) for (const [key, n] of Object.entries(growthNow)) passiveChips[key] = (passiveChips[key] || 0) + n;
    const extraNotes = [...skillExtraNotes(sk), ...(sk.type === 'passive' && !Object.keys(passiveChips).length && sk.desc && !skillExtraNotes(sk).length ? [sk.desc] : [])];
    const growth = detailed ? skillGrowthStages(sk) : [];
    const extremeTarget = extremeBreakTarget(sk), refinePracticeNow = refinePractice(s, sk.id), extremeNow = extremeStage(s, sk.id), extremeNext = EXTREME_STAGES[extremeNow], extremeFx = !!s.extremeFx?.[sk.id];
    const lb = limitBreakOf(s, sk.id), lbOwned = limitBreakOwned(s, sk.id), lbNext = limitBreakNext(s, sk.id);
    const transcendTargets = coreTranscendTargets(sk), transcendNow = coreTranscendOf(s, sk.id), transcendNext = transcendTargets[transcendNow], transcendHome = !sk.job || lineage(sk.job) === lineage(s.job);
    const equipAllowed = validLoadout(s, equipped ? s.skills.filter(id => id !== sk.id) : [...s.skills, sk.id]);
    const apShort = Math.max(0, cost - (apCapacity(s) - apUsed(s)));
    const equipLabel = equipped ? '장착 해제' : !acquired ? unlockText : !usable ? skillBlockReason(s, sk.id).replace(/[.。]$/, '') : !equipAllowed ? `AP ${apShort} 부족` : '장착';
    const masteryBar = acquired ? <StatBar size="s" value={Math.min(practice, nextMastery || milestones[max - 1])} max={nextMastery || milestones[max - 1]} label={detailed ? (level >= max ? '실전 숙련 · 최대 성장 완료' : `실전 숙련 · Lv.${level + 1}까지 ${Math.max(0, nextGrowth - practice).toLocaleString()} 남음 (또는 1 SP)`) : undefined}/> : null;
    const frame = cn('grid content-start gap-2 rounded-l border bg-surface-2 p-3 shadow-1', equipped ? 'border-accent/70' : 'border-line', !acquired && 'opacity-80', hidden && 'border-dashed');
    const head = <header className="flex items-start gap-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-m bg-surface-3"><SkillIcon id={sk.id} size={22}/></span>
        <div className="min-w-0 flex-1"><h3 className="text-s font-semibold text-ink-1" title={hanjaReading(sk.name)}>{sk.name}</h3><div className="text-xs text-ink-3">{jobById(sk.job)?.name || '공용'} · {skillVeiled(s, sk) ? `${sk.type === 'active' ? '액티브' : '패시브'} · 장착 AP ${cost}` : `캐릭터 Lv.${sk.level}${sk.rebirth ? ` · 환생 ${sk.rebirth}회` : ''}`}</div></div>
        {marks}
    </header>;
    const equipButton = <Button type="button" size="sm" variant={equipped ? 'outline' : 'default'} className="min-w-0 max-w-full whitespace-normal text-left" disabled={busy || !usable || !equipAllowed} title={equipped && !equipAllowed ? 'AP를 지원하는 스킬입니다. 다른 기술을 먼저 해제하세요.' : undefined} onClick={() => send({ type: 'skill', id: sk.id })}><span className="min-w-0">{equipLabel}</span></Button>;
    if (skillVeiled(s, sk)) return <article className={frame}>
        {head}
        <p className="text-s text-ink-3">??? · 숙련 Lv.1을 달성하면 효과가 드러납니다.</p>
        <div className="flex justify-between text-xs text-ink-3"><span>{acquired ? '습득' : unlockText}</span><span className="font-num">{nextMastery ? `숙련 ${practice.toLocaleString()} / ${nextMastery.toLocaleString()}` : '숙련 완료'}</span></div>
        {masteryBar}
        <div className="flex flex-wrap gap-2">{equipButton}</div>
    </article>;
    return <article className={frame} title={detailed ? undefined : `${effects.join(' · ')}\n다음 강화: ${hint}`}>
        {head}
        {!detailed && <span className={cn('justify-self-start', chip(equipped && usable ? 'ok' : !acquired || !usable ? undefined : 'gold'))}>{equipped ? (usable ? '장착 중' : '장착 · 사용 불가') : !acquired ? '미습득' : !usable ? (sk.exclusiveLineage && !exclusiveAccess(s, sk) ? '계보 전용' : '계승 필요') : '사용 가능'}</span>}
        {detailed && <dl className="grid grid-cols-3 gap-1 text-xs" aria-label="스킬 상태">{[[acquired, '습득', acquired ? '습득' : '미습득'], [!sk.job || isInherited && !sk.exclusiveLineage, '다른 직업', !sk.job ? '공용 · 모든 직업' : sk.exclusiveLineage ? `${skillExclusiveLabel(sk)} · 계보 밖 사용 불가` : isInherited ? '계승 완료' : '계승 필요'], [equipped && usable, '장착', equipped ? (usable ? '장착 중' : '장착 · 사용 불가') : '미장착']].map(([on, k, v]) => <div key={String(k)} className={cn('rounded-s px-2 py-1', on ? 'bg-accent-soft text-ink-1' : 'bg-surface-3 text-ink-3')}><dt className="text-[11px] text-ink-3">{k}</dt><dd>{v}</dd></div>)}</dl>}
        {detailed && <div className="flex flex-wrap items-center gap-2 text-s"><strong className="text-ink-1">{acquired ? `성장 Lv.${level}` : '미해금'} <span className="text-xs font-normal text-ink-3">/ 최대 {max}{lb > 0 ? ` · 한계돌파 ${lb}단계` : ''}{acquired ? ` · SP Lv.${Math.min(max, Math.max(0, rank - 1))} · 숙련 Lv.${Math.min(max, mastery - lb)} 중 높은 값` : ''}</span></strong>{!acquired && <span className="text-xs text-ink-3">{inheritanceText}</span>}
            <RichTooltip title={`성장 Lv.${level} / ${max}`} effects={effects} source={`다음 강화: ${hint}`}><Button type="button" size="icon-sm" variant="ghost" className="icon-button" aria-label={`${sk.name} 현재 효과와 다음 강화`}><Info size={15}/></Button></RichTooltip></div>}
        {!detailed && <p className="text-s leading-relaxed text-ink-2">{sk.disguise || sk.desc || skillBrief(sk)}</p>}
        {sk.id === 'rareSense' && <p className="text-xs text-ink-3">몬스터 출현률과 장비 등급 확률은 바뀌지 않습니다.</p>}
        {sk.unlockJobMastery && (detailed || !acquired) && <p className="text-xs text-ink-3">최초 해금: {jobById(sk.job)?.name} 숙련도 <b className="font-num text-ink-1">{(s.jobMastery[sk.job!] || 0).toLocaleString()} / {sk.unlockJobMastery.toLocaleString()}</b> · 해금 전에는 SP로 구매 · 계승할 수 없습니다.</p>}
        {detailed && sk.sourceEnemySkill && <p className="text-xs text-ink-3">몬스터 원형: {enemySkillById(sk.sourceEnemySkill)?.name}</p>}
        {detailed && sk.masteryGain && <p className="text-xs text-ink-3"><b className="text-ink-1">대상 처치 시 숙련 ×{1 + masteryGainBonus(sk, level)}</b> · {masteryConditionText(sk)} · 현재 직업 · 장착 스킬에 적용 · 가장 높은 보너스 하나만 · 최대 ×10</p>}
        {detailed && masteryBar}
        {!detailed && <div className="flex flex-wrap gap-1">
            <span className={chip(sk.awaken ? 'gold' : undefined)}>{sk.type === 'active' ? (sk.awaken ? '각성 · 턴마다' : '액티브') : '패시브'}</span>
            <span className={chip(cost < 0 ? 'ok' : undefined)}>장착 AP {cost}{cost < 0 ? ` · 여유 +${-cost}` : ''}</span>
            {sk.exclusiveLineage && <span className={chip('warn')} title="이 계보 직업일 때만 장착 · 효과. 계승해도 다른 계보에서는 못 씁니다.">{skillExclusiveLabel(sk)}</span>}
            {sk.type === 'active' && <><span className={chip()}>발동 {skillPercent(effective.chance)}</span>{sk.hpCost ? <span className={chip()}>체력 {Math.round(sk.hpCost * 100)}%</span> : sk.manaBurn ? <span className={chip()}>마나 {Math.round(sk.manaBurn * 100)}% 연소</span> : <span className={chip()}>마나 {effective.manaCost ?? 0}</span>}</>}
            {sk.type === 'passive' && Object.entries(passiveChips).map(([key, n]) => <span key={key} className={chip(n < 0 ? 'danger' : growing.has(key) ? 'ok' : undefined)} title={growing.has(key) ? '누적 · 환생 비례 수치 포함(지금 기준)' : undefined}>{skillBonusText(key, n)}</span>)}
            {extraNotes.length > 0 && <span className={chip()} title={extraNotes.join('\n')}>기타 · {extraNotes.length}</span>}
        </div>}
        {!detailed && <div className="flex justify-between text-xs text-ink-3"><span>{acquired ? `성장 Lv.${level} / ${max}` : unlockText}</span><span className="font-num">{nextMastery ? `숙련 ${practice.toLocaleString()} / ${nextMastery.toLocaleString()}` : '숙련 완료'}</span></div>}
        {!detailed && masteryBar}
        {detailed && <>
            {sk.condition && <p className={chip('warn')}>{sk.condition === 'wounded' ? '내 체력 70% 이하에서 발동 판정' : sk.condition === 'kkami' ? '숙련의 까미 · 대왕 까미에게만 발동' : sk.condition === 'nuri' ? '경험의 누리 · 대왕 누리에게만 발동' : sk.condition === 'afflicted' ? '내가 상태이상에 걸려 있을 때 발동 판정' : '상대 체력 60% 이상에서 발동 판정'}</p>}
            <div className="overflow-x-auto rounded-m border border-line/60" tabIndex={0} role="region" aria-label={`${sk.name} 단계별 실제 효과`}><table className="w-full min-w-[520px] text-xs"><caption className="px-2 py-1 text-left text-ink-3">기본 성장 효과 · 필요 숙련은 누적 수치 · 기본 Lv.0부터 사용</caption>
                <thead><tr className="bg-surface-3 text-left text-ink-2">{['성장', '필요 숙련', 'AP', ...(sk.type === 'active' ? ['발동', '마나', '대기'] : []), '실제 효과'].map(h => <th key={h} className="px-2 py-1 font-medium">{h}</th>)}</tr></thead>
                <tbody>{growth.map(row => <tr key={row.level} className={cn('border-t border-line/60 align-top', level === row.level && acquired && 'bg-accent-soft/60')}><th className="whitespace-nowrap px-2 py-1 text-left font-semibold text-ink-1">Lv.{row.level}{row.broken ? <span className="ml-1 text-[11px] text-ink-3">돌파 {row.broken}</span> : null}{level === row.level && acquired && <span className="ml-1 text-[11px] text-accent">{sk.attrBonus && mastery !== level ? '현재 AP' : '현재'}</span>}{sk.attrBonus && acquired && mastery !== level && mastery === row.level && <span className="ml-1 text-[11px] text-accent">현재 능력치</span>}</th><td className="px-2 py-1 font-num text-ink-2">{row.practice ? row.practice.toLocaleString() : '기본 해금'}</td><td className={cn('px-2 py-1 font-num', (row.effective.cost || 0) < 0 ? 'text-ok' : 'text-ink-2')}>{row.effective.cost}</td>{sk.type === 'active' && <><td className="px-2 py-1 font-num text-ink-2">{skillPercent(row.effective.chance)}</td><td className="px-2 py-1 font-num text-ink-2">{row.effective.manaCost}</td><td className="px-2 py-1 font-num text-ink-2">{row.effective.cooldown}턴</td></>}<td className="px-2 py-1 text-ink-2">{row.effects.map((text, i) => <span key={i} className="mr-2 inline-block">{text}</span>)}</td></tr>)}</tbody></table></div>
            <p className="text-xs leading-relaxed text-ink-3">{sk.type === 'active' ? '피해식은 상대 방어 · 치명타 · 약화 적용 전입니다. 추가 공격은 각각 명중과 치명타를 판정합니다.' : '능력치 증가량은 직업 · 연구 배율 적용 전입니다. 조건부 숙련 보너스는 가장 높은 하나만 적용됩니다.'} {!sk.job ? '공용 기술은 계승 없이 사용할 수 있습니다.' : `무료 계승: 누적 숙련 ${milestones[0].toLocaleString()}. SP 계승은 숙련도를 올리지 않습니다.`} 숙련 · SP 중 높은 성장 레벨만 적용하며, 다른 직업의 전직 선행조건에는 실전 숙련만 인정됩니다.</p>
        </>}
        {acquired && transcendTargets.length > 0 && <Fold label={`초월 · ${transcendNow ? `${transcendNow}단계 · 핵심 효과 ×${(1 + transcendNow * CORE_TRANSCEND.step).toFixed(1)}${transcendHome ? '' : ' (자기 계보에서만)'}` : lb < PROGRESSION.limitBreak.max ? `한계돌파 ${PROGRESSION.limitBreak.max}단계 뒤` : `숙련 ${fmt(transcendTargets[0])}부터`}`}>
            <p className="text-xs text-ink-3">한계돌파를 다 한 핵심 패시브는 숙련 {transcendTargets.map(n => fmt(n)).join(' · ')}에서 초월 1 · 2단계. 단계마다 핵심 효과 ×{1 + CORE_TRANSCEND.step}, 자기 계보에서만.</p>
            {lb >= PROGRESSION.limitBreak.max && transcendNext !== undefined && <StatBar size="s" value={Math.min(refinePracticeNow, transcendNext)} max={transcendNext} label={`초월 ${transcendNow + 1}단계까지`}/>}
        </Fold>}
        {acquired && extremeTarget !== null && <Fold label={`극한돌파 · ${extremeNow ? `${extremeNow}단계 · 최종 피해 +${Math.round((extremeFinalMultiplier(extremeNow) - 1) * 100)}%` : lb >= PROGRESSION.limitBreak.max ? `숙련 ${refinePracticeNow.toLocaleString()} / ${extremeTarget.toLocaleString()}` : `한계돌파 ${PROGRESSION.limitBreak.max}단계 뒤에 열림`}${extremeFx ? ' · 전용 연출' : ''}`}>
            <p className="text-xs text-ink-3">숙련 {EXTREME_STAGES.map(n => `${n / 1e8}억`).join(' · ')}마다 이 스킬의 최종 피해가 +{Math.round(EXTREME_FINAL_DAMAGE * 100)}%씩(최대 +{Math.round(EXTREME_FINAL_DAMAGE * EXTREME_STAGES.length * 100)}%) 오릅니다. 처음 극한돌파하면 전용 연출(極)이 열리고 승천해도 남습니다. 단계는 승천하면 승천 뒤 쌓은 숙련으로 다시 오릅니다.</p>
            {lb >= PROGRESSION.limitBreak.max && extremeNext !== undefined && <StatBar size="s" value={Math.min(refinePracticeNow, extremeNext)} max={extremeNext} label={`극한 ${extremeNow + 1}단계까지`}/>}
        </Fold>}
        <div className="mt-auto flex flex-wrap gap-2">
            {sk.job && acquired && !isInherited && <ConfirmAction label="계승 · 1 SP" description={`${sk.name}을 다른 직업에서도 사용할 수 있게 합니다. 성장 레벨과 숙련도는 변하지 않습니다. 숙련도 ${milestones[0].toLocaleString()}을 쌓으면 SP 없이도 계승됩니다.`} disabled={busy || !canInheritSkill(s, sk.id) || s.sp < 1} onConfirm={() => send({ type: 'inheritSkill', id: sk.id })}/>}
            {acquired && mastery - lb >= max && lbNext.stage <= PROGRESSION.limitBreak.max && <ConfirmAction label={`한계돌파 ${lbNext.stage}단계 · SP ${lbNext.sp}`} description={lbNext.ok ? `${sk.name} 성장 Lv.${level} → Lv.${level + 1}. 발동 +${Math.round((PROGRESSION.masteryChance + PROGRESSION.limitBreak.chance) * 1000) / 10}%p, 배율 · 패시브 한 단계 더${lbNext.stage >= PROGRESSION.limitBreak.max ? ', 장착 AP -1' : ''}. 환생해도 유지됩니다.` : `조건: ${lbNext.reason}`} disabled={busy || !lbNext.ok} onConfirm={() => send({ type: 'limitBreak', id: sk.id })}/>}
            {acquired && <ConfirmAction label={level >= max ? '최대 레벨' : '강화 · 1 SP'} description={sk.attrBonus ? `${sk.name} 성장 Lv.${level} → Lv.${level + 1}. 능력치 수치는 실전 숙련 단계로만 오르고, SP 강화는 최대 성장(Lv.${max})에 닿을 때 장착 AP를 1 줄이는 데만 쓰입니다. 이 강화만으로 계승되지는 않습니다.` : `${sk.name} 성장 Lv.${level} → Lv.${level + 1}. ${hint} 숙련은 계속 쌓이며 SP와 효과가 중첩되지는 않습니다. 이 강화만으로 계승되지는 않습니다.`} disabled={busy || !canSpendSkill(s, sk.id) || s.sp < 1} onConfirm={() => send({ type: 'learn', id: sk.id })}/>}
            {equipButton}
        </div>
        {acquired && lbOwned > lb && <p className="text-xs text-warn" role="note">한계돌파 {lbOwned}단계를 했지만 세계석 연구 ‘리미터 해제’가 {lb}단계라 {lb}단계까지만 적용됩니다.</p>}
        {acquired && mastery - lb >= max && lbNext.stage <= PROGRESSION.limitBreak.max && !lbNext.ok && <p className="text-xs text-ink-3" role="note">한계돌파 {lbNext.stage}단계 조건: {lbNext.reason}. 장착 여부와 관계없이, 조건을 채우면 버튼이 켜집니다.</p>}
        {paidInheritance && mastery > 0 && detailed && <p className="text-xs text-ink-3">실전 숙련으로 무료 계승도 완료했습니다. SP 투자 환급 시 숙련 계승은 유지됩니다.</p>}
    </article>;
});
