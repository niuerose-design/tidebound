// v24.2 보조 계열 개편: 진행도 비례·도박·올인·골드 투척·사냥감·노래
import { newState, stats, strike, canUse, effectiveSkill, apUsed, SKILLS, FISH, JOBS, assert, test, diceMultiplier, diceRange } from './harness.mjs';

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
    const sk = SKILLS.find(x => x.id === 'chronicleStudy'); assert.equal(sk.perCount[0].source, 'rebirth'); assert.equal(sk.bonus.expBonus, .18, 'scribe keeps its EXP bonus (v3.83 ×1.5)');
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
    assert.ok(a.hp < 1000, 'thorns hurt the attacker');
    const reflected = 1000 - a.hp; assert.ok(b.hp > 1000 - reflected, 'thorns lifesteal healed the defender'); assert.ok(b.hp > 0 && b.hp <= b.stats.hp, 'never above max');
    for (const [id, effect, turns] of [['driftwoodShove', 'stun', 3], ['currentJam', 'weaken', 8], ['netThrow', 'slow', 8], ['oathShout', 'silence', 5], ['rottenBait', 'poison', 8]]) {
        const sk = SKILLS.find(x => x.id === id); assert.equal(sk.statusOnly, true, id); assert.equal(sk.effect, effect); assert.equal(sk.statusTurns, turns, id); assert.ok(sk.chance <= .2, id); assert.ok(sk.cooldown >= turns, id);
    }
});

test('v26.1 titles come from achievements; equip, hide and auto all resolve through displayTitle', async () => {
    const { TITLES, unlockedTitles, displayTitle, autoTitle } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/titles');
    const { act } = await import('./harness.mjs');
    const s = newState(0); assert.equal(displayTitle(s), '🌱 초심자', 'everyone starts with the sprout title'); assert.equal(unlockedTitles(s).length, 1);
    s.rebirths = 5; assert.equal(displayTitle(s), '되돌아온 모험가', 'rebirth titles count by rebirth number even before the achievement syncs');
    s.achievements = { 'rebirths:5': 100, 'playtime:100': 500 }; assert.equal(autoTitle(s).id, 'playtime:100', 'auto = most recently achieved');
    assert.throws(() => act(s, { type: 'title', id: 'abyss:100' }, 0), /얻지 못한/);
    act(s, { type: 'title', id: 'rebirth:5' }, 0); assert.equal(displayTitle(s), '되돌아온 모험가');
    act(s, { type: 'title', id: 'none' }, 0); assert.equal(s.title, null); assert.equal(displayTitle(s), '');
    act(s, { type: 'title', id: 'auto' }, 0); assert.equal(s.title, undefined); assert.equal(displayTitle(s), '메이플 월드에 사는 자');
    assert.ok(TITLES.every(t => t.achievement || t.id === 'novice'), 'every earned title names its achievement');
});

test('v26.1 server events multiply exp/gold/drop while active and are stamped into the state by advance()', async () => {
    const { activeEvent, eventLabel } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/events');
    const { expMultiplier, goldMultiplier, dropRate } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/stats');
    const { advance } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/turn');
    const ev = [{ id: 'x', name: '테스트', from: '2026-01-01T00:00:00+09:00', until: '2026-01-02T00:00:00+09:00', exp: 2, gold: 1.5, mastery: 2 }];
    assert.equal(activeEvent(Date.parse('2025-12-31T00:00:00+09:00'), ev), null);
    const live = activeEvent(Date.parse('2026-01-01T12:00:00+09:00'), ev); assert.equal(live.exp, 2); assert.equal(live.gold, 1.5); assert.equal(live.drop, 1); assert.equal(live.mastery, 2); assert.match(eventLabel(live), /경험치 ×2 · 골드 ×1.5 · 숙련 ×2 · 1\/2까지/);
    const s = newState(0); const base = [expMultiplier(s), goldMultiplier(s), dropRate(s)]; s.event = live;
    assert.ok(Math.abs(expMultiplier(s) / base[0] - 2) < 1e-9); assert.ok(Math.abs(goldMultiplier(s) / base[1] - 1.5) < 1e-9); assert.ok(Math.abs(dropRate(s) - base[2]) < 1e-9, 'drop ×1 stays');
    const t = newState(0); advance(t, Date.parse('2030-01-01T00:00:00Z')); assert.equal(t.event, null, 'no event far in the future → null stamped');
});

