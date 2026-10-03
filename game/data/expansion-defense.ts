import type { Job } from './classes';
import type { Skill } from '../types';

/**
 * v25.14 방어 계열 보강: 3개 계보에 11개 직업.
 * - 종거북 수호자(2차)에서 끊기던 '느린 제어 탱커' 갈래를 5차까지: 종갑 수호귀 → 만년 거북 → 세계 거북. 체력 비례 기절기와 두꺼운 껍질(반격) 패시브, 5차 대기만성 패시브.
 * - 성해 기사(2차)에서 끊기던 '복합 흡혈 기사' 갈래를 5차까지: 성해 성기사 → 성해 대성기사 → 빛의 바다. (물리+마법)÷2 흡혈기와 두 공격·체력 패시브.
 * - 새 계보 '소금 파수꾼'(1차~5차): 마법 방어 전문. 마법 방어 비례 피해(scaling 'resist', 결계 친화도 적용)와 침묵·약화·기절을 잇습니다.
 *   방어 계열이 물리 방어·반격·회복에 치우쳐 있던 것을 마법 방어 축으로 넓힙니다.
 * 수치는 같은 차수의 방어 직업(쇠닻 철벽·염수 가시성채·산호 요새·해구 성벽)과 check-job-balance.mjs 중앙값을 기준으로 맞췄습니다.
 */
type NewJob = Omit<Job, 'masteryTarget' | 'masteryBoost'> & Partial<Pick<Job, 'masteryTarget' | 'masteryBoost'>>;
const neutral = { attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0 };
const T4 = { tier: 4, level: 55, rebirth: 1, mastery: 300, masteryTarget: 20000, masteryBoost: .32 };
const T5 = { tier: 5, level: 70, rebirth: 2, mastery: 600, masteryTarget: 30000, masteryBoost: .35 };

