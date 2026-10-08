/**
 * v3.188 던전 코인 · 코인샵 (docs 던전 개편 기획안 2-1).
 * 던전(지역 던전 · 무릉도장)은 처치마다 골드 · 경험치 · 숙련 · 장비를 주지 않고, 정복하는 순간 던전 코인을 한 번에 줍니다.
 * 코인은 처치 턴과 무관한 정복당 고정량이라, 보스를 빨리 잡는 빌드일수록 시간당 코인이 많습니다.
 * 첫 정복 보상(세계석 · 확정 장비), 무릉도장 층 세계석 · SP 이정표 · 5층마다 확정 장비는 그대로입니다.
 * 코인은 환생해도 남고 승천하면 정수처럼 사라집니다. 가격은 가안이라 측정 뒤 조정합니다.
 */
import type { DungeonMode } from './balance';

/** 지역 던전 정복 1회의 코인(난이도별). */
export const DUNGEON_COINS: Record<DungeonMode, number> = { normal: 1, hell: 3, nightmare: 6 };
/** 무릉도장 층 정복의 코인: 1 + ⌊층 ÷ abyssEvery⌋. */
export const ABYSS_COINS = { base: 1, abyssEvery: 10 };
export const abyssCoins = (depth: number) => ABYSS_COINS.base + Math.floor(Math.max(1, depth) / ABYSS_COINS.abyssEvery);

/** 코인샵 가격. */
export const DUNGEON_SHOP = {
    /** 칠흑 장신구 제작(그 칠흑 보스를 한 번 이상 처치해야 열림). */
    onyxCraft: 12000,
    /** 가진 칠흑 장신구 각성 +1(최대 ONYX.awakenMax). */
    onyxAwaken: 6000,
    /** 희귀 이상 확정 장비 상자(내 레벨 기준). */
    gearBox: 100,
    /** ‘포식자’(보스 피해) 옵션 각인: 고대 이상 장비의 옵션 한 줄을 포식자로 바꿉니다(장비당 한 줄). */
    hunterImprint: 2000,
} as const;
/** 각인권이 붙이는 옵션. */
export const HUNTER_AFFIX = 'hunter';
