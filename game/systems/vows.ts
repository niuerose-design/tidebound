/** 서약(진주 연구 4단계): 스스로 제약을 걸고 고유 보상을 받습니다. 계산만 두고, 상태 변경은 각 시스템에서 합니다. */
import type { State, Vows } from '../types';
import { researchRank } from '../data/economy';
import { STAGES, DUNGEONS } from '../data/world';

export const VOW_IDS = ['anchor', 'breath', 'rough'] as const;
export type VowId = typeof VOW_IDS[number];
export const VOW_RESEARCH: Record<VowId, string> = { anchor: 'vowAnchor', breath: 'vowBreath', rough: 'vowRough' };
export const VOW_NAMES: Record<VowId, string> = { anchor: '잠든 닻', breath: '한 번의 숨', rough: '거친 바다' };
/** 잠든 닻: 목표에서 이만큼 잡으면 봉인이 풀립니다. */
export const ANCHOR_CATCHES = 300;

/** 서약 보너스 강화 배율: 연구 1단계 ×1, 2단계 ×1.5, 3단계 ×2. 서약이 걸린 뒤 연구를 되돌려도 ×1은 유지합니다. */
export const vowBoost = (s: Pick<State, 'permanent'>, id: VowId) => 1 + Math.max(0, researchRank(s, VOW_RESEARCH[id]) - 1) * .5;
export const vowUnlocked = (s: Pick<State, 'permanent'>, id: VowId) => researchRank(s, VOW_RESEARCH[id]) > 0;
/** 잠든 닻 봉인 해제 배율: ×1.5 → ×1.75 → ×2. */
export const anchorPayout = (s: Pick<State, 'permanent'>) => 1 + .5 * vowBoost(s, 'anchor');
/** 한 번의 숨 환생 진주 보너스: +50% → +75% → +100%. */
export const breathBonus = (s: Pick<State, 'permanent'>) => .5 * vowBoost(s, 'breath');
/** 거친 바다 선택 단계(0~3). */
export const roughLevel = (s: Pick<State, 'vows'>) => s.vows?.rough || 0;
/** 거친 바다: 적 체력·공격 배율 1 + 0.5 × 선택 단계. */
export const roughEnemy = (s: Pick<State, 'vows'>) => 1 + .5 * roughLevel(s);
/** 거친 바다: 드롭·골드 배율 1 + 0.5 × 선택 단계 × 강화 배율. 서약이 없으면 정확히 1입니다. */
export const roughReward = (s: Pick<State, 'vows' | 'permanent'>) => roughLevel(s) ? 1 + .5 * roughLevel(s) * vowBoost(s, 'rough') : 1;
export const anchorSeal = (s: Pick<State, 'vows'>) => s.vows?.seal || null;

/** 지금 싸우는 곳이 잠든 닻 목표인지. */
export function atAnchorTarget(s: Pick<State, 'vows' | 'dungeon' | 'stage'>) {
    const seal = s.vows?.seal;
    if (!seal) return false;
    return seal.kind === 'dungeon' ? s.dungeon?.id === seal.id : !s.dungeon && s.stage === seal.id;
}
/** 환생 횟수로 해금된 사냥터·던전 중 하나를 고정 난수로 고릅니다(입장 레벨 조건은 보지 않음). */
export function chooseAnchorTarget(rebirths: number, rng: () => number) {
    const options = [
        ...STAGES.filter(st => st.rebirth <= rebirths).map(st => ({ kind: 'stage' as const, id: st.id })),
        ...DUNGEONS.filter(d => d.rebirth <= rebirths).map(d => ({ kind: 'dungeon' as const, id: d.id })),
    ];
    return options[Math.min(options.length - 1, Math.floor(rng() * options.length))];
}
export const anchorTargetName = (seal: { kind: 'stage' | 'dungeon'; id: string }) => (seal.kind === 'dungeon' ? DUNGEONS : STAGES).find(x => x.id === seal.id)?.name || seal.id;

/** 다음 생 서약을 정리합니다: 해금한 서약만, 거친 바다는 1~3단계. */
export function cleanVows(s: Pick<State, 'permanent'>, v?: Vows): Vows {
    const out: Vows = {};
    if (v?.anchor && vowUnlocked(s, 'anchor')) out.anchor = true;
    if (v?.breath && vowUnlocked(s, 'breath')) out.breath = true;
    if (v?.rough && vowUnlocked(s, 'rough')) out.rough = Math.max(1, Math.min(3, Math.floor(v.rough)));
    if (v?.focus && FOCUS_KINDS.includes(v.focus.kind)) out.focus = { kind: v.focus.kind, ...(v.focus.id ? { id: v.focus.id } : {}) };
    return out;
}
export const hasVows = (v?: Vows) => !!(v && (v.anchor || v.breath || v.rough || v.focus));
/** v25.6 이번 생의 조건 카드. 연구 없이 환생 1회부터 고를 수 있고, 한 생에 하나입니다. */
export const FOCUS_KINDS = ['stage', 'tree', 'gold'] as const;
export const FOCUS_NAMES: Record<'stage' | 'tree' | 'gold', string> = { stage: '해역 집중', tree: '계열 집중', gold: '황금 항해' };
export const FOCUS_TEXT: Record<'stage' | 'tree' | 'gold', string> = { stage: '지정한 해역에서 경험치·골드 ×1.5.', tree: '지정한 계열의 직업으로 싸우면 직업·스킬 숙련 ×2.', gold: '생 전체에서 골드 ×2, 경험치 ×0.75.' };
export function focusLabel(v?: Vows) { const f = v?.focus; if (!f) return ''; const name = f.kind === 'stage' ? STAGES.find(st => st.id === f.id)?.name : f.kind === 'tree' ? TREE_NAMES[f.id || ''] : ''; return `${FOCUS_NAMES[f.kind]}${name ? ` · ${name}` : ''}`; }
const TREE_NAMES: Record<string, string> = { physical: '물리', magic: '마법', defense: '방어', status: '상태이상', hybrid: '복합', support: '보조', mystery: '???' };
/** 랭킹 배지용 목록. 예: ['anchor', 'rough2'] */
export const vowBadges = (v?: Vows) => [v?.anchor ? 'anchor' : '', v?.breath ? 'breath' : '', v?.rough ? `rough${v.rough}` : ''].filter(Boolean);
export const vowBadgeLabel = (badge: string) => badge.startsWith('rough') ? `${VOW_NAMES.rough} ${badge.slice(5)}` : VOW_NAMES[badge as VowId] || badge;
