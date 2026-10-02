// 직업 개편 2단계: ??? 계열의 문과 숙달 규칙
import { newState, act, canChangeJob, jobRequirements, jobMastered, jobMasteryTarget, doorsMod as doors, JOBS, assert, test } from './harness.mjs';

const at = (y, mo, d, h, mi = 0) => Date.UTC(y, mo - 1, d, h - 9, mi); // KST 시각 → UTC 밀리초
const ready = (level = 30) => { const s = newState(0); s.level = level; s.rebirths = 1; Object.assign(s.attributes, { str: 30, dex: 30, int: 30, vit: 30, wis: 30, luk: 30 }); return s; };
const job = id => JOBS.find(j => j.id === id);

test('Doors: time slots follow Korean time and a closed door refuses the job change', () => {
    assert.equal(doors.timeSlot(at(2026, 10, 1, 5)).id, 'dawn'); assert.equal(doors.timeSlot(at(2026, 10, 1, 6)).id, 'morning');
    assert.equal(doors.timeSlot(at(2026, 10, 1, 12)).id, 'day'); assert.equal(doors.timeSlot(at(2026, 10, 1, 23, 59)).id, 'night');
    assert.deepEqual(doors.TIME_SLOTS.map(t => t.jobs), [['undead', 'clockmaker'], ['headwindSailor', 'sunriseAngler', 'clockmaker'], ['barehandFisher', 'noonDiver', 'clockmaker'], ['mistSwordsman', 'nightHeron', 'clockmaker']]);
    const s = ready();
    assert.equal(canChangeJob(s, 'undead', at(2026, 10, 1, 12)), false);
    assert.ok(jobRequirements(s, job('undead'), at(2026, 10, 1, 12)).some(r => r.label === '시간의 문 열림' && !r.met));
    assert.throws(() => act(s, { type: 'job', id: 'undead' }, at(2026, 10, 1, 12)), /문 조건/);
    act(s, { type: 'job', id: 'undead' }, at(2026, 10, 1, 3)); assert.equal(s.job, 'undead');
    act(s, { type: 'job', id: 'fisher' }, at(2026, 10, 1, 3));
    assert.equal(canChangeJob(s, 'undead', at(2026, 10, 1, 12)), true, 'a job once entered ignores its door');
});

test('Doors: visitor schedule is a pure function of the KST date (1-2 two-hour visits)', () => {
    assert.deepEqual(doors.visitorSchedule('2026-09-30'), [{ from: 18, to: 20, job: 'krakenkin' }, { from: 20, to: 22, job: 'krakenkin' }]);
    assert.deepEqual(doors.visitorSchedule('2026-10-02'), [{ from: 21, to: 23, job: 'krakenkin' }]);
    assert.deepEqual(doors.visitorSchedule('2026-10-02'), doors.visitorSchedule('2026-10-02'));
    for (let d = 1; d <= 60; d++) {
        const v = doors.visitorSchedule(new Date(Date.UTC(2026, 0, d)).toISOString().slice(0, 10));
        assert.ok(v.length >= 1 && v.length <= 2); assert.ok(v.every(x => x.to - x.from === 2 && x.from >= 0 && x.to <= 24));
        if (v.length === 2) assert.ok(v[0].to <= v[1].from);
    }
    assert.equal(doors.currentVisit(at(2026, 10, 2, 21, 30))?.job, 'krakenkin'); assert.equal(doors.currentVisit(at(2026, 10, 2, 20)), null);
    assert.deepEqual(doors.doorFor({}, 'krakenkin', at(2026, 10, 2, 22)), { door: 'visitor', open: true });
    assert.deepEqual(doors.doorFor({}, 'krakenkin', at(2026, 10, 2, 9)), { door: 'visitor', open: false });
    assert.deepEqual(doors.DISCOVERY_DOORS.map(d => d.job), ['poorMonk', 'codexReader', 'fallenAngler', 'journeyman']); assert.equal(doors.doorFor({}, 'skeleton', 0), null, 'later jobs in a ??? lineage have no door');
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
    s.jobMastery.undead = jobMasteryTarget(job('undead')); assert.equal(canChangeJob(s, 'undead', at(2026, 10, 1, 12)), true, 'mastery also ignores a closed door');
});

test('Doors v24.2: each time slot has its own pool and discovery doors open on hidden conditions', () => {
    const s = ready();
    assert.equal(canChangeJob(s, 'mistSwordsman', at(2026, 10, 1, 9)), false); assert.equal(canChangeJob(s, 'mistSwordsman', at(2026, 10, 1, 20)), true);
    assert.equal(canChangeJob(s, 'headwindSailor', at(2026, 10, 1, 9)), true); assert.equal(canChangeJob(s, 'noonDiver', at(2026, 10, 1, 13)), true);
    for (const id of ['headwindSailor', 'sunriseAngler', 'barehandFisher', 'noonDiver', 'mistSwordsman', 'nightHeron', 'poorMonk', 'codexReader', 'fallenAngler', 'journeyman']) {
        const j = job(id); assert.ok(j && j.tree === 'mystery' && j.tier === 1 && j.hidden && j.hint, id);
    }
    s.gold = 5000; assert.equal(canChangeJob(s, 'poorMonk'), false); s.gold = 50; assert.equal(canChangeJob(s, 'poorMonk'), true);
    assert.equal(canChangeJob(s, 'fallenAngler'), false); s.deaths = 30; assert.equal(canChangeJob(s, 'fallenAngler'), true);
    assert.equal(canChangeJob(s, 'codexReader'), false); s.itemBook = Object.fromEntries(Array.from({ length: 30 }, (_, i) => ['item' + i, 1])); assert.equal(canChangeJob(s, 'codexReader'), true);
});
