'use client';
/**
 * v3.397 직업 계보도(새 토대): 세 번 눌러 원하는 직업에 닿는 카드형 화면.
 * ① 계열 탭 + 계보 카드 → ② 항로도(01~05) → ③ 직업 상세. 넓은 화면은 세 칸을 나란히, 좁은 화면은 ① · ②를 쌓고 상세는 아래에서 올라오는 Sheet.
 * 세계 책(v3.220) · 빠른 찾기 · 검색 · 비교(최대 3) · 목표 직업(v3.166)은 전과 같고, 판정은 components/game/jobs/job-status.ts 그대로입니다.
 */
import { useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, Compass, Flag, Lock, Search } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { JOBS, LINEAGES, WORLDS, lineageOf, jobById, type WorldId } from '@/game/data/classes';
import { KOPRULU_REBIRTH } from '@/game/data/expansion-koprulu';
import { jobMasteryTarget } from '@/game/systems/progression';
import { noviceLife } from '@/game/systems/guidance';
import { SectionHeader, ChoiceChips, formatExact, Eyebrow } from '@/components/ui/game';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { statusReader, finderJobs, searchJobs, shownLineageJobs, lineageInTab, tabJobCount, tabOf, JOB_TABS, jobTally, jobGoalOf, jobWorld, worldLineages, worldJobCount, type JobTabId, TOP_TAGS, type Finder } from '@/components/game/jobs/job-status';
import { cn } from '@/lib/utils';
import { LineageCard, RouteMap, JobList, ColumnTitle } from './parts';
import { JobCompare } from './job-compare';
import { JobDetail } from './job-detail';

type Send = (a: Action) => void;
const fmt = formatExact;
const FINDER_LABEL: Record<Finder, string> = { starter: '처음 추천', ready: '전직 가능', mastered: '숙달', near: '거의 다 됨' };
const field = 'h-10 w-full rounded-m border border-line bg-surface-0 pl-8 pr-2 text-s text-ink-1 outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/40';

