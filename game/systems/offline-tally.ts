/**
 * v3.104 부재중 정산 표본 환산(offline-sample.ts)이 표본 구간에서 따로 세는 값. 다른 모듈을 가져오지 않아 순환 import가 생기지 않습니다.
 *   - oneTimeRewards: 비례로 늘리면 안 되는 보상(일일 · 주간 목표, 모험 안내 단계, 칠흑 보스 중복 세계석 — 칠흑은 남은 시간에 따로 실제로 싸움). 비례 환산에서 뺍니다.
 *   - onyxRolls: 칠흑 보스 출현 판정 수(무리 서식지 출현마다 한 번). 남은 시간의 판정 수를 이 비율로 정해 실제로 굴립니다.
 */
export const oneTimeRewards = { pearls: 0, sp: 0, essence: 0 };
export const offlineTally = { onyxRolls: 0 };
export function noteOneTimeReward(r: { pearls?: number; sp?: number; essence?: number }) {
    oneTimeRewards.pearls += r.pearls || 0; oneTimeRewards.sp += r.sp || 0; oneTimeRewards.essence += r.essence || 0;
}
export function resetOfflineTally() { oneTimeRewards.pearls = 0; oneTimeRewards.sp = 0; oneTimeRewards.essence = 0; offlineTally.onyxRolls = 0; }
