// 화면 글쓰기 규칙 점검(docs/writing.md). 화면(components) · 자료(game/data) · 규칙 로그(game/systems)의 한글 문자열을 TypeScript AST로 모아
// 규칙 위반을 셉니다. 두 층입니다.
//   금지: 플레이어 문장에 버전 번호(v3.201 · v27.80). 하나라도 있으면 실패.
//   줄이기(래칫): 괄호 보충 설명 · 가운뎃점 4개 이상 나열 · 120자 넘는 안내문. 파일마다 scripts/data/writing-baseline.json 의 수를 넘으면 실패,
//   줄이면 통과(기준은 --update 로 다시 씀). 새 코드가 옛 습관을 되풀이하지 않게 막고, 정리 PR이 쌓일수록 기준이 내려갑니다.
// 사용: node scripts/check-writing.mjs [--update] [--list] [--list 규칙이름] [--full 문장을 자르지 않음]
import ts from 'typescript';
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['components', 'game/data', 'game/systems'];
/** 패치 노트 · 운영 이력은 버전과 괄호를 쓰는 글이라 뺍니다. */
const SKIP = [/game\/data\/update-log\.ts$/, /game\/systems\/migrations\.ts$/, /\.test\.tsx?$/];
const BASELINE = 'scripts/data/writing-baseline.json';
const KOREAN = /[가-힣]/;
const RULES = {
    /** 금지. 플레이어는 패치 번호를 모릅니다. */
    version: { ban: true, label: '버전 번호', test: t => /\bv\d+\.\d+/.test(t) },
    /** 괄호 안 6자 이상의 한글 보충 설명. 한글이 없는 괄호(수식 · 단위 · 영문: (레벨 + 2) × 배율, log10(kills + 1))와 짧은 괄호((최대 5))는 허용합니다. */
    paren: { label: '괄호 보충 설명', test: t => [...t.matchAll(/[(（]([^()（）]{6,})[)）]/g)].some(m => KOREAN.test(m[1])) },
    /**
     * 한 나열에 같은 종류 항목 넷 이상(가운뎃점 3개 이상이 한 문장 안에 이어짐). 쉼표 문장 · 표 · 줄바꿈으로 바꿀 것.
     * 기록 줄(addLog 인자)과 값이 든 칸 나열(항목 절반 이상에 숫자나 ${…}가 있는 ‘이름 N · 이름 M’ 꼴)은 칸 구분자라 제외합니다.
     */
    dots: { label: '가운뎃점 넷 이상 나열', test: t => t.split(/[.!?:]\s|\n/).some(seg => { const items = seg.split(' · '); if (items.length < 4) return false; const valued = items.filter(x => /\d|\$\{/.test(x)).length; return valued * 2 < items.length; }) },
    /** 한 문장이 120자를 넘음. 문장을 끊을 것(문자열 전체가 아니라 가장 긴 문장을 잽니다). */
    long: { label: '120자 넘는 문장', test: t => t.replace(/\$\{[^}]*\}/g, '').split(/(?<=[.!?])\s+/).some(sent => sent.length > 120) },
};
const args = process.argv.slice(2), update = args.includes('--update'), full = args.includes('--full'), listAt = args.indexOf('--list'), list = listAt >= 0 ? (args[listAt + 1] && !args[listAt + 1].startsWith('--') ? args[listAt + 1] : 'all') : null;

function* walk(dir) { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) yield* walk(p); else if (/\.tsx?$/.test(f)) yield p; } }
/** 파일의 플레이어 문장: 문자열 · 템플릿(치환 부분은 ${…}로 남김) · JSX 글. 한글이 든 것만. */
function texts(file) {
    const src = readFileSync(file, 'utf8'), sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS), out = [];
    /** 기록 줄(addLog(...) 인자)은 가운뎃점이 칸 구분자라 dots 규칙에서 뺍니다. */
    const inLog = node => { for (let n = node.parent; n; n = n.parent) if (ts.isCallExpression(n) && /(^|\.)addLog$/.test(n.expression.getText(sf))) return true; return false; };
    const push = (node, text) => { if (KOREAN.test(text)) out.push({ text, log: inLog(node), line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 }); };
    const visit = node => {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) push(node, node.text);
        else if (ts.isTemplateExpression(node)) push(node, node.head.text + node.templateSpans.map(s => '${…}' + s.literal.text).join(''));
        else if (ts.isJsxText(node)) push(node, node.text.replace(/\s+/g, ' ').trim());
        if (ts.isTemplateExpression(node)) { node.templateSpans.forEach(s => visit(s.expression)); return; }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return out;
}
const files = ROOTS.flatMap(r => [...walk(r)]).filter(f => !SKIP.some(re => re.test(f))).sort();
const counts = {}, hits = [];
for (const file of files) {
    for (const t of texts(file)) for (const [id, rule] of Object.entries(RULES)) if (!(id === 'dots' && t.log) && rule.test(t.text)) {
        ((counts[file] ??= {})[id] = (counts[file][id] || 0) + 1); hits.push({ file, id, ...t });
    }
}
const total = id => hits.filter(h => h.id === id).length;
if (list) for (const h of hits) if (list === 'all' || h.id === list) console.log(`${h.file}:${h.line} [${RULES[h.id].label}] ${full ? h.text : h.text.slice(0, 110)}`);
console.log(Object.entries(RULES).map(([id, r]) => `${r.label} ${total(id)}${r.ban ? '(금지)' : ''}`).join(' · '));

const ratchet = Object.fromEntries(Object.entries(counts).map(([f, c]) => [f, Object.fromEntries(Object.entries(c).filter(([id]) => !RULES[id].ban))]).filter(([, c]) => Object.keys(c).length));
if (update) { writeFileSync(BASELINE, JSON.stringify({ note: 'docs/writing.md 래칫 기준: 파일마다 지금 남아 있는 위반 수. 줄이면 node scripts/check-writing.mjs --update 로 다시 씁니다. 늘리지 않습니다.', files: ratchet }, null, 1) + '\n'); console.log(`기준 갱신: ${BASELINE}`); }
let failed = false;
const banned = hits.filter(h => RULES[h.id].ban);
if (banned.length) { failed = true; console.log(`\n금지 규칙 위반 ${banned.length}건:`); for (const h of banned) console.log(`  ${h.file}:${h.line} ${h.text.slice(0, 120)}`); }
let baseline = { files: {} };
try { baseline = JSON.parse(readFileSync(BASELINE, 'utf8')); } catch { if (!update) { console.log(`기준 파일이 없습니다. node scripts/check-writing.mjs --update`); process.exit(1); } }
for (const [file, c] of Object.entries(ratchet)) for (const [id, n] of Object.entries(c)) {
    const was = baseline.files?.[file]?.[id] || 0;
    if (n > was) { failed = true; console.log(`  ${file}: ${RULES[id].label} ${was} → ${n} (늘었습니다. docs/writing.md를 보고 새 문장을 고치세요)`); }
}
console.log(failed ? '\n글쓰기 규칙 점검 실패' : '글쓰기 규칙 점검 통과');
process.exit(failed ? 1 : 0);
