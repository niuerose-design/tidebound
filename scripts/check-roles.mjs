// v3.61 역할별 밸런스 점검(docs/concept.md 11.4): 직업마다 세부 역할(data/roles.ts)을 달고, 역할에 맞는 지표로 같은 차수 **물리 · 마법 딜러 중앙값**(v3.441, 전에는 전 직업 중앙값)과 비교합니다.
// 지표(모두 스킬 숙련 완료 · 장비·연구 없음 · 차수별 같은 레벨·능력치 총량, 외길은 그 능력치에 몰아 배분):
//   speed     일반 사냥 처치 속도 = 딜러 중앙 처치 턴 ÷ 내 처치 턴 — 딜러의 주 지표
//   bossSpeed 보스 1:1 처치 속도 × 승률 — 상태이상 딜러의 주 지표
//   survive   보스 1:1 · ×5 무리 · 쉬지 않고 3연전의 남은 체력 평균(0~1 절대값) — 탱커 · 힐러의 주 지표
//   gain      speed × 획득 배율(골드 · 경험치 평균 + 드롭 + 던전 주화/2 + 변종/4 + 황금 ×10), 딜러 중앙 = 1 — 유틸리티의 주 지표
//   최소선     사냥 승률 · 보스 승률(data/roles.ts ROLE_TARGETS.floors)
// 사용: node scripts/check-roles.mjs [--json out.json] [--seeds N]
import fs from 'node:fs';
import { loadGame } from './lib/game-modules.mjs';
import { random, arg, loadout, median } from './lib/sim.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine');
const { stats, goldMultiplier, expMultiplier } = await load('systems/stats');
const { actTurn, actsFirst } = await load('systems/combat');
const { playerFighter } = await load('systems/turn');
const { FUEL } = await load('data/otherworld');
const noop = () => {};
const { SKILLS } = await load('data/skills');
const { JOBS, lineageOf } = await load('data/classes');
const { MONSTERS, swarmHpMultiplier } = await load('data/world');
const { scaledEnemyStats, profile } = await load('data/encounters');
const { jobFactor, masteryMilestonesFor } = await load('systems/progression');
const { subRoleOf, roleOf, SUB_ROLES, ROLE_TARGETS } = await load('data/roles');

