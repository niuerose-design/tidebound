/** 실전 누적 수련. SP는 기존 기본 성장에만 사용됩니다. */
// 6단계(+4%)를 30단계(+0.8%)로 분할. 최종 목표(+3,000만)와 총량(+24%)은 동일하며,
// 어느 숙련 수치에서도 이전 6단계보다 누적 보너스가 낮아지지 않습니다.
export const REFINEMENT_OFFSETS = [5000, 11000, 20000, 30000, 44000, 61000, 83000, 111000, 148000, 194000, 254000, 330000, 427000, 553000, 713000, 918000, 1181000, 1519000, 1950000, 2504000, 3212000, 4120000, 5283000, 6773000, 8682000, 11127000, 14260000, 18273000, 23414000, 30000000];
/** 연마 단계당 직접 피해 배율·양수 패시브 증가량 (합연산). */
export const REFINEMENT_STEP_BONUS = .008;
export const refinementBonusLabel = (ranks = 1) => `+${Math.round(ranks * REFINEMENT_STEP_BONUS * 1000) / 10}%`;
export const VOCATION_OFFSETS = [5000, 25000, 100000, 400000, 1500000, 5000000, 15000000];
export const refinementTargets = (base: number) => REFINEMENT_OFFSETS.map(n => base + n);
export const vocationTargets = (base: number) => VOCATION_OFFSETS.map(n => base + n);
export const thresholdRank = (practice: number, targets: number[]) => targets.filter(n => practice >= n).length;
// Early lives keep their original rewards. Later lives still help, but cannot
// make repeated low-level resets an exponentially accelerating pearl faucet.
export const rebirthExperience = (count: number) => .25 * (Math.min(20, count) + Math.sqrt(Math.max(0, count - 20)));
export const rebirthMemory = (count: number) => 1 + .025 * Math.sqrt(Math.max(0, count));
export const evasionRating = (raw: number) => raw <= .5 ? Math.max(0, raw) : .5 + .4 * (raw - .5) / (.4 + raw - .5);

// 무한 심연: 깊을수록 한 층의 가치가 커집니다. 5의 배수 층은 3배.
export const abyssPearls = (depth: number) => (1 + Math.floor(depth / 10)) * (depth % 5 === 0 ? 3 : 1);
/** 처음 돌파할 때 SP 1을 주는 깊이. SP는 극히 드문 자원이므로 이정표 수를 적게 유지합니다. */
export const ABYSS_SP_MILESTONES = [10, 25, 50, 100];
export const nextAbyssMilestone = (best: number) => ABYSS_SP_MILESTONES.find(n => n > best);

/** v25.8 해역 난이도 이정표: 낚시터마다 이 차수에서 처음 포획하면 진주를 줍니다. */
export const TIDE_MILESTONES = [5, 10, 20, 30, 50];
export const TIDE_MILESTONE_PEARLS = [1, 2, 4, 7, 12];
export const nextTideMilestone = (best: number) => TIDE_MILESTONES.find(n => n > best);
/** v25.8 무한 심연 10층마다 첫 돌파 보너스 진주(층 수만큼)와 장착 AP +1 이정표. */
export const abyssFloorBonus = (depth: number) => depth % 10 === 0 ? depth : 0;
export const ABYSS_AP_MILESTONES = [30, 60, 90];
export const abyssAP = (s: { abyssMilestones?: number[] }) => (s.abyssMilestones || []).filter(d => ABYSS_AP_MILESTONES.includes(d)).length;
