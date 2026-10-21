'use client';
/** v3.386 재설계 4단계 셸: 상단 바. 화면 제목 · 보유 재화(굴러가는 숫자) · 저장 상태 · 설정. 모든 화면에 붙어 있습니다(sticky). */
import { Check, Coins, Gem, RefreshCw, Settings, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NumberTicker, formatExact } from '@/components/ui/game';
import type { State } from '@/game/types';
import { cn } from '@/lib/utils';
import { viewTitle } from './nav';

export function TopBar({ view, s, saved, setView }: { view: string; s?: State | null; saved: boolean; setView: (v: string) => void }) {
    return <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-line bg-surface-1 px-2 sm:gap-2 sm:px-4 md:h-16 md:px-6" aria-label="상단 바">
        <SidebarTrigger className="size-11 shrink-0 text-ink-2 hover:bg-surface-3 hover:text-ink-1 md:hidden" aria-label="메뉴 열기" title="메뉴"/>
        <div className="min-w-0 flex-1 px-1">
            <span className="hidden text-xs text-ink-3 sm:block">모험 기록</span>
            <span className="block truncate text-s font-semibold text-ink-1 md:text-m">{viewTitle(view)}</span>
        </div>
        {s && <ResourceBar s={s}/>}
        <span className={cn('hidden items-center gap-1 px-2 text-xs sm:inline-flex', saved ? 'text-ink-3' : 'text-warn')} role="status">{saved ? <Check size={13}/> : <RefreshCw size={13} className="animate-spin motion-reduce:animate-none"/>}{saved ? '저장됨' : '연결 중'}</span>
        <button type="button" className={cn('grid size-11 shrink-0 place-items-center rounded-m text-ink-2 hover:bg-surface-3 hover:text-ink-1', view === 'settings' && 'bg-accent-soft text-accent')} aria-label="설정" title="설정" aria-current={view === 'settings' ? 'page' : undefined} onClick={() => setView('settings')}><Settings size={20}/></button>
    </header>;
}

/** 보유 재화 칩 세 개. 축약 표시, 정확한 값은 툴팁 · 읽기 이름. 환생해도 남는 세계석 · 정수는 색으로 구분하되 아이콘도 함께 둡니다. */
function ResourceBar({ s }: { s: State }) {
    return <div className="flex items-center gap-1" role="group" aria-label="보유 재화">
        <Chip icon={<Coins size={13}/>} value={s.gold} label="골드" tone="text-gold-ink" unit=" G"/>
        <Chip icon={<Sparkles size={13}/>} value={s.pearls} label="세계석" tone="text-info" unit="개"/>
        <Chip icon={<Gem size={13}/>} value={s.essence || 0} label="정수" tone="text-rarity-epic" unit="개"/>
    </div>;
}
function Chip({ icon, value, label, tone, unit }: { icon: ReactNode; value: number; label: string; tone: string; unit: string }) {
    const exact = `${label} ${formatExact(value)}${unit}`;
    return <span className={cn('inline-flex h-8 items-center gap-1 rounded-m bg-surface-2 px-1.5 text-xs sm:px-2', tone)} title={exact} aria-label={exact}><span aria-hidden="true">{icon}</span><NumberTicker value={value} className="text-ink-1"/></span>;
}
