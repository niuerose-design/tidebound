import { SKILLS } from '../data/skills';
import { ENEMY_SKILLS } from '../data/encounters';
import { STATUS_TUNING } from '../data/balance';
import type { Stats, StatusEffects } from '../types';
import { normalizeStats, hitChance } from './stats';
import { effectiveSkill } from './progression';
export type Fighter = {
    name: string;
    stats: Stats;
    hp: number;
    skills: string[];
    cooldowns: Record<string, number>;
    stun: number;
    mana?: number;
    ranks?: Record<string, number>;
    mastery?: Record<string, number>;
    specializations?: Record<string, string>;
    practice?: Record<string, number>;
    effects?: StatusEffects;
};
type DurationStatus = 'weaken' | 'silence' | 'slow' | 'haste';
function consumeStatus(effects: StatusEffects, key: DurationStatus) {
    const remaining = effects[key] || 0;
    if (remaining <= 0)
        return false;
    if (remaining === 1)
        delete effects[key];
    else
        effects[key] = remaining - 1;
    return true;
}
function extendStatus(effects: StatusEffects, key: DurationStatus, turns: number) {
    effects[key] = Math.max(effects[key] || 0, turns);
}
/** Speed used for the existing round-based order. Slow/haste change priority, not action count. */
export function fighterSpeed(f: Fighter) {
    const base = normalizeStats(f.stats).speed;
    const slowed = (f.effects?.slow || 0) > 0;
    const hasted = (f.effects?.haste || 0) > 0;
    const multiplier = (slowed ? 1 - STATUS_TUNING.slowMultiplier : 1) * (hasted ? 1 + STATUS_TUNING.hasteMultiplier : 1);
    return Math.max(1, base * multiplier);
}
/** Shared PvE/PvP action. Recovery, status, conditional proc, MP, accuracy, defense and crit. */
export function strike(a: Fighter, b: Fighter, rng = Math.random) {
    const sa = normalizeStats(a.stats), sb = normalizeStats(b.stats);
    a.effects ??= {};
    b.effects ??= {};
    a.mana = Math.min(sa.mana, (a.mana ?? sa.mana) + sa.manaRegen);
    const notes: string[] = [];
    if (a.effects.dot) {
        const dot = a.effects.dot;
        a.hp = Math.max(0, a.hp - dot.damage);
        notes.push(`${dot.name} ${dot.damage}`);
        dot.turns--;
        if (dot.turns <= 0)
            delete a.effects.dot;
        if (a.hp <= 0)
            return `${a.name} · ${notes.join(' · ')} → 쓰러짐`;
    }
    const attackSpeed = fighterSpeed(a), targetSpeed = fighterSpeed(b);
    const weakened = consumeStatus(a.effects, 'weaken');
    const silenced = consumeStatus(a.effects, 'silence');
    consumeStatus(a.effects, 'slow');
    consumeStatus(a.effects, 'haste');
    if (silenced)
        notes.push('침묵 중');
    const blocked = new Set(Object.keys(a.cooldowns).filter(k => a.cooldowns[k] > 0));
    for (const k of Object.keys(a.cooldowns))
        a.cooldowns[k] = Math.max(0, a.cooldowns[k] - 1);
    if (a.stun > 0) {
        a.stun--;
        return `${a.name}: 기절로 행동 불가.${notes.length ? ' ' + notes.join(' · ') : ''}`;
    }
    let chosen;
    if (!silenced) {
        for (const id of a.skills) {
            const base = [...SKILLS, ...ENEMY_SKILLS].find(x => x.id === id);
            if (!base || base.type !== 'active' || blocked.has(id))
                continue;
            const candidate = effectiveSkill(base, a.ranks?.[id] || 1, a.mastery?.[id] || 0, a.specializations?.[id], a.practice?.[id] || 0);
            if (candidate.effect === 'heal' && a.hp > sa.hp * .8) continue;
            if (candidate.condition === 'wounded' && a.hp > sa.hp * .7)
                continue;
            if (candidate.condition === 'healthyTarget' && b.hp < sb.hp * .6)
                continue;
            if (a.mana < (candidate.manaCost || 0))
                continue;
            if (rng() < candidate.chance) {
                chosen = candidate;
                break;
            }
        }
    }
    let healed = 0;
    if (chosen) {
        a.cooldowns[chosen.id] = chosen.cooldown;
        a.mana = Math.max(0, a.mana - (chosen.manaCost || 0));
        if (chosen.cleanseSelf) { delete a.effects.dot; delete a.effects.slow; notes.push('정화'); }
        if (chosen.effect === 'heal') {
            healed = Math.min(sa.hp - a.hp, Math.floor(sa.hp * (chosen.healRatio ?? .22)));
            a.hp += healed;
        }
    }
    const hit = hitChance({ ...sa, speed: attackSpeed, accuracy: sa.accuracy + (chosen?.accuracyBonus || 0) }, { ...sb, speed: targetSpeed });
    const label = chosen?.name || '기본 공격';
    const landed = rng() < hit;
    if (!landed) notes.push('본타 빗나감');
    const magical = chosen?.damageType === 'magic' || chosen?.id === 'oath' && sa.magic > sa.attack;
    let base = magical ? sa.magic : sa.attack;
    if (chosen?.scaling === 'hp')
        base += sa.hp * (chosen.scalingRatio ?? .08);
    if (chosen?.scaling === 'mana')
        base += sa.mana * (chosen.scalingRatio ?? .45);
    if (chosen?.scaling === 'hybrid')
        base += sa.hp * (chosen.scalingRatio ?? .05) + sa.mana * ((chosen.scalingRatio ?? .25) * 2);
    if (chosen?.id === 'crush')
        base += sa.defense * 1.5 / (chosen.multiplier || 1);
    const defense = (magical ? sb.resist : sb.defense) * (1 - Math.min(.85, sa.penetration + (chosen?.penetrationBonus || 0)));
    const linked = chosen?.damageBonusCondition === 'bleeding' ? !!b.effects.dot : chosen?.damageBonusCondition === 'weakened' ? !!b.effects.weaken : chosen?.damageBonusCondition === 'controlled' ? !!(b.effects.silence || b.effects.slow) : false;
    const linkMultiplier = linked ? 1 + (chosen?.conditionalDamageBonus || 0) : 1;
    if (linked) notes.push('연계');
    const crit = landed && rng() < sa.crit;
    const damage = landed ? Math.max(1, Math.round(base * (chosen?.multiplier || 1) * linkMultiplier * (weakened ? .75 : 1) * (crit ? sa.critDamage : 1) * 100 / (100 + defense * 2))) : 0;
    const actual = Math.min(b.hp, damage);
    let totalDamage = damage;
    b.hp = Math.max(0, b.hp - damage);
    if (landed && chosen?.effect === 'stun') {
        b.stun = Math.max(b.stun, chosen.statusTurns ?? 1);
        notes.push('기절');
    }
    if (landed && chosen?.effect === 'bleed') {
        const turns = chosen.statusTurns ?? STATUS_TUNING.bleedTurns;
        b.effects.dot = { damage: Math.max(1, Math.floor(base * .22 * (weakened ? .75 : 1))), turns, name: '출혈' };
        notes.push(`출혈 ${turns}턴`);
    }
    if (landed && chosen?.effect === 'weaken') {
        const turns = chosen.statusTurns ?? STATUS_TUNING.weakenTurns;
        extendStatus(b.effects, 'weaken', turns);
        notes.push(`공격 약화 ${turns}턴`);
    }
    if (landed && chosen?.effect === 'silence') {
        const turns = chosen.statusTurns ?? STATUS_TUNING.silenceTurns;
        extendStatus(b.effects, 'silence', turns);
        notes.push(`침묵 ${turns}턴`);
    }
    if (landed && chosen?.effect === 'slow') {
        const turns = chosen.statusTurns ?? STATUS_TUNING.slowTurns;
        extendStatus(b.effects, 'slow', turns);
        notes.push(`감속 ${turns}턴`);
    }
    if (landed && chosen?.effect === 'haste') {
        const turns = chosen.statusTurns ?? STATUS_TUNING.hasteTurns;
        extendStatus(a.effects, 'haste', turns);
        notes.push(`가속 ${turns}턴`);
    }
    const drain = Math.floor(actual * (sa.lifesteal + (chosen?.effect === 'drain' ? (chosen.drainRatio ?? .25) : 0)));
    if (drain) {
        const recovery = Math.min(sa.hp - a.hp, drain);
        a.hp += recovery;
        healed += recovery;
    }
    // Follow-up hits are part of the same action. They use the same hit chance,
    // cannot recursively trigger another follow-up, and are capped in balance.ts.
    const followUps = Math.min(STATUS_TUNING.maxExtraAttacks, Math.max(0, chosen?.extraAttacks || 0));
    for (let i = 0; i < followUps && b.hp > 0; i++) {
        if (rng() >= hit) {
            notes.push(`추가타 ${i + 1} 빗나감`);
            continue;
        }
        const followCrit = rng() < sa.crit;
        const followMultiplier = (chosen?.multiplier || 1) * (chosen?.extraAttackMultiplier ?? .65);
        const followDamage = Math.max(1, Math.round(base * followMultiplier * linkMultiplier * (weakened ? .75 : 1) * (followCrit ? sa.critDamage : 1) * 100 / (100 + defense * 2)));
        const followActual = Math.min(b.hp, followDamage);
        b.hp = Math.max(0, b.hp - followDamage);
        totalDamage += followDamage;
        const followDrain = Math.floor(followActual * (sa.lifesteal + (chosen?.effect === 'drain' ? (chosen.drainRatio ?? .25) : 0)));
        if (followDrain) {
            const recovery = Math.min(sa.hp - a.hp, followDrain);
            a.hp += recovery;
            healed += recovery;
        }
        notes.push(`추가타 ${followDamage}${followCrit ? ' [치명타]' : ''}`);
    }
    return `${a.name} · ${label}${crit ? ' [치명타]' : ''} → ${totalDamage ? `${totalDamage} ${magical ? '마법' : '물리'} 피해` : '빗나감'}${healed ? ` · ${healed} 회복` : ''}${notes.length ? ' · ' + notes.join(' · ') : ''}`;
}
