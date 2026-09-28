import type { Item, Stats, State } from '../types';
import { ECONOMY, AFFIXES } from '../data/economy';
/** 모든 장비 표기와 실제 적용은 같은 함수 사용. 옵션은 강화 배율과 독립. */
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
    if (item.slot === 'charm')
        result.crit = Math.min(.15, p * .002);
    if (item.affix)
        result[item.affix.stat] = (result[item.affix.stat] || 0) + item.affix.value;
    return result;
}
export const saleValue = (item: Item) => Math.floor(item.power * 3);
export const enhanceCost = (item: Item) => Math.floor((120 + item.power * 12) * (1 + (item.enhance || 0)) ** 1.6);
export const reforgeCost = (item: Item) => Math.floor(250 + item.power * 25);
export const itemDescription = (item: Item) => item.description || (item.slot === 'rod' ? (item.style === 'magic' ? '마법 특화' : item.style === 'physical' ? '물리 특화' : '물리·마법 겸용') + ' 낚싯대.' : item.slot === 'coat' ? '최대 체력·물리 방어·마법 방어를 높이는 방어구.' : '치명타 확률을 높이는 나침반.');
export function rollAffix(rarity: number, rng: () => number) { const x = AFFIXES[Math.floor(rng() * AFFIXES.length)]; return { stat: x.stat, name: x.name, value: x.value * Math.max(1, rarity) }; }
export function bulkItems(s: State, rarity: number) { return s.inventory.filter(i => i.rarity === rarity && !i.locked && !i.relic); }
