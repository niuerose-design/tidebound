/** 가장 자주 수정할 밸런스. UI/저장 코드와 독립적입니다. */
import { ODDS } from './odds';
/** 세이브 형식 버전. 바뀌면 migrations.ts가 이전 세이브를 변환하고, 랭킹은 같은 버전의 스냅샷만 보여줍니다. */
export const SAVE_VERSION = 8;
export const BALANCE = {
    turnMs: 2000, offlineCapSeconds: 21600, baseHp: 110, baseAttack: 13,
    /** v3.189 이보다 오래 비운 정산만 부재중 보정(이벤트 · 축복 절반, 까미 · 누리 · 슬라임 확률 offlineScale)을 받습니다. 1분 넘게 밀린 정산은 계산 방식만 부재중 정산(표본 환산 · 분할)입니다. */
    offlineAwaySeconds: 3600,
    /** v3.129 기본 마방도 상수로 둡니다. 레벨당 값은 올리지 않습니다: 방어 · 마방은 탱커 계보 패시브를 배워 채우는 것이 의도(docs/gear-endgame.md v3.129). */
    baseDefense: 3, baseResist: 3, resistPerLevel: .7,
    /** v3.90 최대 마나 기본값 · 레벨당. 체력(110 · 레벨당 14)의 약 0.2배를 목표로 합니다. */
    baseMana: 30, manaPerLevel: 3,
    hpPerLevel: 14, attackPerLevel: 3, defensePerLevel: 1, baseCrit: 0.08, /** v27.45 황금 개체 기본 확률(처치마다). v3.52 값은 서버 전용(odds). */ get goldenBase() { return ODDS.drop.goldenBase; },
    // See scripts/check-progression-pace.mjs for gearless routing samples;
    // completion times vary substantially with the chosen job and loadout.
    // Gear luck, routing and inherited techniques still change the time to rebirth.
    critMultiplier: 1.65, xpBase: 35, xpGrowth: 1.33, jobLevel: 10, rebirthLevel: 30,
    // Legacy display values kept for save/config compatibility. Loadouts are now limited by total AP only.
    activeSlots: 4, passiveSlots: 3, /** v3.154 넓은 가방 연구 없이 100칸 고정. */ inventoryCap: 100,
    // v3.52 기본 확률·상한은 서버 전용(game/secret/odds.ts). dropBonusScale(보너스 → 상대 증가 환산)은 화면 표시에 써서 공개.
    get dropChance() { return ODDS.drop.chance; }, dropBonusScale: 0.1, get dropChanceCap() { return ODDS.drop.cap; },
    /** v27.53 해역 난이도·무릉도장 층으로 올라가는 드롭 장비 레벨 상한: 캐릭터 레벨 + dropLevelOver(그 지역 몬스터보다 낮아지지는 않음). */
    dropLevelOver: 10,
    /** v27.76 사냥터 난이도의 장비 보상: 등급 가중·정수 확률·양은 서버 전용(odds). 정수는 난이도 essenceMinTier부터(공개). */
    tideLoot: { get rarityPerTier() { return ODDS.drop.tideRarityPerTier; }, essenceMinTier: 5, get essenceChancePerTier() { return ODDS.drop.essenceChancePerTier; }, get essenceEveryTiers() { return ODDS.drop.essenceEveryTiers; } },
    /** 던전 반복 정복 시 희귀 이상 확정 장비 확률(첫 정복·심연 5층마다는 항상). v3.52 값은 서버 전용(odds). */
    get dungeonRepeatDrop() { return ODDS.drop.dungeonRepeat; },
    // 처치 후 회복률(근거: scripts/check-recovery.mjs). v27.8 기본 20%, v27.78 난이도가 오를수록 1/(1+t/10)로 계속 줄고 healAfterKillMin 아래로는 내려가지 않습니다.
    healAfterKill: 0.2, /** v27.78 난이도 t에서 처치 후 회복 = 기본 ÷ (1 + t ÷ healAfterKillTideScale), 최저 healAfterKillMin. 10에서 10%, 30에서 5%, 90부터 2%. */ healAfterKillTideScale: 10, healAfterKillMin: .02, /** v3.17 쓰러진 뒤 회복 대기(턴): 3 → 25(50초). 환생 10회 미만은 SPROUT.recoveryTurns(3). */ recoveryTurns: 25,
    // Fish codex SP is deliberately paced for long-term mastery rather than early burst spending.
    // Individual research is a long-term collection track, not an early SP faucet.
    bookMilestones: [50, 500, 2500, 10000, 250000, 500000], /** v27.80 연구 단계별 난이도 조건: 그 몬스터를 이 난이도 이상에서 처치한 적이 있어야 합니다(v27.81 6단계만 50, 5단계는 처치 수만). */ bookTierReq: [0, 0, 0, 0, 0, 50], duelCooldownMs: 60000, duelMaxTurns: 80, /** v26.2 랭크 결투 하루 횟수와 같은 상대 하루 횟수. 연습 대결은 제한 없음. */ duelPerDay: 20, duelPerOpponentPerDay: 3,
    // 연속 행동: 상대보다 빠르면 행동마다 p = min(1, max(0, 계수 × log2(내 속도 / 상대 속도)))로 한 번 더 행동합니다. 턴당 최대 횟수까지.
    chainCoefficient: 0.5, chainMaxActions: 5,
};
export const MONSTER_TUNING = {
    // A strong single-stat build should still need several hours of victories
    // before the first rebirth. HP is the main pacing lever; attack and defense
    // remain readable so deaths do not turn the early game into a wall.
    // v26.6 10레벨 이후 사냥터가 해금 뒤 2~4레벨이면 쓸 만하도록 맞춘 값입니다.
    hpMultiplier: 2.1,
    attackMultiplier: 1.08,
    // v24 몬스터 치명타: 기본 + 레벨당 증가(상한), 보스·날쌘 성향은 추가. 치명 피해는 플레이어 기본값(critMultiplier)과 같습니다.
    critBase: .04, critPerLevel: .0006, critCap: .1, critBoss: .04, critSwift: .04,
    // v27.69 몬스터 방어 관통: 레벨 × penPerLevel(상한 penCap), 보스 +penBoss. 방어만 쌓으면 고레벨 몬스터도 거의 못 때리던 것을 막습니다.
    penPerLevel: .0035, penCap: .28, penBoss: .1,
    // v27.69 각성(foeWard)을 쓰는 몬스터 레벨(보스는 레벨과 무관하게 씀).
    wardLevel: 50,
    defenseMultiplier: 1.1,
    bossMultiplier: 2.7,
    /** v3.186 보스(던전 마지막 판 · 무릉 보스) 체력 추가 배율(docs/boss-plan.md §6): 입장 환생 몸이 보스를 15~30턴에 잡게. 월드보스 · 칠흑 · 대왕은 이 배율을 쓰지 않습니다. */
    bossHpScale: .8,
    bossRewardMultiplier: 1.9,
    dungeonPreparationTurns: 3,
    dungeonHealAfterKill: .08,
} as const;
/**
 * Entry-level fish stay approachable; higher-level fish are a real gearless wall.
 */
