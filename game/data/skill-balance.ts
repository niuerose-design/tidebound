import type { Skill } from '../types';
import { EXPANSION_BALANCE } from './expansion';
import { STATUS_TUNING, SKILL_FORMULA } from './balance';
import { LINEAGE_BALANCE } from './expansion-lineages';
import { V24_BALANCE } from './expansion-v24';
import { DEFENSE_BALANCE } from './expansion-defense';
import { INVERSION_BALANCE } from './expansion-inversion';
import { MONOSTAT_BALANCE } from './expansion-monostat';
import { SUPPORT_BALANCE } from './support-rework';
import { V25_BALANCE, V25_STATUS_ONLY } from './expansion-v25';
import { ATTRIBUTE_NAMES, PROGRESSION, STAT_LABELS } from './progression';

/** 플레이어 기술의 최종 수치. 적 기술은 data/encounters.ts에서 따로 조정합니다. */
export const ACTIVE_SKILL_BALANCE: Record<string, Partial<Skill>> = {
    hook: { chance: .18, multiplier: 1.25, cooldown: 3 },
    breath: { chance: .45, multiplier: 0, manaCost: 5, cooldown: 5, damageType: 'magic', healRatio: .18, healOnly: true },
    pierce: { chance: .24, multiplier: 1.9, penetrationBonus: .2, cooldown: 4 },
    hunt: { chance: .2, multiplier: 2.3, cooldown: 5, damageBonusCondition: 'lowHp', conditionalDamageBonus: .9 },
    wave: { chance: .6, multiplier: 1.9, manaCost: 14, cooldown: 3 },
    spring: { chance: .55, multiplier: 1.8, manaCost: 14, healRatio: .16 },
    anchor: { chance: .22, multiplier: 1.55, cooldown: 4 },
    fortress: { chance: .2, multiplier: 1.35, healRatio: .12, cooldown: 5 },
    cut: { chance: .24, multiplier: 1.15 },
    whaleStrike: { chance: .24, multiplier: 3.2 },
    razor: { chance: .28, multiplier: 1.6 },
    maelstrom: { chance: .55, multiplier: 2.4, manaCost: 20, damageType: 'magic' },
    pearlPrayer: { chance: .6, multiplier: 1.7, manaCost: 16, damageType: 'magic', healRatio: .18 },
    crush: { chance: .22, multiplier: 1.5 },
    oath: { chance: .24, multiplier: 2.1, drainRatio: .15 },
    vitalSurge: { chance: .25, multiplier: 1.65, balanceBonus: .3 },
    // v27.5 망인 계보(다크 엘리멘트 · 쉐도우 배트)는 계승 가치가 같은 차수 기술 중 꼴찌라 올려 둔 값입니다.
    // v27.4 유리 대포(제약 직업): 240%·빈사 +50%.
    wakeFist: { chance: .26, multiplier: 1.3, extraAttacks: 1, extraAttackMultiplier: .5 },
    rippleGlyph: { chance: .55, multiplier: 1.2, manaCost: 11, cooldown: 3 },
    greenTide: { chance: .55, multiplier: 1.3, manaCost: 11, healRatio: .16 },
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
    bellCrash: { chance: .26, multiplier: 1.5, scalingRatio: .02 },
    // v21 수호 계열: 물리 방어 비례 피해(방어 친화도 적용).
    thornCounter: { chance: .26, multiplier: 1.8, scaling: 'defense', scalingRatio: 1.2 },
    loadedHook: { chance: .3, multiplier: 1.05, cooldown: 2, drainRatio: .1 },
    redWake: { chance: .26, multiplier: 1.9, balanceBonus: .4 },
    // 올라운더: check-all-rounder.mjs 검증값
    twinHook: { chance: .24, multiplier: 1.15, extraAttackMultiplier: .5 },
    electricBite: { chance: .28, multiplier: 1.75, damageType: 'physical' },
    tentacleBarrage: { chance: .22, multiplier: 1.05, extraAttackMultiplier: .45 },
    sovereignSilence: { chance: .5, multiplier: 1.05, manaCost: 16 },
    borrowedTentacles: { chance: .26, multiplier: 1.6, extraAttackMultiplier: .7 },
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
 * 상태이상 규칙(v24.1 혼합 방식)
 * - STATUS_ONLY: 배율이 낮은 보조기. 피해 없이 상태이상만 걸고 지속 턴이 늘어납니다(기절 +1, 그 밖 +2).
 * - 그 밖의 기술은 피해와 상태이상을 함께 줄 수 있습니다. 대신 전투에서
 *   ① 상대에게 이미 걸린 상태이상은 다시 걸지 않고(그 기술은 건너뜀, 중첩형 중독 제외)
 *   ② 상태이상이 풀린 뒤 잠시 같은 상태이상에 면역이며(STATUS_TUNING.immuneTurns)
 *   ③ 1~2차(공용 포함)의 피해+기절·침묵 기술은 피해 배율이 제한됩니다(STATUS_TUNING.earlyStatusMultiplierCap).
 * - 1~3차 연계 공격기는 상태이상 없이 피해만 줍니다(같은 계보의 보조기로 상태를 겁니다).
 */
const STATUS_ONLY_SKILLS = ['anchor', 'curseBolt', 'gashHook', 'inkTrick', 'palmStrike', 'rippleGlyph', 'runeHammer', 'shieldBash', 'venomDart',
    'crush', 'discord', 'dragonDive', 'hagglingHook', 'redWaltz', 'runeCurrent', 'saltCatalyst', 'sovereignSilence', 'toxicFang', 'razor', 'hexChain', 'bulwarkSlam', 'needleStep',
    'quakeStep', 'sealHex', ...V25_STATUS_ONLY];
const STATUS_ONLY_MAX_CHANCE = .3;
const STATUS_DEFAULT_TURNS: Record<string, number> = { stun: 1, bleed: 3, poison: 4, burn: 3, weaken: 3, silence: 2, slow: 3, corrode: STATUS_TUNING.corrodeTurns };
/** 상태이상 전용 전환과 초반 배율 제한. 밸런스 표 적용 직후, 설명을 쓰기 전에 실행합니다. tier는 기술 주인 직업의 차수(공용 0). */
function applyStatusRules(sk: Skill, tier: number) {
    if (STATUS_ONLY_SKILLS.includes(sk.id) && sk.effect && STATUS_DEFAULT_TURNS[sk.effect] !== undefined) {
        sk.statusOnly = true;
        sk.statusTurns = (sk.statusTurns ?? STATUS_DEFAULT_TURNS[sk.effect]) + (sk.effect === 'stun' ? 1 : 2);
        // 피해 없는 행동이 공격 턴을 너무 많이 잡아먹지 않도록: 발동률 30% 이하, 걸어 둔 상태가 끝나기 전에는 다시 쓰지 않습니다.
        sk.chance = Math.min(sk.chance, STATUS_ONLY_MAX_CHANCE);
        sk.cooldown = Math.max(sk.cooldown, sk.statusTurns);
        delete sk.damageBonusCondition; delete sk.conditionalDamageBonus; delete sk.extraAttacks; delete sk.penetrationBonus;
        if (sk.charge) sk.desc += ` 명중하면 충전 +${sk.charge}(약화된 적이면 +${sk.charge + SKILL_FORMULA.charge.weakenedExtra}).`;
        return;
    }
    // 1~3차 연계 공격기(제어·출혈·약화 중인 적 추가 피해)는 상태이상 없이 피해만 줍니다. 상태는 같은 계보의 보조기가 겁니다.
    // (직접 건 상태 때문에 연계기가 건너뛰어지는 일을 막습니다.)
    if (tier <= 3 && sk.damageBonusCondition && sk.damageBonusCondition !== 'lowHp' && sk.effect && STATUS_DEFAULT_TURNS[sk.effect] !== undefined) {
        delete sk.effect; delete sk.statusTurns; delete sk.dotName; delete sk.dotRatio;
        return;
    }
    const cap = sk.effect ? STATUS_TUNING.earlyStatusMultiplierCap[sk.effect] : undefined;
    if (cap !== undefined && tier <= 2) sk.multiplier = Math.min(sk.multiplier, cap);
}

const PROGRESS_SOURCE: Record<string, string> = { codex: '도감 기록 수', catch: 'log10(누적 처치 + 1)', hunt: '√(던전 클리어 + 보스 처치)', gold: 'log10(보유 골드 + 1)', relic: '렐릭의 힘' };
/** v24.2 진행도·도박·올인·골드 기술의 한 줄 설명. */
function progressDesc(sk: Skill) {
    let out = '';
    if (sk.scaling && PROGRESS_SOURCE[sk.scaling]) out += ` 피해 × (1 + ${PROGRESS_SOURCE[sk.scaling]} × ${sk.scalingRatio}).`;
    if (sk.dice) out += ` ${ATTRIBUTE_NAMES[sk.dice.attribute]} ${sk.dice.per}마다 주사위 1개(최대 ${sk.dice.max}개)를 굴려 가장 높은 눈으로 피해 ×${sk.dice.low}~×${sk.dice.high}.`;
    if (sk.gamble && sk.gamble.min !== sk.gamble.max) out += ` 쓸 때마다 피해 ×${sk.gamble.min}~${sk.gamble.max}${sk.gamble.accuracy ? ` · 명중 ±${Math.round(sk.gamble.accuracy * 100)}%p` : ''} 무작위.`;
    if (sk.allIn) out += ` 현재 체력 ${Math.round(sk.allIn.hpRatio * 100)}%와 남은 마나를 모두 걸고 (건 체력 × ${sk.allIn.hpScale} + 건 마나 × ${sk.allIn.manaScale})를 피해에 더합니다.`;
    if (sk.goldSpend) out += ` 보유 골드 ${Math.round(sk.goldSpend.ratio * 1000) / 10}%(최대 ${[sk.goldSpend.capAttack ? `${sk.damageType === 'magic' ? '마법' : '물리'} 공격 × ${sk.goldSpend.capAttack}` : '', sk.goldSpend.cap ? sk.goldSpend.cap.toLocaleString() : ''].filter(Boolean).join(' · ')})를 던져 × ${sk.goldSpend.scale}만큼 피해에 더합니다.`;
    if (sk.preyBonus) out += ` 보스·지정 몬스터에게 피해 +${Math.round(sk.preyBonus * 100)}%.`;
    if (sk.allIn?.heal) out += ` 건 마나 × ${sk.allIn.heal}만큼 회복.`;
    if (sk.recoil) out += ` 준 피해의 ${Math.round(sk.recoil * 100)}%를 자신도 받습니다(체력 1 아래로는 안 내려감).`;
    if (sk.sureHit) out += ' 반드시 명중합니다.';
    if (sk.extraTurn) out += ' 곧바로 한 번 더 행동합니다.';
    if (sk.sealPower) out += ` 이번 전투에 새긴 인 1개마다 피해 +${Math.round(sk.sealPower * 100)}%.`;
    if (sk.selfEffect) out += ` 쓰고 나면 자신 ${{ stun: '기절', slow: '감속', weaken: '약화' }[sk.selfEffect.status]} ${sk.selfEffect.turns}턴.`;
    return out;
}

/** 마법·복합 기술 마나 비용 배율(근거: scripts/check-attributes.mjs). */
const MAGIC_MANA_COST_SCALE = 4;

/** v3.86 실패할 때마다 기본 발동률을 더하는 판정(c → 2c → 3c …, 최대 100%)의 기대 판정 수. */
export function awakenExpectedRolls(c: number) {
    let rolls = 0, miss = 1;
    for (let k = 1; miss > 1e-9; k++) { rolls += miss; miss *= 1 - Math.min(1, k * Math.max(.01, c)); }
    return rolls;
}
const awakenDesc = (desc: string) => desc.startsWith('[각성]') ? desc : `[각성] ${desc}`;
/** v3.86 각성기로 바꿉니다: 대기는 턴 단위(SKILL_FORMULA.awaken), 배율은 옛 행동 단위 기대 기여를 넘도록 키웁니다(숙련 완료 발동률 기준). */
export function awakenSkill(sk: Skill) {
    if (sk.awaken || sk.type !== 'active') return;
    const A = SKILL_FORMULA.awaken, steps = sk.masteryMilestones?.length || PROGRESSION.skillMasteryMilestones.length;
    const c = Math.min(.95, sk.chance + steps * (sk.rankEffects?.chanceIncrease ?? 0));
    const cd = sk.awakenCooldown ?? A.cooldown, before = sk.cooldown + 1 / c, after = cd + awakenExpectedRolls(c), old = sk.multiplier;
    sk.multiplier = Math.round(sk.multiplier * after / before * A.boost * 10) / 10;
    sk.desc = awakenDesc((sk.desc || '').replace(`× ${old} 피해`, `× ${sk.multiplier} 피해`));
    sk.cooldown = cd;
    // 덜 자주 걸리는 만큼 거는 상태이상의 지속(패시브 보너스 포함)도 같은 비율로 늘려 유지율을 맞춥니다(예: 출혈 3+2턴 → 9턴).
    // v3.132 alsoEffect(포이즌 노바)는 적힌 지속(7턴 + 패시브)을 그대로 씁니다.
    sk.awaken = { start: sk.awakenCooldown ?? A.start, ...(sk.effect && STATUS_DEFAULT_TURNS[sk.effect] !== undefined && !sk.alsoEffect ? { statusScale: Math.round(after / before * 100) / 100 } : {}) };
}

export function tuneActiveSkills(skills: Skill[], tierOf: (sk: Skill) => number = () => 0) {
    for (const sk of skills) {
        const tuning = ACTIVE_SKILL_BALANCE[sk.id];
        if (!tuning) continue;
        Object.assign(sk, tuning);
        applyStatusRules(sk, tierOf(sk));
        // 복합(split) 피해도 마나를 쓰는 주문으로 취급합니다.
        const magic = sk.damageType === 'magic' || sk.damageType === 'split' || sk.damageType === 'fixed' && sk.baseStat === 'magic';
        // 물리 기술은 마나를 쓰지 않고, 마법·복합 기술은 정신(마나 회복)에 투자해야 꾸준히 쓸 수 있도록 비용을 높입니다.
        sk.manaCost = magic ? Math.round((sk.manaCost || 0) * MAGIC_MANA_COST_SCALE) : 0;
        // At maximum mastery physical procs stay <= 38%; spells remain paid.
        sk.rankEffects = { ...sk.rankEffects, multiplierScale: sk.id === 'hook' ? .03 : .05,
            chanceIncrease: sk.id === 'hook' || sk.statusOnly ? .01 : magic ? .025 : .02,
            manaReduction: magic ? 1 : 0, cooldownReduction: 0 };
        // v3.132 도트 퍼니셔는 5차지만 일반 액티브로 남습니다(v3.282 대기 4, 최대 중첩이면 초기화).
        if (tierOf(sk) >= SKILL_FORMULA.awaken.tier && !sk.dotFinisher) awakenSkill(sk);
        // Numeric descriptions are rendered from the effective values in the UI.
        // Keep exported base descriptions truthful as well.
        const source = sk.scaling === 'attr' && sk.scalingAttribute ? `${ATTRIBUTE_NAMES[sk.scalingAttribute]} × ${sk.scalingRatio ?? 1}${sk.scalingAttack ? ` + 물리 공격 × ${sk.scalingAttack}` : ''}` : sk.scaling === 'harmony' ? '올라운드 밸런스 원시 피해' : sk.scaling === 'arcane' ? '마력 평타 계수 기준값' : sk.scaling === 'dual' ? '(물리 + 마법 공격) ÷ 2' : sk.scaling === 'swap' ? (sk.damageType === 'magic' ? '물리 공격(마법 피해)' : '마법 공격(물리 피해)') : sk.damageType === 'fixed' ? `${sk.baseStat === 'magic' ? '마법' : '물리'} 공격(고정 피해 · 방어 무시)` : sk.damageType === 'magic' ? '마법 공격' : '물리 공격';
        const scaling = sk.scaling === 'hp' ? ` + 최대 체력 ${(sk.scalingRatio! * 100).toFixed(1)}%` : sk.scaling === 'mana' ? ` + 최대 마나 ${(sk.scalingRatio! * 100).toFixed(1)}%` : sk.scaling === 'hybrid' ? ` + 최대 체력 ${(sk.scalingRatio! * 100).toFixed(1)}% + 최대 마나 ${(sk.scalingRatio! * 200).toFixed(1)}%` : sk.scaling === 'resist' ? ` + 마법 방어 ${(sk.scalingRatio! * 100).toFixed(0)}% × 결계 친화도` : sk.scaling === 'defense' ? ` + 물리 방어 ${(sk.scalingRatio! * 100).toFixed(0)}% × 방어 친화도` : sk.manaBurn ? ` + 태운 마나(현재 마나 ${Math.round(sk.manaBurn * 100)}%) × ${sk.burnScale ?? SKILL_FORMULA.manaBurnScale}` : '';
        const statusName = sk.effect === 'bleed' && sk.dotName ? sk.dotName : { stun: '기절', bleed: '출혈', poison: '중독(중첩)', burn: '화상(중첩)', weaken: '약화', silence: '침묵', slow: '감속', haste: '가속', corrode: '부식' }[sk.effect as 'stun'];
        if (sk.timeRewind) { sk.desc = '피해 없이 내 체력·마나를 가득 채우고 대기 중인 내 기술을 되돌립니다. 전투당 1회.'; continue; }
        if (sk.statusOnly) {
            sk.desc = `피해 없이 ${sk.alsoEffect ? '중독·화상(중첩)' : statusName} ${sk.statusTurns}턴.${sk.effect === 'bleed' ? ` 턴마다 (${source}${scaling}) × ${sk.dotRatio ?? SKILL_FORMULA.bleedRatio} 피해(방어 무시).` : sk.effect === 'poison' ? ` 중첩당 턴마다 (${source}${scaling}) × ${sk.dotRatio ?? SKILL_FORMULA.poisonRatio} 피해(방어 무시).` : sk.effect === 'burn' ? ` 중첩당 턴마다 (${source}${scaling}) × ${sk.dotRatio ?? SKILL_FORMULA.burnRatio} 피해(방어 무시).` : ''}`;
            if (sk.gamble?.accuracy) sk.desc += ` 명중 ±${Math.round(sk.gamble.accuracy * 100)}%p 무작위.`;
            if (sk.cleanseSelf) sk.desc += ' 발동 시 자신의 출혈·중독·감속 해제.';
            if (sk.outsiderChance !== undefined) sk.desc += ` 계보 밖에서 계승하면 발동률 ×${sk.outsiderChance}.`;
            sk.desc += progressDesc(sk);
            continue;
        }
        if (sk.healOnly) { sk.desc = `공격하지 않고 최대 체력 ${Math.round((sk.healRatio ?? .22) * 100)}%를 회복합니다.${progressDesc(sk)}`; continue; }
        // v26.4 외길 기술의 한 줄 설명은 능력치 비례만 말합니다(수치는 상세 보기).
        if (sk.scaling === 'attr' && sk.scalingAttribute) { const an = ATTRIBUTE_NAMES[sk.scalingAttribute]; sk.desc = `${an}${sk.scalingAttack ? '·물리 공격' : ''} 비례 피해.${sk.dice ? ` 주사위 ×${sk.dice.low}~×${sk.dice.high}, ${an}이 많을수록 주사위를 많이 굴립니다.` : ''}${sk.effect && !['heal', 'drain'].includes(sk.effect) ? ` ${statusName} 효과.` : ''}${sk.extraAttacks ? ` 추가 공격 ${sk.extraAttacks}회.` : ''}`; continue; }
        sk.desc = `(${source}${scaling}) × ${sk.multiplier} 피해.${sk.id === 'crush' ? ' 물리 방어 150% 추가 피해.' : ''}`;
        if (sk.effect === 'heal') sk.desc += ` 최대 체력 ${Math.round((sk.healRatio ?? .22) * 100)}% 회복.`;
        if (sk.effect === 'drain') sk.desc += ` 실제 피해의 ${Math.round((sk.drainRatio ?? .25) * 100)}% 회복.`;
        if (sk.effect && !['heal', 'drain'].includes(sk.effect)) sk.desc += sk.alsoEffect ? ` 중독·화상(중첩) ${sk.statusTurns}턴.` : ` ${statusName} 효과.`;
        // v3.132 장착 효과가 있는 액티브(도트 퍼니셔)는 무엇이 오르는지 적습니다.
        if (sk.bonus) sk.desc += ` 장착하면 ${Object.keys(sk.bonus).map(k => STAT_LABELS[k as keyof typeof STAT_LABELS]).join('·')}이 오릅니다.`;
        if (sk.outsiderChance !== undefined) sk.desc += ` 계보 밖에서 계승하면 발동률 ×${sk.outsiderChance}.`;
        if (sk.dotFinisher) sk.desc += ` 적의 중독·화상 중첩에 비례해 ${Math.round(sk.dotFinisher.hitMultiplier * 100)}% 위력 추가타 최대 ${sk.dotFinisher.maxHits}회. 둘 다 최대 중첩이면 ${sk.dotFinisher.maxHits}회와 기절 ${sk.dotFinisher.fullStun}턴${sk.dotFinisher.fullReset ? '(대기 초기화)' : ''}, 일부면 ${Math.round(sk.dotFinisher.maxHits / 2)}~${sk.dotFinisher.maxHits - 1}회와 기절 ${sk.dotFinisher.partStun}턴.`;
        if (sk.damageBonusCondition === 'statuses') sk.desc += ` 적에게 걸린 상태이상 1종마다 피해 +${Math.round((sk.conditionalDamageBonus || 0) * 100)}%.`;
        else if (sk.damageBonusCondition) sk.desc += ` ${{ bleeding: '출혈·중독·화상', weakened: '약화', controlled: '기절·침묵·감속', lowHp: '빈사' }[sk.damageBonusCondition]} 상태의 적에게 피해 +${Math.round((sk.conditionalDamageBonus || 0) * 100)}%.`;
        if (sk.extraAttacks) sk.desc += ` ${Math.round((sk.extraAttackMultiplier ?? .65) * 100)}% 위력으로 추가 공격 ${sk.extraAttacks}회.`;
        if (sk.cleanseSelf) sk.desc += ' 발동 시 자신의 출혈·감속 해제.';
        if (sk.charge) sk.desc += ` 명중하면 충전 +${sk.charge}(약화된 적이면 +${sk.charge + SKILL_FORMULA.charge.weakenedExtra}).`;
        if (sk.chargeNeed) sk.desc += ` 충전 ${sk.chargeNeed}중첩 이상에서만 나가고, 중첩을 모두 소모해 중첩당 피해 +${Math.round((sk.chargeBonus || 0) * 100)}%.`;
        if (sk.chargeHits) sk.desc += ` 명중하면 충전(회피 반격)을 모두 소모해 중첩당 추가타 +${sk.chargeHits}.`;
        if (sk.hpCost) sk.desc += ` 마나 대신 현재 체력의 ${Math.round(sk.hpCost * 100)}%를 바칩니다(체력 1은 남음).`;
        if (sk.manaBurn) sk.desc += ` 고정 마나 소모 없이 현재 마나의 ${Math.round(sk.manaBurn * 100)}%를 태워 그만큼 피해에 더합니다.`;
        if (sk.burnConsume) sk.desc += ` 명중한 적의 화상 중첩을 모두 터뜨려 중첩당 피해 +${Math.round(sk.burnConsume * 100)}%(화상은 사라짐).`;
        if (sk.selfBuff) sk.desc += ` 쓰면 자기 버프 ${sk.selfBuff.name ?? sk.selfBuff.id} ${sk.selfBuff.turns}턴.`;
        if (sk.extendBuffs) sk.desc += ` 살아 있는 자기 버프를 모두 ${sk.extendBuffs}턴 연장.`;
        if (sk.requiresBuff) sk.desc += ` ${sk.requiresBuff === 'spectre' ? '변신' : sk.requiresBuff} 중에만 나갑니다.`;
        if (sk.balanceBonus) sk.desc += ` 여섯 능력치가 고를수록(최저 ÷ 최고) 최대 +${Math.round(sk.balanceBonus * 100)}%.`;
        sk.desc += progressDesc(sk);
        if (sk.condition === 'wounded') sk.desc += ' 체력 70% 이하에서 시도.';
        if (sk.condition === 'healthyTarget') sk.desc += ' 적 체력 60% 이상에서 시도.';
    }
    // v3.86 각성기 설명 앞에 [각성]을 붙입니다(위에서 설명을 다시 썼으므로).
    for (const sk of skills) if (sk.awaken) sk.desc = awakenDesc(sk.desc || '');
}
