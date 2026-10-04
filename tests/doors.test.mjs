// 직업 개편 2단계: ??? 계열의 문과 숙달 규칙
import { newState, act, advance, canChangeJob, jobRequirements, jobMastered, jobMasteryTarget, doorsMod as doors, JOBS, assert, test } from './harness.mjs';

const at = (y, mo, d, h, mi = 0) => Date.UTC(y, mo - 1, d, h - 9, mi); // KST 시각 → UTC 밀리초
const ready = (level = 30) => { const s = newState(0); s.level = level; s.rebirths = 1; Object.assign(s.attributes, { str: 30, dex: 30, int: 30, vit: 30, wis: 30, luk: 30 }); return s; };
const job = id => JOBS.find(j => j.id === id);

test('Doors v27.12: only the rebirth door and discovery doors remain; a closed discovery door refuses the job change', () => {
    assert.deepEqual(doors.DOORS.map(d => d.id), ['rebirth', 'discovery']);
    assert.deepEqual(doors.DISCOVERY_DOORS.map(d => d.job), ['undead', 'clockmaker', 'headwindSailor', 'sunriseAngler', 'barehandFisher', 'noonDiver', 'mistSwordsman', 'nightHeron', 'krakenkin', 'poorMonk', 'codexReader', 'fallenAngler', 'journeyman']);
    const s = ready();
    assert.equal(canChangeJob(s, 'undead', at(2026, 10, 1, 3)), false, 'dawn no longer matters');
    assert.ok(jobRequirements(s, job('undead'), at(2026, 10, 1, 12)).some(r => r.label === '발견의 문 열림' && !r.met));
    assert.throws(() => act(s, { type: 'job', id: 'undead' }, at(2026, 10, 1, 3)), /문 조건/);
    s.deaths = 10; act(s, { type: 'job', id: 'undead' }, at(2026, 10, 1, 12)); assert.equal(s.job, 'undead');
    act(s, { type: 'job', id: 'fisher' }, 0); s.deaths = 0;
    assert.equal(canChangeJob(s, 'undead', 0), true, 'a job once entered ignores its door');
    assert.equal(doors.doorFor({}, 'skeleton', 0), null, 'later jobs in a ??? lineage have no door');
});

test('Doors v27.12: discovery conditions count play records, never the clock', () => {
    const s = ready();
    const closed = id => assert.equal(canChangeJob(s, id, 0), false, `${id} closed`), open = id => assert.equal(canChangeJob(s, id, 0), true, `${id} open`);
    closed('clockmaker'); s.playMs = 10 * 3600_000; open('clockmaker');
    closed('headwindSailor'); s.bestStage = 4; open('headwindSailor');
    closed('sunriseAngler'); for (const id of ['minnow', 'carp', 'perch', 'mackerel', 'ray', 'puffer', 'lionfish', 'eel', 'barracuda', 'ghost', 'angler', 'shark', 'viper', 'squid', 'leviathan']) s.book[id] = 1; open('sunriseAngler');
    s.equipment.rod = { id: 'x', name: 'x', slot: 'rod', power: 1, level: 1 }; closed('barehandFisher'); s.equipment.rod = null; open('barehandFisher');
    closed('noonDiver'); s.clears = { grotto: 3, cemetery: 2 }; open('noonDiver');
    closed('mistSwordsman'); s.wins = 3; open('mistSwordsman');
    closed('nightHeron'); s.kills = 500; open('nightHeron');
    s.attributes.str = 60; s.attributes.dex = 60; s.attributes.vit = 60; s.jobMastery.stormEel = 999999; s.unlockedJobs.push('stormEel');
    closed('krakenkin'); s.book.grottoWarden = 6; s.book.kelpHydra = 4; assert.deepEqual(doors.doorFor(s, 'krakenkin', 0), { door: 'discovery', open: true });
    s.gold = 5000; closed('poorMonk'); s.gold = 50; open('poorMonk');
    closed('fallenAngler'); s.deaths = 30; open('fallenAngler');
    closed('codexReader'); s.itemBook = Object.fromEntries(Array.from({ length: 30 }, (_, i) => ['item' + i, 1])); open('codexReader');
    for (const d of doors.DISCOVERY_DOORS) { const j = job(d.job); assert.ok(j && j.tree === 'mystery' && j.hidden && j.hint && !j.hint.includes(j.name), d.job); }
});

