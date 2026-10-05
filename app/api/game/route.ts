import { session, checkOrigin, mutate, failure, actionBody, ApiError, syncAbyssBoard, syncAccount, syncDuelSeason } from '@/game/server/store';
import { syncGuild } from '@/game/server/guild';
import { syncAltarStatus } from '@/game/server/altar';
import { trimLogs } from '@/game/systems/log-delta';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) { try {
    checkOrigin(req);
    const { account, slot, id } = await session(req), a = await actionBody(req);
    try {
        const out = await mutate(id, a, async s => { const now = Date.now(); await syncAccount(account, slot, s, now); await syncGuild(account, s, now); await syncDuelSeason(id, s, now); await syncAbyssBoard(id, s, now); await syncAltarStatus(s, now, id); });
        // v27.62 동기화는 클라이언트가 가진 마지막 로그 뒤의 로그만 보냅니다(log-delta.ts).
        const trimmed = a.type === 'sync' ? trimLogs(out.state.logs, (a as { logKey?: unknown }).logKey) : null;
        return Response.json(trimmed ? { ...out, state: { ...out.state, logs: trimmed.logs }, logDelta: trimmed.delta } : out, { headers: { 'Cache-Control': 'no-store' } });
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
