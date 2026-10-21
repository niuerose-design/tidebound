/**
 * v3.378 서버의 세이브 읽기 · 쓰기(기능 플래그). 읽기는 플래그와 무관하게 v1 · v2 봉투를 모두 받습니다.
 * TIDEBOUND_SAVE_V2=1 이면 봉투(v2)로 씁니다. 끄면 다시 v1로 쓰므로 되돌리기도 재배포 없이 환경 변수만으로 됩니다.
 */
import type { State } from '../types';
import { parseSave, readSave, writeSave } from '../save/envelope';

export const saveEnvelopeOn = () => process.env.TIDEBOUND_SAVE_V2 === '1';
/** DB 행 → State(봉투 체인 + 보정). */
export const readRow = (json: string, now: number): State => readSave(json, now);
/** DB 행 → State(봉투만 벗김, 보정 없음): 목록 훑기 · 차분 응답 before 사본처럼 보정이 필요 없는 곳. */
export const peekRow = (json: string, now: number): State => parseSave(json, now);
/** State → DB 행. */
export const packSave = (s: State, now: number): string => writeSave(s, now, saveEnvelopeOn());
