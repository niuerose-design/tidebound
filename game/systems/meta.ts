import type { State } from '../types';
import { RANDOM_GAME, randomGameTier } from '../data/random-game';
import { ECONOMY, researchRank } from '../data/economy';
import { MONSTER_TUNING, DUNGEON_TUNING, dungeonModeTier } from '../data/balance';
import { fishExpAt, fishGoldAt, tideLiftLevel } from '../data/world';
/** 환생 요구 레벨: 30에서 환생마다 +5(Lv.60까지), 그 뒤로는 환생마다 +1(v27.77 최대 Lv.100, 환생 46회에 도달). */
export const rebirthLevel = (s: Pick<State, 'rebirths'>) => {
    const early = 30 + s.rebirths * ECONOMY.rebirthLevelStep;
    if (early <= ECONOMY.rebirthLevelLateFrom) return early;
    const extra = s.rebirths - (ECONOMY.rebirthLevelLateFrom - 30) / ECONOMY.rebirthLevelStep;
    return Math.min(ECONOMY.rebirthLevelCap, ECONOMY.rebirthLevelLateFrom + Math.floor(extra * ECONOMY.rebirthLevelLateStep));
};
/** v27.55 환생 이 횟수부터 사냥터·던전의 레벨 제한이 없습니다(환생 횟수 조건은 그대로). */
export const LEVEL_GATE_FREE_REBIRTHS = 5;
export const levelGateOk = (s: Pick<State, 'level' | 'rebirths'>, level: number) => s.rebirths >= LEVEL_GATE_FREE_REBIRTHS || s.level >= level;
/** 요구 레벨을 넘겨 오래 버틴 모험의 추가 세계석: 초과 레벨² ÷ 40. */
export const deepVoyagePearls = (s: State) => { const over = s.level - rebirthLevel(s); return over > 0 ? Math.floor(over * over / 40) : 0; };
/** 순풍의 기본 조건 폭(요구 레벨+5)과 기본 경험치 보너스(+50%). 실제 값은 tailwindWindow·tailwindExp를 쓰세요. */
export const TAILWIND_WINDOW = 5, TAILWIND_EXP = .5, DEEP_VOYAGE_LEVEL = 100;
/** 순풍 경험치 보너스: +50% + 순풍의 깃털 10%p/단계. 정수 연산 뒤 나눠 0단계는 정확히 0.5입니다. */
export const tailwindExp = (s: Pick<State, 'permanent'>) => (TAILWIND_EXP * 10 + researchRank(s, 'tailwindSail')) / 10;
/** 순풍 조건 폭: 요구 레벨 + 5 + 바람목 넓히기 1레벨/단계. */
export const tailwindWindow = (s: Pick<State, 'permanent'>) => TAILWIND_WINDOW + researchRank(s, 'tailwindWindow');
/** 이번 환생으로 다음 생에 얻는 효과. Lv.100 완주는 깊은 모험, 요구 레벨 + 순풍 조건 폭 이내는 순풍. */
export const nextLifeBonus = (s: State): 'deep' | 'tailwind' | null => s.level >= DEEP_VOYAGE_LEVEL ? 'deep' : s.level <= rebirthLevel(s) + tailwindWindow(s) ? 'tailwind' : null;
export const tailwindActive = (s: State) => s.lifeBonus === 'tailwind' && s.level < rebirthLevel(s);
export const rebirthReward = (s: State, bonus = 0) => deepVoyagePearls(s) + Math.floor(s.level / 10) + Math.min(20, s.rebirths) + Math.floor(Math.sqrt(Math.max(0, s.rebirths - 20))) + Math.max(0, Math.floor(bonus));
/** 환생 세계석의 구성. 합계는 rebirthReward와 같습니다. */
export const rebirthRewardParts = (s: State, bonus = 0) => ({ level: Math.floor(s.level / 10), count: Math.min(20, s.rebirths) + Math.floor(Math.sqrt(Math.max(0, s.rebirths - 20))), bonus: Math.max(0, Math.floor(bonus)), deep: deepVoyagePearls(s) });
export const rebirthAP = (s: State) => Math.min(ECONOMY.rebirthAPCap, s.rebirths);
export const tideLimit = (s: State) => Math.min(ECONOMY.tideCap, s.rebirths);
/** 던전 전투 난이도 단계. 무릉도장은 깊이 + 2, v27.70 일반 던전은 입장 때 고른 난이도(노말 0 · 헬 50 · 나이트메어 200). */
export const dungeonTier = (id: string, abyssDepth: number, mode?: string) => id === 'abyss' ? abyssDepth + 2 : dungeonModeTier(mode);
/** 지금 전투의 난이도: 던전은 던전 난이도(무릉도장 층·모드·랜덤게임 웨이브), 사냥터는 사냥터 난이도. */
/** v27.82 랜덤게임은 2 × 웨이브(randomGameTier). */
export const encounterTier = (s: State) => s.dungeon ? (s.dungeon.id === RANDOM_GAME.id ? randomGameTier(s.dungeon.wave) : dungeonTier(s.dungeon.id, s.dungeon.depth || 1, s.dungeon.mode)) : (s.tide || 0);
/**
 * v27.68 일반 던전도 고른 난이도만큼 레벨이 올라갑니다(tideLiftLevel, v27.70부터 던전 난이도 기준). 보상·클리어 골드·과레벨 감쇠·클리어 드롭은 이 레벨 기준.
 * 고레벨일수록 던전이 상대적으로 약해지고 보상이 낮게 고정되던 것(환생 40회 기준 사냥터의 1/3~1/7)을 맞춥니다. 무릉도장은 자체 층 공식 그대로.
 */
