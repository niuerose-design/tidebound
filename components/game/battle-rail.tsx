'use client';
import { AutoRunStatus } from './auto-run';
import { BookOpen, ChevronRight, Compass, Lock, Map, ShoppingBag, Swords, Trophy, Zap } from 'lucide-react';
import { STAGES, DUNGEONS } from '@/game/data/world';
import { BattleLogLine } from './combat-log';
import type { State, Action } from '@/game/types';
export function BattleRail({ s, busy, send, setView }: {
    s: State;
    busy: boolean;
    send: (a: Action) => void;
    setView: (v: string) => void;
}) {
    const battleLogs = s.logs.filter(log => log.type === 'battle').slice(-9).reverse();
    const dungeons = [...DUNGEONS].sort((a, b) => a.level - b.level);
    return <aside className="battle-utility-rail" aria-label="전투 보조 패널">
    <section className="panel battle-rail-panel battle-feed">
    <div className="section-title"><h2><Swords size={15}/> 전투 기록</h2><span className="micro">LIVE</span></div>
    <div className="battle-feed-list" role="log" aria-label="최근 전투 메시지">
    {battleLogs.length ? battleLogs.map(log => <BattleLogLine key={log.id} log={log} index/>) : <p className="battle-feed-empty">자동 낚시를 시작하면 전투 기록이 표시됩니다.</p>}
    </div>
    </section>
    <AutoRunStatus s={s} compact/>
    <section className="panel battle-rail-panel battle-selector-panel">
    <div className="section-title"><h2><Map size={15}/> 낚시터</h2><button className="text-button" onClick={() => setView('stages')}>전체 지도 <ChevronRight size={13}/></button></div>
    <div className="battle-stage-list">{STAGES.map((stage, index) => {
        const locked = s.level < stage.level || s.rebirths < stage.rebirth;
        return <button type="button" key={stage.id} className={`battle-stage-button ${s.stage === stage.id && !s.dungeon ? 'selected' : ''} ${locked ? 'locked' : ''}`} disabled={busy || locked || !!s.dungeon} onClick={() => send({ type: 'stage', id: stage.id })}>
        <span className="battle-stage-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{stage.name}</strong><small>Lv. {stage.level}{stage.rebirth ? ` · 환생 ${stage.rebirth}` : ''}</small></span>{locked ? <Lock size={13}/> : s.stage === stage.id && !s.dungeon ? <span className="battle-selected-dot"/> : null}
        </button>;
    })}</div>
    </section>
    <section className="panel battle-rail-panel battle-selector-panel">
    <div className="section-title"><h2><Compass size={15}/> 던전</h2><button className="text-button" onClick={() => setView('dungeons')}>탐험실 <ChevronRight size={13}/></button></div>
    <div className="battle-dungeon-list">{dungeons.map(dungeon => {
        const locked = s.level < dungeon.level || s.rebirths < dungeon.rebirth;
        const active = s.dungeon?.id === dungeon.id;
        return <button type="button" key={dungeon.id} className={`battle-dungeon-button ${active ? 'selected' : ''} ${locked ? 'locked' : ''}`} disabled={busy || locked || (!!s.dungeon && !active)} onClick={() => send({ type: 'dungeon', id: dungeon.id })}>
        <span><strong>{dungeon.name}</strong><small>Lv. {dungeon.level}{dungeon.rebirth ? ` · 환생 ${dungeon.rebirth}` : ''}</small></span>{locked ? <Lock size={13}/> : active ? <span className="battle-dungeon-wave">W{(s.dungeon?.wave || 0) + 1}</span> : <Swords size={13}/>} 
        </button>;
    })}</div>
    </section>
    <section className="panel battle-rail-panel battle-shortcuts">
    <div className="section-title"><h2><Zap size={15}/> 빠른 이동</h2></div>
    <div className="battle-shortcut-grid"><button type="button" onClick={() => setView('skills')}><Zap size={14}/>스킬 편성</button><button type="button" onClick={() => setView('inventory')}><ShoppingBag size={14}/>장비 보관함</button><button type="button" onClick={() => setView('book')}><BookOpen size={14}/>도감 연구</button><button type="button" onClick={() => setView('ranking')}><Trophy size={14}/>비동기 결투</button></div>
    </section>
    </aside>;
}
