// v3.31 승천 · 환생 200회 상한 · 까미 확률 상한 · 행운의 편지 10단계(docs/balance-rebirth.md 8·9·11·13·14절).
// 공유 난수를 쓰지 않습니다(직접 만든 난수만). run.mjs 맨 끝에 둡니다.
import { newState, act, advance, rebirthLevel, expMultiplier, assert, test } from './harness.mjs';
const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
const Asc = await L.load('data/ascension'), Mi = await L.load('data/mimic'), Lc = await L.load('systems/actions/lifecycle');
const P = await L.load('systems/progression'), LT = await L.load('data/long-term'), V = await L.load('systems/vows'), Sp = await L.load('data/sprout');
const E = await L.load('systems/encounter'), Ac = await L.load('data/account'), Ec = await L.load('data/economy'), RG = await L.load('systems/random-game');
const W = await L.load('data/world'), AmMod = await L.load('systems/automation');
const { skillById } = await L.load('data/skills');
const SKILL = id => skillById(id);

test('v3.31 mimic chance stops growing at difficulty 20 and the dragon nest', () => {
    const nest = W.STAGES.findIndex(x => x.id === 'dragonNest'), last = W.STAGES.findIndex(x => x.id === 'vanishingJourney');
    assert.equal(Mi.MIMIC_STAGE_CAP_INDEX, nest);
    assert.ok(Math.abs(Mi.mimicChance(20, nest) - .043125) < 1e-12, 'max ≈ 4.3%');
    assert.equal(Mi.mimicChance(60, last), Mi.mimicChance(20, nest), 'no gain above the cap');
    assert.equal(Mi.mimicChance(200, 0), Mi.mimicChance(20, 0));
    assert.ok(Mi.mimicChance(5, 9) < Mi.mimicChance(20, nest), 'still grows below the cap');
});

test('v3.31 rebirth stops at 200 and world-stone research purchases lock from 200', () => {
    const s = newState(0); s.rebirths = 200; s.level = 100; s.pearls = 1e6;
    assert.throws(() => act(s, { type: 'rebirth' }, 0), /200회까지/);
    assert.throws(() => act(s, { type: 'permanent', id: 'attack' }, 0), /살 수 없습니다/);
    s.rebirths = 199; act(s, { type: 'permanent', id: 'attack' }, 0); assert.equal(s.permanent.attack, 1, 'below 200 still buys');
});

