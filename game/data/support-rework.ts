import type { Job } from './classes';
import type { Skill } from '../types';

/**
 * v24.2 보조 계열 개편 + ??? 문 직업 풀.
 *
 * - 팬텀 (1차): 골드 대신 '주사위'. 도박 기술은 쓸 때마다 피해 배율·명중을 굴리고(gamble), 올인은 체력·마나를 겁니다(allIn).
 * - 로그(섀도어): 골드·드롭을 내려놓고 도감 기록(발견한 몬스터 + 등록한 물건)에 비례합니다(scaling 'codex', perCount codex).
 * - 해적(캡틴): 골드·던전 골드에 수집가의 드롭을 넘겨받고, 보유 골드 비례(scaling 'gold')·골드 투척(goldSpend) 기술을 씁니다.
 * - 패스파인더 (1차): 경험치는 그대로, 누적 처치(scaling 'catch')과 환생 횟수(perCount rebirth)에 비례합니다.
 * - 와일드헌터 (1차): 던전 클리어 + 보스 처치(scaling 'hunt', perCount hunt)과 지정 몬스터 처치(perCount species), 사냥감 추가 피해(preyBonus).
 * - 엔젤릭버스터 (1차): 직업마다 AP 0 노래 패시브(song). 음유시인 계보만 장착합니다.
 * - ??? 계열: 시간의 문(아침·낮·밤)과 발견의 문에 독립 1차 직업을 더합니다(doors.ts).
 *
 * 액티브 수치(SUPPORT_BALANCE)는 skill-balance.ts의 ACTIVE_SKILL_BALANCE에 합쳐져 상태이상 규칙·마나 배율·설명을 함께 거칩니다.
 * 패시브 수치(SUPPORT_PASSIVES)는 skills.ts에서 기술 목록을 다 모은 뒤 덮어씁니다.
 */
type NewJob = Omit<Job, 'masteryTarget' | 'masteryBoost'> & Partial<Pick<Job, 'masteryTarget' | 'masteryBoost'>>;
const neutral = { attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0 };
const DOOR_T1 = { ...neutral, tier: 1, level: 10, mastery: 0, tree: 'mystery' as const, branchless: true, hidden: true, masteryTarget: 2000, masteryBoost: .12 };
const A = { type: 'active' as const, chance: .26, cooldown: 3, multiplier: 1 };
const P = { type: 'passive' as const, chance: 0, cooldown: 0, multiplier: 0 };
const physical = { damageType: 'physical' as const, manaCost: 0 };
const magic = { damageType: 'magic' as const };

