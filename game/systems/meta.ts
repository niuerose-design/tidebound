import type { State } from '../types';
import { ECONOMY, researchRank } from '../data/economy';
import { MONSTER_TUNING, DUNGEON_TUNING, dungeonModeTier, OVER_TARGET, type XpTargetWall } from '../data/balance';
import { monsterExpAt, monsterGoldAt, tideLiftLevel } from '../data/world';
/** 환생 요구 레벨: 30에서 환생마다 +5(Lv.60까지), 그 뒤로는 환생마다 +1(v27.77 최대 Lv.100, 환생 46회에 도달). */
export const rebirthLevel = (s: Pick<State, 'rebirths'>) => {
    const early = 30 + s.rebirths * ECONOMY.rebirthLevelStep;
    if (early <= ECONOMY.rebirthLevelLateFrom) return early;
    const extra = s.rebirths - (ECONOMY.rebirthLevelLateFrom - 30) / ECONOMY.rebirthLevelStep;
    return Math.min(ECONOMY.rebirthLevelCap, ECONOMY.rebirthLevelLateFrom + Math.floor(extra * ECONOMY.rebirthLevelLateStep));
};
/** v27.55 환생 이 횟수부터 사냥터·던전의 레벨 제한이 없습니다(환생 횟수 조건은 그대로). */
export const LEVEL_GATE_FREE_REBIRTHS = 5;
/** v3.210 LV1 모험가 서약 중에는 레벨 제한을 보지 않습니다. */
export const levelGateOk = (s: Pick<State, 'level' | 'rebirths'> & Partial<Pick<State, 'vows'>>, level: number) => s.rebirths >= LEVEL_GATE_FREE_REBIRTHS || s.level >= level || !!s.vows?.lv1;
/** v3.23 순풍 기본 경험치 보너스(+50%). 실제 값은 tailwindExp. */
export const TAILWIND_EXP = .5;
/** 순풍 경험치 보너스: +50% + 초심자 보너스 10%p/단계. 정수 연산 뒤 나눠 0단계는 정확히 0.5입니다. */
export const tailwindExp = (s: Pick<State, 'permanent'>) => (TAILWIND_EXP * 10 + researchRank(s, 'tailwindSail')) / 10;
/** v3.23 순풍은 조건 없이 환생 뒤 목표 레벨까지 켜지고, 다른 경험치 보너스와 더합니다. */
export const tailwindActive = (s: Pick<State, 'rebirths' | 'level'>) => (s.rebirths || 0) > 0 && s.level < rebirthLevel(s);
/** v3.23 목표 레벨 너머 벽(OVER_TARGET). 배율은 고정입니다. */
export const xpWall = (s: Pick<State, 'rebirths'>): XpTargetWall => ({ target: rebirthLevel(s), growth: OVER_TARGET.growth });
export const rebirthReward = (s: State, bonus = 0) => Math.floor(s.level / 10) + Math.min(20, s.rebirths) + Math.floor(Math.sqrt(Math.max(0, s.rebirths - 20))) + Math.max(0, Math.floor(bonus));
/** 환생 세계석의 구성. 합계는 rebirthReward와 같습니다. */
export const rebirthRewardParts = (s: State, bonus = 0) => ({ level: Math.floor(s.level / 10), count: Math.min(20, s.rebirths) + Math.floor(Math.sqrt(Math.max(0, s.rebirths - 20))), bonus: Math.max(0, Math.floor(bonus)) });
export const rebirthAP = (s: State) => Math.min(ECONOMY.rebirthAPCap, s.rebirths);
export const tideLimit = (s: State) => Math.min(ECONOMY.tideCap, s.rebirths);
/** 던전 전투 난이도 단계. 무릉도장은 깊이 + 2, v27.70 일반 던전은 입장 때 고른 난이도(노말 0 · 헬 50 · 나이트메어 200). */
export const dungeonTier = (id: string, abyssDepth: number, mode?: string) => id === 'abyss' ? abyssDepth + 2 : dungeonModeTier(mode);
/** 지금 전투의 난이도: 던전은 던전 난이도(무릉도장 층·모드·랜덤게임 웨이브), 사냥터는 사냥터 난이도. */
export const encounterTier = (s: State) => s.dungeon ? dungeonTier(s.dungeon.id, s.dungeon.depth || 1, s.dungeon.mode) : (s.tide || 0);
/**
 * v27.68 일반 던전도 고른 난이도만큼 레벨이 올라갑니다(tideLiftLevel, v27.70부터 던전 난이도 기준). 보상·클리어 골드·과레벨 감쇠·클리어 드롭은 이 레벨 기준.
 * 고레벨일수록 던전이 상대적으로 약해지고 보상이 낮게 고정되던 것(환생 40회 기준 사냥터의 1/3~1/7)을 맞춥니다. 무릉도장은 자체 층 공식 그대로.
 */
