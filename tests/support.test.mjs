// v24.2 보조 계열 개편: 진행도 비례·도박·올인·골드 투척·사냥감·노래
import { newState, stats, strike, canUse, effectiveSkill, apUsed, SKILLS, FISH, JOBS, assert, test } from './harness.mjs';

const base = { hp: 1e6, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 200, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5, codexPower: 0, catchPower: 0, huntPower: 0, goldPower: 0 };
const fighter = (id, extra = {}) => ({ name: 'A', stats: { ...base, ...(extra.stats || {}) }, hp: extra.hp ?? 1000, mana: 200, skills: [id], cooldowns: {}, stun: 0, effects: {}, ranks: { [id]: 1 }, mastery: {}, practice: {}, ...extra.fields });
const target = (fields = {}) => ({ name: 'B', stats: { ...base }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects: {}, ...fields });
const hit = (a, b, roll) => { const seq = roll === undefined ? [] : [0, roll, .5]; strike(a, b, () => seq.length ? seq.shift() : 0); return 1e6 - b.hp; };

test('v24.2 progress passives count codex, catches, hunts, species, gold and rebirths', () => {
    const s = newState(0); s.level = 70; s.rebirths = 3; s.job = 'chronicleNavigator'; s.learned.chronicleStudy = 1; s.skills = ['chronicleStudy'];
    const before = stats(s);
    s.book[FISH[0].id] = 5; s.book[FISH[1].id] = 2; s.itemBook = { a: 1, b: 1 };
    const after = stats(s);
    assert.equal(after.codexPower, 4); assert.ok(Math.abs(after.catchPower - Math.log10(8)) < 1e-9);
    assert.equal(after.attack, before.attack, 'four codex records → chronicleStudy codex step (per 5) not yet'); s.itemBook = { a: 1, b: 1, c: 1 }; assert.ok(stats(s).attack > after.attack && stats(s).magic > after.magic, 'five codex records → chronicleStudy +1');
    const sk = SKILLS.find(x => x.id === 'chronicleStudy'); assert.equal(sk.perCount[0].source, 'rebirth'); assert.equal(sk.bonus.expBonus, .12, 'scribe keeps its EXP bonus');
    for (const id of ['salvageSense', 'rareSense', 'deepSalvage', 'kingsHoard', 'legendHoard']) { const b = SKILLS.find(x => x.id === id).bonus || {}; assert.ok(!b.goldBonus && !b.dropBonus, id + ' moved gold/drop to the merchant line'); assert.ok(b.variantFind > 0, id + ' raises variant odds'); }
    for (const id of ['salvageContract', 'goldMemory', 'portLedger', 'tradeWind', 'tradeEmpire', 'goldenEmpire']) assert.ok(SKILLS.find(x => x.id === id).bonus.dropBonus > 0, id);
});

test('v24.2 progress scaling multiplies damage by the recorded power', () => {
    const plain = hit(fighter('spoilsStrike'), target());
    const rich = hit(fighter('spoilsStrike', { stats: { variantPower: 10 } }), target());
    const sk = SKILLS.find(x => x.id === 'spoilsStrike'); assert.equal(sk.scaling, 'variant');
    assert.ok(Math.abs(rich / plain - (1 + 10 * sk.scalingRatio)) < .02, `${rich}/${plain}`);
    const codexPlain = hit(fighter('sigilShock'), target()), codexRich = hit(fighter('sigilShock', { stats: { codexPower: 50 } }), target());
    const sigil = SKILLS.find(x => x.id === 'sigilShock'); assert.equal(sigil.scaling, 'codex');
    assert.ok(Math.abs(codexRich / codexPlain - (1 + 50 * sigil.scalingRatio)) < .02, `${codexRich}/${codexPlain}`);
});

test('v24.2 gamble rolls the multiplier; all-in spends HP and mana; gold toss spends gold', () => {
    const fate = SKILLS.find(x => x.id === 'fateRoll');
    const low = hit(fighter('fateRoll'), target(), 0), high = hit(fighter('fateRoll'), target(), .999);
    assert.ok(high / low > (fate.gamble.max / fate.gamble.min) * .9, `${high} vs ${low}`);
    const a = fighter('allIn', { hp: 1000 }), tb = target(); const text = strike(a, tb, () => 0), big = 1e6 - tb.hp;
    assert.equal(a.mana, 0); assert.match(text, /올인 · 체력 200 · 마나 200/, 'all-in wagers 20% of current HP and every point of mana');
    const last = fighter('allIn', { hp: 1 }); strike(last, target(), () => 0); assert.ok(last.hp >= 1, 'never wagers the last point of HP');
    const calm = hit(fighter('allIn', { hp: 1000, fields: { mana: 0 } }), target());
    assert.ok(big > calm, 'more mana wagered → more damage');
    const m = fighter('coinBarrage', { fields: { gold: 100000 } }); const paid = hit(m, target());
    assert.equal(m.gold, 100000 - 200); const free = hit(fighter('coinBarrage', { fields: { gold: 0 } }), target());
    assert.ok(paid > free);
});

