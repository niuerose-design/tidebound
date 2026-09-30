import type { State } from '../types';
import { SAVE_VERSION } from '../data/balance';
import { newState } from './engine';
/**
 * v8(게임 v20.5): 골드 훈련 삭제와 함께 이전 버전의 세이브는 이름만 남기고 새로 시작합니다.
 * 이후 버전 변경은 이 함수에 단계별 추가 마이그레이션으로 이어 붙입니다.
 */
export function migrateState(s: State, now = s.lastTick || 0): State {
    if (s.version === SAVE_VERSION) return s;
    const name = typeof s.name === 'string' && s.name.trim() ? s.name : undefined;
    const fresh = newState(now);
    if (name) fresh.name = name;
    for (const key of Object.keys(s)) delete (s as Record<string, unknown>)[key];
    Object.assign(s, fresh);
    return s;
}
