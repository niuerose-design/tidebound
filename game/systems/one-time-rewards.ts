/**
 * v3.104 일회성 보상(일일 · 주간 목표, 모험 안내 단계) 합계. 부재중 정산 표본 환산(offline-sample.ts)이
 * 표본 구간에 받은 일회성 보상을 비례 환산에서 빼려고 셉니다(다른 모듈을 가져오지 않아 순환 import가 생기지 않음).
 */
export const oneTimeRewards = { pearls: 0, sp: 0, essence: 0 };
export function noteOneTimeReward(r: { pearls?: number; sp?: number; essence?: number }) {
    oneTimeRewards.pearls += r.pearls || 0; oneTimeRewards.sp += r.sp || 0; oneTimeRewards.essence += r.essence || 0;
}
export function resetOneTimeRewards() { oneTimeRewards.pearls = 0; oneTimeRewards.sp = 0; oneTimeRewards.essence = 0; }
