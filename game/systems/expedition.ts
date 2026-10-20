/**
 * 원정대(오토배틀러) 1단계: N대N 전투 계층 프로토타입. 화면 · 저장 없이 순수 계산만 있습니다.
 * - 유닛은 본편 전투 엔진의 Fighter로 만들고, 행동은 엔진의 actTurn(기술 선택 · 상태이상 · 추가타 · 흡혈 모두 엔진 그대로)을 씁니다.
 * - 이 계층이 하는 일: 보드(앞줄 · 뒷줄) · 시너지 집계와 적용 · 턴 순서(속도) · 대상 선택(앞줄 우선) · 처치 누적 · 부활 · 승패.
 * - 2단계: 기술은 마나로 발동합니다(기본 공격 +10 · 피격 +5, 100에 강제 시전). 엔진에는 기술 목록을 비워 두고, 시전 턴에만 forced로 그 유닛의 기술을 넘깁니다.
 *   기절 · 침묵 중에는 시전하지 않습니다(엔진의 forced는 기절을 건너뛰므로 여기서 먼저 봅니다).
 */
import type { Stats, CombatEvent } from '../types';
import { actTurn, strike, fighterSpeed, type Fighter } from './combat';
import { normalizeStats } from './stats';
import { UNITS, TRAITS, EXPEDITION, BASE_BY_COST, DEFENSE_BY_COST, unitById, itemById, type UnitDef, type TraitDef, type Role } from '../data/expedition';
import { STATUS_TUNING } from '../data/balance';

export type Placed = { unit: string; star: 1 | 2 | 3; row: 'front' | 'back'; item?: string };
export type ActiveTrait = { trait: TraitDef; count: number; tier: number };
export type UnitFighter = Fighter & { placed: Placed; def: UnitDef; side: 'a' | 'b'; revived?: boolean; maxHp: number; /** 마나(0~100). */ charge: number; manaGain: number; /** 6단계 가시 갑옷: 받은 피해 비례 반격. */ reflect?: number };

