import type { Job } from './classes';
import type { Skill } from '../types';

/**
 * v25.14 방어 계열 보강: 3개 계보에 11개 직업.
 * - 카이저 (2차)에서 끊기던 '느린 제어 탱커' 갈래를 5차까지: 카이저 (3차) → 카이저 (4차) → 카이저 (5차). 체력 비례 기절기와 두꺼운 껍질(반격) 패시브, 5차 대기만성 패시브.
 * - 루미너스 (2차)에서 끊기던 '복합 흡혈 기사' 갈래를 5차까지: 루미너스 (3차) → 루미너스 (4차) → 루미너스 (5차). (물리+마법)÷2 흡혈기와 두 공격·체력 패시브.
 * - 새 계보 '호영 (1차)'(1차~5차): 마법 방어 전문. 마법 방어 비례 피해(scaling 'resist', 결계 친화도 적용)와 침묵·약화·기절을 잇습니다.
 *   방어 계열이 물리 방어·반격·회복에 치우쳐 있던 것을 마법 방어 축으로 넓힙니다.
 * 수치는 같은 차수의 방어 직업(페이지·나이트·팔라딘·팔라딘 (5차))과 check-job-balance.mjs 중앙값을 기준으로 맞췄습니다.
 */
type NewJob = Omit<Job, 'masteryTarget' | 'masteryBoost'> & Partial<Pick<Job, 'masteryTarget' | 'masteryBoost'>>;
const neutral = { attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0 };
const T4 = { tier: 4, level: 55, rebirth: 1, mastery: 300, masteryTarget: 20000, masteryBoost: .32 };
const T5 = { tier: 5, level: 70, rebirth: 2, mastery: 600, masteryTarget: 30000, masteryBoost: .35 };

