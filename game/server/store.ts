import type { State, Action, Snapshot } from '../types';
import { newState, advance, act } from '../systems/engine';
import { migrateState } from '../systems/migrations';
import { snapshot } from '../systems/stats';
import { SAVE_VERSION } from '../data/balance';
import { db, ConfigError, type SlotRow } from './db';
import { ascended, ascensionOf, lifetimeRebirths } from '../data/ascension';
import type { RankingRow } from './db';
import { abyssWeeklyPearls } from '../systems/progress';
import { addLog } from '../systems/state';
import { refreshEvents } from './events-config';
import { ensurePuzzleKey, readHacks, syncHackerBoard } from './hacks';
import { isHacker } from '../systems/hacker';
import { accountFromRequest, AuthError, readSlot } from './auth';
import { MONSTERS } from '../data/world';
import { JOBS } from '../data/classes';
import { jobMastered } from '../systems/progression';
import { mergeSlots, slotUnlocked, slotUnlockText, ACCOUNT_RULES, SLOT_COUNT, type SlotSummary } from '../data/account';
import { weekKey, weekSeason, monthKey, monthSeason, previousMonthKey } from '../data/time';
export { db };
export class ApiError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
/** 로그인한 계정과 현재 캐릭터 슬롯. 세션이 없으면 401. id는 세이브·랭킹·채팅에 쓰는 모험가 ID(1번 슬롯은 계정 ID 그대로, 2·3번은 '계정#2'). */
export async function session(req: Request) {
    const account = await accountFromRequest(req);
    if (!account) throw new ApiError('플레이하려면 로그인이 필요합니다.', 401);
    const slot = readSlot(req);
    return { account, slot, id: playerId(account, slot) };
}
export const playerId = (account: string, slot: number) => slot > 1 ? `${account}#${slot}` : account;
/** 현재 슬롯의 모험가 ID. 세션이 없으면 401. */
export async function identity(req: Request) { return (await session(req)).id; }
const ACCOUNT_REFRESH_MS = 10 * 60_000;
/** 슬롯 요약: 계정 보너스에 쓰는 기록만 담습니다. */
function slotSummary(s: State, slot: number, now: number): SlotSummary {
    const bosses = MONSTERS.filter(f => f.boss).reduce((a, f) => a + (s.book?.[f.id] || 0), 0);
    return { slot, name: s.name, job: s.job, level: s.level, rebirths: s.rebirths || 0, lifetimeRebirths: lifetimeRebirths(s), ascension: ascensionOf(s), mastered: JOBS.filter(j => jobMastered(s, j)).map(j => j.id), species: MONSTERS.filter(f => (s.book?.[f.id] || 0) > 0).map(f => f.id), bossKills: bosses, abyssBest: s.abyssBest || 0, updatedAt: now };
}
/** 보너스 단계가 바뀌는 값만 비교해, 레벨업·처치마다 올리지 않습니다. */
const summaryKey = (x: SlotSummary) => `${x.lifetimeRebirths ?? x.rebirths}|${x.ascension || 0}|${x.rebirths}|${x.mastered.join(',')}|${x.species.length}|${Math.floor(x.bossKills / ACCOUNT_RULES.bossPer)}|${Math.floor(x.abyssBest / ACCOUNT_RULES.abyssPer)}`;
const parseSlots = (rows: SlotRow[]) => rows.flatMap(r => { try { return [JSON.parse(r.summary) as SlotSummary]; } catch { return []; } });
/**
 * 행동 처리 뒤 저장 전에 한 번: 내 슬롯 요약이 보너스 단계상 바뀌었거나 10분이 지났으면 올리고, 모든 슬롯을 합쳐 s.account 에 캐시합니다.
 * 바뀐 게 없으면 추가 질의 0. 다른 슬롯의 진행은 최대 10분 늦게 반영됩니다.
 */
