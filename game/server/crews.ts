/**
 * v3.29 해커 조직 서버 처리(docs/concept.md 9.10, 4-a 단계). 규칙과 숫자는 game/data/crew.ts.
 * 부하 설계(9.8)
 * - 조직 하나 = crews 한 행(JSON + revision 비교 저장). 동시에 고치면 다시 읽고 최대 3번.
 * - 세이브에는 소속 캐시(hacker.crew)만 둡니다. 동기화는 소속일 때만 10분에 한 번 행을 읽고(인스턴스 30초 캐시),
 *   조직원의 마지막 활동은 하루에 한 번만 적습니다. 무소속이면 질의 0.
 * - 조직 화면은 열 때와 행동 뒤에만 읽습니다(주기 폴링 없음).
 */
import type { State } from '../types';
import { db, type CrewRow } from './db';
import { ApiError } from './store';
import { dayKey } from '../data/goals';
import { addLog } from '../systems/state';
import { hackerState, isHacker } from '../systems/hacker';
import { CREW, CREW_CODE_CHARS, CREW_SIDES, cleanCrewName, crewGrade, crewGradeProgress, crewSide, normalizeCrewCode, sideAllows, type CrewData, type CrewSide } from '../data/crew';

const CACHE_MS = 30_000, ATTEMPTS = 3;
const cache = new Map<string, { at: number; row: CrewRow | null }>();
const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(CREW.codeLength)), b => CREW_CODE_CHARS[b % CREW_CODE_CHARS.length]).join('');
const parse = (row: CrewRow | null): CrewData | null => { try { return row ? JSON.parse(row.data) as CrewData : null; } catch { return null; } };

/** 30초 캐시로 조직 행을 읽습니다(동기화용). 화면·행동은 fresh로 읽습니다. */
async function readCrew(id: string, now: number, fresh = false) {
    const hit = cache.get(id);
    if (!fresh && hit && now - hit.at < CACHE_MS) return hit.row;
    const row = await db().getCrew(id);
    if (cache.size > 2000) cache.clear();
    cache.set(id, { at: now, row });
    return row;
}

/**
 * 정리 규칙(쓸 때마다): 해커 계열이 아닌 채로 30일 지난 조직원은 내보내고,
 * 조직장이 없거나 14일 동안 활동이 없으면 기여가 가장 많은 다른 조직원에게 넘깁니다.
 */
export function tidyCrew(c: CrewData, now: number) {
    for (const [id, m] of Object.entries(c.members)) if (m.offSince !== undefined && now - m.offSince >= CREW.leaveDays * 86400_000) delete c.members[id];
    const leader = c.members[c.leader];
    if (!leader || now - leader.seen >= CREW.leaderIdleDays * 86400_000) {
        const next = Object.entries(c.members).filter(([id]) => id !== c.leader).sort(([, a], [, b]) => b.deposited - a.deposited || a.joined - b.joined)[0];
        if (next) c.leader = next[0];
    }
}

/** 행을 다시 읽어 고치고 revision 비교로 저장합니다. change가 던지면 아무것도 쓰지 않습니다. 조직원이 없어지면 조직을 지웁니다. */
async function updateCrew(crewId: string, now: number, change: (c: CrewData, row: CrewRow) => string | void) {
    const database = db();
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        const row = await database.getCrew(crewId), c = parse(row);
        if (!row || !c) throw new ApiError('조직을 찾을 수 없습니다.');
        const code = change(c, row) || row.code;
        tidyCrew(c, now);
        if (!Object.keys(c.members).length) { await database.deleteCrew(crewId); cache.delete(crewId); return null; }
        if (await database.putCrew(crewId, code, JSON.stringify(c), row.revision, now)) { cache.set(crewId, { at: now, row: { ...row, code, data: JSON.stringify(c), revision: row.revision + 1 } }); return c; }
    }
    throw new ApiError('다른 조직원이 동시에 고치고 있습니다. 다시 시도하세요.', 409);
}

const setCache = (s: State, id: string, c: CrewData, me: string, now: number) => { hackerState(s).crew = { id, name: c.name, side: c.side, grade: crewGrade(c.exp), leader: c.leader === me, syncedAt: now }; };
const requireCrew = (s: State) => { const c = s.hacker?.crew; if (!c) throw new ApiError('조직에 들어가 있지 않습니다.'); return c; };
const requireHackerLine = (s: State) => { if (!isHacker(s)) throw new ApiError('해커 계열 직업일 때만 할 수 있습니다.'); };

