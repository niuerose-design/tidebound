import 'server-only';
/**
 * 원정대 3단계 서버: 고스트 상대와 월간 시즌 순위. rankings 표를 함께 씁니다(id 'expedition:<월>:<모험가>', snapshot.season = expeditionSeason(월)).
 * - 전투 전: 같은 라운드 보드를 가진 다른 플레이어의 행에서 하나를 골라 고스트로 넘깁니다(없으면 웨이브).
 * - 전투 뒤: 이번 달 행을 갱신합니다. 이번 판이 지난 최고보다 못하면 보드 스냅샷은 두고 '판 수'만 올립니다.
 */
import { db } from './db';
import { monthKey, previousMonthKey, weekKey, weekSeason } from '../data/time';
import { starterBoard } from '../systems/expedition';
import { seasonPearls, EXPEDITION, ABYSS, STARTER_GHOSTS, STARTER_GHOST, isBossRound, difficultyOf, mergeMods, combatMods, augmentMods, weeklyRuleById, masteryPerks, LEAGUE, GHOST_GUARD, type SeasonSettlement, type LeagueSettlement, encodeBoard, cleanShareText, SHARE_MEMO_MAX } from '../data/expedition';
import type { State, ExpeditionGhost, ExpeditionPlaced } from '../types';

export const expeditionSeason = (key: string) => 30_000_000 + Number(key.replace('-', ''));
export const expeditionRowId = (key: string, id: string) => `expedition:${key}:${id}`;
export type ExpeditionSnapshot = { season: number; account: string; name: string; wins: number; cleared: boolean; round: number; runs: number; boards: Record<number, ExpeditionPlaced[]>; updated: number; /** 4단계: 판(startedAt)별 고스트 가산점. 합이 시즌 점수에 더해집니다. */ ghostByRun?: Record<string, number>; score?: number; /** 15단계: 그 달 최고 심연 라운드. 16단계: 최고 판의 난이도. */ abyss?: number; difficulty?: number; /** 17단계: 최고 판의 라운드별 증강 · 주간 규칙 · 숙련(고스트 보정). */ augs?: Record<number, string[]>; rule?: string; mastery?: number; /** 23단계(3): 공유 코드에 붙는 작성자 메모. */ memo?: string };
/** 4단계 시즌 점수: 최고 판 승수 × 100 + 완주 50 + 닿은 라운드 + 이번 달 고스트 가산점 합. */
/** 판 자체의 점수(고스트 가산 제외): 승수 × 100 + 완주 50 + 라운드 + 난이도 가산 + 심연 × 20. 최고 판 비교에도 씁니다. */
export const runScore = (snap: Pick<ExpeditionSnapshot, 'wins' | 'cleared' | 'round' | 'abyss' | 'difficulty'>) => snap.wins * 100 + (snap.cleared ? 50 : 0) + snap.round + difficultyOf(snap.difficulty).score + (snap.abyss || 0) * ABYSS.scorePerRound;
export const expeditionScore = (snap: Pick<ExpeditionSnapshot, 'wins' | 'cleared' | 'round' | 'ghostByRun' | 'abyss' | 'difficulty'>) => runScore(snap) + Object.values(snap.ghostByRun || {}).reduce((a, n) => a + (n || 0), 0);
const GHOST_POOL = 60;
/** 라운드(2~8)마다 그 라운드 보드를 가진 다른 플레이어 행 가운데 무작위 하나. 세이브를 읽기 전이라 모든 라운드 것을 한 번에 고릅니다(DB 조회 1번). 없는 라운드는 빠집니다. */
/** v3.356 고스트 후보 행을 60초 동안 기억합니다(같은 달 전투가 몰릴 때 DB 조회 절약). 행 갱신은 syncExpeditionRow가 비웁니다. */
const GHOST_CACHE_MS = 60_000;
let ghostCache: { key: string; at: number; rows: Awaited<ReturnType<ReturnType<typeof db>['listRankings']>> } | null = null;
export const forgetGhosts = () => { ghostCache = null; };
/** 22단계: 라운드마다 후보 최대 3명(내 점수와 가까운 순)을 보내고, 후보 계정 수(pool)도 함께 보냅니다. */
export async function pickGhosts(key: string, me: string, rng = Math.random, now = Date.now()): Promise<Record<number, ExpeditionGhost[]> & { pool?: number }> {
    const rows = ghostCache && ghostCache.key === key && now - ghostCache.at < GHOST_CACHE_MS ? ghostCache.rows : await db().listRankings(expeditionSeason(key), GHOST_POOL);
    ghostCache = { key, at: now, rows };
    const pools: Record<number, (ExpeditionGhost & { score: number })[]> = {}, accounts = new Set<string>();
    let myScore: number | undefined;
    for (const r of rows) {
        let snap: ExpeditionSnapshot; try { snap = JSON.parse(r.snapshot) as ExpeditionSnapshot; } catch { continue; }
        if (snap.account === me) { myScore = snap.score ?? expeditionScore(snap); continue; }
        accounts.add(snap.account);
        for (let round = 2; round <= EXPEDITION.rounds; round++) { if (isBossRound(round)) continue; const board = snap.boards?.[round]; if (board?.length) { const augments = snap.augs?.[round] || [], mods = combatMods(mergeMods([weeklyRuleById(snap.rule)?.mods, ...augments.map(augmentMods), ...masteryPerks(snap.mastery || 1).map(p => p.mods)])); (pools[round] ??= []).push({ name: snap.name || '이름 없는 원정대', board, wins: snap.wins || 0, account: snap.account, score: snap.score ?? expeditionScore(snap), ...(mods ? { mods } : {}), ...(augments.length ? { augments } : {}) }); } }
    }
    // v3.422 연습 원정대: 라운드마다 실제 후보가 fillTo명보다 적으면 모자란 만큼을 내 점수와 가까운 연습 원정대로 채웁니다(실제 기록이 쌓이면 빠짐).
    // 이번 달 기록이 없는 모험가는 점수 0으로 봅니다(전에는 무작위 — 후보가 강한 한 명뿐이면 처음부터 그 사람을 만났음).
    const me0 = myScore ?? 0;
    let starters = 0;
    for (let round = 2; round <= EXPEDITION.rounds; round++) {
        if (isBossRound(round)) continue;
        const need = STARTER_GHOST.fillTo - (pools[round]?.length || 0); if (need <= 0) continue;
        const pick = [...STARTER_GHOSTS].sort((a, b) => Math.abs(a.score - me0) - Math.abs(b.score - me0)).slice(0, need);
        for (const g of pick) (pools[round] ??= []).push({ name: g.name, board: starterBoard(g, round), wins: g.wins, account: STARTER_GHOST.accountPrefix + g.id, score: g.score });
        starters = Math.max(starters, pick.length);
    }
    // 내 점수와 가까운 순으로 후보 3명. 후보 수(실제 계정 + 연습 원정대)를 pool로 실어 화면 쪽이 확률을 정합니다.
    const out: Record<number, ExpeditionGhost[]> & { pool?: number } = {};
    for (const [round, pool] of Object.entries(pools)) {
        const dist = (g: ExpeditionGhost & { score: number }) => Math.abs(g.score - me0) + (g.account?.startsWith(STARTER_GHOST.accountPrefix) ? STARTER_GHOST.distancePenalty : 0);
        const sorted = (myScore === undefined ? [...pool].sort(() => rng() - .5) : [...pool]).sort((a, b) => dist(a) - dist(b));
        out[Number(round)] = sorted.slice(0, GHOST_GUARD.candidates).map(g => { const copy: ExpeditionGhost & { score?: number } = { ...g }; delete copy.score; return copy; });
    }
    out.pool = accounts.size + starters;
    return out;
}
/** 전투 · 종료 뒤 이번 달 행 갱신. 승수가 지난 최고 이상이면 보드 스냅샷도 바꿉니다. */
export async function syncExpeditionRow(id: string, s: State, now: number) {
    const r = s.expedition; if (!r?.history) return;
    const key = monthKey(now), season = expeditionSeason(key), rowId = expeditionRowId(key, id);
    const prev = await db().getRanking(rowId, season);
    let snap: ExpeditionSnapshot | null = null;
    try { snap = prev ? JSON.parse(prev.snapshot) as ExpeditionSnapshot : null; } catch { snap = null; }
    const mine = { wins: r.wins, cleared: !!r.cleared || r.round > EXPEDITION.rounds, round: Math.min(EXPEDITION.rounds, r.round), abyss: r.abyss || 0, difficulty: r.difficulty || 1 };
    const better = !snap || runScore(mine) >= runScore(snap);
    const abyss = Math.max(snap?.abyss || 0, r.abyss || 0);
    const ghostByRun = { ...(snap?.ghostByRun || {}), [String(r.startedAt)]: r.ghostPoints || 0 };
    const next: ExpeditionSnapshot = {
        season, account: id, name: s.name, updated: now,
        ...(s.expeditionShareMemo ? { memo: cleanShareText(s.expeditionShareMemo, SHARE_MEMO_MAX) } : {}),
        runs: (snap?.runs || 0) + (r.done && r.last ? 1 : 0),
        wins: better ? r.wins : snap!.wins, cleared: better ? mine.cleared : snap!.cleared, round: better ? mine.round : snap!.round, difficulty: better ? mine.difficulty : (snap!.difficulty || 1),
        boards: better ? r.history : snap!.boards, ghostByRun, ...(abyss ? { abyss } : {}),
        ...(better ? { ...(r.augHistory ? { augs: r.augHistory } : {}), ...(r.rule ? { rule: r.rule } : {}), ...(r.mastery ? { mastery: r.mastery } : {}) } : { ...(snap!.augs ? { augs: snap!.augs } : {}), ...(snap!.rule ? { rule: snap!.rule } : {}), ...(snap!.mastery ? { mastery: snap!.mastery } : {}) }),
    };
    next.score = expeditionScore(next);
    await db().upsertRanking({ id: rowId, snapshot: JSON.stringify(next), rating: next.score, power: next.round, updated_at: now });
    forgetGhosts();
}
export async function listExpeditionBoard(key: string) {
    const rows = await db().listRankings(expeditionSeason(key), 50);
    return rows.map((r, i) => { const snap = JSON.parse(r.snapshot) as ExpeditionSnapshot; return { rank: i + 1, id: snap.account, name: snap.name, wins: snap.wins, cleared: snap.cleared, round: snap.round, abyss: snap.abyss || 0, difficulty: snap.difficulty || 1, runs: snap.runs, score: snap.score ?? expeditionScore(snap), ghostPoints: Object.values(snap.ghostByRun || {}).reduce((a, n) => a + (n || 0), 0), units: Object.values(snap.boards || {}).at(-1)?.map(p => `${p.unit}:${p.star}`) || [], code: shareCodeOf(snap) }; });
}
/** 23단계: 행의 마지막 보드를 공유 코드로(순위표 ‘코드 복사’). */
function shareCodeOf(snap: ExpeditionSnapshot) {
    const rounds = Object.keys(snap.boards || {}).map(Number).sort((a, b) => a - b), last = rounds.at(-1);
    const board = last !== undefined ? snap.boards[last] : undefined;
    return board?.length ? encodeBoard(board, { augments: snap.augs?.[last!] || [], round: snap.round, wins: snap.wins, author: snap.name, memo: snap.memo }) : '';
}
const SETTLE_POOL = 500;
/** 9단계 시즌 말 정산: 지난달(한국 시간) 행이 있으면 그 달 순위(상위 500 안, 밖이면 0)와 보상을 돌려줍니다. 지급 · 중복 방지는 expeditionStart 핸들러가 세이브의 expeditionSeasonClaimed로 합니다. */
export async function settleExpeditionSeason(id: string, now: number): Promise<SeasonSettlement | null> {
    const key = previousMonthKey(monthKey(now)), season = expeditionSeason(key);
    const mine = await db().getRanking(expeditionRowId(key, id), season); if (!mine) return null;
    let snap: ExpeditionSnapshot; try { snap = JSON.parse(mine.snapshot) as ExpeditionSnapshot; } catch { return null; }
    const rows = await db().listRankings(season, SETTLE_POOL);
    const rank = rows.findIndex(r => r.id === mine.id) + 1;
    return { season: key, rank, total: rows.length, wins: snap.wins || 0, pearls: seasonPearls(rank) };
}

