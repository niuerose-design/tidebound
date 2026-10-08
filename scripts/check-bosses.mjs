// v3.184 보스 난이도 점검(docs/boss-plan.md): 사냥터 개편 기준 몸(scripts/lib/reference-body.mjs, '그 구간을 제대로 키운 유저')으로
// 세 종류의 보스를 역할 대표 직업 5개(물리 딜러 · 마법 딜러 · 반사 탱커 · 상태이상 딜러 · 힐러)로 재고, 환생 시점마다 표를 냅니다.
//   던전   입장 환생 · 적정 환생 몸으로 노말 5연전(마지막 보스, 체력 · 마나 이어짐, check-tier5와 같은 규칙): 넘긴 판 · 쓴 턴 · 남은 체력 · 보스 처치 턴.
//          헬(난이도 50) · 나이트메어(200)는 환생 50 · 100 몸으로.
//   칠흑   그 지역 무리 서식지의 적정 환생 몸으로 80턴 안에 잡는지: 승률 · 처치 턴 · 사망.
//          칠흑의 몸 = 서식지 최강 몬스터(난이도만큼 레벨 상승) × 체력 100 · 공격 3(encounter.ts 그대로).
//   월드보스 발록(환생 0급 · 목표 10번) · 자쿰(50급 · 100번) · 혼테일(100급 · 550번, concept 11.9 v3.83 결정): 한 도전(80턴) 피해 · 처치까지 도전 횟수.
// 사용: node scripts/check-bosses.mjs [--only dungeon|onyx|raid] [--jobs hero,grandMagus,abyssBastion,curseQueen,lifeOcean] [--seeds 2] [--rebirths 0,5,10,...] [--own] [--json out.json]
import fs from 'node:fs';
import { loadGame } from './lib/game-modules.mjs';
import { referenceBodies } from './lib/reference-body.mjs';
import { random } from './lib/sim.mjs';
const game = loadGame(), { load } = game;
const { stats, snapshot } = await load('systems/stats');
const { strike, fighterSpeed } = await load('systems/combat');
const { jobById } = await load('data/classes');
const { FISH, STAGES, DUNGEONS, STAGE_FIT, tideLiftFish } = await load('data/world');
const { scaledEnemyStats, abyssEnemyStats, profile, foeSkills } = await load('data/encounters');
const { dungeonModeTier, ABYSS_TUNING } = await load('data/balance');
const { ONYX, onyxBossFor } = await load('data/onyx');
const { RAIDS, RAID } = await load('data/altar');
const { skillMasteryRanks } = await load('systems/progression');
const { abyssReference, onyxEnemyStats } = await load('systems/encounter');
const { duel, raidBossSnapshot } = await load('systems/duel');
const { referenceBody, bodyReport } = await referenceBodies(game);

const arg = (k, d) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d;
const ONLY = arg('--only'), SEEDS = Number(arg('--seeds', 2)), BORROW = !process.argv.includes('--own');
const JOB_IDS = arg('--jobs', 'hero,grandMagus,abyssBastion,curseQueen,lifeOcean').split(',');
const REBIRTHS = arg('--rebirths') ? arg('--rebirths').split(',').map(Number) : null;
const MAX_TURNS = 400, WAVES = 5;
// 실험 플래그(게임 데이터는 그대로, 측정에만 적용): --hell-tier N · --nightmare-tier N(던전 난이도), --boss-hp f(일반 던전 보스 체력 배율),
// --entry '{"caldera":1}'(입장 환생 바꿔 재기), --abyss '{"hp":60000,"attack":3}'(무릉 1층 기준), --onyx-hp '{"onyxDusk":800}'(칠흑 체력 배율 hpMul), --raid-hp '{"zakum":3e9}'(월드보스 체력).
const J = (k, d) => arg(k) ? JSON.parse(arg(k)) : d;
const HELL_TIER = Number(arg('--hell-tier', dungeonModeTier('hell'))), NIGHTMARE_TIER = Number(arg('--nightmare-tier', dungeonModeTier('nightmare'))), BOSS_HP = Number(arg('--boss-hp', 1));
const ENTRY = J('--entry', {}), ONYX_HP = J('--onyx-hp', {}), RAID_HP = J('--raid-hp', {});
// --abyss-curve: 무릉도장만 층(1 · 5 · 10 · 20 · 30 · 50) × 몸(R5 · 20 · 50 · 100)으로 오르기 곡선을 잽니다(--abyss 조정과 함께).
const ABYSS_CURVE = process.argv.includes('--abyss-curve');
Object.assign(ABYSS_TUNING, J('--abyss', {}));

