// v3.83 5차 직업 비교(docs/concept.md 11.9 5단계): 엔드 콘텐츠 기준으로 5차 직업끼리만 견줍니다.
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
import { researchBudgetTools } from './lib/research-budget.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine');
const { stats, snapshot } = await load('systems/stats');
const { strike, fighterSpeed, setDefenseModel } = await load('systems/combat');
const { tierAttack } = await load('systems/meta');
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
// 연구: 그 환생까지의 세계석 예산으로 산 단계(scripts/lib/research-budget.mjs, 직업의 주 공격 종류만 다르고 단계는 같아 직업 사이 공정).
// 전에는 공격 150 · 체력 150 … 고정표였는데 그 비용(약 1억 개)은 벌 수 없는 양이라 실제 몸보다 공격 ×3 강했습니다(docs/research-review.md).
// v3.83 --level · --rebirths · --research(예산 배율, 1 = 기준 · 0 = 연구 없음) · --job-tier · --raid로 다른 몸(예: 환생 0 · 50)과 월드보스를 잽니다.
const LEVEL = Number(arg('--level', 100)), REBIRTHS = Number(arg('--rebirths', 100)), JOB_TIER = Number(arg('--job-tier', 5)), RESEARCH_SCALE = Number(arg('--research', 1));
const { researchByBudget } = await researchBudgetTools({ load });
const RESEARCH_BY_MAIN = Object.fromEntries(['attack', 'magicAttack', 'both'].map(m => [m, researchByBudget(REBIRTHS, m, undefined, RESEARCH_SCALE)]));
// v3.108 --book N: 기록 비례 직업(와일드헌터 사냥 기록 · 섀도어 도감 · 패스파인더 누적 처치 · 캡틴 골드)을 위해 몬스터마다 N마리 처치 · 던전 클리어 N회 · 골드 10^9를 채운 몸으로 잽니다(기본 0 = 기록 없음).
const BOOK = Number(arg('--book', 0));
// v3.144 --deaths N · --turns N: 쓰러진 횟수 · 보낸 턴 비례 패시브(다크나이트)를 위해 기록을 채웁니다(턴은 playMs = N × 턴 길이).
const DEATHS = Number(arg('--deaths', 0)), TURNS = Number(arg('--turns', 0));
// v3.111 변종 기록(섀도어)도 처치 수의 약 7%(변종 처치 확률 합)만큼 채웁니다.
const VARIANT_SHARE = .07;
const MAX_TURNS = 400, SWARM_TURNS = 3000, WAVES = 5, DUNGEON_TIER = Number(arg('--dungeon-tier', TIER * 2)), SWARM500_TIER = Number(arg('--swarm500-tier', 0)), PEN = arg('--pen') === undefined ? null : Number(arg('--pen'));
// --swarm500-atk: ×500 무리 공격 배율 실험(n = 지금 490배 · 숫자 = 고정 배율 · sqrt = √N · thin = 남은 마리 비례 · thin-sqrt = √(남은 마리)). --only 키: 그 상황만 잽니다.
const SWARM_ATK = arg('--swarm500-atk', 'n'), ONLY = arg('--only');
// v3.86 --extra N: 추가 판정 단계(기본 0).
const EXTRA = Number(arg('--extra', 0));
// v3.86 --job id: 그 직업만 잽니다(비율 표는 의미 없음, --json으로 절대값 비교).
const ONE_JOB = arg('--job');
// v3.86 --hunt-rounds N: 사냥을 시드마다 몬스터 4마리 × N번(기본 10) 이어서 잽니다. 몇 마리만 재면 빨리 잡는 직업은 시작 대기에 결과가 좌우됩니다.
const HUNT_ROUNDS = Number(arg('--hunt-rounds', 10));
// v3.84 방어 피해식 비교: --model legacy | ratio:c | constant:k, --mdef s(몬스터·월드보스 방어 배율), --mdef-tier(몬스터 방어도 난이도 공격 배율만큼 오름, B안).
const MODEL = arg('--model', 'legacy'), MDEF = Number(arg('--mdef', 1)), MDEF_TIER = process.argv.includes('--mdef-tier');
{ const [kind, v] = MODEL.split(':'); setDefenseModel(kind === 'ratio' ? { kind, c: Number(v) } : kind === 'constant' ? { kind, k: Number(v) } : { kind: 'legacy' }); }
const monsterDef = (st, tier) => { const k = MDEF * (MDEF_TIER ? tierAttack(tier) : 1); return k === 1 ? st : { ...st, defense: Math.round(st.defense * k), resist: Math.round(st.resist * k) }; };
// --pen: 관통을 이 값으로 맞춘 몸(장비 관통 옵션을 챙긴 경우 · 전체 상한 0.6)으로 잽니다.
const FOES = ['arErdaSpirit', 'arMemoryGuard', 'arMysticErda', 'arVanishSoul'], BOSS = 'arTrueErda', RAID_ID = arg('--raid', 'horntail'), RAID_DEF = arg('--raid-def') === undefined ? null : Number(arg('--raid-def'));

