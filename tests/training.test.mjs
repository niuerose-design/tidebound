// v3.69 독립 수련 통합(docs/concept.md 11.8): 옛 독립 수련 27개 → 계열별 수련 직업 6개.
import { newState, act, canChangeJob, migrateState, stats, JOBS, SKILLS, assert, test } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';

const { load } = loadGame(), T = await load('game/data/training.js'), P = await load('game/systems/progression.js'), S = await load('game/systems/stats.js'), { lineageOf } = await load('game/data/classes.js');
const job = id => JOBS.find(j => j.id === id);

test('v3.69 training: six training jobs absorb the 27 old independents; every old skill keeps its id under a new owner', () => {
    const ids = Object.keys(T.TRAINING_GROUPS);
    assert.equal(ids.length, 6); assert.equal(T.RETIRED_TRAINING.length, 27); assert.equal(new Set(T.RETIRED_TRAINING).size, 27);
    for (const id of ids) { const j = job(id); assert.ok(j && j.tier === 1 && lineageOf(j) === `${j.tree}-independent` && j.subRole === 'training' && !j.retired, id); }
    // v3.80 숙달 목표 = 패시브 마지막 숙련 단계(225,000) × 40%.
    for (const id of ids) assert.equal(P.jobMasteryTarget(job(id)), 90_000, id);
    for (const old of T.RETIRED_TRAINING) { assert.ok(job(old).retired, old); assert.equal(SKILLS.filter(sk => sk.job === old).length, 0, `${old} owns nothing now`); }
    // 지도 제작자는 둘로: 교란 → 마법 수련, 측량(드롭) → 보조 수련. 척후병의 출혈·중독 → 상태이상 수련.
    const owner = id => SKILLS.find(sk => sk.id === id).job;
    assert.equal(owner('currentJam'), 'trainingMagic'); assert.equal(owner('chartedCurrents'), 'trainingSupport');
    assert.equal(owner('cut'), 'trainingStatus'); assert.equal(owner('rottenBait'), 'trainingStatus');
    assert.equal(owner('axeArm'), 'trainingPhysical'); assert.equal(owner('innerBreath'), 'trainingDefense'); assert.equal(owner('twoHanded'), 'trainingHybrid');
    assert.ok(T.RETIRED_TRAINING.every(id => JOBS.some(j => j.id === id)), 'kept in the table for old records');
});

test('v3.69 training: retired jobs refuse the job change even when mastered; training jobs hunt weak and earn about a third', () => {
    const s = newState(0); s.level = 20; Object.assign(s.attributes, { str: 20, dex: 20, int: 20, vit: 20, wis: 20, luk: 20 });
    assert.equal(canChangeJob(s, 'woodcutter'), false); s.jobMastery.woodcutter = 1e9; assert.equal(canChangeJob(s, 'woodcutter'), false, 'retired even when mastered');
    assert.equal(canChangeJob(s, 'trainingPhysical'), true);
    const j = job('trainingPhysical'); assert.ok(j.attack <= .35 && j.magic <= .35 && j.hp <= .4 && j.rewardScale === .35);
    const base = { ...newState(0), level: 20 }, fisherGold = S.goldMultiplier(base), fisherExp = S.expMultiplier(base);
    const train = { ...base, job: 'trainingPhysical' };
    assert.ok(Math.abs(S.goldMultiplier(train) - fisherGold * .35) < 1e-9 && Math.abs(S.expMultiplier(train) - fisherExp * .35) < 1e-9);
    assert.ok(stats(train).attack < stats(base).attack, 'weaker than the beginner');
});

