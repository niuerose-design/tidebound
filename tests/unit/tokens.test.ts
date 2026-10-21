import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/** v3.374 디자인 토큰: 기존 화면의 색과 같은 값을 가리키고, 등급 7색은 game/data/balance RARITIES 와 같아야 합니다. */
describe('design tokens (v3.374)', () => {
    const css = readFileSync('app/styles/tokens.css', 'utf8'), theme = readFileSync('app/styles/theme.css', 'utf8');
    const val = (src: string, name: string) => src.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))?.[1].trim();
    it('surface and accent match the live theme variables', () => {
        expect(val(css, '--surface-0')).toBe(val(theme, '--background'));
        expect(val(css, '--surface-2')).toBe(val(theme, '--card'));
        expect(val(css, '--accent')).toBe(val(theme, '--primary'));
        expect(val(css, '--ink-1')).toBe(val(theme, '--foreground'));
        expect(val(css, '--line')).toBe(val(theme, '--border'));
    });
    it('rarity colors follow RARITIES', () => {
        const balance = readFileSync('game/data/balance.ts', 'utf8');
        const colors = [...balance.matchAll(/name: '(일반|희귀|영웅|전설|신화|고대|태초)', color: '(#[0-9a-f]{6})'/g)].map(m => m[2]);
        expect(colors).toHaveLength(7);
        const keys = ['common', 'rare', 'epic', 'legendary', 'mythic', 'ancient', 'primal'];
        keys.forEach((k, i) => expect(val(css, `--rarity-${k}`)).toBe(colors[i]));
    });
    it('exposes every token to Tailwind and keeps text sizes at 11px or more', () => {
        for (const name of ['surface-1', 'ink-2', 'line', 'accent', 'rarity-epic', 'dmg-magic', 'ok', 'danger']) expect(css).toContain(`--color-${name}: var(--${name})`);
        for (const m of css.matchAll(/--text-[a-z0-9]+:\s*(\d+)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(11);
    });
});
