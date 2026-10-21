'use client';
/** v3.401 목표 · 업적(새 토대): 오늘/이번 주 목표판, 업적 묶음과 보상 받기, 업적 보너스. 서버 행동(rerollGoal · claimAchievement · tutorial)은 전과 같습니다. */
import { Check, Clock, RefreshCw } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { BASE_STAGES, DUNGEONS } from '@/game/data/world';
import { ACHIEVEMENTS, ACHIEVEMENT_GROUPS, CHALLENGE_GROUP, achievementTotals, achievementMaxTotals, rewardText, ACHIEVEMENT_BONUS_PER, progressReader } from '@/game/data/achievements';
import { goalText, DAILY_ALL_BONUS, WEEKLY_ALL_BONUS, type GoalBoard } from '@/game/data/goals';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SectionHeader, FoldSection, StatBar, KeyValueList } from '@/components/ui/game';
import { unclaimedAchievements } from '@/game/systems/progress';
import { useNow } from '@/components/game/shared';
import { dayKey, nextDailyReset, nextWeeklyReset, KST } from '@/game/data/time';
import { cn } from '@/lib/utils';

type Send = (a: Action) => void;
type P = { s: State; send: Send; busy: boolean };
const BONUS_KEYS = ['attack', 'magic', 'hp', 'defense', 'resist'] as const;
const BONUS_LABEL: Record<typeof BONUS_KEYS[number], string> = { attack: '물리 공격', magic: '마법 공격', hp: '최대 체력', defense: '물리 방어', resist: '마법 방어' };
const Note = ({ children }: { children: React.ReactNode }) => <p className="text-xs leading-relaxed text-ink-3">{children}</p>;

export function GoalsScreen({ s, send, busy }: P) {
    const pending = unclaimedAchievements(s), feats = s.achievements || {}, today = dayKey(s.lastTick || 0);
    return <div className="grid gap-4 text-ink-1">
        <SectionHeader as="h1" eyebrow="GOALS & FEATS" title="목표 · 업적" description="오늘의 목표와 주간 목표, 업적, 업적으로 받은 영구 보너스입니다. 업적은 환생 후에도 유지되고 보상은 여기서 받습니다."
            actions={(!s.tutorial || s.tutorial.skipped || s.tutorial.hidden) && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => send({ type: 'tutorial', id: 'show' })}>모험 안내 다시 보기</Button>}/>
        <Tabs defaultValue={pending.length ? 'feats' : 'goals'} className="grid gap-4">
            <TabsList className="h-auto flex-wrap">
                <TabsTrigger value="goals" className="min-h-9 pointer-coarse:min-h-11">목표</TabsTrigger>
                <TabsTrigger value="feats" className="min-h-9 pointer-coarse:min-h-11">업적{pending.length ? ` · 보상 ${pending.length}` : ''}</TabsTrigger>
                <TabsTrigger value="bonus" className="min-h-9 pointer-coarse:min-h-11">업적 보너스</TabsTrigger>
            </TabsList>
            <TabsContent value="goals" className="grid gap-3">
                <div className="grid gap-3 lg:grid-cols-2"><GoalBoardView title="오늘의 모험 목표" which="daily" board={s.daily} bonus={DAILY_ALL_BONUS} today={today} send={send} busy={busy}/><GoalBoardView title="이번 주 모험 목표" which="weekly" board={s.weekly} bonus={WEEKLY_ALL_BONUS} today={today} send={send} busy={busy}/></div>
                <Note>목표는 한국 시간 자정·월요일에 바뀌고, 채우면 보상이 바로 들어옵니다. 지난 목표는 사라집니다. ↻ 다시 뽑기는 목표마다 하루 1회(주간 목표도 날마다 1회)이며 같은 판의 다른 목표와 겹치지 않는 것으로 바뀌고 진행은 0부터입니다.</Note>
            </TabsContent>
            <TabsContent value="feats" className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-m font-bold">업적 <span className="font-num text-xs font-normal text-ink-3">{Object.keys(feats).length} / {ACHIEVEMENTS.length}</span></h2>{pending.length > 0 && <Button type="button" size="sm" className="bg-accent text-accent-ink hover:bg-accent/90" disabled={busy} onClick={() => send({ type: 'claimAchievement', id: 'all' })}>보상 모두 받기 · {pending.length}개</Button>}</div>
                <AchievementGroups s={s} send={send} busy={busy}/>
            </TabsContent>
            <TabsContent value="bonus"><AchievementBonus s={s}/></TabsContent>
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

