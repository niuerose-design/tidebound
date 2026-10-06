/** 직업 화면 공용 계산. 게임 판정(progression)을 그대로 쓰고, 화면용 상태 이름만 붙입니다. */
import type { State } from '@/game/types';
import { JOBS, JOB_TREES, lineageOf, jobTags, type Job, jobById } from '@/game/data/classes';
import { unlockFor } from '@/game/data/unlock-info';
import { catalogRevealed } from '@/game/data/catalog';
import { jobRequirements, jobMastered, jobCombatMultiplier, jobFlatBonus } from '@/game/systems/progression';
import { percent } from '@/game/data/progression';

export type JobStatus = 'current' | 'mastered' | 'ready' | 'near' | 'locked';
/** 화면의 기준 시각. 클라이언트 시계 대신 마지막 서버 시각(lastTick)을 씁니다. */
export const serverNow = (s: State) => s.lastTick;

/** 직업 상태: 현재 → 숙달(조건 무시) → 전직 가능 → 거의 다 됨(부족 1~2개) → 조건 부족 N. */
export function jobStatus(s: State, j: Job) {
    const req = jobRequirements(s, j), missing = req.filter(r => !r.met);
    const status: JobStatus = j.id === s.job ? 'current' : jobMastered(s, j) ? 'mastered' : !missing.length ? 'ready' : missing.length <= 2 ? 'near' : 'locked';
    return { status, req, missing };
}
export const STATUS_LABEL = (st: ReturnType<typeof jobStatus>) => st.status === 'current' ? '현재' : st.status === 'mastered' ? '숙달' : st.status === 'ready' ? '전직 가능' : st.status === 'near' ? '거의 다 됨' : `조건 부족 ${st.missing.length}`;
export const canEnter = (st: ReturnType<typeof jobStatus>) => st.status === 'mastered' || st.status === 'ready';

export const treeName = (id: string) => JOB_TREES.find(t => t.id === id)?.name || id;
/** 계보별 직업 목록(직업 데이터는 고정이라 한 번만 묶어 둡니다). */
let lineageIndex: Map<string, Job[]> | undefined;
export const lineageJobs = (lineageId: string) => {
    if (!lineageIndex) { lineageIndex = new Map(); for (const j of JOBS) { const id = lineageOf(j); lineageIndex.set(id, [...(lineageIndex.get(id) || []), j]); } }
    return lineageIndex.get(lineageId) || [];
};

/** 다른 계보(다른 계열 포함)에서 이어지는 직업이면 부모 표시: ↩ 부모명(계열). */
export function crossParent(j: Job) {
    const parent = j.parent ? jobById(j.parent) : undefined;
    return parent && lineageOf(parent) !== lineageOf(j) ? `↩ ${parent.name}(${treeName(parent.tree)})` : '';
}
/** 계보 요약: 해금 n / m · 전직 가능 k, 차수 점. */
export function lineageSummary(s: State, lineageId: string) {
    const jobs = shownLineageJobs(s, lineageId);
    const unlocked = jobs.filter(j => s.unlockedJobs.includes(j.id)).length;
    const ready = jobs.filter(j => { const st = jobStatus(s, j).status; return st === 'ready' || st === 'mastered'; }).length;
    const tiers = [...new Set(jobs.map(j => j.tier))].sort((a, b) => a - b).map(tier => ({ tier, reached: jobs.some(j => j.tier === tier && s.unlockedJobs.includes(j.id)) }));
    return { jobs, unlocked, total: jobs.length, ready, tiers, current: jobs.some(j => j.id === s.job) };
}
export const tierLabel = (tier: number) => tier ? `0${tier}` : '시작';
export const tierName = (j: Job) => j.tier ? `${j.tier}차` : '시작';
/** 직업 보정 능력치(숙달하면 강화). */
export const JOB_BONUS_KEYS = ['attack', 'magic', 'hp', 'defense', 'resist'] as const;
export type JobBonusKey = typeof JOB_BONUS_KEYS[number];
/** 이 능력치에 직업 보정이 있는지(고정 수치·배율 어느 쪽이든). */
export const hasJobBonus = (j: Job, key: JobBonusKey) => j[key] !== 1 || !!j.bonus?.[key];
/** 숙달로 강화되는 플러스 보정이 있는지. */
export const growsWithMastery = (j: Job, key: JobBonusKey) => j[key] > 1 || !!j.bonus?.[key];
/**
 * 직업 보정 표시: 1~3차 플러스는 고정 수치(+N), 마이너스와 4·5차는 배율(%).
 * 한 능력치에 고정 보정과 마이너스 배율이 함께 있으면 둘 다 보여 줍니다.
 */
