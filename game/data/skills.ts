import { tuneActiveSkills } from './skill-balance';
import { MAPLE_SKILL_NAMES } from './maple-skills';
import type { Skill } from '../types';
import { SKILL_FORMULA } from './balance';
import { JOBS, lineageOf, type Job } from './classes';
import { subRoleOf } from './roles';
import { PROGRESSION } from './progression';
import { EXPANSION_SKILLS } from './expansion';
import { LINEAGE_SKILLS } from './expansion-lineages';
import { V24_SKILLS } from './expansion-v24';
import { DEFENSE_SKILLS } from './expansion-defense';
import { INVERSION_SKILLS } from './expansion-inversion';
import { MONOSTAT_SKILLS } from './expansion-monostat';
import { SUPPORT_SKILLS, SUPPORT_PASSIVES } from './support-rework';
import { V25_SKILLS } from './expansion-v25';
import { SPECIAL_SKILLS } from './specials';
import { STAT_TRAINING_SKILLS } from './stat-training';
import { trainingSkillOwner, scaleTrainingBonus, TRAINING_PASSIVE, TRAINING_DESC } from './training';
export const SKILLS: Skill[] = [
    { id: 'hook', name: '강철 챔질', desc: '공격력 180% 피해.', type: 'active', level: 1, chance: .35, cooldown: 2, multiplier: 1.8 },
    { id: 'breath', name: '고요한 호흡', desc: '공격하지 않고 최대 체력 18%를 회복합니다.', type: 'active', level: 6, chance: .3, cooldown: 5, multiplier: 0, effect: 'heal', healOnly: true },
    { id: 'pierce', name: '관통 작살', desc: '공격력 300% 피해.', type: 'active', level: 10, job: 'harpoon', chance: .35, cooldown: 4, multiplier: 3 },
    { id: 'hunt', name: '폭풍 사냥', desc: '공격력 420% 피해.', type: 'active', level: 20, job: 'harpoon', chance: .25, cooldown: 5, multiplier: 4.2 },
    { id: 'wave', name: '해일', desc: '공격력 240% 피해, 적을 1턴 기절.', type: 'active', level: 10, job: 'tide', chance: .3, cooldown: 4, multiplier: 2.4, effect: 'stun' },
    { id: 'spring', name: '생명의 조류', desc: '최대 체력 22% 회복, 공격력 250% 피해.', type: 'active', level: 20, job: 'tide', chance: .4, cooldown: 4, multiplier: 2.5, effect: 'heal' },
    { id: 'anchor', name: '심해의 닻', desc: '공격력 210% 피해, 적을 1턴 기절.', type: 'active', level: 10, job: 'warden', chance: .4, cooldown: 3, multiplier: 2.1, effect: 'stun' },
    { id: 'focus', name: '낚시꾼의 집중', desc: '치명타 확률 +7%. 팬텀 계열의 불안정한 고점을 보완합니다.', type: 'passive', level: 2, job: 'squidJester', chance: 0, cooldown: 0, multiplier: 0, bonus: { crit: .07 } },
    { id: 'scales', name: '비늘 갑옷', desc: '물리 방어 +6, 치명 피해 +15%p. 비늘 가시로 받아치는 반격형 방벽입니다.', type: 'passive', level: 5, job: 'warden', chance: 0, cooldown: 0, multiplier: 0, bonus: { defense: 6, critDamage: .15 } },
    { id: 'vital', name: '바다의 생명력', desc: '최대 체력 +170, 턴당 체력 회복 +2, 쓰러진 뒤 회복 대기 -5턴. 방어형 직업의 긴 전투를 돕습니다.', type: 'passive', level: 12, job: 'warden', chance: 0, cooldown: 0, multiplier: 0, revive: 5, bonus: { hp: 170, hpRegen: 2 } },
    { id: 'resolve', name: '심연의 결의', desc: '물리 공격 +25. 맹세의 전사가 전하는 성장 패시브입니다.', type: 'passive', level: 24, job: 'harpoon', chance: 0, cooldown: 0, multiplier: 0, bonus: { attack: 25 } },
];
// 장착 AP와 턴당 마나 비용. 기존 ID를 유지하여 저장 호환성을 지킵니다.
const settings: Record<string, Partial<Skill>> = {
    hook: { cost: 2, manaCost: 0 },
    breath: { cost: 2, manaCost: 7, condition: 'wounded' }, pierce: { cost: 4, manaCost: 8 }, hunt: { cost: 5, manaCost: 12 },
    wave: { cost: 4, manaCost: 10, damageType: 'magic', desc: '마법 공격 240% 피해, 적을 1턴 기절.' }, spring: { cost: 4, manaCost: 12, damageType: 'magic', condition: 'wounded', desc: '최대 체력 22% 회복, 마법 공격 250% 피해.' },
    anchor: { cost: 3, manaCost: 6 }, fortress: { cost: 4, manaCost: 10, condition: 'wounded' }, focus: { cost: 2 }, scales: { cost: 2 }, vital: { cost: 2 }, resolve: { cost: 3 },
};
for (const sk of SKILLS)
    Object.assign(sk, settings[sk.id]);
