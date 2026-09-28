import type { State } from '../types';
import { ECONOMY } from '../data/economy';
import { MONSTER_TUNING } from '../data/balance';
import { SWARM_SIZES, SWARM_UNLOCK } from '../data/world';
export const rebirthLevel = (s: State) => Math.min(ECONOMY.rebirthLevelCap, 30 + s.rebirths * ECONOMY.rebirthLevelStep);
/** 요구 레벨을 넘겨 오래 버틴 항해의 추가 진주: 초과 레벨² ÷ 40. */
export const deepVoyagePearls = (s: State) => { const over = s.level - rebirthLevel(s); return over > 0 ? Math.floor(over * over / 40) : 0; };
export const TAILWIND_WINDOW = 5, TAILWIND_EXP = .5, DEEP_VOYAGE_LEVEL = 100;
/** 이번 환생으로 다음 생에 얻는 효과. Lv.100 완주는 깊은 항해, 요구 레벨+5 이내는 순풍. */
export const nextLifeBonus = (s: State): 'deep' | 'tailwind' | null => s.level >= DEEP_VOYAGE_LEVEL ? 'deep' : s.level <= rebirthLevel(s) + TAILWIND_WINDOW ? 'tailwind' : null;
export const tailwindActive = (s: State) => s.lifeBonus === 'tailwind' && s.level < rebirthLevel(s);
export const rebirthReward = (s: State, bonus = 0) => deepVoyagePearls(s) + Math.floor(s.level / 10) + Math.min(20, s.rebirths) + Math.floor(Math.sqrt(Math.max(0, s.rebirths - 20))) + Math.max(0, Math.floor(bonus));
export const rebirthAP = (s: State) => Math.min(ECONOMY.rebirthAPCap, s.rebirths);
export const tideLimit = (s: State) => Math.min(ECONOMY.tideCap, s.rebirths);
/** 던전 전투 난이도 단계. 무한 심연은 깊이 + 2, 일반 던전은 0. */
export const dungeonTier = (id: string, abyssDepth: number) => id === 'abyss' ? abyssDepth + 2 : 0;
export const encounterTier = (s: State) => s.dungeon ? dungeonTier(s.dungeon.id, s.dungeon.depth || 1) : (s.tide || 0);
export const tierReward = (tier: number) => 1 + tier * .5;
/** 포획 보상(골드 배율 적용 전). 전투 보상과 도감 화면 표시가 같은 식을 씁니다. */
export function catchReward(f: { exp: number; gold: number; rewardMultiplier?: number }, tier: number, boss = false) {
    const mult = boss ? MONSTER_TUNING.bossRewardMultiplier : 1;
    const rewardScale = f.rewardMultiplier || 1;
    return { exp: Math.round(f.exp * mult * tierReward(tier) * rewardScale), gold: Math.round(f.gold * mult * tierReward(tier) * rewardScale) };
}
/** 이 어종으로 해당 무리 규모를 고를 수 있는지 (도감 포획 수 기준). */
export const swarmUnlocked = (s: State, fishId: string, size: number) => (s.book[fishId] || 0) >= (SWARM_UNLOCK[size] ?? Infinity);
/** 지금 적용되는 무리 규모. 던전 밖에서 집중 사냥 중이고, 선택한 규모 이하에서 해금된 가장 큰 값. */
export function activeSwarm(s: State) {
    if (s.dungeon || !s.target) return 1;
    const want = s.swarm || 1;
    return [...SWARM_SIZES].reverse().find(n => n <= want && swarmUnlocked(s, s.target!, n)) || 1;
}
export const tierHealth = (tier: number) => 1 + tier * .35 + Math.pow(Math.max(0, tier - 20), 2) * .006;
export const tierAttack = (tier: number) => 1 + tier * .18 + Math.pow(Math.max(0, tier - 20), 2) * .002;
