// 직업 개편 2단계: ??? 계열의 숨은 조건과 숙달 규칙. v3.62 문(윤회의 문·발견의 문·운영 문 열기)을 없애고 숨은 조건만 남겼습니다(docs/concept.md 11.7).
import { newState, act, advance, canChangeJob, jobRequirements, jobMastered, jobMasteryTarget, migrateState, unlocksMod as unlocks, JOBS, SKILLS, lineageOf, passiveGrowthBonus, assert, test } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
const { progressCounts } = await loadGame().load('game/systems/progression.js');

const ready = (level = 30) => { const s = newState(0); s.level = level; s.rebirths = 1; Object.assign(s.attributes, { str: 30, dex: 30, int: 30, vit: 30, wis: 30, luk: 30 }); return s; };
const job = id => JOBS.find(j => j.id === id);

test('v3.62 hidden unlocks: record conditions (v3.64 seven); an unmet one shows as ‘숨은 조건’ and refuses the job change', () => {
    assert.deepEqual(unlocks.UNLOCK_JOBS, ['undead', 'clockmaker', 'krakenkin', 'poorMonk', 'codexReader', 'fallenAngler', 'journeyman']);
    const s = ready();
    assert.equal(canChangeJob(s, 'undead'), false);
    assert.ok(jobRequirements(s, job('undead')).some(r => r.label === '숨은 조건' && !r.met));
    assert.throws(() => act(s, { type: 'job', id: 'undead' }, 0), /숨은 조건/);
    s.deaths = 10; act(s, { type: 'job', id: 'undead' }, 0); assert.equal(s.job, 'undead');
    act(s, { type: 'job', id: 'fisher' }, 0); s.deaths = 0;
    assert.equal(canChangeJob(s, 'undead'), true, 'a job once entered ignores its hidden condition');
    assert.equal(unlocks.unlockMet({}, 'manaLeviathan'), null, 'later jobs in a ??? lineage have no hidden condition');
});

test('v3.62 hidden unlocks count play records', () => {
    const s = ready();
    const closed = id => assert.equal(canChangeJob(s, id), false, `${id} closed`), open = id => assert.equal(canChangeJob(s, id), true, `${id} open`);
    closed('clockmaker'); s.playMs = 10 * 3600_000; open('clockmaker');
    s.attributes.str = 60; s.attributes.dex = 60; s.attributes.vit = 60; s.jobMastery.stormEel = 999999; s.unlockedJobs.push('stormEel');
    closed('krakenkin'); s.book.grottoWarden = 6; s.book.kelpHydra = 4; assert.equal(unlocks.unlockMet(s, 'krakenkin'), true);
    // v3.64 숨은 2차(도감 독자·청빈 수도승·칠전팔기)는 기록 조건 + 부모 1차 숙련.
    s.level = 30; s.attributes.int = 30; s.attributes.wis = 30; s.attributes.vit = 30; s.attributes.str = 30;
    s.gold = 50; closed('poorMonk'); s.jobMastery.saltWarden = 75; s.gold = 5000; closed('poorMonk'); s.gold = 50; open('poorMonk');
    s.jobMastery.wanderer = 75; closed('fallenAngler'); s.deaths = 30; open('fallenAngler');
    s.jobMastery.voyageScribe = 1200; closed('codexReader'); s.itemBook = Object.fromEntries(Array.from({ length: 30 }, (_, i) => ['item' + i, 1])); open('codexReader');
    for (const id of unlocks.UNLOCK_JOBS) { const j = job(id); assert.ok(j && j.hidden && j.hint && !j.hint.includes(j.name) && !j.hint.includes('문'), id); }
    for (const [id, parent] of [['codexReader', 'voyageScribe'], ['poorMonk', 'saltWarden'], ['fallenAngler', 'wanderer']]) { const j = job(id); assert.ok(j.tier === 2 && j.parent === parent && j.tree !== 'mystery', id); }
});

test('v3.62 the rebirth door is gone: no draw at rebirth, the old door jobs keep only their own conditions', () => {
    const s = newState(0); s.level = 60; s.rebirths = 3;
    act(s, { type: 'rebirth' }, 0, () => { throw Error('rebirth draws no random number for a door'); });
    assert.equal(s.rebirthDoor, undefined);
    for (const id of ['rebirthFisher', 'voidcaller']) { assert.equal(unlocks.unlockMet({}, id), null, id); assert.ok(!job(id).hint.includes('문'), `${id} hint`); }
    const o = ready(); o.attributes.str = 10; o.attributes.wis = 12; assert.equal(canChangeJob(o, 'rebirthFisher'), true, 'rebirth 1 + stats is enough');
    o.rebirths = 0; assert.equal(canChangeJob(o, 'rebirthFisher'), false);
});

test('v3.62 save migration: the open rebirth door becomes a revealed record; admin-opened doors are dropped', () => {
    const s = newState(0); s.rebirthDoor = 'voidcaller'; s.openDoors = ['undead']; s.doorsOpened = ['krakenkin'];
    migrateState(s); migrateState(s);
    assert.equal(s.rebirthDoor, undefined); assert.ok(!('openDoors' in s));
    assert.deepEqual(s.doorsOpened, ['krakenkin', 'voidcaller']);
    assert.equal(canChangeJob(s, 'undead'), false, 'an admin-opened door no longer opens anything');
});

