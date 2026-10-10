// 직업 분류 개편 1단계: 7계열·계보
import { JOBS, JOB_TREES, LINEAGES, lineageOf, jobTags, assert, test } from './harness.mjs';

test('Job trees: seven trees, no job left in the old other tree, v24 job counts per tree', () => {
    assert.deepEqual(JOB_TREES.map(t => t.id), ['physical', 'magic', 'defense', 'status', 'hybrid', 'support', 'mystery']);
    assert.equal(JOBS.length, 272); assert.equal(new Set(JOBS.map(j => j.id)).size, 272); // v3.230 아제로스 히든 3개(무릉 수행자 · 변종 학자 · 제단 순례자) // v3.225 참모 계보 5차 2개(총사령관 · 군수사령관) // v3.220 아제로스 히든 계보 4개(까미 사냥꾼 · 누리 추적자 · 어둠의 추종자 · 칠흑의 화신) // 참모 계보: v3.219 보급관 · v3.219 군의관 · v3.219 작전참모 · 화력참모
    // v3.135 나이트워커 2~5차 · 골령술사(5개)를 지우고 1차 망인만 남겼습니다. v3.138 미하일 계보 5개 · 성벽 기사를 지웠습니다. v3.153 몬스터 도감 독자 · v3.155 빙결 결박사 · v3.156 보물 사냥꾼 · v3.199 청빈 수도승을 지웠습니다.
    // v3.69 옛 독립 수련 27개는 retired(표에는 남고 화면·전직에서 빠짐), 수련 직업 6개가 새로 생겼습니다.
    assert.equal(JOBS.filter(j => j.retired).length, 27); assert.equal(JOBS.filter(j => !j.retired).length, 245);
    // v3.70 능력치 수련 I~III 18개(계열마다 3개, 수련 계보).
    assert.equal(JOBS.filter(j => /^(str|dex|int|vit|wis|luk)Training[123]$/.test(j.id)).length, 18);
    assert.equal(JOBS.filter(j => j.tree === 'other').length, 0);
    for (const j of JOBS) assert.equal(JOB_TREES.filter(t => t.id === j.tree).length, 1, j.id);
    const count = Object.fromEntries(JOB_TREES.map(t => [t.id, JOBS.filter(j => j.tree === t.id).length]));
    assert.deepEqual(count, { physical: 50, magic: 46, defense: 35, status: 32, hybrid: 37, support: 49, mystery: 23 }); // 참모 계보 6개(support) · v3.230 아제로스 히든 3개(mystery)
});

test('Job trees: the old other jobs land where the plan puts them', () => {
    const tree = id => JOBS.find(j => j.id === id).tree;
    for (const id of ['fisher', 'wanderer', 'chimera', 'bloodTide', 'spellbladeNovice', 'spellblade', 'runeKnight', 'swordSaint', 'celestialBlade']) assert.equal(tree(id), 'hybrid', id);
    for (const id of ['squidJester', 'gambler', 'relicScavenger', 'salvageMerchant', 'rareTracker', 'memoryMerchant', 'voyageScribe', 'chronicleNavigator', 'bossNaturalist', 'speciesChronicler']) assert.equal(tree(id), 'support', id);
    for (const id of ['undead', 'voidcaller', 'manaLeviathan', 'glyphMonk', 'glassHarpooner', 'clockmaker']) assert.equal(tree(id), 'mystery', id);
    // v3.65 은월은 공개 물리 계보로(3차부터 숨은 단계), 윤회의 나그네는 초보자 계보의 환생 가지로.
    for (const id of ['stormEel', 'krakenkin', 'leviathanAvatar']) assert.equal(tree(id), 'physical', id);
    assert.equal(tree('rebirthFisher'), 'mystery', 'v3.200 궁극의 모험가(히든 5차)');
    for (const id of ['abyssArchivist', 'abyssMimic']) assert.equal(tree(id), 'magic', id);
});

