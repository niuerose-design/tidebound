import { tailwindActive, tailwindExp, tierReward } from './meta';
import { displayTitle } from '../data/titles';
import { rebirthExperience, rebirthMemory, evasionRating, evasionRaw, vocationTargets, thresholdRank } from '../data/long-term';
import { itemStats } from './equipment';
import { GEAR_CAPS, RULE_CAPS } from '../data/gear';
import type { State, Snapshot, Stats, CombatStats } from '../types';
import { BALANCE, SAVE_VERSION, SKILL_FORMULA } from '../data/balance';
import { PROGRESSION, ATTRIBUTE_EFFECTS as E } from '../data/progression';
import { JOBS, jobById } from '../data/classes';
import { RESEARCH, researchRank } from '../data/economy';
import { roughReward, vowBadges } from './vows';
import { skillById } from '../data/skills';
import { bookStatBonus, regionThemes } from './book';
import { achievementTotals } from '../data/achievements';
import { accountExpGold, accountPower, accountCrit } from '../data/account';
import { attributes, effectiveSkill, canUse, skillMastery, skillMasteryRanks, skillMasteryRewards, jobMasteryTarget, jobCombatMultiplier, jobFlatBonus, jobFactor, signatureScale, progressCounts, limitBreakScale, brokenStages } from './progression';
/** Legacy PvP snapshots gain safe defaults, never client-supplied progression. */
export function normalizeStats(a: Stats): CombatStats { return { expBonus: 0, goldBonus: 0, dropBonus: 0, rebirthBonus: 0, dungeonGoldBonus: 0, magic: a.attack, resist: a.defense, harmony: 0, accuracy: 1, evasion: 0, critDamage: BALANCE.critMultiplier, superCrit: 0, speed: 10, mana: 40, manaRegen: 3, hpRegen: 0, penetration: 0, lifesteal: 0, thorns: 0, diceTrim: 0, swarmFind: 0, dotBonus: 0, bleedBonus: 0, poisonBonus: 0, burnBonus: 0, guardAffinity: 1, wardAffinity: 1, healFocus: 0, arcaneStrike: 0, stunBonus: 0, controlBonus: 0, dotTurnsBonus: 0, poisonStackBonus: 0, arcaneRatioBonus: 0, followUpBonus: 0, healBonus: 0, executeBonus: 0, codexPower: 0, catchPower: 0, huntPower: 0, goldPower: 0, masteredPower: 0, variantPower: 0, variantFind: 0, goldenFind: 0, attrStr: 0, attrDex: 0, attrInt: 0, attrVit: 0, attrWis: 0, attrLuk: 0, ...a }; }
/** 달성한 도감 연구 단계의 총합(몬스터 × 단계). */
export function mastery(s: State) { return Object.values(s.book).reduce((a, n) => a + BALANCE.bookMilestones.filter(m => n >= m).length, 0); }
/** 능력치 증가 원인. 능력치 화면의 상세보기가 이 순서로 보여줍니다. */
export const STAT_SOURCES = ['base', 'attributes', 'job', 'skills', 'rebirth', 'research', 'book', 'achievement', 'account', 'equipment', 'limit'] as const;
export type StatSource = typeof STAT_SOURCES[number];
const STAT_SOURCE_LABELS: Record<StatSource, string> = { base: '기본(레벨)', attributes: '능력치 배분', job: '직업', skills: '스킬·숙련', rebirth: '환생', research: '세계석 연구', book: '도감', achievement: '업적', account: '계정 보너스', equipment: '장비', limit: '상한·정수 처리' };
/** 세계석 연구가 올리는 능력치 → 연구 id. 물리·마법 공격과 방어는 각각 다른 연구입니다. */
const RESEARCH_BY_STAT: Partial<Record<keyof CombatStats, string>> = { attack: 'attack', magic: 'magicAttack', hp: 'hp', defense: 'guard', resist: 'magicGuard', goldBonus: 'gold', dungeonGoldBonus: 'dungeon', rebirthBonus: 'pearl', crit: 'crit', critDamage: 'critDamage', penetration: 'penetration', evasion: 'evasion', lifesteal: 'lifesteal', manaRegen: 'manaRegen' };
/** 능력치 분해의 원인 이름. 세계석 연구는 해당 연구 이름까지 붙입니다(예: 세계석 연구 · 마력의 기억). */
export function statSourceLabel(k: keyof CombatStats, source: StatSource) {
    const name = source === 'research' ? RESEARCH.find(r => r.id === RESEARCH_BY_STAT[k])?.name : undefined;
    return name ? `${STAT_SOURCE_LABELS.research} · ${name}` : STAT_SOURCE_LABELS[source];
}
/** 원인별 증감 기록. factor는 배율로 적용된 경우의 배율입니다. */
export type StatTrace = Partial<Record<keyof CombatStats, { source: StatSource; delta: number; factor?: number }[]>>;
/**
 * 최종 전투 능력치. trace를 넘기면 각 단계의 증감을 원인별로 기록합니다.
 * 기록 여부와 관계없이 계산 순서와 결과는 같습니다(덧셈·곱셈 순서 유지).
 */
