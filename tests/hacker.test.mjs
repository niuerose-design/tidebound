// v3.17 해커 1단계: 제약 · 재화 분리 · 침투 작전(서버 키 정답) · 해킹 I · 애드가드
import { newState, act, tick, snapshot, JOBS, SKILLS, assert, test } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
const { load } = loadGame();
const H = await load('game/systems/hacker.js'), D = await load('game/data/hacker.js');

const hacker = () => { const s = newState(0); s.level = 40; s.rebirths = 5; s.sp = 10; s.pearls = 500; act(s, { type: 'job', id: 'hacker' }, 0); return s; };

test('v3.17 hacker job: hidden mystery tier-1 job without stat penalties (combat is blocked by rule), adguard as its only skill', () => {
    const j = JOBS.find(x => x.id === 'hacker');
    assert.ok(j && j.hidden && j.tree === 'mystery' && j.tier === 1 && j.rebirth === 3);
    // v3.17 몹을 만나지 않으니 능력치 보정은 없고, 전투 참여를 규칙으로 막습니다.
    assert.deepEqual([j.attack, j.magic, j.hp, j.defense, j.resist], [1, 1, 1, 1, 1]); assert.ok(!j.constraint);
    assert.ok(H.hackerCombatBlock({ job: 'hacker' }) && !H.hackerCombatBlock({ job: 'fisher' }));
    assert.deepEqual(SKILLS.filter(sk => sk.job === 'hacker').map(sk => sk.id), ['adGuard']);
    const s = newState(0); s.level = 40; s.rebirths = 2; assert.throws(() => act(s, { type: 'job', id: 'hacker' }, 0));
});

test('v3.17 hacker constraints: no stat allocation, no dungeons, loadout parked and restored, no combat or exp while idle', () => {
    const s = newState(0); s.level = 40; s.rebirths = 5; s.statPoints = 10;
    s.skills = s.skills.length ? s.skills : ['hook'];
    const before = [...s.skills];
    act(s, { type: 'job', id: 'hacker' }, 0);
    assert.deepEqual(s.skills, [], 'non-hacker skills come off'); assert.deepEqual(s.hacker.savedSkills, before);
    assert.throws(() => act(s, { type: 'attribute', id: 'str' }, 0), /능력치/);
    assert.throws(() => act(s, { type: 'dungeon', id: 'abyss' }, 0), /던전/);
    const lv = s.level, exp = s.exp, kills = s.kills, gold = s.gold;
    act(s, { type: 'start' }, 0); for (let i = 0; i < 1800; i++) tick(s, () => .5);
    assert.equal(s.level, lv); assert.equal(s.exp, exp); assert.equal(s.kills, kills); assert.equal(s.gold, gold); assert.ok(!s.enemy, 'no combat');
    assert.ok(Math.abs(s.hacker.bits - 1800 * D.HACKER.brute.bits) < 1e-6, 'brute force bits'); assert.ok(s.hacker.exp > 80);
    act(s, { type: 'job', id: 'fisher' }, 0); assert.ok(before.every(id => s.skills.includes(id) || !before.length), 'loadout restored');
});

test('v3.17 currency is one-way: SP and pearls burn into bits, nothing converts back', () => {
    const s = hacker();
    act(s, { type: 'hackConvert', id: 'sp', value: '2' }, 0); act(s, { type: 'hackConvert', id: 'pearls', value: '10' }, 0);
    assert.equal(s.sp, 8); assert.equal(s.pearls, 490); assert.equal(s.hacker.bits, 2 * 40 + 10 * 4);
    assert.throws(() => act(s, { type: 'hackConvert', id: 'gold', value: '1' }, 0));
    assert.throws(() => act(s, { type: 'hackConvert', id: 'sp', value: '99' }, 0), /SP/);
});

