// 원정대(오토배틀러) 1단계 균형 측정: 8라운드 PvE 웨이브를 무작위 구매 · 시너지 구매 두 전략으로 돌려 라운드별 승률을 봅니다. node scripts/expedition-sim.mjs [판 수]
import { loadGame } from './lib/game-modules.mjs';
const L = loadGame();
const D = await L.load('data/expedition'), X = await L.load('systems/expedition');
const runs = Number(process.argv[2] || 300);
const mkRng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const ROUND_LEVEL = [0, 2, 3, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8];
/** 한 판: 전략 함수가 라운드마다 상점에서 살 유닛을 고릅니다. 벤치 · 성급 합치기 · 배치는 공통. */
function play(strategy, rng, comp) {
    const owned = new Map(); // unit → count(★1 환산 장수)
    const results = [];
    let gold = 0, streak = 0;
    for (let round = 1; round <= D.EXPEDITION.rounds; round++) {
        const level = ROUND_LEVEL[round];
        gold += D.EXPEDITION.baseGold + Math.min(D.EXPEDITION.interestMax, Math.floor(gold / D.EXPEDITION.interestPer)) + Math.min(3, Math.max(0, streak - 1));
        let rerolls = 0;
        for (let pass = 0; pass < 4; pass++) {
            const shop = X.rollShop(level, rng, D.EXPEDITION.shopSize, round >= D.EXPEDITION.synergySlotRound ? place(owned, level, comp) : undefined);
            const buys = strategy(shop, owned, gold, comp, round);
            for (const id of buys) { const cost = D.unitById(id).cost; if (gold >= cost) { gold -= cost; owned.set(id, (owned.get(id) || 0) + 1); } }
            if (strategy === synergy && gold >= D.EXPEDITION.reroll + 2 && rerolls < 3) { gold -= D.EXPEDITION.reroll; rerolls++; continue; }
            break;
        }
        const board = place(owned, level, comp);
        const r = X.battle(board, X.rollWave(round, rng), rng);
        const won = r.winner === 'a'; results.push(won); streak = won ? streak + 1 : 0;
    }
    return results;
}
/** 보유 장수 → 성급(3장 = ★2, 9장 = ★3) → 비용 × 성급 높은 순으로 배치 수만큼. 목표 편성이 있으면 그 유닛을 먼저. */
function place(owned, level, comp) {
    const slots = D.EXPEDITION.boardSlots[level];
    const list = [...owned.entries()].map(([unit, n]) => ({ unit, star: n >= 9 ? 3 : n >= 3 ? 2 : 1, def: D.unitById(unit) }));
    list.sort((a, b) => (comp ? (comp.units.includes(b.unit) ? 1 : 0) - (comp.units.includes(a.unit) ? 1 : 0) : 0) || b.def.cost * b.star - a.def.cost * a.star);
    return list.slice(0, slots).map(x => ({ unit: x.unit, star: x.star, row: X.frontRole(x.def) ? 'front' : 'back' }));
}
function random(shop, owned, gold) { const out = []; let g = gold; for (const id of shop) { const c = D.unitById(id).cost; if (g >= c) { out.push(id); g -= c; } } return out; }
function synergy(shop, owned, gold, comp, round) {
    const out = []; let g = gold;
    for (const id of shop) { const c = D.unitById(id).cost; if (comp.units.includes(id) && g >= c && (owned.get(id) || 0) < 9) { out.push(id); g -= c; } }
    // 배치 칸이 비면 목표 밖 유닛이라도 싼 것부터 사서 채웁니다(빈 칸은 무조건 손해).
    const slots = D.EXPEDITION.boardSlots[ROUND_LEVEL[round]], distinct = new Set([...owned.keys(), ...out]).size;
    if (distinct < slots) for (const id of [...shop].sort((a, b) => D.unitById(a).cost - D.unitById(b).cost)) { if (out.includes(id)) continue; const c = D.unitById(id).cost; if (g >= c && new Set([...owned.keys(), ...out]).size < slots) { out.push(id); g -= c; } }
    return out;
}
function report(label, all) {
    const n = all.length, byRound = Array.from({ length: D.EXPEDITION.rounds }, (_, i) => Math.round(100 * all.filter(r => r[i]).length / n));
    const total = Math.round(100 * all.flat().filter(Boolean).length / (n * D.EXPEDITION.rounds));
    console.log(label.padEnd(28), '전체', String(total).padStart(3) + '%', '· 라운드별', byRound.map(x => String(x).padStart(3)).join(' '));
}
report('무작위 구매', Array.from({ length: runs }, (_, i) => play(random, mkRng(i * 7 + 1))));
for (const comp of D.INTENDED_COMPS) report(`시너지 · ${comp.name}`, Array.from({ length: runs }, (_, i) => play(synergy, mkRng(i * 13 + 5), comp)));
// 완성 편성의 힘: 8라운드 웨이브를 상대로 ‘의도한 조합’ 8유닛(비용 1 ★3 · 비용 2 ★2 · 그 위 ★1) 대 무작위 8유닛(같은 성급 규칙)의 승률. 기획 목표: 무작위 40% · 시너지 75%.
const starOf = def => def.cost === 1 ? 3 : def.cost === 2 ? 2 : 1;
const fixed = units => units.map(id => { const def = D.unitById(id); return { unit: id, star: starOf(def), row: X.frontRole(def) ? 'front' : 'back' }; });
const lastRound = D.EXPEDITION.rounds, trials = Math.max(100, runs);
const vsWave = (board, seed) => { let w = 0; for (let k = 0; k < trials; k++) { const rng = mkRng(seed + k * 97); if (X.battle(board, X.rollWave(lastRound, rng), rng).winner === 'a') w++; } return Math.round(100 * w / trials); };
console.log(`\n완성 편성 vs ${lastRound}라운드 웨이브`);
{ let w = 0; for (let k = 0; k < trials; k++) { const rng = mkRng(99991 + k * 7); const pick = [...D.UNITS].sort(() => rng() - .5).slice(0, 8).map(d => d.id); if (X.battle(fixed(pick), X.rollWave(lastRound, rng), rng).winner === 'a') w++; } console.log('무작위 8유닛'.padEnd(28), String(Math.round(100 * w / trials)).padStart(3) + '%'); }
for (const comp of D.INTENDED_COMPS) console.log(comp.name.padEnd(28), String(vsWave(fixed(comp.units), 4242)).padStart(3) + '%', '· 특성', X.activeTraits(fixed(comp.units)).filter(t => t.tier).map(t => `${t.trait.name} ${t.count}`).join(' · '));
// 유닛별 1대1 가치: ★1 유닛 둘을 맞붙여 승률(비용 대비 강약 점검).
const ids = D.UNITS.map(u => u.id), win = new Map(ids.map(id => [id, 0]));
for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) { if (i === j) continue; let w = 0; for (let k = 0; k < 20; k++) { const r = X.battle([{ unit: ids[i], star: 1, row: 'front' }], [{ unit: ids[j], star: 1, row: 'front' }], mkRng(i * 1000 + j * 31 + k)); if (r.winner === 'a') w++; } win.set(ids[i], win.get(ids[i]) + w / 20); }
console.log('\n1대1 승률(★1, 29상대 평균) — 비용순');
for (const u of [...D.UNITS].sort((a, b) => a.cost - b.cost || win.get(b.id) - win.get(a.id))) console.log(`비용 ${u.cost}`, u.name.padEnd(8), String(Math.round(100 * win.get(u.id) / (ids.length - 1))).padStart(3) + '%');
