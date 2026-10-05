/**
 * v3.18 해커가 서버에 남기는 흔적(방송 탈취 · 크래킹)과 침투 작전 정답 키.
 * v3.25 해킹 II~V(이벤트 변조 · 서버 다운 · 패킷 스니핑 · 백도어)와 화이트 해커(되돌리기 · 패치 · 방화벽), 해커 순위표.
 * 서버 부하: 설정 하나(hacks)를 인스턴스마다 30초 캐시로 읽고, 쓰기는 해킹을 실행할 때와 운영 페이지에서 지울 때만 합니다.
 * 읽은 값은 이벤트 변조(setEventTamper)·서버 다운(setHackDown)으로 게임 계산에 바로 반영합니다.
 */
import { randomBytes } from 'node:crypto';
import { db } from './db';
import type { State, Snapshot } from '../types';
import { setPuzzleKey, gainHacker, privacyOf, isHacker, seasonScore, programOn } from '../systems/hacker';
import { addLog } from '../systems/state';
import { HACKER, HACK_BITS, FIREWALL_ID } from '../data/hacker';
import { currentEvents, setEventTamper } from '../data/events';
import { STAGES, DUNGEONS, setHackDown, placeKey } from '../data/world';
import { gaugeCost, type AltarGaugeId } from '../data/altar';
import { dayKey } from '../data/goals';
import { backdoorGauge } from './altar';

type Down = { kind: 'stage' | 'dungeon'; id: string; until: number; by: string; byId: string };
type Tamper = { minutes: number; rate: number; by: string; byId: string; at: number };
export type Hacks = {
    broadcast?: { text: string; by: string; byId: string; at: number; until: number };
    cracked: Record<string, number>;
    /** v3.25 이벤트 id → 변조(이벤트당 1회). */
    tamper: Record<string, Tamper>;
    down: Down[];
    /** placeKey → 패치가 끝나는 시각(그동안 서버 다운 면역). */
    patched: Record<string, number>;
    /** 모험가 id → 화이트 해커 방화벽이 크래킹을 막은 날(하루 한 번). */
    shielded: Record<string, string>;
};
const KEY = 'hacks', TTL = 30_000, TAMPER_KEEP = 30 * 86400_000;
let cached: { at: number; hacks: Hacks } | null = null;
const obj = <T>(v: unknown): Record<string, T> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, T> : {};

