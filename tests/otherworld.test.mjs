// v3.231 제3장 이계: 세계석 해금 · 연료(충전 · 자동 · 절전) · 요원 탄창 · 트레이더 손익.
import { newState, act, stats, assert, test } from './harness.mjs';
import { loadGame } from '../scripts/lib/game-modules.mjs';
const L = loadGame(), SK = await L.load('game/data/skills.js'), C = await L.load('game/systems/combat.js'), O = await L.load('game/data/otherworld.js'), Ow = await L.load('game/systems/otherworld.js'), M = await L.load('game/data/market.js'), P = await L.load('game/systems/progression.js'), { jobById } = await L.load('game/data/classes.js');

test('v3.231 이계 직업은 세계석만으로 해금(레벨 · 선행 직업 없음), 한 번만 냅니다', () => {
    const s = newState(0); s.pearls = 999;
    assert.throws(() => act(s, { type: 'job', id: 'specialAgent' }, 0));
    s.pearls = 1_000; act(s, { type: 'job', id: 'specialAgent' }, 0); assert.equal(s.job, 'specialAgent'); assert.equal(s.pearls, 0);
    act(s, { type: 'job', id: 'fisher' }, 0); act(s, { type: 'job', id: 'specialAgent' }, 0); assert.equal(s.pearls, 0, 'paid once');
});

test('v3.231 연료: 세계석 1 = 100, 상한 · 자동 충전(남길 세계석) · 연료가 없으면 절전 모드(두 공격 감소)', () => {
    const s = newState(0); s.pearls = 11_000; act(s, { type: 'job', id: 'specialAgent' }, 0);
    const save = stats(s); assert.ok(Ow.powerSaving(s));
    act(s, { type: 'fuelCharge', value: '10' }, 0); assert.equal(s.fuel, 1000); assert.equal(s.pearls, 9_990);
    const full = stats(s); assert.ok(!Ow.powerSaving(s) && Math.abs(save.attack / full.attack - (jobById(s.job)?.powerSave ?? O.FUEL.powerSave)) < 1 / full.attack + .02, `${save.attack} / ${full.attack}`);
    act(s, { type: 'fuelCharge', value: '5000' }, 0); assert.equal(s.fuel, O.FUEL.cap, 'capped'); assert.equal(s.pearls, 9_990 - 990);
    s.fuel = 0; act(s, { type: 'fuelAuto', value: '8995' }, 0); assert.equal(Ow.autoFuel(s), 5, 'keeps 8,995 pearls'); assert.equal(s.pearls, 8995);
    act(s, { type: 'fuelAuto', value: '' }, 0); assert.equal(s.fuelAuto, undefined);
    const m = newState(0); assert.throws(() => act(m, { type: 'fuelCharge', value: '1' }, 0), /이계/);
});

test('v3.231 요원 탄창: 액티브가 장착 순서대로 확정 발사 · 한 발마다 연료 · 다 쏘면 재장전, 연료가 없거나 이계 직업이 아니면 이계 액티브 없음', () => {
    const fighter = (job, fuel) => ({ name: 'a', job, stats: { hp: 1000, attack: 200, defense: 10, mana: 9999, crit: 0, accuracy: 9 }, hp: 1000, mana: 9999, skills: ['snipe', 'armorPiercer', 'suppressFire'], cooldowns: {}, stun: 0, effects: {}, fuel, magazine: job === 'specialAgent' ? 3 : undefined });
    const foe = () => ({ name: 'b', foe: true, stats: { hp: 1e9, attack: 1, defense: 0, crit: 0 }, hp: 1e9, skills: [], cooldowns: {}, stun: 0, effects: {} });
    const a = fighter('specialAgent', 100), b = foe(), names = [];
    for (let i = 0; i < 4; i++) { const ev = []; C.strike(a, b, () => .99, ev); names.push(ev[0].reload ? 'reload' : ev[0].skillName); }
    assert.deepEqual(names, ['저격', '철갑탄', '제압 사격', 'reload'], 'rng .99 would fail every chance roll; the magazine fires anyway');
    assert.equal(a.fuel, 100 - 3 - 2 - 2);
    const dry = fighter('specialAgent', 1), ev = []; C.strike(dry, foe(), () => 0, ev); assert.equal(ev[0].skillName, '기본 공격', 'no fuel for any shot');
    const other = { ...fighter('hero', undefined), magazine: undefined }, ev2 = []; C.strike(other, foe(), () => 0, ev2); assert.equal(ev2[0].skillName, '기본 공격', 'other worlds cannot fire them');
});