test('v3.69 training: a save sitting in an old independent job moves to its training job and keeps its skills and records', () => {
    const s = newState(0); s.level = 20; s.job = 'noviceMonk'; s.unlockedJobs.push('noviceMonk'); s.jobMastery.noviceMonk = 400; s.learned.innerBreath = 2; s.skills = ['hook', 'innerBreath'];
    migrateState(s); migrateState(s);
    assert.equal(s.job, 'trainingDefense'); assert.ok(s.unlockedJobs.includes('trainingDefense') && s.unlockedJobs.includes('noviceMonk'));
    assert.equal(s.jobMastery.noviceMonk, 400, 'old mastery kept'); assert.equal(s.learned.innerBreath, 2); assert.deepEqual(s.skills, ['hook', 'innerBreath']);
    assert.ok(stats(s).hpRegen >= 3, 'the passive still works in the training job');
    act(s, { type: 'job', id: 'fisher' }, 0); assert.throws(() => act(s, { type: 'job', id: 'noviceMonk' }, 0));
});

test('v3.69 training passives: tier-3 strength from level 1, tier-3 mastery milestones, old inheritance kept once', () => {
    const passives = SKILLS.filter(sk => sk.job?.startsWith('training') && sk.type === 'passive');
    assert.ok(passives.length >= 20);
    for (const sk of passives) { assert.deepEqual(P.masteryMilestonesFor(sk), [4500, 22500, 84000, 225000], sk.id); if (T.TRAINING_DESC[sk.id]) assert.ok(sk.desc === T.TRAINING_DESC[sk.id] && !/\d/.test(sk.desc), `${sk.id} desc has no stale numbers`); }
    assert.equal(SKILLS.find(sk => sk.id === 'axeArm').bonus.attack, 45); assert.equal(SKILLS.find(sk => sk.id === 'driftwoodGuard').bonus.swarmFind, .3, 'rule values are not scaled');
    // 예전 기준(250)으로 계승 자격이 있던 세이브는 유지, 새 세이브는 새 기준(4,500).
    const old = newState(0); delete old.trainingRescaled; old.skillPractice.axeArm = 300; old.skillPractice.keenEye = 100;
    migrateState(old); migrateState(old);
    assert.ok(old.legacyInherited.axeArm && !old.legacyInherited?.keenEye && old.trainingRescaled);
    const fresh = newState(0); fresh.skillPractice.axeArm = 300; migrateState(fresh); assert.ok(!fresh.legacyInherited?.axeArm, 'new saves use the new bar');
});

test('v3.69 mastered job count: retired independents no longer count, for old saves too', () => {
    const s = newState(0); s.jobMastery.woodcutter = 1e9; s.jobMastery.harpoon = 1e9;
    assert.equal(P.masteredJobCount(s), 1);
});

test('v3.70 stat training I-III: opened by 1M training mastery, each step needs the previous one mastered, passives raise base attributes and can be inherited', () => {
    const s = newState(0); s.level = 30;
    for (const [stat, parent] of [['str', 'trainingPhysical'], ['int', 'trainingMagic'], ['vit', 'trainingDefense'], ['luk', 'trainingStatus'], ['wis', 'trainingHybrid'], ['dex', 'trainingSupport']]) {
        const [i1, i2, i3] = [1, 2, 3].map(n => job(`${stat}Training${n}`));
        assert.ok(i1.parent === parent && i2.parent === i1.id && i3.parent === i2.id, stat);
        assert.deepEqual([i1.mastery, i1.masteryTarget, i2.mastery, i2.masteryTarget, i3.mastery, i3.masteryTarget], [1e6, 1e7, 1e7, 2.5e7, 2.5e7, 5e7], stat);
        assert.ok([i1, i2, i3].every(j => j.subRole === 'training' && j.rewardScale === .35 && lineageOf(j) === lineageOf(job(parent))), stat);
    }
    assert.equal(canChangeJob(s, 'strTraining1'), false); s.jobMastery.trainingPhysical = 999_999; assert.equal(canChangeJob(s, 'strTraining1'), false);
    s.jobMastery.trainingPhysical = 1_000_000; assert.equal(canChangeJob(s, 'strTraining1'), true); assert.equal(canChangeJob(s, 'strTraining2'), false);
    // 패시브: 기본 능력치(근력) 자체가 오릅니다. 다른 직업이 계승(첫 숙련 단계 1,000만)하면 그 직업에서도 오릅니다.
    const h = newState(0); h.level = 30; h.job = 'harpoon'; h.learned.strDrill1 = 1; h.skills = ['strDrill1'];
    const before = stats({ ...h, skills: [] }).attack;
    assert.equal(stats(h).attack, before, 'not inherited yet: no effect');
    h.skillPractice.strDrill1 = 10_000_000; const S1 = S.trainedAttributes(h).str, base = S.trainedAttributes({ ...h, skills: [] }).str;
    assert.equal(S1 - base, 25, '+20 × (1 + 25% for the first mastery stage)');
    assert.deepEqual([1, 2, 3].map(n => SKILLS.find(sk => sk.id === `strDrill${n}`).cost), [4, 6, 8], 'high AP cost'); assert.ok(stats(h).attack > before);
});

