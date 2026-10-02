// v25 ??? 특수 직업: 시계공·시간의 지배자·玄
import { newState, tick, stats, strike, canUse, canChangeJob, effectiveSkill, SKILLS, JOBS, doorsMod as doors, assert, test } from './harness.mjs';
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
