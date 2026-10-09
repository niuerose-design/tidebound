/** 적 등장·드롭·승리 보상. */
import { rollAffixes, syncOrnateName } from '../data/gear';
import { ODDS } from '../data/odds';
import { vocationTargets, thresholdRank, abyssPearls, ABYSS_SP_MILESTONES, abyssFloorBonus } from '../data/long-term';
import { jobMasteryTarget, extremeStage, extremeFinalMultiplier } from './progression';
import { EXTREME_STAGES } from '../data/long-term';
import { killReward, encounterTier, dungeonKillReward, dungeonLevelAt, xpWall, tierHealth, tierAttack } from './meta';
import { stats, dropRate, goldMultiplier, expMultiplier } from './stats';
import { supportMultiplier } from './support';
import { recordExpIncome, recordMasteryIncome } from './income';
import { rollBossLoot, syncAbyssCores } from './boss-loot';
import { grantDungeonCoins, clearCoinBase, spendDailyBonus, dailyBonusLeft } from './dungeon-coins';
import { DAILY_BONUS } from '../data/dungeon-shop';
import { victoryMastery, researchMastery, masteryMultipliers } from './mastery';
import { inventoryCap, researchRank, autoGrades, PRIMAL_DROP_PITY } from '../data/economy';
import { rareSpawnBonus } from './book';
import { VARIANTS, VARIANT_BOOK_MIN, variantById, variantChances, rollSwarmSize, rollHabitatSwarm } from '../data/variants';
import { MIMIC, LETTER, letterRank, rollMimicMastery, mimicChance, specialLuck, specialOfflineScale } from '../data/mimic';
import { ascended, ascensionMastery } from '../data/ascension';
import { EXP_NURI, rollNuriTier, nuriChance, nuriEligible } from '../data/exp-nuri';
import { ESSENCE_SLIME, rollSlimeTier, slimeChance, slimeEligible, slimeBundle } from '../data/essence-slime';
import { KING, kingReady, isSpecialId, type KingKind } from '../data/king';
import { RANKS, rankState, rankIndex, rankPerkLevel, rankPerkValue, swarmRankKills, swarmMasteryKills } from '../data/rank';
import { roughHeal, lv1Active } from './vows';
import { sproutHeal } from '../data/sprout';
import type { State, Item, Stats, Enemy } from '../types';
import { BALANCE, MONSTER_TUNING, RARITIES, xpNeeded, DUNGEON_TUNING, BOSS_PRESSURE_WAVE } from '../data/balance';
import { MONSTERS, STAGES, HABITAT, isHabitat, swarmHpMultiplier, swarmAttackMultiplier, swarmDropRolls, swarmRewardMultiplier, SWARM_BIG, SWARM_ESSENCE_PER_ITEM, stageStatMonster, tideLiftMonster, expLevelScale, stageRewardNorm, stageDepth, dungeonDepth, monsterById, stageById, dungeonById } from '../data/world';
import { jobById } from '../data/classes';
import { HACKER_ID } from '../data/hacker';
import { skillById } from '../data/skills';
import { gearName } from '../data/maple-gear';
import { PROGRESSION } from '../data/progression';
import { canUse, grantJobSkills, itemKey, jobMastered } from './progression';
import { dismantleInto, primalGaugeGain, primalGaugeNote, saleValue, keepsAcrossLives, equippedAffixTotal, ownedItems } from './equipment';
import { scaledEnemyStats, abyssEnemyStats, foeSkills } from '../data/encounters';
import { ONYX, onyxBossFor, onyxById, onyxChance, ownedOnyx, onyxSetBonus } from '../data/onyx';
import { offlineTally } from './offline-tally';
import { grantOnyx } from './onyx-grant';
import { recordGoal, recordAbyssDepth } from './progress';
import { addLog, endRun } from './state';
import { continueRepeat } from './dungeon-run';
/** 처치 1회당 회복량. 무리 규모와 관계없이 처치마다 한 번 적용합니다(응급처치 포함). */
export function victoryHeal(s: State, a = stats(s)) {
    return Math.floor(a.hp * victoryHealRate(s));
}
/** 쌓인 경험치로 올릴 수 있는 만큼 레벨을 올립니다(최대 Lv.100). */
export function gainLevels(s: State) {
    // v3.210 LV1 모험가: 레벨이 오르지 않고 경험치도 쌓지 않습니다.
    if (lv1Active(s)) { s.exp = 0; return; }
    while (s.exp >= xpNeeded(s.level, s.rebirths, xpWall(s)) && s.level < 100) {
        s.exp -= xpNeeded(s.level, s.rebirths, xpWall(s));
        s.level++;
        s.statPoints += PROGRESSION.statPerLevel;
        if (s.level > s.peakLevel) s.peakLevel = s.level;
        const grown = stats(s);
        s.mana = grown.mana;
        s.hp = grown.hp;
        addLog(s, `레벨 ${s.level} 달성! 능력치가 상승했습니다.`);
    }
}
/** v27.86 옛 ‘잠든 힘’ 봉인이 남은 세이브: 쌓인 경험치를 그대로 지급하고 봉인을 지웁니다(서약은 v27.86에 없어짐). 레벨은 호출한 쪽에서 올립니다. */
export function releaseLegacySeal(s: State) {
    const seal = s.vows?.seal;
    if (!seal) return 0;
    s.exp += seal.exp;
    delete s.vows!.seal; delete s.vows!.anchor;
    addLog(s, `잠든 힘 서약이 없어져 봉인을 풀었습니다 · 쌓인 경험치 +${seal.exp} EXP`, 'reward');
    return seal.exp;
}
/** 처치 후 회복률. v27.8 사냥터는 기본 20%에서 사냥터 난이도 1마다 1%p씩 줄어(최저 5%) 깊은 조수일수록 버티기가 어렵습니다. 던전은 고정 8%. 연구 ‘처치 회복 강화 I’은 1단계마다 +1%p. */
/** 처치 후 회복 비율. v27.86 힘의 길 회복 봉쇄 ×(1 − 50·75·100%). */
export const victoryHealRate = (s: State) => ((s.dungeon ? MONSTER_TUNING.dungeonHealAfterKill : Math.max(BALANCE.healAfterKillMin, BALANCE.healAfterKill / (1 + encounterTier(s) / BALANCE.healAfterKillTideScale))) + researchRank(s, 'recovery') * .01 + sproutHeal(s)) * roughHeal(s);
/** 드롭 등급: 등급 분포(ODDS.drop.rarity, 서버 전용)에서 minRarity 이상만 다시 정규화해 뽑습니다. */
/** v27.76 난이도별 등급 가중치(일반 제외 표시용·판정용 공통). */
/** v3.67 태초(마지막 등급)는 난이도 가중이 primalTierCap에서 멈춥니다(칠흑급 획득 속도를 난이도와 무관하게). */
export const rarityWeights = (tier: number, minRarity = 0) => ODDS.drop.rarity.map((w, i, all) => { if (i < minRarity) return 0; const lift = Math.pow(1 + BALANCE.tideLoot.rarityPerTier * Math.max(0, tier), Math.max(0, i - 1)); return w * (i === all.length - 1 ? Math.min(ODDS.drop.primalTierCap, lift) : lift); });
/** 등급 i 이상이 나올 비율(0~1). 난이도 선택기 표시용. */
export const rarityShareFrom = (tier: number, from: number, minRarity = 1) => { const w = rarityWeights(tier, minRarity), total = w.reduce((a, b) => a + b, 0); return total ? w.slice(from).reduce((a, b) => a + b, 0) / total : 0; };
/** v27.76 사냥터 난이도의 정수 드롭(사냥터만). 난이도가 낮으면 확률 0이라 난수를 쓰지 않습니다. */
export const tideEssence = (tier: number) => { const t = BALANCE.tideLoot; return tier >= t.essenceMinTier ? { chance: Math.min(1, t.essenceChancePerTier * tier), amount: 1 + Math.floor(tier / t.essenceEveryTiers) } : { chance: 0, amount: 0 }; };
export function rollRarity(rng: () => number, minRarity = 0, tier = 0) {
    const weights = rarityWeights(tier, minRarity);
    let roll = rng() * weights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll < 0) return i; }
    return weights.length - 1;
}
/** v27.53 드롭 장비 레벨: 기준 레벨 + 해역 난이도(층) × 5, 단 캐릭터 레벨 + dropLevelOver까지(기준 레벨보다 낮아지지는 않음). */
export const dropLevel = (s: Pick<State, 'level'>, base: number, tier: number) => Math.max(base, Math.min(base + tier * 5, s.level + BALANCE.dropLevelOver));
/** v3.104 rate: 미리 계산한 드롭 확률(무리 드롭 판정 반복용, 없으면 지금 계산). */
export function drop(s: State, level: number, rng: () => number, guaranteed = false, rate?: number, fixedRarity?: number) {
    if (!guaranteed && rng() > (rate ?? dropRate(s)))
        return;
    // v27.53 일반 처치 드롭도 희귀 이상만(일반 등급은 상점 기본 장비로).
    // v27.76 사냥터·던전 난이도가 높을수록 상위 등급 가중치가 조금 오릅니다(보수적).
    // v3.59 태초 드롭 천장: 태초 없이 PRIMAL_DROP_PITY개째 드롭은 태초.
    // v3.201 fixedRarity(주화 상점 장비 상자)는 등급을 이미 정했으므로 태초 천장을 세지 않습니다.
    const pity = (s.primalDropPity || 0) + 1, rarity = fixedRarity ?? (pity >= PRIMAL_DROP_PITY ? RARITIES.length - 1 : rollRarity(rng, 1, encounterTier(s)));
    if (fixedRarity === undefined) s.primalDropPity = rarity >= RARITIES.length - 1 ? 0 : pity;
    const origin = s.dungeon?.id || s.stage;
    const slot = (['rod', 'coat', 'charm', 'cape'] as const)[Math.floor(rng() * 4)];
    const item: Item = { id: `loot-${s.turn}-${s.logId}-${Math.floor(rng() * 1e9)}`, slot, rarity, name: '', power: Math.max(2, Math.round((level + 2) * RARITIES[rarity].factor * (.8 + rng() * .4))), level };
    if (rarity > 0)
        item.affixes = rollAffixes(rarity, item.power, origin, rng, [], slot, level);
    item.origin = origin;
    if (slot === 'rod')
        item.style = rng() < .33 ? 'physical' : rng() < .5 ? 'magic' : 'balanced';
    item.name = gearName(slot, rarity, item.style);
    syncOrnateName(item);
    // 자동 분해기: 유물·장비 도감에 없는 종류는 남깁니다.
    // v3.35 설정에서 고른 등급(여러 개)만 처리합니다. 칠흑·잠금 장비는 어떤 경우에도 처리하지 않습니다.
    const keep = item.locked || keepsAcrossLives(item) || !s.itemBook?.[itemKey(slot, rarity)];
    if (!keep && s.autoSell && autoGrades(s, 'salvage').includes(item.rarity)) {
        // v3.125 자동 분해도 태초 계승 게이지를 채웁니다.
        const got = dismantleInto(s, [item]);
        addLog(s, `자동 정리: ${item.name} 분해 · 정수 +${got.essence}${primalGaugeNote(s, got.gauge)}`, 'reward');
        return;
    }
    // v3.24 자동 판매기: 같은 조건의 드롭을 골드로 팝니다. v3.35 자동 분해기와 함께 켤 수 있고, 같은 등급이면 위에서 분해가 먼저입니다.
    if (!keep && s.autoVend && autoGrades(s, 'vend').includes(item.rarity)) {
        const gold = saleValue(item);
        s.gold += gold;
        addLog(s, `자동 정리: ${item.name} 판매 +${gold} G${primalGaugeNote(s, primalGaugeGain(s, [item]))}`, 'reward');
        return;
    }
    if (s.inventory.length >= inventoryCap()) {
        s.gold += item.power * 3;
        addLog(s, `가방 가득 참: ${item.name} 자동 판매 +${item.power * 3} G${primalGaugeNote(s, primalGaugeGain(s, [item]))}`, 'reward');
    }
    else {
        s.inventory.push(item);
        addLog(s, `${RARITIES[rarity].name} 장비 발견 · ${item.name}${rarity ? ` · 옵션 ${rarity}개` : ''}`, 'reward');
    }
}
/** v3.104 drop()이 바꾸는 값 가운데 능력치(드롭 보너스)에 닿을 수 있는 것: 골드 자릿수(기록 비례 패시브) · 물건 도감 수 · 가방 · 정수. */
const dropRateKey = (s: State) => `${Math.floor(Math.log10(1 + Math.max(0, s.gold || 0)))}|${Object.keys(s.itemBook || {}).length}|${s.inventory.length}|${s.essence || 0}`;
/** rareBonus: 희귀 이상 몬스터의 출현 가중치 증가율(0.1 = +10%). */
export function weightedMonsterId(ids: string[], rng: () => number, rareBonus = 0, tier = 0) {
    const choices = (ids.map(id => monsterById(id)).filter(Boolean) as typeof MONSTERS).filter(f => (f.minTier || 0) <= tier);
    const weight = (f: typeof MONSTERS[number]) => (f.spawnWeight ?? 1) * (f.rarity && f.rarity !== 'common' ? 1 + rareBonus : 1);
    const total = choices.reduce((sum, f) => sum + weight(f), 0);
    let roll = rng() * total;
    for (const f of choices) {
        roll -= weight(f);
        if (roll <= 0)
            return f.id;
    }
    return choices[choices.length - 1]?.id || ids[0];
}
/**
 * v3.188 칠흑의 보스 능력치: 몸(서식지 최강 × hpMul · 공격 ×3, 레벨은 난이도만큼 올라간 뒤)에 난이도 배율을 √로 완만하게 얹습니다(체력 √tierHealth · 공격 √tierAttack).
 * 사냥터 몬스터는 난이도 5에서 체력 2.75배가 되지만 칠흑은 1.66배: 체력이 이미 수백 배라 난이도까지 그대로 곱하면 적정 몸으로는 아무도 못 잡았습니다(docs/boss-plan.md §8.1).
 */
