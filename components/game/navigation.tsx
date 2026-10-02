'use client';
import { UPDATE_LOG } from '@/game/data/update-log';
import { Anchor, ChevronRight, Lock, LogOut, Waves } from 'lucide-react';
import type { State } from '@/game/types';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { NAV } from './game-shell';
export function Navigation({ view, setView, s, onLogout }: {
    onLogout?: () => void;
    view: string;
    setView: (s: string) => void;
    s?: State | null;
}) {
    const { setOpenMobile } = useSidebar();
    return <Sidebar className="game-sidebar">
    <SidebarHeader>
    <div className="brand">
    <Anchor size={30}/>
    <div>
    <strong>TIDEBOUND</strong>
    <small>심연의 낚시꾼</small>
    </div>
    </div>
    </SidebarHeader>
    <SidebarContent>{NAV.map(group => <SidebarGroup key={group.label}>
        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
        <SidebarMenu>{group.items.map(({ id, name, Icon, unlock }) => { const lock = s && unlock ? unlock(s) : null; return <SidebarMenuItem key={id}>
            <SidebarMenuButton isActive={view === id} className={lock ? 'nav-locked' : ''} title={lock ? `${lock}부터 쓸 수 있는 화면입니다. 미리 볼 수는 있습니다.` : undefined} onClick={() => { setView(id); setOpenMobile(false); }}>
            <Icon />
            <span>{name}</span>{lock ? <small className="nav-lock"><Lock size={11}/>{lock}</small> : view === id && <ChevronRight className="nav-arrow"/>}</SidebarMenuButton>
            </SidebarMenuItem>; })}</SidebarMenu>
        </SidebarGroup>)}</SidebarContent>
    <SidebarFooter>
    <div className="sidebar-quote">
    <Waves size={22}/>
    <p>수면 아래,<br />다음 이야기가 기다립니다.</p>
    <small>THE ENDLESS VOYAGE · v{UPDATE_LOG[0].version}</small>
    {onLogout && <button type="button" className="text-button sidebar-logout" onClick={onLogout}><LogOut size={13}/> 로그아웃</button>}
    </div>
    </SidebarFooter>
    </Sidebar>;
}
