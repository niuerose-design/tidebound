// 세계석 연구 2단계: 기본 신규 12개(해금·한도·효과), 재분배 가방 검사, 온라인·오프라인 정산 일치
import { newState, act, advance, stats, economy, victoryHealRate, drop, researchMastery, shopCost, gambleCost, enhanceCost, reforgeCost, rebirthReward, MIMIC_DATA, NURI_DATA, assert, test } from './harness.mjs';

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
    close(researchDelta(s, 'evasion'), .12); close(researchDelta(s, 'lifesteal'), .1); close(researchFactor(s, 'manaRegen'), 1.5);
    const base = newState(0);
    close(stats(s).crit - stats(base).crit, .1); close(stats(s).lifesteal - stats(base).lifesteal, .1);
    s.permanent.penetration = 1000; s.permanent.lifesteal = 1000; assert.equal(stats(s).penetration, .6); assert.equal(stats(s).lifesteal, .3);
});

test('Research v2: recovery, shop and smith discounts use the state-aware functions', () => {
    // v27.89 환생 5회 미만은 새싹 생존 보조(+5%p)가 붙어 기본 규칙은 환생 5회로 봅니다.
    const s = newState(0); s.rebirths = 5; s.permanent.recovery = 5;
    close(victoryHealRate({ ...s, dungeon: null }), .25); close(victoryHealRate({ ...s, dungeon: { id: 'grotto', wave: 0 } }), .13);
    close(victoryHealRate({ ...newState(0), rebirths: 5, dungeon: null }), .2); close(victoryHealRate({ ...newState(0), dungeon: null }), .25, 'sprout +5%p');
    s.level = 10; const full = shopCost(s), fullGamble = gambleCost(s);
    s.permanent.shop = 10; assert.equal(shopCost(s), Math.floor(full * .8)); assert.equal(gambleCost(s), Math.floor(fullGamble * .8));
    s.gold = 1e6; const before = s.gold; act(s, { type: 'buy', id: 'coat' }, 0); assert.equal(before - s.gold, shopCost(s));
    const item = { id: 'forge', slot: 'coat', rarity: 1, power: 10, level: 10, name: 'forge', affix: { stat: 'hp', name: '생명', value: 15 } };
    s.inventory.push(item); s.permanent.enhance = 15;
    assert.equal(enhanceCost(item), 240); assert.equal(enhanceCost(item, s), 168); assert.equal(reforgeCost(item, s), Math.floor(reforgeCost(item) * .7));
    const g = s.gold; act(s, { type: 'enhance', id: 'forge' }, 0, () => 0); assert.equal(g - s.gold, 168);
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
    // v27.43 기본 6시간 + 2시간/단계.
    assert.equal(economy.offlineCapSeconds(base), 6 * 3600); assert.equal(economy.offlineCapSeconds(long), 12 * 3600);
    assert.equal(base.turn, 6 * 3600 / 2); assert.equal(long.turn, 12 * 3600 / 2);
    assert.equal(base.lastOffline.seconds, 6 * 3600); assert.equal(long.lastOffline.seconds, 12 * 3600);
});

test('Research v2/v27.73: mastery memory adds +3% per rank with an integer carry (1/100) and no random calls', async () => {
    const { masteryMultipliers } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/mastery');
    const s = newState(0); assert.deepEqual(researchMastery(s, 3), { total: 3, extra: 0 }); assert.equal(s.masteryCarry, undefined);
    s.permanent.mastery = 1; let extra = 0; for (let i = 0; i < 100; i++) extra += researchMastery(s, 1).extra;
    assert.equal(extra, 3); assert.equal(s.masteryCarry, 0);
    s.permanent.mastery = 3; assert.deepEqual(researchMastery(s, 7), { total: 7, extra: 0 }); assert.equal(s.masteryCarry, 63);
    s.permanent.mastery = 10; s.masteryCarry = 0; assert.deepEqual(researchMastery(s, 10), { total: 13, extra: 3 });
    s.permanent.mastery = 10; s.masteryCarry = 0; s.account = { species: 10 }; const m = masteryMultipliers(s); assert.ok(Math.abs(m.research - 1.33) < 1e-9, `research ×1.3 × account species ×1.02 → 1.33 (${m.research})`);
});

