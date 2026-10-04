// 보상 점검표: 대표 모험가로 사냥터(난이도별)·던전을 일정 시간 돌려 시간당 경험치·골드·숙련·장비·세계석을 비교합니다.
// 사용: node scripts/audit-rewards.mjs [분=30] [프로필 이름 일부]
// 결과는 표로 출력합니다(점검 스크립트가 아니라 판단용 자료라 통과/실패가 없습니다).
import { loadGame } from './lib/game-modules.mjs';
import { random, manage } from './lib/sim.mjs';
const { load } = loadGame();
const { newState, tick, act } = await load('systems/engine');
const { drop } = await load('systems/encounter');
const { syncGoals } = await load('systems/progress');
const { STAGES, DUNGEONS, setClosures } = await load('data/world');
// 운영에서 닫아 둔 사냥터·던전(예: 무릉도장)도 점검표에서는 열어 둡니다.
setClosures({ dungeons: [], stages: [] });
const { xpNeeded } = await load('data/balance');
const { levelGateOk, tideLimit } = await load('systems/meta');
const MINUTES = Number(process.argv[2] || 30), PICK = process.argv[3] || '';

/** 대표 모험가: 레벨·환생·연구를 정하고, 그 레벨 장비를 몇 번 주워 좋은 것을 끼웁니다. */
const PROFILES = [
    { name: '환생 0 · Lv.30', rebirths: 0, level: 30, research: { attack: 5, hp: 5, guard: 3 } },
    { name: '환생 10 · Lv.64', rebirths: 10, level: 64, research: { attack: 60, magicAttack: 20, hp: 60, guard: 30, magicGuard: 20, crit: 10, critDamage: 10, penetration: 8, exp: 6, gold: 8, drop: 5, mastery: 5 } },
    { name: '환생 40 · Lv.80', rebirths: 40, level: 80, research: { attack: 200, magicAttack: 80, hp: 200, guard: 100, magicGuard: 80, crit: 20, critDamage: 25, penetration: 15, lifesteal: 20, recovery: 10, evasion: 20, exp: 10, gold: 20, drop: 10, mastery: 10 } },
];
function build(p) {
    const rng = random(7), s = newState(0);
    s.rebirths = p.rebirths; s.level = p.level; s.peakLevel = p.level; s.statPoints = (p.level - 1) * 5; s.tutorial = { hidden: true, skipped: true };
    Object.assign(s.permanent, p.research, { inventory: 40 });
    for (let i = 0; i < 60; i++) drop(s, p.level, rng, true);
    manage(s, { magic: false, rng, secondary: 20, primary: 40, gear: true });
    s.inventory = []; s.autoSell = false;
    // 일일·주간 목표 보상(세계석 등)은 장소와 무관해 표를 흐리므로, 목표판을 만들어 둔 뒤 모두 받은 것으로 처리합니다.
    syncGoals(s, 0); for (const b of [s.daily, s.weekly]) if (b) { b.bonus = true; for (const g of b.goals) g.claimed = true; }
    return s;
}
const fmt = n => n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n >= 1e4 ? `${(n / 1e4).toFixed(1)}만` : String(Math.round(n));
function run(base, setup) {
    const s = structuredClone(base), rng = random(11);
    setup(s);
    const k0 = s.kills, g0 = s.gold, p0 = s.pearls, m0 = s.jobMastery[s.job] || 0, d0 = s.deaths, c0 = Object.values(s.clears || {}).reduce((a, b) => a + b, 0);
    let xp = 0, lastLevel = s.level, lastExp = s.exp, drops = 0;
    const ticks = MINUTES * 30, h = 60 / MINUTES;
    for (let n = 0; n < ticks; n++) {
        const inv = s.inventory.length; tick(s, rng); s.lastTick += 2000;
        drops += Math.max(0, s.inventory.length - inv); if (s.inventory.length > 30) s.inventory = [];
        // 경험치: 레벨이 오르면 그 레벨 필요량을 더해 누적(레벨은 테스트를 위해 되돌립니다)
        if (s.level !== lastLevel) { for (let l = lastLevel; l < s.level; l++) xp += xpNeeded(l, s.rebirths); xp += s.exp - lastExp; s.level = lastLevel; s.exp = 0; lastExp = 0; } else { xp += s.exp - lastExp; lastExp = s.exp; }
    }
    const need = xpNeeded(base.level, base.rebirths);
    return { kills: (s.kills - k0) * h, xp: xp * h, xpPct: xp * h / need * 100, gold: (s.gold - g0) * h, mastery: ((s.jobMastery[s.job] || 0) - m0) * h, drops: drops * h, pearls: (s.pearls - p0) * h, deaths: s.deaths - d0, clears: (Object.values(s.clears || {}).reduce((a, b) => a + b, 0) - c0) * h };
}
const row = (label, r) => `| ${label} | ${fmt(r.kills)} | ${r.xpPct.toFixed(1)}% | ${fmt(r.gold)} | ${fmt(r.mastery)} | ${fmt(r.drops)} | ${r.pearls ? fmt(r.pearls) : '-'} | ${r.clears ? fmt(r.clears) : '-'} | ${r.deaths} |`;
for (const p of PROFILES.filter(x => x.name.includes(PICK))) {
    const base = build(p);
    console.log(`\n### ${p.name} (${MINUTES}분 시뮬레이션 → 시간당 환산)\n`);
    console.log('| 장소 | 처치 | 경험치(레벨 필요량 대비) | 골드 | 직업 숙련 | 장비 | 세계석 | 던전 클리어 | 쓰러짐 |');
    console.log('|---|---|---|---|---|---|---|---|---|');
    const tides = [...new Set([0, Math.min(5, tideLimit(base)), Math.min(10, tideLimit(base)), Math.min(30, tideLimit(base))])];
    const ONLY = (process.env.AUDIT_STAGES || '').split(',').filter(Boolean);
    const stages = STAGES.filter(st => st.rebirth <= p.rebirths && levelGateOk(base, st.level) && (!ONLY.length || ONLY.includes(st.id)));
    for (const st of stages) for (const t of tides) {
        const r = run(base, s => { s.stage = st.id; s.tide = t; s.dungeon = null; s.enemy = null; s.running = true; s.target = null; });
        console.log(row(`${st.name} (Lv.${st.level}) 난이도 ${t}`, r));
    }
    const ONLY_D = (process.env.AUDIT_DUNGEONS || '').split(',').filter(Boolean);
    if (!process.env.AUDIT_NO_DUNGEONS) for (const d of DUNGEONS.filter(x => x.rebirth <= p.rebirths && levelGateOk(base, x.level) && (!ONLY_D.length || ONLY_D.includes(x.id)))) {
        // v27.68 일반 던전도 사냥터 난이도를 따르므로 난이도별로 잽니다(무릉도장은 층 공식이라 한 번).
        for (const t of d.id === 'abyss' ? [0] : tides) {
            const r = run(base, s => { s.tide = t; s.enemy = null; act(s, { type: 'dungeon', id: d.id, value: d.id === 'abyss' ? 'deeper:999' : 'fail' }, s.lastTick, random(3)); });
            console.log(row(`던전 ${d.name} (Lv.${d.level})${d.id === 'abyss' ? '' : ` 난이도 ${t}`}${r.clears ? '' : ' · 클리어 실패 → 사냥터로'}`, r));
        }
    }
}
