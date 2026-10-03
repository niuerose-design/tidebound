import { refinementTargets, thresholdRank, REFINEMENT_STEP_BONUS } from '../data/long-term';
import { rebirthAP } from './meta';
import { accountAP } from '../data/account';
import { abyssAP } from '../data/long-term';
import type { State, Attribute, Skill, Stats } from '../types';
import { PROGRESSION, emptyAttributes, STAT_LABELS, formatStat } from '../data/progression';
import { BALANCE, SKILL_FORMULA } from '../data/balance';
import { Job, JobStatKey, jobById } from '../data/classes';
import { SKILLS, skillById } from '../data/skills';
import { STAGES, FISH } from '../data/world';
import { doorFor, DOORS } from '../data/doors';
export function initialProgress(level = 1) { return { attributes: emptyAttributes(), statPoints: PROGRESSION.startingStats + (level - 1) * PROGRESSION.statPerLevel, sp: PROGRESSION.startingSP, peakLevel: level, learned: { hook: 1 } as Record<string, number>, skillSpent: {} as Record<string, number>, skillInheritances: {} as Record<string, boolean>, skillPractice: {} as Record<string, number>, jobMastery: {} as Record<string, number>, unlockedJobs: ['fisher'], bookClaims: {} as Record<string, number>, itemBook: {} as Record<string, boolean>, target: null as string | null, presets: {} as State['presets'], mana: 40, effects: {}, playerStun: 0 }; }
export function attributes(s: State) {
    const out = emptyAttributes();
    for (const key of Object.keys(out) as Attribute[])
        out[key] = PROGRESSION.baseAttribute + Math.floor(s.level / PROGRESSION.attributeGrowthEvery) + (s.attributes?.[key] || 0);
    return out;
}
export function masteryMilestonesFor(sk?: Skill) { return sk?.masteryMilestones?.length ? sk.masteryMilestones : PROGRESSION.skillMasteryMilestones; }
export function skillRefinementTargets(sk: Skill) {
    const positive = Object.values(sk.bonus || {}).some(n => n > 0) || Object.values(sk.levelEffects || {}).some(row => Object.values(row.bonus || {}).some(n => n > 0));
    return sk.type === 'active' || positive ? refinementTargets(masteryMilestonesFor(sk).at(-1)!) : [];
}
export const skillPracticeTargets = (sk: Skill) => [...masteryMilestonesFor(sk), ...skillRefinementTargets(sk)];
export function maxSkillLevel(sk: Skill) { return masteryMilestonesFor(sk).length; }
/** SP and mastery unlock the SAME stages. Neither locks out the other. */
export function skillLevel(sk: Skill, rank = 1, mastery = 0) { return Math.min(maxSkillLevel(sk), Math.max(0, rank - 1, mastery)); }
export function skillMasteryRewards(sk: Skill, rank = 1, mastery = 0) {
    if (skillLevel(sk, rank, mastery) < maxSkillLevel(sk))
        return { ap: 0, bonus: {} as Partial<Stats> };
    return { ap: sk.masteryAP || 0, bonus: sk.masteryBonus || {} };
}
export function apBonus(s: State, ids = s.skills) { return ids.reduce((sum, id) => { const sk = skillById(id); return sum + (sk && canUse(s, id) ? skillMasteryRewards(sk, s.learned?.[id] || 1, skillMastery(s, id)).ap : 0); }, 0); }
export function apCapacity(s: State, ids = s.skills) { return PROGRESSION.baseAP + rebirthAP(s) + (s.permanent.ap || 0) + completedRegions(s).length + achievementAP(s) + accountAP(s) + abyssAP(s) + apBonus(s, ids); }
/** v25.6 업적 보상으로 늘어난 장착 AP. achievements.ts와 순환 의존을 피하려 여기서 직접 셉니다. */
export function achievementAP(s: Pick<State, 'achievementClaims'>) { let ap = 0; for (const id of Object.keys(s.achievementClaims || {})) ap += ACHIEVEMENT_AP[id] || 0; return ap; }
export const ACHIEVEMENT_AP: Record<string, number> = {};
export function skillMasteryLevel(practice: number, milestones = PROGRESSION.skillMasteryMilestones) { return milestones.filter(m => practice >= m).length; }
export function skillMastery(s: State, id: string) { const sk = skillById(id); return skillMasteryLevel(s.skillPractice?.[id] || 0, masteryMilestonesFor(sk)); }
export function skillMasteryRanks(s: State) { const out: Record<string, number> = {}; for (const [id, practice] of Object.entries(s.skillPractice || {})) out[id] = skillMasteryLevel(practice, masteryMilestonesFor(skillById(id))); return out; }
export function apUsed(s: State, ids = s.skills) { return ids.reduce((sum, id) => { const sk = skillById(id); return sum + (sk ? effectiveSkill(sk, s.learned?.[id] || 1, skillMastery(s, id)).cost! : 2); }, 0); }
export function lineage(job: string): string[] { const j = jobById(job); return j ? [j.id, ...(j.parent ? lineage(j.parent) : [])] : []; }
/** 전용 기술 효율: 4차 이상 직업의 기술을 계보 밖 직업이 쓰면 SKILL_FORMULA.signatureScale, 그 외 1. */
export function signatureScale(sk: Pick<Skill, 'job'>, userJob?: string) {
    if (!sk.job || !userJob) return 1;
    const owner = jobById(sk.job);
    if (!owner || owner.tier < SKILL_FORMULA.signatureTier) return 1;
    return lineage(userJob).includes(sk.job) || lineage(sk.job).includes(userJob) ? 1 : SKILL_FORMULA.signatureScale;
}
/**
 * v24.2 진행도 기록: 진행도 비례 패시브(perCount)와 피해(scaling)가 세는 값.
 * codex 발견한 어종 + 등록한 물건 · catch 누적 포획 · hunt 던전 클리어 + 보스 포획 · species 지정 어종 포획 · gold 보유 골드 자릿수 · rebirth 환생 · mastered 숙달한 직업 수.
 */
