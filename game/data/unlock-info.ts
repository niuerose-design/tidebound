/**
 * v3.62 숨은 전직의 공개 창구(docs/concept.md 11.7). 조건은 서버 전용 secret/unlocks.ts에 있고, 불러올 때 setUnlockSource로 여기에 연결합니다.
 * 화면은 서버가 보낸 카탈로그(catalog.ts applyCatalog)로 같은 창구를 채웁니다. 그래서 진행(progression)·공개(reveal) 계산은 어느 쪽에서든 같은 함수를 부릅니다.
 */
import type { State } from '../types';

/** 전직 조건 목록에 붙는 이름. */
export const UNLOCK_LABEL = '숨은 조건';
type UnlockSource = (s: Partial<State>, jobId: string) => boolean | null;
let source: UnlockSource = () => null;
/** 서버의 unlocks.ts(전체 조건) 또는 화면의 카탈로그가 채웁니다. */
export function setUnlockSource(next: UnlockSource) { source = next; }
/** 이 직업의 숨은 조건을 만족했는지. 숨은 조건이 없는 직업은 null. */
export const unlockFor: UnlockSource = (s, jobId) => source(s, jobId);
