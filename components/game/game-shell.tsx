'use client';
import type { State } from '@/game/types';
import { Skills } from './skills-panel';
import { Classes } from './classes-panel';
import { VoyageLog } from './guidance-panels';
import { useEffect, useState } from 'react';
import { BookOpen, Check, ChevronRight, HelpCircle, Map, RefreshCw, ShoppingBag, Target, Trophy, Users, Zap, Swords, Leaf } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Toaster, toast } from 'sonner';
import { useGame } from './use-game';
import { Guild } from './guild-panel';
import { SlotsPanel } from './slots-panel';
import { Guide } from './guide-panel';
import { UpdateLog } from './update-log-panel';
import { LoginScreen } from './login-screen';
import { Inventory } from './inventory-panel';
import { Shop } from './shop-panel';
import { Rebirth } from './rebirth-panel';
import { Stages } from './stages-panel';
import { Dungeons } from './dungeons-panel';
import { Altar } from './altar-panel';
import { Rankings } from './rankings-panel';
import { Character } from './character-panel';
import { Collection } from './collection-panel';
import { SettingsDialog } from './settings-dialog';
import { Navigation } from './navigation';
import { ViewTabs } from './view-tabs';
import { BattleView } from './battle-view';
import { MobileTabBar } from './mobile-tab-bar';
import { slotUnlocked } from '@/game/data/account';
type NavItem = { id: string; name: string; Icon: React.ComponentType<{ size?: number }>; unlock?: (s: State) => string | null; views?: string[] };
/** 합친 화면의 탭별 제목(상단 빵부스러기). 없으면 메뉴 이름을 씁니다. */
const VIEW_TITLES: Record<string, string> = { stages: '사냥터', dungeons: '던전 탐험', altar: '제단', skills: '스킬', classes: '전직', book: '몬스터 도감', voyage: '목표 · 업적', help: '도움말', updates: '업데이트 내역' };
export const NAV: { label: string; items: NavItem[] }[] = [{ label: '모험', items: [{ id: 'battle', name: '자동 사냥', Icon: Swords }, { id: 'stages', name: '사냥터·던전·제단', Icon: Map, views: ['stages', 'dungeons', 'altar'] }] }, { label: '모험가', items: [{ id: 'character', name: '능력치 · 빌드', Icon: Target }, { id: 'shop', name: '상점', Icon: ShoppingBag }, { id: 'inventory', name: '장비 보관함', Icon: ShoppingBag }, { id: 'skills', name: '스킬 · 전직', Icon: Zap, views: ['skills', 'classes'] }, { id: 'rebirth', name: '환생 · 분신', Icon: RefreshCw, views: ['rebirth', 'slots'] }] }, { label: '기록과 명예', items: [{ id: 'book', name: '도감 · 업적', Icon: BookOpen, views: ['book', 'voyage'] }, { id: 'guild', name: '길드', Icon: Users, unlock: (s: State) => s.rebirths || s.level >= 10 ? null : 'Lv.10' }, { id: 'ranking', name: '랭킹 · 결투', Icon: Trophy, unlock: (s: State) => s.rebirths || s.level >= 10 ? null : 'Lv.10' }, { id: 'help', name: '도움말 · 업데이트', Icon: HelpCircle, views: ['help', 'updates'] }] }];