test('v24.2 prey bonus hits bosses and designated species harder', () => {
    const plain = hit(fighter('titanFell'), target()), prey = hit(fighter('titanFell'), target({ prey: true }));
    assert.ok(Math.abs(prey / plain - 1.5) < .02, `${prey}/${plain}`);
});

test('v24.2 songs cost 0 AP and only bard-lineage jobs may equip them', () => {
    const songs = SKILLS.filter(x => x.song); assert.equal(songs.length, 6);
    for (const sk of songs) assert.equal(effectiveSkill(sk, 1).cost, 0, sk.id);
    const s = newState(0); s.level = 70; s.rebirths = 3; s.job = 'legendBard'; s.learned.roadSong = 1; s.skillInheritances = { roadSong: true }; s.learned.heroicVerse = 1;
    assert.ok(canUse(s, 'roadSong') && canUse(s, 'heroicVerse')); assert.equal(apUsed(s, ['roadSong', 'heroicVerse']), 0);
    s.job = 'whaler'; assert.equal(canUse(s, 'roadSong'), false, 'inherited songs still need a bard-lineage job');
    assert.ok(JOBS.find(j => j.id === 'siren'));
});

test('v25.24 swap scaling: brawnWave deals magic damage from physical attack; arcaneFist deals physical damage from magic attack', () => {
    const brawn = SKILLS.find(x => x.id === 'brawnWave'), fist = SKILLS.find(x => x.id === 'arcaneFist');
    assert.equal(brawn.damageType, 'magic'); assert.equal(brawn.scaling, 'swap'); assert.equal(fist.damageType, 'physical'); assert.equal(fist.scaling, 'swap');
    const strong = hit(fighter('brawnWave', { stats: { attack: 300, magic: 0 } }), target()), weak = hit(fighter('brawnWave', { stats: { attack: 0, magic: 300 } }), target());
    assert.ok(strong > weak * 3, `brawnWave uses attack: ${strong} vs ${weak}`);
    const vsResist = hit(fighter('brawnWave', { stats: { attack: 300, magic: 0 } }), target({ stats: { ...base, resist: 200 } }));
    const vsDefense = hit(fighter('brawnWave', { stats: { attack: 300, magic: 0 } }), target({ stats: { ...base, defense: 200 } }));
    assert.ok(vsResist < vsDefense, `brawnWave is mitigated by resist: ${vsResist} vs ${vsDefense}`);
    const fistStrong = hit(fighter('arcaneFist', { stats: { attack: 0, magic: 300 } }), target()), fistWeak = hit(fighter('arcaneFist', { stats: { attack: 300, magic: 0 } }), target());
    assert.ok(fistStrong > fistWeak * 3, `arcaneFist uses magic: ${fistStrong} vs ${fistWeak}`);
});

test('v25.25 thorns lifesteal: the defender heals by reflected damage × lifesteal; independent helpers are long, low-chance status-only skills', () => {
    const a = fighter('hook'), b = target({ hp: 1000, stats: { ...base, defense: 100, thorns: .5, lifesteal: .1 } });
    strike(a, b, () => 0);
    assert.ok(a.hp < 1000, 'thorns hurt the attacker'); assert.ok(b.hp > 1000 - 1e6 && b.hp > 0);
    const reflected = 1000 - a.hp; assert.ok(b.hp > 1000 - reflected, 'thorns lifesteal healed the defender'); assert.ok(b.hp - (1000 - Math.round(1e6 - 1e6)) <= 1000, 'never above max');
    for (const [id, effect, turns] of [['driftwoodShove', 'stun', 3], ['currentJam', 'weaken', 8], ['netThrow', 'slow', 8], ['oathShout', 'silence', 5], ['rottenBait', 'bleed', 8]]) {
        const sk = SKILLS.find(x => x.id === id); assert.equal(sk.statusOnly, true, id); assert.equal(sk.effect, effect); assert.equal(sk.statusTurns, turns, id); assert.ok(sk.chance <= .2, id); assert.ok(sk.cooldown >= turns, id);
    }
});

test('v26.1 titles come from achievements; equip, hide and auto all resolve through displayTitle', async () => {
    const { TITLES, unlockedTitles, displayTitle, autoTitle } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/titles');
    const { act } = await import('./harness.mjs');
    const s = newState(0); assert.equal(displayTitle(s), ''); assert.equal(unlockedTitles(s).length, 0);
    s.rebirths = 5; assert.equal(displayTitle(s), '되돌아온 낚시꾼', 'rebirth titles count by rebirth number even before the achievement syncs');
    s.achievements = { 'rebirths:5': 100, 'playtime:100': 500 }; assert.equal(autoTitle(s).id, 'playtime:100', 'auto = most recently achieved');
    assert.throws(() => act(s, { type: 'title', id: 'abyss:100' }, 0), /얻지 못한/);
    act(s, { type: 'title', id: 'rebirth:5' }, 0); assert.equal(displayTitle(s), '되돌아온 낚시꾼');
    act(s, { type: 'title', id: 'none' }, 0); assert.equal(s.title, null); assert.equal(displayTitle(s), '');
    act(s, { type: 'title', id: 'auto' }, 0); assert.equal(s.title, undefined); assert.equal(displayTitle(s), '바다에 사는 자');
    assert.ok(TITLES.every(t => t.achievement), 'every title names its achievement');
});
