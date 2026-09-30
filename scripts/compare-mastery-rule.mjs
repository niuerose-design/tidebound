// 숙달 규칙(숙달한 직업은 모든 조건 없이 전직) 도입 전후, 환생 요구 레벨까지 걸리는 턴 수를 비교합니다.
// 사용: node scripts/compare-mastery-rule.mjs
// - fresh: 새 캐릭터 → 첫 환생. 숙달한 직업이 아직 없으므로 두 규칙의 결과가 같아야 합니다.
// - relife: 첫 환생 직후(환생 1회, Lv.1)에 2차 직업을 숙달해 둔 캐릭터 → 다음 환생 요구 레벨.
//   이전 규칙은 2차 직업 레벨(25)에 닿아야 돌아갈 수 있고, 숙달 규칙은 Lv.1부터 바로 돌아갑니다.
import { loadGame } from './lib/game-modules.mjs';
import { random, manage, chooseStage } from './lib/sim.mjs';
const { load } = loadGame();
const { newState, tick, act } = await load('systems/engine');
const { jobRequirements, jobMasteryTarget } = await load('systems/progression');
const { rebirthLevel } = await load('systems/meta');
const { JOBS } = await load('data/classes');

/** 이전 규칙: 숙달 여부와 관계없이 조건 목록을 모두 채워야 전직(문 조건은 이 두 직업에 없음). */
const oldRule = (s, id) => jobRequirements(s, JOBS.find(j => j.id === id)).every(r => r.met);
/** 새 규칙은 서버 판정과 같습니다(act가 거부하면 전직하지 않음). */
function tryJob(s, id, rule, rng) {
    if (s.job === id || (rule === 'old' && !oldRule(s, id))) return;
    try { act(s, { type: 'job', id }, s.turn * 2000, rng); } catch { /* 새 규칙에서도 조건 미달 */ }
}
function run({ magic, seed, rule, relife }) {
    const s = newState(0), rng = random(seed), [first, second] = magic ? ['tide', 'tempest'] : ['harpoon', 'whaler'];
    s.equipment = {}; s.inventory = [];
    if (relife) { s.rebirths = 1; s.unlockedJobs = ['fisher', first, second]; s.jobMastery = { [first]: jobMasteryTarget(first), [second]: jobMasteryTarget(second) }; }
    const target = rebirthLevel(s);
    let n = 0, jobAt = null;
    for (; n < 43200 * 3 && s.level < target; n++) {
        if (n % 30 === 0) { tryJob(s, second, rule, rng); if (s.job !== second) tryJob(s, first, rule, rng); if (s.job === second && jobAt === null) jobAt = s.turn; manage(s, { magic, rng, secondary: 20, primary: 35, gear: false }); }
        if (n % 300 === 0) chooseStage(s, seed + n);
        tick(s, rng);
    }
    return { turns: s.turn, hours: +(s.turn / 1800).toFixed(2), level: s.level, target, job: s.job, secondJobAtTurn: jobAt };
}
const rows = [];
for (const relife of [false, true]) for (const magic of [false, true]) for (const seed of [29, 41]) {
    const before = run({ magic, seed, rule: 'old', relife }), after = run({ magic, seed, rule: 'new', relife });
    rows.push({ scenario: relife ? 'relife' : 'fresh', build: magic ? 'magic' : 'physical', seed, target: before.target, beforeTurns: before.turns, afterTurns: after.turns, change: after.turns - before.turns, beforeSecondJobAt: before.secondJobAtTurn, afterSecondJobAt: after.secondJobAtTurn });
}
console.log(JSON.stringify(rows, null, 1));
