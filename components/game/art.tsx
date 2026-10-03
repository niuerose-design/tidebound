'use client';
import { useState } from 'react';
import { Anchor, Compass, Coins, Droplets, Shield, Sparkles, Swords, Wand2 } from 'lucide-react';
import type { Job } from '@/game/data/classes';
import { lineageOf } from '@/game/data/classes';
import { fishArtSrc, fishShape, jobArtSrc, type FishShape } from '@/game/data/art';

/** 어종 실루엣(64×64). 이미지가 없거나 아직 안 왔을 때 그대로 남습니다. */
const SHAPES: Record<FishShape, string> = {
    fish: 'M6 32c10-12 22-18 36-16l16-10-4 26 4 26-16-10C28 50 16 44 6 32zm38-5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    koi: 'M8 34c8-14 20-20 34-16 4-8 10-12 16-12-2 8-4 14-2 22 2 8 4 14 2 22-6 0-12-4-16-12-14 4-26-2-34-16zm32-6a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    ray: 'M32 10c14 0 28 12 30 24-10-2-18 0-22 6l-4 16-4-16c-4-6-12-8-22-6 2-12 16-24 22-24zm-6 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    eel: 'M6 40c6-10 14-12 22-8s14 4 20-2 8-14 10-18c2 6 0 14-6 20s-14 8-22 6-14-2-20 6l-4-4zm40-22a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    squid: 'M32 4c8 0 14 10 14 22l-4 4v8c6 6 10 14 8 22-4-6-8-10-10-10-2 4-4 10-8 14-4-4-6-10-8-14-2 0-6 4-10 10-2-8 2-16 8-22v-8l-4-4C18 14 24 4 32 4zm-6 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    crab: 'M20 30a12 10 0 1 1 24 0 12 10 0 1 1-24 0zm-8-12 8 10-4 2-8-8 4-4zm40 0 4 4-8 8-4-2 8-10zM14 40l-8 6 4 4 8-6zm36 0 8 6-4 4-8-6zm-26 6-4 10h4l4-8zm16 0 4 2 4 8h4l-4-10z',
    jelly: 'M32 8c12 0 20 8 20 18H12c0-10 8-18 20-18zm-14 20h4l-2 26-4-2zm10 0h4l2 28h-4zm10 0h4l-2 26-4 2zm-6 0h4l2 20-4 6-4-6z',
    shark: 'M4 36c8-8 18-12 30-12l6-14 4 14c8 2 14 6 16 12-6 2-12 2-16 0l-8 10-4-8c-10 2-20 2-28-2zm12 10 8-6 2 10z',
    puffer: 'M32 12a22 20 0 1 1 0 40 22 20 0 0 1 0-40zm26 20 4-6v12zM40 26a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 10l4 6M32 6v6M46 10l-4 6M12 20l6 4M12 44l6-4M18 54l4-6M46 54l-4-6M52 20l-6 4M52 44l-6-4',
    seahorse: 'M34 6c6 0 10 4 10 10 0 4-2 6-4 8 4 6 6 14 4 22-2 6-6 10-12 12l-2-4c4-2 8-6 8-12 0-4-2-8-6-12-6-2-10-6-10-12 0-6 6-12 12-12zm2 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM26 50c-2 4-6 6-10 6 2-4 6-6 10-6z',
    angler: 'M8 36c6-10 16-16 30-16 4 0 10 2 16 6-4 2-8 6-10 8l12 4-14 2-4 8-6-6c-10 0-18-2-24-6zm16-14c2-10 6-14 12-14-2 4-2 8 0 10l-4 2c-4-2-6-2-8 2zm16 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    spirit: 'M32 6c12 0 20 10 20 24v24l-6-6-6 6-8-8-8 8-6-6-6 6V30C12 16 20 6 32 6zm-8 20a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm16 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    giant: 'M4 40c6-12 18-20 34-20l10-14 2 16c6 2 10 6 12 12-6 0-10 2-14 6l-2 10-8-6c-10 4-22 4-34-4zm38-14a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM20 20l6-10 2 10zm12-2 4-10 2 12z',
};

/** 어종 그림. public/art/fish/{id}.webp 가 있으면 그 그림, 없으면 실루엣. */
export function FishArt({ id, size = 48, className = '', boss = false }: { id: string; size?: number; className?: string; boss?: boolean }) {
    const [state, setState] = useState<'pending' | 'ready' | 'missing'>('pending');
    const shape = fishShape(id);
    return <span className={`fish-art ${state} shape-${shape} ${boss ? 'boss' : ''} ${className}`} style={{ width: size, height: size }} aria-hidden>
        {state !== 'ready' && <svg viewBox="0 0 64 64" width={size} height={size} className="fish-silhouette"><path d={SHAPES[shape]} fill="currentColor" stroke="currentColor" strokeWidth={shape === 'puffer' ? 2 : 0} strokeLinecap="round"/></svg>}
        {state !== 'missing' && (
            // eslint-disable-next-line @next/next/no-img-element -- 선택적 정적 파일: 없으면 onError로 실루엣에 머무릅니다.
            <img src={fishArtSrc(id)} alt="" width={size} height={size} loading="lazy" decoding="async" onLoad={() => setState('ready')} onError={() => setState('missing')}/>
        )}
    </span>;
}

const TREE_ICON = { physical: Swords, magic: Wand2, defense: Shield, status: Droplets, hybrid: Anchor, support: Coins, mystery: Sparkles } as const;
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
