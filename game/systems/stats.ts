import { tailwindActive, TAILWIND_EXP, tierReward } from './meta';
import { rebirthExperience, rebirthMemory, evasionRating, vocationTargets, thresholdRank } from '../data/long-term';
import { itemStats } from './equipment';
import type { State, Snapshot, Stats, CombatStats } from '../types';
import { BALANCE, SAVE_VERSION, SKILL_FORMULA } from '../data/balance';
import { PROGRESSION } from '../data/progression';
import { JOBS } from '../data/classes';
import { SKILLS } from '../data/skills';
import { attributes, effectiveSkill, completedRegions, canUse, skillMastery, skillMasteryRanks, skillMasteryRewards, jobMasteryTarget, jobCombatMultiplier } from './progression';
/** Legacy PvP snapshots gain safe defaults, never client-supplied progression. */
export function normalizeStats(a: Stats): CombatStats { return { expBonus: 0, goldBonus: 0, dropBonus: 0, rebirthBonus: 0, dungeonGoldBonus: 0, magic: a.attack, resist: a.defense, harmony: 0, accuracy: 1, evasion: 0, critDamage: BALANCE.critMultiplier, speed: 10, mana: 40, manaRegen: 3, penetration: 0, lifesteal: 0, thorns: 0, dotBonus: 0, guardAffinity: 1, healFocus: 0, arcaneStrike: 0, ...a }; }
export function mastery(s: State) { return Object.values(s.book).reduce((a, n) => a + BALANCE.bookMilestones.filter(m => n >= m).length, 0); }
export function stats(s: State): CombatStats {
    const j = JOBS.find(j => j.id === s.job) || JOBS[0], v = attributes(s), m = mastery(s), regions = completedRegions(s).length;
    const a: CombatStats = { expBonus: permanentExpBonus(s) + (j.expBonus || 0), goldBonus: 0, dropBonus: 0, rebirthBonus: 0, dungeonGoldBonus: 0, hp: BALANCE.baseHp + (s.level - 1) * BALANCE.hpPerLevel + v.vit * 9 + regions * 20,
        attack: BALANCE.baseAttack + (s.level - 1) * BALANCE.attackPerLevel + m + v.str * 2,
        magic: 10 + (s.level - 1) * 3 + v.int * 2.4 + m,
        defense: BALANCE.baseDefense + (s.level - 1) * BALANCE.defensePerLevel + v.vit * .6 + v.str * .25,
        resist: 3 + (s.level - 1) * .7 + v.wis * 1.2,
        crit: BALANCE.baseCrit + j.crit + v.luk * .003, critDamage: BALANCE.critMultiplier + v.luk * .005,
        accuracy: .92 + v.dex * .004, evasion: v.dex * .002, speed: 10 + v.dex * .5, mana: 30 + v.wis * 3 + v.int, manaRegen: 2 + v.wis * .15, penetration: 0, lifesteal: 0, harmony: harmonyPower(s), thorns: 0, dotBonus: 0, guardAffinity: guardAffinity(j.defense), healFocus: j.healer ? 1 : 0, arcaneStrike: arcaneStrikeChance(j) };
    a.goldBonus = (s.permanent.gold || 0) * .1 + v.luk * .002;
    a.rebirthBonus = s.permanent.pearl || 0;
    a.dungeonGoldBonus = (s.permanent.dungeon || 0) * .08;
    for (const item of Object.values(s.equipment)) {
        if (item)
            for (const [key, n] of Object.entries(itemStats(item)))
                a[key as keyof Stats] += n;
    }
    const passiveJobs = new Set<string>();
    for (const id of s.skills) {
        if (!canUse(s, id))
            continue;
        const sk = SKILLS.find(x => x.id === id);
        if (sk?.type === 'passive' && sk.job && Object.values(sk.bonus || {}).some(n => n > 0)) passiveJobs.add(sk.job);
        if (sk?.bonus) {
            const bonus = effectiveSkill(sk, s.learned[id] || 1, skillMastery(s, id), undefined, s.skillPractice[id] || 0).bonus!;
            for (const [key, n] of Object.entries(bonus))
                a[key as keyof Stats] += n;
        }
        if (sk) {
            const masteryBonus = skillMasteryRewards(sk, s.learned[id] || 1, skillMastery(s, id)).bonus;
            for (const [key, n] of Object.entries(masteryBonus))
                a[key as keyof Stats] += n;
        }
    }
    for (const [key, n] of Object.entries(j.penalties || {}))
        a[key as keyof Stats] += n;
    const mastered = (s.jobMastery?.[s.job] || 0) >= jobMasteryTarget(j);
    const mult = (n: number) => jobCombatMultiplier(j, n, mastered);
    a.hp *= mult(j.hp) * (1 + (s.permanent.hp || 0) * .08);
    a.attack *= mult(j.attack) * (1 + (s.permanent.attack || 0) * .05);
    a.magic *= mult(j.magic) * (1 + (s.permanent.attack || 0) * .05);
    a.defense *= mult(j.defense);
    a.resist *= mult(j.resist);
    const dedication = thresholdRank(s.jobMastery?.[s.job] || 0, vocationTargets(jobMasteryTarget(j)));
    const memory = rebirthMemory(s.rebirths) * (1 + dedication * .04);
    for (const key of ['hp', 'attack', 'magic', 'defense', 'resist'] as const) a[key] *= memory;
    // 육중 조화: 공격력과 같은 연구·환생·직업 배율을 받고, 서로 다른 직업의 능력치 패시브를 빌려 올수록 강해집니다.
    a.harmony *= mult((j.attack + j.magic) / 2) * (1 + (s.permanent.attack || 0) * .05) * memory * SKILL_FORMULA.harmonyScale
        * (1 + Math.min(SKILL_FORMULA.harmonyJobCap, passiveJobs.size) * SKILL_FORMULA.harmonyPerJob);
    // 반격은 방어 친화도만큼만 발휘됩니다.
    a.thorns *= a.guardAffinity;
    a.defense *= 1 + (s.permanent.guard || 0) * .03;
    a.resist *= 1 + (s.permanent.guard || 0) * .03;
    for (const k of ['hp', 'attack', 'magic', 'defense', 'resist', 'mana', 'speed', 'harmony'] as (keyof CombatStats)[])
        a[k] = Math.max(k === 'hp' || k === 'speed' ? 1 : 0, Math.floor(a[k]));
    a.crit = Math.min(.6, a.crit);
    a.evasion = evasionRating(a.evasion);
    a.penetration = Math.min(.6, a.penetration);
    a.lifesteal = Math.min(.3, a.lifesteal);
    return a;
}
export function dropRate(s: State) { return Math.min(.6, BALANCE.dropChance + attributes(s).luk * .001 + Object.keys(s.itemBook || {}).length * PROGRESSION.itemDropBonus + (s.permanent.drop || 0) * .01 + (stats(s).dropBonus || 0)); }
export function power(v: Stats) { const a = normalizeStats(v); return Math.round(Math.max(a.attack, a.magic) * 7 + Math.min(a.attack, a.magic) * 2 + a.hp * .5 + (a.defense + a.resist) * 3 + a.crit * 200 + Math.max(0, a.accuracy - .8) * 220 + a.evasion * 200); }
export function snapshot(s: State): Snapshot { const a = stats(s); return { season: SAVE_VERSION, name: s.name, level: s.level, job: s.job, rebirths: s.rebirths, stats: a, skills: s.skills.filter(id => canUse(s, id)), skillRanks: { ...s.learned }, skillMastery: skillMasteryRanks(s), skillSpecializations: { ...s.skillSpecializations }, skillPractice: { ...s.skillPractice }, power: power(a), rating: s.rating, guild: s.guild?.name || '' }; }
/** 마법 직업이면 기본 공격이 마력 평타로 바뀔 확률(차수별). */
export const arcaneStrikeChance = (j: { magic: number; attack: number; tier: number }) => j.magic - j.attack >= .05 ? SKILL_FORMULA.arcaneStrikeChance[Math.min(j.tier, SKILL_FORMULA.arcaneStrikeChance.length - 1)] || 0 : 0;
/** 직업의 물리 방어 배율로 정하는 방어 친화도(0.2~1). 방어 비례 피해·반격의 효율입니다. */
export const guardAffinity = (defenseMultiplier: number) => Math.min(1, Math.max(SKILL_FORMULA.guardFloor, (defenseMultiplier - SKILL_FORMULA.guardBase) / SKILL_FORMULA.guardSpan));
/** 육중 조화의 원시 피해. 직접 배분한 포인트(s.attributes)만 사용합니다. */
export function harmonyPower(s: Pick<State, 'attributes'>) {
    const points = Object.values(s.attributes || {});
    if (!points.length) return 0;
    const total = points.reduce((sum, n) => sum + n, 0), lowest = Math.min(...points);
    return SKILL_FORMULA.harmonyBase + total * SKILL_FORMULA.harmonyPerPoint + lowest * SKILL_FORMULA.harmonyPerLowest;
}
/** 환생 횟수와 진주 연구(항해의 기억)로 얻는 영구 경험치 보너스. 직업 보너스는 제외. */
export const permanentExpBonus = (s: State) => rebirthExperience(s.rebirths) + (s.permanent.exp || 0) * .2;
/** 최대치가 바뀐 뒤 현재 체력·마나를 새 최대치 이하로 맞춥니다. */
export function clampVitals(s: State) {
    s.hp = Math.min(s.hp, stats(s).hp);
    s.mana = Math.min(s.mana, stats(s).mana);
}
export const goldMultiplier = (s: State) => 1 + stats(s).goldBonus;
export const expMultiplier = (s: State) => Math.max(0, 1 + stats(s).expBonus) * (tailwindActive(s) ? 1 + TAILWIND_EXP : 1);
export const dungeonGoldMultiplier = (s: State) => 1 + (stats(s).dungeonGoldBonus || 0);
/** 던전 정복 골드. 전투 보상과 던전 화면 표시가 같은 식을 씁니다. */
export const dungeonClearGold = (s: State, baseGold: number, tier: number) => Math.floor(baseGold * tierReward(tier) * goldMultiplier(s) * dungeonGoldMultiplier(s));
export const hitChance = (a: Stats, b: Stats) => {
    const accuracy = Math.max(0, a.accuracy ?? 1);
    const evasion = Math.max(0, b.evasion ?? 0);
    const tempo = Math.max(-.06, Math.min(.06, .08 * Math.log2(Math.max(1, a.speed ?? 10) / Math.max(1, b.speed ?? 10))));
    return Math.min(.995, Math.max(.01, accuracy - evasion + tempo));
};
