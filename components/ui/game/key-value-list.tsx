import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type KeyValue = { key: ReactNode; value: ReactNode; hint?: string; tone?: 'default' | 'ok' | 'warn' | 'danger' };
/** v3.374 이름 · 값 목록(능력치 · 상세 정보). 값은 고정폭 숫자, 두 칸 또는 한 칸. */
export function KeyValueList({ items, columns = 1, className }: { items: KeyValue[]; columns?: 1 | 2; className?: string }) {
    return <dl className={cn('grid gap-x-6 gap-y-1.5 text-s', columns === 2 && 'sm:grid-cols-2', className)}>
        {items.map((it, i) => <div key={i} className="flex items-baseline justify-between gap-3 border-b border-line/60 py-1" title={it.hint}>
            <dt className="text-ink-3">{it.key}</dt>
            <dd className={cn('font-num tabular-nums text-ink-1', it.tone === 'ok' && 'text-ok', it.tone === 'warn' && 'text-warn', it.tone === 'danger' && 'text-danger')}>{it.value}</dd>
        </div>)}
    </dl>;
}