SKILLS.push({ id: 'swarmSense', name: '무리 감지', desc: '변종 조우 확률 +50%, 명중 +2%p. 시프 패시브(Lv.30).', type: 'passive', level: 30, job: 'rareTracker', chance: 0, cooldown: 0, multiplier: 0, cost: 2, bonus: { accuracy: .02, variantFind: .5 } });
SKILLS.push({ id: 'firstAid', name: '응급처치', desc: '행동할 때마다 체력을 조금 회복합니다. SP 없이 Lv.2에 자동 습득하는 공용 패시브입니다.', type: 'passive', level: 2, chance: 0, cooldown: 0, multiplier: 0, cost: 2, freeCommon: true, bonus: { hpRegen: 3 } });
SKILLS.push({ id: 'arcane', name: '해류 탄환', desc: '마법 공격 170% 피해. 버블 매지션의 기초 공격기.', type: 'active', level: 2, chance: .4, cooldown: 2, multiplier: 1.7, damageType: 'magic', cost: 2, manaCost: 5 }, { id: 'cut', name: '갈고리 상처', desc: '물리 공격 130% 피해 + 공격력 30% 출혈, 3턴.', type: 'active', level: 5, chance: .3, cooldown: 4, multiplier: 1.3, effect: 'bleed', cost: 3, manaCost: 4 }, { id: 'hushCurrent', name: '침묵의 조류', desc: '마법 공격 125% 피해. 적을 2턴 침묵시켜 액티브를 막습니다.', type: 'active', level: 8, chance: .38, cooldown: 4, multiplier: 1.25, effect: 'silence', damageType: 'magic', cost: 3, manaCost: 7, statusTurns: 2 }, { id: 'undertow', name: '끌어내리는 저류', desc: '마법 공격 135% 피해. 적을 3턴 감속해 속도를 35% 낮춥니다.', type: 'active', level: 10, chance: .42, cooldown: 3, multiplier: 1.35, effect: 'slow', damageType: 'magic', cost: 3, manaCost: 6, statusTurns: 3 }, { id: 'rushCurrent', name: '질주하는 물결', desc: '물리 공격 115% 피해. 자신을 3턴 가속해 속도를 35% 높입니다.', type: 'active', level: 12, chance: .45, cooldown: 3, multiplier: 1.15, effect: 'haste', cost: 2, manaCost: 3, statusTurns: 3 }, { id: 'insight', name: '조류 통찰', desc: '마법 공격 +28.', type: 'passive', level: 5, chance: 0, cooldown: 0, multiplier: 0, cost: 2, bonus: { magic: 28 } }, { id: 'flow', name: '마나 순환', desc: '최대 마나 +30, 턴당 마나 회복 +3, 마력 평타 계수 +30%p.', type: 'passive', level: 8, chance: 0, cooldown: 0, multiplier: 0, cost: 2, bonus: { mana: 30, manaRegen: 3, arcaneRatioBonus: .3 } }, { id: 'precision', name: '수면 읽기', desc: '명중 +12%p, 회피 +4%p.', type: 'passive', level: 10, chance: 0, cooldown: 0, multiplier: 0, cost: 2, bonus: { accuracy: .12, evasion: .04 } }, { id: 'whaleStrike', name: '거경 관통', desc: '물리 공격 450% 피해. 체력 60% 이상인 적에게만 시도.', type: 'active', level: 25, job: 'whaler', chance: .4, cooldown: 5, multiplier: 4.5, condition: 'healthyTarget', cost: 6, manaCost: 14 }, { id: 'barb', name: '미늘의 지배', desc: '방어 관통 +10%p, 치명 피해 +8%p.', type: 'passive', level: 25, job: 'whaler', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { penetration: .1, critDamage: .08 } }, { id: 'razor', name: '갈래바람', desc: '물리 공격 260% 피해 + 공격력 30% 출혈, 3턴.', type: 'active', level: 25, job: 'corsair', chance: .45, cooldown: 3, multiplier: 2.6, effect: 'bleed', cost: 5, manaCost: 9 }, { id: 'drift', name: '유령 발걸음', desc: '회피 +9%p, 속도 +10.', type: 'passive', level: 25, chance: 0, cooldown: 0, multiplier: 0, job: 'corsair', cost: 3, bonus: { evasion: .09, speed: 10 } }, { id: 'maelstrom', name: '대소용돌이', desc: '마법 공격 360% 피해, 적의 공격을 3턴간 25% 약화.', type: 'active', level: 25, job: 'tempest', chance: .35, cooldown: 4, multiplier: 3.6, effect: 'weaken', cost: 6, manaCost: 18 }, { id: 'abyssMind', name: '폭풍의 정신', desc: '마법 공격 +30, 치명 피해 +10%p.', type: 'passive', level: 25, job: 'tempest', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { magic: 30, critDamage: .1 } }, { id: 'pearlPrayer', name: '진주의 기도', desc: '체력 22% 회복, 마법 공격 230% 피해. 체력 70% 이하에서만 시도.', type: 'active', level: 25, chance: .65, cooldown: 3, multiplier: 2.3, effect: 'heal', condition: 'wounded', job: 'oracle', cost: 5, manaCost: 12 }, { id: 'soulTide', name: '영혼의 조수', desc: '흡혈 +8%p, 마법 방어 +20.', type: 'passive', level: 25, chance: 0, cooldown: 0, multiplier: 0, job: 'oracle', cost: 3, bonus: { lifesteal: .08, resist: 20 } }, { id: 'crush', name: '해저 분쇄', desc: '물리 공격 200% + 물리 방어 150% 피해, 1턴 기절.', type: 'active', level: 25, job: 'bulwark', chance: .35, cooldown: 4, multiplier: 2, effect: 'stun', cost: 5, manaCost: 10 }, { id: 'ironWill', name: '부동의 산호', desc: '물리 방어 +40, 마법 방어 +25, 방어 비례 반격.', type: 'passive', level: 25, chance: 0, cooldown: 0, multiplier: 0, job: 'bulwark', cost: 3, bonus: { defense: 40, resist: 25, thorns: .3 , swarmFind: 0.5} }, { id: 'oath', name: '성해의 빛살', desc: '마법 공격 계수로 물리 피해 300%, 피해의 25% 회복.', type: 'active', level: 25, job: 'paladin', chance: .4, cooldown: 4, multiplier: 3, effect: 'drain', cost: 5, manaCost: 12, damageType: 'physical', scaling: 'swap' }, { id: 'balance', name: '두 바다의 서약', desc: '마법 공격 +40.', type: 'passive', level: 25, chance: 0, cooldown: 0, multiplier: 0, job: 'paladin', cost: 3, bonus: { magic: 40 } });
SKILLS.push({ id: 'goldMemory', name: '황금의 기억', desc: '처치·던전 골드 +15%, 명중 +5%p.', type: 'passive', level: 5, rebirth: 1, chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { goldBonus: .15, accuracy: .05 } }, { id: 'soulShell', name: '영혼의 비늘', desc: '회피 +8%p, 마법 방어 +30, 최대 체력 +150.', type: 'passive', level: 20, rebirth: 2, chance: 0, cooldown: 0, multiplier: 0, cost: 4, bonus: { evasion: .08, resist: 30, hp: 150 } });
SKILLS.push({ id: 'vitalSurge', name: '생명 쇄도', desc: '최대 체력의 8%를 추가해 물리 피해를 입히고 18% 회복.', type: 'active', level: 25, job: 'chimera', chance: .35, cooldown: 4, multiplier: 2.2, effect: 'drain', cost: 5, manaCost: 10, scaling: 'hp', scalingRatio: .08 }, { id: 'adaptiveCore', name: '적응하는 심장', desc: '최대 체력 +120, 최대 마나 +20, 명중 +5%p.', type: 'passive', level: 25, job: 'chimera', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { hp: 120, mana: 20, accuracy: .05 } }, );

