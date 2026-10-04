'use client';
import { memo, useState } from 'react';
import { tideLimit, tierReward, tierHealth, tierAttack } from '@/game/systems/meta';
import { TIDE_MILESTONES, TIDE_MILESTONE_PEARLS, nextTideMilestone } from '@/game/data/long-term';
import type { PanelProps } from './panel-props';
import { STAGES, FISH, tideLiftLevel } from '@/game/data/world';
import { rarityShareFrom, tideEssence } from '@/game/systems/encounter';
import { percent } from '@/game/data/progression';
/** v27.62 전투 화면에서는 동기화 상태만 받아 재생 프레임마다 다시 그리지 않습니다(memo). */
export const TideSelector = memo(function TideSelector({ s, send, busy }: PanelProps) {
    // v27.55 슬라이더는 움직이는 동안 화면에만 보이고, 손을 떼면 한 번만 보냅니다(요청 몰림 방지).
    const [draft, setDraft] = useState<number | null>(null);
    // v25.9 환생 전에는 올릴 차수가 없으므로 카드 자체를 숨깁니다.
    if (!tideLimit(s)) return null;
    const max = tideLimit(s), cur = s.tide || 0, shown = draft ?? cur, locked = busy || !!s.dungeon;
    const go = (n: number) => { const t = Math.max(0, Math.min(max, Math.round(n))); setDraft(null); if (t !== cur) send({ type: 'tide', id: String(t) }); };
    return <section className="panel tide-selector" title="환생마다 1단계 해금(최대 200). 일반 사냥터에만 적용하며 선택은 자유입니다. 난이도가 오르면 낮은 사냥터 몬스터의 레벨도 올라가 난이도 10부터는 어느 사냥터든 비슷하게 단단합니다.">
    <div>
    <h3>사냥터 난이도 {shown}</h3>
    <p>{(() => { const st = STAGES.find(x => x.id === s.stage), lv = (st?.fish || []).map(id => FISH.find(f => f.id === id)?.level || 1), base = Math.min(...lv, 999), top = Math.max(...lv, 1), lo = tideLiftLevel(base, shown, s.level), hi = tideLiftLevel(top, shown, s.level); return st ? `몬스터 Lv.${lo}~${hi} · ` : ''; })()}적 HP ×{tierHealth(shown).toFixed(2)} · 공격 ×{tierAttack(shown).toFixed(2)} · 골드/EXP ×{tierReward(shown).toFixed(2)} · 장비 레벨 +{shown * 5}(캐릭터 레벨 +10까지) · 드롭 중 전설 이상 {percent(rarityShareFrom(shown, 3), 1)} · 태초 {percent(rarityShareFrom(shown, 6), 2)}{(() => { const te = tideEssence(shown); return te.chance > 0 ? ` · 처치당 정수 ${percent(te.chance, 1)} (+${te.amount})` : ' · 정수 드롭은 난이도 5부터'; })()}</p>
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
