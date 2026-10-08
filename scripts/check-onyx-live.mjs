// 칠흑 보스 실전 점검(docs/boss-plan.md §8.1): check-bosses.mjs의 1:1 측정과 달리 실제 게임 루프(systems/turn tick)로 돕니다.
//   --force [N]   서식지마다 기준 몸(5직업) × N회 강제 출현 → 격파 · 떠남 · 쓰러짐 비율과 처치 턴. 앞 전투 뒤 체력 그대로(회복 대기는 끝까지 돌림).
//   --pace [N]    서식지마다 히어로 기준 몸으로 N턴 방치 → 출현 수(= 칠흑 판정 수) · 시간당 출현 · 칠흑 출현 · 쓰러짐 · 회복 대기 비율.
// 공통: --own(자기 계열 몸, 기본은 빌림) --rebirth R(기본은 서식지 적정 환생 STAGE_FIT).
// 사용: node scripts/check-onyx-live.mjs --force 20 [--own] [--rebirth 50] / node scripts/check-onyx-live.mjs --pace 6000 [--own]
import { loadGame } from './lib/game-modules.mjs';
import { referenceBodies } from './lib/reference-body.mjs';
import { random } from './lib/sim.mjs';
const game = loadGame(), { load } = game;
const { tick } = await load('systems/turn');
const { stats } = await load('systems/stats');
const { spawn } = await load('systems/encounter');
const { STAGES, STAGE_FIT } = await load('data/world');
const { onyxBossFor, ONYX } = await load('data/onyx');
const { BALANCE } = await load('data/balance');
const { referenceBody } = await referenceBodies(game);
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const OWN = argv.includes('--own'), REB = arg('--rebirth'), JOBS = ['hero', 'grandMagus', 'abyssBastion', 'curseQueen', 'lifeOcean'];
const habitats = STAGES.filter(st => st.habitat && onyxBossFor(st.region));
const fitOf = habitat => REB ? +REB : Math.max(habitat.rebirth, STAGE_FIT[habitat.id] ?? habitat.rebirth);
const body = (r, job, habitat) => { const s = referenceBody(r, job, { borrow: !OWN }); s.stage = habitat.id; s.running = true; s.enemy = null; s.hp = stats(s).hp; s.onyxSeen = {}; s.onyxMiss = {}; s.onyxBook = {}; return s; };
const pct = (a, b) => Math.round(a / b * 100) + '%';

if (argv.includes('--force')) {
    const N = +arg('--force', 20);
    console.log(`## 칠흑 강제 출현 ${N}회 × 5직업 (${OWN ? '자기 계열' : '빌림'} 몸, 실제 루프)`);
    for (const habitat of habitats) {
        const fit = fitOf(habitat), def = onyxBossFor(habitat.region);
        const per = JOBS.map(job => {
            const s = body(fit, job, habitat), rng = random(13);
            let kills = 0, left = 0, died = 0, hp = 0; const kt = [];
            for (let i = 0; i < N; i++) {
                for (let g = 0; g < 400 && (s.recovery > 0 || !s.running); g++) tick(s, rng);
                s.enemy = null; s.effects = {}; s.playerStun = 0; spawn(s, rng, 'onyx');
                const foe = s.enemy, t0 = s.turn, k0 = s.onyxBook[def.id] || 0; hp = foe.maxHp;
                for (let t = 0; t < ONYX.turns + 50 && s.enemy === foe; t++) tick(s, rng);
                if ((s.onyxBook[def.id] || 0) > k0) { kills++; kt.push(s.turn - t0); } else if (foe.hp > 0 && s.turn >= foe.leavesAt) left++; else died++;
            }
            return { job, kills, left, died, kt: kt.length ? kt.reduce((a, b) => a + b, 0) / kt.length : NaN, hp };
        });
        const sum = k => per.reduce((a, x) => a + x[k], 0), all = N * JOBS.length;
        console.log(`${habitat.region.padEnd(7, '　')} ${def.name.padEnd(6, '　')} R${fit} 체력 ${per[0].hp.toLocaleString()} | 격파 ${pct(sum('kills'), all)} · 떠남 ${pct(sum('left'), all)} · 쓰러짐 ${pct(sum('died'), all)} | ${per.map(x => `${x.job} ${pct(x.kills, N)}/${isNaN(x.kt) ? '-' : x.kt.toFixed(0)}턴`).join(' · ')}`);
    }
}
if (argv.includes('--pace')) {
    const N = +arg('--pace', 6000), hours = N * BALANCE.turnMs / 3600_000;
    console.log(`## 서식지 방치 ${N}턴(${hours.toFixed(1)}시간, 히어로 ${OWN ? '자기 계열' : '빌림'} 몸): 출현 수 = 칠흑 판정 수`);
    for (const habitat of habitats) {
        const fit = fitOf(habitat), s = body(fit, 'hero', habitat), rng = random(5);
        let deaths = 0, rec = false, recTurns = 0, prevSeen = 0, total = 0, onyxN = 0;
        for (let t = 0; t < N; t++) {
            tick(s, rng);
            if (s.recovery > 0) { recTurns++; if (!rec) deaths++; rec = true; } else rec = false;
            // onyxSeen은 출현마다 +1, 칠흑이 나오면 0으로 돌아가므로 줄어든 순간이 칠흑 출현입니다.
            const seen = s.onyxSeen[habitat.region] || 0;
            if (seen >= prevSeen) total += seen - prevSeen; else { total += seen + 1; onyxN++; }
            prevSeen = seen;
        }
        console.log(`${habitat.region.padEnd(7, '　')} R${fit} Lv${s.level} | 출현 ${total}(턴/출현 ${(N / Math.max(1, total)).toFixed(0)} · 시간당 ${Math.round(total / hours)}) · 칠흑 ${onyxN}(시간당 ${(onyxN / hours).toFixed(1)}) · 쓰러짐 ${deaths} · 회복 대기 ${Math.round(recTurns / N * 100)}%`);
    }
}
if (!argv.includes('--force') && !argv.includes('--pace')) console.log('사용: node scripts/check-onyx-live.mjs --force [N] | --pace [N] [--own] [--rebirth R]');
