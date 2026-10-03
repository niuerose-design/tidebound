import type { Skill } from '../types';
import { EXPANSION_BALANCE } from './expansion';
import { STATUS_TUNING } from './balance';
import { LINEAGE_BALANCE } from './expansion-lineages';
import { V24_BALANCE } from './expansion-v24';
import { DEFENSE_BALANCE } from './expansion-defense';
import { INVERSION_BALANCE } from './expansion-inversion';
import { MONOSTAT_BALANCE } from './expansion-monostat';
import { SUPPORT_BALANCE, SUPPORT_STATUS_ONLY } from './support-rework';
import { V25_BALANCE, V25_STATUS_ONLY } from './expansion-v25';

/** 플레이어 기술의 최종 수치. 적 기술은 data/encounters.ts에서 따로 조정합니다. */
export const ACTIVE_SKILL_BALANCE: Record<string, Partial<Skill>> = {
    hook: { chance: .18, multiplier: 1.25, cooldown: 3 },
    breath: { chance: .45, multiplier: .85, manaCost: 10, cooldown: 5, damageType: 'magic', healRatio: .1 },
    pierce: { chance: .24, multiplier: 1.9, penetrationBonus: .2, cooldown: 4 },
    hunt: { chance: .2, multiplier: 2.3, cooldown: 5, damageBonusCondition: 'lowHp', conditionalDamageBonus: .9 },
    wave: { chance: .6, multiplier: 1.9, manaCost: 14, cooldown: 3 },
    spring: { chance: .55, multiplier: 1.8, manaCost: 14, healRatio: .16 },
    anchor: { chance: .22, multiplier: 1.55, cooldown: 4 },
    fortress: { chance: .2, multiplier: 1.35, healRatio: .12, cooldown: 5 },
    arcane: { chance: .6, multiplier: 1.55, manaCost: 10, cooldown: 2 },
    cut: { chance: .24, multiplier: 1.15 },
    hushCurrent: { chance: .5, multiplier: 1.1, manaCost: 11 },
    undertow: { chance: .55, multiplier: 1.7, manaCost: 10 },
    rushCurrent: { chance: .28, multiplier: 1.05, cooldown: 4 },
    whaleStrike: { chance: .24, multiplier: 3.2 },
    razor: { chance: .28, multiplier: 1.6 },
    maelstrom: { chance: .55, multiplier: 2.4, manaCost: 20, damageType: 'magic' },
    pearlPrayer: { chance: .6, multiplier: 1.7, manaCost: 16, damageType: 'magic', healRatio: .18 },
    crush: { chance: .22, multiplier: 1.5 },
    oath: { chance: .24, multiplier: 2.1, drainRatio: .15 },
    soulHook: { chance: .24, multiplier: 1.9, drainRatio: .15 },
    eternalWave: { chance: .6, multiplier: 2.6, manaCost: 24, cooldownReset: { on: 'kill', chance: 1, pick: 'all' } },
    vitalSurge: { chance: .23, multiplier: 1.65, scalingRatio: .05, drainRatio: .15 },
    voidLance: { chance: .55, multiplier: 2, scalingRatio: .3, manaCost: 20 },
    graveHook: { chance: .5, multiplier: 1.7, manaCost: 13 },
    marrowGuard: { chance: .22, multiplier: 1.75 },
    wakeFist: { chance: .26, multiplier: 1.45 },
    rippleGlyph: { chance: .55, multiplier: 1.2, manaCost: 11, cooldown: 3 },
    greenTide: { chance: .55, multiplier: 1.05, manaCost: 11, healRatio: .14 },
    inkTrick: { chance: .26, multiplier: 1.1 },
    tideUppercut: { chance: .26, multiplier: 1.45, scalingRatio: .025, drainRatio: .15 },
    anchorBreak: { chance: .25, multiplier: 1.8, penetrationBonus: .2 },
    krakenBore: { chance: .2, multiplier: 3.7, scalingRatio: .03 },
    needleStep: { chance: .3, multiplier: 1.4, accuracyBonus: .08, cooldown: 3 },
    runeCurrent: { chance: .6, multiplier: 1.6, manaCost: 14 },
    saltCatalyst: { chance: .6, multiplier: 1.4, manaCost: 12, cooldown: 3 },
    thunderPsalm: { chance: .55, multiplier: 3.5, scalingRatio: .16, manaCost: 28 },
    moonTide: { chance: .6, multiplier: 2, manaCost: 20, healRatio: .2 },
    reefPulse: { chance: .55, multiplier: 1.25, manaCost: 14, healRatio: .16 },
    bellCrash: { chance: .24, multiplier: 1.5, scalingRatio: .02 },
    // v21 수호 계열: 물리 방어 비례 피해(방어 친화도 적용).
    thornCounter: { chance: .26, multiplier: 1.8, scaling: 'defense', scalingRatio: 1.2 },
    windupCast: { chance: .25, multiplier: 1.5, scalingRatio: .03 },
    loadedHook: { chance: .3, multiplier: 1.05, cooldown: 2, drainRatio: .1 },
    redWake: { chance: .24, multiplier: 1.65, scalingRatio: .07, drainRatio: .18 },
    leviathanEquation: { chance: .55, multiplier: 2.6, scalingRatio: .45, manaCost: 28 },
    harvestEcho: { chance: .26, multiplier: 2.2, drainRatio: .18 },
    // 만능 항해사: check-all-rounder.mjs 검증값
    harmonicWeight: { chance: .5, multiplier: 2.2, cooldown: 3, manaCost: 16 },
    twinHook: { chance: .24, multiplier: 1.15, extraAttackMultiplier: .5 },
    electricBite: { chance: .28, multiplier: 1.75, damageType: 'physical' },
    tentacleBarrage: { chance: .22, multiplier: 1.05, extraAttackMultiplier: .45 },
    sovereignSilence: { chance: .5, multiplier: 1.05, manaCost: 16 },
    borrowedTentacles: { chance: .22, multiplier: 1.15, extraAttackMultiplier: .55 },
    ...EXPANSION_BALANCE,
    ...LINEAGE_BALANCE,
    ...V24_BALANCE,
    ...DEFENSE_BALANCE,
    ...INVERSION_BALANCE,
    ...MONOSTAT_BALANCE,
};
// v24.2 보조 계열 개편은 기존 값 위에 덮어씁니다(필드 단위 병합).
for (const [id, tuning] of Object.entries({ ...SUPPORT_BALANCE, ...V25_BALANCE })) ACTIVE_SKILL_BALANCE[id] = { ...ACTIVE_SKILL_BALANCE[id], ...tuning };

