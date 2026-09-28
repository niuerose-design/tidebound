'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Log } from '@/game/types';
import { combatFxBatch, type CombatFx } from '@/game/systems/combat-feedback';

export function useCombatFx(logs: Log[], playerName: string) {
    const lastId = useRef<number | null>(null);
    const [effects, setEffects] = useState<CombatFx[]>([]);
    const latest = logs.at(-1)?.id ?? 0;
    useEffect(() => {
        if (lastId.current === null || latest < lastId.current) {
            lastId.current = latest;
            setEffects([]);
            return;
        }
        if (latest === lastId.current) return;
        const batch = combatFxBatch(logs, lastId.current, playerName);
        lastId.current = latest;
        setEffects(batch);
        if (!batch.length) return;
        const timer = window.setTimeout(() => setEffects([]), batch.at(-1)!.delay + 1500);
        return () => window.clearTimeout(timer);
    }, [latest, playerName]);
    return effects;
}

function fxStyle(delay: number, extra: Record<string, string | number> = {}): CSSProperties {
    return { '--fx-delay': `${delay}ms`, ...extra } as CSSProperties;
}
const glyphs = { harpoon: ['✦', '·', '╱', '·', '✧', '╲'], wave: ['≈', '·', '∿', '·', '≈', '∿'], arcane: ['✧', '·', '◇', '·', '✦', '◇'], lightning: ['ϟ', '·', 'ϟ', '·', 'ϟ', '✦'], impact: ['✦', '·', '╱', '·', '╲', '✧'] };

/** Target-centred bursts; basic attacks deliberately have no scene effect. */
export function CombatFxOverlay({ effect }: { effect: CombatFx[] }) {
    return <div className="tide-fx-layer" aria-hidden="true">{effect.filter(fx => !fx.basic && fx.status !== '행동 불가').map(fx => fx.actor === 'enemy' ? <div key={fx.id} className={`monster-skill-cue monster-skill-${fx.kind}`} style={fxStyle(fx.delay)}><small>몬스터 스킬</small><strong>{fx.title}</strong></div> : <div key={fx.id} className={`tide-fx tide-fx-${fx.kind} tide-fx-${fx.variant} tide-fx-target-${fx.target} ${fx.critical ? 'critical' : ''}`} style={fxStyle(fx.delay)}>
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
