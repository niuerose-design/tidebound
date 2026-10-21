/** v3.378 세이브 읽기 · 쓰기 진입점. 형식은 format.ts, 체인은 migrations/. 서버 플래그는 server/save.ts. */
import type { State } from '../types';
import { migrateState } from '../systems/migrations';
import { SAVE_FORMAT, SaveFormatError, formatOf, wrapSave, type SaveEnvelope } from './format';
import { MIGRATIONS } from './migrations/index';
export { SAVE_FORMAT, DERIVED_KEYS, SaveFormatError, isEnvelope, formatOf, stripDerived, wrapSave, type SaveEnvelope } from './format';
export { MIGRATIONS, type SaveMigration } from './migrations/index';

/** 봉투를 벗겨 State만 돌려줍니다(체인 적용, systems/migrations 보정은 하지 않음 — 차분 응답의 before 사본용). */
export function unwrapSave(raw: unknown, now: number): State {
    let v = formatOf(raw), cur = raw;
    if (!Number.isInteger(v) || v < 1) throw new SaveFormatError(`세이브 형식 번호가 이상합니다: ${String(v)}`);
    if (v > SAVE_FORMAT) throw new SaveFormatError(`세이브 형식 v${v}는 이 서버(v${SAVE_FORMAT})보다 새롭습니다. 서버를 먼저 배포하세요.`);
    while (v < SAVE_FORMAT) {
        const m = MIGRATIONS.find(x => x.from === v);
        if (!m) throw new SaveFormatError(`v${v} → v${v + 1} 마이그레이션이 없습니다.`);
        cur = m.up(cur, now); v = m.to;
    }
    return (cur as SaveEnvelope).state;
}
export const parseSave = (json: string, now: number): State => unwrapSave(JSON.parse(json), now);
/** 읽기: 봉투 체인 + State 보정(systems/migrations). 서버 · 운영 페이지 · 테스트가 쓰는 유일한 읽기 경로. */
export const readSave = (json: string, now: number): State => migrateState(parseSave(json, now), now);
/** 쓰기: envelope=true 면 v2 봉투(파생 키 제거), false 면 지금 라이브 포맷(v1) 그대로. */
export const writeSave = (s: State, now: number, envelope: boolean): string => JSON.stringify(envelope ? wrapSave(s, now) : s);
