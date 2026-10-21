'use client';
/** v3.388 장비 그림: 부위 · 등급(· 무기 계열)에 맞는 렌더 그림(tools/item-art). 그림이 없거나 못 받으면 부위 아이콘(SlotIcon)이 그대로 남습니다. 칠흑 장신구는 OnyxArt 를 따로 씁니다. */
import { useState } from 'react';
import type { Item } from '@/game/types';
import { gearArtSrc } from '@/game/data/art';
import { SlotIcon } from './shared';
import { cn } from '@/lib/utils';

export function GearArt({ slot, rarity, style, size = 24, className }: { slot: Item['slot'] | string; rarity: number; style?: Item['style'] | null; size?: number; className?: string }) {
    const src = gearArtSrc(slot, rarity, style);
    const [state, setState] = useState<'pending' | 'ready' | 'missing'>(src ? 'pending' : 'missing');
    return <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }} aria-hidden="true">
        {state !== 'ready' && <SlotIcon slot={slot} size={Math.round(size * 0.8)}/>}
        {state !== 'missing' && src && (
            // eslint-disable-next-line @next/next/no-img-element -- 선택적 정적 파일: 없으면 onError 로 아이콘에 머뭅니다.
            <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" className={cn('absolute inset-0 h-full w-full object-contain transition-opacity duration-300', state === 'ready' ? 'opacity-100' : 'opacity-0')} onLoad={() => setState('ready')} onError={() => setState('missing')}/>
        )}
    </span>;
}
