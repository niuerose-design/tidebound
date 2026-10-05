/**
 * v27.26 운영자 도구(서버 전용). /admin 페이지와 /api/admin 이 씁니다.
 * 운영자 키는 Vercel 환경 변수 TIDEBOUND_ADMIN_KEY 에 둡니다. 키가 없으면 도구 전체가 꺼집니다.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { ApiError } from './store';
import { allow, clientIp } from './throttle';
import { migrateState } from '../systems/migrations';
import { restartLife } from '../systems/actions/lifecycle';
import { jobById } from '../data/classes';
import { RANKS, RANK_PERKS, rankIndex, rankState, rankPerkLevel, rankPointsFree } from '../data/rank';
import { BOSS_RESEARCH } from '../data/specializations';
import { DUNGEONS, STAGES } from '../data/world';
import { PROGRESSION } from '../data/progression';
import { skillById } from '../data/skills';
import type { State } from '../types';
import { ALTAR } from '../data/altar';
import { offlineCapSeconds } from '../data/economy';
import { SERVER_EVENTS, activeEvent, eventLabel, type ServerEvent } from '../data/events';
import { readEventConfig, writeEventConfig, readClosures, writeClosures, readOpenDoors, writeOpenDoors } from './events-config';
import { DISCOVERY_DOORS, DOORS, DOOR_JOBS, REBIRTH_DOOR_JOBS } from '../data/doors';
import { invalidateAltar } from './altar';

const digest = (v: string) => createHash('sha256').update(v).digest();
/** 운영자 키 확인. 실패는 IP당 10분에 10번까지만 받습니다. */
export function requireAdmin(req: Request) {
    const key = process.env.TIDEBOUND_ADMIN_KEY;
    if (!key || key.length < 12) throw new ApiError('운영자 키(TIDEBOUND_ADMIN_KEY)가 설정되지 않아 운영 도구가 꺼져 있습니다.', 503);
    const ip = clientIp(req), given = req.headers.get('x-admin-key') || '';
    if (!allow(`admin-try:${ip}`, 30, 10 * 60_000)) throw new ApiError('요청이 너무 잦습니다. 잠시 뒤 다시 시도하세요.', 429);
    if (!timingSafeEqual(digest(given), digest(key))) {
        if (!allow(`admin-fail:${ip}`, 10, 10 * 60_000)) throw new ApiError('운영자 키가 여러 번 틀려 잠시 막았습니다.', 429);
        throw new ApiError('운영자 키가 맞지 않습니다.', 401);
    }
}