export function onyxEnemyStats(f: Parameters<typeof scaledEnemyStats>[0], tier: number) {
    const foe = scaledEnemyStats(f, { tier: 0 });
    if (tier > 0) { const h = Math.sqrt(tierHealth(tier)), a = Math.sqrt(tierAttack(tier)); foe.hp = Math.round(foe.hp * h); foe.attack = Math.round(foe.attack * a); foe.magic = Math.round((foe.magic || 0) * a); }
    return foe;
}
/** 무릉도장 1층 기준 능력치(첫 몬스터). 한 번만 계산합니다. */
let abyssRef: ReturnType<typeof scaledEnemyStats> | undefined;
export const abyssReference = () => abyssRef ??= scaledEnemyStats(MONSTERS.find(f => f.id === dungeonById('abyss')!.monsters[0])!, { tier: 0, wave: 0 });
/**
 * v27.78 일반 사냥터 몬스터의 실전 수치(난이도 적용): 사냥터 레벨 상한 → 난이도 레벨 보정 → 보상 정규화 → 능력치·스킬·경험치·골드.
 * spawn과 도감 ‘적 정보’가 같은 식을 쓰므로 도감 수치가 실제 전투와 일치합니다. 변종·까미·누리·서약은 포함하지 않습니다.
 */
export function stageField(s: Pick<State, 'level'>, stageId: string, monsterId: string, tier: number) {
    const st = stageById(stageId)!, f = monsterById(monsterId)!;
    const capped = stageStatMonster(f, st.level), lifted = tideLiftMonster(capped, tier, s.level);
    const field = lifted !== capped ? { ...lifted, rewardMultiplier: (lifted.rewardMultiplier || 1) * stageRewardNorm(st.monsters, tier) } : lifted;
    const foe = scaledEnemyStats(field, { tier }), base = killReward(field, tier);
    applyDepth(foe, base, stageDepth(st.id));
    return { field, foe, level: field.level, exp: Math.max(1, Math.round(base.exp * expLevelScale(field.level, s.level))), gold: base.gold, skills: foeSkills(f.id, field.level, !!f.boss) };
}
/**
 * v3.112 경험의 누리 보상 기준: 지금 사냥터 한 번 출현의 평균 경험치(몬스터 평균 · 경험치 배율 · 무리 서식지는 평균 규모와 ×500 보상 · 칠흑 세트).
 * 변종 · 황금 개체 · 이벤트성 희귀 몬스터는 넣지 않습니다.
 */
