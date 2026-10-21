'use client';
/** v3.386 재설계 4단계 셸: 사이드바(데스크톱 고정 · 모바일 시트). shadcn Sidebar 위에 토큰 유틸리티만 씁니다. */
import { ChevronRight, Leaf, Lock, LogOut, Swords } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { GAME_BUILD } from '@/game/data/update-log';
import type { State } from '@/game/types';
import { cn } from '@/lib/utils';
import { NAV } from './nav';
import { ActivityWidget } from './activity-widget';

export function SideNav({ view, setView, s, onLogout }: { view: string; setView: (v: string) => void; s?: State | null; onLogout?: () => void }) {
    const { setOpenMobile } = useSidebar();
    const go = (v: string) => { setView(v); setOpenMobile(false); };
    return <Sidebar className="border-line" aria-label="주 메뉴">
        {/* 사이드바는 --sidebar-zoom(shell.css)을 따릅니다. 세로가 짧은 화면에서는 1. */}
        <div className="flex h-full min-h-0 flex-col [zoom:var(--sidebar-zoom,1)]">
        <SidebarHeader className="px-4 pt-5 pb-3">
            <button type="button" className="flex items-center gap-3 rounded-m text-left" onClick={() => go('battle')} aria-label="자동 사냥 화면으로">
                <Leaf size={28} className="shrink-0 text-accent"/>
                <span className="grid leading-tight"><strong className="text-m font-bold text-ink-1">판게아 RPG</strong><small className="text-xs tracking-[.12em] text-ink-3">PANGAEA RPG</small></span>
            </button>
        </SidebarHeader>
        {/* v3.106 기록을 불러오기 전(로딩 · 로그인 화면)에는 메뉴를 숨깁니다. 눌러도 열 화면이 없습니다. */}
        <SidebarContent className="px-2">{!s ? <p className="px-3 text-xs leading-relaxed text-ink-3">모험가의 기록을 불러오면 메뉴가 열립니다.</p> : NAV.map(group => <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="text-xs tracking-wide text-ink-3">{group.label}</SidebarGroupLabel>
            <SidebarMenu>{group.items.filter(item => !item.hidden?.(s)).map(({ id, name, Icon, unlock, views }) => { const lock = unlock ? unlock(s) : null, active = views ? views.includes(view) : view === id; return <SidebarMenuItem key={id}>
                <SidebarMenuButton isActive={active} aria-current={active ? 'page' : undefined} className={cn('h-10 gap-3 rounded-m px-3 text-s text-ink-2 hover:bg-surface-3 hover:text-ink-1 data-[active=true]:bg-accent-soft data-[active=true]:font-semibold data-[active=true]:text-accent', lock && 'text-ink-3')} title={lock ? `${lock}부터 쓸 수 있는 화면입니다. 미리 볼 수는 있습니다.` : undefined} onClick={() => go(id)}>
                    <Icon size={17}/><span className="truncate">{name}</span>{lock ? <small className="ml-auto inline-flex items-center gap-0.5 text-xs text-ink-3"><Lock size={11}/>{lock}</small> : active && <ChevronRight size={14} className="ml-auto opacity-70"/>}
                </SidebarMenuButton>
            </SidebarMenuItem>; })}</SidebarMenu>
        </SidebarGroup>)}</SidebarContent>
        <SidebarFooter className="gap-3 border-t border-line px-4 py-4">
            {/* 어디서나 보이는 진행 위젯: 사냥 화면이 아닐 때만(사냥 화면에서는 장면이 곧 진행). */}
            {s && view !== 'battle' && <ActivityWidget s={s} setView={go} variant="card"/>}
            <div className="grid gap-1 text-xs text-ink-3">
                <small className="tracking-[.1em]">OPEN BETA · v{GAME_BUILD}</small>
                {/* v3.367 전기(턴제 전술) 모드는 독립 화면(/tactics)입니다. 본편 세이브와 섞이지 않습니다. */}
                {s && <a className="inline-flex min-h-8 items-center gap-1.5 text-ink-2 underline-offset-2 hover:text-ink-1 hover:underline pointer-coarse:min-h-11" href="/tactics"><Swords size={13}/> 판게아 전기 (턴제 전술) 열기</a>}
                {onLogout && <button type="button" className="inline-flex min-h-8 items-center justify-start gap-1.5 text-xs text-ink-2 hover:text-ink-1 pointer-coarse:min-h-11" onClick={onLogout}><LogOut size={13}/> 로그아웃</button>}
            </div>
        </SidebarFooter>
        </div>
    </Sidebar>;
}
