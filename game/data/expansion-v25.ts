import type { Job } from './classes';
import type { Skill } from '../types';

/**
 * v25 ??? 계열 특수 직업.
 *
 * 시계공(1차 독립, 시간의 문 · 모든 시간대)
 *   태엽 감기(자신 가속) · 늘어진 초침(피해 없이 감속) · 시차(속도 패시브) · 타임머신(나와 상대 모두 회복, 전투당 1회, 쓸 때마다 직업 숙련 +25).
 *   끝까지 숙달하면 4차급 독립 직업 '시간의 지배자'가 열립니다(문·레벨·환생 조건 없음).
 * 시간의 지배자(4차급 독립)
 *   정지된 시간(확정 기절) · 선행(곧바로 한 번 더 행동) · 역행(회복) · 시간의 주권(속도·회피·치명).
 *   확정 기절도 기절 뒤 면역 규칙을 따르므로 기절이 계속 이어지지는 않습니다.
 * 玄(1차 독립, 문 없음)
 *   일곱 글자 無·虛·斬·血·縛·刹·魂은 혼자 쓰면 손해만 있습니다(無는 혼자서는 버티기만 함). 앞 글자의 숙련 Lv.1을 달성하면 다음 글자가 열립니다.
 *   無는 체력이 1 아래로 내려가지 않게 버티는 바탕(전투당 6번 + 숙련 1단계마다 2번, 버틸 때마다 25% 회복)이라 虛의 올인·斬의 반동·血의 마나 소진이 죽음으로 이어지지 않습니다.
 *   점검(scripts/check-job-balance.mjs 조건, 일곱 글자 숙련 완료): 4차 조건 Lv.60에서 승률 100% · 처치 17턴으로 4차 중앙값 수준, 天은 전투당 약 0.9회.
 *   일곱 글자를 모두 장착하고 天까지 열면, 한 전투에 여섯 글자를 모두 쓰는 순간 天이 터집니다.
 *   효과는 숙련 Lv.1 전까지 ???로 감춰집니다. 글자 액티브는 숙련할수록 AP 2 → 1.
 */
type NewJob = Omit<Job, 'masteryTarget' | 'masteryBoost'> & Partial<Pick<Job, 'masteryTarget' | 'masteryBoost'>>;
const neutral = { attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0 };
const A = { type: 'active' as const, chance: .26, cooldown: 3, multiplier: 1 };
const P = { type: 'passive' as const, chance: 0, cooldown: 0, multiplier: 0 };
const physical = { damageType: 'physical' as const, manaCost: 0 };
const GLYPH = { level: 10, job: 'glyphMonk', veiled: true, masteryMilestones: [120, 1500, 6000, 20000] };
const GLYPH_A = { ...A, ...physical, ...GLYPH, cost: 2, seal: true, rankEffects: { apReduction: .5 } };

/** 시계공 숙달 목표 = 시간의 지배자 전직 조건. */
export const CLOCKMAKER_MASTERY = 3000;
/** 타임머신을 쓸 때마다 더하는 직업 숙련. */
export const TIME_MACHINE_MASTERY = 25;

