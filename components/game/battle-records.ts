'use client';
/**
 * v3.101 최근 전투 기록: 묶는 계산은 game/systems/battle-records, 여기서는 이 브라우저의 저장(localStorage)과 React 구독만 둡니다.
 * 서버에 보내거나 저장하지 않습니다. 캐릭터 이름마다 따로 남기고, 저장은 몰아서(SAVE_MS · 탭을 숨기거나 떠날 때) 합니다. 저장은 수백 KB 문자열을 동기로 쓰므로 자주 하지 않습니다.
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { State } from '@/game/types';
import { emptyBattleRecords, ingestBattleLogs, trimBattleRecords, type BattleRecordStore } from '@/game/systems/battle-records';

const KEY = 'tidebound.battleRecords:', SAVE_MS = 60_000;
let owner = '', store: BattleRecordStore = emptyBattleRecords(), snapshot: BattleRecordStore = store, timer: ReturnType<typeof setTimeout> | undefined;
const subs = new Set<() => void>();
const EMPTY = emptyBattleRecords();

const save = () => { timer = undefined; if (!owner) return; try { localStorage.setItem(KEY + owner, JSON.stringify(store)); } catch { /* 저장소 없음 · 가득 참: 이번 화면에서만 */ } };
const load = (name: string) => {
    if (timer) { clearTimeout(timer); save(); }
    owner = name; store = emptyBattleRecords();
    try { const raw = localStorage.getItem(KEY + name), parsed = raw ? JSON.parse(raw) as BattleRecordStore : null; if (parsed?.byMob && Array.isArray(parsed.order)) store = trimBattleRecords({ ...parsed, current: undefined }); } catch { /* 깨진 값: 새로 시작 */ }
};
function feed(s: State) {
    const loaded = s.name !== owner;
    if (loaded) load(s.name);
    // 로그 번호가 저장된 것보다 작아졌으면(데이터 초기화 등) 처음부터 다시 셉니다.
    const newest = s.logs.at(-1)?.id ?? 0;
    if (newest < store.lastId) { store.lastId = 0; store.current = undefined; }
    const before = store.lastId;
    ingestBattleLogs(store, s.logs, s.name);
    if (!loaded && store.lastId === before) return;
    snapshot = { ...store };
    subs.forEach(fn => fn());
    timer ??= setTimeout(save, SAVE_MS);
}
const flush = () => { if (timer) { clearTimeout(timer); save(); } };
if (typeof window !== 'undefined') { window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); }); }

const subscribe = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };
export function useBattleRecords() { return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY); }
/** 게임 셸에서 한 번만: 동기화로 받은 상태의 로그를 흘려 넣습니다. */
export function useFeedBattleRecords(s: State | null) { useEffect(() => { if (s) feed(s); }, [s]); }
/** 이 기기에 남긴 이 캐릭터의 기록을 지웁니다. */
export function clearBattleRecords() {
    const lastId = store.lastId; store = { ...emptyBattleRecords(), lastId }; snapshot = store;
    try { localStorage.removeItem(KEY + owner); } catch { /* 저장소 없음 */ }
    subs.forEach(fn => fn());
}