export function progressCounts(s: Pick<State, 'book' | 'itemBook' | 'clears' | 'gold' | 'rebirths' | 'jobMastery'>) {
    const book = s.book || {};
    let catches = 0, discovered = 0, bosses = 0;
    for (const f of FISH) { const n = book[f.id] || 0; catches += n; if (n > 0) discovered++; if (f.boss) bosses += n; }
    const clears = Object.values(s.clears || {}).reduce((x, n) => x + (n || 0), 0);
    const species = SKILL_FORMULA.designatedSpecies.reduce((x, id) => x + (book[id] || 0), 0);
    return { codex: discovered + Object.keys(s.itemBook || {}).length, catch: catches, hunt: clears + bosses, species, gold: Math.floor(Math.log10(1 + Math.max(0, s.gold || 0))), rebirth: s.rebirths || 0, mastered: masteredJobCount(s) };
}
export function jobMasteryTarget(jobOrId: Job | string) {
    const job = typeof jobOrId === 'string' ? jobById(jobOrId) : jobOrId;
    return Math.max(1, job?.masteryTarget ?? PROGRESSION.jobMastery);
}
export function jobMasteryBoost(jobOrId: Job | string) {
    const job = typeof jobOrId === 'string' ? jobById(jobOrId) : jobOrId;
    return Math.max(0, job?.masteryBoost ?? .15);
}
const jobTierScale = (job: Job) => job.tier <= 1 ? .55 : job.tier === 2 ? .82 : 1;
/** UI, combat and exported job tables share this exact tier/mastery adjustment. 1~3차는 배율이 1 이하라 마이너스 보정만 남습니다. */
export function jobCombatMultiplier(job: Job, factor: number, mastered = false) {
    return factor >= 1 ? 1 + (factor - 1) * jobTierScale(job) * (mastered ? 1 + jobMasteryBoost(job) : 1) : factor;
}
/** 고정 수치 직업 보정(숙달하면 1 + 숙달 보너스 배). 능력치 계산·직업 화면·내보내기가 같은 값을 씁니다. 화면에는 반올림해 보여 줍니다. */
export function jobFlatBonus(job: Job, key: JobStatKey, mastered = false) {
    const n = job.bonus?.[key] || 0;
    return n > 0 ? n * (mastered ? 1 + jobMasteryBoost(job) : 1) : 0;
}
/** 고정 보정을 차수별 환산 기준으로 옛 배율에 맞춘 값. 방어 친화도·마력 평타처럼 직업 성향을 판정할 때만 씁니다. */
export function jobFactor(job: Job, key: JobStatKey) {
    const flat = job.bonus?.[key] || 0, ref = SKILL_FORMULA.jobFlatReference[Math.min(3, Math.max(1, job.tier))]?.[key];
    return job[key] + (flat && ref ? flat / (ref * jobTierScale(job)) : 0);
}
export function inherited(s: State, id: string) { const sk = skillById(id); return !!sk && (!!s.skillInheritances?.[id] || (s.skillPractice?.[id] || 0) >= masteryMilestonesFor(sk)[0]); }
export function classAccess(s: State, sk: Skill) { return (!sk.song || songAccess(s)) && (!sk.job || s.job === sk.job || inherited(s, sk.id)); }
/** v24.2 노래 패시브는 음유시인 계보(방랑 음유시인의 후속 직업)만 장착합니다. */
export function songAccess(s: Pick<State, 'job'>) { return lineage(s.job).includes('bard'); }
export function skillUnlockReady(s: State, sk: Skill) { return (!sk.unlockJobMastery || !!sk.job && (s.jobMastery[sk.job] || 0) >= sk.unlockJobMastery) && (!sk.unlockAfter || skillMastery(s, sk.unlockAfter.skill) >= sk.unlockAfter.level); }
/** v25 숙련 Lv.1 전에는 효과를 감추는 기술인지. */
export function skillVeiled(s: State, sk: Skill) { return !!sk.veiled && skillMastery(s, sk.id) < 1; }
/** 계승한 스킬은 환생 뒤 레벨이 낮아도 쓸 수 있습니다(레벨 조건 면제). 환생 횟수·직업 숙련 해금 조건은 그대로입니다. */
export function canLearn(s: State, id: string) { const sk = skillById(id); return !!sk && (s.level >= sk.level || inherited(s, id)) && s.rebirths >= (sk.rebirth || 0) && skillUnlockReady(s, sk) && classAccess(s, sk); }
/** 스킬을 장착할 수 없는 이유. 쓸 수 있으면 빈 문자열입니다. */
export function skillBlockReason(s: State, id: string) {
    const sk = skillById(id);
    if (!sk) return '스킬을 찾을 수 없습니다.';
    if (sk.song && !songAccess(s)) return '노래는 방랑 음유시인 계보 직업만 부를 수 있습니다.';
    if (!classAccess(s, sk)) return '전용 직업으로 전직하거나, 숙련 또는 SP 계승을 완료하세요.';
    if (s.rebirths < (sk.rebirth || 0)) return `환생 ${sk.rebirth}회부터 사용할 수 있습니다.`;
    if (sk.unlockAfter && skillMastery(s, sk.unlockAfter.skill) < sk.unlockAfter.level) return `${skillById(sk.unlockAfter.skill)?.name || sk.unlockAfter.skill} 숙련 Lv.${sk.unlockAfter.level}을 달성하면 열립니다.`;
    if (!skillUnlockReady(s, sk)) return `직업 숙련 ${sk.unlockJobMastery!.toLocaleString()}부터 사용할 수 있습니다.`;
    if (s.level < sk.level && !inherited(s, id)) return `Lv.${sk.level}부터 사용할 수 있습니다.`;
    if (!((s.learned?.[id] || 0) > 0)) return '아직 습득하지 않은 스킬입니다.';
    return '';
}
export function canUse(s: State, id: string) { return canLearn(s, id) && (s.learned?.[id] || 0) > 0; }
/** SP로 하는 행동은 모두 1 SP입니다. 직업이 주는 기술은 SP가 들지 않습니다. */
export function skillCost() { return PROGRESSION.skillSPCost; }
/** Rank 1 means acquired base skill, NOT an SP investment. */
export function grantJobSkills(s: State) {
    const granted: string[] = [];
    for (const sk of SKILLS) {
        if ((sk.freeCommon ? !!sk.job : sk.job !== s.job) || !canLearn(s, sk.id))
            continue;
        if ((s.learned?.[sk.id] || 0) <= 0) {
            s.learned[sk.id] = 1;
            granted.push(sk.id);
        }
    }
    return granted;
}
/** SP may never buy a skill from a job the player has not acquired it from. */
export function canInheritSkill(s: State, id: string) {
    const sk = skillById(id);
    return !!sk?.job && (s.learned[id] || 0) > 0 && !inherited(s, id) && s.level >= sk.level && s.rebirths >= (sk.rebirth || 0) && skillUnlockReady(s, sk);
}
export function canSpendSkill(s: State, id: string) {
    const sk = skillById(id), rank = s.learned?.[id] || 0;
    return !!sk && rank > 0 && canUse(s, id) && skillLevel(sk, rank, skillMastery(s, id)) < maxSkillLevel(sk);
}
export function effectiveSkill(sk: Skill, rank = 1, mastery = 0, specialization?: string, practice = 0): Skill {
    const steps = skillLevel(sk, rank, mastery), fx = sk.rankEffects || {}, override = sk.levelEffects?.[steps];
    const factor = 1 + steps * (fx.multiplierScale ?? PROGRESSION.rankMultiplier);
    // Penalties must not become harsher merely because a skill gained a level.
    const bonus = override?.bonus ?? (sk.bonus ? Object.fromEntries(Object.entries(sk.bonus).map(([k, n]) => [k, n < 0 ? n : n * (1 + steps * (fx.bonusScale ?? PROGRESSION.rankPassive))])) : undefined);
    const result: Skill = {
        ...sk,
        cost: sk.song ? 0 : override?.cost ?? Math.max(1, (sk.cost ?? 2) - Math.floor(steps * (fx.apReduction ?? 0))) - (sk.type === 'passive' && steps >= maxSkillLevel(sk) ? SKILL_FORMULA.masteredPassiveAP : 0),
        manaCost: Math.max(0, (sk.manaCost ?? 0) - Math.floor(steps * (fx.manaReduction ?? 0))),
        chance: sk.type === 'passive' ? 0 : sk.chance >= 1 ? 1 : Math.min(.95, sk.chance + steps * (fx.chanceIncrease ?? PROGRESSION.masteryChance)),
        cooldown: sk.type === 'passive' ? 0 : Math.max(1, sk.cooldown - Math.floor(steps * (fx.cooldownReduction ?? 0))),
        multiplier: sk.multiplier * factor,
        bonus,
        penaltyRelief: override?.penaltyRelief ?? sk.penaltyRelief,
    };
    const refinement = thresholdRank(practice, skillRefinementTargets(sk));
    // Only actual practice refines a skill; neither AP/cost nor mastery multipliers scale.
    result.multiplier *= 1 + refinement * REFINEMENT_STEP_BONUS;
    if (refinement && result.bonus) result.bonus = Object.fromEntries(Object.entries(result.bonus).map(([k, n]) => [k, n > 0 ? n * (1 + refinement * REFINEMENT_STEP_BONUS) : n]));
    return result;
}
export type SkillRankDelta = { label: string; from: string; to: string; };
function skillDeltas(current: Skill, next: Skill): SkillRankDelta[] {
    const out: SkillRankDelta[] = [];
    if (current.cost !== next.cost)
        out.push({ label: '장착 AP', from: `AP ${current.cost}`, to: `AP ${next.cost}` });
    if (current.manaCost !== next.manaCost)
        out.push({ label: '마나', from: `${current.manaCost}`, to: `${next.manaCost}` });
    if (current.chance !== next.chance)
        out.push({ label: '발동 확률', from: `${Number((current.chance * 100).toFixed(2))}%`, to: `${Number((next.chance * 100).toFixed(2))}%` });
    if (current.cooldown !== next.cooldown)
        out.push({ label: '재사용 대기', from: `${current.cooldown}턴`, to: `${next.cooldown}턴` });
    if (current.multiplier !== next.multiplier)
        out.push({ label: '피해 배율', from: `${Number((current.multiplier * 100).toFixed(2))}%`, to: `${Number((next.multiplier * 100).toFixed(2))}%` });
    for (const key of Object.keys({ ...(current.bonus || {}), ...(next.bonus || {}) })) {
        const before = current.bonus?.[key as keyof Stats] || 0, after = next.bonus?.[key as keyof Stats] || 0;
        if (Math.abs(before - after) > .0001)
            out.push({ label: STAT_LABELS[key as keyof Stats] || key, from: `${before < 0 ? '' : '+'}${formatStat(key, before)}`, to: `${after < 0 ? '' : '+'}${formatStat(key, after)}` });
    }
    return out;
}
export function masteryGainBonus(sk: Skill, level: number) {
    const stages = sk.masteryGain?.bonusByLevel;
    return stages?.[Math.min(level, stages.length - 1)] ?? 0;
}
export function skillRankDeltas(sk: Skill, rank: number, mastery = 0, specialization?: string, practice = 0): SkillRankDelta[] {
    const level = skillLevel(sk, rank, mastery);
    if (level >= maxSkillLevel(sk))
        return [];
    const deltas = skillDeltas(effectiveSkill(sk, level + 1, mastery, specialization, practice), effectiveSkill(sk, level + 2, mastery, specialization, practice));
    if (sk.masteryGain) deltas.push({ label: '조건 충족 시 추가 숙련', from: `+${masteryGainBonus(sk, level)}`, to: `+${masteryGainBonus(sk, level + 1)}` });
    return deltas;
}
export function skillRankHint(sk: Skill, rank: number, mastery = 0, specialization?: string, practice = 0) {
    const rows = skillRankDeltas(sk, Math.max(1, rank), mastery, specialization, practice);
    return rows.length ? rows.map(x => `${x.label} ${x.from} → ${x.to}`).join(' · ') : '최대 강화 레벨입니다.';
}
export function skillMasteryHint(sk: Skill, level: number, rank = 1) {
    const milestones = masteryMilestonesFor(sk), current = skillLevel(sk, rank, level);
    if (current >= milestones.length)
        return '최대 강화 완료 · 실전 숙련과 전직 조건은 계속 기록됩니다.';
    return `${milestones[current].toLocaleString()} 또는 1 SP → Lv.${current + 1} · ${skillRankHint(sk, rank, level)}`;
}
/** 숙달한 직업: 직업 숙련이 목표치에 닿으면 레벨·능력치·숙련·문 조건 없이 언제든 다시 전직할 수 있습니다. */
export const jobMastered = (s: Pick<State, 'jobMastery'>, j: Job) => (s.jobMastery?.[j.id] || 0) >= jobMasteryTarget(j);
/** 숙달(숙련 목표 달성)한 직업 수. 편력 낚시꾼의 패시브와 발견의 문이 셉니다. */
export const masteredJobCount = (s: Pick<State, 'jobMastery'>) => Object.keys(s.jobMastery || {}).filter(id => { const j = jobById(id); return !!j && jobMastered(s, j); }).length;
/** 전직 조건 목록. now는 서버가 넘긴 요청 시각(문 판정용)이며, 화면에서는 마지막 서버 시각(lastTick)을 씁니다. */
export function jobRequirements(s: State, j: Job, now = s.lastTick) {
    const a = attributes(s), unlocked = s.unlockedJobs?.includes(j.id);
    /** value·target은 화면의 진행 막대용입니다(판정은 met). */
    const list: { label: string; met: boolean; value?: number; target?: number }[] = [{ label: `레벨 ${j.level}`, met: s.level >= j.level, value: s.level, target: j.level }];
    if (j.rebirth)
        list.push({ label: `환생 ${j.rebirth}회`, met: s.rebirths >= j.rebirth, value: s.rebirths, target: j.rebirth });
    if (!unlocked) {
        // v25.22 몰아주기: 요구 능력치가 둘 이상일 때, 어느 한 능력치가 요구치 합계 이상이면 능력치 조건을 모두 채운 것으로 봅니다(올-근력·올-행운 같은 편중 빌드).
        const reqs = Object.entries(j.requires), sum = reqs.reduce((t, [, n]) => t + n, 0), focused = reqs.length >= 2 && Object.values(a).some(v => v >= sum);
        for (const [key, n] of reqs)
            list.push({ label: `${({ str: '근력', dex: '기민', int: '지능', vit: '체질', wis: '정신', luk: '행운' } as Record<string, string>)[key]} ${n}`, met: a[key as Attribute] >= n || focused, value: a[key as Attribute], target: n });
        if (focused && reqs.some(([key, n]) => a[key as Attribute] < n)) list.push({ label: `몰아주기 · 한 능력치 ${sum} 이상`, met: true });
        for (const [key, n] of Object.entries(j.requiresAllocated || {}))
            list.push({ label: `배분 ${({ str: '근력', dex: '기민', int: '지능', vit: '체질', wis: '정신', luk: '행운' } as Record<string, string>)[key]} ${n}`, met: (s.attributes?.[key as Attribute] || 0) >= n, value: s.attributes?.[key as Attribute] || 0, target: n });
        if (j.parent)
            list.push({ label: `${jobById(j.parent)?.name} 숙련 ${j.mastery}`, met: (s.jobMastery?.[j.parent] || 0) >= j.mastery, value: s.jobMastery?.[j.parent] || 0, target: j.mastery });
        for (const [jobId, mastery] of Object.entries(j.requiresJobMastery || {})) {
            const job = jobById(jobId);
            // 선행 직업과 같은 조건이면 한 번만 표시합니다(판정은 같음).
            if (!(jobId === j.parent && mastery === j.mastery))
                list.push({ label: `${job?.name || jobId} 숙련 ${mastery}`, met: (s.jobMastery?.[jobId] || 0) >= mastery, value: s.jobMastery?.[jobId] || 0, target: mastery });
        }
        if (j.requiresMastered)
            list.push({ label: `숙달한 직업 ${j.requiresMastered}개`, met: masteredJobCount(s) >= j.requiresMastered, value: masteredJobCount(s), target: j.requiresMastered });
        for (const [skillId, mastery] of Object.entries(j.requiresSkillMastery || {})) {
            const skill = skillById(skillId), milestones = masteryMilestonesFor(skill), target = milestones[Math.max(0, mastery - 1)] || milestones[milestones.length - 1];
            list.push({ label: `${skill?.name || skillId} 숙련 ${mastery}단계 (${target})`, met: skillMastery(s, skillId) >= mastery, value: skillMastery(s, skillId), target: mastery });
        }
        // ??? 계보의 첫 직업은 해당 문이 열려 있어야 합니다(한 번 들어간 직업은 제외).
        const door = doorFor(s, j.id, now);
        if (door) list.push({ label: `${DOORS.find(d => d.id === door.door)!.name} 열림`, met: door.open });
    }
    return list;
}
/** 전직 가능 여부. 숙달한 직업은 모든 조건을 무시합니다. now는 서버 요청 시각입니다. */
export function canChangeJob(s: State, id: string, now = s.lastTick) { const j = jobById(id); return !!j && (jobMastered(s, j) || jobRequirements(s, j, now).every(x => x.met)); }
export function validLoadout(s: State, ids: string[]) { return ids.length === new Set(ids).size && ids.every(id => canUse(s, id)) && apUsed(s, ids) <= apCapacity(s, ids); }
export function trimLoadout(s: State) {
    s.skills = [...new Set(s.skills)].filter(id => canUse(s, id));
    // Evaluate the entire set so an AP-granting skill works in any priority position.
    while (s.skills.length && !validLoadout(s, s.skills)) {
        const index = s.skills.findLastIndex(id => {
            const sk = skillById(id)!;
            return (effectiveSkill(sk, s.learned[id], skillMastery(s, id)).cost ?? 2) > 0;
        });
        s.skills.splice(index < 0 ? s.skills.length - 1 : index, 1);
    }
}
export function completedRegions(s: State) { return STAGES.filter(st => st.fish.every(id => (s.book[id] || 0) >= PROGRESSION.fishComplete)); }
export function bookReward(s: State, id: string) { const rank = s.bookClaims?.[id] || 0; return { rank, required: BALANCE.bookMilestones[rank], sp: PROGRESSION.bookSP[rank] || 0, gold: PROGRESSION.bookGold[rank] || 0, ready: rank < BALANCE.bookMilestones.length && (s.book[id] || 0) >= BALANCE.bookMilestones[rank] }; }
/** 이미 넘은 임계치 중 아직 받지 않은 연구 단계 전부. 여러 단계를 한 번에 넘었으면 모두 한 번에 받습니다. */
export function bookPending(s: State, id: string) {
    const claimed = s.bookClaims?.[id] || 0, n = s.book[id] || 0, ranks: number[] = [];
    for (let r = claimed; r < BALANCE.bookMilestones.length && n >= BALANCE.bookMilestones[r]; r++) ranks.push(r);
    return { ranks, gold: ranks.reduce((a, r) => a + (PROGRESSION.bookGold[r] || 0), 0), sp: ranks.reduce((a, r) => a + (PROGRESSION.bookSP[r] || 0), 0) };
}
export function itemKey(slot: string, rarity: number) { return `${slot}:${rarity}`; }
