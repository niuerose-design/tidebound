'use client';
import type { PanelProps } from './panel-props';
import { Check, ChevronDown, ChevronRight, ChevronUp, Compass, HelpCircle, X } from 'lucide-react';
import { TUTORIAL_STEPS, tutorialProgress, tutorialStepDone, nextTutorialStep } from '@/game/systems/guidance';
import { useState } from 'react';

/** 접을 수 있는 짧은 튜토리얼. 새 세이브에만 보이고, 한 번 만족한 단계는 기록으로 남아 되돌아가지 않습니다. 보상은 없습니다. */
export function TutorialCard({ s, send, busy, setView }: PanelProps) {
    // v27.88 모바일(767px 이하)은 접힌 한 줄로 시작하고 이 화면에서만 펼칩니다(서버 저장 없음).
    // v3.254 데스크톱도 같은 방식: 전투 장면을 가리지 않게 늘 접힌 한 줄(진행 · 다음 단계)로 시작하고, 누르면 이 화면에서만 펼칩니다.
    const [expanded, setExpanded] = useState(false);
    if (!s.tutorial || s.tutorial.skipped) return null;
    const done = tutorialProgress(s), next = nextTutorialStep(s);
    if (!next) return null;
    const hidden = !expanded, index = TUTORIAL_STEPS.indexOf(next) + 1;
    const toggle = () => setExpanded(v => !v);
    return <section className={`panel tutorial-card ${hidden ? 'folded' : ''}`} aria-label="모험 안내">
        <div className="tutorial-head">
            <Compass size={16}/><strong>모험 안내 · {done} / {TUTORIAL_STEPS.length}</strong>
            <span>다음: {next.title}</span>
            <button className="icon-button" disabled={busy} aria-label={hidden ? '안내 펼치기' : '안내 접기'} onClick={toggle}>{hidden ? <ChevronDown size={15}/> : <ChevronUp size={15}/>}</button>
            <button className="icon-button" disabled={busy} aria-label="안내 건너뛰기" title="건너뛰기 (도감 · 업적 화면에서 다시 볼 수 있음)" onClick={() => send({ type: 'tutorial', id: 'skip' })}><X size={15}/></button>
        </div>
        {!hidden && <>
            <ol className="tutorial-steps">{TUTORIAL_STEPS.map(step => { const ok = tutorialStepDone(s, step); return <li key={step.id} className={ok ? 'done' : step.id === next.id ? 'current' : ''}>{ok ? <Check size={12}/> : <span/>}{step.title}</li>; })}</ol>
            <p><b>{index}. {next.title}</b> — {next.hint}{next.reward && <em className="tutorial-reward"> · 보상 {[next.reward.pearls ? `세계석 ${next.reward.pearls}` : '', next.reward.sp ? `SP ${next.reward.sp}` : ''].filter(Boolean).join(' · ')}</em>}</p>
            <div className="tutorial-actions">
                {setView && next.view !== 'battle' && <button className="text-button" onClick={() => setView(next.view)}>{next.title} 화면 열기 <ChevronRight size={13}/></button>}
                {setView && <button className="text-button" onClick={() => setView('help')}><HelpCircle size={13}/> 도움말</button>}
            </div>
            <small>강제는 아니지만 단계를 완료하면 보상(세계석·SP)이 바로 들어옵니다. 이미 한 단계는 자동으로 완료되고, 한 번 완료한 단계는 되돌아가지 않습니다.</small>
        </>}
    </section>;
}
