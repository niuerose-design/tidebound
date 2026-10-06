// 실행 중인 서버에 대해 가입·로그인·게임·랭킹·로그아웃 흐름을 확인합니다.
// 사용: node scripts/e2e-api.mjs http://localhost:3000
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://localhost:3000';
// 쿠키 단지: 세션(tb_session)과 캐릭터 슬롯(tb_slot) 두 쿠키를 브라우저처럼 따로 보관합니다.
const jar = new Map();
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
let cookie = '';
async function call(path, body, { expect } = {}) {
    const res = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(jar.size ? { cookie: cookieHeader() } : {}) }, body: body ? JSON.stringify(body) : undefined });
    for (const set of res.headers.getSetCookie?.() || []) { const [k, v] = set.split(';')[0].split('='); if (v) jar.set(k, v); else jar.delete(k); }
    cookie = jar.has('tb_session') ? `tb_session=${jar.get('tb_session')}` : '';
    const data = await res.json().catch(() => ({}));
    if (expect !== undefined) assert.equal(res.status, expect, `${path} ${JSON.stringify(body)} → ${res.status} ${JSON.stringify(data)}`);
    return { status: res.status, data };
}
const user = `e2e_${Date.now().toString(36)}`, pw = 'test-password-1';
await call('/api/game', { type: 'sync' }, { expect: 401 });
await call('/api/chat', undefined, { expect: 401 });
assert.equal((await call('/api/auth')).data.loggedIn, false);
await call('/api/auth', { action: 'signup', username: 'x', password: pw, name: '테스터' }, { expect: 400 });
await call('/api/auth', { action: 'signup', username: user, password: pw, name: 'x' }, { expect: 400 }); // v26.8 모험가 이름 2~16자
await call('/api/auth', { action: 'signup', username: user, password: pw, name: '테스터까미' }, { expect: 200 });
assert.ok(cookie.startsWith('tb_session='), 'session cookie set');
assert.equal((await call('/api/auth')).data.loggedIn, true);
let { data } = await call('/api/game', { type: 'sync' }, { expect: 200 });
assert.equal(data.state.version, 8); assert.equal(data.state.name, '테스터까미', 'v26.8 signup name applied to the first fisher');
assert.equal(data.catalog?.secret, false, 'v3.43 catalog rides with the game response (secrecy off by default)'); assert.ok(data.catalog.doors?.discovery?.length, 'v3.44 door states come from the server');
assert.equal(data.catalog.skills?.length, 67, 'v3.47 secret-job skills come through the catalog (all of them while secrecy is off)');
assert.ok(data.catalog.odds?.drop?.chance > 0, 'v3.52 drop odds come through the catalog while secrecy is off');
({ data } = await call('/api/game', { type: 'start' }, { expect: 200 }));
assert.equal(data.state.running, true);
await call('/api/game', { type: 'upgrade', id: 'attack' }, { expect: 400 });
await call('/api/ranking', {}, { expect: 200 });
({ data } = await call('/api/ranking', undefined, { expect: 200 }));
assert.ok(data.rows.some(r => r.self), 'own ranking row listed');
const me = data.rows.find(r => r.self);
assert.ok(me.rebirths !== undefined && me.stats && Array.isArray(me.skills), 'ranking row carries rebirths, stats and skills for the detail view');
assert.ok(/^\d{4}-\d{2}$/.test(data.season) && me.id.startsWith(`duel:${data.season}:`), 'v25.12 monthly duel season row id');
// 훈련 대결: 등록된 모험가(자기 자신)과 던전 보스. 점수·전적은 바뀌지 않습니다.
({ data } = await call('/api/duel', { type: 'training', id: `user:${me.id}` }, { expect: 200 }));
assert.equal(data.result.training, true); assert.equal(data.result.ratingChange, 0); assert.equal(data.state.wins + data.state.losses, 0);
({ data } = await call('/api/duel', { type: 'training', id: 'boss:grottoWarden' }, { expect: 200 }));
assert.equal(data.result.opponent, '머쉬맘');
await call('/api/duel', { type: 'training', id: 'boss:minnow' }, { expect: 400 });
await call('/api/duel', { type: 'training', id: '0' }, { expect: 400 });
// 전체 채팅: 보내기·커서로 새 줄만 받기·길이·도배 제한.
await call('/api/chat', { text: '' }, { expect: 400 });
({ data } = await call('/api/chat', { text: '  안녕하세요   e2e  ' }, { expect: 200 }));
assert.equal(data.row.text, '안녕하세요 e2e'); assert.equal(data.row.self, true); const chatId = data.row.id;
await call('/api/chat', { text: '너무 빨리' }, { expect: 429 });
// v3.39 소식 채널: 읽기만 됩니다.
({ data } = await call('/api/chat?channel=news', undefined, { expect: 200 })); assert.ok(Array.isArray(data.rows), 'news rows');
await call('/api/chat', { channel: 'news', text: '소식 쓰기' }, { expect: 403 });
await call('/api/chat', { text: 'x'.repeat(121) }, { expect: 400 });
({ data } = await call('/api/chat', undefined, { expect: 200 }));
assert.ok(data.rows.some(r => r.id === chatId && r.self), 'own chat line listed');
({ data } = await call(`/api/chat?after=${chatId}`, undefined, { expect: 200 }));
assert.equal(data.rows.length, 0, 'cursor returns only newer lines');
await call('/api/chat?channel=nope', undefined, { expect: 400 });
// v25.13 계정 금고: 빈 금고 조회, 부족·잘못된 요청 거부.
({ data } = await call('/api/vault', undefined, { expect: 200 }));
assert.ok(data.pearls === 0 && data.essence === 0 && data.pearlOutLeft === 30, 'empty vault');
await call('/api/vault', { action: 'deposit', kind: 'pearls', amount: 1 }, { expect: 400 });
await call('/api/vault', { action: 'withdraw', kind: 'essence', amount: 1 }, { expect: 400 });
await call('/api/vault', { action: 'deposit', kind: 'gold', amount: 1 }, { expect: 400 });
// v25.11 공유 길드: 무소속 상태의 정보·제한. 창설·가입은 골드와 두 계정이 필요해 별도 스크립트로 확인합니다.
// v27.43 제단: 정보, 잘못된 요청, 재화 부족, 신 없음, 자리 주인 아님.
({ data } = await call('/api/altar', undefined, { expect: 200 }));
assert.ok(data.gauges.length === 8 && data.gauges.some(g => g.id === 'god') && data.gauges.some(g => g.id === 'horntail') && Array.isArray(data.raids) && data.raids.length === 0 && data.gauges.some(g => g.id === 'nuri') && /^\d{4}-W\d{2}$/.test(data.week) && data.me.points === 0, 'altar info');
await call('/api/altar', { action: 'offer', gold: 0, gauge: 'gold' }, { expect: 400 });
await call('/api/altar', { action: 'offer', pearls: 1, gauge: 'nope' }, { expect: 400 });
({ data } = await call('/api/altar', { action: 'offer', pearls: 99999, gauge: 'gold' }, { expect: 400 })); assert.match(data.error, /세계석이 부족/);
await call('/api/altar', { action: 'challenge' }, { expect: 400 });
await call('/api/altar', { action: 'harvest' }, { expect: 400 });
({ data } = await call('/api/guild', undefined, { expect: 200 }));
assert.equal(data.guild, null); assert.ok(Array.isArray(data.board) && /^\d{4}-W\d{2}$/.test(data.week), 'guild info has week and board');
await call('/api/guild', { action: 'join', code: 'NOPE' }, { expect: 400 });
await call('/api/guild', { action: 'create', name: '테스트길드' }, { expect: 400 }); // 골드 부족
await call('/api/guild', { action: 'claim', goal: 'catches' }, { expect: 400 });
await call('/api/chat?channel=guild', undefined, { expect: 403 });
await call('/api/chat', { channel: 'guild', text: '안녕' }, { expect: 403 });
// 주간 심연 기록판: 로그인만 되면 빈 판이라도 읽힙니다.
({ data } = await call('/api/ranking?board=abyss', undefined, { expect: 200 }));
assert.ok(/^\d{4}-W\d{2}$/.test(data.week) && Array.isArray(data.rows), 'abyss board has a week key');
// 일일 목표판이 동기화 때 깔립니다.
({ data } = await call('/api/game', { type: 'sync' }, { expect: 200 }));
assert.ok(data.state.daily && data.state.daily.goals.length === 4 && data.state.weekly.goals.length === 5, 'daily/weekly goals present');
await call('/api/auth', { action: 'logout' }, { expect: 200 });
jar.clear(); cookie = '';
await call('/api/game', { type: 'sync' }, { expect: 401 });
await call('/api/auth', { action: 'signup', username: user, password: pw, name: '테스터까미' }, { expect: 409 });
await call('/api/auth', { action: 'login', username: user, password: 'wrong-password' }, { expect: 401 });
await call('/api/auth', { action: 'login', username: user.toUpperCase(), password: pw }, { expect: 200 });
({ data } = await call('/api/game', { type: 'sync' }, { expect: 200 }));
assert.equal(data.state.running, true, 'same save after re-login');
// 캐릭터 슬롯: 환생 전엔 2번이 잠겨 있고, 계정 합계는 세이브에 캐시됩니다.
assert.equal(data.state.account?.slot, 1); assert.equal(data.state.account.slots.length, 1, 'own slot summary cached');
assert.equal((await call('/api/auth')).data.slot, 1);
await call('/api/auth', { action: 'slot', slot: 2 }, { expect: 403 });
await call('/api/auth', { action: 'slot', slot: 9 }, { expect: 400 });
// 환생 1회를 흉내: 서버 저장 상태를 직접 바꿀 수 없으니 1번 캐릭터의 환생을 단축 치트 없이 확인하는 대신, 잠김 메시지가 조건을 알려주는지 봅니다.
({ data } = await call('/api/auth', { action: 'slot', slot: 2 }, { expect: 403 }));
assert.match(data.error, /환생 1회/);
console.log('e2e api checks passed');
