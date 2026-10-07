// 리팩터링 결과 동일성 검증(턴 처리): 기준 몸(환생 5단계 × 5차 직업 18종)을 고정 난수 · 고정 시각으로 400턴씩 돌려
// 최종 세이브 해시 · 중간 능력치 해시 · 턴 평균 시간을 찍습니다. check-equivalence.mjs(행동 시나리오)와 짝입니다.
// 사용: node scripts/check-turn-hash.mjs > before.json   (변경 전)
//       node scripts/check-turn-hash.mjs > after.json    (변경 후) → diff before.json after.json (비어 있어야 함)
// 약 1~2분. 저장소 루트에서 실행하세요.
import { createHash } from 'node:crypto';
import { loadGame } from './lib/game-modules.mjs';
import { referenceBodies } from './lib/reference-body.mjs';
const game = loadGame();
const { advance, act } = await game.load('systems/engine');
const { stats } = await game.load('systems/stats');
const { JOBS } = await game.load('data/classes');
const { referenceBody, random } = await referenceBodies(game);
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
// 5차 직업 중 계보가 다른 것들을 고르게: 물리 · 마법 · 상태이상 · 보조 · 제약 등
const picks = ['hero', 'thousandChants', 'grandMagus', 'celestialBlade', 'guardianDeity', 'apostle', 'oceanFist', 'grandAlchemist', 'aeonChronicler', 'lifeOcean', 'crimsonAvatar', 'luckDeity', 'seaTreasury', 'routeDeity', 'beastKing', 'siren', 'skyInverter', 'fortuneAvatar'].filter(id => JOBS.some(j => j.id === id));
const out = {}; let totalTurns = 0, totalMs = 0;
for (const r of [3, 12, 30, 60, 90]) for (const job of picks) {
    let s; try { s = referenceBody(r, job); } catch { continue; }
    s.running = true; const rng = random(r * 1000 + job.length); let now = 1790000000000; s.lastTick = now;
    const mids = []; const t0 = process.hrtime.bigint();
    for (let i = 0; i < 160; i++) { advance(s, now += 5000, rng); if (i % 40 === 39) mids.push(hash(stats(s))); if (i === 80) act(s, { type: 'sync' }, now, rng); }
    totalMs += Number(process.hrtime.bigint() - t0) / 1e6; totalTurns += 400;
    out[`${r}:${job}`] = { final: hash(s), stats: mids, turn: s.turn, kills: s.kills, level: s.level, gold: s.gold };
}
console.error(`${Object.keys(out).length} bodies · ${totalTurns} turns · ${(totalMs / totalTurns).toFixed(3)} ms/turn`);
console.log(JSON.stringify(out, null, 1));
