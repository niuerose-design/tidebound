// 세계석 수입 상한 점검(docs/research-review.md 2.2절): 기준 몸을 사냥터마다 HOURS시간 tick으로 사냥시켜 시간당 처치 · 별빛 개체 · 세계석을 셉니다.
// 보급품(계급 특전) 단계는 --supply(기본 10 = 처치마다 1%). 첫 시간에는 일일 · 주간 목표 보상이 섞이므로 --hours 3 이상을 권합니다.
// 사용: node scripts/check-pearl-income.mjs [--rebirths 50,100,150,200] [--jobs hero,grandMagus] [--stages moon,trench] [--hours 3] [--supply 10] [--tide 0]
import { loadGame } from './lib/game-modules.mjs';
import { referenceBodies } from './lib/reference-body.mjs';
import { random } from './lib/sim.mjs';
const game = loadGame(), { load } = game;
const { tick } = await load('systems/turn');
const { STAGES } = await load('data/world');
const { referenceBody } = await referenceBodies(game);
const arg = (k, d) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d;
const REBIRTHS = arg('--rebirths', '50,100,150,200').split(',').map(Number);
const JOBS = arg('--jobs', 'hero,grandMagus').split(',');
const HOURS = Number(arg('--hours', 1)), TICKS = Math.round(HOURS * 1800), SUPPLY = Number(arg('--supply', 10)), TIDE = Number(arg('--tide', 0));
function hunt(r, jobId, stage, seed) {
    const s = structuredClone(referenceBody(r, jobId));
    s.rank = { exp: 1e9, perks: { supply: SUPPLY } };
    Object.assign(s, { stage: stage.id, tide: TIDE, running: true, enemy: null, recovery: 0, target: null });
    const rng = random(seed * 7919 + r * 31);
    const L = s.level, SP = s.statPoints, P0 = s.pearls, K0 = s.kills;
    const starlit0 = Object.values(s.variantBook || {}).reduce((a, row) => a + (row.starlit || 0), 0);
    let fights = 0, deaths = 0;
    for (let i = 0; i < TICKS; i++) {
        const K = s.kills, D = s.deaths, E = s.exp;
        tick(s, rng);
        if (s.kills > K) fights++; deaths += s.deaths - D;
        s.level = L; s.exp = E > 0 ? Math.min(E, s.exp) : 0; s.statPoints = SP; s.inventory = [];
    }
    const starlit = Object.values(s.variantBook || {}).reduce((a, row) => a + (row.starlit || 0), 0) - starlit0;
    return { pearls: (s.pearls - P0) / HOURS, kills: (s.kills - K0) / HOURS, fights: fights / HOURS, starlit: starlit / HOURS, deaths: deaths / HOURS };
}
const avg = xs => Object.fromEntries(Object.keys(xs[0]).map(k => [k, xs.reduce((a, x) => a + x[k], 0) / xs.length]));
for (const r of REBIRTHS) {
    const ONLY = arg('--stages', '') ? arg('--stages', '').split(',') : null; const stages = STAGES.filter(st => st.fish?.length && st.rebirth <= r && (!ONLY || ONLY.includes(st.id)));
    const rows = stages.map(st => ({ st, x: avg(JOBS.map(j => hunt(r, j, st, 1))) })).sort((a, b) => b.x.pearls - a.x.pearls);
    console.log(`\nR${r} (시간당 · 보급품 ${SUPPLY}단계 · 난이도 ${TIDE})`);
    for (const { st, x } of rows.slice(0, 6)) console.log(`  ${st.id.padEnd(16)} ${st.region.padEnd(7)} 세계석 ${x.pearls.toFixed(0).padStart(4)}  처치 ${x.fights.toFixed(0).padStart(5)}전/${x.kills.toFixed(0).padStart(6)}마리  별빛 ${x.starlit.toFixed(1).padStart(5)}  사망 ${x.deaths.toFixed(0)}${st.habitat ? '  [서식지]' : ''}`);
}
