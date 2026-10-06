// v3.43 정보 비공개 검사(docs/concept.md 10장): 빌드한 화면 번들(.next/static)에 비밀이어야 할 글·키가 실렸는지 셉니다.
// 지금은 비밀 표를 아직 서버로 옮기지 않아 대부분 실려 있습니다. 단계마다 숫자가 줄어드는지 보고, 다 옮긴 뒤 --strict로 CI를 막습니다.
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
const { JOBS } = await load('data/classes'), { SKILLS } = await load('data/skills'), { doorFor } = await load('data/doors');
// 비밀 직업: 히든 직업과 문으로 열리는 직업. 이름·설명은 드러나기 전까지 비밀입니다(힌트는 공개, 10.2-4).
const secretJobs = JOBS.filter(j => j.hidden || doorFor({}, j.id)), secretIds = new Set(secretJobs.map(j => j.id));
const text = (s) => typeof s === 'string' && s.length >= 12 ? s : '';
// 스킬 설명과 일부 직업 이름(예: ‘아델 (2차)’)은 실행 중에 조합되어 글자 그대로는 번들에 없습니다. 이름 검사는 하한값입니다(설명 검사가 더 정확).
const named = (name) => `name:${JSON.stringify(name)}`;
const canaries = {
    '히든 직업 이름(하한)': secretJobs.map(j => named(j.name)),
    '히든 직업 설명': secretJobs.map(j => text(j.desc)).filter(Boolean),
    '히든 직업 스킬 이름(하한)': SKILLS.filter(sk => sk.job && secretIds.has(sk.job)).map(sk => named(sk.name)),
    // v3.47 이름이 실행 중에 덮어써져(메이플 이름) name:"…" 모양이 아니어도 잡도록 따옴표 이름 그대로 찾습니다.
    // 보스도 쓰는 tentacleBarrage와 해킹 이름과 같은 adGuard(‘신원 조작’)는 공개 글이라 뺍니다.
    '히든 직업 스킬 이름(따옴표)': SKILLS.filter(sk => sk.job && secretIds.has(sk.job) && !['tentacleBarrage', 'adGuard'].includes(sk.id)).map(sk => JSON.stringify(sk.name)),
    // v3.44 발견의 문 조건(압축된 모양). doors.ts가 서버 전용이 되면 0이어야 합니다.
    '발견의 문 조건': ['deaths||0)>=10', 'deaths||0)>=30', 'wins||0)>=3', 'kills||0)>=500', 'gold||0)<100', 'bestStage||0)>=4'],
    // 드롭·확률 표의 키 이름. 압축기가 상수를 값으로 바꿔 넣으면(예: Math.min(.03,.0025*…)) 키가 사라져 못 찾으므로 하한값입니다.
    // 드롭 계산이 화면 번들에 없는지는 4단계에서 모듈 검사(화면이 game/secret을 가져가면 빌드 실패)로 확인합니다.
    '드롭·확률 키(하한)': ['dropChanceCap', 'dropBonusScale', 'tideLoot', 'dungeonRepeatDrop', 'dropPity', 'chancePerTier', 'bigChance', 'spawnWeight', 'goldenBase'],
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
