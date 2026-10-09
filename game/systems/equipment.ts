import type { Item, Stats, State } from '../types';
import { ECONOMY, AFFIXES, RELIC_GROWTH, GEAR_LEVEL_UP, PRIMAL_INHERIT, AWAKENING, heirPower, legacyRelicPower, smithDiscount, appraisalRebirthFactor, type HeirKind } from '../data/economy';
import { ESSENCE_BY_RARITY, rerollScaled, refineEssenceAt, REROLL_GOLD, GEAR_CAPS, STATUS_RESIST_STAR, HEIR_ROLL_TOP, rescaleAffix, affixDef, refineOption, rarityQuality, optionAtQuality, type ItemAffix } from '../data/gear';
import { RARITIES } from '../data/balance';
import { monsterGoldAt, priceScale } from '../data/world';
import { STARFORCE, starMax, starMultiplier } from '../data/starforce';
import { onyxAwaken, onyxScaledStat, isOnyxUnique, onyxPower } from '../data/onyx';

/** 가방과 장착 칸의 장비를 한 목록으로(장착 칸의 빈자리는 null). */
export const ownedItems = (s: Pick<State, 'inventory' | 'equipment'>): (Item | null)[] => [...s.inventory, ...Object.values(s.equipment)];
/** v27.36 장신구 치명타: 레벨·위력과 무관한 등급 고정값 × (1 + 강화 × CHARM_CRIT_ENHANCE). */
const CHARM_CRIT = [.03, .05, .07, .10, .12, .14, .16], CHARM_CRIT_ENHANCE = .05;
/** v3.5 망토 회피: 등급 고정값 × (1 + 별 × CAPE_EVASION_ENHANCE). 기민 외 회피 60%p 상한과 50% 이후 점감이 그대로 적용됩니다(태초 22성 ≈ +28%p). 속도는 주지 않습니다. */
const CAPE_EVASION = [.04, .06, .08, .11, .13, .15, .17], CAPE_EVASION_ENHANCE = .03;
export const capeEvasion = (item: Pick<Item, 'rarity' | 'enhance'>) => Math.round((CAPE_EVASION[item.rarity] ?? CAPE_EVASION[0]) * (1 + (item.enhance || 0) * CAPE_EVASION_ENHANCE) * 10000) / 10000;
const charmCrit = (item: Pick<Item, 'rarity' | 'enhance'>) => Math.round((CHARM_CRIT[item.rarity] ?? CHARM_CRIT[0]) * (1 + (item.enhance || 0) * CHARM_CRIT_ENHANCE) * 10000) / 10000;
/**
 * v27.36 등급별 고정 수치 감쇠(기본 수치와 고정 수치 옵션에 곱함). 고대·태초 장비가 최종 능력치의 대부분을 차지하던 것을 줄입니다. 저장된 위력은 그대로라 기존 장비에도 바로 적용됩니다.
 * v3.66 전투력(실제 전투식)에서 0성·22성 모두 전설 < 신화 < 고대 < 태초가 되도록 맞춘 값입니다. 큰 격차는 계승 장비(heir)에 둡니다.
 */
export const GEAR_RARITY_SCALE = [1, 1, 1, .85, .74, .62, .56];
const FLAT_GEAR_STATS = new Set(['attack', 'magic', 'hp', 'defense', 'resist', 'mana']);
/**
 * v3.129 부위별 고정 수치 배수(위력 × 별 × 등급 감쇠에 곱함).
 * 체력 · 방어 · 마방을 방어구 · 망토 · 장신구에 나눠 부위를 빼면 무기 35 · 방어구 48 · 장신구 32 · 망토 35%가 줄도록 맞췄습니다(docs/gear-endgame.md v3.129, scripts/check-gear-ladder.mjs가 검사).
 * 마나는 무기 .5 · 방어구 .5 · 장신구 .5 · 망토 .3(합 1.8)으로 나눕니다: 마나 비례 기술(천둥 성가 · 결정 파편 · 창세의 빛)과 마법 직업에 무기 · 장신구도 보탬이 되게. 무기 공격(물리 1.4 · 마법 .4 등)은 아래 그대로입니다.
 */