/** 액티브 최종 수치(ACTIVE_SKILL_BALANCE에 합쳐짐). 새 액티브도 여기에 두어 설명이 자동으로 만들어집니다. */
export const SUPPORT_BALANCE: Record<string, Partial<Skill>> = {
    // v25.4 떠돌이 계보: 복합 피해 규칙(발동 45% 이상)에 맞춘 숙달 비례 일격.
    borrowedForm: { chance: .45, cooldown: 4, multiplier: 1.2, manaCost: 8 },
    thousandLives: { chance: .45, cooldown: 5, multiplier: 1.6, statusTurns: 3, manaCost: 12 },
    // ── 팬텀 (1차): 주사위 ──
    inkTrick: { gamble: { min: 1, max: 1, accuracy: .25 } },
    smokeVeil: { gamble: { min: 1, max: 1, accuracy: .2 } },
    loadedHook: { multiplier: 1.05, gamble: { min: .3, max: 1.9, accuracy: .1 }, scaling: 'luck', scalingRatio: .4 },
    allIn: { chance: .26, cooldown: 5, multiplier: 1.6, drainRatio: .35, allIn: { hpRatio: .2, hpScale: 1.2, manaScale: 2 }, scaling: 'luck', scalingRatio: .5 },
    fateRoll: { multiplier: 2.5, gamble: { min: .2, max: 1.8, accuracy: .15 }, scaling: 'luck', scalingRatio: .6 },
    jackpotStrike: { multiplier: 3.5, gamble: { min: .1, max: 2.1, accuracy: .1 }, scaling: 'luck', scalingRatio: .8 },
    allOrNothing: { chance: .24, cooldown: 6, multiplier: 2.6, drainRatio: .35, allIn: { hpRatio: .3, hpScale: 1.6, manaScale: 3 }, gamble: { min: .6, max: 1.8 }, scaling: 'luck', scalingRatio: .8 },
    // ── 로그(섀도어): 변종 기록(√변종·황금 처치 수) 비례 ──
    relicToss: { chance: .26, cooldown: 3, multiplier: 1.3, scaling: 'variant', scalingRatio: .03 },
    anchorSwing: { scaling: 'variant', scalingRatio: .035 },
    spoilsStrike: { scaling: 'variant', scalingRatio: .04 },
    treasureStrike: { scaling: 'variant', scalingRatio: .045 },
    hoardCrush: { scaling: 'variant', scalingRatio: .05 },
    // ── 와일드헌터 (2차): 도감 기록 비례(로그(섀도어)에서 이관) ──
    sigilShock: { chance: .5, cooldown: 3, multiplier: 1.2, manaCost: 4, preyBonus: .6, scaling: 'codex', scalingRatio: .008 },
    // ── 해적(캡틴): 보유 골드·골드 투척 ──
    coinToss: { chance: .26, cooldown: 3, multiplier: 1, goldSpend: { ratio: .005, cap: 20, scale: 1 } },
    ledgerStrike: { chance: .5, cooldown: 3, multiplier: 1.3, manaCost: 4, scaling: 'gold', scalingRatio: .05 },
    coinBarrage: { scaling: 'gold', scalingRatio: .06, goldSpend: { ratio: .002, cap: 400, scale: .5 } },
    goldenTempest: { scaling: 'gold', scalingRatio: .07, goldSpend: { ratio: .002, cap: 3000, scale: .15 } },
    goldenStorm: { scaling: 'gold', scalingRatio: .08, goldSpend: { ratio: .002, cap: 12000, scale: .08 } },
    // ── 패스파인더 (1차): 누적 처치 ──
    dispatchDash: { scaling: 'catch', scalingRatio: .06 },
    constellationBolt: { scaling: 'catch', scalingRatio: .08 },
    starBolt: { scaling: 'catch', scalingRatio: .1 },
    galaxyFall: { scaling: 'catch', scalingRatio: .12 },
    // ── 와일드헌터 (1차): 사냥 기록·사냥감 ──
    trackersSpear: { scaling: 'hunt', scalingRatio: .025, preyBonus: .2 },
    weakpointThesis: { preyBonus: .3 },
    weakpointCut: { preyBonus: .4 },
    titanFell: { preyBonus: .5 },
    // ── ??? 문 직업 ──
    headwindTack: { chance: .28, cooldown: 3, multiplier: 1.2 },
    dawnFlare: { chance: .55, cooldown: 3, multiplier: 1.6, manaCost: 3 },
    bareGrab: { chance: .28, cooldown: 3, multiplier: 1.5 },
    sunDive: { chance: .26, cooldown: 4, multiplier: 1.1, scalingRatio: .04 },
    mistSlash: { chance: .28, cooldown: 3, multiplier: 1.3, accuracyBonus: .08 },
    heronStill: { chance: .3, cooldown: 3, multiplier: 1 },
    emptyPalm: { chance: .28, cooldown: 3, multiplier: 1.35, drainRatio: .15 },
    encyclopediaBolt: { chance: .55, cooldown: 3, multiplier: 1.45, manaCost: 3, scaling: 'codex', scalingRatio: .008 },
    riseAgain: { chance: .28, cooldown: 4, multiplier: 1.3, drainRatio: .25 },
};

