'use client';
/** v3.408 모험 안내(새 토대). 접을 수 있는 짧은 튜토리얼: 새 세이브에만 보이고, 한 번 만족한 단계는 기록으로 남아 되돌아가지 않습니다. 늘 접힌 한 줄로 시작하고 이 화면에서만 펼칩니다(서버 저장 없음). */
import type { PanelProps } from '@/components/game/panel-props';
import { Check, ChevronDown, ChevronRight, ChevronUp, Compass, HelpCircle, X } from 'lucide-react';
import { TUTORIAL_STEPS, tutorialProgress, tutorialStepDone, nextTutorialStep } from '@/game/systems/guidance';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function TutorialCard({ s, send, busy, setView }: PanelProps) {
    const [expanded, setExpanded] = useState(false);
    if (!s.tutorial || s.tutorial.skipped) return null;
    const done = tutorialProgress(s), next = nextTutorialStep(s);
    if (!next) return null;
    const hidden = !expanded, index = TUTORIAL_STEPS.indexOf(next) + 1;
    return <section className="grid gap-2 rounded-l border border-line border-l-[3px] border-l-gold-ink bg-surface-2 px-4 py-3 text-ink-1 shadow-1" aria-label="모험 안내">
        <div className="flex flex-wrap items-center gap-2.5 text-s">
            <Compass size={16} className="text-gold-ink"/><strong className="text-gold-ink">모험 안내 · {done} / {TUTORIAL_STEPS.length}</strong>
            <span className="min-w-0 flex-1 text-ink-3">다음: {next.title}</span>
            <Button type="button" size="icon-xs" variant="ghost" className="pointer-coarse:min-h-11 pointer-coarse:min-w-11" disabled={busy} aria-label={hidden ? '안내 펼치기' : '안내 접기'} onClick={() => setExpanded(v => !v)}>{hidden ? <ChevronDown size={15}/> : <ChevronUp size={15}/>}</Button>
            <Button type="button" size="icon-xs" variant="ghost" className="pointer-coarse:min-h-11 pointer-coarse:min-w-11" disabled={busy} aria-label="안내 건너뛰기" title="건너뛰기 (도감 · 업적 화면에서 다시 볼 수 있음)" onClick={() => send({ type: 'tutorial', id: 'skip' })}><X size={15}/></Button>
        </div>
        {!hidden && <>
            <ol className="flex flex-wrap gap-1.5">{TUTORIAL_STEPS.map(step => { const ok = tutorialStepDone(s, step), cur = step.id === next.id; return <li key={step.id} className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs', ok ? 'border-ok/50 text-ok' : cur ? 'border-gold-ink/60 text-gold-ink' : 'border-line text-ink-3')}>{ok ? <Check size={12}/> : <span className={cn('size-1.5 rounded-full', cur ? 'bg-gold-ink' : 'bg-ink-3/50')}/>}{step.title}</li>; })}</ol>
            <p className="text-s"><b>{index}. {next.title}</b> — {next.hint}{next.reward && <em className="not-italic text-gold-ink"> · 보상 {[next.reward.pearls ? `세계석 ${next.reward.pearls}` : '', next.reward.sp ? `SP ${next.reward.sp}` : ''].filter(Boolean).join(' · ')}</em>}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {setView && next.view !== 'battle' && <Button type="button" size="xs" variant="ghost" className="text-accent pointer-coarse:min-h-11" onClick={() => setView(next.view)}>{next.title} 화면 열기 <ChevronRight size={13}/></Button>}
                {setView && <Button type="button" size="xs" variant="ghost" className="text-accent pointer-coarse:min-h-11" onClick={() => setView('help')}><HelpCircle size={13}/> 도움말</Button>}
            </div>
            <small className="text-xs leading-relaxed text-ink-3">강제는 아니지만 단계를 완료하면 보상(세계석·SP)이 바로 들어옵니다. 이미 한 단계는 자동으로 완료되고, 한 번 완료한 단계는 되돌아가지 않습니다.</small>
        </>}
    </section>;
}
