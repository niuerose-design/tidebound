// v3.377 골든 테스트 공용(재설계 3단계): 시드 고정 난수로 기준 몸을 1시간(1,800턴) 돌린 세이브의 해시.
// 같은 코드 · 같은 시드면 해시가 같아야 합니다. 의도한 밸런스 변경이면 `node scripts/golden-update.mjs` 로 기준 파일을 다시 씁니다.
import { createHash } from 'node:crypto';
import { referenceBodies } from './reference-body.mjs';

export const GOLDEN_FILE = 'tests/fixtures/golden.json';
export const GOLDEN_BODIES = [[3, 'hero'], [30, 'hero'], [80, 'hero']];
export const GOLDEN_HOURS = 1, GOLDEN_SEED = 20261021, GOLDEN_NOW = 1_800_000_000_000;

/** mulberry32: 작고 결정론적인 시드 난수. */
export const mulberry32 = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/** 해시에서 뺄 키: 시각 · 표시용 요약처럼 규칙과 무관한 것. */
const VOLATILE = new Set(['lastOffline', 'catchingUp', 'away', 'event', 'closed']);
export function normalize(s) { const c = { ...s }; for (const k of VOLATILE) delete c[k]; return c; }
export const hashState = (s) => createHash('sha1').update(JSON.stringify(normalize(s))).digest('hex').slice(0, 16);

/** 기준 몸마다 돌려 { key, hash, summary } 목록. */
export async function runGolden(L) {
    const { advance, act } = await L.load('game/systems/engine.js');
    const { referenceBody } = await referenceBodies(L);
    const out = [];
    for (const [r, tier] of GOLDEN_BODIES) {
        const s = referenceBody(r, tier); s.running = true; s.lastTick = GOLDEN_NOW - GOLDEN_HOURS * 3600_000;
        const rng = mulberry32(GOLDEN_SEED + r);
        do { advance(s, GOLDEN_NOW, rng); } while (s.catchUpLeft);
        act(s, { type: 'sync' }, GOLDEN_NOW, rng);
        out.push({ key: `r${r}-${tier}`, hash: hashState(s), summary: { level: s.level, kills: s.kills, gold: Math.round(s.gold), exp: Math.round(s.exp), deaths: s.deaths || 0, inventory: s.inventory?.length || 0, logs: s.logs?.length || 0 } });
    }
    return out;
}