export const SLOT_GEAR: Record<string, Partial<Record<'hp' | 'mana' | 'defense' | 'resist', number>>> = {
    rod: { mana: .5 },
    coat: { hp: 3.5, mana: .5, defense: .6, resist: .3 },
    cape: { hp: 2.5, mana: .3 },
    charm: { hp: 2, mana: .5, defense: .4, resist: .2 },
};
/** 모든 장비 표기와 실제 적용은 같은 함수 사용. 옵션은 강화 배율과 독립. */
export function itemStats(item: Item): Partial<Stats> {
    const damp = GEAR_RARITY_SCALE[item.rarity] ?? 1;
    const p = item.power * starMultiplier(item.enhance || 0) * damp;
    const result: Partial<Stats> = {};
    if (item.slot === 'rod') {
        result.attack = p * (item.style === 'magic' ? .4 : item.style === 'physical' ? 1.4 : 1);
        result.magic = p * (item.style === 'magic' ? 1.4 : item.style === 'physical' ? .4 : .8);
    }
    // v3.129 체력 · 마나 · 방어 · 마방은 부위 표(SLOT_GEAR)대로.
    for (const [stat, mult] of Object.entries(SLOT_GEAR[item.slot] || {})) if (mult) result[stat as 'hp' | 'mana' | 'defense' | 'resist'] = p * mult;
    // v27.18 전체 치명타가 60%를 넘으면 그 몫은 극 치명타 확률이 됩니다.
    if (item.slot === 'charm') result.crit = charmCrit(item);
    if (item.slot === 'cape') result.evasion = capeEvasion(item);
    const scaled = (stat: string, n: number) => FLAT_GEAR_STATS.has(stat) && n > 0 ? n * damp : n;
    if (item.affix)
        result[item.affix.stat] = (result[item.affix.stat] || 0) + scaled(item.affix.stat, item.affix.value);
    for (const affix of item.affixes || []) {
        // v3.5 상태이상 저항만 별 보정(별당 +3%)을 받고 장비 합계 50%에서 막힙니다.
        // v3.75 고정 옵션(한 줌)은 등급 감쇠 없이 그대로입니다.
        // v3.113 칠흑 고유 옵션은 각성 단계만큼 커집니다(onyxAwaken, 제어 연장 턴 제외).
        const awaken = isOnyxUnique(item, affix.id) ? onyxAwaken(item) : 1;
        const value = affixDef(affix.id)?.fixed ? affix.value : affix.stat === 'statusResist' ? Math.min(GEAR_CAPS.statusResist!, affix.value * awaken * (1 + (item.enhance || 0) * STATUS_RESIST_STAR)) : scaled(affix.stat, onyxScaledStat(affix.stat, affix.value, awaken));
        result[affix.stat] = (result[affix.stat] || 0) + value;
        // v3.73 이중 옵션(위력 · 수호)의 둘째 고정 수치도 등급 감쇠를 받습니다. 양날 옵션의 손해(음수)는 그대로입니다.
        if (affix.stat2 && affix.value2) result[affix.stat2] = (result[affix.stat2] || 0) + scaled(affix.stat2, onyxScaledStat(affix.stat2, affix.value2, awaken));
    }
    return result;
}
/** v27.93 스타포스 상한: 전설 이상 22성, 영웅 이하 15성. */
/** v3.5 유물은 레벨이 별 상한을 정합니다: 12 + 레벨 ÷ 10(Lv.1 12성 · Lv.100 22성). 레벨 1인 유물에 22성을 싸게 박아 두는 것을 막습니다. */
export const enhanceMaxFor = (item: Pick<Item, 'rarity' | 'relic' | 'level'>) => item.relic ? Math.min(starMax(item.rarity), RELIC_GROWTH.starBase + Math.floor((item.level || 1) / 10)) : starMax(item.rarity);
/** v25.7 판매가: 그 레벨 몬스터 골드 × 등급별 마리 수 + 강화에 쓴 골드의 30%. 분해(정수)와 판매(골드)가 실제 선택이 되도록 맞춘 식입니다. */
const SALE_MONSTERS = [2, 6, 18, 50, 120, 300, 700], SALE_LEVEL_CAP = 65;
/** v27.27 상점 구매품 되팔기 비율. */
const SHOP_RESALE = .5;
export const saleValue = (item: Item) => {
    // 사냥터 난이도(차수)로 드롭 레벨이 몬스터 레벨보다 높아져도 판매가는 Lv.65까지만 따라갑니다(차수당 +5 레벨이 지수 곡선을 타고 폭주하지 않게).
    const drop = monsterGoldAt(Math.min(SALE_LEVEL_CAP, item.level || 1)) * (SALE_MONSTERS[item.rarity] ?? 2);
    // v27.27 상점에서 산 장비(구매·감정)는 구매가의 절반까지만 받습니다. 예전 구매품(paid 없음, id shop-)은 그 레벨의 감정가로 어림합니다.
    const paid = item.paid ?? (item.id?.startsWith('shop-') ? ECONOMY.gambleBase + (item.level || 1) * ECONOMY.gamblePerLevel : undefined);
    const base = paid !== undefined ? Math.min(drop, Math.floor(paid * SHOP_RESALE)) : drop;
    let spent = 0;
    for (let e = 0; e < (item.enhance || 0); e++) spent += enhanceCost({ ...item, enhance: e });
    return Math.floor(base + spent * ECONOMY.saleEnhanceRefund);
};
/** 대장장이 고용 할인. 상태를 넘기지 않으면(도감·미리보기) 할인 전 가격입니다. */
const smith = (cost: number, s?: Pick<State, 'permanent'>) => s ? Math.floor(cost * smithDiscount(s)) : cost;
// v27.30 강화·옵션 재설정 비용은 Lv.40 위 장비부터 몬스터 골드 곡선(priceScale)만큼 커집니다.
/** v3.81 영구 장비(유물 · 계승 · 칠흑) 강화 비용 배율: 1 + 환생 × permanentPerRebirth. 일반 장비는 1. */
export const permanentStarScale = (item: Pick<Item, 'relic' | 'onyx' | 'heir'>, s?: Partial<Pick<State, 'rebirths'>>) => keepsAcrossLives(item) ? 1 + Math.max(0, s?.rebirths || 0) * STARFORCE.permanentPerRebirth : 1;
/** 강화 1회 비용. 12성까지 전 공식, 13성부터 12성 비용 × growth^(성−12)(v27.93 스타포스). */
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
    for (const item of ownedItems(s)) {
        const kind = item && heirKind(item);
        if (!item || !kind) continue;
        const next = heirItemPower(item, kind, s.rebirths || 0, item.level || 1), before = item.power;
        if (next === before) continue;
        item.power = next;
        if (item.heir && item.affixes && before > 0) item.affixes = item.affixes.map(x => rescaleAffix(x, next / before, item.level || 1, item.level || 1));
    }
}
/**
 * v3.77 칠흑 장신구의 무작위 옵션을 최고 굴림으로 맞춥니다(고유 규칙 옵션은 그대로). 얻을 때 한 번, 이전 장신구는 불러올 때 한 번(onyxTuned).
 * v3.125 위력도 (레벨 + 2) × ONYX.power에 맞춥니다(계수가 5.2 → 6.37로 올라 이미 가진 장신구 보정). 고정 수치 옵션은 위력 비율만큼 함께 바뀝니다.
 */