export function jobBonusText(j: Job, key: JobBonusKey, mastered = false) {
    const parts: string[] = [];
    const flat = jobFlatBonus(j, key, mastered);
    if (flat > 0) parts.push(`+${Math.round(flat).toLocaleString('ko-KR')}`);
    if (j[key] !== 1) parts.push(percent(jobCombatMultiplier(j, j[key], mastered) - 1, 2, true));
    return parts.join(' · ') || '—';
}

/** 실루엣 대상: 히든 직업과 숨은 조건이 있는 직업(목록은 서버 카탈로그). */
export const secretJob = (j: Job) => !!j.hidden || unlockFor({}, j.id) !== null;
/**
 * 실루엣 공개. v3.44 판정(관문 조건)은 비밀이라 서버가 하고(game/systems/reveal.ts), 화면은 카탈로그의 공개 목록만 봅니다.
 * 들어간 적 있는 직업은 카탈로그를 받기 전에도 드러난 것으로 봅니다.
 */
export function jobRevealed(s: State, j: Job) {
    // v3.66 옛 수련(retired)은 화면에 보이지 않습니다.
    if (j.retired) return false;
    return !secretJob(j) || s.unlockedJobs.includes(j.id) || catalogRevealed(j.id);
}
/** v3.63 히든 직업은 드러나기 전에는 어디에도 보이지 않습니다(실루엣 없음). 화면에 보이는 직업과 계보별로 보이는 직업. */
export const shownJobs = (s: State) => JOBS.filter(j => jobRevealed(s, j));
export const shownLineageJobs = (s: State, lineageId: string) => lineageJobs(lineageId).filter(j => jobRevealed(s, j));
/** v3.63 ??? 탭: ??? 계열 계보와, 드러난 히든 직업이 있는 다른 계열의 계보(예: 시공의 위자드가 드러나면 그 계보). */
export const inMysteryTab = (s: State, l: { id: string; tree: string }) => {
    const jobs = shownLineageJobs(s, l.id);
    return l.tree === 'mystery' ? jobs.length > 0 : jobs.some(secretJob);
};

/** 빠른 찾기: 계열과 상관없이 모아 보는 직업 목록. 드러나지 않은 히든 직업은 뺍니다. */
export type Finder = 'ready' | 'mastered' | 'near';
export function finderJobs(s: State, kind: Finder) {
    const visible = shownJobs(s);
    // 숙달: 직업 숙련이 숙달 목표에 닿아 조건 없이 언제든 돌아갈 수 있는 직업(현재 직업 포함).
    if (kind === 'mastered') return JOBS.filter(j => jobMastered(s, j));
    return visible.filter(j => { const st = jobStatus(s, j).status; return kind === 'ready' ? st === 'ready' || st === 'mastered' : st === 'near'; });
}
/** 이름 검색과 태그 필터(드러나지 않은 히든 직업은 제외). */
export function searchJobs(s: State, query: string, tag: string) {
    const q = query.trim();
    return JOBS.filter(j => jobRevealed(s, j) && (!q || j.name.includes(q)) && (!tag || jobTags(j).includes(tag)));
}
/** 태그 칩: 자주 쓰인 태그부터. */
export const TOP_TAGS = Object.entries(JOBS.flatMap(j => jobTags(j)).reduce<Record<string, number>>((a, t) => (a[t] = (a[t] || 0) + 1, a), {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t]) => t);
