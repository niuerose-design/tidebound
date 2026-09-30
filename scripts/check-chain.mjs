// 연속 행동 도입 전후 비교(수치 조정 없이 결과만 봅니다). 사용: node scripts/check-chain.mjs
// '도입 전'은 BALANCE.chainMaxActions = 1로 돌립니다. 이때 연속 판정을 하지 않아 난수 순서까지 기존과 같습니다.
import { loadGame } from './lib/game-modules.mjs';
import { random, manage, chooseStage } from './lib/sim.mjs';
const { load } = loadGame();
const { newState, tick, act, advance } = await load('systems/engine');
const { snapshot } = await load('systems/stats');
const { duel } = await load('systems/duel');
const { canUse, validLoadout } = await load('systems/progression');
const { BALANCE } = await load('data/balance');
const { SKILLS } = await load('data/skills');
const { JOBS } = await load('data/classes');
const { STAGES, DUNGEONS } = await load('data/world');
const CHAIN_MAX = BALANCE.chainMaxActions;

// 레벨 40 · 환생 5회 직업 빌드(check-combat-depth와 같은 구성).
const BUILDS = [
    ['whaler', { str: 80, dex: 30, vit: 40, wis: 10 }, ['breath', 'pierce', 'whaleStrike', 'focus', 'barb']],
    ['corsair', { dex: 70, luk: 40, str: 30, vit: 20 }, ['breath', 'cut', 'razor', 'drift', 'precision']],
    ['tempest', { int: 80, wis: 40, vit: 30, dex: 10 }, ['spring', 'wave', 'maelstrom', 'arcane', 'abyssMind']],
    ['oracle', { wis: 65, int: 55, vit: 30, dex: 10 }, ['pearlPrayer', 'wave', 'arcane', 'soulTide', 'flow']],
    ['bulwark', { vit: 85, str: 45, dex: 20, wis: 10 }, ['fortress', 'crush', 'anchor', 'ironWill', 'scales']],
    ['krakenSlayer', { str: 85, dex: 35, vit: 30, wis: 10 }, ['breath', 'krakenBore', 'pierce', 'deepWeakpoint', 'barb']],
    ['stormScribe', { int: 85, wis: 40, vit: 25, dex: 10 }, ['spring', 'thunderPsalm', 'maelstrom', 'arcane', 'overcast']],
    ['coralSaint', { vit: 70, wis: 55, int: 25, dex: 10 }, ['reefPulse', 'anchor', 'saintTide', 'sanctuaryShell', 'soulTide']],
    ['bonecaster', { int: 75, wis: 40, vit: 35, dex: 10 }, ['breath', 'graveHook', 'arcane', 'boneLegacy', 'ossuaryRite']],
];
const jobName = id => JOBS.find(j => j.id === id)?.name || id;
function build([job, attributes, skills]) {
    const s = newState(0);
    s.level = 40; s.rebirths = 5; s.attributes = { ...s.attributes, ...attributes }; s.job = job; s.equipment = {}; s.inventory = []; s.permanent = {}; s.book = {};
    s.unlockedJobs = JOBS.map(j => j.id); s.jobMastery[job] = 12000;
    for (const sk of SKILLS) { s.learned[sk.id] = 1; s.skillPractice[sk.id] = 80000; }
    s.skills = [];
    for (const id of skills) if (canUse(s, id) && validLoadout(s, [...s.skills, id])) s.skills.push(id);
    s.running = true;
    return s;
}
/** tick마다 새로 생긴 전투 로그를 넘겨 줍니다(로그 목록은 잘려도 한 턴 분량은 남습니다). */
function play(s, turns, rng, onLogs) {
    for (let n = 0; n < turns; n++) {
        const before = s.logId;
        tick(s, rng);
        if (onLogs) onLogs(s.logs.filter(l => l.id > before));
    }
}
const avg = xs => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const fmt = (v, d = 1) => Number.isFinite(v) ? v.toFixed(d) : '-';

