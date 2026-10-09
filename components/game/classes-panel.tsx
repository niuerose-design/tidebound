'use client';
import type { PanelProps } from './panel-props';
import { useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, Compass, Flag, Lock, Search } from 'lucide-react';
import { JOBS, LINEAGES, WORLDS, lineageOf, jobById, type WorldId } from '@/game/data/classes';
import { jobMasteryTarget } from '@/game/systems/progression';
import { Heading, format } from './shared';
import { LineageCard, RouteMap, JobList } from './jobs/lineage-view';
import { JobCompare } from './jobs/job-compare';
import { JobDetail } from './jobs/job-detail';
import { statusReader, finderJobs, searchJobs, shownLineageJobs, lineageInTab, tabJobCount, tabOf, JOB_TABS, jobTally, jobGoalOf, jobWorld, worldLineages, worldJobCount, type JobTabId, TOP_TAGS, type Finder } from './jobs/job-status';

const FINDER_LABEL: Record<Finder, string> = { ready: '전직 가능', mastered: '숙달', near: '거의 다 됨' };

/**
 * 직업 화면: 세 번 눌러 원하는 직업에 닿는 카드형 화면.
 * ① 계열 탭 + 계보 카드 → ② 항로도(01~05) → ③ 직업 상세. 데스크톱은 세 칸을 나란히, 모바일은 위아래로 쌓고 상세는 아래에서 올라옵니다.
 * ??? 탭도 다른 계열처럼 계보 카드만 둡니다.
 * v3.63 히든 직업은 숨은 조건·관문 조건을 채워 드러나기 전에는 어디에도 보이지 않고(실루엣 없음), 드러나면 ??? 탭에 나타납니다.
 *   다른 계열에 붙은 히든 직업(예: 시공의 위자드)은 드러나면 그 계보째 ??? 탭에도 나타납니다.
 * v3.166 ??? 옆 ‘외길’ 탭: 능력치 하나로 전직하는 외길 계보는 원래 계열 탭에서 빼고 따로 모읍니다(job-status.ts lineageInTab).
 *   목표 직업(직업 상세의 ‘목표로 설정’)은 머리에 한 줄로 보이고, 항로도 · 목록 · 계보 카드에 깃발이 붙습니다.
 * v3.220 세계: 계보 위의 묶음. 전직 화면은 책(세계 목차)에서 시작하고, 메이플 월드를 고르면 지금까지의 계열 탭 · 계보도가,
 *   아제로스를 고르면 아제로스 히든 계보의 카드가 나옵니다. 세 번째 장은 추후 추가 예정입니다.
 */
