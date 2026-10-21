'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { starSound } from '@/components/game/star-catch-setting';
import { cn } from '@/lib/utils';

/**
 * v3.384 스타캐치 미니게임(새 토대): 별이 좌우로 오갑니다(한 번 건너는 데 SWEEP_MS). 가운데 구역(폭 ZONE)에 있을 때 누르면 ‘캐치’.
 * 결과는 onResult(caught)로 넘기고, 누르지 않으면 TIMEOUT_MS 뒤에 놓친 것으로 칩니다. 키보드는 스페이스 · 엔터. 별 위치는 프레임마다 DOM 에 바로 씁니다.
 */
const SWEEP_MS = 1100, ZONE = .2, TIMEOUT_MS = 8000;
export function StarCatch({ onResult, bonus }: { onResult: (caught: boolean) => void; bonus: number }) {
    const [done, setDone] = useState<null | boolean>(null);
    const start = useRef(0), raf = useRef(0), fired = useRef(false), lastTick = useRef(-1), star = useRef<HTMLSpanElement>(null);
    const place = (x: number) => { if (star.current) star.current.style.left = `${x * 100}%`; };
    const where = (now: number) => { const t = ((now - start.current) % (SWEEP_MS * 2)) / SWEEP_MS; return t <= 1 ? t : 2 - t; };
    const stop = useCallback((hit?: boolean) => {
        if (fired.current) return; fired.current = true; cancelAnimationFrame(raf.current);
        const x = where(performance.now()), caught = hit ?? Math.abs(x - .5) <= ZONE / 2;
        place(x); setDone(caught); starSound(caught ? 'catch' : 'miss');
        setTimeout(() => onResult(caught), 450);
    }, [onResult]);
    useEffect(() => {
        start.current = performance.now();
        const loop = (now: number) => { place(where(now)); const edge = Math.floor((now - start.current) / SWEEP_MS); if (edge !== lastTick.current) { lastTick.current = edge; starSound('tick'); } raf.current = requestAnimationFrame(loop); };
        raf.current = requestAnimationFrame(loop);
        const timeout = setTimeout(() => stop(false), TIMEOUT_MS);
        return () => { cancelAnimationFrame(raf.current); clearTimeout(timeout); };
    }, [stop]);
    return <div className="grid min-h-11 cursor-pointer select-none gap-1.5 rounded-m outline-none focus-visible:ring-[3px] focus-visible:ring-accent/50" style={{ touchAction: 'manipulation' }} role="button" tabIndex={0} aria-label="스타캐치: 별이 가운데에 올 때 누르세요"
        onPointerDown={e => { e.preventDefault(); stop(); }} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); stop(); } }}>
        <div className="relative h-9 overflow-hidden rounded-full border border-line bg-surface-0">
            <span className="absolute inset-y-0 border-x border-gold-ink/60 bg-gold-ink/20" style={{ left: `${(.5 - ZONE / 2) * 100}%`, width: `${ZONE * 100}%` }}/>
            <span ref={star} className={cn('absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-l leading-none', done === true ? 'text-ok' : done === false ? 'text-danger' : 'text-gold-ink')} style={{ left: 0 }}>★</span>
        </div>
        <small className={cn('text-center text-xs', done === true ? 'text-ok' : done === false ? 'text-danger' : 'text-ink-3')}>{done === null ? `별이 가운데 올 때 누르세요 · 성공 +${Math.round(bonus * 100)}%p` : done ? `캐치! 성공률 +${Math.round(bonus * 100)}%p` : '놓쳤습니다 · 기본 확률로 진행'}</small>
    </div>;
}
