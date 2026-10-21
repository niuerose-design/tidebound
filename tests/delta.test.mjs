// v3.371 B안 서버 비용: 세이브 차분(state-delta) · 저장 미루기(store.mutate PERSIST_MS) · 차분 응답용 사본(before · sv).
import { assert, test, newState } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
const L = loadGame();
const { diffState, applyStatePatch } = await L.load('systems/state-delta');

test('v3.371 state delta: only changed top-level keys travel, dropped keys are listed, logs are left to the log delta, untouched keys keep their object identity', () => {
    const prev = { ...newState(1000), gold: 100, book: { minnow: 3 }, lastOffline: { seconds: 10 }, logs: [{ id: 1, text: 'a', type: 'system' }] };
    const next = { ...prev, gold: 250, book: { minnow: 3 }, inventory: [{ id: 'x' }], logs: [{ id: 2, text: 'b', type: 'system' }] };
    delete next.lastOffline;
    const patch = diffState(prev, next);
    assert.deepEqual(Object.keys(patch.set).sort(), ['gold', 'inventory'], 'book is equal by value so it is not sent; logs are skipped');
    assert.deepEqual(patch.drop, ['lastOffline']);
    const merged = applyStatePatch(prev, patch);
    assert.equal(merged.gold, 250); assert.ok(!('lastOffline' in merged)); assert.equal(merged.book, prev.book, 'same object for an unchanged key'); assert.equal(merged.logs, prev.logs, 'logs untouched by the patch (merged separately)');
    const roundtrip = applyStatePatch(prev, diffState(prev, next)); roundtrip.logs = next.logs;
    assert.deepEqual(JSON.parse(JSON.stringify(roundtrip)), JSON.parse(JSON.stringify(next)), 'patch + log merge reproduces the next save');
});

test('v3.371 mutate defers sync-only saves for PERSIST_MS, writes at once for actions · final sync · after the interval, keeps unsaved progress across the recent TTL, and hands back the previous copy only for a matching sv', async () => {
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const file = path.join(os.tmpdir(), `tb-persist-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    const St = await L.load('server/store'), D = await L.load('server/db');
    const realNow = Date.now; let clock = realNow(); Date.now = () => clock;
    try {
        const id = 'acct_persist'; St.forgetRecent();
        const database = D.db(); await database.createPlayerIfMissing(id, JSON.stringify({ ...newState(clock - 5000), gold: 100, running: true }), clock);
        let writes = 0; const realUpdate = database.updatePlayer.bind(database); database.updatePlayer = async (...x) => { writes++; return realUpdate(...x); };
        const a = await St.mutate(id, { type: 'sync' }); assert.equal(writes, 1, 'first request on the instance writes (nothing remembered yet)'); assert.equal(typeof a.sv, 'number'); assert.equal(a.before, null, 'no sv sent → no previous copy');
        clock += 5000; const b = await St.mutate(id, { type: 'sync' }, undefined, { since: a.sv }); assert.equal(writes, 1, 'sync 5 s later is kept in memory only'); assert.ok(b.before && typeof b.before === 'object', 'matching sv → previous copy for the delta'); assert.equal(b.before.gold, a.state.gold);
        assert.equal(St.recentOf(id).pending, true, 'unsaved progress is marked');
        clock += 5000; const c = await St.mutate(id, { type: 'sync' }, undefined, { since: 12345 }); assert.equal(writes, 1); assert.equal(c.before, null, 'stale sv → full response');
        clock += 5000; await St.mutate(id, { type: 'start' }); assert.equal(writes, 2, 'an action writes at once'); assert.equal(St.recentOf(id).pending, false);
        clock += 5000; await St.mutate(id, { type: 'sync', final: true }); assert.equal(writes, 3, 'the final sync (page hidden) writes at once');
        clock += 5000; await St.mutate(id, { type: 'sync' }); assert.equal(writes, 3);
        clock += St.PERSIST_MS; await St.mutate(id, { type: 'sync' }); assert.equal(writes, 4, 'after PERSIST_MS the next sync writes');
        // 아직 안 쓴 진행이 있는 사본은 RECENT_TTL(90초)이 지나도 버리지 않고 이어 씁니다(DB의 옛 lastTick부터 다시 굴리지 않음).
        clock += 5000; const d = await St.mutate(id, { type: 'sync' }); assert.equal(writes, 4); assert.equal(St.recentOf(id).pending, true);
        let reads = 0; const realGet = database.getPlayer.bind(database); database.getPlayer = async x => { reads++; return realGet(x); };
        clock += 95_000; const e = await St.mutate(id, { type: 'sync' }); assert.equal(reads, 0, 'kept copy reused although older than the TTL'); assert.equal(writes, 5, 'and written now (interval passed)'); assert.ok(e.state.lastTick >= d.state.lastTick);
        const saved = JSON.parse((await realGet(id)).state); assert.equal(saved.lastTick, e.state.lastTick, 'DB holds the latest');
    } finally { Date.now = realNow; St.forgetRecent(); delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});
