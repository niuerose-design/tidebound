// 전기(戰記) 모드(game/srpg) 엔진 · 콘텐츠 테스트. 본편 난수와 무관하게 자체 시드를 씁니다.
import { test, assert } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
const { load } = loadGame();
const types = await load('srpg/engine/types.js');
const { nextRandom, roll } = await load('srpg/engine/rng.js');
const terrain = await load('srpg/engine/terrain.js');
const grid = await load('srpg/engine/grid.js');
const unitMod = await load('srpg/engine/unit.js');
const combat = await load('srpg/engine/combat.js');
const battleMod = await load('srpg/engine/battle.js');
const ai = await load('srpg/engine/ai.js');
const campaignMod = await load('srpg/state/campaign.js');
const { CLASSES, CLASS_MAP } = await load('srpg/data/classes.js');
const { ITEMS, ITEM_MAP } = await load('srpg/data/items.js');
const { UNITS, UNIT_MAP } = await load('srpg/data/units.js');
const { CHAPTERS, DEPLOYMENTS, DEPLOYMENT_MAP } = await load('srpg/data/chapters/index.js');
for (const d of DEPLOYMENTS) battleMod.DEPLOYMENTS_BY_CHAPTER[d.chapter_id] = d;
for (const d of DEPLOYMENTS) for (const g of d.groups) if (g.trigger_range) ai.TRIGGER_RANGE[`${d.chapter_id}:${g.id}`] = g.trigger_range;
const PASS = { infantry: '.FM=TSHRC', cavalry: '.F=TSHRC', armored: '.F=TSHRC', flying: '.FM^~=TSHRC' };

test('전기: 클래스·아이템·유닛 데이터 정합성', () => {
    for (const c of CLASSES) {
        for (const p of c.promotes_to) assert.ok(CLASS_MAP[p], `${c.id} promotes_to ${p}`);
        if (c.rank === 'base') assert.ok(c.promotes_to.length >= 1, `${c.id} base needs promotion`);
        for (const k of types.STATS) assert.ok(c.base_stats[k] <= c.caps[k], `${c.id} ${k} base>cap`);
    }
    assert.ok(CLASSES.length >= 26, '클래스 26종 이상');
    for (const u of UNITS) {
        const cls = CLASS_MAP[u.class_id]; assert.ok(cls && cls.side !== 'enemy', `${u.id} class`);
        for (const id of u.start_items) assert.ok(ITEM_MAP[id], `${u.id} item ${id}`);
        const sum = Object.values(u.growths).reduce((a, b) => a + b, 0); assert.ok(sum >= 260 && sum <= 360, `${u.id} growths ${sum}`);
        for (const s of u.supports) assert.ok(UNIT_MAP[s.with], `${u.id} support ${s.with}`);
        assert.ok(u.lines.retreat !== u.lines.death);
        assert.ok(!/당신/.test(JSON.stringify(u)));
    }
    assert.equal(UNITS.filter(u => u.role === 'lord').length, 1);
    assert.equal(UNITS.length, 14);
    for (const it of ITEMS) if (it.weapon) assert.ok(it.weapon.range[0] <= it.weapon.range[1]);
});

