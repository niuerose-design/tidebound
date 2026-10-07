// v3.31 승천 · 환생 200회 상한 · 까미 확률 상한 · 행운의 편지 10단계(docs/balance-rebirth.md 8·9·11·13·14절).
// 공유 난수를 쓰지 않습니다(직접 만든 난수만). run.mjs 맨 끝에 둡니다.
import { newState, act, advance, rebirthLevel, expMultiplier, JOBS, assert, test } from './harness.mjs';
const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
const Asc = await L.load('data/ascension'), Mi = await L.load('data/mimic'), Lc = await L.load('systems/actions/lifecycle');
const P = await L.load('systems/progression'), LT = await L.load('data/long-term'), V = await L.load('systems/vows'), Sp = await L.load('data/sprout');
const E = await L.load('systems/encounter'), Ac = await L.load('data/account'), Ec = await L.load('data/economy'), RG = await L.load('systems/random-game');
const W = await L.load('data/world'), AmMod = await L.load('systems/automation'), RpMod = await L.load('systems/research-plan');
const { skillById } = await L.load('data/skills'), Ac2 = await L.load('data/achievements');
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


test('v3.31 extreme-break and limit-break progress restart from the ascension base; growth levels stay', () => {
    const sk = skillById('hook'), last = P.masteryMilestonesFor(sk).at(-1);
    const s = { skillPractice: { hook: last + 40_000 }, refineBase: { hook: last + 40_000 } };
    assert.equal(P.refinePractice(s, 'hook'), last, 'progress back to the last milestone');
    assert.equal(P.refinePractice({ skillPractice: { hook: last + 40_000 } }, 'hook'), last + 40_000, 'no base → unchanged');
    assert.equal(P.skillMasteryLevel(s.skillPractice.hook, P.masteryMilestonesFor(sk)), P.masteryMilestonesFor(sk).length, 'growth level kept');
});

