import { loadGame } from './scripts/lib/game-modules.mjs';
const { load } = loadGame();
const { newState } = await load('systems/engine'), { stats, powerParts, power } = await load('systems/stats');
for (const [label, mk] of [['Lv.1 새 캐릭터', () => newState(0)], ['Lv.100 R200 측정 몸', () => { const s = newState(0); s.level = 100; s.rebirths = 200; s.statPoints = 0; s.attributes = { str: 300, dex: 100, int: 0, vit: 100, wis: 0, luk: 300 }; Object.assign(s.permanent, { attack: 200, hp: 200, guard: 100, magicGuard: 100 }); s.equipment = { rod: null, coat: null, charm: null, cape: null }; return s; }]]) {
  const st = stats(mk()), p = powerParts(st), old = power(st);
  const k = 6 * Math.sqrt(p.offense * p.durability) / (Math.pow(p.offense, .65) * Math.pow(p.durability, .35));
  console.log(`${label}: 공격 ${p.offense.toFixed(1)} 버팀 ${p.durability.toFixed(1)} 옛 전투력 ${old} · 같은 값이 되는 배율 k=${k.toFixed(3)} (6 × (버팀/공격)^.15)`);
}
