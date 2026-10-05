'use client';
import { useState, type ReactNode } from 'react';
import { onyxArtSrc } from '@/game/data/art';
/**
 * v3.12 칠흑 장신구 그림(64×64 SVG). 원작 장신구의 생김새를 본떠 직접 그린 실루엣·채색이며 원본 이미지는 쓰지 않습니다.
 * 거대한 공포(검붉은 결정과 눈) · 커맨더 포스 이어링(가시 달린 검은 귀걸이) · 루즈 컨트롤 머신 마크(톱니 메달) ·
 * 몽환의 벨트(초승달 버클) · 마력이 깃든 안대(붉은 띠의 안대) · 미트라의 분노(황금 불꽃 태양) · 창세의 뱃지(흰 날개 달린 검은 뱃지).
 */
const ART: Record<string, ReactNode> = {
    onyxDusk: <>
        <path d="M32 4l14 16-6 36H24l-6-36z" fill="#2a0f2e" stroke="#6b2d75" strokeWidth="2"/>
        <path d="M32 4l14 16-14 6-14-6z" fill="#4a1a52"/>
        <path d="M26 24l6-4 6 4-6 32z" fill="#7a2a86" opacity=".6"/>
        <ellipse cx="32" cy="34" rx="7" ry="4.5" fill="#f2b8ff"/>
        <circle cx="32" cy="34" r="3" fill="#b3001b"/>
        <circle cx="32" cy="34" r="1.2" fill="#000"/>
        <path d="M14 20l-6-4M50 20l6-4M20 48l-6 6M44 48l6 6" stroke="#b05fc0" strokeWidth="2" strokeLinecap="round"/>
    </>,
    onyxDunkel: <>
        <path d="M30 6a6 6 0 1 1 4 0v8h-4z" fill="#8a8f99" stroke="#3a3f4a" strokeWidth="2"/>
        <path d="M32 14c-10 0-16 8-16 18 0 12 8 20 16 26 8-6 16-14 16-26 0-10-6-18-16-18z" fill="#1c1f26" stroke="#555b66" strokeWidth="2"/>
        <path d="M32 20c-6 0-10 5-10 11 0 8 5 13 10 18 5-5 10-10 10-18 0-6-4-11-10-11z" fill="#2c3140"/>
        <path d="M32 24l10 6-10 6-10-6z" fill="#c21e2e" stroke="#ff6b7a" strokeWidth="1.5"/>
        <path d="M16 30l-8 2 8 4zM48 30l8 2-8 4zM32 58l-3 4h6z" fill="#8a8f99"/>
    </>,
    onyxWill: <>
        <path d="M26 4h12l2 8H24z" fill="#4b3b8a" stroke="#8c7bd6" strokeWidth="2"/>
        <circle cx="32" cy="36" r="22" fill="#15121f" stroke="#5c4b9c" strokeWidth="2"/>
        <g fill="#2b2345" stroke="#8c7bd6" strokeWidth="1.5"><path d="M32 12l3 6h-6zM32 60l3-6h-6zM8 36l6-3v6zM56 36l-6-3v6zM15 19l6 1-4 4zM49 19l-6 1 4 4zM15 53l6-1-4-4zM49 53l-6-1 4-4z"/></g>
        <circle cx="32" cy="36" r="13" fill="#1f1a33" stroke="#a991ff" strokeWidth="2"/>
        <path d="M32 23v26M19 36h26M23 27l18 18M41 27L23 45" stroke="#6f5bc9" strokeWidth="1.2"/>
        <circle cx="32" cy="36" r="5" fill="#c7b8ff"/>
        <circle cx="32" cy="36" r="2" fill="#5a2aa8"/>
    </>,
    onyxLucid: <>
        <rect x="4" y="26" width="56" height="16" rx="4" fill="#2a1b4a" stroke="#6e4fb3" strokeWidth="2"/>
        <rect x="4" y="30" width="56" height="3" fill="#8a6fd6" opacity=".5"/>
        <rect x="20" y="20" width="24" height="28" rx="6" fill="#1a1230" stroke="#9f86ff" strokeWidth="2"/>
        <path d="M37 25a9 9 0 1 0 0 18 10 10 0 0 1 0-18z" fill="#ffe28a"/>
        <circle cx="26" cy="27" r="1.5" fill="#ffd3f8"/><circle cx="40" cy="43" r="1.2" fill="#ffd3f8"/><circle cx="24" cy="42" r="1" fill="#c8b8ff"/>
        <path d="M8 30h8M48 30h8" stroke="#c9b8ff" strokeWidth="1.5" strokeLinecap="round"/>
    </>,
    onyxHilla: <>
        <path d="M6 30c10-8 18-10 26-10s16 2 26 10" fill="none" stroke="#9a1424" strokeWidth="5" strokeLinecap="round"/>
        <path d="M6 30c10 6 18 8 26 8s16-2 26-8" fill="none" stroke="#9a1424" strokeWidth="5" strokeLinecap="round"/>
        <path d="M18 24c4-4 9-6 14-6s10 2 14 6c0 14-6 24-14 30-8-6-14-16-14-30z" fill="#141018" stroke="#5a2a6e" strokeWidth="2"/>
        <path d="M32 24c-5 0-9 4-9 9 0 7 4 12 9 16 5-4 9-9 9-16 0-5-4-9-9-9z" fill="#2a1038"/>
        <path d="M32 29l5 7-5 9-5-9z" fill="#ff3a4e"/>
        <circle cx="32" cy="37" r="2" fill="#ffd0d6"/>
        <path d="M24 42l-3 3M40 42l3 3M32 50v4" stroke="#b03a6e" strokeWidth="1.5" strokeLinecap="round"/>
    </>,
    onyxSeren: <>
        <circle cx="32" cy="34" r="12" fill="#ffd54a" stroke="#ff8a1f" strokeWidth="2"/>
        <circle cx="32" cy="34" r="6" fill="#fff4b0"/>
        <g fill="#ff9c2a" stroke="#ff6a00" strokeWidth="1.2">
            <path d="M32 6l4 12-4 4-4-4zM32 62l4-12-4-4-4 4zM4 34l12-4 4 4-4 4zM60 34l-12-4-4 4 4 4z"/>
            <path d="M12 14l12 4 1 6-6 1zM52 14l-12 4-1 6 6 1zM12 54l12-4 1-6-6-1zM52 54l-12-4-1-6 6-1z"/>
        </g>
        <path d="M20 22c6-4 10-4 12-10 2 6 6 6 12 10" fill="none" stroke="#fff0a0" strokeWidth="1.5"/>
    </>,
    onyxBlackMage: <>
        <path d="M30 6a4 4 0 1 1 4 0v6h-4z" fill="#d6d9e0" stroke="#5a5f6a" strokeWidth="1.5"/>
        <path d="M32 10c-3 10-14 18-28 20 10 4 18 2 24-2-2 6-8 12-16 18 10 0 18-6 20-12 2 6 10 12 20 12-8-6-14-12-16-18 6 4 14 6 24 2-14-2-25-10-28-20z" fill="#f3f4f8" stroke="#9aa1b5" strokeWidth="1.5"/>
        <path d="M32 14l10 12-10 26-10-26z" fill="#0d0b14" stroke="#4a4660" strokeWidth="2"/>
        <path d="M32 14l10 12H22z" fill="#2a2440"/>
        <circle cx="32" cy="30" r="4" fill="#ffd166"/>
        <path d="M32 36v10" stroke="#ffd166" strokeWidth="1.5"/>
        <path d="M26 24l-2-6M38 24l2-6" stroke="#e9c46a" strokeWidth="1.5" strokeLinecap="round"/>
    </>,
};
/** v3.14 public/art/onyx 에 그림이 있으면 그 그림(원작 도트, 확대 시 픽셀 유지), 없거나 못 불러오면 SVG. */
export function OnyxArt({ id, size = 48, className = '' }: { id: string; size?: number; className?: string }) {
    const art = ART[id], src = onyxArtSrc(id);
    const [state, setState] = useState<'pending' | 'ready' | 'missing'>(src ? 'pending' : 'missing');
    if (!art && !src) return null;
    return <span className={`onyx-art ${state} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
        {state !== 'ready' && art && <svg width={size} height={size} viewBox="0 0 64 64" role="img">{art}</svg>}
        {state !== 'missing' && src && (
            // eslint-disable-next-line @next/next/no-img-element -- 선택적 정적 파일: 없으면 onError로 SVG에 머무릅니다.
            <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" onLoad={() => setState('ready')} onError={() => setState('missing')}/>
        )}
    </span>;
}
