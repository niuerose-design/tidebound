'use client';
import type { PanelProps } from './panel-props';
import { Check, ChevronDown, ChevronUp, Compass, ScrollText, X } from 'lucide-react';
import type { State } from '@/game/types';
import { VOYAGE_LOG } from '@/game/data/voyage-log';
import { TUTORIAL_STEPS, tutorialProgress } from '@/game/systems/guidance';
import { Heading } from './shared';


/** 접을 수 있는 짧은 튜토리얼. 새 세이브에만 보이고, 완료한 단계는 저장 상태로 자동 인정합니다. 보상은 없습니다. */
export function TutorialCard({ s, send, busy, setView }: PanelProps) {
    if (!s.tutorial || s.tutorial.skipped) return null;
    const done = tutorialProgress(s);
    if (done >= TUTORIAL_STEPS.length) return null;
    const next = TUTORIAL_STEPS.find(x => !x.done(s))!;
    const hidden = !!s.tutorial.hidden;
    return <section className={`panel tutorial-card ${hidden ? 'folded' : ''}`} aria-label="항해 안내">
        <div className="tutorial-head">
            <Compass size={16}/><strong>항해 안내 · {done} / {TUTORIAL_STEPS.length}</strong>
            <span>다음: {next.title}</span>
            <button className="icon-button" disabled={busy} aria-label={hidden ? '안내 펼치기' : '안내 접기'} onClick={() => send({ type: 'tutorial', id: hidden ? 'show' : 'hide' })}>{hidden ? <ChevronDown size={15}/> : <ChevronUp size={15}/>}</button>
            <button className="icon-button" disabled={busy} aria-label="안내 건너뛰기" title="건너뛰기 (항해 기록 화면에서 다시 볼 수 있음)" onClick={() => send({ type: 'tutorial', id: 'skip' })}><X size={15}/></button>
        </div>
        {!hidden && <>
            <ol className="tutorial-steps">{TUTORIAL_STEPS.map(step => { const ok = step.done(s); return <li key={step.id} className={ok ? 'done' : step.id === next.id ? 'current' : ''}>{ok ? <Check size={12}/> : <span/>}{step.title}</li>; })}</ol>
            <p>{next.hint}</p>
            {setView && next.view !== 'battle' && <button className="text-button" onClick={() => setView(next.view)}>{next.title} 화면 열기</button>}
            <small>안내에는 보상이 없습니다. 이미 한 단계는 자동으로 완료 처리됩니다.</small>
        </>}
    </section>;
}

/** 새로 해금된 항해 기록 한 줄 알림. 해금 후 잠깐만 보이고 다시 재생하지 않습니다. */
export function VoyageNotice({ s, setView }: { s: State; setView?: (view: string) => void }) {
    const latest = Object.entries(s.voyage || {}).filter(([, turn]) => turn >= 0 && s.turn - turn <= 15).sort((a, b) => b[1] - a[1])[0];
    const entry = latest && VOYAGE_LOG.find(x => x.id === latest[0]);
    if (!entry) return null;
    return <button type="button" className="voyage-notice" onClick={() => setView?.('voyage')}><ScrollText size={14}/><b>항해 기록</b><span>{entry.title} — {entry.text}</span></button>;
}

export function VoyageLog({ s, send, busy }: PanelProps) {
    const got = s.voyage || {};
    const groups = ['해역', '던전', '환생', '심연'] as const;
    return <>
        <Heading eyebrow="LOGBOOK" title="항해 기록" description="처음 겪은 순간이 한 줄씩 남습니다. 기록은 환생 후에도 유지되며 보상은 없습니다.">
            {(!s.tutorial || s.tutorial.skipped || s.tutorial.hidden) && <button className="secondary" disabled={busy} onClick={() => send({ type: 'tutorial', id: 'show' })}>항해 안내 다시 보기</button>}
        </Heading>
        <p className="footnote">해금 {VOYAGE_LOG.filter(x => got[x.id] !== undefined).length} / {VOYAGE_LOG.length}</p>
        {groups.map(g => <section className="voyage-section" key={g}><div className="section-title"><h2>{g}</h2><span>{VOYAGE_LOG.filter(x => x.group === g && got[x.id] !== undefined).length} / {VOYAGE_LOG.filter(x => x.group === g).length}</span></div>
            <div className="voyage-list">{VOYAGE_LOG.filter(x => x.group === g).map(x => got[x.id] !== undefined
                ? <article className="panel voyage-entry" key={x.id}><strong>{x.title}</strong><p>{x.text}</p></article>
                : <article className="panel voyage-entry locked" key={x.id}><strong>???</strong><p>아직 겪지 않은 순간입니다.</p></article>)}</div>
        </section>)}
    </>;
}
