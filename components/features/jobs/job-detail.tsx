'use client';
/** v3.397 ③ 직업 상세(새 토대): 개요 · 조건 · 스킬 · 숙달 탭, 전직(ConfirmAction) · 목표 · 비교. 서버 행동(job · jobGoal)은 전과 같습니다. */
import { useState } from 'react';
import { Check, Flag, Info, Lock, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatBar, ConfirmAction, formatExact } from '@/components/ui/game';
import type { State, Action, Stats } from '@/game/types';
import { jobTags, type Job, constraintDeviceLabels } from '@/game/data/classes';
import { SKILLS } from '@/game/data/skills';
import { hanjaReading, skillBrief } from '@/game/systems/skill-description';
import { JobArt } from '@/components/game/art';
import { SkillIcon } from '@/components/game/shared';
import { STAT_LABELS, statDeltaDisplay, percent } from '@/game/data/progression';
import { vocationTargets, thresholdRank } from '@/game/data/long-term';
import { jobMasteryTarget, jobMasteryBoost, skillVeiled, skillExclusiveLabel } from '@/game/systems/progression';
import { statusReader, STATUS_LABEL, canEnter, crossParent, treeName, tierName, jobRevealed, JOB_BONUS_KEYS, hasJobBonus, growsWithMastery, jobBonusText, jobGoalOf } from '@/components/game/jobs/job-status';
import { cn } from '@/lib/utils';
import { ColumnTitle, STATUS_CLS } from './parts';

type Tab = 'overview' | 'requirements' | 'skills' | 'mastery';
const fmt = formatExact;
const Chip = ({ children, tone }: { children: React.ReactNode; tone?: 'ok' | 'danger' }) => <span className={cn('rounded-s border px-1.5 py-0.5 text-xs', tone === 'ok' ? 'border-ok/40 text-ok' : tone === 'danger' ? 'border-danger/40 text-danger' : 'border-line text-ink-2')}>{children}</span>;
const Section = ({ title, children }: { title?: React.ReactNode; children: React.ReactNode }) => <section className="grid gap-2">{title && <h3 className="text-s font-semibold">{title}</h3>}{children}</section>;

