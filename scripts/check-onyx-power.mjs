// v3.284 칠흑 장신구 몫 점검: 기준 몸(Lv.100 · 환생 200, check-gear-ladder와 같은 몸)의 나머지 3부위는 계승 태초 22성으로 두고,
// 장신구 칸만 계승 태초(환생 200) · 칠흑(무작위 5줄 / 6줄, 각성 0 / 5)으로 바꿔 끼운 전투력을 비교합니다. 공명 · 세트는 따로 줄을 둡니다.
// 사용: node scripts/check-onyx-power.mjs
import { loadGame } from './lib/game-modules.mjs';
import { random } from './lib/sim.mjs';
import { researchBudgetTools } from './lib/research-budget.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine'), { stats, power } = await load('systems/stats');
const Ec = await load('data/economy'), O = await load('data/onyx'), { gearName } = await load('data/maple-gear');
const { rollAffixes, refineOption } = await load('data/gear');
const { researchByBudget } = await researchBudgetTools({ load });
const SAMPLES = 160, rng = random(7);
const body = () => { const s = newState(0); s.level = 100; s.rebirths = 200; s.statPoints = 0; s.attributes = { str: 300, dex: 100, int: 0, vit: 100, wis: 0, luk: 300 }; Object.assign(s.permanent, researchByBudget(200, 'attack')); s.equipment = { rod: null, coat: null, charm: null, cape: null }; return s; };
const best = (affixes, pw, rarity) => affixes.map(x => x.rule ? x : refineOption(x, pw, rarity, () => 1, 100));
const heir = slot => { const pw = Ec.heirPower('primal', 200, 100), style = slot === 'rod' ? 'physical' : 'balanced'; return { id: 'h-' + slot, slot, style, rarity: 6, power: pw, level: 100, enhance: 22, heir: 'primal', name: gearName(slot, 6, style), affixes: best(rollAffixes(6, pw, undefined, rng, [], slot, 100), pw, 6) }; };
const onyx = (bossIdx, lines, rank) => { const def = O.ONYX_DROP_ITEMS[bossIdx % O.ONYX_DROP_ITEMS.length], it = O.onyxAccessory(def, 'ox', 100); it.enhance = 22; it.onyxRank = rank; it.affixes = best(rollAffixes(lines + 1, it.power, it.origin, rng, it.affixes, 'charm', 100, 6), it.power, 6); return it; };
const avg = (make, set = false) => { let sum = 0; for (let k = 0; k < SAMPLES; k++) { const s = body(); if (set) { s.inventory = O.ONYX_ITEMS.map((d, i) => ({ ...O.onyxAccessory(d, 'set' + i, 100), affixes: [] , onyxRank: 5 })); s.bossCores = { [O.ONYX_CORE_ID]: { rank: 5, attrs: [] } }; } for (const slot of ['rod', 'coat', 'cape']) s.equipment[slot] = heir(slot); s.equipment.charm = make(k); sum += power(stats(s)); } return sum / SAMPLES; };
const base = avg(() => heir('charm'));
const row = (label, v) => console.log(`${label.padEnd(30)} ${(v / base).toFixed(3)}`);
row('계승 태초 장신구(환생 200)', base);
for (const lines of [5, 6]) for (const rank of [0, 5]) row(`칠흑 무작위 ${lines}줄 · 각성 ${rank}`, avg(k => onyx(k, lines, rank)));
row('칠흑 6줄 · 각성 5 + 9종 세트 · 공명', avg(k => onyx(k, 6, 5), true));
console.log('(계승 태초 장신구 = 1.000. 칠흑 고유 옵션은 보스마다 달라 돌려 가며 평균. 마지막 줄만 9종 세트 · 공명 포함)');
