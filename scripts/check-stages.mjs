// 사냥터 개편(docs/hunting-ground-plan.md 4절): 기준 몸(scripts/lib/reference-body.mjs)으로 환생 시점마다 모든 사냥터 · 무리 서식지를
// 실제 턴 처리(tick)로 사냥시켜 시간당 사망 · 평균 처치 턴 · 시간당 경험치를 재고, 사냥터마다 '적정 환생'을 셉니다.
//   일반 사냥터: 난이도 0에서 사망 0 · 평균 처치 3턴 이하 · 시간당 경험치가 바로 앞 사냥터 이상인 가장 낮은 환생.
//   무리 서식지: 난이도 0에서 시간당 사망 5회 이하 · 시간당 경험치가 그 환생의 최상위 일반 사냥터 이상인 가장 낮은 환생.
// 시험하는 사냥터 몬스터의 도감 기록은 지웁니다(처음 가는 사냥터로 봄).
// --own: 다른 직업 패시브를 빌리지 않은 몸(자기 계열 패시브만)으로 잽니다.
// 사용: node scripts/check-stages.mjs [--own] [--rebirths 0,2,5,...] [--jobs hero,grandMagus,abyssBastion] [--hours .5] [--seeds 1] [--json out.json]
import { loadGame } from './lib/game-modules.mjs';
import { referenceBodies } from './lib/reference-body.mjs';
import { random } from './lib/sim.mjs';
const game = loadGame(), { load } = game;
const { tick } = await load('systems/turn');
const { STAGES } = await load('data/world');
const { xpNeeded } = await load('data/balance');
const { xpWall } = await load('systems/meta');
const { referenceBody } = await referenceBodies(game);

const arg = (k, d) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d;
const REBIRTHS = arg('--rebirths', '0,2,5,8,10,15,20,25,30,35,40,50,60,80,100').split(',').map(Number);
const JOB_IDS = arg('--jobs', 'hero,grandMagus,abyssBastion').split(',');
const HOURS = Number(arg('--hours', .5)), SEEDS = Number(arg('--seeds', 1)), TICKS = Math.round(HOURS * 1800);
const ONLY = arg('--stages', '') ? arg('--stages', '').split(',') : null;

const expBetween = (s, L, E) => { let n = s.exp - E; for (let l = L; l < s.level; l++) n += xpNeeded(l, s.rebirths, xpWall(s)); return n; };
const bodies = new Map();
const bodyFor = (r, jobId, stage) => { const k = `${r}:${jobId}`; if (!bodies.has(k)) bodies.set(k, referenceBody(r, jobId, { borrow: !process.argv.includes('--own') })); const s = structuredClone(bodies.get(k)); for (const id of stage.fish) delete s.book[id]; return s; };
function hunt(r, jobId, stage, tide, seed) {
    const s = bodyFor(r, jobId, stage), rng = random(seed * 7919 + r * 31 + tide);
    Object.assign(s, { stage: stage.id, tide, running: true, enemy: null, recovery: 0, target: null });
    const L = s.level, SP = s.statPoints;
    let exp = 0, kills = 0, deaths = 0, fight = 0, fights = 0;
    for (let i = 0; i < TICKS; i++) {
        const E = s.exp, K = s.kills, D = s.deaths, quiet = s.recovery > 0;
        tick(s, rng);
        if (!quiet) fight++;
        exp += expBetween(s, L, E); kills += s.kills - K; deaths += s.deaths - D; if (s.kills > K) fights++;
        s.level = L; s.exp = E > 0 ? Math.min(E, s.exp) : 0; s.statPoints = SP; s.inventory = [];
    }
    return { exp: exp / HOURS, kills: kills / HOURS, deaths: deaths / HOURS, turns: fights ? fight / fights : Infinity };
}
const avg = xs => ({ exp: xs.reduce((a, x) => a + x.exp, 0) / xs.length, kills: xs.reduce((a, x) => a + x.kills, 0) / xs.length, deaths: xs.reduce((a, x) => a + x.deaths, 0) / xs.length, turns: xs.reduce((a, x) => a + x.turns, 0) / xs.length });
const fmt = n => n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n >= 1e4 ? `${Math.round(n / 1e4)}만` : `${Math.round(n)}`;

const stages = STAGES.filter(st => !ONLY || ONLY.includes(st.id)).filter(st => st.fish?.length);
const normal = stages.filter(st => !st.habitat);
const table = {};
for (const r of REBIRTHS) {
    table[r] = {};
    for (const stage of stages) table[r][stage.id] = avg(JOB_IDS.flatMap(j => Array.from({ length: SEEDS }, (_, k) => hunt(r, j, stage, 0, k + 1))));
    const row = stages.map(st => { const x = table[r][st.id]; return `${st.id.slice(0, 8)} ${fmt(x.exp)}${x.deaths ? `/†${x.deaths.toFixed(0)}` : ''}/${x.turns === Infinity ? '∞' : x.turns.toFixed(1)}t`; });
    console.log(`R${r}: ${row.join(' · ')}`);
}
const ok = (r, st) => {
    const x = table[r][st.id];
    if (st.habitat) {
        const best = Math.max(...normal.map(n => table[r][n.id]?.exp || 0));
        return x.deaths <= 5 && x.exp >= best;
    }
    const i = normal.indexOf(st), prev = i > 0 ? table[r][normal[i - 1].id] : null;
    return x.deaths === 0 && x.turns <= 3 && (!prev || x.exp >= prev.exp);
};
console.log('\n사냥터 | 지금 입장(레벨 · 환생) | 적정 환생(측정)');
const out = [];
for (const st of stages) {
    const fit = REBIRTHS.find(r => ok(r, st));
    out.push({ id: st.id, name: st.name, level: st.level, rebirth: st.rebirth, habitat: !!st.habitat, fit: fit ?? null });
    console.log(`${st.name} | Lv.${st.level} · 환생 ${st.rebirth} | ${fit === undefined ? `측정 범위(${REBIRTHS.at(-1)}) 안에서 없음` : `환생 ${fit}`}`);
}
if (arg('--json')) (await import('node:fs')).writeFileSync(arg('--json'), JSON.stringify({ table, out }, null, 1));
