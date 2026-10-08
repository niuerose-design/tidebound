// 리팩터링 동일성 검증: 고정 상태·고정 난수로 게임 로직을 실행해 결과 지문을 만듭니다.
// 사용법: node scripts/check-equivalence.mjs > before.json   (변경 전)
//         node scripts/check-equivalence.mjs > after.json    (변경 후) 후 두 파일 비교
import { createHash } from 'node:crypto';
import { loadGame } from './lib/game-modules.mjs';

const { load } = loadGame();
const engine = await load('game/systems/engine.js');
const statsM = await load('game/systems/stats.js');
const prog = await load('game/systems/progression.js');
const desc = await load('game/systems/skill-description.js');
const commerceM = await load('game/systems/commerce.js');
const equipment = await load('game/systems/equipment.js');
const meta = await load('game/systems/meta.js');
const duelM = await load('game/systems/duel.js');
const migrations = await load('game/systems/migrations.js');
const feedback = await load('game/systems/combat-feedback.js');
const status = await load('game/systems/combat-status.js');
const mastery = await load('game/systems/mastery.js');
const { SKILLS } = await load('game/data/skills.js');
const { JOBS } = await load('game/data/classes.js');
const { STAGES, DUNGEONS, FISH, setClosures } = await load('game/data/world.js');
// 라이브에서 닫힌 곳(기본: 무릉도장)도 검증하도록 모두 엽니다.
setClosures({ dungeons: [], stages: [] });
const { RESEARCH, SHOP, RELICS, GAMBLE_CATEGORIES } = await load('game/data/economy.js');
const { scaledEnemyStats } = await load('game/data/encounters.js');

