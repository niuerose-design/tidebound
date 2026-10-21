import type { Battle, BattleUnit, CombatResult, Forecast, ItemDef, Strike, WeaponType, Pos } from './types';
import { terrainAt, manhattan, inBounds } from './terrain';
import { classDef } from '../data/classes';
import { weaponOf, attackWeapon, isStaff, gainExp, effectiveLevel } from './unit';
import { roll } from './rng';
import { itemDef } from '../data/items';
import { hostile, key } from './grid';
/** 무기 상성: 1이면 a가 b에 우세. 물리 검>도끼>창>검, 마법 불>바람>번개>불. */
export function triangle(a: WeaponType | null, b: WeaponType | null): -1 | 0 | 1 {
    if (!a || !b) return 0;
    const beats: Partial<Record<WeaponType, WeaponType>> = { sword: 'axe', axe: 'lance', lance: 'sword', fire: 'wind', wind: 'thunder', thunder: 'fire' };
    if (beats[a] === b) return 1;
    if (beats[b] === a) return -1;
    return 0;
}
export const unitById = (b: Battle, uid: string): BattleUnit => { const u = b.units.find(x => x.uid === uid); if (!u) throw Error(`no unit ${uid}`); return u; };
export const unitAt = (b: Battle, x: number, y: number): BattleUnit | undefined => b.units.find(u => u.hp > 0 && u.x === x && u.y === y);
/** 장착 무기의 사거리. 무기가 없으면 [0,0]. */
export const attackRange = (u: BattleUnit): [number, number] => attackWeapon(u)?.weapon?.range ?? [0, 0];
export const staffRange = (u: BattleUnit): [number, number] => { const w = weaponOf(u); return isStaff(w) ? w!.weapon!.range : [0, 0]; };
/** 들고 있는 모든 공격 무기의 합친 사거리(위협 범위 표시용). */
export const allWeaponRange = (u: BattleUnit): [number, number] => {
    const cls = classDef(u.classId);
    let lo = 99, hi = 0;
    for (const it of u.items) { const d = itemDef(it.id); if (!d.weapon || d.weapon.type === 'staff' || !cls.weapons.includes(d.weapon.type)) continue; lo = Math.min(lo, d.weapon.range[0]); hi = Math.max(hi, d.weapon.range[1]); }
    return hi ? [lo, hi] : [0, 0];
};
const adjacentAllies = (b: Battle, u: BattleUnit) => b.units.filter(o => o.hp > 0 && o.uid !== u.uid && !hostile(o.side, u.side) && manhattan(o, u) === 1).length;
const nearWater = (b: Battle, u: BattleUnit) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inBounds(b.tiles, u.x + dx, u.y + dy) && b.tiles[u.y + dy][u.x + dx] === '~');
const skills = (u: BattleUnit) => [classDef(u.classId).skill, u.skill];
/** 전투에 쓰는 보정치(지형·스킬). */
export function battleMods(b: Battle, u: BattleUnit, target: BattleUnit, attacking: boolean) {
    const t = terrainAt(b.tiles, u.x, u.y);
    const sk = skills(u);
    let str = u.stats.str, def = u.stats.def + t.def, hit = 0, avoid = t.avoid, crit = 0, might = 0;
    const tCls = classDef(target.classId);
    if (sk.includes('low_hp_rage') && u.hp * 2 <= u.stats.hp) str += 3;
    if (sk.includes('forest_guard') && !attacking && (t.ch === 'F' || t.ch === 'R')) def += 2;
    if (sk.includes('water_edge') && nearWater(b, u)) avoid += 15;
    if (sk.includes('shell_wall')) def += Math.min(3, adjacentAllies(b, u));
    if (sk.includes('anti_flier') && tCls.move_type === 'flying') might += 3;
    if (sk.includes('bridge_fury') && attacking && t.ch === '=') crit += 15;
    if (sk.includes('mountain_eye') && (t.ch === 'M' || t.ch === '^')) hit += 20;
    if (sk.includes('pack_hunter') && attacking) hit += 10 * b.units.filter(o => o.hp > 0 && o.uid !== u.uid && !hostile(o.side, u.side) && manhattan(o, target) === 1).length;
    return { str, def, res: u.stats.res, hit, avoid, crit, might, terrain: t };
}
const firstStrikeOf = (u: BattleUnit) => skills(u).includes('first_strike');
/** 한쪽 공격 수치. 반격 불가(사거리 밖·무기 없음)면 null. */
function side(b: Battle, a: BattleUnit, d: BattleUnit, attacking: boolean, dist: number) {
    const w = attackWeapon(a);
    if (!w) return null;
    const r = w.weapon!.range;
    if (dist < r[0] || dist > r[1]) return null;
    const ma = battleMods(b, a, d, attacking), md = battleMods(b, d, a, !attacking);
    const wd = attackWeapon(d);
    const tri = triangle(w.weapon!.type, wd?.weapon?.type ?? null);
    const dCls = classDef(d.classId);
    const effective = w.weapon!.effective.includes(dCls.move_type);
    const might = w.weapon!.might * (effective ? 2 : 1) + tri + ma.might;
    const atk = (w.weapon!.magic ? a.stats.mag : ma.str) + might;
    const dmg = Math.max(0, atk - (w.weapon!.magic ? md.res : md.def));
    const hit = Math.max(0, Math.min(100, w.weapon!.hit + a.stats.skl * 2 + Math.floor(a.stats.lck / 2) + tri * 15 + ma.hit - (d.stats.spd * 2 + d.stats.lck + md.avoid)));
    const crit = Math.max(0, Math.min(100, w.weapon!.crit + Math.floor(a.stats.skl / 2) + ma.crit - d.stats.lck));
    return { dmg, hit, crit, doubles: a.stats.spd - d.stats.spd >= 4, tri, weapon: w };
}
export function forecast(b: Battle, a: BattleUnit, d: BattleUnit, from?: Pos): Forecast {
    const ax = from ? from[0] : a.x, ay = from ? from[1] : a.y;
    const moved = from ? { ...a, x: ax, y: ay } : a;
    const dist = manhattan(moved, d);
    const A = side(b, moved, d, true, dist)!;
    const D = side(b, d, moved, false, dist);
    return { atk: { hp: a.hp, dmg: A.dmg, hit: A.hit, crit: A.crit, doubles: A.doubles }, def: { hp: d.hp, dmg: D?.dmg ?? null, hit: D?.hit ?? null, crit: D?.crit ?? null, doubles: !!D?.doubles }, triangle: A.tri };
}
export const healAmount = (u: BattleUnit, staff: ItemDef) => u.stats.mag + (staff.weapon!.heal ?? 0);
const spendWeapon = (u: BattleUnit) => { const it = u.items[u.equipped]; if (!it) return; it.uses -= 1; if (it.uses <= 0) { u.items.splice(u.equipped, 1); u.equipped = -1; const cls = classDef(u.classId); u.equipped = u.items.findIndex(i => { const d = itemDef(i.id); return !!d.weapon && cls.weapons.includes(d.weapon.type); }); } };
const expFor = (u: BattleUnit, e: BattleUnit, kill: boolean) => {
    if (u.side !== 'player') return 0;
    const diff = effectiveLevel(e) - effectiveLevel(u);
    let exp = Math.max(1, Math.min(20, 10 + diff * 2));
    if (kill) exp += Math.max(5, Math.min(45, 20 + diff * 3)) + (e.boss ? 30 : 0);
    return exp;
};
/** 경험치를 더하고 레벨업 기록을 결과에 넣습니다(플레이어만). */
export function applyExp(b: Battle, u: BattleUnit, amount: number, out: CombatResult['levelUps']) {
    if (u.side !== 'player' || amount <= 0) return;
    const before = u.level;
    const ups = gainExp(u, amount, b);
    u.gained += amount;
    for (const g of ups) {
        const line = `${u.name}의 레벨이 ${u.level}이 되었다.`;
        out.push({ uid: u.uid, name: u.name, gains: g, line });
        b.log.push({ turn: b.turn, kind: 'levelup', text: `${u.name} Lv.${before} → ${u.level}` });
    }
    // 최대 체력이 오르면 그만큼 현재 체력도 오릅니다.
    if (ups.some(g => g.hp)) u.hp = Math.min(u.stats.hp, u.hp + ups.reduce((s, g) => s + (g.hp ?? 0), 0));
}
/** 전투 해결. attacker가 defender를 공격(사거리는 호출자가 보장). 상태를 직접 바꾸고 결과를 돌려줍니다. */
export function resolveCombat(b: Battle, attacker: BattleUnit, defender: BattleUnit): CombatResult {
    const dist = manhattan(attacker, defender);
    const A = side(b, attacker, defender, true, dist)!;
    const D = side(b, defender, attacker, false, dist);
    const strikes: Strike[] = [];
    const result: CombatResult = { strikes, attacker: attacker.uid, defender: defender.uid, expA: 0, expD: 0, killed: null, levelUps: [] };
    const order: ('a' | 'd')[] = [];
    if (D && firstStrikeOf(defender) && !firstStrikeOf(attacker)) order.push('d', 'a'); else order.push('a', ...(D ? ['d' as const] : []));
    if (A.doubles) order.push('a'); else if (D?.doubles) order.push('d');
    let dealtA = false, dealtD = false;
    for (const who of order) {
        if (attacker.hp <= 0 || defender.hp <= 0) break;
        const [src, dst, s] = who === 'a' ? [attacker, defender, A] : [defender, attacker, D!];
        const hit = roll(b) < s.hit;
        const crit = hit && roll(b) < s.crit;
        const dmg = hit ? s.dmg * (crit ? 3 : 1) : 0;
        dst.hp = Math.max(0, dst.hp - dmg);
        strikes.push({ attacker: src.uid, defender: dst.uid, hit, crit, dmg });
        spendWeapon(src);
        if (who === 'a') dealtA = true; else dealtD = true;
        b.log.push({ turn: b.turn, kind: 'combat', text: hit ? `${src.name} → ${dst.name} ${crit ? '필살 ' : ''}${dmg} 피해${dst.hp <= 0 ? ' (격파)' : ''}` : `${src.name}의 공격이 빗나갔다.` });
    }
    if (defender.hp <= 0) { result.killed = defender.uid; attacker.kills += 1; result.drop = defender.drop ?? null; }
    else if (attacker.hp <= 0) { result.killed = attacker.uid; defender.kills += 1; result.drop = attacker.drop ?? null; }
    if (dealtA) result.expA = expFor(attacker, defender, defender.hp <= 0);
    if (dealtD) result.expD = expFor(defender, attacker, attacker.hp <= 0);
    if (attacker.hp > 0) applyExp(b, attacker, result.expA, result.levelUps);
    if (defender.hp > 0) applyExp(b, defender, result.expD, result.levelUps);
    b.lastCombat = result;
    return result;
}
/** 지팡이 치유. */
export function resolveHeal(b: Battle, healer: BattleUnit, target: BattleUnit): CombatResult {
    const staff = weaponOf(healer)!;
    const amount = Math.min(healAmount(healer, staff), target.stats.hp - target.hp);
    target.hp += amount;
    spendWeapon(healer);
    const result: CombatResult = { strikes: [{ attacker: healer.uid, defender: target.uid, hit: true, crit: false, dmg: amount, heal: true }], attacker: healer.uid, defender: target.uid, expA: 12, expD: 0, killed: null, levelUps: [] };
    b.log.push({ turn: b.turn, kind: 'combat', text: `${healer.name}이(가) ${target.name}의 체력을 ${amount} 회복했다.` });
    applyExp(b, healer, 12, result.levelUps);
    b.lastCombat = result;
    return result;
}
export const posKey = (u: { x: number; y: number }) => key(u.x, u.y);
