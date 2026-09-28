'use client';
import { Progress } from '@/components/ui/progress';
import type { ReactNode } from 'react';
import { Fish, Anchor, Compass, Sparkles, Zap, Heart, Shield, Swords, Target, Waves } from 'lucide-react';
export function Meter({ value, max, label, color = 'teal' }: {
    value: number;
    max: number;
    label?: string;
    color?: string;
}) {
    return <div className={`meter ${color}`}>{label && <div className="meter-label">
        <span>{label}</span>
        <span>{Math.ceil(value).toLocaleString()} / {max.toLocaleString()}</span>
        </div>}<Progress value={Math.max(0, Math.min(100, value / max * 100))} aria-label={label || '진행도'}/>
    </div>;
}
export function Heading({ eyebrow, title, description, children }: {
    eyebrow: string;
    title: string;
    description?: string;
    children?: ReactNode;
}) {
    return <div className="page-heading">
    <div>
    <div className="eyebrow">{eyebrow}</div>
    <h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</div>;
}
export function SkillIcon({ id }: {
    id: string;
}) { const Icon = id === 'breath' || id === 'spring' || id === 'vital' ? Heart : id === 'scales' || id === 'fortress' ? Shield : id === 'splash' || id === 'wave' ? Waves : id === 'focus' ? Target : id === 'anchor' ? Anchor : id === 'hook' || id === 'pierce' ? Swords : Zap; return <Icon size={24}/>; }
export function SlotIcon({ slot, size = 24 }: {
    slot: string;
    size?: number;
}) { const Icon = slot === 'rod' ? Anchor : slot === 'coat' ? Shield : Compass; return <Icon size={size}/>; }
export function Empty({ title, description }: {
    title: string;
    description: string;
}) {
    return <div className="empty">
    <Fish size={32}/>
    <h3>{title}</h3>
    <p>{description}</p>
    </div>;
}
export const format = (n: number) => n.toLocaleString('ko-KR');
