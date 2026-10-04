'use client';
import { memo, useState } from 'react';
import { tideLimit, tierReward, tierExp, tierHealth, tierAttack } from '@/game/systems/meta';
import { TIDE_MILESTONES, TIDE_MILESTONE_PEARLS, nextTideMilestone } from '@/game/data/long-term';
import type { PanelProps } from './panel-props';
import { STAGES, FISH, tideLiftLevel } from '@/game/data/world';
import { rarityShareFrom, tideEssence, victoryHealRate } from '@/game/systems/encounter';
import { BALANCE } from '@/game/data/balance';
import { MIMIC } from '@/game/data/mimic';
import { EXP_NURI } from '@/game/data/exp-nuri';
import { percent } from '@/game/data/progression';
/** v27.62 전투 화면에서는 동기화 상태만 받아 재생 프레임마다 다시 그리지 않습니다(memo). */
export const TideSelector = memo(function TideSelector({ s, send, busy }: PanelProps) {
    // v27.55 슬라이더는 움직이는 동안 화면에만 보이고, 손을 떼면 한 번만 보냅니다(요청 몰림 방지).
    const [draft, setDraft] = useState<number | null>(null);
    // v25.9 환생 전에는 올릴 차수가 없으므로 카드 자체를 숨깁니다.
    if (!tideLimit(s)) return null;
    const max = tideLimit(s), cur = s.tide || 0, shown = draft ?? cur, locked = busy || !!s.dungeon;
    const go = (n: number) => { const t = Math.max(0, Math.min(max, Math.round(n))); setDraft(null); if (t !== cur) send({ type: 'tide', id: String(t) }); };
    return <section className="panel tide-selector" title="환생 횟수만큼 올릴 수 있는 일반 사냥터 난이도입니다. 올릴수록 몬스터가 강해지고 레벨이 내 레벨 근처까지 오르며, 골드·장비 등급·정수·까미·누리가 늘어납니다. 경험치는 조금만 늘고 처치 후 회복은 줄어듭니다. 수식은 도움말 ‘사냥터 난이도’에 있습니다.">
    <div>
    <h3>사냥터 난이도 {shown}</h3>
    <p>{(() => { const st = STAGES.find(x => x.id === s.stage), lv = (st?.fish || []).map(id => FISH.find(f => f.id === id)?.level || 1), base = Math.min(...lv, 999), top = Math.max(...lv, 1), lo = tideLiftLevel(base, shown, s.level), hi = tideLiftLevel(top, shown, s.level); return st ? `몬스터 Lv.${lo}~${hi} · ` : ''; })()}체력 ×{tierHealth(shown).toFixed(1)} · 공격 ×{tierAttack(shown).toFixed(1)} · 처치 후 회복 {percent(victoryHealRate({ ...s, tide: shown, dungeon: null }), 0)}</p>
    <p>골드 ×{tierReward(shown).toFixed(1)} · 경험치 ×{tierExp(shown).toFixed(2)} · 장비 Lv.+{shown * 5} · 전설 이상 {percent(rarityShareFrom(shown, 3), 0)}{(() => { const te = tideEssence(shown); return te.chance > 0 ? ` · 정수 ${percent(te.chance, 1)}(+${te.amount})` : ` · 정수는 난이도 ${BALANCE.tideLoot.essenceMinTier}부터`; })()}{shown >= MIMIC.minTier ? ' · 까미' : ''}{shown >= EXP_NURI.minTier ? ' · 누리' : ''}</p>
    <small>{(() => { const best = s.tideBest?.[s.stage] || 0, next = nextTideMilestone(best); return `이 사냥터 최고 차수 ${best}${next ? ` · 다음 이정표 차수 ${next} 첫 처치 세계석 +${TIDE_MILESTONE_PEARLS[TIDE_MILESTONES.indexOf(next)]}` : ' · 이정표 모두 달성'}`; })()}</small>
    </div>
    <div className="tide-controls">
    <div className="button-row">
    <button className="secondary small" disabled={locked || !cur} onClick={() => go(0)}>최소</button>
    <button className="secondary" disabled={locked || !cur} onClick={() => go(cur - 1)}>−</button>
    <span>{shown} / {max}</span>
    <button className="secondary" disabled={locked || cur >= max} onClick={() => go(cur + 1)}>+</button>
    <button className="secondary small" disabled={locked || cur >= max} onClick={() => go(max)}>최대</button>
    </div>
    {max > 1 && <input type="range" className="tide-slider" min={0} max={max} step={1} value={shown} disabled={locked} aria-label="사냥터 난이도"
        onChange={e => setDraft(Number(e.target.value))}
        onPointerUp={e => go(Number((e.target as HTMLInputElement).value))}
        onKeyUp={e => go(Number((e.target as HTMLInputElement).value))}
        onBlur={() => { if (draft !== null) go(draft); }}/>}
    </div>
    </section>;
});
