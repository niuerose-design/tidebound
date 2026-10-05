/**
 * v3.18 해커 규칙(1단계). 데이터는 data/hacker.ts, 행동은 actions/hacker.ts, 서버 공유(방송·크래킹)는 server/hacks.ts.
 * 침투 작전의 정답은 서버 키(setPuzzleKey)와 판 시드로 만든 해시라, 세이브(클라이언트에 보내는 상태)에는 정답이 없습니다.
 */
import type { State, HackerState, HackerInfil } from '../types';
import { HACKER, WHITE_HACKER_ID, BLACK_HACKER_ID, ADGUARD_ID, gradeNeed, isHackerJob, programById, type ProgramId } from '../data/hacker';
import { monthKey } from '../data/goals';
import { dayKey } from '../data/goals';
import { canUse, skillMastery } from './progression';
import { addLog } from './state';

/** v3.25 해커 계열(해커·화이트 해커). 같은 제약(전투 불가, 레벨 정지)을 받습니다. */
export const isHacker = (s: Pick<State, 'job'>) => isHackerJob(s.job);
export const isWhiteHacker = (s: Pick<State, 'job'>) => s.job === WHITE_HACKER_ID;
/** v3.28 블랙 해커: 하루 횟수 ×2, 해킹 비트 ×2, 실패 확률. */
export const isBlackHacker = (s: Pick<State, 'job'>) => s.job === BLACK_HACKER_ID;
/** v3.28 공격 해킹(방송·크래킹·변조·다운·견제)을 쓰는 직업: 해커 · 블랙 해커. */
export const canAttack = (s: Pick<State, 'job'>) => isHacker(s) && !isWhiteHacker(s);
/** v3.28 해킹 비트 비용과 하루(주) 횟수: 블랙 해커는 둘 다 두 배. */
export const hackCost = (s: Pick<State, 'job'>, bits: number) => isBlackHacker(s) ? bits * HACKER.black.cost : bits;
export const hackCap = (s: Pick<State, 'job'>, cap: number) => isBlackHacker(s) ? cap * HACKER.black.cap : cap;
/** v3.25 장착한 프로그램인지(해커 계열일 때만 켜짐). */
export const programOn = (s: Pick<State, 'job' | 'hacker'>, id: ProgramId) => isHacker(s) && !!s.hacker?.loadout?.includes(id);
export const memoryCap = (s: Pick<State, 'hacker'>) => HACKER.memory(s.hacker?.grade || 1);
export const memoryUsed = (ids: string[]) => ids.reduce((n, id) => n + (programById(id)?.memory || 0), 0);
/** v3.25 해커 순위(월) 기록을 올립니다. 저장 전에 /api 쪽이 dirty를 보고 순위표에 씁니다. */
export function bumpSeason(s: State, now: number, d: { depth?: number; hacks?: number; restores?: number }) {
    const h = hackerState(s), key = monthKey(now);
    if (h.season?.key !== key) h.season = { key, depth: 0, hacks: 0, restores: 0 };
    const x = h.season;
    x.depth = Math.max(x.depth, d.depth || 0); x.hacks += d.hacks || 0; x.restores += d.restores || 0; x.dirty = true;
}
/** 순위 점수: 깊이 ×10 + 해킹 ×5 + 복구 ×5. */
export const seasonScore = (x: { depth: number; hacks: number; restores: number }) => x.depth * 10 + x.hacks * 5 + x.restores * 5;
/** v3.18 해커는 전투 콘텐츠(결투·월드보스·신 도전)에 참여하지 않습니다. 막을 때의 문구, 아니면 빈 문자열. */
export const hackerCombatBlock = (s: Pick<State, 'job'>) => isHacker(s) ? '해커는 전투에 참여할 수 없습니다. 다른 직업으로 전직한 뒤 도전하세요.' : '';