export type CrewInfo = {
    crew: null | { id: string; name: string; side: CrewSide; sideName: string; code: string; leader: boolean; vault: number; exp: number; grade: number; into: number; need: number; capacity: number;
        members: { id: string; name: string; leader: boolean; self: boolean; joined: number; deposited: number; idleDays: number; off: boolean }[]; depositLeft: number };
    sides: { id: CrewSide; name: string; allowed: boolean }[];
};
/** 조직 화면 정보(열 때와 행동 뒤에만). 초대 코드는 조직원 모두에게 보입니다. */
export async function crewInfo(me: string, s: State, now: number): Promise<CrewInfo> {
    const sides = CREW_SIDES.map(x => ({ id: x.id, name: x.name, allowed: sideAllows(x.id, s.job) }));
    const cached = s.hacker?.crew, row = cached ? await readCrew(cached.id, now, true) : null, c = parse(row);
    if (!cached || !row || !c || !c.members[me]) return { crew: null, sides };
    const p = crewGradeProgress(c.exp), h = s.hacker!, used = h.crewDeposit?.day === dayKey(now) ? h.crewDeposit.n : 0;
    return { sides, crew: { id: row.id, name: c.name, side: c.side, sideName: crewSide(c.side)?.name || c.side, code: row.code, leader: c.leader === me, vault: c.vault, exp: c.exp, grade: p.grade, into: p.into, need: p.need, capacity: CREW.capacity(p.grade),
        members: Object.entries(c.members).sort(([a], [b]) => (b === c.leader ? 1 : 0) - (a === c.leader ? 1 : 0)).map(([id, m]) => ({ id, name: m.name, leader: id === c.leader, self: id === me, joined: m.joined, deposited: m.deposited, idleDays: Math.floor((now - m.seen) / 86400_000), off: m.offSince !== undefined })),
        depositLeft: Math.max(0, CREW.depositPerDay(h.grade) - used) } };
}

/**
 * 동기화(저장 전): 소속이면 10분마다 캐시 행으로 소속을 맞추고, 하루에 한 번(또는 해커 계열 여부가 바뀌었을 때) 내 활동을 적습니다.
 * 행이 없거나 내가 빠졌으면(강퇴·자동 탈퇴) 소속 캐시를 지웁니다.
 */
export async function syncCrew(me: string, s: State, now: number) {
    const cached = s.hacker?.crew;
    if (!cached || now - cached.syncedAt < CREW.refreshMs) return;
    const c = parse(await readCrew(cached.id, now)), m = c?.members[me];
    if (!c || !m) { delete s.hacker!.crew; addLog(s, `해커 조직 ‘${cached.name}’에서 빠졌습니다.`, 'system'); return; }
    const hacker = isHacker(s);
    if (now - m.seen >= CREW.seenMs || hacker === (m.offSince !== undefined) || m.name !== s.name) {
        const next = await updateCrew(cached.id, now, x => { const mm = x.members[me]; if (!mm) return; mm.seen = now; mm.name = s.name; if (hacker) delete mm.offSince; else mm.offSince ??= now; }).catch(() => c);
        if (!next?.members[me]) { delete s.hacker!.crew; return; }
        setCache(s, cached.id, next, me, now);
        return;
    }
    setCache(s, cached.id, c, me, now);
}

/** 아래 행동은 /api/crew가 mutate 안에서 부릅니다. DB 쓰기를 한 번 한 뒤, 세이브에 적용할 변화(apply)를 돌려줍니다(저장 충돌로 다시 돌면 apply만 다시). */
export type CrewApply = (s: State) => void;

export async function createCrew(me: string, s: State, rawName: unknown, rawSide: unknown, now: number): Promise<CrewApply> {
    requireHackerLine(s);
    const h = hackerState(s), name = cleanCrewName(rawName), side = String(rawSide || '') as CrewSide;
    if (h.crew) throw new ApiError('이미 조직에 들어가 있습니다.');
    if (h.tier < 1) throw new ApiError('해킹 I을 해금해야 조직을 만들 수 있습니다.');
    if (name.length < CREW.nameMin) throw new ApiError(`조직 이름은 ${CREW.nameMin}~${CREW.nameMax}자입니다.`);
    if (!crewSide(side)) throw new ApiError('조직 성향을 고르세요.');
    if (!sideAllows(side, s.job)) throw new ApiError(`${crewSide(side)!.name} 조직은 지금 직업으로 만들 수 없습니다.`);
    if (h.bits < CREW.createBits) throw new ApiError(`조직 창설에는 비트 ${CREW.createBits}가 필요합니다.`);
    const data: CrewData = { name, side, leader: me, created: now, vault: 0, exp: 0, members: { [me]: { name: s.name, joined: now, seen: now, deposited: 0 } } };
    for (let attempt = 0; attempt < 5; attempt++) {
        const id = `c_${randomCode()}${randomCode()}`.toLowerCase(), code = randomCode();
        if (!await db().putCrew(id, code, JSON.stringify(data), -1, now)) continue;
        cache.delete(id);
        return st => { hackerState(st).bits -= CREW.createBits; setCache(st, id, data, me, now); addLog(st, `해커 조직 ‘${name}’ 창설 · 비트 -${CREW.createBits} · 초대 코드 ${code}`, 'reward'); };
    }
    throw new ApiError('조직을 만들지 못했습니다. 다시 시도하세요.', 503);
}

