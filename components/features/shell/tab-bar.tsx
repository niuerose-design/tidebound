'use client';
/** v3.386 재설계 4단계 셸: 모바일 하단 고정 탭 5개(자주 가는 네 화면 + 전체 메뉴). 767px 이하에서만 보입니다. 위에 진행 위젯 띠(children)를 얹을 수 있습니다. */
import { Backpack, Menu, Swords, Target, Terminal, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

type Tab = { id: string; name: string; Icon: React.ComponentType<{ size?: number }> };
const TABS: Tab[] = [{ id: 'battle', name: '사냥', Icon: Swords }, { id: 'character', name: '능력치', Icon: Target }, { id: 'skills', name: '스킬', Icon: Zap }, { id: 'inventory', name: '보관함', Icon: Backpack }];
/** v3.25 해커 계열: 사냥 → 브루트포스, 능력치 대신 해킹, 보관함(숨김) 대신 전직. */
const HACKER_TABS: Tab[] = [{ id: 'battle', name: '브루트포스', Icon: Terminal }, { id: 'hacker', name: '해킹', Icon: Terminal }, { id: 'skills', name: '스킬', Icon: Zap }, { id: 'classes', name: '전직', Icon: Swords }];

export function TabBar({ view, setView, hacker, children }: { view: string; setView: (v: string) => void; hacker?: boolean; children?: ReactNode }) {
    const { setOpenMobile } = useSidebar();
    // 반투명 블러(backdrop-filter)는 iOS Safari에서 fixed 요소가 스크롤 중 떨리는 원인이라 불투명 배경으로 둡니다.
    return <div className="fixed inset-x-0 bottom-0 z-40 translate-z-0 md:hidden">
        {children}
        <nav className="grid grid-cols-5 border-t border-line bg-surface-1 pb-[env(safe-area-inset-bottom)]" aria-label="빠른 이동">
            {(hacker ? HACKER_TABS : TABS).map(({ id, name, Icon }) => <TabButton key={id} active={view === id} onClick={() => setView(id)}><Icon size={20}/><span>{name}</span></TabButton>)}
            <TabButton onClick={() => setOpenMobile(true)}><Menu size={20}/><span>메뉴</span></TabButton>
        </nav>
    </div>;
}
function TabButton({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) {
    return <button type="button" className={cn('flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-xs', active ? 'font-semibold text-accent' : 'text-ink-3')} aria-current={active ? 'page' : undefined} onClick={onClick}>{children}</button>;
}
