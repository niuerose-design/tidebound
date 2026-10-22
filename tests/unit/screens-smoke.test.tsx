// v3.414 화면 스모크 테스트: 게임 셸(components/game/game-shell.tsx)이 그리는 모든 화면을 서버 렌더(renderToStaticMarkup)로 한 번씩 그려
// 예외 없이 그려지고 그 화면의 제목 글이 들어 있는지만 봅니다. 브라우저 전용 동작(useEffect · 이벤트)은 돌지 않습니다.
// 상태는 새 모험가와 한 시간 자동 사냥한 모험가 둘입니다(시드 난수라 결과가 같음).
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { newState } from '@/game/systems/state';
import { advance, act } from '@/game/systems/engine';
import type { State } from '@/game/types';
import { SidebarProvider } from '@/components/ui/sidebar';
import { LoginScreen } from '@/components/features/auth';
import { SideNav, TopBar, TabBar, ActivityWidget, ALL_VIEWS } from '@/components/features/shell';
import { SettingsScreen } from '@/components/features/settings/settings-screen';
import { HelpScreen } from '@/components/features/help';
import { BattleScreen } from '@/components/features/battle';
import { StagesScreen, DungeonsScreen } from '@/components/features/world';
import { AltarScreen } from '@/components/features/altar';
import { ExpeditionScreen } from '@/components/features/expedition';
import { CharacterScreen, CosmeticsScreen } from '@/components/features/character';
import { ShopScreen, DungeonShopScreen } from '@/components/features/shop';
import { InventoryScreen } from '@/components/features/inventory/inventory-screen';
import { MarketScreen } from '@/components/features/market';
import { SkillsScreen } from '@/components/features/skills/skills-screen';
import { ClassesScreen, MasteryScreen } from '@/components/features/jobs';
import { RebirthScreen, SlotsScreen } from '@/components/features/legacy';
import { CodexScreen } from '@/components/features/codex/codex-screen';
import { GoalsScreen, StoryScreen } from '@/components/features/journal';
import { StatsScreen, RecordsScreen, UpdatesScreen } from '@/components/features/records';
import { GuildScreen } from '@/components/features/guild';
import { ArenaScreen } from '@/components/features/arena';
import { HackerScreen, CrewScreen } from '@/components/features/hacker';

