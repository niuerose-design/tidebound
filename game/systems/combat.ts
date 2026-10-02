import { SKILLS, skillById } from '../data/skills';
import { ENEMY_SKILLS } from '../data/encounters';
import { BALANCE, STATUS_TUNING, SKILL_FORMULA } from '../data/balance';
import type { Stats, CombatStats, StatusEffects, CombatEvent, CombatHit } from '../types';
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
    /** 도감 생태 연구: 주는 피해 증가율(0.04 = +4%). */
    damageDealt?: number;
    /** 도감 생태 연구: 받는 공격 피해 감소율(0.02 = -2%). 지속 피해에는 적용하지 않습니다. */
    damageTaken?: number;
    /** v24.2 골드 투척 기술이 쓰는 보유 골드(플레이어만). */
    gold?: number;
    /** v24.2 사냥감 연구 대상 여부(보스·지정 어종). */
    prey?: boolean;
};
type DurationStatus = 'weaken' | 'silence' | 'slow' | 'haste';
type ImmuneStatus = keyof NonNullable<StatusEffects['immune']>;
/** 상태이상이 끝나면 같은 상태이상에 잠시 면역이 됩니다(가속은 자기 버프라 제외). */
function grantImmunity(effects: StatusEffects, key: ImmuneStatus) {
    (effects.immune ??= {})[key] = STATUS_TUNING.immuneTurns[key];
}
function consumeStatus(effects: StatusEffects, key: DurationStatus) {
    const remaining = effects[key] || 0;
    if (remaining <= 0)
        return false;
    if (remaining === 1) {
        delete effects[key];
        if (key !== 'haste') grantImmunity(effects, key);
    }
    else
        effects[key] = remaining - 1;
    return true;
}
/** 자기 행동마다 면역 턴을 1씩 줄입니다. */
function tickImmunity(effects: StatusEffects) {
    if (!effects.immune) return;
    for (const key of Object.keys(effects.immune) as ImmuneStatus[]) {
        const left = (effects.immune[key] || 0) - 1;
        if (left > 0) effects.immune[key] = left; else delete effects.immune[key];
    }
    if (!Object.keys(effects.immune).length) delete effects.immune;
}
const ENEMY_STATUS: Record<string, ImmuneStatus> = { stun: 'stun', bleed: 'bleed', weaken: 'weaken', silence: 'silence', slow: 'slow' };
/** 상대에게 이미 걸려 있는 상태이상(중첩형 중독은 더 쌓을 수 있으므로 제외). */
function alreadyAfflicted(b: Fighter, sk: { effect?: string; dotStacks?: boolean }) {
    const key = sk.effect ? ENEMY_STATUS[sk.effect] : undefined;
    if (!key) return false;
    if (key === 'stun') return b.stun > 0;
    if (key === 'bleed') return !!b.effects?.dot && !sk.dotStacks;
    return (b.effects?.[key] || 0) > 0;
}
const isImmune = (b: Fighter, key: ImmuneStatus) => (b.effects?.immune?.[key] || 0) > 0;
function extendStatus(effects: StatusEffects, key: DurationStatus, turns: number) {
    effects[key] = Math.max(effects[key] || 0, turns);
}
const DAMAGE_WORD = { physical: '물리', magic: '마법', split: '복합' } as const;
/** 본타·추가타를 한 번씩만 적고, 추가타가 있을 때만 합계를 붙입니다. */
export function describeHits(ev: Pick<CombatEvent, 'hits' | 'total' | 'damageType'>) {
    const word = DAMAGE_WORD[ev.damageType];
    if (!ev.hits.length) return '피해 없음';
    if (ev.hits.every(h => h.miss)) return '빗나감';
    if (ev.hits.length === 1) return `${ev.total} ${word} 피해`;
    const part = (h: CombatHit) => h.miss ? '빗나감' : `${h.value}${h.critical ? ' [치명타]' : ''}`;
    return [`본타 ${part(ev.hits[0])}`, ...ev.hits.slice(1).map((h, i) => `추가타${ev.hits.length > 2 ? ` ${i + 1}` : ''} ${part(h)}`), `합계 ${ev.total} ${word} 피해`].join(' · ');
}
/** 행동 순서·명중 보정·연속 행동 확률에 쓰는 속도. 가속·감속이 반영됩니다. */
export function fighterSpeed(f: Fighter) {
    const base = normalizeStats(f.stats).speed;
    const slowed = (f.effects?.slow || 0) > 0;
    const hasted = (f.effects?.haste || 0) > 0;
    const multiplier = (slowed ? 1 - STATUS_TUNING.slowMultiplier : 1) * (hasted ? 1 + STATUS_TUNING.hasteMultiplier : 1);
    return Math.max(1, base * multiplier);
}
/** 연속 행동 확률: min(1, max(0, 계수 × log2(내 속도 / 상대 속도))). 같거나 느리면 0. */
export function chainChance(a: Fighter, b: Fighter) {
    const sa = fighterSpeed(a), sb = fighterSpeed(b);
    return sa > sb ? Math.min(1, Math.max(0, BALANCE.chainCoefficient * Math.log2(sa / sb))) : 0;
}
/**
 * 한 전투원의 턴: 행동한 뒤 연속 행동 확률로 다시 행동합니다(연쇄). 턴당 최대 chainMaxActions번, 어느 쪽이든 쓰러지면 즉시 멈춥니다.
 * 추가 행동도 strike 그대로의 온전한 행동입니다. 확률이 0이면 난수를 쓰지 않아 기존과 같은 난수 순서를 유지합니다.
 * onAction은 행동마다 (로그 문장, 구조화된 결과)로 불립니다. 두 번째 행동부터 문장 끝에 '연속 N'을 붙입니다.
 */
