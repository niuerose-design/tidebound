import { tailwindActive, tailwindExp, tierReward, encounterTier } from './meta';
import { displayTitle } from '../data/titles';
import { rebirthExperience, rebirthMemory, evasionRating, evasionRaw, vocationTargets, thresholdRank } from '../data/long-term';
import { itemStats } from './equipment';
import { GEAR_CAPS, RULE_CAPS, affixDef } from '../data/gear';
import { ownedOnyx, onyxSetBonus, onyxResonance } from '../data/onyx';
import type { State, Snapshot, Stats, CombatStats, Skill } from '../types';
import { BALANCE, SAVE_VERSION, SKILL_FORMULA, PENETRATION, stackPenetration, stackBossDamage } from '../data/balance';
import { PROGRESSION, ATTRIBUTE_EFFECTS as E } from '../data/progression';
import { JOBS, jobById } from '../data/classes';
import { RESEARCH, researchRank, MANA_RESEARCH_PER } from '../data/economy';
import { roughReward, roughGear, roughHeal, restraintExp, vowBadges } from './vows';
import { sproutExp, sproutCount } from '../data/sprout';
import { ascensionEarlyExp } from '../data/ascension';
import { skillById } from '../data/skills';
import { STAT_TRAINING_GROWTH } from '../data/stat-training';
import { regionThemes } from './book';
import { achievementTotals } from '../data/achievements';
import { accountExpGold, accountPower, accountCrit } from '../data/account';
import { attributes, effectiveSkill, canUse, skillMastery, skillMasteryRanks, jobMasteryTarget, jobCombatMultiplier, jobFlatBonus, jobFactor, signatureScale, progressCounts, limitBreakScale, brokenStages, refinePractices, extraRollLevel } from './progression';
/** Legacy PvP snapshots gain safe defaults, never client-supplied progression. */
/** v3.84 장비 부위마다 따로 곱연산하는 능력치(관통 · 보스 피해). */
const PER_ITEM_STATS = new Set(['penetration', 'bossDamage']);
export function normalizeStats(a: Stats): CombatStats { return { expBonus: 0, goldBonus: 0, dropBonus: 0, rebirthBonus: 0, dungeonGoldBonus: 0, magic: a.attack, resist: a.defense, harmony: 0, accuracy: 1, evasion: 0, critDamage: BALANCE.critMultiplier, superCrit: 0, speed: 10, mana: 40, manaRegen: 3, hpRegen: 0, penetration: 0, lifesteal: 0, thorns: 0, diceTrim: 0, swarmFind: 0, dotBonus: 0, bleedBonus: 0, poisonBonus: 0, burnBonus: 0, guardAffinity: 1, wardAffinity: 1, healFocus: 0, arcaneStrike: 0, statusResist: 0, chainBonus: 0, bossDamage: 0, allStats: 0, stunBonus: 0, controlBonus: 0, dotTurnsBonus: 0, poisonStackBonus: 0, arcaneRatioBonus: 0, followUpBonus: 0, healBonus: 0, executeBonus: 0, masteryFlat: 0, rankFlat: 0, essenceBonus: 0, ornament: 0, codexPower: 0, catchPower: 0, huntPower: 0, goldPower: 0, masteredPower: 0, variantPower: 0, variantFind: 0, goldenFind: 0, attrStr: 0, attrDex: 0, attrInt: 0, attrVit: 0, attrWis: 0, attrLuk: 0, ...a }; }
/** 능력치 증가 원인. 능력치 화면의 상세보기가 이 순서로 보여줍니다. */
export const STAT_SOURCES = ['base', 'attributes', 'job', 'skills', 'rebirth', 'research', 'book', 'achievement', 'account', 'equipment', 'limit'] as const;
export type StatSource = typeof STAT_SOURCES[number];
const STAT_SOURCE_LABELS: Record<StatSource, string> = { base: '기본(레벨)', attributes: '능력치 배분', job: '직업', skills: '스킬·숙련', rebirth: '환생', research: '세계석 연구', book: '도감', achievement: '업적', account: '계정 보너스', equipment: '장비', limit: '상한·정수 처리' };
/** 세계석 연구가 올리는 능력치 → 연구 id. 물리·마법 공격과 방어는 각각 다른 연구입니다. */
const RESEARCH_BY_STAT: Partial<Record<keyof CombatStats, string>> = { attack: 'attack', magic: 'magicAttack', hp: 'hp', defense: 'guard', resist: 'magicGuard', mana: 'mana', goldBonus: 'gold', dungeonGoldBonus: 'dungeon', crit: 'crit', critDamage: 'critDamage', penetration: 'penetration', evasion: 'evasion', lifesteal: 'lifesteal', manaRegen: 'manaRegen' };
/** 능력치 분해의 원인 이름. 세계석 연구는 해당 연구 이름까지 붙입니다(예: 세계석 연구 · 마법력 강화 I). */
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
type UsableSkill = { id: string; sk: Skill; mastery: number };
/**
 * v3.130 장착 스킬 가운데 쓸 수 있는 것과 그 숙련 단계. 능력치 계산 한 번에 canUse · skillMastery를 스킬마다 한 번만 부릅니다
 * (전에는 수련 패시브 · 보너스 · 한계돌파에서 같은 값을 세 번씩 다시 셌음). 순서는 s.skills 그대로라 더하는 순서도 같습니다.
 */
