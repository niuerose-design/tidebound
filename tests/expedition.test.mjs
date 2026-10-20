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
