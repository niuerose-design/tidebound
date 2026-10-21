import { cn } from '@/lib/utils';

export type RarityKey = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'ancient' | 'primal';
export const RARITY_LABEL: Record<RarityKey, string> = { common: '일반', rare: '희귀', epic: '영웅', legendary: '전설', mythic: '신화', ancient: '고대', primal: '태초' };
export const RARITY_KEYS: RarityKey[] = ['common', 'rare', 'epic', 'legendary', 'mythic', 'ancient', 'primal'];
/** 등급 번호(0~6, game/data/balance RARITIES 순서) → 토큰 키. */
export const rarityKey = (index: number): RarityKey => RARITY_KEYS[Math.max(0, Math.min(RARITY_KEYS.length - 1, index))];
export const rarityVar = (r: RarityKey) => `var(--rarity-${r})`;

/** v3.374 등급 배지. 색만으로 뜻을 전하지 않도록 글자(일반 · 희귀 …)를 함께 둡니다. */
export function RarityTag({ rarity, label, size = 's', className }: { rarity: RarityKey; label?: string; size?: 's' | 'm'; className?: string }) {
    return <span className={cn('inline-flex items-center gap-1 rounded-s border font-medium leading-none whitespace-nowrap', size === 's' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-s', className)} style={{ color: rarityVar(rarity), borderColor: `color-mix(in srgb, ${rarityVar(rarity)} 45%, transparent)`, background: `color-mix(in srgb, ${rarityVar(rarity)} 12%, transparent)` }}>
        <span className="size-1.5 rounded-full" style={{ background: rarityVar(rarity) }} aria-hidden/>{label ?? RARITY_LABEL[rarity]}
    </span>;
}
