/** 직업 화면 공용 계산. 게임 판정(progression)을 그대로 쓰고, 화면용 상태 이름만 붙입니다. */
import type { State } from '@/game/types';
import { JOBS, JOB_TREES, LINEAGES, lineageOf, type Job } from '@/game/data/classes';
import { jobRequirements, jobMastered, canChangeJob } from '@/game/systems/progression';

export type JobStatus = 'current' | 'mastered' | 'ready' | 'near' | 'locked';
/** 화면의 기준 시각. 클라이언트 시계 대신 마지막 서버 시각(lastTick)을 씁니다. */
export const serverNow = (s: State) => s.lastTick;

/** 직업 상태: 현재 → 숙달(조건 무시) → 전직 가능 → 거의 다 됨(부족 1~2개) → 조건 부족 N. */
export function jobStatus(s: State, j: Job) {
    const req = jobRequirements(s, j, serverNow(s)), missing = req.filter(r => !r.met);
    const status: JobStatus = j.id === s.job ? 'current' : jobMastered(s, j) ? 'mastered' : canChangeJob(s, j.id, serverNow(s)) ? 'ready' : missing.length <= 2 ? 'near' : 'locked';
    return { status, req, missing };
}
export const STATUS_LABEL = (st: ReturnType<typeof jobStatus>) => st.status === 'current' ? '현재' : st.status === 'mastered' ? '숙달' : st.status === 'ready' ? '전직 가능' : st.status === 'near' ? '거의 다 됨' : `조건 부족 ${st.missing.length}`;
export const canEnter = (st: ReturnType<typeof jobStatus>) => st.status === 'mastered' || st.status === 'ready';

export const treeName = (id: string) => JOB_TREES.find(t => t.id === id)?.name || id;
export const lineageJobs = (lineageId: string) => JOBS.filter(j => lineageOf(j) === lineageId);
export const lineageById = (id: string) => LINEAGES.find(l => l.id === id)!;

/** 다른 계보(다른 계열 포함)에서 이어지는 직업이면 부모 표시: ↩ 부모명(계열). */
export function crossParent(j: Job) {
    const parent = j.parent ? JOBS.find(p => p.id === j.parent) : undefined;
    return parent && lineageOf(parent) !== lineageOf(j) ? `↩ ${parent.name}(${treeName(parent.tree)})` : '';
}
/** 계보 요약: 해금 n / m · 전직 가능 k, 차수 점. */
export function lineageSummary(s: State, lineageId: string) {
    const jobs = lineageJobs(lineageId);
    const unlocked = jobs.filter(j => s.unlockedJobs.includes(j.id)).length;
    const ready = jobs.filter(j => { const st = jobStatus(s, j).status; return st === 'ready' || st === 'mastered'; }).length;
    const tiers = [...new Set(jobs.map(j => j.tier))].sort((a, b) => a - b).map(tier => ({ tier, reached: jobs.some(j => j.tier === tier && s.unlockedJobs.includes(j.id)) }));
    return { jobs, unlocked, total: jobs.length, ready, tiers, current: jobs.some(j => j.id === s.job) };
}
export const tierLabel = (tier: number) => tier ? `0${tier}` : '시작';