// 신규 직업 스킬은 모두 데이터로 선언합니다. 한 직업에 1개만 주거나 패시브 2개만 주는 것도 허용합니다.
SKILLS.push(
    { id: 'wakeFist', name: '물살 주먹', desc: '물리 공격 155% 피해. 낮은 비용으로 계속 성장하는 근접 기본기.', type: 'active', level: 10, job: 'tidalBrawler', chance: .4, cooldown: 2, multiplier: 1.55, cost: 2, manaCost: 0 },
    { id: 'rippleGlyph', name: '잔물결 문양', desc: '마법 공격 150% 피해, 적의 공격을 3턴 약화.', type: 'active', level: 10, job: 'currentScholar', chance: .45, cooldown: 2, multiplier: 1.5, effect: 'weaken', damageType: 'magic', cost: 2, manaCost: 4 }, { id: 'currentNotes', name: '해류 필기', desc: '마법 공격 +6, 마력 평타 계수 +50%p.', type: 'passive', level: 10, job: 'currentScholar', chance: 0, cooldown: 0, multiplier: 0, cost: 2, bonus: { magic: 6, arcaneRatioBonus: .5 } },
    { id: 'greenTide', name: '푸른 물결 돌봄', desc: '체력 16% 회복 후 마법 공격 120% 피해. 체력 70% 이하에서만 시도.', type: 'active', level: 10, job: 'seagrassKeeper', chance: .5, cooldown: 4, multiplier: 1.2, effect: 'heal', damageType: 'magic', condition: 'wounded', cost: 2, manaCost: 4 },
    { id: 'inkTrick', name: '먹물 속임수', desc: '물리 공격 125% 피해, 적의 공격을 3턴 약화.', type: 'active', level: 10, job: 'squidJester', chance: .55, cooldown: 3, multiplier: 1.25, effect: 'weaken', cost: 2, manaCost: 3 },
    { id: 'tideUppercut', name: '조수 어퍼컷', desc: '물리 공격 180%에 현재 체력 3%를 더하고 피해 일부를 회복.', type: 'active', level: 25, job: 'reefBrawler', chance: .42, cooldown: 3, multiplier: 1.8, effect: 'drain', scaling: 'hp', scalingRatio: .03, cost: 4, manaCost: 5 },
    { id: 'callousedHands', name: '굳은 손바닥', desc: '최대 체력 +60, 물리 공격 +16, 흡혈 +3%p.', type: 'passive', level: 25, job: 'reefBrawler', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { hp: 60, attack: 16, lifesteal: .03 } },
    { id: 'anchorBreak', name: '닻 끊기', desc: '물리 공격 260% 피해, 적의 공격을 3턴 약화.', type: 'active', level: 25, job: 'lineBreaker', chance: .4, cooldown: 4, multiplier: 2.6, effect: 'weaken', cost: 4, manaCost: 6 },
    { id: 'roughLine', name: '거친 줄 매듭', desc: '방어 관통 +8%p, 물리 공격 +15.', type: 'passive', level: 25, job: 'lineBreaker', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { penetration: .08, attack: 15 } },
    { id: 'krakenBore', name: '크라켄 천공', desc: '체력 높은 적에게 물리 공격 520% 피해와 출혈. 현재 체력 4%를 추가합니다.', type: 'active', level: 40, job: 'krakenSlayer', chance: .3, cooldown: 6, multiplier: 5.2, effect: 'bleed', condition: 'healthyTarget', scaling: 'hp', scalingRatio: .04, cost: 6, manaCost: 14 },
    { id: 'deepWeakpoint', name: '크라켄 급소', desc: '방어 관통 +8%p, 치명 피해 +16%p.', type: 'passive', level: 40, job: 'krakenSlayer', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { penetration: .08, critDamage: .16 } },
    { id: 'needleStep', name: '바늘 보법', desc: '물리 공격 170% 피해와 3턴 출혈. 빠른 순환을 노립니다.', type: 'active', level: 40, job: 'needleDancer', chance: .55, cooldown: 2, multiplier: 1.7, effect: 'bleed', cost: 3, manaCost: 4 },
    { id: 'afterimage', name: '잔상 춤', desc: '회피 +14%p, 속도 +18.', type: 'passive', level: 40, job: 'needleDancer', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { evasion: .14, speed: 18 } },
    { id: 'runeCurrent', name: '룬 조류', desc: '마법 공격 210% 피해, 적의 공격을 3턴 약화.', type: 'active', level: 25, job: 'runeSwell', chance: .5, cooldown: 3, multiplier: 2.1, effect: 'weaken', damageType: 'magic', cost: 4, manaCost: 8 },
    { id: 'tidalScript', name: '조류 필사본', desc: '마법 공격 +24, 최대 마나 +20, 턴당 마나 회복 +2, 마력 평타 계수 +30%p.', type: 'passive', level: 25, job: 'runeSwell', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { magic: 24, mana: 20, manaRegen: 2, arcaneRatioBonus: .3 } },
    { id: 'saltCatalyst', name: '염수 촉매', desc: '마법 공격 180% 피해와 3턴 출혈.', type: 'active', level: 25, job: 'saltAlchemist', chance: .55, cooldown: 2, multiplier: 1.8, effect: 'bleed', damageType: 'magic', cost: 3, manaCost: 6 },
    { id: 'volatileFormula', name: '휘발성 공식', desc: '방어 관통 +10%p, 턴당 마나 회복 +2.', type: 'passive', level: 25, job: 'saltAlchemist', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { penetration: .1, manaRegen: 2 } },
    { id: 'thunderPsalm', name: '천둥 성가', desc: '마나의 22%를 더해 마법 공격 500% 피해, 1턴 기절.', type: 'active', level: 40, job: 'stormScribe', chance: .3, cooldown: 6, multiplier: 5, effect: 'stun', damageType: 'magic', scaling: 'mana', scalingRatio: .22, cost: 6, manaCost: 20 },
    { id: 'overcast', name: '폭풍 전운', desc: '마법 공격 +45, 치명 피해 +12%p.', type: 'passive', level: 40, job: 'stormScribe', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { magic: 45, critDamage: .12 } },
    { id: 'moonTide', name: '월광 조수', desc: '체력 30% 회복 후 마법 공격 280% 피해. 체력 70% 이하에서만 시도.', type: 'active', level: 40, job: 'lunarOracle', chance: .6, cooldown: 4, multiplier: 2.8, effect: 'heal', damageType: 'magic', condition: 'wounded', cost: 5, manaCost: 12 },
    { id: 'tidalFate', name: '조류의 운명', desc: '마법 방어 +25, 턴당 마나 회복 +3.', type: 'passive', level: 40, job: 'lunarOracle', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { resist: 25, manaRegen: 3 } },
    { id: 'reefPulse', name: '암초 맥박', desc: '체력 24% 회복 후 마법 공격 160% 피해. 체력 70% 이하에서만 시도.', type: 'active', level: 25, job: 'reefMedic', chance: .5, cooldown: 3, multiplier: 1.6, effect: 'heal', damageType: 'magic', condition: 'wounded', cost: 3, manaCost: 7 },
    { id: 'symbioticCoral', name: '공생 산호', desc: '최대 체력 +60, 흡혈 +4%p.', type: 'passive', level: 25, job: 'reefMedic', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { hp: 60, lifesteal: .04 } },
    { id: 'bellCrash', name: '종소리 충돌', desc: '현재 체력 2.5%를 실어 물리 공격 190% 피해와 1턴 기절.', type: 'active', level: 25, job: 'bellTurtle', chance: .4, cooldown: 4, multiplier: 1.9, effect: 'stun', scaling: 'hp', scalingRatio: .025, cost: 4, manaCost: 5 },
    { id: 'shellEcho', name: '껍질의 메아리', desc: '물리 방어 +45, 회피 +3%p, 방어 비례 반격.', type: 'passive', level: 25, job: 'bellTurtle', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { defense: 45, evasion: .03, thorns: .25 , swarmFind: 0.5, resist: 15 } },
    { id: 'sanctuaryShell', name: '성역의 껍질', desc: '최대 체력 +180, 마법 방어 +35, 턴당 체력 회복 +4. 액티브 없이도 유지되는 성역.', type: 'passive', level: 40, job: 'coralSaint', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { hp: 180, resist: 35, hpRegen: 4 } },
    { id: 'saintTide', name: '성인의 조류', desc: '마법 공격 +30, 턴당 마나 회복 +3, 흡혈 +6%p. 두 패시브를 조합해 스스로 버팁니다.', type: 'passive', level: 40, job: 'coralSaint', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { magic: 30, manaRegen: 3, lifesteal: .06 } },
    { id: 'thornCounter', name: '가시 반류', desc: '물리 방어 비례 피해와 3턴 출혈. 이미 출혈 중인 적에게 직접 피해 +25%.', type: 'active', level: 40, job: 'brineThorn', chance: .42, cooldown: 4, multiplier: 2.3, effect: 'bleed', damageBonusCondition: 'bleeding', conditionalDamageBonus: .25, cost: 5, manaCost: 8 },
    { id: 'reefFortress', name: '가시 성채', desc: '물리 방어 +55, 방어 비례 반격.', type: 'passive', level: 40, job: 'brineThorn', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { defense: 55, thorns: .35 , swarmFind: 0.8, resist: 20 } },
    { id: 'windupCast', name: '태엽 방출', desc: 'HP와 MP 일부를 함께 태워 복합 피해 190%를 입힙니다.', type: 'active', level: 25, job: 'clockworkAngler', chance: .5, cooldown: 3, multiplier: 1.9, scaling: 'hybrid', scalingRatio: .04, cost: 4, manaCost: 6 },
    { id: 'springLoaded', name: '감긴 태엽', desc: '속도 +25, 명중 +8%p.', type: 'passive', level: 25, job: 'clockworkAngler', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { speed: 25, accuracy: .08 } },
    { id: 'loadedHook', name: '밑장 챔질', desc: '물리 공격 120% 피해. 높은 확률로 작게 회복하며 자주 발동합니다.', type: 'active', level: 25, job: 'gambler', chance: .7, cooldown: 1, multiplier: 1.2, effect: 'drain', cost: 2, manaCost: 2 },
    { id: 'riskDividend', name: '위험 배당', desc: '치명 피해 +25%p, 골드 획득 +15%.', type: 'passive', level: 25, job: 'gambler', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { critDamage: .25, goldBonus: .15 } },
    { id: 'redWake', name: '붉은 조류', desc: '현재 체력 12%를 추가한 물리 공격 220% 피해와 흡혈.', type: 'active', level: 40, job: 'bloodTide', chance: .35, cooldown: 4, multiplier: 2.2, effect: 'drain', scaling: 'hp', scalingRatio: .12, cost: 5, manaCost: 5 },
    { id: 'bloodEngine', name: '혈류 기관', desc: '흡혈 +10%p, 최대 체력 +100.', type: 'passive', level: 40, job: 'bloodTide', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { lifesteal: .1, hp: 100 } },
    { id: 'netWeave', name: '그물 짜기', desc: '흡혈 +6%p, 최대 체력 +60. 잡은 것은 놓치지 않는 안정적인 사냥을 돕습니다.', type: 'passive', level: 10, job: 'netWeaver', chance: 0, cooldown: 0, multiplier: 0, cost: 2, bonus: { hp: 60, lifesteal: .06 } },
    { id: 'fishWhisper', name: '물고기의 속삭임', desc: '마법 공격 +22, 방어 관통 +8%p, 마력 평타 계수 +30%p. 용이 알려 주는 약점을 파고듭니다.', type: 'passive', level: 10, job: 'fishWhisperer', chance: 0, cooldown: 0, multiplier: 0, cost: 2, bonus: { magic: 22, penetration: .08, arcaneRatioBonus: .3 } },
    { id: 'driftwoodGuard', name: '유목 방벽', desc: '최대 체력 +100, 물리 방어 +18, 마법 방어 +14.', type: 'passive', level: 10, job: 'driftwoodHermit', chance: 0, cooldown: 0, multiplier: 0, cost: 2, bonus: { hp: 100, defense: 18, resist: 14 , swarmFind: 0.3} },
    { id: 'salvageSense', name: '난파선 감식', desc: '골드 획득 +8%, 명중 +3%p, 치명타 +1%p. 장비 파밍용 독립 스킬.', type: 'passive', level: 10, job: 'relicScavenger', chance: 0, cooldown: 0, multiplier: 0, cost: 2, bonus: { goldBonus: .08, accuracy: .03, crit: .01 } },
);

