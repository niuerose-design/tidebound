import type { State } from '../types';
import { SWARM_SIZES, SWARM_UNLOCK } from './world';
import { rareSpawnBonus } from '../systems/book';
import { stats } from '../systems/stats';
import { canUse } from '../systems/progression';

/** 변종(희귀어): 같은 어종인데 특이한 개체. 낚시터에서 어종을 VARIANT_BOOK_MIN회 포획한 뒤부터 입질마다 판정합니다. 황금 개체는 포획 순간에 따로 판정(난파선 수집가 계보 패시브의 ‘황금 개체 확률’). */
export type VariantId = 'giant' | 'abyssal' | 'starlit' | 'swarm';
export type VariantDef = {
    id: VariantId; name: string; mark: string; desc: string;
    /** 포획당 기본 확률. */
    chance: number;
    /** 체력·공격(마공 포함)·속도 배율. */
    hp: number; attack: number; speed?: number;
    /** 경험치·골드 배율(경험치는 expMult가 있으면 그것). */
    reward: number; expMult?: number;
    /** 장비 드롭 판정 횟수(마리당). guaranteed면 희귀 이상 1개 확정. */
    drops: number; guaranteed?: boolean;
    /** 도감 포획 수 증가분(마리당). */
    book: number;
    /** 포획 시 진주(환생 3회부터 +1). */
    pearls?: number;
};
export const VARIANT_BOOK_MIN = 10;
/** ×500 무리를 만나려면 장착해야 하는 패시브(희귀어 추적자 Lv.30, 난파선 수집가 계보). */
export const SWARM_PASSIVE = 'swarmSense';
export const VARIANTS: VariantDef[] = [
    { id: 'swarm', name: '무리', mark: '≋', desc: '여러 마리가 한 개체로 덤빕니다. 기본 ×5, 도감 500회부터 ×100, 5,000회에 희귀어 추적자의 ‘무리 감지’를 장착하면 ×500. 포획하면 마리 수만큼 보상.', chance: .04, hp: 1, attack: 1, reward: 1, drops: 1, book: 1 },
    { id: 'giant', name: '거대 개체', mark: '◆', desc: '체력 ×3 · 공격 ×1.25. 경험치·골드 ×4, 드롭 3번 판정, 도감 +3.', chance: .02, hp: 3, attack: 1.25, reward: 4, drops: 3, book: 3 },
    { id: 'abyssal', name: '심연 변이', mark: '◈', desc: '공격 ×1.5 · 속도 ×1.3 · 체력 ×1.5. 희귀 이상 장비 1개 확정 드롭, 경험치·골드 ×3.', chance: .004, hp: 1.5, attack: 1.5, speed: 1.3, reward: 3, drops: 1, guaranteed: true, book: 1 },
    { id: 'starlit', name: '별빛 개체', mark: '✧', desc: '체력 ×1.5. 진주 +1(환생 3회부터 +2), 경험치 ×5.', chance: .008, hp: 1.5, attack: 1, reward: 1, expMult: 5, drops: 1, book: 1, pearls: 1 },
];
export const variantById = (id?: VariantId) => id ? VARIANTS.find(v => v.id === id) : undefined;
/** 변종 확률 배율: 지역 테마(해초림 +10%) × (1 + 변종 조우 확률 증가). 증가분은 난파선 수집가 계보 패시브가 올립니다. */
export function variantMultiplier(s: State) {
    return (1 + rareSpawnBonus(s)) * (1 + (stats(s).variantFind || 0));
}
/** 변종별 실제 확률(0~1). 합이 한 입질에 변종을 만날 확률입니다. */
export function variantChances(s: State) {
    const m = variantMultiplier(s);
    return Object.fromEntries(VARIANTS.map(v => [v.id, Math.min(1, v.chance * m)])) as Record<VariantId, number>;
}
/** 이 어종으로 등장할 수 있는 무리 규모(도감 포획 수·패시브 기준). */
export function swarmSizesFor(s: State, fishId: string) {
    const n = s.book[fishId] || 0;
    return SWARM_SIZES.filter(size => size > 1 && n >= SWARM_UNLOCK[size] && (size < 500 || canUse(s, SWARM_PASSIVE)));
}
/** 무리 규모 추첨: 큰 규모일수록 드뭅니다(×5 : ×100 : ×500 = 8 : 3 : 1). */
export function rollSwarmSize(s: State, fishId: string, rng: () => number) {
    const sizes = swarmSizesFor(s, fishId);
    if (!sizes.length) return 1;
    const weight = (n: number) => n >= 500 ? 1 : n >= 100 ? 3 : 8;
    let roll = rng() * sizes.reduce((a, n) => a + weight(n), 0);
    for (const n of sizes) { roll -= weight(n); if (roll < 0) return n; }
    return sizes[sizes.length - 1];
}
