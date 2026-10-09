import { EXTREME_BREAK_PRACTICE } from '../data/long-term';
import { rebirthAP } from './meta';
import { restraintAP, restraintSlots } from './vows';
import { accountAP } from '../data/account';
import type { State, Attribute, Skill, Stats } from '../types';
import { PROGRESSION, emptyAttributes, STAT_LABELS, formatStat, ATTRIBUTE_NAMES } from '../data/progression';
import { BALANCE, SKILL_FORMULA } from '../data/balance';
import { Job, JobStatKey, jobById, lineageOf } from '../data/classes';
import { SKILLS, skillById } from '../data/skills';
import { BASE_STAGES, MONSTERS } from '../data/world';
import { unlockFor, UNLOCK_LABEL } from '../data/unlock-info';
import { researchRank } from '../data/economy';
import { STAT_TRAINING_GROWTH } from '../data/stat-training';
import { HACKER_ID, isHackerJob } from '../data/hacker';
import { MAPLE_LINEAGE_NAMES } from '../data/maple-names';
/** v3.58 확정 구매를 없애며 물건 도감 ‘일반’ 4칸은 처음부터 등록된 것으로 둡니다(시작 장비와 같은 등급). */
export const PLAIN_CODEX_SLOTS = ['rod', 'coat', 'charm', 'cape'] as const;
export const plainCodexBook = () => Object.fromEntries(PLAIN_CODEX_SLOTS.map(slot => [`${slot}:0`, true]));
export function initialProgress(level = 1) { return { attributes: emptyAttributes(), statPoints: PROGRESSION.startingStats + (level - 1) * PROGRESSION.statPerLevel, sp: PROGRESSION.startingSP, peakLevel: level, learned: { hook: 1 } as Record<string, number>, skillSpent: {} as Record<string, number>, skillInheritances: {} as Record<string, boolean>, skillPractice: {} as Record<string, number>, jobMastery: {} as Record<string, number>, unlockedJobs: ['fisher'], bookClaims: {} as Record<string, number>, itemBook: plainCodexBook() as Record<string, boolean>, target: null as string | null, presets: {} as State['presets'], mana: 40, effects: {}, playerStun: 0 }; }
export function attributes(s: State) {
    const out = emptyAttributes();
    for (const key of Object.keys(out) as Attribute[])
        out[key] = PROGRESSION.baseAttribute + (s.attributes?.[key] || 0);
    return out;
}
export function masteryMilestonesFor(sk?: Skill) { return sk?.masteryMilestones?.length ? sk.masteryMilestones : PROGRESSION.skillMasteryMilestones; }
/** v3.74 극한돌파 목표 숙련: 모든 액티브 스킬이 같은 1억(EXTREME_BREAK_PRACTICE). 패시브는 극한돌파가 없습니다(null). */
export function extremeBreakTarget(sk: Skill) { return sk.type === 'active' ? EXTREME_BREAK_PRACTICE : null; }
/** v3.74 극한돌파 달성: 액티브 스킬이 한계돌파 3단계(연구 적용분)를 마치고 숙련 1억을 넘었는지. 지금은 효과가 없습니다(운영자 문의). */
export function extremeBroken(s: State, id: string) {
    const sk = skillById(id), target = sk && extremeBreakTarget(sk);
    return !!target && limitBreakOf(s, id) >= PROGRESSION.limitBreak.max && refinePractice(s, id) >= target;
}
/**
 * v3.31 극한돌파(v3.74, 옛 연마)·한계 돌파에 쓰는 숙련. 승천하면 그때의 숙련을 기준점(refineBase)으로 두고, 그 위로 쌓인 숙련만 연마·한계 돌파에 셉니다.
 * 성장 레벨(숙련 1~4단계)은 원래 숙련 그대로라 바뀌지 않습니다. 기준점이 없으면 원래 숙련과 같습니다.
 */
export function refinePractice(s: Pick<State, 'skillPractice' | 'refineBase'>, id: string) {
    const practice = s.skillPractice?.[id] || 0, base = s.refineBase?.[id];
    if (!base) return practice;
    const last = masteryMilestonesFor(skillById(id)).at(-1)!;
    return Math.max(Math.min(practice, last), practice - Math.max(0, base - last));
}
/**
 * v3.104 skillMasteryRanks와 같은 값을, 조회한 스킬만 그때 계산하는 표(숙련 기록이 있는 스킬만 값이 있고 나머지는 undefined).
 * 턴마다 숙련을 쌓은 모든 스킬(수백 개)을 계산하던 것을 전투가 실제로 보는 몇 개로 줄입니다. 표를 쓰는 동안 숙련 기록이 바뀌지 않을 때만 쓰세요.
 */
