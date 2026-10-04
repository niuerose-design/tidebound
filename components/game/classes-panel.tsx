'use client';
import type { PanelProps } from './panel-props';
import { useState } from 'react';
import { Compass, Search } from 'lucide-react';
import { JOBS, JOB_TREES, LINEAGES, lineageOf, type JobTreeId, jobById } from '@/game/data/classes';
import { jobMasteryTarget, jobMastered } from '@/game/systems/progression';
import { Heading, format } from './shared';
import { LineageCard, RouteMap, JobList } from './jobs/lineage-view';
import { JobCompare } from './jobs/job-compare';
import { JobDetail } from './jobs/job-detail';
import { DoorRow, openUnenteredDoors } from './jobs/mystery-doors';
import { lineageJobs, finderJobs, searchJobs, secretJob, TOP_TAGS, type Finder } from './jobs/job-status';

const FINDER_LABEL: Record<Finder, string> = { ready: '전직 가능', mastered: '숙달', near: '거의 다 됨', goal: '목표', doors: '문 열림' };

/**
 * 직업 화면: 세 번 눌러 원하는 직업에 닿는 카드형 화면.
 * ① 계열 탭 + 계보 카드 → ② 항로도(01~05) → ③ 직업 상세. 데스크톱은 세 칸을 나란히, 모바일은 위아래로 쌓고 상세는 아래에서 올라옵니다.
 * ??? 탭은 ① 칸 위에 문 카드 4장, 아래에 한 번 들어간 ??? 계보 카드를 둡니다.
 */
