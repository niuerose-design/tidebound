import { assert, test } from './harness.mjs';
const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
const mkRng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

test('expedition data: 30 units, 5 per origin, role counts, every skill and monster id exists, intended comps are valid', async () => {
    const D = await L.load('data/expedition'), Enc = await L.load('data/encounters'), W = await L.load('data/world');
    assert.equal(D.UNITS.length, 30); assert.equal(new Set(D.UNITS.map(u => u.id)).size, 30, 'unique ids');
    for (const o of Object.keys(D.ORIGIN_NAMES)) assert.equal(D.UNITS.filter(u => u.origin === o).length, 5, `origin ${o} has 5`);
    const roles = Object.fromEntries(Object.keys(D.ROLE_NAMES).map(r => [r, D.UNITS.filter(u => u.roles.includes(r)).length]));
    assert.deepEqual(roles, { charge: 6, arcane: 6, guard: 5, control: 5, plague: 4, wraith: 4 });
    assert.deepEqual([8, 7, 7, 5, 3], [1, 2, 3, 4, 5].map(c => D.UNITS.filter(u => u.cost === c).length), 'cost distribution');
    for (const u of D.UNITS) { assert.ok(Enc.enemySkillById(u.skill), `${u.id} skill ${u.skill}`); assert.ok(W.MONSTERS.some(m => m.id === u.monster), `${u.id} monster ${u.monster}`); }
    assert.equal(D.UNITS.filter(u => u.special?.includes('boss')).length, 4); assert.equal(D.UNITS.filter(u => u.special?.includes('onyx')).length, 2);
    for (const comp of D.INTENDED_COMPS) { assert.equal(comp.units.length, 8); for (const id of comp.units) assert.ok(D.unitById(id), `${comp.id}: ${id}`); }
    for (const t of D.TRAITS) { assert.ok(t.tiers.length >= 1); for (let i = 1; i < t.tiers.length; i++) assert.ok(t.tiers[i].count > t.tiers[i - 1].count); }
});

test('expedition traits: same unit counted once, tiers by count, boss/guard-only effects apply to the right units', async () => {
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition');
    const board = [{ unit: 'pig', star: 1, row: 'front' }, { unit: 'pig', star: 2, row: 'front' }, { unit: 'wildBoar', star: 1, row: 'front' }, { unit: 'sharkUnit', star: 1, row: 'front' }, { unit: 'ligator', star: 1, row: 'front' }];
    const active = X.activeTraits(board), charge = active.find(a => a.trait.id === 'charge');
    assert.equal(charge.count, 4, 'duplicate pig counted once'); assert.equal(charge.tier, 2, '4 charge = tier 2');
    const built = X.buildSide(board, 'a');
    const pig = built.units[0], base = X.unitBaseStats(D.unitById('pig'), 1);
    assert.equal(pig.stats.attack, Math.round(base.attack * 1.45), 'charge 4: attack ×1.45');
    // 수호 2: 수호만 받는 피해 −20%. 보스 2: 보스만 체력 +20%.
    const g = X.buildSide([{ unit: 'kingClang', star: 1, row: 'front' }, { unit: 'stoneGolem', star: 1, row: 'front' }, { unit: 'pig', star: 1, row: 'front' }], 'a');
    assert.equal(g.units[0].damageTaken, .2); assert.equal(g.units[2].damageTaken, undefined, 'non-guard untouched');
    // 초원 2가 같이 켜지지 않도록 세 번째 유닛은 숲(이블아이).
    const b = X.buildSide([{ unit: 'mushmom', star: 1, row: 'front' }, { unit: 'zakum', star: 1, row: 'front' }, { unit: 'evilEye', star: 1, row: 'back' }], 'a');
    assert.equal(b.units[0].stats.hp, Math.round(X.unitBaseStats(D.unitById('mushmom'), 1).hp * 1.2)); assert.equal(b.units[2].stats.hp, X.unitBaseStats(D.unitById('evilEye'), 1).hp);
    assert.ok(X.buildSide([{ unit: 'evilEye', star: 1, row: 'back' }], 'a').units[0].magicBasic, 'arcane units attack with magic');
});