test('v3.80 job mastery targets follow skill milestones (40% of the last); jobs mastered under the old target stay mastered', async () => {
    const Sk = await load('game/data/skills.js');
    const whaler = job('whaler'), old = Sk.LEGACY_MASTERY_TARGET.whaler;
    assert.ok(old < P.jobMasteryTarget(whaler), 'target went up');
    const s = newState(0); delete s.masteryAligned; s.jobMastery.whaler = old; s.jobMastery.harpoon = 1;
    assert.equal(P.jobMastered(s, whaler), false);
    migrateState(s); migrateState(s);
    assert.deepEqual(s.masteryKept, ['whaler']); assert.equal(P.jobMastered(s, whaler), true); assert.equal(P.masteredJobCount(s), 1);
    const n = newState(0); n.jobMastery.whaler = old; migrateState(n); assert.equal(P.jobMastered(n, whaler), false, 'new saves use the new target');
});

test('v3.80 skill mastery standard: one curve per tier (×1.4 long-term), custom ones within ±50%, constraint skills in tens of millions; old inheritance kept when the first stage went up', async () => {
    const Sk = await load('game/data/skills.js'), R = await load('game/data/roles.js');
    const bad = [];
    for (const sk of SKILLS) {
        const j = job(sk.job); if (!j || j.tier < 1 || j.retired) continue;
        const exempt = /^training|Training[123]$|[hH]acker$/.test(j.id) || ['border', 'borderBuffer'].includes(R.subRoleOf(j, lineageOf(j)));
        if (exempt) continue;
        // 제약형(최대 숙련에서 AP 0 이하 · 제약 직업): 마지막 단계가 천만 단위(AP 반환 5,000만 · 그 밖 1,000만).
        if (Sk.isConstraintSkill(sk)) { const want = Sk.CONSTRAINT_MASTERY_BY_SKILL[sk.id] ?? (Sk.costAtMastery(sk) < 0 ? 5e7 : 1e7); if (P.masteryMilestonesFor(sk).at(-1) !== want) bad.push(`${sk.id} constraint`); continue; }
        const r = P.masteryMilestonesFor(sk).at(-1) / Sk.SKILL_TIER_CURVE[Math.min(5, j.tier)].at(-1);
        if (r < .5 || r > 1.5) bad.push(`${sk.id} ×${r.toFixed(2)}`);
    }
    assert.deepEqual(bad, []);
    assert.deepEqual(P.masteryMilestonesFor(SKILLS.find(sk => sk.id === 'emptyPalm')), [600, 3000, 12000, 36000], 'moved 2nd-tier hidden jobs use the 2nd-tier curve');
    assert.deepEqual(P.masteryMilestonesFor(SKILLS.find(sk => sk.id === 'boneLegacy')), [1e5, 1e6, 5e6], 'bone legacy (AP −3): v3.80 exception, one zero off');
    assert.equal(P.jobMasteryTarget(job('undead')), 5600, 'constraint skills do not slow the job mastery');
    const s = newState(0); delete s.masteryAligned; s.skillPractice.emptyPalm = 300; s.skillPractice.riseAgain = 100;
    migrateState(s); assert.ok(s.legacyInherited?.emptyPalm && !s.legacyInherited?.riseAgain, 'kept only above the old first stage');
});