test('v3.31 ascend: requirement steps, keeps mastery/achievements/rank/records, resets the rest, refunds achievement currency', () => {
    const s = newState(0);
    s.rebirths = 99; s.level = 100;
    assert.throws(() => act(s, { type: 'ascend' }, 1000), /환생 100회부터/);
    s.rebirths = 100; s.pearls = 5000; s.sp = 40; s.essence = 300; s.gold = 9e9; s.skillSpecializations = { hook: 'shatter' }; s.vows = { rough: 2 }; s.nextVows = { breath: true }; s.variantBook = { slime: { giant: 3 } }; s.onyxBook = { onyxDusk: 1 }; s.abyssWeek = { key: 'w', best: 30 }; s.ascensionLog = []; s.permanent = { attack: 30, hp: 20, gold: 5, messageBottle: 5 };
    s.jobMastery = { fisher: 500, wanderer: 99999 }; s.unlockedJobs = ['fisher', 'wanderer'];
    const hook = P.masteryMilestonesFor(SKILL('hook')).at(-1);
    s.skillPractice = { hook: hook + 50_000 }; s.learned = { hook: 4 }; s.skillSpent = { hook: 3 }; s.limitBreaks = { hook: 2 };
    s.achievements = { 'rebirths:1': 1, 'rebirths:3': 1 }; s.achievementClaims = { 'rebirths:1': true, 'rebirths:3': true };
    s.rank = { exp: 12345, perks: { drill: 2 } }; s.book = { slime: 50 }; s.abyssBest = 40; s.abyssMilestones = [10, 20]; s.kills = 777;
    s.inventory = [{ id: 'x', name: 'x', slot: 'rod', rarity: 3, power: 10, level: 1, relic: 'memoryRod' }];
    act(s, { type: 'ascend' }, 5000);
    assert.equal(s.ascension, 1); assert.equal(s.rebirths, 0); assert.equal(s.level, 1); assert.equal(s.job, 'fisher');
    assert.deepEqual(s.ascensionLog.map(x => [x.n, x.rebirths, x.abyssBest]), [[1, 100, 40]]);
    assert.deepEqual(s.jobMastery, { fisher: 500, wanderer: 99999 }, 'job mastery kept'); assert.deepEqual(s.unlockedJobs, ['fisher', 'wanderer']);
    assert.equal(s.skillPractice.hook, hook + 50_000, 'skill practice kept'); assert.equal(s.learned.hook, 1, 'SP ranks reset'); assert.deepEqual(s.skillSpent, {});
    assert.deepEqual(s.limitBreaks, {}, 'limit breaks reset'); assert.equal(s.refineBase.hook, hook + 50_000, 'refinement base moved');
    assert.equal(s.rank.exp, 12345); assert.ok(s.achievementClaims['rebirths:3'], 'achievements kept'); assert.equal(s.kills, 777, 'records kept');
    assert.deepEqual(s.book, {}, 'codex reset'); assert.equal(s.abyssBest, 0); assert.deepEqual(s.abyssMilestones, []); assert.equal(s.essence, 0); assert.equal(s.gold, 100, 'gold back to a new character'); assert.equal('skillSpecializations' in s, false, 'deleted content is not carried');
    for (const key of ['vows', 'nextVows', 'variantBook', 'onyxBook', 'abyssWeek']) assert.equal(key in s, false, `${key} reset`);
    assert.equal(s.inventory.length, 0, 'relics reset too');
    const refund = Lc.achievementRefund(s); assert.equal(refund.pearls, 1 + 3); assert.equal(s.pearls, refund.pearls, 'achievement pearls refunded');
    assert.equal(s.permanent.attack || 0, 0, 'combat research reset'); assert.equal(s.permanent.messageBottle || 0, 0, 'lucky letter must be rebought');
    for (const [id, rank] of Object.entries(Asc.ASCENSION_RESEARCH)) assert.equal(s.permanent[id], rank, `auto research ${id}`);
    assert.deepEqual(s.researchGranted, { ...Asc.ASCENSION_RESEARCH, limitBreak: 0 }, 'free ranks are not refunded');
    assert.equal(Asc.ascensionRequirement(s), 125, 'next ascension needs 125');
    s.rebirths = 124; assert.throws(() => act(s, { type: 'ascend' }, 6000), /125회부터/);
});


test('v3.31 refinement and limit-break progress restart from the ascension base; growth levels stay', () => {
    const sk = skillById('hook'), last = P.masteryMilestonesFor(sk).at(-1), targets = P.skillRefinementTargets(sk);
    const s = { skillPractice: { hook: last + 40_000 }, refineBase: { hook: last + 40_000 } };
    assert.equal(LT.thresholdRank(P.refinePractice(s, 'hook'), targets), 0, 'refinement back to 0');
    assert.equal(P.refinePractice({ skillPractice: { hook: last + 40_000 } }, 'hook'), last + 40_000, 'no base → unchanged');
    s.skillPractice.hook += 5_000; assert.equal(LT.thresholdRank(P.refinePractice(s, 'hook'), targets), 1, 'first step after 5k more');
    assert.equal(P.skillMasteryLevel(s.skillPractice.hook, P.masteryMilestonesFor(sk)), P.masteryMilestonesFor(sk).length, 'growth level kept');
});

test('v3.31 ascended effects: no sprout, ×2 early exp, vow and random-game bonus ×1.2 per ascension, mastery ×(1+n)', () => {
    const fresh = newState(0), asc = { ...newState(0), ascension: 1 };
    assert.equal(Sp.sproutCount(fresh), 0); assert.equal(Sp.sproutCount(asc), Infinity);
    assert.ok(Math.abs(expMultiplier(asc) / expMultiplier(fresh) - Asc.ASCENSION.earlyExp / Sp.sproutExp(0)) < 1e-9, 'sprout ×3 replaced by ×2');
    asc.rebirths = 10; assert.equal(Asc.ascensionEarlyExp(asc), 1, 'early boost ends at 10 rebirths');
    assert.equal(Sp.deathRecoveryTurns(asc) > Sp.SPROUT.recoveryTurns, true, 'no sprout recovery help');
    const vow = { permanent: { vowRough: 3, vowAnchor: 3 }, vows: { rough: 3 } };
    assert.equal(V.roughReward(vow, 30), 4); assert.equal(V.roughReward({ ...vow, ascension: 5 }, 30), 7, '×4 → ×7 at five ascensions');
    assert.equal(RG.randomGamePayout(vow), 2); assert.equal(RG.randomGamePayout({ ...vow, ascension: 5 }), 3);
    assert.equal(Asc.ascensionMastery({}), 1); assert.equal(Asc.ascensionMastery({ ascension: 2 }), 3); assert.equal(Asc.ascensionMastery({ ascension: 9 }), 6, 'capped at 5');
});

