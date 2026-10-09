/**
 * v3.199 보스 코어: 던전 보스 전리품은 장비가 아니라 '보스 코어' 칸에 끼는 코어입니다(기획안 2차안 F, 칠흑과 같은 규칙).
 * - 보스마다 코어 1종. 위력 · 별 · 장비 옵션 없이 그 보스의 기술을 이어받는 전용 효과 + v3.202 무작위 기본 능력치 2종(레벨 비례)이 있습니다.
 * - 같은 코어를 다시 얻으면 각성 +1(최대 awakenMax, 효과 단계당 +awakenStep), 다 찼으면 세계석 duplicatePearls.
 * - 보스 코어 칸에는 하나만 끼고, 끼지 않은 코어는 효과의 resonance(10%)를 줍니다(턴 연장 효과는 제외).
 * - 서로 다른 코어 보유 수로 세트 효과. 환생 · 승천해도 남습니다(금고 없음). 드롭 확률 · 천장은 서버 전용(ODDS.bossLoot).
 */
import type { Attribute, CombatStats, State } from '../types';

export const BOSS_CORE_RULES = { awakenMax: 5, awakenStep: .1, duplicatePearls: 5, resonance: .1 };
type CoreStat = keyof CombatStats;
export type BossCore = { name: string; boss: string; desc: string; bonus: Partial<Record<CoreStat, number>> };
/** 정수 턴 효과: 각성 배율 · 공명을 받지 않습니다. */
export const CORE_TURN_STATS = new Set<CoreStat>(['stunBonus', 'controlBonus', 'dotTurnsBonus']);
/** 던전 id → 보스 코어. 모두 보스 · 사냥감 피해 +5%에 그 보스의 기술을 이어받는 효과가 붙습니다. */
export const BOSS_CORES: Record<string, BossCore> = {
    grotto: { name: '머쉬맘의 포자 코어', boss: '머쉬맘', desc: '보스 · 사냥감 피해 +5%, 최대 체력 +2,000 · 최대 마나 +300.', bonus: { bossDamage: .05, hp: 2000, mana: 300 } },
    kelpCatacomb: { name: '킹 슬라임의 점액 코어', boss: '킹 슬라임', desc: '보스 · 사냥감 피해 +5%, 상태이상(지속) 피해 +10%.', bonus: { bossDamage: .05, dotBonus: .1 } },
    cemetery: { name: '좀비 머쉬맘의 저주 코어', boss: '좀비 머쉬맘', desc: '보스 · 사냥감 피해 +5%, 기절 지속 +1턴.', bonus: { bossDamage: .05, stunBonus: 1 } },
    caldera: { name: '주니어 발록의 불씨 코어', boss: '주니어 발록', desc: '보스 · 사냥감 피해 +5%, 지속 피해(출혈 · 중독 · 화상) 지속 +1턴.', bonus: { bossDamage: .05, dotTurnsBonus: 1 } },
    temple: { name: '엘리쟈의 바람 코어', boss: '엘리쟈', desc: '보스 · 사냥감 피해 +5%, 방어 관통 +10%p(관통 상한 안).', bonus: { bossDamage: .05, penetration: .1 } },
    ventCathedral: { name: '자쿰의 팔 코어', boss: '자쿰', desc: '보스 · 사냥감 피해 +5%, 추가타 위력 +10%p.', bonus: { bossDamage: .05, followUpBonus: .1 } },
    starSanctum: { name: '파풀라투스의 시계 코어', boss: '파풀라투스', desc: '보스 · 사냥감 피해 +5%, 연속 행동 확률 +3%p.', bonus: { bossDamage: .05, chainBonus: .03 } },
};
/**
 * v3.202 기본 능력치: 코어마다 받을 때 6종 중 count종을 무작위로 고르고, 각 배율 f(min~max)를 굴립니다.
 * 실제 값 = 지금 레벨 × f × 각성 배율(끼지 않은 코어는 × 공명 10%). f 0.2~1.0: Lv.100이면 20~100, Lv.30이면 6~30. 직업 조건 · 기록에는 세지 않습니다(능력치 효과에만).
 * 측정(기준 몸 히어로, 주 능력치 + 체질 기준): 7종 평균 굴림 × 전투력 1.11(환생 50) ≈ 칠흑 장신구 1개(×1.11), 최고 굴림 · 각성 5는 ×1.20.
 * f 1~5(레벨 × 100~500)는 7종 평균 ×1.30 · 최고 ×1.70으로 칠흑보다 훨씬 강해 낮췄습니다.
 */
