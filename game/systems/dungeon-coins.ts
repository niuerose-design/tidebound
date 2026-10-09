/** v3.201 던전 주화 지급과 주화 상점 판정(화면 · 행동 공용). 규칙과 가격은 data/dungeon-shop.ts. */
import type { Item, State } from '../types';
import { DUNGEON_COINS, DUNGEON_SHOP, DAILY_BONUS, DUNGEON_SHOP_DAILY, GEAR_BOX, GROWTH_GOODS, GROWTH_MAX_REBIRTHS, type GrowthGood, HUNTER_AFFIX, QUALITY_GOODS, abyssCoins, type QualityGood } from '../data/dungeon-shop';
import { ODDS } from '../data/odds';
import { dayKey } from '../data/time';
import { dungeonModeTier, type DungeonMode } from '../data/balance';
import { affixDef, affixQuality, HEIR_ROLL_TOP, optionAtQuality } from '../data/gear';
import { ONYX, onyxById } from '../data/onyx';
import { dungeonGoldMultiplier } from './stats';
import { bestHourly } from './income';

const modeOf = (mode: DungeonMode | undefined): DungeonMode => mode && dungeonModeTier(mode) ? mode : 'normal';
/** 이 정복 한 번의 기본 주화(주화 보너스 전). 무릉도장은 층, 지역 던전은 난이도와 하루 보너스 여부(bonus)로 정합니다. */
export const clearCoinBase = (dungeonId: string, mode: DungeonMode | undefined, depth = 1, bonus = false) => dungeonId === 'abyss' ? abyssCoins(depth) : (bonus ? DAILY_BONUS.coins : DUNGEON_COINS)[modeOf(mode)];
/** v3.201 오늘 남은 하루 보너스 정복 수(지역 던전 공용, 이월 없음). */
export const dailyBonusLeft = (s: Pick<State, 'dungeonBonus'>, now: number) => s.dungeonBonus?.day === dayKey(now) ? Math.max(0, DAILY_BONUS.clears - s.dungeonBonus.used) : DAILY_BONUS.clears;
/** v3.201 지역 던전 정복 한 번에 하루 보너스를 씁니다. 남아 있었으면 true. 무릉도장은 쓰지 않습니다. */
export function spendDailyBonus(s: State, dungeonId: string, now: number) {
    if (dungeonId === 'abyss' || dailyBonusLeft(s, now) <= 0) return false;
    const day = dayKey(now);
    s.dungeonBonus = { day, used: (s.dungeonBonus?.day === day ? s.dungeonBonus.used : 0) + 1 };
    return true;
}
/** 주화 보너스(던전 주화 보너스 능력치)를 곱해 줍니다. 소수점은 dungeonCoinFrac에 이월합니다. 받은 주화를 돌려줍니다. */
export function grantDungeonCoins(s: State, base: number) {
    const raw = base * dungeonGoldMultiplier(s) + (s.dungeonCoinFrac || 0), gain = Math.floor(raw);
    s.dungeonCoinFrac = raw - gain;
    s.dungeonCoins = (s.dungeonCoins || 0) + gain;
    return gain;
}
export const allItems = (s: Pick<State, 'inventory' | 'equipment'>) => [...s.inventory, ...Object.values(s.equipment)].filter((x): x is Item => !!x);
/** v3.201 오늘 산 칠흑 상품 수(제작 · 각성 합산). */
export const onyxBoughtToday = (s: Pick<State, 'dungeonShopDay'>, now: number) => boughtToday(s, 'onyx', now);
type DailyKey = 'onyx' | 'coreBox' | GrowthGood;
/** v3.201 오늘(한국 시간) 산 하루 한도 상품 수. */
export const boughtToday = (s: Pick<State, 'dungeonShopDay'>, key: DailyKey, now: number) => s.dungeonShopDay?.day === dayKey(now) ? s.dungeonShopDay[key] || 0 : 0;
/** 하루 한도 상품 구매를 하나 셉니다(날짜가 바뀌었으면 새로 시작). */
export function countBought(s: State, key: DailyKey, now: number) {
    const day = dayKey(now), row = s.dungeonShopDay?.day === day ? { ...s.dungeonShopDay } : { day };
    row[key] = (row[key] || 0) + 1;
    s.dungeonShopDay = row;
}
/** v3.201 성장권: 지금 사면 받는 골드 · 경험치(최근 24시간 중 최고 1시간 × 시간)와 못 사는 이유. */
export function growthOffer(s: State, good: GrowthGood, now: number) {
    const g = GROWTH_GOODS[good], gold = bestHourly(s.goldLog, s.playMs) * g.hours, exp = bestHourly(s.expLog, s.playMs) * g.hours;
    const reason = (s.rebirths || 0) >= GROWTH_MAX_REBIRTHS ? `환생 ${GROWTH_MAX_REBIRTHS}회 미만만 살 수 있습니다.`
        : boughtToday(s, good, now) >= g.perDay ? `하루 ${g.perDay}번까지입니다(한국 시간 자정에 초기화).`
        : gold <= 0 && exp <= 0 ? '최근 24시간 사냥 기록이 없습니다. 사냥터에서 잠시 사냥한 뒤 사세요.' : undefined;
    return { gold, exp, price: g.price, hours: g.hours, left: Math.max(0, g.perDay - boughtToday(s, good, now)), reason };
}
/** v3.201 전설 이상 장비 상자의 등급 가중치(전설 · 신화 · 고대 · 태초 순서가 아닌 등급 번호 그대로, 전설 미만은 0). */
export const gearBoxWeights = () => ODDS.drop.rarity.map((w, i) => i < GEAR_BOX.minRarity ? 0 : i >= GEAR_BOX.highFrom ? w * GEAR_BOX.highScale : w);
export function rollGearBoxRarity(rng: () => number) {
    const w = gearBoxWeights();
    let roll = rng() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) { roll -= w[i]; if (roll < 0) return i; }
    return w.length - 1;
}
/** 칠흑 장신구 상품: 가진 종이면 각성, 없으면 제작. 못 사는 이유가 있으면 reason. v3.201 제작 · 각성 합쳐 하루 1회. */
export function onyxOffer(s: State, bossId: string, now?: number) {
    const own = allItems(s).find(x => x.onyx === bossId), rank = own?.onyxRank || 0;
    const kind = own ? 'awaken' as const : 'craft' as const, price = own ? DUNGEON_SHOP.onyxAwaken : DUNGEON_SHOP.onyxCraft;
    const reason = !onyxById(bossId) ? '없는 칠흑 보스입니다.'
        : !(s.onyxBook?.[bossId]) ? '그 칠흑 보스를 한 번 이상 처치해야 열립니다.'
        : own && rank >= ONYX.awakenMax ? '각성을 모두 마쳤습니다.'
        : now !== undefined && onyxBoughtToday(s, now) >= DUNGEON_SHOP_DAILY.onyxPerDay ? `칠흑 상품은 하루 ${DUNGEON_SHOP_DAILY.onyxPerDay}번까지입니다(한국 시간 자정에 초기화).` : undefined;
    return { kind, price, rank, reason };
}
/** 포식자 각인을 받을 수 있는 장비인지. 못 받으면 이유. */
export function hunterBlock(item: Item) {
    const min = affixDef(HUNTER_AFFIX)?.minRarity ?? 5;
    if (item.relic) return '유물에는 각인할 수 없습니다.';
    if (item.rarity < min) return '고대 이상 장비에만 각인할 수 있습니다.';
    if (!item.affixes?.length) return '옵션이 없는 장비입니다.';
    if (item.affixes.some(x => x.id === HUNTER_AFFIX)) return '이미 포식자 옵션이 있습니다.';
    return undefined;
}
/** v3.201 옵션 줄의 지금 수치(0 = 최저, 1 = 보통 최고, 계승 최고 1.5까지). 규칙 · 고정 · 장식 옵션은 null. */
export function lineQuality(item: Item, index: number) {
    const x = item.affixes?.[index], def = x && affixDef(x.id);
    if (!x || !def || def.junk) return null;
    return affixQuality(x, item.power, item.rarity, item.level, HEIR_ROLL_TOP);
}
/** v3.201 수치 상품을 쓸 수 있는 줄(지금 수치가 목표 하한보다 낮은 줄). 유물은 이식 옵션이라 제외. */
export function qualityLines(item: Item, good: QualityGood) {
    if (item.relic || !item.affixes?.length) return [];
    const min = QUALITY_GOODS[good].min;
    return item.affixes.map((_, i) => i).filter(i => { const q = lineQuality(item, i); return q !== null && q < min - 1e-6; });
}
/** v3.201 고른 줄의 수치를 [min, max]에서 굴려 바꿉니다(이중 옵션은 두 수치를 함께). 바뀐 줄을 돌려줍니다. */
export function applyQuality(item: Item, index: number, good: QualityGood, rng: () => number) {
    const x = item.affixes![index], def = affixDef(x.id)!, { min, max } = QUALITY_GOODS[good];
    const q = min + (max - min) * rng(), next = optionAtQuality(def, item.power, item.rarity, item.level, q);
    const line = def.rollBoth ? { ...x, value: next.value, value2: next.value2 } : { ...x, value: next.value };
    item.affixes = item.affixes!.map((o, i) => i === index ? line : o);
    return { before: x, after: line };
}
export const QUALITY_PRICE: Record<QualityGood, number> = { quality100: DUNGEON_SHOP.quality100, quality120: DUNGEON_SHOP.quality120 };
