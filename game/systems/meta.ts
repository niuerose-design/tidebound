import type { State } from '../types';
import { ECONOMY, researchRank } from '../data/economy';
import { MONSTER_TUNING, DUNGEON_TUNING } from '../data/balance';
import { fishExpAt, fishGoldAt } from '../data/world';
export const rebirthLevel = (s: State) => Math.min(ECONOMY.rebirthLevelCap, 30 + s.rebirths * ECONOMY.rebirthLevelStep);
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
/** 던전 전투 난이도 단계. 무릉도장은 깊이 + 2, 일반 던전은 0. */
export const dungeonTier = (id: string, abyssDepth: number) => id === 'abyss' ? abyssDepth + 2 : 0;
/** 잠든 힘 봉인 중에는 일반 사냥터 난이도가 0으로 고정됩니다. */
export const encounterTier = (s: State) => s.dungeon ? dungeonTier(s.dungeon.id, s.dungeon.depth || 1) : s.vows?.seal ? 0 : (s.tide || 0);
/** 사냥터 난이도 1단계당 처치 숙련 +30%. */
const TIDE_MASTERY_PER_TIER = .3;
export const tierReward = (tier: number) => 1 + tier * .5;
/** v27.21 사냥터 난이도별 처치 숙련 배율. 적이 커져 시간당 처치가 줄어드는 만큼을 숙련으로 돌려줍니다. */
export const tierMastery = (tier: number) => 1 + tier * TIDE_MASTERY_PER_TIER;
/** 처치 보상(골드 배율 적용 전). 전투 보상과 도감 화면 표시가 같은 식을 씁니다. */
export function catchReward(f: { exp: number; gold: number; rewardMultiplier?: number }, tier: number, boss = false) {
    const mult = boss ? MONSTER_TUNING.bossRewardMultiplier : 1;
    const rewardScale = f.rewardMultiplier || 1;
    return { exp: Math.round(f.exp * mult * tierReward(tier) * rewardScale), gold: Math.round(f.gold * mult * tierReward(tier) * rewardScale) };
}
/** v27.35 던전 보상에 쓰는 층 배율 단계(무릉도장은 rewardTierCap에서 멈춤). */
export const dungeonRewardTier = (tier: number) => Math.min(tier, DUNGEON_TUNING.rewardTierCap);
/** 던전 처치 보상(배율 적용 전). 보스는 권장 레벨 몬스터 몇 마리분, 일반 웨이브는 몬스터 레벨을 권장 레벨 + 2까지만 셉니다. */
export function dungeonCatchReward(f: { level: number; rewardMultiplier?: number }, dungeonLevel: number, tier: number, boss: boolean) {
    const t = tierReward(dungeonRewardTier(tier));
    if (boss) return { exp: Math.round(fishExpAt(dungeonLevel) * DUNGEON_TUNING.bossExpFish * t), gold: Math.round(fishGoldAt(dungeonLevel) * DUNGEON_TUNING.bossGoldFish * t) };
    const level = Math.min(f.level, dungeonLevel + DUNGEON_TUNING.expLevelOver), scale = (f.rewardMultiplier || 1) * t;
    return { exp: Math.round(fishExpAt(level) * scale), gold: Math.round(fishGoldAt(level) * scale) };
}
export const dungeonExp = (f: { level: number; rewardMultiplier?: number }, dungeonLevel: number, tier: number, boss: boolean) => dungeonCatchReward(f, dungeonLevel, tier, boss).exp;
/** 클리어 보너스 골드의 기준값(골드 배율·층 배율 적용 전): 권장 레벨 몬스터 clearGoldFish마리분. */
export const dungeonClearBase = (d: { level: number }) => fishGoldAt(d.level) * DUNGEON_TUNING.clearGoldFish;
/** 이 몬스터로 해당 무리 규모를 고를 수 있는지 (도감 처치 수 기준). */
export const tierHealth = (tier: number) => 1 + tier * .35 + Math.pow(Math.max(0, tier - 20), 2) * .006;
export const tierAttack = (tier: number) => 1 + tier * .18 + Math.pow(Math.max(0, tier - 20), 2) * .002;
