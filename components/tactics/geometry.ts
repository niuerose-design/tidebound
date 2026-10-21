/**
 * 전기 맵 좌표계. 두 가지 보기를 같은 인터페이스로 다룹니다.
 *  - flat: 정사각 격자(칸 = tile × tile).
 *  - iso: 2:1 아이소메트릭(마름모 가로 2·tile, 세로 tile). 지형 높이는 윗면을 위로 밀어 그립니다.
 * DOM 칸(입력 · 접근성)과 캔버스(그림)가 같은 함수를 써서 어긋나지 않습니다.
 */
import type { Pos } from '@/game/srpg/engine/types';
export type View = 'flat' | 'iso';
export interface Geometry {
    view: View;
    /** 맵 전체 픽셀 크기. */
    width: number; height: number;
    /** 칸 윗면의 중심(높이 0 기준). */
    center: (x: number, y: number) => { cx: number; cy: number };
    /** DOM 칸의 자리(절대 위치). */
    cellRect: (x: number, y: number) => { left: number; top: number; width: number; height: number };
    /** 픽셀 → 칸 좌표(범위 밖이면 null). */
    unproject: (px: number, py: number) => Pos | null;
    /** 칸 윗면 다각형(시계 방향). */
    polygon: (x: number, y: number, lift?: number) => [number, number][];
    /** 높이 1단위의 픽셀. */
    unit: number;
    /** 마름모 가로 · 세로(iso) 또는 칸 한 변(flat). */
    tw: number; th: number;
}
/** iso 보기에서 높은 지형(봉우리 1.3단)이 맵 위로 삐져나오지 않게 두는 위 여백(높이 단위). */
const ISO_TOP_PAD = 1.6;
export function makeGeometry(view: View, tile: number, w: number, h: number): Geometry {
    if (view === 'flat') {
        return {
            view, width: w * tile, height: h * tile, tw: tile, th: tile, unit: tile * .5,
            center: (x, y) => ({ cx: x * tile + tile / 2, cy: y * tile + tile / 2 }),
            cellRect: (x, y) => ({ left: x * tile, top: y * tile, width: tile, height: tile }),
            unproject: (px, py) => { const x = Math.floor(px / tile), y = Math.floor(py / tile); return x >= 0 && y >= 0 && x < w && y < h ? [x, y] : null; },
            polygon: (x, y) => [[x * tile, y * tile], [x * tile + tile, y * tile], [x * tile + tile, y * tile + tile], [x * tile, y * tile + tile]],
        };
    }
    const tw = tile * 2, th = tile, unit = tile * .55, pad = unit * ISO_TOP_PAD;
    const ox = (h - 1) * tw / 2; // x=0,y=h-1 칸이 가장 왼쪽
    const center = (x: number, y: number) => ({ cx: ox + (x - y) * tw / 2 + tw / 2, cy: pad + (x + y) * th / 2 + th / 2 });
    return {
        view, width: (w + h) * tw / 2, height: pad + (w + h) * th / 2, tw, th, unit,
        center,
        cellRect: (x, y) => { const c = center(x, y); return { left: c.cx - tw / 2, top: c.cy - th / 2, width: tw, height: th }; },
        unproject: (px, py) => { const a = (px - ox - tw / 2) / (tw / 2), b = (py - pad - th / 2) / (th / 2); const x = Math.round((a + b) / 2), y = Math.round((b - a) / 2); return x >= 0 && y >= 0 && x < w && y < h ? [x, y] : null; },
        polygon: (x, y, lift = 0) => { const c = center(x, y); const cy = c.cy - lift; return [[c.cx, cy - th / 2], [c.cx + tw / 2, cy], [c.cx, cy + th / 2], [c.cx - tw / 2, cy]]; },
    };
}
