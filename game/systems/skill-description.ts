import type { Skill, Stats } from '../types';
import { STATUS_TUNING, SKILL_FORMULA, FIRST_AID_HEAL } from '../data/balance';
import { STAT_LABELS, byStatOrder, statDeltaDisplay } from '../data/progression';
import { effectiveSkill, masteryGainBonus, masteryMilestonesFor, maxSkillLevel, skillMasteryRewards } from './progression';
import { masteryConditionText, masteryPerVictory } from './mastery';
import { jobById } from '../data/classes';
import { skillById } from '../data/skills';

const number = (n: number) => Number(n.toFixed(4)).toLocaleString('ko-KR', { maximumFractionDigits: 4 });
export const skillPercent = (n: number) => `${number(n * 100)}%`;
export function skillBonusText(key: string, value: number) {
    return `${STAT_LABELS[key as keyof Stats] || key} ${statDeltaDisplay(key, value)}`;
}
const COUNT_WORD: Record<string, string> = { codex: '도감 기록', catch: '누적 포획', hunt: '던전 클리어·보스 포획', species: '지정 어종 포획', gold: '보유 골드 자릿수', rebirth: '환생', mastered: '숙달한 직업' };
const PROGRESS_WORD: Record<string, string> = { codex: '도감 기록', catch: '누적 포획', hunt: '사냥 기록', gold: '보유 골드' };
const STATUS_WORD: Record<string, string> = { stun: '기절', bleed: '출혈', weaken: '약화', silence: '침묵', slow: '감속', haste: '가속' };
/** 기술이 거는 상태이상 이름(출혈 계열은 화상·중독 같은 고유 이름). */
export function statusLabel(sk: Skill) {
    return sk.effect === 'bleed' && sk.dotName ? sk.dotName : STATUS_WORD[sk.effect || ''] || '';
}
/**
 * 짧은 효과 요약: 직업 상세·비교처럼 한 줄만 보여 줄 때 씁니다. 피해(또는 피해 없음) → 상태이상 → 추가타·회복·흡혈·연계 순서.
 * 자세한 계산식은 skillEffectLines에 있습니다.
 */
