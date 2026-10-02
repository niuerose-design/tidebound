// v25 ??? 특수 직업: 시계공·시간의 지배자·玄
import { newState, tick, stats, strike, canUse, canChangeJob, effectiveSkill, SKILLS, JOBS, doorsMod as doors, combatFxFromLog, act, jobMasteryTarget, assert, test } from './harness.mjs';
const { actTurn } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/combat');
const { skillVeiled, skillBlockReason } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/progression');

const base = { hp: 1000, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 200, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5 };
const fighter = (skills, extra = {}) => ({ name: 'A', job: extra.job, stats: { ...base }, hp: extra.hp ?? 1000, mana: 200, skills, cooldowns: {}, stun: 0, effects: extra.effects || {}, ranks: {}, mastery: extra.mastery || {}, practice: {} });
const target = (extra = {}) => ({ name: 'B', stats: { ...base, hp: 1e6 }, hp: extra.hp ?? 1e6, skills: extra.skills || [], cooldowns: {}, stun: 0, effects: {}, mana: 0 });

test('v25 clockmaker: time machine restores both sides once per battle; mastery opens the chronarch with no door', () => {
    const a = fighter(['timeMachine'], { hp: 10 }), b = target({ hp: 5 });
    const text = strike(a, b, () => 0); assert.match(text, /타임머신/); assert.equal(a.hp, 1000); assert.equal(b.hp, 1e6); assert.ok(a.effects.timeUsed);
    a.hp = 10; strike(a, b, () => 0); assert.equal(a.hp, 10, 'only once per battle');
    const s = newState(0); s.level = 10; s.attributes.dex = 30; s.attributes.int = 30;
    assert.ok(doors.TIME_SLOTS.every(t => t.jobs.includes('clockmaker')), 'the time door holds the clockmaker all day');
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
    const me = fighter(['glyphNothing'], { hp: 1 });
    const foe = { ...target(), name: 'E', stats: { ...base, attack: 500 } };
    strike(foe, me, () => .5); assert.equal(me.hp, 251, '無 holds at 1 HP and gives back 25%');
    me.hp = 100; const evs = []; strike(foe, me, () => .5, evs); assert.equal(me.hp, 251, 'lethal damage from any HP leaves 1 + 25%'); assert.deepEqual(evs[0].endured, { heal: 250 }); assert.equal(me.effects.lastStand, 2);
    me.hp = 5; me.effects.dot = { damage: 10, turns: 2, name: '출혈' }; const dotText = strike(me, target(), () => 0); assert.doesNotMatch(dotText, /쓰러짐/); assert.equal(me.hp, 251, 'damage over time is held too'); assert.equal(me.effects.lastStand, 3);
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
    // 심연 기록관 직업은 비전투 그대로지만, 윤회의 조류 기록은 환생마다 자라 어느 직업에서든 쓸 만합니다.
    const a = JOBS.find(j => j.id === 'abyssArchivist'); assert.ok(a.attack < 1 && a.penalties.attack < 0, 'archivist stays a non-combat job');
    const s = newState(0); s.level = 50; s.job = 'harpoon'; s.learned.memoryOfTides = 1; s.skillInheritances.memoryOfTides = true; s.skills = ['memoryOfTides'];
    // 환생 자체의 능력치 보정과 구분하려고 같은 환생 수에서 패시브 유무 차이를 봅니다.
    const gain = (r, k) => stats({ ...s, rebirths: r })[k] - stats({ ...s, rebirths: r, skills: [] })[k];
    assert.ok(gain(5, 'attack') - gain(0, 'attack') >= 25 && gain(5, 'attack') - gain(0, 'attack') <= 30, `+5 per rebirth before job scaling (${gain(5, 'attack') - gain(0, 'attack')})`);
    assert.ok(gain(12, 'hp') - gain(0, 'hp') >= 12 * 18); assert.equal(SKILLS.find(x => x.id === 'memoryOfTides').perCount[0].cap, 12, 'rebirth scaling caps at 12');
    assert.equal(stats({ ...s, rebirths: 3 }).rebirthBonus, 1);
    // 편력 낚시꾼: 숙달 직업 3개에서 발견의 문이 열리고, 패시브는 숙달 직업 수에 비례합니다.
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
    // 편력 계보: 숙달 직업 수 관문과 숙달 비례 피해.
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
    // 처치 초기화: 낭인의 기백은 상대를 쓰러뜨리면 전부.
    const r = mk(['roninGrit', 'iaiDraw', 'pierce']); r.cooldowns = { iaiDraw: 3, pierce: 5 }; const t = target({ hp: 1 }); strike(r, t, () => 0, []); assert.ok(t.hp <= 0); assert.equal(r.cooldowns.iaiDraw, 0); assert.equal(r.cooldowns.pierce, 0);
    // 연속 행동 초기화: 시간의 주권은 편성 첫 번째 대기 중인 기술만.
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
