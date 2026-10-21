'use client';
/** v3.397 숙련 진행판(새 토대): 모든 직업의 숙달·단련 진행률, 남은 직업 수, 편지 수신인 기록(정보 화면, 승천과 무관하게 모두에게). */
import { useState } from 'react';
import { Mail } from 'lucide-react';
import type { State } from '@/game/types';
import { JOB_TREES, jobById, type Job } from '@/game/data/classes';
import { VOCATION_OFFSETS, vocationTargets, thresholdRank } from '@/game/data/long-term';
import { ascensionMastery, ascensionOf } from '@/game/data/ascension';
import { jobMastered, jobMasteryTarget } from '@/game/systems/progression';
import { jobTally, tierName } from '@/components/game/jobs/job-status';
import { SectionHeader, ChoiceChips, FoldSection, StatBar, formatExact } from '@/components/ui/game';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'todo' | 'done';
const FILTERS: { value: Filter; label: string }[] = [{ value: 'all', label: '전체' }, { value: 'todo', label: '숙달 전' }, { value: 'done', label: '숙달' }];
const fmt = formatExact;

/** 한 직업의 진행: 숙달 전이면 숙달 목표까지, 숙달 뒤면 다음 단련 단계까지. */
function progressOf(s: State, j: Job) {
    const have = s.jobMastery?.[j.id] || 0, target = jobMasteryTarget(j), steps = vocationTargets(target), rank = thresholdRank(have, steps);
    if (have < target) return { have, max: target, rank, label: `숙달까지 ${fmt(have)} / ${fmt(target)}` };
    const next = steps[rank];
    return { have, max: next ?? steps.at(-1)!, rank, label: next ? `단련 ${rank} / ${VOCATION_OFFSETS.length} · 다음 ${fmt(have)} / ${fmt(next)}` : `단련 ${rank} / ${VOCATION_OFFSETS.length} · 끝까지 단련` };
}
const Tile = ({ label, children, sub }: { label: string; children: React.ReactNode; sub?: React.ReactNode }) => <div className="grid gap-1 rounded-l border border-line bg-surface-2 p-3 shadow-1"><small className="text-xs text-ink-3">{label}</small><strong className="font-num text-l font-semibold">{children}</strong>{sub}</div>;

export function MasteryScreen({ s, setView }: { s: State; setView: (v: string) => void }) {
    const [filter, setFilter] = useState<Filter>('todo');
    const unlocked = new Set(s.unlockedJobs || []);
    // v3.63 드러나지 않은 히든 직업은 진행판에도 나오지 않습니다. v3.166 세는 기준은 전직 화면 머리와 같습니다(jobTally).
    const tally = jobTally(s), board = tally.jobs;
    const vocation = board.reduce((a, j) => a + thresholdRank(s.jobMastery?.[j.id] || 0, vocationTargets(jobMasteryTarget(j))), 0);
    const shown = (j: Job) => filter === 'all' || (filter === 'done') === jobMastered(s, j);
    return <div className="grid gap-5 text-ink-1">
        <SectionHeader as="h1" eyebrow="MASTERY BOARD" title="숙련 진행판" description="모든 직업을 숙련하는 것이 이 모험의 긴 목표입니다. 숙련은 승천해도 남습니다(연마 단계만 초기화)."/>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile label="숙달한 직업" sub={<StatBar size="s" tone="exp" value={tally.mastered} max={tally.total} showText={false}/>}>{tally.mastered}<span className="text-xs text-ink-3"> / {tally.total}</span></Tile>
            <Tile label="남은 직업" sub={<p className="text-xs text-ink-3">전직해 본 직업 {tally.unlocked} / {tally.total} · 아직 못 연 직업 {tally.total - tally.unlocked}개</p>}>{tally.total - tally.mastered}<span className="text-xs text-ink-3">개</span></Tile>
            <Tile label="단련 단계 합" sub={<p className="text-xs text-ink-3">숙달한 직업마다 단련 {VOCATION_OFFSETS.length}단계</p>}>{vocation}<span className="text-xs text-ink-3"> / {board.length * VOCATION_OFFSETS.length}</span></Tile>
            <Tile label="숙련 배율 (승천)" sub={<p className="text-xs text-ink-3">{ascensionOf(s) ? `승천 ${ascensionOf(s)}회 · 까미 당첨분 포함` : '승천하면 1회마다 +100%'}</p>}>×{ascensionMastery(s)}</Tile>
        </div>
        {(s.letterLog?.length || 0) > 0 && <FoldSection title={<span className="inline-flex items-center gap-1.5"><Mail size={15}/> 편지 수신인 기록</span>} summary={`${s.letterLog!.length}통`}><ul className="grid gap-1 sm:grid-cols-2">{s.letterLog!.map((l, i) => <li key={i} className="flex justify-between gap-2 rounded-s bg-surface-1 px-2 py-1 text-xs"><span>{jobById(l.job)?.name || l.job}</span><b className="font-num">숙련 +{fmt(l.gift)}</b></li>)}</ul></FoldSection>}
        <ChoiceChips label="보기" value={filter} onChange={v => setFilter(v as Filter)} options={FILTERS}/>
        {JOB_TREES.map(tree => {
            const jobs = board.filter(j => j.tree === tree.id), done = jobs.filter(j => jobMastered(s, j)).length;
            // 현재 직업 → 해금한 직업(숙련 많은 순) → 잠긴 직업 순으로 보여 줍니다.
            const order = (j: Job) => j.id === s.job ? 0 : unlocked.has(j.id) ? 1 : 2, rows = jobs.filter(shown).sort((x, y) => order(x) - order(y) || (s.jobMastery?.[y.id] || 0) - (s.jobMastery?.[x.id] || 0));
            return <FoldSection key={tree.id} title={<span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: tree.accent }}/>{tree.name}</span>} summary={`숙달 ${done} / ${jobs.length}`} defaultOpen={tree.id === jobById(s.job)?.tree} extra={<StatBar size="s" tone="exp" value={done} max={jobs.length} showText={false}/>}>
                {rows.length ? <ul className="grid gap-2 sm:grid-cols-2">{rows.map(j => {
                    const p = progressOf(s, j), state = j.id === s.job ? '현재' : jobMastered(s, j) ? '숙달' : unlocked.has(j.id) ? '해금' : '잠김';
                    return <li key={j.id} className={cn('grid gap-1.5 rounded-m border p-2.5', state === '현재' ? 'border-accent/60 bg-accent-soft' : state === '숙달' ? 'border-gold-ink/40 bg-surface-1' : 'border-line bg-surface-1', state === '잠김' && 'opacity-70')}>
                        <button type="button" className="grid min-h-9 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-accent/50" onClick={() => setView('classes')} title="직업 화면에서 보기"><b className="text-s">{j.name}</b><small className="text-xs text-ink-3">{tierName(j)} · {state}</small></button>
                        {p.have > 0 || unlocked.has(j.id) ? <StatBar size="s" tone={state === '숙달' ? 'exp' : 'accent'} value={p.have} max={p.max} label={p.label} showText={false}/> : <small className="text-xs text-ink-3">아직 숙련 없음</small>}
                    </li>;
                })}</ul> : <p className="text-xs text-ink-3">{filter === 'done' ? '아직 숙달한 직업이 없습니다.' : '이 계열은 모두 숙달했습니다.'}</p>}
            </FoldSection>;
        })}
    </div>;
}