export const dungeonLevelAt = (d: { id: string; level: number }, tier: number, playerLevel: number) => d.id === 'abyss' ? d.level : tideLiftLevel(d.level, tier, playerLevel);
export const tierReward = (tier: number) => 1 + tier * .5;
/** v27.77 경험치의 난이도 배율. 골드(tierReward, 1 + 0.5t)와 분리해 1 + 0.1√t로 눌렀습니다: 난이도 17 ×1.41, 100 ×2. 전에는 난이도 100에서 ×51이라 19마리면 환생이었습니다. */
export const tierExp = (tier: number) => 1 + .1 * Math.sqrt(Math.max(0, tier));
// v27.74 사냥터·던전 난이도의 처치 숙련 배율(v27.21 tierMastery, 1 + 0.3×난이도)을 없앴습니다. 처치 숙련은 난이도와 무관하게 기본 1이고,
// 난이도 5 이상의 숙련은 숙련의 까미가 맡습니다(난이도 10 기준 까미 기대 숙련이 처치 숙련의 수십 배라 배율의 몫은 몇 %에 불과했습니다).
/** 처치 보상(골드 배율 적용 전). 전투 보상과 도감 화면 표시가 같은 식을 씁니다. */
export function catchReward(f: { exp: number; gold: number; rewardMultiplier?: number }, tier: number, boss = false) {
    const mult = boss ? MONSTER_TUNING.bossRewardMultiplier : 1;
    const rewardScale = f.rewardMultiplier || 1;
    return { exp: Math.round(f.exp * mult * tierExp(tier) * rewardScale), gold: Math.round(f.gold * mult * tierReward(tier) * rewardScale) };
}
/** v27.35 던전 보상에 쓰는 층 배율 단계(무릉도장은 rewardTierCap에서 멈춤). */
export const dungeonRewardTier = (tier: number, id = 'abyss') => id === 'abyss' ? Math.min(tier, DUNGEON_TUNING.rewardTierCap) : tier;
/** 던전 처치 보상(배율 적용 전). 보스는 권장 레벨 몬스터 몇 마리분, 일반 웨이브는 몬스터 레벨을 권장 레벨 + 2까지만 셉니다. */
export function dungeonCatchReward(f: { level: number; rewardMultiplier?: number }, dungeonLevel: number, tier: number, boss: boolean, id = 'abyss') {
    const rt = dungeonRewardTier(tier, id), t = tierReward(rt), tx = tierExp(rt);
    if (boss) return { exp: Math.round(fishExpAt(dungeonLevel) * DUNGEON_TUNING.bossExpFish * tx), gold: Math.round(fishGoldAt(dungeonLevel) * DUNGEON_TUNING.bossGoldFish * t) };
    const level = Math.min(f.level, dungeonLevel + DUNGEON_TUNING.expLevelOver), scale = f.rewardMultiplier || 1;
    return { exp: Math.round(fishExpAt(level) * scale * tx), gold: Math.round(fishGoldAt(level) * scale * t) };
}
export const dungeonExp = (f: { level: number; rewardMultiplier?: number }, dungeonLevel: number, tier: number, boss: boolean) => dungeonCatchReward(f, dungeonLevel, tier, boss).exp;
/** 클리어 보너스 골드의 기준값(골드 배율·층 배율 적용 전): 권장 레벨 몬스터 clearGoldFish마리분. */
export const dungeonClearBase = (d: { level: number }) => fishGoldAt(d.level) * DUNGEON_TUNING.clearGoldFish;
/** 이 몬스터로 해당 무리 규모를 고를 수 있는지 (도감 처치 수 기준). */
export const tierHealth = (tier: number) => 1 + tier * .35 + Math.pow(Math.max(0, tier - 20), 2) * .006;
export const tierAttack = (tier: number) => 1 + tier * .18 + Math.pow(Math.max(0, tier - 20), 2) * .002;