export const CORE_ATTRS = { count: 2, min: .2, max: 1 };
export type CoreAttr = { k: Attribute; f: number };
export type CoreEntry = { rank: number; attrs: CoreAttr[] };
const ATTR_KEYS: Attribute[] = ['str', 'dex', 'int', 'vit', 'wis', 'luk'];
/** 저장 값(예전 숫자 형식 포함)을 코어 항목으로. */
export const coreEntry = (v: number | { rank: number; attrs?: CoreAttr[] } | undefined): CoreEntry | undefined => v === undefined ? undefined : typeof v === 'number' ? { rank: v, attrs: [] } : { rank: v.rank || 0, attrs: v.attrs || [] };
export function rollCoreAttrs(rng: () => number): CoreAttr[] {
    const pool = [...ATTR_KEYS], out: CoreAttr[] = [];
    for (let i = 0; i < CORE_ATTRS.count && pool.length; i++) {
        const k = pool.splice(Math.floor(rng() * pool.length), 1)[0];
        out.push({ k, f: Math.round((CORE_ATTRS.min + rng() * (CORE_ATTRS.max - CORE_ATTRS.min)) * 10) / 10 });
    }
    return out;
}
/** 보스 코어가 주는 기본 능력치(칸 100% · 공명, 각성 포함). */
export function coreAttributes(s: Pick<State, 'bossCores' | 'coreSlot' | 'level'>) {
    const out: Partial<Record<Attribute, number>> = {};
    for (const id of ownedCores(s)) {
        const e = coreEntry(s.bossCores![id])!, m = coreAwaken(e.rank) * (s.coreSlot === id ? 1 : BOSS_CORE_RULES.resonance);
        for (const a of e.attrs) out[a.k] = (out[a.k] || 0) + Math.floor(Math.max(1, s.level || 1) * a.f * m);
    }
    return out;
}
export const coreAwaken = (rank: number) => 1 + Math.min(BOSS_CORE_RULES.awakenMax, Math.max(0, rank)) * BOSS_CORE_RULES.awakenStep;
export const ownedCores = (s: Pick<State, 'bossCores'>) => Object.keys(s.bossCores || {}).filter(id => BOSS_CORES[id]);
/** 세트 효과(보유 수 기준). */
export const BOSS_CORE_SET: { count: number; label: string; bonus: Partial<Record<CoreStat, number>> }[] = [
    { count: 2, label: '보스·사냥감 피해 +3%', bonus: { bossDamage: .03 } },
    { count: 4, label: '던전 주화 보너스 +10%', bonus: { dungeonGoldBonus: .1 } },
    { count: 6, label: '지속 피해 +5%', bonus: { dotBonus: .05 } },
    { count: 7, label: '보스·사냥감 피해 +5%', bonus: { bossDamage: .05 } },
];
/** 보스 코어 칸 · 공명 · 세트를 합친 능력치(합연산). */
export function coreStats(s: Pick<State, 'bossCores' | 'coreSlot'>) {
    const out: Partial<Record<CoreStat, number>> = {}, put = (k: CoreStat, v: number) => { out[k] = (out[k] || 0) + v; };
    for (const id of ownedCores(s)) {
        const rank = coreEntry(s.bossCores![id])!.rank, worn = s.coreSlot === id;
        for (const [k, v] of Object.entries(BOSS_CORES[id].bonus) as [CoreStat, number][]) {
            if (CORE_TURN_STATS.has(k)) { if (worn) put(k, v); continue; }
            put(k, v * coreAwaken(rank) * (worn ? 1 : BOSS_CORE_RULES.resonance));
        }
    }
    const n = ownedCores(s).length;
    for (const b of BOSS_CORE_SET) if (n >= b.count) for (const [k, v] of Object.entries(b.bonus) as [CoreStat, number][]) put(k, v);
    return out;
}
