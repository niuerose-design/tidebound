'use client';
import type { PanelProps } from './panel-props';
import { ConfirmButton } from './confirm-button';
import { PROGRESSION } from '@/game/data/progression';
import { EXTREME_STAGES, EXTREME_FINAL_DAMAGE } from '@/game/data/long-term';
import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Info, Pin, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Skill } from '@/game/types';
import { JOBS, jobById, BASE_JOB } from '@/game/data/classes';
import { SKILLS, skillById } from '@/game/data/skills';
import { loadoutSkillAP, lineage, refinePractice, extremeBreakTarget, extremeStage, extremeFinalMultiplier, apCapacity, apUsed, canUse, canInheritSkill, canSpendSkill, effectiveSkill, inherited, masteryMilestonesFor, maxSkillLevel, skillLevel, skillMastery, skillRankHint, validLoadout, skillUnlockReady, masteryGainBonus, skillVeiled, skillBlockReason, skillExclusiveLabel, exclusiveAccess, limitBreakOf, limitBreakOwned, limitBreakNext, passiveGrowthBonus } from '@/game/systems/progression';
import { Heading, Meter, SkillIcon, Fold } from './shared';
import { hanjaReading } from '@/game/systems/skill-description';
import { masteryConditionText } from '@/game/systems/mastery';
import { recommendLoadout } from '@/game/systems/loadout';
import { extraRollLevel } from '@/game/systems/progression';
import { researchRank, researchById } from '@/game/data/economy';
import { SKILL_FORMULA } from '@/game/data/balance';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { skillGrowthStages, skillEffectLines, skillBonusText, skillPercent, skillBrief, skillExtraNotes } from '@/game/systems/skill-description';
import { enemySkillById } from '@/game/data/encounters';



/** v27.73 카드 머리의 즐겨찾기·숨기기 버튼. 둘 다 세이브에 저장되어 기기를 옮겨도 따라갑니다. */
function MarkButtons({ pinned, hidden, onPin, onHide, name, disabled }: { pinned: boolean; hidden: boolean; onPin: () => void; onHide: () => void; name: string; disabled: boolean }) {
    return <span className="skill-title-tools">
        <button type="button" className={`skill-pin ${pinned ? 'active' : ''}`} disabled={disabled} aria-pressed={pinned} aria-label={`${name} ${pinned ? '즐겨찾기 해제' : '즐겨찾기'}`} title={pinned ? '즐겨찾기 해제' : '즐겨찾기에 고정'} onClick={onPin}><Pin size={14}/></button>
        <button type="button" className={`skill-pin skill-hide ${hidden ? 'active' : ''}`} disabled={disabled} aria-pressed={hidden} aria-label={`${name} ${hidden ? '숨김 해제' : '숨기기'}`} title={hidden ? '숨김 해제' : '목록에서 숨기기 (장착 중·검색·숨김 탭에는 보임)'} onClick={onHide}>{hidden ? <Eye size={14}/> : <EyeOff size={14}/>}</button>
    </span>;
}

