// 메이플 몬스터 그림·스킬 아이콘을 maplestory.io에서 이름으로 찾아 public/art 에 저장하고 목록(art-manifest)을 다시 만듭니다.
// 사용: node scripts/fetch-maple-art.mjs [--mobs] [--skills] [--force]
//   기본은 몬스터만. --skills 를 주면 스킬 아이콘도(이름이 원작과 같은 스킬만). 이미 있는 파일은 건너뜁니다(--force 로 다시 받기).
//   MAPLE_API 로 주소를 바꿀 수 있습니다(기본 https://maplestory.io/api/KMS/latest).
// 이름이 원작과 다르거나 여러 개가 걸리는 몬스터는 아래 MOB_IDS 에 원작 몬스터 번호를 직접 적으세요.
// 2차 창작(비영리) 용도로 쓰는 원작 그림입니다. 공개 배포 정책이 바뀌면 public/art 를 비우면 실루엣으로 돌아갑니다.
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadGame } from './lib/game-modules.mjs';

const API = (process.env.MAPLE_API || 'https://maplestory.io/api/KMS/latest').replace(/\/$/, '');
const args = process.argv.slice(2), force = args.includes('--force'), doSkills = args.includes('--skills'), doMobs = args.includes('--mobs') || !doSkills;
/** 게임 몬스터 id → 원작 몬스터 번호(이름 검색으로 못 찾거나 잘못 찾을 때만). */
const MOB_IDS = {};
/** 게임 몬스터 id → 원작에서 찾을 이름(게임 이름과 다를 때만). 숙련의 까미는 원작이 없어 건너뜁니다. */
const MOB_NAMES = { masteryMimic: null };

const { load } = loadGame();
const { FISH } = await load('game/data/world.js');
const { SKILLS } = await load('game/data/skills.js');

async function json(path) {
    const res = await fetch(`${API}${path}`);
    if (!res.ok) throw new Error(`${res.status} ${API}${path}`);
    return res.json();
}
async function save(url, file) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) throw new Error(`이미지가 아님(${type}) ${url}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}
/** 이름 검색: 정확히 같은 이름 중 번호가 가장 작은 것(원작의 기본 개체). */
async function findId(kind, name) {
    const list = await json(`/${kind}?searchFor=${encodeURIComponent(name)}&count=200`);
    const rows = (Array.isArray(list) ? list : list.items || []).filter(x => (x.name || '').trim() === name);
    return rows.length ? rows.map(x => Number(x.id)).sort((a, b) => a - b)[0] : null;
}

const report = { saved: [], skipped: [], missing: [], failed: [] };
if (doMobs) {
    mkdirSync('public/art/fish', { recursive: true });
    for (const f of FISH) {
        const file = `public/art/fish/${f.id}.png`;
        if (!force && (existsSync(file) || existsSync(`public/art/fish/${f.id}.webp`))) { report.skipped.push(f.id); continue; }
        const name = f.id in MOB_NAMES ? MOB_NAMES[f.id] : f.name;
        if (!name) { report.skipped.push(f.id); continue; }
        try {
            const id = MOB_IDS[f.id] ?? await findId('mob', name);
            if (!id) { report.missing.push(`${f.id}(${name})`); continue; }
            await save(`${API}/mob/${id}/render/stand`, file);
            report.saved.push(`${f.id}=${name}#${id}`);
        } catch (e) { report.failed.push(`${f.id}: ${e.message}`); }
    }
}
if (doSkills) {
    mkdirSync('public/art/skills', { recursive: true });
    for (const s of SKILLS) {
        const file = `public/art/skills/${s.id}.png`;
        if (!force && existsSync(file)) { report.skipped.push(s.id); continue; }
        try {
            const id = await findId('skill', s.name);
            if (!id) { report.missing.push(`${s.id}(${s.name})`); continue; }
            await save(`${API}/skill/${id}/icon`, file);
            report.saved.push(`${s.id}=${s.name}#${id}`);
        } catch (e) { report.failed.push(`${s.id}: ${e.message}`); }
    }
}
console.log(`저장 ${report.saved.length} · 건너뜀 ${report.skipped.length} · 못 찾음 ${report.missing.length} · 실패 ${report.failed.length}`);
if (report.missing.length) console.log('못 찾음(MOB_IDS/MOB_NAMES 로 지정):', report.missing.join(', '));
if (report.failed.length) console.log('실패:', report.failed.slice(0, 10).join(' | '));
execFileSync(process.execPath, ['scripts/art-manifest.mjs'], { stdio: 'inherit' });
