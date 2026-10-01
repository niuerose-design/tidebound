'use client';
import { useState } from 'react';
import { Check, Info, Lock, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import type { Stats } from '@/game/types';
import { jobTags, type Job } from '@/game/data/classes';
import { SKILLS } from '@/game/data/skills';
import { skillBrief } from '@/game/systems/skill-description';
import { STAT_LABELS, statDeltaDisplay, percent } from '@/game/data/progression';
import { vocationTargets, thresholdRank } from '@/game/data/long-term';
import { jobMasteryTarget, jobMasteryBoost, skillVeiled } from '@/game/systems/progression';
import { Meter, SkillIcon, format } from '../shared';
import type { PanelProps } from '../panel-props';
import { jobStatus, STATUS_LABEL, canEnter, crossParent, treeName, tierName, jobRevealed, JOB_BONUS_KEYS, hasJobBonus, growsWithMastery, jobBonusText } from './job-status';

type Tab = 'overview' | 'requirements' | 'skills' | 'mastery';

/** 3단계 상세 패널. 데스크톱은 오른쪽 패널, 모바일은 아래에서 올라오는 창(onClose로 닫기). */
export function JobDetail({ j, s, send, busy, onClose, onCompare, compared, compareFull }: PanelProps & { j: Job; onClose?: () => void; onCompare?: (id: string) => void; compared?: boolean; compareFull?: boolean }) {
    const [tab, setTab] = useState<Tab>('overview');
    // 미발견 히든·문 직업: 이름·조건을 숨기고 차수 자리와 힌트 한 줄만 보여줍니다.
    if (!jobRevealed(s, j)) return <article className="panel job-inspector job-sheet job-silhouette" aria-label="미발견 직업">
        {onClose && <button type="button" className="job-sheet-close" aria-label="닫기" onClick={onClose}><X size={18}/></button>}
        <h2 className="job-column-title"><span>③</span> 직업 상세</h2>
        <div className="job-detail-title"><h2>???</h2></div>
        <p className="job-detail-sub">{tierName(j)} · {treeName(j.tree)}</p>
        <p className="job-cross">{j.hint || '아직 드러나지 않은 직업입니다.'}</p>
        <p className="footnote">이 직업의 문이 열리면 바로, 문이 없으면 관문 조건(환생 횟수·선행 직업 숙련)을 모두 채우면 이름과 조건이 드러납니다. 한 번 전직하거나 숙달하면 계속 보입니다.</p>
    </article>;
    const st = jobStatus(s, j), current = st.status === 'current', ready = canEnter(st);
    const xp = s.jobMastery[j.id] || 0, target = jobMasteryTarget(j), mastered = xp >= target;
    const dedicationTargets = vocationTargets(target), dedication = thresholdRank(xp, dedicationTargets);
    const bonuses = JOB_BONUS_KEYS.filter(key => hasJobBonus(j, key)), grows = bonuses.some(key => growsWithMastery(j, key)) && jobMasteryBoost(j) > 0;
    const skills = SKILLS.filter(sk => sk.job === j.id), from = crossParent(j);
    return <article className={`panel job-inspector job-sheet ${current ? 'current' : ''}`} aria-label={`${j.name} 상세`}>
        {onClose && <button type="button" className="job-sheet-close" aria-label="닫기" onClick={onClose}><X size={18}/></button>}
        <h2 className="job-column-title"><span>③</span> 직업 상세</h2>
        <div className="job-detail-title"><h2>{j.name}</h2><span className={`job-status ${st.status}`}>{STATUS_LABEL(st)}</span></div>
        <p className="job-detail-sub">{tierName(j)} · {[treeName(j.tree), ...jobTags(j).filter(t => t !== treeName(j.tree))].join(' · ')}{j.hidden ? ' · 히든' : ''}</p>
        <p className="job-motto">{j.title}</p>
        <Tabs value={tab} onValueChange={v => setTab(v as Tab)}><TabsList className="game-tabs job-detail-tabs">
            <TabsTrigger value="overview">개요</TabsTrigger><TabsTrigger value="requirements">조건{!current && !ready ? ` ${st.missing.length}` : ''}</TabsTrigger><TabsTrigger value="skills">스킬 {skills.length}</TabsTrigger><TabsTrigger value="mastery">숙달</TabsTrigger>
        </TabsList></Tabs>
        <div className="job-detail-body">
            {tab === 'overview' && <>
                <p>{j.desc}</p>
                {from && <p className="job-cross">{from}에서 이어지는 직업입니다.</p>}
                <section className="job-detail-section job-compact"><h3>직업 보정 · {j.role}</h3>
                    <div className="requirements">{bonuses.map(key => <span key={key} className={growsWithMastery(j, key) ? 'met' : 'negative'}>{STAT_LABELS[key]} {jobBonusText(j, key, mastered)}</span>)}{!!j.expBonus && <span className="met">경험치 {percent(j.expBonus, 2, true)}</span>}{j.crit > 0 && <span className="met">치명타 {percent(j.crit, 2, true)}p</span>}{Object.entries(j.penalties || {}).map(([key, n]) => <span className="negative" key={key}>{STAT_LABELS[key as keyof Stats]} {statDeltaDisplay(key, n)}</span>)}{!bonuses.length && !j.expBonus && !j.crit && !j.penalties && <span>보정 없음</span>}</div>
                </section>
            </>}
            {tab === 'requirements' && <section className="job-detail-section">
                {st.status === 'mastered' && <p className="job-cross positive">숙달한 직업이라 레벨·능력치·숙련·문 조건 없이 전직할 수 있습니다.</p>}
                {current && <p className="footnote">지금 이 직업입니다.</p>}
                <ul className="job-req-list">{st.req.map(r => <li key={r.label} className={r.met ? 'met' : 'missing'}>
                    <span>{r.met ? <Check size={13}/> : <Lock size={13}/>} {r.label}</span>
                    {r.target !== undefined ? <Meter value={Math.min(r.value || 0, r.target)} max={Math.max(1, r.target)} label={`${format(Math.floor(r.value || 0))} / ${format(r.target)}`}/> : <small>{r.met ? '열림' : '닫힘'}</small>}
                </li>)}</ul>
            </section>}
            {tab === 'skills' && <section className="job-detail-section"><div className="vocation-skills">{skills.map(sk => <span key={sk.id}><SkillIcon id={sk.id}/>{sk.name}<small>{sk.type === 'active' ? '액티브' : '패시브'} · Lv.{sk.level}{sk.unlockJobMastery ? ` · 직업 숙련 ${format(sk.unlockJobMastery)}에 해금` : ''}</small><small className="skill-effect-brief">{skillVeiled(s, sk) ? '??? · 숙련 Lv.1에 공개' : skillBrief(sk)}</small></span>)}{!skills.length && <p className="footnote">전용 스킬 없이 공용·계승 스킬을 조합하는 직업입니다.</p>}</div></section>}
            {tab === 'mastery' && <>
                <section className="job-detail-section">
                    <Meter value={Math.min(xp, target)} max={target} label={mastered ? '직업 숙련 · 숙달 완료' : `직업 숙련 · 숙달까지 ${format(target - xp)}`}/>
                    <p className="footnote">숙달하면 이 직업으로는 조건 없이 언제든 다시 전직할 수 있습니다.</p>
                    <div className="job-section-heading"><h3>숙달 전후 보너스</h3><TooltipProvider><Tooltip><TooltipTrigger asChild><button type="button" className="info-trigger" aria-label="직업 숙달 보너스 안내"><Info size={16}/></button></TooltipTrigger><TooltipContent className="game-tooltip"><p>숙련 목표를 채우면 이 직업의 체력·공격·방어 보너스가 강화됩니다. 이 직업을 선택한 동안에만 적용되며, 전직 후에도 숙련 기록은 유지됩니다.</p></TooltipContent></Tooltip></TooltipProvider></div>
                    {bonuses.length > 0 ? <table className="job-bonus-table"><thead><tr><th>능력치</th><th>숙달 전</th><th>숙달 후</th></tr></thead><tbody>{bonuses.map(key => <tr key={key}><th>{STAT_LABELS[key]}</th><td className={growsWithMastery(j, key) ? '' : 'negative'}>{jobBonusText(j, key)}</td><td className={growsWithMastery(j, key) ? 'positive' : 'negative'}>{jobBonusText(j, key, true)}</td></tr>)}</tbody></table> : <p className="footnote">숙달로 강화되는 능력치가 없습니다.</p>}
                    {!grows && bonuses.length > 0 && <p className="footnote">숙달 보너스 배율이 없습니다.</p>}
                </section>
                <section className="job-detail-section"><h3>직업 단련 · {dedication} / {dedicationTargets.length}</h3><p className="footnote">숙달 이후에도 이 직업의 체력·양 공격·양 방어가 단계마다 4%씩 추가됩니다.</p><Meter value={Math.min(xp, dedicationTargets[dedication] || dedicationTargets.at(-1)!)} max={dedicationTargets[dedication] || dedicationTargets.at(-1)!} label="누적 직업 숙련"/></section>
            </>}
        </div>
        <div className="job-sheet-footer">
            {current ? <button className="secondary" disabled>현재 직업</button> : <AlertDialog><AlertDialogTrigger asChild><button className="primary" disabled={busy || !ready}>{ready ? '이 직업으로 전직' : `전직 조건 부족 ${st.missing.length}`}</button></AlertDialogTrigger>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{j.name}(으)로 전직할까요?</AlertDialogTitle><AlertDialogDescription>새 직업의 기본 기술은 무료로 해금됩니다. 계승하지 않은 이전 직업의 기술은 해제되지만 해금·성장·숙련 기록은 남습니다. 전투 중이면 현재 적을 보상 없이 정리하고, 던전 중이면 보상 없이 귀환합니다.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction onClick={() => send({ type: 'job', id: j.id })}>전직하기</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>}
            <button className="secondary" disabled={busy || current || s.unlockedJobs.includes(j.id)} onClick={() => send({ type: 'growthGoal', id: j.id, value: 'job' })}>{s.growthGoal?.kind === 'job' && s.growthGoal.id === j.id ? '목표로 지정됨' : '목표로 지정'}</button>
            {onCompare && <button className="secondary" disabled={!compared && compareFull} onClick={() => onCompare(j.id)}>{compared ? '비교에서 빼기' : compareFull ? '비교 가득 참(3)' : '비교에 추가'}</button>}
        </div>
    </article>;
}