function lazySkillTable(s: Pick<State, 'skillPractice'>, value: (id: string) => number): Record<string, number> {
    const practice = s.skillPractice || {}, cache: Record<string, number | undefined> = {};
    return new Proxy(cache, { get: (_, id) => { if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(practice, id)) return undefined; return cache[id] ??= value(id); } }) as Record<string, number>;
}
export const lazySkillMasteryRanks = (s: State) => lazySkillTable(s, id => skillMasteryLevel(s.skillPractice[id], masteryMilestonesFor(skillById(id))) + limitBreakOf(s, id));
export function maxSkillLevel(sk: Skill) { return masteryMilestonesFor(sk).length; }
/** 실제로 한 한계돌파 단계(연구 상한 적용 전). 다음 단계 계산에 씁니다. */
export function limitBreakOwned(s: Pick<State, 'limitBreaks'>, id: string) { return Math.min(PROGRESSION.limitBreak.max, s.limitBreaks?.[id] || 0); }
/**
 * v27.6 효과가 나는 한계돌파 단계. 숙련 완료가 조건이라 skillMastery()에 더해져 성장 레벨이 최대를 넘습니다.
 * v27.31 세계석 연구 ‘리미터 해제’ 단계까지만 적용합니다(연구를 재분배하면 그만큼 효과가 멈추고, 다시 사면 돌아옵니다).
 */
