import type { State } from '../types';
import { JOBS } from '../data/classes';
import { SKILLS } from '../data/skills';
import { DUNGEONS } from '../data/world';
import { BOSS_RESEARCH, SPECIALIZATIONS } from '../data/specializations';
import { skillPracticeTargets, canUse, jobRequirements, masteryMilestonesFor } from './progression';

export type GoalProgress = { title: string; detail: string; value: number; max: number; done: boolean; view: string; steps?: { label: string; done: boolean }[] };

/** 장기 목표 진행도. 화면 표시와 달성 알림이 같은 계산을 씁니다. */
export function goalProgress(s: State): GoalProgress | null {
    const goal = s.growthGoal;
    if (!goal) return null;
    if (goal.kind === 'skill') {
        const skill = SKILLS.find(x => x.id === goal.id);
        if (!skill) return null;
        const stage = goal.target || 1, base = masteryMilestonesFor(skill), all = skillPracticeTargets(skill), max = all[stage - 1] || all.at(-1)!;
        const value = s.skillPractice[skill.id] || 0, refine = stage > base.length;
        const hint = !s.learned[skill.id] ? ' · 먼저 전용 직업에서 해금하세요.' : !canUse(s, skill.id) ? ' · 현재 사용 조건을 확인하세요.' : !s.skills.includes(skill.id) ? ' · 숙련하려면 장착하세요.' : '';
        return { title: `${skill.name} · ${refine ? '장기 연마' : '실전 숙련'} ${refine ? stage - base.length : stage}단계`, value, max, done: value >= max, view: 'skills',
            detail: `${Math.min(value, max).toLocaleString()} / ${max.toLocaleString()} · ${stage === 1 ? '무료 계승' + (skill.type === 'active' ? '·특화 선택' : '') : refine ? '직접 피해·양수 패시브 +4%' : '스킬 성장·상위 전직 준비'}${hint}` };
    }
    if (goal.kind === 'job') {
        const job = JOBS.find(x => x.id === goal.id);
        if (!job) return null;
        const req = jobRequirements(s, job), done = s.unlockedJobs.includes(job.id);
        return { title: `${job.name} 전직`, value: done ? req.length : req.filter(x => x.met).length, max: Math.max(1, req.length), done, view: 'classes',
            detail: done ? '해금 완료 · 다음 목표를 정해 보세요.' : req.filter(x => !x.met).map(x => x.label).join(' · ') || '조건 충족 · 전직 화면에서 선택하세요.' };
    }
    const dungeon = DUNGEONS.find(x => x.id === goal.id);
    if (!dungeon) return null;
    const r = BOSS_RESEARCH[dungeon.id];
    const steps = [
        { label: `입장 조건 Lv.${dungeon.level}${dungeon.rebirth ? ` · 환생 ${dungeon.rebirth}회` : ''}`, done: s.level >= dungeon.level && s.rebirths >= dungeon.rebirth },
        { label: '첫 정복', done: !!s.clears[dungeon.id] },
        { label: `연구 수령 · SP ${r?.sp || 0}${r?.specialization ? ` · ${SPECIALIZATIONS.find(x => x.id === r.specialization)?.name} 특화` : ''}`, done: !!s.bossResearchClaims?.[dungeon.id] },
    ];
    const value = steps.filter(x => x.done).length, next = steps.find(x => !x.done);
    return { title: `${dungeon.name} 연구`, value, max: steps.length, done: !next, view: 'dungeons', steps, detail: next ? `다음: ${next.label}` : '연구 완료 · 다음 목표를 정해 보세요.' };
}

/** 지금 도전할 수 있는 것 위주의 추천. */
export function goalSuggestions(s: State) {
    const open = (x: { level: number; rebirth?: number }) => s.level >= x.level && s.rebirths >= (x.rebirth || 0);
    const unfinished = (id: string) => { const sk = SKILLS.find(x => x.id === id)!; return (s.skillPractice[id] || 0) < skillPracticeTargets(sk).at(-1)!; };
    const skill = [...s.skills.filter(id => canUse(s, id)), ...SKILLS.filter(x => x.job === s.job && canUse(s, x.id)).map(x => x.id), ...SKILLS.filter(x => canUse(s, x.id)).map(x => x.id)].find(unfinished);
    const job = JOBS.find(x => x.parent === s.job && !s.unlockedJobs.includes(x.id) && open(x)) || JOBS.find(x => x.tier === 1 && !s.unlockedJobs.includes(x.id) && open(x));
    const dungeon = [...DUNGEONS].sort((a, b) => a.level - b.level).find(x => BOSS_RESEARCH[x.id] && !s.bossResearchClaims?.[x.id] && open(x));
    return { skill: skill ? SKILLS.find(x => x.id === skill) : undefined, job, dungeon };
}

/** 목표를 처음 달성하면 한 줄 알림을 남깁니다(한 번만). */
export function syncGoal(s: State, log: (text: string) => void) {
    const goal = s.growthGoal;
    if (!goal || goal.notified) return;
    const p = goalProgress(s);
    if (p?.done) { goal.notified = true; log(`장기 목표 달성 · ${p.title}`); }
}