test('expedition battle: deterministic, stars beat lower stars, cost beats cost, empty side loses, turn cap yields hp-ratio verdict', async () => {
    const X = await L.load('systems/expedition');
    const a = [{ unit: 'pig', star: 1, row: 'front' }], b = [{ unit: 'wildBoar', star: 1, row: 'front' }];
    const r1 = X.battle(a, b, mkRng(1)), r2 = X.battle(a, b, mkRng(1)); assert.equal(JSON.stringify(r1), JSON.stringify(r2), 'same seed same result');
    let star = 0, cost = 0;
    for (let k = 0; k < 30; k++) { if (X.battle([{ unit: 'pig', star: 3, row: 'front' }], [{ unit: 'pig', star: 1, row: 'front' }], mkRng(k)).winner === 'a') star++; if (X.battle([{ unit: 'zakum', star: 1, row: 'front' }], [{ unit: 'ligator', star: 1, row: 'front' }], mkRng(k + 50)).winner === 'a') cost++; }
    assert.ok(star >= 28, `★3 beats ★1 (${star}/30)`); assert.ok(cost >= 25, `cost 5 beats cost 3 (${cost}/30)`);
    assert.equal(X.battle(a, [], mkRng(3)).winner, 'a', 'no enemies = win');
    const stall = X.battle([{ unit: 'seaGuard', star: 3, row: 'front' }], [{ unit: 'seaGuard', star: 3, row: 'front' }], mkRng(9), 3);
    assert.ok(stall.turns <= 3 && ['a', 'b', 'draw'].includes(stall.winner), 'turn cap respected');
    // 앞줄 우선: 뒷줄 마법 유닛은 앞줄이 살아 있는 동안 맞지 않습니다.
    const r = X.battle([{ unit: 'pig', star: 1, row: 'front' }], [{ unit: 'kingClang', star: 3, row: 'front' }, { unit: 'evilEye', star: 1, row: 'back' }], mkRng(5), 2);
    assert.ok(!r.log.some(l => l.includes('돼지') && l.includes('이블아이')), 'front row shields the back row while alive');
});

test('expedition shop and waves: shop follows level odds, waves respect budget and grow with the round', async () => {
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition');
    const rng = mkRng(7); const low = Array.from({ length: 200 }, () => X.rollShop(2, rng)).flat();
    assert.ok(low.every(id => D.unitById(id).cost === 1), 'level 2 shop is all cost 1');
    const high = Array.from({ length: 200 }, () => X.rollShop(8, rng)).flat(); assert.ok(high.some(id => D.unitById(id).cost === 5), 'level 8 can show cost 5');
    for (const round of [1, 4, 8]) { const w = X.rollWave(round, mkRng(round)); const spent = w.reduce((n, p) => n + D.unitById(p.unit).cost * (p.star === 3 ? 4 : p.star === 2 ? 2 : 1), 0); assert.ok(spent <= X.WAVE_BUDGET[round], `round ${round} within budget`); assert.ok(w.length >= 1); }
    assert.ok(X.rollWave(1, mkRng(1)).every(p => D.unitById(p.unit).cost === 1 && p.star === 1), 'round 1 is cost-1 ★1 only');
});

test('expedition mana casting: skills fire only at 100 mana (basic +10 · hit +5), temple start mana, forest charge boost, meadow regen, wasteland reflect', async () => {
    const X = await L.load('systems/expedition'), D = await L.load('data/expedition');
    // 바다 수호병 ★3 둘: 턴마다 기본 공격 +10 · 피격 +5 = 15라 7턴 끝에 105가 되어 8턴째 행동에서 처음 시전합니다. 그 전에는 ‘마나 시전’ 줄이 없습니다.
    const r = X.battle([{ unit: 'seaGuard', star: 3, row: 'front' }], [{ unit: 'seaGuard', star: 3, row: 'front' }], mkRng(11), 14);
    const casts = r.log.filter(l => l.includes('마나 시전'));
    assert.ok(casts.length >= 1, 'a cast happened'); assert.ok(casts[0].startsWith('8턴'), `first cast on turn 8: ${casts[0]}`); assert.ok(!r.log.slice(0, 14).some(l => l.includes('마나 시전')), 'no cast in the first seven turns');
    const side = X.buildSide([{ unit: 'erdaSpirit', star: 1, row: 'back' }, { unit: 'memoryMonitor', star: 1, row: 'back' }], 'a'); assert.equal(side.units[0].charge, 50, 'temple 2: start mana 50');
    const full = X.buildSide(['erdaSpirit', 'memoryMonitor', 'lyka', 'vanishingSoul'].map(u => ({ unit: u, star: 1, row: 'back' })), 'a'); assert.equal(full.units[0].charge, 100, 'temple 4: start mana 100');
    const forest = X.buildSide(['evilEye', 'curseEye', 'wraithUnit', 'darkDrake'].map(u => ({ unit: u, star: 1, row: 'back' })), 'a'); assert.equal(forest.units[0].manaGain, 1.25, 'forest 4: mana +25%');
    assert.ok(X.buildSide(['slime', 'orangeMushroom', 'pig', 'zombieMushroom'].map(u => ({ unit: u, star: 1, row: 'front' })), 'a').flags.has('regen'), 'meadow 4 regen flag');
    const w = X.battle(['wildBoar', 'skeletonSoldier', 'stoneGolem', 'mixedGolem'].map(u => ({ unit: u, star: 2, row: 'front' })), [{ unit: 'zakum', star: 1, row: 'front' }], mkRng(3), 6);
    assert.ok(w.log.some(l => l.includes('반격')), 'wasteland 4 reflects damage');
    assert.equal(D.unitById('orangeMushroom').skill, 'foeBurn'); assert.equal(D.unitById('seacle').skill, 'foeBarbs');
});

