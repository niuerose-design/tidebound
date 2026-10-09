/**
 * v3.195 던전 보스 전리품: 지역 던전의 하루 보너스 정복마다 ODDS.bossLoot.chance로 그 던전 보스의 코어. 연속 미획득이 ODDS.bossLoot.pity번째면 확정.
 * 보너스 뒤 정복과 무릉도장은 굴리지 않습니다. v3.199 전리품은 장비가 아니라 보스 코어(data/boss-core.ts): 처음이면 획득, 있으면 각성 +1(다 찼으면 세계석).
 */
import type { State } from '../types';
import { ODDS } from '../data/odds';
import { BOSS_CORES, BOSS_CORE_RULES, ownedCores } from '../data/boss-core';
import { addLog } from './state';

/** 보스 코어 하나를 줍니다(새로 얻거나 각성). 받은 뒤 각성 단계, 코어가 없는 던전이면 undefined. */
export function grantBossCore(s: State, dungeonId: string): number | undefined {
    const core = BOSS_CORES[dungeonId];
    if (!core) return undefined;
    const cores = (s.bossCores ??= {}), had = dungeonId in cores;
    if (!had) {
        cores[dungeonId] = 0;
        if (!s.coreSlot) s.coreSlot = dungeonId;
        addLog(s, `✦ 보스 코어 획득! ${core.name} · ${core.desc} (보유 ${ownedCores(s).length}/${Object.keys(BOSS_CORES).length}종${s.coreSlot === dungeonId ? ' · 보스 코어 칸에 장착' : ''})`, 'reward');
        return 0;
    }
    if (cores[dungeonId] < BOSS_CORE_RULES.awakenMax) {
        cores[dungeonId] += 1;
        addLog(s, `✦ 보스 코어 · ${core.name} 각성 ${cores[dungeonId]}/${BOSS_CORE_RULES.awakenMax}! 효과 +${Math.round(cores[dungeonId] * BOSS_CORE_RULES.awakenStep * 100)}%(턴 연장 제외)`, 'reward');
    } else { s.pearls += BOSS_CORE_RULES.duplicatePearls; addLog(s, `✦ 보스 코어 · ${core.name}은(는) 각성까지 마쳐 세계석 +${BOSS_CORE_RULES.duplicatePearls}`, 'reward'); }
    return cores[dungeonId];
}
/** 보너스 정복 한 번에 보스 코어를 굴립니다. 받았으면 각성 단계. */
export function rollBossLoot(s: State, dungeonId: string, rng: () => number): number | undefined {
    if (!BOSS_CORES[dungeonId]) return undefined;
    const miss = s.bossLootMiss || 0;
    if (rng() >= ODDS.bossLoot.chance && miss + 1 < ODDS.bossLoot.pity) { s.bossLootMiss = miss + 1; return undefined; }
    s.bossLootMiss = 0;
    return grantBossCore(s, dungeonId);
}
