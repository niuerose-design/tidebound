/**
 * v27.22 숙련의 까미: 모든 사냥터에서 아주 드물게 나오는 특별 몬스터. 잡으면 현재 직업과 장착 스킬의 숙련이 로또처럼 오릅니다.
 * 사냥터 몬스터 목록·지역 연구·변종과는 별개(별도 도감)이고, 던전에서는 나오지 않습니다.
 */
import { STAGES } from './world';
import { ODDS } from './odds';

export const MIMIC = {
    id: 'masteryMimic',
    /** 출현마다 까미가 나올 확률(사냥터 난이도 5 이상, Lv.10 이상, 누적 처치 100마리 이상) · 난이도당 · 사냥터 순서당 배율. v3.52 값은 서버 전용(odds). */
    get chance() { return ODDS.mimic.chance; },
    get chancePerTier() { return ODDS.mimic.perTier; },
    get stageStep() { return ODDS.mimic.stageStep; },
    /** v3.31 까미 확률 상한: 난이도 항은 tierCap에서, 사냥터 항은 stageCap 사냥터(환생 20회에 열리는 리프레 · 용의 둥지)에서 멈춥니다.
     * 환생 20회 단계에서 확률이 최대가 되어, 그 위의 숙련 속도는 환생 횟수가 아니라 승천이 맡습니다(docs/balance-rebirth.md 6.5). */
    tierCap: 20, stageCap: 'dragonNest',
    /** 오프라인 정산(1분 넘게 쌓인 틱을 한꺼번에 돌릴 때) 중 등장 확률 배율. */
    /** v3.189 숙련의 대부분(약 98%)이 까미에서 나오므로, 부재중 숙련이 접속 중의 약 절반(51%)이 되는 값. */
    offlineScale: .5,
    minLevel: 10,
    minKills: 100,
    /** v27.59 사냥터 난이도 이 값 이상에서만 등장(확률은 그대로). */
    minTier: 5,
    /** 체력·공격 배율: 그 사냥터에서 가장 강한 몬스터 기준. */
    hp: 2.5, attack: .6,
    /** 숙련 로또: 앞에서부터 확률을 더해 판정합니다. v3.52 당첨 확률은 서버 전용(odds). */
    tiers: [
        { mastery: 1000, get chance() { return ODDS.mimic.tiers[0]; }, label: '소' },
        { mastery: 10000, get chance() { return ODDS.mimic.tiers[1]; }, label: '중' },
        { mastery: 100000, get chance() { return ODDS.mimic.tiers[2]; }, label: '대' },
    ],
} as const;
/** v3.31 행운의 편지 6~10단계(승천 후) 기능. */
/** v3.160 호루라기: SP를 내고 다음 사냥터 출현을 숙련의 까미 · 경험의 누리로 정합니다(하루 perDay개, 던전 · 랜덤게임 제외). docs/currency-rank-review.md 1.4절. */
export const WHISTLE = { sp: 5, perDay: 3 } as const;
export const LETTER = { offlineRank: 6, /** v3.189 기본 부재중 배율(.5)보다 완화. */ offlineScale: .75, jackpotRank: 8, /** v3.52 값은 서버 전용(odds). */ get jackpotChance() { return ODDS.mimic.letterJackpot; }, recipientRank: 10, recipientShare: .01 } as const;
type LetterState = { permanent?: Record<string, number> };
export const letterRank = (s?: LetterState) => s?.permanent?.messageBottle || 0;
/** 까미 로또 표. 행운의 편지 8단계부터 ‘대’ 당첨 확률이 오릅니다(늘어난 몫은 ‘소’에서 뺌). */
export const mimicTiers = (s?: LetterState) => {
    if (letterRank(s) < LETTER.jackpotRank) return MIMIC.tiers;
    const extra = LETTER.jackpotChance - MIMIC.tiers[2].chance;
    return [{ ...MIMIC.tiers[0], chance: MIMIC.tiers[0].chance - extra }, MIMIC.tiers[1], { ...MIMIC.tiers[2], chance: LETTER.jackpotChance }];
};
/** 부재중 정산 중 까미·누리·슬라임 등장 확률 배율. 기본 ×0.5, 행운의 편지 6단계부터 ×0.75. */
export const specialOfflineScale = (s: LetterState | undefined, base: number) => letterRank(s) >= LETTER.offlineRank ? Math.max(base, LETTER.offlineScale) : base;
/** 까미 로또 판정: 한 번의 난수로 등급을 고릅니다. */
export function rollMimicMastery(rng: () => number, s?: LetterState) {
    const tiers = mimicTiers(s);
    let roll = rng();
    for (const t of tiers) { roll -= t.chance; if (roll < 0) return t; }
    return tiers[tiers.length - 1];
}
/** 사냥터 순서 상한(용의 둥지의 순서). */
export const MIMIC_STAGE_CAP_INDEX = Math.max(0, STAGES.findIndex(x => x.id === MIMIC.stageCap));
/** 확률에 쓰는 난이도(상한 적용). */
export const mimicTier = (tier: number) => Math.max(0, Math.min(MIMIC.tierCap, tier));
/** 등장 확률 = (기본 + 사냥터 난이도 × 단계당) × (1 + 사냥터 순서 × stageStep). 난이도는 20, 사냥터 순서는 용의 둥지에서 멈춥니다.
 * 예: 난이도 10, 열 번째 사냥터 → 0.65% × 3.25 ≈ 2.1%. 최대(난이도 20 · 용의 둥지) ≈ 4.3%. */
export const mimicChance = (tier: number, stageIndex = 0) => (MIMIC.chance + mimicTier(tier) * MIMIC.chancePerTier) * mimicStageMultiplier(stageIndex);
export const mimicStageMultiplier = (stageIndex: number) => 1 + Math.min(Math.max(0, stageIndex), MIMIC_STAGE_CAP_INDEX) * MIMIC.stageStep;
/** v27.60 행운의 편지(세계석 연구 id messageBottle): 까미·경험의 누리 등장 확률 배율. 단계마다 +15%. */
export const LUCKY_LETTER_PER_RANK = .15;
export const specialLuck = (s: { permanent?: Record<string, number> }) => 1 + (s.permanent?.messageBottle || 0) * LUCKY_LETTER_PER_RANK;
