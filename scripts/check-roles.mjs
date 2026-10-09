// v3.61 역할별 밸런스 점검(docs/concept.md 11.4): 직업마다 세부 역할(data/roles.ts)을 달고, 역할에 맞는 지표로 같은 차수 중앙값과 비교합니다.
// 지표(모두 스킬 숙련 완료 · 장비·연구 없음 · 차수별 같은 레벨·능력치 총량, 외길은 그 능력치에 몰아 배분):
//   hunt   일반 사냥 처치 효율(승률 × 남은 체력 반영 ÷ 처치 턴) — 딜러의 주 지표
//   boss   보스 1:1 처치 효율 — 상태이상 딜러의 주 지표, 딜러의 최소선(승률)
//   swarm  ×5 무리 처치 효율·생존(장비 없이 ×100은 모두 지므로 ×5로 비교) — 상태이상 딜러·탱커
//   dungeon 쉬지 않고 3연전: 넘긴 판 비율 × 남은 체력 — 탱커·힐러의 주 지표
//   gain   일반 사냥 효율 × 획득 배율(골드·경험치 평균) — 유틸리티의 주 지표
// 사용: node scripts/check-roles.mjs [--json out.json] [--seeds N]
import fs from 'node:fs';
import { loadGame } from './lib/game-modules.mjs';
import { random } from './lib/sim.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine');
const { stats, goldMultiplier, expMultiplier } = await load('systems/stats');
const { strike, fighterSpeed } = await load('systems/combat');
const { SKILLS } = await load('data/skills');
const { JOBS, lineageOf } = await load('data/classes');
const { MONSTERS, swarmHpMultiplier } = await load('data/world');
const { scaledEnemyStats, profile } = await load('data/encounters');
const { canUse, validLoadout, skillMasteryRanks, lineage, jobFactor, masteryMilestonesFor } = await load('systems/progression');
const { subRoleOf, roleOf, SUB_ROLES } = await load('data/roles');

