import type { StatusEffects } from '../types';
import type { CombatFx } from './combat-feedback';

export const STATUS_LABELS = { stun: '기절함', silence: '침묵', bleed: '출혈', poison: '중독', weaken: '공격 약화', slow: '감속', haste: '가속' } as const;
export function visibleStatuses(effects: StatusEffects = {}, stun = 0, recent: CombatFx[] = [], target: 'player' | 'enemy' = 'player') {
    const values = { stun, silence: effects.silence || 0, bleed: effects.dot?.turns || 0, poison: effects.poison?.turns || 0, weaken: effects.weaken || 0, slow: effects.slow || 0, haste: effects.haste || 0 };
    const dotLabel = effects.dot ? effects.dot.name : STATUS_LABELS.bleed;
    const poisonLabel = effects.poison ? `중독 ×${effects.poison.stacks}` : STATUS_LABELS.poison;
    const rows = Object.entries(values).filter(([, turns]) => turns > 0).map(([id, turns]) => ({ id, label: id === 'bleed' ? dotLabel : id === 'poison' ? poisonLabel : STATUS_LABELS[id as keyof typeof STATUS_LABELS], turns, recent: false }));
    // A one-action stun may be consumed inside the same server round. Keep its
    // witnessed event beside the name briefly instead of losing the indication.
    for (const fx of recent) {
        const affected = fx.kind === 'haste' ? fx.actor : fx.target;
        if (affected !== target || !fx.status || !(fx.kind in STATUS_LABELS) || rows.some(row => row.id === fx.kind)) continue;
        rows.push({ id: fx.kind, label: STATUS_LABELS[fx.kind as keyof typeof STATUS_LABELS], turns: 0, recent: true });
    }
    return rows;
}
