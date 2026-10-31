// 직업 간 밸런스 점검: 모든 직업을 차수별 같은 레벨·같은 능력치 총량으로 세우고, 그 레벨의 낚시터 어종과 1:1로 싸워
// 처치 턴·승률·남은 체력을 비교합니다. 같은 차수 중앙값에서 크게 벗어난 직업을 표시합니다.
// 끝에는 선행→상위 직업을 상위 직업 레벨에서 나란히 세워 역전(상위가 더 약함)을 표시합니다.
// --skill-mastered: 모든 스킬을 숙련 마지막 단계까지 올린 상태(극한돌파 제외)로 비교합니다. 숙련으로 페널티를 되찾는 직업 점검용.
// 사용: node scripts/check-job-balance.mjs [--mastered] [--skill-mastered] [--json out.json]
import fs from 'node:fs';
import { loadGame } from './lib/game-modules.mjs';
import { random, loadout, median } from './lib/sim.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine');
const { stats } = await load('systems/stats');
const { actTurn, actsFirst } = await load('systems/combat');
const { playerFighter } = await load('systems/turn');
const { FUEL } = await load('data/otherworld');
const noop = () => {};
const { SKILLS } = await load('data/skills');
const { JOBS, lineageOf } = await load('data/classes');
/** v3.61 외길 계보 → 몰아 주는 능력치. */
const ONE_STAT = { brawnFisher: 'str', nimbleAngler: 'dex', manaDevotee: 'int', stillAngler: 'wis', bulkyFisher: 'vit', luckyAngler: 'luk' };
const { MONSTERS } = await load('data/world');
const { scaledEnemyStats, profile } = await load('data/encounters');
const { jobMasteryTarget, jobFactor, masteryMilestonesFor } = await load('systems/progression');

