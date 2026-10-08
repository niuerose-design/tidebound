import type { StatusEffects } from '@/game/types';
import type { CombatFx } from '@/game/systems/combat-feedback';
import { visibleStatuses } from '@/game/systems/combat-status';
import { STATUS_GUIDE } from '@/game/data/balance';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** 이름 옆 상태이상: 남은 턴을 숫자로 보여주고, 누르면 설명이 열립니다(터치 지원). */
export function StatusBadges({ effects, stun = 0, recent = [], target = 'player' }: { effects?: StatusEffects; stun?: number; recent?: CombatFx[]; target?: 'player' | 'enemy' }) {
    const rows = visibleStatuses(effects, stun, recent, target);
    if (!rows.length) return null;
    return <span className="name-statuses" aria-label="현재 상태이상">{rows.map(row => {
        const guide = STATUS_GUIDE.find(g => g.id === (row.id === 'stun' ? 'stun' : row.id));
        return <Popover key={row.id}>
            <PopoverTrigger asChild>
                <button type="button" className={`combat-status status-chip ${row.id}`} aria-label={`${row.label} ${row.detail ?? (row.turns ? `${row.turns}회 남음` : '이번 턴 발생')} · 설명 보기`}>
                    {row.label}{row.turns > 0 && <small> {row.turns}</small>}
                </button>
            </PopoverTrigger>
            <PopoverContent className="status-pop game-tooltip" side="bottom">
                <strong>{row.label} · {row.detail ?? (row.turns ? `${row.turns}회 행동 남음` : '이번 턴에 발생')}</strong>
                {guide ? <>{guide.description}<small>{guide.detail}</small></> : null}
            </PopoverContent>
        </Popover>;
    })}</span>;
}
