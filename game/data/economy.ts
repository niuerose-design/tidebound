import type { Item, State } from '../types';
import { BALANCE } from './balance';
/** 가격·확률·영구 성장 수치의 단일 설정. 모두 게임 내 재화 전용. */
export const ECONOMY = { /** v27.93 강화 상한·성당 배율은 data/starforce.ts(STARFORCE)로 옮김. 판매 때 돌려받는 강화 비용 비율. */ saleEnhanceRefund: .3, shopBase: 180, shopPerLevel: 35, gambleBase: 300, gamblePerLevel: 45, rebirthAPCap: 12, rebirthLevelStep: 5, /** v27.55 Lv.60(환생 6회) 뒤로는 환생마다 +1, 최대 Lv.80. */ rebirthLevelCap: 100, rebirthLevelLateFrom: 60, rebirthLevelLateStep: 1, rebirthExp: .25, tideCap: 200 };
// v22: 감정은 희귀 이상. 드물게 신화·고대·태초가 나옵니다(등급 수 = 옵션 수).
export const APPRAISAL = [{ rarity: 1, chance: .55 }, { rarity: 2, chance: .33 }, { rarity: 3, chance: .09 }, { rarity: 4, chance: .025 }, { rarity: 5, chance: .004 }, { rarity: 6, chance: .001 }];
export type ResearchTab = 'combat' | 'utility' | 'gold';
export type ResearchGroup = 'attack' | 'defense' | 'basic' | 'special' | 'vow';
export type ResearchDef = {
    id: string; name: string; desc: string; max: number; base: number; step: number;
    tab: ResearchTab; group?: ResearchGroup;
    /** 해금에 필요한 환생 횟수. 없으면 0. */
    rebirth?: number;
    /** 1단계당 효과량과 표시 방식. 카드의 '현재 → 다음' 표시에 씁니다. */
    per: number; unit: 'percent' | 'pp' | 'flat'; label: string; suffix?: string;
    /** 가격 할인처럼 효과가 줄어드는 방향이면 true(표시 부호가 −). */
    negative?: boolean;
    /** 단계마다 효과가 수치가 아니라 설명으로 바뀌는 연구(선별의 눈·서약)의 단계별 문구. [0]은 0단계. */
    levels?: string[];
};
export const RESEARCH_TABS: { id: ResearchTab; name: string }[] = [{ id: 'combat', name: '전투' }, { id: 'utility', name: '유틸' }, { id: 'gold', name: '골드' }];
export const RESEARCH_GROUPS: Record<ResearchGroup, string> = { attack: '공격', defense: '생존', basic: '기본', special: '특별', vow: '서약' };
export const RESEARCH: ResearchDef[] = [
    // The first purchase is reachable after a normal first rebirth, but later
    // ranks are deliberately expensive so pearls remain a meaningful choice.
    { id: 'attack', name: '날카로운 기억', desc: '물리 공격 +5%', max: 200, base: 2, step: 2, tab: 'combat', group: 'attack', per: .05, unit: 'percent', label: '물리 공격' },
    { id: 'magicAttack', name: '마력의 기억', desc: '마법 공격 +5%', max: 200, base: 2, step: 2, tab: 'combat', group: 'attack', per: .05, unit: 'percent', label: '마법 공격' },
    { id: 'crit', name: '예리한 눈', desc: '치명 확률 +0.5%p', max: 20, base: 4, step: 3, tab: 'combat', group: 'attack', rebirth: 2, per: .005, unit: 'pp', label: '치명 확률' },
    { id: 'manaRegen', name: '고요한 호흡', desc: '턴당 마나 회복 +5%', max: 10, base: 3, step: 3, tab: 'combat', group: 'attack', rebirth: 2, per: .05, unit: 'percent', label: '턴당 마나 회복' },
    { id: 'critDamage', name: '치명의 일격', desc: '치명 피해 +2%p', max: 25, base: 4, step: 3, tab: 'combat', group: 'attack', rebirth: 5, per: .02, unit: 'pp', label: '치명 피해' },
    { id: 'penetration', name: '관통의 기억', desc: '방어 관통 +1%p (전체 상한 60%)', max: 15, base: 5, step: 4, tab: 'combat', group: 'attack', rebirth: 5, per: .01, unit: 'pp', label: '방어 관통' },
    { id: 'hp', name: '깊은 숨결', desc: '최대 체력 +8%', max: 200, base: 2, step: 2, tab: 'combat', group: 'defense', per: .08, unit: 'percent', label: '최대 체력' },
    { id: 'guard', name: '불굴의 기억', desc: '물리 방어 +3%', max: 100, base: 3, step: 3, tab: 'combat', group: 'defense', per: .03, unit: 'percent', label: '물리 방어' },
    { id: 'magicGuard', name: '마나 장막의 기억', desc: '마법 방어 +3%', max: 100, base: 3, step: 3, tab: 'combat', group: 'defense', per: .03, unit: 'percent', label: '마법 방어' },
    { id: 'recovery', name: '회복의 기억', desc: '처치 후 회복 +1%p (필드·던전)', max: 10, base: 3, step: 3, tab: 'combat', group: 'defense', rebirth: 2, per: .01, unit: 'pp', label: '처치 후 회복' },
    { id: 'evasion', name: '바람의 걸음', desc: '회피 +0.6%p', max: 20, base: 4, step: 3, tab: 'combat', group: 'defense', rebirth: 2, per: .006, unit: 'pp', label: '회피' },
    { id: 'lifesteal', name: '피의 갈증', desc: '흡혈 +0.5%p (전체 상한 30%)', max: 20, base: 4, step: 3, tab: 'combat', group: 'defense', rebirth: 5, per: .005, unit: 'pp', label: '흡혈' },
    { id: 'ap', name: '영혼의 그릇', desc: '스킬 장착 한도 AP +1', max: 12, base: 4, step: 3, tab: 'utility', group: 'basic', per: 1, unit: 'flat', label: '장착 AP' },
    { id: 'exp', name: '모험의 기억', desc: '처치 경험치 +20%', max: 10, base: 3, step: 3, tab: 'utility', group: 'basic', per: .2, unit: 'percent', label: '처치 경험치' },
    // v27.60 모험가의 유산: 시작 골드 +500 → 시작 레벨 +2. id는 그대로라 찍어 둔 단계가 이어집니다.
    { id: 'starting', name: '모험가의 유산', desc: '환생 직후 시작 레벨 +2 (오른 레벨만큼 능력치 포인트도 받음)', max: 10, base: 3, step: 2, tab: 'utility', group: 'basic', per: 2, unit: 'flat', label: '시작 레벨', suffix: '레벨' },
    // v27.80 지겨운 환생: 환생 직후 잡일을 줄입니다. 숙달한 것만 복원하므로 숙련 복사 같은 우회가 없습니다.
    { id: 'habit', name: '지겨운 환생', desc: '1단계: 환생 직전 직업을 숙달했으면 환생 직후 자동 전직. 2단계: 장착 스킬 중 계승·숙달한 것은 그대로 장착. 3단계: 능력치 배분 비율을 유지해 시작 포인트를 자동 배분', max: 3, base: 6, step: 4, tab: 'utility', group: 'basic', rebirth: 2, per: 1, unit: 'flat', label: '환생 편의', suffix: '단계', levels: ['없음', '자동 전직', '자동 전직 · 스킬 편성 유지', '자동 전직 · 스킬 편성 유지 · 능력치 비율 유지'] },
    { id: 'inventory', name: '넓은 가방', desc: '가방 +5칸', max: 8, base: 3, step: 3, tab: 'utility', group: 'basic', rebirth: 2, per: 5, unit: 'flat', label: '가방', suffix: '칸' },
    { id: 'offline', name: '긴 휴식', desc: '오프라인 정산 상한 +2시간', max: 12, base: 3, step: 2, tab: 'utility', group: 'basic', rebirth: 2, per: 2, unit: 'flat', label: '오프라인 정산 상한', suffix: '시간' },
    { id: 'tailwindSail', name: '순풍의 깃털', desc: '순풍 경험치 보너스 +10%p (기본 +50%)', max: 5, base: 8, step: 5, tab: 'utility', group: 'special', rebirth: 2, per: .1, unit: 'pp', label: '순풍 경험치 보너스' },
    { id: 'tailwindWindow', name: '바람목 넓히기', desc: '순풍 조건 +1레벨 (기본 요구 레벨+5 이내)', max: 5, base: 6, step: 4, tab: 'utility', group: 'special', rebirth: 2, per: 1, unit: 'flat', label: '순풍 조건', suffix: '레벨' },
    { id: 'salvage', name: '환생 정리', desc: '환생할 때 보관함과 착용 중인 일반 장비를 모두 판매(골드는 다음 생 시작 골드에 더함)하거나 분해(정수)합니다. 방식(판매/분해)은 환생 화면의 ‘받는 보상’ 줄이나 설정(톱니바퀴)에서 고르고, 효율은 1단계 40%부터 단계당 +15%', max: 5, base: 6, step: 4, tab: 'utility', group: 'special', rebirth: 1, per: 15, unit: 'percent', label: '환생 정리 효율', levels: ['정리 없음', '효율 40%', '효율 55%', '효율 70%', '효율 85%', '효율 100%'] },
    { id: 'sortingNet', name: '선별의 눈', desc: '1단계 희귀, 2단계 영웅 이하 드롭 자동 판매 (설정에서 켜고 끔)', max: 2, base: 10, step: 10, tab: 'utility', group: 'special', rebirth: 2, per: 1, unit: 'flat', label: '자동 판매 등급', suffix: '단계', levels: ['자동 판매 없음', '희귀 자동 판매', '영웅 이하 자동 판매'] },
    // v27.60 병 속의 편지(오프라인 편지병) → 행운의 편지. id는 그대로라 찍어 둔 단계가 이어집니다.
    { id: 'messageBottle', name: '행운의 편지', desc: '숙련의 까미·경험의 누리 등장 확률 +15%', max: 5, base: 6, step: 4, tab: 'utility', group: 'special', rebirth: 3, per: .15, unit: 'percent', label: '까미·누리 등장 확률' } /* 배율은 mimic.ts specialLuck */,
    { id: 'limitBreak', name: '한계의 문', desc: '스킬 한계돌파 해금. 연구 단계까지만 한계돌파할 수 있고, 이미 한 한계돌파도 연구 단계까지만 효과가 납니다', max: 3, base: 10, step: 10, tab: 'utility', group: 'special', per: 1, unit: 'flat', label: '한계돌파 상한', suffix: '단계', levels: ['잠김 · 한계돌파 불가', '한계돌파 1단계까지', '한계돌파 2단계까지', '한계돌파 3단계까지'] },
    /** v27.86 잠든 힘 → 랜덤게임(던전). id는 세이브 호환을 위해 그대로 둡니다. */
    { id: 'vowAnchor', name: '랜덤게임', desc: '던전 ‘랜덤게임’ 입장 해금. 생마다 연구 단계만큼 입장할 수 있고, 2·3단계는 판돈을 50%씩 키웁니다(×1 → ×1.5 → ×2). 쓰러지면 판돈은 모두 사라집니다', max: 3, base: 10, step: 10, tab: 'utility', group: 'vow', rebirth: 5, per: 1, unit: 'flat', label: '랜덤게임 단계', suffix: '단계', levels: ['잠김', '해금 · 생마다 1회 · 판돈 ×1', '생마다 2회 · 판돈 ×1.5', '생마다 3회 · 판돈 ×2'] },
    { id: 'vowBreath', name: '하드코어', desc: '서약 해금. 2·3단계는 환생 세계석 보너스 50%씩 강화 (+50% → +75% → +100%)', max: 3, base: 10, step: 10, tab: 'utility', group: 'vow', rebirth: 5, per: 1, unit: 'flat', label: '서약 단계', suffix: '단계', levels: ['잠김', '해금 · 환생 세계석 +50%', '환생 세계석 +75%', '환생 세계석 +100%'] },
    { id: 'vowRough', name: '힘의 길', desc: '서약 해금(난이도 하한·장비 능력치 감소·회복 봉쇄 대신 골드·드롭 곱연산). 2·3단계는 보상을 50%씩 강화', max: 3, base: 10, step: 10, tab: 'utility', group: 'vow', rebirth: 5, per: 1, unit: 'flat', label: '서약 단계', suffix: '단계', levels: ['잠김', '해금 · 선택 단계당 드롭·골드 +50%', '선택 단계당 +75%', '선택 단계당 +100%'] },
    /** v27.86 절제: 장착 AP를 줄이는 서약. */
    { id: 'vowRestraint', name: '절제', desc: '서약 해금(장착 AP -4·-8·-12, 액티브·패시브 각각 3·2·1개까지 대신 경험치 ×1.2·×1.4·×1.6 곱연산). 2·3단계는 보상을 50%씩 강화', max: 3, base: 10, step: 10, tab: 'utility', group: 'vow', rebirth: 5, per: 1, unit: 'flat', label: '서약 단계', suffix: '단계', levels: ['잠김', '해금 · 경험치 보너스 ×1', '경험치 보너스 ×1.5', '경험치 보너스 ×2'] },
    { id: 'mastery', name: '숙련의 기억', desc: '스킬·직업 숙련 획득 +3%', max: 10, base: 3, step: 3, tab: 'utility', group: 'basic', rebirth: 5, per: .03, unit: 'percent', label: '숙련 획득' },
    { id: 'gold', name: '황금 비', desc: '처치·던전 골드 +10%', max: 20, base: 3, step: 2, tab: 'gold', per: .1, unit: 'percent', label: '처치·던전 골드' },
    { id: 'dungeon', name: '던전의 금고', desc: '던전 클리어 골드 +8%', max: 10, base: 5, step: 4, tab: 'gold', per: .08, unit: 'percent', label: '던전 클리어 골드' },
    { id: 'drop', name: '보물의 감각', desc: '장비 드롭 확률 +10%', max: 10, base: 3, step: 3, tab: 'gold', per: .1, unit: 'percent', label: '장비 드롭 확률' },
    { id: 'pearl', name: '윤회의 연금술', desc: '환생 세계석 +2', max: 5, base: 6, step: 5, tab: 'gold', per: 2, unit: 'flat', label: '환생 세계석' },
    { id: 'shop', name: '상점 단골', desc: '상점·뽑기 골드 가격 -2%', max: 10, base: 3, step: 2, tab: 'gold', rebirth: 2, per: .02, unit: 'percent', label: '상점·뽑기 가격', negative: true },
    { id: 'enhance', name: '대장장이의 기억', desc: '강화·옵션 재설정 골드 비용 -2%', max: 15, base: 3, step: 2, tab: 'gold', rebirth: 5, per: .02, unit: 'percent', label: '강화·재설정 비용', negative: true },
];
export const researchCost = (id: string, rank: number) => { const r = RESEARCH.find(x => x.id === id); return r ? r.base + r.step * rank + Math.floor(Math.pow(Math.max(0, rank - 19), 2) * .4) : Infinity; };
/** rank 단계까지 쓴 세계석 합계(0 → rank). 재분배 반환액 계산에 씁니다. */
export const researchSpent = (id: string, rank: number) => { let sum = 0; for (let i = 0; i < rank; i++) sum += researchCost(id, i); return sum; };
export const researchUnlocked = (rebirths: number, r: Pick<ResearchDef, 'rebirth'>) => rebirths >= (r.rebirth || 0);
/** rank 단계의 총 효과 표시. 예: 물리 공격 +10% */
export function researchEffect(r: ResearchDef, rank: number) {
    if (r.levels) return r.levels[Math.min(rank, r.levels.length - 1)];
    const n = r.per * rank;
    const value = r.unit === 'percent' ? `${Number((n * 100).toFixed(1))}%` : r.unit === 'pp' ? `${Number((n * 100).toFixed(1))}%p` : `${n.toLocaleString()}${r.suffix || ''}`;
    return `${r.label} ${r.negative ? '−' : '+'}${value}`;
}
/** 연구 단계. 없는 연구는 0. */
export const researchRank = (s: Pick<State, 'permanent'>, id: string) => s.permanent?.[id] || 0;
/** 가방 칸 수: 60 + 넓은 가방 5칸/단계. */
export const inventoryCap = (s: Pick<State, 'permanent'>) => BALANCE.inventoryCap + researchRank(s, 'inventory') * 5;
/** 오프라인 정산 상한(초): v27.43 기본 6시간(24 → 6, 인플레·서버 부하 완화) + 긴 휴식 2시간/단계(최대 12단계 = 30시간). */
export const offlineCapSeconds = (s: Pick<State, 'permanent'>) => BALANCE.offlineCapSeconds + researchRank(s, 'offline') * 7200;
/** 상점 단골: 상점·뽑기 골드 가격 배율. */
export const shopDiscount = (s: Pick<State, 'permanent'>) => 1 - researchRank(s, 'shop') * .02;
/** 대장장이의 기억: 강화·옵션 재설정 골드 비용 배율. */
export const smithDiscount = (s: Pick<State, 'permanent'>) => 1 - researchRank(s, 'enhance') * .02;
/** 재분배 반환 비율: 계정당 첫 1회 100%, 이후 90%(내림). */
/** v27.29 재분배는 언제나 100% 반환(무료). */
export const RESEARCH_RESET = { firstRefund: 1, refund: 1 };
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
    { stat: 'evasion', name: '회피', value: .02, description: '적의 물리·마법 공격을 피할 확률이 증가합니다.' },
    { stat: 'goldBonus', name: '황금', value: .04, description: '몬스터 처치와 던전 완료 골드가 증가합니다. 판매에는 적용되지 않습니다.' },
];
export const SHOP = [
    { id: 'physical', name: '소드', slot: 'rod', style: 'physical', description: '물리 공격에 집중한 무기.' },
    { id: 'magic', name: '스태프', slot: 'rod', style: 'magic', description: '마법 스킬을 위한 무기.' },
    { id: 'coat', name: '모험가의 갑옷', slot: 'coat', style: 'balanced', description: '체력과 두 방어를 보강합니다.' },
    { id: 'charm', name: '정밀한 귀고리', slot: 'charm', style: 'balanced', description: '치명타를 높이고 정밀 옵션으로 명중을 보강합니다.' },
] as const;
/** 감정은 부위를 먼저 고릅니다. 무기의 공격 계열은 같은 확률입니다. */
export const GAMBLE_CATEGORIES = [
    { id: 'rod', name: '무기', slot: 'rod', offers: ['physical', 'magic'], description: '물리형·마법형 중 하나를 같은 확률로 획득합니다.' },
    { id: 'coat', name: '방어구', slot: 'coat', offers: ['coat'], description: '최대 체력과 물리·마법 방어를 보강합니다.' },
    { id: 'charm', name: '장신구', slot: 'charm', offers: ['charm'], description: '등급에 따라 정해진 치명타 확률(전설 10%, 태초 16%, 강화할수록 조금씩 상승)과 무작위 추가 옵션을 얻습니다. 치명타 100%를 넘으면 극 치명타 확률이 생깁니다.' },
] as const;
/** v27.19 환생 유물: 환생 횟수(rebirth)를 채우면 세계석 없이 받습니다. cost는 v27.19 이전 구매자 환불 기준값입니다. */
export const RELICS = [
    { id: 'memoryRod', name: '윤회의 샤이닝 로드', slot: 'rod', style: 'balanced', power: 45, cost: 10, rebirth: 1, description: '환생해도 사라지지 않는 물리·마법 겸용 유물.', affix: { stat: 'goldBonus', name: '황금 기억', value: .2 } },
    { id: 'soulCoat', name: '영혼의 망토', slot: 'coat', style: 'balanced', power: 55, cost: 18, rebirth: 2, description: '강화와 옵션까지 다음 생에 이어지는 생존 유물.', affix: { stat: 'evasion', name: '영혼 회피', value: .12 } },
    { id: 'abyssCharm', name: '심연의 눈', slot: 'charm', style: 'balanced', power: 70, cost: 28, rebirth: 3, description: '깊은 심연에 도전하는 모험가의 정밀 유물.', affix: { stat: 'accuracy', name: '심연 통찰', value: .2 } },
] as const;
/** v27.96 성장하는 유물: 위력은 환생마다 +perRebirth(기본 × (1 + 환생 × perRebirth)), 같은 부위 장비를 소비해 옵션을 imprintSlots줄까지 이식(비용 = 그 장비 옵션 재설정 골드 × imprintCost). 성·이식 옵션은 환생해도 남습니다. */
export const RELIC_GROWTH = { perRebirth: .04, imprintSlots: 3, imprintCost: 5 };
export const relicPower = (base: number, rebirths: number) => Math.round(base * (1 + Math.max(0, rebirths) * RELIC_GROWTH.perRebirth));
/** v25.7 환생 정리 효율(0 = 연구 없음). 1단계 40%, 단계당 +15%, 5단계 100%. */
export const salvageRate = (s: Pick<State, 'permanent'>) => { const rank = researchRank(s, 'salvage'); return rank ? Math.min(1, .25 + rank * .15) : 0; };
/** v27.60 모험가의 유산: 새 생의 시작 레벨(Lv.1 + 2/단계, 10단계 Lv.21). */
export const startingLevel = (s: Pick<State, 'permanent'>) => 1 + researchRank(s, 'starting') * 2;
