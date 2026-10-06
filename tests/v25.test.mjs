// v25 ??? 특수 직업: 시계공·시간의 지배자·玄
import { newState, tick, stats, strike, canUse, canChangeJob, effectiveSkill, SKILLS, JOBS, doorsMod as doors, combatFxFromLog, act, jobMasteryTarget, migrateState, assert, test } from './harness.mjs';
const { actTurn } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/combat');
const { skillVeiled, skillBlockReason } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/progression');

const base = { hp: 1000, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 200, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
const fighter = (skills, extra = {}) => ({ name: 'A', job: extra.job, stats: { ...base }, hp: extra.hp ?? 1000, mana: 200, skills, cooldowns: {}, stun: 0, effects: extra.effects || {}, ranks: {}, mastery: extra.mastery || {}, practice: {} });
const target = (extra = {}) => ({ name: 'B', stats: { ...base, hp: 1e6 }, hp: extra.hp ?? 1e6, skills: extra.skills || [], cooldowns: {}, stun: 0, effects: {}, mana: 0 });

test('v25 clockmaker: time machine restores both sides once per battle; mastery opens the chronarch with no door', () => {
    const a = fighter(['timeMachine'], { hp: 10 }), b = target({ hp: 5 });
    const text = strike(a, b, () => 0); assert.match(text, /타임 리와인드/); assert.equal(a.hp, 1000); assert.equal(b.hp, 1e6); assert.ok(a.effects.timeUsed);
    a.hp = 10; strike(a, b, () => 0); assert.equal(a.hp, 10, 'only once per battle');
    const s = newState(0); s.level = 10; s.attributes.dex = 30; s.attributes.int = 30;
    assert.ok(doors.DISCOVERY_DOORS.some(d => d.job === 'clockmaker' && d.test({ playMs: 10 * 3600_000 }) && !d.test({ playMs: 0 })), 'v27.12 the clockmaker opens after ten hours at sea');
    assert.equal(canChangeJob(s, 'chronarch'), false); s.jobMastery.clockmaker = 3000; assert.equal(canChangeJob(s, 'chronarch'), true, 'mastery alone opens the chronarch');
    assert.equal(JOBS.find(j => j.id === 'chronarch').tier, 4);
});

test('v25 chronarch: frozen time always stuns; precede grants an immediate extra action', () => {
    const b = target(); strike(fighter(['frozenTime']), b, () => .99); assert.ok(b.stun >= 2, 'chance 100% stun');
    const a = fighter(['precede']), t = target(), lines = [];
    actTurn(a, t, () => 0, text => lines.push(text)); assert.ok(lines.some(x => /추가 행동/.test(x)) && lines.length >= 2);
});

test('v25 glyphs: alone they hurt, together they cancel; seven glyphs unleash heaven', () => {
    const v = fighter(['glyphVoid']); strike(v, target(), () => 0); assert.equal(v.hp, 1, '虛 alone leaves 1 HP');
    // v25.14 無만 새기면 전투당 1번·회복 없음. 여섯 글자를 모두 새겨야 원래 횟수(6+2/단계)·25% 회복.
    const lone = fighter(['glyphNothing'], { hp: 1 }); const foe = { ...target(), name: 'E', stats: { ...base, attack: 500 } };
    strike(foe, lone, () => .5); assert.equal(lone.hp, 1, '無 alone holds once with no heal'); strike(foe, lone, () => .5); assert.equal(lone.hp, 0, '無 alone has a single charge');
    const me = fighter(['glyphNothing', 'glyphVoid', 'glyphCut', 'glyphBlood', 'glyphBind', 'glyphInstant', 'glyphSoul'], { hp: 1 });
    strike(foe, me, () => .5); assert.equal(me.hp, 251, '無 with all glyphs holds at 1 HP and gives back 25%');
    me.hp = 100; const evs = []; strike(foe, me, () => .5, evs); assert.equal(me.hp, 251, 'lethal damage from any HP leaves 1 + 25%'); assert.deepEqual(evs[0].endured, { heal: 250 }); assert.equal(me.effects.lastStand, 2);
    me.hp = 5; me.effects.dot = { damage: 10, turns: 2, name: '출혈' }; me.cooldowns = { glyphVoid: 9, glyphCut: 9, glyphBlood: 9, glyphBind: 9, glyphInstant: 9, glyphSoul: 9 }; const dotText = strike(me, target(), () => 0); assert.doesNotMatch(dotText, /쓰러짐/); assert.equal(me.hp, 251, 'damage over time is held too'); assert.equal(me.effects.lastStand, 3);
    me.hp = 100; me.effects.lastStand = 6; strike(foe, me, () => .5); assert.equal(me.hp, 0, 'charges are per battle');
    const bind = fighter(['glyphBind']); strike(bind, target(), () => 0); assert.equal(bind.stun, 1, '縛 stuns its user too');
    const bind2 = fighter(['glyphBind', 'glyphInstant']); strike(bind2, target(), () => 0); assert.equal(bind2.stun, 0, '刹 waives the self-stun');
    const glyphs = ['glyphVoid', 'glyphNothing', 'glyphCut', 'glyphBlood', 'glyphBind', 'glyphInstant', 'glyphSoul', 'glyphHeaven'];
    const f = fighter(glyphs, { effects: { seals: ['glyphVoid', 'glyphCut', 'glyphBlood', 'glyphBind', 'glyphInstant'] } }), tb = target();
    f.skills = ['glyphSoul', ...glyphs.filter(x => x !== 'glyphSoul')];
    const text = strike(f, tb, () => 0); assert.match(text, /天/); assert.deepEqual(f.effects.seals, []);
    for (const id of glyphs) assert.ok(SKILLS.find(x => x.id === id).veiled, id);
    assert.equal(effectiveSkill(SKILLS.find(x => x.id === 'glyphCut'), 1, 4).cost, 1, 'mastered glyph actives cost 1 AP');
});

test('v25 glyph chain unlocks one by one and descriptions stay hidden until mastery Lv.1', () => {
    const s = newState(0); s.level = 10; s.job = 'glyphMonk'; s.learned.glyphVoid = 1; s.learned.glyphNothing = 1;
    assert.ok(canUse(s, 'glyphNothing')); assert.equal(canUse(s, 'glyphVoid'), false); assert.match(skillBlockReason(s, 'glyphVoid'), /無 숙련 Lv.1/);
    const sk = SKILLS.find(x => x.id === 'glyphNothing'); assert.ok(skillVeiled(s, sk));
    s.skillPractice.glyphNothing = sk.masteryMilestones[0]; assert.ok(canUse(s, 'glyphVoid')); assert.equal(skillVeiled(s, sk), false);
});

test('v25 heaven fires in the real turn flow and shows up in the structured log', () => {
    const s = newState(0); s.level = 60; s.job = 'glyphMonk'; s.rebirths = 3; s.attributes = { str: 100, dex: 40, int: 20, vit: 60, wis: 16, luk: 0 }; s.running = true;
    const glyphs = ['glyphNothing', 'glyphVoid', 'glyphCut', 'glyphBlood', 'glyphBind', 'glyphInstant', 'glyphSoul', 'glyphHeaven'];
    for (const id of glyphs) { s.learned[id] = 1; s.skillPractice[id] = SKILLS.find(x => x.id === id).masteryMilestones.at(-1); }
    s.skills = glyphs; assert.ok(glyphs.every(id => canUse(s, id)), 'all glyphs usable once mastered');
    s.hp = stats(s).hp; s.mana = stats(s).mana;
    const hp = 5e6, combatStats = { hp, attack: 30, magic: 30, defense: 0, resist: 0, crit: 0, accuracy: 1, evasion: 0, speed: 5, mana: 100, manaRegen: 10 };
    s.enemy = { id: 'minnow', name: '표적', hp, maxHp: hp, attack: 30, defense: 0, exp: 0, gold: 0, boss: false, stun: 0, combatStats, skills: [], cooldowns: {}, effects: {}, mana: 100 };
    let seed = 7; const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    let fired; for (let i = 0; i < 300 && !fired; i++) { tick(s, rng); fired = s.logs.find(l => l.event?.finale); }
    assert.ok(fired, '天 fires within 300 turns against a durable target'); assert.match(fired.text, /天 · 일곱 인 해방/);
    assert.ok(fired.event.hits.some(h => h.kind === 'follow' && h.value > 10000), 'the blast is a separate fixed-damage hit');
    assert.ok(fired.event.statuses.some(st => st.id === 'stun' && st.turns === 2)); assert.ok((s.effects.seals || []).length < 6, 'seals reset after heaven (a later action may seal again)');
    assert.ok(s.hp > 0 && s.deaths === 0, 'with 無 the monk never dies while sealing');
});

test('v25.3 passive-only and independent jobs fight at tier strength', () => {
    // 마법 패시브 직업은 마력 평타가 나가야 합니다(마법 보정이 물리보다 충분히 높음).
    const arcane = id => stats({ ...newState(0), job: id, level: 15 }).arcaneStrike;
    for (const id of ['scholar', 'meditator', 'manaScribe', 'fishWhisperer', 'echoTamer', 'speciesChronicler', 'memoryMerchant', 'coralSaint']) assert.ok(arcane(id) > 0, `${id} should use arcane strikes`);
    // 방어형 독립 직업은 물리 평타를 쓰도록 물리 보정이 마법보다 낮지 않습니다.
    for (const id of ['lifeTender', 'driftwoodHermit', 'chronicleNavigator', 'netWeaver']) { const j = JOBS.find(x => x.id === id); assert.ok(j.attack >= j.magic, id); assert.equal(j.penalties?.attack, undefined, id); }
    const bonus = id => SKILLS.find(x => x.id === id).bonus;
    assert.equal(bonus('axeArm').attack, 30); assert.equal(bonus('bookwise').magic, 30); assert.ok(bonus('bookwise').arcaneRatioBonus > 0);
    assert.equal(bonus('innerBreath').hpRegen, 2); assert.equal(bonus('vital').hpRegen, 2); assert.ok(bonus('flow').arcaneRatioBonus > 0);
    assert.ok(bonus('echoReview').magic >= 24 && bonus('chronicleStudy').attack >= 16 && bonus('serpentFolklore').magic >= 24 && bonus('abyssObservation').attack >= 36);
    // 턴당 체력 회복 패시브가 실제 능력치에 더해집니다.
    const s = newState(0); s.level = 15; s.job = 'noviceMonk'; s.learned.innerBreath = 1; s.skills = ['innerBreath'];
    assert.equal(stats(s).hpRegen, stats({ ...s, skills: [] }).hpRegen + 2);
});

test('v25.3 combat feedback marks heaven for the scene effect and build view pairs the two regens', async () => {
    const { CORE_STATS, DETAIL_STATS } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/progression');
    assert.ok(CORE_STATS.includes('hpRegen') && CORE_STATS.includes('manaRegen') && !DETAIL_STATS.includes('manaRegen'));
    const ev = { actor: 'me', skillId: 'glyphSoul', skillName: '魂', damageType: 'physical', hits: [{ value: 10, critical: false, miss: false }], statuses: [], healed: 0, drained: 0, total: 10, finale: true };
    const fx = combatFxFromLog({ id: 1, type: 'battle', text: '', event: ev }, 'me');
    assert.equal(fx.finale, true); assert.equal(fx.actor, 'player'); assert.match(fx.title, /天/);
    const plain = combatFxFromLog({ id: 2, type: 'battle', text: '', event: { ...ev, finale: undefined, actor: 'foe', chain: 3 } }, 'me');
    assert.equal(plain.finale, undefined); assert.equal(plain.actor, 'enemy'); assert.equal(plain.chain, 3);
});

test('v25.3 passive-route returns: the archivist passive scales with rebirths and the journeyman with mastered jobs', async () => {
    const { masteredJobCount } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/progression');
    // 세계석 기록관 직업은 비전투 그대로지만, 드래곤 링크는 환생마다 자라 어느 직업에서든 쓸 만합니다.
    const a = JOBS.find(j => j.id === 'abyssArchivist'); assert.ok(a.attack < 1 && a.penalties.attack < 0, 'archivist stays a non-combat job');
    const s = newState(0); s.level = 50; s.job = 'harpoon'; s.learned.memoryOfTides = 1; s.skillInheritances.memoryOfTides = true; s.skills = ['memoryOfTides'];
    // 환생 자체의 능력치 보정과 구분하려고 같은 환생 수에서 패시브 유무 차이를 봅니다.
    const gain = (r, k) => stats({ ...s, rebirths: r })[k] - stats({ ...s, rebirths: r, skills: [] })[k];
    assert.ok(gain(5, 'attack') - gain(0, 'attack') >= 25 && gain(5, 'attack') - gain(0, 'attack') <= 30, `+5 per rebirth before job scaling (${gain(5, 'attack') - gain(0, 'attack')})`);
    assert.ok(gain(12, 'hp') - gain(0, 'hp') >= 12 * 18); assert.equal(SKILLS.find(x => x.id === 'memoryOfTides').perCount[0].cap, 12, 'rebirth scaling caps at 12');
    assert.equal(stats({ ...s, rebirths: 3 }).rebirthBonus, 1);
    // 떠돌이 모험가: 숙달 직업 3개에서 발견의 문이 열리고, 패시브는 숙달 직업 수에 비례합니다.
    const j = newState(0); j.level = 10; j.attributes = { str: 10, int: 10, vit: 10, dex: 0, wis: 0, luk: 0 };
    assert.equal(canChangeJob(j, 'journeyman'), false);
    for (const id of ['harpoon', 'tide', 'warden']) j.jobMastery[id] = jobMasteryTarget(JOBS.find(x => x.id === id));
    assert.equal(masteredJobCount(j), 3); assert.equal(canChangeJob(j, 'journeyman'), true);
    act(j, { type: 'job', id: 'journeyman' }, 0); j.skills = ['thousandHands', 'wayfarerKnack'];
    const three = stats(j); j.jobMastery.scholar = jobMasteryTarget(JOBS.find(x => x.id === 'scholar')); j.jobMastery.woodcutter = jobMasteryTarget(JOBS.find(x => x.id === 'woodcutter'));
    const five = stats(j); assert.equal(five.attack - three.attack, 6); assert.equal(five.hp - three.hp, 24); assert.ok(five.speed - three.speed === 1);
    // setSkills: 끌어서 바꾼 순서와 추천 편성을 한 번에 적용. 사용 불가·AP 초과는 거부.
    const k = newState(0); k.level = 10; k.job = 'harpoon'; k.unlockedJobs.push('harpoon'); for (const sk of SKILLS) k.learned[sk.id] = 1;
    const usable = SKILLS.filter(sk => canUse(k, sk.id) && (sk.cost ?? 2) <= 2).map(sk => sk.id); assert.ok(usable.length >= 2);
    act(k, { type: 'setSkills', value: [usable[1], usable[0]].join(',') }, 0); assert.deepEqual(k.skills, [usable[1], usable[0]]);
    assert.throws(() => act(k, { type: 'setSkills', value: 'eternalWave' }, 0));
});

test('v25.4 passive mastery returns: AP -1 at max growth, late-bloomer waypoint passives, journeyman lineage gates', async () => {
    const { maxSkillLevel } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/progression');
    const sk = id => SKILLS.find(x => x.id === id);
    for (const id of ['axeArm', 'vital', 'lullaby', 'driftwoodGuard']) { const m = maxSkillLevel(sk(id)); assert.equal(effectiveSkill(sk(id), 1, m).cost, (sk(id).cost ?? 2) - 1, id); assert.equal(effectiveSkill(sk(id), 1, m - 1).cost, sk(id).cost ?? 2, `${id} before max`); }
    assert.equal(effectiveSkill(sk('glyphNothing'), 1, 4).cost, 0, 'floor at 0'); assert.equal(effectiveSkill(sk('glyphCut'), 1, 4).cost, 1, 'actives unchanged');
    for (const [id, last] of [['titanFieldNotes', 0], ['pearlLedger', 0], ['chronicleStudy', -1], ['serpentFolklore', 0], ['abyssObservation', -1]]) { const m = maxSkillLevel(sk(id)); assert.equal(sk(id).levelEffects.length, m + 1, id); assert.equal(effectiveSkill(sk(id), 1, m).cost, last, id); assert.ok(effectiveSkill(sk(id), 1, 0).cost >= 3, `${id} starts expensive`); }
    assert.equal(effectiveSkill(sk('pearlLedger'), 1, 4).bonus.rebirthBonus, 2);
    // 떠돌이 계보: 숙달 직업 수 관문과 숙달 비례 피해.
    const s = newState(0); s.level = 40; s.attributes = { str: 30, int: 30, vit: 30, dex: 0, wis: 0, luk: 0 }; s.jobMastery.journeyman = 4000; s.unlockedJobs.push('journeyman');
    for (const id of ['harpoon', 'tide', 'warden', 'scholar', 'woodcutter', 'noviceMonk']) s.jobMastery[id] = jobMasteryTarget(JOBS.find(x => x.id === id));
    assert.equal(canChangeJob(s, 'polymath'), false, '6 mastered + journeyman = 7 < 8');
    s.jobMastery.gladiator = jobMasteryTarget(JOBS.find(x => x.id === 'gladiator')); assert.equal(canChangeJob(s, 'polymath'), true);
    act(s, { type: 'job', id: 'polymath' }, 0); assert.equal(s.job, 'polymath');
    const dmg = mastered => { const a = { name: 'A', job: 'polymath', stats: { ...base, masteredPower: mastered }, hp: 1000, mana: 200, skills: ['borrowedForm'], cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {} }, t = target(); strike(a, t, () => 0); return 1e6 - t.hp; };
    assert.ok(dmg(20) > dmg(0) * 1.5 && dmg(20) < dmg(0) * 1.7, `mastered scaling +3% each (${dmg(0)} → ${dmg(20)})`);
    assert.equal(canChangeJob({ ...s, jobMastery: { ...s.jobMastery, polymath: 12000 } }, 'hundredLives'), false, 'needs 15 mastered');
});

test('v25.5 reset passives fire on crit, kill and chain (players only); chained actions tick cooldowns normally', () => {
    const mk = (skills, extra = {}) => ({ name: 'A', job: 'x', stats: { ...base, crit: 0 }, hp: 1000, mana: 200, skills, cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {}, ...extra });
    const sk = id => SKILLS.find(x => x.id === id);
    // 연속 행동도 대기는 1씩만 줄어듭니다(공통 가속 없음).
    const p = mk([]); p.cooldowns = { hook: 3 }; strike(p, target(), () => 0, [], false, true); assert.equal(p.cooldowns.hook, 2);
    // 치명타 초기화: 관중의 환호 + 치명타 100% → 가장 긴 대기 하나만 0.
    const g = mk(['showmanship', 'pierce', 'hook'], { stats: { ...base, crit: 1 } }); g.cooldowns = { pierce: 4, hook: 2 }; const evs = [];
    strike(g, target(), () => 0, evs); assert.deepEqual(evs[0].cooldownReset, [sk('pierce').name]); assert.equal(g.cooldowns.pierce, 0); assert.ok(g.cooldowns.hook > 0);
    // 확률 실패(rng 0.99 ≥ 0.3)면 초기화 없음.
    const g2 = mk(['showmanship'], { stats: { ...base, crit: 1 } }); g2.cooldowns = { pierce: 4 }; let n = 0; strike(g2, target(), () => (n++ ? .99 : 0), []); assert.equal(g2.cooldowns.pierce, 3);
    // 처치 초기화: 전사의 기백은 상대를 쓰러뜨리면 전부.
    const r = mk(['roninGrit', 'iaiDraw', 'pierce']); r.cooldowns = { iaiDraw: 3, pierce: 5 }; const t = target({ hp: 1 }); strike(r, t, () => 0, []); assert.ok(t.hp <= 0); assert.equal(r.cooldowns.iaiDraw, 0); assert.equal(r.cooldowns.pierce, 0);
    // 연속 행동 초기화: 얼티밋 타임은 편성 첫 번째 대기 중인 기술만.
    const c = mk(['chronoSovereign', 'frozenTime', 'precede']); c.cooldowns = { frozenTime: 6, precede: 5 }; strike(c, target(), () => 0, [], false, true); assert.equal(c.cooldowns.frozenTime, 0); assert.equal(c.cooldowns.precede, 4, 'second skill only ticks');
    for (const id of ['showmanship', 'riskDividend', 'nimbleStep', 'chronoSovereign', 'roninGrit']) assert.ok(sk(id).cooldownReset, id);
});

test('v25.5 multicast: chant spells fire together in one action with scaled cooldown and mana; non-multicast loadouts are untouched', () => {
    const sk = id => SKILLS.find(x => x.id === id);
    for (const id of ['twinSpark', 'emberVerse', 'frostLance', 'voidRay', 'stormChant', 'infiniteChant']) assert.ok(sk(id).multicast && sk(id).damageType === 'magic', id);
    const mk = (skills, mana = 200) => ({ name: 'A', job: 'chantNovice', stats: { ...base }, hp: 1000, mana, skills, cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {} });
    // rng 0: 첫 기술 성공 → 두 번째도 성공 → 같은 행동에 두 줄.
    const a = mk(['twinSpark', 'emberVerse', 'hook']), t = target(), lines = [];
    actTurn(a, t, () => 0, (text, ev) => lines.push({ text, ev }));
    const casts = lines.filter(l => l.ev.multicast);
    assert.equal(casts.length, 2, 'two spells in one action'); assert.deepEqual(casts.map(l => l.ev.skillId), ['twinSpark', 'emberVerse']);
    assert.equal(casts[0].ev.multicast.count, 2); assert.equal(casts[1].ev.multicast.index, 1); assert.match(casts[1].text, /동시 시전 2\/2/);
    const twin = sk('twinSpark'), ember = sk('emberVerse');
    assert.equal(a.cooldowns.twinSpark, twin.cooldown + 1, 'cooldown +1 for the extra spell'); assert.equal(a.cooldowns.emberVerse, ember.cooldown + 1);
    assert.equal(a.mana, 200 - Math.ceil(twin.manaCost * 1.35) - Math.ceil(ember.manaCost * 1.35), 'mana ×1.35 each');
    assert.ok(1e6 - t.hp > 0 && casts[1].ev.total > 0, 'both spells dealt damage');
    // 마나가 모자라면 두 번째는 빠집니다.
    const poor = mk(['twinSpark', 'emberVerse'], twin.manaCost), t2 = target(), l2 = [];
    actTurn(poor, t2, () => 0, (text, ev) => l2.push(ev)); assert.equal(l2.filter(ev => ev.multicast).length, 0); assert.equal(l2.length, 1); assert.equal(poor.cooldowns.twinSpark, twin.cooldown);
    // 동시 시전이 아닌 기술은 그대로 하나만.
    const plain = mk(['manaBolt', 'twinSpark']), l3 = [];
    actTurn(plain, target(), () => 0, (text, ev) => l3.push(ev)); assert.equal(l3.length, 1); assert.equal(l3[0].skillId, 'manaBolt');
    // 두 번째 줄은 행동 시작 효과(지속 피해·대기 감소)를 다시 겪지 않습니다.
    const dotted = mk(['twinSpark', 'emberVerse']); dotted.effects = { dot: { name: '출혈', damage: 10, turns: 5 } }; dotted.cooldowns = { hook: 3 }; const l4 = [];
    actTurn(dotted, target(), () => 0, (text, ev) => l4.push(ev)); assert.equal(dotted.hp, 990, 'dot ticks once per action'); assert.equal(dotted.cooldowns.hook, 2);
});

test('v25.6 achievements pay out once with permanent bonuses; daily/weekly goals roll over on KST days and reward on completion', async () => {
    const { ACHIEVEMENTS, achievementTotals } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/achievements');
    const { weekKey, dayKey } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/goals');
    const { apCapacity } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/progression');
    const { syncAchievements, recordGoal } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/progress');
    assert.ok(ACHIEVEMENTS.length >= 40 && new Set(ACHIEVEMENTS.map(a => a.id)).size === ACHIEVEMENTS.length);
    const s = newState(0); s.kills = 1000; s.rebirths = 3; const pearls = s.pearls, ap = apCapacity(s);
    const logs = []; delete s.achievements; syncAchievements(s, t => logs.push(t));
    assert.ok(s.achievements['kills:100'] !== undefined && s.achievements['kills:1000'] !== undefined && s.achievements['rebirths:3'] !== undefined);
    assert.equal(s.pearls, pearls, 'unlocking pays nothing until claimed'); assert.equal(logs.length, 1, 'first sync is one summary line');
    act(s, { type: 'claimAchievement', id: 'kills:100' }, 0); assert.equal(s.pearls - pearls, 1);
    act(s, { type: 'claimAchievement', id: 'all' }, 0); assert.equal(s.pearls - pearls, 1 + 2 + 1 + 3, 'claim all pays the rest once');
    assert.throws(() => act(s, { type: 'claimAchievement', id: 'all' }, 0), /없습니다/);
    s.kills = 20000; syncAchievements(s, t => logs.push(t)); assert.ok(logs.some(t => t.includes('처치 20,000마리')) && logs.some(t => t.includes('일병 진급')), 'kills unlock the kill series and the rank series');
    act(s, { type: 'claimAchievement', id: 'all' }, 0);
    const totals = achievementTotals(s); assert.ok(totals.bonus.attack > 0 && totals.bonus.hp > 0);
    s.abyssBest = 25; syncAchievements(s, () => {}); act(s, { type: 'claimAchievement', id: 'abyss:25' }, 0); assert.equal(apCapacity(s), ap + 1, 'claimed achievement AP raises capacity');
    const plain = stats({ ...s, achievementClaims: {} }), boosted = stats(s); assert.ok(boosted.attack > plain.attack && boosted.hp > plain.hp, 'permanent multipliers apply');
    // 일일 목표: KST 날짜 키로 깔리고 자정에 바뀝니다. 2026-10-02 15:00 UTC = KST 10-03 00:00.
    const noon = Date.UTC(2026, 9, 2, 3), nextDay = Date.UTC(2026, 9, 2, 15);
    assert.equal(dayKey(noon), '2026-10-02'); assert.equal(dayKey(nextDay), '2026-10-03'); assert.equal(weekKey(noon), '2026-W40'); assert.equal(weekKey(Date.UTC(2026, 9, 4, 15)), '2026-W41', 'monday KST starts a new week');
    const g = newState(noon); g.level = 20; g.lastTick = noon; act(g, { type: 'sync' }, noon);
    assert.equal(g.daily.key, '2026-10-02'); assert.equal(g.daily.goals.length, 4); assert.equal(g.weekly.goals.length, 5);
    const before = g.pearls, catchGoal = g.daily.goals.find(x => x.kind === 'catch');
    recordGoal(g, 'catch', undefined, catchGoal.target, () => {}); assert.ok(catchGoal.claimed); assert.equal(g.pearls - before, catchGoal.pearls);
    const weeklyCatch = g.weekly.goals.find(x => x.kind === 'catch'); assert.equal(weeklyCatch.progress, catchGoal.target, 'weekly board advances too');
    act(g, { type: 'sync' }, nextDay); assert.equal(g.daily.key, '2026-10-03'); assert.equal(g.daily.goals.find(x => x.kind === 'catch').progress, 0, 'new day resets'); assert.equal(g.weekly.key, '2026-W40', 'same week keeps weekly progress');
});

test('v27.81 goals reroll once per goal per KST day without duplicating board entries; claimed goals stay', async () => {
    const { sameGoal } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/goals');
    const noon = Date.UTC(2026, 9, 2, 3), nextDay = Date.UTC(2026, 9, 2, 15);
    const g = newState(noon); g.level = 40; g.rebirths = 2; g.lastTick = noon; act(g, { type: 'sync' }, noon);
    const before = g.daily.goals.map(x => ({ ...x })), species = g.daily.goals.find(x => x.kind === 'species');
    species.progress = 7;
    act(g, { type: 'rerollGoal', id: 'daily:species' }, noon);
    const after = g.daily.goals.find(x => x.id === 'species');
    assert.ok(!sameGoal(after, species), 'rerolled goal differs'); assert.equal(after.progress, 0); assert.equal(after.rerolled, '2026-10-02');
    assert.ok(g.daily.goals.every((x, i) => g.daily.goals.findIndex(y => sameGoal(x, y)) === i), 'no duplicate goals on the board');
    assert.equal(g.daily.goals.length, before.length);
    assert.throws(() => act(g, { type: 'rerollGoal', id: 'daily:species' }, noon), /하루에 한 번/);
    const duel = g.daily.goals.find(x => x.id === 'duel'); act(g, { type: 'rerollGoal', id: 'daily:duel' }, noon); assert.ok(g.daily.goals.find(x => x.id === 'duel').optional && !sameGoal(g.daily.goals.find(x => x.id === 'duel'), duel), 'optional flag is kept');
    const weekly = g.weekly.goals.find(x => x.kind === 'catch'); weekly.claimed = true;
    assert.throws(() => act(g, { type: 'rerollGoal', id: 'weekly:catch' }, noon), /달성한 목표/);
    act(g, { type: 'rerollGoal', id: 'weekly:species' }, noon); assert.equal(g.weekly.goals.find(x => x.id === 'species').rerolled, '2026-10-02');
    assert.throws(() => act(g, { type: 'rerollGoal', id: 'weekly:species' }, noon), /하루에 한 번/);
    act(g, { type: 'rerollGoal', id: 'weekly:species' }, nextDay); assert.equal(g.weekly.goals.find(x => x.id === 'species').rerolled, '2026-10-03', 'weekly goals reroll again on the next day');
    assert.throws(() => act(g, { type: 'rerollGoal', id: 'monthly:catch' }, nextDay), /목표판/);
});

test('v27.81 rank and dungeon-mode achievements: rank exp reaches cumulative needs, hell/nightmare clears are recorded per dungeon', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const { ACHIEVEMENTS } = await L.load('data/achievements'), { syncAchievements } = await L.load('systems/progress'), { RANK_CUMULATIVE, RANKS } = await L.load('data/rank');
    const rank = ACHIEVEMENTS.filter(a => a.group === '계급'); assert.ok(rank.length >= 8 && rank.some(a => a.id === 'rank:ltg' && a.target === RANK_CUMULATIVE[RANKS.length - 1]));
    const s = newState(0); s.kills = RANK_CUMULATIVE[1]; syncAchievements(s, () => {}); assert.ok(s.achievements['rank:pvt1'] !== undefined && s.achievements['rank:sgt'] === undefined);
    s.rank = { exp: RANK_CUMULATIVE[3], perks: { tally: 5 } }; syncAchievements(s, () => {}); assert.ok(s.achievements['rank:sgt'] !== undefined && s.achievements['rankPoints:5'] !== undefined, 'rank state wins over kills; spent points count');
    const hell = ACHIEVEMENTS.find(a => a.id === 'hell:1'), nightmareAll = ACHIEVEMENTS.find(a => a.id === 'nightmareAll:3');
    assert.equal(hell.progress(s), 0); s.modeClears = { hell: { grotto: 3 }, nightmare: { grotto: 1, a: 2, b: 1 } };
    assert.equal(ACHIEVEMENTS.find(a => a.id === 'hell:10').progress(s), 3); assert.equal(nightmareAll.progress(s), 3); assert.equal(ACHIEVEMENTS.find(a => a.id === 'nightmare:1').progress(s), 4);
});

