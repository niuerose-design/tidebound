/** 적 등장·드롭·승리 보상. */
import { BOSS_RESEARCH } from '../data/specializations';
import { DROP_RARITY, rollAffixes } from '../data/gear';
import { vocationTargets, thresholdRank, refinementBonusLabel, abyssPearls, ABYSS_SP_MILESTONES, ABYSS_AP_MILESTONES, abyssFloorBonus, TIDE_MILESTONES, TIDE_MILESTONE_PEARLS } from '../data/long-term';
import { jobMasteryTarget, skillRefinementTargets } from './progression';
import { catchReward, encounterTier, dungeonCatchReward, dungeonClearBase, dungeonRewardTier } from './meta';
import { stats, dropRate, dungeonClearGold, goldMultiplier, expMultiplier } from './stats';
import { victoryMastery, researchMastery, masteryMultipliers } from './mastery';
import { inventoryCap, researchRank } from '../data/economy';
import { rareSpawnBonus } from './book';
import { VARIANTS, VARIANT_BOOK_MIN, variantById, variantChances, rollSwarmSize } from '../data/variants';
import { MIMIC, rollMimicMastery, mimicChance, specialLuck } from '../data/mimic';
import { EXP_NURI, rollNuriTier, nuriChance, nuriEligible } from '../data/exp-nuri';
import type { State, Item } from '../types';
import { BALANCE, MONSTER_TUNING, RARITIES, xpNeeded, dungeonOverlevel, DUNGEON_TUNING } from '../data/balance';
import { FISH, STAGES, DUNGEONS, swarmHpMultiplier, swarmAttackMultiplier, stageStatFish, tideLiftFish, expLevelScale } from '../data/world';
import { jobById } from '../data/classes';
import { skillById } from '../data/skills';
import { gearName } from '../data/maple-gear';
import { PROGRESSION } from '../data/progression';
import { canUse, grantJobSkills, itemKey } from './progression';
import { saleValue } from './equipment';
import { roughLevel, roughEnemy, anchorSeal, atAnchorTarget, anchorPayout, anchorTargetName, ANCHOR_CATCHES } from './vows';
import { scaledEnemyStats, profile, abyssEnemyStats } from '../data/encounters';
import { recordGoal, recordAbyssDepth } from './progress';
import { addLog, endRun } from './state';
import { continueRepeat } from './dungeon-run';
/** 처치 1회당 회복량. 무리 규모와 관계없이 처치마다 한 번 적용합니다(응급처치 포함). */
export function victoryHeal(s: State) {
    return Math.floor(stats(s).hp * victoryHealRate(s));
}
/** 쌓인 경험치로 올릴 수 있는 만큼 레벨을 올립니다(최대 Lv.100). */
export function gainLevels(s: State) {
    while (s.exp >= xpNeeded(s.level, s.rebirths) && s.level < 100) {
        s.exp -= xpNeeded(s.level, s.rebirths);
        s.level++;
        s.statPoints += PROGRESSION.statPerLevel;
        if (s.level > s.peakLevel) {
            s.sp += (s.level - s.peakLevel) * PROGRESSION.spPerPeakLevel;
            s.peakLevel = s.level;
        }
        s.mana = stats(s).mana;
        s.hp = stats(s).hp;
        addLog(s, `레벨 ${s.level} 달성! 능력치가 상승했습니다.`);
    }
}
/** 잠든 힘 봉인 해제. 달성하면 쌓인 경험치 × 배율, 포기하면 그대로 지급합니다. 레벨은 호출한 쪽에서 gainLevels로 올립니다. */
export function releaseAnchor(s: State, achieved: boolean) {
    const seal = anchorSeal(s);
    if (!seal) return 0;
    const exp = achieved ? Math.floor(seal.exp * anchorPayout(s)) : seal.exp;
    s.exp += exp;
    s.vows!.seal = null;
    addLog(s, achieved ? `잠든 힘 봉인 해제 · ${anchorTargetName(seal)}에서 ${ANCHOR_CATCHES}마리 달성 · 쌓인 경험치 ×${anchorPayout(s)} = +${exp} EXP` : `잠든 힘 포기 · 쌓인 경험치 +${exp} EXP를 그대로 받았습니다.`, 'reward');
    return exp;
}
/** 처치 후 기본 회복률(응급처치 제외): 필드 8%·던전 4% + 회복의 기억 1%p/단계. */
/** 처치 후 회복률. v27.8 사냥터는 기본 20%에서 사냥터 난이도 1마다 1%p씩 줄어(최저 5%) 깊은 조수일수록 버티기가 어렵습니다. 던전은 고정 8%. 연구 ‘회복의 기억’은 1단계마다 +1%p. */
export const victoryHealRate = (s: State) => (s.dungeon ? MONSTER_TUNING.dungeonHealAfterKill : Math.max(BALANCE.healAfterKillMin, BALANCE.healAfterKill - encounterTier(s) * BALANCE.healAfterKillTierDecay)) + researchRank(s, 'recovery') * .01;
/** 드롭 등급: DROP_RARITY 분포에서 minRarity 이상만 다시 정규화해 뽑습니다. */
export function rollRarity(rng: () => number, minRarity = 0) {
    const weights = DROP_RARITY.map((w, i) => i >= minRarity ? w : 0);
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
    const rarity = rollRarity(rng, 1);
    const origin = s.dungeon?.id || s.stage;
    const slot = (['rod', 'coat', 'charm'] as const)[Math.floor(rng() * 3)];
    const item: Item = { id: `loot-${s.turn}-${s.logId}-${Math.floor(rng() * 1e9)}`, slot, rarity, name: '', power: Math.max(2, Math.round((level + 2) * RARITIES[rarity].factor * (.8 + rng() * .4))), level };
    if (rarity > 0)
        item.affixes = rollAffixes(rarity, item.power, origin, rng);
    item.origin = origin;
    if (slot === 'rod')
        item.style = rng() < .33 ? 'physical' : rng() < .5 ? 'magic' : 'balanced';
    item.name = gearName(slot, rarity, item.style);
    // 선별의 눈: 켜 두면 1단계는 일반, 2단계는 희귀 이하를 바로 팝니다. 유물·장비 도감에 없는 종류는 남깁니다.
    const net = researchRank(s, 'sortingNet');
    if (net && s.autoSell && !item.relic && item.rarity <= net && s.itemBook?.[itemKey(slot, rarity)]) {
        s.gold += saleValue(item);
        addLog(s, `선별의 눈: ${item.name} 자동 판매 +${saleValue(item)} G`, 'reward');
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
export function spawn(s: State, rng: () => number) {
    const dungeon = DUNGEONS.find(d => d.id === s.dungeon?.id);
    const st = STAGES.find(x => x.id === s.stage)!;
    const finalWave = !!dungeon && s.dungeon!.wave === dungeon.fish.length - 1;
    const tier = encounterTier(s);
    const targetOk = !!s.target && st.fish.includes(s.target) && (FISH.find(x => x.id === s.target)?.minTier || 0) <= tier;
    // v27.22 숙련의 까미: 사냥터 출현마다 아주 드물게. 그 사냥터에서 가장 강한 몬스터의 몸집을 빌립니다.
    // v27.58 경험의 누리: 까미와 같은 난수 하나를 [까미 구간 | 누리 구간]으로 나눠 씁니다(난수 사용 횟수는 그대로).
    const mimicOk = !dungeon && tier >= MIMIC.minTier && s.level >= MIMIC.minLevel && s.kills >= MIMIC.minKills, nuriOk = !dungeon && nuriEligible(s, tier);
    // v27.60 행운의 편지(세계석 연구): 까미·누리 등장 확률 +15%/단계.
    const luck = specialLuck(s);
    const mimicP = mimicOk ? mimicChance(tier, STAGES.indexOf(st)) * (s.catchingUp ? MIMIC.offlineScale : 1) * (s.event?.mimic ?? 1) * luck : 0;
    const nuriP = nuriOk ? nuriChance(tier) * (s.catchingUp ? EXP_NURI.offlineScale : 1) * luck : 0;
    const special = mimicOk || nuriOk ? rng() : 1;
    const mimic = special < mimicP, nuri = !mimic && special < mimicP + nuriP, rare = mimic || nuri, rareId = mimic ? MIMIC.id : EXP_NURI.id, rareDef = mimic ? MIMIC : EXP_NURI;
    const id = rare ? rareId : dungeon ? (finalWave && dungeon.bossFish ? dungeon.bossFish : dungeon.fish[s.dungeon!.wave]) : (targetOk ? s.target! : weightedFishId(st.fish, rng, rareSpawnBonus(s), tier));
    // v27.64 사냥터 몬스터는 난이도만큼 레벨이 올라갑니다(내 레벨까지, tideLiftFish). 까미·누리는 올라간 가장 강한 몬스터의 몸집을 빌립니다.
    const top = rare ? tideLiftFish([...st.fish].map(x => FISH.find(y => y.id === x)!).sort((a, b) => b.level - a.level)[0], tier, s.level) : undefined;
    const f = rare ? { ...FISH.find(x => x.id === rareId)!, level: top!.level, hp: Math.round(top!.hp * rareDef.hp), attack: Math.round(top!.attack * rareDef.attack), defense: top!.defense, exp: top!.exp, gold: top!.gold } : FISH.find(x => x.id === id)!;
    const boss = finalWave;
    const field = dungeon || rare ? f : tideLiftFish(stageStatFish(f, st.level), tier, s.level);
    const foe = dungeon?.id === 'abyss' ? abyssEnemyStats(f, abyssReference(), s.dungeon!.depth || 1, { boss, wave: s.dungeon!.wave })
        : scaledEnemyStats(field, { boss, tier, ...(s.dungeon ? { wave: s.dungeon.wave } : {}) });
    const base = dungeon ? dungeonCatchReward(f, dungeon.level, tier, boss) : catchReward(field, tier, boss), gold = base.gold;
    // v27.66 레벨 차 경험치 보정(EXP_LEVEL_GAP). 던전은 보상에 쓰는 몬스터 레벨(권장 + expLevelOver, 보스는 권장 레벨), 사냥터는 실제 몬스터 레벨 기준.
    const rewardLevel = dungeon ? (boss ? dungeon.level : Math.min(f.level, dungeon.level + DUNGEON_TUNING.expLevelOver)) : field.level;
    const exp = Math.max(1, Math.round(base.exp * expLevelScale(rewardLevel, s.level)));
    // v25.19 변종: 몬스터를 10회 이상 처치한 사냥터 출현마다 한 번 판정합니다. 무리는 체력 ×N(×100 이상은 98%)인 한 개체이고 공격은 ×500에서만 체력과 같은 배율, 방어는 한 마리와 같습니다.
    let swarm = 1, variant: typeof VARIANTS[number]['id'] | undefined;
    if (!dungeon && !rare && (s.book[f.id] || 0) >= VARIANT_BOOK_MIN) {
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
    // 험한 길: 적 체력·공격 ×(1 + 0.5 × 선택 단계). 사냥터 난이도와 별개로 곱합니다.
    if (roughLevel(s)) {
        const m = roughEnemy(s);
        foe.hp = Math.round(foe.hp * m);
        foe.attack = Math.round(foe.attack * m);
        foe.magic = Math.round((foe.magic || 0) * m);
    }
    s.enemy = { id: f.id, name: boss ? dungeon!.boss : f.name, hp: foe.hp, maxHp: foe.hp, attack: foe.attack, defense: foe.defense, exp, gold, boss, stun: 0, combatStats: foe, skills: f.level >= 5 ? profile(f.id).skills : [], cooldowns: {}, effects: {}, mana: 100, ...(swarm > 1 ? { swarm } : {}), ...(variant ? { variant } : {}) };
}
export function reward(s: State, rng: () => number) {
    const e = s.enemy!;
    // Use the loadout and growth level at the time of victory, before new mastery unlocks.
    // 무리 사냥은 전멸 시 N마리분을 지급합니다. 조건부 숙련 상한은 한 마리 기준으로 적용한 뒤 N배.
    const size = e.swarm || 1, vdef = variantById(e.variant), rewardMult = vdef?.reward || 1, expMult = vdef?.expMult || rewardMult, bookPer = vdef?.book || 1;
    // v25.6 계열 집중 카드 ×2 · v27.14 서버 이벤트 · v27.21 사냥터 난이도(사냥터만). 정수로 유지하려고 올림 없이 곱한 뒤 연구 보정으로 넘깁니다.
    const { focus: focusMastery, event: eventMastery, tide: tideMastery } = masteryMultipliers(s);
    const masteryReward = victoryMastery(s, e), researched = researchMastery(s, Math.floor(masteryReward.amount * size * focusMastery * eventMastery * tideMastery)), practice = researched.total;
    const perFish = Math.floor(e.gold * goldMultiplier(s) * rewardMult), exp = Math.floor(e.exp * expMultiplier(s) * expMult) * size;
    // 황금 개체: 섀도어 계보 패시브의 ‘황금 개체 확률’로 한 마리가 황금이 되어 그 한 마리 골드가 10배. 확률 0이면 난수를 쓰지 않습니다.
    const goldenChance = stats(s).goldenFind || 0, golden = goldenChance > 0 && rng() < goldenChance;
    const gold = perFish * size + (golden ? perFish * 9 : 0);
    if (golden) { s.goldenBook ??= {}; s.goldenBook[e.id] = (s.goldenBook[e.id] || 0) + 1; }
    s.kills += size;
    // v27.22 숙련의 까미: 로또 숙련을 이번 처치 숙련에 더합니다(직업·장착 스킬 모두).
    let mimicBonus = 0;
    if (e.id === MIMIC.id) { const t = rollMimicMastery(rng); mimicBonus = t.mastery; addLog(s, `✦ 숙련의 까미 · ${t.label}당첨! 직업·장착 스킬 숙련 +${t.mastery.toLocaleString()}`, 'reward'); }
    const practiceTotal = practice + mimicBonus;
    const jobTargets = vocationTargets(jobMasteryTarget(jobById(s.job)!));
    const oldJobRank = thresholdRank(s.jobMastery[s.job] || 0, jobTargets);
    s.jobMastery[s.job] = (s.jobMastery[s.job] || 0) + practiceTotal;
    const newJobRank = thresholdRank(s.jobMastery[s.job], jobTargets);
    if (newJobRank > oldJobRank) addLog(s, `직업 단련 ${newJobRank}단계 달성 · 현재 직업의 체력·양 공격·양 방어 +4%`, 'skill');
    for (const id of s.skills) {
        if (canUse(s, id)) {
            const sk = skillById(id)!, targets = skillRefinementTargets(sk);
            const before = thresholdRank(s.skillPractice[id] || 0, targets);
            s.skillPractice[id] = (s.skillPractice[id] || 0) + practiceTotal;
            const after = thresholdRank(s.skillPractice[id], targets);
            if (after > before) addLog(s, `${sk.name} 연마 ${after}/${targets.length}단계 달성 · 직접 피해·양수 패시브 누적 ${refinementBonusLabel(after)}`, 'skill');
        }
    }
    s.book[e.id] = (s.book[e.id] || 0) + size * bookPer;
    if (e.variant) { s.variantBook ??= {}; const row = (s.variantBook[e.id] ??= {}); row[e.variant] = (row[e.variant] || 0) + 1; }
    if (vdef?.pearls) { const pearls = vdef.pearls + (s.rebirths >= 3 ? 1 : 0); s.pearls += pearls; addLog(s, `${vdef.mark} ${vdef.name} · 세계석 +${pearls}`, 'reward'); }
    s.gold += gold;
    recordGoal(s, 'catch', undefined, size, text => addLog(s, text, 'reward')); recordGoal(s, 'species', e.id, size, text => addLog(s, text, 'reward'));
    if (e.boss) recordGoal(s, 'boss', undefined, 1, text => addLog(s, text, 'reward'));
    if (size > 1) recordGoal(s, 'swarm', undefined, 1, text => addLog(s, text, 'reward'));
    // 잠든 힘: 봉인 중에는 경험치를 따로 쌓고, 목표에서 300마리를 잡으면 배율을 곱해 한 번에 지급합니다.
    const seal = anchorSeal(s);
    if (seal) {
        seal.exp += exp;
        if (atAnchorTarget(s)) seal.caught += size;
    }
    else
        s.exp += exp;
    // v27.58 경험의 누리: 지금 레벨 필요 경험치의 1~3%. 배율·잠든 힘 봉인과 무관하게 바로 더합니다.
    if (e.id === EXP_NURI.id && s.level < 100) {
        const t = rollNuriTier(rng), bonus = Math.max(1, Math.floor(xpNeeded(s.level, s.rebirths) * t.pct));
        s.exp += bonus;
        addLog(s, `✦ 경험의 누리 · ${t.label}당첨! 경험치 +${bonus.toLocaleString()} (Lv.${s.level} 필요량의 ${Math.round(t.pct * 100)}%)`, 'reward');
    }
    addLog(s, `${golden ? '✦ 황금 ' : ''}${vdef && e.variant !== 'swarm' ? `${vdef.mark} ${vdef.name} ` : ''}${e.name}${size > 1 ? ` 무리 ×${size}` : ''} 처치 · +${gold} G · +${exp} EXP${golden ? ' · 황금 개체 골드 10배' : ''}${vdef && e.variant !== 'swarm' ? ` · 변종 보상 ×${rewardMult}${bookPer > 1 ? ` · 도감 +${bookPer}` : ''}` : ''}`, 'reward');
    if (masteryReward.bonus) addLog(s, `${masteryReward.source} · 직업·장착 스킬 숙련 +${practice} (기본 ${masteryReward.base} + 보너스 ${masteryReward.bonus}${size > 1 ? ` · ×${size}` : ''}${researched.extra ? ` · 숙련의 기억 +${researched.extra}` : ''})`, 'skill');
    const fish = FISH.find(f => f.id === e.id)!;
    for (let i = 0; i < size * (vdef?.drops || 1); i++)
        drop(s, dropLevel(s, fish.level, encounterTier(s)), rng);
    if (vdef?.guaranteed) drop(s, dropLevel(s, fish.level, encounterTier(s)), rng, true);
    // v25.8 사냥터 난이도 이정표: 사냥터에서 그 차수로 처음 처치하면 사이의 이정표 세계석을 한 번에 줍니다.
    if (!s.dungeon && !seal) {
        const tier = encounterTier(s), best = s.tideBest?.[s.stage] || 0;
        if (tier > best) {
            (s.tideBest ??= {})[s.stage] = tier;
            let pearls = 0; const hit: number[] = [];
            TIDE_MILESTONES.forEach((n, i) => { if (best < n && n <= tier) { pearls += TIDE_MILESTONE_PEARLS[i]; hit.push(n); } });
            if (pearls) { s.pearls += pearls; addLog(s, `사냥터 난이도 이정표 · ${STAGES.find(st => st.id === s.stage)?.name || s.stage} 차수 ${hit.join('·')} 첫 처치 · 세계석 +${pearls}`, 'reward'); }
        }
    }
    if (seal && seal.caught >= ANCHOR_CATCHES) releaseAnchor(s, true);
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
            const overlevel = dungeonOverlevel(s.level, d.level);
            const bonusGold = Math.floor(dungeonClearGold(s, dungeonClearBase(d), dungeonRewardTier(encounterTier(s))) * overlevel);
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
                // v25.8 10층마다 첫 돌파 보너스(층 수만큼 세계석), 30·60·90층 첫 돌파 장착 AP +1.
                if (deeper && abyssFloorBonus(depth)) { s.pearls += abyssFloorBonus(depth); addLog(s, `무릉도장 ${depth}층 첫 돌파 · 보너스 세계석 +${abyssFloorBonus(depth)}`, 'reward'); }
                if (ABYSS_AP_MILESTONES.includes(depth) && !s.abyssMilestones.includes(depth)) { s.abyssMilestones.push(depth); addLog(s, `무릉도장 ${depth}층 첫 돌파 이정표 · 장착 AP +1`, 'reward'); }
                if (ABYSS_SP_MILESTONES.includes(depth) && !s.abyssMilestones.includes(depth)) {
                    s.abyssMilestones.push(depth);
                    s.sp += 1;
                    addLog(s, `무릉도장 ${depth}층 첫 돌파 이정표 · SP +1`, 'reward');
                }
            }
            if (first && BOSS_RESEARCH[d.id]) addLog(s, `${d.name} 첫 정복! 던전 화면에서 연구 보상 SP ${BOSS_RESEARCH[d.id].sp}을 받으세요.`, 'reward');
            if (first && d.id !== 'abyss')
                s.pearls += d.pearls;
            s.clears[d.id] = (s.clears[d.id] || 0) + 1;
            // 희귀 이상 확정 장비: 첫 정복, 무릉도장 5층마다, 반복 정복은 낮은 확률.
            if (first || (d.id === 'abyss' && depth % 5 === 0) || rng() < BALANCE.dungeonRepeatDrop * overlevel)
                drop(s, dropLevel(s, d.level, encounterTier(s)), rng, true);
            addLog(s, `${d.name} 정복! +${bonusGold} G${first && d.id !== 'abyss' ? ` · 첫 클리어 +${d.pearls} 세계석` : ''}`, 'reward');
            const repeat = s.dungeon.repeat;
            s.dungeon = null;
            s.running = false;
            if (repeat) continueRepeat(s, d.id, repeat);
            else endRun(s, `${d.name} 정복 · 1회 도전 완료로 멈춤`);
        }
    }
}
