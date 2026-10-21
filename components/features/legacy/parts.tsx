'use client';
/** v3.398 환생 · 분신 공용 조각: 카드 · 머리줄 · 장부(받는 보상 / 유지 / 초기화) · 켜짐/꺼짐 버튼 · 입력 칸 스타일. */
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const field = 'h-10 rounded-m border border-line bg-surface-0 px-2 text-s text-ink-1 outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/40 disabled:opacity-50';
export const Card = ({ title, icon, aside, children, className, locked }: { title?: ReactNode; icon?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; locked?: boolean }) => <section className={cn('grid content-start gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1', locked && 'opacity-75', className)}>
    {title && <header className="flex flex-wrap items-center justify-between gap-2"><h2 className="inline-flex items-center gap-1.5 font-display text-m font-bold">{icon}{title}</h2>{aside && <span className="text-xs text-ink-3">{aside}</span>}</header>}{children}</section>;
export const Note = ({ children, className }: { children: ReactNode; className?: string }) => <p className={cn('text-xs leading-relaxed text-ink-3', className)}>{children}</p>;
export const Toggle = ({ on, label, ...rest }: { on: boolean; label?: [string, string] } & Omit<React.ComponentProps<typeof Button>, 'children'>) => <Button type="button" size="sm" variant={on ? 'default' : 'outline'} aria-pressed={on} {...rest} className={cn(on && 'bg-accent text-accent-ink hover:bg-accent/90', rest.className)}>{on ? (label?.[0] ?? '켜짐') : (label?.[1] ?? '꺼짐')}</Button>;
/** 받는 보상 · 유지되는 것 · 초기화되는 것 세 칸. gain 은 [굵은 글, 작은 글] 짝, 나머지는 한 줄 목록. */
export function Ledger({ gain, kept, reset }: { gain: [ReactNode, ReactNode?][]; kept: ReactNode[]; reset: ReactNode[] }) {
    const col = (title: string, tone: string, items: ReactNode[]) => <article className={cn('grid content-start gap-2 rounded-m border p-3', tone)}><h3 className="text-s font-semibold">{title}</h3><ul className="grid gap-1.5 text-xs leading-relaxed text-ink-2">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></article>;
    return <div className="grid gap-3 lg:grid-cols-3">
        {col('받는 보상', 'border-ok/40 bg-ok/5', gain.map(([b, s], i) => <span key={i} className="grid"><b className="text-ink-1">{b}</b>{s && <small className="text-ink-3">{s}</small>}</span>))}
        {col('유지되는 것', 'border-line bg-surface-1', kept)}
        {col('초기화되는 것', 'border-danger/40 bg-danger/5', reset)}
    </div>;
}
