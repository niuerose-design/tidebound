/** 게임 진입점: 행동 처리(act)와 턴 진행을 묶습니다. 세부 규칙은 state·turn·encounter·dungeon-run·actions/에 있습니다. */
import type { State, Action } from '../types';
// v3.44 비밀 직업·계보(서버 전용)를 먼저 직업 표에 더합니다.
import '../secret/register';
import { commerce } from './commerce';
import { clampVitals } from './stats';
import { grantJobSkills } from './progression';
import { syncGoals, syncAchievements, claimAchievements, unclaimedAchievements } from './progress';
import { claimPendingBooks } from './actions/collection';
import { researchRank } from '../data/economy';
import { syncVoyage } from './guidance';
import { addLog } from './state';
import { syncStatRate } from './turn';
import type { ActionHandlers } from './actions/types';
import { voyageActions } from './actions/voyage';
import { buildActions } from './actions/build';
import { collectionActions } from './actions/collection';
import { itemActions } from './actions/items';
import { lifecycleActions } from './actions/lifecycle';
import { hackerActions } from './actions/hacker';
import { dungeonShopActions } from './actions/dungeon-shop';

export { newState } from './state';
export { tick, advance } from './turn';
export { victoryHeal, rollRarity } from './encounter';

const HANDLERS: ActionHandlers = { ...voyageActions, ...buildActions, ...collectionActions, ...itemActions, ...lifecycleActions, ...hackerActions, ...dungeonShopActions };

export function act(s: State, a: Action, now: number, rng = Math.random) {
    syncStatRate(s);
    syncGoals(s, now);
    dispatch(s, a, now, rng);
    syncVoyage(s, text => addLog(s, text, 'reward'));
    syncAchievements(s, text => addLog(s, text, 'reward'));
    autoClaimRewards(s);
}
/** v3.154 세계석 연구 ‘자동 수령’: 행동(동기화 포함) 뒤에 받지 않은 업적 보상과 도감 연구 보상을 받습니다. 턴 안이 아니라 행동 뒤라 부재중 정산의 비례 환산에 섞이지 않습니다. */
export function autoClaimRewards(s: State) {
    if (!(researchRank(s, 'autoClaim') > 0)) return;
    if (unclaimedAchievements(s).length) { const got = claimAchievements(s, 'all'); addLog(s, `자동 수령 · 업적 보상 ${got.count}개 · 세계석 +${got.pearls}${got.sp ? ` · SP +${got.sp}` : ''}`, 'reward'); }
    claimPendingBooks(s);
}
function dispatch(s: State, a: Action, now: number, rng: () => number) {
    // 직업 기술이 생기기 전 세이브도 다음 행동에서 보충하고, 새로 레벨 조건을 채운 기술도 지급합니다.
    grantJobSkills(s);
    const message = commerce(s, a, rng);
    if (message !== null) {
        clampVitals(s);
        addLog(s, message);
        return;
    }
    const handler = Object.hasOwn(HANDLERS, a.type) ? HANDLERS[a.type] : undefined;
    if (!handler) throw Error('지원하지 않는 행동입니다.');
    handler(s, { a, id: a.id || '', now, rng });
}
