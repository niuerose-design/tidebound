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
/** v25.11 공유 길드. 주간 합산(week가 현재 주와 다르면 0으로 보고 다시 셉니다). */
export type GuildRow = { id: string; name: string; code: string; leader: string; treasury: number; created_at: number; week: string; catches: number; clears: number; bosses: number; abyss: number; donated: number; points: number };
export type GuildMemberRow = { account_id: string; guild_id: string; name: string; joined_at: number; week: string; catches: number; clears: number; bosses: number; abyss: number; donated: number; claimed: string };
/** v25.13 계정 공유 금고. pearl_out은 이번 주(week) 진주 인출 합계(주당 상한용). */
export type WalletRow = { account_id: string; pearls: number; essence: number; week: string; pearl_out: number };
export type GuildDelta = { catches?: number; clears?: number; bosses?: number; abyss?: number; donated?: number };
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
    /** v27.26 운영 도구용: 모든 계정의 id·아이디. */
    listAccounts(): Promise<{ id: string; username: string }[]>;
    /** v27.26 운영 도구용: 모든 세이브(압축 해제된 상태 문자열). */
    listPlayers(): Promise<{ id: string; state: string; revision: number; updated_at: number }[]>;
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
    /** v25.11 공유 길드. createGuild는 이름이 겹치면 false. */
    createGuild(row: GuildRow): Promise<boolean>;
    getGuild(id: string): Promise<GuildRow | null>;
    getGuildByCode(code: string): Promise<GuildRow | null>;
    renameGuild(id: string, name: string): Promise<boolean>;
    setGuildLeader(id: string, leader: string): Promise<void>;
    deleteGuild(id: string): Promise<void>;
    /** 주간 합산을 더합니다(abyss는 최대값, treasury는 donated만큼 누적). week가 바뀌었으면 0에서 시작. */
    bumpGuild(id: string, week: string, delta: GuildDelta): Promise<void>;
    listGuildBoard(week: string, limit: number): Promise<GuildRow[]>;
    addGuildMember(row: GuildMemberRow): Promise<void>;
    getGuildMember(accountId: string): Promise<GuildMemberRow | null>;
    listGuildMembers(guildId: string): Promise<GuildMemberRow[]>;
    removeGuildMember(accountId: string): Promise<void>;
    bumpGuildMember(accountId: string, week: string, delta: GuildDelta, claimed?: string): Promise<void>;
    renameGuildMember(accountId: string, name: string): Promise<void>;
    /** v25.13 계정 금고. 없으면 0으로 봅니다. setWallet은 통째로 씁니다(계정당 요청이 직렬이라 읽고-쓰기면 충분). */
    getWallet(accountId: string): Promise<WalletRow | null>;
    setWallet(row: WalletRow): Promise<void>;
}
/** 주 키가 바뀌면 0으로 보는 주간 합산 갱신(파일 DB와 Neon이 같은 규칙). */
export function applyDelta<T extends { week: string; catches: number; clears: number; bosses: number; abyss: number; donated: number }>(row: T, week: string, d: GuildDelta): T {
    const same = row.week === week;
    const base = same ? row : { ...row, catches: 0, clears: 0, bosses: 0, abyss: 0, donated: 0 };
    return { ...base, week, catches: base.catches + (d.catches || 0), clears: base.clears + (d.clears || 0), bosses: base.bosses + (d.bosses || 0), abyss: Math.max(base.abyss, d.abyss || 0), donated: base.donated + (d.donated || 0) };
}
const points = (r: { catches: number; clears: number; bosses: number; abyss: number; donated: number }) => r.catches + r.clears * 20 + r.bosses * 5 + r.abyss * 10 + Math.floor(r.donated / 1000);
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
    'CREATE TABLE IF NOT EXISTS guilds (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, code TEXT NOT NULL UNIQUE, leader TEXT NOT NULL, treasury BIGINT NOT NULL DEFAULT 0, created_at BIGINT NOT NULL, week TEXT NOT NULL DEFAULT \'\', catches INTEGER NOT NULL DEFAULT 0, clears INTEGER NOT NULL DEFAULT 0, bosses INTEGER NOT NULL DEFAULT 0, abyss INTEGER NOT NULL DEFAULT 0, donated BIGINT NOT NULL DEFAULT 0, points BIGINT NOT NULL DEFAULT 0)',
    'CREATE INDEX IF NOT EXISTS guilds_week_points_idx ON guilds (week, points)',
    'CREATE TABLE IF NOT EXISTS guild_members (account_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, name TEXT NOT NULL, joined_at BIGINT NOT NULL, week TEXT NOT NULL DEFAULT \'\', catches INTEGER NOT NULL DEFAULT 0, clears INTEGER NOT NULL DEFAULT 0, bosses INTEGER NOT NULL DEFAULT 0, abyss INTEGER NOT NULL DEFAULT 0, donated BIGINT NOT NULL DEFAULT 0, claimed TEXT NOT NULL DEFAULT \'\')',
    'CREATE INDEX IF NOT EXISTS guild_members_guild_idx ON guild_members (guild_id)',
    'CREATE TABLE IF NOT EXISTS wallets (account_id TEXT PRIMARY KEY, pearls INTEGER NOT NULL DEFAULT 0, essence INTEGER NOT NULL DEFAULT 0, week TEXT NOT NULL DEFAULT \'\', pearl_out INTEGER NOT NULL DEFAULT 0)',
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
    const numGuild = (r: GuildRow): GuildRow => ({ ...r, treasury: Number(r.treasury), created_at: Number(r.created_at), catches: Number(r.catches), clears: Number(r.clears), bosses: Number(r.bosses), abyss: Number(r.abyss), donated: Number(r.donated), points: Number(r.points) });
    const numMember = (r: GuildMemberRow): GuildMemberRow => ({ ...r, joined_at: Number(r.joined_at), catches: Number(r.catches), clears: Number(r.clears), bosses: Number(r.bosses), abyss: Number(r.abyss), donated: Number(r.donated) });
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
        async listAccounts() { const { rows } = await q<{ id: string; username: string }>('SELECT id, username FROM accounts'); return rows; },
        async listPlayers() { const { rows } = await q<{ id: string; state: string; revision: number; updated_at: number }>('SELECT id, state, revision, updated_at FROM players'); return rows.map(r => ({ id: r.id, state: unpackState(r.state), revision: Number(r.revision), updated_at: Number(r.updated_at) })); },
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
        async createGuild(g) { const r = await q('INSERT INTO guilds (id,name,code,leader,treasury,created_at,week,catches,clears,bosses,abyss,donated,points) VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,0,0,0,0) ON CONFLICT (name) DO NOTHING', [g.id, g.name, g.code, g.leader, g.treasury, g.created_at, g.week]); return r.rowCount === 1; },
        async getGuild(id) { const { rows } = await q<GuildRow>('SELECT * FROM guilds WHERE id=$1', [id]); return rows[0] ? numGuild(rows[0]) : null; },
        async getGuildByCode(code) { const { rows } = await q<GuildRow>('SELECT * FROM guilds WHERE code=$1', [code]); return rows[0] ? numGuild(rows[0]) : null; },
        async renameGuild(id, name) { try { const r = await q('UPDATE guilds SET name=$1 WHERE id=$2', [name, id]); return r.rowCount === 1; } catch { return false; } },
        async setGuildLeader(id, leader) { await q('UPDATE guilds SET leader=$1 WHERE id=$2', [leader, id]); },
        async deleteGuild(id) { await q('DELETE FROM guild_members WHERE guild_id=$1', [id]); await q('DELETE FROM guilds WHERE id=$1', [id]); },
        async bumpGuild(id, week, d) {
            const g = await this.getGuild(id); if (!g) return;
            const n = applyDelta(g, week, d);
            await q('UPDATE guilds SET week=$2, catches=$3, clears=$4, bosses=$5, abyss=$6, donated=$7, points=$8, treasury=treasury+$9 WHERE id=$1', [id, week, n.catches, n.clears, n.bosses, n.abyss, n.donated, points(n), d.donated || 0]);
        },
        async listGuildBoard(week, limit) { const { rows } = await q<GuildRow>('SELECT * FROM guilds WHERE week=$1 ORDER BY points DESC, created_at ASC LIMIT $2', [week, limit]); return rows.map(numGuild); },
        async addGuildMember(m) { await q('INSERT INTO guild_members (account_id,guild_id,name,joined_at,week,catches,clears,bosses,abyss,donated,claimed) VALUES ($1,$2,$3,$4,$5,0,0,0,0,0,$6) ON CONFLICT (account_id) DO UPDATE SET guild_id=EXCLUDED.guild_id, name=EXCLUDED.name, joined_at=EXCLUDED.joined_at, week=EXCLUDED.week, catches=0, clears=0, bosses=0, abyss=0, donated=0, claimed=$6', [m.account_id, m.guild_id, m.name, m.joined_at, m.week, '']); },
        async getGuildMember(accountId) { const { rows } = await q<GuildMemberRow>('SELECT * FROM guild_members WHERE account_id=$1', [accountId]); return rows[0] ? numMember(rows[0]) : null; },
        async listGuildMembers(guildId) { const { rows } = await q<GuildMemberRow>('SELECT * FROM guild_members WHERE guild_id=$1 ORDER BY joined_at ASC', [guildId]); return rows.map(numMember); },
        async removeGuildMember(accountId) { await q('DELETE FROM guild_members WHERE account_id=$1', [accountId]); },
        async bumpGuildMember(accountId, week, d, claimed) {
            const m = await this.getGuildMember(accountId); if (!m) return;
            const n = applyDelta(m, week, d), claims = claimed !== undefined ? claimed : m.week === week ? m.claimed : '';
            await q('UPDATE guild_members SET week=$2, catches=$3, clears=$4, bosses=$5, abyss=$6, donated=$7, claimed=$8 WHERE account_id=$1', [accountId, week, n.catches, n.clears, n.bosses, n.abyss, n.donated, claims]);
        },
        async renameGuildMember(accountId, name) { await q('UPDATE guild_members SET name=$1 WHERE account_id=$2', [name, accountId]); },
        async getWallet(accountId) { const { rows } = await q<WalletRow>('SELECT account_id,pearls,essence,week,pearl_out FROM wallets WHERE account_id=$1', [accountId]); return rows[0] ? { ...rows[0], pearls: Number(rows[0].pearls), essence: Number(rows[0].essence), pearl_out: Number(rows[0].pearl_out) } : null; },
        async setWallet(w) { await q('INSERT INTO wallets (account_id,pearls,essence,week,pearl_out) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (account_id) DO UPDATE SET pearls=EXCLUDED.pearls, essence=EXCLUDED.essence, week=EXCLUDED.week, pearl_out=EXCLUDED.pearl_out', [w.account_id, w.pearls, w.essence, w.week, w.pearl_out]); },
    };
}

