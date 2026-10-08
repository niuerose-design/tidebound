/** 던전 입장과 반복 도전. */
import type { State } from '../types';
import { levelGateOk } from './meta';
import { BALANCE, MONSTER_TUNING, DUNGEON_MODES, type DungeonMode } from '../data/balance';
import { dungeonClosed, dungeonById } from '../data/world';
import { addLog, endRun } from './state';
/** 반복 설정 문자열: 'once' | 'fail' | 숫자(총 도전 횟수) | 'deeper:N'(무릉도장, 현재 최고 깊이 + N층까지). */
export function parseRepeat(s: State, id: string, value?: string): { left: number | null; until?: number } | undefined {
    if (!value || value === 'once' || value === '1') return undefined;
    if (value === 'fail') return { left: null };
    if (id === 'abyss' && value.startsWith('deeper:')) {
        const more = Math.floor(Number(value.slice(7)));
        if (!Number.isFinite(more) || more < 1 || more > 999) throw Error('목표 층을 확인하세요.');
        return more > 1 ? { left: null, until: s.abyssBest + more } : undefined;
    }
    const total = Math.floor(Number(value));
    if (!Number.isFinite(total) || total < 1 || total > 999) throw Error('반복 횟수는 1~999회입니다.');
    return total > 1 ? { left: total - 1 } : undefined;
}
/** v27.70 입장 값 '<난이도>@<반복>' 또는 '<반복>'. 난이도는 DUNGEON_MODES id(없으면 노말), 반복은 parseRepeat 규칙. */
export function parseDungeonValue(s: State, id: string, value?: string): { mode: DungeonMode; repeat?: { left: number | null; until?: number } } {
    const [head, tail] = value && value.includes('@') ? value.split('@', 2) : ['', value];
    const mode = (head || 'normal') as DungeonMode;
    if (!DUNGEON_MODES.some(m => m.id === mode)) throw Error('던전 난이도를 확인하세요.');
    return { mode: id === 'abyss' ? 'normal' : mode, repeat: parseRepeat(s, id, tail) };
}
export function enterDungeon(s: State, id: string, repeat?: { left: number | null; until?: number }, mode: DungeonMode = 'normal') {
    const d = dungeonById(id)!;
    s.dungeon = { id, wave: 0, ...(id === 'abyss' ? { depth: s.abyssBest + 1 } : {}), ...(repeat ? { repeat } : {}), ...(mode !== 'normal' && id !== 'abyss' ? { mode } : {}) };
    s.enemy = null;
    // Preparation takes real turns: repeated entry cannot heal instantly.
    s.effects = {};
    s.playerStun = 0;
    s.cooldowns = {};
    s.recovery = Math.max(s.recovery, MONSTER_TUNING.dungeonPreparationTurns);
    addLog(s, `${d.name} 입장 준비${repeatLabel(repeat)} · ${MONSTER_TUNING.dungeonPreparationTurns * BALANCE.turnMs / 1000}초 후 체력·마나를 회복하고 출발합니다.`);
}
function repeatLabel(r?: { left: number | null; until?: number }) {
    if (!r) return '';
    if (r.until) return ` (반복 · ${r.until}층까지)`;
    return r.left === null ? ' (반복 · 실패할 때까지)' : r.left === 0 ? ' (반복 · 마지막 도전)' : ` (반복 · 이후 ${r.left}회 더)`;
}
/** 반복 도전이 끝나면 사냥터로 돌아가 자동 사냥을 이어갑니다. */
export function continueRepeat(s: State, id: string, repeat: { left: number | null; until?: number }) {
    const d = dungeonById(id)!, mode = s.dungeon?.mode;
    const reached = repeat.until !== undefined && s.abyssBest >= repeat.until;
    const allowed = levelGateOk(s, d.level) && s.rebirths >= d.rebirth && !dungeonClosed(d.id);
    if (!reached && allowed && (repeat.left === null || repeat.left > 0)) {
        enterDungeon(s, id, { left: repeat.left === null ? null : repeat.left - 1, ...(repeat.until !== undefined ? { until: repeat.until } : {}) }, mode);
        s.running = true;
        return;
    }
    s.running = true;
    endRun(s, `${d.name} 반복 종료 · ${reached ? `목표 ${repeat.until}층 도달` : !allowed ? '입장 조건 미달' : '설정한 횟수 완료'} → 자동 사냥으로 전환`);
    addLog(s, `${d.name} 반복 도전 종료${reached ? ` · 목표 ${repeat.until}층 도달` : ''} · 사냥터에서 자동 사냥을 이어갑니다.`);
}
