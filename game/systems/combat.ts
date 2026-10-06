import { SKILLS, skillById } from '../data/skills';
import { ENEMY_SKILLS } from '../data/encounters';
import { jobById } from '../data/classes';
import { BALANCE, STATUS_TUNING, SKILL_FORMULA, diceMultiplier } from '../data/balance';
import type { Stats, CombatStats, StatusEffects, CombatEvent, CombatHit, Attribute } from '../types';
const ATTR_KEY: Record<Attribute, 'attrStr' | 'attrDex' | 'attrInt' | 'attrVit' | 'attrWis' | 'attrLuk'> = { str: 'attrStr', dex: 'attrDex', int: 'attrInt', vit: 'attrVit', wis: 'attrWis', luk: 'attrLuk' };
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
    /** v24.2 사냥감 연구 대상 여부(보스·지정 몬스터). */
    prey?: boolean;
    /** v3.5 몬스터(사냥터·던전·월드보스). 이 전투원이 거는 상태이상은 상대의 상태이상 저항에 막힐 수 있습니다. */
    foe?: boolean;
    /** v25.2 기본 공격이 마법 피해(마력 생물). 마법 공격 수치로 치고 상대 마법 방어로 막습니다. */
    magicBasic?: boolean;
    /** v27 기본 공격이 복합 피해(혼돈 생물). (물리+마법)/2로 치고 물리·마법 방어를 절반씩 적용합니다. */
    splitBasic?: boolean;
    /** v27.4 제약 직업 장치: 항상 선공. */
    firstStrike?: boolean;
    /** v27.4 제약 직업 장치: 직업 자체의 최후의 버팀(기술 無와 같은 횟수 카운터를 씁니다). */
    jobStand?: { charges: number; heal?: number };
    /** v27.4 제약 직업 장치: 모든 공격 반드시 명중. */
    sureHit?: boolean;
};
/** v27.4 직업의 제약 장치를 전투 참가자 필드로. 플레이어(PvE)와 결투 스냅샷이 같이 씁니다. */
export function constraintFields(jobId: string | undefined): Partial<Fighter> {
    const d = jobById(jobId)?.constraint?.devices;
    if (!d) return {};
    return { ...(d.firstStrike ? { firstStrike: true } : {}), ...(d.lastStand ? { jobStand: d.lastStand } : {}), ...(d.sureHit ? { sureHit: true } : {}), ...(d.damageTaken ? { damageTaken: d.damageTaken } : {}), ...(d.damageDealt ? { damageDealt: d.damageDealt } : {}) };
}
/** v27.4 턴 순서: 선공 장치가 있으면 속도와 무관하게 먼저. 둘 다 없으면 속도 비교(같으면 a). */
export function actsFirst(a: Fighter, b: Fighter) {
    if (!!a.firstStrike !== !!b.firstStrike) return !!a.firstStrike;
    return fighterSpeed(a) >= fighterSpeed(b);
}
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
const ENEMY_STATUS: Record<string, ImmuneStatus> = { stun: 'stun', bleed: 'bleed', poison: 'poison', burn: 'burn', weaken: 'weaken', silence: 'silence', slow: 'slow' };
/** 상대에게 이미 걸려 있는 상태이상(중첩형 중독은 더 쌓을 수 있으므로 제외). */
function alreadyAfflicted(b: Fighter, sk: { effect?: string }) {
    const key = sk.effect ? ENEMY_STATUS[sk.effect] : undefined;
    if (!key) return false;
    if (key === 'stun') return b.stun > 0;
    if (key === 'bleed') return !!b.effects?.dot;
    if (key === 'poison') return false; // 중독은 계속 쌓입니다.
    if (key === 'burn') return (b.effects?.burn?.stacks || 0) >= STATUS_TUNING.burnMaxStacks; // 화상은 최대 중첩까지 쌓습니다.
    return (b.effects?.[key] || 0) > 0;
}
const isImmune = (b: Fighter, key: ImmuneStatus) => (b.effects?.immune?.[key] || 0) > 0;
/** v3.5 상태이상 저항이 막는 상태이상과 표시 이름. */
const RESISTABLE = new Set(['stun', 'bleed', 'poison', 'burn', 'weaken', 'silence', 'slow']);
const RESIST_LABELS: Record<string, string> = { stun: '기절', bleed: '출혈', poison: '중독', burn: '화상', weaken: '약화', silence: '침묵', slow: '감속' };
function extendStatus(effects: StatusEffects, key: DurationStatus, turns: number) {
    effects[key] = Math.max(effects[key] || 0, turns);
}
const DAMAGE_WORD = { physical: '물리', magic: '마법', split: '복합' } as const;
/** v3.54 무리에게 거는 지속 피해의 최대 체력 비례분: 한 마리 체력 × √N(= 무리 전체 체력 ÷ √N). 한 마리면 1. */
/** v3.54 이 전투에서 처음 거는 지속 피해면 true를 돌려주고 표시합니다(첫 틱 즉시 적용은 전투당 한 번). */
const opens = (b: Fighter, key: 'bleed' | 'poison' | 'burn') => { const fx = (b.effects ??= {}); if (fx.opened?.[key]) return false; (fx.opened ??= {})[key] = true; return true; };
/** v3.54 지속 피해의 체력 비례분: 틱 때 현재 체력 × hpRatio. hpRatio가 없는 옛 효과는 저장된 고정값(legacy)을 씁니다. */
const hpPart = (current: number, hpRatio: number | undefined, legacy: number | undefined) => hpRatio === undefined ? (legacy || 0) : Math.floor(Math.max(0, current) * hpRatio);
export const swarmDotShare = (swarm?: number) => swarm && swarm > 1 ? 1 / Math.sqrt(swarm) : 1;
/** v27.75 화면에 보여 주는 타격 수치: 계산된 피해(raw). 남은 체력에 막힌 실제 감소량(value)은 규칙에만 씁니다. */
export const shownHit = (h: Pick<CombatHit, 'value' | 'raw'>) => h.raw ?? h.value;
/** 타격 기록: 실제 감소량과 다를 때만 계산 피해(raw)를 함께 적습니다. */
const hitRecord = (kind: CombatHit['kind'], actual: number, computed: number, critical: boolean, superCritical = false): CombatHit => ({ kind, value: actual, ...(computed !== actual ? { raw: computed } : {}), critical, miss: false, ...(superCritical ? { superCritical: true } : {}) });
/** 본타·추가타를 한 번씩만 적고, 추가타가 있을 때만 합계를 붙입니다. 수치는 계산된 피해(shownHit)입니다. */
function describeHits(ev: Pick<CombatEvent, 'hits' | 'total' | 'damageType'>) {
    const word = DAMAGE_WORD[ev.damageType];
    if (!ev.hits.length) return '피해 없음';
    if (ev.hits.every(h => h.miss)) return '빗나감';
    if (ev.hits.length === 1) return `${ev.total} ${word} 피해`;
    const part = (h: CombatHit) => h.miss ? '빗나감' : `${shownHit(h)}${h.superCritical ? ' [극 치명타]' : h.critical ? ' [치명타]' : ''}`;
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
    // v3.12 연속 행동 가산(칠흑 장신구)은 속도와 무관하게 더합니다.
    const bonus = a.stats.chainBonus || 0;
    return Math.min(1, Math.max(0, (sa > sb ? BALANCE.chainCoefficient * Math.log2(sa / sb) : 0) + bonus));
}
/**
 * 한 전투원의 턴: 행동한 뒤 연속 행동 확률로 다시 행동합니다(연쇄). 턴당 최대 chainMaxActions번, 어느 쪽이든 쓰러지면 즉시 멈춥니다.
 * 추가 행동도 strike 그대로의 온전한 행동입니다. 확률이 0이면 난수를 쓰지 않아 기존과 같은 난수 순서를 유지합니다.
 * onAction은 행동마다 (로그 문장, 구조화된 결과)로 불립니다. 두 번째 행동부터 문장 끝에 '연속 N'을 붙입니다.
 */
