/**
 * v3.161 정수의 슬라임: 사냥터에서 아주 드물게 나오는 특별 몬스터. 잡으면 정수를 로또처럼 줍니다(소 · 중 · 대).
 * 보상은 그 사냥터 난이도의 ‘정수 묶음’(1 + ⌊난이도 ÷ bundleTiers⌋, 난이도 정수 드롭 한 번의 양과 같은 식) × 등급 배수라 환생 · 난이도가 오를수록 함께 커집니다.
 * 숙련의 까미 · 경험의 누리처럼 사냥터 몬스터 목록 · 지역 연구 · 변종과는 별개(특별 도감)이고, 던전에서는 나오지 않습니다.
 * 출현 판정은 까미 · 누리와 같은 난수 하나를 나눠 씁니다(누리 구간 바로 뒤). 난수 사용 횟수가 늘지 않아 다른 판정에 영향이 없습니다.
 */
import { ODDS } from './odds';
export const ESSENCE_SLIME = {
    id: 'essenceSlime',
    /** 출현마다 슬라임이 나올 확률(사냥터 난이도 10 이상, Lv.30 이상, 누적 처치 500마리 이상) · 난이도당. 값은 서버 전용(odds). */
    get chance() { return ODDS.slime.chance; },
    get chancePerTier() { return ODDS.slime.perTier; },
    /** 오프라인 정산 중 등장 확률 배율(까미 · 누리와 같음). */
    offlineScale: .5,
    minLevel: 30,
    minKills: 500,
    /** 사냥터 난이도 이 값 이상에서만 등장(확률은 그대로). 승천하면 난이도 조건이 사라집니다(까미 · 누리와 같음). */
    minTier: 10,
    /** v3.290 확률의 난이도 몫은 이 난이도에서 멈춥니다(누리와 같음). 정수 묶음(slimeBundle)은 그대로 난이도를 따라 커집니다. */
    tierCap: 40,
    /** 체력 · 공격 배율: 그 사냥터에서 가장 강한 몬스터 기준. 말랑하지만 질깁니다. */
    hp: 2, attack: .5,
    /** 정수 묶음 = 1 + ⌊난이도 ÷ bundleTiers⌋ (난이도 100 → 11, 200 → 21). */
    bundleTiers: 10,
    /** 정수 로또: 묶음 × 배수. 앞에서부터 확률을 더해 판정합니다(당첨 확률은 서버 전용). 기댓값 묶음 × 6.6. */
    tiers: [
        { mul: 3, get chance() { return ODDS.slime.tiers[0]; }, label: '소' },
        { mul: 10, get chance() { return ODDS.slime.tiers[1]; }, label: '중' },
        { mul: 40, get chance() { return ODDS.slime.tiers[2]; }, label: '대' },
    ],
} as const;
/** 슬라임 로또 판정: 한 번의 난수로 등급을 고릅니다. */
export function rollSlimeTier(rng: () => number) {
    let roll = rng();
    for (const t of ESSENCE_SLIME.tiers) { roll -= t.chance; if (roll < 0) return t; }
    return ESSENCE_SLIME.tiers[ESSENCE_SLIME.tiers.length - 1];
}
/** 그 난이도의 정수 묶음(보상 단위). */
export const slimeBundle = (tier: number) => 1 + Math.floor(Math.max(0, tier) / ESSENCE_SLIME.bundleTiers);
/** 등장 확률 = 기본 + 사냥터 난이도(v3.290 tierCap까지) × 단계당. */
export const slimeChance = (tier: number) => ESSENCE_SLIME.chance + Math.max(0, Math.min(ESSENCE_SLIME.tierCap, tier)) * ESSENCE_SLIME.chancePerTier;
/** 슬라임이 나올 수 있는지(사냥터 난이도 · 레벨 · 누적 처치). */
export const slimeEligible = (s: { level: number; kills: number }, tier: number) => tier >= ESSENCE_SLIME.minTier && s.level >= ESSENCE_SLIME.minLevel && s.kills >= ESSENCE_SLIME.minKills;
