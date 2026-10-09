/**
 * v3.196 던전 보스 전리품(칠흑 장신구와 같은 규칙): 보스마다 고정 부위 태초 장비 1개 + 전용 옵션(◆, 재설정 · 이식 · 재련 불가).
 * 같은 전리품을 다시 얻으면 각성 +1(최대 awakenMax, 전용 옵션 단계당 +awakenStep), 다 찼으면 세계석 duplicatePearls.
 * 환생해도 남고, 서로 다른 전리품 보유 수로 세트 효과가 붙습니다. 확률 · 천장은 서버 전용(ODDS.bossLoot).
 * 부위 · 전용 옵션 · 세트 효과는 가안이며 보스의 공격 스킬 · 컨셉에 맞춰 다시 정합니다(전용 옵션 정의는 data/gear.ts의 loot*).
 */
import type { Item, State } from '../types';
import { AFFIX_POOL } from './gear';

/** resonance: v3.197 착용하지 않은 전리품의 전용 옵션을 이 비율만큼 받습니다(각성 포함, 제어 연장 턴 제외 — 칠흑 공명과 같음). */
export const BOSS_LOOT_RULES = { awakenMax: 5, awakenStep: .1, duplicatePearls: 5, resonance: .1 };
/** 던전 id → 전리품 부위(가안). */
export const BOSS_LOOT_SLOTS: Record<string, 'rod' | 'coat' | 'charm' | 'cape'> = {
    grotto: 'cape', kelpCatacomb: 'coat', cemetery: 'charm', caldera: 'rod', temple: 'cape', ventCathedral: 'rod', starSanctum: 'charm',
};
/** 던전 id → 그 보스 전리품 전용 옵션 정의(onlyOrigin 'loot:<던전 id>'). */
export const bossLootAffix = (dungeonId: string) => AFFIX_POOL.find(a => a.onlyOrigin === `loot:${dungeonId}`);
/** 이 줄이 그 전리품의 전용 옵션인지. */
export const isLootUnique = (item: Pick<Item, 'bossLoot'>, affixId: string) => !!item.bossLoot && bossLootAffix(item.bossLoot)?.id === affixId;
/** 각성 배율: 1 + 단계 × awakenStep. */
export const lootAwaken = (item: Pick<Item, 'lootRank'>) => 1 + Math.min(BOSS_LOOT_RULES.awakenMax, Math.max(0, item.lootRank || 0)) * BOSS_LOOT_RULES.awakenStep;
/** 보유한 전리품의 던전 id 집합(가방 · 착용). */
export const ownedLoot = (s: Pick<State, 'inventory' | 'equipment'>) => new Set([...s.inventory, ...Object.values(s.equipment)].map(i => i?.bossLoot).filter((x): x is string => !!x));
/** 세트 효과(보유 수 기준, 가안). */
export const BOSS_LOOT_SET: { count: number; label: string; bossDamage?: number; dungeonGoldBonus?: number; statusResist?: number }[] = [
    { count: 2, label: '보스·사냥감 피해 +3%', bossDamage: .03 },
    { count: 4, label: '던전 코인 보너스 +10%', dungeonGoldBonus: .1 },
    { count: 6, label: '상태이상 저항 +5%p', statusResist: .05 },
    { count: 7, label: '보스·사냥감 피해 +5%', bossDamage: .05 },
];
export const bossLootSetBonus = (owned: number) => BOSS_LOOT_SET.filter(b => owned >= b.count).reduce((a, b) => ({ bossDamage: a.bossDamage + (b.bossDamage || 0), dungeonGoldBonus: a.dungeonGoldBonus + (b.dungeonGoldBonus || 0), statusResist: a.statusResist + (b.statusResist || 0) }), { bossDamage: 0, dungeonGoldBonus: 0, statusResist: 0 });
/** v3.197 공명: 착용하지 않은 전리품마다 전용 옵션(각성 포함) × resonance. 제어 연장(controlBonus)은 정수라 빠집니다. */
export function lootResonance(s: Pick<State, 'inventory' | 'equipment'>) {
    const worn = new Set(Object.values(s.equipment).map(i => i?.id).filter(Boolean)), out: Record<string, number> = {};
    for (const item of s.inventory) {
        if (!item.bossLoot || worn.has(item.id)) continue;
        const a = bossLootAffix(item.bossLoot);
        if (!a) continue;
        const m = lootAwaken(item) * BOSS_LOOT_RULES.resonance;
        if (a.stat !== 'controlBonus') out[a.stat] = (out[a.stat] || 0) + a.base * m;
        if (a.stat2 && a.base2 && a.stat2 !== 'controlBonus') out[a.stat2] = (out[a.stat2] || 0) + a.base2 * m;
    }
    return out;
}