function measure() {
    const out = {};
    // 1. 관리형 새 캐릭터 6시간(물리·마법 × 시드 3): 처치당 턴, 사망률, 도달 레벨.
    out.fresh = [];
    for (const magic of [false, true]) for (const seed of [11, 29, 47]) {
        const s = newState(0), rng = random(seed);
        for (let n = 0; n < 10800; n++) {
            if (n % 30 === 0) manage(s, { magic, rng });
            if (n % 300 === 0) chooseStage(s, seed + n);
            tick(s, rng);
        }
        out.fresh.push({ build: magic ? '마법' : '물리', seed, turnsPerKill: s.turn / Math.max(1, s.kills), deathsPer1k: s.deaths / Math.max(1, s.kills) * 1000, level: s.level, kills: s.kills });
    }
    // 2. 직업별 필드 사냥(레벨 40 최고 사냥터, 시드 3 × 1,800턴 = 1시간).
    const stage = STAGES.filter(x => x.level <= 40 && x.rebirth <= 5).sort((a, b) => b.level - a.level)[0];
    out.stage = stage.name;
    out.field = BUILDS.map(b => {
        const rows = [1, 2, 3].map(seed => { const s = build(b); s.stage = stage.id; play(s, 1800, random(seed)); return s; });
        return { job: b[0], turnsPerKill: avg(rows.map(s => s.turn / Math.max(1, s.kills))), deathsPer1k: avg(rows.map(s => s.deaths / Math.max(1, s.kills) * 1000)), killsPerHour: avg(rows.map(s => s.kills)) };
    });
    // 3. 던전 클리어율과 보스 기절 고정(직업 9종 × 던전 × 10회).
    const dungeons = DUNGEONS.filter(d => d.level <= 40 && d.rebirth <= 5);
    out.dungeons = dungeons.map(d => {
        let clears = 0, tries = 0, bossActs = 0, bossStunned = 0, longest = 0;
        for (const b of BUILDS) for (let seed = 1; seed <= 10; seed++) {
            const s = build(b), rng = random(seed * 97 + d.level);
            act(s, { type: 'dungeon', id: d.id, value: 'once' }, 0, rng);
            if (!s.dungeon) continue;
            tries++;
            const before = s.clears[d.id] || 0;
            let streak = 0;
            for (let n = 0; n < 3000 && s.dungeon; n++) {
                const bossName = s.enemy?.boss ? s.enemy.name : null;
                play(s, 1, rng, logs => {
                    // 보스가 그 턴의 행동을 모두 기절로 날렸는지(연속 기절 턴 수).
                    const acts = bossName ? logs.filter(l => l.event?.actor === bossName) : [];
                    if (!acts.length) return;
                bossActs += acts.length; const stunned = acts.filter(l => l.event.stunned).length; bossStunned += stunned;
                    streak = stunned === acts.length ? streak + 1 : 0; longest = Math.max(longest, streak);
                });
            }
            if ((s.clears[d.id] || 0) > before) clears++;
        }
        return { name: d.name, clearRate: clears / Math.max(1, tries) * 100, tries, bossStunShare: bossStunned / Math.max(1, bossActs) * 100, longestLock: longest };
    });
    // 4. 결투 승률(직업 9종 리그전, 조합마다 시드 20 × 선후 교대).
    const snaps = BUILDS.map(b => snapshot(build(b)));
    out.duel = BUILDS.map((b, i) => {
        let wins = 0, games = 0, turns = 0;
        snaps.forEach((opp, j) => { if (i === j) return; for (let seed = 1; seed <= 20; seed++) { const r = duel(snaps[i], opp, true, random(seed * 31 + i * 7 + j)); games++; turns += r.turns; if (r.winner === 'player') wins++; else if (r.winner === 'draw') wins += .5; } });
        return { job: b[0], winRate: wins / games * 100, turns: turns / games };
    });
    // 5. 24시간 오프라인 정산 계산 시간(새 캐릭터, 레벨 40 작살 빌드).
    out.offline = [['새 캐릭터', () => { const s = newState(0); s.running = true; return s; }], ['레벨 40 whaler', () => { const s = build(BUILDS[0]); s.stage = stage.id; return s; }]].map(([label, make]) => {
        const s = make(), start = performance.now();
        advance(s, s.lastTick + 86_400_000, random(88));
        return { label, ms: performance.now() - start, kills: s.kills, deaths: s.deaths };
    });
    return out;
}

