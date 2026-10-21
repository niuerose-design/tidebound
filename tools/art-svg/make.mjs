// 코프룰루 구역 SVG 그림을 public/art/* 에 씁니다. 사용: node tools/art-svg/make.mjs [--out <폴더>] [monsters|skills|jobs|onyx ...]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MONSTERS, renderMonster } from './monsters.mjs';

const args = process.argv.slice(2);
const oi = args.indexOf('--out');
const out = oi >= 0 ? args[oi + 1] : 'public/art';
const only = args.filter((a, i) => !a.startsWith('--') && i !== oi + 1);
const want = (k) => !only.length || only.includes(k);
const write = (folder, id, body) => { mkdirSync(join(out, folder), { recursive: true }); writeFileSync(join(out, folder, `${id}.svg`), body + '\n'); };
const counts = {};
if (want('monsters')) { for (const m of MONSTERS) write('monsters', m.id, renderMonster(m)); counts.monsters = MONSTERS.length; }
try {
    if (want('skills')) { const { SKILLS, renderSkill } = await import('./skills.mjs'); for (const s of SKILLS) write('skills', s.id, renderSkill(s)); counts.skills = SKILLS.length; }
    if (want('jobs')) { const { JOBS, renderJob } = await import('./jobs.mjs'); for (const j of JOBS) write('jobs', j.id, renderJob(j)); counts.jobs = JOBS.length; }
    if (want('onyx')) { const { ONYX, renderOnyx } = await import('./onyx.mjs'); for (const o of ONYX) write('onyx', o.id, renderOnyx(o)); counts.onyx = ONYX.length; }
} catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
console.log(Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · '), '→', out);
