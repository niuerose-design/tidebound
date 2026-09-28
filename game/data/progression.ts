import type { Attribute, Stats } from '../types';
/** 전직은 무료. 숙련과 SP는 동일 레벨을 올리고 중첩하지 않습니다. */
export const PROGRESSION = {
    statPerLevel: 4, startingStats: 4, baseAttribute: 5, attributeGrowthEvery: 5,
    startingSP: 0, spPerPeakLevel: 0, skillSPCost: 1,
    baseAP: 6, fishComplete: 50, skillMastery: 120,
    skillMasteryMilestones: [120, 600, 2400, 8000],
    jobMastery: 150, advancedMastery: 75,
    // Legacy rank includes the free base (rank 1 = growth Lv.0).
    maxSkillRank: 5, rankMultiplier: .08, rankPassive: .15, masteryChance: .015,
    maxMasteryPerVictory: 10,
    bookSP: [0, 0, 0, 1], bookGold: [200, 1000, 5000, 15000], itemDropBonus: .005,
};
export const ATTRIBUTES: {
    id: Attribute;
    name: string;
    code: string;
    description: string;
}[] = [
    { id: 'str', name: '근력', code: 'STR', description: '물리 공격 +2 · 물리 방어 +0.25' },
    { id: 'dex', name: '기민', code: 'DEX', description: '명중 +0.4%p · 회피 수치 +0.2%p(50% 이후 점감) · 속도 +0.5' },
    { id: 'int', name: '지능', code: 'INT', description: '마법 공격 +2.4 · 최대 마나 +1' },
    { id: 'vit', name: '체질', code: 'VIT', description: '최대 체력 +9 · 물리 방어 +0.6' },
    { id: 'wis', name: '정신', code: 'WIS', description: '마법 방어 +1.2 · 최대 마나 +3 · 마나 회복 +0.15' },
    { id: 'luk', name: '행운', code: 'LUK', description: '치명타 +0.3%p · 치명 피해 +0.5%p · 장비 드롭 +0.1%p · 골드 +0.2%p' },
];
export const STAT_LABELS: Record<keyof Stats, string> = { expBonus: '경험치 획득 증가', goldBonus: '골드 획득 보너스', dropBonus: '장비 드롭 보너스', rebirthBonus: '환생 진주 보너스', dungeonGoldBonus: '던전 골드 보너스', hp: '최대 체력', attack: '물리 공격', defense: '물리 방어', crit: '치명타', magic: '마법 공격', resist: '마법 방어', accuracy: '명중', evasion: '회피', critDamage: '치명 피해', speed: '속도', mana: '최대 마나', manaRegen: '턴당 마나 회복', penetration: '방어 관통', lifesteal: '흡혈' };
export const PERCENT_STATS = new Set(['expBonus', 'goldBonus', 'dropBonus', 'dungeonGoldBonus', 'crit', 'accuracy', 'evasion', 'critDamage', 'penetration', 'lifesteal']);
export const formatStat = (key: string, n: number) => PERCENT_STATS.has(key) ? `${Math.round(n * 1000) / 10}%` : `${Math.round(n * 10) / 10}`;
export const emptyAttributes = (): Record<Attribute, number> => ({ str: 0, dex: 0, int: 0, vit: 0, wis: 0, luk: 0 });
