import type { State } from '../types';
import { ECONOMY } from '../data/economy';
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
export const encounterTier = (s: State) => s.dungeon?.id === 'abyss' ? (s.dungeon.depth || 1) + 2 : s.dungeon ? 0 : (s.tide || 0);
export const tierReward = (tier: number) => 1 + tier * .5;
export const tierHealth = (tier: number) => 1 + tier * .35 + Math.pow(Math.max(0, tier - 20), 2) * .006;
export const tierAttack = (tier: number) => 1 + tier * .18 + Math.pow(Math.max(0, tier - 20), 2) * .002;
