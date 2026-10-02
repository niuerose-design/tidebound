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
