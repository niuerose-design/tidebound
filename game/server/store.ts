import type { State, Action } from '../types';
import { newState, advance, act } from '../systems/engine';
import { migrateState } from '../systems/migrations';
import { snapshot } from '../systems/stats';
import { SAVE_VERSION } from '../data/balance';
import { db, ConfigError } from './db';
import { accountFromRequest, AuthError } from './auth';
export { db };
export class ApiError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
/** 로그인한 계정 ID. 세션이 없으면 401. */
export async function identity(req: Request) {
    const id = await accountFromRequest(req);
    if (id)
        return id;
    throw new ApiError('플레이하려면 로그인이 필요합니다.', 401);
}
export function checkOrigin(req: Request) {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin)
        throw new ApiError('허용되지 않은 요청입니다.', 403);
}
export async function mutate(id: string, action: Action, extra?: (s: State) => Promise<unknown>) {
    const database = db(), now = Date.now();
    await database.createPlayerIfMissing(id, JSON.stringify(newState(now)), now);
    for (let attempt = 0; attempt < 3; attempt++) {
        const row = await database.getPlayer(id);
        if (!row)
            throw new ApiError('저장 데이터를 불러오지 못했습니다.', 503);
        const s = migrateState(JSON.parse(row.state) as State, now);
        advance(s, now);
        act(s, action, now);
        const result = extra ? await extra(s) : null;
        if (await database.updatePlayer(id, JSON.stringify(s), now, row.revision))
            return { state: s, result };
    }
    throw new ApiError('다른 창에서 진행 중입니다. 다시 시도하세요.', 409);
}
export async function register(id: string) {
    const { state } = await mutate(id, { type: 'sync' });
    const snap = snapshot(state);
    await db().upsertRanking({ id, snapshot: JSON.stringify(snap), rating: snap.rating, power: snap.power, updated_at: Date.now() });
    return state;
}
export const RANKING_SEASON = SAVE_VERSION;
export function failure(e: unknown) {
    if (e instanceof ApiError || e instanceof AuthError || e instanceof ConfigError)
        return Response.json({ error: e.message }, { status: e.status });
    console.error('Game API error', e);
    return Response.json({ error: '요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.' }, { status: 503 });
}
export async function readJson(req: Request, limit = 4096): Promise<Record<string, unknown>> {
    if (Number(req.headers.get('content-length') || 0) > limit)
        throw new ApiError('요청이 너무 큽니다.', 413);
    try {
        const text = await req.text();
        if (text.length > limit)
            throw Error();
        const v = JSON.parse(text);
        if (!v || typeof v !== 'object') throw Error();
        return v;
    }
    catch {
        throw new ApiError('올바르지 않은 요청입니다.');
    }
}
export async function actionBody(req: Request) {
    const a = await readJson(req);
    if (typeof a.type !== 'string' || (a.id !== undefined && typeof a.id !== 'string') || (a.value !== undefined && typeof a.value !== 'string'))
        throw new ApiError('올바르지 않은 행동입니다.');
    return a as Action;
}
