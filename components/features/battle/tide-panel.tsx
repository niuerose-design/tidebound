'use client';
/**
 * v3.390 사냥터 난이도 · 집중 사냥 카드(새 토대, 옛 tide-selector + TargetStrip). 동기화 상태만 받아 재생 프레임마다 다시 그리지 않습니다(memo).
 * 슬라이더는 움직이는 동안 화면에만 보이고, 손을 떼면 한 번만 보냅니다(요청 몰림 방지). 환생 전(난이도 없음)에는 집중 사냥만 한 줄.
 */
import { memo, useState } from 'react';
import { Target } from 'lucide-react';
import type { State, Action } from '@/game/types';
import { tideLimit, tideChallengeBonus, TIDE_CHALLENGE, tierReward, tierExp, tierHealth, tierAttack, encounterTier } from '@/game/systems/meta';
import { stageById, monsterById } from '@/game/data/world';
import { ChoiceChips } from '@/components/ui/game';
import { Button } from '@/components/ui/button';

export const TidePanel = memo(function TidePanel({ s, send, busy }: { s: State; send: (a: Action) => void; busy: boolean }) {
    const [draft, setDraft] = useState<number | null>(null);
    const max = tideLimit(s), cur = s.tide || 0, shown = draft ?? cur, locked = busy || !!s.dungeon, bonus = tideChallengeBonus(s);
    const go = (n: number) => { const t = Math.max(0, Math.min(max, Math.round(n))); setDraft(null); if (t !== cur) send({ type: 'tide', id: String(t) }); };
    const st = stageById(s.stage)!, tier = encounterTier(s);
    const targets = <ChoiceChips label="집중 사냥" value={s.target || 'all'} onChange={id => send({ type: 'target', id })} disabled={busy || !!s.dungeon}
        options={[{ value: 'all', label: '무작위' }, ...st.monsters.map(id => { const f = monsterById(id), need = f?.minTier || 0, lock = need > tier; return { value: id, label: lock ? `${f?.name} · 난이도 ${need}+` : f?.name || id, disabled: lock, title: lock ? `사냥터 난이도 ${need}부터 나타나는 몬스터입니다. 지금 난이도 ${tier}.` : undefined }; })]}/>;
    const focus = <div className="flex flex-wrap items-center gap-2"><span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-2"><Target size={14} className="text-[var(--stage-tone,var(--accent))]"/>집중 사냥</span>{targets}</div>;
    if (!max) return <section className="rounded-l border border-line bg-surface-2 p-3 shadow-1" aria-label="집중 사냥">{focus}</section>;
    return <section className="grid gap-3 rounded-l border border-line bg-surface-2 p-3 shadow-1 sm:p-4" aria-label="사냥터 난이도">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0" title={`환생 횟수 + 도전 보너스(나이트메어 단계 최대 +${TIDE_CHALLENGE.nightmareMax} · 무릉도장 층 최대 +${TIDE_CHALLENGE.abyssMax})만큼 올릴 수 있는 일반 사냥터 난이도입니다.${bonus.total ? ` 지금 상한 ${max} = 환생 ${s.rebirths} + 나이트메어 ${bonus.nightmare} + 무릉 ${bonus.abyss}.` : ''} 올릴수록 몬스터가 강해지고 보상이 늘어납니다.`}>
                <h3 className="font-display text-s font-bold text-ink-1">사냥터 난이도 <span className="font-num text-accent">{shown}</span></h3>
                <p className="mt-0.5 text-xs text-ink-3">골드 ×{tierReward(shown).toFixed(1)} · 경험치 ×{tierExp(shown).toFixed(2)} · 몬스터 체력 ×{tierHealth(shown).toFixed(1)} · 공격 ×{tierAttack(shown).toFixed(1)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="난이도 조절">
                <Button type="button" variant="outline" size="sm" disabled={locked || !cur} onClick={() => go(0)}>최소</Button>
                <Button type="button" variant="outline" size="sm" className="min-w-9" aria-label="난이도 내리기" disabled={locked || !cur} onClick={() => go(cur - 1)}>−</Button>
                <span className="min-w-14 text-center font-num text-s text-ink-1" title={bonus.total ? `환생 ${s.rebirths} + 도전 보너스 ${bonus.total}` : undefined}>{shown} / {max}{bonus.total ? <small className="text-xs text-ink-3"> (+{bonus.total})</small> : null}</span>
                <Button type="button" variant="outline" size="sm" className="min-w-9" aria-label="난이도 올리기" disabled={locked || cur >= max} onClick={() => go(cur + 1)}>+</Button>
                <Button type="button" variant="outline" size="sm" disabled={locked || cur >= max} onClick={() => go(max)}>최대</Button>
            </div>
        </div>
        {max > 1 && <input type="range" className="w-full accent-[var(--accent)]" min={0} max={max} step={1} value={shown} disabled={locked} aria-label="사냥터 난이도"
            onChange={e => setDraft(Number(e.target.value))} onPointerUp={e => go(Number((e.target as HTMLInputElement).value))} onKeyUp={e => go(Number((e.target as HTMLInputElement).value))} onBlur={() => { if (draft !== null) go(draft); }}/>}
        <div className="border-t border-line pt-3">{focus}</div>
    </section>;
});
