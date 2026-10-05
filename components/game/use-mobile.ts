'use client';
import { useSyncExternalStore } from 'react';

const MOBILE = '(max-width: 767px)';
const subscribe = (fn: () => void) => { const media = window.matchMedia?.(MOBILE); media?.addEventListener?.('change', fn); return () => media?.removeEventListener?.('change', fn); };
/** v27.88 지금 화면이 모바일 폭(767px 이하)인지. 서버 렌더에서는 false라 첫 그림은 데스크톱 기준이고, 클라이언트에서 바로 맞춰집니다. */
export function useIsMobile() { return useSyncExternalStore(subscribe, () => !!window.matchMedia?.(MOBILE).matches, () => false); }