export function monsterLevelScale(level: number) {
    return { hp: 1 + Math.max(0, level - 5) * .028, attack: 1 + Math.max(0, level - 8) * .009, defense: 1 + Math.max(0, level - 10) * .006 };
}
export function bossLevelScale(level: number) {
    const growth = Math.min(1, Math.max(0, level - 14) / 24);
    return { hp: 2.1 + (MONSTER_TUNING.bossMultiplier - 2.1) * growth, attack: 1.2 + .25 * growth, magic: 1.08 + .17 * growth };
}
/** v27.30 던전 적 압박: 같은 레벨 사냥터보다 단단하게(체력 1.3~1.62배, 공격 1.12~1.32배, 방어 1.08~1.24배). */
/**
 * v3.84 방어 관통 개편(docs/concept.md 11.9): 출처끼리 곱연산(남은 방어의 x%를 무시)으로 합치고 60% 상한을 없앴습니다. 스킬 보너스까지 합친 상한은 85%(cap):
 * 100%면 방어가 0이 되어 아무리 단단한 보스도 그대로 뚫리므로, 방어 15,000도 2.2%만 들어가게 남깁니다. 능력치 관통만으로는 풀세팅 약 75%라 성장 구간에서는 막히지 않습니다.
 * 곱연산이라 1에 닿지 않아 출처를 더할 때마다 피해가 거의 일정하게 늘어납니다. 장비는 부위마다 한 출처입니다. 스킬 관통 보너스는 그 위에 더합니다(예전과 같음).
 * 피해식(공격 대비 B안)을 바꾸더라도 관통은 '방어 × (1 − 관통)'으로 그대로 쓸 수 있습니다.
 */
export const PENETRATION = { cap: .85, researchPerRank: .03, gearScale: 2 } as const;
/** 관통 두 값을 곱연산으로 합칩니다(음수는 그대로 빼서 손해 옵션도 반영). */
export const stackPenetration = (a: number, b: number) => b >= 0 ? 1 - (1 - a) * (1 - Math.min(1, b)) : a + b;
/**
 * v3.84 보스 피해(bossDamage, 보스 · 사냥감에게 주는 직접 피해): 출처(장비 부위 · 칠흑 세트 · 칠흑 규칙)끼리 곱연산.
 * 하나하나는 작지만 모을수록 보스전에서 크게 붙습니다. 지속 피해(출혈 · 중독 · 화상)에는 붙지 않습니다(틱은 보정 전 위력 기준).
 */