/** v3.93 memo: 검색 입력 · 필터 조작으로 목록이 다시 그려져도 같은 상태의 카드는 다시 계산하지 않습니다. */
const SkillCard = memo(function SkillCard({ sk, s, send, busy, detailed, pinned = false, hidden = false }: PanelProps & { sk: Skill; detailed: boolean; pinned?: boolean; hidden?: boolean }) {
    const marks = <MarkButtons pinned={pinned} hidden={hidden} disabled={busy} name={sk.name} onPin={() => send({ type: 'pinSkill', id: sk.id })} onHide={() => send({ type: 'hideSkill', id: sk.id })}/>;
    const rank = s.learned[sk.id] || 0, acquired = rank > 0;
    const practice = s.skillPractice[sk.id] || 0, mastery = skillMastery(s, sk.id);
    const level = skillLevel(sk, rank || 1, mastery), max = maxSkillLevel(sk), milestones = masteryMilestonesFor(sk);
    const nextMastery = milestones[mastery], nextGrowth = milestones[level];
    // v3.198 AP는 떠돌이의 요령 할인까지 편성 기준으로(장착하면 그 편성에서의 값).
    const effective = effectiveSkill(sk, rank || 1, mastery), cost = loadoutSkillAP(s, sk.id, s.skills.includes(sk.id) ? s.skills : [...s.skills, sk.id]);
    const equipped = s.skills.includes(sk.id), usable = canUse(s, sk.id), isInherited = inherited(s, sk.id);
    const paidInheritance = !!s.skillInheritances[sk.id];
    const unlockText = sk.unlockAfter && skillMastery(s, sk.unlockAfter.skill) < sk.unlockAfter.level ? `${skillById(sk.unlockAfter.skill)?.name || ''} 숙련 Lv.${sk.unlockAfter.level} 필요` : !skillUnlockReady(s, sk) ? `직업 숙련 ${sk.unlockJobMastery!.toLocaleString()} 필요` : sk.job !== s.job ? '전직 필요' : s.rebirths < (sk.rebirth || 0) ? `환생 ${sk.rebirth}회 필요` : `Lv.${sk.level}에 자동 해금`;
    const inheritanceText = !acquired ? unlockText : !sk.job ? '공용' : isInherited ? (mastery > 0 ? '숙련 계승' : 'SP 계승') : sk.job === s.job ? '현재 직업 전용' : '계승 필요';
    const hint = skillRankHint(sk, rank || 1, mastery);
    const effects = skillEffectLines(effective, level);
    // v3.5 간단히 보기: 고정 효과 + 누적·환생 비례 수치(지금 기준)를 칩으로 합치고, 칩으로 못 담는 조건은 ‘기타’ 칸에 모읍니다.
    const growthNow = sk.type === 'passive' ? passiveGrowthBonus(s, sk) : {}, growing = new Set(Object.keys(growthNow));
    const passiveChips: Record<string, number> = sk.disguise ? {} : { ...(effective.bonus || {}) as Record<string, number> };
    if (!sk.disguise) for (const [key, n] of Object.entries(growthNow)) passiveChips[key] = (passiveChips[key] || 0) + n;
    const extraNotes = [...skillExtraNotes(sk), ...(sk.type === 'passive' && !Object.keys(passiveChips).length && sk.desc && !skillExtraNotes(sk).length ? [sk.desc] : [])];
    const growth = detailed ? skillGrowthStages(sk) : [];
    const extremeTarget = extremeBreakTarget(sk), refinePracticeNow = refinePractice(s, sk.id), extremeNow = extremeStage(s, sk.id), extremeNext = EXTREME_STAGES[extremeNow], extremeFx = !!s.extremeFx?.[sk.id];
    const lb = limitBreakOf(s, sk.id), lbOwned = limitBreakOwned(s, sk.id), lbNext = limitBreakNext(s, sk.id);
    const equipAllowed = validLoadout(s, equipped ? s.skills.filter(id => id !== sk.id) : [...s.skills, sk.id]);
    // 장착 버튼에 '왜 안 되는지'를 바로 적습니다: 사용 조건(계승·레벨·숙련) 또는 AP 부족량.
    const apShort = Math.max(0, cost - (apCapacity(s) - apUsed(s)));
    const equipLabel = equipped ? '장착 해제' : !acquired ? unlockText : !usable ? skillBlockReason(s, sk.id).replace(/[.。]$/, '') : !equipAllowed ? `AP ${apShort} 부족` : '장착';
    // v25 감춰진 기술: 숙련 Lv.1 전까지 효과를 ???로 보여 줍니다(장착·숙련 진행은 그대로).
    if (skillVeiled(s, sk)) return <article className={`panel skill-card skill-veiled ${equipped ? 'chosen' : ''} ${!acquired ? 'locked' : ''} ${hidden ? 'skill-hidden' : ''} ${detailed ? 'expanded' : 'compact'}`}>
        <div className="skill-title"><div className="icon-box"><SkillIcon id={sk.id}/></div><div><h3 title={hanjaReading(sk.name)}>{sk.name}</h3><small>{jobById(sk.job)?.name || '공용'} · {sk.type === 'active' ? '액티브' : '패시브'} · 장착 AP {cost}</small></div>{marks}</div>
        <p className="skill-current-description">??? · 숙련 Lv.1을 달성하면 효과가 드러납니다.</p>
        <div className="skill-compact-growth"><span>{acquired ? '습득' : unlockText}</span><span>{nextMastery ? `숙련 ${practice.toLocaleString()} / ${nextMastery.toLocaleString()}` : '숙련 완료'}</span></div>
        {acquired && <Meter value={Math.min(practice, nextMastery || milestones[max - 1])} max={nextMastery || milestones[max - 1]}/>}
        <div className="skill-actions skill-actions-v2"><button className={equipped ? 'secondary' : 'primary'} disabled={busy || !usable || !equipAllowed} onClick={() => send({ type: 'skill', id: sk.id })}>{equipLabel}</button></div>
    </article>;
    return <article className={`panel skill-card ${equipped ? 'chosen' : ''} ${!acquired ? 'locked' : ''} ${hidden ? 'skill-hidden' : ''} ${detailed ? 'expanded' : 'compact'}`} title={detailed ? undefined : `${effects.join(" · ")}\n다음 강화: ${hint}`}>
        <div className="skill-title"><div className="icon-box"><SkillIcon id={sk.id}/></div><div><h3 title={hanjaReading(sk.name)}>{sk.name}</h3><small>{jobById(sk.job)?.name || '공용'} · 캐릭터 Lv.{sk.level}{sk.rebirth ? ` · 환생 ${sk.rebirth}회` : ''}</small></div>{marks}</div>
        {!detailed && <span className={`skill-status-badge ${equipped && usable ? 'on' : !acquired || !usable ? 'off' : ''}`}>{equipped ? (usable ? '장착 중' : '장착 · 사용 불가') : !acquired ? '미습득' : !usable ? (sk.exclusiveLineage && !exclusiveAccess(s, sk) ? '계보 전용' : '계승 필요') : '사용 가능'}</span>}
        {detailed && <div className="skill-state-row" aria-label="스킬 상태"><span className={acquired ? 'on' : 'off'}><small>습득</small>{acquired ? '습득' : '미습득'}</span><span className={!sk.job || isInherited && !sk.exclusiveLineage ? 'on' : 'off'}><small>다른 직업</small>{!sk.job ? '공용 · 모든 직업' : sk.exclusiveLineage ? `${skillExclusiveLabel(sk)} · 계승해도 계보 밖 사용 불가` : isInherited ? '계승 완료 · 사용 가능' : '계승 필요'}</span><span className={equipped ? (usable ? 'on' : 'warn') : 'off'}><small>장착</small>{equipped ? (usable ? '장착 중' : '장착 · 지금은 사용 불가') : '미장착'}</span></div>}
        {detailed && <div className="skill-level-line"><strong>{acquired ? `성장 Lv.${level}` : '미해금'} <small>/ 최대 {max}{lb > 0 ? ` · 한계돌파 ${lb}단계` : ''}{acquired ? ` · SP Lv.${Math.min(max, Math.max(0, rank - 1))} · 숙련 Lv.${Math.min(max, mastery - lb)} 중 높은 값` : ''}</small></strong>{!acquired && <span>{inheritanceText}</span>}<TooltipProvider><Tooltip><TooltipTrigger asChild><button type="button" className="info-trigger" aria-label={`${sk.name} 현재 효과와 다음 강화`}><Info size={16}/></button></TooltipTrigger><TooltipContent className="game-tooltip"><strong>성장 Lv.{level} / {max}</strong><p>{effects.join(' · ')}</p><p>다음 강화: {hint}</p></TooltipContent></Tooltip></TooltipProvider></div>}
        {!detailed && <><p className="skill-current-description">{sk.disguise || sk.desc || skillBrief(sk)}</p></>}{sk.id === 'rareSense' && <p className="skill-specific-note">몬스터 출현률과 장비 등급 확률은 바뀌지 않습니다.</p>}
        {sk.unlockJobMastery && (detailed || !acquired) && <div className="skill-unlock-note">최초 해금: {jobById(sk.job)?.name} 숙련도 <b>{(s.jobMastery[sk.job!] || 0).toLocaleString()} / {sk.unlockJobMastery.toLocaleString()}</b><small>해금 전에는 SP로 구매·계승할 수 없습니다.</small></div>}
        {detailed && (sk.sourceEnemySkill && <div className="skill-origin">몬스터 원형: {enemySkillById(sk.sourceEnemySkill)?.name}</div>)}
        {detailed && sk.masteryGain && <div className="skill-unlock-note"><b>대상 처치 시 숙련 ×{1 + masteryGainBonus(sk, level)}</b><span>{masteryConditionText(sk)}</span><small>현재 직업·장착 스킬에 적용 · 가장 높은 보너스 하나만 · 최대 ×10</small></div>}
        {detailed && <Meter value={Math.min(practice, nextMastery || milestones[max - 1])} max={nextMastery || milestones[max - 1]} label={level >= max ? '실전 숙련 · 최대 성장 완료' : `실전 숙련 · Lv.${level + 1}까지 ${Math.max(0, nextGrowth - practice).toLocaleString()} 남음 (또는 1 SP)`}/>}
        {!detailed && <div className="skill-brief-stats"><span className={sk.awaken ? 'skill-awaken-chip' : undefined}>{sk.type === 'active' ? (sk.awaken ? '각성 · 턴마다' : '액티브') : '패시브'}</span><span className={cost < 0 ? 'ap-gain' : ''}>장착 AP {cost}{cost < 0 ? ` · 여유 +${-cost}` : ''}</span>{sk.exclusiveLineage && <span className="skill-exclusive-chip" title="이 계보 직업일 때만 장착 · 효과. 계승해도 다른 계보에서는 못 씁니다.">{skillExclusiveLabel(sk)}</span>}{sk.type === 'active' && <><span>발동 {skillPercent(effective.chance)}</span>{sk.hpCost ? <span>체력 {Math.round(sk.hpCost * 100)}%</span> : sk.manaBurn ? <span>마나 {Math.round(sk.manaBurn * 100)}% 연소</span> : <span>마나 {effective.manaCost ?? 0}</span>}</>}{sk.type === 'passive' && Object.entries(passiveChips).map(([key, n]) => <span className={`${n < 0 ? 'negative' : ''} ${growing.has(key) ? 'skill-chip-growing' : ''}`} key={key} title={growing.has(key) ? '누적·환생 비례 수치 포함(지금 기준)' : undefined}>{skillBonusText(key, n)}</span>)}{extraNotes.length > 0 && <span className="skill-chip-extra" title={extraNotes.join('\n')}><b>기타</b>{extraNotes.map(x => <small key={x}>{x}</small>)}</span>}</div>}
        {!detailed && <div className="skill-compact-growth"><span>{acquired ? `성장 Lv.${level} / ${max}` : unlockText}</span><span>{nextMastery ? `숙련 ${practice.toLocaleString()} / ${nextMastery.toLocaleString()}` : '숙련 완료'}</span></div>}
        {!detailed && acquired && <Meter value={Math.min(practice, nextMastery || milestones[max - 1])} max={nextMastery || milestones[max - 1]}/>}
        {detailed && <>
            {sk.condition && <div className="condition-label">{sk.condition === 'wounded' ? '내 체력 70% 이하에서 발동 판정' : '상대 체력 60% 이상에서 발동 판정'}</div>}
            <div className="skill-stage-table-wrap" tabIndex={0} role="region" aria-label={`${sk.name} 단계별 실제 효과`}><table className="skill-stage-table skill-growth-table"><caption>기본 성장 효과 <small>필요 숙련은 누적 수치 · 기본 Lv.0부터 사용</small></caption><thead><tr><th>성장</th><th>필요 숙련</th><th>AP</th>{sk.type === 'active' && <><th>발동</th><th>마나</th><th>대기</th></>}<th>실제 효과</th></tr></thead><tbody>{growth.map(row => <tr key={row.level} className={level === row.level && acquired ? 'current' : ''}><th>Lv.{row.level}{row.broken ? <small>한계돌파 {row.broken}</small> : null}{level === row.level && acquired && <small>현재</small>}</th><td>{row.practice ? row.practice.toLocaleString() : '기본 해금'}</td><td className={(row.effective.cost || 0) < 0 ? 'ap-gain' : ''}>{row.effective.cost}</td>{sk.type === 'active' && <><td>{skillPercent(row.effective.chance)}</td><td>{row.effective.manaCost}</td><td>{row.effective.cooldown}턴</td></>}<td className="skill-stage-effects">{row.effects.map((text, i) => <span key={i}>{text}</span>)}</td></tr>)}</tbody></table></div>
            <p className="footnote">{sk.type === 'active' ? '피해식은 상대 방어·치명타·약화 적용 전입니다. 추가 공격은 각각 명중과 치명타를 판정합니다.' : '능력치 증가량은 직업·연구 배율 적용 전입니다. 조건부 숙련 보너스는 가장 높은 하나만 적용됩니다.'} {!sk.job ? '공용 기술은 계승 없이 사용할 수 있습니다.' : `무료 계승: 누적 숙련 ${milestones[0].toLocaleString()}. SP 계승은 숙련도를 올리지 않습니다.`} 숙련·SP 중 높은 성장 레벨만 적용하며, 다른 직업의 전직 선행조건에는 실전 숙련만 인정됩니다.</p>
        </>}
        {/* v3.74 극한돌파 · v3.211 극한 단계: 한계돌파 3단계 뒤 숙련 1억 · 2억 · 4억 · 7억 · 10억마다 그 스킬의 최종 피해 +2%. 처음 달성하면 전용 연출이 영구로 열립니다. */}
        {acquired && extremeTarget !== null && <details className="skill-specialization"><summary>극한돌파 · {extremeNow ? `${extremeNow}단계 · 최종 피해 +${Math.round((extremeFinalMultiplier(extremeNow) - 1) * 100)}%` : lb >= PROGRESSION.limitBreak.max ? `숙련 ${refinePracticeNow.toLocaleString()} / ${extremeTarget.toLocaleString()}` : `한계돌파 ${PROGRESSION.limitBreak.max}단계 뒤에 열림`}{extremeFx ? ' · 전용 연출' : ''}</summary>
            <p>숙련 {EXTREME_STAGES.map(n => `${n / 1e8}억`).join(' · ')}마다 이 스킬의 최종 피해가 +{Math.round(EXTREME_FINAL_DAMAGE * 100)}%씩(최대 +{Math.round(EXTREME_FINAL_DAMAGE * EXTREME_STAGES.length * 100)}%) 오릅니다. 처음 극한돌파하면 이 스킬의 전용 연출(極)이 열리고 승천해도 남습니다. 단계는 승천하면 승천 뒤 쌓은 숙련으로 다시 오릅니다.</p>
            {lb >= PROGRESSION.limitBreak.max && extremeNext !== undefined && <Meter value={Math.min(refinePracticeNow, extremeNext)} max={extremeNext} label={`극한 ${extremeNow + 1}단계까지`}/>}
        </details>}
        <div className="skill-actions skill-actions-v2">
            {sk.job && acquired && !isInherited && <ConfirmButton label="계승 · 1 SP" description={`${sk.name}을 다른 직업에서도 사용할 수 있게 합니다. 성장 레벨과 숙련도는 변하지 않습니다. 숙련도 ${milestones[0].toLocaleString()}을 쌓으면 SP 없이도 계승됩니다.`} disabled={busy || !canInheritSkill(s, sk.id) || s.sp < 1} onConfirm={() => send({ type: 'inheritSkill', id: sk.id })}/>}
            {acquired && mastery - lb >= max && lbNext.stage <= PROGRESSION.limitBreak.max && <ConfirmButton label={`한계돌파 ${lbNext.stage}단계 · SP ${lbNext.sp}`} description={lbNext.ok ? `${sk.name} 성장 Lv.${level} → Lv.${level + 1}. 발동 +${Math.round((PROGRESSION.masteryChance + PROGRESSION.limitBreak.chance) * 1000) / 10}%p, 배율·패시브 한 단계 더${lbNext.stage >= PROGRESSION.limitBreak.max ? ', 장착 AP -1' : ''}. 환생해도 유지됩니다.` : `조건: ${lbNext.reason}`} disabled={busy || !lbNext.ok} onConfirm={() => send({ type: 'limitBreak', id: sk.id })}/>}
            {acquired && <ConfirmButton label={level >= max ? '최대 레벨' : '강화 · 1 SP'} description={`${sk.name} 성장 Lv.${level} → Lv.${level + 1}. ${hint} 숙련은 계속 쌓이며 SP와 효과가 중첩되지는 않습니다. 이 강화만으로 계승되지는 않습니다.`} disabled={busy || !canSpendSkill(s, sk.id) || s.sp < 1} onConfirm={() => send({ type: 'learn', id: sk.id })}/>}
            <button className={`${equipped ? 'secondary' : 'primary'} ${equipLabel.length > 12 ? 'skill-action-wide' : ''}`} disabled={busy || !usable || !equipAllowed} title={equipped && !equipAllowed ? 'AP를 지원하는 스킬입니다. 다른 기술을 먼저 해제하세요.' : undefined} onClick={() => send({ type: 'skill', id: sk.id })}>{equipLabel}</button>
        </div>
        {acquired && lbOwned > lb && <p className="footnote limit-break-reason" role="note">한계돌파 {lbOwned}단계를 했지만 세계석 연구 ‘리미터 해제’가 {lb}단계라 {lb}단계까지만 적용됩니다.</p>}
        {acquired && mastery - lb >= max && lbNext.stage <= PROGRESSION.limitBreak.max && !lbNext.ok && <p className="footnote limit-break-reason" role="note">한계돌파 {lbNext.stage}단계 조건: {lbNext.reason}. 장착 여부와 관계없이, 조건을 채우면 버튼이 켜집니다.</p>}
        {paidInheritance && mastery > 0 && detailed && <small className="footnote">실전 숙련으로 무료 계승도 완료했습니다. SP 투자 환급 시 숙련 계승은 유지됩니다.</small>}
    </article>;
});