test('v25.6 focus cards change exp, gold and mastery for one life; weekly abyss depth is tracked per KST week', async () => {
    const { expMultiplier, goldMultiplier } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/stats');
    const { recordAbyssDepth, abyssWeeklyPearls } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/progress');
    const s = newState(0); s.level = 40; s.rebirths = 1; s.stage = 'reef';
    act(s, { type: 'nextVow', id: 'focus', value: 'stage:reef' }, 0); assert.deepEqual(s.nextVows.focus, { kind: 'stage', id: 'reef' });
    assert.throws(() => act(s, { type: 'nextVow', id: 'focus', value: 'stage:nope' }, 0));
    act(s, { type: 'rebirth' }, 0, () => .5); assert.deepEqual(s.vows.focus, { kind: 'stage', id: 'reef' }, 'card carries into the new life');
    s.stage = 'reef'; const onStage = expMultiplier(s); s.stage = 'brook'; const offStage = expMultiplier(s); assert.ok(Math.abs(onStage / offStage - 1.5) < 1e-9);
    const g = newState(0); g.vows = { focus: { kind: 'gold' } }; assert.ok(Math.abs(goldMultiplier(g) / goldMultiplier({ ...g, vows: {} }) - 2) < 1e-9); assert.ok(Math.abs(expMultiplier(g) / expMultiplier({ ...g, vows: {} }) - .75) < 1e-9);
    act(s, { type: 'nextVow', id: 'focus', value: 'off' }, 0); assert.equal(s.nextVows.focus, undefined);
    const w = newState(0); const mon = Date.UTC(2026, 9, 4, 15); recordAbyssDepth(w, 7, Date.UTC(2026, 9, 2, 3)); assert.deepEqual(w.abyssWeek, { key: '2026-W40', best: 7, dirty: true });
    delete w.abyssWeek.dirty; recordAbyssDepth(w, 5, Date.UTC(2026, 9, 2, 4)); assert.equal(w.abyssWeek.best, 7); assert.equal(w.abyssWeek.dirty, undefined, 'shallower run does not re-upload');
    recordAbyssDepth(w, 3, mon); assert.equal(w.abyssWeek.key, '2026-W41'); assert.equal(w.abyssWeek.best, 3);
    assert.deepEqual([1, 2, 3, 10, 50, 51].map(abyssWeeklyPearls), [30, 20, 15, 8, 3, 1]);
});

const { mergeSlots, slotUnlocked, accountExpGold, accountAP, accountPower, accountMastery, accountCrit, accountBonusRows } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/account');
const { apCapacity } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/progression');
const { researchMastery } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/mastery');
const { expMultiplier: expMul, goldMultiplier: goldMul } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/stats');
test('v27.79 account bonuses are low multiplicative factors (AP unchanged); slot 3 opens at 50 account rebirths', () => {
    const s = newState(0), base = stats(s), ap = apCapacity(s), run = researchMastery(s, 100).total;
    assert.equal(accountExpGold(s), 1); assert.equal(accountAP(s), 0); assert.equal(slotUnlocked(s.account, 2), false, 'no cache → only slot 1');
    const slot = (n, over) => ({ slot: n, name: `n${n}`, job: 'novice', level: 1, rebirths: 0, mastered: [], species: [], bossKills: 0, abyssBest: 0, updatedAt: 0, ...over });
    const merged = mergeSlots(1, [slot(1, { rebirths: 3, mastered: ['a', 'b', 'c'], species: ['x', 'y'], bossKills: 150, abyssBest: 25 }), slot(2, { rebirths: 2, mastered: ['c', 'd', 'e', 'f'], species: ['y', 'z', 'w'], bossKills: 60, abyssBest: 40 })], 5);
    assert.deepEqual([merged.rebirths, merged.mastered, merged.species, merged.bossKills, merged.abyssBest], [5, 6, 4, 210, 40], 'sum, union, union, sum, max');
    assert.equal(slotUnlocked(merged, 2), true); assert.equal(slotUnlocked(merged, 3), false, 'slot 3 needs 50 account rebirths'); assert.equal(slotUnlocked({ rebirths: 50, slots: [slot(1, { rebirths: 50 })] }, 3), true); assert.equal(slotUnlocked(merged, 4), false);
    s.account = merged; const a = stats(s);
    assert.equal(a.expBonus, base.expBonus); assert.ok(Math.abs(accountExpGold(s) - 1.05) < 1e-9 && Math.abs(expMul(s) / expMul({ ...s, account: undefined }) - 1.05) < 1e-9 && Math.abs(goldMul(s) / goldMul({ ...s, account: undefined }) - 1.05) < 1e-9, '5 rebirths → exp/gold ×1.05');
    assert.equal(apCapacity(s), ap + 1, '6 mastered → AP +1'); assert.ok(Math.abs(accountPower(s) - 1.02) < 1e-9); assert.ok(a.attack >= base.attack && a.hp >= base.hp && a.attack / base.attack < 1.06 && a.hp / base.hp < 1.06, 'abyss 40 → about ×1.02 (정수 반올림 포함)');
    assert.ok(Math.abs(accountCrit(s) - 1.02) < 1e-9); assert.ok(Math.abs(a.crit / base.crit - 1.02) < 1e-9, '210 bosses → crit ×1.02'); assert.equal(accountMastery(s), 1, '4 species → no mastery bonus');
    s.account = { ...merged, rebirths: 99, mastered: 100, species: 100, bossKills: 100000, abyssBest: 9999 };
    assert.ok(Math.abs(accountExpGold(s) - 1.3) < 1e-9); assert.equal(accountAP(s), 6); assert.ok(Math.abs(accountPower(s) - 1.05) < 1e-9); assert.ok(Math.abs(accountMastery(s) - 1.07) < 1e-9); assert.ok(Math.abs(accountCrit(s) - 1.1) < 1e-9);
    s.masteryCarry = 0; assert.equal(researchMastery(s, 100).total, run + 7, '×1.07 → mastery +7%');
    assert.ok(accountBonusRows(s).every(r => r.next === '최대' || /최대/.test(r.next)), 'all rows show the cap');
    const t = newState(0); t.account = merged; t.level = 999; act(t, { type: 'rebirth' }, 0); assert.ok(t.rebirths === 1 && t.account === merged, 'account cache survives rebirth');
});

test('v25.7 legend+ enhances to +12, others stop at +10; sale value follows the fish gold curve and refunds 30% of enhancement', async () => {
    const { enhanceMaxFor, saleValue, enhanceCost } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/equipment');
    const { fishGoldAt } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/world');
    assert.equal(enhanceMaxFor({ rarity: 2 }), 15); assert.equal(enhanceMaxFor({ rarity: 3 }), 22); assert.equal(enhanceMaxFor({ rarity: 6 }), 22);
    const s = newState(0); s.gold = 1e9; const hero = { id: 'h', name: 'h', slot: 'coat', rarity: 2, power: 60, level: 30, enhance: 15 }, legend = { id: 'l', name: 'l', slot: 'coat', rarity: 3, power: 90, level: 30, enhance: 20 }; s.inventory = [hero, legend];
    const win = () => 0;
    assert.throws(() => act(s, { type: 'enhance', id: 'h' }, 0, win), /최대 강화/); act(s, { type: 'enhance', id: 'l' }, 0, win); act(s, { type: 'enhance', id: 'l' }, 0, win); assert.equal(legend.enhance, 22); assert.throws(() => act(s, { type: 'enhance', id: 'l' }, 0, win), /최대 강화/);
    assert.equal(saleValue({ rarity: 3, level: 30, power: 90 }), fishGoldAt(30) * 50); assert.equal(saleValue({ rarity: 0, level: 1, power: 2 }), 14);
    let spent = 0; for (let e = 0; e < legend.enhance; e++) spent += enhanceCost({ ...legend, enhance: e }); assert.equal(saleValue(legend), Math.floor(fishGoldAt(30) * 50 + spent * .3), 'enhancement refund 30%');
    assert.ok(saleValue({ rarity: 3, level: 60, power: 200 }) > saleValue({ rarity: 3, level: 30, power: 90 }) * 10, 'late-game sale keeps pace with exponential gold');
    assert.equal(saleValue({ rarity: 0, level: 160, power: 10 }), saleValue({ rarity: 0, level: 65, power: 10 }), 'tier-boosted drop levels stop at the Lv.65 sale cap');
});

test('v25.7 salvage research sells or dismantles all non-relic gear at rebirth with rank efficiency; gold carries into the next life', async () => {
    const { salvageRate } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/economy');
    const { saleValue, dismantleEssence } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/equipment');
    const gear = r => ({ id: `g${r}`, name: 'g', slot: 'coat', rarity: r, power: 40, level: 30 });
    const s = newState(0); s.level = 30; s.inventory = [gear(1), gear(3), { ...gear(2), id: 'relic', relic: 'memoryRod' }]; s.equipment.coat = gear(2);
    assert.throws(() => act(s, { type: 'salvageMode', value: 'dismantle' }, 0), /연구/);
    act(s, { type: 'rebirth' }, 0); assert.equal(s.gold, 100, 'no research → nothing salvaged'); assert.equal(s.inventory.length, 1);
    const t = newState(0); t.level = 35; t.rebirths = 1; t.permanent = { salvage: 1 }; assert.equal(salvageRate(t), .4); t.inventory = [gear(1), gear(3)]; t.equipment.coat = gear(2);
    const expected = Math.floor((saleValue(gear(1)) + saleValue(gear(3)) + saleValue(gear(2)) + saleValue(t.equipment.rod)) * .4); // 시작 무기도 일반 장비라 함께 팝니다.
    act(t, { type: 'rebirth' }, 0); assert.equal(t.gold, 100 + expected, 'sold at 40% into next life gold'); assert.ok(t.logs.some(l => /청산 · 장비 4개 판매/.test(l.text)));
    const u = newState(0); u.level = 40; u.rebirths = 2; u.permanent = { salvage: 5 }; assert.equal(salvageRate(u), 1); u.inventory = [gear(4)]; u.essence = 3;
    act(u, { type: 'salvageMode', value: 'dismantle' }, 0); act(u, { type: 'rebirth' }, 0); assert.equal(u.essence, 3 + dismantleEssence(gear(4)) + 2, 'dismantled at 100% (+ starter rod and coat, 1 essence each)'); assert.equal(u.gold, 100); assert.equal(u.salvageMode, 'dismantle', 'mode survives rebirth');
});

test('v27.86 tide best is recorded per stage (no milestone pearls), variant fish need the tier, abyss 10-floor bonus and AP milestones, abyss-only affixes', async () => {
    const mods = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const { weightedFishId, reward } = await mods.load('systems/encounter'); const { FISH, STAGES } = await mods.load('data/world'); const { rollAffixes, AFFIX_POOL } = await mods.load('data/gear');
    const { apCapacity } = await mods.load('systems/progression'); const { ACHIEVEMENTS } = await mods.load('data/achievements');
    const moon = STAGES.find(st => st.id === 'moon'); assert.ok(STAGES.find(st => st.id === 'reef').fish.includes('stormBarracuda'));
    const r = () => 0.999; assert.notEqual(weightedFishId(moon.fish, r, 0, 0), 'eclipseMoonfish', 'tier 0 never spawns the variant'); assert.ok(moon.fish.includes('eclipseMoonfish'));
    const picks = new Set(); let seed = 3; const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); for (let i = 0; i < 400; i++) picks.add(weightedFishId(moon.fish, rng, 0, 20)); assert.ok(picks.has('eclipseMoonfish'), 'tier 20 spawns it');
    assert.equal(FISH.find(f => f.id === 'stormBarracuda').minTier, undefined, 'v26.6 아이언 호그는 난이도 0부터');
    assert.ok(FISH.find(f => f.id === 'novaManta').minTier === 30 && ACHIEVEMENTS.some(a => a.id === 'tide:50') && ACHIEVEMENTS.some(a => a.id === `codex:${FISH.filter(f => f.id !== 'expNuri').length}`), 'codex excludes the exp nuri so its id stays');
    const foe = (id, boss) => ({ id, name: id, hp: 0, maxHp: 1, attack: 1, defense: 0, exp: 0, gold: 0, boss, stun: 0, combatStats: {}, skills: [], cooldowns: {}, effects: {} });
    const s = newState(0); s.level = 30; s.rebirths = 12; s.stage = 'reef'; s.tide = 12; s.enemy = foe('lionfish', false);
    // v27.86 사냥터 난이도 이정표 세계석은 없앴습니다. 사냥터별 최고 난이도 기록(업적용)만 남습니다.
    reward(s, rng); assert.equal(s.tideBest.reef, 12); assert.ok(!s.logs.some(l => l.text.includes('난이도 이정표')), 'no milestone pearls');
    s.tide = 20; s.enemy = foe('lionfish', false); reward(s, rng); assert.equal(s.tideBest.reef, 20);
    const u = newState(0); u.abyssBest = 29; u.abyssMilestones = []; const ap = apCapacity(u);
    u.dungeon = { id: 'abyss', wave: 4, depth: 30 }; u.enemy = foe('abyssSovereign', true);
    const before = u.pearls; reward(u, rng); assert.equal(u.abyssBest, 30); assert.ok(u.abyssMilestones.includes(30)); assert.equal(apCapacity(u), ap + 1, '30F → AP +1'); assert.ok(u.pearls - before >= 30 + 12, '30F pays floor pearls (4×3) + bonus 30');
    assert.ok(AFFIX_POOL.filter(a => a.onlyOrigin === 'abyss').length === 4);
    for (let i = 0; i < 200; i++) assert.ok(rollAffixes(3, 100, 'temple', rng).every(a => !a.id.startsWith('abyss')), 'abyss-only affixes never roll elsewhere');
    let found = false; for (let i = 0; i < 200 && !found; i++) found = rollAffixes(3, 100, 'abyss', rng).some(a => a.id.startsWith('abyss')); assert.ok(found, 'abyss drops roll abyss-only affixes');
});

test('v25.8 dusk vents stage (rebirth 5) and vent cathedral dungeon (rebirth 8) are wired into profiles, themes, research and logs; rebirth titles', async () => {
    const mods = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const { STAGES, DUNGEONS, FISH } = await mods.load('data/world'); const { profileId } = await mods.load('data/encounters'); const { ORIGIN_THEMES } = await mods.load('data/gear');
    const { REGION_THEMES } = await mods.load('data/book-traits'); const { BOSS_RESEARCH } = await mods.load('data/boss-research');
    const { rebirthTitle } = await mods.load('data/long-term'); const { ACHIEVEMENTS } = await mods.load('data/achievements');
    const st = STAGES.find(x => x.id === 'duskVents'), d = DUNGEONS.find(x => x.id === 'ventCathedral');
    assert.ok(st && st.rebirth === 5 && st.level === 55 && d && d.rebirth === 8 && d.level === 60);
    for (const id of [...st.fish, ...d.fish, d.bossFish]) { assert.ok(FISH.some(f => f.id === id), id); assert.notEqual(profileId(id), undefined); }
    assert.ok(FISH.find(f => f.id === 'ventColossus').boss && ORIGIN_THEMES.duskVents && ORIGIN_THEMES.ventCathedral && REGION_THEMES.duskVents && BOSS_RESEARCH.ventCathedral.sp === 3);
    assert.ok(ACHIEVEMENTS.some(a => a.id === `stages:${STAGES.filter(st => !st.habitat).length}`) && ACHIEVEMENTS.some(a => a.id === `dungeons:${DUNGEONS.filter(d => !d.random).length}`));
    const s = newState(0); s.level = 60; s.rebirths = 4; assert.throws(() => act(s, { type: 'stage', id: 'duskVents' }, 0)); s.rebirths = 5; act(s, { type: 'stage', id: 'duskVents' }, 0); assert.equal(s.stage, 'duskVents');
    assert.throws(() => act(s, { type: 'dungeon', id: 'ventCathedral' }, 0)); s.rebirths = 8; act(s, { type: 'dungeon', id: 'ventCathedral' }, 0); assert.equal(s.dungeon.id, 'ventCathedral');
    assert.equal(rebirthTitle(4), ''); assert.equal(rebirthTitle(5), '되돌아온 모험가'); assert.equal(rebirthTitle(49), '심연을 건넌 자'); assert.equal(rebirthTitle(120), '영원의 모험가');
});

