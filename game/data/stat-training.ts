/**
 * v3.70 능력치 수련(근력 · 기민 · 지능 · 체질 · 정신 · 행운 수련 I~III).
 * - 계열 수련 직업의 숙련을 100만 쌓으면 그 계열의 능력치 수련 I이 열리고, I 숙달(1,000만) → II, II 숙달(2,500만) → III(숙달 5,000만)입니다.
 * - 직업마다 패시브 하나: 장착하면 기본 능력치(배분 능력치와 같은 자리)가 오릅니다. 스킬 숙련 단계마다 +25%(최대 ×2). 다른 직업이 계승해 쓸 수 있습니다(계승 자격 = 첫 숙련 단계).
 * - 수련 직업과 같은 마이너스 보정(공격 ×0.35 · 체력 ×0.4 · 보상 ×0.35)이라 직접 사냥용이 아닙니다.
 * - 숙련 목표가 커서 직업 표 후처리(차수 배율)를 거치지 않는 완성된 모양으로 classes.ts·skills.ts가 등록합니다.
 */
import type { Attribute, Skill } from '../types';
import type { Job, JobTreeId } from './classes';
import { TRAINING_PENALTY } from './training';

const STATS: { stat: Attribute; label: string; parent: string; tree: JobTreeId }[] = [
    { stat: 'str', label: '근력', parent: 'trainingPhysical', tree: 'physical' },
    { stat: 'int', label: '지능', parent: 'trainingMagic', tree: 'magic' },
    { stat: 'vit', label: '체질', parent: 'trainingDefense', tree: 'defense' },
    { stat: 'luk', label: '행운', parent: 'trainingStatus', tree: 'status' },
    { stat: 'wis', label: '정신', parent: 'trainingHybrid', tree: 'hybrid' },
    { stat: 'dex', label: '기민', parent: 'trainingSupport', tree: 'support' },
];
/**
 * v3.237 능력치 두 배(20 · 50 · 100 → 40 · 100 · 200) · AP 낮춤(4 · 6 · 8 → 3 · 4 · 5). 숙련 4억을 들인 III 최대가 AP 1당 전투력 약 3.7%로
 * 직업 5차 패시브(약 20%)의 5분의 1이었습니다. 어느 직업이든 계승해 쓰는 범용 패시브라 그 절반쯤(약 11%)에 맞췄습니다.
 */
/** 단계: 들어가는 데 필요한 부모 숙련 · 숙달 목표(v3.70 결정: 1,000만 · 2,500만 · 5,000만) · 패시브 능력치 · AP(높게: 고레벨은 SP 한계돌파·계승으로 씀) · 스킬 숙련 단계. */
export const STAT_TRAINING_STEPS = [
    { roman: 'I', tier: 2, entry: 1_000_000, target: 10_000_000, attr: 40, cost: 3, milestones: [10_000_000, 20_000_000, 40_000_000, 80_000_000] },
    { roman: 'II', tier: 3, entry: 10_000_000, target: 25_000_000, attr: 100, cost: 4, milestones: [25_000_000, 50_000_000, 100_000_000, 200_000_000] },
    { roman: 'III', tier: 4, entry: 25_000_000, target: 50_000_000, attr: 200, cost: 5, milestones: [50_000_000, 100_000_000, 200_000_000, 400_000_000] },
];
/** 스킬 숙련 단계(0~4)마다 능력치 +25%. */
export const STAT_TRAINING_GROWTH = .25;
const jobId = (stat: Attribute, i: number) => `${stat}Training${i + 1}`;

export const STAT_TRAINING_JOBS: Job[] = STATS.flatMap(({ stat, label, parent, tree }) => STAT_TRAINING_STEPS.map((step, i): Job => ({
    id: jobId(stat, i), name: `${label} 수련 ${step.roman}`, title: `${label}을(를) 몸에 새긴다`,
    desc: `${label} 자체가 오르는 패시브를 익히는 수련 직업입니다. 직접 사냥하면 약하고, 패시브는 다른 직업이 계승해서 씁니다.`,
    attack: TRAINING_PENALTY.attack, magic: TRAINING_PENALTY.magic, hp: TRAINING_PENALTY.hp, defense: 1, resist: 1, crit: 0, rewardScale: TRAINING_PENALTY.reward,
    tier: step.tier, level: 10, parent: i ? jobId(stat, i - 1) : parent, requires: {}, mastery: step.entry, role: '수련·능력치', tree,
    lineage: `${tree}-independent`, subRole: 'training', masteryTarget: step.target, masteryBoost: 0,
})));
export const STAT_TRAINING_SKILLS: Skill[] = STATS.flatMap(({ stat, label }) => STAT_TRAINING_STEPS.map((step, i): Skill => ({
    id: `${stat}Drill${i + 1}`, name: `${label} 단련 ${step.roman}`, desc: `${label}이(가) ${step.attr} 오릅니다(배분 능력치처럼 모든 파생 수치에 반영). 숙련 단계마다 +25%.`,
    type: 'passive', level: 10, job: jobId(stat, i), chance: 0, cooldown: 0, multiplier: 0, cost: step.cost, attrBonus: { [stat]: step.attr }, masteryMilestones: [...step.milestones],
})));