export default function GameShell() {
    const game = useGame();
    const { state: s, error, busy, saved, send, loadRanking } = game;
    const [view, setView] = useState('battle'), [name, setName] = useState(''), [settings, setSettings] = useState(false);
    // v27.11 분신 탭은 계정 기준으로 엽니다. 새 슬롯(환생 0회)으로 바꾼 뒤에도 원래 캐릭터로 돌아갈 수 있어야 합니다.
    const slotsOpen = !!s && (!!s.rebirths || slotUnlocked(s.account, 2));
    useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [view]);
    // v27.62 전투를 보여 주는 화면(사냥·던전 탐험)만 3초 동기화, 나머지는 9초.
    const { setLive } = game;
    useEffect(() => { setLive(view === 'battle' || view === 'dungeons'); }, [view, setLive]);
    useEffect(() => {
        if (view === 'ranking')
            void loadRanking();
    }, [view, loadRanking]);
    useEffect(() => {
        if (error && s)
            toast.error(error);
    }, [error, s]);
    const props = s ? { s, send, busy } : null, onLogout = game.logout;
    return <SidebarProvider style={{ '--sidebar-width': '232px' } as React.CSSProperties}>
    <Toaster theme="dark" position="top-center" mobileOffset={{ top: 64 }}/>
    <Navigation view={view} setView={setView} s={s} onLogout={onLogout}/>
    <div className="app-body">
    {view !== 'battle' && <header className="topbar">
    <div className="breadcrumb"><SidebarTrigger className="mobile-menu"/><span>모험 기록</span><ChevronRight size={13}/><strong>{VIEW_TITLES[view] || NAV.flatMap(g => g.items).find(i => i.id === view || i.views?.includes(view))?.name}</strong></div>
    <div className="topbar-right"><span className="save-status">{saved ? <Check size={13}/> : <RefreshCw size={13}/>}<span>{saved ? '저장됨' : '연결 중'}</span></span><SettingsDialog open={settings} onOpenChange={open => { setSettings(open); setName(s?.name || ''); }} s={s} busy={busy} send={send} name={name} setName={setName} onSwitchSlot={game.switchSlot}/></div>
    </header>}{!s && game.needsLogin ? <LoginScreen onSubmit={game.authenticate}/> : !s ? <div className="loading-screen">
        <Leaf size={48}/>
        <h1>{error ? '모험을 준비하지 못했습니다' : '세계와 연결하고 있습니다'}</h1>
        <p>{error || '모험가의 기록을 불러오는 중입니다.'}</p>
        <button className="primary" onClick={() => send({ type: 'sync' })}>다시 연결</button></div> : <>
        <div className={`workspace ${view === 'battle' ? 'battle-workspace' : ''}`}>
        <main className="main-content">{error && <div className="error-box">{error}<button className="text-button" onClick={() => send({ type: 'sync' })}>다시 시도</button>
            </div>}{(view === 'rebirth' || view === 'slots') && <ViewTabs view={view} setView={setView} tabs={[['rebirth', '환생'], ['slots', slotsOpen ? '분신' : '분신 (환생 1회)']]}/>}{view === 'slots' && (slotsOpen ? <SlotsPanel {...props!} onSwitchSlot={game.switchSlot} vault={game.vault} vaultError={game.vaultError} loadVault={game.loadVault} vaultAct={game.vaultAct}/> : <section className="panel"><p className="tab-intro">분신(계정의 다른 모험가)은 첫 환생 뒤에 열립니다. 환생 탭에서 다음 모험을 준비하세요.</p></section>)}{view === 'guild' && <Guild {...props!} info={game.guild} error={game.guildError} load={game.loadGuild} act={game.guildAct}/>}{(view === 'help' || view === 'updates') && <><ViewTabs view={view} setView={setView} tabs={[['help', '도움말'], ['updates', '업데이트 내역']]}/>{view === 'help' ? <Guide s={props?.s}/> : <UpdateLog/>}</>}{view === 'battle' && <BattleView {...props!} frames={game.frames} saved={saved} settings={settings} setSettings={setSettings} name={name} setName={setName} setView={setView} onSwitchSlot={game.switchSlot}/>}{view === 'character' && <Character {...props!}/>}{(view === 'stages' || view === 'dungeons' || view === 'altar') && <><ViewTabs view={view} setView={setView} tabs={[['stages', '사냥터'], ['dungeons', '던전 탐험'], ['altar', '제단']]}/>{view === 'stages' ? <Stages {...props!}/> : view === 'dungeons' ? <Dungeons {...props!}/> : <Altar {...props!} info={game.altar} error={game.altarError} load={game.loadAltar} act={game.altarAct} result={game.altarResult} clearResult={() => game.setAltarResult(null)}/>}</>}{view === 'shop' && <Shop {...props!}/>}{view === 'inventory' && <Inventory {...props!}/>}{(view === 'skills' || view === 'classes') && <><ViewTabs view={view} setView={setView} tabs={[['skills', '스킬'], ['classes', '전직']]}/>{view === 'skills' ? <Skills {...props!}/> : <Classes {...props!}/>}</>}{view === 'rebirth' && <Rebirth {...props!}/>}{(view === 'book' || view === 'voyage') && <><ViewTabs view={view} setView={setView} tabs={[['book', '몬스터 도감'], ['voyage', '목표 · 업적']]}/>{view === 'book' ? <Collection {...props!}/> : <VoyageLog {...props!}/>}</>}{view === 'ranking' && <Rankings {...props!} season={game.rankSeason} rows={game.rows} rankError={game.rankError} loadRanking={game.loadRanking} abyss={game.abyss} loadAbyss={game.loadAbyss} register={game.register} result={game.duel} setResult={game.setDuel}/>}</main></div>
        <MobileTabBar view={view} setView={setView}/>
        <footer className="app-footer">
        <span>판게아 RPG</span>
        <span>행동력 없는 끝없는 모험 <Leaf size={14}/>
        </span>
        </footer>
        </>}</div>
    </SidebarProvider>;
}