export function actTurn(a: Fighter, b: Fighter, rng: () => number, onAction: (text: string, event: CombatEvent) => void) {
    for (let chain = 1; ; chain++) {
        const events: CombatEvent[] = [];
        const text = strike(a, b, rng, events, false, chain > 1), ev = events[0];
        if (chain > 1) ev.chain = chain;
        onAction(chain > 1 ? `${text} · 연속 ${chain}` : text, ev);
        // v25.5 동시 시전: 첫 줄에 적힌 기술들을 같은 행동 안에서 이어서 씁니다(행동 시작 효과 없이).
        if (ev?.multicast?.ids) for (const [i, id] of ev.multicast.ids.entries()) {
            if (a.hp <= 0 || b.hp <= 0) break;
            const more: CombatEvent[] = [];
            const t = strike(a, b, rng, more, false, chain > 1, { id, index: i + 1, count: ev.multicast.count });
            onAction(`${t} · 동시 시전 ${i + 2}/${ev.multicast.count}`, more[0]);
        }
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
    const id = f.skills.find(x => skillById(x)?.lastStand), stand = id ? skillById(id)!.lastStand! : f.jobStand;
    if (!stand) return false;
    f.effects ??= {};
    // v25.14 無는 함께 새긴 글자(같은 직업의 seal 액티브) 수에 비례합니다. 혼자 새기면 전투당 1번, 회복 없음. 여섯 글자를 모두 새겨야 원래 횟수·회복.
    const owner = id ? skillById(id)! : undefined, sealsAll = owner ? SKILLS.filter(x => x.job === owner.job && x.seal).length : 0, sealsOn = owner ? f.skills.filter(x => skillById(x)?.seal && skillById(x)?.job === owner.job).length : 0;
    const weave = sealsAll ? sealsOn / sealsAll : 1;
    const perLevel = Number((stand as { chargesPerLevel?: number }).chargesPerLevel || 0);
    const used = f.effects.lastStand || 0, full = stand.charges + Math.floor(perLevel * (id ? f.mastery?.[id] || 0 : 0)), charges = Math.max(1, Math.round(full * weave));
    if (used >= charges) return false;
    f.effects.lastStand = used + 1;
    const heal = Math.max(0, Math.min(sf.hp - 1, Math.floor(sf.hp * (stand.heal || 0) * weave)));
    f.hp = 1 + heal;
    ev.endured = { heal, ...(self ? { self } : {}) };
    notes.push(`無 · 체력 1로 버팀 (${f.effects.lastStand}/${charges})${heal > 0 ? ` · 체력 ${heal} 회복` : ''}`);
    return true;
}
/** Shared PvE/PvP action. Recovery, status, conditional proc, MP, accuracy, defense and crit. */
/** v25.5 동시 시전 묶음의 2번째 이후 줄: 행동 시작 효과(회복·지속 피해·대기 감소·기절)를 건너뛰고 정해진 기술을 바로 씁니다. */
export type ForcedCast = { id: string; index: number; count: number };
export function strike(a: Fighter, b: Fighter, rng = Math.random, events?: CombatEvent[], bonusAction = false, chained = false, forced?: ForcedCast) {
    const sa = normalizeStats(a.stats), sb = normalizeStats(b.stats);
    a.effects ??= {};
    b.effects ??= {};
    if (!forced) a.mana = Math.min(sa.mana, (a.mana ?? sa.mana) + sa.manaRegen);
    const notes: string[] = [];
    const ev: CombatEvent = { actor: a.name, skillName: '기본 공격', damageType: 'physical', hits: [], total: 0, healed: 0, drained: 0, statuses: [] };
    const emit = (text: string) => { events?.push(ev); return text; };
    // 턴당 체력 회복: 마나처럼 행동 시작 때 되찾습니다(연속·추가 행동 포함).
    if (!forced && sa.hpRegen > 0 && a.hp > 0 && a.hp < sa.hp) { ev.regen = Math.min(sa.hp - a.hp, sa.hpRegen); a.hp += ev.regen; }
    if (!forced) tickImmunity(a.effects);
    if (!forced && a.effects.dot) {
        const dot = a.effects.dot;
        // v3.54 체력 비례분은 틱 때 현재 체력 기준입니다(전에는 걸 때 최대 체력 기준).
        const dotHit = dot.damage + hpPart(a.hp, dot.hpRatio, 0);
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
    // v27.19 중독 틱: 중첩 × (중첩당 피해 + 최대 체력 비례). 출혈과 별개로 함께 들어갑니다.
    if (!forced && a.effects.poison && a.hp > 0) {
        const poison = a.effects.poison;
        const hit = (poison.perStack + hpPart(a.hp, poison.hpRatio, poison.hpTick)) * poison.stacks;
        a.hp = Math.max(0, a.hp - hit);
        notes.push(`중독 ×${poison.stacks} ${hit}`);
        ev.dot = ev.dot ? { name: `${ev.dot.name}·중독`, value: ev.dot.value + hit } : { name: `중독 ×${poison.stacks}`, value: hit };
        poison.turns--;
        if (poison.turns <= 0) { delete a.effects.poison; grantImmunity(a.effects, 'poison'); }
        if (a.hp <= 0 && !endure(a, sa, notes, ev, true)) { ev.defeated = true; return emit(`${a.name} · ${notes.join(' · ')} → 쓰러짐`); }
    }
    // v27.48 화상 틱: 중독과 같은 방식(중첩 × (중첩당 피해 + 최대 체력 비례)). 출혈·중독과 함께 들어갑니다.
    if (!forced && a.effects.burn && a.hp > 0) {
        const burn = a.effects.burn;
        const hit = (burn.perStack + hpPart(a.hp, burn.hpRatio, burn.hpTick)) * burn.stacks;
        a.hp = Math.max(0, a.hp - hit);
        notes.push(`화상 ×${burn.stacks} ${hit}`);
        ev.dot = ev.dot ? { name: `${ev.dot.name}·화상`, value: ev.dot.value + hit } : { name: `화상 ×${burn.stacks}`, value: hit };
        burn.turns--;
        if (burn.turns <= 0) { delete a.effects.burn; grantImmunity(a.effects, 'burn'); }
        if (a.hp <= 0 && !endure(a, sa, notes, ev, true)) { ev.defeated = true; return emit(`${a.name} · ${notes.join(' · ')} → 쓰러짐`); }
    }
    const attackSpeed = fighterSpeed(a), targetSpeed = fighterSpeed(b);
    const weakened = forced ? (a.effects.weaken || 0) > 0 : consumeStatus(a.effects, 'weaken');
    const silenced = forced ? false : consumeStatus(a.effects, 'silence');
    if (!forced) { consumeStatus(a.effects, 'slow'); consumeStatus(a.effects, 'haste'); }
    if (silenced) {
        notes.push('침묵 중');
        ev.silenced = true;
    }
    const blocked = new Set(Object.keys(a.cooldowns).filter(k => a.cooldowns[k] > 0));
    if (!forced) for (const k of Object.keys(a.cooldowns))
        a.cooldowns[k] = Math.max(0, a.cooldowns[k] - 1);
    if (!forced && a.stun > 0) {
        a.stun--;
        if (a.stun === 0) grantImmunity(a.effects, 'stun');
        ev.stunned = true;
        return emit(`${a.name}: 기절로 행동 불가.${notes.length ? ' ' + notes.join(' · ') : ''}`);
    }
    const skillOf = (id: string) => { const base = [...SKILLS, ...ENEMY_SKILLS].find(x => x.id === id); if (!base) return undefined; const c = effectiveSkill(base, a.ranks?.[id] || 1, a.mastery?.[id] || 0, a.practice?.[id] || 0); c.multiplier *= signatureScale(base, a.job); return c; };
    let chosen;
    if (forced) chosen = skillOf(forced.id);
    else if (!silenced) {
        for (const id of a.skills) {
            const base = [...SKILLS, ...ENEMY_SKILLS].find(x => x.id === id);
            if (!base || base.type !== 'active' || blocked.has(id))
                continue;
            const candidate = effectiveSkill(base, a.ranks?.[id] || 1, a.mastery?.[id] || 0, a.practice?.[id] || 0);
            candidate.multiplier *= signatureScale(base, a.job);
            // v21: 회복 기술은 체력이 가득 차도 시도합니다(회복이 필요 없으면 아래에서 피해가 줄어듦).
            if (candidate.condition === 'wounded' && a.hp > sa.hp * SKILL_FORMULA.woundedThreshold)
                continue;
            if (candidate.condition === 'healthyTarget' && b.hp < sb.hp * .6)
                continue;
            if (candidate.condition === 'afflicted' && !(a.effects.dot || a.effects.poison || a.effects.burn || a.effects.slow || a.effects.weaken))
                continue;
            if ((a.mana ?? 0) < (candidate.manaCost || 0))
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
    // v25.5 동시 시전: 첫 성공이 multicast 기술이면 편성의 다른 multicast 액티브도 각자 발동률로 굴려 함께 나갑니다. 묶음 전체의 가중 마나를 감당할 수 있을 때까지 뒤에서부터 뺍니다.
    const MC = SKILL_FORMULA.multicast;
    let castCount = forced?.count || 1;
    if (chosen?.multicast && !forced) {
        const extras: { id: string; mana: number }[] = [];
        for (const id of a.skills) {
            if (id === chosen.id || extras.length + 1 >= MC.max || blocked.has(id)) continue;
            const c = skillOf(id);
            if (!c || c.type !== 'active' || !c.multicast || c.statusOnly && c.effect && ENEMY_STATUS[c.effect] && isImmune(b, ENEMY_STATUS[c.effect])) continue;
            if (rng() < c.chance) extras.push({ id, mana: c.manaCost || 0 });
        }
        const manaFor = (n: number) => Math.ceil(((chosen!.manaCost || 0) + extras.slice(0, n - 1).reduce((s, e) => s + e.mana, 0)) * (1 + (n - 1) * MC.manaScale));
        while (extras.length && (a.mana ?? 0) < manaFor(extras.length + 1)) extras.pop();
        if (extras.length) { castCount = extras.length + 1; ev.multicast = { index: 0, count: castCount, ids: extras.map(e => e.id) }; notes.push(`동시 시전 1/${castCount}`); }
    }
    if (forced) ev.multicast = { index: forced.index, count: forced.count };
    // 마력 평타: 마법 직업은 기본 공격 대신 마법 공격 × 계수의 마법 피해를 줍니다(v25.22부터 확률 없이 항상).
    const arcane = !chosen && sa.arcaneStrike > 0;
    let healed = 0, overheal = 0;
    // 체력이 충분한데 쓴 회복 기술: 회복 직업이 아니면 이번 공격 피해가 줄어듭니다.
    const idleHeal = chosen?.effect === 'heal' && a.hp >= sa.hp * SKILL_FORMULA.healThreshold && !sa.healFocus;
    if (chosen) {
        a.cooldowns[chosen.id] = chosen.cooldown + (castCount - 1) * MC.cooldownStep;
        a.mana = Math.max(0, (a.mana ?? 0) - Math.ceil((chosen.manaCost || 0) * (1 + (castCount - 1) * MC.manaScale)));
        if (chosen.cleanseSelf) { delete a.effects.dot; delete a.effects.poison; delete a.effects.burn; delete a.effects.slow; notes.push('정화'); ev.cleansed = true; }
        if (chosen.wardTurns) {
            delete a.effects.weaken;
            const immune = (a.effects.immune ??= {});
            for (const key of ['stun', 'bleed', 'poison', 'burn', 'weaken', 'silence', 'slow'] as const) immune[key] = Math.max(immune[key] || 0, chosen.wardTurns);
            notes.push(`상태이상 면역 ${chosen.wardTurns}턴`);
        }
        if (chosen.effect === 'heal') {
            const intended = Math.floor(sa.hp * (chosen.healRatio ?? SKILL_FORMULA.healRatio) * (1 + sa.healBonus));
            healed = Math.min(sa.hp - a.hp, intended);
            a.hp += healed;
            // v3.54 힐러(회복 직업)는 넘친 회복량을 적에게 피해로 돌려줍니다(아래에서 overhealDamage 배율로 적용).
            if (sa.healFocus) overheal = intended - healed;
        }
        // v25 타임 리와인드: 둘 다 처음 상태로. 전투당 1회.
        if (chosen.restoreAll) {
            a.effects.timeUsed = true;
            a.hp = sa.hp; a.mana = sa.mana; b.hp = sb.hp; if (b.mana !== undefined) b.mana = sb.mana;
            notes.push('타임 리와인드 · 모두 처음 상태로');
            ev.restored = true;
        }
    }
    // v24.2 도박: 쓸 때마다 피해 배율과 명중을 굴립니다.
    let gambleRoll = 1, gambleAccuracy = 0;
    // v26.6 주사위: 능력치 per마다 1개(최대 max)를 굴려 가장 높은 눈을 배율로(1→최저, 6→최고). 손가락 자르기가 양 끝을 좁힙니다.
    if (chosen?.dice) {
        const count = Math.min(chosen.dice.max, 1 + Math.floor((sa[ATTR_KEY[chosen.dice.attribute]] || 0) / chosen.dice.per));
        const faces = Array.from({ length: count }, () => 1 + Math.floor(rng() * 6));
        gambleRoll = diceMultiplier(chosen.dice, Math.max(...faces), sa.diceTrim || 0);
        notes.push(`주사위 ${faces.map(f => '⚀⚁⚂⚃⚄⚅'[f - 1]).join('')} ×${gambleRoll.toFixed(2)}`);
        ev.gamble = gambleRoll; ev.dice = faces;
    }
    else if (chosen?.gamble) {
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
    const magical = arcane || chosen?.damageType === 'magic' || chosen?.id === 'oath' && sa.magic > sa.attack || !chosen && !!a.magicBasic;
    // v26.7 마법 공격은 회피를 절반만 받고 속도 보정의 마이너스를 받지 않습니다(물리 빌드와의 차별점).
    const hit = chosen?.sureHit || a.sureHit ? 1 : hitChance({ ...sa, speed: attackSpeed, accuracy: sa.accuracy + (chosen?.accuracyBonus || 0) + gambleAccuracy }, { ...sb, speed: targetSpeed }, magical);
    const splitBasic = !chosen && !!a.splitBasic;
    const label = chosen?.name || (arcane ? '마력 평타' : splitBasic ? '복합 평타' : '기본 공격');
    // v26.3 순수 회복 기술: 명중 판정 없이 회복만 하고 끝납니다.
    const healOnly = !!chosen?.healOnly;
    const landed = healOnly ? true : rng() < hit;
    const split = chosen?.damageType === 'split' || splitBasic;
    // 올라운드 밸런스는 배분 능력치로 만든 원시 피해만 사용하고 일반 공격력을 더하지 않습니다.
    let base = arcane ? sa.magic * (SKILL_FORMULA.arcaneStrikeRatio + sa.arcaneRatioBonus) : chosen?.scaling === 'harmony' ? (sa.harmony || 0) : chosen?.scaling === 'dual' ? (sa.attack + sa.magic) / 2 : chosen?.scaling === 'swap' ? (magical ? sa.attack : sa.magic) : chosen?.scaling === 'attr' ? 0 : splitBasic ? (sa.attack + sa.magic) / 2 : magical ? sa.magic : sa.attack;
    // 방어 비례 피해: 수호 계열(방어 친화도 1)에서 온전히, 다른 직업이 계승하면 일부만 발휘됩니다.
    if (chosen?.scaling === 'defense')
        base += sa.defense * (chosen.scalingRatio ?? 1) * sa.guardAffinity;
    // v25.14 마법 방어 비례 피해: 결계 계열(마법 방어 배율이 높은 직업)에서 온전히, 다른 직업이 계승하면 일부만.
    if (chosen?.scaling === 'resist')
        base += sa.resist * (chosen.scalingRatio ?? 1) * (sa.wardAffinity ?? 1);
    // v25.22 행운 비례 피해(도박 기술): 물리 공격 × (치명 피해 배율 − 1) × 비율. 행운을 몰아주면 치명 피해 배율이 커져 주사위 기술이 세집니다.
    // v26.4 능력치 비례 피해(외길 계보): 기준값 = 배분 능력치 × 비율(공격력은 쓰지 않음). 그 능력치만 올려도 사냥이 됩니다.
    if (chosen?.scaling === 'attr' && chosen.scalingAttribute)
        base += (sa[ATTR_KEY[chosen.scalingAttribute]] || 0) * (chosen.scalingRatio ?? 1);
    if (chosen?.scaling === 'luck')
        base += sa.attack * Math.max(0, (sa.critDamage || 1) - 1) * (chosen.scalingRatio ?? 1);
    if (chosen?.scaling === 'hp')
        base += sa.hp / (a.swarm || 1) * (chosen.scalingRatio ?? SKILL_FORMULA.hpScaling);
    if (chosen?.scaling === 'mana')
        base += sa.mana * (chosen.scalingRatio ?? SKILL_FORMULA.manaScaling);
    // v24.2 진행도 비례 피해: 기본 피해 × 비율 × 기록(도감 종 수 · log10 처치 · √사냥 · log10 골드).
    const progress = chosen?.scaling === 'codex' ? sa.codexPower : chosen?.scaling === 'catch' ? sa.catchPower : chosen?.scaling === 'hunt' ? sa.huntPower : chosen?.scaling === 'gold' ? sa.goldPower : chosen?.scaling === 'mastered' ? sa.masteredPower : chosen?.scaling === 'variant' ? sa.variantPower : 0;
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
    const linked = chosen?.damageBonusCondition === 'bleeding' ? !!(b.effects.dot || b.effects.poison || b.effects.burn) : chosen?.damageBonusCondition === 'weakened' ? !!b.effects.weaken : chosen?.damageBonusCondition === 'controlled' ? !!(b.effects.silence || b.effects.slow || b.stun > 0) : chosen?.damageBonusCondition === 'lowHp' ? b.hp <= sb.hp * (SKILL_FORMULA.lowHpThreshold + sa.executeBonus) : false;
    const preyHit = !!(chosen?.preyBonus && b.prey);
    if (preyHit) notes.push('사냥감');
    const sealBoost = chosen?.sealPower ? 1 + chosen.sealPower * (a.effects.seals?.length || 0) : 1;
    if (chosen?.sealPower) notes.push(`인 ${a.effects.seals?.length || 0}개`);
    // v27.17 출혈 중인 대상은 직접 피해를 더 받습니다(출혈은 중첩되지 않는 대신 이 보정). v27.48 화상은 그 절반을 더합니다.
    const bleedBoost = 1 + (b.effects.dot ? SKILL_FORMULA.bleedVulnerability : 0) + (b.effects.burn ? SKILL_FORMULA.burnVulnerability : 0);
    const linkMultiplier = (linked ? 1 + (chosen?.conditionalDamageBonus || 0) : 1) * bleedBoost * sealBoost * (preyHit ? 1 + chosen!.preyBonus! : 1) * (b.prey && sa.bossDamage ? 1 + sa.bossDamage : 1) * (1 + (a.damageDealt || 0)) * (1 - (b.damageTaken || 0));
    if (linked) { notes.push('연계'); ev.linked = true; }
    // 상태이상 전용 기술: 명중 판정만 하고 직접 피해·반격·흡혈·추가타는 없습니다.
    const statusOnly = !!chosen?.statusOnly || healOnly;
    // v27.18 극 치명타: 같은 난수로 판정합니다(치명타 확률 상한을 넘은 몫 = superCrit). 치명 피해에 superCritBonus를 더 곱합니다.
    const critRoll = landed && !statusOnly ? rng() : 1;
    const crit = critRoll < sa.crit, superCrit = crit && critRoll < (sa.superCrit || 0);
    const damage = !landed || statusOnly ? 0 : Math.max(1, mitigated(base * (chosen?.multiplier || 1) * gambleRoll * linkMultiplier * (idleHeal ? SKILL_FORMULA.idleHealDamage : 1) * (weakened ? SKILL_FORMULA.weakenedDamage : 1) * (crit ? sa.critDamage * (superCrit ? SKILL_FORMULA.superCritBonus : 1) : 1)));
    const actual = Math.min(b.hp, damage);
    b.hp = Math.max(0, b.hp - actual);
    // v25 無: 쓰러질 피해를 받은 쪽이 無를 장착했으면 체력 1로 버티고, 이 행동의 남은 추가타는 멈춥니다.
    let stood = endure(b, sb, notes, ev);
    // 반격: 맞은 쪽이 방어 비례 피해를 되돌려 줍니다. 공격자의 물리 방어로 경감됩니다.
    if (landed && !statusOnly && sb.thorns > 0) {
        // v27.2 공격자 방어를 절반만 적용하고, 무리 규모에 따라 (1 + log2 N)배(최대 10배). 탱커가 무리 사냥에서 빛나는 장치입니다.
        const crowd = a.swarm && a.swarm > 1 ? Math.min(SKILL_FORMULA.swarmThornsCap, 1 + Math.log2(a.swarm)) : 1;
        // v27.2 마법 공격을 맞으면 마법 방어로 반격합니다(결계 계보가 마법 무리를 갈 수 있도록). 공격자도 같은 종류의 방어로 막습니다.
        const guard = magical ? sb.resist : sb.defense, foeGuard = magical ? sa.resist : sa.defense;
        const reflected = Math.min(a.hp, Math.max(1, Math.round(guard * sb.thorns * crowd * 100 / (100 + foeGuard * 2 * (1 - SKILL_FORMULA.thornsPierce)))));
        a.hp = Math.max(0, a.hp - reflected);
        endure(a, sa, notes, ev, true);
        ev.reflected = reflected;
        notes.push(`반격 ${reflected}`);
        // v25.25 반격에도 흡혈: 되돌려 준 피해 × 흡혈률 × 2만큼 맞은 쪽이 회복합니다(반격 피해가 작아 2배).
        if (sb.lifesteal > 0 && b.hp > 0) {
            const heal = Math.min(sb.hp - b.hp, Math.floor(reflected * sb.lifesteal * SKILL_FORMULA.thornsLifestealScale));
            if (heal > 0) { b.hp += heal; ev.reflectHeal = heal; notes.push(`반격 흡혈 ${heal}`); }
        }
    }
    // 표시는 실제로 깎인 체력 기준: 본타·추가타를 각각 한 번씩만 세고 합계는 그 합입니다.
    if (!statusOnly || !landed) ev.hits.push(landed ? hitRecord('main', actual, damage, crit, superCrit) : { kind: 'main', value: 0, critical: false, miss: true });
    if (healOnly) notes.push(`회복 ${healed}`);
    // v3.5 상태이상 저항: 몬스터가 거는 해로운 상태이상을 대상의 statusResist 확률로 무효화합니다(저항이 0이면 난수를 쓰지 않음).
    const harmful = chosen?.effect && RESISTABLE.has(chosen.effect) ? chosen.effect : undefined;
    const resisted = !!(landed && harmful && a.foe && sb.statusResist > 0 && !isImmune(b, harmful as ImmuneStatus) && rng() < sb.statusResist);
    if (resisted) { notes.push(`${RESIST_LABELS[harmful!]} 저항`); ev.resisted = harmful; }
    const effect = resisted ? undefined : chosen?.effect;
    const onset: { name: string; value: number }[] = [];
    if (landed && chosen && effect === 'stun' && isImmune(b, 'stun')) { notes.push('기절 면역'); ev.immune = 'stun'; }
    else if (landed && chosen && effect === 'stun') {
        const turns = (chosen.statusTurns ?? 1) + sa.stunBonus;
        b.stun = Math.max(b.stun, turns);
        notes.push(turns > 1 ? `기절 ${turns}턴` : '기절');
        ev.statuses.push({ id: 'stun', turns });
    }
    if (landed && chosen && effect === 'bleed' && isImmune(b, 'bleed')) { notes.push('출혈 면역'); ev.immune = 'bleed'; }
    else if (landed && chosen && effect === 'bleed') {
        const turns = (chosen.statusTurns ?? STATUS_TUNING.bleedTurns) + sa.dotTurnsBonus;
        const name = chosen.dotName || '출혈';
        // v27.3 틱 피해 = 위력 비례 + 대상 체력 비례(v3.54 틱 때 현재 체력 × bleedHpRatio, 무리는 × swarmDotShare). 방어·반격을 모두 무시하므로 탱커의 카운터입니다.
        const tick = Math.max(1, Math.floor(base * (chosen.dotRatio ?? SKILL_FORMULA.bleedRatio) * (1 + (sa.dotBonus || 0) + (sa.bleedBonus || 0)) * (weakened ? SKILL_FORMULA.weakenedDamage : 1)));
        const hpRatio = SKILL_FORMULA.bleedHpRatio * swarmDotShare(b.swarm);
        // v27.17 출혈은 중첩되지 않습니다. 다시 걸면 더 강한 피해와 더 긴 지속으로 갱신합니다.
        const current = b.effects.dot;
        // v3.54 전투에서 처음 걸 때 첫 틱을 바로 한 번 더 줍니다(지속은 그대로, 전투당 한 번). 원킬·짧은 전투에서도 지속 피해가 몫을 합니다.
        // (지속을 1턴 줄이면 다시 걸기 전에 끝나 면역이 생겨 긴 전투 피해가 줄었고, 매번 주면 출혈만 긴 전투에서 크게 늘었습니다.)
        if (opens(b, 'bleed')) onset.push({ name, value: tick + hpPart(b.hp, hpRatio, 0) });
        b.effects.dot = { damage: Math.max(tick, current?.hpRatio === undefined ? 0 : current.damage), hpRatio: Math.max(hpRatio, current?.hpRatio || 0), turns: Math.max(turns, current?.turns || 0), name };
        notes.push(`${name} ${turns}턴`);
        ev.statuses.push({ id: 'bleed', turns });
    }
    // v27.17 중독: 출혈과 별개의 중첩형 지속 피해. 걸릴 때마다 한 중첩, 지속 갱신, 중첩당 피해는 더 강한 쪽.
    if (landed && chosen && effect === 'poison' && isImmune(b, 'poison')) { notes.push('중독 면역'); ev.immune = 'poison'; }
    else if (landed && chosen && effect === 'poison') {
        const turns = (chosen.statusTurns ?? STATUS_TUNING.poisonTurns) + sa.dotTurnsBonus;
        const perStack = Math.max(1, Math.floor(base * (chosen.dotRatio ?? SKILL_FORMULA.poisonRatio) * (1 + (sa.dotBonus || 0) + (sa.poisonBonus || 0)) * (weakened ? SKILL_FORMULA.weakenedDamage : 1)));
        const hpRatio = SKILL_FORMULA.poisonHpRatio * swarmDotShare(b.swarm);
        const current = b.effects.poison;
        // v3.54 처음 걸면 poisonFirstStacks중첩으로 시작합니다. 전투에서 처음 걸 때 첫 틱을 바로 한 번 더 줍니다(전투당 한 번).
        const first = opens(b, 'poison'), stacks = Math.min(STATUS_TUNING.poisonMaxStacks + sa.poisonStackBonus, current ? current.stacks + 1 : first ? STATUS_TUNING.poisonFirstStacks : 1);
        if (first) onset.push({ name: '중독', value: (perStack + hpPart(b.hp, hpRatio, 0)) * stacks });
        b.effects.poison = { perStack: Math.max(perStack, current?.perStack || 0), stacks, turns: Math.max(turns, current?.turns || 0), hpRatio: Math.max(hpRatio, current?.hpRatio || 0) };
        notes.push(`중독 ${stacks}중첩 ${turns}턴`);
        ev.statuses.push({ id: 'poison', turns });
    }
    // v27.48 화상: 걸릴 때마다 한 중첩(최대 burnMaxStacks), 지속 갱신, 중첩당 피해는 더 강한 쪽.
    if (landed && chosen && effect === 'burn' && isImmune(b, 'burn')) { notes.push('화상 면역'); ev.immune = 'burn'; }
    else if (landed && chosen && effect === 'burn') {
        const turns = (chosen.statusTurns ?? STATUS_TUNING.burnTurns) + sa.dotTurnsBonus;
        const perStack = Math.max(1, Math.floor(base * (chosen.dotRatio ?? SKILL_FORMULA.burnRatio) * (1 + (sa.dotBonus || 0) + (sa.burnBonus || 0)) * (weakened ? SKILL_FORMULA.weakenedDamage : 1)));
        const hpRatio = SKILL_FORMULA.burnHpRatio * swarmDotShare(b.swarm);
        const current = b.effects.burn;
        // v3.54 전투에서 처음 걸면 burnFirstStacks중첩으로 시작하고 첫 틱을 바로 한 번 더 줍니다(전투당 한 번).
        const first = opens(b, 'burn'), stacks = Math.min(STATUS_TUNING.burnMaxStacks, current ? current.stacks + 1 : first ? STATUS_TUNING.burnFirstStacks : 1);
        if (first) onset.push({ name: '화상', value: (perStack + hpPart(b.hp, hpRatio, 0)) * stacks });
        b.effects.burn = { perStack: Math.max(perStack, current?.perStack || 0), stacks, turns: Math.max(turns, current?.turns || 0), hpRatio: Math.max(hpRatio, current?.hpRatio || 0) };
        notes.push(`화상 ${stacks}중첩 ${turns}턴`);
        ev.statuses.push({ id: 'burn', turns });
    }
    // v3.54 새로 건 지속 피해의 첫 틱과 힐러의 넘친 회복 피해를 바로 줍니다(방어 무시). 쓰러지면 無 판정을 거칩니다.
    if (onset.length && b.hp > 0) {
        const value = Math.min(b.hp, onset.reduce((n, x) => n + x.value, 0));
        b.hp -= value; ev.onset = { name: onset.map(x => x.name).join('·'), value };
        notes.push(`${ev.onset.name} 즉시 ${value}`);
        if (b.hp <= 0) stood = endure(b, sb, notes, ev) || stood;
    }
    if (overheal > 0 && b.hp > 0) {
        const value = Math.min(b.hp, Math.floor(overheal * SKILL_FORMULA.overhealDamage));
        if (value > 0) { b.hp -= value; ev.holy = value; notes.push(`넘친 회복 → 피해 ${value}`); if (b.hp <= 0) stood = endure(b, sb, notes, ev) || stood; }
    }
    if (landed && chosen && effect === 'weaken' && isImmune(b, 'weaken')) { notes.push('약화 면역'); ev.immune = 'weaken'; }
    else if (landed && chosen && effect === 'weaken') {
        const turns = chosen.statusTurns ?? STATUS_TUNING.weakenTurns;
        extendStatus(b.effects, 'weaken', turns);
        notes.push(`공격 약화 ${turns}턴`);
        ev.statuses.push({ id: 'weaken', turns });
    }
    if (landed && chosen && effect === 'silence' && isImmune(b, 'silence')) { notes.push('침묵 면역'); ev.immune = 'silence'; }
    else if (landed && chosen && effect === 'silence') {
        const turns = (chosen.statusTurns ?? STATUS_TUNING.silenceTurns) + sa.controlBonus;
        extendStatus(b.effects, 'silence', turns);
        notes.push(`침묵 ${turns}턴`);
        ev.statuses.push({ id: 'silence', turns });
    }
    if (landed && chosen && effect === 'slow' && isImmune(b, 'slow')) { notes.push('감속 면역'); ev.immune = 'slow'; }
    else if (landed && chosen && effect === 'slow') {
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
        const followRoll = rng(), followCrit = followRoll < sa.crit, followSuper = followCrit && followRoll < (sa.superCrit || 0);
        const followMultiplier = (chosen?.multiplier || 1) * ((chosen?.extraAttackMultiplier ?? SKILL_FORMULA.extraAttackMultiplier) + sa.followUpBonus);
        const followDamage = Math.max(1, mitigated(base * followMultiplier * linkMultiplier * (weakened ? SKILL_FORMULA.weakenedDamage : 1) * (followCrit ? sa.critDamage * (followSuper ? SKILL_FORMULA.superCritBonus : 1) : 1)));
        const followActual = Math.min(b.hp, followDamage);
        b.hp = Math.max(0, b.hp - followDamage);
        if (endure(b, sb, notes, ev)) stood = true;
        ev.hits.push(hitRecord('follow', followActual, followDamage, followCrit, followSuper));
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
    if (chosen?.extraTurn && !bonusAction && !forced) { ev.extraTurn = true; notes.push('추가 행동'); }
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
            ev.hits.push(hitRecord('follow', dealt, blast, false));
            ev.finale = true;
            a.effects.seals = [];
            notes.push(`天 · 일곱 인 해방 ${blast.toLocaleString()}`);
            if (b.hp > 0 && !isImmune(b, 'stun')) { b.stun = Math.max(b.stun, f.stun); const own = ev.statuses.find(x => x.id === 'stun' && !x.onSelf); if (own) own.turns = Math.max(own.turns, f.stun); else ev.statuses.push({ id: 'stun', turns: f.stun }); notes.push(`기절 ${f.stun}턴`); }
        }
    }
    // v25.5 재사용 대기 초기화 패시브: 치명타·처치·연속 행동 조건마다 확률로 대기 중인 액티브를 되돌립니다(플레이어 전용).
    if (a.ranks) {
        const critical = ev.hits.some(h => h.critical), killed = b.hp <= 0;
        for (const id of a.skills) {
            const rule = skillById(id)?.cooldownReset;
            if (!rule || !(rule.on === 'crit' ? critical : rule.on === 'kill' ? killed : chained)) continue;
            if (rule.chance < 1 && rng() >= rule.chance) continue;
            const waiting = a.skills.filter(x => (a.cooldowns[x] || 0) > 0 && skillById(x)?.type === 'active');
            if (!waiting.length) continue;
            const picked = rule.pick === 'all' ? waiting : rule.pick === 'first' ? [waiting[0]] : [waiting.reduce((best, x) => a.cooldowns[x] > a.cooldowns[best] ? x : best, waiting[0])];
            for (const x of picked) a.cooldowns[x] = 0;
            ev.cooldownReset = [...(ev.cooldownReset || []), ...picked.map(x => skillById(x)?.name || x)];
            notes.push(`대기 초기화 · ${picked.map(x => skillById(x)?.name || x).join('·')} (${skillById(id)?.name})`);
        }
    }
    ev.skillId = chosen?.id;
    ev.skillName = label;
    ev.damageType = split ? 'split' : magical ? 'magic' : 'physical';
    ev.healed = healed;
    // v27.75 합계도 계산된 피해 기준(표시용). 실제 감소량 합이 필요하면 hits의 value를 더합니다.
    ev.total = ev.hits.reduce((n, h) => n + shownHit(h), 0);
    return emit(`${a.name} · ${label}${superCrit ? ' [극 치명타]' : crit ? ' [치명타]' : ''} → ${describeHits(ev)}${healed ? ` · 회복 ${healed}` : ''}${ev.drained ? ` · 흡혈 ${ev.drained}` : ''}${notes.length ? ' · ' + notes.join(' · ') : ''}`);
}
