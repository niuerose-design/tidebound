// 운영: 특정 유저의 이번 생을 처음 상태로 되돌립니다(환생 횟수·세계석·연구·유물·도감은 그대로, 레벨 조건 없음).
// 기본은 미리 보기이고 --yes 를 붙여야 실제로 저장합니다. 세이브 버전 검사로 접속 중인 저장과 충돌하면 저장하지 않습니다.
// 대상은 로그인 아이디(계정 아이디)나 --name 모험가 이름(채팅·랭킹에 보이는 이름)으로 고릅니다. 이름이 여럿 겹치면 후보 목록만 보여 줍니다.
// 사용: DATABASE_URL='postgres://...' node scripts/reset-life.mjs <아이디> [--slot 2] [--yes]   (Neon · 배포 DB)
//       DATABASE_URL='postgres://...' node scripts/reset-life.mjs --name <모험가 이름> [--yes]
//       TIDEBOUND_DEV_DB=.data/dev-db.json node scripts/reset-life.mjs <아이디> [--slot 2] [--yes]  (로컬 파일 DB)
import fs from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { loadGame } from './lib/game-modules.mjs';

const args = process.argv.slice(2);
const nameArg = args.indexOf('--name');
const playerName = nameArg >= 0 ? args[nameArg + 1]?.trim() : undefined;
const username = args.find((a, i) => !a.startsWith('-') && args[i - 1] !== '--slot' && args[i - 1] !== '--name')?.trim().toLowerCase();
const slotArg = args.indexOf('--slot');
const slot = slotArg >= 0 ? Number(args[slotArg + 1]) : 1;
const yes = args.includes('--yes') || args.includes('-y');
if ((!username && !playerName) || !Number.isInteger(slot) || slot < 1 || slot > 3) {
    console.error('사용: node scripts/reset-life.mjs <아이디> [--slot 1~3] [--yes]\n      node scripts/reset-life.mjs --name <모험가 이름> [--yes]');
    process.exit(1);
}
const PACK = 'gz:';
const unpack = stored => stored.startsWith(PACK) ? gunzipSync(Buffer.from(stored.slice(PACK.length), 'base64')).toString('utf8') : stored;
const pack = json => PACK + gzipSync(Buffer.from(json, 'utf8'), { level: 6 }).toString('base64');
const playerId = (account, n) => n > 1 ? `${account}#${n}` : account;

const { load } = loadGame();
const { migrateState } = await load('systems/migrations');
const { restartLife } = await load('systems/actions/lifecycle');
const { jobById } = await load('data/classes');
const summary = s => `${s.name} · Lv.${s.level} ${jobById(s.job)?.name || s.job} · 환생 ${s.rebirths}회 · 세계석 ${s.pearls} · 골드 ${Math.floor(s.gold).toLocaleString()} · 장비 ${s.inventory.length}개${s.dungeon ? ' · 던전 진행 중' : ''}`;