// ───────────── 21단계 주간 리그 ─────────────
/** 주간 리그 행: rankings 표(id 'league:<주>:<모험가>', season = 40,000,000 + 주 번호). 같은 등급끼리 8명씩 조(group)를 짭니다(그 주에 처음 전투한 순서). */
export const leagueSeason = (key: string) => 40_000_000 + weekSeason(key);
export const leagueRowId = (key: string, id: string) => `league:${key}:${id}`;
export type LeagueSnapshot = { season: number; account: string; name: string; tier: number; group: number; bestRun: number; wins: number; runs: number; score: number; updated: number };
const LEAGUE_POOL = 2000;
const previousWeekKey = (now: number) => weekKey(now - 7 * 86_400_000);
/** 전투 · 종료 뒤 이번 주 행 갱신. 점수 = 최고 판 점수 + 그 주 끝난 판들의 승리 합. 조는 처음 들어올 때 정해져 바뀌지 않습니다. */
export async function syncLeagueRow(id: string, s: State, now: number) {
    const r = s.expedition; if (!r?.history) return;
    const key = weekKey(now), season = leagueSeason(key), rowId = leagueRowId(key, id), tier = Math.max(1, Math.min(LEAGUE.tiers.length, s.expeditionLeague?.tier || 1));
    const prev = await db().getRanking(rowId, season);
    let snap: LeagueSnapshot | null = null; try { snap = prev ? JSON.parse(prev.snapshot) as LeagueSnapshot : null; } catch { snap = null; }
    if (!snap) {
        const rows = await db().listRankings(season, LEAGUE_POOL);
        let same = 0; for (const row of rows) { try { if ((JSON.parse(row.snapshot) as LeagueSnapshot).tier === tier) same++; } catch { /* 깨진 행 */ } }
        snap = { season, account: id, name: s.name, tier, group: Math.floor(same / LEAGUE.size), bestRun: 0, wins: 0, runs: 0, score: 0, updated: now };
    }
    const mine = runScore({ wins: r.wins, cleared: !!r.cleared || r.round > EXPEDITION.rounds, round: Math.min(EXPEDITION.rounds, r.round), abyss: r.abyss || 0, difficulty: r.difficulty || 1 });
    snap.bestRun = Math.max(snap.bestRun, mine); snap.name = s.name; snap.updated = now;
    if (r.done && r.last) { snap.wins += r.wins; snap.runs++; }
    snap.score = snap.bestRun + snap.wins;
    await db().upsertRanking({ id: rowId, snapshot: JSON.stringify(snap), rating: snap.score, power: snap.tier, updated_at: now });
}
/** 내 조의 순위표(이번 주). 아직 행이 없으면 등급만 돌려줍니다. */
export async function listLeague(key: string, id: string, tierHint = 1) {
    const season = leagueSeason(key), rows = await db().listRankings(season, LEAGUE_POOL);
    const snaps: LeagueSnapshot[] = []; for (const row of rows) { try { snaps.push(JSON.parse(row.snapshot) as LeagueSnapshot); } catch { /* 깨진 행 */ } }
    const me = snaps.find(x => x.account === id);
    const members = me ? snaps.filter(x => x.tier === me.tier && x.group === me.group).sort((a, b) => b.score - a.score || b.bestRun - a.bestRun) : [];
    return { week: key, tier: me?.tier || tierHint, group: me?.group ?? null, joined: !!me, rows: members.map((x, i) => ({ rank: i + 1, id: x.account, name: x.name, score: x.score, bestRun: x.bestRun, wins: x.wins, runs: x.runs })) };
}
/** 지난주 정산: 내 조 안 순위 → 세계석 · 승급/강등. 지급 · 중복 방지는 expeditionStart 핸들러(expeditionLeague.claimed). */
export async function settleLeague(id: string, now: number): Promise<LeagueSettlement | null> {
    const key = previousWeekKey(now), board = await listLeague(key, id);
    if (!board.joined) return null;
    const rank = board.rows.findIndex(x => x.id === id) + 1, size = board.rows.length, tier = board.tier;
    const nextTier = rank <= LEAGUE.promote && tier < LEAGUE.tiers.length ? tier + 1 : rank > size - LEAGUE.demote && size >= LEAGUE.demoteMin && tier > 1 ? tier - 1 : tier;
    return { week: key, tier, rank, size, score: board.rows[rank - 1]?.score || 0, pearls: LEAGUE.rewards[rank - 1] ?? LEAGUE.rewards[LEAGUE.rewards.length - 1], nextTier };
}
