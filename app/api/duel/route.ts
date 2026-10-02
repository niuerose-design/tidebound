import { identity, checkOrigin, db, mutate, failure, ApiError, actionBody, duelSeasonKey, duelRowId, syncDuelSeason } from '@/game/server/store';
import { monthSeason } from '@/game/data/goals';
import { recordGoal } from '@/game/systems/progress';
import { addLog } from '@/game/systems/state';
import { snapshot } from '@/game/systems/stats';
import { duel, bossSnapshot } from '@/game/systems/duel';
import { BALANCE } from '@/game/data/balance';
import type { Snapshot } from '@/game/types';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
    try {
        checkOrigin(req);
        const id = await identity(req), a = await actionBody(req);
        const now = Date.now(), season = duelSeasonKey(now), seasonNo = monthSeason(season), myRow = duelRowId(season, id);
        let opponent: Snapshot;
        const training = a.type === 'training';
        if (training) {
            // 훈련 상대: 등록된 낚시꾼(자기 자신 포함)의 방어 정보 또는 던전 보스. 점수·전적은 바뀌지 않습니다.
            // 행 id에 ':'가 들어가므로(duel:<시즌>:<낚시꾼>) 첫 구분자에서만 나눕니다.
            const raw = String(a.id || ''), cut = raw.indexOf(':'), kind = cut < 0 ? raw : raw.slice(0, cut), target = cut < 0 ? '' : raw.slice(cut + 1);
            if (kind === 'user') {
                const row = await db().getRanking(target || '', seasonNo);
                if (!row) throw new ApiError('훈련 상대가 등록되지 않았습니다.');
                opponent = { ...JSON.parse(row.snapshot), rating: row.rating };
            }
            else {
                const boss = kind === 'boss' ? bossSnapshot(target || '') : null;
                if (!boss) throw new ApiError('훈련 상대를 찾을 수 없습니다.');
                opponent = boss;
            }
        }
        else {
            if (a.type !== 'ranked' || a.id === myRow || a.id === id)
                throw new ApiError('다른 낚시꾼을 선택하세요.');
            const row = await db().getRanking(a.id || '', seasonNo);
            if (!row)
                throw new ApiError('상대가 등록되지 않았습니다.');
            opponent = { ...JSON.parse(row.snapshot), rating: row.rating };
        }
        const payload = await mutate(id, { type: 'sync' }, async (s) => { await syncDuelSeason(id, s, now); if (!training && now - s.lastDuel < BALANCE.duelCooldownMs)
            throw new ApiError('랭크 결투는 1분에 한 번 가능합니다.'); const result = duel(snapshot(s), opponent, training); if (!training) {
            s.lastDuel = now;
            s.rating = Math.max(0, s.rating + result.ratingChange);
            if (result.winner === 'player') { s.wins++; recordGoal(s, 'duel', undefined, 1, text => addLog(s, text, 'reward')); }
            if (result.winner === 'opponent')
                s.losses++;
        } return result; });
        // Rating comes from authoritative player state; refresh snapshot with the explicit registration button.
        if (!training)
            await db().updateRating(myRow, payload.state.rating);
        return Response.json(payload);
    }
    catch (e) {
        return failure(e);
    }
}