/** 패시브 덮어쓰기. bonus는 통째로 바뀝니다(골드·드롭을 빼거나 옮기기 위해). */
export const SUPPORT_PASSIVES: Record<string, Partial<Skill>> = {
    // 팬텀 (1차): 골드 대신 치명
    focus: { desc: '치명타 확률 +7%. 흔들리는 주사위의 고점을 받쳐 줍니다.' },
    riskDividend: { desc: '치명 피해와 치명타 확률이 오르고, 치명타가 터지면 25% 확률로 가장 긴 재사용 대기를 초기화합니다.', bonus: { critDamage: .25, crit: .02 }, cooldownReset: { on: 'crit', chance: .25, pick: 'longest' } },
    jackpot: { desc: '치명 피해와 치명타 확률이 오릅니다.', bonus: { critDamage: .2, crit: .03 } },
    fortuneFavor: { desc: '치명 피해와 치명타 확률이 오릅니다.', bonus: { critDamage: .3, crit: .03 } },
    divineLuck: { desc: '치명타와 치명 피해가 크게 오릅니다.', bonus: { crit: .08, critDamage: .45 } },
    // 로그(섀도어): 변종·황금 개체를 찾아내는 계보. 변종 조우 확률과 황금 개체 확률을 올리고, 변종·황금 처치 기록마다 강해집니다.
    salvageSense: { desc: '변종 조우 확률 +20%, 명중 +3%p, 치명타 +1%p.', bonus: { variantFind: .2, accuracy: .03, crit: .01 } },
    rareSense: { desc: '변종 조우 확률 +30%, 황금 개체 확률 +0.3%p. 변종·황금 처치 기록마다 두 공격과 체력이 오릅니다.', bonus: { variantFind: .3, goldenFind: .003, crit: .01 }, perCount: [{ source: 'variant', per: 5, bonus: { attack: 2, magic: 2, hp: 6 }, cap: 20 }] },
    pressureSuit: { desc: '최대 체력과 변종 조우 확률이 오르고, 변종·황금 처치 기록마다 두 방어가 오릅니다.', bonus: { hp: 90, variantFind: .15 }, perCount: [{ source: 'variant', per: 5, bonus: { defense: 1, resist: 1 }, cap: 15 }] },
    deepSalvage: { desc: '변종 조우 확률 +40%, 황금 개체 확률 +0.5%p. 변종·황금 처치 기록마다 두 공격과 치명타가 오릅니다.', bonus: { variantFind: .4, goldenFind: .005 }, perCount: [{ source: 'variant', per: 4, bonus: { attack: 3, magic: 3, crit: .001 }, cap: 25 }] },
    kingsHoard: { desc: '변종 조우 확률 +60%, 황금 개체 확률 +1%p. 변종·황금 처치 기록마다 두 공격이 오릅니다.', bonus: { variantFind: .6, goldenFind: .01 }, perCount: [{ source: 'variant', per: 3, bonus: { attack: 4, magic: 4 }, cap: 40 }] },
    legendHoard: { desc: '변종 조우 확률 +100%, 황금 개체 확률 +2%p. 변종·황금 처치 기록마다 두 공격과 체력이 오릅니다.', bonus: { variantFind: 1, goldenFind: .02 }, perCount: [{ source: 'variant', per: 3, bonus: { attack: 5, magic: 5, hp: 10 }, cap: 50 }] },
    // 해적(캡틴): 수집가의 드롭을 넘겨받음
    salvageContract: { desc: '골드 획득 +10%, 던전 클리어 골드 +8%, 장비 드롭 확률 +30%.', bonus: { goldBonus: .1, dungeonGoldBonus: .08, dropBonus: .03 } },
    goldMemory: { desc: '골드·드롭·명중과 마법 공격이 오르고, 보유 골드 자릿수마다 두 공격이 오릅니다.', bonus: { goldBonus: .15, dropBonus: .04, accuracy: .05, magic: 20 }, perCount: [{ source: 'gold', per: 1, bonus: { attack: 2, magic: 2 }, cap: 9 }] },
    portLedger: { desc: '골드 획득·장비 드롭·명중이 오릅니다.', bonus: { goldBonus: .08, dropBonus: .03, accuracy: .03 } },
    tradeWind: { desc: '골드·던전 골드 획득과 장비 드롭이 오릅니다.', bonus: { goldBonus: .15, dungeonGoldBonus: .1, dropBonus: .06 } },
    tradeEmpire: { desc: '골드·던전 골드·장비 드롭과 마법 공격이 오릅니다.', bonus: { goldBonus: .2, dungeonGoldBonus: .15, dropBonus: .06, magic: 60 } },
    goldenEmpire: { desc: '골드·던전 골드·장비 드롭·환생 세계석과 마법 공격이 오릅니다.', bonus: { goldBonus: .3, dungeonGoldBonus: .2, dropBonus: .1, rebirthBonus: 1, magic: 110 } },
    // 패스파인더 (1차): 경험치 + 처치·환생
    voyageReview: { desc: '획득 경험치 +8%. 누적 처치가 쌓일수록 두 공격이 오릅니다.', bonus: { expBonus: .08 }, perCount: [{ source: 'catch', per: 500, bonus: { attack: 1, magic: 1 }, cap: 10 }] },
    chronicleStudy: { desc: '획득 경험치 +12%, 두 공격 +16, 최대 체력 +60. 환생할 때마다, 그리고 도감 기록 5개마다 두 공격과 체력이 더 오릅니다.', bonus: { expBonus: .12, attack: 16, magic: 16, hp: 60 }, perCount: [{ source: 'rebirth', per: 1, bonus: { attack: 3, magic: 3, hp: 10 }, cap: 10 }, { source: 'codex', per: 5, bonus: { attack: 1, magic: 1, hp: 4 }, cap: 12 }] },
    swiftQuill: { desc: '속도와 경험치 획득이 오르고, 누적 처치마다 속도가 더 오릅니다.', bonus: { speed: 6, expBonus: .03 }, perCount: [{ source: 'catch', per: 1000, bonus: { speed: 1 }, cap: 5 }] },
    starLog: { desc: '경험치 획득이 오르고, 환생과 누적 처치에 비례해 마법 공격이 오릅니다.', bonus: { expBonus: .06 }, perCount: [{ source: 'rebirth', per: 1, bonus: { magic: 5 }, cap: 12 }, { source: 'catch', per: 2000, bonus: { magic: 2 }, cap: 15 }] },
    starChart: { desc: '경험치 획득이 오르고, 환생할 때마다 마법 공격과 체력이 오릅니다.', bonus: { expBonus: .15 }, perCount: [{ source: 'rebirth', per: 1, bonus: { magic: 6, hp: 15 }, cap: 20 }] },
    cosmicChart: { desc: '경험치 획득이 크게 오르고, 환생과 누적 처치에 비례해 공격·체력·치명타가 오릅니다.', bonus: { expBonus: .25 }, perCount: [{ source: 'rebirth', per: 1, bonus: { magic: 8, attack: 4, hp: 20 }, cap: 25 }, { source: 'catch', per: 5000, bonus: { crit: .004 }, cap: 10 }] },
    // 와일드헌터 (1차): 사냥 기록·지정 몬스터
    titanFieldNotes: { perCount: [{ source: 'hunt', per: 10, bonus: { attack: 1, magic: 1 }, cap: 10 }] },
    serpentFolklore: { perCount: [{ source: 'species', per: 30, bonus: { magic: 2, resist: 1 }, cap: 15 }, { source: 'codex', per: 4, bonus: { magic: 2 }, cap: 15 }] },
    huntersPatience: { desc: '물리 공격과 명중이 오르고, 사냥 기록마다 물리 공격이 더 오릅니다.', bonus: { attack: 6, accuracy: .04 }, perCount: [{ source: 'hunt', per: 10, bonus: { attack: 2 }, cap: 15 }] },
    titanAnatomy: { desc: '치명 피해와 관통이 오르고, 사냥 기록·지정 몬스터 처치에 비례해 더 강해집니다.', bonus: { critDamage: .06, penetration: .02 }, perCount: [{ source: 'hunt', per: 8, bonus: { critDamage: .006, penetration: .001 }, cap: 25 }, { source: 'species', per: 40, bonus: { attack: 2, magic: 2 }, cap: 15 }] },
    titanLore: { desc: '치명 피해와 빈사 기준이 오르고, 사냥 기록·지정 몬스터 처치에 비례해 더 강해집니다.', bonus: { critDamage: .1, executeBonus: .04 }, perCount: [{ source: 'hunt', per: 5, bonus: { attack: 3, magic: 3 }, cap: 40 }, { source: 'species', per: 30, bonus: { critDamage: .01 }, cap: 20 }] },
    apexLore: { desc: '빈사 기준이 오르고, 사냥 기록·지정 몬스터 처치에 비례해 크게 강해집니다.', bonus: { executeBonus: .06 }, perCount: [{ source: 'hunt', per: 4, bonus: { attack: 4, magic: 4, hp: 10 }, cap: 60 }, { source: 'species', per: 25, bonus: { critDamage: .01, penetration: .002 }, cap: 25 }] },
};

