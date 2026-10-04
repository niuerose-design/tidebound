import type { Enemy, Skill, State } from '../types';
import { accountMasteryTwentieths } from '../data/account';
import { FISH } from '../data/world';
import { skillById } from '../data/skills';
import { PROGRESSION } from '../data/progression';
import { researchRank } from '../data/economy';
import { canUse, masteryGainBonus, skillLevel, skillMastery } from './progression';
import { jobById } from '../data/classes';
import { encounterTier, tierMastery } from './meta';

export function masteryConditionText(sk: Skill) {
    const rule = sk.masteryGain;
    if (!rule) return '';
    const names = rule.enemyIds?.map(id => FISH.find(f => f.id === id)?.name || id).join(' · ');
    return names ? `${names}${rule.bossOnly ? ' (보스)' : ''}` : rule.bossOnly ? '모든 보스' : '모든 적';
}

/** 처치당 숙련 획득량. base는 기본 획득(보통 1), bonus는 조건부 보너스. 스킬 설명과 실제 지급이 같은 식을 씁니다. */
export const masteryPerVictory = (bonus: number, base = 1) => Math.min(PROGRESSION.maxMasteryPerVictory + base - 1, base + Math.max(0, Math.floor(bonus)));
/**
 * 숙련의 기억: 숙련 획득 +5%/단계. 숙련은 정수라 소수점은 s.masteryCarry에 1/20 단위 정수로 누적합니다.
 * 난수를 쓰지 않으며, 0단계면 상태를 건드리지 않고 그대로 돌려줍니다.
 */
export function researchMastery(s: State, practice: number) {
    const rank = researchRank(s, 'mastery') + accountMasteryTwentieths(s);
    if (!rank || practice <= 0) return { total: practice, extra: 0 };
    const twentieths = practice * rank + (s.masteryCarry || 0);
    const extra = Math.floor(twentieths / 20);
    s.masteryCarry = twentieths % 20;
    return { total: practice + extra, extra };
}
/** A victory is always one catch. Bonuses change mastery, never codex counts or SP. */
export function victoryMastery(s: State, enemy: Pick<Enemy, 'id' | 'boss'>) {
    const boss = enemy.boss || FISH.some(f => f.id === enemy.id && f.boss);
    let bonus = 0, source = '';
    for (const id of new Set(s.skills)) {
        const sk = skillById(id), rule = sk?.masteryGain;
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
/**
 * 처치 숙련 배율(조건부 스킬 보너스 제외). 전투 보상과 능력치 화면이 같은 식을 씁니다.
 * focus: 계열 집중 카드 ×2 · event: 서버 이벤트 · tide: 해역 난이도(던전은 1) · research: 숙련의 기억 + 계정 몬스터 보너스(+5%/단계).
 */
export function masteryMultipliers(s: State) {
    const focus = s.vows?.focus?.kind === 'tree' && jobById(s.job)?.tree === s.vows.focus.id ? 2 : 1;
    const event = s.event?.mastery || 1;
    const tide = s.dungeon ? 1 : tierMastery(encounterTier(s));
    const research = 1 + (researchRank(s, 'mastery') + accountMasteryTwentieths(s)) / 20;
    const base = s.lifeBonus === 'deep' ? 2 : 1;
    return { base, focus, event, tide, research, total: focus * event * tide * research };
}
