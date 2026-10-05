import type { Item, Stats, State } from '../types';
import { ECONOMY, AFFIXES, RELICS, RELIC_GROWTH, relicPower, smithDiscount } from '../data/economy';
import { ESSENCE_BY_RARITY, rerollEssence } from '../data/gear';
import { fishGoldAt, priceScale } from '../data/world';
import { STARFORCE, starMax, starMultiplier } from '../data/starforce';
/** 모든 장비 표기와 실제 적용은 같은 함수 사용. 옵션은 강화 배율과 독립. */
/** 장신구: 위력 1당 치명타 +0.2%p. */
/** v27.36 장신구 치명타: 레벨·위력과 무관한 등급 고정값 × (1 + 강화 × CHARM_CRIT_ENHANCE). 예전 위력 × 0.2%는 Lv.60 전설 +10 하나로 100%를 넘었습니다. */
const CHARM_CRIT = [.03, .05, .07, .10, .12, .14, .16], CHARM_CRIT_ENHANCE = .05;
const charmCrit = (item: Pick<Item, 'rarity' | 'enhance'>) => Math.round((CHARM_CRIT[item.rarity] ?? CHARM_CRIT[0]) * (1 + (item.enhance || 0) * CHARM_CRIT_ENHANCE) * 10000) / 10000;
/** v27.36 등급별 고정 수치 감쇠(기본 수치와 고정 수치 옵션에 곱함). 고대·태초 장비가 최종 능력치의 대부분을 차지하던 것을 줄입니다. 저장된 위력은 그대로라 기존 장비에도 바로 적용됩니다. */
export const GEAR_RARITY_SCALE = [1, 1, 1, .85, .68, .58, .52];
const FLAT_GEAR_STATS = new Set(['attack', 'magic', 'hp', 'defense', 'resist', 'mana']);
export function itemStats(item: Item): Partial<Stats> {
    const damp = GEAR_RARITY_SCALE[item.rarity] ?? 1;
    const p = item.power * starMultiplier(item.enhance || 0) * damp;
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
    // v27.18 장신구 치명타에 더는 15% 상한이 없습니다. 전체 치명타가 60%를 넘으면 그 몫은 극 치명타 확률이 됩니다.
    if (item.slot === 'charm') result.crit = charmCrit(item);
    const scaled = (stat: string, n: number) => FLAT_GEAR_STATS.has(stat) && n > 0 ? n * damp : n;
    if (item.affix)
        result[item.affix.stat] = (result[item.affix.stat] || 0) + scaled(item.affix.stat, item.affix.value);
    for (const affix of item.affixes || []) {
        result[affix.stat] = (result[affix.stat] || 0) + scaled(affix.stat, affix.value);
        if (affix.stat2 && affix.value2) result[affix.stat2] = (result[affix.stat2] || 0) + affix.value2;
    }
    return result;
}
/** v25.7 전설(등급 3) 이상은 +12, 그 아래는 +10까지 강화합니다. */
/** v27.93 스타포스 상한: 전설 이상 22성, 영웅 이하 15성. */
export const enhanceMaxFor = (item: Pick<Item, 'rarity'>) => starMax(item.rarity);
/** v25.7 판매가: 그 레벨 몬스터 골드 × 등급별 마리 수 + 강화에 쓴 골드의 30%. 분해(정수)와 판매(골드)가 실제 선택이 되도록 분해만 유리하던 식(위력×3)을 바꿨습니다. */
const SALE_FISH = [2, 6, 18, 50, 120, 300, 700], SALE_LEVEL_CAP = 65;
/** v27.27 상점 구매품 되팔기 비율. */
const SHOP_RESALE = .5;
export const saleValue = (item: Item) => {
    // 사냥터 난이도(차수)로 드롭 레벨이 몬스터 레벨보다 높아져도 판매가는 Lv.65까지만 따라갑니다(차수당 +5 레벨이 지수 곡선을 타고 폭주하지 않게).
    const drop = fishGoldAt(Math.min(SALE_LEVEL_CAP, item.level || 1)) * (SALE_FISH[item.rarity] ?? 2);
    // v27.27 상점에서 산 장비(구매·감정)는 구매가의 절반까지만 받습니다. 예전 구매품(paid 없음, id shop-)은 그 레벨의 감정가로 어림합니다.
    const paid = item.paid ?? (item.id?.startsWith('shop-') ? ECONOMY.gambleBase + (item.level || 1) * ECONOMY.gamblePerLevel : undefined);
    const base = paid !== undefined ? Math.min(drop, Math.floor(paid * SHOP_RESALE)) : drop;
    let spent = 0;
    for (let e = 0; e < (item.enhance || 0); e++) spent += enhanceCost({ ...item, enhance: e });
    return Math.floor(base + spent * ECONOMY.saleEnhanceRefund);
};
/** 대장장이의 기억 할인. 상태를 넘기지 않으면(도감·미리보기) 할인 전 가격입니다. */
const smith = (cost: number, s?: Pick<State, 'permanent'>) => s ? Math.floor(cost * smithDiscount(s)) : cost;
// v27.30 강화·옵션 재설정 비용은 Lv.40 위 장비부터 몬스터 골드 곡선(priceScale)만큼 커집니다.
/** 강화 1회 비용. 12성까지 전 공식, 13성부터 12성 비용 × growth^(성−12)(v27.93 스타포스). */
export const enhanceCost = (item: Item, s?: Pick<State, 'permanent'>) => { const n = item.enhance || 0, base = Math.min(n, STARFORCE.growthFrom); return smith(Math.floor((120 + item.power * 12) * (1 + base) ** 1.6 * priceScale(item.level || 1) * Math.pow(STARFORCE.growth, Math.max(0, n - STARFORCE.growthFrom))), s); };
/** v27.94 유물 옵션 이식 비용: 소비하는 장비의 옵션 재설정 골드 × RELIC_GROWTH.imprintCost. */
export const imprintCost = (source: Item, s?: Pick<State, 'permanent'>) => reforgeCost(source, s) * RELIC_GROWTH.imprintCost;
/** v27.94 유물 위력을 환생 횟수에 맞춥니다(기본 × (1 + 환생 × 4%)). 불러오기·환생·수령 때 불러 저장된 위력을 고칩니다. */
export function syncRelicPower(s: Pick<State, 'inventory' | 'equipment' | 'rebirths'>) {
    for (const item of [...s.inventory, ...Object.values(s.equipment)]) {
        const base = item?.relic && RELICS.find(r => r.id === item.relic);
        if (item && base) item.power = relicPower(base.power, s.rebirths || 0);
    }
}
export const reforgeCost = (item: Item, s?: Pick<State, 'permanent'>) => smith(Math.floor((250 + item.power * 25) * priceScale(item.level || 1)), s);
/** 분해로 얻는 정수와 옵션 하나 재설정에 드는 정수. */
export const dismantleEssence = (item: Item) => ESSENCE_BY_RARITY[item.rarity] ?? 1;
export const rerollCost = (item: Item, s?: Pick<State, 'permanent'>) => ({ gold: reforgeCost(item, s), essence: rerollEssence(item.rarity) });
export const itemDescription = (item: Item) => item.description || (item.slot === 'rod' ? (item.style === 'magic' ? '마법 특화' : item.style === 'physical' ? '물리 특화' : '물리·마법 겸용') + ' 낚싯대.' : item.slot === 'coat' ? '최대 체력·물리 방어·마법 방어를 높이는 방어구.' : '치명타 확률을 높이는 장신구.');
export function rollAffix(rarity: number, rng: () => number) { const x = AFFIXES[Math.floor(rng() * AFFIXES.length)]; return { stat: x.stat, name: x.name, value: x.value * Math.max(1, rarity) }; }
export function bulkItems(s: State, rarity: number) { return s.inventory.filter(i => i.rarity === rarity && !i.locked && !i.relic); }