test('v25.11 guild goals scale with members, points formula, weekly stats accumulate and reset by week', async () => {
    const mods = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const { makeGuildGoals, guildPoints, guildGoalProgress, normalizeGuildCode } = await mods.load('data/guild'); const { recordGoal, recordAbyssDepth, guildStatsFor } = await mods.load('systems/progress');
    assert.equal(makeGuildGoals(1)[0].target, 1200, 'solo guild counts as 3 members'); assert.equal(makeGuildGoals(10)[0].target, 4000); assert.equal(makeGuildGoals(20)[1].target, 240); assert.equal(makeGuildGoals(5)[3].target, 20);
    assert.equal(guildPoints({ catches: 100, clears: 2, bosses: 4, abyss: 3, donated: 2500 }), 100 + 40 + 20 + 30 + 2);
    assert.equal(guildGoalProgress(makeGuildGoals(3)[0], { catches: 99999, clears: 0, bosses: 0, abyss: 0, donated: 0 }), 1200, 'progress caps at target');
    assert.equal(normalizeGuildCode(' k7pq-2m '), 'K7PQ2M');
    const s = newState(0); const mon = Date.UTC(2026, 9, 1, 3); s.lastTick = mon;
    recordGoal(s, 'catch', undefined, 5, () => {}); recordGoal(s, 'boss', undefined, 1, () => {}); recordGoal(s, 'dungeon', 'grotto', 1, () => {}); recordAbyssDepth(s, 7, mon);
    assert.deepEqual([s.guildStats.catches, s.guildStats.bosses, s.guildStats.clears, s.guildStats.abyss], [5, 1, 1, 7]);
    s.lastTick = Date.UTC(2026, 9, 8, 3); recordGoal(s, 'catch', undefined, 1, () => {}); assert.equal(s.guildStats.catches, 1, 'new week starts over'); assert.notEqual(guildStatsFor(s, mon).key, guildStatsFor(s, Date.UTC(2026, 9, 8, 3)).key);
});

test('v25.12 duel season keys, tiers, season pearls, optional duel goals excluded from the all-bonus, duel achievements', async () => {
    const mods = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const { monthKey, monthSeason, previousMonthKey, weekSeason, makeGoals } = await mods.load('data/goals'); const { duelTier, duelSeasonPearls, recommendOpponents } = await mods.load('systems/duel');
    const { recordGoal, syncGoals } = await mods.load('systems/progress'); const { ACHIEVEMENTS } = await mods.load('data/achievements');
    assert.equal(monthKey(Date.UTC(2026, 9, 31, 15, 30)), '2026-11', 'KST month'); assert.equal(previousMonthKey('2026-01'), '2025-12'); assert.ok(monthSeason('2026-10') !== weekSeason('2026-W10') && monthSeason('2026-10') > 10_000_000);
    assert.deepEqual([999, 1000, 1200, 1399, 1600, 2500].map(r => duelTier(r).id), ['shell', 'coral', 'pearl', 'pearl', 'abyss', 'abyss']); assert.deepEqual([1, 2, 3, 10, 50, 51].map(duelSeasonPearls), [60, 40, 30, 15, 6, 2]);
    const picks = recommendOpponents([{ id: 'a', rating: 1100 }, { id: 'me', rating: 1000, self: true }, { id: 'b', rating: 1300 }, { id: 'c', rating: 960 }], 1000); assert.deepEqual(picks.map(p => p.id), ['c', 'a'], 'within ±150, closest first, never self');
    const daily = makeGoals({ rebirths: 0, level: 1, peakLevel: 1 }, '2026-10-02', false); const duelGoal = daily.find(g => g.kind === 'duel'); assert.ok(duelGoal && duelGoal.optional && duelGoal.target === 1);
    const s = newState(Date.UTC(2026, 9, 1, 3)); syncGoals(s, Date.UTC(2026, 9, 1, 3)); const pearls = s.pearls;
    for (const g of s.daily.goals) if (!g.optional) { g.progress = g.target - 1; recordGoal(s, g.kind, g.subject, 1, () => {}); }
    assert.ok(s.daily.bonus, 'daily all-bonus pays without the optional duel goal'); const after = s.pearls;
    recordGoal(s, 'duel', undefined, 1, () => {}); assert.equal(s.pearls, after + 1, 'duel goal pays on its own'); assert.ok(s.pearls > pearls);
    assert.ok(ACHIEVEMENTS.some(a => a.id === 'duels:500'));
});

test('v25.14 defense expansion: 11 jobs wired, resist scaling uses ward affinity, salt warden lineage listed', async () => {
    const mods = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const { JOBS, LINEAGES } = await mods.load('data/classes'); const { SKILLS } = await mods.load('data/skills'); const { ACTIVE_SKILL_BALANCE } = await mods.load('data/skill-balance');
    const ids = ['bellWarden', 'eonTurtle', 'worldTurtle', 'holyKnight', 'holyCommander', 'lightOcean', 'saltWarden', 'stillWarden', 'wardKeeper', 'abyssWarder', 'wardDeity'];
    for (const id of ids) { const j = JOBS.find(x => x.id === id); assert.ok(j && j.tree === 'defense', id); assert.ok(SKILLS.filter(sk => sk.job === id).length >= 2, id); }
    for (const sk of SKILLS.filter(sk => ids.includes(sk.job) && sk.type === 'active')) assert.ok(ACTIVE_SKILL_BALANCE[sk.id], sk.id);
    assert.ok(LINEAGES.some(l => l.id === 'saltWarden' && l.tree === 'defense'));
    const s = newState(0); s.level = 40; s.job = 'wardKeeper'; s.learned.wardBurst = 1; s.skills = ['wardBurst']; const a = stats(s); assert.ok(a.wardAffinity > .5, 'ward lineage has high ward affinity'); assert.ok(a.resist > 60, 'Lv.40 ward keeper resist');
    const base = { ...a, hp: 1000, mana: 200, manaRegen: 0, hpRegen: 0, lifesteal: 0, crit: 0, accuracy: 5, evasion: 0 };
    const me = { name: 'A', job: 'wardKeeper', stats: base, hp: 1000, mana: 200, skills: ['wardBurst'], cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {} };
    const foe = () => ({ name: 'T', stats: { ...base, resist: 0, defense: 0, evasion: 0 }, hp: 100000, mana: 0, skills: [], cooldowns: {}, stun: 0, effects: {} });
    const t1 = foe(); strike(me, t1, () => 0); const withWard = 100000 - t1.hp;
    const low = { ...me, stats: { ...base, wardAffinity: .2 }, cooldowns: {} }; const t2 = foe(); strike(low, t2, () => 0); const withoutWard = 100000 - t2.hp;
    assert.ok(withWard > withoutWard, 'resist scaling is multiplied by ward affinity');
});

test('v3.36 door notice server setting is gone: the action is refused and old saves drop the field', () => {
    const s = newState(0); assert.throws(() => act(s, { type: 'doorNotice', value: 'off' }, 0), /지원하지 않는/);
    s.hideDoorNotice = true; migrateState(s, 0); assert.equal('hideDoorNotice' in s, false);
});

test('v25.14 recommended loadout mixes passives and actives within AP', async () => {
    const mods = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const { recommendLoadout } = await mods.load('systems/loadout'); const { SKILLS } = await mods.load('data/skills'); const { JOBS } = await mods.load('data/classes'); const { apUsed, apCapacity, validLoadout } = await mods.load('systems/progression');
    const s = newState(0); s.level = 60; s.rebirths = 3; s.job = 'tideWarGod'; s.unlockedJobs = JOBS.map(j => j.id); for (const sk of SKILLS) s.learned[sk.id] = 1;
    const out = recommendLoadout(s); const types = out.map(id => SKILLS.find(x => x.id === id).type);
    assert.ok(types.includes('passive') && types.includes('active'), `both kinds: ${types.join(',')}`); assert.ok(validLoadout(s, out)); assert.ok(apUsed(s, out) <= apCapacity(s));
    const passiveAP = apUsed(s, out.filter(id => SKILLS.find(x => x.id === id).type === 'passive')); assert.ok(passiveAP >= Math.min(2, apCapacity(s) * .3), 'passives get a real share');
});

test('v25.15 update log keeps only 3-5 entries, newest first; stat confirm setting toggles and survives rebirth', async () => {
    const { UPDATE_LOG } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/update-log');
    assert.ok(UPDATE_LOG.length === 3, `update log has ${UPDATE_LOG.length} entries; keep exactly 3`);
    const nums = UPDATE_LOG.map(e => e.version.split('.').map(Number)); for (let i = 1; i < nums.length; i++) assert.ok(nums[i - 1][0] > nums[i][0] || (nums[i - 1][0] === nums[i][0] && nums[i - 1][1] > nums[i][1]), 'newest first');
    const s = newState(0); assert.ok(!s.skipStatConfirm); act(s, { type: 'statConfirm', value: 'off' }, 0); assert.equal(s.skipStatConfirm, true);
    s.level = 30; act(s, { type: 'rebirth' }, 0); assert.equal(s.skipStatConfirm, true, 'setting is kept across rebirth'); act(s, { type: 'statConfirm', value: 'on' }, 0); assert.equal(s.skipStatConfirm, false);
});

test('v27.27 shop gear resells for at most half its price; old shop items are estimated', async () => {
    const { saleValue } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/equipment');
    for (const level of [30, 60, 90]) {
        const s = newState(0); s.level = level; s.gold = 1e12; s.inventory = [];
        act(s, { type: 'gamble', id: 'rod', value: 10 }, 0);
        assert.equal(s.inventory.length, 10, `Lv.${level} gamble x10`);
        for (const item of s.inventory) { assert.ok(item.paid > 0); assert.ok(saleValue(item) <= item.paid * .5, `Lv.${level} ${item.name} sells ${saleValue(item)} for ${item.paid}`); }
        const legacy = { ...s.inventory[0] }; delete legacy.paid; assert.ok(saleValue(legacy) <= s.inventory[0].paid, `legacy shop- item ${saleValue(legacy)} vs ${s.inventory[0].paid}`);
    }
});

test('v27.27·v27.73 server events come from the admin page only: no code events, admin events apply and a name-only event is a notice', async () => {
    const ev = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/events');
    const at = Date.parse('2026-10-05T12:00:00+09:00');
    assert.deepEqual(ev.SERVER_EVENTS, [], 'v27.73 no coded events; server messages are made on the admin page');
    assert.equal(ev.activeEvent(at), null, 'nothing is live without admin events');
    ev.setRuntimeEvents([{ id: 'admin-test01', name: '주말', from: '2026-10-05T00:00:00+09:00', until: '2026-10-06T00:00:00+09:00', gold: 3 }, { id: 'admin-test02', name: '숨겨진 직업 하나가 개방되었습니다', from: '2026-10-05T00:00:00+09:00', until: '2026-10-06T00:00:00+09:00' }], ['openbeta-exp']);
    const now = ev.activeEvent(at); assert.equal(now.gold, 3, 'admin event applies'); assert.equal(now.exp, 1);
    assert.match(ev.eventLabel(now), /^주말 · 숨겨진 직업 하나가 개방되었습니다 · 골드 ×3 · 10\/6까지$/, 'notice text joins the banner');
    ev.setRuntimeEvents([], []); assert.equal(ev.activeEvent(at), null, 'reset clears admin events');
});

test('v27.28 limit break raises level-table passives (+10%/stage), applies stage-3 AP cut to them, and scales count-based passives', async () => {
    const P = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/progression');
    const obs = SKILLS.find(x => x.id === 'abyssObservation'), max = P.maxSkillLevel(obs);
    const b = P.effectiveSkill(obs, 1, max), l1 = P.effectiveSkill(obs, 1, max + 1), l3 = P.effectiveSkill(obs, 1, max + 3);
    assert.ok(Math.abs(l1.bonus.attack - b.bonus.attack * 1.1) < 1e-9, `stage 1 +10%: ${b.bonus.attack} → ${l1.bonus.attack}`);
    assert.ok(Math.abs(l3.bonus.attack - b.bonus.attack * 1.3) < 1e-9, 'stage 3 +30%');
    const eon = SKILLS.find(x => x.id === 'eonSlumber'), emax = P.maxSkillLevel(eon);
    assert.equal(P.effectiveSkill(eon, 1, emax + 3).cost, P.effectiveSkill(eon, 1, emax).cost - 1, 'level-table passive also gets stage-3 AP -1');
    const knack = SKILLS.find(x => x.id === 'hundredKnacks'), kmax = P.maxSkillLevel(knack), last = P.masteryMilestonesFor(knack).at(-1);
    const s = newState(0); s.level = 100; s.job = knack.job; s.unlockedJobs = [knack.job]; s.learned[knack.id] = 1; s.skills = [knack.id]; s.skillPractice[knack.id] = last;
    s.jobMastery = Object.fromEntries(JOBS.slice(0, 40).map(j => [j.id, 1e9]));
    const before = stats(s).attack; s.limitBreaks = { [knack.id]: 1 }; s.permanent.limitBreak = 1; const after = stats(s).attack;
    assert.ok(after > before, `count passive grows with limit break: ${before} → ${after}`); assert.ok(kmax > 0);
});
test('v27.31 limit break needs the pearl research "한계의 문"; old breaks get it free, and a reset keeps free ranks without refunding them', async () => {
    const G = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const P = await G.load('systems/progression'), M = await G.load('systems/migrations'), C = await G.load('systems/commerce');
    const sk = SKILLS.find(x => x.id === 'hook'), last = P.masteryMilestonesFor(sk).at(-1);
    const s = newState(0); s.sp = 20; s.pearls = 100; s.learned.hook = 1; s.skillPractice.hook = last * 8;
    assert.match(P.limitBreakNext(s, 'hook').reason, /한계의 문.*1단계/);
    act(s, { type: 'permanent', id: 'limitBreak' }, 0); act(s, { type: 'limitBreak', id: 'hook' }, 0); assert.equal(s.limitBreaks.hook, 1);
    assert.match(P.limitBreakNext(s, 'hook').reason, /한계의 문.*2단계/, 'research rank caps the next stage');
    // 연구를 재분배하면 효과는 멈추고 기록은 남습니다(다시 사면 돌아옴).
    const withBreak = P.skillMastery(s, 'hook'); s.permanent.limitBreak = 0; assert.equal(P.skillMastery(s, 'hook'), withBreak - 1); assert.equal(P.limitBreakOwned(s, 'hook'), 1);
    // 이미 2단계를 한 옛 세이브: 연구 2단계를 무료로 받고, 재분배해도 무료 단계는 남고 세계석으로 돌려받지 않습니다.
    const old = newState(0); old.limitBreaks = { hook: 2, net: 1 }; delete old.researchGranted; old.permanent = {};
    assert.equal(M.grantLimitBreakResearch(old), 2); assert.equal(old.permanent.limitBreak, 2); assert.equal(M.grantLimitBreakResearch(old), 0, 'only once');
    assert.equal(C.researchRefund(old, 'utility').refund, 0, 'free ranks are not refundable');
    old.pearls = 100; act(old, { type: 'permanent', id: 'limitBreak' }, 0); const paid = 100 - old.pearls; assert.ok(paid > 0);
    old.running = false; act(old, { type: 'resetResearch', id: 'utility' }, 0); assert.equal(old.pearls, 100, 'refunds only the paid rank'); assert.equal(old.permanent.limitBreak, 2, 'free ranks stay');
});
test('v27.32 swarm cap setting lowers rolled swarm sizes (off = plain fish) and survives rebirth', async () => {
    const V = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/variants');
    const s = newState(0); s.book.perch = 10000; s.skills = [];
    const big = () => .999; // 가장 큰 열린 규모(×100, 무리 감지 없음)
    assert.equal(V.rollSwarmSize(s, 'perch', big), 100, 'no cap by default');
    act(s, { type: 'swarmCap', value: '5' }, 0); assert.equal(s.swarmCap, 5); assert.equal(V.rollSwarmSize(s, 'perch', big), 5, 'capped to x5');
    assert.equal(V.rollSwarmSize(s, 'perch', () => 0), 5, 'small rolls stay');
    act(s, { type: 'swarmCap', value: '0' }, 0); assert.equal(V.rollSwarmSize(s, 'perch', big), 1, 'off → plain fish');
    s.level = 999; act(s, { type: 'rebirth' }, 0); assert.equal(s.swarmCap, 0, 'setting survives rebirth');
    act(s, { type: 'swarmCap', value: '500' }, 0); assert.equal(s.swarmCap, undefined, 'no limit clears the field');
    assert.throws(() => act(s, { type: 'swarmCap', value: '50' }, 0), /무리 최대 규모/);
});

test('v27.34–35 gold curve slows after Lv.40, prices follow it, dungeon exp is normalized, overlevel cuts clear gold, stage enemies capped', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const W = await L.load('data/world'), B = await L.load('data/balance'), M = await L.load('systems/meta'), C = await L.load('systems/commerce'), Eq = await L.load('systems/equipment'), E = await L.load('data/encounters');
    for (const lv of [1, 10, 25, 40]) assert.equal(W.fishGoldAt(lv), Math.round(7 * Math.pow(1.12, lv - 1)), `Lv.${lv} unchanged`);
    assert.ok(W.fishGoldAt(60) < Math.round(7 * Math.pow(1.12, 59)) / 2, 'late fish gold at least halved');
    const s = newState(0); s.level = 30; assert.ok(C.gambleCost(s) >= W.fishGoldAt(30) * 60 && C.shopCost(s) >= W.fishGoldAt(30) * 30, 'shop prices follow fish gold');
    const item = level => ({ id: 'x', slot: 'rod', rarity: 3, level, power: 100, enhance: 0 });
    assert.equal(Eq.enhanceCost(item(40)), Eq.enhanceCost(item(20)), 'no price scaling up to Lv.40');
    assert.ok(Eq.enhanceCost(item(60)) > Eq.enhanceCost(item(40)) * 3, 'Lv.60 gear costs more to enhance');
    const abyss = W.DUNGEONS.find(d => d.id === 'abyss'), boss = W.FISH.find(f => f.id === abyss.bossFish);
    assert.equal(M.dungeonExp(boss, abyss.level, 0, true), Math.round(W.fishExpAt(abyss.level) * B.DUNGEON_TUNING.bossExpFish));
    assert.equal(M.dungeonExp(boss, abyss.level, 80, true), M.dungeonExp(boss, abyss.level, B.DUNGEON_TUNING.rewardTierCap, true), 'abyss depth stops raising exp');
    assert.ok(M.dungeonExp(boss, abyss.level, 80, true) < M.catchReward(boss, 80, true).exp / 10, 'far below the old uncapped boss exp');
    assert.equal(B.dungeonOverlevel(18, 8), 1); assert.equal(B.dungeonOverlevel(30, 8), .7); assert.equal(B.dungeonOverlevel(100, 8), B.DUNGEON_TUNING.overlevelFloor);
    const reef = W.STAGES.find(st => st.id === 'reef'), storm = W.FISH.find(f => f.id === 'stormBarracuda');
    assert.equal(W.stageStatFish(storm, reef.level).level, reef.level + W.STAGE_ENEMY_LEVEL_OVER); assert.ok(W.stageStatFish(storm, reef.level).hp < storm.hp);
    const fish = W.FISH.find(f => f.id === abyss.fish[0]);
    const abyssRef = (await L.load('systems/encounter')).abyssReference();
    assert.ok(E.abyssEnemyStats(fish, abyssRef, 60, { wave: 0 }).speed > E.abyssEnemyStats(fish, abyssRef, 1, { wave: 0 }).speed * 1.9, 'deep Mu Lung floors are faster');
    assert.equal(E.scaledEnemyStats(fish, { tier: 50, wave: 0 }).speed, E.scaledEnemyStats(fish, { tier: 0, wave: 0 }).speed, 'v27.68 the tide in normal dungeons does not add speed');
    // v27.35 무한 심연: 1층 체력 10만에서 층마다 가파르게, 보상은 상한에서 멈춤. 던전 클리어 골드는 권장 레벨 몬스터 몇 마리분.
    const Enc = await L.load('systems/encounter'), ref = Enc.abyssReference();
    assert.equal(E.abyssEnemyStats(fish, ref, 1, { wave: 0 }).hp, B.ABYSS_TUNING.hp);
    assert.ok(E.abyssEnemyStats(fish, ref, 20, { wave: 0 }).hp > B.ABYSS_TUNING.hp * 10 && E.abyssEnemyStats(fish, ref, 20, { wave: 0 }).attack > E.abyssEnemyStats(fish, ref, 1, { wave: 0 }).attack * 4);
    assert.deepEqual(M.dungeonCatchReward(fish, abyss.level, 100, false), M.dungeonCatchReward(fish, abyss.level, B.DUNGEON_TUNING.rewardTierCap, false), 'abyss rewards stop growing');
    const temple = W.DUNGEONS.find(d => d.id === 'temple'); assert.equal(M.dungeonClearBase(temple), W.fishGoldAt(temple.level) * B.DUNGEON_TUNING.clearGoldFish);
});

test('mimic appears at a quarter of the rate during offline catch-up', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const Enc = await L.load('systems/encounter'), Mi = await L.load('data/mimic');
    const roll = Mi.mimicChance(5, 0) * .5; // 온라인이면 등장, 오프라인(¼)이면 미등장
    const make = () => { const s = newState(0); s.level = 20; s.kills = 500; s.stage = 'brook'; s.tide = 5; return s; };
    const on = make(); Enc.spawn(on, () => roll); assert.equal(on.enemy.id, Mi.MIMIC.id);
    const off = make(); off.catchingUp = true; Enc.spawn(off, () => roll); assert.notEqual(off.enemy.id, Mi.MIMIC.id);
});

test('v27.36 high-rarity gear is damped and enhancement gives +10% per level', async () => {
    const Eq = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/equipment');
    const rod = rarity => Eq.itemStats({ id: 'r', slot: 'rod', rarity, power: 100, level: 50, enhance: 10, style: 'physical' }).attack;
    assert.ok(Math.abs(rod(1) - 100 * 2 * 1.4) < 1e-9, '+10 doubles power');
    assert.ok(Math.abs(rod(6) - rod(1) * Eq.GEAR_RARITY_SCALE[6]) < 1e-9, 'primal damped');
    const flat = Eq.itemStats({ id: 'r', slot: 'coat', rarity: 5, power: 100, level: 50, affixes: [{ id: 'might', name: 'm', stat: 'attack', value: 50 }, { id: 'x', name: 'x', stat: 'crit', value: .05 }] });
    assert.ok(Math.abs(flat.attack - 50 * Eq.GEAR_RARITY_SCALE[5]) < 1e-9 && flat.crit === .05, 'flat options damped, percent options untouched');
});
test('v27.43 altar: offering points, tithe, blessing events skip offline catch-up, mimic multiplier', async () => {
    const G = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const A = await G.load('data/altar'), ev = await G.load('data/events'), engine = await G.load('systems/engine');
    assert.equal(A.offeringPoints({ gold: 2999, pearls: 2, essence: 3 }), 2 + 1000 + 90, 'v3.17 pearl 500 · essence 30');
    assert.deepEqual(A.tithe({ gold: 12345, pearls: 9, essence: 30 }), { gold: 1234, pearls: 0, essence: 3 });
    assert.ok(A.GAUGE_IDS.includes('god') && A.BLESSINGS.every(b => A.gaugeCost(b.id) === b.cost));
    const now = Date.parse('2027-01-05T12:00:00+09:00');
    ev.setAltarEvents([{ id: 'altar-mimic', name: '제단 까미의 축복', from: '2026-01-01T00:00:00+09:00', until: new Date(now + 3600_000).toISOString(), mimic: 3, gold: 2 }]);
    try {
        const live = ev.activeEvent(now); assert.equal(live.mimic, 3); assert.equal(live.banner, null, 'altar-only: no event banner');
        const mixed = ev.activeEvent(now, [...ev.currentEvents(), { id: 'x', name: '주말', from: '2026-01-01T00:00:00+09:00', until: '2027-12-31T00:00:00+09:00', exp: 3 }]); assert.equal(mixed.banner.gold, 1); assert.equal(mixed.banner.mimic, 1); assert.ok(mixed.banner.exp >= 3 && mixed.gold === 2); assert.equal(live.gold, 2); assert.match(ev.eventLabel(live), /까미 출현 ×3/);
        assert.equal(ev.activeEvent(now, ev.currentEvents(false)), null, 'altar blessings are not part of the offline settlement list');
        // 오프라인 정산(1분 초과) 동안에는 축복 없이 돌고, 끝난 뒤 다시 적힙니다.
        const s = engine.newState(now - 3600_000); engine.act(s, { type: 'start' }, now - 3600_000); const gold = s.gold;
        const seen = []; const orig = Math.random; let calls = 0; Math.random = () => { calls++; if (calls % 500 === 0) seen.push(s.event?.gold || 1); return orig(); };
        try { engine.advance(s, now); } finally { Math.random = orig; }
        assert.ok(seen.length && seen.every(g => g === 1.5), 'half the altar gold bonus during catch-up (v27.51)');
        assert.equal(s.event.gold, 2, 'blessing shown again after catch-up'); assert.ok(s.gold > gold);
    }
    finally { ev.setAltarEvents([]); }
});
test('v27.43 altar first god matches the Mu Lung floor-50 boss and fights past the 80-turn duel cap', async () => {
    const G = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const D = await G.load('systems/duel'), engine = await G.load('systems/engine'), enc = await G.load('systems/encounter'), A = await G.load('data/altar');
    const god = D.abyssBossSnapshot(A.ALTAR.firstGod.depth);
    const s = engine.newState(0); s.level = 70; s.rebirths = 10; s.dungeon = { id: 'abyss', wave: 4, depth: 50 };
    enc.spawn(s, () => .5);
    assert.equal(god.stats.hp, s.enemy.maxHp); assert.equal(god.stats.attack, s.enemy.attack); assert.equal(god.stats.defense, s.enemy.defense);
    const tank = { ...god, name: '버티는 자', stats: { ...god.stats, attack: 1, magic: 1 }, skills: [] };
    const t0 = performance.now(), r = D.duel(tank, { ...god, stats: { ...god.stats, attack: 1, magic: 1 }, skills: [] }, true, () => .5, A.ALTAR.godMaxTurns);
    assert.equal(r.turns, A.ALTAR.godMaxTurns); assert.equal(r.winner, 'draw'); assert.ok(performance.now() - t0 < 1500, 'a full god fight stays cheap');
});

