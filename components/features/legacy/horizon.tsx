'use client';
/** v3.469 수평 상점(docs/balance-rebirth.md 15.2 C): 전투력이 오르지 않는 편의 · 치장을 세계석으로. 산 것은 승천해도 남습니다. */
import { Sparkles } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { Button } from '@/components/ui/button';
import { formatExact } from '@/components/ui/game';
import { HORIZON_ITEMS, horizonCount, horizonSpent, PRESET_BASE } from '@/game/data/horizon';
import { Card, Note } from './parts';
import { cn } from '@/lib/utils';

const fmt = formatExact;
export function HorizonShop({ s, send, busy }: { s: State; send: (a: Action) => void; busy: boolean }) {
    const spent = horizonSpent(s);
    return <div className="grid gap-3">
        <Note>전투력이 오르는 물건은 없습니다. 산 것은 환생과 승천을 넘어 남고, 환생 200회부터 세계석 연구가 잠긴 뒤에도 여기서 씁니다.{spent ? ` 지금까지 세계석 ${fmt(spent)}개를 썼습니다.` : ''}</Note>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{HORIZON_ITEMS.map(item => {
            const have = horizonCount(s, item.id), done = have >= item.max, short = Math.max(0, item.cost - s.pearls);
            return <Card key={item.id} className={cn('grid content-start gap-2', done && 'border-ok/50')}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1"><strong className="text-s">{item.name}</strong><small className="text-xs text-ink-3">{item.max > 1 ? `${have} / ${item.max}` : done ? '샀음' : ''}</small></div>
                <Note>{item.desc}{item.id === 'presetSlot' ? ` 지금 ${PRESET_BASE + have}칸.` : ''}</Note>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-num text-s"><Sparkles size={14} className="text-gold-ink"/>{fmt(item.cost)}</span>
                    <Button type="button" size="sm" className="min-h-9 bg-accent text-accent-ink hover:bg-accent/90 pointer-coarse:min-h-11" disabled={busy || done || short > 0} onClick={() => send({ type: 'horizon', id: item.id })}>{done ? '다 샀음' : short > 0 ? `세계석 ${fmt(short)} 부족` : '사기'}</Button>
                </div>
            </Card>; })}</div>
    </div>;
}
