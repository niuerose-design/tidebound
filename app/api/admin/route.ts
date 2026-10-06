import { checkOrigin, failure, readJson } from '@/game/server/store';
import { requireAdmin, searchPlayers, previewRestart, applyRestart, adjustCurrency, listEvents, saveEvent, deleteEvent, toggleCodeEvent, listClosures, setClosed, adminStats, resetAltar, setAltarBlessingLevel, listDoors, setDoorOpen, adminIncome } from '@/game/server/admin';
import { readHacks, clearBroadcast, clearHackEffects } from '@/game/server/hacks';
import { postNewsSample, recentNews } from '@/game/server/news';
import { secrecyOn, setSecrecy } from '@/game/server/secrecy';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
/** v27.26 운영자 도구. 헤더 x-admin-key 필요. POST { action: 'search', query } | 'preview' | 'apply' | v27.27 'events' | 'saveEvent' { event } | 'deleteEvent' { id } | 'toggleEvent' { id, disabled } | 'adjust' { id, gold?, pearls? } | v27.31 'closures' | 'setClosed' { kind: 'stages'|'dungeons', id, closed } | v27.32 'stats' | v27.73 'doors' | 'setDoor' { id, open } | 소식 테스트 'news' | 'newsTest' { kind, name?, text?, tag? }. */
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
    // v3.58 사냥 골드 수입 통계(시간당) · query로 특정 모험가의 시간별 기록.
    if (body.action === 'income') return Response.json(await adminIncome(String(body.query ?? '')), { headers });
    if (body.action === 'stats') return Response.json(await adminStats(), { headers });
    // v27.69 제단 초기화 { kind: 'offers' | 'god' } → 새 통계
    if (body.action === 'altarReset') return Response.json(await resetAltar(String(body.kind ?? '')), { headers });
    // v3.18 해커의 방송 탈취 보기·지우기.
    if (body.action === 'hacks') { const now = Date.now(), h = await readHacks(0); return Response.json({ broadcast: h.broadcast || null, effects: { tamper: Object.keys(h.tamper).length, down: h.down.filter(d => d.until > now).length, patched: Object.values(h.patched).filter(u => u > now).length, ddos: h.ddos && h.ddos.until > now ? 1 : 0 } }, { headers }); }
    // v3.25 해킹 II~III 효과(이벤트 변조·서버 다운)와 패치를 모두 지웁니다.
    if (body.action === 'clearHackEffects') { await clearHackEffects(Date.now()); return Response.json({ ok: true }, { headers }); }
    // v3.43 정보 비공개 스위치(docs/concept.md 10장): 보기 { action: 'secrecy' }, 바꾸기 { action: 'secrecy', on }.
    if (body.action === 'secrecy') return Response.json(body.on === undefined ? { on: await secrecyOn(Date.now()), env: process.env.TIDEBOUND_SECRECY || null } : await setSecrecy(!!body.on, Date.now()), { headers });
    if (body.action === 'clearBroadcast') { await clearBroadcast(Date.now()); return Response.json({ ok: true }, { headers }); }
    if (body.action === 'setBlessing') return Response.json(await setAltarBlessingLevel(String(body.id ?? ''), Number(body.level), body.minutes === undefined ? undefined : Number(body.minutes)), { headers });
    // 운영 페이지 소식 테스트: 종류별 예시 줄을 실제와 같은 문장·발신자로 올리고 최근 20줄을 돌려줍니다.
    if (body.action === 'news') return Response.json({ rows: await recentNews() }, { headers });
    if (body.action === 'newsTest') return Response.json({ rows: await postNewsSample(String(body.kind ?? ''), { name: typeof body.name === 'string' ? body.name : undefined, text: typeof body.text === 'string' ? body.text : undefined, tag: body.tag !== false }, Date.now()) }, { headers });
    if (body.action === 'closures') return Response.json(await listClosures(), { headers });
    if (body.action === 'setClosed') return Response.json(await setClosed(String(body.kind ?? ''), String(body.id ?? ''), !!body.closed), { headers });
    if (body.action === 'doors') return Response.json(await listDoors(), { headers });
    if (body.action === 'setDoor') return Response.json(await setDoorOpen(String(body.id ?? ''), !!body.open), { headers });
    if (body.action === 'adjust') return Response.json(await adjustCurrency(String(body.id ?? ''), { gold: body.gold, pearls: body.pearls }), { headers });
    if (body.action === 'apply') return Response.json(await applyRestart(String(body.id ?? ''), Number(body.revision)), { headers });
    return Response.json({ error: '알 수 없는 요청입니다.' }, { status: 400, headers });
}
catch (e) {
    return failure(e);
} }
