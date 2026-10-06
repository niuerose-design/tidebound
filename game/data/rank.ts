import type { State } from '../types';

/**
 * v27.79 계급장: 처치한 마릿수로만 오르는 별도 레벨. 환생·분신과 무관하게 캐릭터에 쌓입니다.
 * 이등병 → 중장 16번 진급. 진급마다 진급 포인트를 주고 포인트는 언제든 무료로 초기화합니다.
 * v3.19 초장기 콘텐츠로 재조정: 계급 그룹마다 필요 처치 배율 병 ×1 · 부사관 ×10 · 장교 ×100 · 장성 ×80(RANK_GROUP_SCALE).
 * 중장까지 합계 약 1억 8,770만. 무리 없이 처치 상한(2초 턴당 1마리 = 시간당 1,800마리)에 전과 기록 최대(10단계, ×11)로
 * 24시간 쉬지 않아도 약 1.08년 걸립니다(환생 200회 이후의 경험치 환산은 나중에 따로). v3.46 무리는 SWARM_RANK_PER_TURN.
 * v3.19 특전 최대: 전과 기록 18 → 10, 숙련 훈련 8 → 12, 전공 훈장 5 → 9(합계 41 = 총 진급 포인트 그대로).
 */
export type RankDef = { id: string; name: string; /** 이전 계급에서 이 계급까지 필요한 처치 수 */ need: number; /** 이 계급에 오를 때 받는 진급 포인트 */ points: number; group: '병' | '부사관' | '장교' | '장성' };
/** v3.19 계급 그룹별 필요 처치 배율. */
export const RANK_GROUP_SCALE: Record<RankDef['group'], number> = { 병: 1, 부사관: 10, 장교: 100, 장성: 80 };
/** v3.19 조정 전 필요 처치(옛 세이브의 강등 판정용). */
export const RANK_LEGACY_NEED = [0, 5_000, 6_900, 9_500, 13_100, 18_100, 25_000, 34_500, 47_600, 65_700, 90_700, 125_000, 173_000, 238_000, 329_000, 454_000, 626_000];
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
for (const r of RANKS) r.need *= RANK_GROUP_SCALE[r.group];
/** 계급 i에 오르기까지 누적 필요 처치 수. */
export const RANK_CUMULATIVE: number[] = RANKS.reduce<number[]>((acc, r, i) => { acc.push((acc[i - 1] || 0) + r.need); return acc; }, []);
export const RANK_TOTAL_POINTS = RANKS.reduce((a, r) => a + r.points, 0);

/** 진급 포인트로 사는 특전. 단계당 1P, 합계 41단계 = 총 진급 포인트 41(전부 찍으면 중장). */
export type RankPerkDef = { id: RankPerkId; name: string; desc: (level: number) => string; max: number; cost: number; per: number };
export type RankPerkId = 'tally' | 'drill' | 'medal' | 'supply';
export const RANK_PERKS: RankPerkDef[] = [
    { id: 'tally', name: '전과 기록', desc: l => `처치 1마리를 계급 경험치 ${1 + l}마리로 셉니다`, max: 10, cost: 1, per: 1 },
    { id: 'drill', name: '숙련 훈련', desc: l => `처치 숙련 기본 획득 +${l}(직업·장착 스킬 모두, 배율과 무관한 고정값)`, max: 12, cost: 1, per: 1 },
    { id: 'medal', name: '전공 훈장', desc: l => `사냥터 처치마다 ${(l * .1).toFixed(1)}% 확률로 SP +1`, max: 9, cost: 1, per: .001 },
    { id: 'supply', name: '보급품', desc: l => `사냥터 처치마다 ${(l * .1).toFixed(1)}% 확률로 세계석 +1`, max: 10, cost: 1, per: .001 },
];
export type RankState = { /** 계급 경험치(세어진 처치 수) */ exp: number; perks: Partial<Record<RankPerkId, number>>; /** v3.46 무리 계급 경험치의 소수점 이월분(0~1). */ frac?: number };
/**
 * v3.46 무리 계급 경험치: 마리 수 대신 무리와 싸운 턴 수 × 규모별 턴당 값(마리 수 상한). 한 마리는 그대로 1.
 * 처치 상한(2초 턴당 1마리)으로 한 마리만 잡으면 중장까지 약 412일인데, 무리만 잡으면 ×100 약 300일 · ×500 약 200일이 되게 맞췄습니다(전과 기록은 똑같이 곱함).
 * 캐릭터가 얼마나 강하든 턴당 속도는 같고, 느리게 잡는 캐릭터도 같은 턴당 값을 받습니다.
 */
export const SWARM_RANK_PER_TURN: Record<number, number> = { 5: 1.1, 100: 1.32, 500: 1.98 };
/**
 * v3.48 무리 처치 숙련: 계급과 같은 구조(싸운 턴 × 규모별 턴당 값, 마리 수 상한)로 숙련 배수를 셉니다.
 * 한 마리 처치는 턴당 약 1이므로 서식지 숙련은 처치 숙련의 약 10~20배(×100 · ×500), 까미 상한 지역의 1/10 정도입니다.
 */
export const SWARM_MASTERY_PER_TURN: Record<number, number> = { 5: 2, 100: 10, 500: 20 };
export const swarmMasteryKills = (size: number, turns: number) => size <= 1 ? 1 : Math.min(size, Math.max(1, turns) * (SWARM_MASTERY_PER_TURN[size] ?? 1));
export const swarmRankKills = (size: number, turns: number) => size <= 1 ? 1 : Math.min(size, Math.max(1, turns) * (SWARM_RANK_PER_TURN[size] ?? 1));
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
