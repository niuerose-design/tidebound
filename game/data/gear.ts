import type { Stats } from '../types';

/**
 * v22 장비 옵션.
 *
 * - 등급 번호(0~6)가 곧 붙는 옵션 수입니다. 일반 0개 · 희귀 1 · 영웅 2 · 전설 3 · 신화 4 · 고대 5 · 태초 6.
 * - 능력치 옵션은 기존 전투 수치만 올립니다. 고정 수치 옵션은 장비 위력에 비례하고, 비율 옵션은 고정 폭입니다.
 * - 양날 옵션은 큰 이득과 손해를 함께 줍니다.
 * - 규칙 옵션은 영웅(3) 이상에서 장비당 최대 1개. 기존 기술 규칙의 숫자 하나만 바꾸며, 같은 규칙은 cap까지만 합산합니다.
 * - 드롭한 낚시터·던전(origin)에 따라 특정 옵션이 잘 나옵니다.
 */
export type GearStat = keyof Stats;
export type AffixDef = {
    id: string;
    name: string;
    stat: GearStat;
    /** flat: 장비 기본 위력 × base. percent·rule: base 그대로. */
    kind: 'flat' | 'percent' | 'rule';
    base: number;
    /** 양날 옵션의 손해 쪽. flat이면 위력 × base2(음수). */
    stat2?: GearStat;
    base2?: number;
    minRarity?: number;
    description: string;
};
export type ItemAffix = { id: string; name: string; stat: GearStat; value: number; stat2?: GearStat; value2?: number; rule?: boolean };
/** 장비에서 오는 수치의 합계 상한. 흡혈은 장비 합계 6%p까지만 인정합니다. */
export const GEAR_CAPS: Partial<Record<GearStat, number>> = { lifesteal: .06 };

export const RULE_CAPS: Partial<Record<GearStat, number>> = {
    stunBonus: 1, controlBonus: 1, dotTurnsBonus: 2, poisonStackBonus: 3, arcaneRatioBonus: .3, followUpBonus: .3, healBonus: .5, executeBonus: .15,
};

