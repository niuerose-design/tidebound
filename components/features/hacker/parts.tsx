'use client';
/** v3.406 해킹 · 조직 화면 공용 조각(카드 · 머리줄 · 글 · 버튼 · 입력). */
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
export { field } from '@/components/features/shop/parts';

export const Card = ({ children, className, ...rest }: ComponentProps<'section'>) => <section {...rest} className={cn('grid min-w-0 content-start gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1', className)}>{children}</section>;
export const Head = ({ title, aside, level = 2 }: { title: ReactNode; aside?: ReactNode; level?: 2 | 3 }) => { const Tag = level === 2 ? 'h2' : 'h3'; return <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><Tag className={cn('font-display font-bold', level === 2 ? 'text-m' : 'text-s')}>{title}</Tag>{aside !== undefined && <span className="inline-flex flex-wrap items-center gap-2 text-xs text-ink-3">{aside}</span>}</header>; };
export const Note = ({ children, tone, className, ...rest }: ComponentProps<'p'> & { tone?: 'danger' | 'warn' }) => <p {...rest} className={cn('text-xs leading-relaxed', tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'rounded-m border-l-[3px] border-warn bg-warn/10 px-3 py-2 text-s text-ink-1' : 'text-ink-3', className)}>{children}</p>;
/** 해킹 카드 · 프로그램 카드: 제목(b) · 설명(small) · 입력 줄. */
export const Box = ({ children, className, on, ...rest }: ComponentProps<'div'> & { on?: boolean }) => <div {...rest} className={cn('grid content-start gap-2 rounded-m border border-line bg-surface-1 p-3 [&>b]:text-s [&>b]:font-semibold [&>small]:text-xs [&>small]:leading-relaxed [&>small]:text-ink-3 [&>button]:justify-self-start', on && 'border-accent/60 bg-accent-soft', className)}>{children}</div>;
/** 입력 줄: input · select 는 140px 부터 늘어나고 버튼은 제 크기. */
export const rowCls = 'flex flex-wrap items-center gap-2 [&>input]:min-w-0 [&>input]:flex-[1_1_140px] [&>select]:min-w-0 [&>select]:flex-[1_1_140px] [&>small]:text-xs [&>small]:text-ink-3';
export const Row = ({ children, className, ...rest }: ComponentProps<'div'>) => <div {...rest} className={cn(rowCls, className)}>{children}</div>;
export const Form = ({ children, className, ...rest }: ComponentProps<'form'>) => <form {...rest} className={cn(rowCls, className)}>{children}</form>;
export const Primary = (p: ComponentProps<typeof Button>) => <Button type="submit" size="sm" {...p} className={cn('bg-accent text-accent-ink hover:bg-accent/90 pointer-coarse:min-h-11', p.className)}/>;
export const Sm = (p: ComponentProps<typeof Button>) => <Button type="button" size="sm" variant="outline" {...p} className={cn('pointer-coarse:min-h-11', p.className)}/>;
export const Link = (p: ComponentProps<typeof Button>) => <Button type="button" size="xs" variant="ghost" {...p} className={cn('h-auto px-1 py-0.5 text-xs text-accent underline-offset-2 hover:underline pointer-coarse:min-h-11', p.className)}/>;
