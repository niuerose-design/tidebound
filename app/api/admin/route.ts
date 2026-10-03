import { checkOrigin, failure, readJson } from '@/game/server/store';
import { requireAdmin, searchPlayers, previewRestart, applyRestart, adjustCurrency, listEvents, saveEvent, deleteEvent, toggleCodeEvent } from '@/game/server/admin';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
/** v27.26 운영자 도구. 헤더 x-admin-key 필요. POST { action: 'search', query } | 'preview' | 'apply' | v27.27 'events' | 'saveEvent' { event } | 'deleteEvent' { id } | 'toggleEvent' { id, disabled } | 'adjust' { id, gold?, pearls? }. */
export async function POST(req: Request) { try {
    checkOrigin(req);
    requireAdmin(req);
    const body = await readJson(req);
    if (body.action === 'search') return Response.json({ players: await searchPlayers(String(body.query ?? '')) }, { headers });
    if (body.action === 'preview') return Response.json(await previewRestart(String(body.id ?? '')), { headers });
    if (body.action === 'events') return Response.json(await listEvents(), { headers });
    if (body.action === 'saveEvent') return Response.json(await saveEvent((body.event && typeof body.event === 'object' ? body.event : {}) as Record<string, unknown>), { headers });
    if (body.action === 'deleteEvent') return Response.json(await deleteEvent(String(body.id ?? '')), { headers });
    if (body.action === 'toggleEvent') return Response.json(await toggleCodeEvent(String(body.id ?? ''), !!body.disabled), { headers });
    if (body.action === 'adjust') return Response.json(await adjustCurrency(String(body.id ?? ''), { gold: body.gold, pearls: body.pearls }), { headers });
    if (body.action === 'apply') return Response.json(await applyRestart(String(body.id ?? ''), Number(body.revision)), { headers });
    return Response.json({ error: '알 수 없는 요청입니다.' }, { status: 400, headers });
}
catch (e) {
    return failure(e);
} }
