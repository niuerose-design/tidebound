import type { StatusEffects } from '@/game/types';
import type { CombatFx } from '@/game/systems/combat-feedback';
import { visibleStatuses } from '@/game/systems/combat-status';

export function StatusBadges({ effects, stun = 0, recent = [], target = 'player' }: { effects?: StatusEffects; stun?: number; recent?: CombatFx[]; target?: 'player' | 'enemy' }) {
    const rows = visibleStatuses(effects, stun, recent, target);
    if (!rows.length) return null;
    return <span className="name-statuses" aria-label="현재 상태이상">{rows.map(row => <span className={`combat-status ${row.id}`} key={row.id} title={row.turns ? `${row.label} · ${row.turns}회 행동까지` : `${row.label} · 이번 턴 발생`}>
        {row.label}{row.turns > 0 && <small> {row.turns}</small>}
    </span>)}</span>;
}
