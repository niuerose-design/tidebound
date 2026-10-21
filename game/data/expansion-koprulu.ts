import type { Job, Lineage } from './classes';
import type { Skill } from '../types';

/**
 * v3.367 코프룰루 구역(제4장 세계): 판게아 바다 너머 별의 바다. tools/content-kit 1차 생성(STYLE_GUIDE 9절 결정)에서 옮겼습니다.
 * 이름은 판게아 고유(원작 고유명사 없음). 직업 계보 2개 × 5차, 직업마다 액티브 3 + 패시브 3(1·2차는 fullKit).
 *
 * 강철 보병 계보(물리): 강철 보병 → 궤도 저격수 → 강습 대장 → 전선 사령관 → 성단 원수.
 *   콤보: 총검 찌르기(출혈) → 상처 조준(출혈 중 +60%) / 제압 연사·궤도 섬광(감속·기절) → 돌파 돌격(제어 중 +50%) / 표적 지정(약화) → 처형 명령(약화 중 +50%).
 * 군체 조율사 계보(상태이상): 포자 수집가 → 군체 조율사 → 신경 지배자 → 둥지 군주 → 진화 설계자.
 *   콤보: 독 포자(중독) → 포자 폭발·대파열(상태이상 수만큼) + 독샘·포자 구름·완성된 균주(중독 피해·중첩) / 신경 자극(약화) → 산성 비(약화 중 +50%).
 * 수치는 STYLE_GUIDE 6.5 표(기존 550개 차수별 중앙값) 안: 물리 액티브 chance ≤ .30, 마법 ≥ .45(마나 원값 ×4는 skill-balance), AP 2/3/4/5/6 · 패시브 2/2/3/3/3.
 * 5차 액티브는 각성 보정 전 값(awakenSkill이 재사용 10턴 · 배율 재계산). 4·5차 배율은 applyCoreRework가 핵심 패시브로 옮깁니다.
 */
type NewJob = Omit<Job, 'masteryTarget' | 'masteryBoost'> & Partial<Pick<Job, 'masteryTarget' | 'masteryBoost'>>;
const neutral = { attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0 };
/** v3.373 코프룰루 구역은 사냥터(환생 50회)와 전직 조건을 맞춥니다: 1~3차는 환생 50회부터, 4 · 5차는 보스 던전(함교 52 · 군체의 심장 62)과 같은 횟수. 환생 50회 전에는 계보를 미리 볼 수만 있습니다. */
export const KOPRULU_REBIRTH = 50, KOPRULU_T4_REBIRTH = 52, KOPRULU_T5_REBIRTH = 62;
const T4 = { level: 55, rebirth: KOPRULU_T4_REBIRTH, mastery: 300, masteryTarget: 20000, masteryBoost: .32 };
const T5 = { level: 70, rebirth: KOPRULU_T5_REBIRTH, mastery: 600, masteryTarget: 30000, masteryBoost: .35 };

export const KOPRULU_LINEAGES: Lineage[] = [
    { id: 'irTrooper', name: '강철 보병 계보', tree: 'physical', world: 'koprulu', summary: '소총과 총검, 참호에서 시작해 궤도 타격을 부르는 성단 원수에 이르는 물리 계보입니다.' },
    { id: 'hvSporeGatherer', name: '군체 조율사 계보', tree: 'status', world: 'koprulu', summary: '포자와 독으로 시작해 군체의 진화를 설계하는 상태이상 계보입니다.' },
];

