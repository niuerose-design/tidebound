// 원정대 시너지 가치 측정(v3.419): 특성마다 ① 2단계 값 = 그 특성 유닛 2 + 무관 유닛 3 보드로 5라운드 웨이브를 상대할 때 효과 켬/끔 승률 차,
// ② 4단계 상승분 = 특성 유닛 4 + 무관 2 보드로 8라운드 웨이브를 상대할 때 4단계 효과와 2단계 효과의 승률 차. 같은 보드 · 웨이브 · 난수로 비교합니다.
// 사용: node scripts/expedition-traits.mjs [판 수]   TRAIT_PATCH='{"meadow":[{...},{...}]}'로 단계 표를 바꿔 볼 수 있습니다.
import { loadGame } from './lib/game-modules.mjs';
const L = loadGame();
const D = await L.load('data/expedition'), X = await L.load('systems/expedition');
const mkRng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const POOL = D.setUnits(process.env.EXP_SET || D.SETS[0].id), n = Number(process.argv[2] || 1200);
for (const [id, tiers] of Object.entries(JSON.parse(process.env.TRAIT_PATCH || '{}'))) D.TRAITS.find(t => t.id === id).tiers = tiers;
function measure(T, size, round, maxCost, star, swap) {
    const has = u => u.origin === T.id || u.roles.includes(T.id);
    const mine = POOL.filter(u => has(u) && u.cost <= maxCost), other = POOL.filter(u => !has(u) && u.cost <= maxCost);
    if (mine.length < size) return null;
    let on = 0, off = 0; const saved = T.tiers;
    for (let k = 0; k < n; k++) {
        const rng = mkRng(11 + k * 7), pick = arr => arr[Math.floor(rng() * arr.length)];
        const m = []; while (m.length < size) { const u = pick(mine); if (!m.includes(u)) m.push(u); }
        const rest = []; while (rest.length < 6 - (size === 2 ? 1 : 0) - size) { const u = pick(other); if (!rest.includes(u)) rest.push(u); }
        const board = [...m, ...rest].map(u => ({ unit: u.id, star: star(u), row: X.frontRole(u) ? 'front' : 'back' }));
        const seed = 99 + k * 13, wave = X.rollWave(round, mkRng(seed), 1, POOL);
        T.tiers = saved; if (X.battle(board, wave, mkRng(seed + 1)).winner === 'a') on++;
        T.tiers = swap(saved); if (X.battle(board, wave, mkRng(seed + 1)).winner === 'a') off++;
        T.tiers = saved;
    }
    return Math.round(100 * (on - off) / n);
}
const rows = [];
for (const T of D.TRAITS.filter(t => t.kind !== 'special')) {
    const two = measure(T, 2, 5, 3, u => u.cost === 1 ? 2 : 1, () => []);
    const four = T.tiers.length >= 2 ? measure(T, 4, 8, 4, u => u.cost <= 2 ? 2 : 1, s => [s[0], { ...s[0], count: s[1].count }, ...s.slice(2)]) : null;
    rows.push({ name: T.name, two, four });
}
console.log('시너지'.padEnd(10), '2단계 켬/끔', '  2 → 4 상승분');
for (const r of rows) console.log(r.name.padEnd(10), String(r.two ?? '-').padStart(6) + '%p', String(r.four ?? '-').padStart(10) + '%p');
