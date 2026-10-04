/** 몬스터 도감 보상: 성향별 연구 능력치, 생태 연구, 지역 테마, 정보 공개 기준. */
import type { CombatStats } from '../types';

export type BookTraitGroup = 'swift' | 'armored' | 'arcane' | 'venom' | 'silencer' | 'controller' | 'frenzy' | 'boss';
type StatBonus = Partial<CombatStats>;

/**
 * 연구 단계(50·500·2500·10000회)마다 몬스터 성향에 맞는 능력치를 줍니다.
 * 직업·환생 배율 전에 더하는 고정값입니다(이전의 공격·마법 +1과 같은 위치).
 */
export const BOOK_TRAITS: Record<BookTraitGroup, { name: string; perStage: StatBonus }> = {
    swift: { name: '날쌘 개체', perStage: { attack: 2, accuracy: .003 } },
    armored: { name: '단단한 껍질', perStage: { defense: 1, penetration: .0025 } },
    arcane: { name: '마력 생물', perStage: { magic: 2, resist: .5 } },
    venom: { name: '독성 생물', perStage: { hp: 12, lifesteal: .001 } },
    silencer: { name: '침묵하는 생물', perStage: { mana: 3, manaRegen: .1 } },
    controller: { name: '대지 제어자', perStage: { speed: .25, resist: 1 } },
    frenzy: { name: '광폭한 짐승', perStage: { attack: 1, critDamage: .015 } },
    boss: { name: '던전 보스', perStage: { attack: 1, magic: 1, hp: 5 } },
};
/** 적 전투 성향 → 도감 보상 성향. 보스 몬스터는 성향과 관계없이 boss입니다. */
export const PROFILE_TRAIT: Record<string, BookTraitGroup> = {
    swift: 'swift', armored: 'armored', arcane: 'arcane', venom: 'venom', silencer: 'silencer', controller: 'controller', frenzy: 'frenzy',
    stormEel: 'arcane', venomBoss: 'venom', arcaneBoss: 'arcane', boss: 'boss',
};

/**
 * 생태 연구: 2단계(500회)부터 해당 몬스터를 상대할 때만 적용합니다.
 * 달성한 단계마다(2·3·4단계) 주는 피해 +2%, 받는 공격 피해 -1% → 최대 +6% / -3%.
 */
export const BOOK_ECOLOGY = { fromStage: 2, dealtPerStage: .02, takenPerStage: .01 };

/** 처치 50회: 해당 몬스터의 성향·스킬·능력치 정보를 전투와 도감에 공개합니다. */
export const BOOK_REVEAL = 50;

/** 지역 테마 보너스: 지역의 모든 종을 완성(50회)하면 적용됩니다. AP +1은 별도로 유지됩니다. */
export const REGION_THEMES: Record<string, { label: string; add?: StatBonus; scale?: Partial<Record<'hp' | 'attack' | 'magic' | 'defense' | 'resist', number>>; rareSpawn?: number }> = {
    brook: { label: '경험치 +3%', add: { expBonus: .03 } },
    bay: { label: '골드 +5%', add: { goldBonus: .05 } },
    reef: { label: '치명 피해 +5%p', add: { critDamage: .05 } },
    kelp: { label: '희귀어 출현 +10%', rareSpawn: .1 },
    wreck: { label: '장비 드롭 +0.5%p', add: { dropBonus: .005 } },
    volcanic: { label: '방어 관통 +2%p', add: { penetration: .02 } },
    trench: { label: '최대 체력 +3%', scale: { hp: 1.03 } },
    moon: { label: '턴당 마나 회복 +0.5', add: { manaRegen: .5 } },
    starfall: { label: '체력·공격·방어 +2%', scale: { hp: 1.02, attack: 1.02, magic: 1.02, defense: 1.02, resist: 1.02 } },
    duskVents: { label: '방어 관통 +1%p · 치명 피해 +3%p', add: { penetration: .01, critDamage: .03 } },
};