export function tuneOnyx(item: Item) {
    if (!item.onyx) return;
    const next = onyxPower(item.level || 1), before = item.power;
    if (next !== before) { item.power = next; if (item.affixes && before > 0) item.affixes = item.affixes.map(x => rescaleAffix(x, next / before, item.level || 1, item.level || 1)); }
    if (item.onyxTuned) return;
    item.affixes = (item.affixes || []).map(x => x.rule ? x : refineOption(x, item.power, item.rarity, () => 1, item.level || 1));
    item.onyxTuned = true;
}
/**
 * v3.82 유물 옵션 이식: 고정 수치(공격 · 체력 · 방어 · 마나)의 이득 쪽은 장비 등급 감쇠를 받는데, 이식 줄은 유물(전설)의 감쇠 .85를 받아
 * 태초 · 고대에서 옮긴 이득이 원래보다 1.4~1.5배 커졌습니다. 이식할 때 '원래 장비 감쇠 ÷ 유물 감쇠'를 곱해 원래 장비에서와 같은 실효 수치로 맞춥니다.
 * 손해 쪽(음수)은 감쇠를 받지 않아 그대로입니다. srcRarity는 원래 장비 등급(맞춘 표시).
 * v3.215 레벨 환산: 유물 레벨보다 높은 장비에서 옮긴 고정 수치 줄은 (유물 레벨 + 2) ÷ (원래 레벨 + 2)로 낮춰 새깁니다(손해 쪽도 같이).
 * 레벨 올리기가 이식 줄도 (새 레벨 + 2) ÷ (옛 레벨 + 2)배 하므로, 전에는 낮은 레벨 유물에 Lv.100 줄을 옮긴 뒤 유물 레벨을 올리면 수치가 수십 배로 부풀었습니다.
 */
