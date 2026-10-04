'use client';
import { memo, useEffect, useState } from 'react';
import { levelGateOk } from '@/game/systems/meta';
import { ChatPanel } from './chat-panel';
import { ChevronRight, Compass, Flame, Lock, Map, MessageCircle, Swords } from 'lucide-react';
import { serverNow } from './jobs/job-status';
import { Meter } from './shared';
import { STAGES, DUNGEONS , closedIn, CLOSED_NOTE } from '@/game/data/world';
import { DUNGEON_MODES } from '@/game/data/balance';
import { BattleLogLine } from './combat-log';
import type { State, Action } from '@/game/types';
const FEED_KEY = 'tidebound.railFeed';
export function BattleRail({ s, base, busy, send, setView }: {
    s: State;
    /** v27.62 재생 프레임이 아닌 동기화 상태. 사냥터·던전 선택판은 이것만 보고 프레임마다 다시 그리지 않습니다. */
    base: State;
    busy: boolean;
    send: (a: Action) => void;
    setView: (v: string) => void;
}) {
    // v26.7 패널이 세로 공간을 채우므로 최근 40줄까지 보여 주고 스크롤합니다(전에는 9줄).
    const battleLogs = s.logs.filter(log => log.type === 'battle').slice(-40).reverse();
    // v25.4 전투 기록 ↔ 채팅 토글. 선택은 이 기기에 남깁니다.
    const [feed, setFeed] = useState<'log' | 'chat'>('log');
    useEffect(() => { const timer = window.setTimeout(() => { try { if (localStorage.getItem(FEED_KEY) === 'chat') setFeed('chat'); } catch { /* 저장소 없음 */ } }, 0); return () => window.clearTimeout(timer); }, []);
    const pickFeed = (v: 'log' | 'chat') => { setFeed(v); try { localStorage.setItem(FEED_KEY, v); } catch { /* 저장소 없음 */ } };
    return <aside className="battle-utility-rail" aria-label="전투 보조 패널">
    <section className={`panel battle-rail-panel battle-feed ${feed === 'chat' ? 'feed-chat' : ''}`}>
    <div className="section-title"><div className="battle-place-tabs feed-tabs" role="tablist" aria-label="전투 기록 · 채팅">
        <button type="button" role="tab" aria-selected={feed === 'log'} className={feed === 'log' ? 'active' : ''} onClick={() => pickFeed('log')}><Swords size={14}/>전투 기록</button>
        <button type="button" role="tab" aria-selected={feed === 'chat'} className={feed === 'chat' ? 'active' : ''} onClick={() => pickFeed('chat')}><MessageCircle size={14}/>채팅</button>
    </div><span className="micro">{feed === 'chat' ? 'CHAT' : 'LIVE'}</span></div>
    {feed === 'log' ? <div className="battle-feed-list" role="log" aria-label="최근 전투 메시지">
    {battleLogs.length ? battleLogs.map(log => <BattleLogLine key={log.id} log={log} index playerName={s.name}/>) : <p className="battle-feed-empty">자동 사냥을 시작하면 전투 기록이 표시됩니다.</p>}
    </div> : <ChatPanel open={feed === 'chat'} playerName={s.name} guildName={s.guildMember?.name}/>}
    </section>
    <PlaceSelector s={base} busy={busy} send={send} setView={setView}/>
    </aside>;
}

type PlaceProps = { s: State; busy: boolean; send: (a: Action) => void; setView: (v: string) => void };
/** 사냥터·던전·제단 선택판. 동기화 상태만 받아 전투 재생 프레임마다 다시 그리지 않습니다(v27.62). */
const PlaceSelector = memo(function PlaceSelector({ s, busy, send, setView }: PlaceProps) {
    const dungeons = [...DUNGEONS].sort((a, b) => a.level - b.level);
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
        <span className="battle-stage-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{stage.place}</strong><small>{closed ? CLOSED_NOTE : `${stage.region} · Lv. ${stage.level}${stage.rebirth ? ` · 환생 ${stage.rebirth}` : ''}`}</small></span>{locked ? <Lock size={13}/> : s.stage === stage.id && !s.dungeon ? <span className="battle-selected-dot"/> : null}
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

const left = (ms: number) => { const m = Math.max(1, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`; };
/** v27.47 오른쪽 패널 제단 탭: 동기화 때 받은 제단 요약(State.altarStatus). 누르면 제단 화면으로 갑니다. */
function AltarRail({ s, setView }: { s: State; setView: (v: string) => void }) {
    const a = s.altarStatus;
    if (!a) return <p className="battle-feed-empty">제단 소식을 불러오는 중입니다. 공물 바치기에서 바로 열 수 있습니다.</p>;
    const now = serverNow(s), open = () => setView('altar');
    return <div className="battle-dungeon-list battle-altar-list">
        {a.blessings.map(b => <button type="button" key={b.id} className="battle-dungeon-button selected" onClick={open}><span><strong>{b.name} 진행 중</strong><small>{b.desc} · {left(b.until - now)} 남음</small></span><Flame size={13}/></button>)}
        {a.god && <button type="button" className="battle-dungeon-button selected" onClick={open}><span><strong>{a.god.name} 깨어남</strong><small>쓰러뜨리면 신의 자리 · {left(a.god.until - now)} 뒤 떠남</small></span><Swords size={13}/></button>}
        {a.gauges.map(g => <button type="button" key={g.id} className="battle-dungeon-button battle-altar-gauge" onClick={open}><span><strong>{g.name}</strong><small>게이지 {g.pct}%</small><Meter value={g.pct} max={100}/></span></button>)}
        <p className="battle-altar-throne">신의 자리 · {a.throne || '비어 있음'}</p>
    </div>;
}
