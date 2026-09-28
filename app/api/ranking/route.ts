import { identity, checkOrigin, db, register, failure } from '@/game/server/store';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) { try {
    const id = identity(req);
    const rows = await db().prepare('SELECT id,snapshot,rating,power,updated_at FROM rankings ORDER BY rating DESC,power DESC LIMIT 100').all<{
        id: string;
        snapshot: string;
        rating: number;
        power: number;
        updated_at: number;
    }>();
    return Response.json({ rows: rows.results.map(r => ({ ...JSON.parse(r.snapshot), id: r.id, rating: r.rating, power: r.power, updatedAt: r.updated_at, self: r.id === id })) }, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }
export async function POST(req: Request) { try {
    checkOrigin(req);
    return Response.json({ state: await register(identity(req)) });
}
catch (e) {
    return failure(e);
} }
