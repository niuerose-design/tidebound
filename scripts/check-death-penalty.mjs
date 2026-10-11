// 사망 페널티 점검: 환생 구간마다 기준 몸(scripts/lib/reference-body)이 사냥터 · 서식지를 방치로 돌 때,
// 가장 경험치가 많이 나오는 곳(유저가 고를 곳)에서 쓰러지는 빈도 · 회복 대기 비율 · 쓰러질 때 잃는 경험치(사냥 몇 분어치)를 잽니다.
// 경험치 손실률은 지금 값(SPROUT.deathExpLoss)과 비교안(5% · 10%)을 같은 쓰러짐 횟수로 환산해 함께 보여 줍니다.
// 사용: node scripts/check-death-penalty.mjs [--turns 2400] [--own] [--rebirths 10,20,30,50,100] [--tides 0,25,50,100](가장 높은 서식지에서 난이도도 고름)
import { loadGame } from './lib/game-modules.mjs';
import { referenceBodies } from './lib/reference-body.mjs';
import { random } from './lib/sim.mjs';
const game = loadGame(), { load } = game;
const { tick } = await load('systems/turn'), { stats } = await load('systems/stats');
const { STAGES } = await load('data/world'), { BALANCE, xpNeeded } = await load('data/balance');
const { SPROUT, deathRecoveryTurns } = await load('data/sprout'), { xpWall } = await load('systems/meta');
const { referenceBody } = await referenceBodies(game);
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const TIDES = arg('--tides') ? String(arg('--tides')).split(',').map(Number) : [0], N = +arg('--turns', 2400), OWN = argv.includes('--own'), RBS = String(arg('--rebirths', '10,20,30,50,100')).split(',').map(Number);
const hours = N * BALANCE.turnMs / 3600_000, RATES = [SPROUT.deathExpLoss, .05, .1];
const run = (r, stage, tide = 0) => {
    const s = referenceBody(r, 'hero', { borrow: !OWN }); s.stage = stage.id; s.tide = tide; s.running = true; s.enemy = null; s.hp = stats(s).hp;
    const rng = random(11), e0 = s.expEarned || 0, d0 = s.deaths || 0; let rec = 0;
    for (let t = 0; t < N; t++) { tick(s, rng); if (s.recovery > 0) rec++; }
    const gained = (s.expEarned || 0) - e0, deaths = (s.deaths || 0) - d0;
    return { stage, s, gained, deaths, rec, tide };
};
console.log(`## 사망 페널티 (${OWN ? '자기 계열' : '빌림'} 몸 · 히어로, 사냥터마다 ${N}턴 = ${hours.toFixed(1)}시간 방치, 가장 경험치가 많은 곳 기준)`);
console.log('환생 | 고른 곳 | 시간당 쓰러짐 | 회복 대기 | 한 번 손실(2%) = 사냥 n분 | 시간당 경험치 중 손실: 2% · 5% · 10% (회복 대기 포함)');
for (const r of RBS) {
    const cand = STAGES.filter(st => (st.rebirth || 0) <= r);
    const top = cand.filter(st => st.habitat).at(-1), rows = [...cand.map(st => run(r, st)), ...TIDES.filter(t => t > 0).map(t => run(r, top, t))].filter(x => x.gained > 0);
    const best = rows.sort((a, b) => b.gained - a.gained)[0], { s, gained, deaths, rec, stage, tide } = best;
    const need = xpNeeded(s.level, s.rebirths, xpWall(s)), perActiveMin = gained / Math.max(1, (N - rec) * BALANCE.turnMs / 60000);
    const recTurns = deathRecoveryTurns(s), recMinPerDeath = recTurns * BALANCE.turnMs / 60000;
    const share = rate => { const lost = deaths * need * rate, idle = deaths * recMinPerDeath * perActiveMin; return (lost + idle) / (gained + lost + idle); };
    console.log(`R${r} Lv${s.level} | ${stage.name}${stage.habitat ? '(서식지)' : ''}${tide ? ` 난이도 ${tide}` : ''} | ${(deaths / hours).toFixed(1)} | ${Math.round(rec / N * 100)}% | ${(need * SPROUT.deathExpLoss / perActiveMin).toFixed(1)}분 | ${RATES.map(x => (share(x) * 100).toFixed(1) + '%').join(' · ')}`);
}
