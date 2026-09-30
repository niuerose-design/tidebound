// game/의 TypeScript(server/ 제외)를 임시 폴더에 ESM으로 변환해 Node 스크립트·테스트에서 불러옵니다.
import ts from 'typescript';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

let cache;
/** load('systems/engine') · load('game/systems/engine.js') 모두 허용합니다. */
export function loadGame() {
    if (cache) return cache;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tidebound-game-'));
    for (const file of fs.readdirSync('game', { recursive: true })) {
        if (!file.endsWith('.ts') || file.startsWith('server')) continue;
        const js = ts.transpileModule(fs.readFileSync(path.join('game', file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
            .replace(/from (['"])(\.\.?\/[^'"]+)\1/g, (_, q, p) => `from ${q}${p}.js${q}`);
        const out = path.join(dir, file.replace(/\.ts$/, '.js'));
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, js);
    }
    fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
    process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
    const load = p => import(pathToFileURL(path.join(dir, p.replace(/^game\//, '').replace(/\.js$/, '') + '.js')).href);
    return cache = { dir, load };
}
