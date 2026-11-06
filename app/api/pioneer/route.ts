import { session, checkOrigin, mutate, failure, readJson, ApiError, syncAccount } from '@/game/server/store';
import { pioneerInfo, registerAscended, readPioneer, offerCheck, applyOffer, commitOffer, nextRegion, openVote, castVote, syncPioneerStatus, buyLineageKey } from '@/game/server/pioneer';
import { pioneerRegionById, type PioneerAccess, type PioneerRegionId } from '@/game/data/pioneer';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
/** v3.464 아제로스 개척 정보: 지역 게이지 · 기여 순위 · 투표. 승천자는 명부에 적습니다. */
export async function GET(req: Request) { try {
    const { id } = await session(req), now = Date.now();
    let info: unknown = null;
    await mutate(id, { type: 'sync' }, async s => { await registerAscended(id, s, now); info = await pioneerInfo(id, s, now); });
    return Response.json(info, { headers });
}
catch (e) {
    return failure(e);
} }
/** { action: 'offer', pearls } | { action: 'openVote', region, choice } | { action: 'vote', region, choice } | { action: 'buyKey', job }. */
export async function POST(req: Request) { try {
    checkOrigin(req);
    const { account, slot, id } = await session(req), body = await readJson(req), now = Date.now();
    const action = String(body.action || '');
    if (action === 'offer') {
        const pearls = Math.floor(Number(body.pearls) || 0), store = await readPioneer(now), region = nextRegion(store);
        const payload = await mutate(id, { type: 'sync' }, async s => { await syncAccount(account, slot, s, now); offerCheck(s, pearls, store); applyOffer(s, pearls, region!); });
        await commitOffer(id, payload.state.name, pearls, now);
        await syncPioneerStatus(payload.state, now);
        return Response.json({ state: payload.state, info: await pioneerInfo(id, payload.state, Date.now()) }, { headers });
    }
    if (action === 'buyKey') {
        const job = String(body.job || ''), store = await readPioneer(now);
        const payload = await mutate(id, { type: 'sync' }, async s => { await syncAccount(account, slot, s, now); buyLineageKey(s, job, store); });
        return Response.json({ state: payload.state, info: await pioneerInfo(id, payload.state, Date.now()) }, { headers });
    }
    if (action !== 'openVote' && action !== 'vote') throw new ApiError('올바르지 않은 요청입니다.');
    const region = String(body.region || '') as PioneerRegionId, choice = body.choice === 'all' ? 'all' : body.choice === 'ascended' ? 'ascended' : null;
    if (!pioneerRegionById(region) || !choice) throw new ApiError('지역과 공개 범위를 고르세요.');
    const payload = await mutate(id, { type: 'sync' }, async s => { await syncAccount(account, slot, s, now); if (action === 'openVote') await openVote(id, s, region, choice as PioneerAccess, now); else await castVote(id, s, region, choice as PioneerAccess, now); await syncPioneerStatus(s, now); });
    return Response.json({ state: payload.state, info: await pioneerInfo(id, payload.state, Date.now()) }, { headers });
}
catch (e) {
    return failure(e);
} }
