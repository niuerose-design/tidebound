// 세계석 연구 2단계: 기본 신규 12개(해금·한도·효과), 재분배 가방 검사, 온라인·오프라인 정산 일치
import { newState, act, advance, rawAdvance, stats, economy, victoryHealRate, drop, researchMastery, gambleCost, enhanceCost, reforgeCost, rebirthReward, MIMIC_DATA, NURI_DATA, assert, test } from './harness.mjs';

const NEW = ['crit', 'manaRegen', 'critDamage', 'penetration', 'recovery', 'evasion', 'lifesteal', 'offline', 'mastery', 'enhance']; // v3.154 inventory(넓은 가방) 삭제
const research = id => economy.RESEARCH.find(r => r.id === id);
const researchDelta = (s, k) => { const t = {}; stats(s, t); return (t[k] || []).filter(x => x.source === 'research' && x.factor === undefined).reduce((a, x) => a + x.delta, 0); };
const researchFactor = (s, k) => { const t = {}; stats(s, t); return (t[k] || []).filter(x => x.source === 'research' && x.factor !== undefined).reduce((a, x) => a * x.factor, 1); };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
const seeded = seed => { let x = seed >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); };

test('Research v2: 10 new entries (v3.38 shop removed) match the plan table and are refused before unlock and at the cap', () => {
    const table = { crit: [20, 4, 3, 2, 650], manaRegen: [10, 3, 3, 2, 165], critDamage: [25, 2, 2, 5, 722], penetration: [15, 5, 4, 5, 495], recovery: [10, 3, 3, 2, 165], evasion: [20, 4, 3, 2, 650], lifesteal: [20, 4, 3, 5, 650], offline: [3, 30, 30, 2, 180], mastery: [10, 3, 3, 5, 165], enhance: [15, 3, 2, 5, 255] }; // v3.42 치명 피해 21~25단계는 ×1.06 복리(전 가격 1,020)
    for (const id of NEW) {
        const r = research(id), [max, base, step, rebirth, total] = table[id];
        assert.deepEqual([r.max, r.base, r.step, r.rebirth], [max, base, step, rebirth], id);
        assert.equal(economy.researchSpent(id, max), total, `${id} total pearls`);
        const s = newState(0); s.pearls = 10000; s.rebirths = rebirth - 1;
        assert.throws(() => act(s, { type: 'permanent', id }, 0), /환생/);
        s.rebirths = rebirth; act(s, { type: 'permanent', id }, 0); assert.equal(s.permanent[id], 1);
        s.permanent[id] = max; assert.throws(() => act(s, { type: 'permanent', id }, 0), /한도/);
    }
    assert.deepEqual(economy.RESEARCH.filter(r => r.tab === 'combat' && r.group === 'attack').map(r => r.id), ['attack', 'magicAttack', 'mana', 'crit', 'manaRegen', 'critDamage', 'penetration']);
    assert.deepEqual(economy.RESEARCH.filter(r => r.tab === 'combat' && r.group === 'defense').map(r => r.id), ['hp', 'guard', 'magicGuard', 'recovery', 'evasion', 'lifesteal']);
});

test('Research v2: stat effects come from the research source and keep the existing caps', () => {
    const s = newState(0);
    Object.assign(s.permanent, { crit: 20, critDamage: 25, penetration: 15, evasion: 20, lifesteal: 20, manaRegen: 10 });
    close(researchDelta(s, 'crit'), .1); close(researchDelta(s, 'critDamage'), .5); close(researchDelta(s, 'penetration'), .45); // v3.84 단계당 3%
    close(researchDelta(s, 'evasion'), .12); close(researchDelta(s, 'lifesteal'), .1); close(researchFactor(s, 'manaRegen'), 1.5);
    const base = newState(0);
    close(stats(s).crit - stats(base).crit, .1); close(stats(s).lifesteal - stats(base).lifesteal, .1);
    s.permanent.penetration = 1000; s.permanent.lifesteal = 1000; assert.equal(stats(s).penetration, .85); /* v3.84 상한 0.6 → 합계 0.85 */
    { const s0 = structuredClone(s); s0.permanent.lifesteal = 0; close(stats(s).lifesteal, Math.min(.3, stats(s0).lifesteal) + 5); } // v3.150 연구분은 30% 상한 밖
});

test('Research v2: recovery and smith discounts use the state-aware functions', () => {
    // v27.89 환생 5회 미만은 새싹 생존 보조(+5%p)가 붙어 기본 규칙은 환생 5회로 봅니다.
    const s = newState(0); s.rebirths = 5; s.permanent.recovery = 5;
    close(victoryHealRate({ ...s, dungeon: null }), .25); close(victoryHealRate({ ...s, dungeon: { id: 'grotto', wave: 0 } }), .13);
    close(victoryHealRate({ ...newState(0), rebirths: 5, dungeon: null }), .2); close(victoryHealRate({ ...newState(0), dungeon: null }), .25, 'sprout +5%p');
    s.level = 10; const fullGamble = gambleCost(s);
    s.permanent.shop = 10; assert.equal(gambleCost(s), fullGamble, 'v3.38 상점 단골 삭제'); s.gold = 1e6;
    const item = { id: 'forge', slot: 'coat', rarity: 1, power: 10, level: 10, name: 'forge', affix: { stat: 'hp', name: '생명', value: 15 } };
    s.inventory.push(item); s.permanent.enhance = 15;
    assert.equal(enhanceCost(item), 240); assert.equal(enhanceCost(item, s), 168); assert.equal(reforgeCost(item, s), Math.floor(reforgeCost(item) * .7));
    const g = s.gold; act(s, { type: 'enhance', id: 'forge' }, 0, () => 0); assert.equal(g - s.gold, 168);
    s.permanent.enhance = 0; assert.equal(enhanceCost(item, s), enhanceCost(item));
});

