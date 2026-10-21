'use client';
/**
 * v3.382 도감 화면(재설계 4단계 두 번째 화면). 옛 components/game/collection-panel.tsx 를 대신합니다. 주소 #book.
 * 개체도감 · 물건도감 · 연구 보너스 세 탭. 닫힌 구역은 마운트하지 않아(FoldSection) 161종 카드를 한 번에 그리지 않습니다.
 */
import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SectionHeader, StatBar } from '@/components/ui/game';
import { MONSTERS } from '@/game/data/world';
import { PROGRESSION } from '@/game/data/progression';
import { RARITIES, SLOTS } from '@/game/data/balance';
import { stats } from '@/game/systems/stats';
import { completedStages } from '@/game/systems/progression';
import { catalogNow } from '@/game/data/catalog';
import { BASE_STAGES } from '@/game/data/world';
import { pendingBookCount } from '@/components/game/book-research';
import { MonsterBook } from './monster-book';
import { ItemBook } from './item-book';
import { ResearchBonus } from './research-bonus';

export function CodexScreen({ s, send, busy }: { s: State; send: (a: Action) => void; busy: boolean }) {
    const [tab, setTab] = useState('monsters');
    const player = stats(s), secret = catalogNow().secret;
    const complete = MONSTERS.filter(f => (s.book[f.id] || 0) >= PROGRESSION.monsterComplete).length, places = completedStages(s).length, registered = Object.keys(s.itemBook).length, pending = pendingBookCount(s);
    return <div className="grid gap-5 text-ink-1">
        <SectionHeader as="h1" eyebrow="Archive & Research" title="도감" description="개체도감으로 편성의 폭을 넓히고, 물건도감으로 다음 장비를 만날 확률을 높이세요."
            actions={pending > 0 ? <Button type="button" disabled={busy} onClick={() => send({ type: 'claimAllBooks' })}><BookOpen/>연구 보상 {pending}단계 모두 받기</Button> : null}/>
        <div className="grid gap-3 sm:grid-cols-3">
            <Tile label="개체 완성" value={complete} max={MONSTERS.length}/>
            <Tile label="장소 연구" value={places} max={BASE_STAGES.length}/>
            <Tile label="물건 등록" value={registered} max={Object.keys(SLOTS).length * RARITIES.length}/>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-auto flex-wrap bg-surface-2">
                <TabsTrigger value="monsters" className="min-h-9">개체도감</TabsTrigger>
                <TabsTrigger value="items" className="min-h-9">물건도감</TabsTrigger>
                <TabsTrigger value="bonus" className="min-h-9">연구 보너스</TabsTrigger>
            </TabsList>
            <TabsContent value="monsters"><MonsterBook s={s} send={send} busy={busy} player={player} secret={secret}/></TabsContent>
            <TabsContent value="items"><ItemBook s={s} send={send} busy={busy} secret={secret}/></TabsContent>
            <TabsContent value="bonus"><ResearchBonus s={s}/></TabsContent>
        </Tabs>
    </div>;
}
function Tile({ label, value, max }: { label: string; value: number; max: number }) {
    return <div className="grid gap-1 rounded-l border border-line bg-surface-2 p-3 shadow-1"><div className="flex items-baseline justify-between text-s"><span className="text-ink-3">{label}</span><b className="font-num tabular-nums text-ink-1">{value} <span className="text-ink-3">/ {max}</span></b></div><StatBar value={value} max={max} size="s" showText={false}/></div>;
}
