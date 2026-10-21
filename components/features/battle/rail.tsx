'use client';
/**
 * v3.389 사냥 화면 오른쪽 기록판 · 선택판(새 토대).
 * 기록판: 전투 · 획득 · 소식 · 채팅 탭(고른 탭은 이 기기에 남김). 선택판: 사냥터 · 던전 · 제단 탭(동기화 상태만 보고 재생 프레임마다 다시 그리지 않음).
 */
import { memo, useEffect, useState } from 'react';
import { ChevronRight, Compass, Flame, Lock, Map, Megaphone, MessageCircle, Sparkles, Swords } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { levelGateOk } from '@/game/systems/meta';
import { STAGES, PLAIN_DUNGEONS, closedIn, CLOSED_NOTE } from '@/game/data/world';
import { DUNGEON_MODES } from '@/game/data/balance';
import { ChatPanel, NewsFeed } from '@/components/game/chat-panel';
import { JournalLine, LOG_TABS, withTurnDividers } from '@/components/game/combat-log';
import { serverNow } from '@/components/game/jobs/job-status';
import { formatRemaining } from '@/components/game/shared';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatBar, FoldSection } from '@/components/ui/game';
import { cn } from '@/lib/utils';

const FEED_KEY = 'tidebound.railFeed';
type FeedTab = 'battle' | 'reward' | 'news' | 'chat';
const FEED_TABS: { id: FeedTab; label: string; Icon: typeof Swords }[] = [{ id: 'battle', label: '전투', Icon: Swords }, { id: 'reward', label: '획득', Icon: Sparkles }, { id: 'news', label: '소식', Icon: Megaphone }, { id: 'chat', label: '채팅', Icon: MessageCircle }];

export function Rail({ s, base, busy, send, setView }: { s: State; base: State; busy: boolean; send: (a: Action) => void; setView: (v: string) => void }) {
    return <div className="grid gap-3">
        <Feed s={s}/>
        <PlacePicker s={base} busy={busy} send={send} setView={setView}/>
    </div>;
}

function Feed({ s }: { s: State }) {
    // v3.255 전투 기록은 장면 안에서도 올라오므로, 기록판은 획득(드롭 · 경험치 · 골드)부터 엽니다.
    const [tab, setTab] = useState<FeedTab>('reward');
    useEffect(() => { const timer = window.setTimeout(() => { try { const v = localStorage.getItem(FEED_KEY); if (FEED_TABS.some(t => t.id === v)) setTab(v as FeedTab); } catch { /* 저장소 없음 */ } }, 0); return () => window.clearTimeout(timer); }, []);
    const pick = (v: string) => { setTab(v as FeedTab); try { localStorage.setItem(FEED_KEY, v); } catch { /* 저장소 없음 */ } };
    const lines = tab === 'battle' || tab === 'reward' ? s.logs.filter(l => LOG_TABS[tab].includes(l.type)).slice(-40).reverse() : [];
    const latestReward = tab === 'battle' ? s.logs.findLast(l => l.type === 'reward' || l.type === 'skill') : undefined;
    return <FoldSection title="기록판" level={2} defaultOpen className="p-0" extra={undefined}>
        <Tabs value={tab} onValueChange={pick}>
            <TabsList className="mb-2 flex w-full">{FEED_TABS.map(({ id, label, Icon }) => <TabsTrigger key={id} value={id} className="flex-1 gap-1"><Icon size={13}/>{label}</TabsTrigger>)}</TabsList>
        </Tabs>
        {tab === 'chat' ? <ChatPanel open playerName={s.name} guildName={s.guildMember?.name}/> : tab === 'news' ? <NewsFeed open/> : <>
            {latestReward && <button type="button" className="mb-2 flex w-full items-center gap-1.5 rounded-m bg-accent-soft px-2 py-1.5 text-left text-xs text-accent" onClick={() => pick('reward')} title="획득 기록 보기"><Sparkles size={12} className="shrink-0"/><span className="truncate">{latestReward.text}</span></button>}
            <div className="log-list rail-log max-h-72 overflow-y-auto text-xs" role="log" aria-label={tab === 'battle' ? '최근 전투 기록' : '최근 획득 기록'}>{lines.length ? withTurnDividers(lines, log => <JournalLine key={log.id} log={log} playerName={s.name}/>) : <p className="py-4 text-center text-xs text-ink-3">{tab === 'battle' ? '자동 사냥을 시작하면 전투 기록이 표시됩니다.' : '처치 보상과 획득 기록이 여기에 쌓입니다.'}</p>}</div>
        </>}
    </FoldSection>;
}

