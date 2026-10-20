/**
 * 원정대(오토배틀러) 1단계 자료: docs/autobattler-plan.md의 유닛 30종 · 시너지 초안을 그대로 옮긴 판 전용 표입니다.
 * 본편 환생 배율과 분리된 수치라 균형은 scripts/expedition-sim.mjs(8라운드 PvE 승률)로 맞춥니다. 화면 · 저장은 아직 없습니다.
 */
import type { Stats } from '../types';

export type Origin = 'meadow' | 'wasteland' | 'forest' | 'underground' | 'sea' | 'temple';
export type Role = 'charge' | 'arcane' | 'guard' | 'control' | 'plague' | 'wraith';
export type Special = 'boss' | 'onyx';
export type UnitDef = {
    id: string; name: string;
    /** 본편 몬스터 id(아트 · 연출 재활용). */
    monster: string;
    cost: 1 | 2 | 3 | 4 | 5; origin: Origin; roles: Role[]; special?: Special[];
    /** 기존 몬스터 기술 id(game/data/encounters.ts). */
    skill: string;
};
export const ORIGIN_NAMES: Record<Origin, string> = { meadow: '초원', wasteland: '황야', forest: '숲', underground: '지하', sea: '바다 · 용', temple: '신전 · 아케인' };
export const ROLE_NAMES: Record<Role, string> = { charge: '돌격', arcane: '마력', guard: '수호', control: '제어', plague: '역병', wraith: '망령' };
export const SPECIAL_NAMES: Record<Special, string> = { boss: '보스', onyx: '칠흑' };

export const EXPEDITION = {
    rounds: 8, boardFront: 4, boardBack: 4, bench: 8, shopSize: 5, reroll: 2, xp: 4, baseGold: 5, interestPer: 10, interestMax: 5,
    /** 판 레벨(2~8)마다 배치 수. */
    boardSlots: [0, 0, 2, 3, 4, 5, 6, 7, 8],
    /** 판 레벨별 상점 등장 비중(비용 1~5). TFT 표준 곡선 차용. */
    shopOdds: [[], [], [1, 0, 0, 0, 0], [.75, .25, 0, 0, 0], [.55, .3, .15, 0, 0], [.45, .33, .2, .02, 0], [.25, .4, .3, .05, 0], [.19, .3, .35, .15, .01], [.16, .2, .35, .25, .04]] as number[][],
    /** 성급 배율(★1 · ★2 · ★3). */
    star: [0, 1, 1.8, 3.2],
    /** 판 레벨별 경험치 목표(레벨 2 → 3 …). */
    xpToLevel: [0, 0, 2, 6, 10, 20, 36, 56, 80],
    maxTurns: 40,
};
/** 비용별 기본 능력치(★1): 체력 · 공격. 수호는 체력 ×1.4 · 공격 ×0.7, 마력은 공격을 마법 공격으로, 제어 · 역병 · 망령은 공격 ×0.85. */
export const BASE_BY_COST: Record<number, { hp: number; attack: number }> = { 1: { hp: 100, attack: 10 }, 2: { hp: 150, attack: 16 }, 3: { hp: 220, attack: 24 }, 4: { hp: 320, attack: 36 }, 5: { hp: 500, attack: 55 } };
export const DEFENSE_BY_COST: Record<number, number> = { 1: 4, 2: 7, 3: 11, 4: 16, 5: 24 };

