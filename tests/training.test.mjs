// v3.68 독립 수련 통합(docs/concept.md 11.8): 옛 독립 수련 27개 → 계열별 수련 직업 6개.
import { newState, act, canChangeJob, migrateState, stats, JOBS, SKILLS, assert, test } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';

const { load } = loadGame(), T = await load('game/data/training.js'), P = await load('game/systems/progression.js'), S = await load('game/systems/stats.js'), { lineageOf } = await load('game/data/classes.js');
const job = id => JOBS.find(j => j.id === id);

test('v3.68 training: six training jobs absorb the 27 old independents; every old skill keeps its id under a new owner', () => {
    const ids = Object.keys(T.TRAINING_GROUPS);
    assert.equal(ids.length, 6); assert.equal(T.RETIRED_TRAINING.length, 27); assert.equal(new Set(T.RETIRED_TRAINING).size, 27);
    for (const id of ids) { const j = job(id); assert.ok(j && j.tier === 1 && lineageOf(j) === `${j.tree}-independent` && j.subRole === 'training' && !j.retired, id); }
    for (const old of T.RETIRED_TRAINING) { assert.ok(job(old).retired, old); assert.equal(SKILLS.filter(sk => sk.job === old).length, 0, `${old} owns nothing now`); }
    // 지도 제작자는 둘로: 교란 → 마법 수련, 측량(드롭) → 보조 수련. 척후병의 출혈·중독 → 상태이상 수련.
    const owner = id => SKILLS.find(sk => sk.id === id).job;
    assert.equal(owner('currentJam'), 'trainingMagic'); assert.equal(owner('chartedCurrents'), 'trainingSupport');
    assert.equal(owner('cut'), 'trainingStatus'); assert.equal(owner('rottenBait'), 'trainingStatus');
    assert.equal(owner('axeArm'), 'trainingPhysical'); assert.equal(owner('innerBreath'), 'trainingDefense'); assert.equal(owner('twoHanded'), 'trainingHybrid');
    assert.ok(T.RETIRED_TRAINING.every(id => JOBS.some(j => j.id === id)), 'kept in the table for old records');
});

test('v3.68 training: retired jobs refuse the job change even when mastered; training jobs hunt weak and earn about a third', () => {
    const s = newState(0); s.level = 20; Object.assign(s.attributes, { str: 20, dex: 20, int: 20, vit: 20, wis: 20, luk: 20 });
    assert.equal(canChangeJob(s, 'woodcutter'), false); s.jobMastery.woodcutter = 1e9; assert.equal(canChangeJob(s, 'woodcutter'), false, 'retired even when mastered');
    assert.equal(canChangeJob(s, 'trainingPhysical'), true);
    const j = job('trainingPhysical'); assert.ok(j.attack <= .35 && j.magic <= .35 && j.hp <= .4 && j.rewardScale === .35);
    const base = { ...newState(0), level: 20 }, fisherGold = S.goldMultiplier(base), fisherExp = S.expMultiplier(base);
    const train = { ...base, job: 'trainingPhysical' };
    assert.ok(Math.abs(S.goldMultiplier(train) - fisherGold * .35) < 1e-9 && Math.abs(S.expMultiplier(train) - fisherExp * .35) < 1e-9);
    assert.ok(stats(train).attack < stats(base).attack, 'weaker than the beginner');
});

test('v3.68 training: a save sitting in an old independent job moves to its training job and keeps its skills and records', () => {
    const s = newState(0); s.level = 20; s.job = 'noviceMonk'; s.unlockedJobs.push('noviceMonk'); s.jobMastery.noviceMonk = 400; s.learned.innerBreath = 2; s.skills = ['hook', 'innerBreath'];
    migrateState(s); migrateState(s);
    assert.equal(s.job, 'trainingDefense'); assert.ok(s.unlockedJobs.includes('trainingDefense') && s.unlockedJobs.includes('noviceMonk'));
    assert.equal(s.jobMastery.noviceMonk, 400, 'old mastery kept'); assert.equal(s.learned.innerBreath, 2); assert.deepEqual(s.skills, ['hook', 'innerBreath']);
    assert.ok(stats(s).hpRegen >= 3, 'the passive still works in the training job');
    act(s, { type: 'job', id: 'fisher' }, 0); assert.throws(() => act(s, { type: 'job', id: 'noviceMonk' }, 0));
});

test('v3.68 training passives: tier-3 strength from level 1, tier-3 mastery milestones, old inheritance kept once', () => {
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

test('v3.68 mastered job count: retired independents no longer count, for old saves too', () => {
    const s = newState(0); s.jobMastery.woodcutter = 1e9; s.jobMastery.harpoon = 1e9;
    assert.equal(P.masteredJobCount(s), 1);
});