/** v27.28 SP 확인용: 보유 SP, 보스 첫 정복 연구 상태, 스킬에 쓴 SP, 남아 있는 SP 기록. */
export type AdminSp = { have: number; research: { name: string; sp: number; claimed: boolean }[]; spentSkills: { name: string; sp: number }[]; limitBreaks: { name: string; sp: number }[]; logs: string[] };
/** v27.63 lastRebirthAt: 마지막 환생 시각, lifeMs: 이번 생 경과(실제 시간, partial이면 업데이트 이후), paceMs: 최근 환생 평균 실제 시간(일부 기록 제외). */
export type AdminPlayer = { id: string; username: string; slot: number; name: string; level: number; job: string; rebirths: number; pearls: number; gold: number; sp: AdminSp; inDungeon: boolean; revision: number; updatedAt: number; lastRebirthAt: number | null; lifeMs: number | null; lifePartial: boolean; paceMs: number | null };
const spView = (s: State): AdminSp => ({
    have: s.sp || 0,
    research: DUNGEONS.filter(d => BOSS_RESEARCH[d.id] && (s.clears?.[d.id] || 0) > 0).map(d => ({ name: d.name, sp: BOSS_RESEARCH[d.id].sp, claimed: !!s.bossResearchClaims?.[d.id] })),
    spentSkills: Object.entries(s.skillSpent || {}).filter(([, n]) => n > 0).map(([id, n]) => ({ name: skillById(id)?.name || id, sp: n })),
    limitBreaks: Object.entries(s.limitBreaks || {}).filter(([, n]) => n > 0).map(([id, n]) => ({ name: `${skillById(id)?.name || id} ${n}단계`, sp: PROGRESSION.limitBreak.sp.slice(0, n).reduce((a, b) => a + b, 0) })),
    logs: (s.logs || []).filter(l => /SP [+-]|SP 계승/.test(l.text)).slice(-10).map(l => l.text),
});
const lifeView = (s: State, at: number) => {
    const log = s.rebirthLog || [], full = log.filter(r => !r.partial);
    return { lastRebirthAt: log.at(-1)?.at ?? null, lifeMs: s.lifeStart ? Math.max(0, (s.lastTick || at) - s.lifeStart.at) : null, lifePartial: !!s.lifeStart?.partial, paceMs: full.length ? Math.round(full.reduce((a, r) => a + r.realMs, 0) / full.length) : null };
};
const view = (id: string, username: string, revision: number, updatedAt: number, s: State): AdminPlayer => {
    const [, slot] = id.split('#');
    return { id, username, slot: Number(slot || 1), name: s.name, level: s.level, job: jobById(s.job)?.name || s.job, rebirths: s.rebirths || 0, pearls: s.pearls || 0, gold: Math.floor(s.gold || 0), sp: spView(s), inDungeon: !!s.dungeon, revision, updatedAt, ...lifeView(s, updatedAt) };
};

/** 모험가 이름(부분 일치) 또는 로그인 아이디(정확히)로 찾습니다. 최대 30명. */
export async function searchPlayers(query: string) {
    const q = query.trim();
    if (q.length < 1 || q.length > 40) throw new ApiError('검색어는 1~40자입니다.');
    const database = db();
    const accounts = new Map((await database.listAccounts()).map(a => [a.id, a.username]));
    const lower = q.toLowerCase(), out: AdminPlayer[] = [];
    for (const row of await database.listPlayers()) {
        let s: State; try { s = JSON.parse(row.state); } catch { continue; }
        const username = accounts.get(row.id.split('#')[0]) || '';
        if (username === lower || (typeof s.name === 'string' && s.name.toLowerCase().includes(lower))) out.push(view(row.id, username, row.revision, row.updated_at, s));
    }
    return out.sort((a, b) => Number(b.name === q) - Number(a.name === q) || b.updatedAt - a.updatedAt).slice(0, 30);
}

async function load(id: string) {
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,80}(#[1-3])?$/.test(id)) throw new ApiError('대상이 올바르지 않습니다.');
    const row = await db().getPlayer(id);
    if (!row) throw new ApiError('세이브를 찾지 못했습니다.', 404);
    return row;
}
const usernameOf = async (id: string) => (await db().listAccounts()).find(a => a.id === id.split('#')[0])?.username || '';

/** 이번 생 초기화 미리 보기: 저장하지 않고 전/후만 돌려줍니다. */
export async function previewRestart(id: string) {
    const row = await load(id), now = Date.now(), username = await usernameOf(id);
    const s = migrateState(JSON.parse(row.state) as State, now), before = view(id, username, row.revision, now, s);
    restartLife(s, now);
    return { before, after: view(id, username, row.revision, now, s) };
}

/** 이번 생 초기화 적용. 미리 보기 때의 revision과 다르면(그사이 게임이 저장) 덮어쓰지 않습니다. */
export async function applyRestart(id: string, revision: number) {
    const row = await load(id), now = Date.now(), username = await usernameOf(id);
    if (!Number.isInteger(revision) || row.revision !== revision) throw new ApiError('미리 본 뒤에 게임이 저장되었습니다. 미리 보기를 다시 눌러 주세요.', 409);
    const s = migrateState(JSON.parse(row.state) as State, now), before = view(id, username, row.revision, now, s);
    restartLife(s, now);
    if (!await db().updatePlayer(id, JSON.stringify(s), now, revision)) throw new ApiError('그사이 게임이 저장되었습니다. 미리 보기를 다시 눌러 주세요.', 409);
    console.info('admin restartLife', { id, username, from: before.level });
    return { before, after: view(id, username, revision + 1, now, s) };
}

