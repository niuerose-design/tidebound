/**
 * v3.386 재설계 4단계 셸: 메뉴 목록과 화면 제목(사이드바 · 상단 바 · 모바일 탭이 함께 씁니다).
 * 화면 id 는 주소 해시(components/game/view-route.ts)와 같습니다. 메뉴 하나가 여러 화면(views)을 가질 수 있습니다.
 */
import type { State } from '@/game/types';
import { noviceMenuLocked, noviceMarketLocked } from '@/game/systems/guidance';
import { isHackerJob } from '@/game/data/hacker';
import { BarChart3, BookOpen, HelpCircle, Map, RefreshCw, ShoppingBag, Target, Trophy, Users, Zap, Swords, Flame, Terminal, ChartCandlestick, Flag, Settings } from 'lucide-react';

export type NavItem = {
    id: string;
    name: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    /** 아직 잠긴 화면이면 조건 글귀(예: 'Lv.10'). 미리 볼 수는 있습니다. */
    unlock?: (s: State) => string | null;
    /** 이 메뉴가 여는 화면들(첫 번째가 id 와 같을 필요는 없음). */
    views?: string[];
    /** v3.18 조건을 채우기 전에는 메뉴에서 아예 숨깁니다(해킹). */
    hidden?: (s: State) => boolean;
};
export type NavGroup = { label: string; items: NavItem[] };

/**
 * v3.25 해커 계열(해커·화이트 해커, v3.28 블랙 해커)은 싸우지 않으니 쓸 일이 없는 메뉴를 숨기고, 해킹 메뉴는 해커 계열에게만 보입니다.
 * v3.27 제단은 백도어 대상이라 다시 보이고, 길드·환생은 숨깁니다(레벨이 멈춰 환생할 일이 없음). 분신(슬롯 바꾸기)은 따로 보입니다.
 * v3.242 입문 메뉴: 첫 생에는 아직 쓸 수 없는 메뉴를 숨기고 Lv.10 · 첫 던전 정복에 엽니다(game/systems/guidance.ts).
 */
const hackerOnly = (s: State) => isHackerJob(s.job);
const lv10 = (s: State) => s.rebirths || s.level >= 10 ? null : 'Lv.10';

export const NAV: NavGroup[] = [
    { label: '모험', items: [
        { id: 'battle', name: '자동 사냥', Icon: Swords },
        { id: 'stages', name: '사냥터·던전', Icon: Map, views: ['stages', 'dungeons'], hidden: hackerOnly },
        { id: 'altar', name: '제단', Icon: Flame, views: ['altar'], hidden: noviceMenuLocked },
        { id: 'expedition', name: '원정대', Icon: Flag, views: ['expedition'], hidden: noviceMenuLocked },
        { id: 'hacker', name: '해킹', Icon: Terminal, views: ['hacker', 'crew'], hidden: (s: State) => !isHackerJob(s.job) && !s.hacker?.crew },
    ] },
    { label: '성장', items: [
        { id: 'character', name: '능력치 · 치장', Icon: Target, views: ['character', 'cosmetics'] },
        { id: 'shop', name: '상점 · 장비 보관함', Icon: ShoppingBag, views: ['shop', 'dungeonShop', 'inventory'], hidden: hackerOnly },
        { id: 'market', name: '증권거래소', Icon: ChartCandlestick, views: ['market'], hidden: noviceMarketLocked },
        { id: 'skills', name: '스킬 · 전직', Icon: Zap, views: ['skills', 'classes', 'mastery'] },
        { id: 'rebirth', name: '환생 · 분신', Icon: RefreshCw, views: ['rebirth', 'slots'], hidden: (s: State) => hackerOnly(s) || noviceMenuLocked(s) },
        { id: 'slots', name: '분신', Icon: RefreshCw, views: ['slots'], hidden: (s: State) => !isHackerJob(s.job) },
    ] },
    { label: '기록과 명예', items: [
        { id: 'book', name: '도감 · 업적 · 스토리', Icon: BookOpen, views: ['book', 'voyage', 'story'] },
        { id: 'stats', name: '통계 · 기록', Icon: BarChart3, views: ['stats', 'records'], hidden: noviceMenuLocked },
        { id: 'guild', name: '길드', Icon: Users, unlock: lv10, hidden: (s: State) => hackerOnly(s) || noviceMenuLocked(s) },
        { id: 'ranking', name: '랭킹 · 결투', Icon: Trophy, unlock: lv10, hidden: noviceMenuLocked },
        { id: 'help', name: '도움말 · 업데이트', Icon: HelpCircle, views: ['help', 'updates'] },
        { id: 'settings', name: '설정', Icon: Settings },
    ] },
];

/** 주소 해시로 열 수 있는 화면 전부. */
export const ALL_VIEWS: ReadonlySet<string> = new Set(NAV.flatMap(g => g.items.flatMap(i => [i.id, ...(i.views || [])])));

/** 합친 화면의 탭별 제목(상단 바). 없으면 메뉴 이름을 씁니다. */
export const VIEW_TITLES: Record<string, string> = { hacker: '해킹', slots: '분신', stats: '통계', records: '전투 기록', shop: '상점', inventory: '장비 보관함', character: '능력치', cosmetics: '치장', stages: '사냥터', dungeons: '던전 탐험', altar: '제단', skills: '스킬', classes: '전직', mastery: '숙련 진행', book: '몬스터 도감', voyage: '목표 · 업적', help: '도움말', updates: '업데이트 내역' };

export const navOwners = (view: string) => NAV.flatMap(g => g.items).filter(i => i.id === view || i.views?.includes(view));
/** 지금 직업 · 진행에서 숨긴 화면이면 true(열려 있어도 자동 사냥으로 돌려보냄). 한 화면이 여러 메뉴에 걸려 있으면 하나라도 보이면 열립니다. */
export const navHidden = (s: State | null | undefined, view: string) => { if (!s) return false; const owners = navOwners(view); return owners.length > 0 && owners.every(i => i.hidden?.(s)); };
export const viewTitle = (view: string) => VIEW_TITLES[view] || navOwners(view)[0]?.name || '';
