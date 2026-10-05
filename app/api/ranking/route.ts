import { identity, checkOrigin, db, register, failure, listAbyssBoard, duelSeasonKey, duelRowId } from '@/game/server/store';
import { monthSeason } from '@/game/data/goals';
import { readHacks, maskSnapshot, playerOfRow } from '@/game/server/hacks';
export const dynamic = 'force-dynamic';
/** 서약 배지: 알려진 배지 문자열만 통과시킵니다(서약 이전 스냅샷은 빈 목록). */
const VOW_BADGES = new Set(['anchor', 'breath', 'rough1', 'rough2', 'rough3']);
const vowList = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && VOW_BADGES.has(x)) : [];
export async function GET(req: Request) { try {
    const id = await identity(req);
    // v25.6 ?board=abyss: 이번 주 무릉도장 최고 층 기록판.
    if (new URL(req.url).searchParams.get('board') === 'abyss') { const now = Date.now(), { key, rows } = await listAbyssBoard(now), hacks = await readHacks(now); return Response.json({ week: key, rows: rows.map(r => { const self = r.id === id, out = self ? r : maskSnapshot(r, r.id, hacks, now); const { privacy: _privacy, ...rest } = out as typeof out & { privacy?: unknown }; void _privacy; return { ...rest, self }; }) }, { headers: { 'Cache-Control': 'no-store' } }); }
    const now = Date.now(), season = duelSeasonKey(now), rows = await db().listRankings(monthSeason(season), 100), hacks = await readHacks(now);
    // v3.17 애드가드: 다른 모험가가 숨긴 이름·정보는 가려서 보냅니다(크래킹당한 동안·내 행은 그대로).
    return Response.json({ season, rows: rows.map(r => { const self = r.id === duelRowId(season, id), raw = JSON.parse(r.snapshot), snap = self ? raw : maskSnapshot(raw, playerOfRow(r.id), hacks, now), gearHidden = !!snap.masked?.includes('gear'); delete snap.privacy; return { ...snap, vows: vowList(snap.vows), id: r.id, rating: r.rating, power: gearHidden ? 0 : r.power, updatedAt: r.updated_at, self }; }) }, { headers: { 'Cache-Control': 'no-store' } });
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
