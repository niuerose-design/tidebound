// 게임플레이 테스트 실행: node tests/run.mjs. 파일 순서가 공유 난수 순서를 정하므로 바꾸지 마세요.
import { results } from './harness.mjs';
await import('./basics.test.mjs');
await import('./features.test.mjs');
await import('./systems.test.mjs');
await import('./growth.test.mjs');
await import('./content.test.mjs');
await import('./expansion.test.mjs');
await import('./research.test.mjs');
await import('./classes.test.mjs');
await import('./doors.test.mjs');
await import('./jobs-ui.test.mjs');
await import('./playback.test.mjs');
await import('./chain.test.mjs');
await import('./support.test.mjs');
await import('./v25.test.mjs');
console.log(`${results.passed} gameplay tests passed.`);
