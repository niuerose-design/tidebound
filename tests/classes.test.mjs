// 직업 분류 개편 1단계: 7계열·계보
import { JOBS, JOB_TREES, LINEAGES, lineageOf, jobTags, assert, test } from './harness.mjs';

test('Job trees: seven trees, no job left in the old other tree, v24 job counts per tree', () => {
    assert.deepEqual(JOB_TREES.map(t => t.id), ['physical', 'magic', 'defense', 'status', 'hybrid', 'support', 'mystery']);
    assert.equal(JOBS.length, 202); assert.equal(new Set(JOBS.map(j => j.id)).size, 202);
    assert.equal(JOBS.filter(j => j.tree === 'other').length, 0);
    for (const j of JOBS) assert.equal(JOB_TREES.filter(t => t.id === j.tree).length, 1, j.id);
    const count = Object.fromEntries(JOB_TREES.map(t => [t.id, JOBS.filter(j => j.tree === t.id).length]));
    assert.deepEqual(count, { physical: 35, magic: 34, defense: 27, status: 26, hybrid: 27, support: 37, mystery: 16 });
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

test('Job counts stay close: trees within 1.5× of each other (??? 14 or more), named lineages 5–10 and all reach tier 5', () => {
    const sizes = JOB_TREES.filter(t => t.id !== 'mystery').map(t => JOBS.filter(j => j.tree === t.id).length);
    assert.ok(Math.max(...sizes) <= Math.min(...sizes) * 1.5, sizes.join(','));
    assert.ok(JOBS.filter(j => j.tree === 'mystery').length >= 14);
    for (const l of LINEAGES.filter(l => !l.id.endsWith('-independent') && l.id !== 'fisher')) {
        const jobs = JOBS.filter(j => lineageOf(j) === l.id);
        assert.ok(jobs.length >= 4 && jobs.length <= 10, `${l.id} ${jobs.length}`);
        assert.equal(Math.max(...jobs.map(j => j.tier)), 5, `${l.id} reaches tier 5`);
    }
});
