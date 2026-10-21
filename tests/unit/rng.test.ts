import { describe, it, expect } from 'vitest';
import { requestRng, mulberry32, fnv1a } from '@/game/server/rng';

const take = (rng: () => number, n = 5) => Array.from({ length: n }, () => rng());

describe('request rng (v3.377)', () => {
    it('same adventurer · revision · lastTick · salt → same sequence in [0, 1)', () => {
        const a = take(requestRng('acc_1', 7, 1_800_000_000_000, 's'));
        const b = take(requestRng('acc_1', 7, 1_800_000_000_000, 's'));
        expect(a).toEqual(b);
        for (const x of a) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
    });
    it('any input change (revision, lastTick, id, salt) changes the sequence', () => {
        const base = take(requestRng('acc_1', 7, 1_800_000_000_000, 's'));
        expect(take(requestRng('acc_1', 8, 1_800_000_000_000, 's'))).not.toEqual(base);
        expect(take(requestRng('acc_1', 7, 1_800_000_002_000, 's'))).not.toEqual(base);
        expect(take(requestRng('acc_2', 7, 1_800_000_000_000, 's'))).not.toEqual(base);
        expect(take(requestRng('acc_1', 7, 1_800_000_000_000, 't'))).not.toEqual(base);
    });
    it('fnv1a and mulberry32 are stable', () => {
        expect(fnv1a('')).toBe(0x811c9dc5);
        expect(fnv1a('a')).toBe(0xe40c292c);
        expect(mulberry32(1)()).toBeCloseTo(mulberry32(1)(), 12);
    });
});
