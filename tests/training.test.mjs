// v3.66 독립 수련 통합(docs/concept.md 11.8): 옛 독립 수련 27개 → 계열별 수련 직업 6개.
import { newState, act, canChangeJob, migrateState, stats, JOBS, SKILLS, assert, test } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';

const { load } = loadGame(), T = await load('game/data/training.js'), S = await load('game/systems/stats.js'), { lineageOf } = await load('game/data/classes.js');
const job = id => JOBS.find(j => j.id === id);

test('v3.66 training: six training jobs absorb the 27 old independents; every old skill keeps its id under a new owner', () => {
    const ids = Object.keys(T.TRAINING_GROUPS);
    assert.equal(ids.length, 6); assert.equal(T.RETIRED_TRAINING.length, 27); assert.equal(new Set(T.RETIRED_TRAINING).size, 27);
    for (const id of ids) { const j = job(id); assert.ok(j && j.tier === 1 && lineageOf(j) === `${j.tree}-independent` && j.subRole === 'training' && !j.retired, id); }
    for (const old of T.RETIRED_TRAINING) { assert.ok(job(old).retired, old); assert.equal(SKILLS.filter(sk => sk.job === old).length, 0, `${old} owns nothing now`); }
    // 지도 제작자는 둘로: 교란 → 마법 수련, 측량(드롭) → 보조 수련. 척후병의 출혈·중독 → 상태이상 수련.
    const owner = id => SKILLS.find(sk => sk.id === id).job;
    assert.equal(owner('currentJam'), 'trainingMagic'); assert.equal(owner('chartedCurrents'), 'trainingSupport');
    assert.equal(owner('cut'), 'trainingStatus'); assert.equal(owner('rottenBait'), 'trainingStatus');
    assert.equal(owner('axeArm'), 'trainingPhysical'); assert.equal(owner('innerBreath'), 'trainingDefense'); assert.equal(owner('twoHanded'), 'trainingHybrid');
    // 옛 독립 수련은 숙달 수에 계속 셉니다(표에 남음).
    assert.ok(T.RETIRED_TRAINING.every(id => JOBS.some(j => j.id === id)));
});

test('v3.66 training: retired jobs refuse the job change even when mastered; training jobs hunt weak and earn half', () => {
    const s = newState(0); s.level = 20; Object.assign(s.attributes, { str: 20, dex: 20, int: 20, vit: 20, wis: 20, luk: 20 });
    assert.equal(canChangeJob(s, 'woodcutter'), false); s.jobMastery.woodcutter = 1e9; assert.equal(canChangeJob(s, 'woodcutter'), false, 'retired even when mastered');
    assert.equal(canChangeJob(s, 'trainingPhysical'), true);
    const j = job('trainingPhysical'); assert.ok(j.attack <= .4 && j.magic <= .4 && j.hp <= .5 && j.rewardScale === .5);
    const base = { ...newState(0), level: 20 }, fisherGold = S.goldMultiplier(base), fisherExp = S.expMultiplier(base);
    const train = { ...base, job: 'trainingPhysical' };
    assert.ok(Math.abs(S.goldMultiplier(train) - fisherGold * .5) < 1e-9 && Math.abs(S.expMultiplier(train) - fisherExp * .5) < 1e-9);
    assert.ok(stats(train).attack < stats(base).attack, 'weaker than the beginner');
});

test('v3.66 training: a save sitting in an old independent job moves to its training job and keeps its skills and records', () => {
    const s = newState(0); s.level = 20; s.job = 'noviceMonk'; s.unlockedJobs.push('noviceMonk'); s.jobMastery.noviceMonk = 400; s.learned.innerBreath = 2; s.skills = ['hook', 'innerBreath'];
    migrateState(s); migrateState(s);
    assert.equal(s.job, 'trainingDefense'); assert.ok(s.unlockedJobs.includes('trainingDefense') && s.unlockedJobs.includes('noviceMonk'));
    assert.equal(s.jobMastery.noviceMonk, 400, 'old mastery kept'); assert.equal(s.learned.innerBreath, 2); assert.deepEqual(s.skills, ['hook', 'innerBreath']);
    assert.ok(stats(s).hpRegen >= 2, 'the passive still works in the training job');
    act(s, { type: 'job', id: 'fisher' }, 0); assert.throws(() => act(s, { type: 'job', id: 'noviceMonk' }, 0));
});
