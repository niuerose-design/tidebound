import type { Skill, Stats } from '../types';
import { STATUS_TUNING, SKILL_FORMULA, FIRST_AID_HEAL } from '../data/balance';
import { STAT_LABELS, byStatOrder, statDeltaDisplay } from '../data/progression';
import { effectiveSkill, masteryGainBonus, masteryMilestonesFor, maxSkillLevel, skillMasteryRewards } from './progression';
import { masteryConditionText, masteryPerVictory } from './mastery';
import { jobById } from '../data/classes';

const number = (n: number) => Number(n.toFixed(4)).toLocaleString('ko-KR', { maximumFractionDigits: 4 });
export const skillPercent = (n: number) => `${number(n * 100)}%`;
export function skillBonusText(key: string, value: number) {
    return `${STAT_LABELS[key as keyof Stats] || key} ${statDeltaDisplay(key, value)}`;
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
        out.push(`${damage} 피해`);
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
        if (sk.extraAttacks) out.push(`추가 공격 ${Math.min(STATUS_TUNING.maxExtraAttacks, sk.extraAttacks)}회 · 각 타격은 위 피해식의 ${skillPercent(sk.extraAttackMultiplier ?? SKILL_FORMULA.extraAttackMultiplier)}`);
    }
    for (const [key, n] of byStatOrder(Object.entries(sk.bonus || {}))) out.push(skillBonusText(key, n as number));
    if (sk.penaltyRelief) out.push(`현재 직업의 마이너스 보정(체력·공격·방어 배율) ${skillPercent(sk.penaltyRelief)} 회복 · 여러 개면 가장 큰 값만`);
    if ((jobById(sk.job)?.tier || 0) >= SKILL_FORMULA.signatureTier) out.push(`전용 기술: 계보 밖 직업이 계승하면 ${sk.type === 'active' ? '피해 배율' : '능력치'} ×${number(SKILL_FORMULA.signatureScale)}`);
    if (sk.id === 'firstAid') out.push(`승리 후 최대 체력 ${skillPercent(FIRST_AID_HEAL)} 추가 회복 · 승리당 1회 (무리 사냥 포함)`);
    if (sk.masteryGain) out.push(`${masteryConditionText(sk)} 승리 시 숙련 ×${masteryPerVictory(masteryGainBonus(sk, level))}`);
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
