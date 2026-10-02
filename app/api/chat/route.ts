import { identity, checkOrigin, db, failure, readJson, ApiError } from '@/game/server/store';
import type { State } from '@/game/types';
import { rebirthTitle } from '@/game/data/long-term';
export const dynamic = 'force-dynamic';

/** v25.4 전체 채팅. 열려 있는 동안만 몇 초마다 새 줄을 묻고(after 커서), 한 줄은 120자, 계정마다 2.5초에 한 줄입니다. */
const CHANNELS = new Set(['global']);
export const CHAT_MAX_CHARS = 120, CHAT_COOLDOWN_MS = 2500, CHAT_PAGE = 60;

export async function GET(req: Request) { try {
    const id = await identity(req), url = new URL(req.url);
    const channel = url.searchParams.get('channel') || 'global', after = Math.max(0, Math.floor(Number(url.searchParams.get('after')) || 0));
    if (!CHANNELS.has(channel)) throw new ApiError('없는 채널입니다.');
    const rows = await db().listChat(channel, after, CHAT_PAGE);
    return Response.json({ rows: rows.map(r => ({ id: r.id, name: r.name, text: r.text, at: r.created_at, self: r.account_id === id })), now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }

export async function POST(req: Request) { try {
    checkOrigin(req);
    const id = await identity(req), body = await readJson(req, 2048);
    const channel = typeof body.channel === 'string' ? body.channel : 'global';
    if (!CHANNELS.has(channel)) throw new ApiError('없는 채널입니다.');
    // 제어 문자를 빼고 공백을 하나로 접은 뒤 길이를 봅니다.
    const text = String(body.text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) throw new ApiError('보낼 내용이 없습니다.');
    if (text.length > CHAT_MAX_CHARS) throw new ApiError(`한 줄은 ${CHAT_MAX_CHARS}자까지입니다.`);
    const now = Date.now(), database = db();
    if (now - await database.lastChatAt(id) < CHAT_COOLDOWN_MS) throw new ApiError('조금 천천히 보내 주세요.', 429);
    const player = await database.getPlayer(id);
    if (!player) throw new ApiError('먼저 게임을 시작하세요.');
    const state = JSON.parse(player.state) as State, title = rebirthTitle(state.rebirths || 0);
    const name = `${title ? `[${title}] ` : ''}${String(state.name || '낚시꾼').slice(0, 20)}`;
    const row = await database.postChat({ channel, account_id: id, name, text, created_at: now });
    return Response.json({ row: { id: row.id, name: row.name, text: row.text, at: row.created_at, self: true }, now }, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }
