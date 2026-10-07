// 직업 개편 3단계: 실루엣 공개 규칙 · 힌트 · 빠른 찾기 · 검색(화면 계산만, 게임 규칙은 그대로)
import { newState, jobMasteryTarget, jobUi, JOBS, assert, test } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';

// v3.44 공개 판정은 서버(game/systems/reveal.ts)가 하고 화면은 카탈로그를 봅니다. 화면 함수를 부르기 전에 그 상태로 만든 카탈로그를 적용합니다.
const { load } = loadGame(), reveal = await load('game/systems/reveal.js'), catalog = await load('game/data/catalog.js'), unlocks = await load('game/secret/unlocks.js');
const ui = new Proxy(jobUi, { get: (m, k) => typeof m[k] !== 'function' ? m[k] : (...args) => { const s = args[0]; if (s && Array.isArray(s.unlockedJobs)) catalog.applyCatalog({ secret: false, revealed: reveal.revealedSecretJobs(s), unlocks: unlocks.unlockStates(s) }); return m[k](...args); } });

const at = (y, mo, d, h) => Date.UTC(y, mo - 1, d, h - 9); // KST 시각 → UTC 밀리초
const job = id => JOBS.find(j => j.id === id);

test('Job UI: every hidden or hidden-unlock job has a one-line hint', () => {
    const secret = JOBS.filter(ui.secretJob);
    assert.ok(secret.length >= 10);
    for (const j of secret) assert.ok(j.hint && !j.hint.includes('\n') && !j.hint.includes(j.name), `${j.id} hint`);
    assert.ok(JOBS.filter(j => !ui.secretJob(j) && !j.retired).every(j => ui.jobRevealed(newState(0), j)), 'ordinary jobs are always shown');
    assert.ok(JOBS.filter(j => j.retired).every(j => !ui.jobRevealed(newState(0), j)), 'v3.69 retired training jobs are never shown');
});

test('Job UI: a silhouette reveals its name when its hidden condition is met or all gate conditions are met', () => {
    const s = newState(0); s.lastTick = at(2026, 10, 1, 12);
    assert.equal(ui.jobRevealed(s, job('voidcaller')), false);
    s.rebirths = 1; assert.equal(ui.jobRevealed(s, job('voidcaller')), false, 'v3.62 the parent mastery gate still hides it');
    s.jobMastery.wanderer = 75; assert.equal(ui.jobRevealed(s, job('voidcaller')), true, 'v3.62 no rebirth door: its own gates reveal it');
    s.rebirths = 0; s.jobMastery.wanderer = 0; s.doorsOpened = ['voidcaller']; assert.equal(ui.jobRevealed(s, job('voidcaller')), true, 'a recorded reveal (old rebirth door) keeps it shown');
    s.doorsOpened = undefined; assert.equal(ui.jobRevealed(s, job('voidSovereign')), false, 'hidden job without a hidden condition still needs its gates');
    assert.equal(ui.jobRevealed(s, job('undead')), false, 'unmet hidden condition keeps the silhouette');
    s.deaths = 10; assert.equal(ui.jobRevealed(s, job('undead')), true, 'v27.12 ten defeats reveal the undead'); s.deaths = 0;
    const t = newState(0); t.unlockedJobs.push('manaLeviathan'); assert.equal(ui.jobRevealed(t, job('manaLeviathan')), true, 'entered once → shown');
    const m = newState(0); m.jobMastery.voidDrifter = jobMasteryTarget(job('voidDrifter')); assert.equal(ui.jobRevealed(m, job('voidDrifter')), true, 'mastered → shown');
});

test('Job UI: quick finder and search never leak silhouette names', () => {
    const s = newState(0); s.lastTick = at(2026, 10, 1, 12);
    const hidden = JOBS.filter(j => !ui.jobRevealed(s, j)).map(j => j.id);
    assert.ok(hidden.length > 0);
    for (const kind of ['ready', 'near']) assert.ok(ui.finderJobs(s, kind).every(j => !hidden.includes(j.id)), kind);
    assert.ok(ui.searchJobs(s, '', '').every(j => !hidden.includes(j.id)));
    assert.equal(ui.searchJobs(s, job('voidcaller').name, '').length, 0, 'searching a hidden name finds nothing');
    const tag = ui.TOP_TAGS[0]; assert.ok(ui.searchJobs(s, '', tag).length > 0 && ui.searchJobs(s, '', tag).every(j => ui.jobRevealed(s, j)));
});

test('Job UI: a hidden condition reveals its job while it holds and keeps it once recorded', () => {
    const s = newState(0); s.lastTick = at(2026, 10, 1, 12);
    assert.equal(ui.jobRevealed(s, job('fallenAngler')), false, 'condition unmet → hidden');
    s.deaths = 30; assert.equal(ui.jobRevealed(s, job('fallenAngler')), true, 'condition met → name shown');
    s.deaths = 0; assert.equal(ui.jobRevealed(s, job('fallenAngler')), false); s.doorsOpened = ['fallenAngler']; assert.equal(ui.jobRevealed(s, job('fallenAngler')), true, 'recorded condition stays met');
});

test('v25 hidden jobs without gates are shown; the chronarch appears once the clockmaker is mastered', () => {
    const s = newState(0), job = id => JOBS.find(j => j.id === id);
    assert.ok(ui.jobRevealed(s, job('glyphMonk')), '玄 has no door or gate, so it is visible from the start');
    assert.equal(ui.jobRevealed(s, job('chronarch')), false);
    s.jobMastery.clockmaker = 3000; assert.ok(ui.jobRevealed(s, job('chronarch')));
});

test('v3.63 hidden jobs stay out of sight until revealed, then show up in the ??? tab (other-tree hidden jobs bring their lineage along)', () => {
    const s = newState(0), shown = () => ui.shownJobs(s).map(j => j.id);
    assert.ok(!shown().includes('undead') && !shown().includes('eternalNavigator'), 'no silhouettes: unrevealed hidden jobs are not listed');
    assert.ok(!ui.shownLineageJobs(s, 'voidcaller').length && !ui.inMysteryTab(s, { id: 'voidcaller', tree: 'mystery' }), 'an unrevealed ??? lineage is not shown');
    assert.ok(!ui.shownLineageJobs(s, 'restraint').some(j => j.id === 'undead'), 'v3.135 the hidden 망인 is left out of the 제약 lineage until revealed');
    assert.ok(!ui.shownLineageJobs(s, 'tide').some(j => j.id === 'eternalNavigator'), 'the hidden branch is left out of its own lineage too');
    s.deaths = 10; assert.ok(ui.inMysteryTab(s, { id: 'restraint', tree: 'mystery' }) && ui.shownLineageJobs(s, 'restraint').map(j => j.id).includes('undead'), 'condition met → appears in the ??? tab');
    s.jobMastery.wanderer = 75; s.rebirths = 1; assert.ok(ui.shownLineageJobs(s, 'voidcaller').map(j => j.id).includes('voidcaller') && !ui.shownLineageJobs(s, 'voidcaller').map(j => j.id).includes('manaLeviathan'), 'later hidden jobs wait for their own gates');
    s.jobMastery.wanderer = 0; s.rebirths = 0;
    assert.equal(ui.inMysteryTab(s, { id: 'tide', tree: 'magic' }), false, 'a public lineage joins the ??? tab only with a revealed hidden job');
    const t = newState(0); t.unlockedJobs.push('eternalNavigator'); assert.equal(ui.inMysteryTab(t, { id: 'tide', tree: 'magic' }), true);
});
