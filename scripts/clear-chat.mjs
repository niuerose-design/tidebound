// 채팅 기록 전부 삭제(베타 테스트 전 정리). 길드 채팅까지 모두 지우고 번호는 이어집니다.
// 사용: DATABASE_URL='postgres://...' node scripts/clear-chat.mjs        (Neon · 배포 DB)
//       TIDEBOUND_DEV_DB=.data/dev-db.json node scripts/clear-chat.mjs   (로컬 파일 DB)
import fs from 'node:fs/promises';
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (url) {
    const endpoint = `https://${new URL(url.replace(/^postgres(ql)?:/, 'https:')).hostname.replace(/^[^.]+\./, 'api.')}/sql`;
    const q = async (query, params = []) => {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': url, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'false' }, body: JSON.stringify({ query, params }) });
        if (!res.ok) throw new Error(`Database error ${res.status}: ${(await res.text()).slice(0, 200)}`);
        return res.json();
    };
    const before = (await q('SELECT COUNT(*)::int AS n FROM chat')).rows[0]?.n ?? 0;
    await q('DELETE FROM chat');
    console.log(`채팅 ${before}줄 삭제 완료 (Neon).`);
} else {
    const path = process.env.TIDEBOUND_DEV_DB || '.data/dev-db.json';
    const db = JSON.parse(await fs.readFile(path, 'utf8'));
    const before = (db.chat || []).length; db.chat = [];
    await fs.writeFile(path, JSON.stringify(db));
    console.log(`채팅 ${before}줄 삭제 완료 (${path}).`);
}