export function limitBreakOf(s: Pick<State, 'limitBreaks' | 'permanent'>, id: string) { return Math.min(limitBreakOwned(s, id), researchRank(s, 'limitBreak')); }
/** 다음 한계돌파 조건. stage는 1부터, ok가 false면 reason에 이유. */
export function limitBreakNext(s: State, id: string) {
    const sk = skillById(id), stage = limitBreakOwned(s, id) + 1, lb = PROGRESSION.limitBreak;
    if (!sk || stage > lb.max) return { stage, sp: 0, practice: 0, ok: false, reason: stage > lb.max ? '한계돌파 최대 단계입니다.' : '스킬을 찾을 수 없습니다.' };
    const last = masteryMilestonesFor(sk).at(-1)!, practice = last * lb.practiceMultiple[stage - 1], sp = lb.sp[stage - 1], have = refinePractice(s, id);
    const reason = !(s.learned?.[id] > 0) ? '먼저 습득해야 합니다.' : skillMasteryLevel(have, masteryMilestonesFor(sk)) < maxSkillLevel(sk) ? '실전 숙련을 끝까지 채워야 합니다.' : researchRank(s, 'limitBreak') < stage ? `세계석 연구 ‘리미터 해제’ ${stage}단계 필요 (지금 ${researchRank(s, 'limitBreak')}단계)` : have < practice ? `실전 숙련 ${practice.toLocaleString()} 필요 (지금 ${have.toLocaleString()})` : s.sp < sp ? `SP ${sp} 필요` : '';
    return { stage, sp, practice, ok: !reason, reason };
}
/** SP and mastery unlock the SAME stages. Neither locks out the other. v27.6 숙련(한계돌파 포함)이 최대를 넘으면 그만큼 더 올라갑니다. */
export function skillLevel(sk: Skill, rank = 1, mastery = 0) { const max = maxSkillLevel(sk); return Math.min(max + Math.min(PROGRESSION.limitBreak.max, Math.max(0, mastery - max)), Math.max(0, rank - 1, mastery)); }
/** v3.38 장착 AP 내역(능력치 화면 표시와 apCapacity가 같은 목록을 씁니다). */
export function apSources(s: State): { id: string; label: string; value: number }[] {
    return [
        { id: 'base', label: '기본', value: PROGRESSION.baseAP },
        { id: 'rebirth', label: '환생 횟수', value: rebirthAP(s) },
        { id: 'research', label: '세계석 연구 ‘영혼 확장’', value: s.permanent.ap || 0 },
        { id: 'achievement', label: '업적', value: achievementAP(s) },
        { id: 'account', label: '계정(분신 숙달 직업)', value: accountAP(s) },
        { id: 'restraint', label: '절제 서약', value: -restraintAP(s) },
    ];
}
/** 장착 AP 한도(최소 1). */
export function apCapacity(s: State) { return Math.max(1, apSources(s).reduce((a, x) => a + x.value, 0)); }
/** v25.6 업적 보상으로 늘어난 장착 AP. achievements.ts와 순환 의존을 피하려 여기서 직접 셉니다. */
function achievementAP(s: Pick<State, 'achievementClaims'>) { let ap = 0; for (const id of Object.keys(s.achievementClaims || {})) ap += ACHIEVEMENT_AP[id] || 0; return ap; }
export const ACHIEVEMENT_AP: Record<string, number> = {};
export function skillMasteryLevel(practice: number, milestones = PROGRESSION.skillMasteryMilestones) { return milestones.filter(m => practice >= m).length; }
export function skillMastery(s: State, id: string) { const sk = skillById(id); return skillMasteryLevel(s.skillPractice?.[id] || 0, masteryMilestonesFor(sk)) + limitBreakOf(s, id); }
export function skillMasteryRanks(s: State) { const out: Record<string, number> = {}; for (const [id, practice] of Object.entries(s.skillPractice || {})) out[id] = skillMasteryLevel(practice, masteryMilestonesFor(skillById(id))) + limitBreakOf(s, id); return out; }
/** v3.86 효과가 나는 추가 판정 단계: 켠 단계 · 연구 ‘시스템 파괴 I’ 단계 · 규칙 최대 단계 중 가장 낮은 값. */
export function extraRollLevel(s: Pick<State, 'extraRolls' | 'permanent'>) { return Math.max(0, Math.min(s.extraRolls || 0, researchRank(s, 'extraRoll'), SKILL_FORMULA.extraRoll.ap.length)); }
/** v3.86 추가 판정이 쓰는 장착 AP(단계별 합). */
export function extraRollAP(s: Pick<State, 'extraRolls' | 'permanent'>, level = extraRollLevel(s)) { return SKILL_FORMULA.extraRoll.ap.slice(0, level).reduce((a, n) => a + n, 0); }
/** v3.197 떠돌이의 요령(방랑): 장착한 것 중 가장 큰 borrowedDiscount. 요령의 계보(방랑) 직업일 때만 듭니다(다른 계보가 계승해도 효과 없음). */
function borrowedDiscount(s: State, ids: string[]) {
    const job = jobById(s.job), home = job ? lineageOf(job) : '';
    let n = 0;
    for (const id of ids) { const sk = skillById(id), owner = sk?.borrowedDiscount && sk.job ? jobById(sk.job) : undefined; if (owner && lineageOf(owner) === home) n = Math.max(n, sk!.borrowedDiscount!); }
    return n;
}
/** 스킬 하나의 장착 AP. v3.197 떠돌이의 요령이 들면 다른 계보 직업의 스킬은 discount만큼 싸집니다(최소 1, 1 이하는 그대로). */
export function skillAP(s: State, id: string, discount = 0) {
    const sk = skillById(id);
    if (!sk) return 2;
    const cost = effectiveSkill(sk, s.learned?.[id] || 1, skillMastery(s, id)).cost!;
    if (!(discount > 0 && cost > 1 && sk.job)) return cost;
    const owner = jobById(sk.job), job = jobById(s.job);
    return owner && job && lineageOf(owner) !== lineageOf(job) ? Math.max(1, cost - discount) : cost;
}
/** 편성 ids에 넣었을 때 이 스킬의 장착 AP(화면 표시용, apUsed와 같은 값). */
export function loadoutSkillAP(s: State, id: string, ids = s.skills) { return skillAP(s, id, borrowedDiscount(s, ids)); }
/** 장착 AP 사용량: 스킬 AP 합 + v3.86 추가 판정 AP. */
export function apUsed(s: State, ids = s.skills) { const discount = borrowedDiscount(s, ids); return extraRollAP(s) + ids.reduce((sum, id) => sum + skillAP(s, id, discount), 0); }
/** v3.130 직업 객체별로 한 번만 만듭니다(능력치 계산이 장착 스킬마다 시그니처 · 노래 판정에 부르므로). 돌려준 배열은 읽기만 하세요. 비밀 직업 등록은 새 객체를 넣으므로 캐시가 어긋나지 않습니다. */
const lineageCache = new WeakMap<Job, string[]>();
export function lineage(job: string): string[] {
    const j = jobById(job);
    if (!j) return [];
    let out = lineageCache.get(j);
    if (!out) lineageCache.set(j, out = [j.id, ...(j.parent ? lineage(j.parent) : [])]);
    return out;
}
/** 전용 기술 효율: signatureTier(v3.80 5차) 이상 직업의 기술을 계보 밖 직업이 쓰면 SKILL_FORMULA.signatureScale, 그 외 1. */
export function signatureScale(sk: Pick<Skill, 'job'>, userJob?: string) {
    if (!sk.job || !userJob) return 1;
    const owner = jobById(sk.job);
    if (!owner || owner.tier < SKILL_FORMULA.signatureTier) return 1;
    // v3.199 궁극의 모험가는 모든 계보의 전용 기술을 온전히 씁니다.
    if (jobById(userJob)?.signatureFree) return 1;
    return lineage(userJob).includes(sk.job) || lineage(sk.job).includes(userJob) ? 1 : SKILL_FORMULA.signatureScale;
}
/** 변종·황금 개체 처치 수(마리 수가 아니라 조우 횟수). */
function variantCatches(s: Pick<State, 'variantBook' | 'goldenBook'>) {
    let n = 0;
    for (const row of Object.values(s.variantBook || {})) for (const k of Object.values(row)) n += k || 0;
    for (const k of Object.values(s.goldenBook || {})) n += k || 0;
    return n;
}
/**
 * v24.2 진행도 기록: 진행도 비례 패시브(perCount)와 피해(scaling)가 세는 값.
 * codex 발견한 몬스터 + 등록한 물건 · catch 누적 처치 · hunt 던전 클리어 + 보스 처치 · species 지정 몬스터 처치 · gold 보유 골드 자릿수 · rebirth 환생 · mastered 숙달한 직업 수 · v3.64 deaths 쓰러진 횟수.
 */
