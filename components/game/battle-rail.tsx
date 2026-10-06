'use client';
import { memo, useState } from 'react';
import { useIsMobile } from './use-mobile';
import { levelGateOk } from '@/game/systems/meta';
import { ChatPanel } from './chat-panel';
import { ChevronDown, ChevronRight, Compass, Lock, Map, MessageCircle, Swords } from 'lucide-react';
import { STAGES, PLAIN_DUNGEONS , closedIn, CLOSED_NOTE } from '@/game/data/world';
import { DUNGEON_MODES } from '@/game/data/balance';
import type { State, Action } from '@/game/types';
export function BattleRail({ s, base, busy, send, setView }: {
    s: State;
    /** v27.62 재생 프레임이 아닌 동기화 상태. 사냥터·던전 선택판은 이것만 보고 프레임마다 다시 그리지 않습니다. */
    base: State;
    busy: boolean;
    send: (a: Action) => void;
    setView: (v: string) => void;
}) {
    // v3.36 전투 기록은 가운데 ‘모험 일지’ 한 곳에만 둡니다. 오른쪽 위 패널은 채팅 전용입니다.
    // v27.88 모바일: 장면 바로 아래에 접힌 채로 두고 화살표로 펼칩니다(채팅은 펼쳤을 때만 불러옴). 데스크톱은 늘 펼침.
    const mobile = useIsMobile(), [opened, setOpened] = useState(false), feedOpen = !mobile || opened;
    return <aside className="battle-utility-rail" aria-label="전투 보조 패널">
    <section className={`panel battle-rail-panel battle-feed feed-chat ${feedOpen ? '' : 'folded'}`}>
    <div className="section-title"><h2><MessageCircle size={14}/>채팅</h2><span className="micro">CHAT</span><button type="button" className="feed-fold" aria-expanded={feedOpen} aria-label={feedOpen ? '채팅 접기' : '채팅 펼치기'} onClick={() => setOpened(v => !v)}><ChevronDown size={15}/></button></div>
    {feedOpen && <ChatPanel open playerName={s.name} guildName={s.guildMember?.name}/>}
    </section>
    <PlaceSelector s={base} busy={busy} send={send} setView={setView}/>
    </aside>;
}

type PlaceProps = { s: State; busy: boolean; send: (a: Action) => void; setView: (v: string) => void };
/** 사냥터·던전 선택판(v3.36 제단 탭은 위쪽 제단 알림과 겹쳐 뺐습니다). 동기화 상태만 받아 전투 재생 프레임마다 다시 그리지 않습니다(v27.62). */
const PlaceSelector = memo(function PlaceSelector({ s, busy, send, setView }: PlaceProps) {
    const dungeons = [...PLAIN_DUNGEONS].sort((a, b) => a.level - b.level);
    // 사냥터·던전을 한 창에서 탭으로 고릅니다. 던전에 들어가면 던전 탭으로 넘어갑니다.
    const [tab, setTab] = useState<'stage' | 'dungeon'>(s.dungeon ? 'dungeon' : 'stage');
    const inDungeon = !!s.dungeon;
    const [wasInDungeon, setWasInDungeon] = useState(inDungeon);
    if (wasInDungeon !== inDungeon) { setWasInDungeon(inDungeon); if (inDungeon) setTab('dungeon'); }
    return <>
    <section className="panel battle-rail-panel battle-selector-panel">
    <div className="section-title"><div className="battle-place-tabs" role="tablist" aria-label="사냥터 종류">
        <button type="button" role="tab" id="place-tab-stage" aria-controls="place-panel" aria-selected={tab === 'stage'} className={tab === 'stage' ? 'active' : ''} onClick={() => setTab('stage')}><Map size={14}/>사냥터</button>
        <button type="button" role="tab" id="place-tab-dungeon" aria-controls="place-panel" aria-selected={tab === 'dungeon'} className={tab === 'dungeon' ? 'active' : ''} onClick={() => setTab('dungeon')}><Compass size={14}/>던전{s.dungeon && <span className="battle-place-live" aria-label="진행 중"/>}</button>
    </div>{tab === 'stage' ? <button className="text-button" onClick={() => setView('stages')}>전체 지도 <ChevronRight size={13}/></button> : <button className="text-button" onClick={() => setView('dungeons')}>탐험실 <ChevronRight size={13}/></button>}</div>
    <div id="place-panel" role="tabpanel" aria-labelledby={`place-tab-${tab}`}>
    {tab === 'stage' ? <div className="battle-stage-list">{STAGES.map((stage, index) => {
        const closed = closedIn(s, 'stages', stage.id), locked = closed || !levelGateOk(s, stage.level) || s.rebirths < stage.rebirth;
        return <button type="button" key={stage.id} className={`battle-stage-button ${s.stage === stage.id && !s.dungeon ? 'selected' : ''} ${locked ? 'locked' : ''}`} disabled={busy || locked || !!s.dungeon} onClick={() => send({ type: 'stage', id: stage.id })}>
        <span className="battle-stage-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{stage.place}</strong><small>{closed ? CLOSED_NOTE : `${stage.region} · Lv. ${stage.level}${stage.rebirth ? ` · 환생 ${stage.rebirth}` : ''}`}</small></span>{locked ? <Lock size={13}/> : s.stage === stage.id && !s.dungeon ? <span className="battle-selected-dot"/> : null}
        </button>;
    })}</div>
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