export function imprintAffix(affix: ItemAffix, srcRarity: number, relicRarity: number, srcLevel?: number, relicLevel?: number): ItemAffix {
    const ratio = (GEAR_RARITY_SCALE[srcRarity] ?? 1) / (GEAR_RARITY_SCALE[relicRarity] ?? 1);
    const def = affixDef(affix.id), lv = def?.kind === 'flat' && !def.fixed && !affix.rule && srcLevel && relicLevel ? Math.min(1, (relicLevel + 2) / (srcLevel + 2)) : 1;
    // 등급 감쇠는 고정 수치 능력치의 이득 쪽만, 레벨 환산은 레벨 올리기(rescaleAffix)가 키우는 수치에 똑같이 겁니다.
    const fix = (stat: string | undefined, n: number | undefined, levelled: boolean) => {
        if (!stat || !n) return n;
        const damp = n > 0 && FLAT_GEAR_STATS.has(stat) ? ratio : 1, scale = levelled ? lv : 1;
        return damp === 1 && scale === 1 ? n : Math.round(n * damp * scale);
    };
    return scaleImprintPercent({ ...affix, value: fix(affix.stat, affix.value, true)!, ...(affix.value2 !== undefined ? { value2: fix(affix.stat2, affix.value2, FLAT_GEAR_STATS.has(affix.stat2 || '')) } : {}), srcRarity }, srcRarity, relicRarity);
}
/**
 * v3.215 유물 이식 줄 상한: 원래 등급 장비가 유물과 같은 레벨에서 낼 수 있는 가장 큰 고정 수치(위력 굴림 ×1.2 · 수치 굴림 최고 HEIR_ROLL_TOP)를 이식 환산한 값.
 * 레벨 환산이 없던 때 낮은 레벨 유물에 높은 레벨 줄을 옮기고 유물 레벨을 올려 부푼 줄을 불러올 때 이 값으로 줄입니다. 늘리지는 않습니다.
 */
export function capRelicImprint(x: ItemAffix, relic: Pick<Item, 'rarity' | 'level'>): ItemAffix {
    const def = affixDef(x.id);
    if (!def || x.rule || def.fixed || def.kind !== 'flat') return x;
    const src = Math.min(RARITIES.length - 1, Math.max(0, x.srcRarity ?? RARITIES.length - 1)), level = relic.level || 1;
    const top = imprintAffix(optionAtQuality(def, Math.round((level + 2) * RARITIES[src].factor * 1.2), src, level, HEIR_ROLL_TOP), src, relic.rarity);
    const out = { ...x };
    if (x.value > top.value) out.value = top.value;
    if (x.value2 !== undefined && top.value2 !== undefined && x.value2 > 0 && top.value2 > 0 && x.value2 > top.value2) out.value2 = top.value2;
    return out;
}
/**
 * v3.141 비율 옵션(초월 · 포식자 · 파멸 · 관통 · 잔혹 · 감각 …)도 이식할 때 유물 등급 품질로 맞춥니다: 태초(품질 2.2)에서 전설 유물(1.6)로 옮기면 ×0.73.
 * 전에는 비율 줄만 태초 품질 그대로 옮겨져, 최고 굴림 3줄을 모은 유물이 같은 줄을 가진 태초보다도 강했습니다(docs/research-review.md 뒤 장비 점검).
 * 양날 옵션의 손해 쪽(음수)과 규칙 · 고정 옵션은 그대로. 유물보다 낮은 등급에서 온 줄은 올리지 않습니다. 보정한 줄은 pctFixed로 표시해 다시 손대지 않습니다.
 */