export function progressCounts(s: Pick<State, 'book' | 'itemBook' | 'clears' | 'gold' | 'rebirths' | 'jobMastery' | 'variantBook' | 'goldenBook' | 'level' | 'attributes'> & Partial<Pick<State, 'deaths' | 'playMs'>>) {
    // v26.4 외길 패시브: 배분 능력치(기본 포함)도 기록처럼 셉니다.
    const attr = attributes(s as State);
    const book = s.book || {};
    let catches = 0, discovered = 0, bosses = 0;
    for (const f of MONSTERS) { const n = book[f.id] || 0; catches += n; if (n > 0) discovered++; if (f.boss) bosses += n; }
    const clears = Object.values(s.clears || {}).reduce((x, n) => x + (n || 0), 0);
    const species = SKILL_FORMULA.designatedSpecies.reduce((x, id) => x + (book[id] || 0), 0);
    return { codex: discovered + Object.keys(s.itemBook || {}).length, catch: catches, hunt: clears + bosses, species, gold: Math.floor(Math.log10(1 + Math.max(0, s.gold || 0))), rebirth: s.rebirths || 0, variant: variantCatches(s), deaths: s.deaths || 0, turns: Math.floor((s.playMs || 0) / BALANCE.turnMs), str: attr.str, dex: attr.dex, int: attr.int, vit: attr.vit, wis: attr.wis, luk: attr.luk, mastered: masteredJobCount(s) };
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
export function inherited(s: State, id: string) { const sk = skillById(id); return !!sk && (!!s.skillInheritances?.[id] || !!s.legacyInherited?.[id] || (s.skillPractice?.[id] || 0) >= masteryMilestonesFor(sk)[0]); }
/** v3.25 해커 스킬(신원 조작)은 해커 계열(화이트 해커 포함)이면 씁니다. */
function classAccess(s: State, sk: Skill) { return exclusiveAccess(s, sk) && (!sk.job || s.job === sk.job || sk.job === HACKER_ID && isHackerJob(s.job) || inherited(s, sk.id)); }
/** v3.187 계보 전용 기술(노래 등)은 그 계보 직업만 장착합니다. 계승해도 계보 밖에서는 못 씁니다. */
export function exclusiveAccess(s: Pick<State, 'job'>, sk: Pick<Skill, 'exclusiveLineage'>) { return !sk.exclusiveLineage || lineage(s.job).includes(sk.exclusiveLineage); }
/** 계보 전용 칩 · 안내 문구. 전용이 아니면 빈 문자열. 예: '엔젤릭버스터 계보 전용'. */
export function skillExclusiveLabel(sk: Pick<Skill, 'exclusiveLineage'>) { return sk.exclusiveLineage ? `${MAPLE_LINEAGE_NAMES[sk.exclusiveLineage] ?? `${jobById(sk.exclusiveLineage)?.name ?? sk.exclusiveLineage} 계보`} 전용` : ''; }
export function skillUnlockReady(s: State, sk: Skill) { return (!sk.unlockJobMastery || !!sk.job && (s.jobMastery[sk.job] || 0) >= sk.unlockJobMastery) && (!sk.unlockAfter || skillMastery(s, sk.unlockAfter.skill) >= sk.unlockAfter.level); }
/** v25 숙련 Lv.1 전에는 효과를 감추는 기술인지. */
export function skillVeiled(s: State, sk: Skill) { return !!sk.veiled && skillMastery(s, sk.id) < 1; }
/** 계승한 스킬은 환생 뒤 레벨이 낮아도 쓸 수 있습니다(레벨 조건 면제). 환생 횟수·직업 숙련 해금 조건은 그대로입니다. */
function canLearn(s: State, id: string) { const sk = skillById(id); return !!sk && (s.level >= sk.level || inherited(s, id)) && s.rebirths >= (sk.rebirth || 0) && skillUnlockReady(s, sk) && classAccess(s, sk); }
/** 스킬을 장착할 수 없는 이유. 쓸 수 있으면 빈 문자열입니다. */
export function skillBlockReason(s: State, id: string) {
    const sk = skillById(id);
    if (!sk) return '스킬을 찾을 수 없습니다.';
    if (!exclusiveAccess(s, sk)) return `${skillExclusiveLabel(sk)}입니다. 이 계보 직업으로 전직해야 씁니다.`;
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
/** v27.28 한계돌파 단계(최대 성장을 넘은 만큼)에 따른 패시브 배율: 단계마다 +10%. */
export const limitBreakScale = (broken: number) => 1 + Math.max(0, broken) * PROGRESSION.limitBreak.passive;
export const brokenStages = (sk: Skill, rank = 1, mastery = 0) => Math.max(0, skillLevel(sk, rank, mastery) - maxSkillLevel(sk));
/**
 * v3.5 누적·환생 비례 패시브(perCount · perRebirth)의 지금 수치. 능력치 계산(stats.ts)과 같은 식(시그니처 · 한계돌파 배율 포함)으로,
 * 스킬 카드 간단히 보기에 고정 효과와 합쳐 보여 줍니다.
 */
export function passiveGrowthBonus(s: State, sk: Skill, given?: Record<string, number>) {
    const out: Record<string, number> = {};
    if (!sk.perCount && !sk.perRebirth) return out;
    // v3.93 진행도 집계는 누적 비례 패시브일 때만(스킬 카드마다 돌던 것을 줄임).
    const counts = given ?? progressCounts(s);
    const scale = signatureScale(sk, s.job) * limitBreakScale(brokenStages(sk, s.learned?.[sk.id] || 1, skillMastery(s, sk.id)));
    for (const pc of sk.perCount || []) {
        const times = Math.min(pc.cap, Math.floor((counts[pc.source] || 0) / pc.per));
        if (times > 0) for (const [key, n] of Object.entries(pc.bonus)) out[key] = (out[key] || 0) + (n as number) * times * scale;
    }
    const rebirths = Math.min(s.rebirths || 0, SKILL_FORMULA.perRebirthCap);
    if (sk.perRebirth && rebirths > 0) for (const [key, n] of Object.entries(sk.perRebirth)) out[key] = (out[key] || 0) + (n as number) * rebirths * scale;
    return out;
}
/** 스킬의 실제 효과(강화 레벨 · 숙련 단계 반영). */
/**
 * v3.104 같은 스킬 · 레벨 · 숙련 단계면 결과가 같으므로 스킬 객체마다 캐시합니다(능력치 계산이 턴마다 장착 스킬 수만큼 부름).
 * 돌려받은 스킬 객체는 고치지 마세요. 고쳐 쓸 때는 복사본({ ...sk })을 만드세요.
 */
const effectiveCache = new WeakMap<Skill, Map<string, Skill>>();
export function effectiveSkill(sk: Skill, rank = 1, mastery = 0): Skill {
    let byLevel = effectiveCache.get(sk);
    if (!byLevel) effectiveCache.set(sk, byLevel = new Map());
    const key = `${rank}:${mastery}`;
    let out = byLevel.get(key);
    if (!out) { byLevel.set(key, out = computeEffectiveSkill(sk, rank, mastery)); Object.freeze(out); if (out.bonus) Object.freeze(out.bonus); }
    return out;
}
function computeEffectiveSkill(sk: Skill, rank: number, mastery: number): Skill {
    const steps = skillLevel(sk, rank, mastery), fx = sk.rankEffects || {}, override = sk.levelEffects?.[Math.min(steps, maxSkillLevel(sk))];
    // v27.6 한계돌파 단계(최대 성장을 넘은 만큼): 발동 추가, 마지막 단계 AP -1.
    const broken = Math.max(0, steps - maxSkillLevel(sk)), lb = PROGRESSION.limitBreak;
    const factor = 1 + steps * (fx.multiplierScale ?? PROGRESSION.rankMultiplier);
    // Penalties must not become harsher merely because a skill gained a level.
    // v27.28 레벨별 효과표는 최대 레벨에서 멈추므로, 한계돌파 단계만큼 양수 효과를 따로 올립니다.
    const bonus = override?.bonus ? (broken ? Object.fromEntries(Object.entries(override.bonus).map(([k, n]) => [k, n > 0 ? n * limitBreakScale(broken) : n])) : override.bonus) : (sk.bonus ? Object.fromEntries(Object.entries(sk.bonus).map(([k, n]) => [k, n < 0 ? n : n * (1 + steps * (fx.bonusScale ?? PROGRESSION.rankPassive))])) : undefined);
    const result: Skill = {
        ...sk,
        cost: sk.song ? 0 : (override?.cost ?? Math.max(1, (sk.cost ?? 2) - Math.floor(steps * (fx.apReduction ?? 0))) - (sk.type === 'passive' && steps >= maxSkillLevel(sk) ? SKILL_FORMULA.masteredPassiveAP : 0)) - (broken >= lb.max ? lb.apAtMax : 0),
        manaCost: Math.max(0, (sk.manaCost ?? 0) - Math.floor(steps * (fx.manaReduction ?? 0))),
        chance: sk.type === 'passive' ? 0 : sk.chance >= 1 ? 1 : Math.min(.95, sk.chance + steps * (fx.chanceIncrease ?? PROGRESSION.masteryChance) + broken * lb.chance),
        cooldown: sk.type === 'passive' ? 0 : Math.max(1, sk.cooldown - Math.floor(steps * (fx.cooldownReduction ?? 0))),
        multiplier: sk.multiplier * factor,
        bonus,
        // v3.169 능력치 수련 패시브(attrBonus): 화면용 값. 전투(stats.trainedAttributes)와 같은 식(숙련 단계마다 +25%, 최대 ×2 · SP 강화 무관).
        ...(sk.attrBonus ? { attrBonus: Object.fromEntries(Object.entries(sk.attrBonus).map(([k, n]) => [k, Math.round((n || 0) * (1 + STAT_TRAINING_GROWTH * Math.min(4, mastery)))])) } : {}),
        penaltyRelief: override?.penaltyRelief ?? sk.penaltyRelief,
    };
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
    // v3.169 능력치 수련 패시브의 기본 능력치 증가.
    for (const key of Object.keys({ ...(current.attrBonus || {}), ...(next.attrBonus || {}) })) {
        const before = current.attrBonus?.[key as Attribute] || 0, after = next.attrBonus?.[key as Attribute] || 0;
        if (before !== after) out.push({ label: ATTRIBUTE_NAMES[key as Attribute] || key, from: `+${before}`, to: `+${after}` });
    }
    return out;
}
export function masteryGainBonus(sk: Skill, level: number) {
    const stages = sk.masteryGain?.bonusByLevel;
    return stages?.[Math.min(level, stages.length - 1)] ?? 0;
}
export function skillRankDeltas(sk: Skill, rank: number, mastery = 0): SkillRankDelta[] {
    // v3.169 능력치 수련 패시브는 숙련 단계로만 자랍니다(SP 강화 무관). 다음 숙련 단계의 값을 보여 줍니다.
    if (sk.attrBonus) return mastery >= 4 ? [] : skillDeltas(effectiveSkill(sk, 1, mastery), effectiveSkill(sk, 1, mastery + 1)).map(d => ({ ...d, label: `${d.label}(숙련 Lv.${mastery} → ${mastery + 1})` }));
    const level = skillLevel(sk, rank, mastery);
    if (level >= maxSkillLevel(sk))
        return [];
    const deltas = skillDeltas(effectiveSkill(sk, level + 1, mastery), effectiveSkill(sk, level + 2, mastery));
    if (sk.masteryGain) deltas.push({ label: '조건 충족 시 추가 숙련', from: `+${masteryGainBonus(sk, level)}`, to: `+${masteryGainBonus(sk, level + 1)}` });
    return deltas;
}
export function skillRankHint(sk: Skill, rank: number, mastery = 0) {
    const rows = skillRankDeltas(sk, Math.max(1, rank), mastery);
    return rows.length ? rows.map(x => `${x.label} ${x.from} → ${x.to}`).join(' · ') : '최대 강화 레벨입니다.';
}
/** 숙달한 직업: 직업 숙련이 목표치에 닿으면 레벨·능력치·숙련·숨은 조건 없이 언제든 다시 전직할 수 있습니다. */
/** v3.80 숙달 목표를 올리기 전 기준으로 이미 숙달한 직업(masteryKept)은 계속 숙달입니다. */
export const jobMastered = (s: Pick<State, 'jobMastery'> & Partial<Pick<State, 'masteryKept'>>, j: Job) => (s.jobMastery?.[j.id] || 0) >= jobMasteryTarget(j) || !!s.masteryKept?.includes(j.id);
/** 숙달(숙련 목표 달성)한 직업 수. 떠돌이 모험가의 패시브와 숨은 조건이 셉니다. v3.69 옛 수련(retired)은 세지 않습니다(숙달할 직업 21개 감소, 기존 세이브도 같은 기준). */
export const masteredJobCount = (s: Pick<State, 'jobMastery'>) => Object.keys(s.jobMastery || {}).filter(id => { const j = jobById(id); return !!j && !j.retired && jobMastered(s, j); }).length;
/** 전직 조건 목록. */
export function jobRequirements(s: State, j: Job) {
    const a = attributes(s), unlocked = s.unlockedJobs?.includes(j.id);
    /** value·target은 화면의 진행 막대용입니다(판정은 met). */
    const list: { label: string; met: boolean; value?: number; target?: number }[] = [{ label: `레벨 ${j.level}`, met: s.level >= j.level, value: s.level, target: j.level }];
    if (j.rebirth)
        list.push({ label: `환생 ${j.rebirth}회`, met: s.rebirths >= j.rebirth, value: s.rebirths, target: j.rebirth });
    if (!unlocked) {
        for (const [key, n] of Object.entries(j.requires))
            list.push({ label: `${ATTRIBUTE_NAMES[key as Attribute]} ${n}`, met: a[key as Attribute] >= n, value: a[key as Attribute], target: n });
        for (const [key, n] of Object.entries(j.requiresAllocated || {}))
            list.push({ label: `배분 ${ATTRIBUTE_NAMES[key as Attribute]} ${n}`, met: (s.attributes?.[key as Attribute] || 0) >= n, value: s.attributes?.[key as Attribute] || 0, target: n });
        if (j.parent)
            list.push({ label: `${jobById(j.parent)?.name} 숙련 ${j.mastery.toLocaleString()}`, met: (s.jobMastery?.[j.parent] || 0) >= j.mastery, value: s.jobMastery?.[j.parent] || 0, target: j.mastery });
        for (const [jobId, mastery] of Object.entries(j.requiresJobMastery || {})) {
            const job = jobById(jobId);
            // 선행 직업과 같은 조건이면 한 번만 표시합니다(판정은 같음).
            if (!(jobId === j.parent && mastery === j.mastery))
                list.push({ label: `${job?.name || jobId} 숙련 ${mastery.toLocaleString()}`, met: (s.jobMastery?.[jobId] || 0) >= mastery, value: s.jobMastery?.[jobId] || 0, target: mastery });
        }
        if (j.requiresMastered)
            list.push({ label: `숙달한 직업 ${j.requiresMastered}개`, met: masteredJobCount(s) >= j.requiresMastered, value: masteredJobCount(s), target: j.requiresMastered });
        for (const [skillId, mastery] of Object.entries(j.requiresSkillMastery || {})) {
            const skill = skillById(skillId), milestones = masteryMilestonesFor(skill), target = milestones[Math.max(0, mastery - 1)] || milestones[milestones.length - 1];
            list.push({ label: `${skill?.name || skillId} 숙련 ${mastery}단계 (${target.toLocaleString()})`, met: skillMastery(s, skillId) >= mastery, value: skillMastery(s, skillId), target: mastery });
        }
        // v3.62 숨은 전직: 플레이 기록 조건(서버 전용 secret/unlocks.ts)을 만족해야 합니다(한 번 들어간 직업은 제외).
        const unlock = unlockFor(s, j.id);
        if (unlock !== null) list.push({ label: UNLOCK_LABEL, met: unlock });
    }
    return list;
}
/** 전직 가능 여부. 숙달한 직업은 모든 조건을 무시합니다. v3.69 옛 수련(retired)은 전직할 수 없습니다. */
export function canChangeJob(s: State, id: string) { const j = jobById(id); return !!j && !j.retired && (jobMastered(s, j) || jobRequirements(s, j).every(x => x.met)); }
/** v27.86 절제: 액티브·패시브를 각각 몇 개까지 장착할 수 있는지 넘었는지. */
export function overRestraint(s: State, ids: string[]) {
    const cap = restraintSlots(s);
    if (cap === null) return false;
    const active = ids.filter(id => skillById(id)?.type === 'active').length;
    return active > cap || ids.length - active > cap;
}
/** v3.18 해커는 해커 계열 스킬(신원 조작·방화벽)만 장착합니다. */
const hackerLoadoutOk = (s: State, ids: string[]) => !isHackerJob(s.job) || ids.every(id => isHackerJob(skillById(id)?.job || ''));
export function validLoadout(s: State, ids: string[]) { return ids.length === new Set(ids).size && ids.every(id => canUse(s, id)) && hackerLoadoutOk(s, ids) && !overRestraint(s, ids) && apUsed(s, ids) <= apCapacity(s); }
export function trimLoadout(s: State) {
    s.skills = [...new Set(s.skills)].filter(id => canUse(s, id));
    // v3.86 AP가 모자라면 스킬보다 추가 판정을 먼저 끕니다.
    while (extraRollLevel(s) > 0 && !validLoadout(s, s.skills)) s.extraRolls = extraRollLevel(s) - 1;
    // v27.86 절제: 액티브·패시브를 앞에서부터 상한 개수만 남깁니다.
    const cap = restraintSlots(s);
    if (cap !== null) { let a = 0, p = 0; s.skills = s.skills.filter(id => skillById(id)?.type === 'active' ? ++a <= cap : ++p <= cap); }
    // Evaluate the entire set so an AP-granting skill works in any priority position.
    while (s.skills.length && !validLoadout(s, s.skills)) {
        const index = s.skills.findLastIndex(id => {
            const sk = skillById(id)!;
            return (effectiveSkill(sk, s.learned[id], skillMastery(s, id)).cost ?? 2) > 0;
        });
        s.skills.splice(index < 0 ? s.skills.length - 1 : index, 1);
    }
}
export function completedStages(s: State) { return BASE_STAGES.filter(st => st.monsters.every(id => (s.book[id] || 0) >= PROGRESSION.monsterComplete)); }
/** v27.80 연구 r단계(0부터)를 넘었는지: 처치 수와, 5단계부터는 그 몬스터를 잡은 최고 난이도 조건. */
export const bookRankMet = (s: Pick<State, 'book' | 'bookTier'>, id: string, r: number) => r < BALANCE.bookMilestones.length && (s.book[id] || 0) >= BALANCE.bookMilestones[r] && (s.bookTier?.[id] || 0) >= (BALANCE.bookTierReq[r] || 0);
/** 연구 r단계의 난이도 조건(없으면 0). */
export const bookTierReq = (r: number) => BALANCE.bookTierReq[r] || 0;
export function bookReward(s: State, id: string) { const rank = s.bookClaims?.[id] || 0; return { rank, required: BALANCE.bookMilestones[rank], tier: bookTierReq(rank), sp: PROGRESSION.bookSP[rank] || 0, ready: bookPending(s, id).ranks.length > 0 }; }
/**
 * 받을 연구 보상: 이미 넘은 단계 중 아직 받지 않은 것. v27.81 보상은 SP뿐이라 SP가 있는 단계만 ranks에 넣고,
 * 받을 때는 넘은 단계 전부(upTo)까지 수령 처리합니다.
 */
export function bookPending(s: State, id: string) {
    const claimed = s.bookClaims?.[id] || 0, met: number[] = [];
    for (let r = claimed; bookRankMet(s, id, r); r++) met.push(r);
    const ranks = met.filter(r => (PROGRESSION.bookSP[r] || 0) > 0);
    return { ranks, upTo: met.length ? met[met.length - 1] + 1 : claimed, sp: ranks.reduce((a, r) => a + (PROGRESSION.bookSP[r] || 0), 0) };
}
export function itemKey(slot: string, rarity: number) { return `${slot}:${rarity}`; }