test('Mastery rule: a mastered job can be re-entered at level 1, ignoring level, stats, mastery and hidden conditions', () => {
    const s = newState(0); s.rebirths = 1; const whaler = job('whaler');
    assert.equal(canChangeJob(s, 'whaler'), false);
    s.jobMastery.whaler = jobMasteryTarget(whaler) - 1; assert.equal(jobMastered(s, whaler), false); assert.equal(canChangeJob(s, 'whaler'), false);
    s.jobMastery.whaler = jobMasteryTarget(whaler); assert.equal(s.level, 1); assert.equal(canChangeJob(s, 'whaler'), true);
    act(s, { type: 'job', id: 'whaler' }, 0); assert.equal(s.job, 'whaler');
    s.jobMastery.undead = jobMasteryTarget(job('undead')); assert.equal(canChangeJob(s, 'undead'), true, 'mastery also ignores an unmet hidden condition');
});

test('v25.23 a met hidden condition stays met: the settlement records it and unlockMet honors it after the condition breaks', () => {
    const t = { unlockedJobs: [], deaths: 10 }; const fresh = unlocks.recordUnlocks(t);
    assert.ok(fresh.includes('undead')); assert.ok(t.doorsOpened.includes('undead'));
    t.deaths = 0; assert.equal(unlocks.unlockMet(t, 'undead'), true);
    assert.deepEqual(unlocks.recordUnlocks(t), [], 'already recorded');
    assert.equal(unlocks.unlockMet({ unlockedJobs: [] }, 'undead'), false);
    const s = ready(); s.deaths = 10; advance(s, 1000); assert.ok(s.doorsOpened.includes('undead'), 'advance records it');
});

test('v3.64 retired hidden jobs: the six jobs and their skills are gone, and old saves lose their records without compensation', () => {
    for (const id of ['barehandFisher', 'mistSwordsman', 'headwindSailor', 'sunriseAngler', 'noonDiver', 'nightHeron']) assert.equal(job(id), undefined, id);
    const s = newState(0); s.job = 'nightHeron'; s.unlockedJobs.push('nightHeron', 'noonDiver'); s.jobMastery.nightHeron = 500; s.doorsOpened = ['nightHeron', 'undead'];
    s.learned.heronStill = 3; s.skillPractice.heronStill = 900; s.skillSpent.heronStill = 2; s.skillInheritances.nightEyes = true; s.skills.push('heronStill', 'nightEyes'); s.presets = { a: { name: 'a', skills: ['heronStill', 'hookShot'] } };
    migrateState(s); migrateState(s);
    assert.equal(s.job, 'fisher'); assert.ok(!s.unlockedJobs.includes('nightHeron') && !s.unlockedJobs.includes('noonDiver'));
    assert.equal(s.jobMastery.nightHeron, undefined); assert.deepEqual(s.doorsOpened, ['undead']);
    for (const rec of [s.learned, s.skillPractice, s.skillSpent, s.skillInheritances]) assert.ok(!('heronStill' in rec) && !('nightEyes' in rec));
    assert.ok(!s.skills.includes('heronStill') && !s.skills.includes('nightEyes')); assert.deepEqual(s.presets.a.skills, ['hookShot']);
});

test('v3.135 Night Walker lineage retired: only 망인 (undead) remains in the 제약 lineage; old saves move to 망인 and lose the deleted jobs\' and skills\' records', () => {
    for (const id of ['skeleton', 'bonecaster', 'soulHarvester', 'lichKing', 'deathEmperor']) assert.equal(job(id), undefined, id);
    for (const id of ['marrowGuard', 'ossuaryRite', 'harvestEcho', 'soulTax', 'soulTyranny', 'undyingThrone', 'soulReap', 'undeathThrone']) assert.equal(SKILLS.find(x => x.id === id), undefined, id);
    assert.equal(job('undead').name, '망인'); assert.equal(lineageOf(job('undead')), 'restraint');
    assert.deepEqual(SKILLS.filter(x => x.job === 'undead').map(x => x.name), ['무덤의 챔질', '끝나지 않는 골격']);
    const s = newState(0); s.job = 'deathEmperor'; s.unlockedJobs.push('undead', 'skeleton', 'lichKing', 'deathEmperor'); s.jobMastery.lichKing = 900; s.jobMastery.undead = 300;
    s.learned.soulReap = 2; s.skillPractice.soulReap = 5000; s.skillInheritances.undeathThrone = true; s.learned.graveHook = 1; s.skills.push('soulReap', 'graveHook'); s.presets = { a: { name: 'a', skills: ['soulTyranny', 'hookShot'] } };
    migrateState(s); migrateState(s);
    assert.equal(s.job, 'undead'); assert.ok(s.unlockedJobs.includes('undead') && !s.unlockedJobs.some(id => ['skeleton', 'lichKing', 'deathEmperor'].includes(id)));
    assert.equal(s.jobMastery.lichKing, undefined); assert.equal(s.jobMastery.undead, 300, 'the 망인 record stays');
    assert.ok(!('soulReap' in s.learned) && !('soulReap' in s.skillPractice) && !('undeathThrone' in s.skillInheritances)); assert.equal(s.learned.graveHook, 1);
    assert.ok(!s.skills.includes('soulReap')); assert.deepEqual(s.presets.a.skills, ['hookShot']);
});

test('v3.64 the fallen angler grows with deaths', () => {
    const sk = SKILLS.find(x => x.id === 'scarTissue');
    const s = newState(0); s.deaths = 0; const none = passiveGrowthBonus(s, sk, progressCounts(s)).hp || 0;
    s.deaths = 50; assert.equal(progressCounts(s).deaths, 50); assert.ok((passiveGrowthBonus(s, sk, progressCounts(s)).hp || 0) > none);
});
