// 직업 개편 3단계: 실루엣 공개 규칙 · 힌트 · 빠른 찾기 · 검색(화면 계산만, 게임 규칙은 그대로)
import { newState, jobMasteryTarget, jobUi, JOBS, SKILLS, assert, test, act, migrations } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';

// v3.44 공개 판정은 서버(game/systems/reveal.ts)가 하고 화면은 카탈로그를 봅니다. 화면 함수를 부르기 전에 그 상태로 만든 카탈로그를 적용합니다.
const { load } = loadGame(), reveal = await load('game/systems/reveal.js'), catalog = await load('game/data/catalog.js'), unlocks = await load('game/secret/unlocks.js');
const ui = new Proxy(jobUi, { get: (m, k) => typeof m[k] !== 'function' ? m[k] : (...args) => { const s = args[0]; if (s && Array.isArray(s.unlockedJobs)) catalog.applyCatalog({ secret: false, revealed: reveal.revealedSecretJobs(s), unlocks: unlocks.unlockStates(s) }); return m[k](...args); } });

const at = (y, mo, d, h) => Date.UTC(y, mo - 1, d, h - 9); // KST 시각 → UTC 밀리초
const job = id => JOBS.find(j => j.id === id);

test('Job UI: every hidden or hidden-unlock job has a one-line hint', () => {
    const secret = JOBS.filter(reveal.secretJob);
    assert.ok(secret.length >= 10);
    for (const j of secret) assert.ok(j.hint && !j.hint.includes('\n') && !j.hint.includes(j.name), `${j.id} hint`);
    assert.ok(JOBS.filter(j => !reveal.secretJob(j) && !j.retired).every(j => ui.jobRevealed(newState(0), j)), 'ordinary jobs are always shown');
    assert.ok(JOBS.filter(j => j.retired).every(j => !ui.jobRevealed(newState(0), j)), 'v3.69 retired training jobs are never shown');
});

test('Job UI: a silhouette reveals its name when its hidden condition is met or all gate conditions are met', () => {
    const s = newState(0); s.lastTick = at(2026, 10, 1, 12);
    assert.equal(ui.jobRevealed(s, job('voidcaller')), false);
    s.rebirths = 2; assert.equal(ui.jobRevealed(s, job('voidcaller')), false, 'v3.62 the parent mastery gate still hides it (v3.199 rebirth 2)');
    s.jobMastery.wanderer = 75; assert.equal(ui.jobRevealed(s, job('voidcaller')), true, 'v3.62 no rebirth door: its own gates reveal it');
    s.rebirths = 0; s.jobMastery.wanderer = 0; s.doorsOpened = ['voidcaller']; assert.equal(ui.jobRevealed(s, job('voidcaller')), true, 'a recorded reveal (old rebirth door) keeps it shown');
    s.doorsOpened = undefined; assert.equal(ui.jobRevealed(s, job('voidSovereign')), false, 'hidden job without a hidden condition still needs its gates');
    assert.equal(ui.jobRevealed(s, job('undead')), false, 'unmet hidden condition keeps the silhouette');
    s.deaths = 99; assert.equal(ui.jobRevealed(s, job('undead')), false); s.deaths = 100; assert.equal(ui.jobRevealed(s, job('undead')), true, 'v3.199 a hundred defeats reveal the undead'); s.deaths = 0;
    const t = newState(0); t.unlockedJobs.push('manaLeviathan'); assert.equal(ui.jobRevealed(t, job('manaLeviathan')), true, 'entered once → shown');
    const m = newState(0); m.jobMastery.manaLeviathan = jobMasteryTarget(job('manaLeviathan')); assert.equal(ui.jobRevealed(m, job('manaLeviathan')), true, 'mastered → shown');
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
    assert.equal(ui.jobRevealed(s, job('journeyman')), false, 'condition unmet → hidden');
    const done = id => { s.jobMastery[id] = jobMasteryTarget(job(id)); };
    for (const id of ['corsair', 'harpoon', 'tide', 'warden']) done(id); assert.equal(ui.jobRevealed(s, job('journeyman')), false, 'v3.199 four mastered is not enough');
    done('whaler'); assert.equal(ui.jobRevealed(s, job('journeyman')), true, 'condition met → name shown');
    s.jobMastery = {}; assert.equal(ui.jobRevealed(s, job('journeyman')), false); s.doorsOpened = ['journeyman']; assert.equal(ui.jobRevealed(s, job('journeyman')), true, 'recorded condition stays met');
});