export const KOPRULU_JOBS: NewJob[] = [
    { id: 'irTrooper', name: '강철 보병', title: '첫 번째 교범', desc: '잿빛 궤도의 폐선에서 주운 교범으로 싸우는 보병. 소총과 총검, 참호로 버팁니다.', ...neutral, bonus: { attack: 3 }, crit: .02, tier: 1, level: 10, rebirth: KOPRULU_REBIRTH, requires: { str: 12, dex: 10 }, mastery: 0, role: '물리·사격 입문', tree: 'physical', masteryTarget: 400, masteryBoost: .08, fullKit: true },
    { id: 'irOrbitSniper', name: '궤도 저격수', title: '바람이 없는 곳의 한 발', desc: '궤도 위에서는 바람이 없습니다. 멀리서 정확히, 출혈 중인 적을 끝냅니다.', ...neutral, bonus: { attack: 36, hp: 20 }, crit: .12, tier: 2, level: 25, rebirth: KOPRULU_REBIRTH, parent: 'irTrooper', requires: { str: 28, dex: 26 }, mastery: 75, requiresSkillMastery: { irBayonet: 2 }, role: '물리·저격·출혈', tree: 'physical', masteryTarget: 2600, masteryBoost: .18, fullKit: true },
    { id: 'irAssaultCaptain', name: '강습 대장', title: '먼저 뛰어드는 사람', desc: '점사와 제압 연사로 길을 열고 돌파 돌격으로 끝내는 강습 부대의 대장.', ...neutral, bonus: { attack: 80, hp: 70, defense: 1 }, crit: .15, tier: 3, level: 40, rebirth: KOPRULU_REBIRTH, parent: 'irOrbitSniper', requires: { str: 45, dex: 35 }, mastery: 150, requiresSkillMastery: { irLongShot: 3 }, role: '물리·연타·제어', tree: 'physical', masteryTarget: 9500, masteryBoost: .3 },
    { id: 'irFrontCommander', name: '전선 사령관', title: '표적을 가리키는 손', desc: '지원 포격과 표적 지정으로 전선을 지휘하는 사령관. 약화된 적에게 처형 명령을 내립니다.', ...neutral, attack: 1.43, hp: 1.21, defense: 1.21, resist: 1.11, crit: .1, tier: 4, ...T4, parent: 'irAssaultCaptain', requires: { str: 55, vit: 35 }, requiresSkillMastery: { irBreach: 3 }, role: '물리·지휘·처형', tree: 'physical' },
    { id: 'irClusterMarshal', name: '성단 원수', title: '별의 바다를 건너는 자', desc: '코프룰루 구역의 모든 전선을 쥔 원수. 궤도 타격과 최후의 돌격으로 별의 바다를 건넙니다.', ...neutral, attack: 1.53, hp: 1.25, defense: 1.14, resist: 1.14, crit: .15, tier: 5, ...T5, parent: 'irFrontCommander', requires: { str: 70, vit: 40, dex: 40 }, requiresSkillMastery: { irExecuteOrder: 3 }, role: '물리 최상위·궤도 타격', tree: 'physical' },
    { id: 'hvSporeGatherer', name: '포자 수집가', title: '손에 붙은 포자', desc: '군체 늪지의 포자가 뜻을 조금 따르기 시작한 수집가. 포자를 쏘고 독을 심습니다.', ...neutral, bonus: { magic: 4 }, crit: .02, tier: 1, level: 10, rebirth: KOPRULU_REBIRTH, requires: { int: 12, wis: 10 }, mastery: 0, role: '상태이상·중독 입문', tree: 'status', masteryTarget: 400, masteryBoost: .08, fullKit: true },
    { id: 'hvHiveTuner', name: '군체 조율사', title: '군체가 손끝을 따른다', desc: '신경을 자극해 약화시키고 상태이상이 쌓인 적을 포자 폭발로 터뜨리는 조율사.', ...neutral, bonus: { magic: 34, resist: 3 }, crit: .03, tier: 2, level: 25, rebirth: KOPRULU_REBIRTH, parent: 'hvSporeGatherer', requires: { int: 30, wis: 24 }, mastery: 75, requiresSkillMastery: { hvToxicSpore: 2 }, role: '상태이상·약화·폭발', tree: 'status', masteryTarget: 2600, masteryBoost: .18, fullKit: true },
    { id: 'hvNerveDominator', name: '신경 지배자', title: '말을 끊고 생각을 끊는다', desc: '신경 지배로 침묵시키고 군체를 소집해 몰아치는 지배자. 산성 비는 약화된 적에게 더 아픕니다.', ...neutral, bonus: { magic: 98, resist: 6 }, crit: .05, tier: 3, level: 40, rebirth: KOPRULU_REBIRTH, parent: 'hvHiveTuner', requires: { int: 46, wis: 36 }, mastery: 150, requiresSkillMastery: { hvNerveJolt: 3 }, role: '상태이상·침묵·소집', tree: 'status', masteryTarget: 9500, masteryBoost: .3 },
    { id: 'hvNestLord', name: '둥지 군주', title: '둥지가 흘린 것을 되찾는다', desc: '산란의 포식으로 체력을 빼앗고 부식 독침으로 방어를 녹이는 둥지의 군주.', ...neutral, magic: 1.5, hp: 1.16, defense: 1.1, resist: 1.21, crit: .06, tier: 4, ...T4, parent: 'hvNerveDominator', requires: { int: 56, wis: 44 }, requiresSkillMastery: { hvAcidRain: 3 }, role: '상태이상·부식·흡수', tree: 'status' },
    { id: 'hvEvoArchitect', name: '진화 설계자', title: '완성된 균주', desc: '군체의 진화를 설계하는 자. 대파열과 정점 독소로 상태이상이 쌓인 적을 한 번에 끝냅니다.', ...neutral, magic: 1.6, hp: 1.22, defense: 1.06, resist: 1.3, crit: .08, tier: 5, ...T5, parent: 'hvNestLord', requires: { int: 72, wis: 56 }, requiresSkillMastery: { hvCorrosiveSting: 3 }, role: '상태이상 최상위·대파열', tree: 'status' },
];

