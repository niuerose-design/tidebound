'use client';
/** v3.401 목표 · 업적(새 토대): 오늘/이번 주 목표판, 업적 묶음과 보상 받기, 업적 보너스. 서버 행동(rerollGoal · claimAchievement · tutorial)은 전과 같습니다. */
import { createContext, useContext } from 'react';
import { Check, Clock, RefreshCw } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { BASE_STAGES, DUNGEONS } from '@/game/data/world';
import { ACHIEVEMENTS, ACHIEVEMENT_GROUPS, CHALLENGE_GROUP, achievementTotals, achievementMaxTotals, rewardText, ACHIEVEMENT_BONUS_PER, progressReader } from '@/game/data/achievements';
import { goalText, DAILY_ALL_BONUS, WEEKLY_ALL_BONUS, type GoalBoard } from '@/game/data/goals';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SectionHeader, FoldSection, StatBar, KeyValueList, FinePrint } from '@/components/ui/game';
import { unclaimedAchievements } from '@/game/systems/progress';
import { useNow } from '@/components/game/shared';
import { dayKey, nextDailyReset, nextWeeklyReset, KST } from '@/game/data/time';
import { cn } from '@/lib/utils';

type Send = (a: Action) => void;
type P = { s: State; send: Send; busy: boolean };
const BONUS_KEYS = ['attack', 'magic', 'hp', 'defense', 'resist'] as const;
const BONUS_LABEL: Record<typeof BONUS_KEYS[number], string> = { attack: '물리 공격', magic: '마법 공격', hp: '최대 체력', defense: '물리 방어', resist: '마법 방어' };
const Note = ({ children }: { children: React.ReactNode }) => <p className="text-xs leading-relaxed text-ink-3">{children}</p>;
type Feat = typeof ACHIEVEMENTS[number];

export function GoalsScreen({ s, send, busy }: P) {
    const pending = unclaimedAchievements(s), feats = s.achievements || {}, today = dayKey(s.lastTick || 0);
    return <div className="grid gap-4 text-ink-1">
        <SectionHeader as="h1" eyebrow="GOALS & FEATS" title="목표 · 업적" description="업적은 환생해도 남고, 보상은 여기서 받습니다."
            actions={(!s.tutorial || s.tutorial.skipped || s.tutorial.hidden) && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => send({ type: 'tutorial', id: 'show' })}>모험 안내 다시 보기</Button>}/>
        <Tabs defaultValue={pending.length ? 'feats' : 'goals'} className="grid gap-4">
            <TabsList className="h-auto! flex-wrap">
                <TabsTrigger value="goals" className="min-h-9 pointer-coarse:min-h-11">목표</TabsTrigger>
                <TabsTrigger value="feats" className="min-h-9 pointer-coarse:min-h-11">업적{pending.length ? ` · 보상 ${pending.length}` : ''}</TabsTrigger>
                <TabsTrigger value="bonus" className="min-h-9 pointer-coarse:min-h-11">업적 보너스</TabsTrigger>
            </TabsList>
            <TabsContent value="goals" className="grid gap-3">
                <div className="grid gap-3 lg:grid-cols-2"><GoalBoardView title="오늘의 모험 목표" which="daily" board={s.daily} bonus={DAILY_ALL_BONUS} today={today} send={send} busy={busy}/><GoalBoardView title="이번 주 모험 목표" which="weekly" board={s.weekly} bonus={WEEKLY_ALL_BONUS} today={today} send={send} busy={busy}/></div>
                <Note>목표는 한국 시간 자정과 월요일에 바뀌고, 채우면 보상이 바로 들어옵니다. 지난 목표는 사라집니다.</Note>
                <FinePrint summary="다시 뽑기 규칙">
                    <p>↻ 다시 뽑기는 목표마다 하루 1회이고, 주간 목표도 날마다 1회입니다.</p>
                    <p>같은 판의 다른 목표와 겹치지 않는 것으로 바뀌고, 진행은 0부터입니다.</p>
                </FinePrint>
            </TabsContent>
            <TabsContent value="feats" className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-m font-bold">업적 <span className="font-num text-xs font-normal text-ink-3">{Object.keys(feats).length} / {ACHIEVEMENTS.length}</span></h2>{pending.length > 0 && <Button type="button" size="sm" className="bg-accent text-accent-ink hover:bg-accent/90" disabled={busy} onClick={() => send({ type: 'claimAchievement', id: 'all' })}>보상 모두 받기 · {pending.length}개</Button>}</div>
                <AchievementGroups s={s} send={send} busy={busy}/>
            </TabsContent>
            <TabsContent value="bonus"><AchievementBonus s={s} send={send} busy={busy}/></TabsContent>
        </Tabs>
    </div>;
}

