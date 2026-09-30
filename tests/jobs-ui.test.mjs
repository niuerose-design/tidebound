// 직업 개편 3단계: 실루엣 공개 규칙 · 힌트 · 빠른 찾기 · 검색(화면 계산만, 게임 규칙은 그대로)
import { newState, jobMasteryTarget, jobUi as ui, JOBS, assert, test } from './harness.mjs';

const at = (y, mo, d, h) => Date.UTC(y, mo - 1, d, h - 9); // KST 시각 → UTC 밀리초
const job = id => JOBS.find(j => j.id === id);

test('Job UI: every hidden or door job has a one-line hint', () => {
    const secret = JOBS.filter(ui.secretJob);
    assert.ok(secret.length >= 10);
    for (const j of secret) assert.ok(j.hint && !j.hint.includes('\n') && !j.hint.includes(j.name), `${j.id} hint`);
    assert.ok(JOBS.filter(j => !ui.secretJob(j)).every(j => ui.jobRevealed(newState(0), j)), 'ordinary jobs are always shown');
});

test('Job UI: a silhouette reveals its name once the gate conditions (rebirths, parent mastery, door) are met', () => {
    const s = newState(0); s.lastTick = at(2026, 10, 1, 12);
    assert.equal(ui.jobRevealed(s, job('voidcaller')), false); assert.equal(ui.shownName(s, job('voidcaller')), '???');
    s.rebirths = 1; s.rebirthDoor = 'voidcaller'; assert.equal(ui.jobRevealed(s, job('voidcaller')), false, 'parent mastery still missing');
    s.jobMastery.wanderer = 75; assert.equal(ui.jobRevealed(s, job('voidcaller')), true, 'level and stats are not needed');
    assert.equal(ui.jobRevealed(s, job('undead')), false, 'closed time door keeps the silhouette');
    s.lastTick = at(2026, 10, 1, 3); assert.equal(ui.jobRevealed(s, job('undead')), true, 'dawn door open');
    const t = newState(0); t.unlockedJobs.push('skeleton'); assert.equal(ui.jobRevealed(t, job('skeleton')), true, 'entered once → shown');
    const m = newState(0); m.jobMastery.bonecaster = jobMasteryTarget(job('bonecaster')); assert.equal(ui.jobRevealed(m, job('bonecaster')), true, 'mastered → shown');
});

test('Job UI: quick finder and search never leak silhouette names', () => {
    const s = newState(0); s.lastTick = at(2026, 10, 1, 12);
    const hidden = JOBS.filter(j => !ui.jobRevealed(s, j)).map(j => j.id);
    assert.ok(hidden.length > 0);
    for (const kind of ['ready', 'near', 'goal']) assert.ok(ui.finderJobs(s, kind, []).every(j => !hidden.includes(j.id)), kind);
    assert.ok(ui.searchJobs(s, '', '').every(j => !hidden.includes(j.id)));
    assert.equal(ui.searchJobs(s, job('voidcaller').name, '').length, 0, 'searching a hidden name finds nothing');
    const tag = ui.TOP_TAGS[0]; assert.ok(ui.searchJobs(s, '', tag).length > 0 && ui.searchJobs(s, '', tag).every(j => ui.jobRevealed(s, j)));
    assert.deepEqual(ui.finderJobs(s, 'doors', ['undead']).map(j => j.id), ['undead']);
    s.growthGoal = { kind: 'job', id: 'whaler' }; assert.deepEqual(ui.finderJobs(s, 'goal', []).map(j => j.id), ['whaler']);
});