export const AFFIX_POOL: AffixDef[] = [
    // 능력치 옵션
    { id: 'might', name: '맹공', stat: 'attack', kind: 'flat', base: .3, description: '물리 공격이 오릅니다.' },
    { id: 'arcana', name: '신비', stat: 'magic', kind: 'flat', base: .3, description: '마법 공격이 오릅니다.' },
    { id: 'vigor', name: '생명', stat: 'hp', kind: 'flat', base: 1.5, description: '최대 체력이 오릅니다.' },
    { id: 'plating', name: '철갑', stat: 'defense', kind: 'flat', base: .3, description: '물리 방어가 오릅니다.' },
    { id: 'ward', name: '정신', stat: 'resist', kind: 'flat', base: .3, description: '마법 방어가 오릅니다.' },
    { id: 'wellspring', name: '샘물', stat: 'mana', kind: 'flat', base: .2, description: '최대 마나가 오릅니다.' },
    { id: 'current', name: '순환', stat: 'manaRegen', kind: 'flat', base: .012, description: '턴당 마나 회복이 오릅니다.' },
    { id: 'precise', name: '정밀', stat: 'accuracy', kind: 'percent', base: .03, description: '명중이 오릅니다.' },
    { id: 'lucky', name: '행운', stat: 'crit', kind: 'percent', base: .015, description: '치명타 확률이 오릅니다.' },
    { id: 'brutal', name: '잔혹', stat: 'critDamage', kind: 'percent', base: .06, description: '치명 피해가 오릅니다.' },
    { id: 'piercing', name: '관통', stat: 'penetration', kind: 'percent', base: .025, description: '방어 관통이 오릅니다.' },
    { id: 'leech', name: '흡혈', stat: 'lifesteal', kind: 'percent', base: .01, description: '준 피해의 일부를 회복합니다 (장비 흡혈 합계 최대 6%p).' },
    { id: 'drift', name: '유영', stat: 'evasion', kind: 'percent', base: .02, description: '회피가 오릅니다.' },
    { id: 'swift', name: '신속', stat: 'speed', kind: 'percent', base: 2, description: '속도가 오릅니다.' },
    { id: 'venom', name: '맹독', stat: 'dotBonus', kind: 'percent', base: .06, description: '출혈·중독·화상 피해가 늘어납니다.' },
    { id: 'spiked', name: '가시', stat: 'thorns', kind: 'percent', base: .04, description: '맞을 때 물리 방어 비례 반격 (방어 친화도 적용).' },
    { id: 'runic', name: '룬', stat: 'arcaneStrike', kind: 'percent', base: .03, description: '마법 직업의 마력 평타 확률이 오릅니다.' },
    { id: 'scholar', name: '학식', stat: 'expBonus', kind: 'percent', base: .03, description: '경험치 획득이 늘어납니다.' },
    { id: 'golden', name: '황금', stat: 'goldBonus', kind: 'percent', base: .04, description: '포획·던전 골드가 늘어납니다.' },
    { id: 'seeker', name: '탐색', stat: 'dropBonus', kind: 'percent', base: .01, description: '장비 드롭 확률이 늘어납니다(상대 증가).' },
    // 양날 옵션: 큰 이득 + 손해
    { id: 'berserk', name: '광전사', stat: 'attack', kind: 'flat', base: .9, stat2: 'defense', base2: -.45, description: '물리 공격이 크게 오르지만 물리 방어가 줄어듭니다.' },
    { id: 'glassCannon', name: '유리 대포', stat: 'magic', kind: 'flat', base: .9, stat2: 'hp', base2: -2.2, description: '마법 공격이 크게 오르지만 최대 체력이 줄어듭니다.' },
    { id: 'bulwark', name: '성벽', stat: 'defense', kind: 'flat', base: .9, stat2: 'speed', base2: -4, description: '물리 방어가 크게 오르지만 느려집니다.' },
    { id: 'gambit', name: '도박수', stat: 'crit', kind: 'percent', base: .05, stat2: 'accuracy', base2: -.06, description: '치명타가 크게 오르지만 명중이 줄어듭니다.' },
    { id: 'bloodPact', name: '피의 계약', stat: 'lifesteal', kind: 'percent', base: .035, stat2: 'hp', base2: -1.5, description: '흡혈이 크게 오르지만 최대 체력이 줄어듭니다 (장비 흡혈 합계 최대 6%p).' },
    // 규칙 옵션 (영웅 이상, 장비당 1개)
    { id: 'concuss', name: '뇌진탕', stat: 'stunBonus', kind: 'rule', base: 1, minRarity: 3, description: '기절 지속 +1턴 (합계 최대 +1).' },
    { id: 'binding', name: '속박', stat: 'controlBonus', kind: 'rule', base: 1, minRarity: 3, description: '침묵·감속 지속 +1턴 (합계 최대 +1).' },
    { id: 'lingering', name: '잔류', stat: 'dotTurnsBonus', kind: 'rule', base: 1, minRarity: 3, description: '출혈·중독·화상 지속 +1턴 (합계 최대 +2).' },
    { id: 'saturate', name: '포화', stat: 'poisonStackBonus', kind: 'rule', base: 1, minRarity: 3, description: '중독 최대 중첩 +1 (합계 최대 +3).' },
    { id: 'runeCore', name: '룬 핵', stat: 'arcaneRatioBonus', kind: 'rule', base: .1, minRarity: 3, description: '마력 평타 계수 +0.1 (합계 최대 +0.3).' },
    { id: 'echoing', name: '메아리', stat: 'followUpBonus', kind: 'rule', base: .1, minRarity: 3, description: '추가타 위력 +10%p (합계 최대 +30%p).' },
    { id: 'mending', name: '치유', stat: 'healBonus', kind: 'rule', base: .15, minRarity: 3, description: '회복 기술 회복량 +15% (합계 최대 +50%).' },
    { id: 'reaper', name: '처형', stat: 'executeBonus', kind: 'rule', base: .05, minRarity: 3, description: '빈사 판정 기준 +5%p (합계 최대 +15%p).' },
];

