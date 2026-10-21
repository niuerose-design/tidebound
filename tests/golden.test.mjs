// v3.377 골든 테스트(재설계 3단계): 시드 고정으로 기준 몸 3개를 1시간 돌린 세이브 해시가 tests/fixtures/golden.json 과 같은지.
// 깨지면 (1) 의도하지 않은 밸런스 · 규칙 변화인지 보고, (2) 의도한 변경이면 node scripts/golden-update.mjs 로 기준을 갱신해 함께 커밋합니다.
import { readFileSync, existsSync } from 'node:fs';
import { assert, test } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
import { runGolden, GOLDEN_FILE, mulberry32 } from '../scripts/lib/golden.mjs';

test('v3.377 golden: seeded one-hour runs of the reference bodies hash to the recorded values (run scripts/golden-update.mjs after an intended balance change)', async () => {
    assert.ok(existsSync(GOLDEN_FILE), `${GOLDEN_FILE} 이 없습니다. node scripts/golden-update.mjs 로 만드세요.`);
    const golden = JSON.parse(readFileSync(GOLDEN_FILE, 'utf8'));
    const rows = await runGolden(loadGame());
    for (const r of rows) {
        const want = golden.bodies[r.key];
        assert.ok(want, `${r.key} 기준이 없습니다(golden-update).`);
        assert.equal(r.hash, want.hash, `${r.key}: 세이브 해시가 기준과 다릅니다. 지금 ${JSON.stringify(r.summary)} · 기준 ${JSON.stringify({ level: want.level, kills: want.kills, gold: want.gold, exp: want.exp, deaths: want.deaths })}. 의도한 변경이면 node scripts/golden-update.mjs`);
    }
});

test('v3.377 golden: the same seed reproduces the same save twice (no hidden Math.random or clock in advance/act)', async () => {
    const L = loadGame(); const { advance, act, newState } = await L.load('game/systems/engine.js');
    const base = newState(1_800_000_000_000 - 600_000); base.running = true; base.level = 20;
    const run = (seed) => { const s = JSON.parse(JSON.stringify(base)); const rng = mulberry32(seed); do { advance(s, 1_800_000_000_000, rng); } while (s.catchUpLeft); act(s, { type: 'sync' }, 1_800_000_000_000, rng); delete s.lastOffline; return JSON.stringify(s); };
    assert.equal(run(5), run(5)); assert.notEqual(run(5), run(6), 'a different seed changes the outcome');
});