export async function syncAccount(account: string, slot: number, s: State, now: number) {
    const own = slotSummary(s, slot, now), key = summaryKey(own), cached = s.account;
    if (cached && cached.slot === slot && cached.ownKey === key && now - cached.syncedAt < ACCOUNT_REFRESH_MS) return;
    const database = db();
    await database.upsertSlot({ account_id: account, slot, summary: JSON.stringify(own), updated_at: now });
    const others = parseSlots(await database.listSlots(account)).filter(x => x.slot !== slot);
    const merged = mergeSlots(slot, [...others, own], now);
    // v3.31 승천한 모험가의 계정 보너스는 자기 기록으로만 다시 채웁니다(슬롯 목록·해금은 계정 전체 그대로).
    s.account = ascended(s) ? { ...mergeSlots(slot, [own], now), slots: merged.slots, lifetimeRebirths: merged.lifetimeRebirths, ownKey: key } : { ...merged, ownKey: key };
}
/** 슬롯 전환: 열린 슬롯인지 저장된 요약으로 확인합니다. */
export async function switchSlot(account: string, slot: number, now: number) {
    if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT) throw new ApiError('없는 슬롯입니다.');
    const merged = mergeSlots(slot, parseSlots(await db().listSlots(account)), now);
    if (!slotUnlocked(merged, slot)) throw new ApiError(`${slot}번 슬롯은 ${slotUnlockText(slot)} 뒤에 열립니다.`, 403);
    return merged;
}
export function checkOrigin(req: Request) {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin)
        throw new ApiError('허용되지 않은 요청입니다.', 403);
}
export async function mutate(id: string, action: Action, extra?: (s: State) => Promise<unknown>) {
    const database = db(), now = Date.now();
    // v3.18 침투 작전 정답 키(인스턴스마다 한 번). v3.25 해킹 효과(이벤트 변조·서버 다운)도 30초 캐시로 반영합니다.
    // v3.92 이벤트 · 정답 키 · 해킹 설정과 첫 세이브 읽기는 서로 기다릴 필요가 없어 함께 읽습니다(DB 왕복 최대 4번 → 1번).
    const [, , , first] = await Promise.all([refreshEvents(now), ensurePuzzleKey(now), readHacks(now), database.getPlayer(id)]);
    for (let attempt = 0; attempt < 3; attempt++) {
        let row = attempt === 0 ? first : await database.getPlayer(id);
        // v25.10 처음 보는 모험가일 때만 만듭니다(매 동기화마다 INSERT ON CONFLICT를 날리지 않음).
        if (!row) { await database.createPlayerIfMissing(id, JSON.stringify(newState(now)), now); row = await database.getPlayer(id); }
        if (!row)
            throw new ApiError('저장 데이터를 불러오지 못했습니다.', 503);
        const s = migrateState(JSON.parse(row.state) as State, now);
        advance(s, now);
        act(s, action, now);
        const result = extra ? await extra(s) : null;
        // v3.25 해커 순위(월): 기록이 바뀌었을 때만 한 번 씁니다.
        await syncHackerBoard(id, s, now);
        if (await database.updatePlayer(id, JSON.stringify(s), now, row.revision))
            return { state: s, result };
    }
    throw new ApiError('다른 창에서 진행 중입니다. 다시 시도하세요.', 409);
}
/** v25.12 결투 시즌: 한국 시간 월 단위. 랭킹 행 id는 duel:<시즌>:<모험가>이라 지난 시즌 행이 덮어써지지 않아 순위 정산이 안정적입니다. */
export const duelSeasonKey = (now: number) => monthKey(now);
export const duelRowId = (seasonKey: string, id: string) => `duel:${seasonKey}:${id}`;
export async function register(id: string) {
    const now = Date.now(), key = duelSeasonKey(now);
    const { state } = await mutate(id, { type: 'sync' }, s => syncDuelSeason(id, s, now));
    // v3.18 해커는 결투 정보를 새로 등록하지 않습니다(이전 직업으로 등록해 둔 기록은 그대로). v3.26 숨김 정보는 해커의 신원 조작이 서버 설정에 둡니다.
    if (isHacker(state)) throw new ApiError('해커는 결투 정보를 등록할 수 없습니다. 다른 직업으로 등록해 두면 그 기록이 남습니다.');
    const snap = { ...snapshot(state), season: monthSeason(key), seasonRank: state.duelSeason?.lastKey === previousMonthKey(key) ? state.duelSeason?.lastRank : undefined };
    await db().upsertRanking({ id: duelRowId(key, id), snapshot: JSON.stringify(snap), rating: snap.rating, power: snap.power, updated_at: now });
    return state;
}
/**
 * 저장 전에 한 번: 시즌(월)이 바뀌었으면 지난 시즌 순위를 기록하고 점수를 1000으로 되돌립니다.
 * 지난 시즌(또는 v25.11 이전 영구 랭킹)에 방어 정보가 있었으면 같은 정보로 새 시즌 행을 만들어 기록판이 비지 않게 합니다. 같은 시즌이면 질의 0.
 */
