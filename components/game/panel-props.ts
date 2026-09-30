import type { Action, State } from '@/game/types';

/** 게임 화면 패널 공통 속성. send의 path는 결투처럼 다른 API로 보낼 때만 씁니다. */
export type PanelProps = { s: State; send: (a: Action, path?: string) => void; busy: boolean; setView?: (view: string) => void };
