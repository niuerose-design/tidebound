import type { Action, State } from '../../types';

/** 행동 처리기. id는 a.id의 빈 문자열 기본값입니다. */
export type ActionContext = { a: Action; id: string; now: number; rng: () => number };
export type ActionHandlers = Record<string, (s: State, ctx: ActionContext) => void>;
