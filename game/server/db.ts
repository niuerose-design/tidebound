import { packState, unpackState } from './pack';
import { CHAT_KEEP } from '../data/chat';
/**
 * 저장소 계층. DATABASE_URL(또는 POSTGRES_URL)이 있으면 Neon Postgres의 HTTP 쿼리 엔드포인트를,
 * 없으면 개발용 로컬 JSON 파일(.data/dev-db.json)을 사용합니다. 추가 패키지 없이 fetch만 씁니다.
 */
export type PlayerRow = { state: string; revision: number };
export type RankingRow = { id: string; snapshot: string; rating: number; power: number; updated_at: number };
export type AccountRow = { id: string; username: string; pass_hash: string; salt: string; created_at: number };
/** v25.4 채팅 한 줄. 채널마다 최근 CHAT_KEEP개만 남깁니다. */
export type CrewRow = { id: string; code: string; data: string; revision: number };
export type ChatRow = { id: number; channel: string; account_id: string; name: string; text: string; created_at: number };
/** v25.11 공유 길드. 주간 합산(week가 현재 주와 다르면 0으로 보고 다시 셉니다). */
export type GuildRow = { id: string; name: string; code: string; leader: string; treasury: number; created_at: number; week: string; catches: number; clears: number; bosses: number; abyss: number; donated: number; points: number };
export type GuildMemberRow = { account_id: string; guild_id: string; name: string; joined_at: number; week: string; catches: number; clears: number; bosses: number; abyss: number; donated: number; claimed: string };
/** v25.13 계정 공유 금고. pearl_out은 이번 주(week) 세계석 인출 합계(주당 상한용). */
export type WalletRow = { account_id: string; pearls: number; essence: number; week: string; pearl_out: number };
/** v27.43 제단(서버에 한 줄). god_state: none(깨어난 적 없음)·alive·slain·gone(시간이 지나 떠남은 god_until로 판단). */
export type AltarRow = { /** v27.91 월드보스: 세대·종류·상태(none/alive/slain/gone)·남은/최대 공유 체력·떠나는 시각·마지막 일격·격파 시각 */ raid_gen: number; raid_id: string; raid_state: string; raid_hp: number; raid_hp_max: number; raid_until: number; raid_slayer: string; raid_slain_at: number; gen: number; god_state: string; god: string; god_until: number; throne: string; throne_name: string; throne_since: number; throne_snapshot: string; tithe_gold: number; tithe_pearls: number; tithe_essence: number; total_gold: number; total_pearls: number; total_essence: number; total_points: number };
/** 제단 게이지(축복·신 소환). until은 축복이 열려 있는 시각(신 소환은 쓰지 않음). */
export type AltarGaugeRow = { id: string; points: number; until: number; level?: number; /** v3.16 4단계 이상이 유지되는 시각. 지나면 3단계로 봅니다. */ high_until?: number };
/** 이번 주 제단 기여. id는 주:모험가. anonymous=1이면 순위표에 이름을 숨깁니다. */
export type AltarTotalRow = { player_id: string; name: string; anonymous: number; points: number };
export type AltarOfferRow = { id: string; week: string; player_id: string; account_id: string; name: string; anonymous: number; points: number; gold: number; pearls: number; essence: number; updated_at: number };
export type AltarAmounts = { gold: number; pearls: number; essence: number };
/** v27.91 월드보스 피해 기록. id는 세대:모험가. */
/** v3.22 보스별 월드보스 상태(none/alive/slain/gone). */
export type AltarRaidRow = { id: string; gen: number; state: string; hp: number; hp_max: number; until: number; slayer: string; slain_at: number };
export type AltarRaidHitRow = { id: string; gen: number; player_id: string; name: string; dealt: number; hits: number; updated_at: number };
const ALTAR_EMPTY: AltarRow = { raid_gen: 0, raid_id: '', raid_state: 'none', raid_hp: 0, raid_hp_max: 0, raid_until: 0, raid_slayer: '', raid_slain_at: 0, gen: 0, god_state: 'none', god: '', god_until: 0, throne: '', throne_name: '', throne_since: 0, throne_snapshot: '', tithe_gold: 0, tithe_pearls: 0, tithe_essence: 0, total_gold: 0, total_pearls: 0, total_essence: 0, total_points: 0 };
export type GuildDelta = { catches?: number; clears?: number; bosses?: number; abyss?: number; donated?: number };
/** 저장소에 넣는 상태 문자열. 파일 DB는 개발 편의를 위해 평문을 유지하고, TIDEBOUND_PACK_STATE=1 이면 파일 DB도 압축합니다(e2e 검증용). */
const packing = (always: boolean) => always || process.env.TIDEBOUND_PACK_STATE === '1';
export interface Storage {
    getPlayer(id: string): Promise<PlayerRow | null>;
    createPlayerIfMissing(id: string, state: string, now: number): Promise<void>;
    updatePlayer(id: string, state: string, now: number, revision: number): Promise<boolean>;
    upsertRanking(row: RankingRow): Promise<void>;
    /** v3.31 승천: 결투·무릉도장 주간 기록판에서 즉시 빠질 때 씁니다. */
    deleteRanking(id: string): Promise<void>;
    listRankings(season: number, limit: number): Promise<RankingRow[]>;
    getRanking(id: string, season: number): Promise<RankingRow | null>;
    updateRating(id: string, rating: number): Promise<void>;
    createAccount(row: AccountRow): Promise<boolean>;
    getAccountByName(username: string): Promise<AccountRow | null>;
    /** v27.26 운영 도구용: 모든 계정의 id·아이디. */
    listAccounts(): Promise<{ id: string; username: string }[]>;
    /** v27.26 운영 도구용: 모든 세이브(압축 해제된 상태 문자열). */
    listPlayers(): Promise<{ id: string; state: string; revision: number; updated_at: number }[]>;
    /** v3.28 해커 조직: 행 읽기·코드로 찾기·전체 목록(순위)·revision 비교 저장(새 조직은 revision −1). v3.29 저장 때 코드도 함께 바꿈(다른 조직과 겹치면 false). */
    getCrew(id: string): Promise<CrewRow | null>;
    getCrewByCode(code: string): Promise<CrewRow | null>;
    listCrews(): Promise<CrewRow[]>;
    putCrew(id: string, code: string, data: string, revision: number, now: number): Promise<boolean>;
    deleteCrew(id: string): Promise<void>;
    /** v3.25 패킷 스니핑: since 이후 저장된(활동한) 모험가 수(나 제외). */
    countActivePlayers(since: number, except: string): Promise<number>;
    /** v27.27 운영 설정(서버 이벤트 등) 키-값. */
    getSetting(key: string): Promise<string | null>;
    setSetting(key: string, value: string, now: number): Promise<void>;
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
    /** v27.43 제단. 모든 갱신은 한 문장(원자적)이라 여러 인스턴스가 동시에 바쳐도 값이 틀어지지 않습니다. */
    getAltar(): Promise<AltarRow>;
    /** 누적 합계를 더하고, 자리 주인이 있고 바친 사람이 주인이 아니면 몫(tithe)을 쌓습니다. */
    addAltar(offerer: string, add: AltarAmounts & { points: number }, tithe: AltarAmounts): Promise<void>;
    listAltarGauges(): Promise<AltarGaugeRow[]>;
    addAltarGauge(id: string, points: number): Promise<void>;
    /** 게이지에서 cost만큼 뺍니다. 모자라면 false(동시에 둘이 넘겨도 한 번만 성공). */
    spendAltarGauge(id: string, cost: number): Promise<boolean>;
    /** 축복 시간을 늘립니다: max(지금, 남은 끝) + ms, 단 지금 + cap까지. 새 종료 시각을 돌려줍니다. */
    extendAltarGauge(id: string, now: number, ms: number, cap: number): Promise<number>;
    /** v27.48 축복 한 칸: 게이지에서 cost를 빼고, 진행 중이면 단계 +1(최대 max)·아니면 1단계로 열고, 시간을 ms만큼 늘립니다(지금부터 cap까지).
     *  expectLevel(진행 중이 아니면 0)이 그대로일 때만 적용해 비용 계산과 동시 바치기가 어긋나지 않게 합니다. 실패하면 null. */
    /** v3.16 highMs > 0이면 상위 단계: high_until = now + highMs, 전체 until은 now + highMs + cap 이상 보장(상위 단계가 끝나면 3단계가 cap 동안 이어짐, ms는 0으로). highFrom 이하가 '기본 단계'. */
    levelAltarBlessing(id: string, cost: number, expectLevel: number, now: number, ms: number, cap: number, max: number, highMs?: number, highFrom?: number): Promise<{ level: number; until: number } | null>;
    /** 살아 있는 신이 없을 때만 새 신을 깨웁니다(세대 +1). */
    summonAltarGod(god: string, until: number, now: number): Promise<boolean>;
    /** gen 세대의 신이 아직 살아 있으면 쓰러뜨린 모험가를 자리에 앉히고 몫을 비웁니다. 먼저 온 한 명만 true. */
    claimAltarThrone(gen: number, id: string, name: string, snapshot: string, now: number): Promise<boolean>;
    /** 자리 주인이면 쌓인 몫을 0으로 만들고 그 값을 돌려줍니다. */
    takeAltarTithe(id: string): Promise<AltarAmounts | null>;
    /** v27.69 운영: 모든 게이지에 쌓인 기여도를 0으로(열려 있는 축복의 남은 시간·단계는 그대로). */
    resetAltarGauges(): Promise<void>;
    /** v3.17 운영: 축복 게이지의 단계·종료 시각·상위 단계 유지 시각을 직접 둡니다(기여도는 그대로). */
    setAltarBlessing(id: string, level: number, until: number, highUntil: number): Promise<void>;
    /** v27.69 운영: 깨어난 신·신의 자리 주인·쌓인 몫을 비웁니다(세대 수 gen과 누적 합계는 유지). */
    resetAltarGod(): Promise<void>;
    /** v27.69 신의 자리 임기 만료: before보다 먼저 앉은 자리와 쌓인 몫만 비웁니다(조건부라 막 앉은 자리는 건드리지 않음). 비웠으면 true. */
    expireAltarThrone(before: number): Promise<boolean>;
    /** v27.70 탄핵: 지금 자리 주인이 id일 때만 자리와 몫을 비웁니다(경쟁 안전). 비웠으면 true. */
    vacateAltarThrone(id: string): Promise<boolean>;
    bumpAltarOffer(row: Omit<AltarOfferRow, 'id' | 'points' | 'gold' | 'pearls' | 'essence'>, add: AltarAmounts & { points: number }): Promise<void>;
    listAltarOffers(week: string, limit: number): Promise<AltarOfferRow[]>;
    /** v3.19 누적 기여 순위: 모든 주를 합친 기여도(이름·익명은 가장 최근 기록). */
    listAltarOffersAllTime(limit: number): Promise<AltarTotalRow[]>;
    sumAltarOffers(playerId: string): Promise<{ points: number; above: number }>;
    getAltarOffer(week: string, playerId: string): Promise<AltarOfferRow | null>;
    /** 이번 주 기여도가 points보다 높은 모험가 수(내 순위 = 이 값 + 1). */
    countAltarAbove(week: string, points: number): Promise<number>;
    /** v3.22 월드보스는 보스마다 따로(altar_raids). 세대 번호는 모든 보스가 함께 쓰는 순번(altar.raid_gen)이라 피해 기록(altar_raid_hits)이 섞이지 않습니다. */
    listAltarRaids(): Promise<AltarRaidRow[]>;
    /** 그 보스가 살아 있지 않고 격파 뒤 respawnMs도 지났을 때만 새로 나타납니다. 새 세대 번호, 못 했으면 0. */
    summonAltarRaid(raidId: string, hpMax: number, until: number, now: number, respawnMs: number): Promise<number>;
    /** 그 보스의 gen 세대가 살아 있을 때만 피해를 빼고 남은 체력을 돌려줍니다(0 이하는 0). 아니면 null. */
    hitAltarRaid(raidId: string, gen: number, dealt: number): Promise<number | null>;
    /** v3.28 해킹 VII 세이브 스캠: 살아 있는 gen 세대 보스의 체력에 delta를 더합니다(1 ~ 최대 체력, 쓰러뜨리지 않음). 바꾼 뒤 체력, 아니면 null. */
    shiftAltarRaid(raidId: string, gen: number, delta: number): Promise<number | null>;
    /** 체력이 0이 된 gen 세대 보스를 격파 처리하고 마지막 일격 모험가 id를 적습니다. 먼저 온 한 명만 true. */
    slayAltarRaid(raidId: string, gen: number, id: string, name: string, now: number): Promise<boolean>;
    /** 떠나는 시각이 지난 그 보스를 보냅니다(gone). 바꿨으면 true. */
    expireAltarRaid(raidId: string, now: number): Promise<boolean>;
    bumpRaidHit(gen: number, playerId: string, name: string, dealt: number, now: number): Promise<void>;
    listRaidHits(gen: number, limit: number): Promise<AltarRaidHitRow[]>;
    getRaidHit(gen: number, playerId: string): Promise<AltarRaidHitRow | null>;
    countRaidHits(gen: number): Promise<number>;
    countRaidAbove(gen: number, dealt: number): Promise<number>;
}
/** 주 키가 바뀌면 0으로 보는 주간 합산 갱신(파일 DB와 Neon이 같은 규칙). */
function applyDelta<T extends { week: string; catches: number; clears: number; bosses: number; abyss: number; donated: number }>(row: T, week: string, d: GuildDelta): T {
    const same = row.week === week;
    const base = same ? row : { ...row, catches: 0, clears: 0, bosses: 0, abyss: 0, donated: 0 };
    return { ...base, week, catches: base.catches + (d.catches || 0), clears: base.clears + (d.clears || 0), bosses: base.bosses + (d.bosses || 0), abyss: Math.max(base.abyss, d.abyss || 0), donated: base.donated + (d.donated || 0) };
}
const points = (r: { catches: number; clears: number; bosses: number; abyss: number; donated: number }) => r.catches + r.clears * 20 + r.bosses * 5 + r.abyss * 10 + Math.floor(r.donated / 1000);
export type SlotRow = { account_id: string; slot: number; summary: string; updated_at: number };

