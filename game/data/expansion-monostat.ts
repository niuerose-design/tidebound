/**
 * v25.26 외길 계보: 능력치 하나만 올리는 낚시꾼을 위한 1~3차 계보 여섯 줄.
 * 전직 조건이 그 능력치 하나뿐이고(20 → 60 → 110), 기술도 그 능력치가 올리는 수치만 씁니다.
 * 고르게 배분한 낚시꾼은 요구치에 닿지 못하므로, 몰아 찍는 플레이만의 길입니다. 성능은 같은 차수의 일반 직업 수준입니다.
 */
import type { Job } from './classes';
import type { Skill, Attribute } from '../types';
/** 외길 액티브: 배분 능력치 × 비율을 기준값에 더합니다. 근력·지능은 공격력이 이미 비례하므로 비율이 낮고, 기민·체질·정신·행운은 그 능력치만으로 사냥이 되도록 높습니다. */
const attr = (a: Attribute, ratio: number) => ({ scaling: 'attr' as const, scalingAttribute: a, scalingRatio: ratio });

type NewJob = Omit<Job, 'masteryTarget' | 'masteryBoost'> & Partial<Pick<Job, 'masteryTarget' | 'masteryBoost'>>;
const neutral = { attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0 };
const T1 = { tier: 1, level: 10, mastery: 0, masteryTarget: 450, masteryBoost: .08 };
const T2 = { tier: 2, level: 25, mastery: 75, masteryTarget: 2800, masteryBoost: .18 };
const T3 = { tier: 3, level: 40, mastery: 150, masteryTarget: 10000, masteryBoost: .3 };
const R1 = 20, R2 = 60, R3 = 110;

