import { session, checkOrigin, mutate, failure, actionBody, ApiError } from '@/game/server/store';
import { applyPendingHack, syncHackFeed } from '@/game/server/hacks';
import { allow } from '@/game/server/throttle';
export const dynamic = 'force-dynamic';
/** v3.16 해킹 실행(방송 탈취 · 크래킹): 비트 차감과 서버 공유 설정 쓰기를 한 번에. 설정 쓰기가 실패하면 세이브도 저장되지 않습니다. */
export async function POST(req: Request) { try {
    checkOrigin(req);
    const { id } = await session(req), a = await actionBody(req);
    if (a.type !== 'hackRun') throw new ApiError('지원하지 않는 해킹입니다.');
    if (!allow(`hack:${id}`, 1, 3000)) throw new ApiError('잠시 후 다시 시도하세요.', 429);
    try {
        const out = await mutate(id, a, async s => { const now = Date.now(); await applyPendingHack(s, id, now); await syncHackFeed(s, id, now); });
        return Response.json(out, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (e) {
        if (e instanceof ApiError) throw e;
        if (e instanceof Error && !/Database|database/i.test(e.message)) throw new ApiError(e.message);
        throw e;
    }
}
catch (e) {
    return failure(e);
} }
