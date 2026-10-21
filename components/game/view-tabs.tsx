'use client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
/** v3.408 새 토대. 왼쪽 메뉴에서 합친 화면들의 윗줄 탭(사냥터·던전, 도움말·업데이트). 탭을 고르면 view가 바뀝니다. */
export function ViewTabs({ view, setView, tabs }: { view: string; setView: (v: string) => void; tabs: [string, string][] }) {
    return <Tabs value={view} onValueChange={setView}><TabsList className="mb-4 flex-wrap group-data-[orientation=horizontal]/tabs:h-auto [&>button]:h-auto [&>button]:min-h-9 [&>button]:pointer-coarse:min-h-11">{tabs.map(([id, name]) => <TabsTrigger key={id} value={id}>{name}</TabsTrigger>)}</TabsList></Tabs>;
}
