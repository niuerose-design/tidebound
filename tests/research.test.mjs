// 진주 연구 2단계: 기본 신규 12개(해금·한도·효과), 재분배 가방 검사, 온라인·오프라인 정산 일치
import { newState, act, advance, stats, economy, victoryHealRate, drop, researchMastery, shopCost, gambleCost, enhanceCost, reforgeCost, assert, test } from './harness.mjs';

const NEW = ['crit', 'manaRegen', 'critDamage', 'penetration', 'recovery', 'evasion', 'lifesteal', 'inventory', 'offline', 'mastery', 'shop', 'enhance'];
const research = id => economy.RESEARCH.find(r => r.id === id);
const researchDelta = (s, k) => { const t = {}; stats(s, t); return (t[k] || []).filter(x => x.source === 'research' && x.factor === undefined).reduce((a, x) => a + x.delta, 0); };
const researchFactor = (s, k) => { const t = {}; stats(s, t); return (t[k] || []).filter(x => x.source === 'research' && x.factor !== undefined).reduce((a, x) => a * x.factor, 1); };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
const seeded = seed => { let x = seed >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); };

test('Research v2: 12 new entries match the plan table and are refused before unlock and at the cap', () => {
    const table = { crit: [20, 4, 3, 2, 650], manaRegen: [10, 3, 3, 2, 165], critDamage: [25, 4, 3, 5, 1020], penetration: [15, 5, 4, 5, 495], recovery: [10, 3, 3, 2, 165], evasion: [20, 4, 3, 2, 650], lifesteal: [20, 4, 3, 5, 650], inventory: [8, 3, 3, 2, 108], offline: [12, 3, 2, 2, 168], mastery: [10, 3, 3, 5, 165], shop: [10, 3, 2, 2, 120], enhance: [15, 3, 2, 5, 255] };
    for (const id of NEW) {
        const r = research(id), [max, base, step, rebirth, total] = table[id];
        assert.deepEqual([r.max, r.base, r.step, r.rebirth], [max, base, step, rebirth], id);
        assert.equal(economy.researchSpent(id, max), total, `${id} total pearls`);
        const s = newState(0); s.pearls = 10000; s.rebirths = rebirth - 1;
        assert.throws(() => act(s, { type: 'permanent', id }, 0), /환생/);
        s.rebirths = rebirth; act(s, { type: 'permanent', id }, 0); assert.equal(s.permanent[id], 1);
        s.permanent[id] = max; assert.throws(() => act(s, { type: 'permanent', id }, 0), /한도/);
    }
    assert.deepEqual(economy.RESEARCH.filter(r => r.tab === 'combat' && r.group === 'attack').map(r => r.id), ['attack', 'magicAttack', 'crit', 'manaRegen', 'critDamage', 'penetration']);
    assert.deepEqual(economy.RESEARCH.filter(r => r.tab === 'combat' && r.group === 'defense').map(r => r.id), ['hp', 'guard', 'magicGuard', 'recovery', 'evasion', 'lifesteal']);
});

test('Research v2: stat effects come from the research source and keep the existing caps', () => {
    const s = newState(0);
    Object.assign(s.permanent, { crit: 20, critDamage: 25, penetration: 15, evasion: 20, lifesteal: 20, manaRegen: 10 });
    close(researchDelta(s, 'crit'), .1); close(researchDelta(s, 'critDamage'), .5); close(researchDelta(s, 'penetration'), .15);
    close(researchDelta(s, 'evasion'), .08); close(researchDelta(s, 'lifesteal'), .1); close(researchFactor(s, 'manaRegen'), 1.5);
    const base = newState(0);
    close(stats(s).crit - stats(base).crit, .1); close(stats(s).lifesteal - stats(base).lifesteal, .1);
    s.permanent.penetration = 1000; s.permanent.lifesteal = 1000; assert.equal(stats(s).penetration, .6); assert.equal(stats(s).lifesteal, .3);
});

