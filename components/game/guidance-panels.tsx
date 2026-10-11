'use client';
import type { PanelProps } from './panel-props';
import { Check, ChevronDown, ChevronRight, ChevronUp, Clock, Compass, HelpCircle, RefreshCw, X } from 'lucide-react';
import { BASE_STAGES, DUNGEONS } from '@/game/data/world';
import { ACHIEVEMENTS, ACHIEVEMENT_GROUPS, CHALLENGE_GROUP, achievementTotals, achievementMaxTotals, rewardText, ACHIEVEMENT_BONUS_PER, progressReader } from '@/game/data/achievements';
import { goalText, DAILY_ALL_BONUS, WEEKLY_ALL_BONUS, type GoalBoard } from '@/game/data/goals';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { unclaimedAchievements } from '@/game/systems/progress';
import { TUTORIAL_STEPS, tutorialProgress, tutorialStepDone, nextTutorialStep } from '@/game/systems/guidance';
import { Heading, Meter, useNow } from './shared';
import { useState } from 'react';
import type { State } from '@/game/types';
import { dayKey, nextDailyReset, nextWeeklyReset, KST } from '@/game/data/time';


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


const BONUS_KEYS = ['attack', 'magic', 'hp', 'defense', 'resist'] as const;
const BONUS_LABEL: Record<typeof BONUS_KEYS[number], string> = { attack: '물리 공격', magic: '마법 공격', hp: '최대 체력', defense: '물리 방어', resist: '마법 방어' };

/** 일일·주간 목표판. 제목을 눌러 접고 펼치며, 목표마다 하루 1회 다시 뽑기(↻)를 할 수 있습니다. */
function GoalBoardView({ title, which, board, bonus, today, send, busy }: { title: string; which: 'daily' | 'weekly'; board?: GoalBoard; bonus: number; today: string } & Pick<PanelProps, 'send' | 'busy'>) {
    // v3.106 정확한 초기화 시각(한국 시간)과 남은 시간. 1분마다 갱신합니다.
    const now = useNow(60_000);
    if (!board) return null;
    const done = board.goals.filter(g => g.claimed).length, at = which === 'daily' ? nextDailyReset(now) : nextWeeklyReset(now), left = at - now, day = new Date(at + KST);
    const d = Math.floor(left / 86400_000), h = Math.floor(left % 86400_000 / 3600_000), m = Math.max(1, Math.ceil(left % 3600_000 / 60_000));
    const leftText = `${d ? `${d}일 ` : ''}${d || h ? `${h}시간 ` : ''}${m === 60 ? '59' : m}분 남음`, resetText = which === 'daily' ? '매일 0시' : '매주 월요일 0시', nextText = which === 'weekly' ? ` · 다음 ${day.getUTCMonth() + 1}월 ${day.getUTCDate()}일(월)` : '';
    return <details className="achievement-group goal-board" open>
        <summary><h3>{title}</h3><span>{done} / {board.goals.length} · 모두 달성 시 세계석 +{bonus}{board.bonus ? ' (받음)' : ''}</span><ChevronDown size={15} className="achievement-chevron"/></summary>
        <p className="goal-reset"><Clock size={12}/> 초기화 {resetText}(한국 시간){nextText} · {leftText}</p>
        <ul className="goal-list">{board.goals.map(g => { const used = g.rerolled === today; return <li key={g.id} className={g.claimed ? 'done' : ''}>
            <div><strong>{goalText(g)}{g.optional ? <small className="goal-optional"> 선택</small> : null}</strong><span className="goal-side"><small>세계석 +{g.pearls}{g.essence ? ` · 정수 +${g.essence}` : ''}</small>
                {!g.claimed && <button className="icon-button goal-reroll" disabled={busy || used} aria-label="목표 다시 뽑기" title={used ? '오늘은 이미 다시 뽑았습니다. 목표마다 하루 1회.' : '다시 뽑기 (목표마다 하루 1회, 진행은 0부터)'} onClick={() => send({ type: 'rerollGoal', id: `${which}:${g.id}` })}><RefreshCw size={13}/></button>}</span></div>
            <Meter value={g.progress} max={g.target} label="진행"/></li>; })}</ul>
    </details>;
}

