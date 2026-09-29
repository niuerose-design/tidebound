import { SKILLS } from '../data/skills';
import { ENEMY_SKILLS } from '../data/encounters';
import { STATUS_TUNING, SKILL_FORMULA } from '../data/balance';
import type { Stats, StatusEffects, CombatEvent, CombatHit } from '../types';
export type { CombatEvent, CombatHit } from '../types';
import { normalizeStats, hitChance } from './stats';
import { effectiveSkill, signatureScale } from './progression';
export type Fighter = {
    name: string;
    /** 현재 직업. 4차 이상 전용 기술의 계보 밖 효율을 정합니다(적은 없음). */
    job?: string;
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
    /** 무리 사냥 개체의 규모. 자기 최대 체력 비례 공격은 한 마리 체력 기준으로 계산합니다. */
    swarm?: number;
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
const DAMAGE_WORD = { physical: '물리', magic: '마법', split: '복합' } as const;
/** 본타·추가타를 한 번씩만 적고, 추가타가 있을 때만 합계를 붙입니다. */
export function describeHits(ev: Pick<CombatEvent, 'hits' | 'total' | 'damageType'>) {
    const word = DAMAGE_WORD[ev.damageType];
    if (ev.hits.every(h => h.miss)) return '빗나감';
    if (ev.hits.length === 1) return `${ev.total} ${word} 피해`;
    const part = (h: CombatHit) => h.miss ? '빗나감' : `${h.value}${h.critical ? ' [치명타]' : ''}`;
    return [`본타 ${part(ev.hits[0])}`, ...ev.hits.slice(1).map((h, i) => `추가타${ev.hits.length > 2 ? ` ${i + 1}` : ''} ${part(h)}`), `합계 ${ev.total} ${word} 피해`].join(' · ');
}
/** 무리 개체는 한 번의 타격(지속 피해 포함)으로 한 마리 체력까지만 잃습니다. 넘친 피해로 여러 마리를 한꺼번에 잡지 않게 합니다. */
const unitCap = (f: Fighter) => f.swarm ? Math.ceil((f.stats.hp || 0) / f.swarm) : Infinity;
/** Speed used for the existing round-based order. Slow/haste change priority, not action count. */
export function fighterSpeed(f: Fighter) {
    const base = normalizeStats(f.stats).speed;
    const slowed = (f.effects?.slow || 0) > 0;
    const hasted = (f.effects?.haste || 0) > 0;
    const multiplier = (slowed ? 1 - STATUS_TUNING.slowMultiplier : 1) * (hasted ? 1 + STATUS_TUNING.hasteMultiplier : 1);
    return Math.max(1, base * multiplier);
}
/** Shared PvE/PvP action. Recovery, status, conditional proc, MP, accuracy, defense and crit. */
export function strike(a: Fighter, b: Fighter, rng = Math.random, events?: CombatEvent[]) {
    const sa = normalizeStats(a.stats), sb = normalizeStats(b.stats);
    a.effects ??= {};
    b.effects ??= {};
    a.mana = Math.min(sa.mana, (a.mana ?? sa.mana) + sa.manaRegen);
    const notes: string[] = [];
    const ev: CombatEvent = { actor: a.name, skillName: '기본 공격', damageType: 'physical', hits: [], total: 0, healed: 0, drained: 0, statuses: [] };
    const emit = (text: string) => { events?.push(ev); return text; };
    if (a.effects.dot) {
        const dot = a.effects.dot;
        const dotHit = Math.min(dot.damage, unitCap(a));
        a.hp = Math.max(0, a.hp - dotHit);
        notes.push(`${dot.name} ${dotHit}`);
        ev.dot = { name: dot.name, value: dotHit };
        dot.turns--;
        if (dot.turns <= 0)
            delete a.effects.dot;
        if (a.hp <= 0) {
            ev.defeated = true;
            return emit(`${a.name} · ${notes.join(' · ')} → 쓰러짐`);
        }
    }
    const attackSpeed = fighterSpeed(a), targetSpeed = fighterSpeed(b);
    const weakened = consumeStatus(a.effects, 'weaken');
    const silenced = consumeStatus(a.effects, 'silence');
    consumeStatus(a.effects, 'slow');
    consumeStatus(a.effects, 'haste');
    if (silenced) {
        notes.push('침묵 중');
        ev.silenced = true;
    }
    const blocked = new Set(Object.keys(a.cooldowns).filter(k => a.cooldowns[k] > 0));
    for (const k of Object.keys(a.cooldowns))
        a.cooldowns[k] = Math.max(0, a.cooldowns[k] - 1);
    if (a.stun > 0) {
        a.stun--;
        ev.stunned = true;
        return emit(`${a.name}: 기절로 행동 불가.${notes.length ? ' ' + notes.join(' · ') : ''}`);
    }
    let chosen;
    if (!silenced) {
        for (const id of a.skills) {
            const base = [...SKILLS, ...ENEMY_SKILLS].find(x => x.id === id);
            if (!base || base.type !== 'active' || blocked.has(id))
                continue;
            const candidate = effectiveSkill(base, a.ranks?.[id] || 1, a.mastery?.[id] || 0, a.specializations?.[id], a.practice?.[id] || 0);
            candidate.multiplier *= signatureScale(base, a.job);
            // v21: 회복 기술은 체력이 가득 차도 시도합니다(회복이 필요 없으면 아래에서 피해가 줄어듦).
            if (candidate.condition === 'wounded' && a.hp > sa.hp * SKILL_FORMULA.woundedThreshold)
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
    // 마력 평타: 마법 직업은 기본 공격 대신 확률적으로 마법 공격 기반의 약한 마법 피해를 줍니다.
    const arcane = !chosen && sa.arcaneStrike > 0 && rng() < sa.arcaneStrike;
    let healed = 0;
    // 체력이 충분한데 쓴 회복 기술: 회복 직업이 아니면 이번 공격 피해가 줄어듭니다.
    const idleHeal = chosen?.effect === 'heal' && a.hp >= sa.hp * SKILL_FORMULA.healThreshold && !sa.healFocus;
    if (chosen) {
        a.cooldowns[chosen.id] = chosen.cooldown;
        a.mana = Math.max(0, a.mana - (chosen.manaCost || 0));
        if (chosen.cleanseSelf) { delete a.effects.dot; delete a.effects.slow; notes.push('정화'); ev.cleansed = true; }
        if (chosen.effect === 'heal') {
            healed = Math.min(sa.hp - a.hp, Math.floor(sa.hp * (chosen.healRatio ?? SKILL_FORMULA.healRatio)));
            a.hp += healed;
        }
    }
    const hit = hitChance({ ...sa, speed: attackSpeed, accuracy: sa.accuracy + (chosen?.accuracyBonus || 0) }, { ...sb, speed: targetSpeed });
    const label = chosen?.name || (arcane ? '마력 평타' : '기본 공격');
    const landed = rng() < hit;
    const magical = arcane || chosen?.damageType === 'magic' || chosen?.id === 'oath' && sa.magic > sa.attack;
    const split = chosen?.damageType === 'split';
    // 육중 조화는 배분 능력치로 만든 원시 피해만 사용하고 일반 공격력을 더하지 않습니다.
    let base = arcane ? sa.magic * SKILL_FORMULA.arcaneStrikeRatio : chosen?.scaling === 'harmony' ? (sa.harmony || 0) : chosen?.scaling === 'dual' ? (sa.attack + sa.magic) / 2 : magical ? sa.magic : sa.attack;
    // 방어 비례 피해: 수호 계열(방어 친화도 1)에서 온전히, 다른 직업이 계승하면 일부만 발휘됩니다.
    if (chosen?.scaling === 'defense')
        base += sa.defense * (chosen.scalingRatio ?? 1) * sa.guardAffinity;
    if (chosen?.scaling === 'hp')
        base += sa.hp / (a.swarm || 1) * (chosen.scalingRatio ?? SKILL_FORMULA.hpScaling);
    if (chosen?.scaling === 'mana')
        base += sa.mana * (chosen.scalingRatio ?? SKILL_FORMULA.manaScaling);
    if (chosen?.scaling === 'hybrid')
        base += sa.hp / (a.swarm || 1) * (chosen.scalingRatio ?? SKILL_FORMULA.hybridHpScaling) + sa.mana * ((chosen.scalingRatio ?? SKILL_FORMULA.hybridManaScaling) * 2);
    if (chosen?.id === 'crush')
        base += sa.defense * SKILL_FORMULA.crushDefense / (chosen.multiplier || 1);
    const pierce = 1 - Math.min(.85, sa.penetration + (chosen?.penetrationBonus || 0));
    const defense = (magical ? sb.resist : sb.defense) * pierce;
    // 복합(split) 피해: 한 번의 명중·치명 판정 뒤 물리·마법 절반씩 각각의 방어를 적용합니다.
    const mitigated = (raw: number) => split
        ? Math.round(raw * SKILL_FORMULA.splitPhysical * 100 / (100 + sb.defense * pierce * 2)) + Math.round(raw * (1 - SKILL_FORMULA.splitPhysical) * 100 / (100 + sb.resist * pierce * 2))
        : Math.round(raw * 100 / (100 + defense * 2));
    const linked = chosen?.damageBonusCondition === 'bleeding' ? !!b.effects.dot : chosen?.damageBonusCondition === 'weakened' ? !!b.effects.weaken : chosen?.damageBonusCondition === 'controlled' ? !!(b.effects.silence || b.effects.slow) : chosen?.damageBonusCondition === 'lowHp' ? b.hp <= sb.hp * SKILL_FORMULA.lowHpThreshold : false;
    const linkMultiplier = linked ? 1 + (chosen?.conditionalDamageBonus || 0) : 1;
    if (linked) { notes.push('연계'); ev.linked = true; }
    const crit = landed && rng() < sa.crit;
    const damage = landed ? Math.min(unitCap(b), Math.max(1, mitigated(base * (chosen?.multiplier || 1) * linkMultiplier * (idleHeal ? SKILL_FORMULA.idleHealDamage : 1) * (weakened ? SKILL_FORMULA.weakenedDamage : 1) * (crit ? sa.critDamage : 1)))) : 0;
    const actual = Math.min(b.hp, damage);
    b.hp = Math.max(0, b.hp - damage);
    // 반격: 맞은 쪽이 방어 비례 피해를 되돌려 줍니다. 공격자의 물리 방어로 경감됩니다.
    if (landed && sb.thorns > 0) {
        const reflected = Math.min(a.hp, unitCap(a), Math.max(1, Math.round(sb.defense * sb.thorns * 100 / (100 + sa.defense * 2))));
        a.hp = Math.max(0, a.hp - reflected);
        ev.reflected = reflected;
        notes.push(`반격 ${reflected}`);
    }
    // 표시는 실제로 깎인 체력 기준: 본타·추가타를 각각 한 번씩만 세고 합계는 그 합입니다.
    ev.hits.push({ kind: 'main', value: actual, critical: crit, miss: !landed });
    if (landed && chosen?.effect === 'stun') {
        b.stun = Math.max(b.stun, chosen.statusTurns ?? 1);
        notes.push('기절');
        ev.statuses.push({ id: 'stun', turns: chosen.statusTurns ?? 1 });
    }
    if (landed && chosen?.effect === 'bleed') {
        const turns = chosen.statusTurns ?? STATUS_TUNING.bleedTurns;
        const name = chosen.dotName || '출혈';
        b.effects.dot = { damage: Math.max(1, Math.floor(base * (chosen.dotRatio ?? SKILL_FORMULA.bleedRatio) * (1 + (sa.dotBonus || 0)) * (weakened ? SKILL_FORMULA.weakenedDamage : 1))), turns, name };
        notes.push(`${name} ${turns}턴`);
        ev.statuses.push({ id: 'bleed', turns });
    }
    if (landed && chosen?.effect === 'weaken') {
        const turns = chosen.statusTurns ?? STATUS_TUNING.weakenTurns;
        extendStatus(b.effects, 'weaken', turns);
        notes.push(`공격 약화 ${turns}턴`);
        ev.statuses.push({ id: 'weaken', turns });
    }
    if (landed && chosen?.effect === 'silence') {
        const turns = chosen.statusTurns ?? STATUS_TUNING.silenceTurns;
        extendStatus(b.effects, 'silence', turns);
        notes.push(`침묵 ${turns}턴`);
        ev.statuses.push({ id: 'silence', turns });
    }
    if (landed && chosen?.effect === 'slow') {
        const turns = chosen.statusTurns ?? STATUS_TUNING.slowTurns;
        extendStatus(b.effects, 'slow', turns);
        notes.push(`감속 ${turns}턴`);
        ev.statuses.push({ id: 'slow', turns });
    }
    if (landed && chosen?.effect === 'haste') {
        const turns = chosen.statusTurns ?? STATUS_TUNING.hasteTurns;
        extendStatus(a.effects, 'haste', turns);
        notes.push(`가속 ${turns}턴`);
        ev.statuses.push({ id: 'haste', turns, onSelf: true });
    }
    const drain = Math.floor(actual * (sa.lifesteal + (chosen?.effect === 'drain' ? (chosen.drainRatio ?? SKILL_FORMULA.drainRatio) : 0)));
    if (drain) {
        const recovery = Math.min(sa.hp - a.hp, drain);
        a.hp += recovery;
        ev.drained += recovery;
    }
    // Follow-up hits are part of the same action. They use the same hit chance,
    // cannot recursively trigger another follow-up, and are capped in balance.ts.
    const followUps = Math.min(STATUS_TUNING.maxExtraAttacks, Math.max(0, chosen?.extraAttacks || 0));
    for (let i = 0; i < followUps && b.hp > 0 && a.hp > 0; i++) {
        if (rng() >= hit) {
            ev.hits.push({ kind: 'follow', value: 0, critical: false, miss: true });
            continue;
        }
        const followCrit = rng() < sa.crit;
        const followMultiplier = (chosen?.multiplier || 1) * (chosen?.extraAttackMultiplier ?? SKILL_FORMULA.extraAttackMultiplier);
        const followDamage = Math.min(unitCap(b), Math.max(1, mitigated(base * followMultiplier * linkMultiplier * (weakened ? SKILL_FORMULA.weakenedDamage : 1) * (followCrit ? sa.critDamage : 1))));
        const followActual = Math.min(b.hp, followDamage);
        b.hp = Math.max(0, b.hp - followDamage);
        ev.hits.push({ kind: 'follow', value: followActual, critical: followCrit, miss: false });
        const followDrain = Math.floor(followActual * (sa.lifesteal + (chosen?.effect === 'drain' ? (chosen.drainRatio ?? SKILL_FORMULA.drainRatio) : 0)));
        if (followDrain) {
            const recovery = Math.min(sa.hp - a.hp, followDrain);
            a.hp += recovery;
            ev.drained += recovery;
        }
    }
    ev.skillId = chosen?.id;
    ev.skillName = label;
    ev.damageType = split ? 'split' : magical ? 'magic' : 'physical';
    ev.healed = healed;
    ev.total = ev.hits.reduce((n, h) => n + h.value, 0);
    return emit(`${a.name} · ${label}${crit ? ' [치명타]' : ''} → ${describeHits(ev)}${healed ? ` · 회복 ${healed}` : ''}${ev.drained ? ` · 흡혈 ${ev.drained}` : ''}${notes.length ? ' · ' + notes.join(' · ') : ''}`);
}
