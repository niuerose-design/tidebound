/**
 * v3.202 던전 보스 전리품: 지역 던전의 하루 보너스 정복마다 ODDS.bossLoot.chance로 그 던전 보스의 코어. 연속 미획득이 ODDS.bossLoot.pity번째면 확정.
 * 보너스 뒤 정복과 무릉도장은 굴리지 않습니다. v3.202 전리품은 장비가 아니라 보스 코어(data/boss-core.ts): 처음이면 획득, 있으면 각성 +1(다 찼으면 세계석).
 */
import type { State } from '../types';
import { ODDS } from '../data/odds';
import { BOSS_CORES, BOSS_CORE_RULES, ABYSS_CORE_IDS, abyssCoreRank, CORE_ATTRS, coreForgeEssence, ownedCores, coreEntry, rollCoreAttrs, rollCoreAttr, rollCoreFactor, type CoreAttr } from '../data/boss-core';
import { ATTRIBUTES } from '../data/progression';
import { addLog } from './state';

const attrName = (a: CoreAttr) => `${ATTRIBUTES.find(x => x.id === a.k)!.name} 레벨 ×${a.f}`;
export type CoreForge = 'reroll' | 'refine';
/** v3.203 코어 능력치 손보기의 정수 비용(재설정 · 재련 같음, 이 코어를 정수로 손본 횟수만큼 ×1.2). */
export const coreForgeCost = (s: Pick<State, 'bossCores'>, id: string) => coreForgeEssence(coreEntry(s.bossCores?.[id])?.forges || 0);
/** 손볼 수 있는 줄인지. 못 하면 이유. 예전 코어(능력치 없음)는 빈 줄을 재설정으로 채웁니다. */
export function coreForgeBlock(s: Pick<State, 'bossCores'>, id: string, line: number, kind: CoreForge) {
    const e = coreEntry(s.bossCores?.[id]);
    if (!BOSS_CORES[id] || !e) return '가진 보스 코어만 손볼 수 있습니다.';
    if (!Number.isInteger(line) || line < 0 || line >= CORE_ATTRS.count) return '손볼 능력치 줄을 고르세요.';
    if (kind === 'refine' && !e.attrs[line]) return '빈 줄은 재설정으로 채우세요.';
    return undefined;
}
/** 고른 줄을 재설정(종류 · 배율) 또는 재련(배율만)합니다. counted면 정수 비용 횟수를 올립니다. 바뀐 전후를 돌려줍니다. */
export function forgeCore(s: State, id: string, line: number, kind: CoreForge, rng: () => number, counted: boolean) {
    const e = coreEntry(s.bossCores![id])!, attrs = [...e.attrs], before = attrs[line];
    const next = kind === 'refine' ? { k: before.k, f: rollCoreFactor(rng) } : rollCoreAttr(rng, attrs.filter((_, i) => i !== line).map(a => a.k));
    attrs[line] = next;
    s.bossCores![id] = { rank: e.rank, attrs: attrs.filter(Boolean), ...(counted || e.forges ? { forges: (e.forges || 0) + (counted ? 1 : 0) } : {}) };
    return { before: before ? attrName(before) : '빈 줄', after: attrName(next) };
}

/** 보스 코어 하나를 줍니다(새로 얻거나 각성). 받은 뒤 각성 단계, 코어가 없는 던전이면 undefined. */
export function grantBossCore(s: State, dungeonId: string, rng: () => number = Math.random): number | undefined {
    const core = BOSS_CORES[dungeonId];
    if (!core) return undefined;
    const cores = (s.bossCores ??= {}), had = coreEntry(cores[dungeonId]);
    if (!had) {
        const attrs = rollCoreAttrs(rng);
        cores[dungeonId] = { rank: 0, attrs };
        if (!s.coreSlot) s.coreSlot = dungeonId;
        const names = attrs.map(attrName).join(' · ');
        addLog(s, `✦ 보스 코어 획득! ${core.name} · ${core.desc} 기본 능력치: ${names} (보유 ${ownedCores(s).length}/${Object.keys(BOSS_CORES).length}종${s.coreSlot === dungeonId ? ' · 보스 코어 칸에 장착' : ''})`, 'reward');
        return 0;
    }
    if (had.rank < BOSS_CORE_RULES.awakenMax) {
        cores[dungeonId] = { ...had, rank: had.rank + 1 };
        addLog(s, `✦ 보스 코어 · ${core.name} 각성 ${had.rank + 1}/${BOSS_CORE_RULES.awakenMax}! 효과 · 기본 능력치 +${Math.round((had.rank + 1) * BOSS_CORE_RULES.awakenStep * 100)}%(턴 연장 제외)`, 'reward');
        return had.rank + 1;
    }
    s.pearls += BOSS_CORE_RULES.duplicatePearls; addLog(s, `✦ 보스 코어 · ${core.name}은(는) 각성까지 마쳐 세계석 +${BOSS_CORE_RULES.duplicatePearls}`, 'reward');
    return had.rank;
}
/** 보너스 정복 한 번에 보스 코어를 굴립니다. 받았으면 각성 단계. */
export function rollBossLoot(s: State, dungeonId: string, rng: () => number): number | undefined {
    if (!BOSS_CORES[dungeonId]) return undefined;
    const miss = s.bossLootMiss || 0;
    if (rng() >= ODDS.bossLoot.chance && miss + 1 < ODDS.bossLoot.pity) { s.bossLootMiss = miss + 1; return undefined; }
    s.bossLootMiss = 0;
    return grantBossCore(s, dungeonId, rng);
}
/**
 * v3.207 무릉도장 코어: 최고 층(abyssBest)이 그 코어의 층에 닿으면 얻고(기본 능력치 무작위), 다음 층마다 각성합니다.
 * 층 정복 때와 세이브를 읽을 때(이미 높이 오른 유저) 부릅니다. 능력치 굴림은 코어 · 층으로 정해지는 난수라 결정적입니다.
 */
export function syncAbyssCores(s: State, log = true) {
    for (const id of ABYSS_CORE_IDS) {
        const want = abyssCoreRank(id, s.abyssBest || 0);
        if (want < 0) continue;
        const cores = (s.bossCores ??= {}), had = coreEntry(cores[id]), core = BOSS_CORES[id];
        if (!had) {
            let seed = [...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
            const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
            cores[id] = { rank: want, attrs: rollCoreAttrs(rng) };
            if (!s.coreSlot) s.coreSlot = id;
            if (log) addLog(s, `✦ 무릉도장 ${core.floors![0]}층 돌파 · 보스 코어 획득! ${core.name} · ${core.desc} 기본 능력치: ${(cores[id] as { attrs: CoreAttr[] }).attrs.map(attrName).join(' · ')}${want ? ` · 각성 ${want}` : ''}`, 'reward');
        } else if (had.rank < want) {
            cores[id] = { ...had, rank: Math.min(BOSS_CORE_RULES.awakenMax, want) };
            if (log) addLog(s, `✦ 무릉도장 ${core.floors![want]}층 돌파 · ${core.name} 각성 ${want}/${BOSS_CORE_RULES.awakenMax}`, 'reward');
        }
    }
}