export const MONOSTAT_JOBS: NewJob[] = [
    // ── 근력 외길 (물리) ──
    { id: 'brawnFisher', name: '괴력 어부', title: '힘으로만 낚는다', desc: '근력 하나로 전직하는 외길 1차 직업입니다. 통나무 휘두르기와 우악스러운 손으로 힘만 키웁니다.', ...neutral, bonus: { attack: 4 }, ...T1, requires: { str: R1 }, role: '외길·근력', tree: 'physical' },
    { id: 'mightyStrongman', name: '괴력 장사', title: '바위도 미끼가 된다', desc: '기절을 거는 바위 던지기와 물리 공격·체력 패시브를 가진 근력 외길 2차 직업입니다.', ...neutral, bonus: { attack: 26, hp: 30 }, crit: .03, ...T2, parent: 'brawnFisher', requires: { str: R2 }, requiresSkillMastery: { logSwing: 2 }, role: '외길·근력·기절', tree: 'physical' },
    { id: 'colossus', name: '괴력의 거인', title: '산을 가르는 팔', desc: '산 가르기와 물리 공격·관통 패시브로 근력 외길의 끝에 선 3차 직업입니다.', ...neutral, bonus: { attack: 62, hp: 60 }, crit: .05, ...T3, parent: 'mightyStrongman', requires: { str: R3 }, requiresSkillMastery: { boulderToss: 3 }, role: '외길·근력·관통', tree: 'physical' },
    // ── 기민 외길 (물리) ──
    { id: 'nimbleAngler', name: '잽싼 낚시꾼', title: '손이 먼저 간다', desc: '기민 하나로 전직하는 외길 1차 직업입니다. 연속 찌르기와 속도·명중 패시브로 횟수를 쌓습니다.', ...neutral, bonus: { attack: 3 }, ...T1, requires: { dex: R1 }, role: '외길·기민', tree: 'physical' },
    { id: 'galeDancer', name: '질풍 검무사', title: '바람보다 세 번 빠르다', desc: '질풍 삼연격과 속도·회피·물리 공격 패시브를 가진 기민 외길 2차 직업입니다.', ...neutral, bonus: { attack: 22 }, crit: .05, ...T2, parent: 'nimbleAngler', requires: { dex: R2 }, requiresSkillMastery: { rapidJab: 2 }, role: '외길·기민·연타', tree: 'physical' },
    { id: 'shadowRunner', name: '그림자 질주자', title: '잔상만 남긴다', desc: '잔상 난무와 속도·회피·치명 패시브로 기민 외길의 끝에 선 3차 직업입니다.', ...neutral, bonus: { attack: 54 }, crit: .08, ...T3, parent: 'galeDancer', requires: { dex: R3 }, requiresSkillMastery: { galeTriple: 3 }, role: '외길·기민·연타', tree: 'physical' },
    // ── 지능 외길 (마법) ──
    { id: 'manaDevotee', name: '마력 몰입자', title: '오직 마력', desc: '지능 하나로 전직하는 외길 1차 직업입니다. 순수 마력탄과 마법 공격 패시브로 마력만 키웁니다.', ...neutral, bonus: { magic: 5 }, ...T1, requires: { int: R1 }, role: '외길·지능', tree: 'magic' },
    { id: 'arcaneSeeker', name: '마력 탐구자', title: '마력의 결을 읽는다', desc: '약화를 거는 마력 파열과 마법 공격·마나 패시브를 가진 지능 외길 2차 직업입니다.', ...neutral, bonus: { magic: 30 }, crit: .03, ...T2, parent: 'manaDevotee', requires: { int: R2 }, requiresSkillMastery: { pureBolt: 2 }, role: '외길·지능·약화', tree: 'magic' },
    { id: 'pureMagus', name: '순수 마도사', title: '마력 그 자체', desc: '마력 폭발과 마법 공격·관통 패시브로 지능 외길의 끝에 선 3차 직업입니다.', ...neutral, bonus: { magic: 70 }, crit: .05, ...T3, parent: 'arcaneSeeker', requires: { int: R3 }, requiresSkillMastery: { manaRupture: 3 }, role: '외길·지능·관통', tree: 'magic' },
    // ── 체질 외길 (방어) ──
    { id: 'bulkyFisher', name: '거구 어부', title: '몸으로 밀어붙인다', desc: '체질 하나로 전직하는 외길 1차 직업입니다. 체력 비례 몸통 박치기와 체력 패시브로 덩치만 키웁니다.', ...neutral, bonus: { hp: 40 }, ...T1, requires: { vit: R1 }, role: '외길·체질', tree: 'defense' },
    { id: 'hulkingBrute', name: '거구 장사', title: '벽이 걸어온다', desc: '기절을 거는 체력 비례 육중한 돌진과 체력·물리 방어 패시브를 가진 체질 외길 2차 직업입니다.', ...neutral, bonus: { hp: 160, defense: 6, attack: 10 }, ...T2, parent: 'bulkyFisher', requires: { vit: R2 }, requiresSkillMastery: { bodySlam: 2 }, role: '외길·체질·기절', tree: 'defense' },
    { id: 'mountainBody', name: '거산', title: '산이 움직인다', desc: '체력 비례 산사태와 체력·방어·재생 패시브로 체질 외길의 끝에 선 3차 직업입니다.', ...neutral, bonus: { hp: 360, defense: 14, attack: 20 }, ...T3, parent: 'hulkingBrute', requires: { vit: R3 }, requiresSkillMastery: { massiveCharge: 3 }, role: '외길·체질·재생', tree: 'defense' },
    // ── 정신 외길 (상태이상: 침묵) ──
    { id: 'stillAngler', name: '고요한 낚시꾼', title: '마음이 물결을 밀어낸다', desc: '정신 하나로 전직하는 외길 1차 직업입니다. 최대 마나 비례 정신 파동과 마나·마법 방어 패시브를 익힙니다.', ...neutral, bonus: { resist: 4 }, ...T1, requires: { wis: R1 }, role: '외길·정신', tree: 'status' },
    { id: 'meditantAdept', name: '명상 수행자', title: '고요가 깊어진다', desc: '침묵을 거는 마나 비례 마나 해일과 마나·마법 방어 패시브를 가진 정신 외길 2차 직업입니다.', ...neutral, bonus: { magic: 12, resist: 14 }, ...T2, parent: 'stillAngler', requires: { wis: R2 }, requiresSkillMastery: { mindWave: 2 }, role: '외길·정신·침묵', tree: 'status' },
    { id: 'voidMind', name: '무념의 현인', title: '생각이 멎은 자리에 힘이 남는다', desc: '마나 비례 무념 폭류와 마나·마법 방어·마나 회복 패시브로 정신 외길의 끝에 선 3차 직업입니다.', ...neutral, bonus: { magic: 30, resist: 26 }, ...T3, parent: 'meditantAdept', requires: { wis: R3 }, requiresSkillMastery: { manaTide: 3 }, role: '외길·정신·마나', tree: 'status' },
    // ── 행운 외길 (보조) ──
    { id: 'luckyAngler', name: '요행 낚시꾼', title: '운도 실력이다', desc: '행운 하나로 전직하는 외길 1차 직업입니다. 치명 피해 비례 요행수와 치명타 패시브로 운만 키웁니다.', ...neutral, bonus: { attack: 2, magic: 2 }, crit: .03, ...T1, requires: { luk: R1 }, role: '외길·행운', tree: 'support' },
    { id: 'fortunate', name: '행운아', title: '언제나 한 끗 차이로 이긴다', desc: '치명 피해 비례 천운의 일격과 치명타·치명 피해 패시브를 가진 행운 외길 2차 직업입니다.', ...neutral, bonus: { attack: 16, magic: 10 }, crit: .08, ...T2, parent: 'luckyAngler', requires: { luk: R2 }, requiresSkillMastery: { luckyBreak: 2 }, role: '외길·행운·치명', tree: 'support' },
    { id: 'fortuneChild', name: '운명의 총아', title: '운명이 편을 든다', desc: '치명 피해 비례 운명 역전과 치명타·치명 피해 패시브로 행운 외길의 끝에 선 3차 직업입니다.', ...neutral, bonus: { attack: 40, magic: 20 }, crit: .12, ...T3, parent: 'fortunate', requires: { luk: R3 }, requiresSkillMastery: { heavenlyStrike: 3 }, role: '외길·행운·치명', tree: 'support' },
];