export const UNITS: UnitDef[] = [
    { id: 'slime', name: '슬라임', monster: 'ray', cost: 1, origin: 'meadow', roles: ['control'], skill: 'foeSlow' },
    { id: 'orangeMushroom', name: '주황버섯', monster: 'puffer', cost: 1, origin: 'meadow', roles: ['plague'], skill: 'foeVenom' },
    { id: 'pig', name: '돼지', monster: 'lionfish', cost: 1, origin: 'meadow', roles: ['charge'], skill: 'foeShellRam' },
    { id: 'wildBoar', name: '와일드보어', monster: 'ghost', cost: 1, origin: 'wasteland', roles: ['charge'], skill: 'foeShellRam' },
    { id: 'skeletonSoldier', name: '스켈레톤 솔저', monster: 'angler', cost: 1, origin: 'wasteland', roles: ['guard'], skill: 'foeWard' },
    { id: 'evilEye', name: '이블아이', monster: 'viper', cost: 1, origin: 'forest', roles: ['arcane'], skill: 'foeShock' },
    { id: 'kingClang', name: '킹 클랑', monster: 'ventCrab', cost: 1, origin: 'underground', roles: ['guard'], skill: 'foeCrush' },
    { id: 'seacle', name: '씨코', monster: 'aqSeaco', cost: 1, origin: 'sea', roles: ['plague'], skill: 'foeVenom' },
    { id: 'zombieMushroom', name: '좀비버섯', monster: 'tidejelly', cost: 2, origin: 'meadow', roles: ['wraith'], skill: 'onyxSoulDrain' },
    { id: 'stoneGolem', name: '스톤골렘', monster: 'shark', cost: 2, origin: 'wasteland', roles: ['guard'], skill: 'foeTideSlam' },
    { id: 'fireBoar', name: '파이어보어', monster: 'emberEel', cost: 2, origin: 'wasteland', roles: ['plague'], skill: 'foeBurn' },
    { id: 'juniorWraith', name: '주니어 레이스', monster: 'glassSquid', cost: 2, origin: 'underground', roles: ['wraith'], skill: 'foeInkBurst' },
    { id: 'sharkUnit', name: '샤크', monster: 'aqShark', cost: 2, origin: 'sea', roles: ['charge'], skill: 'foeShellRam' },
    { id: 'erdaSpirit', name: '에르다 스피릿', monster: 'arErdaSpirit', cost: 2, origin: 'temple', roles: ['arcane'], skill: 'foeShock' },
    { id: 'curseEye', name: '커즈아이', monster: 'squid', cost: 2, origin: 'forest', roles: ['control'], skill: 'foeSilence' },
    { id: 'mushmom', name: '머쉬맘', monster: 'grottoWarden', cost: 3, origin: 'meadow', roles: ['guard'], special: ['boss'], skill: 'foeHaste' },
    { id: 'mixedGolem', name: '믹스 골렘', monster: 'magmaPuffer', cost: 3, origin: 'wasteland', roles: ['control'], skill: 'foeCrush' },
    { id: 'wraithUnit', name: '레이스', monster: 'eclipseMoonfish', cost: 3, origin: 'forest', roles: ['wraith'], skill: 'onyxSoulDrain' },
    { id: 'ligator', name: '리게이터', monster: 'blindShark', cost: 3, origin: 'underground', roles: ['charge'], skill: 'foeFrenzy' },
    { id: 'seaGuard', name: '바다 수호병', monster: 'aqGuard', cost: 3, origin: 'sea', roles: ['guard'], skill: 'foeWard' },
    { id: 'skelegon', name: '스켈레곤', monster: 'lfSkelegon', cost: 3, origin: 'sea', roles: ['plague'], skill: 'foeBarbs' },
    { id: 'memoryMonitor', name: '메모리 모니터', monster: 'ttMonitor', cost: 3, origin: 'temple', roles: ['control'], skill: 'papTimeStop' },
    { id: 'darkDrake', name: '다크 드레이크', monster: 'ancient', cost: 4, origin: 'forest', roles: ['arcane'], skill: 'foeBurn' },
    { id: 'darkWyvern', name: '다크 와이번', monster: 'ventLeviathan', cost: 4, origin: 'underground', roles: ['arcane'], skill: 'foeShock' },
    { id: 'manticore', name: '맨티코어', monster: 'lfManticore', cost: 4, origin: 'sea', roles: ['charge'], skill: 'foeHaste' },
    { id: 'lyka', name: '릴리노우흐', monster: 'ttLyka', cost: 4, origin: 'temple', roles: ['arcane'], skill: 'pbBeam' },
    { id: 'vanishingSoul', name: '소멸의 영혼', monster: 'arVanishSoul', cost: 4, origin: 'temple', roles: ['wraith'], skill: 'onyxSoulDrain' },
    { id: 'lucid', name: '루시드', monster: 'onyxLucid', cost: 5, origin: 'forest', roles: ['control'], special: ['boss', 'onyx'], skill: 'onyxNightmare' },
    { id: 'zakum', name: '자쿰', monster: 'ventColossus', cost: 5, origin: 'underground', roles: ['charge'], special: ['boss'], skill: 'zakumArms' },
    { id: 'blackMage', name: '검은 마법사', monster: 'onyxBlackMage', cost: 5, origin: 'temple', roles: ['arcane'], special: ['boss', 'onyx'], skill: 'onyxGenesis' },
];
export const unitById = (id: string) => UNITS.find(u => u.id === id);

/**
 * 시너지 효과(단계별). 능력치로 적을 수 있는 것은 Stats 보정(bonus)과 배율(mult)로, 나머지는 flag로 두고 systems/expedition.ts의 전투 계층이 처리합니다.
 * 초안과 다른 점(프로토타입): 숲 4의 ‘마나 충전’은 치명타 +10%p로, 신전 · 아케인의 ‘시작 마나 · 즉시 발동’은 관통 · 주는 피해로 바꿨습니다(기술 발동이 아직 확률 · 대기 방식).
 */
