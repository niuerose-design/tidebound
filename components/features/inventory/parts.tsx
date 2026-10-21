'use client';
/** v3.384 보관함 공용 조각: 장비 이름 줄 · 등급/상태 배지 · 전투력 변화 · 능력치 목록 · 작은 상자. */
import type { ReactNode } from 'react';
import { Gem, Lock, Sparkles } from 'lucide-react';
import type { Item, Stats } from '@/game/types';
import { RarityTag, KeyValueList, rarityKey, formatExact } from '@/components/ui/game';
import { OnyxArt } from '@/components/game/onyx-art';
import { GearArt } from '@/components/game/gear-art';
import { cn } from '@/lib/utils';
import { RARITIES, SLOTS } from '@/game/data/balance';
import { STAT_LABELS, byStatOrder, statDeltaDisplay } from '@/game/data/progression';
import { itemStats } from '@/game/systems/equipment';
import { starLabel } from '@/game/data/starforce';

export const HEIR_LABEL = { ancient: '원시 고대', primal: '계승 태초' } as const;
export const rarityOf = (item: Pick<Item, 'rarity' | 'onyx'>) => item.onyx ? 'primal' : rarityKey(item.rarity);
/** 장비 칸 그림(칠흑은 전용 그림). */
export function ItemArt({ item, size = 22 }: { item: Item; size?: number }) { return item.onyx ? <OnyxArt id={item.onyx} size={size + 8}/> : <GearArt slot={item.slot} rarity={item.rarity} style={item.style} size={size + 8}/>; }
/** 이름 + 별 + 상태 아이콘(보호 · 유물 · 계승 · 칠흑). */
export function ItemName({ item, always, className }: { item: Item; always?: boolean; className?: string }) {
    return <span className={cn('inline-flex flex-wrap items-center gap-1.5 font-semibold text-ink-1', className)}>
        <span style={item.onyx ? { color: 'var(--rarity-primal)' } : undefined}>{item.name}{item.onyxRank ? ` +${item.onyxRank}` : ''}</span>
        {(item.enhance || always) && <span className="font-num text-gold-ink">{starLabel(item.enhance || 0, true)}</span>}
        {item.locked && <Lock size={12} className="text-gold-ink" aria-label="보호"/>}{item.relic && <Sparkles size={12} className="text-accent" aria-label="환생 보존 유물"/>}{item.heir && <Sparkles size={12} className="text-gold-ink" aria-label={HEIR_LABEL[item.heir]}/>}{item.onyx && <Gem size={12} style={{ color: 'var(--rarity-primal)' }} aria-label="칠흑 장신구"/>}
    </span>;
}
/** 등급 · 부위 · 위력 · 레벨 · 옵션 수 한 줄. */
export function ItemMeta({ item }: { item: Item }) {
    return <span className="text-xs text-ink-3">{item.onyx ? `칠흑${item.onyxRank ? ` · 각성 ${item.onyxRank}` : ''}` : RARITIES[item.rarity].name} · {SLOTS[item.slot]} · 위력 {item.power} · {item.relic ? '유물' : item.heir ? `${HEIR_LABEL[item.heir]} · Lv.${item.level}` : `Lv.${item.level}`}{item.affixes?.length ? ` · 옵션 ${item.affixes.length}` : ''}</span>;
}
export function ItemTag({ item }: { item: Item }) { return <RarityTag rarity={rarityOf(item)} label={item.onyx ? '칠흑' : undefined}/>; }
/** 교체 후 종합 전투력 변화. */
export function GainBadge({ gain, equipped }: { gain: number; equipped?: boolean }) {
    if (equipped) return <span className="rounded-s bg-surface-3 px-1.5 py-0.5 text-xs font-medium text-ink-2">착용 중</span>;
    return <span className={cn('rounded-s px-1.5 py-0.5 font-num text-xs font-medium tabular-nums', gain > 0 ? 'bg-ok/15 text-ok' : gain < 0 ? 'bg-danger/15 text-danger' : 'bg-surface-3 text-ink-3')} title="교체 후 종합 전투력 변화">{gain > 0 ? `전투력 +${formatExact(gain)}` : gain < 0 ? `전투력 −${formatExact(-gain)}` : '변화 없음'}</span>;
}
/** 장비 기여 능력치(직업 배율 전). */
export function BonusList({ item, columns = 2 }: { item: Item; columns?: 1 | 2 }) {
    return <KeyValueList columns={columns} items={byStatOrder(Object.entries(itemStats(item))).map(([key, value]) => ({ key: STAT_LABELS[key as keyof Stats], value: statDeltaDisplay(key, value as number) }))}/>;
}
/** 최종 능력치 변화 목록(+ 초록 · − 빨강). */
export function DeltaList({ title, delta }: { title: ReactNode; delta: [string, number][] }) {
    return <div className="grid gap-1 rounded-m bg-surface-2 px-3 py-2 text-s">
        <div className="text-xs text-ink-3">{title}</div>
        {delta.length ? <div className="flex flex-wrap gap-x-3 gap-y-1">{delta.map(([k, d]) => <span key={k} className={cn('font-num tabular-nums', d > 0 ? 'text-ok' : 'text-danger')}>{STAT_LABELS[k as keyof Stats]} {statDeltaDisplay(k, d)}</span>)}</div> : <span className="text-ink-3">변화 없음</span>}
    </div>;
}
/** 작업대 안의 작은 상자(이식 · 계승 · 레벨 · 자동 강화). */
export function Box({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
    return <section className={cn('grid gap-2 rounded-m border border-line/60 bg-surface-2 p-3 text-s', className)}><div className="font-semibold text-ink-1">{title}</div>{children}</section>;
}
export const Note = ({ children, tone }: { children: ReactNode; tone?: 'ok' | 'danger' }) => <p className={cn('text-xs leading-relaxed', tone === 'ok' ? 'text-ok' : tone === 'danger' ? 'text-danger' : 'text-ink-3')}>{children}</p>;
