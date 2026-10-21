'use client';
import { GAME_BUILD } from '@/game/data/update-log';
import { useFxGlowClass } from './skill-fx-setting';
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Leaf } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster, toast } from 'sonner';
import { useGame } from './use-game';
import { LoginScreen } from './login-screen';
import { viewFromHash, hashForView } from './view-route';
// v3.386 재설계 4단계 셸: 사이드바 · 상단 바 · 모바일 탭 · 진행 위젯(components/features/shell). 옛 navigation · mobile-tab-bar 는 다음 버전에 삭제.
import { SideNav, TopBar, TabBar, ActivityWidget, ALL_VIEWS, navHidden } from '@/components/features/shell';
import { ViewTabs } from './view-tabs';
// v3.389~3.390 재설계 4단계 다섯째 화면: 자동 사냥.
import { BattleScreen } from '@/components/features/battle';
import { useFeedLiveRates } from './live-rates';
import { useFeedBattleRecords } from './battle-records';
import { slotUnlocked } from '@/game/data/account';
import { isHackerJob } from '@/game/data/hacker';
/**
 * v3.228 화면 코드 나누기: 첫 화면(자동 사냥)에 필요 없는 메뉴 화면은 처음 열 때 따로 받습니다(첫 로딩 · 모바일 파싱 시간 단축).
 * 첫 동기화 뒤 브라우저가 한가할 때 미리 받아 두어(preloadPanels), 메뉴를 처음 열 때도 거의 기다리지 않습니다.
 */
