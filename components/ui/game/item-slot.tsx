'use client';
import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { rarityVar, type RarityKey } from './rarity-tag';
import { formatShort } from './format';

/**
 * v3.374 아이템 칸(가방 · 장착 · 상점 공용). 등급 테두리 · 수량 · 잠금 · 선택 · 빈 칸.
 * onClick이 있으면 버튼이라 키보드로 누를 수 있고, 없으면 그림(span role=img)입니다. 터치 44pt 를 기본 크기로 둡니다(size m = 44px, 작은 칸도 터치 기기에서는 44px).
 */
export function ItemSlot({ rarity, count, locked, selected, empty, label, children, onClick, size = 'm', className }: {
    rarity?: RarityKey; count?: number; locked?: boolean; selected?: boolean; empty?: boolean; label: string; children?: ReactNode; onClick?: () => void; size?: 's' | 'm' | 'l'; className?: string;
}) {
    const px = size === 's' ? 36 : size === 'l' ? 64 : 44;
    const border = empty ? 'var(--line)' : rarity ? rarityVar(rarity) : 'var(--line-strong)';
    // v3.424 누를 수 없는 칸(onClick 없음)은 버튼이 아니라 그림(span role=img)으로 그립니다. 카드 · 줄 버튼 안에 넣어도 버튼 안 버튼(HTML 위반 · hydration 오류)이 되지 않습니다. 모양은 같습니다(disabled 버튼과 같은 스타일).
    const Tag = onClick ? 'button' : 'span';
    return <Tag {...(onClick ? { type: 'button' as const, 'aria-pressed': selected, onClick } : { role: 'img' })} aria-label={label} className={cn('relative inline-flex shrink-0 items-center justify-center rounded-m border-2 bg-surface-2 text-ink-1 outline-none [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 transition-[box-shadow,transform] duration-[var(--duration-fast)] focus-visible:ring-2 focus-visible:ring-accent enabled:hover:-translate-y-px enabled:active:translate-y-0 disabled:cursor-default', empty && 'border-dashed bg-surface-1', selected && 'ring-2 ring-accent', className)} style={{ width: px, height: px, borderColor: border, boxShadow: rarity && !empty ? `inset 0 0 0 1px color-mix(in srgb, ${rarityVar(rarity)} 35%, transparent)` : undefined }}>
        {children}
        {count !== undefined && count > 1 && <span className="absolute bottom-0.5 right-1 rounded-s bg-surface-0/80 px-1 font-num text-xs tabular-nums text-ink-1">{formatShort(count, 0)}</span>}
        {locked && <span className="absolute left-0.5 top-0.5 rounded-s bg-surface-0/80 p-0.5 text-gold-ink" aria-label="잠금"><Lock size={10}/></span>}
    </Tag>;
}
