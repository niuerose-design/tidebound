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
    /** 10단계: 12라운드 · 3막(1~4 · 5~8 · 9~12). 각 막의 마지막 라운드는 보스 웨이브(고스트 없음)이고 이기면 막 보상 세계석 +actPearls. */
    rounds: 12, actLength: 4, actPearls: 2, boardFront: 4, boardBack: 4, bench: 8, shopSize: 5, reroll: 2, xp: 4, baseGold: 5, interestPer: 10, interestMax: 5,
    /** 10단계 상점 시너지 슬롯: 2라운드부터 상점 마지막 칸은 보드의 시너지(다음 단계에 가장 가까운 것)를 늘리는 유닛이 나옵니다. */
    synergySlotRound: 2,
    /** 판 레벨(2~8)마다 배치 수. */
    boardSlots: [0, 0, 2, 3, 4, 5, 6, 7, 8],
    /** 판 레벨별 상점 등장 비중(비용 1~5). TFT 표준 곡선 차용. */
    shopOdds: [[], [], [1, 0, 0, 0, 0], [.75, .25, 0, 0, 0], [.55, .3, .15, 0, 0], [.45, .33, .2, .02, 0], [.25, .4, .3, .05, 0], [.19, .3, .35, .15, .01], [.16, .2, .35, .25, .04]] as number[][],
    /** 성급 배율(★1 · ★2 · ★3). */
    star: [0, 1, 1.8, 3.2],
    /** 판 레벨별 경험치 목표(레벨 2 → 3 …). */
    xpToLevel: [0, 0, 2, 6, 10, 20, 36, 56, 80],
    maxTurns: 40,
    /** 마나: 기본 공격 +10 · 피격 +5, 100에 기술 발동. */
    manaPerAttack: 10, manaPerHit: 5, manaCast: 100,
    /** 판 체력 100. 패배마다 12 + 라운드 × 2 + 남은 적 유닛 × 2(12라운드 기준 4~5패에 탈락). */
    hp: 100, lossBase: 12, lossPerRound: 2, lossPerUnit: 2,
    /** 3단계: 2라운드부터 고스트(다른 플레이어 보드)가 있으면 이 확률로 고스트와 싸웁니다. */
    ghostChance: .6,
    /** 4단계 시즌 점수: 최고 판 승수 × 100 + 완주 50 + 라운드 + 이긴 고스트의 승수 × ghostPointPerWin(이번 달 누적). */
    ghostPointPerWin: 10,
    /** 5단계(운영 결정): 하루 횟수 제한 없음. 보상은 세계석 — 승리마다 pearlsPerWin, 12라운드를 모두 마치면 +clearPearls, 막 보스마다 +actPearls(한 판 최대 12 + 6 + 4 = 22). */
    pearlsPerWin: 1, clearPearls: 4,
};
/** 10단계: 라운드의 막(1~3)과 막 보스 라운드 여부. */
export const actOf = (round: number) => Math.min(3, Math.ceil(round / EXPEDITION.actLength));
export const isBossRound = (round: number) => round % EXPEDITION.actLength === 0;
/** 15단계 심연: 12라운드를 완주한 뒤 ‘계속 가기’를 고르면 13라운드부터. 라운드마다 웨이브 예산 ×1.1, 4라운드마다 보스(★2, 24라운드부터 ★3), 고스트 없음, 최대 abyssMax라운드. 심연 5라운드마다 세계석 +abyssBonus. */
export const ABYSS = { max: 20, budgetGrowth: 1.1, bonusEvery: 5, bonus: 5, scorePerRound: 20 };
export const isAbyssRound = (round: number) => round > EXPEDITION.rounds;
/** 15단계 도전 기록(완주 조건 칭호): 판이 끝날 때 판정해 expeditionFeats에 횟수를 쌓습니다. */
export const FEATS: { id: string; name: string; desc: string; title: string }[] = [
    { id: 'flawless', name: '무패 완주', desc: '한 번도 지지 않고 12라운드 완주', title: '🛡 무패의 원정대장' },
    { id: 'noItem', name: '맨손 완주', desc: '12라운드 보드에 아이템 없이 완주', title: '✋ 맨손의 원정대장' },
    { id: 'oneOrigin', name: '한 지역 완주', desc: '12라운드 보드가 모두 한 지역(문장 제외)', title: '🏳 한 깃발의 원정대' },
    { id: 'cheap', name: '서민 완주', desc: '12라운드 보드가 모두 비용 1~2 유닛', title: '🪙 동전의 원정대' },
    { id: 'abyss10', name: '심연 10', desc: '심연 10라운드 이상 생존', title: '🌑 심연을 걷는 자' },
    { id: 'abyss20', name: '심연 끝', desc: '심연 20라운드(끝)까지 생존', title: '🕳 심연의 주인' },
];
export const featById = (id: string) => FEATS.find(f => f.id === id);
/** 유닛 판매가: ★1 비용, ★2 비용 × 3, ★3 비용 × 9(산 값 그대로 돌려줌). */
export const sellPrice = (cost: number, star: number) => cost * (star === 3 ? 9 : star === 2 ? 3 : 1);
/** 비용별 기본 능력치(★1): 체력 · 공격. 수호는 체력 ×1.4 · 공격 ×0.7, 마력은 공격을 마법 공격으로, 제어 · 역병 · 망령은 공격 ×0.85. */
export const BASE_BY_COST: Record<number, { hp: number; attack: number }> = { 1: { hp: 100, attack: 10 }, 2: { hp: 150, attack: 16 }, 3: { hp: 220, attack: 24 }, 4: { hp: 320, attack: 36 }, 5: { hp: 500, attack: 55 } };
export const DEFENSE_BY_COST: Record<number, number> = { 1: 4, 2: 7, 3: 11, 4: 16, 5: 24 };

