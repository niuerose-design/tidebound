// 스킬 아이콘 목록과 체크리스트를 다시 만듭니다. 사용: node scripts/art-manifest.mjs
// 1) public/art/skills/*.png|svg 중 실제 스킬 id와 맞는 파일만 game/data/art-manifest.ts 에 적습니다(화면은 이 목록만 요청).
// v3.369 모든 폴더에서 .svg 도 받습니다(같은 id에 png·webp·svg가 겹치면 png > webp > svg). 코프룰루 그림은 tools/art-svg/make.mjs 가 만듭니다.
// 2) docs/art/skill-icons.md 에 직업별 스킬 id·이름·있음/없음 체크리스트를 씁니다.
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { loadGame } from './lib/game-modules.mjs';

const { load } = loadGame();
const { SKILLS } = await load('game/data/skills.js');
const { JOBS, LINEAGES, lineageOf } = await load('game/data/classes.js');
const dir = 'public/art/skills';
const ids = new Set(SKILLS.map(s => s.id));
const RANK = { png: 0, webp: 1, svg: 2 };
// 폴더를 훑어 id → 확장자. 같은 id에 여러 형식이 있으면 png > webp > svg.
const scan = (folder, valid, exts = 'png|webp|svg') => {
    const out = {};
    if (!existsSync(folder)) return out;
    for (const f of readdirSync(folder).sort()) { const m = f.match(new RegExp(`^(.+)\\.(${exts})$`)); if (m && valid.has(m[1]) && (!(m[1] in out) || RANK[m[2]] < RANK[out[m[1]]])) out[m[1]] = m[2]; }
    return out;
};
const skillArt = scan(dir, ids, 'png|svg');
const have = Object.keys(skillArt).sort();
const stray = existsSync(dir) ? readdirSync(dir).filter(f => /\.(png|svg)$/.test(f) && !ids.has(f.replace(/\.(png|svg)$/, ''))) : [];

// v27.57 몬스터(public/art/monsters)·직업 계보(public/art/jobs) 그림도 목록으로.
const { MONSTERS } = await load('game/data/world.js');
const { ONYX_ITEMS } = await load('game/data/onyx.js');
// v3.216 스토리 삽화(public/art/story): 장 배너는 chapter-{0~18}, 장면은 장면 id.
const { STORY, STORY_CHAPTERS } = await load('game/data/story.js');
const storyArt = scan('public/art/story', new Set([...STORY.map(x => x.id), ...STORY_CHAPTERS.map((_, i) => `chapter-${i}`)]));
const monsterArt = scan('public/art/monsters', new Set(MONSTERS.map(f => f.id))), jobArt = scan('public/art/jobs', new Set(LINEAGES.map(l => l.id))), onyxArt = scan('public/art/onyx', new Set([...ONYX_ITEMS.map(d => d.id), 'onyxGrimoire']));
// v3.388 장비 그림(public/art/items): {slot}-{rarity} · rod-{style}-{rarity}. tools/item-art/render.py 가 만듭니다.
const ITEM_KEYS = new Set(['coat', 'cape', 'charm'].flatMap(s => [0, 1, 2, 3, 4, 5, 6].map(r => `${s}-${r}`)).concat(['physical', 'magic', 'balanced'].flatMap(st => [0, 1, 2, 3, 4, 5, 6].map(r => `rod-${st}-${r}`))));
const itemArt = scan('public/art/items', ITEM_KEYS);
writeFileSync('game/data/art-manifest.ts', `// 자동 생성 파일: node scripts/art-manifest.mjs 가 public/art/{skills,monsters,jobs,onyx,story} 를 훑어 다시 씁니다. 손으로 고치지 마세요.
/** 아이콘 이미지가 있는 스킬 id → 확장자(png · svg). 없는 스킬은 기본 아이콘을 씁니다(없는 파일을 요청하지 않음). */
export const SKILL_ART: Readonly<Record<string, 'png' | 'svg'>> = ${JSON.stringify(skillArt)};
/** 그림이 있는 몬스터 id → 확장자. 없는 몬스터는 실루엣(없는 파일을 요청하지 않음). */
export const MONSTER_ART: Readonly<Record<string, 'png' | 'webp' | 'svg'>> = ${JSON.stringify(monsterArt)};
/** 그림이 있는 직업 계보 id → 확장자. 없으면 계열 아이콘. */
export const JOB_ART: Readonly<Record<string, 'png' | 'webp' | 'svg'>> = ${JSON.stringify(jobArt)};
/** v3.14 그림이 있는 칠흑 장신구(보스 id) → 확장자. 없으면 SVG 그림. */
export const ONYX_ART: Readonly<Record<string, 'png' | 'webp' | 'svg'>> = ${JSON.stringify(onyxArt)};
/** v3.388 장비 그림({slot}-{rarity} · rod-{style}-{rarity}) → 확장자. 없으면 부위 아이콘. */
export const ITEM_ART: Readonly<Record<string, 'png' | 'webp' | 'svg'>> = ${JSON.stringify(itemArt)};
/** v3.216 그림이 있는 스토리 삽화(장 배너 chapter-N · 장면 id) → 확장자. 없으면 장 배너는 SVG, 장면은 그림 없이. */
export const STORY_ART: Readonly<Record<string, 'png' | 'webp' | 'svg'>> = ${JSON.stringify(storyArt)};
`);

const haveSet = new Set(have);
const groups = new Map();
for (const s of SKILLS) {
    const job = JOBS.find(j => j.id === s.job);
    const lineage = job ? lineageOf(job) : 'common';
    const key = lineage;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ s, job });
}
let md = `# 스킬 아이콘 체크리스트 (${have.length} / ${SKILLS.length})

\`public/art/skills/{스킬 id}.png\` 로 넣고 \`node scripts/art-manifest.mjs\` 를 실행하면 화면에 나옵니다. 원작 도트 아이콘(32×32 등)은 확대해도 흐려지지 않게 그립니다.
이 문서는 같은 스크립트가 다시 씁니다.

`;
for (const [lineage, rows] of groups) {
    const name = LINEAGES.find(l => l.id === lineage)?.name || (lineage === 'common' ? '공용' : lineage);
    md += `## ${name}\n\n| 있음 | 스킬 id | 이름 | 직업 | 종류 |\n|---|---|---|---|---|\n`;
    rows.sort((a, b) => (a.job?.tier ?? 0) - (b.job?.tier ?? 0));
    for (const { s, job } of rows) md += `| ${haveSet.has(s.id) ? '✅' : '⬜'} | \`${s.id}\` | ${s.name} | ${job?.name || '공용'} | ${s.type === 'active' ? '액티브' : '패시브'} |\n`;
    md += '\n';
}
writeFileSync('docs/art/skill-icons.md', md);
console.log(`스토리 삽화 ${Object.keys(storyArt).length} / ${STORY.length + STORY_CHAPTERS.length} · 몬스터 그림 ${Object.keys(monsterArt).length} / ${MONSTERS.length} · 직업 그림 ${Object.keys(jobArt).length} / ${LINEAGES.length} · 스킬 아이콘 ${have.length} / ${SKILLS.length}${stray.length ? ` · 맞는 스킬이 없는 파일: ${stray.join(', ')}` : ''}`);