test('Research v2: online ticks and one offline settlement give the same result with every new research', () => {
    const make = () => {
        const s = newState(0); s.level = 30; s.rebirths = 6; s.hp = 1e9;
        Object.assign(s.permanent, { crit: 5, critDamage: 5, penetration: 5, manaRegen: 5, evasion: 5, lifesteal: 5, recovery: 5, inventory: 2, offline: 3, mastery: 3, shop: 2, enhance: 2 });
        act(s, { type: 'stage', id: 'bay' }, 0); act(s, { type: 'start' }, 0); s.hp = stats(s).hp; return s;
    };
    // 까미는 오프라인 정산 중 확률이 ¼이라(v27.35) 이 비교에서는 끕니다.
    const minLevel = MIMIC_DATA.minLevel, nuriLevel = NURI_DATA.minLevel; MIMIC_DATA.minLevel = 999; NURI_DATA.minLevel = 999;
    const offline = make(), online = make(), end = 3 * 3600_000;
    try {
        advance(offline, end, seeded(42));
        const rng = seeded(42); for (let t = 2000; t <= end; t += 2000) advance(online, t, rng);
    } finally { MIMIC_DATA.minLevel = minLevel; NURI_DATA.minLevel = nuriLevel; }
    const pick = s => ({ turn: s.turn, kills: s.kills, gold: s.gold, exp: s.exp, level: s.level, hp: s.hp, carry: s.masteryCarry, job: s.jobMastery, practice: s.skillPractice, book: s.book, bag: s.inventory.length });
    assert.ok(offline.kills > 100 && (offline.masteryCarry ?? -1) >= 0);
    assert.deepEqual(pick(online), pick(offline));
});

// 세계석 연구 3단계: 특별 연구 5개
import { reward, expMultiplier, metaMod, mimicChanceOf } from './harness.mjs';
const counting = (value = .99) => { const f = () => { f.calls++; return typeof value === 'function' ? value(f.calls) : value; }; f.calls = 0; return f; };

test('Research v3: four special entries match the plan table and sit in the utility special group', () => {
    const table = { tailwindSail: [5, 8, 5, 2, 90], tailwindWindow: [5, 6, 4, 2, 70], sortingNet: [2, 10, 10, 2, 30], messageBottle: [5, 6, 4, 3, 70] };
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
    const s = newState(0); assert.throws(() => act(s, { type: 'autoSell', value: 'on' }, 0), /선별의 눈/);
    s.permanent.sortingNet = 1; act(s, { type: 'autoSell', value: 'on' }, 0); assert.equal(s.autoSell, true);
    // v27.53 드롭은 희귀 이상만: 1단계는 희귀, 2단계는 영웅 이하를 팝니다.
    drop(s, 5, () => 0); assert.equal(s.inventory.length, 1, 'unregistered kind is kept');
    s.itemBook['rod:1'] = true; const gold = s.gold; drop(s, 5, () => 0); assert.equal(s.inventory.length, 1, 'rank 1 sells rare'); assert.ok(s.gold > gold);
    const hero = () => { const v = [.6, 0]; let i = 0; return () => v[i++] ?? 0; }; // 등급 굴림 .6 → 영웅, 부위 굴림 0 → 낚싯대
    s.itemBook['rod:2'] = true; drop(s, 5, hero(), true); assert.equal(s.inventory.at(-1).rarity, 2); assert.equal(s.inventory.length, 2, 'rank 1 keeps hero');
    s.permanent.sortingNet = 2; drop(s, 5, hero(), true); assert.equal(s.inventory.length, 2, 'rank 2 sells hero');
    act(s, { type: 'autoSell', value: 'off' }, 0); drop(s, 5, () => 0); assert.equal(s.inventory.length, 3, 'off keeps everything');
});

test('v25.23 golden fish: multiplies one catch by ten and is recorded; v27.44 everyone rolls a 0.2% base, thief passives add to it', () => {
    const fight = rank => { const s = newState(0); if (rank) { s.level = 40; s.job = 'rareTracker'; s.learned.rareSense = 1; s.skills = ['rareSense']; } s.enemy = { id: 'minnow', name: '달팽이', hp: 0, maxHp: 10, attack: 1, defense: 0, exp: 1, gold: 10, boss: false, stun: 0, skills: [], cooldowns: {}, effects: {}, mana: 0 }; return s; };
    const plain = fight(0), rngPlain = counting(); reward(plain, rngPlain);
    const lucky = fight(1), rngLucky = counting(); reward(lucky, rngLucky);
    assert.equal(rngLucky.calls, rngPlain.calls, 'both roll once now'); assert.equal(lucky.gold, plain.gold); assert.equal(lucky.goldenBook, undefined);
    assert.ok(stats(lucky).goldenFind > stats(plain).goldenFind && stats(plain).goldenFind === .002, 'passive adds to the base');
    assert.equal(research('goldenFish'), undefined, 'golden research removed');
    const gold = fight(1), rngGold = counting(n => n === 1 ? 0 : .99); reward(gold, rngGold);
    assert.equal(gold.gold - 100 /* start gold */, (plain.gold - 100) * 10); assert.equal(gold.goldenBook.minnow, 1);
});

