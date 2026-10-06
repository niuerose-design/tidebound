// v3.87 무리 서식지 난이도 점검: 환생 횟수별 몸으로 서식지를 난이도마다 실제 턴 처리(tick)로 사냥시켜
// 시간당 경험치 · 골드 · 사망 · 처치(마리 수)를 재고, 같은 난이도의 그 환생 최상위 일반 사냥터와 견줍니다.
// 몸(추정): 레벨 = 환생 목표 레벨, R<20은 4차 · 그 위는 5차, 연구 = check-tier5 기준(환생 100 약 75%) × 환생/100,
//          장비 4부위 = GEAR_BY_REBIRTH(등급 · 별), 스킬 숙련 완료 · 추천 편성(게임 규칙 그대로).
// 사용: node scripts/check-habitat.mjs [--rebirths 10,20,30,40,50,60] [--jobs hero,grandMagus,...] [--hours 1] [--seeds 2]
import { loadGame } from './lib/game-modules.mjs';
import { random } from './lib/sim.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine');
const { tick } = await load('systems/turn');
const { stats } = await load('systems/stats');
const { SKILLS } = await load('data/skills');
const { JOBS, jobById } = await load('data/classes');
const { STAGES } = await load('data/world');
const { RARITIES, xpNeeded } = await load('data/balance');
const { rollAffixes } = await load('data/gear');
const { gearName } = await load('data/maple-gear');
const { masteryMilestonesFor, jobFactor } = await load('systems/progression');
const { recommendLoadout } = await load('systems/loadout');
const { rebirthLevel, xpWall, tideLimit } = await load('systems/meta');

const arg = (k, d) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d;
const REBIRTHS = arg('--rebirths', '10,20,30,40,50,60').split(',').map(Number);
// 역할별 대표 5차: 물리 딜러 · 마법 딜러 · 탱커 · 출혈 · 회복. R<20은 각 5차의 4차 부모로 잽니다.
const JOB_IDS = arg('--jobs', 'hero,grandMagus,guardianDeity,crimsonAvatar,lifeOcean').split(',');
const HOURS = Number(arg('--hours', 1)), SEEDS = Number(arg('--seeds', 2)), TICKS = Math.round(HOURS * 1800);
const RESEARCH_FULL = { attack: 150, magicAttack: 150, hp: 150, guard: 75, magicGuard: 75, crit: 15, critDamage: 20, penetration: 10, evasion: 15, lifesteal: 15, manaRegen: 8, recovery: 8, ap: 12 };
const GEAR_BY_REBIRTH = r => r < 20 ? [2, 15] : r < 30 ? [3, 17] : r < 40 ? [3, 20] : r < 50 ? [4, 20] : [5, 22];