/** 새 기술: 도박·수집·상인·생태 보강 액티브, 음유시인 노래, ??? 문 직업 기술. 액티브 수치는 SUPPORT_BALANCE. */
export const SUPPORT_SKILLS: Skill[] = [
    { ...A, ...physical, id: 'allOrNothing', name: '배수진', desc: '', level: 70, job: 'luckDeity', cost: 6, effect: 'drain', masteryMilestones: [4000, 18000, 60000, 150000] },
    { ...A, ...physical, id: 'relicToss', name: '유물 던지기', desc: '', level: 10, job: 'relicScavenger', cost: 2 },
    { ...A, ...physical, id: 'coinToss', name: '동전 던지기', desc: '', level: 10, job: 'salvageMerchant', cost: 2 },
    { ...A, ...magic, id: 'ledgerStrike', name: '장부 일격', desc: '', level: 25, job: 'memoryMerchant', cost: 3 },
    { ...A, ...magic, id: 'sigilShock', name: '문양 전격', desc: '', level: 25, job: 'speciesChronicler', cost: 3 },
    // 노래: AP 0, 음유시인 계보 전용. 여섯 능력치를 고르게 올립니다.
    { ...P, id: 'roadSong', name: '길손의 노래', desc: '여섯 능력치가 고르게 오르는 노래.', level: 10, job: 'bard', song: true, bonus: { hp: 30, attack: 3, magic: 3, defense: 1, resist: 1, speed: 1 } },
    { ...P, id: 'courtSerenade', name: '궁정 세레나데', desc: '여섯 능력치와 명중이 오르는 노래.', level: 25, job: 'minstrel', song: true, bonus: { hp: 60, attack: 8, magic: 8, defense: 3, resist: 3, accuracy: .02 } },
    { ...P, id: 'tideHarmony', name: '물결 화음', desc: '여섯 능력치와 마나 회복이 오르는 노래.', level: 25, job: 'tidalSinger', song: true, bonus: { hp: 70, attack: 6, magic: 10, defense: 3, resist: 4, manaRegen: .5 } },
    { ...P, id: 'heroicVerse', name: '영웅의 시', desc: '여섯 능력치와 치명·회피가 오르는 노래.', level: 40, job: 'legendBard', song: true, bonus: { hp: 140, attack: 18, magic: 18, defense: 6, resist: 6, crit: .02, evasion: .01 } },
    { ...P, id: 'oceanOde', name: '바다의 송가', desc: '여섯 능력치와 속도가 크게 오르는 노래.', level: 55, job: 'balladKing', song: true, bonus: { hp: 320, attack: 45, magic: 45, defense: 14, resist: 14, speed: 3 }, masteryMilestones: [2500, 12000, 40000, 100000] },
    { ...P, id: 'sirenAria', name: '세이렌의 아리아', desc: '여섯 능력치와 치명·회피가 크게 오르는 노래.', level: 70, job: 'siren', song: true, bonus: { hp: 520, attack: 75, magic: 75, defense: 22, resist: 22, crit: .03, evasion: .02 }, masteryMilestones: [4000, 18000, 60000, 150000] },
    // ??? 시간의 문
    { ...A, ...physical, id: 'headwindTack', name: '역풍 태킹', desc: '', level: 10, job: 'headwindSailor', cost: 2, effect: 'haste' },
    { ...P, id: 'galeLegs', name: '돌풍 걸음', desc: '속도와 회피가 오릅니다.', level: 10, job: 'headwindSailor', cost: 2, bonus: { speed: 4, evasion: .02 } },
    { ...A, ...magic, id: 'dawnFlare', name: '여명 섬광', desc: '', level: 10, job: 'sunriseAngler', cost: 2 },
    { ...P, id: 'morningCalm', name: '아침 고요', desc: '마나 회복과 최대 마나가 오릅니다.', level: 10, job: 'sunriseAngler', cost: 2, bonus: { manaRegen: 1, mana: 12 } },
    { ...A, ...physical, id: 'bareGrab', name: '맨손 낚아채기', desc: '', level: 10, job: 'barehandFisher', cost: 3 },
    { ...P, id: 'ironGrip', name: '쇠 손아귀', desc: '물리 공격과 치명타가 오릅니다.', level: 10, job: 'barehandFisher', cost: 2, bonus: { attack: 4, crit: .02 } },
    { ...A, ...physical, id: 'sunDive', name: '한낮 잠수', desc: '', level: 10, job: 'noonDiver', cost: 3, scaling: 'hp' },
    { ...P, id: 'brineLungs', name: '짠물 폐', desc: '최대 체력과 물리 방어가 오릅니다.', level: 10, job: 'noonDiver', cost: 2, bonus: { hp: 40, defense: 2 } },
    { ...A, ...physical, id: 'mistSlash', name: '안개 베기', desc: '', level: 10, job: 'mistSwordsman', cost: 2 },
    { ...P, id: 'fogVeil', name: '안개 장막', desc: '회피와 치명타가 오릅니다.', level: 10, job: 'mistSwordsman', cost: 2, bonus: { evasion: .04, crit: .02 } },
    { ...A, ...physical, id: 'heronStill', name: '왜가리의 정적', desc: '', level: 10, job: 'nightHeron', cost: 2, effect: 'slow' },
    { ...P, id: 'nightEyes', name: '밤눈', desc: '명중과 치명타가 오릅니다.', level: 10, job: 'nightHeron', cost: 2, bonus: { accuracy: .04, crit: .02 } },
    // ??? 발견의 문
    { ...A, ...physical, id: 'emptyPalm', name: '빈손 장타', desc: '', level: 10, job: 'poorMonk', cost: 2, effect: 'drain' },
    { ...P, id: 'vowOfPoverty', name: '청빈 서약', desc: '골드 획득이 줄어드는 대신 체력과 두 방어가 오릅니다.', level: 10, job: 'poorMonk', cost: 2, bonus: { hp: 30, defense: 2, resist: 2, goldBonus: -.1 } },
    { ...A, ...magic, id: 'encyclopediaBolt', name: '백과 낭독', desc: '', level: 10, job: 'codexReader', cost: 2 },
    { ...P, id: 'marginNotes', name: '여백 메모', desc: '최대 마나가 오르고, 도감 기록마다 마법 공격과 마법 방어가 오릅니다.', level: 10, job: 'codexReader', cost: 2, bonus: { mana: 8 }, perCount: [{ source: 'codex', per: 5, bonus: { magic: 1, resist: 1 }, cap: 11 }] },
    { ...A, ...physical, id: 'riseAgain', name: '다시 일어서기', desc: '', level: 10, job: 'fallenAngler', cost: 3, effect: 'drain' },
    { ...P, id: 'scarTissue', name: '아문 상처', desc: '최대 체력과 흡혈이 오릅니다.', level: 10, job: 'fallenAngler', cost: 2, bonus: { hp: 50, lifesteal: .02 } },
];