/** 업적 묶음(접었다 펼침)과 보상 받기. */
function AchievementGroups({ s, send, busy }: PanelProps) {
    const got = s.voyage || {}, feats = s.achievements || {}, claimed = s.achievementClaims || {};
    /** 업적 ‘사냥터 N곳’·‘던전 N곳’ 카드에 붙는 방문 기록(이전 ‘모험 기록’ 해금을 여기로 통합). */
    // v3.93 같은 묶음의 단계들은 진행도를 한 번만 계산합니다.
    const progress = progressReader(s);
    const visited = (a: { id: string }) => a.id.startsWith('stages:') ? BASE_STAGES.filter(st => got[`stage:${st.id}`] !== undefined).map(st => st.name) : a.id.startsWith('dungeons:') ? DUNGEONS.filter(d => (s.clears?.[d.id] || 0) > 0).map(d => d.name) : null;
    return <>{ACHIEVEMENT_GROUPS.map(g => { const items = ACHIEVEMENTS.filter(a => a.group === g), doneCount = items.filter(a => feats[a.id] !== undefined).length, claimable = items.filter(a => feats[a.id] !== undefined && !claimed[a.id]).length; return <details key={g} className="achievement-group" open={claimable > 0}><summary><h3>{g}</h3><span>{doneCount} / {items.length}{claimable ? ` · 받을 보상 ${claimable}개` : ''}{g === CHALLENGE_GROUP ? ` · 플레이 ${Math.floor((s.playMs || 0) / 3_600_000).toLocaleString()}시간 · ${(s.turn || 0).toLocaleString()}턴 · 쓰러짐 ${(s.deaths || 0).toLocaleString()}회` : ''}</span><ChevronDown size={15} className="achievement-chevron"/></summary><div className="voyage-list achievement-list">{items.map(a => { const done = feats[a.id] !== undefined, got = !!claimed[a.id], p = Math.min(a.target, progress(a)); return <article key={a.id} className={`panel voyage-entry achievement ${done ? 'done' : ''} ${done && !got ? 'claimable' : ''}`}><div className="achievement-top"><strong>{a.title}</strong>{got ? <Check size={14}/> : done ? <button className="primary small" disabled={busy} onClick={() => send({ type: 'claimAchievement', id: a.id })}>보상 받기</button> : null}</div><p>{a.desc}</p>{(() => { const v = visited(a); return v && v.length ? <small className="achievement-visited">다녀온 곳: {v.join(' · ')}</small> : null; })()}<Meter value={p} max={a.target} label="달성"/><small className="achievement-reward">{rewardText(a.reward)}</small></article>; })}</div></details>; })}</>;
}

