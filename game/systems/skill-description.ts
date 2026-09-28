import type { Skill, Stats } from '../types';
import { STATUS_TUNING } from '../data/balance';
import { PERCENT_STATS, PROGRESSION, STAT_LABELS } from '../data/progression';
import { effectiveSkill, masteryGainBonus, masteryMilestonesFor, maxSkillLevel, skillMasteryRewards } from './progression';
import { masteryConditionText } from './mastery';

const number = (n: number) => Number(n.toFixed(4)).toLocaleString('ko-KR', { maximumFractionDigits: 4 });
export const skillPercent = (n: number) => `${number(n * 100)}%`;
const pointStats = new Set(['accuracy', 'evasion', 'crit', 'critDamage', 'dropBonus', 'penetration', 'lifesteal']);
export function skillBonusText(key: string, value: number) {
    return `${STAT_LABELS[key as keyof Stats] || key} ${value >= 0 ? '+' : ''}${PERCENT_STATS.has(key) ? skillPercent(value) + (pointStats.has(key) ? 'p' : '') : number(value)}`;
}
/** Describes the effective values used by combat, including HP/MP scaling and follow-ups. */
export function skillEffectLines(sk: Skill, level = 0): string[] {
    const out: string[] = [];
    if (sk.type === 'active') {
        const base = [sk.id === 'oath' ? '물리·마법 공격 중 높은 값' : sk.damageType === 'magic' ? '마법 공격' : '물리 공격'];
        if (sk.scaling === 'hp') base.push(`최대 체력 × ${number(sk.scalingRatio ?? .08)}`);
        if (sk.scaling === 'mana') base.push(`최대 마나 × ${number(sk.scalingRatio ?? .45)}`);
        if (sk.scaling === 'hybrid') base.push(`최대 체력 × ${number(sk.scalingRatio ?? .05)}`, `최대 마나 × ${number((sk.scalingRatio ?? .25) * 2)}`);
        const damage = `${base.length > 1 ? `(${base.join(' + ')})` : base[0]} × ${number(sk.multiplier || 1)}${sk.id === 'crush' ? ' + 물리 방어 × 1.5' : ''}`;
        out.push(`${damage} 피해`);
        if (sk.accuracyBonus) out.push(`이 기술 명중 +${skillPercent(sk.accuracyBonus)}p`);
        if (sk.penetrationBonus) out.push(`이 기술 방어 관통 +${skillPercent(sk.penetrationBonus)}p · 합계 최대 85%`);
        if (sk.cleanseSelf) out.push('발동 시 자신의 출혈·감속 해제');
        if (sk.damageBonusCondition) out.push(`${{ bleeding: '출혈', weakened: '약화', controlled: '침묵·감속' }[sk.damageBonusCondition]} 중인 적에게 직접 피해 +${skillPercent(sk.conditionalDamageBonus || 0)}`);
        if (sk.effect === 'heal') out.push(`체력 ${sk.condition === 'wounded' ? 70 : 80}% 이하일 때 자신의 최대 체력 ${skillPercent(sk.healRatio ?? .22)} 회복 후 공격`);
        if (sk.effect === 'stun') out.push(`명중 시 기절 ${sk.statusTurns ?? 1}턴`);
        if (sk.effect === 'bleed') out.push(`명중 시 출혈 ${sk.statusTurns ?? STATUS_TUNING.bleedTurns}턴 · 턴마다 (${base.join(' + ')}) × 0.22 피해`);
        if (sk.effect === 'weaken') out.push(`명중 시 상대 직접 피해 −25% · ${sk.statusTurns ?? STATUS_TUNING.weakenTurns}턴`);
        if (sk.effect === 'silence') out.push(`명중 시 침묵 ${sk.statusTurns ?? STATUS_TUNING.silenceTurns}턴 · 상대 액티브 사용 불가`);
        if (sk.effect === 'slow') out.push(`명중 시 상대 속도 −${skillPercent(STATUS_TUNING.slowMultiplier)} · ${sk.statusTurns ?? STATUS_TUNING.slowTurns}턴`);
        if (sk.effect === 'haste') out.push(`명중 시 자신의 속도 +${skillPercent(STATUS_TUNING.hasteMultiplier)} · ${sk.statusTurns ?? STATUS_TUNING.hasteTurns}턴`);
        if (sk.effect === 'drain') out.push(`실제로 깎은 체력의 ${skillPercent(sk.drainRatio ?? .25)} 회복`);
        if (sk.extraAttacks) out.push(`추가 공격 ${Math.min(STATUS_TUNING.maxExtraAttacks, sk.extraAttacks)}회 · 각 타격은 위 피해식의 ${skillPercent(sk.extraAttackMultiplier ?? .65)}`);
    }
    for (const [key, n] of Object.entries(sk.bonus || {})) out.push(skillBonusText(key, n));
    if (sk.masteryGain) out.push(`${masteryConditionText(sk)} 승리 시 숙련 ×${Math.min(PROGRESSION.maxMasteryPerVictory, 1 + Math.max(0, Math.floor(masteryGainBonus(sk, level))))}`);
    const rewards = skillMasteryRewards(sk, level + 1);
    if (rewards.ap) out.push(`최대 성장 보상: 장착 AP 한도 +${rewards.ap}`);
    for (const [key, n] of Object.entries(rewards.bonus)) out.push(`최대 성장 보상: ${skillBonusText(key, n)}`);
    return out;
}
export function skillGrowthStages(sk: Skill) {
    const milestones = masteryMilestonesFor(sk);
    return Array.from({ length: maxSkillLevel(sk) + 1 }, (_, level) => {
        const effective = effectiveSkill(sk, level + 1);
        return { level, practice: level ? milestones[level - 1] : 0, effective, effects: skillEffectLines(effective, level) };
    });
}