function usableSkills(s: State): UsableSkill[] {
    const out: UsableSkill[] = [];
    for (const id of s.skills || []) {
        if (!canUse(s, id)) continue;
        const sk = skillById(id);
        if (sk) out.push({ id, sk, mastery: skillMastery(s, id) });
    }
    return out;
}
/** 정적 스킬 자료에 양수 보너스가 하나라도 있는지(올라운드 밸런스의 ‘빌린 직업’ 판정). */
function hasPositiveBonus(sk: Skill) {
    const bonus = sk.bonus || {};
    for (const k in bonus) if ((bonus[k as keyof typeof bonus] as number) > 0) return true;
    return false;
}
/** v3.70 기본 능력치 + 장착한 능력치 수련 패시브(attrBonus, 숙련 단계마다 +25%). 전직 조건은 배분 능력치만 봅니다. */
export function trainedAttributes(s: State, usable = usableSkills(s)) {
    const v = attributes(s);
    for (const { sk, mastery } of usable) {
        if (!sk.attrBonus) continue;
        const scale = 1 + STAT_TRAINING_GROWTH * Math.min(4, mastery);
        for (const k in sk.attrBonus) v[k as keyof typeof v] += Math.round((sk.attrBonus[k as keyof typeof sk.attrBonus] || 0) * scale);
    }
    return v;
}
export function stats(s: State, trace?: StatTrace): CombatStats {
    const j = jobById(s.job) || JOBS[0], usable = usableSkills(s), v = trainedAttributes(s, usable), themes = regionThemes(s);
    const rec = (k: keyof CombatStats, source: StatSource, delta: number, factor?: number) => {
        if (trace && delta) (trace[k] ||= []).push(factor === undefined ? { source, delta } : { source, delta, factor });
    };
    const a = { expBonus: 0, goldBonus: 0, dropBonus: 0, rebirthBonus: 0, dungeonGoldBonus: 0, hp: 0, attack: 0, magic: 0, defense: 0, resist: 0, crit: 0, critDamage: 0, superCrit: 0, accuracy: 0, evasion: 0, speed: 0, mana: 0, manaRegen: 0, hpRegen: 0, penetration: 0, lifesteal: 0, harmony: 0, thorns: 0, diceTrim: 0, swarmFind: 0, dotBonus: 0, bleedBonus: 0, poisonBonus: 0, burnBonus: 0, guardAffinity: 0, wardAffinity: 0, healFocus: 0, arcaneStrike: 0, statusResist: 0, chainBonus: 0, bossDamage: 0, allStats: 0, stunBonus: 0, controlBonus: 0, dotTurnsBonus: 0, poisonStackBonus: 0, arcaneRatioBonus: 0, followUpBonus: 0, healBonus: 0, executeBonus: 0, masteryFlat: 0, rankFlat: 0, essenceBonus: 0, ornament: 0, codexPower: 0, catchPower: 0, huntPower: 0, goldPower: 0, variantPower: 0, variantFind: 0, goldenFind: 0, attrStr: 0, attrDex: 0, attrInt: 0, attrVit: 0, attrWis: 0, attrLuk: 0 } as CombatStats;
    const set = (k: keyof CombatStats, source: StatSource, n: number) => { a[k] = n; rec(k, source, n); };
    // v3.84 관통은 출처끼리 곱연산(PENETRATION · stackPenetration), 보스 피해도 출처끼리 곱연산((1 + a)(1 + b) − 1, stackBossDamage).
    const add = (k: keyof CombatStats, source: StatSource, n: number) => {
        if (k === 'penetration' || k === 'bossDamage') { const before = a[k], next = k === 'penetration' ? stackPenetration(before, n) : stackBossDamage(before, n); rec(k, source, next - before); a[k] = next; return; }
        a[k] += n; rec(k, source, n);
    };
    /** 곱셈은 원래 식처럼 한 번에 적용하고, 증감은 원인별 배율 비율로 나눠 기록합니다. */
    const mul = (k: keyof CombatStats, parts: [StatSource, number][]) => {
        const before = a[k], f = parts.reduce((x, [, n]) => x * n, 1);
        a[k] *= f;
        if (!trace) return;
        let running = before;
        for (const [source, n] of parts) { const next = running * n; rec(k, source, next - running, n); running = next; }
    };
    // v27.80 노련함(연구)을 환생 보너스와 분리해 기록합니다(합은 permanentExpBonus와 같음).
    set('expBonus', 'rebirth', rebirthExperience(s.rebirths)); add('expBonus', 'research', (s.permanent.exp || 0) * .2); add('expBonus', 'job', j.expBonus || 0);
    for (const k of ['goldBonus', 'dropBonus', 'rebirthBonus', 'dungeonGoldBonus', 'penetration', 'lifesteal'] as const) a[k] = 0;
    set('hp', 'base', BALANCE.baseHp + (s.level - 1) * BALANCE.hpPerLevel); add('hp', 'attributes', v.vit * E.vit.hp);
    set('attack', 'base', BALANCE.baseAttack + (s.level - 1) * BALANCE.attackPerLevel); add('attack', 'attributes', v.str * E.str.attack);
    set('magic', 'base', 10 + (s.level - 1) * 3); add('magic', 'attributes', v.int * E.int.magic);
    set('defense', 'base', BALANCE.baseDefense + (s.level - 1) * BALANCE.defensePerLevel); add('defense', 'attributes', v.vit * E.vit.defense); add('defense', 'attributes', v.str * E.str.defense);
    // v3.129 마방도 체질 · 지능에서 조금 받습니다(방어가 체질 · 근력에서 받는 것과 대칭). 정신 없는 물리 빌드의 마방이 0에 가깝던 것.
    set('resist', 'base', BALANCE.baseResist + (s.level - 1) * BALANCE.resistPerLevel); add('resist', 'attributes', v.wis * E.wis.resist); add('resist', 'attributes', v.int * E.int.resist);
    set('crit', 'base', BALANCE.baseCrit); add('crit', 'job', j.crit); add('crit', 'attributes', v.luk * E.luk.crit);
    set('critDamage', 'base', BALANCE.critMultiplier); add('critDamage', 'attributes', v.luk * E.luk.critDamage);
    set('goldenFind', 'base', BALANCE.goldenBase);
    set('accuracy', 'base', .92); add('accuracy', 'attributes', v.dex * E.dex.accuracy);
    const dexEvasion = v.dex * E.dex.evasion; set('evasion', 'attributes', dexEvasion);
    set('speed', 'base', 10); add('speed', 'attributes', v.dex * E.dex.speed);
    set('mana', 'base', BALANCE.baseMana + (s.level - 1) * BALANCE.manaPerLevel); add('mana', 'attributes', v.wis * E.wis.mana); add('mana', 'attributes', v.int * E.int.mana);
    set('manaRegen', 'base', 2); add('manaRegen', 'attributes', v.wis * E.wis.manaRegen);
    add('hpRegen', 'attributes', v.vit * E.vit.hpRegen);
    set('harmony', 'attributes', harmonyPower(s));
    set('guardAffinity', 'job', guardAffinity(jobFactor(j, 'defense'))); set('wardAffinity', 'job', guardAffinity(jobFactor(j, 'resist'))); set('healFocus', 'job', j.healer ? 1 : 0); set('arcaneStrike', 'job', arcaneStrikeChance({ tier: j.tier, magic: jobFactor(j, 'magic'), attack: jobFactor(j, 'attack') }));
    if (a.arcaneStrike > 0) add('arcaneRatioBonus', 'job', SKILL_FORMULA.arcaneRatioByTier[Math.min(j.tier, SKILL_FORMULA.arcaneRatioByTier.length - 1)] || 0);
    a.goldBonus = (s.permanent.gold || 0) * .1 + v.luk * E.luk.goldBonus;
    rec('goldBonus', 'research', (s.permanent.gold || 0) * .1); rec('goldBonus', 'attributes', v.luk * E.luk.goldBonus);
    // v27.73 장비 드롭 보너스도 여기서 모읍니다(연구 ‘보물의 냄새’ 1단계 = 0.01 = 드롭 확률 +10%, 행운, 물건도감). 전에는 dropRate에서만 더해 상세 능력치에 보이지 않았습니다.
    a.dropBonus = researchRank(s, 'drop') * .01 + v.luk * E.luk.dropBonus + Object.keys(s.itemBook || {}).length * PROGRESSION.itemDropBonus;
    rec('dropBonus', 'research', researchRank(s, 'drop') * .01); rec('dropBonus', 'attributes', v.luk * E.luk.dropBonus); rec('dropBonus', 'book', Object.keys(s.itemBook || {}).length * PROGRESSION.itemDropBonus);
    // 세계석 연구 2단계: 치명·치명 피해·관통·회피·흡혈은 고정값으로 더합니다. 관통·흡혈 상한은 아래 limit에서 그대로 적용됩니다(v3.84 관통 단계당 2%, 곱연산).
    add('crit', 'research', researchRank(s, 'crit') * .005); add('critDamage', 'research', researchRank(s, 'critDamage') * .02);
    add('penetration', 'research', researchRank(s, 'penetration') * PENETRATION.researchPerRank); add('evasion', 'research', researchRank(s, 'evasion') * .006);
    add('lifesteal', 'research', researchRank(s, 'lifesteal') * .005);
    // 도감: 완성 장소의 테마 보너스와 지역 연구(고정값). 배율은 아래에서 따로 적용합니다. v27.81 성향 연구 능력치는 없앴습니다.
    for (const t of themes)
        if (t.add) for (const key in t.add) add(key as keyof CombatStats, 'book', t.add[key as keyof typeof t.add] as number);
    const gear: Partial<Record<keyof CombatStats, number>> = {};
    const perItem: [keyof CombatStats, number][] = [];
    for (const item of Object.values(s.equipment)) {
        if (item) {
            const st = itemStats(item);
            for (const key in st) {
                const n = st[key as keyof Stats]!;
                // v3.84 관통 · 보스 피해는 부위마다 한 출처로 곱연산합니다(아래 add).
                if (PER_ITEM_STATS.has(key)) { perItem.push([key as keyof CombatStats, n]); continue; }
                gear[key as keyof CombatStats] = (gear[key as keyof CombatStats] || 0) + n;
            }
        }
    }
    // v3.73 장비 합계 상한을 받지 않는 옵션(피의 계약의 흡혈)은 상한 계산에서 빼고 따로 더합니다.
    const free: Partial<Record<keyof CombatStats, number>> = {};
    for (const item of Object.values(s.equipment)) for (const affix of item?.affixes || []) if (affixDef(affix.id)?.uncapped) free[affix.stat as keyof CombatStats] = (free[affix.stat as keyof CombatStats] || 0) + affix.value;
    for (const [key, n] of perItem) add(key, 'equipment', n * roughGear(s));
    for (const key in gear) {
        const n = gear[key as keyof CombatStats]!, own = free[key as keyof CombatStats] || 0;
        // v27.86 힘의 길: 장비 능력치 ×(1 − 30·50·70%).
        // v3.151 마력 평타 계수(룬 핵 · 몽환의 마력)는 장비 몫만 규칙 상한(.3)까지 셉니다. 전에는 아래 RULE_CAPS 전체 상한이 스킬 몫(라이트 오브 레프 등)까지 깎아 일리움 패시브가 무의미했음.
        add(key as keyof CombatStats, 'equipment', (Math.min(n - own, GEAR_CAPS[key as keyof typeof GEAR_CAPS] ?? (key === 'arcaneRatioBonus' ? RULE_CAPS.arcaneRatioBonus! : Infinity)) + own) * roughGear(s));
    }
    // v3.12 칠흑 세트(보유 수 기준, 영구).
    // v3.38 칠흑 세트는 장비 출처로 표시합니다(전에는 ‘도감’으로 잘못 묶였음).
    { const b = onyxSetBonus(ownedOnyx(s).size); if (b.bossDamage) add('bossDamage', 'equipment', b.bossDamage); if (b.statusResist) add('statusResist', 'equipment', b.statusResist); if (b.allStats) add('allStats', 'equipment', b.allStats); }
    // v3.113 칠흑 공명: 착용하지 않은 칠흑 장신구의 고유 옵션 × 10%(각성 포함).
    { const res = onyxResonance(s); for (const key in res) add(key as keyof CombatStats, 'equipment', res[key as keyof typeof res] as number); }
    const passiveJobs = new Set<string>();
    let relief = 0;
    // v24.2 진행도 기록: 진행도 비례 피해의 기준값과 perCount 패시브가 씁니다.
    const counts = progressCounts(s);
    set('codexPower', 'book', counts.codex); set('catchPower', 'book', Math.log10(1 + counts.catch)); set('huntPower', 'book', Math.sqrt(counts.hunt)); set('goldPower', 'book', Math.log10(1 + Math.max(0, s.gold || 0))); set('masteredPower', 'book', counts.mastered); set('variantPower', 'book', Math.sqrt(counts.variant));
    set('attrStr', 'attributes', v.str); set('attrDex', 'attributes', v.dex); set('attrInt', 'attributes', v.int); set('attrVit', 'attributes', v.vit); set('attrWis', 'attributes', v.wis); set('attrLuk', 'attributes', v.luk);
    // v3.130 스킬마다 숙련 단계 · 시그니처 배율 · 한계돌파 배율을 한 번만 계산하고, Object.entries 대신 키 순회로 할당을 없앴습니다(더하는 순서 · 식은 그대로).
    for (const { id, sk, mastery } of usable) {
        const rank = s.learned[id] || 1;
        if (sk.penaltyRelief !== undefined || sk.levelEffects) relief = Math.max(relief, effectiveSkill(sk, rank, mastery).penaltyRelief || 0);
        if (sk.type === 'passive' && sk.job && hasPositiveBonus(sk)) passiveJobs.add(sk.job);
        let signature: number | undefined;
        if (sk.bonus) {
            const bonus = effectiveSkill(sk, rank, mastery).bonus!, scale = signature ??= signatureScale(sk, s.job);
            for (const key in bonus) { const n = bonus[key as keyof typeof bonus] as number; add(key as keyof CombatStats, 'skills', n > 0 ? n * scale : n); }
        }
        // v27.28 횟수 비례 패시브도 한계돌파 단계마다 +10%.
        if (sk.perCount || sk.perRebirth) {
            const lbScale = limitBreakScale(brokenStages(sk, rank, mastery)), scale = (signature ??= signatureScale(sk, s.job)) * lbScale;
            if (sk.perCount)
                for (const pc of sk.perCount) {
                    const times = Math.min(pc.cap, Math.floor(counts[pc.source] / pc.per));
                    if (times > 0) for (const key in pc.bonus) add(key as keyof CombatStats, 'skills', (pc.bonus[key as keyof typeof pc.bonus] as number) * times * scale);
                }
            if (sk.perRebirth) {
                const times = Math.min(s.rebirths || 0, SKILL_FORMULA.perRebirthCap);
                for (const key in sk.perRebirth) add(key as keyof CombatStats, 'skills', (sk.perRebirth[key as keyof typeof sk.perRebirth] as number) * times * scale);
            }
        }
    }
    if (j.penalties) for (const key in j.penalties) add(key as keyof CombatStats, 'job', j.penalties[key as keyof typeof j.penalties] as number);
    const mastered = (s.jobMastery?.[s.job] || 0) >= jobMasteryTarget(j);
    // 페널티 회복(쉐도우 서번트 등): 1보다 낮은 직업 배율을 relief만큼 1 쪽으로 되돌립니다.
    const mult = (n: number) => jobCombatMultiplier(j, n < 1 ? 1 - (1 - n) * (1 - Math.min(1, relief)) : n, mastered);
    // 1~3차 플러스 보정은 고정 수치로 더하고, 아래 배율은 마이너스 보정(1~3차)과 4·5차 보정에만 씁니다.
    for (const key of ['hp', 'attack', 'magic', 'defense', 'resist'] as const) add(key, 'job', jobFlatBonus(j, key, mastered));
    // v27.4 제약 직업 장치: 회피.
    if (j.constraint?.devices.evasion) add('evasion', 'job', j.constraint.devices.evasion);
    add('harmony', 'job', (jobFlatBonus(j, 'attack', mastered) + jobFlatBonus(j, 'magic', mastered)) / 2);
    const feats = achievementTotals(s).bonus, account = accountPower(s);
    mul('hp', [['job', mult(j.hp)], ['research', 1 + (s.permanent.hp || 0) * .08], ['achievement', 1 + feats.hp], ['account', account]]);
    mul('attack', [['job', mult(j.attack)], ['research', 1 + (s.permanent.attack || 0) * .05], ['achievement', 1 + feats.attack], ['account', account]]);
    mul('magic', [['job', mult(j.magic)], ['research', 1 + (s.permanent.magicAttack || 0) * .05], ['achievement', 1 + feats.magic], ['account', account]]);
    mul('defense', [['job', mult(j.defense)], ['achievement', 1 + feats.defense]]);
    mul('resist', [['job', mult(j.resist)], ['achievement', 1 + feats.resist]]);
    const dedication = thresholdRank(s.jobMastery?.[s.job] || 0, vocationTargets(jobMasteryTarget(j)));
    const memory = rebirthMemory(s.rebirths) * (1 + dedication * .04);
    for (const key of ['hp', 'attack', 'magic', 'defense', 'resist'] as const) mul(key, [['rebirth', memory]]);
    // v3.90 최대 마나도 체력처럼 연구(‘마나 강화 I’) · 계정 · 환생 배율을 받습니다(전에는 배율이 없어 후반에 체력의 1%도 안 됐음).
    mul('mana', [['research', 1 + researchRank(s, 'mana') * MANA_RESEARCH_PER], ['account', account], ['rebirth', memory]]);
    for (const t of themes)
        if (t.scale) for (const key in t.scale) mul(key as keyof CombatStats, [['book', t.scale[key as keyof typeof t.scale] as number]]);
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
    for (const [key, cap] of Object.entries(RULE_CAPS)) if (key !== 'arcaneRatioBonus') limit(key as keyof CombatStats, Math.min(cap!, a[key as keyof CombatStats] || 0));
    // v27.18 치명타 100%를 넘은 몫 100%p마다 극 치명타 확률 +1%.
    // v3.75 장비 극치명 옵션의 극 치명타 확률은 상한을 넘은 치명타 몫에 더합니다.
    a.superCrit = Math.min(1, (a.superCrit || 0) + Math.max(0, a.crit - SKILL_FORMULA.critCap) * SKILL_FORMULA.superCritPerHundred); rec('superCrit', 'limit', a.superCrit);
    // v27.79 계정 보스 보너스는 치명타 확률 배율(곱연산).
    mul('crit', [['account', accountCrit(s)]]);
    limit('crit', Math.min(SKILL_FORMULA.critCap, a.crit));
    // v27.71 기민 외 회피 소스는 합쳐서 60%p까지만 세고, 그 위에 기민 회피를 더한 뒤 점감합니다(1레벨 패시브만으로 고기민 캐릭터를 따라잡지 못하게).
    limit('evasion', evasionRating(evasionRaw(dexEvasion, a.evasion - dexEvasion)));
    limit('penetration', Math.min(PENETRATION.cap, a.penetration));
    limit('statusResist', Math.min(.5, a.statusResist || 0));
    // v3.12 창세의 힘·칠흑 세트: 체력·양 공격·양 방어 배율. v3.90 최대 마나도.
    // v3.119 배율 뒤에도 정수로(초월 · 창세가 붙으면 최대 체력 3460.1499… 처럼 소수가 화면에 나오던 문제).
    if (a.allStats) for (const k of ['hp', 'mana', 'attack', 'magic', 'defense', 'resist'] as const) { mul(k, [['equipment', 1 + a.allStats]]); limit(k, Math.max(k === 'hp' ? 1 : 0, Math.floor(a[k]))); }
    // v3.73 피의 계약 흡혈은 전체 상한(30%)도 받지 않습니다(한 번 회복량 상한 lifestealHpCap은 그대로).
    // v3.150 흡혈 강화(연구) 분도 상한 밖에 더합니다(최대 20단계 +10%p). 장비만으로 30%가 차서 연구 효과가 0이던 문제.
    { const over = (free.lifesteal || 0) * roughGear(s) + researchRank(s, 'lifesteal') * .005; limit('lifesteal', Math.min(.3, a.lifesteal - over) + over); }
    // v27.86 힘의 길 회복 봉쇄: 흡혈·턴당 체력 회복 ×(1 − 50·75·100%). 처치 후 회복은 victoryHealRate에서 줄입니다.
    if (roughHeal(s) < 1) { limit('lifesteal', a.lifesteal * roughHeal(s)); limit('hpRegen', Math.floor(a.hpRegen * roughHeal(s))); }
    return a;
}
/** 처치당 장비 드롭 확률. 기본 확률에 드롭 보너스(행운·물건도감·연구·스킬·장비, stats에서 합산)를 상대 증가로 곱합니다. */
/** v3.104 a: 같은 상태로 이미 계산한 능력치(있으면 다시 계산하지 않음). */
export function dropRate(s: State, a = stats(s)) {
    const bonus = a.dropBonus || 0;
    // v27.86 힘의 길 보상은 드롭 상한 뒤에 곱합니다(난이도 하한 미만이면 ×1).
    return Math.min(BALANCE.dropChanceCap, BALANCE.dropChance * (1 + bonus / BALANCE.dropBonusScale) * (s.event?.drop || 1)) * roughReward(s, encounterTier(s));
}
/**
 * v3.66 전투력: 실제 전투식에 맞춘 공격 기대값과 버티는 힘의 기하평균. 예전 식(공격·체력·방어를 단순 합산)은 치명타 피해·극 치명타·관통·연속 행동이 빠지고
 * 방어가 피해를 곱으로 줄이는 것을 반영하지 못했습니다. 기준 몬스터(명중 1.1 · 회피 0.1 · 방어는 관통 계산용 근사)를 상대로 계산합니다.
 *   공격 = 주 공격력(+ 보조 2/7) × 치명타 기대 배율(1 + 치명 × (치명 피해 − 1) + 극 치명 × 치명 피해 × (극 치명 배율 − 1)) × 명중 × 관통 × (1 + 연속 행동 가산) × (1 + 보스 피해 ÷ 2)
 *   버티는 힘 = 체력 × 방어 경감(물리·마법 조화 평균, 피해 = 원래 × 100 ÷ (100 + 방어 × 2)) ÷ (1 − 회피) × (1 + 흡혈)
 * 레벨 1 새 캐릭터가 예전 전투력과 비슷하도록 POWER_SCALE을 맞췄습니다. scripts/check-power.mjs가 실제 전투 판정(strike)과 비교합니다.
 */
