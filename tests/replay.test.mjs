// v3.103 전투 재생: 로그 묶음을 기록의 서버 턴 번호로 배치합니다(쓰러진 뒤 회복 대기처럼 로그 없는 턴을 정확히 건너뜀).
import { loadGame } from '../scripts/lib/game-modules.mjs';
import { newState, tick, stats, assert, test } from './harness.mjs';
const { buildCombatReplay } = await loadGame().load('game/systems/combat-feedback.js');

test('v3.103 replay: every log shows up on its own server turn, including across a defeat and recovery', () => {
    const s = newState(0), rng = () => .5;
    s.running = true; s.rebirths = 12; s.stage = 'starfall'; s.hp = stats(s).hp; // 약한 몸으로 강한 사냥터 → 쓰러지고 회복 대기
    const prev = JSON.parse(JSON.stringify(s)), count = 40;
    for (let i = 0; i < count; i++) tick(s, rng);
    s.lastTick = prev.lastTick + count * 2000;
    assert.ok(s.deaths > prev.deaths, 'the run includes a defeat');
    const a = stats(s), turns = buildCombatReplay(prev, s, a.hp, a.mana), prevLast = prev.logs.at(-1)?.id ?? 0;
    assert.ok(turns && turns.length === count);
    for (const t of turns) {
        const serverTurn = prev.turn + t.turn, shown = t.frames.at(-1).lastLogId;
        for (const log of s.logs.filter(l => l.id > prevLast)) {
            if (log.turn <= serverTurn) assert.ok(log.id <= shown, `log ${log.id} (turn ${log.turn}) is visible by turn ${serverTurn}`);
            else assert.ok(log.id > shown, `log ${log.id} (turn ${log.turn}) is not shown early at turn ${serverTurn}`);
        }
    }
});
