import type { Stats } from '../types';
import { STAGES, DUNGEONS } from './world';
import { ODDS } from './odds';

/**
 * v22 장비 옵션.
 *
 * - 등급 번호(0~6)가 곧 붙는 옵션 수입니다. 일반 0개 · 희귀 1 · 영웅 2 · 전설 3 · 신화 4 · 고대 5 · 태초 6.
 * - 능력치 옵션은 기존 전투 수치만 올립니다. 고정 수치 옵션은 장비 위력에 비례하고, 비율 옵션은 고정 폭입니다.
 * - 양날 옵션은 큰 이득과 손해를 함께 줍니다.
 * - 규칙 옵션은 영웅(3) 이상에서 장비당 최대 1개. 기존 기술 규칙의 숫자 하나만 바꾸며, 같은 규칙은 cap까지만 합산합니다.
 * - 드롭한 사냥터·던전(origin)에 따라 특정 옵션이 잘 나옵니다.
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
    /** v3.72 더는 새로 굴리지 않는 옵션(이미 붙은 장비에서는 그대로 작동·표시). */
    retired?: boolean;
    /** v3.72 stat2도 굴림 · 등급 품질을 받는 이중 옵션(양날 옵션의 손해 쪽은 고정이라 false). */
    rollBoth?: boolean;
    /** v3.73 뽑힐 가중치(기본 1). 치명 피해처럼 강한 옵션은 덜 나옵니다. 저격 뽑기로 고르면 그대로 붙습니다. */
    weight?: number;
    /** v3.73 장비 합계 상한(GEAR_CAPS)을 받지 않는 옵션(피의 계약의 흡혈). 전체 능력치 상한은 그대로입니다. */
    uncapped?: boolean;
    /** v3.75 굴림 없이 base 그대로 붙는 옵션(수련 · 전공 · 꽝). 재련해도 바뀌지 않고, 레벨 올리기에도 그대로입니다. */
    fixed?: boolean;
    /** v3.75 아주 드문 옵션: 뽑힐 가중치는 서버 전용 ODDS.affix.rare(태초 · 칠흑에서만). */
    rare?: boolean;
    /** v3.75 꽝 옵션: 일반 추첨 대신 ODDS.affix.junk 확률로 한 장비에 최대 1줄 끼어듭니다(저격으로 고른 줄 · 칠흑 제외). */
    junk?: boolean;
    /** v25.8 이 출처(던전 id)에서 떨어진 장비에만 붙는 옵션. */
    onlyOrigin?: string;
    /** v3.5 이 부위에만 붙는 옵션. */
    onlySlot?: string;
    /** v3.5 percent 수치에 (장비 레벨 ÷ 100)^levelPower를 곱합니다(저레벨 장비에서는 아주 낮게). */
    levelPower?: number;
    description: string;
};
export type ItemAffix = { id: string; name: string; stat: GearStat; value: number; stat2?: GearStat; value2?: number; rule?: boolean; /** v3.82 유물에 이식한 줄의 원래 장비 등급(감쇠를 맞춘 표시). */ srcRarity?: number; /** v3.141 이식한 비율 옵션(초월 · 포식자 · 관통 등)을 유물 등급 품질로 맞춘 줄. 마이그레이션이 한 번만 손대도록 표시. */ pctFixed?: true };
/** 장비 옵션 합계 상한. v3.71 흡혈 6%p → 10%p(흡혈 옵션 상향과 함께). */
export const GEAR_CAPS: Partial<Record<GearStat, number>> = { lifesteal: .1, statusResist: .5 };

export const RULE_CAPS: Partial<Record<GearStat, number>> = {
    stunBonus: 1, controlBonus: 1, dotTurnsBonus: 2, poisonStackBonus: 3, /** 마력 평타 계수는 장비 몫만 상한(스킬 패시브는 상한 없음, v3.151). */ arcaneRatioBonus: .3, followUpBonus: .3, healBonus: .5, executeBonus: .15,
};

