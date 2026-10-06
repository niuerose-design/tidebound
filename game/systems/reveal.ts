/**
 * v3.41 비밀 직업 공개 판정(docs/concept.md 10장). 서버가 카탈로그를 만들 때 씁니다.
 * 화면은 이 판정을 직접 하지 않고 카탈로그의 revealed 목록을 봅니다(조건이 비밀이므로).
 */
import type { State } from '../types';
import { JOBS, jobById, type Job } from '../data/classes';
import { doorFor } from '../data/door-info';
import { jobRequirements, jobMastered } from './progression';

/** 실루엣 대상: 히든 직업과 ??? 문 직업. */
export const secretJob = (j: Job) => !!j.hidden || !!doorFor({}, j.id);
/**
 * 실루엣 공개: 들어간 적 있거나 숙달했거나, 그 직업의 문이 지금 열려 있거나, 관문 조건(환생 횟수·선행 직업 숙련·문 열림)을 모두 채우면 이름을 공개합니다.
 * 레벨과 능력치는 보지 않습니다.
 */
export function jobRevealed(s: State, j: Job) {
    if (!secretJob(j) || s.unlockedJobs.includes(j.id) || jobMastered(s, j)) return true;
    // 문이 열려 있으면 다른 관문과 상관없이 정체(이름·조건)를 드러냅니다. 전직은 여전히 모든 조건이 필요합니다.
    if (doorFor(s, j.id)?.open) return true;
    // 관문: 환생 횟수 · 문 · 선행 직업 숙련(상위 직업 또는 requiresJobMastery로 지정한 직업, 예: 시계공 → 시간의 지배자).
    const keys = [j.parent, ...Object.keys(j.requiresJobMastery || {})].map(id => jobById(id)?.name).filter(Boolean) as string[];
    const gates = jobRequirements(s, j).filter(r => r.label.startsWith('환생 ') || r.label.endsWith('문 열림') || keys.some(name => r.label.startsWith(`${name} 숙련`)));
    // 관문이 하나도 없는 히든 직업(예: 玄)은 처음부터 드러납니다.
    return gates.every(r => r.met);
}
/** 이 모험가에게 드러난 비밀 직업 id. */
export const revealedSecretJobs = (s: State) => JOBS.filter(j => secretJob(j) && jobRevealed(s, j)).map(j => j.id);
