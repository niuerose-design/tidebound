/** 몬스터 도감 보상 계산. 모든 값은 s.book(처치 수)에서 파생되어 세이브 변환이 필요 없습니다. */
import type { CombatStats, State } from '../types';
import { REGIONS, regionFish } from '../data/world';
import { BOOK_ECOLOGY, BOOK_REVEAL, REGION_RESEARCH, REGION_RESEARCH_FROM, REGION_RESEARCH_MAX } from '../data/book-traits';
import { bookRankMet } from './progression';

type StatBonus = Partial<CombatStats>;

/** 달성한 연구 단계 수(0~6). 보상 수령과 관계없이 처치 수(5단계부터는 난이도 조건 포함)로 바로 적용됩니다. */
export const bookStage = (s: Pick<State, 'book' | 'bookTier'>, id: string) => { let n = 0; while (bookRankMet(s, id, n)) n++; return n; };
/** 처치 50회부터 몬스터의 성향·스킬·능력치 정보를 공개합니다. */
export const bookRevealed = (s: Pick<State, 'book'>, id: string) => (s.book[id] || 0) >= BOOK_REVEAL;

/** 생태 연구: 해당 몬스터 상대 주는 피해·받는 공격 피해 보정. 2단계부터 단계마다 쌓입니다. */
export function bookEcology(s: Pick<State, 'book' | 'bookTier'>, id: string) {
    const stages = Math.max(0, bookStage(s, id) - BOOK_ECOLOGY.fromStage + 1), sum = (a: number[]) => a.slice(0, stages).reduce((x, n) => x + n, 0);
    return { stages, dealt: sum(BOOK_ECOLOGY.dealt), taken: sum(BOOK_ECOLOGY.taken) };
}
/** v27.80 지역 연구 단계(0~3): 지역 몬스터 전부가 연구 REGION_RESEARCH_FROM부터 세 단계(v27.92부터 1·2·3단계) 이상. */
/** v3.104 능력치 계산이 턴마다 지역 수만큼 부르므로, 결과에 필요한 단계까지만 세고 한 몬스터라도 REGION_RESEARCH_FROM 미만이면 바로 0을 돌려줍니다. */
export function regionResearchStage(s: Pick<State, 'book' | 'bookTier'>, region: string) {
    let min = REGION_RESEARCH_FROM - 1 + REGION_RESEARCH_MAX;
    for (const id of regionFish(region)) {
        let n = 0;
        while (n < min && bookRankMet(s, id, n)) n++;
        if (n < min) { min = n; if (min < REGION_RESEARCH_FROM) return 0; }
    }
    return Math.max(0, Math.min(REGION_RESEARCH_MAX, min - REGION_RESEARCH_FROM + 1));
}
type Theme = { label: string; add?: StatBonus; scale?: Partial<Record<'hp' | 'attack' | 'magic' | 'defense' | 'resist', number>>; rareSpawn?: number };
/** 지역 연구 효과(add는 더하고 scale은 곱하는 배율). v3.38 1단계부터 첫 보너스(옛 장소 테마)가 한 번 붙습니다. */
/** v3.104 지역 · 단계마다 효과 객체는 늘 같으므로 한 번만 만듭니다(능력치 계산이 턴마다 부름). 돌려받은 효과 객체는 고치지 마세요. */
const themeCache = new Map<string, Theme[]>();
function regionTheme(region: string, n: number): Theme[] {
    const key = `${region}:${n}`;
    let out = themeCache.get(key);
    if (out) return out;
    const r = REGION_RESEARCH[region];
    const times = <T extends Record<string, number | undefined>>(o: T | undefined, k: number, base: number) => Object.fromEntries(Object.entries(o || {}).map(([key, v]) => [key, base + (v as number) * k]));
    out = !n || !r ? [] : [
        { label: r.first.label, add: times(r.first.add, 1, 0) as StatBonus, scale: times(r.first.scale, 1, 1), rareSpawn: r.first.rareSpawn },
        { label: r.label, add: times(r.add, n, 0) as StatBonus, scale: times(r.scale, n, 1) },
    ];
    for (const t of out) { Object.freeze(t.add); Object.freeze(t.scale); Object.freeze(t); } Object.freeze(out); themeCache.set(key, out);
    return out;
}
export function regionThemes(s: Pick<State, 'book' | 'bookTier'>): Theme[] {
    return REGIONS.flatMap(region => regionTheme(region, regionResearchStage(s, region)));
}
export const rareSpawnBonus = (s: State) => regionThemes(s).reduce((a, t) => a + (t.rareSpawn || 0), 0);

