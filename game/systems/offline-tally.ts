/**
 * v3.104 부재중 정산 표본 환산(offline-sample.ts)이 표본 구간에서 따로 세는 값. 다른 모듈을 가져오지 않아 순환 import가 생기지 않습니다.
 *   - oneTimeRewards: 비례로 늘리면 안 되는 일회성 보상(일일 · 주간 목표, 모험 안내 단계). 비례 환산에서 뺍니다.
 *   - 희귀 출현 판정 수: onyxRolls(칠흑, 무리 서식지 출현마다) · specialRolls(까미 · 누리, 사냥터 · 무리 서식지 출현마다) · variantRolls(변종 판정, 별빛 개체용).
 *     남은 시간의 판정 수를 이 비율로 정해 실제 확률로 굴리고, 나온 희귀 몬스터는 실제로 싸웁니다.
 */
export const oneTimeRewards = { pearls: 0, sp: 0, essence: 0 };
export const offlineTally = { onyxRolls: 0, specialRolls: 0, variantRolls: 0 };
export function noteOneTimeReward(r: { pearls?: number; sp?: number; essence?: number }) {
    oneTimeRewards.pearls += r.pearls || 0; oneTimeRewards.sp += r.sp || 0; oneTimeRewards.essence += r.essence || 0;
}
export function resetOfflineTally() { oneTimeRewards.pearls = 0; oneTimeRewards.sp = 0; oneTimeRewards.essence = 0; offlineTally.onyxRolls = 0; offlineTally.specialRolls = 0; offlineTally.variantRolls = 0; }
