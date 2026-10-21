/**
 * 봉투 마이그레이션 체인(브리프 8절): (from → to) 순수 함수 배열. 로드 때 봉투 번호부터 SAVE_FORMAT까지 차례로 적용합니다.
 * 새 단계를 더할 때: 파일 하나 + 이 배열 한 줄 + tests/unit/save-envelope.test.ts 의 과거 픽스처 검사.
 * State 안의 키 보정(환불 · 재척도 · 인덱스 이동)은 전처럼 systems/migrations.ts(멱등 플래그)에 두고, 봉투 모양이 바뀔 때만 여기에 더합니다.
 */
import { v1ToV2 } from './v1-to-v2';

export type SaveMigration = { from: number; to: number; up: (raw: unknown, now: number) => unknown };
export const MIGRATIONS: SaveMigration[] = [
    { from: 1, to: 2, up: v1ToV2 },
];
