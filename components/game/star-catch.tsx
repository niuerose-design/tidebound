'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { starSound } from './star-catch-setting';

/**
 * v3.8 스타캐치 미니게임: 별이 좌우로 오갑니다(한 번 건너는 데 CATCH_SWEEP_MS). 가운데 구역(폭 CATCH_ZONE)에 있을 때 누르면 ‘캐치’.
 * 결과는 onResult(caught)로 넘기고, 누르지 않으면 CATCH_TIMEOUT_MS 뒤에 놓친 것으로 칩니다. 키보드는 스페이스·엔터.
 */
export const CATCH_SWEEP_MS = 1100, CATCH_ZONE = .2, CATCH_TIMEOUT_MS = 8000;
export function StarCatch({ onResult, bonus }: { onResult: (caught: boolean) => void; bonus: number }) {
    const [pos, setPos] = useState(0), [done, setDone] = useState<null | boolean>(null);
    const start = useRef(0), raf = useRef(0), fired = useRef(false), lastTick = useRef(-1);
    const where = (now: number) => { const t = ((now - start.current) % (CATCH_SWEEP_MS * 2)) / CATCH_SWEEP_MS; return t <= 1 ? t : 2 - t; }; // 0→1 오른쪽으로, 1→2 왼쪽으로
    const stop = useCallback((hit?: boolean) => {
        if (fired.current) return; fired.current = true; cancelAnimationFrame(raf.current);
        const x = where(performance.now()), caught = hit ?? Math.abs(x - .5) <= CATCH_ZONE / 2;
        setPos(x); setDone(caught); starSound(caught ? 'catch' : 'miss');
        setTimeout(() => onResult(caught), 450);
    }, [onResult]);
    useEffect(() => {
        start.current = performance.now();
        const loop = (now: number) => {
            setPos(where(now));
            const edge = Math.floor((now - start.current) / CATCH_SWEEP_MS);
            if (edge !== lastTick.current) { lastTick.current = edge; starSound('tick'); }
            raf.current = requestAnimationFrame(loop);
        };
        raf.current = requestAnimationFrame(loop);
        const timeout = setTimeout(() => stop(false), CATCH_TIMEOUT_MS);
        return () => { cancelAnimationFrame(raf.current); clearTimeout(timeout); };
    }, [stop]);
    return <div className={`star-catch${done === null ? '' : done ? ' hit' : ' miss'}`} role="button" tabIndex={0} aria-label="스타캐치: 별이 가운데에 올 때 누르세요"
        onPointerDown={e => { e.preventDefault(); stop(); }} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); stop(); } }}>
        <div className="star-catch-track"><span className="star-catch-zone" style={{ left: `${(.5 - CATCH_ZONE / 2) * 100}%`, width: `${CATCH_ZONE * 100}%` }}/><span className="star-catch-star" style={{ left: `${pos * 100}%` }}>★</span></div>
        <small>{done === null ? `별이 가운데 올 때 누르세요 · 성공 +${Math.round(bonus * 100)}%p` : done ? `캐치! 성공률 +${Math.round(bonus * 100)}%p` : '놓쳤습니다 · 기본 확률로 진행'}</small>
    </div>;
}
