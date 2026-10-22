'use client';
/**
 * v3.415 전투 연출 CSS 묶음(app/styles/battle-fx.css: 5차 궁극기 · 보스 스킬 · 이계 · 아제로스 연출)을 필요할 때 싣습니다.
 * 첫 화면 CSS 에서 빼서 로그인 · 메뉴 화면이 더 가볍게 뜨고, 전투 장면(사냥 · 던전 · 결투 · 연출 실험실)이 그려지는 순간 미리 받아 둡니다.
 * useCombatFx 는 처음 받은 기록으로는 연출을 만들지 않으므로(다음 동기화의 새 기록부터) 첫 연출까지 CSS 가 도착할 시간이 충분하고,
 * 그래도 아직이면 연출 층(SceneFx · FoeCleave)은 도착할 때까지 그리지 않아 스타일 없는 조각이 보이지 않습니다. 실패하면 다음 호출에서 다시 시도합니다.
 */
import { useEffect, useSyncExternalStore } from 'react';

let pending: Promise<unknown> | null = null, ready = false;
const listeners = new Set<() => void>();
export function loadFxStyles(): Promise<unknown> {
    if (typeof window === 'undefined') return Promise.resolve();
    pending ??= import('@/app/styles/battle-fx.css').then(() => { ready = true; for (const fn of listeners) fn(); }).catch(() => { pending = null; });
    return pending;
}
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const snapshot = () => ready, serverSnapshot = () => false;
/** 전투 장면 컴포넌트가 뜰 때 부릅니다. 연출 CSS 가 도착했는지 돌려줍니다(두 번째부터는 바로 true). */
export function useFxStyles(): boolean {
    useEffect(() => { void loadFxStyles(); }, []);
    return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