export const UNITS: UnitDef[] = [
    { id: 'slime', name: '슬라임', monster: 'ray', cost: 1, origin: 'meadow', roles: ['control'], skill: 'foeSlow' },
    { id: 'orangeMushroom', name: '주황버섯', monster: 'puffer', cost: 1, origin: 'meadow', roles: ['plague'], skill: 'foeBurn' },
    { id: 'pig', name: '돼지', monster: 'lionfish', cost: 1, origin: 'meadow', roles: ['charge'], skill: 'foeShellRam' },
    { id: 'wildBoar', name: '와일드보어', monster: 'ghost', cost: 1, origin: 'wasteland', roles: ['charge'], skill: 'foeShellRam' },
    { id: 'skeletonSoldier', name: '스켈레톤 솔저', monster: 'angler', cost: 1, origin: 'wasteland', roles: ['guard'], skill: 'foeWard' },
    { id: 'evilEye', name: '이블아이', monster: 'viper', cost: 1, origin: 'forest', roles: ['arcane'], skill: 'foeShock' },
    { id: 'kingClang', name: '킹 클랑', monster: 'ventCrab', cost: 1, origin: 'underground', roles: ['guard'], skill: 'foeCrush' },
    { id: 'seacle', name: '씨코', monster: 'aqSeaco', cost: 1, origin: 'sea', roles: ['plague'], skill: 'foeBarbs' },
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
/** 20단계 세트 전용 유닛(기본 30종 밖). 세트가 바뀌어도 옛 보드 · 도감 · 고스트가 풀리도록 unitById는 전체를 봅니다. */
export const EXTRA_UNITS: UnitDef[] = [
    // 세트 2 ‘심해의 조류’(2027-Q1): 던전 보스 4종(본편 처치로 해금 · 코어 조각 연결)과 버섯 2종.
    { id: 'blueMushroom', name: '파란 버섯', monster: 'seahorse', cost: 1, origin: 'meadow', roles: ['plague'], skill: 'foeBurn' },
    { id: 'hornMushroom', name: '뿔버섯', monster: 'needlefish', cost: 1, origin: 'wasteland', roles: ['charge'], skill: 'foeCrush' },
    { id: 'kingSlime', name: '킹 슬라임', monster: 'kelpHydra', cost: 2, origin: 'underground', roles: ['guard'], special: ['boss'], skill: 'foeTideSlam' },
    { id: 'zombieMushmom', name: '좀비 머쉬맘', monster: 'anchorWraith', cost: 3, origin: 'wasteland', roles: ['wraith'], special: ['boss'], skill: 'onyxSoulDrain' },
    { id: 'juniorBalrog', name: '주니어 발록', monster: 'magmaKraken', cost: 4, origin: 'underground', roles: ['charge'], special: ['boss'], skill: 'foeFrenzy' },
    { id: 'papulatus', name: '파풀라투스', monster: 'starfallSeraph', cost: 4, origin: 'temple', roles: ['arcane'], special: ['boss'], skill: 'papTimeStop' },
];
export const ALL_UNITS: UnitDef[] = [...UNITS, ...EXTRA_UNITS];
export const unitById = (id: string) => ALL_UNITS.find(u => u.id === id);

/**
 * 시너지 효과(단계별). 능력치로 적을 수 있는 것은 Stats 보정(bonus)과 배율(mult)로, 나머지는 flag로 두고 systems/expedition.ts의 전투 계층이 처리합니다.
 * 2단계: 기술은 마나 100에 발동(기본 공격 +10 · 피격 +5)하므로 숲 4 ‘마나 충전 +25%’(manaBoost), 신전 · 아케인 ‘시작 마나 50 · 100’(startMana50 · 100)을 초안대로 둡니다.
 * 초원 4 재생(regen: 턴마다 최대 체력 4%), 황야 4 반격(reflect: 받은 피해의 25%를 공격자에게), 역병 4 전파(spread), 보스 4 포효(roar: 적 전체 약화 2턴), 바다 · 용 4 시작 가속(haste 3턴)은 전투 계층이 처리합니다.
 */
export type TraitTier = { count: number; bonus?: Partial<Stats>; mult?: Partial<Record<'hp' | 'attack' | 'magic', number>>; damageTaken?: number; flags?: string[]; only?: Role | 'backline' | 'boss' };
export type TraitDef = { id: Origin | Role | Special; kind: 'origin' | 'role' | 'special'; name: string; tiers: TraitTier[] };
export const TRAITS: TraitDef[] = [
    { id: 'meadow', kind: 'origin', name: '초원', tiers: [{ count: 2, mult: { hp: 1.25 } }, { count: 4, mult: { hp: 1.6 }, flags: ['regen'] }] },
    { id: 'wasteland', kind: 'origin', name: '황야', tiers: [{ count: 2, damageTaken: .2 }, { count: 4, damageTaken: .45, mult: { attack: 1.2, magic: 1.2 }, flags: ['reflect'] }] },
    { id: 'forest', kind: 'origin', name: '숲', tiers: [{ count: 2, mult: { magic: 1.2 } }, { count: 4, mult: { magic: 1.4 }, flags: ['manaBoost'] }] },
    { id: 'underground', kind: 'origin', name: '지하', tiers: [{ count: 2, flags: ['killStack'] }, { count: 4, flags: ['killStack'], bonus: { followUpBonus: .2 } }] },
    { id: 'sea', kind: 'origin', name: '바다 · 용', tiers: [{ count: 2, bonus: { speed: 2 } }, { count: 4, bonus: { speed: 5 }, flags: ['haste'] }] },
    { id: 'temple', kind: 'origin', name: '신전 · 아케인', tiers: [{ count: 2, mult: { magic: 1.1 }, flags: ['startMana50'] }, { count: 4, mult: { magic: 1.15 }, bonus: { penetration: .4 }, flags: ['startMana100'] }] },
    { id: 'charge', kind: 'role', name: '돌격', tiers: [{ count: 2, mult: { attack: 1.2 } }, { count: 4, mult: { attack: 1.45 } }, { count: 6, mult: { attack: 1.25 }, bonus: { crit: .15 } }] },
    { id: 'arcane', kind: 'role', name: '마력', tiers: [{ count: 2, mult: { magic: 1.2 } }, { count: 4, mult: { magic: 1.45 } }, { count: 6, mult: { magic: 1.25 }, bonus: { penetration: .3 } }] },
    { id: 'guard', kind: 'role', name: '수호', tiers: [{ count: 2, damageTaken: .2, only: 'guard' }, { count: 4, damageTaken: .4, only: 'guard', flags: ['backline15'] }] },
    { id: 'control', kind: 'role', name: '제어', tiers: [{ count: 2, bonus: { stunBonus: 1, controlBonus: 1 } }, { count: 4, bonus: { stunBonus: 2, controlBonus: 2 }, flags: ['ignoreResist'] }] },
    { id: 'plague', kind: 'role', name: '역병', tiers: [{ count: 2, bonus: { poisonStackBonus: 1, dotTurnsBonus: 1 } }, { count: 4, bonus: { poisonStackBonus: 2, dotTurnsBonus: 2 }, flags: ['spread'] }] },
    { id: 'wraith', kind: 'role', name: '망령', tiers: [{ count: 2, bonus: { lifesteal: .15 } }, { count: 4, bonus: { lifesteal: .35 }, flags: ['revive'] }] },
    { id: 'boss', kind: 'special', name: '보스', tiers: [{ count: 2, mult: { hp: 1.3 }, only: 'boss' }, { count: 4, mult: { hp: 1.3 }, only: 'boss', flags: ['roar'] }] },
    { id: 'onyx', kind: 'special', name: '칠흑', tiers: [{ count: 2, bonus: { crit: .1 } }] },
];
/** 기획서의 ‘의도한 조합’ 6개(균형 측정용 목표 편성). */
/** 8단계 화면용: 시너지 단계 효과를 글로 풉니다(데이터에서 자동 생성 → 수치가 바뀌어도 설명이 어긋나지 않음). */
const FLAG_DESC: Record<string, string> = { regen: '매 턴 체력 4% 회복', reflect: '받은 피해 25% 반격', manaBoost: '마나 획득 +25%', killStack: '처치마다 공격 +10%', haste: '시작 때 가속', startMana50: '시작 마나 50', startMana100: '시작 마나 100', backline15: '뒷줄 받는 피해 −15%', ignoreResist: '상태이상 저항 무시', spread: '독 · 화상 전염', revive: '망령 1회 부활(30%)', roar: '시작 때 포효 · 적 약화 2턴' };
const STAT_DESC: Record<string, (v: number) => string> = { speed: v => `속도 +${v}`, crit: v => `치명타 +${Math.round(v * 100)}%p`, penetration: v => `관통 +${Math.round(v * 100)}%p`, followUpBonus: v => `추가타 위력 +${Math.round(v * 100)}%p`, lifesteal: v => `흡혈 +${Math.round(v * 100)}%p`, stunBonus: v => `기절 +${v}턴`, controlBonus: v => `제어 +${v}턴`, poisonStackBonus: v => `독 중첩 +${v}`, dotTurnsBonus: v => `지속 피해 +${v}턴` };
export function describeTier(t: TraitTier): string {
    const out: string[] = [];
    for (const k of ['hp', 'attack', 'magic'] as const) if (t.mult?.[k]) out.push(`${k === 'hp' ? '체력' : k === 'attack' ? '물리 공격' : '마법 공격'} +${Math.round((t.mult[k]! - 1) * 100)}%`);
    if (t.damageTaken) out.push(`받는 피해 −${Math.round(t.damageTaken * 100)}%`);
    for (const k in t.bonus || {}) out.push(STAT_DESC[k] ? STAT_DESC[k]((t.bonus as Record<string, number>)[k]) : `${k} +${(t.bonus as Record<string, number>)[k]}`);
    for (const f of t.flags || []) if (FLAG_DESC[f]) out.push(FLAG_DESC[f]);
    const who = t.only === 'guard' ? '수호 유닛만' : t.only === 'boss' ? '보스만' : t.only === 'backline' ? '뒷줄만' : '';
    return (who ? `${who}: ` : '') + out.join(' · ');
}
export const INTENDED_COMPS: { id: string; name: string; units: string[] }[] = [
    { id: 'meadowWraith', name: '초원 4 + 망령 2', units: ['slime', 'orangeMushroom', 'pig', 'zombieMushroom', 'mushmom', 'juniorWraith', 'wraithUnit', 'skeletonSoldier'] },
    { id: 'wastelandControl', name: '황야 4 + 제어 4 + 수호 4', units: ['wildBoar', 'skeletonSoldier', 'stoneGolem', 'mixedGolem', 'kingClang', 'slime', 'curseEye', 'seaGuard'] },
    { id: 'forestArcane', name: '숲 4 + 마력 6', units: ['evilEye', 'curseEye', 'wraithUnit', 'darkDrake', 'erdaSpirit', 'darkWyvern', 'lyka', 'blackMage'] },
    { id: 'undergroundCharge', name: '지하 4 + 돌격 6 + 자쿰', units: ['kingClang', 'juniorWraith', 'ligator', 'zakum', 'pig', 'wildBoar', 'sharkUnit', 'manticore'] },
    { id: 'seaCharge', name: '바다 · 용 4 + 돌격 4', units: ['seacle', 'sharkUnit', 'seaGuard', 'skelegon', 'manticore', 'pig', 'wildBoar', 'ligator'] },
    { id: 'templeBoss', name: '신전 · 아케인 4 + 보스 2', units: ['erdaSpirit', 'memoryMonitor', 'lyka', 'vanishingSoul', 'blackMage', 'zakum', 'stoneGolem', 'seaGuard'] },
];

/**
 * 6단계 유닛 아이템(판 전용 8종): 라운드를 이기면 하나를 얻고(상자), 유닛마다 한 칸에 장착합니다. 본편 장비 옵션과 같은 능력치 이름을 써서 전투 계층이 Stats 보정으로 바로 적용합니다.
 * 판이 끝나면 사라집니다. 같은 아이템을 여럿 가질 수 있고, 유닛을 팔거나 승급하면 아이템은 가진 칸으로 돌아옵니다.
 */
export type ItemDef = { id: string; name: string; desc: string; bonus?: Partial<Stats>; mult?: Partial<Record<'hp' | 'attack' | 'magic', number>>; damageTaken?: number; startMana?: number; reflect?: number; /** 7단계: 조합으로만 나오는 상위 아이템(상자에 안 나옴). 8단계: 'emblem'은 문장(3라운드부터 상자 셋째 칸). */ tier?: 2 | 'emblem'; /** 20단계: 세트 전용 아이템. */ set?: string; /** 8단계 문장: 낀 유닛을 이 지역 · 역할로도 셉니다(시너지 머릿수 +1). */ emblem?: { origin?: Origin; role?: Role } };
export const ITEMS: ItemDef[] = [
    { id: 'blade', name: '맹공의 검', desc: '물리 공격 +35%', mult: { attack: 1.35 } },
    { id: 'wand', name: '마력의 지팡이', desc: '마법 공격 +35%', mult: { magic: 1.35 } },
    { id: 'shield', name: '수호의 방패', desc: '받는 피해 −25%', damageTaken: .25 },
    { id: 'boots', name: '질풍의 신발', desc: '속도 +4(먼저 행동)', bonus: { speed: 4 } },
    { id: 'fang', name: '흡혈의 송곳니', desc: '흡혈 +25%p', bonus: { lifesteal: .25 } },
    { id: 'horn', name: '메아리 뿔', desc: '추가타 위력 +30%p · 치명타 +10%p', bonus: { followUpBonus: .3, crit: .1 } },
    { id: 'manaStone', name: '마나석', desc: '시작 마나 +60 · 최대 체력 +15%', startMana: 60, mult: { hp: 1.15 } },
    { id: 'thornMail', name: '가시 갑옷', desc: '받은 피해의 30% 반격 · 최대 체력 +20%', reflect: .3, mult: { hp: 1.2 } },
    // 20단계 세트 전용(심해의 조류): 상자 기본 풀에 더해짐.
    { id: 'tidePearl', name: '조류의 진주', desc: '속도 +3 · 흡혈 +15%p', bonus: { speed: 3, lifesteal: .15 }, set: 'deepTide' },
    // 7단계 조합 아이템(상자에 안 나옴).
    { id: 'greatBlade', name: '대검', desc: '물리 공격 +80%', mult: { attack: 1.8 }, tier: 2 },
    { id: 'archStaff', name: '대마법봉', desc: '마법 공격 +80%', mult: { magic: 1.8 }, tier: 2 },
    { id: 'towerShield', name: '대방패', desc: '받는 피해 −45% · 최대 체력 +15%', damageTaken: .45, mult: { hp: 1.15 }, tier: 2 },
    { id: 'windBoots', name: '폭풍의 신발', desc: '속도 +10(거의 항상 선공)', bonus: { speed: 10 }, tier: 2 },
    { id: 'doomSpear', name: '파멸의 창', desc: '물리 · 마법 공격 +45%', mult: { attack: 1.45, magic: 1.45 }, tier: 2 },
    { id: 'citadel', name: '성채', desc: '받는 피해 −35% · 반격 45% · 최대 체력 +30%', damageTaken: .35, reflect: .45, mult: { hp: 1.3 }, tier: 2 },
    { id: 'galeHorn', name: '질풍의 뿔', desc: '속도 +6 · 추가타 위력 +45%p · 치명타 +15%p', bonus: { speed: 6, followUpBonus: .45, crit: .15 }, tier: 2 },
    { id: 'bloodOrb', name: '흡혈의 보주', desc: '흡혈 +40%p · 시작 마나 +100 · 최대 체력 +20%', bonus: { lifesteal: .4 }, startMana: 100, mult: { hp: 1.2 }, tier: 2 },
];
// 8단계 문장 12종: 지역 6 · 역할 6. 조합 불가, 상자 셋째 칸에만(3라운드부터).
for (const o of Object.keys(ORIGIN_NAMES) as Origin[]) ITEMS.push({ id: `emblem_${o}`, name: `${ORIGIN_NAMES[o].split(' ')[0]}의 문장`, desc: `낀 유닛을 ${ORIGIN_NAMES[o]}(으)로도 셉니다 · 시너지 머릿수 +1`, tier: 'emblem', emblem: { origin: o } });
for (const r of Object.keys(ROLE_NAMES) as Role[]) ITEMS.push({ id: `emblem_${r}`, name: `${ROLE_NAMES[r]}의 문장`, desc: `낀 유닛을 ${ROLE_NAMES[r]}(으)로도 셉니다 · 시너지 머릿수 +1`, tier: 'emblem', emblem: { role: r } });
export const EMBLEMS = () => ITEMS.filter(x => x.tier === 'emblem');
/** 8단계: 문장이 상자에 섞이기 시작하는 라운드. */
export const EMBLEM_ROUND = 3;
/** 9단계: 이 라운드부터 상자 첫째 칸에 조합 아이템(상위)이 바로 나옵니다. */
export const TIER2_ROUND = 6;
/** 9단계 시즌 말 보상(세계석): 지난달 순위표 순위로. 표 밖(또는 순위 없음)은 마지막 줄. 다음 달 첫 ‘원정 출발’ 때 지급됩니다. */
export const SEASON_REWARDS: { upto: number; pearls: number; label: string }[] = [
    { upto: 1, pearls: 50, label: '1위' }, { upto: 3, pearls: 30, label: '2~3위' }, { upto: 10, pearls: 15, label: '4~10위' }, { upto: 30, pearls: 8, label: '11~30위' }, { upto: Infinity, pearls: 3, label: '그 외 참가' },
];
export const seasonPearls = (rank: number) => SEASON_REWARDS.find(x => rank >= 1 && rank <= x.upto)?.pearls ?? SEASON_REWARDS[SEASON_REWARDS.length - 1].pearls;
export type SeasonSettlement = { season: string; rank: number; total: number; wins: number; pearls: number };
/** 7단계 조합표(순서 무관). 표에 없는 짝은 합칠 수 없습니다. */
const COMBOS: Record<string, string> = { 'blade+blade': 'greatBlade', 'wand+wand': 'archStaff', 'shield+shield': 'towerShield', 'boots+boots': 'windBoots', 'blade+wand': 'doomSpear', 'shield+thornMail': 'citadel', 'boots+horn': 'galeHorn', 'fang+manaStone': 'bloodOrb' };
export const comboOf = (a: string, b: string) => COMBOS[[a, b].sort().join('+')] ? itemById(COMBOS[[a, b].sort().join('+')]) : undefined;
/** 상자에 나오는 아이템(기본 8종). */
export const BOX_ITEMS = (setId?: string) => ITEMS.filter(x => !x.tier && (!x.set || x.set === setId));
/** 상자 선택지 수. */
export const BOX_CHOICES = 3;
export const itemById = (id: string) => ITEMS.find(x => x.id === id);
/** 한 번에 가질 수 있는 미장착 아이템 수. */
export const ITEM_HOLD = 4;

// ───────────── 11단계: 증강 · 주간 규칙 · 원정 숙련 ─────────────
/** 판 전체에 걸리는 보정(증강 · 주간 규칙 · 숙련 특전을 합친 결과). 전투 계층은 이것만 봅니다. */
export type RunMods = {
    /** 특성 머릿수 가산(보드에 그 특성이 하나라도 있을 때만). */
    traitPlus?: Record<string, number>;
    /** 앞줄 체력 배율 · 뒷줄 공격/마법 배율 · 전체 속도 가산 · 마나 획득 배율 · 전체 반격 · 보스 라운드 받는 피해 감소 · ★2+ 능력치 배율. */
    frontHp?: number; backPower?: number; speed?: number; manaGain?: number; reflect?: number; bossGuard?: number; starPower?: number;
    /** 경제: 라운드 골드 가산 · 이자 상한 가산 · 경험치 구매 가산 · 새로 고침 비용 · 벤치 가산 · 상자 선택지 가산 · 문장 매 라운드 · 증강 선택지 가산 · 막 보상 배율 · 고스트 확률 · 최대 턴. */
    goldPlus?: number; interestPlus?: number; xpPlus?: number; rerollCost?: number; benchPlus?: number; boxPlus?: number; emblemEvery?: boolean; augmentPlus?: number; actMult?: number; ghostChance?: number; maxTurns?: number;
};
export type AugmentDef = { id: string; name: string; desc: string; tier: 1 | 2 | 3; kind: 'economy' | 'synergy' | 'combat'; /** 20단계: 세트 전용이면 그 세트에서만 나옵니다. */ set?: string; mods?: RunMods; /** 고를 때 바로: 판 체력 회복. */ heal?: number; /** 'trait'면 보드에 맞춰 traitPlus:<id>로 만들어집니다(표에는 틀만). */ dynamic?: 'trait' };
/** 증강은 2 · 5 · 8라운드 시작 때 3개 중 하나(숙련 특전으로 4개). 라운드별 등급: 2 → 1등급, 5 → 2등급, 8 → 3등급. */
export const AUGMENT_ROUNDS = [2, 5, 8];
export const AUGMENTS: AugmentDef[] = [
    // 1등급(2라운드)
    { id: 'coinPurse', name: '동전 주머니', desc: '라운드마다 골드 +2', tier: 1, kind: 'economy', mods: { goldPlus: 2 } },
    { id: 'cheapReroll', name: '단골 상점', desc: '새로 고침 1골드', tier: 1, kind: 'economy', mods: { rerollCost: 1 } },
    { id: 'widerBench', name: '넓은 벤치', desc: '벤치 +2칸', tier: 1, kind: 'economy', mods: { benchPlus: 2 } },
    { id: 'quickFeet', name: '날랜 발', desc: '모든 유닛 속도 +2', tier: 1, kind: 'combat', mods: { speed: 2 } },
    { id: 'frontWall', name: '방벽', desc: '앞줄 체력 +15%', tier: 1, kind: 'combat', mods: { frontHp: 1.15 } },
    { id: 'traitPlus1', name: '문양', desc: '시너지 머릿수 +1', tier: 1, kind: 'synergy', dynamic: 'trait' },
    // 2등급(5라운드)
    { id: 'interest', name: '복리', desc: '이자 상한 +3(최대 8)', tier: 2, kind: 'economy', mods: { interestPlus: 3 } },
    { id: 'tutor', name: '가정교사', desc: '경험치 구매마다 +2', tier: 2, kind: 'economy', mods: { xpPlus: 2 } },
    { id: 'bigBox', name: '큰 상자', desc: '상자 선택지 +1', tier: 2, kind: 'economy', mods: { boxPlus: 1 } },
    { id: 'manaFlow', name: '마나 흐름', desc: '마나 획득 +30%', tier: 2, kind: 'combat', mods: { manaGain: 1.3 } },
    { id: 'backline', name: '후방 지원', desc: '뒷줄 공격 · 마법 +20%', tier: 2, kind: 'combat', mods: { backPower: 1.2 } },
    { id: 'secondWind', name: '재정비', desc: '판 체력 +25 즉시 회복', tier: 2, kind: 'combat', heal: 25 },
    { id: 'traitPlus2', name: '깊은 문양', desc: '시너지 머릿수 +1', tier: 2, kind: 'synergy', dynamic: 'trait' },
    { id: 'emblemRain', name: '문장의 비', desc: '매 라운드 상자에 문장', tier: 2, kind: 'synergy', mods: { emblemEvery: true } },
    // 3등급(8라운드)
    { id: 'thorns', name: '가시 덤불', desc: '모든 유닛 받은 피해 15% 반격', tier: 3, kind: 'combat', mods: { reflect: .15 } },
    { id: 'bossHunter', name: '보스 사냥꾼', desc: '보스 라운드 받는 피해 −25% · 막 보상 2배', tier: 3, kind: 'combat', mods: { bossGuard: .25, actMult: 2 } },
    { id: 'bigStars', name: '별의 축복', desc: '★2 이상 유닛 능력치 +12%', tier: 3, kind: 'combat', mods: { starPower: 1.12 } },
    { id: 'traitPlus3', name: '고대 문양', desc: '시너지 머릿수 +2', tier: 3, kind: 'synergy', dynamic: 'trait' },
    { id: 'treasury', name: '금고', desc: '라운드마다 골드 +4', tier: 3, kind: 'economy', mods: { goldPlus: 4 } },
    // 20단계 세트 전용(심해의 조류).
    { id: 'tideSurge', name: '조류 타기', desc: '뒷줄 공격 · 마법 +15% · 모든 유닛 속도 +1', tier: 2, kind: 'combat', set: 'deepTide', mods: { backPower: 1.15, speed: 1 } },
];
export const augmentById = (id: string) => { const base = id.split(':')[0]; return AUGMENTS.find(a => a.id === base); };
/** 'traitPlus2:meadow' 같은 동적 증강의 보정. */
export function augmentMods(id: string): RunMods | undefined {
    const def = augmentById(id); if (!def) return undefined;
    if (def.dynamic === 'trait') { const trait = id.split(':')[1]; return trait ? { traitPlus: { [trait]: def.tier === 3 ? 2 : 1 } } : undefined; }
    return def.mods;
}
export function augmentName(id: string) { const def = augmentById(id), trait = id.split(':')[1]; if (!def) return id; const tn = trait ? ((ORIGIN_NAMES as Record<string, string>)[trait] || (ROLE_NAMES as Record<string, string>)[trait] || trait) : ''; return tn ? `${tn} ${def.name}` : def.name; }
export function augmentDesc(id: string) { const def = augmentById(id), trait = id.split(':')[1]; if (!def) return ''; const tn = trait ? ((ORIGIN_NAMES as Record<string, string>)[trait] || (ROLE_NAMES as Record<string, string>)[trait] || trait) : ''; return tn ? `${tn} 머릿수 +${def.tier === 3 ? 2 : 1}(보드에 ${tn}가 하나라도 있을 때)` : def.desc; }

/** 주간 규칙: 한국 시간 주(ISO)마다 하나. 판을 시작할 때 그 주 규칙이 판에 붙어 끝까지 유지됩니다. */
export type WeeklyRule = { id: string; name: string; desc: string; mods: RunMods };
export const WEEKLY_RULES: WeeklyRule[] = [
    { id: 'golden', name: '황금 주간', desc: '라운드마다 골드 +1', mods: { goldPlus: 1 } },
    { id: 'emblems', name: '문장 주간', desc: '매 라운드 상자에 문장', mods: { emblemEvery: true } },
    { id: 'blitz', name: '속전속결', desc: '전투 최대 25턴(남은 체력 비율 판정이 잦음) · 모든 유닛 속도 +1', mods: { maxTurns: 25, speed: 1 } },
    { id: 'giants', name: '거인의 주', desc: '★2 이상 유닛 능력치 +8%', mods: { starPower: 1.08 } },
    { id: 'bossRush', name: '보스 러시', desc: '막 보스 보상 2배', mods: { actMult: 2 } },
    { id: 'haunted', name: '고스트 주간', desc: '고스트 상대 확률 90%', mods: { ghostChance: .9 } },
    { id: 'thrift', name: '절약 주간', desc: '새로 고침 1골드', mods: { rerollCost: 1 } },
    { id: 'bazaar', name: '큰 장', desc: '벤치 +1 · 상자 선택지 +1', mods: { benchPlus: 1, boxPlus: 1 } },
];
export function weeklyRule(weekKey: string): WeeklyRule { let h = 0; for (const ch of weekKey) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return WEEKLY_RULES[h % WEEKLY_RULES.length]; }
export const weeklyRuleById = (id?: string) => WEEKLY_RULES.find(r => r.id === id);

/** 원정 숙련(계정 성장): 판이 끝날 때 승리 × 10 + 막 보스 × 20 + 완주 50 경험치. 레벨 n → n+1에 100 + 50 × (n − 1). 최대 50. */
export const MASTERY_MAX = 50;
/** 21단계 명성: 숙련 50을 찍으면 ‘원정 명성’을 올리며 숙련을 1로 되돌릴 수 있습니다. 명성마다 다음 주기의 숙련 경험치 요구 +20%, 세계석 보상 +2%(명성 25까지 반영). 방치형 장르의 환생층(Cookie Clicker 승천 · Antimatter Dimensions 무한)과 같은 역할. */
export const RENOWN = { xpGrowth: .2, rewardPer: .02, rewardCap: 25, titles: [1, 5, 10, 25, 50] };
export const masteryXpFor = (level: number, renown = 0) => Math.round((100 + 50 * (level - 1)) * (1 + RENOWN.xpGrowth * Math.max(0, renown)));
export const renownRewardMult = (renown = 0) => 1 + RENOWN.rewardPer * Math.min(RENOWN.rewardCap, Math.max(0, renown));
/** 21단계 주간 리그: 같은 등급의 모험가 8명이 한 조. 주간 점수 = 그 주 최고 판 점수 + 그 주 승리 합. 1~2위 승급 · 7~8위(6명 이상인 조) 강등. */
export const LEAGUE = { size: 8, tiers: ['브론즈', '실버', '골드', '다이아', '마스터'], icons: ['🥉', '🥈', '🥇', '💎', '👑'], rewards: [15, 10, 10, 5, 5, 2, 2, 2], promote: 2, demote: 2, demoteMin: 6 };
export const leagueTierName = (tier?: number) => `${LEAGUE.icons[Math.max(1, Math.min(LEAGUE.tiers.length, tier || 1)) - 1]} ${LEAGUE.tiers[Math.max(1, Math.min(LEAGUE.tiers.length, tier || 1)) - 1]}`;
export type LeagueSettlement = { week: string; tier: number; rank: number; size: number; score: number; pearls: number; nextTier: number };
/** 누적 이정표(수십 년 단위 목표): 총 승리 · 총 판 수. */
export const MILESTONE_WINS = [1000, 10000, 100000];
export const MILESTONE_RUNS = [100, 1000, 10000];
export const masteryRunXp = (wins: number, acts: number, cleared: boolean) => wins * 10 + acts * 20 + (cleared ? 50 : 0);
export type MasteryPerk = { level: number; id: string; name: string; desc: string; mods?: RunMods; startGold?: number; title?: string };
export const MASTERY_PERKS: MasteryPerk[] = [
    { level: 2, id: 'm2', name: '견습 원정가', desc: '칭호 🧭 원정 견습', title: 'expMastery:2' },
    { level: 5, id: 'm5', name: '노잣돈', desc: '시작 골드 +2', startGold: 2 },
    { level: 10, id: 'm10', name: '넉넉한 벤치', desc: '벤치 +1', mods: { benchPlus: 1 } },
    { level: 15, id: 'm15', name: '눈썰미', desc: '상자 선택지 +1', mods: { boxPlus: 1 } },
    { level: 20, id: 'm20', name: '베테랑', desc: '칭호 🏕 원정 베테랑', title: 'expMastery:20' },
    { level: 25, id: 'm25', name: '넓은 시야', desc: '증강 선택지 4개', mods: { augmentPlus: 1 } },
    { level: 30, id: 'm30', name: '단련된 보병', desc: '앞줄 체력 +5%', mods: { frontHp: 1.05 } },
    { level: 35, id: 'm35', name: '노련한 지휘', desc: '시작 골드 +2 더', startGold: 2 },
    { level: 40, id: 'm40', name: '원정대장', desc: '칭호 🚩 원정대장', title: 'expMastery:40' },
    { level: 50, id: 'm50', name: '전설', desc: '칭호 🌟 원정 전설 · 마나 획득 +10%', mods: { manaGain: 1.1 }, title: 'expMastery:50' },
];
export const masteryPerks = (level: number) => MASTERY_PERKS.filter(p => p.level <= level);
/** 17단계: 고스트에 실어 보내는 전투 보정(경제 · 상자 · 고스트 확률 · 턴은 뺌). 값은 범위를 잘라 위조를 막습니다. */
export function combatMods(m: RunMods | undefined): RunMods | undefined {
    if (!m) return undefined;
    const clamp = (v: unknown, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : undefined; };
    const out: RunMods = {};
    for (const [k, v] of Object.entries(m.traitPlus || {})) { const n = clamp(v, 0, 3); if (n && TRAITS.some(t => t.id === k)) (out.traitPlus ??= {})[k] = n; }
    const f = clamp(m.frontHp, 1, 2); if (f && f !== 1) out.frontHp = f;
    const b = clamp(m.backPower, 1, 2); if (b && b !== 1) out.backPower = b;
    const sp = clamp(m.starPower, 1, 2); if (sp && sp !== 1) out.starPower = sp;
    const mg = clamp(m.manaGain, 1, 2); if (mg && mg !== 1) out.manaGain = mg;
    const spd = clamp(m.speed, 0, 10); if (spd) out.speed = spd;
    const rf = clamp(m.reflect, 0, .5); if (rf) out.reflect = rf;
    const bg = clamp(m.bossGuard, 0, .6); if (bg) out.bossGuard = bg;
    return Object.keys(out).length ? out : undefined;
}
/** 여러 보정을 하나로: 배율은 곱, 가산은 합, 비용 · 확률 · 턴은 작은 쪽/마지막 값. */
export function mergeMods(list: (RunMods | undefined)[]): RunMods {
    const out: RunMods = {};
    for (const m of list) {
        if (!m) continue;
        for (const [k, v] of Object.entries(m.traitPlus || {})) (out.traitPlus ??= {})[k] = (out.traitPlus[k] || 0) + v;
        for (const k of ['frontHp', 'backPower', 'manaGain', 'starPower', 'actMult'] as const) if (m[k]) out[k] = (out[k] || 1) * m[k]!;
        for (const k of ['speed', 'reflect', 'bossGuard', 'goldPlus', 'interestPlus', 'xpPlus', 'benchPlus', 'boxPlus', 'augmentPlus'] as const) if (m[k]) out[k] = (out[k] || 0) + m[k]!;
        if (m.rerollCost !== undefined) out.rerollCost = Math.min(out.rerollCost ?? Infinity, m.rerollCost);
        if (m.emblemEvery) out.emblemEvery = true;
        if (m.ghostChance !== undefined) out.ghostChance = Math.max(out.ghostChance ?? 0, m.ghostChance);
        if (m.maxTurns !== undefined) out.maxTurns = Math.min(out.maxTurns ?? Infinity, m.maxTurns);
    }
    if (out.bossGuard) out.bossGuard = Math.min(.6, out.bossGuard);
    return out;
}

// ───────────── 13단계: 과제 · 도감 · 시즌 칭호 ─────────────
/** 과제 진행 키: 핸들러가 questProgress(s, key, n)으로 올립니다. */
export type QuestKey = 'wins' | 'ghostWins' | 'bossWins' | 'clears' | 'runs' | 'star3' | 'combines' | 'augments' | 'synergy4' | 'reach8' | 'emblems';
export type QuestDef = { id: string; key: QuestKey; name: string; desc: string; target: number; period: 'daily' | 'weekly'; pearls: number; xp: number };
export const EXPEDITION_QUESTS: QuestDef[] = [
    // 일일(보상 세계석 3 · 숙련 30)
    { id: 'd_wins5', key: 'wins', name: '다섯 번의 승리', desc: '라운드 5번 이기기', target: 5, period: 'daily', pearls: 3, xp: 30 },
    { id: 'd_ghost2', key: 'ghostWins', name: '모험가 사냥', desc: '다른 모험가의 원정대(고스트) 2번 이기기', target: 2, period: 'daily', pearls: 3, xp: 30 },
    { id: 'd_boss1', key: 'bossWins', name: '막 보스 격파', desc: '막 보스 1번 이기기', target: 1, period: 'daily', pearls: 3, xp: 30 },
    { id: 'd_star3', key: 'star3', name: '세 별', desc: '유닛을 ★3으로 1번 올리기', target: 1, period: 'daily', pearls: 3, xp: 30 },
    { id: 'd_combine', key: 'combines', name: '대장간', desc: '아이템 조합 1번', target: 1, period: 'daily', pearls: 3, xp: 30 },
    { id: 'd_augment2', key: 'augments', name: '선택의 순간', desc: '증강 2번 고르기', target: 2, period: 'daily', pearls: 3, xp: 30 },
    { id: 'd_synergy', key: 'synergy4', name: '완성된 조합', desc: '4단계(머릿수 4) 이상 시너지를 켠 채 1번 이기기', target: 1, period: 'daily', pearls: 3, xp: 30 },
    { id: 'd_reach8', key: 'reach8', name: '3막 진입', desc: '9라운드까지 가기', target: 1, period: 'daily', pearls: 3, xp: 30 },
    { id: 'd_emblem', key: 'emblems', name: '문장 수집', desc: '문장 1개 고르기', target: 1, period: 'daily', pearls: 3, xp: 30 },
    // 주간(보상 세계석 10 · 숙련 150)
    { id: 'w_wins30', key: 'wins', name: '서른 번의 승리', desc: '라운드 30번 이기기', target: 30, period: 'weekly', pearls: 10, xp: 150 },
    { id: 'w_clear2', key: 'clears', name: '완주 두 번', desc: '12라운드 완주 2번', target: 2, period: 'weekly', pearls: 10, xp: 150 },
    { id: 'w_boss6', key: 'bossWins', name: '보스 사냥 주간', desc: '막 보스 6번 이기기', target: 6, period: 'weekly', pearls: 10, xp: 150 },
    { id: 'w_ghost10', key: 'ghostWins', name: '열 명의 모험가', desc: '고스트 10번 이기기', target: 10, period: 'weekly', pearls: 10, xp: 150 },
    { id: 'w_runs5', key: 'runs', name: '다섯 판', desc: '원정 5판 마치기', target: 5, period: 'weekly', pearls: 10, xp: 150 },
    { id: 'w_synergy5', key: 'synergy4', name: '조합의 달인', desc: '4단계 이상 시너지를 켠 채 5번 이기기', target: 5, period: 'weekly', pearls: 10, xp: 150 },
    { id: 'w_star3x3', key: 'star3', name: '별 셋 셋', desc: '유닛을 ★3으로 3번 올리기', target: 3, period: 'weekly', pearls: 10, xp: 150 },
];
export const QUESTS_PER_PERIOD = 3;
/** 일일 · 주간 과제 3개씩을 키(날짜 · 주) 해시로 고릅니다(모두에게 같은 과제). */
export function pickQuests(period: 'daily' | 'weekly', key: string): string[] {
    const pool = EXPEDITION_QUESTS.filter(q => q.period === period);
    let h = 7; for (const ch of key) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
    const out: string[] = [], list = [...pool];
    while (out.length < QUESTS_PER_PERIOD && list.length) { h = (h * 1664525 + 1013904223) >>> 0; out.push(list.splice(h % list.length, 1)[0].id); }
    return out;
}
export const questById = (id: string) => EXPEDITION_QUESTS.find(q => q.id === id);
/** 유닛 도감 숙달 단계(그 유닛을 보드에 두고 이긴 라운드 수): 동 10 · 은 50 · 금 200. */
export const CODEX_TIERS = [{ wins: 10, name: '동' }, { wins: 50, name: '은' }, { wins: 200, name: '금' }, { wins: 1000, name: '백금' }, { wins: 5000, name: '다이아' }];
export const codexTier = (wins: number) => CODEX_TIERS.filter(t => wins >= t.wins).length;
/** 13단계 관리자 집계용 조합 키: 2단계 이상(4명 이상 또는 역할 6) 켜진 시너지를 ‘id머릿수’로 정렬해 이어 붙입니다. 없으면 'none'. */
export const compKey = (active: { trait: { id: string; tiers: { count: number }[] }; count: number; tier: number }[]) => {
    const parts = active.filter(t => t.tier >= 2 || (t.tier >= 1 && t.trait.tiers[t.tier - 1].count >= 4)).map(t => `${t.trait.id}${t.trait.tiers[t.tier - 1].count}`).sort();
    return parts.length ? parts.join('+') : 'none';
};
export const COMP_KEYS_MAX = 40;

// ───────────── 16단계: 난이도 단계 ─────────────
/** 난이도 1~5. 출발 때 고르며, 바로 위 단계는 아래 단계를 한 번 완주해야 열립니다(expeditionDiffClears). */
export type DifficultyDef = { level: number; name: string; icon: string; /** 웨이브 예산 배율 · 적 ★ 확률 가산 · 막 보스 ★ · 보상(세계석 · 숙련) 배율 · 시즌 점수 가산 · 설명. */ budget: number; starPlus: number; bossStar: 1 | 2; reward: number; score: number; desc: string };
export const DIFFICULTIES: DifficultyDef[] = [
    { level: 1, name: '일반', icon: '🌱', budget: 1, starPlus: 0, bossStar: 1, reward: 1, score: 0, desc: '기본 난이도' },
    { level: 2, name: '숙련', icon: '🌿', budget: 1.12, starPlus: .05, bossStar: 1, reward: 1.25, score: 60, desc: '웨이브 +12% · 적 ★ 확률 +5%p' },
    { level: 3, name: '정예', icon: '⚔', budget: 1.25, starPlus: .1, bossStar: 1, reward: 1.5, score: 120, desc: '웨이브 +25% · 적 ★ 확률 +10%p' },
    { level: 4, name: '악몽', icon: '🔥', budget: 1.4, starPlus: .15, bossStar: 2, reward: 1.8, score: 180, desc: '웨이브 +40% · 적 ★ 확률 +15%p · 막 보스 ★2' },
    { level: 5, name: '전설', icon: '⚡', budget: 1.6, starPlus: .2, bossStar: 2, reward: 2.2, score: 240, desc: '웨이브 +60% · 적 ★ 확률 +20%p · 막 보스 ★2' },
];
export const difficultyOf = (level?: number) => DIFFICULTIES.find(d => d.level === (level || 1)) || DIFFICULTIES[0];
/** 열린 최고 난이도: 완주한 최고 단계 + 1(최대 5). */
export const difficultyUnlocked = (clears?: Record<number, number>) => Math.min(DIFFICULTIES.length, 1 + Math.max(0, ...Object.entries(clears || {}).filter(([, n]) => n > 0).map(([d]) => Number(d))));

// ───────────── 19단계: 본편 연결(보스 유닛 해금 · 보스 코어 조각 · 도감 → 본편 도감) ─────────────
/** 보스 유닛(special boss)은 본편에서 그 몬스터를 BOSS_UNLOCK_KILLS번 이상 처치해야 상점에 나옵니다(웨이브 · 고스트에는 그대로 나옴). */
export const BOSS_UNLOCK_KILLS = 1;
export const bossUnits = (pool: UnitDef[] = UNITS) => pool.filter(u => u.special?.includes('boss'));
export const lockedBossUnits = (book: Record<string, number> | undefined, pool: UnitDef[] = ALL_UNITS) => new Set(bossUnits(pool).filter(u => (book?.[u.monster] || 0) < BOSS_UNLOCK_KILLS).map(u => u.id));
/** 보스 코어 조각: 막 보스 · 심연 보스를 이기면 확률로 그 보스의 코어 조각. 조각이 per개 모이면 본편 보스 코어(없으면 획득 · 있으면 각성). */
/** 운영 결정(v3.356): 칠흑 · 본편 드롭 경제를 흔들지 않도록 1%에서 시작해 난이도마다 +0.5%p, 심연 +1%p(최대 4%). 운영 집계를 보고 조금씩 올립니다. */
export const CORE_SHARD = { per: 10, base: .01, perDifficulty: .005, abyssBonus: .01 };
export const shardChance = (difficulty: number, abyss: boolean) => CORE_SHARD.base + CORE_SHARD.perDifficulty * (Math.max(1, difficulty) - 1) + (abyss ? CORE_SHARD.abyssBonus : 0);
/** 유닛 → 본편 던전 코어 id. 없는 보스(칠흑 보스)는 던전 코어 7종 중 무작위(‘고대의 조각’). */
export const SHARD_CORE_OF: Record<string, string> = { mushmom: 'grotto', zakum: 'ventCathedral', kingSlime: 'kelpCatacomb', zombieMushmom: 'cemetery', juniorBalrog: 'caldera', papulatus: 'starSanctum' };
export const SHARD_CORE_POOL = ['grotto', 'kelpCatacomb', 'cemetery', 'caldera', 'temple', 'ventCathedral', 'starSanctum'];
export const shardCoreFor = (unitId: string, rng: () => number) => SHARD_CORE_OF[unitId] || SHARD_CORE_POOL[Math.floor(rng() * SHARD_CORE_POOL.length)];
/** 도감 연결: 유닛 도감이 동 · 은 · 금에 닿을 때마다 그 유닛의 본편 몬스터 처치 수를 더해 줍니다(연구 단계가 빨라짐). */
export const CODEX_LINK_KILLS = [50, 200, 500];

// ───────────── 20단계: 분기 세트 ─────────────
/** 분기 세트: 3~4개월마다 유닛 풀 일부 교체 + 세트 전용 증강 · 아이템. 판은 시작할 때의 세트(run.set)를 끝까지 쓰고, 도감 · 통계 · 고스트는 id 기준이라 세트가 바뀌어도 남습니다. */
export type SetDef = { id: string; name: string; icon: string; /** 시작 분기 'YYYY-Qn'(한국 시간). */ from: string; desc: string; /** 기본 30종에서 빼는 id · 더하는 id(EXTRA_UNITS). */ remove?: string[]; add?: string[] };
export const SETS: SetDef[] = [
    { id: 'genesis', name: '창세', icon: '🌊', from: '2026-Q4', desc: '첫 세트. 유닛 30종 · 지역 6 · 역할 6.' },
    { id: 'deepTide', name: '심해의 조류', icon: '🌑', from: '2027-Q1', desc: '던전 보스 4종(킹 슬라임 · 좀비 머쉬맘 · 주니어 발록 · 파풀라투스)과 버섯 2종이 들어오고 6종이 쉽니다. 세트 전용 증강 ‘조류 타기’ · 아이템 ‘조류의 진주’.', remove: ['orangeMushroom', 'skeletonSoldier', 'curseEye', 'mixedGolem', 'skelegon', 'darkWyvern'], add: ['blueMushroom', 'hornMushroom', 'kingSlime', 'zombieMushmom', 'juniorBalrog', 'papulatus'] },
];
/** 한국 시간 분기 키. */
export const quarterKey = (now: number) => { const d = new Date(now + 9 * 3600_000); return `${d.getUTCFullYear()}-Q${1 + Math.floor(d.getUTCMonth() / 3)}`; };
/** 지금 분기의 세트: from이 지금 분기 이하인 마지막 세트(없으면 첫 세트). */
export const activeSet = (now: number) => { const q = quarterKey(now); return [...SETS].reverse().find(x => x.from <= q) || SETS[0]; };
export const setById = (id?: string) => SETS.find(x => x.id === id) || SETS[0];
export const nextSet = (now: number) => { const q = quarterKey(now); return SETS.find(x => x.from > q); };
/** 세트의 유닛 풀. */
export const setUnits = (setId?: string): UnitDef[] => { const d = setById(setId), out = UNITS.filter(u => !d.remove?.includes(u.id)); for (const id of d.add || []) { const u = unitById(id); if (u && !out.includes(u)) out.push(u); } return out; };
/** 세트 숙련(세트마다 처음부터): 레벨 n → n+1에 150 + 50(n−1), 최대 20. 5 · 10 · 15 · 20에 세계석 10 · 20 · 30 · 50, 20이면 세트 칭호. */
export const SET_MASTERY = { max: 20, rewards: { 5: 10, 10: 20, 15: 30, 20: 50 } as Record<number, number> };
export const setMasteryXpFor = (level: number) => 150 + 50 * (level - 1);