test('v3.231 트레이더: 평가 손익 ±25%(헤지 −10% 하한) · 레버리지 손익 2배 · 수수료 절반', () => {
    const s = newState(0); s.pearls = 3000; act(s, { type: 'job', id: 'retailInvestor' }, 0); s.fuel = 1000; s.level = 100; s.attributes.int = 400;
    const base = stats(s).magic; s.marketPnl = .5; assert.ok(Math.abs(stats(s).magic / base - 3.25) < .01, 'capped at +25% → ×3.25');
    s.marketPnl = -.5; assert.ok(Math.abs(stats(s).magic / base - .08) < .01, 'floor −25% → ×0.08');
    assert.equal(M.feeScaleOf(s), .5); assert.equal(M.buyCost(1000, 10, .5).fee, 50); assert.equal(M.buyCost(1000, 10).fee, 100);
    const t = newState(0); t.pearls = 1_000; act(t, { type: 'job', id: 'fundManager' }, 0); t.fuel = 1000; t.level = 100; t.attributes.int = 400; t.learned.hedge = 1; t.skillInheritances = { hedge: true }; t.skills = ['hedge'];
    const b2 = stats({ ...t, marketPnl: 0 }).magic; t.marketPnl = -.5; assert.ok(Math.abs(stats(t).magic / b2 - .63) < .01, 'hedge lifts the floor to −10% → ×0.63');
    const lev = { name: 'a', job: 'fundManager', stats: { hp: 1000, magic: 1000, attack: 1, defense: 10, mana: 9999, crit: 0, accuracy: 9 }, hp: 1000, mana: 9999, skills: ['leverage'], cooldowns: {}, stun: 0, effects: {}, fuel: 100, pnl: .2 };
    const run = pnl => { const ev = []; C.strike({ ...lev, pnl, cooldowns: {}, effects: {} }, { name: 'b', foe: true, stats: { hp: 1e9, attack: 1, defense: 0, resist: 0, crit: 0 }, hp: 1e9, skills: [], cooldowns: {}, stun: 0, effects: {} }, () => 0, ev); return ev[0].total; };
    assert.ok(Math.abs(run(.2) / run(0) - 1.4) < .05 && Math.abs(run(-.2) / run(0) - .6) < .05, `${run(.2)} ${run(0)} ${run(-.2)}`);
    assert.equal(P.coreScale({ job: 'specialAgent' }, 'hero', 4), 0, 'otherworld core is lineage-only');
});

