import type { Attribute, Stats } from '../types';
import { PROGRESSION } from './progression';
import { EXPANSION_JOBS } from './expansion';
import { LINEAGE_JOBS, NEW_LINEAGES, LINEAGE_HINTS } from './expansion-lineages';
import { V24_JOBS, V24_HINTS } from './expansion-v24';
import { SUPPORT_JOBS, SUPPORT_JOB_DESC, SUPPORT_HINTS } from './support-rework';
import { V25_JOBS, V25_HINTS } from './expansion-v25';
import { DEFENSE_JOBS, DEFENSE_HINTS, DEFENSE_LINEAGES } from './expansion-defense';
import { INVERSION_JOBS, INVERSION_LINEAGES } from './expansion-inversion';
import { MONOSTAT_JOBS, MONOSTAT_LINEAGES } from './expansion-monostat';
import { mapleJobNames, MAPLE_LINEAGE_NAMES } from './maple-names';
import { MAPLE_JOB_FLAVOR, MAPLE_LINEAGE_SUMMARY } from './maple-flavor';
import { SPECIAL_JOBS, RESTRAINT_LINEAGE, STAFF_LINEAGE } from './specials';
import { TRAINING_JOBS, RETIRED_TRAINING } from './training';
import { STAT_TRAINING_JOBS } from './stat-training';
/** 전직 전 기본 직업(무직) id. 세이브에 저장되는 값이라 바꾸지 않습니다. */
export const BASE_JOB = 'fisher';
export type Job = {
    id: string;
    name: string;
    title: string;
    desc: string;
    attack: number;
    magic: number;
    hp: number;
    defense: number;
    resist: number;
    crit: number;
    /** Additive experience bonus, separate from combat multipliers. */
    expBonus?: number;
    tier: number;
    level: number;
    parent?: string;
    requires: Partial<Record<Attribute, number>>;
    mastery: number;
    role: string;
    tree: JobTreeId;
    /** Cumulative wins needed to complete this job's mastery track. */
    masteryTarget?: number;
    /** Extra multiplier applied to positive job bonuses after mastery is complete. */
    masteryBoost?: number;
    requiresSkillMastery?: Record<string, number>;
    requiresJobMastery?: Record<string, number>;
    /** v25.4 숙달(숙련 목표 달성)한 직업 수 조건. 떠돌이 계보가 씁니다. */
    requiresMastered?: number;
    /** 직접 배분한 능력치 포인트(레벨 기본치 제외) 조건. */
    requiresAllocated?: Partial<Record<Attribute, number>>;
    penalties?: Partial<Stats>;
    /**
     * 고정 수치 직업 보정(1~3차). 차수가 오를수록 능력치가 커지므로 1~3차의 플러스 보정은 배율이 아니라 이 값을 더합니다.
     * attack·magic·hp·defense·resist 배율은 1 이하(마이너스 보정)만 씁니다. 숙달하면 (1 + masteryBoost)배가 됩니다.
     */
    bonus?: Partial<Record<JobStatKey, number>>;
    branchless?: boolean;
    /** v25: 1·2차여도 전용 기술을 3개 이상 가진 특수 직업(제로 (1차)·玄). */
    fullKit?: boolean;
    /** v3.200 궁극의 모험가: 다른 계보의 5차 전용 기술을 계승해 써도 효율이 깎이지 않습니다(signatureScale · outsiderChance 면제). */
    signatureFree?: boolean;
    /** v3.221 이 직업이 현재 직업일 때 숙련의 까미 출현 확률 가산(0.5 = ×1.5). 까미 사냥꾼. */
    mimicFind?: number;
    /** v3.221 이 직업이 현재 직업일 때 경험의 누리 출현 확률 가산(0.5 = ×1.5). 누리 추적자. */
    nuriFind?: number;
    /** v3.200 계급장 조건: 이 계급(data/rank.ts RANKS id) 이상. 재입대한 적이 있으면 이미 넘은 것으로 봅니다. */
    requiresRank?: string;
    /** v3.219 이 직업들 가운데 하나의 숙련이 n 이상(참모 계보 4차: 보급관 또는 군의관). */
    requiresAnyJobMastery?: Record<string, number>;
    /** 회복 직업. 체력이 충분할 때 쓴 회복 기술도 피해가 줄지 않고, v3.54부터 넘친 회복량 × overhealDamage를 적에게 피해로 줍니다. */
    healer?: boolean;
    /** v3.69 옛 독립 수련(data/training.ts): 새로 전직할 수 없고 화면에 보이지 않습니다. 숙달 기록은 숙달 수에 셉니다. */
    retired?: boolean;
    /** v3.69 이 직업으로 사냥할 때 처치 경험치·골드 배율(수련 직업 0.5). */
    rewardScale?: number;
    /** v3.61 세부 역할(data/roles.ts). 비밀 직업은 데이터에 직접, 공개 직업은 계보 기본값·직업별 표로 정합니다. */
    subRole?: import('./roles').SubRoleId;
    hidden?: boolean;
    rebirth?: number;
    /** 계보 id. 없으면 루트 조상 id, 상위·하위가 없는 1차 직업은 `${tree}-independent`(lineageOf). */
    lineage?: string;
    /** 직업 성격 태그. 없으면 role을 '·'로 나눈 값(jobTags). */
    tags?: string[];
    /** 미발견 히든·문 직업의 실루엣 카드에 보이는 한 줄 힌트. */
    hint?: string;
    /** v3.44 카탈로그 실루엣: 이름·조건·능력치를 뺀 비밀 직업(화면 전용, 서버 표에는 없음). */
    veiled?: boolean;
    /**
     * v27.4 제약 직업 틀. 체력 ×0.01처럼 큰 마이너스 배율을 가진 직업이 "어떻게 살아남는지"를 데이터로 선언합니다.
     * PvE 밸런스 대상이 아니라 기술 계승·예능·결투 저격용입니다. 새 제약 직업은 attack/hp/defense 배율 + 이 필드만 적으면 됩니다.
     * 규칙(tests/classes.test.mjs): 배율 0.3 이하가 하나라도 있으면 constraint를 반드시 선언하고 장치를 하나 이상 둡니다.
     */
    constraint?: JobConstraint;
};
/** 제약 직업의 생존 장치. 전투 엔진(combat.ts)과 능력치(stats.ts)가 그대로 읽습니다. */
export type ConstraintDevices = {
    /** 턴 순서에서 항상 먼저 행동합니다(속도 비교 생략). 연속 행동 확률은 속도대로입니다. */
    firstStrike?: boolean;
    /** 쓰러질 피해를 받으면 체력 1로 버팁니다(전투당 charges번, heal은 최대 체력 비율 회복). */
    lastStand?: { charges: number; heal?: number };
    /** 회피 +n(0.5 = +50%p). 명중 공식은 그대로(마법은 절반만 적용). */
    evasion?: number;
    /** 받는 피해 감소율(지속 피해 제외). */
    damageTaken?: number;
    /** 주는 피해 증가율. */
    damageDealt?: number;
    /** 모든 공격이 반드시 명중합니다. */
    sureHit?: boolean;
};
export type JobConstraint = { label: string; desc: string; devices: ConstraintDevices };
/** 제약 장치를 사람이 읽는 문구로. 직업 상세·도움말이 씁니다. */
export function constraintDeviceLabels(d: ConstraintDevices) {
    const out: string[] = [];
    if (d.firstStrike) out.push('항상 선공');
    if (d.lastStand) out.push(`체력 1로 버팀 ×${d.lastStand.charges}${d.lastStand.heal ? ` · 회복 ${Math.round(d.lastStand.heal * 100)}%` : ''}`);
    if (d.evasion) out.push(`회피 +${Math.round(d.evasion * 100)}%p`);
    if (d.damageTaken) out.push(`받는 피해 -${Math.round(d.damageTaken * 100)}%`);
    if (d.damageDealt) out.push(`주는 피해 +${Math.round(d.damageDealt * 100)}%`);
    if (d.sureHit) out.push('반드시 명중');
    return out;
}
/** 제약 직업 판정: 다섯 배율 중 하나라도 constraintThreshold 이하. */
const CONSTRAINT_THRESHOLD = .3;
export const isConstraintJob = (j: Pick<Job, 'attack' | 'magic' | 'hp' | 'defense' | 'resist'>) => [j.attack, j.magic, j.hp, j.defense, j.resist].some(n => n <= CONSTRAINT_THRESHOLD);
/** 직업 보정을 받는 다섯 능력치. */
export type JobStatKey = 'attack' | 'magic' | 'hp' | 'defense' | 'resist';
export type JobTreeId = 'physical' | 'magic' | 'defense' | 'status' | 'hybrid' | 'support' | 'mystery';
export type JobTree = {
    id: JobTreeId;
    name: string;
    subtitle: string;
    description: string;
    accent: string;
};
export const JOB_TREES: JobTree[] = [
    { id: 'physical', name: '물리', subtitle: '근력 · 기민 · 물리', description: '근력과 기민으로 적을 꿰뚫고 치명타·연타를 쌓는 계열입니다.', accent: '#d88a68' },
    { id: 'magic', name: '마법', subtitle: '지능 · 정신 · 마법', description: '마나와 주문 확률을 이용해 큰 마법 피해·회복·약화를 만드는 계열입니다.', accent: '#75b8d6' },
    { id: 'defense', name: '방어', subtitle: '체질 · 방어 · 회복', description: '체력과 방어를 바탕으로 회복·기절·반격·흡혈을 조합하는 계열입니다.', accent: '#8fc49b' },
    { id: 'status', name: '상태이상', subtitle: '출혈 · 중독 · 저주 · 제어', description: '방어를 무시하는 지속 피해와 기절·침묵·약화로 적을 무너뜨리는 계열입니다. 걸어 둔 상태이상에 연계할수록 강해집니다.', accent: '#b6c86a' },
    { id: 'hybrid', name: '복합', subtitle: '물리 + 마법 · HP · MP', description: '물리와 마법, 체력과 마나를 함께 쓰는 복합 계열입니다.', accent: '#c0a1dc' },
    { id: 'support', name: '보조', subtitle: '경험치 · 보상 · 속도 · 파밍', description: '직접 화력보다 성장 속도·보상·파밍·가속으로 편성을 보조하는 계열입니다.', accent: '#e0b36a' },
    { id: 'mystery', name: '???', subtitle: '초보자 · 히든 · 페널티 · 몬스터', description: '모든 모험의 출발점인 초보자와, 조건을 만족해야 드러나는 숨은 직업, 페널티를 숙련으로 극복하는 직업, 몬스터 혈족의 모음입니다.', accent: '#9a9ab8' },
];
export const JOBS: Job[] = [
    { id: BASE_JOB, name: '무직', title: '가능성이 시작되는 곳', desc: '공용 기술을 익히며 자신만의 항해를 준비합니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 0, level: 1, requires: {}, mastery: 0, role: '균형', tree: 'hybrid' },
    { id: 'harpoon', name: '작살 사냥꾼', title: '정교한 한 방', desc: '물리 공격과 치명타에 아주 작은 보정만 받는 첫 전직. 이후 관통·폭발 계열로 갈라집니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .02, bonus: { attack: 4 }, tier: 1, level: 10, requires: { str: 12, dex: 10 }, mastery: 0, role: '물리 입문', tree: 'physical' },
    { id: 'tide', name: '조류 술사', title: '조류를 움직이는 의지', desc: '마법 공격과 저항에 작은 보정만 받는 첫 전직. 주문의 방향은 후속 직업에서 결정됩니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 10, hp: 5, resist: 1 }, tier: 1, level: 10, requires: { int: 12, wis: 10 }, mastery: 0, role: '마법 입문', tree: 'magic' },
    { id: 'warden', name: '산호 수호자', title: '바다의 방패', desc: '체력과 방어에 작은 보정만 받는 첫 전직. 후속 직업에서 회복·제어·반격 중 하나를 고릅니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { hp: 30, defense: 2, resist: 1 }, tier: 1, level: 10, requires: { vit: 12, str: 10 }, mastery: 0, role: '방어 입문', tree: 'defense' },
    { id: 'whaler', name: '거경 사냥꾼', title: '거대한 적을 꿰뚫는 자', desc: '물리 공격과 치명타가 크게 오르는 관통 특화. 높은 체력의 적을 상대합니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .1, bonus: { attack: 38, hp: 40 }, tier: 2, level: 25, parent: 'harpoon', requires: { str: 35, dex: 20 }, mastery: 75, role: '물리 폭발', tree: 'physical' },
    { id: 'corsair', name: '폭풍 유격수', title: '파도보다 먼저 움직인다', desc: '물리 공격과 치명타가 오르는 사냥꾼. 기민과 출혈을 조합합니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .12, bonus: { attack: 16 }, tier: 2, level: 25, parent: 'harpoon', requires: { dex: 35, luk: 20 }, mastery: 75, role: '회피·출혈', tree: 'physical' },
    { id: 'tempest', name: '난바다 폭풍술사', title: '심연이 답하는 주문', desc: '약화와 폭발 주문을 쓰는 주문사. 마법 공격이 크게 오릅니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .05, bonus: { magic: 50, resist: 4 }, tier: 2, level: 25, parent: 'tide', requires: { int: 35, wis: 20 }, mastery: 75, role: '마법 폭발', tree: 'magic' },
    { id: 'oracle', name: '진주 예언자', title: '마르지 않는 생명의 샘', desc: '마법 공격·체력·마법 방어가 함께 오르는 유지형. 회복과 흡수를 씁니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 30, hp: 100, resist: 11 }, tier: 2, level: 25, parent: 'tide', requires: { wis: 35, vit: 20 }, mastery: 75, role: '회복·유지', tree: 'magic' },
    { id: 'bulwark', name: '쇠닻 철벽', title: '가라앉지 않는 요새', desc: '체력과 물리 방어가 크게 오르는 요새. 방어 기반 공격과 기절을 씁니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { attack: 11, hp: 185, defense: 17, resist: 4 }, tier: 2, level: 25, parent: 'warden', requires: { vit: 35, str: 20 }, mastery: 75, role: '방어·제어', tree: 'defense' },
    { id: 'paladin', name: '빛결 술사', title: '빛을 작살에 싣는다', desc: '마법 공격 계수로 물리 피해를 주는 역전 딜러 2차. 지능을 올리면 일격이 세지고, 피해의 일부를 흡수합니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .05, bonus: { magic: 36, hp: 80, resist: 7 }, tier: 2, level: 25, parent: 'tide', requires: { int: 25, wis: 20 }, mastery: 75, role: '역전 딜러·흡수', tree: 'hybrid', lineage: 'paladin' },
    { id: 'wanderer', name: '이형 항해자', title: '어느 깃발에도 속하지 않는 자', desc: '서플러스 서플라이로 명중과 회피를 익히는 복합 입문 직업. 다른 직업에서 계승한 기술의 빈틈을 보완합니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .01, bonus: { attack: 1, magic: 1, hp: 5 }, tier: 1, level: 10, requires: { str: 10, int: 10, vit: 10 }, mastery: 0, role: '복합 입문', tree: 'hybrid' },
    { id: 'chimera', name: '두 바다 융합자', title: '살과 마나를 한 덩어리로', desc: '명중과 회피를 함께 키우는 2차 직업. 여섯 능력치가 고를수록 핀포인트 로켓이 세집니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .05, bonus: { attack: 33, magic: 36, hp: 125, defense: 3, resist: 4 }, tier: 2, level: 25, parent: 'wanderer', requires: { str: 25, int: 25, vit: 20 }, mastery: 75, role: 'HP·MP 복합', tree: 'hybrid' },
];

// 직업은 전투 공식과 분리된 데이터입니다. 숫자를 낮추거나 조건을 바꿔도 저장 형식은 변하지 않습니다.
// 1차 직업은 거의 중립, 2차는 방향성, 3차는 큰 대가와 뚜렷한 보상을 갖도록 설계했습니다.
JOBS.push(
    { id: 'tidalBrawler', name: '조수 투사', title: '주먹으로 물살을 가른다', desc: '아처와 같은 출발선에서 근접 연타를 연구하는 분기입니다. 추가타가 전류를 켜고, 전류가 추가타를 늘립니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .01, bonus: { attack: 2, defense: 1 }, tier: 1, level: 10, requires: { str: 10, dex: 10 }, mastery: 0, role: '근접 입문', tree: 'physical' },
    { id: 'currentScholar', name: '해류 연구자', title: '파도의 문장을 읽는다', desc: '마력 평타(기본 공격)를 주력으로 삼는 마법 입문 직업입니다. 패시브가 평타 계수를 올리고, 약화 주문으로 거듭니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 4, resist: 1 }, tier: 1, level: 10, requires: { int: 10, wis: 10 }, mastery: 0, role: '마력 평타 입문', tree: 'magic' },
    { id: 'seagrassKeeper', name: '해초 돌봄꾼', title: '작은 회복을 반복한다', desc: '강한 탱커 대신 낮은 비용 회복과 지속전을 선택하는 보조 입문 직업입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { hp: 35, defense: 3, resist: 3 }, tier: 1, level: 10, requires: { vit: 10, wis: 10 }, mastery: 0, role: '보조 입문', tree: 'defense' },
    { id: 'squidJester', name: '오징어 광대', title: '웃음 뒤에 먹물을 숨긴다', desc: '정확한 한 방 대신 확률·치명 조합을 노리는 입문 직업입니다. 팬텀 인스팅트와 더블 피어싱을 익힙니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .03, bonus: { attack: 4, magic: 4 }, tier: 1, level: 10, requires: { dex: 10, luk: 10 }, mastery: 0, role: '확률 입문', tree: 'support' },
    { id: 'reefBrawler', name: '암초 격투가', title: '부딪힐수록 단단해진다', desc: '체력 비례 챔질과 흡혈을 섞는 근접형. 물리 공격은 과하지 않지만 장기전에 강합니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .02, bonus: { attack: 13, hp: 35, defense: 3 }, tier: 2, level: 25, parent: 'harpoon', requires: { str: 25, vit: 20 }, mastery: 75, role: 'HP·흡혈', tree: 'physical' },
    { id: 'lineBreaker', name: '쇄도 돌파자', title: '낚싯줄의 약한 곳을 찾는다', desc: '방어 관통과 약화로 강한 적을 먼저 무너뜨리는 정석형 분기입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .02, bonus: { attack: 11, hp: 10, defense: 2 }, tier: 2, level: 25, parent: 'tidalBrawler', requires: { str: 28, dex: 24 }, mastery: 75, role: '관통·약화', tree: 'physical' },
    { id: 'krakenSlayer', name: '크라켄 처형자', title: '거대한 심장을 꿰뚫는다', desc: '높은 체력의 적에게만 진짜 힘을 내는 3차 직업. 명중 페널티가 있습니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .12, bonus: { attack: 86, hp: 90, defense: 2 }, tier: 3, level: 40, parent: 'whaler', requires: { str: 50, dex: 35 }, mastery: 150, role: '처형·출혈', tree: 'physical', penalties: { accuracy: -.04 } },
    { id: 'needleDancer', name: '바늘 무희', title: '한 걸음마다 약점을 남긴다', desc: '회피·치명·출혈로 몰아치는 고속 3차 직업입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .25, bonus: { attack: 47 }, tier: 3, level: 40, parent: 'corsair', requires: { dex: 50, luk: 38 }, mastery: 150, role: '회피·치명', tree: 'physical' },
    { id: 'runeSwell', name: '문양 파도술사', title: '룬을 물결에 새긴다', desc: '마법 공격과 약화 확률을 균형 있게 끌어올리는 주문 분기입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .02, bonus: { magic: 18, hp: 10, resist: 2 }, tier: 2, level: 25, parent: 'tide', requires: { int: 25, wis: 25 }, mastery: 75, role: '약화·마나', tree: 'magic' },
    { id: 'saltAlchemist', name: '염수 연금술사', title: '소금으로 갑옷을 녹인다', desc: '부식(방어 · 속도 감소)을 걸고 평타 계수를 더 올리는 2차 직업입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .05, bonus: { magic: 24, resist: 1 }, tier: 2, level: 25, parent: 'currentScholar', requires: { int: 28, luk: 22 }, mastery: 75, role: '부식·마력 평타', tree: 'magic' },
    { id: 'stormScribe', name: '폭풍 필경사', title: '번개를 문장으로 봉인한다', desc: '한 번의 주문에 모든 마나를 태우는 고점형 3차 직업입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .08, bonus: { magic: 89, resist: 4 }, tier: 3, level: 40, parent: 'tempest', requires: { int: 50, wis: 34 }, mastery: 150, role: '마나·폭발', tree: 'magic' },
    { id: 'lunarOracle', name: '월광 예언자', title: '달의 조수로 미래를 고친다', desc: '높은 회복력과 저항을 얻지만 물리 공격에 약한 유지형 3차 직업입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 55, hp: 175, resist: 16 }, tier: 3, level: 40, parent: 'oracle', requires: { wis: 50, vit: 35 }, mastery: 150, role: '회복·저항', tree: 'magic' },
    { id: 'reefMedic', name: '암초 의무관', title: '상처를 산호로 꿰맨다', desc: '작은 회복을 자주 발동해 자동 전투의 안정성을 높이는 보조 분기입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 2, hp: 65, defense: 4, resist: 3 }, tier: 2, level: 25, parent: 'seagrassKeeper', requires: { vit: 28, wis: 22 }, mastery: 75, role: '회복·흡혈', tree: 'defense' },
    { id: 'bellTurtle', name: '종거북 수호자', title: '울림으로 적의 박자를 끊는다', desc: '속도를 포기하고 방어를 챙기며, 맞을 때마다 모프 게이지를 채워 변신하는 느린 탱커입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .01, bonus: { hp: 100, defense: 6, resist: 1 }, tier: 2, level: 25, parent: 'warden', requires: { vit: 34, luk: 20 }, mastery: 75, role: '기절·방어', tree: 'defense', penalties: { speed: -6 }, lineage: 'bellTurtle' },
    { id: 'coralSaint', name: '산호 성인', title: '스스로 빛나는 방벽', desc: '액티브 없이 두 패시브만으로 파티 없는 자동 전투를 버티는 순수 보조형 3차 직업입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 84, hp: 260, defense: 12, resist: 16 }, tier: 3, level: 40, parent: 'oracle', requires: { vit: 50, wis: 38 }, mastery: 150, role: '패시브·유지', tree: 'magic' },
    { id: 'brineThorn', name: '염수 가시성채', title: '다가오는 자를 꿰뚫는다', desc: '높은 생명력과 방어를 얻는 대신 명중을 포기하는 반격형 3차 직업입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .02, bonus: { attack: 9, hp: 215, defense: 26, resist: 6 }, tier: 3, level: 40, parent: 'bulwark', requires: { vit: 52, str: 38 }, mastery: 150, role: '반격·성채', tree: 'defense', penalties: { accuracy: -.04 } },
    { id: 'gambler', name: '바다 도박사', title: '확률을 이기는 대신 대가를 건다', desc: '치명 피해와 골드가 오르지만 명중이 흔들리는 고위험 직업입니다.', attack: 1, magic: 1, hp: .92, defense: 1, resist: 1, crit: .1, bonus: { attack: 2, magic: 2 }, tier: 2, level: 25, parent: 'squidJester', requires: { luk: 36, dex: 28 }, mastery: 75, role: '치명·경제', tree: 'support', penalties: { accuracy: -.04 } },
    { id: 'bloodTide', name: '혈조의 군주', title: '피를 조류로 바꾼다', desc: '회피와 체력이 자라고, 여섯 능력치가 고를수록 퍼지롭 매스커레이드가 세지는 3차 직업입니다.', attack: 1, magic: .9, hp: 1, defense: 1, resist: 1, crit: .1, bonus: { attack: 59, hp: 235, defense: 5 }, tier: 3, level: 40, parent: 'chimera', requires: { str: 45, vit: 35 }, mastery: 150, role: 'HP·흡혈', tree: 'hybrid' },
    { id: 'netWeaver', name: '그물 직조가', title: '잡은 몬스터를 놓치지 않는다', desc: '상위 전직 없이 수집과 안정성을 택하는 독립 1차 직업입니다. 낮은 확률로 길게 감속시키는 그물 던지기를 함께 익힙니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .01, bonus: { attack: 6, hp: 20 }, tier: 1, level: 10, requires: { dex: 10, luk: 10 }, mastery: 0, role: '독립·수집', tree: 'physical', branchless: true },
    { id: 'fishWhisperer', name: '물고기 말벗', title: '물결의 의지를 듣는다', desc: '상위 전직 없이 낮은 비용 주문과 마나 회전을 연구하는 독립 1차 직업입니다. 마법 직업이라 마력 평타가 나갑니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 8, resist: 2 }, tier: 1, level: 10, requires: { int: 10, wis: 10 }, mastery: 0, role: '독립·순환', tree: 'magic', branchless: true },
    { id: 'driftwoodHermit', name: '유목 은둔자', title: '혼자서도 버티는 법', desc: '상위 전직 없이 체력과 저항을 차곡차곡 쌓는 독립 1차 직업입니다. 낮은 확률로 길게 기절시키는 통나무 밀치기를 함께 익힙니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { hp: 30, defense: 3, resist: 3 }, tier: 1, level: 10, requires: { vit: 10, wis: 10 }, mastery: 0, role: '독립·생존', tree: 'defense', branchless: true },
    { id: 'relicScavenger', name: '난파선 수집가', title: '부서진 것에서 가치를 찾는다', desc: '상위 전직 없이 골드와 명중을 챙기는 독립 1차 직업입니다. 장비 파밍용 편성의 출발점입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .02, bonus: { attack: 1, magic: 1 }, tier: 1, level: 10, requires: { dex: 10, luk: 12 }, mastery: 0, role: '변종·변종', tree: 'support' },
    { id: 'tideSurveyor', name: '해류 측량사', title: '더 나은 항로를 고르는 자', desc: '전투 보정은 거의 없지만 변종와 장비가 많은 항로를 읽는 독립 1차 직업입니다. 낮은 확률로 길게 약화시키는 지형 교란을 함께 익힙니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 1, level: 10, requires: { dex: 12, luk: 12 }, mastery: 0, role: '독립·드롭', tree: 'magic', branchless: true },
    { id: 'salvageMerchant', name: '인양 상인', title: '전리품을 항해 자금으로 바꾼다', desc: '전투력 대신 처치 골드를 극대화하는 독립 1차 직업입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 1, level: 10, requires: { luk: 14, dex: 10 }, mastery: 0, role: '독립·골드', tree: 'support', branchless: true },
    { id: 'pearlBroker', name: '진주 중개인', title: '윤회의 값을 협상한다', desc: '몬스터 속삭임을 숙달한 뒤 환생 보상을 늘리는 경제형 2차 직업입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 2, level: 25, parent: 'fishWhisperer', requires: { int: 25, luk: 25 }, mastery: 75, role: '환생·경제', tree: 'magic' },
    { id: 'rareTracker', name: '변종 추적자', title: '한 번뿐인 흔적을 놓치지 않는다', desc: '픽파킷을 완성한 2차 파밍 직업입니다. 메소 마스터리로 장비 드롭과 골드 보상을 늘립니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .01, tier: 2, level: 25, parent: 'relicScavenger', requires: { dex: 28, luk: 28 }, mastery: 75, role: '변종·황금 개체', tree: 'support' },
    { id: 'stormEel', lineage: 'krakenkin', name: '폭풍 곰치 혈족', title: '몬스터의 전류를 배운 자', desc: '여우령의 귀참으로 물어뜯는 물리 기술을 계승하는 몬스터 계열 2차 직업입니다. 감속과 속도 패시브로 선공을 잡습니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .04, bonus: { attack: 24, hp: 20, resist: 1 }, tier: 2, level: 25, parent: 'tidalBrawler', requires: { str: 28, dex: 22 }, mastery: 75, role: '몬스터·물리 감속', tree: 'physical' },
    { id: 'abyssArchivist', name: '진주 기록관', title: '다음 생의 장부를 보관한다', desc: '마법 잔해를 끝까지 숙련해 환생과 던전 경제를 함께 키우는 후반 비전투 직업입니다. 직업 자체는 약하지만, 드래곤 링크는 환생을 거듭할수록 어느 직업에서든 힘이 되는 패시브입니다.', attack: .9, magic: .95, hp: .98, defense: .95, resist: 1, crit: 0, bonus: { resist: 1 }, tier: 3, level: 40, parent: 'pearlBroker', requires: { int: 45, wis: 35, luk: 30 }, mastery: 150, role: '환생·기록', tree: 'magic', penalties: { attack: -8, magic: -6, accuracy: -.04 }, rebirth: 1 },
);

// 한 직업의 기본 기술은 1~2개에 집중합니다. 성장 경로를 공유하더라도
// 다른 직업의 기술은 자동 지급하지 않으므로 계승을 위한 순회가 필요합니다.
JOBS.push(
    { id: 'oathAngler', name: '맹세의 낚시꾼', title: '오래 버틴 결의', desc: '맹세의 결의 패시브와 낮은 확률로 길게 침묵시키는 맹세의 함성을 익히는 독립 직업입니다. 물리 공격을 보강할 다음 편성을 준비합니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { attack: 1 }, tier: 1, level: 10, requires: { str: 12, wis: 10 }, mastery: 0, role: '독립·공격 패시브', tree: 'physical', branchless: true, masteryTarget: 1200, masteryBoost: .1 },
    { id: 'stormHunter', name: '폭풍 추격자', title: '긴 틈을 한 방으로', desc: '빈사 상태의 적을 아이언 애로우로 끝내는 마무리 분기입니다. 헌터가 체력이 온전한 적을 여는 쪽이라면, 이쪽은 닫는 쪽입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .02, bonus: { attack: 11 }, tier: 2, level: 25, parent: 'harpoon', requires: { str: 28, dex: 22 }, mastery: 400, requiresSkillMastery: { pierce: 2 }, role: '단일·폭발', tree: 'physical', masteryTarget: 4000, masteryBoost: .18 },
    { id: 'tideMender', name: '생명의 조율사', title: '밀려오는 회복의 때', desc: '마나 리커버리와 턴마다 차오르는 마나 순환을 가진 회복형 주문사. 요정 사제가 흡혈이라면 이쪽은 지속 회복입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 6, hp: 25, resist: 2 }, tier: 2, level: 25, parent: 'tide', requires: { int: 24, wis: 28 }, mastery: 400, requiresSkillMastery: { wave: 1 }, role: '회복·주문', tree: 'magic', masteryTarget: 4000, masteryBoost: .18 },
    { id: 'scaleKnight', name: '비늘 견습기사', title: '가장 작은 방벽', desc: '기사의 갑옷 하나로 물리 방어를 익힙니다. 화려한 공격 대신 방어 패시브의 계승을 준비합니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { defense: 1 }, tier: 1, level: 10, requires: { vit: 12, str: 10 }, mastery: 0, role: '독립·물리 방어', tree: 'defense', branchless: true, masteryTarget: 800, masteryBoost: .08 },
    { id: 'lifeTender', name: '해양 생명지기', title: '작은 생명을 품는다', desc: '생명의 기운 하나를 익히는 독립 직업. 체력 비례 공격과 조합할 기반을 만듭니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { hp: 40 }, tier: 1, level: 10, requires: { vit: 14, wis: 10 }, mastery: 0, role: '독립·최대 체력', tree: 'defense', branchless: true, masteryTarget: 1400, masteryBoost: .12 },
    { id: 'barbSkirmisher', name: '미늘 척후병', title: '상처를 남기고 물러난다', desc: '갈고리 상처로 출혈을, 썩은 덫으로 길게 중독을 남기는 독립 직업. 확률형 공격과 지속 피해를 엮습니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { attack: 1 }, tier: 1, level: 10, requires: { str: 10, dex: 12 }, mastery: 0, role: '독립·출혈', tree: 'physical', branchless: true, masteryTarget: 1200, masteryBoost: .1 },
    { id: 'wakeRunner', name: '물결 달림꾼', title: '파도보다 한 걸음 먼저', desc: '질주로 가속을 얻습니다. 낮은 위력 대신 다음 라운드의 선공을 준비합니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .01, tier: 1, level: 10, requires: { dex: 14 }, mastery: 0, role: '독립·가속', tree: 'physical', branchless: true, masteryTarget: 1500, masteryBoost: .1 },
    { id: 'bubbleMage', name: '포말 마도사', title: '한 방울의 마법', desc: '버블 볼트 하나를 연마하는 기초 마법 직업. 낮은 비용의 주문을 다른 직업에 넘깁니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 2 }, tier: 1, level: 10, requires: { int: 12, wis: 10 }, mastery: 0, role: '독립·기초 주문', tree: 'magic', branchless: true, masteryTarget: 1000, masteryBoost: .08 },
    { id: 'stillwaterBinder', name: '정수 봉인사', title: '움직이지 않는 수면', desc: '침묵의 봉인으로 상대 액티브를 오래 막고, 끌어내리는 봉인으로 공격하며 감속시키는 방해형 직업입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 4, resist: 1 }, tier: 1, level: 10, requires: { int: 12, wis: 12 }, mastery: 0, role: '침묵·감속', tree: 'magic', masteryTarget: 2200, masteryBoost: .12 },
    { id: 'manaScribe', name: '마나 서기관', title: '흐름을 잊지 않는 기록', desc: '마나 통찰과 마나 순환술을 익히는 패시브 전용 직업. 마력 평타로 싸우며 다른 직업의 공격 주문을 받쳐 줄 기반을 만듭니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 8 }, tier: 1, level: 10, requires: { int: 10, wis: 14 }, mastery: 0, role: '독립·마나 패시브', tree: 'magic', branchless: true, masteryTarget: 1800, masteryBoost: .1 },
    { id: 'twinAngler', name: '쌍줄 낚시꾼', title: '한 번의 챔질, 두 번의 상처', desc: '선풍의 추가타를 전담합니다. 큰 단일타와 짧은 연타 사이에서 빌드 방향을 고릅니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .02, bonus: { attack: 9 }, tier: 2, level: 25, parent: 'tidalBrawler', requires: { str: 22, dex: 28 }, mastery: 450, requiresSkillMastery: { wakeFist: 2 }, role: '추가타·연속 공격', tree: 'physical', masteryTarget: 5500, masteryBoost: .2 },
    { id: 'memoryMerchant', name: '기억의 환전상', title: '지난 생의 금빛 장부', desc: '건 마스터리를 보관하는 경제형 분기. 직접 전투보다 장기 처치 보상에 투자합니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 14, hp: 30 }, tier: 2, level: 25, rebirth: 1, parent: 'salvageMerchant', requires: { luk: 28, wis: 22 }, mastery: 600, requiresSkillMastery: { salvageContract: 2 }, role: '환생·골드', tree: 'support', masteryTarget: 10000, masteryBoost: .22 },
);

// 경험치·조건부 숙련·보스 기술을 분리한 탐구 계열입니다.
JOBS.push(
    { id: 'voyageScribe', name: '견습 기록사', title: '한 번의 처치도 기록으로', desc: '전투력을 조금 포기하고 경험치를 더 얻습니다. 에인션트 아처리를 계승해 다음 직업의 성장에 보탬이 됩니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, expBonus: .03, tier: 1, level: 10, requires: { int: 12, wis: 12 }, mastery: 0, role: '경험치·기록', tree: 'support', masteryTarget: 3000, masteryBoost: .1 },
    { id: 'chronicleNavigator', name: '항로 연대기가', title: '여러 항해를 한 권에', desc: '항해 기록을 쌓아 경험치 획득을 높이는 상위 기록사. 빠른 레벨업과 전투용 AP 사이에서 균형을 고릅니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { attack: 12, magic: 12, hp: 40, resist: 3 }, expBonus: .06, tier: 2, level: 25, parent: 'voyageScribe', requires: { int: 26, wis: 28 }, mastery: 1200, requiresSkillMastery: { voyageReview: 2 }, role: '경험치·장기 성장', tree: 'support', masteryTarget: 18000, masteryBoost: .2 },
    { id: 'bossNaturalist', name: '거수 생태학자', title: '거대한 적이 남긴 배움', desc: '보스 처치에서 직업과 장착 스킬의 숙련도를 더 얻습니다. 일반 몬스터에는 보너스가 없으며 전투 보정도 받지 않습니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 1, level: 10, requires: { wis: 12, vit: 12 }, mastery: 0, role: '보스·숙련', tree: 'support', masteryTarget: 6000, masteryBoost: .12 },
    { id: 'speciesChronicler', name: '어종 문양사', title: '같은 흔적을 깊게 읽는다', desc: '리본 돼지·파이어보어·머쉬맘을 연구합니다. 지정 몬스터 처치에서만 숙련도를 크게 얻습니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 14, hp: 30 }, tier: 2, level: 25, parent: 'bossNaturalist', requires: { int: 25, wis: 28 }, mastery: 1000, requiresSkillMastery: { titanFieldNotes: 1 }, role: '지정 몬스터·숙련', tree: 'support', masteryTarget: 24000, masteryBoost: .2 },
    { id: 'echoTamer', name: '메아리 조련사', title: '포효를 말로 바꾸는 자', desc: '미르 조련사 숙련도 6,000에서 보스의 무음의 포효를 해금합니다. 그전에는 미르와의 교감과 계승 기술로 수련합니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, bonus: { magic: 52, hp: 80, resist: 4 }, tier: 2, level: 25, parent: 'fishWhisperer', requires: { int: 28, wis: 28 }, mastery: 1200, requiresSkillMastery: { fishWhisper: 1 }, role: '보스 기술·침묵', tree: 'magic', masteryTarget: 30000, masteryBoost: .24 },
    { id: 'abyssMimic', name: '메아리 모사체', title: '심연의 몸짓을 내 것으로', desc: '오닉스 드래곤 라이더 숙련도 20,000에서 보스의 촉수 난무를 해금합니다. 심연 보스의 행동을 오랫동안 관찰하는 대기만성 직업입니다.', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: .03, bonus: { attack: 56, magic: 24, hp: 110, resist: 4 }, tier: 3, level: 40, rebirth: 1, parent: 'echoTamer', requires: { str: 35, int: 35, wis: 30 }, mastery: 12000, requiresSkillMastery: { sovereignSilence: 2 }, role: '보스 기술·추가타', tree: 'magic', masteryTarget: 100000, masteryBoost: .38 },
);

// 제논 계열 상위직: 여섯 능력치를 고르게 배분할수록 강해지는 복합 피해 직업. 수치는 검증 초안입니다.
JOBS.push(
);

// v21 직업 확장: 계열별 5차 최상위 직업과 능력치 패시브 직업. 자세한 설계는 expansion.ts.
JOBS.push(...(EXPANSION_JOBS as Job[]));

// v23 계보 보강: 계열·계보 사이의 직업 수 차이를 줄입니다. 자세한 설계는 expansion-lineages.ts.
JOBS.push(...(LINEAGE_JOBS as Job[]));

// v24 계보 완성: 3차(일부 2·4차)에서 끝나던 계보를 5차까지 잇습니다. 자세한 설계는 expansion-v24.ts.
JOBS.push(...(V24_JOBS as Job[]));

// v24.2 ??? 문 직업과 보조 계열 소개 갱신. 자세한 설계는 support-rework.ts.
JOBS.push(...(SUPPORT_JOBS as Job[]));
// v25 ??? 특수 직업: 제로 (1차)·제로 (5차, v3.199 4차 → 5차)·玄. 자세한 설계는 expansion-v25.ts.
JOBS.push(...(V25_JOBS as Job[]));
// v25.14 방어 계열 보강: 종거북·루미너스 (2차) 갈래 5차까지, 새 호영 (1차)(마법 방어) 계보. 자세한 설계는 expansion-defense.ts.
JOBS.push(...(DEFENSE_JOBS as Job[]));
// v25.24 역전 계보(아크 (1차)): 물리 계수 마법 피해 · 마법 계수 물리 피해. 자세한 설계는 expansion-inversion.ts.
JOBS.push(...(INVERSION_JOBS as Job[]));
// v25.26 외길 계보: 능력치 하나만으로 전직하는 1~3차. 자세한 설계는 expansion-monostat.ts.
JOBS.push(...(MONOSTAT_JOBS as Job[]));
// v3.69 계열별 수련 직업 6개(data/training.ts). 옛 독립 수련 27개는 retired(새 전직 불가 · 화면에서 숨김 · 숙달 기록은 셈).
JOBS.push(...(TRAINING_JOBS as Job[]));
for (const job of JOBS) if (RETIRED_TRAINING.includes(job.id)) job.retired = true;
// v3.18 해커 계열과 v3.44부터 모든 히든·??? 문 직업은 서버 전용 game/secret/jobs.ts에 있습니다(docs/concept.md 10장).
// 서버는 game/secret/register.ts로, 화면은 카탈로그(catalog.ts)로 registerJobs를 거쳐 이 표에 더합니다.

// v21 회복 직업: 체력이 충분할 때 쓴 회복 기술도 피해가 줄지 않습니다. v3.54 넘친 회복은 적에게 피해로 돌아갑니다(SKILL_FORMULA.overhealDamage).
const HEALERS = new Set(['oracle', 'lunarOracle', 'coralSaint', 'seagrassKeeper', 'reefMedic', 'tideMender', 'lifeTender', 'tideHealer', 'shoreApothecary', 'deepCaretaker', 'tidalSinger', 'tideSaint', 'lifeOcean']);

// 특정 스킬/직업을 마스터해야만 열리는 교차 전직 조건입니다.
// 값은 스킬 숙련 단계(1~4) 또는 직업 숙련 승수로 작성합니다.
const advancedRequirements: Record<string, Pick<Job, 'requiresSkillMastery' | 'requiresJobMastery'>> = {
    reefBrawler: { requiresSkillMastery: { wakeFist: 3 } },
    lineBreaker: { requiresSkillMastery: { wakeFist: 3 } },
    krakenSlayer: { requiresSkillMastery: { whaleStrike: 4 }, requiresJobMastery: { harpoon: 150 } },
    needleDancer: { requiresSkillMastery: { razor: 4 }, requiresJobMastery: { corsair: 150 } },
    runeSwell: { requiresSkillMastery: { wave: 3 } },
    saltAlchemist: { requiresSkillMastery: { rippleGlyph: 3 } },
    stormScribe: { requiresSkillMastery: { maelstrom: 4 }, requiresJobMastery: { tempest: 150 } },
    lunarOracle: { requiresSkillMastery: { pearlPrayer: 3 }, requiresJobMastery: { oracle: 150 } },
    reefMedic: { requiresSkillMastery: { greenTide: 3 } },
    bellTurtle: { requiresSkillMastery: { anchor: 3 } },
    coralSaint: { requiresSkillMastery: { soulTide: 4 }, requiresJobMastery: { warden: 150 } },
    brineThorn: { requiresSkillMastery: { ironWill: 4 } },
    clockworkAngler: { requiresSkillMastery: { precision: 3 } },
    gambler: { requiresSkillMastery: { inkTrick: 3 } },
    bloodTide: { requiresSkillMastery: { vitalSurge: 4 }, requiresJobMastery: { wanderer: 150 } },
    pearlBroker: { requiresSkillMastery: { fishWhisper: 3 }, requiresJobMastery: { fishWhisperer: 75 } },
    rareTracker: { requiresSkillMastery: { salvageSense: 3 }, requiresJobMastery: { relicScavenger: 75 } },
    stormEel: { requiresSkillMastery: { wakeFist: 2 } },
    abyssArchivist: { requiresSkillMastery: { pearlLedger: 4 }, requiresJobMastery: { pearlBroker: 150 } },
};

/**
 * Job mastery is intentionally not a single 150-win switch.  The target and
 * the reward are part of the job data so a late/hidden vocation can feel like
 * a long-term discovery without changing the save format or combat engine.
 *
 * The values below are a tuning table, not magic numbers in the UI.  Adjust a
 * single entry when a job needs a shorter or longer runway during testing.
 */
const JOB_MASTERY_TUNING: Record<string, { target: number; boost: number }> = {
    fisher: { target: 150, boost: 0 },
    harpoon: { target: 180, boost: .06 }, tide: { target: 180, boost: .06 }, warden: { target: 180, boost: .06 }, wanderer: { target: 1200, boost: .1 },
    tidalBrawler: { target: 260, boost: .07 }, currentScholar: { target: 260, boost: .07 }, seagrassKeeper: { target: 300, boost: .08 }, squidJester: { target: 420, boost: .09 },
    netWeaver: { target: 800, boost: .12 }, fishWhisperer: { target: 900, boost: .12 }, driftwoodHermit: { target: 850, boost: .12 }, relicScavenger: { target: 1200, boost: .14 }, tideSurveyor: { target: 1500, boost: .16 }, salvageMerchant: { target: 1700, boost: .17 },
    whaler: { target: 1200, boost: .14 }, corsair: { target: 1200, boost: .14 }, tempest: { target: 1400, boost: .16 }, oracle: { target: 1500, boost: .17 }, bulwark: { target: 1600, boost: .17 }, paladin: { target: 1800, boost: .18 },
    chimera: { target: 6500, boost: .24 },
    reefBrawler: { target: 2400, boost: .18 }, lineBreaker: { target: 2800, boost: .19 }, runeSwell: { target: 2800, boost: .19 }, saltAlchemist: { target: 3300, boost: .2 }, reefMedic: { target: 3200, boost: .2 }, bellTurtle: { target: 3600, boost: .21 }, clockworkAngler: { target: 5200, boost: .23 }, gambler: { target: 9000, boost: .27 }, pearlBroker: { target: 8000, boost: .26 }, rareTracker: { target: 8500, boost: .27 }, stormEel: { target: 7000, boost: .25 },
    krakenSlayer: { target: 9000, boost: .3 }, needleDancer: { target: 8500, boost: .29 }, stormScribe: { target: 11000, boost: .32 }, lunarOracle: { target: 10000, boost: .3 }, coralSaint: { target: 12000, boost: .33 }, brineThorn: { target: 13000, boost: .34 }, bloodTide: { target: 45000, boost: .38 }, abyssArchivist: { target: 100000, boost: .42 },
};

/** 히든·??? 문 직업의 힌트. 이름·조건을 숨긴 실루엣 카드에 한 줄로 보입니다. */
const JOB_HINTS: Record<string, string> = {
    abyssArchivist: '마법 잔해를 끝까지 적은 중개인에게 열립니다.',
    abyssMimic: '메아리를 오래 길들인 자에게 보스의 그림자가 닿습니다.',
};

/**
 * v3.44 직업 표 후처리를 한곳에 모았습니다(docs/concept.md 10장). 불러올 때 기본 직업 표에 한 번,
 * 그 뒤 서버 전용 비밀 직업이나 화면이 받은 카탈로그 직업을 registerJobs로 더할 때 그 묶음에만 다시 적용합니다.
 * 순서가 결과를 정하므로 바꾸지 마세요: 설명 → 회복 → 교차 조건 → 숙련 목표 → 차수 배율 → 5차 선행 숙련 → 힌트 → 메이플 이름 → 칭호·설명.
 */
function finishJobs(list: Job[]) {
    for (const job of list) if (SUPPORT_JOB_DESC[job.id]) job.desc = SUPPORT_JOB_DESC[job.id];
    for (const job of list) if (HEALERS.has(job.id)) job.healer = true;
    for (const job of list) Object.assign(job, advancedRequirements[job.id] || {});
    for (const job of list) {
        const tuning = JOB_MASTERY_TUNING[job.id] || { target: job.tier >= 3 ? 12000 : job.tier === 2 ? 3000 : 300, boost: job.tier >= 3 ? .3 : job.tier === 2 ? .18 : .08 };
        job.masteryTarget ??= tuning.target;
        job.masteryBoost ??= tuning.boost;
    }
    // v27.95 차수별 요구 숙련 배율(PROGRESSION.jobMasteryTierScale). 5차 전직은 선행 직업 숙달(올린 숙달 수치)이 필요합니다.
    for (const job of list) job.masteryTarget = Math.round(job.masteryTarget! * (PROGRESSION.jobMasteryTierScale[job.tier] ?? 1));
    for (const job of list) {
        const parent = job.tier >= 5 && job.parent ? JOBS.find(j => j.id === job.parent) : undefined;
        if (parent) job.mastery = Math.max(job.mastery || 0, parent.masteryTarget!);
    }
    for (const job of list) job.hint ??= JOB_HINTS[job.id] ?? LINEAGE_HINTS[job.id] ?? V24_HINTS[job.id] ?? SUPPORT_HINTS[job.id] ?? V25_HINTS[job.id] ?? DEFENSE_HINTS[job.id];
    // v27.36 메이플 직업 이름: maple-names.ts 한곳에서 덮어씁니다(id는 그대로).
    const names = mapleJobNames(list);
    for (const job of list) job.name = names[job.id] ?? job.name;
    // v27.51 칭호·설명·힌트의 바다 표현: maple-flavor.ts.
    for (const job of list) Object.assign(job, MAPLE_JOB_FLAVOR[job.id]);
}
finishJobs(JOBS);
/**
 * v3.44 직업 더하기: 서버는 비밀 직업 표를, 화면은 서버가 보낸 카탈로그 직업을 여기로 넣습니다.
 * 이미 있는 id는 건너뜁니다(같은 묶음을 두 번 받아도 안전). 더한 직업 수를 돌려줍니다.
 */
export function registerJobs(list: Job[], finished = false) {
    const fresh = list.filter(j => !JOBS.some(x => x.id === j.id));
    if (!fresh.length) return 0;
    JOBS.push(...fresh);
    if (!finished) finishJobs(fresh);
    jobByIdMap = undefined; lineageCache = new WeakMap();
    return fresh.length;
}
/** v3.44 화면: 카탈로그 직업(완성된 모양)을 넣거나 실루엣을 드러난 직업으로 바꿉니다. 바뀐 수를 돌려줍니다. */
export function upsertJobs(list: Job[]) {
    let changed = 0;
    for (const j of list) {
        const i = JOBS.findIndex(x => x.id === j.id);
        if (i < 0) { JOBS.push(j); changed++; }
        else if (JSON.stringify(JOBS[i]) !== JSON.stringify(j)) { JOBS[i] = j; changed++; }
    }
    if (changed) { jobByIdMap = undefined; lineageCache = new WeakMap(); }
    return changed;
}

/** 직업 계보. 계열(tree) 안에서 한 루트 직업과 그 후속 직업을 묶습니다. 계열마다 상위·하위가 없는 1차 직업은 '독립 수련'으로 모읍니다. */
/**
 * v3.220 세계: 계보 위의 한 단계 묶음. 전직 화면은 세계(책의 장)를 먼저 고르고, 그 세계의 계보만 보여 줍니다.
 * world가 없는 계보는 메이플 월드입니다. 아제로스는 처치 기록으로 드러나는 히든 계보의 세계입니다.
 */
export type WorldId = 'maple' | 'azeroth';
export const WORLDS: { id: WorldId; name: string; subtitle: string; description: string; accent: string }[] = [
    { id: 'maple', name: '메이플 월드', subtitle: '모험이 시작된 세계', description: '지금까지의 모든 계열과 계보가 있는 세계입니다.', accent: '#e0a24f' },
    { id: 'azeroth', name: '아제로스', subtitle: '사냥 기록이 여는 세계', description: '특별한 몬스터와 보스를 오래 사냥했거나 계급장을 단 모험가에게 길이 열리는 세계입니다. 히든 계보와 참모 계보가 있습니다.', accent: '#7f8fd8' },
];
export type Lineage = { id: string; name: string; tree: JobTreeId; summary: string; world?: WorldId };
/** v3.221 아제로스 규칙: 직업 숙달 목표와 스킬 숙련 단계가 메이플 월드의 이 배수입니다(secret/register.ts에서 적용). */
export const AZEROTH_MASTERY_SCALE = 10;
/** 계보가 속한 세계(없으면 메이플 월드). */
export const worldOf = (l: Pick<Lineage, 'world'> | undefined): WorldId => l?.world ?? 'maple';
// v3.69 계열마다 수련 직업 하나(data/training.ts). 사냥용이 아니라 계승 재료입니다.
const independent = (tree: JobTreeId): Lineage => ({ id: `${tree}-independent`, name: '수련', tree, summary: '그 계열의 기초 패시브를 모은 수련 직업입니다. 직접 사냥하면 약하고, 기술은 다른 직업이 계승해서 씁니다.' });
export const LINEAGES: Lineage[] = [
    { id: 'harpoon', name: '작살 사냥꾼 계보', tree: 'physical', summary: '관통·치명·출혈로 갈라지는 물리 폭발 계보입니다.' },
    { id: 'tidalBrawler', name: '조수 투사 계보', tree: 'physical', summary: '추가타가 명중할 때마다 전류(속도) 자기 버프가 길어지고, 빨라진 만큼 추가타가 늘어나는 템포 경계 계보입니다.' },
    /** v3.65 은월 계보 하나로: 스트라이커 1차 → 은월 2차(공개) → 3차 이후 숨은 단계(game/secret). */
    { id: 'krakenkin', name: '은월 계보', tree: 'physical', summary: '정령과 함께 싸우는 계보입니다. 패시브의 정령이 기본 공격을 포함한 모든 공격에 추가타를 붙입니다. 3차부터는 숨은 단계입니다.' },
    { id: 'ronin', name: '낭인 계보', tree: 'physical', summary: '검술의 연타·관통·돌격을 거쳐 5차 용사에 이르는 계보입니다.' },
    { id: 'martialArtist', name: '무투가 계보', tree: 'physical', summary: '다단 연타와 기절·감속 제어를 잇는 격투 계보입니다.' },
    independent('physical'),
    { id: 'tide', name: '조류 술사 계보', tree: 'magic', summary: '폭발 주문·회복·약화로 갈라지는 조류 마법 계보입니다.' },
    { id: 'currentScholar', name: '해류 연구자 계보', tree: 'magic', summary: '마력 평타(기본 공격)가 주력인 유일한 마법사 계보입니다. 패시브가 평타 계수를 올리고 평타에 부식을 붙이며, 연성 기술은 평타 계수를 기준값으로 씁니다.' },
    { id: 'fishWhisperer', name: '물고기 말벗 계보', tree: 'magic', summary: '보스 기술 모사와 환생·기록 경제로 이어지는 계보입니다.' },
    { id: 'chantNovice', name: '겹영창 계보', tree: 'magic', summary: '동시 시전 주문을 겹쳐 한 행동에 쏟아붓는 순수 피해 마법 계보입니다. 함께 나간 주문이 많을수록 대기와 마나가 늘어납니다.' },
    { id: 'apprentice', name: '견습 마법사 계보', tree: 'magic', summary: '화상을 쌓고 5차 인피니티 플레임 서클로 한 번에 터뜨리는 불꽃 계보입니다.' },
    independent('magic'),
    { id: 'warden', name: '산호 수호자 계보', tree: 'defense', summary: '방어·기절·회복·반격과 복합 흡혈로 갈라지는 수호 계보입니다.' },
    { id: 'seagrassKeeper', name: '해초 돌봄꾼 계보', tree: 'defense', summary: '회복과 흡혈로 편성을 지탱하는 보조 방어 계보입니다.' },
    ...DEFENSE_LINEAGES,
    independent('defense'),
    { id: 'poisoner', name: '독술사 계보', tree: 'status', summary: '중독·역병을 쌓아 5차 아크메이지(불,독) (5차)에 이르는 계보입니다.' },
    { id: 'shaman', name: '주술사 계보', tree: 'status', summary: '약화 · 감속 · 침묵 · 저주를 걸어 두고, 적에게 걸린 상태이상 종류 수만큼 세지는 헥스로 베는 계보입니다.' },
    NEW_LINEAGES.bloodAngler,
    NEW_LINEAGES.nerveNeedler,
    independent('status'),
    /** v3.168 초보자 계보는 ??? 탭에 둡니다(직업의 tree는 복합 그대로: 숙련 진행판 · 계열 집중은 그대로). */
    { id: 'fisher', name: '무직', tree: 'mystery', summary: '모든 모험의 출발점입니다. 공용 기술로 첫 전직을 준비합니다.' },
    { id: 'wanderer', name: '이형 항해자 계보', tree: 'hybrid', summary: '여섯 능력치를 고르게 키울수록 세지고, 명중 · 회피로 버티다 회피를 무시하는 고정 피해 레이저(메가 스매셔)를 쏘는 경계 계보입니다.' },
    { id: 'spellbladeNovice', name: '마검 수련생 계보', tree: 'hybrid', summary: '마나 대신 현재 체력의 일부를 바쳐 베는 피의 딜러 계보입니다. 피가 줄수록 피해가 커지고(피의 분노), 흡혈로 바친 피를 되찾습니다.' },
    NEW_LINEAGES.tideLancer,
    NEW_LINEAGES.runesmith,
    ...INVERSION_LINEAGES,
    independent('hybrid'),
    { id: 'squidJester', name: '오징어 광대 계보', tree: 'support', summary: '확률과 치명으로 보상을 불리는 계보입니다.' },
    { id: 'relicScavenger', name: '난파선 수집가 계보', tree: 'support', summary: '변종과 황금 개체를 더 자주 만나 골드를 벌고, 그 골드를 메소 익스플로전으로 태워 때리는 계보입니다.' },
    { id: 'salvageMerchant', name: '인양 상인 계보', tree: 'support', summary: '골드와 환생 보상을 굴리는 경제 계보입니다.' },
    { id: 'voyageScribe', name: '견습 기록사 계보', tree: 'support', summary: '경험치 보너스가 곧 피해가 되는(렐릭의 힘) 경험치 유틸 계보입니다.' },
    { id: 'bossNaturalist', name: '거수 생태학자 계보', tree: 'support', summary: '보스와 지정 몬스터의 숙련을 빠르게 쌓는 계보입니다.' },
    { id: 'bard', name: '방랑 음유시인 계보', tree: 'support', summary: '가속·경험치·보상으로 성장을 보조하는 계보입니다.' },
    STAFF_LINEAGE,
    independent('support'),
    RESTRAINT_LINEAGE,
    independent('mystery'),
    ...MONOSTAT_LINEAGES,
];
for (const lineage of LINEAGES) lineage.name = MAPLE_LINEAGE_NAMES[lineage.id] ?? lineage.name;
for (const lineage of LINEAGES) lineage.summary = MAPLE_LINEAGE_SUMMARY[lineage.id] ?? lineage.summary;
/**
 * v3.44 계보 더하기·바꾸기(비밀 계보: 서버는 전체, 화면은 카탈로그의 것). 같은 id는 내용을 바꿉니다.
 */
export function registerLineages(list: Lineage[]) {
    for (const l of list) { const i = LINEAGES.findIndex(x => x.id === l.id); if (i >= 0) LINEAGES[i] = l; else LINEAGES.splice(LINEAGES.findIndex(x => x.id === 'mystery-independent'), 0, l); }
}
/** 직업의 계보 id. lineage가 있으면 그 값, 상위·하위가 없는 1차 직업은 `${tree}-independent`, 그 밖에는 루트 조상 id. */
export function lineageOf(job: Job): string {
    // v27.62 직업의 부모·계열은 데이터가 정해지면 바뀌지 않아 한 번 계산한 계보를 기억합니다(전직 화면이 렌더마다 수천 번 부름).
    const hit = lineageCache.get(job);
    if (hit) return hit;
    let out: string;
    if (job.lineage) out = job.lineage;
    else if (!job.parent && job.tier === 1 && !JOBS.some(j => j.parent === job.id)) out = `${job.tree}-independent`;
    else {
        let root = job;
        for (let parent = JOBS.find(j => j.id === root.parent); parent; parent = JOBS.find(j => j.id === root.parent)) root = parent;
        out = root.id;
    }
    lineageCache.set(job, out);
    return out;
}
let lineageCache = new WeakMap<Job, string>();
/** 직업 성격 태그. tags가 없으면 role을 '·'로 나눕니다. */
export const jobTags = (job: Job) => job.tags ?? job.role.split('·').map(x => x.trim()).filter(Boolean);

/** id로 찾기(첫 항목 우선, JOBS.find와 같은 결과). 모듈 초기화가 끝난 뒤 처음 부를 때 한 번 만듭니다. */
let jobByIdMap: Map<string, Job> | undefined;
export function jobById(id: string | undefined) {
    if (!jobByIdMap) { jobByIdMap = new Map(); for (const x of JOBS) if (!jobByIdMap.has(x.id)) jobByIdMap.set(x.id, x); }
    return id === undefined ? undefined : jobByIdMap.get(id);
}
// v3.65 공개 특수 직업(유리 대포 · v3.199 은월 3~5차, data/specials.ts).
registerJobs(SPECIAL_JOBS, true);
// v3.70 능력치 수련 I~III(data/stat-training.ts, 완성된 모양).
registerJobs(STAT_TRAINING_JOBS, true);
