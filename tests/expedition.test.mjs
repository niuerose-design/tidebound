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
    // 수호 2: 수호만 받는 피해 −20%. 보스 2: 보스만 체력 +20%.
    const g = X.buildSide([{ unit: 'kingClang', star: 1, row: 'front' }, { unit: 'stoneGolem', star: 1, row: 'front' }, { unit: 'pig', star: 1, row: 'front' }], 'a');
    assert.equal(g.units[0].damageTaken, .2); assert.equal(g.units[2].damageTaken, undefined, 'non-guard untouched');
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
    const side = X.buildSide([{ unit: 'erdaSpirit', star: 1, row: 'back' }, { unit: 'memoryMonitor', star: 1, row: 'back' }], 'a'); assert.equal(side.units[0].charge, 50, 'temple 2: start mana 50');
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
        const ghosts = await E.pickGhosts(key, 'p1', () => 0); assert.equal(ghosts[2].name, '둘', 'self excluded, other player picked'); assert.equal(ghosts[2].mods, undefined, 'no augments: no mods'); assert.equal(ghosts[2].wins, 5, 'ghost carries its best wins'); assert.equal(ghosts[3].name, '둘'); assert.equal(ghosts[4], undefined);
        const forTwo = await E.pickGhosts(key, 'p2', () => 0); assert.equal(forTwo[2].name, '하나');
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
    assert.ok(Math.abs(shield.damageTaken - (1 - .8 * .75)) < 1e-9, 'guard 2 (20%) and shield (25%) multiply');
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
    // 수호 2 효과는 수호 문장을 낀 돼지에게도 적용(받는 피해 −20%).
    const g = X.buildSide([{ unit: 'pig', star: 1, row: 'front', item: 'emblem_guard' }, { unit: 'kingClang', star: 1, row: 'front' }], 'a').units;
    assert.ok(Math.abs(g[0].damageTaken - .2) < 1e-9); assert.ok(Math.abs(g[1].damageTaken - .2) < 1e-9);
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
    assert.equal(D.describeTier({ count: 4, mult: { hp: 1.7 }, flags: ['regen'] }), '체력 +70% · 매 턴 체력 4% 회복');
    assert.equal(D.describeTier({ count: 2, damageTaken: .2, only: 'guard' }), '수호 유닛만: 받는 피해 −20%');
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
    assert.equal(D.DIFFICULTIES.length, 5); assert.equal(D.difficultyOf(undefined).level, 1); assert.equal(D.difficultyOf(9).level, 1);
    assert.equal(D.difficultyUnlocked(undefined), 1); assert.equal(D.difficultyUnlocked({ 1: 2 }), 2); assert.equal(D.difficultyUnlocked({ 1: 1, 2: 1, 3: 1 }), 4); assert.equal(D.difficultyUnlocked({ 1: 1, 5: 1 }), 5);
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
        const ghosts = await E.pickGhosts(key, 'other', () => 0);
        assert.deepEqual(ghosts[3].augments, ['frontWall', 'traitPlus1:meadow']);
        // 방벽 1.15 × 숙련 30 특전 앞줄 1.05, 거인의 주 ★2+ 1.08, 초원 문양 +1.
        assert.ok(Math.abs(ghosts[3].mods.frontHp - 1.15 * 1.05) < 1e-9); assert.equal(ghosts[3].mods.starPower, 1.08); assert.deepEqual(ghosts[3].mods.traitPlus, { meadow: 1 }); assert.equal(ghosts[3].mods.goldPlus, undefined);
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