test('v3.83 utility gain ×1.5: gold/exp/drop bonuses of utility job skills only, applied once', async () => {
    const Sk = await load('game/data/skills.js');
    const bonus = id => SKILLS.find(sk => sk.id === id).bonus;
    assert.equal(Sk.UTILITY_GAIN_SCALE, 1.5);
    assert.deepEqual([bonus('tradeEmpire').goldBonus, bonus('tradeEmpire').dropBonus], [.3, .09], 'seaTradeKing .2/.06 → .3/.09');
    assert.equal(bonus('voyageReview').expBonus, .12);
    assert.equal(bonus('chartedCurrents').goldBonus, .06, 'training (not utility) unchanged');
    assert.equal(bonus('harmonics').expBonus, .04, 'border jobs unchanged');
    Sk.scaleUtilityGain(SKILLS); assert.equal(bonus('tradeEmpire').goldBonus, .3, 'calling again does not scale twice');
});

test('v3.84 penetration: sources stack multiplicatively (no 0.6 wall, 0.85 total cap), research 3% per rank, owned gear lines ×2 once; boss damage stacks multiplicatively', async () => {
    const B = await load('game/data/balance.js');
    assert.ok(Math.abs(B.stackPenetration(.3, .2) - .44) < 1e-9, '1 − 0.7 × 0.8');
    assert.ok(Math.abs(B.stackPenetration(.5, -.1) - .4) < 1e-9, 'penalties still subtract');
    const s = newState(0); s.permanent.penetration = 15;
    assert.ok(Math.abs(stats(s).penetration - .45) < 1e-9, 'research 15 ranks = 45%');
    assert.ok(Math.abs(B.stackBossDamage(.05, .05) - .1025) < 1e-9, 'boss damage: 1.05 × 1.05 − 1');
    const old = newState(0); delete old.penetrationBoosted;
    old.inventory.push({ id: 'p1', slot: 'rod', style: 'physical', rarity: 6, power: 530, level: 100, enhance: 0, name: 't', affixes: [{ id: 'piercing', name: '관통', stat: 'penetration', value: .05 }, { id: 'might', name: '힘', stat: 'attack', value: 10 }] });
    migrateState(old);
    assert.equal(old.inventory[0].affixes[0].value, .1); assert.equal(old.inventory[0].affixes[1].value, 10, 'other lines untouched');
    migrateState(old); assert.equal(old.inventory[0].affixes[0].value, .1, 'only once');
});

