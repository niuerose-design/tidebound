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
        // v3.311 참여 보상은 단계 보상(raidReward): 2단계 참여 + 마지막 일격 = 15 + 1 + 15 세계석 · 2 + 1 SP, 최고 격파 단계 2 기록.
        await database.bumpRaidHit(row.gen, 'p1', '첫째', 12345, now2 + 500);
        assert.equal(await database.hitAltarRaid('horntail', row.gen, row.hp_max), 0); assert.ok(await database.slayAltarRaid('horntail', row.gen, 'p1', '첫째', now2 + 1000));
        { const pearls = me.pearls, sp = me.sp; me.altarStatus = undefined; Alt.invalidateAltar(); await Alt.syncAltarStatus(me, now2 + 2000, 'p1'); assert.equal(me.pearls - pearls, 31); assert.equal(me.sp - sp, 3); assert.equal(me.raidBest.horntail, 2); assert.equal(me.altar.raidClaimedBy.horntail, row.gen); }
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

test('v3.311 fourth world boss: shorter summon waits, pink bean with statue ward (immunity by generation), high penetration, stand-piercing judgement, stage rewards, records', async () => {
    const A = await load('data/altar'), Du = await load('systems/duel'), C = await load('systems/combat'), E = await load('data/encounters'), { ACHIEVEMENTS } = await load('data/achievements'), { TITLES } = await load('data/titles'), { newState } = await load('systems/engine');
    const pb = A.RAIDS.find(r => r.id === 'pinkBean'), ht = A.RAIDS.find(r => r.id === 'horntail');
    // 소환 대기: 격파 뒤 1시간, 소환 비용 −25%, 혼테일 12시간. 핑크빈은 혼테일 위(체력 ×5 · 관통 0.7 · 석상의 가호 · 지속 피해 기준 체력은 혼테일 1단계).
    assert.equal(A.RAID.respawnMs, 3600_000); assert.deepEqual(A.RAIDS.map(r => A.raidRespawnMs(r)), [5 * 60_000, 10 * 60_000, 3600_000, 3600_000], 'v3.312 balrog 5min · zakum 10min'); assert.equal(A.respawnLabel(5 * 60_000), '5분'); assert.equal(A.respawnLabel(3600_000), '1시간');
    assert.deepEqual(A.RAIDS.map(r => r.cost), [150000, 400000, 900000, 2000000], 'v3.312 ×10 (no gold on summon gauges) · v3.314 ×10 again with pearls at 5,000'); assert.deepEqual(A.RAIDS.map(r => r.lifetimeHours), [6, 12, 12, 24]);
    assert.ok(pb && pb.statueWard && pb.stats.hp > ht.stats.hp && pb.stats.penetration === .7 && pb.dotHpCap === ht.stats.hp && pb.level > ht.level && !ht.statueWard);
    assert.equal(A.raidImmunity(pb, 1), 'physical'); assert.equal(A.raidImmunity(pb, 2), 'magic'); assert.equal(A.raidImmunity(ht, 1), undefined);
    assert.equal(A.raidImmunity(pb, 7), 'physical'); assert.equal(A.isRaidGauge('pinkBean'), true); assert.deepEqual(A.SUMMON_GAUGE_IDS, ['god', 'balrog', 'zakum', 'horntail', 'pinkBean']);
    // 단계 보상: 단계마다 참여 세계석 +1, 5단계부터 마지막 일격 SP +1.
    assert.deepEqual(A.raidReward(ht, 1, false), { pearls: 15, sp: 2 }); assert.deepEqual(A.raidReward(ht, 5, false), { pearls: 19, sp: 2 });
    assert.deepEqual(A.raidReward(ht, 4, true), { pearls: 33, sp: 3 }); assert.deepEqual(A.raidReward(ht, 5, true), { pearls: 34, sp: 4 }); assert.deepEqual(A.raidReward(ht, 99, true), A.raidReward(ht, 10, true), 'capped at max stage');
    // 결투 상대: 세대에 따라 면역, 지속 피해 기준 체력은 혼테일 1단계 체력, 고유 기술.
    const s1 = Du.raidBossSnapshot(pb, undefined, 1, 1), s2 = Du.raidBossSnapshot(pb, undefined, 3, 2), s0 = Du.raidBossSnapshot(ht, undefined, 1, 1);
    assert.equal(s1.immune, 'physical'); assert.equal(s2.immune, 'magic'); assert.equal(s0.immune, undefined); assert.equal(s1.dotHpCap, ht.stats.hp); assert.equal(s2.stats.hp, pb.stats.hp * 4);
    assert.ok(s1.skills.includes('pbJudgement') && s1.skills.includes('pbBeam') && s1.skills.includes('foeWard')); assert.ok(E.enemySkillById('pbJudgement').ignoreStand && !E.enemySkillById('pbBeam').ignoreStand);
    // 전투: 면역인 유형의 직접 피해 · 지속 피해 · 반격은 0, 다른 유형은 그대로. 복합 피해는 절반만.
    const base = { hp: 1e6, attack: 1000, magic: 1000, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 200, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5, thorns: 0 };
    const fighter = (o = {}) => ({ name: 'F', stats: { ...base, ...(o.stats || {}) }, hp: 1e6, mana: 200, skills: [], cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {}, ...o });
    const hit = (att, def) => { C.actTurn(att, def, () => .5, () => {}); return 1e6 - def.hp; };
    assert.ok(hit(fighter(), fighter()) > 0, 'physical basic lands'); assert.equal(hit(fighter(), fighter({ immune: 'physical' })), 0, 'physical immune: 0 from a physical basic'); assert.ok(hit(fighter(), fighter({ immune: 'magic' })) > 0, 'magic immune: physical basic still lands');
    assert.ok(hit(fighter({ magicBasic: true }), fighter()) > 0); assert.equal(hit(fighter({ magicBasic: true }), fighter({ immune: 'magic' })), 0, 'magic immune: 0 from a magic basic'); assert.ok(hit(fighter({ magicBasic: true }), fighter({ immune: 'physical' })) > 0);
    const splitPlain = hit(fighter({ splitBasic: true }), fighter()), splitHalf = hit(fighter({ splitBasic: true }), fighter({ immune: 'physical' }));
    assert.ok(splitHalf > 0 && splitHalf < splitPlain, 'split damage: only the immune half is 0');
    // v3.315 지속 피해 면역은 거는 공격의 유형으로: 물리 기술의 출혈 · 중독은 물리 면역에, 마법 기술의 화상은 마법 면역에 막히고 반대 유형에는 걸립니다.
    const dotOf = (skill, immune) => { const v = fighter(immune ? { immune } : {}); C.actTurn(fighter({ foe: true, skills: [skill] }), v, () => 0, () => {}); return v.effects; };
    assert.ok(dotOf('foeBarbs').dot && !dotOf('foeBarbs', 'physical').dot && dotOf('foeBarbs', 'magic').dot, 'physical bleed skill');
    assert.ok(dotOf('foeVenom').poison && !dotOf('foeVenom', 'physical').poison && dotOf('foeVenom', 'magic').poison, 'physical (status-only) poison skill');
    assert.ok(dotOf('foeBurn').burn && !dotOf('foeBurn', 'magic').burn && dotOf('foeBurn', 'physical').burn, 'magic burn skill');
    assert.ok(dotOf('onyxBrand', 'physical').dot && dotOf('onyxBrand', 'magic').dot, 'split attack: the bleed still lands');
    const bleeder = fighter({ immune: 'physical', effects: { dot: { name: '출혈', damage: 100, turns: 3, hpRatio: 0 }, poison: { perStack: 100, stacks: 1, turns: 3, hpRatio: 0 } } });
    C.actTurn(bleeder, fighter({ stats: { defense: 1e9, resist: 1e9 } }), () => .5, () => {}); assert.ok(bleeder.effects.dot, 'ticking is unchanged: immunity blocks applying');
    const thornsTank = fighter({ stats: { thorns: 1, defense: 500 } }); const boss = fighter({ immune: 'physical' }); C.actTurn(boss, thornsTank, () => .5, () => {}); assert.equal(boss.hp, 1e6, 'physical immune: no reflected damage');
    const thornsTank2 = fighter({ stats: { thorns: 1, defense: 500 } }); const boss2 = fighter({ immune: 'magic' }); C.actTurn(boss2, thornsTank2, () => .5, () => {}); assert.ok(boss2.hp < 1e6, 'magic immune: reflected damage lands');
    // 버팀 무시: 석상의 심판에 쓰러지면 無(jobStand)로 버티지 못하고, 다른 공격에는 버팁니다.
    const stander = () => fighter({ hp: 10, jobStand: { charges: 3 } }), judge = () => fighter({ foe: true, skills: ['pbJudgement'], stats: { attack: 1e6 } }), basic = () => fighter({ foe: true, stats: { attack: 1e6 } });
    const v1 = stander(); C.actTurn(basic(), v1, () => 0, () => {}); assert.equal(v1.hp, 1, 'a plain blow is endured at hp 1'); assert.equal(v1.effects.lastStand, 1);
    const v2 = stander(); const logs = []; C.actTurn(judge(), v2, () => 0, t => logs.push(t)); assert.equal(v2.hp, 0, 'judgement pierces the stand'); assert.ok(!v2.effects.lastStand, 'no charge spent'); assert.ok(logs.join(' ').includes('석상의 심판') && logs.join(' ').includes('버티지 못함'));
    // 업적 · 칭호: 보스별 참여 격파 최고 단계(raidBest).
    const s = newState(0); const ach = id => ACHIEVEMENTS.find(a => a.id === id);
    assert.ok(ach('raidPinkBean:1')?.honor && ach('raidHorntail:10')?.honor && ach('raidZakum:5')?.honor);
    assert.equal(ach('raidPinkBean:1').progress(s), 0); s.raidBest = { pinkBean: 3, horntail: 5 }; assert.equal(ach('raidPinkBean:1').progress(s), 3); assert.equal(ach('raidHorntail:5').progress(s), 5); assert.equal(ach('raidZakum:5').progress(s), 0);
    assert.ok(['raidHorntail:5', 'raidPinkBean:1', 'raidPinkBean:5'].every(id => TITLES.some(t => t.id === id && t.achievement === id && ach(id))));
});

