/** v3.469 수평 상점 행동: { type: 'horizon', id: 물건 id }. 세계석을 내고 State.horizon.bought에 셉니다. */
import type { ActionHandlers } from './types';
import { addLog } from '../state';
import { horizonItemById, horizonCount } from '../../data/horizon';

export const horizonActions: ActionHandlers = {
    horizon(s, { id }) {
        const item = horizonItemById(id);
        if (!item) throw Error('없는 물건입니다.');
        const have = horizonCount(s, id);
        if (have >= item.max) throw Error(item.max > 1 ? `${item.name}은(는) ${item.max}개까지만 살 수 있습니다.` : '이미 산 물건입니다.');
        if ((s.pearls || 0) < item.cost) throw Error(`세계석이 모자랍니다. ${item.cost.toLocaleString()}개가 필요합니다.`);
        s.pearls -= item.cost;
        s.horizon = { bought: { ...(s.horizon?.bought || {}), [id]: have + 1 } };
        addLog(s, `수평 상점 · 세계석 ${item.cost.toLocaleString()}개로 ${item.name}을(를) 샀습니다${item.max > 1 ? ` · ${have + 1} / ${item.max}` : ''}. 승천해도 남습니다.`, 'reward');
    },
};