test('expedition run: start → buy → merge stars → place → fight → finish with essence reward; daily limit; sell refunds; xp levels', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), A = await L.load('systems/actions/expedition'), T = await L.load('data/time');
    const s = newState(0); s.level = 100; s.rebirths = 120; s.essence = 0;
    const rng = mkRng(21), now = 1_800_000_000_000;
    act(s, { type: 'expeditionStart' }, now, rng); const r = s.expedition; assert.ok(r && r.round === 1 && r.level === 2 && r.shop.length === 5 && r.gold === D.EXPEDITION.baseGold);
    assert.throws(() => act(s, { type: 'expeditionStart' }, now, rng), /진행 중/);
    // 벤치에 같은 유닛 ★1 셋 → ★2 하나.
    r.bench = [{ unit: 'pig', star: 1 }, { unit: 'pig', star: 1 }, { unit: 'pig', star: 1 }]; A.mergeStars(r); assert.deepEqual(r.bench, [{ unit: 'pig', star: 2 }]);
    // 보드에 하나 있으면 그 자리가 승급.
    r.board = [{ unit: 'slime', star: 1, row: 'front' }]; r.bench = [{ unit: 'slime', star: 1 }, { unit: 'slime', star: 1 }]; A.mergeStars(r); assert.deepEqual(r.board, [{ unit: 'slime', star: 2, row: 'front' }]); assert.equal(r.bench.length, 0);
    // 구매: 골드 차감 · 상점 칸 비움 · 벤치로.
    r.bench = []; r.board = []; r.gold = 10; const i = r.shop.findIndex(Boolean), cost = D.unitById(r.shop[i]).cost; act(s, { type: 'expeditionBuy', value: String(i) }, now, rng);
    assert.equal(r.gold, 10 - cost); assert.equal(r.shop[i], null); assert.equal(r.bench.length, 1);
    assert.throws(() => act(s, { type: 'expeditionBuy', value: String(i) }, now, rng), /고르세요/);
    // 판매 환불.
    const sold = r.bench[0]; act(s, { type: 'expeditionSell', value: 'bench:0' }, now, rng); assert.equal(r.gold, 10 - cost + D.sellPrice(D.unitById(sold.unit).cost, sold.star)); assert.equal(r.bench.length, 0);
    // 배치 제한: 레벨 2 = 2명.
    r.bench = [{ unit: 'pig', star: 1 }, { unit: 'wildBoar', star: 1 }, { unit: 'evilEye', star: 1 }];
    act(s, { type: 'expeditionPlace', value: 'bench:0:front' }, now, rng); act(s, { type: 'expeditionPlace', value: 'bench:0:front' }, now, rng);
    assert.throws(() => act(s, { type: 'expeditionPlace', value: 'bench:0:back' }, now, rng), /배치는/); assert.equal(r.board.length, 2);
    act(s, { type: 'expeditionPlace', value: 'board:0' }, now, rng); assert.equal(r.board.length, 1); assert.equal(r.bench.length, 2);
    // 경험치: 4 G → 레벨 2 → 3(목표 2).
    r.gold = 10; act(s, { type: 'expeditionXp' }, now, rng); assert.equal(r.level, 3); assert.equal(r.gold, 6);
    // 전투 → 다음 라운드 · 수입 · 새 상점.
    act(s, { type: 'expeditionFight' }, now, rng); assert.equal(r.round, 2); assert.ok(r.last && typeof r.last.won === 'boolean'); assert.ok(r.gold >= 6 + D.EXPEDITION.baseGold); assert.ok(r.shop.every(x => x === null || D.unitById(x)));
    // 포기 → 보상 · 하루 1판.
    r.wins = 3; act(s, { type: 'expeditionQuit' }, now, rng);
    assert.ok(r.done); assert.equal(r.reward, 3 * A.expeditionRewardPerWin(120)); assert.equal(s.essence, r.reward); assert.equal(A.expeditionRewardPerWin(120), 140); assert.equal(s.expeditionDay, T.dayKey(now)); assert.equal(s.expeditionBest, 3);
    act(s, { type: 'expeditionClear' }, now, rng); assert.equal(s.expedition, undefined);
    assert.throws(() => act(s, { type: 'expeditionStart' }, now, rng), /오늘 원정/);
    act(s, { type: 'expeditionStart' }, now + 86_400_000, rng); assert.ok(s.expedition && !s.expedition.done, 'next day opens again');
    // 체력 0이면 탈락 종료.
    const t = s.expedition; t.hp = 1; t.board = [{ unit: 'slime', star: 1, row: 'front' }]; t.round = 5; act(s, { type: 'expeditionFight' }, now + 86_400_000, mkRng(5));
    if (!t.last.won) { assert.ok(t.done, 'knocked out'); } else assert.equal(t.round, 6);
});

