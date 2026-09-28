// 스크린샷용 중반 진행 세이브를 만들어 로컬 D1에 넣을 SQL을 출력합니다.
import { pathToFileURL } from 'node:url';
import { mkdtemp, readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
const out = await mkdtemp(join(tmpdir(), 'tidebound-seed-'));
async function compile(dir) { for (const e of await readdir(dir, { withFileTypes: true })) { if (e.name === 'server') continue; const src = join(dir, e.name), dst = join(out, src); if (e.isDirectory()) { await mkdir(dst, { recursive: true }); await compile(src); } else if (e.name.endsWith('.ts')) { const js = ts.transpileModule(await readFile(src, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/from (['"])(\.\.?\/[^'"]+)\1/g, (_, q, p) => `from ${q}${p}.js${q}`); await writeFile(dst.replace(/\.ts$/, '.js'), js); } } }
await mkdir(join(out, 'game')); await writeFile(join(out, 'package.json'), '{"type":"module"}'); await compile('game');
const load = p => import(pathToFileURL(join(out, p)).href);
const { newState, act, advance } = await load('game/systems/engine.js');
const { FISH } = await load('game/data/world.js');
let seed = 3; const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const now = Date.now() - 60_000;
const s = newState(now - 3 * 3600_000);
s.name = '스크린샷 선장'; s.level = 44; s.rebirths = 3; s.pearls = 180; s.gold = 250000; s.sp = 3; s.abyssBest = 12; s.abyssMilestones = [10];
s.attributes = { str: 30, dex: 28, int: 26, vit: 30, wis: 22, luk: 20 }; s.statPoints = 16;
s.permanent = { attack: 8, hp: 6, guard: 3, gold: 2, ap: 2 };
s.lifeBonus = 'tailwind';
for (const f of FISH.slice(0, 14)) s.book[f.id] = Math.floor(rng() * 700);
s.jobMastery = { fisher: 900, wanderer: 2600, harpoon: 400 }; s.unlockedJobs = ['fisher', 'wanderer', 'harpoon'];
s.job = 'wanderer';
for (let i = 0; i < 25; i++) { try { act(s, { type: 'gamble', id: ['rod', 'coat', 'charm'][i % 3] }, now, rng); } catch { } }
act(s, { type: 'stage', id: 'reef' }, now); act(s, { type: 'start' }, now);
advance(s, now, rng);
s.lastTick = now;
const json = JSON.stringify(s).replace(/'/g, "''");
console.log(`INSERT OR REPLACE INTO players (id,state,revision,updated_at) VALUES ('local-preview-player','${json}',1,${now});`);
