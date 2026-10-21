'use client';
import type { ChapterDef } from '@/game/srpg/engine/types';
import { TERRAIN } from '@/game/srpg/engine/terrain';
/** 작은 맵 미리보기(베이스 · 출격 준비). */
export function MapPreview({ chapter, size = 12 }: { chapter: ChapterDef; size?: number }) {
    const { tiles, width, height } = chapter.map;
    const spawns = new Set(chapter.player_spawns.map(p => p.join(',')));
    return <div className="tx-preview" style={{ gridTemplateColumns: `repeat(${width}, ${size}px)`, gridAutoRows: `${size}px` }} aria-label="맵 미리보기">
        {tiles.flatMap((row, y) => [...row].map((ch, x) => <i key={`${x},${y}`} className={`t-${TILE_CLASS[ch] ?? 'plain'} ${spawns.has(`${x},${y}`) ? 'spawn' : ''} ${chapter.objective.target_pos && chapter.objective.target_pos[0] === x && chapter.objective.target_pos[1] === y ? 'goal' : ''}`}/>))}
        <span style={{ display: 'none' }}>{height}</span>
    </div>;
}
export const TILE_CLASS: Record<string, string> = { '.': 'plain', F: 'forest', M: 'mountain', '^': 'peak', '~': 'water', '=': 'bridge', '#': 'wall', D: 'door', T: 'throne', S: 'fort', H: 'village', R: 'ruin', C: 'chest', X: 'burnt' };
export function TerrainLegend() {
    return <details className="tx-legend"><summary>지형 범례</summary><ul>{Object.values(TERRAIN).filter(t => t.ch !== 'X').map(t => <li key={t.ch}><i className={`t-${TILE_CLASS[t.ch]}`}/><strong>{t.name}</strong><small>{t.desc}</small></li>)}</ul></details>;
}