test('v25 hidden jobs without gates are shown; v3.199 the 5th-tier chronarch appears only once every gate is met', () => {
    const s = newState(0), job = id => JOBS.find(j => j.id === id);
    assert.ok(ui.jobRevealed(s, job('glyphMonk')), '玄 has no door or gate, so it is visible from the start');
    assert.equal(ui.jobRevealed(s, job('chronarch')), false);
    s.jobMastery.clockmaker = 3000; assert.equal(ui.jobRevealed(s, job('chronarch')), false, 'clockmaker mastery alone is not enough any more');
    s.level = 70; s.rebirths = 4; Object.assign(s.attributes, { dex: 60, int: 50 });
    for (const id of ['windUp', 'slackHand', 'timeMachine']) s.skillPractice[id] = SKILLS.find(x => x.id === id).masteryMilestones.at(-1);
    assert.ok(ui.jobRevealed(s, job('chronarch')));
});

test('v3.63 hidden jobs stay out of sight until revealed, then show up in the ??? tab (other-tree hidden jobs bring their lineage along)', () => {
    const s = newState(0), shown = () => ui.shownJobs(s).map(j => j.id);
    assert.ok(!shown().includes('undead') && !shown().includes('clockmaker'), 'no silhouettes: unrevealed hidden jobs are not listed');
    assert.ok(!ui.shownLineageJobs(s, 'voidcaller').length && !ui.inMysteryTab(s, { id: 'voidcaller', tree: 'mystery' }), 'an unrevealed ??? lineage is not shown');
    assert.ok(!ui.shownLineageJobs(s, 'restraint').some(j => j.id === 'undead'), 'v3.135 the hidden 망인 is left out of the 제약 lineage until revealed');
    s.deaths = 100; assert.ok(ui.inMysteryTab(s, { id: 'restraint', tree: 'mystery' }) && ui.shownLineageJobs(s, 'restraint').map(j => j.id).includes('undead'), 'condition met → appears in the ??? tab');
    s.jobMastery.wanderer = 75; s.rebirths = 2; assert.ok(ui.shownLineageJobs(s, 'voidcaller').map(j => j.id).includes('voidcaller') && !ui.shownLineageJobs(s, 'voidcaller').map(j => j.id).includes('manaLeviathan'), 'later hidden jobs wait for their own gates');
    s.jobMastery.wanderer = 0; s.rebirths = 0;
});

// v3.166 외길 탭 · 직업 수 셈 통일 · 목표 직업
test('Job UI v3.166: monostat lineages sit in the 외길 tab and leave their original tree tab', async () => {
    const s = newState(0); s.lastTick = at(2026, 10, 1, 12);
    const { LINEAGES, lineageOf } = await load('game/data/classes.js'), { MONOSTAT_LINEAGES } = await load('game/data/expansion-monostat.js');
    assert.equal(ui.JOB_TABS.at(-1).id, 'monostat', 'the 외길 tab comes right after ???');
    assert.equal(ui.JOB_TABS.at(-2).id, 'mystery');
    for (const l of MONOSTAT_LINEAGES) {
        assert.ok(ui.lineageInTab(s, 'monostat', l), `${l.id} in 외길`);
        assert.ok(!ui.lineageInTab(s, l.tree, l), `${l.id} not in its tree tab`);
    }
    for (const l of LINEAGES.filter(l => !ui.monostatLineage(l.id))) assert.ok(!ui.lineageInTab(s, 'monostat', l), `${l.id} stays out of 외길`);
    // 보이는 직업은 저마다 탭 하나(tabOf)에 들어가고, 그 탭의 계보 목록에 자기 계보가 있습니다.
    const shown = ui.shownJobs(s);
    for (const j of shown) {
        const tab = ui.tabOf(j), lineage = LINEAGES.find(l => l.id === lineageOf(j));
        assert.ok(ui.monostatLineage(lineageOf(j)) ? tab === 'monostat' : tab === ui.lineageTreeOf(j), j.id);
        assert.ok(lineage && ui.lineageInTab(s, tab, lineage), `${j.id} lineage ${lineageOf(j)} listed under ${tab}`);
    }
    const tabs = ui.JOB_TABS.filter(t => t.id !== 'mystery').map(t => t.id);
    assert.equal(tabs.reduce((a, id) => a + ui.tabJobCount(s, id), 0) + ui.tabJobCount(s, 'mystery') - shown.filter(j => reveal.secretJob(j) && j.tree !== 'mystery').length, shown.length, 'tab counts cover every shown job once');
    assert.ok(ui.tabJobCount(s, 'monostat') >= MONOSTAT_LINEAGES.length * 3);
});

