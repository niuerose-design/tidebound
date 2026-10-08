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
    for (const [lineage, want] of [['harpoon', 'physical'], ['tide', 'magic'], ['poisoner', 'status'], ['warden', 'reflect'], ['martialArtist', 'control'], ['wanderer', 'borderHarmony'], ['seagrassKeeper', 'healer'], ['fishWhisperer', 'utility']])
        for (const j of JOBS.filter(x => lineageOf(x) === lineage && !x.subRole)) if (!['oracle', 'lunarOracle', 'coralSaint', 'tideMender', 'tidalSinger', 'reefBrawler', 'inkMime', 'glyphMonk'].includes(j.id)) assert.equal(sub(j.id), want, `${lineage}/${j.id}`);
    // 곁가지 예외(§11.6-1)와 히든(§11.7-2)
    for (const [id, want] of [['tidalSinger', 'borderBuffer'], ['coralSaint', 'healer'], ['reefBrawler', 'drain'], ['poorMonk', 'reflect'], ['clockmaker', 'border'], ['runeCreator', 'borderReflect'], ['seaDragonGod', 'borderStand'], ['silenceDeity', 'borderBuff'], ['nerveNeedler', 'borderBuff'], ['aberrantKing', 'borderHarmony'], ['worldTurtle', 'morph']])
        if (JOBS.some(j => j.id === id)) assert.equal(sub(id), want, id);
});

test('v3.80 role-unique effects stay with their role (docs/concept.md 11.3): swarm/thorns tanks, DoT boosts status dealers, gold/exp/drop buffers, heal actives healers, dealers own at most one control active', async () => {
    const { JOBS, lineageOf } = await load('data/classes'), { SKILLS } = await load('data/skills'), { subRoleOf, roleOf } = await load('data/roles');
    // 역할 경계 직업(제로 · v3.80 아이돌 연습생)과 수련 직업(계승 재료)은 점검에서 뺍니다.
    const CAT = [
        { keys: ['swarmFind', 'thorns'], ok: (sub, role) => role === 'tank' },
        { keys: ['dotBonus', 'bleedBonus', 'poisonBonus', 'burnBonus', 'dotTurnsBonus', 'poisonStackBonus'], ok: sub => sub === 'status' },
        { keys: ['goldBonus', 'expBonus', 'dropBonus', 'variantFind', 'goldenFind', 'rebirthBonus', 'dungeonGoldBonus'], ok: sub => sub === 'utility' },
    ];
    const bad = [];
    for (const j of JOBS.filter(j => !j.retired && j.subRole !== 'training' && j.id !== 'fisher')) {
        const sub = subRoleOf(j, lineageOf(j)), role = roleOf(sub), own = SKILLS.filter(sk => sk.job === j.id);
        if (role === 'border') continue;
        for (const sk of own) {
            const b = { ...(sk.bonus || {}), ...(sk.levelEffects?.at(-1)?.bonus || {}) };
            for (const c of CAT) if (c.keys.some(k => (b[k] || 0) > 0) && !c.ok(sub, role)) bad.push(`${j.id}/${sk.id}`);
            if (sk.type === 'active' && sk.effect === 'heal' && sub !== 'healer') bad.push(`${j.id}/${sk.id} heal`);
        }
        if (role === 'dealer' && own.filter(sk => sk.type === 'active' && ['stun', 'slow', 'silence'].includes(sk.effect)).length > 1) bad.push(`${j.id} control×2+`);
    }
    assert.deepEqual(bad, []);
});