type PlaceTab = 'stage' | 'dungeon' | 'altar';
const PlacePicker = memo(function PlacePicker({ s, busy, send, setView }: { s: State; busy: boolean; send: (a: Action) => void; setView: (v: string) => void }) {
    const dungeons = [...PLAIN_DUNGEONS].sort((a, b) => a.level - b.level);
    const [tab, setTab] = useState<PlaceTab>(s.dungeon ? 'dungeon' : 'stage');
    const inDungeon = !!s.dungeon, [wasInDungeon, setWasInDungeon] = useState(inDungeon);
    if (wasInDungeon !== inDungeon) { setWasInDungeon(inDungeon); if (inDungeon) setTab('dungeon'); }
    const link = tab === 'stage' ? ['stages', '전체 지도'] : tab === 'dungeon' ? ['dungeons', '탐험실'] : ['altar', '열기'];
    return <section className="rounded-l border border-line bg-surface-2 p-3 shadow-1" aria-label="사냥터 · 던전 · 제단 고르기">
        <div className="mb-2 flex items-center gap-2">
            <Tabs value={tab} onValueChange={v => setTab(v as PlaceTab)} className="min-w-0 flex-1">
                <TabsList className="flex w-full">
                    <TabsTrigger value="stage" className="flex-1 gap-1"><Map size={13}/>사냥터</TabsTrigger>
                    <TabsTrigger value="dungeon" className="flex-1 gap-1"><Compass size={13}/>던전{s.dungeon && <span className="size-1.5 rounded-full bg-accent" aria-label="진행 중"/>}</TabsTrigger>
                    <TabsTrigger value="altar" className="flex-1 gap-1"><Flame size={13}/>제단{s.altarStatus?.blessings.length ? <span className="size-1.5 rounded-full bg-gold-ink" aria-label="축복 진행 중"/> : null}</TabsTrigger>
                </TabsList>
            </Tabs>
            <button type="button" className="inline-flex min-h-8 shrink-0 items-center gap-0.5 text-xs text-accent hover:text-ink-1 pointer-coarse:min-h-11" onClick={() => setView(link[0])}>{link[1]}<ChevronRight size={13}/></button>
        </div>
        <div className="grid max-h-64 gap-1 overflow-y-auto pr-0.5">
            {tab === 'stage' ? STAGES.map((stage, index) => {
                const closed = closedIn(s, 'stages', stage.id), locked = closed || !levelGateOk(s, stage.level) || s.rebirths < stage.rebirth, selected = s.stage === stage.id && !s.dungeon;
                return <PlaceRow key={stage.id} index={String(index + 1).padStart(2, '0')} title={stage.place} sub={closed ? CLOSED_NOTE : `${stage.region} · Lv. ${stage.level}${stage.rebirth ? ` · 환생 ${stage.rebirth}` : ''}${(stage.fit ?? 0) > stage.rebirth ? ` · 적정 ${stage.fit}` : ''}`} selected={selected} locked={locked} disabled={busy || locked || !!s.dungeon} onClick={() => send({ type: 'stage', id: stage.id })}/>;
            }) : tab === 'altar' ? <AltarRows s={s} setView={setView}/> : dungeons.map(dungeon => {
                const closed = closedIn(s, 'dungeons', dungeon.id), locked = closed || !levelGateOk(s, dungeon.level) || s.rebirths < dungeon.rebirth, active = s.dungeon?.id === dungeon.id;
                const wave = active ? `${dungeon.id === 'abyss' ? `${s.dungeon?.depth || s.abyssBest + 1}F · ` : s.dungeon?.mode && s.dungeon.mode !== 'normal' ? `${DUNGEON_MODES.find(m => m.id === s.dungeon!.mode)?.name} · ` : ''}W${(s.dungeon?.wave || 0) + 1}` : undefined;
                return <PlaceRow key={dungeon.id} title={dungeon.name} sub={closed ? CLOSED_NOTE : `Lv. ${dungeon.level}${dungeon.rebirth ? ` · 환생 ${dungeon.rebirth}` : ''}`} selected={active} locked={locked} badge={wave} disabled={busy || locked || (!!s.dungeon && !active)} onClick={() => send({ type: 'dungeon', id: dungeon.id })}/>;
            })}
            {tab === 'stage' && s.dungeon && <p className="px-1 py-1 text-xs text-ink-3">던전 탐험 중에는 사냥터를 바꿀 수 없습니다.</p>}
        </div>
    </section>;
});

