'use client';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatExact, formatShort } from './format';

export type StatBarTone = 'hp' | 'mp' | 'exp' | 'accent' | 'warn' | 'danger';
const TONE: Record<StatBarTone, string> = { hp: 'var(--ok)', mp: 'var(--info)', exp: 'var(--gold-ink)', accent: 'var(--accent)', warn: 'var(--warn)', danger: 'var(--danger)' };

/**
 * v3.374 체력 · 마나 · 경험치 막대. 값이 줄면 잔상(ghost)이 천천히 따라오고, 늘면 밝게 번쩍입니다.
 * 숫자는 축약(만 · 억)으로 보이고 정확한 값은 title 에 둡니다. 높이 · 색은 토큰만 씁니다.
 */
export function StatBar({ value, max, label, tone = 'accent', color, showText = true, size = 'm', className }: {
    value: number; max: number; label?: string; tone?: StatBarTone; color?: string; showText?: boolean; size?: 's' | 'm' | 'l'; className?: string;
}) {
    const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
    const prev = useRef(value), [flash, setFlash] = useState<'up' | 'down' | null>(null);
    useEffect(() => { if (value !== prev.current) { setFlash(value > prev.current ? 'up' : 'down'); prev.current = value; const t = setTimeout(() => setFlash(null), 500); return () => clearTimeout(t); } }, [value]);
    const h = size === 's' ? 'h-1.5' : size === 'l' ? 'h-3' : 'h-2';
    return <div className={cn('grid gap-1 min-w-0', className)} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label} title={`${formatExact(value)} / ${formatExact(max)}`}>
        {(label || showText) && <div className="flex items-baseline justify-between gap-2 text-s"><span className="text-ink-2 truncate">{label}</span>{showText && <span className={cn('font-num tabular-nums text-ink-1 transition-colors duration-[var(--duration-fast)]', flash === 'up' && 'text-accent', flash === 'down' && 'text-danger')}>{formatShort(value)} <span className="text-ink-3">/ {formatShort(max)}</span></span>}</div>}
        <div className={cn('relative w-full overflow-hidden rounded-s bg-surface-3', h)}>
            <div className="absolute inset-y-0 left-0 rounded-s bg-ink-3/40 transition-[width] duration-700 ease-out" style={{ width: `${ratio * 100}%` }} aria-hidden/>
            <div className="absolute inset-y-0 left-0 rounded-s transition-[width] duration-[var(--duration-base)] ease-[var(--ease-out)]" style={{ width: `${ratio * 100}%`, background: color || TONE[tone], boxShadow: flash === 'up' ? `0 0 8px ${color || TONE[tone]}` : undefined }} aria-hidden/>
        </div>
    </div>;
}
