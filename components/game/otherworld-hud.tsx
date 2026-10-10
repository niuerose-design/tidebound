'use client';
import { useState } from 'react';
import { FUEL, traderMultiplier } from '@/game/data/otherworld';
import { jobById } from '@/game/data/classes';
import { skillById } from '@/game/data/skills';
import type { State, Action } from '@/game/types';
import { format } from './shared';

type Send = (action: Action) => void;
const PNL_POINTS = 40;

/**
 * v3.231 이계 사냥 HUD(사냥터 장면 위 한 줄): 요원은 탄창(남은 발 · 무한 탄창), 트레이더는 평가 손익 · 공격 배율 · 손익 흐름,
 * 공통으로 연료 게이지(절전이면 붉게) · 세계석 충전 · 자동 충전. 탄창은 전투 상태(effects.mag · overdrive)를 그대로 읽습니다.
 */
export function OtherworldHud({ s, send }: { s: State; send: Send }) {
    const j = jobById(s.job);
    const pnl = s.marketPnl || 0, [trail, setTrail] = useState<{ last: number; points: number[] }>({ last: NaN, points: [] });
    // 동기화마다 바뀐 손익만 이어 붙입니다(렌더 중 파생 상태, 같은 값이면 그대로).
    if (jobById(s.job)?.trader && trail.last !== pnl) setTrail({ last: pnl, points: [...trail.points, pnl].slice(-PNL_POINTS) });
    if (!j?.fuelJob) return null;
    const fuel = s.fuel || 0, empty = fuel <= 0, auto = s.fuelAuto !== undefined;
    const passives = s.skills.map(id => skillById(id)).filter(sk => sk?.type === 'passive');
    const cap = j.magazine ? j.magazine + passives.reduce((n, sk) => n + (sk!.magazineBonus || 0), 0) : 0;
    const left = Math.max(0, Math.min(cap, s.effects?.mag?.left ?? cap)), od = (s.effects?.overdrive || 0) > 0;
    let pnlView = null;
    if (j.trader) {
        const { r, factor } = traderMultiplier(pnl, passives.map(sk => sk!)), up = pnl >= 0, h = trail.points;
        const lo = Math.min(-.02, ...h), hi = Math.max(.02, ...h), y = (v: number) => 20 - (v - lo) / (hi - lo) * 18 - 1;
        const d = h.length > 1 ? h.map((v, i) => `${i ? 'L' : 'M'}${(i / (h.length - 1) * 100).toFixed(1)} ${y(v).toFixed(1)}`).join(' ') : '';
        pnlView = <span className={`ow-hud-pnl ${up ? 'up' : 'down'}`}>
            {d && <svg viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true"><path d={`M0 ${y(0).toFixed(1)} L100 ${y(0).toFixed(1)}`} className="zero"/><path d={d}/></svg>}
            평가 손익 {up ? '+' : ''}{(pnl * 100).toFixed(1)}%{r !== pnl ? ` (반영 ${r >= 0 ? '+' : ''}${(r * 100).toFixed(0)}%)` : ''} · 공격 ×{factor.toFixed(2)}
        </span>;
    }
    return <div className={`ow-hud ${empty ? 'saving' : ''}`} role="status">
        <span className="ow-hud-job">이계 · {j.name}</span>
        {cap > 0 && <span className={`ow-hud-mag ${od ? 'od' : ''} ${left === 0 && !od ? 'empty' : ''}`} aria-label={od ? '무한 탄창' : `탄창 ${left} / ${cap}`}>
            {Array.from({ length: cap }, (_, i) => <i key={i} className={!od && i >= left ? 'spent' : ''}/>)}
            <small>{od ? '∞ 무한 탄창' : left === 0 ? '재장전' : `${left}/${cap}`}</small>
        </span>}
        {pnlView}
        <span className="ow-hud-fuel"><span>{empty ? '절전 모드' : '연료'}</span><span className="bar"><i style={{ width: `${Math.min(100, fuel / FUEL.cap * 100)}%` }}/></span><span className="num">{format(fuel)} / {format(FUEL.cap)}</span></span>
        <span className="ow-hud-actions">
            {[10, 100, 1000].map(n => <button key={n} type="button" className="secondary small" disabled={(s.pearls || 0) < 1 || fuel >= FUEL.cap} onClick={() => send({ type: 'fuelCharge', value: String(n) })} title={`세계석 ${format(n)}개 → 연료 ${format(n * FUEL.perPearl)}`}>+{format(n)}</button>)}
            <button type="button" className={`secondary small ${auto ? 'on' : ''}`} onClick={() => send({ type: 'fuelAuto', value: auto ? '' : '1000' })} title={auto ? `세계석 ${format(s.fuelAuto!)}개는 남깁니다` : '연료가 떨어지면 세계석으로 자동 충전'}>자동 {auto ? 'ON' : 'OFF'}</button>
        </span>
    </div>;
}
