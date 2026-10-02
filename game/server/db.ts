import { packState, unpackState } from './pack';
/**
 * 저장소 계층. DATABASE_URL(또는 POSTGRES_URL)이 있으면 Neon Postgres의 HTTP 쿼리 엔드포인트를,
 * 없으면 개발용 로컬 JSON 파일(.data/dev-db.json)을 사용합니다. 추가 패키지 없이 fetch만 씁니다.
 */
export type PlayerRow = { state: string; revision: number };
export type RankingRow = { id: string; snapshot: string; rating: number; power: number; updated_at: number };
export type AccountRow = { id: string; username: string; pass_hash: string; salt: string; created_at: number };
/** v25.4 채팅 한 줄. 채널마다 최근 CHAT_KEEP개만 남깁니다. */
export type ChatRow = { id: number; channel: string; account_id: string; name: string; text: string; created_at: number };
export const CHAT_KEEP = 300;
/** 저장소에 넣는 상태 문자열. 파일 DB는 개발 편의를 위해 평문을 유지하고, TIDEBOUND_PACK_STATE=1 이면 파일 DB도 압축합니다(e2e 검증용). */
const packing = (always: boolean) => always || process.env.TIDEBOUND_PACK_STATE === '1';
export interface Storage {
    getPlayer(id: string): Promise<PlayerRow | null>;
    createPlayerIfMissing(id: string, state: string, now: number): Promise<void>;
    updatePlayer(id: string, state: string, now: number, revision: number): Promise<boolean>;
    upsertRanking(row: RankingRow): Promise<void>;
    listRankings(season: number, limit: number): Promise<RankingRow[]>;
    getRanking(id: string, season: number): Promise<RankingRow | null>;
    updateRating(id: string, rating: number): Promise<void>;
    createAccount(row: AccountRow): Promise<boolean>;
    getAccountByName(username: string): Promise<AccountRow | null>;
    createSession(token: string, accountId: string, expiresAt: number): Promise<void>;
    getSessionAccount(token: string, now: number): Promise<string | null>;
    deleteSession(token: string): Promise<void>;
    /** 채널의 afterId보다 새 메시지를 오래된 순으로 최대 limit개. afterId가 0이면 최근 limit개. */
    listChat(channel: string, afterId: number, limit: number): Promise<ChatRow[]>;
    postChat(row: Omit<ChatRow, 'id'>): Promise<ChatRow>;
    /** 계정의 마지막 메시지 시각(없으면 0). 도배 제한용. */
    lastChatAt(accountId: string): Promise<number>;
    /** v25.6 캐릭터 슬롯 요약(계정 보너스 계산용). */
    upsertSlot(row: SlotRow): Promise<void>;
    listSlots(accountId: string): Promise<SlotRow[]>;
}
export type SlotRow = { account_id: string; slot: number; summary: string; updated_at: number };