export function stats(s: State, trace?: StatTrace): CombatStats {
    const j = jobById(s.job) || JOBS[0], v = attributes(s), themes = regionThemes(s);
    const rec = (k: keyof CombatStats, source: StatSource, delta: number, factor?: number) => {
        if (trace && delta) (trace[k] ||= []).push(factor === undefined ? { source, delta } : { source, delta, factor });
    };
    const a = { expBonus: 0, goldBonus: 0, dropBonus: 0, rebirthBonus: 0, dungeonGoldBonus: 0, hp: 0, attack: 0, magic: 0, defense: 0, resist: 0, crit: 0, critDamage: 0, superCrit: 0, accuracy: 0, evasion: 0, speed: 0, mana: 0, manaRegen: 0, hpRegen: 0, penetration: 0, lifesteal: 0, harmony: 0, thorns: 0, diceTrim: 0, swarmFind: 0, dotBonus: 0, bleedBonus: 0, poisonBonus: 0, burnBonus: 0, guardAffinity: 0, wardAffinity: 0, healFocus: 0, arcaneStrike: 0, stunBonus: 0, controlBonus: 0, dotTurnsBonus: 0, poisonStackBonus: 0, arcaneRatioBonus: 0, followUpBonus: 0, healBonus: 0, executeBonus: 0, codexPower: 0, catchPower: 0, huntPower: 0, goldPower: 0, variantPower: 0, variantFind: 0, goldenFind: 0, attrStr: 0, attrDex: 0, attrInt: 0, attrVit: 0, attrWis: 0, attrLuk: 0 } as CombatStats;
    const set = (k: keyof CombatStats, source: StatSource, n: number) => { a[k] = n; rec(k, source, n); };
    const add = (k: keyof CombatStats, source: StatSource, n: number) => { a[k] += n; rec(k, source, n); };
    /** 곱셈은 원래 식처럼 한 번에 적용하고, 증감은 원인별 배율 비율로 나눠 기록합니다. */
    const mul = (k: keyof CombatStats, parts: [StatSource, number][]) => {
        const before = a[k], f = parts.reduce((x, [, n]) => x * n, 1);
        a[k] *= f;
        if (!trace) return;
        let running = before;
        for (const [source, n] of parts) { const next = running * n; rec(k, source, next - running, n); running = next; }
    };
    set('expBonus', 'rebirth', permanentExpBonus(s)); add('expBonus', 'job', j.expBonus || 0); add('expBonus', 'account', accountExpGold(s));
    for (const k of ['goldBonus', 'dropBonus', 'rebirthBonus', 'dungeonGoldBonus', 'penetration', 'lifesteal'] as const) a[k] = 0;
    set('hp', 'base', BALANCE.baseHp + (s.level - 1) * BALANCE.hpPerLevel); add('hp', 'attributes', v.vit * E.vit.hp);
    set('attack', 'base', BALANCE.baseAttack + (s.level - 1) * BALANCE.attackPerLevel); add('attack', 'attributes', v.str * E.str.attack);
    set('magic', 'base', 10 + (s.level - 1) * 3); add('magic', 'attributes', v.int * E.int.magic);
    set('defense', 'base', BALANCE.baseDefense + (s.level - 1) * BALANCE.defensePerLevel); add('defense', 'attributes', v.vit * E.vit.defense); add('defense', 'attributes', v.str * E.str.defense);
    set('resist', 'base', 3 + (s.level - 1) * .7); add('resist', 'attributes', v.wis * E.wis.resist);
    set('crit', 'base', BALANCE.baseCrit); add('crit', 'job', j.crit); add('crit', 'attributes', v.luk * E.luk.crit);
    set('critDamage', 'base', BALANCE.critMultiplier); add('critDamage', 'attributes', v.luk * E.luk.critDamage);
    set('goldenFind', 'base', BALANCE.goldenBase);
    set('accuracy', 'base', .92); add('accuracy', 'attributes', v.dex * E.dex.accuracy);
    const dexEvasion = v.dex * E.dex.evasion; set('evasion', 'attributes', dexEvasion);
    set('speed', 'base', 10); add('speed', 'attributes', v.dex * E.dex.speed);
    set('mana', 'base', 30); add('mana', 'attributes', v.wis * E.wis.mana); add('mana', 'attributes', v.int * E.int.mana);
    set('manaRegen', 'base', 2); add('manaRegen', 'attributes', v.wis * E.wis.manaRegen);
    add('hpRegen', 'attributes', v.vit * E.vit.hpRegen);
    set('harmony', 'attributes', harmonyPower(s));
    set('guardAffinity', 'job', guardAffinity(jobFactor(j, 'defense'))); set('wardAffinity', 'job', guardAffinity(jobFactor(j, 'resist'))); set('healFocus', 'job', j.healer ? 1 : 0); set('arcaneStrike', 'job', arcaneStrikeChance({ tier: j.tier, magic: jobFactor(j, 'magic'), attack: jobFactor(j, 'attack') }));
    if (a.arcaneStrike > 0) add('arcaneRatioBonus', 'job', SKILL_FORMULA.arcaneRatioByTier[Math.min(j.tier, SKILL_FORMULA.arcaneRatioByTier.length - 1)] || 0);
    a.goldBonus = (s.permanent.gold || 0) * .1 + v.luk * E.luk.goldBonus;
    rec('goldBonus', 'research', (s.permanent.gold || 0) * .1); rec('goldBonus', 'attributes', v.luk * E.luk.goldBonus); add('goldBonus', 'account', accountExpGold(s));
    set('rebirthBonus', 'research', s.permanent.pearl || 0);
    set('dungeonGoldBonus', 'research', (s.permanent.dungeon || 0) * .08);
    // 세계석 연구 2단계: 치명·치명 피해·관통·회피·흡혈은 고정값으로 더합니다. 관통·흡혈 상한은 아래 limit에서 그대로 적용됩니다.
    add('crit', 'research', researchRank(s, 'crit') * .005); add('crit', 'account', accountCrit(s)); add('critDamage', 'research', researchRank(s, 'critDamage') * .02);
    add('penetration', 'research', researchRank(s, 'penetration') * .01); add('evasion', 'research', researchRank(s, 'evasion') * .004);
    add('lifesteal', 'research', researchRank(s, 'lifesteal') * .005);
    // 도감: 몬스터 성향별 연구 능력치와 완성 지역의 테마 보너스(고정값). 배율은 아래에서 따로 적용합니다.
    for (const bonus of [bookStatBonus(s), ...themes.map(t => t.add || {})])
        for (const [key, n] of Object.entries(bonus))
            add(key as keyof CombatStats, 'book', n);
    const gear: Partial<Record<keyof CombatStats, number>> = {};
    for (const item of Object.values(s.equipment)) {
        if (item)
            for (const [key, n] of Object.entries(itemStats(item)))
                gear[key as keyof CombatStats] = (gear[key as keyof CombatStats] || 0) + n;
    }
    for (const [key, n] of Object.entries(gear))
        add(key as keyof CombatStats, 'equipment', Math.min(n!, GEAR_CAPS[key as keyof typeof GEAR_CAPS] ?? Infinity));
    const passiveJobs = new Set<string>();
    let relief = 0;
    // v24.2 진행도 기록: 진행도 비례 피해의 기준값과 perCount 패시브가 씁니다.
    const counts = progressCounts(s);
    set('codexPower', 'book', counts.codex); set('catchPower', 'book', Math.log10(1 + counts.catch)); set('huntPower', 'book', Math.sqrt(counts.hunt)); set('goldPower', 'book', Math.log10(1 + Math.max(0, s.gold || 0))); set('masteredPower', 'book', counts.mastered); set('variantPower', 'book', Math.sqrt(counts.variant));
    set('attrStr', 'attributes', v.str); set('attrDex', 'attributes', v.dex); set('attrInt', 'attributes', v.int); set('attrVit', 'attributes', v.vit); set('attrWis', 'attributes', v.wis); set('attrLuk', 'attributes', v.luk);
    for (const id of s.skills) {
        if (!canUse(s, id))
            continue;
        const sk = skillById(id);
        if (sk?.penaltyRelief !== undefined || sk?.levelEffects) relief = Math.max(relief, effectiveSkill(sk, s.learned[id] || 1, skillMastery(s, id)).penaltyRelief || 0);
        if (sk?.type === 'passive' && sk.job && Object.values(sk.bonus || {}).some(n => n > 0)) passiveJobs.add(sk.job);
        if (sk?.bonus) {
            const bonus = effectiveSkill(sk, s.learned[id] || 1, skillMastery(s, id), undefined, s.skillPractice[id] || 0).bonus!;
            const scale = signatureScale(sk, s.job);
            for (const [key, n] of Object.entries(bonus))
                add(key as keyof CombatStats, 'skills', n > 0 ? n * scale : n);
        }
        // v27.28 횟수 비례 패시브도 한계돌파 단계마다 +10%.
        const lbScale = sk ? limitBreakScale(brokenStages(sk, s.learned[id] || 1, skillMastery(s, id))) : 1;
        if (sk?.perCount) {
            const scale = signatureScale(sk, s.job) * lbScale;
            for (const pc of sk.perCount) {
                const times = Math.min(pc.cap, Math.floor(counts[pc.source] / pc.per));
                if (times > 0) for (const [key, n] of Object.entries(pc.bonus)) add(key as keyof CombatStats, 'skills', n * times * scale);
            }
        }
        if (sk?.perRebirth) {
            const times = Math.min(s.rebirths || 0, SKILL_FORMULA.perRebirthCap), scale = signatureScale(sk, s.job) * lbScale;
            for (const [key, n] of Object.entries(sk.perRebirth)) add(key as keyof CombatStats, 'skills', n * times * scale);
        }
        if (sk) {
            const masteryBonus = skillMasteryRewards(sk, s.learned[id] || 1, skillMastery(s, id)).bonus;
            for (const [key, n] of Object.entries(masteryBonus))
                add(key as keyof CombatStats, 'skills', n);
        }
    }
    for (const [key, n] of Object.entries(j.penalties || {}))
        add(key as keyof CombatStats, 'job', n);
    const mastered = (s.jobMastery?.[s.job] || 0) >= jobMasteryTarget(j);
    // 페널티 회복(쉐도우 서번트 등): 1보다 낮은 직업 배율을 relief만큼 1 쪽으로 되돌립니다.
    const mult = (n: number) => jobCombatMultiplier(j, n < 1 ? 1 - (1 - n) * (1 - Math.min(1, relief)) : n, mastered);
    // 1~3차 플러스 보정은 고정 수치로 더하고, 아래 배율은 마이너스 보정(1~3차)과 4·5차 보정에만 씁니다.
    for (const key of ['hp', 'attack', 'magic', 'defense', 'resist'] as const) add(key, 'job', jobFlatBonus(j, key, mastered));
    // v27.4 제약 직업 장치: 회피.
    if (j.constraint?.devices.evasion) add('evasion', 'job', j.constraint.devices.evasion);
    add('harmony', 'job', (jobFlatBonus(j, 'attack', mastered) + jobFlatBonus(j, 'magic', mastered)) / 2);
    const feats = achievementTotals(s).bonus, account = 1 + accountPower(s);
    mul('hp', [['job', mult(j.hp)], ['research', 1 + (s.permanent.hp || 0) * .08], ['achievement', 1 + feats.hp], ['account', account]]);
    mul('attack', [['job', mult(j.attack)], ['research', 1 + (s.permanent.attack || 0) * .05], ['achievement', 1 + feats.attack], ['account', account]]);
    mul('magic', [['job', mult(j.magic)], ['research', 1 + (s.permanent.magicAttack || 0) * .05], ['achievement', 1 + feats.magic], ['account', account]]);
    mul('defense', [['job', mult(j.defense)], ['achievement', 1 + feats.defense]]);
    mul('resist', [['job', mult(j.resist)], ['achievement', 1 + feats.resist]]);
    const dedication = thresholdRank(s.jobMastery?.[s.job] || 0, vocationTargets(jobMasteryTarget(j)));
    const memory = rebirthMemory(s.rebirths) * (1 + dedication * .04);
    for (const key of ['hp', 'attack', 'magic', 'defense', 'resist'] as const) mul(key, [['rebirth', memory]]);
    for (const t of themes)
        for (const [key, n] of Object.entries(t.scale || {}))
            mul(key as keyof CombatStats, [['book', n]]);
    // 올라운드 밸런스: 공격력과 같은 연구·환생·직업 배율을 받고, 서로 다른 직업의 능력치 패시브를 빌려 올수록 강해집니다.
    mul('harmony', [['job', mult((j.attack + j.magic) / 2) * SKILL_FORMULA.harmonyScale], ['research', 1 + (s.permanent.attack || 0) * .05], ['rebirth', memory],
        ['skills', 1 + Math.min(SKILL_FORMULA.harmonyJobCap, passiveJobs.size) * SKILL_FORMULA.harmonyPerJob]]);
    // 반격은 방어 친화도만큼만 발휘됩니다.
    mul('thorns', [['job', a.guardAffinity]]);
    mul('defense', [['research', 1 + (s.permanent.guard || 0) * .03]]);
    mul('resist', [['research', 1 + (s.permanent.magicGuard || 0) * .03]]);
    mul('manaRegen', [['research', 1 + researchRank(s, 'manaRegen') * .05]]);
    const limit = (k: keyof CombatStats, n: number) => { const before = a[k]; a[k] = n; rec(k, 'limit', n - before); };
    for (const k of ['hp', 'attack', 'magic', 'defense', 'resist', 'mana', 'speed', 'harmony', 'hpRegen'] as (keyof CombatStats)[])
        limit(k, Math.max(k === 'hp' || k === 'speed' ? 1 : 0, Math.floor(a[k])));
    // 장비 규칙 옵션은 같은 규칙끼리 상한까지만 합산합니다.
    for (const [key, cap] of Object.entries(RULE_CAPS)) limit(key as keyof CombatStats, Math.min(cap!, a[key as keyof CombatStats] || 0));
    // v27.18 치명타 100%를 넘은 몫 100%p마다 극 치명타 확률 +1%.
    a.superCrit = Math.min(1, Math.max(0, a.crit - SKILL_FORMULA.critCap) * SKILL_FORMULA.superCritPerHundred); rec('superCrit', 'limit', a.superCrit);
    limit('crit', Math.min(SKILL_FORMULA.critCap, a.crit));
    // v27.71 기민 외 회피 소스는 합쳐서 60%p까지만 세고, 그 위에 기민 회피를 더한 뒤 점감합니다(1레벨 패시브만으로 고기민 캐릭터를 따라잡지 못하게).
    limit('evasion', evasionRating(evasionRaw(dexEvasion, a.evasion - dexEvasion)));
    limit('penetration', Math.min(.6, a.penetration));
    limit('lifesteal', Math.min(.3, a.lifesteal));
    return a;
}
/** 처치당 장비 드롭 확률. 기본 확률에 행운·물건도감·연구·드롭 보너스를 상대 증가로 곱합니다. */
export function dropRate(s: State) {
    const bonus = attributes(s).luk * E.luk.dropBonus + Object.keys(s.itemBook || {}).length * PROGRESSION.itemDropBonus + (s.permanent.drop || 0) * .01 + (stats(s).dropBonus || 0);
    // 험한 길 서약은 드롭 확률에도 곱합니다(서약이 없으면 ×1). 상한은 그대로입니다.
    return Math.min(BALANCE.dropChanceCap, BALANCE.dropChance * (1 + bonus / BALANCE.dropBonusScale) * roughReward(s) * (s.event?.drop || 1));
}
export function power(v: Stats) { const a = normalizeStats(v); return Math.round(Math.max(a.attack, a.magic) * 7 + Math.min(a.attack, a.magic) * 2 + a.hp * .5 + (a.defense + a.resist) * 3 + a.crit * 200 + Math.max(0, a.accuracy - .8) * 220 + a.evasion * 200); }
export function snapshot(s: State): Snapshot { const a = stats(s); return { season: SAVE_VERSION, name: s.name, title: displayTitle(s), level: s.level, job: s.job, rebirths: s.rebirths, stats: a, skills: s.skills.filter(id => canUse(s, id)), skillRanks: { ...s.learned }, skillMastery: skillMasteryRanks(s), skillSpecializations: { ...s.skillSpecializations }, skillPractice: { ...s.skillPractice }, power: power(a), rating: s.rating, guild: s.guildMember?.name || '', ...(vowBadges(s.vows).length ? { vows: vowBadges(s.vows) } : {}) }; }
/** 마법 직업이면 1(기본 공격이 항상 마력 평타), 아니면 0. */
export const arcaneStrikeChance = (j: { magic: number; attack: number; tier: number }) => j.magic - j.attack >= .045 ? SKILL_FORMULA.arcaneStrikeChance[Math.min(j.tier, SKILL_FORMULA.arcaneStrikeChance.length - 1)] || 0 : 0;
/** 직업의 물리 방어 배율로 정하는 방어 친화도(0.2~1). 방어 비례 피해·반격의 효율입니다. */
export const guardAffinity = (defenseMultiplier: number) => Math.min(1, Math.max(SKILL_FORMULA.guardFloor, (defenseMultiplier - SKILL_FORMULA.guardBase) / SKILL_FORMULA.guardSpan));
/** 올라운드 밸런스의 원시 피해. 직접 배분한 포인트(s.attributes)만 사용합니다. */
function harmonyPower(s: Pick<State, 'attributes'>) {
    const points = Object.values(s.attributes || {});
    if (!points.length) return 0;
    const total = points.reduce((sum, n) => sum + n, 0), lowest = Math.min(...points);
    return SKILL_FORMULA.harmonyBase + total * SKILL_FORMULA.harmonyPerPoint + lowest * SKILL_FORMULA.harmonyPerLowest;
}
/** 환생 횟수와 세계석 연구(모험의 기억)로 얻는 영구 경험치 보너스. 직업 보너스는 제외. */
export const permanentExpBonus = (s: State) => rebirthExperience(s.rebirths) + (s.permanent.exp || 0) * .2;
/** 최대치가 바뀐 뒤 현재 체력·마나를 새 최대치 이하로 맞춥니다. */
export function clampVitals(s: State) {
    s.hp = Math.min(s.hp, stats(s).hp);
    s.mana = Math.min(s.mana, stats(s).mana);
}
/** 골드 배율. 험한 길 서약은 처치·던전 골드를 함께 올립니다(서약이 없으면 ×1). */
/** v25.6 이번 생의 조건 카드 배율. 사냥터 집중은 그 사냥터에서만, 황금 모험은 생 전체. */
const focusGold = (s: Pick<State, 'vows' | 'stage' | 'dungeon'>) => s.vows?.focus?.kind === 'gold' ? 2 : s.vows?.focus?.kind === 'stage' && !s.dungeon && s.stage === s.vows.focus.id ? 1.5 : 1;
const focusExp = (s: Pick<State, 'vows' | 'stage' | 'dungeon'>) => s.vows?.focus?.kind === 'gold' ? .75 : s.vows?.focus?.kind === 'stage' && !s.dungeon && s.stage === s.vows.focus.id ? 1.5 : 1;
export const goldMultiplier = (s: State) => (1 + stats(s).goldBonus) * roughReward(s) * focusGold(s) * (s.event?.gold || 1);
export const expMultiplier = (s: State) => Math.max(0, 1 + stats(s).expBonus) * (tailwindActive(s) ? 1 + tailwindExp(s) : 1) * focusExp(s) * (s.event?.exp || 1);
export const dungeonGoldMultiplier = (s: State) => 1 + (stats(s).dungeonGoldBonus || 0);
/** 던전 정복 골드. 전투 보상과 던전 화면 표시가 같은 식을 씁니다. */
export const dungeonClearGold = (s: State, baseGold: number, tier: number) => Math.floor(baseGold * tierReward(tier) * goldMultiplier(s) * dungeonGoldMultiplier(s));
/** 실제 적중률 = 명중 − 상대 회피 + 속도 보정(±6%p). v26.7 magical이면 회피를 magicEvasionScale만 적용하고 속도 보정은 플러스만 받습니다. */
export const hitChance = (a: Stats, b: Stats, magical = false) => {
    const accuracy = Math.max(0, a.accuracy ?? 1);
    const evasion = Math.max(0, b.evasion ?? 0) * (magical ? SKILL_FORMULA.magicEvasionScale : 1);
    const raw = Math.max(-.06, Math.min(.06, .08 * Math.log2(Math.max(1, a.speed ?? 10) / Math.max(1, b.speed ?? 10))));
    const tempo = magical ? Math.max(0, raw) : raw;
    return Math.min(.995, Math.max(.01, accuracy - evasion + tempo));
};
