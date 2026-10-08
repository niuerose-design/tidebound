// v3.69 독립 수련 통합(docs/concept.md 11.8): 옛 독립 수련 27개 → 계열별 수련 직업 6개.
import { newState, act, strike, canChangeJob, migrateState, stats, JOBS, SKILLS, assert, test } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';

const { load } = loadGame(), T = await load('game/data/training.js'), P = await load('game/systems/progression.js'), S = await load('game/systems/stats.js'), { lineageOf } = await load('game/data/classes.js');
const job = id => JOBS.find(j => j.id === id);

test('v3.69 training: six training jobs absorb the 27 old independents; every old skill keeps its id under a new owner', () => {
    const ids = Object.keys(T.TRAINING_GROUPS);
    assert.equal(ids.length, 6); assert.equal(T.RETIRED_TRAINING.length, 27); assert.equal(new Set(T.RETIRED_TRAINING).size, 27);
    for (const id of ids) { const j = job(id); assert.ok(j && j.tier === 1 && lineageOf(j) === `${j.tree}-independent` && j.subRole === 'training' && !j.retired, id); }
    // v3.80 숙달 목표 = 패시브 마지막 숙련 단계(225,000) × 40%.
    for (const id of ids) assert.equal(P.jobMasteryTarget(job(id)), 90_000, id);
    for (const old of T.RETIRED_TRAINING) { assert.ok(job(old).retired, old); assert.equal(SKILLS.filter(sk => sk.job === old).length, 0, `${old} owns nothing now`); }
    // 지도 제작자의 측량(드롭) → 보조 수련. v3.170 새 수련 패시브는 처음부터 수련 직업 소유.
    const owner = id => SKILLS.find(sk => sk.id === id).job;
    assert.equal(owner('chartedCurrents'), 'trainingSupport');
    assert.equal(owner('bitterBrew'), 'trainingStatus'); assert.equal(owner('tarredBarbs'), 'trainingStatus');
    assert.equal(owner('axeArm'), 'trainingPhysical'); assert.equal(owner('innerBreath'), 'trainingDefense'); assert.equal(owner('twoHanded'), 'trainingHybrid');
    assert.ok(T.RETIRED_TRAINING.every(id => JOBS.some(j => j.id === id)), 'kept in the table for old records');
});

test('v3.69 training: retired jobs refuse the job change even when mastered; training jobs hunt weak and earn about a third', () => {
    const s = newState(0); s.level = 20; Object.assign(s.attributes, { str: 20, dex: 20, int: 20, vit: 20, wis: 20, luk: 20 });
    assert.equal(canChangeJob(s, 'woodcutter'), false); s.jobMastery.woodcutter = 1e9; assert.equal(canChangeJob(s, 'woodcutter'), false, 'retired even when mastered');
    assert.equal(canChangeJob(s, 'trainingPhysical'), true);
    const j = job('trainingPhysical'); assert.ok(j.attack <= .35 && j.magic <= .35 && j.hp <= .4 && j.rewardScale === .35);
    const base = { ...newState(0), level: 20 }, fisherGold = S.goldMultiplier(base), fisherExp = S.expMultiplier(base);
    const train = { ...base, job: 'trainingPhysical' };
    assert.ok(Math.abs(S.goldMultiplier(train) - fisherGold * .35) < 1e-9 && Math.abs(S.expMultiplier(train) - fisherExp * .35) < 1e-9);
    assert.ok(stats(train).attack < stats(base).attack, 'weaker than the beginner');
});

test('v3.69 training: a save sitting in an old independent job moves to its training job and keeps its skills and records', () => {
    const s = newState(0); s.level = 20; s.job = 'noviceMonk'; s.unlockedJobs.push('noviceMonk'); s.jobMastery.noviceMonk = 400; s.learned.innerBreath = 2; s.skills = ['hook', 'innerBreath'];
    migrateState(s); migrateState(s);
    assert.equal(s.job, 'trainingDefense'); assert.ok(s.unlockedJobs.includes('trainingDefense') && s.unlockedJobs.includes('noviceMonk'));
    assert.equal(s.jobMastery.noviceMonk, 400, 'old mastery kept'); assert.equal(s.learned.innerBreath, 2); assert.deepEqual(s.skills, ['hook', 'innerBreath']);
    assert.ok(stats(s).hpRegen >= 3, 'the passive still works in the training job');
    act(s, { type: 'job', id: 'fisher' }, 0); assert.throws(() => act(s, { type: 'job', id: 'noviceMonk' }, 0));
});

test('v3.69 training passives: tier-3 strength from level 1, tier-3 mastery milestones, old inheritance kept once', () => {
    const passives = SKILLS.filter(sk => sk.job?.startsWith('training') && sk.type === 'passive');
    assert.equal(passives.length, 24, 'v3.170: six training jobs × 4 passives');
    for (const sk of passives) { assert.deepEqual(P.masteryMilestonesFor(sk), [4500, 22500, 84000, 225000], sk.id); if (T.TRAINING_DESC[sk.id]) assert.ok(sk.desc === T.TRAINING_DESC[sk.id] && !/\d/.test(sk.desc), `${sk.id} desc has no stale numbers`); }
    assert.equal(SKILLS.find(sk => sk.id === 'axeArm').bonus.attack, 45); assert.equal(SKILLS.find(sk => sk.id === 'tarredBarbs').bonus.dotTurnsBonus, 1, 'rule values are not scaled');
    // 예전 기준(250)으로 계승 자격이 있던 세이브는 유지, 새 세이브는 새 기준(4,500).
    const old = newState(0); delete old.trainingRescaled; old.skillPractice.axeArm = 300; old.skillPractice.keenEye = 100;
    migrateState(old); migrateState(old);
    assert.ok(old.legacyInherited.axeArm && !old.legacyInherited?.keenEye && old.trainingRescaled);
    const fresh = newState(0); fresh.skillPractice.axeArm = 300; migrateState(fresh); assert.ok(!fresh.legacyInherited?.axeArm, 'new saves use the new bar');
});

test('v3.170 training jobs: no actives, exactly 4 passives each with one main and one minor stat and no extra mechanics; the deleted skills are retired without compensation', async () => {
    const Mig = await load('game/systems/migrations.js');
    for (const id of Object.keys(T.TRAINING_GROUPS)) {
        const own = SKILLS.filter(sk => sk.job === id);
        assert.equal(own.filter(sk => sk.type !== 'passive').length, 0, `${id} has no active`);
        assert.equal(own.length, 4, `${id} has 4 passives`);
        for (const sk of own) {
            const keys = Object.keys(sk.bonus); assert.ok(keys.length >= 1 && keys.length <= 3, `${sk.id}: ${keys}`);
            assert.ok(!sk.cooldownReset && !sk.revive && !sk.perCount && !sk.levelEffects, `${sk.id} carries no special mechanic`);
            assert.ok(!/\d/.test(sk.desc), `${sk.id} desc has no digits`); assert.equal(sk.cost, 2, sk.id);
        }
    }
    // 새 패시브도 ×1.5(규칙 값 dotTurnsBonus는 그대로).
    const bonus = id => SKILLS.find(sk => sk.id === id).bonus;
    assert.deepEqual(bonus('tarredBarbs'), { dotTurnsBonus: 1, accuracy: .045 }); assert.deepEqual(bonus('fieldRations'), { hpRegen: 3, manaRegen: 3 });
    assert.deepEqual(bonus('tideAlmanac'), { expBonus: .06, manaRegen: 2 }); assert.deepEqual(bonus('rangeMark'), { accuracy: .075, crit: .03 });
    assert.deepEqual(bonus('bookwise'), { arcaneRatioBonus: .45, magic: 15 }); assert.deepEqual(bonus('driftwoodGuard'), { hp: 90, defense: 18, resist: 18 });
    // 지운 스킬 14개: 스킬 표에 없고, 세이브의 기록은 보상 없이 지워집니다.
    const gone = ['arcane', 'cut', 'hushCurrent', 'undertow', 'rushCurrent', 'netThrow', 'oathShout', 'currentJam', 'driftwoodShove', 'rottenBait', 'resolve', 'showmanship', 'scales', 'vital'];
    for (const id of gone) { assert.ok(Mig.RETIRED_SKILLS.includes(id), id); assert.ok(!SKILLS.some(sk => sk.id === id), `${id} is gone`); }
    const s = newState(0); s.learned.cut = 3; s.skillPractice.showmanship = 999; s.skillInheritances.vital = true; s.skills = ['hook', 'cut', 'axeArm'];
    migrateState(s);
    assert.ok(!s.learned.cut && !s.skillPractice.showmanship && !s.skillInheritances.vital); assert.deepEqual(s.skills, ['hook', 'axeArm']);
    const hp = stats({ ...newState(0), level: 20, job: 'trainingHybrid', learned: { fieldRations: 1 }, skills: ['fieldRations'] });
    assert.ok(hp.hpRegen >= 3 && hp.manaRegen >= 3, 'new passive works in its training job');
});

