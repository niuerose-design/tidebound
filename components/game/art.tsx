'use client';
import { useState } from 'react';
import { Compass, Coins, Droplets, Shield, Sparkles, Swords, Wand2, Atom } from 'lucide-react';
import type { Job } from '@/game/data/classes';
import { lineageOf } from '@/game/data/classes';
import { fishArtSrc, fishShape, jobArtSrc, type FishShape } from '@/game/data/art';

/**
 * 몬스터 실루엣(64×64). 이미지가 없거나 아직 안 왔을 때 그대로 남습니다.
 * v27.42 메이플 몬스터 모양. 조각마다 따로 칠해 겹쳐도 비지 않고, 조각 안의 눈·무늬는 구멍(evenodd)으로 뚫립니다.
 */
const SHAPES: Record<FishShape, string[]> = {
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
    clock: [
        'M10 28a22 22 0 1 0 44 0 22 22 0 1 0-44 0zM30 12h4v17h-4zM33 27l12 6-2 3-12-6z',
        'M16 48h9v10h-9zM39 48h9v10h-9z',
        'M24 4h16v4H24z',
    ],
};

/** 몬스터 그림. public/art/fish/{id}.webp 가 있으면 그 그림, 없으면 실루엣. */
export function FishArt({ id, size = 48, className = '', boss = false }: { id: string; size?: number; className?: string; boss?: boolean }) {
    const [state, setState] = useState<'pending' | 'ready' | 'missing'>('pending');
    const shape = fishShape(id);
    return <span className={`fish-art ${state} shape-${shape} ${boss ? 'boss' : ''} ${className}`} style={{ width: size, height: size }} aria-hidden>
        {state !== 'ready' && <svg viewBox="0 0 64 64" width={size} height={size} className="fish-silhouette">{SHAPES[shape].map((d, i) => <path key={i} d={d} fill="currentColor" fillRule="evenodd"/>)}</svg>}
        {state !== 'missing' && (
            // eslint-disable-next-line @next/next/no-img-element -- 선택적 정적 파일: 없으면 onError로 실루엣에 머무릅니다.
            <img src={fishArtSrc(id)} alt="" width={size} height={size} loading="lazy" decoding="async" onLoad={() => setState('ready')} onError={() => setState('missing')}/>
        )}
    </span>;
}

const TREE_ICON = { physical: Swords, magic: Wand2, defense: Shield, status: Droplets, hybrid: Atom, support: Coins, mystery: Sparkles } as const;
/** 직업 그림. 계보 단위로 public/art/jobs/{lineageId}.webp 를 쓰고, 없으면 계열 아이콘. */
export function JobArt({ job, size = 48, className = '' }: { job: Job; size?: number; className?: string }) {
    const [state, setState] = useState<'pending' | 'ready' | 'missing'>('pending');
    const Icon = TREE_ICON[job.tree as keyof typeof TREE_ICON] ?? Compass;
    return <span className={`job-art ${state} tree-${job.tree} ${className}`} style={{ width: size, height: size }} aria-hidden>
        {state !== 'ready' && <Icon size={Math.round(size * .55)} className="job-silhouette"/>}
        {state !== 'missing' && (
            // eslint-disable-next-line @next/next/no-img-element -- 선택적 정적 파일: 없으면 onError로 아이콘에 머무릅니다.
            <img src={jobArtSrc(lineageOf(job))} alt="" width={size} height={size} loading="lazy" decoding="async" onLoad={() => setState('ready')} onError={() => setState('missing')}/>
        )}
    </span>;
}
