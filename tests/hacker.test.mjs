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
const veteran = (tier = 5) => { const s = hacker(); Object.assign(s.hacker, { bits: 10000, grade: 10, tier }); return s; };

test('v3.25 hack tiers II–V: grade and bits gates, each hack needs its tier', () => {
    assert.deepEqual(D.HACKER.tiers.map(t => t.grade), [1, 4, 6, 8, 10]);
    const s = hacker(); s.hacker.bits = 1e5; act(s, { type: 'hackUnlock' }, 0);
    assert.throws(() => act(s, { type: 'hackUnlock' }, 0), /권한 등급 4/);
    assert.throws(() => act(s, { type: 'hackRun', id: 'tamper', value: 'e|+|+' }, 0), /해킹 II/);
    s.hacker.grade = 10; for (let i = 0; i < 4; i++) act(s, { type: 'hackUnlock' }, 0);
    assert.equal(s.hacker.tier, 5); assert.throws(() => act(s, { type: 'hackUnlock' }, 0), /모두/);
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
    act(s, { type: 'job', id: 'fisher' }, 0); assert.ok(!s.skills.includes('adGuard') || s.skills.length, 'leaves the hacker line');
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
        // v3.27 해커 견제: 역추적은 대상의 오늘 침투 입장을 줄이고, 과부하는 브루트포스 비트를 절반으로.
        await database.createPlayerIfMissing('rival', JSON.stringify({ job: 'hacker', hacker: { bits: 0, exp: 0, grade: 1, tier: 0 } }), T);
        const att = veteran(); act(att, { type: 'hackRun', id: 'trace', value: 'hacker:rival' }, T); await Hk.applyPendingHack(att, 'acct_att', T);
        act(att, { type: 'hackRun', id: 'overload', value: 'hacker:rival' }, T); await Hk.applyPendingHack(att, 'acct_att', T);
        assert.throws(() => act(att, { type: 'hackRun', id: 'trace', value: 'hacker:rival' }, T), /횟수/, 'once a day');
        const rv = veteran(); await Hk.syncHackFeed(rv, 'rival', T); assert.deepEqual(rv.hackFeed.traced, { day: rv.hackFeed.traced.day, n: 1 }); assert.ok(rv.hackFeed.overloadUntil > T);
        assert.equal(H.entriesCap(rv, T), D.HACKER.infil.entriesPerDay - 1);
        rv.lastTick = T; const b1 = rv.hacker.bits; H.hackerTick(rv); assert.ok(Math.abs(rv.hacker.bits - b1 - D.HACKER.brute.bits * .5) < 1e-9, 'overloaded brute force');
        const wh = veteran(); wh.jobMastery.hacker = 1500; act(wh, { type: 'job', id: 'whiteHacker' }, T); assert.throws(() => act(wh, { type: 'hackRun', id: 'trace', value: 'hacker:rival' }, T), /화이트/);
        // v3.26 해커 전직 알림(익명, system-hacker). 파일 DB를 쓰는 테스트는 동시에 돌면 서로의 파일을 바꾸므로 한 테스트에 모읍니다.
        await Hk.announceHacker('hacker', now); const chat = await database.listChat('global', 0, 300);
        assert.equal(chat.at(-1).account_id, 'system-hacker'); assert.equal(chat.at(-1).text, '누군가가 해커로 전직했습니다.');
        // 순위표.
        await Hk.syncHackerBoard('acct_a', a, now); const board = await Hk.listHackerBoard(a.hacker.season.key);
        assert.equal(board[0].id, 'acct_a'); assert.equal(board[0].score, H.seasonScore(a.hacker.season)); assert.equal(Hk.playerOfRow('hacker:acct_a'), 'acct_a');
    } finally { Ev.setRuntimeEvents([], []); Ev.setEventTamper({}); W.setHackDown([]); delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});

test('v3.26 infiltration puzzles: first lock then port, later nodes mix in sequence, base conversion and cipher graded by the server', () => {
    H.setPuzzleKey('test-key-puzzles');
    const kinds = new Set();
    for (let seed = 0; seed < 60; seed++) for (let depth = 0; depth < 12; depth++) {
        const node = H.makeNode(seed, depth), run = { seed, depth, bank: { bits: 0, exp: 0 }, node }, answer = H.nodeAnswer(run);
        kinds.add(node.kind);
        if (depth === 0) assert.equal(node.kind, 'lock'); if (depth === 1) assert.equal(node.kind, 'port');
        if (depth >= 2) assert.ok((depth + 1) % 2 === 1 ? ['lock', 'cipher'].includes(node.kind) : ['port', 'seq', 'bin'].includes(node.kind));
        assert.ok(H.judge(run, answer).solved, `${node.kind} answer opens`);
        if (node.kind === 'bin') assert.equal(Number(node.prompt.startsWith('0x') ? parseInt(node.prompt.slice(2), 16) : parseInt(node.prompt.slice(2), 2)), Number(answer));
        if (node.kind === 'seq') { assert.ok(node.prompt.endsWith('?')); const g = String(Number(answer) + 1); assert.equal(H.judge(run, g).hint, 'DOWN'); }
        if (node.kind === 'cipher') { assert.equal(node.size, answer.length); const wrong = 'Z'.repeat(answer.length); assert.match(H.judge(run, wrong).hint, /일치/); assert.throws(() => H.judge(run, 'AB1')); }
    }
    assert.deepEqual([...kinds].sort(), ['bin', 'cipher', 'lock', 'port', 'seq']);
    assert.deepEqual([3, 5, 6, 12, 13].map(d => D.HACKER.infil.lock(d).digits), [3, 3, 4, 4, 5]);
});

test('v3.26 becoming a hacker flags an anonymous red chat line (posted by the server test above)', () => {
    const s = newState(0); s.level = 40; s.rebirths = 5; act(s, { type: 'job', id: 'hacker' }, 0); assert.equal(s.jobAnnounce, 'hacker');
    delete s.jobAnnounce; act(s, { type: 'job', id: 'fisher' }, 0); assert.equal(s.jobAnnounce, undefined, 'leaving is quiet');
});

