'use client';
/** v3.397 전직 화면 공용 조각: 목표 깃발 · 상태 표 · 계보 카드 · 직업(항로) 카드 · 열 제목. 판정은 components/game/jobs/job-status.ts 그대로. */
import { Fragment, type ReactNode } from 'react';
import { ArrowDown, Compass, Flag } from 'lucide-react';
import type { State } from '@/game/types';
import { JOBS, type Job, type Lineage } from '@/game/data/classes';
import { JobArt } from '@/components/game/art';
import { statusReader, crossParent, lineageSummary, tierLabel, jobRevealed, treeName, jobGoalOf } from '@/components/game/jobs/job-status';
import { cn } from '@/lib/utils';

export const GoalFlag = () => <Flag className="ml-1 inline text-gold-ink" size={13} aria-label="목표 직업"/>;
export const ColumnTitle = ({ no, children, className }: { no: string; children: ReactNode; className?: string }) => <h2 className={cn('flex items-center gap-2 font-display text-m font-bold', className)}><span className="grid size-6 place-items-center rounded-full bg-accent text-xs text-accent-ink">{no}</span>{children}</h2>;
/** 상태별 글자색. */
export const STATUS_CLS: Record<string, string> = { current: 'text-accent', mastered: 'text-gold-ink', ready: 'text-ok', near: 'text-warn', locked: 'text-ink-3', secret: 'text-ink-3' };
const tierRange = (tiers: number[]) => { const lo = Math.max(1, tiers[0]), hi = tiers.at(-1)!; return hi <= 0 ? '시작' : lo === hi ? `${hi}차` : `${lo}~${hi}차`; };

/** ① 계보 카드(세로 목록). 계보명 · 차수 점(해금한 차수 채움) · 상태 한 줄. 목표 직업이 든 계보에는 깃발. */
export function LineageCard({ s, lineage, accent, selected, onOpen }: { s: State; lineage: Lineage; accent: string; selected: boolean; onOpen: () => void }) {
    const read = statusReader(s), sum = lineageSummary(s, lineage.id, read);
    const independent = lineage.id.endsWith('-independent');
    const near = sum.jobs.filter(j => read(j).status === 'near').length, goal = jobGoalOf(s), hasGoal = !!goal && sum.jobs.some(j => j.id === goal.id);
    const status = sum.current ? '현재 직업이 있는 계보' : sum.ready ? `전직 가능 ${sum.ready}` : near ? `거의 다 됨 ${near}` : `전직해 본 ${sum.unlocked} / ${sum.total}`;
    return <button type="button" className={cn('grid w-full gap-1 rounded-m border p-2.5 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-accent/50', selected ? 'border-accent/70 bg-accent-soft' : 'border-line bg-surface-1 hover:bg-surface-3/60')} style={{ borderLeftColor: accent, borderLeftWidth: 3 }} aria-pressed={selected} onClick={onOpen}>
        <strong className="flex items-center gap-2 text-s">{sum.jobs[0] && <JobArt job={sum.jobs[0]} size={28}/>}<span className="truncate">{lineage.name}</span>{hasGoal && <GoalFlag/>}{sum.current && <span className="ml-auto rounded-s bg-accent px-1.5 text-xs text-accent-ink">현재</span>}</strong>
        {independent ? <small className="text-xs text-ink-3">{lineage.summary}</small> : <span className="flex items-center gap-1" aria-label="해금한 차수">{sum.tiers.filter(t => t.tier > 0).map(t => <i key={t.tier} className={cn('size-1.5 rounded-full', t.reached ? 'bg-accent' : 'bg-line-strong')}/>)}<em className="ml-1 text-xs not-italic text-ink-3">{tierRange(sum.tiers.map(t => t.tier))}</em></span>}
        <small className={cn('text-xs', sum.ready ? 'text-ok' : 'text-ink-3')}>{status}{!sum.current && (sum.ready || near) ? ` · 전직해 본 ${sum.unlocked} / ${sum.total}` : ''}</small>
    </button>;
}

