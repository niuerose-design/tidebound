/**
 * v27.22 숙련의 까미: 모든 사냥터에서 아주 드물게 나오는 특별 몬스터. 잡으면 현재 직업과 장착 스킬의 숙련이 로또처럼 오릅니다.
 * 사냥터 몬스터 목록·지역 연구·변종과는 별개(별도 도감)이고, 던전에서는 나오지 않습니다.
 */
export const MIMIC = {
    id: 'masteryMimic',
    /** 출현마다 까미가 나올 확률(사냥터 난이도 5 이상, Lv.10 이상, 누적 처치 100마리 이상). 사냥터 난이도 1단계마다 chancePerTier만큼 더합니다. */
    chance: .0015,
    chancePerTier: .0005,
    /** 사냥터 순서(0부터)마다 등장 확률 배율 +stageStep. 낮은 사냥터는 빨리 많이 잡고, 높은 사냥터는 한 번의 확률이 높습니다. */
    stageStep: .25,
    /** 오프라인 정산(1분 넘게 쌓인 틱을 한꺼번에 돌릴 때) 중 등장 확률 배율. */
    offlineScale: .25,
    minLevel: 10,
    minKills: 100,
    /** v27.59 사냥터 난이도 이 값 이상에서만 등장(확률은 그대로). */
    minTier: 5,
    /** 체력·공격 배율: 그 사냥터에서 가장 강한 몬스터 기준. */
    hp: 2.5, attack: .6,
    /** 숙련 로또: 앞에서부터 확률을 더해 판정합니다. */
    tiers: [
        { mastery: 1000, chance: .70, label: '소' },
        { mastery: 10000, chance: .25, label: '중' },
        { mastery: 100000, chance: .05, label: '대' },
    ],
} as const;
/** 까미 로또 판정: 한 번의 난수로 등급을 고릅니다. */
export function rollMimicMastery(rng: () => number) {
    let roll = rng();
    for (const t of MIMIC.tiers) { roll -= t.chance; if (roll < 0) return t; }
    return MIMIC.tiers[MIMIC.tiers.length - 1];
}
/** 등장 확률 = (기본 + 사냥터 난이도 × 단계당) × (1 + 사냥터 순서 × stageStep). 예: 난이도 10, 열 번째 사냥터 → 0.65% × 3.25 ≈ 2.1%. */
export const mimicChance = (tier: number, stageIndex = 0) => (MIMIC.chance + tier * MIMIC.chancePerTier) * (1 + stageIndex * MIMIC.stageStep);
export const mimicStageMultiplier = (stageIndex: number) => 1 + stageIndex * MIMIC.stageStep;