test('Research v2: recovery, shop and smith discounts use the state-aware functions', () => {
    const s = newState(0); s.permanent.recovery = 5;
    close(victoryHealRate({ ...s, dungeon: null }), .13); close(victoryHealRate({ ...s, dungeon: { id: 'grotto', wave: 0 } }), .09);
    close(victoryHealRate({ ...newState(0), dungeon: null }), .08);
    s.level = 10; const full = shopCost(s), fullGamble = gambleCost(s);
    s.permanent.shop = 10; assert.equal(shopCost(s), Math.floor(full * .8)); assert.equal(gambleCost(s), Math.floor(fullGamble * .8));
    s.gold = 1e6; const before = s.gold; act(s, { type: 'buy', id: 'coat' }, 0); assert.equal(before - s.gold, shopCost(s));
    const item = { id: 'forge', slot: 'coat', rarity: 1, power: 10, level: 10, name: 'forge', affix: { stat: 'hp', name: '생명', value: 15 } };
    s.inventory.push(item); s.permanent.enhance = 15;
    assert.equal(enhanceCost(item), 240); assert.equal(enhanceCost(item, s), 168); assert.equal(reforgeCost(item, s), Math.floor(reforgeCost(item) * .7));
    const g = s.gold; act(s, { type: 'enhance', id: 'forge' }, 0); assert.equal(g - s.gold, 168);
    s.permanent.enhance = 0; assert.equal(enhanceCost(item, s), enhanceCost(item));
});

test('Research v2: bag size grows with the hold; reset refuses when the bag would overflow', () => {
    const s = newState(0); s.permanent.inventory = 2; assert.equal(economy.inventoryCap(s), 70);
    const fill = n => Array.from({ length: n }, (_, i) => ({ id: `b${i}`, slot: 'rod', rarity: 0, power: 3, level: 1, name: 'b' }));
    s.inventory = fill(69); drop(s, 5, () => .5, true); assert.equal(s.inventory.length, 70);
    const gold = s.gold; drop(s, 5, () => .5, true); assert.equal(s.inventory.length, 70); assert.ok(s.gold > gold, 'full bag auto-sells');
    const r = newState(0); r.rebirths = 2; r.permanent.inventory = 2; r.inventory = fill(65);
    assert.throws(() => act(r, { type: 'resetResearch', id: 'utility' }, 0), /장비를 정리하세요/); assert.equal(r.permanent.inventory, 2);
    r.inventory = fill(60); act(r, { type: 'resetResearch', id: 'utility' }, 0); assert.equal(r.permanent.inventory || 0, 0); assert.equal(economy.inventoryCap(r), 60);
});

test('Research v2: long anchor line extends the offline cap by two hours per rank', () => {
    const run = rank => { const s = newState(0); s.permanent.offline = rank; act(s, { type: 'start' }, 0); advance(s, 40 * 3600_000, seeded(3)); return s; };
    const base = run(0), long = run(3);
    assert.equal(economy.offlineCapSeconds(base), 86400); assert.equal(economy.offlineCapSeconds(long), 30 * 3600);
    assert.equal(base.turn, 86400 / 2); assert.equal(long.turn, 30 * 3600 / 2);
    assert.equal(base.lastOffline.seconds, 86400); assert.equal(long.lastOffline.seconds, 30 * 3600);
});

test('Research v2: mastery memory adds +5% per rank with an integer carry and no random calls', () => {
    const s = newState(0); assert.deepEqual(researchMastery(s, 3), { total: 3, extra: 0 }); assert.equal(s.masteryCarry, undefined);
    s.permanent.mastery = 1; let extra = 0; for (let i = 0; i < 20; i++) extra += researchMastery(s, 1).extra;
    assert.equal(extra, 1); assert.equal(s.masteryCarry, 0);
    s.permanent.mastery = 3; assert.deepEqual(researchMastery(s, 7), { total: 8, extra: 1 }); assert.equal(s.masteryCarry, 1);
    s.permanent.mastery = 10; s.masteryCarry = 0; assert.deepEqual(researchMastery(s, 10), { total: 15, extra: 5 });
});

