import { gearName } from '../data/maple-gear';
import type { State, Action, Item } from '../types';
import { RARITIES } from '../data/balance';
import { ASCENSION } from '../data/ascension';
import { SHOP, GAMBLE_CATEGORIES, RELICS, RELIC_GROWTH, ECONOMY, researchRank, APPRAISAL, RESEARCH, RESEARCH_TABS, RESEARCH_RESET, researchCost, researchSpent, researchUnlocked, researchMaxFor, inventoryCap, shopDiscount } from '../data/economy';
import { apCapacity, apUsed } from './progression';
import { rollAffix, enhanceCost, bulkItems, saleValue, dismantleEssence, rerollCost, refineCost, enhanceMaxFor, imprintCost, syncRelicPower, levelUpTarget, levelUpCost, applyLevelUp } from './equipment';
import { STARFORCE, starSuccess, starDrops, starDestroy, canSafeguard, chanceTime } from '../data/starforce';
import { rollAffixes, refineOption } from '../data/gear';
import { fishGoldAt, PRICE_LEVEL_CAP } from '../data/world';
/** 상점·뽑기 골드 가격. 상점 단골 할인(−2%/단계, 내림)을 적용합니다. */
/** v27.30 확정 구매·감정 가격: 예전 정비례 가격과 '그 레벨 몬스터 골드 × 배수' 중 큰 값. 감정은 매번 희귀 이상이라 드롭(처치당 0.1%)보다 훨씬 유리했습니다. */
const SHOP_FISH = { buy: 30, gamble: 60 };
/** v3.7 자동 강화 한 번에 돌리는 최대 시도 수(렉 방지). */
const AUTO_STAR_MAX_TRIES = 2000;
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
/** v27.93 스타포스 한 번 시도. 비용을 쓰고 성공·파괴·하락·유지 중 하나를 적용합니다. v3.7 자동 강화도 같은 함수를 돌립니다. */
export function starForceAttempt(s: State, item: Item, wantSafeguard: boolean, rng: () => number, spend: (cost: number) => void, caught = false): { outcome: 'success' | 'destroy' | 'drop' | 'keep'; cost: number; message: string } {
    const star = item.enhance || 0;
    const safeguard = wantSafeguard && canSafeguard(star);
    const cost = enhanceCost(item, s) * (safeguard ? STARFORCE.safeguardCost : 1);
    spend(cost);
    const sf = s.starforce ??= { tries: 0, success: 0, fail: 0, destroy: 0, gold: 0 };
    sf.tries++; sf.gold += cost;
    // v3.8 스타캐치 성공은 성공률 +catchBonus(파괴 확률은 그대로, 실패 몫에서 뺌).
    const chance = chanceTime(item), roll = rng(), p = Math.min(1, starSuccess(star) + (caught ? STARFORCE.catchBonus : 0)), d = starDestroy(star, safeguard);
    // v3.20 업적용 흐름 기록. 연속 성공은 10성 이상 시도만 세고(그 아래는 거의 다 성공이라 건너뜀), 실패·파괴가 나면 끊깁니다.
    const succeeded = chance || roll < p, failed = () => { sf.streak = 0; sf.failStreak = (sf.failStreak || 0) + 1; sf.bestFailStreak = Math.max(sf.bestFailStreak || 0, sf.failStreak); };
    if (chance) sf.chance = (sf.chance || 0) + 1;
    if (caught) sf.catches = (sf.catches || 0) + 1;
    if (succeeded) {
        sf.failStreak = 0;
        if (star >= 10) { sf.streak = (sf.streak || 0) + 1; sf.bestStreak = Math.max(sf.bestStreak || 0, sf.streak); }
        if (star >= 15) sf.high = (sf.high || 0) + 1;
    }
    else failed();
    if (succeeded) {
        sf.success++;
        item.enhance = star + 1; item.starFails = 0;
        return { outcome: 'success', cost, message: `${item.name} ${item.enhance}성 강화 성공${chance ? ' (찬스 타임)' : caught ? ' (스타캐치)' : ''} · -${cost} G` };
    }
    if (roll < p + d) {
        sf.destroy++;
        item.starFails = 0;
        if (item.relic) { item.enhance = STARFORCE.relicResetStar; return { outcome: 'destroy', cost, message: `${item.name} 강화 실패 · 파괴! 유물이라 ${STARFORCE.relicResetStar}성으로 돌아갑니다 · -${cost} G` }; }
        s.inventory = s.inventory.filter(x => x.id !== item.id);
        for (const slot of Object.keys(s.equipment)) if (s.equipment[slot]?.id === item.id) s.equipment[slot] = null;
        return { outcome: 'destroy', cost, message: `${item.name} 강화 실패 · 장비가 파괴되었습니다 · -${cost} G` };
    }
    sf.fail++;
    if (starDrops(star)) {
        sf.drops = (sf.drops || 0) + 1;
        item.enhance = star - 1; item.starFails = (item.starFails || 0) + 1;
        return { outcome: 'drop', cost, message: `${item.name} 강화 실패 · ${item.enhance}성으로 하락${chanceTime(item) ? ' · 다음 시도는 찬스 타임(100%)' : ''} · -${cost} G` };
    }
    return { outcome: 'keep', cost, message: `${item.name} 강화 실패 · ${star}성 유지 · -${cost} G` };
}
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
                item = { ...base, name: gearName(offer.slot, rarity, base.style), rarity, power, affixes: rollAffixes(rarity, power, undefined, rng, [], offer.slot, s.level) };
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
    if (a.type === 'enhance' || a.type === 'reforge' || a.type === 'refine') {
        const item = [...s.inventory, ...Object.values(s.equipment)].find(x => x?.id === id);
        if (!item)
            throw Error('장비를 찾을 수 없습니다.');
        if (a.type === 'enhance') {
            // v27.93 스타포스: 성공률·하락·파괴·찬스 타임·파괴 방지(value 'safeguard', 15·16성 비용 2배). 규칙은 data/starforce.ts.
            if ((item.enhance || 0) >= enhanceMaxFor(item))
                throw Error('최대 강화입니다.');
            // value는 'safeguard'·'catch'를 쉼표로 묶은 목록(v3.8 스타캐치는 수동 강화 전용).
            const flags = new Set(String(a.value || '').split(','));
            return starForceAttempt(s, item, flags.has('safeguard'), rng, spend, flags.has('catch')).message;
        }
        if (item.rarity < 1)
            throw Error('희귀 이상 장비만 재설정할 수 있습니다.');
        if (a.type === 'refine') {
            // v27.94 수치 재련: 고른 옵션의 종류는 그대로, 수치만 다시 굴립니다. 비용은 재설정의 절반이고 오르지 않습니다.
            const index = Number(a.value || '0');
            const x = item.affixes?.[index];
            if (item.relic)
                throw Error('유물의 이식 옵션은 재련 대신 다시 이식해 바꿉니다.');
            if (!x || !Number.isInteger(index))
                throw Error('재련할 옵션을 고르세요.');
            if (x.rule)
                throw Error('규칙 옵션(◆)은 수치가 고정이라 재련할 수 없습니다.');
            const cost = refineCost(item, s);
            if ((s.essence || 0) < cost.essence)
                throw Error(`정수가 부족합니다. 장비를 분해해 모으세요 (필요 ${cost.essence}).`);
            spend(cost.gold);
            s.essence = (s.essence || 0) - cost.essence;
            const next = refineOption(x, item.power, item.rarity, rng, item.level);
            item.affixes = item.affixes!.map((o, i) => i === index ? next : o);
            return `${item.name} ${x.name} 수치 재련 · ${x.value} → ${next.value} · -${cost.gold} G · 정수 -${cost.essence}`;
        }
        // v3.3 유물은 이식 옵션(affixes)이 있어도 재설정은 고유 옵션(affix) 한 줄만 굴립니다. 이식 옵션은 다시 이식해 덮어씁니다.
        if (!item.affixes?.length || item.relic) {
            // v21 이전 장비·상점 장비·유물의 단일 옵션. v27.74 이 경로도 다중 옵션과 같이 골드 + 정수를 받습니다(전에는 골드만).
            const cost = rerollCost(item, s);
            if ((s.essence || 0) < cost.essence)
                throw Error(`정수가 부족합니다. 장비를 분해해 모으세요 (필요 ${cost.essence}).`);
            spend(cost.gold);
            s.essence = (s.essence || 0) - cost.essence;
            item.rerolls = (item.rerolls || 0) + 1;
            item.affix = rollAffix(item.rarity, rng);
            return `${item.name} 옵션 재설정 · ${item.affix.name} · -${cost.gold} G · 정수 -${cost.essence}`;
        }
        // v22: 고른 옵션 하나만 다시 굴립니다. 나머지 옵션은 그대로이며 골드와 정수가 듭니다.
        const index = Number(a.value || '0');
        if (!Number.isInteger(index) || index < 0 || index >= item.affixes.length)
            throw Error('재설정할 옵션을 고르세요.');
        if (item.onyx && item.affixes[index].rule)
            throw Error('칠흑 장신구의 고유 옵션은 바꿀 수 없습니다.');
        const cost = rerollCost(item, s);
        if ((s.essence || 0) < cost.essence)
            throw Error(`정수가 부족합니다. 장비를 분해해 모으세요 (필요 ${cost.essence}).`);
        spend(cost.gold);
        s.essence = (s.essence || 0) - cost.essence;
        item.rerolls = (item.rerolls || 0) + 1;
        const others = item.affixes.filter((_, i) => i !== index);
        const next = rollAffixes(others.length + 1, item.power, item.origin, rng, others, item.slot, item.level).at(-1)!;
        const before = item.affixes[index].name;
        item.affixes = item.affixes.map((x, i) => i === index ? next : x);
        return `${item.name} 옵션 재설정 · ${before} → ${next.name} · -${cost.gold} G · 정수 -${cost.essence}`;
    }
    if (a.type === 'dismantle' || a.type === 'dismantleRarity') {
        // 분해: 가방의 장비를 정수로 바꿉니다. 보호·유물·장착 장비는 제외합니다.
        const items = a.type === 'dismantle' ? s.inventory.filter(i => i.id === id) : bulkItems(s, Number(id));
        if (a.type === 'dismantle' && !items.length)
            throw Error('가방에 있는 장비를 선택하세요.');
        if (items.some(i => i.locked || i.relic || i.onyx))
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
        if (rank >= researchMaxFor(s, r))
            throw Error(`${r.name} ${(r.ascendAbove || 0) + 1}단계부터는 승천한 뒤에 살 수 있습니다.`);
        if (!researchUnlocked(s.rebirths, r))
            throw Error(`환생 ${r.rebirth}회 이후에 열리는 연구입니다.`);
        // v3.31 환생 200회부터는 세계석 연구를 더 살 수 없습니다(승천하면 연구가 초기화되며 다시 열림).
        if (s.rebirths >= ASCENSION.researchLockAt)
            throw Error(`환생 ${ASCENSION.researchLockAt}회부터는 세계석 연구를 살 수 없습니다. 승천하면 다시 살 수 있습니다.`);
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
        syncRelicPower(s);
        return `${r.name} 수령 · 환생 ${r.rebirth}회 달성 보상`;
    }
    if (a.type === 'autoEnhance') {
        // v3.7 자동 강화(세계석 연구 autoStar): value = '목표 별:골드 한도:safeguard(1/0)'. 목표에 닿거나 한도·골드가 모자라거나 파괴되면 멈추고 한 줄로 요약합니다.
        if (!researchRank(s, 'autoStar'))
            throw Error('세계석 연구 ‘자동 강화’가 필요합니다.');
        const item = [...s.inventory, ...Object.values(s.equipment)].find(x => x?.id === id);
        if (!item)
            throw Error('장비를 찾을 수 없습니다.');
        const [targetText, capText, guardText] = String(a.value || '').split(':');
        const target = Number(targetText), cap = capText ? Number(capText) : s.gold, safeguard = guardText === '1';
        const from = item.enhance || 0, max = enhanceMaxFor(item);
        if (!Number.isInteger(target) || target <= from || target > max)
            throw Error(`목표 별은 ${from + 1}~${max}성 사이여야 합니다.`);
        if (!Number.isFinite(cap) || cap <= 0)
            throw Error('골드 한도를 확인하세요.');
        const budget = Math.min(cap, s.gold), floor = s.gold - budget;
        const count = { tries: 0, success: 0, drop: 0, keep: 0, destroy: 0, gold: 0 };
        let stop = '';
        for (let i = 0; i < AUTO_STAR_MAX_TRIES; i++) {
            if ((item.enhance || 0) >= target) { stop = '목표 달성'; break; }
            const cost = enhanceCost(item, s) * (safeguard && canSafeguard(item.enhance || 0) ? STARFORCE.safeguardCost : 1);
            if (s.gold - cost < floor) { stop = count.tries ? '골드 한도 도달' : '골드 부족'; break; }
            const r = starForceAttempt(s, item, safeguard, rng, spend);
            count.tries++; count.gold += r.cost; count[r.outcome]++;
            if (r.outcome === 'destroy') { stop = item.relic ? `파괴 · 유물 ${STARFORCE.relicResetStar}성 회귀` : '파괴'; break; }
        }
        if (!stop) stop = `시도 ${AUTO_STAR_MAX_TRIES}회 한도`;
        if (!count.tries) throw Error(stop === '골드 부족' ? '골드가 부족합니다.' : stop);
        const now = s.inventory.includes(item) || Object.values(s.equipment).includes(item) ? `★${item.enhance || 0}` : '소멸';
        return `${item.name} 자동 강화 · ${stop} · ★${from} → ${now} · 시도 ${count.tries}회(성공 ${count.success} · 하락 ${count.drop} · 유지 ${count.keep}${count.destroy ? ` · 파괴 ${count.destroy}` : ''}) · -${count.gold.toLocaleString()} G`;
    }
    if (a.type === 'levelUp') {
        // v3.5 장비 레벨 올리기(+10, 내 레벨까지). 위력이 오르고 별은 0으로 돌아갑니다.
        const item = [...s.inventory, ...Object.values(s.equipment)].find(x => x?.id === id);
        if (!item)
            throw Error('장비를 찾을 수 없습니다.');
        const next = levelUpTarget(item, s);
        if (!next)
            throw Error(`내 레벨(${s.level})까지만 올릴 수 있습니다.`);
        const cost = levelUpCost(item, s), stars = item.enhance || 0, before = item.power;
        spend(cost);
        applyLevelUp(item, next, s);
        return `${item.name} Lv.${next} · 위력 ${before} → ${item.power}${stars ? ` · ★${stars} 초기화` : ''} · -${cost} G`;
    }
    if (a.type === 'imprintRelic') {
        // v3.3 옵션 이식: value = '소비 장비 id:옵션 번호:이식 칸(0~2)'. 같은 부위의 가방 장비 하나를 소비해 그 옵션 한 줄을 유물에 새깁니다(골드, 덮어쓰기 가능, 환생 유지).
        const relic = [...s.inventory, ...Object.values(s.equipment)].find(x => x?.id === id);
        if (!relic?.relic)
            throw Error('유물을 찾을 수 없습니다.');
        const [sourceId, indexText, slotText] = String(a.value || '').split(':');
        const index = Number(indexText), slot = Number(slotText);
        const source = s.inventory.find(x => x.id === sourceId);
        if (!source || source.relic || source.onyx)
            throw Error('소비할 장비를 가방에서 고르세요.');
        if (source.slot !== relic.slot)
            throw Error('같은 부위의 장비만 이식할 수 있습니다.');
        if (source.locked)
            throw Error('보호된 장비는 소비할 수 없습니다.');
        const affix = Number.isInteger(index) ? source.affixes?.[index] : undefined;
        if (!affix)
            throw Error('이식할 옵션을 고르세요.');
        if (!Number.isInteger(slot) || slot < 0 || slot >= RELIC_GROWTH.imprintSlots)
            throw Error('이식할 칸을 고르세요.');
        const lines = [...(relic.affixes || [])];
        if (lines.some((x, i) => i !== slot && x.id === affix.id))
            throw Error('이미 같은 옵션이 새겨져 있습니다.');
        if (affix.rule && lines.some((x, i) => i !== slot && x.rule))
            throw Error('규칙 옵션은 유물당 하나만 새길 수 있습니다.');
        const cost = imprintCost(source, s);
        spend(cost);
        const before = lines[slot];
        lines[slot] = { ...affix };
        relic.affixes = lines.filter(Boolean);
        s.inventory = s.inventory.filter(x => x.id !== source.id);
        return `${relic.name} 옵션 이식 · ${affix.name}${before ? ` (${before.name} 대체)` : ''} · ${source.name} 소비 · -${cost} G`;
    }
    return null;
}
