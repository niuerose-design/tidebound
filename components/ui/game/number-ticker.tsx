'use client';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatExact, formatShort } from './format';

/**
 * v3.374 큰 숫자 표시. 값이 바뀌면 duration 동안 굴러가며(rAF), 모션 줄이기 설정이면 바로 바뀝니다.
 * 표시는 축약(1.2만 · 3.4억), 정확한 값은 title. 고정폭 숫자(tabular-nums)로 흔들리지 않습니다.
 */
export function NumberTicker({ value, duration = 400, prefix, suffix, className, digits = 1 }: { value: number; duration?: number; prefix?: string; suffix?: string; className?: string; digits?: number }) {
    const [shown, setShown] = useState(value), from = useRef(value), raf = useRef(0);
    useEffect(() => {
        const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduce || duration <= 0) { from.current = value; setShown(value); return; }
        const start = performance.now(), a = from.current, b = value;
        cancelAnimationFrame(raf.current);
        const step = (now: number) => { const t = Math.min(1, (now - start) / duration), e = 1 - Math.pow(1 - t, 3); setShown(a + (b - a) * e); if (t < 1) raf.current = requestAnimationFrame(step); else from.current = b; };
        raf.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf.current);
    }, [value, duration]);
    // 굴러가는 동안만 색을 바꿉니다(목표값과 보이는 값의 차이로 판단, 렌더 중 ref 를 읽지 않음).
    const up = value > shown + 1e-9, down = value < shown - 1e-9;
    return <span className={cn('font-num tabular-nums transition-colors duration-[var(--duration-fast)]', up && 'text-accent', down && 'text-danger', className)} title={formatExact(value)}>{prefix}{formatShort(shown, digits)}{suffix}</span>;
}
