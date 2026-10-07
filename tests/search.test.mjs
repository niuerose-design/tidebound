// v3.97 사냥터 탐색: 전투가 끝나면 다음 몬스터를 찾는 동안 전투 없이 턴이 지나갑니다(기본 3초 · 최저 2초, 턴 2초).
import { loadGame } from '../scripts/lib/game-modules.mjs';
import { newState, tick, act, stats, SKILLS, assert, test } from './harness.mjs';
const { load } = loadGame();
const S = await load('game/systems/search.js'), { buildCombatReplay } = await load('game/systems/combat-feedback.js');
const { STAGES } = await load('game/data/world.js');

/** 한 방에 잡는 몸: 첫 사냥터 몬스터를 1턴에 잡습니다. */
const hunter = () => { const s = newState(0); s.running = true; s.attributes.str = 400; s.statPoints = 0; s.hp = stats(s).hp; return s; };
const battleTurns = s => new Set(s.logs.filter(l => l.type === 'battle').map(l => l.turn));

test('v3.97 search: after a kill the next turns have no combat; 3s alternates 1 and 2 turns, then a monster appears', () => {
    const s = hunter(), rng = () => .5;
    const gaps = [];
    for (let kills = 0, last = 0; kills < 5;) {
        const before = s.kills; tick(s, rng);
        if (s.kills > before) { if (last) gaps.push(s.turn - last - 1); last = s.turn; kills++; }
    }
    assert.deepEqual(gaps, [1, 2, 1, 2], 'search turns between one-turn kills (carry 1s)');
    assert.equal(S.searchTime(s).ms, S.SEARCH.baseMs);
});

test('v3.97 search: frozen combat (no cooldown/awakening/effect change) and per-second regen from turn regen', () => {
    const s = hunter(), rng = () => .5;
    while (!s.searching) tick(s, rng);
    const a = stats(s); s.hp = Math.floor(a.hp / 2); s.mana = 0; s.cooldowns = { foo: 3 }; s.effects = { haste: 2 };
    const hp = s.hp, turn = s.turn; tick(s, rng);
    assert.equal(s.turn, turn + 1);
    assert.deepEqual(s.cooldowns, { foo: 3 }, 'cooldowns do not tick while searching');
    assert.deepEqual(s.effects, { haste: 2 }, 'buffs do not tick while searching');
    assert.equal(s.hp, Math.min(a.hp, hp + Math.floor(a.hpRegen * 2)), 'hp regen per second × 2s');
    assert.equal(s.mana, Math.min(a.mana, Math.floor(a.manaRegen * 2)), 'mana regen per second × 2s');
    assert.ok(!battleTurns(s).has(s.turn), 'no battle log on a search turn');
});

test('v3.97 search: research, passives and a familiar stage cut it down to the 2s floor (one turn every time)', () => {
    const s = hunter();
    s.permanent.tracking = 5;
    assert.equal(S.searchTime(s).ms, 2500);
    const passive = SKILLS.find(sk => sk.searchCut);
    assert.ok(passive && passive.desc.includes('찾는 시간'), 'search passive described');
    s.skills = [passive.id]; assert.equal(S.searchTime(s).ms, 2200);
    for (const id of STAGES.find(x => x.id === s.stage).fish) s.book[id] = 50;
    assert.ok(S.familiarStage(s)); assert.equal(S.searchTime(s).ms, 2000);
    s.skills = SKILLS.filter(sk => sk.searchCut).map(sk => sk.id); assert.equal(S.searchTime(s).ms, S.SEARCH.minMs, 'never below 2s');
    s.searchCarry = 0; for (let i = 0; i < 4; i++) { S.startSearch(s); assert.equal(s.searching, 1); assert.equal(s.searchCarry, 0); }
});

test('v3.97 search: none in dungeons, none after a defeat, and switching hunting grounds skips it', () => {
    const s = hunter();
    s.dungeon = { id: 'grotto' }; S.startSearch(s); assert.equal(s.searching, undefined, 'dungeon: continuous combat');
    s.dungeon = null; s.hp = 0; S.startSearch(s); assert.equal(s.searching, undefined, 'defeat: recovery instead');
    s.hp = stats(s).hp; S.startSearch(s); assert.ok(s.searching > 0);
    s.level = 20;
    const other = STAGES.find(x => x.id !== s.stage && x.level <= s.level && !x.habitat && !x.rebirth);
    act(s, { type: 'stage', id: other.id }, 0);
    assert.equal(s.searching, undefined, 'new hunting ground: meet a monster right away');
});

test('v3.97 replay: groups land on their server turn, search turns show no enemy', () => {
    const s = hunter(), rng = () => .5;
    tick(s, rng); tick(s, rng);
    const prev = JSON.parse(JSON.stringify(s));
    for (let i = 0; i < 6; i++) { s.lastTick += 2000; tick(s, rng); }
    s.lastTick = prev.lastTick + 6 * 2000;
    const a = stats(s), turns = buildCombatReplay(prev, s, a.hp, a.mana);
    assert.ok(turns && turns.length === 6);
    const fought = battleTurns(s);
    for (const t of turns) {
        const serverTurn = prev.turn + t.turn;
        if (!fought.has(serverTurn)) assert.equal(t.frames.at(-1).enemy, null, `turn ${serverTurn} is a search turn`);
    }
});