test('v3.74 extreme break: active skills only, after all three limit breaks at 100M practice; no effect yet, an honor achievement without reward', () => {
    const sk = skillById('hook'), target = P.extremeBreakTarget(sk);
    assert.equal(target, 100_000_000, '1억 for every active skill'); assert.equal(P.extremeBreakTarget(skillById('pierce')), 100_000_000);
    assert.equal(P.extremeBreakTarget(skillById('axeArm')), null, 'passives have no extreme break');
    const s = newState(0); s.learned.hook = 1; s.skillPractice.hook = target; s.permanent.limitBreak = 3; s.limitBreaks = { hook: 2 };
    assert.equal(P.extremeBroken(s, 'hook'), false, 'two limit breaks are not enough');
    s.limitBreaks.hook = 3; assert.equal(P.extremeBroken(s, 'hook'), true);
    s.skillPractice.hook = target - 1; assert.equal(P.extremeBroken(s, 'hook'), false);
    const max = P.maxSkillLevel(sk); assert.equal(P.effectiveSkill(sk, 1, max + 3, target * 2).multiplier, P.effectiveSkill(sk, 1, max + 3, 0).multiplier, 'no old refinement bonus');
    const { ACHIEVEMENTS } = Ac2, a = ACHIEVEMENTS.find(x => x.id === 'extremeBreak');
    assert.ok(a && a.honor && !Object.keys(a.reward).length && a.desc.includes('운영자에게 문의해주세요')); s.skillPractice.hook = target; assert.equal(a.progress(s), 1);
    const j = JOBS.find(x => x.id === 'strTraining1');
    assert.ok(P.jobRequirements(newState(0), j).some(r => r.label.endsWith('숙련 1,000,000')), 'parent mastery shown as 1,000,000');
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
    s.pearls = Ec.researchCost('hp', 1) - 1; RpMod.runResearchPlan(s); assert.equal(s.permanent.hp, 1, 'waits for pearls');
    s.pearls += 1; RpMod.runResearchPlan(s); assert.equal(s.permanent.hp, 2);
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

test('v3.41 auto follow (ascension 2): highest stage that fits the level, tide by rule, only between fights', () => {
    const s = newState(0); s.ascension = 1; s.rebirths = 25; s.level = 40;
    assert.throws(() => act(s, { type: 'autoFollow', id: 'on', value: 'top:max' }, 0), /승천 2회/);
    s.ascension = 2; act(s, { type: 'autoFollow', id: 'on', value: 'top:mimic' }, 0);
    assert.throws(() => act(s, { type: 'autoFollow', id: 'on', value: 'nope:max' }, 0), /규칙/);
    const want = [...W.PLACES].reverse().find(st => st.level <= 40 && s.rebirths >= st.rebirth);
    s.enemy = { id: 'x' }; assert.equal(AmMod.runAutoFollow(s), false, 'waits while fighting'); s.enemy = null;
    assert.equal(AmMod.runAutoFollow(s), true); assert.equal(s.stage, want.id); assert.equal(s.tide, Math.min(20, Mi.MIMIC.tierCap));
    assert.equal(AmMod.runAutoFollow(s), false, 'nothing to change');
    act(s, { type: 'autoFollow', id: 'on', value: 'habitat:max' }, 0); AmMod.runAutoFollow(s); assert.ok(W.STAGES.find(x => x.id === s.stage).habitat); assert.equal(s.tide, 25);
});

test('v3.41 job rotation (ascension 2 fixed at vocation 1; more choices later): switches to the next unmastered job and equips a loadout', () => {
    const s = newState(0); s.ascension = 1; s.level = 60; s.rebirths = 10; Object.assign(s.attributes, { str: 60, dex: 60, int: 60, vit: 60, wis: 60, luk: 60 });
    assert.deepEqual(AmMod.rotationChoices(s), []); assert.throws(() => act(s, { type: 'rotation', id: 'on', value: '1' }, 0), /승천 2회/);
    s.ascension = 2; assert.deepEqual(AmMod.rotationChoices(s), [1]); assert.throws(() => act(s, { type: 'rotation', id: 'on', value: 'mastered' }, 0), /전직 시점/);
    s.ascension = 3; assert.deepEqual(AmMod.rotationChoices(s), ['mastered', 1, 2, 3]); s.ascension = 5; assert.equal(AmMod.rotationChoices(s).length, 8);
    s.ascension = 2; act(s, { type: 'rotation', id: 'on', value: '1' }, 0);
    const target = P.jobMasteryTarget(s.job); s.jobMastery[s.job] = target; s.running = true;
    assert.equal(AmMod.runRotation(s, () => .5), false, 'mastered but vocation 1 not reached');
    s.jobMastery[s.job] = target + LT.VOCATION_OFFSETS[0]; const from = s.job;
    assert.equal(AmMod.runRotation(s, () => .5), true); assert.notEqual(s.job, from); assert.equal(s.running, true, 'keeps hunting');
    assert.ok(s.skills.length > 0, 'loadout equipped'); assert.ok(s.logs.some(l => l.text.startsWith('숙련 순회 전직')));
    s.rebirths = Asc.ASCENSION.requirements[2]; Lc.ascend(s, 0); assert.deepEqual(s.rotation, { on: true, at: 1 }, 'rotation survives ascension');
});

// v3.42 무리 드롭 √N 판정 · ×500 무리 보상 · 세계석 연구 21번째 단계부터 ×1.06 복리
const Mig = await L.load('systems/migrations'), Co = await L.load('systems/commerce'), Rk = await L.load('data/rank');
const swarmKill = size => {
    const s = newState(0); s.level = 30; s.stage = 'brook'; s.tide = 0; s.permanent.inventory = 8; s.inventory = [];
    E.spawn(s, () => .99); s.enemy.swarm = size; s.enemy.variant = 'swarm'; s.enemy.hp = 0;
    const exp = s.exp, gold = s.gold, essence = s.essence || 0;
    E.reward(s, () => 0);
    return { items: s.inventory.length, exp: s.exp - exp, gold: s.gold - gold, essence: (s.essence || 0) - essence, logs: s.logs.map(l => l.text) };
};
test('v3.42 swarm drops roll √N times (×500 doubled) and the skipped rolls pay essence', () => {
    assert.deepEqual([1, 5, 100, 500].map(W.swarmDropRolls), [1, 2, 10, 22]);
    const five = swarmKill(5), hundred = swarmKill(100), big = swarmKill(500);
    assert.equal(five.items, 2); assert.equal(hundred.items, 10); assert.equal(big.items, 44, '22 rolls × 2 for ×500');
    assert.ok(hundred.essence >= 1 && big.essence >= 1, 'skipped rolls become essence');
    assert.ok(big.logs.some(t => t.includes('무리 전리품 · 정수')));
});
test('v3.42 ×500 swarms pay exp · gold ×1.5 on top of the head count', () => {
    const hundred = swarmKill(100), big = swarmKill(500);
    assert.ok(Math.abs(big.exp / hundred.exp - 7.5) < .05, `exp ratio ${big.exp / hundred.exp}`);
    // 난수 0이면 황금 개체(한 마리 골드 10배)도 뜨므로 그 몫(+9마리분)은 빼고 비교합니다.
    const golden = hundred.logs.some(t => t.includes('황금 개체 골드 10배')), perFish = hundred.gold / (100 + (golden ? 9 : 0));
    assert.equal(big.gold, Math.floor(perFish * 500 * 1.5) + (golden ? perFish * 9 : 0), 'gold ×500 × 1.5');
    assert.ok(big.logs.some(t => t.includes('큰 무리 보상 ×1.5')));
    assert.equal(W.swarmRewardMultiplier(100), 1); assert.equal(W.swarmRewardMultiplier(500), 1.5);
});
test('v3.42 research ranks from the 21st cost ×1.06 compounding; ranks bought before refund at the old price', () => {
    for (let k = 0; k < 20; k++) assert.equal(Ec.researchCost('attack', k), Ec.researchLegacyCost('attack', k));
    assert.equal(Ec.researchCost('attack', 20), Math.round(Ec.researchLegacyCost('attack', 20) * 1.06));
    assert.equal(Ec.researchCost('attack', 40), Math.round(Ec.researchLegacyCost('attack', 40) * 1.06 ** 21));
    assert.equal(Ec.researchSpent('attack', 40), 5813); assert.equal(Ec.researchSpent('attack', 40, 40), 2780, 'old total');
    const s = newState(0); s.rebirths = 50; s.permanent = { attack: 40, hp: 12 }; delete s.researchLegacy;
    Mig.stampResearchLegacy(s); assert.deepEqual(s.researchLegacy, { attack: 40 }, 'only ranks past 20 need the old price');
    Mig.stampResearchLegacy(s); assert.deepEqual(s.researchLegacy, { attack: 40 }, 'once');
    s.pearls = 1e6; act(s, { type: 'permanent', id: 'attack' }, 0); assert.equal(s.permanent.attack, 41);
    const tab = Ec.RESEARCH.find(r => r.id === 'attack').tab, legacyHp = Ec.researchSpent('hp', 12);
    const { spent } = Co.researchRefund(s, tab);
    assert.equal(spent, Ec.researchSpent('attack', 40, 40) + Ec.researchCost('attack', 40) + legacyHp, 'old price up to the stamp, new price after');
    const pearls = s.pearls; act(s, { type: 'resetResearch', id: tab }, 0);
    assert.equal(s.pearls - pearls, spent, 'first reset refunds everything paid'); assert.equal(s.researchLegacy.attack, undefined, 'stamp cleared by the reset');
    assert.deepEqual(newState(0).researchLegacy, {}, 'new saves pay the new price');
});
test('v3.46 swarm rank exp = fought turns × per-size rate, capped at the head count, fractions carried', () => {
    const R = Rk;
    assert.equal(R.swarmRankKills(1, 5), 1); assert.equal(R.swarmRankKills(100, 1), 1.32); assert.equal(R.swarmRankKills(500, 1), 1.98);
    assert.equal(R.swarmRankKills(5, 50), 5, 'never more than the head count'); assert.equal(R.swarmRankKills(500, 0), 1.98, 'at least one turn');
    // 한 마리만 잡는 처치 상한(턴당 1마리) 대비: ×100 412/300배 · ×500 412/200배 ≈ 1.37 · 2.06(턴당 0.96마리 기준 1.32 · 1.98)
    const single = 1730 / 1800;
    assert.ok(Math.abs(R.SWARM_RANK_PER_TURN[100] / single - 412 / 300) < .02 && Math.abs(R.SWARM_RANK_PER_TURN[500] / single - 412 / 200) < .02);
    const s = newState(0); s.level = 30; s.stage = 'brook'; s.tide = 0; s.rank = { exp: 0, perks: {} };
    for (let i = 0; i < 3; i++) { E.spawn(s, () => .99); s.enemy.swarm = 100; s.enemy.variant = 'swarm'; s.enemy.born = s.turn; s.enemy.hp = 0; E.reward(s, () => .99); }
    assert.equal(s.rank.exp, 3, '3 one-turn ×100 swarms = 3.96 → 3'); assert.ok(Math.abs(s.rank.frac - .96) < 1e-9);
    assert.equal(s.kills, 300, 'kill count (achievements) still counts heads');
});
test('v3.48 swarm mastery = fought turns × per-size rate (×5 2 · ×100 10 · ×500 20), capped at the head count', () => {
    assert.equal(Rk.swarmMasteryKills(100, 1), 10); assert.equal(Rk.swarmMasteryKills(500, 1), 20); assert.equal(Rk.swarmMasteryKills(5, 4), 5, 'head count cap');
    const one = size => { const s = newState(0); s.level = 30; s.stage = 'brook'; s.tide = 0; E.spawn(s, () => .99); if (size > 1) { s.enemy.swarm = size; s.enemy.variant = 'swarm'; s.enemy.born = s.turn; } s.enemy.hp = 0; const m = s.jobMastery[s.job] || 0; E.reward(s, () => .99); return (s.jobMastery[s.job] || 0) - m; };
    const single = one(1);
    assert.equal(one(100), single * 10); assert.equal(one(500), single * 20, 'no ×1.5 big-swarm bonus on mastery');
});
test('v3.48 logs keep battle 70 and reward 50 lines separately; client merge prunes the same way', async () => {
    const D = await L.load('systems/log-delta'), St = await L.load('systems/state');
    const s = newState(0); s.logs = []; s.logId = 0;
    for (let i = 0; i < 300; i++) St.addLog(s, `b${i}`, i % 7 ? 'battle' : 'reward');
    const count = g => s.logs.filter(l => D.logGroup(l.type) === g).length;
    assert.equal(count('battle'), 70); assert.equal(count('reward'), 43, 'all 43 reward lines kept (below 50)');
    for (let i = 0; i < 100; i++) St.addLog(s, `r${i}`, 'skill');
    assert.equal(count('reward'), 50); assert.equal(count('battle'), 70);
    assert.deepEqual(D.pruneLogs(s.logs), s.logs, 'idempotent');
    const old = s.logs.slice(), key = D.logKey(old.at(-1));
    for (let i = 0; i < 30; i++) St.addLog(s, `n${i}`, i % 2 ? 'battle' : 'reward');
    const cut = D.trimLogs(s.logs, key); assert.ok(cut);
    assert.deepEqual(D.mergeLogs(old, cut.logs, cut.delta), s.logs, 'merge equals the server list');
});
test('v3.54 DoT: first application in a fight ticks at once (once per fight), poison/burn open at 2 stacks, swarm %HP uses one × √N', async () => {
    const C = await L.load('systems/combat'), B = await L.load('data/balance');
    const base = { hp: 1e6, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 9, evasion: 0, speed: 10, mana: 1e6, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const mk = (skills, extra = {}) => ({ name: 'A', stats: { ...base, ...extra }, hp: extra.hp || 1e6, mana: 1e6, skills, cooldowns: {}, stun: 0, effects: {}, ranks: Object.fromEntries(skills.map(id => [id, 1])), mastery: {}, practice: {} });
    const t = mk([]), ev = []; C.strike(mk(['cut']), t, () => 0, ev);
    assert.ok(ev[0].onset && ev[0].onset.value === t.effects.dot.damage + Math.floor((t.hp + ev[0].onset.value) * t.effects.dot.hpRatio), 'bleed first tick lands immediately (current HP before the tick)');
    const ev2 = []; t.effects.dot = undefined; C.strike(mk(['cut']), t, () => 0, ev2); assert.equal(ev2[0].onset, undefined, 'only once per fight');
    assert.equal(C.swarmDotShare(1), 1); assert.equal(C.swarmDotShare(100), .1); assert.ok(Math.abs(C.swarmDotShare(500) - 1 / Math.sqrt(500)) < 1e-12);
    const swarm = mk([], { hp: 98e6 }); swarm.swarm = 100; C.strike(mk(['venomDart']), swarm, () => 0);
    assert.ok(Math.abs(swarm.effects.poison.hpRatio - B.SKILL_FORMULA.poisonHpRatio / 10) < 1e-15, 'swarm: ratio × 1/√N of the current swarm HP');
    assert.equal(swarm.effects.poison.stacks, B.STATUS_TUNING.poisonFirstStacks);
});
test('v3.54 healers turn overflowing heals into damage on the enemy (healers only)', async () => {
    const C = await L.load('systems/combat'), B = await L.load('data/balance');
    const base = { hp: 10000, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 9, evasion: 0, speed: 10, mana: 1e6, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const caster = healFocus => ({ name: 'H', stats: { ...base, healFocus }, hp: 10000, mana: 1e6, skills: ['breath'], cooldowns: {}, stun: 0, effects: {}, ranks: { breath: 1 }, mastery: {}, practice: {} });
    const foe = () => ({ name: 'F', foe: true, stats: { ...base, hp: 1e6 }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects: {}, mana: 0 });
    const f1 = foe(), ev = []; C.strike(caster(1), f1, () => 0, ev);
    assert.ok(ev[0].holy > 0, 'full HP healer heal becomes damage'); assert.equal(1e6 - f1.hp, ev[0].holy + ev[0].hits.reduce((n, h) => n + h.value, 0));
    const f2 = foe(), ev2 = []; C.strike(caster(0), f2, () => 0, ev2); assert.equal(ev2[0].holy, undefined, 'non-healers do not');
    assert.ok(B.SKILL_FORMULA.overhealDamage > 0);
});
test('v3.58 gold income is logged per play hour (24 buckets) and survives rebirth', async () => {
    const In = await L.load('systems/income');
    const s = newState(0); s.playMs = 0; s.goldLog = undefined;
    In.recordIncome(s, 100); In.recordIncome(s, 50); assert.deepEqual(s.goldLog, [{ h: 0, g: 150 }]); assert.equal(s.goldEarned, 150);
    In.recordIncome(s, -30); In.recordIncome(s, 0); assert.equal(s.goldEarned, 150, 'spending is not income');
    s.playMs = 3600_000 * 1.5; In.recordIncome(s, 600);
    assert.deepEqual(In.incomeRate(s), { perHour: 150, hours: 1, estimated: false }, 'completed hours only');
    for (let h = 2; h < 40; h++) { s.playMs = h * 3600_000; In.recordIncome(s, h); }
    assert.equal(s.goldLog.length, In.INCOME_HOURS); assert.equal(s.goldLog.at(-1).h, 39);
    const t = newState(0); act(t, { type: 'start' }, 0); const g0 = t.gold; advance(t, 600_000, () => .5);
    assert.ok((t.goldEarned || 0) >= t.gold - g0 && t.goldLog?.length >= 1, 'hunting ticks record income');
    t.level = 60; t.goldLog = [{ h: 0, g: 9 }]; act(t, { type: 'rebirth' }, 700_000); assert.deepEqual(t.goldLog, [{ h: 0, g: 9 }], 'kept through rebirth');
});
test('v3.58 appraisal: price × rebirth factor (v3.68 linear, v3.81 scale 30), pity at 150/1000/3000 kept through rebirth and reset by ascension', async () => {
    const Co = await L.load('systems/commerce'), Ec = await L.load('data/economy');
    const s = newState(0); s.level = 100; const base = Co.gambleCost(s);
    s.rebirths = 30; assert.equal(Co.gambleCost(s), Math.floor(base * 10), 'v3.81 10^(30/30) at 30 rebirths');
    s.rebirths = 60; assert.equal(Co.gambleCost(s), Math.floor(base * (1 + 60 * .45)), 'v3.81 linear from ~38 rebirths');
    assert.equal(Ec.appraisalRebirthFactor(200), 1 + 200 * .45, 'v3.68 linear above ~100 rebirths'); assert.ok(Ec.appraisalRebirthFactor(100) <= Math.pow(10, 100 / 60)); s.rebirths = 0;
    s.gold = 1e12; s.permanent.inventory = 8; s.inventory = [];
    s.appraisal = { count: 0, byRarity: [0, 0, 0, 0, 0, 0, 0], pity: { myth: 148, ancient: 0, primal: 0 } };
    act(s, { type: 'gamble', id: 'all', value: '1' }, 0, () => 0); assert.equal(s.inventory.at(-1).rarity, 1, 'below pity: rolls as usual');
    act(s, { type: 'gamble', id: 'all', value: '1' }, 0, () => 0); assert.equal(s.inventory.at(-1).rarity, 4, '150th appraisal is myth or better');
    assert.equal(s.appraisal.pity.myth, 0); assert.equal(s.appraisal.pity.ancient, 2); assert.equal(s.appraisal.count, 2);
    s.appraisal.pity.primal = 2999; act(s, { type: 'gamble', id: 'all', value: '1' }, 0, () => 0); assert.equal(s.inventory.at(-1).rarity, 6, 'primal pity');
    assert.deepEqual(s.appraisal.pity, { myth: 0, ancient: 0, primal: 0 });
    assert.deepEqual(Co.pityLeft(s).map(p => p.left), Ec.APPRAISAL_PITY.map(p => p.count));
    const r = newState(0); r.level = 60; r.appraisal = { count: 7, byRarity: [0, 7, 0, 0, 0, 0, 0], pity: { myth: 7, ancient: 7, primal: 7 } }; act(r, { type: 'rebirth' }, 0); assert.equal(r.appraisal.count, 7, 'kept through rebirth');
});
test('v3.58 imprint appraisal always carries the chosen option and costs v3.73 5× gold + 50 essence; auto appraisal stops at the target', async () => {
    const Co = await L.load('systems/commerce'), Ec = await L.load('data/economy');
    const s = newState(0); s.level = 50; s.gold = 1e9; s.essence = 75; s.permanent.inventory = 8; s.inventory = [];
    const cost = Co.imprintGambleCost(s); assert.equal(cost.gold, Co.gambleCost(s) * 5); assert.equal(Ec.IMPRINT_APPRAISAL.essence, 50); assert.equal(cost.essence, Ec.IMPRINT_APPRAISAL.essence);
    let x = 1; const rng = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    act(s, { type: 'imprintGamble', id: 'charm', value: 'brutal|1' }, 0, rng);
    const it = s.inventory.at(-1); assert.ok(it.affixes.some(a => a.id === 'brutal'), 'chosen option'); assert.equal(it.imprinted, 'brutal'); assert.equal(s.essence, 25);
    assert.throws(() => act(s, { type: 'imprintGamble', id: 'charm', value: 'brutal|1' }, 0, rng), /정수/);
    assert.throws(() => act(s, { type: 'imprintGamble', id: 'charm', value: 'nope|1' }, 0, rng), /옵션/);
    assert.ok(!Co.imprintChoices('charm').some(a => a.kind === 'rule'), 'no rule options to imprint');
    const t = newState(0); t.level = 50; t.gold = 1e12; t.essence = 0; t.permanent.inventory = 8; t.inventory = []; t.itemBook = {};
    const bag = t.inventory.length; act(t, { type: 'autoGamble', id: 'rod', value: `4|${1e12}` }, 0, rng);
    assert.equal(t.inventory.length, bag + 1, 'only the target piece enters the bag'); assert.ok(t.inventory.at(-1).rarity >= 4);
    assert.ok(t.appraisal.count <= Ec.AUTO_APPRAISAL_MAX && t.appraisal.count >= 1); assert.ok(Object.keys(t.itemBook).length >= 1, 'missing kinds registered');
    const u = newState(0); u.level = 50; u.gold = Co.gambleCost(u) * 3; u.permanent.inventory = 8; u.inventory = [];
    act(u, { type: 'autoGamble', id: 'rod', value: `6|${u.gold}` }, 0, () => 0); assert.equal(u.appraisal.count, 3, 'stops at the gold limit'); assert.equal(u.inventory.length, 0);
});
test('v3.59 primal drops: weight cut to ~0.054% of drops and a pity at PRIMAL_DROP_PITY drops, kept through rebirth', async () => {
    const Enc = await L.load('systems/encounter'), Ec = await L.load('data/economy');
    const s = newState(0); s.level = 50; s.permanent.inventory = 8; s.inventory = []; s.primalDropPity = Ec.PRIMAL_DROP_PITY - 2;
    Enc.drop(s, 50, () => 0, true); assert.equal(s.inventory.at(-1).rarity, 1); assert.equal(s.primalDropPity, Ec.PRIMAL_DROP_PITY - 1);
    Enc.drop(s, 50, () => 0, true); assert.equal(s.inventory.at(-1).rarity, 6, 'pity drop is primal'); assert.equal(s.primalDropPity, 0);
    const r = newState(0); r.level = 60; r.primalDropPity = 123; act(r, { type: 'rebirth' }, 0); assert.equal(r.primalDropPity, 123);
});
test('v3.66 heir gear: relic power follows (level + 2) × rebirth factor; awakened ancients and inherited primals survive rebirth, grow, cap one per slot', async () => {
    const Eq = await L.load('systems/equipment'), { rollAffixes, affixQuality } = await L.load('data/gear');
    const gear = (id, rarity, slot = 'rod', level = 100) => { const power = Math.round((level + 2) * [1, 1.5, 2.2, 3.3, 3.9, 4.5, 5.2][rarity]); return { id, name: id, slot, style: 'physical', rarity, power, level, enhance: 0, affixes: rollAffixes(rarity, power, undefined, () => .3, [], slot, level) }; };
    // 위력 배율은 환생 200까지 곧게 오르고, 종류마다 유물 < 원시 고대 < 계승 태초입니다.
    for (const rb of [0, 100, 200]) assert.ok(Ec.heirFactor('relic', rb) < Ec.heirFactor('ancient', rb) && Ec.heirFactor('ancient', rb) < Ec.heirFactor('primal', rb), `order at ${rb}`);
    assert.ok(Ec.awakenEssence(0) === Ec.AWAKENING.essenceBase && Ec.awakenEssence(120) === Ec.AWAKENING.essenceBase * 10);
    // 원시 각성: 정수를 쓰고, 옵션은 최고 수치, 위력은 계승 공식, 보호됩니다.
    const s = newState(0); s.level = 100; s.rebirths = 50; s.permanent.inventory = 8; s.inventory = [gear('a1', 5), gear('a2', 5), gear('p1', 6), gear('p2', 6), gear('p3', 6), gear('p4', 6, 'coat')];
    assert.throws(() => act(s, { type: 'awaken', id: 'a1' }, 0), /정수가 부족/);
    assert.throws(() => act(s, { type: 'awaken', id: 'p1' }, 0), /고대 등급/);
    s.essence = Ec.awakenEssence(50) * 2;
    act(s, { type: 'awaken', id: 'a1' }, 0); const a1 = s.inventory.find(x => x.id === 'a1');
    assert.equal(a1.heir, 'ancient'); assert.equal(a1.locked, true); assert.equal(a1.power, Ec.heirPower('ancient', 50, 100)); assert.equal(s.essence, Ec.awakenEssence(50));
    assert.ok(a1.affixes.every(x => x.rule || affixQuality(x, a1.power, 5, 100) > .99), 'options fixed at the top roll');
    assert.throws(() => act(s, { type: 'awaken', id: 'a1' }, 0), /이미 계승/);
    assert.throws(() => act(s, { type: 'dismantle', id: 'a1' }, 0), /분해할 수 없/); assert.throws(() => act(s, { type: 'sell', id: 'a1' }, 0), /판매할 수 없/);
    // 같은 부위 두 번째 각성: 예전 것은 이번 생 장비로 돌아갑니다(부위마다 1개).
    act(s, { type: 'awaken', id: 'a2' }, 0); assert.equal(s.inventory.find(x => x.id === 'a1').heir, undefined); assert.equal(s.inventory.find(x => x.id === 'a2').heir, 'ancient');
    // 태초 계승: 태초 분해 3개가 게이지를 채웁니다(칠흑 장신구는 세지 않음).
    assert.throws(() => act(s, { type: 'inheritPrimal', id: 'p1' }, 0), /게이지가 부족/);
    for (const id of ['p2', 'p3', 'p4']) act(s, { type: 'dismantle', id }, 0);
    assert.equal(s.primalGauge, Ec.PRIMAL_INHERIT.gauge); assert.equal(Eq.primalGaugeOf({ rarity: 6, onyx: 'x' }), 0);
    act(s, { type: 'inheritPrimal', id: 'p1' }, 0); const p1 = s.inventory.find(x => x.id === 'p1');
    assert.equal(p1.heir, 'primal'); assert.equal(s.primalGauge, 0); assert.ok(p1.power > s.inventory.find(x => x.id === 'a2').power);
    // 환생: 계승 장비만 남고(a1은 일반 고대로 돌아가 사라짐), 위력과 고정 수치 옵션이 새 환생 배율을 따릅니다. 게이지는 남습니다.
    s.primalGauge = 2; const flat = p1.affixes.find(x => !x.rule && ['attack', 'hp', 'defense', 'magic', 'resist'].includes(x.stat)); const before = flat?.value, oldPower = p1.power;
    s.rebirths = 199; s.level = 300; act(s, { type: 'rebirth' }, 0);
    const kept = s.inventory.filter(x => x.heir).map(x => x.id).sort(); assert.deepEqual(kept, ['a2', 'p1']); assert.ok(!s.inventory.some(x => x.id === 'a1'));
    const p = s.inventory.find(x => x.id === 'p1'); assert.equal(p.power, Ec.heirPower('primal', 200, 100)); assert.equal(s.primalGauge, 2);
    if (flat) assert.equal(p.affixes.find(x => x.id === flat.id).value, Math.round(before * p.power / oldPower), 'flat options follow the power');
    // 별이 파괴되면 계승 장비는 유물처럼 12성으로 돌아갑니다.
    const C = await L.load('systems/commerce'), SF = await L.load('data/starforce');
    p.enhance = 21; const r = C.starForceAttempt(s, p, false, () => SF.starSuccess(21) + 1e-9, () => {}); assert.equal(r.outcome, 'destroy'); assert.ok(s.inventory.includes(p)); assert.equal(p.enhance, SF.STARFORCE.relicResetStar);
});
test('v3.66 relics owned before the update keep the higher of the old and new power formulas until ascension', async () => {
    const M = await L.load('systems/migrations'), Eq = await L.load('systems/equipment');
    const s = newState(0); s.rebirths = 150; s.level = 100; delete s.relicRule;
    const relic = { id: 'r', name: 'r', slot: 'rod', style: 'balanced', rarity: 3, level: 100, power: 1, relic: 'memoryRod', locked: true };
    s.inventory = [relic]; M.migrateState(s, 0);
    assert.equal(relic.relicLegacy, true); assert.equal(s.relicRule, true);
    assert.equal(relic.power, Math.max(Ec.heirPower('relic', 150, 100), Ec.legacyRelicPower('memoryRod', 150, 100))); assert.ok(relic.power > Ec.heirPower('relic', 150, 100), 'old formula is higher at high rebirths');
    // 새로 받는 유물은 새 공식만, 새 캐릭터는 처음부터 이전 처리 완료.
    assert.equal(newState(0).relicRule, true);
    const fresh = { ...relic, id: 'f', relicLegacy: undefined }; s.inventory.push(fresh); Eq.syncRelicPower(s); assert.equal(fresh.power, Ec.heirPower('relic', 150, 100));
    // 승천하면 유물은 사라지고 규칙 표시는 남아 다시 받은 유물은 새 공식입니다.
    s.rebirths = 200; Lc.ascend(s, 0); assert.equal(s.relicRule, true); assert.ok(!s.inventory.some(x => x.relic));
});

test('v3.71 options: quality 1 + 0.2 × rarity, ancient+ only options (not on lower grades, not imprintable), two-edged options scaled both ways', async () => {
    const G = await L.load('data/gear'), Co = await L.load('systems/commerce');
    assert.equal(G.rarityQuality(6), 2.2); assert.equal(G.rarityQuality(4), 1.8);
    const ancientOnly = G.AFFIX_POOL.filter(a => a.minRarity === 5).map(a => a.id).sort();
    assert.deepEqual(ancientOnly, ['bounty', 'hunter', 'ruin', 'tempo', 'transcend']);
    for (let i = 0; i < 60; i++) {
        const r = (i % 6) / 6 + .01;
        assert.ok(!G.rollAffixes(4, 400, undefined, () => r, [], 'rod', 100).some(a => ancientOnly.includes(a.id)), 'never on myth');
    }
    const seen = new Set(); for (let i = 0; i < 400; i++) { let x = i * 7919 % 1000 / 1000; for (const a of G.rollAffixes(6, 500, undefined, () => (x = (x * 9301 + .4927) % 1), [], 'rod', 100)) seen.add(a.id); }
    assert.ok(ancientOnly.some(id => seen.has(id)), 'primal rolls can carry ancient+ options');
    for (const slot of ['rod', 'coat', 'charm', 'cape']) assert.ok(!Co.imprintChoices(slot).some(a => ancientOnly.includes(a.id)), 'imprint appraisal cannot pick them');
    const berserk = G.affixDef('berserk'); assert.equal(berserk.base, 1.35); assert.equal(berserk.base2, -.675);
    assert.equal(G.GEAR_CAPS.lifesteal, .1);
});
test('v3.72 draws: accuracy+evasion merged into sense (both rolled), precise/drift/runic retired but still readable, auto draw spends everything with limit "max"', async () => {
    const G = await L.load('data/gear'), Co = await L.load('systems/commerce'), Eq = await L.load('systems/equipment');
    const sense = G.affixDef('sense'), lo = G.rollOption(sense, 100, 6, () => 0, 100), hi = G.rollOption(sense, 100, 6, () => 1, 100);
    assert.equal(sense.stat, 'accuracy'); assert.equal(sense.stat2, 'evasion'); assert.ok(hi.value2 > lo.value2 && lo.value2 > 0, 'evasion part is rolled too');
    for (const id of ['precise', 'drift', 'runic']) assert.equal(G.affixDef(id).retired, true);
    for (let i = 0; i < 200; i++) { const r = (i * 37 % 100) / 100 + .001; assert.ok(!G.rollAffixes(6, 500, undefined, () => r, [], 'rod', 100).some(a => ['precise', 'drift', 'runic'].includes(a.id))); }
    for (const slot of ['rod', 'cape']) assert.ok(!Co.imprintChoices(slot).some(a => a.retired));
    const old = Eq.itemStats({ id: 'x', slot: 'rod', rarity: 3, power: 10, level: 10, affixes: [{ id: 'precise', name: '정밀', stat: 'accuracy', value: .05 }] });
    assert.ok(old.accuracy >= .05, 'old items keep working');
    const refined = G.refineOption(hi, 100, 6, () => 0, 100); assert.ok(refined.value2 < hi.value2, 'refine rerolls both values');
    const s = newState(0); s.level = 50; s.permanent.inventory = 8; s.inventory = []; s.gold = Co.gambleCost(s) * 3;
    act(s, { type: 'autoGamble', id: 'rod', value: '6|max' }, 0, () => 0); assert.equal(s.appraisal.count, 3, 'uses all the gold'); assert.ok(s.gold < Co.gambleCost(s));
});
test('v3.73 options: crit damage drawn at 0.4 weight, force/guardian roll both damped stats, mana pair merged into flow, bounty is ancient+, blood pact ignores the gear lifesteal cap', async () => {
    const G = await L.load('data/gear'), Co = await L.load('systems/commerce'), Eq = await L.load('systems/equipment'), S = await L.load('systems/stats');
    assert.equal(G.affixDef('brutal').weight, .4); assert.equal(G.affixDef('ruin').weight, .4);
    let x = 7, brutal = 0; const rng = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 4000; i++) if (G.rollAffixes(1, 100, undefined, rng, [], 'rod', 100).some(a => a.id === 'brutal')) brutal++;
    const general = Co.imprintChoices('rod').length; assert.ok(brutal / 4000 < 1.6 / general, `brutal rate ${brutal / 4000} vs uniform ${1 / general}`);
    for (const id of ['force', 'guardian']) {
        const def = G.affixDef(id), a = G.rollOption(def, 100, 4, () => .5, 100); assert.ok(a.value > 0 && a.value2 === a.value, `${id} rolls both`);
        // v3.129 장신구도 체력 · 방어를 주므로 옵션 없는 같은 장비의 기본 수치를 뺀 뒤 비교합니다.
        const item = { id: 'x', slot: 'charm', rarity: 4, power: 100, level: 100 }, st = Eq.itemStats({ ...item, affixes: [a] }), bare = Eq.itemStats({ ...item, affixes: [] });
        assert.ok(Math.abs(st[def.stat2] - (bare[def.stat2] || 0) - a.value2 * Eq.GEAR_RARITY_SCALE[4]) < 1e-9, `${id} second stat damped`);
    }
    for (const id of ['might', 'arcana', 'plating', 'ward']) assert.ok(!G.affixDef(id).retired, `${id} kept`);
    for (const id of ['wellspring', 'current']) { assert.equal(G.affixDef(id).retired, true); assert.ok(!Co.imprintChoices('rod').some(a => a.id === id)); }
    assert.equal(G.affixDef('flow').stat2, 'manaRegen'); assert.ok(Co.imprintChoices('rod').some(a => a.id === 'flow'));
    assert.equal(G.affixDef('bounty').minRarity, 5); assert.ok(!Co.imprintChoices('rod').some(a => a.id === 'bounty'));
    const s = newState(0), base = S.stats(s).lifesteal;
    const pact = { id: 'bloodPact', name: '피의 계약', stat: 'lifesteal', value: .08, stat2: 'hp', value2: -1 }, leech = { id: 'leech', name: '흡혈', stat: 'lifesteal', value: .08 };
    s.equipment.charm = { id: 'c', slot: 'charm', rarity: 4, power: 10, level: 10, affixes: [leech, { ...leech }] };
    const capped = S.stats(s).lifesteal; assert.ok(Math.abs(capped - base - G.GEAR_CAPS.lifesteal) < 1e-9, 'plain lifesteal stops at the gear cap');
    s.equipment.cape = { id: 'k', slot: 'cape', rarity: 4, power: 10, level: 10, affixes: [pact] };
    assert.ok(Math.abs(S.stats(s).lifesteal - capped - .08) < 1e-9, 'blood pact adds on top of the cap');
});
test('v3.75 rare primal/onyx options (drill/valor fixed +1, apex super crit, distill essence) and junk options (ornate name, pinch +1 hp)', async () => {
    const G = await L.load('data/gear'), Co = await L.load('systems/commerce'), Eq = await L.load('systems/equipment'), S = await L.load('systems/stats'), M = await L.load('systems/mastery'), T = await L.load('systems/turn'), O = await L.load('data/odds');
    const rare = ['drill', 'valor', 'apex', 'distill'];
    for (const id of rare) { const d = G.affixDef(id); assert.equal(d.minRarity, 6); assert.ok(d.rare); assert.ok(!Co.imprintChoices('rod').some(a => a.id === id)); }
    assert.ok(O.ODDS.affix.rare > 0 && O.ODDS.affix.rare < .01 && O.ODDS.affix.junk > 0, 'server odds loaded');
    let x = 3; const rng = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 3000; i++) assert.ok(!G.rollAffixes(5, 500, undefined, rng, [], 'rod', 100).some(a => rare.includes(a.id)), 'never below primal');
    const drill = G.rollOption(G.affixDef('drill'), 500, 6, () => .9, 100); assert.equal(drill.value, 1, 'fixed, not rolled');
    assert.deepEqual(G.refineOption(drill, 500, 6, () => 0, 100), drill); assert.equal(G.affixQuality(drill, 500, 6, 100), null);
    const s = newState(0); s.gold = 1e9; s.essence = 1e6; s.inventory = [{ id: 'p', slot: 'rod', style: 'physical', rarity: 6, power: 500, level: 100, name: 'p', affixes: [drill] }];
    assert.throws(() => act(s, { type: 'refine', id: 'p', value: '0' }, 0, rng), /고정/);
    const base = M.victoryMastery(s, { id: 'minnow', boss: false }).base;
    s.equipment.rod = s.inventory.pop(); assert.equal(M.victoryMastery(s, { id: 'minnow', boss: false }).base, base + 1, 'drill +1 mastery per kill');
    const apex = G.rollOption(G.affixDef('apex'), 500, 6, () => .5, 100), sc = S.stats(s).superCrit;
    s.equipment.charm = { id: 'c', slot: 'charm', rarity: 6, power: 10, level: 10, affixes: [apex] }; assert.ok(Math.abs(S.stats(s).superCrit - sc - apex.value) < 1e-9, 'apex adds super crit');
    const junkFree = Eq.dismantleEssence({ rarity: 6 }, s); s.equipment.cape = { id: 'k', slot: 'cape', rarity: 6, power: 10, level: 10, affixes: [{ id: 'distill', name: '정수', stat: 'essenceBonus', value: .5 }] };
    assert.equal(Eq.dismantleEssence({ rarity: 6 }, s), Math.round(junkFree * 1.5), 'distill +50% essence');
    const rankGain = valor => { const t = newState(0); t.level = 20; t.running = true; if (valor) t.equipment.coat = { id: 'v', slot: 'coat', rarity: 6, power: 10, level: 10, affixes: [{ id: 'valor', name: '전공', stat: 'rankFlat', value: 1 }] };
        t.enemy = { id: 'minnow', name: 't', hp: 1, maxHp: 1, attack: 0, defense: 0, exp: 1, gold: 1, boss: false, stun: 0 }; const before = t.rank?.exp || 0; T.tick(t, () => .5); return (t.rank?.exp || 0) - before; };
    assert.equal(rankGain(true), rankGain(false) * 2, 'valor doubles rank kills');
    const junk = G.rollAffixes(6, 500, undefined, () => 0, [], 'rod', 100); assert.equal(junk.filter(a => G.affixDef(a.id).junk).length, 1, 'at most one junk line');
    assert.ok(!G.rollAffixes(6, 500, 'onyx', () => 0, [], 'charm', 100).some(a => G.affixDef(a.id).junk), 'no junk on onyx');
    const named = G.syncOrnateName({ name: '창', affixes: [{ id: 'ornate', name: '장식', stat: 'ornament', value: 1 }] }); assert.equal(named.name, '반짝이는 창');
    named.affixes = []; assert.equal(G.syncOrnateName(named).name, '창');
    const pinch = G.rollOption(G.affixDef('pinch'), 500, 6, () => .9, 100); assert.equal(Eq.itemStats({ id: 'c', slot: 'rod', rarity: 6, power: 10, level: 10, affixes: [pinch] }).hp, 1, 'pinch is a flat +1 hp');
    for (const id of ['ornate', 'pinch']) assert.ok(!Co.imprintChoices('rod').some(a => a.id === id));
});
test('v3.77 onyx accessories carry max-rolled options (power still grows only by paid level-ups) and fall back to 12★ instead of breaking', async () => {
    const M = await L.load('systems/migrations'), Eq = await L.load('systems/equipment'), C = await L.load('systems/commerce'), SF = await L.load('data/starforce'), O = await L.load('data/onyx'), G = await L.load('data/gear');
    const s = newState(0); s.rebirths = 150; s.level = 100;
    const it = O.onyxAccessory(O.ONYX_BOSSES[0], 'ox', 100); it.affixes = G.rollAffixes(6, it.power, it.origin, () => .3, it.affixes, 'charm', 100); const before = it.power;
    s.inventory = [it]; M.migrateState(s, 0);
    assert.equal(Eq.heirKind(it), null); assert.equal(it.power, before, 'no free growth from rebirths'); assert.equal(it.power, Math.round(102 * O.ONYX.power));
    assert.equal(it.onyxTuned, true); assert.ok(it.affixes[0].rule && it.affixes[0].value === O.ONYX_BOSSES[0].accessory.affix.value, 'unique rule kept');
    for (const x of it.affixes.filter(a => !a.rule)) { const q = G.affixQuality(x, it.power, it.rarity, 100); assert.ok(q === null || q > .99, `${x.id} max roll ${q}`); }
    const tuned = JSON.stringify(it.affixes); M.migrateState(s, 0); assert.equal(JSON.stringify(it.affixes), tuned, 'tuned once');
    it.enhance = 21; const r = C.starForceAttempt(s, it, false, () => SF.starSuccess(21) + 1e-9, () => {});
    assert.equal(r.outcome, 'destroy'); assert.ok(s.inventory.includes(it), 'not lost'); assert.equal(it.enhance, SF.STARFORCE.relicResetStar);
});
test('v3.81 permanent gear (relic / heir / onyx) star force costs × (1 + 0.21 × rebirths); normal gear unchanged; appraisal price is linear from ~38 rebirths', async () => {
    const Eq = await L.load('systems/equipment'), SF = await L.load('data/starforce'), Ec = await L.load('data/economy');
    const base = { id: 'x', slot: 'rod', style: 'physical', rarity: 6, power: 530, level: 100, enhance: 15, name: 'x', affixes: [] };
    const s = newState(0); s.rebirths = 60;
    const plain = Eq.enhanceCost(base, s), heir = Eq.enhanceCost({ ...base, heir: 'primal' }, s), onyx = Eq.enhanceCost({ ...base, onyx: 'onyxDusk' }, s);
    assert.equal(plain, Eq.enhanceCost(base, { ...s, rebirths: 0 }), 'normal gear ignores rebirths');
    assert.ok(Math.abs(heir / plain - (1 + 60 * SF.STARFORCE.permanentPerRebirth)) < .01, `heir ×${heir / plain}`);
    assert.ok(Math.abs(onyx / heir - 1) < .001, 'onyx priced like heir gear');
    assert.equal(Eq.enhanceCost({ ...base, heir: 'primal' }, { ...s, rebirths: 0 }), plain, 'no extra cost at 0 rebirths');
    assert.equal(Ec.appraisalRebirthFactor(60), 1 + 60 * .45); assert.ok(Ec.appraisalRebirthFactor(30) < 1 + 30 * .45); assert.equal(Ec.appraisalRebirthFactor(200), 1 + 200 * .45);
});
test('v3.82 relic imprint keeps the source item\'s effective flat bonus (source damp ÷ relic damp); old imprints are corrected once, never raised', async () => {
    const Eq = await L.load('systems/equipment'), G = await L.load('data/gear'), M = await L.load('systems/migrations');
    const s = newState(0); s.level = 100; s.gold = 1e12;
    const relic = { id: 'r', name: 'r', slot: 'rod', style: 'balanced', rarity: 3, level: 100, power: 300, relic: 'memoryRod', locked: true, affixes: [] };
    const glass = G.rollOption(G.affixDef('glassCannon'), 530, 6, () => .5, 100);
    const source = { id: 'p', name: 'p', slot: 'rod', style: 'magic', rarity: 6, level: 100, power: 530, affixes: [glass] };
    s.inventory = [relic, source];
    act(s, { type: 'imprintRelic', id: 'r', value: 'p:0:0' }, 0);
    const line = relic.affixes[0];
    assert.equal(line.srcRarity, 6); assert.equal(line.value2, glass.value2, 'hp penalty unchanged');
    const onSource = Eq.itemStats({ ...source, power: 1 }).magic, onRelic = Eq.itemStats({ ...relic, power: 1 }).magic;
    assert.ok(Math.abs(onRelic - onSource) <= 1, `same effective magic ${onRelic} vs ${onSource}`);
    // 예전 줄(srcRarity 없음): 태초급 수치는 줄고, 낮은 수치는 그대로.
    const old = { ...relic, id: 'r2', relic: 'soulCoat', affixes: [{ ...glass }, { id: 'might', name: '맹공', stat: 'attack', value: 20 }] };
    const t = newState(0); t.inventory = [old]; M.migrateState(t, 0);
    assert.ok(old.affixes[0].value < glass.value, 'primal-sized line shrinks'); assert.equal(old.affixes[1].value, 20, 'small line is not raised');
    const once = JSON.stringify(old.affixes); M.migrateState(t, 0); assert.equal(JSON.stringify(old.affixes), once, 'only once');
});
test('v3.82 removing an imprinted relic line is free and empties that slot', () => {
    const s = newState(0); s.gold = 0;
    const relic = { id: 'r', name: 'r', slot: 'rod', style: 'balanced', rarity: 3, level: 1, power: 10, relic: 'memoryRod', locked: true, affixes: [{ id: 'might', name: '맹공', stat: 'attack', value: 5, srcRarity: 3 }, { id: 'glassCannon', name: '유리 대포', stat: 'magic', value: 9, stat2: 'hp', value2: -20, srcRarity: 3 }] };
    s.inventory = [relic];
    act(s, { type: 'removeImprint', id: 'r', value: '0' }, 0);
    assert.deepEqual(relic.affixes.map(x => x.id), ['glassCannon']); assert.equal(s.gold, 0);
    assert.throws(() => act(s, { type: 'removeImprint', id: 'r', value: '5' }, 0), /지울/);
});

test('v3.114 rebirth 50 · 100 onyx milestones: random accessory once per character (retroactive on load, not again after ascension), repeat kinds awaken; ascension log keeps earlier records', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const G = await L.load('systems/onyx-grant'), Mig = await L.load('systems/migrations'), O = await L.load('data/onyx');
    const onyx = s => [...s.inventory, ...Object.values(s.equipment)].filter(i => i?.onyx);
    // 환생해서 50회에 닿으면 1개.
    const s = newState(0); s.rebirths = 49; s.level = 100; act(s, { type: 'rebirth' }, 1000);
    assert.equal(s.rebirths, 50); assert.deepEqual(s.onyxMilestones, [50]); assert.equal(onyx(s).length, 1); assert.ok(s.logs.some(l => l.text.includes('환생 50회 달성 보상')));
    s.level = 100; act(s, { type: 'rebirth' }, 2000); assert.equal(onyx(s).length, 1, 'no repeat at 51');
    // 소급: 이미 120회인 세이브를 불러오면 50 · 100 두 개(같은 종이면 각성).
    const old = newState(0); old.rebirths = 120; old.version = (await L.load('data/balance')).SAVE_VERSION; Mig.migrateState(old, 0);
    assert.deepEqual(old.onyxMilestones, [50, 100]); const got = onyx(old); assert.ok(got.length === 2 || got.length === 1 && got[0].onyxRank === 1, JSON.stringify(got.map(i => [i.onyx, i.onyxRank])));
    Mig.migrateState(old, 0); assert.equal(onyx(old).length, got.length, 'idempotent');
    // 같은 종 두 번: 각성.
    const same = newState(0); same.rebirths = 100; G.grantOnyxMilestones(same, () => 0); assert.equal(onyx(same).length, 1); assert.equal(onyx(same)[0].onyx, O.ONYX_BOSSES[0].id); assert.equal(onyx(same)[0].onyxRank, 1);
    // 승천: 칠흑은 사라지고(유물 · 칠흑과 같음) 이정표는 남아 다시 50회에 닿아도 주지 않음. 승천 기록은 이어 붙음.
    const a = newState(0); a.rebirths = 100; G.grantOnyxMilestones(a, () => .5); act(a, { type: 'ascend' }, 5000);
    assert.deepEqual(a.onyxMilestones, [50, 100]); a.rebirths = 49; a.level = 100; act(a, { type: 'rebirth' }, 6000); assert.equal(a.logs.filter(l => l.text.includes('달성 보상')).length, 0, 'not again after ascension');
    a.rebirths = 125; act(a, { type: 'ascend' }, 9000); assert.deepEqual(a.ascensionLog.map(x => [x.n, x.rebirths]), [[1, 100], [2, 125]], 'v3.114 earlier ascension records survive');
    // 승천 기록만 있는 캐릭터(지금 생은 10회)도 소급: 지난 승천에서 100회에 닿았음.
    const b = newState(0); b.rebirths = 10; b.ascensionLog = [{ n: 1, at: 0, rebirths: 100, abyssBest: 0, realMs: 0, kills: 0 }]; G.grantOnyxMilestones(b, () => .3); assert.deepEqual(b.onyxMilestones, [50, 100]);
});

test('v3.115 news: a milestone onyx reads ‘환생 N회 달성 보상으로 … 받았습니다’, a hunted one keeps the old line; the gift note is cleared', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const N = await L.load('systems/news'), G = await L.load('systems/onyx-grant'), O = await L.load('data/onyx');
    const s = newState(0); N.collectNews(s, 0); s.rebirths = 50; G.grantOnyxMilestones(s, () => 0);
    const ev = N.collectNews(s, 0), line = ev.find(e => e.kind === 'onyx').text('영희');
    assert.ok(line.startsWith(`영희가 환생 50회 달성 보상으로 칠흑 장신구 ‘${O.ONYX_BOSSES[0].accessory.name}’`) && line.endsWith('받았습니다.'), line);
    assert.equal(s.onyxGift, undefined, 'gift note cleared');
    s.inventory.push(O.onyxAccessory(O.ONYX_BOSSES[1], 'hunt', 60));
    assert.ok(N.collectNews(s, 86_400_000).find(e => e.kind === 'onyx').text('영희').endsWith('얻었습니다.'), 'hunted onyx keeps the old line');
});