const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
function seeded(seed) { let x = seed >>> 0; const f = () => { f.calls++; x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; f.calls = 0; return f; }
const result = {};

// 1. 무작위 행동 시나리오: 모든 행동 종류를 섞어 실행하고 매 단계 상태 지문을 기록
const ATTRS = ['str', 'int', 'vit', 'agi', 'luk', 'wis', 'dex'];
function pickAction(s, r) {
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const inv = s.inventory.map(i => i.id), skillIds = SKILLS.map(x => x.id);
    const options = [
        () => ({ type: 'start' }), () => ({ type: 'pause' }), () => ({ type: 'sync' }),
        () => ({ type: 'stage', id: pick(STAGES).id }), () => ({ type: 'tide', id: String(Math.floor(r() * 4)) }),
        () => ({ type: 'dungeon', id: pick(DUNGEONS.filter(d => !d.random)).id, value: pick(['once', '3', 'fail', 'deeper:3']) }), () => ({ type: 'leaveDungeon' }),
        () => ({ type: 'job', id: pick(JOBS).id }), () => ({ type: 'skill', id: pick(skillIds) }), () => ({ type: 'learn', id: pick(skillIds) }),
        () => ({ type: 'inheritSkill', id: pick(skillIds) }), () => ({ type: 'skillUp', id: pick(skillIds) }), () => ({ type: 'resetSkills' }),
        () => ({ type: 'attribute', id: pick(ATTRS) }), () => ({ type: 'resetAttributes' }), () => ({ type: 'claimBook', id: pick(FISH).id }),
        () => ({ type: 'registerItem', id: pick(inv) }), () => ({ type: 'target', id: pick(FISH).id }), () => ({ type: 'savePreset', id: String(Math.floor(r() * 3)) }),
        () => ({ type: 'loadPreset', id: String(Math.floor(r() * 3)) }), () => ({ type: 'equip', id: pick(inv) }), () => ({ type: 'unequip', id: pick(['rod', 'coat', 'charm']) }),
        () => ({ type: 'sell', id: pick(inv) }), () => ({ type: 'rebirth' }),
        () => ({ type: 'offlineDismiss' }),
        () => ({ type: 'gamble', id: 'all' }), () => ({ type: 'imprintGamble', id: pick(GAMBLE_CATEGORIES).id, value: 'might|1' }), () => ({ type: 'autoGamble', id: pick(GAMBLE_CATEGORIES).id, value: `4|${Math.floor(r() * 1e6)}` }), () => ({ type: 'enhance', id: pick(inv) }),
        () => ({ type: 'reforge', id: pick(inv) }), () => ({ type: 'lockItem', id: pick(inv) }), () => ({ type: 'sellRarity', id: String(Math.floor(r() * 4)) }),
        () => ({ type: 'permanent', id: pick(RESEARCH).id }), () => ({ type: 'buyRelic', id: pick(RELICS).id }),
    ];
    return pick(options)();
}
const scenarioStarts = [
    () => engine.newState(0),
    () => { const s = engine.newState(0); s.level = 35; s.gold = 5e5; s.pearls = 300; s.sp = 6; s.statPoints = 60; s.rebirths = 2; return s; },
    () => { const s = engine.newState(0); s.level = 70; s.gold = 5e6; s.pearls = 3000; s.sp = 12; s.statPoints = 200; s.rebirths = 6; s.abyssBest = 8; s.permanent.attack = 40; s.permanent.hp = 40; return s; },
];
result.fuzz = []; const okTypes = {};
for (const [si, start] of scenarioStarts.entries()) for (const seed of [1, 2, 3]) {
    const s = start(), game = seeded(seed * 7919 + si), chooser = seeded(seed * 104729 + si);
    const trace = []; let now = 0;
    for (let step = 0; step < 450; step++) {
        const a = pickAction(s, chooser);
        let err = null;
        try { engine.act(s, a, now, game); okTypes[a.type] = (okTypes[a.type] || 0) + 1; } catch (e) { err = String(e.message); }
        now += Math.floor(chooser() * 180000);
        engine.advance(s, now, game);
        trace.push(hash([a, err, s]));
    }
    result.fuzz.push({ si, seed, rngCalls: game.calls, final: hash(s), trace: hash(trace), level: s.level, kills: s.kills, rebirths: s.rebirths });
}

result.fuzzSuccessfulActions = Object.fromEntries(Object.entries(okTypes).sort());

// 2. 오프라인 정산: 24시간 방치
{
    const s = engine.newState(0), game = seeded(88); engine.act(s, { type: 'start' }, 0, game); engine.advance(s, 86_400_000, game);
    result.offline = { rngCalls: game.calls, state: hash(s), turn: s.turn, kills: s.kills, level: s.level, lastOffline: s.lastOffline };
}
// 3. 던전·심연 반복, 환생 연쇄
{
    const s = engine.newState(0), game = seeded(5); s.level = 60; s.rebirths = Math.max(...DUNGEONS.map(d => d.rebirth)); s.permanent.attack = 200; s.permanent.hp = 200; s.permanent.guard = 50; s.hp = statsM.stats(s).hp;
    let now = 0; const trace = [];
    for (const d of DUNGEONS.filter(d => !d.random)) { engine.act(s, { type: 'dungeon', id: d.id, value: d.id === 'abyss' ? 'deeper:6' : '3' }, now, game); for (let i = 0; i < 6000 && s.dungeon; i++) { now += 2000; engine.advance(s, now, game); } trace.push(hash(s)); }
    for (let life = 0; life < 4; life++) { now += 8 * 3600_000; engine.advance(s, now, game); try { engine.act(s, { type: 'rebirth' }, now, game); } catch (e) { trace.push(String(e.message)); } engine.act(s, { type: 'start' }, now, game); trace.push(hash(s)); }
    result.dungeonRebirth = { rngCalls: game.calls, trace: hash(trace), state: hash(s), rebirths: s.rebirths, pearls: s.pearls, abyssBest: s.abyssBest };
}
// 4. 결투
{
    const game = seeded(31), a = engine.newState(0), b = engine.newState(0); a.level = 40; b.level = 45; b.job = JOBS[5].id;
    result.duel = hash([duelM.duel(statsM.snapshot(a), statsM.snapshot(b), false, game), duelM.duel(statsM.snapshot(a), duelM.TRAINING[0], true, game), game.calls]);
}
// 5. 마이그레이션
{
    const s = engine.newState(0); s.version = 1; s.level = 20; s.skills = ['hook', 'pierce']; s.abyssBest = 30; const m = migrations.migrateState(s); result.migration = hash(m);
}
// 6. 화면 표시에 쓰이는 계산 (스킬 설명, 능력치, 직업 조건, 적 능력치, 비용)
{
    const samples = [engine.newState(0), ...scenarioStarts.slice(1).map(f => f())];
    samples[2].job = JOBS.find(j => j.tier === 2)?.id || samples[2].job;
    const display = [];
    for (const sk of SKILLS) {
        display.push(desc.skillEffectLines(sk), desc.skillGrowthStages(sk), prog.skillRankDeltas(sk, 2, 1), prog.skillRankHint(sk, 1, 0), mastery.masteryConditionText(sk));
        for (const lv of [0, 1, 2, 3]) display.push(prog.effectiveSkill(sk, lv + 1, lv));
    }
    for (const s of samples) {
        display.push(statsM.stats(s), statsM.dropRate(s), statsM.goldMultiplier(s), statsM.expMultiplier(s), statsM.dungeonGoldMultiplier(s), statsM.snapshot(s), statsM.power(statsM.stats(s)));
        display.push(prog.apCapacity(s), prog.apUsed(s), meta.rebirthReward(s, 2), meta.rebirthLevel(s), commerceM.gambleCost(s), commerceM.imprintGambleCost(s), commerceM.pityLeft(s));
        for (const j of JOBS) display.push(prog.jobRequirements(s, j), prog.canChangeJob(s, j.id));
        for (const x of SHOP) display.push(commerceM.shopPreview(s, x.id));
        for (const f of FISH) display.push(prog.bookReward(s, f.id));
    }
    for (const f of FISH) for (const tier of [0, 5, 25, 60]) display.push(scaledEnemyStats(f, { tier }), scaledEnemyStats(f, { boss: true, tier, wave: 4 }));
    const s = samples[2], game = seeded(9); for (let i = 0; i < 20; i++) { try { engine.act(s, { type: 'gamble', id: 'all' }, 0, game); } catch { } }
    for (const it of s.inventory) display.push(equipment.itemStats(it), equipment.enhanceCost(it), equipment.reforgeCost(it), equipment.saleValue(it), equipment.itemDescription(it));
    const fighter = { name: 'A', stats: statsM.stats(s), hp: 100, skills: [], cooldowns: {}, stun: 0 };
    display.push(statsM.hitChance(fighter.stats, statsM.stats(samples[0])));
    const logs = [{ id: 1, type: 'battle', text: '검증 · 관통 작살 → 120 물리 피해 · 기절' }, { id: 2, type: 'battle', text: '적 · 기본 공격 → 빗나감' }];
    display.push(feedback.combatFxBatch(logs, 0, '검증'), status.visibleStatuses({ bleed: { turns: 2, damage: 5 } }, 1, [], 'player'));
    result.display = hash(display);
}
console.log(JSON.stringify(result, null, 1));
