import type { CombatStats, Item, State, Stats } from '@/game/types';
import { SLOTS } from '@/game/data/balance';
import { stats, power } from '@/game/systems/stats';

export const SLOT_IDS = Object.keys(SLOTS) as Item['slot'][];
export type GearPreview = { current: CombatStats; currentPower: number; preview: Map<string, { after: Stats; gain: number }> };
/**
 * 교체 미리보기 캐시(화면 하나만 쓰므로 한 칸). 키는 최종 능력치와 가방 · 장착 장비 전체라 옵션 재굴림 · 연마 · 레벨 업 · 숙련 · 코어 변화도 잡힙니다.
 * 실제 교체처럼 낀 장비는 가방으로 옮겨 놓고 잽니다(칠흑 공명 · 세트는 가방의 장신구도 세므로).
 */
let cache: { key: string; value: GearPreview } | null = null;
export function gearPreview(s: State): GearPreview {
    const current = stats(s);
    const key = JSON.stringify([current, s.inventory, SLOT_IDS.map(id => s.equipment[id] ?? null)]);
    if (cache?.key === key) return cache.value;
    const currentPower = power(current), preview = new Map<string, { after: Stats; gain: number }>();
    for (const item of s.inventory) {
        const worn = s.equipment[item.slot];
        const after = stats({ ...s, equipment: { ...s.equipment, [item.slot]: item }, inventory: [...s.inventory.filter(i => i.id !== item.id), ...(worn ? [worn] : [])] });
        preview.set(item.id, { after, gain: power(after) - currentPower });
    }
    cache = { key, value: { current, currentPower, preview } };
    return cache.value;
}
