// 장비 등급 사다리 점검(docs/gear-endgame.md): 등급·강화별 장비 몫, 계승 장비(유물·원시 고대·계승 태초) 몫, 획득 경로별 기대 시간을 한 표로 보여 줍니다.
// 등급·계승 사다리 순서와 신화 대비 격차, 태초 드롭 기대·천장 시간(부위당 약 18~31일)이 범위를 벗어나면 실패합니다.
// 사용: node scripts/check-gear-ladder.mjs
import assert from 'node:assert/strict';
import { loadGame } from './lib/game-modules.mjs';
import { random } from './lib/sim.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine'), { stats, power, dropRate } = await load('systems/stats');
const { RARITIES } = await load('data/balance'), Ec = await load('data/economy'), { ONYX, ONYX_BOSSES, onyxAccessory } = await load('data/onyx');
const { starMultiplier } = await load('data/starforce'), { rarityShareFrom } = await load('systems/encounter'), { gearName } = await load('data/maple-gear');
const { rollAffixes } = await load('data/gear'), C = await load('systems/commerce');

const KILLS_PER_HOUR = 1730, SAMPLES = 60, SLOTS = ['rod', 'coat', 'charm', 'cape'];
const fmt = v => v >= 1e12 ? `${(v / 1e12).toFixed(2)}조` : v >= 1e8 ? `${(v / 1e8).toFixed(1)}억` : v >= 1e4 ? `${(v / 1e4).toFixed(1)}만` : String(Math.round(v));
console.log(`등급 배율 ${RARITIES.map(r => `${r.name}×${r.factor}`).join(' ')} · 칠흑 ×${ONYX.power} · 22성 ×${starMultiplier(22).toFixed(2)}`);

// 1. 장비 몫: Lv.100 · 환생 200 · 치명타 약 100%(행운 300, 키운 캐릭터 기준) 캐릭터에 같은 종류 Lv.100 장비 4부위를 끼운 전투력(v3.66 실제 전투식) ÷ 장비 없음. kind가 있으면 계승 장비(유물·원시 고대·계승 태초) 위력 공식.
const body = () => { const s = newState(0); s.level = 100; s.rebirths = 200; s.statPoints = 0; s.attributes = { str: 300, dex: 100, int: 0, vit: 100, wis: 0, luk: 300 }; Object.assign(s.permanent, { attack: 200, hp: 200, guard: 100, magicGuard: 100 }); s.equipment = { rod: null, coat: null, charm: null, cape: null }; return s; };
const naked = power(stats(body())), rng = random(3);
const piece = (slot, rarity, star, kind, rb) => { const pw = kind ? Ec.heirPower(kind, rb, 100) : Math.round(102 * RARITIES[rarity].factor), style = slot === 'rod' ? 'physical' : 'balanced'; return { id: slot + rarity, slot, style, rarity, power: pw, level: 100, enhance: star, name: gearName(slot, rarity, style), affixes: rollAffixes(rarity, pw, undefined, rng, [], slot, 100) }; };
const share = (rarity, star, kind, rb = 200) => { let sum = 0; for (let k = 0; k < SAMPLES; k++) { const s = body(); for (const slot of SLOTS) s.equipment[slot] = piece(slot, rarity, star, kind, rb); sum += power(stats(s)) / naked; } return sum / SAMPLES; };
const tier = {};
for (const star of [0, 22]) {
    const row = [];
    for (let r = 1; r < RARITIES.length; r++) { tier[`${r}:${star}`] = share(r, star); row.push(`${RARITIES[r].name} ×${tier[`${r}:${star}`].toFixed(2)}`); }
    console.log(`장비 몫(장비 없음 대비, ${star}성 4부위): ${row.join(' · ')}`);
}
// 2. 계승 장비(22성 4부위)와 칠흑. 유물은 전설 등급 옵션, 원시 고대·계승 태초는 각 등급 옵션으로 어림합니다(실제로는 이식·최고 굴림이라 조금 더 높음).
const heir = {};
for (const [kind, rarity, name] of [['relic', 3, '유물'], ['ancient', 5, '원시 고대'], ['primal', 6, '계승 태초']]) {
    heir[kind] = [0, 100, 200].map(rb => share(rarity, 22, kind, rb));
    console.log(`${name} 장비 몫(22성 4부위) 환생 0/100/200: ${heir[kind].map(x => `×${x.toFixed(2)}`).join(' / ')} · Lv.100 위력 ${[0, 100, 200].map(rb => Ec.heirPower(kind, rb, 100)).join('/')}`);
}
console.log(`칠흑 장신구 위력 ${onyxAccessory(ONYX_BOSSES[0], 'x', 100).power} · 원시 각성 정수 환생 0/100/200: ${[0, 100, 200].map(rb => Ec.awakenEssence(rb).toLocaleString()).join(' / ')} · 태초 계승 게이지 ${Ec.PRIMAL_INHERIT.gauge}`);

