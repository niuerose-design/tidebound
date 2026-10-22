'use client';
/** v3.393 상점 공용 조각: 상품 카드(머리 · 설명 · 고르는 칸 · 가격 줄 · 버튼 줄) · 재화 타일 · 입력 칸 스타일. */
import type { ReactNode } from 'react';
import { Eyebrow } from '@/components/ui/game';
import { cn } from '@/lib/utils';

export const field = 'h-10 rounded-m border border-line bg-surface-0 px-2 text-s text-ink-1 outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/40 disabled:opacity-50';

export function GoodCard({ eyebrow, title, head, desc, controls, cost, children, className, onyx }: { eyebrow: string; title: ReactNode; head?: ReactNode; desc: ReactNode; controls?: ReactNode; cost: ReactNode; children?: ReactNode; className?: string; /** 칠흑 상품: 태초 색 테두리 */ onyx?: boolean }) {
    return <article className={cn('grid content-start gap-3 rounded-l border bg-surface-2 p-4 shadow-1', onyx ? 'border-[color:var(--rarity-primal)]/60' : 'border-line', className)}>
        <header className="flex items-center gap-3">{head}<div className="min-w-0"><Eyebrow>{eyebrow}</Eyebrow><h2 className="font-display text-m font-bold">{title}</h2></div></header>
        <p className="text-s leading-relaxed text-ink-2">{desc}</p>
        {controls && <div className="flex flex-wrap items-end gap-3">{controls}</div>}
        <p className="text-xs text-ink-3">{cost}</p>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </article>;
}
export function Tile({ icon, label, children, className }: { icon?: ReactNode; label: string; children: ReactNode; className?: string }) {
    return <div className={cn('flex items-center gap-3 rounded-l border border-line bg-surface-2 p-3 shadow-1', className)}>{icon && <span className="text-accent" aria-hidden="true">{icon}</span>}<div className="grid min-w-0 flex-1 gap-0.5"><span className="text-xs text-ink-3">{label}</span><span className="flex items-baseline gap-1 font-num text-l font-semibold">{children}</span></div></div>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="grid gap-0.5 text-xs text-ink-3">{label}{children}</label>; }