// ---------- v27.27 골드·세계석 조정 ----------
const ADMIN_LIMITS = { gold: 1e15, pearls: 1e7 };
const amount = (v: unknown, max: number, label: string) => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > max) throw new ApiError(`${label} 값은 0 이상 ${max.toLocaleString()} 이하의 정수로 입력하세요.`);
    return n;
};
/** 골드·세계석을 입력한 값으로 맞춥니다. 그사이 게임이 저장되면 최신 세이브에 다시 적용합니다(최대 3번). */
export async function adjustCurrency(id: string, input: { gold?: unknown; pearls?: unknown }) {
    const gold = amount(input.gold, ADMIN_LIMITS.gold, '골드'), pearls = amount(input.pearls, ADMIN_LIMITS.pearls, '세계석');
    if (gold === undefined && pearls === undefined) throw new ApiError('바꿀 골드나 세계석 값을 입력하세요.');
    const username = await usernameOf(id);
    for (let attempt = 0; attempt < 3; attempt++) {
        const row = await load(id), now = Date.now();
        const s = migrateState(JSON.parse(row.state) as State, now), before = view(id, username, row.revision, now, s);
        if (gold !== undefined) s.gold = gold;
        if (pearls !== undefined) s.pearls = pearls;
        if (await db().updatePlayer(id, JSON.stringify(s), now, row.revision)) {
            console.info('admin adjustCurrency', { id, username, gold: [before.gold, s.gold], pearls: [before.pearls, s.pearls] });
            return { before, after: view(id, username, row.revision + 1, now, s) };
        }
    }
    throw new ApiError('게임이 계속 저장되고 있어 적용하지 못했습니다. 잠시 뒤 다시 시도하세요.', 409);
}

// ---------- v27.27 서버 이벤트 설정 ----------

const MULTS = ['exp', 'gold', 'drop', 'mastery', 'mimic', 'nuri'] as const;
/** 이벤트 목록: 코드 이벤트(끔 여부)와 운영 페이지 이벤트, 지금 배너 문구. */
export async function listEvents(now = Date.now()) {
    const config = await readEventConfig();
    const live = (e: ServerEvent) => Date.parse(e.from) <= now && now <= Date.parse(e.until);
    const all = [...SERVER_EVENTS.filter(e => !config.disabled.includes(e.id)), ...config.extra];
    const active = activeEvent(now, all);
    return {
        code: SERVER_EVENTS.map(e => ({ ...e, disabled: config.disabled.includes(e.id), live: live(e) })),
        extra: config.extra.map(e => ({ ...e, live: live(e) })),
        banner: active ? eventLabel(active) : '', at: now,
    };
}
/** 운영 페이지 이벤트 추가·수정. 배율은 1~10, 이름 40자, 시작 < 종료, 기간 최대 60일. */
export async function saveEvent(input: Record<string, unknown>) {
    const name = String(input.name ?? '').trim().slice(0, 40);
    const from = String(input.from ?? ''), until = String(input.until ?? '');
    const a = Date.parse(from), b = Date.parse(until);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) throw new ApiError('시작·종료 시각을 확인하세요(시작이 종료보다 앞이어야 합니다).');
    if (b - a > 60 * 86400_000) throw new ApiError('이벤트 기간은 최대 60일입니다.');
    const event: ServerEvent = { id: typeof input.id === 'string' && /^admin-[a-z0-9]{6,20}$/.test(input.id) ? input.id : `admin-${Date.now().toString(36)}`, name, from: new Date(a).toISOString(), until: new Date(b).toISOString() };
    for (const k of MULTS) {
        const v = Number(input[k] ?? 1);
        if (!Number.isFinite(v) || v < 1 || v > 10) throw new ApiError('배율은 1~10 사이로 입력하세요.');
        if (v !== 1) event[k] = Math.round(v * 100) / 100;
    }
    if (!event.name && MULTS.every(k => event[k] === undefined)) throw new ApiError('이름이나 배율 중 하나는 있어야 합니다.');
    const config = await readEventConfig();
    const extra = [...config.extra.filter(e => e.id !== event.id), event].slice(-20);
    await writeEventConfig({ ...config, extra });
    console.info('admin event saved', { id: event.id, from: event.from, until: event.until });
    return listEvents();
}
export async function deleteEvent(id: string) {
    const config = await readEventConfig();
    await writeEventConfig({ ...config, extra: config.extra.filter(e => e.id !== id) });
    return listEvents();
}
/** 코드에 들어 있는 이벤트를 끄거나 다시 켭니다. */
export async function toggleCodeEvent(id: string, disabled: boolean) {
    if (!SERVER_EVENTS.some(e => e.id === id)) throw new ApiError('없는 이벤트입니다.');
    const config = await readEventConfig();
    const set = new Set(config.disabled); if (disabled) set.add(id); else set.delete(id);
    await writeEventConfig({ ...config, disabled: [...set] });
    return listEvents();
}

