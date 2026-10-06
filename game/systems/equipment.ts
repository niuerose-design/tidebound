import type { Item, Stats, State } from '../types';
import { ECONOMY, AFFIXES, RELIC_GROWTH, GEAR_LEVEL_UP, heirPower, legacyRelicPower, smithDiscount, type HeirKind } from '../data/economy';
import { ESSENCE_BY_RARITY, rerollEssence, rerollScaled, refineEssence, GEAR_CAPS, STATUS_RESIST_STAR, rescaleAffix, affixDef, refineOption, rarityQuality, type ItemAffix } from '../data/gear';
import { RARITIES } from '../data/balance';
import { fishGoldAt, priceScale } from '../data/world';
import { STARFORCE, starMax, starMultiplier } from '../data/starforce';
/** 모든 장비 표기와 실제 적용은 같은 함수 사용. 옵션은 강화 배율과 독립. */
/** 장신구: 위력 1당 치명타 +0.2%p. */
/** v27.36 장신구 치명타: 레벨·위력과 무관한 등급 고정값 × (1 + 강화 × CHARM_CRIT_ENHANCE). 예전 위력 × 0.2%는 Lv.60 전설 +10 하나로 100%를 넘었습니다. */
const CHARM_CRIT = [.03, .05, .07, .10, .12, .14, .16], CHARM_CRIT_ENHANCE = .05;
/** v3.5 망토 회피: 등급 고정값 × (1 + 별 × CAPE_EVASION_ENHANCE). 기민 외 회피 60%p 상한과 50% 이후 점감이 그대로 적용됩니다(태초 22성 ≈ +28%p). 속도는 주지 않습니다. */
const CAPE_EVASION = [.04, .06, .08, .11, .13, .15, .17], CAPE_EVASION_ENHANCE = .03;
export const capeEvasion = (item: Pick<Item, 'rarity' | 'enhance'>) => Math.round((CAPE_EVASION[item.rarity] ?? CAPE_EVASION[0]) * (1 + (item.enhance || 0) * CAPE_EVASION_ENHANCE) * 10000) / 10000;
const charmCrit = (item: Pick<Item, 'rarity' | 'enhance'>) => Math.round((CHARM_CRIT[item.rarity] ?? CHARM_CRIT[0]) * (1 + (item.enhance || 0) * CHARM_CRIT_ENHANCE) * 10000) / 10000;
/**
 * v27.36 등급별 고정 수치 감쇠(기본 수치와 고정 수치 옵션에 곱함). 고대·태초 장비가 최종 능력치의 대부분을 차지하던 것을 줄입니다. 저장된 위력은 그대로라 기존 장비에도 바로 적용됩니다.
 * v3.66 전투력(실제 전투식)에서 0성·22성 모두 전설 < 신화 < 고대 < 태초가 되도록 고대 .58 → .62, 태초 .52 → .56으로 올렸습니다(내린 등급 없음). v3.72 신화 .68 → .72(옵션 풀이 바뀐 뒤 전설과 겹쳐서). 큰 격차는 계승 장비(heir)에 둡니다.
 */
