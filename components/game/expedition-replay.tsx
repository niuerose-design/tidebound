'use client';
/**
 * 원정대 12단계: 전투 재생. 저장된 프레임(ReplayFrame)을 보드 위에서 한 장면씩 틀어 줍니다.
 * - 위쪽이 상대(뒷줄 · 앞줄), 아래쪽이 내 보드(앞줄 · 뒷줄). 칸마다 그림 · 이름 · 체력 막대.
 * - 프레임마다 행동 유닛은 앞으로 튀어나오고(lunge), 대상은 흔들리며 피해 숫자가 떠오릅니다. 시전은 기술 이름 띠, 처치는 흐려짐, 부활은 번쩍임.
 * - 동작 줄이기 설정이면 애니메이션 없이 마지막 장면으로 갑니다. 재생 속도 1 · 2 · 4배.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { unitById, type UnitDef } from '@/game/data/expedition';
import type { ExpeditionPlaced, ReplayFrame } from '@/game/types';
import { MonsterArt } from './art';
import { OnyxArt } from './onyx-art';

export const UnitArt = ({ def, size }: { def: UnitDef; size: number }) => def.special?.includes('onyx') ? <OnyxArt id={def.monster} size={size}/> : <MonsterArt id={def.monster} size={size} boss={!!def.special?.includes('boss')}/>;

type Props = { board: ExpeditionPlaced[]; foe: ExpeditionPlaced[]; frames: ReplayFrame[]; turns: number; won: boolean; opponent?: string; truncated?: boolean; onClose: () => void };
const BASE_MS = 420;

/** 프레임 step까지 적용한 체력 %(처음 100). */
function hpAt(frames: ReplayFrame[], step: number, keys: string[]) {
    const hp: Record<string, number> = {}; for (const k of keys) hp[k] = 100;
    for (let i = 0; i <= step && i < frames.length; i++) { const f = frames[i]; if (f.d && f.th !== undefined) hp[f.d] = f.th; if (f.ah !== undefined) hp[f.a] = f.ah; }
    return hp;
}
function caption(f: ReplayFrame | undefined, name: (k: string) => string) {
    if (!f) return '';
    if (f.s === 'start') return `전투 시작 · ${name(f.a)} ${f.m}`;
    if (f.s === 'revive') return `${f.t}턴 · ${name(f.a)} 부활(체력 30%)`;
    if (f.s === 'reflect') return `${f.t}턴 · ${name(f.a)} 반격 → ${name(f.d || '')} ${f.v}${f.k ? ' · 처치' : ''}`;
    const what = f.s === 'cast' ? `${f.m} 시전` : f.s === 'miss' ? '공격 빗나감' : f.s === 'heal' ? '공격 · 회복' : '공격';
    return `${f.t}턴 · ${name(f.a)} ${what} → ${name(f.d || '')}${f.v ? ` ${f.v}` : ''}${f.c ? ' 치명' : ''}${f.k ? ' · 처치' : ''}`;
}

