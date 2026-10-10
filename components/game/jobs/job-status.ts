/** 직업 화면 공용 계산. 게임 판정(progression)을 그대로 쓰고, 화면용 상태 이름만 붙입니다. */
import type { State } from '@/game/types';
import { JOBS, JOB_TREES, LINEAGES, lineageOf, jobTags, worldOf, type Job, type JobTreeId, type WorldId, jobById } from '@/game/data/classes';
import { catalogRevealed } from '@/game/data/catalog';
import { jobRequirements, jobMastered, jobCombatMultiplier, jobFlatBonus } from '@/game/systems/progression';
import { secretJob } from '@/game/systems/reveal';
import { MONOSTAT_LINEAGES } from '@/game/data/expansion-monostat';
import { isHackerJob } from '@/game/data/hacker';
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
export type StatusReader = (j: Job) => ReturnType<typeof jobStatus>;
const readers = new WeakMap<State, StatusReader>();
/** v3.93 화면용 직업 상태: 같은 상태 객체(동기화마다 새로 옴)에서는 직업마다 한 번만 계산합니다. 상태를 고쳐 쓰는 곳(서버 · 시험)은 jobStatus를 쓰세요. */
export function statusReader(s: State): StatusReader {
    let read = readers.get(s);
    if (!read) {
        const cache = new Map<string, ReturnType<typeof jobStatus>>();
        read = j => { let v = cache.get(j.id); if (!v) cache.set(j.id, v = jobStatus(s, j)); return v; };
        readers.set(s, read);
    }
    return read;
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
export function lineageSummary(s: State, lineageId: string, status: StatusReader = j => jobStatus(s, j)) {
    const jobs = shownLineageJobs(s, lineageId);
    const unlocked = jobs.filter(j => s.unlockedJobs.includes(j.id)).length;
    const ready = jobs.filter(j => { const st = status(j).status; return st === 'ready' || st === 'mastered'; }).length;
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

/**
 * 실루엣 공개. v3.44 판정(관문 조건)은 비밀이라 서버가 하고(game/systems/reveal.ts), 화면은 카탈로그의 공개 목록만 봅니다.
 * 들어간 적 있는 직업은 카탈로그를 받기 전에도 드러난 것으로 봅니다.
 */
export function jobRevealed(s: State, j: Job) {
    // v3.69 옛 수련(retired)은 화면에 보이지 않습니다.
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

/**
 * v3.166 외길 탭: 능력치 하나만으로 전직하는 외길 계보(expansion-monostat)는 원래 계열 탭에서 빼고 ??? 옆 ‘외길’ 탭에 모읍니다.
 * 직업의 tree(전투 · 숙련 집중 계열)는 그대로라 숙련 진행판 · 계열 집중 서약에는 영향이 없고, 전직 화면의 묶음만 다릅니다.
 */
export type JobTabId = JobTreeId | 'monostat';
export const MONOSTAT_TAB = { id: 'monostat' as const, name: '외길', subtitle: '능력치 하나', description: '능력치 하나만 키워 전직하는 외길 계보의 모음입니다. 그 능력치 자체가 피해가 되고, 계열은 원래 계열(물리 · 마법 · 방어 · 상태이상 · 보조)을 따릅니다.', accent: '#d6a3c4' };
export const JOB_TABS: { id: JobTabId; name: string; subtitle: string; description: string; accent: string }[] = [...JOB_TREES, MONOSTAT_TAB];
const monostatIds = new Set(MONOSTAT_LINEAGES.map(l => l.id));
export const monostatLineage = (lineageId: string) => monostatIds.has(lineageId);
/** v3.168 직업이 든 계보의 계열. 계보가 직업과 다른 탭에 있을 수 있습니다(초보자 계보는 ??? 탭, 직업 tree는 복합). */
export const lineageTreeOf = (j: Job) => LINEAGES.find(l => l.id === lineageOf(j))?.tree ?? j.tree;
/** v3.220 직업 · 계보의 세계(책의 장). 계열 탭은 메이플 월드 안의 구분이고, 아제로스 계보는 계열 탭에 들어가지 않습니다. */
export const jobWorld = (j: Job): WorldId => worldOf(LINEAGES.find(l => l.id === lineageOf(j)));
const lineageWorld = (l: { id: string }) => worldOf(LINEAGES.find(x => x.id === l.id));
/** 이 세계에서 보이는 계보(드러난 직업이 있는 것만). */
export const worldLineages = (s: State, world: WorldId) => LINEAGES.filter(l => worldOf(l) === world && shownLineageJobs(s, l.id).length > 0);
/** 이 세계에서 보이는 직업 수. */
export const worldJobCount = (s: State, world: WorldId) => shownJobs(s).filter(j => jobWorld(j) === world).length;
/** 계보가 이 탭에 들어가는지: ??? 탭은 드러난 히든 직업 기준, 외길 탭은 외길 계보, 나머지는 자기 계열(외길 제외)에서 보이는 직업이 있을 때. */
export function lineageInTab(s: State, tab: JobTabId, l: { id: string; tree: string }) {
    if (lineageWorld(l) !== 'maple') return false;
    if (tab === 'mystery') return inMysteryTab(s, l);
    if (tab === 'monostat') return monostatLineage(l.id) && shownLineageJobs(s, l.id).length > 0;
    return l.tree === tab && !monostatLineage(l.id) && shownLineageJobs(s, l.id).length > 0;
}
/** 탭 칩의 직업 수(보이는 직업만). ??? 탭은 다른 계열에 붙은 드러난 히든 직업도 셉니다. */
export function tabJobCount(s: State, tab: JobTabId) {
    const shown = shownJobs(s).filter(j => jobWorld(j) === 'maple');
    if (tab === 'mystery') return shown.filter(j => lineageTreeOf(j) === 'mystery' || secretJob(j)).length;
    if (tab === 'monostat') return shown.filter(j => monostatLineage(lineageOf(j))).length;
    return shown.filter(j => lineageTreeOf(j) === tab && !monostatLineage(lineageOf(j))).length;
}
/** 직업이 전직 화면에서 들어가는 탭. 외길 계보면 ‘외길’, 그 밖에는 자기 계열. */
export const tabOf = (j: Job): JobTabId => monostatLineage(lineageOf(j)) ? 'monostat' : lineageTreeOf(j);

/**
 * v3.166 직업 수 셈을 한곳에: 전직 화면 머리와 숙련 진행판이 같은 기준으로 셉니다.
 * 세는 직업 = 화면에 보이는 직업(드러난 것 · 옛 수련 제외) 가운데 해커 계열(처치 숙련 없음)을 뺀 것.
 * ‘전직해 본’은 그 직업 중 unlockedJobs에 있는 것만 셉니다. 통폐합으로 지워진 직업 id가 기록에 남아 있어도 세지 않습니다.
 */
export function jobTally(s: State) {
    const jobs = shownJobs(s).filter(j => !isHackerJob(j.id)), unlocked = new Set(s.unlockedJobs || []);
    return { jobs, total: jobs.length, unlocked: jobs.filter(j => unlocked.has(j.id)).length, mastered: jobs.filter(j => jobMastered(s, j)).length };
}
/** v3.166 목표 직업(직업 상세의 ‘목표로 설정’). 지워진 직업 · 옛 수련 · 지금 직업이면 없는 것으로 봅니다. */
export function jobGoalOf(s: State) {
    const j = s.jobGoal ? jobById(s.jobGoal) : undefined;
    return j && !j.retired && j.id !== s.job ? j : undefined;
}

/** 빠른 찾기: 계열과 상관없이 모아 보는 직업 목록. 드러나지 않은 히든 직업은 뺍니다. */
export type Finder = 'starter' | 'ready' | 'mastered' | 'near';
/** v3.240 처음 추천: 1차 직업이 70개가 넘어 첫 생에는 메이플 대표 계보(전사 둘 · 마법사 · 궁수 · 도적 · 해적)부터 보여 줍니다. */
export const STARTER_JOBS = ['ronin', 'warden', 'tide', 'harpoon', 'relicScavenger', 'martialArtist'];
export function finderJobs(s: State, kind: Finder, status: StatusReader = j => jobStatus(s, j)) {
    if (kind === 'starter') return STARTER_JOBS.map(id => jobById(id)).filter((j): j is Job => !!j);
    const visible = shownJobs(s);
    // 숙달: 직업 숙련이 숙달 목표에 닿아 조건 없이 언제든 돌아갈 수 있는 직업(현재 직업 포함).
    if (kind === 'mastered') return JOBS.filter(j => jobMastered(s, j));
    return visible.filter(j => { const st = status(j).status; return kind === 'ready' ? st === 'ready' || st === 'mastered' : st === 'near'; });
}
/** 이름 검색과 태그 필터(드러나지 않은 히든 직업은 제외). */
export function searchJobs(s: State, query: string, tag: string) {
    const q = query.trim();
    return JOBS.filter(j => jobRevealed(s, j) && (!q || j.name.includes(q)) && (!tag || jobTags(j).includes(tag)));
}
/** 태그 칩: 자주 쓰인 태그부터. */
export const TOP_TAGS = Object.entries(JOBS.flatMap(j => jobTags(j)).reduce<Record<string, number>>((a, t) => (a[t] = (a[t] || 0) + 1, a), {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t]) => t);