export function scaleImprintPercent(affix: ItemAffix, srcRarity: number, relicRarity: number): ItemAffix {
    const def = affixDef(affix.id);
    if (!def || affix.rule || def.kind !== 'percent' || def.fixed) return affix;
    const q = Math.min(1, rarityQuality(relicRarity) / rarityQuality(Math.max(srcRarity, relicRarity)));
    const pct = (n: number | undefined) => n && n > 0 ? Math.round(n * q * 10000) / 10000 : n;
    return { ...affix, value: pct(affix.value)!, ...(affix.value2 !== undefined ? { value2: pct(affix.value2) } : {}), pctFixed: true };
}
/** v3.82 원래 등급이 기록되지 않은 예전 이식 줄: 그 수치가 나올 수 있는 가장 낮은 등급(Lv.100 · 최고 굴림 기준)으로 봅니다. 실제보다 덜 깎이는 쪽입니다. */
export function guessImprintRarity(affix: ItemAffix, relicRarity: number) {
    const def = affixDef(affix.id);
    if (!def || affix.rule || def.fixed || !(affix.value > 0)) return relicRarity;
    // v3.141 비율 옵션: Lv.100 최고 굴림(기본 × 1.4 × 등급 품질)이 그 수치 이상이 되는 가장 낮은 등급.
    if (def.kind === 'percent') { for (let r = 0; r < RARITIES.length; r++) if (def.base * 1.4 * rarityQuality(r) >= affix.value - 1e-9) return r; return RARITIES.length - 1; }
    if (def.kind !== 'flat' || !FLAT_GEAR_STATS.has(affix.stat)) return relicRarity;
    for (let r = 0; r < RARITIES.length; r++) if (def.base * 102 * RARITIES[r].factor * 1.4 * rarityQuality(r) >= affix.value) return r;
    return RARITIES.length - 1;
}
/** v3.82 예전 유물 이식 줄을 한 번 맞춥니다(srcRarity가 없는 줄만). 전설보다 높은 등급에서 온 것이 확실한 줄만 줄어듭니다. */
export function fixRelicImprints(s: Pick<State, 'inventory' | 'equipment'>) {
    for (const item of ownedItems(s)) {
        if (!item?.relic || !item.affixes?.length) continue;
        // 짐작이 유물 등급보다 낮으면 올리지 않습니다(예전 줄은 깎기만, 잘못 짐작해 키우지 않음).
        item.affixes = item.affixes.map(x => x.srcRarity === undefined ? imprintAffix(x, Math.max(item.rarity, guessImprintRarity(x, item.rarity)), item.rarity) : x);
        // v3.141 원래 등급이 기록된 줄(v3.82~v3.139 이식)의 비율 옵션을 한 번 유물 품질로 맞춥니다.
        item.affixes = item.affixes.map(x => x.pctFixed || x.srcRarity === undefined ? x : scaleImprintPercent(x, x.srcRarity, item.rarity));
        // v3.215 레벨 올리기로 부푼 고정 수치 줄을 지금 유물 레벨의 최대치로 줄입니다(넘는 줄만, 여러 번 불러도 같음).
        item.affixes = item.affixes.map(x => capRelicImprint(x, item));
    }
}
/**
 * v3.66 계승(원시 각성 · 태초 계승 · v3.215 계승 드롭): 옵션은 최고 굴림으로 고정, 환생해도 남고 위력이 환생마다 오릅니다.
 * 부위마다 종류별 1개: 같은 부위의 예전 계승 장비는 이번 생 장비로 돌아갑니다(다음 환생 때 사라짐). 돌아간 장비를 돌려줍니다.
 * item은 가방이나 장착 칸에 있어야 위력이 맞춰집니다(syncRelicPower).
 */