export const stackBossDamage = (a: number, b: number) => b >= 0 ? (1 + a) * (1 + b) - 1 : a + b;
/** v3.201 던전 보스는 웨이브 수와 무관하게 마지막 단계 압박(BOSS_PRESSURE_WAVE)을 받습니다(지역 던전이 2연전으로 줄어도 보스 세기는 그대로). */
export const BOSS_PRESSURE_WAVE = 4;
export function dungeonPressure(wave: number) {
    const index = Math.max(0, Math.min(4, wave));
    return { hp: 1.3 + index * .08, attack: 1.12 + index * .05, defense: 1.08 + index * .04 };
}
/**
 * v27.30 던전 보상 기준.
 * - v27.35 보상은 '권장 레벨 몬스터 몇 마리분'으로 정합니다. 보스 경험치 = 몬스터 bossExpMonsters마리분, 보스 골드 = bossGoldMonsters마리분,
 *   클리어 골드 = clearGoldMonsters마리분. 일반 웨이브는 몬스터 레벨을 권장 레벨 + expLevelOver까지만 셉니다.
 *   한 번 클리어(전투 5번)가 같은 레벨 사냥 전투 5번의 약 2~3배가 되도록 맞춘 값입니다(적이 단단해 시간은 더 듭니다).
 * - 무릉도장 층 배율은 경험치·골드 모두 rewardTierCap 단계에서 멈춥니다(세계석은 층 공식 그대로).
 * - v3.201 권장 레벨 초과 감액(클리어 골드·반복 장비 확률)은 없앴습니다. 헬부터는 몬스터 레벨이 내 레벨까지 올라 노말에서만 걸리던 이중 감액이었습니다.
 * - 던전 적 속도는 층 배율 1단계마다 +tierSpeed(연속 행동 남용 방지).
 */
export const DUNGEON_TUNING = { bossExpMonsters: 6, bossGoldMonsters: 4, clearGoldMonsters: 6, expLevelOver: 2, rewardTierCap: 6, tierSpeed: .02 };
/**
 * v27.35 무릉도장 적: 층마다 가파르게 강해지는 별도 공식(보상은 rewardTierCap에서 멈춤).
 * 1층 일반 몬스터 체력 hp에서 층마다 ×hpGrowth, 공격은 기준 몬스터의 attack배에서 층마다 ×attackGrowth, 방어는 defense배에서 ×defenseGrowth.
 * 몬스터·보스 사이의 상대 차이(성향·보스 배율)는 그대로 유지합니다.
 */
// v3.188 1층 기준(docs/boss-plan.md §8.2): 입장 환생 3 초보 몸의 1층 클리어 약 76%(환생 5는 96%), 환생 100 자기 계열은 50층 44% · 빌림 96%가 되는 값.
export const ABYSS_TUNING = { hp: 30000, hpGrowth: 1.15, attack: 2, attackGrowth: 1.08, defense: 2, defenseGrowth: 1.05 };
/**
 * v27.70 던전 난이도(일반 던전): 입장할 때 고르는 세 단계. 사냥터 난이도와 별개입니다. tier는 사냥터 난이도와 같은 배율 공식(체력·공격·보상·숙련·몬스터 레벨 보정)에 넣는 값입니다.
 * 노말 0(지금 난이도) · 헬 70(사냥터 난이도 70급: 체력 ×40.5 · 공격 ×18.6) · 나이트메어 260(난이도 260급: 체력 ×437 · 공격 ×163). v3.186 docs/boss-plan.md §6(헬은 자기 계열 환생 50 몸 30~39턴, 나이트메어는 빌림 환생 100 몸 18~25턴). 처치 숙련 배율은 없습니다(v27.74). 헬부터 몬스터 레벨이 내 레벨까지 올라갑니다.
 */
