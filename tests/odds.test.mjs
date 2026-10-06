// v3.52 정보 비공개 4단계(4-2): 드롭·확률 수치는 서버 전용(game/secret/odds.ts), 공개 표는 창구(game/data/odds.ts)를 읽습니다.
import fs from 'node:fs';
import { assert, test } from './harness.mjs';

const { load } = (await import('../scripts/lib/game-modules.mjs')).loadGame();

test('v3.52 odds: the server fills the window with the server-only values, and the public tables read through it', async () => {
    const { ODDS, oddsKnown } = await load('data/odds'), { SERVER_ODDS } = await load('secret/odds');
    assert.ok(oddsKnown()); assert.deepEqual(ODDS, SERVER_ODDS);
    const { BALANCE } = await load('data/balance'), { MIMIC } = await load('data/mimic'), { ONYX } = await load('data/onyx'), { APPRAISAL } = await load('data/economy'), { HABITAT } = await load('data/world');
    assert.equal(BALANCE.dropChance, SERVER_ODDS.drop.chance); assert.equal(BALANCE.tideLoot.rarityPerTier, SERVER_ODDS.drop.tideRarityPerTier);
    assert.deepEqual(MIMIC.tiers.map(t => t.chance), SERVER_ODDS.mimic.tiers); assert.equal(ONYX.dropPity, SERVER_ODDS.onyx.dropPity);
    assert.deepEqual(APPRAISAL.map(r => r.chance), SERVER_ODDS.appraisal); assert.equal(HABITAT.bigChance, SERVER_ODDS.variant.habitatBig);
    assert.ok(Math.abs(SERVER_ODDS.appraisal.reduce((a, b) => a + b, 0) - 1) < 1e-9, 'appraisal sums to 1');
});

test('v3.52 odds: the public region signature (variant names) matches the server-only region multipliers', async () => {
    const { REGION_SIGNATURE, VARIANTS } = await load('data/variants'), { SERVER_ODDS } = await load('secret/odds');
    const derived = Object.fromEntries(Object.entries(SERVER_ODDS.variant.region).map(([region, row]) => { const top = Math.max(...Object.values(row)); return [region, VARIANTS.filter(v => (row[v.id] ?? 1) === top && top > 1).map(v => v.id)]; }));
    assert.deepEqual(REGION_SIGNATURE, derived);
});

test('v3.52 odds: public data files keep no drop-table literals (the values live in game/secret/odds.ts)', () => {
    const src = fs.readdirSync('game/data').filter(f => f.endsWith('.ts')).map(f => fs.readFileSync(`game/data/${f}`, 'utf8')).join('\n');
    for (const needle of ['.5, .25, .13, .07, .035, .012, .003', '{ rarity: 1, chance: .55 }', 'bigChance: .25', 'dropChance: 0.0025', "'리스항구': { swarm: 2.5", 'chancePerTier: .0005', 'pity: 2000']) assert.ok(!src.includes(needle), needle);
});

test('v3.52 odds: the catalog carries the odds only while secrecy is off', async () => {
    const Sc = await load('server/secrecy'), { newState } = await load('systems/state'), { SERVER_ODDS } = await load('secret/odds');
    const before = process.env.TIDEBOUND_SECRECY;
    try {
        process.env.TIDEBOUND_SECRECY = 'off'; const open = await Sc.buildCatalog(newState(0), 1);
        assert.deepEqual(open.odds, SERVER_ODDS);
        process.env.TIDEBOUND_SECRECY = 'on'; const closed = await Sc.buildCatalog(newState(0), 2);
        assert.ok(!('odds' in closed)); assert.notEqual(closed.key, open.key);
    } finally { if (before === undefined) delete process.env.TIDEBOUND_SECRECY; else process.env.TIDEBOUND_SECRECY = before; }
});

test('v3.54 spawn weights: server-only, and the per-stage average table reproduces the server reward norm for the screen', async () => {
    const W = await load('data/world'), { SERVER_ODDS } = await load('secret/odds');
    assert.equal(W.FISH.find(f => f.id === 'abyssManta').spawnWeight, SERVER_ODDS.spawn.abyssManta);
    assert.equal(W.FISH.find(f => f.id === 'masteryMimic').spawnWeight, 0);
    const table = W.stageRewardAvgTable();
    for (const st of W.STAGES) for (const tier of [0, 1, 5, 10, 20, 35, 60, 100, 200]) {
        const fromTable = 1 / Math.pow(Math.max(1, W.stageAvgAt(table[st.id], tier)), Math.min(1, tier / W.TIDE_LIFT_TIERS));
        assert.ok(Math.abs(fromTable - W.stageRewardNorm(st.fish, tier)) < 1e-12, `${st.id} t${tier}`);
    }
    const src = fs.readFileSync('game/data/world.ts', 'utf8');
    assert.ok(!/spawnWeight: \.\d/.test(src), 'no weight literals left in world.ts');
});
