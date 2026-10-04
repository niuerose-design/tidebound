/** 도감·연구 보상 */
import { BOSS_RESEARCH } from '../../data/specializations';
import type { State } from '../../types';
import { FISH, DUNGEONS } from '../../data/world';
import { SLOTS, RARITIES } from '../../data/balance';
import { bookPending, itemKey } from '../progression';
import type { ActionHandlers } from './types';
import { addLog } from '../state';
/** 한 어종의 미수령 연구 보상을 모두 지급합니다. 각 단계는 bookClaims로 한 번만 지급됩니다. */
function claimBookRewards(s: State, id: string) {
    const pending = bookPending(s, id);
    if (!pending.ranks.length)
        return false;
    s.bookClaims[id] = pending.ranks.at(-1)! + 1;
    s.sp += pending.sp;
    s.gold += pending.gold;
    addLog(s, `도감 연구 ${pending.ranks.length > 1 ? `${pending.ranks.length}단계 ` : ''}완료 · ${FISH.find(f => f.id === id)!.name} · 골드 +${pending.gold}${pending.sp ? ` · SP +${pending.sp}` : ''}`, 'reward');
    return true;
}

export const collectionActions: ActionHandlers = {
    bossResearch(s, { id }) {
        const reward = BOSS_RESEARCH[id];
        if (!reward || !s.clears[id] || s.bossResearchClaims?.[id]) throw Error('아직 정복하지 않았거나 이미 연구 보상을 받았습니다.');
        s.bossResearchClaims ??= {};
        s.bossResearchClaims[id] = true;
        s.sp += reward.sp;
        addLog(s, `${DUNGEONS.find(x => x.id === id)!.name} 연구 완료 · SP +${reward.sp}`);
    },
    claimBook(s, { id }) {
        if (!FISH.some(f => f.id === id))
            throw Error('물고기를 찾을 수 없습니다.');
        if (!claimBookRewards(s, id))
            throw Error('받을 도감 보상이 없습니다.');
    },
    claimAllBooks(s) {
        if (!FISH.map(f => claimBookRewards(s, f.id)).some(Boolean))
            throw Error('받을 도감 보상이 없습니다.');
    },
    registerItem(s, { id }) {
        const item = s.inventory.find(x => x.id === id);
        if (!item)
            throw Error('가방에 있는 장비를 선택하세요.');
        if (item.locked || item.relic)
            throw Error('보호 장비와 유물은 등록할 수 없습니다.');
        const key = itemKey(item.slot, item.rarity);
        if (s.itemBook[key])
            throw Error('이미 등록한 종류입니다.');
        s.itemBook[key] = true;
        s.inventory = s.inventory.filter(x => x.id !== id);
        addLog(s, `${item.name} 물건도감 등록 · 장비 1개 소모`, 'reward');
    },
    /** v26.8 일괄 등록: 미등록 슬롯·등급마다 가방에서 가장 약한(위력 낮은) 장비 1개를 골라 한 번에 등록합니다. 보호·유물은 제외. */
    registerItemAll(s) {
        const picked: string[] = [];
        for (const slot of Object.keys(SLOTS)) for (let rarity = 0; rarity < RARITIES.length; rarity++) {
            const key = itemKey(slot, rarity);
            if (s.itemBook[key]) continue;
            const candidate = s.inventory.filter(x => x.slot === slot && x.rarity === rarity && !x.locked && !x.relic).sort((a, b) => a.power - b.power || (a.enhance || 0) - (b.enhance || 0))[0];
            if (!candidate) continue;
            s.itemBook[key] = true;
            s.inventory = s.inventory.filter(x => x.id !== candidate.id);
            picked.push(candidate.name);
        }
        if (!picked.length) throw Error('등록할 수 있는 미등록 장비가 가방에 없습니다.');
        addLog(s, `물건도감 일괄 등록 ${picked.length}종 · ${picked.join(', ')} 소모`, 'reward');
    },
};