export function inheritGear(s: Pick<State, 'inventory' | 'equipment' | 'rebirths'>, item: Item, kind: 'ancient' | 'primal') {
    const old = ownedItems(s).find(x => x && x !== item && x.heir === kind && x.slot === item.slot) || undefined;
    if (old) { delete old.heir; const was = old.power; old.power = Math.round((old.level + 2) * RARITIES[old.rarity].factor); if (old.affixes && was > 0) old.affixes = old.affixes.map(x => rescaleAffix(x, old.power / was, old.level, old.level)); }
    item.heir = kind; item.locked = true;
    if (item.affixes) item.affixes = item.affixes.map(x => refineOption(x, item.power, item.rarity, () => 1, item.level));
    syncRelicPower(s);
    return old;
}
/** v3.5 레벨 올리기 목표 레벨: 지금 레벨 + step, 내 레벨까지. 더 올릴 수 없으면 null. */
export const levelUpTarget = (item: Pick<Item, 'level'>, s: Pick<State, 'level'>) => { const cur = item.level || 1, next = Math.min(cur + GEAR_LEVEL_UP.step, s.level); return next > cur ? next : null; };
export const levelUpCost = (item: Item, s: Pick<State, 'permanent' | 'level'>) => { const next = levelUpTarget(item, s) ?? (item.level || 1) + GEAR_LEVEL_UP.step; return smith(Math.floor((250 + item.power * 25) * priceScale(next) * GEAR_LEVEL_UP.costMultiplier), s); };
/** 레벨 올리기 적용: 위력·고정 수치 옵션은 (새 레벨 + 2) ÷ (옛 레벨 + 2)배, 유물·계승 장비 위력은 heirPower로, 칠흑은 onyxPower로 다시 계산, 별·하락 횟수는 0. */
export function applyLevelUp(item: Item, next: number, s: Pick<State, 'rebirths'>) {
    const old = item.level || 1, ratio = (next + 2) / (old + 2);
    item.level = next;
    const kind = heirKind(item);
    item.power = kind ? heirItemPower(item, kind, s.rebirths || 0, next) : item.onyx ? onyxPower(next) : Math.max(2, Math.round(item.power * ratio));
    if (item.affixes) item.affixes = item.affixes.map(x => rescaleAffix(x, ratio, old, next));
    item.enhance = 0; item.starFails = 0;
}
export const reforgeCost = (item: Item, s?: Pick<State, 'permanent'>) => smith(Math.floor((250 + item.power * 25) * priceScale(item.level || 1)), s);
/** v3.75 착용 장비 옵션 합계(희귀 옵션 수련 · 전공 · 정수처럼 능력치 계산 밖에서 쓰는 값). */
export const equippedAffixTotal = (s: Pick<State, 'equipment'> | undefined, stat: string) => Object.values(s?.equipment || {}).reduce((sum, item) => sum + (item?.affixes || []).reduce((n, a) => n + (a.stat === stat ? a.value : 0), 0), 0);
/** 분해 정수. v3.75 착용 장비의 정수 옵션만큼 늘어납니다(장비마다 반올림). */
export const dismantleEssence = (item: Item, s?: Pick<State, 'equipment'>) => Math.round((ESSENCE_BY_RARITY[item.rarity] ?? 1) * (1 + equippedAffixTotal(s, 'essenceBonus')));
/** v3.66 태초 계승 게이지에 쌓이는 분해: 태초 등급(칠흑 장신구 제외)이면 1. */
export const primalGaugeOf = (item: Pick<Item, 'rarity' | 'onyx'>) => item.rarity >= 6 && !item.onyx ? 1 : 0;
/**
 * v3.125 태초가 손을 떠나는 모든 길에서 계승 게이지가 찹니다: 분해뿐 아니라 강화 파괴 · 판매(단일 · 일괄 · 자동 · 청산) · 물건도감 등록 · 유물 이식 소비.
 * 얻은 양을 돌려주고, 장비를 목록에서 빼는 것은 부르는 쪽이 합니다.
 */