test('Research v2 → v3.154: the bag is a flat 100 slots (no research), drops auto-sell at the cap, and a utility reset no longer checks the bag', () => {
    const s = newState(0); s.permanent.inventory = 2; assert.equal(economy.inventoryCap(), 100, 'legacy rank is ignored');
    const fill = n => Array.from({ length: n }, (_, i) => ({ id: `b${i}`, slot: 'rod', rarity: 0, power: 3, level: 1, name: 'b' }));
    s.inventory = fill(99); drop(s, 5, () => .5, true); assert.equal(s.inventory.length, 100);
    const gold = s.gold; drop(s, 5, () => .5, true); assert.equal(s.inventory.length, 100); assert.ok(s.gold > gold, 'full bag auto-sells');
    const r = newState(0); r.rebirths = 2; r.permanent.offline = 1; r.inventory = fill(100);
    act(r, { type: 'resetResearch', id: 'utility' }, 0); assert.equal(r.permanent.offline || 0, 0); assert.equal(r.inventory.length, 100, 'bag untouched by the reset');
});

test('Research v2 → v3.154: long rest extends the offline cap by six hours per rank (3 ranks → 24 hours)', () => {
    // 첫 분할만 돌려 정산할 전체 턴(지금 턴 + 남은 턴)으로 상한을 확인합니다(전에는 6·12시간을 끝까지 돌려 13초).
    const run = rank => { const s = newState(0); s.permanent.offline = rank; act(s, { type: 'start' }, 0); rawAdvance(s, 40 * 3600_000, seeded(3)); return s; };
    const base = run(0), long = run(3);
    // v27.43 기본 6시간 + v3.154 6시간/단계.
    assert.equal(economy.offlineCapSeconds(base), 6 * 3600); assert.equal(economy.offlineCapSeconds(long), 24 * 3600);
    assert.equal(base.turn + base.catchUpLeft, 6 * 3600 / 2); assert.equal(long.turn + long.catchUpLeft, 24 * 3600 / 2);
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
        Object.assign(s.permanent, { crit: 5, critDamage: 5, penetration: 5, manaRegen: 5, evasion: 5, lifesteal: 5, recovery: 5, inventory: 2, offline: 3, mastery: 3, enhance: 2 });
        act(s, { type: 'stage', id: 'bay' }, 0); act(s, { type: 'start' }, 0); s.hp = stats(s).hp; return s;
    };
    // 까미는 오프라인 정산 중 확률이 ¼이라(v27.35) 이 비교에서는 끕니다.
    const minLevel = MIMIC_DATA.minLevel, nuriLevel = NURI_DATA.minLevel; MIMIC_DATA.minLevel = 999; NURI_DATA.minLevel = 999;
    // 20분이면 처치 100마리와 숙련 나머지(masteryCarry)를 넘깁니다.
    const offline = make(), online = make(), end = 20 * 60_000;
    try {
        advance(offline, end, seeded(42));
        const rng = seeded(42); for (let t = 2000; t <= end; t += 2000) advance(online, t, rng);
    } finally { MIMIC_DATA.minLevel = minLevel; NURI_DATA.minLevel = nuriLevel; }
    const pick = s => ({ turn: s.turn, kills: s.kills, gold: s.gold, exp: s.exp, level: s.level, hp: s.hp, carry: s.masteryCarry, job: s.jobMastery, practice: s.skillPractice, book: s.book, bag: s.inventory.length });
    assert.ok(offline.kills > 100 && (offline.masteryCarry ?? -1) >= 0);
    assert.deepEqual(pick(online), pick(offline));
});

// 세계석 연구 3단계: 특별 연구 5개
import { reward, expMultiplier, metaMod, mimicChanceOf, migrateState } from './harness.mjs';
const counting = (value = .99) => { const f = () => { f.calls++; return typeof value === 'function' ? value(f.calls) : value; }; f.calls = 0; return f; };

test('Research v3: three special entries match the plan table and sit in the utility special group', () => {
    const table = { tailwindSail: [5, 8, 5, 2, 90], sortingNet: [2, 10, 10, 2, 30], messageBottle: [10, 6, 4, 3, 240] }; // v3.31 행운의 편지 최대 10단계(6~10단계는 승천 후)
    for (const [id, [max, base, step, rebirth, total]] of Object.entries(table)) {
        const r = research(id); assert.deepEqual([r.max, r.base, r.step, r.rebirth, r.tab, r.group], [max, base, step, rebirth, 'utility', 'special'], id);
        assert.equal(economy.researchSpent(id, max), total, id);
        const s = newState(0); s.pearls = 1000; s.rebirths = rebirth - 1; assert.throws(() => act(s, { type: 'permanent', id }, 0), /환생/);
    }
});

test('Research v3.23: tailwind sail raises the additive bonus, the over-target wall stays at ×1.6', () => {
    const s = newState(0); assert.equal(metaMod.tailwindExp(s), .5); close(metaMod.xpWall(s).growth, 1.6);
    s.permanent.tailwindSail = 3; close(metaMod.tailwindExp(s), .8);
    s.rebirths = 6; s.level = 67; act(s, { type: 'rebirth' }, 0); assert.ok(s.logs.some(l => l.text.includes('경험치 +80%')));
    const e = stats(s).expBonus; close(expMultiplier(s) / expMultiplier({ ...s, level: metaMod.tailwindLevel(s) }), (1 + e + .8) / (1 + e)); // v3.227 직전 생 최고 레벨(67)까지
});