test('전기: 챕터 맵 · 배치 정합성(10장)', () => {
    assert.equal(CHAPTERS.length, 10);
    for (const ch of CHAPTERS) {
        const m = ch.map, tiles = m.tiles, dep = DEPLOYMENT_MAP[ch.id];
        assert.ok(dep, `${ch.id} deployment`);
        assert.equal(tiles.length, m.height, `${ch.id} rows`);
        tiles.forEach((r, i) => { assert.equal(r.length, m.width, `${ch.id} row ${i}`); assert.ok(!/[^.FM^~=#DTSHRC]/.test(r), `${ch.id} row ${i} chars`); });
        const at = ([x, y]) => tiles[y]?.[x];
        const can = (p, mt = 'infantry') => at(p) !== undefined && PASS[mt].includes(at(p));
        const seen = new Set([ch.player_spawns[0].join(',')]); const q = [ch.player_spawns[0]];
        while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [x + dx, y + dy], k = n.join(','); if (seen.has(k) || !(can(n) || at(n) === 'D')) continue; seen.add(k); q.push(n); } }
        if (ch.objective.target_pos) assert.ok(seen.has(ch.objective.target_pos.join(',')), `${ch.id} target reachable`);
        if (['seize', 'defend'].includes(ch.objective.type)) { assert.equal(tiles.join('').split('T').length - 1, 1, `${ch.id} one T`); assert.equal(at(ch.objective.target_pos), 'T'); }
        assert.ok(ch.player_spawns.length >= ch.max_deploy, `${ch.id} spawns`);
        ch.player_spawns.forEach(s => assert.ok(can(s), `${ch.id} spawn ${s}`));
        const evAt = new Map(ch.map_events.map(e => [e.pos.join(','), e]));
        tiles.forEach((row, y) => [...row].forEach((t, x) => { if (t === 'H') assert.equal(evAt.get(`${x},${y}`)?.kind, 'village', `${ch.id} H ${x},${y}`); if (t === 'C') assert.equal(evAt.get(`${x},${y}`)?.kind, 'chest', `${ch.id} C ${x},${y}`); }));
        for (const e of ch.map_events) if (e.reward) assert.ok(ITEM_MAP[e.reward], `${ch.id} reward ${e.reward}`);
        const occ = new Set(); const near = ([x, y]) => ch.player_spawns.some(([sx, sy]) => Math.abs(sx - x) + Math.abs(sy - y) <= 3);
        const checkUnit = (u, label) => { const cls = CLASS_MAP[u.class_id]; assert.ok(cls, `${label} class`); assert.ok(can(u.pos, cls.move_type), `${ch.id} ${label} ${u.pos} passable`); assert.ok(!near(u.pos), `${ch.id} ${label} ${u.pos} near spawn`); assert.ok(!occ.has(u.pos.join(',')), `${ch.id} ${label} overlap`); occ.add(u.pos.join(',')); assert.ok(cls.weapons.includes(ITEM_MAP[u.weapon]?.weapon?.type), `${ch.id} ${label} weapon`); if (u.recruitable_as) assert.ok(UNIT_MAP[u.recruitable_as]); };
        if (dep.boss) checkUnit(dep.boss, 'boss'); else assert.ok(!['boss', 'seize', 'rout'].includes(ch.objective.type), `${ch.id} needs boss`);
        const reinf = new Map(ch.reinforcements.map(r => [r.group_id, r]));
        for (const g of dep.groups) { if (g.is_reinforcement) { const r = reinf.get(g.id); assert.ok(r, `${ch.id} reinf ${g.id}`); assert.equal(r.spawns.length, g.units.length, `${ch.id} reinf ${g.id} count`); reinf.delete(g.id); continue; } if (g.stance === 'charge_on_range') assert.ok(g.trigger_range); if (g.stance === 'flee') assert.ok(g.flee_targets?.length); g.units.forEach((u, i) => checkUnit(u, `${g.id}[${i}]`)); }
        assert.equal(reinf.size, 0, `${ch.id} unmatched reinforcements`);
        for (const a of dep.allies ?? []) checkUnit(a, 'ally');
        for (const m of ch.dialogue.mid) if (m.trigger.kind === 'reinforcement') assert.ok(ch.reinforcements.some(r => r.group_id === m.trigger.group), `${ch.id} mid trigger`);
        for (const l of [...ch.dialogue.pre, ...ch.dialogue.post]) if (l.speaker.startsWith('unit_')) assert.ok(UNIT_MAP[l.speaker], `${ch.id} speaker ${l.speaker}`);
    }
});

test('전기: 난수는 시드로 결정되고 0~99를 고르게 낸다', () => {
    const a = { rng: 7 }, b = { rng: 7 };
    const xs = Array.from({ length: 20 }, () => roll(a)), ys = Array.from({ length: 20 }, () => roll(b));
    assert.deepEqual(xs, ys);
    const counts = new Array(10).fill(0); const c = { rng: 99 };
    for (let i = 0; i < 20000; i++) counts[Math.floor(roll(c) / 10)]++;
    for (const n of counts) assert.ok(n > 1700 && n < 2300, `분포 ${counts}`);
    assert.ok(nextRandom(1).value >= 0 && nextRandom(1).value < 1);
});

const mk = (tiles, units) => ({ chapterId: 'x', mode: 'casual', seed: 1, rng: 1, turn: 1, phase: 'player', units, tiles, status: 'playing', rewindsLeft: 5, log: [], used: [], spawned: [], triggered: [], firedMid: [], recruited: [], loot: [], gold: 0, bossMet: false, fallen: [], escaped: [], uidSeq: 50, itemSeq: 500, pending: [], pendingNotice: null, lastCombat: null });
const seq = () => ({ uid: 1, item: 1 });
const bu = (classId, level, x, y, weapon, side = 'player', extra = {}) => { const u = unitMod.createEnemyUnit(classId, level, classId, weapon, [], seq(), side); u.uid = `${side}_${classId}_${x}_${y}`; return unitMod.toBattleUnit(u, x, y, extra); };

test('전기: 이동 범위는 지형 비용 · 이동 타입 · 적 유닛을 따른다', () => {
    const tiles = ['.....', '.FF..', '.~~..', 'M....', '.....'];
    const inf = bu('cls_shore_blade', 1, 0, 0, 'iron_sword');
    const r = grid.moveRange(tiles, inf, [inf]);
    assert.ok(r.stoppable.has('4,0'), '평지 5칸');
    assert.ok(r.stoppable.has('1,1') && r.reach.get('1,1') === 2, '숲 비용 2(평지 1 + 숲 2)');
    assert.ok(!r.stoppable.has('1,2'), '보병은 물 불가');
    assert.ok(r.stoppable.has('0,3') && r.reach.get('0,3') === 0, '보병은 산 가능(평지 2 + 산 3 = 5)');
    const cav = bu('cls_dune_lancer', 1, 0, 0, 'iron_lance');
    const rc = grid.moveRange(tiles, cav, [cav]);
    assert.ok(!rc.stoppable.has('0,3'), '기병은 산 불가');
    assert.equal(rc.reach.get('1,1'), 7 - 4, '기병 숲 비용 3');
    const fly = bu('cls_kite_rider', 1, 0, 0, 'iron_lance');
    assert.ok(grid.moveRange(tiles, fly, [fly]).stoppable.has('1,2'), '비행은 물 가능');
    const foe = bu('cls_corsair', 1, 2, 0, 'iron_axe', 'enemy');
    const rb = grid.moveRange(['.....'], inf, [inf, foe]);
    assert.ok(!rb.stoppable.has('3,0') && !rb.stoppable.has('2,0'), '적을 지나갈 수 없다');
    const ally = bu('cls_corsair', 1, 2, 0, 'iron_axe', 'player');
    const ra = grid.moveRange(['.....'], inf, [inf, ally]);
    assert.ok(ra.stoppable.has('3,0') && !ra.stoppable.has('2,0'), '아군은 지나가되 멈출 수 없다');
    const path = grid.pathTo(ra.prev, [0, 0], [3, 0]);
    assert.deepEqual(path, [[0, 0], [1, 0], [2, 0], [3, 0]]);
});

test('전기: 상성 · 피해 · 명중 · 추격 · 지형 보정 공식', () => {
    assert.equal(combat.triangle('sword', 'axe'), 1); assert.equal(combat.triangle('axe', 'sword'), -1); assert.equal(combat.triangle('sword', 'lance'), -1); assert.equal(combat.triangle('fire', 'wind'), 1); assert.equal(combat.triangle('bow', 'sword'), 0); assert.equal(combat.triangle('fire', 'sword'), 0);
    const a = bu('cls_shore_blade', 1, 0, 0, 'iron_sword'), d = bu('cls_corsair', 1, 1, 0, 'iron_axe', 'enemy');
    const b = mk(['....', '....'], [a, d]);
    const f = combat.forecast(b, a, d);
    // 공격 = str 5 + 위력 5 + 상성 1 = 11, 피해 = 11 − def 3 = 8
    assert.equal(f.atk.dmg, a.stats.str + 5 + 1 - d.stats.def);
    // 명중 = 90 + skl*2 + lck/2 + 15 − (spd*2 + lck)
    assert.equal(f.atk.hit, Math.min(100, 90 + a.stats.skl * 2 + Math.floor(a.stats.lck / 2) + 15 - (d.stats.spd * 2 + d.stats.lck)));
    assert.equal(f.atk.doubles, a.stats.spd - d.stats.spd >= 4);
    assert.equal(f.triangle, 1);
    assert.equal(f.def.dmg, Math.max(0, d.stats.str + 8 - 1 - a.stats.def));
    // 숲 위 방어자: 수비 +1, 회피 +20
    const b2 = mk(['.F..', '....'], [a, d]);
    const f2 = combat.forecast(b2, a, d);
    const rawHit = 90 + a.stats.skl * 2 + Math.floor(a.stats.lck / 2) + 15 - (d.stats.spd * 2 + d.stats.lck);
    assert.equal(f2.atk.dmg, f.atk.dmg - 1); assert.equal(f2.atk.hit, Math.max(0, Math.min(100, rawHit - 20)));
    // 궁수는 인접 공격 불가, 2칸은 가능
    const ar = bu('cls_gull_archer', 1, 0, 0, 'iron_bow');
    const t1 = bu('cls_corsair', 1, 1, 0, 'iron_axe', 'enemy'), t2 = bu('cls_corsair', 1, 2, 0, 'iron_axe', 'enemy');
    const b3 = mk(['....', '....'], [ar, t1, t2]);
    assert.deepEqual(battleMod.attackTargets(b3, ar).map(u => u.uid), [t2.uid]);
    // 비행 특효: 활 위력 2배
    const fl = bu('cls_kite_rider', 1, 2, 0, 'iron_lance', 'enemy');
    const b4 = mk(['....', '....'], [ar, fl]);
    assert.equal(combat.forecast(b4, ar, fl).atk.dmg, Math.max(0, ar.stats.str + 12 - fl.stats.def));
    // 반격 불가(사거리 밖)면 def.dmg null
    assert.equal(combat.forecast(b3, ar, t2).def.dmg, null);
});

test('전기: 전투 해결은 결정론적이고 필살은 3배, 내구도가 줄고 경험치 · 레벨업이 처리된다', () => {
    const run = seed => { const a = bu('cls_shore_blade', 5, 0, 0, 'iron_sword'), d = bu('cls_corsair', 5, 1, 0, 'iron_axe', 'enemy'); const b = mk(['....'], [a, d]); b.rng = seed; const r = combat.resolveCombat(b, a, d); return { r, a, d, b }; };
    const x = run(3), y = run(3);
    assert.deepEqual(x.r.strikes, y.r.strikes); assert.equal(x.a.hp, y.a.hp);
    let crit = null, hits = 0;
    for (let s = 1; s < 400 && !crit; s++) { const { r, a } = run(s); hits += r.strikes.filter(k => k.hit).length; crit = r.strikes.find(k => k.crit) ?? null; if (crit) { const base = combat.forecast(mk(['....'], [a, bu('cls_corsair', 5, 1, 0, 'iron_axe', 'enemy')]), a, bu('cls_corsair', 5, 1, 0, 'iron_axe', 'enemy')).atk.dmg; assert.equal(crit.dmg, base * 3); } }
    assert.ok(crit, '필살이 한 번은 나온다');
    assert.ok(hits > 0);
    const { a, r } = run(11);
    assert.equal(a.items[0].uses, 40 - r.strikes.filter(k => k.attacker === a.uid).length, '내구도 소모');
    assert.ok(r.expA > 0 && a.exp === r.expA || a.level > 5, '경험치');
    // 레벨업: 100 경험치
    const u = bu('cls_shore_blade', 1, 0, 0, 'iron_sword'); const before = { ...u.stats };
    const ups = unitMod.gainExp(u, 250, { rng: 5 });
    assert.equal(u.level, 3); assert.equal(ups.length, 2); assert.equal(u.exp, 50);
    assert.ok(Object.values(u.stats).reduce((s, v) => s + v, 0) > Object.values(before).reduce((s, v) => s + v, 0), '능력치 상승');
    for (const k of types.STATS) assert.ok(u.stats[k] <= CLASS_MAP[u.classId].caps[k]);
    // 성장률 분포: 성장 70%면 100레벨에 60~80 상승
    const g = bu('cls_shore_blade', 1, 0, 0, 'iron_sword'); g.growths = { hp: 70, str: 70, mag: 0, skl: 0, spd: 0, lck: 0, def: 0, res: 0 }; g.stats.hp = 0; g.stats.str = 0; const ctx = { rng: 77 };
    let gainedHp = 0; for (let i = 0; i < 30; i++) gainedHp += unitMod.levelUp(g, ctx).hp ?? 0;
    assert.ok(gainedHp >= 14 && gainedHp <= 28, `성장 ${gainedHp}`);
    assert.equal(unitMod.levelUp(bu('cls_shore_blade', 1, 0, 0, 'iron_sword'), { rng: 1 }).mag, undefined, '성장 0%는 오르지 않는다');
});

test('전기: 지팡이 치유 · 회복약 · 승급', () => {
    const h = bu('cls_moss_cleric', 1, 0, 0, 'heal_staff'), t = bu('cls_shore_blade', 1, 1, 0, 'iron_sword'); t.hp = 3;
    const b = mk(['....'], [h, t]);
    assert.deepEqual(battleMod.healTargets(b, h).map(u => u.uid), [t.uid]);
    const b2 = battleMod.heal(b, h.uid, t.uid);
    const t2 = combat.unitById(b2, t.uid); assert.equal(t2.hp, Math.min(t2.stats.hp, 3 + h.stats.mag + 10));
    assert.equal(combat.unitById(b2, h.uid).items[0].uses, 29);
    assert.equal(combat.unitById(b2, h.uid).exp, 12);
    assert.deepEqual(battleMod.attackTargets(b, h), [], '지팡이로는 공격 못 함');
    // 회복약
    const v = bu('cls_shore_blade', 1, 0, 0, 'iron_sword'); v.items.push(unitMod.makeItem('vulnerary', 9)); v.hp = 1;
    const b3 = battleMod.consumeItem(mk(['....'], [v]), v.uid, 1, CHAPTERS[0]);
    assert.equal(combat.unitById(b3, v.uid).hp, 11); assert.equal(combat.unitById(b3, v.uid).items[1].uses, 2);
    // 승급
    const def = UNIT_MAP['unit_harl'];
    const u = unitMod.createPlayerUnit(def, seq(), 10);
    assert.ok(unitMod.canPromote(u)); assert.ok(!unitMod.canPromote(unitMod.createPlayerUnit(def, seq(), 9)));
    const hpBefore = u.stats.hp;
    unitMod.promote(u, 'cls_tide_warden');
    assert.equal(u.classId, 'cls_tide_warden'); assert.equal(u.level, 1); assert.equal(u.stats.hp, hpBefore + 4);
});

const startChapter = (n, mode = 'casual', seed = 1234) => {
    let c = campaignMod.newCampaign(mode, seed);
    // n장까지 로스터를 채우기 위해 앞 장들의 자동 합류를 흉내냅니다(테스트용: 레벨은 권장 레벨로).
    const ch = CHAPTERS[n - 1];
    for (const def of UNITS) if (def.join_chapter < n && !c.roster.some(u => u.defId === def.id)) c.roster.push(unitMod.createPlayerUnit(def, c.seq, Math.max(def.join_level, ch.recommended_level)));
    c.chapter = n; c = campaignMod.joinAutoUnits(c);
    for (const u of c.roster) { u.level = Math.max(u.level, ch.recommended_level); u.stats = unitMod.averageLevel(u.stats, u.growths, Math.max(0, ch.recommended_level - UNIT_MAP[u.defId].join_level), CLASS_MAP[u.classId].caps); }
    const lord = campaignMod.lordUnit(c);
    const roster = [lord, ...campaignMod.deployable(c).filter(u => u !== lord)].slice(0, ch.max_deploy);
    const b = battleMod.startBattle(ch, DEPLOYMENT_MAP[ch.id], roster, ch.player_spawns, mode, seed);
    return { c, ch, b };
};

test('전기: 전투 시작 — 배치 · 대사 · 증원 · 턴 전환', () => {
    const { ch, b } = startChapter(1);
    assert.equal(b.units.filter(u => u.side === 'player').length, 3);
    assert.equal(b.units.filter(u => u.side === 'enemy').length, 5, '증원은 처음엔 없음');
    assert.ok(b.units.some(u => u.boss && u.name === '갯바위 돌프'));
    assert.equal(b.pending.length, ch.dialogue.pre.length, '전투 전 대사');
    let s = battleMod.endPlayerTurn(b, ch);
    assert.equal(s.phase, 'enemy');
    let guard = 0; while (guard++ < 50) { const r = ai.enemyStep(s, ch); s = r.battle; if (!r.action) break; }
    s = battleMod.startPlayerTurn(s, ch); assert.equal(s.turn, 2);
    for (let t = 2; t < 4; t++) { s = battleMod.endPlayerTurn(s, ch); let g = 0; while (g++ < 50) { const r = ai.enemyStep(s, ch); s = r.battle; if (!r.action) break; } s = battleMod.startPlayerTurn(s, ch); }
    assert.equal(s.turn, 4);
    const boats = s.units.filter(u => u.groupId === 'grp_east_boats');
    assert.equal(boats.length, 2, '4턴 증원 등장'); assert.ok(boats.every(u => u.acted), '등장 턴에는 행동하지 않음');
    assert.equal(s.pendingNotice, '동쪽 바다에서 배가 닿았다');
    assert.ok(s.pending.some(l => l.text.includes('동쪽 바다에 배입니다')), '증원 중간 대사');
});

test('전기: AI 스탠스 — hold는 움직이지 않고, aggressive는 다가오고, charge는 범위 안에서 전환하고, flee는 민가를 턴다', () => {
    const tiles = ['..........', '..........', '..........', '..........', '..........'];
    const p = bu('cls_shore_blade', 3, 0, 0, 'iron_sword');
    const hold = bu('cls_corsair', 3, 9, 4, 'iron_axe', 'enemy', { stance: 'hold', groupId: 'g1' });
    let b = mk(tiles, [p, hold]); b.phase = 'enemy';
    let r = ai.enemyStep(b, CHAPTERS[0]);
    assert.equal(r.action.kind, 'wait'); assert.equal(combat.unitById(r.battle, hold.uid).x, 9);
    const agg = bu('cls_corsair', 3, 9, 4, 'iron_axe', 'enemy', { stance: 'aggressive', groupId: 'g2' });
    b = mk(tiles, [p, agg]); b.phase = 'enemy';
    r = ai.enemyStep(b, CHAPTERS[0]);
    assert.equal(r.action.kind, 'move'); const moved = combat.unitById(r.battle, agg.uid); assert.ok(terrain.manhattan(moved, p) < 13 && terrain.manhattan(moved, p) <= 13 - 5);
    // 바로 옆이면 공격
    const agg2 = bu('cls_corsair', 3, 2, 0, 'iron_axe', 'enemy', { stance: 'aggressive' });
    b = mk(tiles, [p, agg2]); b.phase = 'enemy';
    r = ai.enemyStep(b, CHAPTERS[0]);
    assert.equal(r.action.kind, 'attack'); assert.equal(r.action.target, p.uid);
    // charge_on_range: 범위 밖이면 대기, 안이면 그룹 전체 전환
    const c1 = bu('cls_corsair', 3, 8, 0, 'iron_axe', 'enemy', { stance: 'charge_on_range', groupId: 'gc' }), c2 = bu('cls_corsair', 3, 9, 4, 'iron_axe', 'enemy', { stance: 'charge_on_range', groupId: 'gc' });
    ai.TRIGGER_RANGE['x:gc'] = 3;
    b = mk(tiles, [p, c1, c2]); b.phase = 'enemy';
    r = ai.enemyStep(b, CHAPTERS[0]); assert.equal(r.action.kind, 'wait'); assert.ok(!r.battle.triggered.includes('gc'));
    const p2 = bu('cls_shore_blade', 3, 5, 0, 'iron_sword'); p2.uid = 'p2';
    b = mk(tiles, [p2, c1, c2]); b.phase = 'enemy';
    r = ai.enemyStep(b, CHAPTERS[0]); assert.ok(r.battle.triggered.includes('gc')); assert.equal(r.action.kind, 'attack');
    const r2 = ai.enemyStep(r.battle, CHAPTERS[0]); assert.notEqual(r2.action.kind, 'wait', '그룹원도 함께 움직인다');
    // flee: 민가로 가서 턴다
    const th = bu('cls_salt_thief', 3, 5, 4, 'iron_dagger', 'enemy', { stance: 'flee', fleeTargets: [[5, 0]] });
    const vt = ['.....H....', '..........', '..........', '..........', '..........'];
    b = mk(vt, [bu('cls_shore_blade', 3, 0, 0, 'iron_sword'), th]); b.phase = 'enemy';
    r = ai.enemyStep(b, { ...CHAPTERS[0], map_events: [] }); assert.equal(r.action.kind, 'move'); assert.deepEqual([combat.unitById(r.battle, th.uid).x, combat.unitById(r.battle, th.uid).y], [5, 0]);
    let s = r.battle; for (const u of s.units) u.acted = false;
    r = ai.enemyStep(s, { ...CHAPTERS[0], map_events: [] }); assert.equal(r.action.kind, 'loot'); assert.equal(r.battle.tiles[0][5], 'X');
    s = r.battle; for (const u of s.units) u.acted = false;
    r = ai.enemyStep(s, CHAPTERS[0]); assert.ok(['move', 'vanish'].includes(r.action.kind), '다 털면 탈출');
    // boss: 체력 절반 아래면 aggressive
    const boss = bu('cls_pirate_captain', 5, 9, 4, 'iron_axe', 'enemy', { stance: 'boss', boss: true });
    b = mk(tiles, [p, boss]); b.phase = 'enemy'; r = ai.enemyStep(b, CHAPTERS[0]); assert.equal(r.action.kind, 'wait');
    boss.hp = Math.floor(boss.stats.hp / 2); b = mk(tiles, [p, boss]); b.phase = 'enemy'; r = ai.enemyStep(b, CHAPTERS[0]); assert.equal(r.action.kind, 'move');
});

test('전기: 플레이어 행동 — 이동 · 공격 · 대기 · 대화 영입 · 민가 · 상자 · 문 · 점령 · 탈출', () => {
    const { ch, b } = startChapter(1);
    const lord = battleMod.lordOf(b);
    const { stoppable } = battleMod.rangeFor(b, lord);
    assert.ok(stoppable.size > 5);
    assert.throws(() => battleMod.moveUnit(b, lord.uid, [9, 4]), /갈 수 없는/);
    const target = [...stoppable].map(grid.unkey).find(([x, y]) => y === 7 && x === 5) ?? grid.unkey([...stoppable][1]);
    let s = battleMod.moveUnit(b, lord.uid, target);
    assert.deepEqual([combat.unitById(s, lord.uid).x, combat.unitById(s, lord.uid).y], target);
    s = battleMod.wait(s, lord.uid, ch); assert.ok(combat.unitById(s, lord.uid).acted);
    assert.throws(() => battleMod.moveUnit(s, lord.uid, [3, 9]), /행동을 마친/);
    // 민가 방문: 테사를 민가(1,9)로 — 스폰에서 2칸
    const tessa = s.units.find(u => u.defId === 'unit_tessa');
    s = battleMod.moveUnit(s, tessa.uid, [1, 9]);
    s = battleMod.visit(s, tessa.uid, ch);
    assert.deepEqual(s.loot, ['chest_key']); assert.ok(s.used.includes('1,9'));
    assert.throws(() => battleMod.visit(s, tessa.uid, ch), /민가/);
    // 상자: 열쇠를 들고 상자 칸에서
    const harl = s.units.find(u => u.defId === 'unit_harl'); harl.items.push(unitMod.makeItem('chest_key', 77)); harl.x = 10; harl.y = 9;
    s = battleMod.openChest(s, harl.uid, ch);
    assert.ok(s.loot.includes('shell_cutter')); assert.ok(!combat.unitById(s, harl.uid).items.some(i => i.id === 'chest_key'), '열쇠 소모');
    // 점령: 주인공이 T에서
    const s2 = battleMod.clone(s); const l2 = battleMod.lordOf(s2); l2.x = 9; l2.y = 4; l2.acted = false; s2.units = s2.units.filter(u => !u.boss || u === l2);
    assert.ok(battleMod.canSeize(s2, l2, ch)); const won = battleMod.seize(s2, l2.uid, ch); assert.equal(won.status, 'won');
    const h2 = s2.units.find(u => u.defId === 'unit_harl'); h2.x = 9; h2.y = 4; l2.x = 2; l2.y = 10;
    assert.ok(!battleMod.canSeize(s2, h2, ch), '주인공만 점령');
    // 문: 3장 — 열쇠로 연다
    const c3 = startChapter(3); const lord3 = battleMod.lordOf(c3.b); lord3.x = 12; lord3.y = 1; lord3.items.push(unitMod.makeItem('door_key', 78));
    assert.deepEqual(battleMod.adjacentDoors(c3.b, lord3), [[12, 2]]);
    const opened = battleMod.openDoor(c3.b, lord3.uid, [12, 2]); assert.equal(opened.tiles[2][12], '.');
    // 대화 영입: 도른
    const dorne = c3.b.units.find(u => u.recruitableAs === 'unit_dorne'); lord3.x = dorne.x; lord3.y = dorne.y + 1; lord3.acted = false;
    assert.deepEqual(battleMod.talkTargets(c3.b, lord3).map(u => u.uid), [dorne.uid]);
    const harl3 = c3.b.units.find(u => u.defId === 'unit_harl'); harl3.x = dorne.x - 1; harl3.y = dorne.y;
    assert.deepEqual(battleMod.talkTargets(c3.b, harl3), [], '세린만 대화 가능');
    const rec = battleMod.talk(c3.b, lord3.uid, dorne.uid, c3.ch);
    const d2 = combat.unitById(rec, dorne.uid); assert.equal(d2.side, 'player'); assert.equal(d2.defId, 'unit_dorne'); assert.ok(rec.recruited.includes('unit_dorne'));
    assert.ok(rec.pending.some(l => l.speaker === 'unit_dorne'));
    // 탈출: 6장
    const c6 = startChapter(6); const lord6 = battleMod.lordOf(c6.b); lord6.x = 15; lord6.y = 2;
    assert.ok(battleMod.canEscape(c6.b, lord6, c6.ch)); assert.equal(battleMod.escape(c6.b, lord6.uid, c6.ch).status, 'won');
});

test('전기: 승패 — 주인공 사망 즉시 패배, 캐주얼 후퇴 / 클래식 사망, 방어 · 생존 턴 승리', () => {
    for (const mode of ['casual', 'classic']) {
        const { ch, b } = startChapter(1, mode);
        const harl = b.units.find(u => u.defId === 'unit_harl'); harl.hp = 1; harl.x = 6; harl.y = 10;
        b.units.filter(u => u.side === 'player' && u !== harl).forEach((u, i) => { u.x = 1 + i; u.y = 1; });
        const foe = b.units.find(u => u.side === 'enemy' && !u.boss); foe.x = 7; foe.y = 10; foe.stats.str = 99; foe.stats.skl = 99; foe.stance = 'aggressive';
        let s = battleMod.endPlayerTurn(b, ch);
        let g = 0; while (g++ < 50) { const r = ai.enemyStep(s, ch); s = r.battle; if (!r.action) break; }
        const h2 = combat.unitById(s, harl.uid);
        assert.equal(h2.hp, 0); assert.equal(h2.status, mode === 'casual' ? 'retreated' : 'dead'); assert.ok(s.fallen.includes(harl.uid));
        assert.equal(s.status, 'playing', '주인공이 아니면 계속');
        const lord = battleMod.lordOf(s); lord.hp = 0;
        assert.equal(battleMod.checkEnd(s, ch).status, 'lost');
    }
    const { ch: ch4, b: b4 } = startChapter(4);
    let s = b4; s.turn = 8;
    s = battleMod.endPlayerTurn(s, ch4); assert.equal(s.status, 'playing');
    s.units = s.units.filter(u => u.side === 'player'); // 적이 없어도 방어는 턴으로 끝난다
    s = battleMod.startPlayerTurn(s, ch4); assert.equal(s.status, 'won', '9턴 시작 = 8턴 방어 성공');
    const b4b = startChapter(4).b; const foe = b4b.units.find(u => u.side === 'enemy'); foe.x = 7; foe.y = 6; b4b.units = b4b.units.filter(u => u.side !== 'player' || u.x !== 7 || u.y !== 6); b4b.phase = 'enemy';
    assert.equal(battleMod.checkEnd(b4b, ch4).status, 'lost', '적이 왕좌를 차지하면 패배');
    const { ch: ch8, b: b8 } = startChapter(8); b8.turn = 10; let s8 = battleMod.endPlayerTurn(b8, ch8); s8 = battleMod.startPlayerTurn(s8, ch8); assert.equal(s8.status, 'won');
    const { ch: ch2, b: b2 } = startChapter(2); b2.units = b2.units.filter(u => u.side !== 'enemy'); assert.equal(battleMod.checkEnd(b2, ch2).status, 'won', '전멸');
});

test('전기: 캠페인 — 시작 로스터 · 상점 · 창고 · 승리 반영 · 합류 · 클래식 장비 반환', () => {
    let c = campaignMod.newCampaign('classic', 5);
    assert.equal(c.roster.length, 3); assert.ok(campaignMod.lordUnit(c));
    assert.equal(c.roster.find(u => u.defId === 'unit_serin').equipped, 0, '조류검 장착');
    c = campaignMod.buy(c, 'iron_sword'); assert.equal(c.gold, 1500 - 400); assert.ok(c.convoy.some(i => i.id === 'iron_sword'));
    assert.throws(() => campaignMod.buy(c, 'silver_sword'), /팔지 않는/);
    const harl = c.roster.find(u => u.defId === 'unit_harl');
    const sword = c.convoy.find(i => i.id === 'iron_sword');
    c = campaignMod.giveItem(c, harl.uid, sword.n); assert.equal(c.roster.find(u => u.uid === harl.uid).items.length, 3);
    c = campaignMod.storeItem(c, harl.uid, 2); assert.equal(c.roster.find(u => u.uid === harl.uid).items.length, 2);
    c = campaignMod.sell(c, sword.n); assert.equal(c.gold, 1100 + 200);
    // 1장 승리 반영
    const ch = CHAPTERS[0];
    const lord = campaignMod.lordUnit(c);
    const b = battleMod.startBattle(ch, DEPLOYMENT_MAP[ch.id], [lord, ...c.roster.filter(u => u !== lord)], ch.player_spawns, 'classic', 5);
    const h = b.units.find(u => u.defId === 'unit_harl'); h.hp = 0; h.status = 'dead'; b.fallen.push(h.uid);
    b.loot.push('chest_key'); b.gold = 50; b.turn = 7; b.status = 'won';
    const l = battleMod.lordOf(b); l.exp = 40; l.kills = 2;
    const c2 = campaignMod.applyVictory(c, b, ch);
    assert.equal(c2.chapter, 2); assert.equal(c2.gold, c.gold + 50 + 800);
    assert.equal(c2.roster.find(u => u.defId === 'unit_harl').status, 'dead');
    assert.ok(c2.convoy.some(i => i.id === 'iron_sword'), '죽은 유닛의 장비는 창고로');
    assert.equal(c2.roster.find(u => u.defId === 'unit_serin').exp, 40);
    assert.ok(c2.roster.some(u => u.defId === 'unit_brom') && c2.roster.some(u => u.defId === 'unit_mio'), '2장 자동 합류');
    assert.ok(c2.cleared[ch.id].turns === 7 && c2.cleared[ch.id].mode === 'classic');
    assert.equal(campaignMod.deployable(c2).length, 4);
    assert.ok(c2.convoy.some(i => i.id === 'chest_key') && c2.convoy.some(i => i.id === 'vulnerary'));
    // 캐주얼: 후퇴는 복귀
    let cc = campaignMod.newCampaign('casual', 5);
    const bb = battleMod.startBattle(ch, DEPLOYMENT_MAP[ch.id], [campaignMod.lordUnit(cc), ...cc.roster.filter(u => u.defId !== 'unit_serin')], ch.player_spawns, 'casual', 5);
    const hh = bb.units.find(u => u.defId === 'unit_harl'); hh.hp = 0; hh.status = 'retreated'; bb.status = 'won';
    cc = campaignMod.applyVictory(cc, bb, ch);
    assert.equal(cc.roster.find(u => u.defId === 'unit_harl').status, 'alive');
    // 승급 아이템
    const h10 = cc.roster.find(u => u.defId === 'unit_harl'); h10.level = 10; cc.convoy.push({ id: 'tide_seal', uses: 1, n: 999 });
    cc = campaignMod.applyConvoyItem(cc, h10.uid, 999);
    assert.equal(cc.roster.find(u => u.uid === h10.uid).classId, 'cls_tide_warden');
});

/** 목표 칸까지의 실제 경로 거리(문은 열 수 있다고 보고 통과). */
function distanceFrom(tiles, goal, moveType) {
    const PASSC = { infantry: '.FM=TSHRCDX', cavalry: '.F=TSHRCDX', armored: '.F=TSHRCDX', flying: '.FM^~=TSHRCDX' }[moveType];
    const dist = new Map([[grid.key(goal[0], goal[1]), 0]]); const q = [goal];
    while (q.length) { const [x, y] = q.shift(); const d = dist.get(grid.key(x, y)); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = grid.key(nx, ny); if (dist.has(k) || !tiles[ny]?.[nx] || !PASSC.includes(tiles[ny][nx])) continue; dist.set(k, d + 1); q.push([nx, ny]); } }
    return dist;
}
/** 단순 플레이어 봇: 반격 피해를 고려해 가장 좋은 공격을 하고, 없으면 아군과 뭉쳐 가장 가까운 적(또는 목표)으로 다가간다. 문 옆에서 열쇠가 있으면 연다. */
function playerBot(b, ch, opts = { threatW: 1.5, spreadW: 2 }) {
    let s = b;
    for (const u0 of s.units.filter(u => u.side === 'player' && u.hp > 0 && !u.acted)) {
        const u = combat.unitById(s, u0.uid);
        const { stoppable } = battleMod.rangeFor(s, u);
        const isLord = u.defId && UNIT_MAP[u.defId].role === 'lord';
        const goal = ch.objective.target_pos;
        const foes = s.units.filter(o => o.hp > 0 && o.side === 'enemy');
        if (isLord && goal && (ch.objective.type === 'seize' || ch.objective.type === 'escape') && stoppable.has(grid.key(goal[0], goal[1])) && (ch.objective.type === 'escape' || foes.every(f => terrain.manhattan(goal, f) > 2 || f.boss))) {
            s = battleMod.moveUnit(s, u.uid, goal); s = ch.objective.type === 'seize' ? battleMod.seize(s, u.uid, ch) : battleMod.escape(s, u.uid, ch); if (s.status !== 'playing') return s; continue;
        }
        let best = null; const w = unitMod.attackWeapon(u);
        if (w) for (const k of stoppable) { const [x, y] = grid.unkey(k); for (const f of foes) { const d = terrain.manhattan([x, y], f); if (d < w.weapon.range[0] || d > w.weapon.range[1]) continue; const fc = combat.forecast(s, u, f, [x, y]); const dealt = fc.atk.dmg * fc.atk.hit / 100 * (fc.atk.doubles ? 2 : 1); const taken = (fc.def.dmg ?? 0) * (fc.def.hit ?? 0) / 100 * (fc.def.doubles ? 2 : 1); const sc = dealt * 2 - taken * 1.5 + (fc.atk.dmg * (fc.atk.doubles ? 2 : 1) >= f.hp ? 30 * fc.atk.hit / 100 : 0) - (taken >= u.hp ? 100 : 0); if (!best || sc > best.sc) best = { pos: [x, y], f, sc }; } }
        if (best && best.sc > 0) { s = battleMod.moveUnit(s, u.uid, best.pos); s = battleMod.attack(s, u.uid, best.f.uid, ch); if (s.status !== 'playing') return s; continue; }
        if (combat.staffRange(u)[1]) { const hurt = s.units.filter(o => o.side === 'player' && o.uid !== u.uid && o.hp > 0 && o.hp < o.stats.hp * 0.7); let did = false; for (const k of stoppable) { const [x, y] = grid.unkey(k); const t = hurt.find(h => terrain.manhattan([x, y], h) === 1); if (t) { s = battleMod.moveUnit(s, u.uid, [x, y]); s = battleMod.heal(s, u.uid, t.uid); did = true; break; } } if (did) continue; }
        const tgt = isLord && goal ? goal : foes.length ? foes.reduce((a, f) => terrain.manhattan(u, f) < terrain.manhattan(u, a) ? f : a, foes[0]) : null;
        const tgtPos = tgt ? (Array.isArray(tgt) ? tgt : [tgt.x, tgt.y]) : null;
        const dm = tgtPos ? distanceFrom(s.tiles, tgtPos, u.moveType) : null;
        // 문: 목표로 가는 길에 있는 인접한 문을 열쇠로 연다.
        const doors = battleMod.adjacentDoors(s, u);
        if (doors.length && dm && battleMod.hasKey(u, 'door_key')) { const door = doors.find(d => (dm.get(grid.key(d[0], d[1])) ?? 99) < (dm.get(grid.key(u.x, u.y)) ?? 99)); if (door) { s = battleMod.openDoor(s, u.uid, door); continue; } }
        if (tgt && dm && !(ch.objective.type === 'survive' || ch.objective.type === 'defend')) {
            let bk = null, bd = Infinity;
            const allies = s.units.filter(o => o.side === 'player' && o.hp > 0 && o.uid !== u.uid);
            for (const k of stoppable) { const [x, y] = grid.unkey(k); const threat = foes.filter(f => terrain.manhattan([x, y], f) <= f.move + 2).length; const spread = allies.length ? Math.min(...allies.map(a => terrain.manhattan([x, y], a))) : 0; const d = (dm.get(k) ?? 99) + (s.tiles[y][x] === 'F' ? -0.5 : 0) + threat * opts.threatW + Math.max(0, spread - 2) * opts.spreadW; if (d < bd) { bd = d; bk = [x, y]; } }
            if (bk) s = battleMod.moveUnit(s, u.uid, bk);
        }
        s = battleMod.wait(s, u.uid, ch); if (s.status !== 'playing') return s;
    }
    return s;
}
function autoplay(n, mode = 'casual', seed = 1234, cheat = false) {
    const { ch, b } = startChapter(n, mode, seed);
    let s = b;
    if (cheat) for (const u of s.units) if (u.side === 'player') { for (const k of types.STATS) u.stats[k] += k === 'hp' ? 60 : 30; u.hp = u.stats.hp; u.items = u.items.slice(0, 3); u.items.push(unitMod.makeItem('door_key', 901), unitMod.makeItem('door_key', 902)); unitMod.autoEquip(u); }
    while (s.status === 'playing' && s.turn <= 40) {
        s = playerBot(s, ch, cheat ? { threatW: 0, spreadW: 0 } : undefined);
        if (s.status !== 'playing') break;
        s = battleMod.endPlayerTurn(s, ch);
        let g = 0; while (s.status === 'playing' && g++ < 200) { const r = ai.enemyStep(s, ch); s = r.battle; if (!r.action) break; }
        if (s.status !== 'playing') break;
        s = battleMod.startPlayerTurn(s, ch);
    }
    return { s, ch };
}
test('전기: 10개 장 모두 봇이 끝까지 돌려도 오류가 없고, 같은 시드는 같은 결과를 낸다', () => {
    const summary = [];
    for (const ch of CHAPTERS) {
        const t0 = Date.now();
        const { s } = autoplay(ch.number);
        const ms = Date.now() - t0;
        summary.push(`${ch.number}장 ${s.status} ${s.turn}턴 (${ms}ms)`);
        assert.ok(s.status !== 'playing' || s.turn > 40, `${ch.id} 끝남`);
        assert.ok(ms < 15000, `${ch.id} 40턴 이내 15초`);
        const again = autoplay(ch.number);
        assert.equal(again.s.status, s.status); assert.equal(again.s.turn, s.turn); assert.deepEqual(again.s.units.map(u => [u.uid, u.hp]), s.units.map(u => [u.uid, u.hp]));
    }
    console.log('  봇 요약: ' + summary.join(' · '));
});
test('전기: 능력치를 크게 올린 봇은 10개 장을 모두 깬다(목표 · 문 · 경로가 실제로 닿는지)', () => {
    const summary = [];
    for (const ch of CHAPTERS) {
        const { s } = autoplay(ch.number, 'casual', 77, true);
        summary.push(`${ch.number}장 ${s.status} ${s.turn}턴`);
        assert.equal(s.status, 'won', `${ch.id}: ${s.status} ${s.turn}턴 ${s.lostReason ?? ''}`);
    }
    console.log('  강화 봇: ' + summary.join(' · '));
});

test('전기: 스냅샷 복원(되감기) — 직렬화한 상태로 이어 가도 같은 결과', () => {
    const { ch, b } = startChapter(2);
    const snap = JSON.stringify(b);
    const a1 = (() => { let s = playerBot(b, ch); s = battleMod.endPlayerTurn(s, ch); let g = 0; while (g++ < 100) { const r = ai.enemyStep(s, ch); s = r.battle; if (!r.action) break; } return s; })();
    const a2 = (() => { let s = playerBot(JSON.parse(snap), ch); s = battleMod.endPlayerTurn(s, ch); let g = 0; while (g++ < 100) { const r = ai.enemyStep(s, ch); s = r.battle; if (!r.action) break; } return s; })();
    assert.deepEqual(a1.units.map(u => [u.uid, u.x, u.y, u.hp]), a2.units.map(u => [u.uid, u.x, u.y, u.hp]));
    assert.equal(a1.rng, a2.rng);
    assert.equal(JSON.parse(snap).turn, 1, '스냅샷은 그대로');
});