export function actTurn(a: Fighter, b: Fighter, rng: () => number, onAction: (text: string, event: CombatEvent) => void) {
    for (let chain = 1; ; chain++) {
        const events: CombatEvent[] = [];
        const text = strike(a, b, rng, events), ev = events[0];
        if (chain > 1) ev.chain = chain;
        onAction(chain > 1 ? `${text} · 연속 ${chain}` : text, ev);
        // v25 확정 추가 행동(선행·찰): 연속 행동 횟수와 별개로 한 번 더 행동합니다. 추가 행동에서 다시 생기지는 않습니다.
        if (ev?.extraTurn && a.hp > 0 && b.hp > 0) {
            const extra: CombatEvent[] = [];
            const t2 = strike(a, b, rng, extra, true);
            onAction(`${t2} · 추가 행동`, extra[0]);
        }
        if (a.hp <= 0 || b.hp <= 0 || chain >= BALANCE.chainMaxActions) return;
        const p = chainChance(a, b);
        if (p <= 0 || (p < 1 && rng() >= p)) return;
    }
}
/**
 * v25 無: 쓰러질 피해를 받으면 체력 1로 버팁니다(전투당 charges번). 버틸 때마다 최대 체력 × heal을 되찾습니다.
 * 직접 피해·추가타·지속 피해·반격 어느 것으로도 체력이 1 아래로 내려가지 않습니다. self는 행동한 쪽이 자기 지속 피해·반격을 버틴 경우입니다.
 */
