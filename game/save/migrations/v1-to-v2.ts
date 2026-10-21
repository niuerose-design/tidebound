import type { State } from '../../types';
import { wrapSave, type SaveEnvelope } from '../format';

/** v1(State 그대로) → v2 봉투. 파생 키만 빼고 나머지 키는 그대로이므로 기존 플레이어는 아무것도 잃지 않습니다. */
export function v1ToV2(raw: unknown, now: number): SaveEnvelope {
    if (!raw || typeof raw !== 'object') throw new TypeError('v1 세이브는 객체여야 합니다.');
    return wrapSave(raw as State, now);
}
