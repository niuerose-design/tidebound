import { ODDS, oddsKnown, oddsPercent } from './odds';
import type { Item, State } from '../types';
import { BALANCE } from './balance';
/** 가격·확률·영구 성장 수치의 단일 설정. 모두 게임 내 재화 전용. */
export const ECONOMY = { /** v27.93 강화 상한·성당 배율은 data/starforce.ts(STARFORCE)로 옮김. 판매 때 돌려받는 강화 비용 비율. */ saleEnhanceRefund: .3, shopBase: 180, shopPerLevel: 35, gambleBase: 300, gamblePerLevel: 45, rebirthAPCap: 12, rebirthLevelStep: 5, /** v27.55 Lv.60(환생 6회) 뒤로는 환생마다 +1, 최대 Lv.80. */ rebirthLevelCap: 100, rebirthLevelLateFrom: 60, rebirthLevelLateStep: 1, rebirthExp: .25, tideCap: 200 };
// v22: 감정은 희귀 이상. 드물게 신화·고대·태초가 나옵니다(등급 수 = 옵션 수).
/**
 * v3.59 사냥·던전 드롭 태초 천장: 태초 없이 이만큼 장비가 떨어지면 다음 드롭은 태초(무작위 부위)입니다. 환생해도 남고 승천하면 초기화.
 * 기준 캐릭터(처치당 드롭 약 1%, 시간당 1,730처치)로 약 7.7일 = 부위당 약 31일(칠흑 장신구 최장과 같음).
 */
export const PRIMAL_DROP_PITY = 3200;
/** v3.58 감정 천장: 이 등급 이상이 마지막으로 나온 뒤 이 횟수째 감정은 그 등급 이상이 확정입니다(신화 150 · 고대 1,000 · 태초 3,000). 환생해도 남고 승천하면 초기화. */
export const APPRAISAL_PITY = [{ rarity: 4, key: 'myth', count: 150 }, { rarity: 5, key: 'ancient', count: 1000 }, { rarity: 6, key: 'primal', count: 3000 }] as const;
export type AppraisalPityKey = typeof APPRAISAL_PITY[number]['key'];
/**
 * 감정 가격의 환생 배율(현재 환생 횟수 기준이라 승천하면 다시 낮아집니다).
 * v3.58 10^(환생 / 60)은 환생 200에서 ×2,150으로 골드 수입(환생 30 → 200에 약 12배)을 크게 앞질러 후반 감정이 사실상 막혔습니다.
 * v3.68 예전 배율과 직선 1 + 환생 × perRebirth 중 낮은 쪽: 환생 100까지는 예전 그대로(어느 구간도 비싸지지 않음), 그 위로는 직선(환생 200 ×91).
 * 감정 태초 기대 비용이 환생 100 이상에서도 그 구간 시간당 골드의 약 5일분(사냥 태초와 비슷)으로 남습니다.
 * v3.81 예전 배율의 scale 60 → 30: 환생 30~100 구간이 수입보다 싸서(환생 60 태초 기대가 수입 약 1일분) 뽑기 태초로 계승 태초를 빨리 만들 수 있었습니다.
 * 이제 약 환생 38부터 직선(환생 30 ×10 · 60 ×28 · 100 ×46 · 200 ×91)이라 환생 60~200에서 태초 기대가 수입의 약 5일분입니다. 환생 100 이상은 그대로입니다.
 */