test('v27.60 lucky letter (messageBottle id): +15% mimic and nuri spawn chance per rank, offline bottles gone', () => {
    const make = rank => { const s = newState(0); s.level = 20; s.kills = 500; s.stage = 'brook'; s.tide = MIMIC_DATA.minTier; s.permanent.messageBottle = rank; return s; };
    const roll = mimicChanceOf(MIMIC_DATA.minTier, 0) * 1.5; // 기본 확률 밖, 5단계(×1.75) 안
    const plain = make(0); spawn(plain, () => roll); assert.notEqual(plain.enemy.id, MIMIC_DATA.id);
    const lucky = make(5); spawn(lucky, () => roll); assert.equal(lucky.enemy.id, MIMIC_DATA.id);
    const o = newState(0); o.permanent.messageBottle = 5; act(o, { type: 'start' }, 0); advance(o, 10 * 3600_000, seeded(7));
    assert.ok(o.lastOffline && !('bottles' in o.lastOffline), 'no more offline bottles');
});

// 세계석 연구 4단계: 서약 3개
import { spawn, vowsMod, tick, snapshot, goldMultiplier, dropRate, metaMod as meta, apCapacity, expMultiplier as expMul, SKILLS as ALL_SKILLS } from './harness.mjs';
const vowReady = (research = {}, next = {}) => { const s = newState(0); s.rebirths = 5; s.level = 60; Object.assign(s.permanent, research); s.nextVows = next; return s; };

test('v27.86 vows: research entries, reservation rules (breath on/off, rough·restraint 0~3) and cleanup on full reset', () => {
    for (const id of ['vowAnchor', 'vowBreath', 'vowRough', 'vowRestraint']) { const r = research(id); assert.deepEqual([r.max, r.base, r.step, r.rebirth, r.group], [3, 10, 10, 5, 'vow']); assert.equal(economy.researchSpent(id, 3), 60); }
    const s = newState(0); assert.throws(() => act(s, { type: 'nextVow', id: 'rough', value: '1' }, 0), /연구가 필요/);
    assert.throws(() => act(s, { type: 'nextVow', id: 'anchor', value: 'on' }, 0), /서약을 확인/, 'sleeping anchor is no longer a vow');
    s.permanent.vowRestraint = 1; s.permanent.vowRough = 1; act(s, { type: 'nextVow', id: 'restraint', value: '3' }, 0); act(s, { type: 'nextVow', id: 'rough', value: '2' }, 0);
    assert.deepEqual(s.nextVows, { restraint: 3, rough: 2 }); assert.throws(() => act(s, { type: 'nextVow', id: 'rough', value: '4' }, 0));
    act(s, { type: 'nextVow', id: 'restraint', value: '0' }, 0); act(s, { type: 'nextVow', id: 'rough', value: '0' }, 0); assert.equal(s.nextVows, undefined);
    assert.deepEqual([1, 2, 3].map(r => vowsMod.breathBonus({ permanent: { vowBreath: r } })), [.5, .75, 1]);
    const w = vowReady({ vowRough: 1 }, { rough: 1 }); w.goldenBook = { minnow: 1 }; w.masteryCarry = 3; act(w, { type: 'rebirth' }, 0); assert.ok(w.vows);
    act(w, { type: 'resetData' }, 0); for (const k of ['vows', 'nextVows', 'goldenBook', 'masteryCarry']) assert.equal(w[k], undefined, k);
});

test('v27.86 legacy sleeping-anchor saves: the seal is released (stored exp paid as is) on the next tick and the vow is gone', () => {
    const s = newState(0); s.vows = { anchor: true, seal: { kind: 'stage', id: 'brook', caught: 12, exp: 500 } }; advance(s, 0);
    assert.equal(s.vows.seal, undefined); assert.equal(s.vows.anchor, undefined); assert.ok(s.level > 1 || s.exp >= 500); assert.ok(s.logs.some(l => l.text.includes('+500 EXP')));
});

