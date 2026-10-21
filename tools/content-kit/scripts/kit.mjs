#!/usr/bin/env node
/**
 * 판게아 콘텐츠 키트 CLI
 *
 *   node scripts/kit.mjs render  <type> [--var KEY=VALUE ...]      프롬프트를 채워서 출력 (claude.ai에 붙여넣기용)
 *   node scripts/kit.mjs run     <type> [--var KEY=VALUE ...]      Claude API 호출 → data/<type>.raw/<timestamp>.json 저장
 *   node scripts/kit.mjs validate <type> <file.json>               스키마 검증 + 기존 데이터와 중복 검사 (리포트만)
 *   node scripts/kit.mjs merge   <type> <file.json>                검증 통과분을 data/<type>.json 에 병합
 *   node scripts/kit.mjs qa      <type> <file.json>                QA 프롬프트 렌더 (--api 붙이면 API 호출)
 *   node scripts/export-game-data.mjs                              게임 데이터(game/data) → data/<type>.json 내보내기
 *
 * validate 에 --fresh 를 붙이면 기존 data/<type>.json 과의 중복 검사를 건너뜁니다(내보낸 데이터 자체를 스키마로 점검할 때).
 *
 * type: monster | item | skill | area | event
 *
 * 환경변수: ANTHROPIC_API_KEY, (선택) PANGAEA_MODEL (기본 claude-sonnet-5-5)
 *   최신 모델 ID는 https://docs.claude.com/en/docs/about-claude/models 에서 확인.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const PROMPT_FILE = {
  monster: "10_monsters.md",
  item: "20_items.md",
  skill: "30_skills.md",
  area: "40_areas.md",
  event: "50_events.md",
};
const KEY_FIELD = { monster: "name", item: "name", skill: "name", area: "place", event: "title" };

// ---------- helpers ----------
const read = (p) => fs.readFileSync(p, "utf8");
const readJson = (p, fallback) => (fs.existsSync(p) ? JSON.parse(read(p)) : fallback);
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

function parseArgs(argv) {
  const pos = [];
  const vars = {};
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--var") {
      const [k, ...rest] = argv[++i].split("=");
      vars[k] = rest.join("=");
    } else if (a.startsWith("--")) {
      flags[a.slice(2)] = true;
    } else pos.push(a);
  }
  return { pos, vars, flags };
}

function existingItems(type) {
  return readJson(path.join(DATA, `${type}.json`), []);
}

function existingSummary(type) {
  const items = existingItems(type);
  if (!items.length) return "(없음)";
  const key = KEY_FIELD[type];
  // 이름/id/태그만 넘겨서 토큰 절약
  return items.map((it) => `- ${it.id} | ${it[key]} | ${(it.tags || []).join(",")}`).join("\n");
}

function fill(template, vars, type) {
  let out = template;
  out = out.replaceAll("{{STYLE_GUIDE}}", read(path.join(ROOT, "STYLE_GUIDE.md")));
  out = out.replace(/\{\{SCHEMA:([a-z]+)\}\}/g, (_, t) =>
    JSON.stringify(readJson(path.join(ROOT, "schemas", `${t}.schema.json`)), null, 1)
  );
  if (type) out = out.replaceAll("{{EXISTING}}", vars.EXISTING ?? existingSummary(type));
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{{${k}}}`, v);
  // 채워지지 않은 변수는 보기 쉽게 남겨둠
  const missing = [...new Set(out.match(/\{\{[A-Z_]+\}\}/g) || [])];
  return { text: out, missing };
}

function renderPrompt(type, vars) {
  const sys = fill(read(path.join(ROOT, "prompts", "00_system.md")), vars);
  const user = fill(read(path.join(ROOT, "prompts", PROMPT_FILE[type])), vars, type);
  return { system: sys.text, user: user.text, missing: [...sys.missing, ...user.missing] };
}

// ---------- validation ----------
// 의존성 없는 소형 JSON Schema 검증기 (이 키트의 스키마가 쓰는 키워드만 지원)
function miniValidate(schema, value, p = "") {
  const errs = [];
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : null;
  const actual = value === null ? "null" : Array.isArray(value) ? "array" : Number.isInteger(value) ? "integer" : typeof value;
  if (types && !types.includes(actual) && !(actual === "integer" && types.includes("number"))) {
    return [`${p || "/"} must be ${types.join("|")} (got ${actual})`];
  }
  if (value === null) return errs;
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${p || "/"} must be one of ${schema.enum.join(",")}`);
  if (typeof value === "string") {
    const len = [...value].length;
    if (schema.minLength != null && len < schema.minLength) errs.push(`${p} too short (${len} < ${schema.minLength})`);
    if (schema.maxLength != null && len > schema.maxLength) errs.push(`${p} too long (${len} > ${schema.maxLength})`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errs.push(`${p} does not match ${schema.pattern}`);
  }
  if (typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum) errs.push(`${p} < ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) errs.push(`${p} > ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) errs.push(`${p} needs ≥${schema.minItems} items`);
    if (schema.maxItems != null && value.length > schema.maxItems) errs.push(`${p} needs ≤${schema.maxItems} items`);
    if (schema.items) value.forEach((v, i) => errs.push(...miniValidate(schema.items, v, `${p}/${i}`)));
  }
  if (actual === "object") {
    for (const r of schema.required || []) if (!(r in value)) errs.push(`${p || "/"} missing required '${r}'`);
    for (const [k, v] of Object.entries(value)) {
      const sub = schema.properties?.[k];
      if (sub) errs.push(...miniValidate(sub, v, `${p}/${k}`));
      else if (schema.additionalProperties === false) errs.push(`${p || "/"} unexpected field '${k}'`);
      else if (typeof schema.additionalProperties === "object") errs.push(...miniValidate(schema.additionalProperties, v, `${p}/${k}`));
    }
  }
  return errs;
}

async function getValidator(type) {
  const schema = readJson(path.join(ROOT, "schemas", `${type}.schema.json`));
  const fn = (v) => { fn.errors = miniValidate(schema, v); return fn.errors.length === 0; };
  return fn;
}

async function validateBatch(type, items, { fresh = false } = {}) {
  const validate = await getValidator(type);
  const key = KEY_FIELD[type];
  const existing = fresh ? [] : existingItems(type);
  const seenIds = new Set(existing.map((e) => e.id));
  const seenNames = new Set(existing.map((e) => e[key]));
  const seenFirst = new Set(existing.map((e) => firstSentence(e)));
  const ok = [], bad = [];
  for (const it of items) {
    const problems = [];
    if (!validate(it)) problems.push(...validate.errors);
    if (seenIds.has(it.id)) problems.push(`id 중복: ${it.id}`);
    if (seenNames.has(it[key])) problems.push(`${key} 중복: ${it[key]}`);
    const fs1 = firstSentence(it);
    if (fs1 && seenFirst.has(fs1)) problems.push(`첫 문장 중복: ${fs1}`);
    if (/[A-Za-z]/.test(it[key] || "")) problems.push(`${key}에 영문 포함`);
    if (/당신/.test(JSON.stringify(it))) problems.push(`"당신" 사용`);
    if (/[\u{1F300}-\u{1FAFF}]/u.test(JSON.stringify(it))) problems.push("이모지 포함");
    if (problems.length) bad.push({ id: it.id, name: it[key], problems });
    else {
      ok.push(it);
      seenIds.add(it.id); seenNames.add(it[key]); if (fs1) seenFirst.add(fs1);
    }
  }
  return { ok, bad };
}

function firstSentence(it) {
  // 게임 필드 우선: 몬스터 lore · 스토리 lines[0] · 옵션 description. 키트 예비 필드는 그 뒤.
  // 스킬 desc 는 액티브면 수치에서 자동 생성되어 ‘(물리 공격) × 1.9 피해.’ 꼴로 겹치는 게 정상이라 패시브(손글)만 봅니다.
  const txt = it.lore || (Array.isArray(it.lines) && it.lines[0]) || it.description || (it.type === "passive" ? it.desc : "") || it.body || it.effect_text || "";
  const first = txt.split(/[.!?。]\s*/)[0].trim();
  // 옵션 설명의 ‘고대 이상 · …’ 같은 짧은 머리말(10자 미만)은 문장이 아니라 분류라 중복 기준에서 뺍니다.
  return [...first].length < 10 ? "" : first;
}

