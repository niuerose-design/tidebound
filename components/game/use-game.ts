'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { State, Action, DuelResult, Snapshot } from '@/game/types';
export type Ranking = Snapshot & {
    id: string;
    self: boolean;
    updatedAt: number;
};
export function useGame() {
    const [state, setState] = useState<State | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false), [rows, setRows] = useState<Ranking[]>([]), [rankError, setRankError] = useState(''), [duel, setDuel] = useState<DuelResult | null>(null);
    const [needsLogin, setNeedsLogin] = useState(false);
    const lock = useRef(false), queue = useRef<Promise<unknown>>(Promise.resolve()), stateRef = useRef<State | null>(null);
    const request = useCallback(async (path: string, body?: unknown) => { const res = await fetch(path, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) }); const data = await res.json() as {
        error?: string;
        state: State;
        result?: DuelResult;
        rows: Ranking[];
    }; if (res.status === 401)
        setNeedsLogin(true); if (!res.ok)
        throw Error(data.error || '서버 연결에 실패했습니다.'); return data; }, []);
    const action = useCallback(async (a: Action, path = '/api/game') => { if (lock.current && a.type === 'sync')
        return; const previous = queue.current; let release!: () => void; queue.current = new Promise<void>(resolve => { release = resolve; }); await previous; lock.current = true; if (a.type !== 'sync')
        setBusy(true); try {
        const data = await request(path, a);
        if (data.state) {
            stateRef.current = data.state;
            setState(data.state);
        }
        if (data.result)
            setDuel(data.result);
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
    } }, [request]);
    const send = useCallback((a: Action, path?: string) => { void action(a, path).catch(() => { }); }, [action]);
    const loadRanking = useCallback(async () => { try {
        const d = await request('/api/ranking');
        setRows(d.rows);
        setRankError('');
    }
    catch (e) {
        setRankError((e as Error).message);
    } }, [request]);
    const register = useCallback(async () => { if (lock.current)
        return; lock.current = true; setBusy(true); try {
        const d = await request('/api/ranking', {});
        stateRef.current = d.state;
        setState(d.state);
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
    } }, [request, loadRanking]);
    useEffect(() => { send({ type: 'sync' }); const timer = setInterval(() => { if (document.visibilityState === 'visible' && stateRef.current)
        send({ type: 'sync' }); }, 3000); const visible = () => { if (document.visibilityState === 'visible')
        send({ type: 'sync' }); }; document.addEventListener('visibilitychange', visible); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visible); }; }, [send]);
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
        registerTool({ name: 'read_fishing_state', description: '현재 낚시꾼의 상태와 진행 중인 전투를 읽습니다.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => { const s = stateRef.current; return s ? { level: s.level, gold: s.gold, stage: s.stage, running: s.running, job: s.job, skills: s.skills } : { loading: true }; } });
        registerTool({ name: 'set_fishing_running', description: '자동 낚시를 시작하거나 멈춥니다.', inputSchema: { type: 'object', properties: { running: { type: 'boolean' } }, required: ['running'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async (input: unknown) => { if (!input || typeof (input as {
                running?: unknown;
            }).running !== 'boolean')
                throw Error('running must be boolean'); if (lock.current)
                throw Error('다른 행동 처리 중'); const d = await action({ type: (input as {
                    running: boolean;
                }).running ? 'start' : 'pause' }); return { running: d?.state.running }; } });
        return () => lifecycle.abort();
    }, [action]);
    /** 아이디·비밀번호 가입/로그인. 성공하면 세이브를 다시 불러옵니다. */
    const authenticate = useCallback(async (mode: 'signup' | 'login', username: string, password: string) => {
        const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: mode, username, password }) });
        const data = await res.json().catch(() => ({})) as { error?: string };
        if (!res.ok) throw Error(data.error || '로그인에 실패했습니다.');
        setNeedsLogin(false);
        setError('');
        send({ type: 'sync' });
    }, [send]);
    const logout = useCallback(async () => {
        await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }).catch(() => { });
        stateRef.current = null;
        setState(null);
        setNeedsLogin(true);
    }, []);
    return { state, error, busy, saved, send, rows, rankError, loadRanking, register, duel, setDuel, needsLogin, authenticate, logout };
}