export const MONOSTAT_LINEAGES = [
    { id: 'brawnFisher', name: '근력 외길', tree: 'physical' as const, summary: `근력 ${R1}·${R2}·${R3}만으로 전직하는 세 직업. 힘으로 때리고 힘으로 버팁니다.` },
    { id: 'nimbleAngler', name: '기민 외길', tree: 'physical' as const, summary: `기민 ${R1}·${R2}·${R3}만으로 전직하는 세 직업. 기민 그 자체가 피해가 되고, 여러 번 때립니다.` },
    { id: 'manaDevotee', name: '지능 외길', tree: 'magic' as const, summary: `지능 ${R1}·${R2}·${R3}만으로 전직하는 세 직업. 마법 공격 하나로 밀어붙입니다.` },
    { id: 'stillAngler', name: '정신 외길', tree: 'status' as const, summary: `정신 ${R1}·${R2}·${R3}만으로 전직하는 세 직업. 정신 그 자체가 피해가 됩니다.` },
    { id: 'bulkyFisher', name: '체질 외길', tree: 'defense' as const, summary: `체질 ${R1}·${R2}·${R3}만으로 전직하는 세 직업. 체질 그 자체가 피해가 됩니다.` },
    { id: 'luckyAngler', name: '행운 외길', tree: 'support' as const, summary: `행운 ${R1}·${R2}·${R3}만으로 전직하는 세 직업. 행운 그 자체가 피해가 됩니다.` },
];

const P = { type: 'passive' as const, chance: 0, cooldown: 0, multiplier: 0, rankEffects: { bonusScale: .3 } };
const A = { type: 'active' as const };
const physical = { damageType: 'physical' as const, manaCost: 0 };
const magic = { damageType: 'magic' as const };

