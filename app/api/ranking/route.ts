import { identity, checkOrigin, db, register, failure, listAbyssBoard, duelSeasonKey, duelRowId } from '@/game/server/store';
import { monthSeason } from '@/game/data/goals';
export const dynamic = 'force-dynamic';
/** 서약 배지: 알려진 배지 문자열만 통과시킵니다(서약 이전 스냅샷은 빈 목록). */
const VOW_BADGES = new Set(['anchor', 'breath', 'rough1', 'rough2', 'rough3']);
const vowList = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && VOW_BADGES.has(x)) : [];
export async function GET(req: Request) { try {
    const id = await identity(req);
    // v25.6 ?board=abyss: 이번 주 무릉도장 최고 층 기록판.
    if (new URL(req.url).searchParams.get('board') === 'abyss') { const { key, rows } = await listAbyssBoard(Date.now()); return Response.json({ week: key, rows: rows.map(r => ({ ...r, self: r.id === id })) }, { headers: { 'Cache-Control': 'no-store' } }); }
    const season = duelSeasonKey(Date.now()), rows = await db().listRankings(monthSeason(season), 100);
    return Response.json({ season, rows: rows.map(r => { const snap = JSON.parse(r.snapshot); return { ...snap, vows: vowList(snap.vows), id: r.id, rating: r.rating, power: r.power, updatedAt: r.updated_at, self: r.id === duelRowId(season, id) }; }) }, { headers: { 'Cache-Control': 'no-store' } });
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