export const DEFENSE_JOBS: NewJob[] = [
    // ── 종거북 갈래 (산호 수호자 계보) ──
    { id: 'bellWarden', lineage: 'bellTurtle', name: '종갑 수호귀', title: '종소리가 멎으면 아무도 움직이지 못한다', desc: '체력을 실은 대종 울림으로 멈추고 천년 껍질로 되갚는, 종거북 갈래 3차 제어 탱커입니다.', ...neutral, crit: .01, bonus: { attack: 10, hp: 230, defense: 24, resist: 10 }, tier: 3, level: 40, parent: 'bellTurtle', requires: { vit: 50, luk: 28 }, mastery: 150, requiresSkillMastery: { bellCrash: 2 }, role: '기절·방어', tree: 'defense', penalties: { speed: -8 }, masteryTarget: 9500, masteryBoost: .3 },
    { id: 'eonTurtle', lineage: 'bellTurtle', name: '만년 거북', title: '만 년을 버틴 등껍질', desc: '해일 종타로 기절시키고 만년 등껍질로 버티는 종거북 갈래 환생 후 4차 직업입니다.', ...neutral, attack: 1.03, hp: 1.5, defense: 1.55, resist: 1.35, crit: .01, ...T4, parent: 'bellWarden', requires: { vit: 62, luk: 36 }, requiresSkillMastery: { greatBellToll: 3 }, role: '탱커·기절', tree: 'defense', penalties: { speed: -9 } },
    { id: 'worldTurtle', lineage: 'bellTurtle', name: '세계 거북', title: '등 위에 바다가 얹혀 있다', desc: '세계를 받친 등으로 짓누르고 대지의 등껍질과 대기만성 패시브 만년의 잠을 가진 종거북 갈래 5차 직업입니다. 처음에는 느리고 4차와 비슷한 힘으로 시작하는 대기만성 직업입니다.', ...neutral, attack: 1.02, hp: 1.38, defense: 1.5, resist: 1.25, crit: .01, ...T5, parent: 'eonTurtle', requires: { vit: 76, luk: 44 }, requiresSkillMastery: { tidalToll: 3 }, role: '탱커 최상위·대기만성', tree: 'defense', penalties: { speed: -14 } },
    // ── 성해 기사 갈래 (산호 수호자 계보) ──
    { id: 'holyKnight', lineage: 'paladin', name: '성해 성기사', title: '서약은 두 바다에 닿는다', desc: '물리와 마법을 함께 실어 흡혈하는 서약의 일격과 두 바다의 맹세를 가진 성해 기사 갈래 3차 직업입니다.', ...neutral, crit: .04, bonus: { attack: 30, magic: 30, hp: 160, defense: 14, resist: 14 }, tier: 3, level: 40, parent: 'paladin', requires: { str: 36, wis: 36 }, mastery: 150, requiresSkillMastery: { oath: 2 }, role: '복합·흡혈', tree: 'defense', masteryTarget: 9500, masteryBoost: .3 },
    { id: 'holyCommander', lineage: 'paladin', name: '성해 대성기사', title: '빛을 작살에 싣는다', desc: '빛의 작살로 흡혈하고 성해의 축성으로 두 공격·체력·두 방어를 고르게 올리는 환생 후 4차 직업입니다.', ...neutral, attack: 1.15, magic: 1.15, hp: 1.4, defense: 1.4, resist: 1.4, crit: .04, ...T4, parent: 'holyKnight', requires: { str: 48, wis: 48 }, requiresSkillMastery: { vowStrike: 3 }, role: '복합·흡혈', tree: 'defense' },
    { id: 'lightOcean', lineage: 'paladin', name: '빛의 바다', title: '바다 전체가 빛으로 서약한다', desc: '기절시키며 흡혈하는 성해 강림과 빛의 대양 패시브를 가진 성해 기사 갈래 5차 직업입니다.', ...neutral, attack: 1.2, magic: 1.2, hp: 1.45, defense: 1.5, resist: 1.5, crit: .05, ...T5, parent: 'holyCommander', requires: { str: 60, wis: 60 }, requiresSkillMastery: { lightHarpoon: 3 }, role: '복합 최상위·흡혈', tree: 'defense' },
    // ── 소금 파수꾼 계보 (마법 방어) ──
    { id: 'saltWarden', name: '소금 파수꾼', title: '소금은 저주를 막는다', desc: '마법 방어를 실어 치는 소금 결계와 염장 피부를 익히는 마법 방어 입문 직업입니다.', ...neutral, bonus: { magic: 8, hp: 30, resist: 6 }, tier: 1, level: 10, requires: { wis: 12, vit: 10 }, mastery: 0, role: '마법 방어 입문', tree: 'defense', masteryTarget: 400, masteryBoost: .08 },
    { id: 'stillWarden', name: '정적의 파수꾼', title: '소리가 닿지 않는 결계', desc: '정적 계보의 2차 직업입니다. 정적 파문은 마법 방어에 비례해 때리고 상대를 침묵시킵니다. 정적의 갑옷으로 마법 방어와 물리 방어를 받칩니다.', ...neutral, bonus: { magic: 10, hp: 110, defense: 8, resist: 20 }, tier: 2, level: 25, parent: 'saltWarden', requires: { wis: 28, vit: 24 }, mastery: 75, requiresSkillMastery: { saltWard: 2 }, role: '마법 방어·침묵', tree: 'defense', masteryTarget: 3000, masteryBoost: .18 },
    { id: 'wardKeeper', name: '결계 수호자', title: '겹겹이 두른 결계', desc: '결계를 깨뜨려 약화를 거는 결계 파쇄와 겹결계 패시브로 마법에 끄떡없는 3차 직업입니다.', ...neutral, bonus: { magic: 20, hp: 220, defense: 18, resist: 40 }, tier: 3, level: 40, parent: 'stillWarden', requires: { wis: 42, vit: 40 }, mastery: 150, requiresSkillMastery: { stillRipple: 3 }, role: '마법 방어·약화', tree: 'defense', masteryTarget: 9500, masteryBoost: .3 },
    { id: 'abyssWarder', name: '열수 결계사', title: '심연의 저주도 결계 앞에 멎는다', desc: '열수 결계진으로 기절시키고 열수 결계 패시브로 마법 방어·반격을 올리는 환생 후 4차 직업입니다.', ...neutral, magic: 1.2, hp: 1.4, defense: 1.3, resist: 1.75, ...T4, parent: 'wardKeeper', requires: { wis: 56, vit: 50 }, requiresSkillMastery: { wardBurst: 3 }, role: '마법 방어·기절', tree: 'defense' },
    { id: 'wardDeity', name: '결계의 신', title: '바다 전체를 결계로 감싼다', desc: '소금 파수꾼 계보의 5차 직업입니다. 신의 결계로 상대를 침묵시키고, 신들의 결계로 마법 방어와 체력을 크게 올립니다. 천년 결계는 대기만성 패시브라 처음에는 4차와 비슷하고, 숙련이 쌓일수록 강해집니다.', ...neutral, magic: 1.12, hp: 1.32, defense: 1.22, resist: 1.6, ...T5, parent: 'abyssWarder', penalties: { speed: -6 }, requires: { wis: 68, vit: 62 }, requiresSkillMastery: { abyssWardArray: 3 }, role: '마법 방어 최상위·대기만성', tree: 'defense' },
];

