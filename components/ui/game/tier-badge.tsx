import { cn } from '@/lib/utils';

/** v3.374 차수 배지(1차~6차 · 0차는 초보자). 작은 둥근 네모에 숫자, 같은 자리에서 폭이 변하지 않게 고정폭. */
export function TierBadge({ tier, label, className }: { tier: number; label?: string; className?: string }) {
    const text = label ?? (tier <= 0 ? '초보' : `${tier}차`);
    return <span className={cn('inline-flex h-5 min-w-8 items-center justify-center rounded-s border border-line-strong bg-surface-3 px-1.5 font-num text-xs font-semibold tabular-nums text-ink-2', tier >= 5 && 'border-gold-ink/60 text-gold-ink', className)} aria-label={`${text} 직업`}>{text}</span>;
}
