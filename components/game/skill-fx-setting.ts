'use client';
import { useSyncExternalStore } from 'react';

/**
 * v27.62 스킬 이펙트(전투 연출: 화면 이펙트·피해 숫자·막대 반짝임) 켜기/끄기. 기기마다 따로 저장합니다(이 브라우저의 localStorage).
 * 저장값이 없으면 모바일(폭 767px 이하)은 꺼짐, 데스크톱은 켜짐이 기본입니다. 꺼도 HP·전투 기록은 그대로 갱신됩니다.
 */
const KEY = 'tidebound.skillFx';
const EVENT = 'tidebound:skillFx';
const MOBILE = '(max-width: 767px)';
const read = (): 'on' | 'off' | null => { try { const v = localStorage.getItem(KEY); return v === 'on' || v === 'off' ? v : null; } catch { return null; } };
const isMobile = () => typeof window !== 'undefined' && !!window.matchMedia?.(MOBILE).matches;
/** 지금 기기의 기본값(저장값이 없을 때). */
export const skillFxDefault = () => !isMobile();
const snapshot = () => { const v = read(); return v ? v === 'on' : skillFxDefault(); };
function subscribe(fn: () => void) {
    const media = window.matchMedia?.(MOBILE);
    window.addEventListener('storage', fn); window.addEventListener(EVENT, fn); media?.addEventListener?.('change', fn);
    return () => { window.removeEventListener('storage', fn); window.removeEventListener(EVENT, fn); media?.removeEventListener?.('change', fn); };
}
/** 스킬 이펙트를 보여 줄지. */
export function useSkillFx() { return useSyncExternalStore(subscribe, snapshot, () => true); }
/** 이 기기의 설정을 바꿉니다. */
export function setSkillFx(on: boolean) {
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* 저장소 없음: 이번 화면에서만 */ }
    window.dispatchEvent(new Event(EVENT));
}