/** 보드의 특성 집계: 같은 유닛은 한 번만 셉니다(TFT 규칙). tier는 닿은 단계 번호(0 = 없음). */
export function activeTraits(board: Placed[]): ActiveTrait[] {
    const seen = new Set<string>(), counts = new Map<string, number>();
    for (const p of board) {
        if (seen.has(p.unit)) continue;
        seen.add(p.unit);
        const def = unitById(p.unit); if (!def) continue;
        for (const key of [def.origin, ...def.roles, ...(def.special || [])]) counts.set(key, (counts.get(key) || 0) + 1);
    }
    return TRAITS.map(trait => { const count = counts.get(trait.id) || 0; let tier = 0; trait.tiers.forEach((t, i) => { if (count >= t.count) tier = i + 1; }); return { trait, count, tier }; }).filter(x => x.count > 0);
}
/** 유닛 하나의 기본 능력치(★ 배율 · 역할 배율 포함, 시너지 전). */
export function unitBaseStats(def: UnitDef, star: 1 | 2 | 3) {
    const base = BASE_BY_COST[def.cost], s = EXPEDITION.star[star];
    const guard = def.roles.includes('guard'), arcane = def.roles.includes('arcane'), soft = def.roles.some(r => r === 'control' || r === 'plague' || r === 'wraith');
    const hp = Math.round(base.hp * s * (guard ? 1.4 : 1)), power = Math.round(base.attack * s * (guard ? .7 : soft ? .85 : 1));
    const defense = Math.round(DEFENSE_BY_COST[def.cost] * (guard ? 1.5 : 1) * (1 + (star - 1) * .25));
    return { hp, attack: arcane ? Math.round(power * .5) : power, magic: arcane ? power : Math.round(power * .5), defense, resist: defense, speed: 10 + (def.roles.includes('charge') ? 1 : 0) };
}
function tierFlags(active: ActiveTrait[]) { const flags = new Set<string>(); for (const a of active) if (a.tier) for (const t of a.trait.tiers.slice(0, a.tier)) for (const f of t.flags || []) flags.add(f); return flags; }
/** 보드를 전투 유닛으로 만듭니다(시너지 적용). */
export function buildSide(board: Placed[], side: 'a' | 'b'): { units: UnitFighter[]; active: ActiveTrait[]; flags: Set<string> } {
    const active = activeTraits(board), flags = tierFlags(active);
    const units = board.map(placed => {
        const def = unitById(placed.unit)!, base = unitBaseStats(def, placed.star);
        const stats: Record<string, number> = { ...base }, mult = { hp: 1, attack: 1, magic: 1 };
        let damageTaken = 0;
        const isBoss = !!def.special?.includes('boss');
        for (const a of active) {
            if (!a.tier) continue;
            const t = a.trait.tiers[a.tier - 1];
            if (t.only === 'guard' && !def.roles.includes('guard')) continue;
            if (t.only === 'boss' && !isBoss) continue;
            if (t.only === 'backline' && placed.row !== 'back') continue;
            for (const k in t.mult || {}) mult[k as keyof typeof mult] *= t.mult![k as keyof typeof mult]!;
            for (const k in t.bonus || {}) stats[k] = (stats[k] || 0) + (t.bonus as Record<string, number>)[k];
            if (t.damageTaken) damageTaken = Math.max(damageTaken, t.damageTaken);
        }
        if (flags.has('backline15') && placed.row === 'back') damageTaken = Math.max(damageTaken, .15);
        // 6단계 아이템: 시너지 뒤에 같은 방식으로 더합니다(받는 피해 감소는 큰 쪽 하나가 아니라 곱으로 겹침).
        const item = placed.item ? itemById(placed.item) : undefined;
        if (item) {
            for (const k in item.mult || {}) mult[k as keyof typeof mult] *= item.mult![k as keyof typeof mult]!;
            for (const k in item.bonus || {}) stats[k] = (stats[k] || 0) + (item.bonus as Record<string, number>)[k];
            if (item.damageTaken) damageTaken = 1 - (1 - damageTaken) * (1 - item.damageTaken);
        }
        stats.hp = Math.round(stats.hp * mult.hp); stats.attack = Math.round(stats.attack * mult.attack); stats.magic = Math.round(stats.magic * mult.magic);
        const combat = normalizeStats(stats as Stats);
        const charge = Math.min(EXPEDITION.manaCast, (flags.has('startMana100') ? EXPEDITION.manaCast : flags.has('startMana50') ? EXPEDITION.manaCast / 2 : 0) + (item?.startMana || 0));
        const f: UnitFighter = { name: `${def.name}${placed.star > 1 ? `★${placed.star}` : ''}${item ? `[${item.name}]` : ''}`, foeId: def.monster, stats: combat, hp: combat.hp, maxHp: combat.hp, skills: [], cooldowns: {}, stun: 0, effects: {}, mana: 0, ...(def.roles.includes('arcane') ? { magicBasic: true } : {}), damageTaken: damageTaken || undefined, placed, def, side, charge, manaGain: flags.has('manaBoost') ? 1.25 : 1, ...(item?.reflect ? { reflect: item.reflect } : {}) };
        return f;
    });
    return { units, active, flags };
}
export type BattleResult = { winner: 'a' | 'b' | 'draw'; turns: number; hpLeft: { a: number; b: number }; log: string[]; events: CombatEvent[] };
/** 대상: 살아 있는 적 앞줄 중 무작위, 앞줄이 없으면 뒷줄. */
function pickTarget(enemies: UnitFighter[], rng: () => number) {
    const alive = enemies.filter(u => u.hp > 0); if (!alive.length) return null;
    const front = alive.filter(u => u.placed.row === 'front'), pool = front.length ? front : alive;
    return pool[Math.floor(rng() * pool.length)];
}
/** N대N 전투. 매 턴 전체 유닛을 속도 순으로 한 번씩 행동시키고, 한쪽이 전멸하거나 최대 턴에 닿으면 끝(남은 체력 비율로 판정). */
export function battle(boardA: Placed[], boardB: Placed[], rng: () => number, maxTurns = EXPEDITION.maxTurns): BattleResult {
    const A = buildSide(boardA, 'a'), B = buildSide(boardB, 'b');
    const log: string[] = [], events: CombatEvent[] = [];
    // 전투 시작 효과: 바다 · 용 4 가속 3턴(엔진 buffs.haste), 보스 4 포효(적 전체 약화 2턴).
    for (const [mine, theirs] of [[A, B], [B, A]] as const) {
        if (mine.flags.has('haste')) for (const u of mine.units) (u.effects ??= {}).buffs = { ...(u.effects.buffs || {}), haste: { turns: 3, name: '가속', speedMultiplier: 1 + STATUS_TUNING.hasteMultiplier } };
        if (mine.flags.has('roar')) { for (const u of theirs.units) (u.effects ??= {}).weaken = Math.max(u.effects.weaken || 0, 2); log.push(`전투 시작 · ${mine.units.find(u => u.def.special?.includes('boss'))?.name || '보스'} 포효 · 적 전체 약화 2턴`); }
    }
    const alive = (side: UnitFighter[]) => side.some(u => u.hp > 0);
    let turns = 0;
    while (alive(A.units) && alive(B.units) && turns < maxTurns) {
        turns++;
        const order = [...A.units, ...B.units].filter(u => u.hp > 0).sort((x, y) => fighterSpeed(y) - fighterSpeed(x) || (turns % 2 ? (x.side === 'a' ? -1 : 1) : (x.side === 'a' ? 1 : -1)));
        for (const u of order) {
            if (u.hp <= 0) continue;
            const foes = u.side === 'a' ? B.units : A.units, allies = u.side === 'a' ? A.units : B.units, mine = u.side === 'a' ? A : B;
            const target = pickTarget(foes, rng); if (!target) break;
            // 초원 4: 턴마다 최대 체력 4% 재생.
            if (mine.flags.has('regen') && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * .04));
            const before = target.hp, selfBefore = u.hp;
            const onAction = (text: string, ev: CombatEvent) => { log.push(`${turns}턴 · ${text}`); events.push(ev); };
            const canCast = u.charge >= EXPEDITION.manaCast && u.stun <= 0 && !((u.effects?.silence || 0) > 0);
            if (canCast) { u.charge = 0; const ev: CombatEvent[] = []; const text = strike(u, target, rng, ev, false, false, { id: u.def.skill, index: 0, count: 1 }); onAction(`${text} · 마나 시전`, ev[0]); }
            else { actTurn(u, target, rng, onAction); if (u.stun <= 0) u.charge = Math.min(EXPEDITION.manaCast, u.charge + EXPEDITION.manaPerAttack * u.manaGain); }
            const dealt = Math.max(0, before - target.hp);
            if (dealt > 0) {
                target.charge = Math.min(EXPEDITION.manaCast, target.charge + EXPEDITION.manaPerHit * target.manaGain);
                // 황야 4: 받은 피해의 15%를 공격자에게 되돌립니다.
                const theirs = target.side === 'a' ? A : B;
                const reflectRate = (theirs.flags.has('reflect') ? .25 : 0) + (target.reflect || 0);
                if (reflectRate > 0 && target.hp > 0 && u.hp > 0) { const back = Math.round(dealt * reflectRate); u.hp = Math.max(0, u.hp - back); if (back > 0) log.push(`${turns}턴 · ${target.name} 반격 ${back}`); }
            }
            if (u.hp < selfBefore) u.charge = Math.min(EXPEDITION.manaCast, u.charge + EXPEDITION.manaPerHit * u.manaGain);
            // 지하: 처치마다 아군 전체 주는 피해 +5%(전투 안 누적).
            if (before > 0 && target.hp <= 0) {
                if (mine.flags.has('killStack')) for (const al of allies) al.damageDealt = (al.damageDealt || 0) + .05;
                // 역병 4: 쓰러진 적의 중독 · 화상이 살아 있는 적 하나에게 옮겨 붙습니다(중첩 · 남은 턴 그대로).
                if (mine.flags.has('spread')) { const fx = target.effects || {}, next = pickTarget(foes, rng); if (next && (fx.poison || fx.burn)) { next.effects ??= {}; if (fx.poison && !next.effects.poison) next.effects.poison = { ...fx.poison }; if (fx.burn && !next.effects.burn) next.effects.burn = { ...fx.burn }; log.push(`${turns}턴 · ${target.name}의 역병이 ${next.name}에게 전파`); } }
                // 망령 4: 쓰러진 망령이 전투당 1회 체력 30%로 부활.
                const theirs = target.side === 'a' ? A : B;
                if (theirs.flags.has('revive') && target.def.roles.includes('wraith') && !target.revived) { target.revived = true; target.hp = Math.round(target.maxHp * .3); target.effects = {}; target.stun = 0; log.push(`${turns}턴 · ${target.name} 부활(체력 30%)`); }
            }
            if (!alive(A.units) || !alive(B.units)) break;
        }
    }
    const ratio = (side: UnitFighter[]) => side.reduce((n, u) => n + Math.max(0, u.hp), 0) / Math.max(1, side.reduce((n, u) => n + u.maxHp, 0));
    const ra = ratio(A.units), rb = ratio(B.units);
    const winner = !alive(B.units) && alive(A.units) ? 'a' : !alive(A.units) && alive(B.units) ? 'b' : ra > rb + .05 ? 'a' : rb > ra + .05 ? 'b' : 'draw';
    return { winner, turns, hpLeft: { a: ra, b: rb }, log, events };
}
/** 상점 5장: 판 레벨의 비용 비중대로 뽑습니다(풀 소진은 2단계). */
export function rollShop(level: number, rng: () => number, size = EXPEDITION.shopSize): string[] {
    const odds = EXPEDITION.shopOdds[Math.min(EXPEDITION.shopOdds.length - 1, Math.max(2, level))];
    const out: string[] = [];
    for (let i = 0; i < size; i++) {
        let r = rng(), cost = 1; for (let c = 0; c < odds.length; c++) { r -= odds[c]; if (r <= 0) { cost = c + 1; break; } }
        const pool = UNITS.filter(u => u.cost === cost); out.push(pool[Math.floor(rng() * pool.length)].id);
    }
    return out;
}
/** 라운드별 PvE 웨이브: 비용 예산 안에서 같은 풀의 유닛을 고르고, 뒤 라운드일수록 ★이 오릅니다. 수호 · 돌격은 앞줄, 나머지는 뒷줄. */
export const WAVE_BUDGET = [0, 2, 5, 8, 12, 16, 21, 27, 38];
export function rollWave(round: number, rng: () => number): Placed[] {
    let budget = WAVE_BUDGET[Math.min(WAVE_BUDGET.length - 1, round)];
    const maxCost = round <= 2 ? 1 : round <= 4 ? 2 : round <= 6 ? 3 : round <= 7 ? 4 : 5, slots = Math.min(8, 1 + round);
    const out: Placed[] = [];
    while (out.length < slots && budget > 0) {
        const pool = UNITS.filter(u => u.cost <= Math.min(maxCost, budget)); if (!pool.length) break;
        const def = pool[Math.floor(rng() * pool.length)];
        let star: 1 | 2 | 3 = round >= 8 && rng() < .2 ? 3 : round >= 6 && rng() < .45 ? 2 : round >= 4 && rng() < .25 ? 2 : round >= 3 && rng() < .1 ? 2 : 1;
        const starCost = (st: number) => def.cost * (st === 3 ? 4 : st === 2 ? 2 : 1);
        // 예산을 넘기면 ★을 내립니다(★3 = 비용 × 4, ★2 = × 2).
        while (star > 1 && starCost(star) > budget) star--;
        budget -= starCost(star);
        out.push({ unit: def.id, star, row: frontRole(def) ? 'front' : 'back' });
    }
    return out;
}
export const frontRole = (def: UnitDef) => def.roles.some((r: Role) => r === 'guard' || r === 'charge');