test('v26.2 attr scaling: 외길 actives add the allocated attribute × ratio, so a luck-only fisher deals damage', () => {
    const sk = SKILLS.find(x => x.id === 'luckyBreak'); assert.equal(sk.scaling, 'attr'); assert.equal(sk.scalingAttribute, 'luk');
    const none = hit(fighter('luckyBreak', { stats: { attack: 20, attrLuk: 0 } }), target()), lucky = hit(fighter('luckyBreak', { stats: { attack: 20, attrLuk: 100 } }), target());
    assert.ok(none <= 2, 'attack alone contributes nothing (v26.4)'); assert.ok(lucky >= 100 * sk.scalingRatio * sk.multiplier * .09 && lucky <= 100 * sk.scalingRatio * sk.multiplier * 3.4, `${lucky} (dice ×0.1~3.33 of ${100 * sk.scalingRatio * sk.multiplier})`);
    const s = newState(0); s.attributes.luk = 60; assert.equal(stats(s).attrLuk, 65, 'attrLuk mirrors base 5 + allocated');
});

test('v26.2 ranked duel allowance: 20 per day, 3 per opponent, 1-minute cooldown; practice is free', async () => {
    const { duelAllowance, rankedDuelBlock, recordRankedDuel } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/duel');
    const s = newState(0); const now = Date.parse('2026-10-03T12:00:00+09:00'); s.lastDuel = 0;
    assert.equal(rankedDuelBlock(s, now, 'x'), ''); assert.equal(duelAllowance(s, now).left, 20);
    for (let i = 0; i < 3; i++) recordRankedDuel(s, now, 'x');
    assert.match(rankedDuelBlock(s, now, 'x'), /같은 상대/); assert.equal(rankedDuelBlock(s, now, 'y'), ''); assert.equal(duelAllowance(s, now).left, 17);
    for (let i = 0; i < 17; i++) recordRankedDuel(s, now, 'y' + i);
    assert.match(rankedDuelBlock(s, now, 'z'), /모두 썼습니다/);
    const tomorrow = Date.parse('2026-10-04T00:01:00+09:00'); assert.equal(rankedDuelBlock(s, tomorrow, 'x'), '', 'resets at KST midnight');
    s.lastDuel = now; assert.match(rankedDuelBlock(s, now + 1000, 'q'), /한 번/);
});

test('v26.3 healOnly: 회복 heals without attacking (no hit roll, no damage, no thorns); luck gives no attack', () => {
    const sk = SKILLS.find(x => x.id === 'breath'); assert.equal(sk.healOnly, true); assert.equal(sk.multiplier, 0);
    const a = fighter('breath', { hp: 400 }), b = target({ stats: { ...base, thorns: .5, defense: 100 } });
    const text = strike(a, b, () => 0);
    assert.equal(b.hp, 1e6, 'no damage'); assert.ok(a.hp > 400, 'healed'); assert.match(text, /회복/);
    const plain = fighter('breath', { hp: 400 }); strike(plain, target(), () => 0); assert.equal(a.hp, plain.hp, 'no thorns damage taken');
    const s = newState(0); const before = stats(s).attack; s.attributes.luk = 100; assert.equal(stats(s).attack, before, 'luck adds no attack'); assert.ok(stats(s).crit > 0);
});

