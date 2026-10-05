// 사냥터·던전 난이도 점검표: 사냥터마다 난이도별 몬스터 레벨·체력·공격과 배율, 그리고 '체력 1만당 경험치·골드'(잡는 속도가 같을 때의 시간당 효율 지표)를 표로 뽑습니다.
// 시뮬레이션이 아니라 공식 그대로의 결정적 계산이라 즉시 끝납니다.
// 사용: node scripts/stage-balance.mjs [플레이어 레벨=100] [난이도 목록=0,5,10,30,50,100,200] [사냥터 id 일부 필터]
//   예) node scripts/stage-balance.mjs 80 0,5,30 vanishing
//   환경 변수 STAGE_BALANCE_DUNGEONS=1 이면 일반 던전(노말·헬·나이트메어)도 같이 뽑습니다.
import { loadGame } from './lib/game-modules.mjs';
const { load } = loadGame();
const { STAGES, PLAIN_DUNGEONS, dungeonDepth, stageDepth } = await load('data/world');
const { stageField } = await load('systems/encounter');
const { tierHealth, tierAttack, tierReward, tierExp, dungeonLevelAt, dungeonCatchReward } = await load('systems/meta');
const { scaledEnemyStats } = await load('data/encounters');
const { DUNGEON_MODES } = await load('data/balance');
const { FISH, tideLiftFish } = await load('data/world');
const level = Number(process.argv[2] || 100), tiers = (process.argv[3] || '0,5,10,30,50,100,200').split(',').map(Number), pick = process.argv[4] || '';
const fmt = n => n >= 1e8 ? `${(n / 1e8).toFixed(1)}억` : n >= 1e4 ? `${(n / 1e4).toFixed(1)}만` : String(Math.round(n));
const pad = (s, n) => String(s).padStart(n);
console.log(`플레이어 Lv.${level} · 난이도 ${tiers.join(' · ')}\n`);
console.log('난이도 배율 | ' + tiers.map(t => `t${t}: 체력 ×${tierHealth(t).toFixed(1)} 공격 ×${tierAttack(t).toFixed(1)} 경험치 ×${tierExp(t).toFixed(2)} 골드 ×${tierReward(t).toFixed(1)}`).join(' | ') + '\n');
const stages = STAGES.filter(st => !pick || st.id.includes(pick) || st.name.includes(pick));
for (const st of stages) {
    console.log(`${st.name} (입장 Lv.${st.level} · 환생 ${st.rebirth} · 깊이 ×${stageDepth(st.id).toFixed(2)})`);
    console.log('  난이도 | 몬스터 Lv | 평균 체력 | 평균 공격 | 경험치/마리 | 골드/마리 | 체력 1만당 경험치 | 체력 1만당 골드 | 난이도 0 대비(경험치/골드)');
    let base;
    for (const t of tiers) {
        const rows = st.fish.map(id => stageField({ level }, st.id, id, t));
        const avg = f => rows.reduce((a, r) => a + f(r), 0) / rows.length;
        const hp = avg(r => r.foe.hp), atk = avg(r => r.foe.attack), exp = avg(r => r.exp), gold = avg(r => r.gold), lv = avg(r => r.level);
        const e = exp / hp * 1e4, g = gold / hp * 1e4; base ??= { e, g };
        console.log(`  ${pad(t, 5)} | ${pad(Math.round(lv), 8)} | ${pad(fmt(hp), 9)} | ${pad(fmt(atk), 9)} | ${pad(fmt(exp), 10)} | ${pad(fmt(gold), 9)} | ${pad(Math.round(e).toLocaleString(), 16)} | ${pad(Math.round(g).toLocaleString(), 14)} | ${(e / base.e * 100).toFixed(0)}% / ${(g / base.g * 100).toFixed(0)}%`);
    }
    console.log('');
}
if (process.env.STAGE_BALANCE_DUNGEONS) for (const d of PLAIN_DUNGEONS.filter(d => d.id !== 'abyss' && (!pick || d.id.includes(pick) || d.name.includes(pick)))) {
    console.log(`던전 ${d.name} (입장 Lv.${d.level} · 환생 ${d.rebirth} · 깊이 ×${dungeonDepth(d.id).toFixed(2)})`);
    console.log('  모드 | 몬스터 Lv | 평균 체력 | 평균 공격 | 경험치/마리 | 골드/마리 | 체력 1만당 경험치 | 체력 1만당 골드');
    for (const m of DUNGEON_MODES) {
        const t = m.tier, dLevel = dungeonLevelAt(d, t, level), k = dungeonDepth(d.id);
        const rows = d.fish.map(id => { const f = tideLiftFish(FISH.find(x => x.id === id), t, level), foe = scaledEnemyStats(f, { tier: t, wave: 0 }), r = dungeonCatchReward(f, dLevel, t, false, d.id); return { hp: foe.hp * k, atk: foe.attack * k, exp: r.exp * k, gold: r.gold * k, lv: f.level }; });
        const avg = f => rows.reduce((a, r) => a + f(r), 0) / rows.length;
        const hp = avg(r => r.hp), atk = avg(r => r.atk), exp = avg(r => r.exp), gold = avg(r => r.gold), lv = avg(r => r.lv);
        console.log(`  ${pad(m.name, 6)} | ${pad(Math.round(lv), 8)} | ${pad(fmt(hp), 9)} | ${pad(fmt(atk), 9)} | ${pad(fmt(exp), 10)} | ${pad(fmt(gold), 9)} | ${pad(Math.round(exp / hp * 1e4).toLocaleString(), 16)} | ${pad(Math.round(gold / hp * 1e4).toLocaleString(), 14)}`);
    }
    console.log('');
}