test('Research v3: sorting net dismantles only known, low-rarity drops into essence while the setting is on', () => {
    const s = newState(0); assert.throws(() => act(s, { type: 'autoSell', value: 'on' }, 0), /자동 정리/);
    s.permanent.sortingNet = 1; act(s, { type: 'autoSell', value: 'on' }, 0); assert.equal(s.autoSell, true);
    // v27.53 드롭은 희귀 이상만: 1단계는 희귀, 2단계는 영웅 이하를 팝니다.
    drop(s, 5, () => 0); assert.equal(s.inventory.length, 1, 'unregistered kind is kept');
    s.itemBook['rod:1'] = true; const gold = s.gold, essence = s.essence || 0; drop(s, 5, () => 0); assert.equal(s.inventory.length, 1, 'rank 1 dismantles rare'); assert.equal(s.gold, gold, 'no gold'); assert.equal((s.essence || 0) - essence, 2, 'rare → essence 2');
    const hero = () => { const v = [.6, 0]; let i = 0; return () => v[i++] ?? 0; }; // 등급 굴림 .6 → 영웅, 부위 굴림 0 → 낚싯대
    s.itemBook['rod:2'] = true; drop(s, 5, hero(), true); assert.equal(s.inventory.at(-1).rarity, 2); assert.equal(s.inventory.length, 2, 'rank 1 keeps hero');
    s.permanent.sortingNet = 2; drop(s, 5, hero(), true); assert.equal(s.inventory.length, 2, 'rank 2 sells hero');
    act(s, { type: 'autoSell', value: 'off' }, 0); drop(s, 5, () => 0); assert.equal(s.inventory.length, 3, 'off keeps everything');
});

test('v25.23 golden monsters: multiplies one catch by ten and is recorded; v27.44 everyone rolls a 0.2% base, thief passives add to it', () => {
    const fight = rank => { const s = newState(0); if (rank) { s.level = 40; s.job = 'rareTracker'; s.learned.rareSense = 1; s.skills = ['rareSense']; } s.enemy = { id: 'minnow', name: '달팽이', hp: 0, maxHp: 10, attack: 1, defense: 0, exp: 1, gold: 10, boss: false, stun: 0, skills: [], cooldowns: {}, effects: {}, mana: 0 }; return s; };
    const plain = fight(0), rngPlain = counting(); reward(plain, rngPlain);
    const lucky = fight(1), rngLucky = counting(); reward(lucky, rngLucky);
    assert.equal(rngLucky.calls, rngPlain.calls, 'both roll once now'); assert.ok(lucky.gold >= plain.gold, 'v3.156 메소 마스터리 gives kill gold, never less'); assert.equal(lucky.goldenBook, undefined);
    assert.ok(stats(lucky).goldenFind > stats(plain).goldenFind && stats(plain).goldenFind === .002, 'passive adds to the base');
    assert.equal(research('goldenFish'), undefined, 'golden research removed');
    const gold = fight(1), rngGold = counting(n => n === 1 ? 0 : .99); reward(gold, rngGold);
    assert.equal(gold.gold - 100 /* start gold */, (lucky.gold - 100) * 10 /* v3.156 same body (메소 마스터리 kill gold) × 10 */); assert.equal(gold.goldenBook.minnow, 1);
});

test('v27.60 lucky letter (messageBottle id): +15% mimic and nuri spawn chance per rank', () => {
    const make = rank => { const s = newState(0); s.level = 20; s.kills = 500; s.stage = 'brook'; s.tide = MIMIC_DATA.minTier; s.permanent.messageBottle = rank; return s; };
    const roll = mimicChanceOf(MIMIC_DATA.minTier, 0) * 1.5; // 기본 확률 밖, 5단계(×1.75) 안
    const plain = make(0); spawn(plain, () => roll); assert.notEqual(plain.enemy.id, MIMIC_DATA.id);
    const lucky = make(5); spawn(lucky, () => roll); assert.equal(lucky.enemy.id, MIMIC_DATA.id);
    // v3.287 편지 · 이벤트(제단 축복) 보너스는 곱하지 않고 더합니다: 5단계(+75%) + 축복 ×3(+200%) = ×3.75(전에는 ×5.25).
    const both = make(5); both.event = { mimic: 3 }; const inBand = mimicChanceOf(MIMIC_DATA.minTier, 0) * 3.7, outBand = mimicChanceOf(MIMIC_DATA.minTier, 0) * 3.8;
    spawn(both, () => inBand); assert.equal(both.enemy.id, MIMIC_DATA.id, 'inside 3.75x');
    const over = make(5); over.event = { mimic: 3 }; spawn(over, () => outBand); assert.notEqual(over.enemy.id, MIMIC_DATA.id, 'not multiplied to 5.25x');
});

// 세계석 연구 4단계: 서약 3개
import { spawn, vowsMod, tick, snapshot, goldMultiplier, dropRate, apCapacity, expMultiplier as expMul, SKILLS as ALL_SKILLS } from './harness.mjs';
const vowReady = (research = {}, next = {}) => { const s = newState(0); s.rebirths = 5; s.level = 60; Object.assign(s.permanent, research); s.nextVows = next; return s; };