test('v26.6 dice: luck lane rolls more dice with more luck; the highest face maps 1→×low … 6→×high, and finger cutting narrows both ends', () => {
    const sk = SKILLS.find(x => x.id === 'luckyBreak'); assert.equal(sk.name, '럭키 세븐'); assert.deepEqual(sk.dice, { attribute: 'luk', per: 40, max: 3, low: .1, high: 3.33 });
    const seq = [0, .99, 0]; const t1 = target(); const text = strike(fighter('luckyBreak', { stats: { attrLuk: 10 } }), t1, () => seq.length ? seq.shift() : 0);
    assert.match(text, /주사위 ⚅ ×3.33/, text);
    const seq2 = [0, 0, 0, .5, 0]; const t2 = target(); const text2 = strike(fighter('luckyBreak', { stats: { attrLuk: 100 } }), t2, () => seq2.length ? seq2.shift() : 0);
    assert.match(text2, /주사위 ⚀⚀⚃ ×0.82/, text2);
    assert.ok(Math.abs(diceMultiplier(sk.dice, 1) - .1) < 1e-9); assert.ok(Math.abs(diceMultiplier(sk.dice, 6) - 3.33) < 1e-9);
    // 각 차수는 양 끝이 더 벌어집니다.
    const lane = ['luckyBreak', 'heavenlyStrike', 'fateReversal', 'heavenlyDice'].map(id => SKILLS.find(x => x.id === id).dice);
    for (let i = 1; i < lane.length; i++) { assert.ok(lane[i].low < lane[i - 1].low, 'lower floor'); assert.ok(lane[i].high > lane[i - 1].high, 'higher ceiling'); assert.ok(lane[i].max > lane[i - 1].max, 'more dice'); }
    // 손가락 자르기: 최저는 오르고 최고는 내려감. 3단계는 거의 일정.
    const r1 = diceRange(sk.dice, 1), r3 = diceRange(sk.dice, 3); assert.ok(r1.low > .1 && r1.high < 3.33); assert.ok(r3.low > r1.low && r3.high < r1.high); assert.ok(r3.high / r3.low < 1.6, `${r3.low}~${r3.high}`);
    const cuts = ['fingerCutI', 'fingerCutII', 'fingerCutIII'].map(id => SKILLS.find(x => x.id === id)); assert.deepEqual(cuts.map(c => c.bonus.diceTrim), [1, 2, 3]); assert.deepEqual(cuts.map(c => c.job), ['luckyAngler', 'fortunate', 'fortuneChild']);
    const seq3 = [0, .99, 0]; const text3 = strike(fighter('luckyBreak', { stats: { attrLuk: 10, diceTrim: 3 } }), target(), () => seq3.length ? seq3.shift() : 0);
    assert.match(text3, new RegExp(`주사위 ⚅ ×${r3.high.toFixed(2)}`), text3);
    const s = newState(0); s.level = 10; s.job = 'luckyAngler'; s.unlockedJobs.push('luckyAngler'); s.learned.fingerCutI = 1; s.skills = ['fingerCutI']; assert.ok(canUse(s, 'fingerCutI')); assert.ok(stats(s).diceTrim >= 1, 'equipped passive feeds diceTrim');
});

test('v26.5 focus hunting refuses a fish gated behind a higher sea difficulty instead of silently going random', async () => {
    const { act } = await import('./harness.mjs');
    const s = newState(0); s.level = 40; s.rebirths = 1; act(s, { type: 'stage', id: 'moon' }, 0);
    act(s, { type: 'target', id: 'moonfish' }, 0); assert.equal(s.target, 'moonfish');
    assert.throws(() => act(s, { type: 'target', id: 'eclipseMoonfish' }, 0), /난이도 20/);
    const reef = newState(0); reef.level = 30; act(reef, { type: 'stage', id: 'reef' }, 0); act(reef, { type: 'target', id: 'stormBarracuda' }, 0); assert.equal(reef.target, 'stormBarracuda', 'v26.6 아이언 호그는 조건 없이 저격 가능');
});

test('v26.7 magic attacks take half of the target evasion and never a negative tempo', async () => {
    const { hitChance } = await import('./harness.mjs');
    const me = { accuracy: 1, evasion: 0, speed: 10 }, swift = { accuracy: 1, evasion: .18, speed: 17 };
    const physical = hitChance(me, swift), magic = hitChance(me, swift, true);
    assert.ok(physical < .8, `physical ${physical}`); assert.ok(magic > .9 && magic < .92, `magic ${magic}`);
    assert.equal(hitChance(me, { accuracy: 1, evasion: 0, speed: 10 }, true), hitChance(me, { accuracy: 1, evasion: 0, speed: 10 }), 'no evasion → same');
    assert.ok(hitChance({ ...me, speed: 20 }, swift, true) > magic, 'faster still gains the plus side of tempo');
});