test('Lineages: every job belongs to exactly one lineage inside its own tree; independents are parentless, childless tier 1', () => {
    assert.equal(new Set(LINEAGES.map(l => l.id)).size, LINEAGES.length);
    for (const t of JOB_TREES) assert.ok(LINEAGES.some(l => l.id === `${t.id}-independent` && l.tree === t.id && l.name === '수련'), t.id);
    for (const j of JOBS) {
        const matches = LINEAGES.filter(l => l.id === lineageOf(j));
        assert.equal(matches.length, 1, `${j.id} → ${lineageOf(j)}`);
        // v3.168 초보자 계보만 ??? 탭에 둡니다(직업 tree는 복합).
        assert.equal(matches[0].tree, lineageOf(j) === 'fisher' ? 'mystery' : j.tree, `${j.id} lineage tree`);
        // v3.70 수련 계보 안의 능력치 수련 I~III은 수련 직업에서 이어집니다(부모도 같은 수련 계보).
        if (lineageOf(j).endsWith('-independent')) assert.ok(j.parent ? lineageOf(JOBS.find(p => p.id === j.parent)) === lineageOf(j) : (j.tier === 1 || j.fullKit) && (j.subRole === 'training' || !JOBS.some(c => c.parent === j.id)), j.id);
    }
    for (const l of LINEAGES.filter(l => !l.id.endsWith('-independent'))) assert.ok(JOBS.some(j => lineageOf(j) === l.id), `${l.id} has jobs`);
    assert.equal(lineageOf(JOBS.find(j => j.id === 'celestialBlade')), 'spellbladeNovice');
    assert.equal(lineageOf(JOBS.find(j => j.id === 'manaLeviathan')), 'voidcaller');
    assert.equal(lineageOf(JOBS.find(j => j.id === 'woodcutter')), 'physical-independent');
    assert.deepEqual(jobTags(JOBS.find(j => j.id === 'whaler')), ['물리 폭발']);
    assert.deepEqual(jobTags(JOBS.find(j => j.id === 'corsair')), ['회피', '출혈']);
});

test('Job counts stay close: trees within 1.6× of each other (??? 14 or more), named lineages 4–10 (매지션 11) and all reach tier 5', () => {
    // v3.65 다른 계열에 붙은 히든 직업(아델 2차 등)은 ??? 탭에 나오므로 계열 크기 비교에서 뺍니다.
    const sizes = JOB_TREES.filter(t => t.id !== 'mystery').map(t => JOBS.filter(j => j.tree === t.id && !j.hidden).length);
    // v3.199 은월 3~5차가 공개 물리 계열로 와서 물리가 50개가 되어 1.5배 → 1.6배.
    assert.ok(Math.max(...sizes) <= Math.min(...sizes) * 1.6, sizes.join(','));
    assert.ok(JOBS.filter(j => j.tree === 'mystery').length >= 14);
    // v3.25 해커 계보는 단계적으로 늘리는 중이라(해커 → 화이트 해커, 3단계에 블랙 해커) 직업 수 검사에서 뺍니다.
    // v3.65 특수 계보(제약 · 방랑 · 제로)는 일부러 짧습니다. v3.219 참모 계보(staff)는 3차부터 단계적으로 늘립니다.
    // v3.230 아제로스 계보(world: azeroth)는 히든 4·5차 하나씩으로 시작하므로 모두 뺍니다.
    for (const l of LINEAGES.filter(l => !l.id.endsWith('-independent') && l.world !== 'azeroth' && !['fisher', 'hacker', 'restraint', 'wander', 'zero'].includes(l.id))) {
        const jobs = JOBS.filter(j => lineageOf(j) === l.id);
        // v25.26 외길 계보는 의도적으로 1~3차 세 직업입니다.
        if (jobs.every(j => j.role?.startsWith('외길'))) { assert.ok(jobs.length === 3 || jobs.length === 4, l.id); assert.ok([3, 5].includes(Math.max(...jobs.map(j => j.tier))), `${l.id} ends at tier 3 or 5`); continue; }
        // v3.64 매지션 계보(tide)는 요정 대사제가 힐러 가지로 들어와 11개입니다.
        assert.ok(jobs.length >= 4 && jobs.length <= (l.id === 'tide' ? 11 : 10), `${l.id} ${jobs.length}`);
        assert.equal(Math.max(...jobs.map(j => j.tier)), 5, `${l.id} reaches tier 5`);
    }
});