/** 항로도 카드 한 줄 설명: 현재 · 숙달 · 해금함 · 전직 가능 · 조건 부족(첫 부족 조건). 미발견 실루엣은 힌트만 보여줍니다. */
export function routeNote(s: State, j: Job) {
    if (!jobRevealed(s, j)) return { text: j.hint || '아직 드러나지 않은 직업입니다.', cls: 'secret' };
    const st = statusReader(s)(j);
    if (st.status === 'current') return { text: '현재 직업', cls: 'current' };
    if (st.status === 'mastered') return { text: '숙달 · 조건 없이 전직', cls: 'mastered' };
    if (st.status === 'ready') return { text: s.unlockedJobs.includes(j.id) ? '전직한 적 있음 · 전직 가능' : '전직 가능', cls: 'ready' };
    const first = st.missing[0]?.label || '';
    return { text: `${st.status === 'near' ? '거의 다 됨' : '조건 부족'} · ${first}${st.missing.length > 1 ? ` 외 ${st.missing.length - 1}` : ''}`, cls: st.status };
}
export function JobCard({ s, j, selected, from, onSelect }: { s: State; j: Job; selected: boolean; from?: string; onSelect: (id: string) => void }) {
    const note = routeNote(s, j), goal = jobGoalOf(s)?.id === j.id, secret = note.cls === 'secret';
    return <button type="button" className={cn('grid min-w-0 gap-0.5 rounded-m border p-2.5 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-accent/50', selected ? 'border-accent/70 bg-accent-soft' : 'border-line bg-surface-1 hover:bg-surface-3/60', note.cls === 'current' && 'border-accent/50', goal && 'border-gold-ink/60', secret && 'opacity-80')} aria-pressed={selected} onClick={() => onSelect(j.id)}>
        <strong className="flex items-center gap-1.5 text-s"><span className="font-num text-xs text-ink-3">{tierLabel(j.tier)}</span>{!secret && <JobArt job={j} size={22}/>}<span className="truncate">{secret ? '???' : j.name}</span>{goal && <GoalFlag/>}</strong>
        <small className={cn('text-xs', STATUS_CLS[note.cls] || 'text-ink-3')}>{note.text}</small>
        {from && <small className="text-xs text-ink-3">{from}</small>}
    </button>;
}

/** ② 항로도: 계보의 직업을 차수(01~05) 순서로 위에서 아래로 잇습니다. 같은 차수에 여러 직업이면 나란히 둡니다. */
export function RouteMap({ s, lineage, jobs, selectedId, onSelect }: { s: State; lineage: Lineage; jobs: Job[]; selectedId?: string; onSelect: (id: string) => void }) {
    const tiers = [...new Set(jobs.map(j => j.tier))].sort((a, b) => a - b);
    return <section className="grid content-start gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1" aria-label={`${lineage.name} 항로도`}>
        <ColumnTitle no="②">항로도 · {lineage.name}</ColumnTitle>
        <p className="text-xs leading-relaxed text-ink-2">{lineage.summary}</p>
        {jobs.length ? <div className="grid justify-items-center gap-1">{tiers.map((tier, i) => {
            const group = jobs.filter(j => j.tier === tier), prev = jobs.filter(j => j.tier === tiers[i - 1]);
            return <Fragment key={tier}>
                {i > 0 && <ArrowDown className="text-ink-3" size={16} aria-hidden/>}
                <div className={cn('grid w-full gap-2', group.length > 1 && 'sm:grid-cols-2')}>{group.map(j => {
                    const revealed = jobRevealed(s, j), from = revealed ? crossParent(j) : '', parent = revealed && prev.length > 1 && JOBS.find(p => p.id === j.parent && prev.includes(p));
                    return <JobCard key={j.id} s={s} j={j} selected={j.id === selectedId} from={from || (parent ? `↳ ${parent.name}에서` : undefined)} onSelect={onSelect}/>;
                })}</div>
            </Fragment>;
        })}</div> : <div className="grid justify-items-center gap-2 py-6 text-ink-3"><Compass size={28}/><p className="text-s">이 계보에는 아직 직업이 없습니다.</p></div>}
    </section>;
}
/** 빠른 찾기·검색 결과: 계열과 상관없이 모은 직업 카드 목록(② 칸 자리). */
export function JobList({ s, title, jobs, selectedId, onSelect, onClear }: { s: State; title: string; jobs: Job[]; selectedId?: string; onSelect: (id: string) => void; onClear: () => void }) {
    return <section className="grid content-start gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1" aria-label={title}>
        <div className="flex flex-wrap items-center justify-between gap-2"><ColumnTitle no="②">{title} · {jobs.length}</ColumnTitle><button type="button" className="min-h-9 text-xs text-accent underline-offset-2 hover:underline" onClick={onClear}>항로도로 돌아가기</button></div>
        {jobs.length ? <div className="grid gap-2 sm:grid-cols-2">{jobs.map(j => <JobCard key={j.id} s={s} j={j} selected={j.id === selectedId} from={`${treeName(j.tree)}${jobRevealed(s, j) ? ` · ${j.role}` : ''}`} onSelect={onSelect}/>)}</div> : <p className="text-xs text-ink-3">해당하는 직업이 없습니다.</p>}
    </section>;
}
