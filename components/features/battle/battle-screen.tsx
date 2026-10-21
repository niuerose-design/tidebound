'use client';
/**
 * v3.389 재설계 4단계 다섯째 화면: 자동 사냥(1차). 틀 · 모험가 카드 · 알림 · 기록판 · 선택판을 새 토대로 옮겼습니다.
 * 장면(배경 · 몬스터 · 연출 · 전투 기록) · 조작 줄(핫바 · 시작/정지 · 호루라기)은 옛 BattleArena 를 그대로 품고 2차에서 옮깁니다.
 * 재생 프레임은 이 화면만 구독하고(useReplayView), 능력치는 동기화 상태로 한 번만 계산합니다.
 */
import { useMemo, type ReactNode } from 'react';
import { BookOpen, Fish, ScrollText } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { stageById, MONSTERS } from '@/game/data/world';
import { tideLimit } from '@/game/systems/meta';
import { tutorialActive } from '@/game/systems/guidance';
import { GAME_BUILD } from '@/game/data/update-log';
import { cachedStats, useReplayView, type FrameStore } from '@/components/game/use-game';
import { BattleArena, TargetStrip } from '@/components/game/battle-view';
import { TutorialCard } from '@/components/game/guidance-panels';
import { LiveRatesCard } from '@/components/game/live-rates-card';
import { TideSelector } from '@/components/game/tide-selector';
import { SlotChips } from '@/components/game/slot-chips';
import { useNotices } from '@/components/game/notice-settings';
import { NumberTicker, formatExact } from '@/components/ui/game';
import { Button } from '@/components/ui/button';
import { PlayerCard } from './player-card';
import { Rail } from './rail';
import { Notices } from './notices';

type Send = (a: Action) => void;
export function BattleScreen({ s: base, frames, busy, send, setView, onSwitchSlot }: { s: State; frames: FrameStore; busy: boolean; send: Send; setView: (v: string) => void; onSwitchSlot?: (slot: number) => Promise<void> }) {
    const s = useReplayView(base, frames);
    const playerStats = useMemo(() => cachedStats(base), [base]);
    const show = useNotices();
    const st = stageById(s.stage)!;
    // v3.228 집중 사냥 줄은 동기화 상태로만 다시 만들어, 재생 프레임마다 난이도 카드(memo)가 다시 그려지지 않게 합니다.
    const targetStrip = useMemo(() => <TargetStrip base={base} busy={busy} send={send} inline/>, [base, busy, send]);
    return <div className="grid gap-3 text-ink-1" style={{ '--stage-tone': st.tone } as React.CSSProperties}>
        <Summary base={base} setView={setView}/>
        <Notices base={base} send={send} setView={setView}/>
        {show('slots') && <SlotChips s={base} busy={busy} onSwitch={onSwitchSlot}/>}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[256px_minmax(0,1fr)_300px]">
            <aside className="hidden min-w-0 xl:order-1 xl:block"><PlayerCard s={s} a={playerStats} setView={setView}/></aside>
            <section className="order-1 flex min-w-0 flex-col gap-3 xl:order-2" aria-label="사냥 장면">
                <PlayerCard s={s} a={playerStats} setView={setView} compact/>
                {tutorialActive(base) && <div className="battle-top-tutorial"><TutorialCard s={base} send={send} busy={busy} setView={setView}/></div>}
                {show('liveRates') && <LiveRatesCard s={base} compact/>}
                {tideLimit(base) ? <TideSelector s={base} send={send} busy={busy} extra={targetStrip}/> : <TargetStrip base={base} busy={busy} send={send}/>}
                {/* 장면 · 조작 줄은 2차 PR 전까지 옛 CSS(.battle-hud .battle-console .battle-scene 높이)를 그대로 쓰도록 같은 클래스로 감쌉니다. */}
                <div className="battle-hud block!"><div className="battle-console"><BattleArena s={s} playerStats={playerStats} busy={busy} send={send} setView={setView}/></div></div>
            </section>
            <aside className="order-2 min-w-0 lg:order-3"><Rail s={s} base={base} busy={busy} send={send} setView={setView}/></aside>
        </div>
    </div>;
}

/** 눈썹 글 · 누적 처치 · 도감 · 업데이트 내역. 동기화 상태만 봅니다. */
function Summary({ base: s, setView }: { base: State; setView: (v: string) => void }) {
    const found = Object.keys(s.book).length;
    return <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-xs tracking-[.16em] text-accent">THE ENDLESS ADVENTURE</span>
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
            <Chip icon={<Fish size={13}/>} title={`누적 처치 ${formatExact(s.kills)}마리`}><NumberTicker value={s.kills}/></Chip>
            <Chip icon={<BookOpen size={13}/>} title={`발견한 몬스터 ${found} / ${MONSTERS.length}종`}><span className="font-num">{found}</span><span className="text-ink-3">/{MONSTERS.length}</span></Chip>
            <Button type="button" variant="outline" size="sm" onClick={() => setView('updates')} title="업데이트 내역 바로 보기"><ScrollText size={14}/>업데이트 <span className="font-num text-xs text-gold-ink">v{GAME_BUILD}</span></Button>
        </span>
    </div>;
}
function Chip({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
    return <span className="inline-flex h-8 items-center gap-1 rounded-m bg-surface-2 px-2 text-xs text-ink-1" title={title} aria-label={title}><span className="text-ink-3" aria-hidden="true">{icon}</span>{children}</span>;
}
