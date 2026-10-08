import { session, checkOrigin, db, failure, readJson, ApiError } from '@/game/server/store';
import { guildIdOf } from '@/game/server/guild';
import type { State } from '@/game/types';
import { displayTitle } from '@/game/data/titles';
import { rankTitle } from '@/game/data/rank';
import { CHAT_MAX_CHARS, CHAT_COOLDOWN_MS } from '@/game/data/chat';
export const dynamic = 'force-dynamic';

/** v25.4 전체 채팅. 열려 있는 동안만 몇 초마다 새 줄을 묻고(after 커서), 한 줄은 120자, 계정마다 2.5초에 한 줄입니다. */
const CHANNELS = new Set(['global', 'guild', 'news']);
/** v3.39 소식 채널은 읽기만 합니다(서버가 시스템 줄로 올림). */
const READ_ONLY = new Set(['news']);
/** 'guild'는 소속 길드 채널(guild:<id>)로 바꿉니다. 무소속이면 403. */
async function resolveChannel(account: string, channel: string) {
    if (channel !== 'guild') return channel;
    const guildId = await guildIdOf(account, Date.now());
    if (!guildId) throw new ApiError('길드에 가입하면 길드 채팅을 쓸 수 있습니다.', 403);
    return `guild:${guildId}`;
}
const CHAT_PAGE = 60;

export async function GET(req: Request) { try {
    const { account, id } = await session(req), url = new URL(req.url);
    const requested = url.searchParams.get('channel') || 'global', after = Math.max(0, Math.floor(Number(url.searchParams.get('after')) || 0));
    if (!CHANNELS.has(requested)) throw new ApiError('없는 채널입니다.');
    const rows = await db().listChat(await resolveChannel(account, requested), after, CHAT_PAGE);
    return Response.json({ rows: rows.map(r => ({ id: r.id, name: r.name, text: r.text, at: r.created_at, self: r.account_id === id, ...(r.account_id === 'system-hacker' ? { kind: 'hacker' } : r.account_id.startsWith('system') ? { kind: 'system' } : {}) })), now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }

export async function POST(req: Request) { try {
    checkOrigin(req);
    const { account, id } = await session(req), body = await readJson(req, 2048);
    const requested = typeof body.channel === 'string' ? body.channel : 'global';
    if (!CHANNELS.has(requested)) throw new ApiError('없는 채널입니다.');
    if (READ_ONLY.has(requested)) throw new ApiError('소식 채널에는 글을 쓸 수 없습니다.', 403);
    // 제어 문자를 빼고 공백을 하나로 접은 뒤 길이를 봅니다.
    const text = String(body.text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) throw new ApiError('보낼 내용이 없습니다.');
    if (text.length > CHAT_MAX_CHARS) throw new ApiError(`한 줄은 ${CHAT_MAX_CHARS}자까지입니다.`);
    // v3.94 채널 판정 · 마지막으로 보낸 시각 · 이름(세이브)을 함께 읽습니다(DB 차례 대기 3번 → 1번).
    const now = Date.now(), database = db(), [channel, last, player] = await Promise.all([resolveChannel(account, requested), database.lastChatAt(id), database.getPlayer(id)]);
    if (now - last < CHAT_COOLDOWN_MS) throw new ApiError('조금 천천히 보내 주세요.', 429);
    if (!player) throw new ApiError('먼저 게임을 시작하세요.');
    const state = JSON.parse(player.state) as State, title = state.badge === 'rank' ? rankTitle(state) : displayTitle(state);
    const name = `${title ? `[${title}] ` : ''}${String(state.name || '모험가').slice(0, 20)}`;
    const row = await database.postChat({ channel, account_id: id, name, text, created_at: now });
    return Response.json({ row: { id: row.id, name: row.name, text: row.text, at: row.created_at, self: true }, now }, { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    return failure(e);
} }
