// 보스 난이도 점검(docs/boss-plan.md): 결정한 수치가 데이터에 그대로 있고, 보스 체력 배율이 던전 보스에만 적용되는지.
import { assert, test } from './harness.mjs';
const { load } = (await import('../scripts/lib/game-modules.mjs')).loadGame();

test('v3.186 boss pass 1: dungeon entry rebirths 2 · 2 · 6, hell 70 · nightmare 260 with notes, boss hp ×0.8 only on boss-scaled foes', async () => {
    const { DUNGEONS, FISH } = await load('data/world'), { DUNGEON_MODES, MONSTER_TUNING, dungeonModeTier, bossLevelScale } = await load('data/balance'), E = await load('data/encounters');
    const d = id => DUNGEONS.find(x => x.id === id);
    assert.deepEqual([d('caldera').rebirth, d('temple').rebirth, d('starSanctum').rebirth], [2, 2, 6]);
    assert.deepEqual([d('grotto').rebirth, d('kelpCatacomb').rebirth, d('cemetery').rebirth, d('ventCathedral').rebirth, d('abyss').rebirth], [0, 0, 0, 8, 3], 'others unchanged');
    assert.deepEqual(DUNGEON_MODES.map(m => m.tier), [0, 70, 260]); assert.equal(dungeonModeTier('hell'), 70); assert.equal(dungeonModeTier('nightmare'), 260);
    assert.ok(DUNGEON_MODES[1].note && DUNGEON_MODES[2].note && !DUNGEON_MODES[0].note, 'hell and nightmare say who they are for');
    assert.equal(MONSTER_TUNING.bossHpScale, .8);
    const f = FISH.find(x => x.id === 'magmaKraken'), raw = E.enemyStats(f, true), scaled = E.scaledEnemyStats(f, { boss: true, wave: 4 }), kept = E.scaledEnemyStats(f, { boss: true, wave: 4, rawBoss: true }), plain = E.scaledEnemyStats(f, { wave: 4 });
    assert.equal(scaled.hp, Math.round(Math.round(raw.hp * .8) * 1.62), 'dungeon boss hp = boss stats × 0.8 × wave pressure');
    assert.equal(kept.hp, Math.round(raw.hp * 1.62), 'rawBoss skips the scale (altar god)'); assert.equal(scaled.attack, kept.attack, 'attack untouched');
    assert.ok(scaled.hp / plain.hp > 2 && scaled.hp / plain.hp < bossLevelScale(f.level).hp, 'still a boss, but lighter than the raw boss scale');
    const Du = await load('systems/duel'), { ALTAR } = await load('data/altar');
    assert.ok(Du.abyssBossSnapshot(ALTAR.firstGod.depth).stats.hp > 9e8, 'the first god keeps its 9.3억 body');
});