// ---------- v27.31 사냥터·던전 입장 막기 ----------

/** 사냥터·던전 목록과 닫힘 여부. 첫 사냥터는 닫을 수 없습니다. */
export async function listClosures() {
    const c = await readClosures();
    return {
        stages: STAGES.map((st, i) => ({ id: st.id, name: st.name, closed: c.stages.includes(st.id), locked: i === 0 })),
        dungeons: DUNGEONS.map(d => ({ id: d.id, name: d.name, closed: c.dungeons.includes(d.id), locked: false })),
    };
}
/** 한 곳을 닫거나 엽니다. 안에 있던 모험가는 다음 동기화 때 보상 없이 나옵니다. */
export async function setClosed(kind: string, id: string, closed: boolean) {
    if (kind !== 'stages' && kind !== 'dungeons') throw new ApiError('사냥터나 던전을 고르세요.');
    if (kind === 'stages' ? !STAGES.some(st => st.id === id) : !DUNGEONS.some(d => d.id === id)) throw new ApiError('없는 곳입니다.');
    if (kind === 'stages' && id === STAGES[0].id) throw new ApiError('첫 사냥터는 닫을 수 없습니다(닫힌 곳에서 나온 모험가가 돌아갈 곳).');
    const c = await readClosures(), set = new Set(c[kind]);
    if (closed) set.add(id); else set.delete(id);
    await writeClosures({ ...c, [kind]: [...set] });
    console.info('admin closure', { kind, id, closed });
    return listClosures();
}

// ---------- v27.73 문 개방 ----------

/** ??? 문이 있는 직업 목록과 운영자가 연 문. 윤회의 문 직업 → 발견의 문 직업 순서. */
export async function listDoors() {
    const open = await readOpenDoors();
    return {
        doors: DOOR_JOBS.map(id => {
            const door = REBIRTH_DOOR_JOBS.includes(id) ? DOORS[0] : DOORS[1], hint = DISCOVERY_DOORS.find(d => d.job === id)?.hint || '환생할 때 추첨으로 열립니다.';
            return { id, name: jobById(id)?.name || id, door: door.name, hint, open: open.includes(id) };
        }),
    };
}
/** 한 문을 열거나 닫습니다. 연 동안은 조건과 상관없이 모든 모험가에게 열리고, 닫으면 다시 조건대로입니다(그 사이 들어간 직업은 남음). */
export async function setDoorOpen(id: string, open: boolean) {
    if (!DOOR_JOBS.includes(id)) throw new ApiError('문이 있는 직업이 아닙니다.');
    const set = new Set(await readOpenDoors());
    if (open) set.add(id); else set.delete(id);
    await writeOpenDoors([...set]);
    console.info('admin door', { id, open });
    return listDoors();
}