export const DUNGEON_MODES = [{ id: 'normal', name: '노말', tier: 0, note: '' }, { id: 'hell', name: '헬', tier: 70, note: '환생 50 안팎의 몸에 맞춘 난이도입니다.' }, { id: 'nightmare', name: '나이트메어', tier: 260, note: '다른 직업 패시브까지 계승해 채운 몸을 위한 난이도입니다. 자기 계열만으로는 깨기 어렵습니다.' }] as const;
export type DungeonMode = typeof DUNGEON_MODES[number]['id'];
export const dungeonModeTier = (mode?: string) => DUNGEON_MODES.find(m => m.id === mode)?.tier ?? 0;
// 스킬 공식의 기본값. 전투 계산(combat.ts)과 스킬 설명(skill-description.ts)이 같은 값을 씁니다.
export const SKILL_FORMULA = {
    /** v3.88 행운 비례 보정(팬텀 계열): 치명 피해 재적용을 없앤 대신 위력의 치명 피해 비례분(scalingRatio)에 곱합니다.
     * 성장 구간(장비 없음) 2~5차는 거의 그대로, 엔드(치명 피해 ×4 이상)의 제곱 폭증만 깎이도록 맞춘 값(check-roles · check-tier5). */
    luckScalingScale: 2.8,
    // v26.6 주사위: 손가락 자르기 1단계마다 최저 배율은 로그 폭의 diceTrimLow, 최고 배율은 diceTrimHigh만큼 안쪽으로. 최대 diceTrimCap단계.
    diceTrimLow: .25, diceTrimHigh: .05, diceTrimCap: 3,
    healThreshold: .8, woundedThreshold: .7, healRatio: .22,
    hpScaling: .08, manaScaling: .45, hybridHpScaling: .05, hybridManaScaling: .25,
    crushDefense: 1.5, weakenedDamage: .75,
    /** v3.143 충전(메카닉): 최대 중첩과, 약화된 적을 충전 기술로 때릴 때 더 쌓이는 중첩. */
    charge: { max: 8, weakenedExtra: 1 },
    /** v3.148 마나 연소(아델): 태운 마나 1마다 피해 기준값에 더하는 값(기술의 burnScale이 없을 때). */
    manaBurnScale: 6,
    /**
     * v27.57 지속 피해 셋은 '가득 찬 상태'의 턴당 이론 증가량(위력 비례 틱 + 받는 피해 증가, 그리고 최대 체력 비례분)이 서로 같도록 맞춥니다.
     * 차이는 성격으로만: 출혈은 바로 최대, 화상은 3번, 중독은 5번 걸어야 가득 차는 대신 오래가고(4턴) 포화 옵션으로 더 쌓입니다.
     * v3.181 체력 비례분은 작게, 위력분은 크게 둡니다: 엔드 몸의 보스 전투에서 지속 피해의 절반이 몬스터 체력이 만든 숫자라 공격력을 올려도 틱이 거의 안 움직였고,
     *   월드보스(체력 20억)에서는 체력분만 억 단위로 치솟았습니다. 틱 숫자가 내 성장에 따라 오르게 하되 체력분은 탱커 카운터로 남겨 둡니다(0으로 만들지 않음).
     */
    bleedRatio: .42, bleedHpRatio: .0075,
    /** v27.17 출혈 중인 대상이 받는 직접 피해 증가. 출혈은 중첩되지 않는 대신 이 보정을 줍니다. */
    bleedVulnerability: .12,
    /** v27.17 중독 한 중첩의 틱 피해 비율(위력 기준)과 최대 체력 비례. */
    poisonRatio: .12, poisonHpRatio: .0015,
    /** v27.48 화상(중독과 출혈의 중간): 한 중첩의 틱 비율, 받는 직접 피해 증가(출혈의 절반). */
    burnRatio: .18, burnHpRatio: .0025, burnVulnerability: .06,
    /** v27.18 극 치명타: 치명타 확률 상한은 100%. 100%를 넘는 몫 100%p마다 극 치명타 확률 +5%(superCritPerHundred, v3.210 +1% → +5%). 극 치명타는 치명 피해에 superCritBonus를 더 곱합니다. */
    critCap: 1, superCritPerHundred: .05, superCritBonus: 1.5, drainRatio: .25, extraAttackMultiplier: .65,
    // 올라운드 밸런스: 40 + 배분 포인트 합 × 0.8 + 가장 낮은 배분 포인트 × 12, 물리·마법 절반씩.
    // 편중 배분보다 균형 배분이 강하도록 check-all-rounder.mjs 결과로 맞춘 값입니다.
    harmonyBase: 40, harmonyPerPoint: .8, harmonyPerLowest: 12, splitPhysical: .5,
    // v21 올라운더: 원시 피해도 연구·환생·직업 배율을 받고, 장착한 능력치 패시브의
    // 출신 직업이 서로 다를수록(최대 harmonyJobCap개) 직업당 harmonyPerJob만큼 강해집니다.
    harmonyScale: 2, harmonyPerJob: .15, harmonyJobCap: 6,
    // v21 회복 기술은 체력이 가득 차도 발동합니다. 체력이 healThreshold 이상일 때 쓰면
    // 회복 직업이 아닌 경우 그 공격의 피해가 idleHealDamage 배가 됩니다.
    idleHealDamage: .6,
    // v22.2 흡혈 상한: 한 번의 행동(추가타 포함)으로 회복하는 흡혈량은 최대 체력 × 흡혈률 × 이 값까지입니다.
    // 심연은 적의 체력이 높고 공격이 약한 소모전이라, 준 피해 비례 흡혈 3%만으로 도달 층이 3배가 되었습니다.
    // v3.236 .025 → .1: 흡혈 10%에 최대 체력의 0.25%뿐이라 상한 없을 때의 약 45%만 들어왔습니다(자쿰 노멀). .1이면 약 87%.
    lifestealHpCap: .1,
    // v21 방어 친화도: (직업 물리 방어 배율 − guardBase) ÷ guardSpan, guardFloor~1로 제한. 고정 보정 직업은 jobFactor로 환산한 배율을 씁니다.
    // 방어 비례 피해와 반격은 이 값만큼만 발휘되어 계승해도 수호 계열만큼 강하지 않습니다.
    guardBase: .95, guardSpan: .5, guardFloor: .2,
    // 처형형 연계: 적 체력이 이 비율 이하일 때 lowHp 조건 보너스가 붙습니다.
    lowHpThreshold: .35,
    /** v26.0 반격 흡혈 배율: 반격 피해 × 흡혈률 × 이 값. */
    thornsLifestealScale: 2,
    // v27.2 탱커 개편: 반격은 공격자 방어를 thornsPierce만큼 무시하고, 무리(×N)를 상대할 때 (1 + log2 N)배(최대 swarmThornsCap)로 커집니다. 여러 마리가 한꺼번에 가시에 부딪히는 셈.
    thornsPierce: .5, swarmThornsCap: 10,
    // v27.3 지속 피해는 틱마다 대상 최대 체력 비례 피해를 더합니다(무리는 한 마리 기준). v27.57부터 종류별 비율(bleedHpRatio·poisonHpRatio·burnHpRatio). 이 값은 옛 기준(설명용).
    // v3.54 지속 피해의 체력 비례분은 틱 때 대상의 현재 체력 기준입니다. 보스·월드보스처럼 체력이 큰 상대에게 비례분이 끝없이 커지던 것을 막고, 체력이 깎일수록 줄어듭니다.
    // 무리에게는 한 마리 체력 × √N(swarmDotShare)으로 셉니다.
    // v3.54 힐러(healFocus) 회복 기술의 넘친 회복량 × overhealDamage를 적에게 방어 무시 피해로 줍니다(회복이 처치 속도에 기여하도록).
    overhealDamage: .6,
    // v21.1 마력 평타: 마법 직업(마법 배율이 물리보다 0.05 이상 높음, 고정 보정의 반올림을 감안해 0.045로 판정)은 기본 공격 대신
    // 차수별 확률로 마법 공격 × arcaneStrikeRatio의 마법 피해를 줍니다. 마나를 쓰지 않습니다.
    // v25.22 확률 제거: 마법 직업의 기본 공격은 항상 마력 평타(마법 공격 × 계수)입니다. 배열은 차수별 1(켜짐)로만 씁니다.
    // v26.7 마법 명중: 마법 공격(마법 기술·마력 평타)은 상대 회피를 이 비율만 적용하고 속도 보정의 마이너스를 받지 않습니다.
    magicEvasionScale: .5,
    arcaneStrikeRatio: .7, arcaneStrikeChance: [0, 1, 1, 1, 1, 1],
    // v25.5 동시 시전(겹영창 계보): multicast 액티브는 첫 성공 뒤 나머지 multicast 액티브도 각자 발동률로 함께 나갑니다(한 행동, 최대 max개).
    // 함께 나간 종류 n마다 각 기술의 재사용 대기 +cooldownStep×(n−1), 마나 ×(1 + manaScale×(n−1)).
    // v3.239 damagePerCast: 묶음 n개면 각 주문 피해 ×(1 + damagePerCast × (n−1)). 하위 영창도 묶음 수를 늘려 계보 주문으로 채우는 쪽이 이득이 되게.
    multicast: { max: 4, cooldownStep: 1, manaScale: .35, damagePerCast: .15 },
    // v3.86 각성기(5차 이상 직업의 액티브): 행동마다가 아니라 턴마다(기본 행동 + 확정 추가 행동, 연속 행동은 제외) 따로 판정해 일반 액티브와 같은 턴에 함께 나갑니다.
    // 대기는 턴 단위이고 대기가 꽉 찬 채로 시작합니다(start, 데미지 없는 각성기는 0으로 둘 수 있음). 판정에 실패할 때마다 다음 판정 확률에 기본 발동률을 더합니다(27% → 54% → 81% → 100%).
    // 배율 = 옛 배율 × (새 주기 ÷ 옛 주기) × boost. 옛 주기는 행동 단위 '대기 + 1/발동률', 새 주기는 '대기 턴 + 기대 판정 수'(발동률은 숙련 완료 기준).
    // 대기 초기화 패시브(처치·치명타·연속 행동)는 각성기 대기를 0으로 만들지 않고 reset턴만 줄입니다.
    // 각성기로 상대를 쓰러뜨리면 대기를 kill턴으로 줄입니다.
    // perTurn: 한 턴에 나가는 각성기 수(나중에 승천 연구로 늘릴 자리, 전투원별 awakenPerTurn이 있으면 그 값).
    /** v3.288 wardPierce: 상태이상을 거는 각성기의 각성 관통 확률(기술 숙련 단계 0~4별, Skill.wardPierce). */
    awaken: { tier: 5, cooldown: 10, start: 10, boost: 1, reset: 5, kill: 5, perTurn: 1, wardPierce: [0, .25, .5, .75, 1] as readonly number[] },
    // v3.86 추가 판정: 액티브가 발동한 행동에서 남은 액티브로 한 번 더 판정해 줄어든 위력으로 함께 씁니다. 단계마다 장착 AP · 위력(세계석 연구 ‘시스템 파괴 I’으로 해금).
    extraRoll: { ap: [12], power: [.6] },
    // v25.4 패시브는 최대 성장(마지막 숙련 단계)에 닿으면 장착 AP가 이만큼 줄어듭니다(0 아래로는 안 내려감). 노래와 단계별 AP가 정해진 대기만성형은 제외.
    masteredPassiveAP: 1,
    // v25.2 차수별 마력 평타 계수: 3차 +0.03, 4·5차 +0.05.
    arcaneRatioByTier: [0, 0, 0, .03, .05, .05],
    // v21.2 전용 기술: signatureTier 이상 직업의 기술은 자기 계보(조상·후손 직업)에서 온전히,
    // 계보 밖에서 계승하면 배율·패시브 수치가 signatureScale 배로 발휘됩니다. 1~3차 기술은 자유롭게 조합됩니다.
    // v3.80 시작 차수 5(docs/concept.md 11.3): 4차 기술은 계보 밖에서도 온전히 씁니다.
    signatureTier: 5, signatureScale: .7,
    // v24.2 지정 몬스터 연구(와일드헌터 계보)의 대상: 리본 돼지·파이어보어·머쉬맘.
    designatedSpecies: ['eel', 'emberEel', 'grottoWarden'],
    // v24 환생 비례 패시브(perRebirth): 환생 횟수는 이 값까지만 셉니다.
    perRebirthCap: 30,
    // v23.1 고정 수치 직업 보정의 환산 기준: 차수별 밸런스 점검 레벨(1차 Lv.15 · 2차 Lv.40 · 3차 Lv.50)에서
    // 장비 없이 배분했을 때의 능력치입니다. 고정 보정을 옛 배율로 되돌려 방어 친화도·마력 평타 판정에 씁니다.
    // v25.2 능력치 효율 조정(근력 2.3·지능 2.8)으로 실제 수치가 조금 올랐지만 판정 경계(0.045)에는 영향이 없어 그대로 둡니다.
    jobFlatReference: {
        1: { attack: 125, magic: 135, hp: 510, defense: 35, resist: 32 },
        2: { attack: 132, magic: 145, hp: 497, defense: 38, resist: 33 },
        3: { attack: 167, magic: 185, hp: 621, defense: 47, resist: 41 },
    } as Record<number, Record<'attack' | 'magic' | 'hp' | 'defense' | 'resist', number>>,
};
// 상태이상 수치와 지속시간은 전투 코드와 분리해 여기서 조정합니다.
export const STATUS_TUNING = {
    weakenTurns: 3,
    bleedTurns: 3,
    /** v27.17 중독 지속 턴. 걸릴 때마다 한 중첩씩 쌓고 지속 시간을 갱신합니다. */
    poisonTurns: 4,
    /** v21.3 중독 중첩 상한. */
    poisonMaxStacks: 5,
    /** v3.54 처음 걸 때 중독 중첩(이후 걸 때마다 +1). */
    poisonFirstStacks: 2,
    /** v27.48 화상: 3턴, 최대 3중첩. 걸릴 때마다 한 중첩씩 쌓고 지속을 갱신합니다. */
    burnTurns: 3,
    burnMaxStacks: 3,
    /** v3.54 처음 걸 때 화상 중첩(이후 걸 때마다 +1). */
    burnFirstStacks: 2,
    silenceTurns: 2,
    slowTurns: 3,
    hasteTurns: 3,
    slowMultiplier: .35,
    hasteMultiplier: .35,
    /** v3.151 부식(최상급 디버프): 지속 턴과, 걸린 동안 깎이는 물리 방어 · 마법 방어 · 속도 비율. */
    corrodeTurns: 3, corrodeDefense: .3, corrodeResist: .3, corrodeSpeed: .2,
    /** Extra hits are intentionally capped so one proc cannot create runaway loops. */
    maxExtraAttacks: 2,
    /** v3.151 각성기의 추가타 상한(일리움 그라비티 코어 5연타, 은월 파쇄 연권). */
    maxExtraAttacksAwaken: 4,
    /** v24.1 면역: 상태이상이 풀린 뒤 같은 상태이상에 걸리지 않는 턴(자기 행동 기준). */
    immuneTurns: { stun: 2, bleed: 1, poison: 1, burn: 1, weaken: 1, silence: 1, slow: 1, corrode: 1 },
    /** v24.1 초반 배율 제한: 1~2차(공용 포함)에서 피해와 함께 거는 상태이상별 최대 피해 배율. */
    earlyStatusMultiplierCap: { stun: 1.2, silence: 1.5 } as Partial<Record<string, number>>,
} as const;
export const STATUS_GUIDE = [
    { id: 'charge', name: '충전', kind: '중첩(자신)', description: '충전 기술이 명중할 때마다 쌓입니다(약화된 적이면 1 더). 전탄발사는 일정 중첩 이상에서만 나가고, 쓰면 중첩을 모두 소모해 중첩당 피해가 커집니다.', detail: '최대 8중첩. 전투가 끝나면 사라집니다.' },
    { id: 'stun', name: '기절', kind: '행동 차단', description: '다음 행동을 건너뜁니다.', detail: '기절 중에도 출혈 같은 지속 피해는 먼저 처리됩니다.' },
    { id: 'silence', name: '침묵', kind: '스킬 차단', description: '지속 중 액티브 스킬을 사용할 수 없습니다.', detail: '기본 공격은 계속하며, 쿨다운·마나를 낭비하지 않습니다.' },
    { id: 'weaken', name: '약화', kind: '피해 감소', description: `주는 직접 피해가 ${Math.round((1 - SKILL_FORMULA.weakenedDamage) * 100)}% 감소합니다.`, detail: '물리·마법 등 다음 공격의 피해 계산에 적용됩니다.' },
    { id: 'bleed', name: '출혈', kind: '지속 피해', description: `행동할 때마다 고정 피해를 받고, 출혈 중에는 받는 직접 피해가 ${Math.round(SKILL_FORMULA.bleedVulnerability * 100)}% 커집니다. 중첩되지 않습니다.`, detail: `명중한 공격의 위력 + 대상 현재 체력의 ${+(SKILL_FORMULA.bleedHpRatio * 100).toFixed(2)}%가 틱 피해가 되고 최대 ${STATUS_TUNING.bleedTurns}턴 지속됩니다. 체력이 큰 탱커일수록 아픕니다. 전투에서 처음 걸면 첫 틱을 바로 한 번 더 줍니다. 무리에게는 체력분을 한 마리 × √N으로 셉니다.` },
    { id: 'poison', name: '중독', kind: '지속 피해 · 중첩', description: `행동할 때마다 고정 피해를 받습니다. 걸릴 때마다 한 중첩씩 쌓여 틱 피해가 커집니다(최대 ${STATUS_TUNING.poisonMaxStacks}중첩, 포화 옵션으로 상한 증가).`, detail: `중첩당 (명중한 공격의 위력 × ${SKILL_FORMULA.poisonRatio}) + 대상 현재 체력의 ${+(SKILL_FORMULA.poisonHpRatio * 100).toFixed(2)}%가 틱 피해이고, 체력분도 중첩 수만큼 곱합니다. 다시 걸면 지속 ${STATUS_TUNING.poisonTurns}턴이 갱신됩니다. 출혈과 함께 걸릴 수 있습니다. 전투에서 처음 걸면 ${STATUS_TUNING.poisonFirstStacks}중첩으로 시작하고 첫 틱을 바로 한 번 더 줍니다. 무리에게는 체력분을 한 마리 × √N으로 셉니다.` },
    { id: 'burn', name: '화상', kind: '지속 피해 · 중첩', description: `행동할 때마다 고정 피해를 받고, 화상 중에는 받는 직접 피해가 ${Math.round(SKILL_FORMULA.burnVulnerability * 100)}% 커집니다. 걸릴 때마다 한 중첩씩 쌓입니다(최대 ${STATUS_TUNING.burnMaxStacks}중첩).`, detail: `중독과 출혈의 중간입니다. 중첩당 틱 = 위력 × ${SKILL_FORMULA.burnRatio} + 대상 현재 체력의 ${+(SKILL_FORMULA.burnHpRatio * 100).toFixed(2)}%, ${STATUS_TUNING.burnTurns}턴. 출혈·중독과 함께 걸립니다. 전투에서 처음 걸면 ${STATUS_TUNING.burnFirstStacks}중첩으로 시작하고 첫 틱을 바로 한 번 더 줍니다. 무리에게는 체력분을 한 마리 × √N으로 셉니다.` },
    { id: 'slow', name: '감속', kind: '속도 감소', description: `속도가 ${Math.round(STATUS_TUNING.slowMultiplier * 100)}% 낮아져 선공·명중 보정·연속 행동에 불리해집니다.`, detail: '선공은 다음 턴부터, 연속 행동 확률은 다음 판정부터 반영됩니다.' },
    { id: 'corrode', name: '부식', kind: '방어 · 속도 감소', description: `물리 방어와 마법 방어가 ${Math.round(STATUS_TUNING.corrodeDefense * 100)}%, 속도가 ${Math.round(STATUS_TUNING.corrodeSpeed * 100)}% 떨어집니다.`, detail: '약화(주는 피해 감소) · 감속과 따로 걸립니다. 일리움의 기본 공격과 연성 기술이 겁니다.' },
    { id: 'haste', name: '가속', kind: '속도 증가', description: `속도가 ${Math.round(STATUS_TUNING.hasteMultiplier * 100)}% 높아져 선공·명중 보정·연속 행동에 유리해집니다.`, detail: '상대보다 빨라지면 연속 행동 확률이 올라갑니다. 선공은 다음 턴부터, 연속 행동 확률은 다음 판정부터 반영됩니다.' },
] as const;
/**
 * v27.54 필요 경험치 보정.
 * - 환생 비례: 환생 1회마다 +perRebirth(20회까지), 이후 √(초과 횟수) × perRebirth. 환생 경험치 보너스(회당 +25%)가 요구치를 크게 앞질러 환생이 점점 빨라지던 것을 늦춥니다.
 * - 통곡의 벽: wallLevel부터 레벨마다 ×wallGrowth 복리(v27.77 1.10: Lv.80 약 ×2.9, Lv.100 약 ×19).
 */