test('Research v2: online ticks and one offline settlement give the same result with every new research', () => {
    const make = () => {
        const s = newState(0); s.level = 30; s.rebirths = 6; s.hp = 1e9;
        Object.assign(s.permanent, { crit: 5, critDamage: 5, penetration: 5, manaRegen: 5, evasion: 5, lifesteal: 5, recovery: 5, inventory: 2, offline: 3, mastery: 3, shop: 2, enhance: 2 });
        act(s, { type: 'stage', id: 'bay' }, 0); act(s, { type: 'start' }, 0); s.hp = stats(s).hp; return s;
    };
    const offline = make(), online = make(), end = 3 * 3600_000;
    advance(offline, end, seeded(42));
    const rng = seeded(42); for (let t = 2000; t <= end; t += 2000) advance(online, t, rng);
    const pick = s => ({ turn: s.turn, kills: s.kills, gold: s.gold, exp: s.exp, level: s.level, hp: s.hp, carry: s.masteryCarry, job: s.jobMastery, practice: s.skillPractice, book: s.book, bag: s.inventory.length });
    assert.ok(offline.kills > 100 && (offline.masteryCarry ?? -1) >= 0);
    assert.deepEqual(pick(online), pick(offline));
});

// 진주 연구 3단계: 특별 연구 5개
import { reward, messageBottles, expMultiplier, metaMod } from './harness.mjs';
const counting = (value = .99) => { const f = () => { f.calls++; return typeof value === 'function' ? value(f.calls) : value; }; f.calls = 0; return f; };

test('Research v3: five special entries match the plan table and sit in the utility special group', () => {
    const table = { tailwindSail: [5, 8, 5, 2, 90], tailwindWindow: [5, 6, 4, 2, 70], sortingNet: [2, 10, 10, 2, 30], messageBottle: [5, 6, 4, 3, 70], goldenFish: [10, 8, 5, 5, 305] };
    for (const [id, [max, base, step, rebirth, total]] of Object.entries(table)) {
        const r = research(id); assert.deepEqual([r.max, r.base, r.step, r.rebirth, r.tab, r.group], [max, base, step, rebirth, 'utility', 'special'], id);
        assert.equal(economy.researchSpent(id, max), total, id);
        const s = newState(0); s.pearls = 1000; s.rebirths = rebirth - 1; assert.throws(() => act(s, { type: 'permanent', id }, 0), /환생/);
    }
});

test('Research v3: tailwind sail and window scale the tailwind bonus, its condition and the rebirth log', () => {
    const s = newState(0); assert.equal(metaMod.tailwindExp(s), .5); assert.equal(metaMod.tailwindWindow(s), 5);
    s.permanent.tailwindSail = 3; s.permanent.tailwindWindow = 2; close(metaMod.tailwindExp(s), .8); assert.equal(metaMod.tailwindWindow(s), 7);
    s.rebirths = 6; s.level = 67; assert.equal(metaMod.nextLifeBonus(s), 'tailwind'); s.level = 68; assert.equal(metaMod.nextLifeBonus(s), null);
    s.level = 67; act(s, { type: 'rebirth' }, 0); assert.equal(s.lifeBonus, 'tailwind'); assert.ok(s.logs.some(l => l.text.includes('경험치 +80%')));
    close(expMultiplier(s) / expMultiplier({ ...s, lifeBonus: null }), 1.8);
});

test('Research v3: sorting net sells only known, low-rarity drops while the setting is on', () => {
    const s = newState(0); assert.throws(() => act(s, { type: 'autoSell', value: 'on' }, 0), /선별의 그물/);
    s.permanent.sortingNet = 1; act(s, { type: 'autoSell', value: 'on' }, 0); assert.equal(s.autoSell, true);
    drop(s, 5, () => 0); assert.equal(s.inventory.length, 1, 'unregistered kind is kept');
    s.itemBook['rod:0'] = true; const gold = s.gold; drop(s, 5, () => 0); assert.equal(s.inventory.length, 1); assert.ok(s.gold > gold);
    s.itemBook['rod:1'] = true; drop(s, 5, () => 0, true); assert.equal(s.inventory.length, 2, 'rank 1 keeps rare');
    s.permanent.sortingNet = 2; drop(s, 5, () => 0, true); assert.equal(s.inventory.length, 2, 'rank 2 sells rare');
    act(s, { type: 'autoSell', value: 'off' }, 0); drop(s, 5, () => 0); assert.equal(s.inventory.length, 3, 'off keeps everything');
});

