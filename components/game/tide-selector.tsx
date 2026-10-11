'use client';
import { memo, useState, type ReactNode } from 'react';
import { tideLimit, tierReward, tierExp, tierHealth, tierAttack } from '@/game/systems/meta';
import type { PanelProps } from './panel-props';
import { rarityShareFrom, tideEssence, victoryHealRate } from '@/game/systems/encounter';
import { BALANCE } from '@/game/data/balance';
import { percent } from '@/game/data/progression';
import { catalogNow } from '@/game/data/catalog';
/** v27.62 전투 화면에서는 동기화 상태만 받아 재생 프레임마다 다시 그리지 않습니다(memo). */
/** v3.218 extra: 카드 아래에 붙는 한 줄(전투 화면의 집중 사냥). */
export const TideSelector = memo(function TideSelector({ s, send, busy, extra }: PanelProps & { extra?: ReactNode }) {
    // v27.55 슬라이더는 움직이는 동안 화면에만 보이고, 손을 떼면 한 번만 보냅니다(요청 몰림 방지).
    const [draft, setDraft] = useState<number | null>(null);
    // v25.9 환생 전에는 올릴 차수가 없으므로 카드 자체를 숨깁니다.
    if (!tideLimit(s)) return null;
    // v3.49 정보 비공개가 켜져 있으면 전설 이상 비율·정수 확률은 툴팁에서 뺍니다.
    const max = tideLimit(s), cur = s.tide || 0, shown = draft ?? cur, locked = busy || !!s.dungeon, secret = catalogNow().secret;
    const go = (n: number) => { const t = Math.max(0, Math.min(max, Math.round(n))); setDraft(null); if (t !== cur) send({ type: 'tide', id: String(t) }); };
    return <section className="panel tide-selector">
    {/* v3.218 툴팁은 난이도 설명 칸에만(같은 카드의 집중 사냥 탭에는 뜨지 않게). */}
    <div title={`환생 횟수만큼 올릴 수 있는 일반 사냥터 난이도입니다. 올릴수록 몬스터가 강해지고 레벨이 내 레벨 근처까지 오르며, 골드·장비 등급·정수·까미·누리가 늘어납니다. 지금 난이도 ${shown}: 장비 Lv.+${shown * 5} · ${secret ? '' : `전설 이상 ${percent(rarityShareFrom(shown, 3), 0)} · ${tideEssence(shown).chance > 0 ? `정수 ${percent(tideEssence(shown).chance, 1)}(+${tideEssence(shown).amount})` : `정수는 난이도 ${BALANCE.tideLoot.essenceMinTier}부터`} · `}처치 후 회복 ${percent(victoryHealRate({ ...s, tide: shown, dungeon: null }), 0)}. 수식은 도움말 ‘사냥터 난이도’에 있습니다.`}>
    <h3>사냥터 난이도 {shown}</h3>
    {/* v27.86 메인에는 골드·체력·공격·경험치 배율만. 장비 레벨·전설 확률·정수·까미·누리·몬스터 레벨은 카드 툴팁과 도움말에 둡니다. */}
    <p>골드 ×{tierReward(shown).toFixed(1)} · 경험치 ×{tierExp(shown).toFixed(2)} · 몬스터 체력 ×{tierHealth(shown).toFixed(1)} · 공격 ×{tierAttack(shown).toFixed(1)}</p>
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
    {extra && <div className="tide-extra">{extra}</div>}
    </section>;
});
