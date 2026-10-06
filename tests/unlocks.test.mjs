// 직업 개편 2단계: ??? 계열의 숨은 조건과 숙달 규칙. v3.62 문(윤회의 문·발견의 문·운영 문 열기)을 없애고 숨은 조건만 남겼습니다(docs/concept.md 11.7).
import { newState, act, advance, canChangeJob, jobRequirements, jobMastered, jobMasteryTarget, migrateState, unlocksMod as unlocks, JOBS, assert, test } from './harness.mjs';

const ready = (level = 30) => { const s = newState(0); s.level = level; s.rebirths = 1; Object.assign(s.attributes, { str: 30, dex: 30, int: 30, vit: 30, wis: 30, luk: 30 }); return s; };
const job = id => JOBS.find(j => j.id === id);

test('v3.62 hidden unlocks: thirteen record conditions; an unmet one shows as ‘숨은 조건’ and refuses the job change', () => {
    assert.deepEqual(unlocks.UNLOCK_JOBS, ['undead', 'clockmaker', 'headwindSailor', 'sunriseAngler', 'barehandFisher', 'noonDiver', 'mistSwordsman', 'nightHeron', 'krakenkin', 'poorMonk', 'codexReader', 'fallenAngler', 'journeyman']);
    const s = ready();
    assert.equal(canChangeJob(s, 'undead'), false);
    assert.ok(jobRequirements(s, job('undead')).some(r => r.label === '숨은 조건' && !r.met));
    assert.throws(() => act(s, { type: 'job', id: 'undead' }, 0), /숨은 조건/);
    s.deaths = 10; act(s, { type: 'job', id: 'undead' }, 0); assert.equal(s.job, 'undead');
    act(s, { type: 'job', id: 'fisher' }, 0); s.deaths = 0;
    assert.equal(canChangeJob(s, 'undead'), true, 'a job once entered ignores its hidden condition');
    assert.equal(unlocks.unlockMet({}, 'skeleton'), null, 'later jobs in a ??? lineage have no hidden condition');
});

test('v3.62 hidden unlocks count play records', () => {
    const s = ready();
    const closed = id => assert.equal(canChangeJob(s, id), false, `${id} closed`), open = id => assert.equal(canChangeJob(s, id), true, `${id} open`);
    closed('clockmaker'); s.playMs = 10 * 3600_000; open('clockmaker');
    closed('headwindSailor'); s.bestStage = 4; open('headwindSailor');
    closed('sunriseAngler'); for (const id of ['minnow', 'carp', 'perch', 'mackerel', 'ray', 'puffer', 'lionfish', 'eel', 'barracuda', 'ghost', 'angler', 'shark', 'viper', 'squid', 'leviathan']) s.book[id] = 1; open('sunriseAngler');
    s.equipment.rod = { id: 'x', name: 'x', slot: 'rod', power: 1, level: 1 }; closed('barehandFisher'); s.equipment.rod = null; open('barehandFisher');
    closed('noonDiver'); s.clears = { grotto: 3, cemetery: 2 }; open('noonDiver');
    closed('mistSwordsman'); s.wins = 3; open('mistSwordsman');
    closed('nightHeron'); s.kills = 500; open('nightHeron');
    s.attributes.str = 60; s.attributes.dex = 60; s.attributes.vit = 60; s.jobMastery.stormEel = 999999; s.unlockedJobs.push('stormEel');
    closed('krakenkin'); s.book.grottoWarden = 6; s.book.kelpHydra = 4; assert.equal(unlocks.unlockMet(s, 'krakenkin'), true);
    s.gold = 5000; closed('poorMonk'); s.gold = 50; open('poorMonk');
    closed('fallenAngler'); s.deaths = 30; open('fallenAngler');
    closed('codexReader'); s.itemBook = Object.fromEntries(Array.from({ length: 30 }, (_, i) => ['item' + i, 1])); open('codexReader');
    for (const id of unlocks.UNLOCK_JOBS) { const j = job(id); assert.ok(j && j.tree === 'mystery' && j.hidden && j.hint && !j.hint.includes(j.name) && !j.hint.includes('문'), id); }
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
    const s = newState(0); s.rebirthDoor = 'voidcaller'; s.openDoors = ['undead']; s.doorsOpened = ['nightHeron'];
    migrateState(s); migrateState(s);
    assert.equal(s.rebirthDoor, undefined); assert.ok(!('openDoors' in s));
    assert.deepEqual(s.doorsOpened, ['nightHeron', 'voidcaller']);
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
    const s = ready(); s.kills = 500; advance(s, 1000); assert.ok(s.doorsOpened.includes('nightHeron'), 'advance records it');
});