const bodies = new Map();
function bodyFor(r, jobId) {
    const k = `${r}:${jobId}`;
    if (!bodies.has(k)) bodies.set(k, referenceBody(r, jobId, { borrow: BORROW }));
    return bodies.get(k);
}
const player = (s, st, hp = st.hp, mana = st.mana, cooldowns = {}) => ({ name: 'player', stats: st, hp, mana, gold: s.gold || 0, skills: s.skills, cooldowns, extraRolls: s.extraRolls || 0, stun: 0, effects: {}, ranks: s.learned, mastery: skillMasteryRanks(s), practice: s.skillPractice });
const foeOf = (f, st, { boss = false } = {}) => ({ name: 'foe', foe: true, stats: st, hp: st.hp, mana: 100, skills: foeSkills(f.id, f.level, boss || !!f.boss), magicBasic: profile(f.id).magicBasic, cooldowns: {}, stun: 0, effects: {} });
function fight(a, b, rng, cap = MAX_TURNS) {
    let n = 0;
    while (a.hp > 0 && b.hp > 0 && n < cap) { n++; const first = fighterSpeed(a) >= fighterSpeed(b) ? a : b, second = first === a ? b : a; strike(first, second, rng); if (first.hp > 0 && second.hp > 0) strike(second, first, rng); }
    return { won: a.hp > 0 && b.hp <= 0, turns: n };
}
const avg = xs => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
const pct = n => `${Math.round(n * 100)}%`, big = n => n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n >= 1e4 ? `${Math.round(n / 1e4)}만` : `${Math.round(n)}`;
const fishOf = id => FISH.find(f => f.id === id);
const out = { bodies: {}, dungeon: [], onyx: [], raid: [] };

