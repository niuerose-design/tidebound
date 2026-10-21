import 'server-only';
/**
 * 원정대 3단계 서버: 고스트 상대와 월간 시즌 순위. rankings 표를 함께 씁니다(id 'expedition:<월>:<모험가>', snapshot.season = expeditionSeason(월)).
 * - 전투 전: 같은 라운드 보드를 가진 다른 플레이어의 행에서 하나를 골라 고스트로 넘깁니다(없으면 웨이브).
 * - 전투 뒤: 이번 달 행을 갱신합니다. 이번 판이 지난 최고보다 못하면 보드 스냅샷은 두고 '판 수'만 올립니다.
 */
import { db } from './db';
import { monthKey, previousMonthKey } from '../data/time';
import { seasonPearls, EXPEDITION, ABYSS, isBossRound, difficultyOf, mergeMods, combatMods, augmentMods, weeklyRuleById, masteryPerks, type SeasonSettlement } from '../data/expedition';
import type { State, ExpeditionGhost, ExpeditionPlaced } from '../types';

export const expeditionSeason = (key: string) => 30_000_000 + Number(key.replace('-', ''));
export const expeditionRowId = (key: string, id: string) => `expedition:${key}:${id}`;
export type ExpeditionSnapshot = { season: number; account: string; name: string; wins: number; cleared: boolean; round: number; runs: number; boards: Record<number, ExpeditionPlaced[]>; updated: number; /** 4단계: 판(startedAt)별 고스트 가산점. 합이 시즌 점수에 더해집니다. */ ghostByRun?: Record<string, number>; score?: number; /** 15단계: 그 달 최고 심연 라운드. 16단계: 최고 판의 난이도. */ abyss?: number; difficulty?: number; /** 17단계: 최고 판의 라운드별 증강 · 주간 규칙 · 숙련(고스트 보정). */ augs?: Record<number, string[]>; rule?: string; mastery?: number };
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
export async function pickGhosts(key: string, me: string, rng = Math.random, now = Date.now()): Promise<Record<number, ExpeditionGhost>> {
    const rows = ghostCache && ghostCache.key === key && now - ghostCache.at < GHOST_CACHE_MS ? ghostCache.rows : await db().listRankings(expeditionSeason(key), GHOST_POOL);
    ghostCache = { key, at: now, rows };
    const pools: Record<number, ExpeditionGhost[]> = {};
    for (const r of rows) {
        let snap: ExpeditionSnapshot; try { snap = JSON.parse(r.snapshot) as ExpeditionSnapshot; } catch { continue; }
        if (snap.account === me) continue;
        for (let round = 2; round <= EXPEDITION.rounds; round++) { if (isBossRound(round)) continue; const board = snap.boards?.[round]; if (board?.length) { const augments = snap.augs?.[round] || [], mods = combatMods(mergeMods([weeklyRuleById(snap.rule)?.mods, ...augments.map(augmentMods), ...masteryPerks(snap.mastery || 1).map(p => p.mods)])); (pools[round] ??= []).push({ name: snap.name || '이름 없는 원정대', board, wins: snap.wins || 0, ...(mods ? { mods } : {}), ...(augments.length ? { augments } : {}) }); } }
    }
    const out: Record<number, ExpeditionGhost> = {};
    for (const [round, pool] of Object.entries(pools)) out[Number(round)] = pool[Math.floor(rng() * pool.length)];
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
    return rows.map((r, i) => { const snap = JSON.parse(r.snapshot) as ExpeditionSnapshot; return { rank: i + 1, id: snap.account, name: snap.name, wins: snap.wins, cleared: snap.cleared, round: snap.round, abyss: snap.abyss || 0, difficulty: snap.difficulty || 1, runs: snap.runs, score: snap.score ?? expeditionScore(snap), ghostPoints: Object.values(snap.ghostByRun || {}).reduce((a, n) => a + (n || 0), 0), units: Object.values(snap.boards || {}).at(-1)?.map(p => `${p.unit}:${p.star}`) || [] }; });
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
