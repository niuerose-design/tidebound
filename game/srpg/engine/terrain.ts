import type { MoveType, Pos } from './types';
/** 지형표(브리프 5절). cost는 보병/기병/중갑/비행, 0은 통행 불가. */
export interface Terrain { ch: string; name: string; cost: Record<MoveType, number>; avoid: number; def: number; heal: number; desc: string }
const T = (ch: string, name: string, inf: number, cav: number, arm: number, fly: number, avoid: number, def: number, heal: number, desc: string): Terrain => ({ ch, name, cost: { infantry: inf, cavalry: cav, armored: arm, flying: fly }, avoid, def, heal, desc });
export const TERRAIN: Record<string, Terrain> = {
    '.': T('.', '평지', 1, 1, 1, 1, 0, 0, 0, '아무 보정도 없다.'),
    'F': T('F', '숲', 2, 3, 2, 1, 20, 1, 0, '회피 +20, 수비 +1. 기병은 느려진다.'),
    'M': T('M', '산', 3, 0, 0, 1, 30, 1, 0, '회피 +30, 수비 +1. 기병·중갑은 오르지 못한다.'),
    '^': T('^', '봉우리', 0, 0, 0, 1, 40, 2, 0, '비행 유닛만 설 수 있다. 회피 +40, 수비 +2.'),
    '~': T('~', '물', 0, 0, 0, 1, 0, 0, 0, '비행 유닛만 건넌다.'),
    '=': T('=', '다리', 1, 1, 1, 1, 0, 0, 0, '물을 건너는 유일한 길. 보정은 없다.'),
    '#': T('#', '벽', 0, 0, 0, 0, 0, 0, 0, '지나갈 수 없다.'),
    'D': T('D', '문', 0, 0, 0, 0, 0, 0, 0, '문 열쇠나 도적이 연다. 열리면 평지가 된다.'),
    'T': T('T', '왕좌', 1, 1, 1, 1, 30, 3, 20, '회피 +30, 수비 +3. 턴 시작에 체력 20% 회복. 점령 목표.'),
    'S': T('S', '요새', 1, 1, 1, 1, 20, 2, 20, '회피 +20, 수비 +2. 턴 시작에 체력 20% 회복.'),
    'H': T('H', '민가', 1, 1, 1, 1, 0, 0, 0, '방문하면 보상이 있다. 도적이 먼저 가면 털린다.'),
    'R': T('R', '폐허', 2, 3, 2, 1, 10, 1, 0, '회피 +10, 수비 +1.'),
    'C': T('C', '상자', 1, 1, 1, 1, 0, 0, 0, '열쇠나 도적이 연다.'),
    'X': T('X', '털린 민가', 1, 1, 1, 1, 0, 0, 0, '이미 털린 집이다.'),
};
export const terrainAt = (tiles: string[], x: number, y: number): Terrain => TERRAIN[tiles[y]?.[x] ?? '#'] ?? TERRAIN['#'];
export const inBounds = (tiles: string[], x: number, y: number) => y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length;
export const moveCost = (tiles: string[], x: number, y: number, mt: MoveType) => inBounds(tiles, x, y) ? terrainAt(tiles, x, y).cost[mt] : 0;
export const canStand = (tiles: string[], x: number, y: number, mt: MoveType) => moveCost(tiles, x, y, mt) > 0;
export const manhattan = (a: Pos | { x: number; y: number }, b: Pos | { x: number; y: number }) => {
    const ax = Array.isArray(a) ? a[0] : a.x, ay = Array.isArray(a) ? a[1] : a.y, bx = Array.isArray(b) ? b[0] : b.x, by = Array.isArray(b) ? b[1] : b.y;
    return Math.abs(ax - bx) + Math.abs(ay - by);
};
/** 타일 문자를 바꾼 새 맵(문 열기 · 민가 파괴). */
export function setTile(tiles: string[], x: number, y: number, ch: string): string[] {
    return tiles.map((row, yy) => yy === y ? row.slice(0, x) + ch + row.slice(x + 1) : row);
}
