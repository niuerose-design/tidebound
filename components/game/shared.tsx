'use client';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState, type ReactNode } from 'react';
import { Fish, Anchor, Compass, Zap, Heart, Shield, Swords, Target, Waves } from 'lucide-react';
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
/** 큰 수는 짧게(1.2만, 3.4억) 표시합니다. 정확한 값은 Num의 title(마우스 올리기·길게 누르기)로 확인합니다. */
export function short(n: number) {
    const a = Math.abs(n), f = (v: number) => (Math.floor(v * 10) / 10).toLocaleString('ko-KR');
    return a >= 1e8 ? `${f(n / 1e8)}억` : a >= 1e4 ? `${f(n / 1e4)}만` : format(Math.floor(n));
}
export function Num({ n }: { n: number }) { return <span className="num-short" title={format(n)}>{short(n)}</span>; }
/** 1초마다 갱신되는 현재 시각. 렌더 중 Date.now()를 직접 부르지 않기 위한 훅입니다. */
export function useNow(ms = 1000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => { const timer = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(timer); }, [ms]);
    return now;
}