export function Classes({ s, send, busy }: PanelProps) {
    const current = jobById(s.job) || JOBS[0];
    const [treeId, setTreeId] = useState<JobTreeId>(current.tree);
    const [lineageId, setLineageId] = useState<string>(lineageOf(current));
    const [selectedId, setSelectedId] = useState(current.id);
    const [sheetOpen, setSheetOpen] = useState(false);
    // 편의 기능: 빠른 찾기(계열 무관 모아 보기), 이름 검색·태그 필터, 비교(최대 3개).
    const [finder, setFinder] = useState<Finder | null>(null);
    const [query, setQuery] = useState(''), [tag, setTag] = useState('');
    const [compareIds, setCompareIds] = useState<string[]>([]);
    const toggleCompare = (id: string) => setCompareIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : ids.length >= 3 ? ids : [...ids, id]);
    const doors = openUnenteredDoors(s), doorJobs = doors.map(d => d.job);
    const searching = !!query.trim() || !!tag;
    const found = finder ? finderJobs(s, finder, doorJobs) : searching ? searchJobs(s, query, tag) : null;
    const foundTitle = finder ? `빠른 찾기 · ${FINDER_LABEL[finder]}` : `검색${query.trim() ? ` '${query.trim()}'` : ''}${tag ? ` #${tag}` : ''}`;
    const clearFound = () => { setFinder(null); setQuery(''); setTag(''); };
    // 전직하면 화면을 새 직업의 계보로 맞춥니다(렌더 중 이전 값과 비교).
    const [shownJob, setShownJob] = useState(current.id);
    if (shownJob !== current.id) { setShownJob(current.id); setSelectedId(current.id); setTreeId(current.tree); setLineageId(lineageOf(current)); }
    const tree = JOB_TREES.find(t => t.id === treeId)!;
    // ??? 계보는 한 번 들어갔거나, 문·히든이 아닌 공개 직업(예: 玄)이 있으면 보입니다.
    const mysteryShown = (id: string) => lineageJobs(id).some(j => s.unlockedJobs.includes(j.id) || !secretJob(j));
    const lineages = LINEAGES.filter(l => l.tree === treeId && lineageJobs(l.id).length)
        .filter(l => treeId !== 'mystery' || mysteryShown(l.id));
    const lineage = lineages.find(l => l.id === lineageId) || null;
    const selected = jobById(selectedId) || current;
    const select = (id: string) => { setSelectedId(id); setSheetOpen(true); };
    const openTree = (id: JobTreeId) => {
        setTreeId(id);
        const first = LINEAGES.find(l => l.tree === id && lineageJobs(l.id).some(j => j.id === s.job)) || LINEAGES.find(l => l.tree === id && lineageJobs(l.id).length && (id !== 'mystery' || mysteryShown(l.id)));
        setLineageId(first?.id || '');
    };
    const showCurrent = () => { setTreeId(current.tree); setLineageId(lineageOf(current)); setSelectedId(current.id); };
    return <>
        <Heading eyebrow="VOCATION TREE" title="직업 계보도"/>
        <section className="panel job-current-summary"><Compass size={26}/><div><small>현재 직업</small><h2>{current.name}</h2><p>숙련 {format(s.jobMastery[s.job] || 0)} / {format(jobMasteryTarget(current))} · 전직해 본 직업 {s.unlockedJobs.length} / {JOBS.length} · 숙달 {JOBS.filter(j => jobMastered(s, j)).length}</p></div><button className="secondary small" onClick={showCurrent}>현재 직업 보기</button></section>
        <div className="job-finder" role="group" aria-label="빠른 찾기">{(Object.keys(FINDER_LABEL) as Finder[]).map(kind => <button type="button" key={kind} className={`job-finder-chip ${finder === kind ? 'active' : ''}`} aria-pressed={finder === kind} onClick={() => { setFinder(finder === kind ? null : kind); setQuery(''); setTag(''); }}>{FINDER_LABEL[kind]} <b>{finderJobs(s, kind, doorJobs).length}</b></button>)}</div>
        <div className="job-search">
            <label className="job-search-box"><Search size={15}/><input type="search" value={query} placeholder="직업 이름 검색" aria-label="직업 이름 검색" onChange={e => { setQuery(e.target.value); setFinder(null); }}/></label>
            <div className="job-tag-chips" aria-label="태그 필터">{TOP_TAGS.map(t => <button type="button" key={t} className={`job-tag-chip ${tag === t ? 'active' : ''}`} aria-pressed={tag === t} onClick={() => { setTag(tag === t ? '' : t); setFinder(null); }}>#{t}</button>)}</div>
        </div>
        <div className="job-columns">
            <section className="panel job-lineage-column" aria-label="계보 카드">
                <h2 className="job-column-title"><span>①</span> 계보 카드</h2>
                <div className="job-tree-chips" role="tablist" aria-label="직업 계열">{JOB_TREES.map(t => <button type="button" role="tab" key={t.id} aria-selected={t.id === treeId} className={`job-tree-chip ${t.id === treeId ? 'active' : ''}`} style={{ '--tree-color': t.accent } as React.CSSProperties} onClick={() => openTree(t.id)}>{t.name}<span>{JOBS.filter(j => j.tree === t.id).length}</span>{t.id === 'mystery' && doors.length > 0 && <i className="job-tree-dot" aria-label="들어가지 않은 열린 문"/>}</button>)}</div>
                <p className="job-family-description" style={{ borderLeftColor: tree.accent }}>{tree.description}</p>
                {treeId === 'mystery' && <DoorRow s={s} selectedId={selectedId} onSelect={select}/>}
                <div className="lineage-list">{lineages.map(l => <LineageCard key={l.id} s={s} lineage={l} accent={tree.accent} selected={l.id === lineage?.id} onOpen={() => setLineageId(l.id)}/>)}</div>
                {!lineages.length && <p className="footnote">{treeId === 'mystery' ? '문을 지나 ??? 직업에 한 번 들어가면 그 계보가 여기에 나타납니다.' : '이 계열에는 아직 계보가 없습니다.'}</p>}
            </section>
            {found ? <JobList s={s} title={foundTitle} jobs={found} selectedId={selectedId} onSelect={select} onClear={clearFound}/>
                : lineage ? <RouteMap s={s} lineage={lineage} jobs={lineageJobs(lineage.id)} selectedId={selectedId} onSelect={select}/>
                : <section className="panel route-map route-empty"><h2 className="job-column-title"><span>②</span> 항로도</h2><p className="footnote">{treeId === 'mystery' ? '열린 문의 직업을 누르면 오른쪽에 상세가 열립니다.' : '왼쪽에서 계보를 고르세요.'}</p></section>}
            <div className={`job-detail-slot ${sheetOpen ? 'sheet-open' : ''}`}>
                <div className="job-sheet-backdrop" onClick={() => setSheetOpen(false)}/>
                <JobDetail key={selected.id} j={selected} s={s} send={send} busy={busy} onClose={() => setSheetOpen(false)} onCompare={toggleCompare} compared={compareIds.includes(selected.id)} compareFull={compareIds.length >= 3}/>
            </div>
        </div>
        <JobCompare s={s} jobs={compareIds.map(id => jobById(id)!)} onRemove={toggleCompare} onClear={() => setCompareIds([])}/>
    </>;
}
