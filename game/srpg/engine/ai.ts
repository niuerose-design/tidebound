/**
 * 적 AI(브리프 5절 스탠스). enemyStep은 아직 행동하지 않은 적(또는 NPC) 한 명을 골라 행동시키고 결과를 돌려줍니다.
 * UI는 null이 돌아올 때까지 반복 호출하며 한 행동씩 연출합니다.
 */
import type { Battle, BattleUnit, ChapterDef, CombatResult, Pos, Priority, Stance } from './types';
import { moveRange, pathTo, cellsInRange, key, unkey, hostile, occupancy } from './grid';
import { manhattan, inBounds, moveCost, setTile } from './terrain';
import { forecast, resolveCombat, unitAt, attackRange } from './combat';
import { classDef } from '../data/classes';
import { itemDef } from '../data/items';
import { canWield, weaponOf } from './unit';
import { checkEnd, clone } from './battle';
export interface AiAction { uid: string; kind: 'move' | 'attack' | 'wait' | 'loot' | 'vanish'; path: Pos[]; target?: string; combat?: CombatResult; text?: string }
const effectiveStance = (b: Battle, u: BattleUnit): Stance => {
    if (u.boss) return u.hp * 2 <= u.stats.hp || u.stance === 'aggressive' ? 'aggressive' : 'hold';
    if (u.groupId && b.triggered.includes(u.groupId)) return 'aggressive';
    if (u.stance === 'charge_on_range') return 'hold';
    return u.stance;
};
/** 돌격 전환: 그룹원 누구든 trigger_range 안에 플레이어가 들어오면 그룹 전체 전환. trigger_range는 배치의 그룹에 있어 chapter 쪽 캐시로 읽습니다. */
export const TRIGGER_RANGE: Record<string, number> = {};
function updateTriggers(b: Battle) {
    const players = b.units.filter(u => u.hp > 0 && u.side === 'player');
    for (const u of b.units) {
        if (u.hp <= 0 || u.side !== 'enemy' || !u.groupId || u.stance !== 'charge_on_range' || b.triggered.includes(u.groupId)) continue;
        const tr = TRIGGER_RANGE[`${b.chapterId}:${u.groupId}`] ?? 4;
        if (players.some(p => manhattan(p, u) <= tr)) { b.triggered.push(u.groupId); b.log.push({ turn: b.turn, kind: 'info', text: `적 부대가 움직이기 시작했다.` }); }
    }
}
const nextActor = (b: Battle) => b.units.find(u => u.hp > 0 && u.side !== 'player' && !u.acted);
/** 공격 후보 점수. */
function score(b: Battle, u: BattleUnit, from: Pos, t: BattleUnit, priority: Priority[] | null): number {
    const f = forecast(b, u, t, from);
    const dealt = f.atk.dmg * f.atk.hit / 100 * (f.atk.doubles ? 2 : 1);
    const taken = f.def.dmg === null ? 0 : f.def.dmg * (f.def.hit ?? 0) / 100 * (f.def.doubles ? 2 : 1);
    let s = dealt * 2 - taken + (f.atk.dmg * (f.atk.doubles ? 2 : 1) >= t.hp ? 40 * f.atk.hit / 100 : 0) + f.atk.crit / 5;
    if (f.def.dmg === null) s += 8; // 반격 없음
    if (taken >= u.hp) s -= 30;
    const tCls = classDef(t.classId);
    for (const p of priority ?? []) {
        if (p === 'healer' && weaponOf(t)?.weapon?.type === 'staff') s += 25;
        if (p === 'low_hp') s += (1 - t.hp / t.stats.hp) * 30;
        if (p === 'low_def') s += Math.max(0, 15 - t.stats.def) * 2;
        if (p === 'low_res') s += Math.max(0, 15 - t.stats.res) * 2;
        if (p === 'lord' && t.defId && tCls.id.startsWith('cls_tide')) s += 40;
        if (p === 'nearest') s -= manhattan(u, t);
        if (p === 'highest_damage') s += dealt;
    }
    return s;
}
/** 이동 범위 안의 모든 칸 × 모든 무기 × 모든 대상 중 최고 점수. */
function bestAttack(b: Battle, u: BattleUnit, stoppable: Set<string>, allowMove: boolean): { pos: Pos; target: BattleUnit; weapon: number; score: number } | null {
    const cls = classDef(u.classId);
    const foes = b.units.filter(o => o.hp > 0 && hostile(o.side, u.side) && o.x >= 0);
    if (!foes.length) return null;
    let best: { pos: Pos; target: BattleUnit; weapon: number; score: number } | null = null;
    const positions = allowMove ? [...stoppable].map(unkey) : [[u.x, u.y] as Pos];
    const origEquip = u.equipped;
    u.items.forEach((it, wi) => {
        const d = itemDef(it.id);
        if (!d.weapon || d.weapon.type === 'staff' || !canWield(cls, d)) return;
        u.equipped = wi;
        const r = d.weapon.range;
        for (const pos of positions) {
            for (const t of foes) {
                const dist = manhattan(pos, t);
                if (dist < r[0] || dist > r[1]) continue;
                const s = score(b, u, pos, t, u.priority) + (allowMove ? terrainBonus(b, pos) : 0);
                if (!best || s > best.score) best = { pos, target: t, weapon: wi, score: s };
            }
        }
    });
    u.equipped = origEquip;
    return best;
}
const terrainBonus = (b: Battle, p: Pos) => { const t = b.tiles[p[1]]?.[p[0]]; return t === 'F' || t === 'S' || t === 'T' || t === 'M' ? 4 : t === 'R' ? 2 : 0; };
/** 전체 맵 다익스트라(이동력 무시). 적대 유닛이 있는 칸은 막힘. */
function fullDistance(b: Battle, u: BattleUnit): { dist: Map<string, number>; prev: Map<string, string> } {
    const occ = occupancy(b.units);
    const dist = new Map<string, number>([[key(u.x, u.y), 0]]);
    const prev = new Map<string, string>();
    const open: [number, number, number][] = [[0, u.x, u.y]];
    while (open.length) {
        open.sort((a, c) => a[0] - c[0]);
        const [d, x, y] = open.shift()!;
        if (d > (dist.get(key(x, y)) ?? Infinity)) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (!inBounds(b.tiles, nx, ny)) continue;
            const c = moveCost(b.tiles, nx, ny, u.moveType);
            if (!c) continue;
            const o = occ.get(key(nx, ny));
            if (o && o.uid !== u.uid && hostile(o.side, u.side)) continue;
            const nd = d + c;
            if (nd < (dist.get(key(nx, ny)) ?? Infinity)) { dist.set(key(nx, ny), nd); prev.set(key(nx, ny), key(x, y)); open.push([nd, nx, ny]); }
        }
    }
    return { dist, prev };
}
/** 목표 칸들 중 가장 가까운 곳으로 가는 경로에서, 이번 턴에 멈출 수 있는 가장 먼 칸. */
function stepToward(b: Battle, u: BattleUnit, goals: Pos[], stoppable: Set<string>): Pos | null {
    const { dist, prev } = fullDistance(b, u);
    let bestGoal: Pos | null = null, bestD = Infinity;
    for (const g of goals) { const d = dist.get(key(g[0], g[1])); if (d !== undefined && d < bestD) { bestD = d; bestGoal = g; } }
    if (!bestGoal) return null;
    const path = pathTo(prev, [u.x, u.y], bestGoal);
    for (let i = path.length - 1; i >= 1; i--) { const p = path[i]; if (stoppable.has(key(p[0], p[1]))) return p; }
    return null;
}
/** 플레이어 유닛을 공격할 수 있는 칸들(전부). */
function approachGoals(b: Battle, u: BattleUnit): Pos[] {
    const r = attackRange(u)[1] ? attackRange(u) : [1, 1] as [number, number];
    const out: Pos[] = [];
    const occ = occupancy(b.units);
    for (const t of b.units) {
        if (t.hp <= 0 || !hostile(t.side, u.side) || t.x < 0) continue;
        for (const c of cellsInRange(b.tiles, t.x, t.y, r)) if (moveCost(b.tiles, c[0], c[1], u.moveType) && !occ.has(key(c[0], c[1]))) out.push(c);
    }
    return out;
}
function doAttack(b: Battle, u: BattleUnit, plan: { pos: Pos; target: BattleUnit; weapon: number }, ch: ChapterDef): AiAction {
    const { prev } = moveRange(b.tiles, u, b.units);
    const path = pathTo(prev, [u.x, u.y], plan.pos);
    u.x = plan.pos[0]; u.y = plan.pos[1]; u.equipped = plan.weapon;
    if (plan.target.boss === undefined) { /* no-op */ }
    const combat = resolveCombat(b, u, plan.target);
    for (const o of b.units) if (o.hp <= 0 && o.status === 'alive') { if (o.side === 'player') { o.status = b.mode === 'classic' ? 'dead' : 'retreated'; b.fallen.push(o.uid); b.log.push({ turn: b.turn, kind: 'loss', text: `${o.name}이(가) ${o.status === 'dead' ? '쓰러졌다.' : '물러났다.'}` }); } else o.status = 'dead'; }
    if (combat.drop && combat.killed !== u.uid) { b.loot.push(combat.drop); }
    u.acted = true;
    checkEnd(b, ch);
    return { uid: u.uid, kind: 'attack', path, target: plan.target.uid, combat };
}
function doMove(b: Battle, u: BattleUnit, to: Pos): AiAction {
    const { prev } = moveRange(b.tiles, u, b.units);
    const path = pathTo(prev, [u.x, u.y], to);
    u.x = to[0]; u.y = to[1]; u.acted = true;
    return { uid: u.uid, kind: 'move', path };
}
const edgeCells = (b: Battle, u: BattleUnit): Pos[] => {
    const out: Pos[] = [], h = b.tiles.length, w = b.tiles[0].length;
    for (let x = 0; x < w; x++) for (const y of [0, h - 1]) if (moveCost(b.tiles, x, y, u.moveType)) out.push([x, y]);
    for (let y = 0; y < h; y++) for (const x of [0, w - 1]) if (moveCost(b.tiles, x, y, u.moveType)) out.push([x, y]);
    return out;
};
/** 도적: 민가·상자 → 탈출. */
function fleeAction(b: Battle, u: BattleUnit, stoppable: Set<string>, ch: ChapterDef): AiAction {
    const targets = (u.fleeTargets ?? []).filter(p => !b.used.includes(key(p[0], p[1])) && (b.tiles[p[1]][p[0]] === 'H' || b.tiles[p[1]][p[0]] === 'C'));
    const here = key(u.x, u.y);
    const onTarget = targets.find(p => key(p[0], p[1]) === here);
    if (onTarget) {
        b.used.push(here);
        const ev = ch.map_events.find(e => e.pos[0] === u.x && e.pos[1] === u.y);
        if (b.tiles[u.y][u.x] === 'H') { b.tiles = setTile(b.tiles, u.x, u.y, 'X'); b.log.push({ turn: b.turn, kind: 'event', text: '도적이 민가를 털었다.' }); u.acted = true; return { uid: u.uid, kind: 'loot', path: [], text: '민가가 털렸다' }; }
        b.tiles = setTile(b.tiles, u.x, u.y, '.');
        if (ev?.reward) u.drop = ev.reward; // 쓰러뜨리면 되찾는다
        b.log.push({ turn: b.turn, kind: 'event', text: '도적이 상자를 열었다.' });
        u.acted = true;
        return { uid: u.uid, kind: 'loot', path: [], text: '상자를 털렸다' };
    }
    if (targets.length) {
        const step = stepToward(b, u, targets, stoppable);
        if (step) return doMove(b, u, step);
        u.acted = true; return { uid: u.uid, kind: 'wait', path: [] };
    }
    // 탈출
    u.escaping = true;
    const edges = edgeCells(b, u);
    if (edges.some(e => e[0] === u.x && e[1] === u.y)) { u.hp = 0; u.status = 'dead'; u.acted = true; b.log.push({ turn: b.turn, kind: 'event', text: `${u.name}이(가) 맵 밖으로 달아났다.` }); return { uid: u.uid, kind: 'vanish', path: [] }; }
    const step = stepToward(b, u, edges, stoppable);
    if (step) { const a = doMove(b, u, step); if (edges.some(e => e[0] === step[0] && e[1] === step[1])) { /* 다음 턴에 사라짐 */ } return a; }
    u.acted = true; return { uid: u.uid, kind: 'wait', path: [] };
}
/** 적(또는 NPC) 한 명 행동. 남은 행동자가 없으면 null. */
export function enemyStep(b0: Battle, ch: ChapterDef): { battle: Battle; action: AiAction | null } {
    const b = clone(b0);
    if (b.status !== 'playing') return { battle: b, action: null };
    updateTriggers(b);
    const u = nextActor(b);
    if (!u) return { battle: b, action: null };
    const stance = u.side === 'ally' ? 'hold' : effectiveStance(b, u);
    const { stoppable } = moveRange(b.tiles, u, b.units);
    stoppable.delete(key(u.x, u.y)); stoppable.add(key(u.x, u.y));
    if (stance === 'flee') return { battle: b, action: fleeAction(b, u, stoppable, ch) };
    if (stance === 'hold') {
        const plan = bestAttack(b, u, stoppable, false);
        if (plan) return { battle: b, action: doAttack(b, u, plan, ch) };
        u.acted = true; return { battle: b, action: { uid: u.uid, kind: 'wait', path: [] } };
    }
    if (stance === 'guard') {
        const plan = bestAttack(b, u, stoppable, true);
        if (plan) return { battle: b, action: doAttack(b, u, plan, ch) };
        if (u.home && (u.home[0] !== u.x || u.home[1] !== u.y) && !unitAt(b, u.home[0], u.home[1])) { const step = stepToward(b, u, [u.home], stoppable); if (step) return { battle: b, action: doMove(b, u, step) }; }
        u.acted = true; return { battle: b, action: { uid: u.uid, kind: 'wait', path: [] } };
    }
    // aggressive · target_priority
    const plan = bestAttack(b, u, stoppable, true);
    if (plan) return { battle: b, action: doAttack(b, u, plan, ch) };
    const goals = approachGoals(b, u);
    const step = goals.length ? stepToward(b, u, goals, stoppable) : null;
    if (step && (step[0] !== u.x || step[1] !== u.y)) return { battle: b, action: doMove(b, u, step) };
    u.acted = true; return { battle: b, action: { uid: u.uid, kind: 'wait', path: [] } };
}
