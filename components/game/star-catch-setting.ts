'use client';
import { useSyncExternalStore } from 'react';

/**
 * v3.8 스타캐치 설정(기기마다 localStorage): 'catch' = 수동 강화 때 좌우로 오가는 별을 잡는 미니게임·결과 연출, 'sound' = 강화 효과음.
 * 저장값이 없으면 미니게임은 켜짐, 효과음은 꺼짐이 기본입니다.
 */
const KEYS = { catch: 'tidebound.starCatch', sound: 'tidebound.starSound' } as const;
const EVENT = 'tidebound:starCatch';
export type StarSettingKey = keyof typeof KEYS;
const DEFAULTS: Record<StarSettingKey, boolean> = { catch: true, sound: false };
const read = (key: StarSettingKey) => { try { const v = localStorage.getItem(KEYS[key]); return v === 'on' ? true : v === 'off' ? false : DEFAULTS[key]; } catch { return DEFAULTS[key]; } };
function subscribe(fn: () => void) {
    window.addEventListener('storage', fn); window.addEventListener(EVENT, fn);
    return () => { window.removeEventListener('storage', fn); window.removeEventListener(EVENT, fn); };
}
export function useStarSetting(key: StarSettingKey) { return useSyncExternalStore(subscribe, () => read(key), () => DEFAULTS[key]); }
export function setStarSetting(key: StarSettingKey, on: boolean) {
    try { localStorage.setItem(KEYS[key], on ? 'on' : 'off'); } catch { /* 저장소 없음: 이번 화면에서만 */ }
    window.dispatchEvent(new Event(EVENT));
}

/** 강화 효과음(WebAudio 발진기, 파일 없음). 설정이 꺼져 있거나 오디오를 못 쓰면 조용히 지나갑니다. */
let ctx: AudioContext | null = null;
export function starSound(kind: 'tick' | 'catch' | 'miss' | 'success' | 'drop' | 'keep' | 'destroy') {
    if (!read('sound') || typeof window === 'undefined') return;
    try {
        ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const tone = (freq: number, at: number, len: number, type: OscillatorType = 'sine', gain = .08) => {
            const o = ctx!.createOscillator(), g = ctx!.createGain();
            o.type = type; o.frequency.value = freq; g.gain.value = gain;
            g.gain.setValueAtTime(gain, ctx!.currentTime + at); g.gain.exponentialRampToValueAtTime(.0001, ctx!.currentTime + at + len);
            o.connect(g).connect(ctx!.destination); o.start(ctx!.currentTime + at); o.stop(ctx!.currentTime + at + len);
        };
        if (kind === 'tick') tone(880, 0, .04, 'square', .03);
        else if (kind === 'catch') { tone(1047, 0, .08); tone(1319, .08, .12); }
        else if (kind === 'miss') tone(330, 0, .15, 'triangle');
        else if (kind === 'success') { tone(784, 0, .1); tone(988, .1, .1); tone(1319, .2, .25); }
        else if (kind === 'drop') { tone(440, 0, .12, 'triangle'); tone(294, .12, .3, 'triangle'); }
        else if (kind === 'keep') tone(392, 0, .2, 'triangle');
        else if (kind === 'destroy') { tone(196, 0, .3, 'sawtooth', .1); tone(131, .15, .5, 'sawtooth', .1); }
    } catch { /* 오디오 없음 */ }
}
