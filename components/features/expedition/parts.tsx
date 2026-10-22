import { ORIGIN_NAMES, ROLE_NAMES, SPECIAL_NAMES, unitById, type UnitDef } from '@/game/data/expedition';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
/** v3.413 원정대 공용 조각(expedition-screen.tsx 에서 분리): 유닛 꼬리표 · 카드 · 머리줄 · 글 · 버튼 · 상자. */
export const tags = (def: UnitDef) => [ORIGIN_NAMES[def.origin], ...def.roles.map(r => ROLE_NAMES[r]), ...(def.special || []).map(x => SPECIAL_NAMES[x])].join(' · ');
export const stars = (n: number) => '★'.repeat(n);
/** 공용 조각: 카드 · 머리줄 · 글 · 버튼. */
export const Card = ({ children, className, ...rest }: React.ComponentProps<'section'>) => <section {...rest} className={cn('grid content-start gap-3 rounded-l border border-line bg-surface-2 p-4 shadow-1', className)}>{children}</section>;
export const Head = ({ title, aside, level = 2 }: { title: React.ReactNode; aside?: React.ReactNode; level?: 2 | 3 }) => { const Tag = level === 2 ? 'h2' : 'h3'; return <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><Tag className={cn('font-display font-bold', level === 2 ? 'text-m' : 'text-s')}>{title}</Tag>{aside !== undefined && <span className="inline-flex flex-wrap items-center gap-2 text-xs text-ink-3">{aside}</span>}</header>; };
export const Note = ({ children, tone, className }: { children: React.ReactNode; tone?: 'danger' | 'warn' | 'info' | 'gold'; className?: string }) => <p className={cn('text-xs leading-relaxed', tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'rounded-m border-l-[3px] border-warn bg-warn/10 px-3 py-2 text-ink-1' : tone === 'info' ? 'rounded-m border-l-[3px] border-[#6f8fd6] bg-[#6f8fd6]/10 px-3 py-2 text-ink-1' : tone === 'gold' ? 'rounded-m border-l-[3px] border-gold-ink bg-gold-ink/10 px-3 py-2 text-ink-1' : 'text-ink-3', className)}>{children}</p>;
export const Muted = ({ children, className }: { children: React.ReactNode; className?: string }) => <small className={cn('block text-xs leading-relaxed text-ink-3', className)}>{children}</small>;
export const Primary = (p: React.ComponentProps<typeof Button>) => <Button type="button" size="sm" {...p} className={cn('bg-accent text-accent-ink hover:bg-accent/90 pointer-coarse:min-h-11', p.className)}/>;
export const Sm = (p: React.ComponentProps<typeof Button>) => <Button type="button" size="xs" variant="outline" {...p} className={cn('pointer-coarse:min-h-11', p.className)}/>;
export const Link = (p: React.ComponentProps<typeof Button>) => <Button type="button" size="xs" variant="ghost" {...p} className={cn('h-auto px-1 py-0.5 text-xs text-accent underline-offset-2 hover:underline pointer-coarse:min-h-11', p.className)}/>;
export const Row = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>;
/** 상자 안 작은 상자(목표 보드 · 명성 · 완주 선택 등). */
export const Box = ({ children, className, ...rest }: React.ComponentProps<'div'>) => <div {...rest} className={cn('grid gap-2 rounded-m border border-line bg-surface-1 p-3 text-xs', className)}>{children}</div>;
/** 유닛 목록을 ‘이름★2 · 이름’ 한 줄로. */
export const unitLine = (list: { unit: string; star: number }[]) => list.map(u => `${unitById(u.unit)?.name || u.unit}${u.star > 1 ? `★${u.star}` : ''}`).join(' · ');
