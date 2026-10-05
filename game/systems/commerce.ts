import { gearName } from '../data/maple-gear';
import type { State, Action, Item } from '../types';
import { RARITIES } from '../data/balance';
import { SHOP, GAMBLE_CATEGORIES, RELICS, ECONOMY, APPRAISAL, RESEARCH, RESEARCH_TABS, RESEARCH_RESET, researchCost, researchSpent, researchUnlocked, inventoryCap, shopDiscount } from '../data/economy';
import { apCapacity, apUsed } from './progression';
import { rollAffix, enhanceCost, bulkItems, saleValue, dismantleEssence, rerollCost, enhanceMaxFor } from './equipment';
import { STARFORCE, starSuccess, starDrops, starDestroy, canSafeguard, chanceTime } from '../data/starforce';
import { rollAffixes } from '../data/gear';
import { fishGoldAt, PRICE_LEVEL_CAP } from '../data/world';
/** 상점·뽑기 골드 가격. 상점 단골 할인(−2%/단계, 내림)을 적용합니다. */
/** v27.30 확정 구매·감정 가격: 예전 정비례 가격과 '그 레벨 몬스터 골드 × 배수' 중 큰 값. 감정은 매번 희귀 이상이라 드롭(처치당 0.1%)보다 훨씬 유리했습니다. */
const SHOP_FISH = { buy: 30, gamble: 60 };
const fishPrice = (s: State, n: number) => fishGoldAt(Math.min(PRICE_LEVEL_CAP, s.level)) * n;
export const shopCost = (s: State) => Math.floor(Math.max(ECONOMY.shopBase + s.level * ECONOMY.shopPerLevel, fishPrice(s, SHOP_FISH.buy)) * shopDiscount(s));
/** v27.20 일반 등급(흰색) 장비 확정 구매: 도감용. 드롭 확률이 낮고 던전·보스 드롭은 희귀 이상이라 흰색을 따로 팝니다. */
export const plainCost = (s: State) => Math.max(30, Math.floor(shopCost(s) * .2));
export const gambleCost = (s: State) => Math.floor(Math.max(ECONOMY.gambleBase + s.level * ECONOMY.gamblePerLevel, fishPrice(s, SHOP_FISH.gamble)) * shopDiscount(s));
export function ownsRelic(s: State, id: string) { return [...s.inventory, ...Object.values(s.equipment)].some(x => x?.relic === id); }
export function shopPreview(s: State, id: string): Item { const o = SHOP.find(x => x.id === id)!; return { id: 'preview', name: gearName(o.slot, 1, o.style), slot: o.slot, style: o.style, description: o.description, level: s.level, rarity: 1, power: Math.round((s.level + 2) * RARITIES[1].factor), affix: { stat: o.slot === 'charm' ? 'accuracy' : o.style === 'magic' ? 'magic' : o.slot === 'coat' ? 'hp' : 'attack', name: '제작', value: o.slot === 'charm' ? .05 : o.slot === 'coat' ? 20 : 5 } }; }
/** 탭에 쓴 세계석과 재분배 반환액. 첫 1회는 전액, 이후 90%(내림). */
export function researchRefund(s: Pick<State, 'permanent' | 'researchResetUsed' | 'researchGranted'>, tab: string) {
    const ranks: Record<string, number> = {};
    let spent = 0;
    for (const r of RESEARCH) {
        const rank = s.permanent[r.id] || 0;
        if (r.tab !== tab || !rank) continue;
        ranks[r.id] = rank;
        // v27.31 무료로 받은 앞 단계는 반환하지 않습니다.
        spent += researchSpent(r.id, rank) - researchSpent(r.id, Math.min(rank, s.researchGranted?.[r.id] || 0));
    }
    const rate = s.researchResetUsed ? RESEARCH_RESET.refund : RESEARCH_RESET.firstRefund;
    return { spent, refund: Math.floor(spent * rate), ranks, first: !s.researchResetUsed };
}
/** All spend checks happen before mutations. null means action belongs to another system. */
/** v27.13 한 번에 감정할 수 있는 개수. */
export const GAMBLE_COUNTS = [1, 5, 10];
export function commerce(s: State, a: Action, rng: () => number): string | null {
    const id = a.id || '';
    const spend = (cost: number) => { if (!Number.isFinite(cost) || s.gold < cost)
        throw Error('골드가 부족합니다.'); s.gold -= cost; };
    const room = () => { if (s.inventory.length >= inventoryCap(s))
        throw Error('가방을 비운 뒤 구매하세요.'); };
    const nextId = () => `shop-${++s.shopSerial}`;
    if (a.type === 'buy' || a.type === 'gamble') {
        const gamble = a.type === 'gamble';
        // 감정은 부위(rod·coat·charm)로 고르지만, 상품 id를 직접 넘겨도 그 상품 하나로 감정합니다(기존 호출 호환).
        const category = gamble ? GAMBLE_CATEGORIES.find(x => x.id === id) ?? (SHOP.some(x => x.id === id) ? { offers: [id] } : undefined) : undefined;
        if (gamble ? !category : !SHOP.some(x => x.id === id))
            throw Error('상품을 확인하세요.');
        // v27.13 감정은 1·5·10개 단위. 골드와 가방 칸을 먼저 모두 확인한 뒤 하나씩 뽑습니다(1개일 때의 난수 순서는 그대로).
        const plain = !gamble && a.value === 'plain';
        const count = gamble ? Number(a.value || 1) : 1;
        if (!GAMBLE_COUNTS.includes(count))
            throw Error('감정 개수는 1·5·10개 중 하나입니다.');
        const cost = gamble ? gambleCost(s) : plain ? plainCost(s) : shopCost(s), total = cost * count;
        if (s.inventory.length + count > inventoryCap(s))
            throw Error(count > 1 ? `가방에 ${count}칸이 필요합니다. 장비를 정리하세요.` : '가방을 비운 뒤 구매하세요.');
        if (s.gold < total)
            throw Error('골드가 부족합니다.');
        const results: Item[] = [];
        for (let i = 0; i < count; i++) {
            const offerId = category ? category.offers[category.offers.length > 1 ? Math.min(category.offers.length - 1, Math.floor(rng() * category.offers.length)) : 0] : id;
            const offer = SHOP.find(x => x.id === offerId)!;
            spend(cost);
            const roll = gamble ? rng() : 0;
            let threshold = 0;
            const rarity = gamble ? (APPRAISAL.find(r => { threshold = Math.round((threshold + r.chance) * 1000) / 1000; return roll < threshold; })?.rarity ?? APPRAISAL[APPRAISAL.length - 1].rarity) : 1;
            let item: Item = { ...shopPreview(s, offer.id), id: nextId() };
            if (plain) {
                const base: Item = { ...item };
                delete base.affix;
                item = { ...base, name: gearName(offer.slot, 0, base.style), rarity: 0, power: Math.round((s.level + 2) * RARITIES[0].factor) };
            }
            if (gamble) {
                const power = Math.round((s.level + 2) * RARITIES[rarity].factor);
                const base: Item = { ...item };
                delete base.affix;
                item = { ...base, name: gearName(offer.slot, rarity, base.style), rarity, power, affixes: rollAffixes(rarity, power, undefined, rng) };
            }
            item.paid = cost;
            s.inventory.push(item);
            results.push(item);
        }
        if (count === 1) {
            const item = results[0];
            return `${gamble ? '감정' : '구매'} · ${item.name}${gamble ? ` · 옵션 ${item.rarity}개` : ''} · -${cost} G`;
        }
        // 묶음 결과: 등급별 개수(높은 등급부터)와 가장 좋은 장비 이름.
        const tally = [...APPRAISAL].map(r => r.rarity).sort((x, y) => y - x).map(r => [r, results.filter(i => i.rarity === r).length] as const).filter(([, n]) => n);
        const best = results.reduce((b, i) => (i.rarity || 0) > (b.rarity || 0) ? i : b, results[0]);
        return `감정 ${count}개 · ${tally.map(([r, n]) => `${RARITIES[r].name} ${n}`).join(' · ')} · 최고 ${best.name} · -${total} G`;
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
            // v27.93 스타포스: 성공률·하락·파괴·찬스 타임·파괴 방지(value 'safeguard', 15·16성 비용 2배). 규칙은 data/starforce.ts.
            const star = item.enhance || 0;
            if (star >= enhanceMaxFor(item))
                throw Error('최대 강화입니다.');
            const safeguard = a.value === 'safeguard' && canSafeguard(star);
            const cost = enhanceCost(item, s) * (safeguard ? STARFORCE.safeguardCost : 1);
            spend(cost);
            const chance = chanceTime(item), roll = rng(), p = starSuccess(star), d = starDestroy(star, safeguard);
            if (chance || roll < p) {
                item.enhance = star + 1; item.starFails = 0;
                return `${item.name} ${item.enhance}성 강화 성공${chance ? ' (찬스 타임)' : ''} · -${cost} G`;
            }
            if (roll < p + d) {
                item.starFails = 0;
                if (item.relic) { item.enhance = STARFORCE.relicResetStar; return `${item.name} 강화 실패 · 파괴! 유물이라 ${STARFORCE.relicResetStar}성으로 돌아갑니다 · -${cost} G`; }
                s.inventory = s.inventory.filter(x => x.id !== item.id);
                for (const slot of Object.keys(s.equipment)) if (s.equipment[slot]?.id === item.id) s.equipment[slot] = null;
                return `${item.name} 강화 실패 · 장비가 파괴되었습니다 · -${cost} G`;
            }
            if (starDrops(star)) {
                item.enhance = star - 1; item.starFails = (item.starFails || 0) + 1;
                return `${item.name} 강화 실패 · ${item.enhance}성으로 하락${chanceTime(item) ? ' · 다음 시도는 찬스 타임(100%)' : ''} · -${cost} G`;
            }
            return `${item.name} 강화 실패 · ${star}성 유지 · -${cost} G`;
        }
        if (item.rarity < 1)
            throw Error('희귀 이상 장비만 재설정할 수 있습니다.');
        if (!item.affixes?.length) {
            // v21 이전 장비·상점 장비·유물의 단일 옵션. v27.74 이 경로도 다중 옵션과 같이 골드 + 정수를 받습니다(전에는 골드만).
            const cost = rerollCost(item, s);
            if ((s.essence || 0) < cost.essence)
                throw Error(`정수가 부족합니다. 장비를 분해해 모으세요 (필요 ${cost.essence}).`);
            spend(cost.gold);
            s.essence = (s.essence || 0) - cost.essence;
            item.affix = rollAffix(item.rarity, rng);
            return `${item.name} 옵션 재설정 · ${item.affix.name} · -${cost.gold} G · 정수 -${cost.essence}`;
        }
        // v22: 고른 옵션 하나만 다시 굴립니다. 나머지 옵션은 그대로이며 골드와 정수가 듭니다.
        const index = Number(a.value || '0');
        if (!Number.isInteger(index) || index < 0 || index >= item.affixes.length)
            throw Error('재설정할 옵션을 고르세요.');
        const cost = rerollCost(item, s);
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
        if (!researchUnlocked(s.rebirths, r))
            throw Error(`환생 ${r.rebirth}회 이후에 열리는 연구입니다.`);
        const cost = researchCost(id, rank);
        if (s.pearls < cost)
            throw Error('세계석이 부족합니다.');
        s.pearls -= cost;
        s.permanent[id] = rank + 1;
        return `${r.name} 연구 ${rank + 1}단계 · -${cost} 세계석`;
    }
    if (a.type === 'resetResearch') {
        const tab = RESEARCH_TABS.find(x => x.id === id);
        if (!tab)
            throw Error('연구 탭을 확인하세요.');
        if (s.running || s.dungeon)
            throw Error('자동 사냥을 멈추고 던전에서 나온 뒤 재분배하세요.');
        const { refund, ranks } = researchRefund(s, tab.id);
        if (refund <= 0)
            throw Error('돌려받을 세계석이 없습니다.');
        const after = { ...s, permanent: { ...s.permanent, ...Object.fromEntries(Object.keys(ranks).map(k => [k, Math.min(ranks[k], s.researchGranted?.[k] || 0)])) } };
        if (ranks.inventory && s.inventory.length > inventoryCap(after))
            throw Error(`재분배하면 가방이 ${inventoryCap(after)}칸으로 줄어 ${s.inventory.length - inventoryCap(after)}개가 넘칩니다. 장비를 정리하세요.`);
        if (ranks.ap && apUsed(after) > apCapacity(after))
            throw Error(`재분배하면 장착 AP 한도(${apCapacity(after)})를 넘습니다. 스킬 장착을 ${apUsed(after) - apCapacity(after)} AP 줄인 뒤 다시 시도하세요.`);
        // v27.31 무료로 받은 단계는 남깁니다(반환 세계석에도 들어가지 않음).
        for (const k of Object.keys(ranks)) {
            const kept = Math.min(ranks[k], s.researchGranted?.[k] || 0);
            if (kept) s.permanent[k] = kept; else delete s.permanent[k];
        }
        s.researchResetUsed = true;
        s.pearls += refund;
        return `${tab.name} 연구 재분배 · 세계석 +${refund} (100% 반환)`;
    }
    if (a.type === 'buyRelic') {
        const r = RELICS.find(x => x.id === id);
        if (!r || s.rebirths < r.rebirth)
            throw Error('환생 조건을 확인하세요.');
        if (ownsRelic(s, id))
            throw Error('이미 보유한 유물입니다.');
        room();
        s.inventory.push({ id: nextId(), name: r.name, slot: r.slot, style: r.style, power: r.power, rarity: 3, level: 1, relic: r.id, locked: true, description: r.description, affix: { ...r.affix } });
        return `${r.name} 수령 · 환생 ${r.rebirth}회 달성 보상`;
    }
    return null;
}
