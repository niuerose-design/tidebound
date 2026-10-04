// 운영 데이터 초기화. 두 가지 옵션 중 하나를 고릅니다.
//   chat : 채팅 기록만 전부 삭제(길드 채팅 포함). 계정·세이브는 그대로입니다.
//   all  : 계정까지 전부 초기화. 계정·로그인 세션·세이브·슬롯·랭킹·길드·지갑(세계석·정수)·채팅을 모두 지웁니다.
//          되돌릴 수 없으므로 --yes 를 붙여야 실제로 지웁니다(없으면 지울 줄 수만 보여 줍니다).
// 사용: DATABASE_URL='postgres://...' node scripts/reset-data.mjs chat          (Neon · 배포 DB)
//       DATABASE_URL='postgres://...' node scripts/reset-data.mjs all           (미리 보기)
//       DATABASE_URL='postgres://...' node scripts/reset-data.mjs all --yes     (실제 삭제)
//       TIDEBOUND_DEV_DB=.data/dev-db.json node scripts/reset-data.mjs all --yes (로컬 파일 DB)
// 채팅 번호는 초기화 뒤에도 이어집니다(접속 중인 화면이 새 채팅을 놓치지 않도록).
import fs from 'node:fs/promises';

// [Postgres 테이블, 로컬 파일 DB의 키, 표시 이름] — game/server/db.ts 의 SCHEMA · FileDb 와 맞춥니다.
// 세션을 먼저 지워 접속을 끊고, 계정은 마지막에 지웁니다.
const TABLES = [
    ['sessions', 'sessions', '로그인 세션'],
    ['chat', 'chat', '채팅'],
    ['players', 'players', '세이브'],
    ['slots', 'slots', '캐릭터 슬롯'],
    ['rankings', 'rankings', '랭킹'],
    ['guild_members', 'guildMembers', '길드원'],
    ['guilds', 'guilds', '길드'],
    ['wallets', 'wallets', '지갑'],
    ['accounts', 'accounts', '계정'],
];
const MODES = { chat: ['chat'], all: TABLES.map(t => t[0]) };

const args = process.argv.slice(2);
const mode = args.find(a => !a.startsWith('-'));
const yes = args.includes('--yes') || args.includes('-y');
if (!mode || !MODES[mode]) {
    console.error('사용: node scripts/reset-data.mjs <chat|all> [--yes]\n  chat  채팅 기록만 삭제\n  all   계정 포함 전부 초기화 (--yes 필요)');
    process.exit(1);
}
const targets = TABLES.filter(t => MODES[mode].includes(t[0]));
// 채팅만 지울 때는 바로 실행하고, 전부 지울 때는 --yes 가 있어야 실행합니다.
const execute = mode === 'chat' || yes;
const report = (where, counts) => {
    for (const [, , label, n] of counts) console.log(`  ${label}: ${n}${execute ? ' 삭제' : ''}`);
    console.log(execute
        ? `${mode === 'chat' ? '채팅 초기화' : '전체 초기화(계정 포함)'} 완료 (${where}).`
        : `미리 보기입니다. 실제로 지우려면 --yes 를 붙여 다시 실행하세요 (${where}).`);
};

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (url) {
    const endpoint = `https://${new URL(url.replace(/^postgres(ql)?:/, 'https:')).hostname.replace(/^[^.]+\./, 'api.')}/sql`;
    const q = async (query, params = []) => {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': url, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'false' }, body: JSON.stringify({ query, params }) });
        if (!res.ok) throw new Error(`Database error ${res.status}: ${(await res.text()).slice(0, 200)}`);
        return res.json();
    };
    const counts = [];
    for (const [table, key, label] of targets) {
        // 아직 만들어지지 않은 테이블은 건너뜁니다(테이블 이름은 위 고정 목록에서만 옵니다).
        const exists = (await q('SELECT to_regclass($1) AS t', [`public.${table}`])).rows[0]?.t;
        if (!exists) { counts.push([table, key, label, 0]); continue; }
        const n = Number((await q(`SELECT COUNT(*)::int AS n FROM ${table}`)).rows[0]?.n ?? 0);
        if (execute) await q(`DELETE FROM ${table}`);
        counts.push([table, key, label, n]);
    }
    report('Neon', counts);
} else {
    const path = process.env.TIDEBOUND_DEV_DB || '.data/dev-db.json';
    const db = JSON.parse(await fs.readFile(path, 'utf8'));
    const counts = [];
    for (const [table, key, label] of targets) {
        const cur = db[key];
        counts.push([table, key, label, Array.isArray(cur) ? cur.length : Object.keys(cur || {}).length]);
        if (execute) db[key] = key === 'chat' ? [] : {};
    }
    if (execute) await fs.writeFile(path, JSON.stringify(db));
    report(path, counts);
}