export function skillBrief(sk: Skill): string {
    if (sk.type !== 'active') {
        const parts = byStatOrder(Object.entries(sk.levelEffects?.[0]?.bonus ?? sk.bonus ?? {})).map(([key, n]) => skillBonusText(key, n as number));
        if (sk.perRebirth) parts.push(`환생마다 ${byStatOrder(Object.entries(sk.perRebirth)).map(([key, n]) => skillBonusText(key, n as number)).join(' · ')}`);
        if (sk.levelEffects?.length) parts.push(`숙련할수록 강해짐(AP ${sk.levelEffects[0].cost} → ${sk.levelEffects.at(-1)!.cost})`);
        if (sk.masteryGain) parts.push('조건부 숙련 증가');
        for (const pc of sk.perCount || []) parts.push(`${COUNT_WORD[pc.source]} ${pc.per.toLocaleString()}마다 ${byStatOrder(Object.entries(pc.bonus)).map(([key, n]) => skillBonusText(key, n as number)).join(' · ')}`);
        if (sk.song) parts.unshift('노래 · AP 0');
        return parts.join(' · ') || '장착 효과';
    }
    const parts = [sk.statusOnly ? '피해 없음' : `${sk.damageType === 'magic' ? '마법' : sk.damageType === 'split' ? '복합' : '물리'} 피해 ×${number(sk.multiplier || 1)}`];
    if (sk.effect && STATUS_WORD[sk.effect] && sk.effect !== 'haste') parts.push(`${statusLabel(sk)} ${sk.statusTurns ?? ({ stun: 1, bleed: STATUS_TUNING.bleedTurns, weaken: STATUS_TUNING.weakenTurns, silence: STATUS_TUNING.silenceTurns, slow: STATUS_TUNING.slowTurns } as Record<string, number>)[sk.effect]}턴`);
    if (sk.effect === 'haste') parts.push(`자신 가속 ${sk.statusTurns ?? STATUS_TUNING.hasteTurns}턴`);
    if (sk.extraAttacks) parts.push(`추가타 ${sk.extraAttacks}회`);
    if (sk.effect === 'heal') parts.push(`체력 ${skillPercent(sk.healRatio ?? SKILL_FORMULA.healRatio)} 회복`);
    if (sk.effect === 'drain') parts.push(`피해의 ${skillPercent(sk.drainRatio ?? SKILL_FORMULA.drainRatio)} 흡혈`);
    if (sk.damageBonusCondition) parts.push(`${{ bleeding: '출혈·중독', weakened: '약화', controlled: '기절·침묵·감속', lowHp: '빈사' }[sk.damageBonusCondition]} 적 +${skillPercent(sk.conditionalDamageBonus || 0)}`);
    if (sk.scaling && PROGRESS_WORD[sk.scaling]) parts.push(`${PROGRESS_WORD[sk.scaling]} 비례`);
    if (sk.gamble) parts.push([sk.gamble.min !== sk.gamble.max ? `주사위 ×${number(sk.gamble.min)}~${number(sk.gamble.max)}` : '', sk.gamble.accuracy ? `명중 ±${skillPercent(sk.gamble.accuracy)}p` : ''].filter(Boolean).join(' · '));
    if (sk.allIn) parts.push(`체력 ${skillPercent(sk.allIn.hpRatio)}·마나 전부 소모`);
    if (sk.goldSpend) parts.push(`골드 ${skillPercent(sk.goldSpend.ratio)} 투척`);
    if (sk.preyBonus) parts.push(`보스·지정 어종 +${skillPercent(sk.preyBonus)}`);
    return parts.join(' · ');
}
/** Describes the effective values used by combat, including HP/MP scaling and follow-ups. */
export function skillEffectLines(sk: Skill, level = 0): string[] {
    const out: string[] = [];
    if (sk.type === 'active') {
        const base = [sk.scaling === 'harmony' ? `${number(SKILL_FORMULA.harmonyBase)} + 배분 포인트 합 × ${number(SKILL_FORMULA.harmonyPerPoint)} + 가장 낮은 배분 포인트 × ${number(SKILL_FORMULA.harmonyPerLowest)}` : sk.scaling === 'dual' ? '(물리 공격 + 마법 공격) ÷ 2' : sk.id === 'oath' ? '물리·마법 공격 중 높은 값' : sk.damageType === 'magic' ? '마법 공격' : '물리 공격'];
        if (sk.scaling === 'defense') base.push(`물리 방어 × ${number(sk.scalingRatio ?? 1)} × 방어 친화도`);
        if (sk.scaling === 'hp') base.push(`최대 체력 × ${number(sk.scalingRatio ?? SKILL_FORMULA.hpScaling)}`);
        if (sk.scaling === 'mana') base.push(`최대 마나 × ${number(sk.scalingRatio ?? SKILL_FORMULA.manaScaling)}`);
        if (sk.scaling === 'hybrid') base.push(`최대 체력 × ${number(sk.scalingRatio ?? SKILL_FORMULA.hybridHpScaling)}`, `최대 마나 × ${number((sk.scalingRatio ?? SKILL_FORMULA.hybridManaScaling) * 2)}`);
        const damage = `${base.length > 1 ? `(${base.join(' + ')})` : base[0]} × ${number(sk.multiplier || 1)}${sk.id === 'crush' ? ` + 물리 방어 × ${number(SKILL_FORMULA.crushDefense)}` : ''}`;
        out.push(sk.restoreAll ? '직접 피해 없음 · 나와 상대의 체력·마나를 모두 가득 채웁니다 · 전투당 1회 · 쓸 때마다 직업 숙련 +25' : sk.statusOnly ? `직접 피해 없음 · 명중하면 ${statusLabel(sk)} ${sk.statusTurns ?? ''}턴만 겁니다` : `${damage} 피해`);
        if (sk.scaling === 'codex') out.push(`도감 기록(발견한 어종 + 등록한 물건) 1개마다 피해 +${skillPercent(sk.scalingRatio ?? 0)}`);
        if (sk.scaling === 'catch') out.push(`피해 × (1 + log10(누적 포획 + 1) × ${number(sk.scalingRatio ?? 0)}) · 포획 10배마다 +${skillPercent(sk.scalingRatio ?? 0)}`);
        if (sk.scaling === 'hunt') out.push(`피해 × (1 + √(던전 클리어 + 보스 포획) × ${number(sk.scalingRatio ?? 0)})`);
        if (sk.scaling === 'mastered') out.push(`숙달한 직업 1개마다 피해 +${skillPercent(sk.scalingRatio ?? 0)}`);
        if (sk.scaling === 'gold') out.push(`피해 × (1 + log10(보유 골드 + 1) × ${number(sk.scalingRatio ?? 0)}) · 골드 자릿수가 늘 때마다 +${skillPercent(sk.scalingRatio ?? 0)}`);
        if (sk.gamble) out.push(`쓸 때마다 ${[sk.gamble.min !== sk.gamble.max ? `피해 ×${number(sk.gamble.min)}~${number(sk.gamble.max)}(평균 ×${number((sk.gamble.min + sk.gamble.max) / 2)})` : '', sk.gamble.accuracy ? `이 기술 명중 ±${skillPercent(sk.gamble.accuracy)}p` : ''].filter(Boolean).join(' · ')} 무작위`);
        if (sk.allIn) out.push(`현재 체력의 ${skillPercent(sk.allIn.hpRatio)}(1은 남김)와 남은 마나 전부를 걸고 (건 체력 × ${number(sk.allIn.hpScale)} + 건 마나 × ${number(sk.allIn.manaScale)})를 피해식에 더합니다 · 빗나가도 소모`);
        if (sk.goldSpend) out.push(`보유 골드의 ${skillPercent(sk.goldSpend.ratio)}(한 번에 최대 ${sk.goldSpend.cap.toLocaleString()})를 실제로 쓰고, 쓴 골드 × ${number(sk.goldSpend.scale)}를 피해식에 더합니다`);
        if (sk.allIn?.heal) out.push(`건 마나 × ${number(sk.allIn.heal)}만큼 자신 회복`);
        if (sk.recoil) out.push(`준 피해의 ${skillPercent(sk.recoil)}를 자신도 받음 · 반동으로는 체력 1 아래로 내려가지 않음`);
        if (sk.sureHit) out.push('반드시 명중 · 기절 뒤 면역 규칙은 그대로');
        if (sk.extraTurn) out.push('이 행동 뒤 곧바로 한 번 더 행동 · 연속 행동과 별개 · 추가 행동에서는 다시 생기지 않음');
        if (sk.sealPower) out.push(`이번 전투에 새긴 인 1개마다 피해 +${skillPercent(sk.sealPower)}`);
        if (sk.selfEffect) out.push(`쓰고 나면 자신 ${{ stun: '기절', slow: '감속', weaken: '약화' }[sk.selfEffect.status]} ${sk.selfEffect.turns}턴${sk.selfEffect.waivedBy ? ` · ${skillById(sk.selfEffect.waivedBy)?.name || ''}을 장착하면 생략` : ''}`);
        if (sk.seal) out.push('쓰면 이번 전투의 인(印)을 하나 새깁니다');
        if (sk.preyBonus) out.push(`보스와 지정 어종(전류 곰치·불씨 곰치·수호 곰치)에게 직접 피해 +${skillPercent(sk.preyBonus)}`);
        if (sk.damageType === 'split') out.push(`물리 ${skillPercent(SKILL_FORMULA.splitPhysical)} · 마법 ${skillPercent(1 - SKILL_FORMULA.splitPhysical)}로 나눠 각각 방어 적용 · 명중·치명 판정 1회 · 장비·버프는 원시 피해에 미포함`);
        if (sk.accuracyBonus) out.push(`이 기술 명중 +${skillPercent(sk.accuracyBonus)}p`);
        if (sk.penetrationBonus) out.push(`이 기술 방어 관통 +${skillPercent(sk.penetrationBonus)}p · 합계 최대 85%`);
        if (sk.cleanseSelf) out.push('발동 시 자신의 출혈·감속 해제');
        if (sk.scaling === 'defense') out.push('방어 친화도: 직업의 물리 방어 배율이 높을수록 1에 가깝고(수호 계열), 다른 직업이 계승하면 최소 20%만 발휘');
        if (sk.damageBonusCondition) out.push(sk.damageBonusCondition === 'lowHp' ? `체력 ${skillPercent(SKILL_FORMULA.lowHpThreshold)} 이하인 적에게 직접 피해 +${skillPercent(sk.conditionalDamageBonus || 0)}` : `${{ bleeding: '출혈·중독', weakened: '약화', controlled: '침묵·감속' }[sk.damageBonusCondition]} 중인 적에게 직접 피해 +${skillPercent(sk.conditionalDamageBonus || 0)}`);
        if (sk.effect === 'heal') out.push(`${sk.condition === 'wounded' ? `체력 ${skillPercent(SKILL_FORMULA.woundedThreshold)} 이하일 때 ` : ''}자신의 최대 체력 ${skillPercent(sk.healRatio ?? SKILL_FORMULA.healRatio)} 회복 후 공격 · 체력 ${skillPercent(SKILL_FORMULA.healThreshold)} 이상에서 쓰면 회복 직업이 아닐 때 피해 ×${number(SKILL_FORMULA.idleHealDamage)}`);
        if (sk.effect === 'stun') out.push(`명중 시 기절 ${sk.statusTurns ?? 1}턴`);
        if (sk.effect === 'bleed') out.push(`명중 시 ${sk.dotName || '출혈'} ${sk.statusTurns ?? STATUS_TUNING.bleedTurns}턴 · 턴마다 (${base.join(' + ')}) × ${number(sk.dotRatio ?? SKILL_FORMULA.bleedRatio)} × (1 + 지속 피해 증가) 피해 · 방어 무시${sk.dotStacks ? ` · 중첩형: 다시 걸면 최대 ${STATUS_TUNING.poisonMaxStacks}중첩까지 쌓이고 지속 시간 갱신` : ''}`);
        if (sk.effect === 'weaken') out.push(`명중 시 상대 직접 피해 −${skillPercent(1 - SKILL_FORMULA.weakenedDamage)} · ${sk.statusTurns ?? STATUS_TUNING.weakenTurns}턴`);
        if (sk.effect === 'silence') out.push(`명중 시 침묵 ${sk.statusTurns ?? STATUS_TUNING.silenceTurns}턴 · 상대 액티브 사용 불가`);
        if (sk.effect === 'slow') out.push(`명중 시 상대 속도 −${skillPercent(STATUS_TUNING.slowMultiplier)} · ${sk.statusTurns ?? STATUS_TUNING.slowTurns}턴`);
        if (sk.effect === 'haste') out.push(`명중 시 자신의 속도 +${skillPercent(STATUS_TUNING.hasteMultiplier)} · ${sk.statusTurns ?? STATUS_TUNING.hasteTurns}턴`);
        if (sk.effect === 'drain') out.push(`실제로 깎은 체력의 ${skillPercent(sk.drainRatio ?? SKILL_FORMULA.drainRatio)} 회복 · 한 번에 최대 체력 × (흡혈률 + ${skillPercent(sk.drainRatio ?? SKILL_FORMULA.drainRatio)}) × ${skillPercent(SKILL_FORMULA.lifestealHpCap)}까지`);
        const statusKey = ({ stun: 'stun', bleed: 'bleed', weaken: 'weaken', silence: 'silence', slow: 'slow' } as const)[sk.effect as 'stun'];
        if (statusKey) out.push(`${sk.dotStacks ? '중첩은 계속 쌓임' : '상대에게 이미 걸려 있으면 이 기술은 건너뜀'} · 풀린 뒤 ${STATUS_TUNING.immuneTurns[statusKey]}턴 면역`);
        if (sk.extraAttacks) out.push(`추가 공격 ${Math.min(STATUS_TUNING.maxExtraAttacks, sk.extraAttacks)}회 · 각 타격은 위 피해식의 ${skillPercent(sk.extraAttackMultiplier ?? SKILL_FORMULA.extraAttackMultiplier)}`);
    }
    for (const [key, n] of byStatOrder(Object.entries(sk.bonus || {}))) out.push(skillBonusText(key, n as number));
    for (const pc of sk.perCount || []) out.push(`${COUNT_WORD[pc.source]} ${pc.per.toLocaleString()}마다 ${byStatOrder(Object.entries(pc.bonus)).map(([key, n]) => skillBonusText(key, n as number)).join(' · ')} (최대 ${pc.cap}회)`);
    if (sk.song) out.push('노래: AP 0 · 방랑 음유시인 계보 직업만 장착');
    if (sk.cooldownReset) out.push(`${({ crit: '치명타가 터지면', kill: '상대를 쓰러뜨리면', chain: '연속 행동마다' })[sk.cooldownReset.on]} ${sk.cooldownReset.chance >= 1 ? '항상' : `${skillPercent(sk.cooldownReset.chance)} 확률로`} ${({ longest: '가장 긴 재사용 대기 하나', first: '편성 순서 첫 번째 대기 중인 기술', all: '모든 재사용 대기' })[sk.cooldownReset.pick]}를 초기화`);
    if (sk.lastStand) out.push(`체력이 1 아래로 내려가지 않음 · 쓰러질 피해(추가타·지속 피해·반격 포함)를 받으면 체력 1로 버티고${sk.lastStand.heal ? ` 최대 체력 ${skillPercent(sk.lastStand.heal)} 회복` : ''} · 전투당 ${sk.lastStand.charges}번${sk.lastStand.chargesPerLevel ? ` (숙련 1단계마다 +${sk.lastStand.chargesPerLevel}번)` : ''}`);
    if (sk.sealFinale) out.push(`일곱 글자를 모두 장착하고 한 전투에 여섯 글자를 모두 쓰면 발동: (물리 공격 + 마법 공격) × (${number(sk.sealFinale.base)} + 일곱 글자와 天의 숙련 합 × ${number(sk.sealFinale.perLevel)}) 고정 피해 · 기절 ${sk.sealFinale.stun}턴 · 인 초기화`);
    if (sk.unlockAfter) out.push(`해금: ${skillById(sk.unlockAfter.skill)?.name || sk.unlockAfter.skill} 숙련 Lv.${sk.unlockAfter.level}`);
    if (sk.perRebirth) out.push(`환생 1회마다 ${byStatOrder(Object.entries(sk.perRebirth)).map(([key, n]) => skillBonusText(key, n as number)).join(' · ')} (최대 ${SKILL_FORMULA.perRebirthCap}회)`);
    if (sk.penaltyRelief) out.push(`현재 직업의 마이너스 보정(체력·공격·방어 배율) ${skillPercent(sk.penaltyRelief)} 회복 · 여러 개면 가장 큰 값만`);
    if ((jobById(sk.job)?.tier || 0) >= SKILL_FORMULA.signatureTier) out.push(`전용 기술: 계보 밖 직업이 계승하면 ${sk.type === 'active' ? '피해 배율' : '능력치'} ×${number(SKILL_FORMULA.signatureScale)}`);
    if (sk.id === 'firstAid') out.push(`승리 후 최대 체력 ${skillPercent(FIRST_AID_HEAL)} 추가 회복 · 승리당 1회 (무리 사냥 포함)`);
    if (sk.masteryGain) out.push(`${masteryConditionText(sk)} 승리 시 숙련 ×${masteryPerVictory(masteryGainBonus(sk, level))}`);
    if (sk.type === 'passive' && !sk.song && !sk.levelEffects && SKILL_FORMULA.masteredPassiveAP) out.push(level >= maxSkillLevel(sk) ? `최대 성장: 장착 AP −${SKILL_FORMULA.masteredPassiveAP} 적용 중` : `최대 성장(Lv.${maxSkillLevel(sk)})에 닿으면 장착 AP −${SKILL_FORMULA.masteredPassiveAP}`);
    const rewards = skillMasteryRewards(sk, level + 1);
    if (rewards.ap) out.push(`최대 성장 보상: 장착 AP 한도 +${rewards.ap}`);
    for (const [key, n] of byStatOrder(Object.entries(rewards.bonus))) out.push(`최대 성장 보상: ${skillBonusText(key, n as number)}`);
    return out;
}
export function skillGrowthStages(sk: Skill) {
    const milestones = masteryMilestonesFor(sk);
    return Array.from({ length: maxSkillLevel(sk) + 1 }, (_, level) => {
        const effective = effectiveSkill(sk, level + 1);
        return { level, practice: level ? milestones[level - 1] : 0, effective, effects: skillEffectLines(effective, level) };
    });
}
