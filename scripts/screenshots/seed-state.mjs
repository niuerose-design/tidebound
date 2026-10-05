// 스크린샷용 중반 진행 세이브를 만들어 로컬 D1에 넣을 SQL을 출력합니다.
import { loadGame } from '../lib/game-modules.mjs';
const { load } = loadGame();
const { newState, act, advance } = await load('game/systems/engine.js');
const { FISH } = await load('game/data/world.js');
let seed = 3; const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const now = Date.now() - 60_000;
const s = newState(now - 3 * 3600_000);
s.name = '스크린샷 선장'; s.level = 44; s.rebirths = 3; s.pearls = 180; s.gold = 250000; s.sp = 3; s.abyssBest = 12; s.abyssMilestones = [10];
s.attributes = { str: 30, dex: 28, int: 26, vit: 30, wis: 22, luk: 20 }; s.statPoints = 16;
s.permanent = { attack: 8, hp: 6, guard: 3, gold: 2, ap: 2 };

for (const f of FISH.slice(0, 14)) s.book[f.id] = Math.floor(rng() * 700);
s.jobMastery = { fisher: 900, wanderer: 2600, harpoon: 400 }; s.unlockedJobs = ['fisher', 'wanderer', 'harpoon'];
s.job = 'wanderer';
for (let i = 0; i < 25; i++) { try { act(s, { type: 'gamble', id: ['rod', 'coat', 'charm', 'cape'][i % 4] }, now, rng); } catch { } }
act(s, { type: 'stage', id: 'reef' }, now); act(s, { type: 'start' }, now);
advance(s, now, rng);
s.lastTick = now;
// 로컬 파일 DB에 계정·세션·세이브를 함께 기록합니다. 세션 토큰은 캡처 스크립트가 쿠키로 사용합니다.
const token = 'a'.repeat(64), accountId = 'acct_screenshot';
const dbFile = { players: { [accountId]: { state: JSON.stringify(s), revision: 1, updated_at: now } }, rankings: {}, accounts: { [accountId]: { id: accountId, username: 'screenshot', pass_hash: 'x', salt: 'x', created_at: now } }, sessions: { [token]: { account_id: accountId, expires_at: now + 86400000 } } };
const { writeFileSync } = await import('node:fs');
writeFileSync(process.argv[2] || '/tmp/shot-db.json', JSON.stringify(dbFile));
console.log('seeded', process.argv[2] || '/tmp/shot-db.json');
