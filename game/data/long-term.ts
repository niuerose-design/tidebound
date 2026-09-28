/** 실전 누적 수련. SP는 기존 기본 성장에만 사용됩니다. */
export const REFINEMENT_OFFSETS = [50000, 250000, 1000000, 4000000, 12000000, 30000000];
export const VOCATION_OFFSETS = [5000, 25000, 100000, 400000, 1500000, 5000000, 15000000];
export const refinementTargets = (base: number) => REFINEMENT_OFFSETS.map(n => base + n);
export const vocationTargets = (base: number) => VOCATION_OFFSETS.map(n => base + n);
export const thresholdRank = (practice: number, targets: number[]) => targets.filter(n => practice >= n).length;
// Early lives keep their original rewards. Later lives still help, but cannot
// make repeated low-level resets an exponentially accelerating pearl faucet.
export const rebirthExperience = (count: number) => .25 * (Math.min(20, count) + Math.sqrt(Math.max(0, count - 20)));
export const rebirthMemory = (count: number) => 1 + .025 * Math.sqrt(Math.max(0, count));
export const evasionRating = (raw: number) => raw <= .5 ? Math.max(0, raw) : .5 + .4 * (raw - .5) / (.4 + raw - .5);
