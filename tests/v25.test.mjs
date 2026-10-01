// v25 ??? 특수 직업: 시계공·시간의 지배자·칠인 수행자
import { newState, strike, canUse, canChangeJob, effectiveSkill, SKILLS, JOBS, doorsMod as doors, assert, test } from './harness.mjs';
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
    const enemy = { ...target(), skills: [] }, me = fighter(['glyphNothing'], { hp: 1 });
    strike({ ...target(), name: 'E', stats: { ...base, attack: 500 } }, me, () => .5); assert.equal(me.hp, 251, '無 nullifies the blow at 1 HP and gives back 25%');
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