const arg = (k, d) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d;
const SEEDS = Number(arg('--seeds', 30)), MAX_TURNS = 400, SWARM = 5, DUNGEON_WAVES = 3;
const ONE_STAT = { brawnFisher: 'str', nimbleAngler: 'dex', manaDevotee: 'int', stillAngler: 'wis', bulkyFisher: 'vit', luckyAngler: 'luk' };
// check-job-balance와 같은 차수 조건. 보스는 그 레벨 근처 사냥터 보스.
const TIERS = {
    0: { level: 15, foes: ['seahorse', 'needlefish', 'tidejelly'], boss: 'grottoWarden', tier: 0 },
    1: { level: 15, foes: ['seahorse', 'needlefish', 'tidejelly'], boss: 'grottoWarden', tier: 0 },
    2: { level: 40, foes: ['viper', 'squid', 'leviathan'], boss: 'magmaKraken', tier: 0 },
    3: { level: 50, foes: ['moonfish', 'dragon', 'ancient'], boss: 'templeOracle', tier: 0 },
    4: { level: 60, foes: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta'], boss: 'abyssSovereign', tier: 0 },
    5: { level: 75, foes: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta'], boss: 'ventColossus', tier: 2 },
};
function attributesFor(j, level) {
    const own = SKILLS.filter(sk => sk.job === j.id && sk.type === 'active');
    const ownMagic = own.filter(sk => (sk.damageType === 'magic') !== (sk.scaling === 'swap')).length, ownPhysical = own.length - ownMagic;
    const total = 4 + (level - 1) * 4, magic = ownMagic !== ownPhysical ? ownMagic > ownPhysical : jobFactor(j, 'magic') > jobFactor(j, 'attack');
    const single = ONE_STAT[lineageOf(j)];
    const w = single ? { [single]: 100 } : magic ? { int: 45, wis: 20, vit: 25, dex: 10 } : { str: 45, dex: 20, vit: 25, wis: 10 };
    const out = { str: 0, dex: 0, int: 0, vit: 0, wis: 0, luk: 0 }; let used = 0;
    for (const [k, p] of Object.entries(w)) { out[k] = Math.floor(total * p / 100); used += out[k]; }
    out.vit += total - used;
    return { attrs: out, magic };
}
function loadout(s, j, magic) {
    const line = lineage(j.id);
    const rank = sk => sk.job === j.id ? 0 : sk.job && line.includes(sk.job) ? 1 : !sk.job ? (sk.damageType === 'magic') === magic || sk.type === 'passive' ? 2 : 3 : 9;
    const pool = SKILLS.filter(sk => canUse(s, sk.id) && rank(sk) < 9).sort((a, b) => rank(a) - rank(b) || b.level - a.level);
    s.skills = [];
    for (const sk of pool) if (validLoadout(s, [...s.skills, sk.id])) s.skills.push(sk.id);
}
const player = (st, s, hp = st.hp, mana = st.mana) => ({ name: 'player', stats: st, hp, mana, skills: s.skills, cooldowns: {}, stun: 0, effects: {}, ranks: s.learned, mastery: skillMasteryRanks(s), practice: s.skillPractice });
function foe(id, tier, swarm = 1) {
    const base = scaledEnemyStats(MONSTERS.find(f => f.id === id), { tier });
    const st = swarm > 1 ? { ...base, hp: Math.round(base.hp * swarmHpMultiplier(swarm)) } : base;
    return { name: 'foe', stats: st, hp: st.hp, mana: 100, skills: profile(id).skills, magicBasic: profile(id).magicBasic, cooldowns: {}, stun: 0, effects: {}, ...(swarm > 1 ? { swarm } : {}) };
}
/** 한 판: 끝난 뒤 [이김, 턴, 남은 체력, 남은 마나]. */
function duel(a, b, rng) {
    let n = 0;
    while (a.hp > 0 && b.hp > 0 && n < MAX_TURNS) { n++; const first = fighterSpeed(a) >= fighterSpeed(b) ? a : b, second = first === a ? b : a; strike(first, second, rng); if (first.hp > 0 && second.hp > 0) strike(second, first, rng); }
    return { won: a.hp > 0 && b.hp <= 0, turns: n };
}
const score = (win, hpLeft, turns) => turns > 0 ? win * (0.5 + hpLeft / 2) / turns : 0;
function measure(j) {
    const T = TIERS[j.tier], s = newState(0), { attrs, magic } = attributesFor(j, T.level);
    Object.assign(s, { level: T.level, rebirths: 10, job: j.id, attributes: attrs, equipment: {}, inventory: [], permanent: {}, book: {}, unlockedJobs: JOBS.map(x => x.id) });
    s.jobMastery = { [j.id]: 0 };
    for (const sk of SKILLS) { s.learned[sk.id] = 1; s.skillPractice[sk.id] = masteryMilestonesFor(sk).at(-1); }
    loadout(s, j, magic);
    const st = stats(s), out = {};
    const run = (ids, swarm = 1) => { let w = 0, t = 0, h = 0, k = 0; for (const id of ids) for (let seed = 1; seed <= SEEDS; seed++) { const a = player(st, s), r = duel(a, foe(id, T.tier, swarm), random(seed)); w += r.won ? 1 : 0; t += r.turns; h += Math.max(0, a.hp) / st.hp; k++; } return { win: w / k, turns: t / k, hpLeft: h / k, score: score(w / k, h / k, t / k) }; };
    out.hunt = run(T.foes);
    out.boss = run([T.boss]);
    out.swarm = run([T.foes[0]], SWARM);
    // 던전: 쉬지 않고 연달아 싸움(체력·마나 이어짐).
    let alive = 0, cleared = 0, hpEnd = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
        const rng = random(seed); let hp = st.hp, mana = st.mana, ok = true, w = 0;
        for (; w < DUNGEON_WAVES && ok; w++) { const a = player(st, s, hp, mana), r = duel(a, foe(T.foes[w % T.foes.length], T.tier), rng); ok = r.won; hp = a.hp; mana = a.mana; }
        cleared += (ok ? w : w - 1) / DUNGEON_WAVES; alive += ok ? 1 : 0; hpEnd += ok ? Math.max(0, hp) / st.hp : 0;
    }
    out.dungeon = { alive: alive / SEEDS, cleared: cleared / SEEDS, hpLeft: hpEnd / SEEDS, score: cleared / SEEDS * (0.5 + hpEnd / SEEDS / 2) };
    const gainMult = (goldMultiplier(s) + expMultiplier(s)) / 2;
    out.gain = { mult: gainMult, score: out.hunt.score * gainMult };
    const sub = subRoleOf(j, lineageOf(j));
    return { id: j.id, name: j.name, tier: j.tier, lineage: lineageOf(j), sub, role: roleOf(sub), out };
}
// v3.80 옛 독립 수련(retired)은 전직할 수 없어 재지 않습니다.
const rows = JOBS.filter(j => !j.retired).map(measure);
const median = xs => { const v = [...xs].sort((a, b) => a - b), m = v.length >> 1; return v.length ? v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2 : 0; };
// 같은 차수 중앙값(전 직업) 대비 비율.
for (const tier of Object.keys(TIERS).map(Number)) {
    const g = rows.filter(r => r.tier === tier);
    // 기준값 = max(중앙값, 평균): 절반 넘게 지는 지표(무리)는 중앙값이 0 근처라 비율이 폭주한다
    for (const k of ['hunt', 'boss', 'swarm', 'dungeon', 'gain']) { const xs = g.map(r => r.out[k].score), m = Math.max(median(xs), xs.reduce((s, x) => s + x, 0) / (xs.length || 1)) || 1; for (const r of g) r[k] = r.out[k].score / m; }
}
// 역할별 주 지표와 목표(11.4). [지표, 최소, 최대]
const TARGET = {
    physical: [['hunt', 1.2, 1.5]], magic: [['hunt', 1.2, 1.5]],
    status: [['boss', 1.2, 1.5], ['hunt', 0.9, 1.1]],
    reflect: [['dungeon', 1.0, 9], ['hunt', 0.6, 0.8]], control: [['dungeon', 1.0, 9], ['hunt', 0.6, 0.8]], drain: [['dungeon', 1.0, 9], ['hunt', 0.6, 0.8]],
    healer: [['dungeon', 1.0, 9], ['hunt', 0.7, 0.9]], utility: [['gain', 1.0, 1.1], ['hunt', 0.8, 1.0]],
};
const pct = n => `${Math.round(n * 100)}%`, f2 = n => n.toFixed(2);
console.log(`역할별 밸런스 (스킬 숙련 완료, 시드 ${SEEDS}, 같은 차수 전 직업 중앙값 = 1.00)`);
console.log('지표: 사냥(hunt) · 보스(승률) · 무리 ×5(승률) · 던전 3연전(넘긴 판·남은 체력) · 획득(gain = 사냥 × 골드·경험치 배율). 목표를 벗어나면 ▲(높음)·▼(낮음).');
const report = {};
for (const sub of Object.keys(SUB_ROLES)) {
    const g = rows.filter(r => r.sub === sub).sort((a, b) => a.tier - b.tier || a.lineage.localeCompare(b.lineage)); if (!g.length) continue;
    const t = TARGET[sub] || [], main = t[0]?.[0] || 'hunt';
    const vals = g.map(r => r[main]).filter(v => v > 0), spread = vals.length > 1 ? Math.max(...vals) / Math.min(...vals) : 1;
    console.log(`\n■ ${SUB_ROLES[sub].name} · ${g.length}개 · 주 지표 ${main}${t.length ? ` 목표 ${t.map(([k, lo, hi]) => `${k} ${lo}~${hi >= 9 ? '' : hi}`).join(' · ')}` : ''} · 최고/최저 ${f2(spread)}배`);
    report[sub] = { count: g.length, main, spread, out: [] };
    for (const r of g) {
        const flags = t.map(([k, lo, hi]) => r[k] < lo ? `▼${k}` : r[k] > hi ? `▲${k}` : '').filter(Boolean);
        if (flags.length) report[sub].out.push({ id: r.id, flags });
        console.log(`${flags.length ? '!' : ' '} ${r.tier}차 ${r.name.padEnd(12, '　')} 사냥 ${f2(r.hunt)} 보스 ${f2(r.boss)}(${pct(r.out.boss.win)}) 무리 ${f2(r.swarm)}(${pct(r.out.swarm.win)}) 던전 ${f2(r.dungeon)}(${pct(r.out.dungeon.cleared)}·${pct(r.out.dungeon.hpLeft)}) 획득 ×${f2(r.out.gain.mult)} ${flags.join(' ')}`);
    }
}
const outFile = arg('--json');
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ seeds: SEEDS, report, rows }, null, 1));
