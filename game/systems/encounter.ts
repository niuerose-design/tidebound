/** 적 등장·드롭·승리 보상. */
import { DROP_RARITY, rollAffixes } from '../data/gear';
import { vocationTargets, thresholdRank, refinementBonusLabel, abyssPearls, ABYSS_SP_MILESTONES, abyssFloorBonus } from '../data/long-term';
import { jobMasteryTarget, skillRefinementTargets, refinePractice } from './progression';
import { catchReward, encounterTier, dungeonCatchReward, dungeonClearBase, dungeonRewardTier, dungeonLevelAt, xpWall } from './meta';
import { stats, dropRate, dungeonClearGold, goldMultiplier, expMultiplier } from './stats';
import { victoryMastery, researchMastery, masteryMultipliers } from './mastery';
import { inventoryCap, researchRank, autoGrades } from '../data/economy';
import { rareSpawnBonus } from './book';
import { VARIANTS, VARIANT_BOOK_MIN, variantById, variantChances, rollSwarmSize, rollHabitatSwarm } from '../data/variants';
import { MIMIC, LETTER, letterRank, rollMimicMastery, mimicChance, specialLuck, specialOfflineScale } from '../data/mimic';
import { ascended, ascensionMastery } from '../data/ascension';
import { EXP_NURI, rollNuriTier, nuriChance, nuriEligible } from '../data/exp-nuri';
import { RANKS, rankState, rankIndex, rankPerkLevel, rankPerkValue, swarmRankKills, swarmMasteryKills } from '../data/rank';
import { roughHeal } from './vows';
import { sproutHeal } from '../data/sprout';
import { inRandomGame, spawnRandomGame, clearRandomWave } from './random-game';
import type { State, Item, Stats } from '../types';
import { BALANCE, MONSTER_TUNING, RARITIES, xpNeeded, dungeonOverlevel, DUNGEON_TUNING } from '../data/balance';
import { FISH, STAGES, DUNGEONS, HABITAT, isHabitat, swarmHpMultiplier, swarmAttackMultiplier, swarmDropRolls, swarmRewardMultiplier, SWARM_BIG, SWARM_ESSENCE_PER_ITEM, stageStatFish, tideLiftFish, expLevelScale, stageRewardNorm, stageDepth, dungeonDepth } from '../data/world';
import { jobById } from '../data/classes';
import { HACKER_ID } from '../data/hacker';
import { skillById } from '../data/skills';
import { gearName } from '../data/maple-gear';
import { PROGRESSION } from '../data/progression';
import { canUse, grantJobSkills, itemKey, jobMastered } from './progression';
import { dismantleEssence, saleValue } from './equipment';
import { scaledEnemyStats, abyssEnemyStats, foeSkills } from '../data/encounters';
import { ONYX, onyxBossFor, onyxById, onyxChance, onyxAccessory, ownedOnyx, onyxSetBonus, onyxCodexKey } from '../data/onyx';
import { recordGoal, recordAbyssDepth } from './progress';
import { addLog, endRun } from './state';
import { continueRepeat } from './dungeon-run';
/** 처치 1회당 회복량. 무리 규모와 관계없이 처치마다 한 번 적용합니다(응급처치 포함). */
export function victoryHeal(s: State) {
    return Math.floor(stats(s).hp * victoryHealRate(s));
}
/** 쌓인 경험치로 올릴 수 있는 만큼 레벨을 올립니다(최대 Lv.100). */
export function gainLevels(s: State) {
    while (s.exp >= xpNeeded(s.level, s.rebirths, xpWall(s)) && s.level < 100) {
        s.exp -= xpNeeded(s.level, s.rebirths, xpWall(s));
        s.level++;
        s.statPoints += PROGRESSION.statPerLevel;
        if (s.level > s.peakLevel) s.peakLevel = s.level;
        s.mana = stats(s).mana;
        s.hp = stats(s).hp;
        addLog(s, `레벨 ${s.level} 달성! 능력치가 상승했습니다.`);
    }
}
/** v27.86 옛 ‘잠든 힘’ 봉인이 남은 세이브: 쌓인 경험치를 그대로 지급하고 봉인을 지웁니다(서약은 던전 랜덤게임으로 바뀜). 레벨은 호출한 쪽에서 올립니다. */
export function releaseLegacySeal(s: State) {
    const seal = s.vows?.seal;
    if (!seal) return 0;
    s.exp += seal.exp;
    delete s.vows!.seal; delete s.vows!.anchor;
    addLog(s, `잠든 힘이 랜덤게임으로 바뀌어 봉인을 풀었습니다 · 쌓인 경험치 +${seal.exp} EXP`, 'reward');
    return seal.exp;
}
/** 처치 후 기본 회복률(응급처치 제외): 필드 8%·던전 4% + 회복의 기억 1%p/단계. */
/** 처치 후 회복률. v27.8 사냥터는 기본 20%에서 사냥터 난이도 1마다 1%p씩 줄어(최저 5%) 깊은 조수일수록 버티기가 어렵습니다. 던전은 고정 8%. 연구 ‘회복의 기억’은 1단계마다 +1%p. */
/** 처치 후 회복 비율. v27.86 힘의 길 회복 봉쇄 ×(1 − 50·75·100%). */
export const victoryHealRate = (s: State) => ((s.dungeon ? MONSTER_TUNING.dungeonHealAfterKill : Math.max(BALANCE.healAfterKillMin, BALANCE.healAfterKill / (1 + encounterTier(s) / BALANCE.healAfterKillTideScale))) + researchRank(s, 'recovery') * .01 + sproutHeal(s)) * roughHeal(s);
/** 드롭 등급: DROP_RARITY 분포에서 minRarity 이상만 다시 정규화해 뽑습니다. */
/** v27.76 난이도별 등급 가중치(일반 제외 표시용·판정용 공통). */
export const rarityWeights = (tier: number, minRarity = 0) => DROP_RARITY.map((w, i) => i >= minRarity ? w * Math.pow(1 + BALANCE.tideLoot.rarityPerTier * Math.max(0, tier), Math.max(0, i - 1)) : 0);
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
export function drop(s: State, level: number, rng: () => number, guaranteed = false) {
    if (!guaranteed && rng() > dropRate(s))
        return;
    // v27.53 일반 처치 드롭도 희귀 이상만(일반 등급은 상점 기본 장비로).
    // v27.76 사냥터·던전 난이도가 높을수록 상위 등급 가중치가 조금 오릅니다(보수적).
    const rarity = rollRarity(rng, 1, encounterTier(s));
    const origin = s.dungeon?.id || s.stage;
    const slot = (['rod', 'coat', 'charm', 'cape'] as const)[Math.floor(rng() * 4)];
    const item: Item = { id: `loot-${s.turn}-${s.logId}-${Math.floor(rng() * 1e9)}`, slot, rarity, name: '', power: Math.max(2, Math.round((level + 2) * RARITIES[rarity].factor * (.8 + rng() * .4))), level };
    if (rarity > 0)
        item.affixes = rollAffixes(rarity, item.power, origin, rng, [], slot, level);
    item.origin = origin;
    if (slot === 'rod')
        item.style = rng() < .33 ? 'physical' : rng() < .5 ? 'magic' : 'balanced';
    item.name = gearName(slot, rarity, item.style);
    // 자동 분해기: v3.23 골드 대신 정수. 유물·장비 도감에 없는 종류는 남깁니다.
    // v3.35 설정에서 고른 등급(여러 개)만 처리합니다. 칠흑·잠금 장비는 어떤 경우에도 처리하지 않습니다.
    const keep = item.relic || item.locked || item.onyx || !s.itemBook?.[itemKey(slot, rarity)];
    if (!keep && s.autoSell && autoGrades(s, 'salvage').includes(item.rarity)) {
        const essence = dismantleEssence(item);
        s.essence = (s.essence || 0) + essence;
        addLog(s, `자동 정리: ${item.name} 분해 · 정수 +${essence}`, 'reward');
        return;
    }
    // v3.24 자동 판매기: 같은 조건의 드롭을 골드로 팝니다. v3.35 자동 분해기와 함께 켤 수 있고, 같은 등급이면 위에서 분해가 먼저입니다.
    if (!keep && s.autoVend && autoGrades(s, 'vend').includes(item.rarity)) {
        const gold = saleValue(item);
        s.gold += gold;
        addLog(s, `자동 정리: ${item.name} 판매 +${gold} G`, 'reward');
        return;
    }
    if (s.inventory.length >= inventoryCap(s)) {
        s.gold += item.power * 3;
        addLog(s, `가방 가득 참: ${item.name} 자동 판매 +${item.power * 3} G`, 'reward');
    }
    else {
        s.inventory.push(item);
        addLog(s, `${RARITIES[rarity].name} 장비 발견 · ${item.name}${rarity ? ` · 옵션 ${rarity}개` : ''}`, 'reward');
    }
}
/** rareBonus: 희귀 이상 몬스터의 출현 가중치 증가율(0.1 = +10%). */
export function weightedFishId(ids: string[], rng: () => number, rareBonus = 0, tier = 0) {
    const choices = (ids.map(id => FISH.find(f => f.id === id)).filter(Boolean) as typeof FISH).filter(f => (f.minTier || 0) <= tier);
    const weight = (f: typeof FISH[number]) => (f.spawnWeight ?? 1) * (f.rarity && f.rarity !== 'common' ? 1 + rareBonus : 1);
    const total = choices.reduce((sum, f) => sum + weight(f), 0);
    let roll = rng() * total;
    for (const f of choices) {
        roll -= weight(f);
        if (roll <= 0)
            return f.id;
    }
    return choices[choices.length - 1]?.id || ids[0];
}
/** 무릉도장 1층 기준 능력치(첫 몬스터). 한 번만 계산합니다. */
let abyssRef: ReturnType<typeof scaledEnemyStats> | undefined;
export const abyssReference = () => abyssRef ??= scaledEnemyStats(FISH.find(f => f.id === DUNGEONS.find(d => d.id === 'abyss')!.fish[0])!, { tier: 0, wave: 0 });
/**
 * v27.78 일반 사냥터 몬스터의 실전 수치(난이도 적용): 사냥터 레벨 상한 → 난이도 레벨 보정 → 보상 정규화 → 능력치·스킬·경험치·골드.
 * spawn과 도감 ‘적 정보’가 같은 식을 쓰므로 도감 수치가 실제 전투와 일치합니다. 변종·까미·누리·서약은 포함하지 않습니다.
 */
