import type { State, Action, Item } from '../types';
import { BALANCE, RARITIES } from '../data/balance';
import { SHOP, GAMBLE_CATEGORIES, RELICS, ECONOMY, APPRAISAL, RESEARCH, researchCost } from '../data/economy';
import { rollAffix, enhanceCost, reforgeCost, bulkItems, saleValue, dismantleEssence, rerollCost } from './equipment';
import { rollAffixes } from '../data/gear';
export const shopCost = (s: State) => ECONOMY.shopBase + s.level * ECONOMY.shopPerLevel;
export const gambleCost = (s: State) => ECONOMY.gambleBase + s.level * ECONOMY.gamblePerLevel;
export const relicCost = (s: State, id: string) => id === 'memoryRod' && s.clears.temple ? 0 : RELICS.find(x => x.id === id)?.cost ?? Infinity;
export function ownsRelic(s: State, id: string) { return [...s.inventory, ...Object.values(s.equipment)].some(x => x?.relic === id); }
export function shopPreview(s: State, id: string): Item { const o = SHOP.find(x => x.id === id)!; return { id: 'preview', name: `희귀 ${o.name}`, slot: o.slot, style: o.style, description: o.description, level: s.level, rarity: 1, power: Math.round((s.level + 2) * RARITIES[1].factor), affix: { stat: o.slot === 'charm' ? 'accuracy' : o.style === 'magic' ? 'magic' : o.slot === 'coat' ? 'hp' : 'attack', name: '제작', value: o.slot === 'charm' ? .05 : o.slot === 'coat' ? 20 : 5 } }; }
/** All spend checks happen before mutations. null means action belongs to another system. */
export function commerce(s: State, a: Action, rng: () => number): string | null {
    const id = a.id || '';
    const spend = (cost: number) => { if (!Number.isFinite(cost) || s.gold < cost)
        throw Error('골드가 부족합니다.'); s.gold -= cost; };
    const room = () => { if (s.inventory.length >= BALANCE.inventoryCap)
        throw Error('가방을 비운 뒤 구매하세요.'); };
    const nextId = () => `shop-${++s.shopSerial}`;
    if (a.type === 'buy' || a.type === 'gamble') {
        const category = a.type === 'gamble' ? GAMBLE_CATEGORIES.find(x => x.id === id) : undefined;
        const offerId = category ? category.offers[category.offers.length > 1 ? Math.min(category.offers.length - 1, Math.floor(rng() * category.offers.length)) : 0] : id;
        const offer = SHOP.find(x => x.id === offerId);
        if (!offer)
            throw Error('상품을 확인하세요.');
        room();
        const gamble = a.type === 'gamble';
        const cost = gamble ? gambleCost(s) : shopCost(s);
        spend(cost);
        const roll = gamble ? rng() : 0;
        let threshold = 0;
        const rarity = gamble ? (APPRAISAL.find(r => { threshold = Math.round((threshold + r.chance) * 1000) / 1000; return roll < threshold; })?.rarity ?? APPRAISAL[APPRAISAL.length - 1].rarity) : 1;
        let item: Item = { ...shopPreview(s, offer.id), id: nextId() };
        if (gamble) {
            const power = Math.round((s.level + 2) * RARITIES[rarity].factor);
            const { affix: _fixed, ...base } = item;
            item = { ...base, name: `${RARITIES[rarity].name} ${offer.name}`, rarity, power, affixes: rollAffixes(rarity, power, undefined, rng) };
        }
        s.inventory.push(item);
        return `${gamble ? '감정' : '구매'} · ${item.name}${gamble ? ` · 옵션 ${rarity}개` : ''} · -${cost} G`;
    }
    if (a.type === 'lockItem') {
        const item = s.inventory.find(x => x.id === id);
        if (!item)
            throw Error('장비를 찾을 수 없습니다.');
        item.locked = !item.locked;
        return `${item.name} ${item.locked ? '보호' : '보호 해제'}`;
    }
    if (a.type === 'sellRarity') {
        const rarity = Number(id);
        if (!Number.isInteger(rarity) || rarity < 0 || rarity >= RARITIES.length)
            throw Error('등급을 확인하세요.');
        const items = bulkItems(s, rarity);
        if (!items.length)
            throw Error('판매할 장비가 없습니다.');
        const ids = new Set(items.map(x => x.id)), gold = items.reduce((sum, i) => sum + saleValue(i), 0);
        s.inventory = s.inventory.filter(i => !ids.has(i.id));
        s.gold += gold;
        return `${RARITIES[rarity].name} ${items.length}개 일괄판매 · +${gold} G`;
    }
    if (a.type === 'enhance' || a.type === 'reforge') {
        const item = [...s.inventory, ...Object.values(s.equipment)].find(x => x?.id === id);
        if (!item)
            throw Error('장비를 찾을 수 없습니다.');
        if (a.type === 'enhance') {
            if ((item.enhance || 0) >= ECONOMY.enhanceMax)
                throw Error('최대 강화입니다.');
            const cost = enhanceCost(item);
            spend(cost);
            item.enhance = (item.enhance || 0) + 1;
            return `${item.name} +${item.enhance} 강화 성공 · -${cost} G`;
        }
        if (item.rarity < 1)
            throw Error('희귀 이상 장비만 재설정할 수 있습니다.');
        if (!item.affixes?.length) {
            // v21 이전 장비·상점 장비·유물의 단일 옵션: 기존 방식(골드만).
            const cost = reforgeCost(item);
            spend(cost);
            item.affix = rollAffix(item.rarity, rng);
            return `${item.name} 옵션 재설정 · ${item.affix.name} · -${cost} G`;
        }
        // v22: 고른 옵션 하나만 다시 굴립니다. 나머지 옵션은 그대로이며 골드와 정수가 듭니다.
        const index = Number(a.value || '0');
        if (!Number.isInteger(index) || index < 0 || index >= item.affixes.length)
            throw Error('재설정할 옵션을 고르세요.');
        const cost = rerollCost(item);
        if ((s.essence || 0) < cost.essence)
            throw Error(`정수가 부족합니다. 장비를 분해해 모으세요 (필요 ${cost.essence}).`);
        spend(cost.gold);
        s.essence = (s.essence || 0) - cost.essence;
        const others = item.affixes.filter((_, i) => i !== index);
        const next = rollAffixes(others.length + 1, item.power, item.origin, rng, others).at(-1)!;
        const before = item.affixes[index].name;
        item.affixes = item.affixes.map((x, i) => i === index ? next : x);
        return `${item.name} 옵션 재설정 · ${before} → ${next.name} · -${cost.gold} G · 정수 -${cost.essence}`;
    }
    if (a.type === 'dismantle' || a.type === 'dismantleRarity') {
        // 분해: 가방의 장비를 정수로 바꿉니다. 보호·유물·장착 장비는 제외합니다.
        const items = a.type === 'dismantle' ? s.inventory.filter(i => i.id === id) : bulkItems(s, Number(id));
        if (a.type === 'dismantle' && !items.length)
            throw Error('가방에 있는 장비를 선택하세요.');
        if (items.some(i => i.locked || i.relic))
            throw Error('보호 장비와 유물은 분해할 수 없습니다.');
        if (!items.length)
            throw Error('분해할 장비가 없습니다.');
        const ids = new Set(items.map(i => i.id)), gained = items.reduce((sum, i) => sum + dismantleEssence(i), 0);
        s.inventory = s.inventory.filter(i => !ids.has(i.id));
        s.essence = (s.essence || 0) + gained;
        return `${items.length === 1 ? items[0].name : `${items.length}개`} 분해 · 정수 +${gained}`;
    }
    if (a.type === 'permanent') {
        const r = RESEARCH.find(x => x.id === id), rank = s.permanent[id] || 0;
        if (!r || rank >= r.max)
            throw Error('연구 한도를 확인하세요.');
        const cost = researchCost(id, rank);
        if (s.pearls < cost)
            throw Error('진주가 부족합니다.');
        s.pearls -= cost;
        s.permanent[id] = rank + 1;
        return `${r.name} 연구 ${rank + 1}단계 · -${cost} 진주`;
    }
    if (a.type === 'buyRelic') {
        const r = RELICS.find(x => x.id === id);
        if (!r || s.rebirths < r.rebirth)
            throw Error('환생 조건을 확인하세요.');
        if (ownsRelic(s, id))
            throw Error('이미 보유한 유물입니다.');
        room();
        const cost = relicCost(s, id);
        if (s.pearls < cost)
            throw Error('진주가 부족합니다.');
        s.pearls -= cost;
        s.inventory.push({ id: nextId(), name: r.name, slot: r.slot, style: r.style, power: r.power, rarity: 3, level: 1, relic: r.id, locked: true, description: r.description, affix: { ...r.affix } });
        return `${r.name} 획득 · -${cost} 진주`;
    }
    return null;
}
