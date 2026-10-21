// 게임 글(ts · tsx · md · mjs · json · css)에 쓰는 한글 음절을 모아 출력합니다. 사용: node tools/fonts/syllables.mjs > tools/fonts/work/syllables.txt
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const SKIP = ['node_modules', '.next', '.git', 'public', '.data', '.venv', 'work'];
const syl = new Set();
const walk = dir => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (SKIP.includes(f)) continue; const st = statSync(p); if (st.isDirectory()) walk(p); else if (/\.(ts|tsx|md|mjs|json|css)$/.test(f)) for (const ch of readFileSync(p, 'utf8')) { const o = ch.codePointAt(0); if (o >= 0xAC00 && o <= 0xD7A3) syl.add(ch); } } };
walk('.');
process.stdout.write([...syl].sort().join(''));