export function stageField(s: Pick<State, 'level'>, stageId: string, fishId: string, tier: number) {
    const st = STAGES.find(x => x.id === stageId)!, f = FISH.find(x => x.id === fishId)!;
    const capped = stageStatFish(f, st.level), lifted = tideLiftFish(capped, tier, s.level);
    const field = lifted !== capped ? { ...lifted, rewardMultiplier: (lifted.rewardMultiplier || 1) * stageRewardNorm(st.fish, tier) } : lifted;
    const foe = scaledEnemyStats(field, { tier }), base = catchReward(field, tier);
    applyDepth(foe, base, stageDepth(st.id));
    return { field, foe, level: field.level, exp: Math.max(1, Math.round(base.exp * expLevelScale(field.level, s.level))), gold: base.gold, skills: foeSkills(f.id, field.level, !!f.boss) };
}
/** v3.9 깊이 계수를 몬스터 체력·공격·마법과 보상 골드·경험치에 곱합니다(제자리 수정). */
function applyDepth(foe: Stats, base: { exp: number; gold: number }, k: number) {
    if (k === 1) return;
    foe.hp = Math.round(foe.hp * k); foe.attack = Math.round(foe.attack * k); foe.magic = Math.round((foe.magic || 0) * k);
    base.exp = Math.round(base.exp * k); base.gold = Math.round(base.gold * k);
}
export function spawn(s: State, rng: () => number) {
    // v27.86 랜덤게임: 해금한 사냥터의 몬스터가 웨이브마다 무작위로 나옵니다.
    if (inRandomGame(s)) return spawnRandomGame(s, rng);
    const dungeon = DUNGEONS.find(d => d.id === s.dungeon?.id);
    const st = STAGES.find(x => x.id === s.stage)!;
    const finalWave = !!dungeon && s.dungeon!.wave === dungeon.fish.length - 1;
    const tier = encounterTier(s);
    const targetOk = !!s.target && st.fish.includes(s.target) && (FISH.find(x => x.id === s.target)?.minTier || 0) <= tier;
    // v27.22 숙련의 까미: 사냥터 출현마다 아주 드물게. 그 사냥터에서 가장 강한 몬스터의 몸집을 빌립니다.
    // v27.58 경험의 누리: 까미와 같은 난수 하나를 [까미 구간 | 누리 구간]으로 나눠 씁니다(난수 사용 횟수는 그대로).
    // v27.80 무리 서식지에는 까미·누리가 나오지 않습니다(무리만 확정).
    // v3.31 승천한 모험가에게는 까미·누리가 난이도 0부터 나옵니다(난이도 조건만 없앰, 레벨·처치 수 조건은 그대로).
    const asc = ascended(s), mimicOk = !dungeon && !st.habitat && (asc || tier >= MIMIC.minTier) && s.level >= MIMIC.minLevel && s.kills >= MIMIC.minKills, nuriOk = !dungeon && !st.habitat && nuriEligible(s, asc ? Math.max(tier, EXP_NURI.minTier) : tier);
    // v27.60 행운의 편지(세계석 연구): 까미·누리 등장 확률 +15%/단계.
    const luck = specialLuck(s);
    const mimicP = mimicOk ? mimicChance(tier, STAGES.indexOf(st)) * (s.catchingUp ? specialOfflineScale(s, MIMIC.offlineScale) : 1) * (s.event?.mimic ?? 1) * luck : 0;
    const nuriP = nuriOk ? nuriChance(tier) * (s.catchingUp ? specialOfflineScale(s, EXP_NURI.offlineScale) : 1) * (s.event?.nuri ?? 1) * luck : 0;
    const special = mimicOk || nuriOk ? rng() : 1;
    const mimic = special < mimicP, nuri = !mimic && special < mimicP + nuriP;
    // v3.12 칠흑의 보스: 무리 서식지 출현마다 아주 드물게(천장 있음). 집중 사냥 대상이 아니며 그 서식지 최강 몬스터의 몸집(×100 무리급 체력, 공격 ×3)을 빌립니다.
    const onyxDef = !dungeon && st.habitat ? onyxBossFor(st.region) : undefined;
    let onyx = false;
    if (onyxDef) { s.onyxSeen ??= {}; const seen = s.onyxSeen[st.region] || 0; onyx = rng() < onyxChance(tier, seen); s.onyxSeen[st.region] = onyx ? 0 : seen + 1; }
    const rare = mimic || nuri || onyx, rareId = onyx ? onyxDef!.id : mimic ? MIMIC.id : EXP_NURI.id, rareDef = onyx ? { hp: ONYX.hp, attack: ONYX.attack } : mimic ? MIMIC : EXP_NURI;
    const id = rare ? rareId : dungeon ? (finalWave && dungeon.bossFish ? dungeon.bossFish : dungeon.fish[s.dungeon!.wave]) : (targetOk ? s.target! : weightedFishId(st.fish, rng, rareSpawnBonus(s), tier));
    // v27.64 사냥터 몬스터는 난이도만큼 레벨이 올라갑니다(내 레벨까지, tideLiftFish). 까미·누리는 올라간 가장 강한 몬스터의 몸집을 빌립니다.
    const top = rare ? tideLiftFish([...st.fish].map(x => FISH.find(y => y.id === x)!).sort((a, b) => b.level - a.level)[0], tier, s.level) : undefined;
    const f = rare ? { ...FISH.find(x => x.id === rareId)!, level: top!.level, hp: Math.round(top!.hp * rareDef.hp), attack: Math.round(top!.attack * rareDef.attack), defense: top!.defense, exp: top!.exp, gold: top!.gold } : FISH.find(x => x.id === id)!;
    const boss = finalWave;
    const normalDungeon = !!dungeon && dungeon.id !== 'abyss', dLevel = dungeon ? dungeonLevelAt(dungeon, tier, s.level) : 0;
    // v27.67 레벨이 올라간 몬스터는 사냥터 평균 보상 배율로 나눠 사냥터 사이 보상을 맞춥니다(stageRewardNorm). 일반 사냥터는 stageField(도감과 공용).
    const field = !dungeon && !rare ? stageField(s, st.id, f.id, tier).field : normalDungeon ? tideLiftFish(f, tier, s.level) : f;
    const foe = dungeon?.id === 'abyss' ? abyssEnemyStats(f, abyssReference(), s.dungeon!.depth || 1, { boss, wave: s.dungeon!.wave })
        : scaledEnemyStats(field, { boss, tier, ...(s.dungeon ? { wave: s.dungeon.wave } : {}) });
    const base = dungeon ? dungeonCatchReward(field, dLevel, tier, boss, dungeon.id) : catchReward(field, tier, boss);
    // v3.9 깊이 계수(뒤 사냥터·던전일수록 조금 더 어렵고 더 줌). 무릉도장·랜덤게임·까미·누리는 1.
    applyDepth(foe, base, dungeon ? dungeonDepth(dungeon.id) : stageDepth(st.id));
    const gold = base.gold;
    // v27.66 레벨 차 경험치 보정(EXP_LEVEL_GAP). 던전은 보상에 쓰는 몬스터 레벨(권장 + expLevelOver, 보스는 권장 레벨), 사냥터는 실제 몬스터 레벨 기준.
    const rewardLevel = dungeon ? (boss ? dLevel : Math.min(field.level, dLevel + DUNGEON_TUNING.expLevelOver)) : field.level;
    const exp = Math.max(1, Math.round(base.exp * expLevelScale(rewardLevel, s.level)));
    // v25.19 변종: 몬스터를 10회 이상 처치한 사냥터 출현마다 한 번 판정합니다. 무리는 체력 ×N(×100 이상은 98%)인 한 개체이고 공격은 ×500에서만 체력과 같은 배율, 방어는 한 마리와 같습니다.
    let swarm = 1, variant: typeof VARIANTS[number]['id'] | undefined;
    if (!dungeon && !rare && st.habitat) { variant = 'swarm'; swarm = rollHabitatSwarm(rng, HABITAT.bigChance, HABITAT.sizes); }
    else if (!dungeon && !rare && (s.book[f.id] || 0) >= VARIANT_BOOK_MIN) {
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
    s.enemy = { id: f.id, name: boss ? dungeon!.boss : f.name, hp: foe.hp, maxHp: foe.hp, attack: foe.attack, defense: foe.defense, exp, gold, boss: boss || onyx, ...(onyx ? { onyx: rareId, leavesAt: s.turn + ONYX.turns } : {}), stun: 0, combatStats: foe, skills: foeSkills(f.id, field.level, boss || !!FISH.find(x => x.id === f.id)?.boss), cooldowns: {}, effects: {}, mana: 100, ...(swarm > 1 ? { swarm, born: s.turn } : {}), ...(variant ? { variant } : {}) };
}
const fishLevelOf = (id: string) => FISH.find(f => f.id === id)?.level || 1;
export function reward(s: State, rng: () => number) {
    const e = s.enemy!;
    // v27.86 랜덤게임: 처치 경험치·골드·드롭·숙련 없이 처치 수·도감만 세고, 판돈을 쌓아 다음 웨이브로 갑니다.
    if (inRandomGame(s)) {
        s.kills += 1;
        s.book[e.id] = (s.book[e.id] || 0) + 1;
        { const t = encounterTier(s); if (t > (s.bookTier?.[e.id] || 0)) (s.bookTier ??= {})[e.id] = t; }
        { const max = stats(s).hp; s.hp = Math.min(max, s.hp + Math.floor(max * victoryHealRate(s))); }
        s.enemy = null; s.effects = {}; s.playerStun = 0;
        clearRandomWave(s);
        return;
    }
    // Use the loadout and growth level at the time of victory, before new mastery unlocks.
    // 무리 사냥은 전멸 시 N마리분을 지급합니다. 조건부 숙련 상한은 한 마리 기준으로 적용한 뒤 N배.
    const size = e.swarm || 1, vdef = variantById(e.variant), rewardMult = vdef?.reward || 1, expMult = vdef?.expMult || rewardMult, bookPer = vdef?.book || 1;
    // v25.6 계열 집중 카드 ×2 · v27.14 서버 이벤트. v27.74 사냥터 난이도 배율은 없앴습니다. 정수로 유지하려고 올림 없이 곱한 뒤 연구 보정으로 넘깁니다.
    const { focus: focusMastery, event: eventMastery } = masteryMultipliers(s);
    // v3.42 ×500 도전 무리는 경험치·골드 ×1.5(swarmRewardMultiplier).
    const big = swarmRewardMultiplier(size);
    // v3.48 무리 숙련은 마리 수 대신 싸운 턴 × 규모별 값(swarmMasteryKills, 마리 수 상한). 서식지가 숙련을 까미보다 몇 배 더 주던 문제.
    const swarmTurns = s.turn - (e.born ?? s.turn) + 1, masteryHeads = size > 1 ? swarmMasteryKills(size, swarmTurns) : 1;
    const masteryReward = victoryMastery(s, e), researched = researchMastery(s, Math.floor(masteryReward.amount * masteryHeads * focusMastery * eventMastery)), practice = researched.total;
    // v3.12 칠흑 세트 4종: 무리 서식지 골드·경험치 +15%.
    const onyxSet = isHabitat(s.stage) && !s.dungeon ? 1 + onyxSetBonus(ownedOnyx(s).size).habitatReward : 1;
    const perFish = Math.floor(e.gold * goldMultiplier(s) * rewardMult * onyxSet), exp = Math.floor(Math.floor(e.exp * expMultiplier(s) * expMult * onyxSet) * size * big);
    // 황금 개체: 섀도어 계보 패시브의 ‘황금 개체 확률’로 한 마리가 황금이 되어 그 한 마리 골드가 10배. 확률 0이면 난수를 쓰지 않습니다.
    const goldenChance = stats(s).goldenFind || 0, golden = goldenChance > 0 && rng() < goldenChance;
    const gold = Math.floor(perFish * size * big) + (golden ? perFish * 9 : 0);
    if (golden) { s.goldenBook ??= {}; s.goldenBook[e.id] = (s.goldenBook[e.id] || 0) + 1; }
    // v27.79 계급장: 처치 수(무리는 마릿수)만큼 계급 경험치. ‘전과 기록’ 특전이 마리당 더 셉니다. 기록이 없던 세이브는 지금까지의 처치 수에서 시작합니다. 진급하면 알립니다.
    const rk = rankState(s), rankBefore = rankIndex(rk.exp);
    s.kills += size;
    // v3.46 무리는 마리 수 대신 싸운 턴 × 규모별 턴당 값(swarmRankKills, 마리 수 상한). 소수점은 이월합니다.
    if (size > 1) { const raw = swarmRankKills(size, swarmTurns) * (1 + rankPerkLevel(s, 'tally')) + (rk.frac || 0), gain = Math.floor(raw); rk.exp += gain; rk.frac = raw - gain; }
    else rk.exp += 1 + rankPerkLevel(s, 'tally');
    s.rank = rk;
    if (rankIndex(rk.exp) > rankBefore) { const r = RANKS[rankIndex(rk.exp)]; addLog(s, `✦ ${r.name}(으)로 진급! 진급 포인트 +${r.points} (능력치 · 빌드 화면의 계급에서 사용)`, 'reward'); }
    // v27.22 숙련의 까미: 로또 숙련을 이번 처치 숙련에 더합니다(직업·장착 스킬 모두). v3.30 처치 줄의 ‘숙련 +N’은 당첨분을 합친 값입니다.
    let mimicBonus = 0;
    if (e.id === MIMIC.id) { const t = rollMimicMastery(rng, s); mimicBonus = t.mastery; addLog(s, `✦ 숙련의 까미 · ${t.label}당첨! 직업·장착 스킬 숙련 +${t.mastery.toLocaleString()}`, 'reward'); }
    // v3.31 승천 숙련 배율(1회당 +100%, 5회 ×6)은 까미 당첨분까지 합친 이번 처치 숙련 전체에 곱합니다. 다른 배율은 까미에 걸지 않습니다.
    const practiceTotal = Math.floor((practice + mimicBonus) * ascensionMastery(s));
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
    const newJobRank = thresholdRank(s.jobMastery[s.job], jobTargets);
    if (newJobRank > oldJobRank) addLog(s, `직업 단련 ${newJobRank}단계 달성 · 현재 직업의 체력·양 공격·양 방어 +4%`, 'skill');
    for (const id of s.skills) {
        if (canUse(s, id)) {
            const sk = skillById(id)!, targets = skillRefinementTargets(sk);
            const before = thresholdRank(refinePractice(s, id), targets);
            s.skillPractice[id] = (s.skillPractice[id] || 0) + practiceTotal;
            const after = thresholdRank(refinePractice(s, id), targets);
            if (after > before) addLog(s, `${sk.name} 연마 ${after}/${targets.length}단계 달성 · 직접 피해·양수 패시브 누적 ${refinementBonusLabel(after)}`, 'skill');
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
    // v27.58 경험의 누리: 지금 레벨 필요 경험치의 1~3%. 배율과 무관하게 바로 더합니다.
    if (e.id === EXP_NURI.id && s.level < 100) {
        const t = rollNuriTier(rng), bonus = Math.max(1, Math.floor(xpNeeded(s.level, s.rebirths, xpWall(s)) * t.pct));
        s.exp += bonus;
        addLog(s, `✦ 경험의 누리 · ${t.label}당첨! 경험치 +${bonus.toLocaleString()} (Lv.${s.level} 필요량의 ${Math.round(t.pct * 100)}%)`, 'reward');
    }
    addLog(s, `${golden ? '✦ 황금 ' : ''}${vdef && e.variant !== 'swarm' ? `${vdef.mark} ${vdef.name} ` : ''}${e.name}${size > 1 ? ` 무리 ×${size}` : ''} 처치 · +${gold} G · +${exp} EXP${practiceTotal > 0 ? ` · 숙련 +${practiceTotal}` : ''}${golden ? ' · 황금 개체 골드 10배' : ''}${big > 1 ? ` · 큰 무리 보상 ×${big}` : ''}${vdef && e.variant !== 'swarm' ? ` · 변종 보상 ×${rewardMult}${bookPer > 1 ? ` · 도감 +${bookPer}` : ''}` : ''}`, 'reward');
    if (masteryReward.bonus) addLog(s, `${masteryReward.source} · 직업·장착 스킬 숙련 +${practice} (기본 ${masteryReward.base} + 보너스 ${masteryReward.bonus}${size > 1 ? ` · 무리 ×${+masteryHeads.toFixed(2)}` : ''}${researched.extra ? ` · 숙련의 기억 +${researched.extra}` : ''})`, 'skill');
    // v3.12 칠흑 보스 처치: drop 확률로 그 보스의 장신구 1개(dropPity번째 연속 미획득 격파는 확정, 종당 1개, 이미 있으면 세계석). 환생해도 남습니다.
    if (e.onyx) {
        const bossDef = onyxById(e.onyx)!; s.onyxBook ??= {}; s.onyxBook[e.onyx] = (s.onyxBook[e.onyx] || 0) + 1; s.onyxMiss ??= {};
        const miss = s.onyxMiss[e.onyx] || 0, dropRoll = rng();
        if (ownedOnyx(s).has(e.onyx)) { s.pearls += ONYX.duplicatePearls; addLog(s, `✦ ${bossDef.name} 격파 · ${bossDef.accessory.name}은(는) 이미 있어 세계석 +${ONYX.duplicatePearls}`, 'reward'); }
        else if (dropRoll >= ONYX.drop && miss + 1 < ONYX.dropPity) { s.onyxMiss[e.onyx] = miss + 1; addLog(s, `✦ ${bossDef.name} 격파 · 장신구를 남기지 않았습니다 (연속 미획득 ${miss + 1}/${ONYX.dropPity} · ${ONYX.dropPity}번째는 확정)`, 'reward'); }
        else {
            s.onyxMiss[e.onyx] = 0;
            const stageLevel = STAGES.find(x => x.id === s.stage)?.level || fishLevelOf(e.id), item = onyxAccessory(bossDef, `onyx-${e.onyx}-${s.turn}`, stageLevel);
            item.affixes = rollAffixes(ONYX.affixes + 1, item.power, item.origin, rng, item.affixes!, 'charm', stageLevel);
            s.inventory.push(item); s.itemBook ??= {}; s.itemBook[onyxCodexKey(e.onyx)] = true;
            addLog(s, `✦ ${bossDef.name} 격파 · 칠흑 장신구 ‘${item.name}’ 획득! 환생해도 남습니다 (보유 ${ownedOnyx(s).size}/7종) · 물건 도감 자동 등록`, 'reward');
        }
    }
    const fish = FISH.find(f => f.id === e.id)!;
    // v3.42 무리는 마리 수 N 대신 √N번만 드롭을 판정하고(×500은 2배), 덜 굴린 판정은 기대 장비 수만큼 정수로 바꿉니다.
    const rolls = swarmDropRolls(size) * (size >= SWARM_BIG.size ? SWARM_BIG.drops : 1);
    for (let i = 0; i < rolls * (vdef?.drops || 1); i++)
        drop(s, dropLevel(s, fish.level, encounterTier(s)), rng);
    if (size > rolls) {
        const owed = (size - rolls) * dropRate(s) * SWARM_ESSENCE_PER_ITEM, essence = Math.floor(owed) + (rng() < owed % 1 ? 1 : 0);
        if (essence > 0) { s.essence = (s.essence || 0) + essence; addLog(s, `무리 전리품 · 정수 +${essence}`, 'reward'); }
    }
    if (vdef?.guaranteed) drop(s, dropLevel(s, fish.level, encounterTier(s)), rng, true);
    // v27.86 사냥터 난이도 이정표 세계석은 없앴습니다. 사냥터별 최고 난이도 기록(업적용)만 남깁니다.
    if (!s.dungeon && !isHabitat(s.stage)) { const tier = encounterTier(s); if (tier > (s.tideBest?.[s.stage] || 0)) (s.tideBest ??= {})[s.stage] = tier; }
    gainLevels(s);
    for (const id of grantJobSkills(s)) {
        const sk = skillById(id)!;
        if (sk.unlockJobMastery) addLog(s, `직업 숙련으로 ${sk.name} 해금 · 기본 Lv.0부터 장착 가능`, 'skill');
    }
    s.hp = Math.min(stats(s).hp, s.hp + victoryHeal(s));
    s.enemy = null;
    s.effects = {};
    s.playerStun = 0;
    if (s.dungeon) {
        const d = DUNGEONS.find(x => x.id === s.dungeon!.id)!;
        s.dungeon.wave++;
        if (s.dungeon.wave >= d.fish.length) {
            // v27.30 권장 레벨보다 크게 높으면 클리어 골드와 반복 장비 확률이 줄어듭니다.
            const tier = encounterTier(s), dLevel = dungeonLevelAt(d, tier, s.level), overlevel = dungeonOverlevel(s.level, dLevel);
            const bonusGold = Math.floor(dungeonClearGold(s, dungeonClearBase({ level: dLevel }), dungeonRewardTier(tier, d.id)) * overlevel * dungeonDepth(d.id));
            s.gold += bonusGold;
            const first = !s.clears[d.id];
            const depth = s.dungeon.depth || 1;
            recordGoal(s, 'dungeon', d.id, 1, text => addLog(s, text, 'reward'));
            if (d.id === 'abyss') {
                const deeper = depth > s.abyssBest;
                s.abyssBest = Math.max(s.abyssBest, depth);
                recordAbyssDepth(s, depth, s.lastTick);
                const pearls = abyssPearls(depth);
                s.pearls += pearls;
                addLog(s, `무릉도장 ${depth}층 정복 · 세계석 +${pearls}`, 'reward');
                s.abyssMilestones ??= [];
                // v25.8 10층마다 첫 돌파 보너스(층 수만큼 세계석). v3.38 30·60·90층 장착 AP 이정표는 없앴습니다.
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
            // 희귀 이상 확정 장비: 첫 정복, 무릉도장 5층마다, 반복 정복은 낮은 확률.
            if (first || (d.id === 'abyss' && depth % 5 === 0) || rng() < BALANCE.dungeonRepeatDrop * overlevel)
                drop(s, dropLevel(s, dLevel, tier), rng, true);
            addLog(s, `${d.name} 정복! +${bonusGold} G${first && d.id !== 'abyss' ? ` · 첫 클리어 +${d.pearls} 세계석` : ''}`, 'reward');
            const repeat = s.dungeon.repeat;
            s.dungeon = null;
            s.running = false;
            if (repeat) continueRepeat(s, d.id, repeat);
            else endRun(s, `${d.name} 정복 · 1회 도전 완료로 멈춤`);
        }
    }
}
