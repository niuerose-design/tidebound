/**
 * v27.22 숙련의 미믹: 모든 낚시터에서 아주 드물게 나오는 특별 어종. 잡으면 현재 직업과 장착 스킬의 숙련이 로또처럼 오릅니다.
 * 낚시터 어종 목록·지역 연구·변종과는 별개(별도 도감)이고, 던전에서는 나오지 않습니다.
 */
export const MIMIC = {
    id: 'masteryMimic',
    /** 입질마다 미믹이 나올 확률(낚시터, Lv.10 이상, 누적 포획 100마리 이상). */
    chance: .0015,
    minLevel: 10,
    minKills: 100,
    /** 체력·공격 배율: 그 낚시터에서 가장 강한 어종 기준. */
    hp: 2.5, attack: .6,
    /** 숙련 로또: 앞에서부터 확률을 더해 판정합니다. */
    tiers: [
        { mastery: 1000, chance: .70, label: '소' },
        { mastery: 10000, chance: .25, label: '중' },
        { mastery: 100000, chance: .05, label: '대' },
    ],
} as const;
/** 미믹 로또 판정: 한 번의 난수로 등급을 고릅니다. */
export function rollMimicMastery(rng: () => number) {
    let roll = rng();
    for (const t of MIMIC.tiers) { roll -= t.chance; if (roll < 0) return t; }
    return MIMIC.tiers[MIMIC.tiers.length - 1];
}
