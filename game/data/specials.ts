/**
 * v3.65 공개 특수 직업(docs/concept.md 11.7-2). 비밀(game/secret)에서 공개로 옮긴 직업과 그 스킬을 완성된 모양 그대로 둡니다.
 * - 유리 대포: 玄과 함께 ‘제약’ 계보(공개 특수 직업). v3.172 둘 다 공개 히든(hidden + open): 히든 표시는 달고 처음부터 드러납니다.
 * - 윤회의 나그네: 초보자 계보의 환생 가지(환생 1회, 공개).
 * classes.ts·skills.ts가 표를 만든 뒤 registerJobs·registerSkills로 더합니다(화면·서버 모두).
 */
import type { Job, Lineage } from './classes';
import type { Skill } from '../types';

export const SPECIAL_JOBS: Job[] = [
    {id: 'glassHarpooner', subRole: 'physical', name: '유리 대포', title: '한 번 맞으면 깨지는 몸', desc: '최대 체력이 1%뿐인 제약 직업입니다. 항상 먼저 움직이고, 쓰러질 피해를 전투당 두 번 체력 1로 버티며, 회피 +30%p로 피합니다. 물리 공격 ×2.2·치명타 +15%로 맞기 전에 끝내는 결투·계승용 직업입니다.', attack: 2.2, magic: 1, hp: 0.01, defense: 1, resist: 1, crit: 0.15, tier: 1, level: 10, requires: {dex: 14, luk: 14}, mastery: 0, role: '제약·유리 대포', tree: 'mystery', lineage: 'restraint', hidden: true, open: true, hint: '한 대도 맞을 수 없는 몸으로 먼저 찌르는 모험가.', constraint: {label: '유리 몸', desc: '최대 체력 1%. 선공·최후의 버팀·회피로만 살아남습니다.', devices: {firstStrike: true, lastStand: {charges: 2}, evasion: 0.3}}, masteryTarget: 300, masteryBoost: 0.08},
    {id: 'rebirthFisher', subRole: 'physical', name: '윤회의 나그네', title: '다시 내딛는 첫걸음', desc: '초보자 계보의 환생 가지. 윤회의 일격을 배우는 환생 전용 직업. 회복을 동반하는 공격기를 다음 삶의 편성에 남깁니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: {attack: 1, hp: 5}, tier: 1, level: 10, rebirth: 1, requires: {str: 10, wis: 12}, mastery: 0, role: '환생 가지·흡혈', tree: 'hybrid', lineage: 'fisher', masteryTarget: 6000, masteryBoost: 0.15, hint: '한 번 환생한 뒤, 처음의 걸음을 다시 내딛을 때.'},
];
export const SPECIAL_SKILLS: Skill[] = [
    {id: 'soulHook', name: '윤회의 일격', desc: '(물리 공격) × 1.9 피해. 실제 피해의 15% 회복.', type: 'active', level: 10, rebirth: 1, chance: 0.24, cooldown: 3, multiplier: 1.9, effect: 'drain', cost: 4, manaCost: 0, job: 'rebirthFisher', rankEffects: {chanceIncrease: 0.02, multiplierScale: 0.05, manaReduction: 0, cooldownReduction: 0}, masteryMilestones: [250, 1200, 4500, 14000], drainRatio: 0.15},
    {id: 'glassLance', name: '유리 창', desc: '(물리 공격) × 2.4 피해. 빈사 상태의 적에게 피해 +50%.', type: 'active', level: 10, job: 'glassHarpooner', chance: 0.3, cooldown: 4, multiplier: 2.4, cost: 3, damageBonusCondition: 'lowHp', conditionalDamageBonus: 0.5, rankEffects: {multiplierScale: 0.05, chanceIncrease: 0.02, manaReduction: 0, cooldownReduction: 0}, masteryMilestones: [250, 1200, 4500, 14000], manaCost: 0},
    {id: 'glassHeart', name: '유리 심장', desc: '치명타 +10%p, 치명 피해 +30%p. 계승하면 어느 직업이든 한 방이 매워집니다.', type: 'passive', level: 10, job: 'glassHarpooner', chance: 0, cooldown: 0, multiplier: 0, cost: 2, bonus: {crit: 0.1, critDamage: 0.3}, rankEffects: undefined, masteryMilestones: [250, 1200, 4500, 14000]},
];
/** 제약 계보(공개). 玄(glyphMonk)도 이 계보입니다. v3.135 히든 망인(undead, game/secret)도 이 계보로 돌아왔습니다. */
export const RESTRAINT_LINEAGE: Lineage = { id: 'restraint', name: '제약 계보', tree: 'mystery', summary: '일부러 큰 제약을 걸고 그 대가로 강해지는 특수 직업입니다.' };
