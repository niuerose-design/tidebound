// 원정대(오토배틀러) 1단계 균형 측정: 8라운드 PvE 웨이브를 무작위 구매 · 시너지 구매 두 전략으로 돌려 라운드별 승률을 봅니다. node scripts/expedition-sim.mjs [판 수]
import { loadGame } from './lib/game-modules.mjs';
const L = loadGame();
const D = await L.load('data/expedition'), X = await L.load('systems/expedition');
const runs = Number(process.argv[2] || 300);
// 20단계: EXP_SET=deepTide처럼 세트 id를 주면 그 세트 풀로 돌립니다(기본 첫 세트).
const SET = process.env.EXP_SET || D.SETS[0].id, POOL = D.setUnits(SET); console.log(`세트 ${SET} · 유닛 ${POOL.length}종`);
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
            const shop = X.rollShop(level, rng, D.EXPEDITION.shopSize, round >= D.EXPEDITION.synergySlotRound ? place(owned, level, comp) : undefined, undefined, POOL);
            const buys = strategy(shop, owned, gold, comp, round);
            for (const id of buys) { const cost = D.unitById(id).cost; if (gold >= cost) { gold -= cost; owned.set(id, (owned.get(id) || 0) + 1); } }
            if (strategy === synergy && gold >= D.EXPEDITION.reroll + 2 && rerolls < 3) { gold -= D.EXPEDITION.reroll; rerolls++; continue; }
            break;
        }
        const board = place(owned, level, comp);
        const r = X.battle(board, X.rollWave(round, rng, 1, POOL), rng);
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
for (const comp of D.INTENDED_COMPS.filter(c => c.units.every(id => POOL.some(u => u.id === id)))) report(`시너지 · ${comp.name}`, Array.from({ length: runs }, (_, i) => play(synergy, mkRng(i * 13 + 5), comp)));
// 완성 편성의 힘: 8라운드 웨이브를 상대로 ‘의도한 조합’ 8유닛(비용 1 ★3 · 비용 2 ★2 · 그 위 ★1) 대 무작위 8유닛(같은 성급 규칙)의 승률. 기획 목표: 무작위 40% · 시너지 75%.
const starOf = def => def.cost === 1 ? 3 : def.cost === 2 ? 2 : 1;
const fixed = units => units.map(id => { const def = D.unitById(id); return { unit: id, star: starOf(def), row: X.frontRole(def) ? 'front' : 'back' }; });
const lastRound = D.EXPEDITION.rounds, trials = Math.max(100, runs);
const vsWave = (board, seed) => { let w = 0; for (let k = 0; k < trials; k++) { const rng = mkRng(seed + k * 97); if (X.battle(board, X.rollWave(lastRound, rng, 1, POOL), rng).winner === 'a') w++; } return Math.round(100 * w / trials); };
console.log(`\n완성 편성 vs ${lastRound}라운드 웨이브`);
{ let w = 0; for (let k = 0; k < trials; k++) { const rng = mkRng(99991 + k * 7); const pick = [...POOL].sort(() => rng() - .5).slice(0, 8).map(d => d.id); if (X.battle(fixed(pick), X.rollWave(lastRound, rng, 1, POOL), rng).winner === 'a') w++; } console.log('무작위 8유닛'.padEnd(28), String(Math.round(100 * w / trials)).padStart(3) + '%'); }
for (const comp of D.INTENDED_COMPS.filter(c => c.units.every(id => POOL.some(u => u.id === id)))) console.log(comp.name.padEnd(28), String(vsWave(fixed(comp.units), 4242)).padStart(3) + '%', '· 특성', X.activeTraits(fixed(comp.units)).filter(t => t.tier).map(t => `${t.trait.name} ${t.count}`).join(' · '));
// 유닛별 1대1 가치: ★1 유닛 둘을 맞붙여 승률(비용 대비 강약 점검).
const ids = POOL.map(u => u.id), win = new Map(ids.map(id => [id, 0]));
for (let i = 0; i < ids.length; i++) for (let j = 0; j < ids.length; j++) { if (i === j) continue; let w = 0; for (let k = 0; k < 20; k++) { const r = X.battle([{ unit: ids[i], star: 1, row: 'front' }], [{ unit: ids[j], star: 1, row: 'front' }], mkRng(i * 1000 + j * 31 + k)); if (r.winner === 'a') w++; } win.set(ids[i], win.get(ids[i]) + w / 20); }
console.log('\n1대1 승률(★1, 29상대 평균) — 비용순');
for (const u of [...POOL].sort((a, b) => a.cost - b.cost || win.get(b.id) - win.get(a.id))) console.log(`비용 ${u.cost}`, u.name.padEnd(8), String(Math.round(100 * win.get(u.id) / (ids.length - 1))).padStart(3) + '%');
// v3.416 난이도 사다리: 의도한 조합(비용 1~2 ★3 · 그 위 ★2, 상위 아이템)으로 난이도별 8 · 11 · 12라운드 웨이브 승률. 증강 없이 잰 값. 목표: 전설(5) 100% · 초월(6) 대부분 · 천벌(7)부터 조합 · ★3 · 증강 완성도가 갈라 놓고, 무한(10)은 증강까지 갖춘 ★3 완성 보드만.
const LADDER_ITEMS = ['greatBlade', 'archStaff', 'towerShield', 'citadel', 'doomSpear', 'bloodOrb', 'archStaff', 'galeHorn'];
console.log('\n난이도별 완성 편성 승률(8/11/12라운드)');
for (const comp of D.INTENDED_COMPS.filter(c => c.units.every(id => POOL.some(u => u.id === id)))) {
    const board = comp.units.map((id, i) => { const def = D.unitById(id); return { unit: id, star: def.cost <= 2 ? 3 : 2, row: X.frontRole(def) ? 'front' : 'back', item: LADDER_ITEMS[i % LADDER_ITEMS.length] }; });
    const rate = (round, diff) => { let w = 0; const n = Math.max(40, Math.round(trials / 3)); for (let k = 0; k < n; k++) { const rng = mkRng(777 + k * 31 + round); if (X.battle(board, X.rollWave(round, rng, diff, POOL), rng, D.EXPEDITION.maxTurns, undefined, D.isBossRound(round), D.waveMods(round, diff)).winner === 'a') w++; } return Math.round(100 * w / n); };
    console.log(comp.name.padEnd(28), D.DIFFICULTIES.filter(d => d.level >= 5).map(d => `${d.icon}${[8, 11, 12].map(r => rate(r, d.level)).join('/')}`).join(' '));
}