export function stageEncounterExp(s: State, won = stats(s)) {
    const st = stageById(s.stage);
    if (!st?.monsters.length) return 0;
    const tier = encounterTier(s), each = st.monsters.reduce((sum, id) => sum + stageField(s, st.id, id, tier).exp, 0) / st.monsters.length;
    const heads = st.habitat ? (1 - HABITAT.bigChance) * HABITAT.sizes[0] * swarmRewardMultiplier(HABITAT.sizes[0]) + HABITAT.bigChance * HABITAT.sizes[1] * swarmRewardMultiplier(HABITAT.sizes[1]) : 1;
    const onyxSet = st.habitat ? 1 + onyxSetBonus(ownedOnyx(s).size).habitatReward : 1;
    return each * expMultiplier(s, won) * onyxSet * heads;
}
/** v3.9 깊이 계수를 몬스터 체력·공격·마법과 보상 골드·경험치에 곱합니다(제자리 수정). */
function applyDepth(foe: Stats, base: { exp: number; gold: number }, k: number) {
    if (k === 1) return;
    foe.hp = Math.round(foe.hp * k); foe.attack = Math.round(foe.attack * k); foe.magic = Math.round((foe.magic || 0) * k);
    base.exp = Math.round(base.exp * k); base.gold = Math.round(base.gold * k);
}
/** v3.161 특별 몬스터 종류(정수의 슬라임 · 대왕 3종 포함). */
export type SpecialKind = 'mimic' | 'nuri' | 'slime' | 'kingMimic' | 'kingNuri' | 'kingSlime';
/** v3.104 부재중 정산 표본 환산(offline-sample.ts)이 남은 시간의 희귀 출현 판정을 따로 굴린 뒤, 나온 희귀 몬스터를 판정 없이 바로 세울 때 씁니다. */
export type ForcedRare = 'onyx' | 'starlit' | SpecialKind;
const SPECIAL_KINDS: readonly SpecialKind[] = ['mimic', 'nuri', 'slime', 'kingMimic', 'kingNuri', 'kingSlime'];
const isSpecialKind = (k: ForcedRare | undefined): k is SpecialKind => !!k && (SPECIAL_KINDS as readonly string[]).includes(k);
/** 종류 → 몬스터 id · 몸집 배율(그 사냥터 최강 몬스터 기준). 대왕은 작은 녀석의 체력 ×KING.hp, 공격은 최강 몬스터 ×KING.attack. */
function specialDef(kind: SpecialKind): { id: string; hp: number; attack: number; king?: KingKind } {
    const base = kind === 'mimic' || kind === 'kingMimic' ? MIMIC : kind === 'nuri' || kind === 'kingNuri' ? EXP_NURI : ESSENCE_SLIME;
    const king: KingKind | undefined = kind === 'kingMimic' ? 'mimic' : kind === 'kingNuri' ? 'nuri' : kind === 'kingSlime' ? 'slime' : undefined;
    return king ? { id: KING[king].id, hp: base.hp * KING.hp, attack: KING.attack, king } : { id: base.id, hp: base.hp, attack: base.attack };
}
/** v3.104 까미 · 누리 등장 확률(출현 한 번에 난수 하나를 [까미 | 누리] 구간으로 나눠 씀). spawn과 부재중 정산 환산이 같은 식을 씁니다. */
export function specialChances(s: State) {
    const dungeon = dungeonById(s.dungeon?.id), st = stageById(s.stage)!, tier = encounterTier(s);
    // v3.106 무리 서식지에도 까미·누리가 나옵니다. 까미의 사냥터 배율은 그 지역의 마지막 일반 사냥터 자리를 씁니다.
    // v3.31 승천한 모험가에게는 까미·누리가 난이도 0부터 나옵니다(난이도 조건만 없앰, 레벨·처치 수 조건은 그대로).
    const asc = ascended(s), mimicOk = !dungeon && (asc || tier >= MIMIC.minTier) && s.level >= MIMIC.minLevel && s.kills >= MIMIC.minKills, nuriOk = !dungeon && nuriEligible(s, asc ? Math.max(tier, EXP_NURI.minTier) : tier);
    // v27.60 행운의 편지(세계석 연구): 까미·누리 등장 확률 +15%/단계.
    const luck = specialLuck(s);
    const place = st.habitat ? Math.max(...STAGES.filter(x => !x.habitat && x.region === st.region).map(x => STAGES.indexOf(x))) : STAGES.indexOf(st);
    const mimicP = mimicOk ? mimicChance(tier, place) * (s.away ? specialOfflineScale(s, MIMIC.offlineScale) : 1) * (s.event?.mimic ?? 1) * luck : 0;
    const nuriP = nuriOk ? nuriChance(tier) * (s.away ? specialOfflineScale(s, EXP_NURI.offlineScale) : 1) * (s.event?.nuri ?? 1) * luck : 0;
    // v3.161 정수의 슬라임: 누리 구간 바로 뒤. 대왕 몫은 각 구간의 앞쪽 share(작은 녀석을 KING.minBookKills마리 잡은 뒤부터).
    const slimeOk = !dungeon && slimeEligible(s, asc ? Math.max(tier, ESSENCE_SLIME.minTier) : tier);
    const slimeP = slimeOk ? slimeChance(tier) * (s.away ? specialOfflineScale(s, ESSENCE_SLIME.offlineScale) : 1) * luck : 0;
    const king = { mimic: kingReady(s, 'mimic') ? KING.share : 0, nuri: kingReady(s, 'nuri') ? KING.share : 0, slime: kingReady(s, 'slime') ? KING.share : 0 };
    return { rolls: mimicOk || nuriOk || slimeOk, mimicP, nuriP, slimeP, king };
}
/** v3.161 출현 난수 하나를 [까미 | 누리 | 슬라임] 구간으로 나눠 특별 몬스터를 고릅니다(구간 앞쪽 share는 대왕). spawn과 부재중 정산 환산이 같은 식을 씁니다. */
export function pickSpecial(r: number, c: ReturnType<typeof specialChances>): SpecialKind | undefined {
    if (r < c.mimicP) return r < c.mimicP * c.king.mimic ? 'kingMimic' : 'mimic';
    r -= c.mimicP;
    if (r < c.nuriP) return r < c.nuriP * c.king.nuri ? 'kingNuri' : 'nuri';
    r -= c.nuriP;
    if (r < c.slimeP) return r < c.slimeP * c.king.slime ? 'kingSlime' : 'slime';
    return undefined;
}
/** v3.160 호루라기: 사냥터 출현(던전 · 랜덤게임 제외)에 한 번 쓰고 지웁니다. */
export function takeWhistle(s: State): ForcedRare | undefined {
    if (!s.whistle || s.dungeon) return undefined;
    const kind = s.whistle; delete s.whistle; return kind;
}
export function spawn(s: State, rng: () => number, force?: ForcedRare) {
    const dungeon = dungeonById(s.dungeon?.id);
    const st = stageById(s.stage)!;
    const finalWave = !!dungeon && s.dungeon!.wave === dungeon.monsters.length - 1;
    const tier = encounterTier(s);
    const targetOk = !!s.target && st.monsters.includes(s.target) && (monsterById(s.target)?.minTier || 0) <= tier;
    // v27.22 숙련의 까미: 사냥터 출현마다 아주 드물게. 그 사냥터에서 가장 강한 몬스터의 몸집을 빌립니다.
    const chances = specialChances(s);
    // v3.104 force가 있으면 판정 없이 그 희귀 몬스터를 세웁니다(난수를 쓰지 않음). 판정한 횟수는 부재중 정산 환산이 셉니다(offlineTally).
    // v3.161 [까미 | 누리 | 슬라임] 구간과 대왕 몫은 pickSpecial이 한 난수로 고릅니다.
    const specialKind = isSpecialKind(force) ? force : !force && chances.rolls ? pickSpecial(rng(), chances) : undefined;
    if (!force && chances.rolls) offlineTally.specialRolls++;
    const special = specialKind ? specialDef(specialKind) : undefined, king = !!special?.king;
    // v3.12 칠흑의 보스: 무리 서식지 출현마다 아주 드물게(천장 있음). 집중 사냥 대상이 아니며 그 서식지 최강 몬스터의 몸집(v3.188 체력 × 보스별 hpMul, 공격 ×3)을 빌립니다.
    const onyxDef = !dungeon && st.habitat ? onyxBossFor(st.region) : undefined;
    let onyx = false;
    if (onyxDef && force === 'onyx') { s.onyxSeen ??= {}; onyx = true; s.onyxSeen[st.region] = 0; }
    else if (onyxDef && !force) { s.onyxSeen ??= {}; const seen = s.onyxSeen[st.region] || 0; onyx = rng() < onyxChance(tier, seen); s.onyxSeen[st.region] = onyx ? 0 : seen + 1; offlineTally.onyxRolls++; }
    const rare = !!special || onyx, rareId = onyx ? onyxDef!.id : special?.id ?? '', rareDef = onyx ? { hp: onyxDef!.hpMul, attack: ONYX.attack } : special ?? { hp: 1, attack: 1 };
    const id = rare ? rareId : dungeon ? (finalWave && dungeon.bossMonster ? dungeon.bossMonster : dungeon.monsters[s.dungeon!.wave]) : (targetOk ? s.target! : weightedMonsterId(st.monsters, rng, rareSpawnBonus(s), tier));
    // v27.64 사냥터 몬스터는 난이도만큼 레벨이 올라갑니다(내 레벨까지, tideLiftMonster). 까미·누리는 올라간 가장 강한 몬스터의 몸집을 빌립니다.
    const top = rare ? tideLiftMonster([...st.monsters].map(x => monsterById(x)!).sort((a, b) => b.level - a.level)[0], tier, s.level) : undefined;
    const f = rare ? { ...monsterById(rareId)!, level: top!.level, hp: Math.round(top!.hp * rareDef.hp), attack: Math.round(top!.attack * rareDef.attack), defense: top!.defense, exp: top!.exp, gold: top!.gold } : monsterById(id)!;
    const boss = finalWave;
    const normalDungeon = !!dungeon && dungeon.id !== 'abyss', dLevel = dungeon ? dungeonLevelAt(dungeon, tier, s.level) : 0;
    // v27.67 레벨이 올라간 몬스터는 사냥터 평균 보상 배율로 나눠 사냥터 사이 보상을 맞춥니다(stageRewardNorm). 일반 사냥터는 stageField(도감과 공용).
    const field = !dungeon && !rare ? stageField(s, st.id, f.id, tier).field : normalDungeon ? tideLiftMonster(f, tier, s.level) : f;
    const foe = dungeon?.id === 'abyss' ? abyssEnemyStats(f, abyssReference(), s.dungeon!.depth || 1, { boss, wave: s.dungeon!.wave })
        : onyx ? onyxEnemyStats(f, tier)
        : scaledEnemyStats(field, { boss, tier, ...(s.dungeon ? { wave: boss ? BOSS_PRESSURE_WAVE : s.dungeon.wave } : {}) });
    const base = dungeon ? dungeonKillReward(field, dLevel, tier, boss, dungeon.id) : killReward(field, tier, boss);
    // v3.9 깊이 계수(뒤 사냥터·던전일수록 조금 더 어렵고 더 줌). 무릉도장·랜덤게임·까미·누리는 1.
    applyDepth(foe, base, dungeon ? dungeonDepth(dungeon.id) : stageDepth(st.id));
    const gold = base.gold;
    // v27.66 레벨 차 경험치 보정(EXP_LEVEL_GAP). 던전은 보상에 쓰는 몬스터 레벨(권장 + expLevelOver, 보스는 권장 레벨), 사냥터는 실제 몬스터 레벨 기준.
    const rewardLevel = dungeon ? (boss ? dLevel : Math.min(field.level, dLevel + DUNGEON_TUNING.expLevelOver)) : field.level;
    const exp = Math.max(1, Math.round(base.exp * expLevelScale(rewardLevel, s.level)));
    // v25.19 변종: 몬스터를 10회 이상 처치한 사냥터 출현마다 한 번 판정합니다. 무리는 체력 ×N(×100 이상은 98%)인 한 개체이고 공격은 ×500에서만 체력과 같은 배율, 방어는 한 마리와 같습니다.
    let swarm = 1, variant: typeof VARIANTS[number]['id'] | undefined;
    if (force === 'starlit') variant = 'starlit';
    else if (!dungeon && !rare && st.habitat) { variant = 'swarm'; swarm = rollHabitatSwarm(rng, HABITAT.bigChance, HABITAT.sizes); }
    else if (!dungeon && !rare && (s.book[f.id] || 0) >= VARIANT_BOOK_MIN) {
        offlineTally.variantRolls++;
        const chances = variantChances(s);
        let roll = rng();
        for (const v of VARIANTS) { roll -= chances[v.id]; if (roll < 0) { variant = v.id; break; } }
        if (variant === 'swarm') { swarm = rollSwarmSize(s, f.id, rng); if (swarm <= 1) variant = undefined; }
    }
    if (swarm > 1) {
        foe.hp = Math.round(foe.hp * swarmHpMultiplier(swarm));
        foe.attack = Math.round(foe.attack * swarmAttackMultiplier(swarm));
        foe.magic = Math.round((foe.magic || 0) * swarmAttackMultiplier(swarm));
    }
    const vdef = variantById(variant);
    if (vdef && variant !== 'swarm') {
        foe.hp = Math.round(foe.hp * vdef.hp);
        foe.attack = Math.round(foe.attack * vdef.attack);
        foe.magic = Math.round((foe.magic || 0) * vdef.attack);
        if (vdef.speed) foe.speed = Math.round((foe.speed || 1) * vdef.speed);
    }
    s.enemy = { id: f.id, name: boss ? dungeon!.boss : f.name, hp: foe.hp, maxHp: foe.hp, attack: foe.attack, defense: foe.defense, exp, gold, boss: boss || onyx || king, ...(onyx ? { onyx: rareId, leavesAt: s.turn + ONYX.turns } : king ? { leavesAt: s.turn + KING.turns } : {}), stun: 0, combatStats: foe, skills: foeSkills(f.id, field.level, boss || !!monsterById(f.id)?.boss), cooldowns: {}, effects: {}, mana: 100, ...(swarm > 1 ? { swarm, born: s.turn } : {}), ...(variant ? { variant } : {}) };
}
/**
 * v3.99 전투 · 처치 로그에 쓰는 적 이름. 무리는 ‘스포아 ×100’, 변종은 ‘◆ 거대 개체 스포아’,
 * 던전 · 필드 보스는 ‘[보스] …’, 칠흑 보스는 ‘[칠흑] …’. 전투 화면 카드는 배지로 따로 보여 줍니다.
 */