/** 일일·주간 목표판. 목표마다 하루 1회 다시 뽑기(↻)를 할 수 있습니다. */
function GoalBoardView({ title, which, board, bonus, today, send, busy }: { title: string; which: 'daily' | 'weekly'; board?: GoalBoard; bonus: number; today: string; send: Send; busy: boolean }) {
    // v3.106 정확한 초기화 시각(한국 시간)과 남은 시간. 1분마다 갱신합니다.
    const now = useNow(60_000);
    if (!board) return null;
    const done = board.goals.filter(g => g.claimed).length, at = which === 'daily' ? nextDailyReset(now) : nextWeeklyReset(now), left = at - now, day = new Date(at + KST);
    const d = Math.floor(left / 86400_000), h = Math.floor(left % 86400_000 / 3600_000), m = Math.max(1, Math.ceil(left % 3600_000 / 60_000));
    const leftText = `${d ? `${d}일 ` : ''}${d || h ? `${h}시간 ` : ''}${m === 60 ? '59' : m}분 남음`, resetText = which === 'daily' ? '매일 0시' : '매주 월요일 0시', nextText = which === 'weekly' ? ` · 다음 ${day.getUTCMonth() + 1}월 ${day.getUTCDate()}일(월)` : '';
    return <FoldSection title={title} summary={`${done} / ${board.goals.length} · 모두 달성 시 세계석 +${bonus}${board.bonus ? ' (받음)' : ''}`} defaultOpen extra={<span className="inline-flex items-center gap-1"><Clock size={12}/> 초기화 {resetText}(한국 시간){nextText} · {leftText}</span>}>
        <ul className="grid gap-2">{board.goals.map(g => { const used = g.rerolled === today; return <li key={g.id} className={cn('grid gap-1.5 rounded-m border p-3', g.claimed ? 'border-ok/40 bg-ok/5' : 'border-line bg-surface-1')}>
            <div className="flex items-start justify-between gap-2"><strong className="text-s">{g.claimed && <Check size={13} className="mr-1 inline text-ok"/>}{goalText(g)}{g.optional ? <small className="ml-1 text-xs font-normal text-ink-3">선택</small> : null}</strong><span className="flex shrink-0 items-center gap-1"><small className="font-num text-xs text-ink-3">세계석 +{g.pearls}{g.essence ? ` · 정수 +${g.essence}` : ''}</small>
                {!g.claimed && <Button type="button" size="icon-sm" variant="ghost" disabled={busy || used} aria-label="목표 다시 뽑기" title={used ? '오늘은 이미 다시 뽑았습니다. 목표마다 하루 1회.' : '다시 뽑기 (목표마다 하루 1회, 진행은 0부터)'} onClick={() => send({ type: 'rerollGoal', id: `${which}:${g.id}` })}><RefreshCw size={13}/></Button>}</span></div>
            <StatBar size="s" tone={g.claimed ? 'exp' : 'accent'} value={g.progress} max={g.target} label="진행"/></li>; })}</ul>
    </FoldSection>;
}

/**
 * v3.451 업적 줄(docs/writing.md 4단계 · 기록은 표): 카드 격자 대신 한 줄에 한 업적. 같은 묶음의 단계(처치 100 · 1,000 · 5,000 …)는 한 줄로 합쳐
 * 지금 단계의 제목 · 설명 · 진행과 단계 점을 보여 줍니다. 344장이 120여 줄이 됩니다. 보상은 줄마다 받습니다(단계 묶음은 'kills:*'로 한 번에).
 */