// ---------- v27.32 통계 ----------

export type AdminStats = {
    at: number; accounts: number; saves: number;
    active: { hour: number; day: number; week: number }; running: number; inDungeon: number;
    level: { avg: number; max: number; buckets: { label: string; count: number }[] };
    rebirths: { avg: number; max: number; buckets: { label: string; count: number }[] };
    stages: { name: string; count: number }[]; dungeons: { name: string; count: number }[]; jobs: { name: string; count: number }[];
    totals: { kills: number; playHours: number; gold: number; pearls: number; sp: number };
    medians: { gold: number; pearls: number }; abyssBest: number; limitBreakers: number; inGuild: number;
    /** v27.43 제단: 신 세대, 신이 깨어 있는지, 신의 자리 주인, 누적 기여도, 쌓인 몫(골드). */
    altar: { gen: number; godAlive: boolean; throne: string; points: number; titheGold: number };
    top: { name: string; level: number; rebirths: number; abyss: number }[];
    /** v3.14 계급장: 계급별 인원(계급 순서), 최고 계급, 진급 특전별 찍은 인원·평균 단계, 안 쓴 진급 포인트 합계. */
    ranks: { dist: { name: string; count: number }[]; top: string; perks: { name: string; count: number; avg: number; max: number }[]; freePoints: number };
    /**
     * v27.54 밸런스 점검 지표.
     * godDepth: 첫 신과 같은 무릉도장 층, reached: 그 층 이상을 깬 모험가 수(모험가·몬스터 전투력은 잣대가 달라 비교하지 않습니다).
     * god: 신 도전 합계(시도·승리·도전한 모험가·가장 많이 깎은 체력 비율). offline: 최근 부재중 정산 중 상한(6시간 + 긴 휴식)에 닿은 수.
     * abyss: 무릉도장 최고 층 분포. burn: 화상 기술을 장착한 모험가 수.
     */
    balance: { godDepth: number; reached: number; god: { tries: number; wins: number; players: number; best: number }; offline: { settled: number; capped: number }; abyss: { label: string; count: number }[]; burn: number };
    /**
     * v27.63 환생 통계(세이브의 최근 환생 기록 20개 기준). recent: 24시간·7일 안에 일어난 환생 수.
     * 시간: 생 시작부터 환생까지 실제 시간(real)·사냥 시간(play)의 평균·중앙값(업데이트 전에 시작한 ‘일부’ 기록은 뺌).
     * byCount: 몇 번째 환생인지 구간별 평균. latest: 서버 전체 최근 환생 20건.
     */
    rebirthPace: {
        recent: { day: number; week: number }; measured: number;
        real: { avg: number; median: number }; play: { avg: number; median: number };
        byCount: { label: string; count: number; real: number; play: number }[];
        latest: { name: string; n: number; at: number; realMs: number; playMs: number; level: number; partial: boolean }[];
    };
};
/** v27.63 환생 통계. */
const REBIRTH_BANDS: [number, number, string][] = [[1, 1, '1번째'], [2, 3, '2~3번째'], [4, 5, '4~5번째'], [6, 10, '6~10번째'], [11, 20, '11~20번째'], [21, Infinity, '21번째 이후']];
function rebirthPaceStats(list: State[], now: number): AdminStats['rebirthPace'] {
    const all = list.flatMap(s => (s.rebirthLog || []).map(r => ({ ...r, name: s.name })));
    const full = all.filter(r => !r.partial), avg = (xs: number[]) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
    return {
        recent: { day: all.filter(r => now - r.at <= 86400_000).length, week: all.filter(r => now - r.at <= 7 * 86400_000).length },
        measured: full.length,
        real: { avg: avg(full.map(r => r.realMs)), median: median(full.map(r => r.realMs)) },
        play: { avg: avg(full.map(r => r.playMs)), median: median(full.map(r => r.playMs)) },
        byCount: REBIRTH_BANDS.map(([lo, hi, label]) => { const rows = full.filter(r => r.n >= lo && r.n <= hi); return { label, count: rows.length, real: avg(rows.map(r => r.realMs)), play: avg(rows.map(r => r.playMs)) }; }).filter(b => b.count),
        latest: [...all].sort((a, b) => b.at - a.at).slice(0, 20).map(r => ({ name: r.name, n: r.n, at: r.at, realMs: r.realMs, playMs: r.playMs, level: r.level, partial: !!r.partial })),
    };
}
/** v27.54 밸런스 지표. 통계 탭을 열 때만 돕니다. */
function balanceStats(list: State[]): AdminStats['balance'] {
    const tries = list.reduce((a, s) => a + (s.altar?.tries || 0), 0), wins = list.reduce((a, s) => a + (s.altar?.wins || 0), 0);
    const settled = list.filter(s => s.lastOffline), capped = settled.filter(s => s.lastOffline!.seconds >= offlineCapSeconds(s));
    return {
        godDepth: ALTAR.firstGod.depth, reached: list.filter(s => (s.abyssBest || 0) >= ALTAR.firstGod.depth).length,
        god: { tries, wins, players: list.filter(s => s.altar?.tries).length, best: Math.max(0, ...list.map(s => s.altar?.best || 0)) },
        offline: { settled: settled.length, capped: capped.length },
        abyss: bucketize(list.map(s => s.abyssBest || 0), [0, 1, 10, 25, 50, 75, 100], '층'),
        burn: list.filter(s => (s.skills || []).some(id => skillById(id)?.effect === 'burn')).length,
    };
}
const median = (xs: number[]) => { if (!xs.length) return 0; const a = [...xs].sort((x, y) => x - y), m = a.length >> 1; return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2); };
const countBy = <T>(xs: T[], key: (x: T) => string | null) => { const m = new Map<string, number>(); for (const x of xs) { const k = key(x); if (k) m.set(k, (m.get(k) || 0) + 1); } return m; };
const bucketize = (xs: number[], edges: number[], unit: string) => edges.map((lo, i) => { const hi = edges[i + 1]; return { label: hi === undefined ? `${lo}${unit} 이상` : lo + 1 === hi ? `${lo}${unit}` : `${lo}~${hi - 1}${unit}`, count: xs.filter(n => n >= lo && (hi === undefined || n < hi)).length }; });
/**
 * 운영 페이지 통계: 모든 세이브를 한 번 읽어 집계합니다. 운영자가 탭을 열거나 새로고침할 때만 돕니다(게임 요청에는 부하 없음).
 * 활동은 마지막 저장 시각 기준이라 자동 사냥을 켜 둔 채 접속을 끊은 모험가는 다시 접속할 때까지 세지 않습니다.
 */
