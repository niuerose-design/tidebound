'use client';
import { Check, Lock, X } from 'lucide-react';
import type { State, Stats } from '@/game/types';
import type { Job } from '@/game/data/classes';
import { SKILLS } from '@/game/data/skills';
import { STAT_LABELS, statDeltaDisplay, percent } from '@/game/data/progression';
import { jobCombatMultiplier } from '@/game/systems/progression';
import { jobStatus, STATUS_LABEL, treeName } from './job-status';

const bonusKeys = ['attack', 'magic', 'hp', 'defense', 'resist'] as const;

/** 비교: 최대 3개 직업의 보정(숙달 전·후), 전직 조건, 전용 스킬을 나란히 보여줍니다. */
export function JobCompare({ s, jobs, onRemove, onClear }: { s: State; jobs: Job[]; onRemove: (id: string) => void; onClear: () => void }) {
    if (!jobs.length) return null;
    const cell = (j: Job, key: typeof bonusKeys[number]) => j[key] === 1 ? '—' : `${percent(jobCombatMultiplier(j, j[key]) - 1, 1, true)} → ${percent(jobCombatMultiplier(j, j[key], true) - 1, 1, true)}`;
    return <section className="panel job-compare" aria-label="직업 비교">
        <div className="job-compare-head"><h2 className="job-column-title">직업 비교 · {jobs.length} / 3</h2><button type="button" className="text-button" onClick={onClear}>모두 비우기</button></div>
        <div className="job-compare-scroll"><table className="job-compare-table">
            <thead><tr><th/>{jobs.map(j => <th key={j.id}><strong>{j.name}</strong><small>{j.tier ? `${j.tier}차` : '시작'} · {treeName(j.tree)} · {STATUS_LABEL(jobStatus(s, j))}</small><button type="button" aria-label={`${j.name} 비교에서 빼기`} onClick={() => onRemove(j.id)}><X size={14}/></button></th>)}</tr></thead>
            <tbody>
                <tr className="job-compare-section"><th colSpan={jobs.length + 1}>보정 (숙달 전 → 숙달 후)</th></tr>
                {bonusKeys.map(key => <tr key={key}><th>{STAT_LABELS[key]}</th>{jobs.map(j => <td key={j.id} className={j[key] < 1 ? 'negative' : ''}>{cell(j, key)}</td>)}</tr>)}
                <tr><th>치명타 · 경험치</th>{jobs.map(j => <td key={j.id}>{[j.crit ? `치명 ${percent(j.crit, 1, true)}p` : '', j.expBonus ? `경험치 ${percent(j.expBonus, 1, true)}` : ''].filter(Boolean).join(' · ') || '—'}</td>)}</tr>
                <tr><th>페널티</th>{jobs.map(j => <td key={j.id} className="negative">{Object.entries(j.penalties || {}).map(([k, n]) => `${STAT_LABELS[k as keyof Stats]} ${statDeltaDisplay(k, n)}`).join(' · ') || '—'}</td>)}</tr>
                <tr className="job-compare-section"><th colSpan={jobs.length + 1}>전직 조건</th></tr>
                <tr><th>조건</th>{jobs.map(j => <td key={j.id}><ul className="job-compare-req">{jobStatus(s, j).req.map(r => <li key={r.label} className={r.met ? 'met' : 'missing'}>{r.met ? <Check size={12}/> : <Lock size={12}/>} {r.label}</li>)}</ul></td>)}</tr>
                <tr className="job-compare-section"><th colSpan={jobs.length + 1}>전용 스킬</th></tr>
                <tr><th>스킬</th>{jobs.map(j => <td key={j.id}>{SKILLS.filter(sk => sk.job === j.id).map(sk => `${sk.name}(${sk.type === 'active' ? '액티브' : '패시브'} Lv.${sk.level})`).join(', ') || '없음'}</td>)}</tr>
            </tbody>
        </table></div>
    </section>;
}
