// 전투 화면 재생(표시 전용): 동기화 사이 로그를 턴으로 묶어 프레임을 만들고, 마지막 프레임은 서버 상태와 같아야 합니다. 전용 난수를 써서 공유 난수 순서에 영향을 주지 않습니다.
import { loadGame } from '../scripts/lib/game-modules.mjs';
import { newState, act, tick, stats, BALANCE, assert, test } from './harness.mjs';
const { deathRecoveryTurns } = await loadGame().load('data/sprout');
const { buildCombatReplay, groupReplayTurns, combatFxBatch, combatFxSkipped, FX_BEAT_MS } = await loadGame().load('game/systems/combat-feedback.js');
const seeded = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const clone = s => structuredClone(s);
/** 서버처럼 turnMs마다 한 턴씩 진행하고, 3초 동기화처럼 몇 턴씩 끊어 재생 프레임을 검사합니다. */
function replaySession(s, turns, rng, per = [1, 2]) {
    const out = [];
    for (let i = 0, done = 0; done < turns; i++) {
        const prev = clone(s), n = Math.min(per[i % per.length], turns - done);
        for (let k = 0; k < n; k++) { tick(s, rng); s.lastTick += BALANCE.turnMs; }
        done += n;
        const next = clone(s), a = stats(next);
        out.push({ prev, next, replay: buildCombatReplay(prev, next, a.hp, a.mana), maxHp: a.hp });
    }
    return out;
}
test('battle replay: turns follow lastTick, strikes 260ms apart, last frame equals server state', () => {
    const rng = seeded(11), s = newState(0); act(s, { type: 'start' }, 0);
    for (const { prev, next, replay, maxHp } of replaySession(s, 60, rng)) {
        assert.ok(replay, 'replayable');
        assert.equal(replay.length, Math.round((next.lastTick - prev.lastTick) / BALANCE.turnMs));
        let lastLog = prev.logs.at(-1)?.id ?? 0;
        for (const turn of replay) {
            turn.frames.forEach((f, i) => {
                // 연속 행동으로 타격이 많으면 간격을 좁혀 다음 턴 전에 끝냅니다.
                const beat = turn.frames.length > 1 ? Math.min(FX_BEAT_MS, Math.floor(BALANCE.turnMs * .8 / (turn.frames.length - 1))) : FX_BEAT_MS;
                assert.equal(f.offset, i * beat);
                assert.ok(f.offset < BALANCE.turnMs);
                assert.ok(f.lastLogId >= lastLog); lastLog = f.lastLogId;
                assert.ok(f.hp >= 0 && f.hp <= maxHp);
                if (f.enemy) assert.ok(f.enemy.hp >= 0 && f.enemy.hp <= f.enemy.maxHp);
            });
            assert.ok(turn.frames.length <= 2 * BALANCE.chainMaxActions, 'one frame per strike');
        }
        const last = replay.at(-1).frames.at(-1);
        assert.deepEqual([last.hp, last.mana, last.recovery, last.lastLogId, last.effects], [next.hp, next.mana, next.recovery, next.logs.at(-1).id, next.effects]);
        if (next.enemy) assert.deepEqual(last.enemy, next.enemy);
    }
});
test('battle replay: same-enemy turns step HP exactly by logged damage', () => {
    const rng = seeded(5), s = newState(0); act(s, { type: 'start' }, 0);
    let checked = 0;
    for (const { prev, next, replay } of replaySession(s, 80, rng, [2])) {
        const fresh = next.logs.filter(l => l.id > prev.logs.at(-1).id);
        if (!prev.enemy || !next.enemy || fresh.some(l => l.type !== 'battle')) continue;
        const frames = replay.flatMap(t => t.frames);
        assert.equal(frames.length, fresh.length);
        // 첫 타격 전 값(prev)에서 타격마다 로그의 피해만큼 줄어들어야 합니다.
        let enemyHp = prev.enemy.hp;
        frames.forEach((f, i) => { const ev = fresh[i].event; if (ev.actor === next.name) enemyHp -= ev.hits.reduce((n, h) => n + (h.miss ? 0 : h.value), 0); else enemyHp += ev.healed + ev.drained - (ev.dot?.value || 0) - (ev.reflected || 0); assert.equal(f.enemy.hp, enemyHp); });
        checked++;
    }
    assert.ok(checked > 5);
});
test('battle replay: field defeat counts recovery down one turn at a time', () => {
    const rng = seeded(3), s = newState(0); s.rebirths = 5; act(s, { type: 'start' }, 0); // v27.89 환생 5회 미만은 회복 대기 절반이라 기본 규칙은 5회로 봅니다.
    s.hp = 1;
    let seen = false;
    for (const { replay } of replaySession(s, 40, rng, [1, 2])) {
        const values = replay.map(t => t.frames.at(-1).recovery);
        if (values.some(v => v === deathRecoveryTurns(s))) seen = true;
        for (let i = 1; i < values.length; i++) if (values[i - 1] > 0 && values[i] > 0) assert.equal(values[i], values[i - 1] - 1);
    }
    assert.ok(seen, 'defeat happened and was replayed');
});
test('battle replay: grouping and skipped-hit counter', () => {
    const hit = (id, actor) => ({ id, type: 'battle', text: `${actor} · 기본 공격 → 3 물리 피해`, event: { actor, skillName: '기본 공격', damageType: 'physical', hits: [{ kind: 'main', value: 3, critical: false, miss: false }], total: 3, healed: 0, drained: 0, statuses: [] } });
    const logs = [hit(1, '나'), hit(2, '적'), hit(3, '나'), { id: 4, type: 'reward', text: '적 처치 · +3 G · +2 EXP' }, hit(5, '나'), hit(6, '적'), { id: 7, type: 'system', text: '숨을 고르고 다시 무기를 들었습니다.' }];
    assert.deepEqual(groupReplayTurns(logs).map(g => g.map(l => l.id)), [[1, 2], [3, 4], [5, 6], [7]]);
    const many = Array.from({ length: 20 }, (_, i) => hit(i + 1, i % 2 ? '적' : '나'));
    assert.equal(combatFxBatch(many, 0, '나').length, 6);
    assert.equal(combatFxSkipped(many, 0, '나'), 14);
    assert.equal(combatFxSkipped(many, 16, '나'), 0);
});
test('battle replay: unreplayable batches fall back to an immediate update', () => {
    const rng = seeded(9), s = newState(0); act(s, { type: 'start' }, 0);
    const prev = clone(s);
    for (let k = 0; k < 60; k++) { tick(s, rng); s.lastTick += BALANCE.turnMs; }
    const a = stats(s);
    assert.equal(buildCombatReplay(prev, s, a.hp, a.mana), null, 'more than the 70-line log window');
});