const SEEDS = Number(arg('--seeds', 30)), MAX_TURNS = 400, SWARM = 5, DUNGEON_WAVES = 3;
const RECORD_SOURCES = new Set(['hunt', 'species', 'codex', 'mastered', 'variant', 'kkami', 'nuri', 'onyx', 'onyxRanks', 'onyxOwned', 'cores', 'coreRanks', 'altar', 'abyssBest', 'essenceSpent']); // 환생 수(rebirth)는 측정 몸에 있어(환생 10) 뺌
const ONE_STAT = { brawnFisher: 'str', nimbleAngler: 'dex', manaDevotee: 'int', stillAngler: 'wis', bulkyFisher: 'vit', luckyAngler: 'luk' };
// check-job-balance와 같은 차수 조건. 보스는 그 레벨 근처 사냥터 보스.
// v3.440 ap: 차수별 장착 AP(기본 6 + 환생 10 + 차수가 오를수록 연구 · 업적 AP). 전에는 모두 16이라 5차가 각성기 + 패시브를 끼면 계보 액티브를 못 넣어 4차보다 약하게 나왔음(실제 5차 몸은 연구 · 업적 AP가 있음).
const TIERS = {
    0: { level: 15, foes: ['seahorse', 'needlefish', 'tidejelly'], boss: 'grottoWarden', tier: 0, ap: 16 },
    1: { level: 15, foes: ['seahorse', 'needlefish', 'tidejelly'], boss: 'grottoWarden', tier: 0, ap: 16 },
    2: { level: 40, foes: ['viper', 'squid', 'leviathan'], boss: 'magmaKraken', tier: 0, ap: 18 },
    3: { level: 50, foes: ['moonfish', 'dragon', 'ancient'], boss: 'templeOracle', tier: 0, ap: 20 },
    4: { level: 60, foes: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta'], boss: 'abyssSovereign', tier: 0, ap: 24 },
    5: { level: 75, foes: ['starKoi', 'prismRay', 'voidGuppy', 'abyssManta'], boss: 'ventColossus', tier: 2, ap: 28 },
    // v3.439 6차(초월자, Lv.100 전직): 한 단계 아래 사냥터(기억의 길) 몬스터, 보스는 녹슨 제독(Lv.104), 적 단계 3.
    6: { level: 100, foes: ['ttMonitor', 'ttGuardian', 'ttChimera', 'ttDodo'], boss: 'aoRustAdmiral', tier: 3, ap: 32 },
};
const tierOf = tier => { if (TIERS[tier]) return TIERS[tier]; const top = Math.max(...Object.keys(TIERS).map(Number)); console.warn(`! ${tier}차 측정 조건이 없어 ${top}차 조건으로 잽니다 — TIERS에 추가하세요.`); return TIERS[top]; };
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
// v3.439 실제 엔진의 참가자(직업 · 연료 · 각성기 · 추가 판정 · 제약 포함)로, 전투도 엔진의 actTurn으로.
const player = (st, s, hp = st.hp, mana = st.mana) => ({ ...playerFighter(s, st, s.skills), hp, mana, cooldowns: {}, effects: {}, stun: 0 });
function foe(id, tier, swarm = 1) {
    const base = scaledEnemyStats(MONSTERS.find(f => f.id === id), { tier });
    const st = swarm > 1 ? { ...base, hp: Math.round(base.hp * swarmHpMultiplier(swarm)) } : base;
    return { name: 'foe', stats: st, hp: st.hp, mana: 100, skills: profile(id).skills, magicBasic: profile(id).magicBasic, cooldowns: {}, stun: 0, effects: {}, ...(swarm > 1 ? { swarm } : {}) };
}
/** 한 판: 끝난 뒤 [이김, 턴, 남은 체력, 남은 마나]. */
function duel(a, b, rng) {
    let n = 0;
    while (a.hp > 0 && b.hp > 0 && n < MAX_TURNS) { n++; const first = actsFirst(a, b) ? a : b, second = first === a ? b : a; actTurn(first, second, rng, noop); if (first.hp > 0 && second.hp > 0) actTurn(second, first, rng, noop); }
    return { won: a.hp > 0 && b.hp <= 0, turns: n };
}
const score = (win, hpLeft, turns) => turns > 0 ? win * (0.5 + hpLeft / 2) / turns : 0;
function measure(j) {
    const T = tierOf(j.tier), s = newState(0), { attrs, magic } = attributesFor(j, T.level);
    Object.assign(s, { level: T.level, rebirths: 10, job: j.id, attributes: attrs, equipment: {}, inventory: [], permanent: {}, book: {}, unlockedJobs: JOBS.map(x => x.id) });
    s.fuel = FUEL.cap; // 연료 직업은 연료를 가득 채운 몸으로.
    s.permanent = { ...s.permanent, ap: Math.max(0, (T.ap || 16) - 16) }; // 차수별 AP(연구 AP 칸으로)
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
    // v3.441 획득 배율 = 골드 · 경험치 배율 평균 + 장비 드롭 + 던전 주화/2 + 변종 조우/4 + 황금 개체 ×10(운영 가중치: 유틸리티의 드롭 · 변종 · 황금 장치를 골드 · 경험치와 한 줄에 놓기 위해).
    const gainMult = (goldMultiplier(s) + expMultiplier(s)) / 2 + (st.dropBonus || 0) + (st.dungeonGoldBonus || 0) / 2 + (st.variantFind || 0) / 4 + (st.goldenFind || 0) * 10;
    out.gain = { mult: gainMult, score: out.hunt.score * gainMult };
    const sub = subRoleOf(j, lineageOf(j));
    // v3.441 측정 밖 장치: 지원(다른 분신에게 주는 효과)만 있는 직업, 기록 비례(사냥 · 종 · 도감 · 숙달 수 · 변종 · 까미 · 누리 · 코어 · 제단 …) 패시브가 핵인 직업은 이 몸(기록 0)으로는 못 재므로 목표 판정에서 빼고 ◇로 표시.
    const own = SKILLS.filter(sk => sk.job === j.id), passives = own.filter(sk => sk.type === 'passive');
    const device = passives.some(sk => sk.support || sk.supportAmp || sk.supportCostCut) ? 'support' : passives.some(sk => (sk.perCount || []).some(p => RECORD_SOURCES.has(p.source))) ? 'record' : passives.some(sk => sk.masteryGain) ? 'mastery' : null;
    return { id: j.id, name: j.name, tier: j.tier, lineage: lineageOf(j), sub, role: roleOf(sub), device, out };
}
// v3.80 옛 독립 수련(retired)은 전직할 수 없어 재지 않습니다.
// v3.442 --only a,b,c --base full.json: 몇 직업만 재고 기준값(딜러 중앙)은 전체 측정 JSON에서 가져옵니다(수치 패치 때 빨리 돌리기).
const ONLY = arg('--only') ? new Set(arg('--only').split(',')) : null, BASE_FILE = arg('--base');
const rows = JOBS.filter(j => !j.retired && (!ONLY || ONLY.has(j.id))).map(measure);
// v3.441 기준 = 같은 차수 물리 · 마법 딜러의 중앙값(data/roles.ts ROLE_TARGETS 설명). 전 직업 중앙값으로 재면 딜러가 차수의 절반이라 딜러 절반이 구조적으로 '목표 미달'이 됐음.
// 지표: speed 사냥 처치 속도(딜러 중앙 처치 턴 ÷ 내 처치 턴) · bossSpeed 보스 처치 속도(진 판이 있으면 승률을 곱함) · survive 보스 · 무리 · 던전의 남은 체력 평균(절대값) · gain speed × 골드 · 경험치 배율(딜러 중앙 = 1).
const DEALER = new Set(['physical', 'magic']);
const surviveOf = o => (o.boss.hpLeft + o.swarm.hpLeft + o.dungeon.hpLeft) / 3;
const base = BASE_FILE ? JSON.parse(fs.readFileSync(BASE_FILE, 'utf8')).report.base : {};
for (const tier of Object.keys(TIERS).map(Number)) {
    const g = rows.filter(r => r.tier === tier), d = g.filter(r => DEALER.has(r.sub)).length ? g.filter(r => DEALER.has(r.sub)) : g;
    if (!g.length) continue;
    const b = base[tier] ??= { huntTurns: median(d.map(r => r.out.hunt.turns)) || 1, bossTurns: median(d.map(r => r.out.boss.turns)) || 1, survive: median(d.map(r => surviveOf(r.out))) || 1, dealers: d.length };
    b.gain ??= median(d.map(r => b.huntTurns / r.out.hunt.turns * r.out.gain.mult)) || 1;
    for (const r of g) {
        r.speed = b.huntTurns / r.out.hunt.turns;
        r.bossSpeed = b.bossTurns / r.out.boss.turns * r.out.boss.win;
        r.survive = surviveOf(r.out);
        r.gain = b.huntTurns / r.out.hunt.turns * r.out.gain.mult / b.gain;
        r.huntWin = r.out.hunt.win; r.bossWin = r.out.boss.win;
    }
}
const pct = n => `${Math.round(n * 100)}%`, f2 = n => n.toFixed(2);
console.log(`역할별 밸런스 (스킬 숙련 완료, 시드 ${SEEDS}, 같은 차수 물리 · 마법 딜러 중앙값 = 1.00)`);
console.log('지표: 속도(사냥 처치 속도) · 보스(보스 처치 속도 × 승률) · 생존(보스 · 무리 ×5 · 던전 3연전 남은 체력 평균, 절대값) · 획득(속도 × 골드 · 경험치 배율). 목표를 벗어나면 ▲(높음) · ▼(낮음), 최소선 미달은 ✕, 측정 몸으로 못 재는 장치(지원 · 기록 비례)는 ◇로 표시하고 목표 판정에서 뺍니다.');
const LABEL = { speed: '속도', bossSpeed: '보스', survive: '생존', gain: '획득' };
const report = { base };
for (const sub of Object.keys(SUB_ROLES)) {
    const g = rows.filter(r => r.sub === sub).sort((a, b) => a.tier - b.tier || a.lineage.localeCompare(b.lineage)); if (!g.length) continue;
    const t = ROLE_TARGETS[sub], main = t?.main || 'speed';
    const vals = g.map(r => r[main]).filter(v => v > 0), spread = vals.length > 1 ? Math.max(...vals) / Math.min(...vals) : 1;
    const bandText = t ? Object.entries(t.bands).map(([k, [lo, hi]]) => `${LABEL[k]} ${lo}~${hi >= 1 && k === 'survive' ? '' : hi}`).join(' · ') : '목표 없음';
    console.log(`\n■ ${SUB_ROLES[sub].name} · ${g.length}개 · 주 지표 ${LABEL[main]} · 목표 ${bandText}${t?.floors ? ` · 최소선 ${Object.entries(t.floors).map(([k, v]) => `${k === 'huntWin' ? '사냥 승률' : '보스 승률'} ${pct(v)}`).join(' · ')}` : ''} · 최고/최저 ${f2(spread)}배`);
    report[sub] = { count: g.length, main, spread, out: [] };
    for (const r of g) {
        const flags = r.device ? [r.device === 'support' ? '◇지원 직업(다른 분신 효과, 측정 밖)' : r.device === 'mastery' ? '◇숙련 획득 장치(획득 지표에 없음)' : '◇기록 장치(측정 몸 기록 0)'] : t ? [...Object.entries(t.bands).map(([k, [lo, hi]]) => r[k] < lo ? `▼${LABEL[k]}` : r[k] > hi ? `▲${LABEL[k]}` : ''), ...Object.entries(t.floors || {}).map(([k, v]) => r[k] < v ? `✕${k === 'huntWin' ? '사냥승률' : '보스승률'}` : '')].filter(Boolean) : [];
        if (flags.length && !r.device) report[sub].out.push({ id: r.id, flags });
        if (r.device) (report[sub].unmeasured ??= []).push(r.id);
        console.log(`${flags.length ? '!' : ' '} ${r.tier}차 ${r.name.padEnd(12, '　')} 속도 ${f2(r.speed)}(${pct(r.out.hunt.win)}) 보스 ${f2(r.bossSpeed)}(${pct(r.out.boss.win)}) 생존 ${f2(r.survive)} 획득 ${f2(r.gain)}(×${f2(r.out.gain.mult)}) 무리 ${pct(r.out.swarm.win)} 던전 ${pct(r.out.dungeon.cleared)} ${flags.join(' ')}`);
    }
}
const outFile = arg('--json');
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ seeds: SEEDS, report, rows }, null, 1));
