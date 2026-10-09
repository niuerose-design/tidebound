// v3.43 정보 비공개 검사(docs/concept.md 10장): 빌드한 화면 번들(.next/static)에 비밀이어야 할 글·키가 실렸는지 셉니다.
// v3.52 히든 직업·스킬·문 조건·드롭 확률을 서버 전용으로 옮겨 모두 0이 되었으므로 CI는 --strict로 돌립니다(다시 새면 실패).
// 쓰는 법: pnpm build 뒤 node scripts/check-secrets.mjs [--strict] [--list]
import fs from 'node:fs';
import path from 'node:path';
import { loadGame } from './lib/game-modules.mjs';

const strict = process.argv.includes('--strict'), list = process.argv.includes('--list');
const root = '.next/static';
if (!fs.existsSync(root)) { console.error('먼저 pnpm build를 하세요(.next/static 없음).'); process.exit(strict ? 1 : 0); }
const bundle = fs.readdirSync(root, { recursive: true }).filter(f => String(f).endsWith('.js')).map(f => fs.readFileSync(path.join(root, String(f)), 'utf8')).join('\n');

const { load } = loadGame();
// v3.44 비밀 직업은 서버 전용 표(game/secret)에 있으므로 엔진을 불러 서버와 같은 전체 표로 셉니다.
await load('systems/engine');
const { JOBS } = await load('data/classes'), { SKILLS } = await load('data/skills'), { unlockMet } = await load('secret/unlocks');
const { SERVER_ODDS } = await load('secret/odds');
// 압축기 숫자 모양: 0.5 → .5, 0.0014 → .0014(지수 표기로 바꾸는 값은 못 찾음 → 하한).
const n = x => String(x).replace(/^0\./, '.'), num = arr => arr.map(n).join(',');
// 비밀 직업: 히든 직업과 숨은 조건이 있는 직업. 이름·설명은 드러나기 전까지 비밀입니다(힌트는 공개, 10.2-4).
const secretJobs = JOBS.filter(j => j.hidden || unlockMet({}, j.id) !== null), secretIds = new Set(secretJobs.map(j => j.id));
const text = (s) => typeof s === 'string' && s.length >= 12 ? s : '';
// 스킬 설명과 일부 직업 이름(예: ‘아델 (2차)’)은 실행 중에 조합되어 글자 그대로는 번들에 없습니다. 이름 검사는 하한값입니다(설명 검사가 더 정확).
const named = (name) => `name:${JSON.stringify(name)}`;
const canaries = {
    // v3.52 공개 옵션 ‘유리 대포’(gear.ts glassCannon)와 이름이 같은 glassHarpooner는 뺍니다(다른 항목이라 비밀이 아님).
    '히든 직업 이름(하한)': secretJobs.filter(j => j.id !== 'glassHarpooner').map(j => named(j.name)),
    '히든 직업 설명': secretJobs.map(j => text(j.desc)).filter(Boolean),
    '히든 직업 스킬 이름(하한)': SKILLS.filter(sk => sk.job && secretIds.has(sk.job)).map(sk => named(sk.name)),
    // v3.47 이름이 실행 중에 덮어써져(메이플 이름) name:"…" 모양이 아니어도 잡도록 따옴표 이름 그대로 찾습니다.
    // 해킹 이름과 같은 adGuard(‘신원 조작’)는 공개 글이라 뺍니다(v3.199 폭류권은 은월이 공개로 가며 비밀이 아님).
    '히든 직업 스킬 이름(따옴표)': SKILLS.filter(sk => sk.job && secretIds.has(sk.job) && sk.id !== 'adGuard').map(sk => JSON.stringify(sk.name)),
    // v3.44 숨은 조건(옛 발견의 문, 압축된 모양). secret/unlocks.ts는 서버 전용이라 0이어야 합니다.
    '숨은 조건': ['deaths||0)>=10', 'deaths||0)>=30', 'wins||0)>=3', 'kills||0)>=500', 'gold||0)<100', 'bestStage||0)>=4'],
    // v3.52 드롭·확률 수치(서버 전용 game/secret/odds.ts). 압축기가 쓰는 모양(0.5 → .5, 쉼표 뒤 공백 없음)으로 표와 키:값을 찾습니다(하한).
    // 키 이름(dropChanceCap 등)은 공개 표의 getter로 남아 있어도 값이 없으므로 셈하지 않습니다.
    '드롭·확률 수치(하한)': [
        num(SERVER_ODDS.drop.rarity), num(SERVER_ODDS.appraisal), `rarity:1,chance:${n(SERVER_ODDS.appraisal[0])}`,
        `rarityPerTier:${n(SERVER_ODDS.drop.tideRarityPerTier)}`, `essenceChancePerTier:${n(SERVER_ODDS.drop.essenceChancePerTier)}`,
        ...Object.entries(SERVER_ODDS.variant.region).map(([region, row]) => `"${region}":{${Object.entries(row).map(([k, v]) => `${k}:${n(v)}`).join(',')}}`),
        // v3.55 몬스터 출현 가중치(옛 world.ts 모양 spawnWeight:.18).
        ...Object.values(SERVER_ODDS.spawn).filter(v => v > 0).map(v => `spawnWeight:${n(v)}`),
        // v3.75 희귀 · 꽝 옵션 확률.
        `rare:${n(SERVER_ODDS.affix.rare)},junk:${n(SERVER_ODDS.affix.junk)}`,
    ],
};
let leaked = 0;
for (const [label, items] of Object.entries(canaries)) {
    const found = [...new Set(items)].filter(x => bundle.includes(x));
    leaked += found.length;
    console.log(`${found.length ? '✗' : '✓'} ${label}: 번들에 ${found.length} / ${new Set(items).size}`);
    if (list) for (const x of found.slice(0, 20)) console.log(`    · ${x.slice(0, 60)}`);
}
console.log(leaked ? `비밀 ${leaked}개가 화면 번들에 있습니다${strict ? '' : ' (경고만, --strict면 실패)'}.` : '화면 번들에 비밀이 없습니다.');
process.exit(strict && leaked ? 1 : 0);
