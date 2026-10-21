'use client';
/** v3.390 까미 · 누리 등장 · 처치 연출(옛 battle-view 에서 옮김). 연출 CSS(.scene-fx-kkami*)는 battle.css 에 그대로 둡니다. */
import { useEffect, useRef, useState } from 'react';
import type { State } from '@/game/types';
import { EXP_NURI } from '@/game/data/exp-nuri';
import { isSpecialId } from '@/game/data/king';

const COINS = ['✦', '◉', '✦', '◉', '✦', '◉', '✦', '◉'];
/** v27.23 숙련의 까미가 나타나면 3초 동안 금빛 연출을 띄웁니다. 같은 까미에는 한 번만. v27.58 경험의 누리도 같은 연출(하얀 빛). */
export function KkamiArrival({ s }: { s: State }) {
    const [show, setShow] = useState<'' | 'kkami' | 'nuri'>('');
    const seen = useRef('');
    // v3.13 키에 처치 수를 넣지 않습니다. 재생 중인 화면에는 아직 까미가 보이는데 동기화로 처치 수가 먼저 올라 등장 연출이 처치 때 한 번 더 나왔습니다.
    const key = s.enemy && isSpecialId(s.enemy.id) ? `${s.enemy.id}:${s.enemy.maxHp}` : '';
    useEffect(() => {
        if (!key) { seen.current = ''; return; }
        if (seen.current === key) return;
        seen.current = key;
        setShow(key.startsWith(EXP_NURI.id) || key.startsWith('kingNuri') ? 'nuri' : 'kkami');
        const timer = window.setTimeout(() => setShow(''), 3200);
        return () => window.clearTimeout(timer);
    }, [key]);
    if (!show) return null;
    return <div className="scene-fx-layer kkami-layer" aria-hidden="true"><div className={`scene-fx scene-fx-kkami${show === 'nuri' ? ' scene-fx-nuri' : ''}`}>
        <i className="scene-fx-dark"/><i className="scene-fx-flash"/>
        {COINS.map((g, i) => <b key={i} className="scene-fx-kkami-coin" style={{ '--i': i } as React.CSSProperties}>{g}</b>)}
        <strong className="scene-fx-kkami-title">{show === 'nuri' ? '✦ 경험의 누리 등장!' : '✦ 숙련의 까미 등장!'}</strong>
        <span className="scene-fx-kkami-sub">{show === 'nuri' ? '잡으면 레벨 경험치 1~3% 로또' : '잡으면 직업·스킬 숙련 로또'}</span>
    </div></div>;
}

/** v3.13 까미·누리를 잡으면 등장 연출과 다른 처치 연출(금빛 고리 + 당첨 문구)을 띄웁니다. 재생 중인 로그에 당첨 줄이 나타나는 순간 기준. */
export function KkamiKill({ s }: { s: State }) {
    const hit = s.logs.findLast(l => l.type === 'reward' && (l.text.startsWith('✦ 숙련의 까미 ·') || l.text.startsWith('✦ 경험의 누리 ·')));
    const [show, setShow] = useState<{ id: number; nuri: boolean; text: string } | null>(null);
    const seen = useRef(0);
    const id = hit?.id || 0;
    useEffect(() => {
        if (!id || !hit || seen.current === id) return;
        const fresh = seen.current !== 0;
        seen.current = id;
        if (!fresh) return;
        setShow({ id, nuri: hit.text.startsWith('✦ 경험의 누리'), text: hit.text.replace(/^✦ [^·]+· /, '') });
        const timer = window.setTimeout(() => setShow(null), 2800);
        return () => window.clearTimeout(timer);
    }, [id, hit]);
    if (!show) return null;
    return <div className="scene-fx-layer kkami-layer" aria-hidden="true"><div className={`scene-fx scene-fx-kkami scene-fx-kkami-kill${show.nuri ? ' scene-fx-nuri' : ''}`}>
        <i className="scene-fx-flash"/><i className="scene-fx-kkami-ring"/><i className="scene-fx-kkami-ring"/>
        {COINS.map((g, i) => <b key={i} className="scene-fx-kkami-coin" style={{ '--i': i } as React.CSSProperties}>{g}</b>)}
        <strong className="scene-fx-kkami-title">{show.nuri ? '✦ 경험의 누리 처치!' : '✦ 숙련의 까미 처치!'}</strong>
        <span className="scene-fx-kkami-sub">{show.text}</span>
    </div></div>;
}