/**
 * 상태이상 규칙(v24 → v24.1 혼합 방식)
 * - STATUS_ONLY: 배율이 낮은 보조기. 피해 없이 상태이상만 걸고 지속 턴이 늘어납니다(기절 +1, 그 밖 +2).
 * - 그 밖의 기술은 피해와 상태이상을 함께 줄 수 있습니다. 대신 전투에서
 *   ① 상대에게 이미 걸린 상태이상은 다시 걸지 않고(그 기술은 건너뜀, 중첩형 중독 제외)
 *   ② 상태이상이 풀린 뒤 잠시 같은 상태이상에 면역이며(STATUS_TUNING.immuneTurns)
 *   ③ 1~2차(공용 포함)의 피해+기절·침묵 기술은 피해 배율이 제한됩니다(STATUS_TUNING.earlyStatusMultiplierCap).
 * - 1~3차 연계 공격기는 상태이상 없이 피해만 줍니다(같은 계보의 보조기로 상태를 겁니다).
 */
export const STATUS_ONLY_SKILLS = ['anchor', 'curseBolt', 'cut', 'gashHook', 'hushCurrent', 'inkTrick', 'numbNeedle', 'palmStrike', 'rippleGlyph', 'runeHammer', 'shieldBash', 'venomDart',
    'bellCrash', 'crush', 'discord', 'dragonDive', 'hagglingHook', 'redWaltz', 'runeCurrent', 'saltCatalyst', 'smokeVeil', 'sovereignSilence', 'toxicFang', 'razor', 'hexChain', 'bulwarkSlam', 'needleStep',
    'quakeStep', 'sealHex', 'frostMist', 'driftwoodShove', 'currentJam', 'netThrow', 'oathShout', 'rottenBait', ...SUPPORT_STATUS_ONLY, ...V25_STATUS_ONLY];
