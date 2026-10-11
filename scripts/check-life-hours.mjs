// 한 생 길이 점검: 기준 몸(scripts/lib/reference-body, 히어로)을 환생시킨 뒤, 자동 따라가기 규칙(최상위 사냥터 · 고를 수 있는 최대 난이도)과
// 상위 환생 유저처럼 지난 생의 장비(계승)를 들고, 레벨이 오르면 기준 몸과 같은 직업 사다리로 전직 · 같은 비율로 능력치를 나눕니다. 난이도는 유저처럼 맞춥니다(10분 동안 안 쓰러지면 한 단계 올리고, 2번 넘게 쓰러지면 내림, 고를 수 있는 최대까지). 능력치 자동 배분으로 다음 환생 레벨까지 실제 턴 처리(tick)로 사냥해 걸린 시간을 잽니다. 쓰러짐 · 회복 대기 포함, 접속 중 기준(부재중 보정 없음).
// 사용: node scripts/check-life-hours.mjs [--rebirths 30,49,50,60,80,99,100] [--own] [--max-hours 40] [--tide max|0] [--habitat](무리 서식지를 따라감)
import { loadGame } from './lib/game-modules.mjs';
import { referenceBodies } from './lib/reference-body.mjs';
import { random } from './lib/sim.mjs';
const game = loadGame(), { load } = game;
const { tick } = await load('systems/turn'), { stats } = await load('systems/stats'), { act } = await load('systems/engine');
const { BALANCE } = await load('data/balance'), { rebirthLevel } = await load('systems/meta'), { followTarget } = await load('systems/automation');
const { referenceBody } = await referenceBodies(game);
const { jobById } = await load('data/classes'), { recommendLoadout } = await load('systems/loadout');
/** 기준 몸과 같은 직업 사다리: 지금 레벨로 오를 수 있는 가장 높은 히어로 계열 직업. */
const jobFor = level => { let j = jobById('hero'); while (j && j.parent && j.level > level) j = jobById(j.parent); return j; };
const W = { str: 50, dex: 15, vit: 25, wis: 10 };
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const RBS = String(arg('--rebirths', '30,49,50,60,80,99,100')).split(',').map(Number), OWN = argv.includes('--own'), MAX = +arg('--max-hours', 40), TIDE = arg('--tide', 'max'), FOLLOW = argv.includes('--habitat') ? 'habitat' : 'top';
const perHour = 3600_000 / BALANCE.turnMs;
console.log(`## 한 생 길이 (${OWN ? '자기 계열' : '빌림'} 몸 · 히어로, 자동 따라가기 ${FOLLOW === 'habitat' ? '최상위 무리 서식지' : '최상위 사냥터'} · 난이도 ${TIDE === 'max' ? '최대' : TIDE}, 접속 중)`);
for (const r of RBS) {
    // 환생 r회째 생: r-1회 몸이 환생 레벨에 닿아 환생한 직후부터.
    // 상위 환생 유저는 계승 장비(환생해도 남음)를 끼고 다시 오르므로 지난 생 기준 몸의 장비를 그대로 둡니다.
    const s = referenceBody(Math.max(0, r - 1), 'hero', { borrow: !OWN }), gear = structuredClone(s.equipment), skills = [...s.skills];
    s.level = rebirthLevel(s); act(s, { type: 'rebirth' }, 0);
    Object.assign(s, { running: true, enemy: null, equipment: gear }); s.hp = stats(s).hp;
    const grow = () => { while (s.statPoints > 0) { const total = Object.values(s.attributes).reduce((a, b) => a + b, 0) + 1, k = Object.entries(W).sort((a, b) => (s.attributes[a[0]] / total - a[1] / 100) - (s.attributes[b[0]] / total - b[1] / 100))[0][0]; s.attributes[k]++; s.statPoints--; }
        const j = jobFor(s.level); if (j && j.id !== s.job) { s.job = j.id; s.skills = OWN ? recommendLoadout(s) : skills.filter(id => id); } };
    const target = rebirthLevel(s), rng = random(17), marks = {}; let deaths0 = s.deaths || 0, t = 0;
    let tide = 0, winDeaths = s.deaths || 0;
    const WIN = 300, STEP = Math.max(1, Math.round(r / 10));
    for (; t < MAX * perHour && s.level < target; t++) {
        if (t % WIN === 0 && t) { const d = (s.deaths || 0) - winDeaths; winDeaths = s.deaths || 0; const lim = followTarget(s, { on: true, stage: 'top', tide: 'max' }).tide; tide = TIDE === 'max' ? Math.max(0, Math.min(lim, d === 0 ? tide + STEP : d > 2 ? tide - STEP * 2 : tide)) : +TIDE; }
        if (t % 30 === 0 && !s.enemy && !s.recovery) { const f = followTarget(s, { on: true, stage: FOLLOW, tide: 'keep' }); s.stage = f.stage; s.tide = tide; }
        if (t % 30 === 0) grow();
        tick(s, rng);
        for (const m of [50, 70, 90, 100]) if (s.level >= m && marks[m] === undefined) marks[m] = t / perHour;
    }
    const h = t / perHour, done = s.level >= target;
    console.log(`R${r} → Lv${target}: ${done ? h.toFixed(1) + '시간' : `${MAX}시간 안에 못 닿음(Lv${s.level})`} · 쓰러짐 ${(s.deaths || 0) - deaths0} · 마지막 곳 ${s.stage} 난이도 ${s.tide} · Lv50 ${marks[50]?.toFixed(1) ?? '-'}h · Lv70 ${marks[70]?.toFixed(1) ?? '-'}h · Lv90 ${marks[90]?.toFixed(1) ?? '-'}h`);
}
