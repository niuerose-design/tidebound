import type { Enemy, Skill, State } from '../types';
import { FISH } from '../data/world';
import { SKILLS } from '../data/skills';
import { PROGRESSION } from '../data/progression';
import { canUse, masteryGainBonus, skillLevel, skillMastery } from './progression';

export function masteryConditionText(sk: Skill) {
    const rule = sk.masteryGain;
    if (!rule) return '';
    const names = rule.enemyIds?.map(id => FISH.find(f => f.id === id)?.name || id).join(' · ');
    return names ? `${names}${rule.bossOnly ? ' (보스)' : ''}` : rule.bossOnly ? '모든 보스' : '모든 적';
}

/** A victory is always one catch. Bonuses change mastery, never codex counts or SP. */
export function victoryMastery(s: State, enemy: Pick<Enemy, 'id' | 'boss'>) {
    const boss = enemy.boss || FISH.some(f => f.id === enemy.id && f.boss);
    let bonus = 0, source = '';
    for (const id of new Set(s.skills)) {
        const sk = SKILLS.find(x => x.id === id), rule = sk?.masteryGain;
        if (!sk || sk.type !== 'passive' || !rule || !canUse(s, id)) continue;
        if (rule.bossOnly && !boss) continue;
        if (rule.enemyIds && !rule.enemyIds.includes(enemy.id)) continue;
        const extra = masteryGainBonus(sk, skillLevel(sk, s.learned[id], skillMastery(s, id)));
        if (extra > bonus) { bonus = extra; source = sk.name; }
    }
    const amount = Math.min(PROGRESSION.maxMasteryPerVictory, 1 + Math.max(0, Math.floor(bonus)));
    return { amount, bonus: amount - 1, source };
}