export const GEAR_RARITY_SCALE = [1, 1, 1, .85, .74, .62, .56];
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
        // v3.89 체력을 주는 부위(방어구 · 망토)는 최대 마나도 줍니다(방어구 위력 ×1 · 망토 ×0.3, 최대 마나가 체력의 약 0.2배가 되게).
        result.mana = p;
        result.defense = p;
        result.resist = p * .5;
    }
    // v27.18 장신구 치명타에 더는 15% 상한이 없습니다. 전체 치명타가 60%를 넘으면 그 몫은 극 치명타 확률이 됩니다.
    if (item.slot === 'charm') result.crit = charmCrit(item);
    if (item.slot === 'cape') { result.evasion = capeEvasion(item); result.hp = p * 2; result.mana = p * .3; }
    const scaled = (stat: string, n: number) => FLAT_GEAR_STATS.has(stat) && n > 0 ? n * damp : n;
    if (item.affix)
        result[item.affix.stat] = (result[item.affix.stat] || 0) + scaled(item.affix.stat, item.affix.value);
    for (const affix of item.affixes || []) {
        // v3.5 상태이상 저항만 별 보정(별당 +3%)을 받고 장비 합계 50%에서 막힙니다.
        // v3.75 고정 옵션(한 줌)은 등급 감쇠 없이 그대로입니다.
        const value = affixDef(affix.id)?.fixed ? affix.value : affix.stat === 'statusResist' ? Math.min(GEAR_CAPS.statusResist!, affix.value * (1 + (item.enhance || 0) * STATUS_RESIST_STAR)) : scaled(affix.stat, affix.value);
        result[affix.stat] = (result[affix.stat] || 0) + value;
        // v3.73 이중 옵션(위력 · 수호)의 둘째 고정 수치도 등급 감쇠를 받습니다. 양날 옵션의 손해(음수)는 그대로입니다.
        if (affix.stat2 && affix.value2) result[affix.stat2] = (result[affix.stat2] || 0) + scaled(affix.stat2, affix.value2);
    }
    return result;
}
/** v25.7 전설(등급 3) 이상은 +12, 그 아래는 +10까지 강화합니다. */
/** v27.93 스타포스 상한: 전설 이상 22성, 영웅 이하 15성. */
/** v3.5 유물은 레벨이 별 상한을 정합니다: 12 + 레벨 ÷ 10(Lv.1 12성 · Lv.100 22성). 레벨 1인 유물에 22성을 싸게 박아 두는 것을 막습니다. */
export const enhanceMaxFor = (item: Pick<Item, 'rarity' | 'relic' | 'level'>) => item.relic ? Math.min(starMax(item.rarity), RELIC_GROWTH.starBase + Math.floor((item.level || 1) / 10)) : starMax(item.rarity);
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
/** v3.81 영구 장비(유물 · 계승 · 칠흑) 강화 비용 배율: 1 + 환생 × permanentPerRebirth. 일반 장비는 1. */
export const permanentStarScale = (item: Pick<Item, 'relic' | 'onyx' | 'heir'>, s?: Partial<Pick<State, 'rebirths'>>) => keepsAcrossLives(item) ? 1 + Math.max(0, s?.rebirths || 0) * STARFORCE.permanentPerRebirth : 1;
export const enhanceCost = (item: Item, s?: Pick<State, 'permanent'> & Partial<Pick<State, 'rebirths'>>) => { const n = item.enhance || 0, base = Math.min(n, STARFORCE.growthFrom); return smith(Math.floor((120 + item.power * 12) * (1 + base) ** 1.6 * priceScale(item.level || 1) * Math.pow(STARFORCE.growth, Math.max(0, n - STARFORCE.growthFrom)) * permanentStarScale(item, s)), s); };
/** v3.3 유물 옵션 이식 비용: 소비하는 장비의 옵션 재설정 골드 × RELIC_GROWTH.imprintCost. */
export const imprintCost = (source: Item, s?: Pick<State, 'permanent'>) => reforgeCost(source, s) * RELIC_GROWTH.imprintCost;
/** v3.66 환생해도 남는 장비: 유물 · 칠흑 장신구 · 계승 장비(원시 고대 · 계승 태초). 판매·분해·도감 등록·청산 대상이 아닙니다. */
export const keepsAcrossLives = (item: Pick<Item, 'relic' | 'onyx' | 'heir'>) => !!(item.relic || item.onyx || item.heir);
/** v3.66 계승 위력 종류: 유물은 relic, 계승 장비는 heir 값. 일반 장비는 null. */
export const heirKind = (item: Pick<Item, 'relic' | 'heir'>): HeirKind | null => item.relic ? 'relic' : item.heir || null;
/** 유물·계승 장비의 위력. 예전부터 가진 유물(relicLegacy)은 예전 공식과 새 공식 중 높은 쪽입니다. */
export const heirItemPower = (item: Pick<Item, 'relic' | 'heir' | 'relicLegacy'>, kind: HeirKind, rebirths: number, level: number) => Math.max(heirPower(kind, rebirths, level), item.relic && item.relicLegacy ? legacyRelicPower(item.relic, rebirths, level) : 0);
/** v3.3 유물 · v3.66 계승 장비 위력을 환생 횟수와 레벨에 맞춥니다(heirPower). 불러오기·환생·수령·계승 때 불러 저장된 위력을 고칩니다. 계승 장비의 고정 수치 옵션은 위력 비율만큼 함께 바뀝니다(유물 이식 옵션은 그대로). */
export function syncRelicPower(s: Pick<State, 'inventory' | 'equipment' | 'rebirths'>) {
    for (const item of [...s.inventory, ...Object.values(s.equipment)]) {
        const kind = item && heirKind(item);
        if (!item || !kind) continue;
        const next = heirItemPower(item, kind, s.rebirths || 0, item.level || 1), before = item.power;
        if (next === before) continue;
        item.power = next;
        if (item.heir && item.affixes && before > 0) item.affixes = item.affixes.map(x => rescaleAffix(x, next / before, item.level || 1, item.level || 1));
    }
}
/** v3.77 칠흑 장신구의 무작위 옵션을 최고 굴림으로 맞춥니다(고유 규칙 옵션은 그대로). 얻을 때 한 번, 이전 장신구는 불러올 때 한 번(onyxTuned). */
export function tuneOnyx(item: Item) {
    if (!item.onyx || item.onyxTuned) return;
    item.affixes = (item.affixes || []).map(x => x.rule ? x : refineOption(x, item.power, item.rarity, () => 1, item.level || 1));
    item.onyxTuned = true;
}
/**
 * v3.82 유물 옵션 이식: 고정 수치(공격 · 체력 · 방어 · 마나)의 이득 쪽은 장비 등급 감쇠를 받는데, 이식 줄은 유물(전설)의 감쇠 .85를 받아
 * 태초 · 고대에서 옮긴 이득이 원래보다 1.4~1.5배 커졌습니다. 이식할 때 '원래 장비 감쇠 ÷ 유물 감쇠'를 곱해 원래 장비에서와 같은 실효 수치로 맞춥니다.
 * 손해 쪽(음수)은 감쇠를 받지 않아 그대로입니다. srcRarity는 원래 장비 등급(맞춘 표시).
 */
