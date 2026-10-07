import type { State } from '@/game/types';
import { session, checkOrigin, mutate, failure, readJson, syncAbyssBoard, syncAccount, syncDuelSeason } from '@/game/server/store';
import { syncGuild } from '@/game/server/guild';
import { vaultInfo, vaultMove } from '@/game/server/vault';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
/** v25.13 계정 공유 금고. GET 잔액, POST { action: 'deposit' | 'withdraw', kind: 'pearls' | 'essence', amount } · v3.116 { kind: 'onyx', id }(넣기는 가방 칠흑 id, 꺼내기는 금고 칸 id). */
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
    let done = false, info: unknown = null, apply: ((s: State) => void) | undefined;
    const payload = await mutate(id, { type: 'sync' }, async s => {
        const now = Date.now();
        await syncAccount(account, slot, s, now);
        // v3.116 금고는 한 번만 쓰고, 저장 충돌로 다시 돌면 세이브 쪽 변화(apply)만 새 세이브에 다시 적용합니다.
        if (!done) { done = true; const r = await vaultMove(account, s, body.action, body.kind, body.kind === 'onyx' ? body.id : body.amount, now, slot); info = r.info; apply = r.apply; }
        else apply?.(s);
        await syncGuild(account, s, now); await syncDuelSeason(id, s, now); await syncAbyssBoard(id, s, now);
    });
    return Response.json({ state: payload.state, info }, { headers });
}
catch (e) {
    return failure(e);
} }