export const POWER_REF = { accuracy: 1.1, evasion: .1, penetrationWeight: .6 } as const;
/**
 * v3.134 전투력 = POWER_SCALE × 공격^offense × 버티는 힘^durability. 전에는 √(공격 × 버티는 힘)(둘을 같은 무게)이었습니다.
 * 장비 4부위가 공격은 ×4, 버티는 힘은 ×39를 올리는데(공격은 능력치 · 연구 기본값이 커서, 방어 · 마방은 기본값이 작아서) 같은 무게로 곱하면 방어 부위가
 * 전투력을 지배하고(v3.129 전 방어구 하나가 77%), 환생이 쌓이면 버티는 힘은 포화(장비 없이도 마지막 서식지에서 죽기까지 수천 대)라 진행 속도는 공격만 정합니다.
 * 공격 .65 · 버티는 힘 .35로 두면 태초 22성 4부위에서 부위를 빼면 무기 42 · 방어구 39 · 장신구 26 · 망토 29%로 무기가 1등이 됩니다(docs/gear-endgame.md v3.134).
 * POWER_SCALE 8은 Lv.1 새 캐릭터의 전투력(약 453)이 전과 같게 맞춘 값이었고, v3.141에 0.8로 내려 모든 전투력 표시를 1/10로 줄였습니다(엔드 유저가 수억을 넘어 읽기 어려워서, Lv.1 약 45).
 * 비율 · 순위 · 장비 비교는 그대로입니다. 전투력은 표시 · 장비 미리보기 · 결투 상대 · 제단 신 위력에 쓰이고 전투 판정에는 쓰지 않습니다. 랭킹은 저장값이 아니라 스냅샷 능력치로 다시 계산해 보여 줍니다(v3.66).
 */
