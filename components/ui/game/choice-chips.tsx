'use client';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export type Choice = { value: string; label: string; title?: string; disabled?: boolean; style?: CSSProperties; /** 선택 안 된 칩 뒤에 점을 붙여 ‘다른 쪽에서 고름’을 표시 */ mark?: boolean };
/**
 * v3.381 선택 칩 묶음: 하나 또는 여러 개를 고릅니다(aria-pressed). 탭이 아니라 ‘값 고르기’이므로 role=group.
 * 터치 기기의 44pt 는 responsive.css 공통 규칙(button min-height)이 채웁니다.
 */
export function ChoiceChips({ label, options, value, onChange, disabled, className }: { label: string; options: Choice[]; value: string | string[]; onChange: (v: string) => void; disabled?: boolean; className?: string }) {
    const picked = (v: string) => Array.isArray(value) ? value.includes(v) : value === v;
    return <div role="group" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>{options.map(o => <button key={o.value} type="button" aria-pressed={picked(o.value)} disabled={disabled || o.disabled} title={o.title} style={o.style}
        className={cn('min-h-9 rounded-m border px-3 text-s font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50',
            picked(o.value) ? 'border-accent bg-accent-soft text-ink-1' : 'border-line bg-surface-1 text-ink-2 hover:bg-surface-3')}
        onClick={() => onChange(o.value)}>{o.label}{o.mark && !picked(o.value) ? ' ·' : ''}</button>)}</div>;
}
