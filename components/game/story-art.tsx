'use client';
/**
 * v3.216 스토리 삽화: 장 배너와 장면 그림.
 * public/art/story/{chapter-N | 장면 id}.png|webp 가 있으면 그 그림을 쓰고(목록은 art-manifest.ts), 장 배너는 그림이 없거나 못 불러오면 아래 SVG 풍경을 씁니다.
 * v3.217 장면 그림도 파일이 없으면 장면마다 그린 SVG(story-scenes.tsx)를 씁니다. 그림 만들기 안내 · 프롬프트는 docs/art/story-prompts.md.
 */
import { useState, type ReactNode } from 'react';
import { storyArtSrc } from '@/game/data/art';
import { SCENE_ART } from './story-scenes';

/** 장 배너 SVG(640×160). 원작 그림은 쓰지 않고 장마다 상징 풍경을 실루엣으로 그렸습니다. */
const BANNERS: ReactNode[] = [
    // 제1장 · 판게아의 문: 새벽 항구 · 선착장 · 등대
    <>
        <defs><linearGradient id="sb0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b3a4a"/><stop offset=".55" stopColor="#d99a62"/><stop offset=".62" stopColor="#f2c58a"/><stop offset="1" stopColor="#0f2a33"/></linearGradient></defs>
        <rect width="640" height="160" fill="url(#sb0)"/>
        <circle cx="430" cy="96" r="26" fill="#ffe2a8" opacity=".85"/>
        <path d="M0 100h640v60H0z" fill="#123540" opacity=".9"/>
        <path d="M0 108c80-6 160 6 240 0s160-6 240 0 120 6 160 0" stroke="#f6d39b" strokeWidth="1.5" fill="none" opacity=".5"/>
        <path d="M0 122c90-5 170 5 260 0s180-5 260 0 90 4 120 0" stroke="#f6d39b" strokeWidth="1" fill="none" opacity=".3"/>
        <path d="M40 96h210v6H40z" fill="#0b1c22"/>
        {[60, 100, 140, 180, 220].map(x => <path key={x} d={`M${x} 102v26`} stroke="#0b1c22" strokeWidth="5"/>)}
        <path d="M520 100l10-58h14l10 58z" fill="#0b1c22"/><path d="M524 40h26l-4-10h-18z" fill="#0b1c22"/>
        <path d="M537 34l-90 22M537 34l80 26" stroke="#ffe7b3" strokeWidth="6" opacity=".18"/>
        <path d="M300 92c10-14 30-14 40 0z" fill="#0b1c22"/><path d="M318 92V62l18 22z" fill="#0b1c22" opacity=".9"/>
        <path d="M150 30c6-3 10-3 14 0M176 22c5-3 9-3 12 0" stroke="#2a3c44" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </>,
    // 제2장 · 생을 거듭하는 자: 불타는 봉우리(발록 · 자쿰)와 돌아오는 고리
    <>
        <defs><linearGradient id="sb1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a0f1a"/><stop offset=".7" stopColor="#6e2416"/><stop offset="1" stopColor="#25100c"/></linearGradient>
            <radialGradient id="sb1g" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#ffcf7a" stopOpacity=".9"/><stop offset="1" stopColor="#ff7a2a" stopOpacity="0"/></radialGradient></defs>
        <rect width="640" height="160" fill="url(#sb1)"/>
        <circle cx="320" cy="70" r="70" fill="url(#sb1g)" opacity=".6"/>
        <circle cx="320" cy="70" r="44" fill="none" stroke="#ffd59a" strokeWidth="2" strokeDasharray="6 8" opacity=".7"/>
        <circle cx="320" cy="70" r="30" fill="none" stroke="#ffd59a" strokeWidth="1" opacity=".5"/>
        <path d="M0 160l80-70 50 34 70-74 60 60 60-40 70 50 60-66 70 70 60-30 60 66z" fill="#140a0a"/>
        <path d="M200 50l-8 22 14-8zM470 50l-6 20 12-8z" fill="#ff8a3a" opacity=".8"/>
        {[[120, 40], [520, 30], [380, 20], [250, 26]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.6" fill="#ffb36b"/>)}
    </>,
    // 제3장 · 시간의 끝에서: 시계탑 · 신전 기둥 · 달 · 아케인 강
    <>
        <defs><linearGradient id="sb2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d1030"/><stop offset=".75" stopColor="#2c3a78"/><stop offset="1" stopColor="#0b0f22"/></linearGradient></defs>
        <rect width="640" height="160" fill="url(#sb2)"/>
        <circle cx="120" cy="44" r="22" fill="#e6e8ff" opacity=".9"/><circle cx="130" cy="38" r="20" fill="#1a2050" opacity=".55"/>
        {[[40, 20], [220, 30], [300, 14], [600, 24], [560, 50], [470, 18]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.4" fill="#cfd6ff"/>)}
        <path d="M290 160V60l30-28 30 28v100z" fill="#0a0c1e"/>
        <circle cx="320" cy="72" r="14" fill="#1d2552" stroke="#a9b4ff" strokeWidth="2"/>
        <path d="M320 72V62M320 72l8 4" stroke="#e6e8ff" strokeWidth="2" strokeLinecap="round"/>
        {[400, 430, 460, 490].map(x => <path key={x} d={`M${x} 160V92h12v68z`} fill="#0a0c1e"/>)}
        <path d="M392 92h112v-8H392z" fill="#0a0c1e"/>
        <path d="M0 140c120-10 240 12 360 0s200-12 280 0v20H0z" fill="#7b5cff" opacity=".35"/>
        <path d="M0 148c140-8 260 8 380 0s180-8 260 0" stroke="#c7b8ff" strokeWidth="1.5" fill="none" opacity=".6"/>
    </>,
    // 제4장 · 두 번째 바다: 깊은 바다와 맥박 치는 보스 코어
    <>
        <defs><linearGradient id="sb3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d3a44"/><stop offset="1" stopColor="#04121a"/></linearGradient>
            <radialGradient id="sb3g" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#9ff3e0"/><stop offset=".4" stopColor="#3fc6b0" stopOpacity=".6"/><stop offset="1" stopColor="#3fc6b0" stopOpacity="0"/></radialGradient></defs>
        <rect width="640" height="160" fill="url(#sb3)"/>
        {[80, 200, 330, 450, 560].map((x, i) => <path key={x} d={`M${x} 0l${20 + i * 4} 160`} stroke="#bff6ee" strokeWidth="18" opacity=".05"/>)}
        <circle cx="320" cy="88" r="56" fill="url(#sb3g)"/>
        <path d="M320 60l16 28-16 28-16-28z" fill="#e6fffa" opacity=".9"/><path d="M320 70l8 18-8 18-8-18z" fill="#3fc6b0"/>
        <path d="M0 150c40-18 70-6 110-20s60 10 100 0 80-24 120-6 90 10 130-4 80 6 180 0v40H0z" fill="#03100f"/>
        {[[60, 120, 8], [120, 70, 5], [520, 100, 7], [580, 60, 4], [440, 40, 3], [200, 40, 4]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} fill="none" stroke="#bff6ee" strokeWidth="1.2" opacity=".5"/>)}
    </>,
    // 제5장 · 숫자의 그림자: 네온 도시와 흘러내리는 숫자
    <>
        <defs><linearGradient id="sb4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c0a1e"/><stop offset="1" stopColor="#1e1238"/></linearGradient></defs>
        <rect width="640" height="160" fill="url(#sb4)"/>
        {Array.from({ length: 14 }, (_, i) => <text key={i} x={20 + i * 46} y={16 + (i * 37) % 60} fill="#4dffb4" opacity=".28" fontSize="11" fontFamily="monospace" style={{ writingMode: 'vertical-rl' }}>{(i * 7919 % 100000).toString(2).slice(0, 8)}</text>)}
        <path d="M0 160V96h40V70h30v26h24V54h36v42h20V80h34v80zM230 160V64h28V40h40v24h22v96zM340 160V88h36V58h30v30h26V72h40v88zM480 160V50h44v30h30V66h40v94z" fill="#08061a"/>
        {[[50, 80], [110, 66], [250, 52], [280, 78], [360, 100], [390, 70], [500, 62], [540, 92], [600, 80], [160, 110]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="6" height="4" fill={x % 3 ? '#ff4fd8' : '#4dd8ff'} opacity=".8"/>)}
        <path d="M0 150h640" stroke="#ff4fd8" strokeWidth="2" opacity=".55"/><path d="M0 154h640" stroke="#4dd8ff" strokeWidth="1" opacity=".4"/>
        <path d="M120 120l30-24 30 18 40-34 40 20 40-30" stroke="#e8746b" strokeWidth="2" fill="none" opacity=".8"/>
    </>,
    // 제6장 · 판게아 너머: 수평선 위의 열린 문과 배
    <>
        <defs><linearGradient id="sb5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f1a2e"/><stop offset=".6" stopColor="#3a4f7a"/><stop offset="1" stopColor="#0d1824"/></linearGradient>
            <linearGradient id="sb5d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff3c4"/><stop offset="1" stopColor="#d4b579" stopOpacity=".2"/></linearGradient></defs>
        <rect width="640" height="160" fill="url(#sb5)"/>
        {[[60, 24], [140, 40], [500, 20], [560, 44], [610, 16], [260, 18], [380, 30]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.5" fill="#fff3c4"/>)}
        <path d="M296 104V44a24 24 0 0 1 48 0v60z" fill="url(#sb5d)" opacity=".9"/>
        <path d="M290 104V44a30 30 0 0 1 60 0v60" stroke="#d4b579" strokeWidth="3" fill="none"/>
        <path d="M320 104L200 160h240z" fill="#fff3c4" opacity=".12"/>
        <path d="M0 104h640v56H0z" fill="#0b1522" opacity=".85"/>
        <path d="M0 114c100-6 200 6 300 0s200-6 340 0" stroke="#d4b579" strokeWidth="1.2" fill="none" opacity=".45"/>
        <path d="M150 112h70l-10 12h-50z" fill="#05090f"/><path d="M184 112V78l22 30z" fill="#05090f"/><path d="M182 112V84l-16 24z" fill="#05090f" opacity=".85"/>
    </>,
];

function Img({ src, alt, onMissing }: { src: string; alt: string; onMissing?: () => void }) {
    const [ok, setOk] = useState(false);
    // eslint-disable-next-line @next/next/no-img-element -- 선택적 정적 파일: 없거나 못 불러오면 onError로 SVG · 빈칸에 머뭅니다.
    return <img src={src} alt={alt} loading="lazy" decoding="async" className={ok ? 'ready' : ''} onLoad={() => setOk(true)} onError={() => onMissing?.()}/>;
}

/** 장 배너: 그림 파일(chapter-N)이 있으면 그 그림, 없거나 실패하면 SVG. 잠긴 장은 흐리게. */
export function ChapterBanner({ chapter, title, dim = false }: { chapter: number; title: string; dim?: boolean }) {
    const src = storyArtSrc(`chapter-${chapter}`), [failed, setFailed] = useState(false);
    return <figure className={`story-banner ${dim ? 'dim' : ''}`} aria-label={`${title} 삽화`}>
        {(!src || failed) && <svg viewBox="0 0 640 160" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">{BANNERS[chapter] ?? BANNERS[0]}</svg>}
        {src && !failed && <Img src={src} alt="" onMissing={() => setFailed(true)}/>}
    </figure>;
}
/** 장면 삽화: 그림 파일(장면 id)이 있으면 그 그림, 없거나 실패하면 장면 SVG(없는 장면은 그림 없이). */
export function SceneArt({ id, title }: { id: string; title: string }) {
    const src = storyArtSrc(id), [failed, setFailed] = useState(false), svg = SCENE_ART[id];
    if ((!src || failed) && !svg) return null;
    return <figure className="story-scene-art" aria-label={`${title} 삽화`}>
        {(!src || failed) && svg && <svg viewBox="0 0 480 160" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">{svg(id)}</svg>}
        {src && !failed && <Img src={src} alt="" onMissing={() => setFailed(true)}/>}
    </figure>;
}
