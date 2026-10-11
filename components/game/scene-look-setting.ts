'use client';
import { useMemo, useSyncExternalStore } from 'react';
import type { BackdropTheme } from './art';

/**
 * v3.268 전투 장면 꾸미기(이 기기에만 저장): 배경 테마와 내 캐릭터 모습(모양 · 무기 · 직접 올린 그림).
 * 'auto'면 지금처럼 사냥터 · 직업으로 고릅니다. 그림은 올릴 때 160×220 안으로 줄여 PNG data URL로 저장합니다.
 */
export type HeroKindId = 'warrior' | 'mage' | 'guardian' | 'rogue' | 'spellblade' | 'merchant' | 'mystic' | 'devour' | 'miner' | 'agent' | 'trader' | 'hacker';
export type WeaponId = 'sword' | 'spear' | 'bow' | 'dagger' | 'gun' | 'fist' | 'staff' | 'shield' | 'orb' | 'fan';
export type SceneLook = { backdrop: BackdropTheme | 'auto'; hero: HeroKindId | 'auto'; weapon: WeaponId | 'auto' };
export const BACKDROP_LABELS: Record<BackdropTheme, string> = {
    harbor: '항구 (리스항구)', village: '마을 언덕 (헤네시스)', canyon: '바위 협곡 (페리온)', forest: '큰 숲 (엘리니아)', city: '도시 (커닝시티)', underwater: '바닷속 (아쿠아로드)',
    dragon: '용의 둥지 (리프레)', temple: '신전 (시간의 신전)', arcane: '아케인 리버', swamp: '늪 (슬리피우드)', mountain: '설산 (무릉 · 엘나스)',
};
export const HERO_LABELS: Record<HeroKindId, string> = {
    warrior: '전사', mage: '마법사', guardian: '수호자', rogue: '도적', spellblade: '마검사', merchant: '상인', mystic: '두건 신비가', devour: '포식자', miner: '광부', agent: '요원', trader: '트레이더', hacker: '해커',
};
export const WEAPON_LABELS: Record<WeaponId, string> = { sword: '검', spear: '창', bow: '활', dagger: '단검', gun: '총', fist: '너클', staff: '지팡이', shield: '방패', orb: '구슬', fan: '부채' };

const KEY = 'tidebound.sceneLook', IMAGE_KEY = 'tidebound.heroImage', EVENT = 'tidebound:sceneLook';
const AUTO: SceneLook = { backdrop: 'auto', hero: 'auto', weapon: 'auto' };
const raw = (key: string) => { try { return localStorage.getItem(key) ?? ''; } catch { return ''; } };
function subscribe(fn: () => void) {
    window.addEventListener('storage', fn); window.addEventListener(EVENT, fn);
    return () => { window.removeEventListener('storage', fn); window.removeEventListener(EVENT, fn); };
}
/** 이 기기의 장면 꾸미기 설정(저장값이 없거나 깨졌으면 모두 자동). */
export function useSceneLook(): SceneLook {
    const text = useSyncExternalStore(subscribe, () => raw(KEY), () => '');
    return useMemo(() => { try { return { ...AUTO, ...(text ? JSON.parse(text) : {}) }; } catch { return AUTO; } }, [text]);
}
/** 직접 올린 캐릭터 그림(data URL) 또는 ''. */
export function useHeroImage() { return useSyncExternalStore(subscribe, () => raw(IMAGE_KEY), () => ''); }
export function setSceneLook(patch: Partial<SceneLook>) {
    let now = AUTO;
    try { now = { ...AUTO, ...JSON.parse(raw(KEY) || '{}') }; } catch { /* 깨진 값은 자동으로 */ }
    try { localStorage.setItem(KEY, JSON.stringify({ ...now, ...patch })); } catch { /* 저장소 없음: 이번 화면에서만 */ }
    window.dispatchEvent(new Event(EVENT));
}
/** 그림 파일을 160×220 안으로 줄여 저장합니다. 실패하면 오류 문구를 돌려줍니다. */
export async function setHeroImage(file: File | null): Promise<string | null> {
    if (!file) { try { localStorage.removeItem(IMAGE_KEY); } catch { /* 없음 */ } window.dispatchEvent(new Event(EVENT)); return null; }
    if (!file.type.startsWith('image/')) return '그림 파일(PNG · JPG · GIF · WebP)만 올릴 수 있습니다.';
    if (file.size > 8 * 1024 * 1024) return '8MB보다 작은 그림을 올려 주세요.';
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 160 / bitmap.width, 220 / bitmap.height), w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '이 브라우저에서는 그림을 줄일 수 없습니다.';
        ctx.imageSmoothingEnabled = scale < 1; ctx.drawImage(bitmap, 0, 0, w, h);
        localStorage.setItem(IMAGE_KEY, canvas.toDataURL('image/png'));
        window.dispatchEvent(new Event(EVENT));
        return null;
    } catch { return '그림을 읽거나 저장하지 못했습니다(브라우저 저장 공간이 부족할 수 있습니다).'; }
}