// 경제·환생 직업과 몬스터 계승 직업은 전투 수치보다 파밍 루프의 선택지를 넓힙니다.
// 보스가 사용하는 일부 스킬은 같은 ID를 플레이어도 배울 수 있어, 몬스터의 기술을 직업으로 계승하는 구조를 유지합니다.
SKILLS.push(
    { id: 'twinHook', name: '쌍갈고리', desc: '물리 공격 135% 피해 후 1회의 추가타(기본 위력의 58%).', type: 'active', level: 14, chance: .3, cooldown: 4, multiplier: 1.35, extraAttacks: 1, extraAttackMultiplier: .58, cost: 4, manaCost: 5 },
    { id: 'chartedCurrents', name: '해류 측량', desc: '장비 드롭 확률 +30%, 골드 획득 +4%. 전투력 대신 더 좋은 항로를 찾습니다.', type: 'passive', level: 10, job: 'tideSurveyor', chance: 0, cooldown: 0, multiplier: 0, cost: 2, bonus: { dropBonus: .03, goldBonus: .04 } },
    { id: 'pearlLedger', name: '진주 장부', desc: '환생 시 세계석 +1. 숙련할수록 장착 AP가 3 → 0으로 줄고 세계석 +2·골드 보너스가 붙습니다.', type: 'passive', level: 25, job: 'pearlBroker', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { rebirthBonus: 1 }, levelEffects: [{ cost: 3, bonus: { rebirthBonus: 1 } }, { cost: 3, bonus: { rebirthBonus: 1, goldBonus: .04 } }, { cost: 2, bonus: { rebirthBonus: 1, goldBonus: .08 } }, { cost: 1, bonus: { rebirthBonus: 2, goldBonus: .1 } }, { cost: 0, bonus: { rebirthBonus: 2, goldBonus: .12, dungeonGoldBonus: .1 } }] },
    { id: 'salvageContract', name: '인양 계약', desc: '골드 획득 +10%, 던전 클리어 골드 +8%.', type: 'passive', level: 10, job: 'salvageMerchant', chance: 0, cooldown: 0, multiplier: 0, cost: 2, bonus: { goldBonus: .1, dungeonGoldBonus: .08 } },
    { id: 'rareSense', name: '전리품 감지', desc: '장비 드롭 확률 +50%, 처치·던전 골드 +4%. 몬스터 출현률과 장비 등급 확률은 바뀌지 않습니다.', type: 'passive', level: 25, job: 'rareTracker', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { dropBonus: .05, goldBonus: .04 } },
    { id: 'memoryOfTides', name: '윤회의 조류 기록', desc: '환생 시 세계석 +1, 던전 클리어 골드 +10%. 환생할 때마다 두 공격 +5·최대 체력 +18·두 방어 +1(최대 12회). 지난 생의 기록이 다음 생의 힘이 됩니다.', type: 'passive', level: 40, job: 'abyssArchivist', chance: 0, cooldown: 0, multiplier: 0, cost: 4, bonus: { rebirthBonus: 1, dungeonGoldBonus: .1 }, perCount: [{ source: 'rebirth', per: 1, bonus: { attack: 5, magic: 5, hp: 18, defense: 1, resist: 1 }, cap: 12 }] },
    { id: 'electricBite', name: '전기 이빨', desc: '물리 공격 피해, 3턴 감속. 동굴 수호자의 기술을 물어뜯는 기술로 계승합니다.', type: 'active', level: 25, job: 'stormEel', chance: .28, cooldown: 4, multiplier: 1.75, effect: 'slow', damageType: 'physical', statusTurns: 3, cost: 4, manaCost: 9 },
    { id: 'tentacleBarrage', name: '크라켄의 촉수 난무', desc: '물리 공격 115% 피해 후 최대 2회의 추가타. 보스의 기술을 배웁니다.', type: 'active', level: 40, rebirth: 1, job: 'krakenkin', chance: .26, cooldown: 6, multiplier: 1.15, extraAttacks: 2, extraAttackMultiplier: .5, cost: 6, manaCost: 8 },
);

// 공용 스킬은 시작 무기인 hook 하나만 남깁니다. 나머지 기술은
// 직업 전직으로 얻고, 장착 처치로 계승 자격을 만든 뒤 SP로 보강합니다.
// 저장된 스킬 ID는 그대로 유지되므로 기존 세이브도 안전하게 읽힙니다.
const skillJobAssignments: Record<string, string> = {
    breath: 'fisher', arcane: 'bubbleMage', cut: 'barbSkirmisher',
    focus: 'squidJester', scales: 'scaleKnight', vital: 'lifeTender', resolve: 'oathAngler',
    hunt: 'stormHunter', spring: 'tideMender',
    hushCurrent: 'stillwaterBinder', undertow: 'stillwaterBinder', rushCurrent: 'wakeRunner',
    insight: 'manaScribe', flow: 'manaScribe', precision: 'wanderer',
    goldMemory: 'memoryMerchant', soulShell: 'coralSaint', twinHook: 'twinAngler',
};
for (const sk of SKILLS) {
    const job = skillJobAssignments[sk.id];
    if (job)
        sk.job = job;
}

