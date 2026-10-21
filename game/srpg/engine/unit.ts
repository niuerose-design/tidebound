import type { Stats, Stat, Unit, UnitDef, ItemInstance, ClassDef, BattleUnit, Side, ItemDef, WeaponType } from './types';
import { STATS } from './types';
import { classDef } from '../data/classes';
import { itemDef } from '../data/items';
import { roll } from './rng';
export const clampStats = (s: Stats, caps: Stats): Stats => { const o = { ...s }; for (const k of STATS) o[k] = Math.max(0, Math.min(caps[k], o[k])); return o; };
export const addStats = (a: Stats, b: Partial<Stats>): Stats => { const o = { ...a }; for (const k of STATS) o[k] += b[k] ?? 0; return o; };
/** 상급 클래스는 레벨 비교에 +20(경험치 계산용). */
export const effectiveLevel = (u: { level: number; classId: string }) => u.level + (classDef(u.classId).rank === 'advanced' ? 20 : 0);
export const MAX_LEVEL = 20;
export const EXP_PER_LEVEL = 100;
/** 평균 성장으로 레벨을 올린 능력치(적·합류 유닛 생성용. 난수 없음). */
export function averageLevel(base: Stats, growths: Stats, levels: number, caps: Stats): Stats {
    const o = { ...base };
    for (const k of STATS) o[k] += Math.floor((growths[k] * levels + 50) / 100);
    return clampStats(o, caps);
}
export const unitGrowths = (def: UnitDef, cls: ClassDef): Stats => { const g = { ...def.growths }; for (const k of STATS) g[k] = Math.max(0, Math.min(100, g[k] + cls.growth_mods[k])); return g; };
/** 적 유닛의 성장률: 클래스 보정 + 기본 35%. */
export const enemyGrowths = (cls: ClassDef): Stats => { const g = {} as Stats; for (const k of STATS) g[k] = Math.max(0, Math.min(100, 35 + cls.growth_mods[k] + (k === 'hp' ? 20 : 0))); return g; };
export const makeItem = (id: string, n: number): ItemInstance => ({ id, uses: itemDef(id).uses, n });
export const canWield = (cls: ClassDef, item: ItemDef) => !!item.weapon && cls.weapons.includes(item.weapon.type);
/** 플레이어 유닛 생성(합류 시). */
export function createPlayerUnit(def: UnitDef, seq: { uid: number; item: number }, level = def.join_level): Unit {
    const cls = classDef(def.class_id);
    const growths = unitGrowths(def, cls);
    const base = addStats(cls.base_stats, def.base_mods);
    const stats = averageLevel(base, growths, level - 1, cls.caps);
    const items = def.start_items.map(id => makeItem(id, seq.item++));
    const equipped = items.findIndex(i => itemDef(i.id).weapon && canWield(cls, itemDef(i.id)));
    return { uid: `p${seq.uid++}`, defId: def.id, name: def.name, classId: def.class_id, side: 'player', level, exp: 0, stats, growths, items, equipped, status: 'alive', kills: 0, skill: def.personal_skill };
}
/** 적·NPC 생성. */
export function createEnemyUnit(classId: string, level: number, name: string, weapon: string, extraItems: string[], seq: { uid: number; item: number }, side: Side = 'enemy', bonus: Partial<Stats> | null = null): Unit {
    const cls = classDef(classId);
    const growths = enemyGrowths(cls);
    const stats = addStats(averageLevel(cls.base_stats, growths, level - 1, cls.caps), bonus ?? {});
    const items = [weapon, ...extraItems].map(id => makeItem(id, seq.item++));
    const equipped = items.findIndex(i => itemDef(i.id).weapon && canWield(cls, itemDef(i.id)));
    return { uid: `${side === 'enemy' ? 'e' : 'n'}${seq.uid++}`, defId: null, name, classId, side, level, exp: 0, stats, growths, items, equipped, status: 'alive', kills: 0, skill: 'none' };
}
/** 레벨업 한 번. growths% 확률로 각 능력치 +1(클래스 상한). 하나도 오르지 않으면 한 번 더 굴립니다. */
export function levelUp(u: Unit, ctx: { rng: number }): Partial<Stats> {
    const caps = classDef(u.classId).caps;
    const gains: Partial<Stats> = {};
    for (let attempt = 0; attempt < 2; attempt++) {
        for (const k of STATS) { if (u.stats[k] < caps[k] && roll(ctx) < u.growths[k]) { gains[k] = (gains[k] ?? 0) + 1; } }
        if (Object.keys(gains).length) break;
    }
    for (const k of Object.keys(gains) as Stat[]) u.stats[k] += gains[k]!;
    u.level += 1;
    return gains;
}
/** 경험치를 더하고 레벨업을 처리. 돌아온 배열은 레벨업마다의 상승치. */
export function gainExp(u: Unit, amount: number, ctx: { rng: number }): Partial<Stats>[] {
    const ups: Partial<Stats>[] = [];
    if (u.level >= MAX_LEVEL) return ups;
    u.exp += amount;
    while (u.exp >= EXP_PER_LEVEL && u.level < MAX_LEVEL) { u.exp -= EXP_PER_LEVEL; ups.push(levelUp(u, ctx)); }
    if (u.level >= MAX_LEVEL) u.exp = 0;
    return ups;
}
export const canPromote = (u: Unit) => { const c = classDef(u.classId); return c.rank === 'base' && c.promotes_to.length > 0 && u.level >= 10; };
/** 승급: 클래스가 바뀌고 레벨 1, 능력치에 승급 보너스. 성장률은 클래스 보정 차이만큼 바뀝니다. */
export function promote(u: Unit, toClassId: string): Partial<Stats> {
    const from = classDef(u.classId), to = classDef(toClassId);
    if (!from.promotes_to.includes(toClassId)) throw Error('승급할 수 없는 클래스');
    const bonus = to.promotion_bonus ?? {};
    u.stats = clampStats(addStats(u.stats, bonus), to.caps);
    for (const k of STATS) u.growths[k] = Math.max(0, Math.min(100, u.growths[k] - from.growth_mods[k] + to.growth_mods[k]));
    u.classId = toClassId; u.level = 1; u.exp = 0;
    if (u.equipped >= 0 && !canWield(to, itemDef(u.items[u.equipped].id))) u.equipped = -1;
    if (u.equipped < 0) u.equipped = u.items.findIndex(i => canWield(to, itemDef(i.id)));
    return bonus;
}
export const weaponOf = (u: Unit): ItemDef | null => { const it = u.items[u.equipped]; if (!it) return null; const d = itemDef(it.id); return d.weapon ? d : null; };
export const attackWeapon = (u: Unit): ItemDef | null => { const w = weaponOf(u); return w && w.weapon!.type !== 'staff' ? w : null; };
/** 들 수 있는 무기들 중 첫 번째로 장착(장착 무기가 없을 때). */
export function autoEquip(u: Unit) {
    const cls = classDef(u.classId);
    if (u.equipped >= 0 && u.items[u.equipped] && canWield(cls, itemDef(u.items[u.equipped].id))) return;
    u.equipped = u.items.findIndex(i => canWield(cls, itemDef(i.id)));
}
export const weaponTypeOf = (u: Unit): WeaponType | null => weaponOf(u)?.weapon?.type ?? null;
export const isStaff = (d: ItemDef | null) => !!d?.weapon && d.weapon.type === 'staff';
export const toBattleUnit = (u: Unit, x: number, y: number, extra: Partial<BattleUnit> = {}): BattleUnit => {
    const cls = classDef(u.classId);
    return { ...u, items: u.items.map(i => ({ ...i })), stats: { ...u.stats }, growths: { ...u.growths }, x, y, hp: u.stats.hp, acted: false, groupId: null, stance: 'aggressive', home: [x, y], priority: null, fleeTargets: null, gained: 0, moveType: cls.move_type, move: cls.move, ...extra };
};