test('Job UI v3.166: the classes header and the mastery board count jobs from one tally', () => {
    const s = newState(0); s.lastTick = at(2026, 10, 1, 12);
    const t0 = ui.jobTally(s);
    assert.ok(t0.total > 100 && t0.jobs.every(j => ui.jobRevealed(s, j)), 'only shown jobs');
    assert.ok(t0.jobs.every(j => !j.retired && !j.id.startsWith('hacker') && j.id !== 'hacker' && j.id !== 'whiteHacker' && j.id !== 'blackHacker'), 'no retired or hacker jobs');
    assert.equal(t0.unlocked, s.unlockedJobs.filter(id => t0.jobs.some(j => j.id === id)).length);
    // 통폐합으로 지워진 직업 · 모르는 id · 해커가 기록에 남아도 '전직해 본' 수에 들지 않습니다.
    s.unlockedJobs.push('clockworkAngler', 'noSuchJob', 'hacker');
    assert.equal(ui.jobTally(s).unlocked, t0.unlocked, 'stale ids do not count');
    s.unlockedJobs.push('harpoon');
    assert.equal(ui.jobTally(s).unlocked, t0.unlocked + 1);
    s.jobMastery.harpoon = jobMasteryTarget(job('harpoon'));
    const t1 = ui.jobTally(s);
    assert.equal(t1.mastered, t0.mastered + 1); assert.equal(t1.total, t0.total, 'the denominator is shared');
});

test('Job UI v3.166: a job goal is set from the detail sheet, flagged, and dropped on arrival', () => {
    const s = newState(0); s.level = 30; s.lastTick = at(2026, 10, 1, 12);
    assert.equal(ui.jobGoalOf(s), undefined);
    act(s, { type: 'jobGoal', id: 'tide' }, 0);
    assert.equal(s.jobGoal, 'tide'); assert.equal(ui.jobGoalOf(s).id, 'tide');
    assert.throws(() => act(s, { type: 'jobGoal', id: 'noSuchJob' }, 0), 'unknown job');
    assert.throws(() => act(s, { type: 'jobGoal', id: 'fisher' }, 0), 'current job');
    act(s, { type: 'jobGoal', id: 'tide' }, 0); assert.equal(s.jobGoal, undefined, 'same id toggles off');
    act(s, { type: 'jobGoal', id: 'tide' }, 0); act(s, { type: 'jobGoal', id: '' }, 0); assert.equal(s.jobGoal, undefined, 'empty id clears');
    act(s, { type: 'jobGoal', id: 'harpoon' }, 0);
    s.attributes = { ...s.attributes, str: 20, dex: 20 };
    act(s, { type: 'job', id: 'harpoon' }, 0);
    assert.equal(s.job, 'harpoon'); assert.equal(s.jobGoal, undefined, 'reaching the goal clears it');
    // 지워진 직업을 목표로 둔 세이브는 정리 때 목표가 내려가고, 화면도 없는 것으로 봅니다.
    s.jobGoal = 'clockworkAngler'; assert.equal(ui.jobGoalOf(s), undefined);
    migrations.retireHiddenJobs(s); assert.equal(s.jobGoal, undefined);
});

test('Job UI v3.168: the beginner lineage sits in the ??? tab while the job keeps its hybrid tree', async () => {
    const s = newState(0); s.lastTick = at(2026, 10, 1, 12);
    const { LINEAGES } = await load('game/data/classes.js'), fisher = LINEAGES.find(l => l.id === 'fisher');
    assert.equal(job('fisher').tree, 'hybrid'); assert.equal(fisher.tree, 'mystery');
    assert.ok(ui.lineageInTab(s, 'mystery', fisher) && !ui.lineageInTab(s, 'hybrid', fisher));
    assert.equal(ui.tabOf(job('fisher')), 'mystery');
    assert.ok(ui.tabJobCount(s, 'mystery') >= 1 && !ui.shownJobs(s).some(j => ui.lineageTreeOf(j) === 'hybrid' && j.id === 'fisher'));
});

test('v3.220 worlds: Azeroth lineages stay out of the Maple World tree tabs and show only in their own world once revealed', () => {
    const s = newState(0);
    assert.equal(ui.worldLineages(s, 'azeroth').length, 0, 'nothing revealed yet');
    assert.equal(ui.worldJobCount(s, 'azeroth'), 0);
    s.book.masteryMimic = 100;
    assert.deepEqual(ui.worldLineages(s, 'azeroth').map(l => l.id), ['kkamiHunter'], 'a met hidden condition reveals it in Azeroth');
    assert.equal(ui.jobWorld(job('kkamiHunter')), 'azeroth'); assert.equal(ui.jobWorld(job('undead')), 'maple');
    assert.ok(!ui.lineageInTab(s, 'mystery', { id: 'kkamiHunter', tree: 'mystery' }), 'not in the ??? tab');
    const before = ui.tabJobCount(s, 'mystery'); s.book.masteryMimic = 0; assert.equal(ui.tabJobCount(s, 'mystery'), before, 'the ??? tab count ignores Azeroth');
    assert.ok(ui.worldLineages(s, 'maple').length > 20 && ui.worldLineages(s, 'maple').every(l => !['kkamiHunter', 'nuriTracker', 'darkFollower', 'onyxAvatar'].includes(l.id)));
});
