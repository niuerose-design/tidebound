import { session, checkOrigin, mutate, failure, actionBody, ApiError, syncAbyssBoard, syncAccount, syncDuelSeason } from '@/game/server/store';
import { syncGuild } from '@/game/server/guild';
import { syncAltarStatus } from '@/game/server/altar';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) { try {
    checkOrigin(req);
    const { account, slot, id } = await session(req), a = await actionBody(req);
    try {
        return Response.json(await mutate(id, a, async s => { const now = Date.now(); await syncAccount(account, slot, s, now); await syncGuild(account, s, now); await syncDuelSeason(id, s, now); await syncAbyssBoard(id, s, now); await syncAltarStatus(s, now); }), { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (e) {
        if (e instanceof ApiError)
            throw e;
        if (e instanceof Error && !/Database|database/i.test(e.message))
            throw new ApiError(e.message);
        throw e;
    }
}
catch (e) {
    return failure(e);
} }
