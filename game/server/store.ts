import { env } from 'cloudflare:workers';
import type { State, Action } from '../types';
import { newState, advance, act } from '../systems/engine';
import { migrateState } from '../systems/migrations';
import { snapshot } from '../systems/stats';
export class ApiError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
export function db() {
    if (!env.DB)
        throw new ApiError('저장 서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.', 503);
    return env.DB;
}
export function identity(req: Request) {
    const id = req.headers.get('oai-authenticated-user-id');
    if (id)
        return id;
    // Local preview only. Never accept a client-provided fallback identity in production.
    if (import.meta.env.DEV)
        return 'local-preview-player';
    throw new ApiError('플레이하려면 ChatGPT 로그인이 필요합니다.', 401);
}
export function checkOrigin(req: Request) {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin)
        throw new ApiError('허용되지 않은 요청입니다.', 403);
}
export async function mutate(id: string, action: Action, extra?: (s: State) => Promise<unknown>) {
    const database = db(), now = Date.now();
    await database.prepare('INSERT OR IGNORE INTO players (id,state,revision,updated_at) VALUES (?,?,0,?)').bind(id, JSON.stringify(newState(now)), now).run();
    for (let attempt = 0; attempt < 3; attempt++) {
        const row = await database.prepare('SELECT state,revision FROM players WHERE id=?').bind(id).first<{
            state: string;
            revision: number;
        }>();
        if (!row)
            throw new ApiError('저장 데이터를 불러오지 못했습니다.', 503);
        const s = migrateState(JSON.parse(row.state) as State);
        advance(s, now);
        act(s, action, now);
        const result = extra ? await extra(s) : null;
        const saved = await database.prepare('UPDATE players SET state=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(JSON.stringify(s), now, id, row.revision).run();
        if (saved.meta.changes === 1)
            return { state: s, result };
    }
    throw new ApiError('다른 창에서 진행 중입니다. 다시 시도하세요.', 409);
}
export async function register(id: string) { const { state } = await mutate(id, { type: 'sync' }); const snap = snapshot(state); await db().prepare('INSERT INTO rankings (id,snapshot,rating,power,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET snapshot=excluded.snapshot,rating=excluded.rating,power=excluded.power,updated_at=excluded.updated_at').bind(id, JSON.stringify(snap), snap.rating, snap.power, Date.now()).run(); return state; }
export function failure(e: unknown) {
    if (e instanceof ApiError)
        return Response.json({ error: e.message }, { status: e.status });
    console.error('Game API error', e);
    return Response.json({ error: '요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.' }, { status: 503 });
}
export async function actionBody(req: Request) {
    if (Number(req.headers.get('content-length') || 0) > 4096)
        throw new ApiError('요청이 너무 큽니다.', 413);
    let a;
    try {
        const text = await req.text();
        if (text.length > 4096)
            throw Error();
        a = JSON.parse(text);
    }
    catch {
        throw new ApiError('올바르지 않은 요청입니다.');
    }
    if (!a || typeof a.type !== 'string' || (a.id !== undefined && typeof a.id !== 'string') || (a.value !== undefined && typeof a.value !== 'string'))
        throw new ApiError('올바르지 않은 행동입니다.');
    return a as Action;
}