test('v3.231 5차: 숏 스퀴즈는 손실일수록, 블랙 스완(각성기)은 손익 절댓값만큼 강함; 마켓 메이커 손익 범위 ±35%; 요원 치명 · 관통은 계보 전용', () => {
    const foe = () => ({ name: 'b', foe: true, stats: { hp: 1e9, attack: 1, defense: 0, resist: 0, crit: 0 }, hp: 1e9, skills: [], cooldowns: {}, stun: 0, effects: {} });
    const hit = (id, pnl) => { const ev = []; C.strike({ name: 'a', job: 'marketMaker', stats: { hp: 1000, magic: 1000, attack: 1, defense: 10, mana: 9999, crit: 0, accuracy: 9 }, hp: 1000, mana: 9999, skills: [id], cooldowns: {}, stun: 0, effects: {}, fuel: 100, pnl }, foe(), () => 0, ev); return ev[0].total; };
    assert.ok(Math.abs(hit('shortSqueeze', -.2) / hit('shortSqueeze', 0) - 1.4) < .05 && hit('shortSqueeze', .2) < hit('shortSqueeze', 0));
    const S = SK.skillById('blackSwan'); assert.ok(S.awaken && S.pnlAbs && S.pnlScale === 3);
    const s = newState(0); s.pearls = 10_000; act(s, { type: 'job', id: 'marketMaker' }, 0); s.fuel = 1000; s.level = 100; s.attributes.int = 400; s.learned.liquidity = 1; s.skillInheritances = { liquidity: true }; s.skills = ['liquidity'];
    const base = stats({ ...s, marketPnl: 0 }).magic; s.marketPnl = .5; assert.ok(Math.abs(stats(s).magic / base - 3.7) < .01, 'liquidity widens the cap to ±30% → ×3.7');
    const tt = SK.skillById('tacticalTraining'); assert.equal(tt.exclusiveLineage, 'agentRookie'); assert.ok(tt.bonus.crit >= .15 && tt.bonus.penetration >= .15);
    const out = newState(0); out.job = 'hero'; assert.equal(P.exclusiveAccess(out, tt), false); const inn = newState(0); inn.job = 'ghostOperative'; assert.equal(P.exclusiveAccess(inn, tt), true);
});

test('v3.231 데드샷 무한 탄창: 탄창이 비면 두 번에 한 번은 재장전 대신 탄을 쓰지 않고 행동마다 한 발 더, 그다음 빈 탄창은 재장전', () => {
    const a = { name: 'a', job: 'deadshot', stats: { hp: 1000, attack: 200, defense: 10, mana: 9999, crit: 0, accuracy: 9 }, hp: 1000, mana: 9999, skills: ['snipe', 'doubleTap'], cooldowns: {}, stun: 0, effects: {}, fuel: 1000, magazine: 2, overdrive: { actions: 2, shots: 1, power: .8 } };
    const b = { name: 'b', foe: true, stats: { hp: 1e9, attack: 1, defense: 0, crit: 0 }, hp: 1e9, skills: [], cooldowns: {}, stun: 0, effects: {} };
    const turn = () => { const ev = []; C.strike(a, b, () => .99, ev); return ev.map(e => e.reload ? 'reload' : (e.overdrive ? '∞' : '') + e.skillName); };
    assert.deepEqual(turn(), ['저격']); assert.deepEqual(turn(), ['더블 탭']);
    assert.deepEqual(turn(), ['∞저격', '더블 탭'], 'empty → overdrive instead of reload, plus one more shot');
    assert.deepEqual(turn(), ['저격', '더블 탭']); assert.equal(a.effects.mag.left, 2, 'no rounds spent');
    assert.deepEqual(turn(), ['저격'], 'overdrive over'); assert.deepEqual(turn(), ['더블 탭']);
    assert.deepEqual(turn(), ['reload'], 'the next empty magazine reloads');
    assert.ok(SK.skillById('tacticalNuke').awaken && SK.skillById('deadEye').job === 'deadshot');
});

test('v3.233 요원 · 트레이더 1차는 세계석 없이 조건 없이 들어옵니다(4차 1,000 · 5차 10,000, 해커는 그대로)', () => {
    const s = newState(0); s.pearls = 0;
    for (const id of ['agentRookie', 'retailInvestor']) { assert.deepEqual(P.jobRequirements(s, jobById(id)), []); act(s, { type: 'job', id }, 0); assert.equal(s.job, id); }
    assert.equal(s.pearls, 0);
    const cost = id => jobById(id).pearlCost;
    assert.deepEqual(['specialAgent', 'fundManager', 'ghostOperative', 'deadshot', 'marketMaker', 'hacker'].map(cost), [1000, 1000, 10000, 10000, 10000, 3000]);
});