test('v27.86 random game: research-gated entries per life, random monsters by wave, stake grows per wave, target or leave cashes out, a fall loses everything', () => {
    const s = newState(0); s.rebirths = 6; s.level = 60; s.running = true;
    assert.throws(() => act(s, { type: 'dungeon', id: 'randomGame', value: 'until:3' }, 0), /랜덤게임/);
    s.permanent.vowAnchor = 2;
    act(s, { type: 'dungeon', id: 'randomGame', value: 'until:3' }, 0); assert.equal(s.dungeon.id, 'randomGame'); assert.equal(s.dungeon.until, 3); assert.equal(s.randomGameRuns, 1);
    assert.equal(meta.encounterTier(s), 2, 'wave 1 = difficulty 2'); s.recovery = 0;
    const p0 = s.pearls, e0 = s.essence || 0;
    for (let w = 0; w < 3; w++) { spawn(s, () => .5); assert.equal(s.enemy.exp, 0); assert.equal(s.enemy.gold, 0); s.enemy.hp = 0; reward(s, () => .5); }
    // 3웨이브 판돈: 정수 3+6+9 = 18, 연구 2단계 ×1.5 → 정수 27. 목표 도달로 받고 나와 자동 사냥으로.
    assert.equal(s.dungeon, null); assert.equal((s.essence || 0) - e0, 27); assert.equal(s.pearls, p0); assert.equal(s.running, true);
    act(s, { type: 'dungeon', id: 'randomGame' }, 0); assert.equal(s.dungeon.until, undefined); s.recovery = 0;
    spawn(s, () => .1); s.enemy.hp = 0; reward(s, () => .5); assert.equal(s.dungeon.wave, 1);
    // 쓰러지면 판돈 소멸.
    const e1 = s.essence; s.hp = 1; s.enemy = { id: 'shark', name: 'shark', hp: 1e9, maxHp: 1e9, attack: 1e9, defense: 0, exp: 0, gold: 0, boss: false, stun: 0, skills: [], cooldowns: {}, effects: {}, mana: 0, combatStats: { hp: 1e9, attack: 1e9, defense: 0, crit: 0, accuracy: 5, speed: 999 } };
    tick(s, () => .5); assert.equal(s.dungeon, null); assert.equal(s.essence, e1, 'stake lost on a fall');
    assert.throws(() => act(s, { type: 'dungeon', id: 'randomGame' }, 0), /횟수/, 'rank 2 = two entries per life');
    // 나가기 = 받고 나가기.
    const t = newState(0); t.rebirths = 6; t.level = 60; t.permanent.vowAnchor = 1; act(t, { type: 'dungeon', id: 'randomGame' }, 0); t.recovery = 0;
    for (let w = 0; w < 10; w++) { spawn(t, () => .5); t.enemy.hp = 0; reward(t, () => .5); }
    const tp = t.pearls; act(t, { type: 'leaveDungeon' }, 0); assert.equal(t.pearls, tp, 'v27.86 essence only'); assert.equal(t.essence, 165);
});

test('Vows · one breath: a fall soft-resets the life (online and offline); an unbroken life adds rebirth pearls', () => {
    const s = vowReady({ vowBreath: 1 }, { breath: true }); act(s, { type: 'rebirth' }, 0); assert.equal(s.vows.breath, true);
    s.level = 20; s.gold = 5000; s.pearls = 7; const rebirths = s.rebirths, lifeBonus = s.lifeBonus, deaths = s.deaths;
    s.running = true; s.hp = 1; s.enemy = { id: 'shark', name: 'shark', hp: 1e9, maxHp: 1e9, attack: 1e9, defense: 0, exp: 1, gold: 1, boss: false, stun: 0, skills: [], cooldowns: {}, effects: {}, mana: 0, combatStats: { hp: 1e9, attack: 1e9, defense: 0, crit: 0, accuracy: 5, speed: 999 } };
    tick(s, () => .5);
    assert.equal(s.level, 1); assert.equal(s.gold, 100); assert.equal(s.pearls, 7); assert.equal(s.rebirths, rebirths); assert.equal(s.lifeBonus, lifeBonus);
    assert.equal(s.deaths, deaths + 1); assert.equal(s.vows, undefined); assert.equal(s.running, true); assert.ok(s.logs.some(l => l.text.includes('하드코어')));
    const o = vowReady({ vowBreath: 1 }, { breath: true }); act(o, { type: 'rebirth' }, 0); act(o, { type: 'stage', id: 'brook' }, 0); o.stage = 'trench'; act(o, { type: 'start' }, 0);
    advance(o, 2 * 3600_000, seeded(9)); assert.equal(o.vows, undefined); assert.equal(o.stage, 'brook'); assert.ok(o.kills > 0 || o.deaths > 0);
    const plain = vowReady(), vowed = vowReady({ vowBreath: 3 }); vowed.vows = { breath: true }; const p0 = plain.pearls, v0 = vowed.pearls;
    const base = rebirthReward(plain, stats(plain).rebirthBonus || 0);
    act(plain, { type: 'rebirth' }, 0); act(vowed, { type: 'rebirth' }, 0);
    // 둘 다 같은 업적 보상을 받으므로 차이가 하드코어 보너스(= 기본 세계석)입니다.
    assert.equal((vowed.pearls - v0) - (plain.pearls - p0), base, 'rank 3 doubles rebirth pearls');
});