export const POWER_WEIGHT = { offense: .65, durability: .35 } as const;
const POWER_SCALE = .8;
export function powerParts(v: Stats) {
    const a = normalizeStats(v);
    const main = Math.max(a.attack, a.magic) + Math.min(a.attack, a.magic) * 2 / 7;
    const crit = Math.min(1, Math.max(0, a.crit)), critDamage = Math.max(1, a.critDamage || BALANCE.critMultiplier);
    const critFactor = 1 + crit * (critDamage - 1) + (a.superCrit || 0) * critDamage * (SKILL_FORMULA.superCritBonus - 1);
    const hit = Math.min(.995, Math.max(.05, (a.accuracy ?? 1) - POWER_REF.evasion));
    const pierce = 1 / (1 - POWER_REF.penetrationWeight * Math.min(PENETRATION.cap, Math.max(0, a.penetration || 0)));
    const offense = main * critFactor * hit * pierce * (1 + (a.chainBonus || 0)) * (1 + (a.bossDamage || 0) / 2);
    const guard = (n: number) => 1 + Math.max(0, n) * .02;
    const armor = 2 / (1 / guard(a.defense) + 1 / guard(a.resist));
    const dodge = Math.min(.9, Math.max(0, (a.evasion || 0) - (POWER_REF.accuracy - 1)));
    const durability = Math.max(1, a.hp) * armor / (1 - dodge) * (1 + Math.max(0, a.lifesteal || 0));
    return { offense, durability, critFactor, hit, pierce, armor, dodge };
}
export function power(v: Stats) { const p = powerParts(v); return Math.round(POWER_SCALE * Math.pow(p.offense, POWER_WEIGHT.offense) * Math.pow(p.durability, POWER_WEIGHT.durability)); }
export function snapshot(s: State): Snapshot { const a = stats(s); return { season: SAVE_VERSION, name: s.name, title: displayTitle(s), level: s.level, job: s.job, rebirths: s.rebirths, stats: a, skills: s.skills.filter(id => canUse(s, id)), ...(extraRollLevel(s) ? { extraRolls: extraRollLevel(s) } : {}), skillRanks: { ...s.learned }, skillMastery: skillMasteryRanks(s), skillPractice: refinePractices(s), power: power(a), rating: s.rating, guild: s.guildMember?.name || '', ...(vowBadges(s.vows).length ? { vows: vowBadges(s.vows) } : {}) }; }
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
/** 환생 횟수와 세계석 연구(노련함)로 얻는 영구 경험치 보너스. 직업 보너스는 제외. */
export const permanentExpBonus = (s: State) => rebirthExperience(s.rebirths) + (s.permanent.exp || 0) * .2;
/** 최대치가 바뀐 뒤 현재 체력·마나를 새 최대치 이하로 맞춥니다. */
export function clampVitals(s: State) {
    s.hp = Math.min(s.hp, stats(s).hp);
    s.mana = Math.min(s.mana, stats(s).mana);
}
/** 골드 배율. 힘의 길 서약은 처치·던전 골드를 함께 올립니다(서약이 없거나 난이도 하한 미만이면 ×1). */
/** v25.6 이번 생의 조건 카드 배율. 사냥터 집중은 그 사냥터에서만, 황금 모험은 생 전체. */
export const focusGold = (s: Pick<State, 'vows' | 'stage' | 'dungeon'>) => s.vows?.focus?.kind === 'gold' ? 2 : s.vows?.focus?.kind === 'stage' && !s.dungeon && s.stage === s.vows.focus.id ? 1.5 : 1;
export const focusExp = (s: Pick<State, 'vows' | 'stage' | 'dungeon'>) => s.vows?.focus?.kind === 'gold' ? .75 : s.vows?.focus?.kind === 'stage' && !s.dungeon && s.stage === s.vows.focus.id ? 1.5 : 1;
// v27.79 계정(분신) 보너스는 곱연산 배율입니다(accountExpGold ≤ ×1.3).
/** v3.69 수련 직업으로 사냥할 때의 처치 보상 배율(data/training.ts). */
const jobReward = (s: State) => jobById(s.job)?.rewardScale ?? 1;
export const goldMultiplier = (s: State, a = stats(s)) => (1 + a.goldBonus) * jobReward(s) * accountExpGold(s) * roughReward(s, encounterTier(s)) * focusGold(s) * (s.event?.gold || 1);
// v3.23 순풍은 다른 경험치 보너스와 더합니다(전에는 따로 곱해 폭증).
export const expMultiplier = (s: State, a = stats(s)) => Math.max(0, 1 + a.expBonus + (tailwindActive(s) ? tailwindExp(s) : 0)) * jobReward(s) * accountExpGold(s) * focusExp(s) * (1 + restraintExp(s)) * sproutExp(sproutCount(s)) * ascensionEarlyExp(s) * (s.event?.exp || 1);
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
