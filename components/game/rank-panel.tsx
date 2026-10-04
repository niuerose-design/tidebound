'use client';
import type { PanelProps } from './panel-props';
import { RANKS, RANK_PERKS, rankProgress, rankPointsEarned, rankPointsFree, rankPerkLevel } from '@/game/data/rank';
import { RankInsignia } from './rank-insignia';
import { Meter } from './shared';

/** v27.79 계급장. 칭호 패널 옆 반쪽: 계급장 그림 + 이름 + 진행도, 특전 4개는 한 줄 칩. 계급표는 툴팁. */
export function RankPanel({ s, send, busy }: PanelProps) {
    const p = rankProgress(s), earned = rankPointsEarned(s), free = rankPointsFree(s);
    const table = RANKS.map((r, i) => `${r.name}${i ? ` ${r.need.toLocaleString()}` : ''}`).join(' → ');
    return <details className="panel title-panel rank-panel" open><summary><h2>계급</h2><span>{p.rank.name}{free ? ` · 진급 포인트 ${free}` : ''}</span></summary>
        <div className="rank-head" title={`처치한 마릿수로만 오릅니다(무리는 마릿수만큼, 환생해도 유지). 계급표(각 계급까지 추가 처치 수): ${table}`}>
            <RankInsignia index={p.index} size={44} title={p.rank.name}/>
            <div className="rank-head-text"><b>{p.rank.name}</b><small>{p.next ? `${p.next.name}까지 ${(p.need - p.have).toLocaleString()}마리` : '최고 계급'} · 누적 {p.exp.toLocaleString()}마리</small>{p.next && <Meter value={p.have} max={p.need} label=""/>}</div>
        </div>
        <div className="rank-perks">{RANK_PERKS.map(perk => { const level = rankPerkLevel(s, perk.id), maxed = level >= perk.max; return <button key={perk.id} type="button" className={`rank-perk ${level ? 'on' : ''}`} disabled={busy || maxed || free < perk.cost} title={`${perk.desc(Math.max(1, level))}${level ? '' : ' (1단계 기준)'} · 단계당 ${perk.cost}P`} onClick={() => send({ type: 'rankPerk', id: perk.id })}><span>{perk.name}</span><b>{level}/{perk.max}</b></button>; })}
            <button type="button" className="rank-perk rank-reset" disabled={busy || earned === free} title="쓴 진급 포인트를 모두 돌려받습니다 (무료)" onClick={() => send({ type: 'rankPerk', id: 'reset' })}>초기화</button></div>
        <p className="footnote">진급 포인트 {free} / {earned} · 특전은 단계당 1P, 언제든 무료 초기화. 자세한 설명은 특전에 마우스를 올리거나 도움말 ‘계급장’.</p>
    </details>;
}