const ONE_STAT = { brawnFisher: 'str', nimbleAngler: 'dex', manaDevotee: 'int', stillAngler: 'wis', bulkyFisher: 'vit', luckyAngler: 'luk' };
function attributesFor(j) {
    const own = SKILLS.filter(sk => sk.job === j.id && sk.type === 'active');
    const ownMagic = own.filter(sk => (sk.damageType === 'magic' || sk.damageType === 'fixed' && sk.baseStat === 'magic') !== (sk.scaling === 'swap')).length, ownPhysical = own.length - ownMagic;
    const magic = ownMagic !== ownPhysical ? ownMagic > ownPhysical : jobFactor(j, 'magic') > jobFactor(j, 'attack');
    // v3.84 외길 계열(근력 · 기민 · 지능 · 정신 · 체질 · 행운)은 check-roles처럼 그 능력치에 몰아 배분합니다(행운 비례 나이트로드 등).
    const single = ONE_STAT[lineageOf(j)];
    const total = 5 + (LEVEL - 1) * 5, w = single ? { [single]: 100 } : magic ? { int: 45, wis: 20, vit: 25, dex: 10 } : { str: 45, dex: 20, vit: 25, wis: 10 };
    const out = { str: 0, dex: 0, int: 0, vit: 0, wis: 0, luk: 0 }; let used = 0;
    for (const [k, p] of Object.entries(w)) { out[k] = Math.floor(total * p / 100); used += out[k]; }
    out.vit += total - used;
    return { attrs: out, magic, main: ownMagic > 0 && ownPhysical > 0 ? 'both' : magic ? 'magicAttack' : 'attack' };
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
    const s = newState(0), { attrs, magic, main } = attributesFor(j);
    Object.assign(s, { level: LEVEL, rebirths: REBIRTHS, job: j.id, attributes: attrs, inventory: [], permanent: { ...RESEARCH_BY_MAIN[main] }, book: BOOK ? Object.fromEntries(FISH.map(f => [f.id, BOOK])) : {}, ...(BOOK ? { clears: { record: BOOK }, gold: 1e9, variantBook: Object.fromEntries(FISH.map(f => [f.id, { giant: Math.round(BOOK * VARIANT_SHARE) }])) } : {}), unlockedJobs: JOBS.map(x => x.id), deaths: DEATHS, playMs: TURNS * 2000 });
    s.equipment = { ...GEAR[magic ? 'magic' : 'physical'] };
    s.jobMastery = { [j.id]: 0 };
    for (const sk of SKILLS) { s.learned[sk.id] = 1; s.skillPractice[sk.id] = masteryMilestonesFor(sk).at(-1); }
    // v3.86 추가 판정을 켜면 그 AP를 빼고 편성합니다.
    if (EXTRA) { s.permanent.extraRoll = EXTRA; s.extraRolls = EXTRA; }
    loadout(s, j, magic);
    return s;
}
// v3.86 재사용 대기(각성기 포함)는 게임처럼 사냥 중 다음 몬스터로, 던전은 다음 판으로 이어집니다(cooldowns를 넘겨 공유).
const player = (st, s, hp = st.hp, mana = st.mana, cooldowns = {}) => ({ name: 'player', stats: st, hp, mana, skills: s.skills, cooldowns, extraRolls: EXTRA, stun: 0, effects: {}, ranks: s.learned, mastery: skillMasteryRanks(s), practice: s.skillPractice });
function foe(id, { swarm = 1, boss = false, wave, tier = TIER } = {}) {
    const base = monsterDef(scaledEnemyStats(FISH.find(f => f.id === id), { tier, boss, ...(wave !== undefined ? { wave } : {}) }), tier);
    const st = swarm > 1 ? { ...base, hp: Math.round(base.hp * swarmHpMultiplier(swarm)), attack: Math.round(base.attack * swarmAttackMultiplier(swarm)), magic: Math.round((base.magic ?? base.attack) * swarmAttackMultiplier(swarm)) } : base;
    return { name: 'foe', foe: true, stats: st, hp: st.hp, mana: 100, skills: profile(id).skills, magicBasic: profile(id).magicBasic, cooldowns: {}, stun: 0, effects: {}, ...(swarm > 1 ? { swarm } : {}) };
}
function fight(a, b, rng, cap = MAX_TURNS) {
    let n = 0;
    while (a.hp > 0 && b.hp > 0 && n < cap) { n++; const first = fighterSpeed(a) >= fighterSpeed(b) ? a : b, second = first === a ? b : a; strike(first, second, rng); if (first.hp > 0 && second.hp > 0) strike(second, first, rng); }
    return { won: a.hp > 0 && b.hp <= 0, turns: n };
}
// 처치 효율 = 승률 / 이긴 판 평균 턴(진 판은 턴 상한으로 셈).
function run(s, st, make, warm) {
    let w = 0, t = 0, h = 0, k = 0;
    for (let seed = 1; seed <= SEEDS; seed++) { const cd = {}; warm?.(cd, seed); for (const f of make()) { const a = player(st, s, st.hp, st.mana, cd), r = fight(a, f, random(seed * 97 + k)); w += r.won ? 1 : 0; t += r.won ? r.turns : MAX_TURNS; h += Math.max(0, a.hp) / st.hp; k++; } }
    return { win: w / k, turns: t / k, hpLeft: h / k, score: w / k / (t / k) };
}
// 무리: 턴 상한을 넉넉히(3,000) 두고, 지면 깎은 몫만큼만 셉니다(점수 = 깎은 체력 비율 / 쓴 턴, 이기면 1 / 처치 턴).
function swarmAttack(size, left) {
    if (size < 500 || SWARM_ATK === 'n') return swarmAttackMultiplier(size);
    const n = swarmHpMultiplier(size), alive = Math.max(1, n * left);
    return SWARM_ATK === 'sqrt' ? Math.sqrt(n) : SWARM_ATK === 'thin' ? alive : SWARM_ATK === 'thin-sqrt' ? Math.sqrt(alive) : Number(SWARM_ATK);
}
function runSwarm(s, st, size, tier = TIER) {
    let w = 0, t = 0, cut = 0, k = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
        const a = player(st, s), f = foe(FOES[0], { tier }), one = { ...f.stats }, max = Math.round(one.hp * swarmHpMultiplier(size)), rng = random(seed * 131 + size);
        Object.assign(f, { swarm: size, hp: max }); f.stats = { ...one, hp: max };
        let n = 0;
        while (a.hp > 0 && f.hp > 0 && n < SWARM_TURNS) {
            n++; const m = swarmAttack(size, f.hp / max); f.stats.attack = Math.round(one.attack * m); f.stats.magic = Math.round((one.magic ?? one.attack) * m);
            const first = fighterSpeed(a) >= fighterSpeed(f) ? a : f, second = first === a ? f : a; strike(first, second, rng); if (first.hp > 0 && second.hp > 0) strike(second, first, rng);
        }
        const won = a.hp > 0 && f.hp <= 0; w += won ? 1 : 0; t += n; cut += 1 - Math.max(0, f.hp) / max; k++;
    }
    return { win: w / k, turns: t / k, cut: cut / k, score: cut / k / Math.max(1, w / k === 1 ? t / k : SWARM_TURNS) };
}
function measure(j) {
    const s = body(j), st = PEN === null ? stats(s) : { ...stats(s), penetration: Math.max(stats(s).penetration, PEN) }, out = {};
    const want = k => !ONLY || ONLY === k, zero = { win: 0, turns: 0, hpLeft: 0, cut: 0, cleared: 0, dealt: 0, died: 0, score: 0 };
    // v3.86 사냥은 몇 시간씩 이어지므로 각성기 대기가 이미 돌고 있는 상태(0~10턴)에서 시작합니다(보스와 같음).
    const warm = (cd, seed) => { let i = 0; for (const id of s.skills) if (SKILLS.find(x => x.id === id)?.awaken) cd[id] = (seed * 7 + i++ * 3) % 11; };
    out.hunt = want('hunt') ? run(s, st, () => Array.from({ length: HUNT_ROUNDS }, () => FOES.map(id => foe(id))).flat(), warm) : zero;
    out.swarm100 = want('swarm100') ? runSwarm(s, st, 100) : zero;
    out.swarm500 = want('swarm500') ? runSwarm(s, st, 500, SWARM500_TIER) : zero;
    // 보스: 사냥터 몬스터를 12마리 잡은 뒤(대기 · 각성기 상태가 사냥 그대로 이어짐) 만난다고 봅니다.
    const hunted = (cd, seed) => { const rng = random(seed * 53 + 7); for (let i = 0; i < 12; i++) fight(player(st, s, st.hp, st.mana, cd), foe(FOES[i % FOES.length]), rng); };
    out.boss = want('boss') ? run(s, st, () => [foe(BOSS, { boss: true })], hunted) : zero;
    if (ONLY && ONLY !== 'dungeon' && ONLY !== 'raid') { out.dungeon = zero; out.raid = zero; return { id: j.id, name: j.name, lineage: lineageOf(j), sub: subRoleOf(j, lineageOf(j)), out }; }
    // 던전: 난이도 DUNGEON_TIER에서 쉬지 않고 5연전(마지막은 보스), 체력·마나 이어짐. 점수 = 넘긴 판 비율 / 쓴 턴.
    let cleared = 0, hpEnd = 0, turns = 0;
    for (let seed = 1; seed <= (ONLY === 'raid' ? 0 : SEEDS); seed++) {
        const rng = random(seed), cd = {}; let hp = st.hp, mana = st.mana, ok = true, w = 0;
        for (; w < WAVES && ok; w++) { const last = w === WAVES - 1, a = player(st, s, hp, mana, cd), r = fight(a, foe(last ? BOSS : FOES[w % FOES.length], { wave: w, boss: last, tier: DUNGEON_TIER }), rng); ok = r.won; hp = a.hp; mana = a.mana; turns += r.turns; }
        cleared += (ok ? w : w - 1) / WAVES; hpEnd += ok ? Math.max(0, hp) / st.hp : 0;
    }
    out.dungeon = { cleared: cleared / SEEDS, hpLeft: hpEnd / SEEDS, turns: turns / SEEDS, score: cleared / SEEDS / Math.max(1, turns / SEEDS) };
    const raw0 = raidById(RAID_ID), rdef = Math.round((RAID_DEF ?? raw0.stats.defense) * MDEF), raid = { ...raw0, stats: { ...raw0.stats, defense: rdef, resist: rdef } }; let dealt = 0, died = 0, lasted = 0;
    for (let seed = 1; seed <= SEEDS; seed++) { const snap = snapshot(s); if (PEN !== null) snap.stats = st; if (EXTRA) snap.extraRolls = EXTRA; const r = pvpDuel(snap, raidBossSnapshot(raid), true, random(seed), RAID.maxTurns); dealt += raid.stats.hp - Math.max(0, r.opponentHp); died += r.playerHp <= 0 ? 1 : 0; lasted += r.turns; }
    out.raid = { dealt: dealt / SEEDS, died: died / SEEDS, turns: lasted / SEEDS, score: dealt / SEEDS };
    const sub = subRoleOf(j, lineageOf(j));
    return { id: j.id, name: j.name, lineage: lineageOf(j), sub, out };
}
const KEYS = ['hunt', 'swarm100', 'swarm500', 'dungeon', 'boss', 'raid'];
if (process.argv.includes('--body')) { for (const j of JOBS.filter(j => j.tier === JOB_TIER && !j.retired).slice(0, 34)) { const st = stats(body(j)); console.log(j.name, 'atk', Math.round(st.attack), 'mag', Math.round(st.magic), 'def', Math.round(st.defense), 'res', Math.round(st.resist), 'hp', Math.round(st.hp), 'pen', st.penetration.toFixed(2)); } process.exit(0); }
// v3.88 --jobs id,id: 그 직업만 잽니다(배율 조정용). --scale '{"jobId":1.5}': 그 직업 고유 액티브 배율을 실험으로 곱합니다(게임 데이터는 그대로).
const ONLY_JOBS = arg('--jobs') ? new Set(arg('--jobs').split(',')) : null;
if (arg('--scale')) for (const [id, f] of Object.entries(JSON.parse(arg('--scale')))) for (const sk of SKILLS) if (sk.job === id && sk.type === 'active' && sk.multiplier) sk.multiplier *= f;
// v3.88 --jscale '{"jobId":1.3}': 그 직업의 공격 · 마법 계수를 실험으로 곱합니다.
if (arg('--jscale')) for (const [id, f] of Object.entries(JSON.parse(arg('--jscale')))) { const j = JOBS.find(x => x.id === id); if (j) { j.attack *= f; j.magic *= f; } }
const rows = JOBS.filter(j => (!ONE_JOB || j.id === ONE_JOB) && (!ONLY_JOBS || ONLY_JOBS.has(j.id)) && j.tier === JOB_TIER && !j.retired && (j.level || 0) <= LEVEL && (j.rebirth || 0) <= REBIRTHS).map(measure);
const median = xs => { const v = [...xs].sort((a, b) => a - b), m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
for (const k of KEYS) { const m = median(rows.map(r => r.out[k].score)) || 1; for (const r of rows) r[k] = r.out[k].score / m; }
const f2 = n => n.toFixed(2), pct = n => `${Math.round(n * 100)}%`, big = n => n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : `${Math.round(n / 1e4)}만`;
console.log(`5차 직업 비교 [피해식 ${MODEL}${MDEF !== 1 ? ` · 몬스터 방어 ×${MDEF}` : ''}${MDEF_TIER ? ' · 난이도 비례' : ''}] (Lv.${LEVEL} · 환생 ${REBIRTHS} · 연구 = 환생 ${REBIRTHS} 세계석 예산${RESEARCH_SCALE !== 1 ? ` ×${RESEARCH_SCALE}` : ''}(공격 ${RESEARCH_BY_MAIN.attack.attack || 0} · 체력 ${RESEARCH_BY_MAIN.attack.hp || 0} · 관통 ${RESEARCH_BY_MAIN.attack.penetration || 0}) · ${RARITIES[RARITY].name} ${STAR}성 4부위 · 사냥터 난이도 ${TIER} · 던전 난이도 ${DUNGEON_TIER} · ×500 무리 난이도 ${SWARM500_TIER} ${PEN === null ? '' : ` · 관통 ${PEN}`} · 시드 ${SEEDS}, 5차 중앙값 = 1.00)`);
console.log('직업'.padEnd(16, '　') + '역할　　　 사냥터(턴·승) 무리100(턴·승) 무리500(턴·승) 던전(판·체력) 보스(턴·승) 월드보스(피해)');
for (const r of [...rows].sort((a, b) => a.sub.localeCompare(b.sub) || b.hunt - a.hunt)) {
    const o = r.out;
    console.log(`${r.name.padEnd(16, '　')}${(SUB_ROLES[r.sub]?.name || r.sub).padEnd(6, '　')} ${f2(r.hunt)}(${o.hunt.turns.toFixed(1)}·${pct(o.hunt.win)}) ${f2(r.swarm100)}(${o.swarm100.win === 1 ? o.swarm100.turns.toFixed(0) + '턴' : pct(o.swarm100.cut) + '깎음'}·${pct(o.swarm100.win)}) ${f2(r.swarm500)}(${o.swarm500.win === 1 ? o.swarm500.turns.toFixed(0) + '턴' : pct(o.swarm500.cut) + '깎음'}·${pct(o.swarm500.win)}) ${f2(r.dungeon)}(${pct(o.dungeon.cleared)}·${o.dungeon.turns.toFixed(0)}턴·${pct(o.dungeon.hpLeft)}) ${f2(r.boss)}(${o.boss.turns.toFixed(1)}·${pct(o.boss.win)}) ${f2(r.raid)}(${big(o.raid.dealt)}${o.raid.died ? `·사망 ${pct(o.raid.died)}` : ''})`);
}
for (const k of KEYS) { const xs = rows.map(r => r[k]).filter(x => x > 0); console.log(`${k}: 최고/최저 ${xs.length ? (Math.max(...xs) / Math.min(...xs)).toFixed(1) : '-'}배 · 0인 직업 ${rows.length - xs.length}개`); }
if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify({ tier: TIER, rarity: RARITY, star: STAR, seeds: SEEDS, rows }, null, 1));
