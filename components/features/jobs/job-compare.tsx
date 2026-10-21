'use client';
/** v3.397 직업 비교: 최대 3개 직업의 보정(숙달 전·후), 전직 조건, 전용 스킬을 나란히. */
import { Check, Lock, X } from 'lucide-react';
import type { State, Stats } from '@/game/types';
import type { Job } from '@/game/data/classes';
import { SKILLS } from '@/game/data/skills';
import { STAT_LABELS, statDeltaDisplay, percent } from '@/game/data/progression';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { statusReader, STATUS_LABEL, treeName, tierName, JOB_BONUS_KEYS, hasJobBonus, jobBonusText } from '@/components/game/jobs/job-status';
import { cn } from '@/lib/utils';

export function JobCompare({ s, jobs, onRemove, onClear }: { s: State; jobs: Job[]; onRemove: (id: string) => void; onClear: () => void }) {
    if (!jobs.length) return null;
    const cell = (j: Job, key: typeof JOB_BONUS_KEYS[number]) => !hasJobBonus(j, key) ? '—' : `${jobBonusText(j, key)} → ${jobBonusText(j, key, true)}`;
    const group = (label: string) => <TableRow className="bg-surface-1"><TableCell colSpan={jobs.length + 1} className="text-xs font-semibold text-ink-2">{label}</TableCell></TableRow>;
    return <section className="grid gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1" aria-label="직업 비교">
        <div className="flex items-center justify-between gap-2"><h2 className="font-display text-m font-bold">직업 비교 · {jobs.length} / 3</h2><Button type="button" size="sm" variant="ghost" onClick={onClear}>모두 비우기</Button></div>
        <div className="overflow-x-auto"><Table className="min-w-[560px]">
            <TableHeader><TableRow><TableHead/>{jobs.map(j => <TableHead key={j.id}><div className="flex items-start gap-1"><div className="grid gap-0.5"><strong className="text-s text-ink-1">{j.name}</strong><small className="text-xs font-normal text-ink-3">{tierName(j)} · {treeName(j.tree)} · {STATUS_LABEL(statusReader(s)(j))}</small></div><Button type="button" size="icon-xs" variant="ghost" aria-label={`${j.name} 비교에서 빼기`} onClick={() => onRemove(j.id)}><X size={14}/></Button></div></TableHead>)}</TableRow></TableHeader>
            <TableBody>
                {group('보정 (숙달 전 → 숙달 후)')}
                {JOB_BONUS_KEYS.map(key => <TableRow key={key}><TableCell className="text-ink-2">{STAT_LABELS[key]}</TableCell>{jobs.map(j => <TableCell key={j.id} className={cn('font-num', j[key] < 1 && 'text-danger')}>{cell(j, key)}</TableCell>)}</TableRow>)}
                <TableRow><TableCell className="text-ink-2">치명타 · 경험치</TableCell>{jobs.map(j => <TableCell key={j.id}>{[j.crit ? `치명 ${percent(j.crit, 1, true)}p` : '', j.expBonus ? `경험치 ${percent(j.expBonus, 1, true)}` : ''].filter(Boolean).join(' · ') || '—'}</TableCell>)}</TableRow>
                <TableRow><TableCell className="text-ink-2">페널티</TableCell>{jobs.map(j => <TableCell key={j.id} className="text-danger">{Object.entries(j.penalties || {}).map(([k, n]) => `${STAT_LABELS[k as keyof Stats]} ${statDeltaDisplay(k, n)}`).join(' · ') || '—'}</TableCell>)}</TableRow>
                {group('전직 조건')}
                <TableRow><TableCell className="text-ink-2">조건</TableCell>{jobs.map(j => <TableCell key={j.id}><ul className="grid gap-0.5">{statusReader(s)(j).req.map(r => <li key={r.label} className={cn('inline-flex items-center gap-1 text-xs', r.met ? 'text-ok' : 'text-ink-3')}>{r.met ? <Check size={12}/> : <Lock size={12}/>} {r.label}</li>)}</ul></TableCell>)}</TableRow>
                {group('전용 스킬')}
                <TableRow><TableCell className="text-ink-2">스킬</TableCell>{jobs.map(j => <TableCell key={j.id} className="text-xs">{SKILLS.filter(sk => sk.job === j.id).map(sk => `${sk.name}(${sk.type === 'active' ? '액티브' : '패시브'} Lv.${sk.level})`).join(', ') || '없음'}</TableCell>)}</TableRow>
            </TableBody>
        </Table></div>
    </section>;
}