export const dungeonLevelAt = (d: { id: string; level: number }, tier: number, playerLevel: number) => d.id === 'abyss' ? d.level : tideLiftLevel(d.level, tier, playerLevel);
/**
 * v3.21 골드 난이도 배율: 난이도 30까지는 그대로(1 + 0.5t), 그 위로는 √로 완만하게(16 + 1.5√(t−30)). 환생할수록 난이도 상한이 올라 골드가 끝없이 불어나
 * 스타포스 22성(수백억) 기획이 무너지던 것: 난이도 55 ×28.5 → ×23.5, 100 ×51 → ×28.5, 200 ×101 → ×35.6.
 */
const TIER_REWARD = { linearUntil: 30, perTier: .5, lateScale: 1.5 };
export const tierReward = (tier: number) => { const t = Math.max(0, tier), r = TIER_REWARD; return t <= r.linearUntil ? 1 + t * r.perTier : 1 + r.linearUntil * r.perTier + r.lateScale * Math.sqrt(t - r.linearUntil); };
/**
 * v3.21 경험치 난이도 배율: 난이도 30까지는 v3.11 그대로(체력 배율과 같은 꼴, 원킬하면 성장이 폭증하는 구간), 그 위로는 √로 꺾습니다(10.5 + 1.5√(t−30)).
 * 난이도 55 ×23.6 → ×18, 100 ×63 → ×23, 200 ×223 → ×30. 한 방에 잡는 한 난이도 상한(= 환생 횟수)을 따라 마리당 경험치가 끝없이 커지던 것을 막습니다.
 */
const TIER_EXP = { linearUntil: 30, lateScale: 1.5 };
const tierExpEarly = (t: number) => 1 + t * .3 + Math.pow(Math.max(0, t - 20), 2) * .005;
export const tierExp = (tier: number) => { const t = Math.max(0, tier); return t <= TIER_EXP.linearUntil ? tierExpEarly(t) : tierExpEarly(TIER_EXP.linearUntil) + TIER_EXP.lateScale * Math.sqrt(t - TIER_EXP.linearUntil); };
/** 처치 보상(골드 배율 적용 전). 전투 보상과 도감 화면 표시가 같은 식을 씁니다. */
export function killReward(f: { exp: number; gold: number; rewardMultiplier?: number }, tier: number, boss = false) {
    const mult = boss ? MONSTER_TUNING.bossRewardMultiplier : 1;
    const rewardScale = f.rewardMultiplier || 1;
    return { exp: Math.round(f.exp * mult * tierExp(tier) * rewardScale), gold: Math.round(f.gold * mult * tierReward(tier) * rewardScale) };
}
/** v27.35 던전 보상에 쓰는 층 배율 단계(무릉도장은 rewardTierCap에서 멈춤). */
export const dungeonRewardTier = (tier: number, id = 'abyss') => id === 'abyss' ? Math.min(tier, DUNGEON_TUNING.rewardTierCap) : tier;
/** 던전 처치 보상(배율 적용 전). 보스는 권장 레벨 몬스터 몇 마리분, 일반 웨이브는 몬스터 레벨을 권장 레벨 + 2까지만 셉니다. */
export function dungeonKillReward(f: { level: number; rewardMultiplier?: number }, dungeonLevel: number, tier: number, boss: boolean, id = 'abyss') {
    const rt = dungeonRewardTier(tier, id), t = tierReward(rt), tx = tierExp(rt);
    if (boss) return { exp: Math.round(monsterExpAt(dungeonLevel) * DUNGEON_TUNING.bossExpMonsters * tx), gold: Math.round(monsterGoldAt(dungeonLevel) * DUNGEON_TUNING.bossGoldMonsters * t) };
    const level = Math.min(f.level, dungeonLevel + DUNGEON_TUNING.expLevelOver), scale = f.rewardMultiplier || 1;
    return { exp: Math.round(monsterExpAt(level) * scale * tx), gold: Math.round(monsterGoldAt(level) * scale * t) };
}
export const dungeonExp = (f: { level: number; rewardMultiplier?: number }, dungeonLevel: number, tier: number, boss: boolean) => dungeonKillReward(f, dungeonLevel, tier, boss).exp;
/** 클리어 보너스 골드의 기준값(골드 배율·층 배율 적용 전): 권장 레벨 몬스터 clearGoldMonsters마리분. */
export const dungeonClearBase = (d: { level: number }) => monsterGoldAt(d.level) * DUNGEON_TUNING.clearGoldMonsters;
/**
 * 난이도 체력 배율. 체력당 경험치(tierExp ÷ tierHealth)는 난이도 0을 1로 두면 10~30에서 0.87~0.89로 거의 평평하고,
 * v3.21에서 30 위 경험치를 √로 꺾은 뒤로는 50에서 0.72, 100에서 0.31, 200에서 0.11로 떨어집니다.
 */
export const tierHealth = (tier: number) => 1 + tier * .35 + Math.pow(Math.max(0, tier - 20), 2) * .006;
export const tierAttack = (tier: number) => 1 + tier * .18 + Math.pow(Math.max(0, tier - 20), 2) * .002;