export function ClassesScreen({ s, send, busy }: { s: State; send: Send; busy: boolean }) {
    const current = jobById(s.job) || JOBS[0];
    const [treeId, setTreeId] = useState<JobTabId>(tabOf(current));
    const [lineageId, setLineageId] = useState<string>(lineageOf(current));
    const [selectedId, setSelectedId] = useState(current.id);
    const [sheetOpen, setSheetOpen] = useState(false);
    // v3.220 고른 세계. null이면 책(세계 목차)을 보여 줍니다.
    const [world, setWorld] = useState<WorldId | null>(null);
    // v3.242 첫 생의 초보자는 ‘처음 추천’ 모아 보기로 시작합니다(1차 직업이 70개가 넘음).
    const starter = noviceLife(s), finders = useMemo(() => (Object.keys(FINDER_LABEL) as Finder[]).filter(kind => kind !== 'starter' || starter), [starter]);
    const [finder, setFinder] = useState<Finder | null>(starter && s.job === 'fisher' ? 'starter' : null);
    const [query, setQuery] = useState(''), [tag, setTag] = useState('');
    const [compareIds, setCompareIds] = useState<string[]>([]);
    const toggleCompare = (id: string) => setCompareIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : ids.length >= 3 ? ids : [...ids, id]);
    // v27.62 빠른 찾기 개수는 상태가 바뀔 때만 다시 셉니다(직업 259개 × 조건 판정).
    const finderCounts = useMemo(() => Object.fromEntries(finders.map(kind => [kind, finderJobs(s, kind, statusReader(s)).length])) as Record<Finder, number>, [s, finders]);
    const searching = !!query.trim() || !!tag;
    const found = useMemo(() => finder ? finderJobs(s, finder, statusReader(s)) : searching ? searchJobs(s, query, tag) : null, [s, finder, searching, query, tag]);
    const foundTitle = finder ? `빠른 찾기 · ${FINDER_LABEL[finder]}` : `검색${query.trim() ? ` '${query.trim()}'` : ''}${tag ? ` #${tag}` : ''}`;
    const clearFound = () => { setFinder(null); setQuery(''); setTag(''); };
    // 전직하면 화면을 새 직업의 계보로 맞춥니다(렌더 중 이전 값과 비교).
    const [shownJob, setShownJob] = useState(current.id);
    if (shownJob !== current.id) { setShownJob(current.id); setSelectedId(current.id); setTreeId(tabOf(current)); setLineageId(lineageOf(current)); if (world) setWorld(jobWorld(current)); }
    const tree = JOB_TABS.find(t => t.id === treeId)!;
    const tabHas = (id: JobTabId, l: { id: string; tree: string }) => lineageInTab(s, id, l);
    const lineages = world === 'maple' ? LINEAGES.filter(l => tabHas(treeId, l)) : world ? worldLineages(s, world) : [];
    const worldInfo = WORLDS.find(w => w.id === world);
    const tally = jobTally(s), goal = jobGoalOf(s), goalStatus = goal ? statusReader(s)(goal) : null, goalReady = !!goalStatus && (goalStatus.status === 'ready' || goalStatus.status === 'mastered');
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
    const detail = (onClose?: () => void) => <JobDetail key={selected.id} j={selected} s={s} send={send} busy={busy} onClose={onClose} onCompare={toggleCompare} compared={compareIds.includes(selected.id)} compareFull={compareIds.length >= 3}/>;
    return <div className="grid gap-5 text-ink-1">
        <SectionHeader as="h1" eyebrow="VOCATION TREE" title="직업 계보도"/>
        <section className="flex flex-wrap items-center gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1" aria-label="현재 직업">
            <Compass size={24} className="shrink-0 text-accent"/>
            <div className="grid min-w-0 flex-1 gap-0.5"><small className="text-xs text-ink-3">현재 직업</small><h2 className="font-display text-l font-bold">{current.name}</h2><p className="text-xs text-ink-2">숙련 {fmt(s.jobMastery[s.job] || 0)} / {fmt(jobMasteryTarget(current))} · 전직해 본 직업 {tally.unlocked} / {tally.total} · 숙달 {tally.mastered} / {tally.total}</p>
                <p className={cn('inline-flex items-center gap-1 text-xs', goalReady ? 'text-ok' : 'text-ink-3')}><Flag size={12}/> {goal && goalStatus ? <>목표 <b className="text-ink-1">{goal.name}</b> · {goalReady ? '지금 전직할 수 있습니다' : `조건 ${goalStatus.missing.length}개 남음${goalStatus.missing[0] ? ` · ${goalStatus.missing[0].label}` : ''}`}</> : '목표 직업 없음 · 직업 상세에서 ‘목표로 설정’'}</p></div>
            <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={showCurrent}>현재 직업 보기</Button>{goal && <Button type="button" size="sm" variant="outline" onClick={showGoal}>목표 보기</Button>}</div>
        </section>
        <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
            <ChoiceChips label="빠른 찾기" value={finder || ''} onChange={v => { setFinder(v === finder ? null : v as Finder); setQuery(''); setTag(''); }} options={finders.map(kind => ({ value: kind, label: `${FINDER_LABEL[kind]} ${finderCounts[kind]}` }))}/>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)] sm:items-center">
                <label className="relative block"><Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"/><input type="search" className={field} value={query} placeholder="직업 이름 검색" aria-label="직업 이름 검색" onChange={e => { setQuery(e.target.value); setFinder(null); }}/></label>
                <ChoiceChips label="태그 필터" value={tag} onChange={v => { setTag(v === tag ? '' : v); setFinder(null); }} options={TOP_TAGS.map(t => ({ value: t, label: `#${t}` }))}/>
            </div>
        </div>
        {world && !found && <div className="flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setWorld(null)}><ChevronLeft size={14}/> 세계 목차</Button><span className="inline-flex items-center gap-1 rounded-s border px-2 py-1 text-xs font-semibold" style={{ borderColor: worldInfo!.accent, color: worldInfo!.accent }}><BookOpen size={14}/> {worldInfo!.name}</span></div>}
        {!world && !found ? <WorldBook s={s} currentWorld={jobWorld(current)} onOpen={openWorld}/> : <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_380px]">
            <section className="grid content-start gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1" aria-label="계보 카드">
                <ColumnTitle no="①">계보 카드</ColumnTitle>
                {world === 'maple' || !world ? <><ChoiceChips label="직업 계열" value={treeId} onChange={v => openTree(v as JobTabId)} options={JOB_TABS.map(t => ({ value: t.id, label: `${t.name} ${tabJobCount(s, t.id)}`, style: t.id === treeId ? { borderColor: t.accent } : undefined }))}/>
                    <p className="border-l-2 pl-2 text-xs leading-relaxed text-ink-2" style={{ borderLeftColor: tree.accent }}>{tree.description}</p></>
                    : <p className="border-l-2 pl-2 text-xs leading-relaxed text-ink-2" style={{ borderLeftColor: worldInfo!.accent }}>{worldInfo!.description}</p>}
                <div className="grid gap-2">{lineages.map(l => <LineageCard key={l.id} s={s} lineage={l} accent={world && world !== 'maple' ? worldInfo!.accent : tree.accent} selected={l.id === lineage?.id} onOpen={() => setLineageId(l.id)}/>)}</div>
                {!lineages.length && <p className="text-xs text-ink-3">{world && world !== 'maple' ? '아직 이 세계로 가는 길을 찾지 못했습니다. 특별한 사냥 기록을 오래 쌓은 모험가에게 길이 열립니다.' : treeId === 'mystery' ? '숨은 조건을 만족한 히든 직업이 여기에 나타납니다.' : treeId === 'monostat' ? '능력치 하나로 전직하는 외길 계보가 여기에 모입니다.' : '이 계열에는 아직 계보가 없습니다.'}</p>}
            </section>
            {found ? <JobList s={s} title={foundTitle} jobs={found} selectedId={selectedId} onSelect={select} onClear={clearFound}/>
                : lineage ? <RouteMap s={s} lineage={lineage} jobs={shownLineageJobs(s, lineage.id)} selectedId={selectedId} onSelect={select}/>
                : <section className="grid content-start gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1"><ColumnTitle no="②">항로도</ColumnTitle><p className="text-xs text-ink-3">왼쪽에서 계보를 고르세요.</p></section>}
            <aside className="hidden min-w-0 xl:block">{detail()}</aside>
            {/* 좁은 화면: 직업을 고르면 아래에서 올라오는 창으로 상세를 봅니다. */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}><SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto border-line bg-surface-0 p-3 xl:hidden [&>button]:hidden"><SheetTitle className="sr-only">{selected.name} 상세</SheetTitle>{detail(() => setSheetOpen(false))}</SheetContent></Sheet>
        </div>}
        <JobCompare s={s} jobs={compareIds.map(id => jobById(id)!)} onRemove={toggleCompare} onClear={() => setCompareIds([])}/>
    </div>;
}

