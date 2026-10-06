'use client';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { State, Action, DuelResult, Snapshot } from '@/game/types';
import { BALANCE } from '@/game/data/balance';
import { stats } from '@/game/systems/stats';
import { buildCombatReplay, type ReplayFrame } from '@/game/systems/combat-feedback';
import { logKey, mergeLogs, type LogDelta } from '@/game/systems/log-delta';
import { OPEN_CATALOG, type Catalog } from '@/game/data/catalog';
export type Ranking = Snapshot & {
    /** v3.18 가린 항목(v3.26 신원 조작)(name · job · level · gear · skills · title · guild). */
    masked?: string[];
    id: string;
    self: boolean;
    updatedAt: number;
};
/** v25.6 주간 심연 기록판 한 줄. */
export type GuildInfo = import('@/game/server/guild').GuildInfo;
export type CrewInfo = import('@/game/server/crews').CrewInfo;
export type AltarInfo = import('@/game/data/altar').AltarInfo;
export type AltarResult = { winner: 'player' | 'opponent' | 'draw'; turns: number; logs: string[]; claimed: boolean; /** v27.70 탄핵 성공 */ impeached?: boolean; /** v27.91 월드보스: 준 피해·남은 공유 체력·격파 여부·내가 마지막 일격인지 */ dealt?: number; remaining?: number; slain?: boolean; slayer?: boolean };
export type VaultInfo = import('@/game/data/account').VaultInfo;
export type AbyssRow = { rank: number; id: string; name: string; depth: number; job: string; rebirths: number; updatedAt: number; self: boolean; masked?: string[] };
/** 동기화 주기(ms). */
const SYNC_MS = 3000;
/** 대기 중(자동 사냥 꺼짐) 동기화는 SYNC_MS × 이 값마다. */
const IDLE_SYNC_SKIP = 10;
/** v27.62 전투를 보지 않는 화면(스킬·상점 등)에서는 자동 사냥 중에도 SYNC_MS × 이 값마다(9초). 전투 재생이 필요 없어 데이터·서버 부하를 줄입니다. */
const BACKGROUND_SYNC_SKIP = 3;
/** 턴이 서버에서 계산된 뒤 다음 동기화로 도착할 때까지의 여유. 이만큼 늦게 재생해야 턴 간격이 고르게 유지됩니다. */
const REPLAY_LAG_MS = SYNC_MS + 500;
/** 이보다 많은 턴이 밀리면(탭 복귀 등) 밀린 분은 건너뛰고 최신 상태로 맞춥니다. */
const MAX_BEHIND_TURNS = 2;
type Queued = { turnAt: number; at: number; frame: ReplayFrame };
/**
 * v27.62 재생 프레임 저장소. 프레임(턴당 여러 번)을 React 상태로 두면 앱 전체가 프레임마다 다시 그려져
 * 전투와 상관없는 스킬·전직 화면까지 매번 다시 계산했습니다. 프레임은 여기 두고 전투 화면만 구독합니다(useReplayView).
 */
export type FrameStore = { get: () => ReplayFrame | null; set: (frame: ReplayFrame | null) => void; subscribe: (fn: () => void) => () => void };
function createFrameStore(): FrameStore {
    let frame: ReplayFrame | null = null;
    const subs = new Set<() => void>();
    return { get: () => frame, set: next => { if (next === frame) return; frame = next; subs.forEach(fn => fn()); }, subscribe: fn => { subs.add(fn); return () => { subs.delete(fn); }; } };
}
const noFrame = () => null;
/** 전투 화면에 보이는 상태: 전투 표시값(HP·MP·적·상태이상·회복 대기·로그)만 재생 중인 프레임으로 바꿉니다. */
export function useReplayView(state: State, frames: FrameStore): State {
    const frame = useSyncExternalStore(frames.subscribe, frames.get, noFrame);
    return useMemo(() => frame ? { ...state, hp: frame.hp, mana: frame.mana, recovery: frame.recovery, enemy: frame.enemy, effects: frame.effects, playerStun: frame.playerStun, logs: state.logs.filter(l => l.id <= frame.lastLogId) } : state, [state, frame]);
}
/**
 * 전투 재생 버퍼. 동기화로 받은 턴을 서버 lastTick 기준 실제 턴 시각(turnMs 간격)에 맞춰 차례로 내보냅니다.
 * 서버 시각은 min(받은 시각 − lastTick)으로 추정합니다. lastTick은 항상 서버의 현재 시각 이하이므로 최솟값이 시계 차이에 가장 가깝습니다.
 */
