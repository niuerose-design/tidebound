import { describe, it, expect } from 'vitest';
import { viewFromHash, hashForView, DEFAULT_VIEW } from '@/components/game/view-route';

const valid = new Set(['battle', 'settings', 'book', 'updates']);
describe('view route hash (v3.380)', () => {
    it('reads a known view from the hash, with or without a slash', () => {
        expect(viewFromHash('#settings', valid)).toBe('settings');
        expect(viewFromHash('#/book', valid)).toBe('book');
        expect(viewFromHash('#%EC%84%A4%EC%A0%95', new Set(['설정']))).toBe('설정');
    });
    it('falls back to the default view for empty or unknown hashes', () => {
        expect(viewFromHash('', valid)).toBe(DEFAULT_VIEW);
        expect(viewFromHash('#nope', valid)).toBe(DEFAULT_VIEW);
        expect(viewFromHash('#', valid)).toBe(DEFAULT_VIEW);
    });
    it('writes no hash for the default view', () => {
        expect(hashForView('battle')).toBe('');
        expect(hashForView('settings')).toBe('#settings');
        expect(viewFromHash(hashForView('updates'), valid)).toBe('updates');
    });
});
