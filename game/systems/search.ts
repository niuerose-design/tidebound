import type { CombatStats, State } from '../types';
import { BALANCE } from '../data/balance';
import { skillById } from '../data/skills';

/**
 * v3.97 사냥터 탐색: 전투가 끝나면(처치 · 도주 · 칠흑 보스 퇴장) 다음 몬스터를 찾는 동안 전투 처리 없이 턴이 지나갑니다.
 * 기본 4초(2턴), 최저 2초. 줄이는 요소는 1초 단위: 세계석 연구 ‘추적술’ -1초, 탐색 패시브 -1초(여러 개 겹치지 않음).
 * 서버 턴이 2초라 나누고 남은 시간은 다음 탐색으로 넘깁니다(3초면 1턴 · 2턴이 번갈아 평균 1.5턴).
 * 탐색 동안은 쿨타임 · 각성기 대기 · 버프 · 상태이상 · 지속 피해가 흐르지 않고, 초마다 턴당 체력 · 마나 회복만큼 회복합니다.
 * 던전 · 무릉도장 · 랜덤게임(연속 전투), 사냥터에 처음 들어갈 때, 쓰러진 뒤(회복 대기)에는 탐색이 없습니다.
 */
export const SEARCH = { baseMs: 4000, minMs: 2000, researchMs: 1000 } as const;

/** 지금 사냥터에서 다음 몬스터를 찾는 시간(ms)과 줄어든 내역. */
export function searchTime(s: Pick<State, 'skills' | 'permanent'>) {
    const research = (s.permanent?.tracking || 0) * SEARCH.researchMs;
    // 탐색 패시브는 여러 개를 껴도 가장 큰 하나만(겹치지 않음).
    const passive = Math.max(0, ...(s.skills || []).map(id => skillById(id)?.searchCut || 0));
    return { ms: Math.max(SEARCH.minMs, SEARCH.baseMs - research - passive), research, passive };
}
/** 전투가 끝난 직후(사냥터에서만): 탐색 턴 수를 정하고 남은 시간을 넘깁니다. */
export function startSearch(s: State) {
    if (s.dungeon || s.hp <= 0) return;
    const total = searchTime(s).ms + (s.searchCarry || 0), turns = Math.floor(total / BALANCE.turnMs);
    s.searchCarry = total - turns * BALANCE.turnMs;
    if (turns > 0) s.searching = turns; else delete s.searching;
}
/** 탐색 턴 하나: 전투 없이 초마다 턴당 회복만큼 회복합니다. */
export function searchTurn(s: State, a: Pick<CombatStats, 'hp' | 'mana' | 'hpRegen' | 'manaRegen'>) {
    const seconds = BALANCE.turnMs / 1000;
    s.hp = Math.min(a.hp, s.hp + Math.max(0, Math.floor((a.hpRegen || 0) * seconds)));
    s.mana = Math.min(a.mana, s.mana + Math.max(0, Math.floor((a.manaRegen || 0) * seconds)));
    s.searching = Math.max(0, (s.searching || 0) - 1);
    if (!s.searching) delete s.searching;
}
/** 사냥터를 옮기거나 던전에 들어갈 때: 바로 싸우도록 탐색을 지웁니다(남은 시간은 그대로). */
export const clearSearch = (s: State) => { delete s.searching; };
