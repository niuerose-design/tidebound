import type { State } from '../types';
import { jobById } from '../data/classes';
import { jobRequirements } from './progression';

export type GoalProgress = { title: string; detail: string; value: number; max: number; done: boolean; view: string };

/** 장기 목표(직업 전직) 진행도. 화면 표시와 달성 알림이 같은 계산을 씁니다. */
export function goalProgress(s: State): GoalProgress | null {
    const goal = s.growthGoal;
    if (goal?.kind !== 'job') return null;
    const job = jobById(goal.id);
    if (!job) return null;
    const req = jobRequirements(s, job), done = s.unlockedJobs.includes(job.id);
    return { title: `${job.name} 전직`, value: done ? req.length : req.filter(x => x.met).length, max: Math.max(1, req.length), done, view: 'classes',
        detail: done ? '해금 완료 · 다음 목표를 정해 보세요.' : req.filter(x => !x.met).map(x => x.label).join(' · ') || '조건 충족 · 전직 화면에서 선택하세요.' };
}

/** 목표를 처음 달성하면 한 줄 알림을 남깁니다(한 번만). */
export function syncGoal(s: State, log: (text: string) => void) {
    const goal = s.growthGoal;
    if (!goal || goal.notified) return;
    const p = goalProgress(s);
    if (p?.done) { goal.notified = true; log(`장기 목표 달성 · ${p.title}`); }
}