export async function joinCrew(me: string, s: State, rawCode: unknown, now: number): Promise<CrewApply> {
    requireHackerLine(s);
    if (s.hacker?.crew) throw new ApiError('이미 조직에 들어가 있습니다.');
    const code = normalizeCrewCode(String(rawCode ?? '')), row = code.length === CREW.codeLength ? await db().getCrewByCode(code) : null, found = parse(row);
    if (!row || !found) throw new ApiError('초대 코드가 맞지 않습니다.');
    if (!sideAllows(found.side, s.job)) throw new ApiError(`${crewSide(found.side)?.name || ''} 조직에는 지금 직업으로 들어갈 수 없습니다.`);
    const c = await updateCrew(row.id, now, x => {
        if (x.members[me]) return;
        const cap = CREW.capacity(crewGrade(x.exp));
        if (Object.keys(x.members).length >= cap) throw new ApiError(`조직 정원(${cap}명)이 찼습니다.`);
        x.members[me] = { name: s.name, joined: now, seen: now, deposited: 0 };
    });
    return st => { setCache(st, row.id, c!, me, now); addLog(st, `해커 조직 ‘${c!.name}’ 가입`, 'reward'); };
}

export async function leaveCrew(me: string, s: State, now: number): Promise<CrewApply> {
    const cached = requireCrew(s);
    // 마지막 조직원이 나가면 조직이 사라집니다. 조직장이 나가면 tidyCrew가 다음 조직장을 고릅니다.
    await updateCrew(cached.id, now, x => { delete x.members[me]; }).catch(e => { if (!(e instanceof ApiError && /찾을 수 없/.test(e.message))) throw e; });
    return st => { if (st.hacker) delete st.hacker.crew; addLog(st, `해커 조직 ‘${cached.name}’ 탈퇴`, 'system'); };
}

/** 조직장 행동: kick(내보내기) · delegate(위임) · code(초대 코드 재발급). */
export async function leaderAct(me: string, s: State, kind: 'kick' | 'delegate' | 'code', rawTarget: unknown, now: number): Promise<CrewApply> {
    const cached = requireCrew(s), target = String(rawTarget ?? '');
    let label = '';
    const c = await updateCrew(cached.id, now, x => {
        if (x.leader !== me) throw new ApiError('조직장만 할 수 있습니다.', 403);
        x.members[me].seen = now;
        if (kind === 'code') { label = '초대 코드를 새로 만들었습니다(옛 코드는 무효).'; return randomCode(); }
        const m = x.members[target];
        if (!m || target === me) throw new ApiError('대상 조직원을 확인하세요.');
        if (kind === 'kick') { delete x.members[target]; label = `${m.name}을(를) 조직에서 내보냈습니다.`; }
        else { x.leader = target; label = `조직장을 ${m.name}에게 넘겼습니다.`; }
    });
    return st => { if (c) setCache(st, cached.id, c, me, now); addLog(st, label, 'system'); };
}

/** 비트 기여: 조직 자금에 비트를 더합니다(되돌릴 수 없음). 하루 상한 = 권한 등급 × 50. 기여 비트 1 = 조직 경험치 1. */
export async function depositCrew(me: string, s: State, rawAmount: unknown, now: number): Promise<CrewApply> {
    const cached = requireCrew(s), h = hackerState(s), amount = Math.floor(Number(rawAmount)), day = dayKey(now);
    requireHackerLine(s);
    const used = h.crewDeposit?.day === day ? h.crewDeposit.n : 0, left = CREW.depositPerDay(h.grade) - used;
    if (!Number.isInteger(amount) || amount < 1) throw new ApiError('넣을 비트를 확인하세요.');
    if (amount > left) throw new ApiError(`오늘은 비트 ${Math.max(0, left)}까지 넣을 수 있습니다.`);
    if (h.bits < amount) throw new ApiError('비트가 부족합니다.');
    const before = crewGrade((parse(await readCrew(cached.id, now, true))?.exp) || 0);
    const c = await updateCrew(cached.id, now, x => { const m = x.members[me]; if (!m) throw new ApiError('조직원이 아닙니다.'); x.vault += amount; x.exp += amount; m.deposited += amount; m.seen = now; });
    const grade = crewGrade(c!.exp);
    return st => {
        const hk = hackerState(st), u = hk.crewDeposit?.day === day ? hk.crewDeposit.n : 0;
        hk.bits -= amount; hk.crewDeposit = { day, n: u + amount }; setCache(st, cached.id, c!, me, now);
        addLog(st, `조직에 비트 ${amount} 기여 · 조직 경험치 +${amount}${grade > before ? ` · 조직 등급 ${grade} 달성` : ''}`, 'reward');
    };
}
