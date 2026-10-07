import { session, checkOrigin, mutate, failure, readJson, ApiError, db } from '@/game/server/store';
import { CREW } from '@/game/data/crew';
import { migrateState } from '@/game/systems/migrations';
import type { State } from '@/game/types';
import { crewInfo, syncCrew, createCrew, joinCrew, leaveCrew, leaderAct, depositCrew, type CrewApply } from '@/game/server/crews';
import { syncHackFeed } from '@/game/server/hacks';
import { allow } from '@/game/server/throttle';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
/** v3.29 해커 조직 정보(조직 화면을 열 때만). */
export async function GET(req: Request) { try {
    const { id } = await session(req), now = Date.now();
    // v3.94 조회는 저장된 세이브로 답합니다(게임 동기화가 이미 syncCrew를 돌림). 소속 확인 주기가 지났을 때만 저장 경로로 맞춥니다.
    const row = await db().getPlayer(id), saved = row ? migrateState(JSON.parse(row.state) as State, now) : null, cached = saved?.hacker?.crew;
    const state = saved && (!cached || now - cached.syncedAt < CREW.refreshMs) ? saved : (await mutate(id, { type: 'sync' }, async s => { await syncCrew(id, s, Date.now()); })).state;
    return Response.json(await crewInfo(id, state, now), { headers });
}
catch (e) {
    return failure(e);
} }
/** { action: 'create' name side | 'join' code | 'leave' | 'kick' target | 'delegate' target | 'code' | 'module' target | 'deposit' amount }. 조직 행 쓰기는 한 번만, 세이브 변화는 저장과 함께. */
export async function POST(req: Request) { try {
    checkOrigin(req);
    const { id } = await session(req), body = await readJson(req), action = String(body.action || '');
    if (!allow(`crew:${id}`, 1, 2000)) throw new ApiError('잠시 후 다시 시도하세요.', 429);
    let apply: CrewApply | null = null;
    const payload = await mutate(id, { type: 'sync' }, async s => {
        const now = Date.now();
        // 저장 충돌로 다시 돌 때 DB 쓰기를 반복하지 않고, 세이브 변화만 다시 적용합니다.
        if (!apply) {
            if (action === 'create') apply = await createCrew(id, s, body.name, body.side, now);
            else if (action === 'join') apply = await joinCrew(id, s, body.code, now);
            else if (action === 'leave') apply = await leaveCrew(id, s, now);
            else if (action === 'kick' || action === 'delegate' || action === 'code' || action === 'module') apply = await leaderAct(id, s, action, body.target, now);
            else if (action === 'deposit') apply = await depositCrew(id, s, body.amount, now);
            else throw new ApiError('올바르지 않은 요청입니다.');
        }
        apply(s);
        await syncHackFeed(s, id, now);
    });
    return Response.json({ state: payload.state, info: await crewInfo(id, payload.state, Date.now()) }, { headers });
}
catch (e) {
    return failure(e);
} }
