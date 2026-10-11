/**
 * v3.202 보스 코어: 던전 보스 전리품은 장비가 아니라 '보스 코어' 칸에 끼는 코어입니다(기획안 2차안 F, 칠흑과 같은 규칙).
 * - 보스마다 코어 1종. 위력 · 별 · 장비 옵션 없이 그 보스의 기술을 이어받는 전용 효과 + v3.202 무작위 기본 능력치 2종(레벨 비례)이 있습니다.
 * - 같은 코어를 다시 얻으면 각성 +1(최대 awakenMax, 효과 단계당 +awakenStep), 다 찼으면 세계석 duplicatePearls.
 * - 보스 코어 칸에는 하나만 끼고, 끼지 않은 코어는 효과의 resonance(10%)를 줍니다(턴 연장 효과는 제외).
 * - 환생 · 승천해도 남습니다(금고 없음). v3.206 보유 수 세트 효과는 없앴습니다. 드롭 확률 · 천장은 서버 전용(ODDS.bossLoot).
 */
import type { Attribute, CombatStats, State } from '../types';

export const BOSS_CORE_RULES = { awakenMax: 5, awakenStep: .1, duplicatePearls: 5, resonance: .1 };
type CoreStat = keyof CombatStats;
export type BossCore = { name: string; boss: string; desc: string; bonus: Partial<Record<CoreStat, number>>; /** v3.208 무릉도장 코어: 이 층들을 처음 돌파하면 [얻기, 각성 1~5]. 없으면 지역 던전 코어(보너스 정복 · 상자). */ floors?: number[]; /** v3.276 칠흑 보스코어: 이 칠흑 보스 격파로만 얻고 각성합니다(칠흑 드롭 확률 · 천장, 상자 · 보너스 정복 없음). */ onyx?: string };
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
    // v3.208 무릉도장 코어(기획안 2차안 H): 층 첫 돌파로 확정 획득 · 각성(최고 기록 기준). 상자 · 보너스 정복에서는 나오지 않습니다.
    // 층은 기준 몸 측정(check-bosses --abyss-max, 중앙값 R10 32 · R30 41 · R50 48 · R100 53층)으로 정했습니다.
    abyssTrainee: { name: '수련생의 띠 코어', boss: '무릉 수련생', desc: '보스 · 사냥감 피해 +5%, 명중 +10%.', bonus: { bossDamage: .05, accuracy: .1 }, floors: [25, 28, 31, 34, 37, 40] },
    abyssMaster: { name: '사범의 권법 코어', boss: '무릉 사범', desc: '보스 · 사냥감 피해 +5%, 치명 피해 +15%p.', bonus: { bossDamage: .05, critDamage: .15 }, floors: [40, 42, 44, 46, 48, 50] },
    abyssMugong: { name: '무공의 일격 코어', boss: '무공', desc: '보스 · 사냥감 피해 +8%, 방어 관통 +15%p(관통 상한 안).', bonus: { bossDamage: .08, penetration: .15 }, floors: [50, 51, 52, 53, 54, 55] },
    // v3.276 칠흑 보스코어(기획: 윌 격파 보상). 칠흑 수집 9종에 들어갑니다(data/onyx ONYX_CORE_ID).
    onyxGrimoire: { name: '저주받은 마도서', boss: '윌', desc: '보스 · 사냥감 피해 +5%, 상태이상 저항 +10%p, 내 기절 · 침묵 · 감속 지속 +1턴.', bonus: { bossDamage: .05, statusResist: .1, controlBonus: 1 }, onyx: 'onyxWill' },
};
/**
 * v3.202 기본 능력치: 코어마다 받을 때 6종 중 count종을 무작위로 고르고, 각 배율 f(min~max)를 굴립니다.
 * 실제 값 = 지금 레벨 × f × 각성 배율(끼지 않은 코어는 × 공명 10%). f 0.2~1.0: Lv.100이면 20~100, Lv.30이면 6~30. 직업 조건 · 기록에는 세지 않습니다(능력치 효과에만).
 * 측정(기준 몸 히어로, 주 능력치 + 체질 기준): 7종 평균 굴림 × 전투력 1.11(환생 50) ≈ 칠흑 장신구 1개(×1.11), 최고 굴림 · 각성 5는 ×1.20.
 * f 1~5(레벨 × 100~500)는 7종 평균 ×1.30 · 최고 ×1.70으로 칠흑보다 훨씬 강해 낮췄습니다.
 */