// ---------- Neon Postgres (HTTP) ----------
const SCHEMA = [
    'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at BIGINT NOT NULL)',
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
    'CREATE TABLE IF NOT EXISTS altar (id TEXT PRIMARY KEY, gen INTEGER NOT NULL DEFAULT 0, god_state TEXT NOT NULL DEFAULT \'none\', god TEXT NOT NULL DEFAULT \'\', god_until BIGINT NOT NULL DEFAULT 0, throne TEXT NOT NULL DEFAULT \'\', throne_name TEXT NOT NULL DEFAULT \'\', throne_since BIGINT NOT NULL DEFAULT 0, throne_snapshot TEXT NOT NULL DEFAULT \'\', tithe_gold BIGINT NOT NULL DEFAULT 0, tithe_pearls BIGINT NOT NULL DEFAULT 0, tithe_essence BIGINT NOT NULL DEFAULT 0, total_gold BIGINT NOT NULL DEFAULT 0, total_pearls BIGINT NOT NULL DEFAULT 0, total_essence BIGINT NOT NULL DEFAULT 0, total_points BIGINT NOT NULL DEFAULT 0)',
    'INSERT INTO altar (id) VALUES (\'main\') ON CONFLICT (id) DO NOTHING',
    'CREATE TABLE IF NOT EXISTS altar_gauges (id TEXT PRIMARY KEY, points BIGINT NOT NULL DEFAULT 0, until BIGINT NOT NULL DEFAULT 0)',
    // v27.48 축복 단계(끝난 축복은 until이 지나 단계를 0으로 봅니다).
    'ALTER TABLE altar_gauges ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 0',
    // v3.16 상위 단계(4~6)의 유지 시각.
    'ALTER TABLE altar_gauges ADD COLUMN IF NOT EXISTS high_until BIGINT NOT NULL DEFAULT 0',
    'CREATE TABLE IF NOT EXISTS altar_offers (id TEXT PRIMARY KEY, week TEXT NOT NULL, player_id TEXT NOT NULL, account_id TEXT NOT NULL, name TEXT NOT NULL, anonymous INTEGER NOT NULL DEFAULT 0, points BIGINT NOT NULL DEFAULT 0, gold BIGINT NOT NULL DEFAULT 0, pearls BIGINT NOT NULL DEFAULT 0, essence BIGINT NOT NULL DEFAULT 0, updated_at BIGINT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS altar_offers_week_points_idx ON altar_offers (week, points)',
    // v27.91 월드보스(공유 체력)와 피해 기록.
    'ALTER TABLE altar ADD COLUMN IF NOT EXISTS raid_gen INTEGER NOT NULL DEFAULT 0',
    "ALTER TABLE altar ADD COLUMN IF NOT EXISTS raid_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE altar ADD COLUMN IF NOT EXISTS raid_state TEXT NOT NULL DEFAULT 'none'",
    'ALTER TABLE altar ADD COLUMN IF NOT EXISTS raid_hp BIGINT NOT NULL DEFAULT 0',
    'ALTER TABLE altar ADD COLUMN IF NOT EXISTS raid_hp_max BIGINT NOT NULL DEFAULT 0',
    'ALTER TABLE altar ADD COLUMN IF NOT EXISTS raid_until BIGINT NOT NULL DEFAULT 0',
    "ALTER TABLE altar ADD COLUMN IF NOT EXISTS raid_slayer TEXT NOT NULL DEFAULT ''",
    'ALTER TABLE altar ADD COLUMN IF NOT EXISTS raid_slain_at BIGINT NOT NULL DEFAULT 0',
    'CREATE TABLE IF NOT EXISTS altar_raid_hits (id TEXT PRIMARY KEY, gen INTEGER NOT NULL, player_id TEXT NOT NULL, name TEXT NOT NULL, dealt BIGINT NOT NULL DEFAULT 0, hits INTEGER NOT NULL DEFAULT 0, updated_at BIGINT NOT NULL)',
    'CREATE INDEX IF NOT EXISTS altar_raid_hits_gen_dealt_idx ON altar_raid_hits (gen, dealt)',
    // v3.22 보스별 월드보스. 예전 한 마리 칸(altar.raid_*)에 있던 보스는 처음 한 번 옮깁니다(이미 있으면 그대로).
    "CREATE TABLE IF NOT EXISTS altar_raids (id TEXT PRIMARY KEY, gen INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL DEFAULT 'none', hp BIGINT NOT NULL DEFAULT 0, hp_max BIGINT NOT NULL DEFAULT 0, until BIGINT NOT NULL DEFAULT 0, slayer TEXT NOT NULL DEFAULT '', slain_at BIGINT NOT NULL DEFAULT 0)",
    "INSERT INTO altar_raids (id,gen,state,hp,hp_max,until,slayer,slain_at) SELECT raid_id, raid_gen, raid_state, raid_hp, raid_hp_max, raid_until, raid_slayer, raid_slain_at FROM altar WHERE id='main' AND raid_id<>'' AND raid_gen>0 AND raid_state IN ('alive','slain') ON CONFLICT (id) DO NOTHING",
    // v3.28 해커 조직: 조직 하나를 JSON 한 칸에 두고 revision으로 동시 수정을 막습니다(조직원 10명 이하라 한 행으로 충분).
    'CREATE TABLE IF NOT EXISTS crews (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated_at BIGINT NOT NULL)',
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
    const numAltar = (r: AltarRow): AltarRow => ({ ...r, raid_gen: Number(r.raid_gen || 0), raid_hp: Number(r.raid_hp || 0), raid_hp_max: Number(r.raid_hp_max || 0), raid_until: Number(r.raid_until || 0), raid_slain_at: Number(r.raid_slain_at || 0), raid_id: r.raid_id || '', raid_state: r.raid_state || 'none', raid_slayer: r.raid_slayer || '', gen: Number(r.gen), god_until: Number(r.god_until), throne_since: Number(r.throne_since), tithe_gold: Number(r.tithe_gold), tithe_pearls: Number(r.tithe_pearls), tithe_essence: Number(r.tithe_essence), total_gold: Number(r.total_gold), total_pearls: Number(r.total_pearls), total_essence: Number(r.total_essence), total_points: Number(r.total_points) });
    const numHit = (r: AltarRaidHitRow): AltarRaidHitRow => ({ ...r, gen: Number(r.gen), dealt: Number(r.dealt), hits: Number(r.hits), updated_at: Number(r.updated_at) });
    const numOffer = (r: AltarOfferRow): AltarOfferRow => ({ ...r, anonymous: Number(r.anonymous), points: Number(r.points), gold: Number(r.gold), pearls: Number(r.pearls), essence: Number(r.essence), updated_at: Number(r.updated_at) });
    const num = <T extends Record<string, unknown>>(r: T) => ({ ...r, ...('updated_at' in r ? { updated_at: Number(r.updated_at) } : {}), ...('rating' in r ? { rating: Number(r.rating) } : {}), ...('power' in r ? { power: Number(r.power) } : {}), ...('revision' in r ? { revision: Number(r.revision) } : {}), ...('created_at' in r ? { created_at: Number(r.created_at) } : {}) });
    return {
        async getPlayer(id) { const { rows } = await q<PlayerRow>('SELECT state, revision FROM players WHERE id=$1', [id]); return rows[0] ? { ...num(rows[0]) as PlayerRow, state: unpackState(rows[0].state) } : null; },
        async createPlayerIfMissing(id, state, now) { await q('INSERT INTO players (id,state,revision,updated_at) VALUES ($1,$2,0,$3) ON CONFLICT (id) DO NOTHING', [id, packState(state), now]); },
        async updatePlayer(id, state, now, revision) { const r = await q('UPDATE players SET state=$1, revision=revision+1, updated_at=$2 WHERE id=$3 AND revision=$4', [packState(state), now, id, revision]); return r.rowCount === 1; },
        async upsertRanking(r) { await q('INSERT INTO rankings (id,snapshot,rating,power,updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET snapshot=EXCLUDED.snapshot, rating=EXCLUDED.rating, power=EXCLUDED.power, updated_at=EXCLUDED.updated_at', [r.id, r.snapshot, r.rating, r.power, r.updated_at]); },
        async deleteRanking(id) { await q('DELETE FROM rankings WHERE id=$1', [id]); },
        async listRankings(season, limit) { const { rows } = await q<RankingRow>("SELECT id,snapshot,rating,power,updated_at FROM rankings WHERE (snapshot::jsonb->>'season')::int=$1 ORDER BY rating DESC, power DESC LIMIT $2", [season, limit]); return rows.map(r => num(r) as RankingRow); },
        async getRanking(id, season) { const { rows } = await q<RankingRow>("SELECT id,snapshot,rating,power,updated_at FROM rankings WHERE id=$1 AND (snapshot::jsonb->>'season')::int=$2", [id, season]); return rows[0] ? num(rows[0]) as RankingRow : null; },
        async updateRating(id, rating) { await q('UPDATE rankings SET rating=$1 WHERE id=$2', [rating, id]); },
        async createAccount(a) { const r = await q('INSERT INTO accounts (id,username,pass_hash,salt,created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (username) DO NOTHING', [a.id, a.username, a.pass_hash, a.salt, a.created_at]); return r.rowCount === 1; },
        async getAccountByName(username) { const { rows } = await q<AccountRow>('SELECT id,username,pass_hash,salt,created_at FROM accounts WHERE username=$1', [username]); return rows[0] ? num(rows[0]) as AccountRow : null; },
        async listAccounts() { const { rows } = await q<{ id: string; username: string }>('SELECT id, username FROM accounts'); return rows; },
        async getCrew(id) { const { rows } = await q<CrewRow>('SELECT id,code,data,revision FROM crews WHERE id=$1', [id]); return rows[0] ? { ...rows[0], revision: Number(rows[0].revision) } : null; },
        async getCrewByCode(code) { const { rows } = await q<CrewRow>('SELECT id,code,data,revision FROM crews WHERE code=$1', [code]); return rows[0] ? { ...rows[0], revision: Number(rows[0].revision) } : null; },
        async listCrews() { const { rows } = await q<CrewRow>('SELECT id,code,data,revision FROM crews ORDER BY updated_at DESC LIMIT 500'); return rows.map(r => ({ ...r, revision: Number(r.revision) })); },
        async putCrew(id, code, data, revision, now) {
            if (revision < 0) { try { const r = await q('INSERT INTO crews (id,code,data,revision,updated_at) VALUES ($1,$2,$3,0,$4) ON CONFLICT DO NOTHING', [id, code, data, now]); return r.rowCount === 1; } catch { return false; } }
            try { const r = await q('UPDATE crews SET data=$1, code=$5, revision=revision+1, updated_at=$2 WHERE id=$3 AND revision=$4', [data, now, id, revision, code]); return r.rowCount === 1; } catch { return false; }
        },
        async deleteCrew(id) { await q('DELETE FROM crews WHERE id=$1', [id]); },
        async countActivePlayers(since, except) { const { rows } = await q<{ n: string }>('SELECT COUNT(*) AS n FROM players WHERE updated_at>=$1 AND id<>$2', [since, except]); return Number(rows[0]?.n || 0); },
        async listPlayers() { const { rows } = await q<{ id: string; state: string; revision: number; updated_at: number }>('SELECT id, state, revision, updated_at FROM players'); return rows.map(r => ({ id: r.id, state: unpackState(r.state), revision: Number(r.revision), updated_at: Number(r.updated_at) })); },
        async getSetting(key) { const { rows } = await q<{ value: string }>('SELECT value FROM settings WHERE key=$1', [key]); return rows[0]?.value ?? null; },
        async setSetting(key, value, now) { await q('INSERT INTO settings (key,value,updated_at) VALUES ($1,$2,$3) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=EXCLUDED.updated_at', [key, value, now]); },
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
        async getAltar() {
            const { rows } = await q<AltarRow>("SELECT * FROM altar WHERE id='main'");
            return rows[0] ? numAltar(rows[0]) : { ...ALTAR_EMPTY };
        },
        async addAltar(offerer, a, t) {
            await q("UPDATE altar SET total_gold=total_gold+$2, total_pearls=total_pearls+$3, total_essence=total_essence+$4, total_points=total_points+$5, tithe_gold=tithe_gold+CASE WHEN throne<>'' AND throne<>$1 THEN $6 ELSE 0 END, tithe_pearls=tithe_pearls+CASE WHEN throne<>'' AND throne<>$1 THEN $7 ELSE 0 END, tithe_essence=tithe_essence+CASE WHEN throne<>'' AND throne<>$1 THEN $8 ELSE 0 END WHERE id='main'", [offerer, a.gold, a.pearls, a.essence, a.points, t.gold, t.pearls, t.essence]);
        },
        async listAltarGauges() { const { rows } = await q<AltarGaugeRow>('SELECT id,points,until,level,high_until FROM altar_gauges'); return rows.map(r => ({ id: r.id, points: Number(r.points), until: Number(r.until), level: Number(r.level || 0), high_until: Number(r.high_until || 0) })); },
        async levelAltarBlessing(id, cost, expectLevel, now, ms, cap, max, highMs = 0, highFrom = 3) {
            // 살아 있는 단계(eff): 닫혔으면 0, 상위 단계 시간이 지났으면 highFrom으로 내려 봅니다.
            const eff = 'CASE WHEN until>$4 THEN (CASE WHEN high_until>$4 THEN level ELSE LEAST(level,$9) END) ELSE 0 END';
            const { rows } = await q<{ level: string; until: string }>(`UPDATE altar_gauges SET points=points-$2, level=LEAST(${eff}+1,$7), high_until=CASE WHEN $8>0 THEN $4+$8 ELSE high_until END, until=GREATEST(LEAST(GREATEST(until,$4)+$5,$4+$6), CASE WHEN $8>0 THEN $4+$8+$6 ELSE 0 END) WHERE id=$1 AND points>=$2 AND ${eff}=$3 RETURNING level, until`, [id, cost, expectLevel, now, ms, cap, max, highMs, highFrom]);
            return rows[0] ? { level: Number(rows[0].level), until: Number(rows[0].until) } : null;
        },
        async addAltarGauge(id, points) { await q('INSERT INTO altar_gauges (id,points,until) VALUES ($1,$2,0) ON CONFLICT (id) DO UPDATE SET points=altar_gauges.points+EXCLUDED.points', [id, points]); },
        async spendAltarGauge(id, cost) { const r = await q('UPDATE altar_gauges SET points=points-$2 WHERE id=$1 AND points>=$2', [id, cost]); return r.rowCount === 1; },
        async extendAltarGauge(id, now, ms, cap) { const { rows } = await q<{ until: string }>('UPDATE altar_gauges SET until=LEAST(GREATEST(until,$2)+$3,$2+$4) WHERE id=$1 RETURNING until', [id, now, ms, cap]); return Number(rows[0]?.until || 0); },
        async summonAltarGod(god, until, now) { const r = await q("UPDATE altar SET gen=gen+1, god_state='alive', god=$1, god_until=$2 WHERE id='main' AND (god_state<>'alive' OR god_until<$3)", [god, until, now]); return r.rowCount === 1; },
        async claimAltarThrone(gen, id, name, snapshot, now) { const r = await q("UPDATE altar SET god_state='slain', throne=$2, throne_name=$3, throne_snapshot=$4, throne_since=$5, tithe_gold=0, tithe_pearls=0, tithe_essence=0 WHERE id='main' AND gen=$1 AND god_state='alive' AND god_until>=$5", [gen, id, name, snapshot, now]); return r.rowCount === 1; },
        async resetAltarGauges() { await q('UPDATE altar_gauges SET points=0'); },
        async setAltarBlessing(id, level, until, highUntil) { await q('INSERT INTO altar_gauges (id,points,until,level,high_until) VALUES ($1,0,$3,$2,$4) ON CONFLICT (id) DO UPDATE SET level=EXCLUDED.level, until=EXCLUDED.until, high_until=EXCLUDED.high_until', [id, level, until, highUntil]); },
        async resetAltarGod() { await q("UPDATE altar_raids SET state='none', hp=0"); await q("UPDATE altar SET god_state='none', god='', god_until=0, throne='', throne_name='', throne_since=0, throne_snapshot='', tithe_gold=0, tithe_pearls=0, tithe_essence=0, raid_state='none', raid_hp=0 WHERE id='main'"); },
        async listAltarRaids() { const { rows } = await q<AltarRaidRow>('SELECT * FROM altar_raids'); return rows.map(r => ({ ...r, gen: Number(r.gen), hp: Number(r.hp), hp_max: Number(r.hp_max), until: Number(r.until), slain_at: Number(r.slain_at) })); },
        async summonAltarRaid(raidId, hpMax, until, now, respawnMs) {
            const { rows } = await q<{ gen: string }>("WITH g AS (UPDATE altar SET raid_gen=raid_gen+1 WHERE id='main' RETURNING raid_gen) INSERT INTO altar_raids (id,gen,state,hp,hp_max,until,slayer,slain_at) SELECT $1, g.raid_gen, 'alive', $2, $2, $3, '', 0 FROM g ON CONFLICT (id) DO UPDATE SET gen=EXCLUDED.gen, state='alive', hp=EXCLUDED.hp, hp_max=EXCLUDED.hp_max, until=EXCLUDED.until, slayer='', slain_at=0 WHERE NOT (altar_raids.state='alive' AND altar_raids.until>=$4) AND NOT (altar_raids.state='slain' AND altar_raids.slain_at>$4-$5) RETURNING gen", [raidId, hpMax, until, now, respawnMs]);
            return Number(rows[0]?.gen || 0);
        },
        async hitAltarRaid(raidId, gen, dealt) { const { rows } = await q<{ hp: string }>("UPDATE altar_raids SET hp=GREATEST(0, hp-$3) WHERE id=$1 AND gen=$2 AND state='alive' AND hp>0 RETURNING hp", [raidId, gen, Math.max(0, Math.floor(dealt))]); return rows[0] ? Number(rows[0].hp) : null; },
        async shiftAltarRaid(raidId, gen, delta) { const { rows } = await q<{ hp: string }>("UPDATE altar_raids SET hp=LEAST(hp_max, GREATEST(1, hp+$3)) WHERE id=$1 AND gen=$2 AND state='alive' AND hp>0 RETURNING hp", [raidId, gen, Math.trunc(delta)]); return rows[0] ? Number(rows[0].hp) : null; },
        async slayAltarRaid(raidId, gen, id, name, now) { void name; const r = await q("UPDATE altar_raids SET state='slain', slayer=$3, slain_at=$4 WHERE id=$1 AND gen=$2 AND state='alive' AND hp<=0", [raidId, gen, id, now]); return r.rowCount === 1; },
        async expireAltarRaid(raidId, now) { const r = await q("UPDATE altar_raids SET state='gone' WHERE id=$1 AND state='alive' AND until<$2", [raidId, now]); return r.rowCount === 1; },
        async bumpRaidHit(gen, playerId, name, dealt, now) { await q('INSERT INTO altar_raid_hits (id,gen,player_id,name,dealt,hits,updated_at) VALUES ($1,$2,$3,$4,$5,1,$6) ON CONFLICT (id) DO UPDATE SET dealt=altar_raid_hits.dealt+EXCLUDED.dealt, hits=altar_raid_hits.hits+1, name=EXCLUDED.name, updated_at=EXCLUDED.updated_at', [`${gen}:${playerId}`, gen, playerId, name, Math.max(0, Math.floor(dealt)), now]); },
        async listRaidHits(gen, limit) { const { rows } = await q<AltarRaidHitRow>('SELECT * FROM altar_raid_hits WHERE gen=$1 ORDER BY dealt DESC, updated_at ASC LIMIT $2', [gen, limit]); return rows.map(numHit); },
        async getRaidHit(gen, playerId) { const { rows } = await q<AltarRaidHitRow>('SELECT * FROM altar_raid_hits WHERE id=$1', [`${gen}:${playerId}`]); return rows[0] ? numHit(rows[0]) : null; },
        async countRaidHits(gen) { const { rows } = await q<{ n: string }>('SELECT COUNT(*) AS n FROM altar_raid_hits WHERE gen=$1', [gen]); return Number(rows[0]?.n || 0); },
        async countRaidAbove(gen, dealt) { const { rows } = await q<{ n: string }>('SELECT COUNT(*) AS n FROM altar_raid_hits WHERE gen=$1 AND dealt>$2', [gen, dealt]); return Number(rows[0]?.n || 0); },
        async vacateAltarThrone(id) { const r = await q("UPDATE altar SET throne='', throne_name='', throne_since=0, throne_snapshot='', tithe_gold=0, tithe_pearls=0, tithe_essence=0 WHERE id='main' AND throne=$1", [id]); return r.rowCount === 1; },
        async expireAltarThrone(before) { const r = await q("UPDATE altar SET throne='', throne_name='', throne_since=0, throne_snapshot='', tithe_gold=0, tithe_pearls=0, tithe_essence=0 WHERE id='main' AND throne<>'' AND throne_since<$1", [before]); return r.rowCount === 1; },
        async takeAltarTithe(id) {
            const { rows } = await q<{ g: string; p: string; e: string }>("UPDATE altar a SET tithe_gold=0, tithe_pearls=0, tithe_essence=0 FROM (SELECT tithe_gold g, tithe_pearls p, tithe_essence e FROM altar WHERE id='main' FOR UPDATE) o WHERE a.id='main' AND a.throne=$1 RETURNING o.g, o.p, o.e", [id]);
            return rows[0] ? { gold: Number(rows[0].g), pearls: Number(rows[0].p), essence: Number(rows[0].e) } : null;
        },
        async bumpAltarOffer(r, a) {
            await q('INSERT INTO altar_offers (id,week,player_id,account_id,name,anonymous,points,gold,pearls,essence,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, anonymous=EXCLUDED.anonymous, points=altar_offers.points+EXCLUDED.points, gold=altar_offers.gold+EXCLUDED.gold, pearls=altar_offers.pearls+EXCLUDED.pearls, essence=altar_offers.essence+EXCLUDED.essence, updated_at=EXCLUDED.updated_at', [`${r.week}:${r.player_id}`, r.week, r.player_id, r.account_id, r.name, r.anonymous, a.points, a.gold, a.pearls, a.essence, r.updated_at]);
        },
        async listAltarOffers(week, limit) { const { rows } = await q<AltarOfferRow>('SELECT * FROM altar_offers WHERE week=$1 ORDER BY points DESC, updated_at ASC LIMIT $2', [week, limit]); return rows.map(numOffer); },
        async getAltarOffer(week, playerId) { const { rows } = await q<AltarOfferRow>('SELECT * FROM altar_offers WHERE id=$1', [`${week}:${playerId}`]); return rows[0] ? numOffer(rows[0]) : null; },
        async listAltarOffersAllTime(limit) {
            const { rows } = await q<AltarTotalRow>('SELECT player_id, SUM(points) AS points, (ARRAY_AGG(name ORDER BY updated_at DESC))[1] AS name, (ARRAY_AGG(anonymous ORDER BY updated_at DESC))[1] AS anonymous FROM altar_offers GROUP BY player_id ORDER BY SUM(points) DESC, MIN(updated_at) ASC LIMIT $1', [limit]);
            return rows.map(r => ({ player_id: r.player_id, name: r.name, anonymous: Number(r.anonymous), points: Number(r.points) }));
        },
        async sumAltarOffers(playerId) {
            const { rows } = await q<{ points: string; above: string }>('WITH t AS (SELECT player_id, SUM(points) AS points FROM altar_offers GROUP BY player_id) SELECT COALESCE((SELECT points FROM t WHERE player_id=$1),0) AS points, (SELECT COUNT(*) FROM t WHERE points > COALESCE((SELECT points FROM t WHERE player_id=$1),0)) AS above', [playerId]);
            return { points: Number(rows[0]?.points || 0), above: Number(rows[0]?.above || 0) };
        },
        async countAltarAbove(week, points) { const { rows } = await q<{ n: string }>('SELECT COUNT(*) AS n FROM altar_offers WHERE week=$1 AND points>$2', [week, points]); return Number(rows[0]?.n || 0); },
        async setWallet(w) { await q('INSERT INTO wallets (account_id,pearls,essence,week,pearl_out) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (account_id) DO UPDATE SET pearls=EXCLUDED.pearls, essence=EXCLUDED.essence, week=EXCLUDED.week, pearl_out=EXCLUDED.pearl_out', [w.account_id, w.pearls, w.essence, w.week, w.pearl_out]); },
    };
}