/** 낚시터·던전별로 잘 나오는 옵션(가중치 ×4). 명시되지 않은 곳은 균등합니다. */
export const ORIGIN_THEMES: Record<string, { name: string; affixes: string[] }> = {
    brook: { name: '여명의 시냇가', affixes: ['vigor', 'plating', 'precise'] },
    bay: { name: '푸른 조개 만', affixes: ['ward', 'wellspring', 'scholar'] },
    reef: { name: '붉은 산호초', affixes: ['lucky', 'brutal', 'gambit'] },
    kelp: { name: '속삭이는 해초림', affixes: ['drift', 'swift', 'venom'] },
    wreck: { name: '망각의 난파선', affixes: ['piercing', 'brutal', 'might', 'berserk'] },
    volcanic: { name: '검은 화산수역', affixes: ['venom', 'arcana', 'spiked', 'lingering'] },
    trench: { name: '검은 해구', affixes: ['leech', 'vigor', 'spiked', 'bloodPact'] },
    moon: { name: '달빛의 심연', affixes: ['arcana', 'current', 'runic', 'glassCannon', 'runeCore'] },
    starfall: { name: '별비의 외해', affixes: ['scholar', 'seeker', 'lucky', 'echoing'] },
    grotto: { name: '조수의 동굴', affixes: ['swift', 'concuss', 'binding'] },
    kelpCatacomb: { name: '해초 묘실', affixes: ['venom', 'saturate', 'mending'] },
    cemetery: { name: '닻의 묘지', affixes: ['plating', 'spiked', 'bulwark'] },
    caldera: { name: '검은 화구 제단', affixes: ['venom', 'lingering', 'saturate'] },
    temple: { name: '심해 신전', affixes: ['arcana', 'wellspring', 'runeCore', 'mending'] },
    starSanctum: { name: '별비 성소', affixes: ['echoing', 'reaper', 'concuss'] },
    abyss: { name: '윤회의 무한 심연', affixes: ['leech', 'piercing', 'reaper', 'bloodPact'] },
};
export const THEME_WEIGHT = 4;

/** 드롭 등급 확률(드롭이 일어났을 때). 합 1. */
export const DROP_RARITY = [.5, .25, .13, .07, .035, .012, .003];
/** 등급별 옵션 수치 배율: 높은 등급일수록 한 옵션도 강합니다. */
export const rarityQuality = (rarity: number) => 1 + rarity * .1;
/** 분해 시 얻는 정수와 옵션 재설정에 드는 정수. */
export const ESSENCE_BY_RARITY = [1, 2, 4, 8, 16, 32, 64];
export const rerollEssence = (rarity: number) => 2 + rarity * 2;

function pickAffix(pool: AffixDef[], origin: string | undefined, rng: () => number) {
    const theme = new Set(ORIGIN_THEMES[origin || '']?.affixes || []);
    const weights = pool.map(a => theme.has(a.id) ? THEME_WEIGHT : 1);
    let roll = rng() * weights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll <= 0) return pool[i]; }
    return pool[pool.length - 1];
}
export function rollOption(def: AffixDef, power: number, rarity: number, rng: () => number): ItemAffix {
    if (def.kind === 'rule') return { id: def.id, name: def.name, stat: def.stat, value: def.base, rule: true };
    // 수치 굴림: 0.6~1.4배 × 등급 배율. 양날 옵션의 손해 쪽은 굴림 없이 고정입니다.
    const roll = (.6 + rng() * .8) * rarityQuality(rarity);
    const scale = def.kind === 'flat' ? Math.max(1, power) : 1;
    const round = (n: number) => def.kind === 'flat' ? Math.round(n) : Math.round(n * 10000) / 10000;
    const out: ItemAffix = { id: def.id, name: def.name, stat: def.stat, value: round(def.base * scale * roll) };
    if (def.stat2 && def.base2) {
        // 체력·공격·방어 같은 고정 수치 손해는 위력 비례, 속도·명중 같은 손해는 고정 폭입니다.
        const flatStat = ['hp', 'attack', 'magic', 'defense', 'resist', 'mana'].includes(def.stat2);
        out.stat2 = def.stat2;
        out.value2 = flatStat ? Math.round(def.base2 * Math.max(1, power)) : Math.round(def.base2 * 10000) / 10000;
    }
    return out;
}
/** 등급 번호만큼 옵션을 굴립니다. 같은 옵션은 한 번만, 규칙 옵션은 장비당 최대 1개. */
export function rollAffixes(rarity: number, power: number, origin: string | undefined, rng: () => number, keep: ItemAffix[] = []): ItemAffix[] {
    const out = [...keep];
    while (out.length < rarity) {
        const hasRule = out.some(a => a.rule);
        const pool = AFFIX_POOL.filter(a => !out.some(o => o.id === a.id) && (a.kind !== 'rule' || (!hasRule && rarity >= (a.minRarity || 0))));
        if (!pool.length) break;
        out.push(rollOption(pickAffix(pool, origin, rng), power, rarity, rng));
    }
    return out;
}
export const affixDef = (id: string) => AFFIX_POOL.find(a => a.id === id);