/** v3.5 불굴(상태이상 저항) 기본값: Lv.100 태초 22성(×1.66) 평균 굴림에서 상한 50%에 닿는 값. v3.71 등급 품질이 1.6 → 2.2가 되어 .188 → .137(같은 지점에서 상한). */
export const STATUS_RESIST_BASE = .137, STATUS_RESIST_STAR = .03;
export const AFFIX_POOL: AffixDef[] = [
    // 능력치 옵션
    { id: 'might', name: '맹공', stat: 'attack', kind: 'flat', base: .3, description: '물리 공격이 오릅니다.' },
    { id: 'arcana', name: '신비', stat: 'magic', kind: 'flat', base: .3, description: '마법 공격이 오릅니다.' },
    { id: 'vigor', name: '생명', stat: 'hp', kind: 'flat', base: 1.5, description: '최대 체력이 오릅니다.' },
    { id: 'plating', name: '철갑', stat: 'defense', kind: 'flat', base: .3, description: '물리 방어가 오릅니다.' },
    { id: 'ward', name: '정신', stat: 'resist', kind: 'flat', base: .3, description: '마법 방어가 오릅니다.' },
    { id: 'wellspring', name: '샘물', stat: 'mana', kind: 'flat', base: .2, retired: true, description: '최대 마나가 오릅니다. (v3.73 마력으로 통합, 새로 붙지 않음)' },
    { id: 'current', name: '순환', stat: 'manaRegen', kind: 'flat', base: .012, retired: true, description: '턴당 마나 회복이 오릅니다. (v3.73 마력으로 통합, 새로 붙지 않음)' },
    { id: 'precise', name: '정밀', stat: 'accuracy', kind: 'percent', base: .03, retired: true, description: '명중이 오릅니다. (v3.72 감각으로 통합, 새로 붙지 않음)' },
    // v3.73 이중 옵션: 위력(물공+마공) · 수호(물방+마방)는 한쪽 옵션보다 각 수치가 낮은 대신 두 쪽을 함께 올립니다. 마력은 샘물+순환 통합.
    { id: 'force', name: '위력', stat: 'attack', kind: 'flat', base: .2, stat2: 'magic', base2: .2, rollBoth: true, description: '물리 공격과 마법 공격이 함께 오릅니다.' },
    { id: 'guardian', name: '수호', stat: 'defense', kind: 'flat', base: .2, stat2: 'resist', base2: .2, rollBoth: true, description: '물리 방어와 마법 방어가 함께 오릅니다.' },
    // v3.90 최대 마나 위력 ×0.2 → ×0.225(생명 ×1.5의 15%: 체력 2,000 옵션이 뜨는 장비에서 마나 약 200~400).
    { id: 'flow', name: '마력', stat: 'mana', kind: 'flat', base: .225, stat2: 'manaRegen', base2: .012, rollBoth: true, description: '최대 마나와 턴당 마나 회복이 함께 오릅니다.' },
    { id: 'lucky', name: '행운', stat: 'crit', kind: 'percent', base: .015, description: '치명타 확률이 오릅니다.' },
    { id: 'brutal', name: '잔혹', stat: 'critDamage', kind: 'percent', base: .1, weight: .4, description: '치명 피해가 오릅니다.' },
    { id: 'piercing', name: '관통', stat: 'penetration', kind: 'percent', /* v3.84 .025 × 2 */ base: .05, description: '방어 관통이 오릅니다.' },
    { id: 'leech', name: '흡혈', stat: 'lifesteal', kind: 'percent', base: .015, description: '준 피해의 일부를 회복합니다 (장비 흡혈 합계 최대 10%p).' },
    { id: 'drift', name: '회피', stat: 'evasion', kind: 'percent', base: .02, retired: true, description: '회피가 오릅니다. (v3.72 감각으로 통합, 새로 붙지 않음)' },
    // v3.72 명중 · 회피 통합 옵션: 두 수치를 함께 굴립니다(예전 정밀 · 회피 한 줄씩과 같은 크기).
    { id: 'sense', name: '감각', stat: 'accuracy', kind: 'percent', base: .03, stat2: 'evasion', base2: .02, rollBoth: true, description: '명중과 회피가 함께 오릅니다.' },
    { id: 'swift', name: '신속', stat: 'speed', kind: 'percent', base: 2, description: '속도가 오릅니다.' },
    { id: 'venom', name: '고통', stat: 'dotBonus', kind: 'percent', base: .06, description: '출혈·중독·화상 피해가 모두 늘어납니다.' },
    { id: 'spiked', name: '가시', stat: 'thorns', kind: 'percent', base: .04, description: '맞을 때 물리 방어 비례 반격 (방어 친화도 적용).' },
    // v3.72 룬은 마력 평타가 켜짐/꺼짐 판정이라 마법 직업에는 효과가 없고 물리 직업은 평타가 마력 평타로 바뀌어 손해였습니다. 새로 붙지 않습니다.
    { id: 'runic', name: '룬', stat: 'arcaneStrike', kind: 'percent', base: .03, retired: true, description: '마법 직업의 마력 평타 확률이 오릅니다. (v3.72 새로 붙지 않음)' },
    { id: 'scholar', name: '학식', stat: 'expBonus', kind: 'percent', base: .03, description: '경험치 획득이 늘어납니다.' },
    { id: 'golden', name: '황금', stat: 'goldBonus', kind: 'percent', base: .04, description: '처치 골드가 늘어납니다.' },
    { id: 'seeker', name: '탐색', stat: 'dropBonus', kind: 'percent', base: .01, description: '장비 드롭 확률이 늘어납니다(상대 증가).' },
    // 양날 옵션: 큰 이득 + 손해. v3.71 이득과 손해를 함께 ×1.5(맞는 빌드엔 확실한 이득, 안 맞으면 확실한 손해).
    { id: 'berserk', name: '광전사', stat: 'attack', kind: 'flat', base: 1.35, stat2: 'defense', base2: -.675, description: '물리 공격이 크게 오르지만 물리 방어가 줄어듭니다. 물리 직업용(마법 직업에는 공격 이득이 거의 없음). 방어 손해는 장비 위력에 비례하고 굴림 없이 고정입니다.' },
    { id: 'glassCannon', name: '유리 대포', stat: 'magic', kind: 'flat', base: 1.35, stat2: 'hp', base2: -3.3, description: '마법 공격이 크게 오르지만 최대 체력이 줄어듭니다. 마법 직업용(물리 직업에는 공격 이득이 거의 없음). 체력 손해는 장비 위력에 비례하고 굴림 없이 고정이며, 연구 · 직업의 체력 배율이 곱해져 실제 최대 체력은 표시보다 크게 줄어듭니다.' },
    { id: 'bulwark', name: '성벽', stat: 'defense', kind: 'flat', base: 1.35, stat2: 'speed', base2: -6, description: '물리 방어가 크게 오르지만 느려집니다. 속도 손해는 고정 폭입니다.' },
    { id: 'gambit', name: '도박수', stat: 'crit', kind: 'percent', base: .075, stat2: 'accuracy', base2: -.09, description: '치명타가 크게 오르지만 명중이 줄어듭니다. 치명타 100%를 아직 못 채운 캐릭터에게 이득이고, 명중 손해는 고정 폭입니다.' },
    { id: 'bloodPact', name: '피의 계약', stat: 'lifesteal', kind: 'percent', base: .0525, stat2: 'hp', base2: -2.25, uncapped: true, description: '흡혈이 크게 오르지만 최대 체력이 줄어듭니다. 이 흡혈은 장비 · 전체 흡혈 상한을 받지 않습니다. 체력 손해는 장비 위력에 비례하고 굴림 없이 고정입니다.' },
    // v3.71 고대 이상 전용 옵션(minRarity 5): 고대 · 태초에서만 굴려지는 강한 옵션. 각인 감정으로는 고를 수 없습니다(낮은 등급이 나올 수 있어서).
    { id: 'ruin', name: '파멸', stat: 'critDamage', kind: 'percent', base: .2, minRarity: 5, weight: .4, description: '고대 이상. 치명 피해가 크게 오릅니다.' },
    { id: 'transcend', name: '초월', stat: 'allStats', kind: 'percent', base: .015, minRarity: 5, description: '고대 이상. 체력 · 마나 · 물리/마법 공격 · 물리/마법 방어가 % 오릅니다.' },
    { id: 'hunter', name: '포식자', stat: 'bossDamage', kind: 'percent', base: .05, minRarity: 5, description: '고대 이상. 보스 · 사냥감에게 주는 직접 피해가 오릅니다(다른 보스 피해와 곱연산, 지속 피해에는 붙지 않음).' },
    { id: 'tempo', name: '연격', stat: 'chainBonus', kind: 'percent', base: .02, minRarity: 5, description: '고대 이상. 연속 행동 확률이 오릅니다(속도와 무관).' },
    { id: 'bounty', name: '풍요', stat: 'expBonus', kind: 'percent', base: .04, stat2: 'goldBonus', base2: .05, rollBoth: true, minRarity: 5, description: '고대 이상. 경험치와 골드 획득이 함께 늘어납니다.' },
    // v3.5 망토 전용 옵션: 몬스터 상태이상 저항. 수치 = 18.8% × (레벨/100)² × 등급 품질 × 굴림, 착용 시 별당 +3%(다른 옵션과 달리 별 보정), 합계 최대 50%(Lv.100 태초 22성 ≈ 50%).
    // v3.75 태초 · 칠흑 전용 희귀 옵션(옵션 6줄짜리 장비에서만, 출현은 ODDS.affix.rare). 수련 · 전공은 고정 +1.
    { id: 'drill', name: '수련', stat: 'masteryFlat', kind: 'percent', base: 1, fixed: true, rare: true, minRarity: 6, description: '태초 · 칠흑. 처치당 스킬 숙련 +1(고정).' },
    { id: 'valor', name: '전공', stat: 'rankFlat', kind: 'percent', base: 1, fixed: true, rare: true, minRarity: 6, description: '태초 · 칠흑. 처치당 계급장 처치 수 +1(고정).' },
    { id: 'apex', name: '극치명', stat: 'superCrit', kind: 'percent', base: .014, rare: true, minRarity: 6, description: '태초 · 칠흑. 극 치명타 확률이 오릅니다.' },
    { id: 'distill', name: '정수', stat: 'essenceBonus', kind: 'percent', base: .23, rare: true, minRarity: 6, description: '태초 · 칠흑. 장비를 분해할 때 받는 정수가 늘어납니다.' },
    // v3.75 꽝 옵션: 효과가 거의 없는 줄. 옵션 재설정으로 바꿉니다.
    { id: 'ornate', name: '장식', stat: 'ornament', kind: 'percent', base: 1, fixed: true, junk: true, description: '꽝. 효과는 없고 장비 이름 앞에 ‘반짝이는’이 붙습니다.' },
    { id: 'pinch', name: '한 줌', stat: 'hp', kind: 'flat', base: 1, fixed: true, junk: true, description: '꽝. 최대 체력 +1(장비 위력과 무관).' },
    { id: 'steadfast', name: '불굴', stat: 'statusResist', kind: 'percent', base: STATUS_RESIST_BASE, onlySlot: 'cape', levelPower: 2, description: '망토 전용. 몬스터가 거는 기절·침묵·출혈·중독·화상·약화·감속을 이 확률로 무효화합니다. 별마다 +3%, 최대 50%.' },
    // v3.12 칠흑 장신구 고유 옵션(규칙). onlyOrigin 'onyx'라 어디서도 굴리지 않고 onyxAccessory가 직접 붙입니다.
    { id: 'onyxThorns', name: '공포의 가시', stat: 'thorns', kind: 'rule', base: .1, onlyOrigin: 'onyx', description: '칠흑. 맞을 때 물리 방어 비례 반격 +10%p.' },
    { id: 'onyxChain', name: '지휘관의 박자', stat: 'chainBonus', kind: 'rule', base: .1, onlyOrigin: 'onyx', description: '칠흑. 연속 행동 확률 +10%p(속도와 무관).' },
    { id: 'onyxControl', name: '거미의 실', stat: 'statusResist', kind: 'rule', base: .15, stat2: 'controlBonus', base2: 1, onlyOrigin: 'onyx', description: '칠흑. 상태이상 저항 +15%p, 내 기절·침묵·감속 지속 +1턴.' },
    { id: 'onyxArcane', name: '몽환의 마력', stat: 'arcaneStrike', kind: 'rule', base: .1, stat2: 'arcaneRatioBonus', base2: .1, onlyOrigin: 'onyx', description: '칠흑. 마력 평타 확률 +10%p, 마력 평타 배율 +10%p.' },
    { id: 'onyxWard', name: '사령의 가호', stat: 'statusResist', kind: 'rule', base: .2, stat2: 'hpRegen', base2: 15, onlyOrigin: 'onyx', description: '칠흑. 상태이상 저항 +20%p, 턴당 체력 회복 +15.' },
    { id: 'onyxBoss', name: '태양의 분노', stat: 'bossDamage', kind: 'rule', base: .15, onlyOrigin: 'onyx', description: '칠흑. 보스·사냥감에게 주는 피해 +15%.' },
    { id: 'onyxGenesis', name: '창세의 힘', stat: 'allStats', kind: 'rule', base: .05, onlyOrigin: 'onyx', description: '칠흑. 체력·마나·물리/마법 공격·물리/마법 방어 +5%.' },
    // v25.8 무릉도장 전용 옵션: 무릉도장 드롭에만 붙고 일반 옵션보다 강합니다.
    // v3.195 던전 보스 전리품 전용 옵션(규칙): 보스 피해 +5% + 그 보스의 기술을 이어받는 효과(v3.198 계승형으로 통일). onlyOrigin이 'loot:<던전>'이라 어떤 드롭에서도 굴리지 않고 systems/boss-loot.ts가 직접 붙입니다.
    // v3.196 칠흑 고유 옵션처럼 재설정 · 이식 · 재련이 막히고, 각성 단계만큼 커집니다(data/boss-loot.ts). 보스 공격 스킬 · 컨셉에 맞춰 다시 정할 예정.
    { id: 'lootGrotto', name: '버섯 왕관의 포자', stat: 'bossDamage', kind: 'rule', base: .05, stat2: 'arcaneStrike', base2: .05, onlyOrigin: 'loot:grotto', description: '머쉬맘 전리품. 보스·사냥감 피해 +5%, 마력 평타 확률 +5%p(머쉬맘의 마법 기본 공격).' },
    { id: 'lootKelp', name: '왕의 점액', stat: 'bossDamage', kind: 'rule', base: .05, stat2: 'poisonBonus', base2: .1, onlyOrigin: 'loot:kelpCatacomb', description: '킹 슬라임 전리품. 보스·사냥감 피해 +5%, 중독 피해 +10%(킹 슬라임의 독 포자).' },
    { id: 'lootCemetery', name: '썩지 않는 갓', stat: 'bossDamage', kind: 'rule', base: .05, stat2: 'stunBonus', base2: 1, onlyOrigin: 'loot:cemetery', description: '좀비 머쉬맘 전리품. 보스·사냥감 피해 +5%, 기절 지속 +1턴(합계 최대 +1, 좀비 머쉬맘의 몸통 박치기).' },
    { id: 'lootCaldera', name: '발록의 뿔', stat: 'bossDamage', kind: 'rule', base: .05, stat2: 'burnBonus', base2: .1, onlyOrigin: 'loot:caldera', description: '주니어 발록 전리품. 보스·사냥감 피해 +5%, 화상 피해 +10%(주니어 발록의 불꽃 숨결).' },
    { id: 'lootTemple', name: '하늘의 깃털', stat: 'bossDamage', kind: 'rule', base: .05, stat2: 'controlBonus', base2: 1, onlyOrigin: 'loot:temple', description: '엘리쟈 전리품. 보스·사냥감 피해 +5%, 침묵·감속 지속 +1턴(합계 최대 +1, 엘리쟈의 무음의 포효).' },
    { id: 'lootVent', name: '자쿰의 팔', stat: 'bossDamage', kind: 'rule', base: .05, stat2: 'followUpBonus', base2: .1, onlyOrigin: 'loot:ventCathedral', description: '자쿰 전리품. 보스·사냥감 피해 +5%, 추가타 위력 +10%p(합계 최대 +30%p, 자쿰의 여덟 팔 난타).' },
    { id: 'lootStar', name: '차원의 시계', stat: 'bossDamage', kind: 'rule', base: .05, stat2: 'chainBonus', base2: .03, onlyOrigin: 'loot:starSanctum', description: '파풀라투스 전리품. 보스·사냥감 피해 +5%, 연속 행동 확률 +3%p(파풀라투스의 시간 조작).' },
    { id: 'abyssMark', name: '심연의 각인', stat: 'attack', kind: 'flat', base: .55, onlyOrigin: 'abyss', description: '무릉도장 전용. 물리 공격이 크게 오릅니다.' },
    { id: 'abyssEcho', name: '심연의 공명', stat: 'magic', kind: 'flat', base: .55, onlyOrigin: 'abyss', description: '무릉도장 전용. 마법 공격이 크게 오릅니다.' },
    { id: 'abyssBreath', name: '심연의 숨', stat: 'lifesteal', kind: 'percent', base: .018, onlyOrigin: 'abyss', description: '무릉도장 전용. 흡혈이 오릅니다 (장비 흡혈 합계 최대 10%p).' },
    { id: 'abyssWeight', name: '심연의 무게', stat: 'penetration', kind: 'percent', /* v3.84 .04 × 2 */ base: .08, onlyOrigin: 'abyss', description: '무릉도장 전용. 방어 관통이 크게 오릅니다.' },
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

/** 사냥터·던전별로 잘 나오는 옵션(가중치 ×4). 명시되지 않은 곳은 균등합니다. 이름은 STAGES·DUNGEONS에서 가져옵니다. */
const ORIGIN_AFFIXES: Record<string, string[]> = {
    brook: ['vigor', 'plating', 'sense'],
    bay: ['ward', 'flow', 'scholar'],
    reef: ['lucky', 'brutal', 'gambit'],
    kelp: ['sense', 'swift', 'venom'],
    wreck: ['piercing', 'brutal', 'might', 'berserk'],
    volcanic: ['venom', 'arcana', 'spiked', 'lingering'],
    trench: ['leech', 'vigor', 'spiked', 'bloodPact'],
    moon: ['arcana', 'flow', 'glassCannon', 'runeCore'],
    starfall: ['scholar', 'seeker', 'lucky', 'echoing'],
    grotto: ['swift', 'concuss', 'binding'],
    kelpCatacomb: ['venom', 'saturate', 'mending'],
    cemetery: ['plating', 'spiked', 'bulwark'],
    caldera: ['venom', 'lingering', 'saturate'],
    temple: ['arcana', 'flow', 'runeCore', 'mending'],
    starSanctum: ['echoing', 'reaper', 'concuss'],
    duskVents: ['might', 'arcana', 'piercing', 'berserk', 'reaper'],
    coralForest: ['sense', 'leech', 'swift'],
    dragonNest: ['might', 'plating', 'berserk', 'spiked'],
    memoryLane: ['scholar', 'flow', 'arcana'],
    vanishingJourney: ['piercing', 'brutal', 'reaper', 'echoing'],
    ventCathedral: ['vigor', 'bulwark', 'spiked', 'lingering', 'mending'],
    abyss: ['leech', 'piercing', 'reaper', 'bloodPact', 'abyssMark', 'abyssEcho', 'abyssBreath', 'abyssWeight'],
};
export const ORIGIN_THEMES: Record<string, { name: string; affixes: string[] }> = Object.fromEntries(Object.entries(ORIGIN_AFFIXES).map(([id, affixes]) => [id, { name: [...STAGES, ...DUNGEONS].find(x => x.id === id)?.name || id, affixes }]));
const THEME_WEIGHT = 4;

/** 드롭 등급 확률(드롭이 일어났을 때). 합 1. */
/** v3.52 장비 등급 분포는 서버 전용(game/secret/odds.ts, ODDS.drop.rarity). */
/** 등급별 옵션 수치 배율: 높은 등급일수록 한 옵션도 강합니다. */
/** 옵션 수치의 등급 품질. v3.71 1 + 0.1 × 등급 → 1 + 0.2 × 등급(신화 1.8 · 고대 2.0 · 태초 2.2): 높은 등급의 한 줄이 확실히 강하도록. 이미 붙은 옵션 수치는 그대로입니다. */
export const rarityQuality = (rarity: number) => 1 + rarity * .2;
/** 분해 시 얻는 정수와 옵션 재설정에 드는 정수. */
export const ESSENCE_BY_RARITY = [1, 2, 4, 8, 16, 32, 64];
export const rerollEssence = (rarity: number) => 2 + rarity * 2;
/** v27.94 같은 장비를 재설정할수록 골드·정수 비용이 오릅니다. 1회마다 기본 비용의 +10%(선형, 상한 없음). */
export const REROLL_STEP_PCT = 10;
/** 기본 비용에 곱해 올림·내림하기 전 값. 정수 % 단위로 계산해 1.1 같은 소수 오차로 정수가 1 더 붙지 않게 합니다. */
export const rerollScaled = (base: number, rerolls = 0) => base * (100 + REROLL_STEP_PCT * Math.max(0, Math.floor(rerolls))) / 100;
/** v27.94 수치 재련: 옵션 종류는 그대로 두고 수치(0.6~1.4배 굴림)만 다시 굴립니다. 비용은 재설정 기본 비용의 절반(올림)이고 오르지 않습니다. */
export const refineEssence = (rarity: number) => Math.ceil(rerollEssence(rarity) / 2);
/**
 * v3.118 장비 비용 개편.
 * - 재련: 골드 없이 정수만. 이 장비를 재련할 때마다 정수가 ×REFINE_GROWTH(복리)로 오릅니다(Item.refines).
 * - 재설정: 정수 없이 골드만. 기본 비용 × REROLL_GOLD × 감정 가격의 환생 배율(시간당 골드를 따라감), 재설정할수록 +10%(그대로).
 * - 원시 고대 · 계승 태초 · 칠흑: 세계석 GEAR_RESET_PEARLS로 재련 · 재설정 횟수를 0으로(비용 초기화). 대신 별 0 · 추가 옵션 새로 굴림(최고 수치).
 */
/**
 * v3.131 재련 비용 곡선: 성장 1.08 → 1.1, 그리고 systems/equipment refineCost가 환생 배율 10^(환생 ÷ 120)(원시 각성과 같은 식, 난이도 정수 수입을 따라감)을 곱합니다.
 * 환생 100 태초(처음 48): 40회째 약 2천(난이도 100 정수 수입 20분) · 50회째 5천(1시간) · 60회째 1.4만(2.4시간) · 80회째 9만(16시간) · 100회째 62만(109시간).
 * 60~80회쯤부터 세계석 999 비용 초기화가 눈에 들어오도록 둔 값입니다(전에는 50회 누적 4천 정수라 초기화할 이유가 없었음).
 */
export const REFINE_GROWTH = 1.1, REROLL_GOLD = 20, GEAR_RESET_PEARLS = 999;
export const refineEssenceAt = (rarity: number, refines = 0, rebirthFactor = 1) => Math.ceil(refineEssence(rarity) * rebirthFactor * Math.pow(REFINE_GROWTH, Math.max(0, Math.floor(refines))));
const ROLL_MIN = .6, ROLL_SPAN = .8;
/**
 * v3.125 원시 고대 · 계승 태초 · 칠흑의 재련 상한: 보통 장비의 최고 굴림(수치 100%)을 1로 두고 그 1.5배 폭까지 굴립니다(수치 150%).
 * 계승 · 칠흑은 옵션이 최고 수치로 고정돼 재련할 이유가 없었습니다. 계승 · 비용 초기화는 그대로 100%에 놓고, 재련으로만 그 위를 노립니다.
 */
export const HEIR_ROLL_TOP = 1.5;
/**
 * v3.131 100%를 넘는 굴림은 균등이 아닙니다. 한 번 굴릴 때 HEIR_ROLL_TAIL(15%)만 100% 위로 가고, 그 안에서도 위로 갈수록 급히 드물어집니다
 * (100% 위 x만큼을 넘을 확률 = TAIL × (1 − x ÷ 50%)^TAIL_POWER): 110% 위 6.1% · 120% 위 1.9% · 130% 위 0.38% · 140% 위 0.024%. 기대 횟수 110% 16회 · 120% 52회 · 130% 260회.
 * 0~100%는 전처럼 균등(85%). 난수는 한 번만 씁니다. heirRollQuality가 난수 → 수치(0~1.5)를 바꿉니다.
 */
export const HEIR_ROLL_TAIL = .15, HEIR_ROLL_TAIL_POWER = 4;
export function heirRollQuality(u: number, top = HEIR_ROLL_TOP) {
    if (top <= 1) return u;
    const body = 1 - HEIR_ROLL_TAIL;
    if (u < body) return u / body;
    const v = Math.min(1, (u - body) / HEIR_ROLL_TAIL);
    return 1 + (top - 1) * (1 - Math.pow(1 - v, 1 / HEIR_ROLL_TAIL_POWER));
}
/** 100% 위 q(1~top)를 넘을 확률(화면 안내용). */
export const heirRollChanceAbove = (q: number, top = HEIR_ROLL_TOP) => q <= 1 ? 1 : q >= top ? 0 : HEIR_ROLL_TAIL * Math.pow(1 - (q - 1) / (top - 1), HEIR_ROLL_TAIL_POWER);
/** v3.5 레벨 비례 옵션(불굴): (장비 레벨 ÷ 100)^levelPower, Lv.100 이상은 1. */
const levelScale = (def: AffixDef, level: number) => def.levelPower ? Math.pow(Math.min(1, Math.max(1, level) / 100), def.levelPower) : 1;

/**
 * v3.133 규칙 옵션(◆ 기절 · 지속 등 8종, 장비당 1줄)의 등장 가중치. 일반 옵션(30종)과 같은 1이던 때는 전설 60% · 신화 70% · 태초 80%의 장비에 규칙 옵션이 붙어
 * ‘희귀한 옵션’이라는 인상과 어긋났습니다. .25면 전설 약 22% · 신화 29% · 고대 31% · 태초 36%. 희귀(★) 옵션은 따로 ODDS.affix.rare, 테마 옵션은 THEME_WEIGHT를 곱합니다.
 */
export const RULE_WEIGHT = .25;
function pickAffix(pool: AffixDef[], origin: string | undefined, rng: () => number) {
    const theme = new Set(ORIGIN_THEMES[origin || '']?.affixes || []);
    const weights = pool.map(a => (theme.has(a.id) ? THEME_WEIGHT : 1) * (a.rare ? ODDS.affix.rare : a.kind === 'rule' ? RULE_WEIGHT * (a.weight ?? 1) : a.weight ?? 1));
    let roll = rng() * weights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll <= 0) return pool[i]; }
    return pool[pool.length - 1];
}
export function rollOption(def: AffixDef, power: number, rarity: number, rng: () => number, level = 1, top = 1): ItemAffix {
    if (def.kind === 'rule') return { id: def.id, name: def.name, stat: def.stat, value: def.base, rule: true };
    if (def.fixed) return { id: def.id, name: def.name, stat: def.stat, value: def.base };
    // v3.125 top은 굴림 폭 배율(보통 1, 계승 · 칠흑 재련은 HEIR_ROLL_TOP): 최고가 0.6 + 0.8 × top배까지 늘어납니다. v3.131 100% 위는 heirRollQuality의 꼬리 분포.
    return optionAtQuality(def, power, rarity, level, heirRollQuality(rng(), top));
}
/** v3.189 정해진 수치 위치(0 = 최저, 1 = 보통 최고, 1.5 = 계승 최고)로 옵션을 만듭니다. 규칙 · 고정 옵션은 기본값 그대로. */
export function optionAtQuality(def: AffixDef, power: number, rarity: number, level: number, quality: number): ItemAffix {
    if (def.kind === 'rule') return { id: def.id, name: def.name, stat: def.stat, value: def.base, rule: true };
    if (def.fixed) return { id: def.id, name: def.name, stat: def.stat, value: def.base };
    // 수치 굴림: 0.6~1.4배 × 등급 배율. 양날 옵션의 손해 쪽은 굴림 없이 고정입니다. v3.5 levelPower 옵션은 (레벨/100)^levelPower를 곱합니다.
    const roll = (ROLL_MIN + quality * ROLL_SPAN) * rarityQuality(rarity) * levelScale(def, level);
    const scale = def.kind === 'flat' ? Math.max(1, power) : 1;
    const round = (n: number) => def.kind === 'flat' ? Math.round(n) : Math.round(n * 10000) / 10000;
    const out: ItemAffix = { id: def.id, name: def.name, stat: def.stat, value: round(def.base * scale * roll) };
    if (def.stat2 && def.base2) {
        // 체력·공격·방어 같은 고정 수치 손해는 위력 비례, 속도·명중 같은 손해는 고정 폭입니다.
        // v3.119 턴당 마나 회복(마력의 둘째 수치)도 위력 비례입니다(빠져 있어 0.01 남짓 · ‘+0’으로 붙던 버그).
        const flatStat = ['hp', 'attack', 'magic', 'defense', 'resist', 'mana', 'manaRegen'].includes(def.stat2);
        out.stat2 = def.stat2;
        out.value2 = def.rollBoth ? (flatStat ? Math.round(def.base2 * Math.max(1, power) * roll) : Math.round(def.base2 * roll * 10000) / 10000) : flatStat ? Math.round(def.base2 * Math.max(1, power)) : Math.round(def.base2 * 10000) / 10000;
    }
    return out;
}
/** v27.94 수치 재련: 같은 옵션의 수치만 다시 굴립니다. 양날 옵션의 손해 쪽은 고정이라 그대로입니다. */
export function refineOption(x: ItemAffix, power: number, rarity: number, rng: () => number, level = 1, top = 1): ItemAffix {
    const def = affixDef(x.id);
    if (!def || x.rule || def.kind === 'rule' || def.fixed) return x;
    const next = rollOption(def, power, rarity, rng, level, top);
    // v3.72 이중 옵션(rollBoth, 예: 감각)은 두 수치를 같은 굴림으로 함께 바꿉니다.
    return def.rollBoth ? { ...x, value: next.value, value2: next.value2 } : { ...x, value: next.value };
}
/** v27.94 옵션 수치가 굴림 범위에서 어디쯤인지(0 = 최저, 1 = 보통 최고). 규칙 옵션·알 수 없는 옵션은 null. v3.125 top(계승 · 칠흑 1.5)까지 1을 넘을 수 있습니다. */
export function affixQuality(x: ItemAffix, power: number, rarity: number, level = 1, top = 1): number | null {
    const def = affixDef(x.id);
    if (!def || x.rule || def.kind === 'rule' || def.fixed || !def.base) return null;
    const scale = def.kind === 'flat' ? Math.max(1, power) : 1;
    const roll = x.value / (def.base * scale * rarityQuality(rarity) * levelScale(def, level));
    return Math.min(top, Math.max(0, (roll - ROLL_MIN) / ROLL_SPAN));
}
/** v3.5 레벨 올리기 뒤 옵션 수치 보정: 고정 수치는 위력 비례(ratio), 레벨 비례 옵션(불굴)은 레벨 보정 비율, 비율·규칙 옵션은 그대로. */
export function rescaleAffix(x: ItemAffix, ratio: number, oldLevel: number, newLevel: number): ItemAffix {
    const def = affixDef(x.id);
    if (!def || x.rule || def.kind === 'rule' || def.fixed) return x;
    const out = { ...x };
    if (def.kind === 'flat') out.value = Math.round(x.value * ratio);
    else if (def.levelPower) out.value = Math.round(x.value * levelScale(def, newLevel) / levelScale(def, oldLevel) * 10000) / 10000;
    if (def.stat2 && out.value2 && ['hp', 'attack', 'magic', 'defense', 'resist', 'mana'].includes(def.stat2)) out.value2 = Math.round(out.value2 * ratio);
    return out;
}
/** 등급 번호만큼 옵션을 굴립니다. 같은 옵션은 한 번만, 규칙 옵션은 장비당 최대 1개. */
export function rollAffixes(rarity: number, power: number, origin: string | undefined, rng: () => number, keep: ItemAffix[] = [], slot?: string, level = 1): ItemAffix[] {
    const out = [...keep];
    while (out.length < rarity) {
        const hasRule = out.some(a => a.rule);
        // v3.75 꽝: 한 장비에 최대 1줄, 칠흑 제외. 확률이 0이면(화면 · 비공개) 난수를 쓰지 않습니다.
        if (ODDS.affix.junk > 0 && origin !== 'onyx' && !out.some(a => affixDef(a.id)?.junk) && rng() < ODDS.affix.junk) { out.push(rollOption(JUNK_AFFIXES[Math.floor(rng() * JUNK_AFFIXES.length)], power, rarity, rng, level)); continue; }
        const pool = AFFIX_POOL.filter(a => !a.junk && !out.some(o => o.id === a.id) && (!a.onlyOrigin || a.onlyOrigin === origin) && (!a.onlySlot || a.onlySlot === slot) && !a.retired && rarity >= (a.minRarity || 0) && (a.kind !== 'rule' || !hasRule));
        if (!pool.length) break;
        out.push(rollOption(pickAffix(pool, origin, rng), power, rarity, rng, level));
    }
    return out;
}
export const affixDef = (id: string) => AFFIX_POOL.find(a => a.id === id);
const JUNK_AFFIXES = AFFIX_POOL.filter(a => a.junk);
/** v3.75 장식(꽝)이 붙은 장비 이름 앞에 붙는 말. 옵션이 바뀌면 syncOrnateName으로 맞춥니다. */
export const ORNATE_PREFIX = '반짝이는 ';
export function syncOrnateName<T extends { name: string; affixes?: ItemAffix[] }>(item: T): T {
    const base = item.name.startsWith(ORNATE_PREFIX) ? item.name.slice(ORNATE_PREFIX.length) : item.name;
    item.name = item.affixes?.some(a => a.id === 'ornate') ? ORNATE_PREFIX + base : base;
    return item;
}
