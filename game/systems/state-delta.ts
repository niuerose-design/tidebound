/**
 * v3.373 세이브 차분(B안 서버 비용). 서버는 직전 응답으로 보낸 세이브(인스턴스 메모리의 사본)와 새 세이브를 최상위 키마다 비교해
 * 바뀐 키만(set) · 사라진 키만(drop) 보내고, 화면은 가진 세이브 위에 얹습니다. 바뀌지 않은 키는 같은 객체를 그대로 두므로
 * 그 키만 보는 컴포넌트는 메모로 건너뛸 수 있습니다. 로그(logs)는 따로 차분(log-delta.ts)하므로 여기서는 뺍니다.
 */
import type { State } from '../types';

export type StatePatch = { set: Record<string, unknown>; drop: string[] };
const SKIP: ReadonlySet<string> = new Set(['logs']);

/** 최상위 키마다 JSON 문자열로 비교합니다(깊은 비교 대신 직렬화 비교: 세이브는 JSON으로만 오가므로 같은 기준). */
export function diffState(prev: Record<string, unknown>, next: Record<string, unknown>): StatePatch {
    const set: Record<string, unknown> = {}, drop: string[] = [];
    for (const k of Object.keys(next)) {
        if (SKIP.has(k)) continue;
        const v = next[k];
        if (v === undefined) continue;
        if (!(k in prev) || prev[k] === undefined || JSON.stringify(prev[k]) !== JSON.stringify(v)) set[k] = v;
    }
    for (const k of Object.keys(prev)) if (!SKIP.has(k) && prev[k] !== undefined && (!(k in next) || next[k] === undefined)) drop.push(k);
    return { set, drop };
}

/** 화면: 가진 세이브 위에 차분을 얹습니다. 바뀌지 않은 키의 객체는 그대로(참조 유지). */
export function applyStatePatch(prev: State, patch: StatePatch): State {
    const next = { ...prev, ...patch.set } as State;
    for (const k of patch.drop) delete (next as unknown as Record<string, unknown>)[k];
    return next;
}
