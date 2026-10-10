// v3.229 아제로스 완성 점검(기획안 ③ 원칙): 아제로스 직업을 다 키운 상태(직업 숙달 · 스킬 숙련 완료 · 계보 기록 상한)에서
// 같은 차수 메이플 직업(같은 상태)의 공격 기대값 중앙값보다 +10%(±5%) 안에 드는지 봅니다. 물리 · 마법은 따로 중앙값을 냅니다.
// 공격 기대값 = 전투력의 공격 몫(powerParts.offense)에서 보스 피해를 뺀 값. 몸은 check-tier5와 같은 엔드 몸(Lv.100 · 환생 100 · 태초 22성 4부위).
// 기록(까미 · 누리 300, 지역 코어 각성 5, 칠흑 장신구 7종 각성 5 · 처치)은 모든 직업에 똑같이 채워 공용 보너스는 비교에서 상쇄됩니다.
// 지원 계열(참모 계보, tree 'support')은 다른 분신에게 주는 지원이 힘이라 자기 전투력이 약해도 되므로 빼고 봅니다.
// 사용: node scripts/check-azeroth.mjs
import { loadGame } from './lib/game-modules.mjs';
import { random } from './lib/sim.mjs';
import { researchBudgetTools } from './lib/research-budget.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine');
const { stats, powerParts } = await load('systems/stats');
const { SKILLS } = await load('data/skills');
const { JOBS, lineageOf, LINEAGES } = await load('data/classes');
const { canUse, validLoadout, lineage, jobFactor, masteryMilestonesFor } = await load('systems/progression');
const { subRoleOf } = await load('data/roles');
const { RARITIES } = await load('data/balance');
const { rollAffixes } = await load('data/gear');
const { gearName } = await load('data/maple-gear');


const arg = (k, d) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d;
const RARITY = Number(arg('--rarity', 6)), STAR = Number(arg('--star', 22));
const LEVEL = Number(arg('--level', 100)), REBIRTHS = Number(arg('--rebirths', 100)), RESEARCH_SCALE = 1;
const { researchByBudget } = await researchBudgetTools({ load });
const RESEARCH_BY_MAIN = Object.fromEntries(['attack', 'magicAttack', 'both'].map(m => [m, researchByBudget(REBIRTHS, m, undefined, RESEARCH_SCALE)]));
const { REGION_CORE_IDS } = await load('data/boss-core');
const { ONYX_BOSSES } = await load('data/onyx');
const ONE_STAT = { brawnFisher: 'str', nimbleAngler: 'dex', manaDevotee: 'int', stillAngler: 'wis', bulkyFisher: 'vit', luckyAngler: 'luk' };
function attributesFor(j) {
    const own = SKILLS.filter(sk => sk.job === j.id && sk.type === 'active');
    const ownMagic = own.filter(sk => (sk.damageType === 'magic' || sk.damageType === 'fixed' && sk.baseStat === 'magic') !== (sk.scaling === 'swap')).length, ownPhysical = own.length - ownMagic;
    const magic = ownMagic !== ownPhysical ? ownMagic > ownPhysical : jobFactor(j, 'magic') > jobFactor(j, 'attack');
    // v3.84 외길 계열(근력 · 기민 · 지능 · 정신 · 체질 · 행운)은 check-roles처럼 그 능력치에 몰아 배분합니다(행운 비례 나이트로드 등).
    const single = ONE_STAT[lineageOf(j)];
    // v3.163 조화 경계(제논)는 설계 의도대로 여섯 능력치를 고르게 배분합니다(조화 보너스 = 최저 ÷ 최고).
    const even = subRoleOf(j, lineageOf(j)) === 'borderHarmony';
    const total = 5 + (LEVEL - 1) * 5, w = single ? { [single]: 100 } : even ? { str: 17, dex: 16, int: 17, vit: 17, wis: 16, luk: 17 } : magic ? { int: 45, wis: 20, vit: 25, dex: 10 } : { str: 45, dex: 20, vit: 25, wis: 10 };
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
    Object.assign(s, { level: LEVEL, rebirths: REBIRTHS, job: j.id, attributes: attrs, inventory: [], permanent: { ...RESEARCH_BY_MAIN[main] }, book: {}, unlockedJobs: JOBS.map(x => x.id) });
    s.equipment = { ...GEAR[magic ? 'magic' : 'physical'] };
    s.jobMastery = { [j.id]: 0 };
    for (const sk of SKILLS) { s.learned[sk.id] = 1; s.skillPractice[sk.id] = masteryMilestonesFor(sk).at(-1); }
    loadout(s, j, magic);
    return s;
}

const TARGET = 1.1, BAND = .05, bad = [];
for (const tier of [4, 5]) {
    const rows = [];
    for (const j of JOBS.filter(j => j.tier === tier && !j.retired && j.attack >= .5)) {
        const s = body(j);
        s.jobMastery = { [j.id]: 1e13 };
        s.book = { ...s.book, masteryMimic: 300, expNuri: 300 };
        s.bossCores = Object.fromEntries(REGION_CORE_IDS.map(id => [id, { rank: 5, attrs: [] }]));
        s.onyxBook = Object.fromEntries(ONYX_BOSSES.map(b => [b.id, 50]));
        s.inventory = ONYX_BOSSES.map((b, i) => ({ id: 'onyx' + i, slot: 'charm', style: 'balanced', rarity: 6, power: 1, level: 1, enhance: 0, name: b.id, affixes: [], onyx: b.id, onyxRank: 5 }));
        loadout(s, j, attributesFor(j).magic);
        const st = stats(s), world = LINEAGES.find(l => l.id === lineageOf(j))?.world || 'maple';
        rows.push({ name: j.name, world, support: j.tree === 'support', phys: st.attack >= st.magic, offense: powerParts(st).offense / (1 + (st.bossDamage || 0) / 2) });
    }
    const median = phys => { const a = rows.filter(r => r.world === 'maple' && r.phys === phys).map(r => r.offense).sort((x, y) => x - y); return a[a.length >> 1]; };
    const ref = { true: median(true), false: median(false) };
    console.log(`${tier}차 메이플 중앙값 물리 ${Math.round(ref.true).toLocaleString()} · 마법 ${Math.round(ref.false).toLocaleString()}`);
    for (const r of rows.filter(r => r.world === 'azeroth' && !r.support)) {
        const ratio = r.offense / ref[r.phys], ok = Math.abs(ratio - TARGET) <= BAND;
        if (!ok) bad.push(`${r.name} ${ratio.toFixed(3)}`);
        console.log(`${ok ? '  ' : '✗ '}${r.name} ${r.phys ? '물리' : '마법'} ×${ratio.toFixed(3)}`);
    }
}
if (bad.length) { console.error(`아제로스 완성치가 메이플 +10%(±5%)를 벗어남: ${bad.join(', ')}`); process.exit(1); }
console.log('아제로스 완성치 모두 메이플 +10%(±5%) 안');
