// 전투력 점검(v3.66): stats.power의 공식이 실제 전투 판정(strike)과 같은 방향·크기로 움직이는지 봅니다.
// 기준 캐릭터에서 능력치 하나씩(치명타 피해·치명타·관통·공격·체력·방어·회피) 또는 장비 세트를 바꿔, 기준 몬스터를 때린 평균 피해(공격)와
// 기준 몬스터에게 맞은 평균 피해로 나눈 체력(버티는 힘)을 실제로 굴려 공격^.65 × 버티는 힘^.35(v3.133 전투력과 같은 가중) 비율을 구하고, 전투력 비율과 비교합니다.
// 사용: node scripts/check-power.mjs
import assert from 'node:assert/strict';
import { loadGame } from './lib/game-modules.mjs';
import { random } from './lib/sim.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine'), { stats, power, POWER_WEIGHT } = await load('systems/stats'), { strike } = await load('systems/combat');
const N = 6000;
const fighter = (st, name) => ({ name, stats: { ...st }, hp: 1e15, mana: 1e9, skills: [], cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {} });
// 기준 몬스터: Lv.100 일반 몬스터 근처(방어 163, 회피 0.1, 명중 1.1), 공격은 피해 비율만 보므로 아무 값.
const MOB = { hp: 1e15, attack: 5000, magic: 5000, defense: 163, resist: 163, crit: 0, critDamage: 1.65, accuracy: 1.1, evasion: .1, speed: 10, mana: 0, manaRegen: 0, penetration: 0, lifesteal: 0 };
function simulated(st) {
    const rng = random(11); let dealt = 0, taken = 0;
    for (let i = 0; i < N; i++) { const me = fighter({ ...st, speed: 10 }, 'me'), mob = fighter(MOB, 'mob'); strike(me, mob, rng); dealt += 1e15 - mob.hp; }
    for (let i = 0; i < N; i++) { const me = fighter({ ...st, speed: 10, thorns: 0 }, 'me'), mob = fighter(MOB, 'mob'); strike(mob, me, rng); taken += 1e15 - me.hp; }
    const offense = dealt / N, durability = st.hp / Math.max(1e-9, taken / N) * (1 + (st.lifesteal || 0));
    // v3.133 전투력과 같은 가중(공격 .65 · 버티는 힘 .35)으로 묶습니다.
    return Math.pow(offense, POWER_WEIGHT.offense) * Math.pow(durability, POWER_WEIGHT.durability);
}
const s = newState(0); s.level = 100; s.rebirths = 100; s.attributes = { str: 300, dex: 100, int: 0, vit: 100, wis: 0, luk: 0 };
Object.assign(s.permanent, { attack: 100, hp: 100, guard: 60, magicGuard: 60 });
const base = { ...stats(s), chainBonus: 0, bossDamage: 0 };
const variants = {
    '치명타 피해 +1.0': { critDamage: base.critDamage + 1 },
    '치명타 +50%p': { crit: Math.min(1, base.crit + .5) },
    '치명타 100% · 피해 +1.0': { crit: 1, critDamage: base.critDamage + 1 },
    '관통 +40%': { penetration: .4 },
    '공격 ×1.5': { attack: base.attack * 1.5 },
    '체력 ×1.5': { hp: base.hp * 1.5 },
    '방어 ×2': { defense: base.defense * 2, resist: base.resist * 2 },
    '회피 +25%p': { evasion: base.evasion + .25 },
};
const p0 = power(base), s0 = simulated(base);
let worst = 0; const rows = [];
for (const [name, change] of Object.entries(variants)) {
    const st = { ...base, ...change }, formula = power(st) / p0, sim = simulated(st) / s0, err = formula / sim - 1;
    worst = Math.max(worst, Math.abs(err));
    rows.push(`${name}: 전투력 ×${formula.toFixed(3)} · 실제 ×${sim.toFixed(3)} (${err >= 0 ? '+' : ''}${(err * 100).toFixed(1)}%)`);
}
console.log(`기준 전투력 ${p0.toLocaleString()} (공격 ${Math.round(base.attack)} · 체력 ${Math.round(base.hp)} · 방어 ${Math.round(base.defense)}/${Math.round(base.resist)} · 치명 ${base.crit.toFixed(3)} × ${base.critDamage.toFixed(2)})`);
for (const r of rows) console.log('  ' + r);
// 능력치를 바꿨을 때 전투력 변화가 실제 전투 변화와 15% 넘게 어긋나면 실패합니다.
assert.ok(worst <= .15, `전투력과 실제 전투가 ${(worst * 100).toFixed(1)}% 어긋남`);
console.log('ok');
