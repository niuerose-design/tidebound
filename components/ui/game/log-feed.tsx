'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LogFeedItem = { id: string | number; kind: string; node: ReactNode };

/**
 * v3.374 긴 기록 피드. 보이는 줄만 그리고(@tanstack/react-virtual), 새 줄이 오면 맨 아래로 따라갑니다.
 * 사용자가 위로 올리면 따라가기를 멈추고 '새 기록 N' 버튼으로 돌아옵니다. kinds 로 종류 필터 칩을 둡니다.
 */
export function LogFeed({ items, kinds, height = 280, estimate = 28, emptyText = '기록이 없습니다.', className }: {
    items: LogFeedItem[]; kinds?: { id: string; label: string }[]; height?: number; estimate?: number; emptyText?: string; className?: string;
}) {
    const [filter, setFilter] = useState<string | null>(null), [stick, setStick] = useState(true), [unseen, setUnseen] = useState(0);
    const rows = filter ? items.filter(i => i.kind === filter) : items;
    const parent = useRef<HTMLDivElement>(null), lastCount = useRef(rows.length);
    // eslint-disable-next-line react-hooks/incompatible-library -- @tanstack/react-virtual 은 React Compiler 메모 대상이 아니어도 됩니다(이 컴포넌트는 작음).
    const v = useVirtualizer({ count: rows.length, getScrollElement: () => parent.current, estimateSize: () => estimate, overscan: 8 });
    useEffect(() => {
        const added = rows.length - lastCount.current; lastCount.current = rows.length;
        if (added <= 0) return;
        if (stick) v.scrollToIndex(rows.length - 1, { align: 'end' }); else setUnseen(n => n + added);
    }, [rows.length, stick, v]);
    const onScroll = () => { const el = parent.current; if (!el) return; const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < estimate; setStick(atEnd); if (atEnd) setUnseen(0); };
    return <div className={cn('relative grid gap-2', className)}>
        {kinds && <div className="flex flex-wrap gap-1" role="group" aria-label="기록 종류">
            <button type="button" className={chip(filter === null)} aria-pressed={filter === null} onClick={() => setFilter(null)}>전체</button>
            {kinds.map(k => <button type="button" key={k.id} className={chip(filter === k.id)} aria-pressed={filter === k.id} onClick={() => setFilter(k.id)}>{k.label}</button>)}
        </div>}
        <div ref={parent} onScroll={onScroll} className="overflow-auto rounded-m border border-line bg-surface-1 px-3 py-2 text-s" style={{ height }} role="log" aria-live="polite" aria-relevant="additions">
            {rows.length === 0 ? <p className="py-6 text-center text-ink-3">{emptyText}</p> : <div style={{ height: v.getTotalSize(), position: 'relative' }}>
                {v.getVirtualItems().map(row => <div key={rows[row.index].id} data-index={row.index} ref={v.measureElement} className="absolute left-0 top-0 w-full" style={{ transform: `translateY(${row.start}px)` }}>{rows[row.index].node}</div>)}
            </div>}
        </div>
        {!stick && unseen > 0 && <button type="button" className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex min-h-9 items-center gap-1 rounded-full border border-line-strong bg-surface-2 px-3 text-s text-ink-1 shadow-1" onClick={() => { setStick(true); setUnseen(0); v.scrollToIndex(rows.length - 1, { align: 'end' }); }}><ArrowDown size={14}/> 새 기록 {unseen}</button>}
    </div>;
}
const chip = (on: boolean) => cn('min-h-8 rounded-full border px-3 text-s transition-colors duration-[var(--duration-fast)]', on ? 'border-accent bg-accent-soft text-ink-1' : 'border-line text-ink-2 hover:border-line-strong');