// ── 던전 ──────────────────────────────────────────────────────────────────────────────────────
/** 한 몸으로 던전 한 번: 5연전, 체력 · 마나 · 대기 이어짐(check-tier5 규칙). 보스 판은 따로 턴을 셉니다. */
function dungeonRun(s, st, d, tier, seed, depth = 1) {
    const rng = random(seed * 977 + d.id.length), cd = {}; let hp = st.hp, mana = st.mana, ok = true, w = 0, turns = 0, bossTurns = 0, bossHpLeft = 0;
    const level = d.id === 'abyss' ? d.level : d.level;
    for (; w < WAVES && ok; w++) {
        const last = w === WAVES - 1, id = last && d.bossFish ? d.bossFish : d.fish[w], f0 = fishOf(id);
        const f = d.id === 'abyss' ? f0 : tideLiftFish(f0, tier, s.level);
        const est = d.id === 'abyss' ? abyssEnemyStats(f, abyssReference(), depth, { boss: last, wave: w }) : scaledEnemyStats(f, { boss: last, tier, wave: w });
        if (last && d.id !== 'abyss' && BOSS_HP !== 1) est.hp = Math.round(est.hp * BOSS_HP);
        const a = player(s, st, hp, mana, cd), b = foeOf({ ...f, level: f.level }, est, { boss: last }), r = fight(a, b, rng);
        ok = r.won; hp = a.hp; mana = a.mana; turns += r.turns;
        if (last) { bossTurns = r.turns; bossHpLeft = Math.max(0, b.hp) / est.hp; }
    }
    void level;
    return { cleared: ok ? 1 : (w - 1) / WAVES, turns, bossTurns: ok ? bossTurns : null, bossHpLeft, hpLeft: ok ? Math.max(0, hp) / st.hp : 0, died: ok ? 0 : 1 };
}
function measureDungeons() {
    const rows = [];
    for (const d of DUNGEONS.filter(d => d.bossFish)) {
        // 몸: 입장 환생 · 적정 환생(그 던전 지역의 최상위 사냥터 fit) · 헬은 환생 50 · 나이트메어는 환생 100.
        const stage = STAGES.filter(st => !st.habitat).sort((a, b) => Math.abs(a.level - d.level) - Math.abs(b.level - d.level))[0];
        const fit = Math.max(d.rebirth, STAGE_FIT[stage.id] ?? d.rebirth);
        const entry = ENTRY[d.id] ?? d.rebirth;
        const plans = [['노말 · 입장', entry, 0], ...(fit !== entry ? [['노말 · 적정', fit, 0]] : []), ['헬 · R50', 50, HELL_TIER], ['나이트메어 · R100', 100, NIGHTMARE_TIER]];
        for (const [label, r, tier] of plans) {
            if (REBIRTHS && !REBIRTHS.includes(r)) continue;
            const perJob = JOB_IDS.map(jobId => { const s = bodyFor(r, jobId), st = stats(s); const runs = Array.from({ length: SEEDS }, (_, k) => dungeonRun(s, st, d, tier, k + 1)); return { jobId, cleared: avg(runs.map(x => x.cleared)), turns: avg(runs.map(x => x.turns)), bossTurns: avg(runs.filter(x => x.bossTurns !== null).map(x => x.bossTurns)) || null, hpLeft: avg(runs.map(x => x.hpLeft)), died: avg(runs.map(x => x.died)) }; });
            const row = { dungeon: d.id, name: d.name, boss: d.boss, level: d.level, label, rebirth: r, tier, cleared: avg(perJob.map(x => x.cleared)), turns: avg(perJob.map(x => x.turns)), bossTurns: avg(perJob.filter(x => x.bossTurns).map(x => x.bossTurns)) || null, hpLeft: avg(perJob.map(x => x.hpLeft)), died: avg(perJob.map(x => x.died)), perJob };
            rows.push(row);
            console.log(`${d.name.padEnd(16, '　')} ${label.padEnd(12, '　')} 클리어 ${pct(row.cleared)} · 턴 ${row.turns.toFixed(0)} · 보스 ${row.bossTurns ? row.bossTurns.toFixed(1) + '턴' : '—'} · 남은 체력 ${pct(row.hpLeft)} · 사망 ${pct(row.died)} | ${perJob.map(x => `${jobById(x.jobId).name.replace(' (5차)', '')} ${pct(x.cleared)}/${x.bossTurns ? x.bossTurns.toFixed(0) : '—'}`).join(' · ')}`);
        }
    }
    out.dungeon = rows;
}

