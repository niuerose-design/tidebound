import { tailwindActive, TAILWIND_EXP } from './meta';
import { rebirthExperience, rebirthMemory, evasionRating, vocationTargets, thresholdRank } from '../data/long-term';
import { itemStats } from './equipment';
import type { State, Snapshot, Stats, CombatStats } from '../types';
import { BALANCE } from '../data/balance';
import { ECONOMY } from '../data/economy';
import { PROGRESSION } from '../data/progression';
import { JOBS } from '../data/classes';
import { SKILLS } from '../data/skills';
import { attributes, effectiveSkill, completedRegions, canUse, canLearn, skillMastery, skillMasteryRanks, skillMasteryRewards, jobMasteryTarget, jobCombatMultiplier } from './progression';
import { guildBonus } from './guild';
/** Legacy PvP snapshots gain safe defaults, never client-supplied progression. */
export function normalizeStats(a: Stats): CombatStats { return { expBonus: 0, goldBonus: 0, dropBonus: 0, rebirthBonus: 0, dungeonGoldBonus: 0, magic: a.attack, resist: a.defense, accuracy: 1, evasion: 0, critDamage: BALANCE.critMultiplier, speed: 10, mana: 40, manaRegen: 3, penetration: 0, lifesteal: 0, ...a }; }
export function mastery(s: State) { return Object.values(s.book).reduce((a, n) => a + BALANCE.bookMilestones.filter(m => n >= m).length, 0); }
export function stats(s: State): CombatStats {
    const j = JOBS.find(j => j.id === s.job) || JOBS[0], v = attributes(s), m = mastery(s), regions = completedRegions(s).length;
    const a: CombatStats = { expBonus: rebirthExperience(s.rebirths) + (s.permanent.exp || 0) * .2 + (j.expBonus || 0), goldBonus: 0, dropBonus: 0, rebirthBonus: 0, dungeonGoldBonus: 0, hp: BALANCE.baseHp + (s.level - 1) * BALANCE.hpPerLevel + (s.upgrades.hp || 0) * 25 + v.vit * 9 + regions * 20,
        attack: BALANCE.baseAttack + (s.level - 1) * BALANCE.attackPerLevel + (s.upgrades.attack || 0) * 4 + m + v.str * 2,
        magic: (s.upgrades.magic || 0) * 4 + 10 + (s.level - 1) * 3 + v.int * 2.4 + m,
        defense: BALANCE.baseDefense + (s.level - 1) * BALANCE.defensePerLevel + (s.upgrades.defense || 0) * 3 + v.vit * .6 + v.str * .25,
        resist: 3 + (s.level - 1) * .7 + v.wis * 1.2,
        crit: BALANCE.baseCrit + j.crit + v.luk * .003, critDamage: BALANCE.critMultiplier + v.luk * .005,
        accuracy: .92 + v.dex * .004, evasion: v.dex * .002, speed: 10 + v.dex * .5, mana: 30 + v.wis * 3 + v.int, manaRegen: 2 + v.wis * .15, penetration: 0, lifesteal: 0 };
    a.goldBonus = (s.permanent.gold || 0) * .1 + v.luk * .002 + (s.upgrades.gold || 0) * .05 + guildBonus(s, 'treasury') * .04;
    a.rebirthBonus = s.permanent.pearl || 0;
    a.dungeonGoldBonus = (s.permanent.dungeon || 0) * .08;
    for (const item of Object.values(s.equipment)) {
        if (item)
            for (const [key, n] of Object.entries(itemStats(item)))
                a[key as keyof Stats] += n;
    }
    for (const id of s.skills) {
        if (!canUse(s, id))
            continue;
        const sk = SKILLS.find(x => x.id === id);
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
    a.defense *= 1 + (s.permanent.guard || 0) * .03;
    a.resist *= 1 + (s.permanent.guard || 0) * .03;
    const guildMight = 1 + guildBonus(s, 'might') * .02;
    a.attack *= guildMight;
    a.magic *= guildMight;
    a.hp *= 1 + guildBonus(s, 'bastion') * .03;
    for (const k of ['hp', 'attack', 'magic', 'defense', 'resist', 'mana', 'speed'] as (keyof CombatStats)[])
        a[k] = Math.max(k === 'hp' || k === 'speed' ? 1 : 0, Math.floor(a[k]));
    a.crit = Math.min(.6, a.crit);
    a.evasion = evasionRating(a.evasion);
    a.penetration = Math.min(.6, a.penetration);
    a.lifesteal = Math.min(.3, a.lifesteal);
    return a;
}
export function dropRate(s: State) { return Math.min(.6, BALANCE.dropChance + attributes(s).luk * .001 + Object.keys(s.itemBook || {}).length * PROGRESSION.itemDropBonus + (s.permanent.drop || 0) * .01 + guildBonus(s, 'scouting') * .005 + (stats(s).dropBonus || 0)); }
export function power(v: Stats) { const a = normalizeStats(v); return Math.round(Math.max(a.attack, a.magic) * 7 + Math.min(a.attack, a.magic) * 2 + a.hp * .5 + (a.defense + a.resist) * 3 + a.crit * 200 + Math.max(0, a.accuracy - .8) * 220 + a.evasion * 200); }
export function snapshot(s: State): Snapshot { const a = stats(s); return { name: s.name, level: s.level, job: s.job, rebirths: s.rebirths, stats: a, skills: s.skills.filter(id => canUse(s, id)), skillRanks: { ...s.learned }, skillMastery: skillMasteryRanks(s), skillSpecializations: { ...s.skillSpecializations }, skillPractice: { ...s.skillPractice }, power: power(a), rating: s.rating, guild: s.guild?.name || '' }; }
export const skillUnlocked = canLearn;
export const goldMultiplier = (s: State) => 1 + stats(s).goldBonus;
export const expMultiplier = (s: State) => Math.max(0, 1 + stats(s).expBonus) * (tailwindActive(s) ? 1 + TAILWIND_EXP : 1);
export const dungeonGoldMultiplier = (s: State) => 1 + (stats(s).dungeonGoldBonus || 0);
export const hitChance = (a: Stats, b: Stats) => {
    const accuracy = Math.max(0, a.accuracy ?? 1);
    const evasion = Math.max(0, b.evasion ?? 0);
    const tempo = Math.max(-.06, Math.min(.06, .08 * Math.log2(Math.max(1, a.speed ?? 10) / Math.max(1, b.speed ?? 10))));
    return Math.min(.995, Math.max(.01, accuracy - evasion + tempo));
};
