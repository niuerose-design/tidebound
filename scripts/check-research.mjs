// 세계석 연구 효과 점검(docs/research-review.md): 기준 몸(scripts/lib/reference-body.mjs, 연구는 세계석 예산으로 산 단계)으로
// 연구 하나를 '0단계'와 '몸이 산 단계', 그리고 '산 단계 → +5단계(작은 연구는 최대)'로 두고 같은 난수로 사냥 400턴 × 시드 수 + 월드보스 결투를 비교합니다.
// 사냥터는 들어갈 수 있는 가장 높은 곳, 난이도는 싸움당 3턴 이상 걸리는 첫 난이도(없으면 상한). 방어 계열은 죽을 때만 값이 나오므로 --tide 로 난이도를 직접 줄 수 있습니다.
// 사용: node scripts/check-research.mjs [--rebirths 3,12,30,60,90,150] [--jobs hero] [--seeds 2] [--tide 30] [--ids attack,penetration]
//   약 10~20분(환생 6개 × 직업 1개 × 시드 2). run-checks.mjs에서는 SLOW.
import { loadGame } from './lib/game-modules.mjs';
import { referenceBodies } from './lib/reference-body.mjs';
import { random, totalXP } from './lib/sim.mjs';
const game = loadGame();
const { advance, tick } = await game.load('systems/engine');
const { stats, snapshot, power } = await game.load('systems/stats');
const { duel, raidBossSnapshot } = await game.load('systems/duel');
const { RESEARCH, researchSpent, researchUnlocked } = await game.load('data/economy');
const { RAIDS, RAID } = await game.load('data/altar');
const { STAGES } = await game.load('data/world');
const { tideLimit } = await game.load('systems/meta');
const { referenceBody } = await referenceBodies(game);
const arg = (k, d) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d;
const REBIRTHS = arg('--rebirths', '3,12,30,60,90,150').split(',').map(Number), JOBS = arg('--jobs', 'hero').split(','), SEEDS = Array.from({ length: Number(arg('--seeds', 2)) }, (_, i) => 11 * (i + 1));
const FIXED_TIDE = arg('--tide', '') === '' ? null : Number(arg('--tide', 0));
const IDS = arg('--ids', 'attack,magicAttack,mana,crit,manaRegen,critDamage,penetration,hp,guard,magicGuard,recovery,evasion,lifesteal,exp,gold,drop,mastery,revive').split(',');
const TURNS = 400, NOW = 1790000000000;
const fresh = (body, seed) => { const s = structuredClone(body); s.running = true; s.lastTick = NOW; s.enemy = null; s.target = null; return [s, random(seed)]; };
function run(body, seed) {
    const [s, rng] = fresh(body, seed); let now = NOW;
    const xp0 = totalXP(s), gold0 = s.gold, kills0 = s.kills, deaths0 = s.deaths || 0, drops0 = s.inventory.length + (s.essence || 0) / 10, m0 = Object.values(s.jobMastery || {}).reduce((a, n) => a + n, 0);
    for (let i = 0; i < TURNS / 2.5; i++) advance(s, now += 5000, rng);
    return { xp: totalXP(s) - xp0, gold: s.gold - gold0, kills: s.kills - kills0, deaths: (s.deaths || 0) - deaths0, drops: s.inventory.length + (s.essence || 0) / 10 - drops0, mastery: Object.values(s.jobMastery || {}).reduce((a, n) => a + n, 0) - m0 };
}
function probe(body, turns = 150) { const [s, rng] = fresh(body, 7); let fights = 0, prev = null; const d0 = s.deaths || 0; for (let i = 0; i < turns; i++) { tick(s, rng); if (s.enemy !== prev) { if (s.enemy) fights++; prev = s.enemy; } } return { perFight: turns / Math.max(1, fights), deaths: (s.deaths || 0) - d0 }; }
const agg = v => { const acc = { xp: 0, gold: 0, kills: 0, deaths: 0, drops: 0, mastery: 0 }; for (const sd of SEEDS) { const o = run(v, sd); for (const k in acc) acc[k] += o[k]; } return acc; };
function boss(body, raid) { const me = snapshot(body), b = raidBossSnapshot(raid); let dealt = 0, turns = 0; for (const sd of SEEDS) { const r = duel(me, b, true, random(sd), RAID.maxTurns); dealt += Math.max(0, b.stats.hp - Math.max(0, r.opponentHp)); turns += r.turns || 0; } return { dealt: dealt / SEEDS.length, turns: turns / SEEDS.length }; }
const pct = (a, b) => (a === b ? '±0%' : `${a > b ? '+' : ''}${(100 * (a - b) / Math.max(1e-9, Math.abs(b))).toFixed(0)}%`);
const raidFor = r => RAIDS.find(x => x.id === (r < 20 ? 'balrog' : r < 50 ? 'zakum' : 'horntail')) || RAIDS[0];
for (const job of JOBS) for (const r of REBIRTHS) {
    const base = referenceBody(r, job), raid = raidFor(r);
    const top = STAGES.filter(st => st.level <= base.level && (st.rebirth || 0) <= r).sort((a, b) => b.level - a.level)[0], limit = tideLimit(base);
    let tide = FIXED_TIDE ?? limit;
    if (FIXED_TIDE === null) for (let t = 0; t <= limit; t += Math.max(1, Math.round(limit / 10))) { const p = structuredClone(base); p.stage = top.id; p.tide = t; const o = probe(p); if (o.perFight >= 3 && o.deaths <= 2) { tide = t; break; } }
    base.stage = top.id; base.tide = Math.min(tide, limit);
    const a1 = stats(base); base.hp = a1.hp; base.mana = a1.mana;
    const b0 = agg(base), pf = probe(base, 300), bought = Object.entries(base.permanent).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(' · ');
    console.log(`\n### 환생 ${r} · ${job} · Lv.${base.level} · 연구 ${bought} · ${top.name}(Lv.${top.level}) 난이도 ${base.tide}/${limit} · 싸움당 ${pf.perFight.toFixed(1)}턴 · ${TURNS}턴×${SEEDS.length} 사망 ${b0.deaths} · 전투력 ${power(a1).toLocaleString()} · 치명 ${(a1.crit * 100).toFixed(0)}% 관통 ${(a1.penetration * 100).toFixed(0)}% 회피 ${(a1.evasion * 100).toFixed(0)}% 흡혈 ${(a1.lifesteal * 100).toFixed(1)}% | 보스 ${raid.name}`);
    console.log('연구 | 비교 | 비용 | 경험치 | 골드 | 처치 | 사망 | 드롭 | 숙련 | 보스 피해(턴) | 전투력');
    for (const id of IDS) {
        const def = RESEARCH.find(x => x.id === id); if (!def || !researchUnlocked(r, def)) continue;
        const have = base.permanent[id] || 0, bands = [];
        if (have > 0) bands.push([0, have]);
        if (have < def.max) bands.push([have, Math.min(def.max, def.max <= 25 ? def.max : have + 5)]);
        for (const [from, to] of bands) {
            const lo = structuredClone(base); lo.permanent[id] = from; const hi = structuredClone(base); hi.permanent[id] = to;
            const sl = stats(lo), sh = stats(hi); lo.hp = sl.hp; lo.mana = sl.mana; hi.hp = sh.hp; hi.mana = sh.mana;
            const L = agg(lo), H = agg(hi), bl = boss(lo, raid), bh = boss(hi, raid);
            console.log(`${def.name}(${id}) | ${from}→${to} | ${(researchSpent(id, to) - researchSpent(id, from)).toLocaleString()} | ${pct(H.xp, L.xp)} | ${pct(H.gold, L.gold)} | ${pct(H.kills, L.kills)} | ${L.deaths}→${H.deaths} | ${pct(H.drops, L.drops)} | ${pct(H.mastery, L.mastery)} | ${pct(bh.dealt, bl.dealt)} (${bl.turns.toFixed(0)}→${bh.turns.toFixed(0)}) | ${pct(power(sh), power(sl))}`);
        }
    }
}