test('v27.2 thorns scale with swarm size, ignore half of attacker defense, and tank passives raise swarm encounter odds', async () => {
    const { SKILL_FORMULA, variantChances } = await import('./harness.mjs');
    const tank = () => ({ name: 'T', stats: { ...base, defense: 100, thorns: .4 }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects: {} });
    const foe = (swarm) => ({ name: 'F', stats: { ...base, attack: 50, defense: 100 }, hp: 1e6, skills: [], cooldowns: {}, stun: 0, effects: {}, mana: 100, ...(swarm ? { swarm } : {}) });
    const t1 = tank(), f1 = foe(); strike(f1, t1, () => .5); const single = 1e6 - f1.hp;
    const t2 = tank(), f2 = foe(100); strike(f2, t2, () => .5); const crowd = 1e6 - f2.hp;
    assert.ok(single >= 1, 'thorns fired'); assert.ok(Math.abs(crowd / single - (1 + Math.log2(100))) < .15, `×100 swarm reflects (1+log2 100)≈7.6x: ${crowd}/${single}`);
    assert.equal(single, Math.round(100 * .4 * 100 / (100 + 100 * 2 * (1 - SKILL_FORMULA.thornsPierce))), 'attacker defense counted at thornsPierce');
    const s = newState(0); s.level = 30; s.unlockedJobs.push('gatekeeper'); s.job = 'gatekeeper'; s.learned.spikedShield = 1;
    const before = variantChances(s).swarm; s.skills = ['spikedShield']; assert.ok(canUse(s, 'spikedShield')); const after = variantChances(s).swarm;
    assert.ok(Math.abs(after / before - 1.5) < 1e-6, `실드 오브 라이트 +50% 무리 조우: ${before} → ${after}`);
});

test('v27.6 limit break: needs full mastery, practice multiples and SP; pushes growth past max, adds chance, stage 3 cuts AP; survives rebirth copy', async () => {
    const { act } = await import('./harness.mjs'); const { limitBreakNext, maxSkillLevel, masteryMilestonesFor, skillLevel, skillMastery } = await import('./harness.mjs');
    const sk = SKILLS.find(x => x.id === 'hook'); const max = maxSkillLevel(sk), last = masteryMilestonesFor(sk).at(-1);
    const s = newState(0); s.sp = 20; s.learned.hook = 1;
    assert.throws(() => act(s, { type: 'limitBreak', id: 'hook' }, 0), /실전 숙련/);
    s.skillPractice.hook = last; assert.throws(() => act(s, { type: 'limitBreak', id: 'hook' }, 0), /한계의 문/, 'v27.31 needs pearl research'); s.permanent.limitBreak = 3;
    assert.throws(() => act(s, { type: 'limitBreak', id: 'hook' }, 0), /실전 숙련 .* 필요/);
    s.skillPractice.hook = last * 2; const base = effectiveSkill(sk, 1, skillMastery(s, 'hook'));
    act(s, { type: 'limitBreak', id: 'hook' }, 0); assert.equal(s.limitBreaks.hook, 1); assert.equal(s.sp, 18);
    const e1 = effectiveSkill(sk, 1, skillMastery(s, 'hook')); assert.equal(skillLevel(sk, 1, skillMastery(s, 'hook')), max + 1);
    const step = (sk.rankEffects?.chanceIncrease ?? .015) + .025; assert.ok(e1.multiplier > base.multiplier && Math.abs(e1.chance - base.chance - step) < 1e-9, `chance +${step}: ${base.chance} → ${e1.chance}`);
    assert.ok(!limitBreakNext(s, 'hook').ok, 'stage 2 needs 4x practice'); s.skillPractice.hook = last * 8;
    act(s, { type: 'limitBreak', id: 'hook' }, 0); act(s, { type: 'limitBreak', id: 'hook' }, 0); assert.equal(s.limitBreaks.hook, 3); assert.equal(s.sp, 18 - 3 - 4);
    const e3 = effectiveSkill(sk, 1, skillMastery(s, 'hook')); assert.equal(e3.cost, Math.max(1, (sk.cost ?? 2)) - 1, 'stage 3 AP -1'); assert.throws(() => act(s, { type: 'limitBreak', id: 'hook' }, 0), /최대 단계/);
});