export function BattleReplay({ board, foe, frames, turns, won, opponent, truncated, onClose }: Props) {
    const reduce = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
    const [step, setStep] = useState(() => reduce ? frames.length - 1 : -1);
    const [playing, setPlaying] = useState(!reduce);
    // 15단계: 배속은 브라우저에 기억합니다(다음 전투에도 유지).
    const [speed, setSpeedState] = useState(() => { try { const v = Number(localStorage.getItem('exp-replay-speed')); return v === 2 || v === 4 ? v : 1; } catch { return 1; } });
    const setSpeed = (f: (s: number) => number) => setSpeedState(s => { const n = f(s); try { localStorage.setItem('exp-replay-speed', String(n)); } catch { /* 저장 불가 */ } return n; });
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const keys = useMemo(() => [...board.map((_, i) => `a${i}`), ...foe.map((_, i) => `b${i}`)], [board, foe]);
    const unit = (k: string) => (k[0] === 'a' ? board : foe)[Number(k.slice(1))];
    const name = (k: string) => { const p = unit(k); const def = p && unitById(p.unit); return def ? `${def.name}${p.star > 1 ? `★${p.star}` : ''}` : '?'; };
    const ended = step >= frames.length - 1;
    useEffect(() => {
        if (!playing || ended) return;
        const f = frames[step + 1], ms = (f?.s === 'cast' || f?.k ? BASE_MS * 1.4 : f?.s === 'start' ? BASE_MS * 1.2 : BASE_MS) / speed;
        timer.current = setTimeout(() => setStep(s => s + 1), ms);
        return () => { if (timer.current) clearTimeout(timer.current); };
    }, [playing, ended, step, speed, frames]);
    const hp = hpAt(frames, step, keys), cur = step >= 0 ? frames[step] : undefined;
    const cell = (k: string, p: ExpeditionPlaced) => {
        const def = unitById(p.unit)!, isActor = cur?.a === k, isTarget = cur?.d === k, dead = hp[k] <= 0 && !(cur?.s === 'revive' && cur.a === k);
        const cls = ['exp-fighter', `cost-${def.cost}`, `star-${p.star}`, k[0] === 'a' ? 'mine' : 'theirs', dead ? 'dead' : '', isActor ? (cur?.s === 'cast' ? 'cast' : cur?.s === 'revive' ? 'revive' : cur?.s === 'start' ? 'start' : cur?.s === 'reflect' ? 'reflecting' : 'act') : '', isTarget ? (cur?.k ? 'hit kill' : cur?.c ? 'hit crit' : cur?.s === 'miss' ? 'dodge' : 'hit') : ''].filter(Boolean).join(' ');
        return <div key={`${k}:${step}:${isActor || isTarget ? 1 : 0}`} className={cls} title={`${def.name} ★${p.star} · 체력 ${hp[k]}%`}>
            <UnitArt def={def} size={28}/><b>{def.name}</b>
            <span className="hp"><i style={{ width: `${hp[k]}%` }}/></span>
            {isTarget && cur?.v ? <em className={`float${cur.c ? ' crit' : ''}`}>{cur.c ? `${cur.v}!` : cur.v}</em> : isTarget && cur?.s === 'miss' ? <em className="float miss">빗나감</em> : null}
            {isActor && cur?.s === 'cast' ? <small className="tag">{cur.m}</small> : isActor && cur?.s === 'start' ? <small className="tag">{cur.m}</small> : isActor && cur?.s === 'revive' ? <small className="tag">부활</small> : null}
            {isTarget && cur?.k ? <small className="tag kill">처치</small> : null}
        </div>;
    };
    const grid = (side: 'a' | 'b', list: ExpeditionPlaced[], order: ('front' | 'back')[]) => order.map(row => <div key={row} className="exp-arena-row">{[0, 1, 2, 3].map(col => { const hit = list.map((p, i) => [p, i] as const).filter(([p]) => p.row === row)[col]; return hit ? cell(`${side}${hit[1]}`, hit[0]) : <div key={`${row}${col}`} className="exp-fighter empty"/>; })}</div>);
    return <div className={`exp-arena${ended ? (won ? ' won' : ' lost') : ''}`} aria-label="전투 재생">
        <div className="exp-arena-head"><b>{opponent ? `${opponent}의 원정대` : '웨이브'}</b><span>{cur ? `${Math.max(1, cur.t)} / ${turns}턴` : `${turns}턴`}</span></div>
        <div className="exp-arena-side theirs">{grid('b', foe, ['back', 'front'])}</div>
        <div className="exp-arena-vs">{ended ? (won ? '승리' : '패배') : 'VS'}</div>
        <div className="exp-arena-side mine">{grid('a', board, ['front', 'back'])}</div>
        <p className="exp-arena-caption" aria-live="polite">{cur ? caption(cur, name) : '재생 준비'}{ended && truncated ? ' · (뒤는 생략)' : ''}</p>
        <div className="exp-arena-controls">
            <button type="button" className="secondary small" onClick={() => { if (ended) { setStep(-1); setPlaying(true); } else setPlaying(p => !p); }}>{ended ? '다시 보기' : playing ? '일시 정지' : '재생'}</button>
            <button type="button" className="secondary small" disabled={ended} onClick={() => { setPlaying(false); setStep(frames.length - 1); }}>끝으로</button>
            <button type="button" className={`secondary small${speed !== 1 ? ' on' : ''}`} onClick={() => setSpeed(s => s === 1 ? 2 : s === 2 ? 4 : 1)}>{speed}배속</button>
            <button type="button" className="text-button" onClick={onClose}>닫기</button>
        </div>
    </div>;
}