// ── 칠흑 ──────────────────────────────────────────────────────────────────────────────────────
function onyxFoe(habitat, tier, playerLevel) {
    // 게임 규칙 그대로(systems/encounter.ts spawn): 서식지 최강(난이도만큼 레벨 상승) × hpMul · 공격 ×3, 난이도 배율은 √(onyxEnemyStats). --onyx-hp는 hpMul 실험.
    const def = onyxBossFor(habitat.region), top = tideLiftFish([...habitat.fish].map(x => fishOf(x)).sort((a, b) => b.level - a.level)[0], tier, playerLevel);
    const f = { ...fishOf(def.id), level: top.level, hp: Math.round(top.hp * (ONYX_HP[def.id] ?? def.hpMul)), attack: Math.round(top.attack * ONYX.attack), defense: top.defense };
    return { def, f, st: onyxEnemyStats(f, tier) };
}
function measureOnyx() {
    const rows = [];
    for (const habitat of STAGES.filter(st => st.habitat && onyxBossFor(st.region))) {
        const fit = Math.max(habitat.rebirth, STAGE_FIT[habitat.id] ?? habitat.rebirth);
        const plans = [['적정', fit, 0], ['적정 · 난이도 5', fit, 5], ['R50', 50, 0], ['R100', 100, 0]];
        for (const [label, r, tier] of plans) {
            if (REBIRTHS && !REBIRTHS.includes(r)) continue;
            const perJob = JOB_IDS.map(jobId => {
                const s = bodyFor(r, jobId), st = stats(s), { def, f, st: est } = onyxFoe(habitat, tier, s.level);
                const runs = Array.from({ length: SEEDS }, (_, k) => { const a = player(s, st), b = foeOf(f, est), rr = fight(a, b, random(k * 311 + r), ONYX.turns); return { won: rr.won, turns: rr.turns, died: a.hp <= 0 ? 1 : 0, cut: 1 - Math.max(0, b.hp) / est.hp }; });
                return { jobId, boss: def.name, win: avg(runs.map(x => x.won ? 1 : 0)), turns: avg(runs.map(x => x.turns)), died: avg(runs.map(x => x.died)), cut: avg(runs.map(x => x.cut)), hp: est.hp };
            });
            const row = { habitat: habitat.id, region: habitat.region, boss: perJob[0].boss, label, rebirth: r, tier, win: avg(perJob.map(x => x.win)), turns: avg(perJob.map(x => x.turns)), died: avg(perJob.map(x => x.died)), cut: avg(perJob.map(x => x.cut)), hp: perJob[0].hp, perJob };
            rows.push(row);
            console.log(`${(habitat.region + ' · ' + row.boss).padEnd(16, '　')} ${label.padEnd(12, '　')} R${String(r).padEnd(3)} 승률 ${pct(row.win)} · 턴 ${row.turns.toFixed(0)}/${ONYX.turns} · 깎음 ${pct(row.cut)} · 사망 ${pct(row.died)} · 체력 ${big(row.hp)} | ${perJob.map(x => `${jobById(x.jobId).name.replace(' (5차)', '')} ${pct(x.win)}/${x.turns.toFixed(0)}`).join(' · ')}`);
        }
    }
    out.onyx = rows;
}