export const APPRAISAL_REBIRTH = { scale: 30, perRebirth: .45 };
export const appraisalRebirthFactor = (rebirths: number) => { const r = Math.max(0, rebirths); return Math.min(Math.pow(10, r / APPRAISAL_REBIRTH.scale), 1 + r * APPRAISAL_REBIRTH.perRebirth); };
/** v3.58 각인 감정: 고른 옵션 하나가 반드시 붙습니다. 골드는 감정 × goldMultiplier, 정수 essence가 더 듭니다. */
export const IMPRINT_APPRAISAL = { goldMultiplier: 5, essence: 50 };
/** v3.58 자동 감정 한 번에 최대 시도 수(렉 방지). */
export const AUTO_APPRAISAL_MAX = 1000;
/** 감정 등급(희귀 ~ 태초). v3.52 확률은 서버 전용(game/secret/odds.ts, ODDS.appraisal). */
export const APPRAISAL: readonly { rarity: number; readonly chance: number }[] = [1, 2, 3, 4, 5, 6].map((rarity, i) => ({ rarity, get chance() { return ODDS.appraisal[i]; } }));
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
    /** 단계마다 효과가 수치가 아니라 설명으로 바뀌는 연구(자동 정리·서약)의 단계별 문구. [0]은 0단계. */
    levels?: string[];
    /** v3.31 이 단계를 넘는 단계는 승천한 모험가만 살 수 있습니다(행운의 편지 6~10단계). */
    ascendAbove?: number;
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
    { id: 'penetration', name: '관통의 기억', desc: '방어 관통 +3% (다른 관통과 곱연산)', max: 15, base: 5, step: 4, tab: 'combat', group: 'attack', rebirth: 5, per: .03, unit: 'pp', label: '방어 관통' },
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
    { id: 'tailwindSail', name: '순풍의 깃털', desc: '순풍 경험치 보너스 +10%p (기본 +50%, 합연산, 환생 뒤 요구 레벨까지)', max: 5, base: 8, step: 5, tab: 'utility', group: 'special', rebirth: 2, per: .1, unit: 'pp', label: '순풍 경험치 보너스' },
    { id: 'salvage', name: '청산', desc: '환생할 때 보관함과 착용 중인 일반 장비를 모두 판매(골드는 다음 생 시작 골드에 더함)하거나 분해(정수)합니다. 방식(판매/분해)은 환생 화면의 ‘받는 보상’ 줄이나 설정(톱니바퀴)에서 고르고, 효율은 1단계 40%부터 단계당 +15%', max: 5, base: 6, step: 4, tab: 'utility', group: 'special', rebirth: 1, per: 15, unit: 'percent', label: '청산 효율', levels: ['정리 없음', '효율 40%', '효율 55%', '효율 70%', '효율 85%', '효율 100%'] },
    // v3.38 자동 분해기 + 자동 판매기 연구를 ‘자동 정리’ 하나로 합쳤습니다(id는 sortingNet). 두 장치는 그대로 따로 켜고 등급을 나눠 고릅니다(v3.35).
    { id: 'sortingNet', name: '자동 정리', desc: '자동 분해기(정수)와 자동 판매기(골드)를 함께 엽니다. 설정에서 장치마다 등급을 여러 개 고름(1단계 희귀~전설, 2단계 신화·고대까지). 같은 등급은 한 장치에만, 태초·칠흑·잠금·유물·도감 미등록 종류는 처리하지 않음', max: 2, base: 10, step: 10, tab: 'utility', group: 'special', rebirth: 2, per: 1, unit: 'flat', label: '자동 정리 등급', suffix: '단계', levels: ['자동 정리 없음', '희귀 ~ 전설', '신화 · 고대까지'] },
    // v27.60 병 속의 편지(오프라인 편지병) → 행운의 편지. id는 그대로라 찍어 둔 단계가 이어집니다.
    { id: 'messageBottle', name: '행운의 편지', /** v3.56 ‘대’ 당첨 확률 수치는 서버 전용(비공개가 켜져 있으면 ‘확률 상승’). */ get desc() { return `숙련의 까미·경험의 누리 등장 확률 +15%. 6~10단계는 승천 후: 6단계 부재중 정산 중 확률 ×0.25 → ×0.5, 8단계 까미 ‘대’ 당첨 ${oddsKnown() ? `${oddsPercent(ODDS.mimic.tiers[2], '')} → ${oddsPercent(ODDS.mimic.letterJackpot, '')}` : '확률 상승'}, 10단계 편지 수신인(까미 당첨 숙련의 1%를 해금한 미숙달 직업 하나에 덤)`; }, max: 10, ascendAbove: 5, base: 6, step: 4, tab: 'utility', group: 'special', rebirth: 3, per: .15, unit: 'percent', label: '까미·누리 등장 확률' } /* 배율은 mimic.ts specialLuck */,
    /** v3.86 추가 판정(docs/combat-rework.md B): 해금 단계까지 스킬 편성에서 장착 AP를 내고 켭니다. 지금은 1단계까지(최대 4단계 = 액티브 5개 동시 판정 예정). */
    { id: 'extraRoll', name: '연계의 기억', desc: '추가 판정 해금. 액티브가 발동한 행동에서 편성 순서상 그 아래 액티브로 발동 판정을 한 번 더 굴려, 성공하면 60% 위력으로 함께 씁니다. 동시 시전 묶음으로 나간 행동에서는 묶음 최대 개수가 1 늘어납니다. 스킬 편성에서 장착 AP 12를 내고 켭니다', max: 1, base: 1000, step: 1000, tab: 'utility', group: 'special', rebirth: 10, per: 1, unit: 'flat', label: '추가 판정', suffix: '단계', levels: ['잠김', '추가 판정 1단계(AP 12)'] },
    { id: 'limitBreak', name: '한계의 문', desc: '스킬 한계돌파 해금. 연구 단계까지만 한계돌파할 수 있고, 이미 한 한계돌파도 연구 단계까지만 효과가 납니다', max: 3, base: 10, step: 10, tab: 'utility', group: 'special', per: 1, unit: 'flat', label: '한계돌파 상한', suffix: '단계', levels: ['잠김 · 한계돌파 불가', '한계돌파 1단계까지', '한계돌파 2단계까지', '한계돌파 3단계까지'] },
    /** v27.86 잠든 힘 → 랜덤게임(던전). id는 세이브 호환을 위해 그대로 둡니다. */
    { id: 'vowAnchor', name: '랜덤게임', desc: '던전 ‘랜덤게임’ 입장 해금. 하루마다(그리고 환생하면) 연구 단계만큼 입장할 수 있고, 2·3단계는 판돈을 50%씩 키웁니다(×1 → ×1.5 → ×2). 쓰러지면 판돈은 모두 사라집니다', max: 3, base: 10, step: 10, tab: 'utility', group: 'vow', rebirth: 5, per: 1, unit: 'flat', label: '랜덤게임 단계', suffix: '단계', levels: ['잠김', '해금 · 생마다 1회 · 판돈 ×1', '생마다 2회 · 판돈 ×1.5', '생마다 3회 · 판돈 ×2'] },
    { id: 'vowBreath', name: '하드코어', desc: '서약 해금. 2·3단계는 환생 세계석 보너스 50%씩 강화 (+50% → +75% → +100%)', max: 3, base: 10, step: 10, tab: 'utility', group: 'vow', rebirth: 5, per: 1, unit: 'flat', label: '서약 단계', suffix: '단계', levels: ['잠김', '해금 · 환생 세계석 +50%', '환생 세계석 +75%', '환생 세계석 +100%'] },
    { id: 'vowRough', name: '힘의 길', desc: '서약 해금(난이도 하한·장비 능력치 감소·회복 봉쇄 대신 골드·드롭 곱연산). 2·3단계는 보상을 50%씩 강화', max: 3, base: 10, step: 10, tab: 'utility', group: 'vow', rebirth: 5, per: 1, unit: 'flat', label: '서약 단계', suffix: '단계', levels: ['잠김', '해금 · 선택 단계당 드롭·골드 +50%', '선택 단계당 +75%', '선택 단계당 +100%'] },
    /** v27.86 절제: 장착 AP를 줄이는 서약. */
    { id: 'vowRestraint', name: '절제', desc: '서약 해금(장착 AP -4·-8·-12, 액티브·패시브 각각 3·2·1개까지 대신 경험치 ×1.2·×1.4·×1.6 곱연산). 2·3단계는 보상을 50%씩 강화', max: 3, base: 10, step: 10, tab: 'utility', group: 'vow', rebirth: 5, per: 1, unit: 'flat', label: '서약 단계', suffix: '단계', levels: ['잠김', '해금 · 경험치 보너스 ×1', '경험치 보너스 ×1.5', '경험치 보너스 ×2'] },
    /** v3.7 자동 강화: 보관함에서 목표 별·골드 한도를 정해 스타포스를 한 번에 자동 시도(확률·비용은 그대로). */
    { id: 'autoStar', name: '자동 강화', desc: '장비 보관함의 강화 칸에서 목표 별과 골드 한도를 정하면 스타포스를 한 번에 자동으로 시도합니다(확률·비용은 수동과 같고 파괴되면 멈춤)', max: 1, base: 10, step: 0, tab: 'utility', group: 'special', per: 1, unit: 'flat', label: '자동 강화', levels: ['없음', '해금'] },
    /** v3.17 불굴의 의지: 쓰러진 뒤 회복 대기 -3턴/단계(기본 25턴, 최저 10턴). 환생 10회부터. */
    { id: 'revive', name: '불굴의 의지', desc: '쓰러진 뒤 회복 대기 -3턴(6초) (기본 25턴 = 50초, 최저 10턴)', max: 5, base: 4, step: 3, tab: 'utility', group: 'basic', rebirth: 10, per: 3, unit: 'flat', label: '회복 대기 단축', suffix: '턴' },
    { id: 'mastery', name: '숙련의 기억', desc: '스킬·직업 숙련 획득 +3%', max: 10, base: 3, step: 3, tab: 'utility', group: 'basic', rebirth: 5, per: .03, unit: 'percent', label: '숙련 획득' },
    { id: 'gold', name: '황금 비', desc: '처치·던전 골드 +10%', max: 20, base: 3, step: 2, tab: 'gold', per: .1, unit: 'percent', label: '처치·던전 골드' },
    { id: 'drop', name: '보물의 감각', desc: '장비 드롭 확률 +10%', max: 10, base: 3, step: 3, tab: 'gold', per: .1, unit: 'percent', label: '장비 드롭 확률' },
    { id: 'pearl', name: '윤회의 연금술', desc: '환생 세계석 +2', max: 5, base: 6, step: 5, tab: 'gold', per: 2, unit: 'flat', label: '환생 세계석' },
    { id: 'enhance', name: '대장장이의 기억', desc: '강화·옵션 재설정 골드 비용 -2%', max: 15, base: 3, step: 2, tab: 'gold', rebirth: 5, per: .02, unit: 'percent', label: '강화·재설정 비용', negative: true },
];
/** v3.42 21번째 단계(rank 20)부터 가격이 단계마다 ×1.06 복리로 오릅니다. 효과는 그대로입니다. */
export const RESEARCH_GROWTH = { from: 20, rate: 1.06 } as const;
/** v3.42 전 가격(기본 + 단계 × 증가분 + 20단계 뒤 제곱 항). 그때 산 단계(researchLegacy)를 재분배할 때 이 가격으로 돌려줍니다. */
export const researchLegacyCost = (id: string, rank: number) => { const r = RESEARCH.find(x => x.id === id); return r ? r.base + r.step * rank + Math.floor(Math.pow(Math.max(0, rank - 19), 2) * .4) : Infinity; };
export const researchCost = (id: string, rank: number) => { const old = researchLegacyCost(id, rank); return rank < RESEARCH_GROWTH.from ? old : Math.round(old * Math.pow(RESEARCH_GROWTH.rate, rank - RESEARCH_GROWTH.from + 1)); };
/** rank 단계까지 쓴 세계석 합계(0 → rank). 재분배 반환액 계산에 씁니다. legacy 단계 아래는 전 가격으로 셉니다. */
export const researchSpent = (id: string, rank: number, legacy = 0) => { let sum = 0; for (let i = 0; i < rank; i++) sum += i < legacy ? researchLegacyCost(id, i) : researchCost(id, i); return sum; };
export const researchUnlocked = (rebirths: number, r: Pick<ResearchDef, 'rebirth'>) => rebirths >= (r.rebirth || 0);
/** v3.31 지금 살 수 있는 최대 단계: 승천하지 않았으면 ascendAbove까지. */
export const researchMaxFor = (s: { ascension?: number }, r: Pick<ResearchDef, 'max' | 'ascendAbove'>) => r.ascendAbove !== undefined && !((s.ascension || 0) > 0) ? Math.min(r.max, r.ascendAbove) : r.max;
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
    { id: 'cape', name: '여행자의 망토', slot: 'cape', style: 'balanced', description: '회피와 체력을 조금 보강합니다.' },
] as const;
/** 감정은 부위를 먼저 고릅니다. 무기의 공격 계열은 같은 확률입니다. */
export const GAMBLE_CATEGORIES = [
    { id: 'rod', name: '무기', slot: 'rod', offers: ['physical', 'magic'], description: '물리형·마법형 중 하나를 같은 확률로 획득합니다.' },
    { id: 'coat', name: '방어구', slot: 'coat', offers: ['coat'], description: '최대 체력과 물리·마법 방어를 보강합니다.' },
    { id: 'charm', name: '장신구', slot: 'charm', offers: ['charm'], description: '등급에 따라 정해진 치명타 확률(전설 10%, 태초 16%, 강화할수록 조금씩 상승)과 무작위 추가 옵션을 얻습니다. 치명타 100%를 넘으면 극 치명타 확률이 생깁니다.' },
    { id: 'cape', name: '망토', slot: 'cape', offers: ['cape'], description: '등급에 따라 정해진 회피(전설 11%, 태초 17%, 강화할수록 상승)와 체력 소량. 망토에만 상태이상 저항 옵션이 붙습니다.' },
] as const;
/** v27.19 환생 유물: 환생 횟수(rebirth)를 채우면 세계석 없이 받습니다. cost는 v27.19 이전 구매자 환불 기준값입니다. */
export const RELICS = [
    { id: 'memoryRod', name: '윤회의 샤이닝 로드', slot: 'rod', style: 'balanced', cost: 10, rebirth: 1, description: '환생해도 사라지지 않는 물리·마법 겸용 유물.', affix: { stat: 'goldBonus', name: '황금 기억', value: .2 } },
    { id: 'soulCoat', name: '영혼의 갑주', slot: 'coat', style: 'balanced', cost: 18, rebirth: 2, description: '강화와 옵션까지 다음 생에 이어지는 생존 유물.', affix: { stat: 'evasion', name: '영혼 회피', value: .12 } },
    { id: 'abyssCharm', name: '심연의 눈', slot: 'charm', style: 'balanced', cost: 28, rebirth: 3, description: '깊은 심연에 도전하는 모험가의 정밀 유물.', affix: { stat: 'accuracy', name: '심연 통찰', value: .2 } },
    { id: 'tideCape', name: '조류의 망토', slot: 'cape', style: 'balanced', cost: 36, rebirth: 4, description: '조류를 타고 환생을 건너는 유물. 상태이상 저항은 이식으로 새깁니다.', affix: { stat: 'dropBonus', name: '조류의 흐름', value: .1 } },
] as const;
/** v3.3 성장하는 유물: 같은 부위 장비를 소비해 옵션을 imprintSlots줄까지 이식(비용 = 그 장비 옵션 재설정 골드 × imprintCost). 성은 레벨이 정하는 상한(starBase + 레벨 ÷ 10)까지. */
export const RELIC_GROWTH = { imprintSlots: 3, imprintCost: 5, starBase: 12 };
/**
 * v3.66 계승 장비(유물 · 원시 고대 · 계승 태초) 위력 = (레벨 + 2) × 배율. 배율은 환생 0 → toRebirth에서 from → to로 곧게 오릅니다.
 * docs/gear-endgame.md 7절: Lv.100 · 22성 4부위 전투력(v3.66 실제 전투식)이 환생 200에서 유물 ≈ 신화 × 1.05(신화와 고대 사이),
 * 원시 고대 ≈ 신화 × 1.5, 계승 태초 ≈ 신화 × 2가 되도록 scripts/check-gear-ladder.mjs로 맞춘 값입니다. 환생 0에서는 유물이 신화의 약 0.75배, 계승 장비는 일반 고대·태초와 비슷합니다.
 */
