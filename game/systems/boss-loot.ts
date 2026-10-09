/**
 * v3.195 던전 보스 전리품(기획안 2차안 F): 지역 던전의 하루 보너스 정복마다 ODDS.bossLoot.chance로, 그 던전 보스의 전용 옵션(◆ 보스 피해 + 테마 효과)이
 * 붙은 고대(태초 ODDS.bossLoot.primal) 장비 1개. 연속 미획득이 ODDS.bossLoot.pity번째면 확정. 보너스 뒤 정복과 무릉도장은 굴리지 않습니다.
 * 내 레벨 장비이고, 잠금 상태로 가방에 들어갑니다(자동 판매 · 분해 대상 아님, 가방이 차 있어도 넣음 — 칠흑과 같음).
 */
import type { Item, State } from '../types';
import { AFFIX_POOL, rollAffixes, syncOrnateName } from '../data/gear';
import { gearName } from '../data/maple-gear';
import { RARITIES } from '../data/balance';
import { ODDS } from '../data/odds';
import { DUNGEONS } from '../data/world';
import { addLog } from './state';

/** 던전 id → 그 보스 전리품 전용 옵션 정의(onlyOrigin 'loot:<던전 id>'). */
export const bossLootAffix = (dungeonId: string) => AFFIX_POOL.find(a => a.onlyOrigin === `loot:${dungeonId}`);
/** 보너스 정복 한 번에 전리품을 굴립니다. 받았으면 그 장비. */
export function rollBossLoot(s: State, dungeonId: string, rng: () => number): Item | undefined {
    const def = bossLootAffix(dungeonId);
    if (!def) return undefined;
    const miss = s.bossLootMiss || 0;
    if (rng() >= ODDS.bossLoot.chance && miss + 1 < ODDS.bossLoot.pity) { s.bossLootMiss = miss + 1; return undefined; }
    s.bossLootMiss = 0;
    const rarity = rng() < ODDS.bossLoot.primal ? RARITIES.length - 1 : RARITIES.length - 2, level = Math.max(1, s.level);
    const slot = (['rod', 'coat', 'charm', 'cape'] as const)[Math.floor(rng() * 4)];
    const power = Math.max(2, Math.round((level + 2) * RARITIES[rarity].factor * (.8 + rng() * .4)));
    const item: Item = { id: `loot-${dungeonId}-${s.turn}-${Math.floor(rng() * 1e9)}`, slot, rarity, name: '', power, level, locked: true, origin: dungeonId };
    if (slot === 'rod') item.style = rng() < .33 ? 'physical' : rng() < .5 ? 'magic' : 'balanced';
    item.affixes = rollAffixes(rarity, power, dungeonId, rng, [{ id: def.id, name: def.name, stat: def.stat, value: def.base, rule: true, ...(def.stat2 ? { stat2: def.stat2, value2: def.base2 } : {}) }], slot, level);
    item.name = gearName(slot, rarity, item.style);
    item.description = `${DUNGEONS.find(d => d.id === dungeonId)?.boss || ''} 전리품.`;
    syncOrnateName(item);
    s.inventory.push(item);
    addLog(s, `✦ 보스 전리품! ${RARITIES[rarity].name} ${item.name} · ◆ ${def.name} (${def.description})`, 'reward');
    return item;
}