export async function adminStats(now = Date.now()): Promise<AdminStats> {
    const database = db(), [accounts, rows, altar] = await Promise.all([database.listAccounts(), database.listPlayers(), database.getAltar()]);
    const saves: { s: State; at: number }[] = [];
    for (const row of rows) { try { const s = JSON.parse(row.state) as State; if (s && typeof s.level === 'number') saves.push({ s, at: row.updated_at }); } catch { /* 깨진 세이브는 건너뜀 */ } }
    const list = saves.map(x => x.s), levels = list.map(s => s.level || 1), rebirths = list.map(s => s.rebirths || 0);
    const since = (ms: number) => saves.filter(x => now - x.at <= ms).length;
    const sum = (f: (s: State) => number) => list.reduce((a, s) => a + (Number.isFinite(f(s)) ? f(s) : 0), 0);
    const named = (m: Map<string, number>, name: (id: string) => string) => [...m].map(([id, count]) => ({ name: name(id), count })).sort((a, b) => b.count - a.count);
    return {
        at: now, accounts: accounts.length, saves: saves.length,
        active: { hour: since(3600_000), day: since(86400_000), week: since(7 * 86400_000) },
        running: list.filter(s => s.running).length, inDungeon: list.filter(s => s.dungeon).length,
        level: { avg: list.length ? Math.round(sum(s => s.level) / list.length * 10) / 10 : 0, max: Math.max(0, ...levels), buckets: bucketize(levels, [1, 10, 20, 30, 40, 50, 60, 80, 100], '') },
        rebirths: { avg: list.length ? Math.round(sum(s => s.rebirths) / list.length * 10) / 10 : 0, max: Math.max(0, ...rebirths), buckets: bucketize(rebirths, [0, 1, 3, 5, 10, 20, 50], '회') },
        stages: named(countBy(list, s => s.dungeon ? null : s.stage), id => STAGES.find(x => x.id === id)?.name || id),
        dungeons: named(countBy(list, s => s.dungeon?.id || null), id => DUNGEONS.find(x => x.id === id)?.name || id),
        jobs: named(countBy(list, s => s.job), id => jobById(id)?.name || id).slice(0, 15),
        ranks: (() => {
            const idx = list.map(s => rankIndex(rankState(s).exp)), by = countBy(idx, i => String(i));
            return {
                dist: RANKS.map((r, i) => ({ name: `${r.name} (${r.group})`, count: by.get(String(i)) || 0 })),
                top: list.length ? RANKS[Math.max(...idx)].name : '-',
                perks: RANK_PERKS.map(p => { const lv = list.map(s => rankPerkLevel(s, p.id)), users = lv.filter(v => v > 0); return { name: p.name, count: users.length, avg: users.length ? Math.round(users.reduce((x, y) => x + y, 0) / users.length * 10) / 10 : 0, max: p.max }; }),
                freePoints: sum(s => rankPointsFree(s)),
            };
        })(),
        totals: { kills: sum(s => s.kills), playHours: Math.round(sum(s => s.playMs || 0) / 3600_000), gold: Math.floor(sum(s => s.gold)), pearls: sum(s => s.pearls), sp: sum(s => s.sp) },
        medians: { gold: median(list.map(s => Math.floor(s.gold || 0))), pearls: median(list.map(s => s.pearls || 0)) },
        abyssBest: Math.max(0, ...list.map(s => s.abyssBest || 0)),
        limitBreakers: list.filter(s => Object.values(s.limitBreaks || {}).some(n => n > 0)).length,
        inGuild: list.filter(s => s.guildMember?.id).length,
        altar: { gen: altar.gen, godAlive: altar.god_state === 'alive' && altar.god_until >= now, throne: altar.throne_name, points: altar.total_points, titheGold: altar.tithe_gold },
        balance: balanceStats(list),
        rebirthPace: rebirthPaceStats(list, now),
        top: [...list].sort((a, b) => (b.rebirths || 0) - (a.rebirths || 0) || b.level - a.level).slice(0, 10).map(s => ({ name: s.name, level: s.level, rebirths: s.rebirths || 0, abyss: s.abyssBest || 0 })),
    };
}

/** v27.69 운영: 제단 초기화. offers = 게이지에 쌓인 공물(기여도) 0으로, god = 신·신의 자리·몫 비우기. 바뀐 통계를 돌려줍니다. */
export async function resetAltar(kind: string) {
    if (kind !== 'offers' && kind !== 'god') throw new ApiError('초기화할 대상을 고르세요(offers 또는 god).');
    if (kind === 'offers') await db().resetAltarGauges(); else await db().resetAltarGod();
    invalidateAltar();
    return adminStats();
}