const STATUS_ONLY_MAX_CHANCE = .3;
const STATUS_DEFAULT_TURNS: Record<string, number> = { stun: 1, bleed: 3, weaken: 3, silence: 2, slow: 3 };
/** 상태이상 전용 전환과 초반 배율 제한. 밸런스 표 적용 직후, 설명을 쓰기 전에 실행합니다. tier는 기술 주인 직업의 차수(공용 0). */
export function applyStatusRules(sk: Skill, tier: number) {
    if (STATUS_ONLY_SKILLS.includes(sk.id) && sk.effect && STATUS_DEFAULT_TURNS[sk.effect] !== undefined) {
        sk.statusOnly = true;
        sk.statusTurns = (sk.statusTurns ?? STATUS_DEFAULT_TURNS[sk.effect]) + (sk.effect === 'stun' ? 1 : 2);
        // 피해 없는 행동이 공격 턴을 너무 많이 잡아먹지 않도록: 발동률 30% 이하, 걸어 둔 상태가 끝나기 전에는 다시 쓰지 않습니다.
        sk.chance = Math.min(sk.chance, STATUS_ONLY_MAX_CHANCE);
        sk.cooldown = Math.max(sk.cooldown, sk.statusTurns);
        delete sk.damageBonusCondition; delete sk.conditionalDamageBonus; delete sk.extraAttacks; delete sk.penetrationBonus;
        return;
    }
    // 1~3차 연계 공격기(제어·출혈·약화 중인 적 추가 피해)는 상태이상 없이 피해만 줍니다. 상태는 같은 계보의 보조기가 겁니다.
    // (직접 건 상태 때문에 연계기가 건너뛰어지는 일을 막습니다.)
    if (tier <= 3 && sk.damageBonusCondition && sk.damageBonusCondition !== 'lowHp' && sk.effect && STATUS_DEFAULT_TURNS[sk.effect] !== undefined) {
        delete sk.effect; delete sk.statusTurns; delete sk.dotName; delete sk.dotRatio; delete sk.dotStacks;
        return;
    }
    const cap = sk.effect ? STATUS_TUNING.earlyStatusMultiplierCap[sk.effect] : undefined;
    if (cap !== undefined && tier <= 2) sk.multiplier = Math.min(sk.multiplier, cap);
}

const PROGRESS_SOURCE: Record<string, string> = { codex: '도감 기록 수', catch: 'log10(누적 포획 + 1)', hunt: '√(던전 클리어 + 보스 포획)', gold: 'log10(보유 골드 + 1)' };
/** v24.2 진행도·도박·올인·골드 기술의 한 줄 설명. */
export function progressDesc(sk: Skill) {
    let out = '';
    if (sk.scaling && PROGRESS_SOURCE[sk.scaling]) out += ` 피해 × (1 + ${PROGRESS_SOURCE[sk.scaling]} × ${sk.scalingRatio}).`;
    if (sk.gamble && sk.gamble.min !== sk.gamble.max) out += ` 쓸 때마다 피해 ×${sk.gamble.min}~${sk.gamble.max}${sk.gamble.accuracy ? ` · 명중 ±${Math.round(sk.gamble.accuracy * 100)}%p` : ''} 무작위.`;
    if (sk.allIn) out += ` 현재 체력 ${Math.round(sk.allIn.hpRatio * 100)}%와 남은 마나를 모두 걸고 (건 체력 × ${sk.allIn.hpScale} + 건 마나 × ${sk.allIn.manaScale})를 피해에 더합니다.`;
    if (sk.goldSpend) out += ` 보유 골드 ${Math.round(sk.goldSpend.ratio * 1000) / 10}%(최대 ${sk.goldSpend.cap.toLocaleString()})를 던져 × ${sk.goldSpend.scale}만큼 피해에 더합니다.`;
    if (sk.preyBonus) out += ` 보스·지정 어종에게 피해 +${Math.round(sk.preyBonus * 100)}%.`;
    if (sk.allIn?.heal) out += ` 건 마나 × ${sk.allIn.heal}만큼 회복.`;
    if (sk.recoil) out += ` 준 피해의 ${Math.round(sk.recoil * 100)}%를 자신도 받습니다(체력 1 아래로는 안 내려감).`;
    if (sk.sureHit) out += ' 반드시 명중합니다.';
    if (sk.extraTurn) out += ' 곧바로 한 번 더 행동합니다.';
    if (sk.sealPower) out += ` 이번 전투에 새긴 인 1개마다 피해 +${Math.round(sk.sealPower * 100)}%.`;
    if (sk.selfEffect) out += ` 쓰고 나면 자신 ${{ stun: '기절', slow: '감속', weaken: '약화' }[sk.selfEffect.status]} ${sk.selfEffect.turns}턴.`;
    return out;
}

/** 마법·복합 기술 마나 비용 배율(근거: scripts/check-attributes.mjs). */
export const MAGIC_MANA_COST_SCALE = 4;

