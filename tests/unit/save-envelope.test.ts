import { describe, it, expect } from 'vitest';
import { newState } from '@/game/systems/state';
import { SAVE_VERSION } from '@/game/data/balance';
import { GAME_BUILD } from '@/game/data/update-log';
import { readSave, parseSave, writeSave, unwrapSave, SAVE_FORMAT, DERIVED_KEYS, MIGRATIONS, SaveFormatError, isEnvelope, stripDerived } from '@/game/save/envelope';
import type { State } from '@/game/types';

const NOW = 1_800_000_000_000;
/** 지금 라이브 포맷(v1) 표본: 파생 키가 섞여 있고 정산 카드가 남아 있는 세이브. */
function v1Sample(): State {
    const s = newState(NOW - 60_000);
    s.gold = 1234; s.level = 7; s.name = '표본1';
    (s as Record<string, unknown>).event = { id: 'ev', gold: 2 };
    (s as Record<string, unknown>).closed = { stages: ['a'] };
    (s as Record<string, unknown>).catchingUp = true;
    s.lastOffline = { seconds: 90, kills: 3, gold: 10, exp: 20 };
    return s;
}

describe('save envelope (v3.378)', () => {
    it('reads a bare v1 save and returns the current State version', () => {
        const s = readSave(JSON.stringify(v1Sample()), NOW);
        expect(s.version).toBe(SAVE_VERSION); expect(s.gold).toBe(1234); expect(s.name).toBe('표본1');
    });
    it('writes a v2 envelope with savedAt · lastTickAt · contentVersion and no derived keys; lastOffline stays', () => {
        const src = v1Sample(), json = writeSave(src, NOW, true), raw = JSON.parse(json);
        expect(isEnvelope(raw)).toBe(true); expect(raw.v).toBe(SAVE_FORMAT); expect(raw.savedAt).toBe(NOW); expect(raw.lastTickAt).toBe(src.lastTick); expect(raw.contentVersion).toBe(GAME_BUILD);
        for (const k of DERIVED_KEYS) expect(raw.state).not.toHaveProperty(k);
        expect(raw.state.lastOffline).toEqual(src.lastOffline);
        expect(parseSave(json, NOW)).toEqual(stripDerived(src));
    });
    it('envelope=false keeps the live v1 shape (bare State, no v key) so the flag can be turned off again', () => {
        const raw = JSON.parse(writeSave(v1Sample(), NOW, false));
        expect(isEnvelope(raw)).toBe(false); expect(raw.version).toBe(SAVE_VERSION); expect(raw.event).toBeDefined();
    });
    it('v1 → v2 → read → write round-trips to the same state', () => {
        const a = readSave(JSON.stringify(v1Sample()), NOW), json = writeSave(a, NOW, true), b = readSave(json, NOW);
        expect(JSON.stringify(b)).toBe(JSON.stringify(stripDerived(a)));
        expect(JSON.stringify(readSave(writeSave(b, NOW + 1, true), NOW + 1))).toBe(JSON.stringify(b));
    });
    it('the migration chain is contiguous from 1 to SAVE_FORMAT and each step is pure', () => {
        expect(MIGRATIONS.map(m => [m.from, m.to])).toEqual(Array.from({ length: SAVE_FORMAT - 1 }, (_, i) => [i + 1, i + 2]));
        const src = JSON.stringify(v1Sample()), raw = JSON.parse(src);
        for (const m of MIGRATIONS) { const out = m.up(JSON.parse(JSON.stringify(raw)), NOW); expect(out).toBeTruthy(); }
        expect(JSON.stringify(raw)).toBe(src);
    });
    it('rejects an envelope newer than this server or with a broken number', () => {
        expect(() => unwrapSave({ v: SAVE_FORMAT + 1, state: {} }, NOW)).toThrow(SaveFormatError);
        expect(() => unwrapSave({ v: 0.5, state: {} }, NOW)).toThrow(SaveFormatError);
    });
});