test('v27.86 vows: research entries, reservation rules (breath on/off, rough·restraint 0~3) and cleanup on full reset', () => {
    for (const id of ['vowBreath', 'vowRough', 'vowRestraint']) { const r = research(id); assert.deepEqual([r.max, r.base, r.step, r.rebirth, r.group], [3, 10, 10, 5, 'vow']); assert.equal(economy.researchSpent(id, 3), 60); }
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

test('v3.209 random game removed: research refunded (paid ranks only), records and a run in progress cleared', () => {
    assert.equal(research('vowAnchor'), undefined);
    const s = newState(0); s.permanent.vowAnchor = 3; s.researchGranted = { vowAnchor: 1 }; s.randomGameRuns = 2; s.randomGameDay = 'x'; s.randomGameStats = { best: 9, runs: 4, cashed: 2 };
    s.dungeon = { id: 'randomGame', wave: 3 }; s.running = true; const p = s.pearls;
    const m = migrateState(s);
    assert.equal(m.pearls - p, 20 + 30, 'ranks 2 and 3 refunded, the free ascension rank is not');
    assert.equal(m.permanent.vowAnchor, undefined); assert.equal(m.randomGameStats, undefined); assert.equal(m.randomGameRuns, undefined); assert.equal(m.dungeon, null);
    assert.equal(migrateState(m).pearls, m.pearls, 'only once');
});

test('Vows · one breath: a fall soft-resets the life (online and offline); an unbroken life adds rebirth pearls', () => {
    const s = vowReady({ vowBreath: 1 }, { breath: true }); act(s, { type: 'rebirth' }, 0); assert.equal(s.vows.breath, true);
    s.level = 20; s.gold = 5000; s.pearls = 7; const rebirths = s.rebirths, deaths = s.deaths;
    s.running = true; s.hp = 1; s.enemy = { id: 'shark', name: 'shark', hp: 1e9, maxHp: 1e9, attack: 1e9, defense: 0, exp: 1, gold: 1, boss: false, stun: 0, skills: [], cooldowns: {}, effects: {}, mana: 0, combatStats: { hp: 1e9, attack: 1e9, defense: 0, crit: 0, accuracy: 5, speed: 999 } };
    tick(s, () => .5);
    assert.equal(s.level, 1); assert.equal(s.gold, 100); assert.equal(s.pearls, 7); assert.equal(s.rebirths, rebirths);
    assert.equal(s.deaths, deaths + 1); assert.equal(s.vows, undefined); assert.equal(s.running, true); assert.ok(s.logs.some(l => l.text.includes('하드코어')));
    const o = vowReady({ vowBreath: 1 }, { breath: true }); act(o, { type: 'rebirth' }, 0); act(o, { type: 'stage', id: 'brook' }, 0); o.stage = 'trench'; act(o, { type: 'start' }, 0);
    // 깊은 사냥터에서는 10분 안에 쓰러집니다(2시간을 돌리던 것을 줄임).
    advance(o, 10 * 60_000, seeded(9)); assert.equal(o.vows, undefined); assert.equal(o.stage, 'brook'); assert.ok(o.kills > 0 || o.deaths > 0);
    const plain = vowReady(), vowed = vowReady({ vowBreath: 3 }); vowed.vows = { breath: true }; const p0 = plain.pearls, v0 = vowed.pearls;
    const base = rebirthReward(plain);
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

test('v3.24 auto vend sells known low-rarity drops for gold; v3.38 one research (자동 정리) opens both; v3.35 it can run together with the auto dismantler (dismantler wins on the same grade)', () => {
    const s = newState(0); assert.throws(() => act(s, { type: 'autoVend', value: 'on' }, 0), /자동 정리/);
    s.permanent.sortingNet = 1; s.itemBook['rod:1'] = true;
    act(s, { type: 'autoVend', value: 'on' }, 0); assert.equal(s.autoVend, true);
    const gold = s.gold, essence = s.essence || 0; drop(s, 5, () => 0); assert.equal(s.inventory.length, 0); assert.ok(s.gold > gold, 'sold for gold'); assert.equal(s.essence || 0, essence);
    act(s, { type: 'autoSell', value: 'on' }, 0); assert.equal(s.autoVend, true, 'both can be on');
    const e0 = s.essence || 0, g0 = s.gold; drop(s, 5, () => 0); assert.ok((s.essence || 0) > e0 && s.gold === g0, 'same default grade: dismantler first');
    s.level = 30; act(s, { type: 'rebirth' }, 0); s.level = 35; act(s, { type: 'rebirth' }, 0); assert.equal(s.autoVend, true, 'kept across rebirth');
});

test('v3.35 auto devices pick several grades: rank 1 up to legendary, rank 2 up to ancient, one device per grade, primordial/onyx/locked never processed', () => {
    const rarityRng = r => { for (let v = 0; v < 1; v += .0005) { const t = newState(0); drop(t, 5, (() => { const q = [v, 0]; let i = 0; return () => q[i++] ?? 0; })(), true); if (t.inventory[0]?.rarity === r) return () => { const q = [v, 0]; let i = 0; return () => q[i++] ?? 0; }; } throw Error(`no roll for ${r}`); };
    const s = newState(0); s.level = 200; s.permanent.sortingNet = 1;
    for (let r = 1; r <= 5; r++) s.itemBook[`rod:${r}`] = true;
    assert.throws(() => act(s, { type: 'autoGrade', id: 'salvage', value: '4' }, 0), /전설까지/);
    assert.throws(() => act(s, { type: 'autoGrade', id: 'nope', value: '1' }, 0), /고르세요/);
    act(s, { type: 'autoGrade', id: 'salvage', value: '2' }, 0); act(s, { type: 'autoGrade', id: 'salvage', value: '3' }, 0);
    assert.deepEqual(s.autoSellGrades, [1, 2, 3]); act(s, { type: 'autoGrade', id: 'vend', value: '1' }, 0);
    assert.deepEqual([s.autoVendGrades, s.autoSellGrades], [[1], [2, 3]], 'one device per grade');
    act(s, { type: 'autoSell', value: 'on' }, 0); act(s, { type: 'autoVend', value: 'on' }, 0);
    const legend = rarityRng(3), e0 = s.essence || 0; drop(s, 5, legend(), true); assert.equal(s.inventory.length, 0, 'legendary dismantled'); assert.ok((s.essence || 0) > e0);
    const g0 = s.gold; drop(s, 5, rarityRng(1)(), true); assert.ok(s.gold > g0, 'rare sold');
    s.permanent.sortingNet = 2; act(s, { type: 'autoGrade', id: 'salvage', value: '5' }, 0); assert.deepEqual(s.autoSellGrades, [2, 3, 5]);
    act(s, { type: 'autoGrade', id: 'salvage', value: '3' }, 0); drop(s, 5, legend(), true); assert.equal(s.inventory.at(-1).rarity, 3, 'unpicked grade is kept');
    assert.throws(() => act(s, { type: 'autoGrade', id: 'salvage', value: '6' }, 0), /고를 수 없는/, 'primordial (onyx) cannot be picked');
    // 칠흑·잠금 장비는 등급과 상관없이 남깁니다(칠흑은 원래 드롭 경로가 아니지만 한 번 더 막음).
    s.permanent.sortingNet = 0; assert.deepEqual(economy.autoGrades(s, 'salvage'), [], 'no research, no grades');
});

test('v3.38 research cleanup refunds paid ranks once: dungeon vault, shop regular, and the vend half of auto sort', () => {
    const s = newState(0); s.version = 8; s.pearls = 0;
    s.permanent.dungeon = 3; s.permanent.shop = 2; s.permanent.sortingNet = 2; s.permanent.autoVend = 1; s.autoVend = true;
    migrateState(s, 0);
    // 상점 단골 3+5 = 8, 자동 판매기 1단계 10(자동 정리 2단계는 그대로) → 18. v3.261 dungeon은 지금의 ‘던전 탐험 I’이라 그대로 둡니다.
    assert.equal(s.pearls, 18); assert.equal(s.permanent.sortingNet, 2); assert.equal('autoVend' in s.permanent, false); assert.equal(s.permanent.dungeon, 3); assert.equal('shop' in s.permanent, false);
    assert.equal(s.autoVend, true, 'sell mode stays'); migrateState(s, 0); assert.equal(s.pearls, 18, 'once');
    const v = newState(0); v.version = 8; v.pearls = 0; v.permanent.autoVend = 2; migrateState(v, 0); assert.equal(v.permanent.sortingNet, 2); assert.equal(v.pearls, 0, 'vend-only rank moves over, nothing to refund');
    const g = newState(0); g.version = 8; g.pearls = 0; g.permanent.sortingNet = 2; g.permanent.autoVend = 2; g.researchGranted = { sortingNet: 2, autoVend: 2, limitBreak: 0 }; migrateState(g, 0);
    assert.equal(g.pearls, 0, 'ascension-granted ranks are free'); assert.deepEqual(g.researchGranted, { sortingNet: 2, limitBreak: 0 });
});

test('v3.24 removed research tailwindWindow refunds every pearl once', () => {
    const s = newState(0); s.permanent.tailwindWindow = 3; const p = s.pearls;
    migrateState(s); assert.equal(s.pearls - p, 6 + 10 + 14); assert.equal(s.permanent.tailwindWindow, undefined);
    migrateState(s); assert.equal(s.pearls - p, 30, 'only once');
});

test('v3.90 max mana: base grows with level, research ‘마나 강화 I’ ×(1 + 8%/rank), account · rebirth multipliers, coat/cape mana, ~0.2 of max HP', () => {
    const s = newState(0);
    const lv1 = stats(s).mana; s.level = 11; assert.equal(stats(s).mana - lv1, 30, '+3 per level');
    const r = research('mana'); assert.deepEqual([r.max, r.base, r.step, r.rebirth || 0, r.tab, r.group], [200, 2, 2, 0, 'combat', 'attack']);
    s.permanent.mana = 10; close(researchFactor(s, 'mana'), 1.8);
    const t = {}; s.rebirths = 100; stats(s, t); assert.ok(t.mana.some(x => x.source === 'rebirth' && x.factor > 1), 'rebirth memory multiplies mana');
    const coat = { id: 'c', slot: 'coat', style: 'balanced', rarity: 0, power: 100, level: 100, name: 'c', affixes: [] };
    const bare = newState(0); bare.equipment.coat = null; const before = stats(bare).mana; bare.equipment.coat = coat; assert.ok(stats(bare).mana > before, 'coat gives max mana');
    // 같은 연구를 찍은 균형 캐릭터는 최대 마나가 최대 체력의 약 0.2배입니다.
    const b = newState(0); b.level = 100; b.rebirths = 100; Object.assign(b.attributes, { int: 120, wis: 60, vit: 60, str: 30, dex: 30 }); Object.assign(b.permanent, { hp: 100, mana: 100 });
    const st = stats(b), ratio = st.mana / st.hp; assert.ok(ratio > .15 && ratio < .35, `mana/hp ${ratio.toFixed(3)}`);
});

test('v3.99 enemy label in combat logs: swarm ×N, variant mark + name, [보스] / [칠흑] tags; battle lines and kill line use it', async () => {
    const { enemyLabel, tick: tk } = await import('./harness.mjs');
    const base = { id: 'minnow', name: '스포아' };
    assert.equal(enemyLabel(base), '스포아');
    assert.equal(enemyLabel({ ...base, swarm: 100, variant: 'swarm' }), '스포아 ×100');
    assert.equal(enemyLabel({ ...base, swarm: 500, variant: 'swarm' }), '스포아 ×500');
    assert.equal(enemyLabel({ ...base, variant: 'giant' }), '◆ 거대 개체 스포아');
    assert.equal(enemyLabel({ ...base, name: '자쿰', boss: true }), '[보스] 자쿰');
    assert.equal(enemyLabel({ ...base, name: '검은 마법사', boss: true, onyx: 'onyxBlackMage' }), '[칠흑] 검은 마법사');
    const s = newState(0); s.running = true;
    s.enemy = { id: 'minnow', name: '스포아', hp: 5, maxHp: 5, attack: 1, defense: 0, exp: 1, gold: 1, boss: false, stun: 0, skills: [], cooldowns: {}, effects: {}, mana: 0, swarm: 100, variant: 'swarm', born: 0 };
    for (let i = 0; i < 5 && s.enemy?.swarm; i++) tk(s, () => .5);
    const lines = s.logs.map(l => l.text);
    assert.ok(lines.some(t => t.includes('스포아 ×100')), `labelled: ${lines.slice(-6).join(' / ')}`);
});

test('v3.154 bag research retired (cap 100, pearls refunded), long rest rescaled to 3 x 6h, auto-claim research claims achievements and codex rewards after an action', () => {
    assert.equal(economy.inventoryCap(), 100); assert.equal(research('inventory'), undefined);
    assert.deepEqual([research('offline').max, research('offline').base, research('offline').step, research('offline').per], [3, 30, 30, 6]);
    assert.equal(economy.offlineCapSeconds({ permanent: { offline: 3 } }), 21600 + 3 * 21600);
    const s = newState(0); s.pearls = 0; s.permanent.inventory = 8; s.permanent.offline = 12; s.researchGranted = { inventory: 8, offline: 12, limitBreak: 0 }; s.researchPlan = { on: false, items: [{ id: 'inventory', to: 8 }, { id: 'offline', to: 12 }] }; delete s.offlineRescaled; // 옛 세이브
    migrateState(s);
    assert.equal(s.permanent.inventory, undefined); assert.equal(s.pearls, 108, 'bag pearls refunded'); assert.equal(s.permanent.offline, 3); assert.equal(s.researchGranted.offline, 3); assert.equal(s.researchGranted.inventory, undefined);
    assert.deepEqual(s.researchPlan.items, [{ id: 'offline', to: 3 }]); assert.equal(s.offlineRescaled, true);
    migrateState(s); assert.equal(s.pearls, 108, 'idempotent'); assert.equal(s.permanent.offline, 3);
    const t = newState(0); t.permanent.offline = 5; delete t.offlineRescaled; migrateState(t); assert.equal(t.permanent.offline, 2, 'ceil(5 / 3)');
    const u = newState(0); u.pearls = 0; u.kills = 1000;
    act(u, { type: 'sync' }, 0);
    assert.ok(Object.keys(u.achievements).length > 0 && u.pearls === 0, 'without the research achievements wait for a manual claim');
    u.permanent.autoClaim = 1; act(u, { type: 'sync' }, 0);
    assert.ok(u.pearls > 0, 'auto-claim pays the pearls'); assert.ok(u.logs.some(l => l.text.includes('자동 수령 · 업적 보상')));
    assert.ok(Object.keys(u.achievements).every(id => u.achievementClaims[id]), 'nothing left unclaimed');
});

test('v3.160 whistle: SP 5 forces the next hunting-ground spawn to be the mimic or nuri, three per day, not in dungeons', () => {
    const s = newState(0); s.level = 60; s.kills = 2000; s.sp = 20; s.stage = 'brook'; s.whistleDay = undefined;
    act(s, { type: 'whistle', id: 'mimic' }, 0);
    assert.equal(s.sp, 15); assert.equal(s.whistle, 'mimic'); assert.equal(s.whistleDay.used, 1);
    assert.throws(() => act(s, { type: 'whistle', id: 'nuri' }, 0), /이미 호루라기/);
    act(s, { type: 'start' }, 0); rawAdvance(s, 2000, seeded(1));
    assert.equal(s.enemy?.id, MIMIC_DATA.id, 'next spawn is the mimic'); assert.equal(s.whistle, undefined, 'consumed');
    act(s, { type: 'pause' }, 0);
    act(s, { type: 'whistle', id: 'nuri' }, 0); delete s.whistle; act(s, { type: 'whistle', id: 'nuri' }, 0); delete s.whistle;
    assert.throws(() => act(s, { type: 'whistle', id: 'nuri' }, 0), /하루 3번/);
    s.sp = 4; assert.throws(() => act(s, { type: 'whistle', id: 'mimic' }, 86_400_000 * 2 + 1), /SP가 부족/, 'a new day resets the count but SP 5 is still needed');
    s.sp = 5; act(s, { type: 'whistle', id: 'mimic' }, 86_400_000 * 2 + 1); assert.equal(s.whistleDay.used, 1, 'new day count'); assert.equal(s.sp, 0);
    const t = newState(0); t.level = 5; t.sp = 10; assert.throws(() => act(t, { type: 'whistle', id: 'mimic' }, 0), /Lv\.10/);
    // v3.162 정수의 슬라임도 부를 수 있습니다(Lv.30 · 처치 500). 다음 출현이 슬라임이고 난이도 조건은 보지 않습니다.
    const u = newState(0); u.level = 60; u.kills = 2000; u.sp = 5; u.stage = 'brook'; u.tide = 0;
    act(u, { type: 'whistle', id: 'slime' }, 0); assert.equal(u.whistle, 'slime'); assert.equal(u.sp, 0);
    act(u, { type: 'start' }, 0); rawAdvance(u, 2000, seeded(2)); assert.equal(u.enemy?.id, 'essenceSlime', 'next spawn is the essence slime at difficulty 0'); assert.equal(u.whistle, undefined);
    const v = newState(0); v.level = 29; v.kills = 2000; v.sp = 5; assert.throws(() => act(v, { type: 'whistle', id: 'slime' }, 0), /Lv\.30/);
});

test('v3.160 reenlist: only at the top rank, resets rank exp and perks, adds a permanent promotion point per reenlistment and shows a star', async () => {
    const { RANK_CUMULATIVE, rankPointsEarned, rankTitle, isTopRank } = await (await import('../scripts/lib/game-modules.mjs')).loadGame().load('data/rank');
    const s = newState(0); s.rank = { exp: RANK_CUMULATIVE.at(-1) - 1, perks: { drill: 3 } };
    assert.throws(() => act(s, { type: 'reenlist' }, 0), /중장에서만/);
    s.rank.exp = RANK_CUMULATIVE.at(-1); assert.ok(isTopRank(s)); const before = rankPointsEarned(s);
    s.running = true; assert.throws(() => act(s, { type: 'reenlist' }, 0), /자동 사냥/); s.running = false;
    act(s, { type: 'reenlist' }, 0);
    assert.deepEqual(s.rank, { exp: 0, perks: {}, reenlist: 1 }); assert.equal(rankPointsEarned(s), 1, 'private + 1 permanent point'); assert.equal(rankTitle(s), '이등병 ★1');
    s.rank.exp = RANK_CUMULATIVE.at(-1); assert.equal(rankPointsEarned(s), before + 1); act(s, { type: 'reenlist' }, 0); assert.equal(s.rank.reenlist, 2); assert.equal(rankPointsEarned(s), 2);
    act(s, { type: 'sync' }, 0); assert.ok('reenlist:1' in s.achievements, 'honor achievement');
});

test('v3.161 essence slime: shares the special roll right after the nuri band, pays bundle × tier essence, not before Lv.30 / difficulty 10', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const Enc = await L.load('systems/encounter'), Sl = await L.load('data/essence-slime');
    const make = (level = 80) => { const s = newState(0); s.level = level; s.kills = 5000; s.stage = 'brook'; s.tide = 10; s.running = true; s.skills = ['hook']; return s; };
    const c = Enc.specialChances(make());
    assert.ok(c.slimeP > 0 && Math.abs(c.slimeP - Sl.slimeChance(10)) < 1e-12, 'slime band = base + 10 × per tier');
    assert.deepEqual(c.king, { mimic: 0, nuri: 0, slime: 0 }, 'no king before 30 small ones');
    assert.equal(Enc.pickSpecial(c.mimicP + c.nuriP + c.slimeP / 2, c), 'slime'); assert.equal(Enc.pickSpecial(c.mimicP + c.nuriP + c.slimeP * 1.01, c), undefined);
    const s = make(); Enc.spawn(s, () => c.mimicP + c.nuriP + c.slimeP / 2);
    assert.equal(s.enemy.id, Sl.ESSENCE_SLIME.id); assert.equal(s.enemy.name, '정수의 슬라임'); assert.equal(s.enemy.leavesAt, undefined, 'the small slime does not run away');
    s.enemy.hp = 0; s.essence = 0; Enc.reward(s, () => .99);
    assert.equal(s.essence, Sl.slimeBundle(10) * Sl.ESSENCE_SLIME.tiers[2].mul, 'jackpot: bundle 2 × 40'); assert.equal(s.book.essenceSlime, 1); assert.ok(s.logs.some(l => l.text.includes('정수의 슬라임 · 대당첨')));
    { const t = make(Sl.ESSENCE_SLIME.minLevel - 1); assert.equal(Enc.specialChances(t).slimeP, 0, 'not below Lv.30'); }
    { const t = make(); t.tide = Sl.ESSENCE_SLIME.minTier - 1; assert.equal(Enc.specialChances(t).slimeP, 0, 'not below difficulty 10'); }
    { const t = make(); t.away = true; assert.ok(Math.abs(Enc.specialChances(t).slimeP - c.slimeP * Sl.ESSENCE_SLIME.offlineScale) < 1e-12, 'v3.189 half rate offline'); }
    assert.equal(Sl.slimeBundle(100), 11); assert.equal(Sl.slimeBundle(0), 1);
});

test('v3.161 kings: after 30 small ones a share of that special becomes the king, with a bigger body, an escape timer and a guaranteed triple jackpot', async () => {
    const L = (await import('../scripts/lib/game-modules.mjs')).loadGame();
    const Enc = await L.load('systems/encounter'), K = await L.load('data/king'), Mi = await L.load('data/mimic'), N = await L.load('data/exp-nuri'), Sl = await L.load('data/essence-slime');
    const make = () => { const s = newState(0); s.level = 80; s.kills = 5000; s.stage = 'brook'; s.tide = 10; s.running = true; s.skills = ['hook']; s.hp = 1e9; s.book = { masteryMimic: K.KING.minBookKills, expNuri: K.KING.minBookKills - 1, essenceSlime: K.KING.minBookKills }; return s; };
    const c = Enc.specialChances(make());
    assert.deepEqual(c.king, { mimic: K.KING.share, nuri: 0, slime: K.KING.share }, 'king share only where the small-one count is reached');
    assert.equal(Enc.pickSpecial(0, c), 'kingMimic'); assert.equal(Enc.pickSpecial(c.mimicP * K.KING.share * 1.01, c), 'mimic', 'past the king sub-band it is the plain mimic');
    assert.equal(Enc.pickSpecial(c.mimicP, c), 'nuri', 'nuri not ready for kings'); assert.equal(Enc.pickSpecial(c.mimicP + c.nuriP, c), 'kingSlime');
    // 몸집 · 도망 턴 · 보상(대왕 까미)
    const small = make(); Enc.spawn(small, () => 1, 'mimic'); const s = make(); Enc.spawn(s, () => 0);
    assert.equal(s.enemy.id, K.KING.mimic.id); assert.equal(s.enemy.name, '대왕 까미'); assert.ok(s.enemy.boss, 'shown as a boss');
    assert.ok(Math.abs(s.enemy.maxHp / small.enemy.maxHp - K.KING.hp) < .01, 'hp = small one × 4 (rounding aside): ' + s.enemy.maxHp / small.enemy.maxHp); assert.ok(s.enemy.attack > small.enemy.attack * 2, 'hits harder');
    assert.equal(s.enemy.leavesAt, s.turn + K.KING.turns, 'leaves after 80 turns');
    assert.equal(Enc.enemyLabel(s.enemy), '[보스] 대왕 까미');
    s.enemy.hp = 0; Enc.reward(s, () => .99);
    assert.ok(s.jobMastery.fisher >= Mi.MIMIC.tiers[2].mastery * K.KING.rewardMul && s.jobMastery.fisher < Mi.MIMIC.tiers[2].mastery * K.KING.rewardMul * 1.01, 'mastery 대 × rewardMul guaranteed (+ the kill itself): ' + s.jobMastery.fisher); assert.equal(s.book.kingMimic, 1); assert.ok(s.logs.some(l => l.text.includes('대왕 까미 격파')));
    // 대왕 누리 · 대왕 정수 슬라임 보상
    { const t = make(); Enc.spawn(t, () => 1, 'kingNuri'); assert.equal(t.enemy.id, K.KING.nuri.id); const before = t.exp; t.enemy.hp = 0; Enc.reward(t, () => .99);
        const byField = Math.floor(Enc.stageEncounterExp(t, stats(t)) * Math.round(N.EXP_NURI.tiers[2].pct * K.KING.rewardMul * N.EXP_NURI.encountersPerPct));
        assert.ok(t.exp - before >= byField && byField > 0, '90 encounters worth of exp or more'); assert.ok(t.logs.some(l => l.text.includes('대왕 누리 격파'))); }
    { const t = make(); Enc.spawn(t, () => 1, 'kingSlime'); assert.equal(t.enemy.id, K.KING.slime.id); t.essence = 0; t.enemy.hp = 0; Enc.reward(t, () => .99);
        assert.equal(t.essence, Sl.slimeBundle(10) * Sl.ESSENCE_SLIME.tiers[2].mul * K.KING.rewardMul, 'bundle 2 × 120'); assert.equal(t.book.kingSlime, 1); }
    // 도망: leavesAt이 지나면 보상 없이 사라집니다.
    { const t = make(); Enc.spawn(t, () => 1, 'kingSlime'); t.enemy.leavesAt = t.turn; t.essence = 0; rawAdvance(t, 2000, seeded(3));
        assert.ok(!t.enemy || t.enemy.id !== K.KING.slime.id, 'gone'); assert.equal(t.essence, 0); assert.equal(t.book.kingSlime || 0, 0, 'no reward for an escape'); assert.ok(t.logs.some(l => l.text.includes('대왕 정수 슬라임이(가) 힘이 다 빠지기 전에 달아났습니다'))); }
    // 던전에서는 안 나오고, 호루라기는 대왕을 부를 수 없습니다.
    { const d = make(); d.dungeon = { id: 'grotto', wave: 0 }; assert.equal(Enc.specialChances(d).rolls, false); }
    { const w = make(); w.sp = 10; assert.throws(() => act(w, { type: 'whistle', id: 'kingMimic' }, 0), /정수의 슬라임 중에서/); }
    assert.deepEqual(K.SPECIAL_IDS, ['masteryMimic', 'expNuri', 'essenceSlime', 'kingMimic', 'kingNuri', 'kingSlime']);
});

test('v3.261 dungeon expedition research (id dungeon) is kept on load and never refunded (was a pearl duplication)', () => {
    const s = newState(0); delete s.tutorial; s.rebirths = 10; s.pearls = 100;
    for (let i = 0; i < 4; i++) act(s, { type: 'permanent', id: 'dungeon' }, 0);
    assert.equal(s.pearls, 100 - (3 + 5 + 7 + 9)); assert.equal(s.permanent.dungeon, 4);
    for (let i = 0; i < 3; i++) migrateState(s, 0);
    assert.equal(s.permanent.dungeon, 4, 'rank survives every load'); assert.equal(s.pearls, 76, 'no refund on load');
});
