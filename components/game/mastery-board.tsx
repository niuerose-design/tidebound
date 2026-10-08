'use client';
import { useState } from 'react';
import { ChevronDown, Mail } from 'lucide-react';
import type { State } from '@/game/types';
import { JOB_TREES, jobById, type Job } from '@/game/data/classes';
import { VOCATION_OFFSETS, vocationTargets, thresholdRank } from '@/game/data/long-term';
import { ascensionMastery, ascensionOf } from '@/game/data/ascension';
import { jobMastered, jobMasteryTarget } from '@/game/systems/progression';
import { jobTally, tierName } from './jobs/job-status';
import { Heading, Meter, format } from './shared';

type Filter = 'all' | 'todo' | 'done';
const FILTERS: [Filter, string][] = [['all', '전체'], ['todo', '숙달 전'], ['done', '숙달']];

/** 한 직업의 진행: 숙달 전이면 숙달 목표까지, 숙달 뒤면 다음 단련 단계까지. */
function progressOf(s: State, j: Job) {
    const have = s.jobMastery?.[j.id] || 0, target = jobMasteryTarget(j), steps = vocationTargets(target), rank = thresholdRank(have, steps);
    if (have < target) return { have, max: target, rank, label: `숙달까지 ${format(have)} / ${format(target)}` };
    const next = steps[rank];
    return { have, max: next ?? steps.at(-1)!, rank, label: next ? `단련 ${rank} / ${VOCATION_OFFSETS.length} · 다음 ${format(have)} / ${format(next)}` : `단련 ${rank} / ${VOCATION_OFFSETS.length} · 끝까지 단련` };
}

/**
 * v3.40 숙련 진행판: 모든 직업의 숙달·단련 진행률, 남은 직업 수, 편지 수신인 기록을 한 화면에 모읍니다(정보 화면, 승천과 무관하게 모두에게).
 * 이 게임의 장기 목표(모든 직업 숙련)를 눈에 보이게 합니다.
 */
export function MasteryBoard({ s, setView }: { s: State; setView: (v: string) => void }) {
    const [filter, setFilter] = useState<Filter>('todo');
    const unlocked = new Set(s.unlockedJobs || []);
    // v3.63 드러나지 않은 히든 직업은 진행판에도 나오지 않습니다(개수에도 넣지 않음). 해커 계열은 처치 숙련이 없어 뺍니다.
    // v3.164 세는 기준은 전직 화면 머리와 같습니다(jobs/job-status.ts jobTally).
    const tally = jobTally(s), board = tally.jobs;
    const vocation = board.reduce((a, j) => a + thresholdRank(s.jobMastery?.[j.id] || 0, vocationTargets(jobMasteryTarget(j))), 0);
    const shown = (j: Job) => filter === 'all' || (filter === 'done') === jobMastered(s, j);
    return <>
        <Heading eyebrow="MASTERY BOARD" title="숙련 진행판" description="모든 직업을 숙련하는 것이 이 모험의 긴 목표입니다. 숙련은 승천해도 남습니다(연마 단계만 초기화)."/>
        <section className="panel mastery-summary">
            <div><small>숙달한 직업</small><strong>{tally.mastered}<span> / {tally.total}</span></strong><Meter value={tally.mastered} max={tally.total}/></div>
            <div><small>남은 직업</small><strong>{tally.total - tally.mastered}<span>개</span></strong><p>전직해 본 직업 {tally.unlocked} / {tally.total} · 아직 못 연 직업 {tally.total - tally.unlocked}개</p></div>
            <div><small>단련 단계 합</small><strong>{vocation}<span> / {board.length * VOCATION_OFFSETS.length}</span></strong><p>숙달한 직업마다 단련 {VOCATION_OFFSETS.length}단계</p></div>
            <div><small>숙련 배율 (승천)</small><strong>×{ascensionMastery(s)}</strong><p>{ascensionOf(s) ? `승천 ${ascensionOf(s)}회 · 까미 당첨분 포함` : '승천하면 1회마다 +100%'}</p></div>
        </section>
        {(s.letterLog?.length || 0) > 0 && <section className="panel mastery-letters"><h2><Mail size={15}/> 편지 수신인 기록</h2><ul>{s.letterLog!.map((l, i) => <li key={i}><span>{jobById(l.job)?.name || l.job}</span><b>숙련 +{format(l.gift)}</b></li>)}</ul></section>}
        <div className="mastery-filter" role="radiogroup" aria-label="보기">{FILTERS.map(([id, label]) => <button key={id} type="button" role="radio" aria-checked={filter === id} className={filter === id ? 'primary small' : 'secondary small'} onClick={() => setFilter(id)}>{label}</button>)}</div>
        {JOB_TREES.map(tree => {
            const jobs = board.filter(j => j.tree === tree.id), done = jobs.filter(j => jobMastered(s, j)).length;
            // 현재 직업 → 해금한 직업(숙련 많은 순) → 잠긴 직업 순으로 보여 줍니다.
            const order = (j: Job) => j.id === s.job ? 0 : unlocked.has(j.id) ? 1 : 2, rows = jobs.filter(shown).sort((x, y) => order(x) - order(y) || (s.jobMastery?.[y.id] || 0) - (s.jobMastery?.[x.id] || 0));
            return <details key={tree.id} className="panel mastery-tree" open={tree.id === jobById(s.job)?.tree}>
                <summary><span className="mastery-tree-dot" style={{ background: tree.accent }}/><h2>{tree.name}</h2><small>숙달 {done} / {jobs.length}</small><Meter value={done} max={jobs.length}/><ChevronDown size={16} className="mastery-chevron"/></summary>
                {rows.length ? <ul className="mastery-rows">{rows.map(j => {
                    const p = progressOf(s, j), state = j.id === s.job ? '현재' : jobMastered(s, j) ? '숙달' : unlocked.has(j.id) ? '해금' : '잠김';
                    return <li key={j.id} className={`mastery-row state-${state === '현재' ? 'current' : state === '숙달' ? 'done' : state === '해금' ? 'open' : 'locked'}`}>
                        <button type="button" className="mastery-name" onClick={() => setView('classes')} title="직업 화면에서 보기"><b>{j.name}</b><small>{tierName(j)} · {state}</small></button>
                        {p.have > 0 || unlocked.has(j.id) ? <div className="mastery-meter"><Meter value={p.have} max={p.max}/><small>{p.label}</small></div> : <small className="mastery-none">아직 숙련 없음</small>}
                    </li>;
                })}</ul> : <p className="mastery-empty">{filter === 'done' ? '아직 숙달한 직업이 없습니다.' : '이 계열은 모두 숙달했습니다.'}</p>}
            </details>;
        })}
    </>;
}
