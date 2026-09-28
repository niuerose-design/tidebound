import type { State } from '../types';
import { initialProgress, apUsed, apCapacity, grantJobSkills, trimLoadout } from './progression';
import { stats } from './stats';
import { newGuild } from '../data/guild';
/** v1 → v6 additive migration. No gold/items/codex/levels/guild progress are removed. */
export function migrateState(s: State): State {
    if (s.version === 6) return s;
    if (s.version === 5) {
        s.skillSpecializations ??= {};
        s.bossResearchClaims ??= {};
        s.growthGoal ??= null;
        s.version = 6;
        return s;
    }
    if (s.version === 4) {
        // Existing SP balances are intentionally preserved; only future
        // sources are rare. Current-job skills are granted lazily and cost
        // no SP, while all explicit SP actions now cost exactly one.
        s.version = 5;
        s.skillInheritances = {};
        grantJobSkills(s);
        trimLoadout(s);
        s.hp = Math.min(s.hp, stats(s).hp);
        s.mana = Math.min(s.mana, stats(s).mana);
        return migrateState(s);
    }
    if (s.version === 3) {
        s.guild = newGuild();
        s.version = 4;
        return migrateState(s);
    }
    if (s.version === 2) {
        s.tide = 0;
        s.abyssBest = 0;
        s.shopSerial = 0;
        s.version = 3;
        return migrateState(s);
    }
    const equipped = [...s.skills], job = s.job;
    Object.assign(s, initialProgress(s.level));
    for (const id of equipped)
        s.learned[id] = 1;
    s.unlockedJobs = job === 'fisher' ? ['fisher'] : ['fisher', job];
    s.skills = equipped;
    // Legacy loadouts are learned for free, but use the new AP capacity immediately.
    while (apUsed(s) > apCapacity(s))
        s.skills.pop();
    s.version = 2;
    s.mana = stats(s).mana;
    s.hp = Math.min(s.hp, stats(s).hp);
    return migrateState(s);
}
