'use client';
import type { Unit, BattleUnit } from '@/game/srpg/engine/types';
import { STATS, STAT_NAMES } from '@/game/srpg/engine/types';
import { classDef } from '@/game/srpg/data/classes';
import { itemDef } from '@/game/srpg/data/items';
import { UNIT_MAP } from '@/game/srpg/data/units';
import { canWield, EXP_PER_LEVEL } from '@/game/srpg/engine/unit';
/** 유닛 능력치 표(베이스 · 전투 공통). */
export function StatGrid({ u, compact }: { u: Unit | BattleUnit; compact?: boolean }) {
    const cls = classDef(u.classId);
    return <div className={`tx-stats ${compact ? 'compact' : ''}`}>{STATS.map(k => <div key={k} title={`${STAT_NAMES[k]} (상한 ${cls.caps[k]}, 성장 ${u.growths[k]}%)`}><span>{STAT_NAMES[k]}</span><strong className={u.stats[k] >= cls.caps[k] ? 'capped' : ''}>{u.stats[k]}</strong></div>)}</div>;
}
export function UnitHeader({ u, hp }: { u: Unit | BattleUnit; hp?: number }) {
    const cls = classDef(u.classId), def = u.defId ? UNIT_MAP[u.defId] : null;
    const cur = hp ?? ('hp' in u ? (u as BattleUnit).hp : u.stats.hp);
    return <div className="tx-unit-head">
        <span className={`tx-token side-${u.side} ${u.boss ? 'boss' : ''}`}>{cls.glyph}</span>
        <div>
            <strong>{u.name}</strong> <small>{cls.name} Lv.{u.level}{u.side === 'player' && <> · 경험 {u.exp}/{EXP_PER_LEVEL}</>}</small>
            <div className="tx-hpbar" role="img" aria-label={`체력 ${cur} / ${u.stats.hp}`}><i style={{ ['--hp' as string]: `${Math.round(cur / u.stats.hp * 100)}%` }}/><span>체력 {cur}/{u.stats.hp}</span></div>
            {def && <small className="tx-flavor">{def.flavor}</small>}
        </div>
    </div>;
}
export function ItemList({ u, onPick, picked, action }: { u: Unit | BattleUnit; onPick?: (index: number) => void; picked?: number | null; action?: (index: number) => React.ReactNode }) {
    const cls = classDef(u.classId);
    return <ul className="tx-items">{u.items.map((it, i) => { const d = itemDef(it.id); const wield = canWield(cls, d); return <li key={it.n} className={`${u.equipped === i ? 'equipped' : ''} ${picked === i ? 'picked' : ''} ${d.weapon && !wield ? 'cannot' : ''}`} onClick={onPick ? () => onPick(i) : undefined} role={onPick ? 'button' : undefined}>
        <span className="tx-item-name">{d.weapon ? <b className={`wt wt-${d.weapon.type}`}/> : <b className="wt wt-item"/>}{d.name}</span>
        <small>{it.uses}/{d.uses}{d.weapon && <> · 위력 {d.weapon.might} 명중 {d.weapon.hit} 필살 {d.weapon.crit} 사거리 {d.weapon.range[0]}{d.weapon.range[1] !== d.weapon.range[0] ? `~${d.weapon.range[1]}` : ''}</>}</small>
        {u.equipped === i && <em>장착</em>}
        {action?.(i)}
    </li>; })}{u.items.length === 0 && <li className="empty">소지품 없음</li>}</ul>;
}
