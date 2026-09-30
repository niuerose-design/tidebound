// 전투 화면 재생(표시 전용): 동기화 사이 로그를 턴으로 묶어 프레임을 만들고, 마지막 프레임은 서버 상태와 같아야 합니다. 전용 난수를 써서 공유 난수 순서에 영향을 주지 않습니다.
import { loadGame } from '../scripts/lib/game-modules.mjs';
import { newState, act, tick, stats, BALANCE, assert, test } from './harness.mjs';
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
                assert.equal(f.offset, i * FX_BEAT_MS);
                assert.ok(f.lastLogId >= lastLog); lastLog = f.lastLogId;
                assert.ok(f.hp >= 0 && f.hp <= maxHp);
                if (f.enemy) assert.ok(f.enemy.hp >= 0 && f.enemy.hp <= f.enemy.maxHp);
            });
            assert.ok(turn.frames.length <= 2, 'one frame per strike');
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
    const rng = seeded(3), s = newState(0); act(s, { type: 'start' }, 0);
    s.hp = 1;
    let seen = false;
    for (const { replay } of replaySession(s, 40, rng, [1, 2])) {
        const values = replay.map(t => t.frames.at(-1).recovery);
        if (values.some(v => v === BALANCE.recoveryTurns)) seen = true;
        for (let i = 1; i < values.length; i++) if (values[i - 1] > 0 && values[i] > 0) assert.equal(values[i], values[i - 1] - 1);
    }
    assert.ok(seen, 'defeat happened and was replayed');
});
test('battle replay: grouping and skipped-hit counter', () => {
    const hit = (id, actor) => ({ id, type: 'battle', text: `${actor} · 기본 공격 → 3 물리 피해`, event: { actor, skillName: '기본 공격', damageType: 'physical', hits: [{ kind: 'main', value: 3, critical: false, miss: false }], total: 3, healed: 0, drained: 0, statuses: [] } });
    const logs = [hit(1, '나'), hit(2, '적'), hit(3, '나'), { id: 4, type: 'reward', text: '적 포획 · +3 G · +2 EXP' }, hit(5, '나'), hit(6, '적'), { id: 7, type: 'system', text: '숨을 고르고 다시 낚싯대를 들었습니다.' }];
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
