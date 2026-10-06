// v3.84 전투 개편(docs/combat-rework.md): 각성기(5차 이상 액티브의 턴 단위 판정)와 추가 판정. 전용 난수만 씁니다.
import { loadGame } from '../scripts/lib/game-modules.mjs';
import { newState, act, strike, SKILLS, JOBS, SKILL_FORMULA, STATUS_TUNING, assert, test } from './harness.mjs';
const { actTurn } = await loadGame().load('game/systems/combat.js');
const { apUsed, apCapacity, extraRollLevel, trimLoadout } = await loadGame().load('game/systems/progression.js');

const base = { hp: 1e9, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 1000, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
const fighter = (skills, fields = {}) => ({ name: 'A', stats: { ...base }, hp: 1e9, mana: 1000, skills, cooldowns: {}, stun: 0, effects: {}, ranks: Object.fromEntries(skills.map(id => [id, 1])), mastery: {}, practice: {}, ...fields });
const dummy = () => ({ name: 'B', stats: { ...base }, hp: 1e9, skills: [], cooldowns: {}, stun: 0, effects: {} });
/** 한 턴(strike)을 치르고 이번 턴에 나간 각성기 id를 돌려줍니다. */
const turn = (a, b, rng, chained = false) => { const ev = []; strike(a, b, rng, ev, false, chained); return ev.filter(e => e.awaken).map(e => e.skillId); };

test('v3.84 every tier-5+ active is an awakening skill with a 10-turn cooldown that starts full', () => {
    const tier = id => JOBS.find(j => j.id === id)?.tier ?? 0;
    const awakened = SKILLS.filter(sk => sk.type === 'active' && tier(sk.job) >= SKILL_FORMULA.awaken.tier);
    assert.ok(awakened.length >= 34, `${awakened.length}`);
    for (const sk of awakened) { assert.equal(sk.awaken.start, 10, sk.id); assert.equal(sk.cooldown, 10, sk.id); assert.equal(!!sk.awaken.statusScale, !!sk.effect && sk.effect !== 'heal' && sk.effect !== 'drain', sk.id); }
    // 덜 자주 걸리는 만큼 상태이상 지속(패시브 보너스 포함)이 늘어납니다.
    const a = { name: 'A', stats: { ...base, dotTurnsBonus: 2 }, hp: 1e9, mana: 1000, skills: ['trenchPierce'], cooldowns: { trenchPierce: 0 }, stun: 0, effects: {}, ranks: { trenchPierce: 1 }, mastery: {}, practice: {} }, ev = [];
    strike(a, dummy(), () => 0, ev);
    const sk = SKILLS.find(x => x.id === 'trenchPierce');
    assert.equal(ev.find(e => e.awaken).statuses[0].turns, Math.round(((sk.statusTurns ?? STATUS_TUNING.bleedTurns) + 2) * sk.awaken.statusScale));
    assert.ok(SKILLS.filter(sk => sk.awaken).every(sk => tier(sk.job) >= 5), 'only tier 5+ skills awaken');
});

test('v3.84 awakening rolls once per turn, waits 10 turns at the start and after each cast', () => {
    const a = fighter(['braveSlash']), b = dummy(), fired = [];
    for (let t = 1; t <= 30; t++) if (turn(a, b, () => 0).length) fired.push(t);
    assert.deepEqual(fired, [11, 22], 'never right at the start, then every 11th turn with a sure roll');
});

test('v3.84 a failed awakening roll adds the base chance to the next roll (27% → 54% → 81% → 100%)', () => {
    const a = fighter(['braveSlash']), b = dummy(), fired = [];
    a.cooldowns.braveSlash = 0;
    for (let t = 1; t <= 4; t++) { if (turn(a, b, () => .99).length) fired.push(t); if (t < 4) assert.equal(a.cooldowns['~braveSlash'], t); }
    assert.deepEqual(fired, [4]);
    assert.equal(a.cooldowns['~braveSlash'], undefined, 'pity resets after the cast');
    assert.equal(a.cooldowns.braveSlash, 10);
});

test('v3.84 chain actions are not turns; guaranteed extra turns are', () => {
    const a = fighter(['braveSlash']), b = dummy();
    for (let i = 0; i < 5; i++) turn(a, b, () => 0, true);
    assert.equal(a.cooldowns.braveSlash, undefined, 'chained actions do not touch the awakening');
    turn(a, b, () => 0);
    assert.equal(a.cooldowns.braveSlash, 9);
    // 제로의 확정 추가 행동: 한 번의 actTurn 안에서 두 턴으로 셉니다.
    const zero = SKILLS.find(sk => sk.extraTurn && sk.type === 'active' && !sk.awaken && !sk.condition);
    const z = fighter([zero.id, 'braveSlash'], { stats: { ...base, speed: 1 } });
    actTurn(z, dummy(), () => 0, () => {});
    assert.equal(z.cooldowns.braveSlash, 8);
});

test('v3.84 only one awakening fires per turn; it can join any active in the same turn', () => {
    const a = fighter(['flashCut', 'jackpotStrike', 'allOrNothing']), b = dummy();
    a.cooldowns.jackpotStrike = 0; a.cooldowns.allOrNothing = 0;
    const ev = []; strike(a, b, () => 0, ev);
    assert.equal(ev[0].skillId, 'flashCut', 'the normal roll ignores awakening skills');
    assert.deepEqual(ev.filter(e => e.awaken).map(e => e.skillId), ['jackpotStrike']);
    assert.equal(a.cooldowns.allOrNothing, 0, 'the other one waits for the next turn');
    assert.deepEqual(turn(a, b, () => 0), ['allOrNothing']);
});

test('v3.84 stunned or silenced turns still count down but do not cast', () => {
    const a = fighter(['braveSlash']), b = dummy();
    a.cooldowns.braveSlash = 0; a.stun = 1;
    assert.deepEqual(turn(a, b, () => 0), []);
    assert.deepEqual(turn(a, b, () => 0), ['braveSlash']);
});

test('v3.84 extra roll: after an active fires, roll the actives below it once more at 60% power', () => {
    const dealt = (skills, rolls) => { const a = fighter(skills, { extraRolls: rolls }), ev = []; strike(a, dummy(), () => 0, ev); return ev; };
    const solo = dealt(['pierce'], 0)[0].total;
    const ev = dealt(['flashCut', 'pierce'], 1);
    assert.deepEqual(ev.map(e => e.skillId), ['flashCut', 'pierce']);
    assert.deepEqual(ev[1].followUp, { index: 1, power: SKILL_FORMULA.extraRoll.power[0] });
    assert.ok(Math.abs(ev[1].total - solo * .6) <= 1, `${ev[1].total} vs ${solo}`);
    assert.deepEqual(dealt(['flashCut', 'pierce'], 0).map(e => e.skillId), ['flashCut'], 'off without the level');
    assert.deepEqual(dealt(['pierce', 'flashCut'], 1).map(e => e.skillId), ['pierce', 'flashCut']);
    // 기본 공격으로 끝난 행동에는 붙지 않습니다.
    const a = fighter(['flashCut', 'pierce'], { extraRolls: 1 }), log = []; strike(a, dummy(), () => .99, log);
    assert.equal(log.filter(e => e.followUp).length, 0);
});

test('v3.84 extra roll costs 12 AP, needs the world-stone research and is dropped before skills when AP runs short', () => {
    const s = newState(0); s.rebirths = 30; s.permanent.ap = 12;
    assert.throws(() => act(s, { type: 'extraRoll', value: '1' }, 0), /연계의 기억/);
    s.permanent.extraRoll = 1;
    const used = apUsed(s);
    act(s, { type: 'extraRoll', value: '1' }, 0);
    assert.equal(extraRollLevel(s), 1);
    assert.equal(apUsed(s), used + 12);
    assert.ok(apUsed(s) <= apCapacity(s));
    s.rebirths = 0; s.permanent.ap = 0; trimLoadout(s);
    assert.equal(extraRollLevel(s), 0, 'not enough AP → extra roll turns off first');
    s.permanent.ap = 12; s.extraRolls = 1; s.permanent.extraRoll = 0;
    assert.equal(extraRollLevel(s), 0, 'research reset turns it off');
    act(s, { type: 'extraRoll', value: '0' }, 0);
    assert.equal(s.extraRolls, undefined);
});
