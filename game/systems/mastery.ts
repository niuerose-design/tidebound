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

/** 승리당 숙련 획득량. base는 기본 획득(보통 1), bonus는 조건부 보너스. 스킬 설명과 실제 지급이 같은 식을 씁니다. */
export const masteryPerVictory = (bonus: number, base = 1) => Math.min(PROGRESSION.maxMasteryPerVictory + base - 1, base + Math.max(0, Math.floor(bonus)));
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
    // 깊은 항해(직전 생 Lv.100 완주) 동안 기본 숙련 +1 → +2. 보너스 한도는 그만큼 함께 올라갑니다.
    const base = s.lifeBonus === 'deep' ? 2 : 1;
    const amount = masteryPerVictory(bonus, base);
    return { amount, base, bonus: amount - base, source };
}