test('v3.172 blaster recoil gauge: damage taken fills charge by max-hp share, cylinder burst waits for 3 stacks and spends them all', async () => {
    const C = await load('game/systems/combat.js'), R = await load('game/data/roles.js');
    assert.equal(R.subRoleOf(job('bulkyFisher'), lineageOf(job('bulkyFisher'))), 'borderRecoil'); assert.equal(job('ironBastion').tier, 5); assert.equal(job('ironBastion').parent, 'mountainBody');
    const sk = id => SKILLS.find(x => x.id === id);
    assert.deepEqual(['thickBuild', 'wallOfFlesh', 'mountainHeart', 'ironShell'].map(id => sk(id).recoilGauge), [.12, .1, .08, .06]);
    assert.equal(sk('landslide').chargeNeed, 3); assert.equal(sk('bunkerBuster').chargeNeed, 5); assert.ok(['bodySlam', 'massiveCharge', 'landslide', 'bunkerBuster'].every(id => sk(id).scalingAttack > 0));
    const base = { hp: 1000, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 9, evasion: 0, speed: 10, mana: 1000, manaRegen: 0 };
    const mk = (skills, extra = {}) => ({ name: 'A', stats: { ...base, ...extra }, hp: extra.hp || 1000, mana: 1000, skills, cooldowns: {}, stun: 0, effects: {}, ranks: Object.fromEntries(skills.map(id => [id, 1])), mastery: {}, practice: {} });
    // 100 피해 × 2 = 200 ≥ 1000 × 12% → 충전 1, 나머지 80 이월. 두 패시브면 작은 비율(10%)만.
    const hitter = mk([]), b = mk(['thickBuild']);
    C.strike(hitter, b, () => 0); assert.ok(!b.effects.charge); C.strike(hitter, b, () => 0); assert.equal(b.effects.charge, 1); assert.equal(Math.round(b.effects.recoilPool), 80);
    const b2 = mk(['thickBuild', 'wallOfFlesh']); C.strike(hitter, b2, () => 0); assert.equal(b2.effects.charge, 1, '10% unit: one hit of 100 fills a stack');
    // 실린더 버스트는 충전 3부터 나가고 모두 소모합니다.
    const a = mk(['landslide']), t = mk([]); assert.match(C.strike(a, t, () => 0), /기본 공격/);
    a.effects.charge = 3; const log = C.strike(a, t, () => 0); assert.match(log, new RegExp(sk('landslide').name)); assert.equal(a.effects.charge, 0);
    const D = await load('game/systems/skill-description.js');
    assert.match(D.skillBrief(sk('thickBuild')), /받은 피해 최대 체력 12%마다 충전 \+1/); assert.ok(D.skillEffectLines(sk('ironShell')).some(l => /반동 게이지/.test(l)));
});

test('v3.172 lara mana mend: at the start of an action mana (8% of max) becomes hp (3~8% of max); magic attr skills add magic attack', async () => {
    const C = await load('game/systems/combat.js'), R = await load('game/data/roles.js');
    assert.equal(R.subRoleOf(job('stillAngler'), lineageOf(job('stillAngler'))), 'absorb'); assert.equal(job('voidSage').tier, 5); assert.equal(job('voidSage').parent, 'voidMind');
    const sk = id => SKILLS.find(x => x.id === id);
    assert.deepEqual(['calmMind', 'deepMeditation', 'emptyMind', 'mountainSpirit'].map(id => sk(id).manaMend.heal), [.03, .045, .06, .08]);
    const base = { hp: 1000, attack: 20, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 9, evasion: 0, speed: 10, mana: 1000, manaRegen: 0 };
    const mk = (skills, extra = {}) => ({ name: 'A', stats: { ...base, ...extra }, hp: extra.hp || 1000, mana: 1000, skills, cooldowns: {}, stun: 0, effects: {}, ranks: Object.fromEntries(skills.map(id => [id, 1])), mastery: {}, practice: {} });
    const a = mk(['calmMind']); a.hp = 500; const t = mk([]);
    C.strike(a, t, () => 0); assert.equal(a.hp, 530); assert.equal(a.mana, 920);
    const two = mk(['calmMind', 'emptyMind']); two.hp = 500; C.strike(two, t, () => 0); assert.equal(two.hp, 560, 'largest heal only'); assert.equal(two.mana, 920);
    const dry = mk(['emptyMind']); dry.hp = 500; dry.mana = 50; C.strike(dry, t, () => 0); assert.equal(dry.hp, 500, 'no mana, no heal'); assert.equal(dry.mana, 50);
    const full = mk(['emptyMind']); C.strike(full, t, () => 0); assert.equal(full.mana, 1000, 'full hp spends nothing');
    // 정신 비례 마법 기술: 능력치 0인 몸이면 마법 공격 × scalingAttack × 배율.
    const m = mk(['mindWave']), ev = []; const t2 = mk([]); C.strike(m, t2, () => 0, ev);
    const w = sk('mindWave'); assert.equal(ev[0].skillId, 'mindWave'); assert.ok(Math.abs((1000 - t2.hp) - 100 * w.scalingAttack * w.multiplier) <= 1, `${1000 - t2.hp}`);
    const D = await load('game/systems/skill-description.js');
    assert.match(D.skillBrief(sk('calmMind')), /최대 마나 8% → 최대 체력 3% 회복/); assert.ok(D.skillEffectLines(sk('mountainSpirit')).some(l => /마나 치유/.test(l)));
});

