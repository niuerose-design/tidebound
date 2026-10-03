import { checkOrigin, failure, readJson } from '@/game/server/store';
import { requireAdmin, searchPlayers, previewRestart, applyRestart } from '@/game/server/admin';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
/** v27.26 운영자 도구. 헤더 x-admin-key 필요. POST { action: 'search', query } | { action: 'preview', id } | { action: 'apply', id, revision }. */
export async function POST(req: Request) { try {
    checkOrigin(req);
    requireAdmin(req);
    const body = await readJson(req);
    if (body.action === 'search') return Response.json({ players: await searchPlayers(String(body.query ?? '')) }, { headers });
    if (body.action === 'preview') return Response.json(await previewRestart(String(body.id ?? '')), { headers });
    if (body.action === 'apply') return Response.json(await applyRestart(String(body.id ?? ''), Number(body.revision)), { headers });
    return Response.json({ error: '알 수 없는 요청입니다.' }, { status: 400, headers });
}
catch (e) {
    return failure(e);
} }