export function tuneActiveSkills(skills: Skill[], tierOf: (sk: Skill) => number = () => 0) {
    for (const sk of skills) {
        const tuning = ACTIVE_SKILL_BALANCE[sk.id];
        if (!tuning) continue;
        Object.assign(sk, tuning);
        applyStatusRules(sk, tierOf(sk));
        // 복합(split) 피해도 마나를 쓰는 주문으로 취급합니다.
        const magic = sk.damageType === 'magic' || sk.damageType === 'split';
        // 물리 기술은 마나를 쓰지 않고, 마법·복합 기술은 정신(마나 회복)에 투자해야 꾸준히 쓸 수 있도록 비용을 높입니다.
        sk.manaCost = magic ? Math.round((sk.manaCost || 0) * MAGIC_MANA_COST_SCALE) : 0;
        // At maximum mastery physical procs stay <= 38%; spells remain paid.
        sk.rankEffects = { ...sk.rankEffects, multiplierScale: sk.id === 'hook' ? .03 : .05,
            chanceIncrease: sk.id === 'hook' || sk.statusOnly ? .01 : magic ? .025 : .02,
            manaReduction: magic ? 1 : 0, cooldownReduction: 0 };
        // Numeric descriptions are rendered from the effective values in the UI.
        // Keep exported base descriptions truthful as well.
        const source = sk.scaling === 'harmony' ? '육중 조화 원시 피해' : sk.scaling === 'dual' ? '(물리 + 마법 공격) ÷ 2' : sk.scaling === 'swap' ? (sk.damageType === 'magic' ? '물리 공격(마법 피해)' : '마법 공격(물리 피해)') : sk.id === 'oath' ? '물리·마법 공격 중 높은 값' : sk.damageType === 'magic' ? '마법 공격' : '물리 공격';
        const scaling = sk.scaling === 'hp' ? ` + 최대 체력 ${(sk.scalingRatio! * 100).toFixed(1)}%` : sk.scaling === 'mana' ? ` + 최대 마나 ${(sk.scalingRatio! * 100).toFixed(1)}%` : sk.scaling === 'hybrid' ? ` + 최대 체력 ${(sk.scalingRatio! * 100).toFixed(1)}% + 최대 마나 ${(sk.scalingRatio! * 200).toFixed(1)}%` : sk.scaling === 'resist' ? ` + 마법 방어 ${(sk.scalingRatio! * 100).toFixed(0)}% × 결계 친화도` : sk.scaling === 'defense' ? ` + 물리 방어 ${(sk.scalingRatio! * 100).toFixed(0)}% × 방어 친화도` : '';
        const statusName = sk.effect === 'bleed' && sk.dotName ? sk.dotName + (sk.dotStacks ? '(중첩)' : '') : { stun: '기절', bleed: '출혈', weaken: '약화', silence: '침묵', slow: '감속', haste: '가속' }[sk.effect as 'stun'];
        if (sk.restoreAll) { sk.desc = '피해 없이 나와 상대의 체력·마나를 모두 가득 채웁니다. 전투당 1회.'; continue; }
        if (sk.statusOnly) {
            sk.desc = `피해 없이 ${statusName} ${sk.statusTurns}턴.${sk.effect === 'bleed' ? ` 턴마다 (${source}${scaling}) × ${sk.dotRatio ?? .22} 피해(방어 무시).` : ''}`;
            if (sk.gamble?.accuracy) sk.desc += ` 명중 ±${Math.round(sk.gamble.accuracy * 100)}%p 무작위.`;
            if (sk.cleanseSelf) sk.desc += ' 발동 시 자신의 출혈·감속 해제.';
            sk.desc += progressDesc(sk);
            continue;
        }
        sk.desc = `(${source}${scaling}) × ${sk.multiplier} 피해.${sk.id === 'crush' ? ' 물리 방어 150% 추가 피해.' : ''}`;
        if (sk.effect === 'heal') sk.desc += ` 최대 체력 ${Math.round((sk.healRatio ?? .22) * 100)}% 회복.`;
        if (sk.effect === 'drain') sk.desc += ` 실제 피해의 ${Math.round((sk.drainRatio ?? .25) * 100)}% 회복.`;
        if (sk.effect && !['heal', 'drain'].includes(sk.effect)) sk.desc += ` ${statusName} 효과.`;
        if (sk.damageBonusCondition) sk.desc += ` ${{ bleeding: '출혈·중독', weakened: '약화', controlled: '기절·침묵·감속', lowHp: '빈사' }[sk.damageBonusCondition]} 상태의 적에게 피해 +${Math.round((sk.conditionalDamageBonus || 0) * 100)}%.`;
        if (sk.extraAttacks) sk.desc += ` ${Math.round((sk.extraAttackMultiplier ?? .65) * 100)}% 위력으로 추가 공격 ${sk.extraAttacks}회.`;
        if (sk.cleanseSelf) sk.desc += ' 발동 시 자신의 출혈·감속 해제.';
        sk.desc += progressDesc(sk);
        if (sk.condition === 'wounded') sk.desc += ' 체력 70% 이하에서 시도.';
        if (sk.condition === 'healthyTarget') sk.desc += ' 적 체력 60% 이상에서 시도.';
    }
}
