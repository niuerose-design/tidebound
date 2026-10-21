'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Battle, BattleUnit, Line, Mode, Pos } from '@/game/srpg/engine/types';
import { CHAPTER_MAP } from '@/game/srpg/data/chapters/index';
import { classDef, SKILL_TEXT } from '@/game/srpg/data/classes';
import { itemDef } from '@/game/srpg/data/items';
import { UNIT_MAP } from '@/game/srpg/data/units';
import { TERRAIN, terrainAt, manhattan } from '@/game/srpg/engine/terrain';
import { key, unkey, threatCells, moveRange, hostile, pathTo } from '@/game/srpg/engine/grid';
import { forecast, attackRange, allWeaponRange, unitAt, staffRange, healAmount } from '@/game/srpg/engine/combat';
import { weaponOf, attackWeapon, canWield } from '@/game/srpg/engine/unit';
import * as B from '@/game/srpg/engine/battle';
import { enemyStep } from '@/game/srpg/engine/ai';
import { saveSession, loadPrefs, savePrefs, tileSizes, type Session, type Prefs } from './storage';
import { ConfirmButton } from '@/components/game/confirm-button';
import { MapCanvas, type MapCanvasHandle, type MapAnim } from './map-canvas';
import { StatGrid, UnitHeader, ItemList } from './unit-sheet';
import { DialogueBox } from './dialogue';
type Ui =
    | { kind: 'idle' }
    | { kind: 'selected'; uid: string; stoppable: Set<string>; threat: Set<string>; prev: Map<string, string>; budget?: number }
    | { kind: 'menu'; uid: string; preMove: Battle; remaining: number }
    | { kind: 'weapon'; uid: string; preMove: Battle; remaining: number; options: number[] }
    | { kind: 'target'; uid: string; preMove: Battle; remaining: number; action: 'attack' | 'heal' | 'talk' | 'trade'; targets: string[] }
    | { kind: 'forecast'; uid: string; preMove: Battle; remaining: number; target: string; targets: string[] }
    | { kind: 'items'; uid: string; preMove: Battle; remaining: number }
    | { kind: 'trade'; uid: string; other: string; preMove: Battle; remaining: number }
    | { kind: 'door'; uid: string; preMove: Battle; remaining: number; doors: Pos[] }
    | { kind: 'enemy' };