export const DEFENSE_JOBS: NewJob[] = [
    // ── 종거북 갈래 (검사 계보) ──
    { id: 'bellWarden', lineage: 'bellTurtle', name: '종갑 수호귀', title: '종소리가 멎으면 아무도 움직이지 못한다', desc: '체력을 실은 윙 비트로 때리고, 맞을수록 차오르는 모프 게이지로 파이널 피규레이션에 들어가는 종거북 갈래 3차 변신 탱커입니다.', ...neutral, crit: .01, bonus: { attack: 10, hp: 230, defense: 24, resist: 10 }, tier: 3, level: 40, parent: 'bellTurtle', requires: { vit: 50, luk: 28 }, mastery: 150, requiresSkillMastery: { bellCrash: 2 }, role: '기절·방어', tree: 'defense', penalties: { speed: -8 }, masteryTarget: 9500, masteryBoost: .3 },
    { id: 'eonTurtle', lineage: 'bellTurtle', name: '만년 거북', title: '만 년을 버틴 등껍질', desc: '인퍼널 브레스로 때리고 드래곤 스케일로 버티며, 맞을수록 빨리 변신(피해 ×1.5 · 속도 ×1.1 · 흡혈)하는 종거북 갈래 환생 후 4차 직업입니다.', ...neutral, attack: 1.03, hp: 1.5, defense: 1.55, resist: 1.35, crit: .01, ...T4, parent: 'bellWarden', requires: { vit: 62, luk: 36 }, requiresSkillMastery: { greatBellToll: 3 }, role: '탱커·기절', tree: 'defense', penalties: { speed: -9 } },
    { id: 'worldTurtle', lineage: 'bellTurtle', name: '세계 거북', title: '등 위에 바다가 얹혀 있다', desc: '맞을수록 차오르는 모프 게이지가 5에 닿으면 변신하고, 변신 중에만 각성 파이널 피규레이션(기절)으로 짓누르는 종거북 갈래 5차 직업입니다. 노바 템퍼런스(변신 ×1.6 · 흡혈 +20%p)와 대기만성 패시브 드래곤 블레이즈를 가집니다.', ...neutral, attack: 1.02, hp: 1.38, defense: 1.5, resist: 1.25, crit: .01, ...T5, parent: 'eonTurtle', requires: { vit: 76, luk: 44 }, requiresSkillMastery: { tidalToll: 3 }, role: '탱커 최상위·대기만성', tree: 'defense', penalties: { speed: -14 } },
    // ── 루미너스 (2차) 갈래 (v3.140 매지션 계보 · 마법 계수 → 물리 피해 역전 딜러) ──
    { id: 'holyKnight', lineage: 'paladin', name: '성해 마도사', title: '서약은 두 바다에 닿는다', desc: '마법 공격 계수로 물리 피해를 주고 흡수하는 라이트 리플렉션과 이퀄리브리엄을 가진 루미너스 (2차) 갈래 3차 직업입니다.', ...neutral, crit: .04, bonus: { magic: 60, hp: 160, resist: 14 }, tier: 3, level: 40, parent: 'paladin', requires: { int: 36, wis: 30 }, mastery: 150, requiresSkillMastery: { oath: 2 }, role: '역전 딜러·흡수', tree: 'hybrid', masteryTarget: 9500, masteryBoost: .3 },
    { id: 'holyCommander', lineage: 'paladin', name: '성해 대마도사', title: '마력이 작살이 된다', desc: '아포칼립스로 흡수하고 다크 크레센도로 마법 공격 · 체력 · 물리 방어 관통을 올리는 환생 후 4차 직업입니다.', ...neutral, attack: 1, magic: 1.4, hp: 1.2, defense: 1.08, resist: 1.2, crit: .04, ...T4, parent: 'holyKnight', requires: { int: 48, wis: 40 }, requiresSkillMastery: { vowStrike: 3 }, role: '역전 딜러·흡수', tree: 'hybrid' },
    { id: 'lightOcean', lineage: 'paladin', name: '빛의 바다', title: '바다 전체가 빛으로 서약한다', desc: '기절시키며 흡수하는 진리의 문과 리버레이션 오브 패시브를 가진 루미너스 (2차) 갈래 5차 직업입니다. 마법 공격 계수로 물리 피해를 줍니다.', ...neutral, attack: 1, magic: 1.7, hp: 1.25, defense: 1.1, resist: 1.25, crit: .05, ...T5, parent: 'holyCommander', requires: { int: 60, wis: 50 }, requiresSkillMastery: { lightHarpoon: 3 }, role: '역전 딜러 최상위·흡수', tree: 'hybrid' },
    // ── 호영 계보 (마법 방어) ──
    { id: 'saltWarden', name: '소금 파수꾼', title: '소금은 저주를 막는다', desc: '마법 방어를 실어 치는 귀화부와 선기: 천지인 환영을 익히는 마법 방어 입문 직업입니다.', ...neutral, bonus: { magic: 8, hp: 30, resist: 6 }, tier: 1, level: 10, requires: { wis: 12, vit: 10 }, mastery: 0, role: '마법 방어 입문', tree: 'defense', masteryTarget: 400, masteryBoost: .08 },
    { id: 'stillWarden', name: '정적의 파수꾼', title: '소리가 닿지 않는 결계', desc: '정적 계보의 2차 직업입니다. 금고봉은 마법 방어에 비례해 때리고 상대를 침묵시킵니다. 선기: 극대 분신난무로 마법 방어와 물리 방어를 받칩니다.', ...neutral, bonus: { magic: 10, hp: 110, defense: 8, resist: 20 }, tier: 2, level: 25, parent: 'saltWarden', requires: { wis: 28, vit: 24 }, mastery: 75, requiresSkillMastery: { saltWard: 2 }, role: '마법 방어·침묵', tree: 'defense', masteryTarget: 3000, masteryBoost: .18 },
    { id: 'wardKeeper', name: '결계 수호자', title: '겹겹이 두른 결계', desc: '결계를 깨뜨려 약화를 거는 지진쇄와 선기: 강림 괴력난신 패시브로 마법에 끄떡없는 3차 직업입니다.', ...neutral, bonus: { magic: 20, hp: 220, defense: 18, resist: 40 }, tier: 3, level: 40, parent: 'stillWarden', requires: { wis: 42, vit: 40 }, mastery: 150, requiresSkillMastery: { stillRipple: 3 }, role: '마법 방어·약화', tree: 'defense', masteryTarget: 9500, masteryBoost: .3 },
    { id: 'abyssWarder', name: '열수 결계사', title: '심연의 저주도 결계 앞에 멎는다', desc: '산령소환으로 기절시키고 부적 도술 패시브로 마법 방어·반격을 올리는 환생 후 4차 직업입니다.', ...neutral, magic: 1.2, hp: 1.4, defense: 1.3, resist: 1.75, ...T4, parent: 'wardKeeper', requires: { wis: 56, vit: 50 }, requiresSkillMastery: { wardBurst: 3 }, role: '마법 방어·기절', tree: 'defense' },
    { id: 'wardDeity', name: '결계의 신', title: '바다 전체를 결계로 감싼다', desc: '호영 계보의 5차 직업입니다. 선기: 분신 둔갑 태을선인으로 상대를 침묵시키고, 선기: 천지인으로 마법 방어와 체력을 크게 올립니다. 천년 결계는 대기만성 패시브라 처음에는 4차와 비슷하고, 숙련이 쌓일수록 강해집니다.', ...neutral, magic: 1.12, hp: 1.32, defense: 1.22, resist: 1.6, ...T5, parent: 'abyssWarder', penalties: { speed: -6 }, requires: { wis: 68, vit: 62 }, requiresSkillMastery: { abyssWardArray: 3 }, role: '마법 방어 최상위·대기만성', tree: 'defense' },
];