export const MONOSTAT_SKILLS: Skill[] = [
    // 근력
    { ...A, ...physical, id: 'logSwing', name: '통나무 휘두르기', desc: '', level: 10, job: 'brawnFisher', chance: .5, cooldown: 3, multiplier: 1.3, cost: 2, ...attr('str', .6) },
    { ...P, id: 'roughHands', name: '우악스러운 손', desc: '물리 공격이 오릅니다.', level: 10, job: 'brawnFisher', cost: 1, bonus: { attack: 12 } },
    { ...A, ...physical, id: 'boulderToss', name: '바위 던지기', desc: '', level: 25, job: 'mightyStrongman', chance: .5, cooldown: 4, multiplier: 1.2, cost: 3, effect: 'stun', ...attr('str', 1.6) },
    { ...P, id: 'strongmanGrip', name: '장사의 악력', desc: '물리 공격과 최대 체력이 오릅니다.', level: 25, job: 'mightyStrongman', cost: 2, bonus: { attack: 24, hp: 160 } },
    { ...A, ...physical, id: 'mountainCleave', name: '산 가르기', desc: '', level: 40, job: 'colossus', chance: .5, cooldown: 4, multiplier: 2.5, cost: 4, penetrationBonus: .1, ...attr('str', 1) },
    { ...P, id: 'giantsArm', name: '거인의 팔', desc: '물리 공격과 방어 관통이 오릅니다.', level: 40, job: 'colossus', cost: 2, bonus: { attack: 44, penetration: .05, hp: 200 } },
    // 기민
    { ...A, ...physical, id: 'rapidJab', name: '연속 찌르기', desc: '', level: 10, job: 'nimbleAngler', chance: .5, cooldown: 3, multiplier: .9, cost: 2, extraAttacks: 1, extraAttackMultiplier: .55, ...attr('dex', 1.2) },
    { ...P, id: 'quickHands', name: '잰손', desc: '속도·명중·물리 공격이 오릅니다.', level: 10, job: 'nimbleAngler', cost: 1, bonus: { speed: 6, accuracy: .03, attack: 6 } },
    { ...A, ...physical, id: 'galeTriple', name: '질풍 삼연격', desc: '', level: 25, job: 'galeDancer', chance: .5, cooldown: 3, multiplier: 1, cost: 3, extraAttacks: 1, extraAttackMultiplier: .6, ...attr('dex', 1.4) },
    { ...P, id: 'windStep', name: '바람 걸음', desc: '속도·회피·물리 공격이 오릅니다.', level: 25, job: 'galeDancer', cost: 2, bonus: { speed: 10, evasion: .05, attack: 14 } },
    { ...A, ...physical, id: 'afterimageFlurry', name: '잔상 난무', desc: '', level: 40, job: 'shadowRunner', chance: .5, cooldown: 4, multiplier: 1.1, cost: 4, extraAttacks: 2, extraAttackMultiplier: .55, ...attr('dex', 1.6) },
    { ...P, id: 'shadowPace', name: '그림자 보법', desc: '속도·회피·물리 공격·치명타가 오릅니다.', level: 40, job: 'shadowRunner', cost: 2, bonus: { speed: 14, evasion: .08, attack: 24, crit: .03 } },
    // 지능
    { ...A, ...magic, id: 'pureBolt', name: '순수 마력탄', desc: '', level: 10, job: 'manaDevotee', chance: .5, cooldown: 3, multiplier: 1.4, cost: 2, manaCost: 6, ...attr('int', .6) },
    { ...P, id: 'manaFocus', name: '마력 집중', desc: '마법 공격이 오릅니다.', level: 10, job: 'manaDevotee', cost: 1, bonus: { magic: 12, hp: 30 } },
    { ...A, ...magic, id: 'manaRupture', name: '마력 파열', desc: '', level: 25, job: 'arcaneSeeker', chance: .5, cooldown: 4, multiplier: 1.9, cost: 3, manaCost: 10, effect: 'weaken', ...attr('int', 1.5) },
    { ...P, id: 'arcaneVein', name: '마력 혈맥', desc: '마법 공격과 최대 마나가 오릅니다.', level: 25, job: 'arcaneSeeker', cost: 2, bonus: { magic: 24, mana: 20, hp: 160 } },
    { ...A, ...magic, id: 'manaDetonation', name: '마력 폭발', desc: '', level: 40, job: 'pureMagus', chance: .5, cooldown: 4, multiplier: 2.6, cost: 4, manaCost: 14, penetrationBonus: .1, ...attr('int', 1.4) },
    { ...P, id: 'pureCore', name: '순수한 핵', desc: '마법 공격과 방어 관통이 오릅니다.', level: 40, job: 'pureMagus', cost: 2, bonus: { magic: 44, penetration: .05, hp: 200 } },
    // 체질
    { ...A, ...physical, id: 'bodySlam', name: '몸통 박치기', desc: '', level: 10, job: 'bulkyFisher', chance: .5, cooldown: 3, multiplier: 1.1, cost: 2, ...attr('vit', 2.4) },
    { ...P, id: 'thickBuild', name: '두꺼운 몸', desc: '최대 체력이 오릅니다.', level: 10, job: 'bulkyFisher', cost: 1, bonus: { hp: 90 } },
    { ...A, ...physical, id: 'massiveCharge', name: '육중한 돌진', desc: '', level: 25, job: 'hulkingBrute', chance: .5, cooldown: 4, multiplier: 1.2, cost: 3, effect: 'stun', ...attr('vit', 2.8) },
    { ...P, id: 'wallOfFlesh', name: '살의 벽', desc: '최대 체력과 물리 방어가 오릅니다.', level: 25, job: 'hulkingBrute', cost: 2, bonus: { hp: 180, defense: 8 } },
    { ...A, ...physical, id: 'landslide', name: '산사태', desc: '', level: 40, job: 'mountainBody', chance: .5, cooldown: 4, multiplier: 1.8, cost: 4, ...attr('vit', 3.2) },
    { ...P, id: 'mountainHeart', name: '산의 심장', desc: '최대 체력·물리 방어·턴당 회복이 오릅니다.', level: 40, job: 'mountainBody', cost: 2, bonus: { hp: 320, defense: 15, hpRegen: 2 } },
    // 정신
    { ...A, ...magic, id: 'mindWave', name: '정신 파동', desc: '', level: 10, job: 'stillAngler', chance: .5, cooldown: 3, multiplier: 1.2, cost: 2, manaCost: 6, ...attr('wis', 3.5) },
    { ...P, id: 'calmMind', name: '고요한 마음', desc: '최대 마나와 마법 방어가 오릅니다.', level: 10, job: 'stillAngler', cost: 1, bonus: { mana: 36, resist: 8, hp: 60 } },
    { ...A, ...magic, id: 'manaTide', name: '마나 해일', desc: '', level: 25, job: 'meditantAdept', chance: .5, cooldown: 4, multiplier: 1.4, cost: 3, manaCost: 10, effect: 'silence', ...attr('wis', 5) },
    { ...P, id: 'deepMeditation', name: '깊은 명상', desc: '최대 마나·마법 방어·마나 회복이 오릅니다.', level: 25, job: 'meditantAdept', cost: 2, bonus: { mana: 44, resist: 16, manaRegen: 2, hp: 220 } },
    { ...A, ...magic, id: 'voidTorrent', name: '무념 폭류', desc: '', level: 40, job: 'voidMind', chance: .5, cooldown: 4, multiplier: 1.9, cost: 4, manaCost: 14, ...attr('wis', 4.5) },
    { ...P, id: 'emptyMind', name: '무념', desc: '최대 마나·마법 방어·마나 회복이 크게 오릅니다.', level: 40, job: 'voidMind', cost: 2, bonus: { mana: 80, resist: 28, manaRegen: 3, hp: 320 } },
    // 행운
    { ...A, ...physical, id: 'luckyBreak', name: '요행수', desc: '', level: 10, job: 'luckyAngler', chance: .5, cooldown: 3, multiplier: 1.1, cost: 2, ...attr('luk', 3.8) },
    { ...P, id: 'luckyStreak', name: '연승 기운', desc: '치명타가 오릅니다.', level: 10, job: 'luckyAngler', cost: 1, bonus: { crit: .05, hp: 60 } },
    { ...A, ...physical, id: 'heavenlyStrike', name: '천운의 일격', desc: '', level: 25, job: 'fortunate', chance: .5, cooldown: 4, multiplier: 1.5, cost: 3, ...attr('luk', 4.5) },
    { ...P, id: 'blessedHand', name: '축복받은 손', desc: '치명타와 치명 피해가 오릅니다.', level: 25, job: 'fortunate', cost: 2, bonus: { crit: .05, critDamage: .15, hp: 220 } },
    { ...A, ...physical, id: 'fateReversal', name: '운명 역전', desc: '', level: 40, job: 'fortuneChild', chance: .5, cooldown: 4, multiplier: 2, cost: 4, ...attr('luk', 3) },
    { ...P, id: 'fatesFavor', name: '운명의 편애', desc: '치명타와 치명 피해가 크게 오릅니다.', level: 40, job: 'fortuneChild', cost: 2, bonus: { crit: .07, critDamage: .3, hp: 320 } },
];

/** 밸런스 표: 액티브의 발동률·배율·대기·마나(마나는 skill-balance가 ×4). 상태 규칙과 설명 생성도 이 표를 거쳐야 적용됩니다. */
export const MONOSTAT_BALANCE: Record<string, Partial<Skill>> = Object.fromEntries(
    MONOSTAT_SKILLS.filter(sk => sk.type === 'active').map(sk => [sk.id, { chance: sk.chance, multiplier: sk.multiplier, cooldown: sk.cooldown, ...(sk.manaCost ? { manaCost: sk.manaCost } : {}) }]),
);