const panelLoaders: (() => Promise<unknown>)[] = [];
function lazyPanel<P>(load: () => Promise<React.ComponentType<P>>) {
    panelLoaders.push(load);
    return dynamic(load, { loading: () => <div className="panel-loading" aria-busy="true"/> });
}
let preloaded = false;
function preloadPanels() {
    if (preloaded) return;
    preloaded = true;
    // Safari에는 requestIdleCallback이 없어 잠깐 뒤로 미룹니다.
    const idle = (fn: () => void) => typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500);
    idle(() => { for (const load of panelLoaders) void load().catch(() => { preloaded = false; }); });
}
// v3.397 재설계 4단계: 전직 · 숙련 진행판(새 토대).
const MasteryBoard = lazyPanel(() => import('@/components/features/jobs').then(m => m.MasteryScreen));
// v3.385 재설계 4단계 네 번째 화면: 스킬(새 토대). 옛 skills-panel 은 다음 버전에 삭제.
const Skills = lazyPanel(() => import('@/components/features/skills/skills-screen').then(m => m.SkillsScreen));
const Classes = lazyPanel(() => import('@/components/features/jobs').then(m => m.ClassesScreen));
const VoyageLog = lazyPanel(() => import('./guidance-panels').then(m => m.VoyageLog));
const Guild = lazyPanel(() => import('./guild-panel').then(m => m.Guild));
// v3.398 재설계 4단계: 환생 · 분신(새 토대).
const SlotsPanel = lazyPanel(() => import('@/components/features/legacy').then(m => m.SlotsScreen));
const Hacker = lazyPanel(() => import('./hacker-panel').then(m => m.Hacker));
// v3.400 재설계 4단계: 도움말(새 토대).
const Guide = lazyPanel(() => import('@/components/features/help').then(m => m.HelpScreen));
// v3.399 재설계 4단계: 통계 · 전투 기록 · 업데이트 내역(새 토대).
const UpdateLog = lazyPanel(() => import('@/components/features/records').then(m => m.UpdatesScreen));
// v3.384 재설계 4단계 세 번째 화면: 장비 보관함(새 토대). 옛 inventory-panel 은 상점 강화 탭 · 환생 화면이 아직 써서 남겨 둡니다.
const Inventory = lazyPanel(() => import('@/components/features/inventory/inventory-screen').then(m => m.InventoryScreen));
// v3.393 재설계 4단계: 상점 · 던전 주화 상점(새 토대).
const Shop = lazyPanel(() => import('@/components/features/shop').then(m => m.ShopScreen));
const DungeonShop = lazyPanel(() => import('@/components/features/shop').then(m => m.DungeonShopScreen));
const Expedition = lazyPanel(() => import('./expedition-panel').then(m => m.Expedition));
const MarketPanel = lazyPanel(() => import('./market-panel').then(m => m.MarketPanel));
const StoryPanel = lazyPanel(() => import('./story-panel').then(m => m.StoryPanel));
const Rebirth = lazyPanel(() => import('@/components/features/legacy').then(m => m.RebirthScreen));
// v3.395 재설계 4단계: 사냥터 · 던전(새 토대).
const Stages = lazyPanel(() => import('@/components/features/world').then(m => m.StagesScreen));
const Dungeons = lazyPanel(() => import('@/components/features/world').then(m => m.DungeonsScreen));
// v3.396 재설계 4단계: 세계의 제단(새 토대).
const Altar = lazyPanel(() => import('@/components/features/altar').then(m => m.AltarScreen));
const Rankings = lazyPanel(() => import('./rankings-panel').then(m => m.Rankings));
// v3.392 재설계 4단계: 능력치 · 치장(새 토대).
const Character = lazyPanel(() => import('@/components/features/character').then(m => m.CharacterScreen));
const Cosmetics = lazyPanel(() => import('@/components/features/character').then(m => m.CosmeticsScreen));
// v3.382 재설계 4단계 두 번째 화면: 도감(새 토대). 옛 collection-panel 은 다음 버전에 삭제.
const Collection = lazyPanel(() => import('@/components/features/codex/codex-screen').then(m => m.CodexScreen));
const Stats = lazyPanel(() => import('@/components/features/records').then(m => m.StatsScreen));
const Crew = lazyPanel(() => import('./crew-panel').then(m => m.Crew));
const BattleRecordsPanel = lazyPanel(() => import('@/components/features/records').then(m => m.RecordsScreen));
// v3.381 재설계 4단계 첫 화면: 설정(토큰 · shadcn · 게임 범용 조각으로 새로 만든 화면).
const SettingsScreen = lazyPanel(() => import('@/components/features/settings/settings-screen').then(m => m.SettingsScreen));
export default function GameShell() {
    // v3.171 섬광이 꺼진 기기에서는 <html>에 fx-no-glow를 붙입니다(설정 창의 '섬광 효과').
    useFxGlowClass();
    const game = useGame();
    const { state: s, error, busy, saved, send, loadRanking, newBuild } = game;
    // v3.13 실시간 효율: 동기화로 받은 원본 상태만 흘려 넣습니다(브라우저 계산, 서버 요청 없음).
    useFeedLiveRates(s);
    // v3.101 최근 전투 기록(몹별): 받은 로그를 이 브라우저에만 모읍니다(서버 요청 없음).
    useFeedBattleRecords(s);
    const [picked, setPicked] = useState('battle');
    // v3.381 화면 주소: 메뉴 화면은 #해시로 적어 새로고침 · 뒤로가기 · 공유가 됩니다(view-route.ts). 첫 그림은 서버와 같게 자동 사냥으로 그리고, 붙은 뒤 해시를 읽습니다.
    const setView = useCallback((v: string) => { setPicked(v); if (window.location.hash !== hashForView(v)) window.history.pushState(null, '', hashForView(v) || window.location.pathname + window.location.search); }, []);
    useEffect(() => { const apply = () => setPicked(viewFromHash(window.location.hash, ALL_VIEWS)); apply(); window.addEventListener('hashchange', apply); window.addEventListener('popstate', apply); return () => { window.removeEventListener('hashchange', apply); window.removeEventListener('popstate', apply); }; }, []);
    // v3.25 지금 직업에서 숨긴 화면이면 자동 사냥 화면으로.
    const view = navHidden(s, picked) ? 'battle' : picked;
    // v27.11 분신 탭은 계정 기준으로 엽니다. 새 슬롯(환생 0회)으로 바꾼 뒤에도 원래 캐릭터로 돌아갈 수 있어야 합니다.
    const slotsOpen = !!s && (!!s.rebirths || slotUnlocked(s.account, 2));
    useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [view]);
    // v27.62 전투를 보여 주는 화면(사냥·던전 탐험)만 SYNC_MS(5초) 동기화, 나머지는 15초(use-game.ts).
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
    // v3.228 첫 상태를 받은 뒤 나머지 화면 코드를 한가할 때 미리 받습니다.
    useEffect(() => { if (s) preloadPanels(); }, [s]);
    const props = s ? { s, send, busy } : null, onLogout = game.logout;
    // v3.218 사이드바 폭도 화면 배율(--sidebar-zoom, shell.css)을 따라 커집니다.
    return <SidebarProvider style={{ '--sidebar-width': 'calc(232px * var(--sidebar-zoom, 1))' } as React.CSSProperties}>
    <Toaster theme="dark" position="top-center" mobileOffset={{ top: 64 }}/>
    <SideNav view={view} setView={setView} s={s} onLogout={onLogout}/>
    <div className={`app-body max-md:pb-[calc(64px+env(safe-area-inset-bottom))]! ${view !== 'battle' ? 'max-md:pb-[calc(112px+env(safe-area-inset-bottom))]!' : ''}`}>
    <TopBar view={view} s={s} saved={saved} setView={setView}/>{!s && game.needsLogin ? <LoginScreen onSubmit={game.authenticate}/> : !s ? <div className="loading-screen">
        <Leaf size={48}/>
        <h1>{error ? '모험을 준비하지 못했습니다' : '세계와 연결하고 있습니다'}</h1>
        <p>{error || '모험가의 기록을 불러오는 중입니다.'}</p>
        <button className="primary" onClick={() => send({ type: 'sync' })}>다시 연결</button></div> : <>
        <div className={`workspace ${view === 'battle' ? 'battle-workspace' : ''}`}>
        <main className="main-content">{newBuild && <div className="update-banner" role="status"><span>새 버전 <b>v{newBuild}</b>이 나왔습니다. 지금 화면은 v{GAME_BUILD}라 수치가 다르게 보일 수 있습니다.</span><button className="primary" onClick={() => window.location.reload()}>새로고침</button></div>}{error && <div className="error-box">{error}<button className="text-button" onClick={() => send({ type: 'sync' })}>다시 시도</button>
            </div>}{(view === 'rebirth' || view === 'slots') && !(s && isHackerJob(s.job)) && <ViewTabs view={view} setView={setView} tabs={[['rebirth', '환생'], ['slots', slotsOpen ? '분신' : '분신 (환생 1회)']]}/>}{/* v3.51 상점과 장비 보관함은 사이드 메뉴 한 칸, 위쪽 탭으로 오갑니다. */}{(view === 'shop' || view === 'dungeonShop' || view === 'inventory') && <ViewTabs view={view} setView={setView} tabs={[['shop', '상점'], ['dungeonShop', '던전 주화 상점'], ['inventory', '장비 보관함']]}/>}{view === 'slots' && (slotsOpen ? <SlotsPanel {...props!} onSwitchSlot={game.switchSlot} vault={game.vault} vaultError={game.vaultError} loadVault={game.loadVault} vaultAct={game.vaultAct}/> : <section className="panel"><p className="tab-intro">분신(계정의 다른 모험가)은 첫 환생 뒤에 열립니다. 환생 탭에서 다음 모험을 준비하세요.</p></section>)}{(view === 'stats' || view === 'records') && <><ViewTabs view={view} setView={setView} tabs={[['stats', '통계'], ['records', '전투 기록']]}/>{view === 'stats' ? <Stats s={props!.s}/> : <BattleRecordsPanel playerName={props!.s.name}/>}</>}{(view === 'hacker' || view === 'crew') && <><ViewTabs view={view} setView={setView} tabs={[['hacker', '해킹'], ['crew', '조직']]}/>{view === 'hacker' ? <Hacker {...props!} setView={setView}/> : <Crew {...props!} info={game.crew} error={game.crewError} load={game.loadCrew} act={game.crewAct}/>}</>}{view === 'guild' && <Guild {...props!} info={game.guild} error={game.guildError} load={game.loadGuild} act={game.guildAct}/>}{(view === 'help' || view === 'updates') && <><ViewTabs view={view} setView={setView} tabs={[['help', '도움말'], ['updates', '업데이트 내역']]}/>{view === 'help' ? <Guide s={props?.s}/> : <UpdateLog/>}</>}{view === 'battle' && <BattleScreen {...props!} frames={game.frames} setView={setView} onSwitchSlot={game.switchSlot}/>}{view === 'settings' && <SettingsScreen {...props!} onSwitchSlot={game.switchSlot} onLogout={onLogout} setView={setView}/>}{(view === 'character' || view === 'cosmetics') && <><ViewTabs view={view} setView={setView} tabs={[['character', '능력치'], ['cosmetics', '치장']]}/>{view === 'character' ? <Character {...props!}/> : <Cosmetics {...props!}/>}</>}{(view === 'stages' || view === 'dungeons' || view === 'altar') && <><ViewTabs view={view} setView={setView} tabs={[['stages', '사냥터'], ['dungeons', '던전 탐험'], ['altar', '제단']]}/>{view === 'stages' ? <Stages {...props!}/> : view === 'dungeons' ? <Dungeons {...props!} setView={setView}/> : <Altar {...props!} info={game.altar} error={game.altarError} load={game.loadAltar} act={game.altarAct} result={game.altarResult} clearResult={() => game.setAltarResult(null)}/>}</>}{view === 'shop' && <Shop {...props!}/>}{view === 'dungeonShop' && <DungeonShop {...props!}/>}{view === 'expedition' && <Expedition {...props!}/>}{view === 'market' && <MarketPanel {...props!}/>}{view === 'inventory' && <Inventory {...props!}/>}{(view === 'skills' || view === 'classes' || view === 'mastery') && <><ViewTabs view={view} setView={setView} tabs={[['skills', '스킬'], ['classes', '전직'], ['mastery', '숙련 진행']]}/>{view === 'skills' ? <Skills {...props!}/> : view === 'classes' ? <Classes {...props!}/> : <MasteryBoard s={props!.s} setView={setView}/>}</>}{view === 'rebirth' && <Rebirth {...props!}/>}{(view === 'book' || view === 'voyage' || view === 'story') && <><ViewTabs view={view} setView={setView} tabs={[['book', '몬스터 도감'], ['voyage', '목표 · 업적'], ['story', '스토리']]}/>{view === 'book' ? <Collection {...props!}/> : view === 'voyage' ? <VoyageLog {...props!}/> : <StoryPanel s={props!.s}/>}</>}{view === 'ranking' && <Rankings {...props!} season={game.rankSeason} rows={game.rows} rankError={game.rankError} loadRanking={game.loadRanking} abyss={game.abyss} loadAbyss={game.loadAbyss} register={game.register} result={game.duel} setResult={game.setDuel}/>}</main></div>
        <TabBar view={view} setView={setView} hacker={!!s && isHackerJob(s.job)}>{s && view !== 'battle' && <ActivityWidget s={s} setView={setView} variant="strip"/>}</TabBar>
        </>}</div>
    </SidebarProvider>;
}