test('v3.176 oneway devices: aran combo stacks on hit and beyonder spends it, dual blade stacks on evade and blade fury turns stacks into follow-ups, battle mage mana shield eats damage first', async () => {
    const C = await load('game/systems/combat.js'), D = await load('game/systems/skill-description.js');
    const sk = id => SKILLS.find(x => x.id === id);
    for (const [id, parent] of [['titanArm', 'colossus'], ['phantomBlade', 'shadowRunner'], ['archMagus', 'pureMagus']]) { assert.equal(job(id).tier, 5, id); assert.equal(job(id).parent, parent); }
    const base = { hp: 1000, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 9, evasion: 0, speed: 10, mana: 1000, manaRegen: 0 };
    const mk = (skills, extra = {}) => ({ name: 'A', stats: { ...base, ...extra }, hp: extra.hp || 1000, mana: 1000, skills, cooldowns: {}, stun: 0, effects: {}, ranks: Object.fromEntries(skills.map(id => [id, 1])), mastery: {}, practice: {} });
    // 콤보: 명중마다 +1, 중첩마다 피해 +3%(장사의 악력), 비욘더는 3중첩부터 모두 방출.
    const a = mk(['roughHands', 'strongmanGrip']), t = mk([]);
    C.strike(a, t, () => 0); assert.equal(a.effects.charge, 1); const hp1 = t.hp; C.strike(a, t, () => 0); assert.equal(a.effects.charge, 2);
    assert.equal(1000 - hp1, 100, 'first hit without combo'); assert.equal(hp1 - t.hp, 103, 'second hit at combo 1: +3%');
    const b = mk(['mountainCleave', 'roughHands']), t2 = mk([]); assert.match(C.strike(b, t2, () => 0), /기본 공격/); b.effects.charge = 3;
    assert.match(C.strike(b, t2, () => 0), new RegExp(sk('mountainCleave').name)); assert.equal(b.effects.charge, 1, 'spent all, then the hit itself stacks 1');
    // 회피 반격: 빗나가면 맞은 쪽 충전 +1, 블레이드 퓨리는 추가타 2 + 중첩.
    const d = mk(['quickHands'], { evasion: 1 }), hitter = mk([], { accuracy: 1 }); C.strike(hitter, d, () => .99); assert.equal(d.effects.charge, 1); assert.equal(d.hp, 1000);
    const f = mk(['afterimageFlurry']), t3 = mk([]), ev = []; f.effects.charge = 3; C.strike(f, t3, () => 0, ev);
    assert.equal(ev[0].hits.filter(h => h.kind === 'follow').length, 5, 'extraAttacks 2 + 3 stacks'); assert.equal(f.effects.charge, 0);
    const f0 = mk(['afterimageFlurry']), ev0 = []; C.strike(f0, mk([]), () => 0, ev0); assert.equal(ev0[0].hits.filter(h => h.kind === 'follow').length, 2, 'fires with no stacks');
    // 마나 방패: 피해 100의 30%를 마나로(마나 1 = 피해 2 → 마나 15).
    const m = mk(['manaFocus']); C.strike(mk([]), m, () => 0); assert.equal(m.hp, 930); assert.equal(m.mana, 985);
    const dry = mk(['pureCore']); dry.mana = 10; C.strike(mk([]), dry, () => 0); assert.equal(dry.hp, 930, 'mana 10 × 3 = 30 blocked, 70 lands'); assert.equal(dry.mana, 0);
    assert.match(D.skillBrief(sk('roughHands')), /명중마다 콤보\(충전\) \+1/); assert.match(D.skillBrief(sk('quickHands')), /회피마다 충전 \+1/); assert.match(D.skillBrief(sk('manaFocus')), /받는 피해 30%를 마나로/);
    assert.ok(D.skillEffectLines(sk('karmaFury')).some(l => /중첩당 추가타 \+1/.test(l)));
});

test('v3.69 mastered job count: retired independents no longer count, for old saves too', () => {
    const s = newState(0); s.jobMastery.woodcutter = 1e9; s.jobMastery.harpoon = 1e9;
    assert.equal(P.masteredJobCount(s), 1);
});

test('v3.70 stat training I-III: opened by 1M training mastery, each step needs the previous one mastered, passives raise base attributes and can be inherited', () => {
    const s = newState(0); s.level = 30;
    for (const [stat, parent] of [['str', 'trainingPhysical'], ['int', 'trainingMagic'], ['vit', 'trainingDefense'], ['luk', 'trainingStatus'], ['wis', 'trainingHybrid'], ['dex', 'trainingSupport']]) {
        const [i1, i2, i3] = [1, 2, 3].map(n => job(`${stat}Training${n}`));
        assert.ok(i1.parent === parent && i2.parent === i1.id && i3.parent === i2.id, stat);
        assert.deepEqual([i1.mastery, i1.masteryTarget, i2.mastery, i2.masteryTarget, i3.mastery, i3.masteryTarget], [1e6, 1e7, 1e7, 2.5e7, 2.5e7, 5e7], stat);
        assert.ok([i1, i2, i3].every(j => j.subRole === 'training' && j.rewardScale === .35 && lineageOf(j) === lineageOf(job(parent))), stat);
    }
    assert.equal(canChangeJob(s, 'strTraining1'), false); s.jobMastery.trainingPhysical = 999_999; assert.equal(canChangeJob(s, 'strTraining1'), false);
    s.jobMastery.trainingPhysical = 1_000_000; assert.equal(canChangeJob(s, 'strTraining1'), true); assert.equal(canChangeJob(s, 'strTraining2'), false);
    // 패시브: 기본 능력치(근력) 자체가 오릅니다. 다른 직업이 계승(첫 숙련 단계 1,000만)하면 그 직업에서도 오릅니다.
    const h = newState(0); h.level = 30; h.job = 'harpoon'; h.learned.strDrill1 = 1; h.skills = ['strDrill1'];
    const before = stats({ ...h, skills: [] }).attack;
    assert.equal(stats(h).attack, before, 'not inherited yet: no effect');
    h.skillPractice.strDrill1 = 10_000_000; const S1 = S.trainedAttributes(h).str, base = S.trainedAttributes({ ...h, skills: [] }).str;
    assert.equal(S1 - base, 25, '+20 × (1 + 25% for the first mastery stage)');
    assert.deepEqual([1, 2, 3].map(n => SKILLS.find(sk => sk.id === `strDrill${n}`).cost), [4, 6, 8], 'high AP cost'); assert.ok(stats(h).attack > before);
});

test('v3.80 job mastery targets follow skill milestones (40% of the last); jobs mastered under the old target stay mastered', async () => {
    const Sk = await load('game/data/skills.js');
    const whaler = job('whaler'), old = Sk.LEGACY_MASTERY_TARGET.whaler;
    assert.ok(old < P.jobMasteryTarget(whaler), 'target went up');
    const s = newState(0); delete s.masteryAligned; s.jobMastery.whaler = old; s.jobMastery.harpoon = 1;
    assert.equal(P.jobMastered(s, whaler), false);
    migrateState(s); migrateState(s);
    assert.deepEqual(s.masteryKept, ['whaler']); assert.equal(P.jobMastered(s, whaler), true); assert.equal(P.masteredJobCount(s), 1);
    const n = newState(0); n.jobMastery.whaler = old; migrateState(n); assert.equal(P.jobMastered(n, whaler), false, 'new saves use the new target');
});

test('v3.80 skill mastery standard: one curve per tier (×1.4 long-term), custom ones within ±50%, constraint skills in tens of millions; old inheritance kept when the first stage went up', async () => {
    const Sk = await load('game/data/skills.js'), R = await load('game/data/roles.js');
    const bad = [];
    for (const sk of SKILLS) {
        const j = job(sk.job); if (!j || j.tier < 1 || j.retired) continue;
        const exempt = /^training|Training[123]$|[hH]acker$/.test(j.id) || ['border', 'borderBuffer', 'borderReflect', 'borderStand', 'borderBuff', 'borderHarmony', 'borderTempo', 'borderRecoil'].includes(R.subRoleOf(j, lineageOf(j)));
        if (exempt) continue;
        // 제약형(최대 숙련에서 AP 0 이하 · 제약 직업): 마지막 단계가 천만 단위(AP 반환 5,000만 · 그 밖 1,000만).
        if (Sk.isConstraintSkill(sk)) { const want = Sk.CONSTRAINT_MASTERY_BY_SKILL[sk.id] ?? (Sk.costAtMastery(sk) < 0 ? 5e7 : 1e7); if (P.masteryMilestonesFor(sk).at(-1) !== want) bad.push(`${sk.id} constraint`); continue; }
        const r = P.masteryMilestonesFor(sk).at(-1) / Sk.SKILL_TIER_CURVE[Math.min(5, j.tier)].at(-1);
        if (r < .5 || r > 1.5) bad.push(`${sk.id} ×${r.toFixed(2)}`);
    }
    assert.deepEqual(bad, []);
    assert.deepEqual(P.masteryMilestonesFor(SKILLS.find(sk => sk.id === 'emptyPalm')), [600, 3000, 12000, 36000], 'moved 2nd-tier hidden jobs use the 2nd-tier curve');
    assert.deepEqual(P.masteryMilestonesFor(SKILLS.find(sk => sk.id === 'boneLegacy')), [1e6, 4e6, 1e7], 'v3.137 bone legacy (AP 6 → 4 → 2 → −3) in millions, ending at ten million');
    assert.equal(P.jobMasteryTarget(job('undead')), 1e7, 'v3.137 망인 job mastery is ten million');
    const s = newState(0); delete s.masteryAligned; s.skillPractice.emptyPalm = 300; s.skillPractice.wave = 100;
    migrateState(s); assert.ok(s.legacyInherited?.emptyPalm && !s.legacyInherited?.wave, 'kept only above the old first stage');
});