export const V25_JOBS: NewJob[] = [
    { id: 'clockmaker', name: '시계공', title: '고장 난 시간을 고친다', desc: '자신을 가속하고 상대를 감속하는 시간 직업. 가끔 타임머신이 작동해 나와 상대가 모두 처음 상태로 돌아갑니다. 끝까지 숙달하면 시간의 지배자가 열립니다.', ...neutral, bonus: { attack: 2, magic: 2, hp: 5 }, tier: 1, level: 10, mastery: 0, requires: { dex: 12, int: 10 }, role: '시간·속도', tree: 'mystery', branchless: true, hidden: true, fullKit: true, penalties: { defense: -1 }, masteryTarget: CLOCKMAKER_MASTERY, masteryBoost: .2 },
    { id: 'chronarch', name: '시간의 지배자', title: '멈춘 시간 속을 홀로 걷는다', desc: '시계공을 숙달한 자에게만 열리는 4차급 독립 직업. 확정 기절과 확정 추가 행동으로 전투의 시간을 지배합니다.', ...neutral, attack: 1.3, magic: 1.3, hp: 1.12, defense: 1.08, resist: 1.08, crit: .08, tier: 4, level: 10, mastery: 0, requires: {}, requiresJobMastery: { clockmaker: CLOCKMAKER_MASTERY }, role: '시간·제어', tree: 'mystery', lineage: 'mystery-independent', hidden: true, fullKit: true, masteryTarget: 30000, masteryBoost: .35 },
    { id: 'glyphMonk', name: '玄', title: '일곱 글자를 몸에 새긴다', desc: '혼자 쓰면 손해뿐인 일곱 글자를 서로 맞물려 쓰는 조합 직업. 글자 하나를 익히면 다음 글자가 열리고, 일곱 글자가 모두 맞물리면 天이 깨어납니다.', ...neutral, bonus: { attack: 2, magic: 2 }, tier: 1, level: 10, mastery: 0, requires: { wis: 12, luk: 10 }, role: '조합·각성', tree: 'mystery', branchless: true, hidden: true, fullKit: true, penalties: { hp: -10 }, masteryTarget: 5000, masteryBoost: .2 },
];

export const V25_SKILLS: Skill[] = [
    // ── 시계공 ──
    { ...A, ...physical, id: 'windUp', name: '태엽 감기', desc: '', level: 10, job: 'clockmaker', cost: 2, effect: 'haste' },
    { ...A, ...physical, id: 'slackHand', name: '늘어진 초침', desc: '', level: 10, job: 'clockmaker', cost: 2, effect: 'slow' },
    { ...P, id: 'timeLag', name: '시차', desc: '속도와 회피가 오릅니다. 속도 차이가 클수록 연속 행동이 잦아집니다.', level: 10, job: 'clockmaker', cost: 2, bonus: { speed: 6, evasion: .02 } },
    { ...A, ...physical, id: 'timeMachine', name: '타임머신', desc: '', level: 10, job: 'clockmaker', cost: 2, restoreAll: true, statusOnly: true },
    // ── 시간의 지배자 ──
    { ...A, id: 'frozenTime', name: '정지된 시간', desc: '', level: 10, job: 'chronarch', cost: 5, damageType: 'split', scaling: 'dual', effect: 'stun', masteryMilestones: [2500, 12000, 40000, 100000] },
    { ...A, id: 'precede', name: '선행', desc: '', level: 10, job: 'chronarch', cost: 5, damageType: 'split', scaling: 'dual', extraTurn: true, masteryMilestones: [2500, 12000, 40000, 100000] },
    { ...A, id: 'rewind', name: '역행', desc: '', level: 10, job: 'chronarch', cost: 4, damageType: 'split', scaling: 'dual', effect: 'heal', masteryMilestones: [2500, 12000, 40000, 100000] },
    { ...P, id: 'chronoSovereign', name: '시간의 주권', desc: '속도·회피·치명타·명중이 크게 오릅니다.', level: 10, job: 'chronarch', cost: 3, bonus: { speed: 18, evasion: .05, crit: .05, accuracy: .05, attack: 40, magic: 40 }, masteryMilestones: [2500, 12000, 40000, 100000] },
    // ── 玄: 無 → 虛 → 斬 → 血 → 縛 → 刹 → 魂 → 天 ──
    { ...P, ...GLYPH, id: 'glyphNothing', name: '無', desc: '체력이 1 아래로 내려가지 않습니다. 쓰러질 피해를 받으면 체력 1로 버티고 최대 체력의 25%를 되찾습니다(전투당 6번, 숙련 1단계마다 +2번).', cost: 1, lastStand: { charges: 6, chargesPerLevel: 2, heal: .25 } },
    { ...GLYPH_A, id: 'glyphVoid', name: '虛', desc: '', unlockAfter: { skill: 'glyphNothing', level: 1 } },
    { ...GLYPH_A, id: 'glyphCut', name: '斬', desc: '', unlockAfter: { skill: 'glyphVoid', level: 1 } },
    { ...GLYPH_A, id: 'glyphBlood', name: '血', desc: '', unlockAfter: { skill: 'glyphCut', level: 1 } },
    { ...GLYPH_A, id: 'glyphBind', name: '縛', desc: '', effect: 'stun', unlockAfter: { skill: 'glyphBlood', level: 1 } },
    { ...GLYPH_A, id: 'glyphInstant', name: '刹', desc: '', extraTurn: true, unlockAfter: { skill: 'glyphBind', level: 1 } },
    { ...GLYPH_A, id: 'glyphSoul', name: '魂', desc: '', unlockAfter: { skill: 'glyphInstant', level: 1 } },
    { ...P, ...GLYPH, id: 'glyphHeaven', name: '天', desc: '일곱 글자를 모두 장착한 채 한 전투에 여섯 글자를 모두 쓰면 天이 깨어납니다.', cost: 2, rankEffects: { apReduction: .5 }, sealFinale: { base: 4, perLevel: .5, stun: 2 }, unlockAfter: { skill: 'glyphSoul', level: 1 }, masteryMilestones: [2000, 10000, 40000, 100000] },
];