type SkillKind = 'all' | 'active' | 'passive';
type SkillDamage = 'all' | 'physical' | 'magic' | 'status' | 'heal';
type SkillSort = 'default' | 'ap' | 'chance' | 'level' | 'mastery' | 'name';
const KIND_LABEL: Record<SkillKind, string> = { all: '전체', active: '액티브', passive: '패시브' };
const DAMAGE_LABEL: Record<SkillDamage, string> = { all: '모든 효과', physical: '물리', magic: '마법', status: '상태이상·제어', heal: '회복·흡혈' };
const SORT_LABEL: Record<SkillSort, string> = { default: '기본 순서', ap: 'AP 낮은 순', chance: '발동률 높은 순', level: '성장 Lv. 높은 순', mastery: '숙련 많은 순', name: '이름 순' };
const STATUS_EFFECTS = new Set(['stun', 'bleed', 'silence', 'slow', 'weaken', 'poison', 'burn', 'freeze', 'curse']);
/** 검색·칩 필터에 쓰는 기술의 효과 분류. 액티브는 피해 유형, 상태이상·회복은 효과로 나눕니다. */
function skillDamageKind(sk: Skill): SkillDamage[] {
    const out: SkillDamage[] = [];
    if (sk.type === 'active') out.push(sk.damageType === 'magic' || sk.damageType === 'fixed' && sk.baseStat === 'magic' ? 'magic' : 'physical');
    if (sk.damageType === 'split') out.push('magic');
    if (sk.effect && STATUS_EFFECTS.has(sk.effect) || sk.statusOnly) out.push('status');
    if (sk.effect === 'heal' || sk.effect === 'drain' || sk.bonus?.lifesteal || sk.bonus?.hpRegen) out.push('heal');
    if (sk.type === 'passive' && (sk.bonus?.attack || sk.bonus?.crit || sk.bonus?.critDamage || sk.bonus?.penetration)) out.push('physical');
    if (sk.type === 'passive' && (sk.bonus?.magic || sk.bonus?.arcaneRatioBonus || sk.bonus?.mana || sk.bonus?.manaRegen)) out.push('magic');
    if (sk.type === 'passive' && (sk.bonus?.dotBonus || sk.bonus?.bleedBonus || sk.bonus?.poisonBonus || sk.bonus?.burnBonus || sk.bonus?.stunBonus || sk.bonus?.controlBonus || sk.bonus?.dotTurnsBonus)) out.push('status');
    return out;
}