test('expedition stage 3 effects: plague spread, boss roar, sea haste buff, wasteland reflect 25%', async () => {
    const X = await L.load('systems/expedition');
    const plague = ['orangeMushroom', 'seacle', 'fireBoar', 'skelegon'].map(u => ({ unit: u, star: 3, row: 'front' }));
    assert.ok(X.buildSide(plague, 'a').flags.has('spread'));
    // 적이 기술이 나가기 전에 죽으면 옮길 것이 없으므로, 오래 버티는 적(★3 수호)으로 봅니다.
    let spread = false; for (let k = 0; k < 30 && !spread; k++) spread = X.battle(plague, [{ unit: 'kingClang', star: 3, row: 'front' }, { unit: 'stoneGolem', star: 3, row: 'front' }, { unit: 'seaGuard', star: 3, row: 'front' }], mkRng(k)).log.some(l => l.includes('전파'));
    assert.ok(spread, 'a dot spread to another enemy at least once');
    const bosses = ['mushmom', 'lucid', 'zakum', 'blackMage'].map(u => ({ unit: u, star: 1, row: 'front' }));
    const roar = X.battle(bosses, [{ unit: 'pig', star: 1, row: 'front' }], mkRng(2), 1); assert.ok(roar.log[0].includes('포효'), roar.log[0]);
    const sea = ['seacle', 'sharkUnit', 'seaGuard', 'skelegon'].map(u => ({ unit: u, star: 1, row: 'front' }));
    const built = X.buildSide(sea, 'a'); assert.ok(built.flags.has('haste')); assert.equal(built.units[0].effects?.buffs, undefined, 'buff is granted at battle start, not at build');
    const w = X.battle(['wildBoar', 'skeletonSoldier', 'stoneGolem', 'mixedGolem'].map(u => ({ unit: u, star: 2, row: 'front' })), [{ unit: 'zakum', star: 1, row: 'front' }], mkRng(3), 6);
    const back = w.log.find(l => l.includes('반격')); assert.ok(back, 'reflect line');
});

