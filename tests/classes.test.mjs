// 직업 분류 개편 1단계: 7계열·계보
import { JOBS, JOB_TREES, LINEAGES, lineageOf, jobTags, assert, test } from './harness.mjs';

test('Job trees: seven trees, no job left in the old other tree, v23 job counts per tree', () => {
    assert.deepEqual(JOB_TREES.map(t => t.id), ['physical', 'magic', 'defense', 'status', 'hybrid', 'support', 'mystery']);
    assert.equal(JOBS.length, 161); assert.equal(new Set(JOBS.map(j => j.id)).size, 161);
    assert.equal(JOBS.filter(j => j.tree === 'other').length, 0);
    for (const j of JOBS) assert.equal(JOB_TREES.filter(t => t.id === j.tree).length, 1, j.id);
    const count = Object.fromEntries(JOB_TREES.map(t => [t.id, JOBS.filter(j => j.tree === t.id).length]));
    assert.deepEqual(count, { physical: 28, magic: 28, defense: 23, status: 21, hybrid: 22, support: 25, mystery: 14 });
});

test('Job trees: the old other jobs land where the plan puts them', () => {
    const tree = id => JOBS.find(j => j.id === id).tree;
    for (const id of ['fisher', 'wanderer', 'chimera', 'clockworkAngler', 'allRounder', 'bloodTide', 'spellbladeNovice', 'spellblade', 'runeKnight', 'swordSaint', 'celestialBlade']) assert.equal(tree(id), 'hybrid', id);
    for (const id of ['squidJester', 'gambler', 'relicScavenger', 'salvageMerchant', 'rareTracker', 'memoryMerchant', 'voyageScribe', 'chronicleNavigator', 'bossNaturalist', 'speciesChronicler']) assert.equal(tree(id), 'support', id);
    for (const id of ['undead', 'skeleton', 'bonecaster', 'soulHarvester', 'voidcaller', 'manaLeviathan', 'rebirthFisher', 'krakenkin']) assert.equal(tree(id), 'mystery', id);
    for (const id of ['abyssArchivist', 'abyssMimic']) assert.equal(tree(id), 'magic', id);
});

test('Lineages: every job belongs to exactly one lineage inside its own tree; independents are parentless, childless tier 1', () => {
    assert.equal(new Set(LINEAGES.map(l => l.id)).size, LINEAGES.length);
    for (const t of JOB_TREES) assert.ok(LINEAGES.some(l => l.id === `${t.id}-independent` && l.tree === t.id && l.name === '독립 수련'), t.id);
    for (const j of JOBS) {
        const matches = LINEAGES.filter(l => l.id === lineageOf(j));
        assert.equal(matches.length, 1, `${j.id} → ${lineageOf(j)}`);
        assert.equal(matches[0].tree, j.tree, `${j.id} lineage tree`);
        if (lineageOf(j).endsWith('-independent')) assert.ok(j.tier === 1 && !j.parent && !JOBS.some(c => c.parent === j.id), j.id);
    }
    for (const l of LINEAGES.filter(l => !l.id.endsWith('-independent'))) assert.ok(JOBS.some(j => lineageOf(j) === l.id), `${l.id} has jobs`);
    assert.equal(lineageOf(JOBS.find(j => j.id === 'celestialBlade')), 'spellbladeNovice');
    assert.equal(lineageOf(JOBS.find(j => j.id === 'manaLeviathan')), 'voidcaller');
    assert.equal(lineageOf(JOBS.find(j => j.id === 'woodcutter')), 'physical-independent');
    assert.deepEqual(jobTags(JOBS.find(j => j.id === 'whaler')), ['물리 폭발']);
    assert.deepEqual(jobTags(JOBS.find(j => j.id === 'corsair')), ['회피', '출혈']);
});

test('Job counts stay close: trees 21–28 (??? 14 or more), named lineages 4–8', () => {
    for (const t of JOB_TREES) {
        const n = JOBS.filter(j => j.tree === t.id).length;
        if (t.id === 'mystery') assert.ok(n >= 14, `${t.id} ${n}`); else assert.ok(n >= 21 && n <= 28, `${t.id} ${n}`);
    }
    for (const l of LINEAGES.filter(l => !l.id.endsWith('-independent') && l.id !== 'fisher')) {
        const n = JOBS.filter(j => lineageOf(j) === l.id).length;
        assert.ok(n >= 4 && n <= 8, `${l.id} ${n}`);
    }
});