test('v27.4 constraint framework: every job with a multiplier ≤ 0.3 declares a constraint with at least one device; devices drive turn order, last stand and evasion', async () => {
    const { isConstraintJob, constraintDeviceLabels } = await import('./harness.mjs');
    for (const j of JOBS) { if (isConstraintJob(j)) { assert.ok(j.constraint && j.constraint.label && j.constraint.desc, `${j.id} needs constraint`); assert.ok(Object.keys(j.constraint.devices).length >= 1, `${j.id} needs a device`); } }
    const g = JOBS.find(j => j.id === 'glassHarpooner'); assert.ok(isConstraintJob(g)); assert.deepEqual(constraintDeviceLabels(g.constraint.devices), ['항상 선공', '체력 1로 버팀 ×2', '회피 +30%p']);
    const { actsFirst, constraintFields, strike, newState, stats } = await import('./harness.mjs');
    const slow = { name: 'g', stats: { hp: 10, attack: 10, defense: 0, speed: 1 }, hp: 10, skills: [], cooldowns: {}, stun: 0, effects: {}, ...constraintFields('glassHarpooner') };
    const fast = { name: 'f', stats: { hp: 1000, attack: 1000, defense: 0, speed: 50, accuracy: 5 }, hp: 1000, skills: [], cooldowns: {}, stun: 0, effects: {}, mana: 100 };
    assert.ok(actsFirst(slow, fast) && !actsFirst(fast, slow), 'firstStrike beats speed');
    strike(fast, slow, () => .5); assert.equal(slow.hp, 1, 'job last stand keeps 1 hp'); strike(fast, slow, () => .5); assert.equal(slow.hp, 1); strike(fast, slow, () => .5); assert.equal(slow.hp, 0, 'two charges only');
    const s = newState(0); s.level = 10; s.unlockedJobs.push('glassHarpooner'); const before = stats(s).evasion; s.job = 'glassHarpooner'; assert.ok(Math.abs(stats(s).evasion - before - .3) < 1e-9, 'evasion device applied');
});

test('v3.44 registerJobs: adds a batch once with the same finishing steps (hint, mastery target, maple name), existing ids are skipped', async () => {
    const C = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/classes');
    assert.equal(C.registerJobs([JOBS[0]]), 0, 'already there');
    const before = C.JOBS.length, fake = { id: 'zzSecretTest', name: '시험 직업', title: '', desc: '', attack: 1, magic: 1, hp: 1, defense: 1, resist: 1, crit: 0, tier: 2, level: 30, mastery: 0, requires: {}, role: '시험', tree: 'mystery', hidden: true };
    assert.equal(C.registerJobs([fake]), 1); assert.equal(C.JOBS.length, before + 1);
    const got = C.jobById('zzSecretTest'); assert.ok(got && got.masteryTarget > 0 && got.masteryBoost > 0, 'mastery tuning applied');
    assert.equal(C.registerJobs([{ ...fake }]), 0, 'same id twice is skipped');
    C.JOBS.splice(C.JOBS.indexOf(got), 1); assert.equal(C.JOBS.length, before);
});

test('v3.47 secret skills: server-only table registered by the engine, missing from the public table, registerSkills upserts by id', async () => {
    const { load } = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const Sk = await load('data/skills'), { SECRET_SKILLS } = await load('secret/skills'), { SECRET_JOBS } = await load('secret/jobs');
    const secretJobs = new Set(SECRET_JOBS.map(j => j.id));
    // v3.199 은월 3~5차 스킬 6개는 공개 표(data/specials.ts)로, 청빈 수도승 스킬 2개는 삭제(35 → 27). v3.200 궁극의 모험가 스킬 1개가 비밀로(→ 28).
    assert.equal(SECRET_SKILLS.length, 42); // v3.220 아제로스 히든 계보 스킬 8개(→ 36) · v3.230 3계보 6개(→ 42) assert.ok(SECRET_SKILLS.every(sk => secretJobs.has(sk.job)), 'every secret skill belongs to a secret job');
    assert.ok(SECRET_SKILLS.every(sk => Sk.skillById(sk.id) === sk), 'the engine registered the finished objects');
    assert.equal(Sk.SKILLS.filter(sk => secretJobs.has(sk.job)).length, 42, 'full table on the server');
    // 공개 표(game/data)에는 정의가 없습니다. v3.199 은월이 공개로 가며 예외였던 tentacleBarrage도 비밀 표에서 빠졌습니다.
    const fs = await import('node:fs'), src = fs.readdirSync('game/data').filter(f => f.endsWith('.ts')).map(f => fs.readFileSync(`game/data/${f}`, 'utf8')).join('\n');
    assert.deepEqual(SECRET_SKILLS.filter(sk => src.includes(`id: '${sk.id}'`)).map(sk => sk.id), []);
    const fake = { ...SECRET_SKILLS[0], id: 'zzSkillTest' };
    Sk.registerSkills([fake]); assert.equal(Sk.skillById('zzSkillTest'), fake);
    const again = { ...fake, name: '바뀐 이름' }; const n = Sk.SKILLS.length; Sk.registerSkills([again]);
    assert.equal(Sk.SKILLS.length, n, 'same id replaces'); assert.equal(Sk.skillById('zzSkillTest').name, '바뀐 이름');
    Sk.SKILLS.splice(Sk.SKILLS.indexOf(again), 1); Sk.registerSkills([]);
});