// ---------- Neon Postgres (HTTP) ----------
const SCHEMA = [
    'CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated_at BIGINT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS rankings (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL, rating INTEGER NOT NULL DEFAULT 1000, power INTEGER NOT NULL, updated_at BIGINT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS rankings_rating_idx ON rankings (rating)',
    'CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, pass_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at BIGINT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, account_id TEXT NOT NULL, expires_at BIGINT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS chat (id BIGSERIAL PRIMARY KEY, channel TEXT NOT NULL, account_id TEXT NOT NULL, name TEXT NOT NULL, text TEXT NOT NULL, created_at BIGINT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS chat_channel_id_idx ON chat (channel, id)',
    'CREATE INDEX IF NOT EXISTS chat_account_id_idx ON chat (account_id, id)',
    'CREATE TABLE IF NOT EXISTS slots (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, slot INTEGER NOT NULL, summary TEXT NOT NULL, updated_at BIGINT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS slots_account_idx ON slots (account_id)',
];
const slotRowId = (accountId: string, slot: number) => `${accountId}#${slot}`;
function neonStorage(url: string): Storage {
    // Neon 서버리스 드라이버와 같은 규칙: 호스트의 첫 레이블을 api.로 바꾼 주소의 /sql 에 쿼리를 보냅니다.
    const endpoint = `https://${new URL(url.replace(/^postgres(ql)?:/, 'https:')).hostname.replace(/^[^.]+\./, 'api.')}/sql`;
    const query = async <T>(sql: string, params: unknown[] = []): Promise<{ rows: T[]; rowCount: number }> => {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': url, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'false' }, body: JSON.stringify({ query: sql, params }) });
        if (!res.ok) throw new Error(`Database error ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const data = await res.json() as { rows: T[]; rowCount: number };
        return { rows: data.rows || [], rowCount: data.rowCount ?? 0 };
    };
    let ready: Promise<void> | null = null;
    const q = async <T>(sql: string, params: unknown[] = []) => {
        ready ??= (async () => { for (const s of SCHEMA) await query(s); })().catch(e => { ready = null; throw e; });
        await ready;
        return query<T>(sql, params);
    };
    const num = <T extends Record<string, unknown>>(r: T) => ({ ...r, ...('updated_at' in r ? { updated_at: Number(r.updated_at) } : {}), ...('rating' in r ? { rating: Number(r.rating) } : {}), ...('power' in r ? { power: Number(r.power) } : {}), ...('revision' in r ? { revision: Number(r.revision) } : {}), ...('created_at' in r ? { created_at: Number(r.created_at) } : {}) });
    return {
        async getPlayer(id) { const { rows } = await q<PlayerRow>('SELECT state, revision FROM players WHERE id=$1', [id]); return rows[0] ? { ...num(rows[0]) as PlayerRow, state: unpackState(rows[0].state) } : null; },
        async createPlayerIfMissing(id, state, now) { await q('INSERT INTO players (id,state,revision,updated_at) VALUES ($1,$2,0,$3) ON CONFLICT (id) DO NOTHING', [id, packState(state), now]); },
        async updatePlayer(id, state, now, revision) { const r = await q('UPDATE players SET state=$1, revision=revision+1, updated_at=$2 WHERE id=$3 AND revision=$4', [packState(state), now, id, revision]); return r.rowCount === 1; },
        async upsertRanking(r) { await q('INSERT INTO rankings (id,snapshot,rating,power,updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET snapshot=EXCLUDED.snapshot, rating=EXCLUDED.rating, power=EXCLUDED.power, updated_at=EXCLUDED.updated_at', [r.id, r.snapshot, r.rating, r.power, r.updated_at]); },
        async listRankings(season, limit) { const { rows } = await q<RankingRow>("SELECT id,snapshot,rating,power,updated_at FROM rankings WHERE (snapshot::jsonb->>'season')::int=$1 ORDER BY rating DESC, power DESC LIMIT $2", [season, limit]); return rows.map(r => num(r) as RankingRow); },
        async getRanking(id, season) { const { rows } = await q<RankingRow>("SELECT id,snapshot,rating,power,updated_at FROM rankings WHERE id=$1 AND (snapshot::jsonb->>'season')::int=$2", [id, season]); return rows[0] ? num(rows[0]) as RankingRow : null; },
        async updateRating(id, rating) { await q('UPDATE rankings SET rating=$1 WHERE id=$2', [rating, id]); },
        async createAccount(a) { const r = await q('INSERT INTO accounts (id,username,pass_hash,salt,created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (username) DO NOTHING', [a.id, a.username, a.pass_hash, a.salt, a.created_at]); return r.rowCount === 1; },
        async getAccountByName(username) { const { rows } = await q<AccountRow>('SELECT id,username,pass_hash,salt,created_at FROM accounts WHERE username=$1', [username]); return rows[0] ? num(rows[0]) as AccountRow : null; },
        async createSession(token, accountId, expiresAt) { await q('INSERT INTO sessions (token,account_id,expires_at) VALUES ($1,$2,$3)', [token, accountId, expiresAt]); },
        async getSessionAccount(token, now) { const { rows } = await q<{ account_id: string }>('SELECT account_id FROM sessions WHERE token=$1 AND expires_at>$2', [token, now]); return rows[0]?.account_id ?? null; },
        async deleteSession(token) { await q('DELETE FROM sessions WHERE token=$1', [token]); },
        async listChat(channel, afterId, limit) {
            const { rows } = await q<ChatRow>('SELECT id,channel,account_id,name,text,created_at FROM chat WHERE channel=$1 AND id>$2 ORDER BY id DESC LIMIT $3', [channel, afterId, limit]);
            return rows.map(r => ({ ...r, id: Number(r.id), created_at: Number(r.created_at) })).reverse();
        },
        async postChat(row) {
            const { rows } = await q<{ id: string | number }>('INSERT INTO chat (channel,account_id,name,text,created_at) VALUES ($1,$2,$3,$4,$5) RETURNING id', [row.channel, row.account_id, row.name, row.text, row.created_at]);
            const id = Number(rows[0]?.id);
            // 20번째 메시지마다 채널의 오래된 줄을 지워 테이블이 자라지 않게 합니다.
            if (id % 20 === 0) await q('DELETE FROM chat WHERE channel=$1 AND id <= (SELECT COALESCE((SELECT id FROM chat WHERE channel=$1 ORDER BY id DESC OFFSET $2 LIMIT 1), 0))', [row.channel, CHAT_KEEP]);
            return { ...row, id };
        },
        async lastChatAt(accountId) { const { rows } = await q<{ created_at: string | number }>('SELECT created_at FROM chat WHERE account_id=$1 ORDER BY id DESC LIMIT 1', [accountId]); return rows[0] ? Number(rows[0].created_at) : 0; },
        async upsertSlot(r) { await q('INSERT INTO slots (id,account_id,slot,summary,updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET summary=EXCLUDED.summary, updated_at=EXCLUDED.updated_at', [slotRowId(r.account_id, r.slot), r.account_id, r.slot, r.summary, r.updated_at]); },
        async listSlots(accountId) { const { rows } = await q<SlotRow>('SELECT account_id,slot,summary,updated_at FROM slots WHERE account_id=$1 ORDER BY slot', [accountId]); return rows.map(r => ({ ...r, slot: Number(r.slot), updated_at: Number(r.updated_at) })); },
    };
}

// ---------- 개발용 로컬 파일 ----------
type FileDb = { players: Record<string, PlayerRow & { updated_at: number }>; rankings: Record<string, RankingRow>; accounts: Record<string, AccountRow>; sessions: Record<string, { account_id: string; expires_at: number }>; slots?: Record<string, SlotRow>; chat?: ChatRow[]; chatSeq?: number };
function fileStorage(): Storage {
    const path = process.env.TIDEBOUND_DEV_DB || '.data/dev-db.json';
    let chain: Promise<unknown> = Promise.resolve();
    const load = async (): Promise<FileDb> => {
        const fs = await import('node:fs/promises');
        try { return JSON.parse(await fs.readFile(path, 'utf8')); } catch { return { players: {}, rankings: {}, accounts: {}, sessions: {} }; }
    };
    const save = async (db: FileDb) => {
        const fs = await import('node:fs/promises'), p = await import('node:path');
        await fs.mkdir(p.dirname(path), { recursive: true });
        await fs.writeFile(path, JSON.stringify(db));
    };
    const tx = <T>(fn: (db: FileDb) => T) => { const run = chain.then(async () => { const db = await load(); const out = fn(db); await save(db); return out; }); chain = run.catch(() => { }); return run; };
    const season = (r: RankingRow) => { try { return JSON.parse(r.snapshot).season; } catch { return undefined; } };
    return {
        getPlayer: id => tx(db => db.players[id] ? { state: unpackState(db.players[id].state), revision: db.players[id].revision } : null),
        createPlayerIfMissing: (id, state, now) => tx(db => { db.players[id] ??= { state: packing(false) ? packState(state) : state, revision: 0, updated_at: now }; }),
        updatePlayer: (id, state, now, revision) => tx(db => { const p = db.players[id]; if (!p || p.revision !== revision) return false; db.players[id] = { state: packing(false) ? packState(state) : state, revision: revision + 1, updated_at: now }; return true; }),
        upsertRanking: r => tx(db => { db.rankings[r.id] = r; }),
        listRankings: (s, limit) => tx(db => Object.values(db.rankings).filter(r => season(r) === s).sort((a, b) => b.rating - a.rating || b.power - a.power).slice(0, limit)),
        getRanking: (id, s) => tx(db => db.rankings[id] && season(db.rankings[id]) === s ? db.rankings[id] : null),
        updateRating: (id, rating) => tx(db => { if (db.rankings[id]) db.rankings[id].rating = rating; }),
        createAccount: a => tx(db => { if (Object.values(db.accounts).some(x => x.username === a.username)) return false; db.accounts[a.id] = a; return true; }),
        getAccountByName: username => tx(db => Object.values(db.accounts).find(x => x.username === username) || null),
        createSession: (token, accountId, expiresAt) => tx(db => { db.sessions[token] = { account_id: accountId, expires_at: expiresAt }; }),
        getSessionAccount: (token, now) => tx(db => { const x = db.sessions[token]; return x && x.expires_at > now ? x.account_id : null; }),
        deleteSession: token => tx(db => { delete db.sessions[token]; }),
        listChat: (channel, afterId, limit) => tx(db => (db.chat || []).filter(r => r.channel === channel && r.id > afterId).slice(-limit)),
        postChat: row => tx(db => { db.chat ??= []; db.chatSeq = (db.chatSeq || 0) + 1; const saved = { ...row, id: db.chatSeq }; db.chat.push(saved); const mine = db.chat.filter(r => r.channel === row.channel); if (mine.length > CHAT_KEEP) { const cut = mine[mine.length - CHAT_KEEP].id; db.chat = db.chat.filter(r => r.channel !== row.channel || r.id >= cut); } return saved; }),
        lastChatAt: accountId => tx(db => { const mine = (db.chat || []).filter(r => r.account_id === accountId); return mine.length ? mine[mine.length - 1].created_at : 0; }),
        upsertSlot: r => tx(db => { (db.slots ??= {})[slotRowId(r.account_id, r.slot)] = r; }),
        listSlots: accountId => tx(db => Object.values(db.slots || {}).filter(r => r.account_id === accountId).sort((a, b) => a.slot - b.slot)),
    };
}

/** 배포 설정 문제. 사용자에게 원인을 그대로 보여줍니다(비밀값은 포함하지 않음). */
export class ConfigError extends Error { status = 503; }
let storage: Storage | null = null;
export function db(): Storage {
    if (storage) return storage;
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (url) return storage = neonStorage(url);
    if (process.env.NODE_ENV === 'production' && !process.env.TIDEBOUND_DEV_DB) throw new ConfigError('서버에 DB가 연결되지 않았습니다(DATABASE_URL 없음). Vercel의 Storage에서 Neon을 연결한 뒤 다시 배포하세요.');
    return storage = fileStorage();
}
