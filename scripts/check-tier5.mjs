// v3.81 5차 직업 비교(docs/concept.md 11.9 5단계): 엔드 콘텐츠 기준으로 5차 직업끼리만 견줍니다.
// 모두 같은 몸(Lv.100 · 환생 100 · 같은 능력치 총량 · 같은 장비 4부위 · 스킬 숙련 완료)에서 상황별로 잽니다.
//   사냥터  마지막 사냥터(소멸의 여로) 일반 몬스터 1:1 — 처치 턴 · 승률
//   무리100 ×100 무리(체력 98배, 공격 1배) — 처치 턴(지면 깎은 체력) · 승률, 턴 상한 3,000
//   무리500 ×500 도전 무리(체력·공격 490배) — 같은 방식, 난이도 0(그 위는 모두 짐)
//   던전    사냥터 난이도 × 2에서 쉬지 않고 5연전(마지막 보스, 체력·마나 이어짐, 웨이브마다 압박) — 넘긴 판 · 쓴 턴 · 남은 체력
//   보스    사냥터 보스(진 에르다, 보스 배율) 1:1 — 처치 턴 · 승률
//   월드보스 혼테일과 80턴(서버 규칙 그대로) — 깎은 체력
// 값은 5차 중앙값 = 1.00인 비율(턴은 적을수록 좋아 역수). 사용: node scripts/check-tier5.mjs [--tier N] [--seeds N] [--rarity N] [--star N] [--json 파일]
import fs from 'node:fs';
import { loadGame } from './lib/game-modules.mjs';
import { random } from './lib/sim.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine');
const { stats, snapshot } = await load('systems/stats');
const { strike, fighterSpeed } = await load('systems/combat');
const { SKILLS } = await load('data/skills');
const { JOBS, lineageOf } = await load('data/classes');
const { FISH, swarmHpMultiplier, swarmAttackMultiplier } = await load('data/world');
const { scaledEnemyStats, profile } = await load('data/encounters');
const { canUse, validLoadout, skillMasteryRanks, lineage, jobFactor, masteryMilestonesFor } = await load('systems/progression');
const { subRoleOf, SUB_ROLES } = await load('data/roles');
const { RARITIES } = await load('data/balance');
const { rollAffixes } = await load('data/gear');
const { gearName } = await load('data/maple-gear');
const { duel: pvpDuel, raidBossSnapshot } = await load('systems/duel');
const { raidById, RAID } = await load('data/altar');

const arg = (k, d) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d;
const SEEDS = Number(arg('--seeds', 20)), TIER = Number(arg('--tier', 30)), RARITY = Number(arg('--rarity', 6)), STAR = Number(arg('--star', 22));
// 환생 100 무렵의 흔한 연구(전투 탭 약 75%, 물리·마법 같은 단계라 직업 사이 공정). 숫자를 바꾸면 절대값만 달라지고 비율은 거의 그대로입니다.
const RESEARCH = { attack: 150, magicAttack: 150, hp: 150, guard: 75, magicGuard: 75, crit: 15, critDamage: 20, penetration: 10, evasion: 15, lifesteal: 15, manaRegen: 8, recovery: 8, ap: 12 };
const LEVEL = 100, REBIRTHS = 100, MAX_TURNS = 400, SWARM_TURNS = 3000, WAVES = 5, DUNGEON_TIER = Number(arg('--dungeon-tier', TIER * 2)), SWARM500_TIER = Number(arg('--swarm500-tier', 0));
const FOES = ['arErdaSpirit', 'arMemoryGuard', 'arMysticErda', 'arVanishSoul'], BOSS = 'arTrueErda', RAID_ID = 'horntail';

