'use client';
import { useSyncExternalStore } from 'react';

/** 모바일 폭 기준(CSS의 @media(max-width:767px)와 같음). */
export const MOBILE_QUERY = '(max-width: 767px)';
const subscribe = (fn: () => void) => { const media = window.matchMedia?.(MOBILE_QUERY); media?.addEventListener?.('change', fn); return () => media?.removeEventListener?.('change', fn); };
/** v27.88 지금 화면이 모바일 폭(767px 이하)인지. 서버 렌더에서는 false라 첫 그림은 데스크톱 기준이고, 클라이언트에서 바로 맞춰집니다. */
export function useIsMobile() { return useSyncExternalStore(subscribe, () => !!window.matchMedia?.(MOBILE_QUERY).matches, () => false); }

/** 넓은 화면 기준(Tailwind xl, 1280px 이상). */
export const WIDE_QUERY = '(min-width: 1280px)';
const subscribeWide = (fn: () => void) => { const media = window.matchMedia?.(WIDE_QUERY); media?.addEventListener?.('change', fn); return () => media?.removeEventListener?.('change', fn); };
/** v3.425 지금 화면이 xl(1280px) 이상인지. 서버 렌더에서는 false. */
export function useIsWide() { return useSyncExternalStore(subscribeWide, () => !!window.matchMedia?.(WIDE_QUERY).matches, () => false); }