test('v27.86 strength path (rough): difficulty floor, gear -30/50/70%, recovery -50/75/100%; gold and drops ×(1+0.5n×boost) after the drop cap; snapshot badges', () => {
    const base = newState(0); base.level = 20; base.rebirths = 5; base.equipment.rod = { id: 't', slot: 'rod', rarity: 2, power: 30, level: 20, name: 't', enhance: 0 };
    const rough = structuredClone(base); rough.permanent.vowRough = 1; rough.vows = { rough: 2 };
    spawn(base, () => .3); spawn(rough, () => .3); assert.equal(rough.enemy.maxHp, base.enemy.maxHp, 'enemies are not buffed any more');
    close(goldMultiplier(rough) / goldMultiplier(base), 1, 'below the floor (20) no reward'); rough.tide = 20; base.tide = 20;
    close(goldMultiplier(rough) / goldMultiplier(base), 2); close(dropRate(rough) / dropRate(base), 2);
    rough.permanent.vowRough = 3; close(goldMultiplier(rough) / goldMultiplier(base), 3);
    const gt = {}, bt = {}; stats(rough, gt); stats(base, bt); const gear = t => (t.attack || []).filter(x => x.source === 'equipment').reduce((a, x) => a + x.delta, 0);
    if (gear(bt)) close(gear(gt) / gear(bt), .5, 'gear -50% at step 2');
    close(victoryHealRate(rough) / victoryHealRate(base), .25, 'recovery -75% at step 2');
    rough.vows = { rough: 2, restraint: 1, breath: true }; assert.deepEqual(snapshot(rough).vows, ['breath', 'rough2', 'restraint1']);
    assert.equal('vows' in snapshot(newState(0)), false);
});

test('v27.86 restraint: equip AP -4/-8/-12 (min 1), actives·passives 3/2/1 each, exp ×(1 + 20/40/60% × boost)', async () => {
    const progressionMod = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('systems/progression');
    const s = newState(0); s.rebirths = 10; s.permanent.ap = 12; const ap = apCapacity(s); s.vows = { restraint: 2 }; assert.equal(apCapacity(s), ap - 8);
    const x = newState(0); x.vows = { restraint: 3 }; assert.equal(apCapacity(x), Math.max(1, apCapacity(newState(0)) - 12));
    const actives = ALL_SKILLS.filter(k => k.type === 'active').slice(0, 3).map(k => k.id), passives = ALL_SKILLS.filter(k => k.type === 'passive').slice(0, 3).map(k => k.id);
    const y = newState(0); y.vows = { restraint: 3 };
    assert.ok(progressionMod.overRestraint(y, [actives[0], actives[1]]), 'two actives at step 3'); assert.ok(!progressionMod.overRestraint(y, [actives[0], passives[0]]), 'one of each is fine');
    y.vows = { restraint: 1 }; assert.ok(!progressionMod.overRestraint(y, [...actives, ...passives])); assert.ok(progressionMod.overRestraint(y, [...ALL_SKILLS.filter(k => k.type === 'active').slice(0, 4).map(k => k.id)]));
    const plain = newState(0), vowed = newState(0); vowed.permanent.vowRestraint = 3; vowed.vows = { restraint: 1 };
    close(expMul(vowed) / expMul(plain), 1.4, 'step 1 × research boost 2 = +40%, multiplicative');
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

test('v27.88 every vow is a next-life reservation: reserving rough/restraint/breath never changes the current life', () => {
    const s = newState(0); s.rebirths = 6; s.level = 60; Object.assign(s.permanent, { vowRough: 1, vowRestraint: 1, vowBreath: 1 });
    const ap = apCapacity(s), gold = goldMultiplier(s);
    act(s, { type: 'nextVow', id: 'restraint', value: '3' }, 0); act(s, { type: 'nextVow', id: 'rough', value: '3' }, 0); act(s, { type: 'nextVow', id: 'breath', value: 'on' }, 0);
    assert.equal(s.vows, undefined); assert.equal(apCapacity(s), ap); assert.equal(goldMultiplier(s), gold);
    act(s, { type: 'nextVow', id: 'restraint', value: '0' }, 0); assert.equal(s.vows, undefined);
    act(s, { type: 'rebirth' }, 0); assert.deepEqual(s.vows, { rough: 3, breath: true });
});