const MASTERED = process.argv.includes('--mastered'), SKILL_MASTERED = process.argv.includes('--skill-mastered');
const SEEDS = 60, MAX_TURNS = 300;
// 차수별 레벨과 상대. 장비·연구 없이 싸우므로 그 레벨 사냥터보다 한 단계 낮은 어종으로 맞췄습니다(중앙 직업이 대부분 이기는 정도).
// v3.440 ap: 차수별 장착 AP(기본 6 + 환생 10 + 차수가 오를수록 연구 · 업적 AP). 전에는 모두 16이라 5차가 각성기 + 패시브를 끼면 계보 액티브를 못 넣어 4차보다 약하게 나왔음(실제 5차 몸은 연구 · 업적 AP가 있음).
const TIERS = {
    0: { level: 15, foes: ['seahorse', 'needlefish', 'tidejelly'], tier: 0, ap: 16 },
    1: { level: 15, foes: ['seahorse', 'needlefish', 'tidejelly'], tier: 0, ap: 16 },
    2: { level: 40, foes: ['viper', 'squid', 'leviathan'], tier: 0, ap: 18 },
    3: { level: 50, foes: ['moonfish', 'dragon', 'ancient'], tier: 0, ap: 20 },
    4: { level: 60, foes: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta'], tier: 0, ap: 24 },
    5: { level: 75, foes: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta'], tier: 2, ap: 28 },
    // v3.439 6차(초월자, Lv.100 전직): 한 단계 아래 사냥터(기억의 길 Lv.88~92) 몬스터, 적 단계 3.
    6: { level: 100, foes: ['ttMonitor', 'ttGuardian', 'ttChimera', 'ttDodo'], tier: 3, ap: 32 },
};
/** v3.439 표에 없는 차수는 죽지 않고 가장 높은 차수 조건으로 재며 알립니다(6차가 추가된 뒤 이 스크립트가 한동안 죽어 있었음). */
const tierOf = tier => { if (TIERS[tier]) return TIERS[tier]; const top = Math.max(...Object.keys(TIERS).map(Number)); console.warn(`! ${tier}차 측정 조건이 없어 ${top}차 조건으로 잽니다 — TIERS에 추가하세요.`); return TIERS[top]; };
/** 능력치 배분: 직업 보정이 큰 쪽(물리/마법)을 주 능력치로. 총량은 레벨당 4. */
function attributesFor(j, level) {
    // 주 피해 유형: 자기 액티브 기술의 피해 유형을 먼저 보고, 액티브가 없으면 직업 보정이 큰 쪽.
    const own = SKILLS.filter(sk => sk.job === j.id && sk.type === 'active');
    // scaling 'swap'은 피해 유형과 반대 공격력을 쓰므로 주 능력치도 반대로 봅니다.
    const ownMagic = own.filter(sk => (sk.damageType === 'magic') !== (sk.scaling === 'swap')).length, ownPhysical = own.length - ownMagic;
    const total = 4 + (level - 1) * 4, magic = ownMagic !== ownPhysical ? ownMagic > ownPhysical : jobFactor(j, 'magic') > jobFactor(j, 'attack') || (jobFactor(j, 'magic') === jobFactor(j, 'attack') && SKILLS.some(sk => sk.job === j.id && sk.damageType === 'magic'));
    // v3.61 외길 계보는 그 능력치 하나에 모두 배분합니다(같은 배분으로 재면 외길이 크게 약하게 나옴).
    const single = ONE_STAT[lineageOf(j)];
    const w = single ? { [single]: 100 } : magic ? { int: 45, wis: 20, vit: 25, dex: 10 } : { str: 45, dex: 20, vit: 25, wis: 10 };
    const out = { str: 0, dex: 0, int: 0, vit: 0, wis: 0, luk: 0 }; let used = 0;
    for (const [k, p] of Object.entries(w)) { out[k] = Math.floor(total * p / 100); used += out[k]; }
    out.vit += total - used;
    return { attrs: out, magic };
}
function fight(st, s, foeId, tier) {
    const monster = MONSTERS.find(f => f.id === foeId), foe = scaledEnemyStats(monster, { tier });
    let wins = 0, turns = 0, hpLeft = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
        // v3.439 실제 엔진의 참가자(직업 · 연료 · 각성기 · 추가 판정 · 제약 포함)로, 전투도 엔진의 actTurn으로.
        const a = { ...playerFighter(s, st, s.skills), hp: st.hp, mana: st.mana, cooldowns: {}, effects: {}, stun: 0 };
        const b = { name: 'foe', stats: foe, hp: foe.hp, mana: 100, skills: profile(foeId).skills, magicBasic: profile(foeId).magicBasic, cooldowns: {}, stun: 0, effects: {} };
        const rng = random(seed); let n = 0;
        while (a.hp > 0 && b.hp > 0 && n < MAX_TURNS) { n++; const first = actsFirst(a, b) ? a : b, second = first === a ? b : a; actTurn(first, second, rng, noop); if (first.hp > 0 && second.hp > 0) actTurn(second, first, rng, noop); }
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
    s.fuel = FUEL.cap; // 연료 직업(해커 · 요원 · 펀드매니저 계열)은 연료를 가득 채운 몸으로.
    s.permanent = { ...s.permanent, ap: Math.max(0, (T.ap || 16) - 16) }; // 차수별 AP(연구 AP 칸으로)
    // v3.198 숙달 수가 전직 조건인 직업(방랑 계보의 만능 · 백수)은 그만큼 다른 직업을 숙달한 몸으로 잽니다(0개로 재면 들어갈 수 없는 몸이라 크게 약하게 나옴).
    for (const x of JOBS.filter(x => x.id !== j.id).slice(0, j.requiresMastered || 0)) s.jobMastery[x.id] = jobMasteryTarget(x);
    for (const sk of SKILLS) { s.learned[sk.id] = 1; s.skillPractice[sk.id] = SKILL_MASTERED ? masteryMilestonesFor(sk).at(-1) : 0; }
    loadout(s, j, magic);
    const st = stats(s), res = T.foes.map(id => fight(st, s, id, T.tier));
    const avg = k => res.reduce((x, r) => x + r[k], 0) / res.length;
    // 효율: 승률 × 남은 체력 비중을 반영한 1턴당 처치(높을수록 좋음).
    const win = avg('win'), turns = avg('turns'), hpLeft = avg('hpLeft');
    return { tier: j.tier, id: j.id, name: j.name, tree: j.tree, magic, skills: s.skills.length, hp: Math.round(st.hp), atk: Math.round(magic ? st.magic : st.attack), win, turns, hpLeft, score: win * (0.5 + hpLeft / 2) / turns };
}
// v3.440 --only a,b,c: 그 직업과 선행 직업만 재서(역전 점검 · 상위 차수 비교만) 수치 패치 때 빨리 돌립니다.
const ONLY = process.argv.includes('--only') ? new Set(process.argv[process.argv.indexOf('--only') + 1].split(',').flatMap(id => { const j = JOBS.find(x => x.id === id); return j ? [j.id, j.parent].filter(Boolean) : []; })) : null;
const rows = (ONLY ? JOBS.filter(j => ONLY.has(j.id)) : JOBS).map(j => evaluate(j, tierOf(j.tier)));
const pct = n => `${Math.round(n * 100)}%`;
console.log(`직업 밸런스 (${MASTERED ? '숙달' : '숙달 전'}${SKILL_MASTERED ? ' · 스킬 숙련 완료' : ''}, 시드 ${SEEDS}, 상대별 평균)`);
const report = {};
for (const tier of Object.keys(TIERS).map(Number)) {
    const group = rows.filter(r => r.tier === tier); if (!group.length) continue;
    const med = median(group.map(r => r.score));
    group.forEach(r => r.rel = r.score / med);
    group.sort((a, b) => b.rel - a.rel);
    const spread = group.length < 2 ? 1 : group.at(-1).rel > 0 ? group[0].rel / group.at(-1).rel : Infinity;
    report[tier] = { level: tierOf(tier).level, jobs: group.length, medianWin: median(group.map(r => r.win)), medianTurns: median(group.map(r => r.turns)), spread, high: group.filter(r => r.rel >= 1.5).map(r => r.id), low: group.filter(r => r.rel <= 0.6).map(r => r.id) };
    console.log(`\n■ ${tier}차 · Lv.${tierOf(tier).level} · ${group.length}개 · 중앙 승률 ${pct(report[tier].medianWin)} · 중앙 처치 ${report[tier].medianTurns.toFixed(1)}턴 · 최고/최저 ${spread.toFixed(2)}배`);
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
    const T = tierOf(j.tier), child = evaluate(j, T), base = evaluate(parent, T);
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
for (const tier of [1, 2, 3, 4, 5]) {
    const upper = rows.filter(r => r.tier === tier + 1); if (!upper.length) continue;
    const T = tierOf(tier + 1), upperMed = median(upper.map(r => r.score));
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