test('Research v3: golden fish multiplies one catch by ten, is recorded, and draws no random number at rank 0', () => {
    const fight = rank => { const s = newState(0); s.permanent.goldenFish = rank; s.enemy = { id: 'minnow', name: '은빛 피라미', hp: 0, maxHp: 10, attack: 1, defense: 0, exp: 1, gold: 10, boss: false, stun: 0, skills: [], cooldowns: {}, effects: {}, mana: 0 }; return s; };
    const plain = fight(0), rngPlain = counting(); reward(plain, rngPlain);
    const lucky = fight(1), rngLucky = counting(); reward(lucky, rngLucky);
    assert.equal(rngLucky.calls, rngPlain.calls + 1); assert.equal(lucky.gold, plain.gold); assert.equal(lucky.goldenBook, undefined);
    const gold = fight(10), rngGold = counting(n => n === 1 ? 0 : .99); reward(gold, rngGold);
    assert.equal(gold.gold - 100 /* start gold */, (plain.gold - 100) * 10); assert.equal(gold.goldenBook.minnow, 1);
});

test('Research v3: message bottles roll once per full offline hour and never at rank 0', () => {
    const s = newState(0), idle = counting(0); assert.equal(messageBottles(s, 10, idle), null); assert.equal(idle.calls, 0);
    s.permanent.messageBottle = 5; s.level = 20; const seq = [.1, .5, .1, .99, .5, .1, .8], rng = counting(n => seq[n - 1] ?? .5);
    const pearls = s.pearls, gold = s.gold, found = messageBottles(s, 4, rng); // 1시간째 골드, 2시간째 진주, 3시간째 없음, 4시간째 장비
    assert.deepEqual([found.count, found.items, found.pearls], [3, 1, 1]); assert.equal(found.gold, 20 * 500);
    assert.equal(s.pearls - pearls, 1); assert.ok(s.gold - gold >= 20 * 500); assert.equal(s.inventory.length, 1);
    const o = newState(0); o.permanent.messageBottle = 5; act(o, { type: 'start' }, 0); advance(o, 10 * 3600_000, seeded(7));
    assert.ok(o.lastOffline && o.lastOffline.bottles && o.lastOffline.bottles.count <= 10);
    const n = newState(0); act(n, { type: 'start' }, 0); advance(n, 10 * 3600_000, seeded(7)); assert.equal(n.lastOffline.bottles, undefined);
});

// 진주 연구 4단계: 서약 3개
import { spawn, vowsMod, tick, snapshot, goldMultiplier, dropRate, metaMod as meta } from './harness.mjs';
const vowReady = (research = {}, next = {}) => { const s = newState(0); s.rebirths = 5; s.level = 60; Object.assign(s.permanent, research); s.nextVows = next; return s; };
const catchOne = (s, id = 'minnow') => { s.enemy = { id, name: id, hp: 0, maxHp: 10, attack: 1, defense: 0, exp: 10, gold: 10, boss: false, stun: 0, skills: [], cooldowns: {}, effects: {}, mana: 0 }; reward(s, () => .99); };