/** 업적 묶음(접었다 펼침)과 보상 받기. */
function AchievementGroups({ s, send, busy }: P) {
    const got = s.voyage || {}, feats = s.achievements || {}, claimed = s.achievementClaims || {};
    // v3.93 같은 묶음의 단계들은 진행도를 한 번만 계산합니다.
    const progress = progressReader(s);
    /** 업적 ‘사냥터 N곳’·‘던전 N곳’ 카드에 붙는 방문 기록. */
    const visited = (a: { id: string }) => a.id.startsWith('stages:') ? BASE_STAGES.filter(st => got[`stage:${st.id}`] !== undefined).map(st => st.name) : a.id.startsWith('dungeons:') ? DUNGEONS.filter(d => (s.clears?.[d.id] || 0) > 0).map(d => d.name) : null;
    return <>{ACHIEVEMENT_GROUPS.map(g => { const items = ACHIEVEMENTS.filter(a => a.group === g), doneCount = items.filter(a => feats[a.id] !== undefined).length, claimable = items.filter(a => feats[a.id] !== undefined && !claimed[a.id]).length;
        return <FoldSection key={g} title={g} defaultOpen={claimable > 0} summary={`${doneCount} / ${items.length}${claimable ? ` · 받을 보상 ${claimable}개` : ''}${g === CHALLENGE_GROUP ? ` · 플레이 ${Math.floor((s.playMs || 0) / 3_600_000).toLocaleString()}시간 · ${(s.turn || 0).toLocaleString()}턴 · 쓰러짐 ${(s.deaths || 0).toLocaleString()}회` : ''}`}>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{items.map(a => { const done = feats[a.id] !== undefined, isClaimed = !!claimed[a.id], p = Math.min(a.target, progress(a)), v = visited(a);
                return <article key={a.id} className={cn('grid content-start gap-1.5 rounded-m border p-3', isClaimed ? 'border-ok/40 bg-ok/5' : done ? 'border-accent/60 bg-accent-soft' : 'border-line bg-surface-1')}>
                    <div className="flex items-start justify-between gap-2"><strong className="text-s">{a.title}</strong>{isClaimed ? <Check size={14} className="shrink-0 text-ok"/> : done ? <Button type="button" size="xs" className="shrink-0 bg-accent text-accent-ink hover:bg-accent/90 pointer-coarse:min-h-11" disabled={busy} onClick={() => send({ type: 'claimAchievement', id: a.id })}>보상 받기</Button> : null}</div>
                    <p className="text-xs leading-relaxed text-ink-2">{a.desc}</p>
                    {v && v.length ? <small className="text-xs text-ink-3">다녀온 곳: {v.join(' · ')}</small> : null}
                    <StatBar size="s" tone={done ? 'exp' : 'accent'} value={p} max={a.target} label="달성"/>
                    <small className="text-xs text-gold-ink">{rewardText(a.reward)}</small>
                </article>; })}</div>
        </FoldSection>; })}</>;
}

/** 업적 보너스 탭: 받은 업적 수에 따른 업적 보너스(최대와 비교), 장착 AP, 받은 세계석·SP, 장착 AP가 붙은 업적 목록. */
function AchievementBonus({ s }: { s: State }) {
    const feats = s.achievements || {}, claimed = s.achievementClaims || {};
    const totals = achievementTotals(s), max = achievementMaxTotals();
    const claimedList = ACHIEVEMENTS.filter(a => claimed[a.id]);
    const pearls = claimedList.reduce((a, x) => a + (x.reward.pearls || 0), 0), sp = claimedList.reduce((a, x) => a + (x.reward.sp || 0), 0);
    const permanent = ACHIEVEMENTS.filter(a => a.reward.ap);
    const pct = (n: number) => `${Math.round(n * 100)}%`;
    return <div className="grid gap-3">
        <section className="grid gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1">
            <header className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-m font-bold">영구 보너스</h2><span className="text-xs text-ink-3">받은 업적의 보상만 셉니다 · 환생해도 유지</span></header>
            <KeyValueList columns={2} items={[{ key: '장착 AP', value: `+${totals.ap} / ${max.ap}` }, ...BONUS_KEYS.map(k => ({ key: BONUS_LABEL[k], value: `+${pct(totals.bonus[k])} / ${pct(max.bonus[k])}` }))]}/>
            <Note>업적 보너스는 받은 업적 1개마다 {BONUS_KEYS.map(k => `${BONUS_LABEL[k]} +${(ACHIEVEMENT_BONUS_PER[k] * 100).toFixed(2)}%`).join(' · ')}씩 쌓이고, 최종 능력치에 한 번 곱합니다. 받은 업적 {claimedList.length} / {ACHIEVEMENTS.length}개(명예 업적 {claimedList.filter(x => x.honor).length}개는 업적 보너스에서 제외) · 세계석 {pearls.toLocaleString()} · SP {sp} 수령.</Note>
        </section>
        <FoldSection title="장착 AP가 붙은 업적" summary={`${permanent.filter(a => claimed[a.id]).length} / ${permanent.length} 수령`} defaultOpen>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{permanent.map(a => { const done = feats[a.id] !== undefined, isClaimed = !!claimed[a.id]; return <article key={a.id} className={cn('grid content-start gap-1 rounded-m border p-3', isClaimed ? 'border-ok/40 bg-ok/5' : done ? 'border-accent/60 bg-accent-soft' : 'border-line bg-surface-1')}><div className="flex items-start justify-between gap-2"><strong className="text-s">{a.title}</strong>{isClaimed ? <Check size={14} className="text-ok"/> : <small className="text-xs text-ink-3">{done ? '받기 전' : '미달성'}</small>}</div><p className="text-xs leading-relaxed text-ink-2">{a.desc}</p><small className="text-xs text-gold-ink">{rewardText({ ap: a.reward.ap })}</small></article>; })}</div>
        </FoldSection>
    </div>;
}
