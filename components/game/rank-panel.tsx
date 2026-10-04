'use client';
import { Medal } from 'lucide-react';
import type { PanelProps } from './panel-props';
import { RANKS, RANK_PERKS, rankProgress, rankPointsEarned, rankPointsFree, rankPerkLevel, RANK_TOTAL_POINTS } from '@/game/data/rank';
import { Meter } from './shared';

/** v27.79 계급장: 처치 수로만 오르는 계급과 진급 포인트 특전. 칭호 패널 옆에 반반으로 놓입니다. */
export function RankPanel({ s, send, busy }: PanelProps) {
    const p = rankProgress(s), earned = rankPointsEarned(s), free = rankPointsFree(s);
    return <details className="panel title-panel rank-panel"><summary><h2><Medal size={16}/> 계급</h2><span>{p.rank.name} · {p.next ? `다음 ${p.next.name}까지 ${(p.need - p.have).toLocaleString()}마리` : '최고 계급'} · 진급 포인트 {free} / {earned}</span></summary>
        <p className="footnote">처치한 마릿수로만 오릅니다(무리는 마릿수만큼, 환생해도 유지). 지금까지 센 처치 {p.exp.toLocaleString()}마리 · {p.index + 1} / {RANKS.length} 계급{p.next ? ` · 다음 계급까지 ${p.need.toLocaleString()}마리 중 ${p.have.toLocaleString()}` : ''}.</p>
        {p.next && <Meter value={p.have} max={p.need} label={`${p.next.name}까지`}/>}
        <div className="title-actions"><span className="rank-points">진급 포인트 <b>{free}</b> / {earned} (전체 {RANK_TOTAL_POINTS})</span><button type="button" className="secondary small" disabled={busy || earned === free} onClick={() => send({ type: 'rankPerk', id: 'reset' })}>특전 초기화 (무료)</button></div>
        <div className="title-list">{RANK_PERKS.map(perk => { const level = rankPerkLevel(s, perk.id), maxed = level >= perk.max; return <div key={perk.id} className={`title-row ${level ? 'owned' : 'locked'}`}><span className="title-name"><small className="rebirth-title">{perk.name} {level}/{perk.max}</small></span><span className="title-desc">{perk.desc(Math.max(1, level))}{level ? '' : ' (1단계 기준)'} · 단계당 {perk.cost}P</span><button type="button" className={maxed ? 'secondary small' : 'primary small'} disabled={busy || maxed || free < perk.cost} onClick={() => send({ type: 'rankPerk', id: perk.id })}>{maxed ? '최대' : `올리기 · ${perk.cost}P`}</button></div>; })}</div>
        <p className="footnote">계급표: {RANKS.map((r, i) => `${r.name}${i ? ` ${r.need.toLocaleString()}` : ''}`).join(' → ')} (각 계급까지 추가로 필요한 처치 수).</p>
    </details>;
}
