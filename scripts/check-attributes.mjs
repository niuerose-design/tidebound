// 능력치 밸런스 점검: 레벨별 표준 배분 캐릭터에 한 능력치만 +20(4레벨 분량)을 더했을 때 시간당 처치·경험치·사망 변화를 비교합니다.
// 비교 기준으로 같은 캐릭터의 레벨 +4도 함께 잽니다. 장비 없이, 같은 낚시터·같은 시드. 사용: node scripts/check-attributes.mjs [시간=1.5]
import { loadGame } from './lib/game-modules.mjs';
import { random, totalXP, manage, chooseStage } from './lib/sim.mjs';
const { load } = loadGame();
const { newState, tick } = await load('systems/engine');
const { stats } = await load('systems/stats');
const HOURS = Number(process.argv[2] || 1.5), TURNS = Math.round(HOURS * 1800);
const ATTRS = ['str', 'dex', 'int', 'vit', 'wis', 'luk'];
function build(level, magic, seed) {
    const s = newState(0); s.level = level; s.statPoints = 4 + 5 * (level - 1); s.exp = 0;
    manage(s, { magic, rng: random(seed), gear: false });
    s.hp = stats(s).hp; s.mana = stats(s).mana;
    return s;
}
function run(s, seed) {
    const t = structuredClone(s), rng = random(seed), xp0 = totalXP(t);
    t.running = true;
    for (let n = 0; n < TURNS; n++) tick(t, rng);
    return { kills: t.kills - s.kills, deaths: t.deaths - s.deaths, xp: totalXP(t) - xp0 };
}
const rows = [];
for (const magic of [false, true]) for (const level of [15, 30, 50]) {
    const seeds = [11, 29, 47], variants = { base: s => s, ...Object.fromEntries(ATTRS.map(a => [`+20 ${a}`, s => { s.attributes[a] += 20; }])), 'Lv+4': s => { s.level += 4; } };
    const agg = {};
    for (const seed of seeds) {
        const base = build(level, magic, seed); chooseStage(base, seed);
        for (const [name, apply] of Object.entries(variants)) {
            const s = structuredClone(base); apply(s); s.hp = stats(s).hp; s.mana = stats(s).mana;
            const r = run(s, seed * 7 + 1);
            const a = agg[name] ||= { kills: 0, deaths: 0, xp: 0 };
            a.kills += r.kills; a.deaths += r.deaths; a.xp += r.xp;
        }
    }
    const b = agg.base;
    for (const [name, a] of Object.entries(agg)) rows.push({ build: magic ? 'magic' : 'physical', level, variant: name, killsPerHour: Math.round(a.kills / seeds.length / HOURS), killsVsBase: name === 'base' ? '' : `${a.kills >= b.kills ? '+' : ''}${((a.kills / b.kills - 1) * 100).toFixed(1)}%`, deathsPer100Kills: +(a.deaths / Math.max(1, a.kills) * 100).toFixed(2) });
}
console.table(rows);