test('v3.312 summon gauges take no gold (blessings still do); balrog waits 5 minutes after a kill, zakum 10', async () => {
    const A = await load('data/altar'), Alt = await load('server/altar');
    assert.deepEqual(A.GAUGE_IDS.map(A.gaugeTakesGold), A.GAUGE_IDS.map(id => !A.SUMMON_GAUGE_IDS.includes(id)));
    assert.ok(A.gaugeTakesGold('gold') && !A.gaugeTakesGold('god') && !A.gaugeTakesGold('pinkBean'));
    assert.throws(() => Alt.parseOffering('acc-g1', { gold: 1000, gauge: 'balrog' }, 1), /골드를 바칠 수 없습니다/);
    assert.throws(() => Alt.parseOffering('acc-g2', { gold: 1000, pearls: 1, gauge: 'god' }, 1), /골드를 바칠 수 없습니다/);
    assert.equal(Alt.parseOffering('acc-g3', { pearls: 1, gauge: 'zakum' }, 1).points, A.ALTAR.pearlPoints, 'pearls still feed a summon gauge');
    assert.equal(Alt.parseOffering('acc-g4', { gold: 1000, gauge: 'gold' }, 1).points, 1, 'a blessing gauge takes gold');
    // 서버 흐름(파일 DB): 발록은 격파 5분 뒤에 다시 소환되고, 그 전에는 게이지가 차 있어도 기다립니다.
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const file = path.join(os.tmpdir(), `tb-raid-respawn-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    const DB = await load('server/db'), { newState } = await load('systems/engine');
    try {
        const database = DB.db(), b = A.RAIDS.find(r => r.id === 'balrog'), now = Date.now(), me = newState(now), raid = async () => (await database.listAltarRaids()).find(r => r.id === 'balrog');
        await database.addAltarGauge('balrog', b.cost); Alt.invalidateAltar(); await Alt.altarInfo('p1', me, now);
        let row = await raid(); assert.equal(row.state, 'alive'); const stage1 = row.stage;
        assert.equal(await database.hitAltarRaid('balrog', row.gen, row.hp_max), 0); assert.ok(await database.slayAltarRaid('balrog', row.gen, 'p1', now + 1000));
        await database.addAltarGauge('balrog', b.cost); Alt.invalidateAltar(); const info = await Alt.altarInfo('p1', me, now + 3 * 60_000);
        row = await raid(); assert.equal(row.state, 'slain', 'three minutes after the kill: still waiting'); assert.match(info.gauges.find(g => g.id === 'balrog').next, /격파 뒤 대기 중/);
        Alt.invalidateAltar(); await Alt.altarInfo('p1', me, now + 6 * 60_000);
        row = await raid(); assert.equal(row.state, 'alive', 'six minutes after the kill: summoned again'); assert.equal(row.stage, Math.min(A.RAID_STAGE.max, stage1 + 1), 'one stage up (the file DB is shared with earlier test files)');
    } finally { delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});