// ── 월드보스 ───────────────────────────────────────────────────────────────────────────────────
// 월드보스 목표(docs/boss-plan.md §8.3, 2026-10-08 결정): 체력은 그대로 두고 목표를 실측 중간값(빌림 / 자기 계열 사이)으로 적음.
// 월드보스는 여러 모험가가 한 몸을 함께 깎는 공유 콘텐츠라 개인 몸 기준(빌림)을 그대로 쓰지 않는 특수 기준입니다. 처치까지 횟수는 '한 몸이 혼자 다 깎을 때'의 셈.
const RAID_TARGET = { balrog: { rebirth: 0, kills: 10 }, zakum: { rebirth: 50, kills: 2 }, horntail: { rebirth: 100, kills: 12 } };
function measureRaids() {
    const rows = [];
    for (const raid0 of RAIDS) {
        const raid = RAID_HP[raid0.id] ? { ...raid0, stats: { ...raid0.stats, hp: RAID_HP[raid0.id] } } : raid0;
        const t = RAID_TARGET[raid.id], plans = [['목표 몸', t.rebirth], ['한 단계 아래', raid.id === 'balrog' ? 0 : raid.id === 'zakum' ? 20 : 50], ['한 단계 위', raid.id === 'balrog' ? 10 : raid.id === 'zakum' ? 100 : 100]];
        for (const [label, r] of plans) {
            if (REBIRTHS && !REBIRTHS.includes(r)) continue;
            const perJob = JOB_IDS.map(jobId => {
                const s = bodyFor(r, jobId);
                const runs = Array.from({ length: SEEDS }, (_, k) => { const rr = duel(snapshot(s), raidBossSnapshot(raid), true, random(k * 53 + r + 1), RAID.maxTurns); return { dealt: raid.stats.hp - Math.max(0, rr.opponentHp), died: rr.playerHp <= 0 ? 1 : 0, turns: rr.turns }; });
                return { jobId, dealt: avg(runs.map(x => x.dealt)), died: avg(runs.map(x => x.died)), turns: avg(runs.map(x => x.turns)) };
            });
            const dealt = avg(perJob.map(x => x.dealt)), row = { raid: raid.id, name: raid.name, label, rebirth: r, target: t, dealt, kills: raid.stats.hp / Math.max(1, dealt), died: avg(perJob.map(x => x.died)), turns: avg(perJob.map(x => x.turns)), perJob };
            rows.push(row);
            console.log(`${raid.name.padEnd(6, '　')} ${label.padEnd(8, '　')} R${String(r).padEnd(3)} 한 도전 ${big(dealt)} · 처치까지 ${row.kills >= 1e4 ? '1만+' : row.kills.toFixed(row.kills < 10 ? 1 : 0)}번(목표 ${t.kills}, R${t.rebirth}) · 사망 ${pct(row.died)} · ${row.turns.toFixed(0)}턴 | ${perJob.map(x => `${jobById(x.jobId).name.replace(' (5차)', '')} ${big(x.dealt)}`).join(' · ')}`);
        }
    }
    out.raid = rows;
}

const want = k => !ONLY || ONLY === k;
if (ABYSS_CURVE) {
    const d = DUNGEONS.find(x => x.id === 'abyss');
    console.log(`## 무릉도장 층 곡선 (1층 기준 체력 ${ABYSS_TUNING.hp} · 공격 ×${ABYSS_TUNING.attack}, 층마다 ×${ABYSS_TUNING.hpGrowth} · ×${ABYSS_TUNING.attackGrowth})`);
    for (const r of REBIRTHS || [5, 20, 50, 100]) for (const depth of [1, 5, 10, 20, 30, 50]) {
        const perJob = JOB_IDS.map(jobId => { const s = bodyFor(r, jobId), st = stats(s); const runs = Array.from({ length: SEEDS }, (_, k) => dungeonRun(s, st, d, 0, k + 1, depth)); return { cleared: avg(runs.map(x => x.cleared)), turns: avg(runs.map(x => x.turns)), hpLeft: avg(runs.map(x => x.hpLeft)) }; });
        console.log(`R${String(r).padEnd(3)} ${String(depth).padStart(2)}층  클리어 ${pct(avg(perJob.map(x => x.cleared)))} · 턴 ${avg(perJob.map(x => x.turns)).toFixed(0)} · 남은 체력 ${pct(avg(perJob.map(x => x.hpLeft)))} | ${perJob.map((x, i) => `${jobById(JOB_IDS[i]).name.replace(' (5차)', '')} ${pct(x.cleared)}`).join(' · ')}`);
    }
    process.exit(0);
}
if (process.argv.includes('--body')) for (const r of REBIRTHS || [0, 5, 10, 20, 50, 100]) for (const jobId of JOB_IDS) console.log(r, jobId, JSON.stringify(bodyReport(bodyFor(r, jobId))));
if (want('dungeon')) { console.log('## 던전 (노말 5연전 · 입장 환생 몸, 헬 R50, 나이트메어 R100)'); measureDungeons(); }
if (want('onyx')) { console.log('## 칠흑 (서식지 적정 환생 몸 · 80턴)'); measureOnyx(); }
if (want('raid')) { console.log('## 월드보스 (한 도전 80턴)'); measureRaids(); }
for (const [k, s] of bodies) out.bodies[k] = bodyReport(s);
if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(out, null, 1));
