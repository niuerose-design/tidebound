import type { Skill } from '../types';
import { EXPANSION_BALANCE } from './expansion';

/** 2026-09-28: player techniques only; enemy skills keep their own tuning. */
export const ACTIVE_SKILL_BALANCE: Record<string, Partial<Skill>> = {
    hook: { chance: .18, multiplier: 1.25, cooldown: 3 },
    splash: { chance: .45, multiplier: 1.05, manaCost: 9, cooldown: 5 },
    breath: { chance: .45, multiplier: .85, manaCost: 10, cooldown: 5, damageType: 'magic', healRatio: .1 },
    pierce: { chance: .24, multiplier: 1.9, penetrationBonus: .2, cooldown: 4 },
    hunt: { chance: .2, multiplier: 2.8, cooldown: 5 },
    wave: { chance: .6, multiplier: 1.9, manaCost: 14, cooldown: 3 },
    spring: { chance: .55, multiplier: 1.8, manaCost: 14, healRatio: .16 },
    anchor: { chance: .22, multiplier: 1.55, cooldown: 4 },
    fortress: { chance: .2, multiplier: 1.35, healRatio: .12, cooldown: 5 },
    arcane: { chance: .6, multiplier: 1.55, manaCost: 10, cooldown: 2 },
    cut: { chance: .24, multiplier: 1.15 },
    hushCurrent: { chance: .5, multiplier: 1.1, manaCost: 11 },
    undertow: { chance: .55, multiplier: 1.2, manaCost: 10 },
    rushCurrent: { chance: .28, multiplier: 1.05, cooldown: 4 },
    whaleStrike: { chance: .24, multiplier: 3.2 },
    razor: { chance: .28, multiplier: 1.9 },
    maelstrom: { chance: .55, multiplier: 2.6, manaCost: 20, damageType: 'magic' },
    pearlPrayer: { chance: .6, multiplier: 1.7, manaCost: 16, damageType: 'magic', healRatio: .18 },
    crush: { chance: .22, multiplier: 1.5 },
    oath: { chance: .24, multiplier: 2.1, drainRatio: .15 },
    soulHook: { chance: .24, multiplier: 1.9, drainRatio: .15 },
    eternalWave: { chance: .6, multiplier: 3, manaCost: 24 },
    vitalSurge: { chance: .23, multiplier: 1.65, scalingRatio: .05, drainRatio: .15 },
    voidLance: { chance: .55, multiplier: 2, scalingRatio: .3, manaCost: 20 },
    graveHook: { chance: .5, multiplier: 1.7, manaCost: 13 },
    marrowGuard: { chance: .22, multiplier: 1.4 },
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
};

export function tuneActiveSkills(skills: Skill[]) {
    for (const sk of skills) {
        const tuning = ACTIVE_SKILL_BALANCE[sk.id];
        if (!tuning) continue;
        Object.assign(sk, tuning);
        // 복합(split) 피해도 마나를 쓰는 주문으로 취급합니다.
        const magic = sk.damageType === 'magic' || sk.damageType === 'split';
        if (!magic) sk.manaCost = 0;
        // At maximum mastery physical procs stay <= 38%; spells remain paid.
        sk.rankEffects = { ...sk.rankEffects, multiplierScale: sk.id === 'hook' ? .03 : .05,
            chanceIncrease: sk.id === 'hook' ? .01 : magic ? .025 : .02,
            manaReduction: magic ? 1 : 0, cooldownReduction: 0 };
        // Numeric descriptions are rendered from the effective values in the UI.
        // Keep exported base descriptions truthful as well.
        const source = sk.scaling === 'harmony' ? '육중 조화 원시 피해' : sk.scaling === 'dual' ? '(물리 + 마법 공격) ÷ 2' : sk.id === 'oath' ? '물리·마법 공격 중 높은 값' : sk.damageType === 'magic' ? '마법 공격' : '물리 공격';
        const scaling = sk.scaling === 'hp' ? ` + 최대 체력 ${(sk.scalingRatio! * 100).toFixed(1)}%` : sk.scaling === 'mana' ? ` + 최대 마나 ${(sk.scalingRatio! * 100).toFixed(1)}%` : sk.scaling === 'hybrid' ? ` + 최대 체력 ${(sk.scalingRatio! * 100).toFixed(1)}% + 최대 마나 ${(sk.scalingRatio! * 200).toFixed(1)}%` : sk.scaling === 'defense' ? ` + 물리 방어 ${(sk.scalingRatio! * 100).toFixed(0)}% × 방어 친화도` : '';
        sk.desc = `(${source}${scaling}) × ${sk.multiplier} 피해.${sk.id === 'crush' ? ' 물리 방어 150% 추가 피해.' : ''}`;
        if (sk.effect === 'heal') sk.desc += ` 최대 체력 ${Math.round((sk.healRatio ?? .22) * 100)}% 회복.`;
        if (sk.effect === 'drain') sk.desc += ` 실제 피해의 ${Math.round((sk.drainRatio ?? .25) * 100)}% 회복.`;
        if (sk.effect && !['heal', 'drain'].includes(sk.effect)) sk.desc += ` ${sk.effect === 'bleed' && sk.dotName ? sk.dotName + (sk.dotStacks ? '(중첩)' : '') : { stun: '기절', bleed: '출혈', weaken: '약화', silence: '침묵', slow: '감속', haste: '가속' }[sk.effect as 'stun']} 효과.`;
        if (sk.damageBonusCondition) sk.desc += ` ${{ bleeding: '출혈·중독', weakened: '약화', controlled: '침묵·감속', lowHp: '빈사' }[sk.damageBonusCondition]} 상태의 적에게 피해 +${Math.round((sk.conditionalDamageBonus || 0) * 100)}%.`;
        if (sk.extraAttacks) sk.desc += ` ${Math.round((sk.extraAttackMultiplier ?? .65) * 100)}% 위력으로 추가 공격 ${sk.extraAttacks}회.`;
        if (sk.condition === 'wounded') sk.desc += ' 체력 70% 이하에서 시도.';
        if (sk.condition === 'healthyTarget') sk.desc += ' 적 체력 60% 이상에서 시도.';
    }
}