export function JobDetail({ j, s, send, busy, onClose, onCompare, compared, compareFull }: { j: Job; s: State; send: (a: Action) => void; busy: boolean; onClose?: () => void; onCompare?: (id: string) => void; compared?: boolean; compareFull?: boolean }) {
    const [tab, setTab] = useState<Tab>('overview');
    const close = onClose && <Button type="button" size="icon-sm" variant="ghost" className="absolute right-2 top-2" aria-label="닫기" onClick={onClose}><X size={18}/></Button>;
    // 미발견 히든 직업: 이름·조건을 숨기고 차수 자리와 힌트 한 줄만 보여줍니다.
    if (!jobRevealed(s, j)) return <article className="relative grid content-start gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1" aria-label="미발견 직업">
        {close}<ColumnTitle no="③">직업 상세</ColumnTitle>
        <h2 className="font-display text-l font-bold">???</h2>
        <p className="text-xs text-ink-3">{tierName(j)} · {treeName(j.tree)}</p>
        <p className="text-s text-ink-2">{j.hint || '아직 드러나지 않은 직업입니다.'}</p>
        <p className="text-xs leading-relaxed text-ink-3">숨은 조건(플레이 기록)을 만족하거나 관문 조건(환생 횟수·선행 직업 숙련)을 모두 채우면 이름과 조건이 드러납니다. 한 번 전직하거나 숙달하면 계속 보입니다.</p>
    </article>;
    const st = statusReader(s)(j), current = st.status === 'current', ready = canEnter(st);
    const xp = s.jobMastery[j.id] || 0, target = jobMasteryTarget(j), mastered = xp >= target;
    const dedicationTargets = vocationTargets(target), dedication = thresholdRank(xp, dedicationTargets);
    const bonuses = JOB_BONUS_KEYS.filter(key => hasJobBonus(j, key)), grows = bonuses.some(key => growsWithMastery(j, key)) && jobMasteryBoost(j) > 0;
    const skills = SKILLS.filter(sk => sk.job === j.id), from = crossParent(j);
    // v3.166 목표 직업: 조건과 무관하게 찍어 두면 항로도 · 목록 · 계보 카드에 깃발이 붙고, 전직하면 저절로 내려갑니다.
    const isGoal = jobGoalOf(s)?.id === j.id;
    return <article className={cn('relative grid content-start gap-3 rounded-l border bg-surface-2 p-4 shadow-1', current ? 'border-accent/60' : 'border-line')} aria-label={`${j.name} 상세`}>
        {close}<ColumnTitle no="③">직업 상세</ColumnTitle>
        <div className="flex items-center gap-3"><JobArt job={j} size={44}/><div className="grid min-w-0 gap-0.5"><h2 className="flex flex-wrap items-center gap-2 font-display text-l font-bold" title={hanjaReading(j.name)}>{j.name}<span className={cn('rounded-s border border-current px-1.5 text-xs font-normal', STATUS_CLS[st.status])}>{STATUS_LABEL(st)}</span>{isGoal && <span className="inline-flex items-center gap-0.5 rounded-s border border-gold-ink/60 px-1.5 text-xs font-normal text-gold-ink"><Flag size={11}/> 목표</span>}</h2>
            <p className="text-xs text-ink-3">{tierName(j)} · {[treeName(j.tree), ...jobTags(j).filter(t => t !== treeName(j.tree))].join(' · ')}{j.hidden ? ' · 히든' : ''}</p></div></div>
        <p className="font-display text-s italic text-ink-2">{j.title}</p>
        <Tabs value={tab} onValueChange={v => setTab(v as Tab)}><TabsList className="h-auto flex-wrap">
            <TabsTrigger value="overview" className="pointer-coarse:min-h-11">개요</TabsTrigger><TabsTrigger value="requirements" className="pointer-coarse:min-h-11">조건{!current && !ready ? ` ${st.missing.length}` : ''}</TabsTrigger><TabsTrigger value="skills" className="pointer-coarse:min-h-11">스킬 {skills.length}</TabsTrigger><TabsTrigger value="mastery" className="pointer-coarse:min-h-11">숙달</TabsTrigger>
        </TabsList></Tabs>
        <div className="grid gap-3 text-s">
            {tab === 'overview' && <>
                <p className="leading-relaxed text-ink-2">{j.desc}</p>
                {j.constraint && <Section title={`제약 · ${j.constraint.label}`}><p className="text-xs text-ink-3">{j.constraint.desc} PvE 균형 대상이 아닌 계승·결투용 직업입니다.</p><div className="flex flex-wrap gap-1">{constraintDeviceLabels(j.constraint.devices).map(t => <Chip key={t} tone="ok">{t}</Chip>)}</div></Section>}
                {from && <p className="text-xs text-ink-3">{from}에서 이어지는 직업입니다.</p>}
                <Section title={`직업 보정 · ${j.role}`}><div className="flex flex-wrap gap-1">{bonuses.map(key => <Chip key={key} tone={growsWithMastery(j, key) ? 'ok' : 'danger'}>{STAT_LABELS[key]} {jobBonusText(j, key, mastered)}</Chip>)}{!!j.expBonus && <Chip tone="ok">경험치 {percent(j.expBonus, 2, true)}</Chip>}{j.crit > 0 && <Chip tone="ok">치명타 {percent(j.crit, 2, true)}p</Chip>}{Object.entries(j.penalties || {}).map(([key, n]) => <Chip tone="danger" key={key}>{STAT_LABELS[key as keyof Stats]} {statDeltaDisplay(key, n)}</Chip>)}{!bonuses.length && !j.expBonus && !j.crit && !j.penalties && <Chip>보정 없음</Chip>}</div></Section>
            </>}
            {tab === 'requirements' && <Section>
                {st.status === 'mastered' && <p className="text-xs text-ok">숙달한 직업이라 레벨·능력치·숙련·숨은 조건 없이 전직할 수 있습니다.</p>}
                {current && <p className="text-xs text-ink-3">지금 이 직업입니다.</p>}
                <ul className="grid gap-2">{st.req.map(r => <li key={r.label} className={cn('grid gap-1 rounded-m bg-surface-1 p-2', r.met ? 'text-ok' : 'text-ink-2')}>
                    <span className="inline-flex items-center gap-1 text-xs">{r.met ? <Check size={13}/> : <Lock size={13}/>} {r.label}</span>
                    {r.target !== undefined ? <StatBar size="s" tone={r.met ? 'accent' : 'warn'} value={Math.min(r.value || 0, r.target)} max={Math.max(1, r.target)} label={`${fmt(Math.floor(r.value || 0))} / ${fmt(r.target)}`} showText={false}/> : <small className="text-xs text-ink-3">{r.met ? '열림' : '닫힘'}</small>}
                </li>)}</ul>
            </Section>}
            {tab === 'skills' && <Section><ul className="grid gap-2">{skills.map(sk => <li key={sk.id} className="flex items-start gap-2 rounded-m bg-surface-1 p-2"><SkillIcon id={sk.id} size={28}/><span className="grid min-w-0 gap-0.5"><b className="text-s">{sk.name}</b><small className="text-xs text-ink-3">{sk.type === 'active' ? '액티브' : '패시브'} · Lv.{sk.level}{sk.unlockJobMastery ? ` · 직업 숙련 ${fmt(sk.unlockJobMastery)}에 해금` : ''}{sk.exclusiveLineage ? ` · ${skillExclusiveLabel(sk)}` : ''}</small><small className="text-xs text-ink-2">{skillVeiled(s, sk) ? '??? · 숙련 Lv.1에 공개' : skillBrief(sk)}</small></span></li>)}{!skills.length && <p className="text-xs text-ink-3">전용 스킬 없이 공용·계승 스킬을 조합하는 직업입니다.</p>}</ul></Section>}
            {tab === 'mastery' && <>
                <Section>
                    <StatBar value={Math.min(xp, target)} max={target} tone="exp" label={mastered ? '직업 숙련 · 숙달 완료' : `직업 숙련 · 숙달까지 ${fmt(target - xp)}`}/>
                    <p className="text-xs text-ink-3">숙달하면 이 직업으로는 조건 없이 언제든 다시 전직할 수 있습니다.</p>
                    <div className="flex items-center gap-1"><h3 className="text-s font-semibold">숙달 전후 보너스</h3><TooltipProvider><Tooltip><TooltipTrigger asChild><button type="button" className="grid size-8 place-items-center rounded-full text-ink-3 hover:text-ink-1" aria-label="직업 숙달 보너스 안내"><Info size={15}/></button></TooltipTrigger><TooltipContent className="max-w-64 text-xs"><p>숙련 목표를 채우면 이 직업의 체력·공격·방어 보너스가 강화됩니다. 이 직업을 선택한 동안에만 적용되며, 전직 후에도 숙련 기록은 유지됩니다.</p></TooltipContent></Tooltip></TooltipProvider></div>
                    {bonuses.length > 0 ? <Table><TableHeader><TableRow><TableHead>능력치</TableHead><TableHead>숙달 전</TableHead><TableHead>숙달 후</TableHead></TableRow></TableHeader><TableBody>{bonuses.map(key => <TableRow key={key}><TableCell>{STAT_LABELS[key]}</TableCell><TableCell className={cn('font-num', !growsWithMastery(j, key) && 'text-danger')}>{jobBonusText(j, key)}</TableCell><TableCell className={cn('font-num', growsWithMastery(j, key) ? 'text-ok' : 'text-danger')}>{jobBonusText(j, key, true)}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-xs text-ink-3">숙달로 강화되는 능력치가 없습니다.</p>}
                    {!grows && bonuses.length > 0 && <p className="text-xs text-ink-3">숙달 보너스 배율이 없습니다.</p>}
                </Section>
                <Section title={`직업 단련 · ${dedication} / ${dedicationTargets.length}`}><p className="text-xs text-ink-3">숙달 이후에도 이 직업의 체력·마나·양 공격·양 방어가 단계마다 4%씩 추가됩니다.</p><StatBar size="s" tone="exp" value={Math.min(xp, dedicationTargets[dedication] || dedicationTargets.at(-1)!)} max={dedicationTargets[dedication] || dedicationTargets.at(-1)!} label="누적 직업 숙련"/></Section>
            </>}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            {current ? <Button type="button" size="sm" variant="outline" disabled>현재 직업</Button>
                : <ConfirmAction variant="default" className="bg-accent text-accent-ink hover:bg-accent/90" label={ready ? '이 직업으로 전직' : `전직 조건 부족 ${st.missing.length}`} title={`${j.name}(으)로 전직할까요?`} description="새 직업의 기본 기술은 무료로 해금됩니다. 계승하지 않은 이전 직업의 기술은 해제되지만 해금·성장·숙련 기록은 남습니다. 전투 중이면 현재 적을 보상 없이 정리하고, 던전 중이면 보상 없이 귀환합니다." confirmLabel="전직하기" disabled={busy || !ready} onConfirm={() => send({ type: 'job', id: j.id })}/>}
            {!current && <Button type="button" size="sm" variant="outline" className={cn(isGoal && 'border-gold-ink/60 text-gold-ink')} disabled={busy} aria-pressed={isGoal} onClick={() => send({ type: 'jobGoal', id: isGoal ? '' : j.id })}><Flag size={14}/> {isGoal ? '목표 해제' : '목표로 설정'}</Button>}
            {onCompare && <Button type="button" size="sm" variant="outline" disabled={!compared && compareFull} onClick={() => onCompare(j.id)}>{compared ? '비교에서 빼기' : compareFull ? '비교 가득 참(3)' : '비교에 추가'}</Button>}
        </div>
    </article>;
}
