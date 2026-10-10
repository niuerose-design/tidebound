import { session, checkOrigin, mutate, failure, readJson, ApiError, syncAbyssBoard, syncAccount } from '@/game/server/store';
import { guildInfo, createGuild, joinGuild, leaveGuild, kickMember, renameGuild, claimGoal, syncGuild } from '@/game/server/guild';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
/** v25.11 공유 길드 정보: 내 길드(목표·길드원)와 이번 주 길드 기록판. */
export async function GET(req: Request) { try {
    const { account } = await session(req);
    return Response.json(await guildInfo(account, Date.now()), { headers });
}
catch (e) {
    return failure(e);
} }
/** { action: 'create' name | 'join' code | 'leave' | 'kick' target | 'rename' name | 'claim' goal (v3.241 'donate' 삭제) }. 상태를 바꾸는 행동은 세이브 저장과 함께 처리합니다. */
export async function POST(req: Request) { try {
    checkOrigin(req);
    const { account, slot, id } = await session(req), body = await readJson(req);
    const action = String(body.action || '');
    if (action === 'kick') { await kickMember(account, body.target); return Response.json(await guildInfo(account, Date.now()), { headers }); }
    let done = false, result: unknown = null;
    const payload = await mutate(id, { type: 'sync' }, async s => {
        const now = Date.now();
        await syncAccount(account, slot, s, now);
        // 저장 충돌로 다시 돌 때 DB 쓰기를 반복하지 않도록 한 번만 실행합니다.
        if (!done) {
            done = true;
            if (action === 'create') result = await createGuild(account, s, body.name, now);
            else if (action === 'join') await joinGuild(account, s, body.code, now);
            else if (action === 'leave') await leaveGuild(account, s);
            else if (action === 'rename') await renameGuild(account, s, body.name, now);
            else if (action === 'claim') result = await claimGoal(account, s, body.goal, now);
            else throw new ApiError('올바르지 않은 요청입니다.');
        }
        await syncGuild(account, s, now);
        await syncAbyssBoard(id, s, now);
    });
    return Response.json({ state: payload.state, result, info: await guildInfo(account, Date.now()) }, { headers });
}
catch (e) {
    return failure(e);
} }