export const CORE_ATTRS = { count: 2, min: .2, max: 1 };
export type CoreAttr = { k: Attribute; f: number };
export type CoreEntry = { rank: number; attrs: CoreAttr[]; forges?: number };
const ATTR_KEYS: Attribute[] = ['str', 'dex', 'int', 'vit', 'wis', 'luk'];
/** 저장 값(예전 숫자 형식 포함)을 코어 항목으로. */
export const coreEntry = (v: number | { rank: number; attrs?: CoreAttr[]; forges?: number } | undefined): CoreEntry | undefined => v === undefined ? undefined : typeof v === 'number' ? { rank: v, attrs: [] } : { rank: v.rank || 0, attrs: v.attrs || [], ...(v.forges ? { forges: v.forges } : {}) };
/** 배율 f 한 번 굴림(0.1 단위). */
export const rollCoreFactor = (rng: () => number) => Math.round((CORE_ATTRS.min + rng() * (CORE_ATTRS.max - CORE_ATTRS.min)) * 10) / 10;
/** 능력치 한 줄: exclude(다른 줄의 종류)를 뺀 6종 중 하나 + 배율. */
export function rollCoreAttr(rng: () => number, exclude: Attribute[] = []): CoreAttr {
    const pool = ATTR_KEYS.filter(k => !exclude.includes(k));
    return { k: pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))], f: rollCoreFactor(rng) };
}
export function rollCoreAttrs(rng: () => number): CoreAttr[] {
    const out: CoreAttr[] = [];
    for (let i = 0; i < CORE_ATTRS.count; i++) out.push(rollCoreAttr(rng, out.map(a => a.k)));
    return out;
}
/**
 * v3.203 코어 능력치 손보기(장비 재설정 · 재련과 같은 말):
 * - 재설정: 고른 줄의 종류와 배율을 새로 굴립니다(다른 줄과 겹치지 않음). 정수, 또는 던전 주화 상점(주화 DUNGEON_SHOP.coreReroll).
 * - 재련: 종류는 그대로 배율만 다시 굴립니다. 정수만.
 * v3.203 정수 비용은 재설정 · 재련 모두 base × growth^(이 코어를 정수로 손본 횟수). 환생 배율은 없습니다(환생해도 코어 능력치는 그대로라).
 * 세계석 resetPearls로 그 횟수를 0으로 되돌립니다(비용 초기화, 능력치는 그대로). 주화 재설정은 횟수를 세지 않습니다.
 */
export const CORE_FORGE = { base: 50, growth: 1.2, resetPearls: 100 };
export const coreForgeEssence = (forges = 0) => Math.ceil(CORE_FORGE.base * Math.pow(CORE_FORGE.growth, Math.max(0, Math.floor(forges))));
/** 보스 코어가 주는 기본 능력치(칸 100% · 공명, 각성 포함). */
export function coreAttributes(s: Pick<State, 'bossCores' | 'coreSlot' | 'level'>, regionResonance: number = BOSS_CORE_RULES.resonance) {
    const out: Partial<Record<Attribute, number>> = {};
    for (const id of ownedCores(s)) {
        const e = coreEntry(s.bossCores![id])!, m = coreAwaken(e.rank) * (s.coreSlot === id ? 1 : resonanceOf(id, regionResonance));
        for (const a of e.attrs) out[a.k] = (out[a.k] || 0) + Math.floor(Math.max(1, s.level || 1) * a.f * m);
    }
    return out;
}
export const coreAwaken = (rank: number) => 1 + Math.min(BOSS_CORE_RULES.awakenMax, Math.max(0, rank)) * BOSS_CORE_RULES.awakenStep;
/** v3.208 지역 던전 코어(보너스 정복 · 랜덤 상자에서 나옴)와 무릉도장 코어(층으로만). v3.276 칠흑 보스코어는 어느 쪽도 아닙니다. */
export const REGION_CORE_IDS = Object.keys(BOSS_CORES).filter(id => !BOSS_CORES[id].floors && !BOSS_CORES[id].onyx);
export const ABYSS_CORE_IDS = Object.keys(BOSS_CORES).filter(id => !!BOSS_CORES[id].floors);
/** 최고 층 기준으로 이 무릉 코어가 가져야 할 각성 단계(-1이면 아직 못 얻음). */
export const abyssCoreRank = (id: string, best: number) => (BOSS_CORES[id].floors || []).filter(f => best >= f).length - 1;
export const ownedCores = (s: Pick<State, 'bossCores'>) => Object.keys(s.bossCores || {}).filter(id => BOSS_CORES[id]);
/** v3.221 보유한 지역 보스 코어(무릉도장 코어 제외): 수와 각성 단계 합. 어둠의 추종자가 씁니다. */
export const regionCores = (s: Partial<Pick<State, 'bossCores'>>) => ownedCores({ bossCores: s.bossCores }).filter(id => REGION_CORE_IDS.includes(id));
export const regionCoreRanks = (s: Partial<Pick<State, 'bossCores'>>) => regionCores(s).reduce((n, id) => n + Math.min(BOSS_CORE_RULES.awakenMax, Math.max(0, coreEntry(s.bossCores![id])!.rank)), 0);
/** v3.221 끼지 않은 코어의 공명 비율: 지역 코어는 직업 특성(어둠의 추종자 30%)을 따르고, 무릉도장 · 칠흑 코어는 기본 10%. */
const resonanceOf = (id: string, regionResonance: number) => BOSS_CORES[id].floors || BOSS_CORES[id].onyx ? BOSS_CORE_RULES.resonance : regionResonance;
/** 보스 코어 칸 · 공명을 합친 능력치(합연산). */
export function coreStats(s: Pick<State, 'bossCores' | 'coreSlot'>, regionResonance: number = BOSS_CORE_RULES.resonance) {
    const out: Partial<Record<CoreStat, number>> = {}, put = (k: CoreStat, v: number) => { out[k] = (out[k] || 0) + v; };
    for (const id of ownedCores(s)) {
        const rank = coreEntry(s.bossCores![id])!.rank, worn = s.coreSlot === id;
        for (const [k, v] of Object.entries(BOSS_CORES[id].bonus) as [CoreStat, number][]) {
            if (CORE_TURN_STATS.has(k)) { if (worn) put(k, v); continue; }
            put(k, v * coreAwaken(rank) * (worn ? 1 : resonanceOf(id, regionResonance)));
        }
    }
    return out;
}
