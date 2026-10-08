/**
 * v25.24 역전 계보(복합): 물리 공격 계수로 마법 피해를 주는 직업(아크 (1차)). 반대 방향(마법 계수 → 물리 피해)은 v3.140부터 루미너스 계보가 맡습니다.
 * v3.158 접신: 차지드라이브가 명중하면 충전이 쌓이고, 패시브의 need에 닿으면 충전을 비우며 자기 버프 ‘접신’(피해 · 속도 배율)에 들어갑니다. 각성 인피니티 스펠은 접신 중에만.
 * scaling 'swap': 피해 기준값을 피해 유형과 반대 공격력에서 가져옵니다. 근력만 올린 모험가가 마법 방어가 약한 적을 때리고,
 * 지능만 올린 모험가가 물리 방어가 약한 적을 때릴 수 있어, 물리 패시브(공격 +N)가 마법 피해로, 마법 패시브가 물리 피해로 이어집니다.
 */
import type { Job } from './classes';
import type { Skill } from '../types';

type NewJob = Omit<Job, 'masteryTarget' | 'masteryBoost'> & Partial<Pick<Job, 'masteryTarget' | 'masteryBoost'>>;
const neutral = { attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0 };
const T1 = { tier: 1, level: 10, mastery: 0, masteryTarget: 450, masteryBoost: .08 };
const T2 = { tier: 2, level: 25, mastery: 75, masteryTarget: 2800, masteryBoost: .18 };
const T3 = { tier: 3, level: 40, mastery: 150, masteryTarget: 10000, masteryBoost: .3 };
const T4 = { tier: 4, level: 55, rebirth: 1, mastery: 300, masteryTarget: 20000, masteryBoost: .32 };
const T5 = { tier: 5, level: 70, rebirth: 2, mastery: 600, masteryTarget: 30000, masteryBoost: .35 };

export const INVERSION_JOBS: NewJob[] = [
    { id: 'brawnMage', name: '힘법사', title: '주먹으로 주문을 쓴다', desc: '물리 공격 계수로 마법 피해를 주는 스펠 불릿으로 충전을 쌓고, 충전이 차면 접신에 들어가는 1차 직업입니다. 근력을 올리면 주문이 세집니다.', ...neutral, bonus: { attack: 4, resist: 4 }, ...T1, requires: { str: 12, int: 10 }, role: '역전 · 접신 입문', tree: 'hybrid' },
    { id: 'inverseMage', name: '역법사', title: '회로를 거꾸로 잇는다', desc: '아크 계보의 2차 직업입니다. 플레인 차지드라이브로 충전을 쌓고, 패시브 스칼렛 차지드라이브가 접신(충전 5 · 피해 ×1.35)을 엽니다.', ...neutral, bonus: { attack: 26, magic: 10, hp: 30 }, crit: .04, ...T2, parent: 'brawnMage', requires: { str: 26, int: 22 }, requiresSkillMastery: { brawnWave: 2 }, role: '역전 · 접신', tree: 'hybrid' },
    { id: 'paradoxCaster', name: '역리술사', title: '이치를 뒤집는 자', desc: '아크 계보의 3차 직업입니다. 거스트 차지드라이브로 충전을 쌓고, 패시브 어비스 차지드라이브가 더 센 접신(피해 ×1.45, 4턴)을 엽니다.', ...neutral, bonus: { attack: 60, magic: 20, hp: 80, resist: 6 }, crit: .05, ...T3, parent: 'inverseMage', requires: { str: 42, int: 36 }, requiresSkillMastery: { refluxBurst: 3 }, role: '역전 · 접신', tree: 'hybrid' },
    { id: 'paradoxSage', name: '역리의 현자', title: '거꾸로 흐르는 바다', desc: '아크 계보의 환생 후 4차 직업입니다. 그립 오브 애거니(추가타)로 충전을 빨리 쌓고, 패시브 끝없는 악몽이 접신(피해 ×1.55 · 속도 ×1.15)을 엽니다.', ...neutral, attack: 1.42, hp: 1.16, resist: 1.12, crit: .06, ...T4, parent: 'paradoxCaster', requires: { str: 54, int: 46 }, requiresSkillMastery: { paradoxRupture: 3 }, role: '역전 · 접신', tree: 'hybrid' },
    { id: 'skyInverter', name: '역천자', title: '하늘과 바다를 맞바꾼다', desc: '아크 계보의 5차 직업입니다. 접신 중에만 나가는 각성 인피니티 스펠(물리 공격 계수 → 마법 피해)과, 충전 4에 접신(피해 ×1.6 · 속도 ×1.25)을 여는 데빌 오브 스칼렛을 가집니다.', ...neutral, attack: 1.54, hp: 1.22, resist: 1.18, crit: .08, ...T5, parent: 'paradoxSage', requires: { str: 66, int: 56 }, requiresSkillMastery: { worldInversion: 3 }, role: '접신 최상위', tree: 'hybrid' },
];

