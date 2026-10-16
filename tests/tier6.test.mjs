// v3.335 6차 초월자(docs/tier6-10-plan.md): 궁극의 모험가 위 히든 직업. 입구는 기록, 효과는 규칙(각성기 턴당 2개 · 연계 각성 · 융합).
import { assert, test } from './harness.mjs';
const { load } = (await import('../scripts/lib/game-modules.mjs')).loadGame();

test('v3.335 초월자: hidden tier 6 above 궁극의 모험가, ×10 mastery, record-gated unlock, parent mastery 15M', async () => {
    const C = await load('data/classes'), P = await load('systems/progression'), Sk = await load('data/skills'), U = await load('secret/unlocks'), L = await load('secret/leaks'), { newState } = await load('systems/engine'), { DUNGEONS } = await load('data/world');
    const j = C.jobById('transcendent');
    assert.ok(j && j.hidden && j.tier === 6 && j.parent === 'rebirthFisher' && j.signatureFree && j.awakenPerTurn === 2 && j.tree === 'mystery'); assert.equal(C.lineageOf(j), 'fisher');
    assert.equal(P.jobMasteryTarget(j), 15_000_000); assert.deepEqual(P.masteryMilestonesFor(Sk.skillById('chainAwaken')), [1e6, 4.5e6, 15e6, 37.5e6]); assert.deepEqual(P.masteryMilestonesFor(Sk.skillById('fusion')), [1e6, 4.5e6, 15e6, 37.5e6]);
    const chain = Sk.skillById('chainAwaken'), fusion = Sk.skillById('fusion');
    assert.ok(chain.awaken && chain.chainAwaken.power === .6 && chain.damageType === 'split' && fusion.type === 'passive' && fusion.awakenFusion.max === 3);
    assert.ok(L.UNLOCK_CONDITIONS.transcendent && U.UNLOCK_JOBS.includes('transcendent'));
    assert.ok(P.signatureScale(Sk.SKILLS.find(sk => sk.job === 'hero' && sk.type === 'active'), 'transcendent') === 1, 'borrowed signature skills keep full efficiency');
    // 입구: 5차 핵심 10개 완성 · 극한돌파 · 나이트메어 5단계 7곳 · 혼테일 3단계, 그리고 부모(궁극의 모험가) 숙련 1,500만.
    const s = newState(0); s.level = 200; s.rebirths = 30;
    assert.equal(U.unlockMet(s, 'transcendent'), false);
    const cores = Sk.SKILLS.filter(sk => sk.core && sk.type === 'passive' && (C.jobById(sk.job)?.tier ?? 0) >= 5).slice(0, 10); assert.equal(cores.length, 10);
    for (const sk of cores) s.skillPractice[sk.id] = P.masteryMilestonesFor(sk).at(-1);
    s.learned.pierce = 1; s.permanent.limitBreak = 3; s.limitBreaks = { pierce: 3 }; s.skillPractice.pierce = 1e8; assert.ok(P.extremeBroken(s, 'pierce'));
    s.nightmareBest = Object.fromEntries(DUNGEONS.filter(d => d.id !== 'abyss').map(d => [d.id, 5]));
    assert.equal(U.unlockMet(s, 'transcendent'), false, 'still needs horntail stage 3');
    s.raidBest = { horntail: 3 }; assert.equal(U.unlockMet(s, 'transcendent'), true);
    const req = P.jobRequirements(s, j); assert.ok(req.some(r => /궁극의 모험가 숙련/.test(r.label) && !r.met), 'parent mastery is the last gate'); assert.ok(!P.canChangeJob(s, 'transcendent'));
    s.jobMastery.rebirthFisher = 15_000_000; assert.ok(P.canChangeJob(s, 'transcendent'));
    s.nightmareBest = {}; s.raidBest = {}; assert.equal(U.unlockMet(s, 'transcendent'), false, 'records gone (e.g. after ascension) and the door was never recorded');
    U.recordUnlocks(s); s.raidBest = { horntail: 3 }; s.nightmareBest = Object.fromEntries(DUNGEONS.filter(d => d.id !== 'abyss').map(d => [d.id, 5])); U.recordUnlocks(s); s.nightmareBest = {};
    assert.equal(U.unlockMet(s, 'transcendent'), true, 'once opened, the door stays open (doorsOpened)');
});