function body(r, jobId) {
    const top = jobById(jobId), job = r < 20 && top.parent ? jobById(top.parent) : top, level = Math.min(100, Math.max(rebirthLevel({ rebirths: r }), job.level));
    const s = newState(0);
    const own = SKILLS.filter(sk => sk.job === top.id && sk.type === 'active');
    const magic = own.some(sk => sk.damageType === 'magic') || jobFactor(top, 'magic') > jobFactor(top, 'attack');
    const total = 5 + (level - 1) * 5, w = magic ? { int: 45, wis: 20, vit: 25, dex: 10 } : { str: 45, dex: 20, vit: 25, wis: 10 };
    const attrs = { str: 0, dex: 0, int: 0, vit: 0, wis: 0, luk: 0 }; let used = 0;
    for (const [k, p] of Object.entries(w)) { attrs[k] = Math.floor(total * p / 100); used += attrs[k]; }
    attrs.vit += total - used;
    const scale = Math.min(1, r / 100), research = Object.fromEntries(Object.entries(RESEARCH_FULL).map(([k, v]) => [k, Math.round(v * scale)]));
    const [rarity, star] = GEAR_BY_REBIRTH(r);
    const equipment = Object.fromEntries(['rod', 'coat', 'charm', 'cape'].map(slot => {
        const st = slot === 'rod' ? (magic ? 'magic' : 'physical') : 'balanced', pw = Math.round(102 * RARITIES[rarity].factor);
        return [slot, { id: `${slot}-x`, slot, style: st, rarity, power: pw, level, enhance: star, name: gearName(slot, rarity, st), affixes: rollAffixes(rarity, pw, undefined, random(slot.length * 31 + rarity), [], slot, level) }];
    }));
    Object.assign(s, { level, rebirths: r, job: job.id, attributes: attrs, statPoints: 0, inventory: [], equipment, permanent: research, book: {}, unlockedJobs: JOBS.map(x => x.id), jobMastery: { [job.id]: 0 } });
    for (const sk of SKILLS) { s.learned[sk.id] = 1; s.skillPractice[sk.id] = masteryMilestonesFor(sk).at(-1); }
    s.skills = recommendLoadout(s);
    const st = stats(s); s.hp = st.hp; s.mana = st.mana;
    return s;
}
/** 지금 레벨에서 경험치 e만큼을 쌓인 경험치로 환산합니다(레벨이 오르면 그만큼 더함). */
const expBetween = (s, L, E) => { let n = s.exp - E; for (let l = L; l < s.level; l++) n += xpNeeded(l, s.rebirths, xpWall(s)); return n; };
function hunt(r, jobId, stageId, tide, seed) {
    const s = body(r, jobId), rng = random(seed * 7919 + r * 31 + tide);
    Object.assign(s, { stage: stageId, tide, running: true, enemy: null, recovery: 0, target: null });
    const L = s.level, SP = s.statPoints;
    let exp = 0, gold = 0, kills = 0, deaths = 0;
    for (let i = 0; i < TICKS; i++) {
        const E = s.exp, G = s.gold, K = s.kills, D = s.deaths;
        tick(s, rng);
        exp += expBetween(s, L, E); gold += s.gold - G; kills += s.kills - K; deaths += s.deaths - D;
        // 몸을 고정합니다(레벨 · 포인트 · 가방).
        s.level = L; s.exp = E > 0 ? Math.min(E, s.exp) : 0; s.statPoints = SP; s.inventory = [];
    }
    return { exp: exp / HOURS, gold: gold / HOURS, kills: kills / HOURS, deaths: deaths / HOURS };
}
const fmt = n => n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n >= 1e4 ? `${Math.round(n / 1e4)}만` : `${Math.round(n)}`;
const avg = xs => xs.reduce((a, x) => ({ exp: a.exp + x.exp / xs.length, gold: a.gold + x.gold / xs.length, kills: a.kills + x.kills / xs.length, deaths: a.deaths + x.deaths / xs.length }), { exp: 0, gold: 0, kills: 0, deaths: 0 });
const out = [];
for (const r of REBIRTHS) {
    const open = st => st.rebirth <= r && st.level <= rebirthLevel({ rebirths: r });
    const habitats = STAGES.filter(st => st.habitat && open(st)), normal = STAGES.filter(st => !st.habitat && open(st)).at(-1);
    const limit = tideLimit({ rebirths: r }), tides = [...new Set([0, Math.round(limit / 4), Math.round(limit / 2), limit])];
    const [rarity, star] = GEAR_BY_REBIRTH(r);
    console.log(`\n== 환생 ${r} · Lv.${rebirthLevel({ rebirths: r })} · ${RARITIES[rarity].name} ${star}성 · 연구 ×${Math.min(1, r / 100).toFixed(2)} · 난이도 상한 ${limit} · 기준 사냥터 ${normal.name}`);
    for (const stage of [normal, ...habitats.slice(-2)]) for (const tide of tides) {
        const rows = JOB_IDS.map(j => avg(Array.from({ length: SEEDS }, (_, k) => hunt(r, j, stage.id, tide, k + 1))));
        const per = rows.map((x, i) => `${JOB_IDS[i].slice(0, 6)} ${fmt(x.exp)}/${fmt(x.gold)}${x.deaths ? `/사망${x.deaths.toFixed(1)}` : ''}`);
        const m = avg(rows);
        out.push({ r, stage: stage.id, habitat: !!stage.habitat, tide, ...m, jobs: rows });
        console.log(`  ${stage.name.padEnd(16)} 난이도 ${String(tide).padStart(3)} | 평균 시간당 경험치 ${fmt(m.exp)} · 골드 ${fmt(m.gold)} · 처치 ${Math.round(m.kills)} · 사망 ${m.deaths.toFixed(1)} | ${per.join(' · ')}`);
    }
}
if (arg('--json')) (await import('node:fs')).writeFileSync(arg('--json'), JSON.stringify(out, null, 1));
