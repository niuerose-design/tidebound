// 장비 등급 사다리 점검(docs/gear-endgame.md 1단계): 등급·강화별 장비 몫, 유물·칠흑 위력, 획득 경로별 기대 시간을 한 표로 보여 줍니다.
// 태초 드롭 기대·천장 시간이 칠흑과 같은 범위(부위당 약 18~31일)에서 벗어나면 실패합니다. 나머지는 보고용입니다.
// 사용: node scripts/check-gear-ladder.mjs
import assert from 'node:assert/strict';
import { loadGame } from './lib/game-modules.mjs';
import { random } from './lib/sim.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine'), { stats, power, dropRate } = await load('systems/stats');
const { RARITIES } = await load('data/balance'), Ec = await load('data/economy'), { ONYX, ONYX_BOSSES, onyxAccessory } = await load('data/onyx');
const { starMultiplier } = await load('data/starforce'), { rarityShareFrom } = await load('systems/encounter'), { gearName } = await load('data/maple-gear');
const { rollAffixes } = await load('data/gear'), C = await load('systems/commerce');

const KILLS_PER_HOUR = 1730, SAMPLES = 30, SLOTS = ['rod', 'coat', 'charm', 'cape'];
const fmt = v => v >= 1e12 ? `${(v / 1e12).toFixed(2)}조` : v >= 1e8 ? `${(v / 1e8).toFixed(1)}억` : v >= 1e4 ? `${(v / 1e4).toFixed(1)}만` : String(Math.round(v));
console.log(`등급 배율 ${RARITIES.map(r => `${r.name}×${r.factor}`).join(' ')} · 칠흑 ×${ONYX.power} · 22성 ×${starMultiplier(22).toFixed(2)}`);

// 1. 장비 몫: Lv.100 · 환생 200 캐릭터에 같은 등급 Lv.100 장비 4부위를 끼운 전투력 ÷ 장비 없음.
const body = () => { const s = newState(0); s.level = 100; s.rebirths = 200; s.statPoints = 0; s.attributes = { str: 300, dex: 100, int: 0, vit: 100, wis: 0, luk: 0 }; Object.assign(s.permanent, { attack: 200, hp: 200, guard: 100, magicGuard: 100 }); s.equipment = { rod: null, coat: null, charm: null, cape: null }; return s; };
const naked = power(stats(body())), rng = random(3);
const piece = (slot, rarity, star) => { const pw = Math.round(102 * RARITIES[rarity].factor), style = slot === 'rod' ? 'physical' : 'balanced'; return { id: slot + rarity, slot, style, rarity, power: pw, level: 100, enhance: star, name: gearName(slot, rarity, style), affixes: rollAffixes(rarity, pw, undefined, rng, [], slot, 100) }; };
for (const star of [0, 22]) {
    const row = [];
    for (let r = 1; r < RARITIES.length; r++) { let sum = 0; for (let k = 0; k < SAMPLES; k++) { const s = body(); for (const slot of SLOTS) s.equipment[slot] = piece(slot, r, star); sum += power(stats(s)) / naked; } row.push(`${RARITIES[r].name} ×${(sum / SAMPLES).toFixed(2)}`); }
    console.log(`장비 몫(장비 없음 대비, ${star}성 4부위): ${row.join(' · ')}`);
}
// 2. 유물·칠흑 위력.
for (const rb of [0, 100, 200]) console.log(`유물 위력 환생 ${rb}: ${Ec.RELICS.map(r => Ec.relicPower(r.power, rb, 100)).join('/')} · Lv.100 고대 ${Math.round(102 * RARITIES[5].factor)} · 태초 ${Math.round(102 * RARITIES[6].factor)} · 칠흑 ${onyxAccessory(ONYX_BOSSES[0], 'x', 100).power}`);

// 3. 획득: 사냥 드롭(기준 캐릭터) · 감정 · 칠흑.
const book = Object.fromEntries(SLOTS.flatMap(s => [0, 1, 2, 3, 4, 5, 6].map(r => [`${s}:${r}`, true])));
const ref = newState(0); ref.permanent.drop = 10; ref.itemBook = book; ref.attributes.luk = 50;
const rate = dropRate(ref), primal = rarityShareFrom(0, 6), perHour = rate * KILLS_PER_HOUR;
const expectDays = 1 / (perHour * primal) / 24, pityDays = Ec.PRIMAL_DROP_PITY / perHour / 24;
console.log(`사냥 드롭(기준: 처치당 ${(rate * 100).toFixed(2)}%, 시간당 ${KILLS_PER_HOUR}처치): 태초 기대 ${expectDays.toFixed(1)}일(부위당 ${(expectDays * 4).toFixed(0)}일) · 천장 ${pityDays.toFixed(1)}일(부위당 ${(pityDays * 4).toFixed(0)}일) · 고대 ${(1 / (perHour * (rarityShareFrom(0, 5) - primal))).toFixed(1)}시간에 1개`);
for (const rb of [0, 100, 200]) { const s = newState(0); s.level = 100; s.rebirths = rb; const c = C.gambleCost(s), p = Ec.APPRAISAL.at(-1).chance || .0005; console.log(`감정 환생 ${rb}: 1회 ${fmt(c)} G · 태초 기대 ${fmt(c / p)} · 천장 ${fmt(c * Ec.APPRAISAL_PITY.at(-1).count)} G`); }
console.log('칠흑 장신구: 기대 약 18일 · 최장 약 31일(data/onyx.ts 머리 주석, 서식지 방치 기준)');

// 태초 드롭은 칠흑과 같은 범위: 부위당 기대 14~24일, 천장 25~40일.
assert.ok(expectDays * 4 >= 14 && expectDays * 4 <= 24, `태초 드롭 부위당 기대 ${(expectDays * 4).toFixed(1)}일이 14~24일 밖`);
assert.ok(pityDays * 4 >= 25 && pityDays * 4 <= 40, `태초 드롭 부위당 천장 ${(pityDays * 4).toFixed(1)}일이 25~40일 밖`);
console.log('ok');
