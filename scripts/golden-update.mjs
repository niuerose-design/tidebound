// 골든 기준 파일(tests/fixtures/golden.json)을 지금 코드로 다시 씁니다. 의도한 밸런스 변경 뒤에만 돌리고, 변경 내용을 커밋 메시지에 적으세요.
import { writeFileSync } from 'node:fs';
import { loadGame } from './lib/game-modules.mjs';
import { runGolden, GOLDEN_FILE, GOLDEN_HOURS, GOLDEN_SEED } from './lib/golden.mjs';
const { UPDATE_LOG } = await loadGame().load('game/data/update-log.js');
const rows = await runGolden(loadGame());
writeFileSync(GOLDEN_FILE, JSON.stringify({ build: UPDATE_LOG[0].version, hours: GOLDEN_HOURS, seed: GOLDEN_SEED, updatedAt: new Date().toISOString().slice(0, 10), bodies: Object.fromEntries(rows.map(r => [r.key, { hash: r.hash, ...r.summary }])) }, null, 1) + '\n');
console.log('골든 기준 갱신:', rows.map(r => `${r.key} ${r.hash} (Lv.${r.summary.level} · 처치 ${r.summary.kills})`).join(' · '));