export type TraitTier = { count: number; bonus?: Partial<Stats>; mult?: Partial<Record<'hp' | 'attack' | 'magic', number>>; damageTaken?: number; flags?: string[]; only?: Role | 'backline' | 'boss' };
export type TraitDef = { id: Origin | Role | Special; kind: 'origin' | 'role' | 'special'; name: string; tiers: TraitTier[] };
export const TRAITS: TraitDef[] = [
    { id: 'meadow', kind: 'origin', name: '초원', tiers: [{ count: 2, mult: { hp: 1.2 } }, { count: 4, mult: { hp: 1.6 }, bonus: { hpRegen: 8 }, flags: ['regen'] }] },
    { id: 'wasteland', kind: 'origin', name: '황야', tiers: [{ count: 2, damageTaken: .15 }, { count: 4, damageTaken: .35, flags: ['guardThorns'] }] },
    { id: 'forest', kind: 'origin', name: '숲', tiers: [{ count: 2, mult: { magic: 1.15 } }, { count: 4, mult: { magic: 1.35 }, bonus: { crit: .1 } }] },
    { id: 'underground', kind: 'origin', name: '지하', tiers: [{ count: 2, flags: ['killStack'] }, { count: 4, flags: ['killStack'], bonus: { followUpBonus: .2 } }] },
    { id: 'sea', kind: 'origin', name: '바다 · 용', tiers: [{ count: 2, bonus: { speed: 2 } }, { count: 4, bonus: { speed: 5 }, flags: ['haste'] }] },
    { id: 'temple', kind: 'origin', name: '신전 · 아케인', tiers: [{ count: 2, bonus: { penetration: .1 } }, { count: 4, bonus: { penetration: .2 }, flags: ['dealt10'] }] },
    { id: 'charge', kind: 'role', name: '돌격', tiers: [{ count: 2, mult: { attack: 1.2 } }, { count: 4, mult: { attack: 1.45 } }, { count: 6, mult: { attack: 1.5 }, bonus: { crit: .15 } }] },
    { id: 'arcane', kind: 'role', name: '마력', tiers: [{ count: 2, mult: { magic: 1.2 } }, { count: 4, mult: { magic: 1.45 } }, { count: 6, mult: { magic: 1.5 }, bonus: { penetration: .3 } }] },
    { id: 'guard', kind: 'role', name: '수호', tiers: [{ count: 2, damageTaken: .2, only: 'guard' }, { count: 4, damageTaken: .4, only: 'guard', flags: ['backline15'] }] },
    { id: 'control', kind: 'role', name: '제어', tiers: [{ count: 2, bonus: { stunBonus: 1, controlBonus: 1 } }, { count: 4, bonus: { stunBonus: 2, controlBonus: 2 }, flags: ['ignoreResist'] }] },
    { id: 'plague', kind: 'role', name: '역병', tiers: [{ count: 2, bonus: { poisonStackBonus: 1, dotTurnsBonus: 1 } }, { count: 4, bonus: { poisonStackBonus: 2, dotTurnsBonus: 2 }, flags: ['spread'] }] },
    { id: 'wraith', kind: 'role', name: '망령', tiers: [{ count: 2, bonus: { lifesteal: .15 } }, { count: 4, bonus: { lifesteal: .35 }, flags: ['revive'] }] },
    { id: 'boss', kind: 'special', name: '보스', tiers: [{ count: 2, mult: { hp: 1.2 }, only: 'boss' }, { count: 4, mult: { hp: 1.2 }, only: 'boss', flags: ['roar'] }] },
    { id: 'onyx', kind: 'special', name: '칠흑', tiers: [{ count: 2, bonus: { crit: .1 } }] },
];
/** 기획서의 ‘의도한 조합’ 6개(균형 측정용 목표 편성). */
export const INTENDED_COMPS: { id: string; name: string; units: string[] }[] = [
    { id: 'meadowWraith', name: '초원 4 + 망령 2', units: ['slime', 'orangeMushroom', 'pig', 'zombieMushroom', 'mushmom', 'juniorWraith', 'wraithUnit', 'skeletonSoldier'] },
    { id: 'wastelandControl', name: '황야 4 + 제어 4 + 수호 4', units: ['wildBoar', 'skeletonSoldier', 'stoneGolem', 'mixedGolem', 'kingClang', 'slime', 'curseEye', 'seaGuard'] },
    { id: 'forestArcane', name: '숲 4 + 마력 6', units: ['evilEye', 'curseEye', 'wraithUnit', 'darkDrake', 'erdaSpirit', 'darkWyvern', 'lyka', 'blackMage'] },
    { id: 'undergroundCharge', name: '지하 4 + 돌격 6 + 자쿰', units: ['kingClang', 'juniorWraith', 'ligator', 'zakum', 'pig', 'wildBoar', 'sharkUnit', 'manticore'] },
    { id: 'seaCharge', name: '바다 · 용 4 + 돌격 4', units: ['seacle', 'sharkUnit', 'seaGuard', 'skelegon', 'manticore', 'pig', 'wildBoar', 'ligator'] },
    { id: 'templeBoss', name: '신전 · 아케인 4 + 보스 2', units: ['erdaSpirit', 'memoryMonitor', 'lyka', 'vanishingSoul', 'blackMage', 'zakum', 'stoneGolem', 'seaGuard'] },
];
