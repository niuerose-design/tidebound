import type { State } from '../types';
import { SWARM_SIZES, SWARM_UNLOCK, FIELD_SWARM_MAX, stageById } from './world';
import { rareSpawnBonus } from '../systems/book';
import { stats } from '../systems/stats';
import { ODDS } from './odds';
import { jobById } from './classes';

/** 변종: 같은 몬스터인데 특이한 개체. 사냥터에서 몬스터를 VARIANT_BOOK_MIN회 처치한 뒤부터 출현마다 판정합니다. 황금 개체는 처치 순간에 따로 판정(섀도어 계보 패시브의 ‘황금 개체 확률’). */
export type VariantId = 'giant' | 'abyssal' | 'starlit' | 'swarm';
export type VariantDef = {
    id: VariantId; name: string; mark: string; desc: string;
    /** 처치당 기본 확률. v3.52 값은 서버 전용(odds). */
    readonly chance: number;
    /** 체력·공격(마공 포함)·속도 배율. */
    hp: number; attack: number; speed?: number;
    /** 경험치·골드 배율(경험치는 expMult가 있으면 그것). */
    reward: number; expMult?: number;
    /** 장비 드롭 판정 횟수(마리당). guaranteed면 희귀 이상 1개 확정. */
    drops: number; guaranteed?: boolean;
    /** 도감 처치 수 증가분(마리당). */
    book: number;
    /** 처치 시 세계석(환생 3회부터 +1). */
    pearls?: number;
};
export const VARIANT_BOOK_MIN = 10;
export const VARIANTS: VariantDef[] = [
    { id: 'swarm', name: '무리', mark: '≋', desc: '여러 마리가 한 개체로 덤빕니다. 기본 ×5, 도감 500회부터 ×100. ×500 도전 무리는 무리 서식지에서만 나옵니다. 처치하면 마리 수만큼 경험치·골드(×500은 1.5배), 숙련·계급은 싸운 턴 × 규모별 값. 장비 드롭은 √N번만 판정하고(×500은 2배) 남는 몫은 정수로 줍니다. 탱커의 반격은 무리에 (1 + log₂N)배로 들어가고, 탱커 패시브는 무리 조우 확률을 올립니다. 설정의 ‘무리 최대 규모’로 큰 무리를 줄이거나 끌 수 있습니다.', get chance() { return ODDS.variant.chance.swarm ?? 0; }, hp: 1, attack: 1, reward: 1, drops: 1, book: 1 },
    { id: 'giant', name: '거대 개체', mark: '◆', desc: '체력 ×3 · 공격 ×1.25. 경험치·골드 ×4, 드롭 3번 판정, 도감 +3.', get chance() { return ODDS.variant.chance.giant ?? 0; }, hp: 3, attack: 1.25, reward: 4, drops: 3, book: 3 },
    { id: 'abyssal', name: '심연 변이', mark: '◈', desc: '공격 ×1.5 · 속도 ×1.3 · 체력 ×1.5. 희귀 이상 장비 1개 확정 드롭, 경험치·골드 ×3.', get chance() { return ODDS.variant.chance.abyssal ?? 0; }, hp: 1.5, attack: 1.5, speed: 1.3, reward: 3, drops: 1, guaranteed: true, book: 1 },
    { id: 'starlit', name: '별빛 개체', mark: '✧', desc: '체력 ×1.5. 세계석 +1(환생 3회부터 +2), 경험치 ×5.', get chance() { return ODDS.variant.chance.starlit ?? 0; }, hp: 1.5, attack: 1, reward: 1, expMult: 5, drops: 1, book: 1, pearls: 1 },
];
export const variantById = (id?: VariantId) => id ? VARIANTS.find(v => v.id === id) : undefined;
/**
 * v27.80 지역별 변종: 지역마다 대표 변종이 더 자주 나옵니다. v3.52 배율은 서버 전용(ODDS.variant.region),
 * 대표 변종 이름(도감·사냥터 화면 표시)은 공개 표로 둡니다. 배율을 바꾸면 이 표도 맞춰 주세요(tests/odds.test.mjs가 서버 값과 비교).
 */