export function primalGaugeGain(s: Pick<State, 'primalGauge'>, items: Pick<Item, 'rarity' | 'onyx'>[]) {
    const gauge = items.reduce((n, i) => n + primalGaugeOf(i), 0);
    if (gauge) s.primalGauge = (s.primalGauge || 0) + gauge;
    return gauge;
}
/** 게이지가 찼을 때 기록 줄에 붙이는 꼬리(없으면 빈 문자열). */
export const primalGaugeNote = (s: Pick<State, 'primalGauge'>, gauge: number) => gauge ? ` · 태초 계승 게이지 +${gauge} (${s.primalGauge || 0}/${PRIMAL_INHERIT.gauge})` : '';
/** 분해 정산: 정수(× rate)와 태초 계승 게이지를 더하고 얻은 양을 돌려줍니다. 장비를 목록에서 빼는 것은 부르는 쪽이 합니다. */
export function dismantleInto(s: Pick<State, 'essence' | 'primalGauge'> & Partial<Pick<State, 'equipment'>>, items: Item[], rate = 1) {
    const essence = Math.floor(items.reduce((sum, i) => sum + dismantleEssence(i, s as Pick<State, 'equipment'>), 0) * rate), gauge = primalGaugeGain(s, items);
    s.essence = (s.essence || 0) + essence;
    return { essence, gauge };
}
/** v27.94 재설정 비용은 이 장비를 재설정한 횟수만큼 오릅니다(1회마다 +10%, 상한 없음). v3.118 골드만(기본 × REROLL_GOLD × 감정 환생 배율), 정수 없음. */
export const rerollCost = (item: Item, s?: Pick<State, 'permanent'> & Partial<Pick<State, 'rebirths'>>) => ({ gold: Math.floor(rerollScaled(reforgeCost(item, s) * REROLL_GOLD * appraisalRebirthFactor(s?.rebirths || 0), item.rerolls)), essence: 0 });
/** v3.131 재련 환생 배율: 원시 각성과 같은 10^(환생 ÷ AWAKENING.rebirthScale). 난이도(≈ 환생) 사냥의 정수 수입이 비슷한 기울기로 오르기 때문입니다. */
export const refineRebirthFactor = (rebirths = 0) => Math.pow(10, Math.max(0, rebirths) / AWAKENING.rebirthScale);
/** v27.94 수치 재련 비용. v3.118 골드 없이 정수만, 이 장비를 재련할수록 ×1.08씩(refineEssenceAt). */
export const refineCost = (item: Item, s?: Partial<Pick<State, 'rebirths'>>) => ({ gold: 0, essence: refineEssenceAt(item.rarity, item.refines, refineRebirthFactor(s?.rebirths || 0)) });
/** v3.118 비용 초기화(원시 고대 · 계승 태초 · 칠흑): 세계석으로 재련 · 재설정 횟수를 0으로, 대신 별과 추가 옵션이 초기화됩니다. */
export const canResetGear = (item: Pick<Item, 'heir' | 'onyx'>) => !!(item.heir || item.onyx);
/** v3.125 재련 굴림 폭 배율: 원시 고대 · 계승 태초 · 칠흑은 HEIR_ROLL_TOP(수치 150%까지), 그 밖은 1(100%). 화면의 ‘수치 N%’도 같은 값을 씁니다. */
export const refineTopOf = (item: Pick<Item, 'heir' | 'onyx'>) => canResetGear(item) ? HEIR_ROLL_TOP : 1;
export const itemDescription = (item: Item) => item.description || (item.slot === 'rod' ? (item.style === 'magic' ? '마법 특화' : item.style === 'physical' ? '물리 특화' : '물리·마법 겸용') + ' 낚싯대.' : item.slot === 'coat' ? '최대 체력·최대 마나·물리 방어·마법 방어를 높이는 방어구.' : item.slot === 'cape' ? '회피와 체력·마나를 높이는 망토. 상태이상 저항 옵션은 망토에만 붙습니다.' : '치명타 확률과 체력·물리 방어·마법 방어를 높이는 장신구.');
export function rollAffix(rarity: number, rng: () => number) { const x = AFFIXES[Math.floor(rng() * AFFIXES.length)]; return { stat: x.stat, name: x.name, value: x.value * Math.max(1, rarity) }; }
export function bulkItems(s: State, rarity: number) { return s.inventory.filter(i => i.rarity === rarity && !i.locked && !keepsAcrossLives(i)); }