export function hackerState(s: State): HackerState {
    s.hacker ??= { bits: 0, exp: 0, grade: 1, tier: 0 };
    return s.hacker;
}
/** 하루가 바뀌면 침투 입장·해킹 횟수를 되돌립니다(한국 시간). */
export function rollHackerDay(s: State, now: number) {
    const h = hackerState(s), day = dayKey(now);
    if (h.day !== day) { h.day = day; h.entries = 0; h.used = {}; }
    return h;
}
/**
 * 비트·권한 경험치 지급. 권한 등급을 올리고, 해커 직업 숙련과 장착한 해커 스킬(신원 조작) 숙련에 같은 양(정수)을 더합니다.
 * 해커로 있는 동안 SP·세계석·골드·경험치는 생기지 않습니다(재화 분리).
 */
export function gainHacker(s: State, bits: number, exp: number, quiet = false) {
    const h = hackerState(s);
    const before = Math.floor(h.exp);
    h.bits += bits; h.exp += exp;
    while (h.grade < HACKER.grade.max && h.exp >= gradeTotal(h.grade + 1)) {
        h.grade++;
        if (!quiet || !s.catchingUp) addLog(s, `권한 등급 ${h.grade} 달성`, 'reward');
    }
    const practice = Math.floor(h.exp) - before;
    if (practice > 0 && isHacker(s)) {
        // v3.25 지금 해커 계열 직업(해커·화이트 해커)의 숙련에 더합니다.
        s.jobMastery[s.job] = (s.jobMastery[s.job] || 0) + practice;
        for (const id of s.skills) if (canUse(s, id) && id === ADGUARD_ID) s.skillPractice[id] = (s.skillPractice[id] || 0) + practice;
    }
}
/** 권한 등급 g에 닿는 누적 경험치(등급 1 = 0). */
export const gradeTotal = (grade: number) => { let n = 0; for (let g = 1; g < grade; g++) n += gradeNeed(g); return n; };

/** 브루트포스(방치): 자동 사냥 대신 해커가 돌리는 작업. 틱마다 비트·권한 경험치를 조금씩. */
export function hackerTick(s: State) {
    // v3.25 크립토 마이너: 비트 +30%. v3.27 다른 해커의 과부하 동안은 비트 절반. v3.28 봇넷 동안 비트·권한 ×2.
    const overloaded = (s.hackFeed?.overloadUntil || 0) > (s.lastTick || 0), botnet = botnetOn(s, s.lastTick || 0) ? HACKER.botnet.rate : 1;
    gainHacker(s, HACKER.brute.bits * (programOn(s, 'cryptoMiner') ? 1.3 : 1) * (overloaded ? HACKER.overload.rate : 1) * botnet, HACKER.brute.exp * botnet, true);
}
/** v3.28 해킹 VIII 봇넷이 돌고 있는지. */
export const botnetOn = (s: Pick<State, 'hacker'>, now: number) => (s.hacker?.botnet?.until || 0) > now;
/** v3.27 오늘 침투 작전 입장 한도: 기본 − 다른 해커의 역추적(최소 1). v3.28 봇넷을 건 날은 +2. */
export function entriesCap(s: Pick<State, 'hackFeed' | 'hacker'>, now: number) {
    const t = s.hackFeed?.traced, cut = t && t.day === dayKey(now) ? t.n : 0, bonus = s.hacker?.botnet?.day === dayKey(now) ? HACKER.botnet.entries : 0;
    return Math.max(1, HACKER.infil.entriesPerDay - cut) + bonus;
}
/** v3.25 추적당했을 때 회수하는 비율(백신 회피 75%). */
export const traceKeep = (s: Pick<State, 'job' | 'hacker'>) => programOn(s, 'avEvasion') ? .75 : HACKER.infil.traceKeep;

