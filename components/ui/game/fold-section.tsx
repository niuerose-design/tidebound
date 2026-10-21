'use client';
import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

/**
 * v3.382 접는 구역: 제목 · 요약(진행 수) · 내용. 닫혀 있으면 내용을 마운트하지 않아(radix Collapsible) 카드가 많은 목록이 가볍습니다.
 * 머리줄 전체가 버튼(44pt), 화살표가 돌아갑니다. level 로 제목 크기(h2 · h3)를 고릅니다.
 */
export function FoldSection({ title, summary, extra, defaultOpen = false, level = 2, className, children }: { title: ReactNode; summary?: ReactNode; /** 머리줄 아래 한 줄(지역 연구 등) */ extra?: ReactNode; defaultOpen?: boolean; level?: 2 | 3; className?: string; children: ReactNode }) {
    const [open, setOpen] = useState(defaultOpen);
    const Tag = level === 2 ? 'h2' : 'h3';
    return <Collapsible open={open} onOpenChange={setOpen} className={cn('rounded-l border border-line bg-surface-2 shadow-1', className)}>
        <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-3 rounded-l px-4 py-2 text-left outline-none hover:bg-surface-3/60 focus-visible:ring-[3px] focus-visible:ring-accent/50">
            <ChevronDown size={18} className={cn('shrink-0 text-ink-3 transition-transform', open && 'rotate-180')} aria-hidden/>
            <Tag className={cn('min-w-0 flex-1 font-semibold text-ink-1', level === 2 ? 'text-l' : 'text-m')}>{title}</Tag>
            {summary && <span className="shrink-0 font-num text-xs tabular-nums text-ink-3">{summary}</span>}
        </CollapsibleTrigger>
        {extra && <div className="px-4 pb-2 text-xs text-ink-3">{extra}</div>}
        <CollapsibleContent className="grid gap-3 px-4 pb-4">{children}</CollapsibleContent>
    </Collapsible>;
}