test('v3.116 account vault onyx: deposit (not worn) keeps stars and awakening, withdraw into another slot, repeat kind awakens, ascension removes only that slot\'s deposits', async () => {
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const file = path.join(os.tmpdir(), `tb-vault-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    const V = await L.load('server/vault'), O = await L.load('data/onyx');
    try {
        const now = Date.now(), acc = 'acct_v';
        const a = newState(0), b = newState(0);
        const dusk = O.onyxAccessory(O.ONYX_BOSSES[0], 'dusk-a', 60); dusk.enhance = 17; dusk.onyxRank = 2; a.inventory.push(dusk);
        const will = O.onyxAccessory(O.ONYX_BOSSES.find(x => x.id === 'onyxWill'), 'will-a', 60); a.equipment.charm = will;
        await assert.rejects(V.vaultMove(acc, a, 'deposit', 'onyx', 'will-a', now, 1), /착용 중/);
        const before = structuredClone(a), first = await V.vaultMove(acc, a, 'deposit', 'onyx', 'dusk-a', now, 1); let info = first.info;
        first.apply(before); assert.ok(!before.inventory.some(i => i.id === 'dusk-a'), 'a save-conflict retry replays the bag change on the fresh save (no duplicate)');
        assert.equal(info.onyx.length, 1); assert.ok(!a.inventory.some(i => i.id === 'dusk-a'), 'left the bag');
        // 다른 분신이 꺼냄: 별 · 각성 그대로.
        info = (await V.vaultMove(acc, b, 'withdraw', 'onyx', info.onyx[0].id, now, 2)).info;
        const got = b.inventory.find(i => i.onyx === 'onyxDusk'); assert.ok(got && got.enhance === 17 && got.onyxRank === 2); assert.equal(info.onyx.length, 0);
        assert.equal(b.onyxGift?.onyxDusk, 0, 'no news for a vault withdrawal');
        // 같은 종을 가진 분신이 꺼내면 그 칠흑이 각성 +1.
        const dusk2 = O.onyxAccessory(O.ONYX_BOSSES[0], 'dusk-c', 60); a.inventory.push(dusk2);
        info = (await V.vaultMove(acc, a, 'deposit', 'onyx', 'dusk-c', now, 1)).info;
        await V.vaultMove(acc, b, 'withdraw', 'onyx', info.onyx[0].id, now, 2);
        assert.equal(b.inventory.filter(i => i.onyx === 'onyxDusk').length, 1); assert.equal(got.onyxRank, 3, 'awaken +1');
        // 승천: 그 분신이 넣은 칠흑만 사라지고 다른 분신 몫은 남음(세계석 · 정수는 전처럼 비움).
        const lucid = O.onyxAccessory(O.ONYX_BOSSES.find(x => x.id === 'onyxLucid'), 'l', 60), hilla = O.onyxAccessory(O.ONYX_BOSSES.find(x => x.id === 'onyxHilla'), 'h', 60);
        a.inventory.push(lucid); b.inventory.push(hilla); a.pearls = 50;
        await V.vaultMove(acc, a, 'deposit', 'onyx', 'l', now, 1); await V.vaultMove(acc, b, 'deposit', 'onyx', 'h', now, 2); await V.vaultMove(acc, a, 'deposit', 'pearls', 10, now, 1);
        assert.equal(await V.vaultAfterAscend(acc, 1, now), 1);
        info = await V.vaultInfo(acc, now); assert.deepEqual(info.onyx.map(x => x.item.onyx), ['onyxHilla']); assert.equal(info.pearls, 0);
    } finally { delete process.env.TIDEBOUND_DEV_DB; try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});

test('v3.118 gear cost reset: heir / onyx only, 999 pearls, rerolls · refines → 0, stars → 0, extra options rerolled at max value, onyx unique kept', async () => {
    const G = await L.load('data/gear'), O = await L.load('data/onyx');
    const local = (seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296))(77);
    const s = newState(0); s.pearls = 5000;
    const heir = { id: 'h', slot: 'rod', style: 'physical', rarity: 6, power: 500, level: 100, name: 'h', heir: 'primal', enhance: 18, rerolls: 12, refines: 30, affixes: G.rollAffixes(6, 500, undefined, local, [], 'rod', 100) };
    const plain = { id: 'p', slot: 'coat', rarity: 6, power: 500, level: 100, name: 'p', rerolls: 3, affixes: G.rollAffixes(6, 500, undefined, local, [], 'coat', 100) };
    s.inventory.push(heir, plain);
    assert.throws(() => act(s, { type: 'gearReset', id: 'p' }, 0), /원시 고대/);
    act(s, { type: 'gearReset', id: 'h' }, 0, local);
    assert.equal(s.pearls, 5000 - G.GEAR_RESET_PEARLS); assert.equal(heir.enhance, 0); assert.equal(heir.rerolls, 0); assert.equal(heir.refines, 0); assert.equal(heir.affixes.length, 6);
    for (const x of heir.affixes) { const q = G.affixQuality(x, heir.power, heir.rarity, heir.level); assert.ok(q === null || q > .99, `${x.id} max roll ${q}`); }
    assert.throws(() => act(s, { type: 'gearReset', id: 'h' }, 0), /초기화할 비용이 없/);
    const onyx = O.onyxAccessory(O.ONYX_BOSSES[0], 'o', 100); onyx.affixes = G.rollAffixes(6, onyx.power, onyx.origin, local, onyx.affixes, 'charm', 100); onyx.rerolls = 2; onyx.enhance = 10; s.inventory.push(onyx);
    const unique = onyx.affixes[0]; s.pearls = 10; assert.throws(() => act(s, { type: 'gearReset', id: 'o' }, 0), /세계석/); s.pearls = 2000;
    act(s, { type: 'gearReset', id: 'o' }, 0, local); assert.deepEqual(onyx.affixes[0], unique, 'unique kept'); assert.equal(onyx.affixes.length, 6); assert.equal(onyx.enhance, 0);
});

test('v3.119 display bugs: 마력 option mana regen scales with power (and old tiny values are fixed on load), 초월 keeps hp/attack integers', async () => {
    const G = await L.load('data/gear'), Mig = await L.load('systems/migrations'), St = await L.load('systems/stats');
    const flow = G.rollOption(G.affixDef('flow'), 300, 4, () => .5, 80);
    assert.ok(flow.value2 >= 1 && Number.isInteger(flow.value2), `mana regen scales with power: ${flow.value2}`);
    const s = newState(0); s.inventory.push({ id: 'f', slot: 'coat', rarity: 4, power: 300, level: 80, name: 'f', affixes: [{ ...flow, value2: .0108 }] });
    Mig.fixFlowRegen(s); const fixed = s.inventory[0].affixes[0].value2; assert.equal(fixed, Math.round(flow.value * .012 / .225)); Mig.fixFlowRegen(s); assert.equal(s.inventory[0].affixes[0].value2, fixed, 'idempotent');
    const t = newState(0); t.equipment.coat = { id: 'c', slot: 'coat', rarity: 5, power: 333, level: 80, name: 'c', affixes: [{ id: 'transcend', name: '초월', stat: 'allStats', value: .0173 }] };
    const a = St.stats(t); for (const k of ['hp', 'mana', 'attack', 'magic', 'defense', 'resist']) assert.ok(Number.isInteger(a[k]), `${k} ${a[k]}`);
});
test('v3.125 primal gauge fills on every exit path, rare foes are never golden, heir refine ceiling is 150%', async () => {
    const G = await L.load('data/gear'), Eq = await L.load('systems/equipment');
    const gear = (id, rarity, slot = 'rod', level = 100) => { const power = Math.round((level + 2) * [1, 1.5, 2.2, 3.3, 3.9, 4.5, 5.2][rarity]); return { id, name: id, slot, style: 'physical', rarity, power, level, enhance: 0, affixes: G.rollAffixes(rarity, power, undefined, () => .3, [], slot, level) }; };
    const s = newState(0); s.level = 100; s.permanent.inventory = 8; s.gold = 1e12; s.itemBook ??= {};
    s.inventory = [gear('p1', 6), gear('p2', 6), gear('p3', 6), gear('p4', 6, 'coat'), gear('p5', 6), gear('a1', 5)];
    // 단일 판매 · 등급별 일괄 판매.
    act(s, { type: 'sell', id: 'p1' }, 0); assert.equal(s.primalGauge, 1, 'sell fills the gauge');
    for (const id of ['p3', 'p4', 'p5']) s.inventory.find(x => x.id === id).locked = true;
    act(s, { type: 'sellRarity', id: '6' }, 0); assert.equal(s.primalGauge, 2, 'bulk sell fills the gauge'); assert.ok(!s.inventory.some(x => x.id === 'p2'));
    for (const id of ['p3', 'p4', 'p5']) s.inventory.find(x => x.id === id).locked = false;
    // 강화 파괴: 15성 성공률 .3 · 파괴 .021이라 굴림 .31은 파괴입니다.
    const p3 = s.inventory.find(x => x.id === 'p3'); p3.enhance = 15; p3.starFails = 0;
    act(s, { type: 'enhance', id: 'p3', value: '' }, 0, () => .31); assert.ok(!s.inventory.some(x => x.id === 'p3'), 'destroyed'); assert.equal(s.primalGauge, 3, 'destroy fills the gauge');
    // 물건도감 등록 소모.
    act(s, { type: 'registerItem', id: 'p4' }, 0); assert.equal(s.primalGauge, 4, 'codex registration fills the gauge');
    // 고대는 세지 않습니다.
    act(s, { type: 'sell', id: 'a1' }, 0); assert.equal(s.primalGauge, 4, 'ancients do not count');
    // 가방 가득 자동 판매로 사라진 태초도 셉니다.
    s.permanent.inventory = 0; while (s.inventory.length < Ec.inventoryCap(s)) s.inventory.push(gear(`f${s.inventory.length}`, 0));
    const before = s.primalGauge; s.primalDropPity = Ec.PRIMAL_DROP_PITY - 1; E.drop(s, 100, () => .5, true); assert.equal(s.primalGauge, before + 1, 'bag-full auto sale of a primal fills the gauge');
    // 희귀 몬스터는 황금 개체가 되지 않습니다(보통 몬스터는 같은 난수로 황금).
    const r = newState(0); r.level = 100; r.kills = 10000; r.running = true;
    const { stats } = await L.load('systems/stats'); assert.ok(stats(r).goldenFind > 0);
    E.spawn(r, () => .5); r.enemy.hp = 0; E.reward(r, () => 0); assert.ok(Object.keys(r.goldenBook || {}).length === 1, 'a normal foe can be golden');
    for (const kind of ['mimic', 'nuri']) { r.enemy = null; E.spawn(r, () => .5, kind); const id = r.enemy.id; r.enemy.hp = 0; E.reward(r, () => 0); assert.ok(!r.goldenBook?.[id], `${kind} is never golden`); }
    // 칠흑 위력 계수 6.37: Lv.100 650. 옛 530 장신구는 불러올 때 위력과 고정 수치 옵션이 함께 맞춰지고, 레벨 올리기도 같은 식을 씁니다.
    const O = await L.load('data/onyx'), M = await L.load('systems/migrations');
    assert.equal(O.onyxPower(100), 650); assert.equal(O.onyxAccessory(O.ONYX_BOSSES[0], 'ox', 100).power, 650);
    const old = O.onyxAccessory(O.ONYX_BOSSES[6], 'old', 100); old.power = 530; old.affixes = G.rollAffixes(6, 530, old.origin, () => .3, old.affixes, 'charm', 100).map(x => x.rule ? x : G.refineOption(x, 530, 6, () => 1, 100)); old.onyxTuned = true;
    const flatOld = old.affixes.find(x => !x.rule && G.affixDef(x.id)?.kind === 'flat'), flatBefore = flatOld?.value;
    const o = newState(0); o.level = 100; o.inventory = [old]; M.migrateState(o, 0);
    assert.equal(old.power, 650, 'old accessories are raised on load'); if (flatOld) assert.equal(old.affixes.find(x => x.id === flatOld.id).value, Math.round(flatBefore * 650 / 530), 'flat options follow the power');
    M.migrateState(o, 0); assert.equal(old.power, 650, 'stable on the next load');
    Eq.applyLevelUp(old, 110, o); assert.equal(old.power, O.onyxPower(110), 'level up uses the onyx formula');
    // 계승 · 칠흑의 재련 상한 150%: 보통 장비는 1(100%)에서 멈춥니다.
    const h = gear('h1', 6); h.heir = 'primal'; h.locked = true; const n = gear('n1', 6);
    const idx = h.affixes.findIndex(x => G.affixQuality(x, h.power, 6, 100) !== null); assert.ok(idx >= 0);
    assert.equal(Eq.refineTopOf(h), G.HEIR_ROLL_TOP); assert.equal(Eq.refineTopOf(n), 1); assert.equal(Eq.refineTopOf({ onyx: 'x' }), G.HEIR_ROLL_TOP);
    const top = G.refineOption(h.affixes[idx], h.power, 6, () => 1, 100, G.HEIR_ROLL_TOP), plain = G.refineOption(n.affixes[idx], n.power, 6, () => 1, 100);
    assert.ok(G.affixQuality(top, h.power, 6, 100, G.HEIR_ROLL_TOP) > 1.45, 'heir refine reaches 150%'); assert.ok(top.value > plain.value, 'above the normal ceiling');
    assert.ok(Math.abs(G.affixQuality(plain, n.power, 6, 100) - 1) < 1e-6, 'normal gear stays at 100%');
    const t = newState(0); t.level = 100; t.permanent.inventory = 8; t.essence = 1e9; t.inventory = [h, n];
    act(t, { type: 'refine', id: 'h1', value: String(idx) }, 0, () => 1); assert.ok(G.affixQuality(t.inventory[0].affixes[idx], h.power, 6, 100, G.HEIR_ROLL_TOP) > 1.45, 'refine action uses the heir ceiling');
    act(t, { type: 'refine', id: 'n1', value: String(idx) }, 0, () => 1); assert.ok(Math.abs(G.affixQuality(t.inventory[1].affixes[idx], n.power, 6, 100, G.HEIR_ROLL_TOP) - 1) < 1e-6, 'normal refine stays at the normal ceiling');
});

test('v3.122 onyx accessory level: the higher of its habitat level and my level (boss drop and milestone grant)', async () => {
    const G = await L.load('systems/onyx-grant'), O = await L.load('data/onyx');
    const s = newState(0); s.level = 87; G.grantOnyx(s, O.ONYX_BOSSES[0].id, 5, () => .5, 'test');
    const dusk = s.inventory.find(i => i.onyx === 'onyxDusk'); assert.equal(dusk.level, 87); assert.equal(dusk.power, Math.round((87 + 2) * O.ONYX.power));
    const low = newState(0); low.level = 40; G.grantOnyx(low, 'onyxBlackMage', 100, () => .5, 'test'); assert.equal(low.inventory.find(i => i.onyx).level, 100, 'habitat level when higher');
    const m = newState(0); m.level = 120; m.rebirths = 50; G.grantOnyxMilestones(m, () => 0); assert.equal(m.inventory.find(i => i.onyx).level, 120, 'milestone onyx at my level');
});
test('v3.129 slot redistribution: coat / cape / charm share hp and both defenses, totals unchanged, weapon untouched', async () => {
    const Eq = await L.load('systems/equipment');
    const sum = k => ['rod', 'coat', 'cape', 'charm'].reduce((n, sl) => n + (Eq.SLOT_GEAR[sl][k] || 0), 0);
    assert.equal(sum('hp'), 8); assert.equal(Math.round(sum('mana') * 10) / 10, 1.8, 'mana 1.3 → 1.8 spread over weapon · coat · charm · cape'); assert.equal(sum('defense'), 1); assert.equal(sum('resist'), .5);
    assert.deepEqual(Eq.SLOT_GEAR.rod, { mana: .5 }); assert.deepEqual(Eq.SLOT_GEAR.coat, { hp: 3.5, mana: .5, defense: .6, resist: .3 }); assert.deepEqual(Eq.SLOT_GEAR.cape, { hp: 2.5, mana: .3 }); assert.deepEqual(Eq.SLOT_GEAR.charm, { hp: 2, mana: .5, defense: .4, resist: .2 });
    const base = (slot) => ({ id: slot, slot, style: 'balanced', rarity: 0, power: 100, level: 100, enhance: 0, name: slot, affixes: [] });
    const coat = Eq.itemStats(base('coat')), cape = Eq.itemStats(base('cape')), charm = Eq.itemStats(base('charm')), rod = Eq.itemStats({ ...base('rod'), style: 'physical' });
    assert.equal(coat.hp, 350); assert.equal(coat.defense, 60); assert.equal(coat.resist, 30); assert.equal(coat.mana, 50);
    assert.equal(cape.hp, 250); assert.equal(cape.mana, 30); assert.equal(cape.defense, undefined); assert.ok(cape.evasion > 0);
    assert.equal(charm.hp, 200); assert.equal(charm.defense, 40); assert.equal(charm.resist, 20); assert.equal(charm.mana, 50); assert.ok(charm.crit > 0);
    assert.equal(rod.attack, 140); assert.equal(rod.mana, 50, 'weapon gives mana'); assert.equal(rod.hp, undefined, 'weapon gives no hp');
    // v3.129 기본 방어 · 마방 레벨당 값은 그대로(3 + 1 · 3 + .7), 지능 → 마방 .25만 추가(v3.136 체질 → 마방 .4는 제거). 방어 · 마방은 탱커 계보 패시브로 채우는 것이 의도.
    const { stats } = await L.load('systems/stats'), { BALANCE } = await L.load('data/balance'), { ATTRIBUTE_EFFECTS } = await L.load('data/progression');
    assert.deepEqual([BALANCE.baseDefense, BALANCE.defensePerLevel, BALANCE.baseResist, BALANCE.resistPerLevel], [3, 1, 3, .7]); assert.equal(ATTRIBUTE_EFFECTS.vit.resist, undefined); assert.equal(ATTRIBUTE_EFFECTS.int.resist, .25);
    const b = newState(0); b.level = 100; b.attributes = { str: 0, dex: 0, int: 0, vit: 0, wis: 0, luk: 0 }; b.statPoints = 0; const r0 = stats(b).resist; b.attributes.vit = 100; const r1 = stats(b).resist; b.attributes.vit = 0; b.attributes.int = 100; const r2 = stats(b).resist;
    assert.ok(r1 === r0 && r2 > r0, 'v3.136 only int raises resist; vit no longer does');
    assert.equal(coat.hp + cape.hp + charm.hp, 800, 'four-slot hp total is unchanged (6 + 2 before)');
});
test('v3.131 heir refine above 100% is a thin tail (15%, steeper upward) and refine essence grows ×1.1 with a rebirth factor', async () => {
    const G = await L.load('data/gear'), Eq = await L.load('systems/equipment');
    // 0~100%는 균등(85%), 100% 위는 15%만, 위로 갈수록 급히 드뭅니다.
    assert.equal(G.heirRollQuality(.5, 1), .5, 'normal gear: identity'); assert.ok(Math.abs(G.heirRollQuality(.85 * .5) - .5) < 1e-9, 'body maps 0..85% → 0..100%'); assert.equal(G.heirRollQuality(.85), 1); assert.ok(Math.abs(G.heirRollQuality(1) - 1.5) < 1e-9);
    let x = 7; const rng = () => ((x = (x * 16807) % 2147483647) / 2147483647); const N = 40000; const q = Array.from({ length: N }, () => G.heirRollQuality(rng()));
    const above = t => q.filter(v => v > t).length / N;
    assert.ok(Math.abs(above(1) - .15) < .01, `above 100%: ${above(1)}`); assert.ok(Math.abs(above(1.1) - G.heirRollChanceAbove(1.1)) < .006, `above 110%: ${above(1.1)} vs ${G.heirRollChanceAbove(1.1)}`);
    assert.ok(above(1.2) < .03 && above(1.2) > .01, `above 120%: ${above(1.2)}`); assert.ok(above(1.3) < .008, `above 130%: ${above(1.3)}`); assert.ok(above(1.4) < .001, `above 140%: ${above(1.4)}`);
    assert.ok(Math.abs(G.heirRollChanceAbove(1.1) - .15 * .8 ** 4) < 1e-9); assert.equal(G.heirRollChanceAbove(1.5), 0); assert.equal(G.heirRollChanceAbove(1), 1);
    // rollOption은 같은 분포를 씁니다: 계승 상한으로 난수 .85 → 정확히 100%, .99 → 100% 위.
    const def = G.affixDef('might') || G.AFFIX_POOL.find(a => a.kind === 'flat' && !a.rule && !a.fixed);
    const at = u => G.affixQuality(G.rollOption(def, 500, 6, () => u, 100, G.HEIR_ROLL_TOP), 500, 6, 100, G.HEIR_ROLL_TOP);
    assert.ok(Math.abs(at(.85) - 1) < .01 && at(.99) > 1 && at(.99) < 1.3 && at(.3) < .4, `${at(.85)} ${at(.99)} ${at(.3)}`);
    // 재련 비용: ×1.1 복리, 환생 배율 10^(환생 ÷ 120).
    assert.equal(G.REFINE_GROWTH, 1.1); assert.equal(Eq.refineRebirthFactor(0), 1); assert.ok(Math.abs(Eq.refineRebirthFactor(120) - 10) < 1e-9);
    const it = { id: 'p', slot: 'rod', rarity: 6, power: 500, level: 100, refines: 0 };
    assert.equal(Eq.refineCost(it).essence, 7); assert.equal(Eq.refineCost(it, { rebirths: 120 }).essence, 70); assert.equal(Eq.refineCost({ ...it, refines: 10 }).essence, Math.ceil(7 * 1.1 ** 10));
    assert.ok(Eq.refineCost({ ...it, refines: 50 }, { rebirths: 100 }).essence > 4000 && Eq.refineCost({ ...it, refines: 50 }, { rebirths: 100 }).essence < 7000, '50th refine at R100 ≈ one hour of tier-100 essence');
});
test('v3.133 rule options (◆) draw at weight .25: about 36% of primal items carry one (was 80%), rare (★) unchanged', async () => {
    const G = await L.load('data/gear');
    assert.equal(G.RULE_WEIGHT, .25);
    let x = 11; const rng = () => ((x = (x * 16807) % 2147483647) / 2147483647); const N = 6000; let rule6 = 0, rule3 = 0, rare6 = 0;
    for (let i = 0; i < N; i++) { const a = G.rollAffixes(6, 500, undefined, rng, [], 'rod', 100); if (a.some(o => o.rule)) rule6++; if (a.some(o => G.affixDef(o.id)?.rare)) rare6++; const b = G.rollAffixes(3, 500, undefined, rng, [], 'rod', 100); if (b.some(o => o.rule)) rule3++; }
    assert.ok(rule6 / N > .30 && rule6 / N < .43, `primal with a rule option ${rule6 / N}`); assert.ok(rule3 / N > .16 && rule3 / N < .29, `legendary with a rule option ${rule3 / N}`); assert.ok(rare6 / N < .01, `rare ${rare6 / N}`);
    assert.ok(G.rollAffixes(6, 500, undefined, () => 0, [], 'rod', 100).filter(o => o.rule).length <= 1, 'still at most one rule line');
});
test('v3.134 combat power weights offense .65 · durability .35, Lv.1 stays ≈453, and the weapon outranks the coat on primal 22★', async () => {
    const { stats, power, powerParts, POWER_WEIGHT } = await L.load('systems/stats'), { RARITIES } = await L.load('data/balance'), { rollAffixes } = await L.load('data/gear'), { gearName } = await L.load('data/maple-gear');
    assert.deepEqual(POWER_WEIGHT, { offense: .65, durability: .35 });
    const fresh = stats(newState(0)), p = powerParts(fresh); assert.ok(Math.abs(power(fresh) - 453) <= 5, `Lv.1 power ${power(fresh)}`);
    assert.ok(Math.abs(power(fresh) - Math.round(8 * p.offense ** .65 * p.durability ** .35)) <= 1);
    const body = () => { const s = newState(0); s.level = 100; s.rebirths = 200; s.statPoints = 0; s.attributes = { str: 300, dex: 100, int: 0, vit: 100, wis: 0, luk: 300 }; Object.assign(s.permanent, { attack: 200, hp: 200, guard: 100, magicGuard: 100 }); s.equipment = { rod: null, coat: null, charm: null, cape: null }; return s; };
    let x = 3; const rng = () => ((x = (x * 16807) % 2147483647) / 2147483647); const drop = { rod: 0, coat: 0, charm: 0, cape: 0 }, N = 12;
    for (let k = 0; k < N; k++) {
        const s = body(); for (const slot of Object.keys(drop)) { const pw = Math.round(102 * RARITIES[6].factor), style = slot === 'rod' ? 'physical' : 'balanced'; s.equipment[slot] = { id: slot, slot, style, rarity: 6, power: pw, level: 100, enhance: 22, name: gearName(slot, 6, style), affixes: rollAffixes(6, pw, undefined, rng, [], slot, 100) }; }
        const full = power(stats(s)); for (const slot of Object.keys(drop)) { const it = s.equipment[slot]; s.equipment[slot] = null; drop[slot] += (1 - power(stats(s)) / full) / N; s.equipment[slot] = it; }
    }
    assert.ok(drop.rod > drop.coat, `weapon ${drop.rod} should outrank coat ${drop.coat}`); assert.ok(drop.rod > drop.charm && drop.rod > drop.cape);
});