test('Doors: the rebirth door is drawn at rebirth, stored, excludes the previous one and never changes on reload', () => {
    const s = newState(0); s.level = 60; s.rebirths = 3; const seq = [.9], rng = () => seq.shift() ?? .5;
    act(s, { type: 'rebirth' }, 0, rng); const first = s.rebirthDoor; assert.ok(doors.REBIRTH_DOOR_JOBS.includes(first));
    const saved = JSON.parse(JSON.stringify(s)); assert.equal(saved.rebirthDoor, first, 'stored in the save, so a reload shows the same door');
    act(s, { type: 'sync' }, 1000); assert.equal(s.rebirthDoor, first);
    s.level = 60; act(s, { type: 'rebirth' }, 0, () => .1); assert.notEqual(s.rebirthDoor, first, 'previous door is excluded');
    const u = newState(0); u.unlockedJobs = ['fisher', 'voidcaller']; assert.equal(doors.drawRebirthDoor(u, () => { throw Error('no rng'); }), 'rebirthFisher', 'unentered job preferred; single candidate uses no random number');
    const o = ready(); o.rebirthDoor = 'rebirthFisher'; assert.equal(canChangeJob(o, 'rebirthFisher'), true); assert.equal(canChangeJob(o, 'voidcaller'), false);
});

test('Mastery rule: a mastered job can be re-entered at level 1, ignoring level, stats, mastery and doors', () => {
    const s = newState(0); s.rebirths = 1; const whaler = job('whaler');
    assert.equal(canChangeJob(s, 'whaler'), false);
    s.jobMastery.whaler = jobMasteryTarget(whaler) - 1; assert.equal(jobMastered(s, whaler), false); assert.equal(canChangeJob(s, 'whaler'), false);
    s.jobMastery.whaler = jobMasteryTarget(whaler); assert.equal(s.level, 1); assert.equal(canChangeJob(s, 'whaler'), true);
    act(s, { type: 'job', id: 'whaler' }, 0); assert.equal(s.job, 'whaler');
    s.jobMastery.undead = jobMasteryTarget(job('undead')); assert.equal(canChangeJob(s, 'undead', 0), true, 'mastery also ignores a closed door');
});

test('v25.23 a door seen open stays open: recordOpenDoors stores it and doorFor honors it after the condition breaks', () => {
    const t = { unlockedJobs: [], deaths: 10 }; const fresh = doors.recordOpenDoors(t, 0);
    assert.ok(fresh.includes('undead')); assert.ok(t.doorsOpened.includes('undead'));
    t.deaths = 0; assert.deepEqual(doors.doorFor(t, 'undead', 0), { door: 'discovery', open: true });
    assert.deepEqual(doors.recordOpenDoors(t, 0), [], 'already recorded');
    assert.deepEqual(doors.doorFor({ unlockedJobs: [] }, 'undead', 0), { door: 'discovery', open: false });
});

test('v27.70 doors opened on the admin page: open for everyone while set, written to State.openDoors at sync, never recorded in doorsOpened, closed again when unset', () => {
    assert.deepEqual(doors.DOOR_JOBS, [...doors.REBIRTH_DOOR_JOBS, ...doors.DISCOVERY_DOORS.map(d => d.job)]);
    doors.setOpenDoors(['undead', 'voidcaller', 'skeleton', 'nope']);
    try {
        assert.deepEqual(doors.openDoorsSnapshot(), ['voidcaller', 'undead'], 'only door jobs, in door order');
        const s = ready(); advance(s, 1000);
        assert.deepEqual(s.openDoors, ['voidcaller', 'undead'], 'the server settlement (advance) writes the open list for the screen');
        assert.deepEqual(doors.doorFor(s, 'undead'), { door: 'discovery', open: true }); assert.deepEqual(doors.doorFor(s, 'voidcaller'), { door: 'rebirth', open: true });
        assert.deepEqual(doors.doorFor(s, 'clockmaker'), { door: 'discovery', open: false }, 'other doors keep their conditions');
        assert.equal(canChangeJob(s, 'undead'), true, 'the job change goes through while the door is open');
        assert.ok(!(s.doorsOpened || []).includes('undead'), 'an admin-opened door is not recorded as seen open');
        assert.deepEqual(doors.recordOpenDoors(s), [], 'recordOpenDoors ignores admin-opened doors');
        act(s, { type: 'job', id: 'undead' }, 2000); assert.equal(s.job, 'undead');
        doors.setOpenDoors([]); advance(s, 3000);
        assert.equal(s.openDoors, undefined, 'unset: the list is removed at the next settlement');
        assert.equal(canChangeJob(s, 'undead'), true, 'a job entered while open stays available (unlockedJobs)');
        assert.deepEqual(doors.doorFor(s, 'voidcaller'), { door: 'rebirth', open: false }, 'a door not entered closes again');
    } finally { doors.setOpenDoors([]); }
});
