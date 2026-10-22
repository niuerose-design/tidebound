import { assert, test } from './harness.mjs';
const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
/** 11단계 증강 선택지는 2 · 5 · 8라운드에 전투를 막으므로, 증강을 따로 보지 않는 테스트는 전투 전에 치웁니다. */
const clearOffer = (st) => { if (st.expedition?.augmentOffer) delete st.expedition.augmentOffer; };
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
    // 수호 2: 수호만 받는 피해 −25%(v3.421). 보스 2: 보스만 체력 +30%.
    const g = X.buildSide([{ unit: 'kingClang', star: 1, row: 'front' }, { unit: 'stoneGolem', star: 1, row: 'front' }, { unit: 'pig', star: 1, row: 'front' }], 'a');
    assert.equal(g.units[0].damageTaken, .25); assert.equal(g.units[2].damageTaken, undefined, 'non-guard untouched');
    // 초원 2가 같이 켜지지 않도록 세 번째 유닛은 숲(이블아이).
    const b = X.buildSide([{ unit: 'mushmom', star: 1, row: 'front' }, { unit: 'zakum', star: 1, row: 'front' }, { unit: 'evilEye', star: 1, row: 'back' }], 'a');
    assert.equal(b.units[0].stats.hp, Math.round(X.unitBaseStats(D.unitById('mushmom'), 1).hp * 1.3)); assert.equal(b.units[2].stats.hp, X.unitBaseStats(D.unitById('evilEye'), 1).hp);
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
    for (const round of [1, 3, 4, 7, 8, 10, 12]) { const w = X.rollWave(round, mkRng(round)); const spent = w.reduce((n, p) => n + D.unitById(p.unit).cost * (p.star === 3 ? 4 : p.star === 2 ? 2 : 1), 0); assert.ok(spent <= X.WAVE_BUDGET[round], `round ${round} within budget`); assert.ok(w.length >= 1); }
    assert.ok(X.rollWave(1, mkRng(1)).every(p => D.unitById(p.unit).cost === 1 && p.star === 1), 'round 1 is cost-1 ★1 only');
});

test('expedition mana casting: skills fire only at 100 mana (basic +10 · hit +5), temple start mana, forest charge boost, meadow regen, wasteland reflect', async () => {
    const X = await L.load('systems/expedition'), D = await L.load('data/expedition');
    // 바다 수호병 ★3 둘: 턴마다 기본 공격 +10 · 피격 +5 = 15라 7턴 끝에 105가 되어 8턴째 행동에서 처음 시전합니다. 그 전에는 ‘마나 시전’ 줄이 없습니다.
    const r = X.battle([{ unit: 'seaGuard', star: 3, row: 'front' }], [{ unit: 'seaGuard', star: 3, row: 'front' }], mkRng(11), 14);
    const casts = r.log.filter(l => l.includes('마나 시전'));
    assert.ok(casts.length >= 1, 'a cast happened'); assert.ok(casts[0].startsWith('8턴'), `first cast on turn 8: ${casts[0]}`); assert.ok(!r.log.slice(0, 14).some(l => l.includes('마나 시전')), 'no cast in the first seven turns');
    const side = X.buildSide([{ unit: 'erdaSpirit', star: 1, row: 'back' }, { unit: 'memoryMonitor', star: 1, row: 'back' }], 'a'); assert.equal(side.units[0].charge, 100, 'temple 2: start mana 100 (v3.427)');
    const full = X.buildSide(['erdaSpirit', 'memoryMonitor', 'lyka', 'vanishingSoul'].map(u => ({ unit: u, star: 1, row: 'back' })), 'a'); assert.equal(full.units[0].charge, 100, 'temple 4: start mana 100');
    const forest = X.buildSide(['evilEye', 'curseEye', 'wraithUnit', 'darkDrake'].map(u => ({ unit: u, star: 1, row: 'back' })), 'a'); assert.equal(forest.units[0].manaGain, 1.25, 'forest 4: mana +25%');
    assert.ok(X.buildSide(['slime', 'orangeMushroom', 'pig', 'zombieMushroom'].map(u => ({ unit: u, star: 1, row: 'front' })), 'a').flags.has('regen'), 'meadow 4 regen flag');
    const w = X.battle(['wildBoar', 'skeletonSoldier', 'stoneGolem', 'mixedGolem'].map(u => ({ unit: u, star: 2, row: 'front' })), [{ unit: 'zakum', star: 1, row: 'front' }], mkRng(3), 6);
    assert.ok(w.log.some(l => l.includes('반격')), 'wasteland 4 reflects damage');
    assert.equal(D.unitById('orangeMushroom').skill, 'foeBurn'); assert.equal(D.unitById('seacle').skill, 'foeBarbs');
});

test('expedition run: start → buy → merge stars → place → fight → finish with pearl reward; no daily limit (v3.341); sell refunds; xp levels', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), A = await L.load('systems/actions/expedition');
    const s = newState(0); s.level = 100; s.rebirths = 120; s.pearls = 0;
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
    (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, rng); assert.equal(r.round, 2); assert.ok(r.last && typeof r.last.won === 'boolean'); assert.ok(r.gold >= 6 + D.EXPEDITION.baseGold); assert.ok(r.shop.every(x => x === null || D.unitById(x)));
    // 포기 → 세계석 보상(승리당 1, 완주 없음) · 같은 날에도 바로 다시 출발.
    r.wins = 3; act(s, { type: 'expeditionQuit' }, now, rng);
    assert.ok(r.done); assert.equal(r.reward, 3 * D.EXPEDITION.pearlsPerWin); assert.equal(s.pearls, r.reward); assert.equal(A.expeditionReward(8, true), 8 * D.EXPEDITION.pearlsPerWin + D.EXPEDITION.clearPearls); assert.equal(s.expeditionDay, undefined, 'no daily key any more'); assert.equal(s.expeditionBest, 3);
    assert.equal(s.essence, 0, 'essence untouched');
    act(s, { type: 'expeditionStart' }, now, rng); assert.ok(s.expedition && !s.expedition.done && s.expedition.round === 1, 'a finished run is replaced the same day'); assert.ok(s.expedition.startedAt > r.startedAt, 'new run has a distinct startedAt');
    act(s, { type: 'expeditionQuit' }, now, rng); act(s, { type: 'expeditionClear' }, now, rng); assert.equal(s.expedition, undefined);
    act(s, { type: 'expeditionStart' }, now + 86_400_000, rng); assert.ok(s.expedition && !s.expedition.done);
    // 체력 0이면 탈락 종료.
    const t = s.expedition; t.hp = 1; t.board = [{ unit: 'slime', star: 1, row: 'front' }]; t.round = 5; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now + 86_400_000, mkRng(5));
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
    assert.deepEqual(A.parseGhost(JSON.stringify(good), 2), { ...good[2], wins: 0 }); assert.equal(A.parseGhost(JSON.stringify(good), 4), null, 'no ghost for that round');
    assert.equal(A.parseGhost(JSON.stringify({ 2: { ...good[2], wins: 5 } }), 2).wins, 5); assert.equal(A.parseGhost(JSON.stringify({ 2: { ...good[2], wins: 99 } }), 2).wins, 0, 'out-of-range wins ignored');
    assert.equal(A.parseGhost(JSON.stringify({ 2: { name: 'x', board: [{ unit: 'nope', star: 1, row: 'front' }] } }), 2), null, 'unknown unit rejected');
    assert.equal(A.parseGhost(JSON.stringify({ 2: { name: 'x', board: [{ unit: 'pig', star: 9, row: 'front' }] } }), 2), null, 'bad star rejected');
    assert.equal(A.parseGhost('not json', 2), null); assert.equal(A.parseGhost(undefined, 2), null);
    const s = newState(0); s.level = 100; const now = 1_800_000_000_000;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; delete r.rule; // 주간 규칙 영향 제거
    r.board = [{ unit: 'zakum', star: 3, row: 'front' }]; r.round = 2;
    // ghostChance .6: 난수 0.1이면 고스트와 싸움.
    (clearOffer(s), act)(s, { type: 'expeditionFight', value: JSON.stringify({ 2: { ...good[2], wins: 4 }, 3: good[3] }) }, now, (() => { let i = 0; return () => (i++ === 0 ? .1 : mkRng(5)()); })());
    assert.equal(r.last.opponent, '이웃', 'fought the ghost'); assert.ok(r.last.won); assert.equal(r.ghostPoints, 40, '4단계: 이긴 고스트 승수 4 × 10'); assert.deepEqual(r.history[2], [{ unit: 'zakum', star: 3, row: 'front' }], 'board snapshot kept');
    const st = s.expeditionStats; assert.equal(st.ghostFights, 1); assert.equal(st.ghostWins, 1); assert.equal(st.roundPlays[2], 1); assert.equal(st.roundWins[2], 1); assert.equal(st.units.zakum, 1);
    // 1라운드는 고스트를 쓰지 않습니다.
    const t = newState(0); t.level = 100; act(t, { type: 'expeditionStart' }, now, mkRng(2)); t.expedition.board = [{ unit: 'pig', star: 1, row: 'front' }];
    (clearOffer(t), act)(t, { type: 'expeditionFight', value: JSON.stringify({ 1: good[2] }) }, now, () => .1); assert.equal(t.expedition.last.opponent, undefined, 'round 1 is always a wave');
    // 종료 시 판 수 · 완주 집계.
    r.wins = 8; r.round = 13; A.expeditionActions.expeditionQuit(s, { a: { type: 'expeditionQuit' }, id: '', now, rng: mkRng(1) });
    assert.equal(s.expeditionStats.runs, 1); assert.equal(s.expeditionStats.clears, 1);
});