test('v3.335 초월자 combat: two awakenings a turn, chain awaken fires the other equipped awakenings for free at 60%, fusion cuts awaken cooldowns', async () => {
    const Co = await load('systems/combat'), Sk = await load('data/skills'), C = await load('data/classes');
    const others = Sk.SKILLS.filter(sk => sk.awaken && !sk.chainAwaken && !sk.chargeNeed && !sk.requiresBuff && !sk.fuelCost && !sk.statusOnly && !sk.healOnly && (sk.manaCost || 0) <= 60 && sk.job && C.jobById(sk.job)?.tier === 5 && !C.jobById(sk.job).hidden);
    const byLineage = new Map(); for (const sk of others) { const l = C.lineageOf(C.jobById(sk.job)); if (!byLineage.has(l)) byLineage.set(l, sk); }
    const [x, y, z, w] = [...byLineage.values()]; assert.ok(x && y && z && w && C.lineageOf(C.jobById(x.job)) !== C.lineageOf(C.jobById(y.job)));
    const base = { hp: 1e6, attack: 2000, magic: 2000, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 2000, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const fighter = (job, skills, o = {}) => ({ ...Co.constraintFields(job), name: 'A', job, stats: { ...base }, hp: 1e6, mana: 2000, skills, cooldowns: Object.fromEntries(skills.map(id => [id, 0])), stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {}, ...o });
    const dummy = () => ({ name: 'D', stats: { ...base, hp: 1e12, attack: 1 }, hp: 1e12, mana: 0, skills: [], cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {} });
    const run = (a) => { const logs = []; Co.actTurn(a, dummy(), () => 0, t => logs.push(t)); return logs; };
    // 5차 몸(턴당 1개): 각성 1번.
    const five = run(fighter('rebirthFisher', [x.id, y.id])); assert.equal(five.filter(t => / · 각성$/.test(t)).length, 1);
    // 초월자(턴당 2개): 연계 각성 → x · y가 연계로 이어지고(대기 · 마나 소모 없음), 그 뒤 x가 자기 각성으로 한 번 더(총 각성 2 · 연계 2).
    const a = fighter('transcendent', ['chainAwaken', x.id, y.id, 'fusion']); assert.equal(a.awakenPerTurn, 2);
    const logs = run(a);
    assert.equal(logs.filter(t => / · 각성$/.test(t)).length, 2, logs.join('\n')); assert.equal(logs.filter(t => /연계 각성 \(위력 60%\)/.test(t)).length, 2, logs.join('\n'));
    // 융합: 장착 액티브의 계보가 둘(x · y, 자기 계보 fisher 제외)이라 각성기 대기 −2 → 10 − 2 = 8. 연계로 이어진 y는 대기 · 마나를 쓰지 않음(0 그대로).
    assert.equal(a.cooldowns.chainAwaken, 8, JSON.stringify(a.cooldowns)); assert.equal(a.cooldowns[x.id], 8); assert.equal(a.cooldowns[y.id], 0);
    const manaSpent = 2000 - a.mana, expected = Sk.skillById('chainAwaken').manaCost + (x.manaCost || 0); assert.equal(manaSpent, expected, `mana ${manaSpent} vs ${expected}: chained casts are free`);
    // 융합이 없으면 대기 10 그대로.
    const b = fighter('transcendent', ['chainAwaken', x.id, y.id]); run(b); assert.equal(b.cooldowns.chainAwaken, 10);
    // 연계는 편성 순서대로 최대 3개: 각성기 넷을 끼워도 세 번째까지만 잇고 넷째(w)는 안 이어집니다(대기 0 그대로, 자기 각성도 턴당 2개 한도에 걸려 안 나감).
    const c = fighter('transcendent', ['chainAwaken', x.id, y.id, z.id, w.id]); const logs2 = run(c);
    assert.equal(logs2.filter(t => /연계 각성 \(위력 60%\)/.test(t)).length, 3, logs2.join('\n')); assert.equal(c.cooldowns[w.id], 0);
});