test('v27.46 maple gear names: drops/shop use set names by style, old save names and affixes are renamed once', async () => {
    const G = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const M = await G.load('data/maple-gear'), mig = await G.load('systems/migrations'), engine = await G.load('systems/engine');
    assert.equal(M.gearName('rod', 6, 'magic'), '제네시스 스태프'); assert.equal(M.gearName('rod', 0), '목검'); assert.equal(M.gearName('charm', 3), '마이스터 링');
    const s = engine.newState(0);
    assert.equal(s.equipment.rod.name, '목검'); assert.equal(s.equipment.coat.name, '하얀 반팔 면티');
    s.equipment.rod.name = '대나무 낚싯대'; s.equipment.coat.name = '낡은 구명조끼';
    s.inventory.push({ id: 'a', slot: 'rod', style: 'balanced', rarity: 4, name: '폭풍 삼지창', power: 10, level: 1, affixes: [{ id: 'drift', name: '유영', stat: 'evasion', kind: 'percent', value: .02 }] },
        { id: 'b', slot: 'charm', rarity: 3, name: '전설 정밀한 조류 나침반', power: 10, level: 1 },
        { id: 'c', slot: 'rod', style: 'balanced', rarity: 3, name: '윤회의 낚싯대', relic: 'memoryRod', power: 45, level: 1, affix: { stat: 'goldBonus', name: '황금 기억', value: .2 } },
        { id: 'd', slot: 'coat', rarity: 2, name: '내가 붙인 이름', power: 5, level: 1 });
    assert.ok(mig.renameMapleGear(s) >= 5);
    assert.deepEqual([s.equipment.rod.name, s.equipment.coat.name, ...s.inventory.map(i => i.name)], ['목검', '하얀 반팔 면티', '앱솔랩스 샤이닝 로드', '마이스터 링', '윤회의 샤이닝 로드', '내가 붙인 이름']);
    assert.equal(s.inventory[0].affixes[0].name, '회피');
    assert.equal(mig.renameMapleGear(s), 0, 'idempotent');
});
test('v27.48 burn: stacks to 3, ticks like poison, adds half of bleed vulnerability, separate from bleed/poison', async () => {
    const G = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const { STATUS_TUNING, SKILL_FORMULA } = await G.load('data/balance');
    const base = { hp: 1e6, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 1000, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const mk = (skills) => ({ name: 'A', stats: { ...base }, hp: 1e6, mana: 1000, skills, cooldowns: {}, stun: 0, effects: {}, ranks: Object.fromEntries(skills.map(id => [id, 1])), mastery: {}, practice: {} });
    const b = mk([]);
    for (let i = 0; i < 5; i++) { const a = mk(['fireball']); strike(a, b, () => 0); }
    assert.equal(b.effects.burn.stacks, STATUS_TUNING.burnMaxStacks, 'caps at 3 stacks');
    assert.equal(b.effects.burn.turns, STATUS_TUNING.burnTurns);
    const fang = mk(['toxicFang']), c = mk([]); strike(fang, c, () => 0); assert.equal(c.effects.burn.stacks, 1); assert.equal(c.effects.poison, undefined);
    // 틱: 화상 중인 쪽이 행동하면 (중첩당 + 체력 비례) × 중첩만큼 깎입니다.
    const before = b.hp, burn = { ...b.effects.burn }; strike(b, mk([]), () => .99);
    assert.ok(before - b.hp >= (burn.perStack + burn.hpTick) * burn.stacks, 'burn ticks on action');
    // 받는 직접 피해: 화상 +6%, 출혈 +12%, 둘 다면 합산.
    const hit = (effects) => { const t = mk([]); t.effects = effects; strike(mk([]), t, () => .5); return 1e6 - t.hp; };
    const plain = hit({}), burned = hit({ burn: { perStack: 0, stacks: 1, turns: 9, hpTick: 0 } });
    assert.ok(Math.abs(burned / plain - (1 + SKILL_FORMULA.burnVulnerability)) < .02, `burn vulnerability ${burned / plain}`);
    assert.ok(SKILL_FORMULA.burnVulnerability < SKILL_FORMULA.bleedVulnerability && SKILL_FORMULA.burnRatio > SKILL_FORMULA.poisonRatio && SKILL_FORMULA.burnRatio < SKILL_FORMULA.bleedRatio, 'between poison and bleed');
});

test('v27.48 altar blessing levels cost x1.5 per level; v27.51 offline settlement gets half the event multipliers', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const A = await L.load('data/altar'), Ev = await L.load('data/events'), T = await L.load('systems/turn');
    const gold = A.BLESSINGS.find(b => b.id === 'gold');
    // v3.16 4~6단계는 절대 비용(골드 3,000억 · 1조 · 3조 상당), 6단계 연장도 6단계 값.
    assert.deepEqual([A.blessingCost(gold, 0, false), A.blessingCost(gold, 1, true), A.blessingCost(gold, 2, true), A.blessingCost(gold, 3, true), A.blessingCost(gold, 4, true), A.blessingCost(gold, 5, true), A.blessingCost(gold, 6, true)], [12000, 24000, 48000, 3e8, 1e9, 3e9, 3e9]);
    assert.equal(A.BLESSING_MAX_LEVEL, 6); assert.ok(A.BLESSINGS.every(b => b.levels.length === 6)); assert.equal(A.blessingEffect(gold, 6).gold, 5); assert.equal(A.ALTAR.maxGold, 1e13);
    // 상위 단계 유지 시간: 4단계 30분 · 5단계 15분 · 6단계 10분, 지나면 3단계로.
    assert.deepEqual([1, 3, 4, 5, 6].map(l => A.blessingLevelMs(1, l) / 60_000), [60, 60, 240, 120, 60]);
    assert.equal(A.blessingJumpCost('gold', 0, 3), 12000 + 24000 + 48000, 'jump 0→3 sums each step'); assert.equal(A.blessingJumpCost('gold', 2, 4), 48000 + 3e8); assert.equal(A.blessingJumpCost('gold', 0, 6), 84000 + 3e8 + 1e9 + 3e9); assert.equal(A.blessingJumpCost('gold', 3, 3), 3e8, 'target at or below live = next step');
    const now = 1_000_000; assert.equal(A.effectiveBlessingLevel({ until: now + 1, level: 6, high_until: now + 1 }, now), 6); assert.equal(A.effectiveBlessingLevel({ until: now + 1, level: 6, high_until: now }, now), 3, 'expired high level falls back to 3'); assert.equal(A.effectiveBlessingLevel({ until: now, level: 6, high_until: now + 1 }, now), 0); assert.equal(A.effectiveBlessingLevel({ until: now + 1, level: 2 }, now), 2);
    assert.equal(A.blessingEffect(gold, 3).gold, 3); assert.ok(A.BLESSINGS.find(b => b.id === 'mimic').cost > A.BLESSINGS.find(b => b.id === 'exp').cost, 'mimic costs most');
    assert.equal(A.gaugeCost('god'), 40000); assert.equal(A.ALTAR.essencePoints, 30); assert.equal(A.ALTAR.pearlPoints, 500);
    // 오프라인 정산: 골드 ×10 이벤트는 정산 중 ×5.5(절반)로 적용됩니다.
    const E = await L.load('systems/engine'), t0 = Date.parse('2030-01-01T00:00:00Z');
    const run = withEvent => { Ev.setRuntimeEvents(withEvent ? [{ id: 'admin-x', name: 'x', from: '2000-01-01T00:00:00Z', until: '2100-01-01T00:00:00Z', gold: 10 }] : [], []); const s = E.newState(t0); E.act(s, { type: 'start' }, t0); s.hp = 1e9; let n = 7; T.advance(s, t0 + 3600_000, () => ((n = (n * 9301 + 49297) % 233280) / 233280)); return s; };
    const on = run(true), off = run(false); Ev.setRuntimeEvents([], []);
    const ratio = (on.gold - 100) / (off.gold - 100); assert.ok(ratio > 5 && ratio < 6, `offline gold x5.5: ${ratio}`); assert.ok(on.kills > 10);
    assert.equal(Ev.offlineEvent({ id: 'e', name: '', until: 0, exp: 2, gold: 1, drop: 3, mastery: 2 }).exp, 1.5);
    assert.ok(on.event && on.event.gold === 10, 'event is set again after settlement');
});
test('v27.51 every final combat stat equals the sum of its shown breakdown rows', async () => {
    const G = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const engine = await G.load('systems/engine'), S = await G.load('systems/stats'), { JOBS } = await G.load('data/classes'), { SKILLS } = await G.load('data/skills'), { FISH } = await G.load('data/world');
    let seed = 11; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 40; i++) {
        const s = engine.newState(0), job = JOBS[Math.floor(r() * JOBS.length)];
        Object.assign(s, { level: 1 + Math.floor(r() * 80), rebirths: Math.floor(r() * 12), job: job.id, unlockedJobs: [job.id] });
        s.skills = SKILLS.filter(k => k.job === job.id || !k.job).map(k => k.id).slice(0, 8);
        for (const k of ['attack', 'hp', 'guard', 'crit', 'evasion', 'magicAttack', 'exp', 'gold', 'drop']) s.permanent[k] = Math.floor(r() * 20);
        for (const f of FISH) if (r() < .5) s.book[f.id] = Math.floor(r() * 20000);
        s.attributes = { str: Math.floor(r() * 200), dex: Math.floor(r() * 200), int: Math.floor(r() * 200), vit: Math.floor(r() * 200), wis: Math.floor(r() * 200), luk: Math.floor(r() * 200) };
        s.jobMastery[job.id] = Math.floor(r() * 100000);
        const trace = {}, a = S.stats(s, trace);
        for (const [k, v] of Object.entries(a)) {
            if (typeof v !== 'number') continue;
            const shown = (trace[k] || []).filter(x => S.STAT_SOURCES.includes(x.source)).reduce((t, x) => t + x.delta, 0);
            if ((trace[k] || []).length || v) assert.ok(Math.abs(shown - v) <= Math.max(1e-6, Math.abs(v) * 1e-6), `${job.id} ${k}: final ${v} vs rows ${shown}`);
        }
    }
});

test('v27.53 drops: 0.25% base, bonus 0.01 = +10%, rare or better, tide drop level capped at player level + 10', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const S = await L.load('systems/stats'), Enc = await L.load('systems/encounter'), E = await L.load('systems/engine'), P = await L.load('data/progression');
    const s = E.newState(0); s.attributes.luk = 0; const base = S.dropRate(s); assert.ok(base >= .0025 && base < .0028, `base ${base} (기본 행운 포함)`);
    s.permanent.drop = 10; assert.ok(Math.abs(S.dropRate(s) - base - .0025) < 1e-9, 'research 10 ranks = +100% of the 0.25% base');
    assert.equal(P.statDisplay('dropBonus', .05), '+50%');
    assert.equal(Enc.dropLevel({ level: 30 }, 25, 10), 40, 'capped at player + 10'); assert.equal(Enc.dropLevel({ level: 30 }, 50, 10), 50, 'never below the source level'); assert.equal(Enc.dropLevel({ level: 30 }, 25, 1), 30);
    const t = E.newState(0); Enc.drop(t, 10, () => 0); assert.equal(t.inventory[0].rarity, 1, 'no common drops');
});
test('v27.57 balance: bleed, poison and burn add about the same damage in real combat (normal and boss HP)', async () => {
    const G = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const C = await G.load('systems/combat'), { SKILLS: list } = await G.load('data/skills');
    const base = { attack: 300, magic: 300, defense: 0, resist: 0, crit: 0, accuracy: 9, evasion: 0, speed: 10, mana: 1e6, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
    const tmpl = list.find(s => s.id === 'fireball');
    for (const hp of [1e4, 1e6]) {
        const dealt = {};
        for (const effect of ['bleed', 'poison', 'burn']) {
            list.push({ ...tmpl, id: 'testDot', effect, dotRatio: undefined, dotName: undefined, chance: 1, cooldown: 0, manaCost: 0, statusOnly: false });
            const a = { name: 'A', stats: { ...base, hp: 1e9 }, hp: 1e9, mana: 1e6, skills: ['testDot'], cooldowns: {}, stun: 0, effects: {}, ranks: { testDot: 1 }, mastery: {}, practice: {} }, idle = { ...a, skills: [], ranks: {} };
            const b = { name: 'B', stats: { ...base, hp }, hp: hp * 1000, skills: [], cooldowns: {}, stun: 0, effects: {}, mana: 0 };
            let r = 0; const rng = () => (r = (r * 9301 + 49297) % 233280) / 233280;
            for (let t = 0; t < 12; t++) { C.strike(t % 2 ? idle : a, b, rng); C.strike(b, idle, rng); }
            dealt[effect] = hp * 1000 - b.hp; list.pop();
        }
        const v = Object.values(dealt); assert.ok(Math.max(...v) / Math.min(...v) <= 1.3, `hp ${hp}: ${JSON.stringify(dealt)}`);
    }
});

test('v27.54 xp needed grows with rebirths and walls off after Lv.70; the Black Mage hits with divine force', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const B = await L.load('data/balance');
    assert.equal(B.xpNeeded(50, 0), B.xpNeeded(50)); assert.ok(Math.abs(B.xpNeeded(50, 10) / B.xpNeeded(50, 0) - 14 / 4) < .01, 'v27.77 rebirth 10 = (4+10)/4'); assert.ok(B.xpRebirthFactor(60) < B.xpRebirthFactor(100) && B.xpRebirthFactor(150) < B.xpRebirthFactor(200), 'keeps growing past the level cap');
    // v3.21 환생 50회·100회 벽, 20회 이후 회당 +0.5.
    assert.equal(B.xpRebirthFactor(49), 4 + 20 + .5 * 29); assert.equal(B.xpRebirthFactor(50), (4 + 20 + .5 * 30) * 8.9); assert.equal(B.xpRebirthFactor(100), (4 + 20 + .5 * 80) * 35);
    assert.ok(B.xpNeeded(69) / B.xpNeeded(68) < 1.1 && B.xpNeeded(80) / B.xpNeeded(69) > 3 && B.xpNeeded(100) / B.xpNeeded(69) > 30, 'v27.77 wall after Lv.70 (1.10/level up to Lv.100)');
    const D = await L.load('systems/duel'), Alt = D;
    const base = { ...D.abyssBossSnapshot(50), name: '검은 마법사' }, god = Alt.divineFirstGod(base);
    assert.equal(god.stats.attack, Math.round(base.stats.attack * 5)); assert.equal(god.stats.penetration, .5);
    assert.equal(Alt.divineFirstGod(god).stats.attack, god.stats.attack, 'applied once');
});

test('v27.55 rebirth level keeps rising after Lv.60 (+1 per rebirth, cap 80); level gates lift from 5 rebirths', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const M = await L.load('systems/meta'), E = await L.load('systems/engine'), W = await L.load('data/world');
    assert.deepEqual([0, 1, 6, 7, 10, 26, 40, 46, 100].map(r => M.rebirthLevel({ rebirths: r })), [30, 35, 60, 61, 64, 80, 94, 100, 100]);
    const high = W.STAGES.filter(st => st.rebirth <= 4).sort((a, b) => b.level - a.level)[0];
    const s4 = E.newState(0); s4.rebirths = 4; assert.throws(() => E.act(s4, { type: 'stage', id: high.id }, 0), /진입/);
    const s5 = E.newState(0); s5.rebirths = 5; E.act(s5, { type: 'stage', id: high.id }, 0); assert.equal(s5.stage, high.id, 'Lv.1 with 5 rebirths enters');
    const gated = W.STAGES.find(st => st.rebirth > 5); if (gated) assert.throws(() => E.act(s5, { type: 'stage', id: gated.id }, 0), 'rebirth gates stay');
});

test('v27.58 exp nuri: shares the mimic roll, high-level stage-only, pays 1~3% of the current level requirement', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const Enc = await L.load('systems/encounter'), Mi = await L.load('data/mimic'), N = await L.load('data/exp-nuri'), B = await L.load('data/balance');
    const make = (level = 80) => { const s = newState(0); s.level = level; s.kills = 5000; s.stage = 'brook'; s.tide = 10; s.running = true; return s; };
    const pm = Mi.mimicChance(10, 0);
    const a = make(); Enc.spawn(a, () => 0); assert.equal(a.enemy.id, Mi.MIMIC.id, 'roll 0 is still the mimic');
    const b = make(); Enc.spawn(b, () => pm + N.nuriChance(10) / 2); assert.equal(b.enemy.id, N.EXP_NURI.id, 'right after the mimic band');
    assert.equal(b.enemy.name, '경험의 누리'); assert.ok(!b.enemy.variant && !b.enemy.swarm, 'no variants');
    const c = make(); Enc.spawn(c, () => pm + N.nuriChance(10) * 1.5); assert.ok(![Mi.MIMIC.id, N.EXP_NURI.id].includes(c.enemy.id), 'past both bands');
    const off = make(); off.catchingUp = true; Enc.spawn(off, () => pm * Mi.MIMIC.offlineScale + N.nuriChance(10) * .5); assert.notEqual(off.enemy.id, N.EXP_NURI.id, 'quarter rate offline');
    for (const lv of [N.EXP_NURI.minLevel - 1, 100]) { const s = make(lv); Enc.spawn(s, () => pm + N.nuriChance(10) / 2); assert.notEqual(s.enemy.id, N.EXP_NURI.id, `not at Lv.${lv}`); }
    const flat = make(); flat.tide = 9; Enc.spawn(flat, () => Mi.mimicChance(9, 0) + N.nuriChance(9) / 2); assert.notEqual(flat.enemy.id, N.EXP_NURI.id, 'v27.59 needs stage difficulty 10');
    const few = make(); few.kills = N.EXP_NURI.minKills - 1; Enc.spawn(few, () => pm + N.nuriChance(10) / 2); assert.notEqual(few.enemy.id, N.EXP_NURI.id, 'needs kills');
    for (const [roll, pct] of [[0, .01], [.8, .02], [.99, .03]]) {
        const s = make(); s.rebirths = 3; s.exp = 0; Enc.spawn(s, () => pm + N.nuriChance(10) / 2); s.enemy.hp = 0;
        const base = Math.floor(s.enemy.exp * (await L.load('systems/stats')).expMultiplier(s));
        Enc.reward(s, () => roll);
        assert.equal(s.exp, base + Math.floor(B.xpNeeded(80, 3, (await L.load('systems/meta')).xpWall(s)) * pct), `tier ${pct}`);
        assert.equal(s.book[N.EXP_NURI.id], 1); assert.ok(s.logs.some(l => l.text.includes('경험의 누리')));
    }
});

test('v27.58 achievements: dungeon group replaces Mu Lung, new series per group with SP +1, old ids kept', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const { ACHIEVEMENTS, ACHIEVEMENT_GROUPS } = await L.load('data/achievements'), { syncAchievements, claimAchievements } = await L.load('systems/progress');
    assert.deepEqual([...ACHIEVEMENT_GROUPS], ['모험', '사냥', '숙련', '던전', '환생', '계급', '강화', '도전']);
    assert.ok(ACHIEVEMENTS.every(a => ACHIEVEMENT_GROUPS.includes(a.group)) && new Set(ACHIEVEMENTS.map(a => a.id)).size === ACHIEVEMENTS.length);
    for (const id of ['abyss:100', 'clears:1', 'dungeons:7', 'bosses:500']) assert.equal(ACHIEVEMENTS.find(a => a.id === id)?.group, '던전', id);
    assert.ok(ACHIEVEMENTS.some(a => a.id === 'codex:47'), 'codex id unchanged by the nuri');
    for (const g of ['모험', '사냥', '숙련', '던전', '도전']) assert.ok(ACHIEVEMENTS.filter(a => a.group === g && a.reward.sp === 1).length >= 3, `${g} has SP +1 rewards`);
    const s = newState(0); syncAchievements(s, () => {});
    s.peakLevel = 70; s.book.expNuri = 1; s.goldenBook = { snail: 100 }; s.gold = 1e10; s.altar = { wins: 1 }; s.turn = 5;
    const sp = s.sp; syncAchievements(s, () => {});
    for (const id of ['level:70', 'nuri:1', 'golden:100', 'gold:10000000000', 'god:1']) assert.ok(s.achievements[id] !== undefined, id);
    claimAchievements(s, 'all'); assert.equal(s.sp - sp, 4, 'level:70 · golden:100 · gold:1e10 · god:1 each give SP +1');
});

test('v27.62 sync log delta: server sends only logs after the client key, client merge rebuilds the exact list', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const D = await L.load('systems/log-delta'), E = await L.load('systems/engine');
    let x = 7; const rng = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
    const s = E.newState(0); E.act(s, { type: 'start' }, 0); E.advance(s, 120_000, rng);
    const json = v => JSON.parse(JSON.stringify(v)), client = json(s.logs); // 클라이언트가 가진 목록(JSON으로 받은 것)
    const firstBefore = s.logs[0].id;
    E.advance(s, 130_000, rng); // 서버에서 로그가 몇 줄 더 쌓이고 앞쪽은 70줄 상한으로 빠짐
    assert.ok(s.logs.length === 70 && s.logs[0].id > firstBefore, 'front logs dropped');
    const cut = D.trimLogs(s.logs, D.logKey(client.at(-1)));
    assert.ok(cut && cut.logs.length < s.logs.length && cut.logs.every(l => l.id > cut.delta.after), 'only newer logs are sent');
    assert.deepEqual(D.mergeLogs(client, json(cut.logs), cut.delta), json(s.logs), 'merge equals the server list');
    assert.equal(D.trimLogs(s.logs, 'nope'), null, 'unknown key → full list');
    assert.equal(D.trimLogs(s.logs, undefined), null);
    const reborn = E.newState(0); assert.equal(D.trimLogs(reborn.logs, D.logKey(client.at(-1))), null, 'restarted numbering → full list');
    const gone = D.trimLogs(s.logs, D.logKey(s.logs.at(-1))); assert.deepEqual(gone.logs, [], 'nothing new');
    assert.deepEqual(D.mergeLogs(s.logs, gone.logs, gone.delta), s.logs);
    assert.deepEqual(D.mergeLogs([], cut.logs, cut.delta), cut.logs, 'missing base → just the new logs');
    E.advance(s, 600_000, rng); assert.equal(D.trimLogs(s.logs, D.logKey(client.at(-1))), null, 'client fell behind the 70-log window → full list');
});