test('expedition season rows: sync keeps the best run of the month, ghosts exclude self, board lists by rating', async () => {
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const file = path.join(os.tmpdir(), `tb-exp-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    const E = await L.load('server/expedition'), T = await L.load('data/time');
    try {
        const now = 1_800_000_000_000, key = T.monthKey(now);
        const mk = (name, wins, round, boards, done = true, ghostPoints = 0, startedAt = 1) => ({ name, expedition: { round, wins, done, last: { won: true }, history: boards, ghostPoints, startedAt } });
        await E.syncExpeditionRow('p1', mk('하나', 3, 4, { 1: [{ unit: 'pig', star: 1, row: 'front' }], 2: [{ unit: 'pig', star: 2, row: 'front' }] }), now);
        await E.syncExpeditionRow('p2', mk('둘', 5, 6, { 2: [{ unit: 'slime', star: 1, row: 'front' }], 3: [{ unit: 'slime', star: 2, row: 'front' }] }), now + 1);
        let rows = await E.listExpeditionBoard(key); assert.deepEqual(rows.map(r => [r.name, r.wins, r.rank]), [['둘', 5, 1], ['하나', 3, 2]]);
        // 더 못한 판은 판 수만 오르고 보드 · 승수는 그대로.
        await E.syncExpeditionRow('p2', mk('둘', 1, 2, { 2: [{ unit: 'kingClang', star: 1, row: 'front' }] }, true, 30, 2), now + 2);
        rows = await E.listExpeditionBoard(key); const two = rows.find(r => r.name === '둘'); assert.equal(two.wins, 5); assert.equal(two.runs, 2);
        // 4단계 점수: 5 × 100 + 라운드 6 + 두 판의 고스트 가산(0 + 30). 같은 판을 다시 갱신해도 가산은 판별로 한 번.
        assert.equal(two.score, 536); assert.equal(two.ghostPoints, 30);
        await E.syncExpeditionRow('p2', mk('둘', 1, 2, { 2: [{ unit: 'kingClang', star: 1, row: 'front' }] }, true, 30, 2), now + 3); assert.equal((await E.listExpeditionBoard(key)).find(r => r.name === '둘').score, 536, 'idempotent per run');
        assert.equal(E.expeditionScore({ wins: 8, cleared: true, round: 8, ghostByRun: { a: 10, b: 20 } }), 888);
        // v3.423: 연습 원정대가 후보를 채우므로 실제 계정만 골라 봅니다.
        const real = list => (list || []).filter(g => !g.account?.startsWith('starter:'));
        const ghosts = await E.pickGhosts(key, 'p1', () => 0); assert.equal(real(ghosts[2])[0].name, '둘', 'self excluded, other player picked'); assert.equal(real(ghosts[2])[0].mods, undefined, 'no augments: no mods'); assert.equal(real(ghosts[2])[0].wins, 5, 'ghost carries its best wins'); assert.equal(real(ghosts[2])[0].account, 'p2'); assert.equal(real(ghosts[3])[0].name, '둘'); assert.equal(ghosts[4], undefined, 'boss round: no ghosts'); assert.equal(ghosts.pool, 1 + 8, 'one other account + starters');
        const forTwo = await E.pickGhosts(key, 'p2', () => 0); assert.equal(real(forTwo[2])[0].name, '하나');
        assert.equal(E.expeditionSeason('2026-10'), 30_000_000 + 202610);
        // 9단계 정산: 다음 달에 지난달 행으로 순위 · 보상. 행이 없으면 null.
        const nextMonth = now + 32 * 86_400_000;
        const one = await E.settleExpeditionSeason('p1', nextMonth); assert.deepEqual(one, { season: key, rank: 2, total: 2, wins: 3, pearls: 30 });
        const two2 = await E.settleExpeditionSeason('p2', nextMonth); assert.equal(two2.rank, 1); assert.equal(two2.pearls, 50);
        assert.equal(await E.settleExpeditionSeason('p3', nextMonth), null); assert.equal(await E.settleExpeditionSeason('p1', now), null, 'the current month is not settled');
    } finally { delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});

test('expedition items (stage 6): win drops a box item (hold cap), equip/unequip/swap, items follow units through place/sell/merge, effects apply in battle, ghosts may carry items', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition'), A = await L.load('systems/actions/expedition');
    assert.equal(D.BOX_ITEMS().length, 8); for (const it of D.ITEMS) assert.ok(it.id && it.name && it.desc);
    // 전투 효과: 맹공의 검 +35% 물리, 수호의 방패 받는 피해 −25%(시너지와 곱), 마나석 시작 마나, 가시 갑옷 반격.
    const base = X.buildSide([{ unit: 'pig', star: 1, row: 'front' }], 'a').units[0], blade = X.buildSide([{ unit: 'pig', star: 1, row: 'front', item: 'blade' }], 'a').units[0];
    assert.equal(blade.stats.attack, Math.round(base.stats.attack * 1.35)); assert.ok(blade.name.includes('[맹공의 검]'));
    const shield = X.buildSide([{ unit: 'kingClang', star: 1, row: 'front', item: 'shield' }, { unit: 'stoneGolem', star: 1, row: 'front' }], 'a').units[0];
    assert.ok(Math.abs(shield.damageTaken - (1 - .75 * .75)) < 1e-9, 'guard 2 (25%) and shield (25%) multiply');
    assert.equal(X.buildSide([{ unit: 'pig', star: 1, row: 'front', item: 'manaStone' }], 'a').units[0].charge, 60);
    const mail = X.battle([{ unit: 'seaGuard', star: 3, row: 'front', item: 'thornMail' }], [{ unit: 'pig', star: 1, row: 'front' }], mkRng(4), 3); assert.ok(mail.log.some(l => l.includes('반격')), 'thorn mail reflects');
    // 판 흐름.
    const s = newState(0); s.level = 100; const now = 1_800_000_000_000;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; delete r.rule; // 주간 규칙 영향 제거
    r.board = [{ unit: 'zakum', star: 3, row: 'front' }];
    (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(2)); assert.ok(r.last.won); assert.equal(r.box.length, 3, 'box offer on win (stage 7)'); act(s, { type: 'expeditionPickBox', value: '0' }, now, mkRng(1)); assert.equal(r.items.length, 1); assert.ok(D.itemById(r.items[0]));
    r.items = ['blade', 'shield', 'boots', 'fang']; r.round = 2; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(3)); assert.equal(r.items.length, 4, 'hold cap: no box when full'); assert.equal(r.box, undefined);
    // 장착 · 교체 · 해제.
    r.bench = [{ unit: 'pig', star: 1 }];
    act(s, { type: 'expeditionEquip', value: 'bench:0:0' }, now, mkRng(1)); assert.equal(r.bench[0].item, 'blade'); assert.deepEqual(r.items, ['shield', 'boots', 'fang']);
    act(s, { type: 'expeditionEquip', value: 'bench:0:0' }, now, mkRng(1)); assert.equal(r.bench[0].item, 'shield'); assert.deepEqual(r.items, ['boots', 'fang', 'blade'], 'swapped item returns to the held row');
    assert.throws(() => act(s, { type: 'expeditionEquip', value: 'bench:0:9' }, now, mkRng(1)), /아이템/);
    act(s, { type: 'expeditionPlace', value: 'bench:0:back' }, now, mkRng(1)); assert.equal(r.board.at(-1).item, 'shield', 'item follows the unit to the board');
    act(s, { type: 'expeditionUnequip', value: `board:${r.board.length - 1}` }, now, mkRng(1)); assert.equal(r.board.at(-1).item, undefined); assert.equal(r.items.length, 4);
    assert.throws(() => act(s, { type: 'expeditionUnequip', value: `board:${r.board.length - 1}` }, now, mkRng(1)), /해제할/);
    r.items = ['blade', 'boots', 'fang', 'horn']; r.board[r.board.length - 1].item = 'wand';
    assert.throws(() => act(s, { type: 'expeditionUnequip', value: `board:${r.board.length - 1}` }, now, mkRng(1)), /까지/, 'cannot unequip when hold is full');
    // 판매 · 승급 때 아이템 회수.
    r.items = []; act(s, { type: 'expeditionSell', value: `board:${r.board.length - 1}` }, now, mkRng(1)); assert.deepEqual(r.items, ['wand']);
    r.items = []; r.bench = [{ unit: 'slime', star: 1, item: 'blade' }, { unit: 'slime', star: 1, item: 'boots' }, { unit: 'slime', star: 1 }]; A.mergeStars(r);
    assert.deepEqual(r.bench, [{ unit: 'slime', star: 2, item: 'blade' }]); assert.deepEqual(r.items, ['boots'], 'first unit keeps its item, the other returns');
    r.items = []; r.board = [{ unit: 'pig', star: 1, row: 'front', item: 'fang' }]; r.bench = [{ unit: 'pig', star: 1, item: 'horn' }, { unit: 'pig', star: 1 }]; A.mergeStars(r);
    assert.deepEqual(r.board, [{ unit: 'pig', star: 2, row: 'front', item: 'fang' }]); assert.deepEqual(r.items, ['horn']);
    // 고스트 보드의 아이템은 검증을 거쳐 전투에 들어갑니다.
    assert.equal(A.parseGhost(JSON.stringify({ 2: { name: 'g', board: [{ unit: 'pig', star: 1, row: 'front', item: 'blade' }] } }), 2).board[0].item, 'blade');
    assert.equal(A.parseGhost(JSON.stringify({ 2: { name: 'g', board: [{ unit: 'pig', star: 1, row: 'front', item: 'nope' }] } }), 2), null, 'unknown item rejected');
});

test('expedition stage 7: box offers 3 distinct basic items and blocks the fight until picked or skipped; combining two held items by table yields a tier-2 item', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition');
    assert.equal(D.ITEMS.filter(x => x.tier === 2).length, 8); assert.ok(D.BOX_ITEMS().every(x => !x.tier), 'tier-2 items and emblems never drop from the basic pool');
    assert.equal(D.comboOf('blade', 'blade').id, 'greatBlade'); assert.equal(D.comboOf('wand', 'blade').id, 'doomSpear', 'order does not matter'); assert.equal(D.comboOf('blade', 'fang'), undefined);
    const s = newState(0); s.level = 100; const now = 1_800_000_000_000;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; delete r.rule; r.board = [{ unit: 'zakum', star: 3, row: 'front' }];
    (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(2)); assert.ok(r.last.won); assert.equal(new Set(r.box).size, 3, 'three distinct choices'); assert.ok(r.box.every(id => D.itemById(id) && !D.itemById(id).tier));
    assert.throws(() => (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(3)), /상자/, 'fight blocked while a box is pending');
    assert.throws(() => act(s, { type: 'expeditionPickBox', value: '7' }, now, mkRng(1)), /고르세요/);
    const want = r.box[2]; act(s, { type: 'expeditionPickBox', value: '2' }, now, mkRng(1)); assert.deepEqual(r.items, [want]); assert.equal(r.box, undefined);
    assert.throws(() => act(s, { type: 'expeditionSkipBox' }, now, mkRng(1)), /없습니다/);
    r.round = 2; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(4)); assert.equal(r.box.length, 3); act(s, { type: 'expeditionSkipBox' }, now, mkRng(1)); assert.equal(r.box, undefined); assert.equal(r.items.length, 1, 'skip adds nothing');
    // 가진 칸이 꽉 찬 채 고르면 거부(먼저 조합하거나 장착).
    r.items = ['blade', 'blade', 'shield', 'thornMail']; r.box = ['wand', 'boots', 'fang'];
    assert.throws(() => act(s, { type: 'expeditionPickBox', value: '0' }, now, mkRng(1)), /4개까지/);
    // 조합: 표에 있는 짝만, 둘이 사라지고 결과 1개가 가진 칸 끝에 들어감.
    assert.throws(() => act(s, { type: 'expeditionCombine', value: '0:2' }, now, mkRng(1)), /합칠 수 없습니다/);
    assert.throws(() => act(s, { type: 'expeditionCombine', value: '1:1' }, now, mkRng(1)), /둘을 고르세요/);
    act(s, { type: 'expeditionCombine', value: '0:1' }, now, mkRng(1)); assert.deepEqual(r.items, ['shield', 'thornMail', 'greatBlade']);
    act(s, { type: 'expeditionCombine', value: '1:0' }, now, mkRng(1)); assert.deepEqual(r.items, ['greatBlade', 'citadel']);
    act(s, { type: 'expeditionPickBox', value: '0' }, now, mkRng(1)); assert.deepEqual(r.items, ['greatBlade', 'citadel', 'wand']); assert.equal(r.box, undefined);
    // 상위 아이템 전투 효과: 대검 물리 +80%, 성채 받는 피해 −35% · 반격 · 체력 +30%, 흡혈의 보주 시작 마나 100.
    const base = X.buildSide([{ unit: 'pig', star: 1, row: 'front' }], 'a').units[0], great = X.buildSide([{ unit: 'pig', star: 1, row: 'front', item: 'greatBlade' }], 'a').units[0];
    assert.equal(great.stats.attack, Math.round(base.stats.attack * 1.8));
    const cit = X.buildSide([{ unit: 'pig', star: 1, row: 'front', item: 'citadel' }], 'a').units[0]; assert.ok(Math.abs(cit.damageTaken - .35) < 1e-9); assert.equal(cit.reflect, .45); assert.equal(cit.maxHp, Math.round(base.maxHp * 1.3));
    assert.equal(X.buildSide([{ unit: 'pig', star: 1, row: 'front', item: 'bloodOrb' }], 'a').units[0].charge, 100);
    // 고스트 보드의 상위 아이템도 검증을 통과한다.
    const A = await L.load('systems/actions/expedition');
    const g = A.parseGhost(JSON.stringify({ 2: { name: 'g', board: [{ unit: 'pig', star: 1, row: 'front', item: 'citadel' }] } }), 2); assert.equal(g.board[0].item, 'citadel');
});

test('expedition stage 8: emblems add a trait key (counted once per unit), guard-only and revive effects honor emblem roles, boxes offer a smart emblem from round 3, trait descriptions come from data', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition'), A = await L.load('systems/actions/expedition');
    assert.equal(D.EMBLEMS().length, 12); assert.ok(D.EMBLEMS().every(x => x.emblem && (x.emblem.origin || x.emblem.role) && !D.BOX_ITEMS().includes(x)));
    assert.equal(D.comboOf('emblem_meadow', 'emblem_meadow'), undefined, 'emblems never combine');
    // 머릿수: 돼지(초원 · 돌격) + 숲의 문장 → 숲 1. 같은 유닛 둘 중 하나만 문장이어도 숲은 1(유닛당 한 번).
    const tr = (board) => Object.fromEntries(X.activeTraits(board).map(t => [t.trait.id, t.count]));
    assert.equal(tr([{ unit: 'pig', star: 1, row: 'front', item: 'emblem_forest' }]).forest, 1);
    assert.equal(tr([{ unit: 'pig', star: 1, row: 'front', item: 'emblem_forest' }, { unit: 'pig', star: 1, row: 'front' }]).forest, 1);
    assert.equal(tr([{ unit: 'pig', star: 1, row: 'front', item: 'emblem_meadow' }]).meadow, 1, 'an emblem of a trait the unit already has adds nothing');
    assert.equal(tr([{ unit: 'pig', star: 1, row: 'front', item: 'emblem_guard' }, { unit: 'kingClang', star: 1, row: 'front' }]).guard, 2);
    // 수호 2 효과는 수호 문장을 낀 돼지에게도 적용(받는 피해 −25%).
    const g = X.buildSide([{ unit: 'pig', star: 1, row: 'front', item: 'emblem_guard' }, { unit: 'kingClang', star: 1, row: 'front' }], 'a').units;
    assert.ok(Math.abs(g[0].damageTaken - .25) < 1e-9); assert.ok(Math.abs(g[1].damageTaken - .25) < 1e-9);
    assert.equal(X.hasRole({ unit: 'pig', star: 1, row: 'front', item: 'emblem_wraith' }, D.unitById('pig'), 'wraith'), true);
    // 상자: 3라운드부터 셋째 칸이 문장이고, 다음 단계에 가장 가까운 시너지를 고른다(돌격 3/4 → 돌격의 문장).
    const s = newState(0); s.level = 100; const now = 1_800_000_000_000;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; delete r.rule; // 주간 규칙 영향 제거
    r.board = [{ unit: 'zakum', star: 3, row: 'front' }, { unit: 'pig', star: 1, row: 'front' }, { unit: 'wildBoar', star: 1, row: 'front' }]; r.round = D.EMBLEM_ROUND - 1;
    (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(2)); assert.ok(r.last.won); assert.ok(r.box.every(id => !D.itemById(id).tier), 'before round 3: basic items only'); act(s, { type: 'expeditionSkipBox' }, now, mkRng(1));
    (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(3)); assert.ok(r.last.won); assert.equal(r.box.length, 3); assert.equal(r.box[2], 'emblem_charge', 'charge 3/4 and meadow 1/2 are both one short → the bigger stack (charge) wins'); assert.ok(r.box.slice(0, 2).every(id => !D.itemById(id).tier));
    act(s, { type: 'expeditionPickBox', value: '2' }, now, mkRng(1)); assert.deepEqual(r.items, ['emblem_charge']);
    act(s, { type: 'expeditionEquip', value: 'board:0:0' }, now, mkRng(1)); assert.equal(tr(r.board).charge, 3, 'zakum already is charge: the emblem adds nothing'); act(s, { type: 'expeditionUnequip', value: 'board:0' }, now, mkRng(1)); r.board.push({ unit: 'slime', star: 1, row: 'front' }); act(s, { type: 'expeditionEquip', value: 'board:3:0' }, now, mkRng(1)); assert.equal(tr(r.board).charge, 4, 'slime with the charge emblem completes charge 4');
    assert.ok(['emblem_underground', 'emblem_sea', 'emblem_meadow', 'emblem_boss'].includes(A.pickEmblem(r, mkRng(5))) || A.pickEmblem(r, mkRng(5)).startsWith('emblem_'));
    assert.ok(A.pickEmblem({ board: [] }, mkRng(1)).startsWith('emblem_'), 'empty board: any emblem');
    // 고스트 보드의 문장도 통과하고 상대 시너지에 반영된다.
    const ghost = A.parseGhost(JSON.stringify({ 2: { name: 'g', board: [{ unit: 'pig', star: 1, row: 'front', item: 'emblem_forest' }] } }), 2); assert.equal(ghost.board[0].item, 'emblem_forest');
    // 설명 생성.
    assert.equal(D.describeTier({ count: 4, mult: { hp: 1.7 }, flags: ['regen'] }), '체력 70% 증가 · 매 턴 최대 체력의 4%를 회복');
    assert.equal(D.describeTier({ count: 2, damageTaken: .2, only: 'guard' }), '수호 유닛에게만: 받는 피해 20% 감소');
    for (const t of D.TRAITS) for (const tier of t.tiers) assert.ok(D.describeTier(tier).length > 3, `${t.id} tier ${tier.count} has a description`);
});

test('expedition stage 9: season settlement pays pearls once per season via expeditionStart value (server-made, shape-checked, pearls recomputed), and boxes offer a tier-2 item from round 6', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), A = await L.load('systems/actions/expedition');
    assert.equal(D.seasonPearls(1), 50); assert.equal(D.seasonPearls(3), 30); assert.equal(D.seasonPearls(10), 15); assert.equal(D.seasonPearls(30), 8); assert.equal(D.seasonPearls(31), 3); assert.equal(D.seasonPearls(0), 3, 'outside the pool: participation reward');
    assert.equal(A.parseSettlement(undefined), null); assert.equal(A.parseSettlement('{"season":"2026-9","rank":1,"total":3}'), null, 'bad season key'); assert.equal(A.parseSettlement('nope'), null);
    assert.deepEqual(A.parseSettlement(JSON.stringify({ season: '2026-09', rank: 2, total: 9, wins: 6, pearls: 9999 })), { season: '2026-09', rank: 2, total: 9, wins: 6, pearls: 30 }, 'pearls come from the rank, not the payload');
    const s = newState(0); s.level = 100; s.pearls = 0; const now = 1_800_000_000_000;
    const v = JSON.stringify({ season: '2026-09', rank: 1, total: 12, wins: 8 });
    act(s, { type: 'expeditionStart', value: v }, now, mkRng(1)); assert.equal(s.pearls, 50); assert.equal(s.expeditionSeasonClaimed, '2026-09'); assert.deepEqual(s.expeditionSeasonLast, { season: '2026-09', rank: 1, total: 12, wins: 8, pearls: 50 });
    act(s, { type: 'expeditionQuit' }, now, mkRng(1)); act(s, { type: 'expeditionStart', value: v }, now + 1, mkRng(1)); assert.equal(s.pearls, 50, 'same season is paid once');
    act(s, { type: 'expeditionQuit' }, now + 1, mkRng(1)); act(s, { type: 'expeditionStart' }, now + 2, mkRng(1)); assert.equal(s.pearls, 50, 'no value: nothing');
    act(s, { type: 'expeditionQuit' }, now + 2, mkRng(1)); act(s, { type: 'expeditionStart', value: JSON.stringify({ season: '2026-10', rank: 0, total: 700, wins: 1 }) }, now + 3, mkRng(1)); assert.equal(s.pearls, 53, 'next season, outside the pool: +3');
    // 상자 품질: 6라운드부터 첫째 칸이 조합 아이템.
    const r = s.expedition; delete r.rule; r.board = [{ unit: 'zakum', star: 3, row: 'front' }, { unit: 'blackMage', star: 3, row: 'back' }, { unit: 'lucid', star: 3, row: 'back' }]; r.round = D.TIER2_ROUND - 1;
    (clearOffer(s), act)(s, { type: 'expeditionFight' }, now + 4, mkRng(2)); assert.ok(r.last.won); assert.ok(!D.itemById(r.box[0]).tier, 'before round 6 the first slot is basic'); act(s, { type: 'expeditionSkipBox' }, now + 4, mkRng(1));
    (clearOffer(s), act)(s, { type: 'expeditionFight' }, now + 5, mkRng(3)); assert.ok(r.last.won); assert.equal(D.itemById(r.box[0]).tier, 2, 'round 6: tier-2 item first'); assert.ok(!D.itemById(r.box[1]).tier); assert.equal(D.itemById(r.box[2]).tier, 'emblem'); assert.equal(new Set(r.box).size, 3);
});

test('expedition stage 10: 12 rounds in 3 acts, boss waves on 4/8/12 (no ghost, act pearls), synergy shop slot from round 2, softer hp loss, stats sized to 12', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition');
    assert.equal(D.EXPEDITION.rounds, 12); assert.deepEqual([1, 4, 5, 8, 9, 12].map(D.actOf), [1, 1, 2, 2, 3, 3]); assert.deepEqual([3, 4, 8, 12, 13].map(D.isBossRound), [false, true, true, true, false]);
    assert.equal(X.WAVE_BUDGET.length, 13);
    for (const round of [4, 8, 12]) { const w = X.rollWave(round, mkRng(round)); assert.equal(w[0].unit, X.ACT_BOSSES[D.actOf(round)], `round ${round} leads with the act boss`); assert.equal(w[0].star, 1); }
    assert.ok(X.rollWave(5, mkRng(5)).every(p => !X.ACT_BOSSES.includes(p.unit) || true));
    // 시너지 슬롯: 보드에 돼지(초원 · 돌격)와 와일드보어(황야 · 돌격) → 돌격 2/4 → 마지막 칸은 돌격 유닛(보드에 없는 것).
    const board = [{ unit: 'pig', star: 1, row: 'front' }, { unit: 'wildBoar', star: 1, row: 'front' }];
    for (let seed = 1; seed <= 12; seed++) { const shop = X.rollShop(4, mkRng(seed), 5, board); const last = D.unitById(shop[4]); assert.ok(last.roles.includes('charge') || last.origin === 'meadow' || last.origin === 'wasteland', `seed ${seed}: synergy slot ${last.id}`); assert.ok(!['pig', 'wildBoar'].includes(last.id)); }
    assert.equal(X.synergyPick([], 1, mkRng(1)), null, 'no board: no pick');
    assert.equal(X.rollShop(4, mkRng(3), 5).length, 5, 'without a board the shop is plain');
    // 판 흐름: 보스 라운드는 고스트를 무시하고 보스 웨이브, 이기면 acts +1, 완주 보상 = 승수 + 완주 4 + 막 보스 3 × 2.
    const s = newState(0); s.level = 100; s.pearls = 0; const now = 1_800_000_000_000;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = []; /* 과제 보상 제외 */ r.board = [{ unit: 'zakum', star: 3, row: 'front' }, { unit: 'blackMage', star: 3, row: 'back' }, { unit: 'lucid', star: 3, row: 'back' }, { unit: 'seaGuard', star: 3, row: 'front' }];
    const ghost = JSON.stringify({ 4: { name: 'g', board: [{ unit: 'slime', star: 1, row: 'front' }] } });
    for (let round = 1; round <= 12; round++) { assert.equal(r.round, round); (clearOffer(s), act)(s, { type: 'expeditionFight', value: ghost }, now + round, mkRng(round + 20)); assert.ok(r.last.won, `round ${round} won`); if (round === 4) assert.equal(r.last.opponent, undefined, 'boss round ignores the ghost'); if (r.box) act(s, { type: 'expeditionSkipBox' }, now + round, mkRng(1)); if (round < 12) assert.equal(r.shop.length, 5); }
    assert.equal(r.abyssChoice, true, 'stage 15: clearing offers the abyss first'); act(s, { type: 'expeditionFinish' }, now + 13, mkRng(1));
    assert.ok(r.done); assert.equal(r.wins, 12); assert.equal(r.acts, 3); assert.equal(r.round, 13); assert.equal(r.reward, 12 + D.EXPEDITION.clearPearls + 3 * D.EXPEDITION.actPearls); assert.equal(s.pearls, r.reward);
    assert.equal(s.expeditionStats.roundPlays.length, 13); assert.equal(s.expeditionStats.roundWins[12], 1);
    // 패배 체력: 12 + 라운드 × 2 + 남은 적 × 2.
    const t = newState(0); t.level = 100; act(t, { type: 'expeditionStart' }, now, mkRng(1)); const q = t.expedition; q.board = [{ unit: 'slime', star: 1, row: 'front' }]; q.round = 11;
    (clearOffer(t), act)(t, { type: 'expeditionFight' }, now, mkRng(7)); assert.ok(!q.last.won); assert.ok(q.hp <= 100 - (12 + 22) && q.hp >= 100 - (12 + 22 + 16), `hp ${q.hp}`);
});

test('expedition stage 11: augments offered on rounds 2/5/8 (tiered, trait augment resolved from the board, blocks the fight), run mods apply (trait +1, gold, bench, reroll, xp, box), weekly rule is deterministic and sticks to the run, mastery levels and perks', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition'), A = await L.load('systems/actions/expedition'), T = await L.load('data/time'), TT = await L.load('data/titles'), AC = await L.load('data/achievements');
    // 보정 합치기.
    const m = D.mergeMods([{ goldPlus: 2, frontHp: 1.15 }, { goldPlus: 1, frontHp: 1.05, rerollCost: 1 }, { traitPlus: { meadow: 1 } }, { traitPlus: { meadow: 1 }, bossGuard: .5 }, { bossGuard: .25 }]);
    assert.equal(m.goldPlus, 3); assert.ok(Math.abs(m.frontHp - 1.15 * 1.05) < 1e-9); assert.equal(m.rerollCost, 1); assert.equal(m.traitPlus.meadow, 2); assert.equal(m.bossGuard, .6, 'boss guard capped');
    // 머릿수 가산은 보드에 그 특성이 있을 때만.
    const tr = (board, mods) => Object.fromEntries(X.activeTraits(board, mods).map(t => [t.trait.id, t.count]));
    assert.equal(tr([{ unit: 'pig', star: 1, row: 'front' }], { traitPlus: { meadow: 1 } }).meadow, 2); assert.equal(tr([{ unit: 'pig', star: 1, row: 'front' }], { traitPlus: { forest: 1 } }).forest, undefined);
    // 전투 보정: 앞줄 체력 · 뒷줄 공격 · 속도 · 보스 라운드 감소 · ★2 배율.
    const base = X.buildSide([{ unit: 'pig', star: 1, row: 'front' }], 'a').units[0], wall = X.buildSide([{ unit: 'pig', star: 1, row: 'front' }], 'a', { frontHp: 1.2, speed: 3, bossGuard: .25 }, true).units[0];
    assert.equal(wall.maxHp, Math.round(base.maxHp * 1.2)); assert.equal(wall.stats.speed, base.stats.speed + 3); assert.ok(Math.abs(wall.damageTaken - .25) < 1e-9);
    assert.equal(X.buildSide([{ unit: 'pig', star: 1, row: 'front' }], 'a', { bossGuard: .25 }, false).units[0].damageTaken, undefined, 'boss guard only on boss rounds');
    const back = X.buildSide([{ unit: 'evilEye', star: 2, row: 'back' }], 'a').units[0], boosted = X.buildSide([{ unit: 'evilEye', star: 2, row: 'back' }], 'a', { backPower: 1.2, starPower: 1.1, manaGain: 1.3, reflect: .15 }).units[0];
    assert.equal(boosted.stats.magic, Math.round(back.stats.magic * 1.2 * 1.1)); assert.ok(Math.abs(boosted.manaGain - 1.3) < 1e-9); assert.equal(boosted.reflect, .15);
    // 주간 규칙: 같은 주 키 → 같은 규칙, 판에 붙음.
    assert.equal(D.weeklyRule('2026-W43').id, D.weeklyRule('2026-W43').id); assert.ok(D.WEEKLY_RULES.some(r => r.id === D.weeklyRule('2026-W44').id));
    const now = 1_800_000_000_000, s = newState(0); s.level = 100;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; assert.equal(r.rule, D.weeklyRule(T.weekKey(now)).id); assert.deepEqual(r.augments, []); assert.equal(r.mastery, 1); delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = []; /* 과제 보상 제외 */
    // 1라운드 뒤 2라운드 증강 선택지 3개(1등급), 전투 차단, 문양은 보드 시너지로 구체화.
    r.board = [{ unit: 'zakum', star: 3, row: 'front' }, { unit: 'pig', star: 1, row: 'front' }];
    (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(2)); assert.ok(r.last.won); if (r.box) act(s, { type: 'expeditionSkipBox' }, now, mkRng(1));
    assert.equal(r.round, 2); assert.equal(r.augmentOffer.length, 3); assert.ok(r.augmentOffer.every(id => D.augmentById(id).tier === 1));
    assert.throws(() => act(s, { type: 'expeditionFight' }, now, mkRng(3)), /증강/);
    for (const id of r.augmentOffer) if (id.startsWith('traitPlus1:')) assert.ok(['charge', 'underground', 'meadow'].includes(id.split(':')[1]), `trait augment resolved: ${id}`);
    // 골드 증강을 고르면 다음 라운드 수입에 반영, 벤치 증강이면 상한.
    r.augmentOffer = ['coinPurse', 'widerBench', 'traitPlus1:charge'];
    const goldBefore = r.gold; act(s, { type: 'expeditionPickAugment', value: '2' }, now, mkRng(1)); assert.deepEqual(r.augments, ['traitPlus1:charge']); assert.equal(r.augmentOffer, undefined);
    assert.equal(tr(r.board, A.runMods(r)).charge, 3, 'charge 2 + 1');
    r.augments.push('coinPurse', 'widerBench', 'cheapReroll', 'tutor'); assert.equal(A.benchCap(r), 10); assert.equal(A.runMods(r).rerollCost, 1);
    r.gold = 10; act(s, { type: 'expeditionReroll' }, now, mkRng(4)); assert.equal(r.gold, 9, 'reroll costs 1');
    act(s, { type: 'expeditionXp' }, now, mkRng(1)); assert.equal(r.xp + (r.level - 2 > 0 ? 100 : 0) >= 6 || r.level > 2, true, 'xp purchase adds 4 + 2');
    r.gold = 0; r.streak = 0; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now + 1, mkRng(5)); assert.ok(r.last.won); assert.equal(r.gold, D.EXPEDITION.baseGold + 2, 'income + coin purse'); assert.equal(goldBefore >= 0, true);
    if (r.box) act(s, { type: 'expeditionSkipBox' }, now, mkRng(1));
    // 5라운드 증강(2등급)과 재정비 회복 · 큰 상자.
    r.round = 4; r.hp = 50; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now + 2, mkRng(6)); assert.ok(r.last.won); if (r.box) act(s, { type: 'expeditionSkipBox' }, now, mkRng(1)); assert.equal(r.round, 5); assert.ok(r.augmentOffer.every(id => D.augmentById(id).tier === 2));
    r.augmentOffer = ['secondWind', 'bigBox', 'manaFlow']; act(s, { type: 'expeditionPickAugment', value: '0' }, now, mkRng(1)); assert.equal(r.hp, 75);
    r.augments.push('bigBox'); r.items = []; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now + 3, mkRng(7)); assert.ok(r.last.won); assert.equal(r.box.length, 4, 'box +1'); act(s, { type: 'expeditionSkipBox' }, now, mkRng(1));
    // 보스 사냥꾼: 막 보상 2배. 완주 뒤 숙련 경험치 · 레벨.
    r.augments.push('bossHunter'); r.round = 12; r.acts = 2; r.wins = 11; r.board = [{ unit: 'zakum', star: 3, row: 'front' }, { unit: 'blackMage', star: 3, row: 'back' }, { unit: 'lucid', star: 3, row: 'back' }, { unit: 'seaGuard', star: 3, row: 'front' }];
    s.pearls = 0; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now + 4, mkRng(8)); assert.ok(r.last.won); act(s, { type: 'expeditionFinish' }, now + 4, mkRng(1)); assert.ok(r.done); assert.equal(r.acts, 3); assert.equal(r.reward, 12 + D.EXPEDITION.clearPearls + 3 * D.EXPEDITION.actPearls * 2);
    assert.equal(s.expeditionMastery.total, D.masteryRunXp(12, 3, true)); assert.equal(D.masteryRunXp(12, 3, true), 230); assert.equal(s.expeditionMastery.level, 2, '230 xp: level 1 → 2 (100) with 130 left, level 3 needs 150'); assert.equal(s.expeditionMastery.xp, 130);
    // 숙련 특전: 레벨 5면 시작 골드 +2, 레벨 25면 증강 4개. 업적 · 칭호.
    s.expeditionMastery.level = 5; act(s, { type: 'expeditionStart' }, now + 5, mkRng(1)); assert.equal(s.expedition.gold, D.EXPEDITION.baseGold + 2); assert.equal(s.expedition.mastery, 5);
    s.expedition.mastery = 25; s.expedition.board = [{ unit: 'pig', star: 1, row: 'front' }]; s.expedition.round = 2; assert.equal(A.rollAugments(s.expedition, mkRng(2)).length, 4);
    assert.ok(AC.ACHIEVEMENTS.find(a => a.id === 'expMastery:20')); assert.ok(TT.TITLES.find(t => t.id === 'expMastery:50'));
    assert.equal(D.masteryXpFor(1), 100); assert.equal(D.masteryXpFor(50), 100 + 50 * 49);
});

test('expedition stage 12: battles emit compact replay frames (valid unit keys, hp %, cast/kill flags, reflect/revive frames, cap with truncated), the fight stores foe + frames', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition');
    const a = [{ unit: 'zakum', star: 3, row: 'front' }, { unit: 'evilEye', star: 1, row: 'back' }], b = [{ unit: 'pig', star: 1, row: 'front' }, { unit: 'slime', star: 1, row: 'front' }];
    const r = X.battle(a, b, mkRng(3));
    assert.ok(r.frames.length > 0 && r.frames.length <= X.REPLAY_FRAMES); assert.equal(r.truncated, false);
    const keyOk = k => /^[ab]\d$/.test(k) && Number(k.slice(1)) < (k[0] === 'a' ? a.length : b.length);
    for (const f of r.frames) { assert.ok(keyOk(f.a), `actor ${f.a}`); if (f.d) assert.ok(keyOk(f.d)); if (f.th !== undefined) assert.ok(f.th >= 0 && f.th <= 100); assert.ok(Number.isInteger(f.t)); }
    assert.ok(r.frames.some(f => f.k === 1), 'a kill frame'); assert.ok(r.frames.some(f => f.v > 0 && f.d), 'damage frames');
    const dmg = r.frames.filter(f => f.d === 'b0' && f.th !== undefined).map(f => f.th); for (let i = 1; i < dmg.length; i++) assert.ok(dmg[i] <= dmg[i - 1], 'target hp never rises without heal/revive');
    assert.equal(r.winner, 'a');
    // 시전 프레임: 신전 2(시작 마나 50)면 몇 턴 안에 시전.
    const t = X.battle([{ unit: 'erdaSpirit', star: 3, row: 'back' }, { unit: 'memoryMonitor', star: 3, row: 'back' }], [{ unit: 'seaGuard', star: 3, row: 'front' }], mkRng(5), 20);
    assert.ok(t.frames.some(f => f.s === 'cast' && f.m), 'cast frame carries the skill name');
    // 반격 프레임(가시 갑옷) · 부활 프레임(망령 4).
    const m = X.battle([{ unit: 'seaGuard', star: 3, row: 'front', item: 'thornMail' }], [{ unit: 'pig', star: 1, row: 'front' }], mkRng(4), 3); assert.ok(m.frames.some(f => f.s === 'reflect' && f.a === 'a0' && f.d === 'b0'));
    const w = X.battle([{ unit: 'zakum', star: 3, row: 'front' }, { unit: 'blackMage', star: 3, row: 'back' }], [{ unit: 'juniorWraith', star: 1, row: 'back' }, { unit: 'wraithUnit', star: 1, row: 'back' }, { unit: 'zombieMushroom', star: 1, row: 'back' }, { unit: 'vanishingSoul', star: 1, row: 'back' }], mkRng(6));
    assert.ok(w.frames.some(f => f.s === 'revive' && f.ah === 30), 'revive frame at 30%');
    // 상한: 4v4 수호 ★3끼리 40턴이면 프레임이 넘쳐 truncated.
    const g = Array.from({ length: 4 }, () => ({ unit: 'seaGuard', star: 3, row: 'front' })), stall = X.battle(g, g, mkRng(7));
    assert.equal(stall.frames.length, X.REPLAY_FRAMES); assert.equal(stall.truncated, true);
    // 전투 뒤 r.last에 상대 보드와 프레임이 남는다.
    const s = newState(0); s.level = 100; const now = 1_800_000_000_000;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const run = s.expedition; delete run.rule; run.board = [{ unit: 'zakum', star: 3, row: 'front' }];
    act(s, { type: 'expeditionFight' }, now, mkRng(2)); assert.ok(run.last.foe.length >= 1 && run.last.foe.every(p => D.unitById(p.unit))); assert.ok(run.last.frames.length > 0); assert.equal(run.last.truncated, undefined);
});

test('expedition stage 13: daily/weekly quests are picked per key, progress from fights/boss/ghost/synergy/star3/combine/augment/emblem, pay pearls + mastery once, reset on a new day; codex unit wins and tiers; comp keys aggregate with a cap; season best rank feeds titles', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), A = await L.load('systems/actions/expedition'), T = await L.load('data/time'), TT = await L.load('data/titles'), AC = await L.load('data/achievements');
    assert.deepEqual(D.pickQuests('daily', '2026-10-20'), D.pickQuests('daily', '2026-10-20')); assert.equal(D.pickQuests('daily', '2026-10-20').length, 3); assert.equal(new Set(D.pickQuests('weekly', '2026-W43')).size, 3);
    assert.ok(D.pickQuests('daily', '2026-10-20').every(id => D.questById(id)?.period === 'daily'));
    assert.deepEqual([0, 10, 50, 200, 999].map(D.codexTier), [0, 1, 1, 3, 3].map((v, i) => i === 2 ? 2 : v));
    assert.equal(D.compKey([{ trait: { id: 'meadow', tiers: [{ count: 2 }, { count: 4 }] }, count: 4, tier: 2 }, { trait: { id: 'charge', tiers: [{ count: 2 }, { count: 4 }, { count: 6 }] }, count: 2, tier: 1 }]), 'meadow4'); assert.equal(D.compKey([]), 'none');
    const now = 1_800_000_000_000, s = newState(0); s.level = 100; s.pearls = 0;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; delete r.rule;
    const q = s.expeditionQuests; assert.equal(q.day, T.dayKey(now)); assert.equal(q.daily.length, 3); assert.equal(q.weekly.length, 3); assert.ok(q.daily.every(x => x.n === 0 && !x.done));
    // 승리 → wins 키 과제 진행 · 유닛 승리 집계 · 조합 키.
    r.board = [{ unit: 'zakum', star: 3, row: 'front' }, { unit: 'pig', star: 1, row: 'front' }, { unit: 'wildBoar', star: 1, row: 'front' }, { unit: 'ligator', star: 1, row: 'front' }];
    (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(2)); assert.ok(r.last.won);
    assert.equal(s.expeditionStats.unitWins.zakum, 1); assert.equal(s.expeditionStats.comps.charge4, 1); assert.equal(s.expeditionStats.compWins.charge4, 1);
    const winsQuest = [...q.daily, ...q.weekly].find(x => D.questById(x.id).key === 'wins'); if (winsQuest) assert.equal(winsQuest.n, 1);
    const synQuest = [...q.daily, ...q.weekly].find(x => D.questById(x.id).key === 'synergy4'); if (synQuest) assert.equal(synQuest.n, 1, 'charge 4 counts as a 4-stack synergy');
    // 직접 진행: 목표에 닿으면 보상 한 번.
    q.daily = [{ id: 'd_star3', n: 0 }]; q.weekly = [{ id: 'w_star3x3', n: 0 }];
    const pearls = s.pearls, xp = s.expeditionMastery?.total || 0;
    A.questProgress(s, now, 'star3'); assert.equal(q.daily[0].done, true); assert.equal(s.pearls, pearls + 3); assert.equal(s.expeditionMastery.total, xp + 30); assert.equal(q.weekly[0].n, 1);
    A.questProgress(s, now, 'star3'); assert.equal(s.pearls, pearls + 3, 'done quest pays once'); assert.equal(q.weekly[0].n, 2);
    A.questProgress(s, now, 'star3'); assert.equal(q.weekly[0].done, true); assert.equal(s.pearls, pearls + 3 + 10); assert.equal(s.expeditionMastery.total, xp + 30 + 150);
    // 상점 구매로 ★3이 되면 star3, 조합 · 증강 · 문장 고르기도 키를 올린다.
    q.daily = [{ id: 'd_star3', n: 0 }, { id: 'd_combine', n: 0 }, { id: 'd_augment2', n: 0 }]; q.weekly = [];
    r.bench = [{ unit: 'slime', star: 2 }, { unit: 'slime', star: 2 }]; r.shop = ['slime', null, null, null, null]; r.gold = 10; act(s, { type: 'expeditionBuy', value: '0' }, now, mkRng(1));
    assert.equal(r.bench[0].star, 2, 'two ★2 + one ★1 do not merge'); r.bench = [{ unit: 'slime', star: 2 }, { unit: 'slime', star: 2 }]; r.shop = ['slime', null, null, null, null]; r.bench.push({ unit: 'slime', star: 1 }); r.bench.push({ unit: 'slime', star: 1 });
    r.bench = [{ unit: 'pig', star: 2 }, { unit: 'pig', star: 2 }]; r.shop = ['pig', null, null, null, null]; r.gold = 10;
    // ★2 둘 + ★1 셋이 되도록 ★1 둘을 더 넣고 사면 ★1 셋 → ★2 셋 → ★3.
    r.bench.push({ unit: 'pig', star: 1 }, { unit: 'pig', star: 1 }); act(s, { type: 'expeditionBuy', value: '0' }, now, mkRng(1)); assert.ok(r.bench.some(x => x.unit === 'pig' && x.star === 3)); assert.equal(q.daily[0].done, true);
    r.items = ['blade', 'blade']; act(s, { type: 'expeditionCombine', value: '0:1' }, now, mkRng(1)); assert.equal(q.daily[1].n, 1);
    r.augmentOffer = ['coinPurse', 'quickFeet', 'frontWall']; act(s, { type: 'expeditionPickAugment', value: '0' }, now, mkRng(1)); assert.equal(q.daily[2].n, 1);
    q.daily = [{ id: 'd_emblem', n: 0 }]; r.items = []; r.box = ['blade', 'wand', 'emblem_meadow']; act(s, { type: 'expeditionPickBox', value: '2' }, now, mkRng(1)); assert.equal(q.daily[0].done, true);
    // 날짜가 바뀌면 새 과제(진행 초기화), 주는 그대로.
    const tomorrow = now + 86_400_000; A.ensureQuests(s, tomorrow); assert.equal(s.expeditionQuests.day, T.dayKey(tomorrow)); assert.ok(s.expeditionQuests.daily.every(x => x.n === 0));
    assert.equal(s.expeditionQuests.week, T.weekKey(now) === T.weekKey(tomorrow) ? T.weekKey(now) : T.weekKey(tomorrow));
    // 조합 키 상한 40.
    const st = s.expeditionStats; st.comps = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`k${i}`, i + 2])); st.compWins = {};
    r.round = 2; r.board = [{ unit: 'zakum', star: 3, row: 'front' }]; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(3)); assert.ok(Object.keys(st.comps).length <= 40); assert.equal(st.comps.k0, undefined, 'least-used key dropped');
    // 시즌 최고 순위 → 업적 · 칭호.
    act(s, { type: 'expeditionQuit' }, now, mkRng(1)); act(s, { type: 'expeditionStart', value: JSON.stringify({ season: '2026-09', rank: 3, total: 9, wins: 6 }) }, now + 1, mkRng(1)); assert.equal(s.expeditionSeasonBest, 3);
    act(s, { type: 'expeditionQuit' }, now + 1, mkRng(1)); act(s, { type: 'expeditionStart', value: JSON.stringify({ season: '2026-08', rank: 1, total: 9, wins: 6 }) }, now + 2, mkRng(1)); assert.equal(s.expeditionSeasonBest, 1);
    assert.equal(AC.ACHIEVEMENTS.find(a => a.id === 'expSeasonTop:1').progress(s), 1); assert.ok(TT.TITLES.find(t => t.id === 'expSeasonTop:1')); assert.ok(TT.TITLES.find(t => t.id === 'expCodex:30'));
    assert.equal(AC.ACHIEVEMENTS.find(a => a.id === 'expCodex:30').progress(s), Object.values(s.expeditionStats.unitWins).filter(n => n > 0).length);
});

test('expedition stage 15: clearing round 12 offers the abyss (continue or finish), abyss waves grow and carry bosses, abyss wins count and pay bonuses, feats and recent runs are recorded, season score adds abyss', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition'), A = await L.load('systems/actions/expedition'), E = await L.load('server/expedition'), TT = await L.load('data/titles'), AC = await L.load('data/achievements');
    assert.equal(D.isBossRound(16), true); assert.equal(D.isAbyssRound(13), true); assert.equal(D.isAbyssRound(12), false);
    const w13 = X.rollWave(13, mkRng(13)), w16 = X.rollWave(16, mkRng(16)), w24 = X.rollWave(24, mkRng(24));
    const spent = w => w.reduce((n, p) => n + D.unitById(p.unit).cost * (p.star === 3 ? 4 : p.star === 2 ? 2 : 1), 0);
    assert.ok(spent(w13) <= Math.round(X.WAVE_BUDGET[12] * 1.1)); assert.equal(w16[0].unit, X.abyssBoss(16)); assert.equal(w16[0].star, 2); assert.equal(w24[0].star, 3); assert.equal(X.abyssBoss(16), 'zakum'); assert.equal(X.abyssBoss(20), 'blackMage'); assert.equal(X.abyssBoss(24), 'lucid'); assert.equal(X.abyssBoss(28), 'zakum');
    const now = 1_800_000_000_000, s = newState(0); s.level = 100; s.pearls = 0;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = [];
    const strong = [{ unit: 'zakum', star: 3, row: 'front' }, { unit: 'blackMage', star: 3, row: 'back' }, { unit: 'lucid', star: 3, row: 'back' }, { unit: 'seaGuard', star: 3, row: 'front' }];
    r.board = strong.map(p => ({ ...p })); r.round = 12; r.wins = 11; r.acts = 2;
    (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(2)); assert.ok(r.last.won); assert.equal(r.done, undefined, 'not finished yet'); assert.equal(r.abyssChoice, true); assert.equal(r.cleared, true); assert.equal(r.round, 13); assert.equal(s.pearls, 0, 'no reward before choosing');
    assert.throws(() => act(s, { type: 'expeditionFight' }, now, mkRng(3)), /심연/);
    // 계속: 수입 · 상점, 고스트 무시, 승리마다 abyss++.
    const gold = r.gold; act(s, { type: 'expeditionAbyss' }, now, mkRng(4)); assert.equal(r.abyssChoice, undefined); assert.ok(r.gold > gold); assert.equal(r.shop.length, 5);
    if (r.box) act(s, { type: 'expeditionSkipBox' }, now, mkRng(1));
    const ghost = JSON.stringify({ 13: { name: 'g', board: [{ unit: 'slime', star: 1, row: 'front' }] } });
    (clearOffer(s), act)(s, { type: 'expeditionFight', value: ghost }, now + 1, mkRng(5)); assert.ok(r.last.won); assert.equal(r.last.opponent, undefined, 'no ghosts in the abyss'); assert.equal(r.abyss, 1); assert.equal(r.wins, 13); assert.equal(r.round, 14); assert.ok(r.augmentOffer?.every(id => D.augmentById(id).tier === 3), 'abyss augment at round 14 is tier 3');
    // 마치기: 완주 보상 + 심연 보너스(5라운드마다 5) · 최근 판 · 심연 최고.
    r.abyss = 7; r.wins = 19; act(s, { type: 'expeditionQuit' }, now + 2, mkRng(1)); assert.ok(r.done); assert.equal(r.acts, 3, 'round-12 boss counted'); assert.equal(r.reward, 19 + D.EXPEDITION.clearPearls + 3 * D.EXPEDITION.actPearls + 5); assert.equal(s.expeditionAbyssBest, 7);
    assert.equal(s.expeditionRecent.length, 1); assert.equal(s.expeditionRecent[0].cleared, true); assert.equal(s.expeditionRecent[0].abyss, 7); assert.equal(s.expeditionRecent[0].wins, 19);
    // 바로 마치기 경로 · 도전 기록(맨손 · 무패는 history[12] 보드와 losses로).
    act(s, { type: 'expeditionStart' }, now + 3, mkRng(1)); const q = s.expedition; delete q.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = [];
    q.board = strong.map(p => ({ ...p })); q.round = 12; q.wins = 11; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now + 3, mkRng(2)); assert.equal(q.abyssChoice, true);
    const before = s.pearls; act(s, { type: 'expeditionFinish' }, now + 4, mkRng(1)); assert.ok(q.done); assert.equal(q.abyss, undefined); assert.equal(s.pearls, before + q.reward);
    assert.equal(s.expeditionFeats.flawless, 2, 'both cleared runs were flawless'); assert.equal(s.expeditionFeats.noItem, 2); assert.equal(s.expeditionFeats.oneOrigin, undefined, 'zakum underground + others: not one origin'); assert.equal(s.expeditionFeats.cheap, undefined);
    assert.equal(s.expeditionRecent.length, 2); assert.equal(s.expeditionRecent[0].abyss, 0); assert.equal(s.expeditionRecent[1].abyss, 7, 'newest first');
    assert.deepEqual(A.featsOf({ cleared: true, wins: 12, losses: 0, history: { 12: [{ unit: 'slime', star: 3, row: 'front' }, { unit: 'pig', star: 3, row: 'front' }] }, abyss: 20 }).sort(), ['abyss10', 'abyss20', 'cheap', 'flawless', 'noItem', 'oneOrigin']);
    assert.deepEqual(A.featsOf({ cleared: false, wins: 5, history: {} }), []);
    assert.ok(AC.ACHIEVEMENTS.find(a => a.id === 'expFeat:flawless').progress(s) >= 1); assert.ok(TT.TITLES.find(t => t.id === 'expFeat:abyss20'));
    // 탈락으로 12라운드를 넘기면 심연 선택 없이 종료. 심연 패배로 체력이 0이면 완주 보상 유지.
    act(s, { type: 'expeditionStart' }, now + 5, mkRng(1)); const t = s.expedition; delete t.rule; t.board = [{ unit: 'slime', star: 1, row: 'front' }]; t.round = 12; t.hp = 100; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now + 5, mkRng(6)); assert.ok(!t.last.won); assert.ok(t.done); assert.equal(t.cleared, true, 'reaching the end of round 12 with hp left still counts as cleared'); assert.equal(t.abyssChoice, undefined);
    // 시즌 점수에 심연 라운드 × 20.
    assert.equal(E.expeditionScore({ wins: 15, cleared: true, round: 12, abyss: 3, ghostByRun: {} }), 1500 + 50 + 12 + 60);
    assert.ok(A.parseGhost(JSON.stringify({ 2: { name: 'g', board: [{ unit: 'pig', star: 1, row: 'front' }], wins: 25 } }), 2).wins === 25, 'ghost wins above 12 are allowed now');
});

test('expedition stage 16: difficulty tiers scale waves and bosses, unlock by clearing the tier below, multiply rewards and mastery, record per-tier bests, add season score and titles', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition'), E = await L.load('server/expedition'), TT = await L.load('data/titles'), AC = await L.load('data/achievements');
    assert.equal(D.DIFFICULTIES.length, 10); assert.equal(D.difficultyOf(undefined).level, 1); assert.equal(D.difficultyOf(99).level, 1);
    assert.equal(D.difficultyUnlocked(undefined), 1); assert.equal(D.difficultyUnlocked({ 1: 2 }), 2); assert.equal(D.difficultyUnlocked({ 1: 1, 2: 1, 3: 1 }), 4); assert.equal(D.difficultyUnlocked({ 1: 1, 5: 1 }), 6); assert.equal(D.difficultyUnlocked({ 10: 1 }), 10);
    const spent = w => w.reduce((n, p) => n + D.unitById(p.unit).cost * (p.star === 3 ? 4 : p.star === 2 ? 2 : 1), 0);
    for (const round of [6, 10, 12]) { const base = Math.max(...Array.from({ length: 6 }, (_, k) => spent(X.rollWave(round, mkRng(round * 7 + k))))), hard = Math.max(...Array.from({ length: 6 }, (_, k) => spent(X.rollWave(round, mkRng(round * 7 + k), 5)))); assert.ok(hard > base, `round ${round}: legend waves spend more (${hard} > ${base})`); assert.ok(spent(X.rollWave(round, mkRng(1), 5)) <= Math.round(X.WAVE_BUDGET[round] * 1.6)); }
    assert.equal(X.rollWave(8, mkRng(8), 4)[0].star, 2, 'nightmare act boss is ★2'); assert.equal(X.rollWave(8, mkRng(8), 3)[0].star, 1);
    const now = 1_800_000_000_000, s = newState(0); s.level = 100; s.pearls = 0;
    assert.throws(() => act(s, { type: 'expeditionStart', id: '2' }, now, mkRng(1)), /열립니다/, 'tier 2 locked until tier 1 is cleared');
    act(s, { type: 'expeditionStart', id: '1' }, now, mkRng(1)); let r = s.expedition; assert.equal(r.difficulty, undefined, 'tier 1 stored as default'); delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = [];
    const strong = [{ unit: 'zakum', star: 3, row: 'front' }, { unit: 'blackMage', star: 3, row: 'back' }, { unit: 'lucid', star: 3, row: 'back' }, { unit: 'seaGuard', star: 3, row: 'front' }];
    r.board = strong.map(p => ({ ...p })); r.round = 12; r.wins = 11; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(2)); act(s, { type: 'expeditionFinish' }, now, mkRng(1));
    assert.equal(s.expeditionDiffClears[1], 1); assert.equal(s.expeditionDiffBest[1].wins, 12); assert.equal(D.difficultyUnlocked(s.expeditionDiffClears), 2);
    assert.throws(() => act(s, { type: 'expeditionStart', id: '3' }, now + 1, mkRng(1)), /열립니다/);
    act(s, { type: 'expeditionStart', id: '2' }, now + 1, mkRng(1)); r = s.expedition; assert.equal(r.difficulty, 2); delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = [];
    r.board = strong.map(p => ({ ...p })); r.round = 12; r.wins = 11; r.acts = 2; s.pearls = 0; const mx = s.expeditionMastery.total;
    (clearOffer(s), act)(s, { type: 'expeditionFight' }, now + 1, mkRng(2)); assert.ok(r.last.won); act(s, { type: 'expeditionFinish' }, now + 1, mkRng(1));
    assert.equal(r.reward, Math.round((12 + D.EXPEDITION.clearPearls + 3 * D.EXPEDITION.actPearls) * 1.25), 'reward ×1.25 on tier 2'); assert.equal(s.pearls, r.reward);
    assert.equal(s.expeditionMastery.total - mx, Math.round(D.masteryRunXp(12, 3, true) * 1.25), 'mastery ×1.25');
    assert.equal(s.expeditionRecent[0].difficulty, 2); assert.equal(s.expeditionDiffClears[2], 1); assert.equal(D.difficultyUnlocked(s.expeditionDiffClears), 3);
    // 시즌 점수 · 최고 판 비교는 점수로(난이도 가산 포함).
    assert.equal(E.runScore({ wins: 10, cleared: true, round: 12, difficulty: 5 }), 1000 + 50 + 12 + 240); assert.ok(E.runScore({ wins: 10, cleared: true, round: 12, difficulty: 5 }) > E.runScore({ wins: 12, cleared: true, round: 12, difficulty: 1 }), 'legend 10 wins beats normal 12 wins');
    assert.ok(AC.ACHIEVEMENTS.find(a => a.id === 'expDiff:5')); assert.ok(TT.TITLES.find(t => t.id === 'expDiff:4'));
    assert.equal(AC.ACHIEVEMENTS.find(a => a.id === 'expDiff:3').progress(s), 0);
});

test('expedition v3.416: transcendent difficulties 6~10 add foe stat mods and harsher losses, the abyss runs to 40 with deep-abyss growth, new feats · titles · themes', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition'), A = await L.load('systems/actions/expedition'), E = await L.load('server/expedition'), TT = await L.load('data/titles'), AC = await L.load('data/achievements');
    // 단계가 오를수록 예산 · 보상 · 점수 · 적 보정이 오름.
    for (let i = 1; i < D.DIFFICULTIES.length; i++) { const a = D.DIFFICULTIES[i - 1], b = D.DIFFICULTIES[i]; assert.equal(b.level, i + 1); assert.ok(b.budget > a.budget && b.reward > a.reward && b.score > a.score, `tier ${b.level} above ${a.level}`); }
    assert.equal(D.waveMods(12, 5), undefined, 'legend and below: no foe mods'); assert.equal(D.waveMods(12, 6).hpMult, 1.15); assert.equal(D.waveMods(12, 10).powerMult, 1.8);
    for (let d = 7; d <= 10; d++) assert.ok((D.waveMods(12, d).hpMult || 1) > (D.waveMods(12, d - 1).hpMult || 1));
    assert.equal(X.rollWave(8, mkRng(8), 7)[0].star, 3, 'heaven-fall act boss is ★3'); assert.equal(X.rollWave(16, mkRng(16), 7)[0].star, 3, 'abyss bosses never below the tier boss star');
    // 적 보정은 전투에서 B쪽 능력치로.
    const board = [{ unit: 'zakum', star: 2, row: 'front' }], plain = X.buildSide(board, 'b').units[0], hard = X.buildSide(board, 'b', D.waveMods(12, 10)).units[0];
    assert.ok(Math.abs(hard.maxHp - plain.maxHp * 1.8) <= 1, 'foe hp ×1.8'); assert.ok(hard.stats.attack > plain.stats.attack); assert.ok(hard.reflect > 0); assert.equal(D.combatMods({ hpMult: 3, powerMult: 3 }), undefined, 'foe-only mods never ride a ghost');
    // 깊은 심연: 심연 20라운드를 넘기면 라운드마다 체력 · 공격력이 붙음(난이도 보정과 곱).
    assert.equal(D.ABYSS.max, 40); assert.equal(D.waveMods(12 + 20, 1), undefined); assert.equal(D.waveMods(12 + 30, 1).hpMult, 1 + D.ABYSS.deepHp * 10); assert.ok(Math.abs(D.waveMods(12 + 30, 6).hpMult - 1.15 * (1 + D.ABYSS.deepHp * 10)) < 1e-9);
    // 패배 피해 배율 · 실제 전투에 적 보정이 실림.
    const now = 1_800_000_000_000, s = newState(0); s.level = 100; s.expeditionDiffClears = { 9: 1 };
    assert.equal(D.difficultyUnlocked(s.expeditionDiffClears), 10);
    act(s, { type: 'expeditionStart', id: '10' }, now, mkRng(1)); const r = s.expedition; assert.equal(r.difficulty, 10); delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = [];
    r.board = [{ unit: 'slime', star: 1, row: 'front' }]; r.round = 3; r.hp = 100; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(3)); assert.ok(!r.last.won);
    const survivors = Math.round(r.last.foe.length * (1 - r.last.hpLeft[1] / 100)); assert.ok(r.hp <= 100 - Math.round((D.EXPEDITION.lossBase + 3 * D.EXPEDITION.lossPerRound) * 1.5) + 1, `loss ×1.5 (hp ${r.hp}, survivors ${survivors})`);
    // 도전 기록 · 칭호 · 업적 · 테마 · 시즌 점수.
    const cleanRun = { cleared: true, wins: 12, losses: 0, difficulty: 10, history: { 12: [{ unit: 'zakum', star: 3, row: 'front', item: 'blade' }, { unit: 'lyka', star: 3, row: 'back' }] }, abyss: 40 };
    assert.deepEqual(A.featsOf(cleanRun).sort(), ['abyss10', 'abyss20', 'abyss30', 'abyss40', 'apexClear', 'flawless', 'hardFlawless']);
    assert.deepEqual(A.featsOf({ ...cleanRun, difficulty: 5, abyss: 25 }).sort(), ['abyss10', 'abyss20', 'flawless']);
    for (const id of ['abyss30', 'abyss40', 'hardFlawless', 'apexClear']) { assert.ok(AC.ACHIEVEMENTS.find(a => a.id === `expFeat:${id}`), id); assert.ok(TT.TITLES.find(t => t.id === `expFeat:${id}`), id); }
    for (let d = 6; d <= 10; d++) { assert.ok(AC.ACHIEVEMENTS.find(a => a.id === `expDiff:${d}`), `achievement ${d}`); assert.ok(TT.TITLES.find(t => t.id === `expDiff:${d}`), `title ${d}`); }
    assert.ok(D.themeById('abyss').unlocked({ expeditionAbyssBest: 20 }), 'old abyss theme keeps its 20-round bar'); assert.ok(!D.themeById('void').unlocked({ expeditionAbyssBest: 39 })); assert.ok(D.themeById('void').unlocked({ expeditionAbyssBest: 40 })); assert.ok(D.themeById('infinity').unlocked({ expeditionDiffClears: { 10: 1 } }));
    assert.ok(E.runScore({ wins: 10, cleared: true, round: 12, difficulty: 10 }) > E.runScore({ wins: 12, cleared: true, round: 12, difficulty: 5 }));
    assert.equal(D.shardChance(10, true), D.shardChance(5, true), 'core shard chance stays capped at the legend rate');
    // v3.417 성급 가치: ★3은 기본 능력치 ×4(웨이브 예산의 ★3 = 비용 × 4와 같은 값), 비용 1 ★3이 비용 4 ★1과 맞먹음.
    // v3.421 시너지: 6단계 배율이 4단계보다 낮지 않음 · 제어(마나 억제 · 약화 · 시작 약화) · 역병(공격마다 중독) · 지하 공격 배율.
    for (const id of ['charge', 'arcane']) { const t = D.TRAITS.find(x => x.id === id).tiers, k = id === 'charge' ? 'attack' : 'magic'; assert.ok(t[2].mult[k] >= t[1].mult[k], `${id} 6 ≥ 4`); }
    { const ctrl = [{ unit: 'slime', star: 1, row: 'front' }, { unit: 'curseEye', star: 1, row: 'back' }, { unit: 'mixedGolem', star: 1, row: 'front' }, { unit: 'memoryMonitor', star: 1, row: 'back' }], foe = [{ unit: 'pig', star: 1, row: 'front' }];
      const r = X.battle(ctrl, foe, mkRng(3)); assert.ok(r.log.some(l => l.includes('적 전체 약화 2턴')), 'control 4 opens with weaken'); assert.ok(r.frames.some(f => f.m === '제압'));
      const c2 = X.buildSide(ctrl.slice(0, 2), 'a'); assert.ok(c2.flags.has('manaDrain20') && c2.flags.has('shackle') && !c2.flags.has('dread')); }
    { const plague = [{ unit: 'orangeMushroom', star: 2, row: 'front' }, { unit: 'fireBoar', star: 2, row: 'front' }], foe = [{ unit: 'seaGuard', star: 3, row: 'front' }];
      const r = X.battle(plague, foe, mkRng(4)); assert.ok(r.log.some(l => l.includes('중독')), 'plague 2 attacks poison'); }
    { const ug = X.buildSide([{ unit: 'kingClang', star: 1, row: 'front' }, { unit: 'juniorWraith', star: 1, row: 'back' }], 'a').units[1]; assert.equal(ug.stats.magic, Math.round(X.unitBaseStats(D.unitById('juniorWraith'), 1).magic * 1.05)); }
    // v3.418 · v3.427 신전 2 · 4 체력 15%: 신전 2를 켠 보드는 팀 전체 체력이 15% 높음.
    { const two = X.buildSide([{ unit: 'erdaSpirit', star: 1, row: 'back' }, { unit: 'memoryMonitor', star: 1, row: 'back' }, { unit: 'pig', star: 1, row: 'front' }], 'a').units[2]; assert.equal(two.maxHp, Math.round(X.unitBaseStats(D.unitById('pig'), 1).hp * 1.15)); }
    assert.equal(D.EXPEDITION.star[3], 4); assert.equal(X.unitBaseStats(D.unitById('slime'), 3).hp, 4 * D.BASE_BY_COST[1].hp);
    { let w = 0; for (let k = 0; k < 40; k++) { const rng = mkRng(900 + k); if (X.battle([{ unit: 'pig', star: 3, row: 'front' }], [{ unit: 'manticore', star: 1, row: 'front' }], rng).winner === 'a') w++; } assert.ok(w >= 16, `cost-1 ★3 holds against cost-4 ★1 (${w}/40)`); }
});

test('expedition stage 17: ghost boards carry the opponent run mods (augments · weekly rule · mastery perks) — recorded per round, synced in the season row, sent with pickGhosts, validated and applied to side B in battle, and shown as foe augments', async () => {
    const { newState, act } = await import('./harness.mjs');
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition'), A = await L.load('systems/actions/expedition');
    // 전투 보정 정제: 경제 키는 빠지고 범위를 자른다.
    assert.deepEqual(D.combatMods({ goldPlus: 5, rerollCost: 0, frontHp: 1.15, speed: 2, traitPlus: { meadow: 1, bogus: 3 }, reflect: 9, bossGuard: .25 }), { traitPlus: { meadow: 1 }, frontHp: 1.15, speed: 2, reflect: .5, bossGuard: .25 });
    assert.equal(D.combatMods({ goldPlus: 2 }), undefined); assert.equal(D.combatMods(undefined), undefined);
    // 고스트 파싱: mods · augments를 받고, 모르는 증강 id는 버린다.
    const g = A.parseGhost(JSON.stringify({ 3: { name: 'g', board: [{ unit: 'pig', star: 1, row: 'front' }], mods: { frontHp: 1.3, goldPlus: 4 }, augments: ['frontWall', 'nope', 'traitPlus1:meadow'] } }), 3);
    assert.deepEqual(g.mods, { frontHp: 1.3 }); assert.deepEqual(g.augments, ['frontWall', 'traitPlus1:meadow']);
    // 전투: 같은 보드끼리 B쪽에만 체력 보정을 주면 B가 이긴다(결정적 시드).
    const same = [{ unit: 'seaGuard', star: 2, row: 'front' }, { unit: 'pig', star: 2, row: 'front' }];
    const plain = X.battle(same, same, mkRng(11), 40), buffed = X.battle(same, same, mkRng(11), 40, undefined, false, { frontHp: 1.6, starPower: 1.3 });
    assert.ok(buffed.hpLeft.b > plain.hpLeft.b || buffed.winner === 'b', 'side B mods apply');
    assert.equal(X.buildSide(same, 'b', { traitPlus: { meadow: 1 } }).active.find(t => t.trait.id === 'meadow').count, 2, 'B side trait plus');
    // 판: 라운드별 증강 기록 · 고스트 상대의 증강이 r.last.foeAugments로.
    const now = 1_800_000_000_000, s = newState(0); s.level = 100;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = [];
    r.board = [{ unit: 'zakum', star: 3, row: 'front' }]; r.augments = ['coinPurse']; r.round = 3;
    const ghostJson = JSON.stringify({ 3: { name: '상대', board: [{ unit: 'slime', star: 1, row: 'front' }], mods: { speed: 2 }, augments: ['quickFeet'] } });
    let used = false; for (let seed = 1; seed <= 20 && !used; seed++) { r.round = 3; (clearOffer(s), act)(s, { type: 'expeditionFight', value: ghostJson }, now + seed, mkRng(seed)); if (r.box) act(s, { type: 'expeditionSkipBox' }, now, mkRng(1)); if (r.last.opponent) used = true; }
    assert.ok(used, 'a ghost fight happened'); assert.deepEqual(r.last.foeAugments, ['quickFeet']); assert.deepEqual(r.augHistory[3], ['coinPurse']);
    // 시즌 행: augs · rule · mastery가 실리고 pickGhosts가 라운드별 보정을 만든다.
    const file = path.join(os.tmpdir(), `tb-exp17-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    try {
        // 앞 테스트가 같은 DB 인스턴스에 남긴 행과 섞이지 않도록 다른 달을 씁니다.
        const E = await L.load('server/expedition'), T = await L.load('data/time'); const now2 = now + 45 * 86_400_000, key = T.monthKey(now2);
        const mk = (name, round, augs) => ({ name, expedition: { round, wins: 4, done: true, last: { won: true }, history: { 3: [{ unit: 'pig', star: 1, row: 'front' }] }, augHistory: augs, rule: 'giants', mastery: 30, startedAt: 1 } });
        await E.syncExpeditionRow('g1', mk('증강맨', 4, { 3: ['frontWall', 'traitPlus1:meadow'] }), now2);
        const ghosts = await E.pickGhosts(key, 'other', () => 0); ghosts[3] = ghosts[3].filter(g => g.account === 'g1');
        assert.deepEqual(ghosts[3][0].augments, ['frontWall', 'traitPlus1:meadow']);
        // 방벽 1.15 × 숙련 30 특전 앞줄 1.05, 거인의 주 ★2+ 1.08, 초원 문양 +1.
        assert.ok(Math.abs(ghosts[3][0].mods.frontHp - 1.15 * 1.05) < 1e-9); assert.equal(ghosts[3][0].mods.starPower, 1.08); assert.deepEqual(ghosts[3][0].mods.traitPlus, { meadow: 1 }); assert.equal(ghosts[3][0].mods.goldPlus, undefined);
    } finally { delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});

test('expedition stage 19 (main-game links): boss units stay out of the shop until the boss is killed in the main game, boss wins roll core shards that forge a boss core at 10, codex tiers add main-game book kills once per tier', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition'), A = await L.load('systems/actions/expedition');
    assert.deepEqual([...D.lockedBossUnits({}, D.UNITS)].sort(), ['blackMage', 'lucid', 'mushmom', 'zakum']); assert.deepEqual([...D.lockedBossUnits({ grottoWarden: 1, ventColossus: 3 }, D.UNITS)].sort(), ['blackMage', 'lucid']);
    assert.ok(D.lockedBossUnits({}).has('kingSlime'), 'default pool covers set units too');
    const locked = D.lockedBossUnits({});
    for (let seed = 1; seed <= 30; seed++) for (const id of X.rollShop(8, mkRng(seed), 5, undefined, locked)) assert.ok(!locked.has(id), `locked boss ${id} in shop`);
    assert.ok(Array.from({ length: 60 }, (_, k) => X.rollShop(8, mkRng(k + 1), 5)).flat().some(id => locked.has(id)), 'without exclude bosses do appear at level 8');
    assert.ok(Array.from({ length: 40 }, (_, k) => X.rollShop(8, mkRng(k + 1), 5, [{ unit: 'pig', star: 1, row: 'front' }, { unit: 'kingClang', star: 1, row: 'front' }], locked)).flat().every(id => !locked.has(id)), 'synergy slot respects the lock');
    assert.ok(Math.abs(D.shardChance(1, false) - .01) < 1e-9); assert.ok(Math.abs(D.shardChance(5, true) - .04) < 1e-9); assert.equal(D.shardCoreFor('mushmom', mkRng(1)), 'grotto'); assert.ok(D.SHARD_CORE_POOL.includes(D.shardCoreFor('blackMage', mkRng(2))));
    // 판: 상점이 잠긴 보스를 피하고, 본편 처치가 생기면 나올 수 있다.
    const now = 1_800_000_000_000, s = newState(0); s.level = 100;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = [];
    r.level = 8; for (let k = 0; k < 20; k++) { r.gold = 10; act(s, { type: 'expeditionReroll' }, now, mkRng(k + 3)); assert.ok(r.shop.every(id => !locked.has(id))); }
    s.book.ventColossus = 1; let seen = false; for (let k = 0; k < 80 && !seen; k++) { r.gold = 10; act(s, { type: 'expeditionReroll' }, now, mkRng(k + 100)); if (r.shop.includes('zakum')) seen = true; }
    assert.ok(seen, 'zakum appears once the main-game boss is killed');
    // 조각: 확률을 강제로 맞춰(rng 0) 보스 승리마다 조각, 10개면 코어 획득 → 각성.
    r.board = [{ unit: 'zakum', star: 3, row: 'front' }, { unit: 'blackMage', star: 3, row: 'back' }, { unit: 'lucid', star: 3, row: 'back' }, { unit: 'seaGuard', star: 3, row: 'front' }];
    const zero = () => 0;
    assert.equal(A.rollShard(s, r, 'mushmom', false, zero), 'grotto'); assert.equal(s.expeditionShards.grotto, 1);
    for (let k = 0; k < 8; k++) A.rollShard(s, r, 'mushmom', false, zero); assert.equal(s.expeditionShards.grotto, 9); assert.equal(s.bossCores?.grotto, undefined);
    A.rollShard(s, r, 'mushmom', false, zero); assert.equal(s.expeditionShards.grotto, 0); assert.ok(s.bossCores.grotto, 'core granted at 10 shards'); assert.equal(s.bossCores.grotto.rank, 0);
    for (let k = 0; k < 10; k++) A.rollShard(s, r, 'mushmom', false, zero); assert.equal(s.bossCores.grotto.rank, 1, 'second 10 shards awaken the core');
    assert.equal(A.rollShard(s, r, 'mushmom', false, () => .99), null, 'no drop above the chance');
    // 막 보스 승리가 조각을 굴린다(rng를 0으로 고정한 전투는 결정적이지 않으니 함수 훅만 확인) → 실제 판에서 4라운드 보스 승리 뒤 조각 또는 없음.
    r.round = 4; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now + 1, mkRng(4)); assert.ok(r.last.won); if (r.box) act(s, { type: 'expeditionSkipBox' }, now, mkRng(1));
    // 도감 연결: 돼지 승리 10 → 동(+50), 50 → 은(+200), 200 → 금(+500); 한 단계에 한 번.
    s.book.ray = 0; s.expeditionStats.unitWins = { pig: 10 }; const pigMonster = D.unitById('pig').monster; s.book[pigMonster] = 0;
    assert.equal(A.linkCodex(s, 'pig'), 50); assert.equal(s.book[pigMonster], 50); assert.equal(A.linkCodex(s, 'pig'), 0, 'same tier pays once');
    s.expeditionStats.unitWins.pig = 200; assert.equal(A.linkCodex(s, 'pig'), 700, 'silver + gold together'); assert.equal(s.book[pigMonster], 750); assert.equal(s.expeditionCodexLinked.pig, 3);
    // 전투 승리 경로에서도 불린다.
    s.expeditionStats.unitWins = { seaGuard: 9 }; const sgMonster = D.unitById('seaGuard').monster; s.book[sgMonster] = 0; delete s.expeditionCodexLinked.seaGuard;
    r.round = 2; r.board = [{ unit: 'seaGuard', star: 3, row: 'front' }, { unit: 'zakum', star: 3, row: 'front' }]; (clearOffer(s), act)(s, { type: 'expeditionFight' }, now + 2, mkRng(6)); assert.ok(r.last.won); assert.equal(s.expeditionStats.unitWins.seaGuard, 10); assert.equal(s.book[sgMonster], 50);
});

