'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { MOBILE_QUERY } from './use-mobile';

/**
 * v27.62 스킬 이펙트(전투 연출: 화면 이펙트·피해 숫자·막대 반짝임) 켜기/끄기. 기기마다 따로 저장합니다(이 브라우저의 localStorage).
 * 저장값이 없으면 모바일(폭 767px 이하)은 꺼짐, 데스크톱은 켜짐이 기본입니다. 꺼도 HP·전투 기록은 그대로 갱신됩니다.
 */
const KEY = 'tidebound.skillFx';
const EVENT = 'tidebound:skillFx';
const read = (): 'on' | 'off' | null => { try { const v = localStorage.getItem(KEY); return v === 'on' || v === 'off' ? v : null; } catch { return null; } };
const isMobile = () => typeof window !== 'undefined' && !!window.matchMedia?.(MOBILE_QUERY).matches;
/** 지금 기기의 기본값(저장값이 없을 때). */
const skillFxDefault = () => !isMobile();
const snapshot = () => { const v = read(); return v ? v === 'on' : skillFxDefault(); };
function subscribe(fn: () => void) {
    const media = window.matchMedia?.(MOBILE_QUERY);
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

/**
 * v3.170 섬광 켜기/끄기(이 기기에만 저장). 스킬 연출 가운데 배경 · 카드가 원형으로 밝아졌다 퍼지는 섬광(.scene-fx-flash · .tide-fx-flash)과 4차 이상 카드 위 큰 폭발광(.tide-fx-big)을 끄고, 퍼니셔 구체의 후광을 뺍니다.
 * 투사체 · 파편 · 고리 · 어두워지는 연출은 그대로입니다. 저장값이 없으면 어느 기기든 꺼짐이 기본입니다(모바일은 스킬 이펙트 자체가 꺼짐).
 */
const GLOW_KEY = 'tidebound.skillFxGlow';
const GLOW_EVENT = 'tidebound:skillFxGlow';
const readGlow = (): 'on' | 'off' | null => { try { const v = localStorage.getItem(GLOW_KEY); return v === 'on' || v === 'off' ? v : null; } catch { return null; } };
const glowSnapshot = () => readGlow() === 'on';
function subscribeGlow(fn: () => void) {
    window.addEventListener('storage', fn); window.addEventListener(GLOW_EVENT, fn);
    return () => { window.removeEventListener('storage', fn); window.removeEventListener(GLOW_EVENT, fn); };
}
/** 섬광을 보여 줄지(스킬 이펙트가 꺼져 있으면 어차피 나오지 않습니다). */
export function useFxGlow() { return useSyncExternalStore(subscribeGlow, glowSnapshot, () => false); }
/** 이 기기의 섬광 설정을 바꿉니다. */
export function setFxGlow(on: boolean) {
    try { localStorage.setItem(GLOW_KEY, on ? 'on' : 'off'); } catch { /* 저장소 없음: 이번 화면에서만 */ }
    window.dispatchEvent(new Event(GLOW_EVENT));
}
/** 섬광이 꺼진 기기에서는 <html>에 fx-no-glow 클래스를 붙여 CSS(battle.css)가 섬광 요소만 숨깁니다. 게임 화면 루트에서 한 번 부릅니다. */
export function useFxGlowClass() {
    const on = useFxGlow();
    useEffect(() => { document.documentElement.classList.toggle('fx-no-glow', !on); return () => { document.documentElement.classList.remove('fx-no-glow'); }; }, [on]);
}
