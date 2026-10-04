import { session, checkOrigin, mutate, failure, readJson, ApiError, syncAccount, db } from '@/game/server/store';
import { altarInfo, parseOffering, applyOffering, commitOffering, makeChallenge, makeHarvest, makeImpeach } from '@/game/server/altar';
import type { State } from '@/game/types';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
/** v27.43 제단 정보: 게이지·신·신의 자리·이번 주 기여 순위·내 기여. 세이브는 읽기만 합니다. */
export async function GET(req: Request) { try {
    const { id } = await session(req), row = await db().getPlayer(id);
    let s: State | null = null;
    try { s = row ? JSON.parse(row.state) as State : null; } catch { s = null; }
    return Response.json(await altarInfo(id, s, Date.now()), { headers });
}
catch (e) {
    return failure(e);
} }
/**
 * { action: 'offer', gold, pearls, essence, gauge, anonymous } | { action: 'challenge' } | { action: 'harvest' }.
 * 바치기는 세이브에서 재화를 뺀 저장이 끝난 뒤에만 제단에 더합니다(저장 충돌로 다시 돌아도 한 번만 더함).
 */
export async function POST(req: Request) { try {
    checkOrigin(req);
    const { account, slot, id } = await session(req), body = await readJson(req), now = Date.now();
    const action = String(body.action || '');
    let result: unknown = null;
    if (action === 'offer') {
        const { o, gauge, points, anonymous } = parseOffering(account, body, now);
        const payload = await mutate(id, { type: 'sync' }, async s => { await syncAccount(account, slot, s, now); applyOffering(s, o, points, gauge, anonymous); });
        await commitOffering(account, id, payload.state.name, o, points, gauge, anonymous, now);
        return Response.json({ state: payload.state, result: { points }, info: await altarInfo(id, payload.state, Date.now()) }, { headers });
    }
    if (action !== 'challenge' && action !== 'harvest' && action !== 'impeach') throw new ApiError('올바르지 않은 요청입니다.');
    const run = action === 'challenge' ? makeChallenge(id) : action === 'impeach' ? makeImpeach(id) : makeHarvest(id);
    const payload = await mutate(id, { type: 'sync' }, async s => { await syncAccount(account, slot, s, now); result = await run(s, now); });
    return Response.json({ state: payload.state, result, info: await altarInfo(id, payload.state, Date.now()) }, { headers });
}
catch (e) {
    return failure(e);
} }
