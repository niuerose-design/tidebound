'use client';
/**
 * 전기 맵 캔버스 렌더. 두 겹의 캔버스로 그립니다.
 *  - 아래(terrain): 지형을 절차적으로 그린 그림(타일 · 보기 · 칸 크기가 바뀔 때만 다시 그림).
 *  - 위(units): 유닛 토큰 · 이동 경로 · 초점 고리 · 타격 · 회복 · 피해 숫자 · 쓰러짐 연출. 포인터 이벤트를 받지 않습니다.
 * 그 사이에 DOM 칸(접근성 · 초점 · 범위 색)이 놓입니다(battle-screen.tsx). 좌표는 geometry.ts가 정합니다.
 * 보기: flat(정사각 격자) · iso(2:1 아이소메트릭, 지형 높이 · 옆면 · 그림자로 입체감). 엔진 상태는 바꾸지 않고 보여 주기만 합니다.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { BattleUnit, CombatResult, Pos } from '@/game/srpg/engine/types';
import { classDef } from '@/game/srpg/data/classes';
import type { Geometry } from './geometry';
export type MapAnim = { kind: 'move'; uid: string; path: Pos[] } | { kind: 'combat'; result: CombatResult } | { kind: 'event'; x: number; y: number; text: string; color?: string };
export interface MapCanvasHandle { play: (anims: MapAnim[]) => Promise<void>; busy: () => boolean }
interface Props { tiles: string[]; units: BattleUnit[]; geo: Geometry; goal: Pos | null; used: Set<string>; path: Pos[] | null; focusCell: Pos | null; selectedUid: string | null; inspectedUid: string | null; actingUid: string | null; showGrid: boolean; speed: 'normal' | 'fast'; reducedMotion: boolean }
type Disp = { x: number; y: number; alpha: number; flash: number; shake: number; lift: number; fall: number };
type Popup = { x: number; y: number; text: string; color: string; t0: number; dur: number; big: boolean };
type Ring = { x: number; y: number; t0: number; dur: number; color: string };
const SIDE = { player: { body: '#1d4a5e', edge: '#4fa3c7', text: '#e6f6ff', hp: '#6fcf97' }, enemy: { body: '#5c2626', edge: '#d46a6a', text: '#ffe6e6', hp: '#ef8c85' }, ally: { body: '#2f5a30', edge: '#7ad57a', text: '#e9ffe9', hp: '#a4e9ba' } } as const;
/** 지형 높이(단위: geometry.unit). 물은 낮고 벽 · 산은 높습니다. */
const HEIGHT: Record<string, number> = { '.': 0, F: 0, M: .9, '^': 1.3, '~': -.18, '=': .02, '#': .8, D: .8, T: .12, S: .45, H: 0, R: .05, C: 0, X: .04 };
const TOP: Record<string, string> = { '.': '#2c4a3e', F: '#2a473c', M: '#5a4f3f', '^': '#7f7f72', '~': '#1b4a66', '=': '#8b6b3f', '#': '#2a2f35', D: '#2a2f35', T: '#4a4a52', S: '#4a4a52', H: '#2c4a3e', R: '#3f4a44', C: '#2c4a3e', X: '#3a2f2a' };
const hash = (x: number, y: number, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const ease = (t: number) => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const key = (x: number, y: number) => `${x},${y}`;
const shade = (hex: string, k: number) => { const n = parseInt(hex.slice(1), 16); const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
const poly = (g: CanvasRenderingContext2D, pts: [number, number][]) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(props, ref) {
    const terrainRef = useRef<HTMLCanvasElement>(null), unitsRef = useRef<HTMLCanvasElement>(null);
    const propsRef = useRef(props); useEffect(() => { propsRef.current = props; });
    const disp = useRef(new Map<string, Disp>());
    const ghosts = useRef(new Map<string, { d: Disp; u: BattleUnit; t0: number }>());
    const lastUnits = useRef(new Map<string, BattleUnit>());
    const popups = useRef<Popup[]>([]), rings = useRef<Ring[]>([]);
    const raf = useRef(0), running = useRef(false), terrainKey = useRef('');
    const tweens = useRef(new Map<string, true>());
    const now = () => performance.now();
    const setup = (c: HTMLCanvasElement, geo: Geometry) => { const dpr = Math.min(2, window.devicePixelRatio || 1); if (c.width !== Math.round(geo.width * dpr) || c.height !== Math.round(geo.height * dpr)) { c.width = Math.round(geo.width * dpr); c.height = Math.round(geo.height * dpr); } c.style.width = `${geo.width}px`; c.style.height = `${geo.height}px`; const g = c.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0); return g; };
    // ── 지형 ──
    const drawTerrain = useCallback(() => {
        const c = terrainRef.current; if (!c) return;
        const { tiles, geo, showGrid } = propsRef.current;
        const k = `${tiles.join('|')}:${geo.view}:${geo.tw}:${showGrid}:${Math.min(2, window.devicePixelRatio || 1)}`;
        if (terrainKey.current === k) return; terrainKey.current = k;
        const g = setup(c, geo);
        g.clearRect(0, 0, geo.width, geo.height);
        const w = tiles[0].length, h = tiles.length;
        const at = (x: number, y: number) => tiles[y]?.[x] ?? '#';
        if (geo.view === 'flat') { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) drawFlatTile(g, at, x, y, geo.tw); if (showGrid) { g.strokeStyle = '#0b1a1e55'; g.lineWidth = 1; for (let x = 0; x <= w; x++) { g.beginPath(); g.moveTo(x * geo.tw + .5, 0); g.lineTo(x * geo.tw + .5, h * geo.tw); g.stroke(); } for (let y = 0; y <= h; y++) { g.beginPath(); g.moveTo(0, y * geo.tw + .5); g.lineTo(w * geo.tw, y * geo.tw + .5); g.stroke(); } } return; }
        // iso: 뒤(x+y 작음)부터 앞으로 그려 앞 칸이 뒤 칸을 가립니다.
        g.fillStyle = '#0b1a1e'; g.fillRect(0, 0, geo.width, geo.height);
        for (let s = 0; s <= w + h - 2; s++) for (let x = Math.max(0, s - h + 1); x <= Math.min(w - 1, s); x++) drawIsoTile(g, at, x, s - x, geo, showGrid);
    }, []);
    // ── 유닛 · 연출 ──
    const drawUnits = useCallback(() => {
        const c = unitsRef.current; if (!c) return;
        const p = propsRef.current; const { geo, units, tiles } = p;
        const g = setup(c, geo); g.clearRect(0, 0, geo.width, geo.height);
        const t = now();
        const liftOf = (x: number, y: number) => (HEIGHT[tiles[y]?.[x] ?? '.'] ?? 0) * (geo.view === 'iso' ? geo.unit : 0);
        const present = new Set<string>();
        for (const u of units) if (u.hp > 0 && u.x >= 0) present.add(u.uid);
        for (const [uid, u] of lastUnits.current) if (!present.has(uid) && disp.current.has(uid) && !ghosts.current.has(uid)) ghosts.current.set(uid, { d: { ...disp.current.get(uid)! }, u, t0: t });
        lastUnits.current = new Map(units.filter(u => u.hp > 0 && u.x >= 0).map(u => [u.uid, u]));
        // 목표 칸 · 다 쓴 민가 · 초점 · 경로
        if (p.goal) { g.save(); g.strokeStyle = '#d4b579'; g.lineWidth = 2; g.setLineDash([6, 4]); poly(g, geo.polygon(p.goal[0], p.goal[1], liftOf(p.goal[0], p.goal[1]))); g.stroke(); g.restore(); }
        for (const k of p.used) { const [x, y] = k.split(',').map(Number); g.save(); g.fillStyle = '#0b1a1e66'; poly(g, geo.polygon(x, y, liftOf(x, y))); g.fill(); g.restore(); }
        if (p.focusCell) { g.save(); g.strokeStyle = '#81cbb4'; g.lineWidth = 2; poly(g, geo.polygon(p.focusCell[0], p.focusCell[1], liftOf(p.focusCell[0], p.focusCell[1]))); g.stroke(); g.restore(); }
        if (p.path && p.path.length > 1) drawPath(g, p.path, geo, liftOf);
        const opts = (d: Disp, u: BattleUnit, extra: Partial<TokenOpts> = {}): TokenOpts => ({ alpha: d.alpha, lift: d.lift, flash: d.flash, shake: d.shake, fall: d.fall, acted: u.acted && u.side === 'player', selected: p.selectedUid === u.uid, inspected: p.inspectedUid === u.uid, acting: p.actingUid === u.uid, ...extra });
        for (const [uid, gh] of ghosts.current) { const k = p.reducedMotion ? 1 : Math.min(1, (t - gh.t0) / 560); if (k >= 1) { ghosts.current.delete(uid); disp.current.delete(uid); continue; } drawToken(g, gh.u, gh.d.x, gh.d.y, geo, liftOf, opts(gh.d, gh.u, { alpha: 1 - k, fall: k, acted: false, selected: false, inspected: false, acting: false })); }
        const sorted = [...units].filter(u => u.hp > 0 && u.x >= 0).sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.y - b.y);
        for (const u of sorted) {
            let d = disp.current.get(u.uid);
            if (!d) { d = { x: u.x, y: u.y, alpha: 1, flash: 0, shake: 0, lift: 0, fall: 0 }; disp.current.set(u.uid, d); }
            if (!tweens.current.has(u.uid)) { d.x = u.x; d.y = u.y; }
            drawToken(g, u, d.x, d.y, geo, liftOf, opts(d, u));
            d.flash = Math.max(0, d.flash - .08); d.shake = Math.max(0, d.shake - .6);
        }
        rings.current = rings.current.filter(r => t - r.t0 < r.dur);
        for (const r of rings.current) { const k = (t - r.t0) / r.dur; const c0 = geo.center(r.x, r.y); const cy = c0.cy - liftOf(Math.round(r.x), Math.round(r.y)); g.save(); g.globalAlpha = 1 - k; g.strokeStyle = r.color; g.lineWidth = 2; g.beginPath(); g.ellipse(c0.cx, cy, geo.tw * (.18 + k * .3), geo.th * (.18 + k * .3), 0, 0, Math.PI * 2); g.stroke(); g.restore(); }
        if (geo.view === 'iso') occlude(g, tiles, geo, [...sorted.map(u => ({ u, d: disp.current.get(u.uid)! })), ...[...ghosts.current.values()].map(gh => ({ u: gh.u, d: gh.d }))]);
        popups.current = popups.current.filter(pp => t - pp.t0 < pp.dur);
        for (const pp of popups.current) { const k = (t - pp.t0) / pp.dur; const a = k < .15 ? k / .15 : k > .8 ? (1 - k) / .2 : 1; const c0 = geo.center(pp.x, pp.y); const fs = Math.round(geo.th * (pp.big ? .42 : .34)); g.save(); g.globalAlpha = a; g.font = `700 ${fs}px Pretendard, 'Noto Sans KR', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; const cx = c0.cx, cy = c0.cy - liftOf(Math.round(pp.x), Math.round(pp.y)) - geo.th * (geo.view === 'iso' ? 1.2 : .4) - k * geo.th * .6; const tw = g.measureText(pp.text).width + 10, th = fs + 6; g.fillStyle = '#000000aa'; roundRect(g, cx - tw / 2, cy - th / 2, tw, th, 4); g.fill(); g.fillStyle = pp.color; g.fillText(pp.text, cx, cy + 1); g.restore(); }
    }, []);
    const active = () => tweens.current.size > 0 || popups.current.length > 0 || rings.current.length > 0 || ghosts.current.size > 0 || [...disp.current.values()].some(d => d.flash > 0 || d.shake > 0);
    const loop = useCallback(() => { drawUnits(); if (active()) raf.current = requestAnimationFrame(loop); else running.current = false; }, [drawUnits]);
    const kick = useCallback(() => { if (running.current) return; running.current = true; raf.current = requestAnimationFrame(loop); }, [loop]);
    useEffect(() => { drawTerrain(); drawUnits(); if (active()) kick(); });
    useEffect(() => () => cancelAnimationFrame(raf.current), []);
    const dur = (ms: number) => propsRef.current.reducedMotion ? 0 : propsRef.current.speed === 'fast' ? ms * .4 : ms;
    const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    const moveAlong = async (uid: string, path: Pos[]) => {
        const d = disp.current.get(uid); if (!d || path.length < 2) { if (d) { const last = path[path.length - 1]; if (last) { d.x = last[0]; d.y = last[1]; } } return; }
        tweens.current.set(uid, true); kick();
        const per = dur(95);
        for (let i = 1; i < path.length; i++) {
            const [ax, ay] = path[i - 1], [bx, by] = path[i];
            if (per === 0) { d.x = bx; d.y = by; continue; }
            const t0 = now();
            await new Promise<void>(res => { const step = () => { const k = Math.min(1, (now() - t0) / per), e = ease(k); d.x = ax + (bx - ax) * e; d.y = ay + (by - ay) * e; d.lift = Math.sin(k * Math.PI) * propsRef.current.geo.th * .22; if (k < 1) requestAnimationFrame(step); else { d.lift = 0; res(); } }; step(); });
        }
        tweens.current.delete(uid);
    };
    const combat = async (r: CombatResult) => {
        const perStrike = dur(440);
        for (const s of r.strikes) {
            const a = disp.current.get(s.attacker), d = disp.current.get(s.defender);
            if (!a || !d) continue;
            const ax0 = a.x, ay0 = a.y, dx = Math.sign(d.x - a.x), dy = Math.sign(d.y - a.y);
            tweens.current.set(s.attacker, true); kick();
            if (perStrike > 0) {
                const t0 = now(), lunge = perStrike * .45;
                await new Promise<void>(res => { const step = () => { const k = Math.min(1, (now() - t0) / lunge); const off = Math.sin(k * Math.PI) * (s.heal ? .12 : .34); a.x = ax0 + dx * off; a.y = ay0 + dy * off; a.lift = Math.sin(k * Math.PI) * propsRef.current.geo.th * .25; if (k < 1) requestAnimationFrame(step); else res(); }; step(); });
            }
            a.x = ax0; a.y = ay0; a.lift = 0; tweens.current.delete(s.attacker);
            if (s.heal) { rings.current.push({ x: d.x, y: d.y, t0: now(), dur: dur(600) || 1, color: '#a4e9ba' }); popups.current.push({ x: d.x, y: d.y, text: `+${s.dmg}`, color: '#a4e9ba', t0: now(), dur: dur(900) || 1, big: false }); }
            else if (s.hit) { d.flash = 1; d.shake = s.crit ? 7 : 4; popups.current.push({ x: d.x, y: d.y, text: s.crit ? `필살 ${s.dmg}` : `${s.dmg}`, color: s.crit ? '#ffd566' : '#ffffff', t0: now(), dur: dur(s.crit ? 1100 : 900) || 1, big: s.crit }); if (s.crit) rings.current.push({ x: d.x, y: d.y, t0: now(), dur: dur(500) || 1, color: '#ffd566' }); }
            else popups.current.push({ x: d.x, y: d.y, text: '빗나감', color: '#9fb4b5', t0: now(), dur: dur(800) || 1, big: false });
            kick();
            await wait(perStrike * .55);
        }
        if (r.killed) await wait(dur(260));
    };
    useImperativeHandle(ref, () => ({
        busy: () => tweens.current.size > 0,
        play: async (anims) => {
            for (const an of anims) {
                if (an.kind === 'move') await moveAlong(an.uid, an.path);
                else if (an.kind === 'combat') await combat(an.result);
                else { popups.current.push({ x: an.x, y: an.y, text: an.text, color: an.color ?? '#f2d36b', t0: now(), dur: dur(1000) || 1, big: false }); kick(); await wait(dur(300)); }
            }
            drawUnits();
        },
    }), [drawUnits]); // eslint-disable-line react-hooks/exhaustive-deps
    return <>
        <canvas ref={terrainRef} className="tx-canvas-terrain" aria-hidden="true"/>
        <canvas ref={unitsRef} className="tx-canvas-units" aria-hidden="true"/>
    </>;
});
/** 지형 중 유닛을 가릴 만큼 솟은 것(벽 · 문 · 산 · 봉우리 · 요새 · 민가 · 숲 · 폐허). */
const TALL = new Set(['#', 'D', 'M', '^', 'S', 'H', 'F', 'R', 'T']);
/** 유닛보다 앞에 있는 높은 칸을 유닛 위에 다시 그립니다(앞 블록이 뒤 유닛을 가림). 유닛 카드와 칸이 화면에서 겹칠 때만. */
function occlude(g: CanvasRenderingContext2D, tiles: string[], geo: Geometry, units: { u: BattleUnit; d: Disp }[]) {
    if (!units.length) return;
    const at = (x: number, y: number) => tiles[y]?.[x] ?? '#';
    const w = tiles[0].length, h = tiles.length;
    const cards = units.map(({ d }) => { const c = geo.center(d.x, d.y); return { depth: d.x + d.y, x0: c.cx - geo.tw * .25, x1: c.cx + geo.tw * .25, y0: c.cy - geo.th * 1.9, y1: c.cy + geo.th * .4 }; });
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const ch = at(x, y); if (!TALL.has(ch)) continue;
        const c = geo.center(x, y); const top = c.cy - geo.th * 1.6, bottom = c.cy + geo.th * .5, left = c.cx - geo.tw / 2, right = c.cx + geo.tw / 2;
        const depth = x + y;
        if (cards.some(k => depth > k.depth + .5 && k.x1 > left && k.x0 < right && k.y1 > top && k.y0 < bottom)) drawIsoTile(g, at, x, y, geo, false);
    }
}
type TokenOpts = { alpha: number; lift: number; flash: number; shake: number; fall: number; acted: boolean; selected: boolean; inspected: boolean; acting: boolean };
// ───────────────────────── iso 지형 ─────────────────────────
/** 아이소메트릭 블록 한 칸: 왼쪽 · 오른쪽 옆면과 윗면. 빛은 왼쪽 위에서 옵니다. */
function isoBlock(g: CanvasRenderingContext2D, geo: Geometry, x: number, y: number, hUnits: number, top: string, depthFrom = 0) {
    const lift = hUnits * geo.unit, base = depthFrom * geo.unit;
    const [n, e, s, wst] = geo.polygon(x, y, lift);
    if (lift > base) {
        const d = lift - base;
        g.fillStyle = shade(top, .62); poly(g, [wst, s, [s[0], s[1] + d], [wst[0], wst[1] + d]]); g.fill();
        g.fillStyle = shade(top, .48); poly(g, [s, e, [e[0], e[1] + d], [s[0], s[1] + d]]); g.fill();
    }
    g.fillStyle = top; poly(g, [n, e, s, wst]); g.fill();
}
function drawIsoTile(g: CanvasRenderingContext2D, at: (x: number, y: number) => string, x: number, y: number, geo: Geometry, grid: boolean) {
    const ch = at(x, y), top = TOP[ch] ?? TOP['.'], hgt = HEIGHT[ch] ?? 0, r = (s: number) => hash(x, y, s);
    const { cx, cy } = geo.center(x, y); const U = geo.unit, tw = geo.tw, th = geo.th;
    const lift = hgt * U, topY = cy - lift;
    // 물은 바닥 아래로 내려가므로 이웃 땅의 옆면이 보이게 땅(0)을 먼저 깔고 물을 파냅니다.
    if (ch === '~') { isoBlock(g, geo, x, y, 0, '#1f3a46'); isoBlock(g, geo, x, y, hgt, top); g.strokeStyle = '#2f7aa0'; g.lineWidth = 1.5; for (let i = 0; i < 2; i++) { const wy = topY + (i - .5) * th * .3 + (r(30 + i) - .5) * 4, wx = cx - tw * .25 + r(40 + i) * tw * .25; g.beginPath(); g.moveTo(wx, wy); g.quadraticCurveTo(wx + tw * .1, wy - 3, wx + tw * .2, wy); g.stroke(); } }
    else if (ch === '=') { isoBlock(g, geo, x, y, -.18, '#1b4a66'); const vertical = at(x, y - 1) === '~' || at(x, y + 1) === '~'; g.fillStyle = top; const [n, e, s, wst] = geo.polygon(x, y, hgt * U); poly(g, vertical ? [[n[0] - tw * .12, n[1] + th * .06], [e[0] - tw * .12, e[1] - th * .06], [s[0] + tw * .12, s[1] - th * .06], [wst[0] + tw * .12, wst[1] + th * .06]] : [[n[0] + tw * .12, n[1] + th * .06], [e[0] - tw * .12, e[1] + th * .06], [s[0] - tw * .12, s[1] - th * .06], [wst[0] + tw * .12, wst[1] - th * .06]]); g.fill(); g.strokeStyle = '#5a3f22'; g.lineWidth = 1; for (let i = 1; i < 5; i++) { const k = i / 5; g.beginPath(); if (vertical) { g.moveTo(wst[0] + (n[0] - wst[0]) * k + tw * .1, wst[1] + (n[1] - wst[1]) * k); g.lineTo(s[0] + (e[0] - s[0]) * k - tw * .1, s[1] + (e[1] - s[1]) * k); } else { g.moveTo(wst[0] + (s[0] - wst[0]) * k + tw * .1, wst[1] + (s[1] - wst[1]) * k); g.lineTo(n[0] + (e[0] - n[0]) * k - tw * .1, n[1] + (e[1] - n[1]) * k); } g.stroke(); } }
    else if (ch === 'M' || ch === '^') { isoBlock(g, geo, x, y, 0, TOP['.']); const peak = ch === '^'; const hh = (peak ? 1.3 : .9) * U; const base = geo.polygon(x, y, 0); const apex: [number, number] = [cx + (r(3) - .5) * tw * .1, cy - hh]; g.fillStyle = shade(top, .9); poly(g, [base[3], apex, base[2]]); g.fill(); g.fillStyle = shade(top, .55); poly(g, [base[2], apex, base[1]]); g.fill(); g.fillStyle = shade(top, 1.15); poly(g, [base[0], apex, base[3]]); g.fill(); g.fillStyle = '#e8eef0'; const sx = .3; poly(g, [apex, [apex[0] + (base[2][0] - apex[0]) * sx, apex[1] + (base[2][1] - apex[1]) * sx], [apex[0] + (base[3][0] - apex[0]) * sx, apex[1] + (base[3][1] - apex[1]) * sx]]); g.fill(); }
    else {
        isoBlock(g, geo, x, y, hgt, top);
        if (ch === '.' || ch === 'F' || ch === 'H' || ch === 'C') { g.strokeStyle = '#3a6650'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { const gx = cx + (r(10 + i) - .5) * tw * .5, gy = topY + (r(20 + i) - .5) * th * .5; g.beginPath(); g.moveTo(gx, gy + 2); g.lineTo(gx + 1.5, gy - 2); g.lineTo(gx + 3, gy + 2); g.stroke(); } }
        if (ch === 'F') for (let i = 0; i < 3; i++) { const tx = cx + (r(50 + i) - .5) * tw * .5, ty = topY + (r(60 + i) - .5) * th * .5, rad = th * .3, trunk = th * .35; g.fillStyle = '#00000055'; g.beginPath(); g.ellipse(tx, ty + 2, rad * .9, rad * .4, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#4a3220'; g.fillRect(tx - 2, ty - trunk, 4, trunk); g.fillStyle = '#1e5a34'; g.beginPath(); g.arc(tx, ty - trunk - rad * .3, rad, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2f8a4e'; g.beginPath(); g.arc(tx - rad * .3, ty - trunk - rad * .55, rad * .55, 0, Math.PI * 2); g.fill(); }
        if (ch === '#' || ch === 'D') { g.strokeStyle = '#3a4048'; g.lineWidth = 1; const [n, e, s, wst] = geo.polygon(x, y, lift); const d = hgt * U; for (let i = 1; i < 4; i++) { const yy = i * d / 4; g.beginPath(); g.moveTo(wst[0], wst[1] + yy); g.lineTo(s[0], s[1] + yy); g.lineTo(e[0], e[1] + yy); g.stroke(); } void n; if (ch === 'D') { g.fillStyle = '#5c3a1e'; const mx = (wst[0] + s[0]) / 2, my = (wst[1] + s[1]) / 2; poly(g, [[mx - tw * .09, my - th * .045 + d * .25], [mx + tw * .09, my + th * .045 + d * .25], [mx + tw * .09, my + th * .045 + d], [mx - tw * .09, my - th * .045 + d]]); g.fill(); g.fillStyle = '#d4b579'; g.beginPath(); g.arc(mx + tw * .05, my + d * .65, 2, 0, Math.PI * 2); g.fill(); } }
        if (ch === 'T') { g.fillStyle = '#6a5424'; roundRect(g, cx - tw * .1, topY - th * .55, tw * .2, th * .55, 3); g.fill(); g.fillStyle = '#d4b579'; roundRect(g, cx - tw * .08, topY - th * .5, tw * .16, th * .18, 2); g.fill(); g.fillStyle = '#8a7030'; roundRect(g, cx - tw * .14, topY - th * .12, tw * .28, th * .12, 2); g.fill(); }
        if (ch === 'S') { g.fillStyle = '#6a6a74'; const [n, e, s, wst] = geo.polygon(x, y, lift); for (const [px, py] of [n, e, s, wst]) { const bx = cx + (px - cx) * .8, by = topY + (py - topY) * .8; g.fillRect(bx - 3, by - th * .18, 6, th * .18); } g.fillStyle = '#3b3b42'; poly(g, [[cx, topY - th * .25], [cx + tw * .25, topY], [cx, topY + th * .25], [cx - tw * .25, topY]]); g.fill(); }
        if (ch === 'H') { const bw = tw * .34, bh = th * .5, wall = th * .45; const bx = cx - bw / 2, by = topY - wall; g.fillStyle = '#00000055'; g.beginPath(); g.ellipse(cx, topY + th * .05, bw * .7, th * .25, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#8a6a44'; poly(g, [[bx, by], [cx, by + bh * .25], [cx, topY + th * .12], [bx, topY - th * .12]]); g.fill(); g.fillStyle = '#6d5236'; poly(g, [[cx, by + bh * .25], [bx + bw, by], [bx + bw, topY - th * .12], [cx, topY + th * .12]]); g.fill(); g.fillStyle = '#a23f2f'; poly(g, [[bx - 3, by], [cx - tw * .02, by - th * .38], [cx + tw * .02, by - th * .38], [bx + bw + 3, by], [cx, by + bh * .25]]); g.fill(); g.fillStyle = '#3b2410'; g.fillRect(cx - tw * .1, topY - th * .18, tw * .05, th * .22); g.fillStyle = '#f2d36b'; g.fillRect(cx + tw * .05, topY - th * .2, 4, 4); }
        if (ch === 'R') { g.fillStyle = '#566660'; g.fillRect(cx - tw * .18, topY - th * .5, tw * .06, th * .5); g.fillRect(cx + tw * .1, topY - th * .32, tw * .06, th * .36); g.fillStyle = '#3f4a44'; g.fillRect(cx - tw * .2, topY - th * .06, tw * .34, th * .08); }
        if (ch === 'C') { g.fillStyle = '#7a5c3a'; roundRect(g, cx - tw * .11, topY - th * .36, tw * .22, th * .36, 3); g.fill(); g.fillStyle = '#5a3f22'; g.fillRect(cx - tw * .11, topY - th * .22, tw * .22, 3); g.fillStyle = '#d4b579'; g.fillRect(cx - 3, topY - th * .26, 6, 7); }
        if (ch === 'X') { g.fillStyle = '#2a211d'; g.fillRect(cx - tw * .12, topY - th * .18, tw * .24, th * .18); g.fillStyle = '#5a4a40'; g.fillRect(cx - tw * .02, topY - th * .36, tw * .05, th * .36); }
    }
    if (grid) { g.strokeStyle = '#0b1a1e66'; g.lineWidth = 1; poly(g, geo.polygon(x, y, Math.max(0, lift))); g.stroke(); }
}
// ───────────────────────── flat 지형 ─────────────────────────
function drawFlatTile(g: CanvasRenderingContext2D, at: (x: number, y: number) => string, x: number, y: number, t: number) {
    const ch = at(x, y), X = x * t, Y = y * t, r = (s: number) => hash(x, y, s);
    const grass = () => { g.fillStyle = r(1) < .5 ? '#2c4a3e' : '#2a473c'; g.fillRect(X, Y, t, t); g.strokeStyle = '#35584a'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { const gx = X + 4 + r(10 + i) * (t - 8), gy = Y + 4 + r(20 + i) * (t - 8); g.beginPath(); g.moveTo(gx, gy + 3); g.lineTo(gx + 1.5, gy - 2); g.lineTo(gx + 3, gy + 3); g.stroke(); } };
    const stone = (c1: string, c2: string) => { g.fillStyle = c1; g.fillRect(X, Y, t, t); g.strokeStyle = c2; g.lineWidth = 1; const rows = 4, bh = t / rows; for (let i = 0; i < rows; i++) { g.beginPath(); g.moveTo(X, Y + i * bh + .5); g.lineTo(X + t, Y + i * bh + .5); g.stroke(); const off = i % 2 ? t / 4 : 0; for (let j = 0; j < 2; j++) { const bx = X + off + j * t / 2; g.beginPath(); g.moveTo(bx + .5, Y + i * bh); g.lineTo(bx + .5, Y + (i + 1) * bh); g.stroke(); } } };
    const water = () => { g.fillStyle = '#1b4a66'; g.fillRect(X, Y, t, t); g.strokeStyle = '#2a6688'; g.lineWidth = 1.5; for (let i = 0; i < 2; i++) { const wy = Y + t * (.3 + i * .4) + r(30 + i) * 4; const wx = X + r(40 + i) * t * .3; g.beginPath(); g.moveTo(wx, wy); g.quadraticCurveTo(wx + t * .18, wy - 3, wx + t * .36, wy); g.stroke(); } };
    switch (ch) {
        case '.': grass(); break;
        case 'F': grass(); for (let i = 0; i < 3; i++) { const cx = X + t * (.25 + (i % 2) * .5) + (r(50 + i) - .5) * t * .2, cy = Y + t * (.3 + Math.floor(i / 2) * .4) + (r(60 + i) - .5) * t * .15, rad = t * .2; g.fillStyle = '#163f28'; g.beginPath(); g.arc(cx, cy + 2, rad, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2c7a48'; g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3e9a5c'; g.beginPath(); g.arc(cx - rad * .3, cy - rad * .3, rad * .45, 0, Math.PI * 2); g.fill(); } break;
        case 'M': case '^': { grass(); const peak = ch === '^'; g.fillStyle = peak ? '#7f7f72' : '#5a4f3f'; g.beginPath(); g.moveTo(X + t * .1, Y + t * .9); g.lineTo(X + t * .5, Y + t * (peak ? .05 : .18)); g.lineTo(X + t * .9, Y + t * .9); g.closePath(); g.fill(); g.fillStyle = peak ? '#a9a9a0' : '#7a6c58'; g.beginPath(); g.moveTo(X + t * .5, Y + t * (peak ? .05 : .18)); g.lineTo(X + t * .9, Y + t * .9); g.lineTo(X + t * .55, Y + t * .9); g.closePath(); g.fill(); g.fillStyle = '#e8eef0'; g.beginPath(); g.moveTo(X + t * .5, Y + t * (peak ? .05 : .18)); g.lineTo(X + t * .62, Y + t * (peak ? .3 : .4)); g.lineTo(X + t * .38, Y + t * (peak ? .3 : .4)); g.closePath(); g.fill(); break; }
        case '~': water(); break;
        case '=': { water(); const vertical = at(x, y - 1) === '~' || at(x, y + 1) === '~'; g.fillStyle = '#8b6b3f'; if (vertical) { g.fillRect(X + t * .12, Y, t * .76, t); g.strokeStyle = '#6a4f2c'; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(X + t * .12, Y + i * t / 5 + .5); g.lineTo(X + t * .88, Y + i * t / 5 + .5); g.stroke(); } g.fillStyle = '#5a3f22'; g.fillRect(X + t * .08, Y, t * .06, t); g.fillRect(X + t * .86, Y, t * .06, t); } else { g.fillRect(X, Y + t * .12, t, t * .76); g.strokeStyle = '#6a4f2c'; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(X + i * t / 5 + .5, Y + t * .12); g.lineTo(X + i * t / 5 + .5, Y + t * .88); g.stroke(); } g.fillStyle = '#5a3f22'; g.fillRect(X, Y + t * .08, t, t * .06); g.fillRect(X, Y + t * .86, t, t * .06); } break; }
        case '#': stone('#22262b', '#33383f'); break;
        case 'D': { stone('#22262b', '#33383f'); g.fillStyle = '#5c3a1e'; roundRect(g, X + t * .22, Y + t * .15, t * .56, t * .8, t * .12); g.fill(); g.strokeStyle = '#3b2410'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#d4b579'; g.beginPath(); g.arc(X + t * .66, Y + t * .58, t * .05, 0, Math.PI * 2); g.fill(); break; }
        case 'T': { stone('#4a4a52', '#5b5b63'); g.fillStyle = '#6a5424'; roundRect(g, X + t * .28, Y + t * .18, t * .44, t * .62, t * .08); g.fill(); g.fillStyle = '#d4b579'; roundRect(g, X + t * .32, Y + t * .22, t * .36, t * .22, t * .05); g.fill(); g.fillRect(X + t * .22, Y + t * .6, t * .56, t * .1); break; }
        case 'S': { grass(); stone('#4a4a52', '#5b5b63'); g.fillStyle = '#2c4a3e'; g.fillRect(X + t * .22, Y + t * .22, t * .56, t * .56); g.fillStyle = '#6a6a74'; for (let i = 0; i < 4; i++) g.fillRect(X + t * (.05 + i * .25), Y + t * .02, t * .14, t * .12); break; }
        case 'H': { grass(); g.fillStyle = '#7a5c3a'; g.fillRect(X + t * .2, Y + t * .45, t * .6, t * .42); g.fillStyle = '#a23f2f'; g.beginPath(); g.moveTo(X + t * .12, Y + t * .48); g.lineTo(X + t * .5, Y + t * .14); g.lineTo(X + t * .88, Y + t * .48); g.closePath(); g.fill(); g.fillStyle = '#3b2410'; g.fillRect(X + t * .42, Y + t * .62, t * .16, t * .25); g.fillStyle = '#f2d36b'; g.fillRect(X + t * .26, Y + t * .55, t * .1, t * .1); break; }
        case 'R': { grass(); g.fillStyle = '#566660'; g.fillRect(X + t * .18, Y + t * .3, t * .14, t * .55); g.fillRect(X + t * .62, Y + t * .45, t * .14, t * .4); g.fillStyle = '#3f4a44'; g.fillRect(X + t * .12, Y + t * .78, t * .76, t * .1); g.fillRect(X + t * .4, Y + t * .6, t * .14, t * .14); break; }
        case 'C': { grass(); g.fillStyle = '#7a5c3a'; roundRect(g, X + t * .2, Y + t * .32, t * .6, t * .46, t * .08); g.fill(); g.fillStyle = '#5a3f22'; g.fillRect(X + t * .2, Y + t * .5, t * .6, t * .06); g.fillStyle = '#d4b579'; g.fillRect(X + t * .44, Y + t * .44, t * .12, t * .16); break; }
        case 'X': { g.fillStyle = '#3a2f2a'; g.fillRect(X, Y, t, t); g.fillStyle = '#2a211d'; g.fillRect(X + t * .2, Y + t * .55, t * .6, t * .3); g.fillStyle = '#5a4a40'; g.fillRect(X + t * .3, Y + t * .35, t * .1, t * .5); break; }
        default: grass();
    }
}
// ───────────────────────── 경로 · 유닛 ─────────────────────────
function drawPath(g: CanvasRenderingContext2D, path: Pos[], geo: Geometry, liftOf: (x: number, y: number) => number) {
    const pts = path.map(([x, y]) => { const c = geo.center(x, y); return [c.cx, c.cy - liftOf(x, y)] as [number, number]; });
    g.save(); g.strokeStyle = '#8fd3ef'; g.lineWidth = Math.max(3, geo.th * .12); g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = .85;
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    const [lx, ly] = pts[pts.length - 1], [px, py] = pts[pts.length - 2]; const ang = Math.atan2(ly - py, lx - px), s = geo.th * .22;
    g.fillStyle = '#8fd3ef'; g.beginPath(); g.moveTo(lx + Math.cos(ang) * s, ly + Math.sin(ang) * s); g.lineTo(lx + Math.cos(ang + 2.5) * s, ly + Math.sin(ang + 2.5) * s); g.lineTo(lx + Math.cos(ang - 2.5) * s, ly + Math.sin(ang - 2.5) * s); g.closePath(); g.fill(); g.restore();
}
/** 유닛 토큰. flat: 바닥에 놓인 패, iso: 칸 위에 세운 카드. 편은 색과 모양으로 함께 구분합니다(아군 네모 · 적 둥근 · 중립 겹테두리). */
function drawToken(g: CanvasRenderingContext2D, u: BattleUnit, x: number, y: number, geo: Geometry, liftOf: (x: number, y: number) => number, o: TokenOpts) {
    const cls = classDef(u.classId), col = SIDE[u.side], iso = geo.view === 'iso';
    const sx = o.shake ? (Math.random() - .5) * o.shake : 0, sy = o.shake ? (Math.random() - .5) * o.shake : 0;
    // 이동 중에는 두 칸 사이의 높이를 보간합니다.
    const fx = Math.floor(x), fy = Math.floor(y), cx1 = Math.ceil(x), cy1 = Math.ceil(y);
    const ground = (liftOf(fx, fy) + liftOf(cx1, cy1)) / 2;
    const c = geo.center(x, y); const baseX = c.cx + sx, baseY = c.cy - ground + sy;
    const cw = iso ? geo.tw * .36 : geo.tw * .68, chh = iso ? geo.th * 1.25 : geo.tw * .68;
    const top = iso ? baseY - chh - o.lift + geo.th * .1 : baseY - chh / 2 - o.lift;
    g.save(); g.globalAlpha = o.alpha;
    // 그림자
    g.fillStyle = '#00000066'; g.beginPath(); g.ellipse(c.cx, iso ? c.cy - ground + geo.th * .12 : c.cy + geo.tw * .36, cw * .5, iso ? geo.th * .16 : cw * .18, 0, 0, Math.PI * 2); g.fill();
    if (o.fall > 0 && iso) { g.translate(baseX, baseY); g.rotate(o.fall * 1.2); g.translate(-baseX, -baseY); }
    if (o.acted) g.filter = 'grayscale(.8) brightness(.55)';
    const left = baseX - cw / 2;
    const body = () => { if (u.side === 'enemy') roundRect(g, left, top, cw, chh, Math.min(cw, chh) * .5); else roundRect(g, left, top, cw, chh, Math.min(cw, chh) * .22); };
    const grad = g.createLinearGradient(0, top, 0, top + chh); grad.addColorStop(0, shade(col.body, 1.35)); grad.addColorStop(1, col.body);
    body(); g.fillStyle = grad; g.fill();
    if (iso) { g.fillStyle = '#00000033'; roundRect(g, left + cw * .62, top + 3, cw * .32, chh - 6, 4); g.fill(); }
    g.lineWidth = u.side === 'ally' ? 3 : 2; g.strokeStyle = u.recruitableAs ? '#ffd566' : col.edge; if (u.recruitableAs) g.setLineDash([3, 3]); body(); g.stroke(); g.setLineDash([]);
    if (u.side === 'ally') { g.lineWidth = 1; g.strokeStyle = col.edge; roundRect(g, left + 4, top + 4, cw - 8, chh - 8, 6); g.stroke(); }
    if (u.boss) { g.strokeStyle = '#d4b579'; g.lineWidth = 2; body(); g.stroke(); g.fillStyle = '#d4b579'; const crownW = cw * .6, cy0 = top - 2, cxm = baseX; g.beginPath(); g.moveTo(cxm - crownW / 2, cy0); g.lineTo(cxm - crownW / 2, cy0 - chh * .14); g.lineTo(cxm - crownW / 6, cy0 - chh * .05); g.lineTo(cxm, cy0 - chh * .18); g.lineTo(cxm + crownW / 6, cy0 - chh * .05); g.lineTo(cxm + crownW / 2, cy0 - chh * .14); g.lineTo(cxm + crownW / 2, cy0); g.closePath(); g.fill(); }
    g.fillStyle = col.text; g.font = `700 ${Math.round(Math.min(cw * .62, chh * .5))}px Pretendard, 'Noto Sans KR', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(cls.glyph, baseX, top + chh * (iso ? .42 : .5) + 1);
    g.filter = 'none';
    // 체력 막대
    const bw = cw * 1.1, bh = Math.max(3, geo.th * .08), bx = baseX - bw / 2, by = iso ? top + chh + 3 : baseY + chh / 2 - bh - 2 - o.lift;
    g.fillStyle = '#0b1a1e'; roundRect(g, bx, by, bw, bh, 2); g.fill(); g.fillStyle = col.hp; roundRect(g, bx, by, bw * Math.max(0, Math.min(1, u.hp / u.stats.hp)), bh, 2); g.fill();
    if (o.selected || o.inspected || o.acting) { g.lineWidth = 2; g.strokeStyle = o.acting ? '#ff8a8a' : o.selected ? '#ffffff' : '#ffd566'; if (o.inspected && !o.selected) g.setLineDash([4, 3]); roundRect(g, left - 4, top - 4, cw + 8, chh + 8, 8); g.stroke(); g.setLineDash([]); }
    if (o.flash > 0) { g.globalAlpha = o.alpha * o.flash * .9; g.fillStyle = '#ffffff'; body(); g.fill(); }
    g.restore();
}
export const cellKey = key;