/** 상태이상 전용(피해 없음)으로 바꿀 새 기술. */
export const SUPPORT_STATUS_ONLY = ['heronStill'];
/** 떠돌이 모험가의 패시브: 숙달한 직업 수마다 자랍니다. 숙련 목표와 상한을 크게 잡아 장기 리턴으로 둡니다. */
SUPPORT_SKILLS.push(
    { ...P, id: 'thousandHands', name: '천 개의 손놀림', desc: '숙달한 직업 1개마다 두 공격 +3·최대 체력 +12·두 방어 +1(최대 60회).', level: 10, job: 'journeyman', cost: 3, perCount: [{ source: 'mastered', per: 1, bonus: { attack: 3, magic: 3, hp: 12, defense: 1, resist: 1 }, cap: 60 }], masteryMilestones: [800, 4000, 16000, 50000] },
    { ...A, id: 'borrowedForm', name: '배운 대로', desc: '', level: 25, job: 'polymath', cost: 4, damageType: 'split', scaling: 'mastered', scalingRatio: .03, manaCost: 8, masteryMilestones: [1500, 7000, 25000, 80000] },
    { ...P, id: 'hundredKnacks', name: '백 가지 요령', desc: '숙달한 직업 1개마다 두 공격 +5·최대 체력 +20·두 방어 +1.5(최대 60회).', level: 25, job: 'polymath', cost: 3, perCount: [{ source: 'mastered', per: 1, bonus: { attack: 5, magic: 5, hp: 20, defense: 1.5, resist: 1.5 }, cap: 60 }], masteryMilestones: [1500, 7000, 25000, 80000] },
    { ...A, id: 'thousandLives', name: '천 번의 삶', desc: '', level: 40, job: 'hundredLives', cost: 5, damageType: 'split', scaling: 'mastered', scalingRatio: .04, effect: 'weaken', manaCost: 12, masteryMilestones: [2500, 12000, 40000, 100000] },
    { ...P, id: 'everyLife', name: '모든 생의 기억', desc: '최대 체력 +100. 숙달한 직업 1개마다 치명타·명중 +0.4%p·속도 +0.5·최대 체력 +15(최대 60회).', level: 40, job: 'hundredLives', cost: 3, bonus: { hp: 100 }, perCount: [{ source: 'mastered', per: 1, bonus: { crit: .004, accuracy: .004, speed: .5, hp: 15 }, cap: 60 }], masteryMilestones: [2500, 12000, 40000, 100000] },
    { ...P, id: 'wayfarerKnack', name: '떠돌이의 요령', desc: '숙달한 직업 2개마다 치명타·명중 +1%p·속도 +1(최대 30회).', level: 10, job: 'journeyman', cost: 2, perCount: [{ source: 'mastered', per: 2, bonus: { crit: .01, accuracy: .01, speed: 1 }, cap: 30 }], masteryMilestones: [800, 4000, 16000, 50000] },
);