test('v3.31 ascended hunters meet the mimic at difficulty 0 and its jackpot gets the ascension multiplier', () => {
    const s = newState(0); s.ascension = 1; s.level = 20; s.kills = 500; s.stage = 'brook'; s.tide = 0; s.running = true; s.hp = 1e9;
    E.spawn(s, () => 0);
    assert.equal(s.enemy?.id, Mi.MIMIC.id, 'mimic spawns at difficulty 0 after ascending');
    const plain = newState(0); plain.level = 20; plain.kills = 500; plain.stage = 'brook'; plain.tide = 0;
    E.spawn(plain, () => 0); assert.notEqual(plain.enemy?.id, Mi.MIMIC.id, 'not before ascending');
    const before = s.jobMastery[s.job] || 0; s.enemy.hp = 0; E.reward(s, () => 0);
    assert.ok((s.jobMastery[s.job] || 0) - before >= 2 * 1000, 'jackpot 1,000 × 2');
});

test('v3.31 lucky letter: ranks 6–10 need an ascension; offline ×0.5, jackpot 7.5%, letter recipient 1%', () => {
    const s = newState(0); s.rebirths = 10; s.pearls = 1e6; s.permanent.messageBottle = 5;
    assert.throws(() => act(s, { type: 'permanent', id: 'messageBottle' }, 0), /승천한 뒤/);
    s.ascension = 1; act(s, { type: 'permanent', id: 'messageBottle' }, 0); assert.equal(s.permanent.messageBottle, 6);
    assert.equal(Ec.researchMaxFor({}, Ec.RESEARCH.find(r => r.id === 'messageBottle')), 5);
    assert.equal(Mi.specialOfflineScale(s, .25), .5); assert.equal(Mi.specialOfflineScale({ permanent: { messageBottle: 5 } }, .25), .25);
    const tiers = Mi.mimicTiers({ permanent: { messageBottle: 8 } });
    assert.equal(tiers[2].chance, .075); assert.ok(Math.abs(tiers.reduce((a, t) => a + t.chance, 0) - 1) < 1e-12);
    const r = newState(0); r.ascension = 1; r.permanent.messageBottle = 10; r.level = 20; r.kills = 500; r.stage = 'brook'; r.unlockedJobs = ['fisher', 'wanderer']; r.jobMastery = {};
    E.spawn(r, () => 0); r.enemy.hp = 0; E.reward(r, () => 0);
    assert.equal(r.jobMastery.wanderer, Math.floor(1000 * 2 * .01), 'recipient gets 1% of the multiplied jackpot'); assert.deepEqual(r.letterLog?.[0] && [r.letterLog[0].job, r.letterLog[0].gift], ['wanderer', 20], 'v3.40 recipient record for the mastery board');
});

test('v3.31 slot unlocks use lifetime rebirths so an ascension never closes a slot', () => {
    const own = { slot: 1, name: 'a', job: 'fisher', level: 1, rebirths: 0, lifetimeRebirths: 120, mastered: [], species: [], bossKills: 0, abyssBest: 0, updatedAt: 0 };
    const merged = Ac.mergeSlots(1, [own], 0);
    assert.equal(merged.rebirths, 0); assert.equal(merged.lifetimeRebirths, 120);
    assert.ok(Ac.slotUnlocked(merged, 3), 'slot 3 stays open'); assert.ok(Ac.slotUnlocked(merged, 2));
    assert.equal(Ac.accountExpGold(merged), 1, 'account exp/gold bonus refills from current rebirths');
    assert.equal(Asc.lifetimeRebirths({ rebirths: 20, ascensionLog: [{ rebirths: 100 }] }), 120);
});

