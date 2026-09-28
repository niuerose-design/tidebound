'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Compass, Info, Lock } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import type { State, Action, Stats } from '@/game/types';
import { JOBS, JOB_TREES, type Job } from '@/game/data/classes';
import { SKILLS } from '@/game/data/skills';
import { skillEffectLines } from '@/game/systems/skill-description';
import { STAT_LABELS, statDeltaDisplay } from '@/game/data/progression';
import { vocationTargets, thresholdRank } from '@/game/data/long-term';
import { jobRequirements, jobMasteryTarget, jobMasteryBoost, jobCombatMultiplier } from '@/game/systems/progression';
import { Heading, Meter, SkillIcon, format } from './shared';

type Props = { s: State; send: (a: Action) => void; busy: boolean };
const bonusKeys = ['attack', 'magic', 'hp', 'defense', 'resist'] as const;
const percent = (value: number) => `${value > 0 ? '+' : ''}${Number((value * 100).toFixed(2))}%`;
function ancestors(job: Job) {
    const ids = new Set<string>();
    let parent = job.parent;
    while (parent && !ids.has(parent)) { ids.add(parent); parent = JOBS.find(j => j.id === parent)?.parent; }
    return ids;
}
function JobDetail({ j, s, send, busy }: Props & { j: Job }) {
    const req = jobRequirements(s, j), ready = req.every(r => r.met), current = j.id === s.job, missing = req.filter(r => !r.met), metReq = req.filter(r => r.met);
    const xp = s.jobMastery[j.id] || 0, target = jobMasteryTarget(j), mastered = xp >= target;
    const dedicationTargets = vocationTargets(target), dedication = thresholdRank(xp, dedicationTargets);
    const bonuses = bonusKeys.filter(key => j[key] !== 1), grows = bonuses.some(key => j[key] > 1) && jobMasteryBoost(j) > 0;
    return <article className={`panel job-inspector ${current ? 'current' : ''}`} aria-label={`${j.name} 상세`}>
        <div className="vocation-top"><span className="badge">{j.hidden ? '히든' : j.branchless ? '독립 1차' : j.tier ? `${j.tier}차` : '시작 직업'} · {j.role}</span>{current && <span className="gold-text">현재 직업</span>}</div>
        <button className="text-button" disabled={busy} onClick={()=>send({type:'growthGoal',id:j.id,value:'job'})}>이 전직을 장기 목표로</button><h2>{j.name}</h2><p className="job-motto">{j.title}</p><p>{j.desc}</p>
        <section className="job-detail-section"><h3>전직 조건 <span className={`job-status ${current ? 'current' : ready ? 'ready' : 'locked'}`}>{current ? '현재 직업' : ready ? '전직 가능' : `조건 미달 · ${missing.length}개 부족`}</span></h3>
            {!current && !ready && <div className="requirements job-missing">{missing.map(r => <span key={r.label}><Lock size={12}/> {r.label}</span>)}</div>}
            {!current && !ready ? metReq.length > 0 && <details className="job-met-fold"><summary>충족한 조건 {metReq.length}개</summary><div className="requirements">{metReq.map(r => <span key={r.label} className="met"><Check size={12}/> {r.label}</span>)}</div></details>
                : <div className="requirements">{req.map(r => <span key={r.label} className="met"><Check size={12}/> {r.label}</span>)}</div>}</section>
        <section className="job-detail-section">
            <div className="job-section-heading"><h3>이 직업으로 활동할 때의 보너스</h3><TooltipProvider><Tooltip><TooltipTrigger asChild><button type="button" className="info-trigger" aria-label="직업 숙달 보너스 안내"><Info size={16}/></button></TooltipTrigger><TooltipContent className="game-tooltip"><p>숙련 목표를 채우면 이 직업의 체력·공격·방어 보너스가 강화됩니다. 이 직업을 선택한 동안에만 적용되며, 다른 직업의 보너스와 합쳐지지 않습니다. 전직 후에도 숙련 기록은 유지됩니다. 페널티·치명타·경험치 보너스는 변하지 않습니다.</p></TooltipContent></Tooltip></TooltipProvider></div>
            {bonuses.length > 0 && <table className="job-bonus-table"><thead><tr><th>능력치</th><th>숙달 전</th><th>숙달 후</th></tr></thead><tbody>{bonuses.map(key => <tr key={key}><th>{STAT_LABELS[key]}</th><td className={j[key] < 1 ? 'negative' : ''}>{percent(jobCombatMultiplier(j, j[key]) - 1)}</td><td className={j[key] < 1 ? 'negative' : 'positive'}>{percent(jobCombatMultiplier(j, j[key], true) - 1)}</td></tr>)}</tbody></table>}
            <div className="requirements">{!!j.expBonus && <span className="met">경험치 {percent(j.expBonus)}</span>}{j.crit > 0 && <span className="met">치명타 {percent(j.crit)}p</span>}{Object.entries(j.penalties || {}).map(([key, n]) => <span className="negative" key={key}>{STAT_LABELS[key as keyof Stats]} {statDeltaDisplay(key, n)}</span>)}</div>
            {!bonuses.length && !j.expBonus && !j.crit && !j.penalties && <p className="footnote">추가 직업 보정이 없습니다.</p>}
            <Meter value={Math.min(xp, target)} max={target} label={mastered ? '직업 숙달 완료' : '직업 숙련 목표'}/>
            <p className="job-mastery-explainer">{grows ? mastered ? (current ? '숙달 후 보너스를 적용 중입니다.' : '이 직업으로 다시 전직하면 숙달 후 보너스가 적용됩니다.') : '목표를 채우면 위의 숙달 후 수치가 적용됩니다.' : '숙달로 강화되는 능력치가 없습니다. 숙련 기록은 전직·스킬 해금 조건에 사용됩니다.'} <b>이 직업을 선택한 동안에만 적용됩니다.</b></p>
        </section>
        <section className="job-detail-section"><h3>직업 단련 · {dedication} / {dedicationTargets.length}</h3><p>숙달 이후에도 이 직업의 체력·양 공격·양 방어가 단계마다 4%씩 추가됩니다. 다른 직업으로 바꾸면 해당 직업의 단련을 적용합니다.</p><p className="footnote">{dedicationTargets.map((n,i)=>`${i+1}단계 ${format(n)}`).join(' · ')}</p><Meter value={Math.min(xp,dedicationTargets[dedication] || dedicationTargets.at(-1)!)} max={dedicationTargets[dedication] || dedicationTargets.at(-1)!} label="누적 직업 숙련"/></section><section className="job-detail-section"><h3>전용 스킬</h3><div className="vocation-skills">{SKILLS.filter(sk => sk.job === j.id).map(sk => <span key={sk.id}><SkillIcon id={sk.id}/>{sk.name}<small>{sk.type === 'active' ? '액티브' : '패시브'} · Lv.{sk.level}{sk.unlockJobMastery ? ` · 직업 숙련 ${format(sk.unlockJobMastery)}에 해금` : ''}</small><small className="skill-effect-brief">{skillEffectLines(sk).slice(0, 2).join(' · ')}</small></span>)}{!SKILLS.some(sk => sk.job === j.id) && <p className="footnote">전용 스킬 없이 공용·계승 스킬을 조합하는 직업입니다.</p>}</div></section>
        <AlertDialog><AlertDialogTrigger asChild><button className={current ? 'secondary' : 'primary'} disabled={busy || !ready || current}>{current ? '현재 직업' : ready ? '이 직업으로 전직' : '전직 조건 미충족'}</button></AlertDialogTrigger>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{j.name}(으)로 전직할까요?</AlertDialogTitle><AlertDialogDescription>새 직업의 기본 기술은 무료로 해금됩니다. 일부 기술은 추가 숙련 조건이 필요합니다. 계승하지 않은 이전 직업의 기술은 해제되지만 해금·성장·숙련 기록은 남습니다. 직업 보정은 새 직업의 것으로 교체됩니다. 전투 중이면 현재 적을 보상 없이 정리하고, 던전 중이면 보상 없이 귀환합니다.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={() => send({ type: 'job', id: j.id })}>전직하기</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
    </article>;
}
export function Classes({ s, send, busy }: Props) {
    const current = JOBS.find(j => j.id === s.job) || JOBS[0];
    const [treeId, setTreeId] = useState(current.tree), [filter, setFilter] = useState('all'), [selectedId, setSelectedId] = useState(current.id);
    const [expanded, setExpanded] = useState(() => ancestors(current));
    useEffect(() => { setSelectedId(current.id); setTreeId(current.tree); setFilter('all'); setExpanded(ancestors(current)); }, [current.id, current.tree]);
    const tree = JOB_TREES.find(t => t.id === treeId)!;
    const family = JOBS.filter(j => j.tree === treeId), available = (j: Job) => j.id !== s.job && jobRequirements(s, j).every(r => r.met);
    const locked = (j: Job) => j.id !== s.job && !jobRequirements(s, j).every(r => r.met);
    const visible = family.filter(j => filter === 'ready' ? available(j) : filter === 'locked' ? locked(j) : true);
    const selected = visible.find(j => j.id === selectedId) || visible[0];
    const roots = family.filter(j => !j.parent || !family.some(p => p.id === j.parent));
    const parents = family.filter(j => family.some(child => child.parent === j.id));
    const allExpanded = parents.length > 0 && parents.every(j => expanded.has(j.id));
    const selectTree = (id: string) => { setTreeId(id as typeof treeId); setFilter('all'); setSelectedId(JOBS.find(j => j.tree === id)?.id || current.id); };
    const node = (j: Job, flat = false): ReactNode => {
        const children = family.filter(child => child.parent === j.id), currentNode = j.id === s.job;
        const row = <div className="job-node-row"><button type="button" aria-pressed={j.id === selected?.id} className={`job-node ${j.id === selected?.id ? 'selected' : ''} ${currentNode ? 'current' : ''} ${locked(j) ? 'locked' : ''}`} onClick={() => setSelectedId(j.id)}><span className="job-node-icon">{currentNode ? <Check size={16}/> : locked(j) ? <Lock size={15}/> : <Compass size={16}/>}</span><span><strong>{j.name}</strong><small>{j.tier ? `${j.tier}차` : '시작'} · {j.role}{j.hidden ? ' · 히든' : ''}{j.branchless && !j.role.includes('독립') ? ' · 독립' : ''}{flat && j.parent ? ` · ${JOBS.find(p => p.id === j.parent)?.name} 계열` : ''}</small></span>{currentNode ? <span className="job-current-label">현재</span> : locked(j) ? <span className="job-node-state locked" title={jobRequirements(s, j).filter(r => !r.met).map(r => r.label).join(' · ')}>부족 {jobRequirements(s, j).filter(r => !r.met).length}</span> : <span className="job-node-state ready">전직 가능</span>}</button>{!flat && children.length > 0 && <CollapsibleTrigger className="job-expand" aria-label={`${j.name} 상위 직업 ${expanded.has(j.id) ? '접기' : '펼치기'}`}><span>{children.length}</span><ChevronDown size={15}/></CollapsibleTrigger>}</div>;
        if (flat || !children.length) return <div key={j.id}>{row}</div>;
        return <Collapsible key={j.id} open={expanded.has(j.id)} onOpenChange={open => setExpanded(prev => { const next = new Set(prev); if (open) next.add(j.id); else next.delete(j.id); return next; })}>{row}<CollapsibleContent><div className="job-node-children">{children.map(child => node(child))}</div></CollapsibleContent></Collapsible>;
    };
    return <>
        <Heading eyebrow="VOCATION TREE" title="직업 항해도" description="계열을 고른 뒤 직업을 눌러 전직 조건과 스킬을 비교하세요."/>
        <section className="panel job-current-summary"><Compass size={26}/><div><small>현재 직업</small><h2>{current.name}</h2><p>숙련 {format(s.jobMastery[s.job] || 0)} / {format(jobMasteryTarget(current))} · 해금 {s.unlockedJobs.length} / {JOBS.length}</p></div><button className="secondary small" onClick={() => { setTreeId(current.tree); setFilter('all'); setSelectedId(current.id); setExpanded(ancestors(current)); }}>현재 직업 보기</button></section>
        <Tabs value={treeId} onValueChange={selectTree}><TabsList className="game-tabs job-family-tabs">{JOB_TREES.map(t => <TabsTrigger key={t.id} value={t.id}>{t.name}<span>{JOBS.filter(j => j.tree === t.id).length}</span></TabsTrigger>)}</TabsList></Tabs>
        <div className="job-browser-layout">
            <section className="panel job-browser" aria-label={`${tree.name} 직업 목록`} style={{ borderTopColor: tree.accent }}>
                <p className="job-family-description">{tree.description}</p>
                <Tabs value={filter} onValueChange={setFilter}><TabsList className="game-tabs job-filter-tabs"><TabsTrigger value="all">전체 {family.length}</TabsTrigger><TabsTrigger value="ready">전직 가능 {family.filter(available).length}</TabsTrigger><TabsTrigger value="locked">전직 불가 {family.filter(locked).length}</TabsTrigger></TabsList></Tabs>
                <div className="job-list-caption"><span>{filter === 'all' ? '오른쪽 화살표로 상위 직업 펼치기' : `${visible.length}개 직업`}</span>{filter === 'all' && parents.length > 0 && <button className="text-button" onClick={() => setExpanded(allExpanded ? new Set() : new Set(parents.map(j => j.id)))}>{allExpanded ? '모두 접기' : '모두 펼치기'}</button>}</div>
                <div className="job-browser-list">{visible.length ? filter === 'all' ? roots.map(j => node(j)) : visible.map(j => node(j, true)) : <div className="empty"><Compass size={28}/><h3>{filter === 'ready' ? '지금 전직 가능한 직업이 없습니다' : '전직 불가 직업이 없습니다'}</h3><p>다른 계열 또는 전체 목록을 확인하세요.</p></div>}</div>
            </section>
            {selected ? <JobDetail j={selected} s={s} send={send} busy={busy}/> : <div className="panel job-inspector-empty"><Compass size={32}/><p>목록에서 직업을 선택하면 상세 정보가 표시됩니다.</p></div>}
        </div>
        <p className="footnote">승리마다 현재 직업의 숙련도가 기본 1씩 오릅니다. 조건부 패시브로 최대 10까지 얻을 수 있으며, 직업을 바꿔도 기록은 남습니다.</p>
    </>;
}