/** v27.73 전 버전이 즐겨찾기를 두던 브라우저 저장소 키. 세이브에 즐겨찾기가 없을 때 한 번 옮기고 지웁니다. */
const PIN_KEY = 'tidebound.skillPins';
export function Skills({ s, send, busy }: PanelProps) {
    const [scope, setScope] = useState('current'), [filter, setFilter] = useState('all'), [view, setView] = useState('simple');
    const [query, setQuery] = useState(''), [kind, setKind] = useState<SkillKind>('all'), [damage, setDamage] = useState<SkillDamage>('all'), [sort, setSort] = useState<SkillSort>('default');
    const [grouped, setGrouped] = useState(false), [dragId, setDragId] = useState<string | null>(null);
    // v27.73 즐겨찾기·숨김은 세이브에 저장됩니다(기기를 옮겨도 따라감). 게임 규칙에는 쓰지 않는 화면 편의 설정입니다.
    const pins = s.skillPins || [], hidden = s.skillHidden || [];
    // 전 버전의 브라우저 즐겨찾기를 세이브로 한 번 옮깁니다: 세이브에 목록이 없을 때만 보내고, 세이브에 목록이 생기면 브라우저 키를 지웁니다.
    const migrated = useRef(false);
    useEffect(() => {
        try {
            if (s.skillPins !== undefined) { localStorage.removeItem(PIN_KEY); return; }
            if (migrated.current) return;
            const raw = localStorage.getItem(PIN_KEY), ids: unknown = raw ? JSON.parse(raw) : null;
            if (Array.isArray(ids) && ids.length) { migrated.current = true; send({ type: 'pinSkill', value: ids.filter(x => typeof x === 'string').join(',') }); }
        } catch { /* 저장소 없음 */ }
    }, [s.skillPins, send]);
    const currentJob = jobById(s.job) || JOBS[0], used = apUsed(s), cap = apCapacity(s);
    const line = lineage(s.job);
    // v27.62 추천 편성은 상태가 바뀔 때만 다시 계산합니다.
    const recommended = useMemo(() => recommendLoadout(s), [s]);
    const sameLoadout = recommended.length === s.skills.length && recommended.every(id => s.skills.includes(id));
    /** 끌어서 놓기: 액티브끼리만 순서를 바꾸고 패시브는 뒤에 그대로 둡니다. */
    const dropOn = (targetId: string) => {
        if (!dragId || dragId === targetId) return;
        const actives = s.skills.filter(id => skillById(id)?.type === 'active'), rest = s.skills.filter(id => skillById(id)?.type !== 'active');
        const from = actives.indexOf(dragId), to = actives.indexOf(targetId);
        if (from < 0 || to < 0) return;
        actives.splice(from, 1); actives.splice(to, 0, dragId);
        send({ type: 'setSkills', value: [...actives, ...rest].join(',') });
    };
    /** 계보별 묶기: 현재 직업 → 선행 직업(가까운 순) → 공용 → 다른 직업(계승). */
    const groupOf = (sk: Skill) => !sk.job ? { key: 'common', order: line.length + 1, name: '공용' } : sk.job === s.job ? { key: sk.job, order: 0, name: `${currentJob.name} · 현재 직업` } : line.includes(sk.job) ? { key: sk.job, order: line.indexOf(sk.job), name: `${jobById(sk.job)?.name} · 선행 직업` } : { key: sk.job, order: line.length + 2, name: `${jobById(sk.job)?.name} · 계승` };
    // v3.93 검색은 입력을 늦춰 반영하고(useDeferredValue), 검색 대상 문구(이름 · 설명 · 직업 · 효과)는 검색 중일 때 상태가 바뀔 때만 한 번 만듭니다.
    const q = useDeferredValue(query).trim().toLowerCase(), searching = q.length > 0;
    const corpus = useMemo(() => searching ? new Map(SKILLS.map(sk => [sk.id, [sk.name, sk.desc, jobById(sk.job)?.name || '공용', skillVeiled(s, sk) ? '' : skillEffectLines(effectiveSkill(sk, s.learned[sk.id] || 1, skillMastery(s, sk.id)), skillLevel(sk, s.learned[sk.id] || 1, skillMastery(s, sk.id))).join(' ')].join('\n').toLowerCase()])) : null, [s, searching]);
    /**
     * v3.167 정보 비공개(docs/concept.md 10장)의 ‘만나 본 직업의 스킬만’ 가림은 두지 않습니다(운영은 비공개를 끄고 있고, 수련 스킬 같은
     * 공개 직업의 패시브가 검색에서 통째로 빠짐). 비밀 직업의 스킬은 서버가 카탈로그에 싣지 않으므로(server/secrecy.ts) 여기서 가릴 것이 없습니다.
     */
    // 검색어가 있으면 범위(현재 직업·해금 등)를 무시하고 모든 기술에서 찾습니다. 이름·설명·직업 이름·효과 설명을 대상으로 합니다.
    const list = SKILLS.filter(sk => {
        const acquired = (s.learned[sk.id] || 0) > 0;
        if (!q) {
            if (scope === 'current' && sk.job !== s.job && !(s.job === BASE_JOB && !sk.job)) return false;
            if (scope === 'common' && sk.job) return false;
            if (scope === 'owned' && !acquired) return false;
            if (scope === 'equipped' && !s.skills.includes(sk.id)) return false;
            if (scope === 'pinned' && !pins.includes(sk.id)) return false;
            if (scope === 'hidden') return hidden.includes(sk.id);
            // v27.73 숨긴 스킬은 장착 중이 아니면 목록에서 빼고, 검색·‘숨김’ 탭에서만 보여 줍니다.
            if (hidden.includes(sk.id) && !s.skills.includes(sk.id)) return false;
        } else {
            if (!corpus?.get(sk.id)?.includes(q)) return false;
        }
        if (kind !== 'all' && sk.type !== kind) return false;
        if (damage !== 'all' && !skillDamageKind(sk).includes(damage)) return false;
        return filter === 'unlearned' ? !acquired : filter === 'usable' ? canUse(s, sk.id) : true;
    });
    // v3.93 정렬 키는 스킬마다 한 번만 계산합니다. 큰 값이 앞인 정렬은 키를 음수로.
    const keyOf = (sk: Skill) => { const fx = () => effectiveSkill(sk, s.learned[sk.id] || 1, skillMastery(s, sk.id));
        return sort === 'ap' ? fx().cost ?? 2 : sort === 'chance' ? -(fx().chance || 0) : sort === 'level' ? -skillLevel(sk, s.learned[sk.id] || 1, skillMastery(s, sk.id)) : -(s.skillPractice[sk.id] || 0); };
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    else if (sort !== 'default') { const keys = new Map(list.map(sk => [sk.id, keyOf(sk)])); list.sort((a, b) => keys.get(a.id)! - keys.get(b.id)!); }
    const filtersOn = !!q || kind !== 'all' || damage !== 'all' || sort !== 'default' || filter !== 'all';
    return <>
        <Heading eyebrow="SKILL LABORATORY" title="직업을 거쳐, 나만의 편성으로" description="전직 스킬은 무료로 사용합니다. 장착 후 처치로 계승·강화하거나, 얻어 둔 스킬에 1 SP를 투자하세요.">
            <ConfirmButton label="SP 투자 환급" description="사용한 SP만 환급합니다. 해금한 스킬·실전 숙련은 남고, SP로만 얻은 계승과 강화는 취소됩니다. 현재 편성이 AP를 넘으면 일부 스킬이 해제됩니다." disabled={busy || s.running || !!s.dungeon} onConfirm={() => send({ type: 'resetSkills' })}/>
        </Heading>
        <div className="skill-resource-grid"><div className="panel"><small>장착 AP</small><strong>{used}<span> / {cap}</span></strong><Meter value={Math.max(0, used)} max={cap}/></div><div className="panel"><small>보유 SP</small><strong>{s.sp}</strong></div><div className="panel"><small>계승한 직업 스킬</small><strong>{SKILLS.filter(sk => sk.job && (s.learned[sk.id] || 0) > 0 && inherited(s, sk.id)).length}</strong></div></div>
        <Fold id="skills:loadout" title="현재 편성" note="개수 제한 없음 · 총 AP만 제한 · 액티브는 끌어서 순서 변경" className="panel loadout"><div className="loadout-actions"><ConfirmButton label="추천 편성" title="추천 편성을 적용할까요?" description={`현재 직업 전용 → 선행 계보 → 공용 순서로, 발동률과 위력이 높은 액티브와 수치가 큰 패시브를 AP ${cap} 안에서 채웁니다. 적용 후: ${recommended.map(id => skillById(id)?.name).join(', ') || '없음'}. 지금 편성은 저장 칸에 먼저 담아 두면 되돌릴 수 있습니다.`} confirmLabel="적용" disabled={busy || !recommended.length || sameLoadout} onConfirm={() => send({ type: 'setSkills', value: recommended.join(',') })}/></div><div className="loadout-columns">{(['active', 'passive'] as const).map(type => {
            const ids = s.skills.filter(id => skillById(id)?.type === type);
            return <div className={`loadout-column loadout-${type}`} key={type}><h3>{type === 'active' ? '액티브' : '패시브'}<small>{type === 'active' ? `위에서부터 먼저 판정 · 처음 성공한 하나만 사용${extraRollLevel(s) ? ' · 추가 판정: 그 아래에서 한 번 더' : ''} · 각성기는 턴마다 따로` : '장착 효과 · 순서 무관'}</small></h3>
                <ol className="loadout-row">{ids.map((id, i) => {
                    const sk = skillById(id)!;
                    const rank = s.learned[id] || 1, mastery = skillMastery(s, id), fx = effectiveSkill(sk, rank, mastery);
                    return <li className={`loadout-skill ${type === 'active' ? 'draggable' : ''} ${dragId === id ? 'dragging' : ''}`} key={id} draggable={type === 'active' && !busy} onDragStart={e => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDragId(null)} onDragOver={e => { if (type === 'active' && dragId) e.preventDefault(); }} onDrop={e => { e.preventDefault(); dropOn(id); setDragId(null); }}>{type === 'active' && <span className="loadout-grip" aria-hidden="true" title="끌어서 순서 변경"><GripVertical size={14}/></span>}{type === 'active' && <span className="loadout-order" aria-label={`판정 ${i + 1}순위`}>{i + 1}</span>}<SkillIcon id={id}/><div><strong>{sk.name} · Lv.{skillLevel(sk, rank, mastery)}</strong><small>AP {loadoutSkillAP(s, id)}{type === 'active' ? ` · 발동 ${Math.round((fx.chance || 0) * 100)}%` : ''}{sk.awaken ? ' · 각성(턴마다)' : ''}</small></div>{type === 'active' && i > 0 && <button className="icon-button" aria-label={`${sk.name} 우선순위 올리기`} title="먼저 판정" disabled={busy} onClick={() => send({ type: 'skillUp', id })}><ArrowUp size={16}/></button>}{type === 'active' && i < ids.length - 1 && <button className="icon-button" aria-label={`${sk.name} 우선순위 내리기`} title="나중에 판정" disabled={busy} onClick={() => send({ type: 'skillUp', id: ids[i + 1] })}><ArrowDown size={16}/></button>}<button className="text-button" disabled={busy || !validLoadout(s, s.skills.filter(x => x !== id))} onClick={() => send({ type: 'skill', id })}>해제</button></li>;
                })}</ol>
                {!ids.length && <p className="loadout-empty">{type === 'active' ? '액티브가 없으면 기본 공격만 합니다.' : '장착한 패시브가 없습니다.'}</p>}
            </div>;
        })}</div>{(() => {
            // v3.86 추가 판정: 연구로 해금하고 장착 AP를 내고 켭니다.
            const unlocked = researchRank(s, 'extraRoll'), level = extraRollLevel(s), need = SKILL_FORMULA.extraRoll.ap[0], power = Math.round(SKILL_FORMULA.extraRoll.power[0] * 100), short = need - (cap - used);
            const gate = researchById('extraRoll');
            return <div className={`loadout-extra ${level ? 'on' : ''}`}><div><strong>추가 판정 {level ? `${level}단계 · 켜짐` : unlocked ? '· 꺼짐' : '· 잠김'}</strong><small>{unlocked ? `액티브가 발동한 행동에서 편성 순서상 그 아래 액티브로 한 번 더 판정합니다. 성공하면 ${power}% 위력으로 함께 씁니다. 동시 시전 묶음으로 나간 행동은 묶음 최대 개수가 1 늘어납니다. 장착 AP ${need}.` : `세계석 연구 ‘${gate?.name}’에서 해금합니다${gate?.rebirth ? `(환생 ${gate.rebirth}회부터)` : ''}. 켜면 장착 AP ${need}를 씁니다.`}</small></div>{unlocked > 0 && <button className={level ? 'secondary small' : 'primary small'} disabled={busy || (!level && short > 0)} onClick={() => send({ type: 'extraRoll', value: String(level ? 0 : 1) })}>{level ? '끄기' : short > 0 ? `AP ${short} 부족` : `켜기 · AP ${need}`}</button>}</div>;
        })()}<div className="preset-row">{['1', '2', '3'].map(id => <div key={id}><span>편성 {id}<small>{s.presets[id] ? `${s.presets[id].skills.length}개 스킬` : '저장 없음'}</small></span><button className="text-button" disabled={busy} onClick={() => send({ type: 'savePreset', id })}>저장</button><button className="text-button" disabled={busy || !s.presets[id]} onClick={() => send({ type: 'loadPreset', id })}>불러오기</button></div>)}</div></Fold>
        <section className="skill-finder" aria-label="스킬 찾기">
            <label className="job-search-box skill-search"><Search size={15}/><input type="search" value={query} placeholder="스킬 이름·효과·직업으로 검색 (예: 기절, 흡혈, 마법사)" aria-label="스킬 검색" onChange={e => setQuery(e.target.value)}/></label>
            <div className="skill-finder-row">
                <div className="skill-chip-group" role="group" aria-label="종류">{(Object.keys(KIND_LABEL) as SkillKind[]).map(k => <button type="button" key={k} className={`skill-chip ${kind === k ? 'active' : ''}`} aria-pressed={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>)}</div>
                <div className="skill-chip-group" role="group" aria-label="효과">{(Object.keys(DAMAGE_LABEL) as SkillDamage[]).map(k => <button type="button" key={k} className={`skill-chip ${damage === k ? 'active' : ''}`} aria-pressed={damage === k} onClick={() => setDamage(k)}>{DAMAGE_LABEL[k]}</button>)}</div>
                <label className="gear-select">정렬<select value={sort} onChange={e => setSort(e.target.value as SkillSort)} aria-label="스킬 정렬">{(Object.keys(SORT_LABEL) as SkillSort[]).map(k => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}</select></label>
                {filtersOn && <button type="button" className="text-button" onClick={() => { setQuery(''); setKind('all'); setDamage('all'); setSort('default'); setFilter('all'); }}>필터 초기화</button>}
                <span className="gear-count">{list.length}종 표시{q ? ' · 검색 중에는 모든 직업의 기술을 봅니다' : ''}</span>
            </div>
        </section>
        <div className="skill-view-toolbar"><Tabs value={scope} onValueChange={setScope}><TabsList className="game-tabs"><TabsTrigger value="current">{currentJob.name} 전용</TabsTrigger><TabsTrigger value="equipped">장착 중 {s.skills.length}</TabsTrigger><TabsTrigger value="pinned">즐겨찾기 {pins.length}</TabsTrigger><TabsTrigger value="owned">해금한 스킬</TabsTrigger><TabsTrigger value="common">공용</TabsTrigger><TabsTrigger value="all">전체 계보</TabsTrigger><TabsTrigger value="hidden">숨김 {hidden.length}</TabsTrigger></TabsList></Tabs><div className="skill-view-toggle" role="group" aria-label="스킬 보기 방식"><button className={view === 'simple' ? 'active' : ''} aria-pressed={view === 'simple'} onClick={() => setView('simple')}>간단히 보기</button><button className={view === 'detail' ? 'active' : ''} aria-pressed={view === 'detail'} onClick={() => setView('detail')}>자세히 보기</button><button className={grouped ? 'active' : ''} aria-pressed={grouped} onClick={() => setGrouped(v => !v)}>계보별 묶기</button></div></div>
        <Tabs value={filter} onValueChange={setFilter}><TabsList className="game-tabs"><TabsTrigger value="all">모두</TabsTrigger><TabsTrigger value="usable">사용 가능</TabsTrigger><TabsTrigger value="unlearned">미해금</TabsTrigger></TabsList></Tabs>
        {scope === 'hidden' && !q && <p className="footnote">숨긴 스킬은 다른 범위 탭에서 보이지 않습니다(장착 중인 스킬과 검색 결과는 예외). 카드의 눈 모양 버튼으로 다시 보이게 할 수 있습니다.</p>}
        {!list.length && <div className="notice">조건에 맞는 기술이 없습니다. {q ? '다른 검색어를 써 보세요.' : scope === 'hidden' ? '숨긴 스킬이 없습니다. 카드의 눈 모양 버튼으로 자주 안 보는 스킬을 숨길 수 있습니다.' : '범위 탭을 ‘모든 스킬’로 바꾸거나 필터를 초기화해 보세요.'}</div>}
        {grouped ? [...new Map(list.map(sk => [groupOf(sk).key, groupOf(sk)])).values()].sort((a, b) => a.order - b.order).map(g => { const items = list.filter(sk => groupOf(sk).key === g.key); return <details className="skill-family skill-group" key={g.key} open={g.order <= 1}><summary><h2>{g.name}</h2><span>액티브 {items.filter(sk => sk.type === 'active').length} · 패시브 {items.filter(sk => sk.type === 'passive').length} · 장착 {items.filter(sk => s.skills.includes(sk.id)).length}</span></summary><div className={`skill-grid ${view === 'detail' ? 'skill-grid-detailed' : ''}`}>{items.map(sk => <SkillCard key={sk.id} sk={sk} s={s} send={send} busy={busy} detailed={view === 'detail'} pinned={pins.includes(sk.id)} hidden={hidden.includes(sk.id)}/>)}</div></details>; })
        : (['active', 'passive'] as const).map(type => <Fold id={`skills:${type}`} className="skill-family" key={type} title={type === 'active' ? '액티브 · 확률 발동' : '패시브 · 장착 효과'} note={`${list.filter(sk => sk.type === type).length}종`}><div className={`skill-grid ${view === 'detail' ? 'skill-grid-detailed' : ''}`}>{list.filter(sk => sk.type === type).map(sk => <SkillCard key={sk.id} sk={sk} s={s} send={send} busy={busy} detailed={view === 'detail'} pinned={pins.includes(sk.id)} hidden={hidden.includes(sk.id)}/>)}</div>{!list.some(sk => sk.type === type) && <div className="notice">이 범위에 해당하는 스킬이 없습니다.</div>}</Fold>)}
    </>;
}
