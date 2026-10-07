import { loadGame } from '/tmp/claude-0/-home-user-tidebound/d096d86d-5648-5ad1-b3a6-aac42d96ec3d/scratchpad/wt2/scripts/lib/game-modules.mjs';
import { random } from '/tmp/claude-0/-home-user-tidebound/d096d86d-5648-5ad1-b3a6-aac42d96ec3d/scratchpad/wt2/scripts/lib/sim.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine'), { stats, power, powerParts } = await load('systems/stats'), { strike } = await load('systems/combat');
const Ec = await load('data/economy'), { RARITIES } = await load('data/balance'), { gearName } = await load('data/maple-gear'), { rollAffixes, refineOption } = await load('data/gear');
const SAMPLES = 60, N = 3000, rng = random(3);
const body = () => { const s = newState(0); s.level = 100; s.rebirths = 200; s.statPoints = 0; s.attributes = { str: 300, dex: 100, int: 0, vit: 100, wis: 0, luk: 300 }; Object.assign(s.permanent, { attack: 200, hp: 200, guard: 100, magicGuard: 100 }); s.equipment = { rod: null, coat: null, charm: null, cape: null }; return s; };
const max = (affixes, pw, rarity) => affixes.map(x => refineOption(x, pw, rarity, () => 1, 100));
const piece = (slot, rarity, star, kind, rb = 200) => { const pw = kind ? Ec.heirPower(kind, rb, 100) : Math.round(102 * RARITIES[rarity].factor), style = slot === 'rod' ? 'physical' : 'balanced'; const affixes = rollAffixes(rarity, pw, undefined, rng, [], slot, 100); return { id: slot, slot, style, rarity, power: pw, level: 100, enhance: star, name: gearName(slot, rarity, style), ...(kind ? { heir: kind } : {}), affixes: kind ? max(affixes, pw, rarity) : affixes }; };
const fighter = (st, name) => ({ name, stats: { ...st }, hp: 1e15, mana: 1e9, skills: [], cooldowns: {}, stun: 0, effects: {}, ranks: {}, mastery: {}, practice: {} });
const MOB = { hp: 1e15, attack: 5000, magic: 5000, defense: 163, resist: 163, crit: 0, critDamage: 1.65, accuracy: 1.1, evasion: .1, speed: 10, mana: 0, manaRegen: 0, penetration: 0, lifesteal: 0 };
function simulated(st) {
    const r = random(11); let dealt = 0, taken = 0;
    for (let i = 0; i < N; i++) { const me = fighter({ ...st, speed: 10 }, 'me'), mob = fighter(MOB, 'mob'); strike(me, mob, r); dealt += 1e15 - mob.hp; }
    for (let i = 0; i < N; i++) { const me = fighter({ ...st, speed: 10, thorns: 0 }, 'me'), mob = fighter(MOB, 'mob'); strike(mob, me, r); taken += 1e15 - me.hp; }
    const offense = dealt / N, durability = st.hp / Math.max(1e-9, taken / N) * (1 + (st.lifesteal || 0));
    return { offense, durability, score: Math.sqrt(offense * durability) };
}
const SLOTS = ['rod', 'coat', 'charm', 'cape'];
function report(label, make) {
    const fullP = [], noP = { rod: [], coat: [], charm: [], cape: [] }, onlyP = { rod: [], coat: [], charm: [], cape: [] }, parts = { full: [], none: [] };
    let simFull, simNo = {};
    for (let k = 0; k < SAMPLES; k++) {
        const s = body(); const items = Object.fromEntries(SLOTS.map(sl => [sl, make(sl)]));
        const naked = power(stats(s)); parts.none.push(powerParts(stats(s)));
        for (const sl of SLOTS) s.equipment[sl] = items[sl];
        const full = stats(s); fullP.push(power(full) / naked); parts.full.push(powerParts(full));
        if (k === 0) { simFull = simulated({ ...full, chainBonus: 0, bossDamage: 0 }); }
        for (const sl of SLOTS) { s.equipment[sl] = null; const st = stats(s); noP[sl].push(power(st) / naked); if (k === 0) simNo[sl] = simulated({ ...st, chainBonus: 0, bossDamage: 0 }); s.equipment[sl] = items[sl]; }
        for (const sl of SLOTS) { for (const o of SLOTS) s.equipment[o] = o === sl ? items[o] : null; onlyP[sl].push(power(stats(s)) / naked); }
    }
    const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
    console.log(`\n${label}: 4부위 전투력 ×${avg(fullP).toFixed(2)} (장비 없음 대비)`);
    for (const sl of SLOTS) console.log(`  ${sl.padEnd(5)} 빼면 ×${avg(noP[sl]).toFixed(2)} (−${((1 - avg(noP[sl]) / avg(fullP)) * 100).toFixed(1)}%)  ·  그것만 끼면 ×${avg(onlyP[sl]).toFixed(2)}  ·  실제 전투 굴림: 빼면 −${((1 - simNo[sl].score / simFull.score) * 100).toFixed(1)}% (공격 −${((1 - simNo[sl].offense / simFull.offense) * 100).toFixed(1)}% · 버팀 −${((1 - simNo[sl].durability / simFull.durability) * 100).toFixed(1)}%)`);
    const pf = parts.full[0], pn = parts.none[0];
    console.log(`  식 내부(표본 1): 공격 ×${(pf.offense / pn.offense).toFixed(2)} · 버티는 힘 ×${(pf.durability / pn.durability).toFixed(2)} (방어 경감 ×${(pf.armor / pn.armor).toFixed(2)})`);
}
// 능력치 합계도 같이 봅니다: 장비 없음 vs 태초 22성 4부위.
{ const s = body(); const a = stats(s); for (const sl of SLOTS) s.equipment[sl] = piece(sl, 6, 22); const b = stats(s); console.log(`태초 22성 4부위 능력치: 체력 ${Math.round(a.hp)} → ${Math.round(b.hp)} (×${(b.hp / a.hp).toFixed(2)}) · 공격 ${Math.round(a.attack)} → ${Math.round(b.attack)} (×${(b.attack / a.attack).toFixed(2)}) · 방어 ${Math.round(a.defense)} → ${Math.round(b.defense)} (×${(b.defense / a.defense).toFixed(2)}) · 마방 ${Math.round(a.resist)} → ${Math.round(b.resist)} · 마나 ${Math.round(a.mana)} → ${Math.round(b.mana)} · 치명 ${(a.crit * 100).toFixed(0)}% → ${(b.crit * 100).toFixed(0)}% · 회피 ${(a.evasion * 100).toFixed(0)}% → ${(b.evasion * 100).toFixed(0)}%`); }
report('태초 22성(보통 굴림, 환생 200 캐릭터)', sl => piece(sl, 6, 22));
report('태초 0성', sl => piece(sl, 6, 0));
report('계승 태초 22성 R200(최고 굴림)', sl => piece(sl, 6, 22, 'primal'));
report('신화 22성', sl => piece(sl, 4, 22));
