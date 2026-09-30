'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Log } from '@/game/types';
import { combatFxBatch, combatFxSkipped, type CombatFx } from '@/game/systems/combat-feedback';

/** 연출을 띄워 두는 시간(마지막 타격 뒤). */
const FX_HOLD_MS = 1500;
/**
 * 새 전투 로그의 연출. 재생 버퍼가 타격마다 로그를 한 줄씩 드러내므로 박자마다 이어 붙이고, 각 묶음은 제 시간이 지나면 지웁니다.
 * 한꺼번에 많이 들어오면(밀린 턴 건너뛰기) 최근 6개만 보여 주고 잘린 타격 수를 skipped로 알립니다.
 * 연속 행동이 있으면 skipped는 그 묶음에서 가장 긴 연속 번호입니다(‘×N 연속’).
 */
export function useCombatFx(logs: Log[], playerName: string) {
    const lastId = useRef<number | null>(null), timers = useRef(new Set<number>());
    const [effects, setEffects] = useState<CombatFx[]>([]), [skipped, setSkipped] = useState(0);
    const latest = logs.at(-1)?.id ?? 0;
    useEffect(() => {
        if (lastId.current === null || latest < lastId.current) {
            lastId.current = latest;
            setEffects([]);
            setSkipped(0);
            return;
        }
        if (latest === lastId.current) return;
        const batch = combatFxBatch(logs, lastId.current, playerName), cut = combatFxSkipped(logs, lastId.current, playerName);
        const chain = Math.max(0, ...batch.map(fx => fx.chain || 0)), combo = chain > 1 ? chain : cut;
        lastId.current = latest;
        if (!batch.length) return;
        const ids = new Set(batch.map(fx => fx.id));
        setEffects(prev => cut ? batch : [...prev.filter(fx => !ids.has(fx.id)), ...batch].slice(-6));
        if (combo) setSkipped(combo);
        const timer = window.setTimeout(() => {
            timers.current.delete(timer);
            setEffects(prev => prev.filter(fx => !ids.has(fx.id)));
            if (combo) setSkipped(v => v === combo ? 0 : v);
        }, batch.at(-1)!.delay + FX_HOLD_MS);
        timers.current.add(timer);
    }, [latest, logs, playerName]);
    useEffect(() => { const pending = timers.current; return () => pending.forEach(clearTimeout); }, []);
    return { effects, skipped };
}

function fxStyle(delay: number, extra: Record<string, string | number> = {}): CSSProperties {
    return { '--fx-delay': `${delay}ms`, ...extra } as CSSProperties;
}
const glyphs = { harpoon: ['✦', '·', '╱', '·', '✧', '╲'], wave: ['≈', '·', '∿', '·', '≈', '∿'], arcane: ['✧', '·', '◇', '·', '✦', '◇'], lightning: ['ϟ', '·', 'ϟ', '·', 'ϟ', '✦'], impact: ['✦', '·', '╱', '·', '╲', '✧'] };

/** Target-centred bursts; basic attacks deliberately have no scene effect. */
export function CombatFxOverlay({ effect, skipped = 0 }: { effect: CombatFx[]; skipped?: number }) {
    return <div className="tide-fx-layer" aria-hidden="true">{skipped > 0 && <div key={`combo-${effect[0]?.id}`} className="tide-fx-combo"><strong>×{skipped.toLocaleString()}</strong> 연속</div>}{effect.filter(fx => !fx.basic && fx.status !== '행동 불가').map(fx => fx.actor === 'enemy' ? <div key={fx.id} className={`monster-skill-cue monster-skill-${fx.kind}`} style={fxStyle(fx.delay)}><small>몬스터 스킬</small><strong>{fx.title}</strong></div> : <div key={fx.id} className={`tide-fx tide-fx-${fx.kind} tide-fx-${fx.variant} tide-fx-target-${fx.target} ${fx.critical ? 'critical' : ''}`} style={fxStyle(fx.delay)}>
        <i className="tide-fx-trail"/><i className="tide-fx-ring"/>
        {fx.kind !== 'miss' && glyphs[fx.variant].map((glyph, i) => <i key={i} className="tide-fx-fragment" style={fxStyle(fx.delay, { '--fx-x': `${Math.cos(i * Math.PI / 3) * 66}px`, '--fx-y': `${Math.sin(i * Math.PI / 3) * 39}px`, '--fx-rotate': `${i * 41}deg` })}>{glyph}</i>)}
        <div className="tide-fx-caption"><strong>{fx.title}</strong></div>
    </div>)}</div>;
}

const DAMAGE_ICON = { physical: '⚔', magic: '✦', split: '⚔✦' } as const;
/** HP 바 위 숫자: 실제로 깎인 값만 한 번씩. 물리·마법·복합은 색과 아이콘, 치명·빗나감·흡혈·지속 피해는 실제 결과로 표시합니다. */
export function CombatBarEffect({ effect, target }: { effect: CombatFx[]; target: 'player' | 'enemy' }) {
    return <span className="bar-fx-layer" aria-hidden="true">{effect.flatMap(fx => {
        const hit = fx.target === target && fx.hits.length > 0;
        const self = fx.actor === target;
        return [
            self && fx.dot && <span key={`${fx.id}-dot`} className="bar-fx bar-fx-bleed" style={fxStyle(fx.delay)}><b>{fx.dot.name} −{fx.dot.value.toLocaleString()}</b></span>,
            hit && <span key={`${fx.id}-hit`} className={`bar-fx bar-fx-${fx.kind} dmg-${fx.damageType} ${fx.basic ? 'basic' : ''}`} style={fxStyle(fx.delay)}>{fx.hits.map((part, i) => <b key={i} className={`${part.critical ? 'critical' : ''} ${part.miss ? 'miss' : ''}`} style={fxStyle(fx.delay + i * 160)}>{part.miss ? (i ? '추가타 빗나감' : '빗나감') : `${DAMAGE_ICON[fx.damageType]} −${part.value.toLocaleString()}${part.critical ? ' 치명' : ''}`}</b>)}</span>,
            self && fx.healing > 0 && <span key={`${fx.id}-heal`} className="bar-fx bar-fx-heal" style={fxStyle(fx.delay + 150)}><b>+{fx.healing.toLocaleString()} 회복</b></span>,
            self && fx.drained > 0 && <span key={`${fx.id}-drain`} className="bar-fx bar-fx-heal drain" style={fxStyle(fx.delay + 300)}><b>+{fx.drained.toLocaleString()} 흡혈</b></span>,
        ];
    })}</span>;
}

export function PlayerHitEffect({ effect }: { effect: CombatFx[] }) {
    return <CombatBarEffect effect={effect} target="player"/>;
}