// ---------- 개발용 로컬 파일 ----------
/** v3.19 파일 DB 누적 기여: 모험가별 합계, 이름·익명은 가장 최근 주의 기록. */
function altarTotals(db: FileDb): AltarTotalRow[] {
    const out = new Map<string, AltarTotalRow & { at: number; first: number }>();
    for (const o of Object.values(db.altarOffers || {})) {
        const r = out.get(o.player_id) || { player_id: o.player_id, name: o.name, anonymous: o.anonymous, points: 0, at: 0, first: o.updated_at };
        r.points += o.points; r.first = Math.min(r.first, o.updated_at);
        if (o.updated_at >= r.at) { r.at = o.updated_at; r.name = o.name; r.anonymous = o.anonymous; }
        out.set(o.player_id, r);
    }
    return [...out.values()].sort((a, b) => b.points - a.points || a.first - b.first).map(({ player_id, name, anonymous, points }) => ({ player_id, name, anonymous, points }));
}
/** v3.22 파일 DB 보스별 월드보스. 예전 한 마리 칸(altar.raid_*)의 보스는 처음 한 번 옮깁니다. */
function fileRaids(db: FileDb) {
    const raids = db.altarRaids ??= {}, a = db.altar;
    if (a && a.raid_id && a.raid_gen > 0 && (a.raid_state === 'alive' || a.raid_state === 'slain') && !raids[a.raid_id]) raids[a.raid_id] = { id: a.raid_id, gen: a.raid_gen, state: a.raid_state, hp: a.raid_hp, hp_max: a.raid_hp_max, until: a.raid_until, slayer: a.raid_slayer, slain_at: a.raid_slain_at };
    return raids;
}
type FileDb = { crews?: Record<string, CrewRow & { updated_at: number }>; altarRaids?: Record<string, AltarRaidRow>; settings?: Record<string, { value: string; updated_at: number }>; players: Record<string, PlayerRow & { updated_at: number }>; rankings: Record<string, RankingRow>; accounts: Record<string, AccountRow>; sessions: Record<string, { account_id: string; expires_at: number }>; slots?: Record<string, SlotRow>; guilds?: Record<string, GuildRow>; guildMembers?: Record<string, GuildMemberRow>; wallets?: Record<string, WalletRow>; altar?: AltarRow; altarGauges?: Record<string, AltarGaugeRow>; altarOffers?: Record<string, AltarOfferRow>; altarRaidHits?: Record<string, AltarRaidHitRow>; chat?: ChatRow[]; chatSeq?: number };
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
        deleteRanking: id => tx(db => { delete db.rankings[id]; }),
        listRankings: (s, limit) => tx(db => Object.values(db.rankings).filter(r => season(r) === s).sort((a, b) => b.rating - a.rating || b.power - a.power).slice(0, limit)),
        getRanking: (id, s) => tx(db => db.rankings[id] && season(db.rankings[id]) === s ? db.rankings[id] : null),
        updateRating: (id, rating) => tx(db => { if (db.rankings[id]) db.rankings[id].rating = rating; }),
        createAccount: a => tx(db => { if (Object.values(db.accounts).some(x => x.username === a.username)) return false; db.accounts[a.id] = a; return true; }),
        getAccountByName: username => tx(db => Object.values(db.accounts).find(x => x.username === username) || null),
        listAccounts: () => tx(db => Object.values(db.accounts).map(a => ({ id: a.id, username: a.username }))),
        getCrew: id => tx(db => db.crews?.[id] ? { ...db.crews[id] } : null),
        getCrewByCode: code => tx(db => Object.values(db.crews || {}).find(c => c.code === code) || null),
        listCrews: () => tx(db => Object.values(db.crews || {})),
        putCrew: (id, code, data, revision, now) => tx(db => {
            const crews = db.crews ??= {}, cur = crews[id];
            if (revision < 0) { if (cur || Object.values(crews).some(c => c.code === code)) return false; crews[id] = { id, code, data, revision: 0, updated_at: now }; return true; }
            if (!cur || cur.revision !== revision || Object.values(crews).some(c => c.id !== id && c.code === code)) return false;
            crews[id] = { ...cur, code, data, revision: revision + 1, updated_at: now }; return true;
        }),
        deleteCrew: id => tx(db => { delete db.crews?.[id]; }),
        countActivePlayers: (since, except) => tx(db => Object.entries(db.players).filter(([id, p]) => id !== except && p.updated_at >= since).length),
        listPlayers: () => tx(db => Object.entries(db.players).map(([id, p]) => ({ id, state: unpackState(p.state), revision: p.revision, updated_at: p.updated_at }))),
        getSetting: key => tx(db => db.settings?.[key]?.value ?? null),
        setSetting: (key, value, now) => tx(db => { (db.settings ??= {})[key] = { value, updated_at: now }; }),
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
        getAltar: () => tx(db => ({ ...ALTAR_EMPTY, ...db.altar })),
        addAltar: (offerer, a, t) => tx(db => {
            const r = db.altar = { ...ALTAR_EMPTY, ...db.altar }, owed = r.throne !== '' && r.throne !== offerer;
            r.total_gold += a.gold; r.total_pearls += a.pearls; r.total_essence += a.essence; r.total_points += a.points;
            if (owed) { r.tithe_gold += t.gold; r.tithe_pearls += t.pearls; r.tithe_essence += t.essence; }
        }),
        listAltarGauges: () => tx(db => Object.values(db.altarGauges || {}).map(g => ({ ...g }))),
        addAltarGauge: (id, points) => tx(db => { const g = (db.altarGauges ??= {})[id] ??= { id, points: 0, until: 0 }; g.points += points; }),
        spendAltarGauge: (id, cost) => tx(db => { const g = db.altarGauges?.[id]; if (!g || g.points < cost) return false; g.points -= cost; return true; }),
        extendAltarGauge: (id, now, ms, cap) => tx(db => { const g = db.altarGauges?.[id]; if (!g) return 0; g.until = Math.min(Math.max(g.until, now) + ms, now + cap); return g.until; }),
        levelAltarBlessing: (id, cost, expectLevel, now, ms, cap, max, highMs = 0, highFrom = 3) => tx(db => {
            const g = db.altarGauges?.[id]; if (!g || g.points < cost) return null;
            const eff = g.until > now ? ((g.high_until || 0) > now ? g.level || 0 : Math.min(g.level || 0, highFrom)) : 0; if (eff !== expectLevel) return null;
            g.points -= cost; g.level = Math.min(eff + 1, max);
            if (highMs > 0) g.high_until = now + highMs;
            // 상위 단계: 그 단계 시간 뒤 3단계가 cap(12시간) 동안 이어지도록 전체 시간을 보장합니다.
            g.until = Math.max(Math.min(Math.max(g.until, now) + ms, now + cap), highMs > 0 ? now + highMs + cap : 0);
            return { level: g.level, until: g.until };
        }),
        summonAltarGod: (god, until, now) => tx(db => { const r = db.altar = { ...ALTAR_EMPTY, ...db.altar }; if (r.god_state === 'alive' && r.god_until >= now) return false; Object.assign(r, { gen: r.gen + 1, god_state: 'alive', god, god_until: until }); return true; }),
        claimAltarThrone: (gen, id, name, snapshot, now) => tx(db => {
            const r = db.altar = { ...ALTAR_EMPTY, ...db.altar };
            if (r.gen !== gen || r.god_state !== 'alive' || r.god_until < now) return false;
            Object.assign(r, { god_state: 'slain', throne: id, throne_name: name, throne_snapshot: snapshot, throne_since: now, tithe_gold: 0, tithe_pearls: 0, tithe_essence: 0 }); return true;
        }),
        resetAltarGauges: () => tx(db => { for (const g of Object.values(db.altarGauges || {})) g.points = 0; }),
        setAltarBlessing: (id, level, until, highUntil) => tx(db => { const g = (db.altarGauges ??= {})[id] ??= { id, points: 0, until: 0 }; g.level = level; g.until = until; g.high_until = highUntil; }),
        resetAltarGod: () => tx(db => { for (const r of Object.values(fileRaids(db))) { r.state = 'none'; r.hp = 0; } db.altar = { ...ALTAR_EMPTY, ...db.altar, god_state: 'none', god: '', god_until: 0, throne: '', throne_name: '', throne_since: 0, throne_snapshot: '', tithe_gold: 0, tithe_pearls: 0, tithe_essence: 0, raid_state: 'none', raid_hp: 0 }; }),
        listAltarRaids: () => tx(db => Object.values(fileRaids(db)).map(r => ({ ...r }))),
        summonAltarRaid: (raidId, hpMax, until, now, respawnMs) => tx(db => { const raids = fileRaids(db), r = raids[raidId]; if (r && ((r.state === 'alive' && r.until >= now) || (r.state === 'slain' && r.slain_at > now - respawnMs))) return 0; const a = db.altar = { ...ALTAR_EMPTY, ...db.altar }; a.raid_gen += 1; raids[raidId] = { id: raidId, gen: a.raid_gen, state: 'alive', hp: hpMax, hp_max: hpMax, until, slayer: '', slain_at: 0 }; return a.raid_gen; }),
        hitAltarRaid: (raidId, gen, dealt) => tx(db => { const r = fileRaids(db)[raidId]; if (!r || r.gen !== gen || r.state !== 'alive' || r.hp <= 0) return null; r.hp = Math.max(0, r.hp - Math.max(0, Math.floor(dealt))); return r.hp; }),
        shiftAltarRaid: (raidId, gen, delta) => tx(db => { const r = fileRaids(db)[raidId]; if (!r || r.gen !== gen || r.state !== 'alive' || r.hp <= 0) return null; r.hp = Math.min(r.hp_max, Math.max(1, r.hp + Math.trunc(delta))); return r.hp; }),
        slayAltarRaid: (raidId, gen, id, name, now) => tx(db => { void name; const r = fileRaids(db)[raidId]; if (!r || r.gen !== gen || r.state !== 'alive' || r.hp > 0) return false; Object.assign(r, { state: 'slain', slayer: id, slain_at: now }); return true; }),
        expireAltarRaid: (raidId, now) => tx(db => { const r = fileRaids(db)[raidId]; if (!r || r.state !== 'alive' || r.until >= now) return false; r.state = 'gone'; return true; }),
        bumpRaidHit: (gen, playerId, name, dealt, now) => tx(db => { const key = `${gen}:${playerId}`, old = (db.altarRaidHits ??= {})[key]; db.altarRaidHits[key] = { id: key, gen, player_id: playerId, name, dealt: (old?.dealt || 0) + Math.max(0, Math.floor(dealt)), hits: (old?.hits || 0) + 1, updated_at: now }; }),
        listRaidHits: (gen, limit) => tx(db => Object.values(db.altarRaidHits || {}).filter(h => h.gen === gen).sort((a, b) => b.dealt - a.dealt || a.updated_at - b.updated_at).slice(0, limit).map(h => ({ ...h }))),
        getRaidHit: (gen, playerId) => tx(db => db.altarRaidHits?.[`${gen}:${playerId}`] ? { ...db.altarRaidHits[`${gen}:${playerId}`] } : null),
        countRaidHits: gen => tx(db => Object.values(db.altarRaidHits || {}).filter(h => h.gen === gen).length),
        countRaidAbove: (gen, dealt) => tx(db => Object.values(db.altarRaidHits || {}).filter(h => h.gen === gen && h.dealt > dealt).length),
        vacateAltarThrone: id => tx(db => { const r = db.altar; if (!r || !r.throne || r.throne !== id) return false; Object.assign(r, { throne: '', throne_name: '', throne_since: 0, throne_snapshot: '', tithe_gold: 0, tithe_pearls: 0, tithe_essence: 0 }); return true; }),
        expireAltarThrone: before => tx(db => { const r = db.altar; if (!r || !r.throne || r.throne_since >= before) return false; Object.assign(r, { throne: '', throne_name: '', throne_since: 0, throne_snapshot: '', tithe_gold: 0, tithe_pearls: 0, tithe_essence: 0 }); return true; }),
        takeAltarTithe: id => tx(db => { const r = db.altar; if (!r || r.throne !== id) return null; const out = { gold: r.tithe_gold, pearls: r.tithe_pearls, essence: r.tithe_essence }; r.tithe_gold = r.tithe_pearls = r.tithe_essence = 0; return out; }),
        bumpAltarOffer: (r, a) => tx(db => {
            const key = `${r.week}:${r.player_id}`, old = (db.altarOffers ??= {})[key];
            db.altarOffers[key] = { ...r, id: key, points: (old?.points || 0) + a.points, gold: (old?.gold || 0) + a.gold, pearls: (old?.pearls || 0) + a.pearls, essence: (old?.essence || 0) + a.essence };
        }),
        listAltarOffersAllTime: limit => tx(db => altarTotals(db).slice(0, limit)),
        sumAltarOffers: playerId => tx(db => { const all = altarTotals(db), mine = all.find(r => r.player_id === playerId)?.points || 0; return { points: mine, above: all.filter(r => r.points > mine).length }; }),
        listAltarOffers: (week, limit) => tx(db => Object.values(db.altarOffers || {}).filter(o => o.week === week).sort((a, b) => b.points - a.points || a.updated_at - b.updated_at).slice(0, limit).map(o => ({ ...o }))),
        getAltarOffer: (week, playerId) => tx(db => db.altarOffers?.[`${week}:${playerId}`] ? { ...db.altarOffers[`${week}:${playerId}`] } : null),
        countAltarAbove: (week, points) => tx(db => Object.values(db.altarOffers || {}).filter(o => o.week === week && o.points > points).length),
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