/** 액티브 최종 수치(ACTIVE_SKILL_BALANCE에 합쳐짐). */
export const V25_BALANCE: Record<string, Partial<Skill>> = {
    windUp: { chance: .28, cooldown: 4, multiplier: .9 },
    slackHand: { chance: .3, cooldown: 3, multiplier: 1 },
    timeMachine: { chance: .12, cooldown: 1, multiplier: 1 },
    frozenTime: { chance: 1, cooldown: 6, multiplier: 1.6, statusTurns: 2, manaCost: 8, sureHit: true },
    // v25.2: 복합 피해 기술 규칙(발동 45% 이상)에 맞추고 시간의 지배자를 4차 중앙값으로 끌어올립니다.
    precede: { chance: .45, cooldown: 5, multiplier: 1.9, manaCost: 8 },
    rewind: { chance: .45, cooldown: 6, multiplier: 1.3, healRatio: .35, manaCost: 8 },
    // 虛: 체력을 1까지 걸고 건 체력에 비례한 피해. 無 없이 쓰면 다음 공격에 쓰러집니다.
    glyphVoid: { chance: .26, cooldown: 4, multiplier: 1.2, accuracyBonus: .15, allIn: { hpRatio: 1, hpScale: 1, manaScale: 0 } },
    // 斬: 큰 피해, 준 피해의 절반을 자신도 받음(체력 1 아래로는 안 내려감).
    glyphCut: { chance: .26, cooldown: 3, multiplier: 2.6, recoil: .5 },
    // 血: 마나를 모두 쏟아 쏟은 만큼 회복. 마나가 바닥나 다른 주문을 못 씀.
    glyphBlood: { chance: .26, cooldown: 4, multiplier: .8, allIn: { hpRatio: 0, hpScale: 0, manaScale: .5, heal: 1.5 } },
    // 縛: 피해 없이 상대 기절, 자신도 1턴 기절(刹을 장착하면 생략).
    glyphBind: { chance: .3, cooldown: 3, multiplier: 1, statusTurns: 1, selfEffect: { status: 'stun', turns: 1, waivedBy: 'glyphInstant' } },
    // 刹: 곧바로 한 번 더 행동, 대신 자신 감속 3턴.
    glyphInstant: { chance: .26, cooldown: 4, multiplier: .8, selfEffect: { status: 'slow', turns: 3 } },
    // 魂: 혼자면 거의 피해가 없고 자신 약화. 이번 전투에 새긴 인 1개마다 피해 +70%.
    glyphSoul: { chance: .26, cooldown: 3, multiplier: .5, sealPower: .7, selfEffect: { status: 'weaken', turns: 2 } },
};

/** 피해 없이 상태이상만 거는 기술. */
export const V25_STATUS_ONLY = ['slackHand', 'glyphBind'];

export const V25_HINTS: Record<string, string> = {
    clockmaker: '시간의 문은 하루 내내 이 직업에게 열려 있습니다.',
    chronarch: '시계공의 모든 톱니를 맞춘 자에게.',
    glyphMonk: '일곱 글자를 품은 수행자. 조건 없이 문을 두드릴 수 있습니다.',
};