export const INVERSION_LINEAGES = [
    { id: 'brawnMage', name: '힘법사 계보', tree: 'hybrid' as const, summary: '물리 공격 계수로 마법 피해를 주며, 차지드라이브로 충전을 쌓아 접신(피해 · 속도 배율 자기 버프)에 들어가는 계보입니다(반대 방향 역전은 루미너스).' },
];

const P = { type: 'passive' as const, chance: 0, cooldown: 0, multiplier: 0, rankEffects: { bonusScale: .3 } };
const A = { type: 'active' as const };
/** 물리 공격 계수 → 마법 피해(마법 방어로 막힘). */
const brawnSpell = { damageType: 'magic' as const, scaling: 'swap' as const };
const M4 = [2500, 12000, 40000, 100000], M5 = [4000, 18000, 60000, 150000];

export const INVERSION_SKILLS: Skill[] = [
    { ...A, ...brawnSpell, id: 'brawnWave', name: '완력 파동', desc: '', level: 10, job: 'brawnMage', chance: .5, cooldown: 3, multiplier: 1.3, cost: 2, manaCost: 6, charge: 1 },
    { ...P, id: 'muscleMana', name: '근육 마력', desc: '물리 공격과 마법 방어가 오르고, 충전 6에 접신(피해 ×1.25, 3턴)에 들어갑니다.', level: 10, job: 'brawnMage', cost: 2, bonus: { attack: 8, resist: 6 }, spectre: { need: 6, turns: 3, damageMultiplier: 1.25 } },
    { ...A, ...brawnSpell, id: 'refluxBurst', name: '역류 폭발', desc: '', level: 25, job: 'inverseMage', chance: .5, cooldown: 3, multiplier: 1.6, cost: 3, manaCost: 9, charge: 1 },
    { ...P, id: 'invertedCircuit', name: '뒤집힌 회로', desc: '물리 공격·마법 공격·최대 마나가 오르고, 충전 5에 접신(피해 ×1.35, 3턴)에 들어갑니다.', level: 25, job: 'inverseMage', cost: 2, bonus: { attack: 12, magic: 8, mana: 15 }, spectre: { need: 5, turns: 3, damageMultiplier: 1.35 } },
    { ...A, ...brawnSpell, id: 'paradoxRupture', name: '역리 파열', desc: '', level: 40, job: 'paradoxCaster', chance: .5, cooldown: 4, multiplier: 2.2, cost: 4, manaCost: 13, charge: 1 },
    { ...P, id: 'paradoxHeart', name: '역리의 심장', desc: '물리 공격·마법 방어·체력이 오르고, 충전 5에 접신(피해 ×1.45, 4턴)에 들어갑니다.', level: 40, job: 'paradoxCaster', cost: 3, bonus: { attack: 22, resist: 15, hp: 90 }, spectre: { need: 5, turns: 4, damageMultiplier: 1.45 } },
    { ...A, ...brawnSpell, id: 'heavenEarthInversion', name: '천지 역전', desc: '', level: 55, job: 'paradoxSage', chance: .5, cooldown: 4, multiplier: 2.2, cost: 5, manaCost: 16, extraAttacks: 1, extraAttackMultiplier: .6, charge: 1, masteryMilestones: M4 },
    { ...P, id: 'reverseTide', name: '거꾸로 흐르는 조류', desc: '물리 공격·체력·마법 방어가 오르고, 충전 5에 접신(피해 ×1.55 · 속도 ×1.15, 4턴)에 들어갑니다.', level: 55, job: 'paradoxSage', cost: 3, bonus: { attack: 35, hp: 150, resist: 25, manaRegen: 2 }, spectre: { need: 5, turns: 4, damageMultiplier: 1.55, speedMultiplier: 1.15 }, masteryMilestones: M4 },
    { ...A, ...brawnSpell, id: 'worldInversion', name: '세계 역전', desc: '', level: 70, job: 'skyInverter', chance: .5, cooldown: 5, multiplier: 3.6, cost: 6, manaCost: 20, requiresBuff: 'spectre', masteryMilestones: M5 },
    { ...P, id: 'skyInverterAura', name: '역천의 기운', desc: '물리 공격과 치명타가 크게 오르고 마법 방어가 오르며, 충전 4에 접신(피해 ×1.6 · 속도 ×1.25, 4턴)에 들어갑니다.', level: 70, job: 'skyInverter', cost: 3, bonus: { attack: 70, crit: .05, resist: 30 }, spectre: { need: 4, turns: 4, damageMultiplier: 1.6, speedMultiplier: 1.25 }, masteryMilestones: M5 },
];

/** 밸런스 표: 액티브의 발동률·배율·대기·마나(마나는 skill-balance가 ×4). 상태 규칙과 설명 생성도 이 표를 거쳐야 적용됩니다. */
export const INVERSION_BALANCE: Record<string, Partial<Skill>> = Object.fromEntries(
    INVERSION_SKILLS.filter(sk => sk.type === 'active').map(sk => [sk.id, { chance: sk.chance, multiplier: sk.multiplier, cooldown: sk.cooldown, ...(sk.manaCost ? { manaCost: sk.manaCost } : {}) }]),
);