/** 직업 소개 갱신. */
export const SUPPORT_JOB_DESC: Record<string, string> = {
    squidJester: '정확한 한 방 대신 흔들리는 명중을 감수하고, 주사위처럼 결과가 갈리는 기술과 치명 조합을 노립니다.',
    gambler: '쓸 때마다 피해 배율과 명중이 흔들리는 컷 앤 위드와 치명 패시브를 가진 고위험 직업입니다.',
    inkMime: '광대 계보의 2차 직업입니다. 스모크 스크린으로 상대를 약화시키고, 패시브로 회피와 속도를 올립니다.',
    highRoller: '도박 계보의 3차 직업입니다. 올인 한 방은 체력과 마나를 걸고 때린 만큼 흡혈합니다. 패시브로 골드와 치명 피해를 올립니다. 위험이 큰 만큼 보상도 큽니다.',
    fateGambler: '팬텀 계보의 환생 후 4차 직업입니다. 얼티밋 드라이브는 치명타로 판을 뒤집습니다. 패시브로 치명 피해와 골드를 올립니다.',
    luckDeity: '팬텀 계보의 5차 직업입니다. 조커를 쓰고, 패시브로 치명타·치명 피해·골드를 올려 확률의 정점에 섭니다.',
    relicScavenger: '변종 조우 확률을 올리는 픽파킷과 변종 기록에 비례하는 메소 익스플로전을 가진 1차 직업입니다. 변종과 황금 개체를 찾는 계보의 출발점입니다.',
    rareTracker: '변종 조우 확률과 황금 개체 확률을 올리는 메소 마스터리, 그리고 Lv.30에 ×500 무리를 여는 무리 감지를 가진 2차 변종 직업입니다.',
    wreckDiver: '섀도어 계보의 2차 파밍 직업입니다. 묵직한 닻을 휘두르고, 패시브로 체력과 장비 드롭을 올립니다.',
    treasureDiver: '변종 기록에 비례하는 새비지 블로우와 변종·황금 개체 확률을 크게 올리는 메소 가드를 가진 3차 직업입니다.',
    treasureKing: '섀도어 계보의 환생 후 4차 파밍 직업입니다. 암살을 쓰고, 패시브로 장비 드롭과 골드를 올립니다.',
    seaTreasury: '섀도어 계보의 5차 직업입니다. 소닉 블로우를 쓰고, 패시브로 장비 드롭과 골드를 올려 파밍의 정점에 섭니다.',
    salvageMerchant: '동전을 던져 싸우고 처치·던전 골드와 장비 드롭을 늘리는 경제 1차 직업입니다.',
    memoryMerchant: '보유 골드에 비례하는 래피드 파이어와 골드·드롭 패시브를 가진 경제형 2차 직업입니다.',
    harborBroker: '경제 계보의 2차 직업입니다. 흥정 갈고리로 상대를 약화시키고, 패시브로 골드와 명중을 올립니다.',
    tradePrince: '경제 계보의 환생 후 3차 직업입니다. 배틀쉽 봄버 주문을 쓰고, 패시브로 골드와 던전 골드를 올립니다.',
    seaTradeKing: '캡틴 계보의 환생 후 4차 경제 직업입니다. 배틀쉽 봄버를 쓰고, 패시브로 골드와 던전 골드를 올립니다.',
    goldEmperor: '캡틴 계보의 5차 직업입니다. 불릿 파티를 쓰고, 패시브로 골드·던전 골드·환생 세계석을 올려 경제의 정점에 섭니다.',
    voyageScribe: '경험치를 더 얻고, 누적 처치가 쌓일수록 조금씩 강해지는 기록 1차 직업입니다.',
    chronicleNavigator: '경험치 획득이 높고, 환생할 때마다 기록이 쌓여 강해지는 상위 기록사입니다.',
    logbookRunner: '기록 계보의 2차 직업입니다. 길 안내 질주로 자신을 가속하고, 패시브로 속도와 경험치를 올립니다.',
    starCartographer: '기록 계보의 3차 직업입니다. 별빛 주문을 쓰고, 패시브로 경험치와 마법 공격을 올립니다.',
    starNavigator: '패스파인더 계보의 환생 후 4차 성장 직업입니다. 트리플 임팩트를 쓰고, 패시브로 경험치를 올립니다.',
    routeDeity: '패스파인더 계보의 5차 직업입니다. 레이븐 템페스트를 쓰고, 패시브로 경험치와 마법 공격을 올려 성장 보조의 정점에 섭니다.',
    bossNaturalist: '보스 처치에서 숙련도를 더 얻고, 던전 클리어와 보스 처치가 쌓일수록 강해지는 생태 1차 직업입니다.',
    speciesChronicler: '리본 돼지·파이어보어·머쉬맘을 연구합니다. 지정 몬스터 처치에서 숙련을 크게 얻고, 도감 기록(발견한 몬스터 + 등록한 물건)이 쌓일수록 강해지는 서먼 재규어를 씁니다.',
    beastTracker: '보스 사냥 계보의 2차 직업입니다. 창격으로 방어를 꿰뚫고, 패시브로 물리 공격과 명중을 올립니다.',
    titanScholar: '보스 연구 계보의 3차 직업입니다. 와일드 발칸은 방어를 꿰뚫고, 패시브로 치명 피해와 관통을 올립니다.',
    titanAnatomist: '와일드헌터 계보의 환생 후 4차 직업입니다. 소닉 붐은 빈사의 적을 크게 벱니다. 패시브로 치명 피해와 처형 기준을 올립니다.',
    beastKing: '와일드헌터 계보의 5차 직업입니다. 재규어 스톰을 쓰고, 패시브로 처형 기준과 두 공격을 올려 보스 사냥의 정점에 섭니다.',
    bard: '유틸리티 입문 직업입니다. 노래로 자신을 가속하고, 패시브로 경험치와 속도를 올립니다.',
    minstrel: '유틸리티 2차 직업입니다. 소울 시커로 상대를 침묵시키고, 패시브로 골드와 경험치를 올립니다.',
    tidalSinger: '노래 계보의 2차 직업입니다. 합창으로 체력을 회복하고, 패시브로 경험치와 마나 회복을 올립니다.',
    legendBard: '가속 서사시와 성장 패시브, AP 0 노래로 모든 능력치를 고르게 올리는 유틸리티 3차 직업입니다.',
    balladKing: '엔젤릭버스터 계보의 환생 후 4차 직업입니다. 피니투라 페투치아로 자신을 가속하고, 패시브로 경험치와 속도를 올립니다.',
    siren: '엔젤릭버스터 계보의 5차 직업입니다. 그랜드 피날레로 상대를 침묵시키고, 패시브로 경험치·드롭·마법 공격을 올려 노래의 정점에 섭니다.',
};