/**
 * v27.77 한 생의 필요 경험치 배율. 목표: 첫 생 약 20시간, 환생 1~10회 6~8시간, 그 뒤 천천히 늘어 환생 100회 12~13시간(강한 유저가 난이도 0에서 시간당 1,200마리 기준).
 * base(첫 생 ×4) + 환생 1회당 +1(20회까지) + 그 뒤 1회당 +0.1 — 요구 레벨이 Lv.100에서 멈춘 뒤에도 계속 늘어납니다.
 * 통곡의 벽(Lv.70부터 레벨당 ×wallGrowth)은 1.10입니다(지수 복리: Lv.100 약 ×19. 1.25면 Lv.100까지 수백 시간).
 */
/**
 * v3.21 환생 20회 이후 필요 경험치가 거의 오르지 않아(회당 +0.1), 난이도 상한을 따라 마리당 경험치가 커지는 원킬 빌드의 한 생이
 * 환생할수록 짧아지던 것(환생 55회 0.3시간): 20회 이후 회당 +latePerRebirth로 올리고, 환생 50회·100회에 벽(rebirthWalls, 그 회차부터 곱함)을 둡니다.
 * 목표(원킬 빌드, 최대 난이도): 환생 50회 약 4.5시간 → 99회 약 5시간, 100회부터 하루에 한 번(약 20시간). 50회 미만은 원킬 폭증 구간으로 둡니다.
 */