/** 업적 보너스 탭: 받은 업적 수에 따른 업적 보너스(최대와 비교), 장착 AP, 받은 세계석·SP, 장착 AP가 붙은 업적 목록. */
function AchievementBonus({ s }: { s: State }) {
    const feats = s.achievements || {}, claimed = s.achievementClaims || {};
    const totals = achievementTotals(s), max = achievementMaxTotals();
    const claimedList = ACHIEVEMENTS.filter(a => claimed[a.id]);
    const pearls = claimedList.reduce((a, x) => a + (x.reward.pearls || 0), 0), sp = claimedList.reduce((a, x) => a + (x.reward.sp || 0), 0);
    const permanent = ACHIEVEMENTS.filter(a => a.reward.ap);
    const pct = (n: number) => `${Math.round(n * 100)}%`;
    return <>
        <section className="panel bonus-summary">
            <div className="section-title"><h2>영구 보너스</h2><span>받은 업적의 보상만 셉니다 · 환생해도 유지</span></div>
            <dl className="feat-bonus-grid">
                <div><dt>장착 AP</dt><dd>+{totals.ap}<small> / {max.ap}</small></dd></div>
                {BONUS_KEYS.map(k => <div key={k}><dt>{BONUS_LABEL[k]}</dt><dd>+{pct(totals.bonus[k])}<small> / {pct(max.bonus[k])}</small></dd></div>)}
            </dl>
            <p className="footnote">업적 보너스는 받은 업적 1개마다 {BONUS_KEYS.map(k => `${BONUS_LABEL[k]} +${(ACHIEVEMENT_BONUS_PER[k] * 100).toFixed(2)}%`).join(' · ')}씩 쌓이고, 최종 능력치에 한 번 곱합니다. 받은 업적 {claimedList.length} / {ACHIEVEMENTS.length}개(명예 업적 {claimedList.filter(x => x.honor).length}개는 업적 보너스에서 제외) · 세계석 {pearls.toLocaleString()} · SP {sp} 수령.</p>
        </section>
        <details className="achievement-group bonus-feats" open>
            <summary><h3>장착 AP가 붙은 업적</h3><span>{permanent.filter(a => claimed[a.id]).length} / {permanent.length} 수령</span><ChevronDown size={15} className="achievement-chevron"/></summary>
            <div className="voyage-list achievement-list">{permanent.map(a => { const done = feats[a.id] !== undefined, got = !!claimed[a.id]; return <article key={a.id} className={`panel voyage-entry achievement ${got ? 'done' : ''} ${done && !got ? 'claimable' : ''}`}><div className="achievement-top"><strong>{a.title}</strong>{got ? <Check size={14}/> : <small>{done ? '받기 전' : '미달성'}</small>}</div><p>{a.desc}</p><small className="achievement-reward">{rewardText({ ap: a.reward.ap })}</small></article>; })}</div>
        </details>
    </>;
}

export function VoyageLog({ s, send, busy }: PanelProps) {
    const pending = unclaimedAchievements(s), feats = s.achievements || {}, today = dayKey(s.lastTick || 0);
    return <>
        <Heading eyebrow="GOALS & FEATS" title="목표 · 업적" description="오늘의 목표와 주간 목표, 업적, 업적으로 받은 영구 보너스입니다. 업적은 환생 후에도 유지되고 보상은 여기서 받습니다.">
            {(!s.tutorial || s.tutorial.skipped || s.tutorial.hidden) && <button className="secondary" disabled={busy} onClick={() => send({ type: 'tutorial', id: 'show' })}>모험 안내 다시 보기</button>}
        </Heading>
        <Tabs defaultValue={pending.length ? 'feats' : 'goals'}>
            <TabsList className="game-tabs">
                <TabsTrigger value="goals">목표</TabsTrigger>
                <TabsTrigger value="feats">업적{pending.length ? ` · 보상 ${pending.length}` : ''}</TabsTrigger>
                <TabsTrigger value="bonus">업적 보너스</TabsTrigger>
            </TabsList>
            <TabsContent value="goals">
                <div className="goal-boards"><GoalBoardView title="오늘의 모험 목표" which="daily" board={s.daily} bonus={DAILY_ALL_BONUS} today={today} send={send} busy={busy}/><GoalBoardView title="이번 주 모험 목표" which="weekly" board={s.weekly} bonus={WEEKLY_ALL_BONUS} today={today} send={send} busy={busy}/></div>
                <p className="footnote">목표는 한국 시간 자정·월요일에 바뀌고, 채우면 보상이 바로 들어옵니다. 지난 목표는 사라집니다. ↻ 다시 뽑기는 목표마다 하루 1회(주간 목표도 날마다 1회)이며 같은 판의 다른 목표와 겹치지 않는 것으로 바뀌고 진행은 0부터입니다.</p>
            </TabsContent>
            <TabsContent value="feats">
                <section className="voyage-section"><div className="section-title"><h2>업적</h2>{pending.length > 0 && <button className="primary small" disabled={busy} onClick={() => send({ type: 'claimAchievement', id: 'all' })}>보상 모두 받기 · {pending.length}개</button>}<span>{Object.keys(feats).length} / {ACHIEVEMENTS.length}</span></div>
                    <AchievementGroups s={s} send={send} busy={busy}/>
                </section>
            </TabsContent>
            <TabsContent value="bonus"><AchievementBonus s={s}/></TabsContent>
        </Tabs>
    </>;
}
