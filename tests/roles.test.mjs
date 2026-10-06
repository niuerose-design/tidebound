// v3.61 직업·스킬 밸런스 1단계: 모든 직업에 세부 역할(data/roles.ts)이 붙고, 기획안(docs/concept.md §11.6-1)의 계보 배정과 맞습니다.
import { assert, test } from './harness.mjs';

const { load } = (await import('../scripts/lib/game-modules.mjs')).loadGame();

test('v3.61 roles: every job resolves to a known sub role, and only the beginner and hackers have none', async () => {
    const { JOBS, lineageOf } = await load('data/classes'), { SUB_ROLES, subRoleOf, roleOf } = await load('data/roles');
    const none = [];
    for (const j of JOBS) {
        const sub = subRoleOf(j, lineageOf(j));
        assert.ok(SUB_ROLES[sub], `${j.id}: ${sub}`); assert.equal(roleOf(sub), SUB_ROLES[sub].role);
        if (sub === 'none') none.push(j.id);
    }
    assert.deepEqual(none.sort(), JOBS.filter(j => j.id === 'fisher' || lineageOf(j) === 'hacker' || /hacker/i.test(j.id)).map(j => j.id).sort());
});

test('v3.61 roles: lineage assignments follow the plan (§11.6-1), with job-level exceptions on side branches', async () => {
    const { JOBS, lineageOf } = await load('data/classes'), { subRoleOf } = await load('data/roles');
    const sub = id => { const j = JOBS.find(x => x.id === id); assert.ok(j, id); return subRoleOf(j, lineageOf(j)); };
    // 계보 대표: 물리·마법·상태이상 딜러 / 반사·제어·흡혈 탱커 / 힐러·유틸리티
    for (const [lineage, want] of [['harpoon', 'physical'], ['tide', 'magic'], ['poisoner', 'status'], ['warden', 'reflect'], ['martialArtist', 'control'], ['wanderer', 'drain'], ['seagrassKeeper', 'healer'], ['fishWhisperer', 'utility']])
        for (const j of JOBS.filter(x => lineageOf(x) === lineage && !x.subRole)) if (!['oracle', 'lunarOracle', 'coralSaint', 'tideMender', 'coralBuilder', 'tidalSinger', 'reefBrawler', 'inkMime', 'crystalCaster', 'deckGunner', 'clockworkAngler', 'allRounder', 'glyphMonk'].includes(j.id)) assert.equal(sub(j.id), want, `${lineage}/${j.id}`);
    // 곁가지 예외(§11.6-1)와 히든(§11.7-2)
    for (const [id, want] of [['coralSaint', 'healer'], ['reefBrawler', 'drain'], ['clockworkAngler', 'physical'], ['allRounder', 'physical'], ['codexReader', 'utility'], ['poorMonk', 'reflect'], ['fallenAngler', 'drain'], ['clockmaker', 'border']])
        if (JOBS.some(j => j.id === id)) assert.equal(sub(id), want, id);
});