// 탐구 직업의 수치는 데이터만 수정해 확장합니다. 조건부 숙련은 가장 큰 효과 하나만 적용합니다.
SKILLS.push(
    { id: 'voyageReview', name: '항해 복기', desc: '획득 경험치 +12%. 공격용 AP를 비워 두는 대신 항해의 성장을 앞당깁니다.', type: 'passive', level: 10, job: 'voyageScribe', chance: 0, cooldown: 0, multiplier: 0, cost: 3, bonus: { expBonus: .08 }, masteryMilestones: [600, 3000, 12000, 40000], rankEffects: { bonusScale: .375 } },
    { id: 'chronicleStudy', name: '겹쳐 읽는 항해', desc: '획득 경험치 +18%. 여러 삶의 기록을 대조하는 장기 성장 패시브입니다.', type: 'passive', level: 25, job: 'chronicleNavigator', chance: 0, cooldown: 0, multiplier: 0, cost: 4, bonus: { expBonus: .12 }, masteryMilestones: [1500, 7000, 25000, 80000], rankEffects: { bonusScale: .375 }, levelEffects: [{ cost: 4, bonus: { expBonus: .12, attack: 16, magic: 16, hp: 60 } }, { cost: 4, bonus: { expBonus: .15, attack: 22, magic: 22, hp: 80 } }, { cost: 3, bonus: { expBonus: .18, attack: 30, magic: 30, hp: 110 } }, { cost: 1, bonus: { expBonus: .22, attack: 40, magic: 40, hp: 150 } }, { cost: -1, bonus: { expBonus: .26, attack: 52, magic: 52, hp: 200 } }] },
    { id: 'titanFieldNotes', name: '거수 관찰일지', desc: '보스 처치 시 직업과 장착 스킬의 숙련도를 추가 획득합니다. 숙련할수록 장착 AP가 4 → 0으로 줄고 체력·두 공격이 오릅니다.', type: 'passive', level: 10, job: 'bossNaturalist', chance: 0, cooldown: 0, multiplier: 0, cost: 4, masteryGain: { bossOnly: true, bonusByLevel: [2, 3, 4, 5, 7] }, masteryMilestones: [1000, 5000, 18000, 60000], levelEffects: [{ cost: 4, bonus: {} }, { cost: 4, bonus: { hp: 30 } }, { cost: 3, bonus: { hp: 60, attack: 6, magic: 6 } }, { cost: 2, bonus: { hp: 100, attack: 12, magic: 12 } }, { cost: 0, bonus: { hp: 160, attack: 20, magic: 20 } }] },
    { id: 'serpentFolklore', name: '전류 비늘 해독', desc: '지정 몬스터(리본 돼지·파이어보어·머쉬맘) 처치에서 직업과 장착 스킬의 숙련도를 추가 획득합니다. 숙련할수록 장착 AP가 4 → 0으로 줄고 마법 공격·마법 방어가 오릅니다.', type: 'passive', level: 25, job: 'speciesChronicler', chance: 0, cooldown: 0, multiplier: 0, cost: 4, bonus: { magic: 24, resist: 8 }, masteryGain: { enemyIds: ['eel', 'emberEel', 'grottoWarden'], bonusByLevel: [3, 4, 5, 7, 9] }, masteryMilestones: [2000, 9000, 30000, 90000], levelEffects: [{ cost: 4, bonus: { magic: 24, resist: 8 } }, { cost: 4, bonus: { magic: 32, resist: 11 } }, { cost: 3, bonus: { magic: 44, resist: 15 } }, { cost: 2, bonus: { magic: 60, resist: 20 } }, { cost: 0, bonus: { magic: 80, resist: 26, mana: 30 } }] },
    { id: 'echoReview', name: '메아리 복기', desc: '획득 경험치 +6%, 마법 공격 +30, 최대 마나 +15, 마력 평타 계수 +20%p. 보스의 목소리를 이해할 때까지 얻는 배움입니다.', type: 'passive', level: 25, job: 'echoTamer', chance: 0, cooldown: 0, multiplier: 0, cost: 2, bonus: { expBonus: .04, magic: 30, mana: 15, arcaneRatioBonus: .2 }, masteryMilestones: [1200, 6000, 24000, 70000], rankEffects: { bonusScale: .375 } },
    { id: 'sovereignSilence', name: '메아리의 무음 포효', desc: '보스에게서 배운 주문. 마법 공격 115% 피해와 2턴 침묵을 가합니다.', type: 'active', level: 25, job: 'echoTamer', chance: .23, cooldown: 5, multiplier: 1.15, damageType: 'magic', effect: 'silence', statusTurns: 2, cost: 5, manaCost: 14, sourceEnemySkill: 'foeSilence', unlockJobMastery: 6000, masteryMilestones: [5000, 20000, 60000, 120000], rankEffects: { chanceIncrease: .025, manaReduction: 1, multiplierScale: .08 } },
    { id: 'abyssObservation', name: '심연의 몸짓 읽기', desc: '지정 심연 보스 처치에서 직업과 장착 스킬의 숙련도를 추가 획득합니다. 숙련할수록 장착 AP가 5 → −1로 줄고 공격·체력·명중이 크게 오릅니다.', type: 'passive', level: 40, job: 'abyssMimic', rebirth: 1, chance: 0, cooldown: 0, multiplier: 0, cost: 5, bonus: { attack: 36, hp: 120, accuracy: .03 }, masteryGain: { bossOnly: true, enemyIds: ['kelpHydra', 'magmaKraken', 'abyssSovereign'], bonusByLevel: [4, 5, 6, 8, 9] }, masteryMilestones: [4000, 16000, 50000, 120000], levelEffects: [{ cost: 5, bonus: { attack: 36, hp: 120, accuracy: .03 } }, { cost: 5, bonus: { attack: 48, hp: 160, accuracy: .04 } }, { cost: 4, bonus: { attack: 64, hp: 210, accuracy: .05 } }, { cost: 2, bonus: { attack: 84, hp: 270, accuracy: .06 } }, { cost: -1, bonus: { attack: 110, hp: 340, accuracy: .08, crit: .03 } }] },
    { id: 'borrowedTentacles', name: '모사한 촉수 난무', desc: '보스에게서 배운 연격. 물리 공격 135% 피해 후 그 위력의 70%로 한 번 더 공격합니다.', type: 'active', level: 40, job: 'abyssMimic', rebirth: 1, chance: .22, cooldown: 5, multiplier: 1.35, damageType: 'physical', extraAttacks: 1, extraAttackMultiplier: .7, cost: 6, manaCost: 18, sourceEnemySkill: 'foeFrenzy', unlockJobMastery: 20000, masteryMilestones: [10000, 40000, 100000, 200000], rankEffects: { chanceIncrease: .02, apReduction: .5, manaReduction: 1, multiplierScale: .1 } },
);