test('v27.63 rebirth history: each rebirth records real/play time, level and pearls; old saves start a partial clock', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const E = await L.load('systems/engine'), M = await L.load('systems/migrations'), Meta = await L.load('systems/meta'), LC = await L.load('systems/actions/lifecycle');
    const H = 3600_000, s = E.newState(0);
    assert.deepEqual(s.lifeStart, { at: 0, playMs: 0 }, 'new saves start the clock at creation');
    s.playMs = 2 * H; s.level = Meta.rebirthLevel(s);
    E.act(s, { type: 'rebirth' }, 5 * H);
    assert.equal(s.rebirthLog.length, 1);
    const r = s.rebirthLog[0];
    assert.deepEqual({ n: r.n, at: r.at, realMs: r.realMs, playMs: r.playMs, level: r.level }, { n: 1, at: 5 * H, realMs: 5 * H, playMs: 2 * H, level: Meta.rebirthLevel(E.newState(0)) });
    assert.ok(r.pearls > 0 && !r.partial);
    assert.deepEqual(s.lifeStart, { at: 5 * H, playMs: 2 * H }, 'next life clock starts at the rebirth');
    LC.breathReset(s, 6 * H); assert.deepEqual(s.lifeStart, { at: 5 * H, playMs: 2 * H }, 'a breath restart is not a rebirth: the clock keeps running');
    for (let i = 0; i < 25; i++) { s.level = Meta.rebirthLevel(s); E.act(s, { type: 'rebirth' }, (7 + i) * H); }
    assert.equal(s.rebirthLog.length, LC.REBIRTH_LOG_KEEP, 'keeps the latest records only');
    assert.equal(s.rebirthLog.at(-1).n, s.rebirths);
    const old = E.newState(0); delete old.lifeStart; old.playMs = 9 * H; M.migrateState(old, 100 * H);
    assert.deepEqual(old.lifeStart, { at: 100 * H, playMs: 9 * H, partial: true }, 'old saves: partial clock from the update');
    old.level = Meta.rebirthLevel(old); E.act(old, { type: 'rebirth' }, 101 * H);
    assert.ok(old.rebirthLog[0].partial && old.rebirthLog[0].realMs === H && !old.lifeStart.partial, 'first measured rebirth is partial, the next life is full');
});

test('v27.64 tide lifts low-stage monster levels toward the top stage (capped by player level) so every stage is similar at high tide', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const W = await L.load('data/world'), Enc = await L.load('systems/encounter');
    const cap = Math.max(...W.STAGES.map(st => st.level)) + W.STAGE_ENEMY_LEVEL_OVER;
    assert.equal(W.tideLiftLevel(1, 0, 90), 1, 'no tide → no lift');
    assert.equal(W.tideLiftLevel(1, W.TIDE_LIFT_TIERS, 200), cap, 'reaches the top-stage level at the lift tier');
    assert.equal(W.tideLiftLevel(1, 40, 200), cap, 'never past the top stage'); assert.equal(cap, 106, 'v3.10 cap = Lv.100 stage + 6');
    assert.equal(W.tideLiftLevel(1, 40, 20), 20, 'never past the player level');
    assert.equal(W.tideLiftLevel(50, 40, 20), 50, 'never lowers a monster');
    assert.equal(W.tideLiftLevel(1, W.TIDE_LIFT_TIERS / 2, 200), Math.round(1 + (cap - 1) / 2), 'halfway at half the lift tier');
    const f = W.FISH.find(x => x.level <= 3), up = W.tideLiftFish(f, W.TIDE_LIFT_TIERS, 200);
    assert.ok(up.level === cap && up.hp > f.hp && up.exp >= f.exp && up.gold >= f.gold, 'stats and rewards follow the lifted level');
    const spawnAt = tide => { const s = newState(0); s.level = 90; s.rebirths = 40; s.kills = 0; s.stage = W.STAGES[0].id; s.tide = tide; Enc.spawn(s, () => .99); return s.enemy; };
    assert.ok(spawnAt(20).maxHp > spawnAt(0).maxHp * 50, 'first stage at high tide is far tougher than before');
});

test('v27.66 exp level-gap cap: monsters more than 10 levels above the player give exp as if they were player level + 10', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const W = await L.load('data/world'), Enc = await L.load('systems/encounter'), Meta = await L.load('systems/meta');
    assert.equal(W.expLevelScale(20, 10), 1, 'within the gap: full exp');
    assert.ok(Math.abs(W.expLevelScale(50, 10) - W.fishExpAt(20) / W.fishExpAt(50)) < 1e-12, 'above the gap: scaled to player level + 10');
    const top = W.STAGES.at(-1), spawnAt = level => { const s = newState(0); s.rebirths = 10; s.level = level; s.kills = 0; s.stage = top.id; s.target = null; s.tide = 0; Enc.spawn(s, () => .5); return s.enemy; };
    const low = spawnAt(1), high = spawnAt(top.level + 6);
    assert.ok(low.exp < high.exp / 100, `Lv.1 in the top stage gets far less exp (${low.exp} vs ${high.exp})`);
    assert.equal(low.gold, spawnAt(1).gold, 'gold is not scaled');
    const d = newState(0); d.rebirths = 10; d.level = 1; d.dungeon = { id: 'abyss', wave: 0, depth: 1 }; Enc.spawn(d, () => .5);
    const d2 = newState(0); d2.rebirths = 10; d2.level = 80; d2.dungeon = { id: 'abyss', wave: 0, depth: 1 }; Enc.spawn(d2, () => .5);
    assert.ok(d.enemy.exp < d2.enemy.exp, 'dungeons too');
    void Meta;
});

test('v27.67 lift completes at the mimic tide, and lifted monsters are normalized by the stage average reward multiplier', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const W = await L.load('data/world'), Mi = await L.load('data/mimic');
    assert.equal(W.TIDE_LIFT_TIERS, Mi.MIMIC.minTier, 'every stage is fully lifted where the mimic starts appearing');
    const neon = W.STAGES.find(st => st.fish.every(id => (W.FISH.find(f => f.id === id).rewardMultiplier || 1) > 1));
    assert.ok(neon, 'a rare-only stage exists');
    assert.equal(W.stageRewardNorm(neon.fish, 0), 1, 'no tide → no normalization');
    const full = W.stageRewardNorm(neon.fish, W.TIDE_LIFT_TIERS), rows = neon.fish.map(id => W.FISH.find(f => f.id === id)).filter(f => !(f.minTier > W.TIDE_LIFT_TIERS));
    const avg = rows.reduce((a, f) => a + (f.spawnWeight ?? 1) * (f.rewardMultiplier || 1), 0) / rows.reduce((a, f) => a + (f.spawnWeight ?? 1), 0);
    assert.ok(Math.abs(full * avg - 1) < 1e-9, 'stage average becomes ×1 at full lift');
    const plain = W.STAGES.find(st => st.fish.every(id => (W.FISH.find(f => f.id === id).rewardMultiplier || 1) === 1));
    assert.equal(W.stageRewardNorm(plain.fish, 30), 1, 'stages of common monsters are untouched');
});

test('v27.69 monsters get level-based penetration and the ward: bosses/Lv.50+ cleanse and go immune when afflicted', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const E = await L.load('data/encounters'), B = await L.load('data/balance'), C = await L.load('systems/combat'), W = await L.load('data/world');
    const low = W.FISH.find(f => f.level <= 5), high = W.FISH.find(f => f.level >= 55 && !f.boss), boss = W.FISH.find(f => f.boss);
    assert.ok(E.enemyStats(low).penetration < .03 && E.enemyStats(high).penetration > .15, 'penetration grows with level');
    assert.equal(E.enemyStats(high, true).penetration, Math.min(B.MONSTER_TUNING.penCap, high.level * B.MONSTER_TUNING.penPerLevel) + B.MONSTER_TUNING.penBoss, 'bosses add more');
    assert.ok(E.enemyStats({ ...high, level: 200 }).penetration <= B.MONSTER_TUNING.penCap + B.MONSTER_TUNING.penBoss, 'capped');
    assert.ok(!E.foeSkills(low.id, low.level).includes('foeWard') && E.foeSkills(high.id, high.level).includes('foeWard') && E.foeSkills(boss.id, boss.level, true).includes('foeWard') && E.foeSkills(high.id, 20, true).includes('foeWard'), 'ward on bosses and Lv.50+');
    assert.deepEqual(E.foeSkills(low.id, 3), [], 'under Lv.5: no skills');
    // 각성: 상태이상이 있을 때만 쓰고, 정화 + 3턴 면역
    const base = { hp: 10000, attack: 100, defense: 10, mana: 100 };
    const foe = { name: '적', stats: base, hp: 10000, skills: ['foeWard'], cooldowns: {}, stun: 0, mana: 100, effects: { dot: { turns: 3, perTurn: 10 }, poison: { stacks: 2, turns: 3, perStack: 5 } } };
    const target = { name: '나', stats: base, hp: 10000, skills: [], cooldowns: {}, stun: 0, mana: 100, effects: {} };
    const text = C.strike(foe, target, () => 0);
    assert.ok(/정화/.test(text) && /면역 3턴/.test(text), `ward used when afflicted: ${text}`);
    assert.ok(!foe.effects.dot && !foe.effects.poison && foe.effects.immune.bleed === 3 && foe.effects.immune.stun === 3, 'cleansed and immune');
    const calm = { ...foe, cooldowns: {}, effects: {} };
    assert.ok(!/정화/.test(C.strike(calm, target, () => 0)), 'not used without an affliction');
    assert.ok(E.enemyStats(boss, true).penetration > 0, boss.id);
});

test('v27.73 skill pins and hidden skills live in the save: toggles, mutual exclusion, list import, and they survive rebirth, SP refund and a life restart', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame(), { restartLife } = await L.load('systems/actions/lifecycle');
    const s = newState(0);
    assert.equal(s.skillPins, undefined, 'a save that never pinned has no list (the screen migrates browser pins only then)');
    act(s, { type: 'pinSkill', id: 'hook' }, 0); assert.deepEqual(s.skillPins, ['hook']);
    act(s, { type: 'hideSkill', id: 'hook' }, 0); assert.deepEqual(s.skillHidden, ['hook']); assert.deepEqual(s.skillPins, [], 'hiding drops the pin');
    act(s, { type: 'pinSkill', id: 'hook' }, 0); assert.deepEqual(s.skillPins, ['hook']); assert.deepEqual(s.skillHidden, [], 'pinning drops the hide');
    act(s, { type: 'pinSkill', id: 'hook' }, 0); assert.deepEqual(s.skillPins, [], 'toggle off');
    assert.throws(() => act(s, { type: 'hideSkill', id: 'nope' }, 0), /없는 스킬/); assert.throws(() => act(s, { type: 'pinSkill', id: '' }, 0), /없는 스킬/);
    act(s, { type: 'hideSkill', id: 'pierce' }, 0);
    act(s, { type: 'pinSkill', value: 'hook, pierce,hook,bogus' }, 0); assert.deepEqual(s.skillPins, ['hook', 'pierce'], 'import: known ids, deduplicated'); assert.deepEqual(s.skillHidden, [], 'imported pins leave the hidden list');
    act(s, { type: 'hideSkill', id: 'pierce' }, 0); assert.deepEqual(s.skillPins, ['hook']); assert.deepEqual(s.skillHidden, ['pierce']);
    act(s, { type: 'resetSkills' }, 0); assert.deepEqual([s.skillPins, s.skillHidden], [['hook'], ['pierce']], 'SP refund keeps marks');
    s.level = 60; act(s, { type: 'rebirth' }, 0, () => .5); assert.deepEqual([s.skillPins, s.skillHidden], [['hook'], ['pierce']], 'rebirth keeps marks');
    restartLife(s, 0); assert.deepEqual([s.skillPins, s.skillHidden], [['hook'], ['pierce']], 'admin life restart keeps marks');
    assert.equal(canUse(s, 'hook'), true, 'hiding never changes usability');
});

test('v27.70 dungeon modes: normal/hell/nightmare tiers, entry value parsing, repeat keeps the mode, Mu Lung ignores it', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const B = await L.load('data/balance'), M = await L.load('systems/meta'), DR = await L.load('systems/dungeon-run');
    assert.deepEqual(B.DUNGEON_MODES.map(m => [m.id, m.tier]), [['normal', 0], ['hell', 50], ['nightmare', 200]]);
    const s = newState(0); s.rebirths = 10; s.level = 60; s.tide = 30;
    assert.deepEqual(DR.parseDungeonValue(s, 'caldera', 'hell@fail'), { mode: 'hell', repeat: { left: null } });
    assert.deepEqual(DR.parseDungeonValue(s, 'caldera', 'fail'), { mode: 'normal', repeat: { left: null } });
    assert.deepEqual(DR.parseDungeonValue(s, 'caldera', 'nightmare@once'), { mode: 'nightmare', repeat: undefined });
    assert.equal(DR.parseDungeonValue(s, 'abyss', 'hell@deeper:3').mode, 'normal', 'Mu Lung has no modes');
    assert.throws(() => DR.parseDungeonValue(s, 'caldera', 'ultra@fail'), /난이도/);
    act(s, { type: 'dungeon', id: 'caldera', value: 'nightmare@5' }, 0);
    assert.equal(s.dungeon.mode, 'nightmare'); assert.equal(M.encounterTier(s), 200, 'mode tier, not the stage tide (30)');
    assert.equal(M.dungeonLevelAt({ id: 'caldera', level: 26 }, M.encounterTier(s), 60), 60, 'nightmare lifts monsters to the player level');
    DR.continueRepeat(s, 'caldera', s.dungeon.repeat); assert.equal(s.dungeon.mode, 'nightmare', 'repeat keeps the mode');
    const n = newState(0); n.rebirths = 10; n.level = 60; act(n, { type: 'dungeon', id: 'caldera', value: 'fail' }, 0);
    assert.equal(n.dungeon.mode, undefined); assert.equal(M.encounterTier(n), 0, 'normal = tier 0 even at stage tide 0');
    const a = newState(0); a.rebirths = 10; a.level = 60; act(a, { type: 'dungeon', id: 'abyss', value: 'hell@once' }, 0);
    assert.equal(M.encounterTier(a), (a.dungeon.depth || 1) + 2, 'Mu Lung keeps the floor formula');
});

test('v27.70 the first god is the Mu Lung 50F boss with divinity (HP 9.3억, attack ×5, 50% penetration), and the throne copy is the holder as is', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const Du = await L.load('systems/duel'), A = await L.load('data/altar'), Alt = await L.load('server/altar').catch(() => null);
    const boss = Du.abyssBossSnapshot(A.ALTAR.firstGod.depth).stats, god = Du.divineFirstGod({ ...Du.abyssBossSnapshot(A.ALTAR.firstGod.depth), name: A.ALTAR.firstGod.name });
    assert.ok(boss.hp > 9e8 && boss.hp < 1e9, `50F boss HP ${boss.hp}`);
    assert.equal(god.stats.hp, boss.hp); assert.equal(god.stats.attack, Math.round(boss.attack * A.ALTAR.firstGod.attack)); assert.equal(god.stats.penetration, A.ALTAR.firstGod.penetration);
    assert.ok(god.skills.includes('foeWard'), 'the god wards against status effects');
    if (Alt) {
        const first = Alt.nextGod({ throne_snapshot: '', throne_name: '' });
        assert.deepEqual({ hp: first.stats.hp, attack: first.stats.attack, pen: first.stats.penetration, name: first.name }, { hp: god.stats.hp, attack: god.stats.attack, pen: .5, name: A.ALTAR.firstGod.name }, 'summoned god = intended numbers');
        const holder = { name: '왕', level: 80, job: 'x', rebirths: 10, stats: { hp: 10000, attack: 1000, magic: 500, defense: 100 }, skills: [], power: 1, rating: 1000 };
        const copy = Alt.nextGod({ throne_snapshot: JSON.stringify(holder), throne_name: '왕' });
        assert.deepEqual([copy.stats.hp, copy.stats.attack, copy.stats.magic, copy.name, copy.skills], [10000, 1000, 500, '신이 된 왕', []], 'impeach opponent = throne holder as is (no godhood)');
    }
});

test('v27.70 nuri blessing: an altar gauge that multiplies the exp nuri spawn chance like the mimic blessing', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const A = await L.load('data/altar'), ev = await L.load('data/events'), Enc = await L.load('systems/encounter'), Mi = await L.load('data/mimic'), N = await L.load('data/exp-nuri');
    const b = A.BLESSINGS.find(x => x.id === 'nuri');
    assert.ok(b && A.GAUGE_IDS.includes('nuri') && A.blessingEffect(b, 1).nuri === 3 && A.blessingEffect(b, 3).nuri === 5 && /누리 출현 ×3/.test(A.blessingDesc(b, 1)));
    const now = Date.now();
    ev.setAltarEvents([{ id: 'altar-nuri', name: '', from: '2026-01-01T00:00:00+09:00', until: new Date(now + 3600_000).toISOString(), nuri: 3 }]);
    try {
        const live = ev.activeEvent(now); assert.equal(live.nuri, 3); assert.equal(live.mimic, 1);
        const make = () => { const s = newState(0); s.level = 80; s.kills = 5000; s.stage = 'brook'; s.tide = 10; s.running = true; s.event = live; return s; };
        const pm = Mi.mimicChance(10, 0), roll = pm + N.nuriChance(10) * 2; // 축복 없이는 누리 구간 밖, ×3이면 안
        const on = make(); Enc.spawn(on, () => roll); assert.equal(on.enemy.id, N.EXP_NURI.id, 'blessing triples the nuri band');
        const off = make(); off.event = null; Enc.spawn(off, () => roll); assert.notEqual(off.enemy.id, N.EXP_NURI.id);
        assert.ok(/누리 출현 ×3/.test(ev.eventLabel({ ...live, name: '테스트' })));
    } finally { ev.setAltarEvents([]); }
});

