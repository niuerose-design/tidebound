/**
 * v3.18 해커가 서버에 남기는 흔적(방송 탈취 · 크래킹)과 침투 작전 정답 키.
 * 서버 부하: 설정 하나(hacks)를 인스턴스마다 30초 캐시로 읽고, 쓰기는 해킹을 실행할 때와 운영 페이지에서 지울 때만 합니다.
 */
import { randomBytes } from 'node:crypto';
import { db } from './db';
import type { State, Snapshot } from '../types';
import { setPuzzleKey } from '../systems/hacker';

export type Hacks = { broadcast?: { text: string; by: string; byId: string; at: number; until: number }; cracked: Record<string, number> };
const KEY = 'hacks', TTL = 30_000;
let cached: { at: number; hacks: Hacks } | null = null;

function parse(raw: string | null): Hacks {
    try { const v = raw ? JSON.parse(raw) : null; return { broadcast: v?.broadcast && typeof v.broadcast.text === 'string' ? v.broadcast : undefined, cracked: v?.cracked && typeof v.cracked === 'object' ? v.cracked : {} }; }
    catch { return { cracked: {} }; }
}
/** 30초 캐시. 읽기에 실패하면 지난 값(없으면 빈 값)을 씁니다. */
export async function readHacks(now: number): Promise<Hacks> {
    if (cached && now - cached.at < TTL) return cached.hacks;
    try { cached = { at: now, hacks: parse(await db().getSetting(KEY)) }; }
    catch (e) { console.error('Hack config read failed', e instanceof Error ? e.message : e); cached = { at: now, hacks: cached?.hacks || { cracked: {} } }; }
    return cached.hacks;
}
async function writeHacks(h: Hacks, now: number) {
    for (const [id, until] of Object.entries(h.cracked)) if (!(until > now)) delete h.cracked[id];
    if (h.broadcast && !(h.broadcast.until > now)) delete h.broadcast;
    await db().setSetting(KEY, JSON.stringify(h), now);
    cached = { at: now, hacks: h };
}

let keyReady = false;
/** 침투 작전 정답 키: 환경 변수 TIDEBOUND_PUZZLE_SECRET, 없으면 DB 설정에 한 번 만든 무작위 키. 인스턴스마다 한 번만 읽습니다. */
export async function ensurePuzzleKey(now: number) {
    if (keyReady) return;
    let key = process.env.TIDEBOUND_PUZZLE_SECRET || '';
    if (!key) {
        const database = db();
        key = await database.getSetting('puzzleKey') || '';
        if (!key) { key = randomBytes(24).toString('hex'); await database.setSetting('puzzleKey', key, now); key = await database.getSetting('puzzleKey') || key; }
    }
    setPuzzleKey(key);
    keyReady = true;
}

/** 랭킹 행 id(duel:<시즌>:<모험가>, abyss:<모험가>)나 모험가 id에서 모험가 id만. */
export const playerOfRow = (rowId: string) => rowId.startsWith('duel:') ? rowId.split(':').slice(2).join(':') : rowId.startsWith('abyss:') ? rowId.slice(6) : rowId;

/** 동기화 때 화면에 보여 줄 해킹 소식을 상태에 적습니다(캐시만 읽음). */
export async function syncHackFeed(s: State, id: string, now: number) {
    const h = await readHacks(now);
    const broadcast = h.broadcast && h.broadcast.until > now ? { text: h.broadcast.text, by: h.broadcast.by, until: h.broadcast.until } : undefined;
    const crackedUntil = (h.cracked[id] || 0) > now ? h.cracked[id] : undefined;
    if (broadcast || crackedUntil) s.hackFeed = { ...(broadcast ? { broadcast } : {}), ...(crackedUntil ? { crackedUntil } : {}) };
    else delete s.hackFeed;
}

/** 저장 직전: 해킹 실행(h.pending)을 서버 설정에 반영합니다. 실패하면 던져서 상태(비트 차감)도 저장되지 않습니다. */
export async function applyPendingHack(s: State, id: string, now: number) {
    const pending = s.hacker?.pending;
    if (!pending) return;
    const h = parse(await db().getSetting(KEY));
    if (pending.kind === 'broadcast') {
        if (h.broadcast && h.broadcast.until > now && h.broadcast.byId !== id) throw Error(`다른 해커(${h.broadcast.by})의 방송이 ${Math.ceil((h.broadcast.until - now) / 60000)}분 남았습니다.`);
        h.broadcast = { text: pending.value, by: s.name, byId: id, at: now, until: now + pending.minutes * 60_000 };
    }
    else {
        const target = playerOfRow(pending.value);
        if (!target || target === id) throw Error('크래킹할 대상을 확인하세요.');
        h.cracked[target] = now + pending.minutes * 60_000;
    }
    await writeHacks(h, now);
    delete s.hacker!.pending;
}

/** 운영 페이지: 진행 중인 방송 탈취를 지웁니다. */
export async function clearBroadcast(now: number) {
    const h = parse(await db().getSetting(KEY));
    delete h.broadcast;
    await writeHacks(h, now);
}

/** 애드가드: 순위표에 보낼 스냅샷에서 숨긴 정보를 가립니다(크래킹당한 동안은 그대로). 결투 계산용 원본은 DB에 그대로 둡니다. */
export function maskSnapshot<T extends Partial<Snapshot> & { name?: string }>(snap: T, playerId: string, hacks: Hacks, now: number): T & { masked?: string[] } {
    const privacy = snap.privacy;
    if (!privacy || (hacks.cracked[playerId] || 0) > now) return snap;
    // 값은 지우고(브라우저에서도 못 보게) 0·빈 값으로 채운 뒤, 화면은 masked 목록을 보고 ???로 그립니다.
    const show = new Set(privacy.show || []), masked = ['name', ...PRIVACY_KEYS.filter(f => !show.has(f))], out: Record<string, unknown> = { ...snap, name: '???', masked };
    if (!show.has('job')) out.job = '';
    if (!show.has('level')) { out.level = 0; out.rebirths = 0; }
    if (!show.has('gear')) { out.stats = {}; out.power = 0; }
    if (!show.has('skills')) { out.skills = []; out.skillRanks = {}; out.skillMastery = {}; out.skillSpecializations = {}; out.skillPractice = {}; }
    if (!show.has('title')) out.title = undefined;
    if (!show.has('guild')) out.guild = '';
    delete out.privacy;
    return out as T & { masked?: string[] };
}
const PRIVACY_KEYS = ['job', 'level', 'gear', 'skills', 'title', 'guild'];
