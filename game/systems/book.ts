/** 몬스터 도감 보상 계산. 모든 값은 s.book(처치 수)에서 파생되어 세이브 변환이 필요 없습니다. */
import type { CombatStats, State } from '../types';
import { FISH, REGIONS, regionFish } from '../data/world';
import { profileId } from '../data/encounters';
import { STAT_LABELS, PERCENT_STATS } from '../data/progression';
import { BOOK_TRAITS, PROFILE_TRAIT, BOOK_ECOLOGY, BOOK_REVEAL, REGION_THEMES, REGION_RESEARCH, REGION_RESEARCH_FROM, REGION_RESEARCH_MAX, type BookTraitGroup } from '../data/book-traits';
import { completedRegions, bookRankMet } from './progression';

type StatBonus = Partial<CombatStats>;

/** 달성한 연구 단계 수(0~6). 보상 수령과 관계없이 처치 수(5단계부터는 난이도 조건 포함)로 바로 적용됩니다. */
export const bookStage = (s: Pick<State, 'book' | 'bookTier'>, id: string) => { let n = 0; while (bookRankMet(s, id, n)) n++; return n; };
const traitCache = new Map<string, BookTraitGroup>();
export function bookTrait(id: string): BookTraitGroup {
    let trait = traitCache.get(id);
    if (!trait) traitCache.set(id, trait = FISH.find(f => f.id === id)?.boss ? 'boss' : PROFILE_TRAIT[profileId(id)] || 'armored');
    return trait;
}
/** 처치 50회부터 몬스터의 성향·스킬·능력치 정보를 공개합니다. */
export const bookRevealed = (s: Pick<State, 'book'>, id: string) => (s.book[id] || 0) >= BOOK_REVEAL;

/** 모든 몬스터의 성향 연구 능력치 합계. */
export function bookStatBonus(s: Pick<State, 'book' | 'bookTier'>) {
    const total: StatBonus = {};
    for (const f of FISH) {
        const n = bookStage(s, f.id);
        if (!n) continue;
        for (const [k, v] of Object.entries(BOOK_TRAITS[bookTrait(f.id)].perStage) as [keyof CombatStats, number][])
            total[k] = (total[k] || 0) + v * n;
    }
    return total;
}

/** 생태 연구: 해당 몬스터 상대 주는 피해·받는 공격 피해 보정. 2단계부터 단계마다 쌓입니다. */
export function bookEcology(s: Pick<State, 'book' | 'bookTier'>, id: string) {
    const stages = Math.max(0, bookStage(s, id) - BOOK_ECOLOGY.fromStage + 1);
    return { stages, dealt: stages * BOOK_ECOLOGY.dealtPerStage, taken: stages * BOOK_ECOLOGY.takenPerStage };
}

/** v27.80 지역 연구 단계(0~3): 지역 몬스터 전부가 연구 4·5·6단계 이상. */
export const regionResearchStage = (s: Pick<State, 'book' | 'bookTier'>, region: string) =>
    Math.max(0, Math.min(REGION_RESEARCH_MAX, Math.min(...regionFish(region).map(id => bookStage(s, id))) - REGION_RESEARCH_FROM + 1));
/** 지역 연구 효과를 장소 테마와 같은 모양(add·scale 배율)으로 바꿉니다. */
function regionResearchThemes(s: State) {
    return REGIONS.flatMap(region => {
        const n = regionResearchStage(s, region), r = REGION_RESEARCH[region];
        if (!n || !r) return [];
        return [{ label: r.label, add: Object.fromEntries(Object.entries(r.add || {}).map(([k, v]) => [k, (v as number) * n])) as StatBonus, scale: Object.fromEntries(Object.entries(r.scale || {}).map(([k, v]) => [k, 1 + (v as number) * n])) as Partial<Record<'hp' | 'attack' | 'magic' | 'defense' | 'resist', number>>, rareSpawn: 0 }];
    });
}
/** 완성한 장소의 테마 보너스와 지역 연구 효과. */
export const regionThemes = (s: State) => [...completedRegions(s).map(st => REGION_THEMES[st.id]).filter(Boolean), ...regionResearchThemes(s)];
export const rareSpawnBonus = (s: State) => regionThemes(s).reduce((a, t) => a + (t.rareSpawn || 0), 0);

/** "물리 공격 +2 · 명중 +0.3%p"처럼 능력치 보너스를 읽기 쉬운 문장으로 씁니다. */
export function bonusLabel(bonus: StatBonus, times = 1) {
    return Object.entries(bonus).map(([k, v]) => {
        const n = (v as number) * times;
        const text = PERCENT_STATS.has(k) ? `${Number((n * 100).toFixed(2))}%${k === 'expBonus' || k === 'goldBonus' ? '' : 'p'}` : `${Number(n.toFixed(2))}`;
        return `${STAT_LABELS[k as keyof CombatStats]} +${text}`;
    }).join(' · ');
}