const MAX_SNAPSHOTS = 8;
const PHASE_MS: Record<Prefs['speed'], number> = { normal: 360, fast: 120 };
/** 전투 화면. 상태 전이는 모두 엔진 함수로 하고, 여기서는 선택 · 연출 · 저장만 합니다. */
export function BattleScreen({ session, onEnd, onAbandon }: { session: Session; mode: Mode; onEnd: (b: Battle) => void; onAbandon: () => void }) {
    const ch = CHAPTER_MAP[session.chapterId];
    const [battle, setBattle] = useState<Battle>(() => ({ ...session.battle, pending: [] }));
    const [snapshots, setSnapshots] = useState<Battle[]>(session.snapshots);
    const [ui, setUi] = useState<Ui>({ kind: 'idle' });
    const [dialogue, setDialogue] = useState<Line[] | null>(() => session.battle.pending.length ? session.battle.pending : null);
    const [notice, setNotice] = useState<string | null>(null);
    const [banner, setBanner] = useState<string | null>(() => session.battle.turn === 1 ? `${ch.number}장 ${ch.title}` : null);
    const [inspect, setInspect] = useState<string | null>(null);
    const [acting, setActing] = useState<string | null>(null);
    const [showLog, setShowLog] = useState(false);
    const [ended, setEnded] = useState<Battle | null>(null);
    const [prefs, setPrefs] = useState<Prefs>(() => typeof window === 'undefined' ? { tile: 44, speed: 'normal', showGrid: true } : loadPrefs());
    const [sizes] = useState<number[]>(() => tileSizes());
    const [hoverPath, setHoverPath] = useState<Pos[] | null>(null);
    const [reducedMotion] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const canvas = useRef<MapCanvasHandle>(null), scrollBox = useRef<HTMLDivElement>(null);
    /** 연출은 순서대로 이어 붙입니다(이동 → 전투 → 다음 적). 상태는 즉시 바뀌고 그림만 뒤따릅니다. */
    const animQueue = useRef<Promise<void>>(Promise.resolve());
    const cancelled = useRef(false);
    // StrictMode(개발)는 효과를 두 번 실행하므로 마운트 때 다시 false로 둡니다.
    useEffect(() => { cancelled.current = false; return () => { cancelled.current = true; }; }, []);
    const queueAnim = useCallback((anims: MapAnim[]) => { animQueue.current = animQueue.current.then(() => canvas.current?.play(anims)).catch(() => undefined); return animQueue.current; }, []);
    /** 적 턴 카메라: 움직이는 유닛이 보이게 맵 스크롤을 따라갑니다. */
    const follow = useCallback((x: number, y: number) => { const el = scrollBox.current; if (!el) return; const t = prefs.tile; const left = x * t + t / 2 - el.clientWidth / 2, top = y * t + t / 2 - el.clientHeight / 2; el.scrollTo({ left: Math.max(0, left), top: Math.max(0, top), behavior: reducedMotion ? 'auto' : 'smooth' }); }, [prefs.tile, reducedMotion]);
    const persist = useCallback((b: Battle, snaps: Battle[]) => saveSession({ chapterId: ch.id, battle: b, snapshots: snaps, deployed: session.deployed }), [ch.id, session.deployed]);
    /** 엔진 결과 반영: 대사 · 배너 · 저장 · 종료 판정. */
    const commit = useCallback((next: Battle, snaps?: Battle[]) => {
        const lines = next.pending;
        const cleaned = { ...next, pending: [] };
        setBattle(cleaned);
        if (lines.length) setDialogue(prev => prev ? [...prev, ...lines] : lines);
        if (next.pendingNotice) { setNotice(next.pendingNotice); cleaned.pendingNotice = null; }
        if (next.lastCombat) { queueAnim([{ kind: 'combat', result: next.lastCombat }]); cleaned.lastCombat = null; }
        const s = snaps ?? snapshots;
        if (snaps) setSnapshots(snaps);
        persist(cleaned, s);
        if (cleaned.status !== 'playing') setEnded(cleaned);
        return cleaned;
    }, [persist, snapshots, queueAnim]);
    const act = useCallback((fn: () => Battle, snaps?: Battle[]) => { try { return commit(fn(), snaps); } catch (e) { toast.error((e as Error).message); return null; } }, [commit]);
    const unit = (uid: string) => battle.units.find(u => u.uid === uid)!;
    const selectUnit = (u: BattleUnit, budget?: number) => {
        const r = moveRange(battle.tiles, u, battle.units, budget);
        const threat = threatCells(battle.tiles, r.stoppable, allWeaponRange(u));
        setUi({ kind: 'selected', uid: u.uid, stoppable: r.stoppable, threat, prev: r.prev, budget });
        setInspect(u.uid); setHoverPath(null);
    };
    const toMenu = (b: Battle, uid: string, preMove: Battle, remaining: number) => { setUi({ kind: 'menu', uid, preMove, remaining }); return b; };
    const cancelToSelected = (pre: Battle, uid: string) => { setBattle(pre); const u = pre.units.find(x => x.uid === uid)!; const r = moveRange(pre.tiles, u, pre.units); setUi({ kind: 'selected', uid, stoppable: r.stoppable, threat: threatCells(pre.tiles, r.stoppable, allWeaponRange(u)), prev: r.prev }); };
    /** 행동을 마친 뒤: 재이동(canto)이 남았으면 이동 선택으로, 아니면 대기. */
    const afterAction = (b: Battle | null, uid: string, remaining: number) => {
        if (!b || b.status !== 'playing') { setUi({ kind: 'idle' }); return; }
        const u = b.units.find(x => x.uid === uid);
        if (u && u.hp > 0 && B.hasCanto(u) && remaining > 0) { const r = moveRange(b.tiles, u, b.units, remaining); setUi({ kind: 'selected', uid, stoppable: r.stoppable, threat: new Set(), prev: r.prev, budget: remaining }); }
        else setUi({ kind: 'idle' });
    };
    // ── 맵 클릭 ──
    const onCell = (x: number, y: number) => {
        if (dialogue || ended || ui.kind === 'enemy' || battle.phase !== 'player') return;
        const here = unitAt(battle, x, y);
        if (ui.kind === 'idle') {
            if (here && here.side === 'player' && !here.acted) selectUnit(here);
            else setInspect(here ? here.uid : null);
            return;
        }
        if (ui.kind === 'selected') {
            const u = unit(ui.uid);
            if (ui.stoppable.has(key(x, y))) {
                const pre = battle;
                const r = moveRange(battle.tiles, u, battle.units, ui.budget);
                const remaining = r.reach.get(key(x, y)) ?? 0;
                const path = pathTo(r.prev, [u.x, u.y], [x, y]);
                queueAnim([{ kind: 'move', uid: ui.uid, path }]);
                setHoverPath(null);
                const moved = act(() => B.moveUnit(battle, ui.uid, [x, y], ui.budget));
                if (!moved) return;
                if (ui.budget !== undefined) { setUi({ kind: 'idle' }); return; } // 재이동은 이동으로 끝
                toMenu(moved, ui.uid, pre, remaining);
            } else if (here && here.side === 'player' && !here.acted) selectUnit(here);
            else { setUi({ kind: 'idle' }); setInspect(here ? here.uid : null); }
            return;
        }
        if (ui.kind === 'target') {
            if (here && ui.targets.includes(here.uid)) {
                if (ui.action === 'attack') setUi({ ...ui, kind: 'forecast', target: here.uid });
                else if (ui.action === 'heal') { const b = act(() => B.heal(battle, ui.uid, here.uid)); afterAction(b, ui.uid, ui.remaining); }
                else if (ui.action === 'talk') { const b = act(() => B.talk(battle, ui.uid, here.uid, ch)); afterAction(b, ui.uid, ui.remaining); }
                else if (ui.action === 'trade') setUi({ kind: 'trade', uid: ui.uid, other: here.uid, preMove: ui.preMove, remaining: ui.remaining });
            } else setUi({ kind: 'menu', uid: ui.uid, preMove: ui.preMove, remaining: ui.remaining });
            return;
        }
        if (ui.kind === 'forecast') { if (here && ui.targets.includes(here.uid)) setUi({ ...ui, target: here.uid }); else setUi({ kind: 'target', uid: ui.uid, preMove: ui.preMove, remaining: ui.remaining, action: 'attack', targets: ui.targets }); return; }
        if (ui.kind === 'door') { const d = ui.doors.find(p => p[0] === x && p[1] === y); if (d) { const b = act(() => B.openDoor(battle, ui.uid, d)); afterAction(b, ui.uid, ui.remaining); } else setUi({ kind: 'menu', uid: ui.uid, preMove: ui.preMove, remaining: ui.remaining }); return; }
    };
    // ── 메뉴 ──
    const menuActions = (() => {
        if (ui.kind !== 'menu') return [];
        const u = unit(ui.uid);
        const out: { id: string; label: string; run: () => void }[] = [];
        const weapons = B.usableWeapons(battle, u);
        if (weapons.length) out.push({ id: 'attack', label: '공격', run: () => { if (weapons.length === 1) { const b = weapons[0] === u.equipped ? battle : B.equip(battle, u.uid, weapons[0]); setBattle(b); setUi({ kind: 'target', uid: u.uid, preMove: ui.preMove, remaining: ui.remaining, action: 'attack', targets: B.attackTargets(b, b.units.find(x => x.uid === u.uid)!).map(t => t.uid) }); } else setUi({ kind: 'weapon', uid: u.uid, preMove: ui.preMove, remaining: ui.remaining, options: weapons }); } });
        const heals = B.healTargets(battle, u);
        if (heals.length) out.push({ id: 'heal', label: '지팡이', run: () => setUi({ kind: 'target', uid: u.uid, preMove: ui.preMove, remaining: ui.remaining, action: 'heal', targets: heals.map(t => t.uid) }) });
        const talks = B.talkTargets(battle, u);
        if (talks.length) out.push({ id: 'talk', label: `대화 (${talks.map(t => t.name).join(', ')})`, run: () => setUi({ kind: 'target', uid: u.uid, preMove: ui.preMove, remaining: ui.remaining, action: 'talk', targets: talks.map(t => t.uid) }) });
        const tile = battle.tiles[u.y][u.x], used = battle.used.includes(key(u.x, u.y));
        if (tile === 'H' && !used) out.push({ id: 'visit', label: '방문', run: () => afterAction(act(() => B.visit(battle, u.uid, ch)), u.uid, ui.remaining) });
        if (tile === 'C' && !used) out.push({ id: 'chest', label: B.hasKey(u, 'key') ? '상자 열기' : '상자 열기 (열쇠 없음)', run: () => afterAction(act(() => B.openChest(battle, u.uid, ch)), u.uid, ui.remaining) });
        const doors = B.adjacentDoors(battle, u);
        if (doors.length && B.hasKey(u, 'door_key')) out.push({ id: 'door', label: '문 열기', run: () => { if (doors.length === 1) afterAction(act(() => B.openDoor(battle, u.uid, doors[0])), u.uid, ui.remaining); else setUi({ kind: 'door', uid: u.uid, preMove: ui.preMove, remaining: ui.remaining, doors }); } });
        if (B.canSeize(battle, u, ch)) out.push({ id: 'seize', label: '점령', run: () => { act(() => B.seize(battle, u.uid, ch)); setUi({ kind: 'idle' }); } });
        if (B.canEscape(battle, u, ch)) out.push({ id: 'escape', label: '탈출', run: () => { act(() => B.escape(battle, u.uid, ch)); setUi({ kind: 'idle' }); } });
        if (u.items.length) out.push({ id: 'items', label: '아이템', run: () => setUi({ kind: 'items', uid: u.uid, preMove: ui.preMove, remaining: ui.remaining }) });
        const allies = battle.units.filter(o => o.hp > 0 && o.uid !== u.uid && !hostile(o.side, u.side) && o.side === 'player' && manhattan(o, u) === 1);
        if (allies.length) out.push({ id: 'trade', label: '교환', run: () => setUi({ kind: 'target', uid: u.uid, preMove: ui.preMove, remaining: ui.remaining, action: 'trade', targets: allies.map(a => a.uid) }) });
        out.push({ id: 'wait', label: '대기', run: () => afterAction(act(() => B.wait(battle, u.uid, ch)), u.uid, ui.remaining) });
        out.push({ id: 'cancel', label: '취소', run: () => cancelToSelected(ui.preMove, u.uid) });
        return out;
    })();
    // ── 적 턴 ──
    const runEnemyPhase = () => {
        if (ui.kind === 'enemy' || dialogue || ended) return;
        const start = act(() => B.endPlayerTurn(battle, ch));
        if (!start || start.status !== 'playing') return;
        setUi({ kind: 'enemy' }); setInspect(null); setHoverPath(null); setBanner('적 행동');
        const run = async () => {
            let cur = start;
            await new Promise(r => setTimeout(r, PHASE_MS[prefs.speed]));
            for (;;) {
                if (cancelled.current) return;
                const { battle: next, action } = enemyStep(cur, ch);
                if (!action) {
                    const fresh = B.startPlayerTurn(next, ch);
                    const snaps = [...snapshots.slice(-(MAX_SNAPSHOTS - 1)), { ...fresh, pending: [] }];
                    commit(fresh, snaps);
                    setActing(null); setUi({ kind: 'idle' }); setBanner(`${fresh.turn}턴`);
                    return;
                }
                setActing(action.uid);
                const mover = next.units.find(u => u.uid === action.uid);
                if (action.path.length > 1) { follow(action.path[action.path.length - 1][0], action.path[action.path.length - 1][1]); queueAnim([{ kind: 'move', uid: action.uid, path: action.path }]); }
                else if (mover && action.kind !== 'wait') follow(mover.x, mover.y);
                if (action.kind === 'loot' && mover) queueAnim([{ kind: 'event', x: mover.x, y: mover.y, text: action.text ?? '약탈' }]);
                const shown = commit(next);
                await animQueue.current;
                if (shown.status !== 'playing') { setActing(null); setUi({ kind: 'idle' }); return; }
                await new Promise(r => setTimeout(r, action.kind === 'wait' ? 0 : PHASE_MS[prefs.speed] * .5));
                cur = shown;
            }
        };
        void run();
    };
    const rewind = () => {
        if (!B.canRewind(battle) || ui.kind === 'enemy' || dialogue) return;
        const last = snapshots[snapshots.length - 1];
        const unchanged = last && JSON.stringify({ ...last, log: [] }) === JSON.stringify({ ...battle, log: [] });
        let target = last, snaps = snapshots;
        if (unchanged && snapshots.length > 1) { snaps = snapshots.slice(0, -1); target = snaps[snaps.length - 1]; }
        if (!target) return;
        const restored = { ...target, rewindsLeft: battle.rewindsLeft - 1, pending: [] };
        snaps = [...snaps.slice(0, -1), restored];
        setUi({ kind: 'idle' }); setInspect(null);
        commit(restored, snaps);
        toast.message(`${restored.turn}턴 시작으로 되감았다 (남은 되감기 ${restored.rewindsLeft})`);
    };
    const changePrefs = (p: Partial<Prefs>) => { const n = { ...prefs, ...p }; setPrefs(n); savePrefs(n); };
    // ── 렌더 보조 ──
    const sel = ui.kind !== 'idle' && ui.kind !== 'enemy' ? unit(ui.uid) : null;
    const inspected = inspect ? battle.units.find(u => u.uid === inspect && u.hp > 0) ?? null : null;
    const inspectThreat = useMemo(() => { if (!inspected || inspected.side === 'player' || ui.kind === 'selected') return new Set<string>(); const r = moveRange(battle.tiles, inspected, battle.units); return threatCells(battle.tiles, r.stoppable, allWeaponRange(inspected)); }, [inspected, battle, ui.kind]);
    const targetSet = useMemo(() => new Set(ui.kind === 'target' || ui.kind === 'forecast' ? ui.targets : []), [ui]);
    const fc = ui.kind === 'forecast' ? forecast(battle, unit(ui.uid), unit(ui.target)) : null;
    const enemiesLeft = battle.units.filter(u => u.side === 'enemy' && u.hp > 0).length;
    const remainingActors = B.remainingActors(battle);
    const tile = prefs.tile;
    const w = ch.map.width, h = ch.map.height;
    const turnsLeft = B.isTurnLimited(ch) ? Math.max(0, ch.objective.turns! - battle.turn + 1) : null;
    useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 1400); return () => clearTimeout(t); }, [banner]);
    useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 2600); return () => clearTimeout(t); }, [notice]);
    /** 마우스가 지나는 칸까지의 이동 경로(이동 선택 중, 갈 수 있는 칸만). */
    const onMapHover = (e: React.MouseEvent<HTMLDivElement>) => {
        if (ui.kind !== 'selected') { if (hoverPath) setHoverPath(null); return; }
        const rect = e.currentTarget.getBoundingClientRect(); const x = Math.floor((e.clientX - rect.left) / tile), y = Math.floor((e.clientY - rect.top) / tile);
        const u = unit(ui.uid); const k = key(x, y);
        if (!ui.stoppable.has(k) || (x === u.x && y === u.y)) { if (hoverPath) setHoverPath(null); return; }
        const last = hoverPath?.[hoverPath.length - 1];
        if (last && last[0] === x && last[1] === y) return;
        setHoverPath(pathTo(ui.prev, [u.x, u.y], [x, y]));
    };
    const usedSet = useMemo(() => new Set(battle.used), [battle.used]);
    /** 키보드 초점: 지금 상태에서 눌러서 뜻이 있는 칸만 Tab 순서에 넣습니다(모든 칸을 넣으면 Tab이 수백 번 필요). */
    const cellFocusable = (x: number, y: number) => {
        const k = key(x, y), here = unitAt(battle, x, y);
        if (ui.kind === 'idle') return !!here;
        if (ui.kind === 'selected') return ui.stoppable.has(k) || (!!here && here.side === 'player' && !here.acted);
        if (ui.kind === 'target' || ui.kind === 'forecast') return !!here && targetSet.has(here.uid);
        if (ui.kind === 'door') return ui.doors.some(d => d[0] === x && d[1] === y);
        return false;
    };
    const cellLabel = (x: number, y: number) => { const here = unitAt(battle, x, y); const t = terrainAt(battle.tiles, x, y).name; return here ? `${x},${y} ${t}, ${here.name} 체력 ${here.hp}/${here.stats.hp}${here.side === 'enemy' ? ' (적)' : here.side === 'ally' ? ' (중립)' : ''}` : `${x},${y} ${t}`; };
    const cellClass = (x: number, y: number) => {
        const k = key(x, y);
        const cls = ['tx-cell'];
        if (ui.kind === 'selected') { if (ui.stoppable.has(k)) cls.push('r-move'); else if (ui.threat.has(k)) cls.push('r-attack'); }
        if (inspectThreat.has(k)) cls.push('r-threat');
        if (targetSet.size && battle.units.some(u => u.hp > 0 && u.x === x && u.y === y && targetSet.has(u.uid))) cls.push('r-target');
        if (ui.kind === 'door' && ui.doors.some(d => d[0] === x && d[1] === y)) cls.push('r-target');
        return cls.join(' ');
    };
    return <div className={`tx-battle ${ui.kind === 'enemy' ? 'enemy-phase' : ''}`}>
        <header className="tx-hud">
            <div className="tx-hud-left"><strong>{ch.number}장 {ch.title}</strong><span>{battle.turn}턴 · {ui.kind === 'enemy' ? '적 행동' : '아군 행동'}</span><span className="tx-objective">{ch.objective.text}{turnsLeft !== null && ` (${turnsLeft}턴 남음)`}</span></div>
            <div className="tx-hud-right">
                <span title="남은 적">적 {enemiesLeft}</span>
                <span title="아직 행동하지 않은 아군">대기 {remainingActors}</span>
                <button type="button" className="secondary small" disabled={!B.canRewind(battle) || ui.kind === 'enemy' || !!dialogue} onClick={rewind} title="이번 턴(또는 이전 턴) 시작으로 되돌립니다">되감기 ({battle.rewindsLeft}회 남음)</button>
                {/* 으뜸 동작은 화면에 하나: 행동 메뉴 · 예측 창이 열려 있으면 그쪽이 으뜸이고 턴 종료는 보조가 됩니다. */}
                <button type="button" className={`${ui.kind === 'idle' || ui.kind === 'enemy' ? 'primary' : 'secondary'} small`} disabled={ui.kind === 'enemy' || !!dialogue || !!ended} onClick={runEnemyPhase}>턴 종료{remainingActors ? ` (${remainingActors}명 남음)` : ''}</button>
                <button type="button" className="text-button" aria-pressed={showLog} onClick={() => setShowLog(v => !v)}>{showLog ? '기록 닫기' : '기록 보기'}</button>
                <button type="button" className="text-button" onClick={() => changePrefs({ tile: sizes[(sizes.indexOf(tile) + 1) % sizes.length] ?? sizes[0] })}>칸 크기 {tile}px</button>
                <button type="button" className="text-button" onClick={() => changePrefs({ speed: prefs.speed === 'normal' ? 'fast' : 'normal' })}>적 턴 {prefs.speed === 'normal' ? '보통' : '빠름'}</button>
                <ConfirmButton className="text-button" label="포기하기" title="이 전투를 포기할까요?" description="전투 진행은 사라지고 베이스로 돌아갑니다. 부대는 출격 전 상태 그대로입니다." confirmLabel="포기하기" disabled={ui.kind === 'enemy'} onConfirm={onAbandon}/>
            </div>
        </header>
        <div className="tx-battle-body">
            <div className="tx-map-scroll" ref={scrollBox}>
                <div className="tx-map" style={{ width: w * tile, height: h * tile, ['--tile' as string]: `${tile}px`, gridTemplateColumns: `repeat(${w}, ${tile}px)` }} onMouseMove={onMapHover} onMouseLeave={() => { if (hoverPath) setHoverPath(null); }}>
                    <MapCanvas ref={canvas} tiles={battle.tiles} units={battle.units} tile={tile} goal={ch.objective.target_pos} used={usedSet} path={hoverPath} selectedUid={sel?.uid ?? null} inspectedUid={inspected?.uid ?? null} actingUid={acting} showGrid={prefs.showGrid} speed={prefs.speed} reducedMotion={reducedMotion}/>
                    {battle.tiles.map((row, y) => [...row].map((_, x) => { const focusable = cellFocusable(x, y); return <div key={`${x},${y}`} className={cellClass(x, y)} onClick={() => onCell(x, y)} role="button" tabIndex={focusable ? 0 : -1} aria-label={cellLabel(x, y)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCell(x, y); } }}/>; }))}
                </div>
            </div>
            <aside className="tx-side">
                {ui.kind === 'menu' && <div className="tx-menu" role="menu">{menuActions.map(a => <button type="button" key={a.id} className={a.id === 'cancel' ? 'text-button' : 'secondary'} onClick={a.run}>{a.label}</button>)}</div>}
                {ui.kind === 'weapon' && <div className="tx-menu"><strong>무기 선택</strong>{ui.options.map(i => { const it = sel!.items[i], d = itemDef(it.id); return <button type="button" key={it.n} className="secondary" onClick={() => { const b = B.equip(battle, ui.uid, i); setBattle(b); setUi({ kind: 'target', uid: ui.uid, preMove: ui.preMove, remaining: ui.remaining, action: 'attack', targets: B.attackTargets(b, b.units.find(x => x.uid === ui.uid)!).map(t => t.uid) }); }}>{d.name} <small>위력 {d.weapon!.might} 명중 {d.weapon!.hit} 사거리 {d.weapon!.range.join('~')}</small></button>; })}<button type="button" className="text-button" onClick={() => setUi({ kind: 'menu', uid: ui.uid, preMove: ui.preMove, remaining: ui.remaining })}>뒤로</button></div>}
                {ui.kind === 'target' && <div className="tx-menu"><strong>{{ attack: '공격할 상대', heal: '회복할 아군', talk: '대화할 상대', trade: '교환할 아군' }[ui.action]}를 맵에서 누르세요</strong>{ui.targets.map(t => { const o = unit(t); return <button type="button" key={t} className="secondary" onClick={() => onCell(o.x, o.y)}>{o.name} <small>{o.hp}/{o.stats.hp}</small></button>; })}<button type="button" className="text-button" onClick={() => setUi({ kind: 'menu', uid: ui.uid, preMove: ui.preMove, remaining: ui.remaining })}>뒤로</button></div>}
                {ui.kind === 'door' && <div className="tx-menu"><strong>열 문을 맵에서 누르세요</strong><button type="button" className="text-button" onClick={() => setUi({ kind: 'menu', uid: ui.uid, preMove: ui.preMove, remaining: ui.remaining })}>뒤로</button></div>}
                {ui.kind === 'forecast' && fc && sel && <ForecastPanel a={sel} d={unit(ui.target)} fc={fc} onConfirm={() => { const b = act(() => B.attack(battle, ui.uid, ui.target, ch)); afterAction(b, ui.uid, ui.remaining); }} onCancel={() => setUi({ kind: 'target', uid: ui.uid, preMove: ui.preMove, remaining: ui.remaining, action: 'attack', targets: ui.targets })}/>}
                {ui.kind === 'items' && sel && <div className="tx-menu tx-item-menu"><strong>아이템</strong><ItemList u={sel} action={i => { const d = itemDef(sel.items[i].id); return <span className="tx-row-actions">{d.weapon && canWield(classDef(sel.classId), d) && sel.equipped !== i && <button type="button" className="text-button" onClick={() => setBattle(B.equip(battle, sel.uid, i))}>장착</button>}{(d.kind === 'vulnerary' || d.kind === 'boost') && <button type="button" className="text-button" onClick={() => afterAction(act(() => B.consumeItem(battle, sel.uid, i, ch)), sel.uid, ui.remaining)}>사용</button>}</span>; }}/><button type="button" className="text-button" onClick={() => setUi({ kind: 'menu', uid: ui.uid, preMove: ui.preMove, remaining: ui.remaining })}>뒤로</button></div>}
                {ui.kind === 'trade' && sel && <TradePanel a={sel} b={unit(ui.other)} onMove={(give, take) => { const nb = act(() => B.trade(battle, sel.uid, ui.other, give, take)); if (nb) setUi({ ...ui }); }} onDone={() => setUi({ kind: 'menu', uid: ui.uid, preMove: ui.preMove, remaining: ui.remaining })}/>}
                {(ui.kind === 'idle' || ui.kind === 'selected' || ui.kind === 'enemy') && (inspected ? <UnitPanel u={inspected} battle={battle}/> : <div className="tx-help"><strong>{ui.kind === 'enemy' ? '적이 움직이는 중' : '아군을 눌러 행동을 고르세요'}</strong><p>파란 칸 = 이동 가능, 빨간 칸 = 공격 범위. 아군은 네모, 적은 동그라미, 중립은 겹테두리입니다. 적을 누르면 그 적의 위협 범위가 보입니다. 행동을 마친 유닛은 어두워집니다.</p><p className="tx-note">{ch.objective.text} · 패배: {ch.defeat_conditions.join(', ')}</p></div>)}
                {showLog && <div className="tx-log"><strong>기록</strong><ul>{battle.log.slice(-40).reverse().map((l, i) => <li key={i} className={`k-${l.kind}`}><small>{l.turn}</small>{l.text}</li>)}</ul></div>}
            </aside>
        </div>
        {banner && <div className="tx-banner" aria-live="polite">{banner}</div>}
        {notice && <div className="tx-notice" role="status">{notice}</div>}
        {dialogue && <DialogueBox lines={dialogue} onDone={() => { setDialogue(null); persist(battle, snapshots); }}/>}
        {!dialogue && ended && <div className="tx-overlay"><div className="tx-end">
            <p className="eyebrow">{ended.status === 'won' ? '승리' : '패배'}</p>
            <h2>{ended.status === 'won' ? `${ch.title} — ${ended.turn}턴 만에 끝났다` : ended.lostReason}</h2>
            {ended.status === 'won' ? <button type="button" className="primary" onClick={() => onEnd(ended)}>결과 보기</button> : <div className="tx-row"><button type="button" className="primary" onClick={onAbandon}>베이스로 돌아가 다시 출격</button></div>}
        </div></div>}
    </div>;
}
function UnitPanel({ u, battle }: { u: BattleUnit; battle: Battle }) {
    const t = terrainAt(battle.tiles, u.x, u.y), cls = classDef(u.classId), def = u.defId ? UNIT_MAP[u.defId] : null;
    const w = weaponOf(u);
    const r = attackRange(u), sr = staffRange(u);
    return <div className="tx-unit-panel">
        <UnitHeader u={u}/>
        <StatGrid u={u} compact/>
        <p className="tx-skill"><b>지형</b> {t.name} (회피 +{t.avoid}, 수비 +{t.def}{t.heal ? `, 회복 ${t.heal}%` : ''}) · <b>이동</b> {u.move} · <b>사거리</b> {r[1] ? r.join('~') : sr[1] ? `지팡이 ${sr.join('~')}` : '—'}</p>
        <p className="tx-skill"><b>규칙</b> {SKILL_TEXT[cls.skill]}{u.side === 'enemy' && u.stance && <> · <b>태세</b> {{ hold: '제자리', guard: '경계', aggressive: '공격적', charge_on_range: '접근 시 돌격', target_priority: '표적 추적', flee: '약탈 후 도주', boss: '보스' }[u.stance]}</>}{u.recruitableAs && <> · <b className="hl">대화로 영입 가능</b> ({UNIT_MAP[u.recruitableAs]?.recruit.condition_text})</>}</p>
        {w && <p className="tx-skill"><b>장착</b> {w.name}{w.weapon!.heal !== undefined ? ` · 회복 ${healAmount(u, w)}` : ` · 위력 ${w.weapon!.might} 명중 ${w.weapon!.hit} 필살 ${w.weapon!.crit}`}</p>}
        {!w && attackWeapon(u) === null && <p className="tx-skill">장착한 무기 없음</p>}
        <ItemList u={u}/>
        {def && <p className="tx-bio">{def.flavor}</p>}
    </div>;
}
function ForecastPanel({ a, d, fc, onConfirm, onCancel }: { a: BattleUnit; d: BattleUnit; fc: ReturnType<typeof forecast>; onConfirm: () => void; onCancel: () => void }) {
    const wa = attackWeapon(a), wd = attackWeapon(d);
    const kills = fc.atk.dmg * (fc.atk.doubles ? 2 : 1) >= d.hp;
    const dies = fc.def.dmg !== null && fc.def.dmg * (fc.def.doubles ? 2 : 1) >= a.hp;
    return <div className="tx-forecast">
        <strong>전투 예측 {fc.triangle === 1 ? '· 상성 우세' : fc.triangle === -1 ? '· 상성 열세' : ''}</strong>
        <table><thead><tr><th>{a.name}</th><th/><th>{d.name}</th></tr></thead><tbody>
            <tr><td>{wa?.name ?? '—'}</td><th>무기</th><td>{wd?.name ?? '—'}</td></tr>
            <tr><td>{a.hp}</td><th>체력</th><td>{d.hp}</td></tr>
            <tr><td className={kills ? 'hl' : ''}>{fc.atk.dmg}{fc.atk.doubles && ' ×2'}</td><th>피해</th><td className={dies ? 'warn' : ''}>{fc.def.dmg === null ? '반격 불가' : <>{fc.def.dmg}{fc.def.doubles && ' ×2'}</>}</td></tr>
            <tr><td>{fc.atk.hit}%</td><th>명중</th><td>{fc.def.hit === null ? '—' : `${fc.def.hit}%`}</td></tr>
            <tr><td>{fc.atk.crit}%</td><th>필살</th><td>{fc.def.crit === null ? '—' : `${fc.def.crit}%`}</td></tr>
        </tbody></table>
        {kills && <p className="tx-note hl">모두 맞으면 쓰러뜨린다</p>}{dies && <p className="tx-note warn">반격을 모두 맞으면 {a.name}이(가) 쓰러진다</p>}
        <div className="tx-row"><button type="button" className="primary" onClick={onConfirm}>공격</button><button type="button" className="text-button" onClick={onCancel}>취소</button></div>
    </div>;
}
function TradePanel({ a, b, onMove, onDone }: { a: BattleUnit; b: BattleUnit; onMove: (give: number | null, take: number | null) => void; onDone: () => void }) {
    return <div className="tx-menu tx-trade">
        <strong>교환 <small>누르면 상대에게 넘깁니다</small></strong>
        <div className="tx-trade-cols">
            <div><em>{a.name} ({a.items.length}/5)</em><ItemList u={a} onPick={i => onMove(i, null)}/></div>
            <div><em>{b.name} ({b.items.length}/5)</em><ItemList u={b} onPick={i => onMove(null, i)}/></div>
        </div>
        <button type="button" className="secondary" onClick={onDone}>교환 마치기</button>
    </div>;
}
export { TERRAIN, unkey };
