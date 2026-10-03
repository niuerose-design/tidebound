'use client';
import { useEffect, useState } from 'react';
import { ChatPanel } from './chat-panel';
import { ChevronRight, Compass, Lock, Map, MessageCircle, Swords } from 'lucide-react';
import { STAGES, DUNGEONS , dungeonClosed, DUNGEON_CLOSED_NOTE } from '@/game/data/world';
import { BattleLogLine } from './combat-log';
import type { State, Action } from '@/game/types';
const FEED_KEY = 'tidebound.railFeed';
export function BattleRail({ s, busy, send, setView }: {
    s: State;
    busy: boolean;
    send: (a: Action) => void;
    setView: (v: string) => void;
}) {
    // v26.7 패널이 세로 공간을 채우므로 최근 40줄까지 보여 주고 스크롤합니다(전에는 9줄).
    const battleLogs = s.logs.filter(log => log.type === 'battle').slice(-40).reverse();
    const dungeons = [...DUNGEONS].sort((a, b) => a.level - b.level);
    // 낚시터·던전을 한 창에서 탭으로 고릅니다. 던전에 들어가면 던전 탭으로 넘어갑니다.
    const [tab, setTab] = useState<'stage' | 'dungeon'>(s.dungeon ? 'dungeon' : 'stage');
    // v25.4 전투 기록 ↔ 채팅 토글. 선택은 이 기기에 남깁니다.
    const [feed, setFeed] = useState<'log' | 'chat'>('log');
    useEffect(() => { const timer = window.setTimeout(() => { try { if (localStorage.getItem(FEED_KEY) === 'chat') setFeed('chat'); } catch { /* 저장소 없음 */ } }, 0); return () => window.clearTimeout(timer); }, []);
    const pickFeed = (v: 'log' | 'chat') => { setFeed(v); try { localStorage.setItem(FEED_KEY, v); } catch { /* 저장소 없음 */ } };
    const inDungeon = !!s.dungeon;
    const [wasInDungeon, setWasInDungeon] = useState(inDungeon);
    if (wasInDungeon !== inDungeon) { setWasInDungeon(inDungeon); if (inDungeon) setTab('dungeon'); }
    return <aside className="battle-utility-rail" aria-label="전투 보조 패널">
    <section className={`panel battle-rail-panel battle-feed ${feed === 'chat' ? 'feed-chat' : ''}`}>
    <div className="section-title"><div className="battle-place-tabs feed-tabs" role="tablist" aria-label="전투 기록 · 채팅">
        <button type="button" role="tab" aria-selected={feed === 'log'} className={feed === 'log' ? 'active' : ''} onClick={() => pickFeed('log')}><Swords size={14}/>전투 기록</button>
        <button type="button" role="tab" aria-selected={feed === 'chat'} className={feed === 'chat' ? 'active' : ''} onClick={() => pickFeed('chat')}><MessageCircle size={14}/>채팅</button>
    </div><span className="micro">{feed === 'chat' ? 'CHAT' : 'LIVE'}</span></div>
    {feed === 'log' ? <div className="battle-feed-list" role="log" aria-label="최근 전투 메시지">
    {battleLogs.length ? battleLogs.map(log => <BattleLogLine key={log.id} log={log} index playerName={s.name}/>) : <p className="battle-feed-empty">자동 낚시를 시작하면 전투 기록이 표시됩니다.</p>}
    </div> : <ChatPanel open={feed === 'chat'} playerName={s.name} guildName={s.guildMember?.name}/>}
    </section>
    <section className="panel battle-rail-panel battle-selector-panel">
    <div className="section-title"><div className="battle-place-tabs" role="tablist" aria-label="사냥터 종류">
        <button type="button" role="tab" id="place-tab-stage" aria-controls="place-panel" aria-selected={tab === 'stage'} className={tab === 'stage' ? 'active' : ''} onClick={() => setTab('stage')}><Map size={14}/>낚시터</button>
        <button type="button" role="tab" id="place-tab-dungeon" aria-controls="place-panel" aria-selected={tab === 'dungeon'} className={tab === 'dungeon' ? 'active' : ''} onClick={() => setTab('dungeon')}><Compass size={14}/>던전{s.dungeon && <span className="battle-place-live" aria-label="진행 중"/>}</button>
    </div>{tab === 'stage' ? <button className="text-button" onClick={() => setView('stages')}>전체 지도 <ChevronRight size={13}/></button> : <button className="text-button" onClick={() => setView('dungeons')}>탐험실 <ChevronRight size={13}/></button>}</div>
    <div id="place-panel" role="tabpanel" aria-labelledby={`place-tab-${tab}`}>
    {tab === 'stage' ? <div className="battle-stage-list">{STAGES.map((stage, index) => {
        const locked = s.level < stage.level || s.rebirths < stage.rebirth;
        return <button type="button" key={stage.id} className={`battle-stage-button ${s.stage === stage.id && !s.dungeon ? 'selected' : ''} ${locked ? 'locked' : ''}`} disabled={busy || locked || !!s.dungeon} onClick={() => send({ type: 'stage', id: stage.id })}>
        <span className="battle-stage-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{stage.name}</strong><small>Lv. {stage.level}{stage.rebirth ? ` · 환생 ${stage.rebirth}` : ''}</small></span>{locked ? <Lock size={13}/> : s.stage === stage.id && !s.dungeon ? <span className="battle-selected-dot"/> : null}
        </button>;
    })}</div>
    : <div className="battle-dungeon-list">{dungeons.map(dungeon => {
        const closed = dungeonClosed(dungeon.id), locked = closed || s.level < dungeon.level || s.rebirths < dungeon.rebirth;
        const active = s.dungeon?.id === dungeon.id;
        return <button type="button" key={dungeon.id} className={`battle-dungeon-button ${active ? 'selected' : ''} ${locked ? 'locked' : ''}`} disabled={busy || locked || (!!s.dungeon && !active)} onClick={() => send({ type: 'dungeon', id: dungeon.id })}>
        <span><strong>{dungeon.name}</strong><small>{closed ? DUNGEON_CLOSED_NOTE : `Lv. ${dungeon.level}${dungeon.rebirth ? ` · 환생 ${dungeon.rebirth}` : ''}`}</small></span>{locked ? <Lock size={13}/> : active ? <span className="battle-dungeon-wave">{dungeon.id === 'abyss' ? `${s.dungeon?.depth || s.abyssBest + 1}F · ` : ''}W{(s.dungeon?.wave || 0) + 1}</span> : <Swords size={13}/>} 
        </button>;
    })}</div>}
    {tab === 'stage' && s.dungeon && <p className="battle-place-note">던전 탐험 중에는 낚시터를 바꿀 수 없습니다.</p>}
    </div>
    </section>
    </aside>;
}
