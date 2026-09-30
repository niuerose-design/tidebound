import { identity, checkOrigin, db, mutate, failure, ApiError, actionBody, RANKING_SEASON } from '@/game/server/store';
import { snapshot } from '@/game/systems/stats';
import { duel, TRAINING } from '@/game/systems/duel';
import { BALANCE } from '@/game/data/balance';
import type { Snapshot } from '@/game/types';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
    try {
        checkOrigin(req);
        const id = await identity(req), a = await actionBody(req);
        let opponent: Snapshot;
        const training = a.type === 'training';
        if (training) {
            const index = Number(a.id);
            if (!Number.isInteger(index) || !TRAINING[index])
                throw new ApiError('훈련 상대를 찾을 수 없습니다.');
            opponent = TRAINING[index];
        }
        else {
            if (a.type !== 'ranked' || a.id === id)
                throw new ApiError('다른 낚시꾼을 선택하세요.');
            const row = await db().getRanking(a.id || '', RANKING_SEASON);
            if (!row)
                throw new ApiError('상대가 등록되지 않았습니다.');
            opponent = { ...JSON.parse(row.snapshot), rating: row.rating };
        }
        const payload = await mutate(id, { type: 'sync' }, async (s) => { if (!training && Date.now() - s.lastDuel < BALANCE.duelCooldownMs)
            throw new ApiError('랭크 결투는 1분에 한 번 가능합니다.'); const result = duel(snapshot(s), opponent, training); if (!training) {
            s.lastDuel = Date.now();
            s.rating = Math.max(0, s.rating + result.ratingChange);
            if (result.winner === 'player')
                s.wins++;
            if (result.winner === 'opponent')
                s.losses++;
        } return result; });
        // Rating comes from authoritative player state; refresh snapshot with the explicit registration button.
        if (!training)
            await db().updateRating(id, payload.state.rating);
        return Response.json(payload);
    }
    catch (e) {
        return failure(e);
    }
}