// 장기 성장의 누적 숙련 곡선. 직업 해금은 무료 기본 Lv.0이며
// 각 숫자가 성장 Lv.1, 2, ...의 목표입니다. SP와 숙련이 같은 단계를 엽니다.
// 올라운더: 원시 피해 = 40 + 직접 배분 포인트 합 × 0.8 + 가장 낮은 배분 포인트 × 12 (장비·버프 제외), 스킬 배율 2.2.
// 물리 50%·마법 50%로 나눠 각각 방어를 적용하며, 일반 공격력은 더하지 않습니다. 수치는 검증 초안입니다.
SKILLS.push({ id: 'harmonicWeight', name: '육중 조화', desc: '직접 배분한 여섯 능력치로 원시 피해를 만들고 물리·마법 절반씩 복합 피해를 입힙니다. 가장 낮은 능력치가 높을수록 강해집니다.', type: 'active', level: 40, job: 'allRounder', chance: .5, cooldown: 3, damageType: 'split', scaling: 'harmony', cost: 4, manaCost: 16, multiplier: 2.2 });

// v21 직업 확장 기술. 직업 레벨·숙련 곡선·밸런스 표는 아래 공통 처리에서 적용됩니다.
SKILLS.push(...EXPANSION_SKILLS);
// v23 계보 보강 기술.
SKILLS.push(...LINEAGE_SKILLS);
// v24 계보 완성 기술.
SKILLS.push(...V24_SKILLS);
// v25.14 방어 계열 보강 기술.
SKILLS.push(...DEFENSE_SKILLS);
// v25.24 역전 계보 기술.
SKILLS.push(...INVERSION_SKILLS);
// v25.26 외길 계보 기술.
SKILLS.push(...MONOSTAT_SKILLS);
// v24.2 보조 계열 개편·??? 문 직업 기술. 패시브 수치는 여기서 덮어씁니다(액티브는 skill-balance.ts).
SKILLS.push(...SUPPORT_SKILLS);
// v25 ??? 특수 직업 기술.
SKILLS.push(...V25_SKILLS);
for (const sk of SKILLS) if (SUPPORT_PASSIVES[sk.id]) Object.assign(sk, SUPPORT_PASSIVES[sk.id]);
// v21 회복 기술은 체력 조건 없이 시도합니다. 회복이 필요 없을 때의 피해 감소는 combat.ts에서 처리합니다.
for (const sk of SKILLS) if (sk.effect === 'heal') delete sk.condition;

const masteryTuning: Record<string, number[]> = {
    hook: [120, 600, 2400, 8000],
    breath: [200, 1000, 4000, 12000],
    pierce: [350, 1800, 7000, 20000], anchor: [400, 2000, 8000, 24000],
    whaleStrike: [800, 4000, 16000, 45000],
    vitalSurge: [800, 5000, 18000, 50000],
    pearlLedger: [1200, 7000, 24000, 65000],
    memoryOfTides: [2500, 15000, 50000, 100000],
};
// 랭크별 성장 방향은 스킬별 데이터로 조정합니다. 수치는 랭크가 1 오를 때마다 적용됩니다.
const rankEffects: Record<string, Skill['rankEffects']> = {
    hook: { chanceIncrease: .04 }, breath: { chanceIncrease: .05, manaReduction: 1 },
    pierce: { apReduction: 1 }, hunt: { chanceIncrease: .05 }, wave: { manaReduction: 1 }, spring: { chanceIncrease: .05, manaReduction: 1 },
    anchor: { apReduction: 1 }, fortress: { manaReduction: 1 }, focus: { bonusScale: .3 }, scales: { bonusScale: .3 }, vital: { bonusScale: .3 }, resolve: { bonusScale: .3 },
    arcane: { chanceIncrease: .05, manaReduction: 1 }, cut: { chanceIncrease: .04 }, hushCurrent: { chanceIncrease: .04, manaReduction: 1 }, undertow: { chanceIncrease: .04 }, rushCurrent: { chanceIncrease: .05, cooldownReduction: 1 }, insight: { bonusScale: .3 }, flow: { bonusScale: .3 }, precision: { bonusScale: .3 },
    whaleStrike: { apReduction: 1 }, barb: { bonusScale: .3 }, razor: { chanceIncrease: .05 }, drift: { bonusScale: .3 }, maelstrom: { manaReduction: 2 }, abyssMind: { bonusScale: .3 },
    pearlPrayer: { chanceIncrease: .05, manaReduction: 1 }, soulTide: { bonusScale: .3 }, crush: { apReduction: 1 }, ironWill: { bonusScale: .3 }, oath: { chanceIncrease: .05, manaReduction: 1 }, balance: { bonusScale: .3 },
    goldMemory: { bonusScale: .3 }, soulShell: { bonusScale: .3 },
    vitalSurge: { chanceIncrease: .05, manaReduction: 1 }, adaptiveCore: { bonusScale: .3 },
    wakeFist: { chanceIncrease: .05 }, rippleGlyph: { chanceIncrease: .04, manaReduction: 1 }, greenTide: { chanceIncrease: .05, manaReduction: 1 }, inkTrick: { chanceIncrease: .05 },
    tideUppercut: { chanceIncrease: .03, multiplierScale: .12 }, callousedHands: { bonusScale: .3 }, anchorBreak: { apReduction: 1 }, roughLine: { bonusScale: .3 },
    krakenBore: { chanceIncrease: .04, multiplierScale: .18 }, deepWeakpoint: { bonusScale: .3 }, needleStep: { chanceIncrease: .05 }, afterimage: { bonusScale: .3 },
    runeCurrent: { chanceIncrease: .04, manaReduction: 1 }, tidalScript: { bonusScale: .3 }, saltCatalyst: { chanceIncrease: .05 }, volatileFormula: { bonusScale: .3 },
    thunderPsalm: { chanceIncrease: .04, manaReduction: 2 }, overcast: { bonusScale: .3 }, moonTide: { chanceIncrease: .05, manaReduction: 1 }, tidalFate: { bonusScale: .3 },
    reefPulse: { chanceIncrease: .05, manaReduction: 1 }, symbioticCoral: { bonusScale: .3 }, bellCrash: { apReduction: 1 }, shellEcho: { bonusScale: .3 },
    sanctuaryShell: { bonusScale: .3 }, saintTide: { bonusScale: .3 }, thornCounter: { chanceIncrease: .05 }, reefFortress: { bonusScale: .3 },
    windupCast: { chanceIncrease: .04, manaReduction: 1 }, springLoaded: { bonusScale: .3 }, loadedHook: { chanceIncrease: .04, cooldownReduction: 1 }, riskDividend: { bonusScale: .3 },
    redWake: { chanceIncrease: .04 }, bloodEngine: { bonusScale: .3 },
    netWeave: { bonusScale: .3 }, fishWhisper: { bonusScale: .3 }, driftwoodGuard: { bonusScale: .3 }, salvageSense: { bonusScale: .3 },
    twinHook: { chanceIncrease: .04, cooldownReduction: 1 }, chartedCurrents: { bonusScale: .3 }, pearlLedger: { bonusScale: .3 }, salvageContract: { bonusScale: .3 }, rareSense: { bonusScale: .3 }, memoryOfTides: { bonusScale: .3 }, electricBite: { chanceIncrease: .04, manaReduction: 1 }, tentacleBarrage: { chanceIncrease: .03, cooldownReduction: 1 },
};
for (const sk of SKILLS)
    sk.rankEffects = rankEffects[sk.id] ?? sk.rankEffects;

