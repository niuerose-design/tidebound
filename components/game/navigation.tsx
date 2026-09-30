'use client';
import { UPDATE_LOG } from '@/game/data/update-log';
import { Anchor, ChevronRight, Waves } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { NAV } from './game-shell';
export function Navigation({ view, setView }: {
    view: string;
    setView: (s: string) => void;
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
        <SidebarMenu>{group.items.map(({ id, name, Icon }) => <SidebarMenuItem key={id}>
            <SidebarMenuButton isActive={view === id} onClick={() => { setView(id); setOpenMobile(false); }}>
            <Icon />
            <span>{name}</span>{view === id && <ChevronRight className="nav-arrow"/>}</SidebarMenuButton>
            </SidebarMenuItem>)}</SidebarMenu>
        </SidebarGroup>)}</SidebarContent>
    <SidebarFooter>
    <div className="sidebar-quote">
    <Waves size={22}/>
    <p>수면 아래,<br />다음 이야기가 기다립니다.</p>
    <small>THE ENDLESS VOYAGE · v{UPDATE_LOG[0].version}</small>
    </div>
    </SidebarFooter>
    </Sidebar>;
}
