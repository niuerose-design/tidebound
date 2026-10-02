'use client';
import type { State } from '@/game/types';
import { Skills } from './skills-panel';
import { Classes } from './classes-panel';
import { VoyageLog } from './guidance-panels';
import { useEffect, useState } from 'react';
import { Anchor, BookOpen, Check, ChevronRight, ClipboardList, Compass, HelpCircle, Map, RefreshCw, ShoppingBag, Swords, Target, Trophy, Users, Waves, Zap, ScrollText } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Toaster, toast } from 'sonner';
import { useGame } from './use-game';
import { Guild } from './guild-panel';
import { Guide } from './guide-panel';
import { UpdateLog } from './update-log-panel';
import { LoginScreen } from './login-screen';
import { Inventory } from './inventory-panel';
import { Shop } from './shop-panel';
import { Rebirth } from './rebirth-panel';
import { Stages } from './stages-panel';
import { Dungeons } from './dungeons-panel';
import { Rankings } from './rankings-panel';
import { Character } from './character-panel';
import { Collection } from './collection-panel';
import { SettingsDialog } from './settings-dialog';
import { Navigation } from './navigation';
import { BattleView } from './battle-view';
import { MobileTabBar } from './mobile-tab-bar';
type NavItem = { id: string; name: string; Icon: React.ComponentType<{ size?: number }>; unlock?: (s: State) => string | null };
export const NAV: { label: string; items: NavItem[] }[] = [{ label: '항해', items: [{ id: 'battle', name: '자동 낚시', Icon: Anchor }, { id: 'stages', name: '낚시터', Icon: Map }, { id: 'dungeons', name: '던전 탐험', Icon: Compass }] }, { label: '낚시꾼', items: [{ id: 'character', name: '능력치 · 빌드', Icon: Target }, { id: 'shop', name: '항구 상점', Icon: ShoppingBag }, { id: 'inventory', name: '장비 보관함', Icon: ShoppingBag }, { id: 'skills', name: '스킬', Icon: Zap }, { id: 'classes', name: '전직', Icon: Swords }, { id: 'rebirth', name: '환생', Icon: RefreshCw, unlock: (s: State) => s.rebirths || s.level >= 20 ? null : 'Lv.20' }] }, { label: '기록과 명예', items: [{ id: 'book', name: '물고기 도감', Icon: BookOpen }, { id: 'voyage', name: '항해 기록', Icon: ScrollText }, { id: 'guild', name: '길드', Icon: Users, unlock: (s: State) => s.rebirths || s.level >= 10 ? null : 'Lv.10' }, { id: 'ranking', name: '랭킹 · 결투', Icon: Trophy, unlock: (s: State) => s.rebirths || s.level >= 10 ? null : 'Lv.10' }, { id: 'updates', name: '업데이트 내역', Icon: ClipboardList }, { id: 'help', name: '도움말', Icon: HelpCircle }] }];

export default function GameShell() {
    const game = useGame();
    const { state: s, error, busy, saved, send, loadRanking } = game;
    const [view, setView] = useState('battle'), [name, setName] = useState(''), [settings, setSettings] = useState(false);
    useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [view]);
    useEffect(() => {
        if (view === 'ranking')
            void loadRanking();
    }, [view, loadRanking]);
    useEffect(() => {
        if (error && s)
            toast.error(error);
    }, [error, s]);
    const props = s ? { s, send, busy } : null, onLogout = game.logout;
    return <SidebarProvider style={{ '--sidebar-width': '222px' } as React.CSSProperties}>
    <Toaster theme="dark" position="bottom-right"/>
    <Navigation view={view} setView={setView} s={s}/>
    <div className="app-body">
    {view !== 'battle' && <header className="topbar">
    <div className="breadcrumb"><SidebarTrigger className="mobile-menu"/><span>항해 기록</span><ChevronRight size={13}/><strong>{NAV.flatMap(g => g.items).find(i => i.id === view)?.name}</strong></div>
    <div className="topbar-right"><span className="save-status">{saved ? <Check size={13}/> : <RefreshCw size={13}/>}<span>{saved ? '저장됨' : '연결 중'}</span></span><SettingsDialog open={settings} onOpenChange={open => { setSettings(open); setName(s?.name || ''); }} s={s} busy={busy} send={send} name={name} setName={setName} onLogout={onLogout} onSwitchSlot={game.switchSlot}/></div>
    </header>}{!s && game.needsLogin ? <LoginScreen onSubmit={game.authenticate}/> : !s ? <div className="loading-screen">
        <Anchor size={48}/>
        <h1>{error ? '항해를 준비하지 못했습니다' : '바다와 연결하고 있습니다'}</h1>
        <p>{error || '낚시꾼의 기록을 불러오는 중입니다.'}</p>
        <button className="primary" onClick={() => send({ type: 'sync' })}>다시 연결</button></div> : <>
        <div className={`workspace ${view === 'battle' ? 'battle-workspace' : ''}`}>
        <main className="main-content">{error && <div className="error-box">{error}<button className="text-button" onClick={() => send({ type: 'sync' })}>다시 시도</button>
            </div>}{view === 'guild' && <Guild {...props!} info={game.guild} error={game.guildError} load={game.loadGuild} act={game.guildAct}/>}{view === 'updates' && <UpdateLog/>}{view === 'help' && <Guide s={props?.s}/>}{view === 'voyage' && <VoyageLog {...props!}/>}{view === 'battle' && <BattleView {...props!} saved={saved} settings={settings} setSettings={setSettings} name={name} setName={setName} setView={setView} onLogout={game.logout}/>}{view === 'character' && <Character {...props!}/>}{view === 'stages' && <Stages {...props!}/>}{view === 'dungeons' && <Dungeons {...props!}/>}{view === 'shop' && <Shop {...props!}/>}{view === 'inventory' && <Inventory {...props!}/>}{view === 'skills' && <Skills {...props!}/>}{view === 'classes' && <Classes {...props!}/>}{view === 'rebirth' && <Rebirth {...props!} vault={game.vault} vaultError={game.vaultError} loadVault={game.loadVault} vaultAct={game.vaultAct}/>}{view === 'book' && <Collection {...props!}/>}{view === 'ranking' && <Rankings {...props!} season={game.rankSeason} rows={game.rows} rankError={game.rankError} loadRanking={game.loadRanking} abyss={game.abyss} loadAbyss={game.loadAbyss} register={game.register} result={game.duel} setResult={game.setDuel}/>}</main></div>
        <MobileTabBar view={view} setView={setView}/>
        <footer className="app-footer">
        <span>TIDEBOUND <span className="muted">/</span> 심연의 낚시꾼</span>
        <span>행동력 없는 끝없는 항해 <Waves size={14}/>
        </span>
        </footer>
        </>}</div>
    </SidebarProvider>;
}