export const HEIR_GROWTH = { toRebirth: 200, relic: { from: 2.57, to: 3.75 }, ancient: { from: 4.5, to: 5.92 }, primal: { from: 5.18, to: 7.73 } } as const;
/**
 * v3.66 예전 유물 위력(기본 × (1 + 환생 × 4%) × (1 + (레벨 − 1) × 1%)). 이 업데이트 전에 이미 가진 유물(relicLegacy)은 다음 승천까지
 * 예전 공식과 새 공식 중 높은 쪽을 씁니다(유저가 가진 유물이 갑자기 약해지지 않게). 승천 뒤 다시 받는 유물은 새 공식만 씁니다.
 */
export const RELIC_LEGACY = { base: { memoryRod: 45, soulCoat: 55, abyssCharm: 70, tideCape: 60 } as Record<string, number>, perRebirth: .04, perLevel: .01 };
export const legacyRelicPower = (id: string, rebirths: number, level = 1) => Math.round((RELIC_LEGACY.base[id] || 0) * (1 + Math.max(0, rebirths) * RELIC_LEGACY.perRebirth) * (1 + Math.max(0, level - 1) * RELIC_LEGACY.perLevel));
export type HeirKind = 'relic' | 'ancient' | 'primal';
export const heirFactor = (kind: HeirKind, rebirths: number) => { const g = HEIR_GROWTH[kind]; return g.from + (g.to - g.from) * Math.min(1, Math.max(0, rebirths) / HEIR_GROWTH.toRebirth); };
export const heirPower = (kind: HeirKind, rebirths: number, level = 1) => Math.round((Math.max(1, level) + 2) * heirFactor(kind, rebirths));
/** v3.66 원시 각성(고대 → 원시 고대): 정수 essenceBase × 10^(환생 ÷ rebirthScale). 환생 0 5천 · 100 약 3.4만 · 200 약 23만. 정수를 파밍할 이유입니다. */
export const AWAKENING = { essenceBase: 5000, rebirthScale: 120 };
export const awakenEssence = (rebirths: number) => Math.round(AWAKENING.essenceBase * Math.pow(10, Math.max(0, rebirths) / AWAKENING.rebirthScale));
/** v3.66 태초 계승: 태초 장비를 분해할 때마다 게이지 +1, gauge만큼 차면 태초 하나를 계승합니다(부위당 기대 약 18일 = 칠흑 장신구 하나와 같은 무게). 환생 유지, 승천 초기화. */
export const PRIMAL_INHERIT = { gauge: 3 };
/** v3.5 장비 레벨 올리기: 한 번에 step 레벨, 내 레벨까지. 위력(과 고정 수치 옵션)이 레벨 비례로 오르고 별은 0으로 돌아갑니다(저레벨에서 싸게 별을 올려 고레벨로 가져가는 것을 막음). 비용 = (250 + 위력 × 25) × 가격 보정(새 레벨) × costMultiplier. */
export const GEAR_LEVEL_UP = { step: 10, costMultiplier: 2 };
/** v25.7 청산 효율(0 = 연구 없음). 1단계 40%, 단계당 +15%, 5단계 100%. */
export const salvageRate = (s: Pick<State, 'permanent'>) => { const rank = researchRank(s, 'salvage'); return rank ? Math.min(1, .25 + rank * .15) : 0; };
/** v27.60 모험가의 유산: 새 생의 시작 레벨(Lv.1 + 2/단계, 10단계 Lv.21). */
export const startingLevel = (s: Pick<State, 'permanent'>) => 1 + researchRank(s, 'starting') * 2;