const P = { type: 'passive' as const, chance: 0, cooldown: 0, multiplier: 0, rankEffects: { bonusScale: .3 } };
const A = { type: 'active' as const };
const physical = { damageType: 'physical' as const, manaCost: 0 };
const magic = { damageType: 'magic' as const };
const dual = { damageType: 'split' as const, scaling: 'dual' as const };
const M3 = [1500, 7000, 25000, 60000], M4 = [2500, 12000, 40000, 100000], M5 = [4000, 18000, 60000, 150000];
/** 대기만성: 숙련 10,000 / 100,000 / 500,000. 단계마다 AP가 줄고 보상이 크게 오릅니다(해구 성벽 억겁의 산호와 같은 규칙). */
const LATE = [10000, 100000, 500000];
const lateBloomer = { masteryMilestones: LATE, rankEffects: { bonusScale: 1.6, apReduction: 2 } };

export const DEFENSE_SKILLS: Skill[] = [
    // 종거북 갈래
    { ...A, ...physical, id: 'greatBellToll', name: '대종 울림', desc: '', level: 40, job: 'bellWarden', chance: .26, cooldown: 4, multiplier: 1.9, cost: 4, effect: 'stun', scaling: 'hp', scalingRatio: .03, masteryMilestones: M3 },
    { ...P, id: 'ancientShell', name: '천년 껍질', desc: '두 방어와 반격이 오릅니다.', level: 40, job: 'bellWarden', cost: 3, bonus: { defense: 40, resist: 20, thorns: .2 , swarmFind: 0.8}, masteryMilestones: M3 },
    { ...A, ...physical, id: 'tidalToll', name: '해일 종타', desc: '', level: 55, job: 'eonTurtle', chance: .26, cooldown: 4, multiplier: 2.7, cost: 5, effect: 'stun', scaling: 'hp', scalingRatio: .045, masteryMilestones: M4 },
    { ...P, id: 'eonShell', name: '만년 등껍질', desc: '체력과 두 방어가 크게 오릅니다.', level: 55, job: 'eonTurtle', cost: 3, bonus: { hp: 300, defense: 60, resist: 30 , swarmFind: 1}, masteryMilestones: M4 },
    { ...A, ...physical, id: 'worldBearerSlam', name: '세계를 받친 등', desc: '', level: 70, job: 'worldTurtle', chance: .26, cooldown: 5, multiplier: 4, cost: 6, effect: 'stun', scaling: 'hp', scalingRatio: .06, masteryMilestones: M5 },
    { ...P, id: 'earthShell', name: '대지의 등껍질', desc: '체력·물리 방어·반격이 크게 오릅니다.', level: 70, job: 'worldTurtle', cost: 3, bonus: { hp: 450, defense: 90, thorns: .4 , swarmFind: 1.2}, masteryMilestones: M5 },
    { ...P, ...lateBloomer, id: 'eonSlumber', name: '만년의 잠', desc: '대기만성: 처음에는 AP가 크고 효과가 작지만, 숙련할수록 AP가 줄고 체력·두 방어가 크게 오릅니다.', level: 70, job: 'worldTurtle', cost: 8, bonus: { hp: 200, defense: 15, resist: 15 },
        levelEffects: [{ cost: 8, bonus: { hp: 200, defense: 15, resist: 15 } }, { cost: 7, bonus: { hp: 700, defense: 60, resist: 40 } }, { cost: 5, bonus: { hp: 1600, defense: 140, resist: 100 } }, { cost: 2, bonus: { hp: 3200, defense: 260, resist: 180, thorns: .2 } }] },
    // 성해 기사 갈래
    { ...A, ...dual, id: 'vowStrike', name: '서약의 일격', desc: '', level: 40, job: 'holyKnight', chance: .5, cooldown: 4, multiplier: 2.25, cost: 4, manaCost: 14, effect: 'drain', drainRatio: .12, masteryMilestones: M3 },
    { ...P, id: 'twoSeasOath', name: '두 바다의 맹세', desc: '두 공격·체력·흡혈이 오릅니다.', level: 40, job: 'holyKnight', cost: 3, bonus: { attack: 26, magic: 26, hp: 120, lifesteal: .02 }, masteryMilestones: M3 },
    { ...A, ...dual, id: 'lightHarpoon', name: '빛의 작살', desc: '', level: 55, job: 'holyCommander', chance: .5, cooldown: 4, multiplier: 2.4, cost: 5, manaCost: 20, effect: 'drain', drainRatio: .1, masteryMilestones: M4 },
    { ...P, id: 'sanctifiedSea', name: '성해의 축성', desc: '두 공격·체력·두 방어가 고르게 오릅니다.', level: 55, job: 'holyCommander', cost: 3, bonus: { attack: 45, magic: 45, hp: 220, defense: 30, resist: 30 }, masteryMilestones: M4 },
    { ...A, ...dual, id: 'seaOfLightDescent', name: '성해 강림', desc: '', level: 70, job: 'lightOcean', chance: .5, cooldown: 5, multiplier: 4.1, cost: 6, manaCost: 28, effect: 'stun', masteryMilestones: M5 },
    { ...P, id: 'oceanOfLight', name: '빛의 대양', desc: '두 공격·체력·흡혈·회복량이 오릅니다.', level: 70, job: 'lightOcean', cost: 3, bonus: { attack: 95, magic: 95, hp: 350, lifesteal: .03, healBonus: .2 }, masteryMilestones: M5 },
    // 소금 파수꾼 계보
    { ...A, ...magic, id: 'saltWard', name: '소금 결계', desc: '', level: 10, job: 'saltWarden', chance: .5, cooldown: 4, multiplier: 1.5, cost: 2, manaCost: 7, scaling: 'resist', scalingRatio: 2 },
    { ...P, id: 'brinedSkin', name: '염장 피부', desc: '마법 방어와 체력이 오릅니다.', level: 10, job: 'saltWarden', cost: 2, bonus: { resist: 20, hp: 50 , swarmFind: 0.3, thorns: 0.15} },
    { ...A, ...magic, id: 'stillRipple', name: '정적 파문', desc: '', level: 25, job: 'stillWarden', chance: .5, cooldown: 4, multiplier: 1.6, cost: 3, manaCost: 11, scaling: 'resist', scalingRatio: 2.2, effect: 'silence' },
    { ...P, id: 'stillArmor', name: '정적의 갑옷', desc: '마법 방어·물리 방어·턴당 마나 회복이 오릅니다.', level: 25, job: 'stillWarden', cost: 2, bonus: { resist: 30, defense: 10, manaRegen: 1 , swarmFind: 0.5, thorns: 0.2} },
    { ...A, ...magic, id: 'wardBurst', name: '결계 파쇄', desc: '', level: 40, job: 'wardKeeper', chance: .5, cooldown: 4, multiplier: 1.9, cost: 4, manaCost: 16, scaling: 'resist', scalingRatio: 2.6, effect: 'weaken', masteryMilestones: M3 },
    { ...P, id: 'layeredWard', name: '겹결계', desc: '마법 방어·체력·물리 방어가 오릅니다.', level: 40, job: 'wardKeeper', cost: 3, bonus: { resist: 50, hp: 200, defense: 20 , swarmFind: 0.8, thorns: 0.3}, masteryMilestones: M3 },
    { ...A, ...magic, id: 'abyssWardArray', name: '열수 결계진', desc: '', level: 55, job: 'abyssWarder', chance: .5, cooldown: 4, multiplier: 2.2, cost: 5, manaCost: 22, scaling: 'resist', scalingRatio: 3.4, effect: 'stun', masteryMilestones: M4 },
    { ...P, id: 'deepWard', name: '열수 결계', desc: '마법 방어·체력·물리 방어·반격이 오릅니다.', level: 55, job: 'abyssWarder', cost: 3, bonus: { resist: 70, hp: 280, defense: 35, thorns: .3 , swarmFind: 0.6}, masteryMilestones: M4 },
    { ...A, ...magic, id: 'divineWard', name: '신의 결계', desc: '', level: 70, job: 'wardDeity', chance: .5, cooldown: 5, multiplier: 2.8, cost: 6, manaCost: 30, scaling: 'resist', scalingRatio: 4.2, effect: 'silence', masteryMilestones: M5 },
    { ...P, id: 'wardOfGods', name: '신들의 결계', desc: '마법 방어·체력·물리 방어·흡혈이 크게 오릅니다.', level: 70, job: 'wardDeity', cost: 3, bonus: { resist: 110, hp: 420, defense: 50, lifesteal: .02 , thorns: .35, swarmFind: 1.2}, masteryMilestones: M5 },
    { ...P, ...lateBloomer, id: 'millenniumWard', name: '천년 결계', desc: '대기만성: 처음에는 AP가 크고 효과가 작지만, 숙련할수록 AP가 줄고 마법 방어·체력이 크게 오릅니다.', level: 70, job: 'wardDeity', cost: 8, bonus: { resist: 20, hp: 150 },
        levelEffects: [{ cost: 8, bonus: { resist: 20, hp: 150 } }, { cost: 7, bonus: { resist: 80, hp: 500 } }, { cost: 5, bonus: { resist: 200, hp: 1300, defense: 50 } }, { cost: 2, bonus: { resist: 380, hp: 2600, defense: 110, lifesteal: .02 } }] },
];
export const DEFENSE_BALANCE: Record<string, Partial<Skill>> = Object.fromEntries(
    DEFENSE_SKILLS.filter(sk => sk.type === 'active').map(sk => [sk.id, { chance: sk.chance, multiplier: sk.multiplier, cooldown: sk.cooldown, ...(sk.manaCost ? { manaCost: sk.manaCost } : {}) }]),
);
export const DEFENSE_HINTS: Record<string, string> = {
    bellWarden: '종거북이 종소리 충돌을 두 번째 단계까지 익혔을 때.', eonTurtle: '대종 울림을 끝까지 익힌 수호귀가 한 번의 생을 넘길 때.', worldTurtle: '해일 종타를 끝까지 익히고 두 번의 생을 건넜을 때.',
    holyKnight: '성해 기사가 두 바다의 서약을 두 번째 단계까지 익혔을 때.', holyCommander: '서약의 일격을 끝까지 익힌 성기사가 한 번의 생을 넘길 때.', lightOcean: '빛의 작살을 끝까지 익히고 두 번의 생을 건넜을 때.',
    saltWarden: '정신과 체질을 함께 다진 낚시꾼에게.', stillWarden: '소금 결계를 두 번째 단계까지 익혔을 때.', wardKeeper: '정적 파문을 끝까지 익혔을 때.', abyssWarder: '결계 파쇄를 끝까지 익힌 수호자가 한 번의 생을 넘길 때.', wardDeity: '열수 결계진을 끝까지 익히고 두 번의 생을 건넜을 때.',
};
/** 산호 수호자(1차)에서 갈라지는 두 갈래는 직업 수가 많아져 계보를 따로 묶습니다(1차는 산호 수호자 공통). */
export const DEFENSE_LINEAGES = [
    { id: 'bellTurtle', name: '종거북 계보', tree: 'defense' as const, summary: '산호 수호자에서 갈라져 속도를 버리고 체력 비례 기절과 두꺼운 껍질로 버티는 느린 제어 탱커 계보입니다.' },
    { id: 'paladin', name: '성해 기사 계보', tree: 'defense' as const, summary: '산호 수호자에서 갈라져 물리와 마법을 함께 실어 흡혈하는 복합 기사 계보입니다.' },
    { id: 'saltWarden', name: '소금 파수꾼 계보', tree: 'defense' as const, summary: '마법 방어를 피해로 바꾸고 침묵·약화·기절으로 주문을 막는 결계 계보입니다.' },
];
