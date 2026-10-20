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
export const isBossRound = (round: number) => round % EXPEDITION.actLength === 0 && round <= EXPEDITION.rounds;
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
export const unitById = (id: string) => UNITS.find(u => u.id === id);

/**
 * 시너지 효과(단계별). 능력치로 적을 수 있는 것은 Stats 보정(bonus)과 배율(mult)로, 나머지는 flag로 두고 systems/expedition.ts의 전투 계층이 처리합니다.
 * 2단계: 기술은 마나 100에 발동(기본 공격 +10 · 피격 +5)하므로 숲 4 ‘마나 충전 +25%’(manaBoost), 신전 · 아케인 ‘시작 마나 50 · 100’(startMana50 · 100)을 초안대로 둡니다.
 * 초원 4 재생(regen: 턴마다 최대 체력 4%), 황야 4 반격(reflect: 받은 피해의 25%를 공격자에게), 역병 4 전파(spread), 보스 4 포효(roar: 적 전체 약화 2턴), 바다 · 용 4 시작 가속(haste 3턴)은 전투 계층이 처리합니다.
 */
export type TraitTier = { count: number; bonus?: Partial<Stats>; mult?: Partial<Record<'hp' | 'attack' | 'magic', number>>; damageTaken?: number; flags?: string[]; only?: Role | 'backline' | 'boss' };
export type TraitDef = { id: Origin | Role | Special; kind: 'origin' | 'role' | 'special'; name: string; tiers: TraitTier[] };
export const TRAITS: TraitDef[] = [
    { id: 'meadow', kind: 'origin', name: '초원', tiers: [{ count: 2, mult: { hp: 1.25 } }, { count: 4, mult: { hp: 1.7 }, flags: ['regen'] }] },
    { id: 'wasteland', kind: 'origin', name: '황야', tiers: [{ count: 2, damageTaken: .2 }, { count: 4, damageTaken: .45, mult: { attack: 1.2, magic: 1.2 }, flags: ['reflect'] }] },
    { id: 'forest', kind: 'origin', name: '숲', tiers: [{ count: 2, mult: { magic: 1.15 } }, { count: 4, mult: { magic: 1.35 }, flags: ['manaBoost'] }] },
    { id: 'underground', kind: 'origin', name: '지하', tiers: [{ count: 2, flags: ['killStack'] }, { count: 4, flags: ['killStack'], bonus: { followUpBonus: .2 } }] },
    { id: 'sea', kind: 'origin', name: '바다 · 용', tiers: [{ count: 2, bonus: { speed: 2 } }, { count: 4, bonus: { speed: 6 }, flags: ['haste'] }] },
    { id: 'temple', kind: 'origin', name: '신전 · 아케인', tiers: [{ count: 2, flags: ['startMana50'] }, { count: 4, bonus: { penetration: .35 }, flags: ['startMana100'] }] },
    { id: 'charge', kind: 'role', name: '돌격', tiers: [{ count: 2, mult: { attack: 1.2 } }, { count: 4, mult: { attack: 1.45 } }, { count: 6, mult: { attack: 1.25 }, bonus: { crit: .15 } }] },
    { id: 'arcane', kind: 'role', name: '마력', tiers: [{ count: 2, mult: { magic: 1.2 } }, { count: 4, mult: { magic: 1.45 } }, { count: 6, mult: { magic: 1.25 }, bonus: { penetration: .3 } }] },
    { id: 'guard', kind: 'role', name: '수호', tiers: [{ count: 2, damageTaken: .2, only: 'guard' }, { count: 4, damageTaken: .4, only: 'guard', flags: ['backline15'] }] },
    { id: 'control', kind: 'role', name: '제어', tiers: [{ count: 2, bonus: { stunBonus: 1, controlBonus: 1 } }, { count: 4, bonus: { stunBonus: 2, controlBonus: 2 }, flags: ['ignoreResist'] }] },
    { id: 'plague', kind: 'role', name: '역병', tiers: [{ count: 2, bonus: { poisonStackBonus: 1, dotTurnsBonus: 1 } }, { count: 4, bonus: { poisonStackBonus: 2, dotTurnsBonus: 2 }, flags: ['spread'] }] },
    { id: 'wraith', kind: 'role', name: '망령', tiers: [{ count: 2, bonus: { lifesteal: .15 } }, { count: 4, bonus: { lifesteal: .35 }, flags: ['revive'] }] },
    { id: 'boss', kind: 'special', name: '보스', tiers: [{ count: 2, mult: { hp: 1.2 }, only: 'boss' }, { count: 4, mult: { hp: 1.2 }, only: 'boss', flags: ['roar'] }] },
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
export type ItemDef = { id: string; name: string; desc: string; bonus?: Partial<Stats>; mult?: Partial<Record<'hp' | 'attack' | 'magic', number>>; damageTaken?: number; startMana?: number; reflect?: number; /** 7단계: 조합으로만 나오는 상위 아이템(상자에 안 나옴). 8단계: 'emblem'은 문장(3라운드부터 상자 셋째 칸). */ tier?: 2 | 'emblem'; /** 8단계 문장: 낀 유닛을 이 지역 · 역할로도 셉니다(시너지 머릿수 +1). */ emblem?: { origin?: Origin; role?: Role } };
export const ITEMS: ItemDef[] = [
    { id: 'blade', name: '맹공의 검', desc: '물리 공격 +35%', mult: { attack: 1.35 } },
    { id: 'wand', name: '마력의 지팡이', desc: '마법 공격 +35%', mult: { magic: 1.35 } },
    { id: 'shield', name: '수호의 방패', desc: '받는 피해 −25%', damageTaken: .25 },
    { id: 'boots', name: '질풍의 신발', desc: '속도 +4(먼저 행동)', bonus: { speed: 4 } },
    { id: 'fang', name: '흡혈의 송곳니', desc: '흡혈 +25%p', bonus: { lifesteal: .25 } },
    { id: 'horn', name: '메아리 뿔', desc: '추가타 위력 +30%p · 치명타 +10%p', bonus: { followUpBonus: .3, crit: .1 } },
    { id: 'manaStone', name: '마나석', desc: '시작 마나 +60 · 최대 체력 +15%', startMana: 60, mult: { hp: 1.15 } },
    { id: 'thornMail', name: '가시 갑옷', desc: '받은 피해의 30% 반격 · 최대 체력 +20%', reflect: .3, mult: { hp: 1.2 } },
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
export const BOX_ITEMS = () => ITEMS.filter(x => !x.tier);
/** 상자 선택지 수. */
export const BOX_CHOICES = 3;
export const itemById = (id: string) => ITEMS.find(x => x.id === id);
/** 한 번에 가질 수 있는 미장착 아이템 수. */
export const ITEM_HOLD = 4;
