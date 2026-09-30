// 직업 간 밸런스 점검: 모든 직업을 차수별 같은 레벨·같은 능력치 총량으로 세우고, 그 레벨의 낚시터 어종과 1:1로 싸워
// 처치 턴·승률·남은 체력을 비교합니다. 같은 차수 중앙값에서 크게 벗어난 직업을 표시합니다.
// 끝에는 선행→상위 직업을 상위 직업 레벨에서 나란히 세워 역전(상위가 더 약함)을 표시합니다.
// 사용: node scripts/check-job-balance.mjs [--mastered] [--json out.json]
import fs from 'node:fs';
import { loadGame } from './lib/game-modules.mjs';
import { random } from './lib/sim.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine');
const { stats } = await load('systems/stats');
const { strike, fighterSpeed } = await load('systems/combat');
const { SKILLS } = await load('data/skills');
const { JOBS } = await load('data/classes');
const { FISH } = await load('data/world');
const { scaledEnemyStats, profile } = await load('data/encounters');
const { canUse, validLoadout, skillMasteryRanks, lineage, jobMasteryTarget } = await load('systems/progression');

const MASTERED = process.argv.includes('--mastered');
const SEEDS = 60, MAX_TURNS = 300;
// 차수별 레벨과 상대. 장비·연구 없이 싸우므로 그 레벨 사냥터보다 한 단계 낮은 어종으로 맞췄습니다(중앙 직업이 대부분 이기는 정도).
const TIERS = {
    0: { level: 15, foes: ['seahorse', 'needlefish', 'tidejelly'], tier: 0 },
    1: { level: 15, foes: ['seahorse', 'needlefish', 'tidejelly'], tier: 0 },
    2: { level: 40, foes: ['viper', 'squid', 'leviathan'], tier: 0 },
    3: { level: 50, foes: ['moonfish', 'dragon', 'ancient'], tier: 0 },
    4: { level: 60, foes: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta'], tier: 0 },
    5: { level: 75, foes: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta'], tier: 2 },
};
/** 능력치 배분: 직업 보정이 큰 쪽(물리/마법)을 주 능력치로. 총량은 레벨당 4. */
function attributesFor(j, level) {
    // 주 피해 유형: 자기 액티브 기술의 피해 유형을 먼저 보고, 액티브가 없으면 직업 보정이 큰 쪽.
    const own = SKILLS.filter(sk => sk.job === j.id && sk.type === 'active');
    const ownMagic = own.filter(sk => sk.damageType === 'magic').length, ownPhysical = own.length - ownMagic;
    const total = 4 + (level - 1) * 4, magic = ownMagic !== ownPhysical ? ownMagic > ownPhysical : j.magic > j.attack || (j.magic === j.attack && SKILLS.some(sk => sk.job === j.id && sk.damageType === 'magic'));
    const w = magic ? { int: 45, wis: 20, vit: 25, dex: 10 } : { str: 45, dex: 20, vit: 25, wis: 10 };
    const out = { str: 0, dex: 0, int: 0, vit: 0, wis: 0, luk: 0 }; let used = 0;
    for (const [k, p] of Object.entries(w)) { out[k] = Math.floor(total * p / 100); used += out[k]; }
    out.vit += total - used;
    return { attrs: out, magic };
}
/** 스킬 편성: 자기 직업 → 계보(선행 직업) → 공용(피해 유형 일치 우선) 순서로 AP가 허락하는 만큼. */
function loadout(s, j, magic) {
    const line = lineage(j.id);
    const rank = sk => sk.job === j.id ? 0 : sk.job && line.includes(sk.job) ? 1 : !sk.job ? (sk.damageType === 'magic') === magic || sk.type === 'passive' ? 2 : 3 : 9;
    const pool = SKILLS.filter(sk => canUse(s, sk.id) && rank(sk) < 9).sort((a, b) => rank(a) - rank(b) || b.level - a.level);
    s.skills = [];
    for (const sk of pool) if (validLoadout(s, [...s.skills, sk.id])) s.skills.push(sk.id);
}
function fight(st, s, foeId, tier) {
    const fish = FISH.find(f => f.id === foeId), foe = scaledEnemyStats(fish, { tier });
    let wins = 0, turns = 0, hpLeft = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
        const a = { name: 'player', stats: st, hp: st.hp, mana: st.mana, skills: s.skills, cooldowns: {}, stun: 0, effects: {}, ranks: s.learned, mastery: skillMasteryRanks(s), practice: s.skillPractice };
        const b = { name: 'foe', stats: foe, hp: foe.hp, mana: 100, skills: profile(foeId).skills, cooldowns: {}, stun: 0, effects: {} };
        const rng = random(seed); let n = 0;
        while (a.hp > 0 && b.hp > 0 && n < MAX_TURNS) { n++; const first = fighterSpeed(a) >= fighterSpeed(b) ? a : b, second = first === a ? b : a; strike(first, second, rng); if (first.hp > 0 && second.hp > 0) strike(second, first, rng); }
        const won = a.hp > 0 && b.hp <= 0; wins += won ? 1 : 0; turns += n; hpLeft += Math.max(0, a.hp) / st.hp;
    }
    return { win: wins / SEEDS, turns: turns / SEEDS, hpLeft: hpLeft / SEEDS };
}
/** 직업 하나를 주어진 차수 조건(레벨·상대)에서 세워 평가합니다. */
function evaluate(j, T) {
    const s = newState(0);
    const { attrs, magic } = attributesFor(j, T.level);
    Object.assign(s, { level: T.level, rebirths: 10, job: j.id, attributes: attrs, equipment: {}, inventory: [], permanent: {}, book: {}, unlockedJobs: JOBS.map(x => x.id) });
    s.jobMastery = { [j.id]: MASTERED ? jobMasteryTarget(j) : 0 };
    for (const sk of SKILLS) { s.learned[sk.id] = 1; s.skillPractice[sk.id] = 0; }
    loadout(s, j, magic);
    const st = stats(s), res = T.foes.map(id => fight(st, s, id, T.tier));
    const avg = k => res.reduce((x, r) => x + r[k], 0) / res.length;
    // 효율: 승률 × 남은 체력 비중을 반영한 1턴당 처치(높을수록 좋음).
    const win = avg('win'), turns = avg('turns'), hpLeft = avg('hpLeft');
    return { tier: j.tier, id: j.id, name: j.name, tree: j.tree, magic, skills: s.skills.length, hp: Math.round(st.hp), atk: Math.round(magic ? st.magic : st.attack), win, turns, hpLeft, score: win * (0.5 + hpLeft / 2) / turns };
}
const rows = JOBS.map(j => evaluate(j, TIERS[j.tier]));
const median = xs => { const v = [...xs].sort((a, b) => a - b), m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const pct = n => `${Math.round(n * 100)}%`;
console.log(`직업 밸런스 (${MASTERED ? '숙달' : '숙달 전'}, 시드 ${SEEDS}, 상대별 평균)`);
const report = {};
for (const tier of Object.keys(TIERS).map(Number)) {
    const group = rows.filter(r => r.tier === tier); if (!group.length) continue;
    const med = median(group.map(r => r.score));
    group.forEach(r => r.rel = r.score / med);
    group.sort((a, b) => b.rel - a.rel);
    const spread = group.length < 2 ? 1 : group.at(-1).rel > 0 ? group[0].rel / group.at(-1).rel : Infinity;
    report[tier] = { level: TIERS[tier].level, jobs: group.length, medianWin: median(group.map(r => r.win)), medianTurns: median(group.map(r => r.turns)), spread, high: group.filter(r => r.rel >= 1.5).map(r => r.id), low: group.filter(r => r.rel <= 0.6).map(r => r.id) };
    console.log(`\n■ ${tier}차 · Lv.${TIERS[tier].level} · ${group.length}개 · 중앙 승률 ${pct(report[tier].medianWin)} · 중앙 처치 ${report[tier].medianTurns.toFixed(1)}턴 · 최고/최저 ${spread.toFixed(2)}배`);
    for (const r of group) {
        const flag = r.rel >= 1.5 ? '▲' : r.rel <= 0.6 ? '▼' : ' ';
        console.log(`${flag} ${r.name.padEnd(10, '　')} ${r.tree.padEnd(8)} ${r.magic ? '마법' : '물리'} 승률 ${pct(r.win).padStart(4)} · ${r.turns.toFixed(1).padStart(5)}턴 · 남은 체력 ${pct(r.hpLeft).padStart(4)} · 상대 ${r.rel.toFixed(2)} · 스킬 ${r.skills}`);
    }
}
// 상하위 역전 점검: 상위 직업의 레벨·상대에서 선행 직업과 나란히 세워, 상위 직업이 선행 직업보다 약하거나 비슷한 경우를 표시합니다.
// 선행 직업은 상위 직업 레벨에서도 자기 기술만 쓰므로, 차이는 직업 보정과 보유 기술에서만 나옵니다.
const chain = [];
for (const j of JOBS.filter(x => x.parent)) {
    const parent = JOBS.find(x => x.id === j.parent); if (!parent || parent.tier >= j.tier) continue;
    const T = TIERS[j.tier], child = evaluate(j, T), base = evaluate(parent, T);
    chain.push({ id: j.id, name: j.name, tier: j.tier, parent: parent.id, parentName: parent.name, parentTier: parent.tier, ratio: base.score > 0 ? child.score / base.score : Infinity, child, base });
}
chain.sort((a, b) => a.ratio - b.ratio);
console.log(`\n■ 상하위 역전 점검 (상위 직업 레벨에서 비교, 1.10배 미만 ◆)`);
for (const c of chain) {
    const flag = c.ratio < 1.1 ? '◆' : ' ';
    console.log(`${flag} ${c.parentName}(${c.parentTier}차) → ${c.name}(${c.tier}차) · 상위/선행 ${c.ratio.toFixed(2)}배 · 승률 ${pct(c.base.win)}→${pct(c.child.win)} · 처치 ${c.base.turns.toFixed(1)}→${c.child.turns.toFixed(1)}턴`);
}
report.chain = chain.map(c => ({ id: c.id, parent: c.parent, ratio: c.ratio }));
// 상위 차수 비교: 1~4차 직업을 한 단계 위 차수의 레벨·상대에 세워, 그 차수 중앙값 이상이면 표시합니다(★).
// 하위 직업이 상위 직업 평균만큼 강하면, 숙련 조건이 무거운 의도된 경우가 아닌 한 수치 조정 대상입니다.
console.log(`\n■ 상위 차수 비교 (한 단계 위 차수 조건에서 그 차수 중앙값 대비, 0.90배 이상 ★)`);
const cross = [];
for (const tier of [1, 2, 3, 4]) {
    const upper = rows.filter(r => r.tier === tier + 1); if (!upper.length) continue;
    const T = TIERS[tier + 1], upperMed = median(upper.map(r => r.score));
    for (const j of JOBS.filter(x => x.tier === tier)) {
        const r = evaluate(j, T), rel = r.score / upperMed;
        cross.push({ id: j.id, name: j.name, tier, rel, win: r.win, turns: r.turns });
    }
}
cross.sort((a, b) => b.rel - a.rel);
for (const c of cross.filter(c => c.rel >= 0.75)) console.log(`${c.rel >= 0.9 ? '★' : ' '} ${c.name}(${c.tier}차) · ${c.tier + 1}차 중앙값 대비 ${c.rel.toFixed(2)}배 · 승률 ${pct(c.win)} · ${c.turns.toFixed(1)}턴`);
report.cross = cross;
const out = process.argv[process.argv.indexOf('--json') + 1];
if (process.argv.includes('--json') && out) fs.writeFileSync(out, JSON.stringify({ mastered: MASTERED, report, rows, chain }, null, 1));
