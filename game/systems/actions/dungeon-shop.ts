/** v3.188 던전 코인샵: 칠흑 장신구 제작 · 각성, 희귀 이상 장비 상자, 포식자 각인. 가격은 data/dungeon-shop.ts. */
import { DUNGEON_SHOP, HUNTER_AFFIX } from '../../data/dungeon-shop';
import { affixDef, rollOption, syncOrnateName } from '../../data/gear';
import { inventoryCap } from '../../data/economy';
import { STAGES } from '../../data/world';
import { onyxById } from '../../data/onyx';
import { grantOnyx } from '../onyx-grant';
import { drop, dropLevel, gainLevels } from '../encounter';
import { allItems, hunterBlock, onyxOffer, countBought, growthOffer, rollGearBoxRarity, qualityLines, applyQuality, lineQuality, QUALITY_PRICE } from '../dungeon-coins';
import type { QualityGood } from '../../data/dungeon-shop';
import { addLog } from '../state';
import { BOSS_CORES } from '../../data/boss-core';
import { RARITIES } from '../../data/balance';
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
    dungeonShop(s, { a, id, rng, now }) {
        if (id.startsWith('onyx:')) {
            const bossId = id.slice(5), offer = onyxOffer(s, bossId, now);
            if (offer.reason) throw Error(offer.reason);
            if (offer.kind === 'craft') room(s);
            pay(s, offer.price);
            countBought(s, 'onyx', now);
            const habitat = STAGES.find(st => st.habitat && st.region === onyxById(bossId)!.region)?.level || 1;
            grantOnyx(s, bossId, habitat, rng, `던전 코인샵 · 코인 -${offer.price.toLocaleString()}`);
            return;
        }
        if (id === 'gearBox') {
            room(s);
            pay(s, DUNGEON_SHOP.gearBox);
            // v3.193 전설 이상 확정, 내 레벨 기준. 고대 · 태초는 일반 드롭 하나와 비슷한 확률(GEAR_BOX).
            const before = s.inventory.length, rarity = rollGearBoxRarity(rng);
            drop(s, dropLevel(s, s.level, 0), rng, true, undefined, rarity);
            addLog(s, `던전 코인샵 · 전설 이상 장비 상자 개봉 · ${RARITIES[rarity].name} · 코인 -${DUNGEON_SHOP.gearBox.toLocaleString()}${s.inventory.length > before ? '' : ' (자동 판매 · 분해 설정으로 처리됨)'}`, 'reward');
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
        if (id === 'growth1' || id === 'growth4') {
            // v3.194 성장권: 최근 24시간 중 가장 많이 번 1시간의 골드 · 경험치 × 시간. 환생 50회 미만, 하루 한도.
            const offer = growthOffer(s, id, now);
            if (offer.reason) throw Error(offer.reason);
            pay(s, offer.price);
            countBought(s, id, now);
            s.gold += offer.gold; s.exp += offer.exp;
            gainLevels(s);
            addLog(s, `던전 코인샵 · 성장권 ${offer.hours}시간 · 골드 +${offer.gold.toLocaleString()} · 경험치 +${offer.exp.toLocaleString()} · 코인 -${offer.price.toLocaleString()}`, 'reward');
            return;
        }
        throw Error('없는 상품입니다.');
    },
    /** v3.199 보스 코어 칸: id = 가진 코어의 던전 id(빈 값이면 빼기). */
    equipCore(s, { id }) {
        if (!id) { s.coreSlot = undefined; addLog(s, '보스 코어를 칸에서 뺐습니다.'); return; }
        if (!BOSS_CORES[id] || !(id in (s.bossCores || {}))) throw Error('가진 보스 코어만 낄 수 있습니다.');
        s.coreSlot = id;
        addLog(s, `보스 코어 칸 · ${BOSS_CORES[id].name} 장착`);
    },
};
