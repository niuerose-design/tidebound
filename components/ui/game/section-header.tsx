import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** v3.374 구역 제목: 작은 머리말(eyebrow) · 제목 · 설명 · 오른쪽 행동. */
export function SectionHeader({ eyebrow, title, description, actions, as: Tag = 'h2', className }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode; as?: 'h1' | 'h2' | 'h3'; className?: string }) {
    return <header className={cn('flex flex-wrap items-end justify-between gap-x-4 gap-y-2', className)}>
        <div className="min-w-0">
            {eyebrow && <div className="font-display text-xs font-semibold uppercase tracking-[.16em] text-accent">{eyebrow}</div>}
            <Tag className={cn('font-display font-bold text-ink-1 leading-tight', Tag === 'h1' ? 'text-2xl' : Tag === 'h2' ? 'text-l' : 'text-m')}>{title}</Tag>
            {description && <p className="mt-1 text-s text-ink-3">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>;
}