const P = { type: 'passive' as const, chance: 0, cooldown: 0, multiplier: 0, rankEffects: { bonusScale: .3 } };
const A = { type: 'active' as const };
const physical = { damageType: 'physical' as const, manaCost: 0 };
const magic = { damageType: 'magic' as const };
/** v3.140 루미너스: 마법 공격 계수 → 물리 피해(물리 방어로 막힘). 역전 계보(아크)의 반대 방향. */
const arcaneBlow = { damageType: 'physical' as const, scaling: 'swap' as const };
const M3 = [1500, 7000, 25000, 60000], M4 = [2500, 12000, 40000, 100000], M5 = [4000, 18000, 60000, 150000];
/** 대기만성: 숙련 10,000 / 100,000 / 500,000(v27.95부터 5차 ×25 = 25만 / 250만 / 1,250만). 단계마다 AP가 줄고 보상이 크게 오릅니다(팔라딘 (5차) 어드밴스드 차지와 같은 규칙). */
const LATE = [10000, 100000, 500000];
const lateBloomer = { masteryMilestones: LATE, rankEffects: { bonusScale: 1.6, apReduction: 2 } };

export const DEFENSE_SKILLS: Skill[] = [
    // 종거북 갈래
    { ...A, ...physical, id: 'greatBellToll', name: '대종 울림', desc: '', level: 40, job: 'bellWarden', chance: .26, cooldown: 4, multiplier: 1.9, cost: 4, scaling: 'hp', scalingRatio: .03, masteryMilestones: M3 },
    { ...P, id: 'ancientShell', name: '천년 껍질', desc: '두 방어가 오르고, 맞을 때마다 충전이 쌓여 충전 7에 파이널 피규레이션(피해 ×1.4 · 흡혈 +12%p, 4턴)으로 변신합니다.', level: 40, job: 'bellWarden', cost: 3, bonus: { defense: 60, resist: 30, swarmFind: 0.8 }, chargeOnHit: 1, spectre: { need: 7, turns: 4, damageMultiplier: 1.4, name: '파이널 피규레이션', stats: { lifesteal: .12 } }, masteryMilestones: M3 },
    { ...A, ...physical, id: 'tidalToll', name: '해일 종타', desc: '', level: 55, job: 'eonTurtle', chance: .26, cooldown: 4, multiplier: 2.7, cost: 5, scaling: 'hp', scalingRatio: .045, masteryMilestones: M4 },
    { ...P, id: 'eonShell', name: '만년 등껍질', desc: '체력과 두 방어가 크게 오르고, 맞을 때마다 충전이 쌓여 충전 6에 파이널 피규레이션(피해 ×1.5 · 속도 ×1.1 · 흡혈 +15%p, 4턴)으로 변신합니다.', level: 55, job: 'eonTurtle', cost: 3, bonus: { hp: 300, defense: 90, resist: 45, swarmFind: 1 }, chargeOnHit: 1, spectre: { need: 6, turns: 4, damageMultiplier: 1.5, speedMultiplier: 1.1, name: '파이널 피규레이션', stats: { lifesteal: .15 } }, masteryMilestones: M4 },
    { ...A, ...physical, id: 'worldBearerSlam', name: '세계를 받친 등', desc: '', level: 70, job: 'worldTurtle', chance: .26, cooldown: 5, multiplier: 4, cost: 6, effect: 'stun', scaling: 'hp', scalingRatio: .06, requiresBuff: 'spectre', masteryMilestones: M5 },
    // v3.109 카이저 상향(미하일 · 팔라딘과 같은 처방): 노바 템퍼런스 치명타 +8%p · 치명 피해 +0.4(계보 직업 치명 0.01).
    { ...P, id: 'earthShell', name: '대지의 등껍질', desc: '체력 · 물리 방어 · 치명타 · 치명 피해가 크게 오르고, 맞을 때마다 충전이 쌓여 충전 5에 파이널 피규레이션(피해 ×1.6 · 속도 ×1.15 · 흡혈 +20%p, 4턴)으로 변신합니다.', level: 70, job: 'worldTurtle', cost: 3, bonus: { hp: 450, defense: 130, swarmFind: 1.2, crit: .08, critDamage: .4, resist: 40 }, chargeOnHit: 1, spectre: { need: 5, turns: 4, damageMultiplier: 1.6, speedMultiplier: 1.15, name: '파이널 피규레이션', stats: { lifesteal: .2 } }, masteryMilestones: M5 },
    { ...P, ...lateBloomer, id: 'eonSlumber', name: '만년의 잠', desc: '대기만성: 처음에는 AP가 크고 효과가 작지만, 숙련할수록 AP가 줄고 체력·두 방어가 크게 오릅니다.', level: 70, job: 'worldTurtle', cost: 8, bonus: { hp: 200, defense: 25, resist: 25 },
        levelEffects: [{ cost: 8, bonus: { hp: 200, defense: 15, resist: 15 } }, { cost: 7, bonus: { hp: 700, defense: 60, resist: 40 } }, { cost: 5, bonus: { hp: 1600, defense: 140, resist: 100 } }, { cost: 2, bonus: { hp: 3200, defense: 260, resist: 180, thorns: .2 } }] },
    // 루미너스 (2차) 갈래
    // v3.100 루미너스 상향: 라이트 리플렉션 배율 2.25 → 2.8, 아포칼립스 배율 2.4 → 3 · 추가 공격 1회(복합 피해라 기술 한 번이 공격력의 1.5배에 그쳤음).
    // v3.140 재개편: 모두 마법 계수 → 물리 피해(arcaneBlow). 패시브는 마법 공격 고정값 + 물리 방어 관통(지능만 올려도 물리 방어 약한 적을 뚫는 그림).
    { ...A, ...arcaneBlow, id: 'vowStrike', name: '서약의 빛살', desc: '', level: 40, job: 'holyKnight', chance: .5, cooldown: 4, multiplier: 3.8, cost: 4, manaCost: 14, effect: 'drain', drainRatio: .12, masteryMilestones: M3 },
    { ...P, id: 'twoSeasOath', name: '두 바다의 맹세', desc: '마법 공격·체력·흡혈이 오릅니다.', level: 40, job: 'holyKnight', cost: 3, bonus: { magic: 52, hp: 120, lifesteal: .02 }, masteryMilestones: M3 },
    { ...A, ...arcaneBlow, id: 'lightHarpoon', name: '빛의 작살', desc: '', level: 55, job: 'holyCommander', chance: .5, cooldown: 4, multiplier: 4, cost: 5, manaCost: 20, effect: 'drain', drainRatio: .1, extraAttacks: 1, masteryMilestones: M4 },
    { ...P, id: 'sanctifiedSea', name: '성해의 축성', desc: '마법 공격·체력·물리 방어 관통이 오릅니다.', level: 55, job: 'holyCommander', cost: 3, bonus: { magic: 90, hp: 220, penetration: .06, resist: 30 }, masteryMilestones: M4 },
    { ...A, ...arcaneBlow, id: 'seaOfLightDescent', name: '성해 강림', desc: '', level: 70, job: 'lightOcean', chance: .5, cooldown: 5, multiplier: 5.4, cost: 6, manaCost: 28, effect: 'stun', masteryMilestones: M5 },
    { ...P, id: 'oceanOfLight', name: '빛의 대양', desc: '마법 공격·체력·흡혈·물리 방어 관통이 오릅니다.', level: 70, job: 'lightOcean', cost: 3, bonus: { magic: 190, hp: 350, lifesteal: .03, penetration: .06 }, masteryMilestones: M5 },
    // 호영 계보
    { ...A, ...magic, id: 'saltWard', name: '소금 결계', desc: '', level: 10, job: 'saltWarden', chance: .5, cooldown: 4, multiplier: 1.5, cost: 2, manaCost: 7, scaling: 'resist', scalingRatio: 2 },
    { ...P, id: 'brinedSkin', name: '염장 피부', desc: '마법 방어와 체력이 오릅니다.', level: 10, job: 'saltWarden', cost: 2, bonus: { resist: 30, hp: 50 , swarmFind: 0.3, thorns: 0.15, defense: 8 } },
    { ...A, ...magic, id: 'stillRipple', name: '정적 파문', desc: '', level: 25, job: 'stillWarden', chance: .5, cooldown: 4, multiplier: 1.6, cost: 3, manaCost: 11, scaling: 'resist', scalingRatio: 2.2, effect: 'silence' },
    { ...P, id: 'stillArmor', name: '정적의 갑옷', desc: '마법 방어·물리 방어·턴당 마나 회복이 오릅니다.', level: 25, job: 'stillWarden', cost: 2, bonus: { resist: 45, defense: 18, manaRegen: 1 , swarmFind: 0.5, thorns: 0.2} },
    { ...A, ...magic, id: 'wardBurst', name: '결계 파쇄', desc: '', level: 40, job: 'wardKeeper', chance: .5, cooldown: 4, multiplier: 1.9, cost: 4, manaCost: 16, scaling: 'resist', scalingRatio: 2.6, effect: 'weaken', masteryMilestones: M3 },
    { ...P, id: 'layeredWard', name: '겹결계', desc: '마법 방어·체력·물리 방어가 오릅니다.', level: 40, job: 'wardKeeper', cost: 3, bonus: { resist: 75, hp: 200, defense: 30 , swarmFind: 0.8, thorns: 0.3}, masteryMilestones: M3 },
    { ...A, ...magic, id: 'abyssWardArray', name: '열수 결계진', desc: '', level: 55, job: 'abyssWarder', chance: .5, cooldown: 4, multiplier: 2.2, cost: 5, manaCost: 22, scaling: 'resist', scalingRatio: 3.4, effect: 'stun', masteryMilestones: M4 },
    { ...P, id: 'deepWard', name: '열수 결계', desc: '마법 방어·체력·물리 방어·반격이 오릅니다.', level: 55, job: 'abyssWarder', cost: 3, bonus: { resist: 100, hp: 280, defense: 50, thorns: .3 , swarmFind: 0.6}, masteryMilestones: M4 },
    { ...A, ...magic, id: 'divineWard', name: '신의 결계', desc: '', level: 70, job: 'wardDeity', chance: .5, cooldown: 5, multiplier: 2.8, cost: 6, manaCost: 30, scaling: 'resist', scalingRatio: 4.2, effect: 'silence', masteryMilestones: M5 },
    { ...P, id: 'wardOfGods', name: '신들의 결계', desc: '마법 방어·체력·물리 방어·흡혈이 크게 오릅니다.', level: 70, job: 'wardDeity', cost: 3, bonus: { resist: 150, hp: 420, defense: 70, lifesteal: .02 , thorns: .35, swarmFind: 1.2}, masteryMilestones: M5 },
    { ...P, ...lateBloomer, id: 'millenniumWard', name: '천년 결계', desc: '대기만성: 처음에는 AP가 크고 효과가 작지만, 숙련할수록 AP가 줄고 마법 방어·체력이 크게 오릅니다.', level: 70, job: 'wardDeity', cost: 8, bonus: { resist: 30, hp: 150, defense: 10 },
        levelEffects: [{ cost: 8, bonus: { resist: 20, hp: 150 } }, { cost: 7, bonus: { resist: 80, hp: 500 } }, { cost: 5, bonus: { resist: 200, hp: 1300, defense: 50 } }, { cost: 2, bonus: { resist: 380, hp: 2600, defense: 110, lifesteal: .02 } }] },
];
export const DEFENSE_BALANCE: Record<string, Partial<Skill>> = Object.fromEntries(
    DEFENSE_SKILLS.filter(sk => sk.type === 'active').map(sk => [sk.id, { chance: sk.chance, multiplier: sk.multiplier, cooldown: sk.cooldown, ...(sk.manaCost ? { manaCost: sk.manaCost } : {}) }]),
);
export const DEFENSE_HINTS: Record<string, string> = {
    bellWarden: '종거북이 기가 슬래셔를 두 번째 단계까지 익혔을 때.', eonTurtle: '윙 비트를 끝까지 익힌 수호귀가 한 번의 생을 넘길 때.', worldTurtle: '인퍼널 브레스를 끝까지 익히고 두 번의 생을 건넜을 때.',
    holyKnight: '루미너스 (2차)가 라이트 블레싱을 두 번째 단계까지 익혔을 때.', holyCommander: '라이트 리플렉션을 끝까지 익힌 성기사가 한 번의 생을 넘길 때.', lightOcean: '아포칼립스를 끝까지 익히고 두 번의 생을 건넜을 때.',
    saltWarden: '정신과 체질을 함께 다진 모험가에게.', stillWarden: '귀화부를 두 번째 단계까지 익혔을 때.', wardKeeper: '금고봉을 끝까지 익혔을 때.', abyssWarder: '지진쇄를 끝까지 익힌 수호자가 한 번의 생을 넘길 때.', wardDeity: '산령소환을 끝까지 익히고 두 번의 생을 건넜을 때.',
};
/** 검사(1차)에서 갈라지는 두 갈래는 직업 수가 많아져 계보를 따로 묶습니다(1차는 검사 공통). */
export const DEFENSE_LINEAGES = [
    { id: 'bellTurtle', name: '종거북 계보', tree: 'defense' as const, summary: '검사에서 갈라져 두꺼운 껍질로 맞아 주며 모프 게이지를 채우고, 가득 차면 파이널 피규레이션으로 변신해 되갚는 변신 탱커 계보입니다.' },
    { id: 'paladin', name: '성해 술사 계보', tree: 'hybrid' as const, summary: '마법사 갈래에서 나와 빛의 마력을 작살에 실어 물리 피해를 주는 역전 딜러 계보입니다. 피해의 일부를 흡수해 버팁니다.' },
    { id: 'saltWarden', name: '소금 파수꾼 계보', tree: 'defense' as const, summary: '마법 방어를 피해로 바꾸고 침묵·약화·기절으로 주문을 막는 결계 계보입니다.' },
];