test('v3.40 auto rebirth (ascension 1): locked before, fires at the target level outside dungeons, keeps hunting, settings survive', () => {
    const s = newState(0); s.rebirths = 3; assert.throws(() => act(s, { type: 'autoRebirth', id: 'on', value: '0' }, 0), /승천 1회/);
    s.ascension = 1; act(s, { type: 'autoRebirth', id: 'on', value: '60' }, 0); assert.deepEqual(s.autoRebirth, { on: true, level: 60 });
    assert.throws(() => act(s, { type: 'autoRebirth', id: 'on', value: '55' }, 0), /목표 레벨/);
    s.running = true; s.level = 59; s.hp = 1e9;
    const Am = AmMod; s.level = 59; assert.equal(Am.autoRebirthDue(s), false, 'below the chosen level');
    s.level = 60; s.dungeon = { id: 'grotto', wave: 0 }; assert.equal(Am.autoRebirthDue(s), false, 'not inside a dungeon'); s.dungeon = null;
    Am.runAutomation(s, () => .5); assert.equal(s.rebirths, 4); assert.equal(s.running, true, 'keeps hunting'); assert.ok(s.logs.some(l => l.text.startsWith('자동 환생 · Lv.60')));
    assert.deepEqual(s.autoRebirth, { on: true, level: 60 }, 'kept across rebirth');
    s.rebirths = 200; s.level = 100; assert.equal(Am.autoRebirthDue(s), false, 'rebirth cap');
});

test('v3.40 research plan (ascension 1): buys in order up to targets, waits when short of pearls, skips locked ones, survives ascension', () => {
    const s = newState(0); s.rebirths = 1; s.pearls = 0;
    assert.throws(() => act(s, { type: 'researchPlan', id: 'add', value: 'attack:3' }, 0), /승천 1회/);
    s.ascension = 1;
    act(s, { type: 'researchPlan', id: 'add', value: 'crit:2' }, 0); // 환생 2회부터 → 지금은 건너뜀
    act(s, { type: 'researchPlan', id: 'add', value: 'attack:3' }, 0); act(s, { type: 'researchPlan', id: 'add', value: 'hp:2' }, 0);
    assert.throws(() => act(s, { type: 'researchPlan', id: 'add', value: 'attack:999' }, 0), /목표 단계/);
    act(s, { type: 'researchPlan', id: 'add', value: 'attack:2' }, 0); assert.deepEqual(s.researchPlan.items.map(x => `${x.id}:${x.to}`), ['crit:2', 'attack:2', 'hp:2'], 'same research updates its target');
    const cost = (id, from, to) => { let n = 0; for (let i = from; i < to; i++) n += Ec.researchCost(id, i); return n; };
    s.pearls = cost('attack', 0, 2) + Ec.researchCost('hp', 0); act(s, { type: 'researchPlan', id: 'on' }, 0);
    assert.equal(s.permanent.attack, 2); assert.equal(s.permanent.hp || 0, 1); assert.equal(s.permanent.crit || 0, 0, 'locked research is skipped'); assert.equal(s.pearls, 0);
    s.pearls = Ec.researchCost('hp', 1) - 1; AmMod.runResearchPlan(s); assert.equal(s.permanent.hp, 1, 'waits for pearls');
    s.pearls += 1; AmMod.runResearchPlan(s); assert.equal(s.permanent.hp, 2);
    act(s, { type: 'researchPlan', id: 'up', value: '2' }, 0); assert.deepEqual(s.researchPlan.items.map(x => x.id), ['crit', 'hp', 'attack']);
    act(s, { type: 'researchPlan', id: 'remove', value: '0' }, 0); assert.deepEqual(s.researchPlan.items.map(x => x.id), ['hp', 'attack']);
    s.rebirths = Asc.ASCENSION.requirements[1]; Lc.ascend(s, 0); assert.deepEqual(s.researchPlan, { on: true, items: [{ id: 'hp', to: 2 }, { id: 'attack', to: 2 }] }, 'plan survives ascension');
});

test('v3.40 auto rebirth also fires during offline catch-up and keeps the offline summary', () => {
    const s = newState(0); s.ascension = 1; s.rebirths = 3; act(s, { type: 'autoRebirth', id: 'on', value: '0' }, 0);
    s.level = rebirthLevel(s); s.running = true; s.lastTick = 0;
    let seed = 7; const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    advance(s, 10 * 60_000, rng);
    assert.equal(s.rebirths, 4); assert.equal(s.running, true); assert.ok(s.lastOffline && s.lastOffline.gold >= 0, 'offline summary kept and never negative');
});
