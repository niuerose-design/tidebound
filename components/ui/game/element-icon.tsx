import { Swords, Sparkles, Atom, Target, type LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DamageKind = 'physical' | 'magic' | 'split' | 'fixed';
export const DAMAGE_LABEL: Record<DamageKind, string> = { physical: '물리', magic: '마법', split: '복합', fixed: '고정' };
const ICON: Record<DamageKind, React.ComponentType<LucideProps>> = { physical: Swords, magic: Sparkles, split: Atom, fixed: Target };

/** v3.374 피해 종류 아이콘(물리 · 마법 · 복합 · 고정). 색은 토큰 --dmg-*. withLabel 이면 글자도 같이. */
export function ElementIcon({ kind, size = 16, withLabel = false, className }: { kind: DamageKind; size?: number; withLabel?: boolean; className?: string }) {
    const Icon = ICON[kind];
    return <span className={cn('inline-flex items-center gap-1 align-middle', className)} style={{ color: `var(--dmg-${kind})` }} title={DAMAGE_LABEL[kind]} aria-label={withLabel ? undefined : DAMAGE_LABEL[kind]}>
        <Icon size={size} aria-hidden/>{withLabel && <span className="text-s">{DAMAGE_LABEL[kind]}</span>}
    </span>;
}
