import { identity, checkOrigin, db, register, failure, RANKING_SEASON } from '@/game/server/store';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) { try {
    const id = await identity(req);
    const rows = await db().listRankings(RANKING_SEASON, 100);
    return Response.json({ rows: rows.map(r => ({ ...JSON.parse(r.snapshot), id: r.id, rating: r.rating, power: r.power, updatedAt: r.updated_at, self: r.id === id })) }, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }
export async function POST(req: Request) { try {
    checkOrigin(req);
    return Response.json({ state: await register(await identity(req)) });
}
catch (e) {
    return failure(e);
} }
