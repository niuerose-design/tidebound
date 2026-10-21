/**
 * v3.378 세이브 봉투 형식(재설계 3단계, 브리프 8절). DB 블롭은 두 모양을 받습니다.
 *  - v1: State 그대로(지금 라이브 포맷, `version: 8` + 플래그 기준 멱등 보정 `systems/migrations.ts`).
 *  - v2: `{ v, savedAt, lastTickAt, contentVersion, state }` 봉투. state 에서 요청마다 다시 계산하는 키(DERIVED_KEYS)를 뺍니다.
 * 읽기는 언제나 둘 다 받고(envelope.ts parseSave), 쓰기는 서버 기능 플래그(server/save.ts)로 고릅니다.
 */
import type { State } from '../types';
import { GAME_BUILD } from '../data/update-log';

/** 봉투 번호. 정수로만 올리고, 올릴 때마다 migrations/ 에 (v-1 → v) 순수 함수와 픽스처 테스트를 더합니다. */
export const SAVE_FORMAT = 2;
export type SaveEnvelope = { v: number; savedAt: number; lastTickAt: number; contentVersion: string; state: State };
/**
 * 저장하지 않는 파생 키: advance()가 요청마다 다시 적는 값. 봉투로 쓸 때 뺍니다.
 * account(10분 주기 캐시) · altarStatus(15초 캐시) · lastOffline(행동으로 닫는 정산 카드)은 상태라 남깁니다.
 */
export const DERIVED_KEYS = ['event', 'closed', 'catchingUp', 'away'] as const;
export class SaveFormatError extends Error {}

export function isEnvelope(x: unknown): x is SaveEnvelope {
    return !!x && typeof x === 'object' && typeof (x as SaveEnvelope).v === 'number' && !!(x as SaveEnvelope).state && typeof (x as SaveEnvelope).state === 'object';
}
/** 봉투가 아니면 v1(State 그대로). */
export const formatOf = (raw: unknown) => isEnvelope(raw) ? raw.v : 1;
export function stripDerived(s: State): State { const c = { ...s } as Record<string, unknown>; for (const k of DERIVED_KEYS) delete c[k]; return c as State; }
export function wrapSave(s: State, now: number): SaveEnvelope { return { v: SAVE_FORMAT, savedAt: now, lastTickAt: s.lastTick || 0, contentVersion: GAME_BUILD, state: stripDerived(s) }; }