export const XP_SCALING = { base: 4, perRebirth: 1, lateFrom: 20, latePerRebirth: .5, wallLevel: 70, wallGrowth: 1.1, rebirthWalls: [[50, 8.9], [100, 35]] as [number, number][] };
/** 환생 벽 배율: 지난 벽 중 가장 큰 값(50회부터 ×8.9, 100회부터 ×35). */
export const xpRebirthWall = (rebirths = 0) => XP_SCALING.rebirthWalls.reduce((m, [from, x]) => rebirths >= from ? x : m, 1);
export const xpRebirthFactor = (rebirths = 0) => (XP_SCALING.base + XP_SCALING.perRebirth * Math.min(XP_SCALING.lateFrom, rebirths) + XP_SCALING.latePerRebirth * Math.max(0, rebirths - XP_SCALING.lateFrom)) * xpRebirthWall(rebirths);
export const xpWallFactor = (level: number) => level >= XP_SCALING.wallLevel ? Math.pow(XP_SCALING.wallGrowth, level - XP_SCALING.wallLevel + 1) : 1;
/**
 * v3.23 환생 목표 레벨 너머의 벽: 목표 레벨에서 다음 레벨로 갈 때부터 필요 경험치에 레벨마다 ×growth(기본 1.6)를 복리로 곱합니다.
 * 목표 50이면 50→51 ×1.6, 54→55 ×10.5, 59→60 ×110. 순풍(목표까지 경험치 +)으로 빠르게 복구하고, 목표를 넘기면 숨이 막히게.
 * 목표 레벨은 환생 46회부터 Lv.100(최대)이라 그 뒤로는 이 벽이 걸리지 않습니다(환생 50·100회 벽이 맡음).
 */
