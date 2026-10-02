import { identity, checkOrigin, mutate, failure, actionBody, ApiError, syncAbyssBoard } from '@/game/server/store';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) { try {
    checkOrigin(req);
    const id = await identity(req), a = await actionBody(req);
    try {
        return Response.json(await mutate(id, a, s => syncAbyssBoard(id, s, Date.now())), { headers: { 'Cache-Control': 'no-store' } });
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