BALANCE.chainMaxActions = 1;
const before = measure();
BALANCE.chainMaxActions = CHAIN_MAX;
const after = measure();

const lines = [];
const row = cells => lines.push(`| ${cells.join(' | ')} |`);
const head = cells => { row(cells); row(cells.map(() => '---')); };
lines.push(`## 연속 행동 도입 전후 시뮬레이션 (계수 ${BALANCE.chainCoefficient}, 턴당 최대 ${CHAIN_MAX}회)`, '');
lines.push('### 새 캐릭터 6시간 관리형 플레이 (물리·마법 × 시드 3)', '');
head(['빌드', '시드', '처치당 턴 (전 → 후)', '처치 1,000회당 사망 (전 → 후)', '도달 레벨 (전 → 후)']);
before.fresh.forEach((b, i) => { const a = after.fresh[i]; row([b.build, b.seed, `${fmt(b.turnsPerKill, 2)} → ${fmt(a.turnsPerKill, 2)}`, `${fmt(b.deathsPer1k)} → ${fmt(a.deathsPer1k)}`, `${b.level} → ${a.level}`]); });
lines.push('', `### 직업별 필드 사냥 (레벨 40 · 환생 5, ${before.stage}, 1시간 × 시드 3)`, '');
head(['직업', '처치당 턴 (전 → 후)', '시간당 처치 (전 → 후)', '처치 1,000회당 사망 (전 → 후)']);
before.field.forEach((b, i) => { const a = after.field[i]; row([jobName(b.job), `${fmt(b.turnsPerKill, 2)} → ${fmt(a.turnsPerKill, 2)}`, `${fmt(b.killsPerHour, 0)} → ${fmt(a.killsPerHour, 0)}`, `${fmt(b.deathsPer1k)} → ${fmt(a.deathsPer1k)}`]); });
lines.push('', '### 던전 클리어율과 보스 기절 고정 (직업 9종 × 10회)', '');
head(['던전', '클리어율 (전 → 후)', '보스 행동 중 기절 비율 (전 → 후)', '보스 최장 연속 기절 턴 (전 → 후)']);
before.dungeons.forEach((b, i) => { const a = after.dungeons[i]; row([b.name, `${fmt(b.clearRate, 0)}% → ${fmt(a.clearRate, 0)}%`, `${fmt(b.bossStunShare)}% → ${fmt(a.bossStunShare)}%`, `${b.longestLock} → ${a.longestLock}`]); });
lines.push('', '### 결투 승률 (직업 9종 리그전, 조합마다 20판)', '');
head(['직업', '승률 (전 → 후)', '평균 턴 (전 → 후)']);
before.duel.forEach((b, i) => { const a = after.duel[i]; row([jobName(b.job), `${fmt(b.winRate, 0)}% → ${fmt(a.winRate, 0)}%`, `${fmt(b.turns)} → ${fmt(a.turns)}`]); });
lines.push('', '### 24시간 오프라인 정산', '');
head(['캐릭터', '계산 시간 (전 → 후)', '처치 (전 → 후)', '사망 (전 → 후)']);
before.offline.forEach((b, i) => { const a = after.offline[i]; row([b.label, `${fmt(b.ms / 1000, 2)}초 → ${fmt(a.ms / 1000, 2)}초`, `${b.kills} → ${a.kills}`, `${b.deaths} → ${a.deaths}`]); });
console.log(lines.join('\n'));
