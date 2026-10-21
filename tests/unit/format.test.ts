import { describe, it, expect } from 'vitest';
import { formatShort, formatExact, formatPercent } from '@/components/ui/game/format';

describe('number format (v3.374)', () => {
    it('abbreviates with 만 · 억 · 조 and keeps small numbers exact', () => {
        expect(formatShort(999)).toBe('999'); expect(formatShort(12_345)).toBe('1.2만'); expect(formatShort(1_234_567)).toBe('123만');
        expect(formatShort(340_000_000)).toBe('3.4억'); expect(formatShort(2.5e12)).toBe('2.5조'); expect(formatShort(-45_000)).toBe('-4.5만'); expect(formatShort(10_000)).toBe('1만');
    });
    it('exact and percent', () => { expect(formatExact(1234567.4)).toBe('1,234,567'); expect(formatPercent(.405)).toBe('40.5%'); expect(formatPercent(.4)).toBe('40%'); });
});