function createReplay(render: (frame: ReplayFrame | null) => void) {
    let queue: Queued[] = [], timer: ReturnType<typeof setTimeout> | undefined, offset: number | null = null, current: ReplayFrame | null = null;
    const show = (frame: ReplayFrame | null) => { current = frame; render(frame); };
    const play = () => {
        clearTimeout(timer);
        const now = Date.now();
        let shown: ReplayFrame | null = null;
        while (queue.length && queue[0].at <= now) shown = queue.shift()!.frame;
        if (shown) show(shown);
        if (queue.length) timer = setTimeout(play, queue[0].at - now);
    };
    const reset = () => { queue = []; clearTimeout(timer); show(null); };
    const push = (prev: State, next: State, receivedAt: number) => {
        const sample = receivedAt - next.lastTick;
        offset = offset === null ? sample : Math.min(offset, sample);
        const base = prev.lastTick + offset + REPLAY_LAG_MS, count = Math.round((next.lastTick - prev.lastTick) / BALANCE.turnMs);
        const now = Date.now();
        const behind = new Set(queue.filter(q => q.turnAt <= now).map(q => q.turnAt)).size + Math.max(0, Math.min(count, Math.floor((now - base) / BALANCE.turnMs)));
        if (behind > MAX_BEHIND_TURNS) { offset = sample; return reset(); }
        const a = stats(next), turns = buildCombatReplay(prev, next, a.hp, a.mana);
        if (!turns) return reset();
        // 재생 중이 아니었다면 첫 턴이 올 때까지 이전 상태를 붙잡아 둡니다(새 상태가 먼저 보였다가 되감기지 않도록).
        if (!current && turns.length) show({ offset: 0, hp: prev.hp, mana: prev.mana, recovery: prev.recovery, enemy: prev.enemy, effects: prev.effects, playerStun: prev.playerStun, lastLogId: prev.logs.at(-1)?.id ?? 0 });
        for (const t of turns) {
            const turnAt = base + t.turn * BALANCE.turnMs;
            for (const frame of t.frames) queue.push({ turnAt, at: turnAt + frame.offset, frame });
        }
        play();
    };
    return { push, reset };
}
export function useGame() {
    const [state, setState] = useState<State | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false), [rows, setRows] = useState<Ranking[]>([]), [rankError, setRankError] = useState(''), [duel, setDuel] = useState<DuelResult | null>(null);
    const [needsLogin, setNeedsLogin] = useState(false);
    const lock = useRef(false), queue = useRef<Promise<unknown>>(Promise.resolve()), stateRef = useRef<State | null>(null);
    /** v27.62 지금 화면이 전투(사냥·던전)를 보여 주는지. 아니면 동기화를 늦춥니다. */
    const live = useRef(true);
    /** v3.40 정보 비공개 카탈로그(docs/concept.md 10장). 받기 전에는 오픈 베타와 같은 전체 공개. */
    const [catalog, setCatalog] = useState<Catalog>(OPEN_CATALOG);
    const [frames] = useState(createFrameStore), [replay] = useState(() => createReplay(frames.set));
    useEffect(() => replay.reset, [replay]);
    const request = useCallback(async (path: string, body?: unknown) => { const res = await fetch(path, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) }); const data = await res.json() as {
        error?: string;
        state: State;
        result?: DuelResult;
        rows: Ranking[];
        logDelta?: LogDelta;
        /** v3.40 정보 비공개 카탈로그(/api/game 응답). */
        catalog?: Catalog;
    }; if (res.status === 401)
        setNeedsLogin(true); if (!res.ok)
        throw Error(data.error || '서버 연결에 실패했습니다.'); return data; }, []);
    const action = useCallback(async (a: Action, path = '/api/game') => { if (lock.current && a.type === 'sync')
        return; const previous = queue.current; let release!: () => void; queue.current = new Promise<void>(resolve => { release = resolve; }); await previous; lock.current = true; if (a.type !== 'sync')
        setBusy(true); try {
        // v27.62 동기화에는 가진 마지막 로그의 키를 붙여, 서버가 그 뒤 로그만 보내게 합니다(응답의 약 절반이 로그).
        const known = a.type === 'sync' ? stateRef.current?.logs.at(-1) : undefined;
        const data = await request(path, known ? { ...a, logKey: logKey(known) } : a);
        if (data.state) {
            const prev = stateRef.current;
            if (data.logDelta) data.state.logs = mergeLogs(prev?.logs, data.state.logs, data.logDelta);
            stateRef.current = data.state;
            setState(data.state);
            // 동기화만 턴 단위로 재생합니다. 직접 한 행동과 오프라인 정산 결과는 지금처럼 바로 보여 줍니다.
            const settled = !!data.state.lastOffline && JSON.stringify(data.state.lastOffline) !== JSON.stringify(prev?.lastOffline);
            if (a.type === 'sync' && prev && !settled) replay.push(prev, data.state, Date.now());
            else replay.reset();
        }
        if (data.result)
            setDuel(data.result);
        if (data.catalog) setCatalog(data.catalog);
        if (a.type === 'resetData') {
            setRows([]);
            setDuel(null);
            setRankError('');
        }
        setSaved(true);
        setError('');
        return data;
    }
    catch (e) {
        setError(e instanceof Error ? e.message : '연결 오류');
        setSaved(false);
        throw e;
    }
    finally {
        lock.current = false;
        setBusy(false);
        release();
    } }, [request, replay]);
    const send = useCallback((a: Action, path?: string) => { void action(a, path).catch(() => { }); }, [action]);
    const [rankSeason, setRankSeason] = useState('');
    const loadRanking = useCallback(async () => { try {
        const d = await request('/api/ranking') as unknown as { rows: Ranking[]; season?: string };
        setRows(d.rows); setRankSeason(d.season || '');
        setRankError('');
    }
    catch (e) {
        setRankError((e as Error).message);
    } }, [request]);
    /** v25.11 공유 길드: 정보는 길드 화면을 열 때 읽고, 행동은 세이브와 함께 저장됩니다. */
    const [guild, setGuild] = useState<GuildInfo | null>(null), [guildError, setGuildError] = useState('');
    const loadGuild = useCallback(async () => { try { setGuild(await request('/api/guild') as unknown as GuildInfo); setGuildError(''); } catch (e) { setGuildError((e as Error).message); } }, [request]);
    const guildAct = useCallback(async (body: Record<string, unknown>) => {
        if (lock.current) return false; lock.current = true; setBusy(true);
        try {
            const d = await request('/api/guild', body) as unknown as { state?: State; info: GuildInfo };
            if (d.state) { stateRef.current = d.state; setState(d.state); replay.reset(); setSaved(true); }
            setGuild(d.info); setGuildError(''); return true;
        }
        catch (e) { setGuildError((e as Error).message); return false; }
        finally { lock.current = false; setBusy(false); }
    }, [request, replay]);
    /** v3.29 해커 조직: 정보는 조직 화면을 열 때와 행동 뒤에만 읽습니다. */
    const [crew, setCrew] = useState<CrewInfo | null>(null), [crewError, setCrewError] = useState('');
    const loadCrew = useCallback(async () => { try { setCrew(await request('/api/crew') as unknown as CrewInfo); setCrewError(''); } catch (e) { setCrewError((e as Error).message); } }, [request]);
    const crewAct = useCallback(async (body: Record<string, unknown>) => {
        if (lock.current) return false; lock.current = true; setBusy(true);
        try {
            const d = await request('/api/crew', body) as unknown as { state?: State; info: CrewInfo };
            if (d.state) { stateRef.current = d.state; setState(d.state); replay.reset(); setSaved(true); }
            setCrew(d.info); setCrewError(''); return true;
        }
        catch (e) { setCrewError((e as Error).message); return false; }
        finally { lock.current = false; setBusy(false); }
    }, [request, replay]);
    /** v27.43 제단: 정보는 제단 화면을 열 때와 행동 뒤에만 읽습니다(주기 폴링 없음). 도전 결과는 altarResult로 보여 줍니다. */
    const [altar, setAltar] = useState<AltarInfo | null>(null), [altarError, setAltarError] = useState(''), [altarResult, setAltarResult] = useState<AltarResult | null>(null);
    const loadAltar = useCallback(async () => { try { setAltar(await request('/api/altar') as unknown as AltarInfo); setAltarError(''); } catch (e) { setAltarError((e as Error).message); } }, [request]);
    const altarAct = useCallback(async (body: Record<string, unknown>) => {
        if (lock.current) return false; lock.current = true; setBusy(true);
        try {
            const d = await request('/api/altar', body) as unknown as { state?: State; info: AltarInfo; result?: AltarResult };
            if (d.state) { stateRef.current = d.state; setState(d.state); replay.reset(); setSaved(true); }
            setAltar(d.info); setAltarError(''); if ((body.action === 'challenge' || body.action === 'impeach' || body.action === 'raid') && d.result) setAltarResult(d.result); return true;
        }
        catch (e) { setAltarError((e as Error).message); return false; }
        finally { lock.current = false; setBusy(false); }
    }, [request, replay]);
    /** v25.13 계정 공유 금고. */
    const [vault, setVault] = useState<VaultInfo | null>(null), [vaultError, setVaultError] = useState('');
    const loadVault = useCallback(async () => { try { setVault(await request('/api/vault') as unknown as VaultInfo); setVaultError(''); } catch (e) { setVaultError((e as Error).message); } }, [request]);
    const vaultAct = useCallback(async (body: Record<string, unknown>) => {
        if (lock.current) return false; lock.current = true; setBusy(true);
        try { const d = await request('/api/vault', body) as unknown as { state?: State; info: VaultInfo }; if (d.state) { stateRef.current = d.state; setState(d.state); replay.reset(); setSaved(true); } setVault(d.info); setVaultError(''); return true; }
        catch (e) { setVaultError((e as Error).message); return false; }
        finally { lock.current = false; setBusy(false); }
    }, [request, replay]);
    const [abyss, setAbyss] = useState<{ week: string; rows: AbyssRow[] } | null>(null);
    const loadAbyss = useCallback(async () => { try { const d = await request('/api/ranking?board=abyss') as unknown as { week: string; rows: AbyssRow[] }; setAbyss({ week: d.week, rows: d.rows }); } catch (e) { setRankError((e as Error).message); } }, [request]);
    const register = useCallback(async () => { if (lock.current)
        return; lock.current = true; setBusy(true); try {
        const d = await request('/api/ranking', {});
        stateRef.current = d.state;
        setState(d.state);
        replay.reset();
        setSaved(true);
        setError('');
        await loadRanking();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        lock.current = false;
        setBusy(false);
    } }, [request, loadRanking, replay]);
    useEffect(() => { const first = setTimeout(() => send({ type: 'sync' }), 0); let ticks = 0; const timer = setInterval(() => { const s = stateRef.current; ticks++;
        // v25.21 자동 사냥이 꺼져 있고 던전도 아니면 10번에 한 번(30초)만 동기화합니다. 행동은 즉시 보내므로 체감 지연은 없습니다.
        // v27.62 진행 중이어도 전투를 보지 않는 화면이면 3번에 한 번(9초)만 동기화합니다.
        const active = !!s && (s.running || !!s.dungeon);
        if (document.visibilityState === 'visible' && (!s || (active && (live.current || ticks % BACKGROUND_SYNC_SKIP === 0)) || ticks % IDLE_SYNC_SKIP === 0))
        send({ type: 'sync' }); }, SYNC_MS); const visible = () => { if (document.visibilityState === 'visible')
        send({ type: 'sync' }); }; document.addEventListener('visibilitychange', visible); return () => { clearTimeout(first); clearInterval(timer); document.removeEventListener('visibilitychange', visible); }; }, [send]);
    useEffect(() => {
        const context = (document as Document & {
            modelContext?: {
                registerTool: (tool: unknown, opts: unknown) => unknown;
            };
        }).modelContext;
        if (!context?.registerTool)
            return;
        const lifecycle = new AbortController();
        const registerTool = (tool: unknown) => { try {
            Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => { });
        }
        catch { } };
        registerTool({ name: 'read_fishing_state', description: '현재 모험가의 상태와 진행 중인 전투를 읽습니다.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => { const s = stateRef.current; return s ? { level: s.level, gold: s.gold, stage: s.stage, running: s.running, job: s.job, skills: s.skills } : { loading: true }; } });
        registerTool({ name: 'set_fishing_running', description: '자동 사냥을 시작하거나 멈춥니다.', inputSchema: { type: 'object', properties: { running: { type: 'boolean' } }, required: ['running'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async (input: unknown) => { if (!input || typeof (input as {
                running?: unknown;
            }).running !== 'boolean')
                throw Error('running must be boolean'); if (lock.current)
                throw Error('다른 행동 처리 중'); const d = await action({ type: (input as {
                    running: boolean;
                }).running ? 'start' : 'pause' }); return { running: d?.state.running }; } });
        return () => lifecycle.abort();
    }, [action]);
    /** 아이디·비밀번호 가입/로그인. 성공하면 세이브를 다시 불러옵니다. */
    const authenticate = useCallback(async (mode: 'signup' | 'login', username: string, password: string, fisherName?: string) => {
        const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: mode, username, password, name: fisherName }) });
        const data = await res.json().catch(() => ({})) as { error?: string };
        if (!res.ok) throw Error(data.error || '로그인에 실패했습니다.');
        setNeedsLogin(false);
        setError('');
        send({ type: 'sync' });
    }, [send]);
    /** v25.6 캐릭터 슬롯 전환. 서버가 해금을 확인하고 쿠키를 바꾸면 그 슬롯의 세이브를 불러옵니다. */
    const switchSlot = useCallback(async (slot: number) => {
        const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'slot', slot }) });
        const data = await res.json().catch(() => ({})) as { error?: string };
        if (!res.ok) throw Error(data.error || '슬롯을 바꾸지 못했습니다.');
        stateRef.current = null;
        setState(null);
        replay.reset();
        setError('');
        // v27.11 자동 사냥 중 3초 동기화와 겹치면 sync가 잠금에 걸려 버려지고 화면이 '불러오는 중'에 멈췄습니다. 새 슬롯 상태가 올 때까지 다시 시도합니다.
        for (let attempt = 0; attempt < 10 && !stateRef.current; attempt++) {
            await action({ type: 'sync' }).catch(() => { });
            if (!stateRef.current) await new Promise(resolve => setTimeout(resolve, 300));
        }
        if (!stateRef.current) throw Error('새 슬롯을 불러오지 못했습니다. 화면을 새로 고쳐 주세요.');
    }, [action, replay]);
    const logout = useCallback(async () => {
        await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }).catch(() => { });
        stateRef.current = null;
        setState(null);
        replay.reset();
        setNeedsLogin(true);
    }, [replay]);
    /** 화면이 바뀔 때 GameShell이 부릅니다. 전투 화면으로 돌아오면 바로 한 번 동기화합니다. */
    const setLive = useCallback((on: boolean) => { const was = live.current; live.current = on; if (on && !was) send({ type: 'sync' }); }, [send]);
    return { state, catalog, frames, setLive, error, busy, saved, send, rows, rankSeason, rankError, loadRanking, abyss, loadAbyss, register, duel, setDuel, needsLogin, authenticate, logout, switchSlot, guild, guildError, loadGuild, guildAct, crew, crewError, loadCrew, crewAct, vault, vaultError, loadVault, vaultAct, altar, altarError, loadAltar, altarAct, altarResult, setAltarResult };
}
