import { describe, it, expect } from 'vitest';
import { diffState, applyStatePatch } from '@/game/systems/state-delta';
import type { State } from '@/game/types';

describe('state delta (v3.373)', () => {
    const prev = { version: 8, gold: 100, book: { minnow: 3 }, lastOffline: { seconds: 10 }, logs: [{ id: 1 }] } as unknown as State;
    it('sends only changed keys, lists dropped keys, skips logs', () => {
        const next = { ...prev, gold: 250, book: { minnow: 3 }, inventory: [], logs: [{ id: 2 }] } as unknown as State;
        delete (next as Partial<State>).lastOffline;
        const patch = diffState(prev as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>);
        expect(Object.keys(patch.set).sort()).toEqual(['gold', 'inventory']);
        expect(patch.drop).toEqual(['lastOffline']);
        const merged = applyStatePatch(prev, patch);
        expect(merged.gold).toBe(250);
        expect('lastOffline' in merged).toBe(false);
        expect(merged.book).toBe(prev.book);
    });
    it('is a no-op patch for identical saves', () => {
        const patch = diffState(prev as unknown as Record<string, unknown>, { ...prev } as unknown as Record<string, unknown>);
        expect(patch.set).toEqual({}); expect(patch.drop).toEqual([]);
    });
});