export function enemyLabel(e: Pick<Enemy, 'id' | 'name' | 'swarm' | 'variant' | 'boss' | 'onyx'>) {
    const v = e.variant && e.variant !== 'swarm' ? variantById(e.variant) : undefined;
    const tag = e.onyx ? '[칠흑] ' : e.boss || monsterById(e.id)?.boss ? '[보스] ' : '';
    return `${tag}${v ? `${v.mark} ${v.name} ` : ''}${e.name}${(e.swarm || 1) > 1 ? ` ×${e.swarm}` : ''}`;
}
const monsterLevelOf = (id: string) => monsterById(id)?.level || 1;
export function reward(s: State, rng: () => number) {
    const e = s.enemy!;
    // Use the loadout and growth level at the time of victory, before new mastery unlocks.
    // 무리 사냥은 전멸 시 N마리분을 지급합니다. 조건부 숙련 상한은 한 마리 기준으로 적용한 뒤 N배.
    const size = e.swarm || 1, vdef = variantById(e.variant), rewardMult = vdef?.reward || 1, expMult = vdef?.expMult || rewardMult, bookPer = vdef?.book || 1;
    // v25.6 계열 집중 카드 ×2 · v27.14 서버 이벤트. 정수로 유지하려고 올림 없이 곱한 뒤 연구 보정으로 넘깁니다.
    const { focus: focusMastery, event: eventMastery } = masteryMultipliers(s);
    // v3.42 ×500 도전 무리는 경험치·골드 ×1.5(swarmRewardMultiplier).
    const big = swarmRewardMultiplier(size);
    // v3.48 무리 숙련은 마리 수 대신 싸운 턴 × 규모별 값(swarmMasteryKills, 마리 수 상한). 서식지가 숙련을 까미보다 몇 배 더 주던 문제.
    const swarmTurns = s.turn - (e.born ?? s.turn) + 1, masteryHeads = size > 1 ? swarmMasteryKills(size, swarmTurns) : 1;
    // v3.107 계급 특전 숙련 훈련은 배율 밖의 고정값(무리는 마리분만큼): 배율은 나머지에만 곱하고, 승천 배율 뒤에 더합니다.
    // v3.201 던전(무릉도장 포함)은 처치마다 골드 · 경험치 · 숙련 · 장비를 주지 않습니다. 보상은 정복할 때 던전 주화로 한 번에(data/dungeon-shop).
    const dungeonRun = !!s.dungeon;
    const masteryReward = dungeonRun ? { amount: 0, drill: 0, base: 0, bonus: 0, source: '' } : victoryMastery(s, e), drillMastery = masteryReward.drill * masteryHeads;
    const researched = researchMastery(s, Math.floor((masteryReward.amount - masteryReward.drill) * masteryHeads * focusMastery * eventMastery)), practice = researched.total + drillMastery;
    // v3.12 칠흑 세트 4종: 무리 서식지 골드·경험치 +15%.
    const onyxSet = isHabitat(s.stage) && !s.dungeon ? 1 + onyxSetBonus(ownedOnyx(s).size).habitatReward : 1;
    // v3.104 골드 · 경험치 배율과 황금 개체 확률은 같은 상태의 능력치 한 번으로 계산합니다(사이에 상태가 바뀌지 않음).
    const won = stats(s);
    const perMonster = dungeonRun ? 0 : Math.floor(e.gold * goldMultiplier(s, won) * rewardMult * onyxSet), exp = dungeonRun ? 0 : Math.floor(Math.floor(e.exp * expMultiplier(s, won) * expMult * onyxSet) * size * big);
    // 황금 개체: 섀도어 계보 패시브의 ‘황금 개체 확률’로 한 마리가 황금이 되어 그 한 마리 골드가 10배. 확률 0이면 난수를 쓰지 않습니다.
    // v3.125 희귀 몬스터(숙련의 까미 · 경험의 누리 · 칠흑의 보스, v3.161 정수의 슬라임 · 대왕)는 출현 변종과 같이 황금 개체도 되지 않습니다(난수를 쓰지 않음).
    const rareFoe = isSpecialId(e.id) || !!e.onyx || dungeonRun;
    const goldenChance = won.goldenFind || 0, golden = goldenChance > 0 && !rareFoe && rng() < goldenChance;
    const gold = Math.floor(perMonster * size * big) + (golden ? perMonster * 9 : 0);
    if (golden) { s.goldenBook ??= {}; s.goldenBook[e.id] = (s.goldenBook[e.id] || 0) + 1; }
    // v27.79 계급장: 처치 수(무리는 마릿수)만큼 계급 경험치. ‘전과 기록’ 특전이 마리당 더 셉니다. 기록이 없던 세이브는 지금까지의 처치 수에서 시작합니다. 진급하면 알립니다.
    const rk = rankState(s), rankBefore = rankIndex(rk.exp);
    s.kills += size;
    // v3.46 무리는 마리 수 대신 싸운 턴 × 규모별 턴당 값(swarmRankKills, 마리 수 상한). 소수점은 이월합니다.
    // v3.75 전공 옵션: 처치 수 1마리당 +1(전과 기록 배율 전).
    const valor = 1 + Math.floor(equippedAffixTotal(s, 'rankFlat'));
    // v3.217 작전참모 인사 기록(다른 분신): 계급 경험치 배율. 소수점은 무리와 같이 이월합니다.
    const rankMul = supportMultiplier(s, 'rank');
    if (size > 1 || rankMul > 1) { const raw = (size > 1 ? swarmRankKills(size, swarmTurns) : 1) * valor * (1 + rankPerkLevel(s, 'tally')) * rankMul + (rk.frac || 0), gain = Math.floor(raw); rk.exp += gain; rk.frac = raw - gain; }
    else rk.exp += valor * (1 + rankPerkLevel(s, 'tally'));
    s.rank = rk;
    if (rankIndex(rk.exp) > rankBefore) { const r = RANKS[rankIndex(rk.exp)]; addLog(s, `✦ ${r.name}(으)로 진급! 진급 포인트 +${r.points} (능력치 · 빌드 화면의 계급에서 사용)`, 'reward'); }
    // v27.22 숙련의 까미: 로또 숙련을 이번 처치 숙련에 더합니다(직업·장착 스킬 모두). v3.30 처치 줄의 ‘숙련 +N’은 당첨분을 합친 값입니다.
    let mimicBonus = 0;
    if (e.id === MIMIC.id) { const t = rollMimicMastery(rng, s); mimicBonus = t.mastery; addLog(s, `✦ 숙련의 까미 · ${t.label}당첨! 직업·장착 스킬 숙련 +${t.mastery.toLocaleString()}`, 'reward'); }
    // v3.161 대왕 까미: ‘대’ × KING.rewardMul 확정(난수 없음).
    else if (e.id === KING.mimic.id) { mimicBonus = MIMIC.tiers[2].mastery * KING.rewardMul; addLog(s, `👑 대왕 까미 격파! 직업·장착 스킬 숙련 +${mimicBonus.toLocaleString()} (대 당첨 ×${KING.rewardMul} 확정)`, 'reward'); }
    // v3.31 승천 숙련 배율(1회당 +100%, 5회 ×6)은 까미 당첨분까지 합친 이번 처치 숙련에 곱합니다(v3.107 계급 특전 숙련 훈련은 빼고 뒤에 더함). 다른 배율은 까미에 걸지 않습니다.
    const practiceTotal = Math.floor((researched.total + mimicBonus) * ascensionMastery(s)) + drillMastery;
    // v3.31 행운의 편지 10단계 · 편지 수신인: 까미 당첨 숙련(승천 배율 적용 뒤)의 1%를 해금했지만 숙달하지 않은 다른 직업 하나에 덤으로 줍니다.
    if (mimicBonus && letterRank(s) >= LETTER.recipientRank) {
        const pool = s.unlockedJobs.filter(id => id !== s.job && id !== HACKER_ID && jobById(id) && !jobMastered(s, jobById(id)!));
        if (pool.length) {
            const to = pool[Math.floor(rng() * pool.length)], gift = Math.max(1, Math.floor(mimicBonus * ascensionMastery(s) * LETTER.recipientShare));
            s.jobMastery[to] = (s.jobMastery[to] || 0) + gift;
            addLog(s, `편지 수신인 · ${jobById(to)!.name} 숙련 +${gift.toLocaleString()}`, 'skill');
            // v3.40 숙련 진행판의 편지 수신인 기록(최근 10건, 승천해도 남음).
            s.letterLog = [{ job: to, gift, turn: s.turn }, ...(s.letterLog || [])].slice(0, 10);
        }
    }
    const jobTargets = vocationTargets(jobMasteryTarget(jobById(s.job)!));
    const oldJobRank = thresholdRank(s.jobMastery[s.job] || 0, jobTargets);
    s.jobMastery[s.job] = (s.jobMastery[s.job] || 0) + practiceTotal;
    recordMasteryIncome(s, practiceTotal);
    const newJobRank = thresholdRank(s.jobMastery[s.job], jobTargets);
    if (newJobRank > oldJobRank) addLog(s, `직업 단련 ${newJobRank}단계 달성 · 현재 직업의 체력·마나·양 공격·양 방어 +4%`, 'skill');
    for (const id of s.skills) {
        if (canUse(s, id)) {
            // v3.74 극한돌파 · v3.211 극한 단계: 단계가 오른 순간 한 번 알리고, 처음이면 전용 연출을 엽니다.
            const before = extremeStage(s, id);
            s.skillPractice[id] = (s.skillPractice[id] || 0) + practiceTotal;
            noteExtreme(s, id, before);
        }
    }
    s.book[e.id] = (s.book[e.id] || 0) + size * bookPer;
    // v27.80 도감 5·6단계 조건: 이 몬스터를 처치한 가장 높은 난이도(사냥터 난이도·던전 모드)를 기록합니다.
    { const t = encounterTier(s); if (t > (s.bookTier?.[e.id] || 0)) (s.bookTier ??= {})[e.id] = t; }
    if (e.variant) { s.variantBook ??= {}; const row = (s.variantBook[e.id] ??= {}); row[e.variant] = (row[e.variant] || 0) + 1; }
    if (vdef?.pearls) { const pearls = vdef.pearls + (s.rebirths >= 3 ? 1 : 0); s.pearls += pearls; addLog(s, `${vdef.mark} ${vdef.name} · 세계석 +${pearls}`, 'reward'); }
    // v27.79 계급 특전: 사냥터 처치마다 SP·세계석 드롭(특전이 0이면 난수를 쓰지 않음).
    if (!s.dungeon) {
        const medal = rankPerkValue(s, 'medal'), supply = rankPerkValue(s, 'supply');
        if (medal > 0 && rng() < medal) { s.sp += 1; addLog(s, '✦ 전공 훈장 · SP +1', 'reward'); }
        if (supply > 0 && rng() < supply) { s.pearls += 1; addLog(s, '보급품 · 세계석 +1', 'reward'); }
    }
    // v27.76 사냥터 난이도 정수 드롭: 난이도 5 이상 사냥터에서 처치마다 확률 판정(확률 0이면 난수를 쓰지 않음).
    if (!s.dungeon) {
        const te = tideEssence(encounterTier(s));
        if (te.chance > 0 && rng() < te.chance) { s.essence = (s.essence || 0) + te.amount; addLog(s, `사냥터 난이도 ${encounterTier(s)} · 정수 +${te.amount}`, 'reward'); }
    }
    s.gold += gold;
    recordGoal(s, 'catch', undefined, size, text => addLog(s, text, 'reward')); recordGoal(s, 'species', e.id, size, text => addLog(s, text, 'reward'));
    if (e.boss) recordGoal(s, 'boss', undefined, 1, text => addLog(s, text, 'reward'));
    if (size > 1) recordGoal(s, 'swarm', undefined, 1, text => addLog(s, text, 'reward'));
    s.exp += exp;
    recordExpIncome(s, exp);
    // v27.58 경험의 누리: 지금 레벨 필요 경험치의 1~3%. 배율과 무관하게 바로 더합니다.
    // v3.112 이 사냥터 평균 출현 경험치 ×(1% 당 10회분)과 비교해 큰 쪽을 줍니다(고수는 레벨 %가 너무 작아 무리 한 번보다 못했음). Lv.100부터는 출현 몫만.
    // v3.161 대왕 누리: ‘대’ × KING.rewardMul 확정(레벨 9% 또는 출현 90회분).
    if (e.id === EXP_NURI.id || e.id === KING.nuri.id) {
        const king = e.id === KING.nuri.id, t = king ? { pct: EXP_NURI.tiers[2].pct * KING.rewardMul, label: '대왕' } : rollNuriTier(rng);
        const byLevel = s.level < 100 ? Math.floor(xpNeeded(s.level, s.rebirths, xpWall(s)) * t.pct) : 0;
        const times = Math.round(t.pct * EXP_NURI.encountersPerPct), byField = Math.floor(stageEncounterExp(s, won) * times), bonus = Math.max(1, byLevel, byField);
        s.exp += bonus;
        const how = byField > byLevel ? `이 사냥터 출현 ${times}회분` : `Lv.${s.level} 필요량의 ${Math.round(t.pct * 100)}%`;
        addLog(s, king ? `👑 대왕 누리 격파! 경험치 +${bonus.toLocaleString()} (${how} · 대 당첨 ×${KING.rewardMul} 확정)` : `✦ 경험의 누리 · ${t.label}당첨! 경험치 +${bonus.toLocaleString()} (${how})`, 'reward');
    }
    // v3.161 정수의 슬라임: 이 난이도의 정수 묶음 × 등급 배수. 대왕은 ‘대’ × KING.rewardMul 확정.
    if (e.id === ESSENCE_SLIME.id || e.id === KING.slime.id) {
        const king = e.id === KING.slime.id, bundle = slimeBundle(encounterTier(s)), t = king ? { mul: ESSENCE_SLIME.tiers[2].mul * KING.rewardMul, label: '대왕' } : rollSlimeTier(rng);
        const got = Math.max(1, bundle * t.mul);
        s.essence = (s.essence || 0) + got;
        addLog(s, king ? `👑 대왕 정수 슬라임 격파! 정수 +${got.toLocaleString()} (묶음 ${bundle} × ${t.mul} · 대 당첨 ×${KING.rewardMul} 확정)` : `✦ 정수의 슬라임 · ${t.label}당첨! 정수 +${got.toLocaleString()} (묶음 ${bundle} × ${t.mul})`, 'reward');
    }
    if (dungeonRun) addLog(s, `${enemyLabel(e)} 처치`, 'reward');
    else addLog(s, `${golden ? '✦ 황금 ' : ''}${enemyLabel(e)} 처치 · +${gold} G · +${exp} EXP${practiceTotal > 0 ? ` · 숙련 +${practiceTotal}` : ''}${golden ? ' · 황금 개체 골드 10배' : ''}${big > 1 ? ` · 큰 무리 보상 ×${big}` : ''}${vdef && e.variant !== 'swarm' ? ` · 변종 보상 ×${rewardMult}${bookPer > 1 ? ` · 도감 +${bookPer}` : ''}` : ''}`, 'reward');
    if (masteryReward.bonus) addLog(s, `${masteryReward.source} · 직업·장착 스킬 숙련 +${practice} (기본 ${masteryReward.base} + 보너스 ${masteryReward.bonus}${size > 1 ? ` · 무리 ×${+masteryHeads.toFixed(2)}` : ''}${researched.extra ? ` · 끝없는 수련 +${researched.extra}` : ''})`, 'skill');
    // v3.12 칠흑 보스 처치: drop 확률로 그 보스의 장신구 1개(dropPity번째 연속 미획득 격파는 확정, 종당 1개, 이미 있으면 세계석). 환생해도 남습니다.
    if (e.onyx) {
        const bossDef = onyxById(e.onyx)!; s.onyxBook ??= {}; s.onyxBook[e.onyx] = (s.onyxBook[e.onyx] || 0) + 1; s.onyxMiss ??= {};
        const miss = s.onyxMiss[e.onyx] || 0, dropRoll = rng();
        if (ownedOnyx(s).has(e.onyx)) {
            // v3.113 각성: 이미 가진 칠흑도 같은 드롭 확률 · 천장으로 다시 얻으면 각성 단계 +1(최대 5, 고유 옵션 +10%씩). 세계석은 전처럼 받습니다.
            s.pearls += ONYX.duplicatePearls;
            const own = ownedItems(s).find(x => x?.onyx === e.onyx)!, rank = own.onyxRank || 0;
            if (rank < ONYX.awakenMax && (dropRoll < ONYX.drop || miss + 1 >= ONYX.dropPity)) {
                s.onyxMiss[e.onyx] = 0; own.onyxRank = rank + 1;
                addLog(s, `✦ ${bossDef.name} 격파 · ${bossDef.accessory.name} 각성 ${own.onyxRank}/${ONYX.awakenMax}! 고유 옵션 +${Math.round(own.onyxRank * ONYX.awakenStep * 100)}% · 세계석 +${ONYX.duplicatePearls}`, 'reward');
            }
            else {
                if (rank < ONYX.awakenMax) s.onyxMiss[e.onyx] = miss + 1;
                addLog(s, `✦ ${bossDef.name} 격파 · ${bossDef.accessory.name}은(는) 이미 있어 세계석 +${ONYX.duplicatePearls}${rank < ONYX.awakenMax ? ` (각성 ${rank}/${ONYX.awakenMax} · 연속 미획득 ${miss + 1}/${ONYX.dropPity})` : ' (각성 완료)'}`, 'reward');
            }
        }
        else if (dropRoll >= ONYX.drop && miss + 1 < ONYX.dropPity) { s.onyxMiss[e.onyx] = miss + 1; addLog(s, `✦ ${bossDef.name} 격파 · 장신구를 남기지 않았습니다 (연속 미획득 ${miss + 1}/${ONYX.dropPity} · ${ONYX.dropPity}번째는 확정)`, 'reward'); }
        else {
            s.onyxMiss[e.onyx] = 0;
            grantOnyx(s, e.onyx, stageById(s.stage)?.level || monsterLevelOf(e.id), rng, `${bossDef.name} 격파`);
        }
    }
    const monster = monsterById(e.id)!;
    // v3.42 무리는 마리 수 N 대신 √N번만 드롭을 판정하고(×500은 2배), 덜 굴린 판정은 기대 장비 수만큼 정수로 바꿉니다.
    const rolls = swarmDropRolls(size) * (size >= SWARM_BIG.size ? SWARM_BIG.drops : 1);
    // v3.104 드롭 확률은 드롭이 바꿀 수 있는 값(골드 자릿수 · 물건 도감 · 가방 · 정수)이 그대로면 재사용합니다.
    let rateKey = '', rate = 0;
    for (let i = 0; i < (dungeonRun ? 0 : rolls * (vdef?.drops || 1)); i++) {
        const key = dropRateKey(s);
        if (key !== rateKey) { rateKey = key; rate = dropRate(s); }
        drop(s, dropLevel(s, monster.level, encounterTier(s)), rng, false, rate);
    }
    if (size > rolls) {
        const owed = (size - rolls) * dropRate(s) * SWARM_ESSENCE_PER_ITEM, essence = Math.floor(owed) + (rng() < owed % 1 ? 1 : 0);
        if (essence > 0) { s.essence = (s.essence || 0) + essence; addLog(s, `무리 전리품 · 정수 +${essence}`, 'reward'); }
    }
    if (vdef?.guaranteed) drop(s, dropLevel(s, monster.level, encounterTier(s)), rng, true);
    // v27.86 사냥터별 최고 난이도 기록(업적용).
    if (!s.dungeon && !isHabitat(s.stage)) { const tier = encounterTier(s); if (tier > (s.tideBest?.[s.stage] || 0)) (s.tideBest ??= {})[s.stage] = tier; }
    gainLevels(s);
    for (const id of grantJobSkills(s)) {
        const sk = skillById(id)!;
        if (sk.unlockJobMastery) addLog(s, `직업 숙련으로 ${sk.name} 해금 · 기본 Lv.0부터 장착 가능`, 'skill');
    }
    { const a = stats(s); s.hp = Math.min(a.hp, s.hp + victoryHeal(s, a)); }
    s.enemy = null;
    s.effects = {};
    s.playerStun = 0;
    if (s.dungeon) {
        const d = dungeonById(s.dungeon!.id)!;
        s.dungeon.wave++;
        if (s.dungeon.wave >= d.monsters.length) {
            // v3.201 정복 보상은 던전 주화 한 번(처치 턴과 무관한 고정량, 던전 주화 보너스 적용). 클리어 골드는 없앴습니다.
            const tier = encounterTier(s), dLevel = dungeonLevelAt(d, tier, s.level);
            const first = !s.clears[d.id];
            const depth = s.dungeon.depth || 1;
            // v3.201 지역 던전은 하루 처음 DAILY_BONUS.clears회가 보너스 주화(던전 공용, 이월 없음). 무릉도장은 층 주화만.
            const bonus = spendDailyBonus(s, d.id, s.lastTick), coins = grantDungeonCoins(s, clearCoinBase(d.id, s.dungeon.mode, depth, bonus));
            // v3.202 보스 전리품은 하루 보너스 정복에서만 굴립니다(무릉도장은 보너스가 없어 제외).
            if (bonus) rollBossLoot(s, d.id, rng);
            recordGoal(s, 'dungeon', d.id, 1, text => addLog(s, text, 'reward'));
            if (d.id === 'abyss') {
                const deeper = depth > s.abyssBest;
                s.abyssBest = Math.max(s.abyssBest, depth);
                recordAbyssDepth(s, depth, s.lastTick);
                if (deeper) syncAbyssCores(s);
                if (lv1Active(s) && depth > (s.lv1AbyssBest || 0)) { s.lv1AbyssBest = depth; addLog(s, `LV1 모험가 기록 · 무릉도장 ${depth}층`, 'reward'); }
                const pearls = abyssPearls(depth);
                s.pearls += pearls;
                addLog(s, `무릉도장 ${depth}층 정복 · 세계석 +${pearls}`, 'reward');
                s.abyssMilestones ??= [];
                // v25.8 10층마다 첫 돌파 보너스(층 수만큼 세계석).
                if (deeper && abyssFloorBonus(depth)) { s.pearls += abyssFloorBonus(depth); addLog(s, `무릉도장 ${depth}층 첫 돌파 · 보너스 세계석 +${abyssFloorBonus(depth)}`, 'reward'); }
                if (ABYSS_SP_MILESTONES.includes(depth) && !s.abyssMilestones.includes(depth)) {
                    s.abyssMilestones.push(depth);
                    s.sp += 1;
                    addLog(s, `무릉도장 ${depth}층 첫 돌파 이정표 · SP +1`, 'reward');
                }
            }
            if (first && d.id !== 'abyss')
                s.pearls += d.pearls;
            s.clears[d.id] = (s.clears[d.id] || 0) + 1;
            if (s.dungeon.mode && s.dungeon.mode !== 'normal') { s.modeClears ??= {}; const row = (s.modeClears[s.dungeon.mode] ??= {}); row[d.id] = (row[d.id] || 0) + 1; }
            // 희귀 이상 확정 장비: 첫 정복, 무릉도장 5층마다. v3.201 반복 정복 확률 드롭은 없앴습니다(주화 상점 장비 상자로).
            if (first || (d.id === 'abyss' && depth % 5 === 0))
                drop(s, dropLevel(s, dLevel, tier), rng, true);
            addLog(s, `${d.name} 정복! 던전 주화 +${coins.toLocaleString()}${bonus ? ` · 오늘 보너스 ${DAILY_BONUS.clears - dailyBonusLeft(s, s.lastTick)}/${DAILY_BONUS.clears}` : ''} (보유 ${(s.dungeonCoins || 0).toLocaleString()})${first && d.id !== 'abyss' ? ` · 첫 클리어 +${d.pearls} 세계석` : ''}`, 'reward');
            const repeat = s.dungeon.repeat;
            s.dungeon = null;
            s.running = false;
            if (repeat) continueRepeat(s, d.id, repeat);
            else endRun(s, `${d.name} 정복 · 1회 도전 완료로 멈춤`);
        }
    }
}

/**
 * v3.211 극한 단계가 before에서 올랐으면 알리고, 극한돌파(1단계)에 닿으면 그 스킬의 전용 연출을 영구로 엽니다(extremeFx).
 * v3.211 전에 이미 1억을 넘긴 스킬도 다음 처치 때 여기서 연출이 열립니다(단계가 그대로라 알림은 연출 해금 한 줄).
 */
export function noteExtreme(s: State, id: string, before: number) {
    const now = extremeStage(s, id), name = skillById(id)?.name || id;
    if (now >= 1 && !s.extremeFx?.[id]) {
        (s.extremeFx ??= {})[id] = true;
        addLog(s, `✦ ${name} 극한돌파! 전용 연출이 열렸습니다 · 최종 피해 +${Math.round((extremeFinalMultiplier(now) - 1) * 100)}%`, 'reward');
        return;
    }
    if (now > before) addLog(s, `✦ ${name} 극한 ${now}단계 (숙련 ${EXTREME_STAGES[now - 1].toLocaleString()}) · 최종 피해 +${Math.round((extremeFinalMultiplier(now) - 1) * 100)}%`, 'reward');
}
