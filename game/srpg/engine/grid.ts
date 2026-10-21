import type { BattleUnit, MoveType, Pos, Side } from './types';
import { inBounds, moveCost } from './terrain';
export const key = (x: number, y: number) => `${x},${y}`;
export const unkey = (k: string): Pos => k.split(',').map(Number) as Pos;
const DIRS: Pos[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/** 적대 관계: 플레이어·아군(NPC)은 한편, 적은 다른 편. */
export const hostile = (a: Side, b: Side) => (a === 'enemy') !== (b === 'enemy');
export type Occupancy = Map<string, BattleUnit>;
export const occupancy = (units: BattleUnit[]): Occupancy => { const m = new Map<string, BattleUnit>(); for (const u of units) if (u.hp > 0) m.set(key(u.x, u.y), u); return m; };
/**
 * 이동 가능 범위(다익스트라). 적 유닛이 있는 칸은 지나갈 수 없고, 아군이 있는 칸은 지나가되 멈출 수 없습니다.
 * 결과: 멈출 수 있는 칸 → 남은 이동력, 그리고 경로 복원을 위한 prev.
 */
export function moveRange(tiles: string[], unit: BattleUnit, units: BattleUnit[], move = classMove(unit), mt: MoveType = unit.moveType): { reach: Map<string, number>; prev: Map<string, string>; stoppable: Set<string> } {
    const occ = occupancy(units);
    const dist = new Map<string, number>([[key(unit.x, unit.y), 0]]);
    const prev = new Map<string, string>();
    const open: [number, number, number][] = [[0, unit.x, unit.y]];
    while (open.length) {
        open.sort((a, b) => a[0] - b[0]);
        const [d, x, y] = open.shift()!;
        if (d > (dist.get(key(x, y)) ?? Infinity)) continue;
        for (const [dx, dy] of DIRS) {
            const nx = x + dx, ny = y + dy;
            if (!inBounds(tiles, nx, ny)) continue;
            const c = moveCost(tiles, nx, ny, mt);
            if (!c) continue;
            const other = occ.get(key(nx, ny));
            if (other && other.uid !== unit.uid && hostile(other.side, unit.side)) continue;
            const nd = d + c;
            if (nd > move) continue;
            if (nd < (dist.get(key(nx, ny)) ?? Infinity)) { dist.set(key(nx, ny), nd); prev.set(key(nx, ny), key(x, y)); open.push([nd, nx, ny]); }
        }
    }
    const stoppable = new Set<string>();
    for (const k of dist.keys()) { const o = occ.get(k); if (!o || o.uid === unit.uid) stoppable.add(k); }
    return { reach: new Map([...dist].map(([k, d]) => [k, move - d])), prev, stoppable };
}
/** prev 지도로 경로 복원(출발 포함, 도착까지). */
export function pathTo(prev: Map<string, string>, from: Pos, to: Pos): Pos[] {
    const out: Pos[] = [to];
    let k = key(to[0], to[1]);
    const start = key(from[0], from[1]);
    while (k !== start) { const p = prev.get(k); if (!p) return []; out.push(unkey(p)); k = p; }
    return out.reverse();
}
/** (x,y)에서 사거리 [min,max] 안의 모든 칸. */
export function cellsInRange(tiles: string[], x: number, y: number, range: [number, number]): Pos[] {
    const out: Pos[] = [];
    for (let dy = -range[1]; dy <= range[1]; dy++) for (let dx = -range[1]; dx <= range[1]; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d < range[0] || d > range[1]) continue;
        if (inBounds(tiles, x + dx, y + dy)) out.push([x + dx, y + dy]);
    }
    return out;
}
/** 이동 범위 전체에서 공격이 닿는 칸(빨간 칸 표시용). */
export function threatCells(tiles: string[], stoppable: Set<string>, range: [number, number]): Set<string> {
    const s = new Set<string>();
    if (range[1] === 0) return s;
    for (const k of stoppable) { const [x, y] = unkey(k); for (const [cx, cy] of cellsInRange(tiles, x, y, range)) s.add(key(cx, cy)); }
    return s;
}
export const classMove = (u: BattleUnit) => u.move;
