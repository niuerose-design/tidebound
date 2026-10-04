/** 서약(세계석 연구 4단계): 스스로 제약을 걸고 고유 보상을 받습니다. 계산만 두고, 상태 변경은 각 시스템에서 합니다. */
import type { State, Vows } from '../types';
import { researchRank } from '../data/economy';

/** v27.82 잠든 힘은 서약에서 빠지고 던전 ‘랜덤게임’이 되었습니다(연구 vowAnchor가 입장을 엽니다). 절제(AP 제한)가 새 서약입니다. */
export const VOW_IDS = ['breath', 'rough', 'restraint'] as const;
export type VowId = typeof VOW_IDS[number];
export const VOW_RESEARCH: Record<VowId, string> = { breath: 'vowBreath', rough: 'vowRough', restraint: 'vowRestraint' };
export const VOW_NAMES: Record<VowId, string> = { breath: '하드코어', rough: '힘의 길', restraint: '절제' };
/** 단계를 고르는 서약(1~3단계). */
export const LEVELED_VOWS = ['rough', 'restraint'] as const;

/** 서약 보너스 강화 배율: 연구 1단계 ×1, 2단계 ×1.5, 3단계 ×2. 서약이 걸린 뒤 연구를 되돌려도 ×1은 유지합니다. */
export const vowBoost = (s: Pick<State, 'permanent'>, id: VowId) => 1 + Math.max(0, researchRank(s, VOW_RESEARCH[id]) - 1) * .5;
export const vowUnlocked = (s: Pick<State, 'permanent'>, id: VowId) => researchRank(s, VOW_RESEARCH[id]) > 0;
/** 하드코어(전 ‘한 번의 숨’) 환생 세계석 보너스: +50% → +75% → +100%. */
export const breathBonus = (s: Pick<State, 'permanent'>) => .5 * vowBoost(s, 'breath');
/** 힘의 길(전 ‘험한 길’) 선택 단계(0~3). */
export const roughLevel = (s: Pick<State, 'vows'>) => s.vows?.rough || 0;
/**
 * v27.82 힘의 길: 난이도를 내려서 피할 수 없는 세 가지 제약.
 * - 난이도 하한: 지금 난이도(사냥터 난이도·던전 모드·무릉도장 층)가 floor 미만이면 보상이 꺼집니다.
 * - 장비 의존 제한: 장비 능력치 ×(1 − gear).
 * - 회복 봉쇄: 처치 후 회복·흡혈·턴당 체력 회복 ×(1 − heal).
 * 보상: 골드·장비 드롭 확률 ×(1 + 0.5 × 단계 × 강화 배율). 드롭은 드롭 상한 뒤에 곱합니다.
 */
export const ROUGH = { floor: [10, 20, 30], gear: [.3, .5, .7], heal: [.5, .75, 1] };
export const roughFloor = (s: Pick<State, 'vows'>) => roughLevel(s) ? ROUGH.floor[roughLevel(s) - 1] : 0;
export const roughGear = (s: Pick<State, 'vows'>) => roughLevel(s) ? 1 - ROUGH.gear[roughLevel(s) - 1] : 1;
export const roughHeal = (s: Pick<State, 'vows'>) => roughLevel(s) ? 1 - ROUGH.heal[roughLevel(s) - 1] : 1;
/** 보상 배율. 단계가 없거나 지금 난이도가 하한 미만이면 정확히 1입니다(tier는 encounterTier). */
export const roughReward = (s: Pick<State, 'vows' | 'permanent'>, tier: number) => roughLevel(s) && tier >= roughFloor(s) ? 1 + .5 * roughLevel(s) * vowBoost(s, 'rough') : 1;
/** v27.82 절제: 장착 AP −2·−4·−6, 환생 세계석 +15·+30·+45% × 강화 배율. */
export const RESTRAINT = { ap: [2, 4, 6], pearls: [.15, .3, .45] };
export const restraintLevel = (s: Pick<State, 'vows'>) => s.vows?.restraint || 0;
export const restraintAP = (s: Pick<State, 'vows'>) => restraintLevel(s) ? RESTRAINT.ap[restraintLevel(s) - 1] : 0;
export const restraintBonus = (s: Pick<State, 'vows' | 'permanent'>) => restraintLevel(s) ? RESTRAINT.pearls[restraintLevel(s) - 1] * vowBoost(s, 'restraint') : 0;

/** 다음 생 서약을 정리합니다: 해금한 서약만, 힘의 길·절제는 1~3단계. */
export function cleanVows(s: Pick<State, 'permanent'>, v?: Vows): Vows {
    const out: Vows = {};
    if (v?.breath && vowUnlocked(s, 'breath')) out.breath = true;
    if (v?.rough && vowUnlocked(s, 'rough')) out.rough = Math.max(1, Math.min(3, Math.floor(v.rough)));
    if (v?.restraint && vowUnlocked(s, 'restraint')) out.restraint = Math.max(1, Math.min(3, Math.floor(v.restraint)));
    if (v?.focus && FOCUS_KINDS.includes(v.focus.kind)) out.focus = { kind: v.focus.kind, ...(v.focus.id ? { id: v.focus.id } : {}) };
    return out;
}
export const hasVows = (v?: Vows) => !!(v && (v.breath || v.rough || v.restraint || v.focus));
/** v25.6 이번 생의 조건 카드. 연구 없이 환생 1회부터 고를 수 있고, 한 생에 하나입니다. */
const FOCUS_KINDS = ['stage', 'tree', 'gold'] as const;
export const FOCUS_NAMES: Record<'stage' | 'tree' | 'gold', string> = { stage: '사냥터 집중', tree: '계열 집중', gold: '황금 모험' };
/** 랭킹 배지용 목록. 예: ['breath', 'rough2', 'restraint1'] */
export const vowBadges = (v?: Vows) => [v?.breath ? 'breath' : '', v?.rough ? `rough${v.rough}` : '', v?.restraint ? `restraint${v.restraint}` : ''].filter(Boolean);
export const vowBadgeLabel = (badge: string) => badge.startsWith('restraint') ? `${VOW_NAMES.restraint} ${badge.slice(9)}` : badge.startsWith('rough') ? `${VOW_NAMES.rough} ${badge.slice(5)}` : badge === 'anchor' ? '잠든 힘' : VOW_NAMES[badge as VowId] || badge;
