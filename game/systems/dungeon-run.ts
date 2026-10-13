/** 던전 입장과 반복 도전. */
import type { State } from '../types';
import { levelGateOk } from './meta';
import { BALANCE, MONSTER_TUNING, DUNGEON_MODES, DUNGEON_STAGE, type DungeonMode } from '../data/balance';
type Repeat = { left: number | null; until?: number; climb?: boolean };
import { dungeonClosed, dungeonById } from '../data/world';
import { addLog, endRun } from './state';
/** 반복 설정 문자열: 'once' | 'fail' | 숫자(총 도전 횟수) | 'deeper:N'(무릉도장, 현재 최고 깊이 + N층까지) | 'climb'(v3.310 나이트메어 단계 오르기, 실패까지). */
function parseRepeat(s: State, id: string, value?: string): Repeat | undefined {
    if (!value || value === 'once' || value === '1') return undefined;
    if (value === 'fail') return { left: null };
    if (value === 'climb') return { left: null, climb: true };
    if (id === 'abyss' && value.startsWith('deeper:')) {
        const more = Math.floor(Number(value.slice(7)));
        if (!Number.isFinite(more) || more < 1 || more > 999) throw Error('목표 층을 확인하세요.');
        return more > 1 ? { left: null, until: s.abyssBest + more } : undefined;
    }
    const total = Math.floor(Number(value));
    if (!Number.isFinite(total) || total < 1 || total > 999) throw Error('반복 횟수는 1~999회입니다.');
    return total > 1 ? { left: total - 1 } : undefined;
}
/** v3.310 지금 들어갈 수 있는 나이트메어 최고 단계: 최고 정복 단계 + 1(최대 DUNGEON_STAGE.max). */
export const nightmareStageCap = (s: Pick<State, 'nightmareBest'>, id: string) => Math.min(DUNGEON_STAGE.max, (s.nightmareBest?.[id] || 0) + 1);
/** v27.70 입장 값 '<난이도>@<반복>' 또는 '<반복>'. 난이도는 DUNGEON_MODES id(없으면 노말), 반복은 parseRepeat 규칙. v3.310 '<난이도>:<단계>'로 나이트메어 단계(1~max, (k−1)단계를 정복해야 k단계). */
export function parseDungeonValue(s: State, id: string, value?: string): { mode: DungeonMode; stage: number; repeat?: Repeat } {
    const [head, tail] = value && value.includes('@') ? value.split('@', 2) : ['', value];
    const [modeText, stageText] = (head || 'normal').split(':', 2);
    const mode = modeText as DungeonMode;
    if (!DUNGEON_MODES.some(m => m.id === mode)) throw Error('던전 난이도를 확인하세요.');
    const stage = stageText === undefined || stageText === '' ? 1 : Math.floor(Number(stageText));
    if (!Number.isFinite(stage) || stage < 1 || stage > DUNGEON_STAGE.max || (stage > 1 && (mode !== 'nightmare' || id === 'abyss'))) throw Error('던전 단계를 확인하세요.');
    if (stage > nightmareStageCap(s, id)) throw Error(`나이트메어 ${stage - 1}단계를 먼저 정복해야 합니다.`);
    const repeat = parseRepeat(s, id, tail);
    if (repeat?.climb && (mode !== 'nightmare' || id === 'abyss')) throw Error('단계 오르기는 나이트메어에서만 됩니다.');
    return { mode: id === 'abyss' ? 'normal' : mode, stage, repeat };
}
export function enterDungeon(s: State, id: string, repeat?: Repeat, mode: DungeonMode = 'normal', stage = 1) {
    const d = dungeonById(id)!;
    s.dungeon = { id, wave: 0, ...(id === 'abyss' ? { depth: s.abyssBest + 1 } : {}), ...(repeat ? { repeat } : {}), ...(mode !== 'normal' && id !== 'abyss' ? { mode } : {}), ...(mode === 'nightmare' && id !== 'abyss' && stage > 1 ? { stage } : {}) };
    s.enemy = null;
    // Preparation takes real turns: repeated entry cannot heal instantly.
    s.effects = {};
    s.playerStun = 0;
    s.cooldowns = {};
    s.recovery = Math.max(s.recovery, MONSTER_TUNING.dungeonPreparationTurns);
    addLog(s, `${d.name}${mode === 'nightmare' && stage > 1 ? ` 나이트메어 ${stage}단계` : ''} 입장 준비${repeatLabel(repeat)} · ${MONSTER_TUNING.dungeonPreparationTurns * BALANCE.turnMs / 1000}초 후 체력·마나를 회복하고 출발합니다.`);
}
function repeatLabel(r?: Repeat) {
    if (!r) return '';
    if (r.until) return ` (반복 · ${r.until}층까지)`;
    if (r.climb) return ' (반복 · 단계 오르기)';
    return r.left === null ? ' (반복 · 실패할 때까지)' : r.left === 0 ? ' (반복 · 마지막 도전)' : ` (반복 · 이후 ${r.left}회 더)`;
}
/** 반복 도전이 끝나면 사냥터로 돌아가 자동 사냥을 이어갑니다. */
/** 정복한 뒤 다음 도전을 잇습니다. v3.310 mode · stage는 방금 정복한 던전의 것(s.dungeon은 이미 비움), climb이면 다음 단계로. */
export function continueRepeat(s: State, id: string, repeat: Repeat, mode: DungeonMode | undefined = s.dungeon?.mode, stage: number = s.dungeon?.stage || 1) {
    const d = dungeonById(id)!;
    const reached = (repeat.until !== undefined && s.abyssBest >= repeat.until) || (!!repeat.climb && stage >= DUNGEON_STAGE.max);
    const allowed = levelGateOk(s, d.level) && s.rebirths >= d.rebirth && !dungeonClosed(d.id);
    if (!reached && allowed && (repeat.left === null || repeat.left > 0)) {
        enterDungeon(s, id, { left: repeat.left === null ? null : repeat.left - 1, ...(repeat.until !== undefined ? { until: repeat.until } : {}), ...(repeat.climb ? { climb: true } : {}) }, mode, repeat.climb ? Math.min(nightmareStageCap(s, id), stage + 1) : stage);
        s.running = true;
        return;
    }
    s.running = true;
    const why = reached ? (repeat.climb ? `최고 ${DUNGEON_STAGE.max}단계 정복` : `목표 ${repeat.until}층 도달`) : !allowed ? '입장 조건 미달' : '설정한 횟수 완료';
    endRun(s, `${d.name} 반복 종료 · ${why} → 자동 사냥으로 전환`);
    addLog(s, `${d.name} 반복 도전 종료${reached ? ` · ${why}` : ''} · 사냥터에서 자동 사냥을 이어갑니다.`);
}