// ── 침투 작전 ─────────────────────────────────────────────
let puzzleKey = 'tidebound-local-puzzle-key';
/** 서버가 시작할 때 한 번 넣습니다(server/hacks.ts). 클라이언트 번들에서는 부르지 않습니다. */
export function setPuzzleKey(key: string) { if (key) puzzleKey = key; }
/** 53비트 문자열 해시(cyrb53). 키를 모르면 정답을 거꾸로 계산할 수 없습니다. */
function hash(text: string, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
function nodeRng(run: Pick<HackerInfil, 'seed' | 'depth'>) {
    let x = hash(`${puzzleKey}:${run.seed}:${run.depth}`) % 4294967296;
    return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ t >>> 15, 1 | t); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
/** v3.26 키로만 만들 수 있는 보조 난수(salt마다 다른 흐름). 노드 종류(k)와 새 퍼즐 문제(p)에 씁니다. 자물쇠·포트 정답은 예전 흐름 그대로. */
function saltRng(seed: number, depth: number, salt: string) {
    let x = hash(`${puzzleKey}:${seed}:${depth}:${salt}`) % 4294967296;
    return () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ t >>> 15, 1 | t); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const pick = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
/** v3.26 암호 해독 단어(영문 대문자). */
const CIPHER_WORDS = ['ROOT', 'ADMIN', 'SHELL', 'PROXY', 'TOKEN', 'CACHE', 'LOGIN', 'KERNEL', 'ROUTER', 'SOCKET', 'PACKET', 'BINARY', 'CIPHER', 'ACCESS', 'SERVER', 'CLIENT', 'SCRIPT', 'BUFFER', 'MATRIX', 'FIREWALL', 'BACKDOOR', 'EXPLOIT'];
const shiftWord = (w: string, k: number) => [...w].map(c => String.fromCharCode(65 + (c.charCodeAt(0) - 65 + k) % 26)).join('');
/** v3.26 새 퍼즐(수열 · 진법 변환 · 암호 해독)의 문제와 정답. 서버 키로만 같은 문제가 나옵니다. */
function puzzleOf(seed: number, depth: number, kind: 'seq' | 'bin' | 'cipher'): { prompt: string; answer: string } {
    const r = saltRng(seed, depth, 'p'), d = depth + 1;
    if (kind === 'seq') {
        const types = ['add', ...(d >= 3 ? ['mul'] : []), ...(d >= 5 ? ['alt'] : []), ...(d >= 7 ? ['fib'] : []), ...(d >= 9 ? ['square'] : [])], type = types[Math.floor(r() * types.length)];
        let terms: number[];
        if (type === 'mul') { const a = pick(r, 1, 5), k = pick(r, 2, 3); terms = Array.from({ length: 6 }, (_, i) => a * k ** i); }
        else if (type === 'alt') { const a = pick(r, 1, 20), p = pick(r, 2, 9), q = pick(r, 2, 9); terms = [a]; for (let i = 1; i < 6; i++) terms.push(terms[i - 1] + (i % 2 ? p : q)); }
        else if (type === 'fib') { terms = [pick(r, 1, 9), pick(r, 1, 9)]; for (let i = 2; i < 6; i++) terms.push(terms[i - 1] + terms[i - 2]); }
        else if (type === 'square') { const k = pick(r, 1, 5), c = pick(r, 0, 9); terms = Array.from({ length: 6 }, (_, i) => (k + i) ** 2 + c); }
        else { const a = pick(r, 1, 30), step = pick(r, 2, 9 + d); terms = Array.from({ length: 6 }, (_, i) => a + step * i); }
        return { prompt: `${terms.slice(0, 5).join(', ')}, ?`, answer: String(terms[5]) };
    }
    if (kind === 'bin') {
        const bits = Math.min(12, 5 + Math.floor(d / 3)), value = pick(r, 2 ** (bits - 1), 2 ** bits - 1), hex = d >= 8 && r() < .5;
        return { prompt: hex ? `0x${value.toString(16).toUpperCase()}` : `0b${value.toString(2)}`, answer: String(value) };
    }
    const word = CIPHER_WORDS[Math.floor(r() * CIPHER_WORDS.length)], max = d < 6 ? 3 : 25, k = pick(r, 1, max);
    return { prompt: `${shiftWord(word, k)} (알파벳을 1~${max}칸 밀어 둔 단어)`, answer: word };
}
/** v3.26 노드 종류: 1번째는 방화벽, 2번째는 포트 스캔, 3번째부터 홀수 칸은 방화벽·암호 해독, 짝수 칸은 포트 스캔·수열·진법 변환. */
function nodeKind(seed: number, depth: number): HackerInfil['node']['kind'] {
    const next = depth + 1;
    if (next <= 2) return next === 1 ? 'lock' : 'port';
    const x = saltRng(seed, depth, 'k')();
    return next % 2 === 1 ? (x < .6 ? 'lock' : 'cipher') : x < .4 ? 'port' : x < .7 ? 'seq' : 'bin';
}
/** 지금 노드의 정답(서버만 계산). 자물쇠는 서로 다른 숫자 size자리, 포트는 1~size, 수열·진법·암호는 문제와 함께 만든 답. */
export function nodeAnswer(run: HackerInfil) {
    const kind = run.node.kind;
    if (kind === 'seq' || kind === 'bin' || kind === 'cipher') return puzzleOf(run.seed, run.depth, kind).answer;
    const r = nodeRng(run);
    if (kind === 'port') return String(1 + Math.floor(r() * run.node.size));
    const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = digits.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [digits[i], digits[j]] = [digits[j], digits[i]]; }
    return digits.slice(0, run.node.size).join('');
}
/** extra: 노드마다 더 주는 시도(v3.25 포트 스캐너 +1). v3.26 판 시드로 노드 종류를 고르고, 새 퍼즐은 문제(prompt)를 함께 적습니다. */
export function makeNode(seed: number, depth: number, extra = 0): HackerInfil['node'] {
    const next = depth + 1, kind = nodeKind(seed, depth);
    if (kind === 'lock') { const l = HACKER.infil.lock(next); return { kind, size: l.digits, tries: 0, max: l.tries + extra, history: [] }; }
    if (kind === 'port') { const p = HACKER.infil.port(next); return { kind, size: p.range, tries: 0, max: p.tries + extra, history: [] }; }
    const q = puzzleOf(seed, depth, kind);
    return { kind, size: q.answer.length, tries: 0, max: HACKER.infil.tries[kind] + extra, history: [], prompt: q.prompt };
}
export const nodeExtra = (s: Pick<State, 'job' | 'hacker'>) => programOn(s, 'portScanner') ? 1 : 0;
/** 추측을 채점합니다. 자물쇠: 자리·숫자 모두 맞으면 S, 숫자만 맞으면 B. 포트·수열·진법: 정답이 더 크면 UP, 작으면 DOWN. 암호: 자리가 맞은 글자 수. */
export function judge(run: HackerInfil, guess: string) {
    const answer = nodeAnswer(run), node = run.node;
    if (node.kind === 'lock') {
        if (!new RegExp(`^\\d{${node.size}}$`).test(guess) || new Set(guess).size !== node.size) throw Error(`서로 다른 숫자 ${node.size}자리를 입력하세요.`);
        let strike = 0, ball = 0;
        for (let i = 0; i < guess.length; i++) { if (guess[i] === answer[i]) strike++; else if (answer.includes(guess[i])) ball++; }
        return { solved: strike === node.size, hint: strike === node.size ? 'OPEN' : `${strike}S ${ball}B` };
    }
    if (node.kind === 'cipher') {
        const g = guess.toUpperCase();
        if (!/^[A-Z]+$/.test(g) || g.length !== answer.length) throw Error(`영문 ${answer.length}글자 단어를 입력하세요.`);
        const same = [...g].filter((c, i) => c === answer[i]).length;
        return { solved: g === answer, hint: g === answer ? 'OPEN' : `${same}/${answer.length} 일치` };
    }
    const n = Number(guess);
    if (node.kind === 'port' && (!Number.isInteger(n) || n < 1 || n > node.size)) throw Error(`1~${node.size} 사이의 포트 번호를 입력하세요.`);
    if (!Number.isInteger(n) || n < 0) throw Error('0 이상의 정수를 입력하세요.');
    const a = Number(answer);
    return { solved: n === a, hint: n === a ? 'OPEN' : a > n ? 'UP' : 'DOWN' };
}

// ── 신원 조작(옛 애드가드) ──────────────────────────────────────────────
/** 장착·사용 가능한 신원 조작(옛 애드가드)의 숙련 단계(0 = 꺼짐). v3.26 해커 계열일 때만 씁니다. */
export function adguardLevel(s: State) {
    return s.skills.includes(ADGUARD_ID) && canUse(s, ADGUARD_ID) ? skillMastery(s, ADGUARD_ID) : 0;
}
