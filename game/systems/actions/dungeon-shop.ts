/** v3.188 던전 코인샵: 칠흑 장신구 제작 · 각성, 희귀 이상 장비 상자, 포식자 각인. 가격은 data/dungeon-shop.ts. */
import { DUNGEON_SHOP, HUNTER_AFFIX } from '../../data/dungeon-shop';
import { affixDef, rollOption, syncOrnateName } from '../../data/gear';
import { inventoryCap } from '../../data/economy';
import { STAGES } from '../../data/world';
import { onyxById } from '../../data/onyx';
import { grantOnyx } from '../onyx-grant';
import { drop, dropLevel } from '../encounter';
import { allItems, hunterBlock, onyxOffer, qualityLines, applyQuality, lineQuality, QUALITY_PRICE } from '../dungeon-coins';
import type { QualityGood } from '../../data/dungeon-shop';
import { addLog } from '../state';
import type { State } from '../../types';
import type { ActionHandlers } from './types';

function pay(s: State, price: number) {
    if ((s.dungeonCoins || 0) < price) throw Error(`던전 코인이 부족합니다 (필요 ${price.toLocaleString()}).`);
    s.dungeonCoins = (s.dungeonCoins || 0) - price;
}
function room(s: State) {
    if (s.inventory.length >= inventoryCap()) throw Error('가방을 비운 뒤 구매하세요.');
}

export const dungeonShopActions: ActionHandlers = {
    /** id: 'onyx:<보스 id>' · 'gearBox' · 'hunter'(value '장비 id|옵션 칸'). */
    dungeonShop(s, { a, id, rng }) {
        if (id.startsWith('onyx:')) {
            const bossId = id.slice(5), offer = onyxOffer(s, bossId);
            if (offer.reason) throw Error(offer.reason);
            if (offer.kind === 'craft') room(s);
            pay(s, offer.price);
            const habitat = STAGES.find(st => st.habitat && st.region === onyxById(bossId)!.region)?.level || 1;
            grantOnyx(s, bossId, habitat, rng, `던전 코인샵 · 코인 -${offer.price.toLocaleString()}`);
            return;
        }
        if (id === 'gearBox') {
            room(s);
            pay(s, DUNGEON_SHOP.gearBox);
            const before = s.inventory.length;
            drop(s, dropLevel(s, s.level, 0), rng, true);
            addLog(s, `던전 코인샵 · 장비 상자 개봉 · 코인 -${DUNGEON_SHOP.gearBox.toLocaleString()}${s.inventory.length > before ? '' : ' (자동 판매 · 분해 설정으로 처리됨)'}`, 'reward');
            return;
        }
        if (id === 'hunter') {
            const [itemId, line] = String(a.value || '').split('|'), index = Number(line);
            const item = allItems(s).find(x => x.id === itemId);
            if (!item) throw Error('장비를 찾을 수 없습니다.');
            const blocked = hunterBlock(item);
            if (blocked) throw Error(blocked);
            const target = item.affixes![index];
            if (!Number.isInteger(index) || !target) throw Error('바꿀 옵션 칸을 고르세요.');
            if (target.rule) throw Error('규칙 옵션(◆)은 바꿀 수 없습니다.');
            pay(s, DUNGEON_SHOP.hunterImprint);
            const next = rollOption(affixDef(HUNTER_AFFIX)!, item.power, item.rarity, rng, item.level);
            item.affixes = item.affixes!.map((x, i) => i === index ? next : x);
            syncOrnateName(item);
            addLog(s, `던전 코인샵 · ${item.name} ${target.name} → ${next.name} 각인 · 코인 -${DUNGEON_SHOP.hunterImprint.toLocaleString()}`, 'reward');
            return;
        }
        if (id === 'quality100' || id === 'quality120') {
            // v3.189 옵션 수치 상품: 고른 줄의 수치를 100%로, 또는 120~150%로(일반 장비도 보통 최고를 넘김).
            const good = id as QualityGood, [itemId, line] = String(a.value || '').split('|'), index = Number(line);
            const item = allItems(s).find(x => x.id === itemId);
            if (!item) throw Error('장비를 찾을 수 없습니다.');
            if (!Number.isInteger(index) || !qualityLines(item, good).includes(index)) throw Error('수치를 올릴 수 있는 옵션 칸을 고르세요(규칙 · 고정 · 장식 옵션과 이미 목표 이상인 줄은 제외).');
            const price = QUALITY_PRICE[good], before = Math.round((lineQuality(item, index) || 0) * 100);
            pay(s, price);
            const { after } = applyQuality(item, index, good, rng), now = Math.round((lineQuality(item, index) || 0) * 100);
            addLog(s, `던전 코인샵 · ${item.name} ${after.name} 수치 ${before}% → ${now}% · 코인 -${price.toLocaleString()}`, 'reward');
            return;
        }
        throw Error('없는 상품입니다.');
    },
};