test('v27.71 evasion: non-dex sources are capped at 60%p raw, dex evasion stacks on top before the soft cap', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const LT = await L.load('data/long-term'), St = await L.load('systems/stats'), Sk = await L.load('data/skills');
    assert.equal(LT.EVASION_SOURCE_CAP, .6);
    const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`); near(LT.evasionRaw(0, 1.4), .6); near(LT.evasionRaw(.7, 1.4), 1.3); near(LT.evasionRaw(.7, .1), .8); near(LT.evasionRaw(0, -.05), -.05);
    const passives = Sk.SKILLS.filter(k => k.type === 'passive' && k.bonus?.evasion && !k.song && !k.rebirth && !k.unlockAfter).sort((a, b) => b.bonus.evasion - a.bonus.evasion).slice(0, 12);
    // 계승한 스킬은 레벨·직업 조건 없이 장착되므로 1레벨 캐릭터에 회피 패시브를 잔뜩 끼운 상황을 그대로 만듭니다.
    const wear = (s) => { s.skills = passives.map(k => k.id); for (const k of passives) { s.learned[k.id] = 1; s.skillInheritances[k.id] = true; if (k.unlockJobMastery) s.jobMastery[k.job] = k.unlockJobMastery; } return s; };
    const dex0 = 5 * .0015, low = wear(newState(0)), lowEv = St.stats(low).evasion, lowRaw = passives.reduce((n, k) => n + k.bonus.evasion, 0);
    assert.ok(lowRaw > .6, `the passive stack exceeds the cap raw (${lowRaw})`);
    assert.ok(Math.abs(lowEv - LT.evasionRating(dex0 + .6)) < 1e-9 && lowEv < .6, `level 1 passive stack ${lowEv} = rating(cap + base dex)`);
    const dexOnly = newState(0); dexOnly.level = 94; dexOnly.attributes.dex = 470; const dexEv = St.stats(dexOnly).evasion;
    const both = wear(newState(0)); both.level = 94; both.attributes.dex = 470; const bothEv = St.stats(both).evasion;
    assert.ok(dexEv > lowEv && bothEv > dexEv, `dex ${dexEv} beats passive-only ${lowEv}; both ${bothEv}`);
    assert.ok(Math.abs(bothEv - LT.evasionRating(dex0 + 470 * .0015 + .6)) < 1e-9, 'dex stacks on top of the capped passive sum');
});

test('v27.75 hits record the computed damage: text and FX show it, value/HP bar/recoil keep the actual HP removed', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame(), C = await L.load('systems/combat'), FB = await L.load('systems/combat-feedback');
    const base = { hp: 1000, attack: 5000, defense: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 200, manaRegen: 0 };
    const mk = (skills, extra = {}) => ({ name: 'A', job: 'x', stats: { ...base }, hp: 1000, mana: 200, skills, cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {}, ...extra });
    const b = { ...mk([]), name: 'E', hp: 30 }, events = [];
    const text = C.strike(mk([]), b, () => .99, events);
    const ev = events[0], hit = ev.hits[0];
    assert.equal(b.hp, 0); assert.equal(hit.value, 30, 'value = HP actually removed'); assert.equal(hit.raw, 5000, 'raw = computed damage'); assert.equal(ev.total, 5000);
    assert.match(text, /→ 5000 물리 피해/, 'the log shows the computed damage'); assert.equal(C.shownHit(hit), 5000);
    const fx = FB.combatFxFromLog({ id: 1, type: 'battle', text, event: ev }, 'A'); assert.equal(fx.hits[0].value, 5000, 'FX number shows the computed damage');
    const small = { ...mk([]), name: 'E', hp: 30 }; C.strike({ ...mk([]), stats: { ...base, attack: 20 } }, small, () => .99, events);
    assert.equal(events[1].hits[0].raw, undefined, 'raw is only written when it differs'); assert.equal(events[1].total, 20);
    // 반동(글자 斬)은 실제로 깎인 체력에 비례합니다: 체력 30인 적을 크게 때려도 자해는 30 × 반동률.
    const cutter = mk(['glyphCut'], { ranks: { glyphCut: 1 } }), prey = { ...mk([]), name: 'E', hp: 30 }, evs = [];
    C.strike(cutter, prey, () => 0, evs); const dealt = evs[0].hits.reduce((n, h) => n + h.value, 0);
    assert.ok(evs[0].skillId === 'glyphCut' && dealt === 30, `glyphCut landed for ${dealt}`); assert.equal(cutter.hp, 1000 - Math.floor(30 * .5), 'recoil uses the actual HP removed');
});

test('v27.76 tide loot: rarity weights drift up conservatively with tier, essence drops on stages from tier 5', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const Enc = await L.load('systems/encounter'), B = await L.load('data/balance');
    const near = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
    near(Enc.rarityShareFrom(0, 6), .006); near(Enc.rarityShareFrom(100, 6), .0102, 5e-4); near(Enc.rarityShareFrom(100, 3), .299, 5e-3);
    assert.deepEqual(Enc.rarityWeights(0, 1).slice(0, 2), [0, .25]); assert.equal(Enc.rollRarity(() => .99999, 1, 200), 6); assert.equal(Enc.rollRarity(() => 0, 1, 200), 1);
    assert.deepEqual(Enc.tideEssence(4), { chance: 0, amount: 0 }); assert.deepEqual(Enc.tideEssence(10), { chance: .03, amount: 2 }); assert.deepEqual(Enc.tideEssence(30), { chance: .09, amount: 4 });
    const make = (tide, dungeon) => { const s = newState(0); s.rebirths = 40; s.tide = tide; s.running = true; s.stage = 'brook'; if (dungeon) s.dungeon = { id: 'grotto', wave: 0 }; s.enemy = { id: 'minnow', name: 't', hp: 1, maxHp: 1, attack: 0, defense: 0, exp: 1, gold: 1, boss: false, stun: 0 }; return s; };
    // rng 0 → 정수 드롭 판정 성공(황금 개체 확률 0이면 그 난수는 쓰지 않음), 드롭 확률 판정은 0이면 드롭이라 장비도 하나 떨어집니다.
    const hit = make(30); Enc.reward(hit, () => 0); assert.equal(hit.essence, 4, 'tide 30 drops 4 essence'); assert.ok(hit.logs.some(l => /정수 \+4/.test(l.text)));
    const miss = make(30); Enc.reward(miss, () => .5); assert.equal(miss.essence, 0);
    const low = make(4); Enc.reward(low, () => 0); assert.equal(low.essence, 0, 'below tier 5 nothing');
    const dun = make(30, true); dun.dungeon.mode = 'hell'; Enc.reward(dun, () => 0); assert.equal(dun.essence, 0, 'dungeons do not drop tide essence');
    assert.equal(B.BALANCE.tideLoot.rarityPerTier, .0014);
});

test('v27.78 heal after kill keeps falling with tide; stageField matches spawn; starfall reward multipliers normalized', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const Enc = await L.load('systems/encounter'), W = await L.load('data/world');
    const at = tide => Enc.victoryHealRate({ ...newState(0), rebirths: 5, tide }); // v27.89 새싹 보조(+5%p)를 뺀 기본 곡선
    assert.ok(Math.abs(at(0) - .2) < 1e-9 && Math.abs(at(10) - .1) < 1e-9 && Math.abs(at(30) - .05) < 1e-9 && Math.abs(at(200) - .02) < 1e-9, `heal ${at(0)} ${at(10)} ${at(30)} ${at(200)}`);
    const s = newState(0); s.level = 60; s.rebirths = 10; s.tide = 10; s.stage = 'wreck'; s.running = true; s.kills = 0; s.target = 'shark';
    Enc.spawn(s, () => .5); const live = Enc.stageField(s, 'wreck', 'shark', 10);
    assert.equal(s.enemy.id, 'shark'); assert.deepEqual([s.enemy.maxHp, s.enemy.attack, s.enemy.exp, s.enemy.gold], [live.foe.hp, live.foe.attack, live.exp, live.gold], 'codex preview equals the spawned foe');
    assert.ok(live.level > 22 && live.level <= 60, `lifted level ${live.level}`);
    const star = W.STAGES.find(x => x.id === 'starfall').fish.map(id => W.FISH.find(f => f.id === id));
    const avg = star.reduce((a, f) => a + (f.spawnWeight ?? 1) * (f.rewardMultiplier || 1), 0) / star.reduce((a, f) => a + (f.spawnWeight ?? 1), 0);
    assert.ok(avg < 1.35, `starfall weighted reward multiplier ${avg}`);
});

test('v27.80 regional book: research 5·6 need 250k/500k kills (stage 6 also difficulty 50), region research stacks per region, records survive rebirth', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const W = await L.load('data/world'), Bk = await L.load('systems/book'), P = await L.load('systems/progression'), St = await L.load('systems/stats'), E = await L.load('systems/encounter');
    const s = newState(0);
    s.book.minnow = 249999; assert.equal(Bk.bookStage(s, 'minnow'), 4);
    s.book.minnow = 250000; assert.equal(Bk.bookStage(s, 'minnow'), 5, 'v27.81 stage 5 needs kills only');
    s.bookTier = { minnow: 20 };
    s.book.minnow = 500000; assert.equal(Bk.bookStage(s, 'minnow'), 5, 'stage 6 needs difficulty 50');
    s.bookTier.minnow = 50; assert.equal(Bk.bookStage(s, 'minnow'), 6);
    s.bookClaims = { minnow: 4 }; assert.deepEqual(P.bookPending(s, 'minnow').ranks, [4, 5]);
    // 난이도 기록: 처치한 순간의 난이도(최고값만).
    const k = newState(0); k.level = 40; k.stage = 'brook'; k.tide = 7; k.running = true; E.spawn(k, () => .5); const killed = k.enemy.id; k.enemy.hp = 0; E.reward(k, () => .5);
    assert.equal(k.bookTier[killed], 7);
    // 지역 연구(v27.92): 리스항구 몬스터 전부 연구 1단계 → 지역 연구 1단계, 경험치 +2%. 4단계면 최대 3단계.
    const r = newState(0), before = St.stats(r).expBonus;
    for (const id of W.regionFish('리스항구')) r.book[id] = 50;
    const r3 = newState(0); for (const id of W.regionFish('리스항구')) r3.book[id] = 10000; assert.equal(Bk.regionResearchStage(r3, '리스항구'), 3);
    assert.equal(Bk.regionResearchStage(r, '리스항구'), 1); assert.equal(Bk.regionResearchStage(r, '헤네시스'), 0);
    assert.ok(Math.abs(St.stats(r).expBonus - before - .02) < 1e-9 + .03 + 1e-9, 'region research adds exp (place themes may add too)');
    // 환생해도 변종·황금·난이도 이정표·최고 난이도 기록이 남습니다.
    const rb = newState(0); rb.level = 30; rb.variantBook = { minnow: { giant: 2 } }; rb.goldenBook = { minnow: 1 }; rb.tideBest = { brook: 5 }; rb.bookTier = { minnow: 9 };
    act(rb, { type: 'rebirth' }, 0);
    assert.deepEqual([rb.variantBook, rb.goldenBook, rb.tideBest, rb.bookTier], [{ minnow: { giant: 2 } }, { minnow: 1 }, { brook: 5 }, { minnow: 9 }]);
});

test('v27.80 regional variants and swarm habitats: signature variant ×2.5, habitats spawn only ×100/×500 swarms without mimic or milestone pearls', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const W = await L.load('data/world'), V = await L.load('data/variants'), E = await L.load('systems/encounter');
    const at = stage => { const s = newState(0); s.level = 60; s.rebirths = 10; s.stage = stage; return V.variantChances(s); };
    const lith = at('brook'), hen = at('reef'), base = V.VARIANTS.find(v => v.id === 'swarm').chance;
    assert.ok(Math.abs(lith.swarm - base * 2.5) < 1e-9 && Math.abs(hen.swarm - base * .8) < 1e-9, 'Lith Harbor favours swarms');
    assert.ok(hen.giant > lith.giant * 3, 'Henesys favours giants');
    assert.equal(W.REGIONS.length, 9); assert.equal(W.STAGES.filter(st => st.habitat).length, 9); assert.equal(W.PLACES.length, W.STAGES.length - 9);
    const hab = W.STAGES.find(st => st.id === 'lithSwarm');
    assert.deepEqual(hab.fish, W.regionFish('리스항구')); assert.ok(hab.rebirth >= W.HABITAT.minRebirth);
    const s = newState(0); s.level = 60; s.rebirths = 10; s.kills = 5000; s.stage = 'lithSwarm'; s.tide = 20; s.running = true;
    const sizes = new Set(); for (const roll of [.01, .1, .3, .9]) { E.spawn(s, () => roll); assert.equal(s.enemy.variant, 'swarm'); sizes.add(s.enemy.swarm); assert.ok(!['masteryMimic', 'expNuri'].includes(s.enemy.id), 'no mimic or nuri in habitats'); }
    assert.deepEqual([...sizes].sort((a, b) => a - b), [100, 500]);
    const logs = s.logs.length; s.enemy.hp = 0; E.reward(s, () => .5); assert.ok(!s.logs.slice(logs).some(l => l.text.includes('이정표')), 'no tide milestone pearls in habitats'); assert.ok(!s.tideBest?.lithSwarm);
});

test('v27.79 rank: kills-only progression with perks (tally, drill, medal, supply), free reset, survives rebirth', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const R = await L.load('data/rank'), Enc = await L.load('systems/encounter'), M = await L.load('systems/mastery');
    assert.equal(R.RANKS.length, 17); assert.equal(R.RANKS[0].name, '이등병'); assert.equal(R.RANKS.at(-1).name, '중장'); assert.equal(R.RANK_CUMULATIVE[1], 5000);
    const total = R.RANKS.reduce((a, r) => a + r.need, 0); assert.ok(total > 1.8e8 && total < 2.0e8, `total kills to top ${total}`);
    // v3.19 무리 없이 처치 상한(시간당 1,800) × 전과 기록 최대(×11)로 24시간 돌려도 1년 이상.
    const tallyMax = R.RANK_PERKS.find(p => p.id === 'tally').max; assert.equal(tallyMax, 10); assert.ok(total / (1800 * (1 + tallyMax)) > 8760, 'at least a year at the cap'); assert.equal(R.RANK_TOTAL_POINTS, 41); assert.ok(R.RANK_PERKS.every(p => p.cost === 1), 'every perk costs 1P'); assert.equal(R.RANK_PERKS.reduce((a, p) => a + p.max * p.cost, 0), R.RANK_TOTAL_POINTS, 'all perks maxed = all points');
    // 같은 계급 그룹 안에서는 약 ×1.38씩, 그룹이 바뀌는 진급(하사·소위·준장)은 그룹 배율만큼 뜁니다.
    for (let i = 2; i < R.RANKS.length; i++) { const a = R.RANKS[i - 1], b = R.RANKS[i], g = (b.need / R.RANK_GROUP_SCALE[b.group]) / (a.need / R.RANK_GROUP_SCALE[a.group]); assert.ok(g > 1.3 && g < 1.5, `growth ${g} at ${i}`); }
    const s = newState(0); s.kills = 4999; assert.equal(R.rankOf(s).name, '이등병', 'old saves start from their kill count');
    s.running = true; s.stage = 'brook'; s.enemy = { id: 'minnow', name: 't', hp: 1, maxHp: 1, attack: 0, defense: 0, exp: 1, gold: 1, boss: false, stun: 0 };
    Enc.reward(s, () => .99); assert.equal(s.rank.exp, 5000); assert.equal(R.rankOf(s).name, '일병'); assert.ok(s.logs.some(l => /일병\(으\)로 진급/.test(l.text))); assert.equal(R.rankPointsFree(s), 1);
    act(s, { type: 'rankPerk', id: 'supply' }, 0); assert.equal(R.rankPerkLevel(s, 'supply'), 1); assert.equal(R.rankPointsFree(s), 0); assert.throws(() => act(s, { type: 'rankPerk', id: 'tally' }, 0), /부족/);
    s.enemy = { id: 'minnow', name: 't', hp: 1, maxHp: 1, attack: 0, defense: 0, exp: 1, gold: 1, boss: false, stun: 0 }; const p0 = s.pearls; Enc.reward(s, () => 0); assert.equal(s.pearls, p0 + 1, 'supply 0.1% hit on rng 0');
    act(s, { type: 'rankPerk', id: 'reset' }, 0); assert.equal(R.rankPointsFree(s), 1); assert.deepEqual(s.rank.perks, {});
    s.rank.exp = R.RANK_CUMULATIVE[16]; assert.equal(R.rankOf(s).name, '중장'); assert.equal(R.rankPointsEarned(s), 41);
    s.rank.perks = { tally: 2, drill: 3, medal: 5 }; assert.equal(R.rankPointsSpent(s), 2 + 3 + 5); assert.equal(M.victoryMastery(s, { id: 'minnow', boss: false }).base, 4, 'drill 3 → base mastery 4');
    s.enemy = { id: 'minnow', name: 't', hp: 1, maxHp: 1, attack: 0, defense: 0, exp: 1, gold: 1, boss: false, stun: 0, swarm: 10 }; const e0 = s.rank.exp, sp0 = s.sp; Enc.reward(s, () => 0); assert.equal(s.rank.exp, e0 + 30, 'swarm 10 × (1 + tally 2)'); assert.equal(s.sp, sp0 + 1, 'medal hit');
    const r = newState(0); r.level = 60; r.rank = { exp: 12345, perks: { supply: 1 } }; act(r, { type: 'rebirth' }, 0); assert.deepEqual(r.rank, { exp: 12345, perks: { supply: 1 } }, 'rank survives rebirth');
});

test('v27.80 badge choice (title/rank) and the 지겨운 환생 research restores mastered job, inherited skills and attribute ratio after rebirth', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const Pr = await L.load('systems/progression'), E = await L.load('data/economy');
    const s = newState(0); act(s, { type: 'badge', id: 'rank' }, 0); assert.equal(s.badge, 'rank'); act(s, { type: 'badge', id: 'title' }, 0); assert.equal(s.badge, undefined); assert.throws(() => act(s, { type: 'badge', id: 'x' }, 0));
    const r = E.RESEARCH.find(x => x.id === 'habit'); assert.ok(r && r.max === 3 && r.rebirth === 2 && E.researchCost('habit', 0) === 6);
    const make = (habit) => { const t = newState(0); t.level = 60; t.rebirths = 5; t.permanent.habit = habit; t.unlockedJobs.push('harpoon'); t.job = 'harpoon'; t.jobMastery.harpoon = 1e9; t.attributes = { str: 60, dex: 20, int: 0, vit: 20, wis: 0, luk: 0 }; t.learned.hook = 1; t.skillInheritances.hook = true; t.skills = ['hook']; return t; };
    const a = make(0); act(a, { type: 'rebirth' }, 0); assert.equal(a.job, 'fisher', 'without research the job resets');
    const b = make(1); assert.ok(Pr.canChangeJob(b, 'harpoon')); act(b, { type: 'rebirth' }, 0); assert.equal(b.job, 'harpoon', 'level 1: auto job change to the mastered job'); assert.ok(b.logs.some(l => /자동 전직/.test(l.text)));
    const c = make(2); act(c, { type: 'rebirth' }, 0); assert.ok(c.skills.includes('hook'), 'level 2 keeps the inherited skill');
    const d = make(3); d.permanent.starting = 10; act(d, { type: 'rebirth' }, 0); assert.equal(d.statPoints, 0); assert.ok(d.attributes.str >= 55 && d.attributes.dex >= 18 && d.attributes.vit >= 18 && d.attributes.int === 0, `ratio kept ${JSON.stringify(d.attributes)}`);
    const e = make(1); e.jobMastery.harpoon = 0; act(e, { type: 'rebirth' }, 0); assert.equal(e.job, 'fisher', 'unmastered job is not restored');
});

test('v27.89 sprout support: exp ×(1 + 0.2 × (10 − rebirths)) below 10 rebirths, half death recovery and +5%p kill heal below 5', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const Sp = await L.load('data/sprout'), Enc = await L.load('systems/encounter'), B = await L.load('data/balance');
    assert.deepEqual([0, 1, 5, 9, 10, 30].map(r => Number(Sp.sproutExp(r).toFixed(2))), [3, 2.8, 2, 1.2, 1, 1]);
    const at = r => { const s = newState(0); s.rebirths = r; return s; };
    // v3.17 환생 10회 미만은 3턴, 10회부터 기본 25턴. 연구 ‘불굴의 의지’ -3턴/단계, 패시브 revive, 최저 10턴. 경험치 손실은 10회부터 필요량의 2%.
    assert.equal(Sp.deathRecoveryTurns(at(4)), Sp.SPROUT.recoveryTurns); assert.equal(Sp.deathRecoveryTurns(at(9)), 3); assert.equal(Sp.deathRecoveryTurns(at(10)), B.BALANCE.recoveryTurns); assert.equal(B.BALANCE.recoveryTurns, 25);
    { const v = at(20); v.permanent = { revive: 5 }; v.skills = ['vital']; assert.equal(Sp.deathRecoveryTurns(v), Math.max(10, 25 - 15 - 5)); v.permanent = { revive: 2 }; v.skills = []; assert.equal(Sp.deathRecoveryTurns(v), 19); }
    { const v = at(9); v.level = 50; v.exp = 1e9; assert.equal(Sp.deathExpLoss(v), 0, 'no exp loss under rebirth 10'); const w = at(10); w.level = 50; w.exp = 1e9; assert.equal(Sp.deathExpLoss(w), Math.floor(B.xpNeeded(50, 10) * .02)); w.exp = 5; assert.equal(Sp.deathExpLoss(w), 5, 'never below 0'); }
    assert.ok(Math.abs(Enc.victoryHealRate(at(4)) - Enc.victoryHealRate(at(5)) - .05) < 1e-9);
    const s = at(2); s.running = true; s.hp = 1; s.enemy = { id: 'shark', name: 'shark', hp: 1e9, maxHp: 1e9, attack: 1e9, defense: 0, exp: 0, gold: 0, boss: false, stun: 0, skills: [], cooldowns: {}, effects: {}, mana: 0, combatStats: { hp: 1e9, attack: 1e9, defense: 0, crit: 0, accuracy: 5, speed: 999 } };
    tick(s, () => .5); assert.equal(s.recovery, Sp.SPROUT.recoveryTurns);
});

test('v27.91 world bosses: three summon gauges, shared HP snapshot, raid challenge accumulates damage and pays the whole party on the kill', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const A = await L.load('data/altar'), Du = await L.load('systems/duel');
    assert.equal(A.RAIDS.length, 3); assert.deepEqual(A.SUMMON_GAUGE_IDS, ['god', 'balrog', 'zakum', 'horntail']); assert.equal(A.GAUGE_IDS.length, 8);
    assert.ok(A.RAIDS[0].stats.hp < A.RAIDS[1].stats.hp && A.RAIDS[1].stats.hp < A.RAIDS[2].stats.hp && A.RAIDS[0].cost < A.RAIDS[1].cost && A.RAIDS[1].cost < A.RAIDS[2].cost);
    assert.equal(A.gaugeCost('zakum'), 5000); assert.equal(A.gaugeName('balrog'), '발록 소환'); assert.equal(A.ALTAR.godCost, 40000); assert.ok(A.RAID.maxTurns <= 100);
    const full = Du.raidBossSnapshot(A.RAIDS[0]), partial = Du.raidBossSnapshot(A.RAIDS[0], 1234);
    assert.equal(full.stats.hp, A.RAIDS[0].stats.hp); assert.equal(partial.stats.hp, 1234); assert.ok(full.skills.includes('foeWard'));
    // 서버 흐름(파일 DB): 소환 → 두 모험가가 때림 → 마지막 일격 → 참여 보상.
    const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
    const file = path.join(os.tmpdir(), `tb-raid-${Date.now()}.json`); process.env.TIDEBOUND_DEV_DB = file;
    const Alt = await L.load('server/altar'), DB = await L.load('server/db');
    try {
        const database = DB.db();
        const now = Date.now(), hpMax = 1e9;
        const R = A.RAID.respawnMs;
        assert.ok(await database.summonAltarRaid('balrog', hpMax, now + A.RAIDS[0].lifetimeHours * 3600_000, now, R)); assert.deepEqual(A.RAIDS.map(r => r.lifetimeHours), [6, 12, 24]); assert.equal(R, 2 * 3600_000);
        assert.equal(await database.summonAltarRaid('balrog', 5, now + 1000, now, R), 0, 'the same boss once at a time');
        // v3.22 보스마다 따로: 발록이 떠 있어도 자쿰은 나타납니다.
        const zGen = await database.summonAltarRaid('zakum', 5e9, now + 3600_000, now, R); assert.ok(zGen > 0, 'zakum alongside balrog');
        const raid = async id => (await database.listAltarRaids()).find(r => r.id === id);
        const a = newState(now); a.name = '첫째'; a.level = 60; a.attributes.str = 400; a.kills = 1; a.lastTick = now;
        const r1 = await Alt.makeRaid('p1', 'balrog')(a, now);
        assert.ok(r1.dealt > 0 && r1.remaining === Math.max(0, hpMax - r1.dealt), `damage is taken off the shared hp (${r1.dealt})`);
        assert.equal(a.altar.raidAtBy.balrog, now); assert.equal(a.altar.raidHits, 1);
        await assert.rejects(Alt.makeRaid('p1', 'balrog')(a, now + 1000), /분 뒤에/, 'cooldown per boss');
        const z1 = await Alt.makeRaid('p1', 'zakum')(a, now + 1000); assert.ok(z1 && a.altar.raidAtBy.zakum === now + 1000, 'another boss is not on cooldown');
        await assert.rejects(Alt.makeRaid('p1', 'horntail')(a, now + 2000), /나타나 있지 않습니다/);
        let row = await raid('balrog'); assert.equal(row.hp, r1.remaining); assert.equal((await database.getRaidHit(row.gen, 'p1')).dealt, r1.dealt);
        // 다른 모험가들이 깎은 셈 치고 체력을 1만 남긴 뒤, 둘째가 마지막 일격을 넣습니다.
        assert.equal(await database.hitAltarRaid('balrog', row.gen, r1.remaining - 1), 1);
        const b = newState(now); b.name = '둘째'; b.level = 60; b.attributes.str = 400; b.lastTick = now;
        const last = await Alt.makeRaid('p2', 'balrog')(b, now + 1_000_000);
        assert.equal(await database.hitAltarRaid('balrog', row.gen, 5), null, 'no hits after the kill');
        row = await raid('balrog'); assert.equal(row.state, 'slain'); assert.equal(row.hp, 0); assert.equal(row.slayer, 'p2'); assert.ok(last.slain && last.slayer);
        assert.equal((await raid('zakum')).state, 'alive', 'killing balrog leaves zakum up');
        assert.equal(await database.summonAltarRaid('balrog', 5, now + 1000, now + 1_000_000 + 1000, R), 0, 'balrog respawn wait');
        Alt.invalidateAltar();
        const info = await Alt.altarInfo('p1', a, now + 5); const ib = info.raids.find(x => x.id === 'balrog');
        assert.ok(ib && ib.slain && ib.participants === 2 && ib.board[0].dealt >= ib.board[1].dealt && ib.slayer === '둘째'); assert.ok(info.raids.some(x => x.id === 'zakum' && x.alive));
        const zakumGauge = info.gauges.find(g => g.id === 'zakum'), balrogGauge = info.gauges.find(g => g.id === 'balrog');
        assert.ok(/대기/.test(balrogGauge.next) && !/대기/.test(zakumGauge.next), 'respawn wait only on the slain boss');
        const gold = a.gold, pearls = a.pearls; Alt.invalidateAltar(); await Alt.syncAltarStatus(a, now + 10, 'p1');
        assert.equal(a.gold - gold, A.RAIDS[0].reward.gold); assert.equal(a.pearls - pearls, A.RAIDS[0].reward.pearls); assert.equal(a.altar.raidClaimedBy.balrog, row.gen);
        assert.ok(a.altarStatus.raids.some(x => x.id === 'zakum'));
        await Alt.syncAltarStatus(a, now + 20, 'p1'); assert.equal(a.gold - gold, A.RAIDS[0].reward.gold, 'paid once');
        const bg = b.gold, bp = b.pearls; await Alt.syncAltarStatus(b, now + 10, 'p2'); assert.equal(b.pearls - bp, A.RAIDS[0].reward.pearls + A.RAIDS[0].slayer.pearls, 'slayer bonus'); assert.equal(b.gold - bg, A.RAIDS[0].reward.gold);
        const c = newState(now); const cg = c.gold; await Alt.syncAltarStatus(c, now + 10, 'p3'); assert.equal(c.gold, cg, 'non-participants get nothing'); assert.equal(c.altar.raidClaimedBy.balrog, row.gen);
        const gauges = await database.listAltarGauges(); assert.ok(gauges.some(g => g.id === 'gold' && g.until > now) && gauges.some(g => g.id === 'exp' && g.until > now), 'kill opens the blessings');
    } finally { try { fs.unlinkSync(file); } catch { /* 없음 */ } }
});

test('v27.93 star force: per-star odds, drops from 10 (15/20 safe), destruction from 15 (relics reset to 12), chance time, safeguard, cost growth after 12', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const SF = await L.load('data/starforce'), { enhanceCost, itemStats } = await L.load('systems/equipment');
    assert.equal(SF.starSuccess(0), .95); assert.equal(SF.starSuccess(15), .3); assert.equal(SF.starMax(3), 22); assert.equal(SF.starMax(2), 15);
    assert.ok(!SF.starDrops(9) && SF.starDrops(10) && !SF.starDrops(15) && SF.starDrops(16) && !SF.starDrops(20) && SF.starDrops(21));
    assert.equal(SF.starDestroy(14), 0); assert.equal(SF.starDestroy(15), .021); assert.equal(SF.starDestroy(15, true), 0); assert.equal(SF.starDestroy(20, true), .07, 'safeguard only at 15·16');
    assert.ok(Math.abs(SF.starMultiplier(12) - 2.2) < 1e-9 && Math.abs(SF.starMultiplier(15) - 2.5) < 1e-9 && Math.abs(SF.starMultiplier(22) - 3.55) < 1e-9);
    const base = { id: 'x', name: 'x', slot: 'coat', rarity: 3, power: 100, level: 30 };
    assert.ok(Math.abs(enhanceCost({ ...base, enhance: 13 }) - enhanceCost({ ...base, enhance: 12 }) * SF.STARFORCE.growth) <= 1); assert.ok(enhanceCost({ ...base, enhance: 21 }) > enhanceCost({ ...base, enhance: 12 }) * 7);
    assert.ok(itemStats({ ...base, enhance: 22 }).hp > itemStats({ ...base, enhance: 12 }).hp * 1.5);
    const s = newState(0); s.gold = 1e12;
    const it = { ...base, enhance: 11 }; s.inventory = [it];
    act(s, { type: 'enhance', id: 'x' }, 0, () => .99); assert.equal(it.enhance, 10, 'fail at 11 drops'); assert.equal(it.starFails, 1);
    act(s, { type: 'enhance', id: 'x' }, 0, () => .99); assert.equal(it.enhance, 9); assert.equal(it.starFails, 2);
    act(s, { type: 'enhance', id: 'x' }, 0, () => .99); assert.equal(it.enhance, 10, 'chance time succeeds regardless of the roll'); assert.equal(it.starFails, 0);
    it.enhance = 15; act(s, { type: 'enhance', id: 'x' }, 0, () => .99); assert.equal(it.enhance, 15, '15 is safe on fail'); assert.equal(it.starFails, 0);
    const g = s.gold; act(s, { type: 'enhance', id: 'x', value: 'safeguard' }, 0, () => .31); assert.equal(it.enhance, 15, 'roll in the destroy band but safeguarded = plain fail'); assert.equal(g - s.gold, enhanceCost({ ...base, enhance: 15 }) * 2);
    act(s, { type: 'enhance', id: 'x' }, 0, () => .31); assert.equal(s.inventory.length, 0, 'destroyed: item gone');
    const relic = { ...base, id: 'r', enhance: 16, relic: 'memoryRod', level: 100 }; s.inventory = [relic]; s.equipment.coat = relic;
    act(s, { type: 'enhance', id: 'r' }, 0, () => .31); assert.equal(relic.enhance, 12, 'relic resets to 12 instead of breaking'); assert.ok(s.inventory.length === 1 && s.equipment.coat === relic);
    const worn = { ...base, id: 'w', enhance: 20 }; s.inventory = [worn]; s.equipment.coat = worn;
    act(s, { type: 'enhance', id: 'w' }, 0, () => .35); assert.equal(s.equipment.coat, null, 'destroyed while equipped: slot emptied');
});

test('v27.96 growing relics: power follows rebirths, imprint consumes a same-slot item and survives rebirth, reforge only rerolls the fixed affix', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const Eco = await L.load('data/economy'), { syncRelicPower, imprintCost } = await L.load('systems/equipment'), M = await L.load('systems/migrations'), Meta = await L.load('systems/meta');
    assert.equal(Eco.relicPower(45, 0), 45); assert.equal(Eco.relicPower(45, 25), 90); assert.equal(Eco.relicPower(45, 50), 135);
    const s = newState(0); s.rebirths = 10; s.gold = 1e9;
    act(s, { type: 'buyRelic', id: 'memoryRod' }, 0);
    const relic = s.inventory.find(i => i.relic === 'memoryRod');
    assert.equal(relic.power, Eco.relicPower(45, 10), 'bought relic starts at the current rebirth power');
    relic.power = 45; M.migrateState(s, 0); assert.equal(relic.power, 63, 'loading an old save syncs relic power');
    const src = (id, affixes, extra = {}) => ({ id, name: `원본 ${id}`, slot: 'rod', rarity: 3, power: 100, level: 40, affixes, ...extra });
    s.inventory.push(src('a', [{ id: 'might', name: '맹공', stat: 'attack', value: 30 }, { id: 'swift', name: '신속', stat: 'speed', value: 2 }]));
    s.inventory.push(src('b', [{ id: 'might', name: '맹공', stat: 'attack', value: 50 }], { locked: true }), { ...src('c', [{ id: 'lucky', name: '행운', stat: 'crit', value: .02 }]), slot: 'coat' });
    assert.throws(() => act(s, { type: 'imprintRelic', id: relic.id, value: 'b:0:0' }, 0), /보호/);
    assert.throws(() => act(s, { type: 'imprintRelic', id: relic.id, value: 'c:0:0' }, 0), /같은 부위/);
    assert.throws(() => act(s, { type: 'imprintRelic', id: relic.id, value: 'a:5:0' }, 0), /옵션을 고르세요/);
    assert.throws(() => act(s, { type: 'imprintRelic', id: relic.id, value: 'a:0:3' }, 0), /칸을 고르세요/);
    const cost = imprintCost(s.inventory.find(i => i.id === 'a'), s), gold = s.gold;
    act(s, { type: 'imprintRelic', id: relic.id, value: 'a:1:0' }, 0);
    assert.equal(s.gold, gold - cost); assert.ok(!s.inventory.some(i => i.id === 'a'), 'source item is consumed');
    assert.deepEqual(relic.affixes.map(x => x.id), ['swift']); assert.equal(relic.affix.stat, 'goldBonus', 'fixed affix stays');
    s.inventory.push(src('d', [{ id: 'swift', name: '신속', stat: 'speed', value: 3 }, { id: 'arcana', name: '신비', stat: 'magic', value: 20 }]));
    assert.throws(() => act(s, { type: 'imprintRelic', id: relic.id, value: 'd:0:1' }, 0), /이미 같은 옵션/);
    act(s, { type: 'imprintRelic', id: relic.id, value: 'd:0:0' }, 0); assert.equal(relic.affixes[0].value, 3, 'same slot overwrites');
    s.inventory.push(src('e', [{ id: 'arcana', name: '신비', stat: 'magic', value: 20 }]));
    act(s, { type: 'imprintRelic', id: relic.id, value: 'e:0:1' }, 0); assert.deepEqual(relic.affixes.map(x => x.id), ['swift', 'arcana']);
    assert.ok(stats({ ...s, equipment: { ...s.equipment, rod: relic } }).magic > stats(s).magic, 'imprinted lines count in stats');
    s.essence = 50; act(s, { type: 'reforge', id: relic.id, value: '0' }, 0, () => .2);
    assert.deepEqual(relic.affixes.map(x => x.id), ['swift', 'arcana'], 'reforge on a relic leaves imprinted lines alone'); assert.ok(relic.affix);
    s.equipment.rod = relic; s.inventory = s.inventory.filter(i => i.id !== relic.id); relic.enhance = 14;
    s.level = Meta.rebirthLevel(s); act(s, { type: 'rebirth' }, 0);
    const kept = s.equipment.rod; assert.equal(kept?.relic, 'memoryRod'); assert.equal(kept.enhance, 14); assert.deepEqual(kept.affixes.map(x => x.id), ['swift', 'arcana']);
    assert.equal(kept.power, Eco.relicPower(45, 11), 'rebirth bumps relic power');
    syncRelicPower(s); assert.equal(kept.power, Eco.relicPower(45, 11));
});

test('v27.95 cape slot: evasion/hp base, steadfast affix only on capes with level² scaling and star bonus (cap 50%), monsters\' statuses are resisted', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const { itemStats, capeEvasion } = await L.load('systems/equipment'), G = await L.load('data/gear'), { gearName } = await L.load('data/maple-gear'), { SLOTS } = await L.load('data/balance');
    assert.deepEqual(Object.keys(SLOTS), ['rod', 'coat', 'charm', 'cape']); assert.equal(gearName('cape', 6), '에테르넬 케이프');
    const cape = { id: 'c', name: 'x', slot: 'cape', rarity: 6, power: 100, level: 100, enhance: 22 };
    assert.equal(capeEvasion({ rarity: 6, enhance: 22 }), Math.round(.17 * 1.66 * 10000) / 10000); assert.equal(itemStats(cape).hp, Math.round(100 * 3.55 * .52 * 2 * 1000) / 1000 || itemStats(cape).hp);
    assert.ok(itemStats(cape).evasion > .28 && itemStats(cape).evasion < .283); assert.equal(itemStats(cape).speed, undefined, 'capes give no speed');
    const def = G.AFFIX_POOL.find(a => a.id === 'steadfast'); assert.equal(def.onlySlot, 'cape');
    for (let i = 0; i < 40; i++) assert.ok(!G.rollAffixes(6, 100, undefined, () => (i % 7) / 7, [], 'rod', 100).some(a => a.id === 'steadfast'), 'never on weapons');
    const avg = (level, rarity) => G.rollOption(def, 100, rarity, () => .5, level).value;
    assert.ok(Math.abs(avg(100, 6) - .188 * 1.6) < .001, 'Lv.100 primordial average = 30.1%'); assert.ok(Math.abs(avg(50, 3) - .188 * .25 * 1.3) < .001, 'Lv.50 legend = 6.1%'); assert.ok(avg(30, 2) < .03, 'low level is tiny');
    const worn = { ...cape, affixes: [{ id: 'steadfast', name: '불굴', stat: 'statusResist', value: avg(100, 6) }] };
    assert.ok(Math.abs(itemStats(worn).statusResist - .5) < .002, '22 stars push Lv.100 primordial to the 50% cap'); assert.ok(Math.abs(itemStats({ ...worn, enhance: 0 }).statusResist - .3008) < .001, 'no stars: 30%');
    const s = newState(0); s.equipment.cape = worn; assert.ok(Math.abs(stats(s).statusResist - .5) < .002); s.equipment.cape = { ...worn, affixes: [{ id: 'steadfast', name: '불굴', stat: 'statusResist', value: .9 }] }; assert.equal(stats(s).statusResist, .5, 'player cap 50%');
    // 전투: 몬스터(foe)가 거는 기절은 저항 확률로 막히고, 플레이어·결투 상대의 기절은 그대로 걸립니다.
    const foe = fighter(['frozenTime']); foe.foe = true;
    const guarded = target(); guarded.stats.statusResist = 1; strike(foe, guarded, () => .99); assert.equal(guarded.stun, 0, 'resisted'); 
    const open = target(); strike(fighter(['frozenTime']), open, () => .99); assert.ok(open.stun >= 2, 'a non-monster attacker is not resisted');
    let calls = 0; const counting = () => { calls++; return .99; };
    const none = target(); strike(fighter(['frozenTime'], {}), none, counting); const base0 = calls; calls = 0;
    const zero = target(); zero.stats.statusResist = 0; const f2 = fighter(['frozenTime']); f2.foe = true; strike(f2, zero, counting); assert.equal(calls, base0, 'resist 0 draws no extra random number');
    const E = await L.load('systems/engine'); const t = E.newState(0); assert.equal(t.equipment.cape, null, 'new saves start with an empty cape slot');
});

test('v3.5 gear level-up: +10 up to player level, power/flat affixes scale, stars reset, relic star cap and power follow level', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const { levelUpTarget, levelUpCost, enhanceMaxFor, enhanceCost } = await L.load('systems/equipment'), Eco = await L.load('data/economy');
    const s = newState(0); s.level = 25; s.gold = 1e9;
    const item = { id: 'g', name: 'x', slot: 'rod', rarity: 3, power: 100, level: 8, enhance: 7, starFails: 1, affixes: [{ id: 'might', name: '맹공', stat: 'attack', value: 30 }, { id: 'precise', name: '정밀', stat: 'accuracy', value: .03 }] };
    s.inventory.push(item);
    assert.equal(levelUpTarget(item, s), 18); const cost = levelUpCost(item, s), gold = s.gold;
    act(s, { type: 'levelUp', id: 'g' }, 0);
    assert.equal(item.level, 18); assert.equal(item.power, 200, 'power × (20/10)'); assert.equal(item.affixes[0].value, 60, 'flat affix scales'); assert.equal(item.affixes[1].value, .03, 'percent affix stays');
    assert.equal(item.enhance, 0); assert.equal(item.starFails, 0); assert.equal(s.gold, gold - cost);
    assert.equal(levelUpTarget(item, s), 25, 'v3.13: capped at my level instead of null'); s.level = 18; assert.equal(levelUpTarget(item, s), null, 'cannot pass the player level'); assert.throws(() => act(s, { type: 'levelUp', id: 'g' }, 0), /내 레벨/);
    s.level = 100; assert.equal(levelUpTarget(item, s), 28);
    // 불굴은 레벨 보정 비율로 다시 계산합니다.
    const cape = { id: 'c', name: 'c', slot: 'cape', rarity: 6, power: 100, level: 50, affixes: [{ id: 'steadfast', name: '불굴', stat: 'statusResist', value: .1 }] }; s.inventory.push(cape);
    act(s, { type: 'levelUp', id: 'c' }, 0); assert.ok(Math.abs(cape.affixes[0].value - .1 * (.36 / .25)) < .001, 'Lv.50 → Lv.60: ×(0.6²/0.5²)');
    // 유물: 레벨이 별 상한과 위력을 정합니다.
    s.rebirths = 10; act(s, { type: 'buyRelic', id: 'memoryRod' }, 0); const relic = s.inventory.find(i => i.relic === 'memoryRod');
    assert.equal(enhanceMaxFor(relic), 12, 'Lv.1 relic caps at 12 stars'); relic.enhance = 12; assert.throws(() => act(s, { type: 'enhance', id: relic.id }, 0, () => 0), /최대 강화/);
    const cheap = enhanceCost({ ...relic, enhance: 5 }, s);
    act(s, { type: 'levelUp', id: relic.id }, 0); assert.equal(relic.level, 11); assert.equal(relic.enhance, 0); assert.equal(enhanceMaxFor(relic), 13);
    assert.equal(relic.power, Eco.relicPower(45, 10, 11)); assert.ok(enhanceCost({ ...relic, enhance: 5 }, s) > cheap, 'relic star cost rises with its level');
    for (let i = 0; i < 8; i++) act(s, { type: 'levelUp', id: relic.id }, 0); assert.equal(relic.level, 91); assert.equal(enhanceMaxFor(relic), 21);
    // v3.13 Lv.91 → Lv.100(내 레벨까지), 별 상한 22. 전에는 Lv.101을 요구해 영원히 막혔습니다.
    act(s, { type: 'levelUp', id: relic.id }, 0); assert.equal(relic.level, 100); assert.equal(enhanceMaxFor(relic), 22); assert.throws(() => act(s, { type: 'levelUp', id: relic.id }, 0), /내 레벨/, 'already at my level');
});

test('v3.6 star force records: tries/success/fail/destroy/gold persist through rebirth and feed the 강화 achievements and star titles', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const { ACHIEVEMENTS } = await L.load('data/achievements'), { TITLES } = await L.load('data/titles'), Meta = await L.load('systems/meta');
    const s = newState(0); s.gold = 1e12; const item = { id: 'g', name: 'x', slot: 'rod', rarity: 3, power: 50, level: 10, enhance: 0 }; s.inventory.push(item);
    act(s, { type: 'enhance', id: 'g' }, 0, () => 0); assert.deepEqual([s.starforce.tries, s.starforce.success, s.starforce.fail, s.starforce.destroy], [1, 1, 0, 0]); assert.ok(s.starforce.gold > 0);
    item.enhance = 11; act(s, { type: 'enhance', id: 'g' }, 0, () => .99); assert.equal(item.enhance, 10, 'dropped'); assert.deepEqual([s.starforce.tries, s.starforce.fail], [2, 1]);
    item.enhance = 16; act(s, { type: 'enhance', id: 'g' }, 0, () => .31); assert.equal(s.starforce.destroy, 1); assert.equal(s.starforce.fail, 1, 'destruction is not a plain failure');
    const by = id => ACHIEVEMENTS.find(a => a.id === id); assert.equal(by('starDestroy:1').progress(s), 1); assert.equal(by('starTries:100').progress(s), 3); assert.ok(by('starGold:10000000').progress(s) === s.starforce.gold);
    s.inventory.push({ id: 'w', name: 'w', slot: 'coat', rarity: 6, power: 50, level: 10, enhance: 22 }); assert.equal(by('star:22').progress(s), 22);
    assert.ok(ACHIEVEMENTS.filter(a => a.group === '강화').length >= 19);
    assert.ok(TITLES.some(t => t.id === 'star:22' && t.name.startsWith('★') && t.achievement === 'star:22'));
    s.level = Meta.rebirthLevel(s); const before = { ...s.starforce }; act(s, { type: 'rebirth' }, 0); assert.deepEqual(s.starforce, before, 'records survive rebirth');
});

test('v3.7 auto enhance: needs the autoStar research, loops until target/limit/destroy, and sums the star force records', async () => {
    const s = newState(0); s.gold = 1e9; const item = { id: 'g', name: 'x', slot: 'rod', rarity: 3, power: 50, level: 10, enhance: 0 }; s.inventory.push(item);
    const autoLog = () => [...s.logs].reverse().find(l => l.text.includes('자동 강화')).text;
    assert.throws(() => act(s, { type: 'autoEnhance', id: 'g', value: '5' }, 0, () => 0), /자동 강화/);
    s.permanent.autoStar = 1;
    assert.throws(() => act(s, { type: 'autoEnhance', id: 'g', value: '0' }, 0, () => 0), /목표 별/);
    act(s, { type: 'autoEnhance', id: 'g', value: '5' }, 0, () => 0); assert.equal(item.enhance, 5); assert.equal(s.starforce.tries, 5); assert.equal(s.starforce.success, 5);
    assert.ok(autoLog().includes('목표 달성') && autoLog().includes('시도 5회'), autoLog());
    // 골드 한도: 한도 안에서만 시도하고 멈춥니다.
    const { enhanceCost } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/equipment');
    const gold = s.gold, two = enhanceCost(item, s) + enhanceCost({ ...item, enhance: 6 }, s);
    act(s, { type: 'autoEnhance', id: 'g', value: `12:${two + 1}:0` }, 0, () => 0); assert.equal(item.enhance, 7, 'two attempts fit the cap'); assert.equal(gold - s.gold, two);
    assert.ok(autoLog().includes('골드 한도'));
    // 파괴되면 멈춥니다(16성, 파괴 굴림).
    item.enhance = 16; act(s, { type: 'autoEnhance', id: 'g', value: '22' }, 0, () => .31); assert.ok(!s.inventory.some(i => i.id === 'g'), 'destroyed item is gone'); assert.ok(autoLog().includes('파괴') && autoLog().includes('소멸'));
});

test('v3.8 star catch: enhance value "catch" adds +10%p success (destroy unchanged), flags combine with safeguard, auto enhance never catches', async () => {
    const { STARFORCE } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/starforce');
    assert.equal(STARFORCE.catchBonus, .1);
    const s = newState(0); s.gold = 1e9; const item = { id: 'g', name: 'x', slot: 'rod', rarity: 3, power: 50, level: 10, enhance: 15 }; s.inventory.push(item);
    act(s, { type: 'enhance', id: 'g' }, 0, () => .35); assert.equal(item.enhance, 15, '35% roll fails at 30%');
    act(s, { type: 'enhance', id: 'g', value: 'catch' }, 0, () => .35); assert.equal(item.enhance, 16, 'same roll succeeds with the catch bonus');
    assert.ok([...s.logs].reverse().find(l => l.text.includes('강화 성공')).text.includes('스타캐치'));
    act(s, { type: 'enhance', id: 'g', value: 'safeguard,catch' }, 0, () => .41); assert.equal(item.enhance, 15, '41% is past 30%+10%p and safeguard removes destruction: drops to 15');
    const gold = s.gold; item.enhance = 15; act(s, { type: 'enhance', id: 'g', value: 'safeguard,catch' }, 0, () => .39); assert.equal(item.enhance, 16); assert.ok(gold - s.gold > 0);
    item.enhance = 16; act(s, { type: 'enhance', id: 'g', value: 'catch' }, 0, () => .405); assert.ok(!s.inventory.some(i => i.id === 'g'), 'destroy band (.4~.421) is unchanged by the catch bonus');
});

test('v3.8 auto enhance research costs 10 pearls; saves that paid 100 get 90 back once', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame(); const Eco = await L.load('data/economy'), M = await L.load('systems/migrations');
    assert.equal(Eco.researchCost('autoStar', 0), 10);
    const s = newState(0); s.autoStarRefunded = false; s.permanent.autoStar = 1; s.pearls = 5; assert.equal(M.refundAutoStar(s), 90); assert.equal(s.pearls, 95); assert.equal(M.refundAutoStar(s), 0, 'only once');
    const t = newState(0); t.autoStarRefunded = false; assert.equal(M.refundAutoStar(t), 0); assert.equal(t.autoStarRefunded, true); t.permanent.autoStar = 1; assert.equal(M.refundAutoStar(t), 0, 'buying later at 10 gets no refund');
});

test('v3.9 depth coefficient: later stages/dungeons are +4% per entry-level step in stats and rewards; abyss, random game, mimic and nuri are untouched', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame(); const W = await L.load('data/world'), E = await L.load('systems/encounter');
    assert.equal(W.stageDepth('brook'), 1); assert.ok(Math.abs(W.stageDepth(W.PLACES[9].id) - (1 + .04 * 9)) < 1e-9, 'tenth place is ×1.36'); assert.ok(Math.abs(W.stageDepth('vanishingJourney') - 1.52) < 1e-9, 'v3.10 fourteenth place is ×1.52');
    const habitat = W.STAGES.find(s => s.habitat); assert.ok(W.stageDepth(habitat.id) > 1, 'habitats take their level slot');
    assert.equal(W.dungeonDepth('abyss'), 1); assert.equal(W.dungeonDepth('randomGame'), 1); assert.equal(W.dungeonDepth('masteryMimic'), 1); assert.equal(W.dungeonDepth('expNuri'), 1); assert.equal(W.dungeonDepth('grotto'), 1);
    assert.ok(Math.abs(W.dungeonDepth('ventCathedral') - 1.24) < 1e-9);
    const first = W.PLACES[0], last = W.PLACES[9], s = { level: 200 };
    const a = E.stageField(s, first.id, first.fish[0], 50), b = E.stageField(s, last.id, last.fish[0], 50);
    assert.equal(a.level, b.level, 'difficulty 50 lifts both to the same level'); assert.ok(Math.abs(b.foe.hp / a.foe.hp - 1.36) < .02, `hp ratio ${b.foe.hp / a.foe.hp}`); assert.ok(b.gold > a.gold * 1.15, 'gold rises with the coefficient (stage reward normalization keeps it below the raw ×1.36)');
});

test('v3.11 monster exp curve knee: unchanged up to Lv.66, dropped and slower-growing above (so Lv.66→100 idling takes hours, not minutes)', async () => {
    const W = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/world');
    const old = l => Math.round(9 * Math.pow(1.15, l - 1));
    for (const l of [1, 30, 61, 66]) assert.equal(W.fishExpAt(l), old(l), `Lv.${l} unchanged`);
    assert.ok(W.fishExpAt(67) < W.fishExpAt(66), 'drop right above the knee'); assert.ok(W.fishExpAt(100) / old(100) < .25 && W.fishExpAt(100) > W.fishExpAt(90) * 2, 'Lv.100 well below the old curve but still rising');
    const top = W.FISH.find(f => f.id === 'arTrueErda'); assert.equal(top.exp, W.fishExpAt(top.level), 'monster rows use the curve');
});

test('v3.12 onyx bosses: habitat-only rare spawn with pity, 80-turn departure, 0.3% accessory drop with 400-kill pity (then pearls), unique skills, kept through rebirth, set bonuses and guards', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const O = await L.load('data/onyx'), W = await L.load('data/world'), Enc = await L.load('systems/encounter'), Meta = await L.load('systems/meta'), T = await L.load('systems/turn');
    assert.equal(O.ONYX_BOSSES.length, 7); assert.ok(O.onyxBossFor('리스항구') && !O.onyxBossFor('아쿠아로드'));
    assert.equal(O.onyxChance(0, 0), .003); assert.ok(Math.abs(O.onyxChance(50, 0) - .006) < 1e-9); assert.equal(O.onyxChance(0, O.ONYX.pity), 1, 'pity guarantees');
    for (const b of O.ONYX_BOSSES) assert.ok(W.FISH.find(f => f.id === b.id)?.boss, `${b.id} is a boss monster`);
    // 서식지에서만 나옵니다. 첫 난수(까미·누리 없음 → 칠흑 판정)가 0이면 출현.
    const s = newState(0); s.level = 60; s.rebirths = 10; s.kills = 5000; s.stage = 'lithSwarm'; s.tide = 0;
    Enc.spawn(s, () => 0); assert.equal(s.enemy.onyx, 'onyxDusk'); assert.ok(s.enemy.boss && s.enemy.swarm === undefined, 'single boss body'); assert.equal(s.enemy.leavesAt, s.turn + O.ONYX.turns); assert.equal(s.onyxSeen['리스항구'], 0);
    const plain = newState(0); plain.level = 60; plain.rebirths = 10; plain.stage = 'brook'; Enc.spawn(plain, () => 0); assert.ok(!plain.enemy.onyx, 'never outside habitats');
    const miss = newState(0); miss.level = 60; miss.rebirths = 10; miss.stage = 'lithSwarm'; Enc.spawn(miss, () => .5); assert.ok(!miss.enemy.onyx); assert.equal(miss.onyxSeen['리스항구'], 1, 'pity counter grows');
    // 처치: 장신구 1개(태초, 고유 옵션 + 5줄), 두 번째는 세계석.
    const E = await L.load('data/encounters');
    const skillSets = O.ONYX_BOSSES.map(b => E.profile(b.id).skills.join(',')); assert.equal(new Set(skillSets).size, 7, 'each onyx boss has its own skill set');
    for (const b of O.ONYX_BOSSES) { const own = E.profile(b.id).skills.filter(id => id.startsWith('onyx')); assert.equal(own.length, 1, b.id); assert.ok(E.ENEMY_SKILLS.some(sk => sk.id === own[0]), own[0]); assert.ok(s.enemy.onyx !== b.id || s.enemy.skills.includes(own[0]) && s.enemy.skills.includes('foeWard')); }
    // 드랍 0.3%: 미획득이면 연속 횟수만 오르고 400번째 격파는 확정.
    s.enemy.hp = 0; const pearls = s.pearls; Enc.reward(s, () => .5); assert.ok(!s.inventory.some(i => i.onyx), 'roll .5 misses the 0.3% drop'); assert.equal(s.onyxMiss.onyxDusk, 1); assert.equal(s.onyxBook.onyxDusk, 1); assert.ok(s.logs.some(l => l.text.includes('남기지 않았습니다')));
    for (let i = 0; i < 3; i++) { Enc.spawn(s, () => 0); s.enemy.hp = 0; Enc.reward(s, () => .99); } assert.equal(s.onyxMiss.onyxDusk, 4); assert.ok(!s.inventory.some(i => i.onyx));
    s.onyxMiss.onyxDusk = O.ONYX.dropPity - 1; Enc.spawn(s, () => 0); s.enemy.hp = 0; Enc.reward(s, () => .99); assert.ok(s.inventory.some(i => i.onyx), `${O.ONYX.dropPity}th kill is guaranteed`); assert.equal(s.onyxMiss.onyxDusk, 0); assert.equal(s.onyxBook.onyxDusk, 5);
    const s2 = newState(0); s2.level = 60; s2.rebirths = 10; s2.kills = 5000; s2.stage = 'lithSwarm'; s2.tide = 0; Enc.spawn(s2, () => 0); s2.enemy.hp = 0; Enc.reward(s2, () => .001); assert.ok(s2.inventory.some(i => i.onyx), 'roll .001 drops'); assert.equal(s2.itemBook['onyx:onyxDusk'], true, 'v3.14 auto-registered in the item codex');
    const Mig = await L.load('systems/migrations'); const s3 = newState(0); s3.inventory.push({ ...s2.inventory.find(i => i.onyx), id: 'mig' }); Mig.registerOnyxCodex(s3); assert.equal(s3.itemBook['onyx:onyxDusk'], true, 'existing owners get the codex entry');
    const acc = s.inventory.find(i => i.onyx === 'onyxDusk'); assert.ok(acc && acc.slot === 'charm' && acc.rarity === 6 && acc.locked && acc.affixes.length === 6 && acc.affixes[0].rule && acc.affixes[0].stat === 'thorns', JSON.stringify(acc));
    assert.equal(s.pearls, pearls);
    Enc.spawn(s, () => 0); s.enemy.hp = 0; Enc.reward(s, () => .5); assert.equal(s.inventory.filter(i => i.onyx).length, 1, 'one per boss'); assert.equal(s.pearls, pearls + O.ONYX.duplicatePearls);
    // 떠남: leavesAt 이후 턴에 사라집니다.
    Enc.spawn(s, () => 0); s.enemy.hp = s.enemy.maxHp; s.turn = s.enemy.leavesAt; s.running = true; s.hp = stats(s).hp; T.tick(s, () => .5); assert.ok(!s.enemy || !s.enemy.onyx, 'boss left'); assert.ok(s.logs.some(l => l.text.includes('어둠 속으로')));
    // 세트 보너스·스탯·환생 유지·보호.
    const before = stats(s).attack; s.inventory.push({ ...acc, id: 'x2', onyx: 'onyxDunkel' }); assert.ok(Math.abs(stats(s).bossDamage - .05) < 1e-9, '2 pieces: boss damage +5%');
    for (const id of ['onyxWill', 'onyxLucid', 'onyxHilla', 'onyxSeren', 'onyxBlackMage']) s.inventory.push({ ...acc, id: 'x-' + id, onyx: id, affixes: [] });
    assert.ok(Math.abs(stats(s).allStats - .03) < 1e-9 && stats(s).attack > before, '7 pieces: all stats +3%');
    assert.throws(() => act(s, { type: 'sell', id: acc.id }, 0), /칠흑/); assert.throws(() => act(s, { type: 'reforge', id: acc.id, value: '0' }, 0), /고유 옵션/);
    s.level = Meta.rebirthLevel(s); act(s, { type: 'rebirth' }, 0); assert.equal(s.inventory.filter(i => i.onyx).length, 7, 'accessories survive rebirth'); assert.equal(s.onyxBook.onyxDusk, 6); assert.deepEqual(s.onyxMiss, { onyxDusk: 0 }, 'miss counter kept');
});

test('v3.13 live rates: client-side window from logs and kill deltas (exp/gold/mastery/dps per hour), min time, gap and rebirth restart', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const R = await L.load('systems/live-rates');
    const g = R.gainsOf({ id: 1, type: 'reward', text: '달팽이 처치 · +120 G · +340 EXP' }, '나'); assert.deepEqual(g, { exp: 340, gold: 120, mastery: 0, dmg: 0 });
    assert.equal(R.gainsOf({ id: 2, type: 'reward', text: '✦ 경험의 누리 · 대박당첨! 경험치 +12,345 (Lv.50 필요량의 3%)' }, '나').exp, 12345);
    assert.equal(R.gainsOf({ id: 3, type: 'skill', text: '처치 · 직업·장착 스킬 숙련 +7 (기본 5 + 보너스 2)' }, '나').mastery, 7);
    assert.equal(R.gainsOf({ id: 4, type: 'battle', text: '나 · 기본 공격 → 500 물리 피해', event: { actor: '나', total: 500 } }, '나').dmg, 500);
    assert.equal(R.gainsOf({ id: 5, type: 'battle', text: '적 · 기본 공격 → 50 물리 피해', event: { actor: '적', total: 50 } }, '나').dmg, 0, 'enemy damage is not mine');
    const store = R.createLiveRates(); let n = 0; store.subscribe(() => n++);
    const mk = (lastTick, kills, logs, rebirths = 1, mastery = 0) => ({ lastTick, kills, logs, rebirths, name: '나', jobMastery: { harpoon: mastery } });
    store.feed(mk(0, 10, [{ id: 1, type: 'reward', text: '이미 지난 줄 · +999 G · +999 EXP' }])); assert.equal(store.get().ready, false); assert.equal(n, 1);
    store.feed(mk(0, 10, [])); assert.equal(n, 1, 'same tick adds nothing');
    store.feed(mk(10_000, 12, [{ id: 2, type: 'reward', text: '달팽이 처치 · +100 G · +200 EXP' }, { id: 3, type: 'battle', text: '', event: { actor: '나', total: 1000 } }]));
    assert.equal(store.get().ready, false, '10s is below the minimum'); assert.deepEqual(store.get().total, { exp: 200, gold: 100, kills: 2, dmg: 1000, mastery: 0 });
    store.feed(mk(30_000, 13, [{ id: 3, type: 'battle', text: '', event: { actor: '나', total: 1000 } }], 1, 4));
    const r = store.get(); assert.ok(r.ready); assert.equal(r.elapsedMs, 30_000); assert.equal(r.total.dmg, 1000, 'old log ids are not re-added'); assert.equal(r.perHour.exp, 200 * 120); assert.equal(r.perHour.kills, 3 * 120); assert.equal(r.perHour.mastery, 4 * 120, 'mastery from job mastery delta'); assert.ok(Math.abs(r.dps - 1000 / 30) < 1e-9);
    // 5분 창: 오래된 표본은 버립니다.
    for (let at = 90_000; at < R.RATE_WINDOW_MS + 30_000; at += 60_000) store.feed(mk(at, 13, []));
    store.feed(mk(R.RATE_WINDOW_MS + 30_000, 14, [{ id: 5, type: 'reward', text: '달팽이 처치 · +10 G · +10 EXP' }]));
    assert.equal(store.get().elapsedMs, R.RATE_WINDOW_MS, 'window trimmed to 5 minutes'); assert.equal(store.get().total.exp, 10, 'the first kill fell out of the window'); assert.equal(store.get().total.kills, 1, 'kills at the window edge are excluded');
    // 90초 넘게 끊기면(탭 숨김) 다시 시작, 환생해도 다시 시작.
    store.feed(mk(R.RATE_WINDOW_MS + 30_000 + R.GAP_RESET_MS + 1, 99, [{ id: 6, type: 'reward', text: '정산 · +99999 G · +99999 EXP' }])); assert.equal(store.get().ready, false); assert.equal(store.get().elapsedMs, 0);
    store.feed(mk(R.RATE_WINDOW_MS + 30_000 + R.GAP_RESET_MS + 40_001, 100, [{ id: 7, type: 'reward', text: '달팽이 처치 · +1 G · +1 EXP' }])); assert.equal(store.get().total.exp, 1, 'settlement line was skipped');
    store.feed(mk(R.RATE_WINDOW_MS + 30_000 + R.GAP_RESET_MS + 50_001, 0, [], 2)); assert.equal(store.get().elapsedMs, 0, 'rebirth restarts');
});

test('v3.30 recent kill: mastery on the kill line (mimic jackpot included), nuri exp folded in, no double count on EXP lines', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const R = await L.load('systems/live-rates');
    assert.equal(R.gainsOf({ id: 1, type: 'reward', text: '잠든 힘이 랜덤게임으로 바뀌어 봉인을 풀었습니다 · 쌓인 경험치 +500 EXP' }, '나').exp, 500, 'not counted twice');
    assert.equal(R.gainsOf({ id: 2, type: 'reward', text: '✦ 경험의 누리 · 대박당첨! 경험치 +1,500 (Lv.50 필요량의 3%)' }, '나').exp, 1500);
    assert.equal(R.recentKill([], '나'), null);
    const logs = [
        { id: 1, turn: 7, type: 'reward', text: '달팽이 처치 · +5 G · +9 EXP · 숙련 +3' },
        { id: 2, turn: 7, type: 'reward', text: '✦ 경험의 누리 · 대박당첨! 경험치 +1,500 (Lv.50 필요량의 3%)' },
        { id: 3, turn: 7, type: 'reward', text: '경험의 누리 처치 · +20 G · +40 EXP · 숙련 +4' },
        { id: 4, turn: 7, type: 'skill', text: '처치 · 직업·장착 스킬 숙련 +4 (기본 2 + 보너스 2)' },
    ];
    assert.deepEqual(R.recentKill(logs, '나'), { exp: 1540, gold: 20, mastery: 4, id: 3 }, 'nuri exp folded in, earlier kill in the same turn excluded');
    const mimic = [{ id: 9, turn: 8, type: 'reward', text: '✦ 숙련의 까미 · 1등 당첨! 직업·장착 스킬 숙련 +5,000' }, { id: 10, turn: 8, type: 'reward', text: '숙련의 까미 처치 · +1 G · +2 EXP · 숙련 +5006' }];
    assert.deepEqual(R.recentKill(mimic, '나'), { exp: 2, gold: 1, mastery: 5006, id: 10 }, 'kill line already holds the jackpot');
    const old = [{ id: 9, turn: 8, type: 'reward', text: '✦ 숙련의 까미 · 1등 당첨! 직업·장착 스킬 숙련 +5,000' }, { id: 10, turn: 8, type: 'reward', text: '숙련의 까미 처치 · +1 G · +2 EXP' }, { id: 11, turn: 8, type: 'skill', text: '처치 · 직업·장착 스킬 숙련 +6 (기본 4 + 보너스 2)' }];
    assert.equal(R.recentKill(old, '나').mastery, 5006, 'old logs: skill line + jackpot line');
});

test('v3.14 plain 태초 charm renamed to 제네시스 펜던트 by migration; onyx 창세의 뱃지 keeps its name', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame(); const Mig = await L.load('systems/migrations'), G = await L.load('data/maple-gear');
    assert.equal(G.ACCESSORY_NAMES[6], '제네시스 펜던트');
    const s = newState(0); s.inventory.push({ id: 'a', name: '창세의 뱃지', slot: 'charm', rarity: 6, level: 100, power: 500, affixes: [] }, { id: 'b', name: '창세의 뱃지', slot: 'charm', rarity: 6, level: 100, power: 500, affixes: [], onyx: 'onyxBlackMage' });
    Mig.renameMapleGear(s); assert.equal(s.inventory.find(i => i.id === 'a').name, '제네시스 펜던트'); assert.equal(s.inventory.find(i => i.id === 'b').name, '창세의 뱃지');
});

test('v3.15 level projection: counts level-ups through xpNeeded, stops at the cap, and msToCap sums the remaining need', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame(); const R = await L.load('systems/live-rates'), B = await L.load('data/balance');
    const need1 = B.xpNeeded(1, 0), need2 = B.xpNeeded(2, 0);
    assert.deepEqual(R.projectLevel(1, 0, 0, 0), { level: 1, exp: 0, capped: false, progress: 0 });
    const p = R.projectLevel(1, 0, 0, need1 + need2 + 5); assert.equal(p.level, 3); assert.equal(p.exp, 5);
    assert.ok(R.projectLevel(1, 0, 0, 1e18).capped); assert.equal(R.projectLevel(100, 0, 0, 0).level, 100);
    assert.equal(R.msToCap(99, 0, 0, B.xpNeeded(99, 0)), 3_600_000, 'one hour at exactly one level of exp per hour'); assert.equal(R.msToCap(50, 0, 0, 0), Infinity); assert.equal(R.msToCap(100, 0, 0, 100), 0);
});

test('v3.15 altar: offering to a world-boss gauge no longer throws (503) and logs the gauge name', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame(); const A = await L.load('server/altar'), D = await L.load('data/altar');
    const s = newState(0); s.gold = 1e6; const raid = D.RAIDS[0];
    A.applyOffering(s, { gold: 100000, pearls: 0, essence: 0 }, 100, raid.id, false);
    assert.ok(s.logs.at(-1).text.includes(D.gaugeName(raid.id)), s.logs.at(-1).text); assert.equal(s.gold, 1e6 - 100000);
    A.applyOffering(s, { gold: 1000, pearls: 0, essence: 0 }, 1, 'god', false); assert.ok(s.logs.at(-1).text.includes('신 소환'));
});
test('v3.15 onyx achievements: one per piece (SP/AP alternating) and a big 7-piece reward', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame(); const { ACHIEVEMENTS } = await L.load('data/achievements');
    const steps = ACHIEVEMENTS.filter(a => a.id.startsWith('onyx:')); assert.deepEqual(steps.map(a => a.target), [1, 2, 3, 4, 5, 6, 7]);
    for (const a of steps) assert.ok((a.reward.sp || 0) + (a.reward.ap || 0) >= 1, `${a.id} grants SP or AP`);
    const last = steps.at(-1); assert.ok(last.reward.sp >= 2 && last.reward.ap >= 2 && last.reward.bonus.attack >= .05, 'completion reward is strong');
});

test('v3.17 catch-up is chunked: a long absence settles CATCH_UP_CHUNK turns per request and continues next sync (same total, summary accumulates)', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame(); const T = await L.load('systems/turn'), B = await L.load('data/balance');
    const s = newState(0); s.level = 30; s.rebirths = 12; s.kills = 100; s.stage = 'brook'; s.running = true; s.lastTick = 0; s.hp = 1e9;
    const hours = 1, now = hours * 3600_000, total = now / B.BALANCE.turnMs;
    T.advance(s, now, () => .5);
    assert.equal(s.catchUpLeft, total - T.CATCH_UP_CHUNK, 'remaining turns recorded'); assert.equal(s.lastTick, T.CATCH_UP_CHUNK * B.BALANCE.turnMs); assert.ok(s.lastOffline && s.lastOffline.kills > 0);
    const firstKills = s.lastOffline.kills; let rounds = 1;
    while (s.catchUpLeft) { T.advance(s, now, () => .5); rounds++; }
    assert.equal(rounds, Math.ceil(total / T.CATCH_UP_CHUNK)); assert.equal(s.lastTick, now, 'caught up to now'); assert.ok(s.lastOffline.kills > firstKills, 'summary accumulates across chunks'); assert.equal(s.lastOffline.seconds, hours * 3600);
    T.advance(s, now + 2000, () => .5); assert.equal(s.catchUpLeft, undefined); assert.equal(s.turn > 0, true);
});
test('v3.17 tutorial rewards: a step completed by its condition pays once; silent back-fill for veteran saves pays nothing', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame(); const G = await L.load('systems/guidance');
    assert.ok(G.TUTORIAL_STEPS.length >= 21); assert.ok(G.TUTORIAL_STEPS.every(st => st.reward && (st.reward.pearls || st.reward.sp)));
    const s = newState(0); s.tutorial = { done: {} }; const pearls = s.pearls; const logs = [];
    G.syncTutorial(s, t => logs.push(t)); assert.equal(s.pearls, pearls, 'the starter skill alone pays nothing (new accounts start with 0 pearls)'); assert.ok(s.tutorial.done.skill, 'but the step counts as done');
    s.kills = 1; G.syncTutorial(s, t => logs.push(t)); assert.equal(s.pearls, pearls + 1); assert.ok(logs.some(t => t.includes('첫 처치'))); G.syncTutorial(s, t => logs.push(t)); assert.equal(s.pearls, pearls + 1, 'paid once');
    const vet = newState(0); vet.rebirths = 5; vet.kills = 10; vet.tutorial = {}; const vp = vet.pearls; G.syncTutorial(vet); assert.equal(vet.pearls, vp, 'back-fill pays nothing'); assert.ok(vet.tutorial.done.rebirth);
});

test('v3.19 rank rescale: old saves are re-ranked once; demoted saves get their perks back, others keep them', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame(), R = await L.load('data/rank'), Mi = await L.load('systems/migrations');
    const oldCum = n => R.RANK_LEGACY_NEED.slice(0, n + 1).reduce((a, x) => a + x, 0);
    const high = newState(0); delete high.rankRescaled; high.rank = { exp: oldCum(14), perks: { tally: 10, drill: 5 } };
    assert.ok(Mi.rescaleRanks(high), 'demoted'); assert.deepEqual(high.rank.perks, {}, 'perks refunded'); assert.equal(high.rank.exp, oldCum(14), 'rank exp kept');
    assert.ok(R.rankIndex(high.rank.exp) < 14); assert.ok(high.logs.some(l => /계급장 진급 기준/.test(l.text)));
    assert.equal(Mi.rescaleRanks(high), false, 'once');
    const low = newState(0); delete low.rankRescaled; low.rank = { exp: oldCum(3), perks: { tally: 2 } };
    assert.equal(Mi.rescaleRanks(low), false, '병 계급은 그대로'); assert.deepEqual(low.rank.perks, { tally: 2 });
    assert.equal(R.rankPerkLevel({ rank: { exp: 0, perks: { tally: 18 } } }, 'tally'), 10, 'old tally 18 clamps to the new max');
});

test('v3.20 starforce flow achievements: 10★+ success streak, fail streak, drops, chance time, star catch, 15★+ successes', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame(), C = await L.load('systems/commerce'), A = await L.load('data/achievements');
    const s = newState(0); s.gold = 1e15;
    const item = { id: 'sf', name: '시험 장비', slot: 'rod', rarity: 4, power: 100, level: 50, enhance: 10 };
    const spend = c => { s.gold -= c; };
    for (let i = 0; i < 5; i++) C.starForceAttempt(s, item, false, () => 0, spend);
    assert.equal(item.enhance, 15); assert.equal(s.starforce.bestStreak, 5); assert.equal(s.starforce.high || 0, 0, '15★+ not yet');
    C.starForceAttempt(s, item, false, () => 0, spend, true); assert.equal(s.starforce.high, 1); assert.equal(s.starforce.catches, 1); assert.equal(s.starforce.bestStreak, 6);
    // 16★: 실패(유지·하락) 두 번 → 연속 실패 2, 하락 횟수, 다음은 찬스 타임으로 성공.
    const keepRoll = () => .9;
    C.starForceAttempt(s, item, false, keepRoll, spend); C.starForceAttempt(s, item, false, keepRoll, spend);
    assert.equal(s.starforce.streak, 0, 'failure breaks the streak'); assert.equal(s.starforce.bestFailStreak, 2); assert.ok((s.starforce.drops || 0) >= 1);
    if (item.starFails >= 2) { C.starForceAttempt(s, item, false, keepRoll, spend); assert.equal(s.starforce.chance, 1); assert.equal(s.starforce.failStreak, 0); }
    const ids = A.ACHIEVEMENTS.map(a => a.id);
    for (const id of ['starStreak:3', 'starFailStreak:5', 'starDrops:10', 'starChance:1', 'starCatch:10', 'starHigh:10']) assert.ok(ids.includes(id), id);
    assert.equal(A.ACHIEVEMENTS.find(a => a.id === 'starStreak:5').progress(s), 6);
});

test('v3.21 difficulty exp and gold bend to √ above difficulty 30', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame(), M = await L.load('systems/meta');
    for (const t of [0, 10, 20, 30]) { assert.ok(Math.abs(M.tierExp(t) - (1 + .3 * t + .005 * Math.max(0, t - 20) ** 2)) < 1e-9, `exp ${t} unchanged`); assert.equal(M.tierReward(t), 1 + .5 * t, `gold ${t} unchanged`); }
    assert.ok(Math.abs(M.tierExp(55) - (10.5 + 1.5 * 5)) < 1e-9); assert.ok(Math.abs(M.tierReward(55) - (16 + 1.5 * 5)) < 1e-9);
    assert.ok(M.tierExp(200) < 31 && M.tierReward(200) < 36, 'no runaway with the difficulty cap');
});