test('v3.17 infiltration: the answer is never in the save, lock/port puzzles grade correctly, cash out vs trace', () => {
    const s = hacker(); H.setPuzzleKey('test-key-1');
    act(s, { type: 'infilStart' }, 0, () => .25);
    const run = s.hacker.infil, answer = H.nodeAnswer(run);
    assert.ok(!JSON.stringify(s).includes(`"${answer}"`), 'answer not stored');
    assert.equal(run.node.kind, 'lock'); assert.equal(answer.length, 3); assert.equal(new Set(answer).size, 3);
    H.setPuzzleKey('another-key'); assert.notEqual(H.nodeAnswer(run), answer, 'key changes the answer'); H.setPuzzleKey('test-key-1');
    assert.throws(() => act(s, { type: 'infilGuess', value: '112' }, 0), /서로 다른/);
    const wrong = [...'0123456789'].filter(c => !answer.includes(c)).slice(0, 3).join('');
    act(s, { type: 'infilGuess', value: wrong }, 0); assert.equal(run.node.history[0].hint, '0S 0B');
    act(s, { type: 'infilGuess', value: answer }, 0);
    assert.equal(s.hacker.infil.depth, 1); assert.equal(s.hacker.infil.node.kind, 'port');
    const port = Number(H.nodeAnswer(s.hacker.infil));
    act(s, { type: 'infilGuess', value: String(port === 1 ? 2 : 1) }, 0); assert.equal(s.hacker.infil.node.history[0].hint, port === 1 ? 'DOWN' : 'UP');
    act(s, { type: 'infilGuess', value: String(port) }, 0);
    const bank = { ...s.hacker.infil.bank }, bits = s.hacker.bits;
    assert.deepEqual(bank, { bits: D.HACKER.infil.reward(1).bits + D.HACKER.infil.reward(2).bits, exp: D.HACKER.infil.reward(1).exp + D.HACKER.infil.reward(2).exp });
    act(s, { type: 'infilCashout' }, 0); assert.equal(s.hacker.bits, bits + bank.bits); assert.equal(s.hacker.infil, null); assert.equal(s.hacker.bestDepth, 2);
    // 추적: 시도를 다 쓰면 쌓인 보상의 절반만.
    act(s, { type: 'infilStart' }, 0, () => .7); const r2 = s.hacker.infil, a2 = H.nodeAnswer(r2);
    act(s, { type: 'infilGuess', value: a2 }, 0); const banked = s.hacker.infil.bank.bits, b0 = s.hacker.bits, p = Number(H.nodeAnswer(s.hacker.infil));
    const tries = s.hacker.infil.node.max; for (let i = 0; i < tries; i++) act(s, { type: 'infilGuess', value: String(p === 1 ? 2 : 1) }, 0);
    assert.equal(s.hacker.infil, null); assert.equal(s.hacker.bits, b0 + Math.floor(banked * D.HACKER.infil.traceKeep));
    act(s, { type: 'infilStart' }, 0); act(s, { type: 'infilCashout' }, 0);
    assert.throws(() => act(s, { type: 'infilStart' }, 0), /입장/, 'three entries a day');
    act(s, { type: 'infilStart' }, 86400000 * 2); assert.ok(s.hacker.infil, 'next day resets');
});

test('v3.17 hack I: unlock with grade and bits, broadcast/crack charge bits and leave a pending write; daily caps', () => {
    const s = hacker();
    assert.throws(() => act(s, { type: 'hackRun', id: 'broadcast', value: 'hi' }, 0), /해금/);
    s.hacker.bits = 1000; act(s, { type: 'hackUnlock' }, 0); assert.equal(s.hacker.tier, 1); assert.equal(s.hacker.bits, 1000 - D.HACKER.tiers[0].bits);
    assert.throws(() => act(s, { type: 'hackRun', id: 'broadcast', value: 'x'.repeat(41) }, 0), /40/);
    act(s, { type: 'hackRun', id: 'broadcast', value: '서버는 내가 접수한다' }, 0);
    assert.deepEqual(s.hacker.pending, { kind: 'broadcast', value: '서버는 내가 접수한다', minutes: 30 });
    delete s.hacker.pending;
    assert.throws(() => act(s, { type: 'hackRun', id: 'broadcast', value: 'again' }, 0), /횟수/, 'tier I: once a day');
    act(s, { type: 'hackRun', id: 'crack', value: 'duel:2026-10:someone' }, 0); assert.equal(s.hacker.pending.kind, 'crack');
    assert.deepEqual([1, 3, 10].map(n => D.HACKER.broadcast.minutes(n)), [30, 36, 57]); assert.deepEqual([1, 3, 10].map(n => D.HACKER.broadcast.perDay(n)), [1, 2, 4]);
});

test('v3.17 adguard: mastery from hacker activity, level 1 hides everything, level 2 shows chosen fields; survives rebirth', () => {
    const s = hacker(); act(s, { type: 'skill', id: 'adGuard' }, 0); assert.ok(s.skills.includes('adGuard'));
    assert.equal(snapshot(s).privacy, undefined, 'mastery 0: off');
    H.gainHacker(s, 0, 300); assert.ok(s.skillPractice.adGuard >= 250); assert.deepEqual(snapshot(s).privacy, { show: [] });
    assert.throws(() => act(s, { type: 'privacy', value: 'job' }, 0), /2단계/);
    H.gainHacker(s, 0, 1000); act(s, { type: 'privacy', value: 'job,level,nope' }, 0); assert.deepEqual(snapshot(s).privacy, { show: ['job', 'level'] });
    assert.ok(s.hacker.grade > 1, 'grade rises with exp');
    s.level = 200; act(s, { type: 'rebirth' }, 0); assert.ok(s.hacker && s.hacker.grade > 1 && s.privacy, 'hacker progress survives rebirth');
});