test('Vows: research entries, reservation rules and cleanup on full reset', () => {
    for (const id of ['vowAnchor', 'vowBreath', 'vowRough']) { const r = research(id); assert.deepEqual([r.max, r.base, r.step, r.rebirth, r.group], [3, 10, 10, 5, 'vow']); assert.equal(economy.researchSpent(id, 3), 60); }
    const s = newState(0); assert.throws(() => act(s, { type: 'nextVow', id: 'anchor', value: 'on' }, 0), /연구가 필요/);
    s.permanent.vowAnchor = 1; s.permanent.vowRough = 1; act(s, { type: 'nextVow', id: 'anchor', value: 'on' }, 0); act(s, { type: 'nextVow', id: 'rough', value: '2' }, 0);
    assert.deepEqual(s.nextVows, { anchor: true, rough: 2 }); assert.throws(() => act(s, { type: 'nextVow', id: 'rough', value: '4' }, 0));
    act(s, { type: 'nextVow', id: 'anchor', value: 'off' }, 0); act(s, { type: 'nextVow', id: 'rough', value: '0' }, 0); assert.equal(s.nextVows, undefined);
    assert.deepEqual([1, 2, 3].map(r => vowsMod.anchorPayout({ permanent: { vowAnchor: r } })), [1.5, 1.75, 2]);
    assert.deepEqual([1, 2, 3].map(r => vowsMod.breathBonus({ permanent: { vowBreath: r } })), [.5, .75, 1]);
    const w = vowReady({ vowRough: 1 }, { rough: 1 }); w.goldenBook = { minnow: 1 }; w.masteryCarry = 3; act(w, { type: 'rebirth' }, 0); assert.ok(w.vows);
    act(w, { type: 'resetData' }, 0); for (const k of ['vows', 'nextVows', 'goldenBook', 'masteryCarry']) assert.equal(w[k], undefined, k);
});

test('Vows · sleeping anchor: level 1 until 300 catches at the target, then stored exp ×1.5; tide locked; give up pays without bonus', () => {
    const s = vowReady({ vowAnchor: 1 }, { anchor: true }); act(s, { type: 'rebirth' }, 0, () => 0);
    assert.deepEqual(s.vows.seal, { kind: 'stage', id: 'brook', caught: 0, exp: 0 }); assert.deepEqual(s.nextVows, { anchor: true }, 'reservation stays for later lives');
    assert.throws(() => act(s, { type: 'tide', id: '1' }, 0), /잠든 닻/); s.tide = 3; assert.equal(meta.encounterTier(s), 0); s.tide = 0;
    s.stage = 'bay'; catchOne(s); const per = s.vows.seal.exp; assert.ok(per > 0); assert.equal(s.vows.seal.caught, 0, 'catches elsewhere do not count');
    s.stage = 'brook'; for (let i = 0; i < 299; i++) catchOne(s);
    assert.equal(s.level, 1); assert.equal(s.exp, 0); assert.equal(s.vows.seal.caught, 299);
    catchOne(s); const expected = Math.floor(per * 301 * 1.5);
    assert.equal(s.vows.seal, null); assert.ok(s.level > 1); assert.ok(s.logs.some(l => l.text.includes(`+${expected} EXP`)));
    const g = vowReady({ vowAnchor: 3 }, { anchor: true }); act(g, { type: 'rebirth' }, 0, () => 0); g.stage = 'brook';
    for (let i = 0; i < 50; i++) catchOne(g); const stored = g.vows.seal.exp;
    act(g, { type: 'anchorGiveUp' }, 0); assert.equal(g.vows.seal, null); assert.ok(g.logs.some(l => l.text.includes(`+${stored} EXP`))); assert.ok(g.level > 1);
    assert.throws(() => act(g, { type: 'anchorGiveUp' }, 0));
    const none = vowReady(); const rng = counting(); act(none, { type: 'rebirth' }, 0, rng); assert.equal(rng.calls, 0); assert.equal(none.vows, undefined);
});

