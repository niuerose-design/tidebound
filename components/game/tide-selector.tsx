'use client';
import { tideLimit, tierReward, tierHealth, tierAttack } from '@/game/systems/meta';
import { TIDE_MILESTONES, TIDE_MILESTONE_PEARLS, nextTideMilestone } from '@/game/data/long-term';
import type { PanelProps } from './panel-props';
export function TideSelector({ s, send, busy }: PanelProps) {
    return <section className="panel tide-selector" title="환생마다 1단계 해금(최대 200). 일반 낚시터에만 적용하며 선택은 자유입니다.">
    <div>
    <h3>환생 해역 · 난이도 {s.tide || 0}</h3>
    <p>적 HP ×{tierHealth(s.tide || 0).toFixed(2)} · 공격 ×{tierAttack(s.tide || 0).toFixed(2)} · 골드/EXP ×{tierReward(s.tide || 0).toFixed(2)} · 장비 레벨 +{(s.tide || 0) * 5}</p>
    <small>{(() => { const best = s.tideBest?.[s.stage] || 0, next = nextTideMilestone(best); return `이 해역 최고 차수 ${best}${next ? ` · 다음 이정표 차수 ${next} 첫 포획 진주 +${TIDE_MILESTONE_PEARLS[TIDE_MILESTONES.indexOf(next)]}` : ' · 이정표 모두 달성'}`; })()}</small>
    </div>
    <div className="button-row">
    <button className="secondary" disabled={busy || !!s.dungeon || !s.tide} onClick={() => send({ type: 'tide', id: String(s.tide - 1) })}>−</button>
    <span>{s.tide || 0} / {tideLimit(s)}</span>
    <button className="secondary" disabled={busy || !!s.dungeon || (s.tide || 0) >= tideLimit(s)} onClick={() => send({ type: 'tide', id: String((s.tide || 0) + 1) })}>+</button>
    </div>
    </section>;
}
