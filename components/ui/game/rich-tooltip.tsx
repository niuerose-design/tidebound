'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { RarityTag, rarityVar, type RarityKey } from './rarity-tag';

/**
 * v3.374 아이템 · 스킬 · 몬스터 공통 툴팁 틀: 이름 · 등급 · 플레이버 · 효과 · 획득처.
 * 마우스는 hover, 키보드는 focus, 터치는 길게 누르기(400ms)로 열리고 Esc · 바깥 탭으로 닫힙니다. 44pt 터치 영역은 trigger 가 책임집니다.
 */
export function RichTooltip({ title, rarity, kicker, flavor, effects, source, children, className, side = 'top' }: {
    title: ReactNode; rarity?: RarityKey; kicker?: ReactNode; flavor?: ReactNode; effects?: ReactNode[]; source?: ReactNode; children: ReactNode; className?: string; side?: 'top' | 'bottom';
}) {
    const [open, setOpen] = useState(false), id = useId(), hold = useRef<ReturnType<typeof setTimeout> | null>(null), wrap = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        if (!open) return;
        const down = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
        const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('pointerdown', down); document.addEventListener('keydown', key);
        return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
    }, [open]);
    const press = () => { hold.current = setTimeout(() => setOpen(true), 400); }, release = () => { if (hold.current) clearTimeout(hold.current); };
    return <span ref={wrap} className={cn('relative inline-flex', className)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onTouchStart={press} onTouchEnd={release} onTouchMove={release} aria-describedby={open ? id : undefined}>
        {children}
        {open && <div id={id} role="tooltip" className={cn('absolute left-1/2 z-50 w-64 max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-m border border-line bg-surface-1 p-3 text-left shadow-2', side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2')} style={rarity ? { borderTopColor: rarityVar(rarity), borderTopWidth: 2 } : undefined}>
            <div className="flex items-start justify-between gap-2"><strong className="text-m text-ink-1 leading-tight" style={rarity ? { color: rarityVar(rarity) } : undefined}>{title}</strong>{rarity && <RarityTag rarity={rarity}/>}</div>
            {kicker && <div className="mt-0.5 text-xs text-ink-3">{kicker}</div>}
            {flavor && <p className="mt-2 text-s italic text-ink-2">{flavor}</p>}
            {effects && effects.length > 0 && <ul className="mt-2 grid gap-1 text-s text-ink-1">{effects.map((e, i) => <li key={i} className="flex gap-1.5"><span className="mt-[7px] size-1 shrink-0 rounded-full bg-accent" aria-hidden/><span>{e}</span></li>)}</ul>}
            {source && <div className="mt-2 border-t border-line pt-2 text-xs text-ink-3">{source}</div>}
        </div>}
    </span>;
}