function parse(raw: string | null): Hacks {
    try {
        const v = raw ? JSON.parse(raw) : null;
        return { broadcast: v?.broadcast && typeof v.broadcast.text === 'string' ? v.broadcast : undefined, cracked: obj<number>(v?.cracked), tamper: obj<Tamper>(v?.tamper), down: Array.isArray(v?.down) ? v.down.filter((d: Down) => d && typeof d.id === 'string') : [], patched: obj<number>(v?.patched), shielded: obj<string>(v?.shielded) };
    }
    catch { return { cracked: {}, tamper: {}, down: [], patched: {}, shielded: {} }; }
}
/** 게임 계산에 넣습니다(이벤트 변조 · 서버 다운 · 패치). */
function applyRuntime(h: Hacks) {
    setEventTamper(Object.fromEntries(Object.entries(h.tamper).map(([id, t]) => [id, { minutes: t.minutes, rate: t.rate }])));
    setHackDown(h.down, h.patched);
}
/** 30초 캐시. 읽기에 실패하면 지난 값(없으면 빈 값)을 씁니다. */
export async function readHacks(now: number): Promise<Hacks> {
    if (cached && now - cached.at < TTL) return cached.hacks;
    try { cached = { at: now, hacks: parse(await db().getSetting(KEY)) }; }
    catch (e) { console.error('Hack config read failed', e instanceof Error ? e.message : e); cached = { at: now, hacks: cached?.hacks || parse(null) }; }
    applyRuntime(cached.hacks);
    return cached.hacks;
}
async function writeHacks(h: Hacks, now: number) {
    for (const [id, until] of Object.entries(h.cracked)) if (!(until > now)) delete h.cracked[id];
    for (const [id, until] of Object.entries(h.patched)) if (!(until > now)) delete h.patched[id];
    for (const [id, t] of Object.entries(h.tamper)) if (!(now - t.at < TAMPER_KEEP)) delete h.tamper[id];
    const today = dayKey(now);
    for (const [id, day] of Object.entries(h.shielded)) if (day !== today) delete h.shielded[id];
    h.down = h.down.filter(d => d.until > now);
    if (h.broadcast && !(h.broadcast.until > now)) delete h.broadcast;
    await db().setSetting(KEY, JSON.stringify(h), now);
    cached = { at: now, hacks: h };
    applyRuntime(h);
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

/** 랭킹 행 id(duel:<시즌>:<모험가>, abyss:<모험가>, hacker:<모험가>)나 모험가 id에서 모험가 id만. */
export const playerOfRow = (rowId: string) => rowId.startsWith('duel:') ? rowId.split(':').slice(2).join(':') : rowId.startsWith('abyss:') ? rowId.slice(6) : rowId.startsWith('hacker:') ? rowId.slice(7) : rowId;

const placeName = (kind: string, id: string) => (kind === 'stage' ? STAGES.find(st => st.id === id)?.name : DUNGEONS.find(d => d.id === id)?.name) || id;
/** 이벤트 변조 대상: 운영 이벤트(제단 축복 제외) 중 지금 진행 중인 것. 변조 뒤의 종료 시각으로 봅니다. */
const liveEvents = (now: number) => currentEvents(false).filter(e => !e.id.startsWith('altar-') && Date.parse(e.from) <= now && now <= Date.parse(e.until));

/** 동기화 때 화면에 보여 줄 해킹 소식을 상태에 적습니다(캐시만 읽음). 해커 계열에게는 변조·다운·패치 정보도 적습니다. */
export async function syncHackFeed(s: State, id: string, now: number) {
    const h = await readHacks(now);
    const broadcast = h.broadcast && h.broadcast.until > now ? { text: h.broadcast.text, by: h.broadcast.by, until: h.broadcast.until } : undefined;
    const crackedUntil = (h.cracked[id] || 0) > now ? h.cracked[id] : undefined;
    const hacker = isHacker(s) ? {
        events: liveEvents(now).map(e => ({ id: e.id, name: e.name || e.id, until: Date.parse(e.until), ...(h.tamper[e.id] ? { tampered: true } : {}) })),
        down: h.down.filter(d => d.until > now).map(d => ({ kind: d.kind, id: d.id, until: d.until, by: d.by, ...((h.patched[placeKey(d.kind, d.id)] || 0) > now ? { patched: true } : {}) })),
        patched: Object.fromEntries(Object.entries(h.patched).filter(([, until]) => until > now)),
    } : {};
    if (broadcast || crackedUntil || isHacker(s)) s.hackFeed = { ...(broadcast ? { broadcast } : {}), ...(crackedUntil ? { crackedUntil } : {}), ...hacker };
    else delete s.hackFeed;
}

/** 저장 직전: 해킹 실행(h.pending)을 서버 설정에 반영합니다. 실패하면 던져서 상태(비트 차감)도 저장되지 않습니다. */
export async function applyPendingHack(s: State, id: string, now: number) {
    const pending = s.hacker?.pending;
    if (!pending) return;
    const database = db(), h = parse(await database.getSetting(KEY)), hk = s.hacker!;
    // v3.25 루트킷: 서명·공지에 이름 대신 ???.
    const by = programOn(s, 'rootkit') ? '???' : s.name, n = pending.n || hk.tier;
    let write = true;
    if (pending.kind === 'broadcast') {
        if (h.broadcast && h.broadcast.until > now && h.broadcast.byId !== id) throw Error(`다른 해커(${h.broadcast.by})의 방송이 ${Math.ceil((h.broadcast.until - now) / 60000)}분 남았습니다.`);
        h.broadcast = { text: pending.value, by, byId: id, at: now, until: now + pending.minutes * 60_000 };
    }
    else if (pending.kind === 'crack') {
        const target = playerOfRow(pending.value);
        if (!target || target === id) throw Error('크래킹할 대상을 확인하세요.');
        // v3.25 화이트 해커 패시브 방화벽은 하루 한 번 크래킹을 막아 냅니다(비트·횟수는 그대로 씀).
        const row = await database.getPlayer(target), victim = row ? JSON.parse(row.state) as State : null;
        if (victim?.skills?.includes(FIREWALL_ID) && h.shielded[target] !== dayKey(now)) {
            h.shielded[target] = dayKey(now);
            addLog(s, '크래킹이 화이트 해커의 방화벽에 막혔습니다. 오늘은 방어막이 사라졌으니 다시 시도할 수 있습니다.', 'system');
        }
        else h.cracked[target] = now + pending.minutes * 60_000;
    }
    else if (pending.kind === 'tamper') {
        const [eventId, timeSign, rateSign] = pending.value.split('|'), ev = liveEvents(now).find(e => e.id === eventId);
        if (!ev) throw Error('지금 진행 중인 이벤트가 아닙니다.');
        if (h.tamper[eventId]) throw Error('이미 변조된 이벤트입니다(이벤트당 1회).');
        h.tamper[eventId] = { minutes: Number(timeSign) * HACKER.tamper.minutes(n), rate: Number(rateSign) * HACKER.tamper.rate(n), by, byId: id, at: now };
        addLog(s, `이벤트 변조 · ${ev.name || ev.id} · 남은 시간 ${Number(timeSign) > 0 ? '+' : '−'}${HACKER.tamper.minutes(n)}분 · 배율 ${Number(rateSign) > 0 ? '+' : '−'}${Math.round(HACKER.tamper.rate(n) * 100)}%p`, 'reward');
    }
    else if (pending.kind === 'down') {
        const [kind, ...rest] = pending.value.split(':'), place = rest.join(':'), k = kind as 'stage' | 'dungeon';
        if ((h.patched[placeKey(k, place)] || 0) > now) throw Error(`${placeName(k, place)}은(는) 화이트 해커가 패치해 지금은 다운시킬 수 없습니다.`);
        if (h.down.some(d => d.kind === k && d.id === place && d.until > now)) throw Error(`${placeName(k, place)}은(는) 이미 다운되어 있습니다.`);
        h.down.push({ kind: k, id: place, until: now + pending.minutes * 60_000, by, byId: id });
        addLog(s, `서버 다운 · ${placeName(k, place)} · ${pending.minutes}분 동안 새 입장 불가`, 'reward');
    }
    else if (pending.kind === 'sniffClaim') {
        const players = await database.countActivePlayers(Number(pending.value), id), exp = Math.min(HACKER.sniff.cap(n), players * HACKER.sniff.perPlayer(n));
        hk.sniff = null;
        gainHacker(s, 0, exp);
        addLog(s, `패킷 스니핑 정산 · 활동한 모험가 ${players}명 · 권한 경험치 +${exp}`, 'reward');
        write = false;
    }
    else if (pending.kind === 'backdoor') {
        const gauge = pending.value as AltarGaugeId, points = Math.max(1, Math.floor(gaugeCost(gauge, 0) * HACKER.backdoor.share(n)));
        await backdoorGauge(gauge, points, now);
        addLog(s, `백도어 · 제단 게이지 +${points.toLocaleString()} (기여 순위 제외)`, 'reward');
        write = false;
    }
    else if (pending.kind === 'restore') {
        const [kind, ...rest] = pending.value.split(':');
        let bounty = 0, label = '';
        if (kind === 'broadcast') {
            if (!h.broadcast || h.broadcast.until <= now) throw Error('되돌릴 방송 탈취가 없습니다.');
            if (h.broadcast.byId === id) throw Error('내 해킹은 되돌릴 수 없습니다.');
            delete h.broadcast; bounty = HACK_BITS.broadcast; label = '방송 탈취';
        }
        else if (kind === 'down') {
            const [k, ...p] = rest, place = p.join(':'), i = h.down.findIndex(d => d.kind === k && d.id === place && d.until > now);
            if (i < 0) throw Error('되돌릴 서버 다운이 없습니다.');
            if (h.down[i].byId === id) throw Error('내 해킹은 되돌릴 수 없습니다.');
            h.down.splice(i, 1); bounty = HACK_BITS.down; label = `서버 다운(${placeName(k, place)})`;
        }
        else {
            const eventId = rest.join(':'), t = h.tamper[eventId];
            if (!t) throw Error('되돌릴 이벤트 변조가 없습니다.');
            if (t.byId === id) throw Error('내 해킹은 되돌릴 수 없습니다.');
            delete h.tamper[eventId]; bounty = HACK_BITS.tamper; label = '이벤트 변조';
        }
        const bits = Math.floor(bounty * HACKER.white.restore.bounty);
        hk.bits += bits;
        addLog(s, `${label}을(를) 되돌렸습니다 · 현상금 비트 +${bits}`, 'reward');
    }
    else if (pending.kind === 'patch') {
        const [kind, ...rest] = pending.value.split(':'), place = rest.join(':');
        h.patched[placeKey(kind as 'stage' | 'dungeon', place)] = now + pending.minutes * 60_000;
        addLog(s, `패치 · ${placeName(kind, place)} · ${pending.minutes}분 동안 서버 다운 면역`, 'reward');
    }
    if (write) await writeHacks(h, now);
    delete hk.pending;
}

/** 운영 페이지: 진행 중인 방송 탈취를 지웁니다. */
export async function clearBroadcast(now: number) {
    const h = parse(await db().getSetting(KEY));
    delete h.broadcast;
    await writeHacks(h, now);
}
/** v3.25 운영 페이지: 이벤트 변조·서버 다운·패치를 모두 지웁니다. */
export async function clearHackEffects(now: number) {
    const h = parse(await db().getSetting(KEY));
    h.tamper = {}; h.down = []; h.patched = {};
    await writeHacks(h, now);
}

/** v3.25 해커 순위(월). 시즌 키는 20,000,000 + YYYYMM이라 다른 기록판과 섞이지 않습니다. 행 id는 hacker:<모험가>. */
export const hackerSeason = (key: string) => 20_000_000 + Number(key.replace('-', ''));
export async function syncHackerBoard(id: string, s: State, now: number) {
    const x = s.hacker?.season;
    if (!x?.dirty) return;
    delete x.dirty;
    const score = seasonScore(x), privacy = privacyOf(s);
    await db().upsertRanking({ id: `hacker:${id}`, snapshot: JSON.stringify({ season: hackerSeason(x.key), board: 'hacker', account: id, name: s.name, job: s.job, depth: x.depth, hacks: x.hacks, restores: x.restores, grade: s.hacker?.grade || 1, ...(privacy ? { privacy } : {}) }), rating: score, power: x.depth, updated_at: now });
}
export async function listHackerBoard(key: string) {
    const rows = await db().listRankings(hackerSeason(key), 50);
    return rows.map((r, i) => { const snap = JSON.parse(r.snapshot) as { account: string; name: string; job: string; depth: number; hacks: number; restores: number; grade: number; privacy?: { show: string[] } }; return { rank: i + 1, id: snap.account, name: snap.name, job: snap.job, depth: snap.depth, hacks: snap.hacks, restores: snap.restores, grade: snap.grade, score: r.rating, ...(snap.privacy ? { privacy: snap.privacy } : {}) }; });
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