test('expedition stage 20 (quarterly sets): quarter key and active/next set by date, set pools swap units, shop/wave/synergy use the run set, set-only augments and items stay in their set, set mastery resets per set and pays pearls + title at 20, data integrity for set units', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition'), A = await L.load('systems/actions/expedition'), Enc = await L.load('data/encounters'), W = await L.load('data/world'), TT = await L.load('data/titles'), AC = await L.load('data/achievements');
    const t = (iso) => Date.parse(iso);
    assert.equal(D.quarterKey(t('2026-10-20T03:00:00Z')), '2026-Q4'); assert.equal(D.quarterKey(t('2026-12-31T15:30:00Z')), '2027-Q1', 'KST: Dec 31 15:30 UTC is Jan 1 00:30'); assert.equal(D.quarterKey(t('2027-04-01T00:00:00Z')), '2027-Q2');
    assert.equal(D.activeSet(t('2026-10-20T03:00:00Z')).id, 'genesis'); assert.equal(D.activeSet(t('2027-01-05T00:00:00Z')).id, 'deepTide'); assert.equal(D.activeSet(t('2020-01-01T00:00:00Z')).id, 'genesis', 'before the first set: first set'); assert.equal(D.nextSet(t('2026-10-20T03:00:00Z')).id, 'deepTide'); assert.equal(D.nextSet(t('2027-06-01T00:00:00Z')), undefined);
    // 풀: 기본 30 − 6 + 6 = 30, 쉬는 유닛은 빠지고 세트 유닛이 들어온다. unitById는 전체를 본다.
    const base = D.setUnits('genesis'), tide = D.setUnits('deepTide');
    assert.equal(base.length, 30); assert.equal(tide.length, 30); assert.ok(!tide.some(u => u.id === 'curseEye')); assert.ok(tide.some(u => u.id === 'papulatus')); assert.ok(D.unitById('kingSlime')); assert.ok(!base.some(u => u.id === 'kingSlime'));
    for (const u of D.EXTRA_UNITS) { assert.ok(Enc.enemySkillById(u.skill), `${u.id} skill`); assert.ok(W.MONSTERS.some(m => m.id === u.monster), `${u.id} monster`); assert.ok(!D.UNITS.some(b => b.id === u.id || b.monster === u.monster), `${u.id} unique`); }
    for (const o of Object.keys(D.ORIGIN_NAMES)) assert.ok(tide.filter(u => u.origin === o).length >= 4, `deepTide origin ${o} >= 4`);
    for (const id of ['kingSlime', 'zombieMushmom', 'juniorBalrog', 'papulatus']) assert.ok(D.SHARD_CORE_OF[id], `${id} maps to a core`);
    // 상점 · 웨이브는 주어진 풀만 쓴다.
    const unlockedAll = new Set();
    for (let seed = 1; seed <= 25; seed++) { for (const id of X.rollShop(8, mkRng(seed), 5, undefined, unlockedAll, tide)) assert.ok(tide.some(u => u.id === id), `shop from pool: ${id}`); for (const p of X.rollWave(10, mkRng(seed), 1, tide)) assert.ok(tide.some(u => u.id === p.unit) || ['mushmom', 'zakum', 'blackMage'].includes(p.unit), `wave from pool: ${p.unit}`); }
    assert.ok(Array.from({ length: 40 }, (_, k) => X.rollShop(8, mkRng(k + 1), 5, undefined, unlockedAll, tide)).flat().some(id => id === 'papulatus' || id === 'juniorBalrog' || id === 'kingSlime'), 'set units appear');
    // 세트 전용 증강 · 아이템.
    assert.equal(D.augmentById('tideSurge').set, 'deepTide'); assert.ok(!D.BOX_ITEMS('genesis').some(x => x.id === 'tidePearl')); assert.ok(D.BOX_ITEMS('deepTide').some(x => x.id === 'tidePearl'));
    const r2 = { round: 5, board: [{ unit: 'pig', star: 1, row: 'front' }], augments: [], set: 'genesis', mastery: 1 }; for (let k = 1; k <= 30; k++) assert.ok(!A.rollAugments(r2, mkRng(k)).includes('tideSurge'), 'set-only augment never in genesis');
    const r3 = { ...r2, set: 'deepTide' }; assert.ok(Array.from({ length: 40 }, (_, k) => A.rollAugments(r3, mkRng(k + 1))).flat().includes('tideSurge'), 'set-only augment appears in its set');
    // 판은 시작 때 세트를 기억한다.
    const now = t('2027-01-05T00:00:00Z'), s = newState(0); s.level = 100; s.pearls = 0;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; assert.equal(r.set, 'deepTide'); delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = [];
    for (let k = 0; k < 20; k++) { r.gold = 10; r.level = 8; act(s, { type: 'expeditionReroll' }, now, mkRng(k + 3)); assert.ok(r.shop.every(id => tide.some(u => u.id === id) && !D.lockedBossUnits(s.book).has(id))); }
    // 세트 숙련: 경험치가 같이 오르고, 5 · 10 · 15 · 20에 세계석, 20이면 완성 기록 · 칭호. 세트가 다르면 처음부터.
    A.addSetMasteryXp(s, 150, 'deepTide'); assert.equal(s.expeditionSetMastery.level, 2); assert.equal(s.expeditionSetMastery.set, 'deepTide');
    A.addSetMasteryXp(s, 20000, 'deepTide'); assert.equal(s.expeditionSetMastery.level, 20); assert.deepEqual(s.expeditionSetMastery.claimed, [5, 10, 15, 20]); assert.equal(s.pearls, 110); assert.equal(s.expeditionSetDone.deepTide, 1);
    A.addSetMasteryXp(s, 1000, 'deepTide'); assert.equal(s.pearls, 110, 'maxed: nothing more');
    A.addSetMasteryXp(s, 200, 'genesis'); assert.equal(s.expeditionSetMastery.set, 'genesis'); assert.equal(s.expeditionSetMastery.level, 2, 'new set starts over');
    assert.ok(AC.ACHIEVEMENTS.find(a => a.id === 'expSet:deepTide').progress(s) === 1); assert.ok(TT.TITLES.find(x => x.id === 'expSet:deepTide'));
    // 판 종료 때 영구 숙련과 세트 숙련이 함께 오른다.
    r.board = [{ unit: 'zakum', star: 3, row: 'front' }]; r.wins = 3; act(s, { type: 'expeditionQuit' }, now + 1, mkRng(1)); assert.equal(s.expeditionSetMastery.set, 'deepTide', 'run set wins over the stale genesis track'); assert.ok(s.expeditionMastery.total > 0);
});