function attributesFor(j) {
    const own = SKILLS.filter(sk => sk.job === j.id && sk.type === 'active');
    const ownMagic = own.filter(sk => (sk.damageType === 'magic') !== (sk.scaling === 'swap')).length, ownPhysical = own.length - ownMagic;
    const magic = ownMagic !== ownPhysical ? ownMagic > ownPhysical : jobFactor(j, 'magic') > jobFactor(j, 'attack');
    const total = 5 + (LEVEL - 1) * 5, w = magic ? { int: 45, wis: 20, vit: 25, dex: 10 } : { str: 45, dex: 20, vit: 25, wis: 10 };
    const out = { str: 0, dex: 0, int: 0, vit: 0, wis: 0, luk: 0 }; let used = 0;
    for (const [k, p] of Object.entries(w)) { out[k] = Math.floor(total * p / 100); used += out[k]; }
    out.vit += total - used;
    return { attrs: out, magic };
}
// 같은 장비: 부위마다 같은 등급·별·옵션(고정 시드). 무기 계열만 물리/마법을 직업에 맞춥니다.
const GEAR = {};
for (const style of ['physical', 'magic']) GEAR[style] = Object.fromEntries(['rod', 'coat', 'charm', 'cape'].map(slot => {
    const st = slot === 'rod' ? style : 'balanced', pw = Math.round(102 * RARITIES[RARITY].factor);
    return [slot, { id: `${slot}-${style}`, slot, style: st, rarity: RARITY, power: pw, level: LEVEL, enhance: STAR, name: gearName(slot, RARITY, st), affixes: rollAffixes(RARITY, pw, undefined, random(slot.length * 31 + RARITY), [], slot, LEVEL) }];
}));
function loadout(s, j, magic) {
    const line = lineage(j.id);
    const rank = sk => sk.job === j.id ? 0 : sk.job && line.includes(sk.job) ? 1 : !sk.job ? (sk.damageType === 'magic') === magic || sk.type === 'passive' ? 2 : 3 : 9;
    const pool = SKILLS.filter(sk => canUse(s, sk.id) && rank(sk) < 9).sort((a, b) => rank(a) - rank(b) || b.level - a.level);
    s.skills = [];
    for (const sk of pool) if (validLoadout(s, [...s.skills, sk.id])) s.skills.push(sk.id);
}
function body(j) {
    const s = newState(0), { attrs, magic } = attributesFor(j);
    Object.assign(s, { level: LEVEL, rebirths: REBIRTHS, job: j.id, attributes: attrs, inventory: [], permanent: { ...RESEARCH }, book: {}, unlockedJobs: JOBS.map(x => x.id) });
    s.equipment = { ...GEAR[magic ? 'magic' : 'physical'] };
    s.jobMastery = { [j.id]: 0 };
    for (const sk of SKILLS) { s.learned[sk.id] = 1; s.skillPractice[sk.id] = masteryMilestonesFor(sk).at(-1); }
    loadout(s, j, magic);
    return s;
}
const player = (st, s, hp = st.hp, mana = st.mana) => ({ name: 'player', stats: st, hp, mana, skills: s.skills, cooldowns: {}, stun: 0, effects: {}, ranks: s.learned, mastery: skillMasteryRanks(s), practice: s.skillPractice });
function foe(id, { swarm = 1, boss = false, wave, tier = TIER } = {}) {
    const base = scaledEnemyStats(FISH.find(f => f.id === id), { tier, boss, ...(wave !== undefined ? { wave } : {}) });
    const st = swarm > 1 ? { ...base, hp: Math.round(base.hp * swarmHpMultiplier(swarm)), attack: Math.round(base.attack * swarmAttackMultiplier(swarm)), magic: Math.round((base.magic ?? base.attack) * swarmAttackMultiplier(swarm)) } : base;
    return { name: 'foe', foe: true, stats: st, hp: st.hp, mana: 100, skills: profile(id).skills, magicBasic: profile(id).magicBasic, cooldowns: {}, stun: 0, effects: {}, ...(swarm > 1 ? { swarm } : {}) };
}
function fight(a, b, rng, cap = MAX_TURNS) {
    let n = 0;
    while (a.hp > 0 && b.hp > 0 && n < cap) { n++; const first = fighterSpeed(a) >= fighterSpeed(b) ? a : b, second = first === a ? b : a; strike(first, second, rng); if (first.hp > 0 && second.hp > 0) strike(second, first, rng); }
    return { won: a.hp > 0 && b.hp <= 0, turns: n };
}
// 처치 효율 = 승률 / 이긴 판 평균 턴(진 판은 턴 상한으로 셈).
function run(s, st, make) {
    let w = 0, t = 0, h = 0, k = 0;
    for (let seed = 1; seed <= SEEDS; seed++) for (const f of make()) { const a = player(st, s), r = fight(a, f, random(seed * 97 + k)); w += r.won ? 1 : 0; t += r.won ? r.turns : MAX_TURNS; h += Math.max(0, a.hp) / st.hp; k++; }
    return { win: w / k, turns: t / k, hpLeft: h / k, score: w / k / (t / k) };
}
// 무리: 턴 상한을 넉넉히(3,000) 두고, 지면 깎은 몫만큼만 셉니다(점수 = 깎은 체력 비율 / 쓴 턴, 이기면 1 / 처치 턴).
function runSwarm(s, st, size, tier = TIER) {
    let w = 0, t = 0, cut = 0, k = 0;
    for (let seed = 1; seed <= SEEDS; seed++) { const a = player(st, s), f = foe(FOES[0], { swarm: size, tier }), max = f.hp, r = fight(a, f, random(seed * 131 + size), SWARM_TURNS); const done = 1 - Math.max(0, f.hp) / max; w += r.won ? 1 : 0; t += r.turns; cut += done; k++; }
    return { win: w / k, turns: t / k, cut: cut / k, score: cut / k / Math.max(1, w / k === 1 ? t / k : SWARM_TURNS) };
}
function measure(j) {
    const s = body(j), st = stats(s), out = {};
    out.hunt = run(s, st, () => FOES.map(id => foe(id)));
    out.swarm100 = runSwarm(s, st, 100);
    out.swarm500 = runSwarm(s, st, 500, SWARM500_TIER);
    out.boss = run(s, st, () => [foe(BOSS, { boss: true })]);
    // 던전: 난이도 DUNGEON_TIER에서 쉬지 않고 5연전(마지막은 보스), 체력·마나 이어짐. 점수 = 넘긴 판 비율 / 쓴 턴.
    let cleared = 0, hpEnd = 0, turns = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
        const rng = random(seed); let hp = st.hp, mana = st.mana, ok = true, w = 0;
        for (; w < WAVES && ok; w++) { const last = w === WAVES - 1, a = player(st, s, hp, mana), r = fight(a, foe(last ? BOSS : FOES[w % FOES.length], { wave: w, boss: last, tier: DUNGEON_TIER }), rng); ok = r.won; hp = a.hp; mana = a.mana; turns += r.turns; }
        cleared += (ok ? w : w - 1) / WAVES; hpEnd += ok ? Math.max(0, hp) / st.hp : 0;
    }
    out.dungeon = { cleared: cleared / SEEDS, hpLeft: hpEnd / SEEDS, turns: turns / SEEDS, score: cleared / SEEDS / Math.max(1, turns / SEEDS) };
    const raid = raidById(RAID_ID); let dealt = 0, died = 0;
    for (let seed = 1; seed <= SEEDS; seed++) { const r = pvpDuel(snapshot(s), raidBossSnapshot(raid), true, random(seed), RAID.maxTurns); dealt += raid.stats.hp - Math.max(0, r.opponentHp); died += r.playerHp <= 0 ? 1 : 0; }
    out.raid = { dealt: dealt / SEEDS, died: died / SEEDS, score: dealt / SEEDS };
    const sub = subRoleOf(j, lineageOf(j));
    return { id: j.id, name: j.name, lineage: lineageOf(j), sub, out };
}
const KEYS = ['hunt', 'swarm100', 'swarm500', 'dungeon', 'boss', 'raid'];
const rows = JOBS.filter(j => j.tier === 5 && !j.retired).map(measure);
const median = xs => { const v = [...xs].sort((a, b) => a - b), m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
for (const k of KEYS) { const m = median(rows.map(r => r.out[k].score)) || 1; for (const r of rows) r[k] = r.out[k].score / m; }
const f2 = n => n.toFixed(2), pct = n => `${Math.round(n * 100)}%`, big = n => n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : `${Math.round(n / 1e4)}만`;
console.log(`5차 직업 비교 (Lv.${LEVEL} · 환생 ${REBIRTHS} · 전투 연구 약 75% · ${RARITIES[RARITY].name} ${STAR}성 4부위 · 사냥터 난이도 ${TIER} · 던전 난이도 ${DUNGEON_TIER} · ×500 무리 난이도 ${SWARM500_TIER} · 시드 ${SEEDS}, 5차 중앙값 = 1.00)`);
console.log('직업'.padEnd(16, '　') + '역할　　　 사냥터(턴·승) 무리100(턴·승) 무리500(턴·승) 던전(판·체력) 보스(턴·승) 월드보스(피해)');
for (const r of [...rows].sort((a, b) => a.sub.localeCompare(b.sub) || b.hunt - a.hunt)) {
    const o = r.out;
    console.log(`${r.name.padEnd(16, '　')}${(SUB_ROLES[r.sub]?.name || r.sub).padEnd(6, '　')} ${f2(r.hunt)}(${o.hunt.turns.toFixed(1)}·${pct(o.hunt.win)}) ${f2(r.swarm100)}(${o.swarm100.win === 1 ? o.swarm100.turns.toFixed(0) + '턴' : pct(o.swarm100.cut) + '깎음'}·${pct(o.swarm100.win)}) ${f2(r.swarm500)}(${o.swarm500.win === 1 ? o.swarm500.turns.toFixed(0) + '턴' : pct(o.swarm500.cut) + '깎음'}·${pct(o.swarm500.win)}) ${f2(r.dungeon)}(${pct(o.dungeon.cleared)}·${o.dungeon.turns.toFixed(0)}턴·${pct(o.dungeon.hpLeft)}) ${f2(r.boss)}(${o.boss.turns.toFixed(1)}·${pct(o.boss.win)}) ${f2(r.raid)}(${big(o.raid.dealt)}${o.raid.died ? `·사망 ${pct(o.raid.died)}` : ''})`);
}
for (const k of KEYS) { const xs = rows.map(r => r[k]).filter(x => x > 0); console.log(`${k}: 최고/최저 ${xs.length ? (Math.max(...xs) / Math.min(...xs)).toFixed(1) : '-'}배 · 0인 직업 ${rows.length - xs.length}개`); }
if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify({ tier: TIER, rarity: RARITY, star: STAR, seeds: SEEDS, rows }, null, 1));
