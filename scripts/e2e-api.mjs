// 실행 중인 서버에 대해 가입·로그인·게임·랭킹·로그아웃 흐름을 확인합니다.
// 사용: node scripts/e2e-api.mjs http://localhost:3000
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://localhost:3000';
let cookie = '';
async function call(path, body, { expect } = {}) {
    const res = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get('set-cookie'); if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    const data = await res.json().catch(() => ({}));
    if (expect !== undefined) assert.equal(res.status, expect, `${path} ${JSON.stringify(body)} → ${res.status} ${JSON.stringify(data)}`);
    return { status: res.status, data };
}
const user = `e2e_${Date.now().toString(36)}`, pw = 'test-password-1';
await call('/api/game', { type: 'sync' }, { expect: 401 });
await call('/api/chat', undefined, { expect: 401 });
assert.equal((await call('/api/auth')).data.loggedIn, false);
await call('/api/auth', { action: 'signup', username: 'x', password: pw }, { expect: 400 });
await call('/api/auth', { action: 'signup', username: user, password: pw }, { expect: 200 });
assert.ok(cookie.startsWith('tb_session='), 'session cookie set');
assert.equal((await call('/api/auth')).data.loggedIn, true);
let { data } = await call('/api/game', { type: 'sync' }, { expect: 200 });
assert.equal(data.state.version, 8);
({ data } = await call('/api/game', { type: 'start' }, { expect: 200 }));
assert.equal(data.state.running, true);
await call('/api/game', { type: 'upgrade', id: 'attack' }, { expect: 400 });
await call('/api/ranking', {}, { expect: 200 });
({ data } = await call('/api/ranking', undefined, { expect: 200 }));
assert.ok(data.rows.some(r => r.self), 'own ranking row listed');
const me = data.rows.find(r => r.self);
assert.ok(me.rebirths !== undefined && me.stats && Array.isArray(me.skills), 'ranking row carries rebirths, stats and skills for the detail view');
// 훈련 대결: 등록된 낚시꾼(자기 자신)과 던전 보스. 점수·전적은 바뀌지 않습니다.
({ data } = await call('/api/duel', { type: 'training', id: `user:${me.id}` }, { expect: 200 }));
assert.equal(data.result.training, true); assert.equal(data.result.ratingChange, 0); assert.equal(data.state.wins + data.state.losses, 0);
({ data } = await call('/api/duel', { type: 'training', id: 'boss:grottoWarden' }, { expect: 200 }));
assert.equal(data.result.opponent, '동굴의 수호 곰치');
await call('/api/duel', { type: 'training', id: 'boss:minnow' }, { expect: 400 });
await call('/api/duel', { type: 'training', id: '0' }, { expect: 400 });
// 전체 채팅: 보내기·커서로 새 줄만 받기·길이·도배 제한.
await call('/api/chat', { text: '' }, { expect: 400 });
({ data } = await call('/api/chat', { text: '  안녕하세요   e2e  ' }, { expect: 200 }));
assert.equal(data.row.text, '안녕하세요 e2e'); assert.equal(data.row.self, true); const chatId = data.row.id;
await call('/api/chat', { text: '너무 빨리' }, { expect: 429 });
await call('/api/chat', { text: 'x'.repeat(121) }, { expect: 400 });
({ data } = await call('/api/chat', undefined, { expect: 200 }));
assert.ok(data.rows.some(r => r.id === chatId && r.self), 'own chat line listed');
({ data } = await call(`/api/chat?after=${chatId}`, undefined, { expect: 200 }));
assert.equal(data.rows.length, 0, 'cursor returns only newer lines');
await call('/api/chat?channel=nope', undefined, { expect: 400 });
await call('/api/auth', { action: 'logout' }, { expect: 200 });
cookie = '';
await call('/api/game', { type: 'sync' }, { expect: 401 });
await call('/api/auth', { action: 'signup', username: user, password: pw }, { expect: 409 });
await call('/api/auth', { action: 'login', username: user, password: 'wrong-password' }, { expect: 401 });
await call('/api/auth', { action: 'login', username: user.toUpperCase(), password: pw }, { expect: 200 });
({ data } = await call('/api/game', { type: 'sync' }, { expect: 200 }));
assert.equal(data.state.running, true, 'same save after re-login');
console.log('e2e api checks passed');
