'use client';
import { Fragment } from 'react';
import { ArrowDown, Compass } from 'lucide-react';
import type { State } from '@/game/types';
import { JOBS, type Job, type Lineage } from '@/game/data/classes';
import { jobStatus, crossParent, lineageSummary, tierLabel } from './job-status';

const tierRange = (tiers: number[]) => { const lo = Math.max(1, tiers[0]), hi = tiers.at(-1)!; return hi <= 0 ? '시작' : lo === hi ? `${hi}차` : `${lo}~${hi}차`; };

/** ① 계보 카드(세로 목록). 계보명 · 차수 점(해금한 차수 채움) · 상태 한 줄. */
export function LineageCard({ s, lineage, accent, selected, onOpen }: { s: State; lineage: Lineage; accent: string; selected: boolean; onOpen: () => void }) {
    const sum = lineageSummary(s, lineage.id);
    const independent = lineage.id.endsWith('-independent');
    const near = sum.jobs.filter(j => jobStatus(s, j).status === 'near').length;
    const status = sum.current ? '현재 직업이 있는 계보' : sum.ready ? `전직 가능 ${sum.ready}` : near ? `거의 다 됨 ${near}` : `해금 ${sum.unlocked} / ${sum.total}`;
    return <button type="button" className={`lineage-item ${selected ? 'selected' : ''} ${sum.current ? 'has-current' : ''}`} style={{ '--tree-color': accent } as React.CSSProperties} aria-pressed={selected} onClick={onOpen}>
        <strong>{lineage.name}</strong>
        {independent ? <small>{lineage.summary}</small> : <span className="lineage-dots" aria-label="해금한 차수">{sum.tiers.filter(t => t.tier > 0).map(t => <i key={t.tier} className={t.reached ? 'reached' : ''}/>)}<em>{tierRange(sum.tiers.map(t => t.tier))}</em></span>}
        <small className={`lineage-status ${sum.ready ? 'ready' : ''}`}>{status}{!sum.current && (sum.ready || near) ? ` · 해금 ${sum.unlocked} / ${sum.total}` : ''}</small>
    </button>;
}

/** 항로도 카드 한 줄 설명: 현재 · 숙달 · 해금함 · 전직 가능 · 조건 부족(첫 부족 조건). */
function routeNote(s: State, j: Job) {
    const st = jobStatus(s, j);
    if (st.status === 'current') return { text: '현재 직업', cls: 'current' };
    if (st.status === 'mastered') return { text: '숙달 · 조건 없이 전직', cls: 'mastered' };
    if (st.status === 'ready') return { text: s.unlockedJobs.includes(j.id) ? '해금함 · 전직 가능' : '전직 가능', cls: 'ready' };
    const first = st.missing[0]?.label || '';
    return { text: `${st.status === 'near' ? '거의 다 됨' : '조건 부족'} · ${first}${st.missing.length > 1 ? ` 외 ${st.missing.length - 1}` : ''}`, cls: st.status };
}

/** ② 항로도: 계보의 직업을 차수(01~05) 순서로 위에서 아래로 잇습니다. 같은 차수에 여러 직업이면 나란히 둡니다. */
export function RouteMap({ s, lineage, jobs, selectedId, onSelect }: { s: State; lineage: Lineage; jobs: Job[]; selectedId?: string; onSelect: (id: string) => void }) {
    const tiers = [...new Set(jobs.map(j => j.tier))].sort((a, b) => a - b);
    return <section className="panel route-map" aria-label={`${lineage.name} 항로도`}>
        <h2 className="job-column-title"><span>②</span> 항로도 · {lineage.name}</h2>
        <p className="route-summary">{lineage.summary}</p>
        {jobs.length ? <div className="route-steps">{tiers.map((tier, i) => {
            const group = jobs.filter(j => j.tier === tier), prev = jobs.filter(j => j.tier === tiers[i - 1]);
            return <Fragment key={tier}>
                {i > 0 && <ArrowDown className="route-arrow" size={16}/>}
                <div className={`route-step ${group.length > 1 ? 'branch' : ''}`}>{group.map(j => {
                    const note = routeNote(s, j), from = crossParent(j), parent = prev.length > 1 && JOBS.find(p => p.id === j.parent && prev.includes(p));
                    return <button type="button" key={j.id} className={`route-card ${note.cls} ${j.id === selectedId ? 'selected' : ''}`} aria-pressed={j.id === selectedId} onClick={() => onSelect(j.id)}>
                        <strong><span className="route-tier">{tierLabel(tier)}</span> {j.name}</strong>
                        <small className={`route-note ${note.cls}`}>{note.text}</small>
                        {(from || parent) && <small className="route-from">{from || `↳ ${parent && parent.name}에서`}</small>}
                    </button>;
                })}</div>
            </Fragment>;
        })}</div> : <div className="empty"><Compass size={28}/><p>이 계보에는 아직 직업이 없습니다.</p></div>}
    </section>;
}