test('v3.101 battle records: client-side per-mob fights from synced logs (win/lose/flee, ×N swarm 5 kept, plain mob 1 + previous summary, gaps marked partial)', async () => {
    const R = await loadGame().load('game/systems/battle-records.js');
    let x = 7; const rng = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
    // 실제 사냥 로그를 동기화마다 받는 것처럼 나눠 넣습니다.
    const s = newState(0); s.running = true; const store = R.emptyBattleRecords();
    for (let k = 0; k < 120; k++) { tick(s, rng); s.lastTick += BALANCE.turnMs; if (k % 3 === 2) R.ingestBattleLogs(store, s.logs, s.name, k); }
    R.ingestBattleLogs(store, s.logs, s.name, 999);
    const all = Object.values(store.byMob).flat();
    assert.ok(all.length > 0 && all.every(r => r.label && r.turns >= 1 && r.lines.length <= R.BATTLE_RECORD.lines), 'fights recorded');
    assert.ok(all.some(r => r.result === 'win' && r.dealt > 0 && r.lines.at(-1).text.includes('처치')), 'win closes on the kill line');
    for (const [name, list] of Object.entries(store.byMob)) if (!R.isSpecialMob(name)) assert.ok(list.filter(r => r.result !== 'lose').length <= 1, `plain mob keeps one: ${name}`);
    assert.ok(all.some(r => r.before), 'a later win carries the previous win summary');
    // 합성 로그: 무리 ×100 6번 승리 → 5개, 패배 · 달아남, 건너뛴 id는 일부.
    const me = '나', ev = (actor, total, crit = false) => ({ actor, skillName: '기본 공격', damageType: 'physical', hits: [{ kind: 'main', value: total, critical: crit, miss: false }], total, healed: 0, drained: 0, statuses: [] });
    const t = R.emptyBattleRecords(); let id = 0;
    const line = (type, text, event, turn) => ({ id: ++id, type, text, turn, ...(event ? { event } : {}) });
    for (let n = 0; n < 6; n++) R.ingestBattleLogs(t, [line('battle', '', ev(me, 50 + n, n === 5), 1), line('battle', '', ev('스포아 ×100', 7), 1), line('battle', '', ev(me, 60), 2), line('reward', '스포아 ×100 처치 · +1 G · +1 EXP')], me);
    assert.equal(t.byMob['스포아 ×100'].length, 5); const top = t.byMob['스포아 ×100'][0];
    assert.deepEqual([top.result, top.turns, top.dealt, top.taken, top.maxHit, top.crits], ['win', 2, 115, 7, 60, 1]);
    assert.deepEqual(R.compareWithPrevious(top), { turns: 0, maxHit: 1 });
    R.ingestBattleLogs(t, [line('battle', '', ev('[보스] 자쿰', 999), 3), line('system', '몬스터를 놓쳤습니다. 50초 동안 회복합니다.')], me);
    assert.equal(t.byMob['[보스] 자쿰'][0].result, 'lose');
    id += 5; // 서버가 잘라 보낸 줄
    R.ingestBattleLogs(t, [line('battle', '', ev('◆ 거대 개체 스포아', 3), 4), line('system', '◆ 거대 개체 스포아이(가) 줄을 끊고 달아났습니다. 다음 몬스터를 기다립니다.')], me);
    const giant = t.byMob['◆ 거대 개체 스포아'][0]; assert.equal(giant.result, 'flee'); assert.equal(t.order[0], '◆ 거대 개체 스포아');
    R.ingestBattleLogs(t, [line('battle', '', ev(me, 1), 5)], me); id += 3;
    R.ingestBattleLogs(t, [line('battle', '', ev('스포아', 1), 5), line('reward', '✦ 황금 스포아 처치 · +10 G')], me);
    assert.ok(t.byMob['스포아'][0].partial && t.byMob['스포아'][0].golden, 'gap → partial, golden flag');
});