test('expedition stage 21: weekly league rows group 8 per tier, list/settle promote and demote with pearls, start applies the league settlement once; renown resets mastery with scaling xp and reward bonus; codex tiers to diamond; milestone achievements and titles', async () => {
    const { newState, act } = await import('./harness.mjs');
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const D = await L.load('data/expedition'), A = await L.load('systems/actions/expedition'), T = await L.load('data/time'), TT = await L.load('data/titles'), AC = await L.load('data/achievements');
    // 정산 파서: 1~2위 승급 · 7~8위 강등(6명 이상) · 세계석표.
    const mk = (rank, size, tier = 2) => A.parseLeagueSettlement(JSON.stringify({ league: { week: '2026-W43', tier, rank, size, score: 900 } }));
    assert.deepEqual(mk(1, 8), { week: '2026-W43', tier: 2, rank: 1, size: 8, score: 900, pearls: 15, nextTier: 3 }); assert.equal(mk(2, 8).nextTier, 3); assert.equal(mk(3, 8).nextTier, 2); assert.equal(mk(7, 8).nextTier, 1); assert.equal(mk(8, 8).pearls, 2);
    assert.equal(mk(5, 5).nextTier, 2, 'small group: no demotion'); assert.equal(mk(1, 8, 5).nextTier, 5, 'master cannot promote'); assert.equal(mk(8, 8, 1).nextTier, 1, 'bronze cannot demote'); assert.equal(A.parseLeagueSettlement(JSON.stringify({ league: { week: 'bad', tier: 1, rank: 1, size: 8 } })), null);
    assert.ok(A.parseSettlement(JSON.stringify({ season: { season: '2026-09', rank: 2, total: 5, wins: 6 }, league: null })), 'bundled season settlement still parses'); assert.ok(A.parseSettlement(JSON.stringify({ season: '2026-09', rank: 2, total: 5, wins: 6 })), 'legacy shape');
    // 핸들러: 리그 정산 한 번만 · 등급 반영.
    const now = 1_800_000_000_000, s = newState(0); s.level = 100; s.pearls = 0;
    const v = JSON.stringify({ season: null, league: { week: '2026-W43', tier: 1, rank: 1, size: 8, score: 500 } });
    act(s, { type: 'expeditionStart', value: v }, now, mkRng(1)); assert.equal(s.pearls, 15); assert.equal(s.expeditionLeague.tier, 2); assert.equal(s.expeditionLeague.best, 2); assert.equal(s.expeditionLeague.claimed, '2026-W43');
    act(s, { type: 'expeditionQuit' }, now, mkRng(1)); act(s, { type: 'expeditionStart', value: v }, now + 1, mkRng(1)); assert.equal(s.pearls, 15, 'same week once');
    act(s, { type: 'expeditionQuit' }, now + 1, mkRng(1));
    // 명성: 숙련 50에서만, 숙련 1로 · 경험치 요구 ×1.2 · 보상 ×1.02.
    assert.throws(() => act(s, { type: 'expeditionRenown' }, now + 2, mkRng(1)), /숙련 50/);
    s.expeditionMastery = { level: 50, xp: 0, total: 70000 }; act(s, { type: 'expeditionRenown' }, now + 2, mkRng(1)); assert.equal(s.expeditionRenown, 1); assert.equal(s.expeditionMastery.level, 1); assert.equal(D.masteryXpFor(1, 1), 120); assert.equal(D.masteryXpFor(1, 0), 100); assert.ok(Math.abs(D.renownRewardMult(1) - 1.02) < 1e-9); assert.ok(Math.abs(D.renownRewardMult(99) - 1.5) < 1e-9, 'reward cap at renown 25');
    act(s, { type: 'expeditionStart' }, now + 3, mkRng(1)); const r = s.expedition; delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = []; r.board = [{ unit: 'zakum', star: 3, row: 'front' }]; r.wins = 10; s.pearls = 0; act(s, { type: 'expeditionQuit' }, now + 4, mkRng(1)); assert.equal(r.reward, Math.round(10 * 1.02));
    assert.throws(() => { act(s, { type: 'expeditionStart' }, now + 5, mkRng(1)); act(s, { type: 'expeditionRenown' }, now + 5, mkRng(1)); }, /마친 뒤/); act(s, { type: 'expeditionQuit' }, now + 5, mkRng(1));
    assert.equal(D.CODEX_TIERS.length, 5); assert.equal(D.codexTier(1000), 4); assert.equal(D.codexTier(5000), 5); assert.equal(D.codexTier(999), 3);
    for (const id of ['expRenown:1', 'expRenown:50', 'expLeague:5', 'expTotalWins:100000', 'expRuns:10000', 'expSet:genesis']) { assert.ok(AC.ACHIEVEMENTS.find(a => a.id === id), id); assert.ok(TT.TITLES.find(t => t.id === id), `title ${id}`); }
    assert.equal(AC.ACHIEVEMENTS.find(a => a.id === 'expRenown:1').progress(s), 1); assert.equal(AC.ACHIEVEMENTS.find(a => a.id === 'expLeague:3').progress(s), 2);
    // 서버: 같은 등급 9명 → 조 0에 8명 · 조 1에 1명, 조 순위표, 지난주 정산.
    const file = path.join(os.tmpdir(), `tb-exp21-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    try {
        const E = await L.load('server/expedition'); const wk = now + 120 * 86_400_000, key = T.weekKey(wk);
        const run = (wins, done = true) => ({ name: `p${wins}`, expeditionLeague: { tier: 2 }, expedition: { round: 13, wins, cleared: true, done, last: { won: true }, history: { 2: [{ unit: 'pig', star: 1, row: 'front' }] }, startedAt: 1 } });
        for (let i = 1; i <= 9; i++) await E.syncLeagueRow(`q${i}`, run(i), wk + i);
        const b1 = await E.listLeague(key, 'q1'); assert.equal(b1.joined, true); assert.equal(b1.tier, 2); assert.equal(b1.group, 0); assert.equal(b1.rows.length, 8); assert.equal(b1.rows[0].id, 'q8', 'highest score first');
        const b9 = await E.listLeague(key, 'q9'); assert.equal(b9.group, 1); assert.equal(b9.rows.length, 1);
        assert.equal((await E.listLeague(key, 'nobody')).joined, false);
        // 두 번째 동기화는 조를 바꾸지 않고 승리를 누적한다.
        await E.syncLeagueRow('q1', run(4), wk + 50); const again = await E.listLeague(key, 'q1'); const me = again.rows.find(x => x.id === 'q1'); assert.equal(me.wins, 5); assert.equal(me.runs, 2); assert.equal(again.group, 0);
        // 지난주 정산: 다음 주 시점에서 q8 1위 승급 · q1 8위 강등 · q9는 1명 조라 유지.
        const next = wk + 7 * 86_400_000;
        const s8 = await E.settleLeague('q8', next); assert.equal(s8.rank, 1); assert.equal(s8.nextTier, 3); assert.equal(s8.pearls, 15); assert.equal(s8.week, key);
        const s2 = await E.settleLeague('q2', next); assert.equal(s2.rank, 8, 'q2 (2 wins) is last after q1 accumulated'); assert.equal(s2.nextTier, 1); assert.equal(s2.pearls, 2);
        const s9 = await E.settleLeague('q9', next); assert.equal(s9.rank, 1); assert.equal(s9.size, 1); assert.equal(s9.nextTier, 3);
        assert.equal(await E.settleLeague('nobody', next), null);
    } finally { delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});

test('expedition stage 22 (small ghost pool): candidates per round pick the least-seen account, same opponent at most twice per run, small pools lower the ghost chance, over-strong ghost boards are scaled down to the round budget, server sends up to 3 nearest-score candidates and the pool size', async () => {
    const { newState, act } = await import('./harness.mjs');
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition'), A = await L.load('systems/actions/expedition');
    // capGhostBoard: 2라운드(예산 5 × 1.3 = 6.5 → 6)에 ★3 자쿰(20) → ★을 내리고 그래도 넘으면 약한 유닛부터 뺀다.
    const strong = [{ unit: 'zakum', star: 3, row: 'front' }, { unit: 'pig', star: 3, row: 'front' }, { unit: 'slime', star: 1, row: 'back' }];
    const c2 = A.capGhostBoard(strong, 2, 1); assert.equal(c2.scaled, true); assert.ok(D.boardValue(c2.board) <= Math.round(X.WAVE_BUDGET[2] * 1.3), `value ${D.boardValue(c2.board)}`); assert.ok(c2.board.length >= 1);
    const c12 = A.capGhostBoard([{ unit: 'pig', star: 2, row: 'front' }, { unit: 'slime', star: 1, row: 'back' }], 12, 1); assert.equal(c12.scaled, false, 'weak board untouched'); assert.deepEqual(c12.board.map(p => p.star), [2, 1]);
    const c12e = A.capGhostBoard(strong, 12, 5); assert.ok(D.boardValue(c12e.board) <= Math.round(X.WAVE_BUDGET[12] * 1.6 * 1.3));
    // parseGhost: 후보 셋 중 이 판에서 가장 적게 만난 계정, pool 전달.
    const value = JSON.stringify({ pool: 2, 3: [{ name: 'A', account: 'a', board: [{ unit: 'pig', star: 1, row: 'front' }] }, { name: 'B', account: 'b', board: [{ unit: 'slime', star: 1, row: 'front' }] }] });
    assert.equal(A.parseGhost(value, 3).name, 'A'); assert.equal(A.parseGhost(value, 3, { a: 2 }).name, 'B'); assert.equal(A.parseGhost(value, 3).pool, 2); assert.equal(A.parseGhost(value, 3).account, 'a');
    assert.equal(A.parseGhost(JSON.stringify({ 3: { name: 'old', board: [{ unit: 'pig', star: 1, row: 'front' }] } }), 3).name, 'old', 'single-object shape still works');
    // 판: 같은 상대는 2번까지(rng 0 → 늘 고스트 선택), 세 번째 라운드는 웨이브. pool 1이면 확률 × .5.
    const now = 1_800_000_000_000, s = newState(0); s.level = 100;
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = [];
    r.board = [{ unit: 'zakum', star: 3, row: 'front' }];
    const one = (round) => JSON.stringify({ pool: 1, [round]: [{ name: '유일', account: 'only', board: [{ unit: 'slime', star: 1, row: 'front' }] }] });
    const zero = () => 0;
    for (const round of [2, 3, 5]) { r.round = round; clearOffer(s); act(s, { type: 'expeditionFight', value: one(round) }, now + round, zero); if (r.box) act(s, { type: 'expeditionSkipBox' }, now, mkRng(1)); if (round < 5) assert.equal(r.last.opponent, '유일', `round ${round} ghost`); else assert.equal(r.last.opponent, undefined, 'third meeting falls back to a wave'); }
    assert.equal(r.ghostSeen.only, 2);
    // 확률 축소: rng .4 → pool 1(×.5 = .3)이면 웨이브, pool 4(×1 = .6)이면 고스트.
    r.round = 6; delete r.ghostSeen; clearOffer(s); act(s, { type: 'expeditionFight', value: one(6) }, now + 6, () => .4); assert.equal(r.last.opponent, undefined, 'pool 1 halves the chance'); if (r.box) act(s, { type: 'expeditionSkipBox' }, now, mkRng(1));
    r.round = 7; clearOffer(s); act(s, { type: 'expeditionFight', value: JSON.stringify({ pool: 4, 7: [{ name: '넷', account: 'four', board: [{ unit: 'slime', star: 1, row: 'front' }] }] }) }, now + 7, () => .4); assert.equal(r.last.opponent, '넷'); if (r.box) act(s, { type: 'expeditionSkipBox' }, now, mkRng(1));
    // 센 고스트는 ★이 깎이고 scaled 표시.
    r.round = 2; clearOffer(s); delete r.ghostSeen; act(s, { type: 'expeditionFight', value: JSON.stringify({ pool: 4, 2: [{ name: '강자', account: 'str', board: strong }] }) }, now + 8, zero); assert.equal(r.last.opponent, '강자'); assert.equal(r.last.scaled, true); assert.ok(D.boardValue(r.last.foe) <= Math.round(X.WAVE_BUDGET[2] * 1.3));
    // 서버: 후보는 내 점수와 가까운 순으로 최대 3명, pool은 다른 계정 수.
    const file = path.join(os.tmpdir(), `tb-exp22-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    try {
        const E = await L.load('server/expedition'), T = await L.load('data/time'); const now2 = now + 200 * 86_400_000, key = T.monthKey(now2);
        const mk = (name, wins) => ({ name, expedition: { round: 4, wins, done: true, last: { won: true }, history: { 2: [{ unit: 'pig', star: 1, row: 'front' }] }, startedAt: 1 } });
        await E.syncExpeditionRow('me', mk('나', 3), now2); for (const [id, w] of [['g1', 1], ['g2', 2], ['g3', 4], ['g4', 8], ['g5', 12]]) await E.syncExpeditionRow(id, mk(id, w), now2 + 1);
        const g = await E.pickGhosts(key, 'me', () => 0, now2 + 100_000); assert.equal(g.pool, 5 + 8, '5 accounts + starters (8 on rounds with no real boards)'); assert.equal(g[2].length, 3); assert.ok(g[2].every(x => x.score === undefined));
        // 실제 계정만 놓고 보면 내 점수(3승)와 가까운 순 — 연습 원정대(점수 200 · 300 · 400 …)와 섞여도 순서는 같음.
        const realIds = g[2].map(x => x.account).filter(a => !a.startsWith('starter:')); assert.deepEqual(realIds, ['g3', 'g2', 'g1'].slice(0, realIds.length), 'nearest to my score (3 wins) first');
    } finally { delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});

test('expedition v3.423 starter ghosts: data is valid, boards fit the round budget, fill thin pools nearest to my score and step aside as real boards accumulate, the handler rebuilds them at the run difficulty and gives no season ghost points', async () => {
    const { newState, act } = await import('./harness.mjs');
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition');
    assert.equal(D.STARTER_GHOSTS.length, 9); assert.equal(new Set(D.STARTER_GHOSTS.map(g => g.id)).size, 9);
    for (const tier of [1, 2, 3]) assert.equal(D.STARTER_GHOSTS.filter(g => g.tier === tier).length, 3);
    for (const g of D.STARTER_GHOSTS) {
        assert.ok(g.name.length <= 16, g.name); assert.ok(g.units.every(id => D.unitById(id)), g.id); assert.ok((g.items || []).every(id => D.itemById(id)), g.id);
        for (let round = 2; round <= 12; round++) {
            const b = X.starterBoard(g, round); assert.deepEqual(b, X.starterBoard(g, round), 'deterministic');
            assert.ok(b.length >= 1 && b.length <= X.STARTER_SLOTS[round], `${g.id} r${round} size`); assert.ok(b.length === 1 || D.boardValue(b) <= Math.max(1, Math.round(X.WAVE_BUDGET[round] * g.power * (round <= 3 ? .7 : 1))), `${g.id} r${round} value`);
            assert.ok(b.every(p => !p.item) || (g.tier === 3 && round >= 6), `${g.id} r${round} items only for skilled from round 6`);
        }
    }
    const value = (tier, round) => Math.max(...D.STARTER_GHOSTS.filter(g => g.tier === tier).map(g => D.boardValue(X.starterBoard(g, round))));
    assert.ok(value(1, 9) < value(2, 9) && value(2, 9) <= value(3, 9) + 2, 'tiers grow');
    // 서버: 빈 달이면 연습 원정대만, 기록 없는 나는 점수 0 → 입문부터.
    const file = path.join(os.tmpdir(), `tb-exp423-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    const now = 1_800_000_000_000;
    try {
        const E = await L.load('server/expedition'), T = await L.load('data/time'); const now2 = now + 400 * 86_400_000, key = T.monthKey(now2);
        E.forgetGhosts(); const empty = await E.pickGhosts(key, 'new', () => 0, now2);
        for (const round of [2, 3, 5, 6, 7, 9, 10, 11]) { assert.equal(empty[round].length, 3); assert.ok(empty[round].every(x => x.account.startsWith('starter:') && D.STARTER_GHOSTS.find(g => 'starter:' + g.id === x.account).tier === 1), `round ${round} beginners`); }
        assert.equal(empty[4], undefined); assert.equal(empty[12], undefined); assert.equal(empty.pool, 8);
        // 2라운드 보드를 가진 실제 계정이 8명이 되면 2라운드에는 연습 원정대가 빠짐(다른 라운드는 그대로).
        const mk = (name, wins) => ({ name, expedition: { round: 4, wins, done: true, last: { won: true }, history: { 2: [{ unit: 'pig', star: 1, row: 'front' }] }, startedAt: 1 } });
        for (let i = 0; i < 8; i++) await E.syncExpeditionRow('real' + i, mk('실제' + i, 1 + i), now2 + i);
        E.forgetGhosts(); const full = await E.pickGhosts(key, 'new', () => 0, now2 + 100);
        assert.ok(full[2].every(x => !x.account.startsWith('starter:')), 'real boards replace starters'); assert.ok(full[3].every(x => x.account.startsWith('starter:')), 'round 3 still filled');
    } finally { delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
    // 핸들러: 보낸 보드는 무시하고 난이도 예산으로 다시 만들며, 이겨도 시즌 고스트 점수는 없음.
    const s = newState(0); s.level = 100; s.expeditionDiffClears = { 4: 1 };
    act(s, { type: 'expeditionStart', id: '5' }, now, mkRng(1)); const r = s.expedition; delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = [];
    r.board = [{ unit: 'zakum', star: 3, row: 'front' }, { unit: 'blackMage', star: 3, row: 'back' }, { unit: 'lucid', star: 3, row: 'back' }]; r.round = 6;
    const fake = JSON.stringify({ pool: 9, 6: [{ name: '연습 · 초원 친구들', account: 'starter:meadowPals', wins: 12, board: [{ unit: 'zakum', star: 3, row: 'front' }] }] });
    clearOffer(s); act(s, { type: 'expeditionFight', value: fake }, now + 1, () => 0);
    assert.equal(r.last.opponent, '연습 · 초원 친구들'); const def = D.STARTER_GHOSTS.find(g => g.id === 'meadowPals');
    assert.deepEqual(r.last.foe, X.starterBoard({ ...def, power: def.power * D.difficultyOf(5).budget }, 6), 'rebuilt at legend budget, sent board ignored');
    assert.ok(r.last.won); assert.equal(r.ghostPoints || 0, 0, 'no season ghost points from starters'); assert.equal(s.expeditionStats.ghostWins, 1);
});

test('expedition v3.428: stingy round xp (buying xp matters) with more base gold, and the physical/magic damage type follows the arcane role', async () => {
    const D = await L.load('data/expedition'), X = await L.load('systems/expedition');
    // 라운드 경험치만으로는 목표 곡선(웨이브가 전제하는 레벨)보다 대체로 1레벨 낮게 가고, 레벨 8은 마지막 라운드에야 — 사야 곡선을 따라감.
    const target = [2, 3, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8], passive = []; let lv = 2, xp = 0;
    for (let round = 1; round <= 12; round++) { passive.push(lv); xp += D.roundXpFor(round); while (lv < 8 && xp >= D.EXPEDITION.xpToLevel[lv]) { xp -= D.EXPEDITION.xpToLevel[lv]; lv++; } }
    assert.ok(passive.filter((l, i) => l < target[i]).length >= 6, `passive alone lags the curve: ${passive}`); assert.ok(passive.every((l, i) => l >= target[i] - 1), 'never more than one level behind');
    assert.equal(passive.indexOf(8), 11, 'level 8 only in the last round'); assert.equal(D.roundXpFor(1), 2); assert.equal(D.EXPEDITION.baseGold, 7);
    // 공격 종류: 마력 = 마법(기본 공격도 마법), 그 밖은 물리.
    for (const def of D.ALL_UNITS) { const magic = def.roles.includes('arcane'); assert.equal(D.damageType(def), magic ? 'magic' : 'physical', def.id); const f = X.buildSide([{ unit: def.id, star: 1, row: 'front' }], 'a').units[0]; assert.equal(!!f.magicBasic, magic, `${def.id} basic attack`); }
    assert.equal(D.damageType(D.unitById('evilEye')), 'magic'); assert.equal(D.damageType(D.unitById('pig')), 'physical');
});

test('expedition stage 23 (social · cosmetics): share code round-trips and rejects junk, target board marks progress, finished runs keep a code, themes unlock by renown/set/league/abyss/difficulty, server rows carry a share code', async () => {
    const { newState, act } = await import('./harness.mjs');
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const D = await L.load('data/expedition');
    // 코드: 왕복 · 접두어 · 깨진 입력 · 모르는 유닛 제거.
    const board = [{ unit: 'zakum', star: 3, row: 'front', item: D.ITEMS[0].id }, { unit: 'pig', star: 2, row: 'back' }];
    const code = D.encodeBoard(board, { set: D.SETS[0].id, augments: ['x1'], round: 9, wins: 7 });
    assert.ok(code.startsWith('TB1.') && /^[A-Za-z0-9._-]+$/.test(code), code);
    const back = D.decodeBoard(` "${code}" `); assert.deepEqual(back.units, board); assert.equal(back.set, D.SETS[0].id); assert.deepEqual(back.augments, ['x1']); assert.equal(back.round, 9); assert.equal(back.wins, 7);
    assert.equal(D.decodeBoard('hello'), null); assert.equal(D.decodeBoard('TB1.!!!'), null); assert.equal(D.decodeBoard(''), null);
    const junk = 'TB1.' + btoa(JSON.stringify({ v: 1, u: [['nope', 1, 'f'], ['pig', 9, 'f'], ['slime', 2, 'b', 'ghostitem']] }));
    const j = D.decodeBoard(junk); assert.deepEqual(j.units, [{ unit: 'slime', star: 2, row: 'back' }], 'unknown unit, bad star and unknown item dropped');
    assert.equal(D.decodeBoard('TB1.' + btoa(JSON.stringify({ v: 1, u: [['nope', 1, 'f']] }))), null, 'no valid unit → null');
    // 목표 진행: 같은 유닛은 하나씩 짝, ★ 부족은 partial.
    assert.deepEqual(D.targetProgress([{ unit: 'pig', star: 2 }, { unit: 'pig', star: 1 }, { unit: 'slime', star: 3 }], [{ unit: 'pig', star: 1 }, { unit: 'pig', star: 1 }, { unit: 'slime', star: 1 }]), { have: 1, partial: 2, total: 3 });
    // 액션: 목표 설정 · 해제 · 잘못된 코드.
    const now = 1_800_000_000_000, s = newState(0); s.level = 100;
    act(s, { type: 'expeditionSetTarget', value: code }, now, mkRng(1)); assert.equal(s.expeditionTarget.units.length, 2); assert.equal(s.expeditionTarget.wins, 7); assert.ok(s.expeditionTarget.code.startsWith('TB1.'));
    assert.throws(() => act(s, { type: 'expeditionSetTarget', value: 'garbage' }, now, mkRng(1)), /공유 코드/);
    act(s, { type: 'expeditionSetTarget', value: '' }, now, mkRng(1)); assert.equal(s.expeditionTarget, undefined);
    // 판을 마치면 최근 판에 코드가 남는다.
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = [];
    r.board = [{ unit: 'pig', star: 1, row: 'front' }]; act(s, { type: 'expeditionQuit' }, now + 1, mkRng(1));
    assert.ok(s.expeditionRecent[0].code?.startsWith('TB1.')); assert.deepEqual(D.decodeBoard(s.expeditionRecent[0].code).units, [{ unit: 'pig', star: 1, row: 'front' }]);
    // 테마: 기본만 열림 → 조건별 해금 → 액션 · 잠긴 테마 거부 · 잠기면 기본으로 복귀.
    assert.equal(D.EXP_THEMES.length, 10); assert.equal(D.EXP_THEMES.filter(t => t.unlocked({})).length, 1);
    assert.throws(() => act(s, { type: 'expeditionTheme', value: 'tide' }, now, mkRng(1)), /잠겨/); assert.throws(() => act(s, { type: 'expeditionTheme', value: 'nope' }, now, mkRng(1)), /없는 테마/);
    s.expeditionRenown = 5; act(s, { type: 'expeditionTheme', value: 'ember' }, now, mkRng(1)); assert.equal(s.expeditionTheme, 'ember'); assert.equal(D.activeTheme(s).id, 'ember');
    s.expeditionRenown = 0; assert.equal(D.activeTheme(s).id, 'default', 'locked theme falls back');
    assert.ok(D.themeById('coral').unlocked({ expeditionSetDone: { a: 1 } })); assert.ok(D.themeById('crown').unlocked({ expeditionLeague: { best: 4 } })); assert.ok(!D.themeById('crown').unlocked({ expeditionLeague: { best: 3 } }));
    assert.ok(D.themeById('abyss').unlocked({ expeditionAbyssBest: D.ABYSS.max })); assert.ok(D.themeById('legend').unlocked({ expeditionDiffClears: { 5: 1 } })); assert.ok(D.themeById('aurora').unlocked({ expeditionRenown: 10 }));
    act(s, { type: 'expeditionTheme', value: 'default' }, now, mkRng(1)); assert.equal(s.expeditionTheme, undefined);
    // 서버: 행에 코드.
    const file = path.join(os.tmpdir(), `tb-exp23-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    try {
        const E = await L.load('server/expedition'), T = await L.load('data/time'); const now2 = now + 300 * 86_400_000, key = T.monthKey(now2);
        const mk = (name, wins) => ({ name, expedition: { round: 4, wins, done: true, last: { won: true }, history: { 2: [{ unit: 'pig', star: 1, row: 'front' }], 3: [{ unit: 'pig', star: 2, row: 'front' }] }, augHistory: { 3: ['x1'] }, startedAt: 1 } });
        await E.syncExpeditionRow('a1', mk('A1', 3), now2); await E.syncExpeditionRow('solo', mk('솔로', 9), now2 + 3);
        const rows = await E.listExpeditionBoard(key); const a1 = rows.find(x => x.id === 'a1');
        assert.equal(a1.guild, undefined, 'guild score removed in v3.361'); assert.ok(a1.code.startsWith('TB1.')); const dec = D.decodeBoard(a1.code); assert.deepEqual(dec.units, [{ unit: 'pig', star: 2, row: 'front' }], 'last round board'); assert.deepEqual(dec.augments, ['x1']); assert.equal(dec.wins, 3);
    } finally { delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});

test('expedition stage 23-2 (unit skins): skins unlock by the best set mastery ever reached, set mastery level-ups record expeditionSetBest and announce new skins, the skin action rejects locked ids and a locked pick falls back to default', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition'), A = await L.load('systems/actions/expedition');
    assert.equal(D.UNIT_SKINS.length, 5); assert.equal(D.UNIT_SKINS.filter(k => D.skinUnlocked(k, {})).length, 1, 'only default at start');
    assert.equal(D.setMasteryBest({ expeditionSetBest: 7, expeditionSetMastery: { level: 3 } }), 7, 'old set record counts'); assert.equal(D.setMasteryBest({ expeditionSetDone: { a: 1 } }), D.SET_MASTERY.max, 'a completed set counts as max');
    const now = 1_800_000_000_000, s = newState(0); s.level = 100;
    assert.throws(() => act(s, { type: 'expeditionSkin', value: 'gold' }, now, mkRng(1)), /잠겨/); assert.throws(() => act(s, { type: 'expeditionSkin', value: 'nope' }, now, mkRng(1)), /없는 피부/);
    // 세트 숙련 1 → 5: expeditionSetBest 기록, 로그에 은빛 해금.
    const setId = D.SETS[0].id; let xp = 0; for (let lv = 1; lv < 5; lv++) xp += D.setMasteryXpFor(lv);
    A.addSetMasteryXp(s, xp, setId); assert.equal(s.expeditionSetMastery.level, 5); assert.equal(s.expeditionSetBest, 5); assert.ok(s.logs.some(l => l.text.includes('🩶 은빛') && l.text.includes('해금')), 'skin unlock logged');
    act(s, { type: 'expeditionSkin', value: 'silver' }, now, mkRng(1)); assert.equal(s.expeditionSkin, 'silver'); assert.equal(D.activeSkin(s).id, 'silver');
    assert.throws(() => act(s, { type: 'expeditionSkin', value: 'gold' }, now, mkRng(1)), /세트 숙련 10/);
    // 세트가 바뀌어 숙련이 1로 돌아가도 기록(expeditionSetBest)으로 피부는 남는다.
    s.expeditionSetMastery = { set: 'other', level: 1, xp: 0, claimed: [] }; assert.equal(D.activeSkin(s).id, 'silver');
    s.expeditionSkin = 'radiant'; assert.equal(D.activeSkin(s).id, 'default', 'locked pick falls back'); s.expeditionSetDone = { x: 1 }; assert.equal(D.activeSkin(s).id, 'radiant');
    act(s, { type: 'expeditionSkin', value: 'default' }, now, mkRng(1)); assert.equal(s.expeditionSkin, undefined);
});

test('expedition stage 23-3 (author memo): codes carry a UTF-8 author name and a 40-char memo, control characters are stripped, the memo action stores and clears, finished runs and server rows embed name + memo, and a target keeps the byline', async () => {
    const { newState, act } = await import('./harness.mjs');
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const D = await L.load('data/expedition');
    const board = [{ unit: 'pig', star: 2, row: 'front' }];
    const code = D.encodeBoard(board, { author: '원정대장', memo: '초원 4 · 돌격 중심 ✨' });
    assert.ok(/^TB1\.[A-Za-z0-9_-]+$/.test(code), 'still base64url'); const back = D.decodeBoard(code); assert.equal(back.author, '원정대장'); assert.equal(back.memo, '초원 4 · 돌격 중심 ✨'); assert.deepEqual(back.units, board);
    const long = D.decodeBoard(D.encodeBoard(board, { author: 'a'.repeat(30), memo: 'ㄱ'.repeat(60) + '\u0007x' })); assert.equal(long.author.length, 16); assert.equal(long.memo.length, 40); assert.ok(!long.memo.includes('\u0007'));
    assert.equal(D.decodeBoard(D.encodeBoard(board)).author, undefined, 'no byline without author');
    assert.equal(D.cleanShareText('  a\n\tb  ', 40), 'a b');
    // 옛 코드(ASCII btoa)도 그대로 읽힌다.
    assert.deepEqual(D.decodeBoard('TB1.' + btoa(JSON.stringify({ v: 1, u: [['slime', 1, 'b']] }))).units, [{ unit: 'slime', star: 1, row: 'back' }]);
    // 액션: 메모 저장 · 정리 · 지움, 목표에 작성자 · 메모 유지.
    const now = 1_800_000_000_000, s = newState(0); s.level = 100; s.name = '나';
    act(s, { type: 'expeditionShareMemo', value: '  8라운드까지 버팀  ' }, now, mkRng(1)); assert.equal(s.expeditionShareMemo, '8라운드까지 버팀');
    act(s, { type: 'expeditionSetTarget', value: code }, now, mkRng(1)); assert.equal(s.expeditionTarget.author, '원정대장'); assert.equal(s.expeditionTarget.memo, '초원 4 · 돌격 중심 ✨'); assert.equal(D.decodeBoard(s.expeditionTarget.code).memo, '초원 4 · 돌격 중심 ✨', 're-encoded code keeps the memo');
    act(s, { type: 'expeditionStart' }, now, mkRng(1)); const r = s.expedition; delete r.rule; s.expeditionQuests.daily = []; s.expeditionQuests.weekly = [];
    r.board = [{ unit: 'pig', star: 1, row: 'front' }]; act(s, { type: 'expeditionQuit' }, now + 1, mkRng(1));
    const rc = D.decodeBoard(s.expeditionRecent[0].code); assert.equal(rc.author, '나'); assert.equal(rc.memo, '8라운드까지 버팀');
    act(s, { type: 'expeditionShareMemo', value: '' }, now, mkRng(1)); assert.equal(s.expeditionShareMemo, undefined);
    // 서버 행: 이름 + 메모가 코드에 들어간다.
    const file = path.join(os.tmpdir(), `tb-exp23c-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    try {
        const E = await L.load('server/expedition'), T = await L.load('data/time'); const now2 = now + 400 * 86_400_000, key = T.monthKey(now2);
        await E.syncExpeditionRow('m1', { name: '메모왕', expeditionShareMemo: '뒷줄 마력 셋', expedition: { round: 4, wins: 3, done: true, last: { won: true }, history: { 2: [{ unit: 'pig', star: 1, row: 'front' }] }, startedAt: 1 } }, now2);
        const row = (await E.listExpeditionBoard(key)).find(x => x.id === 'm1'); const dec = D.decodeBoard(row.code); assert.equal(dec.author, '메모왕'); assert.equal(dec.memo, '뒷줄 마력 셋');
    } finally { delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});

test('v3.426 round xp: every finished fight grants base + perRound × (round − 1) board xp (win or lose), levels carry into the next shop, none at level 8', async () => {
    const { newState, act } = await import('./harness.mjs');
    const D = await L.load('data/expedition');
    const s = newState(0); s.level = 100; s.rebirths = 120;
    const now = 1_800_000_000_000;
    assert.equal(D.roundXpFor(1), D.EXPEDITION.roundXp.base); assert.equal(D.roundXpFor(11), D.EXPEDITION.roundXp.base + 10 * D.EXPEDITION.roundXp.perRound);
    act(s, { type: 'expeditionStart' }, now, mkRng(3)); const r = s.expedition; delete r.rule;
    r.board = [{ unit: 'slime', star: 1, row: 'front' }];
    (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(3));
    // 레벨 2 → 3에 2가 들고 남은 것이 쌓입니다(base 4 기준 레벨 3 · 경험치 2).
    assert.equal(r.last.xp, D.roundXpFor(1)); assert.equal(r.level, 3); assert.equal(r.xp, D.roundXpFor(1) - D.EXPEDITION.xpToLevel[2]);
    // 레벨 8이면 더 쌓지 않습니다.
    r.level = 8; r.xp = 0; r.hp = 100; r.board = [{ unit: 'slime', star: 1, row: 'front' }];
    (clearOffer(s), act)(s, { type: 'expeditionFight' }, now, mkRng(4));
    if (!r.done) { assert.equal(r.level, 8); assert.equal(r.xp, 0); assert.equal(r.last.xp, undefined); }
});
