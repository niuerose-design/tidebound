/**
 * v3.195 던전 보스 전리품(기획안 2차안 F): 지역 던전의 하루 보너스 정복마다 ODDS.bossLoot.chance로 그 던전 보스의 전리품. 연속 미획득이 ODDS.bossLoot.pity번째면 확정.
 * 보너스 뒤 정복과 무릉도장은 굴리지 않습니다. v3.196 칠흑과 같은 규칙: 보스마다 고정 부위 태초 1개(data/boss-loot.ts), 이미 있으면 각성 +1(다 찼으면 세계석).
 * 처음 얻을 때는 내 레벨이고 잠긴 채로 가방에 들어갑니다(가방이 차 있어도 넣음 — 칠흑과 같음).
 */
import type { Item, State } from '../types';
import { rollAffixes, syncOrnateName } from '../data/gear';
import { gearName } from '../data/maple-gear';
import { RARITIES } from '../data/balance';
import { ODDS } from '../data/odds';
import { DUNGEONS } from '../data/world';
import { BOSS_LOOT_RULES, BOSS_LOOT_SLOTS, bossLootAffix, ownedLoot } from '../data/boss-loot';
import { addLog } from './state';

export { bossLootAffix } from '../data/boss-loot';
const bossName = (dungeonId: string) => DUNGEONS.find(d => d.id === dungeonId)?.boss?.split('·').pop()?.trim() || '';
/** 전리품 하나를 줍니다(새로 만들거나 각성). 드롭 판정은 rollBossLoot. */
export function grantBossLoot(s: State, dungeonId: string, rng: () => number): Item | undefined {
    const def = bossLootAffix(dungeonId), slot = BOSS_LOOT_SLOTS[dungeonId];
    if (!def || !slot) return undefined;
    const own = [...s.inventory, ...Object.values(s.equipment)].find(x => x?.bossLoot === dungeonId);
    if (own) {
        const rank = own.lootRank || 0;
        if (rank < BOSS_LOOT_RULES.awakenMax) { own.lootRank = rank + 1; addLog(s, `✦ 보스 전리품 · ${own.name} 각성 ${own.lootRank}/${BOSS_LOOT_RULES.awakenMax}! ◆ ${def.name} +${Math.round(own.lootRank * BOSS_LOOT_RULES.awakenStep * 100)}%`, 'reward'); }
        else { s.pearls += BOSS_LOOT_RULES.duplicatePearls; addLog(s, `✦ 보스 전리품 · ${own.name}은(는) 각성까지 마쳐 세계석 +${BOSS_LOOT_RULES.duplicatePearls}`, 'reward'); }
        return own;
    }
    const rarity = RARITIES.length - 1, level = Math.max(1, s.level);
    const power = Math.max(2, Math.round((level + 2) * RARITIES[rarity].factor * (.8 + rng() * .4)));
    const item: Item = { id: `loot-${dungeonId}-${s.turn}-${Math.floor(rng() * 1e9)}`, slot, rarity, name: '', power, level, locked: true, origin: dungeonId, bossLoot: dungeonId };
    if (slot === 'rod') item.style = rng() < .33 ? 'physical' : rng() < .5 ? 'magic' : 'balanced';
    item.affixes = rollAffixes(rarity, power, dungeonId, rng, [{ id: def.id, name: def.name, stat: def.stat, value: def.base, rule: true, ...(def.stat2 ? { stat2: def.stat2, value2: def.base2 } : {}) }], slot, level);
    item.name = gearName(slot, rarity, item.style);
    item.description = `${bossName(dungeonId)} 전리품. 환생해도 남고, 다시 얻으면 각성합니다.`;
    syncOrnateName(item);
    s.inventory.push(item);
    addLog(s, `✦ 보스 전리품! ${bossName(dungeonId)} · ${item.name} · ◆ ${def.name} (보유 ${ownedLoot(s).size}종)`, 'reward');
    return item;
}
/** 보너스 정복 한 번에 전리품을 굴립니다. 받았으면 그 장비(각성 포함). */
export function rollBossLoot(s: State, dungeonId: string, rng: () => number): Item | undefined {
    if (!bossLootAffix(dungeonId)) return undefined;
    const miss = s.bossLootMiss || 0;
    if (rng() >= ODDS.bossLoot.chance && miss + 1 < ODDS.bossLoot.pity) { s.bossLootMiss = miss + 1; return undefined; }
    s.bossLootMiss = 0;
    return grantBossLoot(s, dungeonId, rng);
}
