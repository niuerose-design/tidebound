import { session, checkOrigin, mutate, failure, readJson, syncAbyssBoard, syncAccount, syncDuelSeason } from '@/game/server/store';
import { syncGuild } from '@/game/server/guild';
import { vaultInfo, vaultMove } from '@/game/server/vault';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
/** v25.13 계정 공유 금고. GET 잔액, POST { action: 'deposit' | 'withdraw', kind: 'pearls' | 'essence', amount }. */
export async function GET(req: Request) { try {
    const { account } = await session(req);
    return Response.json(await vaultInfo(account, Date.now()), { headers });
}
catch (e) {
    return failure(e);
} }
export async function POST(req: Request) { try {
    checkOrigin(req);
    const { account, slot, id } = await session(req), body = await readJson(req);
    let done = false, info: unknown = null;
    const payload = await mutate(id, { type: 'sync' }, async s => {
        const now = Date.now();
        await syncAccount(account, slot, s, now);
        if (!done) { done = true; info = await vaultMove(account, s, body.action, body.kind, body.amount, now); }
        await syncGuild(account, s, now); await syncDuelSeason(id, s, now); await syncAbyssBoard(id, s, now);
    });
    return Response.json({ state: payload.state, info }, { headers });
}
catch (e) {
    return failure(e);
} }
