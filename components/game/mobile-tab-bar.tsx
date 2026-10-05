'use client';
import { Menu, Swords, Target, Terminal, Zap } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

const TABS = [{ id: 'battle', name: '사냥', Icon: Swords }, { id: 'character', name: '능력치', Icon: Target }, { id: 'skills', name: '스킬', Icon: Zap }, { id: 'classes', name: '전직', Icon: Swords }] as const;
/** v3.25 해커 계열: 사냥 → 브루트포스, 능력치 대신 해킹. */
const HACKER_TABS = [{ id: 'battle', name: '브루트포스', Icon: Swords }, { id: 'hacker', name: '해킹', Icon: Terminal }, { id: 'skills', name: '스킬', Icon: Zap }, { id: 'classes', name: '전직', Icon: Swords }] as const;

/** 모바일 하단 고정 탭: 자주 가는 네 화면과 전체 메뉴. 767px 이하에서만 보입니다. */
export function MobileTabBar({ view, setView, hacker }: { view: string; setView: (v: string) => void; hacker?: boolean }) {
    const { setOpenMobile } = useSidebar();
    return <nav className="mobile-tab-bar" aria-label="빠른 이동">
        {(hacker ? HACKER_TABS : TABS).map(({ id, name, Icon }) => <button type="button" key={id} className={view === id ? 'active' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}><Icon size={19}/><span>{name}</span></button>)}
        <button type="button" onClick={() => setOpenMobile(true)}><Menu size={19}/><span>메뉴</span></button>
    </nav>;
}
