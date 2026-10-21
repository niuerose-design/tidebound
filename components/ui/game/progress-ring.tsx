import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** v3.374 둥근 진행도(스킬 숙련 · 채집 · 쿨다운). SVG 원 하나, 가운데에 글자. */
export function ProgressRing({ value, size = 48, stroke = 5, color = 'var(--accent)', track = 'var(--surface-3)', label, children, className }: {
    value: number; size?: number; stroke?: number; color?: string; track?: string; label?: string; children?: ReactNode; className?: string;
}) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, value));
    return <span className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} aria-label={label}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke}/>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} className="transition-[stroke-dashoffset] duration-[var(--duration-base)] ease-[var(--ease-out)]"/>
        </svg>
        <span className="absolute inset-0 grid place-items-center font-num text-xs tabular-nums text-ink-1">{children ?? `${Math.round(p * 100)}%`}</span>
    </span>;
}