test('v3.83 utility gain ×1.5: gold/exp/drop bonuses of utility job skills only, applied once', async () => {
    const Sk = await load('game/data/skills.js');
    const bonus = id => SKILLS.find(sk => sk.id === id).bonus;
    assert.equal(Sk.UTILITY_GAIN_SCALE, 1.5);
    assert.deepEqual([bonus('tradeEmpire').goldBonus, bonus('tradeEmpire').dropBonus], [.3, .09], 'seaTradeKing .2/.06 → .3/.09');
    assert.equal(bonus('voyageReview').expBonus, .12);
    assert.equal(bonus('chartedCurrents').goldBonus, .06, 'training (not utility) unchanged');
    assert.equal(bonus('harmonics').expBonus, .04, 'border jobs unchanged');
    Sk.scaleUtilityGain(SKILLS); assert.equal(bonus('tradeEmpire').goldBonus, .3, 'calling again does not scale twice');
});

test('v3.84 penetration: sources stack multiplicatively (no 0.6 wall, 0.85 total cap), research 3% per rank, owned gear lines ×2 once; boss damage stacks multiplicatively', async () => {
    const B = await load('game/data/balance.js');
    assert.ok(Math.abs(B.stackPenetration(.3, .2) - .44) < 1e-9, '1 − 0.7 × 0.8');
    assert.ok(Math.abs(B.stackPenetration(.5, -.1) - .4) < 1e-9, 'penalties still subtract');
    const s = newState(0); s.permanent.penetration = 15;
    assert.ok(Math.abs(stats(s).penetration - .45) < 1e-9, 'research 15 ranks = 45%');
    assert.ok(Math.abs(B.stackBossDamage(.05, .05) - .1025) < 1e-9, 'boss damage: 1.05 × 1.05 − 1');
    const old = newState(0); delete old.penetrationBoosted;
    old.inventory.push({ id: 'p1', slot: 'rod', style: 'physical', rarity: 6, power: 530, level: 100, enhance: 0, name: 't', affixes: [{ id: 'piercing', name: '관통', stat: 'penetration', value: .05 }, { id: 'might', name: '힘', stat: 'attack', value: 10 }] });
    migrateState(old);
    assert.equal(old.inventory[0].affixes[0].value, .1); assert.equal(old.inventory[0].affixes[1].value, 10, 'other lines untouched');
    migrateState(old); assert.equal(old.inventory[0].affixes[0].value, .1, 'only once');
});