test('Vows · one breath: a fall soft-resets the life (online and offline); an unbroken life adds rebirth pearls', () => {
    const s = vowReady({ vowBreath: 1 }, { breath: true }); act(s, { type: 'rebirth' }, 0); assert.equal(s.vows.breath, true);
    s.level = 20; s.gold = 5000; s.pearls = 7; const rebirths = s.rebirths, lifeBonus = s.lifeBonus, deaths = s.deaths;
    s.running = true; s.hp = 1; s.enemy = { id: 'shark', name: 'shark', hp: 1e9, maxHp: 1e9, attack: 1e9, defense: 0, exp: 1, gold: 1, boss: false, stun: 0, skills: [], cooldowns: {}, effects: {}, mana: 0, combatStats: { hp: 1e9, attack: 1e9, defense: 0, crit: 0, accuracy: 5, speed: 999 } };
    tick(s, () => .5);
    assert.equal(s.level, 1); assert.equal(s.gold, 100); assert.equal(s.pearls, 7); assert.equal(s.rebirths, rebirths); assert.equal(s.lifeBonus, lifeBonus);
    assert.equal(s.deaths, deaths + 1); assert.equal(s.vows, undefined); assert.equal(s.running, true); assert.ok(s.logs.some(l => l.text.includes('한 번의 숨')));
    const o = vowReady({ vowBreath: 1 }, { breath: true }); act(o, { type: 'rebirth' }, 0); act(o, { type: 'stage', id: 'brook' }, 0); o.stage = 'trench'; act(o, { type: 'start' }, 0);
    advance(o, 2 * 3600_000, seeded(9)); assert.equal(o.vows, undefined); assert.equal(o.stage, 'brook'); assert.ok(o.kills > 0 || o.deaths > 0);
    const plain = vowReady(), vowed = vowReady({ vowBreath: 3 }); vowed.vows = { breath: true }; const p0 = plain.pearls, v0 = vowed.pearls;
    act(plain, { type: 'rebirth' }, 0); act(vowed, { type: 'rebirth' }, 0);
    const base = plain.pearls - p0; assert.equal(vowed.pearls - v0, base + base, 'rank 3 doubles rebirth pearls');
});

test('Vows · rough sea: enemies ×(1+0.5n), gold and drops ×(1+0.5n×boost); snapshot carries ranking badges', () => {
    const base = newState(0); base.level = 20; spawn(base, () => .3);
    const rough = newState(0); rough.level = 20; rough.permanent.vowRough = 1; rough.vows = { rough: 2 }; spawn(rough, () => .3);
    assert.equal(rough.enemy.id, base.enemy.id); assert.equal(rough.enemy.maxHp, Math.round(base.enemy.maxHp * 2)); assert.equal(rough.enemy.combatStats.attack, Math.round(base.enemy.combatStats.attack * 2));
    close(goldMultiplier(rough) / goldMultiplier(base), 2); close(dropRate(rough) / dropRate(base), 2);
    rough.permanent.vowRough = 3; close(goldMultiplier(rough) / goldMultiplier(base), 3);
    rough.vows = { rough: 2, anchor: true, breath: true }; assert.deepEqual(snapshot(rough).vows, ['anchor', 'breath', 'rough2']);
    assert.equal('vows' in snapshot(base), false);
});

// 계승 스킬 레벨 조건 면제
import { canUse, SKILLS } from './harness.mjs';
test('Inherited skills skip the level requirement; other skills explain why they cannot be equipped', () => {
    const sk = SKILLS.find(x => x.job && x.level >= 25 && x.type === 'active' && !x.rebirth && !x.unlockJobMastery);
    const s = newState(0); s.level = 60; s.rebirths = 3; s.learned[sk.id] = 3; s.skillInheritances = { [sk.id]: true };
    act(s, { type: 'rebirth' }, 0); assert.equal(s.level, 1); assert.equal(canUse(s, sk.id), true);
    act(s, { type: 'skill', id: sk.id }, 0); assert.ok(s.skills.includes(sk.id));
    const native = SKILLS.find(x => x.job === 'fisher' && x.level > 1 && !x.rebirth && !x.unlockJobMastery) || SKILLS.find(x => !x.job && x.level > 1);
    const n = newState(0); n.learned[native.id] = 1;
    assert.throws(() => act(n, { type: 'skill', id: native.id }, 0), new RegExp(`Lv\\.${native.level}부터`));
    const other = newState(0); assert.throws(() => act(other, { type: 'skill', id: sk.id }, 0), /전직하거나/);
});
