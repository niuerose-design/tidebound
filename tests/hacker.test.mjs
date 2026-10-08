// v3.18 해커 1단계: 제약 · 재화 분리 · 침투 작전(서버 키 정답) · 해킹 I · 애드가드
import { newState, act, tick, snapshot, JOBS, SKILLS, assert, test } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
const { load } = loadGame();
const H = await load('game/systems/hacker.js'), D = await load('game/data/hacker.js');

const hacker = () => { const s = newState(0); s.level = 40; s.rebirths = 5; s.sp = 10; s.pearls = 500; act(s, { type: 'job', id: 'hacker' }, 0); return s; };

test('v3.18 hacker job: hidden mystery tier-1 job without stat penalties (combat is blocked by rule), adguard as its only skill', () => {
    const j = JOBS.find(x => x.id === 'hacker');
    assert.ok(j && j.hidden && j.tree === 'mystery' && j.tier === 1 && j.rebirth === 3);
    // v3.18 몹을 만나지 않으니 능력치 보정은 없고, 전투 참여를 규칙으로 막습니다.
    assert.deepEqual([j.attack, j.magic, j.hp, j.defense, j.resist], [1, 1, 1, 1, 1]); assert.ok(!j.constraint);
    assert.ok(H.hackerCombatBlock({ job: 'hacker' }) && !H.hackerCombatBlock({ job: 'fisher' }));
    assert.deepEqual(SKILLS.filter(sk => sk.job === 'hacker').map(sk => sk.id), ['adGuard']);
    const s = newState(0); s.level = 40; s.rebirths = 2; assert.throws(() => act(s, { type: 'job', id: 'hacker' }, 0));
});

