import type { Item } from '../types';

/**
 * v27.93 스타포스 강화(메이플스토리 2024 규칙을 참고). 성 수가 곧 강화 단계입니다.
 * - 성공률은 성마다 정해져 있고(0→1 95% … 15성부터 30%), 실패하면 10성부터는 1성 하락(15·20성은 안전 구간이라 유지), 15성부터는 파괴 확률이 붙습니다.
 * - 찬스 타임: 하락이 2번 연속이면 다음 시도는 100% 성공. 파괴 방지: 15·16성에서 비용 2배로 파괴를 막습니다.
 * - 파괴된 일반 장비는 사라지고(환급 없음), 유물은 파괴 대신 12성으로 돌아갑니다.
 * - 능력치: 1~15성 +10%/성(전과 같음), 16~22성 +15%/성 → 22성 ×3.55. 비용: 12성까지 전과 같고 13성부터 성마다 ×growth.
 * - 상한: 전설 이상 22성, 영웅 이하 15성.
 * 기대 비용(Lv.80 태초, 시간당 골드 1천만 기준): 12→17성 약 12시간, 12→20성 약 150시간, 12→22성 약 300시간(scripts: scratch star-cal).
 */
export const STARFORCE = {
    max: 22, maxLow: 15,
    /** v3.8 스타캐치: 수동 강화 때 좌우로 오가는 별을 가운데에서 잡으면 성공률 +catchBonus(%p). 자동 강화에는 없습니다. */
    catchBonus: .1,
    success: [.95, .9, .85, .85, .8, .75, .7, .65, .6, .55, .5, .45, .4, .35, .3, .3, .3, .3, .3, .3, .3, .3],
    dropFrom: 10, safeStars: [15, 20],
    destroy: { 15: .021, 16: .021, 17: .021, 18: .028, 19: .028, 20: .07, 21: .07 } as Record<number, number>,
    chanceTimeFails: 2, safeguardStars: [15, 16], safeguardCost: 2,
    growth: 1.25, growthFrom: 12, gainLow: .1, gainHigh: .15, gainHighFrom: 15, relicResetStar: 12,
    /** v3.80 환생해도 남는 장비(유물 · 계승 · 칠흑)의 강화 비용 × (1 + 환생 × permanentPerRebirth). 환생 60 계승 태초 0→22성 기대 약 460억. 일반 장비는 그대로. */
    permanentPerRebirth: .21,
} as const;
export const starMax = (rarity: number) => rarity >= 3 ? STARFORCE.max : STARFORCE.maxLow;
/** n성에서 n+1성 시도 성공률. */
export const starSuccess = (n: number) => STARFORCE.success[Math.min(n, STARFORCE.success.length - 1)] ?? .3;
/** n성에서 실패하면 1성 하락하는지(10성부터, 15·20성은 유지). */
export const starDrops = (n: number) => n >= STARFORCE.dropFrom && !(STARFORCE.safeStars as readonly number[]).includes(n);
/** n성에서 파괴 확률(15성부터). 파괴 방지를 켜면 0. */
export const starDestroy = (n: number, safeguard = false) => safeguard && canSafeguard(n) ? 0 : STARFORCE.destroy[n] ?? 0;
export const canSafeguard = (n: number) => (STARFORCE.safeguardStars as readonly number[]).includes(n);
/** 성 수에 따른 기본 수치 배율: 1~15성 +10%, 16성부터 +15%. */
export const starMultiplier = (n: number) => 1 + STARFORCE.gainLow * Math.min(n, STARFORCE.gainHighFrom) + STARFORCE.gainHigh * Math.max(0, n - STARFORCE.gainHighFrom);
/** 찬스 타임(하락 2번 연속 뒤)인지. */
export const chanceTime = (item: Pick<Item, 'starFails'>) => (item.starFails || 0) >= STARFORCE.chanceTimeFails;
/** 별 수 표기: ★12. 0이면 빈 문자열(always면 ★0). */
export const starLabel = (n: number, always = false) => n > 0 || always ? `★${n}` : '';
