// 보스 난이도 점검(docs/boss-plan.md): 결정한 수치가 데이터에 그대로 있고, 보스 체력 배율이 던전 보스에만 적용되는지.
import { assert, test } from './harness.mjs';
const { load } = (await import('../scripts/lib/game-modules.mjs')).loadGame();

test('v3.186 boss pass 1: dungeon entry rebirths 2 · 2 · 6, hell 70 · nightmare 260 with notes, boss hp ×0.8 only on boss-scaled foes', async () => {
    const { DUNGEONS, MONSTERS } = await load('data/world'), { DUNGEON_MODES, MONSTER_TUNING, dungeonModeTier, bossLevelScale } = await load('data/balance'), E = await load('data/encounters');
    const d = id => DUNGEONS.find(x => x.id === id);
    assert.deepEqual([d('caldera').rebirth, d('temple').rebirth, d('starSanctum').rebirth], [2, 2, 6]);
    assert.deepEqual([d('grotto').rebirth, d('kelpCatacomb').rebirth, d('cemetery').rebirth, d('ventCathedral').rebirth, d('abyss').rebirth], [0, 0, 0, 8, 3], 'others unchanged');
    assert.deepEqual(DUNGEON_MODES.map(m => m.tier), [0, 70, 260]); assert.equal(dungeonModeTier('hell'), 70); assert.equal(dungeonModeTier('nightmare'), 260);
    assert.ok(DUNGEON_MODES[1].note && DUNGEON_MODES[2].note && !DUNGEON_MODES[0].note, 'hell and nightmare say who they are for');
    assert.equal(MONSTER_TUNING.bossHpScale, .8);
    const f = MONSTERS.find(x => x.id === 'magmaKraken'), raw = E.enemyStats(f, true), scaled = E.scaledEnemyStats(f, { boss: true, wave: 4 }), kept = E.scaledEnemyStats(f, { boss: true, wave: 4, rawBoss: true }), plain = E.scaledEnemyStats(f, { wave: 4 });
    assert.equal(scaled.hp, Math.round(Math.round(raw.hp * .8) * 1.62), 'dungeon boss hp = boss stats × 0.8 × wave pressure');
    assert.equal(kept.hp, Math.round(raw.hp * 1.62), 'rawBoss skips the scale (altar god)'); assert.equal(scaled.attack, kept.attack, 'attack untouched');
    assert.ok(scaled.hp / plain.hp > 2 && scaled.hp / plain.hp < bossLevelScale(f.level).hp, 'still a boss, but lighter than the raw boss scale');
    const Du = await load('systems/duel'), { ALTAR } = await load('data/altar');
    assert.ok(Du.abyssBossSnapshot(ALTAR.firstGod.depth).stats.hp > 9e8, 'the first god keeps its 9.3억 body');
});

test('v3.188 boss pass 2: onyx hp multiplier per boss with √ difficulty scaling, Mu Lung floor 1 at 3만 · ×2, the first god keeps its body at floor 59', async () => {
    const { ONYX, ONYX_BOSSES, onyxBossFor } = await load('data/onyx'), { ABYSS_TUNING } = await load('data/balance'), { ALTAR } = await load('data/altar');
    const Enc = await load('systems/encounter'), E = await load('data/encounters'), M = await load('systems/meta'), { MONSTERS } = await load('data/world'), Du = await load('systems/duel');
    assert.deepEqual(ONYX_BOSSES.map(b => b.hpMul), [5000, 1600, 750, 800, 400, 200, 120, 70, 80]); assert.equal(ONYX.hp, undefined); assert.equal(ONYX.attack, 3);
    const top = MONSTERS.find(f => f.id === 'arTrueErda'), def = onyxBossFor('아케인 리버'), f = { ...MONSTERS.find(x => x.id === def.id), level: top.level, hp: top.hp * def.hpMul, attack: top.attack * 3, defense: top.defense };
    const flat = Enc.onyxEnemyStats(f, 0), lifted = Enc.onyxEnemyStats(f, 5), plain = E.scaledEnemyStats(f, { tier: 0 });
    assert.equal(flat.hp, plain.hp, 'difficulty 0: plain body'); assert.equal(lifted.hp, Math.round(plain.hp * Math.sqrt(M.tierHealth(5))), 'hp grows by √tierHealth');
    assert.equal(lifted.attack, Math.round(plain.attack * Math.sqrt(M.tierAttack(5))), 'attack by √tierAttack'); assert.ok(lifted.hp < Math.round(plain.hp * M.tierHealth(5)), 'gentler than stage monsters');
    assert.deepEqual([ABYSS_TUNING.hp, ABYSS_TUNING.attack, ABYSS_TUNING.hpGrowth, ABYSS_TUNING.attackGrowth], [30000, 2, 1.15, 1.08]);
    assert.equal(ALTAR.firstGod.depth, 59); const god = Du.abyssBossSnapshot(ALTAR.firstGod.depth).stats; assert.ok(god.hp > 9e8 && god.hp < 1.05e9, `god hp ${god.hp}`);
});

