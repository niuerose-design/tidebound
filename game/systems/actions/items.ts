/** 장비 장착·해제·판매 */
import { saleValue } from '../equipment';
import { stats } from '../stats';
import { inventoryCap } from '../../data/economy';
import type { ActionHandlers } from './types';

export const itemActions: ActionHandlers = {
    equip(s, { id }) {
        const item = s.inventory.find(x => x.id === id);
        if (!item)
            throw Error('장비를 찾을 수 없습니다.');
        s.inventory = s.inventory.filter(x => x.id !== id);
        if (s.equipment[item.slot])
            s.inventory.push(s.equipment[item.slot]!);
        s.equipment[item.slot] = item;
        s.hp = Math.min(s.hp, stats(s).hp);
    },
    unequip(s, { id }) {
        if (!['rod', 'coat', 'charm', 'cape'].includes(id) || !s.equipment[id])
            throw Error('장착한 장비가 없습니다.');
        if (s.inventory.length >= inventoryCap(s))
            throw Error('가방이 가득 찼습니다.');
        s.inventory.push(s.equipment[id]!);
        s.equipment[id] = null;
        s.hp = Math.min(s.hp, stats(s).hp);
    },
    sell(s, { id }) {
        const item = s.inventory.find(x => x.id === id);
        if (!item)
            throw Error('장비를 찾을 수 없습니다.');
        if (item.locked || item.relic || item.onyx)
            throw Error('보호 장비와 유물·칠흑 장신구는 판매할 수 없습니다.');
        s.gold += saleValue(item);
        s.inventory = s.inventory.filter(x => x.id !== id);
    },
};