export const REGION_SIGNATURE: Record<string, VariantId[]> = {
    '리스항구': ['swarm'], '헤네시스': ['giant'], '페리온': ['abyssal'], '엘리니아': ['starlit'], '커닝시티': ['swarm', 'abyssal'],
    '아쿠아로드': ['swarm'], '리프레': ['giant'], '시간의 신전': ['starlit'], '아케인 리버': ['swarm', 'abyssal'],
};
/** 사냥터의 지역 변종 배율(지역 표가 없으면 1). */
export const regionVariantScale = (stageId: string, id: VariantId) => ODDS.variant.region[stageById(stageId)?.region || '']?.[id] ?? 1;
/** 지역의 대표 변종(배율이 가장 큰 것들). */
export const regionSignature = (region: string) => { const ids = REGION_SIGNATURE[region] || []; return VARIANTS.filter(v => ids.includes(v.id)); };
/** 변종 확률 배율: 지역 테마(버섯숲 연못 +10%) × (1 + 변종 조우 확률 증가). 증가분은 섀도어 계보 패시브가 올립니다. 지역 변종 배율(REGION_VARIANTS)은 변종마다 따로 곱합니다. */
function variantMultiplier(s: State, a = stats(s)) {
    // v3.230 변종 학자: 현재 직업의 변종 확률 가산.
    return (1 + rareSpawnBonus(s)) * (1 + (a.variantFind || 0)) * (1 + (jobById(s.job)?.variantRate || 0));
}
/** 변종별 실제 확률(0~1). 합이 한 번 출현에 변종을 만날 확률입니다. */
export function variantChances(s: State) {
    // v3.104 능력치는 한 번만 계산합니다.
    const a = stats(s), m = variantMultiplier(s, a);
    // v27.2 무리는 탱커 패시브의 무리 조우 확률 증가(swarmFind)를 따로 곱합니다.
    const swarmBoost = 1 + (a.swarmFind || 0);
    return Object.fromEntries(VARIANTS.map(v => [v.id, Math.min(1, v.chance * m * (v.id === 'swarm' ? swarmBoost : 1) * regionVariantScale(s.stage, v.id))])) as Record<VariantId, number>;
}
/** 이 몬스터로 등장할 수 있는 무리 규모(도감 처치 수 기준). v3.87 일반 사냥터는 ×100까지(×500은 무리 서식지에서만). */
function swarmSizesFor(s: State, monsterId: string) {
    const n = s.book[monsterId] || 0;
    return SWARM_SIZES.filter(size => size > 1 && size <= FIELD_SWARM_MAX && n >= SWARM_UNLOCK[size]);
}
/** v27.32 설정 ‘무리 최대 규모’에서 고를 수 있는 값. 0은 무리 끔, 100은 제한 없음과 같습니다(v3.87 일반 사냥터 최대 ×100). 서식지에는 적용되지 않습니다. */
export const SWARM_CAPS = [0, 5, 100] as const;
export const swarmCapOf = (s: Pick<State, 'swarmCap'>) => Math.min(FIELD_SWARM_MAX, s.swarmCap ?? FIELD_SWARM_MAX);
/**
 * 무리 규모 추첨: 큰 규모일수록 드뭅니다(가중치는 서버 전용, ODDS.variant.swarmWeights).
 * v27.32 설정 상한을 넘게 뽑히면 상한 규모로 낮춥니다(난수 소비는 같음). 상한 0(끔)이면 1을 돌려 일반 개체가 됩니다.
 */
export function rollSwarmSize(s: State, monsterId: string, rng: () => number) {
    const sizes = swarmSizesFor(s, monsterId);
    if (!sizes.length) return 1;
    const [w5, w100, w500] = ODDS.variant.swarmWeights, weight = (n: number) => n >= 500 ? w500 : n >= 100 ? w100 : w5;
    let roll = rng() * sizes.reduce((a, n) => a + weight(n), 0), size: number = sizes[sizes.length - 1];
    for (const n of sizes) { roll -= weight(n); if (roll < 0) { size = n; break; } }
    const cap = swarmCapOf(s);
    return size <= cap ? size : cap >= 5 ? cap : 1;
}

/** v27.80 무리 서식지의 무리 규모: ×500(확률 big, 서버 전용 ODDS.variant.habitatBig) 아니면 ×100. 도감·패시브·설정 상한과 관계없이 확정입니다. */
export const rollHabitatSwarm = (rng: () => number, big: number, sizes: readonly number[]) => rng() < big ? sizes[1] : sizes[0];