/** ??? 문 직업. 모두 상위·하위가 없는 독립 1차이며 문(doors.ts)이 열릴 때만 전직할 수 있습니다. */
export const SUPPORT_JOBS: NewJob[] = [
    { id: 'headwindSailor', name: '역풍 항해사', title: '거꾸로 부는 바람을 탄다', desc: '다섯 번째 바다에 닿은 자에게 열리는 항해사. 스스로 가속하는 태킹과 속도·회피 패시브를 가집니다.', ...DOOR_T1, bonus: { attack: 2, hp: 5 }, requires: { dex: 12, luk: 10 }, role: '시간·속도', penalties: { defense: -2 } },
    { id: 'sunriseAngler', name: '해돋이 낚시꾼', title: '첫 햇살에 줄을 던진다', desc: '열다섯 종을 만난 자에게 열리는 술사. 여명 섬광과 마나 회복 패시브로 주문을 자주 씁니다.', ...DOOR_T1, bonus: { magic: 5 }, requires: { int: 12, wis: 10 }, role: '시간·마나', penalties: { attack: -2 } },
    { id: 'barehandFisher', name: '맨손 어부', title: '무기도 필요 없다', desc: '무기 없이 버틴 자에게 열리는 어부. 방어를 버리고 맨손으로 큰 한 방을 노립니다.', ...DOOR_T1, bonus: { attack: 4 }, requires: { str: 14 }, role: '시간·공격', penalties: { defense: -3, mana: -4 } },
    { id: 'noonDiver', name: '한낮 잠수부', title: '뜨거운 해 아래 가장 깊이', desc: '던전을 다섯 번 정복한 자에게 열리는 잠수부. 최대 체력에 비례하는 잠수 공격과 체력·방어 패시브를 가집니다.', ...DOOR_T1, bonus: { hp: 15, defense: 1 }, requires: { vit: 14 }, role: '시간·체력', penalties: { speed: -2 } },
    { id: 'mistSwordsman', name: '안개 검객', title: '보이지 않는 칼끝', desc: '결투에서 이겨 본 자에게 열리는 검객. 명중이 높은 안개 베기와 회피·치명 패시브를 가집니다.', ...DOOR_T1, bonus: { attack: 3 }, crit: .02, requires: { dex: 12, str: 10 }, role: '시간·회피', penalties: { hp: -10 } },
    { id: 'nightHeron', name: '밤왜가리 사냥꾼', title: '움직이지 않고 기다린다', desc: '오백 마리를 낚은 자에게 열리는 사냥꾼. 피해 없이 감속을 거는 정적과 명중·치명 패시브를 가집니다.', ...DOOR_T1, bonus: { attack: 2, magic: 1 }, requires: { dex: 10, luk: 12 }, role: '시간·감속', penalties: { resist: -2 } },
    { id: 'poorMonk', name: '청빈 수도승', title: '가진 것이 없어 잃을 것도 없다', desc: '빈손으로 싸우는 수도승. 흡혈하는 빈손 장타와 골드를 내려놓는 대신 단단해지는 서약을 가집니다.', ...DOOR_T1, bonus: { hp: 10, resist: 1 }, requires: { vit: 12, wis: 12 }, role: '발견·생존', penalties: { crit: -.01 } },
    { id: 'codexReader', name: '바다 백과 독자', title: '모든 몬스터를 읽었다', desc: '도감을 깊이 읽은 자에게 열리는 술사. 도감 기록에 비례하는 주문과 패시브를 가집니다.', ...DOOR_T1, bonus: { magic: 5, resist: 1 }, requires: { int: 14 }, role: '발견·도감', penalties: { hp: -10 } },
    { id: 'journeyman', name: '떠돌이 낚시꾼', title: '배운 것은 몸에 남는다', desc: '직업 셋을 끝까지 숙달한 자에게 열리는 패시브 전용 직업. 두 패시브가 숙달한 직업 수에 비례해 자라며, 계승하면 어느 직업에서든 그대로 힘이 됩니다.', ...DOOR_T1, bonus: { attack: 2, magic: 2, hp: 10 }, requires: { str: 10, int: 10, vit: 10 }, role: '숙달·누적', fullKit: true, masteryTarget: 4000, masteryBoost: .15 },
    { id: 'polymath', name: '팔방 어부', title: '여덟 가지 삶을 한 몸에', desc: '직업 여덟을 숙달한 떠돌이 모험가에게 열리는 2차급 독립 직업. 숙달한 직업 수에 비례하는 복합 일격과 패시브를 가집니다.', ...neutral, crit: .02, bonus: { attack: 4, magic: 4, hp: 20 }, tier: 2, level: 25, mastery: 0, requires: { str: 20, int: 20, vit: 20 }, requiresJobMastery: { journeyman: 4000 }, requiresMastered: 8, role: '숙달·복합', tree: 'mystery', lineage: 'mystery-independent', branchless: true, hidden: true, fullKit: true, masteryTarget: 12000, masteryBoost: .2 },
    { id: 'hundredLives', name: '백수', title: '모든 생을 기억하는 모험가', desc: '직업 열다섯을 숙달한 자에게 열리는 3차급 독립 직업. 숙달한 직업 수만큼 강해지는 천 번의 삶과 패시브로 모든 숙련의 결산을 받습니다.', ...neutral, hp: 1.02, crit: .03, bonus: { attack: 12, magic: 12, hp: 60, defense: 3, resist: 3 }, tier: 3, level: 40, mastery: 0, requires: { str: 30, int: 30, vit: 30 }, requiresJobMastery: { polymath: 12000 }, requiresMastered: 15, role: '숙달·결산', tree: 'mystery', lineage: 'mystery-independent', branchless: true, hidden: true, fullKit: true, masteryTarget: 40000, masteryBoost: .3 },
    { id: 'fallenAngler', name: '칠전팔기 낚시꾼', title: '넘어진 만큼 일어선다', desc: '여러 번 쓰러져 본 자에게 열리는 직업. 흡혈하는 일어서기와 체력·흡혈 패시브를 가집니다.', ...DOOR_T1, bonus: { hp: 15, attack: 1 }, requires: { vit: 12, str: 10 }, role: '발견·흡혈', penalties: { speed: -2 } },
];

/** 실루엣 카드 힌트. */
export const SUPPORT_HINTS: Record<string, string> = {
    headwindSailor: '다섯 번째 사냥터까지 거슬러 올라간 모험가에게.',
    sunriseAngler: '열다섯 종의 몬스터를 처음 만난 아침에.',
    barehandFisher: '무기 없이 열다섯 레벨을 넘긴 모험가에게.',
    noonDiver: '던전 다섯 번을 끝까지 잠수한 자에게.',
    mistSwordsman: '결투에서 세 번 이긴 뒤 안개가 걷힙니다.',
    nightHeron: '오백 마리를 낚고도 물가를 떠나지 않은 자에게.',
    poorMonk: '어느 정도 성장했는데도 주머니가 거의 비어 있을 때.',
    codexReader: '도감에 기록이 서른 개 넘게 쌓였을 때.',
    fallenAngler: '서른 번쯤 쓰러져 본 모험가에게.',
    journeyman: '직업 셋을 끝까지 숙달한 모험가에게.',
    polymath: '떠돌이 모험가가 여덟 가지 삶을 모두 숙달했을 때.',
    hundredLives: '만능 모험가가 열다섯 가지 삶을 모두 숙달했을 때.',
};
