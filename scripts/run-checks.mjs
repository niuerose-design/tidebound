// 점검 스크립트(scripts/check-*.mjs)를 CPU 수만큼 나눠 동시에 돌리고 통과·실패·걸린 시간을 요약합니다.
// 사용: npm run checks            모든 점검(오래 걸리는 시뮬레이션 포함, 수 분~십여 분)
//       npm run checks -- --fast  오래 걸리는 시뮬레이션(SLOW)은 건너뜀
//       npm run checks -- balance expedition   이름 일부로 골라서
// 실패한 점검은 마지막 출력 몇 줄을 함께 보여 주고, 하나라도 실패하면 종료 코드 1입니다.
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { cpus } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
/** 수 분씩 걸리는 장시간 시뮬레이션. --fast에서 뺍니다. */
const SLOW = new Set(['check-active-routing.mjs', 'check-recovery.mjs', 'check-balance.mjs', 'check-progression-pace.mjs', 'check-roles.mjs']);
const args = process.argv.slice(2), fast = args.includes('--fast'), picks = args.filter(a => !a.startsWith('--'));
const all = readdirSync(dir).filter(f => /^check-.*\.mjs$/.test(f)).sort();
const files = all.filter(f => (!fast || !SLOW.has(f)) && (!picks.length || picks.some(p => f.includes(p))));
if (!files.length) { console.log('실행할 점검이 없습니다.'); process.exit(1); }

const run = file => new Promise(resolve => {
    const start = Date.now(), out = [];
    const child = spawn(process.execPath, [join(dir, file)], { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', d => out.push(String(d)));
    child.stderr.on('data', d => out.push(String(d)));
    child.on('close', code => resolve({ file, code, seconds: Math.round((Date.now() - start) / 1000), tail: out.join('').trim().split('\n').filter(l => !/^\s+at |node:internal|triggerUncaught/.test(l)).slice(-8).join('\n') }));
});
const queue = [...files], results = [], workers = Math.max(1, Math.min(cpus().length, files.length));
console.log(`점검 ${files.length}개 · 동시 ${workers}개${fast ? ' · 빠른 모드' : ''}`);
await Promise.all(Array.from({ length: workers }, async () => {
    for (let f = queue.shift(); f; f = queue.shift()) { const r = await run(f); results.push(r); console.log(`${r.code === 0 ? 'ok  ' : 'FAIL'} ${r.file} (${r.seconds}s)`); }
}));
const failed = results.filter(r => r.code !== 0);
for (const r of failed) console.log(`\n── ${r.file} (종료 코드 ${r.code})\n${r.tail}`);
console.log(`\n${results.length - failed.length}/${results.length} 통과`);
process.exit(failed.length ? 1 : 0);
