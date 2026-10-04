import type { State } from '../types';

/**
 * v27.79 계급장: 처치한 마릿수로만 오르는 별도 레벨. 환생·분신과 무관하게 캐릭터에 쌓입니다.
 * 이등병 → 중장 16번 진급. 다음 계급까지 필요한 처치 수는 일병 5,000에서 단계마다 약 ×1.38로 늘어 중장까지 합계 약 226만 마리
 * (무리 없이 시간당 500마리를 24시간 돌려도 약 190일, 평균적인 사냥으로는 1~2년). 진급마다 진급 포인트를 주고 포인트는 언제든 무료로 초기화합니다.
 */
export type RankDef = { id: string; name: string; /** 이전 계급에서 이 계급까지 필요한 처치 수 */ need: number; /** 이 계급에 오를 때 받는 진급 포인트 */ points: number; group: '병' | '부사관' | '장교' | '장성' };
export const RANKS: RankDef[] = [
    { id: 'pvt2', name: '이등병', need: 0, points: 0, group: '병' },
    { id: 'pvt1', name: '일병', need: 5_000, points: 1, group: '병' },
    { id: 'cpl', name: '상병', need: 6_900, points: 1, group: '병' },
    { id: 'sgt', name: '병장', need: 9_500, points: 1, group: '병' },
    { id: 'ssg', name: '하사', need: 13_100, points: 2, group: '부사관' },
    { id: 'sfc', name: '중사', need: 18_100, points: 2, group: '부사관' },
    { id: 'msg', name: '상사', need: 25_000, points: 2, group: '부사관' },
    { id: 'smaj', name: '원사', need: 34_500, points: 2, group: '부사관' },
    { id: 'lt2', name: '소위', need: 47_600, points: 3, group: '장교' },
    { id: 'lt1', name: '중위', need: 65_700, points: 3, group: '장교' },
    { id: 'cpt', name: '대위', need: 90_700, points: 3, group: '장교' },
    { id: 'maj', name: '소령', need: 125_000, points: 3, group: '장교' },
    { id: 'ltc', name: '중령', need: 173_000, points: 3, group: '장교' },
    { id: 'col', name: '대령', need: 238_000, points: 3, group: '장교' },
    { id: 'bg', name: '준장', need: 329_000, points: 4, group: '장성' },
    { id: 'mg', name: '소장', need: 454_000, points: 4, group: '장성' },
    { id: 'ltg', name: '중장', need: 626_000, points: 4, group: '장성' },
];
/** 계급 i에 오르기까지 누적 필요 처치 수. */
export const RANK_CUMULATIVE: number[] = RANKS.reduce<number[]>((acc, r, i) => { acc.push((acc[i - 1] || 0) + r.need); return acc; }, []);
export const RANK_TOTAL_POINTS = RANKS.reduce((a, r) => a + r.points, 0);

/** 진급 포인트로 사는 특전. cost는 단계마다 같은 값이고 max까지 올립니다. 합계 비용(47)이 총 포인트(41)보다 커 선택이 필요합니다. */
export type RankPerkDef = { id: RankPerkId; name: string; desc: (level: number) => string; max: number; cost: number; per: number };
export type RankPerkId = 'tally' | 'drill' | 'medal' | 'supply';
export const RANK_PERKS: RankPerkDef[] = [
    { id: 'tally', name: '전과 기록', desc: l => `처치 1마리를 계급 경험치 ${1 + l}마리로 셉니다(무리는 마릿수만큼)`, max: 5, cost: 2, per: 1 },
    { id: 'drill', name: '숙련 훈련', desc: l => `처치 숙련 기본 획득 +${l}(직업·장착 스킬 모두, 배율과 무관한 고정값)`, max: 3, cost: 4, per: 1 },
    { id: 'medal', name: '전공 훈장', desc: l => `사냥터 처치마다 ${(l * .1).toFixed(1)}% 확률로 SP +1`, max: 5, cost: 3, per: .001 },
    { id: 'supply', name: '보급품', desc: l => `사냥터 처치마다 ${(l * .1).toFixed(1)}% 확률로 세계석 +1`, max: 10, cost: 1, per: .001 },
];
export type RankState = { /** 계급 경험치(세어진 처치 수) */ exp: number; perks: Partial<Record<RankPerkId, number>> };
export type RankSource = Pick<State, 'rank' | 'kills'>;

export const rankState = (s: RankSource): RankState => s.rank ?? { exp: s.kills || 0, perks: {} };
/** 지금 계급 번호(0 = 이등병). */
export function rankIndex(exp: number) { let i = 0; while (i + 1 < RANKS.length && exp >= RANK_CUMULATIVE[i + 1]) i++; return i; }
export const rankOf = (s: RankSource) => RANKS[rankIndex(rankState(s).exp)];
/** 다음 계급까지의 진행(현재 계급 안에서 쌓인 처치 / 필요 처치). 최고 계급이면 next가 없습니다. */
export function rankProgress(s: RankSource) {
    const exp = rankState(s).exp, i = rankIndex(exp), next = RANKS[i + 1];
    return { index: i, rank: RANKS[i], next, have: exp - RANK_CUMULATIVE[i], need: next ? next.need : 0, exp };
}
export const rankPointsEarned = (s: RankSource) => RANKS.slice(0, rankIndex(rankState(s).exp) + 1).reduce((a, r) => a + r.points, 0);
export const rankPerkLevel = (s: RankSource, id: RankPerkId) => Math.min(RANK_PERKS.find(p => p.id === id)!.max, rankState(s).perks[id] || 0);
export const rankPointsSpent = (s: RankSource) => RANK_PERKS.reduce((a, p) => a + rankPerkLevel(s, p.id) * p.cost, 0);
export const rankPointsFree = (s: RankSource) => rankPointsEarned(s) - rankPointsSpent(s);
/** 특전 수치: tally = 처치당 추가 마릿수, drill = 숙련 +n, medal/supply = 확률. */
export const rankPerkValue = (s: RankSource, id: RankPerkId) => rankPerkLevel(s, id) * RANK_PERKS.find(p => p.id === id)!.per;
