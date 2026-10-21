import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** v3.374 빈 화면 안내: 아이콘 · 제목 · 한 줄 설명 · 행동 버튼 자리. */
export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
    return <div className={cn('grid justify-items-center gap-2 rounded-m border border-dashed border-line px-4 py-8 text-center', className)}>
        {icon && <div className="text-ink-3" aria-hidden>{icon}</div>}
        <h3 className="text-m font-semibold text-ink-1">{title}</h3>
        {description && <p className="max-w-prose text-s text-ink-3">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
    </div>;
}
