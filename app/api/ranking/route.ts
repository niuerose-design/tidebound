import { identity, checkOrigin, db, register, failure, RANKING_SEASON } from '@/game/server/store';
export const dynamic = 'force-dynamic';
/** 서약 배지: 알려진 배지 문자열만 통과시킵니다(서약 이전 스냅샷은 빈 목록). */
const VOW_BADGES = new Set(['anchor', 'breath', 'rough1', 'rough2', 'rough3']);
const vowList = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && VOW_BADGES.has(x)) : [];
export async function GET(req: Request) { try {
    const id = await identity(req);
    const rows = await db().listRankings(RANKING_SEASON, 100);
    return Response.json({ rows: rows.map(r => { const snap = JSON.parse(r.snapshot); return { ...snap, vows: vowList(snap.vows), id: r.id, rating: r.rating, power: r.power, updatedAt: r.updated_at, self: r.id === id }; }) }, { headers: { 'Cache-Control': 'no-store' } });
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