const P = { type: 'passive' as const, chance: 0, cooldown: 0, multiplier: 0, rankEffects: { bonusScale: .3 } };
const A = { type: 'active' as const };
const physical = { damageType: 'physical' as const, manaCost: 0 };
const magic = { damageType: 'magic' as const };
const split = { damageType: 'split' as const };
const M3 = [1500, 7000, 25000, 60000], M4 = [2500, 12000, 40000, 100000], M5 = [4000, 18000, 60000, 150000];

export const KOPRULU_SKILLS: Skill[] = [
    // 강철 보병 (irTrooper)
    { ...A, ...physical, id: 'irRifleShot', name: '소총 사격', desc: '', level: 10, job: 'irTrooper', chance: .3, cooldown: 3, multiplier: 1.3, cost: 2, accuracyBonus: .05, fx: 'pierce' },
    { ...A, ...physical, id: 'irBayonet', name: '총검 찌르기', desc: '', level: 10, job: 'irTrooper', chance: .26, cooldown: 4, multiplier: 1.15, cost: 2, effect: 'bleed', statusTurns: 3, fx: 'slash' },
    { ...A, ...physical, id: 'irDigIn', name: '참호 파기', desc: '', level: 10, job: 'irTrooper', chance: .25, cooldown: 5, multiplier: 1.0, cost: 2, selfBuff: { id: 'irDigIn', name: '참호', turns: 3, stats: { defense: 40, resist: 20 } }, fx: 'ward' },
    { ...P, id: 'irDrill', name: '기초 훈련', desc: '물리 공격과 명중이 오릅니다. 보병의 첫 번째 교범.', level: 10, job: 'irTrooper', cost: 2, bonus: { attack: 14, accuracy: .03 } },
    { ...P, id: 'irFieldKit', name: '야전 구급낭', desc: '최대 체력이 오르고 턴마다 체력을 조금 회복합니다.', level: 10, job: 'irTrooper', cost: 2, bonus: { hpRegen: 6, hp: 60 } },
    { ...P, id: 'irSteadyAim', name: '거치 사격', desc: '치명타 확률과 치명 피해가 오릅니다. 가만히 서서 쏠수록 정확합니다.', level: 10, job: 'irTrooper', cost: 2, bonus: { crit: .03, critDamage: .06 } },
    // 궤도 저격수 (irOrbitSniper)
    { ...A, ...physical, id: 'irLongShot', name: '장거리 사격', desc: '', level: 25, job: 'irOrbitSniper', chance: .28, cooldown: 4, multiplier: 1.7, cost: 3, penetrationBonus: .25, fx: 'pierce' },
    { ...A, ...physical, id: 'irWoundShot', name: '상처 조준', desc: '', level: 25, job: 'irOrbitSniper', chance: .26, cooldown: 4, multiplier: 1.4, cost: 3, damageBonusCondition: 'bleeding', conditionalDamageBonus: .6, fx: 'pierce' },
    { ...A, ...physical, id: 'irFlashRound', name: '궤도 섬광', desc: '', level: 25, job: 'irOrbitSniper', chance: .22, cooldown: 6, multiplier: 1.0, cost: 3, effect: 'stun', statusTurns: 1, statusOnly: true, fx: 'star' },
    { ...P, id: 'irScope', name: '궤도 조준경', desc: '명중과 방어 관통이 오릅니다. 궤도 위에서는 바람이 없습니다.', level: 25, job: 'irOrbitSniper', cost: 2, bonus: { accuracy: .05, penetration: .04 } },
    { ...P, id: 'irBloodTrail', name: '핏자국 추적', desc: '명중과 치명 피해가 오릅니다. 핏자국을 따라가면 급소가 보입니다.', level: 25, job: 'irOrbitSniper', cost: 2, bonus: { accuracy: .04, critDamage: .08 } },
    { ...P, id: 'irStillBreath', name: '멈춘 숨', desc: '치명 피해가 크게 오르고 회피가 아주 조금 줄어듭니다. 숨을 멈춘 저격수는 움직이지 않습니다.', level: 25, job: 'irOrbitSniper', cost: 2, bonus: { critDamage: .12, evasion: -.01 } },
    // 강습 대장 (irAssaultCaptain)
    { ...A, ...physical, id: 'irBurstFire', name: '점사', desc: '', level: 40, job: 'irAssaultCaptain', chance: .28, cooldown: 4, multiplier: 1.4, cost: 4, extraAttacks: 2, extraAttackMultiplier: .6, fx: 'pierce', masteryMilestones: M3 },
    { ...A, ...physical, id: 'irSuppress', name: '제압 연사', desc: '', level: 40, job: 'irAssaultCaptain', chance: .24, cooldown: 5, multiplier: 1.6, cost: 4, effect: 'slow', statusTurns: 3, fx: 'impact', masteryMilestones: M3 },
    { ...A, ...physical, id: 'irBreach', name: '돌파 돌격', desc: '', level: 40, job: 'irAssaultCaptain', chance: .26, cooldown: 5, multiplier: 2.2, cost: 4, damageBonusCondition: 'controlled', conditionalDamageBonus: .5, fx: 'quake', masteryMilestones: M3 },
    { ...P, id: 'irSquadLead', name: '분대 지휘', desc: '물리 공격과 추가타 위력이 오릅니다. 점사의 뒤따르는 탄이 더 아픕니다.', level: 40, job: 'irAssaultCaptain', cost: 3, bonus: { attack: 24, followUpBonus: .05 }, masteryMilestones: M3 },
    { ...P, id: 'irHeavyPlate', name: '중장갑 판', desc: '물리 방어와 최대 체력이 오르고 속도가 조금 줄어듭니다.', level: 40, job: 'irAssaultCaptain', cost: 3, bonus: { defense: 30, hp: 120, speed: -2 }, masteryMilestones: M3 },
    { ...P, id: 'irAdrenaline', name: '전투 각성제', desc: '연속 행동 확률과 속도가 오릅니다.', level: 40, job: 'irAssaultCaptain', cost: 3, bonus: { chainBonus: .03, speed: 3 }, masteryMilestones: M3 },
    // 전선 사령관 (irFrontCommander)
    { ...A, ...split, id: 'irArtillery', name: '지원 포격', desc: '', level: 55, job: 'irFrontCommander', chance: .27, cooldown: 5, multiplier: 2.4, cost: 5, manaCost: 20, fx: 'impact', masteryMilestones: M4 },
    { ...A, ...physical, id: 'irMarkTarget', name: '표적 지정', desc: '', level: 55, job: 'irFrontCommander', chance: .25, cooldown: 5, multiplier: 1.2, cost: 5, effect: 'weaken', statusTurns: 3, fx: 'star', masteryMilestones: M4 },
    { ...A, ...physical, id: 'irExecuteOrder', name: '처형 명령', desc: '', level: 55, job: 'irFrontCommander', chance: .27, cooldown: 5, multiplier: 2.6, cost: 5, penetrationBonus: .15, damageBonusCondition: 'weakened', conditionalDamageBonus: .5, fx: 'slash', masteryMilestones: M4 },
    { ...P, id: 'irWarRoom', name: '작전실', desc: '물리 공격과 보스·사냥감에게 주는 피해가 오릅니다.', level: 55, job: 'irFrontCommander', cost: 3, bonus: { attack: 35, bossDamage: .04 }, masteryMilestones: M4 },
    { ...P, id: 'irIronWill', name: '강철 의지', desc: '상태이상 저항과 마법 방어가 오릅니다. 사령관은 흔들리지 않습니다.', level: 55, job: 'irFrontCommander', cost: 3, bonus: { statusResist: .08, resist: 25 }, masteryMilestones: M4 },
    { ...P, id: 'irVeteran', name: '고참병', desc: '물리 공격과 최대 체력이 오릅니다. 오래 싸운 만큼 오래 버팁니다.', level: 55, job: 'irFrontCommander', cost: 3, bonus: { attack: 20, hp: 80 }, masteryMilestones: M4 },
    // 성단 원수 (irClusterMarshal)
    { ...A, ...split, id: 'irOrbitalStrike', name: '궤도 타격', desc: '', level: 70, job: 'irClusterMarshal', chance: .5, cooldown: 5, multiplier: 4.4, cost: 6, manaCost: 38, penetrationBonus: .2, fx: 'star', masteryMilestones: M5 },
    { ...A, ...physical, id: 'irLastCharge', name: '최후의 돌격', desc: '', level: 70, job: 'irClusterMarshal', chance: .5, cooldown: 5, multiplier: 3.6, cost: 6, extraAttacks: 1, extraAttackMultiplier: .5, damageBonusCondition: 'lowHp', conditionalDamageBonus: .8, fx: 'quake', masteryMilestones: M5 },
    { ...A, ...physical, id: 'irScorchedEarth', name: '초토화', desc: '', level: 70, job: 'irClusterMarshal', chance: .5, cooldown: 5, multiplier: 3.0, cost: 6, effect: 'burn', statusTurns: 3, fx: 'fire', masteryMilestones: M5 },
    { ...P, id: 'irMarshalBaton', name: '원수의 지휘봉', desc: '물리 공격과 치명 피해가 크게 오릅니다.', level: 70, job: 'irClusterMarshal', cost: 3, bonus: { attack: 70, critDamage: .15 }, masteryMilestones: M5 },
    { ...P, id: 'irStarBanner', name: '성단 깃발', desc: '보스·사냥감에게 주는 피해와 연속 행동 확률이 오릅니다.', level: 70, job: 'irClusterMarshal', cost: 3, bonus: { bossDamage: .08, chainBonus: .03 }, masteryMilestones: M5 },
    { ...P, id: 'irUnbroken', name: '꺾이지 않는 전선', desc: '최대 체력과 물리 방어가 크게 오릅니다. 전선은 사령관이 서 있는 한 물러나지 않습니다.', level: 70, job: 'irClusterMarshal', cost: 3, bonus: { hp: 300, defense: 40 }, masteryMilestones: M5 },
    // 포자 수집가 (hvSporeGatherer)
    { ...A, ...magic, id: 'hvSporeShot', name: '포자 발사', desc: '', level: 10, job: 'hvSporeGatherer', chance: .5, cooldown: 3, multiplier: 1.25, cost: 2, manaCost: 8, fx: 'venom' },
    { ...A, ...magic, id: 'hvToxicSpore', name: '독 포자', desc: '', level: 10, job: 'hvSporeGatherer', chance: .3, cooldown: 5, multiplier: 1.0, cost: 2, manaCost: 10, effect: 'poison', statusTurns: 4, statusOnly: true, fx: 'venom' },
    { ...A, ...magic, id: 'hvSlimeCoat', name: '점액 외피', desc: '', level: 10, job: 'hvSporeGatherer', chance: .45, cooldown: 5, multiplier: 1.0, cost: 2, manaCost: 12, selfBuff: { id: 'hvSlimeCoat', name: '점액 외피', turns: 3, stats: { resist: 30, evasion: .03 } }, fx: 'ward' },
    { ...P, id: 'hvSporeSense', name: '포자 감각', desc: '포자가 바람보다 먼저 냄새를 맡아 마법 공격과 최대 마나가 오릅니다.', level: 10, job: 'hvSporeGatherer', cost: 2, bonus: { magic: 14, mana: 20 } },
    { ...P, id: 'hvVenomGland', name: '독샘', desc: '중독 지속 피해가 오릅니다. 독 포자와 함께 쓰면 중독이 오래 남습니다.', level: 10, job: 'hvSporeGatherer', cost: 2, bonus: { poisonBonus: .12 } },
    { ...P, id: 'hvThickHide', name: '두꺼운 피막', desc: '피막이 두꺼워져 최대 체력과 마법 방어가 오릅니다.', level: 10, job: 'hvSporeGatherer', cost: 2, bonus: { hp: 60, resist: 10 } },
    // 군체 조율사 (hvHiveTuner)
    { ...A, ...magic, id: 'hvNerveJolt', name: '신경 자극', desc: '', level: 25, job: 'hvHiveTuner', chance: .48, cooldown: 4, multiplier: 1.4, cost: 3, manaCost: 16, effect: 'weaken', statusTurns: 3, fx: 'lightning' },
    { ...A, ...magic, id: 'hvSporeBurst', name: '포자 폭발', desc: '', level: 25, job: 'hvHiveTuner', chance: .5, cooldown: 4, multiplier: 1.5, cost: 3, manaCost: 18, damageBonusCondition: 'statuses', conditionalDamageBonus: .2, fx: 'venom' },
    { ...A, ...magic, id: 'hvRegrow', name: '흡수 점액', desc: '', level: 25, job: 'hvHiveTuner', chance: .45, cooldown: 5, multiplier: 1.3, cost: 3, manaCost: 20, effect: 'drain', drainRatio: .3, fx: 'bite' },
    { ...P, id: 'hvTuningFork', name: '조율 촉각', desc: '마법 공격과 명중이 오릅니다. 군체는 조율사의 손끝을 따라 움직입니다.', level: 25, job: 'hvHiveTuner', cost: 2, bonus: { magic: 18, accuracy: .03 } },
    { ...P, id: 'hvLingerToxin', name: '잔류 독', desc: '내가 거는 지속 피해가 1턴 길어집니다. 독 포자·신경 자극이 더 오래 남습니다.', level: 25, job: 'hvHiveTuner', cost: 2, bonus: { dotTurnsBonus: 1 } },
    { ...P, id: 'hvHiveMind', name: '군체 의식', desc: '마나 회복과 마법 방어가 오릅니다.', level: 25, job: 'hvHiveTuner', cost: 2, bonus: { manaRegen: 4, resist: 12 } },
    // 신경 지배자 (hvNerveDominator)
    { ...A, ...magic, id: 'hvDominate', name: '신경 지배', desc: '', level: 40, job: 'hvNerveDominator', chance: .3, cooldown: 6, multiplier: 1.0, cost: 4, manaCost: 24, effect: 'silence', statusTurns: 2, statusOnly: true, fx: 'curse', masteryMilestones: M3 },
    { ...A, ...magic, id: 'hvSwarmCall', name: '군체 소집', desc: '', level: 40, job: 'hvNerveDominator', chance: .5, cooldown: 4, multiplier: 1.3, cost: 4, manaCost: 26, extraAttacks: 2, extraAttackMultiplier: .55, fx: 'bite', masteryMilestones: M3 },
    { ...A, ...magic, id: 'hvAcidRain', name: '산성 비', desc: '', level: 40, job: 'hvNerveDominator', chance: .5, cooldown: 5, multiplier: 2.0, cost: 4, manaCost: 30, damageBonusCondition: 'weakened', conditionalDamageBonus: .5, fx: 'venom', masteryMilestones: M3 },
    { ...P, id: 'hvSynapseWeb', name: '시냅스 그물', desc: '마법 공격이 오르고 내가 거는 침묵·기절·감속이 1턴 길어집니다.', level: 40, job: 'hvNerveDominator', cost: 3, bonus: { magic: 24, controlBonus: 1 }, masteryMilestones: M3 },
    { ...P, id: 'hvSporeCloud', name: '포자 구름', desc: '중독 최대 중첩이 1 늘고 중독 지속 피해가 오릅니다.', level: 40, job: 'hvNerveDominator', cost: 3, bonus: { poisonStackBonus: 1, poisonBonus: .1 }, masteryMilestones: M3 },
    { ...P, id: 'hvCarapace', name: '지배종의 갑각', desc: '물리·마법 방어와 최대 체력이 오릅니다.', level: 40, job: 'hvNerveDominator', cost: 3, bonus: { defense: 24, resist: 24, hp: 100 }, masteryMilestones: M3 },
    // 둥지 군주 (hvNestLord)
    { ...A, ...magic, id: 'hvSpawnFeast', name: '산란의 포식', desc: '', level: 55, job: 'hvNestLord', chance: .5, cooldown: 5, multiplier: 2.2, cost: 5, manaCost: 36, effect: 'drain', drainRatio: .3, fx: 'bite', masteryMilestones: M4 },
    { ...A, ...magic, id: 'hvCorrosiveSting', name: '부식 독침', desc: '', level: 55, job: 'hvNestLord', chance: .48, cooldown: 5, multiplier: 1.8, cost: 5, manaCost: 40, effect: 'corrode', statusTurns: 3, fx: 'venom', masteryMilestones: M4 },
    { ...A, ...split, id: 'hvNestQuake', name: '둥지 진동', desc: '', level: 55, job: 'hvNestLord', chance: .5, cooldown: 5, multiplier: 2.4, cost: 5, manaCost: 44, fx: 'quake', masteryMilestones: M4 },
    { ...P, id: 'hvBroodCrown', name: '둥지의 관', desc: '마법 공격과 보스·사냥감에게 주는 피해가 오릅니다.', level: 55, job: 'hvNestLord', cost: 3, bonus: { magic: 35, bossDamage: .04 }, masteryMilestones: M4 },
    { ...P, id: 'hvEvolvedGland', name: '진화한 독샘', desc: '모든 지속 피해와 흡혈이 오릅니다. 군주는 둥지가 흘린 것을 되찾습니다.', level: 55, job: 'hvNestLord', cost: 3, bonus: { dotBonus: .15, lifesteal: .02 }, masteryMilestones: M4 },
    { ...P, id: 'hvNestWard', name: '둥지 결계', desc: '상태이상 저항이 오르고 턴마다 체력을 회복합니다.', level: 55, job: 'hvNestLord', cost: 3, bonus: { statusResist: .08, hpRegen: 15 }, masteryMilestones: M4 },
    // 진화 설계자 (hvEvoArchitect)
    { ...A, ...magic, id: 'hvGreatRupture', name: '대파열', desc: '', level: 70, job: 'hvEvoArchitect', chance: .5, cooldown: 5, multiplier: 4.2, cost: 6, manaCost: 50, damageBonusCondition: 'statuses', conditionalDamageBonus: .25, fx: 'venom', masteryMilestones: M5 },
    { ...A, ...magic, id: 'hvEvolve', name: '진화', desc: '', level: 70, job: 'hvEvoArchitect', chance: .5, cooldown: 5, multiplier: 1.0, cost: 6, manaCost: 48, selfBuff: { id: 'hvEvolve', name: '진화', turns: 4, stats: { magic: 120, resist: 60 }, speedMultiplier: 1.15 }, fx: 'glyph', masteryMilestones: M5 },
    { ...A, ...magic, id: 'hvApexToxin', name: '정점 독소', desc: '', level: 70, job: 'hvEvoArchitect', chance: .5, cooldown: 5, multiplier: 3.0, cost: 6, manaCost: 52, effect: 'poison', statusTurns: 5, extraAttacks: 1, extraAttackMultiplier: .5, fx: 'venom', masteryMilestones: M5 },
    { ...P, id: 'hvArchitectEye', name: '설계자의 눈', desc: '설계자의 눈이 약점을 읽어 마법 공격과 치명 피해가 크게 오릅니다.', level: 70, job: 'hvEvoArchitect', cost: 3, bonus: { magic: 70, critDamage: .15 }, masteryMilestones: M5 },
    { ...P, id: 'hvPerfectStrain', name: '완성된 균주', desc: '중독 최대 중첩이 1 늘고 모든 지속 피해가 크게 오릅니다.', level: 70, job: 'hvEvoArchitect', cost: 3, bonus: { poisonStackBonus: 1, dotBonus: .2 }, masteryMilestones: M5 },
    { ...P, id: 'hvLivingArmor', name: '살아 있는 갑주', desc: '최대 체력과 마법 방어가 크게 오르고 턴마다 체력을 회복합니다.', level: 70, job: 'hvEvoArchitect', cost: 3, bonus: { hp: 300, resist: 40, hpRegen: 20 }, masteryMilestones: M5 },
];

export const KOPRULU_BALANCE: Record<string, Partial<Skill>> = Object.fromEntries(
    KOPRULU_SKILLS.filter(sk => sk.type === 'active').map(sk => [sk.id, { chance: sk.chance, multiplier: sk.multiplier, cooldown: sk.cooldown, ...(sk.manaCost ? { manaCost: sk.manaCost } : {}) }]),
);
/** 상태이상 전용 액티브(피해 없음): applyStatusRules가 지속 +2턴(기절 +1) · chance ≤ .3 · 재사용 ≥ 지속으로 맞춥니다. */
export const KOPRULU_STATUS_ONLY = ['irFlashRound', 'hvToxicSpore', 'hvDominate'];
