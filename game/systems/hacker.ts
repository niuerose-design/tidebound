/**
 * v3.18 해커 규칙(1단계). 데이터는 data/hacker.ts, 행동은 actions/hacker.ts, 서버 공유(방송·크래킹)는 server/hacks.ts.
 * 침투 작전의 정답은 서버 키(setPuzzleKey)와 판 시드로 만든 해시라, 세이브(클라이언트에 보내는 상태)에는 정답이 없습니다.
 */
import type { State, HackerState, HackerInfil } from '../types';
import { HACKER, HACKER_ID, ADGUARD_ID, gradeNeed, type PrivacyField, PRIVACY_FIELDS } from '../data/hacker';
import { dayKey } from '../data/goals';
import { canUse, skillMastery } from './progression';
import { addLog } from './state';

export const isHacker = (s: Pick<State, 'job'>) => s.job === HACKER_ID;
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
 * 비트·권한 경험치 지급. 권한 등급을 올리고, 해커 직업 숙련과 장착한 해커 스킬(애드가드) 숙련에 같은 양(정수)을 더합니다.
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
        s.jobMastery[HACKER_ID] = (s.jobMastery[HACKER_ID] || 0) + practice;
        for (const id of s.skills) if (canUse(s, id) && id === ADGUARD_ID) s.skillPractice[id] = (s.skillPractice[id] || 0) + practice;
    }
}
/** 권한 등급 g에 닿는 누적 경험치(등급 1 = 0). */
export const gradeTotal = (grade: number) => { let n = 0; for (let g = 1; g < grade; g++) n += gradeNeed(g); return n; };

/** 브루트포스(방치): 자동 사냥 대신 해커가 돌리는 작업. 틱마다 비트·권한 경험치를 조금씩. */
export function hackerTick(s: State) {
    gainHacker(s, HACKER.brute.bits, HACKER.brute.exp, true);
}

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
/** 지금 노드의 정답(서버만 계산). 자물쇠는 서로 다른 숫자 size자리, 포트는 1~size. */
export function nodeAnswer(run: HackerInfil) {
    const r = nodeRng(run);
    if (run.node.kind === 'port') return String(1 + Math.floor(r() * run.node.size));
    const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = digits.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [digits[i], digits[j]] = [digits[j], digits[i]]; }
    return digits.slice(0, run.node.size).join('');
}
export function makeNode(depth: number): HackerInfil['node'] {
    const next = depth + 1;
    if (next % 2 === 1) { const l = HACKER.infil.lock(next); return { kind: 'lock', size: l.digits, tries: 0, max: l.tries, history: [] }; }
    const p = HACKER.infil.port(next); return { kind: 'port', size: p.range, tries: 0, max: p.tries, history: [] };
}
/** 추측을 채점합니다. 자물쇠: 자리·숫자 모두 맞으면 S, 숫자만 맞으면 B. 포트: 정답이 더 크면 UP, 작으면 DOWN. */
export function judge(run: HackerInfil, guess: string) {
    const answer = nodeAnswer(run), node = run.node;
    if (node.kind === 'lock') {
        if (!new RegExp(`^\\d{${node.size}}$`).test(guess) || new Set(guess).size !== node.size) throw Error(`서로 다른 숫자 ${node.size}자리를 입력하세요.`);
        let strike = 0, ball = 0;
        for (let i = 0; i < guess.length; i++) { if (guess[i] === answer[i]) strike++; else if (answer.includes(guess[i])) ball++; }
        return { solved: strike === node.size, hint: strike === node.size ? 'OPEN' : `${strike}S ${ball}B` };
    }
    const n = Number(guess);
    if (!Number.isInteger(n) || n < 1 || n > node.size) throw Error(`1~${node.size} 사이의 포트 번호를 입력하세요.`);
    const a = Number(answer);
    return { solved: n === a, hint: n === a ? 'OPEN' : a > n ? 'UP' : 'DOWN' };
}

// ── 애드가드 ──────────────────────────────────────────────
/** 장착·사용 가능한 애드가드의 숙련 단계(0 = 꺼짐). */
export function adguardLevel(s: State) {
    return s.skills.includes(ADGUARD_ID) && canUse(s, ADGUARD_ID) ? skillMastery(s, ADGUARD_ID) : 0;
}
/** 순위표에 실을 숨김 설정. 1단계: 이름과 모든 항목 숨김, 2단계: 고른 항목만 공개. 애드가드가 꺼져 있으면 undefined. */
export function privacyOf(s: State): { show: PrivacyField[] } | undefined {
    const level = adguardLevel(s);
    if (level < 1) return undefined;
    return { show: level >= 2 ? (s.privacy?.show || []).filter((x): x is PrivacyField => (PRIVACY_FIELDS as readonly string[]).includes(x)) : [] };
}