test('v3.18 hacker constraints: no stat allocation, no dungeons, loadout parked and restored, no combat or exp while idle', () => {
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

test('v3.18 currency is one-way: SP and pearls burn into bits, nothing converts back', () => {
    const s = hacker();
    act(s, { type: 'hackConvert', id: 'sp', value: '2' }, 0); act(s, { type: 'hackConvert', id: 'pearls', value: '10' }, 0);
    assert.equal(s.sp, 8); assert.equal(s.pearls, 490); assert.equal(s.hacker.bits, 2 * 40 + 10 * 4);
    assert.throws(() => act(s, { type: 'hackConvert', id: 'gold', value: '1' }, 0));
    assert.throws(() => act(s, { type: 'hackConvert', id: 'sp', value: '99' }, 0), /SP/);
});

test('v3.18 infiltration: the answer is never in the save, lock/port puzzles grade correctly, cash out vs trace', () => {
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
    for (let i = 0; i < 3; i++) { act(s, { type: 'infilStart' }, 0); act(s, { type: 'infilCashout' }, 0); }
    assert.throws(() => act(s, { type: 'infilStart' }, 0), /입장/, 'v3.26 five entries a day');
    act(s, { type: 'infilStart' }, 86400000 * 2); assert.ok(s.hacker.infil, 'next day resets');
});

test('v3.18 hack I: unlock with grade and bits, broadcast/crack charge bits and leave a pending write; daily caps', () => {
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

test('v3.26 identity spoof (old adguard): hacker-only, mastery sets daily uses and options, leaves a pending write; snapshots carry no self privacy', () => {
    const s = hacker(); act(s, { type: 'skill', id: 'adGuard' }, 0); assert.ok(s.skills.includes('adGuard'));
    assert.equal(SKILLS.find(sk => sk.id === 'adGuard').name, '신원 조작'); assert.equal(snapshot(s).privacy, undefined);
    s.hacker.bits = 100;
    assert.throws(() => act(s, { type: 'hackRun', id: 'spoof', value: 'abyss:x|' }, 0), /숙련 1단계/);
    H.gainHacker(s, 0, 300); assert.equal(H.adguardLevel(s), 1);
    act(s, { type: 'hackRun', id: 'spoof', value: 'abyss:x|job,level|5' }, 0); assert.deepEqual(s.hacker.pending, { kind: 'spoof', value: 'abyss:x|', minutes: 300 }, 'level 1 hides everything; 5 hours'); delete s.hacker.pending;
    assert.throws(() => act(s, { type: 'hackRun', id: 'spoof', value: 'self|' }, 0), /횟수/, 'level 1: once a day');
    H.gainHacker(s, 0, 1000); act(s, { type: 'hackRun', id: 'spoof', value: 'self|job,nope|0' }, 0); assert.deepEqual(s.hacker.pending, { kind: 'spoof', value: 'self|job', minutes: 0 }, 'v3.27 0 = indefinite');
    delete s.hacker.pending; s.hacker.used.spoof = 0; assert.throws(() => act(s, { type: 'hackRun', id: 'spoof', value: 'self||99999' }, 0), /기간/);
    assert.ok(s.hacker.grade > 1, 'grade rises with exp');
    s.level = 200; act(s, { type: 'rebirth' }, 0); assert.ok(s.hacker && s.hacker.grade > 1, 'hacker progress survives rebirth');
});

// ── v3.25 해커 2단계: 해킹 II~V · 프로그램 · 화이트 해커 · 해커 순위 ──
const W = await load('game/data/world.js'), Ev = await load('game/data/events.js');
const { TITLES } = await load('game/data/titles.js');
const veteran = (tier = 5) => { const s = hacker(); Object.assign(s.hacker, { bits: 10000, grade: 10, tier }); return s; };

test('v3.25 hack tiers II–V: grade and bits gates, each hack needs its tier', () => {
    assert.deepEqual(D.HACKER.tiers.map(t => t.grade), [1, 4, 6, 8, 10, 12, 14, 16, 18, 20], 'v3.28 up to X');
    const s = hacker(); s.hacker.bits = 1e5; act(s, { type: 'hackUnlock' }, 0);
    assert.throws(() => act(s, { type: 'hackUnlock' }, 0), /권한 등급 4/);
    assert.throws(() => act(s, { type: 'hackRun', id: 'tamper', value: 'e|+|+' }, 0), /해킹 II/);
    s.hacker.grade = 10; for (let i = 0; i < 4; i++) act(s, { type: 'hackUnlock' }, 0);
    assert.equal(s.hacker.tier, 5); assert.throws(() => act(s, { type: 'hackUnlock' }, 0), /권한 등급 12/);
    s.hacker.grade = 20; for (let i = 0; i < 5; i++) act(s, { type: 'hackUnlock' }, 0);
    assert.equal(s.hacker.tier, 10); assert.throws(() => act(s, { type: 'hackUnlock' }, 0), /모두/);
});

test('v3.25 tamper, down, backdoor leave pending writes; sniff runs in the save; daily caps and first stage protected', () => {
    const s = veteran();
    act(s, { type: 'hackRun', id: 'tamper', value: 'ev1|+|-' }, 0); assert.deepEqual(s.hacker.pending, { kind: 'tamper', value: 'ev1|1|-1', minutes: 100, n: 5 }); delete s.hacker.pending;
    assert.throws(() => act(s, { type: 'hackRun', id: 'tamper', value: 'ev2|+|+' }, 0), /횟수/);
    assert.throws(() => act(s, { type: 'hackRun', id: 'tamper', value: 'altar-gold|+|+' }, 1e9), /이벤트/);
    assert.throws(() => act(s, { type: 'hackRun', id: 'down', value: `stage:${W.STAGES[0].id}` }, 0), /첫 사냥터/);
    act(s, { type: 'hackRun', id: 'down', value: `stage:${W.STAGES[1].id}` }, 0); assert.equal(s.hacker.pending.minutes, 25); delete s.hacker.pending;
    act(s, { type: 'hackRun', id: 'backdoor', value: 'zakum' }, 0); assert.equal(s.hacker.pending.kind, 'backdoor'); delete s.hacker.pending;
    assert.throws(() => act(s, { type: 'hackRun', id: 'backdoor', value: 'zakum' }, 0), /횟수/, 'one per gauge a day');
    act(s, { type: 'hackRun', id: 'backdoor', value: 'exp' }, 0); delete s.hacker.pending;
    act(s, { type: 'hackRun', id: 'sniff' }, 0); assert.ok(s.hacker.sniff && s.hacker.sniff.until === 3600_000);
    assert.throws(() => act(s, { type: 'hackRun', id: 'sniffClaim' }, 60_000), /남았습니다/);
    act(s, { type: 'hackRun', id: 'sniffClaim' }, 3600_000); assert.equal(s.hacker.pending.kind, 'sniffClaim');
    assert.ok(s.hacker.season.hacks >= 4 && s.hacker.season.dirty, 'season counts hacks');
    assert.throws(() => act(s, { type: 'hackRun', id: 'restore', value: 'broadcast' }, 0), /화이트/);
});

test('v3.25 runtime: tampered event multipliers never drop below ×1, down blocks new entries only, patch lifts it', () => {
    const now = Date.parse('2026-10-05T12:00:00+09:00');
    Ev.setRuntimeEvents([{ id: 'ev1', name: '테스트', from: '2026-10-01T00:00:00+09:00', until: '2026-10-06T00:00:00+09:00', exp: 1.5, gold: 1.1 }], []);
    Ev.setEventTamper({ ev1: { minutes: -60, rate: -.3 } });
    const e = Ev.activeEvent(now); assert.equal(e.exp, 1.2); assert.equal(e.gold, 1); assert.equal(e.until, Date.parse('2026-10-05T23:00:00+09:00'));
    Ev.setEventTamper({}); Ev.setRuntimeEvents([], []);
    const st = W.STAGES[1], s = newState(0); s.level = 100; s.rebirths = 10;
    W.setHackDown([{ kind: 'stage', id: st.id, until: 600_000, by: '해커' }]);
    assert.throws(() => act(s, { type: 'stage', id: st.id }, 0), /해킹/); act(s, { type: 'stage', id: st.id }, 600_001); assert.equal(s.stage, st.id);
    W.setHackDown([{ kind: 'stage', id: st.id, until: 600_000, by: '해커' }]); act(s, { type: 'stage', id: st.id }, 0); assert.equal(s.stage, st.id, 'already inside: stays');
    const t = newState(0); t.level = 100; t.rebirths = 10; W.setHackDown([{ kind: 'stage', id: st.id, until: 600_000, by: '해커' }], { [`stage:${st.id}`]: 600_000 });
    act(t, { type: 'stage', id: st.id }, 0); assert.equal(t.stage, st.id, 'patched place stays open');
    W.setHackDown([]);
});

test('v3.25 programs: buy once with bits, memory cap, crypto miner / port scanner / AV evasion effects', () => {
    const s = veteran(); s.hacker.grade = 1;
    assert.throws(() => act(s, { type: 'programEquip', id: 'rootkit' }, 0), /설치/);
    for (const p of D.PROGRAMS) act(s, { type: 'programBuy', id: p.id }, 0);
    assert.equal(s.hacker.bits, 10000 - D.PROGRAMS.reduce((n, p) => n + p.bits, 0)); assert.throws(() => act(s, { type: 'programBuy', id: 'rootkit' }, 0), /이미/);
    act(s, { type: 'programEquip', id: 'cryptoMiner' }, 0); assert.throws(() => act(s, { type: 'programEquip', id: 'exploitKit' }, 0), /메모리/, 'memory 4 at grade 1');
    const bits = s.hacker.bits; act(s, { type: 'start' }, 0); tick(s, () => .5); assert.ok(Math.abs(s.hacker.bits - bits - D.HACKER.brute.bits * 1.3) < 1e-9);
    act(s, { type: 'programEquip', id: 'cryptoMiner' }, 0); act(s, { type: 'programEquip', id: 'portScanner' }, 0); act(s, { type: 'programEquip', id: 'rootkit' }, 0);
    act(s, { type: 'infilStart' }, 0, () => .3); assert.equal(s.hacker.infil.node.max, D.HACKER.infil.lock(1).tries + 1);
    assert.equal(H.traceKeep(s), .5); s.hacker.grade = 10; act(s, { type: 'programEquip', id: 'rootkit' }, 0); act(s, { type: 'programEquip', id: 'avEvasion' }, 0); assert.equal(H.traceKeep(s), .75);
});

test('v3.25 white hacker: needs hacker mastery, same constraints, keeps adguard, restores and patches but never attacks', () => {
    const s = hacker(); s.level = 40;
    assert.throws(() => act(s, { type: 'job', id: 'whiteHacker' }, 0));
    s.jobMastery.hacker = 1500; act(s, { type: 'skill', id: 'adGuard' }, 0); act(s, { type: 'job', id: 'whiteHacker' }, 0);
    assert.equal(s.job, 'whiteHacker'); assert.ok(H.isHacker(s) && H.isWhiteHacker(s)); assert.ok(s.skills.includes('adGuard'), 'adguard stays equipped');
    s.level = 40; act(s, { type: 'skill', id: 'firewall' }, 0); assert.ok(s.skills.includes('firewall'), 'white hacker passive');
    assert.throws(() => act(s, { type: 'dungeon', id: 'abyss' }, 0), /던전/); assert.throws(() => act(s, { type: 'attribute', id: 'str' }, 0), /능력치/);
    Object.assign(s.hacker, { bits: 1000, tier: 3, grade: 10 });
    assert.throws(() => act(s, { type: 'hackRun', id: 'broadcast', value: 'hi' }, 0), /화이트/);
    act(s, { type: 'hackRun', id: 'restore', value: 'down:stage:x' }, 0); assert.equal(s.hacker.pending.kind, 'restore'); delete s.hacker.pending;
    assert.equal(s.hacker.season.restores, 1);
    act(s, { type: 'hackRun', id: 'patch', value: `dungeon:${W.DUNGEONS[0].id}` }, 0); assert.equal(s.hacker.pending.minutes, 60);
    const m = s.jobMastery.whiteHacker || 0; H.gainHacker(s, 0, 50); assert.ok(s.jobMastery.whiteHacker > m, 'mastery goes to the white hacker job');
    act(s, { type: 'job', id: 'fisher' }, 0); assert.equal(s.job, 'fisher', 'leaves the hacker line'); assert.ok(!s.skills.includes('adGuard'), 'hacker skills are unequipped');
});

test('v3.25 server: pending hacks write the shared config, white hackers restore for a bounty, sniffing counts active players, board rows', async () => {
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const file = path.join(os.tmpdir(), `tb-hack-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    const Hk = await load('game/server/hacks.js'), DB = await load('game/server/db.js'), A = await load('game/data/altar.js');
    try {
        const database = DB.db(), now = Date.now();
        Ev.setAltarEvents([]); Ev.setEventTamper({}); Ev.setRuntimeEvents([{ id: 'ev1', name: '테스트', from: new Date(now - 3600_000).toISOString(), until: new Date(now + 3600_000).toISOString(), exp: 2 }], []);
        const a = veteran(); a.name = '검은손';
        act(a, { type: 'hackRun', id: 'tamper', value: 'ev1|+|+' }, now); await Hk.applyPendingHack(a, 'acct_a', now);
        assert.equal(Ev.activeEvent(now).exp, 2.5, 'tier V tamper +50%p'); assert.ok(!a.hacker.pending);
        act(a, { type: 'hackRun', id: 'down', value: `dungeon:${W.DUNGEONS[0].id}` }, now); await Hk.applyPendingHack(a, 'acct_a', now);
        assert.ok(W.hackDownOf('dungeon', W.DUNGEONS[0].id, now)); assert.equal(W.hackDownOf('dungeon', W.DUNGEONS[0].id, now).by, '검은손');
        const g0 = (await database.listAltarGauges()).find(g => g.id === 'zakum')?.points || 0;
        act(a, { type: 'hackRun', id: 'backdoor', value: 'zakum' }, now); await Hk.applyPendingHack(a, 'acct_a', now);
        assert.equal(((await database.listAltarGauges()).find(g => g.id === 'zakum')?.points || 0) - g0, Math.floor(A.gaugeCost('zakum', 0) * .02));
        // 화이트 해커가 서버 다운을 되돌리고 현상금을 받습니다.
        const w = veteran(); w.jobMastery.hacker = 1500; act(w, { type: 'job', id: 'whiteHacker' }, now); w.hacker.tier = 3;
        const bits = w.hacker.bits; act(w, { type: 'hackRun', id: 'restore', value: `down:dungeon:${W.DUNGEONS[0].id}` }, now); await Hk.applyPendingHack(w, 'acct_w', now);
        assert.equal(w.hacker.bits, bits - D.HACKER.white.restore.bits + Math.floor(D.HACKER.down.bits * .5)); assert.ok(!W.hackDownOf('dungeon', W.DUNGEONS[0].id, now));
        // 스니핑: 지금 이후 저장된 다른 모험가 수.
        await database.createPlayerIfMissing('p1', '{}', now + 10); await database.createPlayerIfMissing('p2', '{}', now - 10);
        a.hacker.sniff = { from: now, until: now, n: 5 }; act(a, { type: 'hackRun', id: 'sniffClaim' }, now); const e0 = a.hacker.exp;
        const b0 = a.hacker.bits; await Hk.applyPendingHack(a, 'acct_a', now); assert.equal(a.hacker.exp - e0, 50, '1 active player × 10×5'); assert.equal(a.hacker.bits - b0, 5); assert.equal(a.hacker.sniff, null);
        // 방화벽: 화이트 해커가 장착하면 하루 한 번 크래킹을 막습니다.
        await database.createPlayerIfMissing('victim', JSON.stringify({ job: 'whiteHacker', skills: ['firewall'] }), now - 1e6);
        const c = veteran(); c.name = '크래커';
        act(c, { type: 'hackRun', id: 'crack', value: 'victim' }, now); await Hk.applyPendingHack(c, 'acct_c', now);
        assert.ok(c.logs.some(l => l.text.includes('방화벽')), 'blocked once'); c.hacker.used.crack = 0;
        act(c, { type: 'hackRun', id: 'crack', value: 'victim' }, now); await Hk.applyPendingHack(c, 'acct_c', now);
        assert.ok((await Hk.readHacks(now + 60_000)).cracked.victim > now, 'second crack lands');
        // 신원 조작: 서버 설정의 masked가 순위표 스냅샷을 가리고, 크래킹하면 풀립니다. 스냅샷의 옛 privacy는 버립니다.
        const T = Date.now(), h = hacker(); h.hacker.bits = 100; act(h, { type: 'skill', id: 'adGuard' }, 0); H.gainHacker(h, 0, 300);
        act(h, { type: 'hackRun', id: 'spoof', value: 'abyss:spoofed|' }, T); await Hk.applyPendingHack(h, 'acct_h', T);
        const hk = await Hk.readHacks(T + 31_000), snap = { name: '피해자', job: 'fisher', level: 50, privacy: { show: ['job'] } };
        const out = Hk.maskSnapshot(snap, 'spoofed', hk, T + 1); assert.equal(out.name, '???'); assert.equal(out.job, ''); assert.ok(!('privacy' in out));
        assert.deepEqual(Hk.maskSnapshot(snap, 'other', hk, T + 1), { name: '피해자', job: 'fisher', level: 50 }, 'old self privacy ignored');
        hk.cracked.spoofed = 9e15; assert.equal(Hk.maskSnapshot(snap, 'spoofed', hk, T + 1).name, '피해자');
        // v3.27 무기한 신원 조작 · 거두기 · 화이트 해커 되돌리기.
        h.hacker.used.spoof = 0; act(h, { type: 'hackRun', id: 'spoof', value: 'abyss:forever||0' }, T); await Hk.applyPendingHack(h, 'acct_h', T);
        assert.equal(Hk.maskSnapshot(snap, 'forever', await Hk.readHacks(T), T + 1e12).name, '???', 'indefinite');
        const other = veteran(); act(other, { type: 'hackRun', id: 'unspoof', value: 'abyss:forever' }, T); await assert.rejects(Hk.applyPendingHack(other, 'acct_o', T), /내가 건/);
        act(h, { type: 'hackRun', id: 'unspoof', value: 'abyss:forever' }, T); await Hk.applyPendingHack(h, 'acct_h', T); assert.equal(Hk.maskSnapshot(snap, 'forever', await Hk.readHacks(T), T + 1).name, '피해자');
        // v3.28 미끼 정보: 가린 이름·직업·레벨 자리에 가짜 값, masked 목록에서도 빠짐. 크래킹하면 진짜.
        const dz = hacker(); dz.hacker.bits = 100; act(dz, { type: 'skill', id: 'adGuard' }, 0); H.gainHacker(dz, 0, 5000); assert.equal(H.adguardLevel(dz), 3);
        act(dz, { type: 'hackRun', id: 'spoof', value: 'abyss:decoyed|guild|0|평범한 낚시꾼|fisher|12' }, T); await Hk.applyPendingHack(dz, 'acct_dz', T);
        const hd = await Hk.readHacks(T), dsnap = { name: '진짜', job: 'hacker', level: 99, rebirths: 7, guild: '길드', title: 't' };
        const dout = Hk.maskSnapshot(dsnap, 'decoyed', hd, T + 1);
        assert.deepEqual([dout.name, dout.job, dout.level, dout.guild], ['평범한 낚시꾼', 'fisher', 12, '길드']); assert.deepEqual(dout.masked, ['gear', 'skills', 'title']);
        await Hk.syncHackFeed(dz, 'acct_dz', T); assert.equal(dz.hackFeed.masks.find(m => m.target === 'decoyed').decoy, '평범한 낚시꾼');
        hd.cracked.decoyed = 9e15; assert.equal(Hk.maskSnapshot(dsnap, 'decoyed', hd, T + 1).name, '진짜', 'cracking shows the truth'); delete hd.cracked.decoyed;
        dz.hacker.used.spoof = 0; act(dz, { type: 'hackRun', id: 'spoof', value: 'abyss:full|job,level,gear,skills,title,guild|0|가면' }, T); await Hk.applyPendingHack(dz, 'acct_dz', T);
        assert.ok(!('masked' in Hk.maskSnapshot(dsnap, 'full', await Hk.readHacks(T), T + 1)), 'a full decoy looks like a normal row');
        // v3.27 해커 견제: 역추적은 대상의 오늘 침투 입장을 줄이고, 과부하는 브루트포스 비트를 절반으로.
        await database.createPlayerIfMissing('rival', JSON.stringify({ job: 'hacker', hacker: { bits: 0, exp: 0, grade: 1, tier: 0 } }), T);
        const att = veteran(); act(att, { type: 'hackRun', id: 'trace', value: 'hacker:rival' }, T); await Hk.applyPendingHack(att, 'acct_att', T);
        act(att, { type: 'hackRun', id: 'overload', value: 'hacker:rival' }, T); await Hk.applyPendingHack(att, 'acct_att', T);
        assert.throws(() => act(att, { type: 'hackRun', id: 'trace', value: 'hacker:rival' }, T), /횟수/, 'once a day');
        const rv = veteran(); await Hk.syncHackFeed(rv, 'rival', T); assert.deepEqual(rv.hackFeed.traced, { day: rv.hackFeed.traced.day, n: 1 }); assert.ok(rv.hackFeed.overloadUntil > T);
        assert.equal(H.entriesCap(rv, T), D.HACKER.infil.entriesPerDay - 1);
        rv.lastTick = T; const b1 = rv.hacker.bits; H.hackerTick(rv); assert.ok(Math.abs(rv.hacker.bits - b1 - D.HACKER.brute.bits * .5) < 1e-9, 'overloaded brute force');
        const wh = veteran(); wh.jobMastery.hacker = 1500; act(wh, { type: 'job', id: 'whiteHacker' }, T); assert.throws(() => act(wh, { type: 'hackRun', id: 'trace', value: 'hacker:rival' }, T), /화이트/);
        // v3.28 해킹 VI~X: 가로채기는 쓰러진 보스의 세대만 정산, 세이브 스캠은 보스당 서버 전체 1회, DDoS는 서버에 하나, 루트 권한은 모두에게 보임.
        const top = veteran(10); top.name = '루트'; top.hacker.grade = 20;
        const gen = await database.summonAltarRaid('balrog', 1000, now + 3600_000, now, A.RAID.respawnMs);
        await assert.rejects(Hk.applyPendingHack(Object.assign(veteran(10), { hacker: { ...veteran(10).hacker, pending: { kind: 'intercept', value: 'zakum', minutes: 0, n: 10 } } }), 'acct_x', now), /나타나 있지/);
        act(top, { type: 'hackRun', id: 'intercept', value: 'balrog' }, now); await Hk.applyPendingHack(top, 'acct_top', now);
        assert.deepEqual(top.hacker.intercept, { raid: 'balrog', gen, n: 10 });
        assert.throws(() => act(top, { type: 'hackRun', id: 'intercept', value: 'balrog' }, now), /먼저 정산/);
        act(top, { type: 'hackRun', id: 'interceptClaim' }, now); await assert.rejects(Hk.applyPendingHack(top, 'acct_top', now), /쓰러지지/); delete top.hacker.pending;
        act(top, { type: 'hackRun', id: 'savescum', value: 'balrog|forward' }, now); await Hk.applyPendingHack(top, 'acct_top', now);
        assert.equal((await database.listAltarRaids()).find(r => r.id === 'balrog').hp, 1000 - Math.floor(1000 * .03 * 4), 'forward: 3%×(n−6) of the remaining hp');
        const sc = veteran(10); act(sc, { type: 'hackRun', id: 'savescum', value: 'balrog|rewind' }, now); await assert.rejects(Hk.applyPendingHack(sc, 'acct_sc', now), /이미/, 'once per boss');
        assert.ok((await database.listChat('news', 0, 300)).some(c => c.account_id === 'system-hacker' && c.text.includes('세이브 스캠')), 'announced');
        assert.equal(await database.shiftAltarRaid('balrog', gen, -1e9), 1, 'save scum never slays');
        await database.hitAltarRaid('balrog', gen, 10); await database.slayAltarRaid('balrog', gen, 'p1', 'x', now);
        const ib = top.hacker.bits; act(top, { type: 'hackRun', id: 'interceptClaim' }, now); await Hk.applyPendingHack(top, 'acct_top', now);
        assert.equal(top.hacker.bits - ib, Math.floor((30 + 2 * 40) * .5), 'tier X: 50% of the reward value'); assert.equal(top.hacker.intercept, null);
        const z = await database.summonAltarRaid('zakum', 1000, now + 3600_000, now, A.RAID.respawnMs); await database.hitAltarRaid('zakum', z, 600);
        sc.hacker.used.savescum = 0; delete sc.hacker.pending; act(sc, { type: 'hackRun', id: 'savescum', value: 'zakum|rewind' }, now); await Hk.applyPendingHack(sc, 'acct_sc', now);
        assert.equal((await database.listAltarRaids()).find(r => r.id === 'zakum').hp, 400 + Math.floor(600 * .2), 'rewind: 5%×(n−6) of the damage');
        act(top, { type: 'hackRun', id: 'ddos', value: 'gold' }, now); await Hk.applyPendingHack(top, 'acct_top', now);
        assert.equal(Ev.activeEvent(now).gold, 1.2); assert.throws(() => act(top, { type: 'hackRun', id: 'ddos', value: 'exp' }, now), /이번 주/);
        const dd = veteran(10); act(dd, { type: 'hackRun', id: 'ddos', value: 'exp' }, now); await assert.rejects(Hk.applyPendingHack(dd, 'acct_dd', now), /DDoS/, 'one at a time');
        act(top, { type: 'hackRun', id: 'root' }, now); await Hk.applyPendingHack(top, 'acct_top', now);
        const plain = newState(0); await Hk.syncHackFeed(plain, 'acct_plain', now); assert.equal(plain.hackFeed.root.by, '루트'); assert.equal(plain.hackFeed.ddos.kind, 'gold');
        const wr = veteran(10); wr.jobMastery.hacker = 1500; act(wr, { type: 'job', id: 'whiteHacker' }, now); wr.hacker.tier = 10;
        act(wr, { type: 'hackRun', id: 'restore', value: 'ddos' }, now); await Hk.applyPendingHack(wr, 'acct_wr', now); assert.equal(Ev.activeEvent(now).gold, 1, 'white hacker restores the DDoS');
        // v3.28 블랙 해커 실패: 효과 없이 전체 채팅에 이름 공지(루트킷이 있어도).
        const bk = veteran(); bk.name = '그림자'; bk.jobMastery.hacker = 1500; act(bk, { type: 'job', id: 'blackHacker' }, now); bk.hacker.loadout = ['rootkit']; bk.hacker.programs = ['rootkit'];
        act(bk, { type: 'hackRun', id: 'broadcast', value: '들켰다' }, now, () => .01); await Hk.applyPendingHack(bk, 'acct_bk', now);
        assert.ok((await database.listChat('news', 0, 300)).some(c => c.account_id === 'system-hacker' && c.text.includes('블랙 해커 그림자가 방송 탈취 중 추적당했습니다')), 'busted notice names the black hacker');
        assert.notEqual((await Hk.readHacks(now)).broadcast?.text, '들켰다', 'failed hack has no effect');
        // v3.29 해커 조직(4-a): 창설·가입(초대 코드)·성향 제한·정원·비트 기여·위임·강퇴·코드 재발급·탈퇴, 소속 캐시 동기화.
        const Cr = await load('game/server/crews.js'), CD = await load('game/data/crew.js');
        const boss = veteran(1); boss.name = '조직장';
        await assert.rejects(Cr.createCrew('m_boss', boss, 'x', 'gray', now), /2~12/);
        await assert.rejects(Cr.createCrew('m_boss', boss, '그림자단', 'white', now + 1).then(f => f(boss)).then(() => Cr.createCrew('m_boss', boss, '또', 'gray', now)), /이미/);
        const crewId = boss.hacker.crew.id, row0 = await database.getCrew(crewId);
        assert.equal(boss.hacker.bits, 10000 - CD.CREW.createBits); assert.equal(boss.hacker.crew.leader, true); assert.equal(row0.code.length, 6);
        const blackie = veteran(1); blackie.jobMastery.hacker = 1500; act(blackie, { type: 'job', id: 'blackHacker' }, now);
        await assert.rejects(Cr.joinCrew('m_black', blackie, row0.code, now), /화이트/, 'white crew: no black hackers');
        await assert.rejects(Cr.joinCrew('m_x', newState(0), row0.code, now), /해커 계열/);
        const members = [];
        for (let i = 0; i < 4; i++) { const m = veteran(1); m.name = `조직원${i}`; (await Cr.joinCrew(`m_${i}`, m, row0.code.toLowerCase(), now))(m); members.push(m); }
        await assert.rejects(Cr.joinCrew('m_full', veteran(1), row0.code, now), /정원\(5명\)/);
        assert.equal(members[0].hacker.crew.id, crewId); assert.equal(members[0].hacker.crew.leader, false);
        // 비트 기여: 하루 상한 = 권한 등급 × 50, 기여한 만큼 조직 자금·조직 경험치.
        const dep = members[0]; dep.hacker.grade = 10;
        await assert.rejects(Cr.depositCrew('m_0', dep, 501, now), /500까지/);
        (await Cr.depositCrew('m_0', dep, 500, now))(dep); assert.equal(dep.hacker.crewDeposit.n, 500); assert.equal(dep.hacker.bits, 10000 - 500);
        await assert.rejects(Cr.depositCrew('m_0', dep, 1, now), /0까지/);
        let info = await Cr.crewInfo('m_0', dep, now); assert.equal(info.crew.vault, 500); assert.equal(info.crew.members.length, 5); assert.equal(info.crew.depositLeft, 0);
        assert.deepEqual([1, 2, 4, 20].map(g => CD.CREW.capacity(g)), [5, 6, 7, 10]); assert.equal(CD.crewGrade(CD.CREW.gradeNeed(1)), 2);
        // 조직장만: 코드 재발급(옛 코드 무효)·위임·강퇴.
        await assert.rejects(Cr.leaderAct('m_0', dep, 'kick', 'm_1', now), /조직장만/);
        (await Cr.leaderAct('m_boss', boss, 'code', '', now))(boss);
        const row1 = await database.getCrew(crewId); assert.notEqual(row1.code, row0.code); await assert.rejects(Cr.joinCrew('m_late', veteran(1), row0.code, now), /초대 코드/);
        (await Cr.leaderAct('m_boss', boss, 'kick', 'm_1', now))(boss);
        members[1].hacker.crew.syncedAt = 0; await Cr.syncCrew('m_1', members[1], now + 31_000); assert.equal(members[1].hacker.crew, undefined, 'kicked member drops the cache on sync');
        (await Cr.leaderAct('m_boss', boss, 'delegate', 'm_0', now))(boss); assert.equal(boss.hacker.crew.leader, false);
        // 정리: 조직장이 14일 활동이 없으면 기여가 가장 많은 조직원에게, 해커 계열이 아닌 채로 30일이면 자동 탈퇴.
        const tidy = { leader: 'a', members: { a: { seen: 0, deposited: 0, joined: 0 }, b: { seen: 0, deposited: 5, joined: 1 }, c: { seen: 0, deposited: 9, joined: 2, offSince: 0 } } };
        Cr.tidyCrew(tidy, 30 * 86400_000); assert.deepEqual(Object.keys(tidy.members), ['a', 'b']); assert.equal(tidy.leader, 'b');
        // 동기화: 해커 계열을 떠나면 offSince가 적히고, 마지막 조직원이 나가면 조직이 사라집니다.
        const leaver = members[2]; act(leaver, { type: 'job', id: 'fisher' }, now); leaver.hacker.crew.syncedAt = 0; await Cr.syncCrew('m_2', leaver, now + 61_000);
        assert.ok(JSON.parse((await database.getCrew(crewId)).data).members.m_2.offSince > 0);
        for (const [mid, m] of [['m_boss', boss], ['m_0', dep], ['m_2', leaver], ['m_3', members[3]]]) (await Cr.leaveCrew(mid, m, now))(m);
        assert.equal(await database.getCrew(crewId), null, 'empty crew is deleted'); assert.equal(boss.hacker.crew, undefined);
        // v3.32 합동 작전: 침투 노드·해킹 수를 세이브에 쌓았다가 침투가 끝난 뒤 한 번에 올리고, 단계마다 조직 자금과 (1노드 이상 뚫은) 조직원 보상.
        const lead = veteran(1); lead.name = '작전장'; (await Cr.createCrew('o_lead', lead, '작전조', 'gray', now))(lead);
        const opId = lead.hacker.crew.id, opCode = (await database.getCrew(opId)).code, runner = veteran(1); runner.name = '러너';
        (await Cr.joinCrew('o_run', runner, opCode, now))(runner);
        assert.equal(CD.opGoal(2, 1), 60); assert.equal(CD.opGoal(5, 20), 225); assert.deepEqual([29, 30, 60, 90].map(n => CD.opSteps(n, 60)), [0, 1, 2, 3]);
        H.setPuzzleKey('crew-op'); act(runner, { type: 'infilStart' }, now, () => .4); act(runner, { type: 'infilGuess', value: H.nodeAnswer(runner.hacker.infil) }, now);
        assert.deepEqual(runner.hacker.crewPending, { nodes: 1, hacks: 0 }); assert.equal(await Cr.flushCrew('o_run', runner, now), null, 'waits until the run ends');
        act(runner, { type: 'infilCashout' }, now); runner.hacker.crewPending.nodes = 30; runner.hacker.crewPending.hacks = 2;
        const rb = runner.hacker.bits, apply = await Cr.flushCrew('o_run', runner, now); apply(runner); apply(runner);
        assert.equal(runner.hacker.crewPending, undefined, 're-applying after a save conflict does not double count');
        let od = JSON.parse((await database.getCrew(opId)).data);
        assert.deepEqual([od.week.nodes, od.week.hacks, od.week.steps, od.vault], [30, 2, 1, CD.CREW.op.reward(1).fund]);
        assert.equal(runner.hacker.bits - rb, CD.CREW.op.reward(1).bits, 'step 1 reward once'); assert.equal(await Cr.flushCrew('o_run', runner, now), null, 'nothing to send: no query');
        lead.hacker.crew.syncedAt = 0; const lb = lead.hacker.bits; await Cr.syncCrew('o_lead', lead, now + 61_000); assert.equal(lead.hacker.bits, lb, 'no nodes: no reward');
        // 다음 주로 넘어가도 지난주 단계 보상은 받을 수 있습니다.
        runner.hacker.crewPending = { nodes: 40, hacks: 0 }; delete runner.hacker.crewClaimed; const rb2 = runner.hacker.bits;
        (await Cr.flushCrew('o_run', runner, now + 7 * 86400_000))(runner);
        od = JSON.parse((await database.getCrew(opId)).data); assert.equal(od.prev.nodes, 30); assert.equal(od.week.nodes, 40); assert.equal(od.week.steps, 1);
        assert.equal(runner.hacker.bits - rb2, CD.CREW.op.reward(1).bits * 2, 'last week and this week step 1');
        const oinfo = await Cr.crewInfo('o_run', runner, now + 7 * 86400_000); assert.deepEqual([oinfo.crew.op.nodes, oinfo.crew.op.targets, oinfo.crew.op.mine], [40, [30, 60, 90], 40]);
        (await Cr.leaveCrew('o_run', runner, now))(runner); (await Cr.leaveCrew('o_lead', lead, now))(lead);
        // v3.33 조직 모듈: 조직장이 등급만큼 켜고, 켤 때·주가 바뀔 때 조직 자금에서 유지비. 성향 전용 모듈, 프록시 체인(조직원끼리 불가·외부 견제 하루 1회 막음).
        const ml = veteran(1); ml.name = '모듈장'; ml.hacker.grade = 10; (await Cr.createCrew('k_lead', ml, '모듈조', 'gray', now))(ml);
        const kId = ml.hacker.crew.id, km = veteran(1); km.name = '모듈원'; (await Cr.joinCrew('k_mem', km, (await database.getCrew(kId)).code, now))(km);
        await assert.rejects(Cr.leaderAct('k_lead', ml, 'module', 'distributed', now), /조직 자금/);
        (await Cr.depositCrew('k_lead', ml, 500, now))(ml);
        await assert.rejects(Cr.leaderAct('k_lead', ml, 'module', 'launder', now), /성향/);
        await assert.rejects(Cr.leaderAct('k_mem', km, 'module', 'distributed', now), /조직장만/);
        (await Cr.leaderAct('k_lead', ml, 'module', 'distributed', now))(ml);
        await assert.rejects(Cr.leaderAct('k_lead', ml, 'module', 'sharedMemory', now), /슬롯\(1개/);
        let kd = JSON.parse((await database.getCrew(kId)).data); assert.deepEqual([kd.modules, kd.vault], [['distributed'], 350]);
        km.hacker.crew.syncedAt = 0; await Cr.syncCrew('k_mem', km, now + 31_000); assert.deepEqual(km.hacker.crew.modules, ['distributed']);
        km.lastTick = now; const kb = km.hacker.bits; H.hackerTick(km); assert.ok(Math.abs(km.hacker.bits - kb - D.HACKER.brute.bits * 1.1) < 1e-9, 'distributed +10%');
        (await Cr.leaderAct('k_lead', ml, 'module', 'distributed', now))(ml); (await Cr.leaderAct('k_lead', ml, 'module', 'proxyChain', now))(ml);
        assert.equal(JSON.parse((await database.getCrew(kId)).data).vault, 100, 'no refund when turned off');
        km.hacker.crew.syncedAt = 0; await Cr.syncCrew('k_mem', km, now + 62_000); km.hacker.used = {};
        await database.createPlayerIfMissing('k_lead', JSON.stringify(ml), now); await database.createPlayerIfMissing('k_mem', JSON.stringify(km), now);
        act(km, { type: 'hackRun', id: 'crack', value: 'k_lead' }, now); await assert.rejects(Hk.applyPendingHack(km, 'k_mem', now), /같은 조직원/); delete km.hacker.pending;
        const outsider = veteran(); act(outsider, { type: 'hackRun', id: 'trace', value: 'hacker:k_mem' }, now); await Hk.applyPendingHack(outsider, 'acct_out', now);
        assert.ok(outsider.logs.some(l => l.text.includes('프록시 체인')), 'first outside trace is blocked crew-wide');
        assert.equal((await Hk.readHacks(now)).rival.k_mem?.trace || 0, 0);
        // 주가 바뀌면 유지비: 조직 자금 100 < 프록시 체인 250이라 꺼집니다.
        kd = JSON.parse((await database.getCrew(kId)).data); Cr.rollWeek(kd, now + 7 * 86400_000); assert.deepEqual([kd.modules, kd.vault], [[], 100]);
        assert.equal(H.entriesCap({ job: 'hacker', hacker: { crew: { modules: ['detour'] } } }, now), D.HACKER.infil.entriesPerDay + 1, 'detour +1 entry');
        assert.equal(H.memoryCap({ job: 'hacker', hacker: { grade: 1, crew: { modules: ['sharedMemory'] } } }), D.HACKER.memory(1) + 1);
        assert.equal(H.memoryCap({ job: 'fisher', hacker: { grade: 1, crew: { modules: ['sharedMemory'] } } }), D.HACKER.memory(1), 'hacker line only');
        (await Cr.leaveCrew('k_mem', km, now))(km); (await Cr.leaveCrew('k_lead', ml, now))(ml);
        // v3.34 조직 순위(주간)·조직 태그: 점수 = 노드 ×10 + 해킹 ×2, 방송 서명·해커 순위에 [조직], 신원 조작으로 이름을 가리면 태그도 가림.
        const ba = veteran(1); ba.name = '보드장A'; (await Cr.createCrew('b_a', ba, '보드A', 'gray', now))(ba);
        const bb = veteran(1); bb.name = '보드장B'; (await Cr.createCrew('b_b', bb, '보드B', 'gray', now))(bb);
        ba.hacker.crewPending = { nodes: 10, hacks: 1 }; (await Cr.flushCrew('b_a', ba, now))(ba);
        bb.hacker.crewPending = { nodes: 5, hacks: 0 }; (await Cr.flushCrew('b_b', bb, now))(bb);
        const cb = await Cr.crewBoard(now), mineA = cb.rows.find(r => r.name === '보드A'), mineB = cb.rows.find(r => r.name === '보드B');
        assert.equal(mineA.score, 102); assert.equal(mineB.score, 50); assert.ok(mineA.rank < mineB.rank); assert.equal(CD.crewScore({ nodes: 3, hacks: 4 }), 38);
        ba.hacker.used = {}; ba.hacker.tier = 1; ba.hacker.bits = 1000;
        await Hk.clearBroadcast(now); act(ba, { type: 'hackRun', id: 'broadcast', value: '조직 방송' }, now); await Hk.applyPendingHack(ba, 'b_a', now);
        assert.equal((await Hk.readHacks(now)).broadcast.by, '보드장A [보드A]', 'crew tag in the signature');
        await Hk.syncHackerBoard('b_a', ba, now); const hrow = (await Hk.listHackerBoard(ba.hacker.season.key)).find(r => r.id === 'b_a'); assert.equal(hrow.crew, '보드A');
        const tagHacks = { masked: { b_a: { until: 0, show: ['job'], by: 'x', byId: 'y' } }, cracked: {} };
        assert.ok(!('crew' in Hk.maskSnapshot(hrow, 'b_a', tagHacks, now)), 'masked name hides the crew tag');
        for (const [mid, m] of [['b_a', ba], ['b_b', bb]]) (await Cr.leaveCrew(mid, m, now))(m);
        // v3.43 정보 비공개 스위치: 서버 설정(30초 캐시)으로 켜고 끄고, 환경 변수 TIDEBOUND_SECRECY가 있으면 그것이 우선. 카탈로그에 실립니다.
        const Sc = await load('game/server/secrecy.js');
        assert.equal(await Sc.secrecyOn(now), false, 'off by default (open beta)'); const cat0 = await Sc.buildCatalog(newState(0), now); assert.equal(cat0.secret, false); assert.ok(Object.keys(cat0.unlocks).length >= 5 && Object.values(cat0.unlocks).every(v => v === false), 'v3.62 hidden unlocks judged on the server (met or not, no conditions)'); assert.ok(Array.isArray(cat0.revealed));
        await Sc.setSecrecy(true, now); assert.equal(await Sc.secrecyOn(now + 1), true); assert.equal(await database.getSetting('secrecy'), 'on');
        process.env.TIDEBOUND_SECRECY = 'off'; assert.equal(await Sc.secrecyOn(now + 2), false, 'env wins'); delete process.env.TIDEBOUND_SECRECY;
        await Sc.setSecrecy(false, now); assert.equal((await Sc.buildCatalog(newState(0), now + 3)).secret, false);
        // v3.44 비밀 직업: 비공개가 꺼져 있으면 전체, 켜면 드러난 것만 전체·나머지는 실루엣(이름·설명·조건·능력치 없음). 같은 키면 다시 보내지 않음.
        const openCat = await Sc.buildCatalog(newState(0), now + 4); assert.equal(openCat.jobs.length, 18); assert.ok(openCat.jobs.every(j => !j.veiled && j.name !== '???'));
        assert.equal(await Sc.buildCatalog(newState(0), now + 4, openCat.key), null, 'same key: nothing to send');
        process.env.TIDEBOUND_SECRECY = 'on';
        const veiledCat = await Sc.buildCatalog(newState(0), now + 5), lich = veiledCat.jobs.find(j => j.id === 'voidSovereign');
        assert.ok(lich.veiled && lich.name === '???' && !lich.desc && !lich.rebirth && lich.hint, 'silhouette keeps only place and hint');
        assert.ok(veiledCat.lineages.every(l => l.name === '???'), 'unrevealed secret lineages are veiled'); assert.notEqual(veiledCat.key, openCat.key);
        const opened = newState(0); opened.doorsOpened = ['voidcaller']; const voidCat = await Sc.buildCatalog(opened, now + 6);
        assert.ok(voidCat.revealed.includes('voidcaller') && !voidCat.jobs.find(j => j.id === 'voidcaller').veiled, 'a recorded reveal (old rebirth door) shows the job in full');
        // v3.47 비밀 직업의 스킬: 꺼져 있으면 67개 전부, 켜면 드러난 직업 것과 내가 배운·장착한 것만(실루엣 직업의 스킬은 없음).
        assert.equal(openCat.skills.length, 37); assert.ok(veiledCat.skills.every(sk => veiledCat.revealed.includes(sk.job)) && !veiledCat.skills.some(sk => sk.job === 'voidSovereign'), 'only skills of revealed jobs');
        assert.ok(voidCat.skills.some(sk => sk.id === 'voidLance') && voidCat.skills.length > veiledCat.skills.length, 'revealing the job sends its skills');
        const holder = newState(0); holder.skills.push('graveHook'); const holderCat = await Sc.buildCatalog(holder, now + 7);
        assert.ok(holderCat.skills.some(sk => sk.id === 'graveHook') && holderCat.jobs.find(j => j.id === 'undead').veiled, 'an equipped secret skill is sent even if its job is still veiled');
        delete process.env.TIDEBOUND_SECRECY;
        // v3.26 해커 전직 알림(익명, system-hacker). 파일 DB를 쓰는 테스트는 동시에 돌면 서로의 파일을 바꾸므로 한 테스트에 모읍니다.
        await Hk.announceHacker('hacker', now); const chat = await database.listChat('news', 0, 300);
        assert.equal(chat.at(-1).account_id, 'system-hacker'); assert.equal(chat.at(-1).text, '누군가가 해커로 전직했습니다.');
        // 순위표.
        await Hk.syncHackerBoard('acct_a', a, now); const board = await Hk.listHackerBoard(a.hacker.season.key);
        assert.equal(board[0].id, 'acct_a'); assert.equal(board[0].score, H.seasonScore(a.hacker.season)); assert.equal(Hk.playerOfRow('hacker:acct_a'), 'acct_a');
    } finally { Ev.setRuntimeEvents([], []); Ev.setEventTamper({}); Ev.setHackEvents([]); W.setHackDown([]); delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});

test('v3.26 infiltration puzzles: first lock then port, later nodes mix in sequence, base conversion and cipher graded by the server', () => {
    H.setPuzzleKey('test-key-puzzles');
    const kinds = new Set();
    for (let seed = 0; seed < 60; seed++) for (let depth = 0; depth < 12; depth++) {
        const node = H.makeNode(seed, depth), run = { seed, depth, bank: { bits: 0, exp: 0 }, node }, answer = H.nodeAnswer(run);
        kinds.add(node.kind);
        if (depth === 0) assert.equal(node.kind, 'lock'); if (depth === 1) assert.equal(node.kind, 'port');
        // v3.28 5번째부터 홀수 칸에 패스워드 재조합, 6번째부터 짝수 칸에 최단 경로.
        if (depth >= 2) assert.ok((depth + 1) % 2 === 1 ? ['lock', 'cipher', ...(depth >= 4 ? ['anagram'] : [])].includes(node.kind) : ['port', 'seq', 'bin', ...(depth >= 5 ? ['path'] : [])].includes(node.kind), `${depth}: ${node.kind}`);
        assert.ok(H.judge(run, answer).solved, `${node.kind} answer opens`);
        if (node.kind === 'bin') assert.equal(Number(node.prompt.startsWith('0x') ? parseInt(node.prompt.slice(2), 16) : parseInt(node.prompt.slice(2), 2)), Number(answer));
        if (node.kind === 'seq') { assert.ok(node.prompt.endsWith('?')); const g = String(Number(answer) + 1); assert.equal(H.judge(run, g).hint, 'DOWN'); }
        if (node.kind === 'anagram') { const word = node.prompt.split(' ')[0]; assert.equal([...word].sort().join(''), [...answer].sort().join('')); assert.notEqual(word, answer); assert.match(H.judge(run, 'Z'.repeat(answer.length)).hint, /일치/); }
        if (node.kind === 'path') {
            const g = node.prompt.split(' / ').map(row => row.split(' ').map(Number)), n = g.length, best = (y, x) => g[y][x] + (y === n - 1 && x === n - 1 ? 0 : Math.min(y < n - 1 ? best(y + 1, x) : Infinity, x < n - 1 ? best(y, x + 1) : Infinity));
            assert.equal(best(0, 0), Number(answer), 'min path sum'); assert.equal(n, depth + 1 < 10 ? 3 : 4); assert.equal(H.judge(run, String(Number(answer) - 1)).hint, 'UP');
        }
        if (node.kind === 'cipher') { assert.equal(node.size, answer.length); const wrong = 'Z'.repeat(answer.length); assert.match(H.judge(run, wrong).hint, /일치/); assert.throws(() => H.judge(run, 'AB1')); }
    }
    assert.deepEqual([...kinds].sort(), ['anagram', 'bin', 'cipher', 'lock', 'path', 'port', 'seq']);
    assert.deepEqual([3, 5, 6, 12, 13].map(d => D.HACKER.infil.lock(d).digits), [3, 3, 4, 4, 5]);
});

test('v3.26 becoming a hacker flags an anonymous red chat line (posted by the server test above)', () => {
    const s = newState(0); s.level = 40; s.rebirths = 5; act(s, { type: 'job', id: 'hacker' }, 0); assert.equal(s.jobAnnounce, 'hacker');
    delete s.jobAnnounce; act(s, { type: 'job', id: 'fisher' }, 0); assert.equal(s.jobAnnounce, undefined, 'leaving is quiet');
});


// ── v3.28 해커 3단계: 해킹 VI~X · 블랙 해커 · 미끼 정보 · 퍼즐 추가 ──
test('v3.28 hacks VI–X in the save: intercept/savescum/ddos leave pending writes, botnet doubles brute force and adds entries, root resets today and grants the title', () => {
    const s = veteran(10); s.hacker.grade = 20;
    assert.throws(() => act(s, { type: 'hackRun', id: 'intercept', value: 'nope' }, 0), /월드보스/);
    act(s, { type: 'hackRun', id: 'intercept', value: 'balrog' }, 0); assert.deepEqual(s.hacker.pending, { kind: 'intercept', value: 'balrog', minutes: 0, n: 10 }); delete s.hacker.pending;
    assert.throws(() => act(s, { type: 'hackRun', id: 'savescum', value: 'balrog|sideways' }, 0), /되감기/);
    act(s, { type: 'hackRun', id: 'savescum', value: 'balrog|rewind' }, 0); assert.equal(s.hacker.pending.kind, 'savescum'); delete s.hacker.pending;
    assert.deepEqual([7, 10].map(n => D.HACKER.savescum.rewind(n)), [.05, .2]); assert.deepEqual([6, 10].map(n => D.HACKER.intercept.share(n)), [.1, .5]);
    const bits = s.hacker.bits; act(s, { type: 'start' }, 0); act(s, { type: 'hackRun', id: 'botnet' }, 0); s.lastTick = 0;
    assert.equal(H.entriesCap(s, 0), D.HACKER.infil.entriesPerDay + 2); H.hackerTick(s);
    assert.ok(Math.abs(s.hacker.bits - (bits - D.HACKER.botnet.bits) - D.HACKER.brute.bits * 2) < 1e-9, 'botnet ×2');
    act(s, { type: 'hackRun', id: 'sniff' }, 0); assert.equal(s.hacker.sniff.mult, 2, 'sniffing started under the botnet settles ×2');
    act(s, { type: 'hackRun', id: 'ddos', value: 'drop' }, 0); assert.deepEqual(s.hacker.pending, { kind: 'ddos', value: 'drop', minutes: 120, n: 10 }); delete s.hacker.pending;
    assert.throws(() => act(s, { type: 'hackRun', id: 'ddos', value: 'exp' }, 0), /이번 주/); assert.throws(() => act(s, { type: 'hackRun', id: 'tamper', value: 'hack-ddos|+|+' }, 0), /이벤트/);
    assert.throws(() => act(s, { type: 'hackRun', id: 'botnet' }, 0), /횟수/);
    act(s, { type: 'hackRun', id: 'root' }, 0); assert.equal(s.hacker.pending.kind, 'root'); delete s.hacker.pending;
    assert.deepEqual(s.hacker.used, { root: 1 }, 'daily counts reset'); act(s, { type: 'hackRun', id: 'botnet' }, 0);
    assert.throws(() => act(s, { type: 'hackRun', id: 'ddos', value: 'exp' }, 0), /이번 주/, 'weekly DDoS is not reset');
    assert.throws(() => act(s, { type: 'hackRun', id: 'root' }, 0), /횟수/); tick(s, () => .5);
    assert.ok(s.achievements['hacker:root'] !== undefined, 'root achievement'); assert.ok(TITLES.some(t => t.id === 'hacker:root' && t.name === 'root'));
});

test('v3.28 black hacker: needs hacker mastery, double caps and costs, failures trace (no effect, 6h lockout, 3h with wipe trace)', () => {
    const s = veteran(3); assert.throws(() => act(s, { type: 'job', id: 'blackHacker' }, 0));
    s.jobMastery.hacker = 1500; act(s, { type: 'job', id: 'blackHacker' }, 0); assert.ok(H.isHacker(s) && H.isBlackHacker(s) && H.canAttack(s) && !H.isWhiteHacker(s));
    assert.throws(() => act(s, { type: 'dungeon', id: 'abyss' }, 0), /던전/);
    const b0 = s.hacker.bits; act(s, { type: 'hackRun', id: 'broadcast', value: 'hi' }, 0, () => .99); assert.equal(s.hacker.bits, b0 - D.HACKER.broadcast.bits * 2); delete s.hacker.pending;
    act(s, { type: 'hackRun', id: 'broadcast', value: 'hi' }, 0, () => .99); delete s.hacker.pending;
    act(s, { type: 'hackRun', id: 'broadcast', value: 'hi' }, 0, () => .99); delete s.hacker.pending;
    act(s, { type: 'hackRun', id: 'broadcast', value: 'hi' }, 0, () => .99); delete s.hacker.pending;
    assert.throws(() => act(s, { type: 'hackRun', id: 'broadcast', value: 'hi' }, 0, () => .99), /횟수/, 'tier III: 2 a day doubled to 4');
    assert.deepEqual([1, 5, 10].map(n => Math.round(D.HACKER.black.fail(n) * 100)), [32, 20, 5]);
    act(s, { type: 'hackRun', id: 'down', value: `stage:${W.STAGES[1].id}` }, 0, () => .01);
    assert.equal(s.hacker.pending.kind, 'busted'); assert.equal(s.hacker.pending.value, '서버 다운'); assert.equal(s.hacker.bustedUntil, 6 * 3600_000); delete s.hacker.pending;
    assert.throws(() => act(s, { type: 'hackRun', id: 'crack', value: 'abyss:x' }, 60_000, () => .99), /추적/);
    act(s, { type: 'hackRun', id: 'crack', value: 'abyss:x' }, 6 * 3600_000, () => .99); assert.equal(s.hacker.pending.kind, 'crack'); delete s.hacker.pending;
    act(s, { type: 'skill', id: 'wipeTrace' }, 0); assert.ok(s.skills.includes('wipeTrace'));
    act(s, { type: 'hackRun', id: 'tamper', value: 'ev|+|+' }, 6 * 3600_000, () => .01); assert.equal(s.hacker.bustedUntil, 9 * 3600_000, 'wipe trace: 3 hours'); assert.equal(s.hacker.pending.minutes, 180);
    assert.equal(H.hackCost(s, 10), 20); assert.equal(H.hackCap(s, 1), 2); assert.equal(H.hackCost({ job: 'hacker' }, 10), 10);
});

test('v3.28 identity spoof decoys: mastery 3, validated name/job/level, shown fields keep their real value', () => {
    const s = hacker(); s.hacker.bits = 1000; act(s, { type: 'skill', id: 'adGuard' }, 0); H.gainHacker(s, 0, 1300); assert.equal(H.adguardLevel(s), 2);
    assert.throws(() => act(s, { type: 'hackRun', id: 'spoof', value: 'abyss:x||0|가짜' }, 0), /3단계/);
    H.gainHacker(s, 0, 4000); assert.equal(H.adguardLevel(s), 3);
    for (const bad of ['abyss:x||0|???', 'abyss:x||0|' + '가'.repeat(13), 'abyss:x||0||hacker', 'abyss:x||0||nope', 'abyss:x||0|||0', 'abyss:x||0|||1000']) assert.throws(() => act(s, { type: 'hackRun', id: 'spoof', value: bad }, 0), /미끼/, bad);
    act(s, { type: 'hackRun', id: 'spoof', value: 'abyss:x|job|0|가짜|fisher|7' }, 0);
    assert.deepEqual(s.hacker.pending, { kind: 'spoof', value: 'abyss:x|job|가짜||7', minutes: 0 }, 'shown job keeps its real value');
});

test('v3.33 crew modules in the save: launder lowers black hacker failure and names the crew, joint patch adds 30 minutes', () => {
    const b = veteran(10); b.jobMastery.hacker = 1500; act(b, { type: 'job', id: 'blackHacker' }, 0); b.hacker.crew = { id: 'c_x', name: '그림자', side: 'black', grade: 1, leader: true, syncedAt: 0, modules: ['launder'] };
    act(b, { type: 'hackRun', id: 'broadcast', value: 'hi' }, 0, () => .051); assert.equal(b.hacker.pending.kind, 'broadcast', '5.1% roll passes at tier X with launder (floor 5%)'); delete b.hacker.pending;
    b.hacker.tier = 1; act(b, { type: 'hackRun', id: 'crack', value: 'abyss:x' }, 0, () => .30); assert.equal(b.hacker.pending.kind, 'crack', 'tier I: 32% − 3%p = 29%');
    delete b.hacker.pending; act(b, { type: 'hackRun', id: 'crack', value: 'abyss:x' }, 0, () => .01); assert.deepEqual(b.hacker.pending, { kind: 'busted', value: '크래킹|그림자', minutes: 360 });
    const w = veteran(3); w.jobMastery.hacker = 1500; act(w, { type: 'job', id: 'whiteHacker' }, 0); w.hacker.crew = { id: 'c_w', name: '방패', side: 'white', grade: 1, leader: true, syncedAt: 0, modules: ['jointPatch'] };
    act(w, { type: 'hackRun', id: 'patch', value: `stage:${W.STAGES[1].id}` }, 0); assert.equal(w.hacker.pending.minutes, D.HACKER.white.patch.minutes + 30);
});
