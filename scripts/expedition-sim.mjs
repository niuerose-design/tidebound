// 원정대(오토배틀러) 1단계 균형 측정: 8라운드 PvE 웨이브를 무작위 구매 · 시너지 구매 두 전략으로 돌려 라운드별 승률을 봅니다. node scripts/expedition-sim.mjs [판 수]
import { loadGame } from './lib/game-modules.mjs';
const L = loadGame();
const D = await L.load('data/expedition'), X = await L.load('systems/expedition');
const runs = Number(process.argv[2] || 300);
// 20단계: EXP_SET=deepTide처럼 세트 id를 주면 그 세트 풀로 돌립니다(기본 첫 세트).
const SET = process.env.EXP_SET || D.SETS[0].id, POOL = D.setUnits(SET); console.log(`세트 ${SET} · 유닛 ${POOL.length}종`);
const mkRng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const ROUND_LEVEL = [0, 2, 3, 4, 5, 5, 6, 6, 7, 7, 8, 8, 8];
// v3.426 실제 경제(v3.430부터 기본, EXP_ECON=0이면 공짜 레벨): 레벨을 공짜로 주지 않고 실제 경제로 올립니다 — 판 레벨 2에서 시작, 전투마다 라운드 경험치(EXPEDITION.xpPerRound, EXP_PASSIVE로 바꿔 볼 수 있음),
// 유닛을 산 뒤 남은 골드로 경험치(4골드)를 ROUND_LEVEL 목표까지 삽니다. 기본(공짜 레벨)은 기획 목표 곡선, 이 모드는 실제 플레이에 가까운 값입니다.
const ECON = process.env.EXP_ECON !== '0'; // v3.430: 기본을 실제 경제로(공짜 레벨 모드는 기본 골드 7에서 승률을 20%p쯤 부풀림). 공짜 레벨로 보려면 EXP_ECON=0.
// EXP_PASSIVE='a,b'로 라운드 경험치(전투 뒤 a + b × (라운드 − 1))를 바꿔 볼 수 있습니다. 기본은 게임 데이터(roundXp).
const [PA, PB] = process.env.EXP_PASSIVE !== undefined ? process.env.EXP_PASSIVE.split(',').map(Number).concat(0) : [D.EXPEDITION.roundXp?.base || 0, D.EXPEDITION.roundXp?.perRound || 0];
const PASSIVE = `${PA} + ${PB || 0} × (라운드 − 1)`, passiveAt = round => PA + (PB || 0) * (round - 1);
const LEVEL_FIRST = process.env.EXP_LEVEL_FIRST === '1', levelStats = [];
/** 한 판: 전략 함수가 라운드마다 상점에서 살 유닛을 고릅니다. 벤치 · 성급 합치기 · 배치는 공통. */
function play(strategy, rng, comp) {
    const owned = new Map(); // unit → count(★1 환산 장수)
    const results = [];
    let gold = 0, streak = 0, lv = 2, xp = 0;
    const levels = [];
    for (let round = 1; round <= D.EXPEDITION.rounds; round++) {
        const level = ECON ? lv : ROUND_LEVEL[round];
        gold += D.EXPEDITION.baseGold + Math.min(D.EXPEDITION.interestMax, Math.floor(gold / D.EXPEDITION.interestPer)) + Math.min(3, Math.max(0, streak - 1));
        // EXP_ECON=1 · EXP_LEVEL_FIRST=1: 상점을 보기 전에 이번 라운드 목표 레벨까지 경험치를 먼저 삽니다(레벨 우선 플레이).
        if (ECON && LEVEL_FIRST) { while (lv < 8 && lv < ROUND_LEVEL[round] && gold >= D.EXPEDITION.xp) { gold -= D.EXPEDITION.xp; xp += D.EXPEDITION.xp; while (lv < 8 && xp >= D.EXPEDITION.xpToLevel[lv]) { xp -= D.EXPEDITION.xpToLevel[lv]; lv++; } } }
        const levelNow = ECON ? lv : level;
        let rerolls = 0;
        for (let pass = 0; pass < 4; pass++) {
            const shop = X.rollShop(levelNow, rng, D.EXPEDITION.shopSize, round >= D.EXPEDITION.synergySlotRound ? place(owned, levelNow, comp) : undefined, undefined, POOL);
            const buys = strategy(shop, owned, gold, comp, round, levelNow);
            for (const id of buys) { const cost = D.unitById(id).cost; if (gold >= cost) { gold -= cost; owned.set(id, (owned.get(id) || 0) + 1); } }
            if (strategy === synergy && gold >= D.EXPEDITION.reroll + 2 && rerolls < 3) { gold -= D.EXPEDITION.reroll; rerolls++; continue; }
            break;
        }
        if (ECON) while (lv < 8 && lv < ROUND_LEVEL[Math.min(D.EXPEDITION.rounds, round + 1)] && gold >= D.EXPEDITION.xp) { gold -= D.EXPEDITION.xp; xp += D.EXPEDITION.xp; while (lv < 8 && xp >= D.EXPEDITION.xpToLevel[lv]) { xp -= D.EXPEDITION.xpToLevel[lv]; lv++; } }
        const board = place(owned, ECON ? lv : level, comp);
        levels.push(ECON ? lv : level);
        const r = X.battle(board, X.rollWave(round, rng, 1, POOL), rng);
        const won = r.winner === 'a'; results.push(won); streak = won ? streak + 1 : 0;
        if (ECON) { xp += passiveAt(round); while (lv < 8 && xp >= D.EXPEDITION.xpToLevel[lv]) { xp -= D.EXPEDITION.xpToLevel[lv]; lv++; } }
    }
    levelStats.push(levels);
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
function synergy(shop, owned, gold, comp, round, level = ROUND_LEVEL[round]) {
    const out = []; let g = gold;
    for (const id of shop) { const c = D.unitById(id).cost; if (comp.units.includes(id) && g >= c && (owned.get(id) || 0) < 9) { out.push(id); g -= c; } }
    // 배치 칸이 비면 목표 밖 유닛이라도 싼 것부터 사서 채웁니다(빈 칸은 무조건 손해).
    const slots = D.EXPEDITION.boardSlots[level], distinct = new Set([...owned.keys(), ...out]).size;
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
if (ECON) { const avg = Array.from({ length: D.EXPEDITION.rounds }, (_, i) => (levelStats.reduce((n, l) => n + l[i], 0) / levelStats.length).toFixed(1)); console.log(`실제 경제 · 라운드 경험치 ${PASSIVE} · 평균 판 레벨`, avg.join(' '), `(목표 ${ROUND_LEVEL.slice(1).join(' ')})`); if (process.env.EXP_ONLY === '1') process.exit(0); }
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
// v3.416 난이도 사다리: 의도한 조합(비용 1~2 ★3 · 그 위 ★2)으로 난이도별 8 · 11 · 12라운드 웨이브 승률. 증강 없이 잰 값.
// v3.417: 아이템은 역할에 맞춰(수호 대방패 · 마력 대마법봉 · 그 밖 대검) 끼웁니다(칸 순서로 끼우면 조합마다 엉뚱한 아이템이 걸려 비교가 흐려짐). 조합의 비용 합을 함께 보여 줍니다 — 비싼 조합이 높은 단계에서 앞서는 것은 시너지가 아니라 비용 차이.
const ladderItem = def => def.roles.includes('guard') ? 'towerShield' : def.roles.includes('arcane') ? 'archStaff' : 'greatBlade';
console.log('\n난이도별 완성 편성 승률(8/11/12라운드)');
for (const comp of D.INTENDED_COMPS.filter(c => c.units.every(id => POOL.some(u => u.id === id)))) {
    const board = comp.units.map(id => { const def = D.unitById(id); return { unit: id, star: def.cost <= 2 ? 3 : 2, row: X.frontRole(def) ? 'front' : 'back', item: ladderItem(def) }; });
    const rate = (round, diff) => { let w = 0; const n = Math.max(40, Math.round(trials / 3)); for (let k = 0; k < n; k++) { const rng = mkRng(777 + k * 31 + round); if (X.battle(board, X.rollWave(round, rng, diff, POOL), rng, D.EXPEDITION.maxTurns, undefined, D.isBossRound(round), D.waveMods(round, diff)).winner === 'a') w++; } return Math.round(100 * w / n); };
    console.log(`${comp.name} (비용 ${comp.units.reduce((n, id) => n + D.unitById(id).cost, 0)})`.padEnd(32), D.DIFFICULTIES.filter(d => d.level >= 5).map(d => `${d.icon}${[8, 11, 12].map(r => rate(r, d.level)).join('/')}`).join(' '));
}
// v3.417 성급 가치: 같은 투자(★3 = 9장)라면 웨이브 예산(★3 = 비용 × 4)과 비슷하게 싸워야 합니다. 비용별 평균 1대1 승률(무승부 반).
{
    const duel = (a, b) => { let w = 0; for (let k = 0; k < 20; k++) { const rng = mkRng(5 + k); const r = X.battle([a], [b], rng).winner; w += r === 'a' ? 1 : r === 'draw' ? .5 : 0; } return w / 20; };
    const avg = (ca, sa, cb, sb) => { let t = 0, m = 0; for (const a of POOL.filter(u => u.cost === ca)) for (const b of POOL.filter(u => u.cost === cb)) { t += duel({ unit: a.id, star: sa, row: 'front' }, { unit: b.id, star: sb, row: 'front' }); m++; } return Math.round(100 * t / m); };
    console.log('\n성급 가치(1대1)', [[1, 3, 4, 1], [2, 3, 5, 1], [3, 3, 5, 2]].map(([ca, sa, cb, sb]) => `비용 ${ca} ★${sa} ↔ 비용 ${cb} ★${sb} ${avg(ca, sa, cb, sb)}%`).join(' · '));
}
// v3.423 연습 원정대: 같은 라운드 웨이브와 비교한 승률(플레이어 = 그 라운드 배치 수 · 비용 상한의 무작위 보드, 싼 유닛 ★2 섞기). 목표: 입문 ≫ 웨이브, 중급 ≈ 웨이브 이상, 숙련 ≈ 웨이브 이하.
{
    const rounds = [2, 3, 5, 6, 7, 9, 10, 11];
    const board = (round, rng) => { const slots = X.STARTER_SLOTS[round] + (round <= 3 ? 1 : 0), maxC = round <= 2 ? 1 : round <= 4 ? 2 : round <= 6 ? 3 : round <= 9 ? 4 : 5, cand = POOL.filter(u => u.cost <= maxC), b = []; while (b.length < slots) { const u = cand[Math.floor(rng() * cand.length)]; if (!b.some(p => p.unit === u.id)) b.push({ unit: u.id, star: u.cost <= 2 && round >= 3 && rng() < .8 ? 2 : u.cost === 3 && round >= 7 && rng() < .4 ? 2 : 1, row: X.frontRole(u) ? 'front' : 'back' }); } return b; };
    const rate = (round, foe) => { let w = 0; const n = Math.max(100, trials * 2); for (let k = 0; k < n; k++) { const rng = mkRng(5 + k * 31 + round), b = board(round, rng); if (X.battle(b, foe(rng), rng).winner === 'a') w++; } return Math.round(100 * w / n); };
    console.log('\n연습 원정대 승률(라운드 ' + rounds.join(' · ') + ')');
    console.log('웨이브'.padEnd(18), rounds.map(r => String(rate(r, rng => X.rollWave(r, rng, 1, POOL))).padStart(4)).join(''));
    for (const g of D.STARTER_GHOSTS) console.log(`${g.tier} ${g.name}`.padEnd(18), rounds.map(r => String(rate(r, () => X.starterBoard(g, r))).padStart(4)).join(''));
}
