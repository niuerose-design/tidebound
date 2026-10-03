import type { Item, Stats, State } from '../types';
import { ECONOMY, AFFIXES, smithDiscount } from '../data/economy';
import { ESSENCE_BY_RARITY, rerollEssence } from '../data/gear';
import { fishGoldAt } from '../data/world';
/** 모든 장비 표기와 실제 적용은 같은 함수 사용. 옵션은 강화 배율과 독립. */
/** 나침반: 위력 1당 치명타 +0.2%p. */
export const CHARM_CRIT_PER_POWER = .002;
export function itemStats(item: Item): Partial<Stats> {
    const p = item.power * (1 + (item.enhance || 0) * ECONOMY.enhanceGain);
    const result: Partial<Stats> = {};
    if (item.slot === 'rod') {
        result.attack = p * (item.style === 'magic' ? .4 : item.style === 'physical' ? 1.4 : 1);
        result.magic = p * (item.style === 'magic' ? 1.4 : item.style === 'physical' ? .4 : .8);
    }
    if (item.slot === 'coat') {
        result.hp = p * 6;
        result.defense = p;
        result.resist = p * .5;
    }
    // v27.18 나침반 치명타에 더는 15% 상한이 없습니다. 전체 치명타가 60%를 넘으면 그 몫은 극 치명타 확률이 됩니다.
    if (item.slot === 'charm') result.crit = p * CHARM_CRIT_PER_POWER;
    if (item.affix)
        result[item.affix.stat] = (result[item.affix.stat] || 0) + item.affix.value;
    for (const affix of item.affixes || []) {
        result[affix.stat] = (result[affix.stat] || 0) + affix.value;
        if (affix.stat2 && affix.value2) result[affix.stat2] = (result[affix.stat2] || 0) + affix.value2;
    }
    return result;
}
/** v25.7 전설(등급 3) 이상은 +12, 그 아래는 +10까지 강화합니다. */
export const enhanceMaxFor = (item: Pick<Item, 'rarity'>) => item.rarity >= 3 ? ECONOMY.enhanceMaxLegend : ECONOMY.enhanceMax;
/** v25.7 판매가: 그 레벨 물고기 골드 × 등급별 마리 수 + 강화에 쓴 골드의 30%. 분해(정수)와 판매(골드)가 실제 선택이 되도록 분해만 유리하던 식(위력×3)을 바꿨습니다. */
export const SALE_FISH = [2, 6, 18, 50, 120, 300, 700], SALE_LEVEL_CAP = 65;
export const saleValue = (item: Item) => {
    // 해역 난이도(차수)로 드롭 레벨이 어종 레벨보다 높아져도 판매가는 Lv.65까지만 따라갑니다(차수당 +5 레벨이 지수 곡선을 타고 폭주하지 않게).
    const base = fishGoldAt(Math.min(SALE_LEVEL_CAP, item.level || 1)) * (SALE_FISH[item.rarity] ?? 2);
    let spent = 0;
    for (let e = 0; e < (item.enhance || 0); e++) spent += enhanceCost({ ...item, enhance: e });
    return Math.floor(base + spent * ECONOMY.saleEnhanceRefund);
};
/** 대장장이의 기억 할인. 상태를 넘기지 않으면(도감·미리보기) 할인 전 가격입니다. */
const smith = (cost: number, s?: Pick<State, 'permanent'>) => s ? Math.floor(cost * smithDiscount(s)) : cost;
export const enhanceCost = (item: Item, s?: Pick<State, 'permanent'>) => smith(Math.floor((120 + item.power * 12) * (1 + (item.enhance || 0)) ** 1.6), s);
export const reforgeCost = (item: Item, s?: Pick<State, 'permanent'>) => smith(Math.floor(250 + item.power * 25), s);
/** 분해로 얻는 정수와 옵션 하나 재설정에 드는 정수. */
export const dismantleEssence = (item: Item) => ESSENCE_BY_RARITY[item.rarity] ?? 1;
export const rerollCost = (item: Item, s?: Pick<State, 'permanent'>) => ({ gold: reforgeCost(item, s), essence: rerollEssence(item.rarity) });
export const itemDescription = (item: Item) => item.description || (item.slot === 'rod' ? (item.style === 'magic' ? '마법 특화' : item.style === 'physical' ? '물리 특화' : '물리·마법 겸용') + ' 낚싯대.' : item.slot === 'coat' ? '최대 체력·물리 방어·마법 방어를 높이는 방어구.' : '치명타 확률을 높이는 나침반.');
export function rollAffix(rarity: number, rng: () => number) { const x = AFFIXES[Math.floor(rng() * AFFIXES.length)]; return { stat: x.stat, name: x.name, value: x.value * Math.max(1, rarity) }; }
export function bulkItems(s: State, rarity: number) { return s.inventory.filter(i => i.rarity === rarity && !i.locked && !i.relic); }
