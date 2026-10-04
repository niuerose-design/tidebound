/**
 * v27.58 경험의 누리: 고레벨 사냥터에서 아주 드물게 나오는 특별 몬스터. 잡으면 지금 레벨에 필요한 경험치의 1~3%를 한 번에 줍니다.
 * 통곡의 벽(Lv.70~) 이후 레벨업이 처치 수천 번씩 걸리는 고레벨 모험가를 돕는 몬스터라, 보상이 처치 경험치가 아니라 레벨 필요량 비율입니다.
 * 숙련의 까미처럼 사냥터 몬스터 목록·지역 연구·변종과는 별개(별도 도감)이고, 던전에서는 나오지 않습니다.
 * 출현 판정은 까미와 같은 난수 하나를 나눠 씁니다(까미 구간 바로 뒤). 난수 사용 횟수가 늘지 않아 다른 판정에 영향이 없습니다.
 */
export const EXP_NURI = {
    id: 'expNuri',
    /** 출현마다 누리가 나올 확률(사냥터, Lv.50 이상, 누적 처치 1,000마리 이상, Lv.100 미만). 사냥터 난이도 1단계마다 chancePerTier만큼 더합니다. */
    chance: .0015,
    chancePerTier: .0001,
    /** 오프라인 정산 중 등장 확률 배율(까미와 같음). */
    offlineScale: .25,
    minLevel: 50,
    minKills: 1000,
    /** 체력·공격 배율: 그 사냥터에서 가장 강한 몬스터 기준. 오래 버티지만 거의 아프지 않습니다. */
    hp: 3, attack: .4,
    /** 경험치 로또: 현재 레벨 필요 경험치의 pct. 앞에서부터 확률을 더해 판정합니다. 기댓값 약 1.35%. */
    tiers: [
        { pct: .01, chance: .70, label: '소' },
        { pct: .02, chance: .25, label: '중' },
        { pct: .03, chance: .05, label: '대' },
    ],
} as const;
/** 누리 로또 판정: 한 번의 난수로 등급을 고릅니다. */
export function rollNuriTier(rng: () => number) {
    let roll = rng();
    for (const t of EXP_NURI.tiers) { roll -= t.chance; if (roll < 0) return t; }
    return EXP_NURI.tiers[EXP_NURI.tiers.length - 1];
}
/** 등장 확률 = 기본 + 사냥터 난이도 × 단계당. 예: 난이도 10 → 0.25%. */
export const nuriChance = (tier: number) => EXP_NURI.chance + tier * EXP_NURI.chancePerTier;
/** 누리가 나올 수 있는 모험가인지(레벨·누적 처치). */
export const nuriEligible = (s: { level: number; kills: number }) => s.level >= EXP_NURI.minLevel && s.level < 100 && s.kills >= EXP_NURI.minKills;