/** v3.220 책 모양 세계 목차: 왼쪽 장은 표지 글, 오른쪽 장은 세계(장) 목록. 추후 추가될 세계는 잠긴 장으로 둡니다. */
function WorldBook({ s, currentWorld, onOpen }: { s: State; currentWorld: WorldId; onOpen: (id: WorldId) => void }) {
    return <section className="grid gap-0 overflow-hidden rounded-l border border-line bg-surface-2 shadow-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" aria-label="세계 목차">
        <div className="grid content-center justify-items-center gap-2 border-b border-line bg-surface-1 p-6 text-center md:border-b-0 md:border-r">
            <BookOpen size={30} className="text-accent"/>
            <Eyebrow>VOCATION CHRONICLE</Eyebrow>
            <h2 className="font-display text-xl font-bold">모험가의 연대기</h2>
            <p className="text-s text-ink-2">세계마다 서로 다른 계보가 이어집니다. 읽을 세계를 고르세요.</p>
        </div>
        <ol className="grid content-start gap-2 p-4">
            {WORLDS.map((w, i) => { const n = worldJobCount(s, w.id), locked = w.id === 'koprulu' && s.rebirths < KOPRULU_REBIRTH, cur = w.id === currentWorld;
                return <li key={w.id}><button type="button" className={cn('grid w-full gap-0.5 rounded-m border p-3 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-accent/50', cur ? 'border-accent/70 bg-accent-soft' : 'border-line bg-surface-1 hover:bg-surface-3/60')} style={{ borderLeftColor: w.accent, borderLeftWidth: 3 }} onClick={() => onOpen(w.id)}>
                    <span className="font-display text-xs text-ink-3">제{i + 1}장</span>
                    <strong className="inline-flex items-center gap-1 font-display text-m">{locked && <Lock size={13}/>}{w.name}</strong>
                    <small className="text-xs text-ink-3">{w.subtitle}</small>
                    <em className="text-xs not-italic text-ink-2">{locked ? `환생 ${KOPRULU_REBIRTH}회부터 전직 · 미리 보기만` : n ? `직업 ${n}개${cur ? ' · 현재 직업' : ''}` : '아직 드러난 계보 없음'}</em>
                </button></li>; })}
            <li><div className="grid gap-0.5 rounded-m border border-dashed border-line p-3 opacity-60" aria-disabled="true"><span className="font-display text-xs text-ink-3">제{WORLDS.length + 1}장</span><strong className="inline-flex items-center gap-1 font-display text-m"><Lock size={13}/> 추후 추가 예정</strong><small className="text-xs text-ink-3">아직 쓰이지 않은 장입니다.</small></div></li>
        </ol>
    </section>;
}