export async function syncDuelSeason(id: string, s: State, now: number) {
    const key = duelSeasonKey(now);
    if (s.duelSeason?.key === key) return;
    const database = db(), previous = previousMonthKey(key), fresh = !s.duelSeason;
    let rank = 0, carry: RankingRow | null = null;
    if (!fresh) {
        const rows = await database.listRankings(monthSeason(previous), 100);
        rank = rows.findIndex(r => r.id === duelRowId(previous, id)) + 1;
        carry = rows[rank - 1] || await database.getRanking(duelRowId(previous, id), monthSeason(previous));
        if (rank > 0) addLog(s, `지난 시즌(${previous}) 결투 ${rank}위로 마쳤습니다.`, 'system');
    }
    carry ||= await database.getRanking(id, SAVE_VERSION); // v25.11 이전 영구 랭킹 행
    s.duelSeason = { key, ...(rank > 0 ? { lastKey: previous, lastRank: rank } : {}) };
    s.rating = 1000;
    if (carry) {
        const snap = { ...JSON.parse(carry.snapshot) as Snapshot, season: monthSeason(key), rating: 1000, ...(rank > 0 ? { seasonRank: rank } : { seasonRank: undefined }) };
        await database.upsertRanking({ id: duelRowId(key, id), snapshot: JSON.stringify(snap), rating: 1000, power: carry.power, updated_at: now });
    }
    if (!fresh) addLog(s, `새 결투 시즌 ${key} · 점수가 1000으로 돌아갑니다.`, 'system');
}
/**
 * v3.31 승천 직후 서버 정리(docs/balance-rebirth.md 10·12절): 계정 금고를 비우고, 이번 달 결투 기록판과 이번 주 무릉도장 기록판에서 즉시 뺍니다.
 * 금고는 계정 공용이라 다른 분신이 넣어 둔 몫도 함께 사라집니다(의도).
 */
export async function afterAscend(account: string, id: string, now: number) {
    // v3.116 금고 비우기는 vaultAfterAscend(칠흑은 그 분신 몫만)로 옮겼습니다.
    const database = db();
    await database.deleteRanking(duelRowId(duelSeasonKey(now), id));
    await database.deleteRanking(abyssRowId(id));
}
/** v25.6 주간 심연 기록판. 행 id는 abyss:<계정>, 시즌은 주 키 정수(예: 202640)라 모험가 랭킹(시즌 = 세이브 버전)과 섞이지 않습니다. */
const abyssRowId = (id: string) => `abyss:${id}`;
export async function listAbyssBoard(now: number) {
    const key = weekKey(now), rows = await db().listRankings(weekSeason(key), 100);
    return { key, rows: rows.map((r, i) => { const snap = JSON.parse(r.snapshot) as { name: string; depth: number; job: string; rebirths: number; account: string; privacy?: { show: string[] } }; return { rank: i + 1, id: snap.account, name: snap.name, depth: Number(snap.depth) || r.rating, job: snap.job, rebirths: snap.rebirths, updatedAt: r.updated_at, ...(snap.privacy ? { privacy: snap.privacy } : {}) }; }) };
}
/**
 * 행동 처리 뒤 저장 전에 한 번: 이번 주 심연 기록이 새로 깊어졌으면 올리고, 주가 바뀌었으면 지난주 순위 보상을 한 번 정산합니다.
 * 심연에 들어간 적 없는 세이브는 아무것도 하지 않습니다(요청당 추가 질의 0).
 */
export async function syncAbyssBoard(id: string, s: State, now: number) {
    const week = s.abyssWeek;
    if (!week) return;
    const database = db(), current = weekKey(now);
    if (week.dirty && week.key === current) {
        await database.upsertRanking({ id: abyssRowId(id), snapshot: JSON.stringify({ season: weekSeason(current), board: 'abyss', account: id, name: s.name, depth: week.best, job: s.job, rebirths: s.rebirths }), rating: week.best, power: week.best, updated_at: now });
        delete week.dirty;
    }
    const previous = weekKey(now - 7 * 86400000);
    if (week.settled === previous) return;
    {
        const rows = await database.listRankings(weekSeason(previous), 100);
        const rank = rows.findIndex(r => r.id === abyssRowId(id)) + 1;
        week.settled = previous;
        if (rank > 0) { const pearls = abyssWeeklyPearls(rank); s.pearls += pearls; addLog(s, `지난주 무릉도장 기록 ${rank}위(${rows[rank - 1].rating}층) · 세계석 +${pearls}`, 'reward'); }
    }
}
export function failure(e: unknown) {
    if (e instanceof ApiError || e instanceof AuthError || e instanceof ConfigError)
        return Response.json({ error: e.message }, { status: e.status });
    console.error('Game API error', e);
    return Response.json({ error: '요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.' }, { status: 503 });
}
export async function readJson(req: Request, limit = 4096): Promise<Record<string, unknown>> {
    if (Number(req.headers.get('content-length') || 0) > limit)
        throw new ApiError('요청이 너무 큽니다.', 413);
    try {
        const text = await req.text();
        if (text.length > limit)
            throw Error();
        const v = JSON.parse(text);
        if (!v || typeof v !== 'object') throw Error();
        return v;
    }
    catch {
        throw new ApiError('올바르지 않은 요청입니다.');
    }
}
export async function actionBody(req: Request) {
    const a = await readJson(req);
    if (typeof a.type !== 'string' || (a.id !== undefined && typeof a.id !== 'string') || (a.value !== undefined && typeof a.value !== 'string'))
        throw new ApiError('올바르지 않은 행동입니다.');
    return a as Action;
}