// ---------- 개발용 로컬 파일 ----------
type FileDb = { players: Record<string, PlayerRow & { updated_at: number }>; rankings: Record<string, RankingRow>; accounts: Record<string, AccountRow>; sessions: Record<string, { account_id: string; expires_at: number }>; slots?: Record<string, SlotRow>; guilds?: Record<string, GuildRow>; guildMembers?: Record<string, GuildMemberRow>; wallets?: Record<string, WalletRow>; chat?: ChatRow[]; chatSeq?: number };
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
        listAccounts: () => tx(db => Object.values(db.accounts).map(a => ({ id: a.id, username: a.username }))),
        listPlayers: () => tx(db => Object.entries(db.players).map(([id, p]) => ({ id, state: unpackState(p.state), revision: p.revision, updated_at: p.updated_at }))),
        createSession: (token, accountId, expiresAt) => tx(db => { db.sessions[token] = { account_id: accountId, expires_at: expiresAt }; }),
        getSessionAccount: (token, now) => tx(db => { const x = db.sessions[token]; return x && x.expires_at > now ? x.account_id : null; }),
        deleteSession: token => tx(db => { delete db.sessions[token]; }),
        listChat: (channel, afterId, limit) => tx(db => (db.chat || []).filter(r => r.channel === channel && r.id > afterId).slice(-limit)),
        postChat: row => tx(db => { db.chat ??= []; db.chatSeq = (db.chatSeq || 0) + 1; const saved = { ...row, id: db.chatSeq }; db.chat.push(saved); const mine = db.chat.filter(r => r.channel === row.channel); if (mine.length > CHAT_KEEP) { const cut = mine[mine.length - CHAT_KEEP].id; db.chat = db.chat.filter(r => r.channel !== row.channel || r.id >= cut); } return saved; }),
        lastChatAt: accountId => tx(db => { const mine = (db.chat || []).filter(r => r.account_id === accountId); return mine.length ? mine[mine.length - 1].created_at : 0; }),
        upsertSlot: r => tx(db => { (db.slots ??= {})[slotRowId(r.account_id, r.slot)] = r; }),
        listSlots: accountId => tx(db => Object.values(db.slots || {}).filter(r => r.account_id === accountId).sort((a, b) => a.slot - b.slot)),
        createGuild: g => tx(db => { db.guilds ??= {}; if (Object.values(db.guilds).some(x => x.name === g.name)) return false; db.guilds[g.id] = { ...g }; return true; }),
        getGuild: id => tx(db => db.guilds?.[id] ? { ...db.guilds[id] } : null),
        getGuildByCode: code => tx(db => { const g = Object.values(db.guilds || {}).find(x => x.code === code); return g ? { ...g } : null; }),
        renameGuild: (id, name) => tx(db => { const g = db.guilds?.[id]; if (!g || Object.values(db.guilds || {}).some(x => x.id !== id && x.name === name)) return false; g.name = name; return true; }),
        setGuildLeader: (id, leader) => tx(db => { const g = db.guilds?.[id]; if (g) g.leader = leader; }),
        deleteGuild: id => tx(db => { delete db.guilds?.[id]; for (const [k, m] of Object.entries(db.guildMembers || {})) if (m.guild_id === id) delete db.guildMembers![k]; }),
        bumpGuild: (id, week, d) => tx(db => { const g = db.guilds?.[id]; if (!g) return; const n = applyDelta(g, week, d); db.guilds![id] = { ...n, points: points(n), treasury: g.treasury + (d.donated || 0) }; }),
        listGuildBoard: (week, limit) => tx(db => Object.values(db.guilds || {}).filter(g => g.week === week).sort((a, b) => b.points - a.points || a.created_at - b.created_at).slice(0, limit).map(g => ({ ...g }))),
        addGuildMember: m => tx(db => { (db.guildMembers ??= {})[m.account_id] = { ...m, catches: 0, clears: 0, bosses: 0, abyss: 0, donated: 0, claimed: '' }; }),
        getGuildMember: accountId => tx(db => db.guildMembers?.[accountId] ? { ...db.guildMembers[accountId] } : null),
        listGuildMembers: guildId => tx(db => Object.values(db.guildMembers || {}).filter(m => m.guild_id === guildId).sort((a, b) => a.joined_at - b.joined_at).map(m => ({ ...m }))),
        removeGuildMember: accountId => tx(db => { delete db.guildMembers?.[accountId]; }),
        bumpGuildMember: (accountId, week, d, claimed) => tx(db => { const m = db.guildMembers?.[accountId]; if (!m) return; const n = applyDelta(m, week, d); db.guildMembers![accountId] = { ...n, claimed: claimed !== undefined ? claimed : m.week === week ? m.claimed : '' }; }),
        renameGuildMember: (accountId, name) => tx(db => { const m = db.guildMembers?.[accountId]; if (m) m.name = name; }),
        getWallet: accountId => tx(db => db.wallets?.[accountId] ? { ...db.wallets[accountId] } : null),
        setWallet: w => tx(db => { (db.wallets ??= {})[w.account_id] = { ...w }; }),
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
