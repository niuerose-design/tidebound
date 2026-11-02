// v3.246 아제로스 히든: 정수 포식자(정수 50 소모 · 포식 처치로 기본 능력치 +1, 환생하면 초기화) · 세계석 광부(액티브로 세계석 채굴).
import { newState, act, advance, stats, assert, test } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
const L = loadGame(), P = await L.load('game/systems/progression.js'), Lc = await L.load('game/systems/actions/lifecycle.js'), { SKILLS } = await L.load('game/data/skills.js');

const hunter = (job, skills, attrs) => {
    const s = newState(0); s.level = 100; s.rebirths = 20; s.job = job; s.unlockedJobs = [job];
    s.attributes = { str: 0, dex: 50, int: 0, vit: 0, wis: 0, luk: 0, ...attrs };
    for (const id of skills) s.learned[id] = 1;
    s.skills = skills; s.jobMastery = { [job]: 1e9 };
    act(s, { type: 'stage', id: 'reef' }, 0); act(s, { type: 'start' }, 0);
    const st = stats(s); s.hp = st.hp; s.mana = st.mana;
    return s;
};
const seeded = () => { let x = 11; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); };
const run = (s, minutes, rng = seeded()) => { for (let t = 2000; t <= minutes * 60000; t += 2000) { advance(s, t, rng); s.mana = stats(s).mana; } };

test('v3.246 정수 포식: 쓸 때마다 정수 50(환생 수와 무관), 포식 처치는 기본 능력치 +1(상한 없음) · 환생하면 초기화', () => {
    const feast = SKILLS.find(x => x.id === 'essenceFeast');
    assert.equal(feast.essenceCost, 50); assert.ok(feast.devourStat);
    const s = hunter('essenceDevourer', ['essenceFeast', 'hungryMaw'], { int: 300, vit: 150, wis: 45 });
    s.essence = 100000; run(s, 20);
    assert.ok(s.essenceSpent > 0 && s.essenceSpent % 50 === 0, `정수 50 단위 소모: ${s.essenceSpent}`);
    const gained = Object.values(s.devoured || {}).reduce((a, b) => a + b, 0);
    assert.ok(gained > 0, '포식 처치로 능력치가 오름');
    const attr = Object.keys(s.devoured)[0];
    assert.equal(P.attributes(s)[attr] - P.attributes({ ...s, devoured: undefined })[attr], s.devoured[attr], '포식 능력치는 기본 능력치에 더해짐');
    s.rebirths = 20; s.level = 300; Lc.rebirthNow(s, 30 * 60000);
    assert.equal(s.devoured, undefined, '환생하면 포식 능력치 초기화');
    assert.ok(s.essenceSpent > 0, '먹은 정수 기록(패시브)은 남음');
});

test('v3.246 정수 포식: 정수가 50보다 적으면 나가지 않습니다', () => {
    const s = hunter('essenceDevourer', ['essenceFeast', 'hungryMaw'], { int: 300, vit: 150, wis: 45 });
    s.essence = 49; run(s, 10);
    assert.ok(!s.essenceSpent, '정수 49로는 시전 없음');
    assert.ok(!s.devoured);
});

test('v3.246 광맥 강타: 맞히면 세계석을 캐고(상한 없음) 기록이 패시브에 쌓입니다', () => {
    const s = hunter('pearlMiner', ['veinStrike', 'minerSense'], { str: 300, vit: 150 });
    const p0 = s.pearls; run(s, 60);
    assert.ok(s.pearlsMined > 0, `채굴 ${s.pearlsMined}`);
    assert.ok(s.pearls - p0 >= s.pearlsMined, '캔 세계석은 보유량에 더해짐');
    assert.ok(P.progressCounts(s).pearlsMined === s.pearlsMined);
});

test('v3.445 아제로스 직업 N개 업적: 히든 계보도 세고, 목표(AZEROTH_JOB_COUNT)는 서버 표의 실제 아제로스 직업 수와 같음', async () => {
    const A = await L.load('game/data/achievements.js'), C = await L.load('game/data/classes.js');
    const azeroth = C.JOBS.filter(j => !j.retired && C.jobWorldOf(j) === 'azeroth');
    assert.equal(C.AZEROTH_JOB_COUNT, azeroth.length, `AZEROTH_JOB_COUNT ${C.AZEROTH_JOB_COUNT} ≠ 실제 ${azeroth.length}`);
    assert.deepEqual(A.ACHIEVEMENTS.filter(a => a.id.startsWith('azerothJobs:')).map(a => a.target), [1, 5, C.AZEROTH_JOB_COUNT]);
    // 화면과 같은 상황: 참모(공개) 1 + 히든 계보 4 = 5. 전에는 히든 계보가 메이플로 세어져 1이었습니다.
    const s = { unlockedJobs: ['fisher', 'quartermaster', 'kkamiHunter', 'nuriTracker', 'onyxAvatar', 'variantScholar', 'gone-job'] };
    assert.equal(A.achievementById('azerothJobs:5').progress(s), 5);
    assert.equal(A.achievementById('jobs:10').progress(s), 6, '지워진 직업 id는 세지 않음(전직 화면의 전직해 본과 같은 기준)');
    assert.equal(P.unlockedJobCount(s, 'azeroth'), 5);
    // 모듈을 읽은 뒤 등록된 계보(화면이 카탈로그를 적용하는 순서)도 바로 찾습니다(캐시는 등록 때 비움).
    assert.equal(C.worldOfLineage('probeLineage'), 'maple', '모르는 계보는 메이플');
    C.registerLineages([{ id: 'probeLineage', name: '검사 계보', tree: 'mystery', world: 'azeroth', summary: '' }]);
    assert.equal(C.worldOfLineage('probeLineage'), 'azeroth');
    // 되돌리기: 뒤의 테스트(골든 해시)가 같은 직업 · 계보 표를 쓰므로 검사용 계보를 지웁니다.
    C.LINEAGES.splice(C.LINEAGES.findIndex(l => l.id === 'probeLineage'), 1); C.registerLineages([]);
    assert.equal(C.worldOfLineage('probeLineage'), 'maple');
});