// 3. 획득: 사냥 드롭(기준 캐릭터) · 감정 · 칠흑.
const book = Object.fromEntries(SLOTS.flatMap(s => [0, 1, 2, 3, 4, 5, 6].map(r => [`${s}:${r}`, true])));
const ref = newState(0); ref.permanent.drop = 10; ref.itemBook = book; ref.attributes.luk = 50;
const rate = dropRate(ref), primal = rarityShareFrom(0, 6), perHour = rate * KILLS_PER_HOUR;
const expectDays = 1 / (perHour * primal) / 24, pityDays = Ec.PRIMAL_DROP_PITY / perHour / 24;
console.log(`사냥 드롭(기준: 처치당 ${(rate * 100).toFixed(2)}%, 시간당 ${KILLS_PER_HOUR}처치): 태초 기대 ${expectDays.toFixed(1)}일(부위당 ${(expectDays * 4).toFixed(0)}일) · 천장 ${pityDays.toFixed(1)}일(부위당 ${(pityDays * 4).toFixed(0)}일) · 고대 ${(1 / (perHour * (rarityShareFrom(0, 5) - primal))).toFixed(1)}시간에 1개`);
for (const rb of [0, 100, 200]) { const s = newState(0); s.level = 100; s.rebirths = rb; const c = C.gambleCost(s), p = Ec.APPRAISAL.at(-1).chance || .0005; console.log(`감정 환생 ${rb}: 1회 ${fmt(c)} G · 태초 기대 ${fmt(c / p)} · 천장 ${fmt(c * Ec.APPRAISAL_PITY.at(-1).count)} G`); }
console.log('칠흑 장신구: 기대 약 18일 · 최장 약 31일(data/onyx.ts 머리 주석, 서식지 방치 기준)');

// 사다리(docs/gear-endgame.md 7절, v3.66 전투력 기준): 0성·22성 모두 전설 < 신화 < 고대 < 태초, 유물(환생 200)은 신화와 고대 사이,
// 원시 고대(환생 200)는 신화의 1.4~1.8배, 계승 태초(환생 200)는 신화의 1.9~2.5배(v3.69 고대 이상 전용 옵션으로 상위 격차가 조금 커짐). 계승 장비는 환생할수록 강해집니다.
const t22 = r => tier[`${r}:22`], myth = t22(4);
for (const star of [0, 22]) { const t = r => tier[`${r}:${star}`]; assert.ok(t(3) < t(4) && t(4) < t(5) && t(5) < t(6), `${star}성 등급 순서: ${[3, 4, 5, 6].map(t).map(x => x.toFixed(2))}`); }
assert.ok(heir.relic[2] > myth && heir.relic[2] < t22(5), `유물(환생 200) ×${heir.relic[2].toFixed(2)}이 신화(×${myth.toFixed(2)})·고대(×${t22(5).toFixed(2)}) 사이 밖`);
assert.ok(heir.ancient[2] / myth >= 1.4 && heir.ancient[2] / myth <= 1.8, `원시 고대(환생 200) 신화의 ${(heir.ancient[2] / myth).toFixed(2)}배`);
assert.ok(heir.primal[2] / myth >= 1.9 && heir.primal[2] / myth <= 2.5, `계승 태초(환생 200) 신화의 ${(heir.primal[2] / myth).toFixed(2)}배`);
for (const k of ['relic', 'ancient', 'primal']) assert.ok(heir[k][0] < heir[k][1] && heir[k][1] < heir[k][2], `${k} 환생 성장`);
console.log(`신화 대비(환생 200): 유물 ×${(heir.relic[2] / myth).toFixed(2)} · 원시 고대 ×${(heir.ancient[2] / myth).toFixed(2)} · 계승 태초 ×${(heir.primal[2] / myth).toFixed(2)}`);
// v3.67 난이도·던전(나이트메어 200 · 무릉 깊은 층)에서도 태초는 칠흑 범위: 태초 등급의 난이도 가중은 ODDS.drop.primalTierCap에서 멈춥니다.
const byTier = [0, 50, 100, 200, 300].map(t => [t, 4 / (perHour * rarityShareFrom(t, 6)) / 24]);
console.log(`난이도별 태초 부위당 기대: ${byTier.map(([t, d]) => `${t} ${d.toFixed(0)}일`).join(' · ')}`);
for (const [t, d] of byTier) assert.ok(d >= 13 && d <= 24 && d <= byTier[0][1] + .5, `난이도 ${t} 태초 부위당 ${d.toFixed(1)}일이 13~24일 밖이거나 난이도 0보다 느림`);
// 태초 드롭은 칠흑과 같은 범위: 부위당 기대 14~24일, 천장 25~40일.
assert.ok(expectDays * 4 >= 14 && expectDays * 4 <= 24, `태초 드롭 부위당 기대 ${(expectDays * 4).toFixed(1)}일이 14~24일 밖`);
assert.ok(pityDays * 4 >= 25 && pityDays * 4 <= 40, `태초 드롭 부위당 천장 ${(pityDays * 4).toFixed(1)}일이 25~40일 밖`);
console.log('ok');