/**
 * v3.35 자동 분해기·자동 판매기 등급 선택. 연구 단계는 그대로(최대 2) 두고, 산 단계로 고를 수 있는 등급만 정합니다.
 * 1단계: 희귀·영웅·전설, 2단계: 신화·고대까지. 태초(칠흑 포함)는 고를 수 없습니다.
 * 고른 적이 없으면 예전과 같은 기본값(1단계 희귀, 2단계 영웅 이하).
 */
export type AutoDevice = 'salvage' | 'vend';
/** v3.38 두 장치 모두 연구 ‘자동 정리’(sortingNet) 단계를 씁니다. */
export const AUTO_RESEARCH: Record<AutoDevice, string> = { salvage: 'sortingNet', vend: 'sortingNet' };
export const autoMaxGrade = (rank: number) => rank >= 2 ? 5 : rank >= 1 ? 3 : 0;
export function autoGrades(s: Pick<State, 'permanent' | 'autoSellGrades' | 'autoVendGrades'>, device: AutoDevice) {
    const rank = researchRank(s, AUTO_RESEARCH[device]), max = autoMaxGrade(rank), chosen = device === 'salvage' ? s.autoSellGrades : s.autoVendGrades;
    const list = chosen ?? Array.from({ length: rank }, (_, i) => i + 1);
    return [...new Set(list)].filter(g => Number.isInteger(g) && g >= 1 && g <= max).sort((a, b) => a - b);
}
