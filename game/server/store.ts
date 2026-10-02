import type { State, Action } from '../types';
import { newState, advance, act } from '../systems/engine';
import { migrateState } from '../systems/migrations';
import { snapshot } from '../systems/stats';
import { SAVE_VERSION } from '../data/balance';
import { db, ConfigError } from './db';
import { weekKey, weekSeason } from '../data/goals';
import { abyssWeeklyPearls } from '../systems/progress';
import { addLog } from '../systems/state';
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
/** v25.6 주간 심연 기록판. 행 id는 abyss:<계정>, 시즌은 주 키 정수(예: 202640)라 낚시꾼 랭킹(시즌 = 세이브 버전)과 섞이지 않습니다. */
export const abyssRowId = (id: string) => `abyss:${id}`;
export async function listAbyssBoard(now: number) {
    const key = weekKey(now), rows = await db().listRankings(weekSeason(key), 100);
    return { key, rows: rows.map((r, i) => { const snap = JSON.parse(r.snapshot) as { name: string; depth: number; job: string; rebirths: number; account: string }; return { rank: i + 1, id: snap.account, name: snap.name, depth: Number(snap.depth) || r.rating, job: snap.job, rebirths: snap.rebirths, updatedAt: r.updated_at }; }) };
}
/**
 * 행동 처리 뒤 저장 전에 한 번: 이번 주 심연 기록이 새로 깊어졌으면 올리고, 주가 바뀌었으면 지난주 순위 보상을 한 번 정산합니다.
 * 심연에 들어간 적 없는 세이브는 아무것도 하지 않습니다(요청당 추가 질의 0).
 */
export async function syncAbyssBoard(id: string, s: State, now: number) {
    const week = s.abyssWeek;
    if (!week) return;
    const database = db(), current = weekKey(now);
    if (week.dirty && week.key === current) {
        await database.upsertRanking({ id: abyssRowId(id), snapshot: JSON.stringify({ season: weekSeason(current), board: 'abyss', account: id, name: s.name, depth: week.best, job: s.job, rebirths: s.rebirths }), rating: week.best, power: week.best, updated_at: now });
        delete week.dirty;
    }
    const previous = weekKey(now - 7 * 86400000);
    if (week.settled === previous) return;
    {
        const rows = await database.listRankings(weekSeason(previous), 100);
        const rank = rows.findIndex(r => r.id === abyssRowId(id)) + 1;
        week.settled = previous;
        if (rank > 0) { const pearls = abyssWeeklyPearls(rank); s.pearls += pearls; addLog(s, `지난주 심연 기록 ${rank}위(${rows[rank - 1].rating}층) · 진주 +${pearls}`, 'reward'); }
    }
}
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