test('v3.191 world boss summon stages: hp ×2 · attack ×1.15 per stage (max 10), +1 after a kill on the same day, same stage after it leaves, back to 1 after a day; DoT hp-ratio stays on stage-1 hp', async () => {
    const A = await load('data/altar'), Du = await load('systems/duel'), C = await load('systems/combat');
    assert.deepEqual([A.RAID_STAGE.hp, A.RAID_STAGE.attack, A.RAID_STAGE.defense, A.RAID_STAGE.max, A.RAID_STAGE.dayMs], [2, 1.15, 1, 10, 24 * 3600_000]);
    const z = A.RAIDS.find(r => r.id === 'zakum'), s1 = A.raidStageStats(z, 1), s3 = A.raidStageStats(z, 3), s99 = A.raidStageStats(z, 99);
    assert.deepEqual(s1, z.stats, 'stage 1 is the base'); assert.equal(s3.hp, z.stats.hp * 4); assert.equal(s3.attack, Math.round(z.stats.attack * 1.15 ** 2)); assert.equal(s3.defense, z.stats.defense, 'defense multiplier 1 → unchanged');
    assert.equal(s99.hp, z.stats.hp * 2 ** 9, 'capped at stage 10');
    const t0 = 1_700_000_000_000, day = A.RAID_STAGE.dayMs;
    assert.deepEqual(A.nextRaidStage(undefined, t0), { stage: 1, dayStart: t0 }, 'no record → stage 1');
    assert.deepEqual(A.nextRaidStage({ stage: 1, day_start: 0, state: 'slain' }, t0), { stage: 1, dayStart: t0 }, 'old rows without a day → stage 1');
    assert.deepEqual(A.nextRaidStage({ stage: 1, day_start: t0, state: 'slain' }, t0 + 3 * 3600_000), { stage: 2, dayStart: t0 }, 'slain on the same day → +1');
    assert.deepEqual(A.nextRaidStage({ stage: 3, day_start: t0, state: 'gone' }, t0 + 9 * 3600_000), { stage: 3, dayStart: t0 }, 'left unslain → same stage');
    assert.deepEqual(A.nextRaidStage({ stage: 10, day_start: t0, state: 'slain' }, t0 + 20 * 3600_000), { stage: 10, dayStart: t0 }, 'max 10');
    assert.deepEqual(A.nextRaidStage({ stage: 5, day_start: t0, state: 'slain' }, t0 + day), { stage: 1, dayStart: t0 + day }, 'a day after the first summon → stage 1');
    // 결투 상대: 단계 능력치 + 지속 피해 기준 체력 상한(1단계 체력).
    const snap1 = Du.raidBossSnapshot(z), snap3 = Du.raidBossSnapshot(z, undefined, 3), part3 = Du.raidBossSnapshot(z, 777, 3);
    assert.equal(snap1.stats.hp, z.stats.hp); assert.equal(snap3.stats.hp, z.stats.hp * 4); assert.equal(part3.stats.hp, 777); assert.equal(snap3.stats.attack, s3.attack);
    assert.equal(snap1.dotHpCap, z.stats.hp); assert.equal(snap3.dotHpCap, z.stats.hp, 'cap is always the stage-1 hp'); assert.equal(snap3.power > snap1.power, true);
    // 전투: 중독 틱의 체력 비례분이 dotHpCap 아래에서 셈. 상한이 없으면 현재 체력 그대로.
    const base = { hp: 1000, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 200, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const victim = cap => ({ name: 'V', stats: { ...base, hp: 1e6 }, hp: 1e6, ...(cap ? { dotHpCap: cap } : {}), mana: 0, skills: [], cooldowns: {}, stun: 0, effects: { poison: { perStack: 0, stacks: 1, turns: 3, hpRatio: .01 } }, ranks: {}, mastery: {}, practice: {} });
    const other = () => ({ name: 'O', stats: { ...base, hp: 1e9, defense: 1e9 }, hp: 1e9, mana: 0, skills: [], cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {} });
    const plain = victim(), capped = victim(1e5), low = victim(5e6);
    C.actTurn(plain, other(), () => .5, () => {}); C.actTurn(capped, other(), () => .5, () => {}); C.actTurn(low, other(), () => .5, () => {});
    assert.equal(1e6 - plain.hp, 10_000, 'no cap: 1% of current hp'); assert.equal(1e6 - capped.hp, 1_000, 'cap 1e5: 1% of the cap'); assert.equal(1e6 - low.hp, 10_000, 'a cap above current hp changes nothing');
    // 서버 흐름(파일 DB): 게이지가 차서 소환 → 격파 → 대기 뒤 다시 소환되면 2단계(체력 ×2) → 하루가 지나면 1단계.
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const file = path.join(os.tmpdir(), `tb-raid-stage-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    const Alt = await load('server/altar'), DB = await load('server/db'), { newState } = await load('systems/engine');
    try {
        // 다른 테스트 파일이 같은 파일 DB로 발록 · 자쿰을 이미 소환 · 격파했으므로 혼테일로 봅니다.
        const database = DB.db(), b = A.RAIDS.find(r => r.id === 'horntail'), now = Date.now(), me = newState(now), raid = async () => (await database.listAltarRaids()).find(r => r.id === 'horntail');
        await database.addAltarGauge('horntail', b.cost); Alt.invalidateAltar(); let info = await Alt.altarInfo('p1', me, now);
        let row = await raid(); assert.equal(row.state, 'alive'); assert.equal(row.stage, 1); assert.equal(row.day_start, now); assert.equal(row.hp_max, b.stats.hp); assert.equal(info.raids.find(x => x.id === 'horntail').stage, 1);
        assert.equal(await database.hitAltarRaid('horntail', row.gen, row.hp_max), 0); assert.ok(await database.slayAltarRaid('horntail', row.gen, 'p1', '첫째', now + 1000));
        const now2 = now + A.RAID.respawnMs + 60_000; await database.addAltarGauge('horntail', b.cost); Alt.invalidateAltar(); info = await Alt.altarInfo('p1', me, now2);
        row = await raid(); assert.equal(row.state, 'alive'); assert.equal(row.stage, 2, 'second summon of the day'); assert.equal(row.day_start, now, 'the day still starts at the first summon'); assert.equal(row.hp_max, b.stats.hp * 2);
        const ib = info.raids.find(x => x.id === 'horntail'); assert.equal(ib.stage, 2); assert.equal(ib.hpMax, b.stats.hp * 2); assert.equal(ib.attack, Math.round(b.stats.attack * 1.15)); assert.ok(ib.power > 0);
        me.altarStatus = undefined; Alt.invalidateAltar(); await Alt.syncAltarStatus(me, now2 + 5, 'p1'); assert.equal(me.altarStatus.raids.find(x => x.id === 'horntail').stage, 2, 'status carries the stage');
        // 2단계도 격파 → 같은 날 세 번째 소환은 3단계(체력 ×4). (못 잡고 떠난 뒤 같은 단계로 남는 것은 위 nextRaidStage 단위 검사 — 혼테일은 24시간 머물러 여기서 재현할 수 없음.)
        assert.equal(await database.hitAltarRaid('horntail', row.gen, row.hp_max), 0); assert.ok(await database.slayAltarRaid('horntail', row.gen, 'p1', '첫째', now2 + 1000));
        const now3 = now2 + A.RAID.respawnMs + 60_000; await database.addAltarGauge('horntail', b.cost); Alt.invalidateAltar(); await Alt.altarInfo('p1', me, now3);
        row = await raid(); assert.equal(row.state, 'alive'); assert.equal(row.stage, 3, 'third summon of the day'); assert.equal(row.hp_max, b.stats.hp * 4); assert.ok(now3 - now < A.RAID_STAGE.dayMs, 'still the same day');
        assert.equal(await database.hitAltarRaid('horntail', row.gen, row.hp_max), 0); assert.ok(await database.slayAltarRaid('horntail', row.gen, 'p1', '첫째', now3 + 1000));
        // 하루가 지나면 1단계.
        const now4 = now + A.RAID_STAGE.dayMs + 60_000; await database.addAltarGauge('horntail', b.cost); Alt.invalidateAltar(); await Alt.altarInfo('p1', me, now4);
        row = await raid(); assert.equal(row.stage, 1, 'a day later → stage 1'); assert.equal(row.day_start, now4); assert.equal(row.hp_max, b.stats.hp);
        assert.equal(Alt.ALTAR_NEWS.raidAppear('발록', 6, 3).includes('3단계 — 체력 ×4'), true); assert.equal(Alt.ALTAR_NEWS.raidAppear('발록', 6).includes('단계'), false);
    } finally { delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});

test('v3.194 world boss kills open no blessing; blessing events use the live level (high tiers fall back to 3 once their time is over)', async () => {
    const A = await load('data/altar'), fs = await import('node:fs/promises'), H = 3600_000, now = 1_800_000_000_000;
    assert.ok(A.RAIDS.every(r => !('blessings' in r) && !('blessingHours' in r)), 'raids carry no blessing reward');
    const server = await fs.readFile('game/server/altar.ts', 'utf8'), db = await fs.readFile('game/server/db.ts', 'utf8'), events = await fs.readFile('game/server/events-config.ts', 'utf8');
    assert.doesNotMatch(server, /extendAltarGauge|raid\.blessing/, 'the kill path no longer touches blessing gauges'); assert.doesNotMatch(db, /extendAltarGauge/);
    assert.match(events, /blessingEffect\(b, effectiveBlessingLevel\(g, now\)\)/, 'server event multiplier uses the live level, same as the screen');
    assert.equal(A.effectiveBlessingLevel({ until: now + 9 * H, level: 6, high_until: now - H }, now), 3, 'stored 6 after its high time reads as 3');
});