type FeatRowData = { key: string; steps: Feat[]; series: boolean };
function featRows(items: Feat[]): FeatRowData[] {
    const rows: FeatRowData[] = [], byPrefix = new Map<string, FeatRowData>();
    for (const a of items) {
        const [prefix, suffix] = a.id.split(':');
        if (suffix && /^\d+$/.test(suffix)) { const row = byPrefix.get(prefix); if (row) { row.steps.push(a); row.series = true; continue; } const fresh = { key: `${prefix}:*`, steps: [a], series: false }; byPrefix.set(prefix, fresh); rows.push(fresh); }
        else rows.push({ key: a.id, steps: [a], series: false });
    }
    return rows;
}
/** 단계 점: 지난 단계 ● · 지금 ◐ · 남은 ○. 글자 없이 색만 쓰지 않도록 aria-label 로 단계 수를 읽습니다. */
function StepPips({ done, total }: { done: number; total: number }) {
    if (total > 10) return <span className="shrink-0 font-num text-xs tabular-nums text-ink-3">{done}/{total}</span>;
    return <span className="inline-flex shrink-0 items-center gap-0.5" role="img" aria-label={`${total}단계 중 ${done}단계 달성`}>{Array.from({ length: total }, (_, i) => <span key={i} className={cn('size-1.5 rounded-full', i < done ? 'bg-ok' : i === done ? 'border border-accent' : 'bg-surface-3')}/>)}</span>;
}
function FeatRow({ row, progress, visited, send, busy }: { row: FeatRowData; progress: (a: Feat) => number; visited?: (a: Feat) => string[] | null; send: Send; busy: boolean }) {
    const { feats, claimed } = useFeatState();
    const doneCount = row.steps.filter(a => feats[a.id] !== undefined).length, allDone = doneCount === row.steps.length;
    const cur = row.steps[Math.min(doneCount, row.steps.length - 1)], claimable = row.steps.filter(a => feats[a.id] !== undefined && !claimed[a.id]).length;
    const p = allDone ? cur.target : Math.min(cur.target, progress(cur)), v = visited?.(cur), reward = rewardText(cur.reward);
    return <li className={cn('grid gap-1.5 border-b border-line py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_6rem] sm:items-center sm:gap-3', allDone && claimable === 0 && 'opacity-80')}>
        <div className="min-w-0">
            <div className="flex items-center gap-2">{row.series && <StepPips done={doneCount} total={row.steps.length}/>}<strong className="min-w-0 min-w-0 [overflow-wrap:anywhere] text-s">{cur.title}</strong>{allDone && claimable === 0 && <Check size={13} className="shrink-0 text-ok" aria-label="완료"/>}</div>
            <p className="text-xs leading-relaxed text-ink-3">{cur.desc}</p>
            {v && v.length ? <small className="text-xs text-ink-3">다녀온 곳: {v.join(' · ')}</small> : null}
        </div>
        <div className="flex items-center gap-3 sm:contents">
            <StatBar size="s" tone={allDone ? 'exp' : 'accent'} value={p} max={cur.target} label={row.series ? `${doneCount + (allDone ? 0 : 1)}단계` : undefined} className="min-w-0 flex-1"/>
            <small className="shrink-0 text-xs text-gold-ink sm:text-right">{reward}</small>
            <span className="flex shrink-0 justify-end">{claimable > 0 && <Button type="button" size="xs" className="bg-accent text-accent-ink hover:bg-accent/90 pointer-coarse:min-h-11" disabled={busy} onClick={() => send({ type: 'claimAchievement', id: row.series ? row.key : cur.id })}>보상 받기{claimable > 1 ? ` · ${claimable}` : ''}</Button>}</span>
        </div>
    </li>;
}
/** 줄마다 상태를 다시 읽지 않도록 묶음 단위로 한 번 넘깁니다. */
const FeatState = createContext<{ feats: Record<string, number>; claimed: Record<string, boolean> }>({ feats: {}, claimed: {} });
const useFeatState = () => useContext(FeatState);