function loadBatchFile(file) {
  const j = readJson(file);
  const items = Array.isArray(j) ? j : j.items;
  if (!Array.isArray(items)) throw new Error("파일에 items 배열이 없습니다");
  return items;
}

// ---------- API ----------
async function callClaude(system, user, { maxTokens = 16000 } = {}) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic(); // ANTHROPIC_API_KEY 사용
  const model = process.env.PANGAEA_MODEL || "claude-sonnet-5-5";
  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return { text, usage: res.usage, model };
}

function extractJson(text) {
  // 코드펜스나 앞뒤 잡음이 섞여도 첫 { 부터 마지막 } 까지 잘라 파싱
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("응답에서 JSON을 찾지 못했습니다");
  return JSON.parse(text.slice(s, e + 1));
}

// ---------- commands ----------
async function cmdRender(type, vars) {
  const { system, user, missing } = renderPrompt(type, vars);
  console.log("===== SYSTEM =====\n" + system + "\n\n===== USER =====\n" + user);
  if (missing.length) console.error(`\n[주의] 채워지지 않은 변수: ${missing.join(", ")}  (--var KEY=VALUE 로 지정)`);
}

async function cmdRun(type, vars) {
  const { system, user, missing } = renderPrompt(type, vars);
  if (missing.length) {
    console.error(`채워지지 않은 변수가 있어 중단합니다: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.error(`[run] ${type} 생성 요청 중...`);
  const { text, usage, model } = await callClaude(system, user);
  const json = extractJson(text);
  const dir = path.join(DATA, `${type}.raw`);
  ensureDir(dir);
  const out = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(out, JSON.stringify(json, null, 2));
  console.error(`[run] 저장: ${path.relative(ROOT, out)}  (${json.items?.length ?? "?"}개, model=${model}, in=${usage.input_tokens} out=${usage.output_tokens})`);
  const { ok, bad } = await validateBatch(type, json.items || []);
  report(ok, bad);
  console.error(`다음 단계: node scripts/kit.mjs merge ${type} ${path.relative(ROOT, out)}`);
}

async function cmdValidate(type, file, flags) {
  const { ok, bad } = await validateBatch(type, loadBatchFile(file), { fresh: !!flags.fresh });
  report(ok, bad);
}

async function cmdMerge(type, file, flags) {
  const { ok, bad } = await validateBatch(type, loadBatchFile(file));
  report(ok, bad);
  if (bad.length && !flags.force) {
    console.error(`\n문제 항목 ${bad.length}개는 제외하고 ${ok.length}개만 병합합니다. (전부 거부하려면 --strict)`);
    if (flags.strict) process.exit(1);
  }
  ensureDir(DATA);
  const target = path.join(DATA, `${type}.json`);
  const merged = [...existingItems(type), ...ok];
  fs.writeFileSync(target, JSON.stringify(merged, null, 2));
  console.error(`[merge] ${path.relative(ROOT, target)} → 총 ${merged.length}개`);
}

async function cmdQa(type, file, vars, flags) {
  const batch = JSON.stringify(loadBatchFile(file), null, 1);
  const tpl = read(path.join(ROOT, "prompts", "90_qa.md")).replaceAll("{{TYPE}}", type);
  const user = fill(tpl, { ...vars, BATCH: batch }, type).text;
  const system = fill(read(path.join(ROOT, "prompts", "00_system.md")), vars).text;
  if (!flags.api) {
    console.log("===== SYSTEM =====\n" + system + "\n\n===== USER =====\n" + user);
    return;
  }
  const { text } = await callClaude(system, user, { maxTokens: 16000 });
  const json = extractJson(text);
  const out = file.replace(/\.json$/, ".qa.json");
  fs.writeFileSync(out, JSON.stringify(json, null, 2));
  console.error(`[qa] verdict=${json.verdict}, issues=${json.issues?.length ?? 0}, fixed=${json.fixed_items?.length ?? 0} → ${out}`);
  if (json.fixed_items?.length) {
    // 수정본을 원본에 덮어쓴 패치 파일 생성
    const items = loadBatchFile(file);
    const byId = new Map(json.fixed_items.map((f) => [f.id, f]));
    const patched = items.map((it) => byId.get(it.id) ?? it);
    const pout = file.replace(/\.json$/, ".patched.json");
    fs.writeFileSync(pout, JSON.stringify({ items: patched }, null, 2));
    console.error(`[qa] 패치 적용본: ${pout}  →  merge 할 때 이 파일을 쓰세요`);
  }
}

function report(ok, bad) {
  console.error(`[validate] 통과 ${ok.length} / 문제 ${bad.length}`);
  for (const b of bad) console.error(`  ✗ ${b.id} (${b.name})\n      - ${b.problems.join("\n      - ")}`);
}

// ---------- main ----------
const { pos, vars, flags } = parseArgs(process.argv.slice(2));
const [cmd, type, file] = pos;
if (!cmd || !type || !PROMPT_FILE[type]) {
  console.error(read(fileURLToPath(import.meta.url)).split("*/")[0].replace(/^\/\*\*?/, ""));
  process.exit(1);
}
const run = { render: () => cmdRender(type, vars), run: () => cmdRun(type, vars), validate: () => cmdValidate(type, file, flags), merge: () => cmdMerge(type, file, flags), qa: () => cmdQa(type, file, vars, flags) }[cmd];
if (!run) { console.error(`알 수 없는 명령: ${cmd}`); process.exit(1); }
run().catch((e) => { console.error(e.message || e); process.exit(1); });
