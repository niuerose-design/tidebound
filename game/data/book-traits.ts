/** 몬스터 도감 보상: 생태 연구, 장소 테마, 지역 연구, 정보 공개 기준. */
import type { CombatStats } from '../types';

type StatBonus = Partial<CombatStats>;

/**
 * 생태 연구: 2단계(500회)부터 해당 몬스터를 상대할 때만 적용합니다.
 * v27.81 성향 능력치(체력·공격 등 고정값)는 없애고 생태 연구에 몰았습니다. 2~6단계에 단계별로 더해 최대 주는 피해 +50% · 받는 공격 피해 -25%.
 * 뒤 단계일수록 크게(5·5·10·10·20%) 올라 5·6단계(난이도 20·50 조건)가 초장기 목표가 됩니다.
 */
export const BOOK_ECOLOGY = { fromStage: 2, dealt: [.05, .05, .10, .10, .20], taken: [.025, .025, .05, .05, .10] };

/** 처치 50회: 해당 몬스터의 성향·스킬·능력치 정보를 전투와 도감에 공개합니다. */
export const BOOK_REVEAL = 50;

/** 지역 테마 보너스: 지역의 모든 종을 완성(50회)하면 적용됩니다. AP +1은 별도로 유지됩니다. */
export const REGION_THEMES: Record<string, { label: string; add?: StatBonus; scale?: Partial<Record<'hp' | 'attack' | 'magic' | 'defense' | 'resist', number>>; rareSpawn?: number }> = {
    brook: { label: '경험치 +3%', add: { expBonus: .03 } },
    bay: { label: '골드 +5%', add: { goldBonus: .05 } },
    reef: { label: '치명 피해 +5%p', add: { critDamage: .05 } },
    kelp: { label: '희귀어 출현 +10%', rareSpawn: .1 },
    wreck: { label: '장비 드롭 확률 +5%', add: { dropBonus: .005 } },
    volcanic: { label: '방어 관통 +2%p', add: { penetration: .02 } },
    trench: { label: '최대 체력 +3%', scale: { hp: 1.03 } },
    moon: { label: '턴당 마나 회복 +0.5', add: { manaRegen: .5 } },
    starfall: { label: '체력·공격·방어 +2%', scale: { hp: 1.02, attack: 1.02, magic: 1.02, defense: 1.02, resist: 1.02 } },
    duskVents: { label: '방어 관통 +1%p · 치명 피해 +3%p', add: { penetration: .01, critDamage: .03 } },
};

/**
 * v27.80 지역 연구: 지역(리스항구 등)의 모든 몬스터가 연구 4·5·6단계 이상이면 지역 연구 1·2·3단계.
 * add는 단계마다 더하는 고정값, scale은 단계마다 더하는 배율(+3%면 .03 → 3단계 ×1.09).
 */
export const REGION_RESEARCH_FROM = 4;
export const REGION_RESEARCH_MAX = 3;
export const REGION_RESEARCH: Record<string, { label: string; add?: StatBonus; scale?: Partial<Record<'hp' | 'attack' | 'magic' | 'defense' | 'resist', number>> }> = {
    '리스항구': { label: '경험치·골드 +2%', add: { expBonus: .02, goldBonus: .02 } },
    '헤네시스': { label: '명중 +1%p · 치명 확률 +1%p', add: { accuracy: .01, crit: .01 } },
    '페리온': { label: '최대 체력 +3% · 물리 방어 +2%', scale: { hp: .03, defense: .02 } },
    '엘리니아': { label: '마법 공격 +3% · 턴당 마나 회복 +0.5', add: { manaRegen: .5 }, scale: { magic: .03 } },
    '커닝시티': { label: '회피 +0.5%p · 치명 피해 +3%p', add: { evasion: .005, critDamage: .03 } },
};
