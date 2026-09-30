/** 게임 진입점: 행동 처리(act)와 턴 진행을 묶습니다. 세부 규칙은 state·turn·encounter·dungeon-run·actions/에 있습니다. */
import type { State, Action } from '../types';
import { commerce } from './commerce';
import { guildAction } from './guild';
import { clampVitals } from './stats';
import { grantJobSkills } from './progression';
import { syncVoyage } from './guidance';
import { syncGoal } from './goals';
import { addLog } from './state';
import { syncStatRate } from './turn';
import type { ActionHandlers } from './actions/types';
import { voyageActions } from './actions/voyage';
import { buildActions } from './actions/build';
import { collectionActions } from './actions/collection';
import { itemActions } from './actions/items';
import { lifecycleActions } from './actions/lifecycle';

export { addLog, newState } from './state';
export { tick, advance, syncStatRate } from './turn';
export { victoryHeal, rollRarity } from './encounter';
export { parseRepeat } from './dungeon-run';

const HANDLERS: ActionHandlers = { ...voyageActions, ...buildActions, ...collectionActions, ...itemActions, ...lifecycleActions };

export function act(s: State, a: Action, now: number, rng = Math.random) {
    syncStatRate(s);
    dispatch(s, a, now, rng);
    syncVoyage(s, text => addLog(s, text, 'reward'));
    syncGoal(s, text => addLog(s, text, 'reward'));
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
    const guildMessage = guildAction(s, a);
    if (guildMessage !== null) {
        clampVitals(s);
        addLog(s, guildMessage, 'reward');
        return;
    }
    const handler = Object.hasOwn(HANDLERS, a.type) ? HANDLERS[a.type] : undefined;
    if (!handler) throw Error('지원하지 않는 행동입니다.');
    handler(s, { a, id: a.id || '', now, rng });
}
