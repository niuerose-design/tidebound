/**
 * v3.199 보스 코어: 던전 보스 전리품은 장비가 아니라 '보스 코어' 칸에 끼는 코어입니다(기획안 2차안 F, 칠흑과 같은 규칙).
 * - 보스마다 코어 1종. 위력 · 별 · 무작위 옵션 없이 그 보스의 기술을 이어받는 전용 효과만 있습니다.
 * - 같은 코어를 다시 얻으면 각성 +1(최대 awakenMax, 효과 단계당 +awakenStep), 다 찼으면 세계석 duplicatePearls.
 * - 보스 코어 칸에는 하나만 끼고, 끼지 않은 코어는 효과의 resonance(10%)를 줍니다(턴 연장 효과는 제외).
 * - 서로 다른 코어 보유 수로 세트 효과. 환생 · 승천해도 남습니다(금고 없음). 드롭 확률 · 천장은 서버 전용(ODDS.bossLoot).
 */
import type { CombatStats, State } from '../types';

export const BOSS_CORE_RULES = { awakenMax: 5, awakenStep: .1, duplicatePearls: 5, resonance: .1 };
type CoreStat = keyof CombatStats;
export type BossCore = { name: string; boss: string; desc: string; bonus: Partial<Record<CoreStat, number>> };
/** 정수 턴 효과: 각성 배율 · 공명을 받지 않습니다. */
export const CORE_TURN_STATS = new Set<CoreStat>(['stunBonus', 'controlBonus', 'burnTurnsBonus']);
/** 던전 id → 보스 코어. 모두 보스 · 사냥감 피해 +5%에 그 보스의 기술을 이어받는 효과가 붙습니다. */
export const BOSS_CORES: Record<string, BossCore> = {
    grotto: { name: '머쉬맘의 포자 코어', boss: '머쉬맘', desc: '보스 · 사냥감 피해 +5%, 최대 체력 · 마나 +10%.', bonus: { bossDamage: .05, vitalPct: .1 } },
    kelpCatacomb: { name: '킹 슬라임의 점액 코어', boss: '킹 슬라임', desc: '보스 · 사냥감 피해 +5%, 상태이상(지속) 피해 +10%.', bonus: { bossDamage: .05, dotBonus: .1 } },
    cemetery: { name: '좀비 머쉬맘의 저주 코어', boss: '좀비 머쉬맘', desc: '보스 · 사냥감 피해 +5%, 기절 지속 +1턴.', bonus: { bossDamage: .05, stunBonus: 1 } },
    caldera: { name: '주니어 발록의 불씨 코어', boss: '주니어 발록', desc: '보스 · 사냥감 피해 +5%, 화상 지속 +1턴.', bonus: { bossDamage: .05, burnTurnsBonus: 1 } },
    temple: { name: '엘리쟈의 바람 코어', boss: '엘리쟈', desc: '보스 · 사냥감 피해 +5%, 침묵 · 감속 지속 +1턴.', bonus: { bossDamage: .05, controlBonus: 1 } },
    ventCathedral: { name: '자쿰의 팔 코어', boss: '자쿰', desc: '보스 · 사냥감 피해 +5%, 추가타 위력 +10%p.', bonus: { bossDamage: .05, followUpBonus: .1 } },
    starSanctum: { name: '파풀라투스의 시계 코어', boss: '파풀라투스', desc: '보스 · 사냥감 피해 +5%, 연속 행동 확률 +3%p.', bonus: { bossDamage: .05, chainBonus: .03 } },
};
export const coreAwaken = (rank: number) => 1 + Math.min(BOSS_CORE_RULES.awakenMax, Math.max(0, rank)) * BOSS_CORE_RULES.awakenStep;
export const ownedCores = (s: Pick<State, 'bossCores'>) => Object.keys(s.bossCores || {}).filter(id => BOSS_CORES[id]);
/** 세트 효과(보유 수 기준). */
export const BOSS_CORE_SET: { count: number; label: string; bonus: Partial<Record<CoreStat, number>> }[] = [
    { count: 2, label: '보스·사냥감 피해 +3%', bonus: { bossDamage: .03 } },
    { count: 4, label: '던전 코인 보너스 +10%', bonus: { dungeonGoldBonus: .1 } },
    { count: 6, label: '지속 피해 +5%', bonus: { dotBonus: .05 } },
    { count: 7, label: '보스·사냥감 피해 +5%', bonus: { bossDamage: .05 } },
];
/** 보스 코어 칸 · 공명 · 세트를 합친 능력치(합연산). */
export function coreStats(s: Pick<State, 'bossCores' | 'coreSlot'>) {
    const out: Partial<Record<CoreStat, number>> = {}, put = (k: CoreStat, v: number) => { out[k] = (out[k] || 0) + v; };
    for (const id of ownedCores(s)) {
        const rank = s.bossCores![id], worn = s.coreSlot === id;
        for (const [k, v] of Object.entries(BOSS_CORES[id].bonus) as [CoreStat, number][]) {
            if (CORE_TURN_STATS.has(k)) { if (worn) put(k, v); continue; }
            put(k, v * coreAwaken(rank) * (worn ? 1 : BOSS_CORE_RULES.resonance));
        }
    }
    const n = ownedCores(s).length;
    for (const b of BOSS_CORE_SET) if (n >= b.count) for (const [k, v] of Object.entries(b.bonus) as [CoreStat, number][]) put(k, v);
    return out;
}
