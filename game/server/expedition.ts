import 'server-only';
/**
 * 원정대 3단계 서버: 고스트 상대와 월간 시즌 순위. rankings 표를 함께 씁니다(id 'expedition:<월>:<모험가>', snapshot.season = expeditionSeason(월)).
 * - 전투 전: 같은 라운드 보드를 가진 다른 플레이어의 행에서 하나를 골라 고스트로 넘깁니다(없으면 웨이브).
 * - 전투 뒤: 이번 달 행을 갱신합니다. 이번 판이 지난 최고보다 못하면 보드 스냅샷은 두고 '판 수'만 올립니다.
 */
import { db } from './db';
import { monthKey } from '../data/time';
import type { State, ExpeditionGhost, ExpeditionPlaced } from '../types';

export const expeditionSeason = (key: string) => 30_000_000 + Number(key.replace('-', ''));
export const expeditionRowId = (key: string, id: string) => `expedition:${key}:${id}`;
export type ExpeditionSnapshot = { season: number; account: string; name: string; wins: number; cleared: boolean; round: number; runs: number; boards: Record<number, ExpeditionPlaced[]>; updated: number };
const GHOST_POOL = 60;
/** 라운드(2~8)마다 그 라운드 보드를 가진 다른 플레이어 행 가운데 무작위 하나. 세이브를 읽기 전이라 모든 라운드 것을 한 번에 고릅니다(DB 조회 1번). 없는 라운드는 빠집니다. */
export async function pickGhosts(key: string, me: string, rng = Math.random): Promise<Record<number, ExpeditionGhost>> {
    const rows = await db().listRankings(expeditionSeason(key), GHOST_POOL);
    const pools: Record<number, ExpeditionGhost[]> = {};
    for (const r of rows) {
        let snap: ExpeditionSnapshot; try { snap = JSON.parse(r.snapshot) as ExpeditionSnapshot; } catch { continue; }
        if (snap.account === me) continue;
        for (let round = 2; round <= 8; round++) { const board = snap.boards?.[round]; if (board?.length) (pools[round] ??= []).push({ name: snap.name || '이름 없는 원정대', board }); }
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
    const better = !snap || r.wins > snap.wins || (r.wins === snap.wins && (r.round >= snap.round));
    const next: ExpeditionSnapshot = {
        season, account: id, name: s.name, updated: now,
        runs: (snap?.runs || 0) + (r.done && r.last ? 1 : 0),
        wins: better ? r.wins : snap!.wins, cleared: better ? r.round > 8 : snap!.cleared, round: better ? Math.min(8, r.round) : snap!.round,
        boards: better ? r.history : snap!.boards,
    };
    await db().upsertRanking({ id: rowId, snapshot: JSON.stringify(next), rating: next.wins * 100 + (next.cleared ? 50 : 0) + next.round, power: next.round, updated_at: now });
}
export async function listExpeditionBoard(key: string) {
    const rows = await db().listRankings(expeditionSeason(key), 50);
    return rows.map((r, i) => { const snap = JSON.parse(r.snapshot) as ExpeditionSnapshot; return { rank: i + 1, id: snap.account, name: snap.name, wins: snap.wins, cleared: snap.cleared, round: snap.round, runs: snap.runs, units: Object.values(snap.boards || {}).at(-1)?.map(p => `${p.unit}:${p.star}`) || [] }; });
}
