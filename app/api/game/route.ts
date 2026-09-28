import { identity, checkOrigin, mutate, failure, actionBody, ApiError, db } from '@/game/server/store';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) { try {
    checkOrigin(req);
    const id = identity(req), a = await actionBody(req);
    try {
        const payload = await mutate(id, a);
        if (a.type === 'resetData')
            await db().prepare('DELETE FROM rankings WHERE id=?').bind(id).run();
        return Response.json(payload, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (e) {
        if (e instanceof ApiError)
            throw e;
        if (e instanceof Error && !/D1|SQLITE|database/i.test(e.message))
            throw new ApiError(e.message);
        throw e;
    }
}
catch (e) {
    return failure(e);
} }