test('v3.84 boss damage: direct hits on bosses only (world bosses included), never damage-over-time ticks', async () => {
    const { strike } = await load('game/systems/combat.js'), { duel, raidBossSnapshot } = await load('game/systems/duel.js'), { raidById } = await load('game/data/altar.js');
    const base = { hp: 1e7, attack: 1000, magic: 1000, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 100, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const mk = (skills, extra = {}, more = {}) => ({ name: 'A', stats: { ...base, ...extra }, hp: 1e7, mana: 100, skills, cooldowns: {}, stun: 0, effects: {}, ranks: Object.fromEntries(skills.map(id => [id, 1])), mastery: {}, practice: {}, ...more });
    const hit = (bd, prey) => { const b = mk([], {}, prey ? { prey: true } : {}); strike(mk([], { bossDamage: bd }), b, () => .5); return 1e7 - b.hp; };
    assert.ok(Math.abs(hit(.5, true) / hit(0, true) - 1.5) < .01, 'boss: ×1.5'); assert.equal(hit(.5, false), hit(0, false), 'normal foe: unchanged');
    const dot = bd => { const b = mk([], {}, { prey: true }); strike(mk(['venomDart'], { bossDamage: bd }), b, () => 0); return b.effects.poison.perStack; };
    assert.equal(dot(.5), dot(0), 'poison tick ignores boss damage');
    const raid = raidById('zakum'), me = { name: 'me', level: 100, job: 'fisher', rebirths: 0, stats: { ...base, attack: 5000 }, skills: [], power: 1, rating: 1000 };
    const dealt = bd => { const r = duel({ ...me, stats: { ...me.stats, bossDamage: bd } }, raidBossSnapshot(raid), true, () => .5, 5); return raid.stats.hp - r.opponentHp; };
    assert.ok(dealt(.5) > dealt(0) * 1.4, 'world boss counts as a boss');
});

test('v3.88 luck-scaling skills (Phantom line) put crit damage into power once: a crit does not multiply it again', async () => {
    const { strike } = await load('game/systems/combat.js'), { SKILL_FORMULA } = await load('game/data/balance.js');
    assert.equal(SKILL_FORMULA.luckScalingScale, 2.8);
    const base = { hp: 1e9, attack: 1000, magic: 1000, defense: 0, resist: 0, accuracy: 5, evasion: 0, speed: 10, mana: 1e6, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 3 };
    const mk = (skills, crit) => ({ name: 'A', stats: { ...base, crit }, hp: 1e9, mana: 1e6, skills, cooldowns: {}, stun: 0, effects: {}, ranks: Object.fromEntries(skills.map(id => [id, 1])), mastery: {}, practice: {} });
    const hit = (skills, crit) => { const b = mk([], 0); strike(mk(skills, crit), b, () => 0); return 1e9 - b.hp; };
    assert.equal(hit(['fateRoll'], 1), hit(['fateRoll'], 0), 'Ultimate Drive: same damage with or without a crit');
    assert.ok(hit([], 1) > hit([], 0) * 2.5, 'a normal attack still multiplies crit damage');
});

test('v3.89 Joker: luck ratio 0.3 (Final Cut keeps 0.8)', () => {
    assert.equal(SKILLS.find(sk => sk.id === 'jackpotStrike').scalingRatio, .3);
    assert.equal(SKILLS.find(sk => sk.id === 'allOrNothing').scalingRatio, .8);
});

test('v3.97 Night Lord dice skills (3rd · 5th tier) add physical attack × 0.6 to the luck base; 1st · 2nd tier stay luck-only', async () => {
    const { strike } = await load('game/systems/combat.js');
    assert.equal(SKILLS.find(sk => sk.id === 'fateReversal').scalingAttack, .6);
    assert.equal(SKILLS.find(sk => sk.id === 'heavenlyDice').scalingAttack, .6);
    assert.equal(SKILLS.find(sk => sk.id === 'heavenlyStrike').scalingAttack, undefined);
    const mk = (skills, attack) => ({ name: 'A', stats: { hp: 1e9, attack, magic: 0, defense: 0, resist: 0, accuracy: 5, evasion: 0, speed: 10, mana: 1e6, manaRegen: 0, penetration: 0, lifesteal: 0, crit: 0, critDamage: 2, attrLuk: 500 }, hp: 1e9, mana: 1e6, skills, cooldowns: {}, stun: 0, effects: {}, ranks: Object.fromEntries(skills.map(id => [id, 1])), mastery: {}, practice: {} });
    const hit = (skills, attack) => { const b = mk([], 0); strike(mk(skills, attack), b, () => 0); return 1e9 - b.hp; };
    assert.ok(hit(['fateReversal'], 40000) > hit(['fateReversal'], 1000) * 5, 'Triple Throw grows with attack');
    assert.equal(hit(['heavenlyStrike'], 40000), hit(['heavenlyStrike'], 1000), 'Avenger stays luck-only');
});