export function Classes({ s, send, busy }: PanelProps) {
    const current = jobById(s.job) || JOBS[0];
    const [treeId, setTreeId] = useState<JobTabId>(tabOf(current));
    const [lineageId, setLineageId] = useState<string>(lineageOf(current));
    const [selectedId, setSelectedId] = useState(current.id);
    const [sheetOpen, setSheetOpen] = useState(false);
    // v3.220 고른 세계. null이면 책(세계 목차)을 보여 줍니다.
    const [world, setWorld] = useState<WorldId | null>(null);
    // 편의 기능: 빠른 찾기(계열 무관 모아 보기), 이름 검색·태그 필터, 비교(최대 3개).
    const [finder, setFinder] = useState<Finder | null>(null);
    const [query, setQuery] = useState(''), [tag, setTag] = useState('');
    const [compareIds, setCompareIds] = useState<string[]>([]);
    const toggleCompare = (id: string) => setCompareIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : ids.length >= 3 ? ids : [...ids, id]);
    // v27.62 빠른 찾기 개수는 상태가 바뀔 때만 다시 셉니다(직업 259개 × 조건 판정이라 검색 입력마다 세면 무거움).
    const finderCounts = useMemo(() => Object.fromEntries((Object.keys(FINDER_LABEL) as Finder[]).map(kind => [kind, finderJobs(s, kind, statusReader(s)).length])) as Record<Finder, number>, [s]);
    const searching = !!query.trim() || !!tag;
    const found = useMemo(() => finder ? finderJobs(s, finder, statusReader(s)) : searching ? searchJobs(s, query, tag) : null, [s, finder, searching, query, tag]);
    const foundTitle = finder ? `빠른 찾기 · ${FINDER_LABEL[finder]}` : `검색${query.trim() ? ` '${query.trim()}'` : ''}${tag ? ` #${tag}` : ''}`;
    const clearFound = () => { setFinder(null); setQuery(''); setTag(''); };
    // 전직하면 화면을 새 직업의 계보로 맞춥니다(렌더 중 이전 값과 비교).
    const [shownJob, setShownJob] = useState(current.id);
    if (shownJob !== current.id) { setShownJob(current.id); setSelectedId(current.id); setTreeId(tabOf(current)); setLineageId(lineageOf(current)); if (world) setWorld(jobWorld(current)); }
    const tree = JOB_TABS.find(t => t.id === treeId)!;
    // v3.63 계보는 보이는 직업이 있을 때만 나옵니다. ??? 탭은 드러난 히든 직업이 있는 다른 계열의 계보도 모으고, 외길 탭은 외길 계보만 모읍니다.
    const tabHas = (id: JobTabId, l: { id: string; tree: string }) => lineageInTab(s, id, l);
    const lineages = world === 'maple' ? LINEAGES.filter(l => tabHas(treeId, l)) : world ? worldLineages(s, world) : [];
    const worldInfo = WORLDS.find(w => w.id === world);
    // v3.166 머리의 직업 수는 숙련 진행판과 같은 기준(jobTally)으로 셉니다.
    const tally = jobTally(s), goal = jobGoalOf(s), goalStatus = goal ? statusReader(s)(goal) : null;
    const lineage = lineages.find(l => l.id === lineageId) || null;
    const selected = jobById(selectedId) || current;
    const select = (id: string) => { setSelectedId(id); setSheetOpen(true); };
    const openTree = (id: JobTabId) => {
        setTreeId(id);
        const first = LINEAGES.find(l => tabHas(id, l) && shownLineageJobs(s, l.id).some(j => j.id === s.job)) || LINEAGES.find(l => tabHas(id, l));
        setLineageId(first?.id || '');
    };
    const showCurrent = () => { clearFound(); setWorld(jobWorld(current)); setTreeId(tabOf(current)); setLineageId(lineageOf(current)); setSelectedId(current.id); };
    const showGoal = () => { if (!goal) return; clearFound(); setWorld(jobWorld(goal)); setTreeId(tabOf(goal)); setLineageId(lineageOf(goal)); select(goal.id); };
    const openWorld = (id: WorldId) => {
        clearFound(); setWorld(id);
        if (id === jobWorld(current)) { setTreeId(tabOf(current)); setLineageId(lineageOf(current)); setSelectedId(current.id); }
        else { const first = worldLineages(s, id)[0]; setLineageId(first?.id || ''); const j = first && shownLineageJobs(s, first.id)[0]; if (j) setSelectedId(j.id); }
    };
    return <>
        <Heading eyebrow="VOCATION TREE" title="직업 계보도"/>
        <section className="panel job-current-summary"><Compass size={26}/><div><small>현재 직업</small><h2>{current.name}</h2><p>숙련 {format(s.jobMastery[s.job] || 0)} / {format(jobMasteryTarget(current))} · 전직해 본 직업 {tally.unlocked} / {tally.total} · 숙달 {tally.mastered} / {tally.total}</p>
            <p className={`job-goal-line ${goalStatus && (goalStatus.status === 'ready' || goalStatus.status === 'mastered') ? 'ready' : ''}`}><Flag size={13}/> {goal && goalStatus ? <>목표 <b>{goal.name}</b> · {goalStatus.status === 'ready' || goalStatus.status === 'mastered' ? '지금 전직할 수 있습니다' : `조건 ${goalStatus.missing.length}개 남음${goalStatus.missing[0] ? ` · ${goalStatus.missing[0].label}` : ''}`}</> : '목표 직업 없음 · 직업 상세에서 ‘목표로 설정’'}</p></div>
            <div className="job-summary-buttons"><button className="secondary small" onClick={showCurrent}>현재 직업 보기</button>{goal && <button className="secondary small" onClick={showGoal}>목표 보기</button>}</div></section>
        <div className="job-finder" role="group" aria-label="빠른 찾기">{(Object.keys(FINDER_LABEL) as Finder[]).map(kind => <button type="button" key={kind} className={`job-finder-chip ${finder === kind ? 'active' : ''}`} aria-pressed={finder === kind} onClick={() => { setFinder(finder === kind ? null : kind); setQuery(''); setTag(''); }}>{FINDER_LABEL[kind]} <b>{finderCounts[kind]}</b></button>)}</div>
        <div className="job-search">
            <label className="job-search-box"><Search size={15}/><input type="search" value={query} placeholder="직업 이름 검색" aria-label="직업 이름 검색" onChange={e => { setQuery(e.target.value); setFinder(null); }}/></label>
            <div className="job-tag-chips" aria-label="태그 필터">{TOP_TAGS.map(t => <button type="button" key={t} className={`job-tag-chip ${tag === t ? 'active' : ''}`} aria-pressed={tag === t} onClick={() => { setTag(tag === t ? '' : t); setFinder(null); }}>#{t}</button>)}</div>
        </div>
        {!world || found ? null : <div className="job-world-bar"><button type="button" className="secondary small" onClick={() => setWorld(null)}><ChevronLeft size={14}/> 세계 목차</button><span className="job-world-name" style={{ '--world-color': worldInfo!.accent } as React.CSSProperties}><BookOpen size={14}/> {worldInfo!.name}</span></div>}
        {!world && !found ? <WorldBook s={s} currentWorld={jobWorld(current)} onOpen={openWorld}/> : <div className="job-columns">
            <section className="panel job-lineage-column" aria-label="계보 카드">
                <h2 className="job-column-title"><span>①</span> 계보 카드</h2>
                {world === 'maple' || !world ? <><div className="job-tree-chips" role="tablist" aria-label="직업 계열">{JOB_TABS.map(t => <button type="button" role="tab" key={t.id} aria-selected={t.id === treeId} className={`job-tree-chip ${t.id === treeId ? 'active' : ''}`} style={{ '--tree-color': t.accent } as React.CSSProperties} onClick={() => openTree(t.id)}>{t.name}<span>{tabJobCount(s, t.id)}</span></button>)}</div>
                <p className="job-family-description" style={{ borderLeftColor: tree.accent }}>{tree.description}</p></>
                : <p className="job-family-description" style={{ borderLeftColor: worldInfo!.accent }}>{worldInfo!.description}</p>}
                <div className="lineage-list">{lineages.map(l => <LineageCard key={l.id} s={s} lineage={l} accent={world && world !== 'maple' ? worldInfo!.accent : tree.accent} selected={l.id === lineage?.id} onOpen={() => setLineageId(l.id)}/>)}</div>
                {!lineages.length && <p className="footnote">{world && world !== 'maple' ? '아직 이 세계로 가는 길을 찾지 못했습니다. 특별한 사냥 기록을 오래 쌓은 모험가에게 길이 열립니다.' : treeId === 'mystery' ? '숨은 조건을 만족한 히든 직업이 여기에 나타납니다.' : treeId === 'monostat' ? '능력치 하나로 전직하는 외길 계보가 여기에 모입니다.' : '이 계열에는 아직 계보가 없습니다.'}</p>}
            </section>
            {found ? <JobList s={s} title={foundTitle} jobs={found} selectedId={selectedId} onSelect={select} onClear={clearFound}/>
                : lineage ? <RouteMap s={s} lineage={lineage} jobs={shownLineageJobs(s, lineage.id)} selectedId={selectedId} onSelect={select}/>
                : <section className="panel route-map route-empty"><h2 className="job-column-title"><span>②</span> 항로도</h2><p className="footnote">왼쪽에서 계보를 고르세요.</p></section>}
            <div className={`job-detail-slot ${sheetOpen ? 'sheet-open' : ''}`}>
                <div className="job-sheet-backdrop" onClick={() => setSheetOpen(false)}/>
                <JobDetail key={selected.id} j={selected} s={s} send={send} busy={busy} onClose={() => setSheetOpen(false)} onCompare={toggleCompare} compared={compareIds.includes(selected.id)} compareFull={compareIds.length >= 3}/>
            </div>
        </div>}
        <JobCompare s={s} jobs={compareIds.map(id => jobById(id)!)} onRemove={toggleCompare} onClear={() => setCompareIds([])}/>
    </>;
}

/** v3.220 책 모양 세계 목차: 왼쪽 장은 표지 글, 오른쪽 장은 세계(장) 목록. 추후 추가될 세계는 잠긴 장으로 둡니다. */
function WorldBook({ s, currentWorld, onOpen }: { s: PanelProps['s']; currentWorld: WorldId; onOpen: (id: WorldId) => void }) {
    return <section className="panel job-world-book" aria-label="세계 목차">
        <div className="world-book-page world-book-cover">
            <BookOpen size={30}/>
            <small>VOCATION CHRONICLE</small>
            <h2>모험가의 연대기</h2>
            <p>세계마다 서로 다른 계보가 이어집니다. 읽을 세계를 고르세요.</p>
        </div>
        <ol className="world-book-page world-book-index">
            {WORLDS.map((w, i) => { const n = worldJobCount(s, w.id);
                return <li key={w.id}><button type="button" className={`world-chapter ${w.id === currentWorld ? 'current' : ''}`} style={{ '--world-color': w.accent } as React.CSSProperties} onClick={() => onOpen(w.id)}>
                    <span className="world-chapter-no">제{i + 1}장</span>
                    <strong>{w.name}</strong>
                    <small>{w.subtitle}</small>
                    <em>{n ? `직업 ${n}개${w.id === currentWorld ? ' · 현재 직업' : ''}` : '아직 드러난 계보 없음'}</em>
                </button></li>; })}
            <li><div className="world-chapter locked" aria-disabled="true"><span className="world-chapter-no">제{WORLDS.length + 1}장</span><strong><Lock size={13}/> 추후 추가 예정</strong><small>아직 쓰이지 않은 장입니다.</small></div></li>
        </ol>
    </section>;
}
