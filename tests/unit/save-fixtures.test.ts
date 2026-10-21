// 운영 세이브 익명 픽스처(tests/fixtures/saves/*.json, 운영 페이지 → 통계 → 세이브 익명 내보내기)가 모두 지금 코드로 올라오는지.
// 파일이 없으면 건너뜁니다(브리프 8절: 10개 이상 확보해 모든 단계에서 로드 테스트).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SAVE_VERSION } from '@/game/data/balance';
import { advance, act } from '@/game/systems/engine';
import { readSave, writeSave, stripDerived } from '@/game/save/envelope';
import type { SaveFixtureFile } from '@/game/systems/anonymize';

const DIR = 'tests/fixtures/saves';
const files = readdirSync(DIR).filter(f => f.endsWith('.json'));
const mulberry32 = (seed: number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

describe.skipIf(files.length === 0)('save fixtures load (v3.378)', () => {
    for (const file of files) {
        const fx = JSON.parse(readFileSync(join(DIR, file), 'utf8')) as SaveFixtureFile;
        it(`${file}: ${fx.count} saves from build ${fx.build} migrate, run ten turns, and round-trip through the v2 envelope`, () => {
            expect(fx.kind).toBe('tidebound-save-fixtures'); expect(fx.saves.length).toBe(fx.count);
            for (const save of fx.saves) {
                const now = save.updatedAt + 20_000, s = readSave(JSON.stringify(save.state), now);
                expect(s.version).toBe(SAVE_VERSION); expect(s.name).toMatch(/^표본\d+$/);
                const rng = mulberry32(7);
                expect(() => { advance(s, now, rng); act(s, { type: 'sync' } as never, now, rng); }).not.toThrow();
                const again = readSave(writeSave(s, now, true), now);
                expect(JSON.stringify(again)).toBe(JSON.stringify(stripDerived(s)));
            }
        });
    }
});