// Default curves follow tier; HP/MP scaling and AP-saving effects take longer.
for (const sk of SKILLS) {
    const job = JOBS.find(j => j.id === sk.job);
    if (job) sk.level = job.tier === 0 ? sk.level : job.level;
    const curve = !job || job.tier === 0 ? [120, 600, 2400, 8000] : job.tier === 1 ? [250, 1200, 4500, 14000] : job.tier === 2 ? [600, 3000, 12000, 36000] : [1500, 7500, 28000, 75000];
    const longTerm = !!sk.scaling || !!sk.rankEffects?.apReduction;
    sk.masteryMilestones = masteryTuning[sk.id] || sk.masteryMilestones || curve.map(n => Math.round(n * (longTerm ? 1.4 : 1)));
    // v27.95 차수별 요구 숙련 상향(3차 ×3 · 4차 ×10 · 5차 ×25). 공용·1·2차 스킬은 그대로입니다.
    const scale = skillMasteryScale(sk);
    sk.masteryMilestones = sk.masteryMilestones.map(n => n * scale);
}

// v27.57 지속 피해 정리. ① 계열 패시브의 '지속 피해 증가'를 그 계열이 실제로 거는 상태이상 하나로 나눕니다
// (불·독 마스터리류 → 중독, 이그나이트 → 화상, 데몬어벤져·일리움 → 출혈). 범용(칼리·약재상·독버섯·도트 퍼니셔)은 모든 지속 피해 그대로.
// ② 기술마다 따로 적은 틱 비율(dotRatio)을 새 기본 비율에 맞춰 같은 비율로 옮깁니다(중독 0.14 → 0.075, 출혈 0.22 → 0.26).
const DOT_TYPE: Record<string, 'bleedBonus' | 'poisonBonus' | 'burnBonus'> = {
    toxinLore: 'poisonBonus', lethalDose: 'poisonBonus', pestilence: 'poisonBonus', plagueVessel: 'burnBonus',
    bloodScent: 'bleedBonus', trailOfRed: 'bleedBonus', hemorrhage: 'bleedBonus', bloodFrenzy: 'bleedBonus', endlessBleed: 'bleedBonus',
    philosopherSalt: 'bleedBonus', philosopherBrine: 'bleedBonus', elixirOfDepth: 'bleedBonus',
};
const DOT_WORD = { bleedBonus: '출혈 피해', poisonBonus: '중독 피해', burnBonus: '화상 피해' } as const;
for (const sk of SKILLS) {
    const to = DOT_TYPE[sk.id];
    if (to && sk.bonus?.dotBonus) { const { dotBonus, ...rest } = sk.bonus; sk.bonus = { ...rest, [to]: dotBonus }; sk.desc = sk.desc.replace('지속 피해', DOT_WORD[to]); }
    if (sk.dotRatio !== undefined && sk.effect === 'poison') sk.dotRatio = Math.round(sk.dotRatio * SKILL_FORMULA.poisonRatio / .14 * 1000) / 1000;
    if (sk.dotRatio !== undefined && sk.effect === 'bleed') sk.dotRatio = Math.round(sk.dotRatio * SKILL_FORMULA.bleedRatio / .22 * 1000) / 1000;
}

// Apply the centralized player balance after assignment and mastery defaults.
tuneActiveSkills(SKILLS, sk => JOBS.find(j => j.id === sk.job)?.tier ?? 0);

// v27.40 메이플 스킬 이름: maple-skills.ts 한곳에서 덮어씁니다(id·효과는 그대로).
for (const sk of SKILLS) sk.name = MAPLE_SKILL_NAMES[sk.id] ?? sk.name;

/** id로 찾기(첫 항목 우선, SKILLS.find와 같은 결과). 모듈 초기화가 끝난 뒤 처음 부를 때 한 번 만듭니다. */
let skillByIdMap: Map<string, Skill> | undefined;
export function skillById(id: string | undefined) {
    if (!skillByIdMap) { skillByIdMap = new Map(); for (const x of SKILLS) if (!skillByIdMap.has(x.id)) skillByIdMap.set(x.id, x); }
    return id === undefined ? undefined : skillByIdMap.get(id);
}

/**
 * v3.47 정보 비공개(docs/concept.md 10장): 비밀 직업의 스킬을 나중에 더합니다. 서버는 game/secret/register.ts, 화면은 카탈로그(catalog.ts).
 * 이미 완성된 모양(위 후처리를 거친 값)이라 그대로 넣고, 같은 id가 있으면 바꿉니다. id 찾기 캐시는 비웁니다.
 */
export function registerSkills(list: Skill[]) {
    for (const sk of list) {
        const at = SKILLS.findIndex(x => x.id === sk.id);
        if (at >= 0) SKILLS[at] = sk; else SKILLS.push(sk);
    }
    skillByIdMap = undefined;
}

/** v27.95 스킬 숙련 단계 배율: 그 스킬 전용 직업의 차수로 정합니다(공용 스킬은 1). 옛 세이브의 계승 보존(migrations)도 이 값으로 옛 기준을 되돌립니다. */
export function skillMasteryScale(sk: Pick<Skill, 'job'>) {
    const tier = sk.job ? JOBS.find(j => j.id === sk.job)?.tier ?? 0 : 0;
    return PROGRESSION.skillMasteryTierScale[tier] ?? 1;
}
// v3.65 공개 특수 직업의 스킬(data/specials.ts, 완성된 모양).
registerSkills(SPECIAL_SKILLS);
// v3.69 옛 독립 수련의 스킬은 id 그대로 새 수련 직업이 가집니다(data/training.ts).
for (const sk of SKILLS) {
    const owner = trainingSkillOwner(sk.id, sk.job);
    if (!owner) continue;
    sk.job = owner;
    // v3.69 수련 패시브: 1레벨부터 3차 패시브 수준, 숙련 요구치도 3차 수준(data/training.ts TRAINING_PASSIVE).
    if (sk.type !== 'passive') continue;
    if (sk.bonus) sk.bonus = scaleTrainingBonus(sk.bonus as Record<string, number>);
    sk.masteryMilestones = [...TRAINING_PASSIVE.milestones];
    sk.desc = TRAINING_DESC[sk.id] ?? sk.desc;
}
// v3.70 능력치 수련 패시브(data/stat-training.ts).
registerSkills(STAT_TRAINING_SKILLS);
/**
 * v3.80 직업 숙달 목표 = 그 직업 스킬의 마지막 숙련 단계 중 가장 큰 값 × 40%(MASTERY_ALIGN.ratio). 스킬 숙련 기준과 같이 오르도록 맞춥니다.
 * 예전 목표는 LEGACY_MASTERY_TARGET에 남겨, 그 기준으로 이미 숙달한 직업은 숙달로 둡니다(migrations.keepMasteredJobs).
 * 능력치 수련(목표를 따로 정함) · 해커(처치 숙련 없음) · 스킬이 없는 직업은 그대로입니다. 5차 전직 조건(부모 숙달)도 새 목표를 따릅니다.
 * 비밀 직업은 서버가 등록한 뒤(secret/register.ts) 같은 함수로 맞춥니다.
 */
/**
 * v3.80 스킬 숙련 기준(docs/concept.md 11.9): 차수별 기본 곡선 하나가 원칙이고, 장기 성장형(진행도 비례 피해 · AP 감소)은 ×1.4.
 * 개별 조정은 기본 곡선 마지막 단계의 ±50% 안에서만 두고, 벗어나면 기본 곡선(단계 수가 다르면 같은 모양 비율)으로 되돌립니다.
 * 따로 정한 체계는 예외: 수련 패시브(3차 곡선) · 능력치 수련 · 玄의 天 · 해커 스킬. 예전 첫 단계는 LEGACY_FIRST_MILESTONE에 남겨 계승을 보존합니다.
 */