function endure(f: Fighter, sf: CombatStats, notes: string[], ev: CombatEvent, self = false) {
    if (f.hp > 0) return false;
    const id = f.skills.find(x => skillById(x)?.lastStand), stand = id ? skillById(id)!.lastStand! : undefined;
    if (!stand) return false;
    f.effects ??= {};
    const used = f.effects.lastStand || 0, charges = stand.charges + Math.floor((stand.chargesPerLevel || 0) * (f.mastery?.[id!] || 0));
    if (used >= charges) return false;
    f.effects.lastStand = used + 1;
    const heal = Math.max(0, Math.min(sf.hp - 1, Math.floor(sf.hp * (stand.heal || 0))));
    f.hp = 1 + heal;
    ev.endured = { heal, ...(self ? { self } : {}) };
    notes.push(`無 · 체력 1로 버팀 (${f.effects.lastStand}/${charges})${heal > 0 ? ` · 체력 ${heal} 회복` : ''}`);
    return true;
}
/** Shared PvE/PvP action. Recovery, status, conditional proc, MP, accuracy, defense and crit. */
export function strike(a: Fighter, b: Fighter, rng = Math.random, events?: CombatEvent[], bonusAction = false) {
    const sa = normalizeStats(a.stats), sb = normalizeStats(b.stats);
    a.effects ??= {};
    b.effects ??= {};
    a.mana = Math.min(sa.mana, (a.mana ?? sa.mana) + sa.manaRegen);
    const notes: string[] = [];
    const ev: CombatEvent = { actor: a.name, skillName: '기본 공격', damageType: 'physical', hits: [], total: 0, healed: 0, drained: 0, statuses: [] };
    const emit = (text: string) => { events?.push(ev); return text; };
    // 턴당 체력 회복: 마나처럼 행동 시작 때 되찾습니다(연속·추가 행동 포함).
    if (sa.hpRegen > 0 && a.hp > 0 && a.hp < sa.hp) { ev.regen = Math.min(sa.hp - a.hp, sa.hpRegen); a.hp += ev.regen; }
    tickImmunity(a.effects);
    if (a.effects.dot) {
        const dot = a.effects.dot;
        const dotHit = dot.damage;
        a.hp = Math.max(0, a.hp - dotHit);
        notes.push(`${dot.name} ${dotHit}`);
        ev.dot = { name: dot.name, value: dotHit };
        dot.turns--;
        if (dot.turns <= 0) {
            delete a.effects.dot;
            grantImmunity(a.effects, 'bleed');
        }
        if (a.hp <= 0 && !endure(a, sa, notes, ev, true)) {
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
        if (a.stun === 0) grantImmunity(a.effects, 'stun');
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
            // 이미 걸린 상태이상은 다시 걸지 않고 다음 기술로 넘어갑니다. 면역 중인 상대에게 상태이상 전용 기술은 쓰지 않습니다.
            if (alreadyAfflicted(b, candidate))
                continue;
            if (candidate.restoreAll && a.effects.timeUsed)
                continue;
            if (bonusAction && candidate.extraTurn)
                continue;
            if (candidate.statusOnly && candidate.effect && ENEMY_STATUS[candidate.effect] && isImmune(b, ENEMY_STATUS[candidate.effect]))
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
            healed = Math.min(sa.hp - a.hp, Math.floor(sa.hp * (chosen.healRatio ?? SKILL_FORMULA.healRatio) * (1 + sa.healBonus)));
            a.hp += healed;
        }
        // v25 타임머신: 둘 다 처음 상태로. 전투당 1회.
        if (chosen.restoreAll) {
            a.effects.timeUsed = true;
            a.hp = sa.hp; a.mana = sa.mana; b.hp = sb.hp; if (b.mana !== undefined) b.mana = sb.mana;
            notes.push('타임머신 · 모두 처음 상태로');
            ev.restored = true;
        }
    }
    // v24.2 도박: 쓸 때마다 피해 배율과 명중을 굴립니다.
    let gambleRoll = 1, gambleAccuracy = 0;
    if (chosen?.gamble) {
        gambleRoll = chosen.gamble.min + rng() * (chosen.gamble.max - chosen.gamble.min);
        if (chosen.gamble.accuracy) gambleAccuracy = (rng() * 2 - 1) * chosen.gamble.accuracy;
        notes.push([chosen.gamble.min !== chosen.gamble.max ? `주사위 ×${gambleRoll.toFixed(2)}` : '주사위', chosen.gamble.accuracy ? `명중 ${gambleAccuracy >= 0 ? '+' : ''}${Math.round(gambleAccuracy * 100)}%p` : ''].filter(Boolean).join(' · '));
        ev.gamble = gambleRoll;
    }
    // v24.2 올인: 현재 체력 일부와 남은 마나 전부를 겁니다(체력은 1 남김).
    let allInBonus = 0;
    if (chosen?.allIn) {
        const spentHp = Math.max(0, Math.min(a.hp - 1, Math.floor(a.hp * chosen.allIn.hpRatio))), spentMana = Math.max(0, a.mana || 0);
        a.hp -= spentHp; a.mana = 0;
        allInBonus = spentHp * chosen.allIn.hpScale + spentMana * chosen.allIn.manaScale;
        if (chosen.allIn.heal && spentMana > 0) { const h = Math.min(sa.hp - a.hp, Math.floor(spentMana * chosen.allIn.heal)); a.hp += h; healed += h; }
        notes.push(`올인 · 체력 ${spentHp} · 마나 ${Math.floor(spentMana)}`);
    }
    // v24.2 골드 투척: 보유 골드 일부를 던져 피해에 더합니다.
    if (chosen?.goldSpend && (a.gold || 0) > 0) {
        const spent = Math.min(chosen.goldSpend.cap, Math.floor(a.gold! * chosen.goldSpend.ratio));
        if (spent > 0) { a.gold! -= spent; allInBonus += spent * chosen.goldSpend.scale; notes.push(`골드 ${spent.toLocaleString()} 투척`); }
    }
    const hit = chosen?.sureHit ? 1 : hitChance({ ...sa, speed: attackSpeed, accuracy: sa.accuracy + (chosen?.accuracyBonus || 0) + gambleAccuracy }, { ...sb, speed: targetSpeed });
    const label = chosen?.name || (arcane ? '마력 평타' : '기본 공격');
    const landed = rng() < hit;
    const magical = arcane || chosen?.damageType === 'magic' || chosen?.id === 'oath' && sa.magic > sa.attack;
    const split = chosen?.damageType === 'split';
    // 육중 조화는 배분 능력치로 만든 원시 피해만 사용하고 일반 공격력을 더하지 않습니다.
    let base = arcane ? sa.magic * (SKILL_FORMULA.arcaneStrikeRatio + sa.arcaneRatioBonus) : chosen?.scaling === 'harmony' ? (sa.harmony || 0) : chosen?.scaling === 'dual' ? (sa.attack + sa.magic) / 2 : magical ? sa.magic : sa.attack;
    // 방어 비례 피해: 수호 계열(방어 친화도 1)에서 온전히, 다른 직업이 계승하면 일부만 발휘됩니다.
    if (chosen?.scaling === 'defense')
        base += sa.defense * (chosen.scalingRatio ?? 1) * sa.guardAffinity;
    if (chosen?.scaling === 'hp')
        base += sa.hp / (a.swarm || 1) * (chosen.scalingRatio ?? SKILL_FORMULA.hpScaling);
    if (chosen?.scaling === 'mana')
        base += sa.mana * (chosen.scalingRatio ?? SKILL_FORMULA.manaScaling);
    // v24.2 진행도 비례 피해: 기본 피해 × 비율 × 기록(도감 종 수 · log10 포획 · √사냥 · log10 골드).
    const progress = chosen?.scaling === 'codex' ? sa.codexPower : chosen?.scaling === 'catch' ? sa.catchPower : chosen?.scaling === 'hunt' ? sa.huntPower : chosen?.scaling === 'gold' ? sa.goldPower : 0;
    if (progress) base += base * (chosen?.scalingRatio ?? 0) * progress;
    base += allInBonus;
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
    const linked = chosen?.damageBonusCondition === 'bleeding' ? !!b.effects.dot : chosen?.damageBonusCondition === 'weakened' ? !!b.effects.weaken : chosen?.damageBonusCondition === 'controlled' ? !!(b.effects.silence || b.effects.slow || b.stun > 0) : chosen?.damageBonusCondition === 'lowHp' ? b.hp <= sb.hp * (SKILL_FORMULA.lowHpThreshold + sa.executeBonus) : false;
    const preyHit = !!(chosen?.preyBonus && b.prey);
    if (preyHit) notes.push('사냥감');
    const sealBoost = chosen?.sealPower ? 1 + chosen.sealPower * (a.effects.seals?.length || 0) : 1;
    if (chosen?.sealPower) notes.push(`인 ${a.effects.seals?.length || 0}개`);
    const linkMultiplier = (linked ? 1 + (chosen?.conditionalDamageBonus || 0) : 1) * sealBoost * (preyHit ? 1 + chosen!.preyBonus! : 1) * (1 + (a.damageDealt || 0)) * (1 - (b.damageTaken || 0));
    if (linked) { notes.push('연계'); ev.linked = true; }
    // 상태이상 전용 기술: 명중 판정만 하고 직접 피해·반격·흡혈·추가타는 없습니다.
    const statusOnly = !!chosen?.statusOnly;
    const crit = landed && !statusOnly && rng() < sa.crit;
    const damage = !landed || statusOnly ? 0 : Math.max(1, mitigated(base * (chosen?.multiplier || 1) * gambleRoll * linkMultiplier * (idleHeal ? SKILL_FORMULA.idleHealDamage : 1) * (weakened ? SKILL_FORMULA.weakenedDamage : 1) * (crit ? sa.critDamage : 1)));
    const actual = Math.min(b.hp, damage);
    b.hp = Math.max(0, b.hp - actual);
    // v25 無: 쓰러질 피해를 받은 쪽이 無를 장착했으면 체력 1로 버티고, 이 행동의 남은 추가타는 멈춥니다.
    let stood = endure(b, sb, notes, ev);
    // 반격: 맞은 쪽이 방어 비례 피해를 되돌려 줍니다. 공격자의 물리 방어로 경감됩니다.
    if (landed && !statusOnly && sb.thorns > 0) {
        const reflected = Math.min(a.hp, Math.max(1, Math.round(sb.defense * sb.thorns * 100 / (100 + sa.defense * 2))));
        a.hp = Math.max(0, a.hp - reflected);
        endure(a, sa, notes, ev, true);
        ev.reflected = reflected;
        notes.push(`반격 ${reflected}`);
    }
    // 표시는 실제로 깎인 체력 기준: 본타·추가타를 각각 한 번씩만 세고 합계는 그 합입니다.
    if (!statusOnly || !landed) ev.hits.push({ kind: 'main', value: actual, critical: crit, miss: !landed });
    if (landed && chosen?.effect === 'stun' && isImmune(b, 'stun')) { notes.push('기절 면역'); ev.immune = 'stun'; }
    else if (landed && chosen?.effect === 'stun') {
        const turns = (chosen.statusTurns ?? 1) + sa.stunBonus;
        b.stun = Math.max(b.stun, turns);
        notes.push(turns > 1 ? `기절 ${turns}턴` : '기절');
        ev.statuses.push({ id: 'stun', turns });
    }
    if (landed && chosen?.effect === 'bleed' && isImmune(b, 'bleed')) { notes.push('출혈 면역'); ev.immune = 'bleed'; }
    else if (landed && chosen?.effect === 'bleed') {
        const turns = (chosen.statusTurns ?? STATUS_TUNING.bleedTurns) + sa.dotTurnsBonus;
        const name = chosen.dotName || '출혈';
        const tick = Math.max(1, Math.floor(base * (chosen.dotRatio ?? SKILL_FORMULA.bleedRatio) * (1 + (sa.dotBonus || 0)) * (weakened ? SKILL_FORMULA.weakenedDamage : 1)));
        const current = b.effects.dot;
        if (chosen.dotStacks) {
            // 중독 중첩: 이미 걸린 중첩형 지속 피해에 한 중첩을 더하고, 한 중첩 피해는 더 강한 쪽을 씁니다.
            const stacks = current?.stacks ? Math.min(STATUS_TUNING.poisonMaxStacks + sa.poisonStackBonus, current.stacks + 1) : 1;
            const perStack = Math.max(tick, current?.stacks ? current.perStack || 0 : 0);
            b.effects.dot = { damage: perStack * stacks, perStack, stacks, turns, name };
            notes.push(`${name} ${stacks}중첩 ${turns}턴`);
        } else {
            // 일반 출혈은 덮어쓰되, 쌓아 둔 중독이 더 강하면 지우지 않습니다.
            if (!current?.stacks || tick >= current.damage) b.effects.dot = { damage: tick, turns, name };
            notes.push(`${name} ${turns}턴`);
        }
        ev.statuses.push({ id: 'bleed', turns });
    }
    if (landed && chosen?.effect === 'weaken' && isImmune(b, 'weaken')) { notes.push('약화 면역'); ev.immune = 'weaken'; }
    else if (landed && chosen?.effect === 'weaken') {
        const turns = chosen.statusTurns ?? STATUS_TUNING.weakenTurns;
        extendStatus(b.effects, 'weaken', turns);
        notes.push(`공격 약화 ${turns}턴`);
        ev.statuses.push({ id: 'weaken', turns });
    }
    if (landed && chosen?.effect === 'silence' && isImmune(b, 'silence')) { notes.push('침묵 면역'); ev.immune = 'silence'; }
    else if (landed && chosen?.effect === 'silence') {
        const turns = (chosen.statusTurns ?? STATUS_TUNING.silenceTurns) + sa.controlBonus;
        extendStatus(b.effects, 'silence', turns);
        notes.push(`침묵 ${turns}턴`);
        ev.statuses.push({ id: 'silence', turns });
    }
    if (landed && chosen?.effect === 'slow' && isImmune(b, 'slow')) { notes.push('감속 면역'); ev.immune = 'slow'; }
    else if (landed && chosen?.effect === 'slow') {
        const turns = (chosen.statusTurns ?? STATUS_TUNING.slowTurns) + sa.controlBonus;
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
    const drainRate = sa.lifesteal + (chosen?.effect === 'drain' ? (chosen.drainRatio ?? SKILL_FORMULA.drainRatio) : 0);
    // 흡혈 회복은 준 피해 비례지만 한 번의 행동에서 최대 체력 × 흡혈률 × lifestealHpCap을 넘지 않습니다.
    let drainLeft = Math.floor(sa.hp * drainRate * SKILL_FORMULA.lifestealHpCap);
    const drain = Math.min(drainLeft, Math.floor(actual * drainRate));
    drainLeft -= drain;
    if (drain) {
        const recovery = Math.min(sa.hp - a.hp, drain);
        a.hp += recovery;
        ev.drained += recovery;
    }
    // Follow-up hits are part of the same action. They use the same hit chance,
    // cannot recursively trigger another follow-up, and are capped in balance.ts.
    const followUps = statusOnly ? 0 : Math.min(STATUS_TUNING.maxExtraAttacks, Math.max(0, chosen?.extraAttacks || 0));
    for (let i = 0; i < followUps && b.hp > 0 && a.hp > 0 && !stood; i++) {
        if (rng() >= hit) {
            ev.hits.push({ kind: 'follow', value: 0, critical: false, miss: true });
            continue;
        }
        const followCrit = rng() < sa.crit;
        const followMultiplier = (chosen?.multiplier || 1) * ((chosen?.extraAttackMultiplier ?? SKILL_FORMULA.extraAttackMultiplier) + sa.followUpBonus);
        const followDamage = Math.max(1, mitigated(base * followMultiplier * linkMultiplier * (weakened ? SKILL_FORMULA.weakenedDamage : 1) * (followCrit ? sa.critDamage : 1)));
        const followActual = Math.min(b.hp, followDamage);
        b.hp = Math.max(0, b.hp - followDamage);
        if (endure(b, sb, notes, ev)) stood = true;
        ev.hits.push({ kind: 'follow', value: followActual, critical: followCrit, miss: false });
        const followDrain = Math.min(drainLeft, Math.floor(followActual * drainRate));
        drainLeft -= followDrain;
        if (followDrain) {
            const recovery = Math.min(sa.hp - a.hp, followDrain);
            a.hp += recovery;
            ev.drained += recovery;
        }
    }
    // v25 반동: 준 피해에 비례해 자신도 받습니다. 반동으로는 쓰러지지 않습니다.
    if (chosen?.recoil && ev.hits.length) {
        const dealt = ev.hits.reduce((n, h) => n + h.value, 0), self = Math.min(Math.max(0, a.hp - 1), Math.floor(dealt * chosen.recoil));
        if (self > 0) { a.hp -= self; notes.push(`반동 ${self}`); }
    }
    // v25 자기 상태이상: 짝 기술(waivedBy)을 장착하면 생략합니다.
    if (chosen?.selfEffect) {
        const fx = chosen.selfEffect, waived = !!fx.waivedBy && a.skills.includes(fx.waivedBy);
        if (waived) notes.push(`${skillById(fx.waivedBy!)?.name || ''} · 반작용 상쇄`);
        else if (fx.status === 'stun') { a.stun = Math.max(a.stun, fx.turns); notes.push(`자신 기절 ${fx.turns}턴`); ev.statuses.push({ id: 'stun', turns: fx.turns, onSelf: true }); }
        else { extendStatus(a.effects, fx.status, fx.turns); notes.push(`자신 ${fx.status === 'slow' ? '감속' : '약화'} ${fx.turns}턴`); ev.statuses.push({ id: fx.status, turns: fx.turns, onSelf: true }); }
    }
    if (chosen?.extraTurn && !bonusAction) { ev.extraTurn = true; notes.push('추가 행동'); }
    // v25 일곱 글자: 인을 새기고, 天을 장착한 채 일곱 글자를 모두 갖추고 여섯 인이 모이면 天이 터집니다.
    if (chosen?.seal) {
        a.effects.seals = [...new Set([...(a.effects.seals || []), chosen.id])];
        const finaleSkill = a.skills.map(id => skillById(id)).find(x => x?.sealFinale);
        const glyphs = SKILLS.filter(x => x.job === chosen.job && (x.seal || x.lastStand));
        const sealsNeeded = glyphs.filter(x => x.seal).length;
        if (finaleSkill && b.hp > 0 && glyphs.every(x => a.skills.includes(x.id)) && a.effects.seals.length >= sealsNeeded) {
            const f = finaleSkill.sealFinale!, levels = glyphs.reduce((n, x) => n + (a.mastery?.[x.id] || 0), 0) + (a.mastery?.[finaleSkill.id] || 0);
            const blast = Math.max(1, Math.round((sa.attack + sa.magic) * (f.base + f.perLevel * levels)));
            const dealt = Math.min(b.hp, blast);
            b.hp = Math.max(0, b.hp - blast);
            endure(b, sb, notes, ev);
            ev.hits.push({ kind: 'follow', value: dealt, critical: false, miss: false });
            ev.finale = true;
            a.effects.seals = [];
            notes.push(`天 · 일곱 인 해방 ${dealt.toLocaleString()}`);
            if (b.hp > 0 && !isImmune(b, 'stun')) { b.stun = Math.max(b.stun, f.stun); const own = ev.statuses.find(x => x.id === 'stun' && !x.onSelf); if (own) own.turns = Math.max(own.turns, f.stun); else ev.statuses.push({ id: 'stun', turns: f.stun }); notes.push(`기절 ${f.stun}턴`); }
        }
    }
    ev.skillId = chosen?.id;
    ev.skillName = label;
    ev.damageType = split ? 'split' : magical ? 'magic' : 'physical';
    ev.healed = healed;
    ev.total = ev.hits.reduce((n, h) => n + h.value, 0);
    return emit(`${a.name} · ${label}${crit ? ' [치명타]' : ''} → ${describeHits(ev)}${healed ? ` · 회복 ${healed}` : ''}${ev.drained ? ` · 흡혈 ${ev.drained}` : ''}${notes.length ? ' · ' + notes.join(' · ') : ''}`);
}