test('v3.84 boss damage: direct hits on bosses only (world bosses included), never damage-over-time ticks', async () => {
    const { strike } = await load('game/systems/combat.js'), { duel, raidBossSnapshot } = await load('game/systems/duel.js'), { raidById } = await load('game/data/altar.js');
    const base = { hp: 1e7, attack: 1000, magic: 1000, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 100, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const mk = (skills, extra = {}, more = {}) => ({ name: 'A', stats: { ...base, ...extra }, hp: 1e7, mana: 100, skills, cooldowns: {}, stun: 0, effects: {}, ranks: Object.fromEntries(skills.map(id => [id, 1])), mastery: {}, practice: {}, ...more });
    const hit = (bd, prey) => { const b = mk([], {}, prey ? { prey: true } : {}); strike(mk([], { bossDamage: bd }), b, () => .5); return 1e7 - b.hp; };
    assert.ok(Math.abs(hit(.5, true) / hit(0, true) - 1.5) < .01, 'boss: ×1.5'); assert.equal(hit(.5, false), hit(0, false), 'normal foe: unchanged');
    const dot = bd => { const b = mk([], {}, { prey: true }); strike(mk(['venomDart'], { bossDamage: bd }), b, () => 0); return b.effects.poison.perStack; };
    assert.equal(dot(.5), dot(0), 'poison tick ignores boss damage');
    const raid = raidById('zakum'), me = { name: 'me', level: 100, job: 'fisher', rebirths: 0, stats: { ...base, attack: 5000 }, skills: [], power: 1, rating: 1000 };
    const dealt = bd => { const r = duel({ ...me, stats: { ...me.stats, bossDamage: bd } }, raidBossSnapshot(raid), true, () => .5, 5); return raid.stats.hp - r.opponentHp; };
    assert.ok(dealt(.5) > dealt(0) * 1.4, 'world boss counts as a boss');
});

test('v3.88 luck-scaling skills (Phantom line) put crit damage into power once: a crit does not multiply it again', async () => {
    const { strike } = await load('game/systems/combat.js'), { SKILL_FORMULA } = await load('game/data/balance.js');
    assert.equal(SKILL_FORMULA.luckScalingScale, 2.8);
    const base = { hp: 1e9, attack: 1000, magic: 1000, defense: 0, resist: 0, accuracy: 5, evasion: 0, speed: 10, mana: 1e6, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 3 };
    const mk = (skills, crit) => ({ name: 'A', stats: { ...base, crit }, hp: 1e9, mana: 1e6, skills, cooldowns: {}, stun: 0, effects: {}, ranks: Object.fromEntries(skills.map(id => [id, 1])), mastery: {}, practice: {} });
    const hit = (skills, crit) => { const b = mk([], 0); strike(mk(skills, crit), b, () => 0); return 1e9 - b.hp; };
    assert.equal(hit(['fateRoll'], 1), hit(['fateRoll'], 0), 'Ultimate Drive: same damage with or without a crit');
    assert.ok(hit([], 1) > hit([], 0) * 2.5, 'a normal attack still multiplies crit damage');
});

test('v3.89 Joker: luck ratio 0.3 (Final Cut keeps 0.8)', () => {
    assert.equal(SKILLS.find(sk => sk.id === 'jackpotStrike').scalingRatio, .3);
    assert.equal(SKILLS.find(sk => sk.id === 'allOrNothing').scalingRatio, .8);
});

test('v3.97 Night Lord dice skills (3rd · 5th tier) add physical attack × 0.5 to the luck base; v3.176 1st · 2nd tier add × .4 · .45', async () => {
    const { strike } = await load('game/systems/combat.js');
    assert.equal(SKILLS.find(sk => sk.id === 'fateReversal').scalingAttack, .5);
    assert.equal(SKILLS.find(sk => sk.id === 'heavenlyDice').scalingAttack, .5);
    assert.equal(SKILLS.find(sk => sk.id === 'heavenlyStrike').scalingAttack, .45); assert.equal(SKILLS.find(sk => sk.id === 'luckyBreak').scalingAttack, .4);
    const mk = (skills, attack) => ({ name: 'A', stats: { hp: 1e9, attack, magic: 0, defense: 0, resist: 0, accuracy: 5, evasion: 0, speed: 10, mana: 1e6, manaRegen: 0, penetration: 0, lifesteal: 0, crit: 0, critDamage: 2, attrLuk: 500 }, hp: 1e9, mana: 1e6, skills, cooldowns: {}, stun: 0, effects: {}, ranks: Object.fromEntries(skills.map(id => [id, 1])), mastery: {}, practice: {} });
    const hit = (skills, attack) => { const b = mk([], 0); strike(mk(skills, attack), b, () => 0); return 1e9 - b.hp; };
    assert.ok(hit(['fateReversal'], 40000) > hit(['fateReversal'], 1000) * 5, 'Triple Throw grows with attack');
    assert.ok(hit(['heavenlyStrike'], 40000) > hit(['heavenlyStrike'], 1000) * 5, 'v3.176 Avenger grows with attack too');
});

test('v3.98 Dark Knight: Dragon Fury ×2.8, Beholder Impact ×2.8 with one extra hit, Darkness Aura crit like Phantom\'s 5th passive', () => {
    const sk = id => SKILLS.find(s => s.id === id);
    assert.equal(sk('thunderLance').multiplier, 2.1);
    assert.equal(sk('leviathanCharge').multiplier, 2.1);
    assert.equal(sk('leviathanCharge').extraAttacks, 1);
    // v3.144 다크나이트: 물리 창술 한 줄.
    for (const id of ['currentThrust', 'dragonDive', 'thunderLance', 'leviathanCharge', 'dragonGodSpear']) assert.equal(sk(id).damageType, 'physical', id);
    assert.deepEqual([sk('dragonGodScale').bonus.crit, sk('dragonGodScale').bonus.critDamage], [sk('divineLuck').bonus.crit, sk('divineLuck').bonus.critDamage]);
});

test('v3.100 Luminous: Light Reflection ×2.8, Apocalypse ×3 with one extra hit', () => {
    const sk = id => SKILLS.find(s => s.id === id);
    assert.equal(sk('vowStrike').multiplier, 2.8);
    assert.equal(sk('lightHarpoon').multiplier, 3);
    assert.equal(sk('lightHarpoon').extraAttacks, 1);
});

test('v3.107 Paladin: Sanctuary defense ratio 2.4, Elemental Force adds crit 8%p and crit damage 0.4 (v3.138: Michael lineage retired)', () => {
    const sk = id => SKILLS.find(s => s.id === id);
    assert.equal(sk('citadelCrash').scalingRatio, 2.4);
    assert.deepEqual([sk('eternalReef').bonus.crit, sk('eternalReef').bonus.critDamage], [.08, .4]);
    for (const id of ['shieldBash', 'lastStand', 'divineAegis', 'fortress', 'coralPatience']) assert.equal(sk(id), undefined, `${id} removed`);
    for (const id of ['shieldbearer', 'guardianDeity', 'coralBuilder']) assert.equal(JOBS.find(j => j.id === id), undefined, `${id} removed`);
});

test('v3.108 Wild Hunter: Wild Vulcan ×2.4, Sonic Boom ×2.8', () => {
    const sk = id => SKILLS.find(s => s.id === id);
    assert.equal(sk('weakpointThesis').multiplier, 2.4);
    assert.equal(sk('weakpointCut').multiplier, 2.8);
});

test('v3.109 Kaiser: Nova Temperance adds crit 8%p and crit damage 0.4 (same as Michael and Paladin)', () => {
    const sk = id => SKILLS.find(s => s.id === id);
    assert.deepEqual([sk('earthShell').bonus.crit, sk('earthShell').bonus.critDamage], [sk('eternalReef').bonus.crit, sk('eternalReef').bonus.critDamage]);
});

test('v3.143 Mechanic: every active is defense-scaled magic damage that charges; Genesis Rune needs 5 charges and spends them', () => {
    const sk = id => SKILLS.find(s => s.id === id);
    assert.equal(sk('resonantCannon').multiplier, 2.4); assert.equal(sk('resonantCannon').damageBonusCondition, 'weakened');
    assert.equal(sk('resonanceBurst').multiplier, 2.8); assert.equal(sk('resonanceBurst').effect, 'weaken');
    for (const id of ['plateSurge', 'resonantCannon', 'resonanceBurst']) { assert.equal(sk(id).damageType, 'magic', id); assert.equal(sk(id).scaling, 'defense', id); }
    assert.equal(sk('genesisRune').damageType, 'fixed'); assert.equal(sk('genesisRune').baseStat, 'magic'); assert.equal(sk('genesisRune').scaling, 'defense');
    for (const id of ['runeHammer', 'plateSurge', 'resonantCannon', 'resonanceBurst']) assert.equal(sk(id).charge, 1, id);
    assert.equal(sk('genesisRune').chargeNeed, 5); assert.equal(sk('genesisRune').chargeBonus, .1);
    assert.equal(sk('broadside'), undefined, 'cannon shooter removed');
    const base = { hp: 1e6, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 200, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5, guardAffinity: 1 };
    const fighter = (id, effects = {}, cooldowns = {}) => ({ name: 'A', stats: { ...base, magic: 300, defense: 200 }, hp: 1000, mana: 200, skills: [id], cooldowns, stun: 0, effects, ranks: { [id]: 1 }, mastery: {}, practice: {} });
    const target = (effects = {}) => ({ name: 'B', stats: { ...base }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects });
    // 충전 기술이 명중하면 +1, 약화된 적이면 +2.
    const a1 = fighter('plateSurge'); strike(a1, target(), () => 0); assert.equal(a1.effects.charge, 1);
    const a2 = fighter('plateSurge'); strike(a2, target({ weaken: 2 }), () => 0); assert.equal(a2.effects.charge, 2);
    // 전탄발사(각성, 대기 0)는 중첩이 모자라면 기다리고(기본 공격만), 5중첩이면 나가서 모두 소모해 중첩당 +10%.
    const g0 = fighter('genesisRune', { charge: 4 }, { genesisRune: 0 }); const e0 = []; strike(g0, target(), () => 0, e0); assert.equal(e0.length, 1); assert.equal(e0[0].skillName, '기본 공격'); assert.equal(g0.effects.charge, 4); assert.equal(g0.cooldowns.genesisRune, 0);
    const g5 = fighter('genesisRune', { charge: 5 }, { genesisRune: 0 }); const e5 = []; strike(g5, target(), () => 0, e5);
    const g8 = fighter('genesisRune', { charge: 8 }, { genesisRune: 0 }); const e8 = []; strike(g8, target(), () => 0, e8);
    assert.equal(e5.length, 2); assert.ok(e5[1].awaken); assert.equal(g5.effects.charge, 0); assert.equal(g8.effects.charge, 0);
    const d5 = e5[1].total, d8 = e8[1].total; assert.ok(Math.abs(d8 / d5 - 1.8 / 1.5) < .03, `charge bonus ${d5} → ${d8}`);
    // 고정 피해: 적의 방어 · 마법 방어가 아무리 높아도 같은 피해, 로그 피해 유형은 fixed.
    const armored = target(); armored.stats = { ...base, defense: 5000, resist: 5000 }; const ga = fighter('genesisRune', { charge: 5 }, { genesisRune: 0 }); const ea = []; strike(ga, armored, () => 0, ea);
    assert.equal(ea[1].damageType, 'fixed'); assert.equal(ea[1].total, d5, `fixed damage ignores defense: ${ea[1].total} vs ${d5}`);
    const magicOnly = fighter('genesisRune', { charge: 5 }, { genesisRune: 0 }); magicOnly.stats = { ...base, magic: 300, defense: 200, attack: 0, guardAffinity: 1 }; const em = []; strike(magicOnly, target(), () => 0, em); assert.equal(em[1].total, d5, 'base uses magic, not attack');
});

test('v3.120 Arch Mage (Thunder, Cold): Extreme Magic magic steps 25 · 200 · 700 · 2000', () => {
    assert.deepEqual(SKILLS.find(s => s.id === 'tideOfAges').levelEffects.map(l => l.bonus.magic), [25, 200, 700, 2000]);
});

test('v3.146 Eunwol: Ghost Gate attack +300 with a two-hit spirit, Fist Barrage ×1.4 and Shattering Fists ×1.9 keep one extra hit, World Fists ×2.8', async () => {
    const { SECRET_SKILLS } = await load('game/secret/skills.js');
    const sk = id => SECRET_SKILLS.find(s => s.id === id);
    assert.equal(sk('primordialBlood').bonus.attack, 300); assert.deepEqual(sk('primordialBlood').companion, { hits: 2, power: .35 });
    assert.deepEqual([sk('tentacleBarrage').multiplier, sk('tentacleBarrage').extraAttacks], [1.4, 1]);
    assert.deepEqual([sk('maulingTide').multiplier, sk('maulingTide').extraAttacks], [1.9, 1]);
    assert.equal(sk('worldTentacle').extraAttacks, 1); assert.ok(sk('worldTentacle').multiplier > 2.8, 'awakening boost on top of base ×2.8');
    assert.deepEqual([sk('abyssalGrip').companion, sk('abyssHide').companion], [{ hits: 1, power: .35 }, { hits: 1, power: .4 }]);
});

test('v3.123 Kali: Chakram Split curses (bleed-type damage over time, Illium\'s ratio), Queen of Hexes magic +250', () => {
    const sk = id => SKILLS.find(s => s.id === id);
    assert.deepEqual([sk('calamityRite').effect, sk('calamityRite').dotName, sk('calamityRite').damageBonusCondition], ['bleed', '저주', 'statuses']);
    assert.ok(sk('calamityRite').dotRatio > 0);
    assert.deepEqual([sk('queenOfCurses').bonus.magic, sk('queenOfCurses').bonus.dotBonus], [250, .2]);
});

test('v3.124 Adele: Ruin magic +450 and max mana +1000', async () => {
    const { SECRET_SKILLS } = await load('game/secret/skills.js');
    const sk = SECRET_SKILLS.find(s => s.id === 'endlessVoid');
    assert.deepEqual([sk.bonus.magic, sk.bonus.mana], [450, 1000]);
});

test('v3.155 Cadena: Mystic Storm attack +450 and crit +10%p, variety bonus instead of stun extension; chain arts grant distinct self buffs', () => {
    const sk = id => SKILLS.find(s => s.id === id);
    assert.deepEqual([sk('absoluteStill').bonus.attack, sk('absoluteStill').bonus.crit, sk('absoluteStill').bonus.varietyBonus, sk('absoluteStill').bonus.stunBonus], [450, .1, .035, undefined]);
    assert.deepEqual(['numbNeedle', 'severNerve', 'deadCalm', 'stillVerdict'].map(id => sk(id).selfBuff.id), ['stroke', 'crush', 'scimitar', 'takedown']);
    for (const id of ['numbNeedle', 'severNerve', 'deadCalm', 'stillVerdict', 'worldStill']) assert.ok(!sk(id).effect && !sk(id).damageBonusCondition && !sk(id).statusOnly, id + ' no control, pure chain art');
    assert.equal(sk('worldStill').extendBuffs, 2);
});

test('v3.145 Demon Slayer: actives cost HP instead of mana (floor 1), Blood Rage scales damage by missing HP, Demon Bane still stuns 3 turns', () => {
    const sk = id => SKILLS.find(s => s.id === id);
    assert.equal(sk('heavenSplit').statusTurns, 3); assert.equal(sk('heavenSplit').hpCost, .15);
    for (const id of ['runeEdge', 'arcSlash', 'runeBurst', 'twinMoon', 'heavenSplit']) { assert.equal(sk(id).damageType, 'physical', id); assert.equal(sk(id).manaCost, 0, id); assert.ok(sk(id).hpCost > 0, id); }
    assert.deepEqual([sk('celestialAura').bonus.attack, sk('celestialAura').bonus.crit, sk('celestialAura').bloodRage], [300, .05, .2]);
    const base = { hp: 1000, attack: 300, magic: 0, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 0, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const fighter = (hp, skills) => ({ name: 'A', stats: { ...base }, hp, mana: 0, skills, cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {} });
    const target = () => ({ name: 'B', stats: { ...base, hp: 1e6 }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects: {} });
    // 마나 0이어도 쓰고, 현재 체력의 10%(100)를 바칩니다.
    const a = fighter(1000, ['runeBurst']); const e = []; strike(a, target(), () => 0, e); assert.equal(e[0].skillName, sk('runeBurst').name); assert.equal(e[0].hpSpent, 100); assert.equal(a.hp, 900);
    // 현재 체력 비율이라 말라 죽지 않습니다: 체력 10이면 1만 바치고(9 남음), 체력 5면 비용이 0으로 내림.
    const low = fighter(10, ['runeBurst']); const el = []; strike(low, target(), () => 0, el); assert.equal(low.hp, 9); assert.equal(el[0].hpSpent, 1);
    const tiny = fighter(5, ['runeBurst']); strike(tiny, target(), () => 0); assert.equal(tiny.hp, 5);
    // 피의 분노: 잃은 체력 비율 × (0.1 + 0.15 + 0.2). 1000 → 900(바친 뒤)이면 10% × 0.45, 100 → 90이면 91% × 0.45.
    const t1 = target(); strike(fighter(1000, ['runeBurst', 'runeArmor', 'saintEdge', 'celestialAura']), t1, () => 0); const d1 = 1e6 - t1.hp;
    const t2 = target(); strike(fighter(100, ['runeBurst', 'runeArmor', 'saintEdge', 'celestialAura']), t2, () => 0); const d2 = 1e6 - t2.hp;
    assert.ok(Math.abs(d2 / d1 - (1 + .45 * .91) / (1 + .45 * .1)) < .03, `blood rage ${d1} → ${d2}`);
});

test('v3.132 Arch Mage (Fire, Poison) remake: magic lineage, Poison Nova poisons and burns 7 turns (half chance outside the lineage), Dot Punisher finishes by stacks with no cooldown', async () => {
    const { strike, STATUS_TUNING } = await import('./harness.mjs');
    for (const id of ['venomDart', 'toxicFang', 'miasma', 'rotBloom', 'doomMark', 'endOfAll']) assert.equal(SKILLS.find(s => s.id === id).damageType, 'magic', id);
    const apostle = JOBS.find(j => j.id === 'apostle');
    assert.ok(apostle.magic > apostle.attack, 'apostle leans magic');
    const nova = SKILLS.find(s => s.id === 'doomMark'), punisher = SKILLS.find(s => s.id === 'endOfAll');
    assert.ok(nova.awaken && !nova.awaken.statusScale, 'nova is the awakened skill with its written duration');
    assert.deepEqual([nova.effect, nova.alsoEffect, nova.statusTurns], ['poison', 'burn', 7]);
    assert.equal(punisher.type, 'active'); assert.equal(punisher.awaken, undefined); assert.equal(punisher.cooldown, 0, 'no cooldown; AP cost is the price');
    assert.equal(punisher.bonus, undefined, 'no equip bonus');
    const base = { hp: 1e9, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 1000, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const mk = (skills, extra = {}) => ({ name: 'A', stats: { ...base, ...extra }, hp: 1e9, mana: 1000, skills, cooldowns: Object.fromEntries(skills.map(id => [id, 0])), stun: 0, effects: {}, ranks: Object.fromEntries(skills.map(id => [id, 1])), mastery: {}, practice: {} });
    // 포이즌 노바: 중독·화상을 함께, 지속 7턴 + 지속 턴 옵션.
    let b = mk([]); strike(mk(['doomMark'], { dotTurnsBonus: 2 }), b, () => 0);
    assert.deepEqual([b.effects.poison.turns, b.effects.burn.turns], [9, 9]);
    // 포이즌 노바를 계보 밖에서 계승하면 발동률이 outsiderChance배(난수 .3: 계보 안 .5면 발동, 밖 .25면 실패).
    const novaFires = job => { const a = { ...mk(['doomMark']), job }, ev = []; strike(a, mk([]), () => .3, ev); return ev.some(e => e.skillId === 'doomMark'); };
    assert.equal(nova.outsiderChance, .5); assert.equal(novaFires('apostle'), true); assert.equal(novaFires('hero'), false);
    // 도트 퍼니셔: 상태 없음 → 추가타·기절 없음 / 일부 → 추가타 일부 + 기절 1 / 둘 다 최대 → 추가타 최대 + 기절 2.
    const finish = effects => { const t = mk([]); t.effects = effects; const ev = []; strike(mk(['endOfAll']), t, () => 0, ev); const e = ev.find(x => x.skillId === 'endOfAll'); return [e.hits.filter(h => h.kind === 'follow').length, t.stun]; };
    const dot = (stacks) => ({ perStack: 1, stacks, turns: 5, hpRatio: 0 });
    assert.deepEqual(finish({}), [0, 0]);
    assert.deepEqual(finish({ poison: dot(2) }), [2, 1]);
    assert.deepEqual(finish({ poison: dot(STATUS_TUNING.poisonMaxStacks), burn: dot(2) }), [3, 1]);
    assert.deepEqual(finish({ poison: dot(STATUS_TUNING.poisonMaxStacks), burn: dot(STATUS_TUNING.burnMaxStacks) }), [punisher.dotFinisher.maxHits, 2]);
});

test('v3.138 retiring the Michael lineage: a saved character on a removed job falls back to fisher and its skill records are dropped', () => {
    const s = newState(0); s.job = 'guardianDeity'; s.unlockedJobs.push('shieldbearer', 'guardianDeity'); s.jobMastery.guardianDeity = 5000; s.jobMastery.shieldbearer = 100;
    s.learned.divineAegis = 1; s.learned.aegisJudgment = 1; s.skills = ['divineAegis', 'aegisJudgment', 'breath']; s.skillInheritances.spikedShield = true; s.skillPractice = { divineAegis: 10, breath: 3 };
    migrateState(s, 0);
    assert.equal(s.job, 'fisher'); assert.ok(!s.unlockedJobs.includes('guardianDeity') && !s.unlockedJobs.includes('shieldbearer'));
    assert.equal(s.jobMastery.guardianDeity, undefined); assert.equal(s.jobMastery.shieldbearer, undefined);
    assert.deepEqual(s.skills, ['breath']); assert.equal(s.learned.divineAegis, undefined); assert.equal(s.skillInheritances.spikedShield, undefined); assert.deepEqual(s.skillPractice, { breath: 3 });
    assert.ok(!JOBS.some(j => ['shieldbearer', 'gatekeeper', 'fortressLord', 'unyielding', 'guardianDeity', 'coralBuilder'].includes(j.id)), 'jobs removed from data');
});

test('v3.144 Dark Knight: deaths and turns feed perCount passives; Darkness Aura endures one lethal hit and heals 25%', async () => {
    const { progressCounts, passiveGrowthBonus } = await loadGame().load('systems/progression');
    const sk = id => SKILLS.find(s => s.id === id);
    assert.equal(progressCounts({ playMs: 2000 * 12345, deaths: 7, book: {}, attributes: {} }).turns, 12345);
    const s = newState(0); s.job = 'seaDragonGod'; s.level = 100; s.deaths = 40; s.playMs = 2000 * 25000; s.learned.dragonGodScale = 1;
    const g = passiveGrowthBonus(s, sk('dragonGodScale'));
    assert.ok(Math.abs(g.attack - 80) < 1e-9 && Math.abs(g.hp - 150) < 1e-9, `growth ${JSON.stringify(g)}`);
    s.deaths = 500; s.playMs = 2000 * 1e6; const capped = passiveGrowthBonus(s, sk('dragonGodScale')); assert.ok(Math.abs(capped.attack - 200) < 1e-9 && Math.abs(capped.hp - 600) < 1e-9, 'capped at 100 steps');
    assert.deepEqual(sk('dragonGodScale').lastStand, { charges: 1, heal: .25 });
    const base = { hp: 1e6, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 200, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const knight = { name: 'K', stats: { ...base, hp: 1000 }, hp: 50, mana: 200, skills: ['dragonGodScale'], cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {} };
    const foe = { name: 'F', stats: { ...base, attack: 100000 }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects: {} };
    const ev = []; strike(foe, knight, () => 0, ev); assert.equal(knight.hp, 251, 'endured at 1 + 25% of 1000'); assert.ok(ev[0].endured);
    knight.hp = 50; strike(foe, knight, () => 0, []); assert.equal(knight.hp, 0, 'only once per battle');
});

test('v3.146 Eunwol: companion passives add spirit follow-up hits to every action (basic attacks too), best hits and power win; Gumiho removed', () => {
    const sk = id => SKILLS.find(s => s.id === id);
    assert.deepEqual(sk('galvanicScales').companion, { hits: 1, power: .25 }); assert.equal(sk('tentacleBarrage').extraAttacks, 1);
    assert.equal(sk('devour'), undefined); assert.equal(sk('gorgedMaw'), undefined); assert.equal(JOBS.find(j => j.id === 'tideDevourer'), undefined);
    const base = { hp: 1000, attack: 300, magic: 0, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 100, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const fighter = skills => ({ name: 'A', stats: { ...base }, hp: 1000, mana: 100, skills, cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {} });
    const target = () => ({ name: 'B', stats: { ...base, hp: 1e6 }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects: {} });
    // 기본 공격(기술 없음)에도 정령 추가타 1회(위력 25%).
    const e1 = []; strike(fighter(['galvanicScales']), target(), () => 0, e1); assert.equal(e1[0].hits.length, 2); assert.ok(Math.abs(e1[0].hits[1].value / e1[0].hits[0].value - .25) < .01, `spirit power ${e1[0].hits.map(h => h.value)}`);
    // 패시브가 여럿이면 횟수 · 위력 각각 최대: 2회 · 35%.
    const e2 = []; strike(fighter(['galvanicScales', 'primordialBlood']), target(), () => 0, e2); assert.equal(e2[0].hits.length, 3); assert.ok(Math.abs(e2[0].hits[2].value / e2[0].hits[0].value - .35) < .01);
    // 정령 없는 기본 공격은 추가타 없음.
    const e0 = []; strike(fighter([]), target(), () => 0, e0); assert.equal(e0[0].hits.length, 1);
});

test('v3.148 Adele burns current mana into damage; Flame Wizard Genesis detonates burn stacks', async () => {
    const { SECRET_SKILLS } = await load('game/secret/skills.js'); const { SKILL_FORMULA } = await load('game/data/balance.js');
    const sec = id => SECRET_SKILLS.find(s => s.id === id), pub = id => SKILLS.find(s => s.id === id);
    for (const id of ['voidLance', 'leviathanEquation', 'abyssDecree', 'voidCollapse']) { assert.equal(sec(id).manaCost, 0, id); assert.ok(sec(id).manaBurn > 0, id); assert.equal(sec(id).scaling, undefined, id); }
    assert.equal(sec('nullStep'), undefined); assert.equal(JOBS.find(j => j.id === 'voidDrifter'), undefined);
    const base = { hp: 1000, attack: 0, magic: 300, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 2000, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const fighter = (skills, mana = 2000) => ({ name: 'A', stats: { ...base }, hp: 1000, mana, skills, cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {} });
    const target = (effects = {}) => ({ name: 'B', stats: { ...base, hp: 1e6 }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects });
    // 샤드: 현재 마나 2000의 12% = 240을 태우고, 기준값 300 + 240 × 6 = 1740 → 피해 1740 × 배율.
    const a = fighter(['voidLance']); const e = []; strike(a, target(), () => 0, e); assert.equal(e[0].manaBurned, 240); assert.equal(a.mana, 1760);
    const t0 = target(); const dry = fighter(['voidLance'], 0); const e0 = []; strike(dry, t0, () => 0, e0); assert.equal(e0[0].skillName, e[0].skillName, 'usable with 0 mana (nothing to burn)');
    assert.ok(Math.abs(e[0].total / e0[0].total - 1740 / 300) < .02, `burned mana adds to the base: ${e[0].total} vs ${e0[0].total}`);
    assert.equal(SKILL_FORMULA.manaBurnScale, 6);
    // 창세의 빛: 화상 3중첩이면 ×(1 + 3 × .35), 화상은 사라짐. 화상이 없으면 그대로.
    assert.equal(pub('genesis').burnConsume, .35); assert.equal(pub('genesis').scaling, undefined); assert.equal(pub('starfall').effect, 'burn');
    const forced = { id: 'genesis', index: 0, count: 1, kind: 'awaken' };
    const plain = target(); strike(fighter(['genesis']), plain, () => 0, [], false, false, forced); const d0 = 1e6 - plain.hp;
    const burning = target({ burn: { perStack: 10, stacks: 3, turns: 5 } }); strike(fighter(['genesis']), burning, () => 0, [], false, false, forced); const d3 = 1e6 - burning.hp;
    assert.equal(burning.effects.burn, undefined, 'stacks consumed'); assert.ok(Math.abs(d3 / d0 - 2.05 * (1 + SKILL_FORMULA.burnVulnerability)) < .03, `burn detonation ${d0} → ${d3}`);
});

test('v3.151 Illium: arcane-ratio scaling, basic attacks corrode, corrosion cuts defense/resist/speed, Gravity Core fires five times; self-buff frame carries haste', async () => {
    const { STATUS_TUNING } = await load('game/data/balance.js'); const { fighterSpeed } = await load('game/systems/combat.js');
    const sk = id => SKILLS.find(s => s.id === id);
    assert.equal(sk('crystalShard'), undefined); assert.equal(JOBS.find(j => j.id === 'crystalCaster'), undefined);
    for (const id of ['corrosiveBloom', 'transmute', 'grandTransmutation']) assert.equal(sk(id).scaling, 'arcane', id);
    assert.deepEqual([sk('grandTransmutation').extraAttacks, sk('grandTransmutation').effect, sk('philosopherSalt').basicEffect, sk('saltCatalyst').effect], [4, 'corrode', 'corrode', 'corrode']);
    const base = { hp: 1e6, attack: 100, magic: 300, defense: 200, resist: 200, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 200, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5, arcaneStrike: 1, arcaneRatioBonus: .5 };
    const fighter = (skills, extra = {}) => ({ name: 'A', stats: { ...base, ...extra }, hp: 1e6, mana: 200, skills, cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {} });
    const target = (effects = {}) => ({ name: 'B', stats: { ...base }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects });
    // 마력 평타(기술 없음)가 명중하면 패시브 소울 오브 크리스탈이 부식을 겁니다.
    const t1 = target(); const e1 = []; strike(fighter(['philosopherSalt']), t1, () => 0, e1); assert.equal(t1.effects.corrode, STATUS_TUNING.corrodeTurns); assert.ok(e1[0].statuses.some(s => s.id === 'corrode'));
    // 부식 중에는 받는 피해가 커지고(방어 30% 깎임) 속도가 20% 느려집니다.
    const t2 = target(); strike(fighter([]), t2, () => 0); const plain = 1e6 - t2.hp;
    const t3 = target({ corrode: 2 }); strike(fighter([]), t3, () => 0); const corroded = 1e6 - t3.hp;
    const expect = (100 + 200 * 2) / (100 + 200 * (1 - STATUS_TUNING.corrodeResist) * 2); assert.ok(Math.abs(corroded / plain - expect) < .03, `corroded ${plain} → ${corroded}`);
    assert.ok(Math.abs(fighterSpeed(target({ corrode: 1 })) / fighterSpeed(target()) - (1 - STATUS_TUNING.corrodeSpeed)) < 1e-9);
    // 평타 계수 기준값: 크래프트: 롱기누스 = 마법 × (0.7 + 0.5) × 1.2.
    const t4 = target(); const e4 = []; strike(fighter(['corrosiveBloom']), t4, () => 0, e4); const t5 = target(); strike(fighter([]), t5, () => 0);
    assert.ok(Math.abs((1e6 - t4.hp) / (1e6 - t5.hp) - 1.2) < .03, `arcane scaling ${1e6 - t5.hp} → ${1e6 - t4.hp}`);
    // 그라비티 코어(각성): 본타 + 추가타 4회 = 5타.
    const t6 = target(); const e6 = []; strike(fighter(['grandTransmutation']), t6, () => 0, e6, false, false, { id: 'grandTransmutation', index: 0, count: 1, kind: 'awaken' }); assert.equal(e6[0].hits.length, 5); assert.ok(t6.effects.corrode >= STATUS_TUNING.corrodeTurns, `corroded ${t6.effects.corrode}`);
    // 자기 버프 틀: 옛 가속(effects.haste)은 buffs.haste로 옮겨 속도에 곱하고, 자기 행동마다 1턴씩 줄어듭니다.
    const h = fighter([]); h.effects = { haste: 2 }; assert.ok(Math.abs(fighterSpeed(h) / 10 - (1 + STATUS_TUNING.hasteMultiplier)) < 1e-9); assert.equal(h.effects.haste, undefined); assert.equal(h.effects.buffs.haste.turns, 2);
    strike(h, target(), () => 0); assert.equal(h.effects.buffs.haste.turns, 1); strike(h, target(), () => 0); assert.equal(h.effects.buffs, undefined);
    // selfBuff 기술: 고정값 버프가 전투 능력치에 더해집니다.
    const bsk = { id: 'zzBuffTest', name: '시험 버프', type: 'active', level: 1, chance: 1, cooldown: 3, multiplier: 1, cost: 1, manaCost: 0, damageType: 'magic', selfBuff: { id: 'test', name: '시험', turns: 2, stats: { magic: 300 } } };
    SKILLS.push(bsk);
    try {
        const bf = fighter(['zzBuffTest']); const tb = target(); const eb = []; strike(bf, tb, () => 0, eb); assert.equal(bf.effects.buffs.test.turns, 2); assert.ok(eb[0].statuses.some(s => s.id === 'test' && s.onSelf));
        const tb2 = target(); bf.cooldowns = { zzBuffTest: 3 }; strike(bf, tb2, () => 0); const boosted = 1e6 - tb2.hp; const tb3 = target(); strike(fighter([]), tb3, () => 0); const normal = 1e6 - tb3.hp;
        assert.ok(Math.abs(boosted / normal - 2) < .05, `buffed magic doubles the arcane strike: ${normal} → ${boosted}`);
    } finally { SKILLS.splice(SKILLS.indexOf(bsk), 1); }
});

// v3.169 능력치 수련 패시브의 자세히 보기: 효과 줄 · 다음 강화 · 성장표가 숙련 단계 배율(+25%, 최대 ×2)을 보여 줍니다(전투 계산은 그대로).
test('v3.169 stat training passives: detail view shows the attribute gain per mastery stage, the next-stage hint, and a growing stage table', async () => {
    const { load } = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const P = await load('game/systems/progression.js'), D = await load('game/systems/skill-description.js');
    const sk = SKILLS.find(x => x.id === 'dexDrill1');
    assert.deepEqual([0, 1, 2, 4, 6].map(m => P.effectiveSkill(sk, 1, m).attrBonus.dex), [20, 25, 30, 40, 40], 'display value follows the combat formula, capped at ×2');
    assert.equal(P.effectiveSkill(sk, 3, 0).attrBonus.dex, 20, 'SP ranks do not raise it');
    assert.ok(D.skillEffectLines(P.effectiveSkill(sk, 1, 1), 1).some(line => line.startsWith('기민 +25')), 'effect line names the attribute');
    assert.ok(P.skillRankHint(sk, 1, 0).includes('기민') && P.skillRankHint(sk, 1, 0).includes('+20 → +25'), P.skillRankHint(sk, 1, 0));
    assert.equal(P.skillRankHint(sk, 1, 4), '최대 강화 레벨입니다.');
    assert.deepEqual(D.skillGrowthStages(sk).slice(0, 5).map(r => r.effective.attrBonus.dex), [20, 25, 30, 35, 40], 'stage table grows by mastery stage');
    assert.equal(sk.attrBonus.dex, 20, 'the data itself is untouched');
});