/** 업적 묶음(접었다 펼침)과 보상 받기. */
function AchievementGroups({ s, send, busy }: P) {
    const got = s.voyage || {}, feats = s.achievements || {}, claimed = s.achievementClaims || {};
    // v3.93 같은 묶음의 단계들은 진행도를 한 번만 계산합니다.
    const progress = progressReader(s);
    /** 업적 ‘사냥터 N곳’·‘던전 N곳’ 줄에 붙는 방문 기록. */
    const visited = (a: Feat) => a.id.startsWith('stages:') ? BASE_STAGES.filter(st => got[`stage:${st.id}`] !== undefined).map(st => st.name) : a.id.startsWith('dungeons:') ? DUNGEONS.filter(d => (s.clears?.[d.id] || 0) > 0).map(d => d.name) : null;
    return <FeatState.Provider value={{ feats, claimed }}>{ACHIEVEMENT_GROUPS.map(g => { const items = ACHIEVEMENTS.filter(a => a.group === g), doneCount = items.filter(a => feats[a.id] !== undefined).length, claimable = items.filter(a => feats[a.id] !== undefined && !claimed[a.id]).length;
        return <FoldSection key={g} title={g} defaultOpen={claimable > 0} summary={`${doneCount} / ${items.length}${claimable ? ` · 받을 보상 ${claimable}개` : ''}`} extra={g === CHALLENGE_GROUP ? `플레이 ${Math.floor((s.playMs || 0) / 3_600_000).toLocaleString()}시간 · ${(s.turn || 0).toLocaleString()}턴 · 쓰러짐 ${(s.deaths || 0).toLocaleString()}회` : undefined}>
            <ul className="grid">{featRows(items).map(row => <FeatRow key={row.key} row={row} progress={progress} visited={visited} send={send} busy={busy}/>)}</ul>
        </FoldSection>; })}</FeatState.Provider>;
}

/** 업적 보너스 탭: 받은 업적 수에 따른 업적 보너스(최대와 비교), 장착 AP, 받은 세계석·SP, 장착 AP가 붙은 업적 목록. */
function AchievementBonus({ s, send, busy }: P) {
    const feats = s.achievements || {}, claimed = s.achievementClaims || {};
    const totals = achievementTotals(s), max = achievementMaxTotals();
    const claimedList = ACHIEVEMENTS.filter(a => claimed[a.id]);
    const pearls = claimedList.reduce((a, x) => a + (x.reward.pearls || 0), 0), sp = claimedList.reduce((a, x) => a + (x.reward.sp || 0), 0);
    const permanent = ACHIEVEMENTS.filter(a => a.reward.ap);
    const progress = progressReader(s);
    const pct = (n: number) => `${Math.round(n * 100)}%`;
    return <div className="grid gap-3">
        <section className="grid gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1">
            <header className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-m font-bold">영구 보너스</h2><span className="text-xs text-ink-3">받은 업적의 보상만 셉니다 · 환생해도 유지</span></header>
            <KeyValueList columns={2} items={[{ key: '장착 AP', value: `+${totals.ap} / ${max.ap}` }, { key: '받은 업적', value: `${claimedList.length} / ${ACHIEVEMENTS.length}` }, { key: '받은 세계석', value: pearls.toLocaleString() }, { key: '받은 SP', value: String(sp) }, ...BONUS_KEYS.map(k => ({ key: BONUS_LABEL[k], value: `+${pct(totals.bonus[k])} / ${pct(max.bonus[k])}` }))]}/>
            <Note>업적 보너스는 받은 업적 1개마다 쌓이고, 최종 능력치에 한 번 곱합니다. 명예 업적 {claimedList.filter(x => x.honor).length}개는 보너스에서 빠집니다.</Note>
            <FinePrint summary="업적 1개당 보너스">
                <p>{BONUS_KEYS.map(k => `${BONUS_LABEL[k]} +${(ACHIEVEMENT_BONUS_PER[k] * 100).toFixed(2)}%`).join(', ')}.</p>
            </FinePrint>
        </section>
        <FoldSection title="장착 AP가 붙은 업적" summary={`${permanent.filter(a => claimed[a.id]).length} / ${permanent.length} 수령`} defaultOpen>
            <FeatState.Provider value={{ feats, claimed }}><ul className="grid">{permanent.map(a => <FeatRow key={a.id} row={{ key: a.id, steps: [a], series: false }} progress={progress} send={send} busy={busy}/>)}</ul></FeatState.Provider>
        </FoldSection>
    </div>;
}
