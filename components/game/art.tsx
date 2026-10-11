'use client';
import { useSceneLook } from './scene-look-setting';
import { useState, memo, type ReactNode } from 'react';
import { Compass, Coins, Droplets, Shield, Sparkles, Swords, Wand2, Atom } from 'lucide-react';
import type { Job } from '@/game/data/classes';
import { lineageOf } from '@/game/data/classes';
import { monsterArtSrc, monsterShape, jobArtSrc, type MonsterShape } from '@/game/data/art';

/**
 * 몬스터 실루엣(64×64). 이미지가 없거나 아직 안 왔을 때 그대로 남습니다.
 * v27.42 메이플 몬스터 모양. 조각마다 따로 칠해 겹쳐도 비지 않고, 조각 안의 눈·무늬는 구멍(evenodd)으로 뚫립니다.
 */
const SHAPES: Record<MonsterShape, string[]> = {
    snail: [
        'M4 54c0-5 3-9 8-11V28c0-4 2-6 5-6s5 2 5 6v14h32c4 0 7 5 7 12zM15 30a2 2 0 1 0 4 0 2 2 0 1 0-4 0z',
        'M13 23l-5-11 2-1 5 10zM20 23l4-11 2 1-4 11z',
        'M26 30a14 14 0 1 0 28 0 14 14 0 1 0-28 0zM35 30a5 5 0 1 0 10 0 5 5 0 1 0-10 0z',
    ],
    mushroom: [
        'M6 32C6 16 18 6 32 6s26 10 26 26zM18 20a4 4 0 1 0 8 0 4 4 0 1 0-8 0zM38 14a4 4 0 1 0 8 0 4 4 0 1 0-8 0z',
        'M16 31h32v17c0 6-6 10-16 10s-16-4-16-10zM24 38h3v7h-3zM37 38h3v7h-3z',
    ],
    slime: ['M32 10c4 0 6 4 6 8 12 2 20 14 20 26 0 8-6 12-26 12S6 52 6 44c0-12 8-24 20-26 0-4 2-8 6-8zM22 36a3 4 0 1 0 6 0 3 4 0 1 0-6 0zM36 36a3 4 0 1 0 6 0 3 4 0 1 0-6 0z'],
    pig: [
        'M8 34c0-12 12-20 26-20s24 8 24 20-10 18-24 18S8 46 8 34zM18 26a2 2 0 1 0 4 0 2 2 0 1 0-4 0z',
        'M2 30h10v10H2zM4 33h2v4H4zM8 33h2v4H8z',
        'M14 20l4-12 7 9zM30 15l6-9 4 11z',
        'M16 48h6v10h-6zM40 48h6v10h-6z',
        'M56 30c4-3 7-1 6 3l-2-1c0-1-1-1-3 0z',
    ],
    boar: [
        'M6 38c0-14 12-24 28-24 6 0 10-2 16 0 6 2 10 10 10 20 0 10-8 16-26 16S6 48 6 38zM14 30a2 2 0 1 0 4 0 2 2 0 1 0-4 0z',
        'M24 15l3-9 4 8zM33 13l4-9 3 9zM42 13l5-8 2 10z',
        'M8 40l-6 4 8 0z',
        'M14 50h7v8h-7zM40 50h7v8h-7z',
    ],
    golem: [
        'M24 4h16v14H24zM28 9h3v3h-3zM33 9h3v3h-3z',
        'M14 20h36v24H14z',
        'M3 22h9v26H3zM52 22h9v26h-9z',
        'M17 46h11v12H17zM36 46h11v12H36z',
    ],
    eye: [
        'M6 30a20 20 0 1 0 40 0 20 20 0 1 0-40 0zM16 30a10 10 0 1 0 20 0 10 10 0 1 0-20 0z',
        'M21 30a5 5 0 1 0 10 0 5 5 0 1 0-10 0z',
        'M44 38c8 2 12 10 16 18-8-2-14-6-18-12z',
    ],
    monkey: [
        'M18 18a14 13 0 1 0 28 0 14 13 0 1 0-28 0zM25 16a2.5 3 0 1 0 5 0 2.5 3 0 1 0-5 0zM34 16a2.5 3 0 1 0 5 0 2.5 3 0 1 0-5 0z',
        'M9 18a5 5 0 1 0 10 0 5 5 0 1 0-10 0zM45 18a5 5 0 1 0 10 0 5 5 0 1 0-10 0z',
        'M22 31h20l4 18H18z',
        'M20 48h8v10h-8zM36 48h8v10h-8z',
        'M45 44c8 0 13-4 13-12h4c0 10-8 16-18 16z',
    ],
    drake: [
        'M14 42c0-8 10-14 22-14s18 6 18 14-8 10-20 10-20-2-20-10z',
        'M44 32l6-16h8l3 6-7 2-5 10zM53 18h2v2h-2z',
        'M24 30L16 4l12 10 7-7 5 23z',
        'M20 50h6v8h-6zM40 50h6v8h-6z',
        'M15 42L2 34l2 12 12 2z',
    ],
    ghost: ['M32 6c12 0 20 10 20 24v24l-6-6-6 6-8-8-8 8-6-6-6 6V30C12 16 20 6 32 6zm-8 20a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm16 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
    skeleton: [
        'M22 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0zM26 10h4v4h-4zM34 10h4v4h-4z',
        'M30 21h4v25h-4z',
        'M23 24h18v4H23zM23 31h18v4H23zM23 38h18v4H23z',
        'M17 24h4v20h-4zM43 24h4v20h-4z',
        'M50 10h3v34h-3zM45 38h13v3H45z',
        'M23 45h18v4H23z',
        'M24 49h5v9h-5zM35 49h5v9h-5z',
    ],
    octopus: [
        'M12 28c0-12 9-20 20-20s20 8 20 20c0 6-4 10-8 12H20c-4-2-8-6-8-12zM22 26a3 3 0 1 0 6 0 3 3 0 1 0-6 0zM36 26a3 3 0 1 0 6 0 3 3 0 1 0-6 0z',
        'M19 39h6l-4 17-6-2zM30 39h4v19h-4zM39 39h6l4 15-6 2z',
        'M14 37l5 3-11 11-3-3zM50 37l-5 3 11 11 3-3z',
    ],
    bat: [
        'M23 30a9 9 0 1 0 18 0 9 9 0 1 0-18 0zM27 28a2 2 0 1 0 4 0 2 2 0 1 0-4 0zM33 28a2 2 0 1 0 4 0 2 2 0 1 0-4 0z',
        'M24 28L3 16l5 12-5 12 13-5 8 2zM40 28l21-12-5 12 5 12-13-5-8 2z',
        'M26 23l-2-9 7 6zM38 23l2-9-7 6z',
        'M31 39h2v10h-2z',
    ],
    crab: [
        'M18 32a14 11 0 1 0 28 0 14 11 0 1 0-28 0zM25 28a2 2 0 1 0 4 0 2 2 0 1 0-4 0zM35 28a2 2 0 1 0 4 0 2 2 0 1 0-4 0z',
        'M4 10l10-2 4 8-6 2-2-4-4 2zM60 10l-10-2-4 8 6 2 2-4 4 2z',
        'M14 17l4-1 6 10-3 2zM50 17l-4-1-6 10 3 2z',
        'M14 38l-9 7 3 3 9-6zM50 38l9 7-3 3-9-6zM22 42l-5 12h4l5-10zM42 42l5 12h-4l-5-10z',
    ],
    croc: [
        'M2 36c4-3 10-5 18-5h24c8 0 14 3 18 7-6 3-12 4-18 4l-24 1c-8 0-14-3-18-7zM4 36h14v1H4z',
        'M17 29a3 3 0 1 0 6 0 3 3 0 1 0-6 0z',
        'M22 41h6v9h-6zM40 41h6v9h-6z',
        'M28 31l3-4 3 4zM36 31l3-4 3 4zM44 32l3-4 3 4z',
    ],
    snake: ['M6 40c6-10 14-12 22-8s14 4 20-2 8-14 10-18c2 6 0 14-6 20s-14 8-22 6-14-2-20 6l-4-4zm40-22a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'],
    bubble: [
        'M10 36a14 14 0 1 0 28 0 14 14 0 1 0-28 0zM17 34a2.5 3 0 1 0 5 0 2.5 3 0 1 0-5 0zM26 34a2.5 3 0 1 0 5 0 2.5 3 0 1 0-5 0z',
        'M38 18a8 8 0 1 0 16 0 8 8 0 1 0-16 0z',
        'M42 46a7 7 0 1 0 14 0 7 7 0 1 0-14 0z',
        'M8 12a5 5 0 1 0 10 0 5 5 0 1 0-10 0z',
    ],
    chest: [
        'M8 30h48v26H8zM29 38h6v10h-6z',
        'M8 27l4-17h40l4 17zM16 27l3-6 3 6zM26 27l3-6 3 6zM36 27l3-6 3 6zM46 27l3-6 3 6z',
    ],
    demon: [
        'M24 6h16v14H24zM27 11h4v3h-4zM33 11h4v3h-4z',
        'M23 8L14 0l5 12zM41 8l9-8-5 12z',
        'M20 22h24l4 24H16z',
        'M18 26L2 12l4 24 12 6zM46 26l16-14-4 24-12 6z',
        'M20 46h9v12h-9zM35 46h9v12h-9z',
    ],
    mage: [
        'M26 14a6 6 0 1 0 12 0 6 6 0 1 0-12 0z',
        'M20 9l12-9 12 9z',
        'M25 21h14l10 37H15z',
        'M51 12h3v46h-3z',
        'M49 8a4 4 0 1 0 8 0 4 4 0 1 0-8 0z',
    ],
    fighter: [
        'M26 9a6 6 0 1 0 12 0 6 6 0 1 0-12 0z',
        'M22 17h20l-2 23H24z',
        'M8 18h14v5H8zM42 18h14v5H42z',
        'M3 15h6v10H3zM55 15h6v10h-6z',
        'M24 40h6l-2 18h-6zM34 40h6l2 18h-6z',
    ],
    statue: [
        'M22 4h20v54H22zM26 12h5v4h-5zM33 12h5v4h-5zM28 22h8v3h-8z',
        'M8 16h14v4H8zM8 28h14v4H8zM8 40h14v4H8zM42 16h14v4H42zM42 28h14v4H42zM42 40h14v4H42z',
        'M3 12h6v12H3zM3 24h6v12H3zM3 36h6v12H3zM55 12h6v12h-6zM55 24h6v12h-6zM55 36h6v12h-6z',
    ],
    // v3.286 더스크: 형체 없는 덩어리에 눈이 여럿, 아래로 늘어진 촉수.
    dusk: [
        'M6 34C6 16 18 6 32 6s26 10 26 28c0 6-4 10-8 10H14c-4 0-8-4-8-10zM16 24a4 4 0 1 0 8 0 4 4 0 1 0-8 0zM28 16a5 5 0 1 0 10 0 5 5 0 1 0-10 0zM40 26a4 4 0 1 0 8 0 4 4 0 1 0-8 0zM24 34a3 3 0 1 0 6 0 3 3 0 1 0-6 0zM36 36a3 3 0 1 0 6 0 3 3 0 1 0-6 0z',
        'M12 42l-4 18 6-4 2-14zM24 44l-2 18 5-6 1-12zM36 44l2 18 3-6-1-12zM48 42l6 18-6-4-4-14z',
    ],
    // v3.286 듄켈: 뿔 투구 · 펄럭이는 망토 · 어깨에 멘 대검.
    dunkel: [
        'M26 6h12v12H26zM29 10h2v3h-2zM33 10h2v3h-2zM26 7l-4-6 6 4zM38 7l4-6-6 4z',
        'M22 20h20l2 22H20z',
        'M20 22L8 56h14l2-14zM44 22l12 34H42l-2-14z',
        'M23 42h7l-1 16h-7zM34 42h7l2 16h-7z',
        'M44 4l4-2 14 30-3 2zM42 2l6 2-1 3-6-2z',
    ],
    // v3.286 윌: 거미 다리 여섯 위에 선 거울의 마법사.
    will: [
        'M27 6h10v10H27zM29 10h2v2h-2zM33 10h2v2h-2z',
        'M24 18h16l2 18H22z',
        'M24 30L6 22 2 34l6-6zM24 34L4 40l2 12 4-10zM26 36L14 58h4l10-18zM40 30l18-8 4 12-6-6zM40 34l20 6-2 12-4-10zM38 36l12 22h-4L36 40z',
        'M44 4h12v14H44zM46 6h8v10h-8z',
    ],
    // v3.286 루시드: 나비 날개 넷과 왕관을 쓴 요정 여왕.
    lucid: [
        'M28 8h8v10h-8zM29 4l3 3 3-3v4h-6z',
        'M27 18h10l4 24H23z',
        'M28 22C16 6 2 8 4 22c2 10 14 10 24 6zM36 22C48 6 62 8 60 22c-2 10-14 10-24 6zM27 30C14 32 8 44 16 50c6 4 12-6 12-16zM37 30c13 2 19 14 11 20-6 4-12-6-12-16z',
        'M26 42h5l-1 16h-4zM33 42h5l0 16h-4z',
    ],
    // v3.286 진 힐라: 두건 쓴 사령술사 · 긴 낫 · 떠도는 혼불.
    hilla: [
        'M24 6c4-4 12-4 16 0l2 12H22zM28 12h2v3h-2zM34 12h2v3h-2z',
        'M22 18h20l6 40H16z',
        'M10 4l2-1 2 55h-3zM12 4c-6 0-10 4-10 10 4-4 8-5 12-4z',
        'M48 10a4 4 0 1 0 8 0 4 4 0 1 0-8 0zM54 26a3 3 0 1 0 6 0 3 3 0 1 0-6 0z',
    ],
    // v3.286 세렌: 태양 후광 · 긴 창을 든 사제.
    seren: [
        'M22 14a10 10 0 1 0 20 0 10 10 0 1 0-20 0zM28 14a4 4 0 1 0 8 0 4 4 0 1 0-8 0z',
        'M30 0h4v4h-4zM16 6l3-3 3 3-3 3zM42 6l3-3 3 3-3 3zM12 16h4v4h-4zM48 16h4v4h-4z',
        'M24 26h16l4 32H20z',
        'M52 2l3 0 1 56h-3zM50 2l4-2 4 2-4 8z',
        'M24 28l-12 14 4 2 10-10zM40 28l10 6-2 3-9-5z',
    ],
    // v3.286 검은 마법사: 날개처럼 펼친 큰 외투 · 뒤의 고리 · 지팡이.
    blackmage: [
        'M14 18a18 18 0 1 0 36 0 18 18 0 1 0-36 0zM18 18a14 14 0 1 0 28 0 14 14 0 1 0-28 0z',
        'M27 10h10v12H27zM29 15h2v2h-2zM33 15h2v2h-2z',
        'M24 22h16l10 36H14z',
        'M24 24L2 18l8 14-6 6 16-2zM40 24l22-6-8 14 6 6-16-2z',
        'M48 30h3v28h-3zM46 26a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0z',
    ],
    // v3.285 스우: 볏 달린 투구 · 넓은 검은 날개 · 떠 있는 기계 팔.
    swoo: [
        'M26 6h12v10H26zM29 10h2v3h-2zM33 10h2v3h-2z',
        'M30 6l2-6 2 6z',
        'M22 18h20l3 22H19z',
        'M22 20L2 8l6 22-6 8 16-4zM42 20l20-12-6 22 6 8-16-4z',
        'M23 40h7l-1 18h-7zM34 40h7l2 18h-7z',
        'M50 40h10v6H50zM52 46h3v6h-3zM56 46h3v6h-3z',
    ],
    // v3.285 데미안: 뿔 · 한쪽만 큰 타락한 날개 · 큰 검.
    damien: [
        'M26 8h12v12H26zM29 13h2v3h-2zM33 13h2v3h-2z',
        'M26 9l-6-8 3 10zM38 9l6-8-3 10z',
        'M22 22h20l2 22H20z',
        'M42 24L64 6l-6 20 4 6-14 2z',
        'M22 24L10 18l4 12z',
        'M6 6l4-2 14 36-3 2zM4 2l7 4-2 3-6-4z',
        'M22 44h8v14h-8zM34 44h8v14h-8z',
    ],
    clock: [
        'M10 28a22 22 0 1 0 44 0 22 22 0 1 0-44 0zM30 12h4v17h-4zM33 27l12 6-2 3-12-6z',
        'M16 48h9v10h-9zM39 48h9v10h-9z',
        'M24 4h16v4H24z',
    ],
};

/** 몬스터 그림. public/art/monsters/{id}.png|webp 가 목록(art-manifest)에 있으면 그 그림, 없으면 실루엣. */
type MonsterArtProps = { id: string; size?: number; className?: string; boss?: boolean };
/** v3.192 id가 바뀌면 불러오기 상태를 새로 시작합니다(key). 호루라기로 부른 몬스터처럼 장면의 몬스터가 내려가지 않고 바로 바뀌면, 앞 몬스터의 상태(ready · missing)가 남아 그림이 사라지거나 실루엣에 머물렀습니다. */
export function MonsterArt(props: MonsterArtProps) {
    return <MonsterArtImage key={props.id} {...props}/>;
}
function MonsterArtImage({ id, size = 48, className = '', boss = false }: MonsterArtProps) {
    const src = monsterArtSrc(id);
    const [state, setState] = useState<'pending' | 'ready' | 'missing'>(src ? 'pending' : 'missing');
    const shape = monsterShape(id);
    return <span className={`monster-art ${state} shape-${shape} ${boss ? 'boss' : ''} ${className}`} style={{ width: size, height: size }} aria-hidden>
        {state !== 'ready' && <svg viewBox="0 0 64 64" width={size} height={size} className="monster-silhouette">{SHAPES[shape].map((d, i) => <path key={i} d={d} fill="currentColor" fillRule="evenodd"/>)}</svg>}
        {state !== 'missing' && src && (
            // eslint-disable-next-line @next/next/no-img-element -- 선택적 정적 파일: 없으면 onError로 실루엣에 머무릅니다.
            <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" onLoad={() => setState('ready')} onError={() => setState('missing')}/>
        )}
    </span>;
}

const TREE_ICON = { physical: Swords, magic: Wand2, defense: Shield, status: Droplets, hybrid: Atom, support: Coins, mystery: Sparkles } as const;
/** 직업 그림. 계보 단위로 public/art/jobs/{lineageId}.png|webp 가 목록에 있으면 쓰고, 없으면 계열 아이콘. */
export function JobArt({ job, size = 48, className = '' }: { job: Job; size?: number; className?: string }) {
    const src = jobArtSrc(lineageOf(job));
    const [state, setState] = useState<'pending' | 'ready' | 'missing'>(src ? 'pending' : 'missing');
    const Icon = TREE_ICON[job.tree as keyof typeof TREE_ICON] ?? Compass;
    return <span className={`job-art ${state} tree-${job.tree} ${className}`} style={{ width: size, height: size }} aria-hidden>
        {state !== 'ready' && <Icon size={Math.round(size * .55)} className="job-silhouette"/>}
        {state !== 'missing' && src && (
            // eslint-disable-next-line @next/next/no-img-element -- 선택적 정적 파일: 없으면 onError로 아이콘에 머무릅니다.
            <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" onLoad={() => setState('ready')} onError={() => setState('missing')}/>
        )}
    </span>;
}

/**
 * v27.51 전투 장면 배경(바다 그림 대체). 메이플 필드풍 실루엣을 사냥터 색(--stage-tone)으로 물들입니다.
 * 그림 파일 없이 SVG라 가볍고, 기존 연출(ocean-art 흔들림)을 그대로 받도록 같은 클래스를 씁니다.
 * v3.262 지역별 배경(theme): 항구 · 마을 · 협곡 · 숲 · 도시 · 바닷속 · 용의 둥지 · 신전 · 아케인 · 늪 · 설산. 하늘 · 빛 · 앞쪽 땅은 공통입니다.
 */
export type BackdropTheme = 'harbor' | 'village' | 'canyon' | 'forest' | 'city' | 'underwater' | 'dragon' | 'temple' | 'arcane' | 'swamp' | 'mountain';
const THEME_RULES: [RegExp, BackdropTheme][] = [
    [/아쿠아|바닷|산호|수중/, 'underwater'], [/리스항구|항구|해안/, 'harbor'], [/헤네시스|버섯/, 'village'], [/페리온|화구|유적/, 'canyon'],
    [/커닝시티|지하 수로|도시/, 'city'], [/엘리니아|숲|요정/, 'forest'], [/리프레|용의|드래곤/, 'dragon'], [/시간의 신전|신전|기억/, 'temple'],
    [/아케인|소멸|레헬른|츄츄/, 'arcane'], [/슬리피우드|개미굴|늪|묘지/, 'swamp'], [/무릉|엘나스|설원|산맥|폐광/, 'mountain'],
];
/** 지역 · 사냥터 · 던전 이름으로 배경 테마를 고릅니다. 맞는 게 없으면 마을(기존 언덕 · 버섯 집). */
export const backdropTheme = (...names: (string | undefined)[]): BackdropTheme => { const text = names.filter(Boolean).join(' '); return THEME_RULES.find(([re]) => re.test(text))?.[1] ?? 'village'; };
const TONE = 'var(--stage-tone, #5c9dba)';
const FAR_RIDGE = 'M0 610 L130 470 L240 560 L380 400 L520 540 L640 450 L780 580 L930 430 L1080 560 L1230 420 L1380 540 L1536 460 V1024 H0Z';
const HILLS = 'M0 700 C160 620 300 640 440 690 S760 610 920 660 S1240 700 1380 640 L1536 620 V1024 H0Z';
const BUSH = 'c-10-18 4-30 14-22 4-14 22-14 24 2 14-6 24 8 14 20 10 10-2 24-14 18-2 14-20 16-24 2-12 8-26-6-14-20z';
const THEME_ART: Record<BackdropTheme, ReactNode> = {
    village: <>
        <path d={FAR_RIDGE} fill={TONE} opacity=".22"/><path d={HILLS} fill="#10303a"/>
        <g fill="#0d2830"><path d="M150 700 l38-120 38 120z M200 690 l30-95 30 95z M1290 660 l40-130 40 130z M1350 655 l30-100 30 100z"/><path d="M560 690 c0-40 30-62 62-62s62 22 62 62z M598 690 h48 v40 h-48z"/><path d="M980 670 c0-30 22-46 46-46s46 16 46 46z M1008 670 h36 v30 h-36z"/></g>
        <g fill={TONE} opacity=".35"><path d={`M330 640 ${BUSH}`}/><path d={`M1180 600 ${BUSH}`}/><path d={`M760 560 ${BUSH}`}/></g>
    </>,
    harbor: <>
        <path d="M0 560 H1536 V1024 H0Z" fill={TONE} opacity=".28"/><path d="M0 600 H1536 V1024 H0Z" fill="#0f2a38"/>
        <g stroke="#e8f4ff" strokeOpacity=".18" strokeWidth="3"><path d="M120 640 h140 M420 690 h200 M820 650 h160 M1120 700 h220 M300 760 h120 M960 770 h180"/></g>
        <g fill="#0b2029"><path d="M120 600 h40 v-170 l-20-30 -20 30z"/><path d="M128 470 h24 v-20 h-24z" fill="#ffe9a8" opacity=".8"/><path d="M1060 610 h300 l-30 50 h-240z"/><path d="M1150 610 V420 M1250 610 V450" stroke="#0b2029" strokeWidth="8"/><path d="M1158 430 l80 60 -80 40z M1258 460 l70 50 -70 30z" fill="#16384a"/></g>
        <g fill="#0c2430"><path d="M500 700 h420 v20 h-420z"/><path d="M520 720 v90 M600 720 v90 M680 720 v90 M760 720 v90 M840 720 v90 M900 720 v90" stroke="#0c2430" strokeWidth="10"/></g>
    </>,
    canyon: <>
        <path d="M0 640 L60 470 L180 470 L220 560 L330 560 L380 380 L520 380 L560 560 L700 600 L760 450 L900 450 L960 600 L1100 620 L1150 420 L1300 420 L1360 580 L1536 560 V1024 H0Z" fill={TONE} opacity=".3"/>
        <path d="M0 720 C200 660 380 700 560 690 S900 640 1100 690 S1400 700 1536 660 V1024 H0Z" fill="#2a1f19"/>
        <g fill="#1d1612"><path d="M240 700 v-90 M240 640 l-30-30 M240 620 l26-26" stroke="#1d1612" strokeWidth="9" strokeLinecap="round"/><path d="M1240 690 h40 v-120 h-40z M1236 590 h48 v14 h-48z M1236 620 h48 v10 h-48z"/></g>
        <g fill="#ff8a3a" opacity=".25"><circle cx="700" cy="680" r="60"/><circle cx="1000" cy="700" r="40"/></g>
    </>,
    forest: <>
        <path d={FAR_RIDGE} fill={TONE} opacity=".16"/>
        <g fill="#0f2a26"><path d="M140 1024 V420 h70 V1024z M1260 1024 V380 h90 V1024z M720 1024 V500 h50 V1024z"/></g>
        <g fill="#163a33"><circle cx="175" cy="400" r="150"/><circle cx="1305" cy="360" r="170"/><circle cx="745" cy="470" r="110"/><circle cx="420" cy="520" r="90"/><circle cx="1020" cy="500" r="100"/></g>
        <path d={HILLS} fill="#10302b"/>
        <g fill="#c9ffe9" opacity=".7"><circle cx="330" cy="560" r="5"/><circle cx="560" cy="430" r="4"/><circle cx="910" cy="560" r="5"/><circle cx="1130" cy="440" r="4"/><circle cx="640" cy="620" r="3"/></g>
        <g fill={TONE} opacity=".35"><circle cx="330" cy="560" r="18"/><circle cx="910" cy="560" r="18"/></g>
    </>,
    city: <>
        <g fill={TONE} opacity=".2"><path d="M0 1024 V520 h90 v-60 h80 v100 h110 v-140 h90 v160 h120 v-90 h100 v120 h140 v-200 h80 v180 h120 v-110 h90 v150 h130 v-80 h110 v100 h86 V1024z"/></g>
        <g fill="#0d1f2a"><path d="M0 1024 V620 h140 v-80 h120 v120 h160 v-140 h110 v160 h150 v-60 h130 v90 h160 v-170 h100 v150 h170 v-90 h196 V1024z"/></g>
        <g fill="#ffd76a" opacity=".55"><rect x="30" y="660" width="14" height="10"/><rect x="70" y="690" width="14" height="10"/><rect x="290" y="560" width="14" height="10"/><rect x="330" y="600" width="14" height="10"/><rect x="590" y="560" width="14" height="10"/><rect x="620" y="610" width="14" height="10"/><rect x="900" y="520" width="14" height="10"/><rect x="940" y="560" width="14" height="10"/><rect x="1180" y="600" width="14" height="10"/><rect x="1400" y="660" width="14" height="10"/></g>
        <g fill="#ff5ad8" opacity=".55"><rect x="440" y="610" width="70" height="14" rx="4"/><rect x="1030" y="560" width="60" height="12" rx="4"/></g>
    </>,
    underwater: <>
        <rect width="1536" height="1024" fill="#06324a" opacity=".55"/>
        <g fill="#bfefff" opacity=".08"><path d="M300 0 L420 0 L260 900 L180 900Z"/><path d="M800 0 L900 0 L760 900 L690 900Z"/><path d="M1200 0 L1290 0 L1180 900 L1110 900Z"/></g>
        <path d="M0 760 C200 720 420 740 620 760 S1000 720 1200 740 L1536 730 V1024 H0Z" fill="#0b2a3a"/>
        <g fill="#14465a"><path d="M200 760 q-10-120 10-200 M240 760 q20-90-10-170 M1300 750 q-20-140 10-230 M1340 750 q20-100 0-180" stroke="#1d5a5a" strokeWidth="14" fill="none" strokeLinecap="round"/></g>
        <g fill="#ff8a8a" opacity=".55"><path d="M620 760 c-10-40 20-70 30-40 10-40 40-30 30 10 30-10 40 20 10 30z M980 750 c-10-30 16-50 26-30 10-30 34-20 26 10 24-6 30 16 8 22z"/></g>
        <g fill="none" stroke="#dff7ff" strokeOpacity=".5" strokeWidth="2"><circle cx="420" cy="500" r="8"/><circle cx="440" cy="440" r="5"/><circle cx="1100" cy="560" r="7"/><circle cx="1120" cy="500" r="4"/><circle cx="760" cy="380" r="6"/></g>
    </>,
    dragon: <>
        <g fill={TONE} opacity=".22"><path d="M0 1024 V560 L60 300 L120 560 V1024z M1360 1024 V520 L1430 220 L1500 520 V1024z"/><ellipse cx="560" cy="380" rx="120" ry="26"/><path d="M460 380 q100 90 200 0z"/><ellipse cx="1000" cy="300" rx="90" ry="20"/><path d="M925 300 q75 70 150 0z"/></g>
        <path d="M720 240 q40-30 80 0 q40-40 70 10 q-40-10-70 20 q-40-20-80-30z" fill="#0b1c22" opacity=".6"/>
        <path d="M0 720 C180 640 360 680 520 700 S860 620 1040 680 S1360 700 1536 640 V1024 H0Z" fill="#132a2a"/>
        <g fill="#0d2224"><path d="M260 720 V500 h40 V720z"/><circle cx="280" cy="470" r="80"/><path d="M1140 700 l50-160 50 160z"/></g>
    </>,
    temple: <>
        <g fill="#ffffff" opacity=".1"><ellipse cx="300" cy="420" rx="220" ry="40"/><ellipse cx="1150" cy="360" rx="260" ry="46"/><ellipse cx="760" cy="520" rx="300" ry="40"/></g>
        <circle cx="768" cy="380" r="170" fill="none" stroke={TONE} strokeOpacity=".35" strokeWidth="6"/><path d="M768 380 V250 M768 380 L860 430" stroke={TONE} strokeOpacity=".35" strokeWidth="8" strokeLinecap="round"/>
        <g fill="#1a2a3a"><path d="M180 760 V470 h50 V760z M330 760 V470 h50 V760z M1150 760 V470 h50 V760z M1300 760 V470 h50 V760z"/><path d="M150 470 h260 v-24 h-260z M1120 470 h260 v-24 h-260z"/></g>
        <path d="M0 760 H1536 V1024 H0Z" fill="#14202c"/><path d="M0 760 H1536" stroke={TONE} strokeOpacity=".3" strokeWidth="4"/>
    </>,
    arcane: <>
        <g opacity=".35"><path d="M0 300 C300 200 600 380 900 260 S1300 200 1536 300 V360 C1300 280 900 340 600 420 S200 300 0 380Z" fill="#9b6bff"/><path d="M0 420 C400 340 700 480 1000 380 S1400 360 1536 420 V450 C1300 400 1000 450 700 510 S300 420 0 470Z" fill="#5ef2c8"/></g>
        <path d="M0 700 C220 650 420 690 640 700 S1020 650 1240 690 L1536 670 V1024 H0Z" fill="#1b1430"/>
        <path d="M0 780 C300 740 600 800 900 770 S1300 760 1536 790 V830 C1200 800 900 830 600 840 S200 800 0 830Z" fill="#6bd6ff" opacity=".35"/>
        <g fill="#b48cff" opacity=".7"><path d="M300 700 l20-90 20 90z M330 700 l14-60 14 60z M1180 690 l24-110 24 110z M1220 690 l14-60 14 60z"/></g>
    </>,
    swamp: <>
        <path d={FAR_RIDGE} fill={TONE} opacity=".14"/>
        <rect y="380" width="1536" height="420" fill="#4f7a52" opacity=".12"/>
        <path d="M0 720 C200 690 420 710 620 720 S1000 690 1200 710 L1536 700 V1024 H0Z" fill="#14231c"/>
        <path d="M360 742 C470 724 700 724 860 740 S1080 760 1000 772 C820 790 520 786 380 770 S290 754 360 742Z" fill="#2c4a3a" opacity=".85"/>
        <g stroke="#9fd8b4" strokeOpacity=".22" strokeWidth="3"><path d="M430 752 h110 M620 760 h140 M820 750 h90 M520 772 h80"/></g>
        <g stroke="#0e1a14" strokeWidth="10" strokeLinecap="round" fill="none"><path d="M220 720 V520 M220 580 l-50-40 M220 560 l40-50"/><path d="M1260 710 V480 M1260 560 l-60-30 M1260 530 l50-60"/><path d="M760 720 V610 M760 640 l-30-20"/></g>
        <g stroke="#3f6b4c" strokeOpacity=".6" strokeWidth="3" fill="none"><path d="M170 540 v46 M186 552 v30 M260 512 v40 M1200 530 v52 M1216 540 v34 M1310 470 v44"/></g>
        <g fill="#0e1a14"><path d="M1000 716 h44 v-56 c0-26-44-26-44 0z M1080 720 h34 v-40 c0-20-34-20-34 0z"/><path d="M1012 672 h20 M1022 662 v26" stroke="#2c4a3a" strokeWidth="5"/></g>
        <g stroke="#1d3326" strokeWidth="5" strokeLinecap="round"><path d="M330 760 q-6-60 4-104 M350 764 q4-50-6-90 M900 762 q-4-56 8-96 M924 766 q6-40-2-74 M1420 740 q-6-60 6-100"/></g>
        <g fill="#2a1a12"><rect x="328" y="652" width="10" height="26" rx="5"/><rect x="896" y="660" width="10" height="26" rx="5"/><rect x="1420" y="636" width="10" height="26" rx="5"/></g>
        <g fill="#0f1f17"><path d="M560 712 c0-22 18-34 36-34s36 12 36 34z M590 712 h12 v18 h-12z M660 718 c0-14 12-22 24-22s24 8 24 22z M680 718 h8 v12 h-8z"/></g>
        <g fill="#b6ffcf"><circle cx="470" cy="610" r="5" opacity=".7"/><circle cx="1130" cy="590" r="4" opacity=".6"/><circle cx="860" cy="560" r="3" opacity=".5"/><circle cx="300" cy="630" r="3" opacity=".5"/></g>
        <g fill="#cfe8d8" opacity=".08"><ellipse cx="400" cy="700" rx="320" ry="30"/><ellipse cx="1100" cy="690" rx="360" ry="34"/></g>
    </>,
    mountain: <>
        <path d="M0 640 L200 360 L360 520 L560 260 L760 520 L940 340 L1120 560 L1300 300 L1536 560 V1024 H0Z" fill={TONE} opacity=".24"/>
        <g fill="#eef6ff" opacity=".55"><path d="M200 360 l-40 56 40-16 40 16z M560 260 l-56 76 56-22 56 22z M940 340 l-44 60 44-18 44 18z M1300 300 l-50 70 50-20 50 20z"/></g>
        <path d="M0 680 L160 540 L300 640 L470 500 L640 650 L820 560 L1000 660 L1180 520 L1360 640 L1536 560 V1024 H0Z" fill="#1a3448"/>
        <g fill="#dceaf6" opacity=".5"><path d="M470 500 l-36 34 36-10 36 10z M1180 520 l-38 36 38-12 38 12z M160 540 l-30 28 30-8 30 8z"/></g>
        <path d={HILLS} fill="#12283a"/>
        <path d="M0 700 C160 620 300 640 440 690 S760 610 920 660 S1240 700 1380 640 L1536 620 V636 L1380 656 C1240 716 920 676 760 626 S440 706 300 656 0 716 0 716Z" fill="#e8f2fb" opacity=".35"/>
        <g fill="#0d2030"><path d="M1040 680 h140 l-22-30 h-96z M1060 650 h100 l-20-28 h-60z M1078 622 h64 l-16-26 h-32z M1100 596 h20 v-28 h-20z"/><path d="M1072 680 h76 v40 h-76z"/></g>
        <g fill="#e8f2fb" opacity=".55"><path d="M1040 680 h140 l-6-8 h-128z M1060 650 h100 l-5-7 h-90z M1078 622 h64 l-4-6 h-56z"/></g>
        <g fill="#0f2434"><path d="M200 720 l34-110 34 110z M250 712 l26-80 26 80z M1380 690 l36-120 36 120z M1430 686 l26-84 26 84z"/></g>
        <g fill="#e8f2fb" opacity=".6"><path d="M234 610 l-12 40 12-8 12 8z M1416 570 l-13 44 13-9 13 9z M276 632 l-9 28 9-6 9 6z"/></g>
        <g fill="#fff" opacity=".55"><circle cx="120" cy="420" r="3"/><circle cx="340" cy="300" r="2.5"/><circle cx="700" cy="380" r="3"/><circle cx="880" cy="220" r="2"/><circle cx="1010" cy="460" r="2.5"/><circle cx="1220" cy="380" r="3"/><circle cx="1460" cy="320" r="2.5"/><circle cx="560" cy="560" r="2"/><circle cx="1320" cy="560" r="2"/><circle cx="420" cy="620" r="2.5"/></g>
    </>,
};
export const SceneBackdrop = memo(function SceneBackdrop({ theme: auto = 'village', fixed = false }: { theme?: BackdropTheme; fixed?: boolean }) {
    // v3.268 설정 › 전투 장면 꾸미기에서 배경을 고르면 사냥터와 상관없이 그 배경(미리보기는 fixed로 그대로).
    const look = useSceneLook(), theme = !fixed && look.backdrop !== 'auto' ? look.backdrop : auto;
    return <svg className={`ocean-art scene-backdrop backdrop-${theme}`} viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c1d2b"/><stop offset=".62" stopColor="var(--stage-tone, #5c9dba)" stopOpacity=".55"/><stop offset="1" stopColor="#0b2029"/></linearGradient>
            <radialGradient id="glow" cx=".72" cy=".24" r=".35"><stop offset="0" stopColor="#fff6d8" stopOpacity=".55"/><stop offset="1" stopColor="#fff6d8" stopOpacity="0"/></radialGradient>
        </defs>
        <rect width="1536" height="1024" fill="#0c1d2b"/>
        <rect width="1536" height="1024" fill="url(#sky)"/>
        {theme !== 'underwater' && <><rect width="1536" height="1024" fill="url(#glow)"/><circle cx="1105" cy="245" r="58" fill="#fff4d0" opacity=".85"/></>}
        {theme !== 'underwater' && theme !== 'temple' && <g fill="#fff" opacity=".5"><circle cx="210" cy="120" r="2"/><circle cx="420" cy="80" r="1.5"/><circle cx="640" cy="160" r="2"/><circle cx="860" cy="70" r="1.5"/><circle cx="1320" cy="130" r="2"/><circle cx="1460" cy="210" r="1.5"/><circle cx="120" cy="260" r="1.5"/></g>}
        {THEME_ART[theme]}
        <path d="M0 800 C220 760 420 790 640 810 S1100 770 1300 790 L1536 780 V1024 H0Z" fill="#0b2029"/>
    </svg>;
});