function PlaceRow({ index, title, sub, selected, locked, badge, disabled, onClick, children }: { index?: string; title: string; sub: string; selected?: boolean; locked?: boolean; badge?: string; disabled?: boolean; onClick: () => void; children?: React.ReactNode }) {
    return <button type="button" aria-pressed={selected} disabled={disabled} onClick={onClick} className={cn('flex min-h-10 w-full items-center gap-2 rounded-m border px-2 py-1 text-left text-xs transition-colors', selected ? 'border-accent/60 bg-accent-soft text-ink-1' : 'border-transparent bg-surface-1 text-ink-2 hover:border-line-strong', locked && 'opacity-60', disabled && !locked && !selected && 'opacity-70')}>
        {index && <span className="w-5 shrink-0 font-num text-ink-3">{index}</span>}
        <span className="grid min-w-0 flex-1"><strong className="truncate font-semibold">{title}</strong><small className="truncate text-xs text-ink-3">{sub}</small>{children}</span>
        {locked ? <Lock size={12} className="shrink-0 text-ink-3"/> : badge ? <span className="shrink-0 rounded-s bg-surface-3 px-1.5 py-0.5 font-num text-xs text-accent">{badge}</span> : selected ? <span className="size-2 shrink-0 rounded-full bg-accent"/> : null}
    </button>;
}

/** v27.47 제단 탭: 동기화 때 받은 제단 요약(State.altarStatus). 누르면 제단 화면으로 갑니다. 살아 있는 월드보스도 보입니다. */
function AltarRows({ s, setView }: { s: State; setView: (v: string) => void }) {
    const a = s.altarStatus;
    if (!a) return <p className="py-4 text-center text-xs text-ink-3">제단 소식을 불러오는 중입니다. 위의 ‘열기’로 제단 화면을 바로 열 수 있습니다.</p>;
    const now = serverNow(s), open = () => setView('altar');
    return <>
        {a.blessings.map(b => <PlaceRow key={b.id} title={`${b.name} 진행 중`} sub={`${b.desc} · ${formatRemaining(b.until - now)} 남음`} selected onClick={open}/>)}
        {a.god && <PlaceRow title={`${a.god.name} 깨어남`} sub={`쓰러뜨리면 신의 자리 · ${formatRemaining(a.god.until - now)} 뒤 떠남`} selected onClick={open}/>}
        {(a.raids ?? []).map(r => <PlaceRow key={r.id} title={`${r.name}${(r.stage || 1) > 1 ? ` ${r.stage}단계` : ''} 출현`} sub={`남은 체력 ${Math.round(r.pct * 100)}% · ${formatRemaining(r.until - now)} 뒤 떠남`} selected onClick={open}><StatBar value={Math.round(r.pct * 100)} max={100} tone="danger" size="s" showText={false} className="mt-1"/></PlaceRow>)}
        {a.gauges.map(g => <PlaceRow key={g.id} title={g.name} sub={`게이지 ${g.pct}%`} onClick={open}><StatBar value={g.pct} max={100} tone="accent" size="s" showText={false} className="mt-1"/></PlaceRow>)}
        <p className="px-1 py-1 text-xs text-ink-3">신의 자리 · {a.throne || '비어 있음'}</p>
    </>;
}
