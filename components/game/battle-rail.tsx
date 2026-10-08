'use client';
import { memo, useEffect, useState } from 'react';
import { useIsMobile } from './use-mobile';
import { levelGateOk } from '@/game/systems/meta';
import { ChatPanel, NewsFeed } from './chat-panel';
import { JournalLine, LOG_TABS, withTurnDividers } from './combat-log';
import { ChevronDown, ChevronRight, Compass, Flame, Lock, Map, Megaphone, MessageCircle, Sparkles, Swords } from 'lucide-react';
import { serverNow } from './jobs/job-status';
import { Meter, formatRemaining } from './shared';
import { STAGES, PLAIN_DUNGEONS , closedIn, CLOSED_NOTE } from '@/game/data/world';
import { DUNGEON_MODES } from '@/game/data/balance';
import type { State, Action } from '@/game/types';
const FEED_KEY = 'tidebound.railFeed';
type FeedTab = 'battle' | 'reward' | 'news' | 'chat';
const FEED_TABS: { id: FeedTab; label: string; Icon: typeof Swords }[] = [{ id: 'battle', label: '전투', Icon: Swords }, { id: 'reward', label: '획득', Icon: Sparkles }, { id: 'news', label: '소식', Icon: Megaphone }, { id: 'chat', label: '채팅', Icon: MessageCircle }];
/**
 * v3.39 기록판: 가운데 ‘모험 일지’를 없애고 오른쪽 한 곳에 전투 · 획득 · 소식 · 채팅을 탭으로 모았습니다.
 * 고른 탭은 이 기기에 남깁니다. 소식·채팅은 그 탭을 볼 때만 서버에 묻습니다.
 */
