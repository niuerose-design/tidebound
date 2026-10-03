'use client';
import type { PanelProps } from './panel-props';
import { Check, Flag } from 'lucide-react';
import type { State } from '@/game/types';
import { goalProgress, goalSuggestions } from '@/game/systems/goals';
import { TUTORIAL_STEPS, tutorialProgress } from '@/game/systems/guidance';
import { Meter } from './shared';

/** 튜토리얼이 보이는 동안인지. 이때 장기 목표는 한 줄로 접어 둡니다. */
export const tutorialActive = (s: State) => !!s.tutorial && !s.tutorial.skipped && tutorialProgress(s) < TUTORIAL_STEPS.length;

export function GrowthGoals({ s, send, busy, setView }: PanelProps) {
    const goal = s.growthGoal, p = goalProgress(s), next = goalSuggestions(s);
    const suggestions = <div className="growth-suggestions">
        {next.skill && <button className="secondary" disabled={busy} onClick={() => send({ type: 'growthGoal', id: next.skill!.id, value: 'skill' })}>숙련 · {next.skill.name}{s.skills.includes(next.skill.id) ? ' (장착 중)' : ''}</button>}
        {next.job && <button className="secondary" disabled={busy} onClick={() => send({ type: 'growthGoal', id: next.job!.id, value: 'job' })}>전직 · {next.job.name}</button>}
        {next.dungeon && <button className="secondary" disabled={busy} onClick={() => send({ type: 'growthGoal', id: next.dungeon!.id, value: 'dungeon' })}>도전 · {next.dungeon.name}</button>}
        {!next.skill && !next.job && !next.dungeon && <span className="growth-none">지금 추천할 목표가 없습니다. 레벨을 올리면 새 목표가 열립니다.</span>}
    </div>;
    const newlyOpened = !goal && !!s.tutorial && !s.tutorial.skipped && tutorialProgress(s) >= TUTORIAL_STEPS.length;
    return <section className="panel growth-goals" aria-label="장기 목표">
        <div className="section-title"><h2><Flag size={15}/> 장기 목표</h2>{goal && <button className="text-button" disabled={busy} onClick={() => send({ type: 'growthGoal', id: 'none' })}>목표 해제</button>}</div>
        {p ? <>
            <strong>{p.done ? '달성 · ' : ''}{p.title}</strong><p>{p.detail}</p>
            {p.steps ? <ol className="goal-steps">{p.steps.map(x => <li key={x.label} className={x.done ? 'done' : ''}>{x.done ? <Check size={12}/> : <span/>}{x.label}</li>)}</ol> : <Meter value={Math.min(p.value, p.max)} max={p.max}/>}
            <div className="growth-goal-actions">
                {p.done && goal?.kind === 'skill' && <button className="primary small" disabled={busy} onClick={() => send({ type: 'growthGoal', id: goal.id, value: 'skill' })}>다음 단계로 이어가기</button>}
                {setView && <button className="text-button" onClick={() => setView(p.view)}>{p.done ? '다음 목표 고르기' : '목표 화면 열기'} →</button>}
            </div>
            <details open={p.done}><summary>다른 목표 보기</summary>{suggestions}</details>
        </> : <><p>{newlyOpened ? '항해 안내를 마쳤습니다. 이제 장기 목표를 정해 보세요.' : '지금 도전할 수 있는 목표입니다. 스킬·전직·던전 화면에서도 목표로 정할 수 있습니다.'}</p>{suggestions}</>}
    </section>;
}
