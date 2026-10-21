'use client';
/**
 * 전기 맵 캔버스 렌더. 두 겹의 캔버스로 그립니다.
 *  - 아래(terrain): 지형을 절차적으로 그린 그림(타일이 바뀔 때만 다시 그림).
 *  - 위(units): 유닛 토큰 · 이동 경로 화살표 · 타격 · 회복 · 피해 숫자 · 쓰러짐 연출. 포인터 이벤트를 받지 않습니다.
 * 그 사이에 DOM 칸(접근성 · 초점 · 범위 색)이 놓입니다(battle-screen.tsx). 엔진 상태는 바꾸지 않고 보여 주기만 합니다.
 * 애니메이션은 play()로 넘기고, prefers-reduced-motion이면 즉시 끝납니다.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { BattleUnit, CombatResult, Pos } from '@/game/srpg/engine/types';
import { classDef } from '@/game/srpg/data/classes';
export type MapAnim = { kind: 'move'; uid: string; path: Pos[] } | { kind: 'combat'; result: CombatResult } | { kind: 'event'; x: number; y: number; text: string; color?: string };
export interface MapCanvasHandle { play: (anims: MapAnim[]) => Promise<void>; busy: () => boolean }
interface Props { tiles: string[]; units: BattleUnit[]; tile: number; goal: Pos | null; used: Set<string>; path: Pos[] | null; selectedUid: string | null; inspectedUid: string | null; actingUid: string | null; showGrid: boolean; speed: 'normal' | 'fast'; reducedMotion: boolean }
type Disp = { x: number; y: number; alpha: number; flash: number; shake: number; lift: number; glow: number };
type Popup = { x: number; y: number; text: string; color: string; t0: number; dur: number; big: boolean };
type Ring = { x: number; y: number; t0: number; dur: number; color: string };
const SIDE_COLORS = { player: { body: '#1d4a5e', edge: '#4fa3c7', text: '#e6f6ff', hp: '#6fcf97' }, enemy: { body: '#5c2626', edge: '#d46a6a', text: '#ffe6e6', hp: '#ef8c85' }, ally: { body: '#2f5a30', edge: '#7ad57a', text: '#e9ffe9', hp: '#a4e9ba' } } as const;
const hash = (x: number, y: number, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const ease = (t: number) => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const key = (x: number, y: number) => `${x},${y}`;
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
    // ── 지형 ──
    const drawTerrain = useCallback(() => {
        const c = terrainRef.current; if (!c) return;
        const { tiles, tile, showGrid } = propsRef.current;
        const w = tiles[0].length, h = tiles.length, dpr = Math.min(2, window.devicePixelRatio || 1);
        const k = `${tiles.join('|')}:${tile}:${dpr}:${showGrid}`;
        if (terrainKey.current === k) return; terrainKey.current = k;
        c.width = w * tile * dpr; c.height = h * tile * dpr; c.style.width = `${w * tile}px`; c.style.height = `${h * tile}px`;
        const g = c.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const at = (x: number, y: number) => tiles[y]?.[x] ?? '#';
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) drawTile(g, at, x, y, tile);
        if (showGrid) { g.strokeStyle = '#0b1a1e55'; g.lineWidth = 1; for (let x = 0; x <= w; x++) { g.beginPath(); g.moveTo(x * tile + .5, 0); g.lineTo(x * tile + .5, h * tile); g.stroke(); } for (let y = 0; y <= h; y++) { g.beginPath(); g.moveTo(0, y * tile + .5); g.lineTo(w * tile, y * tile + .5); g.stroke(); } }
    }, []);
    // ── 유닛 · 연출 ──
    const drawUnits = useCallback(() => {
        const c = unitsRef.current; if (!c) return;
        const p = propsRef.current; const { tiles, tile, units } = p;
        const w = tiles[0].length, h = tiles.length, dpr = Math.min(2, window.devicePixelRatio || 1);
        if (c.width !== w * tile * dpr || c.height !== h * tile * dpr) { c.width = w * tile * dpr; c.height = h * tile * dpr; c.style.width = `${w * tile}px`; c.style.height = `${h * tile}px`; }
        const g = c.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w * tile, h * tile);
        const t = now();
        // 사라진 유닛은 유령으로 남겨 서서히 지웁니다(쓰러짐 · 도주 · 탈출).
        const present = new Set<string>();
        for (const u of units) { if (u.hp > 0 && u.x >= 0) present.add(u.uid); }
        for (const [uid, u] of lastUnits.current) if (!present.has(uid) && disp.current.has(uid) && !ghosts.current.has(uid)) ghosts.current.set(uid, { d: { ...disp.current.get(uid)! }, u, t0: t });
        lastUnits.current = new Map(units.filter(u => u.hp > 0 && u.x >= 0).map(u => [u.uid, u]));
        // 목표 칸
        if (p.goal) { const [gx, gy] = p.goal; g.save(); g.strokeStyle = '#d4b579'; g.lineWidth = 2; const s = tile * .22, X = gx * tile + 3, Y = gy * tile + 3, R = X + tile - 6, B = Y + tile - 6; for (const [ax, ay, bx, by, cx, cy] of [[X, Y + s, X, Y, X + s, Y], [R - s, Y, R, Y, R, Y + s], [X, B - s, X, B, X + s, B], [R - s, B, R, B, R, B - s]]) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(cx, cy); g.stroke(); } g.restore(); }
        // 다 쓴 민가 · 상자
        for (const k of p.used) { const [x, y] = k.split(',').map(Number); g.fillStyle = '#0b1a1e66'; g.fillRect(x * tile, y * tile, tile, tile); }
        // 이동 경로 화살표
        if (p.path && p.path.length > 1) drawPath(g, p.path, tile);
        // 유령(쓰러진 유닛)
        for (const [uid, gh] of ghosts.current) { const k = p.reducedMotion ? 1 : Math.min(1, (t - gh.t0) / 520); if (k >= 1) { ghosts.current.delete(uid); disp.current.delete(uid); continue; } drawToken(g, gh.u, gh.d.x, gh.d.y, tile, { alpha: 1 - k, lift: k * tile * .3, flash: 0, shake: 0, glow: 0, acted: false, selected: false, inspected: false, acting: false }); }
        // 유닛
        const sorted = [...units].filter(u => u.hp > 0 && u.x >= 0).sort((a, b) => a.y - b.y);
        for (const u of sorted) {
            let d = disp.current.get(u.uid);
            if (!d) { d = { x: u.x, y: u.y, alpha: 1, flash: 0, shake: 0, lift: 0, glow: 0 }; disp.current.set(u.uid, d); }
            if (!(tweens.current.has(u.uid))) { d.x = u.x; d.y = u.y; }
            drawToken(g, u, d.x, d.y, tile, { alpha: d.alpha, lift: d.lift, flash: d.flash, shake: d.shake, glow: d.glow, acted: u.acted && u.side === 'player', selected: p.selectedUid === u.uid, inspected: p.inspectedUid === u.uid, acting: p.actingUid === u.uid });
            d.flash = Math.max(0, d.flash - .08); d.shake = Math.max(0, d.shake - .6); d.glow = Math.max(0, d.glow - .05);
        }
        // 고리 · 숫자
        rings.current = rings.current.filter(r => t - r.t0 < r.dur);
        for (const r of rings.current) { const k = (t - r.t0) / r.dur; g.save(); g.globalAlpha = 1 - k; g.strokeStyle = r.color; g.lineWidth = 2; g.beginPath(); g.arc(r.x * tile + tile / 2, r.y * tile + tile / 2, tile * (.25 + k * .45), 0, Math.PI * 2); g.stroke(); g.restore(); }
        popups.current = popups.current.filter(pp => t - pp.t0 < pp.dur);
        for (const pp of popups.current) { const k = (t - pp.t0) / pp.dur; const a = k < .15 ? k / .15 : k > .8 ? (1 - k) / .2 : 1; g.save(); g.globalAlpha = a; g.font = `700 ${pp.big ? Math.round(tile * .42) : Math.round(tile * .34)}px Pretendard, 'Noto Sans KR', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; const cx = pp.x * tile + tile / 2, cy = pp.y * tile + tile * .1 - k * tile * .6; const tw = g.measureText(pp.text).width + 10, th = tile * .4; g.fillStyle = '#000000aa'; roundRect(g, cx - tw / 2, cy - th / 2, tw, th, 4); g.fill(); g.fillStyle = pp.color; g.fillText(pp.text, cx, cy + 1); g.restore(); }
    }, []);
    const active = () => tweens.current.size > 0 || popups.current.length > 0 || rings.current.length > 0 || ghosts.current.size > 0 || [...disp.current.values()].some(d => d.flash > 0 || d.shake > 0 || d.glow > 0);
    const loop = useCallback(() => { drawUnits(); if (active()) { raf.current = requestAnimationFrame(loop); } else running.current = false; }, [drawUnits]);
    const kick = useCallback(() => { if (running.current) return; running.current = true; raf.current = requestAnimationFrame(loop); }, [loop]);
    useEffect(() => { drawTerrain(); drawUnits(); if (active()) kick(); });
    useEffect(() => () => cancelAnimationFrame(raf.current), []);
    const dur = (ms: number) => propsRef.current.reducedMotion ? 0 : propsRef.current.speed === 'fast' ? ms * .4 : ms;
    const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    const moveAlong = async (uid: string, path: Pos[]) => {
        const d = disp.current.get(uid); if (!d || path.length < 2) { if (d) { const last = path[path.length - 1]; if (last) { d.x = last[0]; d.y = last[1]; } } return; }
        tweens.current.set(uid, true); kick();
        const per = dur(85);
        for (let i = 1; i < path.length; i++) {
            const [ax, ay] = path[i - 1], [bx, by] = path[i];
            if (per === 0) { d.x = bx; d.y = by; continue; }
            const t0 = now();
            await new Promise<void>(res => { const step = () => { const k = Math.min(1, (now() - t0) / per), e = ease(k); d.x = ax + (bx - ax) * e; d.y = ay + (by - ay) * e; d.lift = Math.sin(k * Math.PI) * tileLift(); if (k < 1) requestAnimationFrame(step); else { d.lift = 0; res(); } }; step(); });
        }
        tweens.current.delete(uid);
    };
    const tileLift = () => propsRef.current.tile * .12;
    const combat = async (r: CombatResult) => {
        const perStrike = dur(420);
        for (const s of r.strikes) {
            const a = disp.current.get(s.attacker), d = disp.current.get(s.defender);
            if (!a || !d) continue;
            const ax0 = a.x, ay0 = a.y, dx = Math.sign(d.x - a.x), dy = Math.sign(d.y - a.y);
            tweens.current.set(s.attacker, true); kick();
            if (perStrike > 0) {
                const t0 = now(), lunge = perStrike * .45;
                await new Promise<void>(res => { const step = () => { const k = Math.min(1, (now() - t0) / lunge); const off = Math.sin(k * Math.PI) * (s.heal ? .12 : .34); a.x = ax0 + dx * off; a.y = ay0 + dy * off; if (k < 1) requestAnimationFrame(step); else res(); }; step(); });
            }
            a.x = ax0; a.y = ay0; tweens.current.delete(s.attacker);
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
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
/** 지형 한 칸. 장식은 좌표 해시로 정해 같은 맵은 늘 같게 보입니다. */
function drawTile(g: CanvasRenderingContext2D, at: (x: number, y: number) => string, x: number, y: number, t: number) {
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
        case 'S': { grass(); stone('#4a4a52', '#5b5b63'); g.fillStyle = '#2c4a3e'; g.fillRect(X + t * .22, Y + t * .22, t * .56, t * .56); g.fillStyle = '#6a6a74'; for (let i = 0; i < 4; i++) { g.fillRect(X + t * (.05 + i * .25), Y + t * .02, t * .14, t * .12); } break; }
        case 'H': { grass(); g.fillStyle = '#7a5c3a'; g.fillRect(X + t * .2, Y + t * .45, t * .6, t * .42); g.fillStyle = '#a23f2f'; g.beginPath(); g.moveTo(X + t * .12, Y + t * .48); g.lineTo(X + t * .5, Y + t * .14); g.lineTo(X + t * .88, Y + t * .48); g.closePath(); g.fill(); g.fillStyle = '#3b2410'; g.fillRect(X + t * .42, Y + t * .62, t * .16, t * .25); g.fillStyle = '#f2d36b'; g.fillRect(X + t * .26, Y + t * .55, t * .1, t * .1); break; }
        case 'R': { grass(); g.fillStyle = '#566660'; g.fillRect(X + t * .18, Y + t * .3, t * .14, t * .55); g.fillRect(X + t * .62, Y + t * .45, t * .14, t * .4); g.fillStyle = '#3f4a44'; g.fillRect(X + t * .12, Y + t * .78, t * .76, t * .1); g.fillRect(X + t * .4, Y + t * .6, t * .14, t * .14); break; }
        case 'C': { grass(); g.fillStyle = '#7a5c3a'; roundRect(g, X + t * .2, Y + t * .32, t * .6, t * .46, t * .08); g.fill(); g.fillStyle = '#5a3f22'; g.fillRect(X + t * .2, Y + t * .5, t * .6, t * .06); g.fillStyle = '#d4b579'; g.fillRect(X + t * .44, Y + t * .44, t * .12, t * .16); break; }
        case 'X': { g.fillStyle = '#3a2f2a'; g.fillRect(X, Y, t, t); g.fillStyle = '#2a211d'; g.fillRect(X + t * .2, Y + t * .55, t * .6, t * .3); g.fillStyle = '#5a4a40'; g.fillRect(X + t * .3, Y + t * .35, t * .1, t * .5); break; }
        default: grass();
    }
}
function drawPath(g: CanvasRenderingContext2D, path: Pos[], t: number) {
    g.save(); g.strokeStyle = '#8fd3ef'; g.lineWidth = Math.max(3, t * .12); g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = .85;
    g.beginPath(); path.forEach(([x, y], i) => { const cx = x * t + t / 2, cy = y * t + t / 2; if (i === 0) g.moveTo(cx, cy); else g.lineTo(cx, cy); }); g.stroke();
    const [lx, ly] = path[path.length - 1], [px, py] = path[path.length - 2]; const cx = lx * t + t / 2, cy = ly * t + t / 2, ang = Math.atan2(ly - py, lx - px), s = t * .22;
    g.fillStyle = '#8fd3ef'; g.beginPath(); g.moveTo(cx + Math.cos(ang) * s, cy + Math.sin(ang) * s); g.lineTo(cx + Math.cos(ang + 2.5) * s, cy + Math.sin(ang + 2.5) * s); g.lineTo(cx + Math.cos(ang - 2.5) * s, cy + Math.sin(ang - 2.5) * s); g.closePath(); g.fill(); g.restore();
}
/** 유닛 토큰: 편은 색과 모양(아군 네모 · 적 동그라미 · 중립 겹테두리)으로 구분합니다(HIG: 색만으로 뜻을 전하지 않음). */
function drawToken(g: CanvasRenderingContext2D, u: BattleUnit, x: number, y: number, t: number, o: { alpha: number; lift: number; flash: number; shake: number; glow: number; acted: boolean; selected: boolean; inspected: boolean; acting: boolean }) {
    const cls = classDef(u.classId), col = SIDE_COLORS[u.side];
    const sx = o.shake ? (Math.random() - .5) * o.shake : 0, sy = o.shake ? (Math.random() - .5) * o.shake : 0;
    const cx = x * t + t / 2 + sx, cy = y * t + t / 2 - o.lift + sy, size = t * .68, half = size / 2;
    g.save(); g.globalAlpha = o.alpha;
    if (o.acted) g.filter = 'grayscale(.8) brightness(.55)';
    // 그림자
    g.fillStyle = '#00000066'; g.beginPath(); g.ellipse(x * t + t / 2, y * t + t * .86, half * .8, half * .28, 0, 0, Math.PI * 2); g.fill();
    // 몸통
    const body = () => { if (u.side === 'enemy') { g.beginPath(); g.arc(cx, cy, half, 0, Math.PI * 2); } else roundRect(g, cx - half, cy - half, size, size, size * .22); };
    const grad = g.createLinearGradient(cx, cy - half, cx, cy + half); grad.addColorStop(0, lighten(col.body)); grad.addColorStop(1, col.body);
    body(); g.fillStyle = grad; g.fill();
    g.lineWidth = u.side === 'ally' ? 3 : 2; g.strokeStyle = u.recruitableAs ? '#ffd566' : col.edge; if (u.recruitableAs) g.setLineDash([3, 3]); body(); g.stroke(); g.setLineDash([]);
    if (u.side === 'ally') { g.lineWidth = 1; g.strokeStyle = col.edge; roundRect(g, cx - half + 4, cy - half + 4, size - 8, size - 8, size * .16); g.stroke(); }
    if (u.boss) { g.strokeStyle = '#d4b579'; g.lineWidth = 2; body(); g.stroke(); g.fillStyle = '#d4b579'; const cw = size * .5, cy0 = cy - half - 2; g.beginPath(); g.moveTo(cx - cw / 2, cy0); g.lineTo(cx - cw / 2, cy0 - size * .18); g.lineTo(cx - cw / 6, cy0 - size * .06); g.lineTo(cx, cy0 - size * .22); g.lineTo(cx + cw / 6, cy0 - size * .06); g.lineTo(cx + cw / 2, cy0 - size * .18); g.lineTo(cx + cw / 2, cy0); g.closePath(); g.fill(); }
    // 글자
    g.fillStyle = col.text; g.font = `700 ${Math.round(t * .38)}px Pretendard, 'Noto Sans KR', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(cls.glyph, cx, cy + 1);
    g.filter = 'none';
    // 체력 막대
    const bw = t * .76, bh = Math.max(3, t * .08), bx = x * t + (t - bw) / 2, by = y * t + t * .88 - o.lift + sy;
    g.fillStyle = '#0b1a1e'; roundRect(g, bx, by, bw, bh, 2); g.fill(); g.fillStyle = col.hp; roundRect(g, bx, by, bw * Math.max(0, Math.min(1, u.hp / u.stats.hp)), bh, 2); g.fill();
    // 상태 테두리
    if (o.selected || o.inspected || o.acting) { g.lineWidth = 2; g.strokeStyle = o.acting ? '#ff8a8a' : o.selected ? '#ffffff' : '#ffd566'; if (o.inspected && !o.selected) g.setLineDash([4, 3]); roundRect(g, cx - half - 4, cy - half - 4, size + 8, size + 8, size * .26); g.stroke(); g.setLineDash([]); }
    if (o.flash > 0) { g.globalAlpha = o.alpha * o.flash * .9; g.fillStyle = '#ffffff'; body(); g.fill(); }
    g.restore();
}
function lighten(hex: string) { const n = parseInt(hex.slice(1), 16); const r = Math.min(255, (n >> 16) + 40), gg = Math.min(255, ((n >> 8) & 255) + 40), b = Math.min(255, (n & 255) + 40); return `rgb(${r},${gg},${b})`; }
export const cellKey = key;