export function BattleRail({ s, base, busy, send, setView }: {
    s: State;
    /** v27.62 재생 프레임이 아닌 동기화 상태. 사냥터·던전 선택판은 이것만 보고 프레임마다 다시 그리지 않습니다. */
    base: State;
    busy: boolean;
    send: (a: Action) => void;
    setView: (v: string) => void;
}) {
    const [tab, setTab] = useState<FeedTab>('battle');
    useEffect(() => { const timer = window.setTimeout(() => { try { const v = localStorage.getItem(FEED_KEY); if (FEED_TABS.some(t => t.id === v)) setTab(v as FeedTab); } catch { /* 저장소 없음 */ } }, 0); return () => window.clearTimeout(timer); }, []);
    const pick = (v: FeedTab) => { setTab(v); setOpened(true); try { localStorage.setItem(FEED_KEY, v); } catch { /* 저장소 없음 */ } };
    // v3.39 모바일도 기록판을 펼친 채로 시작합니다(가운데 일지가 없어짐). 화살표로 접을 수 있습니다.
    const mobile = useIsMobile(), [opened, setOpened] = useState(true), feedOpen = !mobile || opened;
    const lines = tab === 'battle' || tab === 'reward' ? s.logs.filter(l => LOG_TABS[tab].includes(l.type)).slice(-40).reverse() : [];
    const latestReward = tab === 'battle' ? s.logs.findLast(l => l.type === 'reward' || l.type === 'skill') : undefined;
    return <aside className="battle-utility-rail" aria-label="전투 보조 패널">
    <section className={`panel battle-rail-panel battle-feed ${tab === 'chat' ? 'feed-chat' : ''} ${feedOpen ? '' : 'folded'}`}>
    <div className="section-title"><div className="battle-place-tabs feed-tabs" role="tablist" aria-label="기록판">
        {FEED_TABS.map(({ id, label, Icon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => pick(id)}><Icon size={14}/>{label}</button>)}
    </div><button type="button" className="feed-fold" aria-expanded={feedOpen} aria-label={feedOpen ? '기록판 접기' : '기록판 펼치기'} onClick={() => setOpened(v => !v)}><ChevronDown size={15}/></button></div>
    {!feedOpen ? null : tab === 'chat' ? <ChatPanel open playerName={s.name} guildName={s.guildMember?.name}/> : tab === 'news' ? <NewsFeed open/> : <>
        {latestReward && <button type="button" className="log-reward-ticker" onClick={() => pick('reward')} title="획득 기록 보기"><Sparkles size={13}/><span>{latestReward.text}</span></button>}
        <div className="log-list rail-log" role="log" aria-label={tab === 'battle' ? '최근 전투 기록' : '최근 획득 기록'}>{lines.length ? withTurnDividers(lines, log => <JournalLine key={log.id} log={log} playerName={s.name}/>) : <p className="battle-feed-empty">{tab === 'battle' ? '자동 사냥을 시작하면 전투 기록이 표시됩니다.' : '처치 보상과 획득 기록이 여기에 쌓입니다.'}</p>}</div>
    </>}
    </section>
    <PlaceSelector s={base} busy={busy} send={send} setView={setView}/>
    </aside>;
}

type PlaceProps = { s: State; busy: boolean; send: (a: Action) => void; setView: (v: string) => void };
/**
 * 사냥터·던전·제단 선택판. 동기화 상태만 받아 전투 재생 프레임마다 다시 그리지 않습니다(v27.62).
 * v3.50 제단 탭을 다시 넣고(v3.37에 뺐던 것), 탭을 바꿔도 판 높이가 그대로이도록 목록 칸 높이를 고정했습니다(battle.css).
 */
const PlaceSelector = memo(function PlaceSelector({ s, busy, send, setView }: PlaceProps) {
    const dungeons = [...PLAIN_DUNGEONS].sort((a, b) => a.level - b.level);
    // 사냥터·던전을 한 창에서 탭으로 고릅니다. 던전에 들어가면 던전 탭으로 넘어갑니다.
    const [tab, setTab] = useState<'stage' | 'dungeon' | 'altar'>(s.dungeon ? 'dungeon' : 'stage');
    const inDungeon = !!s.dungeon;
    const [wasInDungeon, setWasInDungeon] = useState(inDungeon);
    if (wasInDungeon !== inDungeon) { setWasInDungeon(inDungeon); if (inDungeon) setTab('dungeon'); }
    return <>
    <section className="panel battle-rail-panel battle-selector-panel">
    <div className="section-title"><div className="battle-place-tabs" role="tablist" aria-label="사냥터 종류">
        <button type="button" role="tab" id="place-tab-stage" aria-controls="place-panel" aria-selected={tab === 'stage'} className={tab === 'stage' ? 'active' : ''} onClick={() => setTab('stage')}><Map size={14}/>사냥터</button>
        <button type="button" role="tab" id="place-tab-dungeon" aria-controls="place-panel" aria-selected={tab === 'dungeon'} className={tab === 'dungeon' ? 'active' : ''} onClick={() => setTab('dungeon')}><Compass size={14}/>던전{s.dungeon && <span className="battle-place-live" aria-label="진행 중"/>}</button>
        <button type="button" role="tab" id="place-tab-altar" aria-controls="place-panel" aria-selected={tab === 'altar'} className={tab === 'altar' ? 'active' : ''} onClick={() => setTab('altar')}><Flame size={14}/>제단{s.altarStatus?.blessings.length ? <span className="battle-tab-dot" aria-label="축복 진행 중"/> : null}</button>
    </div>{tab === 'stage' ? <button className="text-button" onClick={() => setView('stages')}>전체 지도 <ChevronRight size={13}/></button> : tab === 'dungeon' ? <button className="text-button" onClick={() => setView('dungeons')}>탐험실 <ChevronRight size={13}/></button> : <button className="text-button" onClick={() => setView('altar')}>열기 <ChevronRight size={13}/></button>}</div>
    <div id="place-panel" role="tabpanel" aria-labelledby={`place-tab-${tab}`}>
    {tab === 'stage' ? <div className="battle-stage-list">{STAGES.map((stage, index) => {
        const closed = closedIn(s, 'stages', stage.id), locked = closed || !levelGateOk(s, stage.level) || s.rebirths < stage.rebirth;
        return <button type="button" key={stage.id} className={`battle-stage-button ${s.stage === stage.id && !s.dungeon ? 'selected' : ''} ${locked ? 'locked' : ''}`} disabled={busy || locked || !!s.dungeon} onClick={() => send({ type: 'stage', id: stage.id })}>
        <span className="battle-stage-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{stage.place}</strong><small>{closed ? CLOSED_NOTE : `${stage.region} · Lv. ${stage.level}${stage.rebirth ? ` · 환생 ${stage.rebirth}` : ''}${(stage.fit ?? 0) > stage.rebirth ? ` · 적정 ${stage.fit}` : ''}`}</small></span>{locked ? <Lock size={13}/> : s.stage === stage.id && !s.dungeon ? <span className="battle-selected-dot"/> : null}
        </button>;
    })}</div>
    : tab === 'altar' ? <AltarRail s={s} setView={setView}/>
    : <div className="battle-dungeon-list">{dungeons.map(dungeon => {
        const closed = closedIn(s, 'dungeons', dungeon.id), locked = closed || !levelGateOk(s, dungeon.level) || s.rebirths < dungeon.rebirth;
        const active = s.dungeon?.id === dungeon.id;
        return <button type="button" key={dungeon.id} className={`battle-dungeon-button ${active ? 'selected' : ''} ${locked ? 'locked' : ''}`} disabled={busy || locked || (!!s.dungeon && !active)} onClick={() => send({ type: 'dungeon', id: dungeon.id })}>
        <span><strong>{dungeon.name}</strong><small>{closed ? CLOSED_NOTE : `Lv. ${dungeon.level}${dungeon.rebirth ? ` · 환생 ${dungeon.rebirth}` : ''}`}</small></span>{locked ? <Lock size={13}/> : active ? <span className="battle-dungeon-wave">{dungeon.id === 'abyss' ? `${s.dungeon?.depth || s.abyssBest + 1}F · ` : s.dungeon?.mode && s.dungeon.mode !== 'normal' ? `${DUNGEON_MODES.find(m => m.id === s.dungeon!.mode)?.name} · ` : ''}W{(s.dungeon?.wave || 0) + 1}</span> : <Swords size={13}/>} 
        </button>;
    })}</div>}
    {tab === 'stage' && s.dungeon && <p className="battle-place-note">던전 탐험 중에는 사냥터를 바꿀 수 없습니다.</p>}
    </div>
    </section>
    </>;
});

/** v27.47 오른쪽 선택판 제단 탭(v3.50 복구): 동기화 때 받은 제단 요약(State.altarStatus). 누르면 제단 화면으로 갑니다. 살아 있는 월드보스도 보입니다. */
function AltarRail({ s, setView }: { s: State; setView: (v: string) => void }) {
    const a = s.altarStatus;
    if (!a) return <div className="battle-dungeon-list battle-altar-list"><p className="battle-feed-empty">제단 소식을 불러오는 중입니다. 위의 ‘열기’로 제단 화면을 바로 열 수 있습니다.</p></div>;
    const now = serverNow(s), open = () => setView('altar');
    return <div className="battle-dungeon-list battle-altar-list">
        {a.blessings.map(b => <button type="button" key={b.id} className="battle-dungeon-button selected" onClick={open}><span><strong>{b.name} 진행 중</strong><small>{b.desc} · {formatRemaining(b.until - now)} 남음</small></span><Flame size={13}/></button>)}
        {a.god && <button type="button" className="battle-dungeon-button selected" onClick={open}><span><strong>{a.god.name} 깨어남</strong><small>쓰러뜨리면 신의 자리 · {formatRemaining(a.god.until - now)} 뒤 떠남</small></span><Swords size={13}/></button>}
        {(a.raids ?? []).map(r => <button type="button" key={r.id} className="battle-dungeon-button selected battle-altar-gauge" onClick={open}><span><strong>{r.name}{(r.stage || 1) > 1 ? ` ${r.stage}단계` : ''} 출현</strong><small>남은 체력 {Math.round(r.pct * 100)}% · {formatRemaining(r.until - now)} 뒤 떠남</small><Meter value={Math.round(r.pct * 100)} max={100}/></span></button>)}
        {a.gauges.map(g => <button type="button" key={g.id} className="battle-dungeon-button battle-altar-gauge" onClick={open}><span><strong>{g.name}</strong><small>게이지 {g.pct}%</small><Meter value={g.pct} max={100}/></span></button>)}
        <p className="battle-altar-throne">신의 자리 · {a.throne || '비어 있음'}</p>
    </div>;
}
