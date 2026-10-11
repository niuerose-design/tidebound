/**
 * v27.58 경험의 누리: 고레벨 사냥터에서 아주 드물게 나오는 특별 몬스터. 잡으면 지금 레벨에 필요한 경험치의 1~3%를 한 번에 줍니다.
 * 통곡의 벽(Lv.70~) 이후 레벨업이 처치 수천 번씩 걸리는 고레벨 모험가를 돕는 몬스터라, 보상이 처치 경험치가 아니라 레벨 필요량 비율입니다.
 * 숙련의 까미처럼 사냥터 몬스터 목록·지역 연구·변종과는 별개(별도 도감)이고, 던전에서는 나오지 않습니다.
 * 출현 판정은 까미와 같은 난수 하나를 나눠 씁니다(까미 구간 바로 뒤). 난수 사용 횟수가 늘지 않아 다른 판정에 영향이 없습니다.
 */
import { ODDS } from './odds';
export const EXP_NURI = {
    id: 'expNuri',
    /** 출현마다 누리가 나올 확률(사냥터 난이도 10 이상, Lv.50 이상, 누적 처치 1,000마리 이상) · 난이도당. v3.52 값은 서버 전용(odds). 사냥터 난이도 1단계마다 chancePerTier만큼 더합니다. */
    get chance() { return ODDS.nuri.chance; },
    get chancePerTier() { return ODDS.nuri.perTier; },
    /** 오프라인 정산 중 등장 확률 배율(까미와 같음). */
    offlineScale: .5,
    minLevel: 50,
    minKills: 1000,
    /** v27.59 사냥터 난이도 이 값 이상에서만 등장(확률은 그대로). */
    minTier: 10,
    /** v3.290 확률의 난이도 몫은 이 난이도에서 멈춥니다(까미 MIMIC.tierCap처럼). 높은 난이도에서 출현 보너스를 겹치면 출현의 40%가 누리가 되던 것. */
    tierCap: 40,
    /** 체력·공격 배율: 그 사냥터에서 가장 강한 몬스터 기준. 오래 버티지만 거의 아프지 않습니다. */
    hp: 3, attack: .4,
    /** v3.112 사냥터 출현 몫: 레벨 % 대신 ‘지금 사냥터 평균 출현 경험치 × pct × 이 값’이 더 크면 그쪽(1%당 10회분, 소 · 중 · 대 = 10 · 20 · 30회분). Lv.100부터는 이 몫만. */
    encountersPerPct: 1000,
    /** 경험치 로또: 현재 레벨 필요 경험치의 pct. 앞에서부터 확률을 더해 판정합니다(당첨 확률은 서버 전용). */
    tiers: [
        { pct: .01, get chance() { return ODDS.nuri.tiers[0]; }, label: '소' },
        { pct: .02, get chance() { return ODDS.nuri.tiers[1]; }, label: '중' },
        { pct: .03, get chance() { return ODDS.nuri.tiers[2]; }, label: '대' },
    ],
} as const;
/** 누리 로또 판정: 한 번의 난수로 등급을 고릅니다. */
export function rollNuriTier(rng: () => number) {
    let roll = rng();
    for (const t of EXP_NURI.tiers) { roll -= t.chance; if (roll < 0) return t; }
    return EXP_NURI.tiers[EXP_NURI.tiers.length - 1];
}
/** v3.221 누리 추적자의 하얀 발자국이 노리는 몬스터: 경험의 누리와 대왕 누리(data/king.ts KING.nuri.id). */
export const NURI_IDS: ReadonlySet<string> = new Set([EXP_NURI.id, 'kingNuri']);
/** v3.221 하얀 발자국 표식: 경험치 로또를 한 단계 위로(이미 ‘대’면 그대로). */
export function upgradeNuriTier(t: (typeof EXP_NURI.tiers)[number]) { const i = EXP_NURI.tiers.findIndex(x => x.pct === t.pct); return EXP_NURI.tiers[Math.min(EXP_NURI.tiers.length - 1, i + 1)]; }
/** 등장 확률 = 기본 + 사냥터 난이도(v3.290 tierCap까지) × 단계당. */
export const nuriChance = (tier: number) => EXP_NURI.chance + Math.max(0, Math.min(EXP_NURI.tierCap, tier)) * EXP_NURI.chancePerTier;
/** 누리가 나올 수 있는지(사냥터 난이도·레벨·누적 처치). */
/** v3.112 Lv.100 이상도 나옵니다(보상은 사냥터 출현 몫). */
export const nuriEligible = (s: { level: number; kills: number }, tier: number) => tier >= EXP_NURI.minTier && s.level >= EXP_NURI.minLevel && s.kills >= EXP_NURI.minKills;