test('expedition ghosts: per-round ghost JSON is parsed and validated, fights against it are recorded, play stats accumulate', async () => {
    const { newState, act } = await import('./harness.mjs');
    const A = await L.load('systems/actions/expedition');
    const good = { 2: { name: '이웃', board: [{ unit: 'pig', star: 1, row: 'front' }] }, 3: { name: '멀리', board: [{ unit: 'evilEye', star: 2, row: 'back' }] } };
    assert.deepEqual(A.parseGhost(JSON.stringify(good), 2), good[2]); assert.equal(A.parseGhost(JSON.stringify(good), 4), null, 'no ghost for that round');
    assert.equal(A.parseGhost(JSON.stringify({ 2: { name: 'x', board: [{ unit: 'nope', star: 1, row: 'front' }] } }), 2), null, 'unknown unit rejected');
    assert.equal(A.parseGhost(JSON.stringify({ 2: { name: 'x', board: [{ unit: 'pig', star: 9, row: 'front' }] } }), 2), null, 'bad star rejected');
    assert.equal(A.parseGhost('not json', 2), null); assert.equal(A.parseGhost(undefined, 2), null);
    const s = newState(0); s.level = 100; const now = 1_800_000_000_000;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition;
    r.board = [{ unit: 'zakum', star: 3, row: 'front' }]; r.round = 2;
    // ghostChance .6: 난수 0.1이면 고스트와 싸움.
    act(s, { type: 'expeditionFight', value: JSON.stringify(good) }, now, (() => { let i = 0; return () => (i++ === 0 ? .1 : mkRng(5)()); })());
    assert.equal(r.last.opponent, '이웃', 'fought the ghost'); assert.ok(r.last.won); assert.deepEqual(r.history[2], [{ unit: 'zakum', star: 3, row: 'front' }], 'board snapshot kept');
    const st = s.expeditionStats; assert.equal(st.ghostFights, 1); assert.equal(st.ghostWins, 1); assert.equal(st.roundPlays[2], 1); assert.equal(st.roundWins[2], 1); assert.equal(st.units.zakum, 1);
    // 1라운드는 고스트를 쓰지 않습니다.
    const t = newState(0); t.level = 100; act(t, { type: 'expeditionStart' }, now, mkRng(2)); t.expedition.board = [{ unit: 'pig', star: 1, row: 'front' }];
    act(t, { type: 'expeditionFight', value: JSON.stringify({ 1: good[2] }) }, now, () => .1); assert.equal(t.expedition.last.opponent, undefined, 'round 1 is always a wave');
    // 종료 시 판 수 · 완주 집계.
    r.wins = 8; r.round = 9; A.expeditionActions.expeditionQuit(s, { a: { type: 'expeditionQuit' }, id: '', now, rng: mkRng(1) });
    assert.equal(s.expeditionStats.runs, 1); assert.equal(s.expeditionStats.clears, 1);
});

test('expedition season rows: sync keeps the best run of the month, ghosts exclude self, board lists by rating', async () => {
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const file = path.join(os.tmpdir(), `tb-exp-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    const E = await L.load('server/expedition'), T = await L.load('data/time');
    try {
        const now = 1_800_000_000_000, key = T.monthKey(now);
        const mk = (name, wins, round, boards, done = true) => ({ name, expedition: { round, wins, done, last: { won: true }, history: boards } });
        await E.syncExpeditionRow('p1', mk('하나', 3, 4, { 1: [{ unit: 'pig', star: 1, row: 'front' }], 2: [{ unit: 'pig', star: 2, row: 'front' }] }), now);
        await E.syncExpeditionRow('p2', mk('둘', 5, 6, { 2: [{ unit: 'slime', star: 1, row: 'front' }], 3: [{ unit: 'slime', star: 2, row: 'front' }] }), now + 1);
        let rows = await E.listExpeditionBoard(key); assert.deepEqual(rows.map(r => [r.name, r.wins, r.rank]), [['둘', 5, 1], ['하나', 3, 2]]);
        // 더 못한 판은 판 수만 오르고 보드 · 승수는 그대로.
        await E.syncExpeditionRow('p2', mk('둘', 1, 2, { 2: [{ unit: 'kingClang', star: 1, row: 'front' }] }), now + 2);
        rows = await E.listExpeditionBoard(key); const two = rows.find(r => r.name === '둘'); assert.equal(two.wins, 5); assert.equal(two.runs, 2);
        const ghosts = await E.pickGhosts(key, 'p1', () => 0); assert.equal(ghosts[2].name, '둘', 'self excluded, other player picked'); assert.equal(ghosts[3].name, '둘'); assert.equal(ghosts[4], undefined);
        const forTwo = await E.pickGhosts(key, 'p2', () => 0); assert.equal(forTwo[2].name, '하나');
        assert.equal(E.expeditionSeason('2026-10'), 30_000_000 + 202610);
    } finally { delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});