const now = Date.UTC(2026, 9, 22, 3);
const mulberry32 = (seed: number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const noop = () => {}, asyncNoop = async () => {}, asyncTrue = async () => true;
const send = noop, setView = noop;
const frames = { get: () => null, set: noop, subscribe: () => noop };
const render = (el: React.ReactElement) => renderToStaticMarkup(el);
/** 셸 조각은 사이드바 컨텍스트가 있어야 합니다(게임 셸이 SidebarProvider 로 감쌈). */
const shell = (el: React.ReactElement) => render(<SidebarProvider>{el}</SidebarProvider>);
const played = (): State => { const s = newState(now); const rng = mulberry32(7); act(s, { type: 'start' } as never, now, rng); advance(s, now + 3600_000, rng); return s; };

/** 게임 셸의 화면 → 컴포넌트 대응(game-shell.tsx 와 같은 차례). 제목 글은 그 화면에 늘 보이는 말입니다. */
const SCREENS: Record<string, (s: State) => { el: React.ReactElement; title: string }> = {
    battle: s => ({ el: <BattleScreen s={s} frames={frames} busy={false} send={send} setView={setView}/>, title: '기록판' }),
    stages: s => ({ el: <StagesScreen s={s} send={send} busy={false}/>, title: '사냥터' }),
    dungeons: s => ({ el: <DungeonsScreen s={s} send={send} busy={false} setView={setView}/>, title: '던전' }),
    altar: s => ({ el: <AltarScreen s={s} busy={false} info={null} error="" load={asyncNoop} act={asyncTrue} result={null} clearResult={noop}/>, title: '제단' }),
    expedition: s => ({ el: <ExpeditionScreen s={s} send={send} busy={false}/>, title: '원정대' }),
    character: s => ({ el: <CharacterScreen s={s} send={send} busy={false}/>, title: '능력치' }),
    cosmetics: s => ({ el: <CosmeticsScreen s={s} send={send} busy={false}/>, title: '칭호와 계급' }),
    shop: s => ({ el: <ShopScreen s={s} send={send} busy={false}/>, title: '상점' }),
    dungeonShop: s => ({ el: <DungeonShopScreen s={s} send={send} busy={false}/>, title: '던전 주화 상점' }),
    inventory: s => ({ el: <InventoryScreen s={s} send={send} busy={false}/>, title: '보관함' }),
    market: s => ({ el: <MarketScreen s={s} send={send} busy={false}/>, title: '증권거래소' }),
    skills: s => ({ el: <SkillsScreen s={s} send={send} busy={false}/>, title: '스킬' }),
    classes: s => ({ el: <ClassesScreen s={s} send={send} busy={false}/>, title: '직업' }),
    mastery: s => ({ el: <MasteryScreen s={s} setView={setView}/>, title: '숙련' }),
    rebirth: s => ({ el: <RebirthScreen s={s} send={send} busy={false}/>, title: '환생' }),
    slots: s => ({ el: <SlotsScreen s={s} busy={false} onSwitchSlot={asyncNoop} vault={null} vaultError="" loadVault={asyncNoop} vaultAct={asyncTrue}/>, title: '분신' }),
    book: s => ({ el: <CodexScreen s={s} send={send} busy={false}/>, title: '도감' }),
    voyage: s => ({ el: <GoalsScreen s={s} send={send} busy={false}/>, title: '목표' }),
    story: s => ({ el: <StoryScreen s={s}/>, title: '스토리' }),
    stats: s => ({ el: <StatsScreen s={s}/>, title: '통계' }),
    records: s => ({ el: <RecordsScreen playerName={s.name}/>, title: '전투 기록' }),
    guild: s => ({ el: <GuildScreen s={s} busy={false} info={null} error="" load={asyncNoop} act={asyncTrue}/>, title: '길드' }),
    ranking: s => ({ el: <ArenaScreen s={s} send={send} busy={false} season="" rows={[]} rankError="" loadRanking={asyncNoop} abyss={null} loadAbyss={asyncNoop} register={asyncNoop} result={null} setResult={noop}/>, title: '순위' }),
    hacker: s => ({ el: <HackerScreen s={s} send={send} busy={false} setView={setView}/>, title: '해킹' }),
    crew: s => ({ el: <CrewScreen s={s} send={send} busy={false} info={null} error="" load={asyncNoop} act={asyncTrue}/>, title: '조직' }),
    help: s => ({ el: <HelpScreen s={s}/>, title: '모험 도움말' }),
    updates: () => ({ el: <UpdatesScreen/>, title: '업데이트' }),
    settings: s => ({ el: <SettingsScreen s={s} busy={false} send={send} setView={setView}/>, title: '설정' }),
};

describe('screens render (v3.414 smoke)', () => {
    it('covers every view the shell can show', () => { for (const v of ALL_VIEWS) expect(SCREENS[v], `view ${v}`).toBeDefined(); });
    it('login', () => { expect(render(<LoginScreen onSubmit={asyncNoop}/>)).toContain('로그인'); });
    for (const [label, make] of [['new adventurer', () => newState(now)], ['after an hour of hunting', played]] as const) {
        describe(label, () => {
            const s = make();
            it('shell: side nav · top bar · tab bar · activity', () => {
                expect(shell(<SideNav view="battle" setView={setView} s={s}/>)).toContain('자동 사냥');
                expect(shell(<TopBar view="settings" s={s} saved setView={setView}/>)).toContain('설정');
                expect(shell(<TabBar view="battle" setView={setView}/>)).toContain('사냥');
                expect(shell(<ActivityWidget s={s} setView={setView} variant="card"/>)).toContain('사냥 보기');
            });
            for (const [view, make] of Object.entries(SCREENS)) it(view, () => { const { el, title } = make(s); expect(render(el)).toContain(title); });
        });
    }
});