/** 모험가 이름으로 찾기: 모든 세이브의 이름을 읽어 정확히 같은 것만 고릅니다. 하나면 그 세이브, 여럿이면 후보를 출력하고 끝냅니다. */
function pickByName(rows, usernameOf) {
    const hits = rows.map(r => { try { const st = JSON.parse(unpack(r.state)); return st.name === playerName ? { ...r, name: st.name, level: st.level, rebirths: st.rebirths } : null; } catch { return null; } }).filter(Boolean);
    if (!hits.length) { console.error(`모험가 이름 '${playerName}'을(를) 찾지 못했습니다(대소문자·띄어쓰기까지 같아야 합니다).`); process.exit(1); }
    if (hits.length > 1) {
        console.error(`'${playerName}' 이름이 ${hits.length}개 있습니다. 아래 아이디와 슬롯으로 다시 실행하세요:`);
        for (const h of hits) { const [acc, n] = h.id.split('#'); console.error(`  ${usernameOf(acc) || acc} --slot ${n || 1}  (Lv.${h.level} · 환생 ${h.rebirths}회)`); }
        process.exit(1);
    }
    const [acc, n] = hits[0].id.split('#');
    return { id: hits[0].id, row: hits[0], label: `${usernameOf(acc) || acc} (${n || 1}번 슬롯 · 이름 ${playerName})` };
}
function apply(raw) {
    const now = Date.now();
    const s = migrateState(JSON.parse(unpack(raw)), now);
    const before = summary(s);
    restartLife(s, now);
    return { before, after: summary(s), json: JSON.stringify(s) };
}

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (url) {
    const endpoint = `https://${new URL(url.replace(/^postgres(ql)?:/, 'https:')).hostname.replace(/^[^.]+\./, 'api.')}/sql`;
    const q = async (query, params = []) => {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': url, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'false' }, body: JSON.stringify({ query, params }) });
        if (!res.ok) throw new Error(`Database error ${res.status}: ${(await res.text()).slice(0, 200)}`);
        return res.json();
    };
    let id, row, label;
    if (playerName) {
        const accounts = new Map((await q('SELECT id, username FROM accounts')).rows.map(a => [a.id, a.username]));
        ({ id, row, label } = pickByName((await q('SELECT id, state, revision FROM players')).rows, acc => accounts.get(acc)));
    } else {
        const account = (await q('SELECT id FROM accounts WHERE username=$1', [username])).rows[0]?.id;
        if (!account) { console.error(`아이디 ${username}을(를) 찾지 못했습니다.`); process.exit(1); }
        id = playerId(account, slot); label = `${username} (${slot}번 슬롯)`;
        row = (await q('SELECT state, revision FROM players WHERE id=$1', [id])).rows[0];
        if (!row) { console.error(`${username}의 ${slot}번 슬롯 세이브가 없습니다.`); process.exit(1); }
    }
    const r = apply(row.state);
    console.log(`대상: ${label}\n  전: ${r.before}\n  후: ${r.after}`);
    if (!yes) { console.log('미리 보기입니다. 실제로 저장하려면 --yes 를 붙여 다시 실행하세요.'); process.exit(0); }
    const res = await q('UPDATE players SET state=$1, revision=revision+1, updated_at=$2 WHERE id=$3 AND revision=$4', [pack(r.json), Date.now(), id, Number(row.revision)]);
    if (Number(res.rowCount) !== 1) { console.error('그사이 게임이 저장되어 덮어쓰지 않았습니다. 잠시 뒤 다시 실행하세요.'); process.exit(1); }
    console.log('저장했습니다. 유저 화면은 다음 동기화(최대 30초) 때 바뀝니다.');
} else {
    const path = process.env.TIDEBOUND_DEV_DB || '.data/dev-db.json';
    const db = JSON.parse(await fs.readFile(path, 'utf8'));
    let id, row, label;
    if (playerName) {
        const names = new Map(Object.values(db.accounts || {}).map(a => [a.id, a.username]));
        ({ id, label } = pickByName(Object.entries(db.players || {}).map(([pid, p]) => ({ id: pid, state: p.state })), acc => names.get(acc)));
        row = db.players[id];
    } else {
        const account = Object.values(db.accounts || {}).find(a => a.username === username)?.id;
        if (!account) { console.error(`아이디 ${username}을(를) 찾지 못했습니다.`); process.exit(1); }
        id = playerId(account, slot); row = db.players?.[id]; label = `${username} (${slot}번 슬롯)`;
        if (!row) { console.error(`${username}의 ${slot}번 슬롯 세이브가 없습니다.`); process.exit(1); }
    }
    const r = apply(row.state);
    console.log(`대상: ${label}\n  전: ${r.before}\n  후: ${r.after}`);
    if (!yes) { console.log('미리 보기입니다. 실제로 저장하려면 --yes 를 붙여 다시 실행하세요.'); process.exit(0); }
    db.players[id] = { ...row, state: row.state.startsWith(PACK) ? pack(r.json) : r.json, revision: (row.revision || 0) + 1, updated_at: Date.now() };
    await fs.writeFile(path, JSON.stringify(db));
    console.log(`저장했습니다 (${path}).`);
}
