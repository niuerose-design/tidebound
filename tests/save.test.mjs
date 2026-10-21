// v3.378 세이브 봉투(v2) 기능 플래그: 서버 store가 플래그에 따라 봉투로 쓰고, 플래그와 무관하게 v1 · v2 행을 모두 읽으며, 차분 응답(before)도 그대로 동작하는지.
import { assert, test, newState } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
const L = loadGame();

test('v3.378 save envelope flag: TIDEBOUND_SAVE_V2=1 writes v2 rows, reads v1 rows, patch responses still work, and turning it off writes v1 again', async () => {
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const file = path.join(os.tmpdir(), `tb-save-v2-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    const St = await L.load('server/store'), D = await L.load('server/db'), F = await L.load('save/envelope');
    const realNow = Date.now; let clock = realNow(); Date.now = () => clock;
    const prevFlag = process.env.TIDEBOUND_SAVE_V2;
    try {
        const id = 'acct_envelope'; St.forgetRecent();
        const database = D.db(); await database.createPlayerIfMissing(id, JSON.stringify({ ...newState(clock - 5000), gold: 100, running: true }), clock);
        process.env.TIDEBOUND_SAVE_V2 = '1';
        const a = await St.mutate(id, { type: 'sync' });
        const row1 = JSON.parse((await database.getPlayer(id)).state);
        assert.ok(F.isEnvelope(row1) && row1.v === F.SAVE_FORMAT, 'the first write after the flag is a v2 envelope'); assert.equal(row1.lastTickAt, a.state.lastTick); assert.ok(!('event' in row1.state), 'derived event is not stored'); assert.ok(a.state.event !== undefined || a.state.event === null, 'the response state still carries the live event');
        clock += 5000; const b = await St.mutate(id, { type: 'sync' }, undefined, { since: a.sv });
        assert.ok(b.before && typeof b.before === 'object', 'the matching sv hands back the previous copy (unwrapped)'); assert.ok(!('v' in b.before), 'before is a State, not an envelope'); assert.equal(b.before.gold, a.state.gold);
        clock += 70_000; const c = await St.mutate(id, { type: 'sync', final: true });
        const row2 = JSON.parse((await database.getPlayer(id)).state); assert.ok(F.isEnvelope(row2), 'final sync writes an envelope'); assert.equal(row2.state.gold, c.state.gold);
        // 끄면 v2 행을 읽어 v1로 다시 씁니다(되돌리기).
        process.env.TIDEBOUND_SAVE_V2 = '0'; St.forgetRecent(); clock += 1000;
        const d = await St.mutate(id, { type: 'sync', final: true }); const row3 = JSON.parse((await database.getPlayer(id)).state);
        assert.ok(!F.isEnvelope(row3) && row3.version === d.state.version, 'flag off: bare v1 row again'); assert.equal(row3.gold, c.state.gold, 'nothing lost across v2 → v1');
    } finally { Date.now = realNow; St.forgetRecent(); if (prevFlag === undefined) delete process.env.TIDEBOUND_SAVE_V2; else process.env.TIDEBOUND_SAVE_V2 = prevFlag; fs.rmSync(file, { force: true }); }
});