export function imprintAffix(affix: ItemAffix, srcRarity: number, relicRarity: number): ItemAffix {
    const ratio = (GEAR_RARITY_SCALE[srcRarity] ?? 1) / (GEAR_RARITY_SCALE[relicRarity] ?? 1);
    const fix = (stat: string | undefined, n: number | undefined) => stat && n && n > 0 && FLAT_GEAR_STATS.has(stat) ? Math.round(n * ratio) : n;
    return { ...affix, value: fix(affix.stat, affix.value)!, ...(affix.value2 !== undefined ? { value2: fix(affix.stat2, affix.value2) } : {}), srcRarity };
}
/** v3.82 원래 등급이 기록되지 않은 예전 이식 줄: 그 수치가 나올 수 있는 가장 낮은 등급(Lv.100 · 최고 굴림 기준)으로 봅니다. 실제보다 덜 깎이는 쪽입니다. */
export function guessImprintRarity(affix: ItemAffix, relicRarity: number) {
    const def = affixDef(affix.id);
    if (!def || def.kind !== 'flat' || !FLAT_GEAR_STATS.has(affix.stat) || !(affix.value > 0)) return relicRarity;
    for (let r = 0; r < RARITIES.length; r++) if (def.base * 102 * RARITIES[r].factor * 1.4 * rarityQuality(r) >= affix.value) return r;
    return RARITIES.length - 1;
}
/** v3.82 예전 유물 이식 줄을 한 번 맞춥니다(srcRarity가 없는 줄만). 전설보다 높은 등급에서 온 것이 확실한 줄만 줄어듭니다. */
export function fixRelicImprints(s: Pick<State, 'inventory' | 'equipment'>) {
    for (const item of [...s.inventory, ...Object.values(s.equipment)]) {
        if (!item?.relic || !item.affixes?.length) continue;
        // 짐작이 유물 등급보다 낮으면 올리지 않습니다(예전 줄은 깎기만, 잘못 짐작해 키우지 않음).
        item.affixes = item.affixes.map(x => x.srcRarity === undefined ? imprintAffix(x, Math.max(item.rarity, guessImprintRarity(x, item.rarity)), item.rarity) : x);
    }
}
/** v3.5 레벨 올리기 목표 레벨: 지금 레벨 + step, 내 레벨까지. 더 올릴 수 없으면 null. */
/** v3.13 +step이 내 레벨을 넘으면 내 레벨까지만 올립니다(전에는 Lv.91 장비가 최대 레벨 100에서 Lv.101을 요구해 영원히 막혔음). */
export const levelUpTarget = (item: Pick<Item, 'level'>, s: Pick<State, 'level'>) => { const cur = item.level || 1, next = Math.min(cur + GEAR_LEVEL_UP.step, s.level); return next > cur ? next : null; };
export const levelUpCost = (item: Item, s: Pick<State, 'permanent' | 'level'>) => { const next = levelUpTarget(item, s) ?? (item.level || 1) + GEAR_LEVEL_UP.step; return smith(Math.floor((250 + item.power * 25) * priceScale(next) * GEAR_LEVEL_UP.costMultiplier), s); };
/** 레벨 올리기 적용: 위력·고정 수치 옵션은 (새 레벨 + 2) ÷ (옛 레벨 + 2)배, 유물·계승 장비 위력은 heirPower로 다시 계산, 별·하락 횟수는 0. */
export function applyLevelUp(item: Item, next: number, s: Pick<State, 'rebirths'>) {
    const old = item.level || 1, ratio = (next + 2) / (old + 2);
    item.level = next;
    const kind = heirKind(item);
    item.power = kind ? heirItemPower(item, kind, s.rebirths || 0, next) : Math.max(2, Math.round(item.power * ratio));
    if (item.affixes) item.affixes = item.affixes.map(x => rescaleAffix(x, ratio, old, next));
    item.enhance = 0; item.starFails = 0;
}
export const reforgeCost = (item: Item, s?: Pick<State, 'permanent'>) => smith(Math.floor((250 + item.power * 25) * priceScale(item.level || 1)), s);
/** 분해로 얻는 정수와 옵션 하나 재설정에 드는 정수. */
/** v3.75 착용 장비 옵션 합계(희귀 옵션 수련 · 전공 · 정수처럼 능력치 계산 밖에서 쓰는 값). */
export const equippedAffixTotal = (s: Pick<State, 'equipment'> | undefined, stat: string) => Object.values(s?.equipment || {}).reduce((sum, item) => sum + (item?.affixes || []).reduce((n, a) => n + (a.stat === stat ? a.value : 0), 0), 0);
/** 분해 정수. v3.75 착용 장비의 정수 옵션만큼 늘어납니다(장비마다 반올림). */
export const dismantleEssence = (item: Item, s?: Pick<State, 'equipment'>) => Math.round((ESSENCE_BY_RARITY[item.rarity] ?? 1) * (1 + equippedAffixTotal(s, 'essenceBonus')));
/** v3.66 태초 계승 게이지에 쌓이는 분해: 태초 등급(칠흑 장신구 제외)이면 1. */
export const primalGaugeOf = (item: Pick<Item, 'rarity' | 'onyx'>) => item.rarity >= 6 && !item.onyx ? 1 : 0;
/** 분해 정산: 정수(× rate)와 태초 계승 게이지를 더하고 얻은 양을 돌려줍니다. 장비를 목록에서 빼는 것은 부르는 쪽이 합니다. */
export function dismantleInto(s: Pick<State, 'essence' | 'primalGauge'> & Partial<Pick<State, 'equipment'>>, items: Item[], rate = 1) {
    const essence = Math.floor(items.reduce((sum, i) => sum + dismantleEssence(i, s as Pick<State, 'equipment'>), 0) * rate), gauge = items.reduce((n, i) => n + primalGaugeOf(i), 0);
    s.essence = (s.essence || 0) + essence;
    if (gauge) s.primalGauge = (s.primalGauge || 0) + gauge;
    return { essence, gauge };
}
/** v27.94 재설정 비용은 이 장비를 재설정한 횟수만큼 오릅니다(1회마다 +10%, 상한 없음). */
export const rerollCost = (item: Item, s?: Pick<State, 'permanent'>) => ({ gold: Math.floor(rerollScaled(reforgeCost(item, s), item.rerolls)), essence: Math.ceil(rerollScaled(rerollEssence(item.rarity), item.rerolls)) });
/** v27.94 수치 재련 비용: 재설정 기본 비용의 절반, 횟수에 따라 오르지 않습니다. */
export const refineCost = (item: Item, s?: Pick<State, 'permanent'>) => ({ gold: Math.floor(reforgeCost(item, s) / 2), essence: refineEssence(item.rarity) });
export const itemDescription = (item: Item) => item.description || (item.slot === 'rod' ? (item.style === 'magic' ? '마법 특화' : item.style === 'physical' ? '물리 특화' : '물리·마법 겸용') + ' 낚싯대.' : item.slot === 'coat' ? '최대 체력·최대 마나·물리 방어·마법 방어를 높이는 방어구.' : item.slot === 'cape' ? '회피와 체력·마나를 조금 높이는 망토. 상태이상 저항 옵션은 망토에만 붙습니다.' : '치명타 확률을 높이는 장신구.');
export function rollAffix(rarity: number, rng: () => number) { const x = AFFIXES[Math.floor(rng() * AFFIXES.length)]; return { stat: x.stat, name: x.name, value: x.value * Math.max(1, rarity) }; }
export function bulkItems(s: State, rarity: number) { return s.inventory.filter(i => i.rarity === rarity && !i.locked && !keepsAcrossLives(i)); }
