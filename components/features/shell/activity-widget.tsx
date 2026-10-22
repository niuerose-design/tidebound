'use client';
/**
 * v3.386 재설계 4단계 셸: 어디서나 보이는 진행 위젯. 지금 사냥터(또는 던전 · 브루트포스) · 상대 · 켜짐 여부 · 실시간 효율 · 경험치를 보여 주고 사냥 화면으로 보냅니다.
 * card: 사이드바 아래(데스크톱 · 메뉴 시트). strip: 모바일 하단 탭 위의 띠(전체가 버튼). 동기화 상태(재생 프레임 아님)만 읽습니다.
 */
import { ChevronRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { State } from '@/game/types';
import { stageById, dungeonById } from '@/game/data/world';
import { isHackerJob } from '@/game/data/hacker';
import { xpNeeded } from '@/game/data/balance';
import { xpWall } from '@/game/systems/meta';
import { useLiveRates } from '@/components/game/live-rates';
import { StatBar, formatShort } from '@/components/ui/game';
import { cn } from '@/lib/utils';

/** 지금 하는 일 한 줄. 해커 → 브루트포스, 던전 안 → 던전 이름 · 무리 번호, 그 밖에는 사냥터 · 상대. */
export function activitySummary(s: State): { title: string; detail: string } {
    if (isHackerJob(s.job)) return { title: s.running ? '브루트포스 실행 중' : '브루트포스 멈춤', detail: '비트 · 권한 경험치를 쌓습니다' };
    if (s.dungeon) return { title: dungeonById(s.dungeon.id)?.name || '던전 탐험', detail: `${s.dungeon.wave}번째 무리${s.enemy ? ` · ${s.enemy.name}` : ''}` };
    const st = stageById(s.stage);
    return { title: st?.name || s.stage, detail: !s.running ? '자동 사냥 멈춤' : s.enemy ? `${s.enemy.name} 상대 중` : '다음 상대를 찾는 중' };
}

export function ActivityWidget({ s, setView, variant }: { s: State; setView: (v: string) => void; variant: 'card' | 'strip' }) {
    const rates = useLiveRates();
    const a = activitySummary(s), hacker = isHackerJob(s.job);
    const rate = rates.ready && !hacker ? `${formatShort(rates.perHour.gold)} G/h · ${formatShort(rates.perHour.kills)}마리/h` : null;
    const mark = <span className={cn('grid shrink-0 place-items-center rounded-full', variant === 'strip' ? 'size-8' : 'size-7', s.running ? 'bg-accent-soft text-accent' : 'bg-surface-3 text-ink-3')} aria-hidden="true">{s.running ? <Play size={13}/> : <Pause size={13}/>}</span>;
    if (variant === 'strip') return <button type="button" className="flex h-12 w-full items-center gap-3 border-t border-line bg-surface-2 px-4 text-left" onClick={() => setView('battle')} aria-label={`지금 진행: ${a.title}, ${a.detail}. 자동 사냥 화면 열기`}>
        {mark}
        <span className="min-w-0 flex-1 leading-tight"><span className="block truncate text-s font-semibold text-ink-1">{a.title}</span><span className="block truncate text-xs text-ink-3">{rate || a.detail}</span></span>
        <ChevronRight size={16} className="shrink-0 text-ink-3"/>
    </button>;
    return <section className="grid gap-2 rounded-m border border-line bg-surface-2 p-3" aria-label="지금 진행">
        <div className="flex items-center gap-2">{mark}<div className="min-w-0 flex-1 leading-tight"><div className="truncate text-s font-semibold text-ink-1">{a.title}</div><div className="truncate text-xs text-ink-3">{a.detail}</div></div></div>
        {!hacker && <StatBar value={s.exp} max={xpNeeded(s.level, s.rebirths, xpWall(s))} tone="exp" size="s" label={`Lv.${s.level}`} className="text-xs [&_.text-s]:text-xs"/>}
        {rate && <div className="font-num text-xs text-ink-3">{rate}</div>}
        <Button type="button" variant="ghost" size="sm" className="h-9 gap-1 rounded-m bg-accent-soft text-s font-semibold text-accent hover:bg-accent-soft hover:text-accent hover:brightness-110 pointer-coarse:min-h-11" onClick={() => setView('battle')}>사냥 보기<ChevronRight size={14}/></Button>
    </section>;
}
