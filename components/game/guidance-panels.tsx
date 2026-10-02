'use client';
import type { PanelProps } from './panel-props';
import { Check, ChevronDown, ChevronUp, Compass, ScrollText, X } from 'lucide-react';
import type { State } from '@/game/types';
import { VOYAGE_LOG } from '@/game/data/voyage-log';
import { ACHIEVEMENTS, ACHIEVEMENT_GROUPS, achievementTotals, rewardText } from '@/game/data/achievements';
import { goalText, DAILY_ALL_BONUS, WEEKLY_ALL_BONUS, type GoalBoard } from '@/game/data/goals';
import { unclaimedAchievements } from '@/game/systems/progress';
import { TUTORIAL_STEPS, tutorialProgress } from '@/game/systems/guidance';
import { Heading, Meter } from './shared';


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

function GoalBoardView({ title, board, bonus }: { title: string; board?: GoalBoard; bonus: number }) {
    if (!board) return null;
    const done = board.goals.filter(g => g.claimed).length;
    return <section className="panel goal-board"><div className="section-title"><h2>{title}</h2><span>{done} / {board.goals.length} · 모두 달성 시 진주 +{bonus}{board.bonus ? ' (받음)' : ''}</span></div>
        <ul className="goal-list">{board.goals.map(g => <li key={g.id} className={g.claimed ? 'done' : ''}><div><strong>{goalText(g)}</strong><small>진주 +{g.pearls}{g.essence ? ` · 정수 +${g.essence}` : ''}</small></div><Meter value={g.progress} max={g.target} label="진행"/></li>)}</ul></section>;
}
export function VoyageLog({ s, send, busy }: PanelProps) {
    const got = s.voyage || {}, feats = s.achievements || {}, claimed = s.achievementClaims || {}, pending = unclaimedAchievements(s);
    const groups = ['해역', '던전', '환생', '심연'] as const;
    const totals = achievementTotals(s);
    return <>
        <Heading eyebrow="LOGBOOK" title="항해 기록" description="오늘의 목표와 주간 목표, 업적, 처음 겪은 순간의 기록입니다. 업적과 기록은 환생 후에도 유지됩니다.">
            {(!s.tutorial || s.tutorial.skipped || s.tutorial.hidden) && <button className="secondary" disabled={busy} onClick={() => send({ type: 'tutorial', id: 'show' })}>항해 안내 다시 보기</button>}
        </Heading>
        <div className="goal-boards"><GoalBoardView title="오늘의 항해 목표" board={s.daily} bonus={DAILY_ALL_BONUS}/><GoalBoardView title="이번 주 항해 목표" board={s.weekly} bonus={WEEKLY_ALL_BONUS}/></div>
        <p className="footnote">목표는 한국 시간 자정·월요일에 바뀌고, 채우면 보상이 바로 들어옵니다. 지난 목표는 사라집니다.</p>
        <section className="voyage-section"><div className="section-title"><h2>업적</h2>{pending.length > 0 && <button className="primary small" disabled={busy} onClick={() => send({ type: 'claimAchievement', id: 'all' })}>보상 모두 받기 · {pending.length}개</button>}<span>{Object.keys(feats).length} / {ACHIEVEMENTS.length} · 영구 보너스: 장착 AP +{totals.ap}{(['attack', 'magic', 'hp', 'defense', 'resist'] as const).filter(k => totals.bonus[k] > 0).map(k => ` · ${({ attack: '물공', magic: '마공', hp: '체력', defense: '물방', resist: '마방' })[k]} +${Math.round(totals.bonus[k] * 100)}%`).join('')}</span></div>
            {ACHIEVEMENT_GROUPS.map(g => <div key={g} className="achievement-group"><h3>{g}</h3><div className="voyage-list achievement-list">{ACHIEVEMENTS.filter(a => a.group === g).map(a => { const done = feats[a.id] !== undefined, got = !!claimed[a.id], p = Math.min(a.target, a.progress(s)); return <article key={a.id} className={`panel voyage-entry achievement ${done ? 'done' : ''} ${done && !got ? 'claimable' : ''}`}><div className="achievement-top"><strong>{a.title}</strong>{got ? <Check size={14}/> : done ? <button className="primary small" disabled={busy} onClick={() => send({ type: 'claimAchievement', id: a.id })}>보상 받기</button> : null}</div><p>{a.desc}</p><Meter value={p} max={a.target} label="달성"/><small className="achievement-reward">{rewardText(a.reward)}</small></article>; })}</div></div>)}
        </section>
        <p className="footnote">기록 해금 {VOYAGE_LOG.filter(x => got[x.id] !== undefined).length} / {VOYAGE_LOG.length}</p>
        {groups.map(g => <section className="voyage-section" key={g}><div className="section-title"><h2>{g}</h2><span>{VOYAGE_LOG.filter(x => x.group === g && got[x.id] !== undefined).length} / {VOYAGE_LOG.filter(x => x.group === g).length}</span></div>
            <div className="voyage-list">{VOYAGE_LOG.filter(x => x.group === g).map(x => got[x.id] !== undefined
                ? <article className="panel voyage-entry" key={x.id}><strong>{x.title}</strong><p>{x.text}</p></article>
                : <article className="panel voyage-entry locked" key={x.id}><strong>???</strong><p>아직 겪지 않은 순간입니다.</p></article>)}</div>
        </section>)}
    </>;
}
