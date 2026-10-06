import type { Enemy, Skill, State } from '../types';
import { accountMastery } from '../data/account';
import { rankPerkLevel } from '../data/rank';
import { FISH } from '../data/world';
import { skillById } from '../data/skills';
import { PROGRESSION } from '../data/progression';
import { researchRank } from '../data/economy';
import { canUse, masteryGainBonus, skillLevel, skillMastery } from './progression';
import { jobById } from '../data/classes';
import { equippedAffixTotal } from './equipment';

export function masteryConditionText(sk: Skill) {
    const rule = sk.masteryGain;
    if (!rule) return '';
    const names = rule.enemyIds?.map(id => FISH.find(f => f.id === id)?.name || id).join(' · ');
    return names ? `${names}${rule.bossOnly ? ' (보스)' : ''}` : rule.bossOnly ? '모든 보스' : '모든 적';
}

/** 처치당 숙련 획득량. base는 기본 획득(보통 1), bonus는 조건부 보너스. 스킬 설명과 실제 지급이 같은 식을 씁니다. */
export const masteryPerVictory = (bonus: number, base = 1) => Math.min(PROGRESSION.maxMasteryPerVictory + base - 1, base + Math.max(0, Math.floor(bonus)));
/**
 * 숙련의 기억: 숙련 획득 +3%/단계(v27.73, 전에는 5%) × 계정 어종 배율(v27.79, 1%/단계 곱연산). 숙련은 정수라 소수점은 s.masteryCarry에 1/100 단위 정수로 누적합니다.
 * 난수를 쓰지 않으며, 0단계면 상태를 건드리지 않고 그대로 돌려줍니다.
 */
/** 연구(+3%/단계)와 계정 어종 배율(×1.01/단계)을 곱한 뒤 1/100 단위 정수로. */
export const masteryResearchHundredths = (s: State) => Math.round(((1 + researchRank(s, 'mastery') * .03) * accountMastery(s) - 1) * 100);
export function researchMastery(s: State, practice: number) {
    const rate = masteryResearchHundredths(s);
    if (!rate || practice <= 0) return { total: practice, extra: 0 };
    const hundredths = practice * rate + (s.masteryCarry || 0);
    const extra = Math.floor(hundredths / 100);
    s.masteryCarry = hundredths % 100;
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
    // 기본 숙련 1 + 계급 특전 숙련 훈련. 보너스 한도는 그만큼 함께 올라갑니다. (v3.23 깊은 모험 +1은 삭제)
    // v3.74 수련 옵션: 기본 숙련 +1(고정)씩.
    const base = 1 + rankPerkLevel(s, 'drill') + Math.floor(equippedAffixTotal(s, 'masteryFlat'));
    const amount = masteryPerVictory(bonus, base);
    return { amount, base, bonus: amount - base, source };
}
/**
 * 처치 숙련 배율(조건부 스킬 보너스 제외). 전투 보상과 능력치 화면이 같은 식을 씁니다.
 * focus: 계열 집중 카드 ×2 · event: 서버 이벤트 · research: 숙련의 기억(+3%/단계) × 계정 어종 배율(×1.01/단계).
 * v27.74 사냥터·던전 난이도 배율은 없습니다(난이도 5 이상의 숙련은 숙련의 까미가 맡음).
 */
export function masteryMultipliers(s: State) {
    const focus = s.vows?.focus?.kind === 'tree' && jobById(s.job)?.tree === s.vows.focus.id ? 2 : 1;
    const event = s.event?.mastery || 1;
    const research = 1 + masteryResearchHundredths(s) / 100;
    // v3.74 수련 옵션: 기본 숙련 +1(고정)씩.
    const base = 1 + rankPerkLevel(s, 'drill') + Math.floor(equippedAffixTotal(s, 'masteryFlat'));
    return { base, focus, event, research, total: focus * event * research };
}
