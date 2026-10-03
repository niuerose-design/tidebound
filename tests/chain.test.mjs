// 연속 행동: 상대보다 빠르면 행동마다 확률로 한 번 더 행동합니다(턴당 최대 5회). 전용 난수를 써서 공유 난수 순서에 영향을 주지 않습니다.
import { loadGame } from '../scripts/lib/game-modules.mjs';
import { newState, act, advance, tick, strike, duel, TRAINING, BALANCE, assert, test } from './harness.mjs';
const { actTurn, chainChance } = await loadGame().load('game/systems/combat.js');
const seeded = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const counted = rng => { const f = () => { f.calls++; return rng(); }; f.calls = 0; return f; };
const fighter = (name, speed, extra = {}) => ({ name, stats: { hp: 100000, attack: 10, defense: 0, crit: 0, accuracy: 10, speed }, hp: 100000, skills: [], cooldowns: {}, stun: 0, effects: {}, ...extra });
const run = (a, b, rng) => { const out = []; actTurn(a, b, rng, (text, ev) => out.push({ text, ev })); return out; };
test('chain: probability is min(1, 0.5 × log2(speed ratio)) and 0 when not faster', () => {
    const p = (x, y) => chainChance(fighter('a', x), fighter('b', y));
    assert.equal(BALANCE.chainCoefficient, 0.5);
    assert.ok(Math.abs(p(12, 10) - .5 * Math.log2(1.2)) < 1e-12);
    assert.equal(p(20, 10), .5);
    assert.equal(p(40, 10), 1);
    assert.equal(p(100, 10), 1);
    assert.equal(p(10, 10), 0);
    assert.equal(p(10, 20), 0);
    // 가속·감속도 반영됩니다.
    assert.ok(chainChance(fighter('a', 10, { effects: { haste: 2 } }), fighter('b', 10)) > 0);
});
test('chain: at most 5 actions per fighter per turn, numbered 2..5 in event and log', () => {
    const acts = run(fighter('빠름', 400), fighter('느림', 10), seeded(3));
    assert.equal(acts.length, BALANCE.chainMaxActions);
    assert.deepEqual(acts.map(a => a.ev.chain), [undefined, 2, 3, 4, 5]);
    assert.ok(acts[1].text.endsWith(' · 연속 2') && !acts[0].text.includes('연속'));
});
test('chain: stops as soon as either side falls', () => {
    const acts = run(fighter('빠름', 400, { stats: { hp: 100, attack: 500, defense: 0, crit: 0, accuracy: 10, speed: 400 } }), fighter('느림', 10, { hp: 5 }), seeded(4));
    assert.equal(acts.length, 1);
});
test('chain: equal or slower speed uses exactly the same random numbers as a single strike', () => {
    for (const [x, y] of [[10, 10], [10, 30]]) {
        const r1 = counted(seeded(9)), r2 = counted(seeded(9));
        const acts = run(fighter('a', x), fighter('b', y), r1);
        const text = strike(fighter('a', x), fighter('b', y), r2);
        assert.equal(acts.length, 1);
        assert.equal(acts[0].text, text);
        assert.equal(r1.calls, r2.calls);
    }
});
test('chain: extra actions are full actions (cooldowns and stun advance)', () => {
    const a = fighter('빠름', 400, { stun: 2, cooldowns: { x: 3 } });
    const acts = run(a, fighter('느림', 10), seeded(5));
    assert.equal(acts.length, BALANCE.chainMaxActions);
    assert.equal(acts.filter(x => x.ev.stunned).length, 2);
    assert.equal(a.stun, 0);
    assert.equal(a.cooldowns.x, 0);
});
test('chain: online ticks and offline advance give the same result', () => {
    const a = newState(0), b = newState(0);
    act(a, { type: 'start' }, 0); act(b, { type: 'start' }, 0);
    const ra = seeded(21), rb = seeded(21);
    for (let i = 0; i < 400; i++) { tick(a, ra); a.lastTick += BALANCE.turnMs; }
    advance(b, 400 * BALANCE.turnMs, rb);
    b.lastOffline = a.lastOffline; if (b.doorsOpened) a.doorsOpened = b.doorsOpened; a.event = b.event; // advance()만 문 개방·이벤트를 기록합니다(시각이 필요).
    assert.deepEqual(a, b);
    assert.ok(a.logs.some(l => l.event?.chain), 'chains happened');
});
test('chain: duels use the same rule', () => {
    const fast = { ...TRAINING[0], name: '쾌속', stats: { ...TRAINING[0].stats, speed: 60 } };
    const r = duel(fast, TRAINING[0], true, seeded(8));
    assert.ok(r.logs.some(l => l.includes('연속 2')));
});