export const SKILL_TIER_CURVE: Record<number, number[]> = { 0: [120, 600, 2400, 8000], 1: [250, 1200, 4500, 14000], 2: [600, 3000, 12000, 36000], 3: [4500, 22500, 84000, 225000], 4: [25000, 120000, 400000, 1000000], 5: [100000, 450000, 1500000, 3750000] };
export const SKILL_CURVE_BAND = .5;
/**
 * v3.80 제약형 스킬: 최대 숙련에서 AP가 0 이하가 되는 스킬(노래 제외)과 제약 직업(유리 대포 · 玄)의 스킬.
 * 숙련 요구치를 천만 단위로 둡니다: AP를 돌려주는(음수) 스킬 5,000만 · 그 밖 1,000만(같은 모양 비율). 직업 숙달 목표 계산에서는 뺍니다.
 */
export const CONSTRAINT_MASTERY = { free: 10_000_000, refund: 50_000_000 };
/** v3.80 개별 예외: 본 레거시(죽지않은 영혼)는 v3.137부터 마지막 단계 1,000만(100만 · 400만 · 1,000만, 망인 숙달 목표와 같음). */
export const CONSTRAINT_MASTERY_BY_SKILL: Record<string, number> = { boneLegacy: 10_000_000 };
const CONSTRAINT_JOBS = new Set(['glassHarpooner', 'glyphMonk']);
/** 최대 숙련(한계돌파 전)에서의 AP. progression.effectiveSkill과 같은 식입니다(순환 참조를 피해 여기서 계산). */
export function costAtMastery(sk: Skill) {
    const max = (sk.masteryMilestones?.length ? sk.masteryMilestones : PROGRESSION.skillMasteryMilestones).length;
    return sk.levelEffects?.[max]?.cost ?? Math.max(1, (sk.cost ?? 2) - Math.floor(max * (sk.rankEffects?.apReduction ?? 0))) - (sk.type === 'passive' ? SKILL_FORMULA.masteredPassiveAP : 0);
}
export const isConstraintSkill = (sk: Skill) => !sk.song && (costAtMastery(sk) <= 0 || !!sk.job && CONSTRAINT_JOBS.has(sk.job));
/** 예외: 수련 · 능력치 수련 · 해커 스킬 · 역할 경계 직업(제로 · 아이돌 연습생)의 스킬(제약형은 따로 천만 단위). */
const SKILL_CURVE_EXEMPT = (sk: Skill) => !!sk.job && (/^training/.test(sk.job) || /Training[123]$|[hH]acker$/.test(sk.job) || ['border', 'borderBuffer', 'borderReflect', 'borderStand'].includes(subRoleOf(JOBS.find(j => j.id === sk.job) ?? { id: sk.job }, '')));
export const LEGACY_FIRST_MILESTONE: Record<string, number> = {};
const round2 = (n: number) => { const p = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; };
export function normalizeSkillMastery(list: Skill[]) {
    for (const sk of list) {
        const job = JOBS.find(j => j.id === sk.job);
        if (!job || job.tier < 1 || SKILL_CURVE_EXEMPT(sk) || !sk.masteryMilestones?.length) continue;
        const curve = SKILL_TIER_CURVE[Math.min(5, job.tier)], longTerm = !!sk.scaling || !!sk.rankEffects?.apReduction;
        const ms = sk.masteryMilestones, ratio = ms.at(-1)! / curve.at(-1)!;
        if (isConstraintSkill(sk)) {
            const last = CONSTRAINT_MASTERY_BY_SKILL[sk.id] ?? (costAtMastery(sk) < 0 ? CONSTRAINT_MASTERY.refund : CONSTRAINT_MASTERY.free);
            if (ms.at(-1) !== last) { LEGACY_FIRST_MILESTONE[sk.id] = ms[0]; sk.masteryMilestones = ms.map(n => round2(n * last / ms.at(-1)!)); }
            continue;
        }
        if (ratio >= 1 - SKILL_CURVE_BAND && ratio <= 1 + SKILL_CURVE_BAND) continue;
        const want = curve.at(-1)! * (longTerm ? 1.4 : 1);
        LEGACY_FIRST_MILESTONE[sk.id] = ms[0];
        sk.masteryMilestones = ms.length === curve.length ? curve.map(n => Math.round(n * (longTerm ? 1.4 : 1))) : ms.map(n => round2(n * want / ms.at(-1)!));
    }
}
normalizeSkillMastery(SKILLS);
/**
 * v3.83 유틸리티 획득 강화(docs/concept.md 11.9 5-1): 유틸리티 직업 스킬의 골드·경험치·장비 드롭 보너스 ×1.5.
 * 원본 수치는 그대로 두고 불러올 때 한 번 곱합니다(같은 객체를 두 번 곱하지 않음). 설명 글의 숫자는 곱한 값으로 적습니다.
 * 변종·황금 확률 · 숙련 획득 같은 다른 유틸리티 효과는 그대로입니다.
 */
export const UTILITY_GAIN_SCALE = 1.5;
const GAIN_KEYS = new Set(['goldBonus', 'expBonus', 'dropBonus']);
const gainScaled = new WeakSet<object>();
export function scaleUtilityGain(list: Skill[]) {
    const walk = (o: unknown) => {
        if (!o || typeof o !== 'object' || gainScaled.has(o)) return;
        gainScaled.add(o);
        const rec = o as Record<string, unknown>;
        for (const [k, v] of Object.entries(rec)) {
            if (GAIN_KEYS.has(k) && typeof v === 'number') rec[k] = Math.round(v * UTILITY_GAIN_SCALE * 10000) / 10000;
            else walk(v);
        }
    };
    for (const sk of list) {
        const job = JOBS.find(j => j.id === sk.job);
        if (job && subRoleOf(job, lineageOf(job)) === 'utility') walk(sk);
    }
}
scaleUtilityGain(SKILLS);
/** v3.137 망인(undead)은 숙달 목표를 데이터 그대로(1,000만) 씁니다. */
export const MASTERY_ALIGN = { ratio: .4, keep: /^(str|dex|int|vit|wis|luk)Training[123]$|[hH]acker$|^undead$/ };
export const LEGACY_MASTERY_TARGET: Record<string, number> = {};
const roundTarget = (n: number) => n >= 10_000 ? Math.round(n / 1000) * 1000 : Math.round(n / 100) * 100;
export function alignJobMastery(jobs: Job[]) {
    for (const job of jobs) {
        if (job.tier < 1 || MASTERY_ALIGN.keep.test(job.id) || job.id in LEGACY_MASTERY_TARGET) continue;
        const own = SKILLS.filter(sk => sk.job === job.id && !sk.song);
        if (!own.length) continue;
        // v3.80 제약형 스킬(천만 단위)은 빼고 셉니다. 제약형뿐인 직업은 차수 기본 곡선을 씁니다.
        const usual = own.filter(sk => !isConstraintSkill(sk));
        const lasts = usual.length ? usual.map(sk => (sk.masteryMilestones?.length ? sk.masteryMilestones : PROGRESSION.skillMasteryMilestones).at(-1)!) : [SKILL_TIER_CURVE[Math.min(5, job.tier)].at(-1)!];
        LEGACY_MASTERY_TARGET[job.id] = job.masteryTarget!;
        job.masteryTarget = roundTarget(Math.max(...lasts) * MASTERY_ALIGN.ratio);
    }
    for (const job of jobs) {
        const parent = job.tier >= 5 && job.parent ? JOBS.find(j => j.id === job.parent) : undefined;
        if (parent && LEGACY_MASTERY_TARGET[parent.id] !== undefined && job.mastery === LEGACY_MASTERY_TARGET[parent.id]) job.mastery = parent.masteryTarget!;
    }
}
alignJobMastery(JOBS);