export const OVER_TARGET = { growth: 1.6 };
export type XpTargetWall = { target: number; growth: number };
export const overTargetFactor = (level: number, wall?: XpTargetWall) => wall && level >= wall.target ? Math.pow(wall.growth, level - wall.target + 1) : 1;
export const xpNeeded = (level: number, rebirths = 0, wall?: XpTargetWall) => Math.floor(BALANCE.xpBase * Math.pow(BALANCE.xpGrowth, Math.min(29, level - 1)) * (level > 30 ? Math.pow(level / 30, 2.3) : 1) * xpRebirthFactor(rebirths) * xpWallFactor(level) * overTargetFactor(level, wall));
// v22: 등급 번호 = 붙는 옵션 수(0~6). 0~3은 기존 등급과 같은 이름·배율입니다.
export const RARITIES = [{ name: '일반', color: '#9dadaf', factor: 1 }, { name: '희귀', color: '#68b6ee', factor: 1.5 }, { name: '영웅', color: '#bf96ef', factor: 2.2 }, { name: '전설', color: '#e7be71', factor: 3.3 }, { name: '신화', color: '#f08a6c', factor: 3.9 }, { name: '고대', color: '#5fd0b5', factor: 4.5 }, { name: '태초', color: '#ff6fb5', factor: 5.2 }];
export const SLOTS = { rod: '무기', coat: '방어구', charm: '장신구', cape: '망토' };
/** 응급처치(공용 패시브): 처치 1회당 최대 체력 회복 비율. 무리 규모와 관계없이 한 번만 발동합니다. */

/** v26.6 주사위 배율 범위: 손가락 자르기 단계(trim)만큼 양 끝을 안쪽으로 좁힌 [최저, 최고]. */
export function diceRange(d: { low: number; high: number }, trim = 0) {
    const t = Math.max(0, Math.min(SKILL_FORMULA.diceTrimCap, trim)), span = d.high / d.low;
    return { low: d.low * span ** (SKILL_FORMULA.diceTrimLow * t), high: d.high / span ** (SKILL_FORMULA.diceTrimHigh * t) };
}
/** v26.6 가장 높은 눈(1~6)에 해당하는 피해 배율. 1→최저, 6→최고, 눈마다 같은 비율로 커집니다. */
export function diceMultiplier(d: { low: number; high: number }, face: number, trim = 0) {
    const r = diceRange(d, trim);
    return r.low * (r.high / r.low) ** ((Math.max(1, Math.min(6, face)) - 1) / 5);
}
