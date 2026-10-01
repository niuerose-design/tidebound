// v24.2 보조 계열 개편: 진행도 비례·도박·올인·골드 투척·사냥감·노래
import { newState, stats, strike, canUse, effectiveSkill, apUsed, SKILLS, FISH, JOBS, assert, test } from './harness.mjs';

const base = { hp: 1e6, attack: 100, magic: 100, defense: 0, resist: 0, crit: 0, accuracy: 5, evasion: 0, speed: 10, mana: 200, manaRegen: 0, penetration: 0, lifesteal: 0, critDamage: 1.5, codexPower: 0, catchPower: 0, huntPower: 0, goldPower: 0 };
const fighter = (id, extra = {}) => ({ name: 'A', stats: { ...base, ...(extra.stats || {}) }, hp: extra.hp ?? 1000, mana: 200, skills: [id], cooldowns: {}, stun: 0, effects: {}, ranks: { [id]: 1 }, mastery: {}, practice: {}, ...extra.fields });
const target = (fields = {}) => ({ name: 'B', stats: { ...base }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects: {}, ...fields });
const hit = (a, b, roll) => { const seq = roll === undefined ? [] : [0, roll, .5]; strike(a, b, () => seq.length ? seq.shift() : 0); return 1e6 - b.hp; };

test('v24.2 progress passives count codex, catches, hunts, species, gold and rebirths', () => {
    const s = newState(0); s.level = 70; s.rebirths = 3; s.job = 'treasureKing'; s.learned.kingsHoard = 1; s.skills = ['kingsHoard'];
    const before = stats(s);
    s.book[FISH[0].id] = 5; s.book[FISH[1].id] = 2; s.itemBook = { a: 1, b: 1 };
    const after = stats(s);
    assert.equal(after.codexPower, 4); assert.ok(Math.abs(after.catchPower - Math.log10(8)) < 1e-9);
    assert.ok(after.attack > before.attack && after.magic > before.magic, 'four codex records → kingsHoard ×4');
    const sk = SKILLS.find(x => x.id === 'chronicleStudy'); assert.equal(sk.perCount[0].source, 'rebirth'); assert.equal(sk.bonus.expBonus, .12, 'scribe keeps its EXP bonus');
    for (const id of ['salvageSense', 'rareSense', 'deepSalvage', 'kingsHoard', 'legendHoard']) { const b = SKILLS.find(x => x.id === id).bonus || {}; assert.ok(!b.goldBonus && !b.dropBonus, id + ' moved gold/drop to the merchant line'); }
    for (const id of ['salvageContract', 'goldMemory', 'portLedger', 'tradeWind', 'tradeEmpire', 'goldenEmpire']) assert.ok(SKILLS.find(x => x.id === id).bonus.dropBonus > 0, id);
});

test('v24.2 progress scaling multiplies damage by the recorded power', () => {
    const plain = hit(fighter('spoilsStrike'), target());
    const rich = hit(fighter('spoilsStrike', { stats: { codexPower: 50 } }), target());
    const sk = SKILLS.find(x => x.id === 'spoilsStrike');
    assert.ok(Math.abs(rich / plain - (1 + 50 * sk.scalingRatio)) < .02, `${rich}/${plain}`);
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
