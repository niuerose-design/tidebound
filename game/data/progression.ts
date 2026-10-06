import type { Attribute, Stats } from '../types';
/** v27.53 드롭 보너스 표시: 보너스 0.01 = 드롭 확률 +10%(balance.ts dropBonusScale 0.1과 같은 값). */
const dropPercent = (n: number) => Math.round(n * 1000);
/** 전직은 무료. 숙련과 SP는 동일 레벨을 올리고 중첩하지 않습니다. */
export const PROGRESSION = {
    statPerLevel: 5, startingStats: 5, baseAttribute: 5,
    startingSP: 0, skillSPCost: 1,
    baseAP: 6, fishComplete: 50, skillMastery: 120,
    skillMasteryMilestones: [120, 600, 2400, 8000],
    jobMastery: 150, advancedMastery: 75,
    /**
     * v27.95 숙련 인플레 조정: 차수별 요구 숙련 배율(인덱스 = 직업 차수 0~5). 1·2차는 그대로, 3차 ×3 · 4차 ×15 · 5차 ×50(직업 숙달),
     * 스킬 숙련 단계(계승 = 1단계)는 3차 ×3 · 4차 ×10 · 5차 ×25. 데이터에 적힌 값에 곱해 classes.ts·skills.ts에서 한 번만 적용합니다.
     */
    jobMasteryTierScale: [1, 1, 1, 3, 15, 50], skillMasteryTierScale: [1, 1, 1, 3, 10, 25],
    // Legacy rank includes the free base (rank 1 = growth Lv.0).
    maxSkillRank: 5, rankMultiplier: .08, rankPassive: .15, masteryChance: .015,
    maxMasteryPerVictory: 10,
    // v27.6 한계돌파: 실전 숙련을 다 채운 기술을 SP로 최대 성장 너머로 밀어 올립니다. 단계마다 성장 한 단계(+8% 배율·+15% 패시브·+1.5%p 발동) + 발동 +2.5%p 추가,
    // 마지막 단계는 장착 AP -1. 조건: 숙련 완료, 실전 숙련 수치가 마지막 이정표의 practiceMultiple배, SP.
    limitBreak: { max: 3, sp: [2, 3, 4], practiceMultiple: [2, 4, 8], chance: .025, apAtMax: 1, /** v27.28 레벨별 효과표·횟수 비례 패시브: 단계마다 양수 효과 +10%. */ passive: .1 },
    /** v27.81 도감 연구 보상은 SP만(골드 삭제). 1~3단계는 능력치·생태 연구만 오릅니다. */ bookSP: [0, 0, 0, 1, 1, 2], itemDropBonus: .005,
};
/** 능력치 1포인트당 효과. 전투 계산(stats.ts)과 능력치 설명이 모두 이 값을 씁니다. */
export const ATTRIBUTE_EFFECTS = {
    // v25.2: 기민의 속도를 줄이고 근력·지능의 공격을 올렸습니다(기민 +20이 근력 +20보다 처치 효율이 2.5배 높던 편중 완화).
    str: { attack: 2.3, defense: .25 },
    dex: { accuracy: .0025, evasion: .0015, speed: .15 },
    int: { magic: 2.8, mana: 1 },
    vit: { hp: 9, defense: .6, hpRegen: .3 },
    wis: { resist: 1.2, mana: 3, manaRegen: .25 },
    luk: { crit: .003, critDamage: .005, dropBonus: .001, goldBonus: .002 },
} as const;
const EFFECT_LABELS: Record<string, string> = { attack: '물리 공격', defense: '물리 방어', accuracy: '명중', evasion: '회피 수치', speed: '속도', magic: '마법 공격', mana: '최대 마나', hp: '최대 체력', resist: '마법 방어', manaRegen: '마나 회복', hpRegen: '턴당 체력 회복', crit: '치명타', critDamage: '치명 피해', dropBonus: '장비 드롭', goldBonus: '골드' };
const RATIO_EFFECTS = new Set(['accuracy', 'evasion', 'crit', 'critDamage', 'dropBonus', 'goldBonus']);
const describeEffects = (id: Attribute) => Object.entries(ATTRIBUTE_EFFECTS[id]).map(([k, n]) => `${EFFECT_LABELS[k]} +${k === 'dropBonus' ? `${dropPercent(n)}%` : RATIO_EFFECTS.has(k) ? `${Math.round(n * 1000) / 10}%p` : n}${k === 'evasion' ? '(50% 이후 점감 · 기민 외 소스는 합산 60%p까지)' : ''}`).join(' · ');
export const ATTRIBUTES: {
    id: Attribute;
    name: string;
    code: string;
    description: string;
}[] = [
    { id: 'str', name: '근력', code: 'STR', description: describeEffects('str') },
    { id: 'dex', name: '기민', code: 'DEX', description: describeEffects('dex') },
    { id: 'int', name: '지능', code: 'INT', description: describeEffects('int') },
    { id: 'vit', name: '체질', code: 'VIT', description: describeEffects('vit') },
    { id: 'wis', name: '정신', code: 'WIS', description: describeEffects('wis') },
    { id: 'luk', name: '행운', code: 'LUK', description: describeEffects('luk') },
];
/** 능력치 id → 한글 이름(근력·기민 …). */
export const ATTRIBUTE_NAMES = Object.fromEntries(ATTRIBUTES.map(a => [a.id, a.name])) as Record<Attribute, string>;
export const STAT_LABELS: Record<keyof Stats, string> = { masteryFlat: '처치당 숙련', rankFlat: '처치당 계급 처치', essenceBonus: '분해 정수 보너스', ornament: '장식', superCrit: '극 치명타', expBonus: '경험치 획득 증가', goldBonus: '골드 획득 보너스', dropBonus: '장비 드롭 보너스', rebirthBonus: '환생 세계석 보너스', harmony: '올라운드 밸런스 원시 피해', thorns: '반격(맞은 유형의 방어 비례)', diceTrim: '손가락 자르기(주사위 양 끝 좁힘)', swarmFind: '무리 조우 확률 증가', dotBonus: '지속 피해 증가', bleedBonus: '출혈 피해 증가', poisonBonus: '중독 피해 증가', burnBonus: '화상 피해 증가', guardAffinity: '방어 친화도', wardAffinity: '결계 친화도', healFocus: '회복 숙련', arcaneStrike: '마력 평타 확률', variantPower: '변종 기록', attrStr: '근력(원값)', attrDex: '기민(원값)', attrInt: '지능(원값)', attrVit: '체질(원값)', attrWis: '정신(원값)', attrLuk: '행운(원값)', variantFind: '변종 조우 확률 증가', goldenFind: '황금 개체 확률', statusResist: '상태이상 저항', chainBonus: '연속 행동 확률', bossDamage: '보스 피해', allStats: '모든 기본 능력', stunBonus: '기절 지속 추가', controlBonus: '침묵·감속 지속 추가', dotTurnsBonus: '지속 피해 턴 추가', poisonStackBonus: '중독 최대 중첩 추가', arcaneRatioBonus: '마력 평타 계수 추가', followUpBonus: '추가타 위력 추가', healBonus: '회복량 증가', executeBonus: '빈사 기준 추가', codexPower: '도감 기록', catchPower: '처치 기록', huntPower: '사냥 기록', goldPower: '보유 골드 기록', masteredPower: '숙달한 직업 기록', dungeonGoldBonus: '던전 골드 보너스', hp: '최대 체력', attack: '물리 공격', defense: '물리 방어', crit: '치명타', magic: '마법 공격', resist: '마법 방어', accuracy: '명중', evasion: '회피', critDamage: '치명 피해', speed: '속도', mana: '최대 마나', manaRegen: '턴당 마나 회복', hpRegen: '턴당 체력 회복', penetration: '방어 관통', lifesteal: '흡혈' };
export const PERCENT_STATS = new Set(['essenceBonus', 'statusResist', 'chainBonus', 'bossDamage', 'allStats', 'superCrit', 'expBonus', 'goldBonus', 'dropBonus', 'dungeonGoldBonus', 'crit', 'accuracy', 'evasion', 'critDamage', 'penetration', 'lifesteal', 'thorns', 'dotBonus', 'bleedBonus', 'poisonBonus', 'burnBonus', 'bleedBonus', 'poisonBonus', 'burnBonus', 'arcaneStrike', 'followUpBonus', 'healBonus', 'executeBonus', 'variantFind', 'goldenFind', 'swarmFind']);
/** 비율(0.123)을 퍼센트 문자열로: digits는 최대 소수 자리, signed면 +/− 부호를 붙입니다. */
export const percent = (n: number, digits = 1, signed = false) => `${signed && n > 0 ? '+' : ''}${Number((n * 100).toFixed(digits))}%`;
export const formatStat = (key: string, n: number) => PERCENT_STATS.has(key) ? `${Math.round(n * 1000) / 10}%` : `${Math.round(n * 10) / 10}`;
/** 능력치 표시 순서: 체력 → 물리·마법 공격 → 물리·마법 방어 → 속도 → 명중·회피 → 치명타. 평소에는 CORE만, 나머지는 상세보기. */
export const CORE_STATS = ['hp', 'mana', 'hpRegen', 'manaRegen', 'attack', 'magic', 'defense', 'resist', 'speed', 'penetration', 'accuracy', 'evasion', 'crit', 'superCrit'] as const;
export const DETAIL_STATS = ['statusResist', 'chainBonus', 'bossDamage', 'allStats', 'critDamage', 'lifesteal', 'expBonus', 'goldBonus', 'dropBonus', 'dungeonGoldBonus', 'rebirthBonus', 'harmony', 'thorns', 'dotBonus', 'bleedBonus', 'poisonBonus', 'burnBonus', 'stunBonus', 'controlBonus', 'dotTurnsBonus', 'poisonStackBonus', 'arcaneRatioBonus', 'followUpBonus', 'healBonus', 'executeBonus', 'variantFind', 'goldenFind'] as const;
/** 0보다 클 때만 상세 능력치에 보이는 항목. */
export const OPTIONAL_STATS = new Set(['thorns', 'dotBonus', 'bleedBonus', 'poisonBonus', 'burnBonus', 'arcaneStrike', 'stunBonus', 'controlBonus', 'dotTurnsBonus', 'poisonStackBonus', 'arcaneRatioBonus', 'followUpBonus', 'healBonus', 'executeBonus', 'variantFind', 'goldenFind']);
const STAT_ORDER: string[] = [...CORE_STATS, ...DETAIL_STATS];
/** v3.76 화면에 숫자로 보이지 않는 능력치(꽝 옵션 장식은 이름 앞 '반짝이는'으로만 보입니다). */
export const HIDDEN_STATS = new Set(['ornament']);
export const byStatOrder = <T extends [string, unknown]>(entries: T[]) => entries.filter(e => !HIDDEN_STATS.has(e[0])).sort((a, b) => (STAT_ORDER.indexOf(a[0]) + 1 || 99) - (STAT_ORDER.indexOf(b[0]) + 1 || 99));
/** 명중·회피는 적중 확률이 아닌 수치입니다. 실제 적중률은 상대 회피·속도와 함께 1~99.5%로 계산됩니다. */
export const RATING_STATS = new Set(['accuracy', 'evasion']);
/** 최종 능력치 표시: 확률·보너스는 %, 명중·회피는 수치, 치명 피해는 배율, 나머지는 고정 수치. */
export function statDisplay(key: string, n: number) {
    if (RATING_STATS.has(key)) return `${Math.round(n * 1000) / 10}`;
    if (key === 'critDamage') return `×${n.toFixed(2)}`;
    if (key === 'rebirthBonus') return `+${Math.round(n * 10) / 10}`;
    if (key === 'dropBonus') return `+${dropPercent(n)}%`;
    if (['expBonus', 'goldBonus', 'dungeonGoldBonus'].includes(key)) return `+${Math.round(n * 1000) / 10}%`;
    return formatStat(key, n);
}
/** 증감 표시(장비·스킬 보너스): 명중·회피는 수치, 확률형은 %p, 나머지는 formatStat. */
export function statDeltaDisplay(key: string, n: number) {
    const sign = n >= 0 ? '+' : '−', v = Math.abs(n);
    if (RATING_STATS.has(key)) return `${sign}${Math.round(v * 1000) / 10}`;
    if (key === 'dropBonus') return `${sign}${dropPercent(v)}%`;
    if (['crit', 'critDamage', 'penetration', 'lifesteal', 'thorns', 'dotBonus', 'arcaneStrike', 'followUpBonus', 'executeBonus', 'goldenFind'].includes(key)) return `${sign}${Math.round(v * 1000) / 10}%p`;
    return `${sign}${formatStat(key, v)}`;
}
export const emptyAttributes = (): Record<Attribute, number> => ({ str: 0, dex: 0, int: 0, vit: 0, wis: 0, luk: 0 });
