import type { Item } from '../types';
/** 가격·확률·영구 성장 수치의 단일 설정. 모두 게임 내 재화 전용. */
export const ECONOMY = { enhanceMax: 10, enhanceGain: .15, shopBase: 180, shopPerLevel: 35, gambleBase: 300, gamblePerLevel: 45, rebirthAPCap: 12, rebirthLevelStep: 5, rebirthLevelCap: 60, rebirthExp: .25, tideCap: 200 };
export const APPRAISAL = [{ rarity: 1, chance: .55 }, { rarity: 2, chance: .4 }, { rarity: 3, chance: .05 }];
export const RESEARCH = [
    { id: 'guard', name: '불굴의 기억', desc: '물리·마법 방어 +3%', max: 100, base: 3, step: 3 },
    // The first purchase is reachable after a normal first rebirth, but later
    // ranks are deliberately expensive so pearls remain a meaningful choice.
    { id: 'attack', name: '날카로운 기억', desc: '물리·마법 공격 +5%', max: 200, base: 2, step: 2 },
    { id: 'hp', name: '깊은 숨결', desc: '최대 체력 +8%', max: 200, base: 2, step: 2 },
    { id: 'gold', name: '황금 물결', desc: '포획·던전 골드 +10%', max: 20, base: 3, step: 2 },
    { id: 'ap', name: '영혼의 그릇', desc: '스킬 장착 한도 AP +1', max: 12, base: 4, step: 3 },
    { id: 'exp', name: '항해의 기억', desc: '포획 경험치 +20%', max: 10, base: 3, step: 3 },
    { id: 'drop', name: '보물의 감각', desc: '장비 드롭 확률 +1%p', max: 10, base: 3, step: 3 },
    { id: 'starting', name: '항구의 유산', desc: '환생 직후 시작 골드 +500', max: 10, base: 3, step: 2 },
    { id: 'pearl', name: '윤회의 연금술', desc: '환생 진주 +1', max: 5, base: 6, step: 5 },
    { id: 'dungeon', name: '심연의 금고', desc: '던전 클리어 골드 +8%', max: 10, base: 5, step: 4 },
];
export const researchCost = (id: string, rank: number) => { const r = RESEARCH.find(x => x.id === id); return r ? r.base + r.step * rank + Math.floor(Math.pow(Math.max(0, rank - 19), 2) * .4) : Infinity; };
export const AFFIXES: {
    stat: NonNullable<Item['affix']>['stat'];
    name: string;
    value: number;
    description: string;
}[] = [
    { stat: 'attack', name: '맹공', value: 3, description: '물리 공격 스킬과 기본 공격을 강화합니다.' },
    { stat: 'magic', name: '신비', value: 3, description: '마법 공격 스킬을 강화합니다.' },
    { stat: 'hp', name: '생명', value: 15, description: '버틸 수 있는 최대 체력이 늘어납니다.' },
    { stat: 'resist', name: '정신', value: 3, description: '받는 마법 피해를 줄입니다.' },
    { stat: 'accuracy', name: '정밀', value: .025, description: '회피가 높은 적에게 공격을 맞히기 쉬워집니다.' },
    { stat: 'crit', name: '행운', value: .015, description: '치명타가 발생할 확률이 증가합니다.' },
    { stat: 'evasion', name: '유영', value: .02, description: '적의 물리·마법 공격을 피할 확률이 증가합니다.' },
    { stat: 'goldBonus', name: '황금', value: .04, description: '물고기 포획과 던전 완료 골드가 증가합니다. 판매에는 적용되지 않습니다.' },
];
export const SHOP = [
    { id: 'physical', name: '작살형 낚싯대', slot: 'rod', style: 'physical', description: '물리 공격에 집중한 낚싯대.' },
    { id: 'magic', name: '해류 지팡이', slot: 'rod', style: 'magic', description: '마법 스킬을 위한 낚싯대.' },
    { id: 'coat', name: '항해사의 방어구', slot: 'coat', style: 'balanced', description: '체력과 두 방어를 보강합니다.' },
    { id: 'charm', name: '정밀한 조류 나침반', slot: 'charm', style: 'balanced', description: '치명타를 높이고 정밀 옵션으로 명중을 보강합니다.' },
] as const;
/** 감정은 부위를 먼저 고릅니다. 낚싯대의 공격 계열은 같은 확률입니다. */
export const GAMBLE_CATEGORIES = [
    { id: 'rod', name: '낚싯대', slot: 'rod', offers: ['physical', 'magic'], description: '물리형·마법형 중 하나를 같은 확률로 획득합니다.' },
    { id: 'coat', name: '방어구', slot: 'coat', offers: ['coat'], description: '최대 체력과 물리·마법 방어를 보강합니다.' },
    { id: 'charm', name: '나침반', slot: 'charm', offers: ['charm'], description: '치명타 확률을 높이고 무작위 추가 옵션을 얻습니다.' },
] as const;
export const GOLD_TRAINING = [
    { id: 'attack', name: '작살 훈련', effect: '물리 공격 +4' },
    { id: 'magic', name: '해류 수련', effect: '마법 공격 +4' },
    { id: 'hp', name: '체력 단련', effect: '최대 체력 +25' },
    { id: 'defense', name: '방어 훈련', effect: '물리 방어 +3' },
    { id: 'gold', name: '교역 기술', effect: '포획·던전 골드 +5%' },
] as const;
export const RELICS = [
    { id: 'memoryRod', name: '윤회의 낚싯대', slot: 'rod', style: 'balanced', power: 45, cost: 10, rebirth: 1, description: '환생해도 사라지지 않는 물리·마법 겸용 유물.', affix: { stat: 'goldBonus', name: '황금 기억', value: .2 } },
    { id: 'soulCoat', name: '영혼의 잠수복', slot: 'coat', style: 'balanced', power: 55, cost: 18, rebirth: 2, description: '강화와 옵션까지 다음 생에 이어지는 생존 유물.', affix: { stat: 'evasion', name: '영혼 유영', value: .12 } },
    { id: 'abyssCharm', name: '심연의 눈', slot: 'charm', style: 'balanced', power: 70, cost: 28, rebirth: 3, description: '깊은 심연에 도전하는 낚시꾼의 정밀 유물.', affix: { stat: 'accuracy', name: '심연 통찰', value: .2 } },
] as const;
