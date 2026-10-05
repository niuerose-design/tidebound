'use client';
/** v3.13 실시간 효율: 계산은 game/systems/live-rates, 여기서는 앱 전체가 공유하는 저장소 하나와 React 구독만 둡니다. */
import { useEffect, useSyncExternalStore } from 'react';
import type { State } from '@/game/types';
import { createLiveRates, EMPTY_RATES } from '@/game/systems/live-rates';
export { gainsOf, RATE_WINDOW_MS, RATE_MIN_MS } from '@/game/systems/live-rates';
const store = createLiveRates();
const getServer = () => EMPTY_RATES;
export function useLiveRates() { return useSyncExternalStore(store.subscribe, store.get, getServer); }
/** 게임 셸에서 한 번만: 동기화로 받은 원본 상태를 흘려 넣습니다(재생 프레임이 아니라). */
export function useFeedLiveRates(s: State | null) { useEffect(() => { if (s) store.feed(s); }, [s]); }
